import type { Tables } from "@/integrations/supabase/types";

export type Room = Tables<"rooms">;
export type RoomTask = Tables<"room_tasks">;

export function sessionUrl(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/session/${code}`;
}
