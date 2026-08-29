import { createFileRoute } from "@tanstack/react-router";
import { QrCard } from "@/components/QrCard";
import { BrandMark } from "@/components/BrandMark";
import { TomatoProgress } from "@/components/TomatoProgress";
import { sessionUrl } from "@/lib/room";
import { useRoomByCode } from "@/hooks/use-room";
import { formatRemaining } from "@/lib/countdown";
import { phaseLabel, useRoomTimerDisplay } from "@/lib/timer";

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

function RoomDisplay() {
  const { code } = Route.useParams();
  const { room, loading, notFound } = useRoomByCode(code);
  const timer = useRoomTimerDisplay(room ?? IDLE_TIMER);

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
      <div className="absolute top-6 left-6">
        <BrandMark />
      </div>

      <TomatoProgress
        remainingSeconds={timer.remainingSeconds}
        totalSeconds={timer.totalSeconds}
        phase={timer.phase}
      />

      <div className="text-center space-y-2">
        <p className="text-6xl md:text-8xl font-bold tabular-nums">
          {formatRemaining(timer.remainingSeconds)}
        </p>
        <p className="text-lg text-muted-foreground">{phaseLabel(timer)}</p>
      </div>

      {room.status === "active" && (
        <QrCard
          url={sessionUrl(room.code)}
          title="Scan to join"
          description={sessionUrl(room.code)}
        />
      )}
    </div>
  );
}
