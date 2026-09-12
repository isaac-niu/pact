# PACT

Local proof of concept for a 1v1 self-improvement challenge. Friend A writes a pact, Friend B accepts and matches a fake SOL stake, A uploads a photo, a mocked referee calls pass/fail, and the pot is marked paid. No Auth0, MongoDB, Solana, Gemini, wallets, or API keys.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

State lives in `localStorage`. Photos stay in the browser as object URLs. Two hardcoded demo users — **You (ISAAC)** and **Friend (MAYA)** — switch from the top-right pill.

## 60-second demo

1. Home: read the pitch. Click **Open a pact**.
2. Leave the default challenge (“I'll upload a gym selfie”) and a 2 SOL stake. Click **Post to the board**.
3. You are still ISAAC, so the slip is waiting. Flip the switcher to **Friend**.
4. Click **Accept · 2.00 SOL**. The pot is now 4.00 SOL.
5. Flip back to **You**. Upload any photo (a gym selfie, a cat, a screenshot — the referee only checks that a file exists).
6. Click **Send to referee**. After ~1.4s you get pass/fail, a confidence number, a one-line rationale, and who takes the pot.

That’s the product: accountability with a sportsbook ticket, not a platform.
