/**
 * Tests for the User model.
 *
 * These tests verify:
 *       - createUserDocument creates valid user documents
 *       - validateUser catches invalid inputs
 *       - upsertUser updates lastLoginAt
 *       - ObjectId is generated for new users
 */

import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import {
  createUserDocument,
  validateUser,
  upsertUser,
} from "./user.model.js";

describe("User model", () => {
  describe("createUserDocument", () => {
    it("creates a user with all required fields", () => {
      const user = createUserDocument({
        authSub: "auth0|12345",
        email: "user@example.com",
        name: "Test User",
        handle: "testuser",
        picture: "https://example.com/pic.png",
       });

      expect(user).toHaveProperty("_id");
      expect(user._id).toBeInstanceOf(ObjectId);
      expect(user.authSub).toBe("auth0|12345");
      expect(user.email).toBe("user@example.com");
      expect(user.name).toBe("Test User");
      expect(user.handle).toBe("testuser");
      expect(user.picture).toBe("https://example.com/pic.png");
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.lastLoginAt).toBeInstanceOf(Date);
      });

    it("uses defaults for optional fields", () => {
      const user = createUserDocument({ authSub: "auth0|67890" });

      expect(user.email).toBeNull();
      expect(user.name).toBe("Unknown");
      expect(user.handle).toBe("user");
      expect(user.picture).toBeNull();
      });

    it("trims string fields", () => {
      const user = createUserDocument({
        authSub: "  auth0|123  ",
        email: "  user@example.com  ",
        name: "  Test User  ",
        handle: "  testuser  ",
       });

      expect(user.authSub).toBe("auth0|123");
      expect(user.email).toBe("user@example.com");
      expect(user.name).toBe("Test User");
      expect(user.handle).toBe("testuser");
      });

    it("throws when authSub is empty", () => {
      expect(() => createUserDocument({ authSub: "" })).toThrow();
      });

    it("throws when authSub is missing", () => {
      expect(() => createUserDocument({})).toThrow();
      });
    });

  describe("validateUser", () => {
    it("returns empty array for valid user", () => {
      const user = createUserDocument({
        authSub: "auth0|123",
        email: "user@example.com",
        name: "Test User",
        handle: "testuser",
       });

      const errors = validateUser(user);
      expect(errors).toEqual([]);
      });

    it("catches missing authSub", () => {
      const errors = validateUser({});
      expect(errors).toContain("authSub is required");
      });

    it("catches invalid email format", () => {
      const user = createUserDocument({
        authSub: "auth0|123",
        email: "not-an-email",
       });

      const errors = validateUser(user);
      expect(errors).toContain("email has invalid format");
      });

    it("catches empty name", () => {
      const user = createUserDocument({
        authSub: "auth0|123",
        name: "   ",
       });

      const errors = validateUser(user);
      expect(errors).toContain("name must be a non-empty string");
      });

    it("catches empty handle", () => {
      const user = createUserDocument({
        authSub: "auth0|123",
        handle: "   ",
       });

      const errors = validateUser(user);
      expect(errors).toContain("handle must be a non-empty string");
      });
    });

  describe("upsertUser", () => {
    it("updates lastLoginAt on upsert", () => {
      const user = createUserDocument({
        authSub: "auth0|123",
        name: "Test User",
        handle: "testuser",
       });

      const upserted = upsertUser(user);
      expect(upserted.lastLoginAt).toBeInstanceOf(Date);
      });

    it("throws on invalid user", () => {
      expect(() => upsertUser({})).toThrow();
      });
    });
});
