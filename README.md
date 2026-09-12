# PACT

Social media for accountability, not attention.

**Loop:** say it → stake virtual SOL → prove it with a photo → share it.

Person A owns the sportsbook desk UI. Person B owns Auth0 + Mongo API. Person C owns the Gemini referee and GridFS proof. Person D owns Vultr deploy and ElevenLabs.

## Quick start (desk + mock referee)

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. No `.env` required. State lives in `localStorage`. Photos stay in the browser. Missing `GEMINI_API_KEY` falls back to the mock referee so the desk still boots.

Two hardcoded desks live in the top-right pill: **You (ISAAC)** and **Friend (MAYA)**.

## 60-second click-through

1. **Write** a slip: “I'll upload a gym selfie”, 2 SOL, Friend (MAYA).
2. Switch to **Friend** → **Accept**.
3. Switch back to **You**. Upload a gym photo. Gemini (or mock) should **PASS** and ISAAC takes the pot.
4. Repeat with a cat photo against a gym goal. Fail or **REVIEW**. If **REVIEW**, switch to Friend and tap **Friend: pass** or **Friend: fail**.

## Routes

| Path | Screen |
| --- | --- |
| `/` | Pitch |
| `/create` | Write slip |
| `/feed` | Event tape + slips |
| `/pact/:id` | Ticket, evidence, verdict |
| `/me` | Profile, rate, virtual SOL bank |
| `/app` | Authenticated Auth0 / mock ISAAC-MAYA desk |
| `/callback` | Auth0 return route |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite on `localhost:5173` (Gemini referee middleware in-process) |
| `npm run build` | Production client build |
| `npm run preview` | Preview the production build |
| `npm run test` | Vitest (jsdom) plus Person C server tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run server` | Person B Auth0/Mongo API on port 3001 |

## Person C referee

`POST /api/referee` sends the photo + written goal to **Gemini Flash** (`gemini-3.6-flash`). Verdict bands:

- **≥ 0.8** — auto-resolve (pass → challenger, fail → friend)
- **< 0.4** — friend wins
- **middle** — friend-verify fallback

If `MONGODB_URI` is set, proof lands in **GridFS** (`evidence` bucket) and the verdict is upserted on `pacts`. Atlas down → keep the in-browser data URL.

`GET /api/config` → `{ features: { gemini, mongo } }`.

## Person B Auth0 + Atlas

There is a second stack at `/app`:

| Mode | How to start the API | Browser sign-in | Persistence |
|------|----------------------|-----------------|-------------|
| Mock | `PACT_MOCK_AUTH=1 npm run server` | ISAAC / MAYA buttons on `/app` | In-memory Maps |
| Live | `npm run server` (do **not** set `PACT_MOCK_AUTH=1`) | Auth0 Universal Login | MongoDB Atlas |

Create `.env` from `.env.example` or `env-template.txt`. **Never commit real secrets.**

Vite proxies leftover `/api` calls to `http://localhost:3001` so `/app` can talk to Person B’s API. Referee routes stay on the Vite middleware.

See `env-template.txt` for Auth0 audience shape, callback URLs, and live QA steps.
