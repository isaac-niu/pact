import { MongoClient } from "mongodb";
import { USER_INDEXES } from "./userIdentity.js";

export function redactSecrets(message) {
  return String(message ?? "").replace(/mongodb(\+srv)?:\/\/\S+/gi, "mongodb://***");
}

export function mongoConfigured(environment = process.env) {
  return Boolean(environment.MONGODB_URI && environment.MONGODB_DB_NAME);
}

export async function connectMongo({
  uri = process.env.MONGODB_URI,
  dbName = process.env.MONGODB_DB_NAME,
} = {}) {
  if (!uri || !dbName) {
    throw new Error("MONGODB_URI and MONGODB_DB_NAME are required for Atlas persistence.");
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    await ensureIndexes(db);
    return { client, db };
  } catch (error) {
    await client.close().catch(() => {});
    throw new Error(`MongoDB Atlas connection failed: ${redactSecrets(error.message)}`);
  }
}

export async function repairUserIdentityDocs(db) {
  const users = db.collection("users");
  await users.updateMany({ $or: [{ sub: null }, { sub: "" }, { sub: { $exists: false } }] }, [
    { $set: { sub: { $ifNull: ["$authSub", "$id"] } } },
  ]);
  await users.updateMany(
    { $or: [{ authSub: null }, { authSub: "" }, { authSub: { $exists: false } }] },
    [{ $set: { authSub: { $ifNull: ["$sub", "$id"] } } }],
  );
}

async function recreateIndex(collection, spec) {
  try {
    await collection.dropIndex(spec.name);
  } catch {
    /* index may not exist yet */
  }
  const options = { unique: spec.unique, name: spec.name };
  if (spec.partialFilterExpression) options.partialFilterExpression = spec.partialFilterExpression;
  await collection.createIndex(spec.key, options);
}

export async function ensureIndexes(db) {
  await repairUserIdentityDocs(db);
  const users = db.collection("users");
  for (const spec of USER_INDEXES) {
    await recreateIndex(users, spec);
  }
  await db.collection("pacts").createIndexes([
    { key: { id: 1 }, unique: true },
    { key: { creatorId: 1 } },
    { key: { opponentId: 1 } },
  ]);
  await db.collection("transactions").createIndex({ pactId: 1 });
  await db.collection("transactions").createIndex({ userId: 1, createdAt: -1 });
  await db.collection("groups").createIndex({ id: 1 }, { unique: true });
  await db.collection("groups").createIndex({ joinCode: 1 }, { unique: true });
  await db.collection("messages").createIndex({ threadKey: 1, createdAt: -1 });
}

export async function pingMongo(client) {
  try {
    await client.db("admin").command({ ping: 1 });
    return { configured: true, mode: "atlas", connected: true };
  } catch {
    return { configured: true, mode: "atlas", connected: false };
  }
}

export async function closeMongo(client) {
  if (client) await client.close();
}
