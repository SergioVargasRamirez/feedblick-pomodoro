import { describe, expect, test } from "bun:test";
import { badgeColor, colorForLabel } from "./badge-colors";

describe("badgeColor", () => {
  test("wraps around the palette for an out-of-range index", () => {
    expect(badgeColor(0)).toEqual(badgeColor(8));
  });
});

describe("colorForLabel", () => {
  test("the same label always gets the same color", () => {
    expect(colorForLabel("Science")).toEqual(colorForLabel("Science"));
  });

  test("different labels can land on different colors", () => {
    expect(colorForLabel("Science")).not.toEqual(colorForLabel("Math"));
  });

  test("an empty string still resolves to a valid palette entry", () => {
    expect(colorForLabel("")).toEqual(badgeColor(0));
  });
});
