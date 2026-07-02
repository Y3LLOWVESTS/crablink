#!/usr/bin/env bash
# RO:WHAT — Focused CrabLink Tauri Internal ROC Stabilization paid UX preflight.
# RO:WHY — Product beta readiness needs deterministic retry UX, backend-derived proof checks, and locked/redacted failure states without rerunning unrelated crates.
# RO:INTERACTS — apps/crablink-tauri package scripts, check-internal-roc-stabilization-paid-ux.mjs, Vite build.
# RO:INVARIANTS — backend receipt/access proof gates paid render; idempotency key is retry glue only; receipt cache remains display-only.
# RO:SECURITY — no fake receipts/balances/finality, no silent spend, no cache-only paid access, no bridge/staking/liquidity/ROX/Solana/external settlement.
# RO:TEST — bash scripts/dev-internal-roc-stabilization-paid-ux-preflight.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/apps/crablink-tauri"

npm run check:internal-roc-stabilization-paid-ux
npm run check:internal-roc-phase4-confirmation-failure-ux
npm run check:internal-roc-phase4-wallet-receipt-ux
npm run build

echo "== Internal ROC Stabilization paid UX retry/receipt truth preflight passed =="
echo "== deterministic retry key; backend-derived payment proof; locked/redacted failure state; display-only receipt cache =="
echo "== no silent spend, cache-only paid access, fake receipt, fake balance, fake finality, direct wallet/ledger mutation, bridge, staking, liquidity, ROX/Solana, or external settlement introduced =="
