/**
 * MongoDB Atlas connection module.
 *
 * Uses MONGODB_URI and MONGODB_DB_NAME from the environment.
 * Connection is lazy — the client is created on first use.
 *
 * For testing, set MONGODB_URI to a mongodb-memory-server URI
 * or use the `connectTestDb()` helper.
 */

import { MongoClient, ServerApiVersion } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME ?? "pact";

let client = null;
let db = null;

/**
 * Validate that the MongoDB connection string is present.
 * Returns null when the URI is missing (e.g., during tests).
 */
export function mongoConfigured() {
  return !!(MONGODB_URI && MONGODB_DB_NAME);
}

/**
 * Get the MongoDB client (lazy initialization).
 * Throws if MONGODB_URI is not set.
 */
export async function getMongoClient() {
  if (client && client.topology?.isOpen) {
    return client;
  }

  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. " +
        "Provide a MongoDB Atlas connection string or " +
        "use mongodb-memory-server for testing.",
    );
  }

  client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    // Safe defaults for production
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  await client.connect();
  return client;
}

/**
 * Get the database handle.
 */
export async function getDb() {
  if (db) return db;
  const client = await getMongoClient();
  db = client.db(MONGODB_DB_NAME);
  return db;
}

/**
 * Health check — pings the MongoDB server.
 * Returns { ok: true } on success, or { ok: false, error: string } on failure.
 * Never throws — callers can use this for liveness probes.
 */
export async function healthCheck() {
  try {
    const client = await getMongoClient();
    const result = await client.db("admin").command({ ping: 1 });
    return { ok: true, message: result.ok === 1 ? "pong" : "unexpected" };
  } catch (err) {
    return {
      ok: false,
      error: err.message ?? "unknown error",
    };
  }
}

/**
 * Close the MongoDB connection (useful for tests / graceful shutdown).
 */
export async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

/**
 * Test helper: connect to a mongodb-memory-server instance.
 * Call this before running tests that need a real MongoDB.
 * Returns the database handle.
 */
export async function connectTestDb(memoryClient) {
  if (memoryClient) {
    const uri = await memoryClient.getUri();
    const testClient = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await testClient.connect();
    client = testClient;
    db = testClient.db("pact_test");
    return db;
  }
  throw new Error("connectTestDb requires a mongodb-memory-server instance");
}

export { MONGODB_DB_NAME };
