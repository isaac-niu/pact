export function normalizeIdentity(input = {}) {
  const sub = String(input.sub || input.authSub || input.id || "").trim();
  if (!sub) return null;
  return {
    id: String(input.id || sub),
    sub,
    authSub: String(input.authSub || sub),
  };
}

export function withIdentity(user, extra = {}) {
  const ident = normalizeIdentity({ ...user, ...extra });
  if (!ident) {
    throw new Error("Auth profile is missing sub");
  }
  return {
    ...user,
    ...extra,
    ...ident,
    friendIds: Array.isArray(user?.friendIds) ? user.friendIds : [],
    incomingFriendIds: Array.isArray(user?.incomingFriendIds) ? user.incomingFriendIds : [],
    outgoingFriendIds: Array.isArray(user?.outgoingFriendIds) ? user.outgoingFriendIds : [],
  };
}

export const USER_INDEXES = [
  { key: { id: 1 }, unique: true, name: "id_1" },
  {
    key: { sub: 1 },
    unique: true,
    name: "sub_1",
    partialFilterExpression: { sub: { $type: "string" } },
  },
  {
    key: { authSub: 1 },
    unique: true,
    name: "authSub_1",
    partialFilterExpression: { authSub: { $type: "string" } },
  },
];
