/**
 * User repository — MongoDB Atlas persistence layer for users.
 *
 * Provides CRUD operations with validation and indexes.
 */

import { getDb } from "../models/db.js";
import { createUserDocument, validateUser, upsertUser } from "../models/user.model.js";

/**
 * Find a user by their Auth0 sub.
 * @param {string} authSub
 * @returns {object|null}
 */
export async function findUserByAuthSub(authSub) {
  if (!authSub || typeof authSub !== "string") return null;

  const db = await getDb();
  return db.collection("users").findOne({ authSub: authSub.trim() });
}

/**
 * Find a user by ID.
 * @param {string} userId
 * @returns {object|null}
 */
export async function findUserById(userId) {
  if (!userId || typeof userId !== "string") return null;

  const db = await getDb();
  return db.collection("users").findOne({ _id: userId });
}

/**
 * Find a user by email.
 * @param {string} email
 * @returns {object|null}
 */
export async function findUserByEmail(email) {
  if (!email || typeof email !== "string") return null;

  const db = await getDb();
  return db.collection("users").findOne({ email: email.trim().toLowerCase() });
}

/**
 * Create a new user.
 * @param {object} params
 * @returns {object} The created user
 */
export async function createUser(params) {
  const doc = createUserDocument(params);
  const validationErrors = validateUser(doc);
  if (validationErrors.length > 0) {
    throw new Error(`User validation failed: ${validationErrors.join(", ")}`);
      }

  const db = await getDb();
  const result = await db.collection("users").insertOne(doc);
  doc._id = result.insertedId;
  return doc;
}

/**
 * Upsert a user — update existing or create new.
 * @param {object} params
 * @returns {object} The upserted user
 */
export async function upsertUser(params) {
  const doc = upsertUser(params);
  const validationErrors = validateUser(doc);
  if (validationErrors.length > 0) {
    throw new Error(`User validation failed: ${validationErrors.join(", ")}`);
      }

  const db = await getDb();
  const result = await db.collection("users").findOneAndUpdate(
      { authSub: doc.authSub },
      { $set: doc },
      { upsert: true, returnDocument: "after" },
      );
  return result;
}

/**
 * Update a user's last login timestamp.
 * @param {string} authSub
 * @returns {object|null}
 */
export async function updateLastLogin(authSub) {
  if (!authSub || typeof authSub !== "string") return null;

  const db = await getDb();
  return db.collection("users").findOneAndUpdate(
      { authSub: authSub.trim() },
      { $set: { lastLoginAt: new Date() } },
      { returnDocument: "after" },
      );
}

/**
 * List users with optional pagination.
 * @param {object} [options]
 * @param {number} [options.limit=50]
 * @param {number} [options.skip=0]
 * @returns {object[]}
 */
export async function listUsers({ limit = 50, skip = 0 } = {}) {
  const db = await getDb();
  return db.collection("users")
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
}

/**
 * Count total users.
 * @returns {number}
 */
export async function countUsers() {
  const db = await getDb();
  return db.collection("users").countDocuments();
}

/**
 * Delete a user by ID.
 * @param {string} userId
 * @returns {boolean}
 */
export async function deleteUser(userId) {
  if (!userId || typeof userId !== "string") return false;

  const db = await getDb();
  const result = await db.collection("users").deleteOne({ _id: userId });
  return result.deletedCount > 0;
}

export default {
  findUserByAuthSub,
  findUserById,
  findUserByEmail,
  createUser,
  upsertUser,
  updateLastLogin,
  listUsers,
  countUsers,
  deleteUser,
};
