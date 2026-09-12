import { MongoClient, GridFSBucket, ObjectId } from "mongodb";

let client = null;
let db = null;
let connecting = null;
let ready = false;
let lastError = null;

export function mongoUri(env = process.env) {
  return env.MONGODB_URI || "";
}

export function mongoDbName(env = process.env) {
  return env.MONGODB_DB_NAME || env.MONGO_DB_NAME || env.MONGODB_DB || "pact";
}

export function mongoConfigured(env = process.env) {
  return Boolean(mongoUri(env));
}

/** Sync flag used by the Person D desk server. */
export function mongoReady() {
  return ready;
}

export async function getMongo(env = process.env) {
  if (client && ready) return { client, db: db || client.db(mongoDbName(env)) };
  if (!mongoConfigured(env)) {
    throw new Error("mongo_unconfigured");
  }
  if (!connecting) {
    connecting = (async () => {
      const next = new MongoClient(mongoUri(env), {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 8000,
      });
      await next.connect();
      client = next;
      db = next.db(mongoDbName(env));
      try {
        await db.collection("desk_users").createIndex({ id: 1 }, { unique: true });
        await db.collection("desk_ledger").createIndex({ userId: 1, at: -1 });
        await db.collection("desk_ledger").createIndex({ id: 1 }, { unique: true });
      } catch {
        /* indexes are best-effort */
      }
      ready = true;
      lastError = null;
      return client;
    })().catch((err) => {
      connecting = null;
      ready = false;
      lastError = err?.name || err?.message || String(err);
      throw err;
    });
  }
  const connected = await connecting;
  return { client: connected, db: db || connected.db(mongoDbName(env)) };
}

export async function connectMongo(env = process.env) {
  if (!mongoConfigured(env)) {
    ready = false;
    return null;
  }
  try {
    const got = await getMongo(env);
    ready = true;
    db = got.db;
    lastError = null;
    console.log("mongo connected");
    return db;
  } catch (err) {
    ready = false;
    lastError = err.name || err.message;
    console.error("mongo connect failed", lastError);
    return null;
  }
}

export function getDb() {
  if (!ready || !db) throw new Error("mongo_unavailable");
  return db;
}

export function mongoError() {
  return lastError;
}

export function evidenceBucket(database) {
  return new GridFSBucket(database, { bucketName: "evidence" });
}

export { ObjectId };
