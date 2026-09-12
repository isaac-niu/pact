import { describe, expect, it } from "vitest";
import { demoDirectoryGroups, groupsInDirectory, isListedGroup, yourCrews } from "./directory.js";

describe("group directory", () => {
  it("lists only discoverable, non-archived crews", () => {
    const groups = [
      { id: "1", name: "Dawn gym", discoverable: true, memberIds: ["a"] },
      { id: "2", name: "Secret", discoverable: false, memberIds: ["a"] },
      { id: "3", name: "Old board", discoverable: true, archivedAt: 1, memberIds: ["a"] },
    ];
    expect(groupsInDirectory(groups).map((g) => g.id)).toEqual(["1"]);
    expect(isListedGroup(groups[1])).toBe(false);
  });

  it("filters the board by name", () => {
    expect(groupsInDirectory(demoDirectoryGroups(), "night").map((g) => g.name)).toEqual(["Night runners"]);
  });

  it("keeps your crews separate from the public board", () => {
    const groups = [
      { id: "1", name: "Mine", discoverable: false, creatorId: "you", memberIds: ["you"] },
      { id: "2", name: "Dawn gym", discoverable: true, creatorId: "coach", memberIds: ["coach"] },
    ];
    expect(yourCrews(groups, "you").map((g) => g.id)).toEqual(["1"]);
    expect(groupsInDirectory(groups).map((g) => g.id)).toEqual(["2"]);
  });
});
