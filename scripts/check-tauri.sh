#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/apps/crablink-tauri"

npm run check:quickchain-boundary
npm run check:quickchain-paid-cache-boundary
npm run check:quickchain-readiness-boundary
npm run check:quickchain-phase1-interlock
npm run check:quickchain-phase2-replay-boundary
npm run check:quickchain-phase2-committee-boundary
npm run check:quickchain-phase3-validator-boundary
npm run check:quickchain-phase3-lifecycle-boundary
npm run check:quickchain-phase4-bond-boundary
npm run check:quickchain-phase4-bond-dispute-boundary
npm run build
npm run check:rust:mac-media
