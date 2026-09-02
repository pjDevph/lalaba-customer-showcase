// src/hooks/usePoll.ts
// One polling primitive for every screen that refreshes on a timer.
//
// Ported from the Partner app (LALABA_MERCHANT_APP_DEV/src/hooks/usePoll.ts),
// which already solved this. Plain `useEffect` + `setInterval` leaks requests
// three ways, and the Customer app had all three on eight screens:
//   • Screens stay MOUNTED after you navigate away (Expo Router keeps the tab /
//     stack entry alive), so their intervals kept firing forever in the
//     background — chat, order tracking and the presence heartbeat all ran for
//     the life of the process.
//   • Nothing paused when the app was backgrounded; RN timers keep running. For
//     the presence heartbeat that is worse than waste: it reports the customer
//     as online while their phone is in a pocket.
//   • A tick fired even if the previous request hadn't come back yet, so once
//     the server got slower than the interval, requests stacked and latency
//     ramped until the poller was effectively DoSing the backend.
//
// usePoll fixes all three: it runs only while the screen is focused AND the app
// is foregrounded, and it never has more than one request in flight.
//
// `tick` catches, and so does the Partner copy since MOBILE-016 — the two are
// behaviourally identical again. Without that catch a rejected poll escapes as
// an unhandled rejection (`void tick()` does not catch), which RN red-boxes and
// some configurations treat as fatal. The loop always survived, since
// `inFlight` is cleared in `finally` either way, but a flaky endpoint produced
// one red box per tick. Keep the two files in step.

import { useCallback, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useFocusEffect } from "expo-router";

export function usePoll(
  fn: () => Promise<unknown> | unknown,
  intervalMs: number,
  enabled = true,
) {
  // Latest callback without restarting the timer when it changes identity.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlight = useRef(false);
  const focused = useRef(false);

  const tick = useCallback(async () => {
    if (inFlight.current) return; // never stack requests
    inFlight.current = true;
    try {
      await fnRef.current();
    } catch {
      // A failed poll is not a reason to stop polling — the next tick retries.
      // Callers that care about the error handle it inside `fn`; swallowing
      // here only prevents an unhandled rejection from the fire-and-forget
      // call sites below.
    } finally {
      inFlight.current = false;
    }
  }, []);

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    void tick(); // refresh immediately on focus/foreground
    timer.current = setInterval(() => {
      void tick();
    }, intervalMs);
  }, [intervalMs, stop, tick]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (enabled && AppState.currentState === "active") start();

      const sub = AppState.addEventListener(
        "change",
        (next: AppStateStatus) => {
          if (!focused.current || !enabled) return;
          if (next === "active") start();
          else stop();
        },
      );

      return () => {
        focused.current = false;
        sub.remove();
        stop();
      };
    }, [enabled, start, stop]),
  );
}
