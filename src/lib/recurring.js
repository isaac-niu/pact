import { NOTICE_TYPES, mergeNotices, notice } from "./notifications.js";

export const CADENCES = ["none", "daily", "3x-week", "weekly"];

const DAY = 24 * 60 * 60 * 1000;

const STEP_MS = {
  daily: DAY,
  "3x-week": 2 * DAY,
  weekly: 7 * DAY,
};

export function normalizeCadence(value) {
  return CADENCES.includes(value) && value !== "none" ? value : "none";
}

export function cadenceLabel(cadence) {
  return {
    none: "One-off",
    daily: "Daily",
    "3x-week": "3× / week",
    weekly: "Weekly",
  }[normalizeCadence(cadence)];
}

export function nextOccurrenceDeadline(pact, from = Date.now()) {
  const step = STEP_MS[normalizeCadence(pact?.cadence)];
  if (!step) return null;
  return from + step;
}

export function defaultSeriesUntil(from = Date.now()) {
  return from + 30 * DAY;
}

export function seriesFields(input = {}, now = Date.now(), makeId = () => `ser_${now}`) {
  const cadence = normalizeCadence(input.cadence);
  if (cadence === "none") {
    return {
      cadence: "none",
      seriesId: null,
      occurrence: 1,
      streak: 0,
      seriesUntil: null,
      parentPactId: null,
      nextSpawnAt: null,
    };
  }
  return {
    cadence,
    seriesId: input.seriesId || makeId(),
    occurrence: Number(input.occurrence) > 0 ? Number(input.occurrence) : 1,
    streak: Number.isFinite(Number(input.streak)) ? Number(input.streak) : 0,
    seriesUntil: Number(input.seriesUntil) || defaultSeriesUntil(now),
    parentPactId: input.parentPactId || null,
    nextSpawnAt: null,
  };
}

export function nextStreak(resolved) {
  if (!resolved) return 0;
  return resolved.winnerId === resolved.creatorId ? (resolved.streak || 0) + 1 : 0;
}

export function withNextSpawn(resolved) {
  if (normalizeCadence(resolved.cadence) === "none") return { ...resolved, nextSpawnAt: null };
  const at = nextOccurrenceDeadline(resolved, resolved.resolvedAt || Date.now());
  if (resolved.seriesUntil && at > resolved.seriesUntil) return { ...resolved, nextSpawnAt: null };
  return { ...resolved, nextSpawnAt: at };
}

export function dueToSpawn(pact, pacts, now = Date.now()) {
  if (!pact || pact.status !== "resolved") return false;
  if (normalizeCadence(pact.cadence) === "none") return false;
  if (pact.seriesPaused || !pact.nextSpawnAt || pact.nextSpawnAt > now) return false;
  return !(pacts || []).some((row) => row.parentPactId === pact.id);
}

export function seriesSpawnedNotices(pact, now = Date.now()) {
  return [
    notice({
      userId: pact.creatorId,
      type: NOTICE_TYPES.SERIES,
      pactId: pact.id,
      title: "Next slip posted",
      body: `Occurrence ${pact.occurrence} of “${pact.title}” is on the board. Streak ${pact.streak}.`,
      at: now,
    }),
    notice({
      userId: pact.opponentId,
      type: NOTICE_TYPES.SERIES,
      pactId: pact.id,
      title: "Series slip to accept",
      body: `A new “${pact.title}” is waiting on your desk.`,
      at: now,
    }),
  ];
}

export function seriesPausedNotice(parent, now = Date.now()) {
  return notice({
    userId: parent.creatorId,
    type: NOTICE_TYPES.SERIES,
    pactId: parent.id,
    title: "Series paused",
    body: `Not enough virtual SOL to post the next “${parent.title}”.`,
    at: now,
  });
}

export function applyRecurringSpawns(state, { now = Date.now(), uid, bankOf } = {}) {
  if (typeof uid !== "function" || typeof bankOf !== "function") {
    throw new Error("applyRecurringSpawns needs uid and bankOf");
  }
  let next = state;
  const created = [];
  for (const parent of state.pacts || []) {
    if (!dueToSpawn(parent, next.pacts, now)) continue;
    if (bankOf(parent.creatorId, next) < parent.stake) {
      next = {
        ...next,
        pacts: next.pacts.map((p) => (p.id === parent.id ? { ...p, nextSpawnAt: null, seriesPaused: true } : p)),
        notifications: mergeNotices(next.notifications, [seriesPausedNotice(parent, now)]),
      };
      continue;
    }
    const child = {
      id: uid("pkt"),
      title: parent.title,
      criteria: parent.criteria,
      checklist: parent.checklist || [],
      stake: parent.stake,
      deadline: nextOccurrenceDeadline(parent, now),
      creatorId: parent.creatorId,
      opponentId: parent.opponentId,
      status: "open",
      evidenceUrl: null,
      evidenceName: null,
      evidenceKind: "photo",
      evidenceFiles: [],
      evidenceSignal: null,
      verdict: null,
      winnerId: null,
      visibility: parent.visibility === "private" ? "private" : "public",
      createdAt: now,
      acceptedAt: null,
      provedAt: null,
      resolvedAt: null,
      ...seriesFields(
        {
          cadence: parent.cadence,
          seriesId: parent.seriesId,
          occurrence: (parent.occurrence || 1) + 1,
          streak: nextStreak(parent),
          seriesUntil: parent.seriesUntil,
          parentPactId: parent.id,
        },
        now,
        () => parent.seriesId,
      ),
    };
    next = {
      ...next,
      pacts: [child, ...next.pacts],
      events: [
        { id: uid("ev"), pactId: child.id, type: "posted", actorId: child.creatorId, at: now, note: `${child.title} · series` },
        ...next.events,
      ],
      ledger: [
        {
          id: uid("ld"),
          userId: child.creatorId,
          amount: -child.stake,
          kind: "stake",
          pactId: child.id,
          at: now,
          note: child.title,
        },
        ...next.ledger,
      ],
      notifications: mergeNotices(next.notifications, seriesSpawnedNotices(child, now)),
    };
    created.push(child);
  }
  return { state: next, created };
}
