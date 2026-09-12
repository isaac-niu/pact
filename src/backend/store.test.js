import { describe, expect, it } from "vitest";
import { STARTING_BALANCE_LAMPORTS } from "./constants.js";
import { createMemoryStore } from "./store.js";

describe("memory store", () => {
  it("seeds demo users and lists only participant pacts", async () => {
    const store = createMemoryStore();
    const isaac = await store.getUserById("auth0|demo-isaac");
    const maya = await store.getUserById("auth0|demo-maya");
    expect(isaac.balanceLamports).toBe(STARTING_BALANCE_LAMPORTS);

    const pact = await store.createPact({
      title: "Run",
      stakeLamports: 1,
      creatorId: isaac.id,
      opponentId: maya.id,
    });
    const stranger = await store.upsertUserFromAuth({ sub: "auth0|stranger", name: "X" });
    expect(await store.listPactsForUser(isaac.id)).toHaveLength(1);
    expect(await store.listPactsForUser(stranger.id)).toHaveLength(0);
    expect((await store.getPact(pact.id)).status).toBe("draft");
  });

  it("keeps Auth0 sub stable across logins", async () => {
    const store = createMemoryStore({ seedDemoUsers: false });
    const first = await store.upsertUserFromAuth({ sub: "auth0|one", name: "One" });
    const second = await store.upsertUserFromAuth({
      sub: "auth0|one",
      name: "One Updated",
      email: "one@example.com",
    });
    expect(second.id).toBe(first.id);
    expect(second.sub).toBe("auth0|one");
    expect(second.name).toBe("One Updated");
    expect(second.email).toBe("one@example.com");
  });
});
