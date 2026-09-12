import { loadEnvFile } from "./loadEnv.js";
import { DEFAULT_MODEL, geminiEnabled, geminiStatus, judgeEvidence } from "./gemini.js";
import { mongoConfigured, mongoError, mongoReady } from "./mongo.js";
import { persistPactProof, readEvidence, storeEvidence } from "./evidenceStore.js";
import path from "node:path";

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

/** Vite middleware: referee, GridFS evidence, config. Gemini key stays on the server. */
export function refereePlugin(rootDir) {
  loadEnvFile(path.join(rootDir, ".env"));

  return {
    name: "pact-referee",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || "").split("?")[0];
        try {
          if (url === "/api/config" && req.method === "GET") {
            const mongo = await mongoReady();
            const desk = geminiStatus();
            send(res, 200, {
              ok: true,
              service: "pact",
              features: {
                gemini: geminiEnabled(),
                geminiLive: Boolean(desk.lastLiveAt),
                geminiError: desk.lastError?.code || null,
                geminiModel: desk.lastModel || process.env.GEMINI_MODEL || DEFAULT_MODEL,
                mongo: mongoConfigured() && mongo,
                mongoError: mongo ? null : mongoError(),
              },
            });
            return;
          }

          const evidenceMatch = url.match(/^\/api\/evidence\/([^/]+)$/);
          if (evidenceMatch && req.method === "GET") {
            const file = await readEvidence(decodeURIComponent(evidenceMatch[1]));
            if (!file) {
              send(res, 404, { error: "not_found" });
              return;
            }
            send(res, 200, file.buffer, {
              "content-type": file.contentType,
              "content-disposition": `inline; filename="${file.filename.replaceAll('"', "")}"`,
            });
            return;
          }

          if (url === "/api/pacts/verify" && req.method === "POST") {
            const payload = await readJson(req, 32_000);
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
              evidenceHash: payload.verdict?.evidenceHash || payload.evidenceHash || null,
              verdict: payload.verdict,
              winnerId: payload.winnerId,
            });
            send(res, 200, { ok: true });
            return;
          }

          if (url === "/api/referee" && req.method === "POST") {
            const payload = await readJson(req);
            const verdict = await judgeEvidence({
              title: payload.title,
              criteria: payload.criteria,
              fileName: payload.fileName,
              dataUrl: payload.dataUrl,
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
              evidenceHash: verdict.evidenceHash || null,
              verdict,
              winnerId,
            });

            send(res, 200, {
              ...verdict,
              evidenceUrl,
              evidenceGridFsId,
            });
            return;
          }
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
