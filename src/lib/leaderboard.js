/**
 * Open-book ranks from the existing ledger + public record.
 *
 * Global and per-crew boards. Cheap daily checkback — win rate,
 * hot streak, pot taken. Private tape does not score.
 */

import { USERS } from "../data/users.js";
import { publicRecordOf } from "./publicProfile.js";
import { pactVisibility } from "./visibility.js";

export const BOARD_METRICS = [
  { id: "winRate", label: "Win rate" },
  { id: "streak", label: "Hot streak" },
  { id: "potWon", label: "Pot taken" },
];

export const DESK_CREWS = [
  { id: "open-book", name: "Open book", memberIds: ["you", "friend", "rail"] },
  { id: "demo-dawn-gym", name: "Dawn gym", memberIds: ["you", "friend"] },
  { id: "demo-night-runners", name: "Night runners", memberIds: ["you", "rail"] },
];

export function crewById(id, crews = DESK_CREWS) {
  return crews.find((crew) => crew.id === id) || crews[0];
}

export function currentStreak(pacts, userId) {
  const done = (pacts || [])
    .filter(
      (pact) =>
        pact.status === "resolved" &&
        (pact.creatorId === userId || pact.opponentId === userId) &&
        pactVisibility(pact) === "public",
    )
    .slice()
    .sort((a, b) => (a.resolvedAt || 0) - (b.resolvedAt || 0));
  let streak = 0;
  for (let i = done.length - 1; i >= 0; i -= 1) {
    if (done[i].winnerId === userId) streak += 1;
    else break;
  }
  return streak;
}

export function potWonOf(ledger, userId, pacts) {
  const publicIds = new Set(
    (pacts || []).filter((pact) => pactVisibility(pact) === "public").map((pact) => pact.id),
  );
  return (ledger || [])
    .filter(
      (row) =>
        row.userId === userId &&
        row.amount > 0 &&
        (row.kind === "payout" || row.kind === "side-payout") &&
        (!row.pactId || publicIds.has(row.pactId)),
    )
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

export function deskLine({ user, pacts, ledger }) {
  const record = publicRecordOf(pacts, user.id);
  return {
    userId: user.id,
    handle: user.handle,
    name: user.name,
    tag: user.tag,
    wins: record.wins,
    losses: record.losses,
    played: record.played,
    rate: record.rate,
    streak: currentStreak(pacts, user.id),
    potWon: potWonOf(ledger, user.id, pacts),
  };
}

export function compareLines(a, b, metric = "winRate") {
  if (metric === "streak" && b.streak !== a.streak) return b.streak - a.streak;
  if (metric === "potWon" && b.potWon !== a.potWon) return b.potWon - a.potWon;
  if (metric === "winRate") {
    const ar = a.rate == null ? -1 : a.rate;
    const br = b.rate == null ? -1 : b.rate;
    if (br !== ar) return br - ar;
  }
  if (b.potWon !== a.potWon) return b.potWon - a.potWon;
  if (b.wins !== a.wins) return b.wins - a.wins;
  return String(a.handle).localeCompare(String(b.handle));
}

export function rankDesks({
  users = USERS,
  pacts = [],
  ledger = [],
  metric = "winRate",
  memberIds,
} = {}) {
  const pool = memberIds ? users.filter((user) => memberIds.includes(user.id)) : users;
  return pool
    .map((user) => deskLine({ user, pacts, ledger }))
    .sort((a, b) => compareLines(a, b, metric))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function boardCopy(metric) {
  if (metric === "streak") return "Who is running hot. Check back tomorrow.";
  if (metric === "potWon") return "Pot taken on the open book. Daily checkback.";
  return "Win rate on the open book. Cheap daily look.";
}
