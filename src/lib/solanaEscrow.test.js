import { describe, expect, it } from "vitest";
import {
  applyLock,
  applyMatch,
  assertSafeCluster,
  clusterFromEnv,
  createEscrowIntent,
  demoSignature,
  describeEscrowHook,
  describeRail,
  lockStake,
  matchStake,
  memoPayload,
  mergeEscrow,
  normalizeEscrow,
  rpcFromEnv,
  virtualEscrow,
  virtualFallback,
} from "./solanaEscrow.js";

describe("solana escrow rail", () => {
  it("defaults the cluster and public RPC to devnet", () => {
    expect(clusterFromEnv({})).toBe("devnet");
    expect(rpcFromEnv({})).toBe("https://api.devnet.solana.com");
    expect(clusterFromEnv({ SOLANA_CLUSTER: "mainnet-beta" })).toBe("mainnet-beta");
  });

  it("refuses mainnet unless explicitly allowed", () => {
    expect(() => assertSafeCluster("mainnet-beta")).toThrow(/devnet or the virtual book/);
    expect(assertSafeCluster("mainnet-beta", { SOLANA_ALLOW_MAINNET: "1" })).toBe("mainnet-beta");
  });

  it("normalizes a missing escrow onto the virtual book", () => {
    expect(normalizeEscrow(null)).toMatchObject({ rail: "virtual", status: "book" });
    expect(virtualEscrow().note).toBe("Virtual book");
  });

  it("opens a chain intent and describes the rail", () => {
    const intent = createEscrowIntent({
      pactId: "pkt_gym",
      stakeSol: 2,
      creatorPubkey: "AbCdEfGhIjKlMnOpQrStUvWxYz111111111",
    });
    expect(intent).toMatchObject({ rail: "solana", status: "intent", cluster: "devnet", stakeSol: 2 });
    expect(describeRail(intent)).toMatch(/awaiting lock/);
    expect(memoPayload("lock", intent)).toBe("pact:lock:pkt_gym:2");
  });

  it("rejects a zero stake intent", () => {
    expect(() => createEscrowIntent({ pactId: "x", stakeSol: 0 })).toThrow(/positive stake/);
  });

  it("locks, matches, and falls back to the virtual book", async () => {
    const intent = createEscrowIntent({ pactId: "pkt_1", stakeSol: 1.5 });
    const locked = applyLock(intent, { signature: "sig-lock", pubkey: "CREATOR" });
    expect(locked.status).toBe("locked");
    expect(describeRail(locked)).toMatch(/Challenger locked on devnet/);

    const matched = applyMatch(locked, { signature: "sig-match", pubkey: "FRIEND" });
    expect(matched.status).toBe("matched");
    expect(matched.opponentPubkey).toBe("FRIEND");

    const missed = virtualFallback(intent, "RPC down");
    expect(missed.rail).toBe("virtual");
    expect(describeRail(missed)).toBe("RPC down");
  });

  it("lockStake without a wallet keeps the virtual book", async () => {
    const intent = createEscrowIntent({ pactId: "pkt_2", stakeSol: 2 });
    const out = await lockStake({ intent, wallet: null, send: async () => "nope" });
    expect(out.ok).toBe(false);
    expect(out.fallback).toBe("virtual");
    expect(out.escrow.rail).toBe("virtual");
  });

  it("lockStake records a send and matchStake needs a lock", async () => {
    const intent = createEscrowIntent({ pactId: "pkt_3", stakeSol: 3 });
    const locked = await lockStake({
      intent,
      wallet: { publicKey: "CREATOR" },
      send: async () => ({ signature: "onchain-lock", demo: false }),
    });
    expect(locked.ok).toBe(true);
    expect(locked.escrow.lockSig).toBe("onchain-lock");

    const matched = await matchStake({
      intent: locked.escrow,
      wallet: { publicKey: "FRIEND" },
      send: async () => "onchain-match",
    });
    expect(matched.escrow.status).toBe("matched");
    expect(matched.escrow.matchSig).toBe("onchain-match");

    expect(() => applyMatch(virtualEscrow(), { signature: "x" })).toThrow(/after a lock/);
  });

  it("falls back when send throws", async () => {
    const intent = createEscrowIntent({ pactId: "pkt_4", stakeSol: 1 });
    const out = await lockStake({
      intent,
      wallet: { publicKey: "CREATOR" },
      send: async () => {
        throw new Error("blockhash expired");
      },
    });
    expect(out.ok).toBe(false);
    expect(out.escrow.note).toMatch(/blockhash expired/);
  });

  it("marks a demo lock in sportsbook copy", () => {
    const intent = createEscrowIntent({ pactId: "pkt_5", stakeSol: 2 });
    const demo = applyLock(intent, { signature: demoSignature("lock", intent, "PK"), pubkey: "PK", demo: true });
    expect(demo.demo).toBe(true);
    expect(describeRail(demo)).toMatch(/Demo lock on the desk/);
    expect(demo.lockSig.startsWith("demo")).toBe(true);
  });

  it("merges a patch onto the current rail", () => {
    const next = mergeEscrow(virtualEscrow(), { rail: "solana", status: "intent", creatorPubkey: "AA" });
    expect(next.rail).toBe("solana");
    expect(next.creatorPubkey).toBe("AA");
  });

  it("describes the public hook without secrets", () => {
    const hook = describeEscrowHook({ SOLANA_CLUSTER: "devnet" });
    expect(hook.ok).toBe(true);
    expect(hook.cluster).toBe("devnet");
    expect(hook.methods).toContain("lock");
    expect(hook.virtualFallback).toBe(true);
    expect(hook.mainnet).toBe(false);
  });
});
