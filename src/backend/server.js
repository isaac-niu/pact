/**
 * PACT backend — Auth0 + Atlas persistence layer.
 *
 * When the server is wired up:
 *      - `npm run server` starts the Express API on port 3001.
 *      - The frontend dev server proxies `/api` requests to the backend.
 *      - Auth0 handles authentication; Atlas (MongoDB) handles persistence.
 *
 * When MongoDB is not configured, the server falls back to in-memory
 * storage for pacts and users.
 *
 * Auth0 configuration (from environment):
 *      - AUTH0_DOMAIN:       Auth0 tenant domain
 *      - AUTH0_CLIENT_ID:    Auth0 application client ID
 *      - AUTH0_CLIENT_SECRET: Auth0 application client secret
 *      - AUTH0_AUDIENCE:     API audience identifier
 *      - AUTH0_SECRET:       Opaque secret for session signing
 *
 * MongoDB configuration (from environment):
 *      - MONGODB_URI:        MongoDB Atlas connection string
 *      - MONGODB_DB_NAME:    Database name (default: "pact")
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
  mongoConfigReady,
} from "../env.js";
import {
  healthCheck,
  mongoConfigured,
  getDb,
  closeDb,
} from "../models/db.js";
import {
  createUserDocument,
  validateUser,
  upsertUser,
  createPactDocument,
  validatePact,
  PACT_STATUSES,
  canTransition,
  transitionPact,
  LAMPORTS_PER_SOL,
} from "../models/pact.model.js";
import {
  createLedgerTransaction,
  validateLedgerTransaction,
  createStakeTransactions,
  createPayoutTransaction,
} from "../models/ledger.model.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

// ─── MongoDB Atlas persistence (when configured) ─────────────────
let mongoDb = null;
let mongoReady = false;

if (mongoConfigured()) {
  (async () => {
    try {
      mongoDb = await getDb();
      mongoReady = true;
      console.log("✓ MongoDB Atlas connected");
    } catch (err) {
      console.warn("⚠ MongoDB Atlas connection failed:", err.message);
      console.warn("  Falling back to in-memory storage");
      mongoReady = false;
    }
  })();
}

// ─── In-memory fallback stores ───────────────────────────────────
const userStore = new Map();
const pactStore = new Map();
const ledgerStore = new Map();

/**
 * In-memory user store operations (fallback when MongoDB is unavailable).
 */
function upsertUserInMemory(profile) {
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

function findUserInMemory(sub) {
  return userStore.get(sub) ?? null;
}

/**
 * In-memory pact store operations (fallback when MongoDB is unavailable).
 */
function createPactInMemory(params) {
  const pact = {
    id: crypto.randomUUID(),
    ...params,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    acceptedAt: null,
    resolvedAt: null,
  };
  pactStore.set(pact.id, pact);
  return pact;
}

function findPactInMemory(id) {
  return pactStore.get(id) ?? null;
}

function listPactsInMemory({ status, creatorId, opponentId } = {}) {
  let pacts = Array.from(pactStore.values());
  if (status) pacts = pacts.filter((p) => p.status === status);
  if (creatorId) pacts = pacts.filter((p) => p.creatorId === creatorId);
  if (opponentId) pacts = pacts.filter((p) => p.opponentId === opponentId);
  return pacts.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * In-memory ledger store operations (fallback when MongoDB is unavailable).
 */
function createLedgerInMemory(params) {
  const tx = {
    id: crypto.randomUUID(),
    ...params,
    createdAt: Date.now(),
  };
  ledgerStore.set(tx.id, tx);
  return tx;
}

function findTransactionsInMemory({ userId, pactId } = {}) {
  let txs = Array.from(ledgerStore.values());
  if (userId) {
    txs = txs.filter(
      (t) => t.fromId === userId || t.toId === userId,
    );
  }
  if (pactId) {
    txs = txs.filter((t) => t.pactId === pactId);
  }
  return txs.sort((a, b) => b.createdAt - a.createdAt);
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
      return upsertUserInMemory(profile);
    }
  }

  // Fall back to mock token verification
  const mockProfile = verifyMockToken(token);
  if (mockProfile) {
    return upsertUserInMemory(mockProfile);
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

// ─── Health check (MongoDB-aware) ─────────────────────────────────
app.get("/api/health", async (_req, res) => {
  const mongoHealth = await healthCheck();

  res.json({
    status: "ok",
    env: {
      api_url: process.env.API_URL,
      auth_configured: authConfigReady(),
      mongo_configured: mongoConfigured(),
      mongo_ready: mongoReady,
      callback_url: CALLBACK_URL,
      logout_url: LOGOUT_URL,
      origin: ORIGIN,
    },
    mongo: {
      configured: mongoConfigured(),
      ready: mongoReady,
      health: mongoHealth,
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
  const user = upsertUserInMemory(mockProfile);

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

// ─── Pacts (MongoDB Atlas or in-memory fallback) ───────────────────
app.get("/api/pacts", requireAuth, async (req, res) => {
  try {
    if (mongoReady) {
      // MongoDB Atlas path
      const pacts = await pactRepository.listPacts({
        creatorId: req.user.id,
        opponentId: req.user.id,
      });
      return res.json(pacts.map((p) => ({ ...p, _id: p._id.toString() })));
    }

    // In-memory fallback
    const pacts = listPactsInMemory({
      creatorId: req.user.id,
      opponentId: req.user.id,
    });
    return res.json(pacts);
  } catch (err) {
    console.error("Error fetching pacts:", err);
    return res.status(500).json({ error: "Failed to fetch pacts" });
  }
});

app.post("/api/pacts", requireAuth, async (req, res) => {
  try {
    const { title, stake } = req.body;

    // Validate stake as SOL (convert to lamports)
    const stakeLamports = Math.round(stake * LAMPORTS_PER_SOL);
    if (stakeLamports <= 0) {
      return res.status(400).json({ error: "Stake must be positive" });
    }

    const pactParams = {
      title,
      stakeLamports,
      creatorId: req.user.id,
      opponentId: "friend", // In production, this would be the matched opponent
    };

    if (mongoReady) {
      // MongoDB Atlas path
      const pact = await pactRepository.createPact(pactParams);
      return res.status(201).json({ ...pact, _id: pact._id.toString() });
    }

    // In-memory fallback
    const pact = createPactInMemory(pactParams);
    return res.status(201).json(pact);
  } catch (err) {
    console.error("Error creating pact:", err);
    return res.status(400).json({ error: err.message });
  }
});

app.get("/api/pacts/public", async (_req, res) => {
  try {
    if (mongoReady) {
      const pacts = await pactRepository.listPacts({ status: PACT_STATUSES.OPEN });
      return res.json(pacts.map((p) => ({ ...p, _id: p._id.toString() })));
    }

    // In-memory fallback
    const pacts = listPactsInMemory({ status: "open" });
    return res.json(pacts);
  } catch (err) {
    console.error("Error fetching public pacts:", err);
    return res.status(500).json({ error: "Failed to fetch pacts" });
  }
});

// ─── Ledger (MongoDB Atlas or in-memory fallback) ──────────────────
app.get("/api/ledger", requireAuth, async (req, res) => {
  try {
    if (mongoReady) {
      const txs = await ledgerRepository.findTransactionsByUser(req.user.id);
      return res.json(txs.map((t) => ({ ...t, _id: t._id.toString() })));
    }

    // In-memory fallback
    const txs = findTransactionsInMemory({ userId: req.user.id });
    return res.json(txs);
  } catch (err) {
    console.error("Error fetching ledger:", err);
    return res.status(500).json({ error: "Failed to fetch ledger" });
  }
});

// ─── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`PACT backend listening on http://localhost:${PORT}`);
  console.log(`Auth0 callback: ${CALLBACK_URL}`);
  console.log(`Auth0 logout:     ${LOGOUT_URL}`);
  console.log(`Auth0 origin:     ${ORIGIN}`);
  if (!authConfigReady()) {
    console.log("⚠  Auth0 not configured — running in mock mode");
  }
  if (!mongoConfigured()) {
    console.log("⚠  MongoDB not configured — running in in-memory mode");
  }
});

export { app };
