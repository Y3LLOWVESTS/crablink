
````markdown
---
title: CRABLINK_TAURI_IDB
version: 0.1.0
status: draft
last-updated: 2026-05-17
audience: contributors, app engineers, RustyOnions service owners, security reviewers, ops, auditors
repo-target: crablink
primary-app-target: apps/crablink-tauri
related-repos:
  - RustyOnions
  - crablink
supersedes:
  - Chrome-extension-first CrabLink product direction
does-not-delete:
  - CrabLink Chrome Extension proof client
---

# CRABLINK_TAURI_IDB

RO:WHAT — Top-level invariant-driven blueprint for moving CrabLink from Chrome-extension-first to Tauri-first.

RO:WHY — The Chrome extension proved the UX/product loop, but the next phase needs native Rust capability: OAP/1 client integration, secure local persistence, native `crab://` deep links, media paths, local service orchestration, and desktop/mobile packaging.

RO:INTERACTS — CrabLink React app, Tauri Rust backend, TypeScript adapter layer, svc-gateway, omnigate, ron-app-sdk, oap, ron-proto, ron-naming, ron-policy, ron-auth, ron-kms, svc-passport, svc-wallet, ron-ledger, svc-storage, svc-index, svc-edge, svc-sandbox, svc-mod, micronode, macronode.

RO:INVARIANTS — Tauri is the primary client; Chrome extension becomes proof/companion. Gateway compatibility comes first. OAP is Rust-side only. b3 hashes are canonical. Wallet/ledger truth remains backend-owned. No fake balances, no fake receipts, no silent spend, no arbitrary code execution.

RO:METRICS — Future app telemetry must expose command latency, gateway/OAP path selection, deep-link open counts, paid-gate outcomes, receipt cache status, sidecar lifecycle state, offline cache verification, media transfer bounds, and redacted error classes.

RO:CONFIG — Tauri app config owns endpoint selection, gateway fallback, OAP enablement, sidecar enablement, amnesia mode, storage quota, cache policy, vault policy, media bounds, and platform feature flags.

RO:SECURITY — React owns display only. Tauri Rust owns privileged operations. Secrets never live in React state, localStorage, URL params, logs, or unredacted errors. Capabilities fail closed. Private alt/main relationships are not public.

RO:TEST — Desktop smoke, React unit tests, Rust command tests, gateway compatibility tests, deep-link tests, vault tests, OAP tests, paid-gate tests, offline cache tests, sidecar lifecycle tests, media bounds tests, mobile smoke, security regression tests.

---

## 0. Status

This blueprint is the first Tauri-native IDB for CrabLink.

It is not a request to write the full Tauri app immediately.

The correct sequence is:

```text
1. Lock this top-level Tauri IDB.
2. Create TAURI_MIGRATION_IDB.MD.
3. Scaffold the Tauri app.
4. Mount/reuse the existing React shell.
5. Preserve gateway HTTP route behavior first.
6. Move Chrome storage/settings behind adapters.
7. Preserve paid view gates.
8. Add native crab:// deep-link handling.
9. Add safe Rust command bridge for health/ready/resolve.
10. Add OAP_CLIENT_IDB.MD before serious OAP work.
11. Add PASSPORT_WALLET_VAULT_IDB.MD before real local authority.
12. Add MEDIA_TAURI_IDB.MD before serious media.
13. Add FACET_SANDBOX_IDB.MD before executable/game/code facets.
14. Add OFFLINE_CACHE_IDB.MD before trusted offline mode.
15. Add TESTING_MATRIX_TAURI_IDB.MD before broad platform work.
````

The goal is not to create a normal desktop wrapper.

The goal is:

```text
CrabLink Tauri = native Rust-backed RON client
```

---

## 1. Invariants (MUST)

### [I-1] Tauri is now the primary CrabLink product target

The Chrome extension remains valuable, but its role changes:

```text
Chrome extension:
  role: proof client / browser companion / gateway smoke client
  future work: maintenance, route proofing, small compatibility fixes

Tauri app:
  role: primary CrabLink native RON client
  future work: desktop-first, mobile-forward product development
```

The Tauri app must not be constrained by Chrome extension limitations.

---

### [I-2] Do not start from scratch

The existing React work is a proven asset.

Carry forward where practical:

```text
App shell
route registry
address bar
theme system
truth boundaries
asset pages
AssetContentViewAccess
AssetHydratedView
site render/sandbox concepts
profile scaffolds
passport drawer concepts
receipt panels
local catalog panels
creator workspace layouts
video/music/podcast/stream draft pages
code/facet pages
game/algo/ad pages
shared components
shared manifest builders
shared embed registry
```

Retire or adapt Chrome-only assumptions:

```text
chrome.storage
chrome.action
extension popup/options-only logic
host permissions
browser extension CSP assumptions
extension-only routing
Chrome packaging as the primary release path
```

---

### [I-3] React is display and orchestration, not authority

React may:

```text
render routes
collect user input
show backend-derived state
call TypeScript adapter functions
request Tauri commands
show confirmation dialogs
display receipts returned by backend truth
format values for humans
```

React must not:

```text
own private keys
own wallet truth
own ledger truth
invent balances
invent receipts
build OAP frames manually
mutate service state directly
bypass Tauri Rust command policy
store spend authority in browser-like storage
run arbitrary code from crab links
```

---

### [I-4] Tauri Rust backend is the native trust boundary

The Tauri Rust layer owns privileged local operations:

```text
command handlers
state manager
OAP client adapter
ron-app-sdk integration
vault adapter
platform secure storage adapter
local cache manager
sidecar/local node supervisor
deep-link handler
file/media adapters
redaction and error normalization
```

The Rust layer must remain modular. It must not become a hidden monolith that duplicates svc-wallet, ron-ledger, svc-storage, svc-index, omnigate, or svc-gateway.

---

### [I-5] Gateway compatibility comes first

The first Tauri milestone must preserve the currently proven route behavior through `svc-gateway`.

Initial Tauri networking should support:

```text
GET  /healthz
GET  /readyz
GET  /version where available
GET  /identity/me
GET  /wallet/:account/balance
GET  /crab/resolve?url=...
GET  /b3/<hash>.<kind>
GET  /sites/:name
POST /wallet/hold
POST /assets/image/prepare
POST /assets/image
POST /sites/prepare
POST /sites
POST /content/view or equivalent paid view route
```

The first Tauri app must not require OAP to be finished before it can render existing CrabLink routes.

---

### [I-6] OAP is Rust-side only

React must never manually construct OAP frames.

OAP rules:

```text
Tauri Rust commands/adapters may use OAP/1.
ron-proto carries DTOs.
ron-transport carries transport.
ron-policy decides rules.
svc-wallet and ron-ledger own economic truth.
OAP does not absorb app semantics.
OAP frame max is 1 MiB.
Preferred streaming DATA chunk posture is 64 KiB.
Oversized frames reject deterministically.
Buffers are bounded.
No locks across await.
```

---

### [I-7] b3 content IDs remain canonical

Every object, asset, manifest, and stored byte object must remain content-addressed.

Canonical internal form:

```text
b3:<64 lowercase hex>
```

Public typed asset form:

```text
crab://<64 lowercase hex>.<kind>
```

Examples:

```text
crab://<hash>.image
crab://<hash>.post
crab://<hash>.comment
crab://<hash>.article
crab://<hash>.video
crab://<hash>.music
```

Named site form:

```text
crab://<site_name>
```

Identity pointer form:

```text
crab://@username
```

Rules:

```text
Names are human pointers.
b3 hashes are canonical truth.
Storage stores bytes by content ID.
Ownership/payout/profile/manifest lookup belongs upstream in naming/index/gateway/omnigate.
```

---

### [I-8] ROC remains internal and backend-owned

The Tauri app must preserve the internal ROC value-plane rules:

```text
ROC remains internal.
No ROX in active app scope.
No Solana in active app scope.
No external settlement.
No staking.
No liquidity.
No exchange-facing logic.
No public bridge.
No chain logic inside CrabLink.
```

All ROC amounts used for truth must be integer ROC units from backend/service DTOs or compatible wire fields.

---

### [I-9] No silent spend

Every paid operation must require explicit user confirmation before spend authority is used.

Paid operations include:

```text
storage upload
image publish
site creation
site visit
content view
article view
post view
comment view
future music play
future video watch
future app/site access
future paid download
```

Rules:

```text
No hidden hold.
No hidden capture.
No hidden transfer.
No hidden subscription renewal.
No background spend from cached permissions.
No “unlock” unless backend receipt/access proof is valid.
```

---

### [I-10] Wallet mutation goes through svc-wallet

CrabLink Tauri must not mutate ledger state directly.

Allowed mutation front-door:

```text
svc-wallet
```

Durable truth:

```text
ron-ledger
```

Forbidden mutation owners:

```text
React
TypeScript SDK helpers
Tauri UI state
Tauri cache
Tauri local catalog
Tauri sidecar supervisor
svc-gateway
omnigate
svc-storage
svc-index
ron-accounting
svc-rewarder
passport logic
facet logic
media logic
```

svc-rewarder may plan deterministic payouts, but wallet/ledger commit remains separate.

---

### [I-11] No fake balances, receipts, profiles, reputation, or moderation truth

The app may cache display data, but cached data must be labeled as cached/stale when applicable.

Never invent:

```text
wallet balance
hold receipt
capture receipt
release receipt
content_view receipt
site_visit receipt
profile verification
reputation score
moderation role
payout address
ownership proof
provider proof
```

If backend truth is unavailable, the UI must show unavailable/degraded state.

---

### [I-12] Passports are identity/capability records, not wallets

The Tauri app may display and manage passport UX, but must preserve the model:

```text
Passport = identity/capability record
Wallet = account/economic authority
Profile = public display surface
Alt passport = pseudonymous identity with no public main linkage
```

Rules:

```text
A passport may link to a wallet permission.
A passport is not itself a wallet balance.
Alt passports do not automatically inherit main wallet authority.
Main→alt links are private unless explicitly designed otherwise.
Private alt mappings must not appear in public manifests.
```

---

### [I-13] Local vault work requires its own IDB

The top-level Tauri app may define the vault boundary, but must not implement real local key custody casually.

Before real local custody, create:

```text
PASSPORT_WALLET_VAULT_IDB.MD
SECURITY_AND_AMNESIA_IDB.MD
```

Until then:

```text
store safe labels only
use backend/dev identity bootstrap where needed
do not store seed phrases
do not store raw spend authority
do not store long-lived uncapped bearer tokens
```

---

### [I-14] Memory-first runtime, selective persistence

Default posture:

```text
memory-first runtime
explicit persistence categories
amnesia mode available
clear local state controls
no hidden disk spill for sensitive data
```

Persistence categories must be separated:

```text
safe UI preferences
gateway endpoint config
recent public routes
receipt display cache
offline public asset cache
encrypted private cache
passport/vault secrets
sidecar runtime state
debug logs
```

Each category needs explicit retention, wipe, and export policy.

---

### [I-15] Offline cache is never ownership truth

Offline cache may improve UX.

It must not become:

```text
ownership proof
wallet proof
ledger proof
receipt proof
profile proof
moderation proof
provider proof
```

Every cached object must be verified by b3 hash before serving from cache.

---

### [I-16] Deep links are native entry points, not authority bypasses

Native `crab://` handling must route into the same resolver and policy path as typed user navigation.

Rules:

```text
crab:// link opens Tauri app
link is normalized
link is classified
route policy applies
paid gates still apply
unsafe schemes are rejected
no command injection through URL
no local file read from crab URL
no secret passed in deep-link URL
```

---

### [I-17] Sidecars/local nodes are supervised, explicit, and bounded

The Tauri app may eventually supervise local services or node bundles.

Rules:

```text
sidecar disabled by default until implemented intentionally
explicit config controls sidecar mode
truthful health/ready state
bounded logs
bounded restarts
no silent privileged install
no direct ledger mutation by supervisor
no app-specific logic inside substrate crates
desktop first; mobile constraints respected
```

Sidecar/local node work requires a separate lifecycle/runbook section or IDB before production use.

---

### [I-18] Media must be bounded and honest

The Tauri app is allowed to become media-capable, but media must not bypass RustyOnions invariants.

Rules:

```text
no full-file buffering through Tauri commands for large media
range/segment paths preferred
b3 verification required
manifests define renditions
OAP/gateway media paths must be bounded
offline cache quota enforced
no fake DRM claims
no fake anti-rip guarantees
```

Serious media work requires:

```text
MEDIA_TAURI_IDB.MD
OFFLINE_CACHE_IDB.MD
OAP_CLIENT_IDB.MD
```

---

### [I-19] Facet/code/game/algo execution is forbidden until sandboxed

CrabLink Tauri must not run arbitrary code from crab links.

Before any executable/plugin/game/code facet:

```text
FACET_SANDBOX_IDB.MD must exist.
facet.toml contract must exist.
ron-policy allowlist must exist.
svc-sandbox role must be clear.
resource limits must be enforced.
network/wallet/profile/storage permissions must be explicit.
```

Default behavior:

```text
render as inert manifest/page
do not execute
do not eval JS/WASM
do not grant filesystem/network/wallet access
```

---

### [I-20] Desktop-first, mobile-forward

The first target is desktop, but architecture must not trap core logic in desktop-only APIs.

Rules:

```text
platform adapters isolate OS-specific behavior
mobile unsupported features degrade clearly
core route/render/payment logic remains portable
file dialogs/media APIs are adapter-owned
deep links use platform adapter
secure storage uses platform adapter
sidecar features may be desktop-only initially
```

---

### [I-21] Observability is part of the app contract

Tauri must expose truthful diagnostics for development and later operations.

Required diagnostic categories:

```text
app version
frontend build version
Rust backend version
gateway endpoint
gateway health/ready
OAP enabled/disabled
sidecar enabled/disabled
sidecar health/ready
cache mode
amnesia mode
vault mode
last route error
last paid gate outcome
```

No secrets in logs, metrics, crash dumps, or UI debug panels.

---

### [I-22] Errors are typed, redacted, and user-safe

The app must normalize errors across:

```text
React render errors
TypeScript adapter errors
Tauri invoke errors
Rust command errors
gateway HTTP errors
OAP errors
vault errors
sidecar errors
cache verification errors
deep-link parsing errors
```

Rules:

```text
no raw secrets in errors
no bearer tokens in logs
no private passport material in diagnostics
no wallet account IDs in high-cardinality metrics labels
no stack traces shown to normal users by default
developer diagnostics are opt-in
```

---

## 2. Design Principles (SHOULD)

### [P-1] Preserve the proven product loop before native expansion

The first Tauri app should prove:

```text
existing React shell loads
gateway health works
crab://home works
typed b3 asset pages render
paid view gates still work
receipt-driven unlocks still work
```

Only after that should it add native-specific features.

---

### [P-2] Use adapter boundaries, not rewrites

Preferred structure:

```text
apps/crablink-tauri/
  src/
    React app shell
    route registry
    pages
    shared UI
    TypeScript adapters

  src-tauri/
    Rust commands
    app state
    platform adapters
    gateway client
    future OAP adapter
    future vault adapter
    future sidecar supervisor

crablink-core/
  shared React components
  route registry
  asset renderers
  manifest builders
  truth boundaries
  shared DTO helpers
```

---

### [P-3] Keep route ownership clear

A page owns its page behavior.

Shared systems own cross-cutting behavior:

```text
route registry owns route classification
gateway client owns HTTP gateway calls
Tauri invoke adapter owns Rust command calls
truth boundary owns source labeling
paid gate owns confirmation flow
receipt panel owns receipt display
manifest builder owns manifest shape
```

Avoid patch-heavy global page scripts.

---

### [P-4] Prefer gateway fallback before native OAP

Tauri should start with the currently proven gateway contract, then add OAP behind a config switch.

Target path evolution:

```text
Bronze: gateway HTTP only
Silver: gateway HTTP + Rust command bridge
Gold: gateway HTTP + Rust-side OAP proof
Platinum: gateway/OAP selectable per route
Diamond: native RON client with sidecar/local-node options
```

---

### [P-5] Treat local state as convenience unless cryptographically verified

Local state can make the app pleasant.

It must be labeled and bounded.

Examples:

```text
recent routes
recent receipts display cache
local catalog
draft manifests
offline public assets
last known balance display
```

These are not truth unless verified by backend or cryptographic proof.

---

### [P-6] Make paid UX boring, explicit, and consistent

Every paid flow should feel the same:

```text
quote/prepare
show price and recipient/purpose
user confirms
wallet hold/transfer/capture via backend
receipt returned
unlock only after proof
receipt stored in recent receipts display cache
balance refresh requested
```

No “magic spend” UX.

---

### [P-7] Keep Tauri commands small and typed

Tauri commands should be narrow:

```text
health_check
ready_check
resolve_crab_url
get_asset_page
prepare_paid_action
confirm_wallet_hold
get_wallet_balance
open_deep_link
read_safe_setting
write_safe_setting
verify_cached_b3
```

Avoid giant commands like:

```text
doEverythingForPage()
runNativeBrowser()
mutateWalletAndRender()
```

---

### [P-8] Make mobile constraints visible early

Mobile may not support every desktop feature.

Examples likely desktop-first:

```text
sidecar/local node
large local cache
developer diagnostics
advanced file watching
some media filesystem flows
```

Do not let those become hard requirements for core route rendering.

---

### [P-9] Use feature gates for risky layers

Feature-gate:

```text
OAP native client
sidecar supervisor
local vault
offline encrypted cache
media streaming
facet execution
developer diagnostics
experimental mobile behavior
```

Default disabled until acceptance gates are green.

---

### [P-10] Document truth boundaries in the UI

The UI should make source of truth understandable:

```text
backend-confirmed
gateway-derived
OAP-derived
cached display
offline verified by b3
unverified local draft
dev fallback
unavailable
```

Users and developers should not confuse local display cache with durable truth.

---

## 3. Implementation (HOW)

### [C-1] Proposed repository layout

```text
crablink/
  apps/
    crablink-tauri/
      package.json
      index.html
      vite.config.ts

      src/
        main.jsx
        app/
          App.jsx
          router.js
          routeRegistry.js
          appState.js
          appEvents.js
          settings.js
          shell/
          pages/
          shared/

        adapters/
          gateway/
            gatewayClient.ts
            routeContracts.ts
          tauri/
            invokeClient.ts
            commands.ts
            deepLinks.ts
            settingsStore.ts
            platform.ts
          storage/
            settingsAdapter.ts
            localCatalogAdapter.ts
            receiptCacheAdapter.ts

      src-tauri/
        Cargo.toml
        tauri.conf.json
        src/
          main.rs
          app_state.rs
          commands/
            mod.rs
            health.rs
            resolve.rs
            settings.rs
            cache.rs
            wallet.rs
          gateway/
            mod.rs
            client.rs
            errors.rs
          oap_client/
            mod.rs
            disabled.rs
          platform/
            mod.rs
            deep_link.rs
            secure_store.rs
            file_dialog.rs
          sidecar/
            mod.rs
            disabled.rs
          security/
            mod.rs
            redact.rs
            amnesia.rs
          metrics/
            mod.rs

  packages/
    crablink-core/
      src/
        routeRegistry/
        components/
        truthBoundary/
        manifests/
        embeds/
        paidGates/
        receipts/
        catalog/
```

This structure is a direction, not a forced one. The invariant is the boundary separation.

---

### [C-2] Frontend adapter contract

React should call a TypeScript adapter, not raw Tauri APIs everywhere.

Example shape:

```ts
export type ResolveSource = "gateway" | "tauri-command" | "oap" | "cache";

export interface CrabResolveRequest {
  url: string;
  sourcePreference?: ResolveSource;
  correlationId?: string;
}

export interface CrabResolveResult {
  schema: "crablink.resolve-result.v1";
  url: string;
  canonicalUrl?: string;
  source: ResolveSource;
  status: "ok" | "not_found" | "policy_denied" | "not_ready" | "error";
  payload?: unknown;
  problem?: CrabProblem;
  backendConfirmed: boolean;
  cached: boolean;
}
```

Rules:

```text
React consumes ResolveResult.
React does not know whether gateway or OAP was used internally unless source is displayed.
Errors are typed and redacted before reaching components.
```

---

### [C-3] Tauri command naming pattern

Command names should be boring and explicit:

```rust
health_check
ready_check
resolve_crab_url
get_gateway_config
set_gateway_config
get_wallet_balance
prepare_paid_action
verify_b3_cached_object
open_external_safe
clear_cache_category
```

Avoid ambiguous names:

```rust
run
execute
handle
process
do_native
```

---

### [C-4] Rust command result envelope

All Tauri Rust commands should return a stable envelope.

```rust
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub struct CommandOk<T> {
    pub schema: &'static str,
    pub correlation_id: String,
    pub source: CommandSource,
    pub data: T,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub struct CommandProblem {
    pub schema: &'static str,
    pub correlation_id: String,
    pub code: String,
    pub message: String,
    pub retryable: bool,
    pub source: CommandSource,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CommandSource {
    Gateway,
    Oap,
    Cache,
    Vault,
    Sidecar,
    Platform,
}
```

Rules:

```text
Do not expose raw anyhow/debug errors to React.
Do not include secrets in message.
Use correlation IDs across frontend, Tauri, gateway, and OAP where possible.
```

---

### [C-5] Gateway-first implementation pattern

Initial Tauri commands may wrap gateway routes.

```text
React
→ TS adapter
→ Tauri invoke(resolve_crab_url)
→ Rust gateway client
→ svc-gateway
→ omnigate/services
→ typed result
→ React render
```

This preserves proven behavior while moving privileged networking into Rust.

The app may also temporarily allow direct TypeScript gateway calls during migration, but the target should be adapter-owned and command-capable.

---

### [C-6] OAP-later implementation pattern

Future OAP path:

```text
React
→ TS adapter
→ Tauri invoke(resolve_crab_url)
→ Rust route policy
→ ron-app-sdk / OAP adapter
→ ron-transport
→ RustyOnions service/node
→ typed result
→ React render
```

OAP-specific IDB must define:

```text
frame bounds
streaming chunk posture
timeouts
backpressure
capability passing
DTO mapping
error taxonomy
gateway fallback
media transfer strategy
```

---

### [C-7] Settings adapter pattern

Replace Chrome storage with a storage interface.

```ts
export interface CrablinkSettingsStore {
  getSettings(): Promise<CrablinkSettings>;
  saveSettings(next: CrablinkSettings): Promise<CrablinkSettings>;
  resetSettings(): Promise<CrablinkSettings>;
  clearLocalIdentityLabels(): Promise<void>;
}
```

Adapters:

```text
ChromeSettingsStore     used by extension
TauriSettingsStore      used by Tauri app
MemorySettingsStore     used by tests
```

Rules:

```text
Settings are not wallet truth.
Settings are not ledger truth.
Settings are not private key storage.
```

---

### [C-8] Deep-link handling pattern

Native deep-link flow:

```text
OS opens crab://<target>
Tauri platform adapter receives URL
URL normalized by shared crab URL parser
route registry classifies URL
policy checks route type
existing route navigation opens page
paid gates still apply
```

Rejected inputs:

```text
non-crab unsafe schemes
malformed b3 hashes
uppercase/noncanonical b3 where strict canonical form required
path traversal attempts
file:// injection
javascript: URLs
data: URLs
secret-bearing URLs
```

---

### [C-9] Paid gate pattern

Every paid gate should preserve this flow:

```text
prepare/quote
→ render price/purpose/source
→ user confirmation
→ wallet operation through backend path
→ receipt/access proof
→ unlock/render
→ receipt display cache update
→ balance refresh
```

Never:

```text
unlock because local UI says paid
unlock because local cache says paid unless proof is still valid
auto-confirm a spend
hide recipient/purpose
```

---

### [C-10] Sidecar disabled stub

Before sidecar implementation, use explicit disabled modules.

```rust
pub enum SidecarMode {
    Disabled,
    DesktopDev,
    DesktopBundled,
}

pub struct SidecarStatus {
    pub mode: SidecarMode,
    pub available: bool,
    pub ready: bool,
    pub reason: Option<String>,
}
```

The app should be able to show:

```text
Sidecar: disabled
Gateway: ready
OAP: disabled
```

without pretending local node mode exists.

---

### [C-11] Offline cache verification pattern

Before serving cached bytes:

```text
read bytes
compute BLAKE3
compare to requested b3:<hash>
reject on mismatch
record cache_integrity_fail
delete/quarantine bad object
never render corrupted bytes
```

Cache metadata must not override content hash truth.

---

### [C-12] File header convention for paste-ready code

Every future full paste-ready file should keep RustyOnions header conventions.

Rust:

```rust
//! RO:WHAT — <what this file does>
//! RO:WHY — <why it exists>
//! RO:INTERACTS — <nearby modules/services>
//! RO:INVARIANTS — <hard rules>
//! RO:METRICS — <metrics/logs if any>
//! RO:CONFIG — <knobs/env/config if any>
//! RO:SECURITY — <secret/capability considerations>
//! RO:TEST — <unit/smoke/fuzz/chaos hooks>
```

TypeScript/React:

```ts
/**
 * RO:WHAT — <what this file does>
 * RO:WHY — <why it exists>
 * RO:INTERACTS — <nearby modules/services>
 * RO:INVARIANTS — <hard rules>
 * RO:SECURITY — <secret/capability considerations>
 * RO:TEST — <unit/smoke hooks>
 */
```

---

## 4. Acceptance Gates (PROOF)

### [G-1] Bronze gate — Tauri shell preserves proven client behavior

Required:

```text
[ ] Tauri desktop app launches.
[ ] Existing React shell appears.
[ ] Route registry loads.
[ ] crab://home works.
[ ] crab://image works.
[ ] crab://site works.
[ ] crab://post page route still renders.
[ ] crab://comment page route still renders.
[ ] crab://article page route still renders.
[ ] Existing asset page components render.
[ ] Gateway endpoint can be configured.
[ ] Gateway health/ready status displays.
[ ] Chrome extension still builds as proof client.
```

Proof commands, draft:

```bash
cd /Users/mymac/Desktop/crablink
npm run tauri dev

cd /Users/mymac/Desktop/crablink
bash scripts/check-react-lane.sh
bash scripts/check-chrome.sh
```

---

### [G-2] Silver gate — Adapter migration

Required:

```text
[ ] Tauri settings adapter replaces chrome.storage in Tauri build.
[ ] Chrome settings adapter still exists for extension build.
[ ] Shared route registry works in both targets.
[ ] Shared truth boundary components work in both targets.
[ ] Shared paid gates work in both targets.
[ ] No direct chrome.* reference in Tauri runtime bundle.
[ ] No Tauri invoke usage leaks into Chrome build.
[ ] TypeScript adapter tests pass.
```

---

### [G-3] Silver gate — Rust command bridge

Required:

```text
[ ] health_check command exists.
[ ] ready_check command exists.
[ ] resolve_crab_url command exists or stubbed behind feature.
[ ] Commands return typed envelopes.
[ ] Errors are redacted.
[ ] Correlation ID flows through commands.
[ ] React can call commands safely.
[ ] No secrets in command errors.
```

---

### [G-4] Silver gate — Native deep link

Required:

```text
[ ] crab:// deep links open Tauri app on desktop dev platform.
[ ] Deep-link URL is normalized.
[ ] Malformed URL is rejected.
[ ] Paid gates still apply after deep-link open.
[ ] Deep link cannot trigger local file reads.
[ ] Deep link cannot pass secrets into logs.
```

---

### [G-5] Gold gate — Gateway/OAP split is explicit

Required:

```text
[ ] Gateway mode is default.
[ ] OAP mode is disabled until OAP_CLIENT_IDB exists.
[ ] Config exposes current route source.
[ ] UI labels source: gateway, OAP, cache, or unavailable.
[ ] No React OAP frame construction exists.
[ ] Rust OAP module is either absent or feature-gated.
```

---

### [G-6] Gold gate — Memory-first runtime and selective persistence

Required:

```text
[ ] Persistence categories are documented.
[ ] Clear cache controls exist for noncritical local data.
[ ] Amnesia mode switch exists or is stubbed truthfully.
[ ] Receipt display cache is labeled as cache.
[ ] Last known balance is labeled as stale unless refreshed.
[ ] No private keys are stored.
[ ] No seed phrase fields exist.
[ ] No long-lived uncapped spend token is stored.
```

---

### [G-7] Platinum gate — Vault design implemented only after vault IDB

Required before real local key custody:

```text
[ ] PASSPORT_WALLET_VAULT_IDB.MD exists.
[ ] SECURITY_AND_AMNESIA_IDB.MD exists.
[ ] Platform secure storage adapter exists.
[ ] Secrets are encrypted/sealed where persisted.
[ ] React never receives raw secret material.
[ ] Redaction tests pass.
[ ] Lock/unlock lifecycle is tested.
[ ] Main/alt separation is tested.
[ ] No public main→alt leakage.
```

---

### [G-8] Platinum gate — Offline cache is verified

Required:

```text
[ ] OFFLINE_CACHE_IDB.MD exists.
[ ] Cached objects are verified by BLAKE3 before render.
[ ] Cache quota enforced.
[ ] Cache eviction deterministic enough for tests.
[ ] Corrupted cache object is rejected.
[ ] Offline receipt display is clearly labeled.
[ ] Cache never overrides backend ownership truth.
```

---

### [G-9] Platinum gate — Media is bounded

Required before serious media:

```text
[ ] MEDIA_TAURI_IDB.MD exists.
[ ] Large media does not cross Tauri command boundary as full in-memory blob.
[ ] Range/segment path exists or is stubbed honestly.
[ ] b3 verification exists for media objects/manifests.
[ ] Playback errors are typed.
[ ] Offline media cache uses quota.
[ ] UI makes no fake DRM/anti-rip promises.
```

---

### [G-10] Diamond gate — Tauri becomes primary CrabLink client

Required:

```text
[ ] Desktop app is stable enough for daily local development.
[ ] Chrome extension remains green as proof/companion.
[ ] Gateway path works.
[ ] Rust command path works.
[ ] Native deep links work.
[ ] Paid gates work.
[ ] Receipt display works.
[ ] Passport/profile UX works against backend truth.
[ ] Offline verified cache works for safe public assets.
[ ] OAP proof path exists behind config.
[ ] Mobile architecture does not require rewrites of route/payment/core UI.
```

---

## 5. Anti-Scope (Forbidden)

The following are explicitly forbidden in this blueprint’s implementation phase:

```text
- Deleting or abandoning the Chrome extension before Tauri is green.
- Rewriting the React app from scratch without need.
- Putting wallet truth in React.
- Putting ledger truth in React.
- Storing private keys in React state.
- Storing seed phrases in localStorage.
- Storing uncapped spend authority in settings.
- Faking ROC balances.
- Faking receipts.
- Silent ROC spend.
- Direct ledger mutation from CrabLink.
- Direct ledger mutation from gateway.
- Direct ledger mutation from omnigate.
- Direct ledger mutation from storage/index/media/profile/facet logic.
- Chain/QuickChain implementation inside CrabLink.
- ROX/Solana/external settlement logic in active Tauri app.
- OAP frame construction in React.
- App semantics inside OAP.
- Storage semantics inside UI.
- Arbitrary JS/WASM execution from crab links.
- Public main→alt linkage by default.
- Privacy claims without real protocol support.
- Anti-rip/DRM claims that are not technically enforced.
- Unbounded queues.
- Unbounded media buffering.
- Full-file large media transfer through Tauri commands.
- Desktop-only APIs leaking into core route/payment logic.
- Sidecar auto-install or privileged launch without explicit design.
- High-cardinality sensitive metrics labels.
- Raw secrets in logs, crash dumps, or UI diagnostics.
```

---

## 6. References

Primary project references:

```text
Pasted text.txt
NOTES.MD
CODEBUNDLE_CHROME_EXTENSION.md
CODEBUNDLE_RS.md
ALLNOTES.MD
ALL_DOCS_COMBINED.MD
NEXT_LEVEL.MD
QUICKCHAIN.MD
CODECHECK.md
CODECOMMENTS.MD
```

Relevant doctrine carried into this IDB:

```text
Chrome extension is green proof client.
Tauri is primary native RON client.
Reuse existing React as much as possible.
Gateway compatibility comes first.
OAP is future Rust-side native path.
b3 hashes are canonical.
crab:// URLs are user-facing product pointers.
Sites are reference graphs.
Assets are b3-backed manifests/objects.
Passports are identity/capability records, not wallets.
Alt passports must not publicly link to main passports.
Wallet remains mutation front-door.
Ledger remains durable economic truth.
No fake balances.
No fake receipts.
No silent spend.
No arbitrary executable code from crab links.
QuickChain remains future blueprint only.
```

---

## 7. Reviewer Checklist

Before approving any Tauri batch, reviewers must confirm:

```text
[ ] Does this preserve the proven Chrome extension product loop?
[ ] Does this reuse React instead of rewriting unnecessarily?
[ ] Is every Chrome-only API behind an adapter?
[ ] Is every Tauri-only API behind an adapter?
[ ] Does React avoid secrets and wallet truth?
[ ] Do paid actions require explicit confirmation?
[ ] Are balances/receipts backend-derived or clearly labeled cache?
[ ] Are b3 IDs canonical?
[ ] Are crab URLs normalized and safe?
[ ] Are deep links treated as navigation, not authority?
[ ] Is OAP Rust-side only?
[ ] Are buffers bounded?
[ ] Are errors typed and redacted?
[ ] Does this avoid QuickChain/ROX/Solana scope?
[ ] Does this keep sidecar/local-node work explicit and supervised?
[ ] Does this avoid arbitrary code execution?
[ ] Does this preserve main/alt privacy?
[ ] Does this keep mobile-forward architecture possible?
```

---

## 8. Plain-English Summary

CrabLink Tauri is the next primary client for RustyOnions.

The Chrome extension proved:

```text
crab:// routing
b3 asset pages
paid content access
paid image/site/post/comment/article flows
receipt-driven unlocks
route-owned React UX
```

Tauri exists because the next phase needs:

```text
Rust command bridge
native deep links
secure local persistence
future OAP/1 client
future local vault
future local node/sidecar supervision
bounded media paths
desktop/mobile packaging
```

The first Tauri goal is not to invent a new product.

The first Tauri goal is:

```text
move the proven CrabLink product shell into a native Rust-backed app
without breaking RustyOnions invariants.
```

```
```
