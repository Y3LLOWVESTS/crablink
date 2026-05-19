
````markdown
---
title: TESTING_MATRIX_TAURI_IDB
version: 0.1.0
status: draft
last-updated: 2026-05-17
audience: contributors, app engineers, RustyOnions service owners, QA, security reviewers, release reviewers, ops, auditors
repo-target: crablink
primary-app-target: apps/crablink-tauri
related-blueprints:
  - CRABLINK_TAURI_IDB.MD
  - SECURITY_NOTES_CRABLINK_TAURI.MD
  - TAURI_MIGRATION_IDB.MD
  - RUN_STACK_AND_MODES_IDB.MD
  - TAURI_COMMAND_BRIDGE_IDB.MD
  - CRAB_URL_AND_DEEP_LINK_IDB.MD
  - STORAGE_AND_SETTINGS_IDB.MD
  - PAID_ACTIONS_AND_RECEIPTS_IDB.MD
  - PASSPORT_WALLET_VAULT_IDB.MD
  - OAP_CLIENT_IDB.MD
  - SIDECAR_LOCAL_NODE_IDB.MD
  - OFFLINE_CACHE_IDB.MD
  - MEDIA_TAURI_IDB.MD
  - FACET_SANDBOX_IDB.MD
related-rusty-onions-docs:
  - INTEROP_BLUEPRINT.MD
  - APP_INTEGRATION_BLUEPRINT.MD
  - FULL_PROJECT_BLUEPRINT.MD
  - HARDENING_BLUEPRINT.MD
  - CONCURRENCY_AND_ALIASING_BLUEPRINT.MD
  - MICROKERNEL_BLUEPRINT.MD
  - SIX_CONCERNS.MD
  - WEB3.MD
  - WEB3_2.MD
  - NEXT_LEVEL.MD
  - QUICKCHAIN.MD
  - CODEBUNDLE_RS.md
  - ALLNOTES.MD
  - ALL_DOCS_COMBINED.MD
related-crablink-docs:
  - CODEBUNDLE_CHROME_EXTENSION.md
  - OLD_NOTES.MD
  - NOTES.MD
supersedes:
  - informal manual-only Tauri testing assumptions
  - Chrome-extension-only green-gate assumptions
does-not-delete:
  - Chrome extension proof client checks
  - existing gateway smoke tests
  - existing RustyOnions service smoke tests
  - existing paid-flow proof tests
---

# TESTING_MATRIX_TAURI_IDB

RO:WHAT — Defines the complete test/green-gate matrix for CrabLink Tauri across desktop, mobile-forward posture, React, TypeScript adapters, Tauri Rust commands, gateway compatibility, deep links, settings/storage, paid actions, receipts, passports, vaults, OAP, sidecars, offline cache, media, facets, amnesia, and security regressions.

RO:WHY — CrabLink is moving from a Chrome-extension proof client to a Tauri-first native Rust-backed RON client. The test matrix must prevent regressions, boundary drift, fake backend truth, silent spend, unsafe local authority, unbounded native behavior, and accidental scope jumps before implementation begins.

RO:INTERACTS — CrabLink React app, TypeScript adapter layer, Tauri Rust backend, app shell, route registry, gateway client, command bridge, settings/storage adapter, deep-link handler, paid-action adapter, receipt cache, passport/vault adapter, OAP client, sidecar supervisor, offline cache, media manager, facet placeholder/sandbox adapter, svc-gateway, omnigate, svc-wallet, ron-ledger, svc-storage, svc-index, svc-passport, ron-auth, ron-kms, ron-policy, svc-sandbox, svc-mod, ron-proto, ron-app-sdk.

RO:INVARIANTS — Tests must prove gateway compatibility first. Chrome proof client stays green. React owns display only. TypeScript owns no secrets. Tauri Rust mediates native privilege. OAP is Rust-side only. Sidecar is disabled by default. Vault is gated. Offline cache verifies b3 before trusted render. Media avoids full-file command buffering. Facets do not execute by default. No fake balances, no fake receipts, no silent spend, no direct ledger/storage/index mutation from CrabLink.

RO:METRICS — Test coverage by subsystem, smoke pass/fail, command latency assertions, redaction assertions, route parity outcomes, paid-gate outcomes, receipt-cache truth-boundary outcomes, OAP frame-limit outcomes, sidecar lifecycle outcomes, offline cache verification outcomes, media bound outcomes, facet denial outcomes, mobile compatibility outcomes, and release gate status.

RO:CONFIG — Test matrix is controlled by run mode, gateway URL, local stack URL, OAP enablement, sidecar enablement, vault enablement, offline cache enablement, media feature flags, facet execution flags, amnesia mode, developer diagnostics, platform target, and CI lane.

RO:SECURITY — Security tests are first-class gates. No release may pass if secrets cross into React, raw OAP frames reach UI, paid actions skip confirmation, cached receipts unlock content, sidecar auto-starts, local vault silently downgrades, media full-buffers large files through commands, or facets execute without sandbox policy.

RO:TEST — This document is the test plan. It defines unit, integration, smoke, regression, negative, platform, mobile, manual, and release gates.

---

## 0. Status

This is the final current Tauri IDB in the migration design set.

It should be created before the first major Tauri implementation batch or immediately after the initial app scaffold.

The purpose is to convert all prior Tauri IDBs into testable gates.

The matrix must protect the project from accidentally turning the Tauri migration into:

```text
a rewrite from scratch
a localhost-only toy
a hidden backend
a fake wallet
a fake ledger
a fake receipt system
a silent-spend app
an unbounded native process
an arbitrary code execution shell
a desktop-only dead end
```

The intended outcome is:

```text
CrabLink Tauri becomes the primary client only when tests prove it preserves RustyOnions invariants.
```

---

## 1. Test doctrine

### 1.1 Green proof before expansion

A feature is not real because it renders.

A feature is real when its tests prove:

```text
route works
truth boundary is correct
failure state is safe
security invariant is preserved
source is labeled
regression test exists
```

### 1.2 Gateway parity first

Every route currently proven through Chrome/gateway should first work through Tauri/gateway before OAP, sidecar, cache, vault, or native-media paths become required.

### 1.3 Negative tests are as important as happy paths

For CrabLink Tauri, the most important tests are often denial tests:

```text
no silent spend
no fake receipt
no fake balance
no direct ledger mutation
no raw OAP frame in React
no sidecar auto-start
no cache-paid unlock
no arbitrary facet execution
```

### 1.4 Source labels are testable

Tests must verify that sensitive results clearly identify their source:

```text
gateway
local_dev_gateway
oap
sidecar_gateway
sidecar_oap
offline_verified_cache
cache_display_only
local_draft
dev_fixture
```

### 1.5 All native power is feature-gated

Native features are disabled until tests prove readiness.

Default early Tauri state:

```text
Gateway mode: enabled
Command bridge: narrow
Deep links: parser/handler enabled after tests
OAP: disabled
Sidecar: disabled
Vault: disabled or status-only
Offline cache: disabled or status-only
Media streaming: disabled
Facet execution: disabled
```

### 1.6 Test labels must match risk

High-risk features require stronger gates:

```text
wallet/value movement
vault/secrets
OAP transport
sidecar process lifecycle
offline cache trust
large media transfer
facet execution
mobile secure storage
```

---

## 2. Test layers

### 2.1 Static checks

Purpose:

```text
catch forbidden imports, direct APIs, unsafe patterns, anti-scope drift
```

Examples:

```text
no chrome.* in shared Tauri core
no Tauri APIs in shared platform-neutral core
no raw invoke from route components
no raw OAP frame helpers in React/TypeScript
no eval/new Function
no shell/exec command patterns
no direct wallet/ledger/storage/index client in UI
```

### 2.2 React unit tests

Purpose:

```text
prove UI state, route rendering, truth boundaries, and denial messages
```

### 2.3 TypeScript adapter tests

Purpose:

```text
prove normalization, source labels, error mapping, and no secret ownership
```

### 2.4 Tauri Rust unit tests

Purpose:

```text
prove command validation, redaction, bounds, state machines, and safe defaults
```

### 2.5 Tauri Rust integration tests

Purpose:

```text
prove command families work through fake or local services without violating boundaries
```

### 2.6 Gateway compatibility tests

Purpose:

```text
prove Tauri preserves current svc-gateway route behavior
```

### 2.7 Local stack smokes

Purpose:

```text
prove real RustyOnions services work through Tauri paths
```

### 2.8 Desktop smoke tests

Purpose:

```text
prove app launches and core flows work on desktop targets
```

### 2.9 Mobile-forward tests

Purpose:

```text
prove architecture does not hardcode desktop-only assumptions
```

### 2.10 Security regression tests

Purpose:

```text
prove known dangerous states remain impossible
```

### 2.11 Manual QA scripts

Purpose:

```text
preserve human-visible UX proof before release
```

### 2.12 Release gates

Purpose:

```text
block shipping unless enough lanes are green
```

---

## 3. Gate levels

### 3.1 Bronze gate — scaffold proof

Bronze proves the Tauri app exists without breaking Chrome proof.

Required:

```text
[ ] Tauri desktop app launches.
[ ] Existing React shell renders.
[ ] crab://home route works in-app.
[ ] App shell/address bar renders.
[ ] Route registry loads.
[ ] Gateway health check works.
[ ] Gateway ready check works when backend is running.
[ ] Chrome extension still builds/checks.
[ ] Chrome proof client remains usable.
[ ] No Chrome APIs leak into shared Tauri core.
[ ] No Tauri APIs leak into shared platform-neutral core.
[ ] OAP reports disabled or unavailable truthfully.
[ ] Sidecar reports disabled truthfully.
[ ] Vault reports disabled/uninitialized truthfully.
[ ] Offline cache reports disabled truthfully.
[ ] Facet execution reports disabled truthfully.
```

Bronze anti-scope:

```text
[ ] No wallet mutation from Tauri UI.
[ ] No local vault custody.
[ ] No sidecar process spawn.
[ ] No OAP data route.
[ ] No media streaming path.
[ ] No facet execution.
```

---

### 3.2 Silver gate — gateway-compatible app

Silver proves the Tauri app can use the current proven RustyOnions gateway route surface.

Required:

```text
[ ] Settings adapter replaces chrome.storage assumptions.
[ ] Tauri command bridge exists for health/ready/version.
[ ] Command errors are typed and redacted.
[ ] React can call Rust commands through typed adapters.
[ ] Native crab:// deep-link parser rejects malformed inputs.
[ ] Deep links open safe routes without authorizing spend.
[ ] crab:// image/post/comment/article routes render through gateway.
[ ] typed b3 asset pages render through gateway.
[ ] profile/identity route displays backend-derived state.
[ ] wallet balance route displays backend-derived balance only.
[ ] paid gates still require explicit confirmation.
[ ] recent receipt display is display-only.
[ ] route failures are source-labeled.
```

Silver anti-scope:

```text
[ ] No fake balances.
[ ] No fake receipts.
[ ] No silent spend.
[ ] No direct ledger mutation.
[ ] No direct storage/index mutation.
[ ] No paid unlock from cache.
```

---

### 3.3 Gold gate — native-safe core

Gold proves the native Tauri layer is useful but still bounded.

Required:

```text
[ ] Command bridge has strict envelope.
[ ] Settings/storage categories are separated.
[ ] Memory-first runtime state exists.
[ ] Selective persistence categories exist.
[ ] OAP status shell exists behind feature flag.
[ ] OAP max frame 1 MiB is enforced in proof tests.
[ ] Preferred streaming chunk posture is documented and tested where applicable.
[ ] Gateway fallback remains available.
[ ] Vault status shell exists.
[ ] Sidecar status shell exists and is disabled by default.
[ ] Offline cache status shell exists.
[ ] Media status shell exists.
[ ] Facet placeholder/status shell exists.
[ ] All disabled/future features report truthfully.
```

Gold anti-scope:

```text
[ ] No raw OAP frame command.
[ ] No real local private-key custody.
[ ] No sidecar auto-start.
[ ] No trusted offline cache render without b3 verification.
[ ] No full-file media through command result.
[ ] No facet execution.
```

---

### 3.4 Platinum gate — native feature proofs

Platinum proves native features can work safely in limited form.

Required:

```text
[ ] Passport/wallet vault design implemented at status/safe-summary level.
[ ] Platform secure storage adapter exists or reports unavailable truthfully.
[ ] Offline cache verifies b3 before trusted render.
[ ] Offline cache digest mismatch rejects/quarantines.
[ ] Sidecar/local node path is supervised and bounded in test harness.
[ ] OAP HELLO proof works behind feature flag.
[ ] Media local preview uses bounded path.
[ ] Large media refuses unsafe full-buffer path.
[ ] Facet manifest/contract validation works.
[ ] Facet placeholder renders safely.
[ ] Amnesia mode purges configured local state.
[ ] Mobile feature support matrix exists.
```

Platinum anti-scope:

```text
[ ] No production facet execution.
[ ] No paid offline entitlement unless backend route contract exists.
[ ] No sidecar wallet authority.
[ ] No OAP paid/wallet bypass.
[ ] No vault secret return to React.
```

---

### 3.5 Diamond gate — release candidate

Diamond proves the app is ready to become the primary client.

Required:

```text
[ ] Desktop smoke passes on target OSes.
[ ] Mobile smoke posture is documented and minimally tested.
[ ] Chrome extension remains green as proof/companion.
[ ] Gateway route parity passes.
[ ] Paid gate parity passes.
[ ] Receipt display truth-boundary tests pass.
[ ] Deep-link security tests pass.
[ ] Settings/storage tests pass.
[ ] Command bridge tests pass.
[ ] Security regression suite passes.
[ ] Amnesia behavior passes.
[ ] OAP tests pass if OAP is enabled.
[ ] Vault tests pass if vault is enabled.
[ ] Sidecar tests pass if sidecar is enabled.
[ ] Offline cache tests pass if cache is enabled.
[ ] Media tests pass if media features are enabled.
[ ] Facet negative tests pass.
[ ] Anti-scope review passes.
[ ] Known gaps are documented.
```

Diamond release rule:

```text
No high-risk feature may ship enabled unless its subsystem gate is green.
```

---

## 4. CI lane taxonomy

### 4.1 Static lane

Runs:

```text
lint
typecheck
forbidden-token checks
dependency checks
format checks
route registry checks
schema checks
```

Blocks:

```text
raw eval
raw shell
forbidden imports
direct service clients in UI
raw invoke in route components
secret-shaped field names in UI stores
```

---

### 4.2 React lane

Runs:

```text
React unit tests
route render tests
truth-boundary tests
component tests
snapshot tests where useful
```

Blocks:

```text
missing truth boundary
paid prompt missing
receipt display mislabel
offline snapshot shown as live
facet placeholder missing
```

---

### 4.3 TypeScript adapter lane

Runs:

```text
adapter unit tests
DTO normalization tests
error mapping tests
source label tests
redaction tests
```

Blocks:

```text
secret passthrough
source label missing
unsafe DTO acceptance
display model claiming backend truth
```

---

### 4.4 Tauri Rust unit lane

Runs:

```text
cargo test for src-tauri
command validation tests
state machine tests
redaction tests
path safety tests
config default tests
feature flag tests
```

Blocks:

```text
panic on malformed input
unredacted error
unsafe default
oversized payload acceptance
path traversal
disabled feature executing
```

---

### 4.5 Tauri integration lane

Runs:

```text
Tauri command integration tests
mock gateway tests
mock OAP tests
mock vault tests
mock sidecar tests
mock cache tests
```

Blocks:

```text
wrong command envelope
source mismatch
fallback bypass
missing correlation ID
secrets crossing bridge
```

---

### 4.6 Gateway compatibility lane

Runs:

```text
health/ready/version checks
crab resolve checks
b3 asset checks
identity checks
wallet balance checks
paid prepare/confirm/access checks
site route checks
```

Blocks:

```text
route drift
broken gateway fallback
wrong headers
missing idempotency
paid gate bypass
```

---

### 4.7 Local stack smoke lane

Runs against local RustyOnions services.

Proves:

```text
svc-gateway path
omnigate hydration
svc-wallet balance
ron-ledger receipt truth
svc-storage b3 storage
svc-index lookup
svc-passport identity
paid loops
```

Blocks:

```text
fake local truth
service boundary bypass
receipt mismatch
paid action ambiguity
```

---

### 4.8 Security regression lane

Runs high-risk negative tests.

Blocks any regression in:

```text
silent spend
fake receipts
fake balances
secret leakage
raw OAP frames
sidecar auto-start
unverified cache render
media full-buffer
facet execution
deep-link privilege
```

---

### 4.9 Desktop smoke lane

Runs app launch and core flows on desktop.

Targets:

```text
macOS
Windows
Linux
```

Initial manual/CI target may start with macOS, but the matrix must remain cross-platform.

---

### 4.10 Mobile posture lane

Runs mobile-forward checks.

Targets:

```text
iOS posture
Android posture
touch UI
no sidecar assumption
storage adapter support
secure storage adapter support
deep-link posture
```

Initial mobile lane may be documentation/static until mobile scaffold exists.

---

## 5. Required test suites by subsystem

## 5.1 App shell tests

### Unit tests

```text
[ ] App shell renders.
[ ] Address bar renders.
[ ] Browser nav renders.
[ ] Route registry loads.
[ ] Home route renders.
[ ] Settings route renders.
[ ] Problem route renders.
[ ] Toast/error host renders.
[ ] Modal host renders.
[ ] Truth boundary component renders.
```

### Integration tests

```text
[ ] Route changes update address bar.
[ ] Back/forward does not resubmit paid actions.
[ ] Refresh does not resubmit paid actions.
[ ] Unknown crab route shows safe problem page.
[ ] App startup does not call paid/mutating routes.
```

### Negative tests

```text
[ ] App shell does not access wallet directly.
[ ] App shell does not access ledger directly.
[ ] App shell does not call raw Tauri invoke.
[ ] App shell does not import Chrome APIs directly.
```

---

## 5.2 Migration/shared-core tests

### Static checks

```text
[ ] Shared core imports no chrome.*.
[ ] Shared core imports no direct Tauri APIs.
[ ] Chrome adapter owns Chrome APIs.
[ ] Tauri adapter owns Tauri APIs.
[ ] Shared route registry is platform-neutral.
[ ] Shared components contain no platform storage calls.
```

### Parity tests

```text
[ ] Chrome app still builds.
[ ] Tauri app still builds.
[ ] Shared route definitions match expected route list.
[ ] Asset pages render in both platform adapters where supported.
```

### Anti-regression

```text
[ ] No full rewrite of React shell without preserving route behavior.
[ ] No removal of Chrome proof checks.
[ ] No localhost-only hardcoding in shared core.
```

---

## 5.3 Tauri command bridge tests

### Rust unit tests

```text
[ ] Command input schema validates.
[ ] Unknown fields reject where strict.
[ ] Oversized payload rejects.
[ ] Malformed crab URL rejects.
[ ] Malformed b3 rejects.
[ ] Command output envelope is stable.
[ ] Correlation ID is present.
[ ] Errors are redacted.
[ ] Secrets are not serialized.
[ ] Disabled feature returns disabled status.
```

### TypeScript tests

```text
[ ] Command client normalizes success envelope.
[ ] Command client normalizes error envelope.
[ ] Retry policy does not retry mutation unsafely.
[ ] Source label preserved.
[ ] Developer details are redacted.
```

### Forbidden command tests

```text
[ ] No command named raw_wallet.
[ ] No command named raw_ledger.
[ ] No command named raw_storage.
[ ] No command named raw_index.
[ ] No command named raw_oap.
[ ] No command named shell.
[ ] No command named eval.
[ ] No command named execute.
```

### Security tests

```text
[ ] React cannot pass raw Authorization to debug command.
[ ] React cannot request arbitrary file path read.
[ ] React cannot spawn process.
[ ] React cannot enable disabled native feature by payload.
```

---

## 5.4 Gateway compatibility tests

### Health/ready/version

```text
[ ] GET /healthz works.
[ ] GET /readyz works.
[ ] Version/diagnostics route works where available.
[ ] Backend unavailable maps to safe UI state.
[ ] Degraded backend maps to degraded UI state.
```

### Resolve routes

```text
[ ] GET /crab/resolve?url=crab://home works.
[ ] GET /crab/resolve?url=crab://image works.
[ ] GET /crab/resolve?url=crab://site works.
[ ] GET /crab/resolve?url=crab://@username handles profile route.
[ ] GET /crab/resolve?url=crab://<hash>.image works for known asset.
[ ] Unknown route maps to safe problem.
```

### Typed b3 routes

```text
[ ] GET /b3/<hash>.image renders asset page.
[ ] GET /b3/<hash>.article renders or paid-gates.
[ ] GET /b3/<hash>.post renders or paid-gates.
[ ] GET /b3/<hash>.comment renders or paid-gates.
[ ] Unsupported kind shows safe problem.
```

### Identity/wallet routes

```text
[ ] GET /identity/me displays backend-derived identity.
[ ] POST /identity/passport/bootstrap displays backend result.
[ ] GET /wallet/:account/balance displays backend-derived balance.
[ ] Wallet unavailable does not fake balance.
```

### Paid route compatibility

```text
[ ] paid image prepare route works.
[ ] paid image publish route works when backend accepts proof.
[ ] site prepare route works.
[ ] site publish route works.
[ ] content view route works or safe-gates.
[ ] site visit route works or safe-gates.
```

---

## 5.5 Crab URL and deep-link tests

### Parser tests

```text
[ ] crab://home valid.
[ ] crab://site valid.
[ ] crab://image valid.
[ ] crab://@username valid.
[ ] crab://<64hex>.image valid.
[ ] crab://<64hex>.post valid.
[ ] crab://<64hex>.comment valid.
[ ] crab://<64hex>.article valid.
[ ] b3:<64hex> valid.
[ ] uppercase b3 rejected or normalized only if policy says so.
[ ] truncated b3 rejected.
[ ] malformed URL rejected.
[ ] path traversal rejected.
[ ] control characters rejected.
```

### OS deep-link tests

```text
[ ] App receives deep link.
[ ] Deep link opens route.
[ ] Deep link cannot authorize spend.
[ ] Deep link cannot unlock vault.
[ ] Deep link cannot start sidecar.
[ ] Deep link cannot enable OAP.
[ ] Deep link cannot trust offline cache.
[ ] Deep link cannot launch facet.
```

### Security tests

```text
[ ] deep-link payload cannot include raw token.
[ ] deep-link payload cannot include wallet authority.
[ ] deep-link payload cannot set local file path.
[ ] deep-link payload cannot select private alt silently.
```

---

## 5.6 Settings/storage tests

### Settings tests

```text
[ ] Read default settings.
[ ] Write safe settings.
[ ] Reject unknown unsafe settings.
[ ] Gateway URL validates.
[ ] Timeout validates.
[ ] Feature flags validate.
[ ] Developer diagnostics flag validates.
```

### Storage category tests

```text
[ ] Safe preferences separate from receipt display cache.
[ ] Receipt display cache separate from offline verified cache.
[ ] Draft cache separate from vault.
[ ] Vault unavailable state does not write secrets to settings.
```

### Negative tests

```text
[ ] Settings cannot store seed phrase.
[ ] Settings cannot store private key.
[ ] Settings cannot store raw capability token.
[ ] Settings cannot store uncapped spend authority.
[ ] Settings cannot store fake balance as truth.
```

### Amnesia tests

```text
[ ] Amnesia mode disables/purges persistent categories as configured.
[ ] Session-only settings clear on shutdown.
[ ] Cache/status reflects amnesia mode.
```

---

## 5.7 Paid actions and receipts tests

### State machine tests

```text
[ ] draft → prepare works.
[ ] prepare → confirmation snapshot works.
[ ] confirmation cancel does not mutate wallet.
[ ] confirmation approve calls backend route.
[ ] backend receipt displays.
[ ] success writes receipt display copy.
[ ] failure does not write success receipt.
[ ] timeout enters verify/status needed state.
```

### Confirmation tests

```text
[ ] Price is visible.
[ ] Payer is visible.
[ ] Recipient/escrow is visible where known.
[ ] Target content is visible.
[ ] Confirm button is explicit.
[ ] Cancel button is available.
[ ] Quote expiration disables confirmation.
```

### Receipt tests

```text
[ ] Receipt display includes backend txid/receipt hash when returned.
[ ] Receipt display says backend wallet/ledger remain authoritative.
[ ] Receipt display cache is display-only.
[ ] Receipt clear only clears local display copy.
[ ] Offline receipt display says not currently backend-verified.
```

### Paid gate tests

```text
[ ] Paid content does not render before backend access decision.
[ ] Cached receipt does not unlock paid content.
[ ] Reload does not double-charge.
[ ] Back/forward does not double-charge.
[ ] Network retry uses idempotency.
[ ] Ambiguous timeout does not assume success/failure.
```

### Negative tests

```text
[ ] No silent spend on page load.
[ ] No silent spend on autoplay.
[ ] No silent spend on preload.
[ ] No fake receipt creation.
[ ] No fake balance update.
[ ] No direct wallet mutation from React.
[ ] No direct ledger mutation from Tauri.
```

---

## 5.8 Passport/wallet/vault tests

### Passport display tests

```text
[ ] Dev passport displays as dev/test.
[ ] Main passport displays safe summary.
[ ] Alt passport displays safe summary.
[ ] Active passport switch updates context.
[ ] Switching passport clears pending paid confirmation.
```

### Wallet-link tests

```text
[ ] Wallet link verifies through backend.
[ ] Balance refresh is backend-derived.
[ ] Wallet unavailable shows unavailable state.
[ ] Shared wallet warning appears for alt where applicable.
[ ] can_spend never bypasses confirmation.
```

### Vault status tests

```text
[ ] Vault disabled state displays.
[ ] Vault unavailable state displays.
[ ] Vault uninitialized state displays.
[ ] Vault locked state displays.
[ ] Vault unlocked state never exposes secrets.
[ ] Auto-lock state works.
```

### Secret-return tests

```text
[ ] Vault command never returns private key.
[ ] Vault command never returns seed phrase.
[ ] Vault command never returns raw capability token.
[ ] Vault command never returns raw refresh secret.
[ ] React never renders secret-shaped field.
```

### Alt privacy tests

```text
[ ] Main does not list private alts publicly.
[ ] Alt does not expose main linkage by default.
[ ] Shared wallet/payout warning appears.
[ ] Deep link cannot select hidden alt without confirmation.
```

### Starter grant tests

```text
[ ] Starter grant is backend-issued only.
[ ] Starter grant receipt is backend-derived.
[ ] App does not show local grant if backend fails.
[ ] Balance refresh follows grant.
```

---

## 5.9 OAP client tests

### Status tests

```text
[ ] OAP disabled by default.
[ ] OAP status command returns disabled safely.
[ ] OAP config summary is redacted.
[ ] Gateway fallback is available.
```

### HELLO tests

```text
[ ] HELLO success with compatible service.
[ ] HELLO rejects unsupported version.
[ ] HELLO rejects unsupported required flags.
[ ] HELLO handles timeout.
[ ] HELLO source-labeled.
```

### Frame tests

```text
[ ] Max frame 1 MiB enforced.
[ ] Oversized outgoing frame rejected before send.
[ ] Oversized incoming frame rejected before allocation.
[ ] Malformed frame rejected.
[ ] Sequence invalid rejected.
```

### Streaming tests

```text
[ ] Preferred 64 KiB chunk posture honored where applicable.
[ ] Stream cancel cleans up.
[ ] Partial stream not trusted.
[ ] Digest mismatch rejects cache write.
```

### Capability tests

```text
[ ] Missing capability fails closed.
[ ] Expired capability fails closed.
[ ] Vault locked capability fails closed.
[ ] Capability bytes never cross to React.
```

### Fallback tests

```text
[ ] Gateway fallback allowed for safe public read.
[ ] Gateway fallback denied for policy/capability denial.
[ ] Paid/wallet routes remain gateway-first unless explicitly enabled.
```

### Negative tests

```text
[ ] React cannot build OAP frames.
[ ] TypeScript cannot own OAP transport.
[ ] No raw_oap command exists.
[ ] OAP cannot bypass paid gate.
[ ] OAP cannot bypass wallet path.
[ ] OAP cannot mutate ledger directly.
```

---

## 5.10 Sidecar/local node tests

### Status tests

```text
[ ] Sidecar disabled by default.
[ ] Status returns disabled.
[ ] Mobile reports disabled/unsupported.
[ ] Config summary is redacted.
```

### User-managed local node diagnostics

```text
[ ] Can check local gateway health.
[ ] Can check local gateway readiness.
[ ] Can check version where available.
[ ] Source label shows user_managed_gateway.
[ ] App does not start/stop user-managed node.
```

### Supervisor tests

```text
[ ] Verified fake sidecar starts.
[ ] Health poll succeeds.
[ ] Ready poll succeeds.
[ ] Graceful stop works.
[ ] Kill after timeout works.
[ ] Restart backoff works.
[ ] Crash loop stops restarting.
```

### Port/log/data tests

```text
[ ] Port conflict fails safely.
[ ] Public bind denied by default.
[ ] Logs are bounded.
[ ] Logs are redacted.
[ ] Data dir validates.
[ ] Amnesia purges sidecar data/logs as configured.
```

### Security tests

```text
[ ] Deep link cannot start sidecar.
[ ] Web content cannot start sidecar.
[ ] Shell command execution impossible.
[ ] Unverified binary denied in production.
[ ] Sidecar ready does not grant spend authority.
[ ] Sidecar ready does not unlock vault.
```

---

## 5.11 Offline cache tests

### Status tests

```text
[ ] Offline cache disabled by default.
[ ] Status returns disabled.
[ ] Config summary is redacted.
[ ] Cache root not leaked to React.
```

### b3 verification tests

```text
[ ] Valid b3 object stores after verification.
[ ] Digest mismatch rejects trusted render.
[ ] Corrupt entry quarantines.
[ ] Uppercase/truncated/malformed b3 rejected.
[ ] Path traversal rejected.
```

### Read/render tests

```text
[ ] Verified public b3 object renders offline.
[ ] Named-site snapshot renders with stale/offline label.
[ ] Public profile snapshot renders with cached/offline label.
[ ] Receipt display cache renders offline with truth boundary.
```

### Paid cache tests

```text
[ ] Cached receipt does not unlock paid content.
[ ] Cached paid body does not render by default.
[ ] Offline mode cannot spend.
[ ] Offline mode cannot publish.
```

### Quota/eviction tests

```text
[ ] Cache quota enforced.
[ ] LRU/category eviction works.
[ ] Draft preservation policy works.
[ ] Quarantine limit works.
[ ] Clear cache works.
```

### Amnesia tests

```text
[ ] Cache purges on shutdown when configured.
[ ] Receipt display cache session-only when configured.
[ ] Draft persistence disabled in amnesia unless explicit policy allows.
```

---

## 5.12 Media tests

### Media-lite tests

```text
[ ] Media status reports media-lite.
[ ] Full streaming disabled until enabled.
[ ] Music descriptor renders.
[ ] Video descriptor renders.
[ ] Podcast descriptor renders.
[ ] Stream descriptor renders without fake live support.
[ ] Lyrics link renders as separate asset.
```

### Manifest/rendition tests

```text
[ ] Media manifest validates.
[ ] Poster/cover link validates.
[ ] Rendition group validates.
[ ] Each rendition has independent b3.
[ ] Missing rendition shows safe unavailable state.
```

### Playback/bounds tests

```text
[ ] Small-file preview works within limit.
[ ] Large file refuses full-buffer preview.
[ ] Range size is bounded.
[ ] Segment size is bounded.
[ ] Cancel releases resources.
[ ] Player errors normalize.
```

### Cache tests

```text
[ ] Verified media cache plays public media.
[ ] Digest mismatch refuses playback.
[ ] Partial media quarantines or remains untrusted.
[ ] Media cache quota enforced.
```

### Paid media tests

```text
[ ] Paid media requires backend access decision.
[ ] Autoplay does not spend.
[ ] Preload does not spend.
[ ] Cached paid media does not unlock by itself.
[ ] Backend receipt displays after paid access.
```

### DRM honesty tests

```text
[ ] UI does not claim DRM.
[ ] UI does not claim anti-rip guarantee.
[ ] Watermarking copy, if present, is honest.
```

### Negative tests

```text
[ ] Full media file cannot cross command result.
[ ] React cannot read raw local path.
[ ] Media command cannot run transcoder shell.
[ ] Creator-supplied player code does not execute.
```

---

## 5.13 Facet/sandbox tests

### Placeholder tests

```text
[ ] Code facet renders placeholder.
[ ] Game facet renders placeholder.
[ ] Algo facet renders placeholder.
[ ] App facet renders placeholder.
[ ] Ad facet renders safe preview.
[ ] Launch disabled reason displays.
```

### facet.toml tests

```text
[ ] Valid facet.toml parses.
[ ] Missing required field rejects.
[ ] Unknown runtime rejects.
[ ] Missing limits rejects execution.
[ ] Permissions default deny.
```

### Permission tests

```text
[ ] Network denied by default.
[ ] Wallet denied by default.
[ ] Ledger forbidden.
[ ] Storage denied by default.
[ ] Index denied by default.
[ ] Profile/vault denied by default.
[ ] Local files denied by default.
```

### Execution denial tests

```text
[ ] .code does not execute on route open.
[ ] .game does not launch on route open.
[ ] .algo does not activate on route open.
[ ] Site embed cannot launch facet.
[ ] Deep link cannot launch facet.
[ ] Offline cache cannot mark facet executable.
[ ] Paid receipt cannot grant runtime permissions.
[ ] Sidecar ready cannot grant runtime permissions.
```

### Static forbidden tests

```text
[ ] No eval.
[ ] No new Function.
[ ] No untrusted script injection.
[ ] No WASM instantiate from React shell.
[ ] No shell execution.
[ ] No native binary execution.
```

### Future sandbox tests

Only after sandbox route exists:

```text
[ ] Test-only sandbox launch requires explicit action.
[ ] Resource limits enforced.
[ ] Logs bounded/redacted.
[ ] Timeout handled.
[ ] Crash handled.
[ ] Wallet/storage/index/network denied.
```

---

## 5.14 Amnesia/security tests

### Amnesia tests

```text
[ ] Amnesia mode visible.
[ ] Runtime secrets cleared on shutdown.
[ ] Session-only cache cleared.
[ ] Sidecar data purged if configured.
[ ] Media staging purged if configured.
[ ] Vault persistent storage disabled if configured.
[ ] Logs redacted and cleared if configured.
```

### Redaction tests

```text
[ ] Authorization redacted.
[ ] Bearer/capability tokens redacted.
[ ] Private keys redacted.
[ ] Seed phrases redacted.
[ ] Local paths redacted where needed.
[ ] Main→alt private linkage redacted.
[ ] Raw backend stack traces not shown to normal UI.
```

### Panic/error tests

```text
[ ] Malformed input does not panic.
[ ] Backend timeout maps to typed error.
[ ] Command timeout maps to typed error.
[ ] Correlation ID preserved.
[ ] Error does not include secrets.
```

### Security anti-scope tests

```text
[ ] No fake balance.
[ ] No fake receipt.
[ ] No silent spend.
[ ] No direct ledger mutation.
[ ] No direct storage/index mutation.
[ ] No arbitrary code execution.
[ ] No sidecar auto-start.
[ ] No paid unlock from cache.
```

---

## 5.15 Mobile-forward tests

### Static/mobile posture tests

```text
[ ] Shared core avoids desktop-only APIs.
[ ] Platform feature support is queryable.
[ ] Sidecar disabled/unsupported on mobile by default.
[ ] OAP optional on mobile.
[ ] Gateway mode works without sidecar.
[ ] File APIs are adapter-owned.
[ ] Secure storage is adapter-owned.
[ ] Media cache defaults smaller.
[ ] Touch-safe controls exist for paid confirmation.
[ ] Hover-only controls are not required.
```

### Mobile smoke tests

When mobile scaffold exists:

```text
[ ] App launches on iOS simulator/device.
[ ] App launches on Android emulator/device.
[ ] Gateway health works.
[ ] Route rendering works.
[ ] Deep-link open works or is disabled truthfully.
[ ] Secure storage reports capability.
[ ] Sidecar reports disabled.
[ ] Paid prompt is touch-safe.
```

---

## 5.16 Chrome proof client tests

The Chrome extension remains the proof/companion client.

Required:

```text
[ ] scripts/check-chrome.sh passes.
[ ] scripts/package-chrome.sh passes if packaging lane is enabled.
[ ] Chrome extension can still load.
[ ] Gateway route proof still works.
[ ] Chrome storage remains extension-local convenience only.
[ ] Chrome client does not call internal services directly.
```

Chrome anti-scope:

```text
[ ] No OAP client added to Chrome.
[ ] No local vault custody added to Chrome.
[ ] No native service orchestration added to Chrome.
[ ] No large media subsystem added to Chrome.
```

---

## 6. Smoke script plan

### 6.1 Existing/expected smoke anchors

Current or expected smoke categories:

```text
scripts/check-chrome.sh
scripts/check-react-lane.sh
scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
scripts/smoke-profile-gateway.sh
scripts/smoke-first-run-profile.sh
scripts/smoke-site-create-local.sh
scripts/green-gate-local.sh
```

### 6.2 New Tauri smoke scripts

Recommended future names:

```text
scripts/smoke-tauri-launch.sh
scripts/smoke-tauri-gateway-health.sh
scripts/smoke-tauri-command-bridge.sh
scripts/smoke-tauri-deep-link.sh
scripts/smoke-tauri-settings-storage.sh
scripts/smoke-tauri-paid-gate.sh
scripts/smoke-tauri-receipts.sh
scripts/smoke-tauri-passport-vault-status.sh
scripts/smoke-tauri-oap-status.sh
scripts/smoke-tauri-oap-hello.sh
scripts/smoke-tauri-sidecar-disabled.sh
scripts/smoke-tauri-sidecar-start-stop.sh
scripts/smoke-tauri-offline-cache-status.sh
scripts/smoke-tauri-offline-cache-b3-verify.sh
scripts/smoke-tauri-media-lite.sh
scripts/smoke-tauri-media-no-full-blob.sh
scripts/smoke-tauri-facet-placeholder.sh
scripts/smoke-tauri-facet-no-execution.sh
scripts/smoke-tauri-amnesia.sh
scripts/smoke-tauri-security-regression.sh
scripts/green-gate-tauri-local.sh
```

### 6.3 Smoke script rules

Every smoke script should:

```text
set strict shell mode
print app/root path
print mode
print endpoint
fail on first dangerous error
emit clear PASS/FAIL
avoid deleting user data without explicit temp dir
avoid rm instructions unless operating inside generated temp dir
```

### 6.4 Smoke script outputs

Each smoke should produce:

```text
artifacts/<run-id>/
  logs/
  diagnostics/
  receipts/
  screenshots/optional
  json/
```

No secrets should be written to artifacts.

---

## 7. Suggested CI commands

### 7.1 Frontend static/unit

```bash
npm run lint
npm run test
npm run typecheck
```

### 7.2 React lane

```bash
npm run test -- --run src
```

### 7.3 Chrome proof lane

```bash
scripts/check-chrome.sh
scripts/package-chrome.sh
```

### 7.4 Tauri desktop lane

```bash
npm run tauri:build
npm run tauri:test
```

Actual package scripts should be finalized when the Tauri scaffold exists.

### 7.5 Rust command lane

```bash
cargo fmt --manifest-path apps/crablink-tauri/src-tauri/Cargo.toml --check
cargo clippy --manifest-path apps/crablink-tauri/src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path apps/crablink-tauri/src-tauri/Cargo.toml
```

### 7.6 Local smoke lane

```bash
scripts/green-gate-tauri-local.sh
```

### 7.7 RustyOnions backend lane

Run from RustyOnions repo when backend changes are involved:

```bash
cargo fmt
cargo test -p svc-gateway
cargo test -p omnigate
cargo test -p svc-wallet
cargo test -p ron-ledger
```

Use narrower crates depending on touched surface.

---

## 8. Test fixtures

### 8.1 Fixture categories

Recommended fixture directories:

```text
test/fixtures/crab/
test/fixtures/b3/
test/fixtures/gateway/
test/fixtures/identity/
test/fixtures/wallet/
test/fixtures/paid/
test/fixtures/receipts/
test/fixtures/offline-cache/
test/fixtures/media/
test/fixtures/facets/
test/fixtures/problems/
```

### 8.2 Required fixtures

```text
valid-b3.sample.json
invalid-b3.sample.json
asset-page.image.sample.json
asset-page.article.paid.sample.json
site-page.sample.json
profile.public.sample.json
identity.me.empty.sample.json
identity.me.ready.sample.json
wallet.balance.sample.json
paid.prepare.sample.json
paid.receipt.sample.json
receipt.display-copy.sample.json
offline.cache-entry.verified.sample.json
offline.cache-entry.corrupt.sample.json
media.manifest.video.sample.json
media.renditions.sample.json
facet.manifest.code.sample.json
facet.toml.valid.sample
facet.toml.invalid.sample
problem.policy-denied.json
problem.not-found.json
problem.backend-unavailable.json
```

### 8.3 Fixture rules

Fixtures must not contain:

```text
real secrets
real bearer tokens
private keys
seed phrases
real wallet authority
private user data
```

Use obvious placeholders:

```text
dev token redacted
b3:000...
acct_dev
passport:main:dev
```

---

## 9. Release matrix by feature

### 9.1 Feature gate table

| Feature | Default | Minimum gate | Must pass |
|---|---:|---|---|
| Gateway mode | enabled | Bronze | health/ready/route parity |
| Chrome proof client | enabled/maintained | Bronze | check/package/smoke |
| Command bridge | narrow | Silver | command envelope/redaction |
| Deep links | gated | Silver | parser/security tests |
| Settings/storage | enabled | Silver | category/secrets tests |
| Paid actions | enabled after parity | Silver | no silent spend/receipt truth |
| Receipt display cache | enabled display-only | Silver | truth-boundary tests |
| Passport dev labels | enabled dev | Silver | backend-derived identity |
| Vault real custody | disabled | Platinum | secure storage/secret tests |
| OAP | disabled | Gold/Platinum | status/HELLO/frame tests |
| Sidecar | disabled | Platinum | lifecycle/provenance tests |
| Offline cache | disabled/conservative | Platinum | b3 verify/quota tests |
| Media-lite | enabled when routed | Gold | descriptor/bounds tests |
| Full media streaming | disabled | Platinum+ | range/cache/paid tests |
| Facet placeholders | enabled | Gold | no-execution tests |
| Facet execution | disabled | future Diamond+ | sandbox/policy tests |
| Mobile | gateway-first | Diamond posture | mobile smoke/posture tests |

---

## 10. Failure policy

### 10.1 Blocking failures

A PR must not merge if it introduces:

```text
fake balance
fake receipt
silent spend
direct ledger mutation from CrabLink
direct storage/index mutation from UI
raw OAP frames in React
secrets in React state
sidecar auto-start
unverified cache trusted render
full-file large media command result
facet execution without policy/sandbox
deep link privilege escalation
```

### 10.2 Non-blocking failures

A feature may remain disabled if tests fail.

Example:

```text
OAP HELLO failing does not block gateway mode release if OAP remains disabled.
Sidecar lifecycle failing does not block gateway mode release if sidecar remains disabled.
Media streaming failing does not block media-lite release if full streaming remains disabled.
```

### 10.3 Quarantine policy

If a high-risk feature regresses:

```text
disable feature flag
document known gap
keep gateway-compatible safe path
add regression test before re-enable
```

---

## 11. Manual QA checklist

### 11.1 Desktop manual smoke

```text
[ ] Launch app.
[ ] Home loads.
[ ] Address bar accepts crab://home.
[ ] Address bar accepts crab://image.
[ ] Address bar rejects malformed crab URL.
[ ] Settings open.
[ ] Gateway health works.
[ ] Gateway ready works.
[ ] Identity page/panel opens.
[ ] Balance chip shows backend-derived state or unavailable.
[ ] Receipt page opens.
[ ] Paid gate requires confirmation.
[ ] Cancel paid action does not change balance.
[ ] App restart preserves only safe settings.
```

### 11.2 Paid flow manual smoke

```text
[ ] Open paid article/post/comment/image/site.
[ ] Paid gate appears.
[ ] Quote/prepare appears.
[ ] Confirmation displays payer/price/target.
[ ] Cancel works.
[ ] Confirm works only with backend.
[ ] Receipt appears after backend success.
[ ] Refresh does not double-charge.
[ ] Back/forward does not double-charge.
```

### 11.3 Offline manual smoke

```text
[ ] Cache verified public asset.
[ ] Disable network/backend.
[ ] Reopen cached public asset.
[ ] Offline/verified label appears.
[ ] Open named site snapshot.
[ ] Stale/offline label appears.
[ ] Open receipt page.
[ ] Receipt display says local copy only.
[ ] Paid content does not unlock from cache alone.
```

### 11.4 Media manual smoke

```text
[ ] Music/video/podcast/stream pages open.
[ ] Media-lite label appears where needed.
[ ] Small preview works.
[ ] Large file refuses unsafe preview.
[ ] No DRM/anti-rip claim appears.
```

### 11.5 Facet manual smoke

```text
[ ] Code page opens.
[ ] Game page opens.
[ ] Algo page opens.
[ ] Placeholder appears.
[ ] Permissions shown.
[ ] Launch disabled reason shown.
[ ] Deep link does not launch.
```

---

## 12. Security regression checklist

Run before any release:

```text
[ ] No fake ROC balance.
[ ] No fake receipt.
[ ] No silent spend.
[ ] No direct wallet mutation outside backend wallet path.
[ ] No direct ledger mutation.
[ ] No direct storage mutation from UI.
[ ] No direct index mutation from UI.
[ ] No raw OAP frame in React.
[ ] No OAP secret crosses bridge.
[ ] No vault secret crosses bridge.
[ ] No bearer/cap token in logs.
[ ] No private key/seed in settings.
[ ] No public main→alt linkage by default.
[ ] No sidecar auto-start.
[ ] No unverified binary execution.
[ ] No unbounded sidecar logs.
[ ] No unverified cache trusted render.
[ ] No paid unlock from cache alone.
[ ] No full-file media through command result.
[ ] No arbitrary code/facet execution.
[ ] No eval/new Function/script injection.
[ ] No shell/native execution command.
[ ] No QuickChain/ROX/Solana/bridge scope.
```

---

## 13. Anti-scope tests

Every anti-scope item should eventually have either:

```text
static check
unit test
integration test
smoke test
manual release checklist item
```

Anti-scope categories:

```text
wallet/ledger truth drift
secret leakage
deep-link privilege
OAP misuse
sidecar misuse
offline cache misuse
media unbounded transfer
facet execution
mobile desktop-lock
external settlement creep
```

---

## 14. Recommended first implementation test order

### Batch T0 — Test scaffold

```text
[ ] Create test folder structure.
[ ] Add placeholder test command scripts.
[ ] Add static forbidden-token checks.
[ ] Add test fixtures.
[ ] Add CI lane names.
```

### Batch T1 — Chrome proof preservation

```text
[ ] Ensure Chrome check still passes.
[ ] Ensure package still passes.
[ ] Ensure gateway smoke still passes.
```

### Batch T2 — Tauri launch smoke

```text
[ ] Tauri launches.
[ ] React shell renders.
[ ] Home route renders.
[ ] Gateway health command works.
```

### Batch T3 — Command bridge tests

```text
[ ] Command envelope.
[ ] Redaction.
[ ] Disabled feature statuses.
[ ] Malformed input rejection.
```

### Batch T4 — Gateway parity tests

```text
[ ] Resolve routes.
[ ] b3 asset routes.
[ ] identity route.
[ ] wallet balance route.
[ ] paid gate route.
```

### Batch T5 — Security regression base

```text
[ ] No silent spend.
[ ] No fake receipt.
[ ] No fake balance.
[ ] No raw OAP.
[ ] No sidecar start.
[ ] No facet execution.
```

### Batch T6 — Feature shells

```text
[ ] OAP status shell tests.
[ ] Vault status shell tests.
[ ] Sidecar status shell tests.
[ ] Offline cache status shell tests.
[ ] Media status shell tests.
[ ] Facet status shell tests.
```

### Batch T7 — Native feature proofs

```text
[ ] OAP HELLO proof.
[ ] Offline b3 cache proof.
[ ] Media bounded preview proof.
[ ] Sidecar fake-process proof.
[ ] Vault secure-storage proof.
[ ] Facet contract parser proof.
```

---

## 15. Suggested repository layout

Recommended test layout:

```text
apps/crablink-tauri/
  src/
    __tests__/
      app-shell.test.tsx
      routes.test.tsx
      paid.test.tsx
      receipts.test.tsx
      deep-links.test.tsx
      media.test.tsx
      facets.test.tsx

  src/shared/
    */__tests__/

  src-tauri/
    tests/
      commands_health.rs
      commands_settings.rs
      commands_deeplink.rs
      commands_paid.rs
      commands_oap.rs
      commands_vault.rs
      commands_sidecar.rs
      commands_offline_cache.rs
      commands_media.rs
      commands_facets.rs
      security_regression.rs

    src/
      */tests.rs

test/
  fixtures/
    crab/
    b3/
    gateway/
    identity/
    wallet/
    paid/
    receipts/
    offline-cache/
    media/
    facets/
    problems/

scripts/
  smoke-tauri-*.sh
  green-gate-tauri-local.sh
```

---

## 16. Test data and deterministic IDs

Use deterministic fixtures for repeatability.

Examples:

```text
b3:0000000000000000000000000000000000000000000000000000000000000000
b3:1111111111111111111111111111111111111111111111111111111111111111
passport:main:dev
passport:alt:dev-a
acct_dev
acct_creator_a
acct_visitor_b
receipt_dev_0001
tx_dev_0001
```

Rules:

```text
test IDs must be visibly fake
test receipts must be labeled fixture unless backend-returned
fixture balances must not be shown as real backend truth outside test mode
```

---

## 17. Observability tests

### 17.1 Metrics presence

When app metrics exist, test:

```text
[ ] command latency metric emitted.
[ ] route source selection metric emitted.
[ ] paid gate outcome metric emitted.
[ ] receipt cache write metric emitted.
[ ] OAP disabled/ready metric emitted.
[ ] sidecar state metric emitted.
[ ] offline cache verification metric emitted.
[ ] media bounds metric emitted.
[ ] facet placeholder metric emitted.
[ ] redaction metric emitted.
```

### 17.2 Metric safety

Test metric labels do not contain:

```text
full bearer token
private key
seed phrase
raw capability
private alt label
full local path
full unbounded URL
private wallet secret
```

### 17.3 Logging safety

Test logs do not contain:

```text
Authorization
Bearer
seed phrase
private key
raw capability
unredacted local file path where forbidden
private main→alt mapping
```

---

## 18. Documentation gates

Every feature PR must update relevant docs.

Required when touching:

```text
command bridge → TAURI_COMMAND_BRIDGE_IDB.MD or implementation notes
deep links → CRAB_URL_AND_DEEP_LINK_IDB.MD
settings/storage → STORAGE_AND_SETTINGS_IDB.MD
paid actions → PAID_ACTIONS_AND_RECEIPTS_IDB.MD
passport/vault → PASSPORT_WALLET_VAULT_IDB.MD
OAP → OAP_CLIENT_IDB.MD
sidecar → SIDECAR_LOCAL_NODE_IDB.MD
offline cache → OFFLINE_CACHE_IDB.MD
media → MEDIA_TAURI_IDB.MD
facets → FACET_SANDBOX_IDB.MD
tests → TESTING_MATRIX_TAURI_IDB.MD
```

Docs are not a substitute for tests.

Tests are not a substitute for docs.

Both are required for high-risk features.

---

## 19. Reviewer checklist

Before approving Tauri app changes:

```text
[ ] Does this preserve Chrome proof client?
[ ] Does this preserve gateway compatibility?
[ ] Does this keep React display-only?
[ ] Does this keep TypeScript secret-free?
[ ] Does this keep Rust command code narrow?
[ ] Does this avoid backend ownership drift?
[ ] Does this avoid direct ledger mutation?
[ ] Does this avoid direct storage/index mutation?
[ ] Does this avoid fake balances?
[ ] Does this avoid fake receipts?
[ ] Does this avoid silent spend?
[ ] Does this source-label sensitive results?
[ ] Does this include negative tests?
[ ] Does this include redaction tests where relevant?
[ ] Does this avoid desktop-only assumptions in shared core?
[ ] Does this leave future features disabled unless tests are green?
[ ] Does this avoid QuickChain/ROX/Solana scope?
```

---

## 20. Release checklist

Before any Tauri release:

```text
[ ] Bronze gate passes.
[ ] Silver gate passes for gateway mode.
[ ] Security regression suite passes.
[ ] Chrome proof client green.
[ ] Known disabled features display truthfully.
[ ] No high-risk feature enabled without subsystem gate.
[ ] Manual desktop smoke completed.
[ ] Mobile posture documented.
[ ] Changelog updated.
[ ] Known gaps documented.
[ ] Anti-scope review completed.
```

Before enabling OAP:

```text
[ ] OAP status tests pass.
[ ] HELLO tests pass.
[ ] frame bound tests pass.
[ ] gateway fallback tests pass.
[ ] capability failure tests pass.
[ ] no raw OAP UI tests pass.
```

Before enabling sidecar:

```text
[ ] binary provenance tests pass.
[ ] lifecycle tests pass.
[ ] port/log/data tests pass.
[ ] crash-loop tests pass.
[ ] no auto-start tests pass.
```

Before enabling vault custody:

```text
[ ] secure storage tests pass.
[ ] secret-return tests pass.
[ ] amnesia tests pass.
[ ] alt privacy tests pass.
[ ] no secret frontend tests pass.
```

Before enabling offline trusted cache:

```text
[ ] b3 verification tests pass.
[ ] digest mismatch tests pass.
[ ] path safety tests pass.
[ ] quota/eviction tests pass.
[ ] no paid-cache unlock tests pass.
```

Before enabling full media streaming:

```text
[ ] no full-blob tests pass.
[ ] range/segment tests pass.
[ ] cache verification tests pass.
[ ] player error tests pass.
[ ] paid media gate tests pass.
```

Before enabling facet execution:

```text
[ ] facet.toml tests pass.
[ ] policy allowlist tests pass.
[ ] capability tests pass.
[ ] sandbox lifecycle tests pass.
[ ] resource limit tests pass.
[ ] no wallet/network/storage/index default access tests pass.
```

---

## 21. Anti-scope

The testing matrix must prevent these from entering the app:

```text
- Fake ROC balances.
- Fake wallet receipts.
- Silent spend.
- Paid content unlock from cache alone.
- Direct ledger mutation from CrabLink.
- Direct wallet mutation outside backend wallet path.
- Direct storage/index mutation from UI.
- React-owned secrets.
- TypeScript-owned persistent authority.
- Raw OAP frames from React.
- Raw OAP sender command.
- Sidecar auto-start.
- Unverified sidecar binary execution.
- Localhost assumed trusted.
- Vault plaintext fallback in production.
- Public main→alt linkage by default.
- Offline cache treated as ownership truth.
- Offline cache treated as wallet truth.
- Unverified cache rendered as trusted.
- Full-file large media transfer through command result.
- Fake DRM/anti-rip claims.
- Arbitrary facet/code/game/algo execution.
- eval/new Function/script injection from crab assets.
- Shell/native execution from facet manifests.
- QuickChain/ROX/Solana/bridge/staking/liquidity scope in CrabLink.
```

Each item should eventually have a concrete test.

---

## 22. Future expansion

After the initial Tauri matrix is green, future test docs may split into:

```text
TESTING_MATRIX_DESKTOP.MD
TESTING_MATRIX_MOBILE.MD
TESTING_MATRIX_SECURITY.MD
TESTING_MATRIX_MEDIA.MD
TESTING_MATRIX_FACETS.MD
TESTING_MATRIX_OAP.MD
TESTING_MATRIX_SIDECAR.MD
TESTING_MATRIX_VALUE_PLANE.MD
```

For now, this single IDB is the canonical test map.

---

## 23. Plain-English summary

This test matrix is the guardrail for the Tauri pivot.

The rule is:

```text
Do not trust a feature because it works once.
Trust it only when the happy path and the dangerous failure paths are tested.
```

CrabLink Tauri becomes the primary client only when it proves:

```text
it preserves the Chrome proof,
it preserves gateway compatibility,
it keeps React display-only,
it keeps Rust native power bounded,
it keeps wallet/ledger truth backend-owned,
it keeps b3 verification honest,
it keeps paid actions explicit,
it keeps cache display-only where required,
it keeps media bounded,
it keeps facets inert by default,
and it keeps mobile-forward architecture possible.
```

Final gate:

```text
No fake truth.
No silent authority.
No unbounded native power.
No arbitrary execution.
No external settlement creep.
```
````
