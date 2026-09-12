import { STARTING_BANK } from "../data/users.js";
import { emptyDemoState } from "../data/seed.js";

const listeners = new Set();
let actorId = "you";
let state = emptyDemoState();
let enabled = false;

function notify() {
  for (const fn of listeners) fn(getSnapshot());
}

async function req(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "content-type": "application/json",
      "x-pact-actor": actorId,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `desk ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

function apply(snap) {
  state = {
    userId: actorId,
    startingBank: snap.startingBank ?? STARTING_BANK,
    pacts: snap.pacts || [],
    events: snap.events || [],
    ledger: snap.ledger || [],
  };
  notify();
}

export async function maybeRemote() {
  try {
    const ctrl = AbortSignal.timeout(5000);
    const cfg = await fetch("/api/config", { cache: "no-store", signal: ctrl }).then((r) => r.json());
    if (!cfg?.features?.mongo) return false;
    enabled = true;
    const snap = await req("/api/desk");
    apply(snap);
    return true;
  } catch {
    enabled = false;
    return false;
  }
}

export function isRemote() {
  return enabled;
}

export function getSnapshot() {
  return { ...state, userId: actorId, backend: enabled ? "mongo" : "local" };
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(getSnapshot());
  const t = setInterval(() => {
    if (!enabled) return;
    req("/api/desk")
      .then(apply)
      .catch(() => {});
  }, 4000);
  return () => {
    listeners.delete(fn);
    clearInterval(t);
  };
}

export function switchUser(id) {
  if (id !== "you" && id !== "friend") return;
  actorId = id;
  if (enabled) {
    req("/api/desk").then(apply).catch(() => notify());
  } else notify();
}

export function resetDesk() {
  /* Shared Mongo desk is not wiped from the browser. */
}

export function bankOf(userId, snap = state) {
  const start = snap.startingBank ?? STARTING_BANK;
  return (snap.ledger || [])
    .filter((row) => row.userId === userId)
    .reduce((sum, row) => sum + row.amount, start);
}

export function recordOf(userId, snap = state) {
  const done = (snap.pacts || []).filter(
    (p) => p.status === "resolved" && (p.creatorId === userId || p.opponentId === userId),
  );
  const wins = done.filter((p) => p.winnerId === userId).length;
  return { wins, losses: done.length - wins, played: done.length, rate: done.length ? wins / done.length : null };
}

export async function createPact(input, ctx = {}) {
  actorId = ctx.actorId || actorId;
  const out = await req("/api/pacts", { method: "POST", body: JSON.stringify({ ...input, actorId }) });
  apply(out.state);
  return out.result;
}

export async function acceptPact(pactId, ctx = {}) {
  actorId = ctx.actorId || actorId;
  const out = await req(`/api/pacts/${encodeURIComponent(pactId)}/accept`, {
    method: "POST",
    body: JSON.stringify({ actorId }),
  });
  apply(out.state);
  return out.result;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

export async function submitEvidence(pactId, file, ctx = {}) {
  actorId = ctx.actorId || actorId;
  const evidenceDataUrl = await readFileAsDataUrl(file);
  const out = await req(`/api/pacts/${encodeURIComponent(pactId)}/evidence`, {
    method: "POST",
    body: JSON.stringify({
      actorId,
      evidenceName: file.name || "proof.jpg",
      evidenceDataUrl,
    }),
  });
  apply(out.state);
  return out.result;
}

export async function verifyPact(pactId, pass, ctx = {}) {
  actorId = ctx.actorId || actorId;
  const out = await req(`/api/pacts/${encodeURIComponent(pactId)}/verify`, {
    method: "POST",
    body: JSON.stringify({ actorId, pass }),
  });
  apply(out.state);
  return out.result;
}
