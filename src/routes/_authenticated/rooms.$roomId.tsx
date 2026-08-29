import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowLeft, Copy, Check, ExternalLink, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QrCard } from "@/components/QrCard";
import { TimerWheel } from "@/components/TimerWheel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandMark } from "@/components/BrandMark";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { RosterTable } from "@/components/RosterTable";
import { sessionUrl, type Room } from "@/lib/room";
import { badgeColor } from "@/lib/badge-colors";
import { GROUP_FRUITS } from "@/lib/group-fruits";
import { cn } from "@/lib/utils";
import { useRoom, useRoomTasks } from "@/hooks/use-room";
import {
  useRoomPresenceChannel,
  summarizeByFruit,
  summarizeSignals,
  type SignalKind,
} from "@/lib/room-presence";
import { useCountdown, formatRemaining } from "@/lib/countdown";
import {
  BREAK_MINUTES,
  FOCUS_PRESET_MINUTES,
  buildPause,
  buildReset,
  buildResume,
  buildStartBreak,
  buildStartFocus,
  useRoomTimerDisplay,
} from "@/lib/timer";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  head: () => ({
    meta: [{ title: "Room · Feedblick Pomodoro" }],
  }),
  component: RoomControl,
});

const SIGNAL_LABEL: Record<SignalKind, string> = {
  done: "Done",
  stuck: "Stuck",
  need2min: "Need 2 min",
};

// A named window: clicking the button again re-focuses the same popped-out window instead of
// opening a second one. Explicit width/height (rather than a bare "_blank") is what makes most
// browsers give a separate, draggable floating window instead of a new tab — the point being to
// drag this onto a projector while the room panel stays on the teacher's own screen.
function openDisplayWindow(url: string) {
  const win = window.open(url, "feedblick-display", "noopener,noreferrer,width=480,height=720");
  if (!win) toast.error("Pop-up blocked — allow pop-ups for this site to open the display window.");
}

function RoomControl() {
  const { roomId } = Route.useParams();
  const { room, loading } = useRoom(roomId);
  const { tasks } = useRoomTasks(roomId);
  const { students } = useRoomPresenceChannel(room?.code);
  const [drillSignal, setDrillSignal] = useState<SignalKind | null>(null);
  const [newTask, setNewTask] = useState("");

  const expiresIn = useCountdown(room?.code_expires_at);
  // Hooks must run unconditionally every render, so this runs against a fallback idle shape
  // before we know whether `room` has loaded yet — the loading-guard return below happens
  // after every hook call, not before.
  const timer = useRoomTimerDisplay(
    room ?? {
      timer_phase: "idle",
      timer_target_at: null,
      timer_remaining_seconds: null,
      timer_duration_seconds: null,
      timer_round: 1,
    },
  );

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const signalCounts = summarizeSignals(students);
  const byFruit = summarizeByFruit(
    students,
    GROUP_FRUITS.map((f) => f.id),
  );

  const updateTimer = async (patch: Partial<Room>) => {
    const { error } = await supabase.from("rooms").update(patch).eq("id", room.id);
    if (error) toast.error(error.message);
  };

  const onStartFocus = (minutes: number) =>
    updateTimer(buildStartFocus(minutes, room.timer_phase === "idle" ? 1 : room.timer_round));
  const onPauseResume = () => updateTimer(timer.isRunning ? buildPause(room) : buildResume(room));
  const onReset = () => updateTimer(buildReset());
  const onSkipToBreak = () => updateTimer(buildStartBreak(room.timer_round));

  const onEndRoom = async () => {
    const { error } = await supabase.from("rooms").update({ status: "ended" }).eq("id", room.id);
    if (error) toast.error(error.message);
    else toast.success("Room ended — students can no longer join.");
  };

  const onAddTask = async () => {
    const text = newTask.trim();
    if (!text) return;
    const { error } = await supabase
      .from("room_tasks")
      .insert({ room_id: room.id, text, position: tasks.length });
    if (error) toast.error(error.message);
    else setNewTask("");
  };

  const onDeleteTask = async (id: string) => {
    const { error } = await supabase.from("room_tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="relative isolate min-h-screen bg-background">
      <BackgroundGlow />
      <Toaster />
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <BrandMark />
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg tracking-widest">{room.code}</span>
            {room.status === "active" ? (
              <Button variant="outline" size="sm" onClick={onEndRoom}>
                End room
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Ended</span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timer</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col-reverse items-center gap-6 md:flex-row md:items-center md:justify-between">
              <div className="w-full space-y-4">
                <p className="text-sm text-muted-foreground capitalize">
                  {timer.phase} · round {timer.round}
                </p>
                <div className="flex flex-wrap gap-2">
                  {FOCUS_PRESET_MINUTES.map((m) => (
                    <Button key={m} variant="outline" size="sm" onClick={() => onStartFocus(m)}>
                      {m}m focus
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" onClick={onSkipToBreak}>
                    Skip to {BREAK_MINUTES}m break
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={onPauseResume} disabled={timer.phase === "idle"}>
                    {timer.isRunning ? "Pause" : "Resume"}
                  </Button>
                  <Button variant="outline" onClick={onReset}>
                    Reset
                  </Button>
                </div>
              </div>
              <TimerWheel
                remainingSeconds={timer.remainingSeconds}
                totalSeconds={timer.totalSeconds}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">To-do list</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Add a task…"
                  onKeyDown={(e) => e.key === "Enter" && onAddTask()}
                />
                <Button size="icon" variant="outline" onClick={onAddTask}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <ol className="space-y-1">
                {tasks.map((t, i) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {i + 1}. {t.text}
                    </span>
                    <button
                      onClick={() => onDeleteTask(t.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <QrCard
            url={sessionUrl(room.code)}
            title="Students join here"
            description={
              room.status === "active"
                ? isFinite(expiresIn)
                  ? `Code expires in ${formatRemaining(expiresIn)}`
                  : "Code expired — students can no longer join."
                : "Room ended."
            }
            actions={
              <div className="flex flex-col items-center gap-2">
                <CopyLinkButton url={sessionUrl(room.code)} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    openDisplayWindow(`${window.location.origin}/display/${room.code}`)
                  }
                >
                  <ExternalLink className="size-4 mr-1" /> Open projector display
                </Button>
              </div>
            }
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live counts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <StatTile label="In room" value={signalCounts.total} />
                {(["done", "stuck", "need2min"] as SignalKind[]).map((kind) => (
                  <button
                    key={kind}
                    onClick={() => setDrillSignal(drillSignal === kind ? null : kind)}
                    className="text-left"
                  >
                    <StatTile
                      label={SIGNAL_LABEL[kind]}
                      value={signalCounts[kind]}
                      active={drillSignal === kind}
                    />
                  </button>
                ))}
              </div>
              {drillSignal && (
                <div className="border-t pt-3 space-y-1 text-sm">
                  {GROUP_FRUITS.map((f, i) => (
                    <div key={f.id} className="flex justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className={cn("size-2 rounded-full", badgeColor(i).dot)} />
                        <span aria-hidden="true">{f.emoji}</span>
                        {f.label}
                      </span>
                      <span className="font-medium">{byFruit[f.id]?.[drillSignal] ?? 0}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unassigned</span>
                    <span className="font-medium">
                      {students.filter((s) => !s.fruit && s.signal === drillSignal).length}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students &amp; groups</CardTitle>
          </CardHeader>
          <CardContent>
            <RosterTable students={students} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      title={url}
      className="flex max-w-56 items-center gap-1.5 text-xs text-primary underline underline-offset-2 hover:text-primary/80"
    >
      <span className="truncate">{url}</span>
      {copied ? <Check className="size-3.5 shrink-0" /> : <Copy className="size-3.5 shrink-0" />}
    </button>
  );
}

function StatTile({ label, value, active }: { label: string; value: number; active?: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${active ? "border-primary bg-primary/5" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
