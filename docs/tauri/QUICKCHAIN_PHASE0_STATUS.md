# CrabLink Tauri QuickChain Phase-0 Status

RO:WHAT — Final status note for CrabLink Tauri QuickChain Phase-0 / QC-0A client-boundary work.
RO:WHY — Records what is green, what is intentionally deferred, and what must not regress before moving on.
RO:INTERACTS — scripts/dev-quickchain-tauri-park.sh, scripts/check-tauri.sh, QuickChain boundary docs, Tauri React app, Tauri Rust command bridge.
RO:INVARIANTS — CrabLink Tauri is display/user-intent only; gateway-first; no chain authority; no wallet/ledger mutation; no cache-only paid unlock.
RO:SECURITY — no roots, checkpoints, validators, bridge, ROX, Solana, staking, liquidity, external settlement, fake receipts, fake balances, or silent spend.
RO:TEST — scripts/dev-quickchain-tauri-park.sh.

## Status

CrabLink Tauri QuickChain Phase-0 / QC-0A client-boundary slice is parkable when:

```text
scripts/dev-quickchain-tauri-park.sh
```

passes.

Current target estimate after the three boundary checks, Vite build, and Tauri Rust check are green:

```text
CrabLink Tauri QuickChain Phase-0 client boundary: 94-97%
Best current estimate: 96%
```

This estimate covers only the CrabLink Tauri client-boundary slice.

It does not mean full QuickChain is 96%.

Full QuickChain remains future work because canonical roots, locked vectors, state proofs, validators, DA/archive/challenge, pruning, public anchors, and external settlement are not implemented and remain explicitly deferred.

## Completed gates

The current CrabLink Tauri QC-0A slice has these focused gates:

```text
npm run check:quickchain-boundary
npm run check:quickchain-paid-cache-boundary
npm run check:quickchain-readiness-boundary
npm run build
npm run check:rust:mac-media
scripts/check-tauri.sh
```

## Completed boundary docs

The current CrabLink Tauri QC-0A slice has these boundary docs:

```text
docs/tauri/QUICKCHAIN_CLIENT_BOUNDARY.md
docs/tauri/QUICKCHAIN_PAID_CACHE_BOUNDARY.md
docs/tauri/QUICKCHAIN_READINESS_BOUNDARY.md
docs/tauri/QUICKCHAIN_PHASE0_STATUS.md
```

## What this phase proves

This phase proves that CrabLink Tauri has automated guardrails around the following boundaries:

```text
React display/user-intent only
Tauri command bridge remains typed and allowlisted
no forbidden QuickChain command naming drift
no shell/eval/run/raw/native command bridge creep
no cache-only paid unlock
receipt display cache remains display-only
offline cache remains non-authoritative
QuickChain readiness page remains display-only
gateway-first boundary preserved
Vite production build passes
Tauri Rust macOS media config check passes
```

## What this phase does not prove

This phase does not prove:

```text
QuickChain runtime
canonical root production
checkpoint production
validator execution
committee replication
external anchors
bridge behavior
ROX behavior
Solana behavior
staking
liquidity
external settlement
offline paid entitlement
cache-backed paid access
wallet mutation from client
ledger mutation from client
```

Those remain forbidden in CrabLink Tauri for this phase.

## Non-regression rules

CrabLink Tauri must not introduce:

```text
root producer
checkpoint producer
validator
settlement authority
bridge authority
staking
liquidity
ROX
Solana integration
external settlement
client-side wallet authority
client-side ledger truth
client-side receipt minting
client-side paid unlock from cache
fake balance
fake receipt
silent spend
```

## Accepted local/display sources

The following local sources may remain display-only:

```text
localCatalog
recentReceipts
theme/settings storage
dev labels
readiness display state
```

They must not become:

```text
wallet truth
ledger truth
balance truth
receipt truth
entitlement truth
paid access truth
settlement truth
finality truth
```

## Current parking command

Run:

```bash
scripts/dev-quickchain-tauri-park.sh
```

Expected final marker:

```text
== CrabLink Tauri QuickChain Phase-0 parking gate passed ==
```

## After parking

After the parking gate passes:

```text
1. Regenerate CODEBUNDLE_TAURI_APP.md.
2. Record crate/app notes.
3. Move to the next QuickChain phase target.
```

Do not add QuickChain runtime behavior to CrabLink Tauri.
