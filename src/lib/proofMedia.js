/**
 * Proof media for a live slip.
 *
 * A single photo still stands. This layer also takes a short clip or a
 * photo burst so the referee can see more than one frame.
 */

export const MAX_BURST_FRAMES = 4;
export const MAX_PROOF_BYTES = 6_000_000;
export const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export function isImageFile(file = {}) {
  const mime = String(file.type || file.mime || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif)$/i.test(file.name || "");
}

export function isVideoFile(file = {}) {
  const mime = String(file.type || file.mime || "").toLowerCase();
  if (VIDEO_MIMES.has(mime) || mime.startsWith("video/")) return true;
  return /\.(mp4|webm|mov)$/i.test(file.name || "");
}

export function isAllowedProofFile(file) {
  return Boolean(file && (isImageFile(file) || isVideoFile(file)));
}

export function asFileList(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input.length === "number" && typeof input.item === "function") {
    return Array.from(input).filter(Boolean);
  }
  return [input];
}

export function proofKind(files) {
  const list = asFileList(files);
  if (list.some(isVideoFile)) return "video";
  if (list.length > 1) return "burst";
  return "photo";
}

export function proofLabel(files, kind = proofKind(files)) {
  const list = asFileList(files);
  if (!list.length) return "proof.jpg";
  if (kind === "burst") {
    return `${list.length}-frame burst`;
  }
  if (kind === "video") {
    return list[0].name || "proof.mp4";
  }
  return list[0].name || "proof.jpg";
}

export function requireProofFiles(files) {
  const list = asFileList(files);
  if (!list.length) throw new Error("Add a photo first");
  if (list.some((file) => !isAllowedProofFile(file))) {
    throw new Error("Drop a photo (png, jpg, webp), a burst, or a short clip (mp4, webm)");
  }
  const videos = list.filter(isVideoFile);
  const photos = list.filter((file) => !isVideoFile(file));
  if (videos.length && photos.length) {
    throw new Error("One clip per slip — or drop a photo burst");
  }
  if (videos.length > 1) throw new Error("One clip per slip");
  if (photos.length > MAX_BURST_FRAMES) {
    throw new Error(`Burst is ${MAX_BURST_FRAMES} frames max`);
  }
  const oversized = list.find((file) => Number(file.size) > MAX_PROOF_BYTES);
  if (oversized) throw new Error("That clip or frame is too heavy for the desk");
  return list;
}

export function normalizeProofPayload(input) {
  if (!input) return { kind: "photo", files: [], label: "proof.jpg" };
  if (input.files && Array.isArray(input.files) && input.files.length) {
    const files = input.files
      .filter((row) => row?.dataUrl)
      .map((row) => ({
        name: row.name || (isVideoFile(row) ? "proof.mp4" : "proof.jpg"),
        mime: row.mime || row.type || (isVideoFile(row) ? "video/mp4" : "image/jpeg"),
        dataUrl: row.dataUrl,
      }));
    const kind = input.kind || proofKind(files);
    return { kind, files, label: input.name || input.label || proofLabel(files, kind) };
  }
  if (input.dataUrl) {
    const file = {
      name: input.name || "proof.jpg",
      mime: input.mime || (isVideoFile(input) ? "video/mp4" : "image/jpeg"),
      dataUrl: input.dataUrl,
    };
    const kind = input.kind || proofKind([file]);
    return { kind, files: [file], label: file.name };
  }
  return { kind: "photo", files: [], label: "proof.jpg" };
}

export function primaryProofFile(payload) {
  return payload?.files?.[0] || null;
}

export function pactEvidenceFiles(pact, localFiles = []) {
  if (Array.isArray(pact?.evidenceFiles) && pact.evidenceFiles.length) return pact.evidenceFiles;
  if (localFiles.length) return localFiles;
  if (pact?.evidenceUrl) {
    return [
      {
        name: pact.evidenceName || "proof.jpg",
        mime: pact.evidenceKind === "video" ? "video/mp4" : "image/jpeg",
        dataUrl: pact.evidenceUrl,
      },
    ];
  }
  return [];
}
