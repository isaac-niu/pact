/**
 * Pact repository — MongoDB Atlas persistence layer for pacts.
 *
 * Provides CRUD operations with validation, status transitions,
 * and useful indexes for querying.
 */

import { ObjectId } from "mongodb";
import { getDb } from "../models/db.js";
import {
  createPactDocument,
  validatePact,
  canTransition,
  transitionPact,
} from "../models/pact.model.js";

/**
 * Find a pact by ID.
 * @param {string} pactId
 * @returns {object|null}
 */
export async function findPactById(pactId) {
  if (!pactId || typeof pactId !== "string") return null;

  const db = await getDb();
  return db.collection("pacts").findOne({ _id: new ObjectId(pactId) });
}

/**
 * Find pacts by status.
 * @param {string} status
 * @returns {object[]}
 */
export async function findPactsByStatus(status) {
  const db = await getDb();
  return db.collection("pacts")
       .find({ status })
       .sort({ createdAt: -1 })
       .toArray();
}

/**
 * Find pacts by creator.
 * @param {string} creatorId
 * @param {object} [options]
 * @returns {object[]}
 */
export async function findPactsByCreator(creatorId, { status } = {}) {
  const db = await getDb();
  const query = { creatorId };
  if (status) query.status = status;

  return db.collection("pacts")
       .find(query)
       .sort({ createdAt: -1 })
       .toArray();
}

/**
 * Find pacts by opponent.
 * @param {string} opponentId
 * @param {object} [options]
 * @returns {object[]}
 */
export async function findPactsByOpponent(opponentId, { status } = {}) {
  const db = await getDb();
  const query = { opponentId };
  if (status) query.status = status;

  return db.collection("pacts")
       .find(query)
       .sort({ createdAt: -1 })
       .toArray();
}

/**
 * Create a new pact.
 * @param {object} params
 * @returns {object} The created pact
 */
export async function createPact(params) {
  const doc = createPactDocument(params);
  const validationErrors = validatePact(doc);
  if (validationErrors.length > 0) {
    throw new Error(`Pact validation failed: ${validationErrors.join(", ")}`);
       }

  const db = await getDb();
  const result = await db.collection("pacts").insertOne(doc);
  doc._id = result.insertedId.toString();
  return doc;
}

/**
 * Update a pact's status with validation.
 * @param {string} pactId
 * @param {string} newStatus
 * @returns {object|null}
 */
export async function updatePactStatus(pactId, newStatus) {
  if (!pactId || typeof pactId !== "string") return null;
  if (!newStatus || typeof newStatus !== "string") return null;

  const db = await getDb();
  const pact = await db.collection("pacts").findOne({ _id: new ObjectId(pactId) });
  if (!pact) return null;

  if (!canTransition(pact.status, newStatus)) {
    throw new Error(
       `Invalid transition: ${pact.status} → ${newStatus}`,
      );
       }

  const updated = transitionPact(pact, newStatus);
  await db.collection("pacts").findOneAndUpdate(
       { _id: new ObjectId(pactId) },
       { $set: updated },
       { returnDocument: "after" },
       );

  return updated;
}

/**
 * Set evidence on a pact.
 * @param {string} pactId
 * @param {string} evidenceUrl
 * @param {string} evidenceName
 * @returns {object|null}
 */
export async function setEvidence(pactId, evidenceUrl, evidenceName) {
  if (!pactId || typeof pactId !== "string") return null;

  const db = await getDb();
  const result = await db.collection("pacts").findOneAndUpdate(
       { _id: new ObjectId(pactId) },
       {
         $set: {
           evidenceUrl,
           evidenceName,
           updatedAt: new Date(),
           },
         },
       { returnDocument: "after" },
       );

  return result;
}

/**
 * Set a verdict on a resolved pact.
 * @param {string} pactId
 * @param {object} verdict
 * @param {string} winnerId
 * @returns {object|null}
 */
export async function setVerdict(pactId, verdict, winnerId) {
  if (!pactId || typeof pactId !== "string") return null;

  const db = await getDb();
  const result = await db.collection("pacts").findOneAndUpdate(
       { _id: new ObjectId(pactId) },
       {
         $set: {
           verdict,
           winnerId,
           status: "resolved",
           updatedAt: new Date(),
           resolvedAt: new Date(),
           },
         },
       { returnDocument: "after" },
       );

  return result;
}

/**
 * List pacts with optional filters.
 * @param {object} [options]
 * @param {string} [options.status]
 * @param {string} [options.creatorId]
 * @param {string} [options.opponentId]
 * @param {number} [options.limit=50]
 * @param {number} [options.skip=0]
 * @returns {object[]}
 */
export async function listPacts({
  status,
  creatorId,
  opponentId,
  limit = 50,
  skip = 0,
} = {}) {
  const db = await getDb();
  const query = {};
  if (status) query.status = status;
  if (creatorId) query.creatorId = creatorId;
  if (opponentId) query.opponentId = opponentId;

  return db.collection("pacts")
       .find(query)
       .sort({ createdAt: -1 })
       .skip(skip)
       .limit(limit)
       .toArray();
}

/**
 * Count pacts with optional filters.
 * @param {object} [options]
 * @returns {number}
 */
export async function countPacts({ status, creatorId, opponentId } = {}) {
  const db = await getDb();
  const query = {};
  if (status) query.status = status;
  if (creatorId) query.creatorId = creatorId;
  if (opponentId) query.opponentId = opponentId;

  return db.collection("pacts").countDocuments(query);
}

/**
 * Delete a pact by ID.
 * @param {string} pactId
 * @returns {boolean}
 */
export async function deletePact(pactId) {
  if (!pactId || typeof pactId !== "string") return false;

  const db = await getDb();
  const result = await db.collection("pacts").deleteOne({ _id: new ObjectId(pactId) });
  return result.deletedCount > 0;
}

export default {
  findPactById,
  findPactsByStatus,
  findPactsByCreator,
  findPactsByOpponent,
  createPact,
  updatePactStatus,
  setEvidence,
  setVerdict,
  listPacts,
  countPacts,
  deletePact,
};
