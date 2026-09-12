import { describe, expect, it } from "vitest";
import {
  attachChecklistToVerdict,
  checklistFromCriteria,
  criteriaFromChecklist,
  defaultGymChecklist,
  friendItemMarks,
  mockItemMarks,
  normalizeChecklist,
  pactChecklist,
  requireChecklist,
  slipCriteria,
} from "./successCriteria.js";

describe("structured success criteria", () => {
  it("normalizes a creator checklist and joins a criteria line", () => {
    const items = normalizeChecklist([
      "Face visible",
      { label: "Gym floor or equipment visible" },
      "Face visible",
      "",
    ]);
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe("Face visible");
    expect(criteriaFromChecklist(items)).toBe("Face visible · Gym floor or equipment visible");
  });

  it("splits a written goal on desk punctuation so older slips still grade", () => {
    expect(checklistFromCriteria("Face in frame · gym iron visible.")).toEqual([
      expect.objectContaining({ label: "Face in frame" }),
      expect.objectContaining({ label: "gym iron visible" }),
    ]);
    expect(pactChecklist({ criteria: "Selfie" })).toEqual([
      expect.objectContaining({ label: "Selfie" }),
    ]);
  });

  it("requires at least one line the referee can stand on", () => {
    expect(() => requireChecklist({})).toThrow(/referee has to see/);
    const slip = slipCriteria({ checklist: defaultGymChecklist() });
    expect(slip.checklist).toHaveLength(2);
    expect(slip.criteria).toMatch(/Face visible/);
  });

  it("prefers an explicit checklist over the joined criteria string", () => {
    const pact = {
      criteria: "Old paragraph",
      checklist: defaultGymChecklist(),
    };
    expect(pactChecklist(pact).map((item) => item.label)).toEqual([
      "Face visible",
      "Gym floor or equipment visible",
    ]);
  });

  it("mock-grades each line so PASS/FAIL is not one free-text call", () => {
    const items = defaultGymChecklist();
    const held = mockItemMarks(items, { fileName: "gym.jpg" });
    expect(held.every((row) => row.pass === true)).toBe(true);
    const faded = mockItemMarks(items, { fileName: "cat.jpg" });
    expect(faded.every((row) => row.pass === false)).toBe(true);
    const review = mockItemMarks(items, { fileName: "blur.jpg" });
    expect(review[0].pass).toBe(true);
    expect(review[1].pass).toBe(false);
    expect(review[1].note).toMatch(/ambiguous/);
  });

  it("attaches item marks to a referee verdict and a friend grade", () => {
    const input = { checklist: defaultGymChecklist(), fileName: "gym.jpg" };
    const verdict = attachChecklistToVerdict(
      { result: "pass", confidence: 0.9, rationale: "On brief.", source: "mock", auto: true },
      input,
    );
    expect(verdict.items).toHaveLength(2);
    expect(verdict.items.every((row) => row.pass)).toBe(true);

    const friend = friendItemMarks(
      { checklist: defaultGymChecklist() },
      true,
      [{ id: "sc_face", pass: true, note: "Face is clear." }, { id: "sc_gym", pass: false }],
      "Iron is cropped.",
    );
    expect(friend[0].pass).toBe(true);
    expect(friend[1].pass).toBe(false);
    expect(friend[1].note).toBe("Iron is cropped.");
  });
});
