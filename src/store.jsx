import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { emptyDemoState } from "./demo/fixtures.js";

export const USERS = [
  { id: "you", name: "You", handle: "ISAAC", tag: "CHALLENGER" },
  { id: "friend", name: "Friend", handle: "MAYA", tag: "COUNTERPARTY" },
];

const STORAGE_KEY = "pact.demo.v1";

const VERDICTS = {
  pass: [
    {
      confidence: 0.94,
      rationale: "Clear gym-floor selfie. Subject in frame, workout context visible.",
    },
    {
      confidence: 0.91,
      rationale: "Evidence matches the pact. Lighting and setting look legitimate.",
    },
    {
      confidence: 0.88,
      rationale: "Photo present and on-brief. Referee stands the slip.",
    },
  ],
  fail: [
    {
      confidence: 0.72,
      rationale: "Image is too ambiguous to confirm the challenge was completed.",
    },
  ],
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // First visit only — never overwrite an existing board.
    if (!raw) return emptyDemoState();
    const parsed = JSON.parse(raw);
    return {
      userId: parsed.userId === "friend" ? "friend" : "you",
      pacts: Array.isArray(parsed.pacts) ? parsed.pacts : [],
    };
  } catch {
    return emptyDemoState();
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function otherUser(id) {
  return id === "you" ? "friend" : "you";
}

const PactContext = createContext(null);

export function PactProvider({ children }) {
  const initial = loadState();
  const [userId, setUserId] = useState(initial.userId);
  const [pacts, setPacts] = useState(initial.pacts);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, pacts }));
  }, [userId, pacts]);

  const user = USERS.find((u) => u.id === userId);
  const opponent = USERS.find((u) => u.id === otherUser(userId));

  const api = useMemo(
    () => ({
      user,
      opponent,
      userId,
      pacts,
      switchUser(id) {
        setUserId(id);
      },
      createPact({ title, stake }) {
        const pact = {
          id: uid(),
          title: title.trim(),
          stake: Number(stake),
          creatorId: userId,
          opponentId: otherUser(userId),
          status: "open",
          evidenceUrl: null,
          evidenceName: null,
          verdict: null,
          createdAt: Date.now(),
        };
        setPacts((prev) => [pact, ...prev]);
        return pact;
      },
      acceptPact(id) {
        setPacts((prev) =>
          prev.map((p) =>
            p.id === id && p.status === "open" && p.opponentId === userId
              ? { ...p, status: "accepted" }
              : p,
          ),
        );
      },
      uploadEvidence(id, file) {
        const url = URL.createObjectURL(file);
        setPacts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  evidenceUrl: url,
                  evidenceName: file.name,
                  status: p.status === "resolved" ? p.status : "evidence",
                  verdict: null,
                }
              : p,
          ),
        );
      },
      async resolvePact(id) {
        const pact = pacts.find((p) => p.id === id);
        if (!pact?.evidenceUrl) return;

        setPacts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "judging" } : p)),
        );

        await new Promise((r) => setTimeout(r, 1400));

        const pass = Boolean(pact.evidenceUrl);
        const pool = pass ? VERDICTS.pass : VERDICTS.fail;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const result = pass ? "pass" : "fail";
        const winnerId = result === "pass" ? pact.creatorId : pact.opponentId;

        setPacts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "resolved",
                  verdict: { result, ...pick },
                  winnerId,
                }
              : p,
          ),
        );
      },
    }),
    [opponent, pacts, user, userId],
  );

  return <PactContext.Provider value={api}>{children}</PactContext.Provider>;
}

export function usePact() {
  const ctx = useContext(PactContext);
  if (!ctx) throw new Error("usePact must be used inside PactProvider");
  return ctx;
}

export function userById(id) {
  return USERS.find((u) => u.id === id);
}
