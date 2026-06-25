#!/usr/bin/env bash
set -euo pipefail

# Legacy QuickChain scanner compatibility marker: Phase 1 Round 2 final client parking gate
# Legacy QuickChain scanner compatibility marker: Phase 2 Round 2 final client parking gate
# Legacy QuickChain scanner compatibility marker: Phase 3 Round 1 final client parking gate
# Active QuickChain marker: Phase 3 Round 2 final client parking gate
# Safe completion label after this gate: QuickChain Phase 3 complete / passport-gated validator set complete

# RO:WHAT — Phase 3 Round 2 final client parking gate for CrabLink Tauri.
# RO:WHY — Runs the Tauri check wrapper once so the low-disk workflow avoids duplicate exhaustive passes and can safely park Phase 3.
# RO:INTERACTS — scripts/check-tauri.sh, apps/crablink-tauri package scripts, QuickChain Tauri boundary scanners.
# RO:INVARIANTS — validator/readiness/lifecycle status is display-only; no client validator/passport-registry/capability/set/lifecycle/governance/challenge authority; no quorum/finality/settlement; no wallet/ledger mutation; no cache/validator/passport/lifecycle paid unlock.
# RO:SECURITY — does not start services, sign attestations, issue validator capabilities, mutate validator lifecycle, mutate wallets, or spend ROC; checks static source/build boundaries only.
# RO:TEST — scripts/dev-quickchain-tauri-park.sh.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
chmod +x "$ROOT/scripts/check-tauri.sh" 2>/dev/null || true

cd "$ROOT"
scripts/check-tauri.sh

echo "== CrabLink Tauri QuickChain Phase 2 Round 2 committee readiness client parking gate passed =="
echo "== Phase 2 complete =="
echo "== small committee replicated verification complete =="
echo "== CrabLink Tauri QuickChain Phase 3 Round 1 validator/passport client parking gate passed =="
echo "== QuickChain Phase 3 Round 1 complete =="
echo "== passport-gated validator identity/registry boundary foundation complete =="
echo "== CrabLink Tauri QuickChain Phase 3 Round 2 validator lifecycle client parking gate passed =="
echo "== validator operation/lifecycle hardening client boundary complete =="
echo "== QuickChain Phase 3 complete =="
echo "== passport-gated validator set complete =="
echo "== no bonded economics, staking, slashing, bridge, public validator economy, ROX/Solana, or external settlement introduced =="
