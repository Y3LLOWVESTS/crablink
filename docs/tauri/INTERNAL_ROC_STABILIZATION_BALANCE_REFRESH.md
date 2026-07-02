# Internal ROC Stabilization — Backend Balance Refresh Truth Boundary

RO:WHAT — Product beta readiness boundary for CrabLink backend-derived wallet balance refresh, stale display labels, and failure-safe balance UI.
RO:WHY — Internal ROC paid UX needs receipt success to trigger backend balance refresh without ever making local UI/caches balance truth.
RO:INTERACTS — appContext.js, BalanceChip.jsx, walletClient.js, AssetContentViewAccess.jsx, SiteVisitAccess.jsx, check-tauri.sh.
RO:INVARIANTS — wallet/ledger truth remains backend-owned; balance display is backend-derived or stale-labeled; failed refresh never invents a balance; local settings are display hints only.
RO:SECURITY — no fake balances, local balance truth, silent spend, cache-only entitlement, direct ledger mutation, ROX/Solana, bridge, staking, liquidity, or external settlement runtime.
RO:TEST — npm run check:internal-roc-stabilization-balance-refresh and bash scripts/dev-internal-roc-stabilization-balance-refresh-preflight.sh.

## Status

This is a stabilization / product beta readiness artifact.

It does not restart Internal ROC Beta Phase 1–6.

It does not authorize ROX, Solana, bridge, staking, liquidity, external settlement, public validator economy, or exchange-facing runtime.

## Required behavior

```text
paid action success
→ backend receipt/access proof returned
→ display-only receipt/cache update
→ backend wallet balance refresh requested
→ backend-derived balance display if refresh succeeds
→ stale/failure label if refresh fails
```

Balance display rule:

```text
backend-derived balance = display only, sourced from gateway/wallet/ledger response
stale balance = last backend value, visibly stale, never truth
settings balance = stale display hint only, never truth
```

Forbidden behavior:

```text
local cache creates balance truth
local settings create balance truth
receipt cache creates balance truth
failed refresh computes a new balance
CrabLink mutates ledger or wallet balance
```

## Completion label

```text
Internal ROC Stabilization backend balance refresh truth boundary is GREEN when focused check, build, and app-local preflight pass.
```
