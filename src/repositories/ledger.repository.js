/**
 * LedgerTransaction repository — MongoDB Atlas persistence layer for SOL ledger entries.
 *
 * Provides CRUD operations with validation and indexes for querying.
 */

import { ObjectId } from "mongodb";
import { getDb } from "../models/db.js";
import {
  createLedgerTransaction,
  validateLedgerTransaction,
} from "../models/ledger.model.js";

/**
 * Find a transaction by ID.
 * @param {string} transactionId
 * @returns {object|null}
 */
export async function findTransactionById(transactionId) {
  if (!transactionId || typeof transactionId !== "string") return null;

  const db = await getDb();
  return db.collection("ledger").findOne({ _id: new ObjectId(transactionId) });
}

/**
 * Find transactions by user (as sender or receiver).
 * @param {string} userId
 * @param {object} [options]
 * @returns {object[]}
 */
export async function findTransactionsByUser(userId, { limit = 50, skip = 0 } = {}) {
  if (!userId || typeof userId !== "string") return [];

  const db = await getDb();
  return db.collection("ledger")
        .find({ $or: [{ fromId: userId }, { toId: userId }] })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
}

/**
 * Find transactions by pact.
 * @param {string} pactId
 * @returns {object[]}
 */
export async function findTransactionsByPact(pactId) {
  if (!pactId || typeof pactId !== "string") return [];

  const db = await getDb();
  return db.collection("ledger")
        .find({ pactId: new ObjectId(pactId) })
        .sort({ createdAt: 1 })
        .toArray();
}

/**
 * Create a new ledger transaction.
 * @param {object} params
 * @returns {object} The created transaction
 */
export async function createTransaction(params) {
  const doc = createLedgerTransaction(params);
  const validationErrors = validateLedgerTransaction(doc);
  if (validationErrors.length > 0) {
    throw new Error(`Transaction validation failed: ${validationErrors.join(", ")}`);
        }

  const db = await getDb();
  const result = await db.collection("ledger").insertOne(doc);
  doc._id = result.insertedId.toString();
  return doc;
}

/**
 * Create a batch of transactions (atomic).
 * @param {object[]} transactions
 * @returns {object[]}
 */
export async function createTransactions(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new Error("transactions must be a non-empty array");
        }

  const db = await getDb();
  const results = await db.collection("ledger").insertMany(transactions);
  return transactions.map((t, i) => ({
        ...t,
        _id: results.insertedIds[i].toString(),
        }));
}

/**
 * Get the net balance for a user.
 * @param {string} userId
 * @returns {number} Net balance in lamports
 */
export async function getUserBalance(userId) {
  if (!userId || typeof userId !== "string") return 0;

  const db = await getDb();
  const pipeline = [
        {
          $match: {
            $or: [
              { fromId: userId },
              { toId: userId },
              ],
            },
          },
        {
          $project: {
            amount: {
              $cond: {
                if: { $eq: ["$fromId", userId] },
                then: { $multiply: ["$amountLamports", -1] },
                else: "$amountLamports",
                },
              },
            },
          },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            },
          },
        },
        ];

  const result = await db.collection("ledger").aggregate(pipeline).toArray();
  return result.length > 0 ? result[0].total : 0;
}

/**
 * List transactions with optional filters.
 * @param {object} [options]
 * @param {string} [options.userId]
 * @param {string} [options.pactId]
 * @param {number} [options.limit=50]
 * @param {number} [options.skip=0]
 * @returns {object[]}
 */
export async function listTransactions({
  userId,
  pactId,
  limit = 50,
  skip = 0,
} = {}) {
  const db = await getDb();
  const query = {};

  if (userId) {
    query.$or = [{ fromId: userId }, { toId: userId }];
      }

  if (pactId) {
    query.pactId = new ObjectId(pactId);
      }

  return db.collection("ledger")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
}

/**
 * Count transactions with optional filters.
 * @param {object} [options]
 * @returns {number}
 */
export async function countTransactions({ userId, pactId } = {}) {
  const db = await getDb();
  const query = {};

  if (userId) {
    query.$or = [{ fromId: userId }, { toId: userId }];
      }

  if (pactId) {
    query.pactId = new ObjectId(pactId);
      }

  return db.collection("ledger").countDocuments(query);
}

/**
 * Delete a transaction by ID.
 * @param {string} transactionId
 * @returns {boolean}
 */
export async function deleteTransaction(transactionId) {
  if (!transactionId || typeof transactionId !== "string") return false;

  const db = await getDb();
  const result = await db.collection("ledger").deleteOne({ _id: new ObjectId(transactionId) });
  return result.deletedCount > 0;
}

export default {
  findTransactionById,
  findTransactionsByUser,
  findTransactionsByPact,
  createTransaction,
  createTransactions,
  getUserBalance,
  listTransactions,
  countTransactions,
  deleteTransaction,
};
