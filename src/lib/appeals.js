import { userById } from "../data/users.js";
import { NOTICE_TYPES, notice } from "./notifications.js";

export const APPEAL_STATUSES = new Set(["review", "appeal"]);

function handleOf(userId) {
  return userById(userId)?.handle || "Desk";
}

export function isParticipant(pact, userId) {
  return Boolean(pact && (pact.creatorId === userId || pact.opponentId === userId));
}

export function canFlagAppeal(pact, userId) {
  return pact?.status === "review" && !pact.appeal && isParticipant(pact, userId);
}

export function canResolveAppeal(pact, userId) {
  if (!pact || !APPEAL_STATUSES.has(pact.status)) return false;
  if (!isParticipant(pact, userId)) return false;
  if (pact.status === "appeal") return true;
  return pact.opponentId === userId;
}

export function requireGradeReason(reason) {
  const text = String(reason ?? "").trim();
  if (!text) throw new Error("Write why this call stands or fades");
  return text;
}

export function appealNotice(pact, actorId, at = Date.now()) {
  const otherId = actorId === pact.creatorId ? pact.opponentId : pact.creatorId;
  return notice({
    userId: otherId,
    type: NOTICE_TYPES.APPEAL,
    pactId: pact.id,
    title: "Call flagged",
    body: `${handleOf(actorId)} flagged “${pact.title}”. Grade it in the open.`,
    at,
  });
}

export function gradedNotice(pact, actorId, at = Date.now()) {
  const otherId = actorId === pact.creatorId ? pact.opponentId : pact.creatorId;
  return notice({
    userId: otherId,
    type: NOTICE_TYPES.GRADED,
    pactId: pact.id,
    title: "Desk posted a grade",
    body: `${handleOf(actorId)} graded “${pact.title}” in the open.`,
    at,
  });
}
