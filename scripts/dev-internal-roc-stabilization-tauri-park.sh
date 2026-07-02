#!/usr/bin/env bash
# RO:WHAT — Aggregate CrabLink Tauri Internal ROC Stabilization product beta park gate.
# RO:WHY — Runs the green Tauri paid-access stabilization surfaces together so the slice can be safely parked.
# RO:INTERACTS — package scripts, stabilization checkers, Phase 4 checkers, Vite build, Tauri Rust mac-media check.
# RO:INVARIANTS — backend owns receipt/access/balance truth; CrabLink displays and requests refresh only; local cache remains display-only.
# RO:SECURITY — no fake balances/receipts/finality, no silent spend, no cache-only paid access, no developer paid bypass, no ROX/Solana/bridge/staking/liquidity/external settlement.
# RO:TEST — bash scripts/dev-internal-roc-stabilization-tauri-park.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT/apps/crablink-tauri"

cd "$ROOT"

echo "== Internal ROC Stabilization Tauri park: shell syntax =="
bash -n scripts/dev-internal-roc-stabilization-paid-ux-preflight.sh
bash -n scripts/dev-internal-roc-stabilization-balance-refresh-preflight.sh
bash -n scripts/dev-internal-roc-stabilization-render-lock-preflight.sh
bash -n scripts/dev-internal-roc-stabilization-tauri-park.sh

echo "== Internal ROC Stabilization Tauri park: scanner syntax =="
node --check scripts/check-internal-roc-stabilization-paid-ux.mjs
node --check scripts/check-internal-roc-stabilization-balance-refresh.mjs
node --check scripts/check-internal-roc-stabilization-render-lock.mjs
node --check scripts/check-internal-roc-stabilization-tauri-park.mjs

cd "$APP_DIR"

echo "== Internal ROC Stabilization Tauri park: focused gates =="
npm run check:internal-roc-stabilization-tauri-park
npm run check:internal-roc-stabilization-render-lock
npm run check:internal-roc-stabilization-balance-refresh
npm run check:internal-roc-stabilization-paid-ux
npm run check:internal-roc-phase4-wallet-receipt-ux
npm run check:internal-roc-phase4-confirmation-failure-ux

echo "== Internal ROC Stabilization Tauri park: build gates =="
npm run build
npm run check:rust:mac-media

echo "== CrabLink Tauri Internal ROC Stabilization product beta park gate passed =="
echo "== paid UX retry/receipt truth; backend-derived balance refresh; paid denial render-lock =="
echo "== no fake receipt, fake balance, fake finality, silent spend, cache-only unlock, developer paid bypass, direct wallet/ledger mutation, ROX/Solana, bridge, staking, liquidity, or external settlement introduced =="
