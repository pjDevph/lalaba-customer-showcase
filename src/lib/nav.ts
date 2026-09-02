// src/lib/nav.ts
// Back-navigation helper. `router.back()` alone is a no-op when the current
// screen has no history to pop — i.e. it was deep-linked (notification, cold
// link) or reached via `router.replace` (e.g. booking success → order detail).
// That's the "back doesn't work / only goes one page" symptom. `backOr` falls
// back to a sensible parent route so Back always lands somewhere up the
// hierarchy instead of dead-ending.

import { router, type Href } from "expo-router";

export function backOr(fallback: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
