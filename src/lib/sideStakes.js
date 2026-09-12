import { canSeePact, isParticipant, pactVisibility } from "./visibility.js";

export function canPlaceSideStake(pact, userId) {
  if (!pact || !userId) return false;
  if (pactVisibility(pact) !== "public") return false;
  if (pact.status === "resolved") return false;
  if (isParticipant(pact, userId)) return false;
  return canSeePact(pact, userId);
}

export function normalizeSide(side) {
  if (side === "challenger" || side === "friend") return side;
  throw new Error("Pick challenger or friend");
}

export function normalizeRailStake(amount) {
  const stake = Number(amount);
  if (!Number.isFinite(stake) || stake <= 0) throw new Error("Stake a positive rail ticket");
  return Math.round(stake * 100) / 100;
}

export function sideStakesForPact(sideStakes, pactId) {
  return (sideStakes || []).filter((row) => row.pactId === pactId);
}

export function openSideStakeForUser(sideStakes, pactId, userId) {
  return sideStakesForPact(sideStakes, pactId).find((row) => row.userId === userId && !row.settledAt) || null;
}

export function railBook(sideStakes, pactId) {
  const rows = sideStakesForPact(sideStakes, pactId);
  const challenger = rows.filter((row) => row.side === "challenger").reduce((sum, row) => sum + row.amount, 0);
  const friend = rows.filter((row) => row.side === "friend").reduce((sum, row) => sum + row.amount, 0);
  return { challenger, friend, total: challenger + friend, count: rows.length };
}

export function winningSideOf(pact) {
  if (!pact?.winnerId) return null;
  if (pact.winnerId === pact.creatorId) return "challenger";
  if (pact.winnerId === pact.opponentId) return "friend";
  return null;
}

export function applySideStake(state, { pactId, actorId, side, amount, now = Date.now(), uid, bankOf }) {
  const pact = (state.pacts || []).find((row) => row.id === pactId);
  if (!pact) throw new Error("Slip not on the board");
  if (!canPlaceSideStake(pact, actorId)) throw new Error("Only the rail can fade this slip");
  const ticketSide = normalizeSide(side);
  const stake = normalizeRailStake(amount);
  if (bankOf(actorId, state) < stake) throw new Error("Not enough virtual SOL for a rail ticket");
  if (openSideStakeForUser(state.sideStakes, pactId, actorId)) {
    throw new Error("You already have a rail ticket on this slip");
  }

  const result = {
    id: uid("ss"),
    pactId,
    userId: actorId,
    side: ticketSide,
    amount: stake,
    at: now,
    settledAt: null,
    won: null,
  };
  return {
    state: {
      ...state,
      sideStakes: [result, ...(state.sideStakes || [])],
      ledger: [
        {
          id: uid("ld"),
          userId: actorId,
          amount: -stake,
          kind: "side-stake",
          pactId,
          at: now,
          note: `Rail ticket · ${ticketSide}`,
        },
        ...state.ledger,
      ],
    },
    result,
  };
}

export function settleSideStakes(state, pact, { now = Date.now(), uid }) {
  const winningSide = winningSideOf(pact);
  const open = sideStakesForPact(state.sideStakes, pact.id).filter((row) => !row.settledAt);
  if (!winningSide || !open.length) return state;

  const sideStakes = (state.sideStakes || []).map((row) => {
    if (row.pactId !== pact.id || row.settledAt) return row;
    return { ...row, settledAt: now, won: row.side === winningSide };
  });
  const payouts = open
    .filter((row) => row.side === winningSide)
    .map((row) => ({
      id: uid("ld"),
      userId: row.userId,
      amount: row.amount * 2,
      kind: "side-payout",
      pactId: pact.id,
      at: now,
      note: "Rail ticket paid",
    }));

  return {
    ...state,
    sideStakes,
    ledger: [...payouts, ...state.ledger],
  };
}
