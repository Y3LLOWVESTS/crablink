# QuickChain Phase 3 Client Lifecycle Boundary — CrabLink Tauri

RO:WHAT — Phase 3 Round 2 validator operation / lifecycle hardening boundary for CrabLink Tauri and client adapters.
RO:WHY — Closes the final Phase 3 client pass without letting CrabLink become validator lifecycle authority, passport registry authority, governance authority, replay challenge authority, settlement authority, wallet/ledger authority, paid unlock authority, bridge authority, or external-chain authority.
RO:INTERACTS — QuickchainReadinessPage.jsx, tauriPlatform.js, gateway/wallet/content/site clients, paid gates, localCatalog, recentReceipts, Phase 3 validator boundary docs/scripts, Tauri park script.
RO:INVARIANTS — lifecycle status display only; backend-derived lifecycle/readiness labels only; no validator lifecycle mutation; no validator rotation/revocation/downtime/equivocation/replay-challenge/governance mutation; no cache-only paid unlock; no fake receipts/balances/finality.
RO:SECURITY — no ROX, Solana, public bridge, staking, slashing, bonding, validator rewards, liquidity, exchange-facing logic, external settlement, client-side lifecycle authority, fake receipts, fake balances, or silent spend.
RO:TEST — npm run check:quickchain-phase3-lifecycle-boundary.

## Status

QuickChain Phase 3 Round 2 — validator operation / lifecycle hardening.

For CrabLink, this is **client-boundary lifecycle display only**. CrabLink may display backend-derived lifecycle labels such as validator readiness display, lifecycle status display, governance review display, replay challenge display, downtime display, degraded display, revoked display, expired display, and evidence status display.

Those labels are diagnostic UI context only. They are not validator lifecycle truth, passport registry truth, validator capability truth, governance truth, replay challenge truth, evidence truth, quorum truth, finality truth, settlement truth, payment truth, paid entitlement truth, wallet truth, ledger truth, or bridge truth.

## Allowed display-only words

- validator readiness display
- lifecycle status display
- governance review display
- replay challenge display
- downtime display
- degraded display
- revoked display
- expired display
- evidence status display
- backend-derived validator/passport/lifecycle/readiness context
- display-only localCatalog and recentReceipts evidence
- explicit user intent routed through typed gateway-first adapters

## Forbidden authority words and flows

- grantValidatorLifecycleAuthority
- commitValidatorRotation
- commitValidatorRevocation
- markValidatorDowntime
- acceptEquivocationEvidence
- acceptReplayChallenge
- commitGovernanceParameterUpdate
- unlockFromValidatorLifecycle
- settleFromReplayChallenge
- client-side validator lifecycle authority
- client-side validator admission authority
- client-side validator revocation authority
- client-side validator rotation authority
- client-side validator downtime authority
- client-side equivocation authority
- client-side replay challenge authority
- client-side governance parameter-update authority
- client-side finality truth
- client-side settlement truth
- client-side wallet or ledger truth
- cache-only paid unlock
- fake receipt
- fake balance
- silent spend
- staking, slashing, bonding, validator rewards, public validator economy, bridge, ROX, Solana, liquidity, exchange-facing logic, or external settlement

## Completion wording

Safe final pair label after this gate is green:

```text
CrabLink Tauri + client adapters are 100% COMPLETE / PARKED for QuickChain Phase 3.
```

Safe full phase label after the final client park script is green:

```text
QuickChain Phase 3 complete.
passport-gated validator set complete.
```

Do not call this:

```text
QuickChain complete
chain live
public validator network
staking live
slashing live
bridge live
external settlement live
ROX/Solana live
exchange ready
```
