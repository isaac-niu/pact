import { STARTING_BANK, otherUserId, userById } from "../data/users.js";
import { emptyDemoState, SEED_VERSION } from "../data/seed.js";
import { defaultDeadline } from "../lib/format.js";
import {
  acceptedNotice,
  markAllNoticesRead,
  markNoticeRead,
  mergeNotices,
  noticesFromLifecycle,
  provedNotice,
  reviewNotice,
} from "../lib/notifications.js";
import { applyDeadlineReminders } from "../lib/reminders.js";
import { applyRecurringSpawns, seriesFields, withNextSpawn } from "../lib/recurring.js";
import {
  appealNotice,
  canFlagAppeal,
  canResolveAppeal,
  gradedNotice,
  requireGradeReason,
} from "../lib/appeals.js";
import { judgeEvidence } from "./referee.js";

export const STORAGE_KEY = "pact.demo.v2";
const LEGACY_KEY = "pact.demo.v1";

const listeners = new Set();
let state = loadState();

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function persist(next) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripEvidenceForStorage(next)));
  } catch {
    // Quota / private mode — keep working in memory.
  }
  for (const fn of listeners) fn(getSnapshot());
}

function stripEvidenceForStorage(next) {
  // Keep data URLs. Object URLs cannot be revived after refresh.
  return next;
}

function upgradePact(p) {
  return {
    criteria: "Photo evidence that the written challenge happened.",
    deadline: (p.createdAt ?? Date.now()) + 24 * 60 * 60 * 1000,
    winnerId: p.winnerId ?? null,
    acceptedAt: p.status === "open" ? null : (p.createdAt ?? Date.now()),
    provedAt: p.evidenceUrl || p.evidenceName ? (p.createdAt ?? Date.now()) : null,
    resolvedAt: p.status === "resolved" ? Date.now() : null,
    cadence: "none",
    seriesId: null,
    occurrence: 1,
    streak: 0,
    seriesUntil: null,
    parentPactId: null,
    nextSpawnAt: null,
    ...p,
  };
}

function eventsFromLegacy(pacts) {
  const events = [];
  for (const p of pacts) {
    events.push({
      id: uid("ev"),
      pactId: p.id,
      type: "posted",
      actorId: p.creatorId,
      at: p.createdAt,
      note: p.title,
    });
    if (p.acceptedAt || ["accepted", "evidence", "judging", "resolved"].includes(p.status)) {
      events.push({
        id: uid("ev"),
        pactId: p.id,
        type: "accepted",
        actorId: p.opponentId,
        at: p.acceptedAt ?? p.createdAt,
        note: "Matched the stake",
      });
    }
    if (p.provedAt || p.evidenceName || p.evidenceUrl) {
      events.push({
        id: uid("ev"),
        pactId: p.id,
        type: "proved",
        actorId: p.creatorId,
        at: p.provedAt ?? p.createdAt,
        note: p.evidenceName,
      });
    }
    if (p.status === "resolved" && p.winnerId) {
      const loserId = p.winnerId === p.creatorId ? p.opponentId : p.creatorId;
      events.push({
        id: uid("ev"),
        pactId: p.id,
        type: "won",
        actorId: p.winnerId,
        at: p.resolvedAt ?? Date.now(),
        note: "Takes the pot",
      });
      events.push({
        id: uid("ev"),
        pactId: p.id,
        type: "lost",
        actorId: loserId,
        at: (p.resolvedAt ?? Date.now()) + 1,
        note: "Stake gone",
      });
    }
  }
  return events.sort((a, b) => b.at - a.at);
}

function ledgerFromLegacy(pacts) {
  const rows = [];
  for (const p of pacts) {
    rows.push({
      id: uid("ld"),
      userId: p.creatorId,
      amount: -p.stake,
      kind: "stake",
      pactId: p.id,
      at: p.createdAt,
      note: p.title,
    });
    if (p.status !== "open") {
      rows.push({
        id: uid("ld"),
        userId: p.opponentId,
        amount: -p.stake,
        kind: "stake",
        pactId: p.id,
        at: p.acceptedAt ?? p.createdAt,
        note: p.title,
      });
    }
    if (p.status === "resolved" && p.winnerId) {
      rows.push({
        id: uid("ld"),
        userId: p.winnerId,
        amount: p.stake * 2,
        kind: "payout",
        pactId: p.id,
        at: p.resolvedAt ?? Date.now(),
        note: "Pot paid",
      });
    }
  }
  return rows.sort((a, b) => b.at - a.at);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.seedVersion !== SEED_VERSION) {
        return emptyDemoState();
      }
      return normalize(parsed);
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      return emptyDemoState();
    }
    return emptyDemoState();
  } catch {
    return emptyDemoState();
  }
}

function normalize(parsed) {
  const pacts = Array.isArray(parsed.pacts) ? parsed.pacts.map(upgradePact) : [];
  const events = Array.isArray(parsed.events) ? parsed.events : eventsFromLegacy(pacts);
  const notifications = Array.isArray(parsed.notifications)
    ? parsed.notifications
    : noticesFromLifecycle(pacts, events);
  return {
    userId: parsed.userId === "friend" ? "friend" : "you",
    seedVersion: SEED_VERSION,
    startingBank: Number.isFinite(parsed.startingBank) ? parsed.startingBank : STARTING_BANK,
    pacts,
    events,
    ledger: Array.isArray(parsed.ledger) ? parsed.ledger : ledgerFromLegacy(pacts),
    notifications,
  };
}

export function getSnapshot() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function bankOf(userId, snap = state) {
  const start = snap.startingBank ?? STARTING_BANK;
  return snap.ledger
    .filter((row) => row.userId === userId)
    .reduce((sum, row) => sum + row.amount, start);
}

export function recordOf(userId, snap = state) {
  const done = snap.pacts.filter(
    (p) =>
      p.status === "resolved" && (p.creatorId === userId || p.opponentId === userId),
  );
  const wins = done.filter((p) => p.winnerId === userId).length;
  const losses = done.length - wins;
  return {
    wins,
    losses,
    played: done.length,
    rate: done.length ? wins / done.length : null,
  };
}

export function switchUser(id) {
  if (id !== "you" && id !== "friend") return;
  persist({ ...state, userId: id });
}

export function resetDesk() {
  persist(emptyDemoState());
}

export function reloadDesk() {
  persist(loadState());
}

export function replaceDesk(next) {
  persist(normalize(next));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

function requireUser(actorId) {
  const user = userById(actorId);
  if (!user) throw new Error("Unknown demo user");
  return user;
}

/**
 * Local createPact. Deducts the creator's virtual SOL immediately.
 */
export async function createPact(input, ctx = {}) {
  const actorId = ctx.actorId ?? state.userId;
  requireUser(actorId);

  const title = String(input.title ?? "").trim();
  const criteria = String(input.criteria ?? "").trim();
  const stake = Number(input.stake);
  const deadline = Number(input.deadline) || defaultDeadline();
  const opponentId = input.opponentId || otherUserId(actorId);

  if (!title) throw new Error("Write the challenge");
  if (!criteria) throw new Error("Say what counts as proof");
  if (!Number.isFinite(stake) || stake <= 0) throw new Error("Stake a positive amount");
  if (opponentId === actorId) throw new Error("Pick the other desk");
  if (!userById(opponentId)) throw new Error("Unknown opponent");
  if (bankOf(actorId) < stake) throw new Error("Not enough virtual SOL");

  const now = Date.now();
  const pact = {
    id: uid("pkt"),
    title,
    criteria,
    stake,
    deadline,
    creatorId: actorId,
    opponentId,
    status: "open",
    evidenceUrl: null,
    evidenceName: null,
    verdict: null,
    winnerId: null,
    visibility: input.visibility === "private" ? "private" : "public",
    createdAt: now,
    acceptedAt: null,
    provedAt: null,
    resolvedAt: null,
    ...seriesFields(input, now, () => uid("ser")),
  };

  persist({
    ...state,
    pacts: [pact, ...state.pacts],
    events: [
      { id: uid("ev"), pactId: pact.id, type: "posted", actorId, at: now, note: title },
      ...state.events,
    ],
    ledger: [
      { id: uid("ld"), userId: actorId, amount: -stake, kind: "stake", pactId: pact.id, at: now, note: title },
      ...state.ledger,
    ],
  });

  return pact;
}

/**
 * Local acceptPact. Counterparty matches the stake; pot locks.
 */
export async function acceptPact(pactId, ctx = {}) {
  const actorId = ctx.actorId ?? state.userId;
  requireUser(actorId);
  const pact = state.pacts.find((p) => p.id === pactId);
  if (!pact) throw new Error("Slip not on the board");
  if (pact.status !== "open") throw new Error("This slip is no longer open");
  if (pact.opponentId !== actorId) throw new Error("Only the listed friend can accept");
  if (bankOf(actorId) < pact.stake) throw new Error("Not enough virtual SOL to match");

  const now = Date.now();
  const next = { ...pact, status: "accepted", acceptedAt: now };

  persist({
    ...state,
    pacts: state.pacts.map((p) => (p.id === pactId ? next : p)),
    events: [
      { id: uid("ev"), pactId, type: "accepted", actorId, at: now, note: "Matched the stake" },
      ...state.events,
    ],
    ledger: [
      {
        id: uid("ld"),
        userId: actorId,
        amount: -pact.stake,
        kind: "stake",
        pactId,
        at: now,
        note: pact.title,
      },
      ...state.ledger,
    ],
    notifications: mergeNotices(state.notifications, [acceptedNotice(next, actorId, now)]),
  });

  return next;
}

function settle(latest, verdict) {
  const winnerId = verdict.result === "pass" ? latest.creatorId : latest.opponentId;
  const loserId = winnerId === latest.creatorId ? latest.opponentId : latest.creatorId;
  const resolvedAt = Date.now();
  const pot = latest.stake * 2;
  const resolved = withNextSpawn({
    ...latest,
    status: "resolved",
    verdict,
    winnerId,
    resolvedAt,
  });

  persist({
    ...state,
    pacts: state.pacts.map((p) => (p.id === latest.id ? resolved : p)),
    events: [
      { id: uid("ev"), pactId: latest.id, type: "won", actorId: winnerId, at: resolvedAt, note: "Takes the pot" },
      { id: uid("ev"), pactId: latest.id, type: "lost", actorId: loserId, at: resolvedAt + 1, note: "Stake gone" },
      ...state.events,
    ],
    ledger: [
      {
        id: uid("ld"),
        userId: winnerId,
        amount: pot,
        kind: "payout",
        pactId: latest.id,
        at: resolvedAt,
        note: "Pot paid",
      },
      ...state.ledger,
    ],
  });

  return resolved;
}

/**
 * Local submitEvidence. Stores the photo, asks Gemini Flash (via /api/referee).
 * ≥0.8 auto-resolves, <0.4 friend wins, middle band waits on friend-verify.
 */
export async function submitEvidence(pactId, file, ctx = {}) {
  const actorId = ctx.actorId ?? state.userId;
  requireUser(actorId);
  const pact = state.pacts.find((p) => p.id === pactId);
  if (!pact) throw new Error("Slip not on the board");
  if (pact.creatorId !== actorId) throw new Error("Only the challenger uploads proof");
  if (!["accepted", "evidence"].includes(pact.status)) {
    throw new Error("This slip is not live for proof");
  }
  if (!file) throw new Error("Add a photo first");

  const evidenceUrl = await readFileAsDataUrl(file);
  const evidenceName = file.name || "proof.jpg";
  const provedAt = Date.now();

  persist({
    ...state,
    pacts: state.pacts.map((p) =>
      p.id === pactId
        ? {
            ...p,
            status: "judging",
            evidenceUrl,
            evidenceName,
            provedAt,
            verdict: null,
            winnerId: null,
          }
        : p,
    ),
    events: [
      { id: uid("ev"), pactId, type: "proved", actorId, at: provedAt, note: evidenceName },
      ...state.events,
    ],
    notifications: mergeNotices(state.notifications, [provedNotice(pact, actorId, provedAt)]),
  });

  const verdict = await judgeEvidence({
    title: pact.title,
    criteria: pact.criteria,
    fileName: evidenceName,
    dataUrl: evidenceUrl,
    pactId,
    creatorId: pact.creatorId,
    opponentId: pact.opponentId,
    stake: pact.stake,
  });

  const latest = state.pacts.find((p) => p.id === pactId);
  if (!latest) throw new Error("Slip vanished mid-call");
  const framed = {
    ...latest,
    evidenceUrl: verdict.evidenceUrl || latest.evidenceUrl,
    evidenceGridFsId: verdict.evidenceGridFsId || null,
  };

  if (verdict.auto === false || verdict.result === "review") {
    const reviewed = { ...framed, status: "review", verdict };
    persist({
      ...state,
      pacts: state.pacts.map((p) => (p.id === pactId ? reviewed : p)),
      events: [
        {
          id: uid("ev"),
          pactId,
          type: "review",
          actorId: framed.opponentId,
          at: Date.now(),
          note: "Gemini unsure — friend verifies",
        },
        ...state.events,
      ],
      notifications: mergeNotices(state.notifications, [reviewNotice(reviewed)]),
    });
    return reviewed;
  }

  return settle(framed, verdict);
}

export async function flagAppeal(pactId, note, ctx = {}) {
  const actorId = ctx.actorId ?? state.userId;
  requireUser(actorId);
  const pact = state.pacts.find((p) => p.id === pactId);
  if (!pact) throw new Error("Slip not on the board");
  if (!canFlagAppeal(pact, actorId)) throw new Error("This slip cannot be flagged");
  const now = Date.now();
  const appeal = {
    status: "open",
    flaggedBy: actorId,
    note: String(note ?? "").trim() || "Flagged the Gemini call.",
    at: now,
    resolution: null,
  };
  const next = { ...pact, status: "appeal", appeal };
  persist({
    ...state,
    pacts: state.pacts.map((p) => (p.id === pactId ? next : p)),
    events: [
      { id: uid("ev"), pactId, type: "flagged", actorId, at: now, note: appeal.note },
      ...state.events,
    ],
    notifications: mergeNotices(state.notifications, [appealNotice(next, actorId, now)]),
  });
  return next;
}

export async function verifyPact(pactId, pass, ctx = {}) {
  const actorId = ctx.actorId ?? state.userId;
  requireUser(actorId);
  const pact = state.pacts.find((p) => p.id === pactId);
  if (!pact) throw new Error("Slip not on the board");
  if (!canResolveAppeal(pact, actorId)) throw new Error("This slip is not waiting on a visible grade");
  const reason = requireGradeReason(ctx.reason);

  const now = Date.now();
  const appeal = {
    status: "resolved",
    flaggedBy: pact.appeal?.flaggedBy || actorId,
    note: pact.appeal?.note || "Friend grade on the REVIEW call.",
    at: pact.appeal?.at || now,
    resolution: { actorId, pass: Boolean(pass), reason, at: now },
  };
  const framed = { ...pact, status: pact.status === "appeal" ? "appeal" : "review", appeal };

  persist({
    ...state,
    pacts: state.pacts.map((p) => (p.id === pactId ? framed : p)),
    events: [
      { id: uid("ev"), pactId, type: "graded", actorId, at: now, note: reason },
      ...state.events,
    ],
    notifications: mergeNotices(state.notifications, [gradedNotice(framed, actorId, now)]),
  });

  const resolved = settle(framed, {
    result: pass ? "pass" : "fail",
    confidence: pact.verdict?.confidence ?? 0.5,
    rationale: reason,
    source: pact.status === "appeal" ? "appeal" : "friend",
    auto: true,
  });

  fetch("/api/pacts/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      pactId,
      title: pact.title,
      criteria: pact.criteria,
      creatorId: pact.creatorId,
      opponentId: pact.opponentId,
      stake: pact.stake,
      evidenceUrl: pact.evidenceUrl,
      evidenceName: pact.evidenceName,
      evidenceGridFsId: pact.evidenceGridFsId,
      verdict: resolved.verdict,
      winnerId: resolved.winnerId,
    }),
  }).catch(() => {});

  return resolved;
}

export async function markNoticeReadForUser(noticeId, ctx = {}) {
  const actorId = ctx.actorId ?? state.userId;
  requireUser(actorId);
  persist({
    ...state,
    notifications: markNoticeRead(state.notifications, noticeId, actorId),
  });
  return (state.notifications || []).find((n) => n.id === noticeId) || null;
}

export async function markAllNoticesReadForUser(ctx = {}) {
  const actorId = ctx.actorId ?? state.userId;
  requireUser(actorId);
  persist({
    ...state,
    notifications: markAllNoticesRead(state.notifications, actorId),
  });
  return { ok: true };
}

export async function tickReminders(now = Date.now()) {
  const reminded = applyDeadlineReminders(state, now);
  const spawned = applyRecurringSpawns(reminded.state, { now, uid, bankOf });
  if (reminded.created.length || spawned.created.length) persist(spawned.state);
  return { created: reminded.created.length, spawned: spawned.created.length };
}
