#!/usr/bin/env bash
set -euo pipefail

# RO:WHAT — Final cross-repo QuickChain Phase 1 audit runner.
# RO:WHY — Runs one final focused audit across RustyOnions core/downstream crates and CrabLink Tauri before declaring Phase 1 parked.
# RO:INTERACTS — RustyOnions cargo tests, CrabLink Tauri park script, docs/tauri/QUICKCHAIN_PHASE1_FINAL_AUDIT.md.
# RO:INVARIANTS — core owns roots/proofs; downstream/client remain non-authority; ROC remains internal; no external settlement creep.
# RO:SECURITY — no validators, bridges, ROX, Solana, staking, liquidity, fake balances, fake receipts, fake finality, silent spend, cache-only unlock.
# RO:TEST — scripts/dev-quickchain-phase1-final-audit.sh.

CRABLINK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUSTYONIONS_ROOT="${RUSTYONIONS_ROOT:-$(cd "$CRABLINK_ROOT/.." && pwd)/RustyOnions}"

REPORT="$CRABLINK_ROOT/docs/tauri/QUICKCHAIN_PHASE1_FINAL_AUDIT_RESULT.md"

fail() {
  echo "error: $*" >&2
  exit 1
}

section() {
  printf '\n== %s ==\n' "$*"
}

run() {
  echo "+ $*"
  "$@"
}

require_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "missing required file: $path"
}

require_dir() {
  local path="$1"
  [[ -d "$path" ]] || fail "missing required directory: $path"
}

require_text() {
  local path="$1"
  local text="$2"
  grep -Fq "$text" "$path" || fail "$path missing required marker: $text"
}

section "QuickChain Phase 1 final audit preflight"

require_dir "$CRABLINK_ROOT/apps/crablink-tauri"
require_dir "$RUSTYONIONS_ROOT/crates"

require_file "$CRABLINK_ROOT/docs/tauri/QUICKCHAIN_PHASE1_FINAL_AUDIT.md"
require_file "$CRABLINK_ROOT/docs/tauri/QUICKCHAIN_PHASE1_CLIENT_INTERLOCK.md"
require_file "$CRABLINK_ROOT/scripts/dev-quickchain-tauri-park.sh"

require_text "$CRABLINK_ROOT/docs/tauri/QUICKCHAIN_PHASE1_FINAL_AUDIT.md" "QuickChain Phase 1 complete / parked"
require_text "$CRABLINK_ROOT/docs/tauri/QUICKCHAIN_PHASE1_CLIENT_INTERLOCK.md" "Phase 1 Round 2 final downstream/client boundary pass"
require_text "$CRABLINK_ROOT/docs/tauri/QUICKCHAIN_PHASE1_CLIENT_INTERLOCK.md" "Display-only receipt cache is not paid unlock authority."
require_text "$CRABLINK_ROOT/docs/tauri/QUICKCHAIN_PHASE1_CLIENT_INTERLOCK.md" "QuickChain readiness UI is informational, not authority."

buildplan_found="no"
for candidate in \
  "$RUSTYONIONS_ROOT/QUICKCHAIN_BUILDPLAN.MD" \
  "$RUSTYONIONS_ROOT/docs/quickchain/QUICKCHAIN_BUILDPLAN.MD" \
  "$CRABLINK_ROOT/QUICKCHAIN_BUILDPLAN.MD" \
  "$CRABLINK_ROOT/docs/tauri/QUICKCHAIN_BUILDPLAN.MD"
do
  if [[ -f "$candidate" ]]; then
    buildplan_found="yes"
    require_text "$candidate" "Phase 1"
    require_text "$candidate" "ron-proto + ron-ledger"
    require_text "$candidate" "CrabLink Tauri + client adapters"
    require_text "$candidate" "No ROX"
    require_text "$candidate" "No ROX/Solana"
    echo "Using buildplan reference: $candidate"
    break
  fi
done

if [[ "$buildplan_found" != "yes" ]]; then
  echo "warning: local QUICKCHAIN_BUILDPLAN.MD was not found; continuing because this audit script encodes the final Phase 1 gate."
fi

section "CrabLink Tauri final client-boundary park gate"
cd "$CRABLINK_ROOT"
run scripts/dev-quickchain-tauri-park.sh

section "RustyOnions final focused Phase 1 core/downstream audit"
cd "$RUSTYONIONS_ROOT"

section "ron-proto root/proof/vector DTO contract"
run cargo test -p ron-proto --test quickchain_root_material
run cargo test -p ron-proto --test quickchain_tree_proof
run cargo test -p ron-proto --test quickchain_vector_inventory
run cargo test -p ron-proto --test quickchain_hash_payloads

section "ron-ledger deterministic tree material/proof core"
run cargo test -p ron-ledger --features quickchain-preflight --test quickchain_phase1_tree_material
run cargo test -p ron-ledger --features quickchain-preflight --test quickchain_phase1_tree_proof
run cargo test -p ron-ledger --features quickchain-preflight --test quickchain_projection_canonical_boundary

section "svc-wallet + ron-accounting authority boundaries"
run cargo test -p svc-wallet --features quickchain-preflight --test quickchain_phase1_receipt_root_material_interlock
run cargo test -p svc-wallet --features quickchain-preflight --test quickchain_preflight_no_runtime_authority
run cargo test -p ron-accounting --test quickchain_phase1_root_material_non_authority

section "svc-rewarder + svc-storage downstream confirmation"
run cargo test -p svc-rewarder --test quickchain_phase1_round2_confirmation
run cargo test -p svc-storage --test quickchain_phase1_round2_confirmation

section "svc-gateway + omnigate downstream confirmation"
run cargo test -p svc-gateway --test quickchain_phase1_round2_confirmation
run cargo test -p omnigate --test quickchain_phase1_round2_confirmation

section "svc-index + ron-policy downstream confirmation"
run cargo test -p svc-index --test quickchain_phase1_round2_confirmation
run cargo test -p ron-policy --test quickchain_phase1_round2_confirmation
run cargo test -p ron-policy --test quickchain_phase1_policy_condition_tags

section "Writing final audit result"
cat > "$REPORT" <<'RESULT'
# QuickChain Phase 1 Final Audit Result

RO:WHAT — Result note for the final QuickChain Phase 1 audit.
RO:WHY — Records the cross-stack gate that allows Phase 1 to be called complete / parked.
RO:INTERACTS — RustyOnions core/downstream QuickChain tests and CrabLink Tauri park gate.
RO:INVARIANTS — roots/proofs remain core-only; downstream/client remain non-authority; ROC remains internal.
RO:SECURITY — no ROX/Solana/external settlement/public bridge/staking/liquidity/exchange-facing logic was introduced by this audit.
RO:TEST — scripts/dev-quickchain-phase1-final-audit.sh.

## Result

```text
QuickChain Phase 1 final audit passed.
QuickChain Phase 1 complete / parked.
```

## Gates run

```text
CrabLink:
  scripts/dev-quickchain-tauri-park.sh

RustyOnions:
  cargo test -p ron-proto --test quickchain_root_material
  cargo test -p ron-proto --test quickchain_tree_proof
  cargo test -p ron-proto --test quickchain_vector_inventory
  cargo test -p ron-proto --test quickchain_hash_payloads

  cargo test -p ron-ledger --features quickchain-preflight --test quickchain_phase1_tree_material
  cargo test -p ron-ledger --features quickchain-preflight --test quickchain_phase1_tree_proof
  cargo test -p ron-ledger --features quickchain-preflight --test quickchain_projection_canonical_boundary

  cargo test -p svc-wallet --features quickchain-preflight --test quickchain_phase1_receipt_root_material_interlock
  cargo test -p svc-wallet --features quickchain-preflight --test quickchain_preflight_no_runtime_authority
  cargo test -p ron-accounting --test quickchain_phase1_root_material_non_authority

  cargo test -p svc-rewarder --test quickchain_phase1_round2_confirmation
  cargo test -p svc-storage --test quickchain_phase1_round2_confirmation

  cargo test -p svc-gateway --test quickchain_phase1_round2_confirmation
  cargo test -p omnigate --test quickchain_phase1_round2_confirmation

  cargo test -p svc-index --test quickchain_phase1_round2_confirmation
  cargo test -p ron-policy --test quickchain_phase1_round2_confirmation
  cargo test -p ron-policy --test quickchain_phase1_policy_condition_tags
```

## Safe final status label

```text
QuickChain Phase 1 complete / parked
```

## Still forbidden after Phase 1

```text
QuickChain complete
public chain live
validator economy live
external settlement live
bridge live
staking live
liquidity live
exchange ready
ROX runtime
Solana runtime
pruning before DA/challenge/archive fallback
CrabLink chain authority
gateway/omnigate/rewarder/index/policy/client payment truth
fake balances
fake receipts
fake finality
silent spend
cache-only paid unlock
```
RESULT

section "Final marker"
echo "== QuickChain Phase 1 final audit passed =="
echo "== QuickChain Phase 1 complete / parked =="
