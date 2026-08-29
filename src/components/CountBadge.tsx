import type { ReactNode } from "react";

// A plain count has no "limit" to be a ratio of, so it doesn't get a progress ring like
// SignalMeter's — but it sits next to those meters, so it borrows their circular shape and
// sizing to read as one family of stats. Generalized from a one-off "In room" badge (Users
// icon) once a second use turned up (a 🍅-icon "Pomodoros completed" count) — same shape,
// different icon/label/count, not worth two near-identical components.
export function CountBadge({
  icon,
  label,
  count,
  size = 128,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  size?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-transparent px-2 py-3">
      <div
        className="flex shrink-0 items-center justify-center rounded-full border-[12px] border-muted"
        style={{ width: size, height: size }}
      >
        <div className="flex flex-col items-center gap-0.5">
          {icon}
          <span className="text-2xl font-semibold tabular-nums">{count}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
