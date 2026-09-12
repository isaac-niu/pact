/**
 * Tests for the LedgerTransaction repository.
 *
 * These tests verify:
 *            - Repository functions accept and validate inputs correctly
 *            - Repository functions handle null/undefined inputs gracefully
 *            - Repository functions return expected types
 *
 * Note: These tests do NOT require production MongoDB credentials.
 * They test the repository interface and validation logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ObjectId } from "mongodb";
import * as ledgerRepository from "./ledger.repository.js";

describe("Ledger repository", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
      });

  afterEach(() => {
    process.env = originalEnv;
      });

  describe("findTransactionById", () => {
    it("returns null when transactionId is empty", async () => {
      const result = await ledgerRepository.findTransactionById("");
      expect(result).toBeNull();
          });

    it("returns null when transactionId is undefined", async () => {
      const result = await ledgerRepository.findTransactionById(undefined);
      expect(result).toBeNull();
          });
        });

  describe("findTransactionsByUser", () => {
    it("returns empty array when userId is empty", async () => {
      const result = await ledgerRepository.findTransactionsByUser("");
      expect(Array.isArray(result)).toBe(true);
          });

    it("returns empty array when userId is undefined", async () => {
      const result = await ledgerRepository.findTransactionsByUser(undefined);
      expect(Array.isArray(result)).toBe(true);
          });
        });

  describe("findTransactionsByPact", () => {
    it("returns empty array when pactId is empty", async () => {
      const result = await ledgerRepository.findTransactionsByPact("");
      expect(Array.isArray(result)).toBe(true);
          });

    it("returns empty array when pactId is undefined", async () => {
      const result = await ledgerRepository.findTransactionsByPact(undefined);
      expect(Array.isArray(result)).toBe(true);
          });
        });

  describe("createTransaction", () => {
    it("throws when amountLamports is zero", async () => {
      await expect(
        ledgerRepository.createTransaction({
          amountLamports: 0,
          description: "Test",
             }),
           ).rejects.toThrow();
          });

    it("throws when description is empty", async () => {
      await expect(
        ledgerRepository.createTransaction({
          amountLamports: 100,
          description: "",
             }),
           ).rejects.toThrow();
          });
        });

  describe("createTransactions", () => {
    it("throws when transactions is empty", async () => {
      await expect(
        ledgerRepository.createTransactions([]),
          ).rejects.toThrow();
          });

    it("throws when transactions is not an array", async () => {
      await expect(
        ledgerRepository.createTransactions("not-an-array"),
          ).rejects.toThrow();
          });
        });

  describe("getUserBalance", () => {
    it("returns 0 when userId is empty", async () => {
      const result = await ledgerRepository.getUserBalance("");
      expect(result).toBe(0);
          });

    it("returns 0 when userId is undefined", async () => {
      const result = await ledgerRepository.getUserBalance(undefined);
      expect(result).toBe(0);
          });
        });

  describe("deleteTransaction", () => {
    it("returns false when transactionId is empty", async () => {
      const result = await ledgerRepository.deleteTransaction("");
      expect(result).toBe(false);
          });

    it("returns false when transactionId is undefined", async () => {
      const result = await ledgerRepository.deleteTransaction(undefined);
      expect(result).toBe(false);
          });
        });
});
