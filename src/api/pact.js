/**
 * Integration surface for Persons B / C / D.
 *
 * Pages import from this module only. Default is localStorage + Gemini/mock
 * referee. boot() switches to the Node/Mongo desk when /api/config says
 * Mongo is up. Missing env vars keep the local mock desk.
 */

import * as local from "./local.js";
import * as remote from "./remote.js";

let impl = local;
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn(getSnapshot());
}

export async function boot() {
  if (await remote.maybeRemote()) impl = remote;
  emit();
  return impl === remote;
}

export function createPact(...args) {
  return impl.createPact(...args);
}
export function acceptPact(...args) {
  return impl.acceptPact(...args);
}
export function submitEvidence(...args) {
  return impl.submitEvidence(...args);
}
export function verifyPact(...args) {
  return impl.verifyPact(...args);
}
export function flagAppeal(...args) {
  return impl.flagAppeal(...args);
}
export function markNoticeReadForUser(...args) {
  return impl.markNoticeReadForUser(...args);
}
export function markAllNoticesReadForUser(...args) {
  return impl.markAllNoticesReadForUser(...args);
}
export function tickReminders(...args) {
  return impl.tickReminders(...args);
}
export function reactToMark(...args) {
  return impl.reactToMark(...args);
}
export function commentOnMark(...args) {
  return impl.commentOnMark(...args);
}
export function placeSideStake(...args) {
  return impl.placeSideStake(...args);
}
export function getSnapshot() {
  return impl.getSnapshot();
}
export function subscribe(fn) {
  listeners.add(fn);
  fn(getSnapshot());
  const stopRemote = remote.subscribe(() => emit());
  const stopLocal = local.subscribe(() => emit());
  return () => {
    listeners.delete(fn);
    stopRemote();
    stopLocal();
  };
}
export function switchUser(id) {
  return impl.switchUser(id);
}
export function resetDesk() {
  return impl.resetDesk();
}
export function bankOf(...args) {
  return impl.bankOf(...args);
}
export function recordOf(...args) {
  return impl.recordOf(...args);
}

export const pactApi = {
  createPact,
  acceptPact,
  submitEvidence,
  verifyPact,
  flagAppeal,
  markNoticeReadForUser,
  markAllNoticesReadForUser,
  tickReminders,
  reactToMark,
  commentOnMark,
  placeSideStake,
};
