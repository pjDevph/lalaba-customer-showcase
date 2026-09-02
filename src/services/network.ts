// src/services/network.ts
// ─────────────────────────────────────────────────────────────────────────────
// NETWORK REACHABILITY (GAP-H-031)
//
// One NetInfo subscription, started at app root, that drives uiStore.isOffline
// (for the offline banner) and a module-level flag that the GraphQL client
// reads synchronously to fail mutations fast while offline.
// ─────────────────────────────────────────────────────────────────────────────

import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { useUIStore } from "../stores/uiStore";

let offlineNow = false;

/** Derive "offline" from a NetInfo state. `isInternetReachable` is tri-state
 *  (null = unknown) — only a hard `false` on either field counts as offline. */
export function isOfflineState(state: Pick<NetInfoState, "isConnected" | "isInternetReachable">): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

/** Synchronous read for non-React callers (the GraphQL client). */
export function isOfflineNow(): boolean {
  return offlineNow;
}

/** Test/seam helper — applies a reachability state to the app. */
export function applyNetworkState(state: Pick<NetInfoState, "isConnected" | "isInternetReachable">): void {
  const offline = isOfflineState(state);
  if (offline !== offlineNow) {
    offlineNow = offline;
    useUIStore.getState().setOffline(offline);
  }
}

/**
 * Start the app-wide reachability subscription. Call once from the root layout;
 * returns the unsubscribe function.
 */
export function startNetworkMonitor(): () => void {
  // Prime with a one-shot fetch so a cold start in airplane mode is caught
  // before the first event fires.
  NetInfo.fetch()
    .then(applyNetworkState)
    .catch(() => {});
  return NetInfo.addEventListener(applyNetworkState);
}
