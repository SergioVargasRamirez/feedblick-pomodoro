import { describe, expect, test } from "bun:test";
import { addTag, allTags, filterRoomsByQuery, filterRoomsByTag, removeTag } from "./room-tags";

describe("addTag", () => {
  test("adds a trimmed tag to an empty list", () => {
    expect(addTag([], "  Math  ")).toEqual(["Math"]);
  });

  test("a blank/whitespace-only tag is a no-op", () => {
    expect(addTag(["Math"], "   ")).toEqual(["Math"]);
  });

  test("dedupes case-insensitively, keeping the existing casing", () => {
    expect(addTag(["Math"], "math")).toEqual(["Math"]);
  });

  test("a genuinely new tag is appended", () => {
    expect(addTag(["Math"], "Science")).toEqual(["Math", "Science"]);
  });
});

describe("removeTag", () => {
  test("removes an exact match", () => {
    expect(removeTag(["Math", "Science"], "Math")).toEqual(["Science"]);
  });

  test("removing a tag not present is a no-op", () => {
    expect(removeTag(["Math"], "Science")).toEqual(["Math"]);
  });
});

describe("allTags", () => {
  test("collects every distinct tag across rooms, sorted", () => {
    const rooms = [{ tags: ["Science", "Math"] }, { tags: ["Math", "Art"] }];
    expect(allTags(rooms)).toEqual(["Art", "Math", "Science"]);
  });

  test("no rooms, or rooms with no tags, gives an empty list", () => {
    expect(allTags([])).toEqual([]);
    expect(allTags([{ tags: [] }])).toEqual([]);
  });
});

describe("filterRoomsByQuery", () => {
  const rooms = [
    { name: "Biology 101", code: "ABC123", tags: ["Science", "Grade9"] },
    { name: "Algebra II", code: "XYZ789", tags: ["Math"] },
  ];

  test("a blank query matches everything", () => {
    expect(filterRoomsByQuery(rooms, "")).toEqual(rooms);
    expect(filterRoomsByQuery(rooms, "   ")).toEqual(rooms);
  });

  test("matches a substring of the room name, case-insensitively", () => {
    expect(filterRoomsByQuery(rooms, "biology")).toEqual([rooms[0]]);
  });

  test("matches a substring of the room code, case-insensitively", () => {
    expect(filterRoomsByQuery(rooms, "xyz")).toEqual([rooms[1]]);
  });

  test("matches a tag exactly (case-insensitively), not as a substring", () => {
    expect(filterRoomsByQuery(rooms, "science")).toEqual([rooms[0]]);
    expect(filterRoomsByQuery(rooms, "scien")).toEqual([]);
  });

  test("no match returns an empty list", () => {
    expect(filterRoomsByQuery(rooms, "chemistry")).toEqual([]);
  });
});

describe("filterRoomsByTag", () => {
  const rooms = [{ tags: ["Science"] }, { tags: ["Math"] }, { tags: ["Science", "Math"] }];

  test("null active tag matches everything", () => {
    expect(filterRoomsByTag(rooms, null)).toEqual(rooms);
  });

  test("filters to rooms carrying the exact tag", () => {
    expect(filterRoomsByTag(rooms, "Science")).toEqual([rooms[0], rooms[2]]);
  });
});
