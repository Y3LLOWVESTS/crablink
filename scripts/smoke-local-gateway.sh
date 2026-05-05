#!/usr/bin/env bash
# RO:WHAT — Local gateway smoke for CrabLink extension-facing routes, paid image upload, and raw preview bytes.
# RO:WHY — NEXT_LEVEL gate; proves image/site templates before expanding into post/comment/article primitives.
# RO:INTERACTS — svc-gateway /healthz, /readyz, /identity/me, /wallet/:account/balance, /wallet/hold, /b3, /crab/resolve, /o, /sites/prepare, /assets/image/prepare, /assets/image.
# RO:INVARIANTS — read/prepare by default; upload/bootstrap/raw proof are opt-in; no fake ROC truth; wallet nonce is sequential, not timestamp-based.
# RO:METRICS — sends x-correlation-id and x-request-id for backend log correlation.
# RO:CONFIG — GATEWAY_URL, CRABLINK_PASSPORT, CRABLINK_WALLET_ACCOUNT, CRABLINK_SMOKE_RUN_BOOTSTRAP, CRABLINK_SMOKE_RUN_PREPARE, CRABLINK_SMOKE_RUN_UPLOAD, CRABLINK_SMOKE_RUN_KNOWN_GOOD.
# RO:SECURITY — does not store tokens; optional Authorization header is local-dev only; no silent spend; verifies raw bytes only through gateway /o.
# RO:TEST — run while RustyOnions WEB3_2 / CrabLink dev stack is active.

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-${CRABLINK_GATEWAY_URL:-http://127.0.0.1:8090}}"
GATEWAY_URL="${GATEWAY_URL%/}"

CRABLINK_PASSPORT="${CRABLINK_PASSPORT:-passport:main:dev}"
CRABLINK_WALLET_ACCOUNT="${CRABLINK_WALLET_ACCOUNT:-acct_dev}"
CRABLINK_AUTH_HEADER="${CRABLINK_AUTH_HEADER:-Bearer ${CRABLINK_AUTH_TOKEN:-dev}}"
CRABLINK_ESCROW_ACCOUNT="${CRABLINK_ESCROW_ACCOUNT:-escrow_paid_write}"

CRABLINK_SMOKE_RUN_BOOTSTRAP="${CRABLINK_SMOKE_RUN_BOOTSTRAP:-0}"
CRABLINK_SMOKE_RUN_PREPARE="${CRABLINK_SMOKE_RUN_PREPARE:-1}"
CRABLINK_SMOKE_RUN_UPLOAD="${CRABLINK_SMOKE_RUN_UPLOAD:-0}"
CRABLINK_SMOKE_RUN_KNOWN_GOOD="${CRABLINK_SMOKE_RUN_KNOWN_GOOD:-0}"
CRABLINK_SMOKE_REQUIRE_LEDGER="${CRABLINK_SMOKE_REQUIRE_LEDGER:-$CRABLINK_SMOKE_RUN_BOOTSTRAP}"
CRABLINK_SMOKE_HOLD_NONCE="${CRABLINK_SMOKE_HOLD_NONCE:-1}"
CRABLINK_SMOKE_EXPECT_IMAGE_PRICE="${CRABLINK_SMOKE_EXPECT_IMAGE_PRICE:-}"
CRABLINK_SMOKE_KNOWN_GOOD_CRAB_URL="${CRABLINK_SMOKE_KNOWN_GOOD_CRAB_URL:-crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image}"

CORR_PREFIX="crablink-smoke-$(date +%Y%m%d-%H%M%S)"
SAMPLE_HASH="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
TMP_ROOT="${TMPDIR:-/tmp}"
TMP_ROOT="${TMP_ROOT%/}"
TMP_DIR="${TMP_ROOT}/${CORR_PREFIX}"
TINY_PNG_BASE64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="

mkdir -p "$TMP_DIR"

echo "CrabLink local gateway smoke"
echo "gateway:     $GATEWAY_URL"
echo "passport:    $CRABLINK_PASSPORT"
echo "wallet:      $CRABLINK_WALLET_ACCOUNT"
echo "prepare:     $CRABLINK_SMOKE_RUN_PREPARE"
echo "bootstrap:   $CRABLINK_SMOKE_RUN_BOOTSTRAP"
echo "upload:      $CRABLINK_SMOKE_RUN_UPLOAD"
echo "known-good:  $CRABLINK_SMOKE_RUN_KNOWN_GOOD"
echo "ledger:      $CRABLINK_SMOKE_REQUIRE_LEDGER"
echo "hold nonce:  $CRABLINK_SMOKE_HOLD_NONCE"
echo "artifacts:   $TMP_DIR"
echo

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: $1 is required for CrabLink smoke validation"
    exit 1
  fi
}

corr_short() {
  printf '%s' "${CORR_PREFIX#crablink-smoke-}"
}

smoke_idempotency_key() {
  local name="$1"
  local raw

  raw="cl:$(corr_short):${name}"
  printf '%s' "${raw:0:64}"
}

url_encode() {
  printf '%s' "$1" | jq -sRr @uri
}

decode_tiny_png() {
  local out="$1"

  if printf '%s' "$TINY_PNG_BASE64" | base64 --decode > "$out" 2>/dev/null; then
    return 0
  fi

  if printf '%s' "$TINY_PNG_BASE64" | base64 -D > "$out" 2>/dev/null; then
    return 0
  fi

  echo "error: could not decode tiny PNG fixture"
  exit 1
}

json_value() {
  local file="$1"
  local expr="$2"

  jq -r "$expr // empty" "$file"
}

validate_json_object() {
  local file="$1"
  local label="$2"

  jq -e 'type == "object"' "$file" >/dev/null || {
    echo "error: $label did not return a JSON object"
    cat "$file"
    echo
    exit 1
  }
}

require_json_string() {
  local file="$1"
  local expr="$2"
  local label="$3"

  local value
  value="$(json_value "$file" "$expr")"

  if [[ -z "$value" || "$value" == "null" ]]; then
    echo "error: missing $label"
    cat "$file"
    echo
    exit 1
  fi
}

require_json_eq() {
  local file="$1"
  local expr="$2"
  local expected="$3"
  local label="$4"

  local value
  value="$(json_value "$file" "$expr")"

  if [[ "$value" != "$expected" ]]; then
    echo "error: $label mismatch"
    echo "expected: $expected"
    echo "actual:   $value"
    cat "$file"
    echo
    exit 1
  fi
}

require_json_one_of() {
  local file="$1"
  local expr="$2"
  local label="$3"
  shift 3

  local value
  value="$(json_value "$file" "$expr")"

  for expected in "$@"; do
    if [[ "$value" == "$expected" ]]; then
      return 0
    fi
  done

  echo "error: $label mismatch"
  echo "actual: $value"
  echo "allowed:"
  for expected in "$@"; do
    echo "  - $expected"
  done
  cat "$file"
  echo
  exit 1
}

require_positive_integer_string() {
  local file="$1"
  local expr="$2"
  local label="$3"

  local value
  value="$(json_value "$file" "$expr")"

  if [[ ! "$value" =~ ^[0-9]+$ || "$value" == "0" ]]; then
    echo "error: $label must be a positive integer string"
    echo "actual: $value"
    cat "$file"
    echo
    exit 1
  fi
}

curl_gateway() {
  local method="$1"
  local path="$2"
  local name="$3"
  local body="${4:-}"
  local content_type="${5:-application/json}"

  local out="$TMP_DIR/${name}.body"
  local status
  local idem

  idem="$(smoke_idempotency_key "$name")"

  if [[ "$method" == "POST" ]]; then
    status="$(
      curl -sS \
        -o "$out" \
        -w "%{http_code}" \
        -X POST \
        "$GATEWAY_URL$path" \
        -H "Authorization: $CRABLINK_AUTH_HEADER" \
        -H "Content-Type: $content_type" \
        -H "Accept: application/json" \
        -H "x-ron-passport: $CRABLINK_PASSPORT" \
        -H "x-ron-wallet-account: $CRABLINK_WALLET_ACCOUNT" \
        -H "x-correlation-id: ${CORR_PREFIX}-${name}" \
        -H "x-request-id: ${CORR_PREFIX}-${name}" \
        -H "idempotency-key: $idem" \
        --data "$body"
    )"
  else
    status="$(
      curl -sS \
        -o "$out" \
        -w "%{http_code}" \
        "$GATEWAY_URL$path" \
        -H "Authorization: $CRABLINK_AUTH_HEADER" \
        -H "Accept: application/json" \
        -H "x-ron-passport: $CRABLINK_PASSPORT" \
        -H "x-ron-wallet-account: $CRABLINK_WALLET_ACCOUNT" \
        -H "x-correlation-id: ${CORR_PREFIX}-${name}" \
        -H "x-request-id: ${CORR_PREFIX}-${name}"
    )"
  fi

  case "$status" in
    200|201|202|204)
      echo "ok: $method $path -> HTTP $status" >&2
      ;;
    *)
      echo "error: $method $path -> HTTP $status" >&2
      if [[ -f "$out" ]]; then
        cat "$out" >&2
      fi
      echo >&2
      exit 1
      ;;
  esac

  printf '%s' "$out"
}

curl_gateway_status_post_json() {
  local path="$1"
  local name="$2"
  local body="$3"

  local out="$TMP_DIR/${name}.body"
  local status_file="$TMP_DIR/${name}.status"
  local status
  local idem

  idem="$(smoke_idempotency_key "$name")"

  status="$(
    curl -sS \
      -o "$out" \
      -w "%{http_code}" \
      -X POST \
      "$GATEWAY_URL$path" \
      -H "Authorization: $CRABLINK_AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -H "x-ron-passport: $CRABLINK_PASSPORT" \
      -H "x-ron-wallet-account: $CRABLINK_WALLET_ACCOUNT" \
      -H "x-correlation-id: ${CORR_PREFIX}-${name}" \
      -H "x-request-id: ${CORR_PREFIX}-${name}" \
      -H "idempotency-key: $idem" \
      --data "$body"
  )"

  printf '%s' "$status" > "$status_file"
  printf '%s' "$out"
}

curl_gateway_raw_get() {
  local path="$1"
  local name="$2"

  local out="$TMP_DIR/${name}.raw"
  local headers="$TMP_DIR/${name}.headers"
  local status

  status="$(
    curl -sS \
      -D "$headers" \
      -o "$out" \
      -w "%{http_code}" \
      "$GATEWAY_URL$path" \
      -H "Authorization: $CRABLINK_AUTH_HEADER" \
      -H "Accept: image/png,image/jpeg,image/webp,image/*,*/*;q=0.8" \
      -H "x-ron-passport: $CRABLINK_PASSPORT" \
      -H "x-ron-wallet-account: $CRABLINK_WALLET_ACCOUNT" \
      -H "x-correlation-id: ${CORR_PREFIX}-${name}" \
      -H "x-request-id: ${CORR_PREFIX}-${name}"
  )"

  case "$status" in
    200|206)
      echo "ok: GET $path -> HTTP $status raw bytes" >&2
      ;;
    *)
      echo "error: GET $path -> HTTP $status raw bytes" >&2
      cat "$headers" >&2 || true
      echo >&2
      exit 1
      ;;
  esac

  printf '%s' "$out"
}

validate_wallet() {
  local file="$1"
  local require_ledger="$2"

  validate_json_object "$file" "wallet balance"

  require_json_eq "$file" '.schema' 'crablink.wallet.balance.v1' 'wallet schema'
  require_json_eq "$file" '.account' "$CRABLINK_WALLET_ACCOUNT" 'wallet account'
  require_json_eq "$file" '.unit' 'ROC' 'wallet unit'
  require_json_string "$file" '.available_minor_units' 'available_minor_units'
  require_json_string "$file" '.display' 'wallet display'

  if [[ "$require_ledger" == "1" ]]; then
    require_json_eq "$file" '.ledger_backed | tostring' 'true' 'wallet ledger_backed'
    require_json_eq "$file" '.source' 'svc_wallet.v1' 'wallet source'
  fi

  echo "wallet JSON: ok"
}

validate_builtin() {
  local file="$1"
  local expected_url="$2"
  local expected_status="$3"

  validate_json_object "$file" "$expected_url"

  require_json_eq "$file" '.schema' 'omnigate.builtin-page.v1' "builtin schema for $expected_url"
  require_json_eq "$file" '.url' "$expected_url" "builtin URL for $expected_url"
  require_json_eq "$file" '.status' "$expected_status" "builtin status for $expected_url"
  require_json_string "$file" '.title' "builtin title for $expected_url"

  echo "builtin JSON: $expected_url -> $expected_status"
}

validate_asset_page() {
  local file="$1"

  validate_json_object "$file" "asset page"

  require_json_eq "$file" '.schema' 'omnigate.asset-page.v1' 'asset page schema'
  require_json_one_of "$file" '.asset_kind' 'asset kind' 'image'
  require_json_string "$file" '.links.crab // .crab_url // .url' 'asset crab URL'

  echo "asset page JSON: ok"
}

validate_site_prepare() {
  local file="$1"

  validate_json_object "$file" "site prepare"

  require_json_eq "$file" '.schema' 'omnigate.site-prepare.v1' 'site prepare schema'
  require_json_eq "$file" '.site_name' 'crablink-smoke-site' 'site name'
  require_json_one_of "$file" '.action' 'site prepare action' 'paid_site_launch' 'paid_storage_put'
  require_json_one_of "$file" '.asset | ascii_downcase' 'site prepare asset' 'roc'
  require_positive_integer_string "$file" '.total_bytes | tostring' 'site total_bytes'
  require_json_eq "$file" '.wallet_hold.required | tostring' 'true' 'site wallet hold required'
  require_json_eq "$file" '.wallet_hold.currency' 'ROC' 'site wallet hold currency'
  require_json_eq "$file" '.wallet_hold.payer_account' "$CRABLINK_WALLET_ACCOUNT" 'site wallet hold payer'

  echo "site prepare JSON: ok"
}

validate_image_prepare() {
  local file="$1"
  local amount

  validate_json_object "$file" "image prepare"

  require_json_eq "$file" '.schema' 'omnigate.image-asset-prepare.v1' 'image prepare schema'
  require_json_one_of "$file" '.action' 'image prepare action' 'paid_storage_put'
  require_json_one_of "$file" '.asset | ascii_downcase' 'image prepare asset' 'roc'
  require_positive_integer_string "$file" '.bytes | tostring' 'image bytes'
  require_json_eq "$file" '.wallet_hold.required | tostring' 'true' 'image wallet hold required'
  require_json_eq "$file" '.wallet_hold.currency' 'ROC' 'image wallet hold currency'
  require_json_eq "$file" '.wallet_hold.payer_account' "$CRABLINK_WALLET_ACCOUNT" 'image wallet hold payer'

  amount="$(json_value "$file" '.wallet_hold.amount_minor // .paid_storage.estimate.amount_minor // .paid_storage.estimate.amount_minor_units // .paid_storage.estimate.amount')"

  if [[ ! "$amount" =~ ^[0-9]+$ || "$amount" == "0" ]]; then
    echo "error: image prepare amount is not positive"
    cat "$file"
    echo
    exit 1
  fi

  if [[ -n "$CRABLINK_SMOKE_EXPECT_IMAGE_PRICE" && "$amount" != "$CRABLINK_SMOKE_EXPECT_IMAGE_PRICE" ]]; then
    echo "error: image prepare amount did not match CRABLINK_SMOKE_EXPECT_IMAGE_PRICE"
    echo "expected: $CRABLINK_SMOKE_EXPECT_IMAGE_PRICE"
    echo "actual:   $amount"
    cat "$file"
    echo
    exit 1
  fi

  echo "image prepare JSON: ok"
}

validate_bootstrap() {
  local file="$1"

  validate_json_object "$file" "passport bootstrap"

  require_json_eq "$file" '.schema' 'crablink.identity.bootstrap.v1' 'bootstrap schema'
  require_json_eq "$file" '.passport.subject' "$CRABLINK_PASSPORT" 'bootstrap passport subject'
  require_json_eq "$file" '.wallet.account' "$CRABLINK_WALLET_ACCOUNT" 'bootstrap wallet account'
  require_json_eq "$file" '.starter_grant.issued | tostring' 'true' 'starter grant issued'
  require_json_eq "$file" '.starter_grant.amount_minor_units' '1776' 'starter grant amount'
  require_json_string "$file" '.starter_grant.receipt_id' 'starter grant receipt_id'

  echo "bootstrap JSON: ok"
}

validate_wallet_hold() {
  local file="$1"

  validate_json_object "$file" "wallet hold"

  require_json_string "$file" '.txid // .tx_id // .hold_id // .receipt_id' 'wallet hold txid'
  require_json_string "$file" '.receipt_hash // .receiptHash // .receipt.hash' 'wallet hold receipt_hash'
  require_positive_integer_string "$file" '.amount_minor // .amount_minor_units // .amount' 'wallet hold amount'

  echo "wallet hold JSON: ok"
}

validate_image_upload() {
  local file="$1"
  local crab_url

  validate_json_object "$file" "image upload"

  require_json_eq "$file" '.schema' 'omnigate.image-asset-upload.v1' 'image upload schema'
  require_json_string "$file" '.asset_cid // .asset.cid // .asset.b3 // .content_id' 'image upload asset cid'
  require_json_string "$file" '.manifest_cid // .manifest.manifest_cid // .manifest.cid // .manifest_b3 // .manifest_id' 'image upload manifest cid'
  require_json_string "$file" '.crab_url // .links.crab // .asset.crab_url' 'image upload crab URL'

  crab_url="$(json_value "$file" '.crab_url // .links.crab // .asset.crab_url')"

  if [[ ! "$crab_url" =~ ^crab://[0-9a-f]{64}\.image$ ]]; then
    echo "error: image upload crab_url is not canonical"
    echo "actual: $crab_url"
    cat "$file"
    echo
    exit 1
  fi

  echo "image upload JSON: ok"
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

  if [[ "$message" =~ expected[[:space:]]+([1-9][0-9]*) ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
    return 0
  fi

  return 1
}

build_hold_body() {
  local amount="$1"
  local nonce="$2"
  local idem

  idem="img-hold:$(corr_short):${nonce}"

  jq -n \
    --arg from "$CRABLINK_WALLET_ACCOUNT" \
    --arg to "$CRABLINK_ESCROW_ACCOUNT" \
    --arg amount "$amount" \
    --argjson nonce "$nonce" \
    --arg idem "$idem" \
    '{
      from: $from,
      to: $to,
      asset: "roc",
      amount_minor: $amount,
      nonce: $nonce,
      memo: "CrabLink opt-in paid image smoke hold",
      idempotency_key: $idem
    }'
}

create_wallet_hold_with_nonce_retry() {
  local amount="$1"
  local nonce="$CRABLINK_SMOKE_HOLD_NONCE"
  local body
  local hold_file
  local status
  local expected
  local label

  if [[ ! "$nonce" =~ ^[1-9][0-9]*$ ]]; then
    echo "error: CRABLINK_SMOKE_HOLD_NONCE must be a positive integer"
    echo "actual: $nonce"
    exit 1
  fi

  label="img_hold_n${nonce}"
  body="$(build_hold_body "$amount" "$nonce")"
  hold_file="$(curl_gateway_status_post_json "/wallet/hold" "$label" "$body")"
  status="$(cat "$TMP_DIR/${label}.status")"

  if [[ "$status" =~ ^20[0-9]$ ]]; then
    echo "ok: POST /wallet/hold -> HTTP $status" >&2
    printf '%s' "$hold_file"
    return 0
  fi

  if [[ "$status" == "409" ]] && expected="$(expected_nonce_from_error_file "$hold_file")"; then
    echo "warn: POST /wallet/hold -> HTTP 409 NONCE_CONFLICT; retrying once with expected nonce $expected" >&2

    label="img_hold_r${expected}"
    body="$(build_hold_body "$amount" "$expected")"
    hold_file="$(curl_gateway_status_post_json "/wallet/hold" "$label" "$body")"
    status="$(cat "$TMP_DIR/${label}.status")"

    if [[ "$status" =~ ^20[0-9]$ ]]; then
      echo "ok: POST /wallet/hold -> HTTP $status after nonce retry" >&2
      printf '%s' "$hold_file"
      return 0
    fi
  fi

  echo "error: POST /wallet/hold -> HTTP $status" >&2
  cat "$hold_file" >&2
  echo >&2
  exit 1
}

curl_gateway_file_upload() {
  local path="$1"
  local name="$2"
  local file="$3"
  local hold_file="$4"
  local title="$5"
  local description="$6"
  local tags="$7"

  local out="$TMP_DIR/${name}.body"
  local status
  local txid
  local receipt_hash
  local hold_from
  local hold_to
  local hold_amount
  local idem

  txid="$(json_value "$hold_file" '.txid // .tx_id // .hold_id // .receipt_id')"
  receipt_hash="$(json_value "$hold_file" '.receipt_hash // .receiptHash // .receipt.hash')"
  hold_from="$(json_value "$hold_file" '.from')"
  hold_to="$(json_value "$hold_file" '.to')"
  hold_amount="$(json_value "$hold_file" '.amount_minor // .amount_minor_units // .amount')"
  idem="$(smoke_idempotency_key "$name")"

  if [[ -z "$hold_from" || "$hold_from" == "null" ]]; then
    hold_from="$CRABLINK_WALLET_ACCOUNT"
  fi

  if [[ -z "$hold_to" || "$hold_to" == "null" ]]; then
    hold_to="$CRABLINK_ESCROW_ACCOUNT"
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

  if [[ ! "$hold_amount" =~ ^[0-9]+$ || "$hold_amount" == "0" ]]; then
    echo "error: wallet hold response missing positive amount"
    cat "$hold_file"
    echo
    exit 1
  fi

  status="$(
    curl -sS \
      -o "$out" \
      -w "%{http_code}" \
      -X POST \
      "$GATEWAY_URL$path" \
      -H "Authorization: $CRABLINK_AUTH_HEADER" \
      -H "Accept: application/json" \
      -H "Content-Type: image/png" \
      -H "x-ron-passport: $CRABLINK_PASSPORT" \
      -H "x-ron-wallet-account: $CRABLINK_WALLET_ACCOUNT" \
      -H "x-correlation-id: ${CORR_PREFIX}-${name}" \
      -H "x-request-id: ${CORR_PREFIX}-${name}" \
      -H "idempotency-key: $idem" \
      -H "x-ron-paid-op: hold" \
      -H "x-ron-paid-asset: roc" \
      -H "x-ron-paid-estimate-minor: $hold_amount" \
      -H "x-ron-wallet-txid: $txid" \
      -H "x-ron-wallet-receipt-hash: $receipt_hash" \
      -H "x-ron-wallet-from: $hold_from" \
      -H "x-ron-wallet-to: $hold_to" \
      -H "x-ron-asset-title: $title" \
      -H "x-ron-asset-description: $description" \
      -H "x-ron-asset-tags: $tags" \
      --data-binary "@$file"
  )"

  case "$status" in
    200|201|202|204)
      echo "ok: POST $path -> HTTP $status" >&2
      ;;
    *)
      echo "error: POST $path -> HTTP $status" >&2
      cat "$out" >&2
      echo >&2
      exit 1
      ;;
  esac

  printf '%s' "$out"
}

crab_hash() {
  local crab_url="$1"
  local hash

  hash="$(printf '%s' "$crab_url" | sed -E 's#^crab://([0-9a-f]{64})\.[A-Za-z0-9_-]+$#\1#')"

  if [[ ! "$hash" =~ ^[0-9a-f]{64}$ ]]; then
    echo "error: not a canonical crab asset URL: $crab_url" >&2
    exit 1
  fi

  printf '%s' "$hash"
}

asset_cid_from_asset_page() {
  local file="$1"
  local cid
  local crab_url
  local hash

  cid="$(json_value "$file" '.asset_cid // .content_id // .asset.cid // .asset.b3')"

  if [[ "$cid" =~ ^b3:[0-9a-f]{64}$ ]]; then
    printf '%s' "$cid"
    return 0
  fi

  if [[ "$cid" =~ ^[0-9a-f]{64}$ ]]; then
    printf 'b3:%s' "$cid"
    return 0
  fi

  crab_url="$(json_value "$file" '.links.crab // .crab_url // .url')"
  hash="$(crab_hash "$crab_url")"
  printf 'b3:%s' "$hash"
}

asset_raw_route_from_page() {
  local file="$1"
  local raw_route
  local cid

  raw_route="$(json_value "$file" '.links.raw // .links.object // .raw_url // .storage.raw_route')"

  if [[ -n "$raw_route" && "$raw_route" != "null" ]]; then
    if [[ "$raw_route" != /* ]]; then
      echo "error: raw route is not gateway-relative: $raw_route" >&2
      cat "$file" >&2
      echo >&2
      exit 1
    fi

    printf '%s' "$raw_route"
    return 0
  fi

  cid="$(asset_cid_from_asset_page "$file")"
  printf '/o/%s' "$cid"
}

validate_raw_nonempty() {
  local raw_file="$1"
  local label="$2"
  local bytes

  bytes="$(wc -c < "$raw_file" | tr -d '[:space:]')"

  if [[ ! "$bytes" =~ ^[0-9]+$ || "$bytes" == "0" ]]; then
    echo "error: $label raw response was empty"
    exit 1
  fi

  echo "raw bytes: $label -> $bytes bytes"
}

validate_raw_matches() {
  local raw_file="$1"
  local expected_file="$2"
  local label="$3"

  validate_raw_nonempty "$raw_file" "$label"

  if ! cmp -s "$expected_file" "$raw_file"; then
    echo "error: $label raw bytes differ from uploaded fixture"
    echo "expected: $expected_file"
    echo "actual:   $raw_file"
    exit 1
  fi

  echo "raw byte match: $label"
}

verify_asset_raw_bytes() {
  local asset_page_file="$1"
  local expected_file="$2"
  local name="$3"
  local raw_route
  local raw_file

  raw_route="$(asset_raw_route_from_page "$asset_page_file")"
  raw_file="$(curl_gateway_raw_get "$raw_route" "$name")"

  if [[ -n "$expected_file" ]]; then
    validate_raw_matches "$raw_file" "$expected_file" "$name"
  else
    validate_raw_nonempty "$raw_file" "$name"
  fi
}

run_prepare_smoke() {
  local site_body
  local image_body
  local site_file
  local image_file

  site_body="$(
    jq -n \
      --arg site_name "crablink-smoke-site" \
      --arg payer "$CRABLINK_WALLET_ACCOUNT" \
      --arg passport "$CRABLINK_PASSPORT" \
      --arg idem "crablink-smoke:site:prepare" \
      '{
        site_name: $site_name,
        files: [
          { path: "index.html", bytes: 512 },
          { path: "assets/site.css", bytes: 128 }
        ],
        payer_account: $payer,
        owner_passport_subject: $passport,
        title: "CrabLink Smoke Site",
        description: "Non-mutating CrabLink smoke for /sites/prepare.",
        client_idempotency_key: $idem
      }'
  )"

  site_file="$(curl_gateway POST "/sites/prepare" "site_prepare" "$site_body")"
  validate_site_prepare "$site_file"

  image_body="$(
    jq -n \
      --arg payer "$CRABLINK_WALLET_ACCOUNT" \
      --arg passport "$CRABLINK_PASSPORT" \
      --arg idem "crablink-smoke:image:prepare" \
      '{
        bytes: 68,
        payer_account: $payer,
        owner_passport_subject: $passport,
        content_type: "image/png",
        title: "CrabLink Smoke Image",
        description: "Non-mutating CrabLink smoke for /assets/image/prepare.",
        tags: ["smoke", "crablink"],
        client_idempotency_key: $idem
      }'
  )"

  image_file="$(curl_gateway POST "/assets/image/prepare" "image_prepare" "$image_body")"
  validate_image_prepare "$image_file"
}

run_bootstrap_smoke() {
  local body
  local bootstrap_file
  local wallet_after_file

  body="$(
    jq -n \
      --arg kind "main" \
      --arg label "CrabLink main passport" \
      --arg client "crablink-chrome" \
      --arg amount "1776" \
      '{
        kind: $kind,
        label: $label,
        client: $client,
        request_starter_grant: true,
        create_wallet: true,
        desired_starting_balance_minor_units: $amount
      }'
  )"

  bootstrap_file="$(curl_gateway POST "/identity/passport/bootstrap" "bootstrap" "$body")"
  validate_bootstrap "$bootstrap_file"

  wallet_after_file="$(curl_gateway GET "/wallet/${CRABLINK_WALLET_ACCOUNT}/balance" "wallet_after_bootstrap")"
  validate_wallet "$wallet_after_file" "$CRABLINK_SMOKE_REQUIRE_LEDGER"
}

run_known_good_raw_smoke() {
  local encoded_crab_url
  local resolve_file

  echo
  echo "running known-good asset raw preview smoke"
  echo "known-good URL: $CRABLINK_SMOKE_KNOWN_GOOD_CRAB_URL"

  encoded_crab_url="$(url_encode "$CRABLINK_SMOKE_KNOWN_GOOD_CRAB_URL")"
  resolve_file="$(curl_gateway GET "/crab/resolve?url=${encoded_crab_url}" "known_good_resolve")"
  validate_asset_page "$resolve_file"
  verify_asset_raw_bytes "$resolve_file" "" "known_good_raw"

  echo "known-good raw preview JSON/bytes: ok"
}

run_paid_upload_smoke() {
  local tiny_png
  local bytes
  local prepare_body
  local prepare_file
  local hold_file
  local upload_file
  local resolve_file
  local wallet_after_file
  local amount
  local crab_url
  local encoded_crab_url
  local prepare_idem

  tiny_png="$TMP_DIR/tiny-crablink-smoke.png"
  decode_tiny_png "$tiny_png"
  bytes="$(wc -c < "$tiny_png" | tr -d '[:space:]')"
  prepare_idem="img-prep:$(corr_short):${bytes}"

  prepare_body="$(
    jq -n \
      --argjson bytes "$bytes" \
      --arg payer "$CRABLINK_WALLET_ACCOUNT" \
      --arg passport "$CRABLINK_PASSPORT" \
      --arg idem "$prepare_idem" \
      '{
        bytes: $bytes,
        payer_account: $payer,
        owner_passport_subject: $passport,
        content_type: "image/png",
        title: "Tiny CrabLink Smoke Image",
        description: "Opt-in CrabLink paid image upload smoke.",
        tags: ["crablink", "smoke", "image"],
        client_idempotency_key: $idem
      }'
  )"

  prepare_file="$(curl_gateway POST "/assets/image/prepare" "paid_image_prepare" "$prepare_body")"
  validate_image_prepare "$prepare_file"

  amount="$(json_value "$prepare_file" '.wallet_hold.amount_minor // .paid_storage.estimate.amount_minor // .paid_storage.estimate.amount_minor_units // .paid_storage.estimate.amount')"

  if [[ ! "$amount" =~ ^[0-9]+$ || "$amount" == "0" ]]; then
    echo "error: paid image prepare did not return positive amount"
    cat "$prepare_file"
    echo
    exit 1
  fi

  hold_file="$(create_wallet_hold_with_nonce_retry "$amount")"
  validate_wallet_hold "$hold_file"

  upload_file="$(
    curl_gateway_file_upload \
      "/assets/image" \
      "paid_image_upload" \
      "$tiny_png" \
      "$hold_file" \
      "Tiny CrabLink Smoke Image" \
      "Opt-in CrabLink paid image upload smoke." \
      "crablink,smoke,image"
  )"

  validate_image_upload "$upload_file"

  crab_url="$(json_value "$upload_file" '.crab_url // .links.crab // .asset.crab_url')"
  encoded_crab_url="$(url_encode "$crab_url")"
  resolve_file="$(curl_gateway GET "/crab/resolve?url=${encoded_crab_url}" "paid_image_resolve")"
  validate_asset_page "$resolve_file"
  verify_asset_raw_bytes "$resolve_file" "$tiny_png" "paid_image_raw"

  wallet_after_file="$(curl_gateway GET "/wallet/${CRABLINK_WALLET_ACCOUNT}/balance" "wallet_after_upload")"
  validate_wallet "$wallet_after_file" "$CRABLINK_SMOKE_REQUIRE_LEDGER"

  echo "paid image upload JSON/raw bytes: ok"
  echo "paid image crab URL: $crab_url"
}

need_cmd jq
need_cmd curl
need_cmd base64
need_cmd wc
need_cmd tr
need_cmd sed
need_cmd cmp

health_file="$(curl_gateway GET "/healthz" "healthz")"
ready_file="$(curl_gateway GET "/readyz" "readyz")"

: "$health_file"
: "$ready_file"

identity_file="$(curl_gateway GET "/identity/me" "identity_me")"
validate_json_object "$identity_file" "identity/me"

wallet_file="$(curl_gateway GET "/wallet/${CRABLINK_WALLET_ACCOUNT}/balance" "wallet_before")"
validate_wallet "$wallet_file" "$CRABLINK_SMOKE_REQUIRE_LEDGER"

b3_file="$(curl_gateway GET "/b3/${SAMPLE_HASH}.image" "b3_image")"
validate_asset_page "$b3_file"

encoded_sample="$(url_encode "crab://${SAMPLE_HASH}.image")"
crab_file="$(curl_gateway GET "/crab/resolve?url=${encoded_sample}" "crab_image")"
validate_asset_page "$crab_file"

for item in site image music article; do
  encoded="$(url_encode "crab://${item}")"
  builtin_file="$(curl_gateway GET "/crab/resolve?url=${encoded}" "builtin_${item}")"

  case "$item" in
    site|image)
      validate_builtin "$builtin_file" "crab://${item}" "active"
      ;;
    music|article)
      validate_builtin "$builtin_file" "crab://${item}" "coming_soon"
      ;;
  esac
done

if [[ "$CRABLINK_SMOKE_RUN_PREPARE" == "1" ]]; then
  run_prepare_smoke
else
  echo "skip: prepare routes; set CRABLINK_SMOKE_RUN_PREPARE=1 to include them"
fi

if [[ "$CRABLINK_SMOKE_RUN_KNOWN_GOOD" == "1" ]]; then
  run_known_good_raw_smoke
else
  echo "skip: known-good raw preview; set CRABLINK_SMOKE_RUN_KNOWN_GOOD=1 to verify $CRABLINK_SMOKE_KNOWN_GOOD_CRAB_URL"
fi

if [[ "$CRABLINK_SMOKE_RUN_BOOTSTRAP" == "1" ]]; then
  run_bootstrap_smoke
else
  echo "skip: /identity/passport/bootstrap; set CRABLINK_SMOKE_RUN_BOOTSTRAP=1 to include mutation route"
fi

if [[ "$CRABLINK_SMOKE_RUN_UPLOAD" == "1" ]]; then
  echo
  echo "running opt-in paid image upload smoke"
  run_paid_upload_smoke
else
  echo "skip: paid image upload; set CRABLINK_SMOKE_RUN_UPLOAD=1 to include paid hold/upload/raw-byte route"
fi

echo
echo "CrabLink local gateway smoke passed."
echo "artifacts: $TMP_DIR"