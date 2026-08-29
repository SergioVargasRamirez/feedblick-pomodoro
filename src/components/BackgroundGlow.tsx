// A subtle brand-red "mist" behind a page's content — softens light mode's stark white
// background, fading from a light tomato tint at the top down to nothing. Purely decorative:
// aria-hidden, absolutely positioned, zero layout impact.
//
// A plain top-to-bottom gradient rather than the earlier blurred-circle version (which only
// reliably showed up on some pages, not others, depending on exactly where in the page it was
// nested) — `inset-0` on this component's own immediate parent guarantees it always spans that
// parent's full height, so it's placed as the very first child of each page's outermost
// `min-h-screen` wrapper (which must have `relative`), not nested inside a `<main>` further in.
export function BackgroundGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary/15 to-transparent"
    />
  );
}
