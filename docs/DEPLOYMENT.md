# Deployment (Person D)

Hackathon-simple: Vite build + Node on `127.0.0.1:3000` + nginx on port 80. No Docker required on Vultr (Dockerfile is only for local simulation).

## What runs where

- **nginx :80 / :443** — public HTTP (ACME) + HTTPS reverse-proxy to Node
- **Let's Encrypt** — trusted cert for the public IP (short-lived, auto-renewed) so Auth0 can use HTTPS callbacks
- **systemd `pact`** — `node server/index.js`
- **SPA** — `dist/` from `npm run build`
- **API** — `/api/health`, `/api/config`, `POST /api/announce` (ElevenLabs, optional)

Auth0 / Mongo / Gemini stay Person B/C. This lane does not require them for the site to boot.

## Required secrets (names only)

Put these in `/opt/pact/.env` on the server (mode `600`). Never commit them.

| Name | Required to boot | Owner |
| --- | --- | --- |
| `PORT` | no (default 3000) | D |
| `BIND_HOST` | no (use `127.0.0.1` on Vultr) | D |
| `NODE_ENV` | no (`production` via systemd) | D |
| `ELEVENLABS_API_KEY` | no | D |
| `ELEVENLABS_VOICE_ID` | no (default Adam `pNInz6obpgDQGcFmaJgB`; library voices 402 on free) | D |
| `ELEVENLABS_MODEL_ID` | no (default `eleven_turbo_v2_5`) | D |
| `GEMINI_API_KEY` | no for D; C needs it | C |
| `AUTH0_DOMAIN` / `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` / `AUTH0_AUDIENCE` | no for D; B needs them | B |
| `MONGODB_URI` | no to boot static site; needed for shared desk | B/D |
| `MONGO_DB_NAME` | no (default `pact`) | B/D |
| `PUBLIC_URL` | no; add to Auth0 callbacks when B is live | B/D |

## First-time Vultr (Debian 12)

Box already has Git, Node 22, npm. From a machine that has `VULTR_HOST`, `VULTR_USER`, and either `VULTR_SSH_PRIVATE_KEY` or `~/.ssh/vultr_deploy`:

```bash
chmod +x deploy/push.sh deploy/bootstrap.sh deploy/write-server-env.sh
./deploy/push.sh
# copies keys already in this shell onto the box (never git):
./deploy/write-server-env.sh
```

That copies the repo to `/opt/pact` (excluding `.env` and `node_modules`), installs nginx, runs `npm ci` **including devDependencies** so Vite can build, prunes them, enables systemd + nginx.

Create the env file **once** (SSH, do not paste into git):

```bash
ssh -i ~/.ssh/vultr_deploy "$VULTR_USER@$VULTR_HOST"
umask 077
cat >/opt/pact/.env <<'EOF'
PORT=3000
BIND_HOST=127.0.0.1
DEMO_SEED=false
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_AUDIENCE=https://localhost
AUTH0_SECRET=
MONGODB_URI=
MONGO_DB_NAME=pact
MONGODB_DB_NAME=pact
PUBLIC_URL=https://YOUR_PUBLIC_IP
# Do not set PACT_MOCK_AUTH=1 on Vultr — People will 401 Auth0 tokens.
EOF
# NODE_ENV=production is set by systemd — do not put it in .env (Vite will warn).
systemctl restart pact
```

Then:

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1/
# from your laptop (after TLS):
curl -fsS https://YOUR_PUBLIC_IP/api/health
```

`deploy/bootstrap.sh` issues a Let's Encrypt **IP certificate** (6-day, renewed twice daily) and sets `PUBLIC_URL=https://YOUR_PUBLIC_IP`. Add these to the Auth0 SPA **Allowed Callback URLs**, **Logout URLs**, and **Web Origins** (keep localhost for laptops):

- `https://YOUR_PUBLIC_IP/callback`
- `https://YOUR_PUBLIC_IP`
- `http://localhost:5173`
- `http://localhost:5173/callback`

The API identifier (`AUTH0_AUDIENCE`) stays whatever Person B configured (often `https://localhost`). That is not the site URL.

## Repeat deploy after a merge

On the box:

```bash
cd /opt/pact
git fetch origin
git checkout main
git pull --ff-only origin main
bash deploy/bootstrap.sh
```

If you are still deploying this lane branch before merge:

```bash
git fetch origin
git checkout cursor/deploy-vultr-e224
git pull --ff-only origin cursor/deploy-vultr-e224
bash deploy/bootstrap.sh
```

Or from a laptop: `./deploy/push.sh` again. It does **not** overwrite `/opt/pact/.env`.

## Local production simulation

```bash
cp .env.example .env   # leave keys empty
npm ci
npm test
npm run build
BIND_HOST=127.0.0.1 PORT=3000 npm start
# other terminal
BASE_URL=http://127.0.0.1:3000 npm run smoke
```

Docker (optional):

```bash
docker build -t pact .
docker run --rm -p 3000:3000 -e BIND_HOST=0.0.0.0 pact
```

## Dev with announcer proxy

```bash
# terminal 1
npm run dev:server
# terminal 2
npm run dev
```

Vite proxies `/api` to `:3000`. Without the server, the UI still works; announcer quietly no-ops.

## Health

`GET /api/health` returns booleans only:

```json
{ "ok": true, "service": "pact", "features": { "auth0": false, "mongo": false, "gemini": false, "elevenlabs": false } }
```

Missing ElevenLabs / Mongo / Auth0 must not crash the process.

## Seed safety

Browsers with empty `localStorage` get sample slips (ISAAC vs MAYA). That is per-browser, not a server database.

`npm run seed` **refuses** unless `DEMO_SEED=true`, and still refuses in `NODE_ENV=production` unless `DEMO_SEED_PRODUCTION=true`. It does not write Mongo.

If the homepage times out from the internet but `curl localhost` works on the box, **UFW is probably allowing only SSH**. `deploy/bootstrap.sh` opens 80/tcp (and 443). To fix a box by hand:

```bash
ufw allow 80/tcp
ufw status
```

Do not expose Node's `:3000` publicly.

```bash
systemctl stop pact
# restore previous /opt/pact from git
git checkout <good-sha>
bash deploy/bootstrap.sh
```

## Cut if time is gone

Skip ElevenLabs. Skip Docker. Keep nginx + systemd + `npm run build`.
