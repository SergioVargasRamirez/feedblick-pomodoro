import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QrCard } from "@/components/QrCard";
import { joinUrl, type Room } from "@/lib/room";
import { useRoom, useRoomBadges, useRoomTasks } from "@/hooks/use-room";
import {
  useRoomPresenceChannel,
  summarizeByBadge,
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

function RoomControl() {
  const { roomId } = Route.useParams();
  const { room, loading } = useRoom(roomId);
  const { tasks } = useRoomTasks(roomId);
  const { badges } = useRoomBadges(roomId);
  const { students } = useRoomPresenceChannel(room?.code);
  const [drillSignal, setDrillSignal] = useState<SignalKind | null>(null);
  const [newTask, setNewTask] = useState("");
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgePlace, setNewBadgePlace] = useState("");
  const [newBadgeSeats, setNewBadgeSeats] = useState("4");

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
  const byBadge = summarizeByBadge(
    students,
    badges.map((b) => b.id),
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

  const onAddBadge = async () => {
    const name = newBadgeName.trim();
    if (!name) return;
    const seats = Number.parseInt(newBadgeSeats, 10) || 4;
    const { error } = await supabase
      .from("room_badges")
      .insert({ room_id: room.id, name, place: newBadgePlace.trim(), seats });
    if (error) toast.error(error.message);
    else {
      setNewBadgeName("");
      setNewBadgePlace("");
      setNewBadgeSeats("4");
    }
  };

  const onDeleteBadge = async (id: string) => {
    const { error } = await supabase.from("room_badges").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg tracking-widest">{room.code}</span>
            {room.status === "active" ? (
              <Button variant="outline" size="sm" onClick={onEndRoom}>
                End room
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Ended</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <QrCard
            url={joinUrl(room.code)}
            title="Students join here"
            description={
              room.status === "active"
                ? isFinite(expiresIn)
                  ? `Code expires in ${formatRemaining(expiresIn)}`
                  : "Code expired — students can no longer join."
                : "Room ended."
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
                  {badges.map((b) => (
                    <div key={b.id} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {b.name}
                        {b.place ? ` · ${b.place}` : ""}
                      </span>
                      <span className="font-medium">{byBadge[b.id]?.[drillSignal] ?? 0}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unassigned</span>
                    <span className="font-medium">
                      {students.filter((s) => !s.badgeId && s.signal === drillSignal).length}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold tabular-nums">
                {formatRemaining(timer.remainingSeconds)}
              </span>
              <span className="text-sm text-muted-foreground capitalize">
                {timer.phase} · round {timer.round}
              </span>
            </div>
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
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
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
              <ul className="space-y-1">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{t.text}</span>
                    <button
                      onClick={() => onDeleteTask(t.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Group badges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Input
                  className="col-span-1"
                  value={newBadgeName}
                  onChange={(e) => setNewBadgeName(e.target.value)}
                  placeholder="Group 2"
                />
                <Input
                  className="col-span-2"
                  value={newBadgePlace}
                  onChange={(e) => setNewBadgePlace(e.target.value)}
                  placeholder="By the door"
                  onKeyDown={(e) => e.key === "Enter" && onAddBadge()}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  className="w-24"
                  value={newBadgeSeats}
                  onChange={(e) => setNewBadgeSeats(e.target.value)}
                />
                <Button variant="outline" onClick={onAddBadge}>
                  <Plus className="size-4 mr-1" /> Add badge
                </Button>
              </div>
              <ul className="space-y-1">
                {badges.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {b.name}
                      {b.place ? ` · ${b.place}` : ""} · {b.seats} seats
                      {" — "}
                      <span className="text-muted-foreground">
                        {byBadge[b.id]?.total ?? 0} here
                      </span>
                    </span>
                    <button
                      onClick={() => onDeleteBadge(b.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
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
