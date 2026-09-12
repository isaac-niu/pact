import { randomUUID } from "node:crypto";
import { STARTING_BALANCE_LAMPORTS } from "./constants.js";
import { withIdentity } from "./userIdentity.js";

function now() {
  return Date.now();
}

function displayName(profile) {
  return profile.name || profile.nickname || profile.email || "Pact user";
}

function withoutMongoId(doc) {
  if (!doc) return null;
  const { _id: _ignored, ...rest } = doc;
  return rest;
}

export function createMongoStore(db) {
  const users = db.collection("users");
  const pacts = db.collection("pacts");
  const transactions = db.collection("transactions");
  const groups = db.collection("groups") ?? null;

  return {
    async getUserById(id) {
      return withoutMongoId(await users.findOne({ id }));
    },

    async getUserByAuthSub(authSub) {
      return withoutMongoId(
        await users.findOne({ $or: [{ authSub }, { sub: authSub }, { id: authSub }] }),
      );
    },

    async upsertUserFromAuth(profile) {
      const ident = withIdentity(profile);
      const existing = await users.findOne({
        $or: [{ authSub: ident.authSub }, { sub: ident.sub }, { id: ident.id }],
      });
      if (existing) {
        const updates = {
          lastLoginAt: now(),
          sub: ident.sub,
          authSub: ident.authSub,
        };
        if (profile.email) updates.email = profile.email;
        if (profile.name || profile.nickname) updates.name = displayName(profile);
        await users.updateOne({ id: existing.id }, { $set: updates });
        return withoutMongoId({ ...existing, ...updates });
      }

      const user = withIdentity(
        {
          name: displayName(profile),
          email: profile.email ?? null,
          balanceLamports: STARTING_BALANCE_LAMPORTS,
          createdAt: now(),
          lastLoginAt: now(),
          friendIds: [],
          incomingFriendIds: [],
          outgoingFriendIds: [],
        },
        ident,
      );
      try {
        await users.insertOne(user);
      } catch (error) {
        if (error?.code !== 11000) throw error;
        const raced = await users.findOne({
          $or: [{ authSub: ident.authSub }, { sub: ident.sub }, { id: ident.id }],
        });
        if (raced) return withoutMongoId(raced);
        throw error;
      }
      return withoutMongoId(user);
    },

    async saveUser(user) {
      await users.updateOne({ id: user.id }, { $set: user }, { upsert: true });
      return withoutMongoId(await users.findOne({ id: user.id }));
    },

    async listUsers() {
      return (await users.find({}).toArray()).map(withoutMongoId);
    },

    async listPactsForUser(userId) {
      const memberships = groups ? await groups.find({ memberIds: userId }).project({ id: 1 }).toArray() : [];
      const groupIds = memberships.map((group) => group.id);
      return (
        await pacts
          .find({ $or: [{ creatorId: userId }, { opponentId: userId }, { groupId: { $in: groupIds }, sharedToGroupAt: { $ne: null } }] })
          .toArray()
      ).map(withoutMongoId);
    },

    async createGroup({ name, visibility, discoverable = false, creatorId }) {
      if (!groups) throw new Error("Groups collection is unavailable");
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
      await groups.insertOne(group);
      return withoutMongoId(group);
    },
    async listGroupsForUser(_userId) {
      if (!groups) return [];
      return (await groups.find({}).toArray()).map(withoutMongoId);
    },
    async getGroup(id) { return groups ? withoutMongoId(await groups.findOne({ id })) : null; },
    async getGroupByJoinCode(joinCode) { return groups ? withoutMongoId(await groups.findOne({ joinCode })) : null; },
    async saveGroup(group) { if (!groups) throw new Error("Groups collection is unavailable"); await groups.updateOne({ id: group.id }, { $set: group }, { upsert: true }); return withoutMongoId(group); },
    async deleteGroup(id) { if (!groups) throw new Error("Groups collection is unavailable"); await groups.deleteOne({ id }); return { deleted: true, id }; },

    async getPact(id) {
      return withoutMongoId(await pacts.findOne({ id }));
    },

    async createPact({
      title,
      stakeLamports,
      creatorId,
      opponentId = null,
      groupId = null,
      criteria = null,
      checklist = [],
      deadline = null,
      visibility = "public",
    }) {
      const pact = {
        id: randomUUID(),
        title,
        criteria: criteria ? String(criteria).trim() : null,
        checklist: Array.isArray(checklist) ? checklist : [],
        stakeLamports,
        creatorId,
        opponentId,
        groupId,
        sharedToGroupAt: null,
        status: "draft",
        winnerId: null,
        visibility: visibility === "private" ? "private" : "public",
        deadline: Number(deadline) || null,
        evidenceUrl: null,
        evidenceName: null,
        verdict: null,
        acceptedAt: null,
        provedAt: null,
        resolvedAt: null,
        createdAt: now(),
        updatedAt: now(),
      };
      await pacts.insertOne(pact);
      return withoutMongoId(pact);
    },

    async savePact(pact) {
      const next = { ...pact, updatedAt: now() };
      await pacts.updateOne({ id: pact.id }, { $set: next }, { upsert: true });
      return withoutMongoId(next);
    },

    async addTransaction(entry) {
      const transaction = {
        id: randomUUID(),
        createdAt: now(),
        ...entry,
      };
      await transactions.insertOne(transaction);
      return withoutMongoId(transaction);
    },

    async listTransactionsForUser(userId) {
      const mine = await pacts
        .find({ $or: [{ creatorId: userId }, { opponentId: userId }] })
        .project({ id: 1 })
        .toArray();
      const pactIds = mine.map((pact) => pact.id);
      if (pactIds.length === 0) return [];
      return (await transactions.find({ pactId: { $in: pactIds } }).toArray()).map(withoutMongoId);
    },

    async requestFriend(fromId, toId) {
      if (fromId === toId) throw new Error("Cannot friend yourself");
      const fromDoc = await users.findOne({ id: fromId });
      const toDoc = await users.findOne({ id: toId });
      if (!fromDoc || !toDoc) throw new Error("User not found");
      const from = withFriends(fromDoc);
      const to = withFriends(toDoc);
      if (from.friendIds.includes(toId)) return { status: "friends" };
      from.outgoingFriendIds = [...new Set([...from.outgoingFriendIds, toId])];
      to.incomingFriendIds = [...new Set([...to.incomingFriendIds, fromId])];
      await users.updateOne({ id: fromId }, { $set: { outgoingFriendIds: from.outgoingFriendIds } });
      await users.updateOne({ id: toId }, { $set: { incomingFriendIds: to.incomingFriendIds } });
      return { status: "requested" };
    },

    async acceptFriend(userId, fromId) {
      const meDoc = await users.findOne({ id: userId });
      const themDoc = await users.findOne({ id: fromId });
      if (!meDoc || !themDoc) throw new Error("User not found");
      const me = withFriends(meDoc);
      const them = withFriends(themDoc);
      if (!me.incomingFriendIds.includes(fromId)) throw new Error("No request");
      me.incomingFriendIds = me.incomingFriendIds.filter((id) => id !== fromId);
      them.outgoingFriendIds = them.outgoingFriendIds.filter((id) => id !== userId);
      me.friendIds = [...new Set([...me.friendIds, fromId])];
      them.friendIds = [...new Set([...them.friendIds, userId])];
      await users.updateOne(
        { id: userId },
        { $set: { incomingFriendIds: me.incomingFriendIds, friendIds: me.friendIds } },
      );
      await users.updateOne(
        { id: fromId },
        { $set: { outgoingFriendIds: them.outgoingFriendIds, friendIds: them.friendIds } },
      );
      return { status: "friends" };
    },
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
