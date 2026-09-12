export const USERS = [
  { id: "you", name: "Isaac", handle: "ISAAC", pill: "You", tag: "CHALLENGER" },
  { id: "friend", name: "Friend", handle: "FRIEND", pill: "Friend", tag: "COUNTERPARTY" },
  { id: "rail", name: "Gale", handle: "GALE", pill: "Rail", tag: "SPECTATOR" },
];

export const STARTING_BANK = 50;
export const DESK_ACTORS = ["you", "friend", "rail"];

export function userById(id) {
  return USERS.find((u) => u.id === id) ?? null;
}

export function otherUserId(id) {
  return id === "you" ? "friend" : "you";
}

export function normalizeDeskActor(id) {
  return DESK_ACTORS.includes(id) ? id : "you";
}
