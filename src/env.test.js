import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the env module by mocking import.meta.env
// since vitest's test environment doesn't propagate
// process.env to import.meta.env the same way.

describe("validateServerEnv", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
   });

  afterEach(() => {
    process.env = originalEnv;
   });

  it("throws when all required vars are missing", async () => {
    delete process.env.AUTH0_DOMAIN;
    delete process.env.AUTH0_CLIENT_ID;
    delete process.env.AUTH0_CLIENT_SECRET;
    delete process.env.AUTH0_AUDIENCE;
    delete process.env.AUTH0_SECRET;
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_DB_NAME;

    const { validateEnv } = await import("./env.js");
    expect(() => validateEnv()).toThrow(
       /missing required environment variables/,
     );
   });

  it("throws listing each missing variable", async () => {
    delete process.env.AUTH0_DOMAIN;
    delete process.env.MONGODB_URI;

    const { validateEnv } = await import("./env.js");
    expect(() => validateEnv()).toThrow(/AUTH0_DOMAIN/);
   });

  it("passes when all required vars are present", async () => {
    process.env.AUTH0_DOMAIN = "example.auth0.com";
    process.env.AUTH0_CLIENT_ID = "abc123";
    process.env.AUTH0_CLIENT_SECRET = "secret";
    process.env.AUTH0_AUDIENCE = "https://pact-api";
    process.env.AUTH0_SECRET = "session-secret";
    process.env.MONGODB_URI = "mongodb://localhost:27017";
    process.env.MONGODB_DB_NAME = "pact";

    const { validateEnv } = await import("./env.js");
    expect(() => validateEnv()).not.toThrow();
   });

  it("treats empty strings as missing", async () => {
    process.env.AUTH0_DOMAIN = "";
    process.env.AUTH0_CLIENT_ID = "abc";
    process.env.AUTH0_CLIENT_SECRET = "secret";
    process.env.AUTH0_AUDIENCE = "https://pact-api";
    process.env.AUTH0_SECRET = "session-secret";
    process.env.MONGODB_URI = "mongodb://localhost";
    process.env.MONGODB_DB_NAME = "pact";

    const { validateEnv } = await import("./env.js");
    expect(() => validateEnv()).toThrow(/AUTH0_DOMAIN/);
   });
});

describe("clientEnvReady", () => {
  it("returns not ready when VITE_AUTH0_DOMAIN is missing", async () => {
    const { clientEnvReady } = await import("./env.js");
    const { ready, message } = clientEnvReady();
    expect(ready).toBe(false);
    expect(message).toContain("VITE_AUTH0_DOMAIN");
   });

  it("returns not ready when VITE_AUTH0_CLIENT_ID is missing", async () => {
    const { clientEnvReady } = await import("./env.js");
    const { ready, message } = clientEnvReady();
    expect(ready).toBe(false);
    expect(message).toContain("VITE_AUTH0_CLIENT_ID");
   });
});

describe("getViteEnv", () => {
  it("returns undefined for non-existent VITE_ vars", async () => {
    const { getViteEnv } = await import("./env.js");
    expect(getViteEnv("NONEXISTENT")).toBeUndefined();
   });
});
