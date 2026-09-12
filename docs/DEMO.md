# 3-minute judging demo

**Pitch line:** Social media for accountability, not attention.

**Live URL:** this agent did not receive `VULTR_HOST` / SSH. After Person D SSHs to the box, put that URL here and in Auth0 callbacks. Until then, demo on `npm run dev` or `npm start`.

**Loop (say this while clicking):** Say it → stake it → prove it → share it.

Do **not** say Venmo + Twitter + gambling. Stakes are **virtual SOL**.

Use two demo users already in the top-right pill: **You (ISAAC)** and **Friend (MAYA)**. No Auth0 required for this POC.

---

## 0:00–0:20 — Pitch + board

Open the live URL (or localhost). Home: “Bet on the version of you that shows up.”

**Say:** “This is a social network built around doing the thing you said you’d do. You put a pact on the board, a friend matches a virtual stake, you prove it with a photo, a referee calls it, and the result is the post.”

Click **View the board**. First visit is pre-seeded so judges never see an empty feed:

- Settled gym selfie (ISAAC won)
- Live LeetCode slip
- Open 5K slip

Click the settled gym slip so they see a ticket, not a form.

---

## 0:20–1:10 — Say it / stake it

Click **Write slip** (or **Open a pact**).

Leave the default challenge or type: “I’ll upload a gym selfie.” Stake **2** SOL. Click **Post to the board**.

**Say:** “ISAAC just posted a 1v1 commitment. MAYA has to accept before the pot locks.”

Switcher → **Friend**. Click **Accept · 2.00 SOL**. Pot shows **4.00 SOL**.

**Say:** “Both sides matched virtual SOL. No wallet, no chain — the ledger is the ticket.”

---

## 1:10–2:10 — Prove it

Switcher → **You**. Upload any photo (gym selfie preferred; a cat still demos the loop). Click **Send to referee**.

**If Gemini is wired (Person C):** the verdict is real vision output `{pass, confidence, rationale}`.

**If Gemini is not wired (current POC):** a mocked referee still returns pass/fail + rationale in ~1.4s. **Say:** “Tonight the desk is a local referee. Same ticket — tomorrow this is Gemini Flash on the photo plus the written goal.”

Do **not** apologize at length. Show the verdict card.

---

## 2:10–2:40 — Share it

**Say:** “ISAAC takes the pot. That’s the post: not a selfie for likes — a settled pact.”

Go back to **Board**. Point at the new settled slip in the feed.

If the announcer key is present, the desk reads the rationale + winner. Mute/replay are on the ticket.

**If ElevenLabs is silent:** ignore it. One line: “Voice is optional; the ticket is the product.”

---

## 2:40–3:00 — What’s next (one slide, don’t build it)

“Same loop with Auth0 login, Mongo, a live Vultr URL, Gemini on proof, virtual SOL in the database. Groups, DMs, real money — not this round.”

Stop talking. Ask for questions.

---

## Backup paths (practice these once)

**Auth0 login fails / not built:** stay on the ISAAC/MAYA switcher. That is the demo.

**No Gemini key:** mocked referee. Have a photo already on disk. Do not wait on Wi‑Fi to an AI studio page.

**Gemini key set but Flash errors:** honest `gemini-error` (not a dummy pass). Check `GET /api/config` → `features.lastGeminiError`.

**ElevenLabs fails / no key:** the slip still settles. Do not refresh hoping for audio.

**Empty board:** first load should seed. If someone already used this browser, click **Write slip** and run the loop live — that’s stronger anyway.

**Upload / referee button missing:** you are the wrong user. Challenger uploads; counterparty accepts. Flip the pill.

**Live URL down:** `npm run dev` on a laptop, same clicks. Person D: `systemctl status pact` and `curl localhost/api/health` on the box.

**Wrong story:** if a judge asks about Solana on-chain, be honest: virtual SOL in the app (and Mongo when B lands). Do not say “we would have used Solana.”

---

## Demo accounts

| Pill | Handle | Role |
| --- | --- | --- |
| You | ISAAC | Challenger (writes slip, uploads proof) |
| Friend | MAYA | Counterparty (accepts, matches stake) |

When Auth0 exists: two seeded logins from Person B. Until then, the pill is the two accounts.

---

## Presenter checklist (T-minus 10)

- [ ] Public URL opens on a **phone** and a **laptop**
- [ ] `/api/health` returns `"ok": true`
- [ ] Photo file sitting on the demo machine
- [ ] Practice once with Friend accepted + You upload
- [ ] Know the one-sentence Gemini and ElevenLabs fallbacks
- [ ] Auth0 callback includes the Vultr origin **if** login is live
