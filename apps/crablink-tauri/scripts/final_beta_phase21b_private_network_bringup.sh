#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(
  cd "$(
    dirname "$0"
  )" &&
  pwd
)"

CRABLINK_REPO="$(
  cd "$SCRIPT_DIR/../../.." &&
  pwd
)"

PROJECT_PARENT="$(
  cd "$CRABLINK_REPO/.." &&
  pwd
)"

RUSTYONIONS_REPO="${RUSTYONIONS_REPO:-$PROJECT_PARENT/RustyOnions}"

LIVE_TEST_FILE="$RUSTYONIONS_REPO/crates/macronode/tests/phase22_local_two_node_topology.rs"

LIVE_TEST_NAME="phase19_live_three_service_one_user_topology_survives_member_loss_and_restart"

fail() {
  printf '%s\n' \
    "FINAL_BETA_PHASE21B_PRIVATE_NETWORK_BRINGUP=RED" \
    "FAILURE=$1" \
    "WALLET_MUTATION=NO" \
    "LEDGER_MUTATION=NO" \
    "ROX_TRANSACTION_SUBMISSION=NO" \
    "MAINNET=NO"
  exit 1
}

printf '%s\n' \
  "=== FINAL_BETA PHASE21B PRIVATE NETWORK BRINGUP ===" \
  "RUSTYONIONS_REPO=$RUSTYONIONS_REPO" \
  "TOPOLOGY=THREE_SERVICE_NODES_PLUS_ONE_USER_NODE" \
  "NETWORK_SCOPE=LOCAL_LOOPBACK_PRIVATE_BETA" \
  "WALLET_MUTATION=NO" \
  "LEDGER_MUTATION=NO" \
  "ROX_TRANSACTION_SUBMISSION=NO" \
  "MAINNET=NO"

test -d "$RUSTYONIONS_REPO" ||
  fail "RustyOnions repo missing"

test -f "$RUSTYONIONS_REPO/Cargo.toml" ||
  fail "RustyOnions Cargo workspace missing"

test -f "$LIVE_TEST_FILE" ||
  fail "live topology test file missing"

grep -Fq \
  "$LIVE_TEST_NAME" \
  "$LIVE_TEST_FILE" ||
  fail "required live Phase19 topology test missing"

grep -Fq \
  "three real Service Nodes" \
  "$LIVE_TEST_FILE" ||
  fail "live topology three-Service-Node contract missing"

grep -Fq \
  "one real micronode" \
  "$LIVE_TEST_FILE" ||
  fail "live topology User Node contract missing"

grep -Fq \
  "without wallet, ledger, or finality authority" \
  "$LIVE_TEST_FILE" ||
  fail "live topology non-authority closeout contract missing"

printf '%s\n' \
  "PHASE21B_LIVE_TEST_SOURCE=GREEN" \
  "PHASE21B_EXPECTED_SERVICE_NODE_COUNT=3" \
  "PHASE21B_EXPECTED_USER_NODE_COUNT=1"

cd "$RUSTYONIONS_REPO"

printf '%s\n' \
  "--- BUILD REAL NODE BINARIES ---"

cargo build \
  -p macronode \
  --bin macronode

cargo build \
  -p micronode \
  --bin micronode

printf '%s\n' \
  "PHASE21B_MACRONODE_BINARY=GREEN" \
  "PHASE21B_MICRONODE_BINARY=GREEN"

printf '%s\n' \
  "--- RUN REAL THREE-SERVICE / ONE-USER PRIVATE TOPOLOGY ---"

cargo test \
  -p macronode \
  --test phase22_local_two_node_topology \
  "$LIVE_TEST_NAME" \
  -- \
  --ignored \
  --exact \
  --nocapture \
  --test-threads=1

printf '%s\n' \
  "--- FINAL_BETA PHASE21B RESULT ---" \
  "PHASE21_STEP1_PRIVATE_RUSTYONIONS_NETWORK=GREEN" \
  "PHASE21_STEP2_MULTIPLE_SERVICE_NODES=3_GREEN" \
  "PHASE21_STEP3_USER_NODE_VERIFIER=1_GREEN" \
  "PHASE21B_REAL_MACRONODE_PROCESSES=3_GREEN" \
  "PHASE21B_REAL_MICRONODE_PROCESSES=1_GREEN" \
  "PHASE21B_CRYPTOGRAPHIC_QUORUM=GREEN" \
  "PHASE21B_ONE_OF_THREE_REJECTED=GREEN" \
  "PHASE21B_TWO_OF_THREE_ACCEPTED=GREEN" \
  "PHASE21B_MEMBER_FAILURE_ISOLATION=GREEN" \
  "PHASE21B_QUORUM_AFTER_MEMBER_LOSS=GREEN" \
  "PHASE21B_MEMBER_RESTART=GREEN" \
  "PHASE21B_RESTARTED_IDENTITY_STABLE=GREEN" \
  "WALLET_MUTATION=NO" \
  "LEDGER_MUTATION=NO" \
  "CRABLINK_FINALITY_AUTHORITY=NO" \
  "ROX_TRANSACTION_SUBMISSION=NO" \
  "PUBLIC_NETWORK_BIND=NO" \
  "MAINNET=NO" \
  "FINAL_BETA_PHASE21B_PRIVATE_NETWORK_BRINGUP=GREEN" \
  "FINAL_BETA_PHASE21_FULL_SYSTEM_DEMO=NOT_YET_GREEN" \
  "NEXT_ACTION=BEGIN_FINAL_BETA_PHASE21C_CLEAN_DESKTOP_NETWORK_SESSION"
