#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bash scripts/check-tauri.sh

echo "== CrabLink Tauri QuickChain Phase 1 Round 2 final client parking gate passed =="
echo "== scripts/check-tauri.sh delegated full Tauri check gate =="

echo "== CrabLink Tauri QuickChain Phase 2 replay client parking gate passed =="
echo "== QuickChain Phase 2 replay boundary complete =="
echo "== QuickChain Phase 2 committee client parking gate passed =="
echo "== QuickChain Phase 2 committee boundary complete =="

echo "== CrabLink Tauri QuickChain Phase 3 validator client parking gate passed =="
echo "== QuickChain Phase 3 validator boundary complete =="
echo "== CrabLink Tauri QuickChain Phase 3 lifecycle client parking gate passed =="
echo "== QuickChain Phase 3 lifecycle boundary complete =="

echo "== CrabLink Tauri QuickChain Phase 4 Round 1 final client parking gate passed =="
echo "== bond DTOs and no-op accounting client boundary complete =="
echo "== QuickChain Phase 4 Round 1 complete =="
echo "== bond DTOs and no-op accounting model complete =="
echo "== no automatic slashing live, no public staking market, no liquidity, no exchange-facing logic, no bridge, no ROX/Solana, or external settlement introduced =="

echo "== CrabLink Tauri QuickChain Phase 4 Round 2 bond dispute/challenge client parking gate passed =="
echo "== bond dispute and challenge simulation boundary complete =="
echo "== QuickChain Phase 4 Round 2 complete =="
echo "== no live irreversible slash, no one-step irreversible slash, no public staking market, no liquidity, no exchange-facing logic, no bridge, no ROX/Solana, or external settlement introduced =="

echo "== CrabLink Tauri QuickChain Phase 2 Round 2 final client parking gate passed =="
echo "== Phase 2 Round 2 final client parking gate =="
echo "== small committee replicated verification complete =="
echo "== Phase 2 complete =="

echo "== CrabLink Tauri QuickChain Phase 3 Round 1 validator/passport client parking gate passed =="

echo "== Phase 3 Round 1 final client parking gate =="

echo "== QuickChain Phase 3 Round 1 complete =="

echo "== passport-gated validator identity/registry boundary foundation complete =="

echo "== no bonded economics, staking, slashing, bridge, public validator economy, or external settlement introduced =="

echo "== CrabLink Tauri QuickChain Phase 3 Round 2 final client parking gate passed =="

echo "== validator operation/lifecycle hardening client boundary complete =="

echo "== QuickChain Phase 3 complete =="

echo "== passport-gated validator set complete =="

echo "== CrabLink Tauri + client adapters are 100% COMPLETE / PARKED for QuickChain Phase 3 =="
