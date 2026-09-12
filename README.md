# PACT

Social media for accountability, not attention.

1v1 loop: write a pact, a friend matches **virtual SOL**, upload a photo, a referee calls it, winner takes the pot. Pitch that loop — not Venmo + Twitter + gambling.

Person A owns the sportsbook UI (`src/`). Person D owns deploy + a Node desk that can persist to Mongo and optionally call Gemini. If Mongo is down, the UI falls back to `localStorage`.

## Run (laptop)

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. Switch **You (ISAAC)** / **Friend (MAYA)** in the top-right.

With a local server (Vite proxies `/api`):

```bash
npm run dev:server   # terminal 1
npm run dev          # terminal 2
```

Production-style (what Vultr runs):

```bash
npm run build
npm start
# http://127.0.0.1:3000
```

## Lane docs

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — nginx, systemd, Vultr, env names
- [docs/DEMO.md](docs/DEMO.md) — 3-minute judging script + fallbacks

## Routes

| Path | Screen |
| --- | --- |
| `/` | Pitch |
| `/create` | Write slip |
| `/feed` | Event tape + slips |
| `/pact/:id` | Ticket, evidence, verdict |
| `/me` | Profile, rate, virtual SOL bank |

## Swap surface (`src/api/pact.js`)

Pages import only this module. Local mock is the default. If `/api/config` says Mongo is up, the same functions talk to the Node desk.

| Function | Behavior |
| --- | --- |
| `createPact({ title, criteria, stake, deadline, opponentId }, { actorId })` | Post slip, lock creator stake |
| `acceptPact(pactId, { actorId })` | Friend matches stake |
| `submitEvidence(pactId, file, { actorId })` | Photo → Gemini or mock referee → payout or friend-verify |
| `verifyPact(pactId, { pass }, { actorId })` | Friend-verify fallback when Gemini is unsure |

`src/api/referee.js` remains the in-browser mock (gym.jpg pass, cat.jpg fail, blur.jpg review). Server Gemini lives in `server/gemini.js` (`gemini-3.6-flash`).

## Scripts

```bash
npm test
npm run build
npm start
BASE_URL=http://127.0.0.1:3000 npm run smoke
DEMO_SEED=true npm run seed
```
