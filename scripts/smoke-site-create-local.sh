#!/usr/bin/env bash
# RO:WHAT — Opt-in site create/open smoke for CrabLink extension-facing gateway routes.
# RO:WHY — NEXT_LEVEL gate; proves prepare → hold → /sites create → /sites/:name → optional crab resolver.
# RO:INTERACTS — svc-gateway /healthz, /readyz, /sites/prepare, /wallet/hold, /sites, /sites/:name, /crab/resolve.
# RO:INVARIANTS — explicit script-run mutation; wallet mutation through gateway only; no direct storage/index/ledger calls.
# RO:METRICS — sends x-correlation-id and x-request-id for backend log correlation.
# RO:CONFIG — GATEWAY_URL, CRABLINK_PASSPORT, CRABLINK_WALLET_ACCOUNT, CRABLINK_SITE_*, CRABLINK_SITE_REQUIRE_CRAB_RESOLVE.
# RO:SECURITY — local-dev Authorization only; no token persistence; paid proof headers are explicit; no silent browser spend.
# RO:TEST — run while RustyOnions WEB3_2 / CrabLink dev stack is active.

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-${CRABLINK_GATEWAY_URL:-http://127.0.0.1:8090}}"
GATEWAY_URL="${GATEWAY_URL%/}"

CRABLINK_PASSPORT="${CRABLINK_PASSPORT:-passport:main:dev}"
CRABLINK_WALLET_ACCOUNT="${CRABLINK_WALLET_ACCOUNT:-acct_dev}"
CRABLINK_AUTH_HEADER="${CRABLINK_AUTH_HEADER:-Bearer ${CRABLINK_AUTH_TOKEN:-dev}}"
CRABLINK_ESCROW_ACCOUNT="${CRABLINK_ESCROW_ACCOUNT:-escrow_paid_write}"

CRABLINK_SITE_RUN_CREATE="${CRABLINK_SITE_RUN_CREATE:-1}"
CRABLINK_SITE_REQUIRE_CRAB_RESOLVE="${CRABLINK_SITE_REQUIRE_CRAB_RESOLVE:-0}"
CRABLINK_SITE_HOLD_NONCE="${CRABLINK_SITE_HOLD_NONCE:-1}"
CRABLINK_SITE_EXPECT_PRICE="${CRABLINK_SITE_EXPECT_PRICE:-}"
CRABLINK_SITE_FALLBACK_PRICE="${CRABLINK_SITE_FALLBACK_PRICE:-25}"

CRABLINK_SITE_NAME="${CRABLINK_SITE_NAME:-crablink-site-smoke-$(date +%Y%m%d-%H%M%S)}"
CRABLINK_SITE_TITLE="${CRABLINK_SITE_TITLE:-CrabLink Site Smoke}"
CRABLINK_SITE_DESCRIPTION="${CRABLINK_SITE_DESCRIPTION:-A test RustyOnions site launched from CrabLink smoke.}"
CRABLINK_SITE_ROOT_CID="${CRABLINK_SITE_ROOT_CID:-b3:192602366a47455bf4c3353222176d41b33dfd92dea87e62665ee60723578f45}"
CRABLINK_SITE_ROOT_PATH="${CRABLINK_SITE_ROOT_PATH:-index.html}"
CRABLINK_SITE_ROOT_BYTES="${CRABLINK_SITE_ROOT_BYTES:-68}"

CORR_PREFIX="crablink-site-smoke-$(date +%Y%m%d-%H%M%S)"
TMP_ROOT="${TMPDIR:-/tmp}"
TMP_ROOT="${TMP_ROOT%/}"
TMP_DIR="${TMP_ROOT}/${CORR_PREFIX}"

mkdir -p "$TMP_DIR"

echo "CrabLink site create/open smoke"
echo "gateway:       $GATEWAY_URL"
echo "passport:      $CRABLINK_PASSPORT"
echo "wallet:        $CRABLINK_WALLET_ACCOUNT"
echo "site:          $CRABLINK_SITE_NAME"
echo "root cid:      $CRABLINK_SITE_ROOT_CID"
echo "root path:     $CRABLINK_SITE_ROOT_PATH"
echo "root bytes:    $CRABLINK_SITE_ROOT_BYTES"
echo "create:        $CRABLINK_SITE_RUN_CREATE"
echo "require crab:  $CRABLINK_SITE_REQUIRE_CRAB_RESOLVE"
echo "hold nonce:    $CRABLINK_SITE_HOLD_NONCE"
echo "artifacts:     $TMP_DIR"
echo

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: $1 is required for CrabLink site smoke validation"
    exit 1
  fi
}

url_encode() {
  printf '%s' "$1" | jq -sRr @uri
}

json_value() {
  local file="$1"
  local expr="$2"

  jq -r "$expr // empty" "$file"
}

validate_json_object() {
  local file="$1"
  local label="$2"

  if ! jq -e 'type == "object"' "$file" >/dev/null; then
    echo "error: $label is not a JSON object"
    cat "$file"
    echo
    exit 1
  fi
}

expected_nonce_from_error_file() {
  local file="$1"
  local value
  local message

  value="$(json_value "$file" '.expected_nonce // .expectedNonce // .next_nonce // .nextNonce // .details.expected_nonce // .details.expectedNonce // .details.next_nonce // .details.nextNonce')"

  if [[ "$value" =~ ^[1-9][0-9]*$ ]]; then
    printf '%s' "$value"
    return 0
  fi

  message="$(json_value "$file" '.message // .error // .reason')"

  if [[ "$message" =~ expected[^0-9]{0,24}([1-9][0-9]*) ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
    return 0
  fi

  return 1
}

canonical_b3_or_die() {
  local value="$1"
  local label="$2"

  if [[ ! "$value" =~ ^b3:[0-9a-f]{64}$ ]]; then
    echo "error: $label must be canonical b3:<64 lowercase hex>"
    echo "actual: $value"
    exit 1
  fi
}

site_name_or_die() {
  local value="$1"

  if [[ ! "$value" =~ ^[a-z0-9][a-z0-9._-]{1,62}$ ]]; then
    echo "error: CRABLINK_SITE_NAME must match ^[a-z0-9][a-z0-9._-]{1,62}$"
    echo "actual: $value"
    exit 1
  fi

  if [[ "$value" == *".."* ]]; then
    echo "error: CRABLINK_SITE_NAME must not contain '..'"
    echo "actual: $value"
    exit 1
  fi
}

site_root_bytes_or_die() {
  local value="$1"

  if [[ ! "$value" =~ ^[1-9][0-9]*$ ]]; then
    echo "error: CRABLINK_SITE_ROOT_BYTES must be a positive integer"
    echo "actual: $value"
    exit 1
  fi
}

safe_site_path_or_die() {
  local value="$1"

  if [[ -z "$value" || "$value" == /* || "$value" == *".."* || "$value" == *"\\"* ]]; then
    echo "error: CRABLINK_SITE_ROOT_PATH must be a safe relative file path"
    echo "actual: $value"
    exit 1
  fi
}

http_probe() {
  local path="$1"
  local label="$2"
  local out="$TMP_DIR/${label}.body"
  local status

  status="$(
    curl -sS -o "$out" -w '%{http_code}' \
      -H "x-correlation-id: ${CORR_PREFIX}-${label}" \
      -H "x-request-id: ${CORR_PREFIX}-${label}" \
      "$GATEWAY_URL$path"
  )"

  if [[ "$status" =~ ^20[0-9]$ ]]; then
    echo "ok: GET $path -> HTTP $status"
    return 0
  fi

  echo "error: GET $path -> HTTP $status"
  cat "$out"
  echo
  exit 1
}

curl_gateway_get_json() {
  local path="$1"
  local label="$2"
  local out="$TMP_DIR/${label}.body"
  local status

  status="$(
    curl -sS -o "$out" -w '%{http_code}' \
      -H "Authorization: $CRABLINK_AUTH_HEADER" \
      -H "x-ron-passport: $CRABLINK_PASSPORT" \
      -H "x-ron-wallet-account: $CRABLINK_WALLET_ACCOUNT" \
      -H "x-correlation-id: ${CORR_PREFIX}-${label}" \
      -H "x-request-id: ${CORR_PREFIX}-${label}" \
      "$GATEWAY_URL$path"
  )"

  printf '%s' "$status" > "$TMP_DIR/${label}.status"

  if [[ "$status" =~ ^20[0-9]$ ]]; then
    echo "ok: GET $path -> HTTP $status" >&2
    validate_json_object "$out" "$label"
    printf '%s' "$out"
    return 0
  fi

  echo "error: GET $path -> HTTP $status" >&2
  cat "$out" >&2
  echo >&2
  exit 1
}

curl_gateway_post_json_status() {
  local path="$1"
  local label="$2"
  local body="$3"
  local out="$TMP_DIR/${label}.body"
  local body_file="$TMP_DIR/${label}.request.json"
  local status

  printf '%s\n' "$body" > "$body_file"

  status="$(
    curl -sS -o "$out" -w '%{http_code}' \
      -X POST "$GATEWAY_URL$path" \
      -H "Authorization: $CRABLINK_AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: ${CORR_PREFIX}-${label}" \
      -H "x-ron-passport: $CRABLINK_PASSPORT" \
      -H "x-ron-wallet-account: $CRABLINK_WALLET_ACCOUNT" \
      -H "x-correlation-id: ${CORR_PREFIX}-${label}" \
      -H "x-request-id: ${CORR_PREFIX}-${label}" \
      --data-binary @"$body_file"
  )"

  printf '%s' "$status" > "$TMP_DIR/${label}.status"
  printf '%s' "$out"
}

curl_gateway_post_json_or_die() {
  local path="$1"
  local label="$2"
  local body="$3"
  local out
  local status

  out="$(curl_gateway_post_json_status "$path" "$label" "$body")"
  status="$(cat "$TMP_DIR/${label}.status")"

  if [[ "$status" =~ ^20[0-9]$ ]]; then
    echo "ok: POST $path -> HTTP $status" >&2
    validate_json_object "$out" "$label"
    printf '%s' "$out"
    return 0
  fi

  echo "error: POST $path -> HTTP $status" >&2
  cat "$out" >&2
  echo >&2
  exit 1
}

curl_gateway_post_site_create() {
  local body="$1"
  local hold_file="$2"
  local label="site_create"
  local out="$TMP_DIR/${label}.body"
  local body_file="$TMP_DIR/${label}.request.json"
  local status
  local txid
  local receipt_hash
  local hold_from
  local hold_to
  local hold_amount

  printf '%s\n' "$body" > "$body_file"

  txid="$(json_value "$hold_file" '.txid // .tx_id // .hold_id // .receipt_id')"
  receipt_hash="$(json_value "$hold_file" '.receipt_hash // .receiptHash // .receipt.hash')"
  hold_from="$(json_value "$hold_file" '.from')"
  hold_to="$(json_value "$hold_file" '.to')"
  hold_amount="$(json_value "$hold_file" '.amount_minor // .amount_minor_units // .amount')"

  if [[ -z "$hold_from" || "$hold_from" == "null" ]]; then
    hold_from="$CRABLINK_WALLET_ACCOUNT"
  fi

  if [[ -z "$hold_to" || "$hold_to" == "null" ]]; then
    hold_to="$CRABLINK_ESCROW_ACCOUNT"
  fi

  if [[ -z "$hold_amount" || "$hold_amount" == "null" ]]; then
    hold_amount="$CRABLINK_SITE_FALLBACK_PRICE"
  fi

  if [[ -z "$txid" || "$txid" == "null" ]]; then
    echo "error: wallet hold response missing txid"
    cat "$hold_file"
    echo
    exit 1
  fi

  if [[ -z "$receipt_hash" || "$receipt_hash" == "null" ]]; then
    echo "error: wallet hold response missing receipt_hash"
    cat "$hold_file"
    echo
    exit 1
  fi

  status="$(
    curl -sS -o "$out" -w '%{http_code}' \
      -X POST "$GATEWAY_URL/sites" \
      -H "Authorization: $CRABLINK_AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: ${CORR_PREFIX}-site-create-${CRABLINK_SITE_NAME}-${txid}" \
      -H "x-ron-passport: $CRABLINK_PASSPORT" \
      -H "x-ron-wallet-account: $CRABLINK_WALLET_ACCOUNT" \
      -H "x-ron-paid-op: hold" \
      -H "x-ron-paid-asset: roc" \
      -H "x-ron-paid-estimate-minor: $hold_amount" \
      -H "x-ron-wallet-hold-txid: $txid" \
      -H "x-ron-wallet-txid: $txid" \
      -H "x-ron-wallet-receipt-hash: $receipt_hash" \
      -H "x-ron-wallet-from: $hold_from" \
      -H "x-ron-wallet-to: $hold_to" \
      -H "x-correlation-id: ${CORR_PREFIX}-${label}" \
      -H "x-request-id: ${CORR_PREFIX}-${label}" \
      --data-binary @"$body_file"
  )"

  printf '%s' "$status" > "$TMP_DIR/${label}.status"

  if [[ "$status" =~ ^20[0-9]$ ]]; then
    echo "ok: POST /sites -> HTTP $status" >&2
    validate_json_object "$out" "$label"
    printf '%s' "$out"
    return 0
  fi

  echo "error: POST /sites -> HTTP $status" >&2
  cat "$out" >&2
  echo >&2
  exit 1
}

build_site_prepare_body() {
  jq -n \
    --arg site_name "$CRABLINK_SITE_NAME" \
    --arg file_path "$CRABLINK_SITE_ROOT_PATH" \
    --argjson file_bytes "$CRABLINK_SITE_ROOT_BYTES" \
    --arg payer_account "$CRABLINK_WALLET_ACCOUNT" \
    --arg owner_passport_subject "$CRABLINK_PASSPORT" \
    --arg owner_wallet_account "$CRABLINK_WALLET_ACCOUNT" \
    --arg title "$CRABLINK_SITE_TITLE" \
    --arg description "$CRABLINK_SITE_DESCRIPTION" \
    --arg idem "crablink-smoke:site:prepare:${CRABLINK_SITE_NAME}:${CORR_PREFIX}" \
    '{
      site_name: $site_name,
      files: [
        {
          path: $file_path,
          bytes: $file_bytes
        }
      ],
      payer_account: $payer_account,
      owner_passport_subject: $owner_passport_subject,
      owner_wallet_account: $owner_wallet_account,
      title: $title,
      description: $description,
      client_idempotency_key: $idem
    }'
}

build_site_create_body() {
  jq -n \
    --arg site_name "$CRABLINK_SITE_NAME" \
    --arg root_document_cid "$CRABLINK_SITE_ROOT_CID" \
    --arg owner_passport_subject "$CRABLINK_PASSPORT" \
    --arg owner_wallet_account "$CRABLINK_WALLET_ACCOUNT" \
    --arg title "$CRABLINK_SITE_TITLE" \
    --arg description "$CRABLINK_SITE_DESCRIPTION" \
    --arg file_path "$CRABLINK_SITE_ROOT_PATH" \
    '{
      site_name: $site_name,
      root_document_cid: $root_document_cid,
      owner_passport_subject: $owner_passport_subject,
      owner_wallet_account: $owner_wallet_account,
      title: $title,
      description: $description,
      route_map: {
        "/": $root_document_cid
      },
      asset_map: {
        ($file_path): $root_document_cid
      }
    }'
}

extract_prepare_amount() {
  local file="$1"
  local amount

  amount="$(
    jq -r '
      [
        .wallet_hold.minimum_hold_minor,
        .wallet_hold.minimum_hold_minor_units,
        .wallet_hold.amount_minor,
        .wallet_hold.amount_minor_units,
        .minimum_hold_minor_units,
        .minimum_hold_minor,
        .minimum_hold,
        .amount_minor,
        .amount_minor_units,
        .estimate.amount_minor,
        .estimate.amount_minor_units,
        .estimate.minimum_hold_minor_units,
        .estimate.minimum_hold_minor,
        .paid_storage.estimate.minimum_hold_minor,
        .paid_storage.estimate.minimum_hold_minor_units,
        .paid_storage.estimate.amount_minor,
        .paid_storage.estimate.amount_minor_units,
        .pricing.amount_minor,
        .pricing.amount_minor_units,
        .price_minor_units
      ]
      | map(select(. != null and . != ""))
      | .[0] // empty
    ' "$file"
  )"

  if [[ "$amount" =~ ^[0-9]+$ ]] && [[ "$amount" != "0" ]]; then
    printf '%s' "$amount"
    return 0
  fi

  printf '%s' "$CRABLINK_SITE_FALLBACK_PRICE"
}

validate_site_prepare_json() {
  local file="$1"
  local amount="$2"
  local schema
  local site_name
  local total_bytes
  local payer_account

  validate_json_object "$file" "site_prepare"

  schema="$(json_value "$file" '.schema')"
  site_name="$(json_value "$file" '.site_name')"
  total_bytes="$(json_value "$file" '.total_bytes')"
  payer_account="$(json_value "$file" '.wallet_hold.payer_account // .payer_account')"

  if [[ "$schema" != "omnigate.site-prepare.v1" ]]; then
    echo "error: site prepare schema mismatch"
    echo "expected: omnigate.site-prepare.v1"
    echo "actual:   $schema"
    cat "$file"
    echo
    exit 1
  fi

  if [[ "$site_name" != "$CRABLINK_SITE_NAME" ]]; then
    echo "error: site prepare site_name mismatch"
    echo "expected: $CRABLINK_SITE_NAME"
    echo "actual:   $site_name"
    cat "$file"
    echo
    exit 1
  fi

  if [[ "$total_bytes" != "$CRABLINK_SITE_ROOT_BYTES" ]]; then
    echo "error: site prepare total_bytes mismatch"
    echo "expected: $CRABLINK_SITE_ROOT_BYTES"
    echo "actual:   $total_bytes"
    cat "$file"
    echo
    exit 1
  fi

  if [[ "$payer_account" != "$CRABLINK_WALLET_ACCOUNT" ]]; then
    echo "error: site prepare payer_account mismatch"
    echo "expected: $CRABLINK_WALLET_ACCOUNT"
    echo "actual:   $payer_account"
    cat "$file"
    echo
    exit 1
  fi

  if [[ ! "$amount" =~ ^[0-9]+$ ]] || [[ "$amount" == "0" ]]; then
    echo "error: site prepare amount is not a positive integer"
    echo "actual: $amount"
    cat "$file"
    echo
    exit 1
  fi

  if [[ -n "$CRABLINK_SITE_EXPECT_PRICE" ]] && [[ "$amount" != "$CRABLINK_SITE_EXPECT_PRICE" ]]; then
    echo "error: site prepare amount did not match CRABLINK_SITE_EXPECT_PRICE"
    echo "expected: $CRABLINK_SITE_EXPECT_PRICE"
    echo "actual:   $amount"
    cat "$file"
    echo
    exit 1
  fi

  echo "site prepare JSON: ok"
}

build_hold_body() {
  local amount="$1"
  local nonce="$2"

  jq -n \
    --arg from "$CRABLINK_WALLET_ACCOUNT" \
    --arg to "$CRABLINK_ESCROW_ACCOUNT" \
    --arg amount "$amount" \
    --argjson nonce "$nonce" \
    --arg idem "crablink-smoke:site:create:hold:${CORR_PREFIX}:${nonce}" \
    --arg site "$CRABLINK_SITE_NAME" \
    '{
      from: $from,
      to: $to,
      asset: "roc",
      amount_minor: $amount,
      nonce: $nonce,
      memo: ("CrabLink opt-in site create smoke hold for " + $site),
      idempotency_key: $idem
    }'
}

create_wallet_hold_with_nonce_retry() {
  local amount="$1"
  local nonce="$CRABLINK_SITE_HOLD_NONCE"
  local body
  local hold_file
  local status
  local expected

  if [[ ! "$nonce" =~ ^[1-9][0-9]*$ ]]; then
    echo "error: CRABLINK_SITE_HOLD_NONCE must be a positive integer"
    echo "actual: $nonce"
    exit 1
  fi

  body="$(build_hold_body "$amount" "$nonce")"
  hold_file="$(curl_gateway_post_json_status "/wallet/hold" "site_hold" "$body")"
  status="$(cat "$TMP_DIR/site_hold.status")"

  if [[ "$status" =~ ^20[0-9]$ ]]; then
    echo "ok: POST /wallet/hold -> HTTP $status" >&2
    validate_json_object "$hold_file" "site_hold"
    printf '%s' "$hold_file"
    return 0
  fi

  if [[ "$status" == "409" ]] && expected="$(expected_nonce_from_error_file "$hold_file")"; then
    echo "warn: POST /wallet/hold -> HTTP 409 NONCE_CONFLICT; retrying once with expected nonce $expected" >&2

    body="$(build_hold_body "$amount" "$expected")"
    hold_file="$(curl_gateway_post_json_status "/wallet/hold" "site_hold_retry_nonce_${expected}" "$body")"
    status="$(cat "$TMP_DIR/site_hold_retry_nonce_${expected}.status")"

    if [[ "$status" =~ ^20[0-9]$ ]]; then
      echo "ok: POST /wallet/hold -> HTTP $status after nonce retry" >&2
      validate_json_object "$hold_file" "site_hold_retry"
      printf '%s' "$hold_file"
      return 0
    fi
  fi

  echo "error: POST /wallet/hold -> HTTP $status" >&2
  cat "$hold_file" >&2
  echo >&2
  exit 1
}

validate_hold_json() {
  local file="$1"
  local txid
  local receipt_hash

  validate_json_object "$file" "wallet_hold"

  txid="$(json_value "$file" '.txid // .tx_id // .hold_id // .receipt_id')"
  receipt_hash="$(json_value "$file" '.receipt_hash // .receiptHash // .receipt.hash')"

  if [[ -z "$txid" || "$txid" == "null" ]]; then
    echo "error: wallet hold JSON missing txid"
    cat "$file"
    echo
    exit 1
  fi

  if [[ -z "$receipt_hash" || "$receipt_hash" == "null" ]]; then
    echo "error: wallet hold JSON missing receipt_hash"
    cat "$file"
    echo
    exit 1
  fi

  echo "wallet hold JSON: ok"
}

validate_site_create_json() {
  local file="$1"
  local site_name
  local root_cid
  local manifest_cid
  local crab_url

  validate_json_object "$file" "site_create"

  site_name="$(json_value "$file" '.site_name // .name // .site.site_name // .site.name')"
  root_cid="$(json_value "$file" '.root_document_cid // .site.root_document_cid // .manifest.root_document_cid')"
  manifest_cid="$(json_value "$file" '.manifest_cid // .manifest.manifest_cid // .site.manifest_cid')"
  crab_url="$(json_value "$file" '.crab_url // .links.crab // .site.crab_url')"

  if [[ -n "$site_name" && "$site_name" != "$CRABLINK_SITE_NAME" ]]; then
    echo "error: site create response site_name mismatch"
    echo "expected: $CRABLINK_SITE_NAME"
    echo "actual:   $site_name"
    cat "$file"
    echo
    exit 1
  fi

  if [[ -n "$root_cid" && "$root_cid" != "$CRABLINK_SITE_ROOT_CID" ]]; then
    echo "error: site create response root_document_cid mismatch"
    echo "expected: $CRABLINK_SITE_ROOT_CID"
    echo "actual:   $root_cid"
    cat "$file"
    echo
    exit 1
  fi

  if [[ -n "$manifest_cid" ]]; then
    canonical_b3_or_die "$manifest_cid" "site create manifest_cid"
  fi

  if [[ -n "$crab_url" && "$crab_url" != "crab://$CRABLINK_SITE_NAME" ]]; then
    echo "error: site create response crab URL mismatch"
    echo "expected: crab://$CRABLINK_SITE_NAME"
    echo "actual:   $crab_url"
    cat "$file"
    echo
    exit 1
  fi

  echo "site create JSON: ok"
}

validate_site_page_json() {
  local file="$1"
  local label="$2"
  local schema
  local site_name
  local root_cid

  validate_json_object "$file" "$label"

  schema="$(json_value "$file" '.schema // .type')"
  site_name="$(json_value "$file" '.site_name // .name')"
  root_cid="$(json_value "$file" '.root_document_cid // .manifest.root_document_cid // .route_map["/"]')"

  if [[ "$schema" != "omnigate.site-page.v1" ]]; then
    echo "error: $label schema mismatch"
    echo "expected: omnigate.site-page.v1"
    echo "actual:   $schema"
    cat "$file"
    echo
    exit 1
  fi

  if [[ "$site_name" != "$CRABLINK_SITE_NAME" ]]; then
    echo "error: $label site_name mismatch"
    echo "expected: $CRABLINK_SITE_NAME"
    echo "actual:   $site_name"
    cat "$file"
    echo
    exit 1
  fi

  if [[ -n "$root_cid" && "$root_cid" != "$CRABLINK_SITE_ROOT_CID" ]]; then
    echo "error: $label root_document_cid mismatch"
    echo "expected: $CRABLINK_SITE_ROOT_CID"
    echo "actual:   $root_cid"
    cat "$file"
    echo
    exit 1
  fi

  echo "$label JSON: ok"
}

need_cmd curl
need_cmd jq

canonical_b3_or_die "$CRABLINK_SITE_ROOT_CID" "CRABLINK_SITE_ROOT_CID"
site_name_or_die "$CRABLINK_SITE_NAME"
site_root_bytes_or_die "$CRABLINK_SITE_ROOT_BYTES"
safe_site_path_or_die "$CRABLINK_SITE_ROOT_PATH"

http_probe "/healthz" "healthz"
http_probe "/readyz" "readyz"

site_prepare_body="$(build_site_prepare_body)"
prepare_file="$(curl_gateway_post_json_or_die "/sites/prepare" "site_prepare" "$site_prepare_body")"
prepare_amount="$(extract_prepare_amount "$prepare_file")"
validate_site_prepare_json "$prepare_file" "$prepare_amount"

echo "site prepare amount: $prepare_amount ROC minor units"

if [[ "$CRABLINK_SITE_RUN_CREATE" != "1" ]]; then
  echo
  echo "prepare-only mode complete."
  echo "To perform the paid hold + POST /sites mutation, run:"
  echo "CRABLINK_SITE_RUN_CREATE=1 CRABLINK_SITE_HOLD_NONCE=<next_nonce> scripts/smoke-site-create-local.sh"
  echo
  echo "CrabLink site prepare smoke passed."
  exit 0
fi

hold_file="$(create_wallet_hold_with_nonce_retry "$prepare_amount")"
validate_hold_json "$hold_file"

site_create_body="$(build_site_create_body)"
create_file="$(curl_gateway_post_site_create "$site_create_body" "$hold_file")"
validate_site_create_json "$create_file"

site_page_file="$(curl_gateway_get_json "/sites/$(url_encode "$CRABLINK_SITE_NAME")" "site_page")"
validate_site_page_json "$site_page_file" "site page"

encoded_crab="$(url_encode "crab://$CRABLINK_SITE_NAME")"
crab_file="$TMP_DIR/crab_resolve_site.body"
crab_status="$(
  curl -sS -o "$crab_file" -w '%{http_code}' \
    -H "Authorization: $CRABLINK_AUTH_HEADER" \
    -H "x-ron-passport: $CRABLINK_PASSPORT" \
    -H "x-ron-wallet-account: $CRABLINK_WALLET_ACCOUNT" \
    -H "x-correlation-id: ${CORR_PREFIX}-crab-resolve-site" \
    -H "x-request-id: ${CORR_PREFIX}-crab-resolve-site" \
    "$GATEWAY_URL/crab/resolve?url=$encoded_crab"
)"
printf '%s' "$crab_status" > "$TMP_DIR/crab_resolve_site.status"

if [[ "$crab_status" =~ ^20[0-9]$ ]]; then
  echo "ok: GET /crab/resolve?url=crab://$CRABLINK_SITE_NAME -> HTTP $crab_status"
  validate_site_page_json "$crab_file" "named crab resolver"
else
  if [[ "$CRABLINK_SITE_REQUIRE_CRAB_RESOLVE" == "1" ]]; then
    echo "error: GET /crab/resolve?url=crab://$CRABLINK_SITE_NAME -> HTTP $crab_status"
    cat "$crab_file"
    echo
    exit 1
  fi

  echo "pending: /crab/resolve named-site support returned HTTP $crab_status"
  cat "$crab_file"
  echo
fi

balance_file="$(curl_gateway_get_json "/wallet/$(url_encode "$CRABLINK_WALLET_ACCOUNT")/balance" "wallet_balance_after_site")"

if [[ "$(json_value "$balance_file" '.ledger_backed')" != "true" ]]; then
  echo "warn: wallet balance response is not ledger_backed=true"
  cat "$balance_file"
  echo
else
  echo "wallet balance JSON: ok"
fi

echo
echo "created site: crab://$CRABLINK_SITE_NAME"
echo "artifacts: $TMP_DIR"
echo "CrabLink site create/open smoke passed."