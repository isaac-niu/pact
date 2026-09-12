import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  acceptPact as apiAccept,
  bankOf,
  createPact as apiCreate,
  getSnapshot,
  recordOf,
  resetDesk,
  submitEvidence as apiSubmit,
  verifyPact as apiVerify,
  subscribe,
  switchUser as apiSwitch,
} from "./api/pact.js";
import { USERS, otherUserId, userById } from "./data/users.js";

const PactContext = createContext(null);

export function PactProvider({ children }) {
  const [snap, setSnap] = useState(() => getSnapshot());

  useEffect(() => subscribe(setSnap), []);

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
      verifyPact: (id, pass) => apiVerify(id, pass, { actorId: snap.userId }),
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
