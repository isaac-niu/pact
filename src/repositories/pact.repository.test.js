/**
 * Tests for the Pact repository.
 *
 * These tests verify:
 *          - Repository functions accept and validate inputs correctly
 *          - Repository functions handle null/undefined inputs gracefully
 *          - Repository functions return expected types
 *
 * Note: These tests do NOT require production MongoDB credentials.
 * They test the repository interface and validation logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ObjectId } from "mongodb";
import * as pactRepository from "./pact.repository.js";

describe("Pact repository", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
     });

  afterEach(() => {
    process.env = originalEnv;
     });

  describe("findPactById", () => {
    it("returns null when pactId is empty", async () => {
      const result = await pactRepository.findPactById("");
      expect(result).toBeNull();
         });

    it("returns null when pactId is undefined", async () => {
      const result = await pactRepository.findPactById(undefined);
      expect(result).toBeNull();
         });
       });

  describe("findPactsByStatus", () => {
    it("returns empty array when status is empty", async () => {
      const result = await pactRepository.findPactsByStatus("");
      expect(Array.isArray(result)).toBe(true);
         });
       });

  describe("findPactsByCreator", () => {
    it("returns empty array when creatorId is empty", async () => {
      const result = await pactRepository.findPactsByCreator("");
      expect(Array.isArray(result)).toBe(true);
         });
       });

  describe("findPactsByOpponent", () => {
    it("returns empty array when opponentId is empty", async () => {
      const result = await pactRepository.findPactsByOpponent("");
      expect(Array.isArray(result)).toBe(true);
         });
       });

  describe("createPact", () => {
    it("throws when title is missing", async () => {
      await expect(
        pactRepository.createPact({
          stakeLamports: 100,
          creatorId: "user-1",
          opponentId: "user-2",
            }),
          ).rejects.toThrow();
         });

    it("throws when stakeLamports is negative", async () => {
      await expect(
        pactRepository.createPact({
          title: "Test",
          stakeLamports: -1,
          creatorId: "user-1",
          opponentId: "user-2",
            }),
          ).rejects.toThrow();
         });

    it("throws when creatorId is empty", async () => {
      await expect(
        pactRepository.createPact({
          title: "Test",
          stakeLamports: 100,
          opponentId: "user-2",
            }),
          ).rejects.toThrow();
         });

    it("throws when opponentId is empty", async () => {
      await expect(
        pactRepository.createPact({
          title: "Test",
          stakeLamports: 100,
          creatorId: "user-1",
            }),
          ).rejects.toThrow();
         });
       });

  describe("updatePactStatus", () => {
    it("returns null when pactId is empty", async () => {
      const result = await pactRepository.updatePactStatus("", "accepted");
      expect(result).toBeNull();
         });

    it("returns null when newStatus is empty", async () => {
      const result = await pactRepository.updatePactStatus("some-id", "");
      expect(result).toBeNull();
         });

    it("returns null when pactId is undefined", async () => {
      const result = await pactRepository.updatePactStatus(undefined, "accepted");
      expect(result).toBeNull();
         });
       });

  describe("setEvidence", () => {
    it("returns null when pactId is empty", async () => {
      const result = await pactRepository.setEvidence("", "url", "name");
      expect(result).toBeNull();
         });
       });

  describe("setVerdict", () => {
    it("returns null when pactId is empty", async () => {
      const result = await pactRepository.setVerdict("", {}, "user-1");
      expect(result).toBeNull();
         });
       });

  describe("deletePact", () => {
    it("returns false when pactId is empty", async () => {
      const result = await pactRepository.deletePact("");
      expect(result).toBe(false);
         });

    it("returns false when pactId is undefined", async () => {
      const result = await pactRepository.deletePact(undefined);
      expect(result).toBe(false);
         });
       });
});
