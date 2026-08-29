import { describe, expect, test } from "bun:test";
import { summarizeByFruit, summarizeSignals, type StudentPresence } from "./room-presence";

function student(
  name: string,
  fruit: string | null,
  signal: StudentPresence["signal"],
): StudentPresence {
  return { name, fruit, signal };
}

describe("summarizeSignals", () => {
  test("counts each signal and the total, ignoring students with no signal", () => {
    const students = [
      student("A", null, "done"),
      student("B", null, "stuck"),
      student("C", null, "stuck"),
      student("D", null, "need2min"),
      student("E", null, null),
    ];
    expect(summarizeSignals(students)).toEqual({
      total: 5,
      done: 1,
      stuck: 2,
      need2min: 1,
    });
  });

  test("an empty room is all zeros, not a crash", () => {
    expect(summarizeSignals([])).toEqual({ total: 0, done: 0, stuck: 0, need2min: 0 });
  });
});

describe("summarizeByFruit", () => {
  test("buckets students by fruit and counts their signals within each bucket", () => {
    const students = [
      student("A", "banana", "stuck"),
      student("B", "banana", "done"),
      student("C", "cherry", "stuck"),
      student("D", "cherry", null),
    ];
    const result = summarizeByFruit(students, ["banana", "cherry"]);
    expect(result.banana).toEqual({ total: 2, done: 1, stuck: 1, need2min: 0 });
    expect(result.cherry).toEqual({ total: 2, done: 0, stuck: 1, need2min: 0 });
  });

  test("every requested fruit id gets a zeroed entry even with nobody in it", () => {
    const result = summarizeByFruit([], ["pineapple", "lime"]);
    expect(result.pineapple).toEqual({ total: 0, done: 0, stuck: 0, need2min: 0 });
    expect(result.lime).toEqual({ total: 0, done: 0, stuck: 0, need2min: 0 });
  });

  test("a student with no fruit, or a fruit id not in the requested list, isn't counted anywhere", () => {
    const students = [student("A", null, "stuck"), student("B", "unknown-fruit", "stuck")];
    const result = summarizeByFruit(students, ["banana"]);
    expect(result.banana.total).toBe(0);
  });
});
