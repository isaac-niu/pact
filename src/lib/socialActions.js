import { api } from "../api.js";
import { callOrFallback, demoGroup, runSocialAction } from "./social.js";

export function createSocialActions({
  tokenOf,
  refresh,
  userId,
  setBusy,
  setStatus,
  setGroups,
  setPeople,
  setFriends,
}) {
  async function token() {
    if (!tokenOf) throw new Error("Sign in first");
    return tokenOf();
  }

  return {
    async createGroup(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const name = String(data.get("groupName") || "").trim();
      const visibility = data.get("visibility") === "private" ? "private" : "public";
      const discoverable = data.get("discoverable") === "on";
      await runSocialAction({
        setBusy,
        setStatus,
        key: "create-group",
        work: async () => {
          const group = await callOrFallback(
            async () =>
              api("/api/groups", {
                token: await token(),
                method: "POST",
                body: { name, visibility, discoverable },
              }),
            () => demoGroup({ name, visibility, discoverable, creatorId: userId }),
          );
          form.reset();
          setGroups((current) => [group, ...current.filter((entry) => entry.id !== group.id)]);
          setStatus({ tone: "ok", text: "Group created." });
          await refresh?.();
        },
      });
    },

    async joinWithCode(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const joinCode = String(new FormData(form).get("joinCode") || "").trim();
      await runSocialAction({
        setBusy,
        setStatus,
        key: "join-code",
        work: async () => {
          const group = await callOrFallback(
            async () =>
              api("/api/groups/join", {
                token: await token(),
                method: "POST",
                body: { joinCode },
              }),
            () => ({
              ...demoGroup({
                name: `Code ${joinCode.toUpperCase()}`,
                visibility: "private",
                discoverable: false,
                creatorId: null,
              }),
              requested: true,
              memberIds: [],
              joinCode: joinCode.toUpperCase(),
            }),
          );
          form.reset();
          setGroups((current) => {
            const next = { ...group, requested: group.requested ?? true };
            const exists = current.some((entry) => entry.id === next.id || entry.joinCode === next.joinCode);
            return exists
              ? current.map((entry) =>
                  entry.id === next.id || entry.joinCode === next.joinCode
                    ? { ...entry, ...next, requested: true }
                    : entry,
                )
              : [next, ...current];
          });
          setStatus({ tone: "ok", text: "Requested." });
          await refresh?.();
        },
      });
    },

    async joinGroup(id) {
      await runSocialAction({
        setBusy,
        setStatus,
        key: `join:${id}`,
        work: async () => {
          const result = await callOrFallback(
            async () => api(`/api/groups/${id}/join`, { token: await token(), method: "POST" }),
            () => ({ requested: true }),
          );
          setGroups((current) =>
            current.map((group) => (group.id === id ? { ...group, ...result, requested: true } : group)),
          );
          setStatus({ tone: "ok", text: result.requested === false ? "Joined group." : "Requested." });
          await refresh?.();
        },
      });
    },

    async approveMember(id, memberId) {
      await runSocialAction({
        setBusy,
        setStatus,
        key: `approve:${id}:${memberId}`,
        work: async () => {
          await api(`/api/groups/${id}/approve`, {
            token: await token(),
            method: "POST",
            body: { userId: memberId },
          });
          setStatus({ tone: "ok", text: "Member approved." });
          await refresh?.();
        },
      });
    },

    async addFriend(userIdToAdd) {
      await runSocialAction({
        setBusy,
        setStatus,
        key: `friend:${userIdToAdd}`,
        work: async () => {
          await callOrFallback(
            async () =>
              api("/api/friends", {
                token: await token(),
                method: "POST",
                body: { userId: userIdToAdd },
              }),
            () => ({ status: "friends" }),
          );
          setPeople((current) =>
            current.map((person) =>
              person.id === userIdToAdd ? { ...person, friend: true, requested: false } : person,
            ),
          );
          setStatus({ tone: "ok", text: "Friend added." });
          await refresh?.();
        },
      });
    },

    async acceptFriend(fromId) {
      await runSocialAction({
        setBusy,
        setStatus,
        key: `accept:${fromId}`,
        work: async () => {
          await callOrFallback(
            async () =>
              api(`/api/friends/${encodeURIComponent(fromId)}/accept`, {
                token: await token(),
                method: "POST",
              }),
            () => ({ status: "friends" }),
          );
          setFriends?.((current) => ({
            ...current,
            incoming: (current.incoming || []).filter((person) => person.id !== fromId),
            friends: [...(current.friends || []), { id: fromId }],
          }));
          setPeople((current) =>
            current.map((person) => (person.id === fromId ? { ...person, friend: true, requested: false } : person)),
          );
          setStatus({ tone: "ok", text: "Friend added." });
          await refresh?.();
        },
      });
    },
  };
}
