export function pactVisibility(pact) {
  return pact?.visibility === "private" ? "private" : "public";
}

export function isParticipant(pact, userId) {
  return Boolean(pact && (pact.creatorId === userId || pact.opponentId === userId));
}

export function canSeePact(pact, userId) {
  if (!pact) return false;
  if (pactVisibility(pact) === "public") return true;
  return isParticipant(pact, userId);
}

export function pactsOnTape(pacts, tape, userId) {
  const want = tape === "private" ? "private" : "public";
  return (pacts || []).filter((p) => pactVisibility(p) === want && canSeePact(p, userId));
}

export function eventsOnTape(events, pacts, tape, userId) {
  const allowed = new Set(pactsOnTape(pacts, tape, userId).map((p) => p.id));
  return (events || []).filter((ev) => allowed.has(ev.pactId));
}

export function normalizeVisibility(value) {
  return value === "private" ? "private" : "public";
}
