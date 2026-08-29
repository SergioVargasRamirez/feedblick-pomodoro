import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { QrCard } from "@/components/QrCard";
import { BrandMark } from "@/components/BrandMark";
import { PhaseIcon } from "@/components/PhaseIcon";
import { sessionUrl } from "@/lib/room";
import { useRoomByCode } from "@/hooks/use-room";
import { useRoomPresenceChannel } from "@/lib/room-presence";
import { formatRemaining } from "@/lib/countdown";
import { useRoomTimerDisplay } from "@/lib/timer";

export const Route = createFileRoute("/display/$code")({
  head: () => ({
    meta: [{ title: "Room display · Feedblick Pomodoro" }, { name: "robots", content: "noindex" }],
  }),
  component: RoomDisplay,
  ssr: false,
});

const IDLE_TIMER = {
  timer_phase: "idle" as const,
  timer_target_at: null,
  timer_remaining_seconds: null,
  timer_duration_seconds: null,
  timer_round: 1,
};

// How long a broadcast announcement stays up before fading on its own — nobody's usually
// standing at the projector to dismiss it, unlike the interactive toast on /session/$code.
const ANNOUNCEMENT_DISPLAY_MS = 20_000;

function RoomDisplay() {
  const { code } = Route.useParams();
  const { room, loading, notFound } = useRoomByCode(code);
  const { announcement } = useRoomPresenceChannel(
    room?.status === "active" ? room.code : undefined,
  );
  const timer = useRoomTimerDisplay(room ?? IDLE_TIMER);

  const [bannerText, setBannerText] = useState<string | null>(null);
  useEffect(() => {
    if (!announcement) return;
    setBannerText(announcement.text);
    const id = setTimeout(() => setBannerText(null), ANNOUNCEMENT_DISPLAY_MS);
    return () => clearTimeout(id);
  }, [announcement]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (notFound || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center px-4">
        <p className="text-lg text-muted-foreground">This room code isn't active.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center gap-8 px-6 py-10">
      {bannerText && (
        <div className="fixed inset-x-0 top-0 z-10 flex items-center justify-center gap-2 bg-primary px-6 py-3 text-center text-lg font-medium text-primary-foreground">
          <Megaphone className="size-5 shrink-0" aria-hidden="true" />
          {bannerText}
        </div>
      )}

      <div className="absolute top-6 left-6">
        <BrandMark />
      </div>

      <PhaseIcon phase={timer.phase} />

      <p className="text-6xl md:text-8xl font-bold tabular-nums">
        {formatRemaining(timer.remainingSeconds)}
      </p>

      {room.status === "active" && (
        <QrCard
          url={sessionUrl(room.code)}
          title="Scan to join"
          description={sessionUrl(room.code)}
        />
      )}
      <p className="text-xs text-muted-foreground">Powered by Feedblick</p>

      <div className="absolute bottom-4 flex items-center gap-3 text-xs text-muted-foreground">
        <Link to="/impressum" className="hover:text-foreground hover:underline">
          Impressum
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/privacy" className="hover:text-foreground hover:underline">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
