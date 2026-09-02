// src/config/graphql.ts
// ─────────────────────────────────────────────────────────────────────────────
// GraphQL CLIENT — thin fetch-based client for the shared NestJS backend.
//
// Adapted from the merchant app's client, with the staff device-token and
// device-revocation plumbing removed (the customer app is single-role and has
// no device-approval flow). Every authenticated request carries the Firebase ID
// token as `Authorization: Bearer <token>`, read live from the Firebase SDK so
// it's always fresh.
// ─────────────────────────────────────────────────────────────────────────────

import Constants from "expo-constants";
import { Platform } from "react-native";
import { auth } from "./firebase";
import { isOfflineNow } from "../services/network";
import { devLog, devWarn } from "../utils/devLog";
import { getAppCheckToken } from "./appCheck";

// ─── Typed API error ──────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Narrow an unknown caught value without reaching for `any`. Firebase and fetch
 * both throw plain objects carrying `code`/`name`/`message`, so these read the
 * fields defensively rather than asserting a shape that may not be there.
 */
function errField(e: unknown, key: "code" | "name" | "message"): string | undefined {
  if (typeof e !== "object" || e === null) return undefined;
  const v = (e as Record<string, unknown>)[key];
  return typeof v === "string" ? v : undefined;
}


// ─── Maintenance-mode hook ──────────────────────────────────────────────────
// Registered from app/_layout.tsx into maintenanceStore — kept as a plain
// callback (not a direct store import) so this module stays framework/store
// agnostic, same reasoning as every other cross-cutting hook here.
type MaintenanceModeHandler = (info: {
  mode: "SCHEDULED" | "EMERGENCY";
  message: string | null;
  endsAt: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
}) => void;
let onMaintenanceMode: MaintenanceModeHandler | null = null;
export function setMaintenanceModeHandler(fn: MaintenanceModeHandler | null): void {
  onMaintenanceMode = fn;
}

// ─── Dead-session hook ──────────────────────────────────────────────────────
// The backend answers a rejected session with extensions.code UNAUTHENTICATED
// (over HTTP 200 — Apollo does not surface the 401 as a transport status), and
// nothing here used to act on it. Every polling screen therefore kept firing
// against a session that could never come back: usePoll deliberately swallows
// errors so a flaky endpoint doesn't stop the loop, which is right for a
// timeout and wrong for a revoked token. A support thread left open on a stale
// build hammered mySupportTicketNotes every 4s indefinitely.
//
// Same shape as the maintenance hook above, and for the same reason: this
// module stays store-agnostic and app/_layout.tsx does the wiring.
// Takes the server's message: not every UNAUTHENTICATED is a dead session.
// "Account not found." is the guard's way of saying "registration unfinished",
// which routes to sign-up rather than tearing the session down — so the
// handler, not this module, decides what the message means.
type UnauthenticatedHandler = (message: string) => void;
let onUnauthenticated: UnauthenticatedHandler | null = null;
export function setUnauthenticatedHandler(fn: UnauthenticatedHandler | null): void {
  onUnauthenticated = fn;
}

// ─── Endpoint resolution ────────────────────────────────────────────────────
let graphqlEndpoint: string | null = null;
const isDev = typeof __DEV__ !== "undefined" && __DEV__;

function isAndroidEmulator(): boolean {
  if (Platform.OS !== "android") return false;
  const c = (Platform.constants ?? {}) as Record<string, unknown>;
  const fp = String(c.Fingerprint ?? "");
  const model = String(c.Model ?? "");
  return (
    fp.includes("generic") ||
    fp.includes("emulator") ||
    model.toLowerCase().includes("sdk")
  );
}

function isOnlineMode(): boolean {
  return (process.env.EXPO_PUBLIC_ONLINE ?? "off").trim().toLowerCase() === "on";
}

function resolveEndpoint(): string {
  if (graphqlEndpoint) return graphqlEndpoint;

  if (isOnlineMode()) {
    const onlineUrl = process.env.EXPO_PUBLIC_ONLINE_GRAPHQL_URL;
    if (!onlineUrl) {
      throw new Error(
        "EXPO_PUBLIC_ONLINE=on but EXPO_PUBLIC_ONLINE_GRAPHQL_URL is not set in .env.",
      );
    }
    const endpoint = onlineUrl.replace(/\/+$/, "");
    graphqlEndpoint = endpoint;
    return endpoint;
  }

  const emulatorBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  const deviceBase = process.env.EXPO_PUBLIC_DEVICE_API_BASE_URL;
  const configBase = (
    Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined
  )?.apiBaseUrl;

  const onEmulator = isAndroidEmulator();
  const base = (onEmulator ? emulatorBase : deviceBase || emulatorBase) || configBase;
  if (!base) {
    throw new Error(
      "apiBaseUrl missing — set EXPO_PUBLIC_API_BASE_URL and/or EXPO_PUBLIC_DEVICE_API_BASE_URL in .env.",
    );
  }
  let trimmed = base;
  while (trimmed.endsWith("/")) trimmed = trimmed.slice(0, -1);
  const endpoint = `${trimmed}/graphql`;
  graphqlEndpoint = endpoint;
  if (isDev) {
    console.log(
      `✅ [FE] GraphQL endpoint (${onEmulator ? "emulator" : "device"}): ${endpoint}`,
    );
  }
  return endpoint;
}

// ─── Dev logger ─────────────────────────────────────────────────────────────
let gqlConnected = false;
function opNameOf(query: string): string {
  const m = /\b(query|mutation)\s+(\w+)/.exec(query);
  return m?.[2] ?? "anonymous";
}
function logRequest(opName: string, startMs: number, ok: boolean, err?: ApiError): void {
  if (!isDev) return;
  const ms = Date.now() - startMs;
  devLog(`${ok ? "🟢" : "🔴"} [GQL] ${opName} → ${ok ? "ok" : "error"} (${ms}ms)`);
  if (!ok && err) devWarn(`   ↳ ${opName} — ${err.code}: ${err.message}`);
  if (ok && !gqlConnected) {
    gqlConnected = true;
    devLog(`✅ [GQL] Connected → ${resolveEndpoint()}`);
  }
}

export async function pingBackend(): Promise<boolean> {
  try {
    await graphqlRequest<{ __typename: string }>(`query Ping { __typename }`, {}, { anonymous: true });
    return true;
  } catch {
    return false;
  }
}

// Retries pingBackend() until it succeeds or maxWaitMs elapses. A single
// pingBackend() call aborts after 15s (graphqlRequest's fixed request
// timeout), which is shorter than a Render free/starter cold start (~30-60s)
// — a lone ping reports "unreachable" mid-boot even though the server comes
// up seconds later. Each retry re-tries the connection rather than waiting
// idle, so this naturally polls roughly every 15s until the deadline.
export async function pingBackendUntilReady(maxWaitMs = 75_000): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  for (;;) {
    if (await pingBackend()) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((r) => setTimeout(r, 2_000));
  }
}

// ─── Request ──────────────────────────────────────────────────────────────────
interface GraphQLRequestOptions {
  /** Skip the Authorization header (e.g. the public `signupRoles` query before sign-in). */
  anonymous?: boolean;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: {
    message: string;
    extensions?: {
      code?: string;
      originalError?: { message?: string | string[]; statusCode?: number };
      // Present only on MAINTENANCE_MODE — see GqlAuthGuard on the backend.
      type?: "SCHEDULED" | "EMERGENCY";
      endsAt?: string | null;
      supportEmail?: string | null;
      supportPhone?: string | null;
    };
  }[];
}

export async function graphqlRequest<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  options: GraphQLRequestOptions = {},
): Promise<T> {
  const startMs = Date.now();
  const opName = opNameOf(query);

  // Fail mutations fast while offline (GAP-H-031): a mutation that "hangs" or
  // times out reads as a false success/failure to the user. Queries still go
  // through — reachability can be stale and reads are harmless to retry.
  if (isOfflineNow() && /^\s*mutation\b/.test(query.trimStart())) {
    const err = new ApiError(0, "offline", "You're offline. Connect to the internet and try again.");
    logRequest(opName, startMs, false, err);
    throw err;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (!options.anonymous) {
    let token: string | undefined;
    try {
      token = await auth.currentUser?.getIdToken();
    } catch (e: unknown) {
      if (errField(e, "code") === "auth/network-request-failed") {
        throw new ApiError(0, "network-error", "Network unavailable — could not authenticate.");
      }
      throw new ApiError(401, "auth/unauthenticated", "Could not verify session.");
    }
    if (!token) throw new ApiError(401, "auth/unauthenticated", "Not signed in.");
    headers.Authorization = `Bearer ${token}`;
  }

  // APPCHK-010 — attest this app to the custom backend.
  //
  // Sent on EVERY request, including anonymous ones: the operations that most
  // need attestation (requestBiometricChallenge, biometricLogin) have no
  // session by definition, so gating this on `!options.anonymous` would skip
  // exactly the abuse surface it exists to cover.
  //
  // Asked of the SDK per request rather than cached — App Check tokens expire
  // and the SDK rotates them in the background. A null is not fatal: the
  // backend is in monitoring mode until APP_CHECK_ENFORCED=on, and once it is
  // enforcing, its APP_CHECK_REQUIRED error is a better message than anything
  // this layer could invent.
  const appCheckToken = await getAppCheckToken();
  if (appCheckToken) headers["X-Firebase-AppCheck"] = appCheckToken;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let res: Response;
  try {
    res = await fetch(resolveEndpoint(), {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
  } catch (e: unknown) {
    logRequest(opName, startMs, false);
    const isTimeout = errField(e, "name") === "AbortError";
    throw new ApiError(
      0,
      "network-error",
      isTimeout ? "Request timed out." : (errField(e, "message") ?? "Network request failed."),
    );
  } finally {
    clearTimeout(timeoutId);
  }

  let json: GraphQLResponse<T>;
  try {
    json = (await res.json()) as GraphQLResponse<T>;
  } catch {
    logRequest(opName, startMs, false);
    throw new ApiError(res.status, "invalid-response", `Malformed response (HTTP ${res.status}).`);
  }

  if (!res.ok && !json.data && !json.errors?.length) {
    // A non-GraphQL error body (gateway/proxy HTML or JSON) can still carry a
    // top-level `message`; GraphQLResponse does not declare one.
    const msg = errField(json, "message") ?? `HTTP ${res.status}`;
    const code = res.status === 401 ? "UNAUTHENTICATED" : "request-failed";
    if (code === "UNAUTHENTICATED" && !options.anonymous) onUnauthenticated?.(msg);
    const err = new ApiError(res.status, code, msg);
    logRequest(opName, startMs, false, err);
    throw err;
  }

  if (json.errors?.length) {
    const first = json.errors[0];
    const originalMsg = first.extensions?.originalError?.message;
    const friendly = Array.isArray(originalMsg) ? originalMsg.join("; ") : originalMsg ?? first.message;
    const err = new ApiError(res.status === 200 ? 400 : res.status, first.extensions?.code ?? "graphql-error", friendly);
    // A rejected session only ever recovers by re-authenticating, so tell the
    // app now rather than letting callers retry into a guaranteed failure.
    // `anonymous` requests are exempt: they carry no session to invalidate.
    if (first.extensions?.code === "UNAUTHENTICATED" && !options.anonymous) {
      onUnauthenticated?.(friendly ?? first.message);
    }
    if (first.extensions?.code === "MAINTENANCE_MODE" && first.extensions.type) {
      onMaintenanceMode?.({
        mode: first.extensions.type,
        message: friendly ?? null,
        endsAt: first.extensions.endsAt ?? null,
        supportEmail: first.extensions.supportEmail ?? null,
        supportPhone: first.extensions.supportPhone ?? null,
      });
    }
    logRequest(opName, startMs, false, err);
    throw err;
  }

  logRequest(opName, startMs, true);
  return json.data as T;
}
