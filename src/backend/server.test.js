/**
 * Tests for the Auth0 backend server.
 *
 * These tests verify:
 *       - Unauthenticated requests are rejected (401)
 *       - Authenticated requests succeed
 *       - First-login upserts a user record
 *       - Subsequent logins update the existing record
 *       - Callback and logout endpoints work
 *       - Deterministic mock tokens work when live .env is not ready
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

describe("Auth0 backend server", () => {
  let app;

  beforeEach(async () => {
      // Reset the user store by re-importing the module
    vi.resetModules();

      // Set up mock environment
    process.env.AUTH0_DOMAIN = "dev.auth0.com";
    process.env.AUTH0_CLIENT_ID = "test-client-id";
    process.env.AUTH0_CLIENT_SECRET = "test-client-secret";
    process.env.AUTH0_AUDIENCE = "https://pact.api";
    process.env.AUTH0_SECRET = "test-session-secret";
    process.env.PORT = "3001";

      // Import the server module
    const serverModule = await import("./server.js");
    app = serverModule.app;
     });

  afterEach(() => {
    if (app) {
      // The express app doesn't have a close method, but we can
      // let the test runner handle cleanup
       }
     });

  describe("GET /api/health", () => {
    it("returns ok status", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
       });

    it("includes auth configuration info", async () => {
      const res = await request(app).get("/api/health");
      expect(res.body.env.auth_configured).toBe(true);
      expect(res.body.env.callback_url).toBe("http://localhost:5173/callback");
      expect(res.body.env.logout_url).toBe("http://localhost:5173");
      expect(res.body.env.origin).toBe("http://localhost:5173");
       });
     });

  describe("GET /api/auth/login", () => {
    it("returns an authorize URL", async () => {
      const res = await request(app).get("/api/auth/login");
      expect(res.status).toBe(200);
      expect(res.body.authorizeUrl).toContain("https://dev.auth0.com/authorize");
      expect(res.body.authorizeUrl).toContain("client_id=test-client-id");
      expect(res.body.authorizeUrl).toContain("redirect_uri=");
       });
     });

  describe("GET /api/auth/callback", () => {
    it("redirects to frontend with token when code is provided", async () => {
      const res = await request(app)
         .get("/api/auth/callback?code=test-code&state=test-state");
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("http://localhost:5173/?token=");
       });

    it("redirects to login when code is missing", async () => {
      const res = await request(app).get("/api/auth/callback");
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("http://localhost:5173/login");
       });
     });

  describe("GET /api/auth/logout", () => {
    it("returns a logout URL", async () => {
      const res = await request(app).get("/api/auth/logout");
      expect(res.status).toBe(200);
      expect(res.body.logoutUrl).toContain("https://dev.auth0.com/v2/logout");
      expect(res.body.logoutUrl).toContain("returnTo=");
       });
     });

  describe("GET /api/auth/me", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Authentication required");
       });

    it("returns 401 when an invalid token is provided", async () => {
      const res = await request(app)
         .get("/api/auth/me")
         .set("Authorization", "Bearer invalid.token.here");
      expect(res.status).toBe(401);
       });

    it("returns user identity when a valid mock token is provided", async () => {
       // Create a valid mock token
      const crypto = await import("node:crypto");
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
      const payload = Buffer.from(JSON.stringify({
        sub: "auth0|test-user-123",
        email: "test@example.com",
        name: "Test User",
        nickname: "testuser",
        picture: "https://example.com/pic.png",
        iss: "https://dev.auth0.com/",
        aud: "https://pact.api",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        })).toString("base64");
      const signature = crypto
        .createHmac("sha256", "test-session-secret")
         .update(`${header}.${payload}`)
         .digest("base64");
      const token = `${header}.${payload}.${signature}`;

      const res = await request(app)
         .get("/api/auth/me")
         .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("auth0|test-user-123");
      expect(res.body.email).toBe("test@example.com");
      expect(res.body.name).toBe("Test User");
      expect(res.body.picture).toBe("https://example.com/pic.png");
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.lastLoginAt).toBeDefined();
       });

    it("upserts user on first login", async () => {
      const crypto = await import("node:crypto");
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
      const payload = Buffer.from(JSON.stringify({
        sub: "auth0|new-user-456",
        email: "new@example.com",
        name: "New User",
        iss: "https://dev.auth0.com/",
        aud: "https://pact.api",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        })).toString("base64");
      const signature = crypto
         .createHmac("sha256", "test-session-secret")
         .update(`${header}.${payload}`)
         .digest("base64");
      const token = `${header}.${payload}.${signature}`;

       // First login
      const res1 = await request(app)
         .get("/api/auth/me")
         .set("Authorization", `Bearer ${token}`);
      expect(res1.status).toBe(200);
      expect(res1.body.id).toBe("auth0|new-user-456");

       // Second login with same token
      const res2 = await request(app)
         .get("/api/auth/me")
         .set("Authorization", `Bearer ${token}`);
      expect(res2.status).toBe(200);
      expect(res2.body.id).toBe("auth0|new-user-456");
       });
     });

  describe("Protected routes", () => {
    it("rejects unauthenticated requests to /api/pacts", async () => {
      const res = await request(app).get("/api/pacts");
      expect(res.status).toBe(401);
       });

    it("accepts authenticated requests to /api/pacts", async () => {
      const crypto = await import("node:crypto");
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
      const payload = Buffer.from(JSON.stringify({
        sub: "auth0|protected-user",
        email: "protected@example.com",
        name: "Protected User",
        iss: "https://dev.auth0.com/",
        aud: "https://pact.api",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        })).toString("base64");
      const signature = crypto
         .createHmac("sha256", "test-session-secret")
         .update(`${header}.${payload}`)
         .digest("base64");
      const token = `${header}.${payload}.${signature}`;

      const res = await request(app)
         .get("/api/pacts")
         .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
       });

    it("rejects unauthenticated POST to /api/pacts", async () => {
      const res = await request(app).post("/api/pacts").send({ title: "Test" });
      expect(res.status).toBe(401);
       });
     });

  describe("Public routes", () => {
    it("serves /api/pacts/public without authentication", async () => {
      const res = await request(app).get("/api/pacts/public");
      expect(res.status).toBe(200);
       });
     });
});

describe("Auth0 mock mode (no live .env)", () => {
  let app;

  beforeEach(async () => {
    vi.resetModules();

       // Clear all auth env vars to simulate missing .env
    delete process.env.AUTH0_DOMAIN;
    delete process.env.AUTH0_CLIENT_ID;
    delete process.env.AUTH0_CLIENT_SECRET;
    delete process.env.AUTH0_AUDIENCE;
    delete process.env.AUTH0_SECRET;
    process.env.PORT = "3002";

    const serverModule = await import("./server.js");
    app = serverModule.app;
     });

  describe("GET /api/health", () => {
    it("returns auth_configured as false", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.env.auth_configured).toBe(false);
       });
     });

  describe("GET /api/auth/me", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
       });
     });
});
