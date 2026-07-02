#!/usr/bin/env bash
# RO:WHAT — Focused CrabLink Tauri Internal ROC Stabilization backend balance refresh preflight.
# RO:WHY — Product beta readiness needs backend-derived balance refresh and honest stale/failure labels after paid actions.
# RO:INTERACTS — app package scripts, balance refresh checker, paid UX checker, Phase 4 wallet/receipt checker, Vite build.
# RO:INVARIANTS — balance display is backend-derived or stale-labeled; failed refresh never creates truth; receipt cache remains display-only.
# RO:SECURITY — no fake balances/receipts/finality, no silent spend, no cache-only paid access, no bridge/staking/liquidity/ROX/Solana/external settlement.
# RO:TEST — bash scripts/dev-internal-roc-stabilization-balance-refresh-preflight.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/apps/crablink-tauri"

npm run check:internal-roc-stabilization-balance-refresh
npm run check:internal-roc-stabilization-paid-ux
npm run check:internal-roc-phase4-wallet-receipt-ux
npm run check:internal-roc-phase4-confirmation-failure-ux
npm run build

echo "== Internal ROC Stabilization backend balance refresh truth preflight passed =="
echo "== backend-derived balance normalization; stale/failure labels; paid-success refresh request; display-only stale balance =="
echo "== no local balance truth, fake balance, fake receipt, fake finality, silent spend, cache-only unlock, bridge, staking, liquidity, ROX/Solana, or external settlement introduced =="
