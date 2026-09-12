#!/usr/bin/env bash
# Issue / renew a trusted certificate for the public Vultr IP (or TLS_HOST)
# and point PUBLIC_URL at https://… so Auth0 callbacks are HTTPS.
set -euo pipefail

APP="${APP:-/opt/pact}"
NAME_FILE=/etc/pact/tls-name
CERTBOT=/opt/certbot/bin/certbot
WEBROOT=/var/www/certbot

mkdir -p "$WEBROOT" /etc/pact /opt/certbot

load_env() {
  if [[ -f "$APP/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    . "$APP/.env"
    set +a
  fi
}

public_host_from_url() {
  local url="${1:-}"
  url="${url#http://}"
  url="${url#https://}"
  url="${url%%/*}"
  url="${url%%:*}"
  printf '%s' "$url"
}

detect_tls_name() {
  if [[ -n "${TLS_HOST:-}" ]]; then
    printf '%s' "$TLS_HOST"
    return
  fi
  if [[ -n "${PACT_DOMAIN:-}" ]]; then
    printf '%s' "$PACT_DOMAIN"
    return
  fi
  local from_url
  from_url="$(public_host_from_url "${PUBLIC_URL:-}")"
  if [[ -n "$from_url" ]]; then
    printf '%s' "$from_url"
    return
  fi
  curl -4 -fsS --max-time 8 https://api.ipify.org || hostname -I | awk '{print $1}'
}

is_ipv4() {
  [[ "$1" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
}

upsert_env() {
  local key="$1"
  local value="$2"
  python3 - "$APP/.env" "$key" "$value" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
key, value = sys.argv[2], sys.argv[3]
text = path.read_text() if path.exists() else ""
lines = text.splitlines()
found = False
out = []
for line in lines:
    stripped = line.strip()
    if stripped.startswith(key + "=") or stripped.startswith(key + " ="):
        out.append(f"{key}={value}")
        found = True
    else:
        out.append(line)
if not found:
    if out and out[-1] != "":
        out.append("")
    out.append(f"{key}={value}")
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text("\n".join(out) + "\n")
path.chmod(0o600)
PY
}

ensure_certbot() {
  if [[ -x "$CERTBOT" ]] && "$CERTBOT" --version 2>/dev/null | grep -Eq 'certbot [5-9]\.|certbot [1-9][0-9]'; then
    return
  fi
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq python3-venv python3-pip gcc python3-dev libffi-dev libssl-dev >/dev/null
  python3 -m venv /opt/certbot
  /opt/certbot/bin/pip install -q --upgrade pip
  /opt/certbot/bin/pip install -q 'certbot>=5.4'
}

issue_cert() {
  local name="$1"
  local live="/etc/letsencrypt/live/${name}/fullchain.pem"
  if [[ -f "$live" ]]; then
    echo "tls: certificate already present for this host"
    "$CERTBOT" renew --quiet --deploy-hook "$APP/deploy/reload-nginx.sh" || true
    return
  fi
  local args=(
    certonly
    --non-interactive
    --agree-tos
    --register-unsafely-without-email
    --webroot
    --webroot-path "$WEBROOT"
    --deploy-hook "$APP/deploy/reload-nginx.sh"
  )
  if is_ipv4 "$name"; then
    args+=(--preferred-profile shortlived --ip-address "$name")
  else
    args+=(-d "$name")
  fi
  echo "tls: requesting Let's Encrypt certificate"
  "$CERTBOT" "${args[@]}"
}

load_env
NAME="$(detect_tls_name)"
if [[ -z "$NAME" ]]; then
  echo "tls: could not detect public IP or TLS_HOST" >&2
  exit 1
fi
printf '%s\n' "$NAME" > "$NAME_FILE"
chmod 644 "$NAME_FILE"

export TLS_NAME="$NAME"
bash "$APP/deploy/install-nginx.sh"

ensure_certbot
issue_cert "$NAME"

PUBLIC="https://${NAME}"
upsert_env PUBLIC_URL "$PUBLIC"
upsert_env VITE_AUTH0_CALLBACK_URL "${PUBLIC}/callback"
upsert_env VITE_AUTH0_LOGOUT_URL "$PUBLIC"
upsert_env VITE_API_URL "$PUBLIC"

export TLS_NAME="$NAME"
bash "$APP/deploy/install-nginx.sh"

install -m 644 "$APP/deploy/pact-certbot.service" /etc/systemd/system/pact-certbot.service
install -m 644 "$APP/deploy/pact-certbot.timer" /etc/systemd/system/pact-certbot.timer
systemctl daemon-reload
systemctl enable --now pact-certbot.timer

echo "tls: https ready"
echo "tls: Auth0 Allowed Callback URLs += ${PUBLIC}/callback"
echo "tls: Auth0 Allowed Logout URLs   += ${PUBLIC}"
echo "tls: Auth0 Allowed Web Origins   += ${PUBLIC}"
