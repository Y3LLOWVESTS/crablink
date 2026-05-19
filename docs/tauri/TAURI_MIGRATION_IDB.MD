
````markdown
---
title: TAURI_MIGRATION_IDB
version: 0.1.0
status: draft
last-updated: 2026-05-17
audience: contributors, app engineers, RustyOnions service owners, security reviewers, ops, auditors
repo-target: crablink
primary-app-target: apps/crablink-tauri
migration-source:
  - extensions/chrome
  - shared
  - docs
migration-target:
  - apps/crablink-tauri
  - packages/crablink-core
  - packages/crablink-browser-extension
  - packages/crablink-tauri-adapters
related-blueprints:
  - CRABLINK_TAURI_IDB.MD
  - SECURITY_NOTES_CRABLINK_TAURI.MD
  - RUN_STACK_AND_MODES_IDB.MD
  - TAURI_COMMAND_BRIDGE_IDB.MD
  - CRAB_URL_AND_DEEP_LINK_IDB.MD
  - STORAGE_AND_SETTINGS_IDB.MD
  - PAID_ACTIONS_AND_RECEIPTS_IDB.MD
  - OAP_CLIENT_IDB.MD
  - PASSPORT_WALLET_VAULT_IDB.MD
  - OFFLINE_CACHE_IDB.MD
  - MEDIA_TAURI_IDB.MD
  - FACET_SANDBOX_IDB.MD
---

# TAURI_MIGRATION_IDB

RO:WHAT — Defines the migration plan from the Chrome-extension-first CrabLink proof client into the Tauri-first native CrabLink app.

RO:WHY — The Chrome extension proved the product model, but the next phase requires native Rust capability, deep links, secure persistence, future OAP, local service orchestration, media paths, and desktop/mobile packaging without losing the proven React work.

RO:INTERACTS — extensions/chrome, shared, apps/crablink-tauri, packages/crablink-core, React route registry, Tauri Rust backend, TypeScript adapters, svc-gateway, omnigate, svc-wallet, ron-ledger, svc-storage, svc-index, ron-app-sdk, oap, ron-proto, ron-transport, ron-policy, svc-passport, ron-auth, ron-kms.

RO:INVARIANTS — Reuse proven React where practical. Do not hard-lock the app to localhost. Gateway mode works first. Chrome extension remains proof/companion. Tauri Rust mediates privileged/native behavior. Wallet/ledger truth remains backend-owned. OAP is Rust-side only. b3 hashes remain canonical. No fake receipts. No silent spend. No arbitrary code execution.

RO:METRICS — Migration gates track route parity, component reuse, adapter coverage, Chrome/Tauri build health, gateway smoke parity, command bridge readiness, deep-link readiness, paid-gate parity, and security regression status.

RO:CONFIG — Migration introduces target-specific config for gateway endpoint, app mode, storage adapter, command bridge adapter, deep-link enablement, OAP enablement, sidecar enablement, amnesia mode, and dev diagnostics.

RO:SECURITY — Chrome APIs and Tauri APIs must be isolated behind adapters. React owns display only. Secrets never live in React state or browser-like storage. Tauri commands are typed and redacted. Local/native features are opt-in and gated.

RO:TEST — React unit tests, adapter tests, Chrome checks, Tauri build checks, gateway smoke, route parity smoke, paid-gate smoke, deep-link tests, command bridge tests, storage migration tests, and security regressions.

---

## 0. Status

This blueprint defines how to migrate CrabLink from:

```text
Chrome extension proof client
````

to:

```text
Tauri-first native CrabLink app
```

without throwing away the proven React work.

The migration is not a rewrite.

The migration is:

```text
extract shared product code
remove Chrome-only assumptions
add Tauri adapters
preserve gateway route behavior
add native capabilities gradually
keep Chrome as proof/companion
```

Correct migration posture:

```text
Chrome extension proved the product.
Tauri becomes the primary product.
Shared React becomes reusable product core.
Tauri Rust becomes native privilege boundary.
RustyOnions services remain backend truth.
```

---

## 1. Invariants (MUST)

### [I-1] Do not start from scratch

The existing React CrabLink app is a major asset.

Carry over where practical:

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
profile page scaffolds
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
shared b3/crab URL utilities
gateway clients
paid gate components
```

Rewrite only when a piece is tightly coupled to Chrome extension APIs or extension lifecycle assumptions.

---

### [I-2] Tauri is primary, Chrome is proof/companion

After migration begins:

```text
CrabLink Tauri:
  status: primary product target
  role: native RON client
  development priority: high

CrabLink Chrome extension:
  status: green proof client / browser companion / smoke surface
  role: maintain compatibility and route proofing
  development priority: maintenance, small proof patches, smoke helpers
```

The Chrome extension must not be deleted prematurely.

The Chrome extension also must not receive major native-only architecture backports that would delay Tauri.

---

### [I-3] Gateway compatibility comes before native expansion

The first migrated Tauri app must preserve the current gateway behavior before adding native-only layers.

Initial target:

```text
React UI
→ TypeScript adapter
→ gateway HTTP compatibility
→ svc-gateway
→ omnigate
→ RustyOnions services
```

Only after this works should we add:

```text
Tauri Rust command bridge
native crab:// deep links
Rust-side OAP
sidecar/local node
secure local vault
offline cache
large media paths
facet sandbox execution
```

---

### [I-4] Do not hard-lock CrabLink to localhost

Local servers are valid for development.

They must not become the normal user model.

Supported modes must remain distinct:

```text
Gateway Mode:
  normal default client mode
  app connects to configured svc-gateway endpoint

Local Dev Stack Mode:
  development/testing mode
  app points to 127.0.0.1 gateway stack

Optional Local Node / Sidecar Mode:
  future explicit mode
  app supervises or talks to local micronode/service bundle
  opt-in, health-checked, bounded, not silent
```

Forbidden:

```text
normal users must run local wallet/ledger/storage/index just to open CrabLink
```

---

### [I-5] The app is not the backend

CrabLink Tauri must not become:

```text
ron-kernel
ron-bus
svc-wallet
ron-ledger
svc-storage
svc-index
omnigate
svc-gateway
ron-accounting
svc-rewarder
svc-passport
ron-policy
```

It may:

```text
call configured services
call local dev services
supervise a future optional sidecar
use RustyOnions libraries where appropriate
display backend truth
cache verified public content
hold local UI/session state
```

It must not:

```text
directly mutate ledger truth
invent wallet truth
invent receipt truth
act as durable storage truth
act as name/index truth
act as policy authority
```

---

### [I-6] Preserve the route-owned React architecture

The migration must preserve route ownership.

Route-owned examples:

```text
home
library
image
asset
site
profile
post
comment
article
text
video
music
podcast
stream
code
game
algo
ad
receipts
quickchain
notFound
problem
```

Each page should remain responsible for its own view behavior.

Shared systems should own cross-cutting logic:

```text
route registry
gateway adapter
Tauri invoke adapter
settings adapter
paid gate adapter
receipt cache adapter
manifest helpers
truth boundary components
theme provider
embed registry
crab URL parser
b3 parser
```

---

### [I-7] Chrome APIs must be isolated

Chrome APIs must not leak into shared product code or Tauri builds.

Chrome-only APIs include:

```text
chrome.storage
chrome.action
chrome.runtime
chrome.tabs
extension popup lifecycle
extension options lifecycle
Manifest V3 permissions
host_permissions
background.js assumptions
content script assumptions
```

Required migration pattern:

```text
shared product code calls adapter interface
Chrome build supplies Chrome adapter
Tauri build supplies Tauri adapter
tests supply memory adapter
```

---

### [I-8] Tauri APIs must be isolated

Tauri APIs must not leak into Chrome builds.

Tauri-only APIs include:

```text
@tauri-apps/api
tauri invoke
Tauri deep-link plugin
Tauri file dialogs
Tauri secure storage adapter
Tauri shell/window APIs
Tauri sidecar APIs
Rust command names
platform-specific app data directories
```

Required migration pattern:

```text
shared product code calls adapter interface
Tauri build supplies Tauri adapter
Chrome build never imports Tauri modules
```

---

### [I-9] React remains display/orchestration only

React may:

```text
render pages
collect user input
route crab URLs
call adapters
show paid confirmation
show backend-derived receipts
show cached/stale labels
show diagnostics
```

React must not:

```text
own private keys
own wallet truth
own ledger truth
construct OAP frames
store spend authority
store seed phrases
silently spend ROC
invent b3 hashes
invent receipts
execute arbitrary crab-linked code
```

---

### [I-10] Tauri Rust becomes the privileged native boundary

Tauri Rust should own:

```text
native command handlers
platform storage adapters
deep-link input handling
future OAP adapter
future ron-app-sdk adapter
future vault adapter
future sidecar supervisor
future offline cache verifier
future media filesystem/range helpers
redaction and error normalization
```

Tauri Rust must not become a hidden backend service monolith.

---

### [I-11] b3 and crab URL rules must remain unchanged

Canonical internal content ID:

```text
b3:<64 lowercase hex>
```

Canonical public asset URL:

```text
crab://<64 lowercase hex>.<kind>
```

Named site URL:

```text
crab://<site_name>
```

Profile pointer URL:

```text
crab://@username
```

Rules:

```text
b3 hashes are canonical
names are human pointers
site roots are not image CIDs unless the site root itself is the stored page object
assets stay independent b3-backed objects
sites store references and route maps
```

---

### [I-12] Paid gates must survive migration unchanged in principle

Every paid flow must remain explicit:

```text
prepare/quote
→ user reviews action/price/purpose/recipient
→ user confirms
→ backend wallet path performs hold/capture/transfer
→ backend receipt/access proof returns
→ UI unlocks only after proof
→ receipt display cache updates
→ balance refresh requested
```

Forbidden:

```text
silent spend
local unlock without receipt/access proof
fake receipt creation
fake balance updates
hidden recurring payments
Chrome-only paid gate logic that breaks in Tauri
Tauri-only paid gate logic that breaks Chrome proof client unnecessarily
```

---

### [I-13] QuickChain stays display/readiness only

During this migration:

```text
QuickChain page remains a readiness dashboard.
No chain logic moves into CrabLink.
No validator logic moves into CrabLink.
No ROX/Solana logic moves into CrabLink.
No external settlement moves into CrabLink.
No gateway-side economic mutation is introduced.
No omnigate direct ledger mutation is introduced.
```

---

### [I-14] Mobile-forward architecture is mandatory

Even if desktop ships first, shared code must not assume:

```text
desktop sidecars always exist
filesystem paths behave the same everywhere
background processes are always allowed
window size is desktop-only
hover/mouse is required
localhost services are always available
```

Platform-specific capabilities must be adapter-owned.

---

### [I-15] Migration must be reversible per batch

Each migration batch should be small enough that:

```text
Chrome checks still pass
React lane checks still pass
Tauri app still launches or fails at a known stub
gateway smoke remains understandable
new adapter boundary is testable
```

Avoid giant one-shot rewrites.

---

## 2. Design Principles (SHOULD)

### [P-1] Extract product core before adding native complexity

Preferred sequence:

```text
1. Identify shared React product code.
2. Extract adapter interfaces.
3. Keep Chrome adapter working.
4. Add Tauri adapter.
5. Mount the React app in Tauri.
6. Preserve gateway routes.
7. Add Rust command bridge.
8. Add native features only behind explicit gates.
```

---

### [P-2] Use packages to clarify boundaries

Recommended repo direction:

```text
crablink/
  apps/
    crablink-tauri/
    chrome-extension/

  packages/
    crablink-core/
    crablink-gateway/
    crablink-storage-adapters/
    crablink-tauri-adapters/
    crablink-chrome-adapters/
    crablink-testing/
```

This can be done gradually. The first batch may simply create `apps/crablink-tauri` and move shared code later.

---

### [P-3] Prefer adapter interfaces over conditional logic everywhere

Avoid this in product code:

```js
if (window.chrome) { ... }
if (window.__TAURI__) { ... }
```

Prefer:

```js
const settings = appAdapters.settings;
const gateway = appAdapters.gateway;
const platform = appAdapters.platform;
```

---

### [P-4] Keep shared components platform-neutral

Shared React components should not know whether they are running in Chrome or Tauri.

Good shared components:

```text
Button
Card
Badge
TruthBoundary
JsonPreview
PageHeader
ActionBar
ManifestPreviewPanel
RouteProblemPanel
RouteTruthPanel
TextInput
TextArea
FilePicker shell component if backed by adapter
ThemeProvider
```

Potentially platform-specific:

```text
native file picker
deep-link handler
window controls
secure storage controls
sidecar diagnostics
local app data browser
```

---

### [P-5] Migration should preserve proof history

Do not remove proof surfaces just because Tauri exists.

Carry forward:

```text
crab://home
crab://library
crab://quickchain
crab://text
receipt history display
local catalog proof
route truth panels
developer JSON panels behind toggles
```

These are valuable migration diagnostics.

---

### [P-6] Build Tauri like a real app, not a dev wrapper

The app should support:

```text
configured remote gateway
configured local gateway
future OAP
future sidecar
future mobile
safe persistence
amnesia mode
release packaging
security reviews
```

It should not assume:

```text
localhost forever
dev bearer token forever
manual scripts forever
debug panels forever
unbounded local cache forever
```

---

### [P-7] Keep Tauri Rust modules narrow

Tauri Rust modules should be small:

```text
commands/
gateway/
platform/
security/
settings/
cache/
deep_link/
sidecar/
oap_client/
vault/
metrics/
```

Avoid one huge `main.rs`.

---

### [P-8] Stage native authority carefully

Native authority should be added in layers:

```text
Layer 1: Tauri shell with React
Layer 2: safe settings
Layer 3: gateway health/resolve commands
Layer 4: deep links
Layer 5: b3-verified cache
Layer 6: OAP proof command
Layer 7: secure vault
Layer 8: sidecar/local node
Layer 9: media path
Layer 10: sandboxed facets
```

---

## 3. Implementation (HOW)

### [C-1] Target migration layout

Recommended end-state layout:

```text
crablink/
  apps/
    crablink-tauri/
      package.json
      vite.config.ts
      index.html
      src/
        main.jsx
        app/
          App.jsx
          appContext.js
          appEvents.js
          appState.js
          router.js
          routeRegistry.js
          settings.js
          shell/
          pages/
        adapters/
          index.ts
          gateway/
          settings/
          platform/
          receipts/
          catalog/
          paid/
          diagnostics/
        styles/

      src-tauri/
        Cargo.toml
        tauri.conf.json
        src/
          main.rs
          app_state.rs
          commands/
            mod.rs
            health.rs
            ready.rs
            resolve.rs
            settings.rs
            diagnostics.rs
          gateway/
            mod.rs
            client.rs
            dto.rs
            errors.rs
          platform/
            mod.rs
            deep_link.rs
            file_dialog.rs
            secure_store.rs
          security/
            mod.rs
            redact.rs
            amnesia.rs
          cache/
            mod.rs
            b3_verify.rs
          oap_client/
            mod.rs
            disabled.rs
          sidecar/
            mod.rs
            disabled.rs
          vault/
            mod.rs
            disabled.rs

    chrome-extension/
      manifest.json
      src/
      docs/
      test/

  packages/
    crablink-core/
      src/
        app/
        shell/
        pages/
        shared/
        routeRegistry/
        utils/
        manifests/
        embeds/
        theme/

    crablink-adapters/
      src/
        contracts/
        memory/
        chrome/
        tauri/

  shared/
    fixtures/
    schemas/
```

A simpler first step is acceptable:

```text
apps/crablink-tauri/
  src/        copied/ported React entry
  src-tauri/  Tauri shell
extensions/chrome/
  unchanged proof client
shared/
  existing shared helpers
```

But the migration should move toward clear package boundaries.

---

### [C-2] Migration classification table

| Source area                                     | Migration action                       | Target                                                          | Notes                                                    |
| ----------------------------------------------- | -------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| `extensions/chrome/src/app/App.jsx`             | Move or copy to shared core            | `packages/crablink-core/src/app/App.jsx`                        | Keep platform-neutral                                    |
| `extensions/chrome/src/app/router.js`           | Move to shared core                    | `packages/crablink-core/src/app/router.js`                      | Must not import Chrome/Tauri APIs                        |
| `extensions/chrome/src/app/routeRegistry.js`    | Move to shared core                    | `packages/crablink-core/src/app/routeRegistry.js`               | Critical shared asset                                    |
| `extensions/chrome/src/app/shell/*`             | Move to shared core                    | `packages/crablink-core/src/app/shell/`                         | Keep UI-only                                             |
| `extensions/chrome/src/pages/*`                 | Move gradually to shared core          | `packages/crablink-core/src/pages/`                             | Preserve route ownership                                 |
| `extensions/chrome/src/shared/components/*`     | Move to shared core                    | `packages/crablink-core/src/shared/components/`                 | Platform-neutral                                         |
| `extensions/chrome/src/shared/embed/*`          | Move to shared core                    | `packages/crablink-core/src/shared/embed/`                      | No arbitrary execution                                   |
| `extensions/chrome/src/shared/manifest/*`       | Move to shared core                    | `packages/crablink-core/src/shared/manifest/`                   | Keep DTO helpers strict                                  |
| `extensions/chrome/src/shared/theme/*`          | Move to shared core                    | `packages/crablink-core/src/shared/theme/`                      | Shared theme                                             |
| `extensions/chrome/src/shared/utils/b3.js`      | Move to shared core                    | `packages/crablink-core/src/shared/utils/b3.js`                 | Canonical                                                |
| `extensions/chrome/src/shared/utils/crabUrl.js` | Move to shared core                    | `packages/crablink-core/src/shared/utils/crabUrl.js`            | Deep link will use same parser                           |
| `extensions/chrome/src/shared/api/*Client.js`   | Split into contracts + gateway adapter | `packages/crablink-adapters/src/contracts/` and gateway adapter | Do not keep Chrome assumptions                           |
| `extensions/chrome/src/storage.js`              | Keep Chrome adapter only               | `packages/crablink-adapters/src/chrome/settingsStore.js`        | Tauri gets separate store                                |
| `extensions/chrome/src/background.js`           | Chrome-only                            | `apps/chrome-extension/src/background.js`                       | Do not port                                              |
| `extensions/chrome/src/content.js`              | Chrome-only                            | `apps/chrome-extension/src/content.js`                          | Do not port                                              |
| `extensions/chrome/src/options*.js/html`        | Chrome-only or settings UI reference   | Chrome app only                                                 | Tauri settings page should use shared UI + Tauri adapter |
| `extensions/chrome/manifest.json`               | Chrome-only                            | Chrome app only                                                 | Do not port                                              |
| `scripts/check-chrome.sh`                       | Keep                                   | scripts                                                         | Chrome proof gate                                        |
| `scripts/check-react-lane.sh`                   | Keep/extend                            | scripts                                                         | Shared React gate                                        |
| `scripts/green-gate-local.sh`                   | Keep/extend                            | scripts                                                         | Should eventually include Tauri checks                   |
| `scripts/smoke-local-gateway.sh`                | Keep/extend                            | scripts                                                         | Tauri gateway smoke can reuse logic                      |

---

### [C-3] Adapter contracts

Create adapter contracts before deep porting.

```ts
export interface CrablinkAdapters {
  gateway: GatewayAdapter;
  settings: SettingsAdapter;
  receipts: ReceiptCacheAdapter;
  catalog: LocalCatalogAdapter;
  platform: PlatformAdapter;
  diagnostics: DiagnosticsAdapter;
  paid: PaidActionAdapter;
}

export interface GatewayAdapter {
  health(): Promise<HealthResult>;
  ready(): Promise<ReadyResult>;
  resolveCrabUrl(input: ResolveCrabUrlInput): Promise<ResolveCrabUrlResult>;
  getAssetPage(input: AssetPageInput): Promise<AssetPageResult>;
  getSite(input: SiteInput): Promise<SiteResult>;
  getIdentityMe(): Promise<IdentityMeResult>;
  getWalletBalance(input: WalletBalanceInput): Promise<WalletBalanceResult>;
}

export interface SettingsAdapter {
  read(): Promise<CrablinkSettings>;
  write(next: CrablinkSettings): Promise<CrablinkSettings>;
  reset(): Promise<CrablinkSettings>;
}

export interface PlatformAdapter {
  kind: "chrome" | "tauri" | "memory";
  supportsDeepLinks(): boolean;
  supportsNativeFilePicker(): boolean;
  supportsSecureStorage(): boolean;
  supportsSidecar(): boolean;
}
```

Rules:

```text
shared React imports contracts
target app injects implementation
tests use memory implementation
```

---

### [C-4] Chrome adapter

Chrome adapter owns:

```text
chrome.storage
extension settings persistence
extension popup/options lifecycle
Chrome local gateway permissions
browser companion behavior
```

Chrome adapter must not:

```text
import Tauri APIs
own wallet truth
store private keys
construct OAP frames
run local services
```

---

### [C-5] Tauri adapter

Tauri adapter owns:

```text
Tauri invoke wrappers
safe settings store calls
deep-link event handling
native file dialog wrapper
future secure storage wrapper
future sidecar status wrapper
future OAP command wrapper
```

Tauri adapter must not:

```text
directly mutate ledger
invent receipts
invent balances
bypass paid confirmations
leak raw command errors into UI
```

---

### [C-6] Memory adapter

Memory adapter exists for tests and storybook-style development.

It may:

```text
return fixtures
simulate gateway ready/unready
simulate paid gate denied
simulate cache stale
simulate route problems
```

It must clearly label fixture data as:

```text
fixture
mock
dev-only
not backend truth
```

---

### [C-7] Tauri Rust command bridge initial set

Initial Rust command set should be small:

```rust
health_check
ready_check
get_app_diagnostics
read_settings
write_settings
resolve_crab_url_gateway
```

Later commands:

```rust
open_deep_link
verify_cached_b3
prepare_paid_action
confirm_paid_action
get_wallet_balance
oap_probe
sidecar_status
vault_status
```

Do not start with every command.

---

### [C-8] Rust command envelope

All Tauri commands return typed envelopes.

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
    Settings,
}
```

---

### [C-9] First scaffold target

Initial Tauri scaffold should be boring:

```text
apps/crablink-tauri/
  src/
    main.jsx
    TauriRoot.jsx
    adapters/
      tauriAdapters.ts
      memoryAdapters.ts
  src-tauri/
    Cargo.toml
    tauri.conf.json
    src/
      main.rs
      commands.rs
      gateway.rs
      errors.rs
```

Initial behavior:

```text
app launches
React shell renders
settings show gateway endpoint
health/ready call works
crab URL input resolves through gateway
asset page renders
site page renders
paid gates still show explicit confirmation
```

---

### [C-10] Import migration pattern

Temporary import pattern:

```js
import App from '../../../extensions/chrome/src/app/App.jsx';
```

Allowed only for first smoke if necessary.

Target import pattern:

```js
import App from '@crablink/core/app/App.jsx';
```

Forbidden long-term:

```js
apps/crablink-tauri importing extensions/chrome internals forever
```

---

### [C-11] CSS migration pattern

Shared CSS moves to core:

```text
base.css
cards.css
developer.css
forms.css
layout.css
modals.css
themeTokens.css
dark.css
light.css
Shell.css if platform-neutral
```

Target-specific CSS stays target-specific:

```text
Chrome popup/options sizing
Tauri window frame adjustments
mobile safe area insets
native titlebar spacing
```

---

### [C-12] File picker migration pattern

Existing file picker UI should become adapter-backed.

Shared UI:

```text
FilePicker component
selected file display
validation warnings
manifest preview
```

Platform adapters:

```text
Chrome:
  browser file input

Tauri:
  browser file input initially
  future native file dialog behind adapter

Memory:
  fixture file metadata
```

Rules:

```text
large media work waits for MEDIA_TAURI_IDB
no full-file large media buffering through Tauri command bridge
```

---

### [C-13] Settings migration pattern

Settings categories:

```text
safe:
  gatewayUrl
  requestTimeoutMs
  defaultRoute
  theme
  developerMode
  requireSpendConfirm
  lastRoute if enabled

sensitive or future-gated:
  bearer token
  capability token
  passport vault state
  wallet permission grants
  local sidecar auth
```

Migration rule:

```text
safe settings may move first
sensitive settings require SECURITY/Vault IDB gates
```

---

### [C-14] Local catalog and receipt migration pattern

Local catalog and recent receipts remain display/cache layers.

They are not truth.

Migration rule:

```text
keep APIs
move storage behind adapter
label cache/stale state
do not unlock paid content from cache alone
```

---

### [C-15] Route parity matrix

Migration must track these route families:

```text
Built-ins:
  crab://home
  crab://library
  crab://quickchain
  crab://text
  crab://image
  crab://site
  crab://profile
  crab://receipts

Typed b3 assets:
  crab://<hash>.image
  crab://<hash>.post
  crab://<hash>.comment
  crab://<hash>.article
  crab://<hash>.video
  crab://<hash>.music

Named:
  crab://<site_name>
  crab://@username

Creator workspaces:
  image
  site
  post
  comment
  article
  video
  music
  podcast
  stream
  code
  game
  algo
  ad
```

Each route should be classified:

```text
ready in Chrome
ready in Tauri
shared component
needs adapter
needs backend
deferred
forbidden until IDB
```

---

## 4. Acceptance Gates (PROOF)

### [G-1] Migration planning gate

```text
[ ] TAURI_MIGRATION_IDB.MD exists.
[ ] CRABLINK_TAURI_IDB.MD exists.
[ ] Security notes for CrabLink Tauri exist.
[ ] Migration source files are identified.
[ ] Chrome-only APIs are listed.
[ ] Tauri-only APIs are listed.
[ ] Shared core candidates are listed.
[ ] First Tauri scaffold target is defined.
```

---

### [G-2] Shared core extraction gate

```text
[ ] Shared route registry has no Chrome imports.
[ ] Shared App shell has no Chrome imports.
[ ] Shared components have no Chrome imports.
[ ] Shared b3/crab URL utilities have no Chrome imports.
[ ] Shared manifest helpers have no Chrome imports.
[ ] Shared embed registry has no Chrome imports.
[ ] Chrome app uses shared core successfully.
[ ] Tauri app can import shared core.
```

---

### [G-3] Adapter gate

```text
[ ] Adapter contracts exist.
[ ] Chrome adapter implements settings.
[ ] Tauri adapter implements settings or truthful stub.
[ ] Memory adapter exists for tests.
[ ] Gateway adapter exists.
[ ] Receipt cache adapter exists or truthful stub.
[ ] Local catalog adapter exists or truthful stub.
[ ] Platform adapter exposes feature support.
[ ] No shared product code imports chrome.* directly.
[ ] No shared product code imports @tauri-apps/api directly.
```

---

### [G-4] Tauri scaffold gate

```text
[ ] apps/crablink-tauri exists.
[ ] src-tauri exists.
[ ] Tauri app launches desktop dev window.
[ ] React root renders.
[ ] Theme loads.
[ ] Address bar renders.
[ ] Route registry loads.
[ ] Gateway endpoint can be configured.
[ ] App diagnostics show Tauri mode.
[ ] OAP shown as disabled or unavailable truthfully.
[ ] Sidecar shown as disabled or unavailable truthfully.
[ ] Vault shown as disabled or unavailable truthfully.
```

---

### [G-5] Gateway parity gate

```text
[ ] GET /healthz works through Tauri app path.
[ ] GET /readyz works through Tauri app path.
[ ] crab://home works.
[ ] crab://library works.
[ ] crab://image works.
[ ] crab://site works.
[ ] crab://text works.
[ ] crab://quickchain works as readiness/display only.
[ ] crab://<hash>.image resolves through gateway.
[ ] crab://<site_name> resolves through gateway.
[ ] Route errors are displayed with TruthBoundary or RouteProblemPanel.
```

---

### [G-6] Paid gate parity gate

```text
[ ] Paid image flow UI still requires explicit confirmation.
[ ] Paid site/site_visit flow UI still requires explicit confirmation.
[ ] Paid article view UI still requires explicit confirmation if route exists.
[ ] Paid post view UI still requires explicit confirmation if route exists.
[ ] Paid comment view UI still requires explicit confirmation if route exists.
[ ] No paid route unlocks from local cache alone.
[ ] Recent receipt display remains display cache only.
[ ] Balance refresh remains backend-derived.
```

---

### [G-7] Chrome proof client preservation gate

```text
[ ] scripts/check-chrome.sh passes.
[ ] scripts/check-react-lane.sh passes.
[ ] Chrome extension still loads.
[ ] Chrome extension can still hit configured gateway.
[ ] Chrome route proof still works.
[ ] Chrome code does not import Tauri APIs.
[ ] Chrome docs explain proof/companion status.
```

---

### [G-8] Tauri command bridge gate

```text
[ ] health_check command exists.
[ ] ready_check command exists.
[ ] get_app_diagnostics command exists.
[ ] read_settings command exists.
[ ] write_settings command exists.
[ ] Commands return typed envelopes.
[ ] Command errors are redacted.
[ ] React calls commands through adapter.
[ ] No secrets cross into React.
```

---

### [G-9] Deep-link readiness gate

```text
[ ] CRAB_URL_AND_DEEP_LINK_IDB.MD exists before production deep-link behavior.
[ ] Deep-link parser uses shared crab URL utility.
[ ] Malformed URLs reject.
[ ] Unsafe schemes reject.
[ ] Paid gates still apply after deep link.
[ ] Deep links do not trigger local file reads.
[ ] Deep links do not trigger spend directly.
```

---

### [G-10] No backend lock-in gate

```text
[ ] App can point to configurable gateway.
[ ] Localhost is only one possible endpoint.
[ ] Local Dev Stack Mode is labeled dev.
[ ] Sidecar mode is disabled unless explicitly enabled.
[ ] Normal app use does not require local wallet/ledger/storage/index.
[ ] App diagnostics show active run mode.
```

---

### [G-11] Mobile-forward gate

```text
[ ] Shared core avoids desktop-only APIs.
[ ] Platform adapter reports feature support.
[ ] Sidecar is optional and desktop-first.
[ ] File APIs are adapter-owned.
[ ] Secure storage is adapter-owned.
[ ] UI remains responsive/touch-friendly.
[ ] Tauri mobile limitations are documented before mobile work.
```

---

### [G-12] Migration release gate

```text
[ ] Chrome proof client passes.
[ ] Tauri desktop app launches.
[ ] Shared React route parity documented.
[ ] Gateway parity smoke passes.
[ ] Paid gate parity smoke passes.
[ ] Tauri command bridge basic tests pass.
[ ] Security checklist passes.
[ ] Anti-scope review passes.
[ ] Known gaps are documented.
```

---

## 5. Anti-Scope (Forbidden)

The following are forbidden during the migration:

```text
- Rewriting the entire React app from scratch without proof that reuse is impossible.
- Deleting the Chrome extension before Tauri is green.
- Making localhost the only supported backend mode.
- Making normal users run local wallet/ledger/storage/index.
- Moving wallet truth into React.
- Moving ledger truth into React.
- Moving storage truth into React.
- Moving index truth into React.
- Adding direct ledger mutation from CrabLink.
- Adding direct wallet mutation outside backend wallet path.
- Adding OAP frame construction in React.
- Adding sidecar auto-start without explicit design/gates.
- Adding local vault/private-key custody before vault IDB.
- Storing seed phrases in React/TypeScript/local settings.
- Storing spend authority in localStorage or browser-like storage.
- Unlocking paid content from cache alone.
- Faking receipts.
- Faking balances.
- Faking b3 content IDs.
- Executing arbitrary code from crab assets.
- Adding QuickChain/ROX/Solana/bridge logic to CrabLink.
- Treating local catalog as backend truth.
- Treating recent receipts display cache as backend truth.
- Importing chrome.* from shared product core.
- Importing Tauri APIs from shared product core.
- Letting Tauri Rust become a hidden monolith service.
- Introducing unbounded media buffering through Tauri commands.
```

---

## 6. References

Primary references:

```text
CRABLINK_TAURI_IDB.MD
SECURITY_NOTES_CRABLINK_TAURI.MD
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

Migration source facts:

```text
Chrome extension proved:
  crab:// routing
  React route-owned pages
  gateway-only discipline
  b3 typed asset pages
  paid image upload
  paid site/site-render proof
  paid article/post/comment/image view
  receipt-driven unlocks
  CrabLink address-bar UX
  truth-boundary UX
  local creator workspaces
  facet/code/game safety modeling

Tauri is needed for:
  Rust commands
  OAP/1 client integration
  local service/node orchestration
  wallet/passport/vault integration
  large media paths
  native crab:// deep links
  desktop/mobile packaging
  secure local persistence
  offline assets
  memory-first runtime
  future sidecar/local node
```

---

## 7. Reviewer Checklist

Before approving migration work:

```text
[ ] Does this reuse existing React where practical?
[ ] Does this avoid hard-locking to localhost?
[ ] Does this preserve gateway compatibility?
[ ] Does this keep Chrome proof client green?
[ ] Does this keep Chrome APIs behind Chrome adapters?
[ ] Does this keep Tauri APIs behind Tauri adapters?
[ ] Does shared code avoid platform APIs?
[ ] Does React avoid secrets and wallet truth?
[ ] Does Rust command code stay narrow?
[ ] Does paid UX still require explicit confirmation?
[ ] Does route behavior remain source-labeled?
[ ] Does this avoid QuickChain/ROX/Solana scope?
[ ] Does this avoid arbitrary execution?
[ ] Does this preserve b3 canonical rules?
[ ] Does this preserve passport/wallet separation?
[ ] Does this leave sidecar/vault/OAP disabled unless gated?
[ ] Does this keep mobile-forward architecture possible?
```

---

## 8. Migration Batch Plan

### Batch M0 — Blueprint lock

```text
Goal:
  lock migration doctrine before code movement

Outputs:
  TAURI_MIGRATION_IDB.MD
  RUN_STACK_AND_MODES_IDB.MD next
  TAURI_COMMAND_BRIDGE_IDB.MD next

Gate:
  docs reviewed
```

---

### Batch M1 — Tauri scaffold

```text
Goal:
  create minimal apps/crablink-tauri

Outputs:
  package scaffold
  src-tauri scaffold
  React root mount
  app diagnostics stub

Gate:
  Tauri dev window opens
```

---

### Batch M2 — Shared core extraction

```text
Goal:
  extract platform-neutral React core

Outputs:
  shared App/router/routeRegistry
  shared shell/components/theme/utils
  Chrome imports updated
  Tauri imports shared core

Gate:
  Chrome still passes
  Tauri still launches
```

---

### Batch M3 — Adapter contracts

```text
Goal:
  remove platform assumptions

Outputs:
  adapter interfaces
  Chrome adapter
  Tauri adapter stubs
  memory adapter

Gate:
  no chrome.* in shared core
  no Tauri APIs in shared core
```

---

### Batch M4 — Gateway parity

```text
Goal:
  Tauri can use proven gateway flow

Outputs:
  gateway adapter
  health/ready
  crab resolve
  asset/site render

Gate:
  route parity smoke passes
```

---

### Batch M5 — Paid gate parity

```text
Goal:
  preserve no-silent-spend paid UX

Outputs:
  paid gate adapter
  receipt display cache adapter
  wallet balance display adapter

Gate:
  paid view gates behave as Chrome proof did
```

---

### Batch M6 — Command bridge

```text
Goal:
  start moving privileged calls into Rust

Outputs:
  health_check
  ready_check
  diagnostics
  typed envelopes
  redaction

Gate:
  React calls commands through Tauri adapter
```

---

### Batch M7 — Deep-link prep

```text
Goal:
  prepare native crab:// routing

Outputs:
  CRAB_URL_AND_DEEP_LINK_IDB.MD
  parser tests
  Tauri deep-link stub

Gate:
  malformed links reject
```

---

### Batch M8 — Storage/settings cleanup

```text
Goal:
  make local state professional

Outputs:
  STORAGE_AND_SETTINGS_IDB.MD
  safe preferences
  display cache boundaries
  amnesia switch/stub

Gate:
  no sensitive storage regression
```

---

### Batch M9 — Future native layers

```text
Goal:
  prepare serious native capabilities only after gates

Outputs:
  OAP_CLIENT_IDB.MD
  PASSPORT_WALLET_VAULT_IDB.MD
  SIDECAR_LOCAL_NODE_IDB.MD
  OFFLINE_CACHE_IDB.MD
  MEDIA_TAURI_IDB.MD
  FACET_SANDBOX_IDB.MD

Gate:
  no native layer implemented before its IDB
```

---

## 9. Plain-English Summary

This migration should feel like:

```text
We are moving CrabLink into a professional native shell.
We are not throwing away the Chrome work.
We are not turning the app into the backend.
We are not forcing everyone to run localhost services.
We are preserving gateway compatibility first.
We are adding native Rust power carefully, behind adapters and gates.
```

The correct first app shape is:

```text
CrabLink Tauri
→ shared React product core
→ target-specific adapter layer
→ Tauri Rust command bridge
→ configured gateway first
→ future OAP/sidecar/vault/media only when gated
```

The migration succeeds when:

```text
the Tauri app feels like the real future CrabLink,
the Chrome extension remains a useful proof client,
and RustyOnions invariants are stronger, not weaker.
```

```
```
