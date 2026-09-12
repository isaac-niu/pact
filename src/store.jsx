import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  acceptPact as apiAccept,
  bankOf,
  createPact as apiCreate,
  getSnapshot,
  markAllNoticesReadForUser as apiMarkAllRead,
  markNoticeReadForUser as apiMarkRead,
  recordOf,
  resetDesk,
  flagAppeal as apiFlag,
  submitEvidence as apiSubmit,
  tickReminders as apiTickReminders,
  verifyPact as apiVerify,
  reactToMark as apiReact,
  commentOnMark as apiComment,
  subscribe,
  switchUser as apiSwitch,
} from "./api/pact.js";
import { USERS, otherUserId, userById } from "./data/users.js";
import { noticesForUser, unreadCount } from "./lib/notifications.js";

const PactContext = createContext(null);

export function PactProvider({ children }) {
  const [snap, setSnap] = useState(() => getSnapshot());

  useEffect(() => subscribe(setSnap), []);

  useEffect(() => {
    apiTickReminders().catch(() => {});
    const timer = setInterval(() => {
      apiTickReminders().catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const user = userById(snap.userId);
  const opponent = userById(otherUserId(snap.userId));
  const bank = bankOf(snap.userId, snap);
  const record = recordOf(snap.userId, snap);

  const api = useMemo(
    () => ({
      user,
      opponent,
      userId: snap.userId,
      pacts: snap.pacts,
      events: snap.events,
      ledger: snap.ledger,
      notifications: snap.notifications || [],
      reactions: snap.reactions || [],
      comments: snap.comments || [],
      notices: noticesForUser(snap.notifications, snap.userId),
      unreadNotices: unreadCount(snap.notifications, snap.userId),
      bank,
      record,
      users: USERS,
      bankOf: (id) => bankOf(id, snap),
      recordOf: (id) => recordOf(id, snap),
      switchUser: apiSwitch,
      resetDesk,
      createPact: (input) => apiCreate(input, { actorId: snap.userId }),
      acceptPact: (id) => apiAccept(id, { actorId: snap.userId }),
      submitEvidence: (id, file) => apiSubmit(id, file, { actorId: snap.userId }),
      verifyPact: (id, pass, reason) => apiVerify(id, pass, { actorId: snap.userId, reason }),
      flagAppeal: (id, note) => apiFlag(id, note, { actorId: snap.userId }),
      markNoticeRead: (id) => apiMarkRead(id, { actorId: snap.userId }),
      markAllNoticesRead: () => apiMarkAllRead({ actorId: snap.userId }),
      tickReminders: () => apiTickReminders(),
      reactToMark: (eventId, emoji) => apiReact(eventId, emoji, { actorId: snap.userId }),
      commentOnMark: (eventId, body) => apiComment(eventId, body, { actorId: snap.userId }),
      backend: snap.backend || "local",
    }),
    [bank, opponent, record, snap, user],
  );

  return <PactContext.Provider value={api}>{children}</PactContext.Provider>;
}

export function usePact() {
  const ctx = useContext(PactContext);
  if (!ctx) throw new Error("usePact must be used inside PactProvider");
  return ctx;
}

export { USERS, userById };
