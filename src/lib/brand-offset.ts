// Where the lockup's secondary line should start, relative to the primary line above it.
// Framework-agnostic on purpose (no React import) — copied as-is from feedblick-stars'
// src/lib/brand-offset.ts, which designed it this way so both a web brand mark (measuring via
// the Canvas 2D API) and a print path (measuring via a PDF library's font metrics) could share
// the same "find the target letter, slice up to it" logic. Only BrandMark.tsx uses it here.
export function offsetToFirstOf(
  text: string,
  chars: string[],
  measureWidth: (s: string) => number,
): number {
  const lower = text.toLowerCase();
  let index = -1;
  for (const char of chars) {
    const found = lower.indexOf(char.toLowerCase());
    if (found >= 0 && (index < 0 || found < index)) {
      index = found;
    }
  }
  if (index < 0) return 0; // the candidate letter doesn't appear — leave the suffix flush left
  return measureWidth(text.slice(0, index));
}
