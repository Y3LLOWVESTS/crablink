# Internal ROC Beta Phase 2 Replay Visibility Client Boundary — CrabLink Tauri

RO:WHAT — Defines the CrabLink Tauri / client-adapter boundary for Internal ROC Beta Phase 2 Round 2 downstream replay/conservation/audit visibility.

RO:WHY — Finishes the client-side Phase 2 replay/conservation proof without letting CrabLink become replay truth, conservation truth, receipt truth, balance truth, paid-unlock truth, finality truth, settlement truth, bridge authority, staking authority, liquidity authority, or wallet/ledger authority.

RO:INTERACTS — QuickchainReadinessPage.jsx, ReceiptsPage.jsx, RecentReceiptsPanel.jsx, recentReceipts.js, localCatalog.js, paid-content client adapters, tauriPlatform.js, check-tauri.sh, dev-quickchain-tauri-park.sh.

RO:INVARIANTS — Internal ROC first; CrabLink displays only; no new ledger mutation paths; paid unlock still depends on backend access truth; accepted backend wallet/ledger receipts remain payment truth; replay/conservation/audit labels are display-only.

RO:SECURITY — No fake receipts, fake balances, fake finality, silent spend, cache-only paid unlock, bridge runtime, staking runtime, liquidity, exchange-facing logic, external settlement, client-side replay authority, client-side wallet authority, or client-side ledger authority.

RO:TEST — npm run check:internal-roc-phase2-replay-visibility.

---

## Status

This document covers:

```text
Internal ROC Beta Phase 2 Round 2 — CrabLink Tauri + client adapters
```

This is the final client-side slice after:

```text
Phase 2 Round 1:
  ron-proto + ron-ledger
  svc-wallet + ron-accounting

Phase 2 Round 2:
  svc-gateway + omnigate
  CrabLink Tauri + client adapters
```

Safe target label after this check passes:

```text
Internal ROC Beta Phase 2 replay/conservation proof complete.
```

## Purpose

CrabLink may display backend-derived replay/conservation/audit status to users as human-readable context.

CrabLink must not turn replay/conservation/audit status into authority.

Allowed display relationship:

```text
backend replay/conservation/audit evidence
→ source-labeled display metadata
→ optional receipt detail panel / readiness panel / status label
```

Forbidden authority relationship:

```text
replay/audit status
→ paid unlock

replay/audit status
→ balance truth

replay/audit status
→ receipt truth

replay/audit status
→ finality truth

replay/audit status
→ settlement truth

replay/audit status
→ wallet mutation

replay/audit status
→ ledger mutation

replay/audit status
→ bridge/staking/liquidity behavior

local cache
→ paid unlock
```

## Required client behavior

CrabLink Tauri must preserve these rules:

```text
Replay/conservation status is display-only.
Replay/audit labels are source-labeled.
Missing replay/audit status does not fabricate truth.
Stale/offline replay/audit labels are honest.
Paid unlock still depends on backend access truth.
Accepted backend wallet/ledger receipts remain the only paid unlock authority.
Receipt cache remains display-only.
Local catalog remains display-only.
Balance refresh remains backend-derived.
CrabLink does not mutate wallet.
CrabLink does not mutate ledger.
CrabLink does not verify replay as authority.
CrabLink does not claim finality from replay status.
CrabLink does not claim settlement from replay status.
```

## Receipt detail panel rule

The receipt detail panel may show replay/audit fields only as optional display context.

Allowed labels:

```text
replay status unavailable
replay observed
conservation observed
backend-derived audit label
stale audit label
offline display copy
```

Forbidden labels:

```text
finalized
settled
bridge settled
staking confirmed
liquidity settled
paid unlock granted by replay
cache unlock granted by replay
```

## Current implementation posture

This pass intentionally does not add a new runtime replay route.

Reason:

```text
The buildplan says the downstream replay/conservation status route is optional.
The required client behavior is display-only status handling and no authority creation.
```

Therefore this pass adds:

```text
client boundary doc
client boundary scanner
package/check integration
park script marker
codebundle inclusion
display-only UI/source markers
```

It does not add:

```text
new Tauri command
new raw invoke path
new gateway route
new wallet route
new ledger route
new replay execution engine
new cache entitlement path
new bridge/staking/liquidity/runtime path
```

## Exit gate

```text
Replay/conservation status is display-only.
Paid unlock still depends on backend access truth.
No client-side replay authority.
No gateway/omnigate mutation.
CrabLink remains display/user intent only.
Focused scanner is green.
App-local park/check is green once.
```

## Completion label

Use this label only after the focused check and app-local park pass:

```text
Internal ROC Beta Phase 2 replay/conservation proof complete.
```
