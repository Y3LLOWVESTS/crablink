
````markdown id="lmtxom"
---
title: RUN_STACK_AND_MODES_IDB
version: 0.1.0
status: draft
last-updated: 2026-05-17
audience: contributors, app engineers, RustyOnions service owners, ops, security reviewers, auditors
repo-target: crablink
primary-app-target: apps/crablink-tauri
related-blueprints:
  - CRABLINK_TAURI_IDB.MD
  - SECURITY_NOTES_CRABLINK_TAURI.MD
  - TAURI_MIGRATION_IDB.MD
  - TAURI_COMMAND_BRIDGE_IDB.MD
  - OAP_CLIENT_IDB.MD
  - SIDECAR_LOCAL_NODE_IDB.MD
  - STORAGE_AND_SETTINGS_IDB.MD
  - PASSPORT_WALLET_VAULT_IDB.MD
  - OFFLINE_CACHE_IDB.MD
  - MEDIA_TAURI_IDB.MD
  - TESTING_MATRIX_TAURI_IDB.MD
---

# RUN_STACK_AND_MODES_IDB

RO:WHAT — Defines CrabLink Tauri runtime modes, stack shapes, service ownership, and dev/prod boundaries.

RO:WHY — CrabLink Tauri must support local RustyOnions development without becoming a localhost-only toy or silently embedding backend services into the app. The app should be professional: client-first by default, local-dev capable, and optional-node capable later.

RO:INTERACTS — CrabLink Tauri React UI, Tauri Rust backend, TypeScript adapters, svc-gateway, omnigate, svc-wallet, ron-ledger, svc-storage, svc-index, svc-passport, ron-auth, ron-kms, ron-policy, ron-app-sdk, oap, ron-transport, micronode, macronode, future sidecar/local node.

RO:INVARIANTS — Default mode is configured gateway client mode. Local dev stack is explicit. Optional local node/sidecar is future, opt-in, supervised, and bounded. CrabLink Tauri is not wallet, ledger, storage, index, gateway, omnigate, ron-kernel, or ron-bus. Wallet/ledger truth stays backend-owned. No hidden servers. No silent spend. No fake receipts. No chain logic in CrabLink.

RO:METRICS — Run mode, gateway readiness, local dev stack readiness, sidecar status, command source, OAP status, paid-gate health, cache mode, amnesia mode, restart counts, and degraded dependency reasons.

RO:CONFIG — Runtime mode, gateway endpoint, local dev endpoint, OAP enablement, sidecar enablement, sidecar binary path, service port map, amnesia mode, cache policy, diagnostics visibility, and feature flags.

RO:SECURITY — Localhost is not automatically trusted. Sidecars are not auto-enabled. Local services do not grant implicit spend authority. React never calls internal services directly. Tauri commands enforce source policy and fail closed.

RO:TEST — Mode-switch tests, gateway-mode smoke, local-dev-stack smoke, sidecar-disabled test, sidecar-lifecycle test, degraded-service tests, paid-action fail-closed tests, no-localhost-lock-in tests, and mobile-mode tests.

---

## 0. Status

This blueprint defines the **runtime modes** for CrabLink Tauri.

It answers:

```text
What runs behind the app?
What does the app call?
When do we run local RustyOnions services?
Is it safe to run our own stack?
Does the app embed wallet/ledger/storage/index?
How do we avoid locking the product to localhost?
How does this evolve toward the next internet without becoming messy?
````

The short answer:

```text
CrabLink Tauri is a native client.
It normally connects to a configured gateway.
For development, it may point at a local RustyOnions stack.
Later, it may optionally supervise a local node/sidecar.
It must not secretly become the backend.
```

---

## 1. Invariants (MUST)

### [I-1] Default runtime mode is Gateway Mode

The professional default is:

```text
CrabLink Tauri
→ configured svc-gateway endpoint
→ omnigate
→ RustyOnions services
```

This endpoint may be:

```text
local dev gateway
private LAN gateway
remote test gateway
self-hosted gateway
future public RON gateway
enterprise gateway
```

The app must not assume `127.0.0.1` forever.

---

### [I-2] Localhost is a development convenience, not product destiny

Localhost is valid for testing.

Localhost must not be the only product architecture.

Required rule:

```text
127.0.0.1 is a valid configured gateway endpoint.
127.0.0.1 is not a hardcoded product requirement.
```

Forbidden:

```text
User cannot open CrabLink unless svc-wallet, svc-storage, svc-index, and omnigate are running locally.
```

---

### [I-3] The app is not the RustyOnions backend

CrabLink Tauri is not:

```text
ron-kernel
ron-bus
svc-wallet
ron-ledger
svc-storage
svc-index
svc-gateway
omnigate
svc-passport
ron-accounting
svc-rewarder
ron-policy
```

CrabLink Tauri may:

```text
call those services through public contracts
display their backend-derived truth
supervise a future optional sidecar
verify cached b3 objects
hold local UI/session state
invoke Rust adapters
```

CrabLink Tauri must not:

```text
mutate ledger truth directly
invent wallet balances
invent receipts
act as storage truth
act as index truth
act as policy truth
pretend to be a validator
```

---

### [I-4] svc-gateway remains the default public service boundary

Default client path:

```text
React UI
→ TypeScript adapter
→ Tauri Rust adapter or gateway adapter
→ svc-gateway
→ omnigate/services
```

CrabLink Tauri must not directly call these in normal Gateway Mode:

```text
svc-wallet
ron-ledger
svc-storage
svc-index
svc-passport
omnigate
ron-accounting
svc-rewarder
```

Exception:

```text
Local diagnostics may check known local service health only when Local Dev Stack Mode is enabled.
```

Even then, diagnostics do not mutate state.

---

### [I-5] Local Dev Stack Mode is explicit

Local Dev Stack Mode is for contributors.

It may run:

```text
svc-wallet
svc-passport
svc-storage
svc-index
omnigate
svc-gateway
```

It may later run:

```text
micronode
macronode
svc-edge
svc-mailbox
svc-dht
svc-overlay
```

But it is always labeled:

```text
mode: local_dev_stack
purpose: development/testing
trust: local but not automatically authoritative
```

---

### [I-6] Optional Local Node / Sidecar Mode is future and opt-in

Sidecar/local-node mode is not default.

It requires:

```text
SIDECAR_LOCAL_NODE_IDB.MD
explicit user/developer enablement
truthful health and readiness
bounded logs
bounded restart policy
clear shutdown behavior
security review
platform support matrix
```

No silent sidecar launch.

No silent privileged installation.

No hidden local wallet authority.

---

### [I-7] ron-kernel and ron-bus belong inside node/service compositions, not the app UI

If a future local node runs behind CrabLink, it may internally use:

```text
ron-kernel
ron-bus
ryker
micronode
macronode
```

But the Tauri app itself should not absorb those responsibilities.

Correct:

```text
CrabLink Tauri supervises optional local node process
→ local node/service bundle uses ron-kernel and ron-bus internally
```

Incorrect:

```text
React UI directly talks to ron-bus
Tauri frontend becomes ron-kernel
CrabLink app embeds service logic casually
```

---

### [I-8] Wallet and ledger truth remain service-owned

Economic truth stays here:

```text
svc-wallet = mutation front-door
ron-ledger = durable replayable truth
```

CrabLink Tauri may display:

```text
balance
receipt
hold status
payment quote
access proof
```

But those are backend-derived.

CrabLink Tauri must not:

```text
edit balances locally
commit ledger events
grant ROC locally
mint receipts locally
unlock paid content from local cache alone
```

---

### [I-9] No hidden spend authority in run modes

Changing runtime mode must never grant hidden spend authority.

Rules:

```text
Gateway Mode does not imply spend permission.
Local Dev Stack Mode does not imply spend permission.
Sidecar Mode does not imply spend permission.
Offline Mode does not imply spend permission.
Mobile Mode does not imply spend permission.
```

Every paid action still requires:

```text
quote/prepare
explicit user confirmation
backend wallet path
receipt/access proof
unlock after proof
```

---

### [I-10] OAP is a transport/client capability, not a mode that bypasses policy

Future OAP path:

```text
CrabLink Tauri Rust adapter
→ ron-app-sdk / OAP
→ RustyOnions service/node
```

OAP must not bypass:

```text
policy
capability checks
paid gates
wallet path
ledger truth
b3 verification
error taxonomy
```

React never constructs OAP frames.

---

### [I-11] Mobile mode must not assume local services

Mobile builds must not require:

```text
sidecar process
localhost service mesh
desktop filesystem behavior
always-on background process
developer ports
```

Mobile mode should normally use:

```text
configured gateway endpoint
platform secure storage
bounded local cache
deep-link/app-link handler
feature-gated OAP where supported
```

---

### [I-12] Offline Mode is cache/display mode, not backend truth

Offline Mode may show:

```text
verified b3 cached assets
recent route history
receipt display cache
last-known profile display
draft manifests
```

Offline Mode must not:

```text
perform wallet mutation
claim current balance truth
claim receipt truth without proof
create new backend assets
invent identity state
```

---

### [I-13] Run mode must be visible to users/developers

The app diagnostics panel must show:

```text
run mode
gateway endpoint
gateway health
gateway readiness
OAP status
sidecar status
wallet/backend status where available
cache mode
amnesia mode
dev mode
```

No silent mode changes.

---

### [I-14] QuickChain is not a CrabLink runtime mode yet

Forbidden in this blueprint:

```text
QuickChain validator mode
QuickChain wallet finality mode
QuickChain local chain mutation
ROX/Solana anchor mode
public bridge mode
staking mode
liquidity mode
exchange mode
```

QuickChain may remain:

```text
readiness page
blueprint page
future status dashboard
```

Only after internal economy, replay, accounting, rewarder, and receipt roots are proven should implementation begin.

---

## 2. Design Principles (SHOULD)

### [P-1] Separate “client mode” from “node mode”

CrabLink should be great as a client before it becomes a node supervisor.

Client-first design:

```text
configure gateway
open crab links
view assets/sites
confirm paid actions
display receipts
manage passports/profile UX
cache verified public content
```

Node features come later:

```text
local routing
local storage contribution
local relay
local pinning
local provider rewards
local validator/checkpoint role
```

---

### [P-2] Make mode selection explicit and boring

Run modes should be selectable through config/diagnostics.

Avoid magic.

Good:

```text
Run Mode: Gateway
Gateway: https://gateway.example
OAP: disabled
Sidecar: disabled
```

Good:

```text
Run Mode: Local Dev Stack
Gateway: http://127.0.0.1:8090
Wallet: local diagnostic only
Storage: local diagnostic only
Index: local diagnostic only
```

Bad:

```text
App silently starts wallet and ledger in background.
```

---

### [P-3] Build for professional deployment shapes

The app should eventually handle:

```text
public gateway
self-hosted home gateway
LAN gateway
enterprise gateway
local dev gateway
optional local node
offline verified cache
mobile gateway-only profile
```

Do not design only around one developer machine.

---

### [P-4] Keep service ownership intact

Each service keeps its own job:

```text
svc-gateway:
  public route surface, quotas, gateway contract

omnigate:
  product hydration, quote/access coordination

svc-wallet:
  wallet operations and receipts

ron-ledger:
  durable replayable economic truth

svc-storage:
  bytes by b3 content ID

svc-index:
  pointers and lookup metadata

svc-passport:
  identity/capability service

ron-policy:
  rules and pricing/payout policy

ron-accounting:
  usage/metering snapshots

svc-rewarder:
  reward planning, not direct ledger mutation
```

CrabLink Tauri coordinates display and user intent only.

---

### [P-5] Local dev should mirror real architecture, not replace it

Local Dev Stack Mode should still use the same service boundaries.

Correct local dev:

```text
CrabLink Tauri
→ local svc-gateway :8090
→ local omnigate :9090
→ local svc-wallet/storage/index/passport
```

Incorrect local dev:

```text
CrabLink Tauri bypasses gateway and mutates wallet directly because it is local.
```

---

### [P-6] Sidecar should feel like a node profile, not app logic

Future sidecar should be treated as:

```text
a supervised local RustyOnions node/profile
```

not:

```text
a pile of app-specific native helpers
```

If it needs `ron-kernel` and `ron-bus`, those belong inside the node profile, not React.

---

### [P-7] Prefer gateway fallback over hard failure

When OAP or sidecar is disabled/unavailable, the app should still work through gateway where possible.

Priority:

```text
gateway path works first
OAP adds native power later
sidecar adds local sovereignty later
offline cache adds resilience later
```

---

### [P-8] Diagnostics should be strong, not noisy

Diagnostics should answer:

```text
What mode am I in?
What endpoint am I using?
What services are ready?
Why did this paid action fail?
Is this data backend-confirmed or cached?
Can I safely continue?
```

Diagnostics should not dump secrets, huge logs, or raw private state.

---

## 3. Runtime Modes (HOW)

### [M-1] Gateway Mode — default

Status:

```text
default
professional
normal user mode
```

Topology:

```text
CrabLink Tauri
  React UI
  TypeScript adapters
  Tauri Rust commands
    ↓
Configured svc-gateway endpoint
    ↓
omnigate
    ↓
svc-wallet / svc-storage / svc-index / svc-passport / other services
```

Example config:

```toml
[run]
mode = "gateway"

[gateway]
base_url = "https://gateway.rustyonions.example"
timeout_ms = 5000

[oap]
enabled = false

[sidecar]
enabled = false

[diagnostics]
developer_panel = false
```

Allowed:

```text
GET /healthz
GET /readyz
GET /identity/me
GET /wallet/:account/balance
GET /crab/resolve?url=...
GET /b3/<hash>.<kind>
GET /sites/:name
POST paid quote/prepare routes
POST wallet operation routes through public gateway contract
POST asset/site publish routes through public gateway contract
```

Forbidden:

```text
direct call to ron-ledger
direct call to svc-storage
direct call to svc-index
direct call to svc-wallet unless public gateway contract explicitly routes/proxies it
direct call to omnigate
local sidecar auto-start
```

---

### [M-2] Local Dev Stack Mode — contributor testing

Status:

```text
development only
explicit
localhost allowed
not production default
```

Topology:

```text
CrabLink Tauri
    ↓
http://127.0.0.1:8090 svc-gateway
    ↓
http://127.0.0.1:9090 omnigate
    ↓
svc-wallet   :8088
svc-passport :5307
svc-storage  :5303
svc-index    :5304
```

Typical dev stack:

```text
svc-wallet   http://127.0.0.1:8088
svc-passport http://127.0.0.1:5307
svc-storage  http://127.0.0.1:5303
svc-index    http://127.0.0.1:5304
omnigate     http://127.0.0.1:9090
svc-gateway  http://127.0.0.1:8090
```

Example config:

```toml
[run]
mode = "local_dev_stack"

[gateway]
base_url = "http://127.0.0.1:8090"
timeout_ms = 5000

[local_dev]
wallet_url = "http://127.0.0.1:8088"
passport_url = "http://127.0.0.1:5307"
storage_url = "http://127.0.0.1:5303"
index_url = "http://127.0.0.1:5304"
omnigate_url = "http://127.0.0.1:9090"
diagnostics_only_direct_checks = true

[oap]
enabled = false

[sidecar]
enabled = false
```

Rules:

```text
App product calls still go through svc-gateway.
Direct service URLs are for diagnostics only.
Wallet mutation still goes through public/gateway/wallet-approved path.
Dev bearer tokens are dev-only.
Dev grants are backend-issued, not app-invented.
```

---

### [M-3] Gateway + Rust Command Mode — near-term Tauri target

Status:

```text
near-term Tauri implementation target
```

Topology:

```text
React UI
→ TypeScript adapter
→ Tauri invoke
→ Rust command handler
→ gateway client
→ svc-gateway
```

Purpose:

```text
Move privileged/network-sensitive operations into Rust commands.
Keep gateway as backend contract.
Prepare for OAP/sidecar/vault later.
```

Initial commands:

```text
health_check
ready_check
version_check
get_app_diagnostics
resolve_crab_url_gateway
read_settings
write_settings
```

Future commands:

```text
prepare_paid_action
confirm_paid_action
get_wallet_balance
verify_cached_b3
open_deep_link
oap_probe
sidecar_status
vault_status
```

Rules:

```text
Commands are typed.
Errors are redacted.
React does not receive secrets.
Gateway remains the service boundary.
```

---

### [M-4] OAP Client Mode — future native transport mode

Status:

```text
future
requires OAP_CLIENT_IDB.MD
feature-gated
Rust-side only
```

Topology:

```text
React UI
→ TypeScript adapter
→ Tauri command
→ Rust OAP client adapter
→ ron-app-sdk / oap / ron-transport
→ RustyOnions service or node
```

Config:

```toml
[run]
mode = "gateway"

[oap]
enabled = true
preferred_for = ["object_read", "media_read"]
fallback_gateway = true
max_frame_bytes = 1048576
stream_chunk_bytes = 65536
```

Rules:

```text
React never builds OAP frames.
OAP path must enforce frame bounds.
OAP does not bypass policy.
OAP does not bypass paid gates.
Gateway fallback remains available.
```

Forbidden:

```text
OAP path directly mutates ledger from CrabLink.
OAP path unlocks paid content without wallet/backend proof.
```

---

### [M-5] Optional Local Node / Sidecar Mode — future sovereignty mode

Status:

```text
future
requires SIDECAR_LOCAL_NODE_IDB.MD
disabled by default
desktop-first
mobile-limited
```

Topology option A — bundled micronode:

```text
CrabLink Tauri
→ sidecar supervisor
→ local micronode
→ embedded/local service facets
→ optional gateway/OAP endpoint
```

Topology option B — bundled service mesh:

```text
CrabLink Tauri
→ sidecar supervisor
→ local svc-gateway
→ local omnigate
→ local selected services
```

Topology option C — user-managed local node:

```text
CrabLink Tauri
→ configured local endpoint
→ user-managed node/services
```

Sidecar rules:

```text
explicitly enabled
health-checked
readiness-checked
bounded logs
bounded restart backoff
clean shutdown
no silent wallet authority
no silent installer
no hidden privilege escalation
```

Example config:

```toml
[run]
mode = "sidecar_node"

[gateway]
base_url = "http://127.0.0.1:8090"

[sidecar]
enabled = true
profile = "micronode"
auto_start = false
restart_policy = "bounded_backoff"
max_restarts_per_minute = 3
log_bytes_limit = 1048576

[oap]
enabled = true
fallback_gateway = true
```

Before production use, this mode needs its own detailed IDB.

---

### [M-6] Offline Verified Cache Mode — future resilience mode

Status:

```text
future
requires OFFLINE_CACHE_IDB.MD
not wallet truth
not receipt truth unless proof is valid
```

Topology:

```text
CrabLink Tauri
→ local verified cache
→ b3 verification
→ render cached public object if valid
```

May show:

```text
cached image
cached article
cached post/comment
cached site root
cached public profile
recent receipt display cache
draft manifests
```

Must not:

```text
mutate wallet
claim current balance
create new receipt
unlock paid content without valid proof
publish new asset
resolve unverified names as truth
```

Config:

```toml
[offline]
enabled = true
verified_b3_cache = true
max_cache_bytes = 1073741824
allow_paid_receipt_display_cache = true
allow_paid_unlock_from_cache = false
```

---

### [M-7] Mobile Gateway Mode — mobile default

Status:

```text
future mobile default
```

Topology:

```text
CrabLink Tauri mobile
→ configured gateway endpoint
→ RustyOnions services
```

Rules:

```text
No required sidecar.
No required local service mesh.
Use platform secure storage where available.
Use mobile deep-link/app-link handling.
Cache is bounded.
Background behavior is limited and explicit.
```

Mobile mode may support OAP later, but it must not assume desktop sidecar behavior.

---

## 4. Run Mode Matrix

| Mode                        | Default?  | Runs local services?         | Uses gateway?     | Uses OAP?       | Suitable for normal users? | Suitable for dev? | Mobile-suitable? |
| --------------------------- | --------- | ---------------------------- | ----------------- | --------------- | -------------------------- | ----------------- | ---------------- |
| Gateway Mode                | Yes       | No                           | Yes               | No by default   | Yes                        | Yes               | Yes              |
| Local Dev Stack Mode        | No        | User/dev runs them           | Yes, local        | No by default   | No                         | Yes               | No               |
| Gateway + Rust Command Mode | Near-term | No                           | Yes               | No by default   | Yes                        | Yes               | Yes              |
| OAP Client Mode             | Future    | No, unless endpoint is local | Optional fallback | Yes             | Later                      | Yes               | Maybe            |
| Sidecar Node Mode           | Future    | Yes, supervised              | Usually local     | Optional        | Advanced users later       | Yes               | Usually no       |
| Offline Verified Cache Mode | Future    | No                           | No while offline  | No              | Limited                    | Yes               | Yes              |
| Mobile Gateway Mode         | Future    | No                           | Yes               | Future optional | Yes                        | Yes               | Yes              |

---

## 5. Implementation Patterns (HOW)

### [C-1] Run mode enum

TypeScript:

```ts
export type CrablinkRunMode =
  | "gateway"
  | "local_dev_stack"
  | "gateway_rust_commands"
  | "oap_client"
  | "sidecar_node"
  | "offline_cache"
  | "mobile_gateway";
```

Rust:

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RunMode {
    Gateway,
    LocalDevStack,
    GatewayRustCommands,
    OapClient,
    SidecarNode,
    OfflineCache,
    MobileGateway,
}
```

---

### [C-2] Runtime diagnostics envelope

```rust
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub struct RuntimeDiagnostics {
    pub schema: &'static str,
    pub run_mode: RunMode,
    pub gateway: GatewayStatus,
    pub oap: FeatureStatus,
    pub sidecar: SidecarStatus,
    pub cache: CacheStatus,
    pub vault: FeatureStatus,
    pub amnesia: AmnesiaStatus,
    pub dev: DevStatus,
}
```

Required UI labels:

```text
Gateway: ready / degraded / unavailable
OAP: disabled / ready / degraded
Sidecar: disabled / starting / ready / degraded / stopped
Vault: disabled / locked / unlocked / error
Cache: disabled / ready / degraded / integrity-fail
Amnesia: on / off
```

---

### [C-3] Gateway endpoint config

```toml
[gateway]
base_url = "http://127.0.0.1:8090"
timeout_ms = 5000
allow_insecure_http = true
label = "Local Dev Gateway"
```

Production-like:

```toml
[gateway]
base_url = "https://gateway.example"
timeout_ms = 5000
allow_insecure_http = false
label = "Configured Gateway"
```

Rules:

```text
HTTP allowed for local dev.
HTTPS preferred/required for remote production-like endpoints.
Endpoint shown in diagnostics.
Endpoint changes require clear UI.
```

---

### [C-4] Local dev stack config

```toml
[local_dev]
enabled = true
diagnostics_only_direct_checks = true

[local_dev.services]
wallet = "http://127.0.0.1:8088"
passport = "http://127.0.0.1:5307"
storage = "http://127.0.0.1:5303"
index = "http://127.0.0.1:5304"
omnigate = "http://127.0.0.1:9090"
gateway = "http://127.0.0.1:8090"
```

Important:

```text
These direct URLs are diagnostics only.
Product calls still go through gateway.
```

---

### [C-5] Sidecar disabled stub

```rust
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub struct SidecarStatus {
    pub enabled: bool,
    pub mode: SidecarMode,
    pub state: SidecarState,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SidecarMode {
    Disabled,
    UserManaged,
    BundledMicronode,
    BundledServiceMesh,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SidecarState {
    Disabled,
    Starting,
    Ready,
    Degraded,
    Stopped,
    Error,
}
```

Initial app should return:

```text
enabled: false
mode: disabled
state: disabled
reason: "sidecar mode requires SIDECAR_LOCAL_NODE_IDB"
```

---

### [C-6] Source labels for route results

Every resolved route result should include source:

```ts
export type RouteSource =
  | "gateway"
  | "local_dev_gateway"
  | "oap"
  | "sidecar_gateway"
  | "offline_cache"
  | "fixture";
```

UI should show:

```text
Source: Gateway confirmed
Source: Local dev gateway
Source: Offline verified cache
Source: Fixture/dev only
```

---

### [C-7] Paid action source discipline

Paid action source options:

```text
gateway wallet route
future OAP wallet route through policy
future sidecar local wallet route only if node mode is explicitly authorized
```

Forbidden:

```text
offline cache paid action
fixture paid action outside test mode
React local paid action
direct ledger paid action
```

---

### [C-8] Dev stack launch remains external at first

Initial Tauri app should not auto-start the dev stack.

Recommended first behavior:

```text
If Local Dev Stack Mode selected:
  app checks http://127.0.0.1:8090/healthz
  if unavailable:
    show instructions to run dev stack
  do not silently start services
```

Later, after sidecar IDB:

```text
app may offer “Start Local Node” if sidecar mode is explicitly enabled
```

---

### [C-9] No-localhost-lock-in test

A required regression test:

```text
Set gateway.base_url = "https://example.invalid"
Assert:
  app does not replace it with localhost
  diagnostics show configured endpoint
  errors are endpoint-specific
  app does not auto-start local services
```

Another:

```text
Set gateway.base_url = "http://127.0.0.1:8090"
Assert:
  app treats it as configured local gateway
  product calls still go through gateway
  diagnostics label it local dev if local_dev_stack mode is selected
```

---

## 6. Acceptance Gates (PROOF)

### [G-1] Run mode doctrine gate

```text
[ ] RUN_STACK_AND_MODES_IDB.MD exists.
[ ] Gateway Mode is documented as default.
[ ] Local Dev Stack Mode is documented as development-only.
[ ] Sidecar Mode is documented as future/opt-in.
[ ] Offline Mode is documented as cache/display only.
[ ] Mobile Mode is documented as gateway-first.
[ ] QuickChain is explicitly anti-scope.
```

---

### [G-2] No backend ownership gate

```text
[ ] CrabLink Tauri does not define itself as wallet.
[ ] CrabLink Tauri does not define itself as ledger.
[ ] CrabLink Tauri does not define itself as storage.
[ ] CrabLink Tauri does not define itself as index.
[ ] CrabLink Tauri does not define itself as gateway.
[ ] CrabLink Tauri does not define itself as omnigate.
[ ] CrabLink Tauri does not define itself as ron-kernel or ron-bus.
[ ] Future local node mode keeps node/service ownership separate.
```

---

### [G-3] Gateway default gate

```text
[ ] App has configurable gateway endpoint.
[ ] Default route calls go through gateway adapter.
[ ] Health/ready check works against configured gateway.
[ ] crab:// resolve goes through configured gateway by default.
[ ] Asset/site routes go through configured gateway by default.
[ ] Paid prepare/pay routes go through backend-approved gateway path.
[ ] App does not require local services in Gateway Mode.
```

---

### [G-4] Local dev stack gate

```text
[ ] Local Dev Stack Mode can be selected explicitly.
[ ] Default local gateway is http://127.0.0.1:8090.
[ ] Dev diagnostics can check local service readiness.
[ ] Direct service checks are diagnostics-only.
[ ] Product calls still go through svc-gateway.
[ ] Gateway offline state is clear and actionable.
[ ] App does not fake readiness when stack is down.
```

---

### [G-5] Sidecar disabled gate

```text
[ ] Sidecar is disabled by default.
[ ] Diagnostics show sidecar disabled truthfully.
[ ] No sidecar binary launches silently.
[ ] No local node starts silently.
[ ] Sidecar mode requires future IDB before implementation.
[ ] Mobile build does not assume sidecar.
```

---

### [G-6] OAP disabled/feature-gated gate

```text
[ ] OAP is disabled by default.
[ ] OAP status is visible in diagnostics.
[ ] React never builds OAP frames.
[ ] OAP path requires OAP_CLIENT_IDB.MD.
[ ] Gateway fallback remains available.
```

---

### [G-7] Paid fail-closed gate

```text
[ ] If gateway unavailable, paid action cannot proceed.
[ ] If wallet unavailable, paid action cannot proceed.
[ ] If sidecar degraded, sidecar paid path cannot proceed.
[ ] If OAP degraded, OAP paid path cannot proceed.
[ ] Offline cache cannot initiate paid action.
[ ] No route unlocks from local display cache alone.
```

---

### [G-8] No-localhost-lock-in gate

```text
[ ] App can use non-local gateway endpoint.
[ ] Localhost is not hardcoded in shared core.
[ ] Localhost is not hardcoded in Tauri Rust except dev defaults.
[ ] Localhost appears only in Local Dev Stack defaults/docs/tests.
[ ] Changing endpoint persists safely.
[ ] Endpoint shown in diagnostics.
```

---

### [G-9] Mobile-forward gate

```text
[ ] Mobile mode does not require local service mesh.
[ ] Sidecar is feature-gated and desktop-first.
[ ] Gateway mode works without desktop-only APIs.
[ ] Platform adapter reports mobile support accurately.
[ ] Secure storage and cache behavior are platform-adapted.
```

---

### [G-10] Professional deployment gate

```text
[ ] Gateway Mode can represent public/remote gateway.
[ ] Gateway Mode can represent self-hosted gateway.
[ ] Gateway Mode can represent LAN gateway.
[ ] Local Dev Stack Mode remains dev-labeled.
[ ] Sidecar Mode remains opt-in.
[ ] Diagnostics show all active assumptions.
```

---

## 7. Anti-Scope (Forbidden)

Forbidden in this runtime blueprint:

```text
- Hard-locking CrabLink Tauri to 127.0.0.1.
- Requiring normal users to run svc-wallet locally.
- Requiring normal users to run ron-ledger locally.
- Requiring normal users to run svc-storage locally.
- Requiring normal users to run svc-index locally.
- Silently launching local services.
- Silently installing sidecar binaries.
- Treating Tauri app as wallet truth.
- Treating Tauri app as ledger truth.
- Treating Tauri app as storage truth.
- Treating Tauri app as index truth.
- Direct ledger mutation from CrabLink.
- Direct wallet mutation outside backend wallet path.
- Direct storage/index mutation from React.
- Direct omnigate calls from normal client mode.
- OAP in React.
- OAP bypassing policy.
- Paid action from offline cache.
- Unlocking paid content without receipt/access proof.
- QuickChain validator mode inside CrabLink.
- ROX/Solana/public bridge/staking/liquidity logic in CrabLink.
- Mobile architecture that requires desktop sidecar behavior.
- Debug/local dev defaults presented as production design.
```

---

## 8. References

Primary project references:

```text
CRABLINK_TAURI_IDB.MD
SECURITY_NOTES_CRABLINK_TAURI.MD
TAURI_MIGRATION_IDB.MD
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

Current proven local dev stack:

```text
svc-wallet   :8088
svc-passport :5307
svc-storage  :5303
svc-index    :5304
omnigate     :9090
svc-gateway  :8090
```

Current client truth boundary:

```text
CrabLink displays backend-derived truth.
svc-gateway is public route boundary.
omnigate hydrates product views.
svc-wallet is mutation front-door.
ron-ledger is durable truth.
svc-storage stores bytes by b3.
svc-index stores lookup metadata.
```

---

## 9. Reviewer Checklist

Before approving runtime/mode work:

```text
[ ] Does Gateway Mode still work without local services?
[ ] Is Local Dev Stack Mode explicitly labeled dev?
[ ] Is localhost configurable, not hardcoded?
[ ] Does the app still call svc-gateway by default?
[ ] Are direct service URLs diagnostics-only?
[ ] Is sidecar disabled by default?
[ ] Is OAP disabled or feature-gated?
[ ] Does React avoid backend ownership?
[ ] Does Tauri Rust avoid becoming hidden service logic?
[ ] Do paid actions fail closed when dependencies are degraded?
[ ] Is wallet/ledger truth backend-owned?
[ ] Are run modes visible in diagnostics?
[ ] Is mobile not dependent on sidecars?
[ ] Is QuickChain still anti-scope?
```

---

## 10. Plain-English Summary

The professional design is:

```text
CrabLink Tauri is a real native RON client.
It does not require every user to run a local service mesh.
It talks to a configured gateway by default.
For development, we run the local RustyOnions stack.
Later, advanced users may run an optional local node/sidecar.
```

Correct mental model:

```text
Normal user:
  CrabLink Tauri → configured gateway → RustyOnions network/services

Developer:
  CrabLink Tauri → localhost svc-gateway → local dev services

Future power user:
  CrabLink Tauri → optional supervised local node/sidecar

Mobile user:
  CrabLink Tauri mobile → configured gateway
```

Most important rule:

```text
The app is the client.
The services are the services.
The ledger is the ledger.
The wallet is the wallet.
The gateway is the gateway.
Do not blur these boundaries.
```

```
```
