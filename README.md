# PACT

Local proof of concept for a 1v1 self-improvement challenge. Friend A writes a pact, Friend B accepts and matches a fake SOL stake, A uploads a photo, a mocked referee calls pass/fail, and the pot is marked paid.

There are two stacks in this repo:

- **localStorage desk** (`/`, `/create`, `/feed`, `/pact/:id`) — original client-only demo with the You/Friend switcher.
- **authenticated app** (`/app`) — protected API for identity, pacts, and ledger. Runs in **mock** or **live Auth0 + MongoDB Atlas** mode.

## Quick start (localStorage demo)

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

State lives in `localStorage`. Photos stay in the browser as object URLs. Two hardcoded demo users — **You (ISAAC)** and **Friend (MAYA)** — switch from the top-right pill.

## 60-second demo

1. **Home**: read the pitch. Click **Open a pact**.
2. Leave the default challenge ("I'll upload a gym selfie") and a 2 SOL stake. Click **Post to the board**.
3. You are still ISAAC, so the slip is waiting. Flip the switcher to **Friend**.
4. Click **Accept · 2.00 SOL**. The pot is now 4.00 SOL.
5. Flip back to **You**. Upload any photo (a gym selfie, a cat, a screenshot — the referee only checks that a file exists).
6. Click **Send to referee**. After ~1.4s you get pass/fail, a confidence number, a one-line rationale, and who takes the pot.

That's the product: accountability with a sportsbook ticket, not a platform.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server on `localhost:5173` |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build locally |
| `npm run test` | Run the Vitest test suite (jsdom); also accepts the factory's `--runInBand` verifier flag |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint on all source files |
| `npm run typecheck` | Check the JavaScript/JSX source with TypeScript (`tsc --noEmit`) |
| `npm run server` | Load `.env`, validate config, and start the API on port 3001 |

## Mock vs live

| Mode | How to start the API | Browser sign-in | Persistence | `/api/health` |
|------|----------------------|-----------------|-------------|---------------|
| Mock | `PACT_MOCK_AUTH=1 npm run server` | ISAAC / MAYA buttons on `/app` | In-memory Maps | `auth.mode: "mock"`, `mongo.mode: "memory"` |
| Live | `npm run server` (do **not** set `PACT_MOCK_AUTH=1`) | Auth0 Universal Login | MongoDB Atlas (`MONGODB_DB_NAME`) | `auth.mode: "live"`, `mongo.mode: "atlas"`, `mongo.connected: true/false` |

Keep `PACT_MOCK_AUTH=1` for deterministic tests. Live mode rejects `POST /api/auth/mock-login` and never trusts the mock buttons.

## Environment variables

Create a `.env` or `.env.local` file from `env-template.txt`. **Never commit real secrets, Auth0 client secrets, Atlas passwords, or full credentialed connection strings.**

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH0_DOMAIN` | Yes (live) | Auth0 tenant domain (e.g. `your-tenant.us.auth0.com`) |
| `AUTH0_CLIENT_ID` | Yes (live) | Auth0 SPA application client ID |
| `AUTH0_CLIENT_SECRET` | Yes (live), server only | Auth0 application client secret (SECRET) |
| `AUTH0_AUDIENCE` | Yes (live), server only | Auth0 API identifier. Recommended: `https://pact-api` |
| `AUTH0_SECRET` | Yes (live), server only | Long random session secret (SECRET) |
| `MONGODB_URI` | Yes (live), server only | MongoDB Atlas connection string (SECRET) |
| `MONGODB_DB_NAME` | Yes (live), server only | Database name (default in the template: `pact`) |
| `VITE_AUTH0_DOMAIN` | Yes (live browser) | Same tenant domain as `AUTH0_DOMAIN` |
| `VITE_AUTH0_CLIENT_ID` | Yes (live browser) | Same SPA client ID as `AUTH0_CLIENT_ID` |
| `VITE_AUTH0_AUDIENCE` | Yes (live browser) | Must match `AUTH0_AUDIENCE` so the SPA receives a JWT, not an opaque token |
| `VITE_AUTH0_CALLBACK_URL` | No | Defaults to `http://localhost:5173/callback` |
| `VITE_API_URL` | No | API base URL (defaults to `http://localhost:3001`) |
| `PORT` | No | Backend server port (default `3001`) |
| `PACT_MOCK_AUTH` | No | Set to `1` to skip live Auth0/Atlas and use ISAAC/MAYA + memory |

### AUTH0_AUDIENCE shape

The audience is the **Auth0 API Identifier**, not a random localhost URL.

- Recommended: `https://pact-api`
- Valid: any `https://…` API identifier you created in Auth0
- Invalid (common footgun): `https//localhost` — missing `:` after the scheme
- Do not use the SPA client ID as the audience

`npm run server` in live mode validates the audience and exits with a clear error if it looks malformed. No secret audience value is baked into the repo.

### Startup validation

`npm run server` without `PACT_MOCK_AUTH=1` loads `.env` / `.env.local`, validates the required server variables (including audience shape), and connects to Atlas before binding its port. If anything is missing or Mongo cannot be reached, it exits with an error that lists variable **names** only — connection strings and secrets are never printed.

The localStorage Vite demo remains runnable without backend credentials.

### Client-safe exposure

Only `VITE_`-prefixed variables are exposed to the browser bundle. `src/env.js` provides `getViteEnv()` and `clientEnvReady()`; server-only Auth0 and Mongo variables never enter the Vite bundle.

## Live Auth0 + Atlas QA

Use this when local operators already have tenant and cluster values in `.env`.

### 1. Auth0 application URLs

In the Auth0 SPA application:

| Setting | Value |
|---------|--------|
| Allowed Callback URLs | `http://localhost:5173/callback` |
| Allowed Logout URLs | `http://localhost:5173` |
| Allowed Web Origins | `http://localhost:5173` |
| Allowed Origins (CORS) | `http://localhost:5173` |

Create (or reuse) an Auth0 **API** whose Identifier is `https://pact-api` (or another stable identifier). Authorize the SPA application to request that audience. Copy the same identifier into both `AUTH0_AUDIENCE` and `VITE_AUTH0_AUDIENCE`.

### 2. Two demo Auth0 accounts

Create two users in the tenant (or use two existing social/db users), for example:

- User A: the challenger
- User B: the counterparty

Each first successful login upserts a Pact user keyed by the Auth0 `sub`. They become visible to each other on `GET /api/users` after both have signed in once.

### 3. Run live

From the repo root, with `.env` filled in and **`PACT_MOCK_AUTH` unset**:

```bash
npm install
npm run server
```

In a second terminal:

```bash
npm run dev
```

Confirm Atlas is actually connected:

```bash
curl -s http://localhost:3001/api/health
```

Expect `auth.mode` = `"live"` and `mongo.mode` = `"atlas"` with `mongo.connected` = `true`. If `mongo.mode` is still `"memory"`, the server is running with `PACT_MOCK_AUTH=1`.

### 4. Two-browser create / accept

1. Open `http://localhost:5173/app` as User A. Click **Continue with Auth0**. After callback (`/callback` → `/app`) you should see that user's desk and balance (10 SOL on first insert).
2. In a private window (or a second browser), sign in as User B the same way.
3. As User A, choose User B in the opponent list, write a challenge, create the pact.
4. As User B, accept (or decline). User A should see the status change; a third signed-in user must not see or accept that pact.
5. In Atlas, open database `MONGODB_DB_NAME` and confirm documents in `users`, `pacts`, and `transactions`.

Protected routes return **401** without a valid Auth0 access token. A third authenticated user who is not creator or opponent gets **403** on that pact.

### 5. Run mock instead

```bash
PACT_MOCK_AUTH=1 npm run server
npm run dev
```

Open `/app` and use **Sign in as ISAAC** / **Sign in as MAYA**. Data disappears when the API process exits.

## Backend

The API lives in `src/backend/server.js` (Node `http`, not Express). Vite proxies `/api` to `http://localhost:3001`.

Live Auth0 access tokens are verified against the tenant JWKS (`jose`) with the configured issuer and audience. The Auth0 `sub` is the stable application user id. New users start with 10 SOL. Users, pacts, and ledger entries persist in Atlas when live.

Authorization rules:

- Unauthenticated requests to protected routes → `401`
- List endpoints only return pacts the caller created or was invited to
- Non-participants cannot `GET` or `PATCH` another pair's pact → `403`
- Only the invited opponent can accept/decline a draft
- Only the creator can settle an accepted pact, and only once

## Project structure

```
src/
  App.jsx          # React Router shell with user switcher
  api.js           # Browser fetch helper for the Pact API
  env.js           # Safe env var parsing (no secrets)
  env.test.js      # Env validation tests
  index.css        # Global styles
  main.jsx         # Entry point + Auth0 provider when VITE_* is set
  store.jsx        # localStorage-backed state (PactProvider)
  store.test.jsx   # Store tests
  auth/
    AuthGate.jsx   # Wraps the SPA in Auth0Provider for live login
  backend/
    server.js      # HTTP API (mock memory or live Auth0 + Atlas)
    auth.js        # Mock bearer tokens and Auth0 JWT verification
    store.js       # In-memory users / pacts / ledger
    mongo.js       # Atlas connection + redacted errors
    mongo-store.js # Mongo persistence for users, pacts, transactions
  pages/
    Create.jsx     # Write a new pact (localStorage demo)
    Feed.jsx       # Pact board (localStorage demo)
    Home.jsx       # Landing page
    PactDetail.jsx # Individual pact view (localStorage demo)
    AuthenticatedPactDemo.jsx  # /app live Auth0 or mock ISAAC/MAYA
    Callback.jsx   # /callback Auth0 return route
```

## Migration notes

- **Auth0**: `/app` uses `@auth0/auth0-react` when client env is present and the API is live. The Auth0 `sub` maps to a stable user record.
- **Atlas**: live mode persists `users`, `pacts`, and `transactions` in `MONGODB_DB_NAME`.
- **localStorage demo**: the You/Friend pitch on `/` is unchanged and does not require backend credentials.
