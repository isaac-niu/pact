# PACT

Social media for accountability, not attention.

**Loop:** say it → stake virtual SOL → prove it with a photo → share it.

Person A owns the sportsbook desk UI. Person B owns Auth0 + Mongo API. Person C owns the Gemini referee and GridFS proof. Person D owns Vultr deploy and ElevenLabs.

If Mongo or Gemini env vars are missing, the desk still boots on `localStorage` and the mock referee.

## Quick start (laptop)

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. No `.env` required for the local desk. Switch **You (ISAAC)** / **Friend** in the top-right.

Optional second terminal for the Person D Node desk (Vite proxies `/api/desk` and `/healthz`):

```bash
npm run dev:server
npm run dev
```

Production-style (what Vultr runs):

```bash
npm run build
npm start
# http://127.0.0.1:3000
```

## 60-second click-through

1. **Write** a slip: “I'll upload a gym selfie”, 2 SOL, Friend.
2. Switch to **Friend** → **Accept**.
3. Switch back to **You**. Upload a gym photo. Gemini (or mock) should **PASS** and ISAAC takes the pot.
4. Repeat with a cat photo against a gym goal. Fail or **REVIEW**. If **REVIEW**, switch to Friend and tap **Friend: pass** or **Friend: fail**.

## Routes

| Path | Screen |
| --- | --- |
| `/` | Pitch |
| `/create` | Write slip (signed-in: challenge a real Auth0 friend) |
| `/feed` | Event tape + slips (signed-in: includes live 1v1s) |
| `/pact/:id` | Ticket, evidence, verdict (Gemini upload on accepted live slips) |
| `/me` | Profile, rate, virtual SOL bank |
| `/app` | Authenticated Auth0 / mock ISAAC-FRIEND desk |
| `/callback` | Auth0 return route |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite on `localhost:5173` (Gemini referee middleware in-process) |
| `npm run dev:server` | Person D desk + announcer on port 3000 |
| `npm start` | Production Node server (static `dist` + API) |
| `npm run build` | Production client build |
| `npm run preview` | Preview the production build |
| `npm run test` | Vitest (jsdom) plus server tests |
| `npm run server` | Person B Auth0/Mongo API on port 3001 |
| `npm run smoke` | Deploy smoke script |
| `npm run seed` | Demo seed (`DEMO_SEED=true`) |
| `npm run soft-reset` | One-shot Atlas cleanup (`SOFT_RESET=1`, `MONGODB_URI`) — test-named groups/pacts only |

## Person C referee

`POST /api/referee` sends the photo + written goal to **Gemini Flash** (`gemini-3.6-flash`). Verdict bands:

- **≥ 0.8** — auto-resolve (pass → challenger, fail → friend)
- **< 0.4** — friend wins
- **middle** — friend-verify fallback

A working `GEMINI_API_KEY` returns `source: "gemini"`. If the key is set but Flash errors (credits, HTTP, parse, network), the desk returns `source: "gemini-error"` — not the dummy 0.91 pass. `GET /api/config` exposes `features.lastGeminiError` (kind + status only; never the key). No key / no image still uses the mock so a laptop demo can click through.

If `MONGODB_URI` is set, proof lands in **GridFS** (`evidence` bucket) and the verdict is upserted on `pacts`. Atlas down → keep the in-browser data URL.

## Person B Auth0 + Atlas

`/app` is the authenticated stack:

| Mode | How to start the API | Browser sign-in | Persistence |
|------|----------------------|-----------------|-------------|
| Mock | `PACT_MOCK_AUTH=1 npm run server` | ISAAC / FRIEND buttons on `/app` | In-memory Maps |
| Live | `npm run server` (do **not** set `PACT_MOCK_AUTH=1`) | Auth0 Universal Login | MongoDB Atlas |

Create `.env` from `.env.example` or `env-template.txt`. **Never commit real secrets.**

## Person D deploy

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — nginx, systemd, Vultr, env names
- [docs/DEMO.md](docs/DEMO.md) — 3-minute judging script + fallbacks
