/**
 * Pact model — MongoDB Atlas schema for 1v1 challenge pacts.
 *
 * Fields:
 *    - _id:           ObjectId (stable, never changes)
 *    - title:         string (the challenge description)
 *    - stakeLamports: integer (stake per side in lamports; 1 SOL = 1_000_000_000 lamports)
 *    - creatorId:     string (user ID / Auth0 sub)
 *    - opponentId:    string (user ID / Auth0 sub)
 *    - status:        string (one of the STATUS constants)
 *    - evidenceUrl:   string | null
 *    - evidenceName:  string | null
 *    - verdict:       object | null
 *    - winnerId:      string | null
 *    - createdAt:     ISODate
 *    - updatedAt:     ISODate
 *    - acceptedAt:    ISODate | null
 *    - resolvedAt:    ISODate | null
 *
 * Status transitions (explicit):
 *    open → accepted → evidence → judging → resolved
 *    open → cancelled (by creator before acceptance)
 *    accepted → cancelled (by mutual agreement)
 *
 * Indexes:
 *    - creatorId + status — find open pacts by creator
 *    - opponentId + status — find pacts awaiting opponent
 *    - status — aggregate by status
 *    - createdAt — chronological feed
 *
 * Monetary values are stored as integer lamports (non-negative).
 * SOL amounts are validated as non-negative integers.
 */

import { ObjectId } from "mongodb";

/**
 * Valid pact statuses in order of the state machine.
 */
export const PACT_STATUSES = Object.freeze({
  OPEN: "open",
  ACCEPTED: "accepted",
  EVIDENCE: "evidence",
  JUDGING: "judging",
  RESOLVED: "resolved",
  CANCELLED: "cancelled",
});

/**
 * Valid transitions: from → [to, ...]
 */
export const PACT_TRANSITIONS = Object.freeze({
  [PACT_STATUSES.OPEN]: [PACT_STATUSES.ACCEPTED, PACT_STATUSES.CANCELLED],
  [PACT_STATUSES.ACCEPTED]: [PACT_STATUSES.EVIDENCE, PACT_STATUSES.CANCELLED],
  [PACT_STATUSES.EVIDENCE]: [PACT_STATUSES.JUDGING],
  [PACT_STATUSES.JUDGING]: [PACT_STATUSES.RESOLVED],
  [PACT_STATUSES.RESOLVED]: [],
  [PACT_STATUSES.CANCELLED]: [],
});

/**
 * Lamports per SOL (1 SOL = 1,000,000,000 lamports).
 * Use this constant to convert between SOL and lamports.
 */
export const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Convert SOL (float) to lamports (integer).
 * @param {number} sol - SOL amount (may be float)
 * @returns {number} Lamports as integer
 */
export function solToLamports(sol) {
  if (typeof sol !== "number" || isNaN(sol)) {
    throw new Error("SOL amount must be a number");
    }
  return Math.round(sol * LAMPORTS_PER_SOL);
}

/**
 * Convert lamports (integer) to SOL (float).
 * @param {number} lamports - Lamports as integer
 * @returns {number} SOL as float
 */
export function lamportsToSol(lamports) {
  if (typeof lamports !== "number" || !Number.isInteger(lamports)) {
    throw new Error("Lamports must be an integer");
    }
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Validate a stake amount in lamports.
 * @param {number} lamports
 * @returns {string[]} Validation errors (empty if valid)
 */
export function validateStakeLamports(lamports) {
  const errors = [];

  if (typeof lamports !== "number" || isNaN(lamports)) {
    errors.push("stake must be a number");
    } else if (!Number.isInteger(lamports)) {
    errors.push("stake must be an integer (lamports)");
    } else if (lamports < 0) {
    errors.push("stake must be non-negative");
    }

  return errors;
}

/**
 * Create a new pact document.
 * @param {object} params
 * @param {string} params.title - Challenge description
 * @param {number} params.stakeLamports - Stake per side in lamports (integer)
 * @param {string} params.creatorId - User ID of the creator
 * @param {string} params.opponentId - User ID of the opponent
 * @returns {object} The pact document
 */
export function createPactDocument({
  title,
  stakeLamports,
  creatorId,
  opponentId,
} = {}) {
  const stakeErrors = validateStakeLamports(stakeLamports);
  if (stakeErrors.length > 0) {
    throw new Error(`Stake validation failed: ${stakeErrors.join(", ")}`);
    }

  if (!title || typeof title !== "string" || title.trim() === "") {
    throw new Error("title is required and must be a non-empty string");
    }

  if (!creatorId || typeof creatorId !== "string" || creatorId.trim() === "") {
    throw new Error("creatorId is required and must be a non-empty string");
    }

  if (!opponentId || typeof opponentId !== "string" || opponentId.trim() === "") {
    throw new Error("opponentId is required and must be a non-empty string");
    }

  if (creatorId === opponentId) {
    throw new Error("creatorId and opponentId must be different");
    }

  return {
    _id: new ObjectId(),
    title: title.trim(),
    stakeLamports: stakeLamports,
    creatorId: creatorId.trim(),
    opponentId: opponentId.trim(),
    status: PACT_STATUSES.OPEN,
    evidenceUrl: null,
    evidenceName: null,
    verdict: null,
    winnerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    acceptedAt: null,
    resolvedAt: null,
    };
}

/**
 * Validate a pact document before saving.
 * @param {object} pact
 * @returns {string[]} Array of validation error messages (empty if valid)
 */
export function validatePact(pact) {
  const errors = [];

  if (!pact._id || !(pact._id instanceof ObjectId)) {
    errors.push("_id must be an ObjectId");
    }

  if (typeof pact.title !== "string" || pact.title.trim() === "") {
    errors.push("title must be a non-empty string");
    }

  const stakeErrors = validateStakeLamports(pact.stakeLamports);
  if (stakeErrors.length > 0) {
    errors.push(...stakeErrors);
    }

  if (typeof pact.creatorId !== "string" || pact.creatorId.trim() === "") {
    errors.push("creatorId must be a non-empty string");
    }

  if (typeof pact.opponentId !== "string" || pact.opponentId.trim() === "") {
    errors.push("opponentId must be a non-empty string");
    }

  if (pact.creatorId === pact.opponentId) {
    errors.push("creatorId and opponentId must be different");
    }

  if (pact.status && !Object.values(PACT_STATUSES).includes(pact.status)) {
    errors.push(`status must be one of: ${Object.values(PACT_STATUSES).join(", ")}`);
    }

  if (pact.evidenceUrl !== null && pact.evidenceUrl !== undefined) {
    if (typeof pact.evidenceUrl !== "string") {
      errors.push("evidenceUrl must be a string or null");
      }
    }

  if (pact.evidenceName !== null && pact.evidenceName !== undefined) {
    if (typeof pact.evidenceName !== "string") {
      errors.push("evidenceName must be a string or null");
      }
    }

  if (pact.verdict !== null && pact.verdict !== undefined) {
    if (typeof pact.verdict !== "object" || Array.isArray(pact.verdict)) {
      errors.push("verdict must be an object or null");
      }
    }

  if (pact.winnerId !== null && pact.winnerId !== undefined) {
    if (typeof pact.winnerId !== "string") {
      errors.push("winnerId must be a string or null");
      }
    }

  return errors;
}

/**
 * Check if a status transition is valid.
 * @param {string} fromStatus
 * @param {string} toStatus
 * @returns {boolean}
 */
export function canTransition(fromStatus, toStatus) {
  const validTransitions = PACT_TRANSITIONS[fromStatus];
  if (!validTransitions) return false;
  return validTransitions.includes(toStatus);
}

/**
 * Transition a pact to a new status with validation.
 * @param {object} pact
 * @param {string} newStatus
 * @returns {object} The updated pact
 */
export function transitionPact(pact, newStatus) {
  if (!canTransition(pact.status, newStatus)) {
    throw new Error(
       `Invalid transition: ${pact.status} → ${newStatus}. ` +
         `Valid transitions from ${pact.status}: ` +
         `${(PACT_TRANSITIONS[pact.status] || []).join(", ") || "none"}`,
     );
    }

  const updates = {
     ...pact,
    status: newStatus,
    updatedAt: new Date(),
    };

  // Set status-specific timestamps
  if (newStatus === PACT_STATUSES.ACCEPTED) {
    updates.acceptedAt = new Date();
    }

  if (newStatus === PACT_STATUSES.RESOLVED) {
    updates.resolvedAt = new Date();
    }

  return updates;
}

export default {
  PACT_STATUSES,
  PACT_TRANSITIONS,
  LAMPORTS_PER_SOL,
  solToLamports,
  lamportsToSol,
  validateStakeLamports,
  createPactDocument,
  validatePact,
  canTransition,
  transitionPact,
};
