#!/usr/bin/env bash
# RO:WHAT — Live CrabLink smoke for post/comment/article prepare and optional publish route contracts.
# RO:WHY — Locks RustyOnions text-asset backend proof into CrabLink before paid content views and QuickChain.
# RO:INTERACTS — svc-gateway /assets/{post,comment,article}/prepare, /wallet/hold, /assets/{kind}, /crab/resolve, /o/b3:<hash>.
# RO:INVARIANTS — gateway-only; publish is explicit opt-in; no fake CIDs; no fake receipts; no direct internal service calls.
# RO:METRICS — backend emits normal gateway/omnigate/wallet metrics; this script prints proof labels.
# RO:CONFIG — GATEWAY_URL/CRABLINK_GATEWAY_URL, CRABLINK_TEXT_* env vars.
# RO:SECURITY — no tokens printed; no direct svc-wallet/storage/index/omnigate calls; no silent ROC spend.
# RO:TEST — prepare-only: bash scripts/smoke-text-assets-local.sh; publish: CRABLINK_TEXT_RUN_PUBLISH=1 bash scripts/smoke-text-assets-local.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GATEWAY_URL="${GATEWAY_URL:-${CRABLINK_GATEWAY_URL:-http://127.0.0.1:8090}}"
RUN_ID="${CRABLINK_TEXT_SMOKE_RUN_ID:-$(date +%Y%m%d%H%M%S)}"
SHORT_RUN_ID="${RUN_ID: -10}"

PAYER_ACCOUNT="${CRABLINK_TEXT_PAYER_ACCOUNT:-acct_dev}"
OWNER_PASSPORT="${CRABLINK_TEXT_OWNER_PASSPORT:-passport:main:dev}"
SITE_CONTEXT="${CRABLINK_TEXT_SITE_CONTEXT:-crab://ron7}"
PARENT_CRAB_URL="${CRABLINK_TEXT_PARENT_CRAB_URL:-crab://b23f4c579201e17ab391dd3bff54635718a0b4c1371782ef87115b50f80bb1d3.post}"
HERO_IMAGE_CRAB_URL="${CRABLINK_TEXT_HERO_IMAGE_CRAB_URL:-crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image}"

CRABLINK_TEXT_RUN_PUBLISH="${CRABLINK_TEXT_RUN_PUBLISH:-0}"
CRABLINK_TEXT_RUN_RESOLVE="${CRABLINK_TEXT_RUN_RESOLVE:-0}"

CRABLINK_TEXT_POST_URL="${CRABLINK_TEXT_POST_URL:-}"
CRABLINK_TEXT_COMMENT_URL="${CRABLINK_TEXT_COMMENT_URL:-}"
CRABLINK_TEXT_ARTICLE_URL="${CRABLINK_TEXT_ARTICLE_URL:-}"

CRABLINK_TEXT_ESCROW_ACCOUNT="${CRABLINK_TEXT_ESCROW_ACCOUNT:-acct_escrow}"
CRABLINK_TEXT_DEFAULT_ASSET="${CRABLINK_TEXT_DEFAULT_ASSET:-roc}"
CRABLINK_TEXT_HOLD_NONCE="${CRABLINK_TEXT_HOLD_NONCE:-1}"
CRABLINK_TEXT_DEFAULT_AMOUNT_MINOR="${CRABLINK_TEXT_DEFAULT_AMOUNT_MINOR:-}"

OUT_DIR="${CRABLINK_TEXT_SMOKE_OUT_DIR:-dist/text-asset-smoke}"
OUT_ENV_FILE="${OUT_DIR}/last-text-assets.env"
OUT_JSON_FILE="${OUT_DIR}/last-text-assets.json"

NEXT_NONCE="$CRABLINK_TEXT_HOLD_NONCE"

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required for JSON validation"
  exit 1
fi

mkdir -p "$OUT_DIR"

urlencode() {
  node -e 'process.stdout.write(encodeURIComponent(String(process.argv[1] || "")))' "$1"
}

make_post_body() {
  cat <<JSON
{
  "title": "CrabLink smoke post ${RUN_ID}",
  "body": "Gateway-routed post publish smoke from CrabLink. This creates a real b3-backed post only when CRABLINK_TEXT_RUN_PUBLISH=1.",
  "site_context_crab_url": "${SITE_CONTEXT}",
  "creator_display": "CrabLink smoke",
  "language": "en",
  "post_kind": "status",
  "visibility": "public",
  "rights_mode": "standard",
  "moderation_mode": "site_default",
  "content_warning": "",
  "tags": ["smoke", "post", "next-level"],
  "payer_account": "${PAYER_ACCOUNT}",
  "owner_passport_subject": "${OWNER_PASSPORT}",
  "client_idempotency_key": "txt-post-${SHORT_RUN_ID}"
}
JSON
}

make_comment_body() {
  cat <<JSON
{
  "title": "CrabLink smoke comment ${RUN_ID}",
  "body": "Gateway-routed comment publish smoke from CrabLink. This creates a real b3-backed comment only when CRABLINK_TEXT_RUN_PUBLISH=1.",
  "site_context_crab_url": "${SITE_CONTEXT}",
  "parent_crab_url": "${PARENT_CRAB_URL}",
  "thread_context_crab_url": "${PARENT_CRAB_URL}",
  "creator_display": "CrabLink smoke",
  "language": "en",
  "comment_kind": "reply",
  "visibility": "public",
  "rights_mode": "standard",
  "moderation_mode": "site_default",
  "content_warning": "",
  "tags": ["smoke", "comment", "next-level"],
  "payer_account": "${PAYER_ACCOUNT}",
  "owner_passport_subject": "${OWNER_PASSPORT}",
  "client_idempotency_key": "txt-comment-${SHORT_RUN_ID}"
}
JSON
}

make_article_body() {
  cat <<JSON
{
  "title": "CrabLink smoke article ${RUN_ID}",
  "subtitle": "Gateway-routed article publish smoke",
  "summary": "This article smoke proves the strict article route shape with explicit hold proof when CRABLINK_TEXT_RUN_PUBLISH=1.",
  "body": "## CrabLink article smoke\\n\\nThis is a local development publish smoke for the .article route. It should produce a real typed crab:// URL only when publish mode is explicitly enabled.",
  "site_context_crab_url": "${SITE_CONTEXT}",
  "hero_image_crab_url": "${HERO_IMAGE_CRAB_URL}",
  "creator_display": "CrabLink smoke",
  "language": "en",
  "article_kind": "article",
  "visibility": "public",
  "rights_mode": "standard",
  "moderation_mode": "site_default",
  "content_warning": "",
  "tags": ["smoke", "article", "next-level"],
  "payer_account": "${PAYER_ACCOUNT}",
  "owner_passport_subject": "${OWNER_PASSPORT}",
  "client_idempotency_key": "txt-article-${SHORT_RUN_ID}"
}
JSON
}

request_text_ok() {
  local method="$1"
  local path="$2"
  local label="$3"
  local response status payload url

  url="${GATEWAY_URL}${path}"

  response="$(curl -sS -w $'\n%{http_code}' \
    -X "$method" \
    -H "Accept: application/json, text/plain;q=0.9, */*;q=0.8" \
    -H "x-ron-passport: ${OWNER_PASSPORT}" \
    -H "x-ron-wallet-account: ${PAYER_ACCOUNT}" \
    "$url")"

  status="${response##*$'\n'}"
  payload="${response%$'\n'*}"

  if [[ "$status" != "200" && "$status" != "204" ]]; then
    echo "error: ${label} -> HTTP ${status}"
    echo "$payload"
    exit 1
  fi

  if [[ -z "${payload//[[:space:]]/}" && "$status" != "204" ]]; then
    echo "error: ${label} returned an empty body"
    exit 1
  fi

  echo "ok: ${label} -> HTTP ${status}"
}

validate_json_file() {
  local file="$1"
  local label="$2"

  BODY_FILE_FOR_NODE="$file" LABEL_FOR_NODE="$label" node --input-type=module <<'NODE'
import fs from 'node:fs';

const label = process.env.LABEL_FOR_NODE || 'request';
const file = process.env.BODY_FILE_FOR_NODE;
const raw = fs.readFileSync(file, 'utf8');
let parsed;

try {
  parsed = JSON.parse(raw);
} catch (error) {
  console.error(`error: ${label} did not return valid JSON: ${error.message}`);
  console.error(raw);
  process.exit(1);
}

if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
  console.error(`error: ${label} did not return a JSON object`);
  process.exit(1);
}

const schema = String(parsed.schema || parsed.type || '');
const serialized = JSON.stringify(parsed);

if (/problem/i.test(schema) || /"status"\s*:\s*4\d\d/.test(serialized) || /"status"\s*:\s*5\d\d/.test(serialized)) {
  console.error(`error: ${label} returned a problem-like response`);
  console.error(JSON.stringify(parsed, null, 2));
  process.exit(1);
}

console.log(`json: ${label} ok`);
NODE
}

post_json_to_file() {
  local path="$1"
  local body="$2"
  local label="$3"
  local outfile="$4"
  local status url idem

  url="${GATEWAY_URL}${path}"
  idem="txt-${SHORT_RUN_ID}-${label// /-}"

  status="$(curl -sS -o "$outfile" -w '%{http_code}' \
    -X POST \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: ${idem}" \
    -H "x-ron-passport: ${OWNER_PASSPORT}" \
    -H "x-ron-wallet-account: ${PAYER_ACCOUNT}" \
    --data-binary "$body" \
    "$url")"

  if [[ "$status" != "200" && "$status" != "201" ]]; then
    echo "error: ${label} -> HTTP ${status}"
    cat "$outfile"
    echo
    exit 1
  fi

  validate_json_file "$outfile" "$label"
  echo "ok: ${label} -> HTTP ${status}"
}

get_json_to_file() {
  local path="$1"
  local label="$2"
  local outfile="$3"
  local status

  status="$(curl -sS -o "$outfile" -w '%{http_code}' \
    -H "Accept: application/json" \
    -H "x-ron-passport: ${OWNER_PASSPORT}" \
    -H "x-ron-wallet-account: ${PAYER_ACCOUNT}" \
    "${GATEWAY_URL}${path}")"

  if [[ "$status" != "200" && "$status" != "201" ]]; then
    echo "error: ${label} -> HTTP ${status}"
    cat "$outfile"
    echo
    exit 1
  fi

  validate_json_file "$outfile" "$label"
  echo "ok: ${label} -> HTTP ${status}"
}

node_get_path() {
  local file="$1"
  shift

  node - "$file" "$@" <<'NODE'
const fs = require('node:fs');

const file = process.argv[2];
const paths = process.argv.slice(3);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

function get(path) {
  let cur = data;
  for (const part of String(path).split('.')) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

for (const path of paths) {
  const value = get(path);
  if (value !== undefined && value !== null && String(value).trim()) {
    process.stdout.write(String(value).trim());
    process.exit(0);
  }
}

process.stdout.write('');
NODE
}

json_field_from_text() {
  local json="$1"
  local field="$2"

  JSON_FOR_NODE="$json" FIELD_FOR_NODE="$field" node --input-type=module <<'NODE'
const data = JSON.parse(process.env.JSON_FOR_NODE || '{}');
const field = process.env.FIELD_FOR_NODE || '';
const value = data[field];
process.stdout.write(value === undefined || value === null ? '' : String(value));
NODE
}

prepare_summary_json() {
  local file="$1"
  local kind="$2"

  node - "$file" "$kind" "$CRABLINK_TEXT_ESCROW_ACCOUNT" "$CRABLINK_TEXT_DEFAULT_ASSET" "$CRABLINK_TEXT_DEFAULT_AMOUNT_MINOR" <<'NODE'
const fs = require('node:fs');

const file = process.argv[2];
const kind = process.argv[3] || '';
const fallbackTo = process.argv[4] || 'acct_escrow';
const fallbackAsset = process.argv[5] || 'roc';
const fallbackAmount = process.argv[6] || '';
const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));

function objectAt(path) {
  let cur = parsed;
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

function firstString(...paths) {
  for (const path of paths) {
    const value = objectAt(path);
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function firstAmount(...paths) {
  for (const path of paths) {
    const value = objectAt(path);
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (/^[0-9]+$/.test(text) && text !== '0') return text;
    const n = Number(text);
    if (Number.isSafeInteger(n) && n > 0) return String(n);
  }

  if (/^[0-9]+$/.test(fallbackAmount) && fallbackAmount !== '0') {
    return fallbackAmount;
  }

  return '';
}

const amount_minor = firstAmount(
  'amount_minor',
  'amountMinor',
  'estimate.amount_minor',
  'estimate.amountMinor',
  'quote.amount_minor',
  'quote.amountMinor',
  'wallet_hold.amount_minor',
  'wallet_hold.amountMinor',
  'wallet_hold_template.amount_minor',
  'wallet_hold_template.amountMinor',
  'hold.amount_minor',
  'hold.amountMinor',
  'hold_template.amount_minor',
  'hold_template.amountMinor',
  'payment.amount_minor',
  'payment.amountMinor'
);

const to = firstString(
  'to',
  'recipient',
  'recipient_account',
  'recipientAccount',
  'escrow_account',
  'escrowAccount',
  'estimate.to',
  'quote.to',
  'wallet_hold.to',
  'wallet_hold.recipient',
  'wallet_hold.recipient_account',
  'wallet_hold_template.to',
  'wallet_hold_template.recipient',
  'wallet_hold_template.recipient_account',
  'hold.to',
  'hold.recipient',
  'hold.recipient_account',
  'hold_template.to',
  'hold_template.recipient',
  'hold_template.recipient_account',
  'payment.to'
) || fallbackTo;

const asset = firstString(
  'asset',
  'asset_code',
  'assetCode',
  'estimate.asset',
  'quote.asset',
  'wallet_hold.asset',
  'wallet_hold_template.asset',
  'hold.asset',
  'hold_template.asset',
  'payment.asset'
) || fallbackAsset;

const action = firstString(
  'action',
  'paid_action',
  'paidAction',
  'estimate.action',
  'quote.action',
  'wallet_hold.action',
  'hold.action',
  'payment.action'
) || `${kind}_publish`;

console.log(JSON.stringify({
  kind,
  amount_minor,
  to,
  asset,
  action,
}));
NODE
}

wallet_hold_json() {
  local prepare_summary="$1"
  local kind="$2"
  local nonce="$3"
  local amount_minor to asset memo

  amount_minor="$(json_field_from_text "$prepare_summary" "amount_minor")"
  to="$(json_field_from_text "$prepare_summary" "to")"
  asset="$(json_field_from_text "$prepare_summary" "asset")"

  if [[ -z "$amount_minor" ]]; then
    echo "error: ${kind} prepare did not expose amount_minor; cannot safely hold ROC" >&2
    echo "$prepare_summary" >&2
    exit 1
  fi

  if [[ -z "$to" ]]; then
    echo "error: ${kind} prepare did not expose escrow/recipient account; cannot safely hold ROC" >&2
    echo "$prepare_summary" >&2
    exit 1
  fi

  asset="${asset:-roc}"
  memo="crablink text ${kind} smoke ${SHORT_RUN_ID}"

  cat <<JSON
{
  "from": "${PAYER_ACCOUNT}",
  "to": "${to}",
  "asset": "${asset}",
  "amount_minor": "${amount_minor}",
  "nonce": ${nonce},
  "memo": "${memo}",
  "idempotency_key": "txt-hold-${kind}-${SHORT_RUN_ID}-${nonce}"
}
JSON
}

extract_expected_nonce_from_file() {
  local file="$1"

  node - "$file" <<'NODE'
const fs = require('node:fs');

const file = process.argv[2];
const raw = fs.readFileSync(file, 'utf8');
let parsed = null;

try {
  parsed = JSON.parse(raw);
} catch {}

function deepFind(obj) {
  if (!obj || typeof obj !== 'object') return '';

  for (const [key, value] of Object.entries(obj)) {
    const keyText = String(key || '');

    if (/expected.*nonce|next.*nonce|required.*nonce/i.test(keyText)) {
      const text = String(value ?? '').trim();
      if (/^[0-9]+$/.test(text) && text !== '0') {
        return text;
      }
    }

    if (value && typeof value === 'object') {
      const found = deepFind(value);
      if (found) return found;
    }
  }

  return '';
}

let found = parsed ? deepFind(parsed) : '';

if (!found) {
  const text = parsed ? JSON.stringify(parsed) : raw;
  const patterns = [
    /expected[_\s-]*nonce[^0-9]{0,40}([0-9]+)/i,
    /next[_\s-]*nonce[^0-9]{0,40}([0-9]+)/i,
    /required[_\s-]*nonce[^0-9]{0,40}([0-9]+)/i,
    /expecting[^0-9]{0,40}([0-9]+)/i,
    /nonce conflict[^0-9]{0,120}expected[^0-9]{0,40}([0-9]+)/i,
    /expected[^0-9]{0,40}([0-9]+)[^0-9]{0,60}got[^0-9]{0,40}([0-9]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      found = match[1];
      break;
    }
  }
}

process.stdout.write(found || '');
NODE
}

wallet_hold_to_file() {
  local kind="$1"
  local prepare_summary="$2"
  local outfile="$3"
  local nonce="$4"
  local hold_body status expected retry_body

  hold_body="$(wallet_hold_json "$prepare_summary" "$kind" "$nonce")"

  status="$(curl -sS -o "$outfile" -w '%{http_code}' \
    -X POST \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: txt-hold-${kind}-${SHORT_RUN_ID}-${nonce}" \
    -H "x-ron-passport: ${OWNER_PASSPORT}" \
    -H "x-ron-wallet-account: ${PAYER_ACCOUNT}" \
    --data-binary "$hold_body" \
    "${GATEWAY_URL}/wallet/hold")"

  if [[ "$status" == "200" || "$status" == "201" ]]; then
    validate_json_file "$outfile" "${kind} wallet hold"
    echo "ok: ${kind} wallet hold -> HTTP ${status} nonce ${nonce}"
    NEXT_NONCE="$((nonce + 1))"
    return 0
  fi

  expected="$(extract_expected_nonce_from_file "$outfile")"

  if [[ -n "$expected" && "$expected" != "$nonce" ]]; then
    echo "info: ${kind} wallet hold nonce conflict; retrying with expected nonce ${expected}"

    retry_body="$(wallet_hold_json "$prepare_summary" "$kind" "$expected")"

    status="$(curl -sS -o "$outfile" -w '%{http_code}' \
      -X POST \
      -H "Accept: application/json" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: txt-hold-${kind}-${SHORT_RUN_ID}-${expected}" \
      -H "x-ron-passport: ${OWNER_PASSPORT}" \
      -H "x-ron-wallet-account: ${PAYER_ACCOUNT}" \
      --data-binary "$retry_body" \
      "${GATEWAY_URL}/wallet/hold")"

    if [[ "$status" == "200" || "$status" == "201" ]]; then
      validate_json_file "$outfile" "${kind} wallet hold nonce-recovered"
      echo "ok: ${kind} wallet hold -> HTTP ${status} nonce ${expected} recovered"
      NEXT_NONCE="$((expected + 1))"
      return 0
    fi
  fi

  echo "error: ${kind} wallet hold -> HTTP ${status}"
  cat "$outfile"
  echo
  exit 1
}

paid_proof_from_hold_file() {
  local file="$1"
  local prepare_summary="$2"
  local txid receipt_hash from_account to_account amount_minor asset

  txid="$(node_get_path "$file" txid receipt.txid wallet_receipt.txid hold.txid transaction_id transactionId)"
  receipt_hash="$(node_get_path "$file" receipt_hash receiptHash receipt.receipt_hash receipt.receiptHash wallet_receipt.receipt_hash wallet_receipt.receiptHash hold.receipt_hash hold.receiptHash)"
  from_account="$(node_get_path "$file" from receipt.from wallet_receipt.from hold.from)"
  to_account="$(node_get_path "$file" to receipt.to wallet_receipt.to hold.to)"
  amount_minor="$(node_get_path "$file" amount_minor amountMinor receipt.amount_minor receipt.amountMinor wallet_receipt.amount_minor wallet_receipt.amountMinor hold.amount_minor hold.amountMinor)"
  asset="$(node_get_path "$file" asset receipt.asset wallet_receipt.asset hold.asset)"

  from_account="${from_account:-$PAYER_ACCOUNT}"
  to_account="${to_account:-$(json_field_from_text "$prepare_summary" "to")}"
  amount_minor="${amount_minor:-$(json_field_from_text "$prepare_summary" "amount_minor")}"
  asset="${asset:-$(json_field_from_text "$prepare_summary" "asset")}"
  asset="${asset:-roc}"

  cat <<JSON
{
  "txid": "${txid}",
  "receipt_hash": "${receipt_hash}",
  "from": "${from_account}",
  "to": "${to_account}",
  "amount_minor": "${amount_minor}",
  "asset": "${asset}"
}
JSON
}

publish_json_to_file() {
  local kind="$1"
  local body="$2"
  local label="$3"
  local paid_proof_json="$4"
  local outfile="$5"
  local status url txid receipt_hash from_account to_account amount_minor asset

  txid="$(json_field_from_text "$paid_proof_json" "txid")"
  receipt_hash="$(json_field_from_text "$paid_proof_json" "receipt_hash")"
  from_account="$(json_field_from_text "$paid_proof_json" "from")"
  to_account="$(json_field_from_text "$paid_proof_json" "to")"
  amount_minor="$(json_field_from_text "$paid_proof_json" "amount_minor")"
  asset="$(json_field_from_text "$paid_proof_json" "asset")"

  if [[ -z "$txid" || -z "$receipt_hash" || -z "$from_account" || -z "$to_account" || -z "$amount_minor" ]]; then
    echo "error: ${label} cannot publish because hold proof is incomplete"
    echo "$paid_proof_json"
    exit 1
  fi

  url="${GATEWAY_URL}/assets/${kind}"

  status="$(curl -sS -o "$outfile" -w '%{http_code}' \
    -X POST \
    -H "Accept: application/json" \
    -H "Content-Type: application/json; charset=utf-8" \
    -H "Idempotency-Key: txt-pub-${kind}-${SHORT_RUN_ID}" \
    -H "x-ron-passport: ${OWNER_PASSPORT}" \
    -H "x-ron-wallet-account: ${PAYER_ACCOUNT}" \
    -H "x-ron-paid-op: hold" \
    -H "x-ron-paid-asset: ${asset:-roc}" \
    -H "x-ron-paid-estimate-minor: ${amount_minor}" \
    -H "x-ron-wallet-txid: ${txid}" \
    -H "x-ron-wallet-receipt-hash: ${receipt_hash}" \
    -H "x-ron-wallet-from: ${from_account}" \
    -H "x-ron-wallet-to: ${to_account}" \
    -H "x-ron-asset-kind: ${kind}" \
    --data-binary "$body" \
    "$url")"

  if [[ "$status" != "200" && "$status" != "201" ]]; then
    echo "error: ${label} -> HTTP ${status}"
    cat "$outfile"
    echo
    exit 1
  fi

  validate_json_file "$outfile" "$label"
  echo "ok: ${label} -> HTTP ${status}"
}

json_field_from_file() {
  local file="$1"
  local field="$2"

  node - "$file" "$field" <<'NODE'
const fs = require('node:fs');

const file = process.argv[2];
const field = process.argv[3];
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

function candidatesFor(name) {
  if (name === 'crab_url') {
    return [
      'crab_url',
      'crabUrl',
      'asset_crab_url',
      'assetCrabUrl',
      'asset_url',
      'assetUrl',
      'url',
      'summary.crabUrl',
      'summary.crab_url',
      'result.crabUrl',
      'result.crab_url',
      'page.crabUrl',
      'page.crab_url'
    ];
  }

  if (name === 'cid') {
    return [
      'cid',
      'asset_cid',
      'assetCid',
      'content_id',
      'contentId',
      'manifest.asset_cid',
      'manifest.assetCid',
      'summary.assetCid',
      'summary.asset_cid'
    ];
  }

  return [name];
}

function get(path) {
  let cur = data;
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

for (const path of candidatesFor(field)) {
  const value = get(path);
  if (value !== undefined && value !== null && String(value).trim()) {
    process.stdout.write(String(value).trim());
    process.exit(0);
  }
}

process.stdout.write('');
NODE
}

extract_hash_from_crab_url() {
  local crab_url="$1"

  if [[ "$crab_url" =~ ^crab://([0-9a-f]{64})\.([a-z0-9_-]+)$ ]]; then
    echo "${BASH_REMATCH[1]}"
    return 0
  fi

  return 1
}

crab_url_from_publish_file() {
  local file="$1"
  local kind="$2"
  local crab_url cid hash

  crab_url="$(json_field_from_file "$file" "crab_url")"

  if [[ -n "$crab_url" ]]; then
    echo "$crab_url"
    return 0
  fi

  cid="$(json_field_from_file "$file" "cid")"
  hash="${cid#b3:}"

  if [[ "$hash" =~ ^[0-9a-f]{64}$ ]]; then
    echo "crab://${hash}.${kind}"
    return 0
  fi

  return 1
}

resolve_known_text_asset() {
  local kind="$1"
  local crab_url="$2"

  if [[ -z "$crab_url" ]]; then
    echo "skip: resolve ${kind}; set CRABLINK_TEXT_${kind^^}_URL=crab://<hash>.${kind}"
    return 0
  fi

  local encoded hash resolve_file
  encoded="$(urlencode "$crab_url")"
  resolve_file="${OUT_DIR}/${kind}-resolve-${RUN_ID}.json"

  get_json_to_file "/crab/resolve?url=${encoded}" "resolve ${kind} ${crab_url}" "$resolve_file"

  if hash="$(extract_hash_from_crab_url "$crab_url")"; then
    request_text_ok "GET" "/o/b3:${hash}" "raw ${kind} object b3:${hash}"
  else
    echo "skip: raw ${kind}; ${crab_url} is not a typed crab://<64hex>.${kind} URL"
  fi
}

publish_kind() {
  local kind="$1"
  local body="$2"
  local prepare_file="${OUT_DIR}/${kind}-prepare-${RUN_ID}.json"
  local hold_file="${OUT_DIR}/${kind}-hold-${RUN_ID}.json"
  local publish_file="${OUT_DIR}/${kind}-publish-${RUN_ID}.json"
  local summary proof crab_url

  post_json_to_file "/assets/${kind}/prepare" "$body" "${kind} prepare" "$prepare_file"

  if [[ "$CRABLINK_TEXT_RUN_PUBLISH" != "1" ]]; then
    return 0
  fi

  summary="$(prepare_summary_json "$prepare_file" "$kind")"
  wallet_hold_to_file "$kind" "$summary" "$hold_file" "$NEXT_NONCE"
  proof="$(paid_proof_from_hold_file "$hold_file" "$summary")"

  publish_json_to_file "$kind" "$body" "${kind} publish" "$proof" "$publish_file"

  if ! crab_url="$(crab_url_from_publish_file "$publish_file" "$kind")"; then
    echo "error: ${kind} publish did not return a typed crab URL or b3 CID"
    cat "$publish_file"
    echo
    exit 1
  fi

  echo "published ${kind}: ${crab_url}"
  resolve_known_text_asset "$kind" "$crab_url"

  case "$kind" in
    post)
      CRABLINK_TEXT_POST_URL="$crab_url"
      PARENT_CRAB_URL="$crab_url"
      ;;
    comment)
      CRABLINK_TEXT_COMMENT_URL="$crab_url"
      ;;
    article)
      CRABLINK_TEXT_ARTICLE_URL="$crab_url"
      ;;
  esac
}

write_outputs() {
  cat > "$OUT_ENV_FILE" <<EOF
export CRABLINK_TEXT_POST_URL="${CRABLINK_TEXT_POST_URL}"
export CRABLINK_TEXT_COMMENT_URL="${CRABLINK_TEXT_COMMENT_URL}"
export CRABLINK_TEXT_ARTICLE_URL="${CRABLINK_TEXT_ARTICLE_URL}"
EOF

  node - "$OUT_JSON_FILE" "$RUN_ID" "$CRABLINK_TEXT_POST_URL" "$CRABLINK_TEXT_COMMENT_URL" "$CRABLINK_TEXT_ARTICLE_URL" <<'NODE'
const fs = require('node:fs');

const [file, runId, postUrl, commentUrl, articleUrl] = process.argv.slice(2);

fs.writeFileSync(
  file,
  JSON.stringify(
    {
      schema: 'crablink.text-asset-smoke-result.v1',
      generated_at: new Date().toISOString(),
      run_id: runId,
      post_url: postUrl || '',
      comment_url: commentUrl || '',
      article_url: articleUrl || '',
      next_manual_routes: [postUrl, commentUrl, articleUrl].filter(Boolean),
      truth_boundary:
        'This is a local smoke output. Backend gateway/wallet/storage/index remain source of truth.',
    },
    null,
    2,
  ),
);
NODE
}

echo "CrabLink text asset gateway smoke"
echo "root:           $ROOT"
echo "gateway:        $GATEWAY_URL"
echo "site context:   $SITE_CONTEXT"
echo "parent:         $PARENT_CRAB_URL"
echo "payer:          $PAYER_ACCOUNT"
echo "owner:          $OWNER_PASSPORT"
echo "publish mode:   $CRABLINK_TEXT_RUN_PUBLISH"
echo "start nonce:    $CRABLINK_TEXT_HOLD_NONCE"
echo "run id:         $RUN_ID"
echo "out env:        $OUT_ENV_FILE"
echo

request_text_ok "GET" "/healthz" "gateway healthz"
request_text_ok "GET" "/readyz" "gateway readyz"

if [[ "$CRABLINK_TEXT_RUN_PUBLISH" == "1" ]]; then
  publish_kind "post" "$(make_post_body)"
  publish_kind "comment" "$(make_comment_body)"
  publish_kind "article" "$(make_article_body)"
else
  post_json_to_file "/assets/post/prepare" "$(make_post_body)" "post prepare" "${OUT_DIR}/post-prepare-${RUN_ID}.json"
  post_json_to_file "/assets/comment/prepare" "$(make_comment_body)" "comment prepare" "${OUT_DIR}/comment-prepare-${RUN_ID}.json"
  post_json_to_file "/assets/article/prepare" "$(make_article_body)" "article prepare" "${OUT_DIR}/article-prepare-${RUN_ID}.json"

  if [[ "$CRABLINK_TEXT_RUN_RESOLVE" == "1" ]]; then
    resolve_known_text_asset "post" "$CRABLINK_TEXT_POST_URL"
    resolve_known_text_asset "comment" "$CRABLINK_TEXT_COMMENT_URL"
    resolve_known_text_asset "article" "$CRABLINK_TEXT_ARTICLE_URL"
  else
    echo
    echo "skip: known text asset resolve/raw reads"
    echo "reason: set CRABLINK_TEXT_RUN_RESOLVE=1 and CRABLINK_TEXT_POST_URL / COMMENT_URL / ARTICLE_URL"
  fi
fi

write_outputs

echo
echo "CrabLink text asset gateway smoke passed."
echo
echo "Fresh text URLs:"
echo "  post:    ${CRABLINK_TEXT_POST_URL:-not published in this run}"
echo "  comment: ${CRABLINK_TEXT_COMMENT_URL:-not published in this run}"
echo "  article: ${CRABLINK_TEXT_ARTICLE_URL:-not published in this run}"
echo
echo "Saved export file:"
echo "  ${OUT_ENV_FILE}"