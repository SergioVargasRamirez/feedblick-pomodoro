import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Pencil, Megaphone } from "lucide-react";
import { TimerWheel } from "@/components/TimerWheel";
import { BrandMark } from "@/components/BrandMark";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RosterTable } from "@/components/RosterTable";
import { TaskTable } from "@/components/TaskTable";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { badgeColor } from "@/lib/badge-colors";
import { GROUP_FRUITS, enabledFruitIds } from "@/lib/group-fruits";
import { SIGNAL_LABEL, SIGNAL_STYLES } from "@/lib/signal-styles";
import type { RoomTask } from "@/lib/room";
import { useRoomByCode, useRoomTasks } from "@/hooks/use-room";
import {
  useRoomPresenceChannel,
  trackPresence,
  pickAutoAssignFruit,
  type SignalKind,
  type StudentPresence,
} from "@/lib/room-presence";
import { canSignalDone, nextClaimedBy } from "@/lib/task-claim";
import { phaseLabel, useRoomTimerDisplay } from "@/lib/timer";

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

const SIGNALS: SignalKind[] = ["done", "stuck", "need2min"];

function nameStorageKey(roomCode: string): string {
  return `feedblick-pomodoro-name-${roomCode}`;
}

function SessionView() {
  const { code } = Route.useParams();
  const { room, loading, notFound } = useRoomByCode(code);
  const { tasks } = useRoomTasks(room?.id);
  const { channel, students, synced, announcement } = useRoomPresenceChannel(
    room?.status === "active" ? room.code : undefined,
  );
  const timer = useRoomTimerDisplay(room ?? IDLE_TIMER);

  const [name, setName] = useState("");
  const [nameLocked, setNameLocked] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [self, setSelf] = useState<Pick<StudentPresence, "fruit" | "signal">>({
    fruit: null,
    signal: null,
  });

  // Only a locked name counts as "identified" — this is deliberately NOT the raw `name` state,
  // which changes on every keystroke. Gating presence tracking (and everything downstream of
  // it: the roster, auto-assign, claiming) on the lock instead of a typing-debounce means a
  // student appears in the shared list exactly when they press Enter or blur the field, never a
  // fraction of a second after they merely stop typing.
  const identifiedName = nameLocked ? name.trim() : "";

  // A returning student (same tab, reloaded) keeps whatever they typed before — and it was
  // already locked once (that's the only way it got into sessionStorage), so restore the lock
  // too. Missing this was a real bug: a reload brought the name back but left the field
  // editable, which read as "the field keeps getting active on its own."
  useEffect(() => {
    if (!code) return;
    const stored = sessionStorage.getItem(nameStorageKey(code));
    if (stored) {
      setName(stored);
      setNameLocked(true);
    }
  }, [code]);

  const onNameChange = (value: string) => {
    setName(value);
    if (code) sessionStorage.setItem(nameStorageKey(code), value);
  };

  // Freezes the field once a name is in it — "only allow edits upon button click" — so it can't
  // be accidentally cleared or half-edited by a stray tap later in the room.
  const lockName = () => {
    if (name.trim()) setNameLocked(true);
  };

  // A student with no identified name yet isn't tracked at all — they simply don't show up in
  // the shared list until they've locked one in. Badge/signal taps re-announce immediately.
  useEffect(() => {
    if (!channel || !identifiedName) return;
    trackPresence(channel, { name: identifiedName, ...self });
  }, [channel, identifiedName, self]);

  // A loudspeaker message from the host — shown until dismissed (same reasoning as the host
  // panel's own stuck-signal toast: a missed announcement is worse than one that lingers).
  useEffect(() => {
    if (!announcement) return;
    toast.info(announcement.text, {
      icon: <Megaphone className="size-4" />,
      duration: Infinity,
      closeButton: true,
    });
  }, [announcement]);

  // When the host has auto-assign on, a student who's identified themselves but has no group
  // yet gets one picked for them instead of using the manual picker. Only considers groups the
  // host hasn't disabled ("reduce the number of groups in a session"). Self-limiting: once
  // self.fruit is set, this condition is false on every future run, so it can't re-fire or
  // fight a student who picks manually right after (auto-assign only applies to fruit === null).
  const activeFruitIds = enabledFruitIds(room?.disabled_fruits ?? []);
  useEffect(() => {
    if (!room?.auto_assign_groups || !identifiedName || self.fruit || !synced) return;
    const fruit = pickAutoAssignFruit(students, activeFruitIds);
    setSelf((prev) => ({ ...prev, fruit }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.auto_assign_groups, identifiedName, self.fruit, synced, students]);

  const onClaimTask = async (task: RoomTask) => {
    if (!identifiedName) return;
    const { error } = await supabase
      .from("room_tasks")
      .update({ claimed_by: nextClaimedBy(task.claimed_by, identifiedName) })
      .eq("id", task.id);
    if (error) toast.error(error.message);
  };

  // Only reachable for a task YOU claimed — see the checkbox branch in the render below.
  // Writing this to Postgres (not local state) is the point: once a task has an owner,
  // "completed" is a fact about the task itself, and everyone else should see it change.
  const onToggleCompleted = async (task: RoomTask) => {
    const { error } = await supabase
      .from("room_tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id);
    if (error) toast.error(error.message);
  };

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
          This room code isn't active. Ask the host for a new one.
        </p>
      </div>
    );
  }

  // With claiming turned off, every task behaves like it's always unclaimed — ignoring any
  // `claimed_by`/`completed` left over from before the host flipped the switch, rather than
  // needing to clear that data out.
  const tasksForClaiming = room.claiming_enabled
    ? tasks
    : tasks.map((t) => ({ ...t, claimed_by: null, completed: false }));

  return (
    <div className="relative isolate min-h-screen bg-background px-4 py-6 space-y-6 max-w-3xl mx-auto">
      <BackgroundGlow />
      <Toaster />
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
              label={phaseLabel(timer)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskTable
              tasks={tasksForClaiming}
              renderText={(t, i) => {
                const isDone = t.claimed_by ? t.completed : checked.has(t.id);
                return (
                  <label
                    htmlFor={`task-${t.id}`}
                    className={cn(isDone && "line-through text-muted-foreground")}
                  >
                    {i + 1}. {t.text}
                  </label>
                );
              }}
              renderAction={(t) => {
                const isMine = t.claimed_by === identifiedName;
                const isSomeoneElses = !!t.claimed_by && !isMine;
                return (
                  <div className="flex items-center gap-1.5">
                    {room.claiming_enabled && (
                      <button
                        onClick={() => onClaimTask(t)}
                        disabled={!identifiedName}
                        title={
                          isMine
                            ? "Release this task"
                            : t.claimed_by
                              ? `Claimed by ${t.claimed_by} — tap to claim it yourself`
                              : "Claim this task"
                        }
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                          isMine
                            ? "border-primary bg-primary/10 text-primary"
                            : t.claimed_by
                              ? "border-transparent bg-muted text-muted-foreground"
                              : "border-muted-foreground/30 text-muted-foreground hover:border-foreground hover:text-foreground",
                        )}
                      >
                        {t.claimed_by ?? "Claim"}
                      </button>
                    )}
                    {/* Once someone else has claimed this task, only they can mark it complete
                        — hiding the checkbox instead of a real permission check, since
                        participants have no verifiable identity to enforce one against. */}
                    {!isSomeoneElses && (
                      <Checkbox
                        checked={t.claimed_by ? t.completed : checked.has(t.id)}
                        onCheckedChange={() =>
                          t.claimed_by ? onToggleCompleted(t) : toggleTask(t.id)
                        }
                        id={`task-${t.id}`}
                      />
                    )}
                  </div>
                );
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">How's it going?</p>
        <div className="grid grid-cols-3 gap-2">
          {SIGNALS.map((kind) => {
            // "Done" means all of it — a task someone else claimed isn't your responsibility,
            // but an unclaimed task (your checkbox) or one you claimed yourself (the shared
            // completed flag) both have to be cleared first. canSignalDone (task-claim.ts).
            const disabled =
              kind === "done" && !canSignalDone(tasksForClaiming, checked, identifiedName);
            return (
              <button
                key={kind}
                onClick={() => toggleSignal(kind)}
                disabled={disabled}
                title={disabled ? "Finish all your tasks first" : undefined}
                className={cn(
                  "rounded-full border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  self.signal === kind ? SIGNAL_STYLES[kind].active : SIGNAL_STYLES[kind].idle,
                )}
              >
                {SIGNAL_LABEL[kind]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">You</p>
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={lockName}
            onKeyDown={(e) => e.key === "Enter" && lockName()}
            disabled={nameLocked}
            placeholder="Your name, a nickname, whatever you like"
            maxLength={40}
          />
          {nameLocked && (
            <Button size="icon" variant="outline" onClick={() => setNameLocked(false)}>
              <Pencil className="size-4" />
            </Button>
          )}
        </div>
        {room.auto_assign_groups ? (
          <p className="pt-1 text-sm text-muted-foreground">
            {self.fruit ? (
              <>
                Your group:{" "}
                <span aria-hidden="true">
                  {GROUP_FRUITS.find((f) => f.id === self.fruit)?.emoji}
                </span>{" "}
                {GROUP_FRUITS.find((f) => f.id === self.fruit)?.label}
              </>
            ) : (
              "Waiting to be assigned a group…"
            )}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {GROUP_FRUITS.map((fruit, i) => {
              // Index into the FULL list, not the filtered one — badgeColor keys off each
              // fruit's fixed position so its color never shifts just because the host
              // disabled some other group ahead of it.
              if (!activeFruitIds.includes(fruit.id)) return null;
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
        )}
        {!synced && <p className="text-xs text-muted-foreground">Connecting…</p>}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">In this room</p>
        <RosterTable students={students} />
      </div>

      <Footer variant="minimal" />
    </div>
  );
}
