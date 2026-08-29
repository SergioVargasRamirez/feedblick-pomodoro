import { useEffect, useRef, useState } from "react";
import { offsetToFirstOf } from "@/lib/brand-offset";

// Feedblick Pomodoro's header lockup, modeled directly on feedblick-stars' BrandMark: a bold
// "Feedblick" line with the sub-brand name in a handwriting-style script beneath it, offset to
// start under a specific letter in "Feedblick" rather than sitting flush left.
//
// "Pomodoro" starts under the "b" of "Feedblick" (stars' own version instead targets the first
// of "i"/"c" — a different requested letter, same mechanism: offsetToFirstOf just takes
// whichever candidate letters the caller wants). Measured with the Canvas 2D API against
// "Feedblick"'s own live computed font, not a hand-tuned pixel guess, for the same reason stars'
// version does this — font rendering varies enough across environments (hinting, which
// typeface in the stack actually resolves) that a fixed offset doesn't generalize. Runs once
// after mount, since it needs the element's live computed style — "Pomodoro" sits at
// padding-left: 0 for one frame before the effect sets the real value.
export function BrandMark() {
  const mainRef = useRef<HTMLSpanElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const style = getComputedStyle(el);
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    setOffset(offsetToFirstOf("Feedblick", ["b"], (s) => ctx.measureText(s).width));
  }, []);

  return (
    <span className="flex items-center gap-2">
      <span className="text-xl leading-none" aria-hidden="true">
        🍅
      </span>
      <span className="flex flex-col leading-tight">
        <span ref={mainRef} className="font-semibold">
          Feedblick
        </span>
        <span
          style={{ paddingLeft: offset, fontFamily: "var(--font-script)", fontSize: "17px" }}
          className="-mt-1 font-bold text-primary"
        >
          Pomodoro
        </span>
      </span>
    </span>
  );
}
