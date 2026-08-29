import { cn } from "@/lib/utils";

// A "ratio against a limit" (count of students signalling X, out of everyone in the room) is a
// meter, not a pie/donut comparing categories — per the dataviz skill's form guidance, a 2-4
// slice pie for this shape reads worse than a stat number, while a meter reads at a glance and
// still looks like a "donut." Each signal is a status (good/warning/critical), so the fill uses
// that reserved status color; the unfilled track is a lighter step of the SAME ramp (not a
// neutral gray) so the color still carries meaning across the whole ring, not just the arc.
const RING_COLORS: Record<"done" | "stuck" | "need2min", { track: string; fill: string }> = {
  done: {
    track: "stroke-emerald-100 dark:stroke-emerald-950",
    fill: "stroke-emerald-500",
  },
  stuck: {
    track: "stroke-red-100 dark:stroke-red-950",
    fill: "stroke-red-500",
  },
  need2min: {
    track: "stroke-amber-100 dark:stroke-amber-950",
    fill: "stroke-amber-500",
  },
};

export function SignalMeter({
  kind,
  count,
  total,
  label,
  size = 128,
  strokeWidth = 12,
  active = false,
}: {
  kind: "done" | "stuck" | "need2min";
  count: number;
  total: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  active?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = total > 0 ? Math.min(1, count / total) : 0;
  const dashOffset = circumference * (1 - fraction);
  const colors = RING_COLORS[kind];

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3",
        active ? "border-primary bg-primary/5" : "border-transparent",
      )}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className={cn("fill-none", colors.track)}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn(
              "fill-none transition-[stroke-dashoffset] duration-500 ease-out",
              colors.fill,
            )}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{count}</span>
        </div>
      </div>
      {/* Label, not color alone, carries what this meter means. */}
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
