import { MongoClient } from "mongodb";

let client;
let db;
let ready = false;
let lastError = null;

export function mongoConfigured(env = process.env) {
  return Boolean(env.MONGODB_URI);
}

export function mongoReady() {
  return ready;
}

export function mongoError() {
  return lastError;
}

export async function connectMongo(env = process.env) {
  if (!env.MONGODB_URI) {
    ready = false;
    return null;
  }
  if (db && ready) return db;
  try {
    client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    db = client.db(env.MONGO_DB_NAME || env.MONGODB_DB || "pact");
    ready = true;
    lastError = null;
    console.log("mongo connected");
    return db;
  } catch (err) {
    ready = false;
    lastError = err.name;
    console.error("mongo connect failed", err.name);
    return null;
  }
}

export function getDb() {
  if (!ready || !db) throw new Error("mongo_unavailable");
  return db;
}
