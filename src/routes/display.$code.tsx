import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { QrCard } from "@/components/QrCard";
import { BrandMark } from "@/components/BrandMark";
import { SignalMeter } from "@/components/SignalMeter";
import { sessionUrl } from "@/lib/room";
import { useRoomByCode } from "@/hooks/use-room";
import { useRoomPresenceChannel, summarizeSignals } from "@/lib/room-presence";
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

function RoomDisplay() {
  const { code } = Route.useParams();
  const { room, loading, notFound } = useRoomByCode(code);
  const { students } = useRoomPresenceChannel(room?.code);
  const timer = useRoomTimerDisplay(room ?? IDLE_TIMER);
  const counts = summarizeSignals(students);

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
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center gap-10 px-6 py-10">
      <div className="absolute top-6 left-6">
        <BrandMark />
      </div>

      <div className="text-center space-y-2">
        <p className="text-6xl md:text-8xl font-bold tabular-nums">
          {formatRemaining(timer.remainingSeconds)}
        </p>
        <p className="text-lg text-muted-foreground capitalize">
          {timer.phase} · round {timer.round}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6">
        <DisplayStat label="In room" value={counts.total} />
        <SignalMeter kind="done" count={counts.done} total={counts.total} label="Done" />
        <SignalMeter kind="stuck" count={counts.stuck} total={counts.total} label="Stuck" />
        <SignalMeter
          kind="need2min"
          count={counts.need2min}
          total={counts.total}
          label="Need 2 min"
        />
      </div>

      {room.status === "active" && (
        <QrCard url={sessionUrl(room.code)} title={`Join code: ${room.code}`} />
      )}
    </div>
  );
}

function DisplayStat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-3xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
