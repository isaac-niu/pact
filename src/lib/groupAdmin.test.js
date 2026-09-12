import { describe, expect, it } from "vitest";
import {
  applyArchiveGroup,
  applyDeleteGroup,
  applyRemoveMember,
  applyTransferOwnership,
  canRemoveMember,
} from "./groupAdmin.js";

const crew = {
  id: "g1",
  name: "Dawn gym",
  creatorId: "alice",
  memberIds: ["alice", "bob", "carol"],
  pendingMemberIds: ["dan"],
};

describe("group admin tools", () => {
  it("lets the admin cut a member, but not themselves", () => {
    const next = applyRemoveMember(crew, "alice", "bob");
    expect(next.memberIds).toEqual(["alice", "carol"]);
    expect(() => canRemoveMember(crew, "alice", "alice")).toThrow(/Hand the book/);
    expect(() => applyRemoveMember(crew, "bob", "carol")).toThrow(/crew admin/);
  });

  it("hands the book to another member", () => {
    const next = applyTransferOwnership(crew, "alice", "carol");
    expect(next.creatorId).toBe("carol");
    expect(() => applyTransferOwnership(crew, "alice", "erin")).toThrow(/member/);
  });

  it("scratches a crew from the directory", () => {
    const next = applyArchiveGroup(crew, "alice", 99);
    expect(next.archivedAt).toBe(99);
    expect(() => applyArchiveGroup(crew, "bob")).toThrow(/crew admin/);
  });

  it("lets only the admin delete the crew", () => {
    expect(applyDeleteGroup(crew, "alice")).toEqual({ deleted: true, id: "g1" });
    expect(() => applyDeleteGroup(crew, "bob")).toThrow(/delete this crew/);
  });
});
