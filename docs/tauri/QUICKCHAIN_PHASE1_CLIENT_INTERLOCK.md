# QuickChain Phase 1 Client Interlock — CrabLink Tauri

RO:WHAT — Phase 1 Round 2 final downstream/client boundary interlock for CrabLink Tauri and client adapters.
RO:WHY — Finishes the final Phase 1 Round 2 pair without letting CrabLink become wallet, ledger, paid-unlock, root, checkpoint, proof, validator, bridge, finality, or settlement authority.
RO:INTERACTS — QuickchainReadinessPage.jsx, SiteVisitAccess.jsx, AssetContentViewAccess.jsx, BalanceChip.jsx, PassportSummary.jsx, TopBar.jsx, profileDraftModel.js, gatewayClient.js, walletClient.js, tauriPlatform.js, recentReceipts.js, localCatalog.js, Tauri Rust commands.
RO:INVARIANTS — backend receipt/access response unlocks paid content; cached receipts/catalog entries are display-only; wallet balance verification must come from gateway wallet responses; QuickChain readiness is display-only.
RO:SECURITY — no client-side roots, proofs, checkpoints, validators, finality, bridges, anchors, staking, liquidity, ROX, Solana, external settlement, fake receipts, fake balances, silent spend, or cache-only paid unlock.
RO:TEST — npm run check:quickchain-phase1-interlock.

## Status

This document is the CrabLink Tauri final-pair interlock for:

```text
Phase 1 Round 2 final downstream/client boundary pass
```

The backend/service crate-pair sweep is parked through:

```text
ron-proto + ron-ledger
svc-wallet + ron-accounting
svc-rewarder + svc-storage
svc-gateway + omnigate
svc-index + ron-policy
```

CrabLink Tauri + client adapters are the final Phase 1 Round 2 pair before the final Phase 1 audit.

This interlock does not authorize deterministic roots, proof authority, checkpoint production, validators, bridges, public settlement, ROX, Solana, staking, liquidity, exchange-facing logic, pruning, DA, or external anchoring.

The correct label after this Tauri client gate is green is:

```text
CrabLink Tauri + client adapters: GREEN / PARKED for QuickChain Phase 1 Round 2 client boundary
```

Do not call full Phase 1 complete until the separate final Phase 1 audit confirms the core root/proof material and all downstream non-authority gates remain green.

## Interlock rules

### Paid access

Paid access must be unlocked only by a live backend-derived access or receipt response returned through the gateway path.

Allowed:

```text
quote through svc-gateway
explicit user confirmation
backend wallet/access response
display the returned receipt metadata
store local display copies for UX
refresh wallet balance through gateway
```

Forbidden:

```text
cached receipt unlocks paid content
localCatalog unlocks paid content
recentReceipts unlocks paid content
sessionStorage unlocks paid content
localStorage unlocks paid content
offline bytes unlock paid content alone
fabricated receipt unlocks paid content
```

Display-only receipt cache is not paid unlock authority.

### Wallet and balance display

Wallet and balance UI may display cached labels and last known display values, but verified / ledger-backed status must come from a current gateway wallet response object.

Local settings such as stored display text or `rocLedgerBacked` are display hints only. They must not make UI look verified.

### Offline and b3 cache

Offline/cache display may verify b3 bytes before trusted render, but verified bytes are not economic proof.

Verified b3 proves bytes, not paid entitlement.

The cache may retain display evidence and backend-derived receipt summaries, but it must not mint entitlement, refresh entitlement without backend, claim settlement, create proofs, replace wallet/ledger truth, or unlock paid content alone.

### QuickChain readiness

QuickChain readiness is display-only.

The readiness page may read local display evidence and list deferred work. It must not call gateway, wallet, Tauri commands, root endpoints, checkpoint endpoints, validator endpoints, bridge endpoints, settlement endpoints, finality endpoints, or proof-authority endpoints.

QuickChain readiness UI is informational, not authority.

### Tauri command bridge

Tauri commands remain small, typed, allowlisted, redacted, bounded, gateway-first, and non-authoritative.

Forbidden command shapes include:

```text
quickchain_root
produce_checkpoint
validator_signature
settlement_proof
bridge_anchor
unlock_paid_from_cache
direct_ledger_mutate
direct_wallet_mutate
```

### Phase boundary

CrabLink Tauri is display and user intent only.

The backend truth chain remains:

```text
svc-gateway
→ omnigate
→ svc-wallet
→ ron-ledger
→ backend receipt/access response
→ CrabLink display/unlock for the current confirmed response
```

Local caches remain convenience memory.

They are not wallet truth, ledger truth, balance truth, receipt truth, entitlement truth, paid access truth, settlement truth, proof truth, root truth, finality truth, or validator truth.

## Round 2 exit rule

This pass is a client/downstream boundary closure only.

It may update docs, scanners, package scripts, static gates, and display copy.

It must not add:

```text
client root production
client proof production
client checkpoint production
client validator status as authority
client finality status as authority
client settlement authority
client bridge authority
client wallet mutation
client ledger mutation
cache-only paid unlock
fake balance
fake receipt
silent spend
ROX runtime
Solana runtime
staking
liquidity
exchange-facing logic
```
