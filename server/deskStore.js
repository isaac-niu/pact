import { featureFlags } from "./env.js";
import { mongoReady, mongoConfigured, mongoError, getDb, connectMongo } from "./mongo.js";
import { createDeskLogic, seededState, bankOf, recordOf } from "./desk.js";
import { geminiStatus, judgeEvidence } from "./gemini.js";

const desk = createDeskLogic(judgeEvidence);

export function liveConfig(env = process.env) {
  const flags = featureFlags(env);
  const gemini = geminiStatus();
  return {
    ok: true,
    service: "pact",
    announcer: flags.elevenlabs,
    features: {
      ...flags,
      mongo: mongoConfigured(env) && mongoReady(),
      mongoConfigured: mongoConfigured(env),
      mongoError: mongoReady() ? null : mongoError(),
      geminiLive: Boolean(gemini.lastLiveAt) && !gemini.lastError,
      geminiError: gemini.lastError?.code || null,
      geminiModel: gemini.lastModel,
    },
    auth0: flags.auth0
      ? {
          domain: env.AUTH0_DOMAIN,
          clientId: env.AUTH0_CLIENT_ID,
          audience: env.AUTH0_AUDIENCE || "",
        }
      : null,
  };
}

async function loadState() {
  const col = getDb().collection("desk");
  const doc = await col.findOne({ _id: "main" });
  if (doc?.state) return { state: doc.state, version: doc.version || 0 };
  const state = seededState();
  await col.updateOne(
    { _id: "main" },
    { $setOnInsert: { state, version: 1, seededAt: Date.now() } },
    { upsert: true },
  );
  const again = await col.findOne({ _id: "main" });
  return { state: again.state, version: again.version || 1 };
}

async function saveState(expectedVersion, next) {
  const col = getDb().collection("desk");
  const res = await col.updateOne(
    { _id: "main", version: expectedVersion },
    { $set: { state: next, version: expectedVersion + 1, updatedAt: Date.now() } },
  );
  if (res.matchedCount === 0) throw new Error("conflict");
}

async function mutate(fn) {
  for (let i = 0; i < 6; i++) {
    const { state, version } = await loadState();
    const out = await fn(structuredClone(state));
    try {
      await saveState(version, out.state);
      const pactId = out.result?.id || out.settledId;
      const fresh = (await loadState()).state;
      return {
        result: pactId ? fresh.pacts.find((p) => p.id === pactId) : out.result,
        state: publicState(fresh),
      };
    } catch (err) {
      if (err.message === "conflict") continue;
      throw err;
    }
  }
  throw new Error("desk_busy");
}

function publicState(state, actorId = "you") {
  return {
    userId: actorId === "friend" ? "friend" : "you",
    startingBank: state.startingBank,
    pacts: state.pacts,
    events: state.events,
    ledger: state.ledger,
    backend: "mongo",
  };
}

export { bankOf, recordOf, connectMongo };

export async function getDesk(actorId) {
  const { state } = await loadState();
  return publicState(state, actorId);
}

export function createPact(input, actorId) {
  return mutate((state) => desk.createPact(state, input, actorId));
}

export function acceptPact(pactId, actorId) {
  return mutate((state) => desk.acceptPact(state, pactId, actorId));
}

export function submitEvidence(pactId, file, actorId) {
  return mutate((state) => desk.submitEvidence(state, pactId, file, actorId));
}

export function verifyPact(pactId, pass, actorId) {
  return mutate((state) => desk.verifyPact(state, pactId, pass, actorId));
}
