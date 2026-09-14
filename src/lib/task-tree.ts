import type { RoomTask } from "@/lib/room";

// The display order for a (deliberately shallow — one level only, see markdown-tasks.ts and
// CLAUDE.md's Known Gaps) task tree: each top-level task in its own position order, immediately
// followed by its own children in their position order. TaskTable stays tree-logic-free by
// rendering this flat, pre-computed list rather than walking `tasks` itself.
export type FlatTaskRow = { task: RoomTask; depth: 0 | 1; children: RoomTask[] };

export function flattenTaskTree(tasks: RoomTask[]): FlatTaskRow[] {
  const byParent = new Map<string, RoomTask[]>();
  for (const t of tasks) {
    if (!t.parent_id) continue;
    const siblings = byParent.get(t.parent_id) ?? [];
    siblings.push(t);
    byParent.set(t.parent_id, siblings);
  }
  for (const siblings of byParent.values()) siblings.sort((a, b) => a.position - b.position);

  // A task counts as top-level either because parent_id is genuinely null, or because it points
  // at an id that isn't actually present in `tasks` (a dangling reference — shouldn't happen in
  // practice, but falling back to top-level keeps a task visible rather than silently dropping
  // it if it ever does).
  const knownIds = new Set(tasks.map((t) => t.id));
  const topLevel = tasks
    .filter((t) => !t.parent_id || !knownIds.has(t.parent_id))
    .sort((a, b) => a.position - b.position);

  const rows: FlatTaskRow[] = [];
  for (const parent of topLevel) {
    const children = byParent.get(parent.id) ?? [];
    rows.push({ task: parent, depth: 0, children });
    for (const child of children) {
      rows.push({ task: child, depth: 1, children: [] });
    }
  }
  return rows;
}

// "Hide the subtasks" — a purely local, ephemeral display preference (never synced, not a DB
// column), so a parent's children are simply skipped from the rendered rows while its own row
// stays put with its normal children/progress data intact (collapsing never affects numbering,
// drag-and-drop sibling groups, or anything else that reads the full `rows` array — only what
// TaskTable actually iterates to render).
export function visibleTaskRows(
  rows: FlatTaskRow[],
  collapsedParentIds: Set<string>,
): FlatTaskRow[] {
  return rows.filter((r) => r.depth === 0 || !collapsedParentIds.has(r.task.parent_id ?? ""));
}

export function subtaskProgress(children: Array<{ completed: boolean }>): {
  done: number;
  total: number;
} {
  return { done: children.filter((c) => c.completed).length, total: children.length };
}

// Drag-and-drop reordering is scoped to one sibling group at a time (top-level tasks reorder
// among themselves; a parent's subtasks reorder among themselves) — dragging across groups is
// rejected (null) rather than re-parenting or promoting/demoting a task, which is out of scope
// for v1. Returning null lets the caller simply not write anything; the dragged row visually
// snaps back on the next render since the real (Postgres) order never changed.
export function reorderSiblings(
  rows: FlatTaskRow[],
  activeId: string,
  overId: string,
): Array<{ id: string; position: number }> | null {
  if (activeId === overId) return null;
  const active = rows.find((r) => r.task.id === activeId);
  const over = rows.find((r) => r.task.id === overId);
  if (!active || !over) return null;
  if (active.task.parent_id !== over.task.parent_id) return null;

  const group = rows.filter((r) => r.task.parent_id === active.task.parent_id);
  const fromIndex = group.findIndex((r) => r.task.id === activeId);
  const toIndex = group.findIndex((r) => r.task.id === overId);
  const reordered = [...group];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return reordered.map((r, i) => ({ id: r.task.id, position: i }));
}
