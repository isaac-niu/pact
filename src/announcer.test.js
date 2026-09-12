import { afterEach, describe, expect, it, vi } from "vitest";
import {
  announcerEnabled,
  fetchAnnouncementAudio,
  resetAnnouncementCache,
} from "./announcer.js";

describe("announcer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetAnnouncementCache();
  });

  it("treats missing ElevenLabs flags as disabled", () => {
    expect(announcerEnabled({ announcer: false, features: { elevenlabs: false } })).toBe(false);
    expect(announcerEnabled({ features: {} })).toBe(false);
    expect(announcerEnabled({ announcer: true })).toBe(true);
    expect(announcerEnabled({ features: { elevenlabs: true } })).toBe(true);
  });

  it("skips /api/announce when the desk reports announcer off", async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes("/api/config")) {
        return {
          ok: true,
          json: async () => ({ announcer: false, features: { elevenlabs: false } }),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const url = await fetchAnnouncementAudio(
      { id: "p-disabled", title: "Gym", verdict: { result: "pass", rationale: "ok" } },
      "ISAAC",
    );

    expect(url).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/config");
  });

  it("posts /api/announce only when the desk says announcer is on", async () => {
    const fetchMock = vi.fn(async (url, opts) => {
      if (String(url).includes("/api/config")) {
        return {
          ok: true,
          json: async () => ({ announcer: true, features: { elevenlabs: true } }),
        };
      }
      if (String(url).includes("/api/announce")) {
        expect(opts.method).toBe("POST");
        return {
          ok: true,
          status: 200,
          blob: async () => new Blob(["x"], { type: "audio/mpeg" }),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:audio");

    const url = await fetchAnnouncementAudio(
      { id: "p-live", title: "Gym", verdict: { result: "pass", rationale: "ok" } },
      "ISAAC",
    );

    expect(url).toBe("blob:audio");
    expect(fetchMock.mock.calls.some(([href]) => String(href).includes("/api/announce"))).toBe(
      true,
    );
  });
});
