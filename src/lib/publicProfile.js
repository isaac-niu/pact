/**
 * Shareable public ticket for a desk handle.
 *
 * `/u/:handle` shows win rate, record, and public pact history.
 * Private tape never leaves /me. Bank and ledger stay on the private desk.
 */

import { userByHandle } from "../data/users.js";
import { pactVisibility } from "./visibility.js";

export function publicPactsForUser(pacts, userId) {
  return (pacts || [])
    .filter(
      (pact) =>
        (pact.creatorId === userId || pact.opponentId === userId) && pactVisibility(pact) === "public",
    )
    .slice()
    .sort((a, b) => (b.resolvedAt || b.createdAt || 0) - (a.resolvedAt || a.createdAt || 0));
}

export function publicRecordOf(pacts, userId) {
  const done = publicPactsForUser(pacts, userId).filter((pact) => pact.status === "resolved");
  const wins = done.filter((pact) => pact.winnerId === userId).length;
  const losses = done.length - wins;
  return {
    wins,
    losses,
    played: done.length,
    rate: done.length ? wins / done.length : null,
  };
}

export function formatRate(rate) {
  return rate == null ? "—" : `${Math.round(rate * 100)}%`;
}

export function sharePathFor(handle) {
  const user = userByHandle(handle);
  return user ? `/u/${user.handle}` : null;
}

export function publicProfileOf(handle, { pacts = [] } = {}) {
  const user = userByHandle(handle);
  if (!user) return null;
  const history = publicPactsForUser(pacts, user.id);
  const record = publicRecordOf(pacts, user.id);
  return {
    user,
    record,
    rate: record.rate,
    history,
    sharePath: sharePathFor(user.handle),
  };
}
