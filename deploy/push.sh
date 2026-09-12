#!/usr/bin/env bash
# Copy this tree to Vultr and bootstrap nginx + systemd.
# Required: VULTR_HOST, VULTR_USER
# SSH key: VULTR_SSH_PRIVATE_KEY (PEM text) or SSH_KEY / ~/.ssh/vultr_deploy (file)
# Never prints the private key.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${VULTR_HOST:?VULTR_HOST is required}"
USER="${VULTR_USER:?VULTR_USER is required}"
APP=/opt/pact

KEY_FILE="$(mktemp)"
cleanup() { rm -f "$KEY_FILE"; }
trap cleanup EXIT

if [[ -n "${VULTR_SSH_PRIVATE_KEY:-}" ]]; then
  printf '%s\n' "${VULTR_SSH_PRIVATE_KEY//$'\\n'/$'\n'}" > "$KEY_FILE"
elif [[ -n "${SSH_KEY:-}" && -f "${SSH_KEY}" ]]; then
  cat "$SSH_KEY" > "$KEY_FILE"
elif [[ -f "$HOME/.ssh/vultr_deploy" ]]; then
  cat "$HOME/.ssh/vultr_deploy" > "$KEY_FILE"
else
  echo "No SSH key. Set VULTR_SSH_PRIVATE_KEY or SSH_KEY." >&2
  exit 1
fi
chmod 600 "$KEY_FILE"

if ! grep -q "BEGIN" "$KEY_FILE"; then
  echo "SSH key does not look like a private key." >&2
  exit 1
fi

SSH=(ssh -i "$KEY_FILE" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20)
RSH="ssh -i $KEY_FILE -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20"

echo "deploy: ${USER}@${HOST} -> ${APP}"
"${SSH[@]}" "${USER}@${HOST}" "mkdir -p $APP && (command -v nginx >/dev/null || (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx rsync))"

if command -v rsync >/dev/null 2>&1; then
  rsync -az --delete \
    --exclude node_modules \
    --exclude dist \
    --exclude .git \
    --exclude .env \
    --exclude '*.pem' \
    --exclude .ssh \
    -e "$RSH" \
    "$ROOT/" "${USER}@${HOST}:${APP}/"
else
  tar -C "$ROOT" --exclude node_modules --exclude dist --exclude .git --exclude .env -cf - . \
    | "${SSH[@]}" "${USER}@${HOST}" "tar -C $APP -xf -"
fi

"${SSH[@]}" "${USER}@${HOST}" "bash $APP/deploy/bootstrap.sh"
echo "deploy: bootstrap finished. Public URL http://${HOST}/"
