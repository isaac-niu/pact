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
  python3 - "$KEY_FILE" <<'PY'
import os, pathlib, sys
raw = os.environ.get("VULTR_SSH_PRIVATE_KEY") or ""
k = raw.strip().replace("\\n", "\n")
path = pathlib.Path(sys.argv[1])
if "BEGIN" in k:
    path.write_text(k if k.endswith("\n") else k + "\n")
else:
    body = "".join(k.split())
    wrapped = "\n".join(body[i : i + 70] for i in range(0, len(body), 70))
    path.write_text(
        "-----BEGIN OPENSSH PRIVATE KEY-----\n"
        + wrapped
        + "\n-----END OPENSSH PRIVATE KEY-----\n"
    )
PY
elif [[ -n "${SSH_KEY:-}" && -f "${SSH_KEY}" ]]; then
  cat "$SSH_KEY" > "$KEY_FILE"
elif [[ -f "$HOME/.ssh/vultr_deploy" ]]; then
  cat "$HOME/.ssh/vultr_deploy" > "$KEY_FILE"
else
  echo "No SSH key. Set VULTR_SSH_PRIVATE_KEY or SSH_KEY." >&2
  exit 1
fi
chmod 600 "$KEY_FILE"

if ! ssh-keygen -y -f "$KEY_FILE" >/dev/null 2>&1; then
  echo "SSH key could not be loaded." >&2
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
