/**
 * Escrow rail — documented interface for on-chain stakes.
 *
 * Production program (out of scope this weekend):
 *   lock(creator, amount)   → PDA holds the challenger's stake
 *   match(opponent, amount) → both sides in; pot locked
 *   release(winner)         → pot to the winning desk
 *   refund()                → both sides if the slip is scratched
 *
 * Demo / devnet path:
 *   lockStake / matchStake / releaseStake build a memo instruction
 *   (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`) so a connected
 *   Phantom can post a real signature on a public cluster. The demo
 *   desk wallet signs locally (signature prefixed `demo`) and does
 *   not broadcast. Optional dust to VITE_SOLANA_ESCROW_TREASURY is
 *   off unless that public pubkey is set.
 *
 * The virtual ledger stays the book of record unless both desks lock.
 * When no wallet is connected, create / accept stay on the virtual book.
 *
 * Cluster default is devnet. Mainnet is refused unless explicitly allowed.
 */

export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export const ESCROW_SPEC = {
  version: 1,
  clusterDefault: "devnet",
  memoProgram: MEMO_PROGRAM_ID,
  methods: ["lock", "match", "release", "refund"],
  productionProgram: null,
};

export const ESCROW_STATUSES = ["book", "intent", "locked", "matched", "released"];

export function clusterFromEnv(env = {}) {
  const raw = String(env.SOLANA_CLUSTER || env.cluster || "devnet")
    .trim()
    .toLowerCase();
  if (raw === "mainnet" || raw === "mainnet-beta") return "mainnet-beta";
  if (raw === "testnet") return "testnet";
  if (raw === "localnet") return "localnet";
  return "devnet";
}

export function rpcFromEnv(env = {}) {
  const explicit = String(env.SOLANA_RPC || env.rpc || "").trim();
  if (explicit) return explicit;
  const cluster = clusterFromEnv(env);
  if (cluster === "mainnet-beta") return "https://api.mainnet-beta.solana.com";
  if (cluster === "testnet") return "https://api.testnet.solana.com";
  if (cluster === "localnet") return "http://127.0.0.1:8899";
  return "https://api.devnet.solana.com";
}

export function allowMainnet(env = {}) {
  return env.SOLANA_ALLOW_MAINNET === "1" || env.allowMainnet === true;
}

export function assertSafeCluster(cluster, env = {}) {
  const next = clusterFromEnv({ cluster });
  if (next === "mainnet-beta" && !allowMainnet(env)) {
    throw new Error("Mainnet escrow is dark this weekend — sit devnet or the virtual book");
  }
  return next;
}

export function virtualEscrow(note = "Virtual book") {
  return {
    rail: "virtual",
    status: "book",
    cluster: "devnet",
    creatorPubkey: null,
    opponentPubkey: null,
    lockSig: null,
    matchSig: null,
    releaseSig: null,
    demo: false,
    note,
  };
}

export function normalizeEscrow(raw) {
  const base = virtualEscrow();
  if (!raw || typeof raw !== "object") return base;
  const rail = raw.rail === "solana" ? "solana" : "virtual";
  const status = ESCROW_STATUSES.includes(raw.status)
    ? raw.status
    : rail === "solana"
      ? "intent"
      : "book";
  return {
    ...base,
    ...raw,
    rail,
    status: rail === "virtual" && !raw.status ? "book" : status,
    cluster: clusterFromEnv({ cluster: raw.cluster }),
    creatorPubkey: raw.creatorPubkey || null,
    opponentPubkey: raw.opponentPubkey || null,
    lockSig: raw.lockSig || null,
    matchSig: raw.matchSig || null,
    releaseSig: raw.releaseSig || null,
    demo: Boolean(raw.demo),
    note: raw.note || base.note,
  };
}

export function createEscrowIntent({
  pactId,
  stakeSol,
  creatorPubkey = null,
  opponentPubkey = null,
  cluster,
} = {}) {
  const stake = Number(stakeSol);
  if (!pactId) throw new Error("Escrow needs a slip id");
  if (!Number.isFinite(stake) || stake <= 0) throw new Error("Escrow needs a positive stake");
  const safeCluster = assertSafeCluster(cluster);
  return {
    pactId: String(pactId),
    stakeSol: stake,
    rail: "solana",
    status: "intent",
    cluster: safeCluster,
    creatorPubkey: creatorPubkey || null,
    opponentPubkey: opponentPubkey || null,
    lockSig: null,
    matchSig: null,
    releaseSig: null,
    demo: false,
    note: "Chain rail posted — awaiting lock",
  };
}

export function mergeEscrow(current, patch) {
  return normalizeEscrow({ ...normalizeEscrow(current), ...patch });
}

export function describeRail(escrow) {
  const row = normalizeEscrow(escrow);
  if (row.rail === "virtual" || row.status === "book") {
    return row.note && row.note !== "Virtual book"
      ? row.note
      : "Virtual book — wallet not on this slip";
  }
  if (row.demo && (row.status === "locked" || row.status === "matched" || row.status === "released")) {
    return "Demo lock on the desk — connect Phantom to post a real memo";
  }
  if (row.status === "intent") return `Chain rail posted on ${row.cluster} — awaiting lock`;
  if (row.status === "locked") return `Challenger locked on ${row.cluster}`;
  if (row.status === "matched") return `Both desks locked — pot on the ${row.cluster} rail`;
  if (row.status === "released") return `Pot released on ${row.cluster}`;
  return "Virtual book";
}

export function memoPayload(method, intent) {
  return `pact:${method}:${intent.pactId}:${intent.stakeSol}`;
}

export function demoSignature(method, intent, pubkey) {
  const raw = `${method}:${intent.pactId}:${intent.stakeSol}:${pubkey || ""}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  const slip = String(intent.pactId || "").replace(/\W/g, "").slice(0, 8);
  return `demo${hash.toString(16).padStart(8, "0")}${slip}`;
}

export function applyLock(intent, { signature, pubkey, demo = false } = {}) {
  if (!signature) throw new Error("Lock needs a signature");
  return mergeEscrow(intent, {
    rail: "solana",
    status: "locked",
    lockSig: signature,
    creatorPubkey: pubkey || intent.creatorPubkey,
    demo: Boolean(demo),
    note: demo ? "Demo lock on the desk" : "Challenger locked",
  });
}

export function applyMatch(intent, { signature, pubkey, demo = false } = {}) {
  if (!signature) throw new Error("Match needs a signature");
  const current = normalizeEscrow(intent);
  if (current.status !== "locked" && current.status !== "intent") {
    throw new Error("Match only after a lock");
  }
  return mergeEscrow(current, {
    rail: "solana",
    status: "matched",
    matchSig: signature,
    opponentPubkey: pubkey || current.opponentPubkey,
    demo: Boolean(demo || current.demo),
    note: demo ? "Demo match on the desk" : "Both desks locked",
  });
}

export function applyRelease(intent, { signature, winnerPubkey, demo = false } = {}) {
  if (!signature) throw new Error("Release needs a signature");
  return mergeEscrow(intent, {
    rail: "solana",
    status: "released",
    releaseSig: signature,
    winnerPubkey: winnerPubkey || null,
    demo: Boolean(demo),
    note: demo ? "Demo release on the desk" : "Pot released",
  });
}

export function virtualFallback(intent, reason) {
  return mergeEscrow(intent, {
    rail: "virtual",
    status: "book",
    demo: false,
    note: reason || "Chain lock missed — ticket stays on the virtual book",
  });
}

async function runEscrowSend({ intent, wallet, send, apply, method }) {
  if (!wallet?.publicKey) {
    return {
      ok: false,
      fallback: "virtual",
      escrow: virtualFallback(intent, "No wallet on this desk"),
      error: "wallet_missing",
    };
  }
  try {
    assertSafeCluster(intent?.cluster);
    if (typeof send !== "function") throw new Error("Escrow send is not wired");
    const result = await send({ method, intent, pubkey: wallet.publicKey, wallet });
    const signature = typeof result === "string" ? result : result?.signature;
    const demo = typeof result === "object" && result ? Boolean(result.demo) : false;
    return {
      ok: true,
      escrow: apply(intent, { signature, pubkey: wallet.publicKey, demo, winnerPubkey: wallet.publicKey }),
      signature,
      demo,
    };
  } catch (err) {
    return {
      ok: false,
      fallback: "virtual",
      escrow: virtualFallback(intent, err.message || "Chain lock missed"),
      error: err.message || "send_failed",
    };
  }
}

export function lockStake(opts) {
  return runEscrowSend({ ...opts, apply: applyLock, method: "lock" });
}

export function matchStake(opts) {
  return runEscrowSend({ ...opts, apply: applyMatch, method: "match" });
}

export function releaseStake(opts) {
  return runEscrowSend({ ...opts, apply: applyRelease, method: "release" });
}

export function describeEscrowHook(env = {}) {
  const cluster = clusterFromEnv(env);
  return {
    ok: true,
    cluster,
    rpcPublic: !String(env.SOLANA_RPC || env.VITE_SOLANA_RPC || "").trim(),
    productionProgram: ESCROW_SPEC.productionProgram,
    methods: ESCROW_SPEC.methods,
    demoPath: "memo",
    virtualFallback: true,
    mainnet: cluster === "mainnet-beta",
  };
}
