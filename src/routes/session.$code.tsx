import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { TimerWheel } from "@/components/TimerWheel";
import { BrandMark } from "@/components/BrandMark";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { badgeColor } from "@/lib/badge-colors";
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
  const { badges } = useRoomBadges(room?.id);
  const { channel, students, synced } = useRoomPresenceChannel(
    room?.status === "active" ? room.code : undefined,
  );
  const timer = useRoomTimerDisplay(room ?? IDLE_TIMER);

  const [name, setName] = useState("");
  const [committedName, setCommittedName] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [self, setSelf] = useState<Pick<StudentPresence, "badgeId" | "signal">>({
    badgeId: null,
    signal: null,
  });
  const [sortBy, setSortBy] = useState<"name" | "group">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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

  const toggleBadge = (id: string) => {
    setSelf((prev) => ({ ...prev, badgeId: prev.badgeId === id ? null : id }));
  };

  const byBadge = summarizeByBadge(
    students,
    badges.map((b) => b.id),
  );

  const toggleSort = (field: "name" | "group") => {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  // Unassigned students always sort to the end, regardless of direction — "no group yet" isn't
  // meaningfully before or after any actual group name.
  const roster = useMemo(() => {
    const withGroup = students.map((s) => {
      const groupIndex = badges.findIndex((b) => b.id === s.badgeId);
      return { ...s, group: groupIndex >= 0 ? badges[groupIndex] : null, groupIndex };
    });
    const sorted = [...withGroup].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (!a.group && !b.group) return 0;
      if (!a.group) return 1;
      if (!b.group) return -1;
      return a.group.name.localeCompare(b.group.name);
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [students, badges, sortBy, sortDir]);

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
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {badges.map((b, i) => {
              const occupied = byBadge[b.id]?.total ?? 0;
              const isSelf = self.badgeId === b.id;
              const isFull = !isSelf && occupied >= b.seats;
              const color = badgeColor(i);
              return (
                <button
                  key={b.id}
                  disabled={isFull}
                  onClick={() => toggleBadge(b.id)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    isFull
                      ? "border-muted text-muted-foreground/50 cursor-not-allowed"
                      : isSelf
                        ? color.active
                        : color.idle,
                  )}
                >
                  {b.name}
                  {b.place ? ` · ${b.place}` : ""} · {occupied}/{b.seats}
                  {isFull ? " · full" : ""}
                </button>
              );
            })}
          </div>
        )}
        {!synced && <p className="text-xs text-muted-foreground">Connecting…</p>}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">In this room</p>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one else here yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton
                    field="name"
                    label="Name"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortButton
                    field="group"
                    label="Group"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((s) => (
                <TableRow key={s.presenceKey}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>
                    {s.group ? (
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          badgeColor(s.groupIndex).idle,
                        )}
                      >
                        {s.group.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function SortButton({
  field,
  label,
  sortBy,
  sortDir,
  onSort,
}: {
  field: "name" | "group";
  label: string;
  sortBy: "name" | "group";
  sortDir: "asc" | "desc";
  onSort: (field: "name" | "group") => void;
}) {
  const active = sortBy === field;
  const Icon = sortDir === "asc" ? ChevronUp : ChevronDown;
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        "flex items-center gap-1 font-medium",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      {active && <Icon className="size-3.5" />}
    </button>
  );
}
