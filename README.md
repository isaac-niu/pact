# PACT

Local proof of concept for a 1v1 self-improvement challenge. Friend A writes a pact, Friend B accepts and matches a fake SOL stake, A uploads a photo, a mocked referee calls pass/fail, and the pot is marked paid. No Auth0, MongoDB, Solana, Gemini, wallets, or API keys.

## Quick start

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
| `npm run server` | Validate server configuration and start the local API on port 3001 |

## Environment variables

Create a `.env` or `.env.local` file from the `env-template.txt` template. **Never commit real secrets.**

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH0_DOMAIN` | Yes | Auth0 tenant domain (e.g. `myapp.auth0.com`) |
| `AUTH0_CLIENT_ID` | Yes | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Yes, server only | Auth0 application client secret (SECRET) |
| `AUTH0_AUDIENCE` | Yes, server only | Auth0 API audience |
| `AUTH0_SECRET` | Yes, server only | Auth0 session secret (SECRET) |
| `MONGODB_URI` | Yes, server only | MongoDB Atlas connection string (SECRET) |
| `MONGODB_DB_NAME` | Yes, server only | MongoDB database name |
| `VITE_AUTH0_DOMAIN` | No, client only | Browser-safe Auth0 domain for the future login UI |
| `VITE_AUTH0_CLIENT_ID` | No, client only | Browser-safe Auth0 client ID for the future login UI |
| `VITE_API_URL` | No, client only | API base URL (defaults to `http://localhost:3001`) |
| `PORT` | No | Backend server port (default `3001`) |

### Startup validation

`npm run server` validates the required server variables before binding its port. If any are missing, it exits with a clear error that lists variable names only; no secret value is printed. The existing localStorage Vite demo deliberately remains runnable without backend credentials during the migration.

### Client-safe exposure

Only `VITE_`-prefixed variables are exposed to the browser bundle. The `src/env.js` module provides safe access through `getViteEnv()` and `clientEnvReady()`; server-only Auth0 and Mongo variables are never exposed to Vite.

## Backend

A stub Express server lives in `src/backend/server.js`. Start it with:

```bash
npm run server
```

It provides a health check at `GET /api/health` and stub pact endpoints. Wire up Atlas and Auth0 when ready.

## Project structure

```
src/
  App.jsx          # React Router shell with user switcher
  env.js           # Safe env var parsing (no secrets)
  env.test.js      # Env validation tests
  index.css        # Global styles
  main.jsx         # Entry point
  store.jsx        # localStorage-backed state (PactProvider)
  store.test.jsx   # Store tests
  backend/
    server.js      # Express stub (Auth0 + Atlas migration target)
  pages/
    Create.jsx     # Write a new pact
    Feed.jsx       # Pact board
    Home.jsx       # Landing page
    PactDetail.jsx # Individual pact view
```

## Migration notes

- **Auth0**: Replace the hardcoded `USERS` array with Auth0 session management. The `src/env.js` module validates `AUTH0_DOMAIN` and `AUTH0_CLIENT_ID` at startup.
- **Atlas**: Replace `localStorage` persistence with MongoDB. The `src/backend/server.js` stub is the target for the data layer.
- **localStorage demo**: The current `localStorage`-backed behavior is preserved until the server-backed replacement is usable. The `PactProvider` in `src/store.jsx` continues to work independently.
