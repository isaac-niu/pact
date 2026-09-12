import { describe, expect, it } from "vitest";
import {
  describeProofSignalHook,
  ingestProofSignal,
  mockFitnessWorkout,
  mockGpsCheckin,
  signalSupportsGoal,
} from "./proofSignals.js";

describe("proof signals", () => {
  it("describes a stubbed fitness hook with no secrets", () => {
    const hook = describeProofSignalHook();
    expect(hook.oauth).toBe("stubbed");
    expect(hook.providers.find((row) => row.id === "strava").ready).toBe(false);
    expect(JSON.stringify(hook)).not.toMatch(/client_secret|access_token|password|Bearer /i);
  });

  it("accepts a demo GPS pin and rejects a stubbed Strava post", () => {
    const gps = ingestProofSignal(mockGpsCheckin({ title: "Gym selfie", criteria: "Face visible" }));
    expect(gps.ok).toBe(true);
    expect(gps.signal.label).toBe("Gym pin");
    const strava = ingestProofSignal({
      kind: "fitness",
      provider: "strava",
      activity: "Run",
      distanceM: 5200,
    });
    expect(strava.ok).toBe(false);
    expect(strava.error).toMatch(/OAuth not wired/);
  });

  it("matches a 5K fitness demo to a run slip", () => {
    const pact = { title: "Run 5K before work", criteria: "≥5.00 km completed" };
    const workout = mockFitnessWorkout(pact);
    expect(workout.activity).toBe("Run");
    expect(signalSupportsGoal(workout, pact)).toBe(true);
    expect(signalSupportsGoal(mockGpsCheckin({ title: "Gym selfie" }), { title: "Gym selfie" })).toBe(true);
  });
});
