
````markdown
---
title: OAP_CLIENT_IDB
version: 0.1.0
status: draft
last-updated: 2026-05-17
audience: contributors, app engineers, RustyOnions service owners, protocol reviewers, security reviewers, ops, auditors
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
  - SIDECAR_LOCAL_NODE_IDB.MD
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
  - WEB3.MD
  - WEB3_2.MD
  - NEXT_LEVEL.MD
  - QUICKCHAIN.MD
  - CODEBUNDLE_RS.md
  - ALLNOTES.MD
  - ALL_DOCS_COMBINED.MD
supersedes:
  - browser-extension-only HTTP transport assumptions
does-not-delete:
  - gateway-first compatibility mode
  - Chrome extension proof client
  - existing svc-gateway route contracts
---

# OAP_CLIENT_IDB

RO:WHAT — Defines CrabLink Tauri’s Rust-side OAP/1 client integration, source selection, gateway fallback, DTO mapping, capability handling, streaming discipline, and protocol safety gates.

RO:WHY — CrabLink Tauri needs native Rust protocol capability beyond browser HTTP, but OAP must remain a neutral transport/interoperability layer. The app must not push UI semantics, wallet truth, ledger mutation, storage ownership, or arbitrary execution into OAP.

RO:INTERACTS — CrabLink React app, TypeScript adapter layer, Tauri command bridge, Tauri Rust backend, ron-app-sdk, oap, ron-transport, ron-proto, ron-auth, svc-passport, ron-policy, svc-gateway, omnigate, svc-storage, svc-index, svc-wallet, ron-ledger, svc-edge, svc-mailbox, future sidecar/local node supervisor, future offline cache, future media pipeline.

RO:INVARIANTS — OAP is Rust-side only. React never builds OAP frames. TypeScript never owns OAP transport authority. Gateway compatibility comes first. OAP is transport/interoperability, not app semantics. No fake balances, no fake receipts, no silent spend, no direct ledger mutation, no direct storage/index mutation from UI. OAP frames are bounded. Streaming chunks are bounded. Capabilities fail closed. DTOs remain strict. Errors are typed and redacted.

RO:METRICS — OAP enablement state, HELLO outcomes, frame encode/decode outcomes, command latency, gateway/OAP source selection, fallback reason, capability failure class, timeout class, retry class, inflight count, stream chunk count, stream bytes, frame rejection reason, redaction events, and transport health.

RO:CONFIG — OAP enabled flag, gateway fallback flag, preferred source mode, endpoint(s), transport mode, TLS/Tor feature flags, timeout budget, max frame bytes, stream chunk bytes, max inflight, retry policy, capability source, amnesia mode, developer diagnostics, route allowlist, and mobile disablement policy.

RO:SECURITY — OAP command surface is allowlisted. Frames are bounded before allocation. Capabilities are scoped and redacted. Secrets never cross to React. Deep links cannot open raw OAP authority. Paid actions still require explicit confirmation and backend wallet receipts. OAP must not bypass svc-wallet, ron-ledger, policy gates, receipt truth, or backend access decisions.

RO:TEST — OAP status tests, HELLO tests, max-frame rejection tests, stream chunk tests, timeout tests, retry tests, gateway fallback tests, source-label tests, DTO mapping tests, capability failure tests, redaction tests, no-React-frame tests, no-secret-output tests, paid-flow parity tests, media bounded-transfer tests, and local-stack OAP smoke tests.

---

## 0. Status

This IDB defines the future OAP client layer for CrabLink Tauri.

It is not a request to replace gateway mode immediately.

The implementation order remains:

```text
1. Preserve gateway HTTP route behavior first.
2. Mount existing React shell in Tauri.
3. Add safe Tauri command bridge.
4. Add settings/storage adapters.
5. Preserve paid gates and receipt display.
6. Add native crab:// deep-link handling.
7. Add OAP_CLIENT_IDB.MD.
8. Add small Rust-side OAP proof commands.
9. Only then expand OAP into content/media/storage paths.
```

OAP must start as:

```text
feature-gated
Rust-side only
diagnostic/proof-capable
gateway-compatible
disabled by default until tested
```

OAP must not start as:

```text
a new app semantics layer
a local wallet
a local ledger
a storage owner
an index owner
a sidecar supervisor
a media free-for-all
a bypass around paid gates
```

---

## 1. Plain-language rule

OAP gives CrabLink Tauri a native Rust protocol path.

It does not give the UI backend authority.

Correct mental model:

```text
React asks.
TypeScript adapts.
Tauri Rust validates.
OAP/ron-app-sdk transports.
RustyOnions services answer.
Tauri Rust redacts/maps.
React renders.
```

OAP must remain:

```text
bounded
typed
capability-gated
observable
fallback-safe
policy-aware
transport-neutral
```

---

## 2. Why this IDB exists

The Chrome extension proved the product loop through `svc-gateway`:

```text
crab:// routing
typed b3 pages
public profile pages
paid content gates
paid site visits
paid image/site/post/comment/article flows
receipt-driven unlocks
gateway-routed identity and wallet reads
```

Tauri adds native Rust capability:

```text
ron-app-sdk integration
OAP/1 frame handling
ron-transport use
bounded streaming
native media transfer
future local sidecar/node route
future capability-authenticated transport
future offline verification support
```

That power needs a strict boundary because native protocol access can accidentally become:

```text
a direct service bypass
a wallet bypass
a ledger bypass
a storage bypass
a policy bypass
an unbounded media path
a secret leakage path
a React-controlled raw socket path
```

This IDB prevents that.

---

## 3. Definitions

### 3.1 OAP

OAP is the Overlay Access Protocol used by RustyOnions for typed service interoperability.

For CrabLink Tauri, OAP is a Rust-side transport/protocol path.

It is not:

```text
React API
TypeScript socket library
wallet engine
ledger engine
storage engine
index engine
site renderer
media player
arbitrary plugin runtime
```

---

### 3.2 ron-app-sdk

`ron-app-sdk` is the app-facing SDK boundary that should own typed calls, retry behavior, deadlines, idempotency handling, tracing/correlation, and transport selection where appropriate.

CrabLink Tauri should prefer:

```text
Tauri Rust command
→ OAP adapter / ron-app-sdk helper
→ ron-transport
→ service
```

over hand-rolled ad hoc protocol logic.

---

### 3.3 ron-transport

`ron-transport` is the transport abstraction below OAP.

It may support:

```text
TLS
Tor/Arti when feature-gated
timeouts
idle caps
connection policy
```

CrabLink Tauri should not directly expose transport internals to React.

---

### 3.4 Gateway fallback

Gateway fallback means that when OAP is disabled, unavailable, unsupported, or fails closed, CrabLink Tauri can use the proven `svc-gateway` HTTP route path.

Fallback must be explicit and source-labeled.

Fallback must not silently change semantics.

---

### 3.5 Source label

A source label identifies which transport path produced a response.

Examples:

```text
gateway
oap
sidecar_oap
cache_display_only
offline_unverified
```

Every sensitive result should carry a source label.

---

### 3.6 Capability bytes

Capability bytes are auth/capability material carried through OAP where the protocol/service contract permits.

Capability bytes are secret or sensitive unless proven otherwise.

They must not be shown to React.

They must not be logged.

They must not be stored in settings.

---

### 3.7 DTO mapping

DTO mapping is the boundary between backend wire DTOs and app-safe display structures.

`ron-proto` DTOs remain strict.

CrabLink display models are adapters, not backend truth.

---

### 3.8 Frame

An OAP frame is a bounded protocol unit.

The app must reject oversized frames before allocation.

---

### 3.9 Stream chunk

A stream chunk is a bounded piece of a larger transfer.

Recommended streaming chunk posture:

```text
64 KiB chunks
```

A stream chunk is not the same as the maximum OAP frame.

---

### 3.10 Max frame

OAP max frame:

```text
1 MiB
```

This cap must be enforced in client-side encoding/decoding.

---

### 3.11 App protocol ID

An app protocol ID identifies a specific protocol/application payload class in OAP.

CrabLink Tauri must not invent IDs casually.

Use existing RustyOnions protocol definitions or explicitly feature-gated experimental IDs.

---

### 3.12 HELLO

HELLO negotiates capabilities and protocol limits.

The client must not assume a service supports OAP or a desired feature before HELLO succeeds.

---

### 3.13 START/DATA/ACK/END

Streaming flow shape:

```text
START
DATA*
ACK*
END
```

Exact details must follow the RustyOnions OAP crate and service contracts.

---

## 4. Non-negotiable invariants

### [I-1] OAP is Rust-side only

React must never construct, parse, inspect, or send raw OAP frames.

Allowed:

```text
React requests "resolve this crab URL"
React requests "fetch this asset"
React requests "check OAP status"
React requests "download media preview"
```

Forbidden:

```text
React builds OAP frame bytes
React passes raw frame bytes
React chooses arbitrary app_proto_id
React passes raw capability bytes
React opens OAP sockets
React decodes protocol envelopes
```

---

### [I-2] TypeScript is an adapter, not a transport owner

TypeScript may:

```text
call typed Tauri command wrappers
normalize UI-safe parameters
render source labels
route UI fallbacks
```

TypeScript must not:

```text
own OAP transport
own raw socket state
own capability bytes
own private keys
own wallet truth
own ledger truth
invent frame retries
```

---

### [I-3] Gateway compatibility comes first

The first Tauri version must preserve the proven gateway path.

OAP is additive.

OAP must not break:

```text
crab:// route resolution
typed b3 asset pages
paid gates
receipt display
identity bootstrap
wallet balance reads
image/site/post/comment/article route compatibility
```

If OAP behavior differs from gateway behavior, the app must fail closed or show explicit source differences.

---

### [I-4] OAP does not own app semantics

OAP must not absorb:

```text
paid action policy
receipt truth
wallet mutation rules
ledger conservation
site rendering policy
asset ownership policy
profile privacy
alt passport privacy
storage ownership
index naming truth
facet execution rules
```

Those remain in their owning services and blueprints.

---

### [I-5] No backend bypass

OAP must not become a way for CrabLink to bypass `svc-gateway`, `omnigate`, `svc-wallet`, `svc-passport`, policy, or route contracts.

Allowed future paths:

```text
OAP to gateway-equivalent service surface
OAP to local sidecar surface that enforces same policy
OAP to read-only object service when capability permits
OAP to media/range service when policy permits
```

Forbidden:

```text
OAP directly mutates ron-ledger
OAP directly mutates storage from UI intent without paid/product route proof
OAP directly writes index pointers from UI intent without product route proof
OAP bypasses wallet receipts
OAP bypasses policy gates
```

---

### [I-6] Frame bounds are mandatory

Client must enforce:

```text
max frame = 1 MiB
```

Rules:

```text
check bounds before allocation
reject oversized outgoing payloads before encoding
reject oversized incoming frames before buffering
map rejection to typed error
count rejection in metrics
```

---

### [I-7] Stream chunks are bounded

Recommended streaming chunk size:

```text
64 KiB
```

Rules:

```text
large objects use chunked streaming
media paths do not full-buffer through command bridge
storage/media adapters keep bounded buffers
progress events are safe and low-cardinality
```

---

### [I-8] No locks across await

OAP client code must not hold locks across `.await`.

Patterns:

```text
lock → copy/extract needed state → drop lock → await
single writer per connection
bounded channels only
explicit cancellation
supervised task handles
```

---

### [I-9] Capabilities fail closed

If capability state is:

```text
missing
expired
malformed
unavailable
vault locked
policy denied
backend denied
```

the OAP command must fail closed.

No fallback may silently grant more authority than the failed OAP path.

---

### [I-10] Secrets do not cross to React

OAP command outputs may include:

```text
safe source label
safe status
safe route class
safe correlation ID
safe redacted error class
safe content metadata
safe receipt proof returned by backend
```

OAP command outputs must not include:

```text
capability bytes
private keys
seed material
raw Authorization
raw bearer token
raw vault handles
raw transport session keys
private main→alt linkage
```

---

### [I-11] DTOs remain strict

OAP payloads should use strict DTOs.

Rules:

```text
prefer ron-proto DTOs
deny unknown fields where backend contract expects strict DTOs
version display DTOs separately from backend wire DTOs
do not let React submit arbitrary JSON into OAP
do not store raw backend DTOs as app truth without source label
```

---

### [I-12] b3 remains canonical

Objects and manifests remain content-addressed.

When OAP returns content bytes or manifests, the app must preserve b3 rules:

```text
b3:<64 lowercase hex>
verify full digest before trusted cache/storage
names are pointers
hashes are canonical
```

---

### [I-13] Paid actions still require explicit confirmation

OAP may transport a paid action request only after the paid-action flow permits it.

OAP must not enable:

```text
auto-pay on route open
auto-pay on media load
auto-pay on deep link
auto-capture without backend route proof
silent retry that double-spends
```

---

### [I-14] Receipts remain backend-derived

OAP may return backend receipts.

OAP must not generate local receipts.

Local receipt display cache remains display-only.

---

### [I-15] Mobile remains gateway-first unless proven otherwise

Mobile OAP may be future work.

Do not make early CrabLink mobile architecture depend on:

```text
local sidecar
raw socket support
desktop-only transport assumptions
always-on background protocol sessions
```

---

## 5. Architecture

### 5.1 Layer model

```text
React UI
  ↓
TypeScript command adapter
  ↓
Tauri command bridge
  ↓
Rust OAP client adapter
  ↓
ron-app-sdk / oap / ron-transport
  ↓
svc-gateway-compatible OAP service surface
  ↓
RustyOnions services
```

Fallback path:

```text
React UI
  ↓
TypeScript gateway adapter / Tauri gateway command
  ↓
Tauri gateway client
  ↓
svc-gateway HTTP
  ↓
RustyOnions services
```

### 5.2 Source selection

Source selection should be centralized.

Do not let each page independently decide protocol paths.

Recommended source selector:

```text
transport_source = gateway | oap | sidecar_oap | disabled
```

Decision inputs:

```text
config
platform
run mode
feature flags
HELLO result
capability availability
route support
user/developer override
policy status
```

### 5.3 Source labels

Every response from the transport layer should include a safe source label:

```json
{
  "source": "gateway",
  "source_status": "backend_confirmed"
}
```

or:

```json
{
  "source": "oap",
  "source_status": "backend_confirmed"
}
```

or:

```json
{
  "source": "cache_display_only",
  "source_status": "not_backend_verified"
}
```

---

## 6. Runtime modes

### 6.1 Gateway mode

Default mode.

```text
CrabLink Tauri → svc-gateway HTTP
```

Use for:

```text
normal users
mobile users
first Tauri build
route parity
paid gates
identity/wallet proof
```

### 6.2 OAP client mode

Future feature-gated mode.

```text
CrabLink Tauri Rust → OAP/ron-transport → service surface
```

Requirements:

```text
OAP enabled in config
HELLO succeeds
route is OAP-supported
capability state is valid
gateway fallback policy is defined
source label is visible
tests are green
```

### 6.3 Hybrid mode

Hybrid mode allows selected read paths to use OAP while sensitive routes remain gateway-first.

Example:

```text
gateway:
  paid actions
  wallet mutation
  identity bootstrap

oap:
  health/protocol status
  safe object reads
  media range transfer
  service diagnostics
```

Hybrid mode must not split semantic truth.

### 6.4 Sidecar OAP mode

Future mode after `SIDECAR_LOCAL_NODE_IDB.MD`.

```text
CrabLink Tauri → supervised local sidecar → OAP service surface
```

Rules:

```text
sidecar disabled by default
sidecar supervised explicitly
sidecar does not grant wallet authority
sidecar uses same policy boundaries
```

### 6.5 Mobile mode

Mobile default remains gateway-first.

OAP mobile support must be separately tested for:

```text
iOS lifecycle
Android lifecycle
background restrictions
socket limits
battery impact
network changes
TLS store behavior
```

---

## 7. OAP client state machine

```text
Disabled
  OAP feature disabled

Unavailable
  platform/config/dependency unavailable

Configured
  endpoint and config loaded

Connecting
  transport connection attempt active

Hello
  HELLO negotiation active

Ready
  HELLO succeeded and route support known

Degraded
  connection exists but capabilities/latency/errors degraded

Fallback
  using gateway because OAP unavailable or denied

Closing
  graceful shutdown

Closed
  no active OAP connection
```

### 7.1 Valid transitions

```text
Disabled → Unavailable
Unavailable → Configured
Configured → Connecting
Connecting → Hello
Hello → Ready
Hello → Fallback
Ready → Degraded
Ready → Closing
Degraded → Fallback
Degraded → Closing
Fallback → Configured
Closing → Closed
Closed → Configured
```

### 7.2 Forbidden transitions

```text
Disabled → Ready
Unavailable → Ready
Fallback → privileged mutation without backend confirmation
Deep link → Ready with new authority
React action → raw OAP frame
Cache hit → OAP authority
```

---

## 8. HELLO requirements

### 8.1 HELLO purpose

HELLO must establish:

```text
protocol version
max frame
max inflight
supported flags
supported app protocol IDs
transport hints
service identity when available
capability requirements
```

### 8.2 HELLO acceptance

Client must reject or degrade if:

```text
version unsupported
max_frame exceeds client policy
max_frame below needed route requirement
required flags unsupported
route app protocol unsupported
service identity mismatch
capability requirement cannot be met
```

### 8.3 HELLO output to UI

React may see safe status:

```text
OAP: Ready
OAP: Disabled
OAP: Fallback to gateway
OAP: Unsupported by service
OAP: Capability required
```

React must not see raw HELLO internals containing sensitive data.

### 8.4 HELLO cache

HELLO capability results may be cached in memory.

Persistent cache is optional and should be safe only.

Do not persist:

```text
capability bytes
transport secrets
session keys
private peer identity secrets
```

---

## 9. START/DATA/ACK/END flow

### 9.1 START

START begins a stream or request requiring context.

START may carry capability material if OAP contract permits.

Rules:

```text
validate route class
validate expected content size if known
validate target b3/crab URL
validate capability availability
validate max inflight
assign correlation ID
```

### 9.2 DATA

DATA carries bounded payload chunks.

Rules:

```text
prefer 64 KiB chunks
never exceed max frame
backpressure before buffering
stream to bounded sink
update progress safely
verify b3 on completion where applicable
```

### 9.3 ACK

ACK is used where route/stream contract requires acknowledgement.

Rules:

```text
respect ACK_REQ
do not fake ACK for unprocessed data
bound ACK state
handle duplicate ACKs deterministically
```

### 9.4 END

END completes the stream.

Rules:

```text
finalize digest verification
finalize content length check
finalize receipt/unlock state only if backend contract returns it
release stream resources
emit completion metric
```

### 9.5 Error cleanup

On stream error:

```text
cancel stream
drop partial untrusted bytes or mark quarantine
do not write verified cache entry
do not unlock content
do not persist receipt unless backend returned one
surface safe error
```

---

## 10. Frame and buffer discipline

### 10.1 Constants

```text
OAP max frame: 1 MiB
Preferred streaming chunk: 64 KiB
```

### 10.2 Outgoing payloads

Before sending:

```text
measure encoded size
reject if over max frame
split large payloads into stream chunks
attach correlation ID
attach idempotency key where mutation route requires it
```

### 10.3 Incoming payloads

Before allocation:

```text
read length
compare against max frame
reject if over cap
reject malformed flags
reject invalid sequence
reject unsupported app protocol
```

### 10.4 Compression

Compression must be bounded.

Rules:

```text
do not decompress before cap checks
enforce ratio and absolute output cap
map compression failure to typed error
count compression rejection
```

### 10.5 Command bridge buffers

The command bridge must not carry large media/object bytes as one giant JSON value.

Use:

```text
stream handles
bounded file/cache sinks
progress events
range reads
content-address verification
```

Do not use:

```text
base64 giant payload in React
full media file in command result
unbounded Vec<u8>
unbounded channel
```

---

## 11. Route classes

### 11.1 Safe diagnostic routes

Examples:

```text
oap_status
oap_hello
oap_capabilities
```

May be first OAP proof commands.

### 11.2 Safe read routes

Examples:

```text
resolve object metadata
read public object by b3
fetch manifest by b3
read public profile manifest
```

Rules:

```text
verify b3 where relevant
no paid bypass
source label required
gateway parity required
```

### 11.3 Paid read routes

Examples:

```text
paid content view
paid media segment
paid article body
paid site route
```

Rules:

```text
must preserve paid gate
must preserve explicit confirmation where spend is required
must preserve backend unlock decision
receipt remains backend-derived
```

### 11.4 Mutating publish/write routes

Examples:

```text
publish image
publish post
publish comment
publish article
write manifest
write site pointer
paid storage put
```

Rules:

```text
feature-gated
idempotent
policy-gated
paid-action-aware
not first OAP batch
must use backend product route semantics
```

### 11.5 Wallet routes

Wallet routes are high-risk.

Rules:

```text
default gateway-first
OAP wallet reads only after dedicated tests
OAP wallet mutations forbidden until wallet route contract explicitly allows
paid-action confirmation still required
svc-wallet remains front-door
ron-ledger remains backend-only
```

### 11.6 Raw routes

Forbidden:

```text
raw_oap
raw_frame
raw_socket
raw_wallet
raw_ledger
raw_storage
raw_index
raw_service_call
```

No debug panel should expose raw arbitrary OAP send.

---

## 12. Command boundary

### 12.1 Initial OAP commands

Recommended first commands:

```text
oap_status
oap_hello
oap_get_capabilities
oap_check_route_support
```

### 12.2 Later safe read commands

```text
oap_resolve_crab_url
oap_get_object_metadata
oap_get_manifest
oap_get_public_profile
oap_fetch_b3_to_cache
```

### 12.3 Later stream commands

```text
oap_stream_object_to_cache
oap_stream_media_range
oap_verify_streamed_b3
oap_cancel_stream
```

### 12.4 Commands requiring later IDBs

Requires `PAID_ACTIONS_AND_RECEIPTS_IDB.MD`:

```text
oap_prepare_paid_action
oap_execute_paid_action
```

Requires `PASSPORT_WALLET_VAULT_IDB.MD`:

```text
oap_use_vault_capability
oap_refresh_capability
```

Requires `SIDECAR_LOCAL_NODE_IDB.MD`:

```text
oap_connect_sidecar
oap_sidecar_health
```

Requires `MEDIA_TAURI_IDB.MD`:

```text
oap_stream_media_segment
oap_prefetch_media_range
```

Requires `OFFLINE_CACHE_IDB.MD`:

```text
oap_cache_verified_object
oap_open_cached_verified_object
```

### 12.5 Command output envelope

Use standard command bridge envelope.

Example success:

```json
{
  "ok": true,
  "correlation_id": "cl_...",
  "source": "oap",
  "data": {
    "status": "ready"
  },
  "warnings": []
}
```

Example fallback:

```json
{
  "ok": true,
  "correlation_id": "cl_...",
  "source": "gateway",
  "data": {
    "status": "ready"
  },
  "warnings": [
    "OAP unavailable; used gateway fallback."
  ]
}
```

Example error:

```json
{
  "ok": false,
  "correlation_id": "cl_...",
  "source": "oap",
  "error": {
    "code": "oap_frame_too_large",
    "message": "OAP frame exceeded the configured limit.",
    "retryable": false,
    "redacted": true
  }
}
```

---

## 13. Source selection rules

### 13.1 Selection order

Recommended default order:

```text
1. If route requires gateway, use gateway.
2. If OAP disabled, use gateway.
3. If platform disallows OAP, use gateway.
4. If HELLO has not succeeded, use gateway or show unavailable depending on route.
5. If route is OAP-supported and safe, use OAP.
6. If OAP fails with retryable transport error, fallback only if semantics are identical.
7. If OAP fails with policy/capability error, do not fallback to bypass policy.
```

### 13.2 Fallback allowed

Fallback may be allowed for:

```text
health/ready/version
public route resolution
public object metadata
public manifest fetch
read-only profile fetch
```

### 13.3 Fallback denied

Fallback must be denied or carefully gated for:

```text
paid execution
wallet mutation
publish/write
private capability route
vault-backed route
identity link route
admin route
```

### 13.4 Fallback visibility

The UI should show developer-safe source status:

```text
Source: Gateway
Source: OAP
Source: OAP unavailable; gateway fallback used
```

For normal users, this can be compact.

For developer diagnostics, show more detail with secrets redacted.

---

## 14. Capability handling

### 14.1 Capability source

Capability material may come from:

```text
backend-issued session
vault-protected capability
dev-only bearer/cap token
future passport capability refresh
```

### 14.2 Capability storage

Allowed:

```text
vault
memory-only session state
platform secure storage through vault adapter
```

Forbidden:

```text
React state
TypeScript state
settings JSON
receipt cache
local catalog
URL params
logs
metrics labels
debug panels
```

### 14.3 Capability use

Before using capability material:

```text
check vault/unlock requirement
check expiration
check scope
check target route
check active passport context
check wallet-link context if relevant
```

### 14.4 Capability failure

Capability failure maps to:

```text
capability_missing
capability_expired
capability_scope_denied
capability_vault_locked
capability_policy_denied
```

No capability failure may be bypassed by falling back to a less secure route.

---

## 15. DTO mapping

### 15.1 Backend DTOs

Backend DTOs belong to:

```text
ron-proto
service-specific route contracts
OAP app protocol contracts
```

### 15.2 App display DTOs

CrabLink display DTOs may include:

```text
safe status
safe source label
safe route class
safe b3 ID
safe crab URL
safe manifest summary
safe receipt proof fields returned by backend
```

### 15.3 Mapping rules

```text
backend DTO → validate → normalize → display DTO
```

Do not:

```text
display unvalidated backend JSON as truth
store raw DTOs with secrets
let React send arbitrary backend DTOs
let TypeScript invent backend status
```

### 15.4 Unknown fields

Strict route contracts should deny unknown fields.

When compatibility requires permissive parsing:

```text
ignore only safe optional fields
preserve unknowns only in developer diagnostics if redacted
never treat unknown fields as authority
```

---

## 16. Error taxonomy

Recommended app-safe error classes:

```text
oap_disabled
oap_unavailable
oap_config_invalid
oap_connect_failed
oap_hello_failed
oap_version_unsupported
oap_route_unsupported
oap_frame_too_large
oap_frame_malformed
oap_sequence_invalid
oap_timeout
oap_retry_exhausted
oap_backpressure
oap_inflight_limit
oap_compression_denied
oap_capability_missing
oap_capability_expired
oap_capability_denied
oap_policy_denied
oap_gateway_fallback_used
oap_gateway_fallback_denied
oap_transport_degraded
oap_stream_cancelled
oap_stream_digest_mismatch
oap_stream_incomplete
oap_redacted_internal_error
```

### 16.1 User-facing copy

Examples:

```text
OAP is disabled. Using gateway mode.
Native protocol path is unavailable. Using gateway mode.
This service does not support the requested OAP route.
The response exceeded the safe protocol limit.
This stream failed verification and was not cached.
This action requires a valid capability.
This route cannot fall back because that could bypass policy.
```

### 16.2 Developer details

Developer details may include:

```text
correlation ID
source label
route class
retry count
timeout class
safe service name
safe protocol version
safe frame limit
safe stream byte count
```

Developer details must not include:

```text
capability bytes
tokens
private keys
transport secrets
private alt linkage
raw sensitive payload
```

---

## 17. Idempotency and retries

### 17.1 Read retries

Read retries may use bounded retry policy:

```text
max attempts configured
jittered backoff
respect Retry-After where applicable
preserve correlation chain
```

### 17.2 Mutating retries

Mutating OAP routes must use idempotency.

Rules:

```text
never retry mutation without idempotency
never create new idempotency key for same retry
never retry paid action after ambiguous failure without verify/status path
never hide retry from receipt/pending state
```

### 17.3 Timeout ambiguity

If a mutating request times out:

```text
do not assume failure
do not assume success
show verify status
use receipt/status lookup when available
```

---

## 18. Observability

### 18.1 Metrics

Suggested metrics:

```text
crablink_oap_enabled{mode}
crablink_oap_hello_total{outcome}
crablink_oap_source_select_total{source,route_class,outcome}
crablink_oap_fallback_total{reason,outcome}
crablink_oap_frame_reject_total{reason}
crablink_oap_stream_chunk_total{route_class,outcome}
crablink_oap_stream_bytes_total{route_class}
crablink_oap_command_latency_ms{command,source}
crablink_oap_capability_failure_total{reason}
crablink_oap_redaction_total{field_class}
```

### 18.2 Metric label safety

Do not include:

```text
full b3 hash
full crab URL
full txid
receipt hash
passport subject
wallet account
capability token
IP/host if private policy forbids
```

Use route classes:

```text
health
resolve
object_read
manifest_read
media_stream
paid_prepare
paid_execute
identity
wallet_read
```

### 18.3 Logs

Logs must be:

```text
structured
redacted
correlated
bounded
source-labeled
```

Logs must not contain:

```text
raw frame payloads
capability bytes
Authorization
private keys
seed material
unredacted backend errors
```

---

## 19. Config

Suggested config:

```toml
[oap]
enabled = false
source_preference = "gateway_first"
allow_gateway_fallback = true
endpoint = ""
transport = "tls"
max_frame_bytes = 1048576
stream_chunk_bytes = 65536
max_inflight = 64
connect_timeout_ms = 3000
request_timeout_ms = 5000
idle_timeout_ms = 30000
retry_attempts = 2
developer_diagnostics = true

[oap.routes]
health = "gateway_or_oap"
resolve = "gateway_or_oap"
object_read = "gateway_or_oap"
manifest_read = "gateway_or_oap"
media_stream = "oap_when_available"
paid_actions = "gateway_first"
wallet_mutation = "gateway_only"
identity_bootstrap = "gateway_only"
publish_write = "gateway_first"

[oap.security]
redact_errors = true
deny_raw_frames = true
deny_react_frames = true
deny_policy_bypass_fallback = true
deny_unbounded_payloads = true
require_capabilities_for_private_routes = true

[oap.amnesia]
persist_hello_cache = false
persist_transport_state = false
clear_session_on_shutdown = true
```

Config rules:

```text
production default starts gateway-first
OAP disabled until tested
wallet mutation remains gateway-only until route contract changes
paid actions remain gateway-first until paid OAP route contract is proven
amnesia disables persistent protocol state
mobile may force gateway-first
```

---

## 20. Security model

### 20.1 Threats

Threats this IDB addresses:

```text
React raw-frame injection
capability leakage
oversized frame allocation
unbounded media buffering
policy bypass through fallback
wallet mutation bypass
ledger mutation bypass
storage/index write bypass
malicious deep link triggering OAP
debug panel leaking secrets
malformed service response
downgrade to insecure transport
silent route semantics change
```

### 20.2 Defenses

Defenses:

```text
Rust-side only OAP
typed command bridge
allowlisted commands
strict route classes
bounded frames
bounded chunks
capability redaction
source labels
gateway fallback policy
no raw frame command
no direct service mutation from UI
DTO validation
b3 verification
redacted errors
```

---

## 21. Deep-link relation

Deep links may open routes.

Deep links must not:

```text
enable OAP
change OAP endpoint
select raw OAP route
provide capability bytes
trigger private OAP calls
trigger paid OAP execution
trigger wallet mutation
bypass confirmation
```

Deep links may:

```text
navigate to crab:// route
pre-fill safe draft
open paid gate
open receipt lookup page
```

---

## 22. Paid-actions relation

OAP must obey `PAID_ACTIONS_AND_RECEIPTS_IDB.MD`.

Rules:

```text
no silent spend
explicit confirmation required
backend receipt required
receipt cache display-only
hold/capture/release semantics preserved
idempotency required
ambiguous timeout requires verify/status
```

OAP paid actions are future-gated.

Initial implementation should keep paid actions gateway-first.

---

## 23. Passport/vault relation

OAP must obey `PASSPORT_WALLET_VAULT_IDB.MD`.

Rules:

```text
React sees no secrets
capabilities come from vault or backend session
vault lock blocks privileged capability use
main/alt privacy preserved
wallet link verified by backend
no raw capability output
```

OAP must not make hidden main→alt linkage public.

---

## 24. Offline-cache relation

OAP may feed verified cache in the future.

Rules:

```text
verify b3 before trusted cache write
source-label cache entries
do not cache private data without cache policy
do not unlock paid content solely from cache
do not mark partial stream as verified
```

Offline cache requires `OFFLINE_CACHE_IDB.MD`.

---

## 25. Media relation

OAP is likely important for serious media.

Rules:

```text
range/segment transfer
bounded chunks
no full-file command bridge buffering
digest verification
safe progress events
cancel support
source labeling
paid media gates preserved
```

Media use requires `MEDIA_TAURI_IDB.MD`.

---

## 26. Sidecar relation

OAP sidecar mode is future work.

Rules:

```text
sidecar disabled by default
sidecar has its own IDB
sidecar supervision explicit
sidecar health source-labeled
sidecar does not grant silent wallet authority
sidecar OAP routes enforce same policy
```

---

## 27. Mobile-forward constraints

Do not assume:

```text
long-running background sockets
desktop filesystem paths
system tray lifecycle
desktop-only TLS store
local sidecar
hover-based diagnostics
large always-on stream buffers
```

Mobile OAP must be:

```text
optional
gateway-fallback capable
lifecycle-aware
battery-aware
network-change-aware
bounded
```

---

## 28. First implementation batch recommendation

### Batch O1 — OAP status shell

Do this after base Tauri command bridge exists.

Likely files:

```text
apps/crablink-tauri/src/shared/oap/oapTypes.ts
apps/crablink-tauri/src/shared/oap/oapClient.ts
apps/crablink-tauri/src/shared/oap/oapErrors.ts
apps/crablink-tauri/src/shared/oap/oapSourceLabels.ts

apps/crablink-tauri/src-tauri/src/commands/oap.rs
apps/crablink-tauri/src-tauri/src/oap_client/mod.rs
apps/crablink-tauri/src-tauri/src/oap_client/types.rs
apps/crablink-tauri/src-tauri/src/oap_client/config.rs
apps/crablink-tauri/src-tauri/src/oap_client/source.rs
apps/crablink-tauri/src-tauri/src/oap_client/errors.rs
apps/crablink-tauri/src-tauri/src/oap_client/redact.rs
```

Initial commands:

```text
oap_status
oap_feature_status
oap_config_summary
```

Acceptance:

```text
- OAP status returns disabled by default.
- React receives no protocol secrets.
- Config summary is redacted.
- Source preference says gateway-first.
- Tests prove raw frame command does not exist.
```

---

### Batch O2 — HELLO proof command

Scope:

```text
feature-gated HELLO
no app data routes yet
no paid actions
no wallet routes
no media streams
```

Acceptance:

```text
- HELLO succeeds against compatible local service.
- HELLO failure maps to typed error.
- Max frame is checked.
- Max inflight is recorded safely.
- Result is source-labeled.
- Gateway fallback remains available.
```

---

### Batch O3 — Safe read proof

Scope:

```text
read-only public route through OAP
gateway parity comparison
b3 verification where bytes are returned
```

Acceptance:

```text
- Public b3 object or manifest can be fetched through OAP.
- Same route still works through gateway.
- Source label visible.
- Digest mismatch rejects cache write.
- No paid gate bypass.
```

---

### Batch O4 — Stream proof

Scope:

```text
bounded stream to cache/file sink
64 KiB chunk posture
cancel support
progress events
digest verification
```

Acceptance:

```text
- Large object streams without command bridge full buffering.
- Cancel cleans up partial bytes.
- Verified b3 is required before trusted cache entry.
- Progress events leak no secrets.
```

---

### Batch O5 — Gateway/OAP route selector

Scope:

```text
central source selector
route classes
fallback policy
developer diagnostics
```

Acceptance:

```text
- Route classes choose source deterministically.
- Fallback cannot bypass capability/policy error.
- Paid/wallet routes remain gateway-first unless explicitly enabled.
```

---

## 29. Testing matrix

### 29.1 Rust unit tests

Test:

```text
config defaults
disabled status
source selection
frame cap check
chunk size config
redaction
error mapping
route class fallback
```

### 29.2 Rust integration tests

Test:

```text
HELLO success
HELLO unsupported version
HELLO unsupported route
connection timeout
gateway fallback
capability missing
frame too large
malformed frame
stream cancel
digest mismatch
```

### 29.3 TypeScript tests

Test:

```text
safe status normalization
source label rendering
error class mapping
no secret field rendering
gateway fallback warning
route class display
```

### 29.4 React tests

Test:

```text
OAP disabled state
OAP ready state
OAP fallback state
developer diagnostics redacted
source chip display
no raw frame UI
```

### 29.5 Security tests

Test:

```text
React cannot send raw frames
deep link cannot enable OAP
deep link cannot set endpoint
capability bytes do not cross bridge
oversized frame rejected before allocation
fallback denied on policy error
wallet mutation unavailable through OAP proof batch
paid action unavailable without paid-action confirmation
```

### 29.6 Smoke scripts

Recommended future scripts:

```text
scripts/smoke-tauri-oap-status.sh
scripts/smoke-tauri-oap-hello.sh
scripts/smoke-tauri-oap-gateway-fallback.sh
scripts/smoke-tauri-oap-read-proof.sh
scripts/smoke-tauri-oap-stream-proof.sh
scripts/smoke-tauri-oap-no-raw-frame.sh
```

---

## 30. Review checklist

Before approving OAP client code:

```text
[ ] Is OAP Rust-side only?
[ ] Does React avoid raw frames?
[ ] Does TypeScript avoid transport ownership?
[ ] Is gateway compatibility preserved?
[ ] Is OAP disabled by default?
[ ] Is source selection centralized?
[ ] Are source labels present?
[ ] Is max frame 1 MiB enforced?
[ ] Are stream chunks bounded?
[ ] Are buffers bounded?
[ ] Are oversized frames rejected before allocation?
[ ] Are locks dropped before await?
[ ] Are capabilities redacted?
[ ] Do capabilities fail closed?
[ ] Are DTOs strict?
[ ] Is b3 verified before trusted cache writes?
[ ] Are paid routes still confirmation-gated?
[ ] Are receipts backend-derived only?
[ ] Are wallet mutations not exposed through OAP proof batch?
[ ] Does fallback avoid policy bypass?
[ ] Are errors typed and redacted?
[ ] Are metrics safe?
[ ] Does mobile remain gateway-first if OAP is unavailable?
[ ] Is sidecar OAP gated behind sidecar IDB?
[ ] Is media streaming gated behind media IDB?
[ ] Is offline cache gated behind offline cache IDB?
```

---

## 31. Product checklist

Before calling OAP client product-ready:

```text
[ ] Normal users can still use gateway mode.
[ ] OAP disabled state is truthful.
[ ] OAP ready state is truthful.
[ ] Gateway fallback is understandable.
[ ] Source labels are visible in diagnostics.
[ ] Route parity with gateway is tested.
[ ] Paid gates still work.
[ ] Receipt display still works.
[ ] Wallet balance remains backend-derived.
[ ] No raw protocol UI exists.
[ ] Large objects do not freeze UI.
[ ] Stream cancel works.
[ ] Digest mismatch is clearly rejected.
[ ] Mobile path remains viable without OAP.
```

---

## 32. Anti-scope

Forbidden in the first OAP implementation phase:

```text
- React raw OAP frames.
- TypeScript raw OAP transport.
- Raw frame debug console.
- Arbitrary OAP route sender.
- Direct ron-ledger mutation.
- Direct svc-wallet mutation outside route contract.
- Direct storage/index mutation from UI intent.
- Paid action execution without explicit confirmation.
- Receipt generation in app.
- Local balance truth.
- Policy bypass by fallback.
- Capability bytes in React.
- Capability bytes in logs.
- OAP endpoint change from deep link.
- Sidecar auto-start.
- Full-file media buffering through command result.
- Offline paid unlock from cached OAP result.
- QuickChain implementation.
- ROX/Solana/bridge/staking/liquidity scope.
- Arbitrary code execution over OAP.
```

---

## 33. Future expansion order

Recommended expansion order:

```text
1. OAP disabled/status shell.
2. HELLO proof.
3. Safe read proof.
4. Gateway/OAP route selector.
5. Stream-to-cache proof.
6. Public manifest/profile reads.
7. Media segment/range reads after MEDIA_TAURI_IDB.
8. Offline verified cache writes after OFFLINE_CACHE_IDB.
9. Sidecar OAP route after SIDECAR_LOCAL_NODE_IDB.
10. Paid OAP routes only after route contracts and paid-action gates.
11. Wallet OAP routes only after explicit wallet route contract tests.
```

Do not jump directly to:

```text
wallet mutation
paid execution
media subsystem
offline cache
sidecar node
facet execution
```

---

## 34. Plain-English summary

OAP is the native protocol path that makes CrabLink Tauri a real Rust-backed RON client.

But OAP is not magic authority.

The rule is:

```text
OAP moves typed bytes safely.
Services own truth.
Wallet owns wallet mutation.
Ledger owns economic truth.
Storage owns bytes.
Index owns pointers.
Policy owns permissions.
React owns display.
```

The first goal is not to replace the gateway.

The first goal is:

```text
prove that CrabLink Tauri can speak OAP safely,
without breaking gateway compatibility,
without leaking secrets,
without bypassing paid gates,
and without blurring RustyOnions service boundaries.
```
````
