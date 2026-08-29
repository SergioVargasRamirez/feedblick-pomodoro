import { describe, expect, test } from "bun:test";
import { isAdminEmail } from "./admin-emails";

describe("isAdminEmail", () => {
  test("matches an allowlisted address", () => {
    expect(isAdminEmail("sergio.vargas@biodatum.io")).toBe(true);
  });

  test("matches case-insensitively", () => {
    expect(isAdminEmail("Sergio.Vargas@Biodatum.IO")).toBe(true);
  });

  test("rejects an address not on the allowlist", () => {
    expect(isAdminEmail("someone-else@example.com")).toBe(false);
  });

  test("rejects null/undefined without throwing", () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });
});
