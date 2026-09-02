// Unit tests for the safe user-facing error mapper (RISK-H-032).

import { ApiError } from "../../config/graphql";
import { userErrorMessage, isSafeMessage, USER_ERROR_COPY } from "../userError";

// jest.mock calls are hoisted above the imports by babel-plugin-jest-hoist.
jest.mock("../../config/firebase", () => ({ auth: {} }));
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
  },
}));


const FALLBACK = "Could not do the thing.";

describe("userErrorMessage", () => {
  it("maps network failures to connection copy", () => {
    expect(userErrorMessage(new ApiError(0, "network-error", "Request timed out."), FALLBACK)).toBe(
      USER_ERROR_COPY.network,
    );
    expect(userErrorMessage(new TypeError("Network request failed"), FALLBACK)).toBe(USER_ERROR_COPY.network);
  });

  it("maps offline rejections to offline copy", () => {
    expect(userErrorMessage(new ApiError(0, "offline", "whatever"), FALLBACK)).toBe(USER_ERROR_COPY.offline);
  });

  it("maps auth errors to sign-in copy", () => {
    expect(userErrorMessage(new ApiError(401, "UNAUTHENTICATED", "jwt malformed"), FALLBACK)).toBe(
      USER_ERROR_COPY.auth,
    );
    expect(userErrorMessage(new ApiError(200, "UNAUTHENTICATED", "nope"), FALLBACK)).toBe(USER_ERROR_COPY.auth);
  });

  it("passes through safe validation messages", () => {
    const msg = "phoneNumber must be a valid PH mobile number (09XXXXXXXXX)";
    expect(userErrorMessage(new ApiError(400, "BAD_REQUEST", msg), FALLBACK)).toBe(msg);
  });

  it("never leaks server internals", () => {
    const leaks = [
      "E11000 duplicate key error collection: lalaba.users",
      "MongoServerError: something exploded",
      "Cannot query field on type GraphQLObject",
      "Unexpected token $ in JSON",
      "NullPointerException at OrderService.finalize",
    ];
    for (const raw of leaks) {
      expect(userErrorMessage(new ApiError(400, "BAD_REQUEST", raw), FALLBACK)).toBe(FALLBACK);
    }
  });

  it("falls back for 5xx and unknown errors", () => {
    expect(userErrorMessage(new ApiError(500, "INTERNAL_SERVER_ERROR", "boom"), FALLBACK)).toBe(FALLBACK);
    expect(userErrorMessage(new Error("random"), FALLBACK)).toBe(FALLBACK);
    expect(userErrorMessage("string error")).toBe(USER_ERROR_COPY.generic);
  });
});

describe("isSafeMessage", () => {
  it("rejects empty, huge, or internal-looking text", () => {
    expect(isSafeMessage("")).toBe(false);
    expect(isSafeMessage("x".repeat(201))).toBe(false);
    expect(isSafeMessage("E11000 dup key")).toBe(false);
    expect(isSafeMessage("costs $5")).toBe(false);
  });

  it("accepts plain human copy", () => {
    expect(isSafeMessage("Select a delivery address first.")).toBe(true);
  });
});
