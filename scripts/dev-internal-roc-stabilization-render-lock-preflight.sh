#!/usr/bin/env bash
# RO:WHAT — Focused CrabLink Tauri Internal ROC Stabilization paid denial render-lock preflight.
# RO:WHY — Product beta readiness needs locked paid denial states and no protected payload fetch/render before backend proof.
# RO:INTERACTS — app package scripts, render-lock checker, paid UX checker, balance refresh checker, Phase 4 checks, Vite build.
# RO:INVARIANTS — protected root/body/media bytes fetch only after backend-derived access; backend-pending remains locked.
# RO:SECURITY — no fake receipts/balances/finality, no silent spend, no cache-only paid access, no developer paid bypass, no bridge/staking/liquidity/ROX/Solana/external settlement.
# RO:TEST — bash scripts/dev-internal-roc-stabilization-render-lock-preflight.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/apps/crablink-tauri"

npm run check:internal-roc-stabilization-render-lock
npm run check:internal-roc-stabilization-balance-refresh
npm run check:internal-roc-stabilization-paid-ux
npm run check:internal-roc-phase4-wallet-receipt-ux
npm run check:internal-roc-phase4-confirmation-failure-ux
npm run build

echo "== Internal ROC Stabilization paid denial render-lock preflight passed =="
echo "== protected root fetch deferred until backend access; backend-pending/developer bypass locked; asset byte gates intact =="
echo "== no fake receipt, fake balance, fake finality, silent spend, cache-only unlock, developer paid bypass, bridge, staking, liquidity, ROX/Solana, or external settlement introduced =="
