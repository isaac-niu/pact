# PACT

Social media for accountability, not attention.

Local 1v1 loop: write a pact, a friend matches a **virtual SOL** stake, upload a photo, referee calls pass/fail, winner takes the pot. Pitch the loop — not Venmo + Twitter + gambling.

## Run (laptop)

```bash
cp .env.example .env   # empty keys are fine
npm install
npm run dev
```

Open `http://localhost:5173`. State is `localStorage`. Switch **You / Friend** in the top-right (ISAAC vs MAYA). A first visit loads sample slips so the board is not empty.

Production-style local server (what Vultr runs):

```bash
npm run build
npm start
# http://127.0.0.1:3000
```

## Lane docs

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — nginx, systemd, Vultr, env names
- [docs/DEMO.md](docs/DEMO.md) — 3-minute judging script + fallbacks

## What’s in this POC vs later

| Now | Person B / C / later |
| --- | --- |
| User switcher | Auth0 |
| localStorage | MongoDB Atlas |
| Mocked referee | Gemini Flash on the photo |
| Virtual SOL on the ticket | Virtual SOL ledger |
| Optional ElevenLabs on settle | Same, if `ELEVENLABS_API_KEY` is set |
| Vultr + nginx | Live URL for judges |

## Scripts

```bash
npm test              # env/announcer unit checks
npm run build
npm start
BASE_URL=http://127.0.0.1:3000 npm run smoke
DEMO_SEED=true npm run seed   # prints fixtures; will not write production Mongo
```
