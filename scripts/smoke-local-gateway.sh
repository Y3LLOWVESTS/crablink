#!/usr/bin/env bash
# RO:WHAT — Local gateway smoke for CrabLink extension-facing routes.
# RO:WHY — Proves the running RustyOnions gateway supports the read-only routes CrabLink needs.
# RO:INTERACTS — svc-gateway /healthz, /readyz, /identity/me, /wallet/:account/balance, /b3, /crab/resolve.
# RO:INVARIANTS — read-only by default; bootstrap mutation is opt-in; no fake local ROC truth.
# RO:METRICS — sends x-correlation-id for backend log correlation.
# RO:CONFIG — GATEWAY_URL, CRABLINK_PASSPORT, CRABLINK_WALLET_ACCOUNT, CRABLINK_SMOKE_RUN_BOOTSTRAP.
# RO:SECURITY — does not store tokens; optional Authorization header for local dev only.
# RO:TEST — run while scripts/web3_crablink_dev_stack.sh is active in RustyOnions repo.

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:8090}"
GATEWAY_URL="${GATEWAY_URL%/}"

CRABLINK_PASSPORT="${CRABLINK_PASSPORT:-passport:main:dev}"
CRABLINK_WALLET_ACCOUNT="${CRABLINK_WALLET_ACCOUNT:-acct_dev}"
CRABLINK_AUTH_HEADER="${CRABLINK_AUTH_HEADER:-Bearer dev}"
CRABLINK_SMOKE_RUN_BOOTSTRAP="${CRABLINK_SMOKE_RUN_BOOTSTRAP:-0}"
CORR_PREFIX="crablink-smoke-$(date +%Y%m%d-%H%M%S)"
SAMPLE_HASH="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

echo "CrabLink local gateway smoke"
echo "gateway:   $GATEWAY_URL"
echo "passport:  $CRABLINK_PASSPORT"
echo "wallet:    $CRABLINK_WALLET_ACCOUNT"
echo

curl_status() {
  local path="$1"
  local name="$2"
  local expected="${3:-200}"

  local status
  status="$(
    curl -sS \
      -o /tmp/crablink-smoke-body.json \
      -w "%{http_code}" \
      -H "Accept: application/json" \
      -H "x-correlation-id: ${CORR_PREFIX}-${name}" \
      "${GATEWAY_URL}${path}" || true
  )"

  if [[ "$status" != "$expected" ]]; then
    echo "error: $path expected HTTP $expected, got HTTP $status"
    cat /tmp/crablink-smoke-body.json || true
    echo
    exit 1
  fi

  echo "ok: $path -> HTTP $status"
}

curl_identity_json() {
  local path="$1"
  local name="$2"
  local expected="${3:-200}"
  local outfile="/tmp/crablink-smoke-${name}.json"

  local status
  status="$(
    curl -sS \
      -o "$outfile" \
      -w "%{http_code}" \
      -H "Accept: application/json" \
      -H "Authorization: ${CRABLINK_AUTH_HEADER}" \
      -H "x-correlation-id: ${CORR_PREFIX}-${name}" \
      -H "x-ron-passport: ${CRABLINK_PASSPORT}" \
      -H "x-ron-wallet-account: ${CRABLINK_WALLET_ACCOUNT}" \
      "${GATEWAY_URL}${path}" || true
  )"

  if [[ "$status" != "$expected" ]]; then
    echo "error: $path expected HTTP $expected, got HTTP $status"
    cat "$outfile" || true
    echo
    exit 1
  fi

  python3 - "$outfile" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    json.load(f)
PY

  echo "ok: $path -> HTTP $status"
}

curl_bootstrap() {
  local outfile="/tmp/crablink-smoke-bootstrap.json"

  local status
  status="$(
    curl -sS \
      -o "$outfile" \
      -w "%{http_code}" \
      -X POST \
      -H "Accept: application/json" \
      -H "Content-Type: application/json" \
      -H "Authorization: ${CRABLINK_AUTH_HEADER}" \
      -H "Idempotency-Key: ${CORR_PREFIX}-bootstrap" \
      -H "x-correlation-id: ${CORR_PREFIX}-bootstrap" \
      -H "x-ron-passport: ${CRABLINK_PASSPORT}" \
      -H "x-ron-wallet-account: ${CRABLINK_WALLET_ACCOUNT}" \
      --data-binary '{"kind":"main","label":"CrabLink smoke passport","client":"crablink-smoke","request_starter_grant":true,"create_wallet":true}' \
      "${GATEWAY_URL}/identity/passport/bootstrap" || true
  )"

  if [[ "$status" != "200" ]]; then
    echo "error: /identity/passport/bootstrap expected HTTP 200, got HTTP $status"
    cat "$outfile" || true
    echo
    exit 1
  fi

  python3 - "$outfile" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)

caps = data.get("capabilities", {})
if isinstance(caps, dict) and caps.get("can_spend") is True:
    raise SystemExit("bootstrap must not grant uncaveated spend authority")

grant = data.get("starter_grant") or data.get("starterGrant") or {}
if isinstance(grant, dict):
    issued = grant.get("issued")
    amount = str(grant.get("amount_minor_units", grant.get("amountMinorUnits", "0")))
    if issued is False and amount != "0":
        raise SystemExit("non-issued starter grant must be 0")

print("bootstrap JSON: ok")
PY

  echo "ok: /identity/passport/bootstrap -> HTTP $status"
}

curl_status "/healthz" "healthz"
curl_status "/readyz" "readyz"
curl_identity_json "/identity/me" "identity"
curl_identity_json "/wallet/${CRABLINK_WALLET_ACCOUNT}/balance" "wallet"
curl_status "/b3/${SAMPLE_HASH}.image" "b3_asset"
curl_status "/crab/resolve?url=crab://${SAMPLE_HASH}.image" "crab_resolve"

if [[ "$CRABLINK_SMOKE_RUN_BOOTSTRAP" == "1" ]]; then
  curl_bootstrap
else
  echo "skip: /identity/passport/bootstrap; set CRABLINK_SMOKE_RUN_BOOTSTRAP=1 to include mutation route"
fi

echo
echo "CrabLink local gateway smoke passed."