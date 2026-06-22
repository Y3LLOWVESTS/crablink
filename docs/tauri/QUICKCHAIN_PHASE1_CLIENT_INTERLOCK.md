# QuickChain Phase 1 Client Interlock — CrabLink Tauri

RO:WHAT — Phase 1 Round 1 / QC-1A client interlock for CrabLink Tauri and client adapters.
RO:WHY — Completes the client-side foundation sweep without letting CrabLink become wallet, ledger, paid-unlock, root, checkpoint, validator, bridge, or settlement authority.
RO:INTERACTS — QuickchainReadinessPage.jsx, SiteVisitAccess.jsx, AssetContentViewAccess.jsx, BalanceChip.jsx, PassportSummary.jsx, TopBar.jsx, profileDraftModel.js, gatewayClient.js, walletClient.js, tauriPlatform.js, recentReceipts.js, localCatalog.js, Tauri Rust commands.
RO:INVARIANTS — backend receipt/access response unlocks paid content; cached receipts/catalog entries are display-only; wallet balance verification must come from gateway wallet responses; QuickChain readiness is display-only.
RO:SECURITY — no client-side roots, checkpoints, validators, finality, bridges, anchors, staking, liquidity, ROX, Solana, external settlement, fake receipts, fake balances, silent spend, or cache-only paid unlock.
RO:TEST — npm run check:quickchain-phase1-interlock.

## Status

This document is the CrabLink Tauri final-pair interlock for:

```text
Phase 1 Round 1 / QC-1A foundation
```

It does not authorize deterministic roots, proofs, checkpoint production, validators, bridges, public settlement, ROX, Solana, staking, liquidity, or external anchoring.

The correct label after the Tauri client gate is green is:

```text
CrabLink Tauri + client adapters: GREEN / PARKED for QuickChain Phase 1 boundary foundation
```

Do not call that full Phase 1 complete. Phase 1 Round 2 still owns actual deterministic roots/proofs.

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

### Wallet and balance display

Wallet and balance UI may display cached labels and last known display values, but verified / ledger-backed status must come from a current gateway wallet response object.

Local settings such as stored display text or `rocLedgerBacked` are display hints only. They must not make UI look verified.

### QuickChain readiness

The readiness page may read local display evidence and list deferred work. It must not call gateway, wallet, Tauri commands, root endpoints, checkpoint endpoints, validator endpoints, bridge endpoints, settlement endpoints, or finality endpoints.

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
