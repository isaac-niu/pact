import { STARTING_BANK, normalizeDeskActor } from "../data/users.js";
import { emptyDemoState } from "../data/seed.js";
import { POLL_POLICIES, createHygienePoll } from "../lib/pollHygiene.js";

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
    notifications: snap.notifications || [],
    reactions: snap.reactions || [],
    comments: snap.comments || [],
    sideStakes: snap.sideStakes || [],
    users: snap.users || [],
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
  const stopPoll = createHygienePoll({
    policy: POLL_POLICIES.desk,
    run: async () => {
      if (!enabled) return;
      await req("/api/desk").then(apply);
    },
  }).start();
  return () => {
    listeners.delete(fn);
    stopPoll();
  };
}

export function switchUser(id) {
  const next = normalizeDeskActor(id);
  if (next !== id) return;
  actorId = next;
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

async function readProofInput(file) {
  if (file?.dataUrl || file?.files) {
    return file;
  }
  const list = Array.isArray(file) || file?.item ? Array.from(file) : file ? [file] : [];
  const files = [];
  for (const item of list) {
    files.push({
      name: item.name || "proof.jpg",
      mime: item.type || "image/jpeg",
      dataUrl: await readFileAsDataUrl(item),
    });
  }
  return { files, name: files[0]?.name };
}

export async function submitEvidence(pactId, file, ctx = {}) {
  actorId = ctx.actorId || actorId;
  const payload = await readProofInput(file);
  const out = await req(`/api/pacts/${encodeURIComponent(pactId)}/evidence`, {
    method: "POST",
    body: JSON.stringify({
      actorId,
      evidenceName: payload.name || payload.files?.[0]?.name || payload.signal && "signal",
      evidenceDataUrl: payload.dataUrl || payload.files?.[0]?.dataUrl,
      evidenceFiles: payload.files,
      evidenceKind: payload.kind,
      signal: payload.signal,
    }),
  });
  apply(out.state);
  return out.result;
}

export async function verifyPact(pactId, pass, ctx = {}) {
  actorId = ctx.actorId || actorId;
  const out = await req(`/api/pacts/${encodeURIComponent(pactId)}/verify`, {
    method: "POST",
    body: JSON.stringify({ actorId, pass, reason: ctx.reason, itemMarks: ctx.itemMarks }),
  });
  apply(out.state);
  return out.result;
}

export async function flagAppeal(pactId, note, ctx = {}) {
  actorId = ctx.actorId || actorId;
  const out = await req(`/api/pacts/${encodeURIComponent(pactId)}/flag`, {
    method: "POST",
    body: JSON.stringify({ actorId, note }),
  });
  apply(out.state);
  return out.result;
}

export async function markNoticeReadForUser(noticeId, ctx = {}) {
  actorId = ctx.actorId || actorId;
  const out = await req(`/api/notices/${encodeURIComponent(noticeId)}/read`, {
    method: "POST",
    body: JSON.stringify({ actorId }),
  });
  apply(out.state);
  return out.result;
}

export async function markAllNoticesReadForUser(ctx = {}) {
  actorId = ctx.actorId || actorId;
  const out = await req("/api/notices/read-all", {
    method: "POST",
    body: JSON.stringify({ actorId }),
  });
  apply(out.state);
  return out.result;
}

export async function tickReminders(now = Date.now()) {
  const out = await req("/api/desk/remind", {
    method: "POST",
    body: JSON.stringify({ now }),
  });
  apply(out.state);
  return out.result;
}

export async function reactToMark(eventId, emoji, ctx = {}) {
  actorId = ctx.actorId || actorId;
  const out = await req(`/api/marks/${encodeURIComponent(eventId)}/react`, {
    method: "POST",
    body: JSON.stringify({ actorId, emoji }),
  });
  apply(out.state);
  return out.result;
}

export async function commentOnMark(eventId, body, ctx = {}) {
  actorId = ctx.actorId || actorId;
  const out = await req(`/api/marks/${encodeURIComponent(eventId)}/comment`, {
    method: "POST",
    body: JSON.stringify({ actorId, body }),
  });
  apply(out.state);
  return out.result;
}

export async function placeSideStake(pactId, input, ctx = {}) {
  actorId = ctx.actorId || actorId;
  const out = await req(`/api/pacts/${encodeURIComponent(pactId)}/side-stake`, {
    method: "POST",
    body: JSON.stringify({ actorId, side: input.side, amount: input.amount }),
  });
  apply(out.state);
  return out.result;
}

export async function attachEscrow(pactId, patch, ctx = {}) {
  actorId = ctx.actorId || actorId;
  const out = await req(`/api/pacts/${encodeURIComponent(pactId)}/escrow`, {
    method: "POST",
    body: JSON.stringify({ actorId, escrow: patch }),
  });
  apply(out.state);
  return out.result;
}
