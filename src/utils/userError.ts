// src/utils/userError.ts
// ─────────────────────────────────────────────────────────────────────────────
// SAFE USER-FACING ERROR MAPPING (RISK-H-032)
//
// Every store surfaces errors through userErrorMessage() instead of echoing
// raw ApiError / server text. Server internals (Mongo/GraphQL/stack-ish text)
// must never reach the UI: anything matching UNSAFE_RE is replaced with the
// caller's fallback.
// ─────────────────────────────────────────────────────────────────────────────

import { ApiError } from "../config/graphql";

/** Server-internal leakage we never show to users. */
const UNSAFE_RE = /Mongo|GraphQL|\$|Exception|E11000|ValidationError|Cast to|at\s+\w+\.\w+\s*\(/i;

const NETWORK_MESSAGE = "Connection problem — check your internet and try again.";
const AUTH_MESSAGE = "Your session has expired. Please sign in again.";
const GENERIC_MESSAGE = "Something went wrong. Please try again.";
const OFFLINE_MESSAGE = "You're offline. Connect to the internet and try again.";

const NETWORK_CODES = new Set(["network-error", "invalid-response", "request-failed"]);
const AUTH_CODES = new Set(["UNAUTHENTICATED", "auth/unauthenticated", "FORBIDDEN"]);
const VALIDATION_CODES = new Set(["BAD_REQUEST", "BAD_USER_INPUT", "GRAPHQL_VALIDATION_FAILED"]);

/** True when the text is safe to show verbatim to a customer. */
export function isSafeMessage(message: string): boolean {
  const m = message.trim();
  return m.length > 0 && m.length <= 200 && !UNSAFE_RE.test(m);
}

/**
 * Map any thrown error to friendly, safe user copy.
 * @param err      whatever was caught
 * @param fallback context-specific default (e.g. "Could not load addresses.")
 */
export function userErrorMessage(err: unknown, fallback: string = GENERIC_MESSAGE): string {
  if (err instanceof ApiError) {
    if (err.code === "offline") return OFFLINE_MESSAGE;
    if (err.status === 0 || NETWORK_CODES.has(err.code)) return NETWORK_MESSAGE;
    if (err.status === 401 || AUTH_CODES.has(err.code)) return AUTH_MESSAGE;
    if (err.status === 429) return "Too many requests. Please wait a moment and try again.";
    if (err.status >= 500) return fallback;
    // Client-side (4xx) validation-ish errors: the BE writes these messages for
    // humans — show them only when they carry no server internals.
    if (
      (VALIDATION_CODES.has(err.code) || (err.status >= 400 && err.status < 500)) &&
      isSafeMessage(err.message)
    ) {
      return err.message;
    }
    return fallback;
  }
  // fetch/TypeError style network failures outside ApiError.
  if (err instanceof TypeError && /network|fetch/i.test(err.message)) return NETWORK_MESSAGE;
  return fallback;
}

export const USER_ERROR_COPY = {
  network: NETWORK_MESSAGE,
  auth: AUTH_MESSAGE,
  generic: GENERIC_MESSAGE,
  offline: OFFLINE_MESSAGE,
} as const;
