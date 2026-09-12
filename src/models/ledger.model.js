/**
 * LedgerTransaction model — MongoDB Atlas schema for SOL ledger entries.
 *
 * Fields:
 *     _id:           ObjectId (stable, never changes)
 *     amountLamports: integer (positive for credits, negative for debits)
 *     fromId:        string | null (sender user ID)
 *     toId:          string | null (receiver user ID)
 *     description:   string (human-readable description)
 *     pactId:        ObjectId | null (reference to the pact)
 *     createdAt:     ISODate
 *
 * Indexes:
 *     - fromId + createdAt — user's transaction history
 *     - toId + createdAt — user's transaction history
 *     - pactId — find all transactions for a pact
 *     - createdAt — chronological ledger
 *
 * Monetary values are stored as integer lamports (non-negative for
 * absolute amounts; signed for net flow).
 */

import { ObjectId } from "mongodb";

/**
 * Valid transaction types.
 */
export const TRANSACTION_TYPES = Object.freeze({
  STAKE_LOCK: "stake_lock",
  STAKE_RELEASE: "stake_release",
  PAYOUT: "payout",
  REFUND: "refund",
});

/**
 * Validate a lamports amount.
 * @param {number} amountLamports
 * @returns {string[]} Validation errors (empty if valid)
 */
export function validateAmountLamports(amountLamports) {
  const errors = [];

  if (typeof amountLamports !== "number" || isNaN(amountLamports)) {
    errors.push("amountLamports must be a number");
     } else if (!Number.isInteger(amountLamports)) {
    errors.push("amountLamports must be an integer");
     } else if (amountLamports === 0) {
    errors.push("amountLamports must be non-zero");
     }

  return errors;
}

/**
 * Create a new ledger transaction document.
 * @param {object} params
 * @param {number} params.amountLamports - Amount in lamports (signed: positive = credit, negative = debit)
 * @param {string} [params.fromId] - Sender user ID
 * @param {string} [params.toId] - Receiver user ID
 * @param {string} params.description - Human-readable description
 * @param {string} [params.pactId] - Pact ID reference
 * @returns {object} The ledger transaction document
 */
export function createLedgerTransaction({
  amountLamports,
  fromId = null,
  toId = null,
  description = "",
  pactId = null,
} = {}) {
  const amountErrors = validateAmountLamports(amountLamports);
  if (amountErrors.length > 0) {
    throw new Error(`Amount validation failed: ${amountErrors.join(", ")}`);
     }

  if (typeof description !== "string" || description.trim() === "") {
    throw new Error("description is required and must be a non-empty string");
     }

  if (fromId !== null && fromId !== undefined) {
    if (typeof fromId !== "string" || fromId.trim() === "") {
      throw new Error("fromId must be a non-empty string or null");
       }
     }

  if (toId !== null && toId !== undefined) {
    if (typeof toId !== "string" || toId.trim() === "") {
      throw new Error("toId must be a non-empty string or null");
       }
     }

  if (pactId !== null && pactId !== undefined) {
    if (!(pactId instanceof ObjectId)) {
      throw new Error("pactId must be an ObjectId or null");
       }
     }

  return {
     _id: new ObjectId(),
    amountLamports: amountLamports,
    fromId: fromId ? fromId.trim() : null,
    toId: toId ? toId.trim() : null,
    description: description.trim(),
    pactId: pactId,
    createdAt: new Date(),
     };
}

/**
 * Validate a ledger transaction document.
 * @param {object} transaction
 * @returns {string[]} Array of validation error messages (empty if valid)
 */
export function validateLedgerTransaction(transaction) {
  const errors = [];

  if (!transaction._id || !(transaction._id instanceof ObjectId)) {
    errors.push("_id must be an ObjectId");
     }

  const amountErrors = validateAmountLamports(transaction.amountLamports);
  if (amountErrors.length > 0) {
    errors.push(...amountErrors);
     }

  if (transaction.fromId !== null && transaction.fromId !== undefined) {
    if (typeof transaction.fromId !== "string" || transaction.fromId.trim() === "") {
      errors.push("fromId must be a non-empty string or null");
       }
     }

  if (transaction.toId !== null && transaction.toId !== undefined) {
    if (typeof transaction.toId !== "string" || transaction.toId.trim() === "") {
      errors.push("toId must be a non-empty string or null");
       }
     }

  if (typeof transaction.description !== "string" || transaction.description.trim() === "") {
    errors.push("description must be a non-empty string");
     }

  if (transaction.pactId !== null && transaction.pactId !== undefined) {
    if (!(transaction.pactId instanceof ObjectId)) {
      errors.push("pactId must be an ObjectId or null");
       }
     }

  return errors;
}

/**
 * Create a paired stake transaction (lock + release).
 * @param {object} params
 * @param {number} params.stakeLamports - Stake per side in lamports
 * @param {string} params.creatorId - Creator user ID
 * @param {string} params.opponentId - Opponent user ID
 * @param {string} params.pactId - Pact ID
 * @returns {object[]} Array of two transaction documents
 */
export function createStakeTransactions({
  stakeLamports,
  creatorId,
  opponentId,
  pactId,
} = {}) {
  const amountErrors = validateAmountLamports(stakeLamports);
  if (amountErrors.length > 0) {
    throw new Error(`Stake validation failed: ${amountErrors.join(", ")}`);
     }

  if (!creatorId || typeof creatorId !== "string" || creatorId.trim() === "") {
    throw new Error("creatorId is required");
     }

  if (!opponentId || typeof opponentId !== "string" || opponentId.trim() === "") {
    throw new Error("opponentId is required");
     }

  if (!pactId || !(pactId instanceof ObjectId)) {
    throw new Error("pactId must be an ObjectId");
     }

  const now = new Date();

  return [
     {
       _id: new ObjectId(),
      amountLamports: stakeLamports,
      fromId: creatorId,
      toId: null,
      description: `Stake lock: ${creatorId} → pot`,
      pactId: pactId,
      createdAt: now,
       },
     {
       _id: new ObjectId(),
      amountLamports: stakeLamports,
      fromId: opponentId,
      toId: null,
      description: `Stake lock: ${opponentId} → pot`,
      pactId: pactId,
      createdAt: now,
       },
     ];
}

/**
 * Create a payout transaction (winner takes the pot).
 * @param {object} params
 * @param {number} params.totalPotLamports - Total pot in lamports
 * @param {string} params.winnerId - Winner user ID
 * @param {string} params.pactId - Pact ID
 * @returns {object} The payout transaction document
 */
export function createPayoutTransaction({
  totalPotLamports,
  winnerId,
  pactId,
} = {}) {
  const amountErrors = validateAmountLamports(totalPotLamports);
  if (amountErrors.length > 0) {
    throw new Error(`Payout validation failed: ${amountErrors.join(", ")}`);
     }

  if (!winnerId || typeof winnerId !== "string" || winnerId.trim() === "") {
    throw new Error("winnerId is required");
     }

  if (!pactId || !(pactId instanceof ObjectId)) {
    throw new Error("pactId must be an ObjectId");
     }

  return {
     _id: new ObjectId(),
    amountLamports: totalPotLamports,
    fromId: null,
    toId: winnerId,
    description: `Payout: Winner ${winnerId} takes ${totalPotLamports} lamports`,
    pactId: pactId,
    createdAt: new Date(),
     };
}

export default {
  TRANSACTION_TYPES,
  validateAmountLamports,
  createLedgerTransaction,
  validateLedgerTransaction,
  createStakeTransactions,
  createPayoutTransaction,
};
