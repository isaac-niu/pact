import { liveConfig, getDesk, createPact, acceptPact, submitEvidence, verifyPact, depositFunds } from "./deskStore.js";
import { mongoReady } from "./mongo.js";
import { listDeskUsers } from "./deskUsers.js";

function actorOf(req, payload = {}) {
  const header = req.headers["x-pact-actor"];
  const id = payload.actorId || header || "you";
  return id === "friend" ? "friend" : "you";
}

async function jsonBody(req, readBody, limit) {
  const raw = await readBody(req, limit);
  if (!raw.length) return {};
  return JSON.parse(raw.toString("utf8"));
}

export async function handleDeskApi(req, res, { send, readBody }) {
  const url = req.url.split("?")[0];

  if (url === "/api/config" && req.method === "GET") {
    send(res, 200, liveConfig());
    return true;
  }

  if ((url === "/api/health" || url === "/healthz") && req.method === "GET") {
    const cfg = liveConfig();
    send(res, 200, {
      ok: true,
      service: "pact",
      uptime: process.uptime(),
      features: cfg.features,
    });
    return true;
  }

  if (url === "/api/auth/config" && req.method === "GET") {
    send(res, 200, { auth0: liveConfig().auth0 });
    return true;
  }

  if (!mongoReady() && url.startsWith("/api/pacts")) {
    send(res, 503, { error: "mongo_unavailable" });
    return true;
  }

  if (url === "/api/desk" && req.method === "GET") {
    if (!mongoReady()) {
      send(res, 503, { error: "mongo_unavailable" });
      return true;
    }
    const snap = await getDesk(actorOf(req));
    send(res, 200, snap);
    return true;
  }

  if (url === "/api/desk/users" && req.method === "GET") {
    if (!mongoReady()) {
      send(res, 503, { error: "mongo_unavailable" });
      return true;
    }
    send(res, 200, { persist: true, users: await listDeskUsers() });
    return true;
  }

  if (url === "/api/desk/deposit" && req.method === "POST") {
    if (!mongoReady()) {
      send(res, 503, { error: "mongo_unavailable" });
      return true;
    }
    const payload = await jsonBody(req, readBody, 32_000);
    const out = await depositFunds(payload, actorOf(req, payload));
    send(res, 200, out);
    return true;
  }

  if (url === "/api/pacts" && req.method === "POST") {
    const payload = await jsonBody(req, readBody, 32_000);
    const out = await createPact(payload, actorOf(req, payload));
    send(res, 200, out);
    return true;
  }

  const pactMatch = url.match(/^\/api\/pacts\/([^/]+)\/(accept|evidence|verify)$/);
  if (pactMatch && req.method === "POST") {
    const pactId = decodeURIComponent(pactMatch[1]);
    const action = pactMatch[2];
    if (action === "evidence") {
      const payload = await jsonBody(req, readBody, 8_000_000);
      const out = await submitEvidence(
        pactId,
        { dataUrl: payload.evidenceDataUrl, name: payload.evidenceName },
        actorOf(req, payload),
      );
      send(res, 200, out);
      return true;
    }
    const payload = await jsonBody(req, readBody, 32_000);
    if (action === "accept") {
      const out = await acceptPact(pactId, actorOf(req, payload));
      send(res, 200, out);
      return true;
    }
    const out = await verifyPact(pactId, payload.pass !== false, actorOf(req, payload));
    send(res, 200, out);
    return true;
  }

  return false;
}
