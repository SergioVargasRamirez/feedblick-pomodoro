import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { QrCard } from "@/components/QrCard";
import { joinUrl } from "@/lib/room";
import { useRoomByCode } from "@/hooks/use-room";
import { useRoomPresenceChannel, summarizeSignals } from "@/lib/room-presence";
import { useCountdown, formatRemaining } from "@/lib/countdown";
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
  const expiresIn = useCountdown(room?.code_expires_at);
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-10 px-6 py-10">
      <div className="text-center space-y-2">
        <p className="text-6xl md:text-8xl font-bold tabular-nums">
          {formatRemaining(timer.remainingSeconds)}
        </p>
        <p className="text-lg text-muted-foreground capitalize">
          {timer.phase} · round {timer.round}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl">
        <DisplayStat label="In room" value={counts.total} />
        <DisplayStat label="Done" value={counts.done} />
        <DisplayStat label="Stuck" value={counts.stuck} />
        <DisplayStat label="Need 2 min" value={counts.need2min} />
      </div>

      {room.status === "active" && isFinite(expiresIn) && expiresIn > 0 && (
        <QrCard
          url={joinUrl(room.code)}
          title={`Join code: ${room.code}`}
          description={`Expires in ${formatRemaining(expiresIn)}`}
        />
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
