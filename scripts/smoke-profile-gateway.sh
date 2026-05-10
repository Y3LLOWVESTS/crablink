#!/usr/bin/env bash
# RO:WHAT — Optional live smoke for CrabLink gateway public profile claim/read routes.
# RO:WHY — NEXT_LEVEL identity truth gate; proves @username claim/read through the public gateway before deeper profile UX.
# RO:INTERACTS — svc-gateway /identity/passport/profile/claim and /identity/passport/profile/:username.
# RO:INVARIANTS — gateway-only by default; profile claim is opt-in/stateful; no wallet mutation; no ROC spend; no local confirmation.
# RO:METRICS — sends x-correlation-id and x-request-id for backend log correlation.
# RO:CONFIG — GATEWAY_URL, CRABLINK_SMOKE_PROFILE_USERNAME, CRABLINK_SMOKE_PROFILE_PASSPORT, CRABLINK_SMOKE_PROFILE_WALLET.
# RO:SECURITY — does not store tokens; optional Authorization header is local-dev only; no private keys or spend authority.
# RO:TEST — run with CRABLINK_GREEN_RUN_PROFILE_CLAIM=1 scripts/green-gate-local.sh or directly.

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-${CRABLINK_GATEWAY_URL:-http://127.0.0.1:8090}}"
GATEWAY_URL="${GATEWAY_URL%/}"

CORR_PREFIX="crablink-profile-smoke-$(date +%Y%m%d-%H%M%S)"
TMP_ROOT="${TMPDIR:-/tmp}"
TMP_ROOT="${TMP_ROOT%/}"
TMP_DIR="${TMP_ROOT}/${CORR_PREFIX}"

DEFAULT_USERNAME="clp$(date +%m%d%H%M%S)"
CRABLINK_SMOKE_PROFILE_USERNAME="${CRABLINK_SMOKE_PROFILE_USERNAME:-$DEFAULT_USERNAME}"
CRABLINK_SMOKE_PROFILE_USERNAME="$(printf '%s' "$CRABLINK_SMOKE_PROFILE_USERNAME" | tr '[:upper:]' '[:lower:]' | sed 's/^@//')"

CRABLINK_SMOKE_PROFILE_HANDLE="@${CRABLINK_SMOKE_PROFILE_USERNAME}"
CRABLINK_SMOKE_PROFILE_PASSPORT="${CRABLINK_SMOKE_PROFILE_PASSPORT:-passport:main:${CRABLINK_SMOKE_PROFILE_USERNAME}}"
CRABLINK_SMOKE_PROFILE_WALLET="${CRABLINK_SMOKE_PROFILE_WALLET:-acct_dev}"
CRABLINK_AUTH_HEADER="${CRABLINK_AUTH_HEADER:-Bearer ${CRABLINK_AUTH_TOKEN:-dev}}"

CRABLINK_SMOKE_PROFILE_DISPLAY_NAME="${CRABLINK_SMOKE_PROFILE_DISPLAY_NAME:-CrabLink Profile Smoke}"
CRABLINK_SMOKE_PROFILE_BIO="${CRABLINK_SMOKE_PROFILE_BIO:-Gateway-only CrabLink profile route smoke.}"
CRABLINK_SMOKE_PROFILE_AVATAR="${CRABLINK_SMOKE_PROFILE_AVATAR:-crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image}"

CRABLINK_SMOKE_PROFILE_RUN_RESERVED="${CRABLINK_SMOKE_PROFILE_RUN_RESERVED:-0}"
CRABLINK_SMOKE_PROFILE_ALLOW_EXISTING="${CRABLINK_SMOKE_PROFILE_ALLOW_EXISTING:-0}"
CRABLINK_SMOKE_PROFILE_PREFLIGHT="${CRABLINK_SMOKE_PROFILE_PREFLIGHT:-1}"

mkdir -p "$TMP_DIR"

echo "CrabLink profile gateway smoke"
echo "gateway:      $GATEWAY_URL"
echo "username:     $CRABLINK_SMOKE_PROFILE_HANDLE"
echo "passport:     $CRABLINK_SMOKE_PROFILE_PASSPORT"
echo "wallet:       $CRABLINK_SMOKE_PROFILE_WALLET"
echo "preflight:    $CRABLINK_SMOKE_PROFILE_PREFLIGHT"
echo "reserved test:$CRABLINK_SMOKE_PROFILE_RUN_RESERVED"
echo "artifacts:    $TMP_DIR"
echo

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: $1 is required for CrabLink profile smoke validation"
    exit 1
  fi
}

corr_short() {
  printf '%s' "${CORR_PREFIX#crablink-profile-smoke-}"
}

smoke_idempotency_key() {
  local name="$1"
  local raw

  raw="clp:$(corr_short):${name}:${CRABLINK_SMOKE_PROFILE_USERNAME}"
  printf '%s' "${raw:0:64}"
}

http_status_name() {
  local status="$1"

  case "$status" in
    200) printf 'OK' ;;
    201) printf 'CREATED' ;;
    400) printf 'BAD_REQUEST' ;;
    404) printf 'NOT_FOUND' ;;
    409) printf 'CONFLICT' ;;
    502) printf 'BAD_GATEWAY' ;;
    503) printf 'UNAVAILABLE' ;;
    *) printf 'HTTP_%s' "$status" ;;
  esac
}

profile_filter() {
  cat <<'EOF'
if type == "object" then
  (.profile // .data // .)
else
  {}
end
EOF
}

print_json_or_raw() {
  local file="$1"

  if jq empty "$file" >/dev/null 2>&1; then
    jq . "$file"
  else
    cat "$file"
    printf '\n'
  fi
}

problem_code() {
  local file="$1"

  if jq empty "$file" >/dev/null 2>&1; then
    jq -r '.code // .reason // .error // empty' "$file"
  else
    printf ''
  fi
}

problem_reason() {
  local file="$1"

  if jq empty "$file" >/dev/null 2>&1; then
    jq -r '.reason // .detail // .message // empty' "$file"
  else
    printf ''
  fi
}

explain_profile_502() {
  local file="$1"
  local code
  local reason

  code="$(problem_code "$file")"
  reason="$(problem_reason "$file")"

  echo
  echo "diagnostic: profile route returned HTTP 502"
  echo "code:       ${code:-unknown}"
  echo "reason:     ${reason:-unknown}"
  echo
  echo "Most likely cause:"
  echo "- svc-gateway is up"
  echo "- omnigate is up"
  echo "- but omnigate cannot reach svc-passport for profile claim/read"
  echo
  echo "Expected local profile dependency:"
  echo "- svc-passport API should be reachable by omnigate"
  echo "- default Omnigate passport upstream is http://127.0.0.1:5307"
  echo "- override with OMNIGATE_PASSPORT_BASE_URL if needed"
  echo
  echo "Suggested RustyOnions startup shape:"
  echo "cd /Users/mymac/Desktop/RustyOnions"
  echo "RUST_LOG=info SVC_PASSPORT_HTTP_ADDR=127.0.0.1:5307 cargo run -p svc-passport"
  echo
  echo "Then restart the CrabLink dev stack with:"
  echo "OMNIGATE_PASSPORT_BASE_URL=http://127.0.0.1:5307 \\"
  echo "OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \\"
  echo "OMNIGATE_WALLET_BEARER=dev \\"
  echo "scripts/web3_crablink_dev_stack.sh"
  echo
  echo "Response body:"
  print_json_or_raw "$file"
}

require_http_ok() {
  local label="$1"
  local status="$2"
  local file="$3"

  case "$status" in
    200|201)
      echo "ok: $label -> HTTP $status $(http_status_name "$status")"
      ;;
    502)
      echo "error: $label expected HTTP 200/201, got HTTP $status $(http_status_name "$status")"
      explain_profile_502 "$file"
      exit 1
      ;;
    *)
      echo "error: $label expected HTTP 200/201, got HTTP $status $(http_status_name "$status")"
      echo "response body:"
      print_json_or_raw "$file"
      exit 1
      ;;
  esac
}

require_json_field() {
  local file="$1"
  local filter="$2"
  local expected="$3"
  local label="$4"
  local actual

  actual="$(jq -r "$filter" "$file")"

  if [[ "$actual" != "$expected" ]]; then
    echo "error: $label expected '$expected' but got '$actual'"
    echo "file: $file"
    jq . "$file" || true
    exit 1
  fi

  echo "ok: $label = $actual"
}

post_json() {
  local route="$1"
  local out="$2"
  local body_file="$3"
  local idem="$4"
  local status

  status="$(
    curl -sS \
      -o "$out" \
      -w '%{http_code}' \
      -X POST "${GATEWAY_URL}${route}" \
      -H 'accept: application/json' \
      -H 'content-type: application/json' \
      -H "authorization: ${CRABLINK_AUTH_HEADER}" \
      -H "idempotency-key: ${idem}" \
      -H "x-correlation-id: ${CORR_PREFIX}" \
      -H "x-request-id: ${CORR_PREFIX}" \
      -H "x-ron-passport: ${CRABLINK_SMOKE_PROFILE_PASSPORT}" \
      -H "x-ron-wallet-account: ${CRABLINK_SMOKE_PROFILE_WALLET}" \
      --data-binary "@${body_file}"
  )"

  printf '%s' "$status"
}

get_json() {
  local route="$1"
  local out="$2"
  local status

  status="$(
    curl -sS \
      -o "$out" \
      -w '%{http_code}' \
      -X GET "${GATEWAY_URL}${route}" \
      -H 'accept: application/json' \
      -H "authorization: ${CRABLINK_AUTH_HEADER}" \
      -H "x-correlation-id: ${CORR_PREFIX}" \
      -H "x-request-id: ${CORR_PREFIX}" \
      -H "x-ron-passport: ${CRABLINK_SMOKE_PROFILE_PASSPORT}" \
      -H "x-ron-wallet-account: ${CRABLINK_SMOKE_PROFILE_WALLET}"
  )"

  printf '%s' "$status"
}

assert_confirmed_profile() {
  local file="$1"
  local label="$2"

  require_json_field "$file" "$(profile_filter) | .username // empty" "$CRABLINK_SMOKE_PROFILE_USERNAME" "$label username"
  require_json_field "$file" "$(profile_filter) | .handle // empty" "$CRABLINK_SMOKE_PROFILE_HANDLE" "$label handle"
  require_json_field "$file" "$(profile_filter) | .username_status // .usernameStatus // empty" "confirmed" "$label username_status"

  local profile_url
  profile_url="$(jq -r "$(profile_filter) | .profile_crab_url // .profileCrabUrl // empty" "$file")"

  if [[ -n "$profile_url" ]]; then
    echo "ok: $label profile_crab_url = $profile_url"
  else
    echo "note: $label profile_crab_url not returned"
  fi

  local public_cid
  public_cid="$(jq -r "$(profile_filter) | .public_profile_cid // .publicProfileCid // empty" "$file")"

  if [[ -n "$public_cid" && "$public_cid" != "null" ]]; then
    echo "ok: $label public_profile_cid = $public_cid"
  else
    echo "note: $label public_profile_cid is null/not published yet"
  fi
}

run_profile_dependency_preflight() {
  local preflight_username="clpprofilepreflightmissing"
  local preflight_out="$TMP_DIR/profile-preflight-response.json"
  local status
  local code

  echo "preflight: GET /identity/passport/profile/${preflight_username}"
  status="$(get_json "/identity/passport/profile/${preflight_username}" "$preflight_out")"

  case "$status" in
    404)
      code="$(problem_code "$preflight_out")"
      if [[ -z "$code" || "$code" == "profile_not_found" || "$code" == "not_found" ]]; then
        echo "ok: profile dependency is reachable; missing profile returned HTTP 404"
        return 0
      fi

      echo "ok: profile dependency returned HTTP 404 with code '${code}'"
      return 0
      ;;
    200)
      echo "ok: profile dependency reachable; preflight username unexpectedly exists"
      return 0
      ;;
    502)
      echo "error: profile dependency preflight returned HTTP 502 BAD_GATEWAY"
      explain_profile_502 "$preflight_out"
      exit 1
      ;;
    *)
      echo "error: profile dependency preflight expected HTTP 404/200, got HTTP $status $(http_status_name "$status")"
      echo "response body:"
      print_json_or_raw "$preflight_out"
      exit 1
      ;;
  esac
}

need_cmd curl
need_cmd jq
need_cmd sed
need_cmd tr
need_cmd grep

if ! printf '%s' "$CRABLINK_SMOKE_PROFILE_USERNAME" | grep -Eq '^[a-z0-9][a-z0-9_.-]{2,31}$'; then
  echo "error: CRABLINK_SMOKE_PROFILE_USERNAME must be 3..32 chars: lowercase letters, numbers, underscore, hyphen, dot; must start with letter/number"
  exit 1
fi

if [[ "$CRABLINK_SMOKE_PROFILE_PREFLIGHT" == "1" ]]; then
  run_profile_dependency_preflight
  echo
fi

CLAIM_BODY="$TMP_DIR/profile-claim.json"
CLAIM_OUT="$TMP_DIR/profile-claim-response.json"
READ_OUT="$TMP_DIR/profile-read-response.json"

jq -n \
  --arg passport "$CRABLINK_SMOKE_PROFILE_PASSPORT" \
  --arg username "$CRABLINK_SMOKE_PROFILE_HANDLE" \
  --arg display "$CRABLINK_SMOKE_PROFILE_DISPLAY_NAME" \
  --arg bio "$CRABLINK_SMOKE_PROFILE_BIO" \
  --arg avatar "$CRABLINK_SMOKE_PROFILE_AVATAR" \
  '{
    passport_subject: $passport,
    requested_username: $username,
    display_name: $display,
    bio: $bio,
    avatar_image: $avatar
  }' > "$CLAIM_BODY"

echo "claim: POST /identity/passport/profile/claim"
CLAIM_STATUS="$(post_json "/identity/passport/profile/claim" "$CLAIM_OUT" "$CLAIM_BODY" "$(smoke_idempotency_key claim)")"

if [[ "$CLAIM_STATUS" == "409" && "$CRABLINK_SMOKE_PROFILE_ALLOW_EXISTING" == "1" ]]; then
  echo "note: claim returned HTTP 409; continuing to read because CRABLINK_SMOKE_PROFILE_ALLOW_EXISTING=1"
else
  require_http_ok "/identity/passport/profile/claim" "$CLAIM_STATUS" "$CLAIM_OUT"
  jq empty "$CLAIM_OUT"
  assert_confirmed_profile "$CLAIM_OUT" "claim"
fi

echo
echo "read: GET /identity/passport/profile/${CRABLINK_SMOKE_PROFILE_USERNAME}"
READ_STATUS="$(get_json "/identity/passport/profile/${CRABLINK_SMOKE_PROFILE_USERNAME}" "$READ_OUT")"
require_http_ok "/identity/passport/profile/${CRABLINK_SMOKE_PROFILE_USERNAME}" "$READ_STATUS" "$READ_OUT"
jq empty "$READ_OUT"
assert_confirmed_profile "$READ_OUT" "read"

if [[ "$CRABLINK_SMOKE_PROFILE_RUN_RESERVED" == "1" ]]; then
  RESERVED_BODY="$TMP_DIR/profile-reserved-claim.json"
  RESERVED_OUT="$TMP_DIR/profile-reserved-response.json"

  jq -n \
    --arg passport "${CRABLINK_SMOKE_PROFILE_PASSPORT}:reserved-check" \
    '{
      passport_subject: $passport,
      requested_username: "@site",
      display_name: "Reserved Name Check",
      bio: "This request should fail.",
      avatar_image: ""
    }' > "$RESERVED_BODY"

  echo
  echo "reserved: POST /identity/passport/profile/claim with @site"
  RESERVED_STATUS="$(post_json "/identity/passport/profile/claim" "$RESERVED_OUT" "$RESERVED_BODY" "$(smoke_idempotency_key reserved)")"

  if [[ "$RESERVED_STATUS" != "400" ]]; then
    echo "error: reserved username check expected HTTP 400, got HTTP $RESERVED_STATUS $(http_status_name "$RESERVED_STATUS")"
    jq . "$RESERVED_OUT" || true
    exit 1
  fi

  RESERVED_CODE="$(jq -r '.code // .reason // .error // empty' "$RESERVED_OUT")"

  if [[ "$RESERVED_CODE" != "reserved_username" ]]; then
    echo "error: reserved username check expected code reserved_username, got '$RESERVED_CODE'"
    jq . "$RESERVED_OUT" || true
    exit 1
  fi

  echo "ok: reserved username rejected with reserved_username"
fi

echo
echo "CrabLink profile gateway smoke passed."
echo "artifacts: $TMP_DIR"