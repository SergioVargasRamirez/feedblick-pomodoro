import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { TaskTable } from "./TaskTable";
import type { FlatTaskRow } from "@/lib/task-tree";
import type { RoomTask } from "@/lib/room";

function task(id: string, text: string, overrides: Partial<RoomTask> = {}): RoomTask {
  return {
    id,
    text,
    room_id: "room-1",
    position: 0,
    created_at: "2026-01-01T00:00:00Z",
    claimed_by: null,
    completed: false,
    parent_id: null,
    assigned_group: null,
    ...overrides,
  };
}

function row(t: RoomTask, depth: 0 | 1 = 0, children: RoomTask[] = []): FlatTaskRow {
  return { task: t, depth, children };
}

describe("TaskTable", () => {
  test("shows a friendly empty state with no rows", () => {
    const { getByText } = render(<TaskTable rows={[]} renderAction={() => null} />);
    expect(getByText("No tasks yet.")).toBeInTheDocument();
  });

  test("numbers only depth-0 rows, 1-indexed among themselves", () => {
    const parent = task("a", "Read page 73");
    const child = task("a-1", "Sub item", { parent_id: "a" });
    const rows = [row(parent, 0, [child]), row(child, 1), row(task("b", "Solve exercises"), 0)];
    const { getByText } = render(<TaskTable rows={rows} renderAction={() => null} />);
    expect(getByText("1. Read page 73")).toBeInTheDocument();
    expect(getByText("Sub item")).toBeInTheDocument();
    expect(getByText("2. Solve exercises")).toBeInTheDocument();
  });

  test("a depth-1 row is indented (via pl-6 on its cell) and unnumbered", () => {
    const parent = task("a", "Parent");
    const child = task("a-1", "Child", { parent_id: "a" });
    const rows = [row(parent, 0, [child]), row(child, 1)];
    const { container } = render(<TaskTable rows={rows} renderAction={() => null} />);
    const cells = container.querySelectorAll("td");
    // First row: [text cell, action cell]; second row: [indented text cell, action cell].
    expect(cells[0].className).not.toContain("pl-6");
    expect(cells[2].className).toContain("pl-6");
  });

  test("renderText overrides the default numbered text", () => {
    const rows = [row(task("a", "Read page 73"))];
    const { getByText, queryByText } = render(
      <TaskTable
        rows={rows}
        renderText={(r) => <span>custom: {r.task.text}</span>}
        renderAction={() => null}
      />,
    );
    expect(getByText("custom: Read page 73")).toBeInTheDocument();
    expect(queryByText("1. Read page 73")).not.toBeInTheDocument();
  });

  test("renderAction is called once per row with the row and its flattened index", () => {
    const rows = [row(task("a", "First")), row(task("b", "Second"))];
    const calls: Array<[string, number]> = [];
    render(
      <TaskTable
        rows={rows}
        renderAction={(r, i) => {
          calls.push([r.task.id, i]);
          return null;
        }}
      />,
    );
    expect(calls).toEqual([
      ["a", 0],
      ["b", 1],
    ]);
  });

  test("with reorder enabled, still renders every row (drag handle added, content unaffected)", () => {
    const rows = [row(task("a", "First")), row(task("b", "Second"))];
    const { getByText } = render(
      <TaskTable rows={rows} renderAction={() => null} reorder={{ onReorder: () => {} }} />,
    );
    expect(getByText("1. First")).toBeInTheDocument();
    expect(getByText("2. Second")).toBeInTheDocument();
  });
});
