import "dotenv/config";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";
import { validateServerEnv } from "../env.js";

export const LAMPORTS_PER_SOL = 1_000_000_000;
const demoUsers = {
  isaac: { id: "auth0|demo-isaac", name: "ISAAC", balanceLamports: 10 * LAMPORTS_PER_SOL },
  maya: { id: "auth0|demo-maya", name: "MAYA", balanceLamports: 10 * LAMPORTS_PER_SOL },
};
const send = (res, status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const bodyOf = (req) => new Promise((resolve) => { let value = ""; req.on("data", (part) => { value += part; }); req.on("end", () => { try { resolve(value ? JSON.parse(value) : {}); } catch { resolve(null); } }); });
const auth0Ready = () => ["AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET", "AUTH0_AUDIENCE", "AUTH0_SECRET"].every((name) => Boolean(process.env[name]?.trim()));
const callbackUrl = () => process.env.AUTH0_CALLBACK_URL ?? "http://localhost:5173/api/auth/callback";
const cookie = (req, name) => req.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);

export function createPactServer() {
  const users = new Map(Object.values(demoUsers).map((user) => [user.id, { ...user, createdAt: Date.now() }]));
  const pacts = new Map(); const transactions = []; const states = new Set(); const sessions = new Map();
  let mongo;
  const database = async () => {
    if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) return null;
    if (!mongo) { mongo = new MongoClient(process.env.MONGODB_URI); await mongo.connect(); await mongo.db(process.env.MONGODB_DB_NAME).collection("users").createIndex({ sub: 1 }, { unique: true }); }
    return mongo.db(process.env.MONGODB_DB_NAME);
  };
  const authenticated = (req) => sessions.get(cookie(req, "pact_session")) ?? [...users.values()].find((user) => process.env.PACT_MOCK_AUTH === "1" && req.headers.authorization === `Bearer mock-${user.id}`) ?? null;
  return createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && url.pathname === "/api/health") { try { const db = await database(); if (db) await db.command({ ping: 1 }); return send(res, 200, { status: "ok", auth0: auth0Ready(), mongo: { configured: Boolean(db), mode: db ? "connected" : "memory" } }); } catch { return send(res, 503, { error: "MongoDB unavailable" }); } }
    if (req.method === "GET" && url.pathname === "/api/auth/login") { if (!auth0Ready()) return send(res, 503, { error: "Auth0 is not configured" }); const state = randomUUID(); states.add(state); const authorize = new URL(`https://${process.env.AUTH0_DOMAIN}/authorize`); authorize.searchParams.set("response_type", "code"); authorize.searchParams.set("client_id", process.env.AUTH0_CLIENT_ID); authorize.searchParams.set("redirect_uri", callbackUrl()); authorize.searchParams.set("scope", "openid profile email"); authorize.searchParams.set("audience", process.env.AUTH0_AUDIENCE); authorize.searchParams.set("state", state); res.writeHead(302, { location: authorize.toString() }); return res.end(); }
    if (req.method === "GET" && url.pathname === "/api/auth/callback") { const code = url.searchParams.get("code"); const state = url.searchParams.get("state"); if (!code || !state || !states.delete(state)) return send(res, 400, { error: "Invalid Auth0 callback state" }); const tokenResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ grant_type: "authorization_code", client_id: process.env.AUTH0_CLIENT_ID, client_secret: process.env.AUTH0_CLIENT_SECRET, code, redirect_uri: callbackUrl() }) }); if (!tokenResponse.ok) return send(res, 401, { error: "Auth0 token exchange failed" }); const tokens = await tokenResponse.json(); const profileResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/userinfo`, { headers: { authorization: `Bearer ${tokens.access_token}` } }); if (!profileResponse.ok) return send(res, 401, { error: "Auth0 profile lookup failed" }); const profile = await profileResponse.json(); const user = { id: profile.sub, sub: profile.sub, name: profile.name ?? profile.nickname ?? profile.sub, email: profile.email ?? null, balanceLamports: 10 * LAMPORTS_PER_SOL, createdAt: Date.now() }; users.set(user.id, user); const db = await database(); if (db) await db.collection("users").updateOne({ sub: user.sub }, { $set: { name: user.name, email: user.email, updatedAt: new Date() }, $setOnInsert: { balanceLamports: user.balanceLamports, createdAt: new Date() } }, { upsert: true }); const session = randomUUID(); sessions.set(session, user); res.writeHead(302, { location: "/app", "set-cookie": `pact_session=${session}; HttpOnly; SameSite=Lax; Path=/` }); return res.end(); }
    if (req.method === "POST" && url.pathname === "/api/auth/logout") { const returnTo = encodeURIComponent("http://localhost:5173"); sessions.delete(cookie(req, "pact_session")); res.writeHead(302, { location: auth0Ready() ? `https://${process.env.AUTH0_DOMAIN}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=${returnTo}` : "/", "set-cookie": "pact_session=; HttpOnly; Max-Age=0; Path=/" }); return res.end(); }
    if (req.method === "POST" && url.pathname === "/api/auth/mock-login") { if (process.env.PACT_MOCK_AUTH !== "1") return send(res, 404, { error: "Not found" }); const body = await bodyOf(req); const user = demoUsers[body?.as]; return user ? send(res, 200, { token: `mock-${user.id}`, user: users.get(user.id) }) : send(res, 400, { error: "Choose isaac or maya" }); }
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
