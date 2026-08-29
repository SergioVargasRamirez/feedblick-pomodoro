import { describe, expect, test } from "bun:test";
import { buildUsersByEmail, getAccessRequestAcceptanceStatus } from "./access-request-status";

describe("getAccessRequestAcceptanceStatus", () => {
  test("pending request is not_applicable regardless of whether a user exists", () => {
    const users = buildUsersByEmail([
      { email: "a@test.com", last_sign_in_at: "2026-08-19T00:00:00Z" },
    ]);
    expect(
      getAccessRequestAcceptanceStatus({ status: "pending", email: "a@test.com" }, users),
    ).toEqual({
      kind: "not_applicable",
    });
  });

  test("rejected request is not_applicable", () => {
    const users = buildUsersByEmail([]);
    expect(
      getAccessRequestAcceptanceStatus({ status: "rejected", email: "a@test.com" }, users),
    ).toEqual({
      kind: "not_applicable",
    });
  });

  test("approved request with no matching user is not_signed_in", () => {
    const users = buildUsersByEmail([{ email: "someone-else@test.com", last_sign_in_at: null }]);
    expect(
      getAccessRequestAcceptanceStatus({ status: "approved", email: "a@test.com" }, users),
    ).toEqual({
      kind: "not_signed_in",
    });
  });

  test("approved request with a matching user who has never signed in is not_signed_in", () => {
    const users = buildUsersByEmail([{ email: "a@test.com", last_sign_in_at: null }]);
    expect(
      getAccessRequestAcceptanceStatus({ status: "approved", email: "a@test.com" }, users),
    ).toEqual({
      kind: "not_signed_in",
    });
  });

  test("approved request with a matching user who has signed in is signed_in with the date", () => {
    const users = buildUsersByEmail([
      { email: "a@test.com", last_sign_in_at: "2026-08-19T12:00:00Z" },
    ]);
    expect(
      getAccessRequestAcceptanceStatus({ status: "approved", email: "a@test.com" }, users),
    ).toEqual({
      kind: "signed_in",
      lastSignInAt: "2026-08-19T12:00:00Z",
    });
  });

  test("email matching is case-insensitive on both sides", () => {
    const users = buildUsersByEmail([
      { email: "A@Test.com", last_sign_in_at: "2026-08-19T00:00:00Z" },
    ]);
    expect(
      getAccessRequestAcceptanceStatus({ status: "approved", email: "a@TEST.COM" }, users),
    ).toEqual({ kind: "signed_in", lastSignInAt: "2026-08-19T00:00:00Z" });
  });
});
