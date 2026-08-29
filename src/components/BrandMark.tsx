// Feedblick Pomodoro's header lockup — modeled on feedblick-stars' BrandMark (a bold
// "Feedblick" line with the sub-brand name colored beneath it), simplified: no i18n, no
// dynamic canvas-measured offset, no extra self-hosted script font — this app doesn't carry
// any of those dependencies, and the visual idea (icon + two-line wordmark, sub-brand in the
// primary color) doesn't need them to read the same way.
export function BrandMark() {
  return (
    <span className="flex items-center gap-2">
      <span className="text-xl leading-none" aria-hidden="true">
        🍅
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-semibold">Feedblick</span>
        <span className="-mt-0.5 text-xs font-bold text-primary">Pomodoro</span>
      </span>
    </span>
  );
}
