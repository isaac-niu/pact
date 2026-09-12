import { describe, expect, it } from "vitest";
import { bootAuthApi, isPersonBApi, resetAuthApiForTests } from "../server/authGateway.js";

describe("isPersonBApi", () => {
  it("routes Auth0 health and user routes", () => {
    expect(isPersonBApi({ url: "/api/auth/health", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/auth/me", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/users", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/ledger", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/groups", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/groups/abc/join", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/friends", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/friends/auth0%7Cbob/accept", headers: {} })).toBe(true);
  });

  it("sends Bearer /api/pacts to Auth0 API and actor posts to the desk", () => {
    expect(
      isPersonBApi({
        url: "/api/pacts",
        headers: { authorization: "Bearer aaa" },
      }),
    ).toBe(true);
    expect(
      isPersonBApi({
        url: "/api/pacts",
        headers: { "x-pact-actor": "you" },
      }),
    ).toBe(false);
    expect(isPersonBApi({ url: "/api/health", headers: {} })).toBe(false);
    expect(isPersonBApi({ url: "/api/desk", headers: {} })).toBe(false);
  });
});

describe("bootAuthApi", () => {
  it("does not fall back to mock when live Auth0 env is incomplete", async () => {
    resetAuthApiForTests();
    const handler = await bootAuthApi({
      AUTH0_DOMAIN: "",
      MONGODB_URI: "",
    });
    expect(handler).toBeNull();
  });
});
