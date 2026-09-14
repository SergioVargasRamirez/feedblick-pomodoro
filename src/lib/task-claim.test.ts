import { describe, expect, test } from "bun:test";
import { canSignalDone, nextClaimState } from "./task-claim";

function task(id: string, claimed_by: string | null, completed: boolean) {
  return { id, claimed_by, completed };
}

describe("nextClaimState", () => {
  test("claiming an unclaimed task starts it at Doing", () => {
    expect(nextClaimState({ claimed_by: null, completed: false }, "Alice")).toEqual({
      claimed_by: "Alice",
      completed: false,
    });
  });

  test("tapping your own task while Doing marks it Done", () => {
    expect(nextClaimState({ claimed_by: "Alice", completed: false }, "Alice")).toEqual({
      claimed_by: "Alice",
      completed: true,
    });
  });

  test("tapping your own task while Done releases it back to Unclaimed", () => {
    expect(nextClaimState({ claimed_by: "Alice", completed: true }, "Alice")).toEqual({
      claimed_by: null,
      completed: false,
    });
  });

  test("tapping someone else's task takes it over, starting fresh at Doing — no lock", () => {
    expect(nextClaimState({ claimed_by: "Alice", completed: false }, "Bob")).toEqual({
      claimed_by: "Bob",
      completed: false,
    });
    // Even if it was already Done — taking it over resets it to Doing under the new claimant.
    expect(nextClaimState({ claimed_by: "Alice", completed: true }, "Bob")).toEqual({
      claimed_by: "Bob",
      completed: false,
    });
  });

  test("the full cycle returns to its starting point", () => {
    let state = { claimed_by: null as string | null, completed: false };
    state = nextClaimState(state, "Alice");
    expect(state).toEqual({ claimed_by: "Alice", completed: false });
    state = nextClaimState(state, "Alice");
    expect(state).toEqual({ claimed_by: "Alice", completed: true });
    state = nextClaimState(state, "Alice");
    expect(state).toEqual({ claimed_by: null, completed: false });
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
