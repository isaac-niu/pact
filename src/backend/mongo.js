import { MongoClient } from "mongodb";

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

export async function ensureIndexes(db) {
  await db.collection("users").createIndexes([
    { key: { id: 1 }, unique: true },
    { key: { authSub: 1 }, unique: true },
  ]);
  await db.collection("pacts").createIndexes([
    { key: { id: 1 }, unique: true },
    { key: { creatorId: 1 } },
    { key: { opponentId: 1 } },
  ]);
  await db.collection("transactions").createIndex({ pactId: 1 });
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
