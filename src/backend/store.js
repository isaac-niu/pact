import { randomUUID } from "node:crypto";
import { DEMO_USERS, STARTING_BALANCE_LAMPORTS } from "./constants.js";
import { withIdentity } from "./userIdentity.js";

function now() {
  return Date.now();
}

function clone(value) {
  return structuredClone(value);
}

function displayName(profile) {
  return profile.name || profile.nickname || profile.email || "Pact user";
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    balanceLamports: user.balanceLamports,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt ?? user.createdAt,
  };
}

export function publicDirectoryUser(user, viewer = null) {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    friend: Boolean(viewer?.friendIds?.includes(user.id)),
  };
}

export function publicPact(pact) {
  return {
    id: pact.id,
    title: pact.title,
    stakeLamports: pact.stakeLamports,
    creatorId: pact.creatorId,
    opponentId: pact.opponentId,
    groupId: pact.groupId ?? null,
    sharedToGroupAt: pact.sharedToGroupAt ?? null,
    status: pact.status,
    winnerId: pact.winnerId ?? null,
    createdAt: pact.createdAt,
    updatedAt: pact.updatedAt,
  };
}

export function createMemoryStore({ seedDemoUsers = true } = {}) {
  const users = new Map();
  const pacts = new Map();
  const groups = new Map();
  const transactions = [];
  const messages = [];

  if (seedDemoUsers) {
    for (const user of Object.values(DEMO_USERS)) {
      users.set(user.id, withIdentity({ ...user, createdAt: now(), lastLoginAt: now() }));
    }
  }

  return {
    async getUserById(id) {
      const user = users.get(id);
      return user ? clone(user) : null;
    },

    async getUserByAuthSub(authSub) {
      const user = [...users.values()].find(
        (entry) => entry.authSub === authSub || entry.sub === authSub || entry.id === authSub,
      );
      return user ? clone(user) : null;
    },

    async upsertUserFromAuth(profile) {
      const ident = withIdentity(profile);
      const existing = [...users.values()].find(
        (entry) => entry.authSub === ident.authSub || entry.sub === ident.sub || entry.id === ident.id,
      );
      if (existing) {
        existing.lastLoginAt = now();
        existing.sub = ident.sub;
        existing.authSub = ident.authSub;
        if (profile.email) existing.email = profile.email;
        if (profile.name || profile.nickname) existing.name = displayName(profile);
        users.set(existing.id, existing);
        return clone(existing);
      }

      const user = withIdentity({
        name: displayName(profile),
        email: profile.email ?? null,
        balanceLamports: STARTING_BALANCE_LAMPORTS,
        createdAt: now(),
        lastLoginAt: now(),
        friendIds: [],
        incomingFriendIds: [],
        outgoingFriendIds: [],
      }, ident);
      users.set(user.id, user);
      return clone(user);
    },

    async saveUser(user) {
      const next = withIdentity({ ...users.get(user.id), ...user });
      users.set(next.id, next);
      return clone(next);
    },

    async listUsers() {
      return [...users.values()].map(clone);
    },

    async listPactsForUser(userId) {
      return [...pacts.values()]
        .filter((pact) => pact.creatorId === userId || pact.opponentId === userId || (pact.sharedToGroupAt && groups.get(pact.groupId)?.memberIds.includes(userId)))
        .map(clone);
    },

    async createGroup({ name, visibility, discoverable = false, creatorId }) {
      const group = {
        id: randomUUID(),
        name,
        visibility,
        discoverable,
        joinCode: randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase(),
        creatorId,
        memberIds: [creatorId],
        pendingMemberIds: [],
        createdAt: now(),
      };
      groups.set(group.id, group);
      return clone(group);
    },
    async listGroupsForUser(_userId) {
      return [...groups.values()].map(clone);
    },
    async getGroup(id) { const group = groups.get(id); return group ? clone(group) : null; },
    async getGroupByJoinCode(joinCode) {
      const group = [...groups.values()].find((entry) => entry.joinCode === joinCode);
      return group ? clone(group) : null;
    },
    async saveGroup(group) { groups.set(group.id, clone(group)); return clone(group); },

    async getPact(id) {
      const pact = pacts.get(id);
      return pact ? clone(pact) : null;
    },

    async createPact({ title, stakeLamports, creatorId, opponentId = null, groupId = null }) {
      const pact = {
        id: randomUUID(),
        title,
        stakeLamports,
        creatorId,
        opponentId,
        groupId,
        sharedToGroupAt: null,
        status: "draft",
        winnerId: null,
        createdAt: now(),
        updatedAt: now(),
      };
      pacts.set(pact.id, pact);
      return clone(pact);
    },

    async savePact(pact) {
      pacts.set(pact.id, { ...pact, updatedAt: now() });
      return clone(pacts.get(pact.id));
    },

    async addTransaction(entry) {
      const transaction = {
        id: randomUUID(),
        createdAt: now(),
        ...entry,
      };
      transactions.push(transaction);
      return clone(transaction);
    },

    async listTransactionsForUser(userId) {
      return transactions
        .filter((entry) => {
          if (entry.userId === userId) return true;
          const pact = pacts.get(entry.pactId);
          return pact && (pact.creatorId === userId || pact.opponentId === userId);
        })
        .map(clone);
    },

    async requestFriend(fromId, toId) {
      if (fromId === toId) throw new Error("Cannot friend yourself");
      const from = users.get(fromId);
      const to = users.get(toId);
      if (!from || !to) throw new Error("User not found");
      const a = withIdentity(from);
      const b = withIdentity(to);
      if (a.friendIds.includes(toId)) return { status: "friends" };
      a.outgoingFriendIds = [...new Set([...a.outgoingFriendIds, toId])];
      b.incomingFriendIds = [...new Set([...b.incomingFriendIds, fromId])];
      users.set(fromId, a);
      users.set(toId, b);
      return { status: "requested" };
    },

    async acceptFriend(userId, fromId) {
      const meDoc = users.get(userId);
      const themDoc = users.get(fromId);
      if (!meDoc || !themDoc) throw new Error("User not found");
      const me = withIdentity(meDoc);
      const them = withIdentity(themDoc);
      if (!me.incomingFriendIds.includes(fromId)) throw new Error("No request");
      me.incomingFriendIds = me.incomingFriendIds.filter((id) => id !== fromId);
      them.outgoingFriendIds = them.outgoingFriendIds.filter((id) => id !== userId);
      me.friendIds = [...new Set([...me.friendIds, fromId])];
      them.friendIds = [...new Set([...them.friendIds, userId])];
      users.set(userId, me);
      users.set(fromId, them);
      return { status: "friends" };
    },

    async addMessage({ fromId, toId, body }) {
      const message = {
        id: randomUUID(),
        threadKey: [fromId, toId].sort().join(":"),
        fromId,
        toId,
        body,
        createdAt: now(),
      };
      messages.push(message);
      return clone(message);
    },

    async listMessages(userId, otherId) {
      const threadKey = [userId, otherId].sort().join(":");
      return messages.filter((row) => row.threadKey === threadKey).map(clone);
    },

    async listThreads(userId) {
      const rows = [...messages].sort((a, b) => b.createdAt - a.createdAt);
      const seen = new Set();
      const threads = [];
      for (const row of rows) {
        if (row.fromId !== userId && row.toId !== userId) continue;
        const otherId = row.fromId === userId ? row.toId : row.fromId;
        if (seen.has(otherId)) continue;
        seen.add(otherId);
        threads.push({ otherId, last: clone(row) });
      }
      return threads;
    },
  };
}
