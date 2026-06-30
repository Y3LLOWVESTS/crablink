# Internal ROC Beta Phase 1 — CrabLink Paid Content Client Boundary

RO:WHAT — Defines the CrabLink Tauri/client-adapter boundary for Internal ROC Beta Phase 1 paid post/comment/article/content_view UX proof.

RO:WHY — CrabLink must prove explicit confirmation, backend-derived receipts, backend-derived balance refresh, and display-only receipt/cache UX without becoming wallet, ledger, receipt, balance, finality, bridge, staking, liquidity, or paid-unlock authority.

RO:INTERACTS — contentViewClient, siteVisitClient, post/comment/article asset clients, AssetContentViewAccess, SiteVisitAccess, post/comment/article publish flows, recentReceipts, localCatalog, tauriPlatform, Tauri Rust command bridge, svc-gateway, omnigate, svc-wallet, ron-ledger.

RO:INVARIANTS — CrabLink is display/user intent only. Every spend requires explicit confirmation. Cancel/failure does not mutate wallet. Accepted receipt display is backend-derived. Balance refresh is backend-derived. Receipt cache and local catalog are display-only. Cache, b3, manifest, policy, and index pointers cannot unlock paid content alone.

RO:SECURITY — No fake receipts, fake balances, fake finality, silent spend, raw invoke from route UI, client wallet authority, client ledger authority, cache-only unlock, bridge runtime, staking runtime, liquidity runtime, ROX/Solana runtime, external settlement, exchange-facing logic, or secrets/spend authority in React, TypeScript, localStorage, URLs, logs, or Tauri command output.

No fake balances

RO:TEST — npm run check:internal-roc-paid-content-boundary.

---

## 0. Status

This document is the CrabLink Tauri/client boundary guard for Internal ROC Beta Phase 1.

It proves the client side of the paid content UX path.

It is not a backend wallet implementation.

It is not a ledger implementation.

It is not a new mutation path.

It is not QuickChain public runtime work.

It is not bridge, staking, liquidity, ROX, Solana, or external settlement work.

---

## 1. Correct paid content client flow

CrabLink may participate in this flow:

```text
prepare / quote
→ explicit user confirmation
→ gateway / backend wallet path
→ backend wallet / ledger receipt
→ backend access response
→ unlock / render
→ display-only receipt cache
→ backend-derived balance refresh
```

The user must see or initiate an explicit confirmation before any spend path is sent.

The client may help shape the request.

The client may display the quote.

The client may display the backend receipt.

The client may display stale/offline labels honestly.

The client must not become the authority for payment, access, receipts, balances, or finality.

---

## 2. Paid post/comment/article publishing boundary

Paid publish flows may use:

```text
post prepare
comment prepare
article prepare
wallet hold
paid proof headers
post publish
comment publish
article publish
backend receipt/proof display
backend-derived balance refresh
```

The publish UI must preserve:

```text
prepare before hold
review before hold
explicit send before hold
backend hold proof before publish
backend rejection means no publish/unlock
balance refresh after accepted wallet path
```

Forbidden:

```text
publish because local state says paid
publish because cache says paid
publish because manifest says paid
publish because index pointer exists
publish because policy allow exists
invent paid proof in React
invent receipt in React
silently open hold
silently capture hold
store spend authority in localStorage
```

---

## 3. Generic content_view boundary

Generic content_view may use:

```text
content_view quote
content_view pay
backend wallet receipt
backend access result
paid render after live backend result
display-only receipt cache
backend-derived balance refresh
```

Content may render after the live backend payment/access result says the paid action succeeded.

Forbidden:

```text
content_view unlock from local receipt cache
content_view unlock from local catalog
content_view unlock from b3 existence
content_view unlock from offline cache
content_view unlock from manifest paid=true
content_view unlock from index pointer
content_view unlock from policy allow decision
content_view unlock from QuickChain/readiness/anchor metadata
```

---

## 4. Receipt display cache boundary

The recent receipt cache is display-only.

It may store public backend-returned receipt metadata for user review.

It may not:

```text
authorize spend
authorize paid access
set current balance
prove finality
become wallet truth
become ledger truth
become settlement truth
become bridge truth
become staking truth
```

Required label:

```text
Browser-local display cache only. Backend wallet and ledger remain authoritative.
```

---

## 5. Balance boundary

CrabLink may display backend-derived balance.

After a paid action succeeds, CrabLink should refresh balance from backend truth.

If refresh fails, the UI must be honest and must not locally invent a new balance.

Forbidden:

```text
receipt cache sets balance
local catalog sets balance
React state computes current balance truth
offline cache computes current balance truth
accounting/reward/readiness display becomes balance truth
```

---

## 6. Tauri command bridge boundary

Tauri Rust may mediate native privilege.

Allowed:

```text
gateway_request
wallet_balance_gateway
bounded media/file/cache commands
settings commands
diagnostic/readiness commands
gateway-first identity/resolve commands
```

Forbidden:

```text
raw invoke from arbitrary UI files
shell/eval/execute/native/raw commands
direct ledger mutation commands
direct wallet mutation authority commands
receipt fabrication commands
balance fabrication commands
finality fabrication commands
bridge/staking/liquidity/external settlement commands
uncapped spend authority
private keys/seeds/raw capabilities in outputs
```

---

## 7. Completion label

Safe label after this check and the Tauri park gate pass:

```text
Internal ROC Beta Phase 1 CrabLink paid content client boundary is GREEN / PARKED.
```

Unsafe labels:

```text
bridge ready
staking ready
ROX ready
Solana ready
external settlement ready
public chain live
client wallet authority live
client receipt authority live
```
