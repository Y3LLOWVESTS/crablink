# QuickChain Phase 5 Client External Posture Boundary — CrabLink Tauri

RO:WHAT — Phase 5 Round 3 chosen external integration posture boundary for CrabLink Tauri and client adapters.
RO:WHY — Allows CrabLink to display the selected external posture as backend-derived evidence/status metadata without becoming external posture authority, finality, settlement, bridge, wallet, ledger, balance, receipt, or paid-unlock authority.
RO:INTERACTS — QuickchainReadinessPage.jsx, TypeScript adapters, Tauri Rust command bridge, localCatalog, recentReceipts, paid/cache surfaces, svc-gateway, omnigate, svc-storage, svc-index, ron-policy, svc-wallet, ron-ledger.
RO:INVARIANTS — selected external posture is display-only; external posture evidence is display-only; external integration is evidence/anchoring only; internal wallet/ledger truth remains canonical; external posture evidence does not unlock paid content.
RO:SECURITY — no external posture authority in CrabLink, no external settlement truth in CrabLink, no bridge truth in CrabLink, no ROX/Solana active runtime, no public bridge, no external settlement, no staking, no liquidity, no exchange-facing logic, no fake receipts, no fake balances, no fake finality, no silent spend.
RO:TEST — npm run check:quickchain-phase5-external-posture-boundary.

## Status

This document is the CrabLink Tauri client boundary for:

```text
QuickChain Phase 5 Round 3
chosen external integration path
```

Selected posture for the current authorized scope:

```text
anchor-only
evidence-only
report/status metadata only
display-only where hydrated
reference-only where indexed
declarative-only where policy-gated
backend-derived only
```

anchor-only is the selected posture.

This is not a request to implement ROX, Solana, public bridge, external settlement, external DA runtime, external L2 runtime, staking, liquidity, exchange-facing logic, or a public validator economy.

## CrabLink role

```text
CrabLink = display/user intent only
React = display/user intent only
TypeScript adapters = request/status adapters only
Tauri Rust = native privilege boundary only
svc-gateway = public backend boundary
omnigate = hydration/access composition only
svc-wallet = paid mutation front-door
ron-ledger = durable economic truth
```

## Plain-language rule

CrabLink may display backend-derived selected external posture status, external posture evidence labels, anchor-only posture labels, compact commitment references, b3 artifact references, source service labels, and timestamp/status diagnostics.

CrabLink must not treat external posture evidence as payment truth, balance truth, receipt truth, finality truth, settlement truth, bridge truth, wallet truth, ledger truth, external-chain ROC truth, outside-program truth, or paid entitlement truth.

external integration is evidence/anchoring only.

internal wallet/ledger truth remains canonical.

## Allowed client display

```text
selected external posture display
anchor-only posture display
evidence-only external integration metadata
backend-derived external posture evidence/status
display-only external posture metadata
reference-only external posture labels
source service label display
accepted wallet/ledger receipts remain the only paid unlock authority
```

## Forbidden client authority

```text
external posture authority
external posture truth
external integration authority
external settlement truth
external finality truth
bridge truth from external posture evidence
wallet mutation from external posture evidence
ledger mutation from external posture evidence
balance from external posture evidence
receipt from external posture evidence
paid unlock from external posture evidence
external-chain ROC truth
outside-program ROC truth
ROX runtime
Solana runtime
public bridge
external settlement
external DA runtime
external L2 runtime
staking
liquidity
exchange-facing logic
public validator economy
```

Forbidden command or adapter surfaces include:

```text
invoke("external_posture_*")
invoke("external_*")
invoke("anchor_settle_*")
invoke("bridge_*")
invoke("solana_*")
invoke("rox_*")
invoke("settle_*")
invoke("finalize_*")
invoke("wallet_mutate_from_external_posture")
invoke("ledger_mutate_from_external_posture")
```

Forbidden route or action names include:

```text
/external-posture/commit
/external-posture/settle
/external-posture/finalize
/external-posture/unlock
/external/settle
/external/finalize
/settlement/from-external-posture
/bridge/from-external-posture
/rox/mint
/solana/submit
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
external posture evidence unlocks paid content
anchor-only posture unlocks paid content
external status metadata unlocks paid content
cache-only unlocks paid content
index pointer unlocks paid content
policy allow unlocks paid content
gateway header unlocks paid content
omnigate hydration unlocks paid content
client-side paid unlock from external posture evidence
```

## Offline/cache rule

Offline cache may verify b3 before trusted render, but verified cache cannot unlock paid content alone and external posture evidence cannot upgrade cache into entitlement truth.

## Completion criteria

CrabLink is parked for Phase 5 Round 3 when:

```text
focused Phase 5 external posture client boundary check passes
existing QuickChain client boundary checks pass
paid/cache boundary check passes
readiness boundary check passes
Tauri park script passes
no raw invoke / authority drift
no paid unlock from external posture evidence
no fake balances or receipts
no client-side external settlement/finality/bridge claims
no ROX/Solana/bridge runtime code
```

After green, safe labels are:

```text
QuickChain Phase 5 Round 3 complete
selected external integration posture boundary sweep complete
QuickChain Phase 5 complete
external anchoring/decentralization option complete
QuickChain Phase 5 external anchoring/decentralization option complete for the current boundary/preflight scope.
```

Do not call it public chain live, bridge live, Solana live, ROX live, external settlement live, staking live, liquidity live, public validator economy live, or exchange ready.

## Scanner compatibility phrase

```text
no client-side paid unlock from external posture evidence
```
