import { useCountdown } from "./countdown";

export const FOCUS_PRESET_MINUTES = [15, 25, 45, 50] as const;
export const BREAK_MINUTES = 5;

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

// Also used by "skip to break" — a completed focus round and a skipped one both land here,
// there's no separate skip-specific state.
export function buildStartBreak(currentRound: number, minutes = BREAK_MINUTES): RoomTimerUpdate {
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
