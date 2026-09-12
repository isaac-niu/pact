import { afterEach, describe, expect, it } from "vitest";
import { createPactServer, LAMPORTS_PER_SOL } from "./server.js";

let server;
async function api(path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
  return { status: response.status, body: await response.json() };
}
async function start() { server = createPactServer(); await new Promise((resolve) => server.listen(0, resolve)); }
async function login(as) { return api("/api/auth/mock-login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ as }) }); }

afterEach(async () => { if (server) await new Promise((resolve) => server.close(resolve)); server = undefined; });

describe("Pact API", () => {
  it("rejects protected data without a valid token", async () => { await start(); expect((await api("/api/pacts")).status).toBe(401); });
  it("creates, accepts, and settles a pact exactly once with integer lamports", async () => {
    await start(); const isaac = await login("isaac"); const maya = await login("maya");
    const created = await api("/api/pacts", { method: "POST", headers: { authorization: `Bearer ${isaac.body.token}`, "content-type": "application/json" }, body: JSON.stringify({ title: "Run a 5k", stakeLamports: LAMPORTS_PER_SOL, opponentId: maya.body.user.id }) });
    expect(created.status).toBe(201);
    const accepted = await api(`/api/pacts/${created.body.id}/accept`, { method: "PATCH", headers: { authorization: `Bearer ${maya.body.token}` } });
    expect(accepted.body.status).toBe("accepted");
    const settled = await api(`/api/pacts/${created.body.id}/settle?winnerId=${isaac.body.user.id}`, { method: "PATCH", headers: { authorization: `Bearer ${isaac.body.token}` } });
    expect(settled.body.status).toBe("settled");
    expect((await api(`/api/pacts/${created.body.id}/settle?winnerId=${isaac.body.user.id}`, { method: "PATCH", headers: { authorization: `Bearer ${isaac.body.token}` } })).status).toBe(409);
    expect((await api("/api/ledger", { headers: { authorization: `Bearer ${isaac.body.token}` } })).body.balanceLamports).toBe(11 * LAMPORTS_PER_SOL);
  });
});
