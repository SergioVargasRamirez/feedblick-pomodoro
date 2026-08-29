import { describe, expect, test } from "bun:test";
import { formatRemaining } from "./countdown";

// useCountdown itself is a hook (interval/state) -- out of scope here, same "pull the pure part
// out" split as every other extraction in this codebase. formatRemaining is the pure half.
describe("formatRemaining", () => {
  test("Infinity (no target) renders as an empty string", () => {
    expect(formatRemaining(Infinity)).toBe("");
  });

  test("under a minute renders as bare seconds", () => {
    expect(formatRemaining(45)).toBe("45s");
  });

  test("zero seconds renders as 0s, not empty", () => {
    expect(formatRemaining(0)).toBe("0s");
  });

  test("a minute or more renders as minutes plus zero-padded seconds", () => {
    expect(formatRemaining(65)).toBe("1m 05s");
  });

  test("an exact minute pads the seconds to 00", () => {
    expect(formatRemaining(120)).toBe("2m 00s");
  });
});
