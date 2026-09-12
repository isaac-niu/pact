import { describe, expect, it } from "vitest";
import {
  isAllowedProofFile,
  normalizeProofPayload,
  proofKind,
  proofLabel,
  requireProofFiles,
} from "./proofMedia.js";

describe("proof media", () => {
  it("keeps a single photo on the existing path", () => {
    const photo = { name: "gym.jpg", type: "image/jpeg", dataUrl: "data:image/jpeg;base64,aa" };
    expect(isAllowedProofFile(photo)).toBe(true);
    expect(proofKind([photo])).toBe("photo");
    expect(proofLabel([photo])).toBe("gym.jpg");
    const payload = normalizeProofPayload({ dataUrl: photo.dataUrl, name: photo.name });
    expect(payload.kind).toBe("photo");
    expect(payload.files).toHaveLength(1);
  });

  it("accepts a short clip or a photo burst", () => {
    const clip = { name: "gym.mp4", type: "video/mp4" };
    const burst = [
      { name: "a.jpg", type: "image/jpeg" },
      { name: "b.jpg", type: "image/jpeg" },
      { name: "c.jpg", type: "image/jpeg" },
    ];
    expect(isAllowedProofFile(clip)).toBe(true);
    expect(proofKind([clip])).toBe("video");
    expect(proofKind(burst)).toBe("burst");
    expect(proofLabel(burst)).toBe("3-frame burst");
    expect(() => requireProofFiles([{ name: "notes.pdf", type: "application/pdf" }])).toThrow(/photo/);
    expect(() => requireProofFiles([clip, burst[0]])).toThrow(/One clip/);
  });

  it("reads a desk payload with several frames", () => {
    const payload = normalizeProofPayload({
      files: [
        { name: "one.jpg", mime: "image/jpeg", dataUrl: "data:image/jpeg;base64,YQ==" },
        { name: "two.jpg", mime: "image/jpeg", dataUrl: "data:image/jpeg;base64,Yg==" },
      ],
    });
    expect(payload.kind).toBe("burst");
    expect(payload.label).toBe("2-frame burst");
    expect(payload.files).toHaveLength(2);
  });
});
