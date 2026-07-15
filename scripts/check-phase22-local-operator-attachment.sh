#!/usr/bin/env bash
# RO:WHAT — Live Phase 22B runner for independent macronode + micronode + CrabLink native Operator attachment.
# RO:WHY — Proves real status attachment, authenticated signed reward binding, and truthful non-authority projection.
# RO:INVARIANTS — loopback-only; ephemeral credential; no production wallet/ledger mutation; daemons remain independent of CrabLink.
# RO:TEST — bash -n this script, then run it from the CrabLink repository.

set -euo pipefail

SCRIPT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")"
  pwd
)"

CRABLINK_ROOT="$(
  cd "$SCRIPT_DIR/.."
  pwd
)"

DEFAULT_RUSTYONIONS_ROOT="$(
  cd "$CRABLINK_ROOT/.."
  pwd
)/RustyOnions"

RUSTYONIONS_ROOT="${RUSTYONIONS_ROOT:-$DEFAULT_RUSTYONIONS_ROOT}"

TAURI_ROOT="$CRABLINK_ROOT/apps/crablink-tauri"
TAURI_MANIFEST="$TAURI_ROOT/src-tauri/Cargo.toml"
TAURI_CONFIG_FILE="$TAURI_ROOT/src-tauri/tauri.macos.dev-media.conf.json"

require_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    echo \
      "required Phase 22B source missing: $file" \
      >&2

    exit 1
  fi
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" \
    >/dev/null 2>&1
  then
    echo \
      "required Phase 22B command missing: $command_name" \
      >&2

    exit 1
  fi
}

clear_project_environment() {
  local key

  while IFS='=' read -r key _; do
    case "$key" in
      RON_*|MACRO_*|MACRONODE_*|MICRONODE_*|CRABNODE_*)
        unset "$key"
        ;;
    esac
  done < <(env)
}

require_file \
  "$RUSTYONIONS_ROOT/Cargo.toml"

require_file \
  "$TAURI_MANIFEST"

require_file \
  "$TAURI_CONFIG_FILE"

require_command cargo
require_command curl
require_command python3

RUSTYONIONS_TARGET="$(
  cd "$RUSTYONIONS_ROOT"

  cargo metadata \
    --format-version 1 \
    --no-deps \
  | python3 -c '
import json
import sys
print(json.load(sys.stdin)["target_directory"])
'
)/debug"

TMP_DIR="$(
  mktemp -d \
    "${TMPDIR:-/tmp}/crablink-phase22b.XXXXXX"
)"

MACRONODE_LOG="$TMP_DIR/macronode.log"
MICRONODE_LOG="$TMP_DIR/micronode.log"
INDEX_DB="$TMP_DIR/index.sled"

MACRONODE_PID=""
MICRONODE_PID=""

cleanup() {
  local exit_code=$?

  trap - EXIT INT TERM

  if [[ -n "$MICRONODE_PID" ]] \
    && kill -0 "$MICRONODE_PID" 2>/dev/null
  then
    kill "$MICRONODE_PID" 2>/dev/null \
      || true

    wait "$MICRONODE_PID" 2>/dev/null \
      || true
  fi

  if [[ -n "$MACRONODE_PID" ]] \
    && kill -0 "$MACRONODE_PID" 2>/dev/null
  then
    kill "$MACRONODE_PID" 2>/dev/null \
      || true

    wait "$MACRONODE_PID" 2>/dev/null \
      || true
  fi

  if [[ "$exit_code" -ne 0 ]]; then
    echo >&2
    echo \
      "Phase 22B failed. Recent macronode log:" \
      >&2

    tail -n 80 "$MACRONODE_LOG" \
      2>/dev/null >&2 \
      || true

    echo >&2
    echo \
      "Recent micronode log:" \
      >&2

    tail -n 80 "$MICRONODE_LOG" \
      2>/dev/null >&2 \
      || true
  fi

  rm -rf "$TMP_DIR"
  exit "$exit_code"
}

trap cleanup EXIT INT TERM

read -r \
  ADMIN_PORT \
  GATEWAY_PORT \
  STORAGE_PORT \
  INDEX_PORT \
  OVERLAY_PORT \
  DHT_PORT \
  MAILBOX_PORT \
  MICRONODE_PORT <<EOF_PORTS
$(
  python3 - <<'PY_PHASE22_PORTS'
import socket

listeners = []
ports = []

for _ in range(8):
    listener = socket.socket(
        socket.AF_INET,
        socket.SOCK_STREAM,
    )

    listener.bind(
        ("127.0.0.1", 0)
    )

    listeners.append(listener)

    ports.append(
        str(
            listener
            .getsockname()[1]
        )
    )

print(" ".join(ports))
PY_PHASE22_PORTS
)
EOF_PORTS

ADMIN_TOKEN="$(
  python3 - <<'PY_PHASE22_TOKEN'
import secrets
print(secrets.token_hex(32))
PY_PHASE22_TOKEN
)"

SERVICE_NODE_URL="http://127.0.0.1:$ADMIN_PORT"
USER_NODE_URL="http://127.0.0.1:$MICRONODE_PORT"

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempt=0

  while (( attempt < 300 )); do
    if curl \
      --silent \
      --show-error \
      --fail \
      --max-time 2 \
      "$url" \
      >/dev/null 2>&1
    then
      return 0
    fi

    sleep 0.1
    attempt=$((attempt + 1))
  done

  echo \
    "$label did not become ready at $url" \
    >&2

  return 1
}

echo
echo "== Phase 22B: build independent node binaries =="
echo

cd "$RUSTYONIONS_ROOT"

cargo build \
  -p macronode \
  --bin macronode

cargo build \
  -p micronode \
  --bin micronode

(
  clear_project_environment

  export \
    RON_HTTP_ADDR="127.0.0.1:$ADMIN_PORT"

  export \
    RON_GATEWAY_ADDR="127.0.0.1:$GATEWAY_PORT"

  export \
    RON_STORAGE_ADDR="127.0.0.1:$STORAGE_PORT"

  export \
    INDEX_BIND="127.0.0.1:$INDEX_PORT"

  export \
    RON_OVERLAY_ADDR="127.0.0.1:$OVERLAY_PORT"

  export \
    RON_DHT_ADDR="127.0.0.1:$DHT_PORT"

  export \
    RON_MAILBOX_ADDR="127.0.0.1:$MAILBOX_PORT"

  export \
    RON_INDEX_DB="$INDEX_DB"

  export RON_HEADLESS_MODE="true"
  export RON_ADMIN_UI_ENABLED="false"
  export RON_ADMIN_UI_RUNTIME_REQUIRED="false"
  export RON_OPERATOR_UI_PROFILE="service_node_local"
  export RON_ADMIN_TOKEN="$ADMIN_TOKEN"

  exec \
    "$RUSTYONIONS_TARGET/macronode" \
    run
) >"$MACRONODE_LOG" 2>&1 &

MACRONODE_PID=$!

(
  clear_project_environment

  exec \
    "$RUSTYONIONS_TARGET/micronode" \
    serve \
    --bind "127.0.0.1:$MICRONODE_PORT" \
    --no-dev-routes
) >"$MICRONODE_LOG" 2>&1 &

MICRONODE_PID=$!

wait_for_http \
  "$SERVICE_NODE_URL/healthz" \
  "Service Node health"

wait_for_http \
  "$SERVICE_NODE_URL/readyz" \
  "Service Node readiness"

wait_for_http \
  "$USER_NODE_URL/healthz" \
  "User Node health"

wait_for_http \
  "$USER_NODE_URL/readyz" \
  "User Node readiness"

echo
echo "== Phase 22B: run CrabLink native attachment =="
echo

cd "$TAURI_ROOT"

TAURI_CONFIG="$(cat "$TAURI_CONFIG_FILE")" \
PHASE22_SERVICE_NODE_URL="$SERVICE_NODE_URL" \
PHASE22_ADMIN_TOKEN="$ADMIN_TOKEN" \
cargo test \
  --manifest-path "$TAURI_MANIFEST" \
  --test phase22_live_operator_attachment \
  phase22_crablink_attaches_and_submits_signed_binding \
  -- \
  --ignored \
  --nocapture

curl \
  --silent \
  --show-error \
  --fail \
  --max-time 2 \
  "$SERVICE_NODE_URL/healthz" \
  >/dev/null

curl \
  --silent \
  --show-error \
  --fail \
  --max-time 2 \
  "$USER_NODE_URL/healthz" \
  >/dev/null

curl \
  --silent \
  --show-error \
  --fail \
  --max-time 3 \
  --request POST \
  --header "Authorization: Bearer $ADMIN_TOKEN" \
  "$SERVICE_NODE_URL/api/v1/shutdown" \
  >/dev/null

shutdown_attempt=0

while (( shutdown_attempt < 100 )); do
  if ! kill -0 "$MACRONODE_PID" \
    2>/dev/null
  then
    if ! wait "$MACRONODE_PID"; then
      echo \
        "Service Node returned a failure status during shutdown" \
        >&2

      exit 1
    fi

    MACRONODE_PID=""
    break
  fi

  sleep 0.1
  shutdown_attempt=$((shutdown_attempt + 1))
done

if [[ -n "$MACRONODE_PID" ]] \
  && kill -0 "$MACRONODE_PID" 2>/dev/null
then
  echo \
    "Service Node did not exit after authenticated shutdown" \
    >&2

  exit 1
fi

if ! kill -0 "$MICRONODE_PID" 2>/dev/null; then
  echo \
    "User Node stopped when the independently managed Service Node exited" \
    >&2

  exit 1
fi

echo
echo "Phase 22B live CrabLink Operator attachment passed."
echo "The User Node remained active and independent."
echo "The Service Node remained headless and independently managed."
echo "CrabLink used production native status and signed-binding logic."
echo "No registry finality, wallet mutation, ledger mutation,"
echo "receipt, or confirmed ROC was created."
