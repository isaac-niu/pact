#!/usr/bin/env python3
"""Align Vultr .env for live Auth0 People without printing secret values."""
from __future__ import annotations

import os
import secrets
import sys
from pathlib import Path

DEFAULT_AUDIENCE = "https://localhost"


def parse_env(text: str) -> tuple[list[str], dict[str, str]]:
    lines = text.splitlines()
    values: dict[str, str] = {}
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        if stripped.startswith("export "):
            stripped = stripped[len("export ") :]
        key, _, raw = stripped.partition("=")
        key = key.strip()
        value = raw.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        values[key] = value
    return lines, values


def filled(values: dict[str, str], key: str) -> bool:
    return bool(values.get(key, "").strip())


def set_key(lines: list[str], key: str, value: str) -> list[str]:
    prefix = f"{key}="
    export_prefix = f"export {key}="
    replaced = False
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(prefix) or stripped.startswith(export_prefix):
            out.append(f"{key}={value}")
            replaced = True
        else:
            out.append(line)
    if not replaced:
        if out and out[-1] != "":
            out.append("")
        out.append(f"{key}={value}")
    return out


def status(values: dict[str, str], key: str) -> str:
    if key not in values:
        return "missing"
    return "set" if values[key].strip() else "empty"


def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "/opt/pact/.env")
    if not path.is_file():
        print(f"ensure-live-auth-env: {path} missing", file=sys.stderr)
        return 1

    original = path.read_text(encoding="utf-8")
    lines, values = parse_env(original)
    changes: list[str] = []

    mock = values.get("PACT_MOCK_AUTH", "").strip()
    if mock == "1":
        lines = set_key(lines, "PACT_MOCK_AUTH", "0")
        values["PACT_MOCK_AUTH"] = "0"
        changes.append("PACT_MOCK_AUTH=0")

    if not filled(values, "MONGODB_DB_NAME") and filled(values, "MONGO_DB_NAME"):
        db_name = values["MONGO_DB_NAME"].strip()
        lines = set_key(lines, "MONGODB_DB_NAME", db_name)
        values["MONGODB_DB_NAME"] = db_name
        changes.append("MONGODB_DB_NAME=from_MONGO_DB_NAME")

    vite_aud = values.get("VITE_AUTH0_AUDIENCE", "").strip()
    api_aud = values.get("AUTH0_AUDIENCE", "").strip()
    audience = vite_aud or api_aud or DEFAULT_AUDIENCE
    if api_aud != audience:
        lines = set_key(lines, "AUTH0_AUDIENCE", audience)
        values["AUTH0_AUDIENCE"] = audience
        changes.append("AUTH0_AUDIENCE=aligned")
    if vite_aud != audience:
        lines = set_key(lines, "VITE_AUTH0_AUDIENCE", audience)
        values["VITE_AUTH0_AUDIENCE"] = audience
        changes.append("VITE_AUTH0_AUDIENCE=aligned")

    if not filled(values, "AUTH0_SECRET"):
        secret = secrets.token_urlsafe(48)
        lines = set_key(lines, "AUTH0_SECRET", secret)
        values["AUTH0_SECRET"] = secret
        changes.append("AUTH0_SECRET=generated")

    if "\n".join(lines) != original.rstrip("\n") or changes:
        text = "\n".join(lines)
        if not text.endswith("\n"):
            text += "\n"
        path.write_text(text, encoding="utf-8")
        os.chmod(path, 0o600)

    report = [
        f"file={path}",
        f"PACT_MOCK_AUTH={status(values, 'PACT_MOCK_AUTH')}:{values.get('PACT_MOCK_AUTH', '') or 'unset'}",
        f"AUTH0_DOMAIN={status(values, 'AUTH0_DOMAIN')}",
        f"AUTH0_CLIENT_ID={status(values, 'AUTH0_CLIENT_ID')}",
        f"AUTH0_CLIENT_SECRET={status(values, 'AUTH0_CLIENT_SECRET')}",
        f"AUTH0_AUDIENCE={status(values, 'AUTH0_AUDIENCE')}",
        f"AUTH0_SECRET={status(values, 'AUTH0_SECRET')}",
        f"MONGODB_URI={status(values, 'MONGODB_URI')}",
        f"MONGODB_DB_NAME={status(values, 'MONGODB_DB_NAME')}",
        f"MONGO_DB_NAME={status(values, 'MONGO_DB_NAME')}",
        f"VITE_AUTH0_AUDIENCE={status(values, 'VITE_AUTH0_AUDIENCE')}",
        f"changes={','.join(changes) if changes else 'none'}",
    ]
    print("ensure-live-auth-env " + " ".join(report))
    if not filled(values, "MONGODB_URI"):
        print("ensure-live-auth-env: MONGODB_URI empty — Atlas will not connect", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
