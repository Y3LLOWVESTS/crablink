# QuickChain Readiness Boundary — CrabLink Tauri

RO:WHAT — Defines the display-only boundary for the CrabLink Tauri `crab://quickchain` readiness dashboard.
RO:WHY — The readiness page prevents project drift by showing what is proven, missing, and locked without creating chain authority.
RO:INTERACTS — QuickchainReadinessPage.jsx, quickchain.css, localCatalog, recentReceipts, CrabLink router, QuickChain docs.
RO:INVARIANTS — display-only; no chain runtime; no roots; no checkpoints; no validators; no wallet mutation; no fake replay/accounting/reward proofs.
RO:SECURITY — no ROX, Solana, bridge, staking, liquidity, external settlement, client-side wallet authority, or paid unlock authority.
RO:TEST — npm run check:quickchain-readiness-boundary.

## Status

`crab://quickchain` is a readiness dashboard.

It is not QuickChain.

It is not a chain runtime.

It is not a root producer.

It is not a checkpoint producer.

It is not a validator.

It is not a settlement surface.

It is not a bridge.

It is not a wallet.

It is not a ledger.

## Correct role

The page may show:

```text
local proof memory
local receipt counts
backend-derived receipt summaries
missing prerequisite gates
locked/future milestones
manual test commands
truth-boundary notes
developer JSON previews
```

The page must keep all of this display-only.

## Forbidden role

The page must not:

```text
produce QuickChain roots
produce checkpoint hashes
produce state roots
produce receipt roots
produce accounting roots
produce reward roots
claim finality
claim settlement
claim validator status
mutate wallets
mutate ledgers
unlock paid content
authorize spend
derive balances
fabricate receipts
fabricate replay proof
fabricate accounting proof
fabricate reward proof
```

## Allowed local sources

Allowed local sources:

```text
readLocalCatalog
subscribeLocalCatalog
readRecentReceipts
subscribeRecentReceipts
```

Reason:

```text
localCatalog is display memory
recentReceipts is display memory
```

These sources can inform readiness display, but they are not proof of wallet truth, ledger truth, balance truth, entitlement truth, finality, or settlement.

## Forbidden data sources

The readiness page must not directly call:

```text
Tauri invoke
Tauri callTauri
svc-wallet
ron-ledger
ron-accounting
svc-rewarder
svc-storage mutation route
svc-index mutation route
QuickChain root/checkpoint APIs
external bridge/anchor APIs
Solana APIs
ROX APIs
```

If future backend readiness APIs are added, they must be routed through a typed, gateway-first adapter and remain read-only/status-only.

## Mandatory page wording

The page or its scanner must preserve the following ideas:

```text
display-only
no chain logic
no ROX/Solana
no wallet mutation
no fake replay/accounting/reward proofs
QuickChain state is locked/deferred until gates are green
```

## Anti-scope

Do not add any of the following under the readiness page:

```text
chain runtime
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

## Acceptance

This boundary is green when:

```text
npm run check:quickchain-readiness-boundary
npm run check
```

both pass.
