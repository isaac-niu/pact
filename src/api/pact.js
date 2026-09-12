/**
 * Integration surface for Persons B / C.
 *
 * Default implementations are local + mocked (localStorage ledger,
 * in-browser photo, fake referee). Swap the three functions below
 * for Auth0/Mongo/Gemini later — pages import from this module only.
 *
 *   createPact({ title, criteria, stake, deadline, opponentId }, { actorId })
 *   acceptPact(pactId, { actorId })
 *   submitEvidence(pactId, file, { actorId })
 *   verifyPact(pactId, pass, { actorId })
 *
 * Person C fills submitEvidence + verifyPact (Gemini Flash + friend fallback).
 * Auth0 / Mongo / Vultr stay on other lanes.
 */

import * as local from "./local.js";

export const createPact = local.createPact;
export const acceptPact = local.acceptPact;
export const submitEvidence = local.submitEvidence;
export const verifyPact = local.verifyPact;

export const pactApi = {
  createPact,
  acceptPact,
  submitEvidence,
  verifyPact,
};

export {
  getSnapshot,
  subscribe,
  switchUser,
  resetDesk,
  bankOf,
  recordOf,
} from "./local.js";
