import { describe, expect, test } from "bun:test";
import { lerpColor, tomatoElapsedFraction } from "./TomatoProgress";

describe("tomatoElapsedFraction", () => {
  test("a phase just starting reads as 0 (fully unripe)", () => {
    expect(tomatoElapsedFraction(1500, 1500, "focus")).toBe(0);
  });

  test("a phase halfway through reads as 0.5", () => {
    expect(tomatoElapsedFraction(750, 1500, "focus")).toBe(0.5);
  });

  test("a finished phase reads as 1 (fully ripe), never past it", () => {
    expect(tomatoElapsedFraction(0, 1500, "focus")).toBe(1);
    expect(tomatoElapsedFraction(-10, 1500, "focus")).toBe(1);
  });

  test("idle always reads as fully ripe regardless of the numbers passed in", () => {
    expect(tomatoElapsedFraction(1500, 1500, "idle")).toBe(1);
  });

  test("a zero-length phase reads as fully ripe rather than dividing by zero", () => {
    expect(tomatoElapsedFraction(0, 0, "focus")).toBe(1);
  });
});

describe("lerpColor", () => {
  test("t=0 is exactly the first color", () => {
    expect(lerpColor([0, 100, 200], [255, 0, 0], 0)).toBe("rgb(0, 100, 200)");
  });

  test("t=1 is exactly the second color", () => {
    expect(lerpColor([0, 100, 200], [255, 0, 0], 1)).toBe("rgb(255, 0, 0)");
  });

  test("t=0.5 is the midpoint of each channel", () => {
    expect(lerpColor([0, 100, 200], [100, 0, 0], 0.5)).toBe("rgb(50, 50, 100)");
  });
});
