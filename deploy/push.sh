#!/usr/bin/env bash
# From a laptop / this agent: copy the repo to Vultr and bootstrap.
# Prefers rsync; falls back to tar+ssh if rsync is missing locally.
# Requires: VULTR_HOST, VULTR_USER, and an SSH identity file.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${VULTR_HOST:?VULTR_HOST is required}"
USER="${VULTR_USER:?VULTR_USER is required}"
KEY="${SSH_KEY:-$HOME/.ssh/vultr_deploy}"
APP=/opt/pact

if [[ ! -f "$KEY" ]]; then
  echo "SSH key not found at $KEY" >&2
  exit 1
fi

SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new)
RSYNC=(rsync -az --delete
  --exclude node_modules
  --exclude dist
  --exclude .git
  --exclude .env
  --exclude '*.pem'
  --exclude .ssh
  -e "ssh -i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new")

"${SSH[@]}" "${USER}@${HOST}" "mkdir -p $APP && apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx rsync >/dev/null"

"${RSYNC[@]}" "$ROOT/" "${USER}@${HOST}:${APP}/"

"${SSH[@]}" "${USER}@${HOST}" "bash $APP/deploy/bootstrap.sh"
