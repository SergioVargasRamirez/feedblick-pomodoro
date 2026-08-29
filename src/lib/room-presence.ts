import { useEffect, useMemo, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type SignalKind = "done" | "stuck" | "need2min";

export type StudentPresence = {
  name: string;
  // A GROUP_FRUITS id (src/lib/group-fruits.ts), or null before a student has picked one.
  fruit: string | null;
  signal: SignalKind | null;
};

// What the hook below hands back for each connected student — the raw presence payload plus
// the connection's own presence key, since `name` alone isn't guaranteed unique (nothing stops
// two students typing the same name) and callers need a stable React key.
export type PresentStudent = StudentPresence & { presenceKey: string };

// A one-way, ephemeral loudspeaker message from the host — explicitly not chat (no replies, no
// history). Only whoever's connected right now receives it, same "discarded, never in Postgres"
// treatment as everything else student-facing in this room.
export type Announcement = { text: string; sentAt: string };

// One Realtime channel per room code, shared by the room-display, teacher, and student
// screens. Presence — not a DB table — is the source of truth for "who's here, in which
// group, signalling what": a client's entry disappears the instant it disconnects, which is
// exactly the "discarded when the room expires" privacy requirement, with no cleanup job
// needed and no student row ever written to Postgres. The display page reuses this same hook
// purely for its `announcement` field — it never calls trackPresence, so it never shows up in
// `students` either.
export function useRoomPresenceChannel(roomCode: string | undefined) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [presenceState, setPresenceState] = useState<Record<string, StudentPresence[]>>({});
  // False until the first "sync" arrives — before that, presenceState is just empty-by-default,
  // not a real snapshot, and anything gating a decision on "who's already here" (capacity
  // checks) needs to tell the two apart.
  const [synced, setSynced] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    setSynced(false);
    setAnnouncement(null);
    // Keyed by a fresh id per connection, deliberately not by the student's name — nothing
    // stops two students typing the same name, and this key only needs to be unique per
    // browser tab, never shown to anyone.
    const ch = supabase.channel(`room:${roomCode}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });
    ch.on("presence", { event: "sync" }, () => {
      setPresenceState(ch.presenceState<StudentPresence>());
      setSynced(true);
    });
    ch.on("broadcast", { event: "announcement" }, ({ payload }) => {
      setAnnouncement(payload as Announcement);
    });
    ch.subscribe();
    setChannel(ch);
    return () => {
      supabase.removeChannel(ch);
      setChannel(null);
    };
  }, [roomCode]);

  const students = useMemo(
    () =>
      Object.entries(presenceState)
        .filter(([, entries]) => entries[0])
        .map(([presenceKey, entries]) => ({ ...entries[0], presenceKey }) as PresentStudent),
    [presenceState],
  );

  return { channel, students, synced, announcement };
}

export function trackPresence(channel: RealtimeChannel | null, payload: StudentPresence) {
  if (!channel) return;
  channel.track(payload);
}

// Fire-and-forget, no delivery guarantee, no history — the point is a live loudspeaker, not a
// message log. `sentAt` (not just the text) is what lets a listener notice a *repeat* of the
// exact same wording as a genuinely new event, since React state alone wouldn't change identity
// for an unchanged string.
export function broadcastAnnouncement(channel: RealtimeChannel | null, text: string) {
  if (!channel) return;
  const payload: Announcement = { text, sentAt: new Date().toISOString() };
  channel.send({ type: "broadcast", event: "announcement", payload });
}

export type SignalCounts = { total: number; done: number; stuck: number; need2min: number };

export function summarizeSignals(students: StudentPresence[]): SignalCounts {
  const counts: SignalCounts = { total: students.length, done: 0, stuck: 0, need2min: 0 };
  for (const s of students) {
    if (s.signal) counts[s.signal]++;
  }
  return counts;
}

// Per-fruit breakdown — aggregated only, no student name ever surfaces here. Originally built
// for the teacher panel's signal-drill-down (since removed, "we don't need this functionality");
// its `.total` counts are now reused by pickAutoAssignFruit below instead.
export function summarizeByFruit(
  students: StudentPresence[],
  fruitIds: string[],
): Record<string, SignalCounts> {
  const byFruit: Record<string, SignalCounts> = {};
  for (const id of fruitIds) byFruit[id] = { total: 0, done: 0, stuck: 0, need2min: 0 };
  for (const s of students) {
    if (!s.fruit || !byFruit[s.fruit]) continue;
    byFruit[s.fruit].total++;
    if (s.signal) byFruit[s.fruit][s.signal]++;
  }
  return byFruit;
}

// Auto-assign picks the LEAST-populated group, tie-broken randomly — plain per-student
// Math.random() with no coordination between clients would happily pile everyone into whichever
// 2-3 groups got lucky first. `rng` is injectable so the tie-break is deterministic in tests.
export function pickAutoAssignFruit(
  students: StudentPresence[],
  fruitIds: string[],
  rng: () => number = Math.random,
): string {
  const counts = summarizeByFruit(students, fruitIds);
  const minCount = Math.min(...fruitIds.map((id) => counts[id].total));
  const candidates = fruitIds.filter((id) => counts[id].total === minCount);
  return candidates[Math.floor(rng() * candidates.length)];
}
