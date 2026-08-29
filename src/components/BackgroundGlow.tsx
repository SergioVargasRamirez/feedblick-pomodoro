import { cn } from "@/lib/utils";

// A subtle brand-red "mist" behind a page's header/hero — the same purely decorative pattern
// feedblick-stars' homepage uses (a blurred, semi-transparent circle in the primary color) to
// keep a plain white light-mode background from reading as stark. Purely visual: aria-hidden,
// absolutely positioned (the parent needs `relative`), excluded from layout entirely.
//
// `center`: for a single vertically-centered card (the auth pages) the mist should sit behind
// the card wherever it lands, not pinned to the top of the viewport — the default (top-anchored)
// is right for a page with real content below a header/hero instead.
export function BackgroundGlow({ center = false }: { center?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -z-10 flex justify-center overflow-hidden",
        center ? "inset-0 items-center" : "inset-x-0 top-0",
      )}
    >
      <div className="h-72 w-[36rem] rounded-full bg-primary/25 blur-3xl" />
    </div>
  );
}
