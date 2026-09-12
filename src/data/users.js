export const USERS = [
  { id: "you", name: "Isaac", handle: "ISAAC", pill: "You", tag: "CHALLENGER" },
  { id: "friend", name: "Maya", handle: "MAYA", pill: "Friend", tag: "COUNTERPARTY" },
  { id: "rail", name: "Gale", handle: "GALE", pill: "Rail", tag: "SPECTATOR" },
];

export const STARTING_BANK = 50;
export const DESK_ACTORS = ["you", "friend", "rail"];

export function normalizeHandle(handle) {
  return String(handle || "")
    .trim()
    .replace(/^@/, "")
    .toUpperCase();
}

export function userById(id) {
  return USERS.find((u) => u.id === id) ?? null;
}

export function userByHandle(handle, users = USERS) {
  const key = normalizeHandle(handle);
  if (!key) return null;
  return users.find((u) => normalizeHandle(u.handle) === key) ?? null;
}

export function otherUserId(id) {
  return id === "you" ? "friend" : "you";
}

export function normalizeDeskActor(id) {
  return DESK_ACTORS.includes(id) ? id : "you";
}
