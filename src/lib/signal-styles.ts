import type { SignalKind } from "./room-presence";

// Shared between the student session page (the signal buttons), the teacher panel (the
// drill-down labels), and RosterTable (the per-student signal badge) — one place, so the three
// don't drift out of sync with each other.
export const SIGNAL_LABEL: Record<SignalKind, string> = {
  done: "Done",
  stuck: "Stuck",
  need2min: "Need 2 min",
};

export const SIGNAL_STYLES: Record<SignalKind, { idle: string; active: string }> = {
  done: {
    idle: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
    active: "border-emerald-500 bg-emerald-500 text-white",
  },
  stuck: {
    idle: "border-red-500/40 text-red-700 dark:text-red-400",
    active: "border-red-500 bg-red-500 text-white",
  },
  need2min: {
    idle: "border-amber-500/40 text-amber-700 dark:text-amber-400",
    active: "border-amber-500 bg-amber-500 text-white",
  },
};
