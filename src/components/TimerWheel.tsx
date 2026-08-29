import { formatRemaining } from "@/lib/countdown";
import { cn } from "@/lib/utils";

// A circular countdown — the ring drains from full to empty as `remainingSeconds` counts down
// toward 0, with the remaining time rendered in the middle. Shared by the teacher control panel
// and the student session view so both read the same at a glance.
export function TimerWheel({
  remainingSeconds,
  totalSeconds,
  size = 200,
  strokeWidth = 12,
  label,
  className,
}: {
  remainingSeconds: number;
  totalSeconds: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? Math.min(1, Math.max(0, remainingSeconds / totalSeconds)) : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="fill-none stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums">{formatRemaining(remainingSeconds)}</span>
        {label && <span className="text-xs text-muted-foreground capitalize">{label}</span>}
      </div>
    </div>
  );
}
