#!/usr/bin/env bash
# RO:WHAT — Complete local Phase 22 acceptance runner.
# RO:WHY — Closes the two-node devnet phase with content, provider/repair,
# evidence, economics, receipts, replay, lifecycle, and client truth.
# RO:INVARIANTS — no fake receipt/balance/finality, single-node mint,
# residential-IP provider identity, or client economic authority.

set -u

CRABLINK_ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.."
  pwd
)"

RUSTYONIONS_ROOT="$(
  cd "$CRABLINK_ROOT/../RustyOnions"
  pwd
)"

TAURI_ROOT="$CRABLINK_ROOT/apps/crablink-tauri"
TAURI_MANIFEST="$TAURI_ROOT/src-tauri/Cargo.toml"
TAURI_CONFIG_FILE="$TAURI_ROOT/src-tauri/tauri.macos.dev-media.conf.json"

TMP_DIR="$(
  mktemp -d \
    "${TMPDIR:-/tmp}/crablink-phase22-final.XXXXXX"
)"

PROJECTION_PATH="$TMP_DIR/confirmed-roc.json"

failures=0

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT INT TERM

run_check() {
  echo
  echo "---- $* ----"

  "$@"
  code=$?

  echo "exit=$code"

  if [[ "$code" -ne 0 ]]; then
    failures=$((failures + 1))
  fi
}

echo
echo "============================================================"
echo " Phase 22 final local two-node devnet acceptance"
echo "============================================================"

cd "$RUSTYONIONS_ROOT"

run_check \
  env \
  "PHASE22_CONFIRMED_ROC_PROJECTION_PATH=$PROJECTION_PATH" \
  cargo test \
    -p svc-rewarder \
    --test internal_roc_beta_phase22_local_reward_loop \
    -- \
    --nocapture

run_check \
  cargo clippy \
    -p svc-rewarder \
    --test internal_roc_beta_phase22_local_reward_loop \
    --no-deps \
    -- \
    -D warnings

run_check \
  python3 -m json.tool \
    "$PROJECTION_PATH"

run_check \
  cargo test \
    -p svc-dht \
    --all-targets

run_check \
  cargo test \
    -p svc-registry \
    --all-targets

run_check \
  cargo test \
    -p svc-rewarder \
    --test internal_roc_beta_phase19_enforcement_reward_denial

run_check \
  cargo test \
    -p micronode \
    --test object_verification

run_check \
  cargo test \
    -p micronode \
    --test internal_roc_beta_phase17_epoch_replay

run_check \
  cargo check \
    --workspace

cd "$CRABLINK_ROOT"

run_check \
  env \
  "PHASE22_CONFIRMED_ROC_PROJECTION_PATH=$PROJECTION_PATH" \
  node \
    scripts/check-phase22-confirmed-roc-boundary.mjs

run_check \
  env \
  "TAURI_CONFIG=$(cat "$TAURI_CONFIG_FILE")" \
  "PHASE22_CONFIRMED_ROC_PROJECTION_PATH=$PROJECTION_PATH" \
  cargo test \
    --manifest-path "$TAURI_MANIFEST" \
    --test phase22_confirmed_roc_projection \
    -- \
    --nocapture

run_check \
  env \
  "TAURI_CONFIG=$(cat "$TAURI_CONFIG_FILE")" \
  cargo clippy \
    --manifest-path "$TAURI_MANIFEST" \
    --lib \
    --test phase22_confirmed_roc_projection \
    --no-deps \
    -- \
    -D warnings

cd "$TAURI_ROOT"

run_check \
  npm run \
    check:oap-object-boundary

run_check \
  npm run \
    check:user-node-verification-boundary

run_check \
  npm run \
    check:lifecycle-isolation-boundary

run_check \
  npm run \
    check:phase22-confirmed-roc-boundary

run_check \
  npm run \
    check:phase22-local-oap-object

run_check \
  npm run \
    check:phase22-local-user-node-verification

run_check \
  npm run \
    check:phase22-local-lifecycle-isolation

run_check \
  npm run \
    check:phase22-local-operator-attachment

run_check \
  npm run \
    check:phase22-local-operator-reviews

run_check \
  npm run build

run_check \
  env \
  "TAURI_CONFIG=$(cat "$TAURI_CONFIG_FILE")" \
  cargo check \
    --manifest-path "$TAURI_MANIFEST"

echo
echo "============================================================"

if [[ "$failures" -ne 0 ]]; then
  echo \
    "Phase 22 final acceptance failed: checks_failed=$failures" \
    >&2

  exit 1
fi

echo "Phase 22 final acceptance passed."
echo
echo "Independent Service Node and User Node lifecycle: verified."
echo "OAP/1 retrieval and full BLAKE3 admission: verified."
echo "Provider discovery, expiration, withdrawal, repair, and privacy: verified."
echo "Moderation and persistence review: verified."
echo "Pending verification and challenge evidence: verified."
echo "Accounting, capped planning, registry binding, and enforcement: verified."
echo "Two-of-three quorum wallet execution and ledger receipt: verified."
echo "Exact replay without double issue: verified."
echo "Independent User Node epoch replay and challenge: verified."
echo "CrabLink confirmed ROC receipt-only display boundary: verified."
echo "Single-node minting and self-issuance: rejected."
echo "No client wallet, ledger, lifecycle, quorum, or finality authority was created."
echo
echo "PHASE22_FINAL_STATUS=GREEN_PARKED"
echo "============================================================"
