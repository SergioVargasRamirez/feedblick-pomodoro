import { GROUP_FRUITS } from "@/lib/group-fruits";
import type { HostGroupName } from "@/lib/room";

export type GroupOption = { id: string; label: string; emoji?: string };

// The default-preserving path: a host who's never touched the group-names setting sees exactly
// the 8 fruits, unchanged. Once they've saved any custom names, those fully replace the fruits
// (plain colored pills, no emoji) for every room that host runs.
export function resolveGroupSet(customGroups: HostGroupName[]): GroupOption[] {
  if (customGroups.length === 0) {
    return GROUP_FRUITS.map((f) => ({ id: f.id, label: f.label, emoji: f.emoji }));
  }
  return [...customGroups]
    .sort((a, b) => a.position - b.position)
    .map((g) => ({ id: g.id, label: g.label }));
}

// Backs the group-names editor's move-up/move-down buttons (not drag-and-drop — see CLAUDE.md:
// this is a desktop settings page edited out-of-band, not a live in-room control, so the
// "buttons, not DnD, for a short list" reasoning already used for the sibling table_labels
// precedent applies here too). Returns the (at most 2) rows whose position needs writing, or
// null at a boundary.
export function swapPositions(
  groups: Array<{ id: string; position: number }>,
  index: number,
  direction: "up" | "down",
): Array<{ id: string; position: number }> | null {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= groups.length) return null;
  const a = groups[index];
  const b = groups[targetIndex];
  return [
    { id: a.id, position: b.position },
    { id: b.id, position: a.position },
  ];
}
