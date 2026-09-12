/**
 * First-visit walk of the desk: SAMPLE ticket vs a real posted slip.
 * Status lives in localStorage so a returning desk does not replay.
 */

export const ONBOARDING_KEY = "pact.onboarding.v1";

export const ONBOARDING_STEPS = [
  {
    id: "sample",
    path: "/",
    kicker: "01 · Pitch",
    title: "SAMPLE is a dummy ticket",
    body: "The pitch card is not on the book. Write a real slip to post a pact your friend can match.",
    primary: { label: "Write a real slip", to: "/create" },
    secondary: { label: "Skip the walk", action: "skip" },
  },
  {
    id: "write",
    path: "/create",
    kicker: "02 · Write",
    title: "Post a live slip",
    body: "Title, stake, friend. Post to the board — that is your first real pact, not the SAMPLE on the pitch.",
    primary: { label: "Got the write desk", action: "stay" },
    secondary: { label: "Skip the walk", action: "skip" },
  },
  {
    id: "live",
    pathPrefix: "/pact/",
    kicker: "03 · Ticket",
    title: "This slip is on the book",
    body: "Friend matches the stake. Then you prove it with a frame. The SAMPLE ticket never left the pitch.",
    primary: { label: "Walk done", action: "complete" },
  },
];

function normalizeState(state) {
  return {
    status: state?.status || "idle",
    step: state?.step || "sample",
    hidden: Array.isArray(state?.hidden) ? state.hidden : [],
  };
}

export function readOnboarding(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(ONBOARDING_KEY);
    if (!raw) return normalizeState({ status: "idle" });
    const parsed = JSON.parse(raw);
    if (parsed?.status === "active" || parsed?.status === "done") {
      return normalizeState(parsed);
    }
    return normalizeState({ status: "idle" });
  } catch {
    return normalizeState({ status: "idle" });
  }
}

export function persistOnboarding(state, storage = globalThis.localStorage) {
  const next = normalizeState(state);
  if (!storage) return next;
  storage.setItem(ONBOARDING_KEY, JSON.stringify(next));
  return next;
}

export function shouldAutoStart(state) {
  return !state || state.status === "idle";
}

export function startOnboarding() {
  return normalizeState({ status: "active", step: "sample" });
}

export function skipOnboarding() {
  return normalizeState({ status: "done", step: "live" });
}

export function completeOnboarding() {
  return normalizeState({ status: "done", step: "live" });
}

export function hideOnboardingStep(state, stepId) {
  const next = normalizeState(state);
  if (next.hidden.includes(stepId)) return next;
  return { ...next, hidden: [...next.hidden, stepId] };
}

export function resetOnboarding(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(ONBOARDING_KEY);
  } catch {
    /* ignore */
  }
  return normalizeState({ status: "idle" });
}

export function stepIdForPath(pathname = "/") {
  if (pathname === "/" || pathname === "") return "sample";
  if (pathname === "/create") return "write";
  if (pathname.startsWith("/pact/")) return "live";
  return null;
}

export function stepById(id) {
  return ONBOARDING_STEPS.find((step) => step.id === id) || null;
}

export function coachForPath(pathname, state) {
  if (state?.status !== "active") return null;
  const step = stepById(stepIdForPath(pathname));
  if (!step) return null;
  if (state.hidden?.includes(step.id)) return null;
  return step;
}
