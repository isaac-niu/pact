import { userById } from "../data/users.js";
import { LAMPORTS_PER_SOL } from "../backend/constants.js";
import { api } from "../api.js";
import { judgeEvidence } from "../api/referee.js";

export const DESK_OPPONENT = "__desk__";

const DEFAULT_CRITERIA = "Photo evidence that the written challenge happened.";

export function challengeTargets(friends = [], people = []) {
  return friends.length ? friends : people;
}

export function liveActor(id, directory = [], fallback = "Friend") {
  const desk = userById(id);
  if (desk) return desk;
  const live = (directory || []).find((entry) => entry.id === id);
  if (live) {
    return {
      id: live.id,
      name: live.name || live.email || fallback,
      handle: live.name || live.email || fallback,
      pill: live.name || fallback,
    };
  }
  if (!id) return { id: "", name: fallback, handle: fallback, pill: fallback };
  return { id, name: fallback, handle: fallback, pill: fallback };
}

export function liveStatusToDesk(status) {
  if (status === "draft") return "open";
  if (status === "settled") return "resolved";
  return status || "open";
}

export function isLiveOneOnOne(pact) {
  return Boolean(pact && !pact.groupId && pact.opponentId);
}

export function toDeskPact(live) {
  const createdAt = Number(live.createdAt) || Date.now();
  return {
    id: live.id,
    title: live.title,
    criteria: live.criteria?.trim() || DEFAULT_CRITERIA,
    checklist: live.checklist || [],
    stake: Number(live.stakeLamports || 0) / LAMPORTS_PER_SOL,
    deadline: Number(live.deadline) || createdAt + 24 * 60 * 60 * 1000,
    creatorId: live.creatorId,
    opponentId: live.opponentId,
    status: liveStatusToDesk(live.status),
    evidenceUrl: live.evidenceUrl || null,
    evidenceName: live.evidenceName || null,
    verdict: live.verdict || null,
    winnerId: live.winnerId || null,
    visibility: live.visibility === "private" ? "private" : "public",
    createdAt,
    acceptedAt: live.acceptedAt || null,
    provedAt: live.provedAt || null,
    resolvedAt: live.resolvedAt || null,
    source: "live",
  };
}

export function eventsFromLivePact(pact) {
  const events = [
    {
      id: `${pact.id}:posted`,
      pactId: pact.id,
      type: "posted",
      actorId: pact.creatorId,
      at: pact.createdAt,
      note: pact.title,
    },
  ];
  if (pact.status !== "open" && pact.status !== "declined") {
    events.push({
      id: `${pact.id}:accepted`,
      pactId: pact.id,
      type: "accepted",
      actorId: pact.opponentId,
      at: pact.acceptedAt || pact.createdAt,
      note: "Matched the stake",
    });
  }
  if (pact.provedAt || pact.evidenceName || pact.evidenceUrl) {
    events.push({
      id: `${pact.id}:proved`,
      pactId: pact.id,
      type: "proved",
      actorId: pact.creatorId,
      at: pact.provedAt || pact.createdAt,
      note: pact.evidenceName || "proof",
    });
  }
  if (pact.status === "resolved" && pact.winnerId) {
    const loserId = pact.winnerId === pact.creatorId ? pact.opponentId : pact.creatorId;
    events.push({
      id: `${pact.id}:won`,
      pactId: pact.id,
      type: "won",
      actorId: pact.winnerId,
      at: pact.resolvedAt || pact.createdAt,
      note: "Takes the pot",
    });
    events.push({
      id: `${pact.id}:lost`,
      pactId: pact.id,
      type: "lost",
      actorId: loserId,
      at: (pact.resolvedAt || pact.createdAt) + 1,
      note: "Stake gone",
    });
  }
  return events;
}

export function mergeLiveBoard(localPacts = [], localEvents = [], livePacts = []) {
  const mapped = livePacts.filter(isLiveOneOnOne).map(toDeskPact);
  const liveIds = new Set(mapped.map((p) => p.id));
  const pacts = [...mapped, ...localPacts.filter((p) => !liveIds.has(p.id))];
  const events = [...mapped.flatMap(eventsFromLivePact), ...localEvents.filter((e) => !liveIds.has(e.pactId))];
  return { pacts, events };
}

export function shouldAutoSettle(verdict) {
  if (!verdict) return false;
  if (verdict.auto === false) return false;
  if (verdict.source === "gemini-error") return false;
  return verdict.result === "pass" || verdict.result === "fail";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

export async function submitLiveProof(pact, file, tokenOf) {
  if (!file) throw new Error("Add a photo first");
  const dataUrl = await readFileAsDataUrl(file);
  const evidenceName = file.name || "proof.jpg";
  const verdict = await judgeEvidence({
    title: pact.title,
    criteria: pact.criteria,
    checklist: pact.checklist,
    fileName: evidenceName,
    dataUrl,
    pactId: pact.id,
    creatorId: pact.creatorId,
    opponentId: pact.opponentId,
    stake: pact.stake,
  });
  const token = await tokenOf();
  return api(`/api/pacts/${encodeURIComponent(pact.id)}/evidence`, {
    token,
    method: "POST",
    body: {
      evidenceName,
      evidenceUrl: verdict.evidenceUrl || dataUrl,
      verdict,
    },
  });
}
