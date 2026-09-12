import { describe, expect, it } from "vitest";
import { formatSol, lamportsToSol, truncatePubkey } from "./solanaFormat.js";

describe("lamportsToSol", () => {
  it("converts lamports to SOL", () => {
    expect(lamportsToSol(1_000_000_000)).toBe(1);
    expect(lamportsToSol(500_000_000)).toBe(0.5);
  });

  it("returns 0 for non-numeric input", () => {
    expect(lamportsToSol(undefined)).toBe(0);
    expect(lamportsToSol("not a number")).toBe(0);
  });
});

describe("formatSol", () => {
  it("formats lamports as a 4-decimal SOL string", () => {
    expect(formatSol(1_234_500_000)).toBe("1.2345");
    expect(formatSol(0)).toBe("0.0000");
  });
});

describe("truncatePubkey", () => {
  it("shortens a long pubkey to head…tail", () => {
    expect(truncatePubkey("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM")).toBe("9WzD…AWWM");
  });

  it("leaves short values untouched", () => {
    expect(truncatePubkey("abc")).toBe("abc");
    expect(truncatePubkey("")).toBe("");
    expect(truncatePubkey(undefined)).toBe("");
  });
});
