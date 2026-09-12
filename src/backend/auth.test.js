import { describe, expect, it } from "vitest";
import { createAuth0Authenticator, createMockAuthenticator, mockLoginUser, readBearerToken } from "./auth.js";
import { createMemoryStore } from "./store.js";

describe("auth helpers", () => {
  it("reads bearer tokens and ignores missing headers", () => {
    expect(readBearerToken({ headers: {} })).toBeNull();
    expect(readBearerToken({ headers: { authorization: "Bearer abc" } })).toBe("abc");
    expect(readBearerToken({ headers: { authorization: "Token abc" } })).toBeNull();
  });

  it("exposes the ISAAC/FRIEND mock identities", () => {
    expect(mockLoginUser("isaac").name).toBe("ISAAC");
    expect(mockLoginUser("friend").name).toBe("FRIEND");
    expect(mockLoginUser("friend").id).toBe("auth0|demo-maya");
    expect(mockLoginUser("maya").id).toBe("auth0|demo-maya");
    expect(mockLoginUser("carol")).toBeNull();
  });

  it("authenticates mock bearer tokens against the store", async () => {
    const store = createMemoryStore();
    const authenticate = createMockAuthenticator(store);
    const user = await authenticate({ headers: { authorization: "Bearer mock-auth0|demo-isaac" } });
    expect(user.name).toBe("ISAAC");
    expect(await authenticate({ headers: { authorization: "Bearer nope" } })).toBeNull();
  });

  it("upserts a stable Auth0 user from a verified access token", async () => {
    const store = createMemoryStore({ seedDemoUsers: false });
    const authenticate = createAuth0Authenticator({
      store,
      verifyAccessToken: async (token) =>
        token === "live-token"
          ? { sub: "auth0|stable", name: "Riley", email: "riley@example.com" }
          : null,
      fetchUserInfo: async () => null,
    });

    const first = await authenticate({ headers: { authorization: "Bearer live-token" } });
    const second = await authenticate({ headers: { authorization: "Bearer live-token" } });
    expect(first.id).toBe("auth0|stable");
    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
    expect(await authenticate({ headers: { authorization: "Bearer other" } })).toBeNull();
  });

  it("fills profile fields from userinfo when the access token is sparse", async () => {
    const store = createMemoryStore({ seedDemoUsers: false });
    const authenticate = createAuth0Authenticator({
      store,
      verifyAccessToken: async () => ({ sub: "auth0|sparse" }),
      fetchUserInfo: async () => ({ name: "From Userinfo", email: "info@example.com" }),
    });
    const user = await authenticate({ headers: { authorization: "Bearer token" } });
    expect(user.name).toBe("From Userinfo");
    expect(user.email).toBe("info@example.com");
  });
});
