import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { TaskTable } from "./TaskTable";
import type { RoomTask } from "@/lib/room";

function task(id: string, text: string): RoomTask {
  return { id, text, room_id: "room-1", position: 0, created_at: "2026-01-01T00:00:00Z" };
}

describe("TaskTable", () => {
  test("shows a friendly empty state with no tasks", () => {
    const { getByText } = render(<TaskTable tasks={[]} renderAction={() => null} />);
    expect(getByText("No tasks yet.")).toBeInTheDocument();
  });

  test("numbers tasks by default, 1-indexed", () => {
    const tasks = [task("a", "Read page 73"), task("b", "Solve exercises")];
    const { getByText } = render(<TaskTable tasks={tasks} renderAction={() => null} />);
    expect(getByText("1. Read page 73")).toBeInTheDocument();
    expect(getByText("2. Solve exercises")).toBeInTheDocument();
  });

  test("renderText overrides the default numbered text", () => {
    const tasks = [task("a", "Read page 73")];
    const { getByText, queryByText } = render(
      <TaskTable
        tasks={tasks}
        renderText={(t) => <span>custom: {t.text}</span>}
        renderAction={() => null}
      />,
    );
    expect(getByText("custom: Read page 73")).toBeInTheDocument();
    expect(queryByText("1. Read page 73")).not.toBeInTheDocument();
  });

  test("renderAction is called once per task with the task and its index", () => {
    const tasks = [task("a", "First"), task("b", "Second")];
    const calls: Array<[RoomTask, number]> = [];
    render(
      <TaskTable
        tasks={tasks}
        renderAction={(t, i) => {
          calls.push([t, i]);
          return null;
        }}
      />,
    );
    expect(calls.map(([t, i]) => [t.id, i])).toEqual([
      ["a", 0],
      ["b", 1],
    ]);
  });
});
