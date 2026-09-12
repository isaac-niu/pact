#!/usr/bin/env bash
# Write /opt/pact/.env on Vultr from THIS machine's environment.
# Does not print secret values. Does not touch git.
set -euo pipefail

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
  echo "No SSH key." >&2
  exit 1
fi
chmod 600 "$KEY_FILE"

python3 - "$HOST" "$USER" "$KEY_FILE" "$APP" <<'PY'
import os, sys, subprocess, tempfile

host, user, key, app = sys.argv[1:5]
names = [
    "PORT", "BIND_HOST", "DEMO_SEED", "DEMO_SEED_PRODUCTION",
    "GEMINI_API_KEY", "ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID", "ELEVENLABS_MODEL_ID",
    "AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET", "AUTH0_AUDIENCE",
    "AUTH0_SECRET",
    "MONGODB_URI", "MONGO_DB_NAME", "MONGODB_DB_NAME", "PUBLIC_URL",
]
defaults = {
    "PORT": "3000",
    "BIND_HOST": "127.0.0.1",
    "DEMO_SEED": "false",
    "DEMO_SEED_PRODUCTION": "false",
    "MONGO_DB_NAME": "pact",
    "ELEVENLABS_MODEL_ID": "eleven_turbo_v2_5",
}

def esc(value):
    return value.replace("\\", "\\\\").replace("'", "'\"'\"'")

lines = ["# written by deploy/write-server-env.sh — do not commit"]
present = []
for name in names:
    val = os.environ.get(name, defaults.get(name, ""))
    if val:
        present.append(name)
    lines.append(f"{name}='{esc(val)}'")

payload = "\n".join(lines) + "\n"
remote = f"""umask 077
mkdir -p {app}
cat > {app}/.env <<'PACTENV'
{payload}PACTENV
chmod 600 {app}/.env
if command -v systemctl >/dev/null; then systemctl restart pact || true; fi
echo env_written
"""
subprocess.run(
    ["ssh", "-i", key, "-o", "IdentitiesOnly=yes", "-o", "StrictHostKeyChecking=accept-new",
     f"{user}@{host}", "bash", "-s"],
    input=remote.encode(),
    check=True,
)
print("wrote", ",".join(present) or "(empty placeholders)")
PY
