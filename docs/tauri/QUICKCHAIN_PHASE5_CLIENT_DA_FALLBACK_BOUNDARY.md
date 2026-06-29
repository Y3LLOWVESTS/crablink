# QuickChain Phase 5 Client DA/Archive/Challenge Boundary — CrabLink Tauri

RO:WHAT — Phase 5 Round 2 DA/archive/challenge fallback boundary for CrabLink Tauri and client adapters.
RO:WHY — Allows CrabLink to display backend-derived DA bundle, archive restore, missing-data challenge, retention-window, and pruning-blocker status without becoming DA truth, archive truth, challenge truth, pruning authority, finality, settlement, wallet, ledger, bridge, or paid-unlock authority.
RO:INTERACTS — QuickchainReadinessPage.jsx, TypeScript adapters, Tauri Rust command bridge, localCatalog, recentReceipts, paid/cache surfaces, svc-gateway, omnigate, svc-storage, svc-index, ron-policy, svc-wallet, ron-ledger.
RO:INVARIANTS — DA evidence is display-only; archive restore evidence is display-only; missing-data challenge evidence is display-only; retention windows are display-only metadata; pruning remains blocked; DA/archive/challenge evidence does not unlock paid content.
RO:SECURITY — no pruning authority in CrabLink, no DA truth in CrabLink, no archive restore truth in CrabLink, no challenge adjudication truth in CrabLink, no ROX/Solana active runtime, no public bridge, no external settlement, no staking, no liquidity, no exchange-facing logic, no fake receipts, no fake balances, no fake finality, no silent spend.
RO:TEST — npm run check:quickchain-phase5-da-fallback-boundary.

## Status

This document is the CrabLink Tauri client boundary for:

```text
QuickChain Phase 5 Round 2
DA/archive/challenge fallback
```

It is not a request to implement pruning.

It is not a request to implement live DA.

It is not a request to implement live archive restore authority.

It is not a request to implement missing-data challenge adjudication authority.

It is not a request to implement external settlement.

It is not a request to implement ROX.

It is not a request to implement Solana.

It is not a request to implement a public bridge.

It is not a request to implement staking, liquidity, or exchange-facing logic.

It is not a request to make CrabLink QuickChain authority.

## CrabLink role

```text
CrabLink = display/user intent only
React = display/user intent only
TypeScript adapters = request/status adapters only
Tauri Rust = native privilege boundary only
svc-wallet = paid mutation front-door
ron-ledger = durable economic truth
```

## Plain-language rule

CrabLink may display backend-derived DA/archive/challenge fallback status.

CrabLink may display backend-derived DA bundle labels.

CrabLink may display backend-derived archive restore labels.

CrabLink may display backend-derived missing-data challenge labels.

CrabLink may display backend-derived retention-window labels.

CrabLink may display backend-derived pruning-blocked labels.

CrabLink may display b3 references to DA/archive/challenge artifacts returned by backend services.

CrabLink must not treat DA/archive/challenge evidence as payment truth, balance truth, receipt truth, finality truth, settlement truth, pruning truth, pruning authority, wallet truth, ledger truth, bridge truth, outside-DA truth, outside-chain truth, or paid entitlement truth.

## Allowed client display

Allowed Phase 5 Round 2 client behavior:

```text
display backend-derived DA/archive/challenge fallback metadata
display backend-derived DA bundle status labels
display backend-derived archive restore status labels
display backend-derived missing-data challenge status labels
display backend-derived retention-window labels
display backend-derived pruning-blocked labels
display backend-derived b3 artifact references
display source service labels
display timestamp/status diagnostics
display local proof memory as display-only
display recent backend-returned receipt metadata
display DA/archive/challenge warning copy
```

Allowed wording:

```text
DA fallback display
archive restore display
missing-data challenge display
retention-window display
pruning-blocked display
backend-derived DA/archive/challenge evidence/status
display-only DA/archive/challenge metadata
b3 artifact reference display
source service label display
accepted wallet/ledger receipts remain the only paid unlock authority
```

## Forbidden client authority

CrabLink must not create or expose:

```text
DA truth
DA authority
data availability truth
data availability authority
archive restore truth
archive restore authority
archive proof truth
carrier proof authority
missing-data challenge truth
missing-data challenge authority
challenge adjudication truth
retention-window authority
pruning truth
pruning authority
pruning approval
prune now
paid unlock from DA fallback
paid unlock from archive restore
paid unlock from missing-data challenge
paid unlock from pruning status
wallet mutation from DA/archive/challenge evidence
ledger mutation from DA/archive/challenge evidence
balance from DA/archive/challenge evidence
receipt from DA/archive/challenge evidence
finality from DA/archive/challenge evidence
settlement from DA/archive/challenge evidence
outside-DA truth
outside-chain ROC truth
ROX runtime
Solana runtime
public bridge
external settlement
staking
liquidity
exchange-facing logic
```

Forbidden command or adapter surfaces include:

```text
invoke("da_*")
invoke("archive_*")
invoke("carrier_*")
invoke("missing_data_*")
invoke("challenge_*")
invoke("retention_*")
invoke("prune_*")
invoke("pruning_*")
invoke("settle_*")
invoke("finalize_*")
invoke("bridge_*")
invoke("solana_*")
invoke("rox_*")
```

Forbidden route or action names include:

```text
/da/commit
/da/settle
/archive/restore-authority
/archive/paid-unlock
/challenge/accept
/challenge/settle
/prune/approve
/pruning/execute
/settlement/from-da
/bridge/from-da
```

## Paid/cache rule

The paid unlock path remains:

```text
prepare / quote
explicit user confirmation
backend wallet path
backend receipt / access response
unlock/render from backend access truth
display-only receipt cache
balance refresh
```

Forbidden:

```text
DA evidence unlocks paid content
archive restore evidence unlocks paid content
missing-data challenge evidence unlocks paid content
retention-window status unlocks paid content
pruning-blocked status unlocks paid content
cache-only unlocks paid content
index pointer unlocks paid content
policy allow unlocks paid content
gateway header unlocks paid content
omnigate hydration unlocks paid content
client-side paid unlock from DA/archive/challenge evidence
```

## Offline/cache rule

Offline cache may verify b3 before trusted render, but:

```text
verified cache cannot unlock paid content alone
DA evidence cannot upgrade cache into entitlement truth
archive restore evidence cannot upgrade cache into entitlement truth
missing-data challenge evidence cannot upgrade cache into entitlement truth
retention metadata cannot upgrade cache into entitlement truth
pruning status cannot upgrade cache into entitlement truth
```

## Authority boundary

CrabLink may ask the backend for status.

CrabLink may display backend-derived status.

CrabLink may capture explicit user intent.

CrabLink must not restore archive artifacts as authority.

CrabLink must not adjudicate missing-data challenges.

CrabLink must not approve pruning.

CrabLink must not trigger pruning.

CrabLink must not create DA truth.

CrabLink must not create archive restore truth.

CrabLink must not create missing-data challenge truth.

CrabLink must not create finality.

CrabLink must not create settlement truth.

CrabLink must not create paid unlock truth.

svc-wallet remains the mutation front-door.

ron-ledger remains durable economic truth.

## Completion criteria

CrabLink is parked for Phase 5 Round 2 when:

```text
focused Phase 5 DA/archive/challenge client boundary check passes
existing QuickChain client boundary checks pass
paid/cache boundary check passes
readiness boundary check passes
Tauri park script passes
no raw invoke / authority drift
no paid unlock from DA/archive/challenge evidence
no fake balances or receipts
no client-side pruning/finality/settlement claims
no ROX/Solana/bridge runtime code
```

After that, the safe label is:

```text
Phase 5 Round 2 complete
DA/archive/challenge fallback boundary sweep complete
```

Do not call it:

```text
Phase 5 complete
QuickChain complete
pruning live
bridge live
Solana live
ROX live
external settlement live
public chain live
exchange ready
```

## Scanner compatibility phrase

The Phase 5 Round 2 client boundary includes this exact invariant:

```text
no client-side paid unlock from DA/archive/challenge evidence
```
