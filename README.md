# PACT — Person C (Gemini lane)

Social media for accountability, not attention.

**Loop:** say it → stake virtual SOL → prove it with a photo → share it.

This branch owns the referee. Person A's sportsbook UI is the surface. Person B still owns Auth0/Mongo; Person D still owns Vultr/ElevenLabs.

## What C shipped

1. Photo upload stays on the slip (data URL in the local desk; B can swap in GridFS later).
2. `POST /api/referee` sends the photo + written goal to **Gemini 2.5 Flash**.
3. Verdict on the ticket: `{ pass, confidence, rationale }` mapped to:
   - **≥ 0.8** — auto-resolve (pass → challenger, fail → friend)
   - **< 0.4** — friend wins
   - **middle** — friend-verify fallback (one Stand / Scratch button, not a committee)
4. Missing `GEMINI_API_KEY` or a Gemini error **falls back to mock** so A can still demo:
   - any real file → pass
   - `cat.jpg` / `dog.jpg` → fail
   - `blur.jpg` / `unsure.jpg` → friend-verify
5. Virtual pot moves on auto-resolve and on friend-verify.

Current Flash model for new AI Studio keys is `gemini-3.6-flash` (`GEMINI_MODEL`). `gemini-2.5-flash` is retired for new users.

## Run

```bash
cp .env.example .env   # paste GEMINI_API_KEY from the group chat
npm install
npm test
npm run dev
```

Open the URL Vite prints (`http://127.0.0.1:43127`). No second terminal — the referee is a Vite middleware so the key never hits the browser.

## 60-second click-through

1. **Write** a slip: “I'll upload a gym selfie”, 2 SOL, Friend (MAYA).
2. Switch to **Friend** → **Accept**.
3. Switch back to **You**. Upload a gym photo. Gemini should **PASS** and ISAAC takes the pot.
4. Repeat with a cat photo against a gym goal. Gemini should **FAIL** (or land in review). If the stamp says **REVIEW**, switch to Friend and tap **Friend: pass** or **Friend: fail** — the pot still moves.

## API Person A already calls

| Function | C behavior |
| --- | --- |
| `submitEvidence(pactId, file, { actorId })` | Stores the photo, calls Gemini, auto-settles or parks in `review` |
| `verifyPact(pactId, pass, { actorId })` | Friend-only. Settles a `review` slip and pays the pot |

`GET /api/config` → `{ features: { gemini: true/false } }` so the desk can tell Flash from the mock.

## Not this lane

Auth0, Mongo cluster, Vultr, ElevenLabs, DMs, groups, real SOL.
