import { beforeEach, describe, expect, it } from "vitest";
import {
  ONBOARDING_KEY,
  coachForPath,
  completeOnboarding,
  hideOnboardingStep,
  persistOnboarding,
  readOnboarding,
  resetOnboarding,
  shouldAutoStart,
  skipOnboarding,
  startOnboarding,
  stepIdForPath,
} from "./onboarding.js";

describe("onboarding walk", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("treats an empty desk as a first visit", () => {
    const state = readOnboarding();
    expect(state).toEqual({ status: "idle", step: "sample", hidden: [] });
    expect(shouldAutoStart(state)).toBe(true);
  });

  it("maps pitch / write / live ticket paths", () => {
    expect(stepIdForPath("/")).toBe("sample");
    expect(stepIdForPath("/create")).toBe("write");
    expect(stepIdForPath("/pact/abc")).toBe("live");
    expect(stepIdForPath("/feed")).toBeNull();
  });

  it("shows the SAMPLE vs real-slip coach only while the walk is active", () => {
    expect(coachForPath("/", startOnboarding())?.id).toBe("sample");
    expect(coachForPath("/create", startOnboarding())?.title).toMatch(/live slip/i);
    expect(coachForPath("/pact/demo", startOnboarding())?.title).toMatch(/on the book/i);
    expect(coachForPath("/", skipOnboarding())).toBeNull();
    expect(coachForPath("/feed", startOnboarding())).toBeNull();
  });

  it("persists skip so a returning visitor does not replay", () => {
    persistOnboarding(skipOnboarding());
    expect(localStorage.getItem(ONBOARDING_KEY)).toMatch(/"done"/);
    expect(shouldAutoStart(readOnboarding())).toBe(false);
    expect(readOnboarding().status).toBe("done");
  });

  it("can reset the walk after a desk wipe", () => {
    persistOnboarding(completeOnboarding());
    expect(resetOnboarding()).toEqual({ status: "idle", step: "sample", hidden: [] });
    expect(localStorage.getItem(ONBOARDING_KEY)).toBeNull();
    expect(shouldAutoStart(readOnboarding())).toBe(true);
  });

  it("can tuck the write coach without ending the walk", () => {
    const tucked = hideOnboardingStep(startOnboarding(), "write");
    expect(coachForPath("/create", tucked)).toBeNull();
    expect(coachForPath("/pact/new-slip", tucked)?.id).toBe("live");
  });
});
