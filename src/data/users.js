export const USERS = [
  { id: "you", name: "Isaac", handle: "ISAAC", pill: "You", tag: "CHALLENGER" },
  { id: "friend", name: "Friend", handle: "FRIEND", pill: "Friend", tag: "COUNTERPARTY" },
];

export const STARTING_BANK = 50;

export function userById(id) {
  return USERS.find((u) => u.id === id) ?? null;
}

export function otherUserId(id) {
  return id === "you" ? "friend" : "you";
}
