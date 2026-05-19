
````markdown
---
title: SIDECAR_LOCAL_NODE_IDB
version: 0.1.0
status: draft
last-updated: 2026-05-17
audience: contributors, app engineers, RustyOnions service owners, security reviewers, ops, auditors
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
  - OFFLINE_CACHE_IDB.MD
  - MEDIA_TAURI_IDB.MD
  - FACET_SANDBOX_IDB.MD
  - TESTING_MATRIX_TAURI_IDB.MD
related-rusty-onions-docs:
  - INTEROP_BLUEPRINT.MD
  - APP_INTEGRATION_BLUEPRINT.MD
  - FULL_PROJECT_BLUEPRINT.MD
  - HARDENING_BLUEPRINT.MD
  - CONCURRENCY_AND_ALIASING_BLUEPRINT.MD
  - MICROKERNEL_BLUEPRINT.MD
  - WEB3.MD
  - WEB3_2.MD
  - NEXT_LEVEL.MD
  - QUICKCHAIN.MD
  - CODEBUNDLE_RS.md
  - ALLNOTES.MD
  - ALL_DOCS_COMBINED.MD
supersedes:
  - informal “just run local servers” assumptions
  - Chrome-extension-only localhost dev assumptions
does-not-delete:
  - gateway-first normal user mode
  - local dev stack scripts
  - Chrome extension proof client
  - existing RustyOnions service ownership boundaries
---

# SIDECAR_LOCAL_NODE_IDB

RO:WHAT — Defines CrabLink Tauri’s optional local sidecar / local node model, including lifecycle, supervision, ports, health, provenance, logs, data directories, mobile limits, and service-boundary safety.

RO:WHY — CrabLink Tauri should eventually support sovereign local RustyOnions operation, but the app must not become an uncontrolled backend, hidden service mesh, wallet bypass, ledger bypass, fake local network, or localhost-only toy.

RO:INTERACTS — CrabLink React app, TypeScript adapter layer, Tauri command bridge, Tauri Rust backend, sidecar supervisor, process lifecycle manager, local config store, local diagnostics, OAP client, gateway client, micronode, macronode, svc-gateway, omnigate, svc-wallet, ron-ledger, svc-passport, svc-storage, svc-index, svc-edge, svc-dht, svc-overlay, ron-kernel, ron-bus, ron-transport, ron-app-sdk, ron-policy, ron-auth, ron-kms, ron-metrics, ron-audit.

RO:INVARIANTS — Sidecar mode is future, optional, explicit, desktop-first, disabled by default, and bounded. CrabLink Tauri remains the client. RustyOnions services remain services. svc-wallet remains the wallet mutation front-door. ron-ledger remains durable economic truth. svc-gateway remains the public product boundary unless a tested OAP route contract replaces a specific route. No hidden servers. No silent spend. No fake receipts. No fake balances. No direct ledger/storage/index mutation from UI. No QuickChain/ROX/Solana scope.

RO:METRICS — Sidecar enabled state, lifecycle state, start/stop outcomes, binary verification result, health/ready status, process exit reason, restart count, crash-loop state, port binding status, dependency readiness, log truncation count, OAP/gateway endpoint status, disk quota state, amnesia purge outcome, and degraded service reasons.

RO:CONFIG — Sidecar enabled flag, sidecar mode, binary path, binary hash/provenance policy, port map, data directory, log directory, max log bytes, restart policy, startup timeout, shutdown timeout, gateway endpoint, OAP endpoint, service profile, amnesia mode, developer diagnostics, and mobile disablement policy.

RO:SECURITY — Sidecars are never auto-enabled by deep link or page content. Localhost is not automatically trusted. Binaries must be provenance-checked. Logs are redacted and bounded. Sidecar endpoints are loopback-only by default. Capabilities fail closed. Running a sidecar does not grant wallet spend authority. Paid actions still require explicit confirmation. Direct raw service calls from React are forbidden.

RO:TEST — Sidecar-disabled tests, lifecycle state tests, binary provenance tests, start/stop tests, readiness tests, crash-loop tests, port conflict tests, log bound tests, amnesia purge tests, gateway fallback tests, OAP route tests, paid-action fail-closed tests, mobile disabled tests, and local-stack smoke tests.

---

## 0. Status

This IDB defines the future optional local node / sidecar model for CrabLink Tauri.

It is not a request to immediately bundle the full RustyOnions service mesh into the app.

It is not a request to make every user run local services.

It is not a request to bypass gateway, wallet, ledger, policy, storage, index, or receipt boundaries.

The current correct order remains:

```text
1. Preserve gateway-first Tauri mode.
2. Mount existing React shell.
3. Add safe command bridge.
4. Add settings/storage adapters.
5. Preserve paid gates and receipts.
6. Add native crab:// deep links.
7. Add Rust-side OAP proof.
8. Add vault/passport design.
9. Add sidecar design.
10. Only then implement optional sidecar batches.
```

Sidecar mode is a future sovereignty/power-user mode.

Default app mode remains:

```text
CrabLink Tauri → configured svc-gateway → RustyOnions services
```

---

## 1. Plain-language rule

CrabLink Tauri may eventually supervise a local RustyOnions node.

But the app itself is not the node.

Correct mental model:

```text
CrabLink Tauri = native client shell
Tauri Rust = trusted local command/runtime boundary
Sidecar = optional supervised RustyOnions process or local service profile
svc-gateway = public product route boundary
svc-wallet = wallet mutation front-door
ron-ledger = durable economic truth
```

Wrong mental model:

```text
CrabLink Tauri is the backend.
React owns services.
The app can mutate ledger locally.
Localhost is automatically safe.
A sidecar grants spend authority.
A deep link can start services.
The user must run a full node to use CrabLink.
```

---

## 2. Why this IDB exists

RustyOnions is building the next internet.

Long-term, power users should be able to run local RON infrastructure.

But safe local infrastructure requires discipline:

```text
explicit enablement
supervised lifecycle
bounded resources
truthful health/ready
loopback-only default
provenance-checked binaries
redacted bounded logs
deterministic shutdown
clear data directories
mobile limitations
gateway/OAP route boundaries
no wallet/ledger bypass
```

Without this IDB, “run local services behind Tauri” could accidentally become:

```text
hidden server startup
silent wallet authority
direct service mutation from UI
unbounded logs
port conflicts
unsafe binary execution
unclear production/dev boundary
localhost-only product design
mobile-incompatible architecture
fake backend truth
```

This IDB prevents that.

---

## 3. Goals

### 3.1 Product goals

CrabLink Tauri should eventually support:

```text
Gateway-first normal user mode
Local dev stack diagnostics
Optional local node mode for power users
Optional bundled micronode profile
Optional user-managed node attachment
Future sidecar OAP endpoint
Future local gateway endpoint
Clear run-mode display
Clear health/ready diagnostics
Safe start/stop controls
```

### 3.2 Engineering goals

The implementation should provide:

```text
central sidecar supervisor
typed Tauri commands
strict process lifecycle state machine
binary provenance checks
port allocation/validation
bounded log capture
redacted diagnostics
health/ready polling
crash-loop backoff
graceful shutdown
amnesia-compatible data handling
gateway fallback
```

### 3.3 Security goals

The design must prevent:

```text
silent service startup
deep-link service startup
arbitrary binary execution
shell command injection
raw process control from React
wallet/ledger bypass
policy bypass
local service trust confusion
unbounded disk/log growth
secret leakage in logs
public network exposure by default
```

---

## 4. Non-goals

This IDB does not implement:

```text
QuickChain
ROX
Solana
external settlement
staking
liquidity
exchange-facing node behavior
public bridge
validator node logic
carrier/archive node logic
public DHT bootstrap UI
full macronode ops console
cloud deployment manager
arbitrary plugin runtime
shell command runner
process manager for non-RustyOnions apps
```

Future node/validator work requires separate blueprints.

---

## 5. Definitions

### 5.1 Sidecar

A sidecar is a child process supervised by CrabLink Tauri for local RustyOnions functionality.

A sidecar may be:

```text
bundled with the app
downloaded through a verified update mechanism later
user-selected from a known binary path in developer mode
compiled locally by a contributor
```

A sidecar is not arbitrary shell execution.

### 5.2 Local node

A local node is a RustyOnions node/profile running on the user’s machine.

Possible forms:

```text
micronode profile
macronode profile
single local svc-gateway + selected services
user-managed RustyOnions stack
```

### 5.3 Bundled micronode

A bundled micronode is a small single-process RustyOnions profile shipped with or near the app.

It is the preferred future “easy local node” direction if it can preserve boundaries.

### 5.4 Bundled service mesh

A bundled service mesh means multiple RustyOnions services supervised by the app or a local supervisor.

This is higher complexity than bundled micronode.

It is not first-batch scope.

### 5.5 User-managed local node

A user-managed local node is a node started outside CrabLink Tauri.

CrabLink may connect to it through configured gateway/OAP endpoints.

CrabLink does not own its lifecycle.

### 5.6 Local dev stack

The local dev stack is contributor-only development infrastructure.

Current known local development endpoints:

```text
svc-wallet   :8088
svc-passport :5307
svc-storage  :5303
svc-index    :5304
omnigate     :9090
svc-gateway  :8090
```

Product calls should still go through `svc-gateway` unless a specific diagnostics or tested OAP route allows otherwise.

### 5.7 Supervisor

The supervisor is Tauri Rust code that manages sidecar lifecycle.

It may:

```text
validate config
verify binary
spawn process
poll health/ready
collect bounded logs
restart with backoff when policy allows
stop gracefully
kill after timeout
report diagnostics
```

It must not:

```text
execute arbitrary shell
run unverified binaries in production
hide service state
grant wallet authority
rewrite service state
mutate ledger
```

### 5.8 Sidecar profile

A sidecar profile describes what kind of local node is running.

Examples:

```text
disabled
dev_stack_attached
bundled_micronode
bundled_gateway_profile
user_managed_node
```

### 5.9 Sidecar data directory

A directory used by the sidecar for local state.

It must be explicit, bounded, and compatible with amnesia rules.

### 5.10 Sidecar logs

Logs captured from the sidecar.

They must be:

```text
bounded
redacted
rotated or truncated
safe for diagnostics
not treated as backend truth
```

### 5.11 Sidecar endpoint

A loopback endpoint exposed by sidecar.

Examples:

```text
http://127.0.0.1:<port>
oap://127.0.0.1:<port>
unix socket path
named pipe path
```

Public network bind is forbidden by default.

---

## 6. Non-negotiable invariants

### [I-1] Sidecar is disabled by default

Default config:

```text
sidecar.enabled = false
```

The app must work without a sidecar.

Normal user path:

```text
CrabLink Tauri → configured svc-gateway
```

Sidecar mode must be explicit.

---

### [I-2] No hidden servers

The app must not silently start local services on first launch.

Starting a sidecar requires:

```text
feature enabled
user/developer intent
valid config
binary verification
port validation
clear UI status
```

A deep link must not start the sidecar.

A webpage must not start the sidecar.

---

### [I-3] CrabLink Tauri remains a client

The app may supervise a sidecar, but it is still not the backend.

Forbidden:

```text
React as backend owner
TypeScript service orchestration
Tauri duplicating svc-wallet
Tauri duplicating ron-ledger
Tauri duplicating svc-storage
Tauri duplicating svc-index
Tauri duplicating omnigate
Tauri duplicating svc-gateway
```

---

### [I-4] Service ownership remains intact

Even in sidecar mode:

```text
svc-wallet owns wallet mutation front-door
ron-ledger owns durable economic truth
svc-storage owns stored bytes by b3
svc-index owns lookup/index metadata
svc-passport owns identity/capability backend truth
omnigate hydrates product views
svc-gateway exposes public product routes
ron-accounting records usage/metering
svc-rewarder plans rewards but does not mutate ledger directly
```

CrabLink Tauri does not take over these responsibilities.

---

### [I-5] Gateway route semantics remain primary

Early sidecar mode should expose a local gateway-compatible endpoint.

Preferred local topology:

```text
CrabLink Tauri
→ local sidecar endpoint
→ local svc-gateway-compatible route surface
→ local RustyOnions services/profile
```

This preserves product route contracts.

OAP can be added later for selected route classes.

---

### [I-6] Localhost is not automatically trusted

Localhost endpoints can be malicious, stale, wrong-versioned, or user-managed.

The app must verify:

```text
expected service
expected route contract
health/ready
version compatibility
capability requirements
source label
```

Do not assume:

```text
127.0.0.1 means trusted
localhost means official
open port means ready
healthz means wallet truth
```

---

### [I-7] Running a sidecar does not grant spend authority

Sidecar mode does not bypass paid-action confirmation.

Paid actions still require:

```text
explicit confirmation
policy approval
svc-wallet path
backend receipt
receipt display truth boundary
idempotency
```

Forbidden:

```text
sidecar auto-pays
sidecar auto-holds
sidecar grants local spend permission
sidecar converts vault unlock into spend approval
```

---

### [I-8] No direct ledger mutation from sidecar UI path

CrabLink UI must not call ledger mutation routes directly.

Even when a local ledger is present behind a local profile, mutation path remains:

```text
CrabLink Tauri
→ product/wallet route
→ svc-wallet
→ ron-ledger
```

---

### [I-9] No direct storage/index mutation from UI path

CrabLink UI must not write storage/index directly to bypass product routes.

Correct paid publish path:

```text
prepare/quote
explicit confirmation
backend paid route
storage/index writes through backend service contracts
receipt returned
```

---

### [I-10] Binaries must be provenance-checked

Production sidecar binaries must be verified before execution.

Verification may include:

```text
expected path
expected hash
signature check
version check
bundle manifest check
allowlist
```

Developer mode may allow a user-selected binary with loud warnings.

Production must not execute arbitrary paths as sidecar.

---

### [I-11] No shell command runner

Sidecar supervisor must spawn known binaries with explicit args.

Forbidden command patterns:

```text
shell
eval
run arbitrary command
pipe user text into shell
execute path from deep link
execute path from webpage
execute path from untrusted settings import
```

---

### [I-12] Ports are explicit and bounded

Sidecar ports must be:

```text
configured
validated
loopback-only by default
conflict-checked
visible in diagnostics
```

Forbidden:

```text
random public bind
0.0.0.0 default bind
silent port scan
silent fallback to arbitrary port without status update
```

---

### [I-13] Logs are bounded and redacted

Logs may help diagnose.

Logs must not leak:

```text
private keys
seed material
raw capabilities
Authorization headers
bearer tokens
private alt linkage
wallet secrets
raw unredacted request bodies
```

Logs must be bounded:

```text
max bytes
max files
rotation/truncation
clear button
amnesia purge
```

---

### [I-14] Crash loops must fail safe

If sidecar crashes repeatedly:

```text
stop restarting
mark degraded
show clear status
fallback to gateway if allowed
deny sensitive routes if fallback could bypass policy
```

Do not:

```text
restart forever
spam logs
hide degraded state
switch to unsafe direct route
```

---

### [I-15] Mobile must not depend on sidecars

Mobile path must remain gateway-first.

Sidecar support is desktop-first.

Mobile may eventually use a limited embedded profile only after dedicated mobile platform work.

Do not design core app features that require local sidecar on iOS/Android.

---

### [I-16] Amnesia mode is honored

In amnesia mode:

```text
sidecar data must be memory-only or purged on shutdown where possible
logs must be session-only or aggressively cleared
persistent local node state must be disabled unless explicitly allowed
sidecar cache must not outlive policy
```

Amnesia mode must not silently persist node state.

---

### [I-17] Source labels are mandatory

User/developer diagnostics must distinguish:

```text
remote gateway
local dev gateway
bundled sidecar gateway
user-managed local node
OAP sidecar
display cache only
offline cache
```

No response should pretend all sources are identical when trust differs.

---

### [I-18] Sidecar is not QuickChain

This IDB does not implement:

```text
validators
checkpoint consensus
ROX anchors
Solana anchors
public bridge
staking
liquidity
exchange-facing node
```

QuickChain remains future after internal ROC economy is proven.

---

## 7. Supported sidecar profiles

### 7.1 Disabled profile

Default.

Topology:

```text
CrabLink Tauri → configured gateway
```

Expected behavior:

```text
no sidecar process
no local node
no local service mesh
sidecar_status returns disabled
gateway mode works
mobile works
```

---

### 7.2 Local dev stack attached

Contributor mode.

Topology:

```text
CrabLink Tauri
→ localhost svc-gateway :8090
→ local RustyOnions dev services
```

The app does not supervise the stack.

It only diagnoses it.

Allowed:

```text
health/ready checks
route diagnostics
service status panel
dev warnings
gateway-first product calls
```

Forbidden:

```text
direct service mutation
assuming dev stack is production
hiding dev labels
starting arbitrary scripts
```

---

### 7.3 Bundled micronode

Future preferred easy-local-node mode.

Topology:

```text
CrabLink Tauri
→ sidecar supervisor
→ local micronode
→ local gateway/OAP-compatible surface
```

Advantages:

```text
single process
smaller lifecycle surface
simpler logs
simpler ports
better user install path
```

Requirements:

```text
micronode must expose required route surface
health/ready/version
bounded resources
amnesia support
safe local data dir
policy boundaries
```

---

### 7.4 Bundled gateway profile

Future advanced mode.

Topology:

```text
CrabLink Tauri
→ sidecar supervisor
→ local svc-gateway
→ local omnigate
→ selected local services
```

Higher complexity.

Not first sidecar batch.

Requires:

```text
multi-process lifecycle
dependency ordering
health per service
restart policy per service
port map
data dirs per service
structured shutdown ordering
```

---

### 7.5 User-managed local node

Advanced user mode.

Topology:

```text
CrabLink Tauri
→ configured local gateway/OAP endpoint
→ user-managed RustyOnions node
```

CrabLink does not supervise it.

CrabLink may:

```text
check health
check ready
check version
display source label
use gateway/OAP route if compatible
```

CrabLink must not:

```text
kill process
rewrite config
assume provenance
assume wallet authority
```

---

## 8. Sidecar lifecycle state machine

```text
Disabled
  sidecar feature disabled

Unavailable
  platform/config does not support sidecar

Configured
  sidecar enabled and config loaded

Verifying
  binary/config/provenance checks active

ReadyToStart
  verification passed, no process running

Starting
  process spawn requested

Booting
  process running, health not ready

Healthy
  healthz ok, not fully ready

Ready
  readyz ok, route surface available

Degraded
  running but dependency/service degraded

Stopping
  graceful shutdown requested

Stopped
  process exited cleanly or not running

Crashed
  process exited unexpectedly

Backoff
  waiting before restart

CrashLoop
  restart policy exhausted

Purging
  clearing sidecar data/logs per policy
```

### 8.1 Valid transitions

```text
Disabled → Configured
Configured → Verifying
Verifying → ReadyToStart
Verifying → Unavailable
ReadyToStart → Starting
Starting → Booting
Booting → Healthy
Healthy → Ready
Ready → Degraded
Degraded → Ready
Ready → Stopping
Degraded → Stopping
Stopping → Stopped
Booting → Crashed
Healthy → Crashed
Ready → Crashed
Crashed → Backoff
Backoff → Starting
Backoff → CrashLoop
Stopped → Starting
Stopped → Purging
Purging → Stopped
```

### 8.2 Forbidden transitions

```text
Disabled → Starting
Deep link → Starting
Web content → Starting
Unverified binary → Starting
CrashLoop → Starting without user/developer action
Locked vault → silent spend route
Receipt cache → sidecar authority
```

---

## 9. Supervisor responsibilities

### 9.1 Supervisor may

```text
read sidecar config
verify binary provenance
validate args
validate ports
create data/log directories
spawn child process
poll /healthz
poll /readyz
poll /version
capture bounded stdout/stderr
restart with backoff if allowed
stop gracefully
kill after shutdown timeout
clear/purge sidecar data under policy
report safe diagnostics
```

### 9.2 Supervisor must not

```text
execute shell strings
run arbitrary user commands
run paths from crab:// links
run paths from remote content
mutate wallet/ledger
rewrite service data directly
fake health/ready
hide crash loops
store secrets in logs
```

---

## 10. Startup sequence

Recommended startup sequence:

```text
1. Load app config.
2. Determine sidecar mode.
3. If disabled, report Disabled and stop.
4. Validate platform support.
5. Validate sidecar profile.
6. Resolve binary path.
7. Verify binary provenance.
8. Validate data/log directories.
9. Validate port map and loopback bind policy.
10. Spawn sidecar process.
11. Poll /healthz.
12. Poll /readyz.
13. Poll /version / route contract endpoint where available.
14. Mark Ready or Degraded.
15. Update source selector.
```

### 10.1 Startup must not

```text
block UI indefinitely
start before user/developer enablement
auto-elevate privileges
prompt for admin/root without explicit separate design
open public firewall ports
```

---

## 11. Shutdown sequence

Recommended graceful shutdown:

```text
1. Mark Stopping.
2. Stop routing new sidecar-bound requests.
3. Let in-flight safe reads drain within deadline.
4. Send graceful shutdown signal.
5. Wait shutdown_timeout_ms.
6. Kill process if needed.
7. Close log handles.
8. Clear runtime state.
9. Purge data/logs if amnesia policy requires.
10. Mark Stopped.
```

### 11.1 Shutdown must not

```text
drop user-visible paid action ambiguity
pretend failed capture/release succeeded
delete backend truth
delete user-managed node data
purge non-sidecar directories
hang app exit forever
```

---

## 12. Restart and backoff

Restart policy should be explicit.

Suggested defaults:

```text
restart_enabled = true
max_restarts = 3
restart_window_seconds = 300
initial_backoff_ms = 500
max_backoff_ms = 10000
jitter = true
```

Rules:

```text
restart only verified binary
restart only same approved args
restart only same approved data dir
stop after crash-loop threshold
mark CrashLoop
allow manual retry after user/developer review
```

Crash-loop state must fail safe.

---

## 13. Binary provenance

### 13.1 Production binary requirements

Production sidecar binaries must be verified by at least one of:

```text
bundle manifest hash
signature
embedded known hash
release manifest
platform package signature
```

Recommended metadata:

```json
{
  "schema": "crablink.sidecar.binary-manifest.v1",
  "name": "rustyonions-micronode",
  "version": "0.1.0",
  "target": "aarch64-apple-darwin",
  "sha256": "<hex>",
  "b3": "b3:<64 lowercase hex>",
  "signed": true,
  "profile": "bundled_micronode"
}
```

### 13.2 Developer binary policy

Developer mode may allow:

```text
user-selected path
locally built binary
unsigned binary
```

But UI must label:

```text
Developer sidecar binary; provenance not production-verified.
```

Developer binary mode must not become production default.

### 13.3 Forbidden provenance shortcuts

Forbidden:

```text
download and execute without verification
execute path from settings import without confirmation
execute binary from crab:// link
execute binary from website content
execute shell wrapper from user input
```

---

## 14. Process args and environment

### 14.1 Args

Args must be constructed from typed config.

Allowed examples:

```text
--profile micronode
--http-addr 127.0.0.1:8091
--oap-addr 127.0.0.1:6091
--data-dir <validated-dir>
--log-level info
--amnesia
```

Forbidden:

```text
raw shell string
user-supplied arg blob
remote-supplied arg blob
unescaped path string in shell
```

### 14.2 Environment

Environment must be allowlisted.

Allowed examples:

```text
RUST_LOG
RON_PROFILE
RON_HTTP_ADDR
RON_DATA_DIR
RON_AMNESIA
```

Forbidden:

```text
blindly inherit all sensitive app env
inject bearer tokens into sidecar env unless specifically designed
log full env
```

### 14.3 Secrets in env

Avoid putting secrets in sidecar env.

Prefer:

```text
capability files with strict permissions
platform secure storage
loopback auth handshake
short-lived token handoff through safe channel
```

Only after dedicated design.

---

## 15. Port policy

### 15.1 Default bind

Default bind:

```text
127.0.0.1
```

Not:

```text
0.0.0.0
public interface
LAN interface
```

### 15.2 Port map

Suggested config:

```toml
[sidecar.ports]
gateway = 8091
oap = 6091
metrics = 9091
admin = 8092
```

### 15.3 Port conflict handling

On conflict:

```text
fail with clear error
show which port is occupied
do not silently bind public interface
do not silently switch ports without updating source selector
```

Optional future auto-port:

```text
allowed only if the selected port is recorded and surfaced in diagnostics
```

### 15.4 Diagnostics-only direct ports

Even when direct service URLs exist, product calls should normally use gateway-compatible route surface.

Direct ports are diagnostics-only unless a route contract says otherwise.

---

## 16. Data directory policy

### 16.1 Default location

Sidecar data should live under app-specific data directory.

Example conceptual paths:

```text
CrabLink/sidecar/<profile>/
CrabLink/sidecar-data/<profile>/
```

Do not scatter state into arbitrary user directories.

### 16.2 Directory permissions

Sidecar directories should be restricted where platform supports it.

Rules:

```text
create if missing
validate owner
avoid world-writable
avoid symlink surprises where possible
avoid following unsafe paths
```

### 16.3 Data classes

Data directory may contain:

```text
local node state
object cache
index cache
service DBs
metrics snapshots
safe config
```

Must not contain:

```text
React secrets
raw vault secrets
seed phrases
unredacted bearer tokens
private keys outside proper service/vault custody
```

### 16.4 Amnesia

In amnesia mode:

```text
use temporary directory where feasible
purge on shutdown
disable persistent DBs unless explicitly allowed
mark sidecar as amnesia
surface amnesia status in diagnostics
```

---

## 17. Log policy

### 17.1 Log capture

Supervisor may capture:

```text
stdout
stderr
structured log file
health events
lifecycle events
```

### 17.2 Log bounds

Suggested defaults:

```text
max_log_bytes = 1048576
max_log_files = 3
max_log_line_bytes = 8192
```

### 17.3 Redaction

Redact:

```text
Authorization
Bearer tokens
capability tokens
private keys
seed phrases
session secrets
wallet private material
private main→alt linkage
```

### 17.4 Developer diagnostics

Developer diagnostics may show:

```text
last N redacted log lines
process exit code
restart count
health/ready failures
port conflicts
version mismatch
```

Developer diagnostics must not become a secret dump.

---

## 18. Health and readiness

### 18.1 Health

Health answers:

```text
is the process alive and basic event loop responsive?
```

Suggested route:

```text
GET /healthz
```

### 18.2 Readiness

Readiness answers:

```text
can this sidecar serve intended route classes safely?
```

Suggested route:

```text
GET /readyz
```

### 18.3 Version

Version answers:

```text
what binary/profile/version is running?
```

Suggested route:

```text
GET /version
```

### 18.4 Route contract status

Future route contract probe may check:

```text
gateway route compatibility
OAP capabilities
wallet route availability
storage route availability
index route availability
identity route availability
```

### 18.5 Truthful status

Do not mark Ready just because the process spawned.

Minimum Ready:

```text
process running
health ok
ready ok
expected profile/version
expected endpoint
source selector updated
```

---

## 19. Source selection relation

Sidecar integrates with source selection.

Possible sources:

```text
remote_gateway
local_dev_gateway
bundled_sidecar_gateway
bundled_sidecar_oap
user_managed_gateway
user_managed_oap
cache_display_only
offline_verified_cache
```

Rules:

```text
source is attached to responses
fallback is explicit
policy/capability failure does not fallback to bypass
paid routes remain protected
wallet mutation remains protected
```

---

## 20. Gateway relation

Sidecar should expose or connect through gateway-compatible route surface first.

Preferred early local sidecar route path:

```text
CrabLink Tauri
→ local sidecar gateway endpoint
→ RustyOnions route contracts
```

This preserves:

```text
current product routes
paid gates
receipts
identity/wallet balance routes
crab:// resolver behavior
typed b3 pages
site routes
```

Gateway fallback rules:

```text
remote gateway available if sidecar unavailable
fallback only when semantics match
do not fallback to bypass policy
display source label
```

---

## 21. OAP relation

Sidecar may expose OAP in the future.

Rules:

```text
OAP is Rust-side only
OAP disabled until OAP_CLIENT_IDB gates are met
OAP does not bypass gateway semantics unless route contract permits
OAP does not bypass paid gates
OAP does not expose raw frame UI
OAP frame cap remains 1 MiB
stream chunk posture remains bounded
```

Future sidecar OAP path:

```text
React
→ TypeScript adapter
→ Tauri command
→ Rust OAP client
→ local sidecar OAP endpoint
→ service/profile route
```

---

## 22. Wallet and ledger relation

Sidecar mode may run local wallet/ledger services for development or future sovereign operation.

But the app still must route through service boundaries.

Rules:

```text
svc-wallet remains wallet mutation front-door
ron-ledger remains durable truth
CrabLink does not mutate ledger directly
receipt truth remains backend/service returned
balance truth remains backend/service returned
```

Sidecar mode must not show:

```text
local computed balance as truth
receipt cache balance as truth
uncommitted ledger mutation as success
```

---

## 23. Paid actions relation

Sidecar mode must obey `PAID_ACTIONS_AND_RECEIPTS_IDB.MD`.

Rules:

```text
no silent spend
explicit confirmation required
hold/capture/release semantics preserved
idempotency required
backend receipts required
receipt cache display-only
ambiguous timeouts require verify/status
```

Sidecar startup must not trigger paid actions.

Sidecar route reload must not trigger paid actions.

---

## 24. Passport/vault relation

Sidecar mode must obey `PASSPORT_WALLET_VAULT_IDB.MD`.

Rules:

```text
vault secrets remain Rust-side
sidecar logs do not expose secrets
capability handoff is redacted and bounded
main/alt privacy preserved
wallet links verified by backend/service route
running sidecar does not unlock vault
unlocking vault does not start sidecar
```

---

## 25. Offline cache relation

Sidecar may help populate offline cache later.

Rules:

```text
cache writes must verify b3
offline cache is not wallet truth
offline cache is not receipt truth
offline cache does not unlock paid content by itself
sidecar partial downloads are quarantined
amnesia mode purges cache where required
```

Requires `OFFLINE_CACHE_IDB.MD`.

---

## 26. Media relation

Sidecar may improve media paths later.

Rules:

```text
range reads
bounded streams
no full-file command buffering
b3 verification
cancel support
paid media gates preserved
source labels
```

Requires `MEDIA_TAURI_IDB.MD`.

---

## 27. Facet/sandbox relation

Sidecar must not run arbitrary app/code/game/algo facets by default.

Rules:

```text
facet execution disabled until FACET_SANDBOX_IDB
no arbitrary native code execution
no wallet access from facets by default
no filesystem access from facets by default
network access policy-gated
resource limits required
```

---

## 28. Mobile constraints

Sidecar is desktop-first.

Mobile default:

```text
CrabLink Tauri mobile → configured gateway
```

Mobile sidecar assumptions forbidden:

```text
always-on local process
background daemon
desktop path layout
desktop port binding
system tray status
local process supervisor
```

Future mobile local node work must define:

```text
platform lifecycle
battery constraints
sandbox limits
background limits
network switching
secure storage relation
```

---

## 29. Command boundary

### 29.1 Suggested commands

Initial safe sidecar commands:

```text
sidecar_get_status
sidecar_get_config_summary
sidecar_check_prerequisites
sidecar_get_diagnostics
```

Future lifecycle commands:

```text
sidecar_verify_binary
sidecar_start
sidecar_stop
sidecar_restart
sidecar_clear_logs
sidecar_purge_data
sidecar_open_data_dir
```

High-risk commands must be gated:

```text
sidecar_start
sidecar_restart
sidecar_purge_data
sidecar_use_developer_binary
```

### 29.2 Command rules

All sidecar commands must:

```text
use typed input
use typed output envelopes
validate config in Rust
redact errors
attach correlation ID
respect feature flags
respect platform limits
respect amnesia mode
avoid shell execution
```

### 29.3 React raw invoke ban

React route components should not call raw sidecar commands directly.

Preferred path:

```text
React component
→ sidecar hook / feature adapter
→ TypeScript command client
→ typed Tauri command
→ Rust sidecar supervisor
```

### 29.4 Forbidden command names/patterns

Forbidden:

```text
run
exec
execute
shell
eval
raw_process
raw_service
raw_wallet
raw_ledger
raw_storage
raw_index
```

---

## 30. Suggested TypeScript adapter surface

Design target:

```ts
type SidecarState =
  | 'disabled'
  | 'unavailable'
  | 'configured'
  | 'verifying'
  | 'ready_to_start'
  | 'starting'
  | 'booting'
  | 'healthy'
  | 'ready'
  | 'degraded'
  | 'stopping'
  | 'stopped'
  | 'crashed'
  | 'backoff'
  | 'crash_loop'
  | 'purging';

type SidecarProfile =
  | 'disabled'
  | 'local_dev_attached'
  | 'bundled_micronode'
  | 'bundled_gateway_profile'
  | 'user_managed_node';

type SidecarSource =
  | 'remote_gateway'
  | 'local_dev_gateway'
  | 'bundled_sidecar_gateway'
  | 'bundled_sidecar_oap'
  | 'user_managed_gateway'
  | 'user_managed_oap'
  | 'cache_display_only'
  | 'offline_verified_cache';

type SidecarStatus = {
  schema: 'crablink.sidecar-status.v1';
  enabled: boolean;
  profile: SidecarProfile;
  state: SidecarState;
  source?: SidecarSource;
  gatewayUrl?: string;
  oapEndpoint?: string;
  version?: string;
  health?: 'unknown' | 'ok' | 'failed';
  ready?: 'unknown' | 'ok' | 'failed';
  restartCount: number;
  degradedReasons: string[];
  warnings: string[];
};
```

Rules:

```text
TypeScript types are display/adapter shapes only.
They must not contain secrets.
They must not grant authority.
They must not replace backend DTOs.
```

---

## 31. Tauri Rust module targets

Likely future modules:

```text
apps/crablink-tauri/src-tauri/src/sidecar/mod.rs
apps/crablink-tauri/src-tauri/src/sidecar/types.rs
apps/crablink-tauri/src-tauri/src/sidecar/config.rs
apps/crablink-tauri/src-tauri/src/sidecar/provenance.rs
apps/crablink-tauri/src-tauri/src/sidecar/supervisor.rs
apps/crablink-tauri/src-tauri/src/sidecar/lifecycle.rs
apps/crablink-tauri/src-tauri/src/sidecar/ports.rs
apps/crablink-tauri/src-tauri/src/sidecar/health.rs
apps/crablink-tauri/src-tauri/src/sidecar/logs.rs
apps/crablink-tauri/src-tauri/src/sidecar/redact.rs
apps/crablink-tauri/src-tauri/src/sidecar/amnesia.rs
apps/crablink-tauri/src-tauri/src/sidecar/errors.rs

apps/crablink-tauri/src-tauri/src/commands/sidecar.rs
```

Potential shared source selector:

```text
apps/crablink-tauri/src-tauri/src/source_selector/mod.rs
apps/crablink-tauri/src-tauri/src/source_selector/types.rs
```

No implementation should add dependencies without reviewing CODECHECK and project dependency policy.

---

## 32. Config

Suggested config:

```toml
[sidecar]
enabled = false
profile = "disabled"
auto_start = false
desktop_only = true
allow_user_managed = true
allow_bundled_micronode = false
allow_bundled_gateway_profile = false
allow_developer_binary = false

[sidecar.binary]
path = ""
expected_b3 = ""
expected_sha256 = ""
require_signature = true
developer_unverified_allowed = false

[sidecar.network]
bind_host = "127.0.0.1"
gateway_port = 8091
oap_port = 6091
metrics_port = 9091
admin_port = 8092
allow_public_bind = false

[sidecar.lifecycle]
startup_timeout_ms = 15000
shutdown_timeout_ms = 5000
restart_enabled = true
max_restarts = 3
restart_window_seconds = 300
initial_backoff_ms = 500
max_backoff_ms = 10000

[sidecar.storage]
data_dir = ""
log_dir = ""
max_log_bytes = 1048576
max_log_files = 3

[sidecar.amnesia]
memory_only = true
purge_data_on_shutdown = true
purge_logs_on_shutdown = true

[sidecar.security]
verify_binary = true
deny_shell = true
deny_deep_link_start = true
loopback_only = true
redact_logs = true
deny_wallet_authority_inference = true

[sidecar.diagnostics]
show_status = true
show_redacted_logs = true
show_ports = true
show_version = true
```

Config rules:

```text
sidecar disabled by default
auto_start false by default
public bind false by default
shell denied always
binary verification true in production
developer binary only in developer mode
amnesia overrides persistent storage
mobile can force sidecar disabled
```

---

## 33. Error taxonomy

Suggested app-safe error classes:

```text
sidecar_disabled
sidecar_unavailable
sidecar_unsupported_platform
sidecar_config_invalid
sidecar_binary_missing
sidecar_binary_unverified
sidecar_binary_version_mismatch
sidecar_public_bind_denied
sidecar_port_conflict
sidecar_start_denied
sidecar_start_failed
sidecar_health_failed
sidecar_ready_failed
sidecar_timeout
sidecar_crashed
sidecar_crash_loop
sidecar_stop_failed
sidecar_kill_failed
sidecar_log_redacted
sidecar_log_limit_reached
sidecar_data_dir_invalid
sidecar_amnesia_purge_failed
sidecar_user_managed_unverified
sidecar_deep_link_denied
sidecar_policy_denied
sidecar_redacted_internal_error
```

### 33.1 User-facing copy examples

```text
Local node is disabled.
Local node is not supported on this platform yet.
The sidecar binary could not be verified.
The selected port is already in use.
The local node started but is not ready yet.
The local node crashed repeatedly and was stopped.
Gateway mode is still available.
This deep link cannot start local services.
```

### 33.2 Developer diagnostics

Developer diagnostics may include:

```text
state
profile
safe binary name/version
expected hash status
port map
health/ready status
exit code
restart count
redacted logs
correlation ID
```

Must not include:

```text
raw capability tokens
Authorization
private keys
seed material
private alt linkage
full unredacted request bodies
```

---

## 34. Metrics

Suggested metrics:

```text
crablink_sidecar_enabled{profile}
crablink_sidecar_state_total{state,profile}
crablink_sidecar_start_total{profile,outcome}
crablink_sidecar_stop_total{profile,outcome}
crablink_sidecar_restart_total{profile,reason}
crablink_sidecar_crash_loop_total{profile}
crablink_sidecar_health_total{profile,outcome}
crablink_sidecar_ready_total{profile,outcome}
crablink_sidecar_binary_verify_total{profile,outcome}
crablink_sidecar_port_conflict_total{profile}
crablink_sidecar_log_truncate_total{profile}
crablink_sidecar_amnesia_purge_total{profile,outcome}
crablink_sidecar_source_select_total{source,outcome}
```

Metric label safety:

```text
avoid full paths
avoid full hashes if high cardinality
avoid wallet accounts
avoid passport subjects
avoid tokens
avoid raw crab URLs
avoid private hostnames
```

---

## 35. UI requirements

### 35.1 Settings page

Sidecar settings should show:

```text
Sidecar enabled/disabled
Profile
Gateway endpoint
OAP endpoint if enabled
Binary verification status
Health
Readiness
Version
Restart count
Data/log location summary
Amnesia status
Start/Stop controls where allowed
```

### 35.2 Developer diagnostics

Developer diagnostics may show:

```text
redacted logs
port map
dependency status
last exit reason
crash-loop warning
source selector state
```

### 35.3 Normal user UI

Normal users should not be overwhelmed.

Compact display:

```text
Connection: Gateway
Local node: Off
```

or:

```text
Connection: Local node
Status: Ready
```

### 35.4 Warning copy

When enabling sidecar:

```text
This starts a local RustyOnions process on your device. The app remains a client. Wallet and ledger truth still come from RustyOnions services, and paid actions still require confirmation.
```

When developer binary is selected:

```text
Developer binary selected. This sidecar is not production-verified.
```

---

## 36. Testing matrix

### 36.1 React tests

Test:

```text
sidecar disabled display
sidecar ready display
sidecar degraded display
crash-loop warning
developer binary warning
source label display
mobile disabled state
```

### 36.2 TypeScript adapter tests

Test:

```text
status normalization
source label normalization
error mapping
safe config summary
secret field rejection
log redaction display
```

### 36.3 Rust unit tests

Test:

```text
config defaults
binary path validation
provenance check result mapping
port validation
state transitions
backoff calculation
log redaction
log truncation
amnesia purge plan
source selection integration
```

### 36.4 Rust integration tests

Test:

```text
sidecar disabled does not spawn
verified fake sidecar starts
health poll succeeds
ready poll succeeds
port conflict fails
startup timeout fails
process crash maps to Crashed
restarts stop at crash-loop
graceful stop works
kill after timeout works
logs bounded
amnesia purges temp data
```

### 36.5 Security tests

Test:

```text
deep link cannot start sidecar
web content cannot start sidecar
shell command is impossible
unverified binary denied in production
public bind denied by default
logs redact Authorization
logs redact bearer/capability tokens
sidecar ready does not grant spend authority
paid action still requires confirmation
direct ledger/storage/index commands do not exist
```

### 36.6 Smoke scripts

Recommended future smoke names:

```text
scripts/smoke-tauri-sidecar-disabled.sh
scripts/smoke-tauri-sidecar-status.sh
scripts/smoke-tauri-sidecar-start-stop.sh
scripts/smoke-tauri-sidecar-port-conflict.sh
scripts/smoke-tauri-sidecar-crash-loop.sh
scripts/smoke-tauri-sidecar-amnesia.sh
scripts/smoke-tauri-sidecar-gateway-fallback.sh
scripts/smoke-tauri-sidecar-no-silent-spend.sh
```

---

## 37. First implementation batch recommendation

### Batch S1 — Sidecar status shell

Do this after base Tauri command bridge and settings adapters exist.

Likely files:

```text
apps/crablink-tauri/src/shared/sidecar/sidecarTypes.ts
apps/crablink-tauri/src/shared/sidecar/sidecarClient.ts
apps/crablink-tauri/src/shared/sidecar/sidecarErrors.ts
apps/crablink-tauri/src/shared/sidecar/sidecarSourceLabels.ts

apps/crablink-tauri/src-tauri/src/commands/sidecar.rs
apps/crablink-tauri/src-tauri/src/sidecar/mod.rs
apps/crablink-tauri/src-tauri/src/sidecar/types.rs
apps/crablink-tauri/src-tauri/src/sidecar/config.rs
apps/crablink-tauri/src-tauri/src/sidecar/errors.rs
apps/crablink-tauri/src-tauri/src/sidecar/redact.rs
```

Initial commands:

```text
sidecar_get_status
sidecar_get_config_summary
sidecar_check_prerequisites
```

Acceptance:

```text
- Sidecar is disabled by default.
- Status returns disabled.
- React receives no secrets.
- Config summary is redacted.
- Mobile can report unsupported/disabled.
- Tests prove no process is spawned.
```

---

### Batch S2 — User-managed local node diagnostics

Scope:

```text
connect to configured local gateway
health/ready/version checks
source label user_managed_gateway
no lifecycle ownership
```

Acceptance:

```text
- App can diagnose a user-managed local gateway.
- App does not start/stop it.
- Source label is clear.
- Product calls still use gateway route contracts.
```

---

### Batch S3 — Verified fake sidecar harness

Scope:

```text
test-only fake process
health/ready endpoints
bounded logs
start/stop lifecycle
crash-loop tests
```

Acceptance:

```text
- Supervisor lifecycle works without real node complexity.
- Port conflict test passes.
- Log bounds test passes.
- Restart/backoff test passes.
```

---

### Batch S4 — Bundled micronode proof

Scope:

```text
launch real micronode-compatible binary
health/ready/version
gateway/OAP-compatible route proof
amnesia mode proof
```

Acceptance:

```text
- Binary provenance check exists.
- Process starts and stops cleanly.
- /healthz and /readyz are truthful.
- Source selector can use local gateway endpoint.
- Gateway fallback remains available.
```

---

### Batch S5 — Local gateway profile proof

Scope:

```text
optional local svc-gateway-compatible profile
selected service dependencies
route parity smoke
```

Acceptance:

```text
- Existing crab:// route behavior works through local endpoint.
- Paid gates still fail closed if wallet unavailable.
- Wallet/ledger mutation path remains svc-wallet/ron-ledger.
- No direct service mutation from UI.
```

---

## 38. Review checklist

Before approving sidecar/local node work:

```text
[ ] Is sidecar disabled by default?
[ ] Does gateway-first mode still work?
[ ] Is mobile not dependent on sidecar?
[ ] Is sidecar enablement explicit?
[ ] Can deep links not start sidecar?
[ ] Can web content not start sidecar?
[ ] Is there no shell command runner?
[ ] Are binaries provenance-checked?
[ ] Is developer binary mode clearly labeled?
[ ] Are ports loopback-only by default?
[ ] Are public binds denied by default?
[ ] Are logs bounded?
[ ] Are logs redacted?
[ ] Is crash-loop behavior fail-safe?
[ ] Are health/ready truthful?
[ ] Are source labels present?
[ ] Does sidecar not grant spend authority?
[ ] Do paid actions still require confirmation?
[ ] Does svc-wallet remain wallet front-door?
[ ] Does ron-ledger remain durable truth?
[ ] Are direct ledger/storage/index commands absent?
[ ] Is amnesia mode honored?
[ ] Is OAP still Rust-side only?
[ ] Is QuickChain/ROX/Solana scope excluded?
```

---

## 39. Product checklist

Before calling sidecar mode product-ready:

```text
[ ] Normal users can ignore it completely.
[ ] Gateway mode works without it.
[ ] Settings clearly show local node status.
[ ] Start/stop behavior is predictable.
[ ] Sidecar crashes are understandable.
[ ] Logs are useful but safe.
[ ] Ports are visible and configurable.
[ ] Binary verification is visible.
[ ] Amnesia mode is honest.
[ ] User-managed node mode is clearly different from bundled mode.
[ ] Source labels make trust source clear.
[ ] Paid actions behave exactly as safely as gateway mode.
[ ] Mobile has a clean sidecar-disabled path.
```

---

## 40. Anti-scope

Forbidden in this implementation phase:

```text
- Auto-start sidecar on first app launch.
- Start sidecar from crab:// deep link.
- Start sidecar from webpage content.
- Shell command execution.
- Arbitrary binary execution.
- Production execution of unverified binary.
- Public network bind by default.
- Hidden background server with no UI status.
- Unbounded logs.
- Secret logs.
- Localhost assumed trusted.
- Wallet spend authority inferred from sidecar running.
- Vault unlock starts sidecar automatically.
- Sidecar start unlocks vault automatically.
- Direct ron-ledger mutation from UI.
- Direct svc-storage write from UI.
- Direct svc-index write from UI.
- Paid action without confirmation.
- Fake local receipts.
- Fake local balances.
- QuickChain implementation.
- ROX/Solana/external settlement.
- Validator/staking/liquidity/exchange scope.
- Arbitrary code/facet execution.
```

---

## 41. Future expansion order

Recommended expansion order:

```text
1. Disabled status shell.
2. User-managed local gateway diagnostics.
3. Verified fake sidecar harness.
4. Real bundled micronode proof.
5. Local gateway-compatible route proof.
6. OAP sidecar proof after OAP_CLIENT_IDB gates.
7. Media range/segment sidecar proof after MEDIA_TAURI_IDB.
8. Offline verified cache support after OFFLINE_CACHE_IDB.
9. Facet execution only after FACET_SANDBOX_IDB.
10. QuickChain only after internal ROC economy is proven.
```

Do not jump directly to:

```text
full macronode service mesh
wallet mutation shortcuts
local chain/validator
media subsystem
facet execution
external settlement
```

---

## 42. Plain-English summary

Sidecar mode is how CrabLink Tauri can eventually become a sovereign local RON client.

But sovereignty does not mean chaos.

The safe rule is:

```text
The app may supervise a local RustyOnions process.
The app does not become RustyOnions.
The UI does not own backend authority.
The wallet still owns wallet mutation.
The ledger still owns economic truth.
The gateway/OAP route contracts still define service access.
```

The first sidecar goal is not to run everything.

The first sidecar goal is:

```text
prove that CrabLink can safely see, start, stop, diagnose, and source-label a local RustyOnions node without weakening any wallet, ledger, policy, receipt, or content-addressing invariant.
```
````
