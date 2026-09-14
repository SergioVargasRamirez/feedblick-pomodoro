import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertTriangle,
  Minus,
  Users,
  Play,
  Pause,
  Square,
  FastForward,
  Megaphone,
  Repeat,
  Tag,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TimerWheel } from "@/components/TimerWheel";
import { SignalMeter } from "@/components/SignalMeter";
import { CountBadge } from "@/components/CountBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandMark } from "@/components/BrandMark";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { RosterTable } from "@/components/RosterTable";
import { TaskTable } from "@/components/TaskTable";
import { FloatingQrPanel } from "@/components/FloatingQrPanel";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { phaseEmoji } from "@/components/PhaseIcon";
import { Footer } from "@/components/Footer";
import { MarkdownTaskImportDialog } from "@/components/MarkdownTaskImportDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sessionUrl, type Room, type RoomTask } from "@/lib/room";
import { badgeColor } from "@/lib/badge-colors";
import { canToggleFruitEnabled, enabledFruitIds, toggleDisabledFruit } from "@/lib/group-fruits";
import { resolveGroupSet } from "@/lib/host-groups";
import { addTag, removeTag } from "@/lib/room-tags";
import { colorForLabel } from "@/lib/badge-colors";
import { SIGNAL_LABEL } from "@/lib/signal-styles";
import { cn } from "@/lib/utils";
import { useRoom, useRoomTasks } from "@/hooks/use-room";
import { useHostGroupNames } from "@/hooks/use-host-group-names";
import {
  useRoomPresenceChannel,
  summarizeSignals,
  broadcastAnnouncement,
} from "@/lib/room-presence";
import { flattenTaskTree, subtaskProgress } from "@/lib/task-tree";
import type { ParsedTask } from "@/lib/markdown-tasks";
import {
  buildExtend,
  buildPause,
  buildReset,
  buildResume,
  buildStartBreak,
  buildStartFocus,
  clampAutoRestarts,
  clampMinutes,
  completedPomodoros,
  MINUTES_STEP,
  nextAutoAdvanceOutcome,
  phaseLabel,
  shouldAutoAdvance,
  transportAction,
  useRoomTimerDisplay,
} from "@/lib/timer";

// How much "Need 2 min" actually gets you when the host taps it.
const EXTEND_SECONDS = 120;

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  head: () => ({
    meta: [{ title: "Room · Feedblick Pomodoro" }],
  }),
  component: RoomControl,
});

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
  const { user } = Route.useRouteContext();
  const { room, loading } = useRoom(roomId);
  const { tasks } = useRoomTasks(roomId);
  const { channel, students } = useRoomPresenceChannel(room?.code);
  const { groups: hostGroupNames } = useHostGroupNames(user.id);
  const [newTask, setNewTask] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceText, setAnnounceText] = useState("");
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
  const [subtaskText, setSubtaskText] = useState("");
  const [newTag, setNewTag] = useState("");

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

  // Deliberately keyed on `room?.id`, not `room` itself — resyncing the input from every
  // realtime update of the row (e.g. the timer ticking) would blow away whatever the teacher
  // is mid-typing; only a genuine room switch should reset it.
  useEffect(() => {
    if (room) setNameInput(room.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  const updateRoom = async (patch: Partial<Room>) => {
    if (!room) return;
    const { error } = await supabase.from("rooms").update(patch).eq("id", room.id);
    if (error) toast.error(error.message);
  };

  // "When a break ends, the timer doesn't reset to a second pomodoro" — it was never supposed
  // to on its own; every phase change was manual-click-only. Auto-advances focus->break and
  // break->focus the instant a running countdown reaches zero, reusing the room's current
  // focus/break length settings. Only runs while actually counting down (isRunning) — a timer
  // sitting paused at 0 (which can't happen, since pausing captures whatever was left, but
  // defensively) or idle never triggers this. Capped at `max_auto_restarts` firings
  // (nextAutoAdvanceOutcome, timer.ts) — "auto-restart only 2 times" — past that it freezes the
  // timer at 0 instead of continuing forever, and toasts the host since a missed "cycles
  // complete" notice is worse than one that lingers (same reasoning as the stuck-signal toast).
  const prevRemainingRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevRemainingRef.current;
    prevRemainingRef.current = timer.remainingSeconds;
    if (!room || !shouldAutoAdvance(prev, timer.remainingSeconds, timer.isRunning)) return;
    const outcome = nextAutoAdvanceOutcome(room);
    if (outcome.kind === "advance") {
      updateRoom({ ...outcome.patch, auto_restarts_used: outcome.autoRestartsUsed });
    } else if (outcome.kind === "capped") {
      updateRoom(outcome.patch);
      toast.info("Pomodoro cycles complete — start the next one manually when you're ready.", {
        duration: Infinity,
        closeButton: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.remainingSeconds, timer.isRunning, room]);

  // A toast the instant someone signals "stuck" — a missed stuck signal is worse than a toast
  // that lingers, so this stays until dismissed (duration: Infinity + closeButton), same
  // reasoning feedblick-stars uses for its own low-rating alert toast. Tracked by presenceKey,
  // not just "is anyone stuck" — otherwise a second student going stuck while the first is
  // already stuck would never re-fire, and a student toggling stuck→done→stuck again should.
  const previouslyStuck = useRef<Set<string>>(new Set());
  useEffect(() => {
    const nowStuck = new Set(
      students.filter((s) => s.signal === "stuck").map((s) => s.presenceKey),
    );
    for (const key of nowStuck) {
      if (!previouslyStuck.current.has(key)) {
        const student = students.find((s) => s.presenceKey === key);
        toast.warning(`${student?.name ?? "A participant"} is stuck`, {
          icon: <AlertTriangle className="size-4" />,
          duration: Infinity,
          closeButton: true,
        });
      }
    }
    previouslyStuck.current = nowStuck;
  }, [students]);

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const signalCounts = summarizeSignals(students);

  const taskRows = flattenTaskTree(tasks);
  const topLevelNumbers = new Map<string, number>();
  {
    let n = 0;
    for (const row of taskRows) if (row.depth === 0) topLevelNumbers.set(row.task.id, ++n);
  }

  // The default-preserving path: a host with no custom groups sees exactly the 8 fruits.
  const groupOptions = resolveGroupSet(hostGroupNames);
  const activeGroupIds = enabledFruitIds(
    room.disabled_fruits,
    groupOptions.map((g) => g.id),
  );
  const activeGroupOptions = groupOptions.filter((g) => activeGroupIds.includes(g.id));

  // One cassette-style transport button does start/pause/resume — transportAction (timer.ts)
  // decides which of the three it means right now; this just dispatches to the matching update.
  const action = transportAction(timer);
  const onPlayPause = () => {
    if (action === "start") {
      updateRoom({
        ...buildStartFocus(room.focus_minutes, room.timer_phase === "idle" ? 1 : room.timer_round),
        // A fresh start from idle also resets the auto-restart budget — this is a new session,
        // not a continuation of whatever cycles already ran before Reset was clicked.
        ...(room.timer_phase === "idle" ? { auto_restarts_used: 0 } : {}),
      });
    } else {
      updateRoom(action === "pause" ? buildPause(room) : buildResume(room));
    }
  };
  const onReset = () => updateRoom({ ...buildReset(), auto_restarts_used: 0 });
  const onSkipToBreak = () => updateRoom(buildStartBreak(room.timer_round, room.break_minutes));

  // Gives "Need 2 min" a real consequence instead of just sitting there as a count — tapping the
  // meter adds real time to whatever's currently running/paused. buildExtend (timer.ts) returns
  // null for idle, so there's nothing to do (and nothing to click) before a phase has started.
  const onAddTwoMinutes = () => {
    const patch = buildExtend(room, EXTEND_SECONDS);
    if (!patch) return;
    updateRoom(patch);
    toast.success("Added 2 minutes.");
  };

  const playPauseLabel = action === "pause" ? "Pause" : action === "resume" ? "Resume" : "Start";

  const onEndRoom = async () => {
    const { error } = await supabase.from("rooms").update({ status: "ended" }).eq("id", room.id);
    if (error) toast.error(error.message);
    else toast.success("Room ended — participants can no longer join.");
  };

  // A one-way loudspeaker message, not chat — "Lunch time at 12:30pm in Room 356" rather than
  // a back-and-forth thread. Only whoever's connected right now sees it (broadcastAnnouncement,
  // room-presence.ts); nothing is stored, so a host re-sends it if someone joins late.
  const onSendAnnouncement = () => {
    const text = announceText.trim();
    if (!text) return;
    broadcastAnnouncement(channel, text);
    toast.success("Announcement sent.");
    setAnnounceText("");
    setAnnounceOpen(false);
  };

  // "Reduce the number of groups in a session" — refuses to disable the last one standing
  // (canToggleFruitEnabled, group-fruits.ts) rather than leaving nobody able to pick a group.
  const onToggleFruitEnabled = (groupId: string) => {
    if (!canToggleFruitEnabled(room.disabled_fruits, groupId, groupOptions.length)) return;
    updateRoom({ disabled_fruits: toggleDisabledFruit(room.disabled_fruits, groupId) });
  };

  // Freeform tags for grouping/searching rooms on the dashboard — no tree/hierarchy, just a
  // flat list of labels (room-tags.ts).
  const onAddTag = () => {
    const next = addTag(room.tags, newTag);
    if (next !== room.tags) updateRoom({ tags: next });
    setNewTag("");
  };
  const onRemoveTag = (tag: string) => updateRoom({ tags: removeTag(room.tags, tag) });

  const topLevelTasks = tasks.filter((t) => !t.parent_id);

  const onAddTask = async () => {
    const text = newTask.trim();
    if (!text) return;
    const { error } = await supabase
      .from("room_tasks")
      .insert({ room_id: room.id, text, position: topLevelTasks.length });
    if (error) toast.error(error.message);
    else setNewTask("");
  };

  const onDeleteTask = async (id: string) => {
    const { error } = await supabase.from("room_tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  // Subtasks are creatable directly — not only via markdown import — so this is a standalone
  // way to build the same task/subtask structure by hand.
  const onAddSubtask = async (parentId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const siblingCount = tasks.filter((t) => t.parent_id === parentId).length;
    const { error } = await supabase
      .from("room_tasks")
      .insert({ room_id: room.id, text: trimmed, parent_id: parentId, position: siblingCount });
    if (error) toast.error(error.message);
  };

  // Host-only (see the migration's own comment) — assigning a whole task cluster to a group is
  // a planning decision, not something a participant initiates the way claiming is.
  const onAssignGroup = async (taskId: string, groupId: string | null) => {
    const { error } = await supabase
      .from("room_tasks")
      .update({ assigned_group: groupId })
      .eq("id", taskId);
    if (error) toast.error(error.message);
  };

  const onReorderTasks = async (patches: Array<{ id: string; position: number }>) => {
    const results = await Promise.all(
      patches.map((p) =>
        supabase.from("room_tasks").update({ position: p.position }).eq("id", p.id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) toast.error(failed.error.message);
  };

  // Client-generates ids for the parent rows so the child insert can reference them without a
  // round trip in between — one batch insert for parents, then one for children. No transaction:
  // a rare failure between the two leaves a visible, retriable partial state (parents with no
  // children yet), not silent corruption.
  const onImportTasks = async (parsed: ParsedTask[]) => {
    const parentRows = parsed.map((p, i) => ({
      id: crypto.randomUUID(),
      room_id: room.id,
      text: p.text,
      position: topLevelTasks.length + i,
    }));
    const { error: parentErr } = await supabase.from("room_tasks").insert(parentRows);
    if (parentErr) {
      toast.error(parentErr.message);
      return;
    }
    const childRows = parsed.flatMap((p, i) =>
      p.subtasks.map((text, j) => ({
        room_id: room.id,
        text,
        parent_id: parentRows[i].id,
        position: j,
      })),
    );
    if (childRows.length > 0) {
      const { error: childErr } = await supabase.from("room_tasks").insert(childRows);
      if (childErr) toast.error(childErr.message);
    }
    toast.success(`Imported ${parentRows.length} task${parentRows.length === 1 ? "" : "s"}.`);
  };

  return (
    <div className="relative isolate min-h-screen bg-background">
      <BackgroundGlow />
      <Toaster />
      {room.status === "active" && (
        <FloatingQrPanel
          url={sessionUrl(room.code)}
          onOpenDisplay={() => openDisplayWindow(`${window.location.origin}/display/${room.code}`)}
        />
      )}
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
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => updateRoom({ name: nameInput.trim() })}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              placeholder="Untitled room"
              className="h-8 w-40 text-sm"
            />
            <span className="font-mono text-lg tracking-widest">{room.code}</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Edit tags"
                  title={room.tags.length > 0 ? room.tags.join(", ") : "Add tags"}
                  className="relative"
                >
                  <Tag className="size-4" />
                  {room.tags.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {room.tags.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 space-y-2">
                <p className="text-sm font-medium">Tags</p>
                <p className="text-xs text-muted-foreground">
                  Group or search for related rooms from the dashboard.
                </p>
                {room.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {room.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                          colorForLabel(tag).idle,
                        )}
                      >
                        {tag}
                        <button
                          onClick={() => onRemoveTag(tag)}
                          aria-label={`Remove tag ${tag}`}
                          className="hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onAddTag()}
                    placeholder="Add a tag…"
                    className="h-8"
                  />
                  <Button size="icon" variant="outline" className="size-8" onClick={onAddTag}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {room.status === "active" && (
              <Dialog open={announceOpen} onOpenChange={setAnnounceOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Send an announcement"
                    title="Send an announcement"
                  >
                    <Megaphone className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send an announcement</DialogTitle>
                    <DialogDescription>
                      A one-time message to everyone currently in the room — not a chat, and nothing
                      is saved.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    value={announceText}
                    onChange={(e) => setAnnounceText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSendAnnouncement()}
                    placeholder="Lunch time at 12:30pm in Room 356"
                    maxLength={200}
                  />
                  <DialogFooter>
                    <Button onClick={onSendAnnouncement} disabled={!announceText.trim()}>
                      Send
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
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
                <NumberStepper
                  icon={<span className="text-lg">{phaseEmoji("focus")}</span>}
                  label="Focus"
                  value={room.focus_minutes}
                  step={MINUTES_STEP}
                  clamp={clampMinutes}
                  suffix=" min"
                  onChange={(m) => updateRoom({ focus_minutes: m })}
                />
                <NumberStepper
                  icon={<span className="text-lg">{phaseEmoji("break")}</span>}
                  label="Break"
                  value={room.break_minutes}
                  step={MINUTES_STEP}
                  clamp={clampMinutes}
                  suffix=" min"
                  onChange={(m) => updateRoom({ break_minutes: m })}
                />
                <NumberStepper
                  icon={<Repeat className="size-3.5 text-muted-foreground" />}
                  label="Auto-restart limit"
                  value={room.max_auto_restarts}
                  step={1}
                  clamp={clampAutoRestarts}
                  suffix="x"
                  onChange={(n) => updateRoom({ max_auto_restarts: n })}
                />
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    className="size-11"
                    onClick={onPlayPause}
                    aria-label={playPauseLabel}
                    title={playPauseLabel}
                  >
                    {action === "pause" ? (
                      <Pause className="size-5" />
                    ) : (
                      <Play className="size-5" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-11"
                    onClick={onReset}
                    aria-label="Reset"
                    title="Reset"
                  >
                    <Square className="size-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-11"
                    onClick={onSkipToBreak}
                    aria-label="Skip to break"
                    title="Skip to break"
                  >
                    <FastForward className="size-5" />
                  </Button>
                </div>
              </div>
              <TimerWheel
                remainingSeconds={timer.remainingSeconds}
                totalSeconds={timer.totalSeconds}
                label={phaseLabel(timer)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base">To-do list</CardTitle>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Claiming
                <Switch
                  checked={room.claiming_enabled}
                  onCheckedChange={(checked) => updateRoom({ claiming_enabled: checked })}
                />
              </label>
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
                <MarkdownTaskImportDialog onImport={onImportTasks} />
              </div>
              <TaskTable
                rows={taskRows}
                reorder={{ onReorder: onReorderTasks }}
                renderText={(row, i) => {
                  const isParent = row.children.length > 0;
                  const progress = isParent ? subtaskProgress(row.children) : null;
                  return (
                    <div>
                      <span>
                        {row.depth === 0 ? `${topLevelNumbers.get(row.task.id)}. ` : ""}
                        {row.task.text}
                      </span>
                      {progress && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {progress.done}/{progress.total} done
                        </span>
                      )}
                      {room.claiming_enabled && !isParent && row.task.claimed_by && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {row.task.completed ? "✓ Done" : "Doing"} — {row.task.claimed_by}
                        </span>
                      )}
                      {addingSubtaskFor === row.task.id && (
                        <div className="mt-1 flex items-center gap-1">
                          <Input
                            autoFocus
                            value={subtaskText}
                            onChange={(e) => setSubtaskText(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key !== "Enter") return;
                              await onAddSubtask(row.task.id, subtaskText);
                              setSubtaskText("");
                              setAddingSubtaskFor(null);
                            }}
                            onBlur={() => setAddingSubtaskFor(null)}
                            placeholder="Subtask…"
                            className="h-7 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  );
                }}
                renderAction={(row) => (
                  <div className="flex items-center gap-1">
                    {row.depth === 0 && (
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setAddingSubtaskFor(row.task.id);
                          setSubtaskText("");
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        title="Add subtask"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    )}
                    {row.children.length > 0 && (
                      <Select
                        value={row.task.assigned_group ?? "unassigned"}
                        onValueChange={(v) =>
                          onAssignGroup(row.task.id, v === "unassigned" ? null : v)
                        }
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {activeGroupOptions.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.emoji ? `${g.emoji} ` : ""}
                              {g.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <button
                      onClick={() => onDeleteTask(row.task.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live counts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <CountBadge
                icon={<Users className="size-4 text-muted-foreground" />}
                label="In room"
                count={signalCounts.total}
              />
              <SignalMeter
                kind="done"
                count={signalCounts.done}
                total={signalCounts.total}
                label={SIGNAL_LABEL.done}
              />
              <SignalMeter
                kind="stuck"
                count={signalCounts.stuck}
                total={signalCounts.total}
                label={SIGNAL_LABEL.stuck}
              />
              <button
                onClick={onAddTwoMinutes}
                disabled={timer.phase === "idle"}
                className="rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Add 2 minutes to the timer"
                title="Add 2 minutes to the timer"
              >
                <SignalMeter
                  kind="need2min"
                  count={signalCounts.need2min}
                  total={signalCounts.total}
                  label={SIGNAL_LABEL.need2min}
                />
              </button>
              <CountBadge
                icon={
                  <span className="text-base leading-none" aria-hidden="true">
                    🍅
                  </span>
                }
                label="Pomodoros"
                count={completedPomodoros(room.timer_round)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base">Participants &amp; groups</CardTitle>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Auto-assign groups
              <Switch
                checked={room.auto_assign_groups}
                onCheckedChange={(checked) => updateRoom({ auto_assign_groups: checked })}
              />
            </label>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {groupOptions.map((group, i) => {
                const isEnabled = !room.disabled_fruits.includes(group.id);
                const color = badgeColor(i);
                return (
                  <button
                    key={group.id}
                    onClick={() => onToggleFruitEnabled(group.id)}
                    title={
                      isEnabled ? "Click to remove this group" : "Click to bring this group back"
                    }
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                      isEnabled
                        ? color.active
                        : "border-muted-foreground/20 text-muted-foreground opacity-50 grayscale",
                    )}
                  >
                    {group.emoji && <span aria-hidden="true">{group.emoji}</span>} {group.label}
                  </button>
                );
              })}
            </div>
            <RosterTable students={students} showSignal />
          </CardContent>
        </Card>
      </main>
      <Footer variant="minimal" />
    </div>
  );
}

// Generalized from a Focus/Break-only "MinutesStepper" once the auto-restart limit needed the
// same -/+ control shape with a different unit, step, and clamp range.
function NumberStepper({
  icon,
  label,
  value,
  step,
  clamp,
  suffix,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  step: number;
  clamp: (n: number) => number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2" role="group" aria-label={label}>
      <span className="flex w-12 items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      <Button
        size="icon"
        variant="outline"
        className="size-8"
        onClick={() => onChange(clamp(value - step))}
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="w-16 text-center text-sm font-medium tabular-nums">
        {value}
        {suffix}
      </span>
      <Button
        size="icon"
        variant="outline"
        className="size-8"
        onClick={() => onChange(clamp(value + step))}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}
