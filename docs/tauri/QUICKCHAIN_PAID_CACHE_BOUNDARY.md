# QuickChain Paid / Cache Boundary — CrabLink Tauri

RO:WHAT — Defines the QuickChain/ROC paid-access, receipt-cache, and offline-cache authority boundary for CrabLink Tauri.
RO:WHY — Prevents CrabLink from drifting into wallet truth, ledger truth, receipt truth, paid-unlock authority, or QuickChain authority.
RO:INTERACTS — React pages, TypeScript adapters, Tauri Rust commands, recent receipt cache, local catalog, paid asset viewers, svc-gateway, omnigate, svc-wallet, ron-ledger.
RO:INVARIANTS — Receipt display cache is display-only. Cached receipt cannot unlock paid content. Paid unlock requires backend-derived receipt/access response. Offline cache cannot create receipt, balance, or entitlement truth.
RO:SECURITY — no client-side receipt minting, fake balances, fake paid unlocks, cache-only entitlements, roots, checkpoints, validators, bridges, ROX, Solana, staking, liquidity, or external settlement.
RO:TEST — npm run check:quickchain-paid-cache-boundary.

## Status

This document is a CrabLink Tauri client boundary guard.

It is not a request to implement paid offline entitlement.

It is not a request to implement QuickChain runtime behavior.

It is not a request to implement root, checkpoint, validator, bridge, staking, liquidity, ROX, Solana, or external settlement behavior.

## Plain-language rule

CrabLink may show a cached receipt.

CrabLink may show verified public cached content.

CrabLink may help the user start a paid action.

CrabLink may display backend-returned receipt metadata.

CrabLink must not treat any local cache entry as economic authority.

## Required paid flow

Correct paid flow:

```text
prepare / quote
→ explicit user confirmation
→ backend wallet path
→ backend receipt/access response
→ backend storage/gateway/omnigate paid enforcement
→ unlock/render
→ display-only receipt cache
→ balance refresh from backend
```

## Forbidden paid flow

Forbidden paid flow:

```text
local UI says paid=true
local cache says paid=true
receipt-shaped JSON exists in localStorage
recent receipt cache contains an item
offline cache has bytes
manifest says paid=true
index pointer exists
policy allow decision exists
therefore unlock paid content
```

## Receipt cache boundary

Receipt display cache is display-only.

Cached receipt cannot unlock paid content.

Cached receipt cannot authorize spend.

Cached receipt cannot set balance.

Cached receipt cannot prove finality.

Cached receipt cannot become ledger truth.

Cached receipt cannot become wallet truth.

Receipt display cache may help the user review past backend-returned receipts, but it is not an entitlement engine.

## Offline cache boundary

Offline cache can help render verified public content.

Offline cache cannot create receipt, balance, or entitlement truth.

Offline cache cannot unlock paid content by itself.

Offline cache cannot spend.

Offline cache cannot publish.

Offline cache cannot mutate wallet.

Offline cache cannot mutate ledger.

Offline cache cannot mutate index.

Offline cache cannot claim ownership.

Offline cache cannot claim live name truth.

## Balance boundary

Balance display must come from backend truth.

Offline display may show stale/cached labels only if clearly marked.

Local storage must not set current balance truth.

Receipt display cache must not set current balance truth.

Offline cache must not set current balance truth.

## QuickChain anti-scope

CrabLink Tauri must not implement:

```text
QuickChain runtime
root producer
checkpoint producer
validator
settlement authority
bridge authority
staking
liquidity
ROX
Solana integration
external settlement
client-side wallet authority
client-side ledger truth
client-side receipt minting
client-side paid unlock from cache
```

## Scanner intent

The paid/cache boundary scanner is intentionally conservative.

It looks for:

```text
cache-only paid unlock naming
receipt-cache entitlement naming
local/session storage keys that look like paid truth
balance-from-cache naming
receipt-from-cache fabrication naming
allow_paid_unlock_from_cache=true style flags
paid offline entitlement shortcuts
```

Safe display-only receipt caches are allowed when labeled as display-only and backend-authoritative.
