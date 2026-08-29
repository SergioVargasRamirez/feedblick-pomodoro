import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Room, RoomBadge, RoomTask } from "@/lib/room";

// Teacher-side: fetch by id, RLS lets the owner read regardless of status/expiry.
export function useRoom(roomId: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single()
      .then(({ data }) => {
        if (!active) return;
        setRoom(data);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`room-row-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new as Room),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { room, loading };
}

// Student/display-side: fetch by the join code, only ever finds a row while it's active and
// unexpired (same RLS policy that lets anon read it at all).
export function useRoomByCode(code: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    let active = true;
    supabase
      .from("rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (!data) setNotFound(true);
        else setRoom(data);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code]);

  useEffect(() => {
    if (!room?.id) return;
    const channel = supabase
      .channel(`room-row-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => setRoom(payload.new as Room),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  return { room, loading, notFound };
}

// Shared shape behind useRoomTasks/useRoomBadges below: fetch all rows for a room, refetch
// whenever any insert/update/delete on that table for this room comes through. Refetch-the-set
// rather than patching individual events — both lists are short (a class's worth of tasks or
// badges), so simplicity wins over incremental-update bookkeeping.
function useRoomRows<T>(
  roomId: string | undefined,
  table: "room_tasks" | "room_badges",
  orderBy: string,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!roomId) return;
    supabase
      .from(table)
      .select("*")
      .eq("room_id", roomId)
      .order(orderBy)
      .then(({ data }) => {
        setRows((data ?? []) as T[]);
        setLoading(false);
      });
  }, [roomId, table, orderBy]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`${table}-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `room_id=eq.${roomId}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, table, refetch]);

  return { rows, loading, refetch };
}

export function useRoomTasks(roomId: string | undefined) {
  const { rows, loading } = useRoomRows<RoomTask>(roomId, "room_tasks", "position");
  return { tasks: rows, loading };
}

export function useRoomBadges(roomId: string | undefined) {
  const { rows, loading } = useRoomRows<RoomBadge>(roomId, "room_badges", "created_at");
  return { badges: rows, loading };
}
