import { randomUUID } from "node:crypto";
import { DEMO_USERS, STARTING_BALANCE_LAMPORTS } from "./constants.js";

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
    requested: Boolean(viewer?.outgoingFriendIds?.includes(user.id)),
  };
}

function withFriends(user) {
  return {
    ...user,
    friendIds: Array.isArray(user.friendIds) ? user.friendIds : [],
    incomingFriendIds: Array.isArray(user.incomingFriendIds) ? user.incomingFriendIds : [],
    outgoingFriendIds: Array.isArray(user.outgoingFriendIds) ? user.outgoingFriendIds : [],
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

  if (seedDemoUsers) {
    for (const user of Object.values(DEMO_USERS)) {
      users.set(user.id, { ...user, createdAt: now(), lastLoginAt: now() });
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
      const authSub = profile.sub;
      const existing = [...users.values()].find(
        (entry) => entry.authSub === authSub || entry.sub === authSub || entry.id === authSub,
      );
      if (existing) {
        existing.lastLoginAt = now();
        existing.sub = authSub;
        existing.authSub = existing.authSub || authSub;
        if (profile.email) existing.email = profile.email;
        if (profile.name || profile.nickname) existing.name = displayName(profile);
        users.set(existing.id, existing);
        return clone(existing);
      }

      const user = {
        id: authSub,
        sub: authSub,
        authSub,
        name: displayName(profile),
        email: profile.email ?? null,
        balanceLamports: STARTING_BALANCE_LAMPORTS,
        createdAt: now(),
        lastLoginAt: now(),
      };
      users.set(user.id, user);
      return clone(user);
    },

    async saveUser(user) {
      users.set(user.id, { ...users.get(user.id), ...user });
      return clone(users.get(user.id));
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
    async deleteGroup(id) { groups.delete(id); return { deleted: true, id }; },

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
      const a = withFriends(from);
      const b = withFriends(to);
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
      const me = withFriends(meDoc);
      const them = withFriends(themDoc);
      if (!me.incomingFriendIds.includes(fromId)) throw new Error("No request");
      me.incomingFriendIds = me.incomingFriendIds.filter((id) => id !== fromId);
      them.outgoingFriendIds = them.outgoingFriendIds.filter((id) => id !== userId);
      me.friendIds = [...new Set([...me.friendIds, fromId])];
      them.friendIds = [...new Set([...them.friendIds, userId])];
      users.set(userId, me);
      users.set(fromId, them);
      return { status: "friends" };
    },
  };
}
