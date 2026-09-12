/**
 * Tests for the LedgerTransaction model.
 *
 * These tests verify:
 *         - createLedgerTransaction creates valid transaction documents
 *         - validateLedgerTransaction catches invalid inputs
 *         - createStakeTransactions creates paired stake entries
 *         - createPayoutTransaction creates valid payout entries
 *         - Monetary values are integer-valued and non-zero
 */

import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import {
  TRANSACTION_TYPES,
  validateAmountLamports,
  createLedgerTransaction,
  validateLedgerTransaction,
  createStakeTransactions,
  createPayoutTransaction,
} from "./ledger.model.js";

describe("LedgerTransaction model", () => {
  describe("validateAmountLamports", () => {
    it("returns empty array for valid positive amount", () => {
      expect(validateAmountLamports(100)).toEqual([]);
      expect(validateAmountLamports(1_000_000_000)).toEqual([]);
        });

    it("returns empty array for valid negative amount", () => {
      expect(validateAmountLamports(-100)).toEqual([]);
      expect(validateAmountLamports(-1_000_000_000)).toEqual([]);
        });

    it("catches zero amount", () => {
      const errors = validateAmountLamports(0);
      expect(errors).toContain("amountLamports must be non-zero");
        });

    it("catches non-integer amount", () => {
      const errors = validateAmountLamports(1.5);
      expect(errors).toContain("amountLamports must be an integer");
        });

    it("catches non-number amount", () => {
      const errors = validateAmountLamports("not a number");
      expect(errors).toContain("amountLamports must be a number");
        });
      });

  describe("createLedgerTransaction", () => {
    it("creates a valid transaction with all fields", () => {
      const tx = createLedgerTransaction({
        amountLamports: 1_000_000_000,
        fromId: "user-1",
        toId: "user-2",
        description: "Stake lock",
        pactId: new ObjectId(),
         });

      expect(tx).toHaveProperty("_id");
      expect(tx._id).toBeInstanceOf(ObjectId);
      expect(tx.amountLamports).toBe(1_000_000_000);
      expect(tx.fromId).toBe("user-1");
      expect(tx.toId).toBe("user-2");
      expect(tx.description).toBe("Stake lock");
      expect(tx.pactId).toBeInstanceOf(ObjectId);
      expect(tx.createdAt).toBeInstanceOf(Date);
        });

    it("creates a transaction with null fromId", () => {
      const tx = createLedgerTransaction({
        amountLamports: 1_000_000_000,
        toId: "user-1",
        description: "Payout",
         });

      expect(tx.fromId).toBeNull();
      expect(tx.toId).toBe("user-1");
        });

    it("creates a transaction with null toId", () => {
      const tx = createLedgerTransaction({
        amountLamports: 1_000_000_000,
        fromId: "user-1",
        description: "Stake lock",
         });

      expect(tx.fromId).toBe("user-1");
      expect(tx.toId).toBeNull();
        });

    it("throws when amount is zero", () => {
      expect(() =>
        createLedgerTransaction({
          amountLamports: 0,
          description: "Test",
           }),
         ).toThrow("non-zero");
        });

    it("throws when description is empty", () => {
      expect(() =>
        createLedgerTransaction({
          amountLamports: 100,
          description: "",
           }),
         ).toThrow();
        });

    it("throws when fromId is empty string", () => {
      expect(() =>
        createLedgerTransaction({
          amountLamports: 100,
          fromId: "   ",
          description: "Test",
           }),
         ).toThrow();
        });

    it("trims description", () => {
      const tx = createLedgerTransaction({
        amountLamports: 100,
        description: "  Test  ",
         });

      expect(tx.description).toBe("Test");
        });
      });

  describe("validateLedgerTransaction", () => {
    it("returns empty array for valid transaction", () => {
      const tx = createLedgerTransaction({
        amountLamports: 100,
        fromId: "user-1",
        toId: "user-2",
        description: "Test",
         });

      const errors = validateLedgerTransaction(tx);
      expect(errors).toEqual([]);
        });

    it("catches invalid amount", () => {
      const tx = createLedgerTransaction({
        amountLamports: 100,
        description: "Test",
         });
      tx.amountLamports = -1;

      const errors = validateLedgerTransaction(tx);
      expect(errors).toContain("amountLamports must be non-zero");
        });

    it("catches empty description", () => {
      const tx = createLedgerTransaction({
        amountLamports: 100,
        description: "Test",
         });
      tx.description = "";

      const errors = validateLedgerTransaction(tx);
      expect(errors).toContain("description must be a non-empty string");
        });
      });

  describe("createStakeTransactions", () => {
    it("creates two paired stake transactions", () => {
      const pactId = new ObjectId();
      const txs = createStakeTransactions({
        stakeLamports: 1_000_000_000,
        creatorId: "user-1",
        opponentId: "user-2",
        pactId,
         });

      expect(txs).toHaveLength(2);

       // First transaction: creator stakes
      expect(txs[0].amountLamports).toBe(1_000_000_000);
      expect(txs[0].fromId).toBe("user-1");
      expect(txs[0].toId).toBeNull();
      expect(txs[0].description).toContain("user-1");
      expect(txs[0].description).toContain("pot");
      expect(txs[0].pactId).toBeInstanceOf(ObjectId);

       // Second transaction: opponent stakes
      expect(txs[1].amountLamports).toBe(1_000_000_000);
      expect(txs[1].fromId).toBe("user-2");
      expect(txs[1].toId).toBeNull();
      expect(txs[1].description).toContain("user-2");
      expect(txs[1].description).toContain("pot");
      expect(txs[1].pactId).toBeInstanceOf(ObjectId);
        });

    it("throws when stake is zero", () => {
      const pactId = new ObjectId();
      expect(() =>
        createStakeTransactions({
          stakeLamports: 0,
          creatorId: "user-1",
          opponentId: "user-2",
          pactId,
           }),
         ).toThrow("non-zero");
        });

    it("throws when creatorId is missing", () => {
      const pactId = new ObjectId();
      expect(() =>
        createStakeTransactions({
          stakeLamports: 100,
          opponentId: "user-2",
          pactId,
           }),
         ).toThrow("creatorId is required");
        });

    it("throws when opponentId is missing", () => {
      const pactId = new ObjectId();
      expect(() =>
        createStakeTransactions({
          stakeLamports: 100,
          creatorId: "user-1",
          pactId,
           }),
         ).toThrow("opponentId is required");
        });

    it("throws when pactId is not an ObjectId", () => {
      expect(() =>
        createStakeTransactions({
          stakeLamports: 100,
          creatorId: "user-1",
          opponentId: "user-2",
          pactId: "not-an-objectid",
           }),
         ).toThrow();
        });
      });

  describe("createPayoutTransaction", () => {
    it("creates a valid payout transaction", () => {
      const pactId = new ObjectId();
      const tx = createPayoutTransaction({
        totalPotLamports: 2_000_000_000,
        winnerId: "user-1",
        pactId,
         });

      expect(tx).toHaveProperty("_id");
      expect(tx._id).toBeInstanceOf(ObjectId);
      expect(tx.amountLamports).toBe(2_000_000_000);
      expect(tx.fromId).toBeNull();
      expect(tx.toId).toBe("user-1");
      expect(tx.description).toContain("user-1");
      expect(tx.description).toContain("pot");
      expect(tx.pactId).toBeInstanceOf(ObjectId);
      expect(tx.createdAt).toBeInstanceOf(Date);
        });

    it("throws when totalPot is zero", () => {
      const pactId = new ObjectId();
      expect(() =>
        createPayoutTransaction({
          totalPotLamports: 0,
          winnerId: "user-1",
          pactId,
           }),
         ).toThrow("non-zero");
        });

    it("throws when winnerId is missing", () => {
      const pactId = new ObjectId();
      expect(() =>
        createPayoutTransaction({
          totalPotLamports: 100,
          pactId,
           }),
         ).toThrow("winnerId is required");
        });

    it("throws when pactId is not an ObjectId", () => {
      expect(() =>
        createPayoutTransaction({
          totalPotLamports: 100,
          winnerId: "user-1",
          pactId: "not-an-objectid",
           }),
         ).toThrow();
        });
      });
});
