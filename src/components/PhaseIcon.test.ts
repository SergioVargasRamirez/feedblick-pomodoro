import { describe, expect, test } from "bun:test";
import { phaseEmoji } from "./PhaseIcon";

describe("phaseEmoji", () => {
  test("focus and idle both show the tomato", () => {
    expect(phaseEmoji("focus")).toBe("🍅");
    expect(phaseEmoji("idle")).toBe("🍅");
  });

  test('break shows a celebration, not the tomato — "no tomato here"', () => {
    expect(phaseEmoji("break")).not.toBe("🍅");
    expect(phaseEmoji("break")).toBe("🎉");
  });

  test("an unrecognized phase falls back to the tomato rather than rendering nothing", () => {
    expect(phaseEmoji("something-unexpected")).toBe("🍅");
  });
});
