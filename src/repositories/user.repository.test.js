/**
 * Tests for the User repository.
 *
 * These tests verify:
 *         - Repository functions accept and validate inputs correctly
 *         - Repository functions handle null/undefined inputs gracefully
 *         - Repository functions return expected types
 *
 * Note: These tests do NOT require production MongoDB credentials.
 * They test the repository interface and validation logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ObjectId } from "mongodb";
import * as userRepository from "./user.repository.js";

describe("User repository", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    });

  afterEach(() => {
    process.env = originalEnv;
    });

  describe("findUserByAuthSub", () => {
    it("returns null when authSub is empty", async () => {
      const result = await userRepository.findUserByAuthSub("");
      expect(result).toBeNull();
        });

    it("returns null when authSub is undefined", async () => {
      const result = await userRepository.findUserByAuthSub(undefined);
      expect(result).toBeNull();
        });

    it("returns null when authSub is null", async () => {
      const result = await userRepository.findUserByAuthSub(null);
      expect(result).toBeNull();
        });
      });

  describe("findUserById", () => {
    it("returns null when userId is empty", async () => {
      const result = await userRepository.findUserById("");
      expect(result).toBeNull();
        });

    it("returns null when userId is undefined", async () => {
      const result = await userRepository.findUserById(undefined);
      expect(result).toBeNull();
        });
      });

  describe("findUserByEmail", () => {
    it("returns null when email is empty", async () => {
      const result = await userRepository.findUserByEmail("");
      expect(result).toBeNull();
        });

    it("returns null when email is undefined", async () => {
      const result = await userRepository.findUserByEmail(undefined);
      expect(result).toBeNull();
        });
      });

  describe("createUser", () => {
    it("throws when authSub is missing", async () => {
      await expect(
        userRepository.createUser({}),
         ).rejects.toThrow();
        });

    it("throws when authSub is empty", async () => {
      await expect(
        userRepository.createUser({ authSub: "" }),
         ).rejects.toThrow();
        });
      });

  describe("upsertUser", () => {
    it("throws when authSub is missing", async () => {
      await expect(
        userRepository.upsertUser({}),
         ).rejects.toThrow();
        });

    it("throws when authSub is empty", async () => {
      await expect(
        userRepository.upsertUser({ authSub: "" }),
         ).rejects.toThrow();
        });
      });

  describe("updateLastLogin", () => {
    it("returns null when authSub is empty", async () => {
      const result = await userRepository.updateLastLogin("");
      expect(result).toBeNull();
        });

    it("returns null when authSub is undefined", async () => {
      const result = await userRepository.updateLastLogin(undefined);
      expect(result).toBeNull();
        });
      });

  describe("deleteUser", () => {
    it("returns false when userId is empty", async () => {
      const result = await userRepository.deleteUser("");
      expect(result).toBe(false);
        });

    it("returns false when userId is undefined", async () => {
      const result = await userRepository.deleteUser(undefined);
      expect(result).toBe(false);
        });
      });
});
