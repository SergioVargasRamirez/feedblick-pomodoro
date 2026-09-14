import type { Room } from "@/lib/room";

// Adding a tag trims and dedupes case-insensitively (so "Math" and "math" don't both end up in
// the list) while preserving whatever casing the host actually typed for display.
export function addTag(tags: string[], tag: string): string[] {
  const trimmed = tag.trim();
  if (!trimmed) return tags;
  if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return tags;
  return [...tags, trimmed];
}

export function removeTag(tags: string[], tag: string): string[] {
  return tags.filter((t) => t !== tag);
}

// Every distinct tag across a host's rooms, sorted, for a filter-chip bar — "group them... or
// search for all related rooms" without any tree/hierarchy, just a flat set of labels.
export function allTags(rooms: Array<{ tags: string[] }>): string[] {
  const set = new Set<string>();
  for (const room of rooms) for (const tag of room.tags) set.add(tag);
  return [...set].sort((a, b) => a.localeCompare(b));
}

// Backs the dashboard's search box: matches on the room's name, its join code, or any of its
// tags (case-insensitive substring on name/code, exact case-insensitive match on tags — a tag
// is a discrete label, not free text, so a substring match there would surface confusing partial
// hits). A blank query matches everything.
export function filterRoomsByQuery<T extends Pick<Room, "name" | "code" | "tags">>(
  rooms: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rooms;
  return rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase() === q),
  );
}

// Backs the filter-chip bar's active-tag toggle: null means "no filter," any other value shows
// only rooms carrying that exact tag.
export function filterRoomsByTag<T extends Pick<Room, "tags">>(
  rooms: T[],
  activeTag: string | null,
): T[] {
  if (!activeTag) return rooms;
  return rooms.filter((r) => r.tags.includes(activeTag));
}
