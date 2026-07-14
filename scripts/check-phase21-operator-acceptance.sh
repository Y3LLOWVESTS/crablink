#!/usr/bin/env bash
# RO:WHAT — Cross-repository Phase 21 Operator Mode acceptance sweep.
# RO:WHY — Proves the Service Node remains headless/CLI-operable while CrabLink remains an optional controller.
# RO:INVARIANTS — no live production mutation; local tests only; no fake authority or finality.
# RO:TEST — backend runtime/CLI suites, all CrabLink operator gates/tests, strict checks, and production build.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRABLINK_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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
    echo "required acceptance source missing: $file" >&2
    exit 1
  fi
}

require_file "$RUSTYONIONS_ROOT/Cargo.toml"
require_file "$CRABLINK_ROOT/package.json"
require_file "$TAURI_ROOT/package.json"
require_file "$TAURI_MANIFEST"
require_file "$TAURI_CONFIG_FILE"

echo
echo "== Phase 21A: headless Service Node acceptance =="
echo

cd "$RUSTYONIONS_ROOT"

cargo fmt \
  -p macronode \
  -- \
  --check

cargo test \
  -p macronode \
  --bin macronode \
  -- \
  --nocapture

cargo test \
  -p macronode \
  --test admin_smoke \
  -- \
  --nocapture

cargo test \
  -p macronode \
  --test rewards_http \
  -- \
  --nocapture

cargo test \
  -p macronode \
  --test service_node_runtime_moderation \
  -- \
  --nocapture

cargo test \
  -p macronode \
  --test persistence_http \
  -- \
  --nocapture

cargo test \
  -p macronode \
  --test crabnode_persistence_cli \
  -- \
  --nocapture

cargo test \
  -p macronode \
  --test crabnode_persistence_live \
  -- \
  --nocapture

cargo check \
  -p macronode

cargo clippy \
  -p macronode \
  --all-targets \
  --no-deps \
  -- \
  -D warnings

echo
echo "== Phase 21B: optional CrabLink controller acceptance =="
echo

cd "$TAURI_ROOT"

npm run check:service-node-operator-boundary
npm run check:service-node-operator-ui-boundary
npm run check:signed-reward-binding-boundary
npm run check:moderation-review-boundary
npm run check:persistence-review-boundary
npm run check:phase21-operator-acceptance
npm run check:tab-hit-testing-boundary

cargo fmt \
  --manifest-path "$TAURI_MANIFEST" \
  -- \
  --check

TAURI_CONFIG="$(cat "$TAURI_CONFIG_FILE")" \
cargo test \
  --manifest-path "$TAURI_MANIFEST" \
  --lib \
  'commands::operator_' \
  -- \
  --nocapture

TAURI_CONFIG="$(cat "$TAURI_CONFIG_FILE")" \
cargo check \
  --manifest-path "$TAURI_MANIFEST"

TAURI_CONFIG="$(cat "$TAURI_CONFIG_FILE")" \
cargo clippy \
  --manifest-path "$TAURI_MANIFEST" \
  --all-targets \
  --no-deps \
  -- \
  -D warnings

npm run build

echo
echo "Phase 21 Operator Mode acceptance sweep passed."
echo
echo "CrabLink remains an optional friendly controller."
echo "The Service Node remains independently headless and CLI-operable."
echo "Confirmed ROC remains ledger-receipt-derived only."
