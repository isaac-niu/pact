/**
 * Tests for the Auth0 environment configuration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("env module — auth configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
   });

  afterEach(() => {
    process.env = originalEnv;
   });

  describe("authConfigReady", () => {
    it("returns true when all auth vars are present", async () => {
      process.env.AUTH0_DOMAIN = "dev.auth0.com";
      process.env.AUTH0_CLIENT_ID = "client123";
      process.env.AUTH0_CLIENT_SECRET = "secret456";
      process.env.AUTH0_AUDIENCE = "https://pact.api";
      process.env.AUTH0_SECRET = "session-secret";

      const { authConfigReady } = await import("./env.js");
      expect(authConfigReady()).toBe(true);
     });

    it("returns false when AUTH0_DOMAIN is missing", async () => {
      process.env.AUTH0_CLIENT_ID = "client123";
      process.env.AUTH0_CLIENT_SECRET = "secret456";
      process.env.AUTH0_AUDIENCE = "https://pact.api";
      process.env.AUTH0_SECRET = "session-secret";

      const { authConfigReady } = await import("./env.js");
      expect(authConfigReady()).toBe(false);
     });

    it("returns false when AUTH0_CLIENT_SECRET is missing", async () => {
      process.env.AUTH0_DOMAIN = "dev.auth0.com";
      process.env.AUTH0_CLIENT_ID = "client123";
      process.env.AUTH0_AUDIENCE = "https://pact.api";
      process.env.AUTH0_SECRET = "session-secret";

      const { authConfigReady } = await import("./env.js");
      expect(authConfigReady()).toBe(false);
     });

    it("returns false when AUTH0_AUDIENCE is missing", async () => {
      process.env.AUTH0_DOMAIN = "dev.auth0.com";
      process.env.AUTH0_CLIENT_ID = "client123";
      process.env.AUTH0_CLIENT_SECRET = "secret456";
      process.env.AUTH0_SECRET = "session-secret";

      const { authConfigReady } = await import("./env.js");
      expect(authConfigReady()).toBe(false);
     });

    it("returns false when AUTH0_SECRET is missing", async () => {
      process.env.AUTH0_DOMAIN = "dev.auth0.com";
      process.env.AUTH0_CLIENT_ID = "client123";
      process.env.AUTH0_CLIENT_SECRET = "secret456";
      process.env.AUTH0_AUDIENCE = "https://pact.api";

      const { authConfigReady } = await import("./env.js");
      expect(authConfigReady()).toBe(false);
     });
   });

  describe("getAuthCallbackUrl", () => {
    it("returns the localhost:5173 callback URL", async () => {
      const { getAuthCallbackUrl } = await import("./env.js");
      expect(getAuthCallbackUrl()).toBe("http://localhost:5173/callback");
     });
   });

  describe("getAuthLogoutUrl", () => {
    it("returns the localhost:5173 logout URL", async () => {
      const { getAuthLogoutUrl } = await import("./env.js");
      expect(getAuthLogoutUrl()).toBe("http://localhost:5173");
     });
   });

  describe("getAuthOrigin", () => {
    it("returns the localhost:5173 origin", async () => {
      const { getAuthOrigin } = await import("./env.js");
      expect(getAuthOrigin()).toBe("http://localhost:5173");
     });
   });
});

describe("validateEnv — updated required vars", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
   });

  afterEach(() => {
    process.env = originalEnv;
   });

  it("throws when AUTH0_CLIENT_SECRET is missing", async () => {
    delete process.env.AUTH0_CLIENT_SECRET;
    process.env.AUTH0_DOMAIN = "dev.auth0.com";
    process.env.AUTH0_CLIENT_ID = "client123";
    process.env.AUTH0_AUDIENCE = "https://pact.api";
    process.env.AUTH0_SECRET = "secret";
    process.env.API_URL = "http://localhost:3001";

    const { validateEnv } = await import("./env.js");
    expect(() => validateEnv()).toThrow(/AUTH0_CLIENT_SECRET/);
   });

  it("throws when AUTH0_AUDIENCE is missing", async () => {
    delete process.env.AUTH0_AUDIENCE;
    process.env.AUTH0_DOMAIN = "dev.auth0.com";
    process.env.AUTH0_CLIENT_ID = "client123";
    process.env.AUTH0_CLIENT_SECRET = "secret";
    process.env.AUTH0_SECRET = "secret";
    process.env.API_URL = "http://localhost:3001";

    const { validateEnv } = await import("./env.js");
    expect(() => validateEnv()).toThrow(/AUTH0_AUDIENCE/);
   });

  it("throws when AUTH0_SECRET is missing", async () => {
    delete process.env.AUTH0_SECRET;
    process.env.AUTH0_DOMAIN = "dev.auth0.com";
    process.env.AUTH0_CLIENT_ID = "client123";
    process.env.AUTH0_CLIENT_SECRET = "secret";
    process.env.AUTH0_AUDIENCE = "https://pact.api";
    process.env.API_URL = "http://localhost:3001";

    const { validateEnv } = await import("./env.js");
    expect(() => validateEnv()).toThrow(/AUTH0_SECRET/);
   });

  it("passes when all required vars are present", async () => {
    process.env.AUTH0_DOMAIN = "dev.auth0.com";
    process.env.AUTH0_CLIENT_ID = "client123";
    process.env.AUTH0_CLIENT_SECRET = "secret456";
    process.env.AUTH0_AUDIENCE = "https://pact.api";
    process.env.AUTH0_SECRET = "session-secret";
    process.env.API_URL = "http://localhost:3001";

    const { validateEnv } = await import("./env.js");
    expect(() => validateEnv()).not.toThrow();
   });
});
