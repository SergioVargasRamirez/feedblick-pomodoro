// Supersedes an earlier custom-SVG tomato that ripened green->red: "can't you use the same
// tomato icon" (the plain 🍅 emoji, same as BrandMark/the favicon, not a hand-drawn shape) plus
// "during break the emoji should change, no tomato there" together rule out anything based on a
// single continuously-recolored shape — the actual ask is a fixed emoji per phase, not a
// progress animation on one of them.
const PHASE_EMOJI: Record<string, string> = {
  idle: "🍅",
  focus: "🍅",
  break: "🎉",
};

export function phaseEmoji(phase: string): string {
  return PHASE_EMOJI[phase] ?? PHASE_EMOJI.idle;
}

export function PhaseIcon({ phase, size = 180 }: { phase: string; size?: number }) {
  return (
    <span style={{ fontSize: size }} className="leading-none" aria-hidden="true">
      {phaseEmoji(phase)}
    </span>
  );
}
