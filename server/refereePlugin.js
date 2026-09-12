import { loadEnvFile } from "./loadEnv.js";
import { featureFlags } from "./env.js";
import { geminiEnabled, getLastGeminiError, judgeEvidence } from "./gemini.js";
import { getSidekickLine, ifmEnabled } from "./ifmSidekick.js";
import { connectMongo, mongoConfigured, mongoError, mongoReady } from "./mongo.js";
import { persistPactProof, readEvidence, storeEvidence } from "./evidenceStore.js";
import { describeProofSignalHook, ingestProofSignal } from "../src/lib/proofSignals.js";
import { describeEscrowHook } from "../src/lib/solanaEscrow.js";
import path from "node:path";
import { handleOgApi } from "./ogTicket.js";

function send(res, status, body, headers = {}) {
  const isJson = body !== null && typeof body === "object" && !Buffer.isBuffer(body);
  const data = Buffer.isBuffer(body) ? body : isJson ? JSON.stringify(body) : String(body);
  res.statusCode = status;
  res.setHeader(
    "content-type",
    headers["content-type"] || (isJson ? "application/json; charset=utf-8" : "text/plain; charset=utf-8"),
  );
  res.setHeader("cache-control", "no-store");
  for (const [k, v] of Object.entries(headers)) {
    if (k === "content-type") continue;
    res.setHeader(k, v);
  }
  res.end(data);
}

function readJson(req, limit = 8_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("too_large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!size) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

async function persistSafe(fields) {
  try {
    return await persistPactProof(fields);
  } catch (err) {
    console.warn("mongo persist failed", err?.message || err);
    return { stored: false };
  }
}

/** Shared referee / GridFS routes for Vite and the Person D Node server. */
export async function handleRefereeApi(req, res, helpers = {}) {
  const write = helpers.send || send;
  const parseBody = helpers.readJson || readJson;
  const url = (req.url || "").split("?")[0];

  if (url === "/api/config" && req.method === "GET") {
    if (mongoConfigured() && !mongoReady()) {
      await connectMongo();
    }
    const mongo = mongoReady();
    const elevenlabs = featureFlags().elevenlabs;
    write(res, 200, {
      ok: true,
      service: "pact",
      announcer: elevenlabs,
      features: {
        gemini: geminiEnabled(),
        lastGeminiError: getLastGeminiError(),
        mongo: mongoConfigured() && mongo,
        mongoError: mongo ? null : mongoError(),
        elevenlabs,
        ifm: ifmEnabled(),
        proofSignals: true,
        solanaEscrow: true,
      },
      proofSignals: describeProofSignalHook(),
      solanaEscrow: describeEscrowHook(process.env),
    });
    return true;
  }

  // Vite proxies /api/announce to :3000. When the key is unset, answer here
  // so the desk does not 500 on every settled-ticket view.
  if (url === "/api/announce" && req.method === "POST") {
    if (!process.env.ELEVENLABS_API_KEY) {
      if (typeof req.resume === "function") req.resume();
      res.statusCode = 204;
      res.end();
      return true;
    }
    return false;
  }

  if (url === "/api/proof-signals" && req.method === "GET") {
    write(res, 200, describeProofSignalHook());
    return true;
  }

  if (url === "/api/proof-signals" && req.method === "POST") {
    const payload = await parseBody(req, 32_000);
    const out = ingestProofSignal(payload);
    write(res, out.ok ? 200 : 400, out);
    return true;
  }

  const evidenceMatch = url.match(/^\/api\/evidence\/([^/]+)$/);
  if (evidenceMatch && req.method === "GET") {
    const file = await readEvidence(decodeURIComponent(evidenceMatch[1]));
    if (!file) {
      write(res, 404, { error: "not_found" });
      return true;
    }
    write(res, 200, file.buffer, {
      "content-type": file.contentType,
      "content-disposition": `inline; filename="${file.filename.replaceAll('"', "")}"`,
    });
    return true;
  }

  if (url === "/api/pacts/verify" && req.method === "POST") {
    const payload = await parseBody(req, 32_000);
    await persistSafe({
      pactId: payload.pactId,
      title: payload.title,
      criteria: payload.criteria,
      creatorId: payload.creatorId,
      opponentId: payload.opponentId,
      stake: payload.stake,
      status: "resolved",
      evidenceUrl: payload.evidenceUrl,
      evidenceName: payload.evidenceName,
      evidenceGridFsId: payload.evidenceGridFsId,
      verdict: payload.verdict,
      winnerId: payload.winnerId,
    });
    write(res, 200, { ok: true });
    return true;
  }

  if (url === "/api/referee" && req.method === "POST") {
    const payload = await parseBody(req);
    const verdict = await judgeEvidence({
      title: payload.title,
      criteria: payload.criteria,
      checklist: payload.checklist,
      fileName: payload.fileName,
      dataUrl: payload.dataUrl,
      files: payload.files,
      kind: payload.kind,
      signal: payload.signal,
    });
    // Sidekick only reacts to the call already made above — it can't change
    // pass/fail/review, and a failure here falls back to a canned line
    // rather than ever blocking the actual verdict.
    verdict.sidekick = await getSidekickLine({
      title: payload.title,
      result: verdict.result,
      confidence: verdict.confidence,
      rationale: verdict.rationale,
    });

    let evidenceUrl = payload.dataUrl || null;
    let evidenceGridFsId = null;
    try {
      const stored = await storeEvidence({
        pactId: payload.pactId,
        fileName: payload.fileName,
        dataUrl: payload.dataUrl,
      });
      if (stored.stored) {
        evidenceUrl = stored.evidenceUrl;
        evidenceGridFsId = stored.evidenceGridFsId;
      }
    } catch (err) {
      console.warn("gridfs store failed", err?.message || err);
    }

    const status =
      verdict.auto === false || verdict.result === "review" ? "review" : "resolved";
    const winnerId =
      status === "resolved"
        ? verdict.result === "pass"
          ? payload.creatorId
          : payload.opponentId
        : null;

    await persistSafe({
      pactId: payload.pactId,
      title: payload.title,
      criteria: payload.criteria,
      creatorId: payload.creatorId,
      opponentId: payload.opponentId,
      stake: payload.stake,
      status,
      evidenceUrl,
      evidenceName: payload.fileName,
      evidenceGridFsId,
      verdict,
      winnerId,
    });

    write(res, 200, {
      ...verdict,
      evidenceUrl,
      evidenceGridFsId,
    });
    return true;
  }

  return false;
}

/** Vite middleware: referee, GridFS evidence, config. Gemini key stays on the server. */
export function refereePlugin(rootDir) {
  loadEnvFile(path.join(rootDir, ".env"));

  return {
    name: "pact-referee",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (await handleRefereeApi(req, res)) return;
          if (await handleOgApi(req, res, { send })) return;
        } catch (err) {
          const msg = err.message || "referee_error";
          send(res, msg === "too_large" ? 413 : 400, { error: msg });
          return;
        }
        next();
      });
    },
  };
}
