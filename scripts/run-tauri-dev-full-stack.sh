#!/usr/bin/env bash
set -euo pipefail

# CrabLink Tauri + RustyOnions local dev runner.
#
# Starts:
#   svc-wallet   :8088
#   svc-passport :5307
#   WEB3_2 stack : svc-storage :5303, svc-index :5304, omnigate :9090, svc-gateway :8090
#   CrabLink Tauri app
#
# Important:
#   This script restarts local dev listeners by default. That means in-memory/dev storage
#   objects can disappear. Mint fresh assets after launch if old crab:// links 404.

RO_DIR="${RO_DIR:-/Users/mymac/Desktop/RustyOnions}"
CRAB_DIR="${CRAB_DIR:-/Users/mymac/Desktop/crablink}"
TAURI_DIR="${TAURI_DIR:-$CRAB_DIR/apps/crablink-tauri}"

RUN_TAURI="${RUN_TAURI:-1}"
CLEAN_PORTS="${CLEAN_PORTS:-1}"
FUND_WALLETS="${FUND_WALLETS:-1}"
TAURI_CMD="${TAURI_CMD:-npm run tauri:dev:mac-media}"

# First run after cargo clean can take several minutes on RustyOnions.
SERVICE_START_TIMEOUT="${SERVICE_START_TIMEOUT:-900}"

# Keep dev builds from filling target/debug/incremental again.
export CARGO_INCREMENTAL="${CARGO_INCREMENTAL:-0}"
export CARGO_BUILD_JOBS="${CARGO_BUILD_JOBS:-2}"

WALLET_URL="${WALLET_URL:-http://127.0.0.1:8088}"
PASSPORT_PORT="${PASSPORT_PORT:-5307}"
STORAGE_URL="${STORAGE_URL:-http://127.0.0.1:5303}"
GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:8090}"
OMNIGATE_URL="${OMNIGATE_URL:-http://127.0.0.1:9090}"

IMAGE_BODY_CAP="${IMAGE_BODY_CAP:-67108864}"
ECON_PATH="${ECON_PATH:-$RO_DIR/configs/roc-economics.dev.toml}"

LOG_DIR="${LOG_DIR:-/tmp/crablink-tauri-dev-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$LOG_DIR"

PIDS=()

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

die() {
  log "ERROR: $*"
  exit 1
}

require_dir() {
  local dir="$1"
  [ -d "$dir" ] || die "missing directory: $dir"
}

kill_port() {
  local port="$1"
  local pids

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -z "$pids" ]; then
    return 0
  fi

  log "Stopping listener(s) on port $port: $pids"
  # shellcheck disable=SC2086
  kill -TERM $pids 2>/dev/null || true

  sleep 1

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    log "Force stopping stubborn listener(s) on port $port: $pids"
    # shellcheck disable=SC2086
    kill -KILL $pids 2>/dev/null || true
  fi
}

wait_for_port() {
  local port="$1"
  local label="$2"
  local timeout="${3:-90}"
  local start
  start="$(date +%s)"

  while true; do
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      log "$label is listening on :$port"
      return 0
    fi

    if [ $(( $(date +%s) - start )) -ge "$timeout" ]; then
      log "Last 80 lines from logs while waiting for $label:"
      tail -n 80 "$LOG_DIR"/*.log 2>/dev/null || true
      die "$label did not start listening on :$port within ${timeout}s"
    fi

    sleep 1
  done
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local timeout="${3:-90}"
  local start
  start="$(date +%s)"

  while true; do
    if curl --connect-timeout 2 --max-time 4 -fsS "$url" >/dev/null 2>&1; then
      log "$label OK: $url"
      return 0
    fi

    if [ $(( $(date +%s) - start )) -ge "$timeout" ]; then
      log "Last 80 lines from logs while waiting for $label:"
      tail -n 80 "$LOG_DIR"/*.log 2>/dev/null || true
      die "$label did not become healthy at $url within ${timeout}s"
    fi

    sleep 1
  done
}

start_job() {
  local name="$1"
  local cwd="$2"
  shift 2

  local log_file="$LOG_DIR/${name}.log"
  log "Starting $name"
  log "  cwd: $cwd"
  log "  log: $log_file"

  (
    cd "$cwd"
    "$@"
  ) >"$log_file" 2>&1 &

  local pid="$!"
  PIDS+=("$pid")
  log "  pid: $pid"
}

cleanup() {
  local code=$?

  log "Shutting down local dev processes"

  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -TERM "$pid" >/dev/null 2>&1 || true
    fi
  done

  sleep 1

  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -KILL "$pid" >/dev/null 2>&1 || true
    fi
  done

  if [ "${CLEAN_PORTS_ON_EXIT:-1}" = "1" ]; then
    for port in 1420 8090 9090 5304 5303 5307 8088; do
      kill_port "$port" || true
    done
  fi

  log "Logs kept at: $LOG_DIR"
  exit "$code"
}

trap cleanup INT TERM EXIT

require_dir "$RO_DIR"
require_dir "$CRAB_DIR"
require_dir "$TAURI_DIR"
[ -f "$ECON_PATH" ] || die "missing economics config: $ECON_PATH"

log "CrabLink Tauri full local dev runner"
log "RustyOnions: $RO_DIR"
log "CrabLink:     $CRAB_DIR"
log "Tauri app:    $TAURI_DIR"
log "Logs:         $LOG_DIR"

if [ "$CLEAN_PORTS" = "1" ]; then
  log "Cleaning stale local listeners"
  for port in 1420 8090 9090 5304 5303 5307 8088; do
    kill_port "$port"
  done
else
  log "CLEAN_PORTS=0, not killing existing listeners"
fi

start_job "svc-wallet" "$RO_DIR" \
  env \
    RUST_LOG=info \
    SVC_WALLET_ADDR=127.0.0.1:8088 \
    cargo run -p svc-wallet

wait_for_port 8088 "svc-wallet" "$SERVICE_START_TIMEOUT"
wait_for_http "$WALLET_URL/healthz" "svc-wallet healthz" "$SERVICE_START_TIMEOUT"

start_job "svc-passport" "$RO_DIR" \
  env \
    PASSPORT_CONFIG_FILE=crates/svc-passport/config/default.toml \
    RUST_LOG=info \
    cargo run -p svc-passport

wait_for_port 5307 "svc-passport" "$SERVICE_START_TIMEOUT"

start_job "web3-stack" "$RO_DIR" \
  env \
    CRABLINK_DEV_IMAGE_BODY_BYTES="$IMAGE_BODY_CAP" \
    SVC_GATEWAY_MAX_BODY_BYTES="$IMAGE_BODY_CAP" \
    OMNIGATE_MAX_BODY_BYTES="$IMAGE_BODY_CAP" \
    OMNIGATE_MAX_CONTENT_LENGTH="$IMAGE_BODY_CAP" \
    RON_STORAGE_MAX_BODY="$IMAGE_BODY_CAP" \
    OMNIGATE_PASSPORT_BASE_URL=http://127.0.0.1:5307 \
    OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
    OMNIGATE_WALLET_BEARER=dev \
    RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
    RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
    RON_STORAGE_PAID_WRITE_VERIFIER_MODE=dev-header \
    SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303 \
    bash scripts/web3_crablink_dev_stack.sh

wait_for_port 5303 "svc-storage" "$SERVICE_START_TIMEOUT"
wait_for_port 5304 "svc-index" "$SERVICE_START_TIMEOUT"
wait_for_port 9090 "omnigate" "$SERVICE_START_TIMEOUT"
wait_for_port 8090 "svc-gateway" "$SERVICE_START_TIMEOUT"

wait_for_http "$GATEWAY_URL/healthz" "svc-gateway healthz" 90
wait_for_http "$OMNIGATE_URL/healthz" "omnigate healthz" 90

log "Gateway process env check"
GW_PID="$(lsof -tiTCP:8090 -sTCP:LISTEN | head -n 1 || true)"
if [ -n "$GW_PID" ]; then
  log "svc-gateway pid: $GW_PID"
  if ps eww -p "$GW_PID" | tr ' ' '\n' | grep -q 'SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303'; then
    log "svc-gateway has correct SVC_GATEWAY_STORAGE_BASE_URL"
  else
    log "WARNING: could not confirm SVC_GATEWAY_STORAGE_BASE_URL in gateway process env"
    ps eww -p "$GW_PID" | tr ' ' '\n' | grep -E 'SVC_GATEWAY_STORAGE_BASE_URL|STORAGE|5303|15303' || true
  fi
else
  log "WARNING: no gateway pid found even though port check passed"
fi

issue_roc() {
  local account="$1"
  local amount="$2"
  local memo="$3"
  local key="dev-fund-${account//[^a-zA-Z0-9_-]/-}-$(date +%s)"

  log "Funding $account with $amount ROC for local dev"
  curl --connect-timeout 2 --max-time 10 -fsS \
    -X POST "$WALLET_URL/v1/issue" \
    -H 'Authorization: Bearer dev' \
    -H "Idempotency-Key: $key" \
    -H 'Content-Type: application/json' \
    -d "{\"to\":\"$account\",\"asset\":\"roc\",\"amount_minor\":\"$amount\",\"memo\":\"$memo\"}" \
    | { jq . 2>/dev/null || cat; }
}

if [ "$FUND_WALLETS" = "1" ]; then
  issue_roc "acct_dev" "1776" "dev fund acct_dev for CrabLink Tauri"
  issue_roc "acct_visitor_b" "1776" "dev fund visitor B for CrabLink Tauri"
else
  log "FUND_WALLETS=0, skipping dev wallet funding"
fi

log "Backend sanity checks"
curl --connect-timeout 2 --max-time 6 -fsS "$GATEWAY_URL/healthz" && echo
curl --connect-timeout 2 --max-time 6 -fsS "$GATEWAY_URL/readyz" && echo || true
curl --connect-timeout 2 --max-time 6 -fsS "$GATEWAY_URL/wallet/acct_dev/balance" | { jq . 2>/dev/null || cat; } || true
curl --connect-timeout 2 --max-time 6 -fsS "$GATEWAY_URL/wallet/acct_visitor_b/balance" | { jq . 2>/dev/null || cat; } || true

log "Backend is ready"
log "Open another terminal to tail logs if needed:"
log "  tail -f $LOG_DIR/*.log"

if [ "$RUN_TAURI" = "1" ]; then
  if [ "$CLEAN_PORTS" = "1" ]; then
    log "Cleaning stale Vite/Tauri dev listener on :1420 before launching Tauri"
    kill_port 1420
  fi

  log "Starting CrabLink Tauri in foreground"
  log "Command: $TAURI_CMD"
  cd "$TAURI_DIR"
  bash -lc "$TAURI_CMD"
else
  log "RUN_TAURI=0, backend stays running. Press Ctrl-C to stop."
  while true; do
    sleep 3600
  done
fi
