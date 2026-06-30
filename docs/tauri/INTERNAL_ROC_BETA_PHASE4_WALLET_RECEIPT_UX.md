# Internal ROC Beta Phase 4 Wallet / Receipt UX Boundary — CrabLink Tauri

RO:WHAT — Phase 4 Round 1 wallet and receipt UX truth boundary for CrabLink Tauri and client adapters.
RO:WHY — Makes CrabLink’s wallet/receipt display clear without letting the client become wallet, ledger, receipt, balance, finality, entitlement, bridge, staking, liquidity, or settlement authority.
RO:INTERACTS — BalanceChip.jsx, appContext.js, ReceiptsPage.jsx, RecentReceiptsPanel.jsx, recentReceipts.js, AssetContentViewAccess.jsx, SiteVisitAccess.jsx, wallet/content/site clients, check-tauri.sh.
RO:INVARIANTS — receipts are backend-derived/display-only; balances are backend-derived or visibly stale; local caches are never paid entitlement; paid unlock requires live backend receipt proof.
RO:SECURITY — no fake receipts, fake balances, fake finality, silent spend, cache-only unlock, direct wallet/ledger mutation, ROX/Solana/bridge/staking/liquidity/external settlement.
RO:TEST — npm run check:internal-roc-phase4-wallet-receipt-ux.

## Status

This document covers:

```text
Internal ROC Beta Phase 4 Round 1 — receipt and balance UX truth labels
CrabLink Tauri + client adapters
```

This is a client UX boundary.

It is not a wallet implementation.

It is not a ledger implementation.

It is not a payout execution implementation.

It is not a bridge implementation.

It is not ROX, Solana, staking, liquidity, exchange-facing, or external settlement work.

## Purpose

CrabLink may display wallet balances and recent receipts.

CrabLink must label those displays so users can tell the difference between:

```text
backend-derived wallet/ledger receipt metadata
backend-derived balance refresh
stale local display hint
offline/failed refresh state
browser-local display cache
paid entitlement truth
```

Only backend wallet/ledger/access responses may create paid access truth.

Local display caches may help the UI remember what happened.

Local display caches must never unlock paid content alone.

## Required client behavior

CrabLink Tauri must preserve these rules:

```text
Receipt panel labels backend source.
Recent receipts are display-only.
Balance chip uses backend refresh.
Stale balance labels are visible.
Failed refresh is honest.
Paid action receipt detail links to asset/action.
No local computed balance as truth.
No local receipt cache as entitlement.
```

## Allowed labels

Allowed wallet/balance labels:

```text
backend-derived balance
ledger-backed backend balance
stale display hint
refresh failed — stale display
refresh failed — no backend balance
gateway refresh pending
display-only wallet balance
```

Allowed receipt labels:

```text
backend-derived receipt
backend source
source boundary
display-only receipt cache
browser-local display cache only
not paid entitlement
wallet/ledger backend truth
```

Allowed paid access relationship:

```text
live backend quote/pay response
→ backend receipt proof
→ render/unlock
→ display-only receipt cache
→ backend-derived balance refresh
```

## Forbidden relationships

```text
local receipt cache → paid entitlement
local catalog → paid entitlement
localStorage → paid entitlement
sessionStorage → paid entitlement
IndexedDB → paid entitlement
stale balance hint → balance truth
receipt display cache → receipt truth
route/cid/idempotency alone → wallet receipt proof
React state → ledger mutation
TypeScript adapter → direct ledger mutation
CrabLink → wallet mutation outside existing backend adapter path
```

## Backend receipt proof rule

A receipt display entry is backend-derived only when it has at least one backend wallet/ledger proof field:

```text
txid
receiptHash / receipt_hash
ledgerRoot / ledger_root
```

A route, b3 CID, storage key, local catalog entry, idempotency key, or crab URL can be useful display context.

Those fields alone are not receipt truth.

## Paid unlock rule

Paid content and paid site visit unlocks must require live backend payment proof in the current response.

If a pay route returns no backend receipt proof, CrabLink must keep the content locked and show an honest failure.

## Phase 4 Round 1 exit gate

```text
Receipt display is backend-derived/display-only.
Balance display is backend-derived or stale-labeled.
No cache-only entitlement.
No fake receipt.
No silent spend.
App-local checks green.
```

## Safe label after this check passes

```text
Internal ROC Beta Phase 4 Round 1 CrabLink Tauri receipt/balance truth-label boundary is GREEN / PARKED.
```
