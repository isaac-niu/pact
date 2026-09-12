# PACT — Person A UI

Sportsbook-ticket UI for a 1v1 accountability pact. Friend A writes a slip, Friend B matches a **virtual SOL** stake, A uploads a photo, a mocked referee stands the ticket, winner takes the pot.

This branch is **UI + mock data only**. No Auth0, Mongo, Gemini SDK, real Solana, ElevenLabs, or Vultr.

Two hardcoded desks live in the top-right pill: **You (ISAAC)** and **Friend (MAYA)**.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). No `.env` and no extra environment variables.

State lives in `localStorage` (`pact.demo.v2`). Photos stay in the browser as data URLs. First visit seeds three demo slips so the tape is never empty. **Me → Reset local desk** wipes and reseeds.

## 60-second click-through

1. **Home** — read the pitch. The loop is **Say it → stake it → prove it → share it**. Click **Write a slip**.
2. Leave the default title (“I'll upload a gym selfie”), criteria, 2 SOL stake, deadline, and opponent **Friend (MAYA)**. Click **Post to the board**. ISAAC’s bank drops by 2.00.
3. Still ISAAC, the slip is **OPEN**. Flip the switcher to **Friend**.
4. Click **Accept · 2.00 SOL**. MAYA matches. Pot locks at **4.00 SOL**.
5. Flip back to **You**. Upload any photo (gym selfie, cat, screenshot — the referee only checks that a file exists).
6. After ~1.2s the mocked desk returns **PASS**, a confidence number, a one-line rationale, and who takes the pot. ISAAC’s bank credits **+4.00**. Open **Me** to see success rate + ledger. Open **Tape** for posted / accepted / proved / won / lost marks.

That’s the product: accountability with a sportsbook ticket, not a platform.

## Integration holes for B / C

Pages talk to `src/api/pact.js` only. Swap these three functions later — signatures stay the same, defaults stay local:

| Function | Local behavior |
| --- | --- |
| `createPact({ title, criteria, stake, deadline, opponentId }, { actorId })` | Writes the slip, posts a `posted` event, deducts creator stake |
| `acceptPact(pactId, { actorId })` | Counterparty matches stake, pot locks |
| `submitEvidence(pactId, file, { actorId })` | Stores the photo, delays, mocked referee, pays the winner |

`src/api/referee.js` is the Gemini-shaped hole (`{ result, confidence, rationale }`). File present ⇒ eligible to pass.

## Routes

| Path | Screen |
| --- | --- |
| `/` | One-screen pitch + CTA |
| `/create` | Write slip |
| `/feed` | Event tape + slips |
| `/pact/:id` | Ticket, evidence, verdict |
| `/me` | Name, rate, virtual SOL bank, ledger |
