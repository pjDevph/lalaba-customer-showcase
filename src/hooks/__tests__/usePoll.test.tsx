import React from "react";
import { AppState, type AppStateStatus } from "react-native";
import { render, act } from "@testing-library/react-native";
import { Text } from "react-native";

/**
 * H2 acceptance — TEST-H2-001..008.
 *
 * expo-router's useFocusEffect is replaced with a controllable stand-in so a
 * test can blur and refocus a screen without a navigator. It mirrors the real
 * contract: run the effect on focus, run the returned teardown on blur.
 */

let focusCallback: (() => undefined | (() => void)) | null = null;
let focusTeardown: (() => void) | undefined;

const focusScreen = () => {
  if (!focusCallback) throw new Error("useFocusEffect was never called");
  focusTeardown = focusCallback() ?? undefined;
};
const blurScreen = () => {
  focusTeardown?.();
  focusTeardown = undefined;
};

jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => undefined | (() => void)) => {
    focusCallback = cb;
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { usePoll } = require("../usePoll") as typeof import("../usePoll");

/** Drive AppState by hand: jest-expo's AppState never actually changes. */
type AppStateHandler = (state: AppStateStatus) => void;
let appStateHandlers: AppStateHandler[] = [];
let removeCalls = 0;

const setAppState = (state: AppStateStatus) => {
  (AppState as unknown as { currentState: AppStateStatus }).currentState = state;
  appStateHandlers.forEach((h) => h(state));
};
const backgroundApp = () => setAppState("background");
const foregroundApp = () => setAppState("active");

function Harness({
  fn,
  interval = 1000,
  enabled = true,
}: {
  fn: () => Promise<unknown> | unknown;
  interval?: number;
  enabled?: boolean;
}) {
  usePoll(fn, interval, enabled);
  return <Text>harness</Text>;
}

const mountFocused = (props: React.ComponentProps<typeof Harness>) => {
  const utils = render(<Harness {...props} />);
  act(() => focusScreen());
  return utils;
};

/**
 * Advance fake timers one interval at a time, draining microtasks between each.
 *
 * `jest.advanceTimersByTime(3000)` fires three interval callbacks back to back
 * in one synchronous turn with no microtask drain, which real timers never do.
 * That matters because `tick` clears its in-flight flag in a `finally` AFTER an
 * `await` — so without a drain, ticks 2..N all see the first tick as still
 * running and skip. That is the single-flight guard behaving correctly on a
 * dishonest clock, not a bug in it.
 */
const advance = async (ms: number, step: number) => {
  // Drain BEFORE the first advance too: the immediate tick fired by start()
  // is still in flight at this point, and an interval callback landing on top
  // of it would be correctly skipped, costing a tick the test is counting.
  await act(async () => {
    await Promise.resolve();
  });
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    await act(async () => {
      jest.advanceTimersByTime(step);
      await Promise.resolve();
    });
  }
};

/** Drain pending microtasks without moving the clock. */
const settle = () => act(async () => { await Promise.resolve(); });

beforeEach(() => {
  jest.useFakeTimers();
  focusCallback = null;
  focusTeardown = undefined;
  appStateHandlers = [];
  removeCalls = 0;
  (AppState as unknown as { currentState: AppStateStatus }).currentState =
    "active";
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_evt, handler) => {
      appStateHandlers.push(handler);
      return {
        remove: () => {
          removeCalls += 1;
          appStateHandlers = appStateHandlers.filter((h) => h !== handler);
        },
      } as never;
    });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------

describe("TEST-H2-001 — focused + active runs", () => {
  it("HP: ticks immediately on focus, then on every interval", async () => {
    const fn = jest.fn();
    mountFocused({ fn, interval: 1000 });

    expect(fn).toHaveBeenCalledTimes(1); // immediate refresh on focus

    await advance(3000, 1000);
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("EC: enabled=false never polls at all", () => {
    const fn = jest.fn();
    mountFocused({ fn, interval: 1000, enabled: false });

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("TEST-H2-002 — losing focus stops polling", () => {
  it("HP: no further ticks after blur", () => {
    const fn = jest.fn();
    mountFocused({ fn, interval: 1000 });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    const before = fn.mock.calls.length;

    act(() => blurScreen());
    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(fn).toHaveBeenCalledTimes(before);
  });
});

describe("TEST-H2-003 — backgrounding stops polling", () => {
  it("HP: no further ticks while backgrounded", () => {
    const fn = jest.fn();
    mountFocused({ fn, interval: 1000 });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    const before = fn.mock.calls.length;

    act(() => backgroundApp());
    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    expect(fn).toHaveBeenCalledTimes(before);
  });

  it("EC: a screen focused while already backgrounded does not start", () => {
    (AppState as unknown as { currentState: AppStateStatus }).currentState =
      "background";
    const fn = jest.fn();
    mountFocused({ fn, interval: 1000 });

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("TEST-H2-004 — foregrounding resumes", () => {
  it("HP: resumes and ticks immediately on return", async () => {
    const fn = jest.fn();
    mountFocused({ fn, interval: 1000 });
    await settle(); // let the focus tick finish before backgrounding
    act(() => backgroundApp());
    const whileBackgrounded = fn.mock.calls.length;

    act(() => foregroundApp());

    // Immediate catch-up tick, so the screen is never stale on return.
    expect(fn).toHaveBeenCalledTimes(whileBackgrounded + 1);
    await settle();

    await advance(2000, 1000);
    expect(fn).toHaveBeenCalledTimes(whileBackgrounded + 3);
  });

  it("EC: a blurred screen does NOT resume when the app foregrounds", () => {
    // Backgrounding the app while on another screen must not wake this one.
    const fn = jest.fn();
    mountFocused({ fn, interval: 1000 });
    act(() => blurScreen());
    const before = fn.mock.calls.length;

    act(() => backgroundApp());
    act(() => foregroundApp());
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(fn).toHaveBeenCalledTimes(before);
  });
});

describe("TEST-H2-005 — in-flight request suppresses the next tick", () => {
  it("HP: a slow request is never overlapped", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const fn = jest.fn(() => gate);

    mountFocused({ fn, interval: 1000 });
    expect(fn).toHaveBeenCalledTimes(1); // in flight, unresolved

    // Five intervals pass while the first request is still open.
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
      await gate;
    });

    // Only once it has settled does the next tick get through.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("TEST-H2-006 — unmount tears everything down", () => {
  it("HP: timers stop and the AppState listener is removed", () => {
    const fn = jest.fn();
    const { unmount } = mountFocused({ fn, interval: 1000 });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    const before = fn.mock.calls.length;

    // Expo Router blurs the screen as it unmounts; teardown runs there.
    act(() => blurScreen());
    unmount();

    act(() => {
      jest.advanceTimersByTime(20_000);
    });
    expect(fn).toHaveBeenCalledTimes(before);
    expect(removeCalls).toBe(1);
    expect(appStateHandlers).toHaveLength(0);
  });
});

describe("TEST-H2-007 — a failed request does not kill the loop", () => {
  it("HP: polling continues after a rejection", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValue("ok");

    mountFocused({ fn, interval: 1000 });
    expect(fn).toHaveBeenCalledTimes(1);

    await settle();

    await advance(2000, 1000);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("EC: a rejection does not leave inFlight stuck, blocking every later tick", async () => {
    // The failure mode this guards: if the in-flight flag were cleared only on
    // success, one network blip would silently stop the screen updating for
    // the rest of the session.
    const fn = jest.fn().mockRejectedValue(new Error("still down"));

    mountFocused({ fn, interval: 1000 });
    await settle();

    await advance(3000, 1000);
    // Every tick got through — a rejection that left the flag set would have
    // stopped the screen updating for the rest of the session.
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("EC: a synchronous throw is contained too", () => {
    const fn = jest.fn(() => {
      throw new Error("sync boom");
    });

    expect(() => mountFocused({ fn, interval: 1000 })).not.toThrow();
  });
});

describe("TEST-H2-008 — rapid focus changes leave exactly one loop", () => {
  it("HP: refocusing does not stack intervals", async () => {
    const fn = jest.fn();
    mountFocused({ fn, interval: 1000 });

    for (let i = 0; i < 5; i++) {
      act(() => blurScreen());
      act(() => focusScreen());
      await settle();
    }
    const afterChurn = fn.mock.calls.length;

    await advance(1000, 1000);

    // Exactly one tick from one timer. A stacked loop would fire N times.
    expect(fn).toHaveBeenCalledTimes(afterChurn + 1);
  });

  it("HP: repeated foreground events do not stack intervals either", async () => {
    const fn = jest.fn();
    mountFocused({ fn, interval: 1000 });

    act(() => foregroundApp());
    await settle();
    act(() => foregroundApp());
    await settle();
    act(() => foregroundApp());
    await settle();
    const afterChurn = fn.mock.calls.length;

    await advance(1000, 1000);
    expect(fn).toHaveBeenCalledTimes(afterChurn + 1);
  });

  it("HP: only one AppState listener is ever live", () => {
    const fn = jest.fn();
    mountFocused({ fn, interval: 1000 });
    for (let i = 0; i < 5; i++) {
      act(() => blurScreen());
      act(() => focusScreen());
    }
    expect(appStateHandlers).toHaveLength(1);
  });
});
