import { describe, expect, it } from "vitest";
import { prefersCameraFirst } from "./cameraFirst.js";

describe("camera-first proof", () => {
  it("stays file-first when matchMedia is missing (desktop / jsdom)", () => {
    expect(prefersCameraFirst(undefined)).toBe(false);
  });

  it("opens the rear camera on a coarse or narrow desk", () => {
    expect(prefersCameraFirst(() => ({ matches: true }))).toBe(true);
    expect(prefersCameraFirst(() => ({ matches: false }))).toBe(false);
  });
});
