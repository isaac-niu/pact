import { afterEach, describe, expect, it } from "vitest";
import {
  DEMO_WALLET_KEY,
  clearDemoSecret,
  connectDemoWallet,
  connectInjectedWallet,
  decodeSecret,
  detectInjectedWallet,
  encodeSecret,
  shortPubkey,
} from "./solanaWallet.js";

function memoryStorage(start = {}) {
  const map = { ...start };
  return {
    getItem: (key) => (key in map ? map[key] : null),
    setItem: (key, value) => {
      map[key] = String(value);
    },
    removeItem: (key) => {
      delete map[key];
    },
    map,
  };
}

describe("solana wallet adapter helpers", () => {
  afterEach(() => {
    delete globalThis.solana;
    delete globalThis.solflare;
  });

  it("shortens a pubkey the way a ticket would", () => {
    expect(shortPubkey("")).toBe("—");
    expect(shortPubkey("short")).toBe("short");
    expect(shortPubkey("Abcdefghijklmnopqrstuvwxyz123456")).toBe("Abcd…3456");
  });

  it("detects Phantom, Solflare, and a bare injected desk", () => {
    expect(detectInjectedWallet({})).toMatchObject({ readyState: "NotDetected", adapter: null });
    expect(detectInjectedWallet({ solana: { isPhantom: true } }).name).toBe("Phantom");
    expect(detectInjectedWallet({ solflare: { isSolflare: true } }).name).toBe("Solflare");
    expect(detectInjectedWallet({ solana: {} }).name).toBe("Injected");
  });

  it("round-trips a demo secret", () => {
    const bytes = Uint8Array.from({ length: 64 }, (_, i) => i + 1);
    expect(decodeSecret(encodeSecret(bytes))).toEqual(bytes);
    expect(() => decodeSecret("[]")).toThrow(/Bad demo desk key/);
  });

  it("sits and restores a demo desk wallet from session storage", async () => {
    const storage = memoryStorage();
    const first = await connectDemoWallet(storage);
    expect(first.kind).toBe("demo");
    expect(first.name).toBe("Demo desk");
    expect(first.publicKey).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
    expect(storage.getItem(DEMO_WALLET_KEY)).toBeTruthy();

    const again = await connectDemoWallet(storage);
    expect(again.publicKey).toBe(first.publicKey);
    clearDemoSecret(storage);
    expect(storage.getItem(DEMO_WALLET_KEY)).toBeNull();
  });

  it("connects an injected adapter the wallet-adapter way", async () => {
    const adapter = {
      isPhantom: true,
      connect: async () => ({ publicKey: { toBase58: () => "PhanTom111111111111111111111111111" } }),
    };
    const wallet = await connectInjectedWallet(adapter);
    expect(wallet).toMatchObject({ name: "Phantom", kind: "injected", publicKey: "PhanTom111111111111111111111111111" });
  });

  it("refuses a missing injected adapter", async () => {
    await expect(connectInjectedWallet(null)).rejects.toThrow(/No injected wallet/);
  });
});
