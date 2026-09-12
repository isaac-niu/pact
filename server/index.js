import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAnnouncement, synthesize } from "./elevenlabs.js";
import { handleDeskApi } from "./httpDesk.js";
import { connectMongo } from "./mongo.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(root, ".env"));

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.BIND_HOST || "127.0.0.1";
const DIST = path.join(root, "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function send(res, status, body, headers = {}) {
  const isJson = body !== null && typeof body === "object" && !Buffer.isBuffer(body);
  const data = Buffer.isBuffer(body) ? body : isJson ? JSON.stringify(body) : String(body);
  res.writeHead(status, {
    "content-type": isJson
      ? "application/json; charset=utf-8"
      : headers["content-type"] || "text/plain; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  res.end(data);
}

function readBody(req, limit = 32_000) {
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
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function safeJoin(dir, reqPath) {
  const decoded = decodeURIComponent((reqPath || "/").split("?")[0]);
  const rel = decoded.replace(/^\/+/, "");
  const abs = path.normalize(path.join(dir, rel));
  if (!abs.startsWith(dir)) return null;
  return abs;
}

function serveStatic(req, res) {
  if (!existsSync(DIST)) {
    send(
      res,
      503,
      "PACT is not built yet. Run npm run build.\n",
      { "content-type": "text/plain; charset=utf-8" },
    );
    return;
  }

  const urlPath = req.url.split("?")[0];
  let file = safeJoin(DIST, urlPath);
  if (!file) {
    send(res, 400, "Bad path");
    return;
  }

  const tryFile = (p) => {
    if (existsSync(p) && statSync(p).isFile()) return p;
    return null;
  };

  let target = tryFile(file);
  if (!target && existsSync(file) && statSync(file).isDirectory()) {
    target = tryFile(path.join(file, "index.html"));
  }
  if (!target) target = tryFile(path.join(DIST, "index.html"));
  if (!target) {
    send(res, 404, "Not found");
    return;
  }

  const ext = path.extname(target);
  const type = MIME[ext] || "application/octet-stream";
  const cache =
    ext === ".html" ? "no-store" : "public, max-age=31536000, immutable";
  res.writeHead(200, { "content-type": type, "cache-control": cache });
  res.end(readFileSync(target));
}

async function handleApi(req, res) {
  try {
    if (await handleDeskApi(req, res, { send, readBody })) return;
  } catch (err) {
    const msg = String(err.message || "server_error");
    const status = /mongo|conflict|desk_busy/.test(msg) ? 503 : 400;
    send(res, status, { error: msg });
    return;
  }

  const url = req.url.split("?")[0];

  if (url === "/api/announce" && req.method === "POST") {
    let payload = {};
    try {
      const raw = await readBody(req);
      if (raw.length) payload = JSON.parse(raw.toString("utf8"));
    } catch {
      send(res, 400, { error: "invalid_json" });
      return;
    }

    const text =
      typeof payload.text === "string" && payload.text.trim()
        ? payload.text.trim().slice(0, 400)
        : buildAnnouncement(payload);

    const result = await synthesize(text);
    if (result.disabled) {
      res.writeHead(204);
      res.end();
      return;
    }
    if (result.error) {
      send(res, 503, { error: result.error, announcer: false });
      return;
    }
    send(res, 200, result.audio, {
      "content-type": "audio/mpeg",
      "cache-control": "no-store",
    });
    return;
  }

  send(res, 404, { error: "not_found" });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type, x-pact-actor",
      });
      res.end();
      return;
    }

    const url = req.url.split("?")[0];
    if (url.startsWith("/api/") || url === "/healthz") {
      await handleApi(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      send(res, 405, "Method not allowed");
      return;
    }

    serveStatic(req, res);
  } catch (err) {
    if (!res.headersSent) send(res, 500, { error: "server_error" });
    console.error(err);
  }
});

connectMongo().finally(() => {
  server.listen(PORT, HOST, () => {
    console.log(`pact listening on ${HOST}:${PORT}`);
  });
});
