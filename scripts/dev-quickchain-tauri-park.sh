#!/usr/bin/env bash
set -euo pipefail

# RO:WHAT — Parking gate for CrabLink Tauri QuickChain client-boundary hardening.
# RO:WHY — Runs the existing Tauri check wrapper once so the low-disk workflow avoids duplicate exhaustive passes.
# RO:INTERACTS — scripts/check-tauri.sh, apps/crablink-tauri package scripts, QuickChain Tauri boundary scanners.
# RO:INVARIANTS — no runtime QuickChain; no validators/checkpoints/settlement; no wallet/ledger mutation; no cache-only paid unlock.
# RO:SECURITY — does not start services or spend ROC; checks static source/build boundaries only.
# RO:TEST — scripts/dev-quickchain-tauri-park.sh.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -x "$ROOT/scripts/check-tauri.sh" ]]; then
  chmod +x "$ROOT/scripts/check-tauri.sh" 2>/dev/null || true
fi

cd "$ROOT"
scripts/check-tauri.sh

echo "== CrabLink Tauri QuickChain Phase 1 Round 1 foundation parking gate passed =="
