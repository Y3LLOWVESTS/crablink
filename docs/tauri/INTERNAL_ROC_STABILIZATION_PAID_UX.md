# Internal ROC Stabilization — Paid UX Retry / Receipt Truth Boundary

RO:WHAT — Product beta readiness boundary for CrabLink paid access retry UX, backend-derived receipt display, and locked failure states.
RO:WHY — Internal ROC Phase 6 is parked; stabilization now hardens the already-proven paid value loop without reopening implementation phases.
RO:INTERACTS — AssetContentViewAccess, SiteVisitAccess, paidAccessTruth.js, contentViewClient, siteVisitClient, recentReceipts, check-tauri.sh.
RO:INVARIANTS — explicit confirmation before spend; deterministic idempotency key per quote/payment attempt; backend receipt/access proof before render; local receipt cache display-only.
RO:SECURITY — no fake balances, fake receipts, fake finality, silent spend, cache-only paid access, bridge, staking, liquidity, ROX/Solana, or external settlement runtime.
RO:TEST — npm run check:internal-roc-stabilization-paid-ux and bash scripts/dev-internal-roc-stabilization-paid-ux-preflight.sh.

## Status

This is a stabilization / product beta readiness artifact.

It does not restart Internal ROC Beta Phase 1–6.

It does not authorize ROX, Solana, bridge, staking, liquidity, external settlement, public validator economy, or exchange-facing runtime.

## Required behavior

```text
backend quote
→ visible user confirmation
→ deterministic retry idempotency key
→ confirmed backend payment route
→ backend wallet/ledger receipt/access proof
→ render paid content/site
→ display-only receipt cache
→ backend-derived balance refresh
```

Failure behavior:

```text
failure stays locked
failure is source-labeled
failure is redacted
failure may retry with the same idempotency key
failure never renders protected content by itself
```

Idempotency rule:

```text
idempotency_key = retry key, not authority
operation_id = backend durable ledger-op display metadata, not client authority
```

## Completion label

```text
Internal ROC Stabilization paid UX retry/receipt truth boundary is GREEN when focused check, build, and app-local preflight pass.
```
