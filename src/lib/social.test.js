import { describe, expect, it, vi } from "vitest";
import { callOrFallback, demoGroup, isStubbedSocialError, runSocialAction } from "./social.js";
import { createSocialActions } from "./socialActions.js";
import { api } from "../api.js";

vi.mock("../api.js", () => ({
  api: vi.fn(),
}));

describe("social helpers", () => {
  it("treats missing social routes as stubbed", () => {
    expect(isStubbedSocialError(new Error("not_found"))).toBe(true);
    expect(isStubbedSocialError(new Error("Request failed (404)"))).toBe(true);
    expect(isStubbedSocialError(new Error("name and visibility are required"))).toBe(false);
  });

  it("builds a local demo group when the API is stubbed", () => {
    const group = demoGroup({
      name: "Training crew",
      visibility: "public",
      discoverable: true,
      creatorId: "you",
    });
    expect(group.name).toBe("Training crew");
    expect(group.memberIds).toEqual(["you"]);
    expect(group.discoverable).toBe(true);
    expect(group.joinCode).toMatch(/^[A-Z0-9]+$/);
  });

  it("falls back only for stubbed errors", async () => {
    const fallback = vi.fn(async () => "local");
    await expect(callOrFallback(async () => {
      throw new Error("not_found");
    }, fallback)).resolves.toBe("local");
    await expect(
      callOrFallback(async () => {
        throw new Error("Only the group admin can approve members");
      }, fallback),
    ).rejects.toThrow("Only the group admin");
  });

  it("clears busy after a social action", async () => {
    const setBusy = vi.fn();
    const setStatus = vi.fn();
    await runSocialAction({
      setBusy,
      setStatus,
      key: "create-group",
      work: async () => "ok",
    });
    expect(setBusy).toHaveBeenNthCalledWith(1, "create-group");
    expect(setBusy).toHaveBeenLastCalledWith("");
  });
});

describe("createSocialActions", () => {
  it("creates a group, adds a friend, and requests to join with visible status", async () => {
    api.mockImplementation(async (path, options = {}) => {
      if (path === "/api/groups" && options.method === "POST") {
        return { id: "g1", name: options.body.name, visibility: "public", discoverable: true, memberIds: ["you"], creatorId: "you" };
      }
      if (path === "/api/groups/join") return { id: "g2", requested: true, memberIds: [], joinCode: "ABCD1234" };
      if (path === "/api/friends" && options.method === "POST") return { status: "requested" };
      throw new Error(`unhandled ${path}`);
    });

    const setBusy = vi.fn();
    const setStatus = vi.fn();
    const setGroups = vi.fn((update) => (typeof update === "function" ? update([]) : update));
    const setPeople = vi.fn((update) =>
      typeof update === "function" ? update([{ id: "friend", name: "FRIEND" }]) : update,
    );
    const actions = createSocialActions({
      tokenOf: async () => "token",
      refresh: async () => {},
      userId: "you",
      setBusy,
      setStatus,
      setGroups,
      setPeople,
    });

    const groupForm = document.createElement("form");
    groupForm.innerHTML = `
      <input name="groupName" value="Training crew" />
      <select name="visibility"><option value="public" selected>Public</option></select>
      <input type="checkbox" name="discoverable" checked />
    `;
    await actions.createGroup({ preventDefault() {}, currentTarget: groupForm });
    expect(setStatus).toHaveBeenCalledWith({ tone: "ok", text: "Group created." });

    const joinForm = document.createElement("form");
    joinForm.innerHTML = `<input name="joinCode" value="abcd1234" />`;
    await actions.joinWithCode({ preventDefault() {}, currentTarget: joinForm });
    expect(setStatus).toHaveBeenCalledWith({ tone: "ok", text: "Requested." });

    await actions.addFriend("friend");
    expect(setStatus).toHaveBeenCalledWith({ tone: "ok", text: "Friend added." });
  });
});
