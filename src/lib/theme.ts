// Lightweight theme manager — no dependency.
export type Theme = "light" | "dark" | "system";
const KEY = "feedblick-theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

// Inline script string for SSR to avoid FOUC.
export const THEME_BOOTSTRAP_SCRIPT = `
(function(){try{
  var t=localStorage.getItem(${JSON.stringify(KEY)})||"system";
  var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark",d);
}catch(e){}})();
`;
