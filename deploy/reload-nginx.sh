#!/usr/bin/env bash
set -euo pipefail
nginx -t >/dev/null
systemctl reload nginx
