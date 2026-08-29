import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TimerWheel } from "@/components/TimerWheel";
import { cn } from "@/lib/utils";
import { getOrCreateHandle } from "@/lib/fruit-handle";
import { useRoomByCode, useRoomBadges, useRoomTasks } from "@/hooks/use-room";
import {
  useRoomPresenceChannel,
  trackPresence,
  summarizeByBadge,
  type SignalKind,
  type StudentPresence,
} from "@/lib/room-presence";
import { useRoomTimerDisplay } from "@/lib/timer";

export const Route = createFileRoute("/session/$code")({
  head: () => ({
    meta: [{ title: "Session · Feedblick Pomodoro" }, { name: "robots", content: "noindex" }],
  }),
  component: SessionView,
  ssr: false,
});

const IDLE_TIMER = {
  timer_phase: "idle" as const,
  timer_target_at: null,
  timer_remaining_seconds: null,
  timer_duration_seconds: null,
  timer_round: 1,
};

const SIGNALS: { kind: SignalKind; label: string }[] = [
  { kind: "done", label: "Done" },
  { kind: "stuck", label: "Stuck" },
  { kind: "need2min", label: "Need 2 min" },
];

function SessionView() {
  const { code } = Route.useParams();
  const { room, loading, notFound } = useRoomByCode(code);
  const { tasks } = useRoomTasks(room?.id);
  const { badges } = useRoomBadges(room?.id);
  const { channel, students, synced } = useRoomPresenceChannel(
    room?.status === "active" ? room.code : undefined,
  );
  const timer = useRoomTimerDisplay(room ?? IDLE_TIMER);

  const [handle, setHandle] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [self, setSelf] = useState<Pick<StudentPresence, "badgeId" | "signal">>({
    badgeId: null,
    signal: null,
  });

  // Waits for `synced` — assigning a handle (or checking badge capacity) off an empty-by-default
  // presence snapshot would make every room look wide open for the first render.
  useEffect(() => {
    if (!code || !synced || handle) return;
    setHandle(
      getOrCreateHandle(
        code,
        students.map((s) => s.handle),
      ),
    );
    // Only ever runs once per room: `handle` in the guard above skips every render after the
    // first successful assignment, so `students` changing afterward doesn't reassign it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, synced]);

  // Every own-state change re-announces this client's full presence payload — presence.track()
  // always replaces the whole entry, there's no partial update.
  useEffect(() => {
    if (!channel || !handle) return;
    trackPresence(channel, { handle, ...self });
  }, [channel, handle, self]);

  const toggleTask = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSignal = (kind: SignalKind) => {
    setSelf((prev) => ({ ...prev, signal: prev.signal === kind ? null : kind }));
  };

  const toggleBadge = (id: string) => {
    setSelf((prev) => ({ ...prev, badgeId: prev.badgeId === id ? null : id }));
  };

  const byBadge = summarizeByBadge(
    students,
    badges.map((b) => b.id),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (notFound || !room || room.status !== "active") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center px-4">
        <p className="text-lg text-muted-foreground">
          This room code isn't active. Ask your teacher for a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 space-y-6 max-w-xl mx-auto">
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">You are</p>
        <p className="text-2xl font-bold">{handle}</p>
      </div>

      <div className="flex justify-center">
        <TimerWheel
          remainingSeconds={timer.remainingSeconds}
          totalSeconds={timer.totalSeconds}
          label={`${timer.phase} · round ${timer.round}`}
        />
      </div>

      <div>
        <p className="text-sm font-medium mb-2">How's it going?</p>
        <div className="grid grid-cols-3 gap-2">
          {SIGNALS.map(({ kind, label }) => (
            <Button
              key={kind}
              variant={self.signal === kind ? "default" : "outline"}
              onClick={() => toggleSignal(kind)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {badges.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Your group</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => {
              const occupied = byBadge[b.id]?.total ?? 0;
              const isSelf = self.badgeId === b.id;
              const isFull = !isSelf && occupied >= b.seats;
              return (
                <button
                  key={b.id}
                  disabled={isFull}
                  onClick={() => toggleBadge(b.id)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm",
                    isSelf
                      ? "border-primary bg-primary/10 font-medium"
                      : isFull
                        ? "text-muted-foreground/50 cursor-not-allowed"
                        : "text-muted-foreground",
                  )}
                >
                  {b.name}
                  {b.place ? ` · ${b.place}` : ""} · {occupied}/{b.seats}
                  {isFull ? " · full" : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tasks.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Tasks</p>
          <ol className="space-y-2">
            {tasks.map((t, i) => (
              <li key={t.id} className="flex items-center gap-2">
                <Checkbox
                  checked={checked.has(t.id)}
                  onCheckedChange={() => toggleTask(t.id)}
                  id={`task-${t.id}`}
                />
                <label
                  htmlFor={`task-${t.id}`}
                  className={cn(
                    "text-sm",
                    checked.has(t.id) && "line-through text-muted-foreground",
                  )}
                >
                  {i + 1}. {t.text}
                </label>
              </li>
            ))}
          </ol>
        </div>
      )}

      {students.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">In this room</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {students.map((s) => (
              <li key={s.presenceKey}>
                {s.handle}
                {s.badgeId ? ` — ${badges.find((b) => b.id === s.badgeId)?.name ?? ""}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
