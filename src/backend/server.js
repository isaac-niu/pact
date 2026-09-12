import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { validateServerEnv } from "../env.js";

export const LAMPORTS_PER_SOL = 1_000_000_000;
const demoUsers = {
  isaac: { id: "auth0|demo-isaac", name: "ISAAC", balanceLamports: 10 * LAMPORTS_PER_SOL },
  maya: { id: "auth0|demo-maya", name: "MAYA", balanceLamports: 10 * LAMPORTS_PER_SOL },
};
const send = (res, status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const bodyOf = (req) => new Promise((resolve) => { let value = ""; req.on("data", (part) => { value += part; }); req.on("end", () => { try { resolve(value ? JSON.parse(value) : {}); } catch { resolve(null); } }); });

export function createPactServer() {
  const users = new Map(Object.values(demoUsers).map((user) => [user.id, { ...user, createdAt: Date.now() }]));
  const pacts = new Map(); const transactions = [];
  const authenticated = (req) => [...users.values()].find((user) => req.headers.authorization === `Bearer mock-${user.id}`) ?? null;
  return createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && url.pathname === "/api/health") return send(res, 200, { status: "ok", mongo: { configured: Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB_NAME), mode: "memory" } });
    if (req.method === "POST" && url.pathname === "/api/auth/mock-login") { const body = await bodyOf(req); const user = demoUsers[body?.as]; return user ? send(res, 200, { token: `mock-${user.id}`, user: users.get(user.id) }) : send(res, 400, { error: "Choose isaac or maya" }); }
    const user = authenticated(req); if (!user) return send(res, 401, { error: "Authentication required" });
    if (req.method === "GET" && url.pathname === "/api/auth/me") return send(res, 200, user);
    if (req.method === "GET" && url.pathname === "/api/pacts") return send(res, 200, [...pacts.values()].filter((pact) => pact.creatorId === user.id || pact.opponentId === user.id));
    if (req.method === "POST" && url.pathname === "/api/pacts") { const body = await bodyOf(req); if (!body?.title?.trim() || !Number.isInteger(body.stakeLamports) || body.stakeLamports <= 0 || !users.has(body.opponentId) || body.opponentId === user.id) return send(res, 400, { error: "title, positive integer stakeLamports, and a different known counterparty are required" }); const pact = { id: randomUUID(), title: body.title.trim(), stakeLamports: body.stakeLamports, creatorId: user.id, opponentId: body.opponentId, status: "draft", createdAt: Date.now(), updatedAt: Date.now() }; pacts.set(pact.id, pact); return send(res, 201, pact); }
    const match = url.pathname.match(/^\/api\/pacts\/([^/]+)\/(accept|decline|settle)$/);
    if (req.method === "PATCH" && match) { const pact = pacts.get(match[1]); const action = match[2]; if (!pact) return send(res, 404, { error: "Pact not found" }); if (action === "accept") { const creator = users.get(pact.creatorId); if (user.id !== pact.opponentId || pact.status !== "draft" || creator.balanceLamports < pact.stakeLamports || user.balanceLamports < pact.stakeLamports) return send(res, 409, { error: "Pact cannot be accepted" }); creator.balanceLamports -= pact.stakeLamports; user.balanceLamports -= pact.stakeLamports; pact.status = "accepted"; transactions.push({ id: randomUUID(), pactId: pact.id, type: "lock", amountLamports: pact.stakeLamports * 2 }); } else if (action === "decline") { if (user.id !== pact.opponentId || pact.status !== "draft") return send(res, 403, { error: "Only the invited counterparty can decline a draft" }); pact.status = "declined"; transactions.push({ id: randomUUID(), pactId: pact.id, type: "decline", amountLamports: 0 }); } else { const winner = url.searchParams.get("winnerId"); if (user.id !== pact.creatorId || pact.status !== "accepted" || !users.has(winner)) return send(res, 409, { error: "Only the creator can settle an accepted pact with a known winner" }); users.get(winner).balanceLamports += pact.stakeLamports * 2; pact.status = "settled"; pact.winnerId = winner; transactions.push({ id: randomUUID(), pactId: pact.id, type: "settle", amountLamports: pact.stakeLamports * 2 }); } pact.updatedAt = Date.now(); return send(res, 200, pact); }
    if (req.method === "GET" && url.pathname === "/api/ledger") return send(res, 200, { balanceLamports: user.balanceLamports, transactions: transactions.filter((entry) => { const pact = pacts.get(entry.pactId); return pact.creatorId === user.id || pact.opponentId === user.id; }) });
    return send(res, 404, { error: "Not found" });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) { try { if (process.env.PACT_MOCK_AUTH !== "1") validateServerEnv(); createPactServer().listen(Number(process.env.PORT ?? 3001)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
