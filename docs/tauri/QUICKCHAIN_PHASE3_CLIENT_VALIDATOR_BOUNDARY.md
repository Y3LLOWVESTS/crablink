# QuickChain Phase 3 Client Validator Boundary — CrabLink Tauri

RO:WHAT — Phase 3 Round 1 passport-gated validator identity/registry boundary for CrabLink Tauri and client adapters.
RO:WHY — Parks the CrabLink pair for Phase 3 Round 1 without letting the client become validator, passport registry, validator capability, validator-set, quorum, finality, settlement, wallet, ledger, staking, slashing, bridge, or external-chain authority.
RO:INTERACTS — QuickchainReadinessPage.jsx, tauriPlatform.js, gateway/wallet/content/site clients, paid gates, localCatalog, recentReceipts, QuickChain Phase 2 committee boundary.
RO:INVARIANTS — validator-readiness-display only; backend-derived validator/readiness status only; no client-side validator authority; no passport registry authority; no validator capability authority; no validator-set authority; paid unlock remains backend wallet/ledger receipt truth.
RO:SECURITY — no ROX, Solana, public bridge, staking, slashing, bonding, liquidity, external settlement, client-side validator admission/revocation/rotation/capability issuance, fake receipts, fake balances, or silent spend.
RO:TEST — npm run check:quickchain-phase3-validator-boundary.

## Status

QuickChain Phase 3 Round 1 — validator identity + registry gating.

For CrabLink, this is **client-boundary readiness only**. CrabLink may display backend-derived validator/readiness status, passport-required labels, registry-checked labels, governance-review labels, revoked/expired labels, and validator-readiness-display labels only when those are provided by gateway/omnigate/backend truth.

## Allowed

- validator-readiness-display
- backend-derived validator/readiness status
- display-only passport-required labels
- display-only registry-checked labels
- display-only governance-review labels
- display-only revoked/expired validator labels
- keep paid unlock tied to backend wallet/ledger receipts
- keep localCatalog and recentReceipts display-only

## Forbidden

- no client-side validator authority
- no passport registry authority
- no validator capability authority
- no validator-set authority
- no client-side validator admission
- no client-side validator revocation
- no client-side validator rotation
- no client-side validator capability issuance
- no root/checkpoint/proof/finality/settlement authority
- no paid unlock from validator passport, validator set, registry status, or cache
- no staking/slashing/bonding
- no ROX, Solana, public bridge, liquidity, or external settlement

Backend-derived validator/readiness labels are not validator truth, passport registry truth, capability truth, validator-set truth, quorum truth, fork-choice truth, finality truth, settlement truth, payment truth, paid entitlement truth, wallet truth, or ledger truth.

Safe Round 1 wording after this gate is green:

```text
QuickChain Phase 3 Round 1 complete.
passport-gated validator identity/registry boundary foundation complete.
no bonded economics, staking, slashing, bridge, public validator economy, or external settlement introduced.
```
