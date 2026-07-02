# Internal ROC Stabilization — CrabLink Tauri Product Beta Park Gate

RO:WHAT — Aggregated CrabLink Tauri stabilization park gate for paid UX, backend-derived balance refresh, and paid denial render-lock.
RO:WHY — Product beta readiness needs one reproducible local command proving the green Tauri paid-access stabilization slices stayed green together.
RO:INTERACTS — paid UX preflight, balance refresh preflight, render-lock preflight, Phase 4 wallet/receipt checks, Vite build, Tauri Rust mac-media check.
RO:INVARIANTS — CrabLink remains display/user-intent only; backend receipt/access/balance truth remains backend-owned; local caches remain display-only.
RO:SECURITY — no fake receipt, fake balance, fake finality, silent spend, cache-only unlock, developer paid bypass, direct wallet/ledger mutation, ROX/Solana, bridge, staking, liquidity, or external settlement runtime.
RO:TEST — bash scripts/dev-internal-roc-stabilization-tauri-park.sh.

## Status

This is a **stabilization / product beta readiness** park gate.

It does not restart Internal ROC Beta Phase 1–6.

It does not authorize external settlement, ROX, Solana, bridge, staking, liquidity, public validator economy, or exchange-facing runtime.

## Green slices covered

```text
1. Paid UX retry / receipt truth
2. Backend-derived balance refresh / stale labeling
3. Paid denial render-lock / protected payload fetch gating
```

## Required proof chain

```text
render-lock checker
→ balance refresh checker
→ paid UX checker
→ Phase 4 wallet/receipt UX checker
→ Phase 4 confirmation/failure UX checker
→ Vite production build
→ Tauri Rust mac-media cargo check
```

## Park label

```text
CrabLink Tauri Internal ROC Stabilization product beta park gate is GREEN when this aggregate script passes.
```
