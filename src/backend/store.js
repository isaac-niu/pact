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

export function publicDirectoryUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
  };
}

export function publicPact(pact) {
  return {
    id: pact.id,
    title: pact.title,
    stakeLamports: pact.stakeLamports,
    creatorId: pact.creatorId,
    opponentId: pact.opponentId,
    status: pact.status,
    winnerId: pact.winnerId ?? null,
    createdAt: pact.createdAt,
    updatedAt: pact.updatedAt,
  };
}

export function createMemoryStore({ seedDemoUsers = true } = {}) {
  const users = new Map();
  const pacts = new Map();
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
      const user = [...users.values()].find((entry) => entry.authSub === authSub || entry.id === authSub);
      return user ? clone(user) : null;
    },

    async upsertUserFromAuth(profile) {
      const authSub = profile.sub;
      const existing = [...users.values()].find((entry) => entry.authSub === authSub || entry.id === authSub);
      if (existing) {
        existing.lastLoginAt = now();
        if (profile.email) existing.email = profile.email;
        if (profile.name || profile.nickname) existing.name = displayName(profile);
        users.set(existing.id, existing);
        return clone(existing);
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
        .filter((pact) => pact.creatorId === userId || pact.opponentId === userId)
        .map(clone);
    },

    async getPact(id) {
      const pact = pacts.get(id);
      return pact ? clone(pact) : null;
    },

    async createPact({ title, stakeLamports, creatorId, opponentId }) {
      const pact = {
        id: randomUUID(),
        title,
        stakeLamports,
        creatorId,
        opponentId,
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
  };
}
