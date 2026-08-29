import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";

// Ported from feedblick-edu/stars' Footer, minus i18n (this app has none, see CLAUDE.md) and
// the CoffeeButton (no donation link here).
//
// "home": full-width page (needs its own max-width wrapper), brand lockup + legal links.
// "legal": already inside a max-width <main>, swaps the brand lockup for a plain "back home"
// link (used by /impressum and /privacy themselves).
// "minimal": just the two legal links, small and unobtrusive — for busy in-app screens
// (dashboard, account, the room/session panels) where a full brand row would be clutter, but
// German law still expects Impressum/Datenschutz reachable from every page. Found missing from
// most of the app's own pages 2026-09-01, "the footer was not consistently applied."
export function Footer({ variant = "home" }: { variant?: "home" | "legal" | "minimal" }) {
  if (variant === "minimal") {
    return (
      <footer className="flex items-center justify-center gap-4 py-4 text-xs text-muted-foreground">
        <Link to="/impressum" className="hover:text-foreground hover:underline">
          Impressum
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/privacy" className="hover:text-foreground hover:underline">
          Privacy Policy
        </Link>
      </footer>
    );
  }

  return (
    <footer
      className={
        variant === "home"
          ? "border-t py-6 max-w-5xl mx-auto px-6 space-y-4"
          : "border-t pt-6 space-y-4"
      }
    >
      <div className="flex items-center justify-center text-sm text-muted-foreground">
        {variant === "home" ? (
          <Link to="/" className="hover:opacity-80">
            <BrandMark />
          </Link>
        ) : (
          <Link to="/" className="hover:underline">
            Back home
          </Link>
        )}
      </div>
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <Link to="/impressum" className="hover:text-foreground hover:underline">
          Impressum
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/privacy" className="hover:text-foreground hover:underline">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
