# QuickChain Client Boundary — CrabLink Tauri

RO:WHAT — CrabLink Tauri QuickChain/ROC boundary note.
RO:WHY — CrabLink is the primary client, but QuickChain remains future settlement infrastructure and must not leak authority into React, TypeScript, or Tauri command names.
RO:INTERACTS — React pages, TypeScript adapters, Tauri Rust commands, svc-gateway, omnigate, svc-wallet, ron-ledger, receipt display cache, offline cache.
RO:INVARIANTS — CrabLink Tauri is not QuickChain authority; Local receipt caches are display-only; Offline cache cannot unlock paid content alone.
RO:SECURITY — no fake balances, fake receipts, fake paid unlocks, roots, checkpoints, validators, bridges, ROX, Solana, staking, liquidity, or external settlement.
RO:TEST — npm run check:quickchain-boundary.

## Status

CrabLink Tauri is not QuickChain authority.

QuickChain remains future ROC settlement/proof infrastructure. The active app may expose readiness, proof status, and backend-derived receipts, but it must not create roots, checkpoints, validators, settlement authority, bridge authority, or wallet/ledger truth.

## Client authority boundary

React displays state and captures user intent. TypeScript adapters route calls through typed boundaries. Tauri Rust validates native command payloads and talks to configured public gateway routes. RustyOnions backend services own durable truth.

Local receipt caches are display-only. They may help users find recent backend-returned receipt metadata, but they are not wallet truth, ledger truth, paid access truth, or QuickChain proof truth.

Offline cache cannot unlock paid content alone. Cached bytes must be b3-verified before trusted render, and paid content still requires backend-derived access/receipt truth.

## Forbidden in CrabLink Tauri

- QuickChain root or checkpoint production.
- Validator, staking, liquidity, bridge, Solana, ROX, or external settlement code.
- Client-side receipt minting or balance fabrication.
- Paid unlock from localStorage, sessionStorage, IndexedDB, manifest fields, or offline bytes alone.
- Raw shell/native/eval/execute command bridge surfaces.
- Private keys, seeds, raw capabilities, or uncapped spend authority in React or TypeScript state.

## Allowed in CrabLink Tauri

- Readiness and status displays.
- Backend-derived receipt display.
- Explicit paid-action intent and confirmation UX.
- Gateway-first request routing.
- Bounded media preview/export helpers.
- Future offline cache verification after b3 proof checks, without paid-unlock authority.
