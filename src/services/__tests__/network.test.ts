// Unit tests for the offline monitor (GAP-H-031): NetInfo state → uiStore flag
// + synchronous isOfflineNow() read used by the GraphQL client.

import NetInfo from "@react-native-community/netinfo";
import { applyNetworkState, isOfflineNow, isOfflineState, startNetworkMonitor } from "../network";
import { useUIStore } from "../../stores/uiStore";

// jest.mock calls are hoisted above the imports by babel-plugin-jest-hoist.
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
  },
}));


describe("isOfflineState", () => {
  it("treats a hard false on either field as offline", () => {
    expect(isOfflineState({ isConnected: false, isInternetReachable: null })).toBe(true);
    expect(isOfflineState({ isConnected: true, isInternetReachable: false })).toBe(true);
  });

  it("treats unknown reachability as online", () => {
    expect(isOfflineState({ isConnected: true, isInternetReachable: null })).toBe(false);
    expect(isOfflineState({ isConnected: true, isInternetReachable: true })).toBe(false);
  });
});

describe("applyNetworkState", () => {
  afterEach(() => {
    applyNetworkState({ isConnected: true, isInternetReachable: true });
  });

  it("drives uiStore.isOffline and isOfflineNow together", () => {
    applyNetworkState({ isConnected: false, isInternetReachable: false });
    expect(isOfflineNow()).toBe(true);
    expect(useUIStore.getState().isOffline).toBe(true);

    applyNetworkState({ isConnected: true, isInternetReachable: true });
    expect(isOfflineNow()).toBe(false);
    expect(useUIStore.getState().isOffline).toBe(false);
  });
});

describe("startNetworkMonitor", () => {
  it("subscribes to NetInfo and returns the unsubscribe function", () => {
    const unsub = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockReturnValueOnce(unsub);

    const stop = startNetworkMonitor();
    expect(NetInfo.fetch).toHaveBeenCalled();
    expect(NetInfo.addEventListener).toHaveBeenCalledWith(applyNetworkState);
    expect(stop).toBe(unsub);
  });

  it("goes offline when the subscription reports no connection", () => {
    let listener: ((s: unknown) => void) | undefined;
    (NetInfo.addEventListener as jest.Mock).mockImplementationOnce((fn) => {
      listener = fn;
      return jest.fn();
    });
    startNetworkMonitor();
    listener?.({ isConnected: false, isInternetReachable: false });
    expect(useUIStore.getState().isOffline).toBe(true);
    // restore
    applyNetworkState({ isConnected: true, isInternetReachable: true });
  });
});
