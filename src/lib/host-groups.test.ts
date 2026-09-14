import { describe, expect, test } from "bun:test";
import { resolveGroupSet, swapPositions } from "./host-groups";
import { GROUP_FRUITS } from "@/lib/group-fruits";
import type { HostGroupName } from "@/lib/room";

function group(id: string, label: string, position: number): HostGroupName {
  return { id, label, position, teacher_id: "teacher-1", created_at: "2026-01-01T00:00:00Z" };
}

describe("resolveGroupSet", () => {
  test("empty custom groups falls back to the 8 fruits, unchanged", () => {
    const result = resolveGroupSet([]);
    expect(result).toEqual(GROUP_FRUITS.map((f) => ({ id: f.id, label: f.label, emoji: f.emoji })));
  });

  test("any custom groups fully replace the fruits, sorted by position, no emoji", () => {
    const result = resolveGroupSet([group("b", "Team B", 1), group("a", "Team A", 0)]);
    expect(result).toEqual([
      { id: "a", label: "Team A" },
      { id: "b", label: "Team B" },
    ]);
  });

  test("a single custom group is returned as-is", () => {
    expect(resolveGroupSet([group("only", "Solo Team", 0)])).toEqual([
      { id: "only", label: "Solo Team" },
    ]);
  });
});

describe("swapPositions", () => {
  const groups = [
    { id: "a", position: 0 },
    { id: "b", position: 1 },
    { id: "c", position: 2 },
  ];

  test("moving up at the top boundary is rejected", () => {
    expect(swapPositions(groups, 0, "up")).toBeNull();
  });

  test("moving down at the bottom boundary is rejected", () => {
    expect(swapPositions(groups, 2, "down")).toBeNull();
  });

  test("a middle swap returns the two rows with positions exchanged", () => {
    expect(swapPositions(groups, 1, "up")).toEqual([
      { id: "b", position: 0 },
      { id: "a", position: 1 },
    ]);
    expect(swapPositions(groups, 1, "down")).toEqual([
      { id: "b", position: 2 },
      { id: "c", position: 1 },
    ]);
  });
});
