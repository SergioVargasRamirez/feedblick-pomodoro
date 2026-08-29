import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Room, RoomTask } from "@/lib/room";

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

// Fetch a room's tasks, refetching whenever any insert/update/delete on room_tasks for this
// room comes through. Refetch-the-set rather than patching individual events — the list is
// short (a class's worth of tasks), so simplicity wins over incremental-update bookkeeping.
export function useRoomTasks(roomId: string | undefined) {
  const [tasks, setTasks] = useState<RoomTask[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!roomId) return;
    supabase
      .from("room_tasks")
      .select("*")
      .eq("room_id", roomId)
      .order("position")
      .then(({ data }) => {
        setTasks(data ?? []);
        setLoading(false);
      });
  }, [roomId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`room_tasks-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_tasks", filter: `room_id=eq.${roomId}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, refetch]);

  return { tasks, loading };
}
