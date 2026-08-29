import { describe, expect, test } from "bun:test";
import { HANDLE_FRUITS, MAX_STUDENTS_PER_FRUIT, pickHandle } from "./fruit-handle";

describe("pickHandle", () => {
  test("assigns slot 1 to some fruit when the room is empty", () => {
    const handle = pickHandle([]);
    const match = /^(.+) (\d+)$/.exec(handle);
    expect(match).not.toBeNull();
    expect(HANDLE_FRUITS.includes(match![1] as (typeof HANDLE_FRUITS)[number])).toBe(true);
    expect(match![2]).toBe("1");
  });

  test("fills the lowest free slot, skipping fruits already at the cap", () => {
    // Every fruit except "Lime" is at the cap; Lime has only slot 2 taken, so it's both the
    // only fruit under cap AND has slot 1 free — deterministic regardless of pickHandle's
    // internal randomness.
    const full = HANDLE_FRUITS.filter((f) => f !== "Lime").flatMap((fruit) =>
      Array.from({ length: MAX_STUDENTS_PER_FRUIT }, (_, i) => `${fruit} ${i + 1}`),
    );
    const handle = pickHandle([...full, "Lime 2"]);
    expect(handle).toBe("Lime 1");
  });

  test("overflows past the cap rather than refusing a handle once every fruit is full", () => {
    const full = HANDLE_FRUITS.flatMap((fruit) =>
      Array.from({ length: MAX_STUDENTS_PER_FRUIT }, (_, i) => `${fruit} ${i + 1}`),
    );
    const handle = pickHandle(full);
    const match = /^(.+) (\d+)$/.exec(handle);
    expect(match).not.toBeNull();
    expect(HANDLE_FRUITS.includes(match![1] as (typeof HANDLE_FRUITS)[number])).toBe(true);
    expect(Number(match![2])).toBeGreaterThan(MAX_STUDENTS_PER_FRUIT);
  });
});
