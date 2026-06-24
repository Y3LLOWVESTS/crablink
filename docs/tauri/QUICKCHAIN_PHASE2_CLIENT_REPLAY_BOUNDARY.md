# QuickChain Phase 2 Client Replay Boundary — CrabLink Tauri

RO:WHAT — Phase 2 Round 1 verifier-artifact/read-only replication boundary for CrabLink Tauri and client adapters.
RO:WHY — Parks the final Phase 2 Round 1 pair without letting the client become verifier, quorum, fork-choice, finality, settlement, wallet, ledger, or paid-unlock authority.
RO:INTERACTS — QuickchainReadinessPage.jsx, Tauri command adapter, gateway/wallet/content/site clients, paid gates, localCatalog, recentReceipts, QuickChain Phase 1 client interlock docs.
RO:INVARIANTS — backend-derived replay/verifier status is display-only; paid unlock stays tied to backend wallet/ledger receipts; caches remain display-only; no client authority.
RO:SECURITY — no client-side roots, proof verification, replay execution, validator logic, committee/quorum/fork-choice/finality, settlement, bridge, ROX/Solana, staking, slashing, fake receipts, fake balances, silent spend, or replay-artifact paid unlock.
RO:TEST — npm run check:quickchain-phase2-replay-boundary.

## Status

This document is the CrabLink Tauri final-pair interlock for:

```text
QuickChain Phase 2 Round 1 — verifier artifact / read-only replication
```

The backend/service crate-pair sweep is parked for Phase 2 Round 1 through:

```text
ron-proto + ron-ledger
svc-wallet + ron-accounting
svc-rewarder + svc-storage
svc-gateway + omnigate
svc-index + ron-policy
```

CrabLink Tauri + client adapters are the final Phase 2 Round 1 pair.

After this pair is green, the safe label is:

```text
QuickChain Phase 2 Round 1 — COMPLETE / PARKED across all crate pairs
```

Do not call that Phase 2 complete. Phase 2 still needs Round 2 committee-attestation semantics.

## Client interpretation

For CrabLink, Phase 2 Round 1 means:

```text
CrabLink may display backend-derived verifier/replay/readiness status,
but the client must not construct, verify, finalize, or economically trust it as authority.
```

Allowed client behavior:

```text
- display read-only replay/verifier artifact status returned by backend surfaces
- label replay/verifier information as diagnostic/display-only
- show readiness context for humans
- keep paid unlock tied to backend wallet/ledger receipt truth
- keep recent receipts display-only
- keep local catalog display-only
- keep balances backend-derived through wallet/gateway responses
- keep Tauri Rust as the native privilege boundary
- keep TypeScript adapters typed, redacted, and gateway-first
```

Forbidden client behavior:

```text
- produce roots
- produce checkpoints
- execute replay as authority
- verify proofs as authority
- claim verifier truth
- claim committee truth
- claim quorum truth
- choose forks
- claim finality
- claim settlement
- unlock paid content from replay/proof artifacts
- unlock paid content from cache
- mint or fake receipts
- invent balances
- silently spend ROC
- mutate wallet or ledger truth
- bridge, stake, slash, anchor, or expose public-chain runtime
```

## Source-of-truth boundaries

CrabLink may show backend-derived values such as artifact CID, artifact kind, artifact status, replay status label, verifier status label, last seen timestamp, and source service label.

These are display hints unless and until later phases authorize stronger semantics. They are:

```text
not verifier truth
not quorum truth
not committee truth
not fork-choice truth
not finality truth
not settlement truth
not payment truth
not paid entitlement truth
not wallet truth
not ledger truth
```

Paid unlock remains:

```text
prepare/quote
→ explicit user confirmation
→ backend wallet path
→ backend receipt/access response
→ unlock/render
→ display-only receipt cache
→ balance refresh
```

Read-only replay/verifier artifacts cannot replace that path.

Local sources such as localCatalog, recentReceipts, settings storage, dev labels, and readiness dashboard state remain display-only. They must never become paid access truth, receipt truth, balance truth, wallet truth, ledger truth, verifier truth, quorum truth, finality truth, or settlement truth.

## Phase 2 Round 1 exit gate for CrabLink

The client pair is parked when all are true:

```text
QuickChain readiness UI names Phase 2 Round 1 as read-only replay/verifier display only.
QuickChain readiness UI imports only display caches, not active gateway/wallet/Tauri adapters.
TypeScript/Tauri command boundary rejects verifier, committee, quorum, fork-choice, finality, settlement, bridge, anchor, staking, slashing, ROX, and Solana authority commands.
Gateway/wallet/content/site clients do not expose QuickChain authority methods.
Paid gates do not read replay/proof/verifier artifacts for access decisions.
localCatalog and recentReceipts do not export authorization-shaped true flags.
The park script runs the Phase 2 boundary check once through scripts/check-tauri.sh.
```

## Non-regression rules

CrabLink Tauri must not introduce:

```text
root producer
checkpoint producer
proof verifier authority
replay executor authority
validator
committee authority
quorum authority
fork-choice authority
finality authority
settlement authority
bridge authority
anchor authority
staking
slashing
liquidity
ROX
Solana integration
external settlement
client-side wallet authority
client-side ledger truth
client-side receipt minting
client-side paid unlock from cache
client-side paid unlock from replay artifacts
fake balance
fake receipt
silent spend
```

## Parking command

Run from the CrabLink repo root:

```bash
scripts/dev-quickchain-tauri-park.sh
```

Expected final marker:

```text
== CrabLink Tauri QuickChain Phase 2 Round 1 verifier artifact client parking gate passed ==
```
