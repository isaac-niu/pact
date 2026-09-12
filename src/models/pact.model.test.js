/**
 * Tests for the Pact model.
 *
 * These tests verify:
 *        - createPactDocument creates valid pact documents
 *        - validatePact catches invalid inputs
 *        - Status transitions are valid/invalid as expected
 *        - SOL amounts are converted to/from lamports correctly
 *        - Monetary values are integer-valued and non-negative
 */

import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import {
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
} from "./pact.model.js";

describe("Pact model", () => {
  describe("LAMPORTS_PER_SOL constant", () => {
    it("equals 1 billion", () => {
      expect(LAMPORTS_PER_SOL).toBe(1_000_000_000);
       });
     });

  describe("solToLamports", () => {
    it("converts SOL to lamports", () => {
      expect(solToLamports(1)).toBe(1_000_000_000);
      expect(solToLamports(2.5)).toBe(2_500_000_000);
      expect(solToLamports(0.1)).toBe(100_000_000);
       });

    it("returns integer values", () => {
      const result = solToLamports(1.5);
      expect(Number.isInteger(result)).toBe(true);
       });

    it("throws for non-number inputs", () => {
      expect(() => solToLamports("not a number")).toThrow();
      expect(() => solToLamports(null)).toThrow();
      expect(() => solToLamports(undefined)).toThrow();
       });
     });

  describe("lamportsToSol", () => {
    it("converts lamports to SOL", () => {
      expect(lamportsToSol(1_000_000_000)).toBe(1);
      expect(lamportsToSol(2_500_000_000)).toBe(2.5);
      expect(lamportsToSol(100_000_000)).toBe(0.1);
       });

    it("throws for non-integer inputs", () => {
      expect(() => lamportsToSol(1.5)).toThrow();
       });
     });

  describe("validateStakeLamports", () => {
    it("returns empty array for valid stake", () => {
      expect(validateStakeLamports(100)).toEqual([]);
      expect(validateStakeLamports(0)).toEqual([]);
      expect(validateStakeLamports(1_000_000_000)).toEqual([]);
       });

    it("catches negative stake", () => {
      const errors = validateStakeLamports(-1);
      expect(errors).toContain("stake must be non-negative");
       });

    it("catches non-integer stake", () => {
      const errors = validateStakeLamports(1.5);
      expect(errors).toContain("stake must be an integer");
       });

    it("catches non-number stake", () => {
      const errors = validateStakeLamports("not a number");
      expect(errors).toContain("stake must be a number");
       });
     });

  describe("createPactDocument", () => {
    it("creates a valid pact document", () => {
      const pact = createPactDocument({
        title: "Test challenge",
        stakeLamports: 1_000_000_000,
        creatorId: "user-1",
        opponentId: "user-2",
        });

      expect(pact).toHaveProperty("_id");
      expect(pact._id).toBeInstanceOf(ObjectId);
      expect(pact.title).toBe("Test challenge");
      expect(pact.stakeLamports).toBe(1_000_000_000);
      expect(pact.creatorId).toBe("user-1");
      expect(pact.opponentId).toBe("user-2");
      expect(pact.status).toBe(PACT_STATUSES.OPEN);
      expect(pact.evidenceUrl).toBeNull();
      expect(pact.evidenceName).toBeNull();
      expect(pact.verdict).toBeNull();
      expect(pact.winnerId).toBeNull();
      expect(pact.createdAt).toBeInstanceOf(Date);
      expect(pact.updatedAt).toBeInstanceOf(Date);
      expect(pact.acceptedAt).toBeNull();
      expect(pact.resolvedAt).toBeNull();
       });

    it("throws when stake is negative", () => {
      expect(() =>
        createPactDocument({
          title: "Test",
          stakeLamports: -1,
          creatorId: "user-1",
          opponentId: "user-2",
          }),
        ).toThrow("non-negative");
       });

    it("throws when stake is zero", () => {
      expect(() =>
        createPactDocument({
          title: "Test",
          stakeLamports: 0,
          creatorId: "user-1",
          opponentId: "user-2",
          }),
        ).toThrow("non-negative");
       });

    it("throws when creatorId equals opponentId", () => {
      expect(() =>
        createPactDocument({
          title: "Test",
          stakeLamports: 100,
          creatorId: "user-1",
          opponentId: "user-1",
          }),
        ).toThrow("different");
       });

    it("throws when title is empty", () => {
      expect(() =>
        createPactDocument({
          title: "",
          stakeLamports: 100,
          creatorId: "user-1",
          opponentId: "user-2",
          }),
        ).toThrow();
       });
     });

  describe("validatePact", () => {
    it("returns empty array for valid pact", () => {
      const pact = createPactDocument({
        title: "Test",
        stakeLamports: 100,
        creatorId: "user-1",
        opponentId: "user-2",
        });

      const errors = validatePact(pact);
      expect(errors).toEqual([]);
       });

    it("catches invalid status", () => {
      const pact = createPactDocument({
        title: "Test",
        stakeLamports: 100,
        creatorId: "user-1",
        opponentId: "user-2",
        });
      pact.status = "invalid_status";

      const errors = validatePact(pact);
      expect(errors).toContain(
        "status must be one of: open, accepted, evidence, judging, resolved, cancelled",
        );
       });

    it("catches empty title", () => {
      const pact = createPactDocument({
        title: "Test",
        stakeLamports: 100,
        creatorId: "user-1",
        opponentId: "user-2",
        });
      pact.title = "";

      const errors = validatePact(pact);
      expect(errors).toContain("title must be a non-empty string");
       });
     });

  describe("PACT_STATUSES", () => {
    it("contains all expected statuses", () => {
      expect(PACT_STATUSES.OPEN).toBe("open");
      expect(PACT_STATUSES.ACCEPTED).toBe("accepted");
      expect(PACT_STATUSES.EVIDENCE).toBe("evidence");
      expect(PACT_STATUSES.JUDGING).toBe("judging");
      expect(PACT_STATUSES.RESOLVED).toBe("resolved");
      expect(PACT_STATUSES.CANCELLED).toBe("cancelled");
       });
     });

  describe("canTransition", () => {
    it("allows open → accepted", () => {
      expect(canTransition("open", "accepted")).toBe(true);
       });

    it("allows open → cancelled", () => {
      expect(canTransition("open", "cancelled")).toBe(true);
       });

    it("allows accepted → evidence", () => {
      expect(canTransition("accepted", "evidence")).toBe(true);
       });

    it("allows accepted → cancelled", () => {
      expect(canTransition("accepted", "cancelled")).toBe(true);
       });

    it("allows evidence → judging", () => {
      expect(canTransition("evidence", "judging")).toBe(true);
       });

    it("allows judging → resolved", () => {
      expect(canTransition("judging", "resolved")).toBe(true);
       });

    it("blocks invalid transitions", () => {
      expect(canTransition("open", "evidence")).toBe(false);
      expect(canTransition("open", "judging")).toBe(false);
      expect(canTransition("open", "resolved")).toBe(false);
      expect(canTransition("accepted", "judging")).toBe(false);
      expect(canTransition("evidence", "cancelled")).toBe(false);
       });

    it("blocks transitions from resolved", () => {
      expect(canTransition("resolved", "open")).toBe(false);
      expect(canTransition("resolved", "accepted")).toBe(false);
       });

    it("blocks transitions from cancelled", () => {
      expect(canTransition("cancelled", "open")).toBe(false);
      expect(canTransition("cancelled", "accepted")).toBe(false);
       });
     });

  describe("transitionPact", () => {
    it("transitions open → accepted", () => {
      const pact = createPactDocument({
        title: "Test",
        stakeLamports: 100,
        creatorId: "user-1",
        opponentId: "user-2",
        });

      const updated = transitionPact(pact, "accepted");
      expect(updated.status).toBe("accepted");
      expect(updated.acceptedAt).toBeInstanceOf(Date);
       });

    it("transitions accepted → evidence", () => {
      const pact = createPactDocument({
        title: "Test",
        stakeLamports: 100,
        creatorId: "user-1",
        opponentId: "user-2",
        });

      const updated = transitionPact(pact, "evidence");
      expect(updated.status).toBe("evidence");
       });

    it("transitions evidence → judging", () => {
      const pact = createPactDocument({
        title: "Test",
        stakeLamports: 100,
        creatorId: "user-1",
        opponentId: "user-2",
        });

      const updated = transitionPact(pact, "judging");
      expect(updated.status).toBe("judging");
       });

    it("transitions judging → resolved", () => {
      const pact = createPactDocument({
        title: "Test",
        stakeLamports: 100,
        creatorId: "user-1",
        opponentId: "user-2",
        });

      const updated = transitionPact(pact, "resolved");
      expect(updated.status).toBe("resolved");
      expect(updated.resolvedAt).toBeInstanceOf(Date);
       });

    it("throws on invalid transition", () => {
      const pact = createPactDocument({
        title: "Test",
        stakeLamports: 100,
        creatorId: "user-1",
        opponentId: "user-2",
        });

      expect(() => transitionPact(pact, "resolved")).toThrow();
       });

    it("updates updatedAt on transition", () => {
      const pact = createPactDocument({
        title: "Test",
        stakeLamports: 100,
        creatorId: "user-1",
        opponentId: "user-2",
        });

      const beforeUpdate = pact.updatedAt;
      // Small delay to ensure time difference
      const updated = transitionPact(pact, "accepted");
      expect(updated.updatedAt.getTime()).toBeGreaterThan(beforeUpdate.getTime());
       });
     });
});
