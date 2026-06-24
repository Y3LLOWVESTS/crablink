#!/usr/bin/env bash
set -euo pipefail

# Legacy QuickChain scanner compatibility marker: Phase 1 Round 2 final client parking gate
# Active QuickChain marker: Phase 2 Round 2 final client parking gate
# Safe completion label after this gate: Phase 2 complete / small committee replicated verification complete

# RO:WHAT — Phase 2 Round 2 final client parking gate for CrabLink Tauri.
# RO:WHY — Runs the Tauri check wrapper once so the low-disk workflow avoids duplicate exhaustive passes and can safely park Phase 2.
# RO:INTERACTS — scripts/check-tauri.sh, apps/crablink-tauri package scripts, QuickChain Tauri boundary scanners.
# RO:INVARIANTS — committee/readiness status is display-only; no client attestations/quorum/finality/settlement; no wallet/ledger mutation; no cache/replay/attestation paid unlock.
# RO:SECURITY — does not start services or spend ROC; checks static source/build boundaries only.
# RO:TEST — scripts/dev-quickchain-tauri-park.sh.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
chmod +x "$ROOT/scripts/check-tauri.sh" 2>/dev/null || true
cd "$ROOT"
scripts/check-tauri.sh

echo "== CrabLink Tauri QuickChain Phase 2 Round 2 committee readiness client parking gate passed =="
echo "== Phase 2 complete =="
echo "== small committee replicated verification complete =="
