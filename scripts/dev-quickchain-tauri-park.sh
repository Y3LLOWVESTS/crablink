#!/usr/bin/env bash
set -euo pipefail

# RO:WHAT — Parking gate for the CrabLink Tauri QuickChain QC-0A client-boundary pass.
# RO:WHY — Runs the single delegated Tauri check path without duplicating expensive build/check work.
# RO:INTERACTS — scripts/check-tauri.sh, apps/crablink-tauri/package.json, QuickChain boundary scanners.
# RO:INVARIANTS — no chain runtime; no wallet/ledger mutation; no gateway mutation; no duplicate exhaustive runs.
# RO:SECURITY — local static/build checks only; does not print secrets or start services.
# RO:TEST — bash scripts/dev-quickchain-tauri-park.sh.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT/scripts/check-tauri.sh"

echo "== CrabLink Tauri QuickChain Phase-0 parking gate passed =="
