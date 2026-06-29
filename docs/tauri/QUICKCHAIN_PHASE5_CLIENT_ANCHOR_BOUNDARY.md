# QuickChain Phase 5 Client Anchor Boundary — CrabLink Tauri

RO:WHAT — Phase 5 Round 1 anchor-only dry-run boundary for CrabLink Tauri and client adapters.
RO:WHY — Allows CrabLink to display backend-derived anchor dry-run evidence/status without becoming anchor, finality, settlement, wallet, ledger, bridge, or paid-unlock authority.
RO:INTERACTS — QuickchainReadinessPage.jsx, TypeScript adapters, Tauri Rust command bridge, localCatalog, recentReceipts, paid/cache surfaces, svc-gateway, omnigate, svc-wallet, ron-ledger.
RO:INVARIANTS — anchor evidence is display-only; external anchors do not mutate ROC balances; anchors do not replace wallet/ledger truth; anchors do not unlock paid content.
RO:SECURITY — no ROX/Solana active runtime, no public bridge, no external settlement, no staking, no liquidity, no exchange-facing logic, no fake receipts, no fake balances, no fake finality, no silent spend.
RO:TEST — npm run check:quickchain-phase5-anchor-boundary.

## Status

This document is the CrabLink Tauri client boundary for:

```text
QuickChain Phase 5 Round 1
Anchor-only design and dry-run
```

It is not a request to implement live external settlement.

It is not a request to implement ROX.

It is not a request to implement Solana.

It is not a request to implement a bridge.

It is not a request to implement public staking, liquidity, or exchange-facing logic.

It is not a request to make CrabLink chain authority.

## Plain-language rule

CrabLink may display anchor dry-run status.

CrabLink may display backend-derived anchor evidence labels.

CrabLink may display compact commitment metadata as read-only diagnostics.

CrabLink may display b3 references to anchor artifacts returned by backend services.

CrabLink must not treat anchor evidence as payment truth, balance truth, receipt truth, finality truth, settlement truth, bridge truth, wallet truth, ledger truth, or paid entitlement truth.

## Allowed client display

Allowed Phase 5 Round 1 client behavior:

```text
display backend-derived anchor dry-run metadata
display backend-derived anchor status labels
display backend-derived compact commitment references
display backend-derived b3 artifact references
display source service labels
display timestamp/status diagnostics
display local proof memory as display-only
display recent backend-returned receipt metadata
display anchor warning copy
```

Allowed wording:

```text
anchor dry-run
anchor evidence
anchor status
compact commitment
read-only metadata
backend-derived
display-only
b3 reference
not settlement
not finality
not wallet truth
not ledger truth
```

## Forbidden client authority

Forbidden Phase 5 Round 1 client behavior:

```text
anchor authority
anchor truth
anchor settlement truth
anchor finality truth
anchor payment truth
anchor paid unlock authority
external-chain ROC truth
settle from anchor
finalize from anchor
unlock from anchor
paid unlock from anchor
wallet mutation from anchor
ledger mutation from anchor
balance from anchor
receipt from anchor
```

Forbidden Tauri/adapter authority surfaces:

```text
invoke("anchor_*")
invoke("bridge_*")
invoke("solana_*")
invoke("rox_*")
invoke("settle_*")
invoke("finalize_*")
invoke("wallet_mutate_from_anchor")
invoke("ledger_mutate_from_anchor")
```

Forbidden runtime creep:

```text
ROX active runtime
Solana active runtime
Solana Anchor program code
bridge mint/burn code
external settlement
public bridge
staking
liquidity
exchange-facing logic
public validator economy
client-side finality
client-side settlement
client-side wallet truth
client-side ledger truth
client-side receipt minting
client-side balance fabrication
client-side paid unlock from anchor evidence
cache-only paid unlock
fake receipt
fake balance
fake finality
silent spend
```

## Paid flow preserved

Correct paid flow remains:

```text
prepare / quote
→ explicit user confirmation
→ backend wallet path
→ backend receipt / access response
→ unlock / render
→ display-only receipt cache
→ balance refresh
```

Anchor evidence is never inserted into this path as entitlement truth.

Anchor evidence cannot replace backend wallet receipt truth.

Anchor evidence cannot replace ron-ledger economic truth.

Anchor evidence cannot convert local cache into paid access authority.

## Cache and offline boundary

CrabLink cache remains convenience only.

Offline cache may verify b3 before trusted render, but:

```text
verified cache cannot unlock paid content alone
anchor evidence cannot upgrade cache into entitlement truth
anchor evidence cannot create a receipt
anchor evidence cannot create a balance
anchor evidence cannot create finality
anchor evidence cannot create settlement
```

## Source-of-truth boundary

CrabLink Tauri remains:

```text
display-only
user-intent-only
gateway-first
backend-derived-truth-only
cache-convenience-only
Tauri-first
React display/user intent only
TypeScript adapter boundary only
Rust-side native privilege boundary
```

Backend truth remains:

```text
svc-wallet = mutation front-door
ron-ledger = durable economic truth
ron-accounting = reporting/snapshots, not balance truth
svc-rewarder = payout planning, not mutation
svc-storage = bytes/artifacts, not settlement
svc-gateway = public boundary, not ledger mutation
omnigate = hydration/access composition, not ledger mutation
svc-index = lookup/pointer metadata, not payment truth
ron-policy = declarative policy, not settlement truth
CrabLink = display/user intent only
```

## Completion criteria

CrabLink is parked for Phase 5 Round 1 when:

```text
focused Phase 5 anchor client boundary check passes
existing QuickChain client boundary checks pass
paid/cache boundary check passes
readiness boundary check passes
Tauri park script passes
no raw invoke / authority drift
no paid unlock from anchor evidence
no fake balances or receipts
no client-side settlement/finality claims
no ROX/Solana/bridge runtime code
```

After that, the safe label is:

```text
Phase 5 Round 1 complete
anchor-only dry-run boundary sweep complete
```

Do not call it:

```text
Phase 5 complete
QuickChain complete
bridge live
Solana live
ROX live
external settlement live
public chain live
exchange ready
```

## Scanner compatibility phrase

The Phase 5 Round 1 client boundary includes this exact invariant:

```text
no client-side paid unlock from anchor evidence
```
