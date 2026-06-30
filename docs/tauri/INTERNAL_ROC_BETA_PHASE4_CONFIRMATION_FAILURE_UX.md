# Internal ROC Beta Phase 4 Round 2 — CrabLink Confirmation / Failure UX Boundary

RO:WHAT — Defines CrabLink Tauri explicit confirmation, cancel, retry, and failure UX requirements for paid actions.
RO:WHY — Paid actions must be understandable and safe while CrabLink remains display/user intent only.
RO:INTERACTS — AssetContentViewAccess.jsx, SiteVisitAccess.jsx, contentViewClient.js, siteVisitClient.js, gatewayAdapter, receipt cache, BalanceChip, RecentReceiptsPanel.
RO:INVARIANTS — every spend shows amount/action/asset; recipient/split is shown if known; cancel never mutates; confirm triggers adapter path only; failure never unlocks; retry is idempotent/safe.
RO:SECURITY — no fake receipts, fake balances, fake finality, silent spend, cache-only unlock, raw invoke creep, wallet/ledger authority, bridge, staking, liquidity, ROX/Solana, or external settlement.
RO:TEST — npm run check:internal-roc-phase4-confirmation-failure-ux.

## Status

This document covers:

```text
Internal ROC Beta Phase 4 Round 2 — explicit confirmation and failure UX
CrabLink Tauri + client adapters
```

This is client UX and adapter boundary work.

It is not a wallet implementation.

It is not a ledger implementation.

It is not a new mutation path.

It is not bridge, staking, liquidity, ROX, Solana, exchange-facing, or external settlement work.

## Required spend confirmation behavior

Every spend must show:

```text
amount
action
asset/content/site being paid for
payer/account label if known
recipient/split label if known
idempotency/retry safety status if known
source label for backend quote
```

Every spend must include:

```text
cancel
confirm
failure state
retry guidance
```

Cancel rule:

```text
cancel never mutates
cancel never calls pay
cancel never unlocks
cancel may clear local draft/quote UI only
```

Confirm rule:

```text
confirm triggers typed adapter path only
confirm passes confirmed=true
confirm preserves idempotency key
confirm waits for backend wallet/ledger receipt proof
```

Failure rule:

```text
failure does not unlock
failure is redacted/source-labeled
failure keeps paid body/site locked
failure may offer retry only when safe/idempotent
```

## Required backend relationship

CrabLink paid action flow remains:

```text
backend quote
→ visible confirmation summary
→ user clicks confirm
→ typed adapter pay call with confirmed=true
→ backend wallet/ledger receipt proof
→ unlock/render
→ display-only receipt cache
→ backend-derived balance refresh
```

Forbidden shortcuts:

```text
quote alone → unlock
cancel → mutation
failure → unlock
retry → double spend
local cache → unlock
receipt display cache → entitlement
raw invoke → wallet mutation
React state → ledger mutation
```

## Completion label

```text
Internal ROC Beta Phase 4 Round 2 CrabLink explicit confirmation/failure UX boundary is GREEN / PARKED.
```
