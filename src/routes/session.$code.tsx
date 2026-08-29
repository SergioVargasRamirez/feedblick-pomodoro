import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TimerWheel } from "@/components/TimerWheel";
import { BrandMark } from "@/components/BrandMark";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RosterTable } from "@/components/RosterTable";
import { cn } from "@/lib/utils";
import { badgeColor } from "@/lib/badge-colors";
import { GROUP_FRUITS } from "@/lib/group-fruits";
import { useRoomByCode, useRoomTasks } from "@/hooks/use-room";
import {
  useRoomPresenceChannel,
  trackPresence,
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

const SIGNAL_STYLES: Record<SignalKind, { idle: string; active: string }> = {
  done: {
    idle: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
    active: "border-emerald-500 bg-emerald-500 text-white",
  },
  stuck: {
    idle: "border-red-500/40 text-red-700 dark:text-red-400",
    active: "border-red-500 bg-red-500 text-white",
  },
  need2min: {
    idle: "border-amber-500/40 text-amber-700 dark:text-amber-400",
    active: "border-amber-500 bg-amber-500 text-white",
  },
};

// A student's own typed name is debounced before it's broadcast (and before they show up in
// the shared list at all) so the room isn't re-tracking presence on every keystroke.
const NAME_COMMIT_DELAY_MS = 400;

function nameStorageKey(roomCode: string): string {
  return `feedblick-pomodoro-name-${roomCode}`;
}

function SessionView() {
  const { code } = Route.useParams();
  const { room, loading, notFound } = useRoomByCode(code);
  const { tasks } = useRoomTasks(room?.id);
  const { channel, students, synced } = useRoomPresenceChannel(
    room?.status === "active" ? room.code : undefined,
  );
  const timer = useRoomTimerDisplay(room ?? IDLE_TIMER);

  const [name, setName] = useState("");
  const [committedName, setCommittedName] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [self, setSelf] = useState<Pick<StudentPresence, "fruit" | "signal">>({
    fruit: null,
    signal: null,
  });

  // A returning student (same tab, reloaded) keeps whatever they typed before.
  useEffect(() => {
    if (!code) return;
    const stored = sessionStorage.getItem(nameStorageKey(code));
    if (stored) setName(stored);
  }, [code]);

  const onNameChange = (value: string) => {
    setName(value);
    if (code) sessionStorage.setItem(nameStorageKey(code), value);
  };

  useEffect(() => {
    const id = setTimeout(() => setCommittedName(name.trim()), NAME_COMMIT_DELAY_MS);
    return () => clearTimeout(id);
  }, [name]);

  // A student with no committed name yet isn't tracked at all — they simply don't show up in
  // the shared list until they've typed something. Badge/signal taps re-announce immediately
  // (no debounce) since only the name itself needs one.
  useEffect(() => {
    if (!channel || !committedName) return;
    trackPresence(channel, { name: committedName, ...self });
  }, [channel, committedName, self]);

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

  const toggleFruit = (id: string) => {
    setSelf((prev) => ({ ...prev, fruit: prev.fruit === id ? null : id }));
  };

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
    <div className="relative isolate min-h-screen bg-background px-4 py-6 space-y-6 max-w-3xl mx-auto">
      <BackgroundGlow />
      <div className="flex items-center justify-between">
        <BrandMark />
        <ThemeToggle />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-center pt-6">
            <TimerWheel
              remainingSeconds={timer.remainingSeconds}
              totalSeconds={timer.totalSeconds}
              label={`${timer.phase} · round ${timer.round}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
            ) : (
              <ol className="space-y-3">
                {tasks.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={checked.has(t.id)}
                      onCheckedChange={() => toggleTask(t.id)}
                      id={`task-${t.id}`}
                      className="size-5"
                    />
                    <label
                      htmlFor={`task-${t.id}`}
                      className={cn(
                        "text-lg",
                        checked.has(t.id) && "line-through text-muted-foreground",
                      )}
                    >
                      {i + 1}. {t.text}
                    </label>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">How's it going?</p>
        <div className="grid grid-cols-3 gap-2">
          {SIGNALS.map(({ kind, label }) => (
            <button
              key={kind}
              onClick={() => toggleSignal(kind)}
              className={cn(
                "rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
                self.signal === kind ? SIGNAL_STYLES[kind].active : SIGNAL_STYLES[kind].idle,
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">You</p>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Your name, a nickname, whatever you like"
          maxLength={40}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {GROUP_FRUITS.map((fruit, i) => {
            const isSelf = self.fruit === fruit.id;
            const color = badgeColor(i);
            return (
              <button
                key={fruit.id}
                onClick={() => toggleFruit(fruit.id)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  isSelf ? color.active : color.idle,
                )}
              >
                <span aria-hidden="true">{fruit.emoji}</span> {fruit.label}
              </button>
            );
          })}
        </div>
        {!synced && <p className="text-xs text-muted-foreground">Connecting…</p>}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">In this room</p>
        <RosterTable students={students} />
      </div>
    </div>
  );
}
