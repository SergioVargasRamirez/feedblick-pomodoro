import { describe, expect, test } from "bun:test";
import {
  buildPause,
  buildReset,
  buildResume,
  buildStartBreak,
  buildStartFocus,
  clampMinutes,
  completedPomodoros,
  MAX_MINUTES,
  MIN_MINUTES,
  nextAutoAdvancePatch,
  phaseLabel,
  shouldAutoAdvance,
  transportAction,
  type RoomTimerRow,
} from "./timer";

// `timer_target_at` is computed from Date.now() at call time, so assertions check it lands
// within a couple of seconds of the expected offset rather than an exact string match — same
// tolerance style as any test touching a "now"-derived timestamp.
function secondsUntil(iso: string | null): number {
  if (!iso) throw new Error("expected a timestamp, got null");
  return (new Date(iso).getTime() - Date.now()) / 1000;
}

const IDLE: RoomTimerRow = {
  timer_phase: "idle",
  timer_target_at: null,
  timer_remaining_seconds: null,
  timer_duration_seconds: null,
  timer_round: 1,
};

describe("buildStartFocus", () => {
  test("sets phase to focus with a target ~N minutes out and the round passed in", () => {
    const patch = buildStartFocus(25, 3);
    expect(patch.timer_phase).toBe("focus");
    expect(patch.timer_duration_seconds).toBe(25 * 60);
    expect(patch.timer_remaining_seconds).toBeNull();
    expect(patch.timer_round).toBe(3);
    expect(secondsUntil(patch.timer_target_at)).toBeCloseTo(25 * 60, 0);
  });
});

describe("buildStartBreak", () => {
  test("sets phase to break with the given length and increments the round", () => {
    const patch = buildStartBreak(2, 5);
    expect(patch.timer_phase).toBe("break");
    expect(patch.timer_duration_seconds).toBe(5 * 60);
    expect(patch.timer_round).toBe(3);
    expect(secondsUntil(patch.timer_target_at)).toBeCloseTo(5 * 60, 0);
  });

  test("also used by skip-to-break and auto-advance — same shape either way", () => {
    const skipped = buildStartBreak(1, 10);
    expect(skipped.timer_phase).toBe("break");
    expect(skipped.timer_duration_seconds).toBe(10 * 60);
    expect(skipped.timer_round).toBe(2);
  });
});

describe("clampMinutes", () => {
  test("leaves an in-range value alone", () => {
    expect(clampMinutes(25)).toBe(25);
  });

  test("clamps below the minimum up to it", () => {
    expect(clampMinutes(0)).toBe(MIN_MINUTES);
  });

  test("clamps above the maximum down to it", () => {
    expect(clampMinutes(1000)).toBe(MAX_MINUTES);
  });
});

describe("buildPause", () => {
  test("captures the remaining seconds from a running target and clears it", () => {
    const running: RoomTimerRow = {
      timer_phase: "focus",
      timer_target_at: new Date(Date.now() + 90_000).toISOString(),
      timer_remaining_seconds: null,
      timer_duration_seconds: 1500,
      timer_round: 1,
    };
    const patch = buildPause(running);
    expect(patch.timer_target_at).toBeNull();
    expect(patch.timer_remaining_seconds).toBeGreaterThanOrEqual(88);
    expect(patch.timer_remaining_seconds).toBeLessThanOrEqual(90);
    expect(patch.timer_phase).toBe("focus");
    expect(patch.timer_duration_seconds).toBe(1500);
  });

  test("never returns negative remaining seconds for an already-elapsed target", () => {
    const overdue: RoomTimerRow = {
      ...IDLE,
      timer_phase: "focus",
      timer_target_at: new Date(Date.now() - 5000).toISOString(),
    };
    expect(buildPause(overdue).timer_remaining_seconds).toBe(0);
  });

  test("pausing an already-paused state is a no-op on the remaining time", () => {
    const paused: RoomTimerRow = {
      ...IDLE,
      timer_phase: "focus",
      timer_remaining_seconds: 42,
    };
    expect(buildPause(paused).timer_remaining_seconds).toBe(42);
  });
});

describe("buildResume", () => {
  test("turns the stored remaining seconds back into a fresh target timestamp", () => {
    const paused: RoomTimerRow = {
      ...IDLE,
      timer_phase: "focus",
      timer_remaining_seconds: 120,
      timer_duration_seconds: 1500,
      timer_round: 2,
    };
    const patch = buildResume(paused);
    expect(patch.timer_remaining_seconds).toBeNull();
    expect(secondsUntil(patch.timer_target_at)).toBeCloseTo(120, 0);
    expect(patch.timer_phase).toBe("focus");
    expect(patch.timer_duration_seconds).toBe(1500);
    expect(patch.timer_round).toBe(2);
  });
});

describe("buildReset", () => {
  test("returns to idle with round 1 and everything else cleared", () => {
    expect(buildReset()).toEqual({
      timer_phase: "idle",
      timer_target_at: null,
      timer_remaining_seconds: null,
      timer_duration_seconds: null,
      timer_round: 1,
    });
  });
});

// Regression coverage for "when a break ends, the timer doesn't reset to a second pomodoro" —
// every phase change used to be manual-click-only, so a countdown reaching zero on its own did
// nothing. These two pure functions are what the room panel's auto-advance effect calls.
describe("shouldAutoAdvance", () => {
  test("fires exactly on a running positive-to-zero crossing", () => {
    expect(shouldAutoAdvance(3, 0, true)).toBe(true);
  });

  test("does not fire while paused, even at zero", () => {
    expect(shouldAutoAdvance(3, 0, false)).toBe(false);
  });

  test("does not fire if it was already at zero last check (no re-firing)", () => {
    expect(shouldAutoAdvance(0, 0, true)).toBe(false);
  });

  test("does not fire before any previous reading exists", () => {
    expect(shouldAutoAdvance(null, 0, true)).toBe(false);
  });

  test("does not fire while still counting down", () => {
    expect(shouldAutoAdvance(10, 9, true)).toBe(false);
  });
});

describe("nextAutoAdvancePatch", () => {
  test("focus ending advances to a break of the room's break length, round bumped", () => {
    const patch = nextAutoAdvancePatch({
      ...IDLE,
      timer_phase: "focus",
      timer_round: 1,
      focus_minutes: 25,
      break_minutes: 5,
    });
    expect(patch?.timer_phase).toBe("break");
    expect(patch?.timer_duration_seconds).toBe(5 * 60);
    expect(patch?.timer_round).toBe(2);
  });

  test("break ending advances to focus of the room's focus length, round unchanged", () => {
    const patch = nextAutoAdvancePatch({
      ...IDLE,
      timer_phase: "break",
      timer_round: 2,
      focus_minutes: 25,
      break_minutes: 5,
    });
    expect(patch?.timer_phase).toBe("focus");
    expect(patch?.timer_duration_seconds).toBe(25 * 60);
    expect(patch?.timer_round).toBe(2);
  });

  test("idle has nothing to advance from", () => {
    expect(nextAutoAdvancePatch({ ...IDLE, focus_minutes: 25, break_minutes: 5 })).toBeNull();
  });
});

describe("phaseLabel", () => {
  test("idle reads as Ready", () => {
    expect(phaseLabel({ phase: "idle", isPaused: false })).toBe("Ready");
  });

  test("running focus gets the tomato", () => {
    expect(phaseLabel({ phase: "focus", isPaused: false })).toBe("Focus 🍅");
  });

  test("running break gets the celebration", () => {
    expect(phaseLabel({ phase: "break", isPaused: false })).toBe("Break 🎉");
  });

  test("paused overrides the phase label regardless of which phase it is", () => {
    expect(phaseLabel({ phase: "focus", isPaused: true })).toBe("Paused ⏸️");
    expect(phaseLabel({ phase: "break", isPaused: true })).toBe("Paused ⏸️");
  });

  test("idle is never reported as paused, even if isPaused were somehow true", () => {
    // useRoomTimerDisplay never actually produces this combination, but phaseLabel's own
    // idle-first check means it can't matter if some future caller passes it anyway.
    expect(phaseLabel({ phase: "idle", isPaused: true })).toBe("Ready");
  });
});

describe("transportAction", () => {
  test("idle always means start, regardless of isRunning", () => {
    expect(transportAction({ phase: "idle", isRunning: false })).toBe("start");
    expect(transportAction({ phase: "idle", isRunning: true })).toBe("start");
  });

  test("a running phase means the button pauses it", () => {
    expect(transportAction({ phase: "focus", isRunning: true })).toBe("pause");
    expect(transportAction({ phase: "break", isRunning: true })).toBe("pause");
  });

  test("a stopped-but-not-idle phase means the button resumes it", () => {
    expect(transportAction({ phase: "focus", isRunning: false })).toBe("resume");
    expect(transportAction({ phase: "break", isRunning: false })).toBe("resume");
  });
});

describe("completedPomodoros", () => {
  test("a fresh room (round 1, nothing finished yet) shows zero", () => {
    expect(completedPomodoros(1)).toBe(0);
  });

  test("round is always one ahead of how many pomodoros actually finished", () => {
    expect(completedPomodoros(2)).toBe(1);
    expect(completedPomodoros(4)).toBe(3);
  });

  test("never goes negative, even for an invalid round of 0", () => {
    expect(completedPomodoros(0)).toBe(0);
  });
});
