#!/usr/bin/env bash
# RO:WHAT — Focused Internal ROC Beta Phase 4 Round 1 CrabLink wallet/receipt UX preflight.
# RO:WHY — Parks the client UX proof without rerunning unrelated backend crates.
# RO:INTERACTS — apps/crablink-tauri package scripts, Phase 4 wallet/receipt checker, Vite build.
# RO:INVARIANTS — receipt display backend-derived/display-only; balance display backend-derived or stale-labeled; no cache-only entitlement.
# RO:SECURITY — no fake receipts/balances/finality, no silent spend, no direct wallet/ledger mutation, no bridge/staking/liquidity/external settlement.
# RO:TEST — bash scripts/dev-internal-roc-beta-phase4-preflight.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/apps/crablink-tauri"

npm run check:internal-roc-phase4-wallet-receipt-ux
npm run check:internal-roc-phase4-confirmation-failure-ux
npm run build

echo "== Internal ROC Beta Phase 4 Round 1 CrabLink wallet/receipt UX preflight passed =="
echo "== Internal ROC Beta Phase 4 CrabLink wallet/receipt + confirmation/failure UX preflight passed =="
echo "== receipt display backend-derived/display-only; balance display backend-derived or stale-labeled =="
echo "== no cache-only entitlement, fake receipt, fake balance, fake finality, silent spend, unsafe retry, cancel mutation, direct wallet/ledger mutation, bridge, staking, liquidity, ROX/Solana, or external settlement introduced =="
