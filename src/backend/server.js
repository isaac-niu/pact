/**
 * PACT backend — placeholder for the Auth0 + Atlas migration.
 *
 * When the server is wired up:
 *   - `npm run server` starts the Express API on port 3001.
 *   - The frontend dev server proxies `/api` requests to the backend.
 *   - Auth0 handles authentication; Atlas (MongoDB) handles persistence.
 *
 * Until then, the frontend runs entirely on localStorage (see src/store.jsx).
 */

import express from "express";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

// ─── Health check ───────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: { api_url: process.env.API_URL } });
});

// ─── Pact endpoints (stub) ─────────────────────────────────────
app.get("/api/pacts", (_req, res) => {
  // TODO: fetch from Atlas
  res.json([]);
});

app.post("/api/pacts", (req, res) => {
  // TODO: persist to Atlas
  res.status(501).json({ error: "Not yet backed by Atlas" });
});

// ─── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`PACT backend listening on http://localhost:${PORT}`);
});
