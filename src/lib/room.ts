import type { Tables } from "@/integrations/supabase/types";

export type Room = Tables<"rooms">;
export type RoomTask = Tables<"room_tasks">;

// How long a freshly-created room's join code is valid for. The teacher can keep running the
// room past this — it only stops new students from joining — and there's currently no UI to
// extend it once set; recreate the room if a longer window turns out to be needed.
export const ROOM_CODE_TTL_MINUTES = 60;

export function sessionUrl(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/session/${code}`;
}
