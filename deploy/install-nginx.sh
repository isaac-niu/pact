#!/usr/bin/env bash
# Install the HTTP or HTTPS nginx site depending on whether a cert exists.
set -euo pipefail

APP="${APP:-/opt/pact}"
NAME_FILE="${TLS_NAME_FILE:-/etc/pact/tls-name}"
SITE=/etc/nginx/sites-available/pact

mkdir -p /var/www/certbot /etc/pact

NAME="${TLS_NAME:-}"
if [[ -z "$NAME" && -f "$NAME_FILE" ]]; then
  NAME="$(tr -d '[:space:]' < "$NAME_FILE")"
fi

CERT=""
if [[ -n "$NAME" ]]; then
  CERT="/etc/letsencrypt/live/${NAME}/fullchain.pem"
fi

if [[ -n "$NAME" && -f "$CERT" ]]; then
  sed "s/__TLS_NAME__/${NAME}/g" "$APP/deploy/nginx-ssl.conf" > "$SITE"
else
  install -m 644 "$APP/deploy/nginx-http.conf" "$SITE"
fi

ln -sfn "$SITE" /etc/nginx/sites-enabled/pact
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx || systemctl restart nginx
