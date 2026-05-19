
````markdown
---
title: FACET_SANDBOX_IDB
version: 0.1.0
status: draft
last-updated: 2026-05-17
audience: contributors, app engineers, RustyOnions service owners, sandbox engineers, policy reviewers, security reviewers, ops, auditors
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
  - TESTING_MATRIX_TAURI_IDB.MD
related-rusty-onions-docs:
  - INTEROP_BLUEPRINT.MD
  - APP_INTEGRATION_BLUEPRINT.MD
  - DEVELOPER_SUITE_BLUEPRINT.MD
  - FULL_PROJECT_BLUEPRINT.MD
  - HARDENING_BLUEPRINT.MD
  - CONCURRENCY_AND_ALIASING_BLUEPRINT.MD
  - WEB3.MD
  - WEB3_2.MD
  - NEXT_LEVEL.MD
  - QUICKCHAIN.MD
  - CODEBUNDLE_RS.md
  - ALLNOTES.MD
  - ALL_DOCS_COMBINED.MD
supersedes:
  - informal “future code/game/algo pages may run things” assumptions
  - browser-extension-only sandbox placeholder assumptions
does-not-delete:
  - existing code/game/algo/ad React draft pages
  - safe embed registry
  - site render sandbox concepts
  - gateway-first route behavior
  - local-only manifest draft pages
---

# FACET_SANDBOX_IDB

RO:WHAT — Defines CrabLink Tauri’s rules for future executable or semi-executable facets: code, games, algorithms, apps, ad creatives, interactive widgets, simulations, moderation/ranking/search modules, and other sandboxed runtime assets.

RO:WHY — RustyOnions is building a programmable next-internet surface, but CrabLink must not let `crab://` links become arbitrary code execution, wallet access, filesystem access, internal-service access, surveillance, or unbounded compute. Facets must be declarative, capability-gated, policy-reviewed, resource-bounded, sandboxed, and inert until explicitly launched through a safe backend/sandbox path.

RO:INTERACTS — CrabLink React app, TypeScript adapters, Tauri command bridge, Tauri Rust sandbox launcher adapter, safe embed registry, site renderer, offline cache, OAP client, sidecar/local node supervisor, gateway client, svc-gateway, omnigate, svc-sandbox, svc-mod, ron-policy, ron-auth, svc-passport, ron-kms, svc-wallet, ron-ledger, svc-storage, svc-index, svc-mailbox, svc-edge, ron-accounting, svc-rewarder, ron-proto, ron-app-sdk.

RO:INVARIANTS — No arbitrary execution by default. A `.code`, `.game`, `.algo`, `.app`, `.ad`, or future facet asset is inert unless a valid facet manifest, `facet.toml`, policy allowlist, capability set, runtime contract, sandbox profile, and resource limits all exist. CrabLink is renderer/launcher, not unsafe executor. `svc-sandbox` is the cage. `svc-mod` owns server-side/mod execution jobs. `ron-policy` is the judge. Wallet, ledger, storage, index, profile, network, and local filesystem access are deny-by-default.

RO:METRICS — Facet render outcomes, launch denials, manifest validation failures, policy denials, capability denials, runtime unsupported counts, resource-limit denials, sandbox start/stop outcomes, crash/timeout counts, network/storage/wallet permission denials, redaction events, and safe placeholder render counts.

RO:CONFIG — Facets enabled flag, execution enabled flag, allowed facet kinds, allowed runtimes, sandbox backend, resource limits, network policy, wallet policy, storage policy, profile policy, local file policy, offline policy, OAP/sidecar policy, developer diagnostics, mobile disablement, and amnesia mode.

RO:SECURITY — Facet execution is disabled by default. Deep links cannot launch executable facets. React never evaluates facet code. TypeScript never runs untrusted code. Tauri Rust never executes shell commands or arbitrary native binaries from facets. Local files are inaccessible unless explicitly user-selected and policy-approved. Wallet access is never direct. Paid actions still require explicit confirmation. Capabilities fail closed. No secret, vault, token, main→alt, wallet, ledger, or local path leakage.

RO:TEST — Facet manifest tests, `facet.toml` parser tests, deny-by-default tests, no-eval tests, no-shell tests, no-wallet-access tests, no-storage-access tests, no-network-access tests, resource-limit tests, policy allowlist tests, capability failure tests, sandbox lifecycle tests, placeholder render tests, deep-link denial tests, mobile disabled tests, and security regression tests.

---

## 0. Status

This IDB defines the future facet sandbox model for CrabLink Tauri.

It is not a request to enable executable code immediately.

It is not a request to run games, algorithms, apps, scripts, plugins, or arbitrary WASM in the first Tauri build.

It is not a request to turn CrabLink into a general-purpose native runtime.

Current safe state:

```text
crab://code  = local manifest/draft page only
crab://game  = local manifest/draft page only
crab://algo  = local manifest/draft page only
crab://ad    = local manifest/draft page only
```

Current forbidden state:

```text
download code and execute it
download WASM and instantiate it
eval JavaScript from b3 content
run a native binary from a manifest
launch game runtime from page content
run ranking/mod/search algorithms locally
give a facet wallet access
give a facet filesystem access
give a facet internal service access
```

The current doctrine:

```text
b3hash.code is the address.
facet.toml is the contract.
svc-sandbox is the cage.
ron-policy is the judge.
CrabLink is the renderer/launcher, not the unsafe executor.
```

---

## 1. Plain-language rule

A facet is allowed to describe behavior before it is allowed to execute behavior.

Correct mental model:

```text
crab://<hash>.code = addressable code asset
manifest = what the asset claims to be
facet.toml = explicit execution contract
ron-policy = allow/deny decision
svc-sandbox = execution cage
svc-mod = server-side/mod job owner where applicable
CrabLink = UI renderer, launcher, status viewer, and prompt surface
```

Wrong mental model:

```text
crab://<hash>.code means run code
crab://<hash>.game means launch game
crab://<hash>.algo means rank my feed
a manifest permission means permission is granted
a paid receipt means the code can touch the wallet
a local cache entry means the facet is trusted
a sidecar means arbitrary code can run locally
```

---

## 2. Why this IDB exists

RustyOnions needs future programmable surfaces:

```text
games
apps
code primitives
open algorithms
feed ranking
search ranking
moderation helpers
curation tools
ad creatives
interactive articles
educational simulations
creator tools
developer tools
```

But programmable surfaces are the highest-risk category.

Without this IDB, future `crab://code`, `crab://game`, or `crab://algo` could accidentally become:

```text
remote code execution
wallet theft
ledger mutation bypass
local file theft
profile/alt privacy leak
capability token leak
local node abuse
DHT/overlay spam
unbounded compute
tracking pixel system
malware delivery
policy bypass
sandbox escape
```

This IDB prevents that.

---

## 3. Goals

### 3.1 Product goals

CrabLink Tauri should eventually support:

```text
safe code asset pages
safe game manifest pages
safe algorithm transparency pages
safe app/facet manifest pages
safe ad creative previews
safe interactive widgets
facet contract display
permission review UI
resource-limit display
paid access/purchase gates
sandbox launch prompts
sandbox status display
developer diagnostics
```

### 3.2 Engineering goals

The implementation should provide:

```text
strict facet manifest model
strict facet.toml parser
policy allowlist integration
capability checks
resource limit model
sandbox lifecycle model
safe launch command boundary
source labels
runtime allowlist
network/storage/wallet/profile permission model
audit/receipt hooks
deny-by-default behavior
```

### 3.3 Security goals

The design must prevent:

```text
automatic execution from crab links
automatic execution from site embeds
eval in React/WebView
untrusted WASM instantiation in shell
native binary execution
shell command execution
wallet access from facets
ledger mutation from facets
raw storage/index access from facets
private profile/vault access from facets
network exfiltration by default
local filesystem access by default
unbounded CPU/memory/time/output
secret leakage in logs/metrics/debug panels
```

---

## 4. Non-goals

This IDB does not implement:

```text
production plugin marketplace
general app store
full game runtime
full WASM runtime
full JS sandbox runtime
full native sandbox runtime
full ad delivery network
full algorithm marketplace
QuickChain
ROX
Solana
external settlement
staking
liquidity
exchange-facing app payments
OS-level antivirus
perfect anti-cheat
perfect DRM
perfect sandbox escape prevention claims
```

Future dedicated blueprints may be required for those.

---

## 5. Definitions

### 5.1 Facet

A facet is a declared capability-bearing app/module/asset surface that may become executable or interactive only after policy, capability, runtime, and sandbox gates pass.

Facet examples:

```text
code primitive
game
algorithm
app
ad creative
interactive widget
feed ranking module
search ranking module
moderation helper
media processor
developer tool
```

### 5.2 Code asset

A code asset is b3-addressed code bytes or source/archive bytes.

A code asset is inert by default.

A code asset may be displayed, inspected, and referenced.

It must not execute directly from the asset page.

### 5.3 Game asset

A game asset is a manifest describing a game, runtime, bundles, assets, save policy, network policy, access policy, and economic policy.

A game asset is inert by default.

### 5.4 Algorithm asset

An algorithm asset is a transparent module or contract describing ranking, recommendation, search, moderation, curation, or discovery behavior.

An algorithm asset is inert by default unless sandboxed execution is explicitly allowed.

### 5.5 App facet

An app facet is a higher-level application manifest that may combine UI, data, actions, routes, and sandboxed behavior.

App facets are future scope and must be deny-by-default.

### 5.6 Ad creative facet

An ad creative facet is a campaign/creative/rendering asset.

Ad creative facets must be clearly labeled, privacy-preserving, policy-reviewed, and must not include third-party tracking by default.

### 5.7 Facet manifest

A facet manifest is a JSON/TOML/strict DTO document that describes the facet asset.

It may include:

```text
kind
title
creator
asset refs
runtime
permissions requested
resource limits requested
access policy
economics policy
review status
facet.toml ref
```

A manifest is a claim, not permission.

### 5.8 `facet.toml`

`facet.toml` is the execution contract.

It declares:

```text
runtime
entrypoint
declared actions
declared routes
permissions requested
resource limits
network policy
storage policy
wallet policy
profile policy
sandbox profile
capabilities required
review requirements
```

A `facet.toml` is required before execution.

### 5.9 Sandbox

A sandbox is an isolated runtime environment with explicit limits and deny-by-default external access.

For RustyOnions, the intended service owner is:

```text
svc-sandbox
```

### 5.10 Module/job execution

Server-side or heavy module execution belongs in:

```text
svc-mod
→ svc-sandbox
```

CrabLink Tauri should not become the module execution service.

### 5.11 Policy allowlist

A policy allowlist is a `ron-policy` controlled decision that says a facet kind/runtime/action/permission combination is allowed.

No allowlist means deny.

### 5.12 Capability

A capability is a scoped backend-verifiable authorization.

Capabilities are not normal settings.

Capabilities must not be exposed to React.

### 5.13 Runtime

A runtime is the execution environment.

Possible future runtime categories:

```text
wasm
js_isolate
lua
python_sandbox
native_denied
server_mod_job
declarative_only
```

Actual runtimes must be explicitly reviewed before enabling.

### 5.14 Declarative-only facet

A declarative-only facet can render UI/metadata but cannot execute code.

This is the default first implementation state.

### 5.15 Launch

A launch is an explicit user action requesting sandboxed execution of a facet.

A launch is not allowed from:

```text
page load
deep link alone
embed render
autoplay
hover
scroll
background sync
```

### 5.16 Permission

A permission is a declared request for access.

Examples:

```text
network
storage
wallet
profile
local_file
clipboard
camera
microphone
notifications
sidecar
oap
gateway
mailbox
save_data
```

A requested permission is not a granted permission.

### 5.17 Resource limit

Resource limits bound facet execution.

Examples:

```text
cpu_ms
wall_time_ms
memory_bytes
output_bytes
input_bytes
network_requests
storage_bytes
save_bytes
log_bytes
```

### 5.18 Safe placeholder

A safe placeholder is a non-executable UI view that explains what a facet would do without running it.

Safe placeholders are the default before execution gates exist.

---

## 6. Non-negotiable invariants

### [I-1] No arbitrary execution by default

Default behavior:

```text
render safe manifest page
show facet contract
show permissions requested
show unavailable/disabled launch state
do not execute
```

Forbidden default behavior:

```text
fetch and eval
fetch and run WASM
launch game runtime
execute algo
run native binary
run shell
open local files
call wallet
call storage/index directly
```

---

### [I-2] `.code` is not executable by itself

A code URL:

```text
crab://<hash>.code
```

means:

```text
addressable code asset
```

It does not mean:

```text
run code now
```

Execution requires:

```text
verified code bytes
facet manifest
facet.toml
runtime allowlist
policy allowlist
capabilities
resource limits
sandbox profile
user launch confirmation
```

---

### [I-3] `.game` is not playable by itself

A game URL:

```text
crab://<hash>.game
```

means:

```text
addressable game manifest or game asset
```

It does not mean:

```text
launch game now
```

Game launch requires:

```text
manifest validation
asset bundle validation
runtime selection
sandbox profile
save policy
network policy
wallet policy
paid access gate when required
user launch confirmation
```

---

### [I-4] `.algo` is not silently active

An algorithm URL:

```text
crab://<hash>.algo
```

means:

```text
addressable algorithm manifest
```

It does not mean:

```text
this algorithm now ranks feeds/search/moderation
```

Algorithm activation requires:

```text
policy approval
scope declaration
explainability/inspection surface
sandbox if executable
audit/review status
explicit user/site/admin selection where applicable
```

---

### [I-5] Manifests are claims, not authority

Facet manifests can request permissions.

They do not grant permissions.

`ron-policy` and capabilities decide.

---

### [I-6] `facet.toml` is required for execution

No execution without a valid `facet.toml`.

Minimum required `facet.toml` fields:

```text
schema
facet_kind
runtime
entrypoint
permissions
limits
declared_actions
declared_routes
network
storage
wallet
profile
review
```

---

### [I-7] Policy allowlist is required

No allowlist means deny.

Policy must approve:

```text
facet kind
runtime
entrypoint class
permission set
resource limits
network policy
storage policy
wallet policy
profile policy
source
publisher/review status where applicable
```

---

### [I-8] Capabilities fail closed

Missing or invalid capability means deny.

Failure cases:

```text
vault locked
capability missing
capability expired
capability scope mismatch
passport mismatch
wallet link mismatch
policy denied
backend unavailable
```

No fallback may silently grant authority.

---

### [I-9] React never executes untrusted code

Forbidden:

```text
eval()
new Function()
script injection
dynamic script from facet
WASM instantiate in React shell
iframe without sandbox policy
unsafe HTML with scripts
```

React may render:

```text
safe placeholder
manifest display
permission display
policy status
launch button when safe
sandbox status
```

---

### [I-10] TypeScript never becomes runtime authority

TypeScript may:

```text
normalize safe DTOs
call typed Tauri commands
render permission labels
render warnings
```

TypeScript must not:

```text
execute facet code
instantiate WASM
own capability bytes
hold raw sandbox handles
directly call internal services
grant permissions
```

---

### [I-11] Tauri Rust does not run shell or arbitrary binaries

Tauri Rust must not execute facet-provided shell commands or native binaries.

Forbidden:

```text
sh -c from manifest
cmd.exe from manifest
exec arbitrary path
download binary and run
run path from crab URL
run path from untrusted cache
```

Native execution is anti-scope until a dedicated audited native sandbox design exists.

---

### [I-12] `svc-sandbox` is the cage

The intended execution boundary for untrusted facets is:

```text
svc-sandbox
```

CrabLink may request/launch through a backend/sandbox route when contracts exist.

CrabLink must not become the sandbox runtime.

---

### [I-13] `svc-mod` owns server-side module jobs

Server-side/transcode/ranking/mod jobs should flow through:

```text
svc-mod
→ svc-sandbox
```

CrabLink may display job status.

CrabLink must not run production mod jobs locally by default.

---

### [I-14] Wallet access is deny-by-default

A facet must not access wallet state directly.

Forbidden:

```text
facet reads wallet balance directly
facet requests hold/capture/release directly
facet creates transfer
facet receives spend capability
facet signs wallet transaction
facet auto-pays
```

Allowed future safe pattern:

```text
facet requests an action
CrabLink shell shows explicit paid-action confirmation
backend wallet route handles value movement
backend receipt returns
facet receives only safe result allowed by policy
```

---

### [I-15] Ledger access is forbidden

No facet may access or mutate `ron-ledger` directly.

Ledger truth remains backend-owned.

---

### [I-16] Storage access is deny-by-default

A facet must not directly write `svc-storage`.

Allowed future patterns:

```text
read declared b3 assets by gateway/OAP when policy allows
write through product/upload route with explicit user action
save sandbox-local data within quota
```

Forbidden:

```text
raw storage write
raw index pointer write
unbounded file cache
hidden upload
```

---

### [I-17] Index access is deny-by-default

A facet must not directly write `svc-index`.

Any public pointer/name/index update must go through backend product route contracts.

---

### [I-18] Network access is deny-by-default

Default network policy:

```text
none
```

Future network access must specify:

```text
allowed route classes
allowed gateway/OAP endpoints
allowed domains if any
method restrictions
request count
byte limits
timeout
purpose
```

Forbidden by default:

```text
arbitrary internet access
tracking beacons
third-party analytics
wallet endpoints
local network scans
localhost probes
sidecar admin access
```

---

### [I-19] Local filesystem access is deny-by-default

Facets cannot read or write arbitrary local files.

Possible future safe patterns:

```text
user-selected file handle
sandbox-local save data
bounded import/export with prompt
```

Forbidden:

```text
read home directory
read app data directory
read vault/cache directories
read arbitrary path from manifest
write arbitrary path
```

---

### [I-20] Profile/passport access is deny-by-default

Facets must not read:

```text
private passport data
main→alt linkage
vault state
capability tokens
wallet links
private profile drafts
```

Possible safe future:

```text
public display name
public profile handle
explicitly shared profile fields
```

Only with policy and user consent.

---

### [I-21] Clipboard/camera/microphone/notifications are deny-by-default

High-risk device APIs require separate explicit prompts and platform permission review.

Default:

```text
clipboard: none
camera: none
microphone: none
notifications: none
```

---

### [I-22] Save data is sandboxed

Game/app save data must be:

```text
bounded
facet-scoped
passport-scoped when needed
not public by default
not wallet truth
not index truth
clearable
amnesia-aware
```

---

### [I-23] Resource limits are mandatory

No resource limits means deny.

Minimum limits:

```text
cpu_ms
wall_time_ms
memory_bytes
input_bytes
output_bytes
log_bytes
network_requests
storage_bytes
```

---

### [I-24] Timeouts are mandatory

Every launch/job/run must have timeout.

Long-running services/games require a separate session model.

---

### [I-25] Logs are bounded and redacted

Facet logs must not leak:

```text
capabilities
Authorization
private keys
seed material
wallet secrets
private profile data
main→alt linkage
local paths
raw request bodies containing secrets
```

---

### [I-26] Deep links cannot launch facets

A `crab://` deep link may open a facet page.

It must not launch execution.

Launch requires in-app explicit action after validation.

---

### [I-27] Offline cache cannot grant execution trust

A cached facet is not executable solely because it is cached.

Offline cache may store verified bytes.

Execution still requires policy/capability/runtime/sandbox gates.

---

### [I-28] Sidecar does not grant facet authority

Running a sidecar does not make facets executable.

Sidecar access must be explicit, policy-approved, and route-scoped.

---

### [I-29] Paid access does not grant runtime permissions

Paying to access a facet does not mean the facet can access wallet, network, storage, profile, or filesystem.

Payment and permissions are separate.

---

### [I-30] Mobile defaults are stricter

Mobile must default to:

```text
execution disabled
gateway-first
no sidecar assumption
no local runtime assumption
small quotas
no background execution
```

---

## 7. Facet classes

### 7.1 Code facet

Represents source or executable code asset.

MVP:

```text
manifest display
source metadata
runtime request
facet.toml preview
permission display
no execution
```

Future execution requires sandbox route.

### 7.2 Game facet

Represents game manifest, bundles, runtime policy, save policy, session policy, economy policy, and asset bundle references.

MVP:

```text
manifest/draft display
asset references
save policy preview
permission display
no play/launch
```

Future launch requires sandbox route and explicit user action.

### 7.3 Algorithm facet

Represents ranking, search, recommendation, moderation, curation, or discovery behavior.

MVP:

```text
transparency page
source/manifest display
explainability summary
policy status
no activation
```

Future activation requires policy/admin/user selection.

### 7.4 App facet

Represents a broader application manifest.

MVP:

```text
safe manifest display
route/action list
permissions requested
no execution
```

Future requires app/facet runtime design.

### 7.5 Ad creative facet

Represents ad campaign creative.

MVP:

```text
safe preview
campaign policy display
budget/payout placeholder
clear sponsored label
no tracking
no third-party execution
```

Future requires `svc-ads` route contracts and policy review.

### 7.6 Media processor facet

Represents future transcode/filter/enhancement tool.

MVP:

```text
manifest display only
```

Future production processing belongs in:

```text
svc-mod
→ svc-sandbox
```

### 7.7 Site widget facet

Represents interactive site widget.

Default:

```text
declarative placeholder only
```

Execution requires sandbox.

---

## 8. Trust zones

### 8.1 Trusted shell

Trusted shell includes:

```text
topbar
address bar
settings
passport drawer
wallet prompts
paid confirmations
receipt panels
system dialogs
sandbox launch prompts
```

Untrusted content cannot access shell internals.

### 8.2 Trusted route UI

Trusted route UI includes CrabLink-owned React pages:

```text
code page
game page
algo page
ad page
asset page
site page shell
manifest preview
permission review UI
```

Trusted route UI must not execute untrusted facet code.

### 8.3 Untrusted content

Untrusted content includes:

```text
site HTML
user-uploaded media
posts/comments/articles
code bytes
game bundles
algorithm code
ad creatives
third-party assets
```

### 8.4 Sandbox runtime

Sandbox runtime is separate from trusted shell.

It may execute a facet only after every gate passes.

### 8.5 Backend services

Backend services remain authority owners.

CrabLink cannot impersonate them.

---

## 9. Safe placeholder model

### 9.1 Placeholder purpose

Safe placeholders allow the UI to represent future executable assets without executing them.

### 9.2 Placeholder must show

```text
facet kind
title
creator
b3 ID
manifest status
facet.toml status
runtime requested
permissions requested
resource limits
policy status
launch disabled reason
```

### 9.3 Placeholder copy

Recommended copy:

```text
This facet is not executable in this CrabLink build. Execution requires a valid facet contract, policy approval, capabilities, resource limits, and a sandbox route.
```

### 9.4 Placeholder forbidden behavior

```text
no eval
no WASM instantiate
no script tag
no game runtime
no algorithm activation
no network calls by facet
no wallet calls by facet
```

---

## 10. Facet manifest model

### 10.1 Minimum manifest fields

Suggested minimum:

```text
schema
facet_kind
title
description
creator
maintainer
version
asset_cid
facet_toml_cid
runtime_requested
entrypoint
permissions_requested
limits_requested
review_status
policy_status
linked_assets
rights_policy
access_policy
economics_policy
receipts
truth_boundary
```

### 10.2 Manifest truth boundary

A manifest must include or imply:

```text
This manifest is a claim by its publisher. Permissions are not granted until policy/capability/sandbox gates pass.
```

### 10.3 Manifest invalid states

Invalid for execution:

```text
missing schema
unknown facet kind
missing facet.toml
invalid b3 refs
unknown runtime
missing limits
permissions ambiguous
policy unavailable
capability missing
```

### 10.4 Manifest display

Manifest display may show requested permissions but must distinguish:

```text
requested
policy-approved
user-approved
active
denied
```

---

## 11. `facet.toml` contract

### 11.1 Purpose

`facet.toml` is the contract that turns an inert code/game/algo asset into a reviewable sandbox candidate.

### 11.2 Required fields

Suggested initial schema:

```toml
schema = "ron.facet.toml.v1"
facet_kind = "code"
name = "example"
version = "0.1.0"
runtime = "declarative_only"
entrypoint = ""

[review]
required = true
status = "unreviewed"

[permissions]
network = "none"
wallet = "none"
storage = "none"
index = "none"
profile = "none"
local_files = "none"
clipboard = "none"
camera = "none"
microphone = "none"
notifications = "none"

[limits]
cpu_ms = 0
wall_time_ms = 0
memory_bytes = 0
input_bytes = 0
output_bytes = 0
log_bytes = 0
network_requests = 0
storage_bytes = 0

[actions]
allowed = []
denied = ["wallet.transfer", "wallet.hold", "ledger.write", "storage.raw_write", "index.raw_write"]

[routes]
allowed = []
```

For execution-capable contracts, nonzero limits and explicit runtime/sandbox policy are required.

### 11.3 Permission values

Recommended permission values:

```text
none
read_public
read_scoped
write_sandbox_local
request_user_prompt
backend_action_only
denied
```

### 11.4 Wallet permission default

```toml
wallet = "none"
```

No direct wallet permission should exist in early runtime.

Future wallet-related action must go through paid-action confirmation and backend route.

### 11.5 Storage permission default

```toml
storage = "none"
```

Future storage write must go through product route.

### 11.6 Network permission default

```toml
network = "none"
```

No arbitrary internet.

### 11.7 Local files default

```toml
local_files = "none"
```

User file selection requires explicit prompt and safe handle.

---

## 12. Runtime model

### 12.1 Default runtime

Default runtime:

```text
declarative_only
```

This means:

```text
render manifest
do not execute code
```

### 12.2 Possible future runtimes

Possible future runtime classes:

```text
wasm_sandbox
js_isolate
lua_sandbox
python_sandbox
server_mod_job
game_wasm
game_declarative
ad_declarative
```

Each runtime needs a dedicated review before enabling.

### 12.3 Native runtime

Default:

```text
native_denied
```

Native execution is forbidden until a separate audited design exists.

### 12.4 Runtime selection

Runtime selection requires:

```text
runtime allowlist
facet kind compatibility
platform support
resource limits
policy approval
capability approval
sandbox backend availability
```

### 12.5 Unsupported runtime

Unsupported runtime should render a safe placeholder.

---

## 13. Permission model

### 13.1 Permission categories

```text
network
wallet
ledger
storage
index
profile
passport
vault
local_files
clipboard
camera
microphone
notifications
oap
sidecar
mailbox
save_data
logs
```

### 13.2 Default permissions

All permissions default to:

```text
deny
```

### 13.3 Permission display

UI must show:

```text
requested permission
granted permission
denied permission
reason
scope
duration
```

### 13.4 Permission escalation

Permission escalation must require:

```text
new policy decision
new user confirmation where applicable
new capability where applicable
restart/relaunch of sandbox context
```

No live silent escalation.

---

## 14. Wallet/value boundary

### 14.1 Direct wallet access forbidden

Facets cannot call:

```text
svc-wallet directly
wallet mutation command
raw wallet routes
ledger routes
```

### 14.2 Paid action bridge

Safe future flow:

```text
facet requests paid action intent
CrabLink shell pauses facet
CrabLink shell shows paid confirmation
user confirms
backend wallet route executes
receipt returns
facet receives safe result if policy allows
```

### 14.3 Facet cannot hide spend

Facet cannot control:

```text
amount display
payer display
recipient display
confirmation button
receipt display
error handling
```

Trusted CrabLink shell owns paid prompts.

### 14.4 No in-facet wallet UI

Wallet UI inside facet runtime is forbidden.

Only trusted shell wallet UI.

---

## 15. Storage/index boundary

### 15.1 Raw storage write forbidden

Facets cannot directly write `svc-storage`.

### 15.2 Product route write only

Future write flow:

```text
facet requests save/publish action
trusted shell shows confirmation if needed
backend product route validates
svc-storage stores bytes by b3
svc-index writes pointer if policy allows
receipt/proof returns where applicable
```

### 15.3 Save data

Game/app save data may be sandbox-local:

```text
bounded
private by default
passport scoped
clearable
not published unless user acts
```

### 15.4 Index pointer writes

Index pointer writes are backend-owned.

No facet raw index writes.

---

## 16. Network boundary

### 16.1 Default network none

No network unless explicitly allowed.

### 16.2 Allowed network patterns

Possible future allowed patterns:

```text
gateway route class only
OAP route class only
same-origin RON service route only
backend mediated fetch
declared static asset b3 fetch
```

### 16.3 Forbidden network patterns

```text
arbitrary HTTPS fetch
third-party tracking
analytics beacons
local network scans
localhost admin probes
wallet endpoint calls
metadata exfiltration
P2P/overlay direct access
```

### 16.4 Network quotas

If allowed:

```text
max requests
max bytes
timeout
method allowlist
header allowlist
domain/route allowlist
```

---

## 17. Profile/passport/vault boundary

### 17.1 Default profile access none

Facet cannot read profile/passport/vault state by default.

### 17.2 Safe public profile

Future safe field sharing may include:

```text
public handle
public avatar
public display name
```

Only with user/policy approval.

### 17.3 Private data forbidden

Forbidden:

```text
main→alt linkage
private passport subject
vault status details
capability tokens
wallet links
private profile drafts
local receipt cache internals
```

---

## 18. Local file/device boundary

### 18.1 Local files

Default:

```text
none
```

Future user-selected file access must be:

```text
explicit
scoped
temporary
safe handle only
no raw path to facet
```

### 18.2 Clipboard

Default:

```text
none
```

Clipboard write/read requires explicit prompt and policy.

### 18.3 Camera/microphone

Default:

```text
none
```

Requires dedicated UX and platform permissions.

### 18.4 Notifications

Default:

```text
none
```

No notification spam from facets.

---

## 19. Resource limits

### 19.1 Required limit categories

```text
cpu_ms
wall_time_ms
memory_bytes
input_bytes
output_bytes
log_bytes
network_requests
network_bytes
storage_bytes
save_bytes
render_surface_pixels
```

### 19.2 Default no-execution limits

For declarative-only facets:

```text
cpu_ms = 0
wall_time_ms = 0
memory_bytes = 0
network_requests = 0
storage_bytes = 0
```

### 19.3 Execution limits

Execution-capable facets must have nonzero bounded limits.

No unlimited.

### 19.4 Limit exceed behavior

On limit exceed:

```text
stop sandbox
mark terminated_by_limit
emit metric
show safe error
preserve safe logs
do not retry automatically
```

---

## 20. Sandbox lifecycle

### 20.1 Lifecycle states

```text
Disabled
Unsupported
ManifestLoaded
ContractLoaded
PolicyChecking
Denied
ReadyToLaunch
Launching
Running
Paused
Stopped
Crashed
TimedOut
TerminatedByLimit
Quarantined
```

### 20.2 Valid transitions

```text
Disabled → Unsupported
Disabled → ManifestLoaded
ManifestLoaded → ContractLoaded
ContractLoaded → PolicyChecking
PolicyChecking → Denied
PolicyChecking → ReadyToLaunch
ReadyToLaunch → Launching
Launching → Running
Running → Paused
Running → Stopped
Running → Crashed
Running → TimedOut
Running → TerminatedByLimit
Crashed → Quarantined
TimedOut → Quarantined
TerminatedByLimit → Quarantined
```

### 20.3 Forbidden transitions

```text
DeepLink → Running
ManifestLoaded → Running
ContractLoaded → Running without policy
OfflineCache → Running
PaidReceipt → Running
SidecarReady → Running
VaultUnlocked → Running
```

---

## 21. Launch requirements

A facet launch requires all of:

```text
valid b3 asset reference
verified facet manifest
verified facet.toml
supported runtime
runtime allowlisted
policy allowlisted
capabilities available
resource limits present
sandbox backend available
user launch confirmation
source label
correlation ID
```

For paid facets, also:

```text
paid access proof
explicit paid-action confirmation if spend required
backend receipt
backend access decision
```

---

## 22. Launch confirmation UX

### 22.1 Required display

Before launch, show:

```text
facet title
creator/publisher
facet kind
runtime
permissions requested
permissions granted
resource limits
network policy
storage policy
wallet policy
profile policy
paid/access status
risk warnings
```

### 22.2 Button labels

Good:

```text
Launch sandboxed facet
Run in sandbox
Open safe preview
```

Bad:

```text
OK
Continue
Load
```

### 22.3 Cancel path

Cancel must:

```text
not launch
not spend
not grant permission
not persist runtime state
```

---

## 23. Safe embed registry relation

Safe embeds remain declarative.

Examples:

```text
<crab-image>
<crab-video>
<crab-audio>
<crab-post>
<crab-comment>
```

Executable facets must not hide inside safe embeds.

If an embed points to a facet:

```text
render placeholder
show permission/launch requirement
do not execute
```

---

## 24. Site rendering relation

Sites may reference facets.

Default behavior:

```text
show inert widget placeholder
show manifest summary
show launch disabled state
```

A site cannot force facet execution.

A site cannot request wallet permission for a facet without shell confirmation.

A site cannot grant permissions.

---

## 25. Offline cache relation

Offline cache may store verified facet bytes.

Offline cache does not grant execution trust.

Rules:

```text
verified bytes are necessary but not sufficient
policy/capability/sandbox still required
no offline launch by default
no paid offline execution by default
```

---

## 26. OAP relation

OAP may transport facet manifests or sandbox launch requests later.

Rules:

```text
OAP is Rust-side only
no raw OAP frames in React
capabilities fail closed
OAP does not bypass policy
OAP does not bypass sandbox
OAP does not grant wallet/storage/index access
```

---

## 27. Sidecar relation

Sidecar may eventually host sandbox service endpoints.

Rules:

```text
sidecar disabled by default
sidecar readiness does not authorize facets
sidecar routes require policy
sidecar cannot grant wallet authority
source labels required
```

---

## 28. Media relation

Media player facets are high risk.

Default:

```text
no creator-supplied player code
CrabLink-owned player only
```

Future media processors/transcoders belong in:

```text
svc-mod
→ svc-sandbox
```

---

## 29. Paid actions relation

Facets must obey paid-action rules.

```text
no silent spend
no wallet mutation in facet
no paid action from page load
no auto-purchase
no hidden receipt
trusted shell owns paid confirmation
backend owns receipt
```

---

## 30. Passport/vault relation

Facets must not access vault secrets.

Rules:

```text
no private keys
no seed material
no capabilities
no raw tokens
no private alt linkage
no wallet links
```

Any safe public profile sharing requires explicit policy and user consent.

---

## 31. Side effects model

### 31.1 Side effects denied by default

Denied:

```text
network
wallet
storage
index
profile
local files
clipboard
camera
microphone
notifications
sidecar
oap
mailbox
```

### 31.2 Allowed side effects must be mediated

Every allowed side effect must go through:

```text
trusted shell
Tauri command
backend/sandbox route
policy/capability check
resource limits
```

### 31.3 Side effect logging

Side effects should produce audit/metrics where appropriate.

No secret logs.

---

## 32. Save data model

### 32.1 Local save data

Game/app save data may be:

```text
sandbox-local
passport scoped
bounded
clearable
amnesia-aware
```

### 32.2 Public save data

Publishing save data requires explicit user action and backend route.

### 32.3 Save data is not wallet truth

Save files cannot store ROC balance or receipts as truth.

---

## 33. Ad creative rules

### 33.1 Ad creative default

Ad creatives are inert previews by default.

### 33.2 No third-party tracking

Forbidden by default:

```text
third-party scripts
tracking pixels
fingerprinting
external analytics
unbounded network requests
```

### 33.3 Sponsored label

Ad surfaces must be clearly labeled.

### 33.4 Ad budget/value

Future ad campaign spend must go through paid-action/wallet routes.

No hidden ad budget mutation.

---

## 34. Algorithm transparency rules

### 34.1 Algorithm pages should show

```text
purpose
inputs
outputs
ranking factors
moderation factors
version
maintainer
review status
policy status
source availability
limitations
```

### 34.2 Algorithm activation

Activation requires:

```text
user/site/admin choice
policy allowlist
scope
audit trail
fallback
explainability where possible
```

### 34.3 Algorithm cannot silently affect global feed/search

No silent global activation from opening a page.

---

## 35. Game rules

### 35.1 Game manifest should show

```text
title
studio
runtime
asset bundles
cover
screenshots
trailer
save data policy
multiplayer/session policy
access policy
economics policy
moderation policy
sandbox policy
```

### 35.2 Game execution default

```text
disabled
```

### 35.3 Game wallet rules

No in-game spend without trusted shell confirmation.

No wallet access in game runtime.

### 35.4 Game network rules

Multiplayer/network requires explicit network/session contract.

Default no network.

---

## 36. Code rules

### 36.1 Code display

Allowed:

```text
display manifest
display source metadata
display docs
display facet.toml
display permissions
display tests/audit references
```

### 36.2 Code execution

Forbidden until all gates pass.

### 36.3 Code import

Imported code remains untrusted.

### 36.4 Code audit

Future review status may include:

```text
unreviewed
review_requested
reviewed
audited
rejected
quarantined
deprecated
```

Review status alone does not grant permissions.

---

## 37. Command boundary

### 37.1 Initial commands

Recommended first commands:

```text
facet_get_status
facet_get_config_summary
facet_validate_manifest
facet_validate_contract
facet_get_placeholder
facet_get_supported_kinds
facet_get_supported_runtimes
```

### 37.2 Future safe commands

```text
facet_check_policy
facet_check_capabilities
facet_prepare_launch
facet_cancel_launch
facet_get_sandbox_status
```

### 37.3 Future high-risk commands

Only after service contracts:

```text
facet_launch_sandboxed
facet_stop_sandbox
facet_pause_sandbox
facet_resume_sandbox
facet_get_sandbox_logs
```

### 37.4 Forbidden commands

```text
facet_eval
facet_exec
facet_shell
facet_run_binary
facet_run_native
facet_raw_wallet
facet_raw_ledger
facet_raw_storage
facet_raw_index
facet_grant_permission
facet_bypass_policy
facet_trust_cache
```

---

## 38. React/TypeScript boundary

### 38.1 React may

```text
render safe placeholder
render manifest preview
render facet.toml preview
show permission list
show launch disabled reason
show policy status
show sandbox status
show errors
```

### 38.2 React must not

```text
eval code
instantiate WASM
load script from facet
call raw sandbox launch
hold capability tokens
grant permissions
access raw local paths
call internal services
```

### 38.3 TypeScript may

```text
normalize safe DTOs
format permission labels
call typed Tauri commands
map errors
```

### 38.4 TypeScript must not

```text
run code
own sandbox runtime
own capability bytes
grant policy
issue wallet actions
```

---

## 39. Suggested TypeScript adapter surface

Design target:

```ts
type FacetKind =
  | 'code'
  | 'game'
  | 'algo'
  | 'app'
  | 'ad'
  | 'widget'
  | 'media_processor';

type FacetRuntime =
  | 'declarative_only'
  | 'wasm_sandbox'
  | 'js_isolate'
  | 'lua_sandbox'
  | 'server_mod_job'
  | 'native_denied';

type FacetPermissionStatus =
  | 'requested'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'requires_policy'
  | 'requires_capability'
  | 'requires_user_confirmation';

type FacetLaunchStatus =
  | 'disabled'
  | 'placeholder_only'
  | 'contract_missing'
  | 'policy_denied'
  | 'capability_missing'
  | 'ready_to_launch'
  | 'launching'
  | 'running'
  | 'stopped'
  | 'crashed'
  | 'terminated_by_limit';

type FacetDisplayContract = {
  schema: 'crablink.facet-display-contract.v1';
  kind: FacetKind;
  title: string;
  runtime: FacetRuntime;
  contentId?: string;
  crabUrl?: string;
  facetTomlCid?: string;
  permissions: Record<string, FacetPermissionStatus>;
  limits: Record<string, number>;
  launchStatus: FacetLaunchStatus;
  warnings: string[];
};
```

Rules:

```text
TypeScript shapes are display/adapter only.
Rust validates contracts.
Backend/policy owns permission truth.
Sandbox owns execution isolation.
```

---

## 40. Tauri Rust module targets

Likely future modules:

```text
apps/crablink-tauri/src-tauri/src/facets/mod.rs
apps/crablink-tauri/src-tauri/src/facets/types.rs
apps/crablink-tauri/src-tauri/src/facets/config.rs
apps/crablink-tauri/src-tauri/src/facets/errors.rs
apps/crablink-tauri/src-tauri/src/facets/redact.rs
apps/crablink-tauri/src-tauri/src/facets/manifest.rs
apps/crablink-tauri/src-tauri/src/facets/contract.rs
apps/crablink-tauri/src-tauri/src/facets/permissions.rs
apps/crablink-tauri/src-tauri/src/facets/limits.rs
apps/crablink-tauri/src-tauri/src/facets/policy.rs
apps/crablink-tauri/src-tauri/src/facets/launcher.rs
apps/crablink-tauri/src-tauri/src/facets/sandbox.rs
apps/crablink-tauri/src-tauri/src/facets/placeholders.rs
apps/crablink-tauri/src-tauri/src/facets/amnesia.rs

apps/crablink-tauri/src-tauri/src/commands/facets.rs
```

Likely frontend files:

```text
apps/crablink-tauri/src/shared/facets/facetTypes.ts
apps/crablink-tauri/src/shared/facets/facetClient.ts
apps/crablink-tauri/src/shared/facets/facetErrors.ts
apps/crablink-tauri/src/shared/facets/facetLabels.ts
apps/crablink-tauri/src/shared/facets/facetPermissions.ts
apps/crablink-tauri/src/shared/facets/facetLimits.ts
```

No dependencies should be added without reviewing CODECHECK and project dependency policy.

---

## 41. Config

Suggested config:

```toml
[facets]
enabled = true
execution_enabled = false
placeholder_only = true
developer_diagnostics = true

[facets.kinds]
code = true
game = true
algo = true
app = false
ad = true
widget = false
media_processor = false

[facets.runtimes]
declarative_only = true
wasm_sandbox = false
js_isolate = false
lua_sandbox = false
server_mod_job = false
native_denied = true

[facets.sandbox]
backend = "disabled"
require_svc_sandbox = true
require_policy_allowlist = true
require_capabilities = true
allow_local_runtime = false
allow_native_runtime = false

[facets.permissions]
network_default = "none"
wallet_default = "none"
ledger_default = "none"
storage_default = "none"
index_default = "none"
profile_default = "none"
local_files_default = "none"
clipboard_default = "none"
camera_default = "none"
microphone_default = "none"
notifications_default = "none"

[facets.limits]
max_cpu_ms = 100
max_wall_time_ms = 1000
max_memory_bytes = 16777216
max_input_bytes = 1048576
max_output_bytes = 1048576
max_log_bytes = 65536
max_network_requests = 0
max_storage_bytes = 0

[facets.security]
deny_deep_link_launch = true
deny_eval = true
deny_shell = true
deny_native_execution = true
deny_wallet_direct = true
deny_ledger_direct = true
deny_storage_direct = true
deny_index_direct = true
deny_profile_private = true
deny_unbounded_resources = true
redact_diagnostics = true

[facets.amnesia]
purge_sandbox_state_on_shutdown = true
persist_sandbox_logs = false
persist_save_data = false
```

Config rules:

```text
execution disabled by default
placeholder-only true by default
native execution denied
network none by default
wallet none by default
storage/index none by default
policy allowlist required
svc-sandbox required before execution
amnesia disables persistent runtime state
mobile may force execution disabled
```

---

## 42. Error taxonomy

Suggested app-safe errors:

```text
facet_disabled
facet_execution_disabled
facet_placeholder_only
facet_kind_unsupported
facet_manifest_missing
facet_manifest_invalid
facet_contract_missing
facet_contract_invalid
facet_runtime_unsupported
facet_runtime_denied
facet_policy_missing
facet_policy_denied
facet_capability_missing
facet_capability_denied
facet_permission_denied
facet_network_denied
facet_wallet_denied
facet_ledger_denied
facet_storage_denied
facet_index_denied
facet_profile_denied
facet_local_file_denied
facet_resource_limit_missing
facet_resource_limit_exceeded
facet_sandbox_unavailable
facet_sandbox_launch_denied
facet_sandbox_crashed
facet_sandbox_timeout
facet_sandbox_stopped
facet_deep_link_launch_denied
facet_eval_denied
facet_shell_denied
facet_native_denied
facet_cache_trust_denied
facet_paid_confirmation_required
facet_redacted_internal_error
```

### 42.1 User-facing copy examples

```text
This facet is display-only in this CrabLink build.
Execution is disabled by policy.
This facet is missing a valid facet contract.
This runtime is not supported.
This facet requested wallet access, which is denied.
This facet requested network access, which is denied.
This deep link cannot launch executable facets.
The sandbox stopped this facet because it exceeded its resource limit.
```

### 42.2 Developer diagnostics

May include:

```text
facet kind
runtime
manifest status
contract status
policy status
permission denial class
resource limit class
source label
correlation ID
redacted sandbox status
```

Must not include:

```text
capability tokens
Authorization
private keys
seed material
private alt linkage
wallet secrets
raw local paths
raw secret env
unredacted crash dumps
```

---

## 43. Metrics

Suggested metrics:

```text
crablink_facet_render_total{kind,outcome}
crablink_facet_placeholder_total{kind,reason}
crablink_facet_manifest_validate_total{kind,outcome}
crablink_facet_contract_validate_total{kind,outcome}
crablink_facet_policy_check_total{kind,outcome}
crablink_facet_permission_denial_total{kind,permission}
crablink_facet_launch_total{kind,runtime,outcome}
crablink_facet_sandbox_exit_total{kind,reason}
crablink_facet_limit_exceeded_total{kind,limit}
crablink_facet_deep_link_denial_total{kind}
crablink_facet_redaction_total{field_class}
```

Metric label safety:

```text
avoid full b3 if high-cardinality policy forbids
avoid crab URLs
avoid titles
avoid passport subjects
avoid wallet accounts
avoid receipt hashes
avoid local paths
avoid capability tokens
```

---

## 44. UI requirements

### 44.1 Facet page

Facet pages should show:

```text
facet kind
title
description
creator
b3 ID
manifest status
facet.toml status
runtime requested
policy status
permissions requested
resource limits
launch status
safe placeholder
```

### 44.2 Permission panel

Permission panel should distinguish:

```text
requested
denied
granted
unsupported
requires policy
requires capability
requires user confirmation
```

### 44.3 Launch button

Launch button should be disabled until all gates pass.

Disabled reason must be visible.

### 44.4 Safe placeholder

Safe placeholder is required before execution support.

### 44.5 Risk copy

Suggested copy:

```text
Executable facets are disabled until a valid contract, policy allowlist, capability set, resource limits, and sandbox route are available.
```

### 44.6 Wallet warning

If a facet requests wallet-related behavior:

```text
Facets cannot access your wallet directly. Any paid action must use the trusted CrabLink confirmation flow and backend wallet receipt path.
```

---

## 45. Mobile constraints

Mobile defaults:

```text
execution disabled
placeholder only
no sidecar runtime
no local sandbox runtime
no background execution
small resource limits
gateway-first diagnostics
```

Do not assume:

```text
desktop filesystem
sidecar
local process supervisor
native runtime
large memory
background compute
```

---

## 46. Amnesia behavior

In amnesia mode:

```text
no persistent sandbox state by default
no persistent facet logs
no persistent save data unless explicit safe policy
clear runtime handles on shutdown
clear temporary facet cache
clear launch context
redact diagnostics aggressively
```

Amnesia mode must not leave hidden executable state on disk.

---

## 47. Testing matrix

### 47.1 React tests

Test:

```text
safe placeholder renders
launch button disabled by default
permission panel displays deny-by-default
wallet warning displays
runtime unsupported displays
policy denied displays
deep-link launch denied displays
```

### 47.2 TypeScript adapter tests

Test:

```text
facet manifest normalization
facet contract normalization
permission label mapping
limit label mapping
error mapping
secret field rejection
safe display DTOs
```

### 47.3 Rust unit tests

Test:

```text
facet kind validation
b3 validation
facet.toml parse
required field validation
permission default deny
limit required
runtime allowlist
policy result mapping
redaction
error taxonomy
```

### 47.4 Rust integration tests

Test:

```text
placeholder-only status
manifest valid/invalid
contract valid/invalid
runtime unsupported
policy denied
capability missing
network denied
wallet denied
storage denied
index denied
resource limit missing
```

### 47.5 Sandbox lifecycle tests

Future only after sandbox route exists:

```text
launch allowed test facet
stop facet
timeout facet
crash facet
limit-exceed facet
log redaction
output bound
network denied
storage denied
wallet denied
```

### 47.6 Security regression tests

Test:

```text
React cannot eval facet code
TypeScript cannot instantiate WASM
deep link cannot launch facet
site embed cannot launch facet
offline cache cannot mark facet executable
paid receipt cannot grant permissions
sidecar ready cannot grant execution
vault unlock cannot grant execution
facet cannot access wallet
facet cannot access ledger
facet cannot access raw storage/index
facet cannot read local files
facet cannot run shell
```

### 47.7 Smoke scripts

Recommended future scripts:

```text
scripts/smoke-tauri-facet-status.sh
scripts/smoke-tauri-facet-placeholder.sh
scripts/smoke-tauri-facet-contract-validate.sh
scripts/smoke-tauri-facet-no-execution.sh
scripts/smoke-tauri-facet-no-wallet.sh
scripts/smoke-tauri-facet-no-network.sh
scripts/smoke-tauri-facet-deep-link-denied.sh
scripts/smoke-tauri-facet-amnesia.sh
```

---

## 48. First implementation batch recommendation

### Batch F1 — Facet status shell + placeholder renderer

Do this after base Tauri shell, command bridge, and route migration are stable.

Likely files:

```text
apps/crablink-tauri/src/shared/facets/facetTypes.ts
apps/crablink-tauri/src/shared/facets/facetClient.ts
apps/crablink-tauri/src/shared/facets/facetErrors.ts
apps/crablink-tauri/src/shared/facets/facetLabels.ts
apps/crablink-tauri/src/shared/facets/facetPermissions.ts

apps/crablink-tauri/src-tauri/src/commands/facets.rs
apps/crablink-tauri/src-tauri/src/facets/mod.rs
apps/crablink-tauri/src-tauri/src/facets/types.rs
apps/crablink-tauri/src-tauri/src/facets/config.rs
apps/crablink-tauri/src-tauri/src/facets/errors.rs
apps/crablink-tauri/src-tauri/src/facets/redact.rs
apps/crablink-tauri/src-tauri/src/facets/placeholders.rs
```

Initial commands:

```text
facet_get_status
facet_get_config_summary
facet_get_supported_kinds
facet_get_supported_runtimes
facet_get_placeholder
```

Acceptance:

```text
- Facet execution reports disabled.
- Placeholder-only mode works.
- React receives no executable handles.
- No eval command exists.
- No sandbox launch command exists.
- No shell/native command exists.
```

---

### Batch F2 — `facet.toml` parser/validator

Scope:

```text
parse facet.toml
validate required fields
default deny permissions
validate limits
display contract
no execution
```

Acceptance:

```text
- Valid facet.toml displays.
- Missing permissions default deny.
- Missing limits deny execution.
- Unknown runtime deny.
- Wallet/storage/index/network default deny.
```

---

### Batch F3 — Code/game/algo page integration

Scope:

```text
reuse existing React code/game/algo pages
connect to shared facet display adapter
show contract preview
show permission/limit panels
show disabled launch state
```

Acceptance:

```text
- crab://code page stays inert.
- crab://game page stays inert.
- crab://algo page stays inert.
- No execution or launch happens.
```

---

### Batch F4 — Policy check proof

Scope:

```text
call backend/gateway policy check route when available
source label
policy allow/deny display
no execution
```

Acceptance:

```text
- Policy denied shows safely.
- Missing policy denies.
- Policy allow does not execute by itself.
```

---

### Batch F5 — Sandbox status proof

Scope:

```text
detect svc-sandbox availability
show sandbox disabled/unavailable/ready status
no launch yet
```

Acceptance:

```text
- Sandbox unavailable is truthful.
- Ready status does not grant execution.
- Source label visible.
```

---

### Batch F6 — Test-only sandbox launch harness

Only after F1-F5 and explicit approval.

Scope:

```text
test fixture facet
no network
no wallet
no storage/index
tiny resource limits
deterministic output
sandbox lifecycle tests
```

Acceptance:

```text
- Launch requires explicit user action.
- Resource limits enforced.
- Logs bounded/redacted.
- Network/wallet/storage/index denied.
- Crash/timeout handled safely.
```

---

## 49. Review checklist

Before approving facet/sandbox work:

```text
[ ] Is execution disabled by default?
[ ] Are safe placeholders used before execution?
[ ] Does .code remain inert by default?
[ ] Does .game remain inert by default?
[ ] Does .algo remain inert by default?
[ ] Is facet.toml required before execution?
[ ] Is policy allowlist required?
[ ] Are capabilities required and fail-closed?
[ ] Are permissions deny-by-default?
[ ] Are resource limits mandatory?
[ ] Is React unable to execute code?
[ ] Is TypeScript unable to execute code?
[ ] Is shell/native execution forbidden?
[ ] Is svc-sandbox the intended cage?
[ ] Is svc-mod the intended server/mod job owner?
[ ] Is wallet access denied?
[ ] Is ledger access forbidden?
[ ] Is raw storage/index access denied?
[ ] Is network denied by default?
[ ] Is local filesystem denied by default?
[ ] Is profile/vault access denied?
[ ] Can deep links not launch facets?
[ ] Can sites not auto-launch facets?
[ ] Can cached facets not execute from cache alone?
[ ] Does paid access not grant runtime permissions?
[ ] Are logs bounded/redacted?
[ ] Are mobile defaults stricter?
[ ] Is amnesia mode honored?
```

---

## 50. Product checklist

Before calling facet support product-ready:

```text
[ ] Code facet pages show inert manifest/contract.
[ ] Game facet pages show inert manifest/contract.
[ ] Algo pages show transparency and policy state.
[ ] Permission panels are understandable.
[ ] Resource limits are visible.
[ ] Launch disabled reasons are clear.
[ ] Policy status is visible.
[ ] Sandbox status is visible.
[ ] No arbitrary execution exists.
[ ] No wallet access exists.
[ ] No storage/index access exists.
[ ] No network access exists by default.
[ ] Mobile safely shows placeholders.
```

---

## 51. Anti-scope

Forbidden in this implementation phase:

```text
- Arbitrary code execution from crab links.
- eval from b3 content.
- new Function from b3 content.
- script injection from facet.
- WASM instantiate from React shell.
- Native binary execution.
- Shell command execution.
- Running downloaded binaries.
- Running code from offline cache as trusted.
- Deep-link facet launch.
- Site-initiated facet launch.
- Wallet access inside facet.
- Ledger access inside facet.
- Direct storage write inside facet.
- Direct index write inside facet.
- Direct passport/vault access inside facet.
- Private main→alt linkage exposure.
- Arbitrary network access.
- Tracking beacons.
- Local network scans.
- Arbitrary local file reads.
- Clipboard/camera/microphone access by default.
- Unbounded CPU/memory/time/output/logs.
- Paid receipt granting runtime permissions.
- Sidecar readiness granting runtime permissions.
- OAP access granting runtime permissions.
- QuickChain/ROX/Solana/bridge/staking/liquidity scope.
```

---

## 52. Future expansion order

Recommended expansion order:

```text
1. Facet status shell.
2. Safe placeholder renderer.
3. facet.toml parser/validator.
4. Code/game/algo page integration.
5. Permission/limit display panels.
6. Policy check proof.
7. Sandbox status proof.
8. Test-only sandbox launch harness.
9. WASM sandbox research.
10. Game runtime research.
11. Server-side svc-mod job proof.
12. Ad creative policy proof.
13. Algorithm transparency/activation proof.
14. Save-data model.
15. Network route-class model.
16. Paid facet access proof.
17. Public marketplace/review system.
```

Do not jump directly to:

```text
running games
running WASM
running scripts
running native code
algorithm activation
ad network
plugin marketplace
wallet-integrated apps
```

---

## 53. Plain-English summary

Facets are how RustyOnions can eventually become programmable.

But programmability is dangerous unless it is caged.

The rule is:

```text
A crab link can identify code.
It cannot automatically execute code.
```

The safe model is:

```text
b3hash.code is the address.
facet.toml is the contract.
ron-policy is the judge.
svc-sandbox is the cage.
svc-mod owns heavy/server module jobs.
CrabLink is the renderer and launcher, not the unsafe executor.
```

The first goal is not to run apps or games.

The first goal is:

```text
show facet manifests safely,
show permissions clearly,
deny execution by default,
and build the contract surface that will let future sandboxed execution happen without breaking RustyOnions invariants.
```
````
