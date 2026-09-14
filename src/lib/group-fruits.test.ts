import { describe, expect, test } from "bun:test";
import {
  GROUP_FRUITS,
  canToggleFruitEnabled,
  enabledFruitIds,
  toggleDisabledFruit,
} from "./group-fruits";

const ALL_IDS = GROUP_FRUITS.map((f) => f.id);

describe("toggleDisabledFruit", () => {
  test("disabling an enabled fruit adds it to the list", () => {
    expect(toggleDisabledFruit([], "banana")).toEqual(["banana"]);
  });

  test("re-enabling a disabled fruit removes it from the list", () => {
    expect(toggleDisabledFruit(["banana", "cherry"], "banana")).toEqual(["cherry"]);
  });
});

describe("canToggleFruitEnabled", () => {
  test("re-enabling is always allowed", () => {
    expect(canToggleFruitEnabled(ALL_IDS.slice(0, 7), ALL_IDS[0])).toBe(true);
  });

  test("disabling is allowed while more than one fruit would remain enabled", () => {
    expect(canToggleFruitEnabled([], "banana")).toBe(true);
  });

  test("refuses to disable the last remaining enabled fruit", () => {
    const allButOne = ALL_IDS.slice(1);
    expect(canToggleFruitEnabled(allButOne, ALL_IDS[0])).toBe(false);
  });

  test("with an explicit totalCount, applies against a custom-sized group set instead of the 8 fruits", () => {
    // 3 custom groups, 2 already disabled — disabling the 3rd would leave zero.
    expect(canToggleFruitEnabled(["a", "b"], "c", 3)).toBe(false);
    // Same 2 disabled, but a larger custom set still has room.
    expect(canToggleFruitEnabled(["a", "b"], "c", 5)).toBe(true);
  });
});

describe("enabledFruitIds", () => {
  test("with nothing disabled, returns every fruit", () => {
    expect(enabledFruitIds([])).toEqual(ALL_IDS);
  });

  test("excludes disabled fruits", () => {
    expect(enabledFruitIds(["banana", "cherry"])).toEqual(
      ALL_IDS.filter((id) => id !== "banana" && id !== "cherry"),
    );
  });

  test("with an explicit id list, filters that set instead of the 8 fruits", () => {
    expect(enabledFruitIds(["a"], ["a", "b", "c"])).toEqual(["b", "c"]);
  });
});
