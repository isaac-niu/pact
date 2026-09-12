import { MongoClient, GridFSBucket, ObjectId } from "mongodb";

let client = null;
let connecting = null;
let lastError = null;

export function mongoUri(env = process.env) {
  return env.MONGODB_URI || "";
}

export function mongoDbName(env = process.env) {
  return env.MONGODB_DB_NAME || env.MONGO_DB_NAME || "pact";
}

export function mongoConfigured(env = process.env) {
  return Boolean(mongoUri(env));
}

export async function getMongo(env = process.env) {
  if (client) return { client, db: client.db(mongoDbName(env)) };
  if (!mongoConfigured(env)) {
    throw new Error("mongo_unconfigured");
  }
  if (!connecting) {
    connecting = (async () => {
      const next = new MongoClient(mongoUri(env), {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 4000,
      });
      await next.connect();
      client = next;
      lastError = null;
      return client;
    })().catch((err) => {
      connecting = null;
      lastError = err?.message || String(err);
      throw err;
    });
  }
  const ready = await connecting;
  return { client: ready, db: ready.db(mongoDbName(env)) };
}

export async function mongoReady() {
  if (!mongoConfigured()) return false;
  try {
    const { db } = await getMongo();
    await db.command({ ping: 1 });
    return true;
  } catch (err) {
    lastError = err?.message || String(err);
    return false;
  }
}

export function mongoError() {
  return lastError;
}

export function evidenceBucket(db) {
  return new GridFSBucket(db, { bucketName: "evidence" });
}

export { ObjectId };
