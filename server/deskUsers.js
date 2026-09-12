import { USERS } from "../src/data/users.js";
import { bankOf, recordOf } from "./desk.js";
import { getDb } from "./mongo.js";

let mirrored = false;

export function usersFromState(state) {
  if (!state) return [];
  return USERS.map((user) => {
    const rec = recordOf(user.id, state);
    return {
      id: user.id,
      handle: user.handle,
      name: user.name,
      balance: bankOf(user.id, state),
      played: rec.played,
      wins: rec.wins,
      losses: rec.losses,
    };
  });
}

export async function ensureDeskIndexes(db = getDb()) {
  await db.collection("desk_users").createIndex({ id: 1 }, { unique: true });
  await db.collection("desk_ledger").createIndex({ id: 1 }, { unique: true });
  await db.collection("desk_ledger").createIndex({ userId: 1, at: -1 });
}

export async function listDeskUsers(db = getDb()) {
  const users = await db.collection("desk_users").find({}).sort({ id: 1 }).toArray();
  return users.map((row) => ({
    id: row.id,
    handle: row.handle,
    name: row.name,
    balance: row.balance,
    played: row.played,
    wins: row.wins,
    losses: row.losses,
    updatedAt: row.updatedAt,
  }));
}

export async function syncDeskUsers(state, { force = true, db } = {}) {
  if (!state) return { persist: false };
  if (!force && mirrored) return { persist: true, skipped: true };
  const database = db || getDb();
  const now = new Date().toISOString();
  const users = usersFromState(state);
  if (users.length) {
    await database.collection("desk_users").bulkWrite(
      users.map((user) => ({
        updateOne: {
          filter: { id: user.id },
          update: { $set: { ...user, updatedAt: now } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }
  const ledgerOps = (state.ledger || []).map((row, index) => ({
    updateOne: {
      filter: { id: row.id || `row-${index}` },
      update: { $set: { ...row, updatedAt: now } },
      upsert: true,
    },
  }));
  if (ledgerOps.length) {
    await database.collection("desk_ledger").bulkWrite(ledgerOps, { ordered: false });
  }
  mirrored = true;
  return { persist: true, users: users.length, ledger: ledgerOps.length };
}
