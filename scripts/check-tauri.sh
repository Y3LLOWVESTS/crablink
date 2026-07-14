#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/apps/crablink-tauri"

npm run check:quickchain-boundary
npm run check:quickchain-paid-cache-boundary
npm run check:internal-roc-paid-content-boundary
npm run check:internal-roc-stabilization-paid-ux
npm run check:internal-roc-stabilization-balance-refresh
npm run check:internal-roc-stabilization-render-lock
npm run check:quickchain-readiness-boundary
npm run check:quickchain-phase1-interlock
npm run check:quickchain-phase2-replay-boundary
npm run check:internal-roc-phase2-replay-visibility
npm run check:quickchain-phase2-committee-boundary
npm run check:quickchain-phase3-validator-boundary
npm run check:quickchain-phase3-lifecycle-boundary
npm run check:quickchain-phase4-bond-boundary
npm run check:quickchain-phase4-bond-dispute-boundary
npm run check:quickchain-phase4-bond-enforcement-boundary
npm run check:quickchain-phase5-anchor-boundary
npm run check:quickchain-phase5-da-fallback-boundary
npm run check:quickchain-phase5-external-posture-boundary
npm run check:internal-roc-phase4-wallet-receipt-ux
npm run check:internal-roc-phase4-confirmation-failure-ux
npm run check:service-node-operator-boundary
npm run check:service-node-operator-ui-boundary
npm run check:signed-reward-binding-boundary
npm run check:moderation-review-boundary
npm run check:persistence-review-boundary
npm run check:phase21-operator-acceptance
npm run check:tab-hit-testing-boundary
npm run build
npm run check:rust:mac-media
