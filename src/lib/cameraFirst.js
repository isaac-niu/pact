/**
 * Phone-first proof: open the rear camera when the desk is coarse or narrow.
 * Desktop keeps the file dropzone (no capture attribute).
 */

export const CAMERA_FIRST_QUERY = "(pointer: coarse), (max-width: 720px)";

export function prefersCameraFirst(media = globalThis.matchMedia) {
  if (typeof media !== "function") return false;
  try {
    return Boolean(media(CAMERA_FIRST_QUERY).matches);
  } catch {
    return false;
  }
}
