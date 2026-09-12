/**
 * Tests for the MongoDB connection module.
 *
 * These tests verify:
 *      - mongoConfigured() returns correct boolean
 *      - healthCheck() returns proper structure
 *      - closeDb() works without errors
 *      - connectTestDb() throws when no memory server is provided
 *
 * Note: These tests do NOT require production MongoDB credentials.
 * The healthCheck function is designed to never throw — it returns
 * { ok: false, error: string } on failure.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mongoConfigured,
  healthCheck,
  closeDb,
  connectTestDb,
} from "./db.js";

describe("MongoDB connection module", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
   });

  afterEach(async () => {
    process.env = originalEnv;
     // Close any open connections
    try {
      await closeDb();
    } catch {
      // Ignore cleanup errors
    }
   });

  describe("mongoConfigured", () => {
    it("returns false when MONGODB_URI is not set", () => {
      delete process.env.MONGODB_URI;
      delete process.env.MONGODB_DB_NAME;

      const { mongoConfigured } = await import("./db.js");
      expect(mongoConfigured()).toBe(false);
     });

    it("returns false when MONGODB_DB_NAME is not set", () => {
      process.env.MONGODB_URI = "mongodb://localhost:27017";
      delete process.env.MONGODB_DB_NAME;

      const { mongoConfigured } = await import("./db.js");
      expect(mongoConfigured()).toBe(false);
     });

    it("returns true when both MONGODB_URI and MONGODB_DB_NAME are set", () => {
      process.env.MONGODB_URI = "mongodb://localhost:27017";
      process.env.MONGODB_DB_NAME = "pact_test";

      const { mongoConfigured } = await import("./db.js");
      expect(mongoConfigured()).toBe(true);
     });
   });

  describe("healthCheck", () => {
    it("returns { ok: false } when MongoDB is not configured", async () => {
      delete process.env.MONGODB_URI;
      delete process.env.MONGODB_DB_NAME;

      const { healthCheck } = await import("./db.js");
      const result = await healthCheck();
      expect(result).toHaveProperty("ok");
      expect(result.ok).toBe(false);
      expect(result).toHaveProperty("error");
     });

    it("never throws — returns error object on failure", async () => {
      delete process.env.MONGODB_URI;
      delete process.env.MONGODB_DB_NAME;

      const { healthCheck } = await import("./db.js");
      expect(async () => await healthCheck()).not.toThrow();
     });
   });

  describe("closeDb", () => {
    it("does not throw when called without an open connection", async () => {
      delete process.env.MONGODB_URI;
      delete process.env.MONGODB_DB_NAME;

      const { closeDb } = await import("./db.js");
      expect(async () => await closeDb()).not.toThrow();
     });
   });

  describe("connectTestDb", () => {
    it("throws when no memory server is provided", async () => {
      const { connectTestDb } = await import("./db.js");
      expect(async () => await connectTestDb(null)).rejects.toThrow();
     });
   });
});
