/** Client-side proof prep. Shrink the frame before it hits the referee. */

export const MAX_PROOF_BYTES = 8 * 1024 * 1024;
export const MAX_PROOF_EDGE = 1280;

export function validateProofFile(file) {
  if (!file) throw new Error("Add a photo first");
  const type = String(file.type || "").toLowerCase();
  if (type && !type.startsWith("image/")) {
    throw new Error("Proof has to be a photo, not a PDF or video");
  }
  const name = String(file.name || "").toLowerCase();
  if (!type && !/\.(jpe?g|png|gif|webp|heic|heif|avif)$/.test(name)) {
    throw new Error("Proof has to be a photo");
  }
  if (file.size > MAX_PROOF_BYTES) {
    throw new Error("Photo is over 8 MB — shrink it and try again");
  }
  return file;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

export function resizeDataUrl(dataUrl, maxEdge = MAX_PROOF_EDGE) {
  if (typeof Image === "undefined") return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const longest = Math.max(img.width, img.height);
      const scale = longest > maxEdge ? maxEdge / longest : 1;
      if (scale >= 1 && String(dataUrl).length < 400_000) {
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function prepareProof(file) {
  validateProofFile(file);
  const dataUrl = await readFileAsDataUrl(file);
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("That file did not decode as an image");
  }
  return resizeDataUrl(dataUrl);
}
