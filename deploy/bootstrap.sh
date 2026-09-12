#!/usr/bin/env bash
# Run ON the Vultr box after files are in /opt/pact
set -euo pipefail

APP=/opt/pact
cd "$APP"

if [[ ! -f package.json ]]; then
  echo "No package.json in $APP" >&2
  exit 1
fi

export NODE_ENV=production
npm ci
npm run build

install -m 644 "$APP/deploy/pact.service" /etc/systemd/system/pact.service
install -m 644 "$APP/deploy/nginx.conf" /etc/nginx/sites-available/pact
ln -sfn /etc/nginx/sites-available/pact /etc/nginx/sites-enabled/pact
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl daemon-reload
systemctl enable --now pact
systemctl restart pact
systemctl reload nginx || systemctl restart nginx

sleep 1
curl -fsS http://127.0.0.1:3000/api/health
echo
curl -fsS -o /dev/null -w "nginx_home %{http_code}\n" http://127.0.0.1/ 
echo "deploy ok"
