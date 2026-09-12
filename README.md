# PACT — Person C (Gemini lane)

Social media for accountability, not attention.

**Loop:** say it → stake virtual SOL → prove it with a photo → share it.

This branch owns the referee. Person A's sportsbook UI is the surface. Person B still owns Auth0/Mongo; Person D still owns Vultr/ElevenLabs.

## What C shipped

1. Photo upload on the slip. The client shrinks the frame to 1280px JPEG before it hits the desk. Phone camera (`capture="environment"`) and drag-drop both work. Non-images and files over 8 MB are rejected.
2. `POST /api/referee` sends the photo + written goal to **Gemini Flash** with a JSON schema. Models cascade: `GEMINI_MODEL` → `gemini-3.6-flash` → `gemini-2.5-flash` → `gemini-2.0-flash`. A 429 does **not** walk the cascade (same billing).
3. Verdict on the ticket: `{ pass, confidence, rationale }` plus `band`, `model`, `fallbackReason`, `evidenceHash`. House rules:
   - **≥ 0.8** — auto-resolve (pass → challenger, fail → friend)
   - **< 0.4** — friend wins
   - **middle** — friend-verify (STAND / FADE, not a committee)
4. Missing `GEMINI_API_KEY`, a rejected key, or a Gemini error **falls back to mock** so A can still demo. The tape and the call board say so out loud:
   - any real file → pass
   - `cat.jpg` / `dog.jpg` → fail
   - `blur.jpg` / `unsure.jpg` → friend-verify
   Live Gemini **never** reads the filename.
5. Virtual pot moves on auto-resolve and on friend-verify.
6. If `MONGODB_URI` is set, proof lands in **GridFS** (`evidence` bucket) and the verdict is upserted on `pacts` by `clientId`. Atlas down → keep the in-browser data URL.
7. `GET /api/config` reports `geminiLive`, `geminiError`, `geminiModel`, and `mongo` so the desk tape can tell Flash from the mock.

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
3. Switch back to **You**. Drop a gym photo. The call board should **STAND** and ISAAC takes the pot.
4. Repeat with a cat photo against a gym goal. The board should **FADE** (or land in review). If the stamp says **REVIEW**, switch to Friend and tap **STAND** or **FADE** — the pot still moves.
5. Watch the top tape: `GEMINI LIVE` vs `MOCK DESK · credits depleted`.

## API Person A already calls

| Function | C behavior |
| --- | --- |
| `submitEvidence(pactId, file, { actorId })` | Shrinks the photo, calls Gemini, auto-settles or parks in `review` |
| `verifyPact(pactId, pass, { actorId })` | Friend-only. STAND / FADE a `review` slip and pays the pot |

## Not this lane

Auth0, Mongo cluster, Vultr, ElevenLabs, DMs, groups, real SOL.
