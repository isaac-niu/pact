import { describe, expect, it } from "vitest";
import { isPersonBApi } from "../server/authGateway.js";

describe("isPersonBApi", () => {
  it("routes Auth0 health and user routes", () => {
    expect(isPersonBApi({ url: "/api/auth/health", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/auth/me", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/users", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/ledger", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/ledger/deposit", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/groups", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/friends", headers: {} })).toBe(true);
    expect(isPersonBApi({ url: "/api/messages", headers: {} })).toBe(true);
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
