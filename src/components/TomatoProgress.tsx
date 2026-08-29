// Pure eye candy for the projector display: a tomato that ripens from green to red as the
// current phase's countdown elapses. Not the 🍅 emoji — emoji glyphs are fixed multi-color
// bitmaps/COLR fonts that CSS `color` can't recolor, so an actual color transition needs a
// plain SVG shape instead.
function lerpColor(
  from: [number, number, number],
  to: [number, number, number],
  t: number,
): string {
  const mixed = from.map((c, i) => Math.round(c + (to[i] - c) * t));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

const UNRIPE_GREEN: [number, number, number] = [132, 204, 22]; // tailwind lime-500
const RIPE_RED: [number, number, number] = [220, 38, 38]; // tailwind red-600, close to --primary

export function TomatoProgress({
  remainingSeconds,
  totalSeconds,
  phase,
  size = 180,
}: {
  remainingSeconds: number;
  totalSeconds: number;
  phase: string;
  size?: number;
}) {
  // Idle has no phase to track progress through, so it just shows fully ripe (red) — the
  // default, restful state — rather than a meaningless 0%.
  const elapsedFraction =
    phase === "idle" || totalSeconds <= 0
      ? 1
      : Math.min(1, Math.max(0, 1 - remainingSeconds / totalSeconds));
  const bodyColor = lerpColor(UNRIPE_GREEN, RIPE_RED, elapsedFraction);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <g fill="#22c55e">
        <ellipse cx="50" cy="17" rx="7" ry="13" transform="rotate(-30 50 17)" />
        <ellipse cx="50" cy="15" rx="7" ry="14" />
        <ellipse cx="50" cy="17" rx="7" ry="13" transform="rotate(30 50 17)" />
        <ellipse cx="39" cy="19" rx="6" ry="11" transform="rotate(-55 39 19)" />
        <ellipse cx="61" cy="19" rx="6" ry="11" transform="rotate(55 61 19)" />
      </g>
      <circle
        cx="50"
        cy="58"
        r="38"
        fill={bodyColor}
        className="transition-[fill] duration-1000 ease-linear"
      />
      <ellipse cx="37" cy="45" rx="10" ry="7" fill="white" opacity="0.25" />
    </svg>
  );
}
