import { describe, expect, test } from "bun:test";
import { generateRoomCode } from "./room-code";

describe("generateRoomCode", () => {
  test("is 6 characters", () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  test("never contains the ambiguous 0/O/1/I/L characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateRoomCode()).not.toMatch(/[01OIL]/);
    }
  });

  test("only contains uppercase letters and digits", () => {
    expect(generateRoomCode()).toMatch(/^[A-Z0-9]{6}$/);
  });

  test("isn't the same code every time", () => {
    const codes = new Set(Array.from({ length: 20 }, generateRoomCode));
    expect(codes.size).toBeGreaterThan(1);
  });
});
