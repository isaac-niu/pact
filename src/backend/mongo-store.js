import { randomUUID } from "node:crypto";
import { STARTING_BALANCE_LAMPORTS } from "./constants.js";

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
      return withoutMongoId(await users.findOne({ $or: [{ authSub }, { id: authSub }] }));
    },

    async upsertUserFromAuth(profile) {
      const authSub = profile.sub;
      const existing = await users.findOne({ $or: [{ authSub }, { id: authSub }] });
      if (existing) {
        const updates = { lastLoginAt: now() };
        if (profile.email) updates.email = profile.email;
        if (profile.name || profile.nickname) updates.name = displayName(profile);
        await users.updateOne({ id: existing.id }, { $set: updates });
        return withoutMongoId({ ...existing, ...updates });
      }

      const user = {
        id: authSub,
        authSub,
        name: displayName(profile),
        email: profile.email ?? null,
        balanceLamports: STARTING_BALANCE_LAMPORTS,
        createdAt: now(),
        lastLoginAt: now(),
      };
      await users.insertOne(user);
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

    async getPact(id) {
      return withoutMongoId(await pacts.findOne({ id }));
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
  };
}
