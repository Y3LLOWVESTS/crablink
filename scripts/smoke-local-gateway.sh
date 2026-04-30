#!/usr/bin/env bash
set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:8090}"

echo "Checking CrabLink local gateway: $GATEWAY_URL"

curl -fsS "$GATEWAY_URL/healthz" >/dev/null
echo "healthz: ok"

curl -fsS "$GATEWAY_URL/readyz" >/dev/null
echo "readyz: ok"
