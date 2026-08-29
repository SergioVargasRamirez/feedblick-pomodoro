import { useEffect, useMemo, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type SignalKind = "done" | "stuck" | "need2min";

export type StudentPresence = {
  handle: string;
  badgeId: string | null;
  signal: SignalKind | null;
};

// What the hook below hands back for each connected student — the raw presence payload plus
// the connection's own presence key, since `handle` alone isn't guaranteed unique (two
// students can land on the same fruit+number by chance) and callers need a stable React key.
export type PresentStudent = StudentPresence & { presenceKey: string };

// One Realtime channel per room code, shared by the room-display, teacher, and student
// screens. Presence — not a DB table — is the source of truth for "who's here, in which
// group, signalling what": a client's entry disappears the instant it disconnects, which is
// exactly the "discarded when the room expires" privacy requirement, with no cleanup job
// needed and no student row ever written to Postgres.
export function useRoomPresenceChannel(roomCode: string | undefined) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [presenceState, setPresenceState] = useState<Record<string, StudentPresence[]>>({});
  // False until the first "sync" arrives — before that, presenceState is just empty-by-default,
  // not a real snapshot, and anything gating a decision on "who's already here" (capacity
  // checks, handle assignment) needs to tell the two apart.
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!roomCode) return;
    setSynced(false);
    // Keyed by a fresh id per connection, deliberately not by the handle itself — two
    // students can land on the same fruit+number by chance, and this key only needs to be
    // unique per browser tab, never shown to anyone.
    const ch = supabase.channel(`room:${roomCode}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });
    ch.on("presence", { event: "sync" }, () => {
      setPresenceState(ch.presenceState<StudentPresence>());
      setSynced(true);
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

  return { channel, students, synced };
}

export function trackPresence(channel: RealtimeChannel | null, payload: StudentPresence) {
  if (!channel) return;
  channel.track(payload);
}

export type SignalCounts = { total: number; done: number; stuck: number; need2min: number };

export function summarizeSignals(students: StudentPresence[]): SignalCounts {
  const counts: SignalCounts = { total: students.length, done: 0, stuck: 0, need2min: 0 };
  for (const s of students) {
    if (s.signal) counts[s.signal]++;
  }
  return counts;
}

// Per-badge breakdown for the teacher's "tap a signal tile to see per-group counts" drill-down
// — aggregated only, no handle ever surfaces here.
export function summarizeByBadge(
  students: StudentPresence[],
  badgeIds: string[],
): Record<string, SignalCounts> {
  const byBadge: Record<string, SignalCounts> = {};
  for (const id of badgeIds) byBadge[id] = { total: 0, done: 0, stuck: 0, need2min: 0 };
  for (const s of students) {
    if (!s.badgeId || !byBadge[s.badgeId]) continue;
    byBadge[s.badgeId].total++;
    if (s.signal) byBadge[s.badgeId][s.signal]++;
  }
  return byBadge;
}
