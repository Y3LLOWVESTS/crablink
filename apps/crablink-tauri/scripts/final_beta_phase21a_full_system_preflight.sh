#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(
  cd "$(
    dirname "$0"
  )" &&
  pwd
)"

DEFAULT_CRABLINK_REPO="$(
  cd "$SCRIPT_DIR/../../.." &&
  pwd
)"

DEFAULT_PROJECT_PARENT="$(
  cd "$DEFAULT_CRABLINK_REPO/.." &&
  pwd
)"

CRABLINK_REPO="${CRABLINK_REPO:-$DEFAULT_CRABLINK_REPO}"

RUSTYONIONS_REPO="${RUSTYONIONS_REPO:-$DEFAULT_PROJECT_PARENT/RustyOnions}"

ROX_ANCHOR_REPO="${ROX_ANCHOR_REPO:-$DEFAULT_PROJECT_PARENT/rox-anchor}"

CRABLINK_APP="$CRABLINK_REPO/apps/crablink-tauri"

EXPECTED_PHASE14_SHA256="b9a178f3f31289a167353fe3650555e9379b8a4c689485d0928abaaa451a2409"
EXPECTED_PHASE15_SHA256="94b91d815ffd7043e7bcb0a1467c6d04ea3da0c7444b18f7b858dc40473c1801"

fail() {
  printf '%s\n' \
    "FINAL_BETA_PHASE21A_CROSS_REPO_PREFLIGHT=RED" \
    "FAILURE=$1" \
    "PHASE21_LIVE_DEMO_EXECUTED=NO" \
    "TRANSACTION_SUBMISSION=NO"
  exit 1
}

require_dir() {
  local path="$1"
  local label="$2"

  test -d "$path" ||
    fail "$label directory missing: $path"

  printf '%s\n' "$label=PRESENT"
}

require_file() {
  local path="$1"
  local label="$2"

  test -f "$path" ||
    fail "$label file missing: $path"

  printf '%s\n' "$label=PRESENT"
}

latest_matching_file() {
  local directory="$1"
  local pattern="$2"

  find "$directory" \
    -maxdepth 1 \
    -type f \
    -name "$pattern" \
    -print \
    2>/dev/null |
    sort |
    tail -n 1
}

verify_sha256() {
  local path="$1"
  local expected="$2"
  local label="$3"
  local observed

  observed="$(
    shasum -a 256 "$path" |
      awk '{print $1}'
  )"

  test "$observed" = "$expected" ||
    fail "$label hash mismatch: observed=$observed expected=$expected"

  printf '%s\n' \
    "$label=GREEN" \
    "${label}_SHA256=$observed"
}

printf '%s\n' \
  "=== FINAL_BETA PHASE21A CROSS-REPO FULL-SYSTEM PREFLIGHT ===" \
  "CRABLINK_REPO=$CRABLINK_REPO" \
  "RUSTYONIONS_REPO=$RUSTYONIONS_REPO" \
  "ROX_ANCHOR_REPO=$ROX_ANCHOR_REPO" \
  "PREFLIGHT_MODE=LOCAL_AND_NON_MUTATING" \
  "PHASE21_LIVE_DEMO_EXECUTED=NO" \
  "TRANSACTION_SUBMISSION=NO" \
  "ROX_LIVE_RERUN=NO" \
  "MAINNET=NO"

printf '%s\n' \
  "--- 1. REPOSITORY AND REQUIRED-SURFACE INVENTORY ---"

require_dir \
  "$CRABLINK_APP" \
  "CRABLINK_TAURI_APP"

require_file \
  "$CRABLINK_APP/package.json" \
  "CRABLINK_PACKAGE_JSON"

require_file \
  "$RUSTYONIONS_REPO/Cargo.toml" \
  "RUSTYONIONS_CARGO_WORKSPACE"

require_file \
  "$ROX_ANCHOR_REPO/BUILD_PLAN4.md" \
  "ROX_BUILD_PLAN4"

require_dir \
  "$ROX_ANCHOR_REPO/.rox-anchor-private-pilot" \
  "ROX_PRIVATE_PILOT_EVIDENCE"

printf '%s\n' \
  "--- 2. PIN COMPLETED ROX BUILD_PLAN4 EVIDENCE WITHOUT LIVE RERUN ---"

PHASE14="$(
  latest_matching_file \
    "$ROX_ANCHOR_REPO/.rox-anchor-private-pilot" \
    'phase14-actual-private-testnet-evidence-package-*.actual-private-testnet-evidence-package.local.json'
)"

test -n "$PHASE14" ||
  fail "Phase14 audit-ready evidence package not found"

PHASE15="$(
  latest_matching_file \
    "$ROX_ANCHOR_REPO/.rox-anchor-private-pilot" \
    'phase15-build-plan4-final-closeout-*.actual-private-testnet-closeout.local.json'
)"

test -n "$PHASE15" ||
  fail "Phase15 BUILD_PLAN4 closeout artifact not found"

verify_sha256 \
  "$PHASE14" \
  "$EXPECTED_PHASE14_SHA256" \
  "ROX_PHASE14_EVIDENCE_PACKAGE"

verify_sha256 \
  "$PHASE15" \
  "$EXPECTED_PHASE15_SHA256" \
  "ROX_PHASE15_BUILD_PLAN4_CLOSEOUT"

printf '%s\n' \
  "ROX_BUILD_PLAN4_STATUS=COMPLETE_GREEN_PARKED" \
  "ROX_PHASE7_HISTORICAL_LIVE_RERUN=NO" \
  "ROX_PHASE8_HISTORICAL_LIVE_RERUN=NO" \
  "ROX_BUILD_PLAN5_STARTED=NO" \
  "ROX_BUILD_PLAN5_AUTHORIZED=NO"

printf '%s\n' \
  "--- 3. CRABLINK SOCIAL + IDENTITY PREREQUISITES ---"

cd "$CRABLINK_APP"

node --test \
  src/onboarding/onboardingDesktopFinalAcceptance.test.mjs \
  src/finalBeta/phase7ProfileTimelineCloseout.test.mjs \
  src/finalBeta/phase8LocalFollowingCloseout.test.mjs \
  src/finalBeta/phase9LocalFirstHomeFeedCloseout.test.mjs \
  src/finalBeta/phase10HomeFeedCloseout.test.mjs

printf '%s\n' \
  "PHASE21A_CRABLINK_IDENTITY_PREREQS=GREEN" \
  "PHASE21A_CRABLINK_SOCIAL_PREREQS=GREEN"

printf '%s\n' \
  "--- 4. CRABLINK SITE-TEMPLATE PREREQUISITES ---"

node --test \
  src/pages/site/siteTemplateEngineCloseout.test.mjs \
  src/pages/site/blogProductFlow.test.mjs \
  src/pages/site/imageboardProductFlow.test.mjs \
  src/pages/site/forumProductFlow.test.mjs

printf '%s\n' \
  "PHASE21A_CRABLINK_SITE_PREREQS=GREEN"

printf '%s\n' \
  "--- 5. CRABLINK PAID / RECEIPT / ROC PRODUCT BOUNDARIES ---"

npm run check:internal-roc-stabilization-paid-ux
npm run check:internal-roc-phase4-wallet-receipt-ux
npm run check:internal-roc-phase4-confirmation-failure-ux

printf '%s\n' \
  "PHASE21A_CRABLINK_PAID_PREREQS=GREEN" \
  "SILENT_SPEND_ALLOWED=NO" \
  "CACHE_ONLY_UNLOCK_ALLOWED=NO" \
  "FAKE_RECEIPT_ALLOWED=NO"

printf '%s\n' \
  "--- 6. CRABLINK QUICKCHAIN DISPLAY BOUNDARY ---"

node --test \
  src/pages/quickchain/phase19FinalityDisplay.test.mjs

npm run check:quickchain-phase5-external-posture-boundary

printf '%s\n' \
  "PHASE21A_CRABLINK_QUICKCHAIN_DISPLAY_PREREQS=GREEN" \
  "CRABLINK_FINALITY_AUTHORITY=NO"

printf '%s\n' \
  "--- 7. RUSTYONIONS REAL INTERNAL-ROC PAID PATH ---"

cd "$RUSTYONIONS_REPO"

cargo test \
  -p svc-wallet \
  --test internal_roc_beta_paid_content_receipt_path

printf '%s\n' \
  "PHASE21A_RUSTYONIONS_PAID_PATH=GREEN" \
  "ECONOMIC_MUTATION_INGRESS=svc-wallet" \
  "ECONOMIC_TRUTH=ron-ledger"

printf '%s\n' \
  "--- 8. RUSTYONIONS QUICKCHAIN DETERMINISTIC CHECKPOINT PREREQUISITES ---"

cargo test \
  -p ron-ledger \
  --features quickchain-preflight \
  --test final_beta_phase19_checkpoint_candidate

cargo test \
  -p ron-ledger \
  --features quickchain-preflight \
  --test final_beta_phase19_checkpoint_candidate_reproduction

cargo test \
  -p ron-proto \
  --test final_beta_phase19_checkpoint_validator_signature_contract

cargo test \
  -p ron-proto \
  --test final_beta_phase19_finalized_checkpoint_contract

cargo test \
  -p ron-ledger \
  --features quickchain-preflight \
  --test final_beta_phase19_operation_replay_duplicate

cargo test \
  -p ron-ledger \
  --features quickchain-preflight \
  --test final_beta_phase19_da_archive_fallback

printf '%s\n' \
  "PHASE21A_RUSTYONIONS_QUICKCHAIN_ARTIFACT_PREREQS=GREEN"

printf '%s\n' \
  "--- 9. USER-NODE REPLAY / CHALLENGE PREREQUISITE ---"

cargo test \
  -p micronode \
  --test internal_roc_beta_phase17_epoch_replay

printf '%s\n' \
  "PHASE21A_USER_NODE_REPLAY_CHALLENGE_PREREQ=GREEN"

printf '%s\n' \
  "--- 10. SERVICE-NODE + USER-NODE COMPILE GATE ---"

cargo check \
  -p macronode \
  -p micronode

printf '%s\n' \
  "PHASE21A_SERVICE_NODE_COMPILE=GREEN" \
  "PHASE21A_USER_NODE_COMPILE=GREEN"

printf '%s\n' \
  "--- 11. PHASE21A PREFLIGHT RESULT ---" \
  "FINAL_BETA_PHASE20_ROX_PRIVATE_TESTNET=GREEN" \
  "PHASE21A_ROX_PHASE20_EVIDENCE=GREEN" \
  "PHASE21A_CRABLINK_IDENTITY_PREREQS=GREEN" \
  "PHASE21A_CRABLINK_SOCIAL_PREREQS=GREEN" \
  "PHASE21A_CRABLINK_SITE_PREREQS=GREEN" \
  "PHASE21A_CRABLINK_PAID_PREREQS=GREEN" \
  "PHASE21A_CRABLINK_QUICKCHAIN_DISPLAY_PREREQS=GREEN" \
  "PHASE21A_RUSTYONIONS_PAID_PATH=GREEN" \
  "PHASE21A_RUSTYONIONS_QUICKCHAIN_ARTIFACT_PREREQS=GREEN" \
  "PHASE21A_USER_NODE_REPLAY_CHALLENGE_PREREQ=GREEN" \
  "PHASE21A_SERVICE_NODE_COMPILE=GREEN" \
  "PHASE21A_USER_NODE_COMPILE=GREEN" \
  "FINAL_BETA_PHASE21A_CROSS_REPO_PREFLIGHT=GREEN" \
  "PHASE21_LIVE_NETWORK_STARTED=NO" \
  "PHASE21_CLEAN_DESKTOP_MANUAL_DEMO=NO" \
  "PHASE21_NEW_ROX_TRANSACTION_SUBMISSION=NO" \
  "PHASE21_ROX_HISTORICAL_LIVE_RERUN=NO" \
  "FINAL_BETA_PHASE21_FULL_SYSTEM_DEMO=NOT_YET_GREEN" \
  "NEXT_ACTION=BEGIN_FINAL_BETA_PHASE21B_PRIVATE_NETWORK_BRINGUP"
