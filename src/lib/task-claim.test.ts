import { describe, expect, test } from "bun:test";
import { canSignalDone, nextClaimedBy } from "./task-claim";

function task(id: string, claimed_by: string | null, completed: boolean) {
  return { id, claimed_by, completed };
}

describe("nextClaimedBy", () => {
  test("claiming an unclaimed task sets it to the actor's name", () => {
    expect(nextClaimedBy(null, "Alice")).toBe("Alice");
  });

  test("tapping your own claim again releases it", () => {
    expect(nextClaimedBy("Alice", "Alice")).toBeNull();
  });

  test("tapping someone else's claim reassigns it to you — no lock", () => {
    expect(nextClaimedBy("Alice", "Bob")).toBe("Bob");
  });
});

describe("canSignalDone", () => {
  test("an empty task list is vacuously done", () => {
    expect(canSignalDone([], new Set(), "Alice")).toBe(true);
  });

  test("unclaimed tasks must be locally checked", () => {
    const tasks = [task("a", null, false)];
    expect(canSignalDone(tasks, new Set(), "Alice")).toBe(false);
    expect(canSignalDone(tasks, new Set(["a"]), "Alice")).toBe(true);
  });

  test("a task claimed by someone else never blocks you", () => {
    const tasks = [task("a", "Bob", false)];
    expect(canSignalDone(tasks, new Set(), "Alice")).toBe(true);
  });

  test("a task you claimed requires the shared completed flag, not the local checkbox", () => {
    const tasks = [task("a", "Alice", false)];
    expect(canSignalDone(tasks, new Set(["a"]), "Alice")).toBe(false);
    expect(canSignalDone([task("a", "Alice", true)], new Set(), "Alice")).toBe(true);
  });

  test("a mix of task kinds all need to individually clear", () => {
    const tasks = [
      task("mine", "Alice", true),
      task("theirs", "Bob", false),
      task("unclaimed", null, true),
    ];
    expect(canSignalDone(tasks, new Set(["unclaimed"]), "Alice")).toBe(true);
    expect(canSignalDone(tasks, new Set(), "Alice")).toBe(false);
  });
});
