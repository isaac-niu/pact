/**
 * Alternate proof signals — GPS check-in and fitness hooks.
 *
 * Real Strava / Apple Health OAuth is stubbed. The desk ships a demo path
 * so a challenger can prove with location or a workout without secrets.
 */

export const SIGNAL_KINDS = {
  GPS: "gps",
  FITNESS: "fitness",
};

export const FITNESS_PROVIDERS = [
  {
    id: "demo",
    label: "Desk demo",
    ready: true,
    hint: "Posts a mocked workout so the referee can still talk.",
  },
  {
    id: "strava",
    label: "Strava",
    ready: false,
    hint: "OAuth not wired — no client key on this desk.",
  },
  {
    id: "apple-health",
    label: "Apple Health",
    ready: false,
    hint: "Device hook not wired on this web desk.",
  },
];

export function describeProofSignalHook() {
  return {
    ok: true,
    oauth: "stubbed",
    providers: FITNESS_PROVIDERS,
    signals: [SIGNAL_KINDS.GPS, SIGNAL_KINDS.FITNESS],
  };
}

export function fitnessProvider(id) {
  return FITNESS_PROVIDERS.find((row) => row.id === id) || null;
}

export function labelSignal(signal) {
  if (!signal) return "Proof signal";
  if (signal.kind === SIGNAL_KINDS.GPS) {
    const pin = signal.label || "Check-in";
    return `GPS check-in · ${pin}`;
  }
  if (signal.kind === SIGNAL_KINDS.FITNESS) {
    const activity = signal.activity || "Workout";
    const km = Number(signal.distanceM) ? `${(Number(signal.distanceM) / 1000).toFixed(2)} km` : "";
    return [`Fitness · ${activity}`, km].filter(Boolean).join(" · ");
  }
  return "Proof signal";
}

export function normalizeSignal(raw = {}) {
  const kind = raw.kind === SIGNAL_KINDS.FITNESS ? SIGNAL_KINDS.FITNESS : SIGNAL_KINDS.GPS;
  if (kind === SIGNAL_KINDS.GPS) {
    const lat = Number(raw.lat);
    const lng = Number(raw.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Drop a location pin");
    }
    return {
      kind,
      lat,
      lng,
      accuracy: Number.isFinite(Number(raw.accuracy)) ? Number(raw.accuracy) : null,
      label: String(raw.label || "Check-in").trim().slice(0, 80),
      at: Number(raw.at) || Date.now(),
      source: raw.source === "device" ? "device" : "demo",
    };
  }
  const provider = fitnessProvider(raw.provider)?.id || "demo";
  return {
    kind,
    provider,
    activity: String(raw.activity || "Workout").trim().slice(0, 48),
    distanceM: Number.isFinite(Number(raw.distanceM)) ? Number(raw.distanceM) : 0,
    durationS: Number.isFinite(Number(raw.durationS)) ? Number(raw.durationS) : 0,
    at: Number(raw.at) || Date.now(),
    source: raw.source === "oauth" ? "oauth" : "demo",
  };
}

export function mockGpsCheckin(pact = {}, now = Date.now()) {
  const gym = /gym|iron|studio/i.test(`${pact.title || ""} ${pact.criteria || ""}`);
  return normalizeSignal({
    kind: SIGNAL_KINDS.GPS,
    lat: gym ? 37.7763 : 37.7694,
    lng: gym ? -122.4241 : -122.4862,
    accuracy: 14,
    label: gym ? "Gym pin" : "Park pin",
    at: now,
    source: "demo",
  });
}

export function mockFitnessWorkout(pact = {}, now = Date.now()) {
  const run = /run|5k|km/i.test(`${pact.title || ""} ${pact.criteria || ""}`);
  return normalizeSignal({
    kind: SIGNAL_KINDS.FITNESS,
    provider: "demo",
    activity: run ? "Run" : "Workout",
    distanceM: run ? 5200 : 0,
    durationS: run ? 1680 : 2400,
    at: now,
    source: "demo",
  });
}

export function ingestProofSignal(input = {}) {
  if (input.provider && !fitnessProvider(input.provider)?.ready && input.kind === SIGNAL_KINDS.FITNESS) {
    const provider = fitnessProvider(input.provider);
    return {
      ok: false,
      error: provider?.hint || "That fitness hook is stubbed",
      hook: describeProofSignalHook(),
    };
  }
  try {
    const signal = normalizeSignal(input);
    return { ok: true, signal, source: signal.source, hook: describeProofSignalHook() };
  } catch (err) {
    return { ok: false, error: err.message || "Bad proof signal", hook: describeProofSignalHook() };
  }
}

export function signalSupportsGoal(signal, pact = {}) {
  const hay = `${pact.title || ""} ${pact.criteria || ""}`.toLowerCase();
  if (!signal) return false;
  if (signal.kind === SIGNAL_KINDS.GPS) {
    if (/gym|iron|studio/.test(hay)) return /gym/i.test(signal.label || "");
    if (/run|5k|park/.test(hay)) return /park|track/i.test(signal.label || "");
    return signal.source === "demo";
  }
  if (/run|5k/.test(hay)) return Number(signal.distanceM) >= 5000;
  if (/gym|workout/.test(hay)) return signal.activity === "Workout" || signal.source === "demo";
  return signal.source === "demo";
}
