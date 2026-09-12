# 3-minute judging demo

**Pitch line:** Social media for accountability, not attention.

**Live URL:** the Vultr HTTPS origin Person D posted in Slack (hard-refresh). Do not commit the IP.

**Loop (say this while clicking):** Say it → stake it → prove it → share it.

Do **not** say Venmo + Twitter + gambling. Stakes are **virtual SOL** in Mongo, not on-chain. `/wallet` is a separate Solana Wallet Standard / devnet page.

There is **no You / Friend pill** on `/` or Tape. Tape’s extra control is **Sit the rail** (spectator). The 3-minute Gemini loop is two **Auth0** accounts.

---

## 0:00–0:20 — Pitch + board

Open the live URL. Home: “Bet on the version of you that shows up.”

**Say:** “This is a social network built around doing the thing you said you’d do. You put a pact on the board, a friend matches a virtual stake, you prove it with a photo, Gemini calls it, and the result is the post.”

Click **Open the tape**. Seeded tape is settled gym only. Click that ticket so they see a slip, not a form.

---

## 0:20–1:10 — Say it / stake it

**Sign in** on `/` (top-right). Click **Write**. Leave “I’ll upload a gym selfie,” stake **2** SOL.

Under Friend, pick your **signed-in friend** (not Group, not “This desk · FRIEND”). **Post to the board.**

**Say:** “That’s a live 1v1 in Atlas. Friend has to accept before the pot locks.”

Switch Auth0 account (or a second browser). Open **Pact app** (`/app`) or the ticket. **Accept**. Pot **4.00** virtual SOL.

**Say:** “Both sides matched virtual SOL. No chain — the ledger is the ticket.”

---

## 1:10–2:10 — Prove it

Back on the challenger account. **Tape** → the live ticket → upload a gym photo → **Send to referee**.

**Say:** “Gemini Flash grades the photo against the written goal.” Verdict `source: gemini`. If Flash errors, it is `gemini-error`, not a dummy pass.

If ElevenLabs speaks, let it. If silent: “Voice is optional; the ticket is the product.”

---

## 2:10–2:40 — Share it

**Say:** “That’s the post: not a selfie for likes — a settled pact.” Point at **Share** / the ticket card.

Optional 10s: **People** (two Auth0 users), **Crew**, or **Sit the rail** as a spectator. Do not wait on IFM (no Hugging Face token).

---

## 2:40–3:00 — What’s next

“Same loop: Auth0, Mongo on Atlas, Gemini on proof, virtual SOL in the database, this Vultr URL. Real money and on-chain SOL — not this round.”

Stop talking. Ask for questions.

---

## Backup paths (practice these once)

**Auth0 login fails:** you cannot Accept as Friend in one tab. Do not hunt for You/Friend chips. Use `npm run dev` only if the live URL is down **and** you have two Auth0 logins locally.

**No friends in the Write dropdown:** both accounts must have signed in once. **People** → add/accept friend, then Write again.

**No Gemini key / no image:** mock referee. Have a photo on disk.

**Gemini key set but Flash errors:** honest `gemini-error`. `GET /api/config` → `features.lastGeminiError`.

**ElevenLabs fails / no key:** the slip still settles.

**Upload button missing:** you are the wrong account. Challenger uploads; counterparty accepts.

**Live URL down:** Person D: `systemctl status pact` and `curl -k https://127.0.0.1/api/health` on the box.

**Judge asks about Solana:** virtual SOL on the desk; `/wallet` is a separate devnet demo. Do not say “we would have used Solana.”

---

## Demo accounts

| Role | How |
| --- | --- |
| Challenger | Auth0 account that writes the slip and uploads proof |
| Friend | Second Auth0 account that accepts on `/app` or the ticket |

Unsigned Write still posts a localStorage desk slip to FRIEND. Tape will not let you accept that slip in one tab.

---

## Presenter checklist (T-minus 10)

- [ ] Live HTTPS URL opens on a **phone** and a **laptop**
- [ ] `/api/health` returns `"ok": true` and `"mongo": true`
- [ ] Two Auth0 accounts already friends on **People**
- [ ] Photo file sitting on the demo machine
- [ ] Practice once: Write → friend Accept → challenger upload → Gemini
- [ ] Know the one-sentence Gemini and ElevenLabs fallbacks
