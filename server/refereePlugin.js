import { loadEnvFile } from "./loadEnv.js";
import { geminiEnabled, judgeEvidence } from "./gemini.js";
import path from "node:path";

function send(res, status, body) {
  const data = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
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

/** Vite middleware: /api/referee and /api/config. Keeps the Gemini key off the client. */
export function refereePlugin(rootDir) {
  loadEnvFile(path.join(rootDir, ".env"));

  return {
    name: "pact-referee",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || "").split("?")[0];
        try {
          if (url === "/api/config" && req.method === "GET") {
            send(res, 200, {
              ok: true,
              service: "pact",
              features: { gemini: geminiEnabled() },
            });
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
            send(res, 200, verdict);
            return;
          }
        } catch (err) {
          send(res, err.message === "too_large" ? 413 : 400, { error: err.message || "referee_error" });
          return;
        }
        next();
      });
    },
  };
}
