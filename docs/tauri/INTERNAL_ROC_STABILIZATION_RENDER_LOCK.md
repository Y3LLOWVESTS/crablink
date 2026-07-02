# Internal ROC Stabilization — Paid Denial Render-Lock Boundary

RO:WHAT — Product beta readiness boundary for locked paid render states and denial-safe protected content fetching.
RO:WHY — Paid site/content denial must not fetch, hold, or render protected payload bytes before backend receipt/access proof permits display.
RO:INTERACTS — SiteRender, SiteVisitAccess, AssetHydratedView, AssetContentViewAccess, paid access checks, check-tauri.sh.
RO:INVARIANTS — metadata may resolve before payment; protected root/body/media bytes fetch only after backend proof; denial/failure keeps protected payload empty and locked.
RO:SECURITY — no developer-mode paid bypass, no backend-pending render, no cache-only unlock, no fake receipt, no fake balance, no silent spend, no bridge/staking/liquidity/ROX/Solana/external settlement runtime.
RO:TEST — npm run check:internal-roc-stabilization-render-lock and bash scripts/dev-internal-roc-stabilization-render-lock-preflight.sh.

## Required paid-site behavior

```text
resolve named site metadata
→ derive site_visit policy
→ if paid: keep root document fetch locked
→ quote/pay through backend
→ require backend wallet/ledger receipt/access proof
→ fetch protected root document only after render is allowed
→ sandbox render only after backend-derived access
```

## Required denial behavior

```text
quote failure → no root document fetch, no render
payment failure → no root document fetch, no render
backend-pending route → no developer bypass render
cached receipt/display history → no render
local catalog/cache/settings → no render
```

## Completion label

```text
Internal ROC Stabilization paid denial render-lock boundary is GREEN when focused check, build, and app-local preflight pass.
```
