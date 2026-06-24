# QuickChain Phase 2 Committee Boundary — CrabLink Tauri

RO:WHAT — Phase 2 Round 2 small committee agreement/readiness boundary for CrabLink Tauri and client adapters.
RO:WHY — Parks the final CrabLink pair for Phase 2 without letting the client become committee, attestation, quorum, fork-choice, finality, settlement, validator, wallet, ledger, bridge, staking, or slashing authority.
RO:INTERACTS — QuickchainReadinessPage.jsx, tauriPlatform.js, gateway/wallet/content/site clients, paid gates, localCatalog, recentReceipts, QuickChain Phase 2 replay boundary.
RO:INVARIANTS — display-only committee readiness; no client attestation signing; no client attestation verification as authority; no quorum/finality/settlement claims; paid unlock remains backend wallet/ledger receipt truth.
RO:SECURITY — no ROX, Solana, public bridge, staking, slashing, liquidity, external settlement, client-side validator authority, client-side committee authority, fake receipts, fake balances, or silent spend.
RO:TEST — npm run check:quickchain-phase2-committee-boundary.

## Status

```text
QuickChain Phase 2 Round 2 — small committee agreement/readiness
```

For CrabLink, this is **client-boundary readiness only**. CrabLink may display backend-derived committee readiness labels, attestation status labels, quorum-readiness labels, and deterministic disagreement/error taxonomy labels, but those labels remain display-only diagnostics.

Allowed:

```text
- display-only committee readiness
- display backend-derived attestation status labels
- display backend-derived quorum-readiness labels
- keep paid unlock tied to backend wallet/ledger receipts
- keep localCatalog and recentReceipts display-only
```

Forbidden:

```text
- no client attestation signing
- no client attestation verification as authority
- no client committee authority
- no quorum/finality/settlement claims
- no anti-double-attestation adjudication in CrabLink
- no paid unlock from committee/attestation artifacts
- no ROX, Solana, bridge, staking, slashing, liquidity, or external settlement
```

Backend-derived committee/readiness labels are not attestation truth, verifier truth, committee truth, quorum truth, fork-choice truth, finality truth, settlement truth, payment truth, paid entitlement truth, wallet truth, or ledger truth.

The park script runs the Phase 2 Round 2 committee boundary check once through scripts/check-tauri.sh.

Safe completion wording after this final client gate is green:

```text
Phase 2 complete
small committee replicated verification complete
```

Do not call it public validator network, staking network, external settlement, bridge-ready, or public chain live.
