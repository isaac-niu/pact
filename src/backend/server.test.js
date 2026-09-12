import { afterEach, describe, expect, it } from "vitest";
import { createAuth0Authenticator } from "./auth.js";
import { LAMPORTS_PER_SOL } from "./constants.js";
import { createPactServer } from "./server.js";
import { createMemoryStore } from "./store.js";

let server;

async function api(path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
  return { status: response.status, body: await response.json() };
}

async function start(options) {
  server = createPactServer(options);
  await new Promise((resolve) => server.listen(0, resolve));
}

async function login(as) {
  return api("/api/auth/mock-login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ as }),
  });
}

function auth(token, extra = {}) {
  return { authorization: `Bearer ${token}`, ...extra };
}

afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  server = undefined;
});

describe("Pact API (mock auth)", () => {
  it("rejects protected data without a valid token", async () => {
    await start();
    expect((await api("/api/pacts")).status).toBe(401);
    expect((await api("/api/auth/me")).status).toBe(401);
    expect((await api("/api/ledger")).status).toBe(401);
  });

  it("reports memory persistence on health", async () => {
    await start();
    const health = await api("/api/health");
    expect(health.status).toBe(200);
    expect(health.body.auth.mode).toBe("mock");
    expect(health.body.mongo.mode).toBe("memory");
    expect(health.body.auth.callbackUrl).toBe("http://localhost:5173/callback");
  });

  it("exposes the same payload at /api/auth/health", async () => {
    await start();
    const health = await api("/api/auth/health");
    expect(health.status).toBe(200);
    expect(health.body.auth.mode).toBe("mock");
    expect(health.body.status).toBe("ok");
  });

  it("creates, accepts, and settles a pact exactly once with integer lamports", async () => {
    await start();
    const isaac = await login("isaac");
    const maya = await login("maya");
    const created = await api("/api/pacts", {
      method: "POST",
      headers: auth(isaac.body.token, { "content-type": "application/json" }),
      body: JSON.stringify({
        title: "Run a 5k",
        stakeLamports: LAMPORTS_PER_SOL,
        opponentId: maya.body.user.id,
      }),
    });
    expect(created.status).toBe(201);
    const accepted = await api(`/api/pacts/${created.body.id}/accept`, {
      method: "PATCH",
      headers: auth(maya.body.token),
    });
    expect(accepted.body.status).toBe("accepted");
    const settled = await api(`/api/pacts/${created.body.id}/settle?winnerId=${isaac.body.user.id}`, {
      method: "PATCH",
      headers: auth(isaac.body.token),
    });
    expect(settled.body.status).toBe("settled");
    expect(
      (
        await api(`/api/pacts/${created.body.id}/settle?winnerId=${isaac.body.user.id}`, {
          method: "PATCH",
          headers: auth(isaac.body.token),
        })
      ).status,
    ).toBe(409);
    expect((await api("/api/ledger", { headers: auth(isaac.body.token) })).body.balanceLamports).toBe(
      11 * LAMPORTS_PER_SOL,
    );
  });
});

describe("Pact API authorization", () => {
  const profiles = {
    alice: { sub: "auth0|alice", name: "ALICE", email: "alice@example.com" },
    bob: { sub: "auth0|bob", name: "BOB", email: "bob@example.com" },
    carol: { sub: "auth0|carol", name: "CAROL", email: "carol@example.com" },
  };

  async function startLive() {
    const store = createMemoryStore({ seedDemoUsers: false });
    await start({
      mode: "live",
      store,
      authenticate: createAuth0Authenticator({
        store,
        verifyAccessToken: async (token) => profiles[token] ?? null,
        fetchUserInfo: async () => null,
      }),
      mongoHealth: async () => ({ configured: true, mode: "atlas", connected: true }),
    });
    const alice = await api("/api/auth/me", { headers: auth("alice") });
    const bob = await api("/api/auth/me", { headers: auth("bob") });
    const carol = await api("/api/auth/me", { headers: auth("carol") });
    return { alice: alice.body, bob: bob.body, carol: carol.body };
  }

  it("rejects unauthenticated access and disables mock login", async () => {
    await startLive();
    expect((await api("/api/pacts")).status).toBe(401);
    expect((await api("/api/pacts/does-not-exist")).status).toBe(401);
    expect(
      (
        await api("/api/auth/mock-login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ as: "isaac" }),
        })
      ).status,
    ).toBe(404);
  });

  it("reports Atlas health when live persistence is connected", async () => {
    await startLive();
    const health = await api("/api/health");
    expect(health.body.auth.mode).toBe("live");
    expect(health.body.mongo).toEqual({ configured: true, mode: "atlas", connected: true });
  });

  it("maps Auth0 sub to a stable user and lets participants create/accept", async () => {
    const { alice, bob } = await startLive();
    expect(alice.id).toBe("auth0|alice");
    const created = await api("/api/pacts", {
      method: "POST",
      headers: auth("alice", { "content-type": "application/json" }),
      body: JSON.stringify({
        title: "Gym selfie",
        stakeLamports: LAMPORTS_PER_SOL,
        opponentId: bob.id,
      }),
    });
    expect(created.status).toBe(201);
    expect((await api(`/api/pacts/${created.body.id}`, { headers: auth("bob") })).status).toBe(200);
    const accepted = await api(`/api/pacts/${created.body.id}/accept`, {
      method: "PATCH",
      headers: auth("bob"),
    });
    expect(accepted.status).toBe(200);
    expect(accepted.body.status).toBe("accepted");
  });

  it("hides another pair's pact from a third authenticated user", async () => {
    const { bob } = await startLive();
    const created = await api("/api/pacts", {
      method: "POST",
      headers: auth("alice", { "content-type": "application/json" }),
      body: JSON.stringify({
        title: "Private pact",
        stakeLamports: LAMPORTS_PER_SOL,
        opponentId: bob.id,
      }),
    });

    const listed = await api("/api/pacts", { headers: auth("carol") });
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual([]);

    const viewed = await api(`/api/pacts/${created.body.id}`, { headers: auth("carol") });
    expect(viewed.status).toBe(403);

    const accepted = await api(`/api/pacts/${created.body.id}/accept`, {
      method: "PATCH",
      headers: auth("carol"),
    });
    expect(accepted.status).toBe(403);

    const declined = await api(`/api/pacts/${created.body.id}/decline`, {
      method: "PATCH",
      headers: auth("carol"),
    });
    expect(declined.status).toBe(403);
  });

  it("uses join codes and creator approval before sharing a group pact with members", async () => {
    const { bob, carol } = await startLive();
    const createdGroup = await api("/api/groups", {
      method: "POST",
      headers: auth("alice", { "content-type": "application/json" }),
      body: JSON.stringify({ name: "Morning runners", visibility: "private" }),
    });
    expect(createdGroup.status).toBe(201);

    const privateGroup = createdGroup.body;
    expect(privateGroup.joinCode).toMatch(/^[A-Z0-9]{8}$/);
    expect((await api("/api/groups", { headers: auth("carol") })).body).toEqual([]);

    const listedGroup = await api("/api/groups", {
      method: "POST",
      headers: auth("alice", { "content-type": "application/json" }),
      body: JSON.stringify({ name: "Open runners", visibility: "public", discoverable: true }),
    });
    expect(listedGroup.body.joinCode).toMatch(/^[A-Z0-9]{8}$/);
    expect((await api("/api/groups", { headers: auth("carol") })).body.map((group) => group.id)).toContain(listedGroup.body.id);
    expect(
      (
        await api(`/api/groups/${listedGroup.body.id}/join`, {
          method: "POST",
          headers: auth("carol"),
        })
      ).status,
    ).toBe(202);
    expect(
      (
        await api(`/api/groups/${listedGroup.body.id}/approve`, {
          method: "POST",
          headers: auth("alice", { "content-type": "application/json" }),
          body: JSON.stringify({ userId: carol.id }),
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await api(`/api/groups/${privateGroup.id}/join`, {
          method: "POST",
          headers: auth("bob"),
        })
      ).status,
    ).toBe(403);

    const requested = await api("/api/groups/join", {
      method: "POST",
      headers: auth("bob", { "content-type": "application/json" }),
      body: JSON.stringify({ joinCode: privateGroup.joinCode }),
    });
    expect(requested.status).toBe(202);
    expect(requested.body.requested).toBe(true);

    const approved = await api(`/api/groups/${privateGroup.id}/approve`, {
      method: "POST",
      headers: auth("alice", { "content-type": "application/json" }),
      body: JSON.stringify({ userId: bob.id }),
    });
    expect(approved.status).toBe(200);
    expect(approved.body.memberIds).toContain(bob.id);

    const groupPact = await api("/api/pacts", {
      method: "POST",
      headers: auth("alice", { "content-type": "application/json" }),
      body: JSON.stringify({
        title: "Run before work",
        stakeLamports: LAMPORTS_PER_SOL,
        groupId: privateGroup.id,
      }),
    });
    expect(groupPact.status).toBe(201);
    expect((await api("/api/pacts", { headers: auth("bob") })).body).toEqual([]);

    const shared = await api(`/api/pacts/${groupPact.body.id}/share`, {
      method: "POST",
      headers: auth("alice"),
    });
    expect(shared.status).toBe(200);
    expect(shared.body.sharedToGroupAt).toBeTypeOf("number");

    const bobPacts = await api("/api/pacts", { headers: auth("bob") });
    expect(bobPacts.body.map((pact) => pact.id)).toContain(groupPact.body.id);
    expect((await api(`/api/pacts/${groupPact.body.id}`, { headers: auth("carol") })).status).toBe(403);

    const accepted = await api(`/api/pacts/${groupPact.body.id}/accept`, {
      method: "PATCH",
      headers: auth("bob"),
    });
    expect(accepted.status).toBe(200);
    expect(accepted.body.status).toBe("accepted");
    expect(accepted.body.opponentId).toBe(bob.id);
  });
});
