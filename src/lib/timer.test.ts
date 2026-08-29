import { describe, expect, test } from "bun:test";
import {
  BREAK_MINUTES,
  buildPause,
  buildReset,
  buildResume,
  buildStartBreak,
  buildStartFocus,
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
  test("sets phase to break, defaults to BREAK_MINUTES, and increments the round", () => {
    const patch = buildStartBreak(2);
    expect(patch.timer_phase).toBe("break");
    expect(patch.timer_duration_seconds).toBe(BREAK_MINUTES * 60);
    expect(patch.timer_round).toBe(3);
    expect(secondsUntil(patch.timer_target_at)).toBeCloseTo(BREAK_MINUTES * 60, 0);
  });

  test("also used by skip-to-break — same shape, no separate skip state", () => {
    const skipped = buildStartBreak(1, 10);
    expect(skipped.timer_phase).toBe("break");
    expect(skipped.timer_duration_seconds).toBe(10 * 60);
    expect(skipped.timer_round).toBe(2);
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
