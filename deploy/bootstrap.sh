#!/usr/bin/env bash
# Run ON the Vultr box after files are in /opt/pact
set -euo pipefail

APP=/opt/pact
cd "$APP"

if [[ ! -f package.json ]]; then
  echo "No package.json in $APP" >&2
  exit 1
fi

# Public Auth0 client ids for the SPA. Vite only inlines VITE_* (not AUTH0_SECRET).
if [[ -f "$APP/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "$APP/.env"
  set +a
fi
export MONGODB_DB_NAME="${MONGODB_DB_NAME:-${MONGO_DB_NAME:-pact}}"
export VITE_AUTH0_DOMAIN="${VITE_AUTH0_DOMAIN:-${AUTH0_DOMAIN:-}}"
export VITE_AUTH0_CLIENT_ID="${VITE_AUTH0_CLIENT_ID:-${AUTH0_CLIENT_ID:-}}"
export VITE_AUTH0_AUDIENCE="${VITE_AUTH0_AUDIENCE:-${AUTH0_AUDIENCE:-}}"
if [[ -n "${PUBLIC_URL:-}" ]]; then
  public="${PUBLIC_URL%/}"
  export VITE_AUTH0_CALLBACK_URL="${VITE_AUTH0_CALLBACK_URL:-${public}/callback}"
  export VITE_AUTH0_LOGOUT_URL="${VITE_AUTH0_LOGOUT_URL:-${public}}"
  export VITE_API_URL="${VITE_API_URL:-${public}}"
fi
# Person B live API needs these; desk (Person D) uses MONGO_DB_NAME.
if [[ -f "$APP/.env" ]] && ! grep -q '^MONGODB_DB_NAME=' "$APP/.env"; then
  umask 077
  printf '\nMONGODB_DB_NAME=%s\n' "$MONGODB_DB_NAME" >> "$APP/.env"
fi

# vite lives in devDependencies — do not let NODE_ENV=production skip it.
NPM_CONFIG_PRODUCTION=false npm ci
npm run build
npm prune --omit=dev
export NODE_ENV=production

install -m 644 "$APP/deploy/pact.service" /etc/systemd/system/pact.service
install -m 644 "$APP/deploy/nginx.conf" /etc/nginx/sites-available/pact
ln -sfn /etc/nginx/sites-available/pact /etc/nginx/sites-enabled/pact
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl daemon-reload
systemctl enable --now pact
systemctl restart pact
systemctl reload nginx || systemctl restart nginx

if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null || true
fi

sleep 1
curl -fsS http://127.0.0.1:3000/api/health
echo
curl -fsS http://127.0.0.1:3000/api/auth/health || echo "auth_health skipped"
echo
curl -fsS -o /dev/null -w "nginx_home %{http_code}\n" http://127.0.0.1/ 
echo "deploy ok"
