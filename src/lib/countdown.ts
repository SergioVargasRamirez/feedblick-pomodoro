import { useEffect, useState } from "react";

export function useCountdown(iso: string | null | undefined) {
  const target = iso ? new Date(iso).getTime() : 0;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return Infinity;
  return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

export function formatRemaining(sec: number) {
  if (!isFinite(sec)) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}
