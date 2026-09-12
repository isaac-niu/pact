import { STARTING_BANK, userById } from "../src/data/users.js";
import { applySideStake, settleSideStakes } from "../src/lib/sideStakes.js";
import { emptyDemoState } from "../src/data/seed.js";
import {
  acceptedNotice,
  markAllNoticesRead as applyMarkAllRead,
  markNoticeRead as applyMarkRead,
  mergeNotices,
  provedNotice,
  reviewNotice,
} from "../src/lib/notifications.js";
import { applyDeadlineReminders } from "../src/lib/reminders.js";
import { applyRecurringSpawns, seriesFields, withNextSpawn } from "../src/lib/recurring.js";
import {
  appealNotice,
  canFlagAppeal,
  canResolveAppeal,
  gradedNotice,
  requireGradeReason,
} from "../src/lib/appeals.js";
import { applyComment, applyReaction } from "../src/lib/tapeTalk.js";
import { attachChecklistToVerdict, friendItemMarks, slipCriteria } from "../src/lib/successCriteria.js";
import { normalizeProofPayload, primaryProofFile } from "../src/lib/proofMedia.js";

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function bankOf(userId, snap) {
  const start = snap.startingBank ?? STARTING_BANK;
  return snap.ledger
    .filter((row) => row.userId === userId)
    .reduce((sum, row) => sum + row.amount, start);
}

export function recordOf(userId, snap) {
  const done = snap.pacts.filter(
    (p) => p.status === "resolved" && (p.creatorId === userId || p.opponentId === userId),
  );
  const wins = done.filter((p) => p.winnerId === userId).length;
  return { wins, losses: done.length - wins, played: done.length, rate: done.length ? wins / done.length : null };
}

export function createDeskLogic(judge) {
  return {
    async createPact(state, input, actorId) {
      if (!userById(actorId)) throw new Error("Unknown demo user");
      const title = String(input.title ?? "").trim();
      const { criteria, checklist } = slipCriteria(input);
      const stake = Number(input.stake);
      const deadline = Number(input.deadline) || Date.now() + 24 * 60 * 60 * 1000;
      const opponentId = input.opponentId || (actorId === "you" ? "friend" : "you");
      if (!title) throw new Error("Write the challenge");
      if (!Number.isFinite(stake) || stake <= 0) throw new Error("Stake a positive amount");
      if (opponentId === actorId) throw new Error("Pick the other desk");
      if (!userById(opponentId)) throw new Error("Unknown opponent");
      if (bankOf(actorId, state) < stake) throw new Error("Not enough virtual SOL");

      const now = Date.now();
      const pact = {
        id: uid("pkt"),
        title,
        criteria,
        checklist,
        stake,
        deadline,
        creatorId: actorId,
        opponentId,
        status: "open",
        evidenceUrl: null,
        evidenceName: null,
        evidenceKind: "photo",
        evidenceFiles: [],
        evidenceSignal: null,
        verdict: null,
        winnerId: null,
        visibility: input.visibility === "private" ? "private" : "public",
        createdAt: now,
        acceptedAt: null,
        provedAt: null,
        resolvedAt: null,
        ...seriesFields(input, now, () => uid("ser")),
      };
      return {
        state: {
          ...state,
          pacts: [pact, ...state.pacts],
          events: [{ id: uid("ev"), pactId: pact.id, type: "posted", actorId, at: now, note: title }, ...state.events],
          ledger: [
            { id: uid("ld"), userId: actorId, amount: -stake, kind: "stake", pactId: pact.id, at: now, note: title },
            ...state.ledger,
          ],
        },
        result: pact,
      };
    },

    async acceptPact(state, pactId, actorId) {
      if (!userById(actorId)) throw new Error("Unknown demo user");
      const pact = state.pacts.find((p) => p.id === pactId);
      if (!pact) throw new Error("Slip not on the board");
      if (pact.status !== "open") throw new Error("This slip is no longer open");
      if (pact.opponentId !== actorId) throw new Error("Only the listed friend can accept");
      if (bankOf(actorId, state) < pact.stake) throw new Error("Not enough virtual SOL to match");
      const now = Date.now();
      const next = { ...pact, status: "accepted", acceptedAt: now };
      return {
        state: {
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
        },
        result: next,
      };
    },

    async submitEvidence(state, pactId, file, actorId) {
      if (!userById(actorId)) throw new Error("Unknown demo user");
      const pact = state.pacts.find((p) => p.id === pactId);
      if (!pact) throw new Error("Slip not on the board");
      if (pact.creatorId !== actorId) throw new Error("Only the challenger uploads proof");
      if (!["accepted", "evidence"].includes(pact.status)) throw new Error("This slip is not live for proof");
      const payload = normalizeProofPayload(file);
      const primary = primaryProofFile(payload);
      if (!primary?.dataUrl && !payload.signal) throw new Error("Add a photo first");

      const evidenceName = payload.label;
      const provedAt = Date.now();
      let nextState = {
        ...state,
        pacts: state.pacts.map((p) =>
          p.id === pactId
            ? {
                ...p,
                status: "judging",
                evidenceUrl: primary?.dataUrl || null,
                evidenceName,
                evidenceKind: payload.kind,
                evidenceFiles: payload.files,
                evidenceSignal: payload.signal || null,
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
      };

      const verdict = attachChecklistToVerdict(
        await judge({
          title: pact.title,
          criteria: pact.criteria,
          checklist: pact.checklist,
          fileName: evidenceName,
          dataUrl: primary?.dataUrl || null,
          files: payload.files,
          kind: payload.kind,
          signal: payload.signal,
        }),
        { ...pact, fileName: evidenceName },
      );

      const latest = nextState.pacts.find((p) => p.id === pactId);
      if (verdict.auto === false || verdict.result === "review") {
        const reviewed = { ...latest, status: "review", verdict };
        const now = Date.now();
        nextState = {
          ...nextState,
          pacts: nextState.pacts.map((p) => (p.id === pactId ? reviewed : p)),
          events: [
            { id: uid("ev"), pactId, type: "review", actorId: reviewed.opponentId, at: now, note: "Gemini unsure — friend verifies" },
            ...nextState.events,
          ],
          notifications: mergeNotices(nextState.notifications, [reviewNotice(reviewed, now)]),
        };
        return { state: nextState, result: reviewed };
      }

      const settled = settle(nextState, pactId, verdict);
      return { state: settled, result: settled.pacts.find((p) => p.id === pactId) };
    },

    async flagAppeal(state, pactId, note, actorId) {
      if (!userById(actorId)) throw new Error("Unknown demo user");
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
      return {
        state: {
          ...state,
          pacts: state.pacts.map((p) => (p.id === pactId ? next : p)),
          events: [{ id: uid("ev"), pactId, type: "flagged", actorId, at: now, note: appeal.note }, ...state.events],
          notifications: mergeNotices(state.notifications, [appealNotice(next, actorId, now)]),
        },
        result: next,
      };
    },

    async verifyPact(state, pactId, pass, actorId, reason) {
      if (!userById(actorId)) throw new Error("Unknown demo user");
      const pact = state.pacts.find((p) => p.id === pactId);
      if (!pact) throw new Error("Slip not on the board");
      if (!canResolveAppeal(pact, actorId)) throw new Error("This slip is not waiting on a visible grade");
      const extra = reason && typeof reason === "object" ? reason : { reason };
      const gradeReason = requireGradeReason(extra.reason);
      const now = Date.now();
      const appeal = {
        status: "resolved",
        flaggedBy: pact.appeal?.flaggedBy || actorId,
        note: pact.appeal?.note || "Friend grade on the REVIEW call.",
        at: pact.appeal?.at || now,
        resolution: { actorId, pass: Boolean(pass), reason: gradeReason, at: now },
      };
      const framed = { ...pact, appeal };
      const prepared = {
        ...state,
        pacts: state.pacts.map((p) => (p.id === pactId ? framed : p)),
        events: [{ id: uid("ev"), pactId, type: "graded", actorId, at: now, note: gradeReason }, ...state.events],
        notifications: mergeNotices(state.notifications, [gradedNotice(framed, actorId, now)]),
      };
      const verdict = {
        result: pass ? "pass" : "fail",
        confidence: pact.verdict?.confidence ?? 0.5,
        rationale: gradeReason,
        source: pact.status === "appeal" ? "appeal" : "friend",
        auto: true,
        items: friendItemMarks(pact, pass, extra.itemMarks, gradeReason) || pact.verdict?.items,
      };
      const next = settle(prepared, pactId, verdict);
      return { state: next, result: next.pacts.find((p) => p.id === pactId) };
    },

    async markNoticeRead(state, noticeId, actorId) {
      if (!userById(actorId)) throw new Error("Unknown demo user");
      const notifications = applyMarkRead(state.notifications, noticeId, actorId);
      return {
        state: { ...state, notifications },
        result: notifications.find((n) => n.id === noticeId) || null,
      };
    },

    async markAllNoticesRead(state, actorId) {
      if (!userById(actorId)) throw new Error("Unknown demo user");
      return {
        state: { ...state, notifications: applyMarkAllRead(state.notifications, actorId) },
        result: { ok: true },
      };
    },

    async tickReminders(state, now = Date.now()) {
      const reminded = applyDeadlineReminders(state, now);
      const spawned = applyRecurringSpawns(reminded.state, { now, uid, bankOf });
      return {
        state: spawned.state,
        result: { created: reminded.created.length, spawned: spawned.created.length },
      };
    },

    async reactToMark(state, eventId, emoji, actorId) {
      if (!userById(actorId)) throw new Error("Unknown demo user");
      return applyReaction(state, { eventId, emoji, actorId, uid });
    },

    async commentOnMark(state, eventId, body, actorId) {
      if (!userById(actorId)) throw new Error("Unknown demo user");
      return applyComment(state, { eventId, body, actorId, uid });
    },

    async placeSideStake(state, pactId, input, actorId) {
      if (!userById(actorId)) throw new Error("Unknown demo user");
      return applySideStake(state, {
        pactId,
        actorId,
        side: input.side,
        amount: input.amount,
        uid,
        bankOf,
      });
    },
  };
}

function settle(state, pactId, verdict) {
  const latest = state.pacts.find((p) => p.id === pactId);
  const winnerId = verdict.result === "pass" ? latest.creatorId : latest.opponentId;
  const loserId = winnerId === latest.creatorId ? latest.opponentId : latest.creatorId;
  const resolvedAt = Date.now();
  const pot = latest.stake * 2;
  const resolved = withNextSpawn({ ...latest, status: "resolved", verdict, winnerId, resolvedAt });
  return settleSideStakes(
    {
      ...state,
      pacts: state.pacts.map((p) => (p.id === pactId ? resolved : p)),
      events: [
        { id: uid("ev"), pactId, type: "won", actorId: winnerId, at: resolvedAt, note: "Takes the pot" },
        { id: uid("ev"), pactId, type: "lost", actorId: loserId, at: resolvedAt + 1, note: "Stake gone" },
        ...state.events,
      ],
      ledger: [
        { id: uid("ld"), userId: winnerId, amount: pot, kind: "payout", pactId, at: resolvedAt, note: "Pot paid" },
        ...state.ledger,
      ],
    },
    resolved,
    { now: resolvedAt, uid },
  );
}

export function seededState() {
  return emptyDemoState();
}
