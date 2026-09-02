/**
 * A rejected session must be announced once, so polling screens stop.
 *
 * The bug this covers: the backend answers a revoked/expired token with
 * extensions.code UNAUTHENTICATED over HTTP 200, nothing acted on it, and
 * usePoll deliberately swallows errors — so a support thread left open kept
 * querying mySupportTicketNotes every 4s forever against a session that could
 * never recover.
 */

// resolveEndpoint() reads this at first use and memoises it.
process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3001";

const mockGetIdToken = jest.fn(async () => "id-token");

jest.mock("../firebase", () => ({
  auth: {
    get currentUser() {
      return { getIdToken: mockGetIdToken };
    },
  },
}));
jest.mock("../../services/network", () => ({ isOfflineNow: () => false }));
jest.mock("../appCheck", () => ({ getAppCheckToken: async () => null }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod = require("../graphql") as typeof import("../graphql");

/** The exact envelope the NestJS guard returns — HTTP 200, error in the body. */
const unauthenticatedBody = (message: string) => ({
  errors: [
    {
      message,
      extensions: {
        code: "UNAUTHENTICATED",
        originalError: { message, error: "Unauthorized", statusCode: 401 },
      },
    },
  ],
  data: null,
});

const respondWith = (body: unknown, status = 200) => {
  global.fetch = jest.fn(async () => ({
    ok: status < 400,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
};

describe("dead-session hook", () => {
  let onDead: jest.Mock;

  beforeEach(() => {
    onDead = jest.fn();
    mod.setUnauthenticatedHandler(onDead);
  });
  afterEach(() => {
    mod.setUnauthenticatedHandler(null);
    jest.clearAllMocks();
  });

  it("[HP] fires on a rejected session so callers stop retrying", async () => {
    respondWith(unauthenticatedBody("Session expired or invalid token authentication."));

    await expect(mod.graphqlRequest("query Q { x }")).rejects.toThrow(
      /session expired/i,
    );
    expect(onDead).toHaveBeenCalledTimes(1);
    expect(onDead.mock.calls[0][0]).toMatch(/session expired/i);
  });

  it("[NP] stays silent for 'Account not found' — that is an unfinished signup", async () => {
    // The message still reaches the handler; authStore is what filters it. What
    // matters here is that the request itself still rejects, so the caller's
    // isNoProfileError path can route to registration.
    respondWith(unauthenticatedBody("Account not found."));

    await expect(mod.graphqlRequest("query Q { x }")).rejects.toThrow(
      /account not found/i,
    );
    expect(onDead.mock.calls[0][0]).toMatch(/account not found/i);
  });

  it("[NP] never fires for an anonymous request — there is no session to kill", async () => {
    respondWith(unauthenticatedBody("Session expired or invalid token authentication."));

    await expect(
      mod.graphqlRequest("query Q { x }", {}, { anonymous: true }),
    ).rejects.toThrow();
    expect(onDead).not.toHaveBeenCalled();
  });

  it("[NP] never fires for an ordinary failure — a flaky endpoint keeps its session", async () => {
    respondWith({
      errors: [{ message: "Boom", extensions: { code: "INTERNAL_SERVER_ERROR" } }],
      data: null,
    });

    await expect(mod.graphqlRequest("query Q { x }")).rejects.toThrow(/boom/i);
    expect(onDead).not.toHaveBeenCalled();
  });
});
