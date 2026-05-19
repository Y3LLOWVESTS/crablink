#!/usr/bin/env bash
set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:8090}"

echo "CrabLink Tauri local gateway smoke"
echo "gateway: $GATEWAY_URL"

curl -fsS "$GATEWAY_URL/healthz" >/dev/null
curl -fsS "$GATEWAY_URL/readyz" >/dev/null || {
  echo "warning: /readyz is not green; continuing because dev stacks may expose health first" >&2
}

echo "gateway smoke: ok"
