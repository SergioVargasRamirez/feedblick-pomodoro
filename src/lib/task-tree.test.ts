import { describe, expect, test } from "bun:test";
import {
  flattenTaskTree,
  reorderSiblings,
  subtaskProgress,
  visibleTaskRows,
  type FlatTaskRow,
} from "./task-tree";
import type { RoomTask } from "@/lib/room";

function task(overrides: Partial<RoomTask> & { id: string }): RoomTask {
  return {
    room_id: "room-1",
    text: overrides.id,
    position: 0,
    created_at: "2026-01-01T00:00:00Z",
    claimed_by: null,
    completed: false,
    parent_id: null,
    assigned_group: null,
    ...overrides,
  };
}

describe("flattenTaskTree", () => {
  test("empty list", () => {
    expect(flattenTaskTree([])).toEqual([]);
  });

  test("all top-level, no children — ordered by position", () => {
    const tasks = [task({ id: "b", position: 1 }), task({ id: "a", position: 0 })];
    const rows = flattenTaskTree(tasks);
    expect(rows.map((r) => r.task.id)).toEqual(["a", "b"]);
    expect(rows.every((r) => r.depth === 0 && r.children.length === 0)).toBe(true);
  });

  test("one parent with children — children immediately follow, in their own position order", () => {
    const tasks = [
      task({ id: "parent", position: 0 }),
      task({ id: "child-b", parent_id: "parent", position: 1 }),
      task({ id: "child-a", parent_id: "parent", position: 0 }),
    ];
    const rows = flattenTaskTree(tasks);
    expect(rows.map((r) => r.task.id)).toEqual(["parent", "child-a", "child-b"]);
    expect(rows[0].depth).toBe(0);
    expect(rows[0].children.map((c) => c.id)).toEqual(["child-a", "child-b"]);
    expect(rows[1].depth).toBe(1);
    expect(rows[1].children).toEqual([]);
    expect(rows[2].depth).toBe(1);
  });

  test("multiple parents interleaved with plain flat tasks", () => {
    const tasks = [
      task({ id: "p1", position: 0 }),
      task({ id: "p1-child", parent_id: "p1", position: 0 }),
      task({ id: "flat", position: 1 }),
      task({ id: "p2", position: 2 }),
      task({ id: "p2-child", parent_id: "p2", position: 0 }),
    ];
    const rows = flattenTaskTree(tasks);
    expect(rows.map((r) => r.task.id)).toEqual(["p1", "p1-child", "flat", "p2", "p2-child"]);
  });

  test("a dangling parent_id falls back to top-level rather than disappearing", () => {
    const tasks = [task({ id: "orphan", parent_id: "does-not-exist", position: 0 })];
    const rows = flattenTaskTree(tasks);
    expect(rows.map((r) => r.task.id)).toEqual(["orphan"]);
    expect(rows[0].depth).toBe(0);
  });
});

describe("visibleTaskRows", () => {
  const parent = task({ id: "parent", position: 0 });
  const child1 = task({ id: "c1", parent_id: "parent", position: 0 });
  const child2 = task({ id: "c2", parent_id: "parent", position: 1 });
  const flat = task({ id: "flat", position: 1 });
  const rows = flattenTaskTree([parent, child1, child2, flat]);

  test("with nothing collapsed, every row is visible", () => {
    expect(visibleTaskRows(rows, new Set())).toEqual(rows);
  });

  test("collapsing a parent hides only its own children", () => {
    const visible = visibleTaskRows(rows, new Set(["parent"]));
    expect(visible.map((r) => r.task.id)).toEqual(["parent", "flat"]);
  });

  test("collapsing an id with no children (or an unrelated id) changes nothing", () => {
    expect(visibleTaskRows(rows, new Set(["flat"]))).toEqual(rows);
    expect(visibleTaskRows(rows, new Set(["not-a-real-id"]))).toEqual(rows);
  });
});

describe("subtaskProgress", () => {
  test("empty", () => {
    expect(subtaskProgress([])).toEqual({ done: 0, total: 0 });
  });

  test("none done", () => {
    expect(subtaskProgress([{ completed: false }, { completed: false }])).toEqual({
      done: 0,
      total: 2,
    });
  });

  test("all done", () => {
    expect(subtaskProgress([{ completed: true }, { completed: true }])).toEqual({
      done: 2,
      total: 2,
    });
  });

  test("mixed", () => {
    expect(subtaskProgress([{ completed: true }, { completed: false }])).toEqual({
      done: 1,
      total: 2,
    });
  });
});

describe("reorderSiblings", () => {
  function rowsOf(tasks: RoomTask[]): FlatTaskRow[] {
    return flattenTaskTree(tasks);
  }

  test("reorders within the top-level group", () => {
    const tasks = [
      task({ id: "a", position: 0 }),
      task({ id: "b", position: 1 }),
      task({ id: "c", position: 2 }),
    ];
    const patch = reorderSiblings(rowsOf(tasks), "c", "a");
    expect(patch).toEqual([
      { id: "c", position: 0 },
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ]);
  });

  test("reorders within one parent's children, leaving other siblings untouched", () => {
    const tasks = [
      task({ id: "parent", position: 0 }),
      task({ id: "c1", parent_id: "parent", position: 0 }),
      task({ id: "c2", parent_id: "parent", position: 1 }),
    ];
    const patch = reorderSiblings(rowsOf(tasks), "c2", "c1");
    expect(patch).toEqual([
      { id: "c2", position: 0 },
      { id: "c1", position: 1 },
    ]);
  });

  test("dragging across different sibling groups is rejected", () => {
    const tasks = [
      task({ id: "p1", position: 0 }),
      task({ id: "p1-child", parent_id: "p1", position: 0 }),
      task({ id: "p2", position: 1 }),
    ];
    expect(reorderSiblings(rowsOf(tasks), "p1-child", "p2")).toBeNull();
  });

  test("dropping on yourself is a no-op", () => {
    const tasks = [task({ id: "a", position: 0 }), task({ id: "b", position: 1 })];
    expect(reorderSiblings(rowsOf(tasks), "a", "a")).toBeNull();
  });

  test("an unknown id is rejected", () => {
    const tasks = [task({ id: "a", position: 0 })];
    expect(reorderSiblings(rowsOf(tasks), "a", "ghost")).toBeNull();
  });
});
