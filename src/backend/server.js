/**
 * PACT backend — Auth0 + Atlas migration target.
 *
 * When the server is wired up:
 *       - `npm run server` starts the Express API on port 3001.
 *       - The frontend dev server proxies `/api` requests to the backend.
 *       - Auth0 handles authentication; Atlas (MongoDB) handles persistence.
 *
 * Until then, the frontend runs entirely on localStorage (see src/store.jsx).
 *
 * Auth0 configuration (from environment):
 *       - AUTH0_DOMAIN:       Auth0 tenant domain
 *       - AUTH0_CLIENT_ID:    Auth0 application client ID
 *       - AUTH0_CLIENT_SECRET: Auth0 application client secret
 *       - AUTH0_AUDIENCE:     API audience identifier
 *       - AUTH0_SECRET:       Opaque secret for session signing
 *
 * Deterministic auth mocks:
 *    When the live .env is not fully configured, the server falls back
 *    to deterministic mock tokens so the frontend can still be tested
 *    end-to-end without Auth0.
 */

import express from "express";
import crypto from "node:crypto";
import {
  authConfigReady,
  getAuthCallbackUrl,
  getAuthLogoutUrl,
  getAuthOrigin,
} from "../env.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

// ─── In-memory user store (replaced by Atlas later) ───────────────
// Maps auth0 sub → application user record.
const userStore = new Map();

/**
 * Upsert an application user record from an Auth0 profile.
 * On first login, creates a new record; on subsequent logins,
 * updates existing fields but never overwrites the stable id.
 */
function upsertUser(profile) {
  const sub = profile.sub;
  if (!userStore.has(sub)) {
    userStore.set(sub, {
      id: sub,
      email: profile.email ?? null,
      name: profile.name ?? profile.nickname ?? "Unknown",
      picture: profile.picture ?? null,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
     });
   } else {
    const existing = userStore.get(sub);
    existing.lastLoginAt = Date.now();
    if (profile.email) existing.email = profile.email;
    if (profile.name) existing.name = profile.name;
    if (profile.picture) existing.picture = profile.picture;
   }
  return userStore.get(sub);
}

/**
 * Generate a deterministic mock user from the profile.
 * Used when live Auth0 config is not available.
 */
function mockUserFromProfile(profile) {
  const sub = profile?.sub ?? "mock-user-" + crypto.randomBytes(4).toString("hex");
  return {
    id: sub,
    email: profile?.email ?? "mock@example.com",
    name: profile?.name ?? profile?.nickname ?? "Mock User",
    picture: profile?.picture ?? null,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
   };
}

// ─── Auth0 configuration helpers ──────────────────────────────────
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const AUTH0_SECRET = process.env.AUTH0_SECRET;

const CALLBACK_URL = getAuthCallbackUrl();
const LOGOUT_URL = getAuthLogoutUrl();
const ORIGIN = getAuthOrigin();

/**
 * Verify an Auth0 JWT access token synchronously.
 * Returns the decoded payload or null if invalid.
 */
function verifyAuth0Token(token) {
  if (!token || !AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_AUDIENCE) {
    return null;
   }

  try {
     // In production, this would use the auth0 package to verify the JWT.
     // For now, we use a simple check that the token looks like a JWT.
    const parts = token.split(".");
    if (parts.length !== 3) return null;

     // Decode the payload to check audience and issuer
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

     // Validate audience
    if (payload.aud !== AUTH0_AUDIENCE && payload.aud !== AUTH0_CLIENT_ID) {
      return null;
     }

     // Validate issuer
    if (!payload.iss?.includes(AUTH0_DOMAIN)) {
      return null;
     }

     // Validate expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
     }

    return payload;
   } catch {
    return null;
   }
}

/**
 * Create a mock JWT for deterministic testing.
 */
function createMockToken(profile) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const payload = Buffer.from(JSON.stringify({
    sub: profile?.sub ?? "mock-user-000",
    email: profile?.email ?? "mock@example.com",
    name: profile?.name ?? "Mock User",
    nickname: profile?.nickname ?? "mockuser",
    picture: profile?.picture ?? null,
    iss: `https://${AUTH0_DOMAIN || "dev.auth0.com"}/`,
    aud: AUTH0_AUDIENCE || "pact-api",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
   })).toString("base64");
  const signature = crypto
     .createHmac("sha256", AUTH0_SECRET || "dev-secret")
     .update(`${header}.${payload}`)
     .digest("base64");
  return `${header}.${payload}.${signature}`;
}

/**
 * Auth middleware — extracts and verifies the Bearer token.
 * Returns the decoded profile or null.
 */
function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
   }

  const token = authHeader.slice(7);

   // Try live Auth0 verification first (synchronous now)
  if (authConfigReady()) {
    const profile = verifyAuth0Token(token);
    if (profile) {
      return upsertUser(profile);
     }
   }

   // Fall back to mock token verification
  const mockProfile = verifyMockToken(token);
  if (mockProfile) {
    return upsertUser(mockProfile);
   }

  return null;
}

/**
 * Verify a mock JWT token.
 */
function verifyMockToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

     // Verify signature
    const expectedSig = crypto
       .createHmac("sha256", AUTH0_SECRET || "dev-secret")
       .update(`${parts[0]}.${parts[1]}`)
       .digest("base64");

    if (parts[2] !== expectedSig) return null;

     // Validate expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
     }

    return payload;
   } catch {
    return null;
   }
}

/**
 * Middleware factory — requires authentication.
 * Returns 401 if no valid token is present.
 */
function requireAuth(req, res, next) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
   }
  req.user = user;
  next();
}

// ─── Health check ─────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    env: {
      api_url: process.env.API_URL,
      auth_configured: authConfigReady(),
      callback_url: CALLBACK_URL,
      logout_url: LOGOUT_URL,
      origin: ORIGIN,
     },
   });
});

// ─── Auth0 login redirect ─────────────────────────────────────────
app.get("/api/auth/login", (_req, res) => {
   // In production, redirect to Auth0 /authorize endpoint.
   // For now, return the redirect URL for the frontend to use.
  const authorizeUrl = `https://${AUTH0_DOMAIN}/authorize?` +
     `client_id=${AUTH0_CLIENT_ID}` +
     `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
     `&response_type=code` +
     `&scope=openid%20profile%20email` +
     `&audience=${AUTH0_AUDIENCE}` +
     `&state=${crypto.randomBytes(16).toString("hex")}`;

  res.json({ authorizeUrl });
});

// ─── Auth0 callback (handles the code exchange) ───────────────────
app.get("/api/auth/callback", async (req, res) => {
  const code = req.query.code;
  const _state = req.query.state;

  if (!code) {
    return res.redirect(`${LOGOUT_URL}/login?error=missing_code`);
   }

   // In production, exchange the code for tokens via Auth0 /oauth/token.
   // For deterministic testing, create a mock token.
  const mockProfile = {
    sub: `auth0|${crypto.randomBytes(8).toString("hex")}`,
    email: "user@example.com",
    name: "Demo User",
    nickname: "demo",
    picture: null,
   };

  const token = createMockToken(mockProfile);
  const user = upsertUser(mockProfile);

   // Redirect to the frontend with the token in the URL fragment
   // (in production, use httpOnly cookies instead)
  res.redirect(`${LOGOUT_URL}/?token=${token}&user_id=${user.id}`);
});

// ─── Auth0 logout ─────────────────────────────────────────────────
app.get("/api/auth/logout", (_req, res) => {
   // Clear any session data
  res.json({
    logoutUrl: `https://${AUTH0_DOMAIN}/v2/logout?` +
       `client_id=${AUTH0_CLIENT_ID}` +
       `&returnTo=${encodeURIComponent(LOGOUT_URL)}`,
   });
});

// ─── Current user identity ─────────────────────────────────────────
app.get("/api/auth/me", requireAuth, (req, res) => {
   // Expose the authenticated user's identity
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    picture: req.user.picture,
    createdAt: req.user.createdAt,
    lastLoginAt: req.user.lastLoginAt,
   });
});

// ─── Protected route example ───────────────────────────────────────
app.get("/api/pacts", requireAuth, (_req, res) => {
   // TODO: fetch from Atlas
  res.json([]);
});

app.post("/api/pacts", requireAuth, (req, res) => {
   // TODO: persist to Atlas
  res.status(501).json({ error: "Not yet backed by Atlas" });
});

// ─── Unauthenticated route (public) ────────────────────────────────
app.get("/api/pacts/public", (_req, res) => {
  res.json([]);
});

// ─── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`PACT backend listening on http://localhost:${PORT}`);
  console.log(`Auth0 callback: ${CALLBACK_URL}`);
  console.log(`Auth0 logout:    ${LOGOUT_URL}`);
  console.log(`Auth0 origin:    ${ORIGIN}`);
  if (!authConfigReady()) {
    console.log("⚠  Auth0 not configured — running in mock mode");
   }
});

export { app };
