/**
 * User model — MongoDB Atlas schema for application users.
 *
 * Fields:
 *   - _id:          ObjectId (stable, never changes)
 *   - authSub:      string (Auth0 sub identifier)
 *   - email:        string | null
 *   - name:         string
 *   - handle:       string (display handle)
 *   - picture:      string | null
 *   - createdAt:    ISODate
 *   - lastLoginAt:  ISODate
 *
 * Indexes:
 *   - authSub (unique) — fast lookup by Auth0 sub
 *   - email (sparse unique) — prevent duplicate emails
 *   - handle (unique) — unique handles
 */

import { ObjectId } from "mongodb";

/**
 * Create a new user document.
 * @param {object} params
 * @param {string} params.authSub - Auth0 sub identifier
 * @param {string} [params.email]
 * @param {string} [params.name]
 * @param {string} [params.handle]
 * @param {string} [params.picture]
 * @returns {object} The user document
 */
export function createUserDocument({
  authSub,
  email = null,
  name = "Unknown",
  handle = "user",
  picture = null,
} = {}) {
  if (!authSub || typeof authSub !== "string" || authSub.trim() === "") {
    throw new Error("authSub is required and must be a non-empty string");
   }

  return {
    _id: new ObjectId(),
    authSub: authSub.trim(),
    email: email ? email.trim() : null,
    name: name.trim() || "Unknown",
    handle: handle.trim() || "user",
    picture: picture ?? null,
    createdAt: new Date(),
    lastLoginAt: new Date(),
   };
}

/**
 * Validate a user document before saving.
 * @param {object} user
 * @returns {string[]} Array of validation error messages (empty if valid)
 */
export function validateUser(user) {
  const errors = [];

  if (!user.authSub || typeof user.authSub !== "string" || user.authSub.trim() === "") {
    errors.push("authSub is required");
   }

  if (user.email !== null && user.email !== undefined) {
    if (typeof user.email !== "string") {
      errors.push("email must be a string or null");
     } else if (user.email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.push("email has invalid format");
     }
   }

  if (typeof user.name !== "string" || user.name.trim() === "") {
    errors.push("name must be a non-empty string");
   }

  if (typeof user.handle !== "string" || user.handle.trim() === "") {
    errors.push("handle must be a non-empty string");
   }

  if (user.picture !== null && user.picture !== undefined) {
    if (typeof user.picture !== "string") {
      errors.push("picture must be a string or null");
     }
   }

  return errors;
}

/**
 * Upsert a user — update existing or create new.
 * @param {object} user
 * @returns {object} The upserted user document
 */
export function upsertUser(user) {
  const validationErrors = validateUser(user);
  if (validationErrors.length > 0) {
    throw new Error(`User validation failed: ${validationErrors.join(", ")}`);
   }

  return {
    ...user,
    lastLoginAt: new Date(),
   };
}

export default { createUserDocument, validateUser, upsertUser };
