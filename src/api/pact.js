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

export async function boot() {
  if (await remote.maybeRemote()) impl = remote;
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
export function getSnapshot() {
  return impl.getSnapshot();
}
export function subscribe(fn) {
  return impl.subscribe(fn);
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

export const pactApi = { createPact, acceptPact, submitEvidence, verifyPact };
