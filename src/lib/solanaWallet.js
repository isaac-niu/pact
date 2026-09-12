/**
 * Wallet-adapter shaped helpers for the desk rail.
 *
 * Mirrors `@solana/wallet-adapter-base` (name, readyState, connect,
 * disconnect, publicKey, signTransaction) without pulling the full
 * adapter-ui kit. Phantom / Solflare sit on `window.solana`. The
 * demo desk is a session Keypair for browsers with no extension.
 */

export const DEMO_WALLET_KEY = "pact.demo.wallet.v1";

export function detectInjectedWallet(win = globalThis) {
  const sol = win?.solana;
  if (sol?.isPhantom) {
    return { name: "Phantom", readyState: "Installed", adapter: sol };
  }
  if (win?.solflare?.isSolflare) {
    return { name: "Solflare", readyState: "Installed", adapter: win.solflare };
  }
  if (sol) {
    return { name: "Injected", readyState: "Installed", adapter: sol };
  }
  return { name: null, readyState: "NotDetected", adapter: null };
}

export function shortPubkey(pk) {
  const value = String(pk || "");
  if (!value) return "—";
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function encodeSecret(bytes) {
  return JSON.stringify(Array.from(bytes));
}

export function decodeSecret(raw) {
  const arr = JSON.parse(String(raw || ""));
  if (!Array.isArray(arr) || arr.length < 32) throw new Error("Bad demo desk key");
  return Uint8Array.from(arr);
}

export function readDemoSecret(storage = globalThis.sessionStorage) {
  try {
    return storage?.getItem(DEMO_WALLET_KEY) || null;
  } catch {
    return null;
  }
}

export function writeDemoSecret(secret, storage = globalThis.sessionStorage) {
  storage?.setItem(DEMO_WALLET_KEY, secret);
}

export function clearDemoSecret(storage = globalThis.sessionStorage) {
  try {
    storage?.removeItem(DEMO_WALLET_KEY);
  } catch {
    /* private mode */
  }
}

export async function generateDemoKeypair() {
  const { Keypair } = await import("@solana/web3.js");
  return Keypair.generate();
}

export async function restoreDemoKeypair(raw) {
  const { Keypair } = await import("@solana/web3.js");
  return Keypair.fromSecretKey(decodeSecret(raw));
}

function pubkeyOf(value) {
  if (!value) return "";
  if (typeof value.toBase58 === "function") return value.toBase58();
  return String(value);
}

export async function connectDemoWallet(storage = globalThis.sessionStorage) {
  const existing = readDemoSecret(storage);
  const keypair = existing ? await restoreDemoKeypair(existing) : await generateDemoKeypair();
  if (!existing) writeDemoSecret(encodeSecret(keypair.secretKey), storage);
  return {
    name: "Demo desk",
    kind: "demo",
    publicKey: pubkeyOf(keypair.publicKey),
    connected: true,
    readyState: "Loadable",
    keypair,
  };
}

export async function connectInjectedWallet(adapter) {
  if (!adapter) throw new Error("No injected wallet on this desk");
  const resp = await adapter.connect();
  const publicKey = pubkeyOf(resp?.publicKey || adapter.publicKey);
  if (!publicKey) throw new Error("Wallet returned no pubkey");
  return {
    name: adapter.isPhantom ? "Phantom" : adapter.isSolflare ? "Solflare" : "Injected",
    kind: "injected",
    publicKey,
    connected: true,
    readyState: "Installed",
    adapter,
  };
}

export async function disconnectWallet(wallet) {
  if (wallet?.kind === "injected" && typeof wallet.adapter?.disconnect === "function") {
    await wallet.adapter.disconnect();
  }
}

export async function signWithWallet(wallet, tx) {
  if (wallet?.kind === "demo" && wallet.keypair) {
    tx.partialSign(wallet.keypair);
    return tx;
  }
  if (typeof wallet?.adapter?.signTransaction === "function") {
    return wallet.adapter.signTransaction(tx);
  }
  throw new Error("Wallet cannot sign");
}

export async function sendWithWallet(wallet, tx, connection) {
  if (typeof wallet?.adapter?.signAndSendTransaction === "function") {
    const out = await wallet.adapter.signAndSendTransaction(tx);
    return typeof out === "string" ? out : out?.signature;
  }
  if (typeof connection?.sendRawTransaction === "function") {
    const signed = await signWithWallet(wallet, tx);
    return connection.sendRawTransaction(signed.serialize());
  }
  throw new Error("Wallet cannot send");
}
