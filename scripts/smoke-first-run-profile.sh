#!/usr/bin/env bash
# RO:WHAT — Optional live smoke for CrabLink first-run passport + @username profile confirmation.
# RO:WHY — NEXT_LEVEL first-run identity UX; proves Create / Request behavior end-to-end through public gateway routes.
# RO:INTERACTS — svc-gateway /identity/passport/bootstrap, /identity/passport/profile/claim, /identity/passport/profile/:username.
# RO:INVARIANTS — gateway-only; no direct svc-passport/wallet calls; no local username confirmation; no private keys; no silent spend.
# RO:METRICS — sends x-correlation-id and x-request-id for backend log correlation.
# RO:CONFIG — GATEWAY_URL, CRABLINK_FIRST_RUN_USERNAME, CRABLINK_FIRST_RUN_PASSPORT, CRABLINK_FIRST_RUN_WALLET.
# RO:SECURITY — optional dev Authorization header only; does not store tokens; does not expose key material.
# RO:TEST — run with CRABLINK_GREEN_RUN_FIRST_RUN_PROFILE=1 scripts/green-gate-local.sh or directly.

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-${CRABLINK_GATEWAY_URL:-http://127.0.0.1:8090}}"
GATEWAY_URL="${GATEWAY_URL%/}"

CORR_PREFIX="crablink-first-run-$(date +%Y%m%d-%H%M%S)"
TMP_ROOT="${TMPDIR:-/tmp}"
TMP_ROOT="${TMP_ROOT%/}"
TMP_DIR="${TMP_ROOT}/${CORR_PREFIX}"

DEFAULT_USERNAME="first$(date +%m%d%H%M%S)"
CRABLINK_FIRST_RUN_USERNAME="${CRABLINK_FIRST_RUN_USERNAME:-$DEFAULT_USERNAME}"
CRABLINK_FIRST_RUN_USERNAME="$(printf '%s' "$CRABLINK_FIRST_RUN_USERNAME" | tr '[:upper:]' '[:lower:]' | sed 's/^@//')"

CRABLINK_FIRST_RUN_HANDLE="@${CRABLINK_FIRST_RUN_USERNAME}"
CRABLINK_FIRST_RUN_PASSPORT="${CRABLINK_FIRST_RUN_PASSPORT:-passport:main:${CRABLINK_FIRST_RUN_USERNAME}}"
CRABLINK_FIRST_RUN_WALLET="${CRABLINK_FIRST_RUN_WALLET:-acct_${CRABLINK_FIRST_RUN_USERNAME}}"
CRABLINK_FIRST_RUN_DISPLAY_NAME="${CRABLINK_FIRST_RUN_DISPLAY_NAME:-CrabLink First Run}"
CRABLINK_FIRST_RUN_BIO="${CRABLINK_FIRST_RUN_BIO:-First-run gateway-only profile confirmation smoke.}"
CRABLINK_FIRST_RUN_AVATAR="${CRABLINK_FIRST_RUN_AVATAR:-crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image}"
CRABLINK_FIRST_RUN_AUTH_HEADER="${CRABLINK_FIRST_RUN_AUTH_HEADER:-Bearer ${CRABLINK_AUTH_TOKEN:-dev}}"
CRABLINK_FIRST_RUN_ALLOW_EXISTING="${CRABLINK_FIRST_RUN_ALLOW_EXISTING:-0}"
CRABLINK_FIRST_RUN_EXPECT_GRANT="${CRABLINK_FIRST_RUN_EXPECT_GRANT:-0}"

mkdir -p "$TMP_DIR"

echo "CrabLink first-run profile smoke"
echo "gateway:      $GATEWAY_URL"
echo "username:     $CRABLINK_FIRST_RUN_HANDLE"
echo "passport:     $CRABLINK_FIRST_RUN_PASSPORT"
echo "wallet:       $CRABLINK_FIRST_RUN_WALLET"
echo "avatar:       $CRABLINK_FIRST_RUN_AVATAR"
echo "allow exists: $CRABLINK_FIRST_RUN_ALLOW_EXISTING"
echo "expect grant: $CRABLINK_FIRST_RUN_EXPECT_GRANT"
echo "artifacts:    $TMP_DIR"
echo

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: $1 is required for first-run profile smoke validation"
    exit 1
  fi
}

corr_short() {
  printf '%s' "${CORR_PREFIX#crablink-first-run-}"
}

idem() {
  local name="$1"
  local raw

  raw="clfr:$(corr_short):${name}:${CRABLINK_FIRST_RUN_USERNAME}"
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
    422) printf 'UNPROCESSABLE_ENTITY' ;;
    502) printf 'BAD_GATEWAY' ;;
    503) printf 'UNAVAILABLE' ;;
    *) printf 'HTTP_%s' "$status" ;;
  esac
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

explain_upstream_failure() {
  local file="$1"
  local code
  local reason

  code="$(problem_code "$file")"
  reason="$(problem_reason "$file")"

  echo
  echo "diagnostic: first-run route returned HTTP 502"
  echo "code:       ${code:-unknown}"
  echo "reason:     ${reason:-unknown}"
  echo
  echo "Most likely cause:"
  echo "- svc-gateway is up"
  echo "- omnigate is up"
  echo "- but an upstream dependency is unreachable"
  echo
  echo "Expected local dependencies:"
  echo "- svc-wallet should be reachable at http://127.0.0.1:8088"
  echo "- svc-passport should be reachable by omnigate at http://127.0.0.1:5307"
  echo "- omnigate should be started with OMNIGATE_WALLET_BASE_URL and OMNIGATE_PASSPORT_BASE_URL"
  echo
  echo "Response body:"
  print_json_or_raw "$file"
}

explain_bad_request() {
  local label="$1"
  local file="$2"
  local code
  local reason

  code="$(problem_code "$file")"
  reason="$(problem_reason "$file")"

  echo "error: $label expected HTTP 200/201, got HTTP 400 BAD_REQUEST"
  echo "code:  ${code:-unknown}"
  echo "reason:${reason:-unknown}"
  echo
  echo "Likely request validation issue. Current claim request fields:"
  echo "- passport_subject: $CRABLINK_FIRST_RUN_PASSPORT"
  echo "- requested_username: $CRABLINK_FIRST_RUN_HANDLE"
  echo "- display_name: $CRABLINK_FIRST_RUN_DISPLAY_NAME"
  echo "- bio: $CRABLINK_FIRST_RUN_BIO"
  echo "- avatar_image: $CRABLINK_FIRST_RUN_AVATAR"
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
    400)
      explain_bad_request "$label" "$file"
      exit 1
      ;;
    502)
      echo "error: $label expected HTTP 200/201, got HTTP $status $(http_status_name "$status")"
      explain_upstream_failure "$file"
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

post_json() {
  local route="$1"
  local out="$2"
  local body_file="$3"
  local idempotency="$4"
  local status

  status="$(
    curl -sS \
      -o "$out" \
      -w '%{http_code}' \
      -X POST "${GATEWAY_URL}${route}" \
      -H 'accept: application/json' \
      -H 'content-type: application/json' \
      -H "authorization: ${CRABLINK_FIRST_RUN_AUTH_HEADER}" \
      -H "idempotency-key: ${idempotency}" \
      -H "x-correlation-id: ${CORR_PREFIX}" \
      -H "x-request-id: ${CORR_PREFIX}" \
      -H "x-ron-passport: ${CRABLINK_FIRST_RUN_PASSPORT}" \
      -H "x-ron-wallet-account: ${CRABLINK_FIRST_RUN_WALLET}" \
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
      -H "authorization: ${CRABLINK_FIRST_RUN_AUTH_HEADER}" \
      -H "x-correlation-id: ${CORR_PREFIX}" \
      -H "x-request-id: ${CORR_PREFIX}" \
      -H "x-ron-passport: ${CRABLINK_FIRST_RUN_PASSPORT}" \
      -H "x-ron-wallet-account: ${CRABLINK_FIRST_RUN_WALLET}"
  )"

  printf '%s' "$status"
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

bootstrap_filter() {
  cat <<'EOF'
if type == "object" then
  .
else
  {}
end
EOF
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
    print_json_or_raw "$file"
    exit 1
  fi

  echo "ok: $label = $actual"
}

first_present() {
  local file="$1"
  local filter="$2"

  jq -r "$filter // empty" "$file"
}

assert_bootstrap_response() {
  local file="$1"

  jq empty "$file"

  local subject
  local wallet
  local username_status
  local handle

  subject="$(first_present "$file" "$(bootstrap_filter) | .passport.subject // .passport_subject // .passportSubject")"
  wallet="$(first_present "$file" "$(bootstrap_filter) | .wallet.account // .wallet_account // .walletAccount")"
  handle="$(first_present "$file" "$(bootstrap_filter) | .profile.handle // .handle // .requested_handle // .requestedHandle")"
  username_status="$(first_present "$file" "$(bootstrap_filter) | .profile.username_status // .profile.usernameStatus // .username_status // .usernameStatus")"

  if [[ -n "$subject" ]]; then
    echo "ok: bootstrap passport subject = $subject"
  else
    echo "note: bootstrap passport subject not returned; continuing because profile claim uses request passport header"
  fi

  if [[ -n "$wallet" ]]; then
    echo "ok: bootstrap wallet account = $wallet"
  else
    echo "note: bootstrap wallet account not returned"
  fi

  if [[ -n "$handle" ]]; then
    echo "ok: bootstrap handle echo = $handle"
  else
    echo "note: bootstrap did not echo handle"
  fi

  if [[ -n "$username_status" ]]; then
    echo "ok: bootstrap username_status echo = $username_status"
  else
    echo "note: bootstrap did not return username_status; profile claim route remains authoritative"
  fi

  if [[ "$CRABLINK_FIRST_RUN_EXPECT_GRANT" == "1" ]]; then
    local receipt
    receipt="$(
      jq -r '
        .receipt.id //
        .receipt_id //
        .starter_grant.receipt_id //
        .starter_grant.receipt.id //
        .last_bootstrap_receipt_id //
        empty
      ' "$file"
    )"

    if [[ -z "$receipt" ]]; then
      echo "error: expected starter grant receipt, but bootstrap response did not include one"
      print_json_or_raw "$file"
      exit 1
    fi

    echo "ok: bootstrap starter grant receipt = $receipt"
  fi
}

assert_confirmed_profile() {
  local file="$1"
  local label="$2"

  jq empty "$file"
  require_json_field "$file" "$(profile_filter) | .username // empty" "$CRABLINK_FIRST_RUN_USERNAME" "$label username"
  require_json_field "$file" "$(profile_filter) | .handle // empty" "$CRABLINK_FIRST_RUN_HANDLE" "$label handle"
  require_json_field "$file" "$(profile_filter) | .username_status // .usernameStatus // empty" "confirmed" "$label username_status"

  local profile_url
  profile_url="$(jq -r "$(profile_filter) | .profile_crab_url // .profileCrabUrl // empty" "$file")"

  if [[ "$profile_url" != "crab://${CRABLINK_FIRST_RUN_HANDLE}" ]]; then
    echo "error: $label profile_crab_url expected crab://${CRABLINK_FIRST_RUN_HANDLE}, got '${profile_url}'"
    print_json_or_raw "$file"
    exit 1
  fi

  echo "ok: $label profile_crab_url = $profile_url"

  local public_cid
  public_cid="$(jq -r "$(profile_filter) | .public_profile_cid // .publicProfileCid // empty" "$file")"

  if [[ -n "$public_cid" && "$public_cid" != "null" ]]; then
    echo "ok: $label public_profile_cid = $public_cid"
  else
    echo "note: $label public_profile_cid is null/not published yet"
  fi
}

need_cmd curl
need_cmd jq
need_cmd sed
need_cmd tr
need_cmd grep

if ! printf '%s' "$CRABLINK_FIRST_RUN_USERNAME" | grep -Eq '^[a-z0-9][a-z0-9_.-]{2,31}$'; then
  echo "error: CRABLINK_FIRST_RUN_USERNAME must be 3..32 chars: lowercase letters, numbers, underscore, hyphen, dot; must start with letter/number"
  exit 1
fi

if [[ -z "$CRABLINK_FIRST_RUN_DISPLAY_NAME" || -z "$CRABLINK_FIRST_RUN_BIO" || -z "$CRABLINK_FIRST_RUN_AVATAR" ]]; then
  echo "error: first-run profile smoke requires non-empty display name, bio, and avatar image"
  exit 1
fi

BOOTSTRAP_BODY="$TMP_DIR/bootstrap-request.json"
BOOTSTRAP_OUT="$TMP_DIR/bootstrap-response.json"
CLAIM_BODY="$TMP_DIR/profile-claim-request.json"
CLAIM_OUT="$TMP_DIR/profile-claim-response.json"
READ_OUT="$TMP_DIR/profile-read-response.json"

jq -n \
  --arg passport "$CRABLINK_FIRST_RUN_PASSPORT" \
  --arg wallet "$CRABLINK_FIRST_RUN_WALLET" \
  --arg username "$CRABLINK_FIRST_RUN_USERNAME" \
  --arg handle "$CRABLINK_FIRST_RUN_HANDLE" \
  '{
    kind: "main",
    label: "CrabLink main passport",
    client: "crablink-chrome",
    request_starter_grant: true,
    create_wallet: true,
    desired_starting_balance_minor_units: "1776",
    passport_subject: $passport,
    wallet_account: $wallet,
    requested_username: $username,
    requested_handle: $handle
  }' > "$BOOTSTRAP_BODY"

echo "bootstrap: POST /identity/passport/bootstrap"
BOOTSTRAP_STATUS="$(post_json "/identity/passport/bootstrap" "$BOOTSTRAP_OUT" "$BOOTSTRAP_BODY" "$(idem bootstrap)")"

if [[ "$BOOTSTRAP_STATUS" == "409" && "$CRABLINK_FIRST_RUN_ALLOW_EXISTING" == "1" ]]; then
  echo "note: bootstrap returned HTTP 409; continuing because CRABLINK_FIRST_RUN_ALLOW_EXISTING=1"
  print_json_or_raw "$BOOTSTRAP_OUT"
else
  require_http_ok "/identity/passport/bootstrap" "$BOOTSTRAP_STATUS" "$BOOTSTRAP_OUT"
  assert_bootstrap_response "$BOOTSTRAP_OUT"
fi

echo
jq -n \
  --arg passport "$CRABLINK_FIRST_RUN_PASSPORT" \
  --arg username "$CRABLINK_FIRST_RUN_HANDLE" \
  --arg display "$CRABLINK_FIRST_RUN_DISPLAY_NAME" \
  --arg bio "$CRABLINK_FIRST_RUN_BIO" \
  --arg avatar "$CRABLINK_FIRST_RUN_AVATAR" \
  '{
    passport_subject: $passport,
    requested_username: $username,
    display_name: $display,
    bio: $bio,
    avatar_image: $avatar
  }' > "$CLAIM_BODY"

echo "claim: POST /identity/passport/profile/claim"
CLAIM_STATUS="$(post_json "/identity/passport/profile/claim" "$CLAIM_OUT" "$CLAIM_BODY" "$(idem claim)")"

if [[ "$CLAIM_STATUS" == "409" && "$CRABLINK_FIRST_RUN_ALLOW_EXISTING" == "1" ]]; then
  echo "note: claim returned HTTP 409; continuing to read because CRABLINK_FIRST_RUN_ALLOW_EXISTING=1"
  print_json_or_raw "$CLAIM_OUT"
else
  require_http_ok "/identity/passport/profile/claim" "$CLAIM_STATUS" "$CLAIM_OUT"
  assert_confirmed_profile "$CLAIM_OUT" "claim"
fi

echo
echo "read: GET /identity/passport/profile/${CRABLINK_FIRST_RUN_USERNAME}"
READ_STATUS="$(get_json "/identity/passport/profile/${CRABLINK_FIRST_RUN_USERNAME}" "$READ_OUT")"
require_http_ok "/identity/passport/profile/${CRABLINK_FIRST_RUN_USERNAME}" "$READ_STATUS" "$READ_OUT"
assert_confirmed_profile "$READ_OUT" "read"

echo
echo "CrabLink first-run profile smoke passed."
echo "artifacts: $TMP_DIR"