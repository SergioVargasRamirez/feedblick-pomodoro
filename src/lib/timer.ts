import { useCountdown } from "./countdown";

// Fixed presets replaced by a -/+ stepper the teacher adjusts freely — these are just its
// bounds and the room row's defaults (see the migration adding focus_minutes/break_minutes).
export const DEFAULT_FOCUS_MINUTES = 25;
export const DEFAULT_BREAK_MINUTES = 5;
export const MIN_MINUTES = 5;
export const MAX_MINUTES = 90;
export const MINUTES_STEP = 5;

export function clampMinutes(minutes: number): number {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, minutes));
}

export type TimerPhase = "idle" | "focus" | "break";

// `timer_phase` is `string` here, not `TimerPhase` — the DB column is `text` with a CHECK
// constraint, not a Postgres enum, so `supabase gen types` types it as plain `string` and a
// `Room` row (the actual argument at every call site) wouldn't structurally match this type
// otherwise. The CHECK constraint still guarantees the real values at runtime.
export type RoomTimerRow = {
  timer_phase: string;
  timer_target_at: string | null;
  timer_remaining_seconds: number | null;
  timer_duration_seconds: number | null;
  timer_round: number;
};

export type RoomTimerUpdate = Pick<
  RoomTimerRow,
  | "timer_phase"
  | "timer_target_at"
  | "timer_remaining_seconds"
  | "timer_duration_seconds"
  | "timer_round"
>;

function startPhase(
  phase: Exclude<TimerPhase, "idle">,
  minutes: number,
  round: number,
): RoomTimerUpdate {
  return {
    timer_phase: phase,
    timer_target_at: new Date(Date.now() + minutes * 60_000).toISOString(),
    timer_remaining_seconds: null,
    timer_duration_seconds: minutes * 60,
    timer_round: round,
  };
}

export function buildStartFocus(
  minutes: number,
  round: RoomTimerRow["timer_round"],
): RoomTimerUpdate {
  return startPhase("focus", minutes, round);
}

// Also used by "skip to break" (and by the auto-advance-when-a-phase-ends effect) — a
// completed focus round, a skipped one, and an auto-advanced one all land here, there's no
// separate state for any of them.
export function buildStartBreak(currentRound: number, minutes: number): RoomTimerUpdate {
  return startPhase("break", minutes, currentRound + 1);
}

export function buildPause(state: RoomTimerRow): RoomTimerUpdate {
  const remaining = state.timer_target_at
    ? Math.max(0, Math.floor((new Date(state.timer_target_at).getTime() - Date.now()) / 1000))
    : (state.timer_remaining_seconds ?? 0);
  return {
    timer_phase: state.timer_phase,
    timer_target_at: null,
    timer_remaining_seconds: remaining,
    timer_duration_seconds: state.timer_duration_seconds,
    timer_round: state.timer_round,
  };
}

export function buildResume(state: RoomTimerRow): RoomTimerUpdate {
  return {
    timer_phase: state.timer_phase,
    timer_target_at: new Date(
      Date.now() + (state.timer_remaining_seconds ?? 0) * 1000,
    ).toISOString(),
    timer_remaining_seconds: null,
    timer_duration_seconds: state.timer_duration_seconds,
    timer_round: state.timer_round,
  };
}

export function buildReset(): RoomTimerUpdate {
  return {
    timer_phase: "idle",
    timer_target_at: null,
    timer_remaining_seconds: null,
    timer_duration_seconds: null,
    timer_round: 1,
  };
}

// Gives "Need 2 min" a real consequence: the host can add time to whichever phase is currently
// running or paused. Extends the total duration too (not just the target timestamp) so
// TimerWheel's own fraction-of-total math doesn't run past 100% the moment this lands. Returns
// null for idle — there's no running/paused phase yet to extend.
export function buildExtend(state: RoomTimerRow, extraSeconds: number): RoomTimerUpdate | null {
  if (state.timer_phase === "idle") return null;
  const timer_duration_seconds = (state.timer_duration_seconds ?? 0) + extraSeconds;
  if (state.timer_target_at) {
    return {
      timer_phase: state.timer_phase,
      timer_target_at: new Date(
        new Date(state.timer_target_at).getTime() + extraSeconds * 1000,
      ).toISOString(),
      timer_remaining_seconds: null,
      timer_duration_seconds,
      timer_round: state.timer_round,
    };
  }
  return {
    timer_phase: state.timer_phase,
    timer_target_at: null,
    timer_remaining_seconds: (state.timer_remaining_seconds ?? 0) + extraSeconds,
    timer_duration_seconds,
    timer_round: state.timer_round,
  };
}

// The zero-crossing check behind "when a phase's countdown ends, start the next one
// automatically" — pulled out as its own pure function specifically so it's unit-testable
// without rendering the component effect it lives in. True only the instant `remainingSeconds`
// goes from positive to zero (or below) while still actually running — a timer that's idle, or
// paused sitting at some fixed remaining value, or already at zero on a previous check, must
// not re-trigger.
export function shouldAutoAdvance(
  prevRemainingSeconds: number | null,
  remainingSeconds: number,
  isRunning: boolean,
): boolean {
  return (
    isRunning && prevRemainingSeconds !== null && prevRemainingSeconds > 0 && remainingSeconds <= 0
  );
}

// What to switch to once a phase's countdown reaches zero on its own: focus -> break using the
// room's break length (and bumping the round, same as a manual skip), break -> focus using the
// room's focus length (round unchanged, same as a manual restart). Returns null for idle —
// there's nothing to auto-advance from before a phase has even started.
export function nextAutoAdvancePatch(
  state: RoomTimerRow & { focus_minutes: number; break_minutes: number },
): RoomTimerUpdate | null {
  if (state.timer_phase === "focus") return buildStartBreak(state.timer_round, state.break_minutes);
  if (state.timer_phase === "break") return buildStartFocus(state.focus_minutes, state.timer_round);
  return null;
}

export const MIN_AUTO_RESTARTS = 1;
export const MAX_AUTO_RESTARTS = 10;

export function clampAutoRestarts(n: number): number {
  return Math.min(MAX_AUTO_RESTARTS, Math.max(MIN_AUTO_RESTARTS, n));
}

// Wraps nextAutoAdvancePatch with "auto-restart only N times" ("say, 2" — Sergio's own framing):
// once auto_restarts_used reaches the room's max_auto_restarts, the auto-advance effect stops
// switching phases on its own and freezes the timer at 0 in whatever phase it just finished,
// instead of continuing forever. A manual action (Start/Reset) resets auto_restarts_used
// separately — this function only ever counts up, never down.
export type AutoAdvanceOutcome =
  | { kind: "none" }
  | { kind: "advance"; patch: RoomTimerUpdate; autoRestartsUsed: number }
  | { kind: "capped"; patch: RoomTimerUpdate };

export function nextAutoAdvanceOutcome(
  state: RoomTimerRow & {
    focus_minutes: number;
    break_minutes: number;
    max_auto_restarts: number;
    auto_restarts_used: number;
  },
): AutoAdvanceOutcome {
  if (state.timer_phase === "idle") return { kind: "none" };
  if (state.auto_restarts_used >= state.max_auto_restarts) {
    return {
      kind: "capped",
      patch: {
        timer_phase: state.timer_phase,
        timer_target_at: null,
        timer_remaining_seconds: 0,
        timer_duration_seconds: state.timer_duration_seconds,
        timer_round: state.timer_round,
      },
    };
  }
  const patch = nextAutoAdvancePatch(state);
  if (!patch) return { kind: "none" };
  return { kind: "advance", patch, autoRestartsUsed: state.auto_restarts_used + 1 };
}

// `timer_round` increments once per completed (or skipped) focus phase, when its break starts
// (see buildStartBreak) — so it's always one ahead of how many pomodoros have actually finished.
// Brought back as a visible "Pomodoros" count in the teacher panel's Live Counts box after
// being dropped from the phase label entirely ("not sure we need the Round 1, 2, etc").
export function completedPomodoros(timerRound: number): number {
  return Math.max(0, timerRound - 1);
}

// No round counter shown anymore ("not sure we need the Round 1, 2, etc") — just which phase,
// with an emoji, and whether it's paused. Shared by the teacher panel, the student session page,
// and the projector display so the three can't drift on wording.
export function phaseLabel(timer: { phase: string; isPaused: boolean }): string {
  if (timer.phase === "idle") return "Ready";
  if (timer.isPaused) return "Paused ⏸️";
  if (timer.phase === "focus") return "Focus 🍅";
  if (timer.phase === "break") return "Break 🎉";
  return "";
}

// The single Play/Pause transport button in the room panel does triple duty (start from idle,
// pause while running, resume while paused) — this is the branch that decides which of the
// three it means right now, kept separate from the icon/label choice and the handler dispatch
// that consume it.
export type TransportAction = "start" | "pause" | "resume";

export function transportAction(timer: { phase: string; isRunning: boolean }): TransportAction {
  if (timer.phase === "idle") return "start";
  return timer.isRunning ? "pause" : "resume";
}

// Live display of a room's timer, whether it's running (ticks via useCountdown, same
// target-timestamp pattern as everywhere else) or paused (static — nothing to tick against).
export function useRoomTimerDisplay(state: RoomTimerRow) {
  const runningRemaining = useCountdown(state.timer_target_at);
  const isRunning = state.timer_phase !== "idle" && state.timer_target_at !== null;
  const remainingSeconds = isRunning ? runningRemaining : (state.timer_remaining_seconds ?? 0);
  return {
    phase: state.timer_phase,
    isRunning,
    isPaused: state.timer_phase !== "idle" && !isRunning,
    remainingSeconds,
    totalSeconds: state.timer_duration_seconds ?? 0,
    round: state.timer_round,
  };
}
