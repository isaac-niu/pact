import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isApiRequest, PWA_MANIFEST, PWA_SHELL, shouldRegisterServiceWorker } from "./pwa.js";

describe("installable desk", () => {
  it("ships a standalone manifest with 192 and 512 marks", () => {
    expect(PWA_MANIFEST.display).toBe("standalone");
    expect(PWA_MANIFEST.start_url).toBe("/");
    expect(PWA_MANIFEST.theme_color).toBe("#070806");
    expect(PWA_MANIFEST.icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
    expect(PWA_SHELL).toContain("/manifest.webmanifest");
    const file = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
    expect(file.display).toBe(PWA_MANIFEST.display);
    expect(file.icons).toHaveLength(2);
  });

  it("registers a service worker only on a production desk", () => {
    const nav = { serviceWorker: {} };
    expect(shouldRegisterServiceWorker({ PROD: true }, nav)).toBe(true);
    expect(shouldRegisterServiceWorker({ PROD: false }, nav)).toBe(false);
    expect(shouldRegisterServiceWorker({ PROD: true }, {})).toBe(false);
  });

  it("leaves /api and healthz on the live wire", () => {
    expect(isApiRequest("/api/health")).toBe(true);
    expect(isApiRequest("/api/desk")).toBe(true);
    expect(isApiRequest("/healthz")).toBe(true);
    expect(isApiRequest("/manifest.webmanifest")).toBe(false);
  });
});
