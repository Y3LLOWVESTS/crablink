

````markdown id="a2zn3y"
---
title: TAURI_COMMAND_BRIDGE_IDB
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
  - CRAB_URL_AND_DEEP_LINK_IDB.MD
  - STORAGE_AND_SETTINGS_IDB.MD
  - PAID_ACTIONS_AND_RECEIPTS_IDB.MD
  - OAP_CLIENT_IDB.MD
  - PASSPORT_WALLET_VAULT_IDB.MD
  - SIDECAR_LOCAL_NODE_IDB.MD
  - OFFLINE_CACHE_IDB.MD
  - MEDIA_TAURI_IDB.MD
  - FACET_SANDBOX_IDB.MD
---

# TAURI_COMMAND_BRIDGE_IDB

RO:WHAT — Defines the safe command bridge between CrabLink React/TypeScript and the Tauri Rust backend.

RO:WHY — Tauri gives CrabLink native Rust capability, but that power must be mediated through small, typed, redacted, policy-aware commands so the app does not become a wallet, ledger, storage service, index service, fake backend, or arbitrary native executor.

RO:INTERACTS — React UI, TypeScript adapter layer, Tauri invoke, Tauri Rust commands, app state manager, gateway client, future OAP adapter, future vault adapter, future sidecar supervisor, future offline cache verifier, svc-gateway, omnigate, svc-wallet, ron-ledger, svc-storage, svc-index, svc-passport, ron-auth, ron-kms, ron-policy, ron-app-sdk, oap, ron-transport.

RO:INVARIANTS — React requests actions. TypeScript adapts and validates UI-safe shapes. Tauri Rust validates, redacts, routes, and returns typed envelopes. Wallet/ledger truth stays backend-owned. OAP is Rust-side only. No secrets cross into React. No fake receipts. No fake balances. No silent spend. No arbitrary native execution from crab links.

RO:METRICS — Command invocation counts, command latency, command rejection reasons, redaction events, gateway/OAP source selection, paid gate outcomes, cache verification outcomes, sidecar/vault status, and degraded dependency classes.

RO:CONFIG — Command bridge reads run mode, gateway endpoint, request timeout, OAP enabled flag, sidecar enabled flag, vault enabled flag, cache enabled flag, amnesia mode, developer diagnostics flag, and feature allowlists.

RO:SECURITY — Commands are allowlisted and typed. Errors are redacted. Secrets remain Rust-side. Capabilities fail closed. Deep links are normalized before commands run. Paid commands require explicit confirmation and backend proof. Command bridge never bypasses svc-wallet/ron-ledger truth.

RO:TEST — TypeScript adapter tests, Rust command unit tests, command envelope tests, redaction tests, gateway command smoke, paid command fail-closed tests, malformed-input tests, deep-link command tests, OAP disabled tests, vault/sidecar disabled tests, and no-secret-leak regression tests.

---

## 0. Status

This blueprint defines the command boundary for CrabLink Tauri.

It answers:

```text
How does React talk to Rust?
What commands are allowed?
What data may cross the bridge?
Where are secrets allowed?
How are errors redacted?
How do gateway/OAP/sidecar/vault paths stay separated?
How do we prevent the app from becoming backend truth?
````

The core model:

```text id="mqeybo"
React UI
→ TypeScript command adapter
→ Tauri invoke
→ Rust command handler
→ gateway / future OAP / future vault / future sidecar / future cache
→ typed command envelope
→ TypeScript adapter
→ React render
```

The command bridge is not a convenience dumping ground.

It is the **native trust boundary**.

---

## 1. Invariants (MUST)

### [I-1] React never calls privileged native behavior directly

React may call:

```text id="pkn85s"
TypeScript adapter functions
UI-safe hooks
route actions
paid gate actions
diagnostic actions
```

React must not directly own:

```text id="jtnpua"
Tauri invoke strings scattered across pages
wallet spend authority
private keys
seed phrases
raw capability tokens
OAP frame construction
sidecar lifecycle authority
filesystem paths for sensitive storage
```

Correct:

```ts id="h2j987"
await adapters.commands.healthCheck();
```

Avoid:

```ts id="a5e7xv"
await invoke("some_secret_native_command", rawUserData);
```

---

### [I-2] TypeScript adapts; it does not become authority

The TypeScript layer may:

```text id="wb5bct"
validate UI-safe inputs
normalize command requests
attach correlation IDs
call Tauri invoke
map Rust envelopes into UI states
fall back to gateway adapter when configured
hide Tauri details from React
```

The TypeScript layer must not:

```text id="rigrqt"
store spend authority
store raw private keys
store seed phrases
construct OAP frames
invent wallet balances
invent receipts
decide final paid access
mutate ledger truth
start sidecars directly
bypass command policy
```

---

### [I-3] Tauri Rust commands are the native privilege boundary

Rust commands own:

```text id="96z9p0"
input validation
command allowlist enforcement
run mode checks
feature-gate checks
gateway request routing
future OAP request routing
future vault access
future sidecar status/supervision
future b3 cache verification
redaction
typed error mapping
correlation ID propagation
```

Rust commands must not become:

```text id="wvma8e"
wallet truth
ledger truth
storage truth
index truth
policy authorship
QuickChain logic
arbitrary native plugin runner
```

---

### [I-4] Every command is allowlisted

A Tauri command must be explicitly named, documented, and reviewed.

Allowed command classes:

```text id="ag8yni"
health/readiness
diagnostics
settings
route resolution
asset/site retrieval
identity display
wallet balance display
paid action prepare/confirm
deep-link open
cache verification
future OAP probe/request
future vault status/lock/unlock
future sidecar status/start/stop
```

Forbidden generic commands:

```text id="rbdyxo"
run
execute
eval
shell
native
do_everything
raw_http
raw_oap
raw_wallet
raw_ledger
raw_storage
raw_index
debug_exec
```

---

### [I-5] Command names must be boring and precise

Good names:

```text id="yyh9vi"
health_check
ready_check
version_check
get_app_diagnostics
read_settings
write_settings
resolve_crab_url_gateway
get_asset_page_gateway
get_site_page_gateway
get_identity_me_gateway
get_wallet_balance_gateway
prepare_paid_action_gateway
confirm_paid_action_gateway
open_deep_link
verify_cached_b3
clear_cache_category
oap_probe
sidecar_status
vault_status
```

Bad names:

```text id="s7kisf"
process
handle
run_task
magic
execute_url
do_native
route_anything
```

---

### [I-6] Every command returns a typed envelope

Commands must not return arbitrary JSON blobs.

Every success response uses:

```text id="c0i0n9"
CommandOk<T>
```

Every failure uses:

```text id="1lcvk1"
CommandProblem
```

No raw `anyhow::Error`, stack trace, panic, HTTP body dump, token, or private state may cross into React.

---

### [I-7] Correlation IDs cross the bridge

Every command should carry or create:

```text id="1l70yn"
correlation_id
```

It should flow across:

```text id="tcqv1a"
React user action
→ TypeScript adapter
→ Tauri invoke
→ Rust command
→ gateway/OAP request
→ logs/metrics
→ response envelope
→ UI diagnostics
```

Correlation IDs are not secrets.

They must not include wallet keys, passport secrets, full tokens, or private file paths.

---

### [I-8] Command inputs are DTOs, not loose objects

Every command request must have a stable shape.

Rules:

```text id="xudq3i"
deny unknown fields where practical
validate strings before routing
normalize crab URLs before resolve
validate b3 hashes before cache lookup
validate amount strings/integers before paid action
validate command source and run mode
reject oversized input
reject unsafe schemes
```

No command should accept unbounded raw JSON unless it is a deliberately documented developer diagnostic command behind a dev flag.

---

### [I-9] Secrets do not cross into React

React must never receive:

```text id="n215i1"
raw private keys
seed phrases
wallet signing keys
passport private keys
raw macaroon/capability tokens
uncapped spend authority
platform secure storage contents
sidecar local auth tokens
OAP session keys
```

React may receive:

```text id="zwesv0"
safe labels
public profile fields
display wallet account label
backend-derived balance display
backend-derived receipt metadata
redacted error messages
feature status
lock/unlock status
```

---

### [I-10] Wallet/ledger truth remains backend-owned

Command bridge may display wallet state, but it does not own wallet state.

Allowed:

```text id="mmwkef"
get_wallet_balance_gateway
prepare_paid_action_gateway
confirm_paid_action_gateway
display receipt metadata
refresh backend-derived state
```

Forbidden:

```text id="zdzjp1"
local balance mutation
local receipt creation
local ROC grant
direct ledger event append
direct ledger replay mutation
wallet transfer outside backend path
silent hold/capture/release
```

---

### [I-11] Paid commands require explicit user confirmation

Paid command flow must preserve:

```text id="gvzqqk"
quote/prepare
→ show action/price/purpose/recipient
→ explicit user confirmation
→ backend wallet path
→ receipt/access proof
→ unlock only after proof
```

No command may perform spend-like behavior because:

```text id="uyrtaw"
a page loaded
a deep link opened
a cached receipt exists
a sidecar is ready
a developer mode flag is on
```

---

### [I-12] Gateway is the first backend command path

Initial bridge target:

```text id="n6z3de"
Tauri Rust command
→ gateway client
→ svc-gateway
→ omnigate/services
```

Command bridge must preserve gateway compatibility before OAP/sidecar/vault layers.

---

### [I-13] OAP commands are Rust-side only and future-gated

React and TypeScript must never construct OAP frames.

OAP command path:

```text id="okvwtm"
React
→ TypeScript adapter
→ Tauri command
→ Rust OAP adapter
→ ron-app-sdk / oap / ron-transport
```

OAP commands require:

```text id="g3h8pz"
OAP_CLIENT_IDB.MD
feature gate
frame cap enforcement
bounded buffers
timeouts
capability policy
gateway fallback
typed error mapping
```

---

### [I-14] Sidecar commands are disabled until sidecar IDB

Initial sidecar commands should return truthful disabled state.

Allowed initial command:

```text id="jssdbm"
sidecar_status
```

Forbidden before sidecar IDB:

```text id="33px2z"
start_sidecar
stop_sidecar
restart_sidecar
install_sidecar
grant_sidecar_wallet_access
```

After sidecar IDB, sidecar commands must be:

```text id="io3lbv"
explicit
feature-gated
bounded
supervised
logged redacted
health-checked
not silent
```

---

### [I-15] Vault commands are disabled until vault IDB

Initial vault commands should return truthful disabled state.

Allowed initial command:

```text id="hnlx7c"
vault_status
```

Forbidden before vault IDB:

```text id="kxio6j"
store_private_key
read_private_key
export_seed_phrase
import_seed_phrase
grant_spend_authority
unlock_wallet_silently
```

Future vault work requires:

```text id="wgo4if"
PASSPORT_WALLET_VAULT_IDB.MD
SECURITY_AND_AMNESIA_IDB.MD
platform secure storage design
redaction tests
lock/unlock lifecycle tests
main/alt privacy tests
```

---

### [I-16] Cache commands verify b3 before render

Cache commands may exist only if they preserve content-addressed truth.

Required:

```text id="51zsne"
verify_cached_b3 computes BLAKE3
requested b3:<hash> must match bytes
mismatch rejects and increments metric
metadata never overrides hash truth
```

Cache command must not:

```text id="nh3yhw"
claim ownership truth
claim receipt truth
claim current balance truth
unlock paid content without proof
```

---

### [I-17] Deep-link commands never bypass route policy

Deep-link command flow:

```text id="ivg4bu"
OS receives crab:// URL
→ Tauri deep-link adapter
→ open_deep_link command or internal handler
→ shared parser
→ route classifier
→ policy/paid gate
→ navigation
```

Deep link must not directly:

```text id="w01ar1"
spend ROC
read local files
execute code
start sidecar
unlock paid content
store credentials
```

---

### [I-18] Developer diagnostics are opt-in and redacted

Developer commands may expose:

```text id="sa6w5g"
run mode
gateway status
OAP status
sidecar status
cache status
vault status
amnesia mode
last safe error class
version/build info
```

Developer commands must not expose:

```text id="c4sdb6"
raw tokens
private keys
seed phrases
spend authority
private main→alt linkage
full local file paths unless explicitly redacted
raw request headers containing secrets
```

---

### [I-19] Commands must be cancellation-aware and bounded

Rust commands must avoid:

```text id="zxwhr5"
unbounded waits
unbounded request bodies
unbounded queues
unbounded retries
locks across await
blocking filesystem/network work on async runtime
```

Required:

```text id="6czgri"
timeouts
bounded buffers
bounded retries with jitter
spawn_blocking for heavy/blocking operations
short lock scopes
structured cancellation where needed
```

---

### [I-20] Command bridge must be testable without a live network

Every command class should have:

```text id="ydk4jj"
unit tests
fixture-backed tests
mock gateway tests
disabled-feature tests
malformed-input tests
redaction tests
```

Live gateway smoke tests are necessary, but not sufficient.

---

## 2. Design Principles (SHOULD)

### [P-1] Start with a tiny command bridge

First command bridge should only include:

```text id="b80hs4"
health_check
ready_check
version_check
get_app_diagnostics
read_settings
write_settings
resolve_crab_url_gateway
```

Do not start with vault, sidecar, OAP, or media-heavy commands.

---

### [P-2] Route through adapters, not page-local invokes

Preferred React shape:

```ts id="2vec5e"
const result = await adapters.commands.resolveCrabUrl({ url });
```

Avoid page-local direct invoke:

```ts id="5p6fi4"
const result = await invoke("resolve_crab_url_gateway", { url });
```

This keeps pages portable between Chrome and Tauri.

---

### [P-3] Prefer command families over random command growth

Command families:

```text id="8bggh0"
diagnostics
settings
gateway
resolve
identity
wallet_display
paid_actions
deep_links
cache
oap
sidecar
vault
media
facet
```

Each family should have its own module when it grows.

---

### [P-4] Gateway commands are compatibility commands

Gateway commands should mirror proven HTTP route behavior.

They exist to preserve the product loop while moving sensitive/native access behind Rust.

---

### [P-5] Commands should report source truth

Every command result should state source:

```text id="xnt4b7"
gateway
local_dev_gateway
oap
offline_cache
sidecar
vault
settings
fixture
disabled
```

The UI can then label whether data is backend-confirmed, cached, fixture, or unavailable.

---

### [P-6] Disabled feature commands should be honest

Good:

```json id="3lqj8d"
{
  "schema": "crablink.command.problem.v1",
  "code": "feature_disabled",
  "message": "OAP is disabled. Enable OAP only after OAP_CLIENT_IDB gates are implemented.",
  "retryable": false,
  "source": "oap"
}
```

Bad:

```text id="n4x86w"
silently pretending OAP succeeded
```

---

### [P-7] Redaction should happen in Rust before serialization

Do not rely on React to hide secrets.

Rust should convert internal errors into safe `CommandProblem` values before returning.

---

### [P-8] Use idempotency for mutation-like commands

Mutation-like commands include:

```text id="l9nkp4"
write_settings
clear_cache_category
prepare_paid_action if it contacts backend
confirm_paid_action
future sidecar start/stop
future vault lock/unlock
future publish/upload
```

When a command calls a backend mutation route, it should attach:

```text id="bejo53"
Idempotency-Key
x-correlation-id
```

where appropriate.

---

### [P-9] Keep mobile in mind

Command bridge should not assume:

```text id="jzx6ga"
desktop sidecars exist
desktop file paths exist
background processes are allowed
localhost service mesh is available
```

Platform-specific commands should report support status clearly.

---

### [P-10] Favor smaller DTOs over convenience mega-commands

A page may need several commands.

Do not create:

```text id="4ny4m7"
load_everything_for_app
do_wallet_site_asset_payment_and_cache
```

unless there is a strong, documented reason.

---

## 3. Implementation (HOW)

### [C-1] Proposed directory layout

```text id="ryz4ms"
apps/crablink-tauri/
  src/
    adapters/
      commands/
        commandClient.ts
        commandTypes.ts
        diagnosticsCommands.ts
        settingsCommands.ts
        gatewayCommands.ts
        paidCommands.ts
        cacheCommands.ts
        featureStatusCommands.ts
      gateway/
        gatewayTypes.ts
      errors/
        uiErrorMap.ts

  src-tauri/
    src/
      main.rs
      app_state.rs
      commands/
        mod.rs
        diagnostics.rs
        settings.rs
        gateway.rs
        resolve.rs
        identity.rs
        wallet_display.rs
        paid_actions.rs
        deep_links.rs
        cache.rs
        oap.rs
        sidecar.rs
        vault.rs
      bridge/
        mod.rs
        envelope.rs
        error.rs
        redact.rs
        correlation.rs
        limits.rs
      gateway/
        mod.rs
        client.rs
        dto.rs
        errors.rs
      security/
        mod.rs
        redact.rs
        amnesia.rs
      platform/
        mod.rs
        support.rs
```

---

### [C-2] Rust command envelope

```rust id="icoyto"
//! RO:WHAT — Typed command bridge envelopes shared by CrabLink Tauri commands.
//! RO:WHY — Keeps React/Tauri communication strict, redacted, and source-labeled.
//! RO:INTERACTS — commands::*, gateway::client, security::redact, app_state.
//! RO:INVARIANTS — no raw errors to UI; no secrets; source labeled; correlation ID required.
//! RO:METRICS — command success/failure counters and latency histograms.
//! RO:CONFIG — none directly.
//! RO:SECURITY — command errors are redacted before serialization.
//! RO:TEST — unit: envelope serialization; redaction regression tests.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct CommandOk<T>
where
    T: Serialize,
{
    pub schema: &'static str,
    pub correlation_id: String,
    pub source: CommandSource,
    pub data: T,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct CommandProblem {
    pub schema: &'static str,
    pub correlation_id: String,
    pub code: CommandProblemCode,
    pub message: String,
    pub retryable: bool,
    pub source: CommandSource,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CommandSource {
    Gateway,
    LocalDevGateway,
    Oap,
    Cache,
    Vault,
    Sidecar,
    Platform,
    Settings,
    Diagnostics,
    Disabled,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CommandProblemCode {
    BadRequest,
    NotReady,
    Timeout,
    GatewayUnavailable,
    PolicyDenied,
    Unauthorized,
    NotFound,
    FeatureDisabled,
    UnsupportedPlatform,
    CacheIntegrityFail,
    RedactedInternal,
}
```

---

### [C-3] TypeScript command result contract

```ts id="1y2gul"
export type CommandSource =
  | "gateway"
  | "local_dev_gateway"
  | "oap"
  | "cache"
  | "vault"
  | "sidecar"
  | "platform"
  | "settings"
  | "diagnostics"
  | "disabled";

export type CommandProblemCode =
  | "bad_request"
  | "not_ready"
  | "timeout"
  | "gateway_unavailable"
  | "policy_denied"
  | "unauthorized"
  | "not_found"
  | "feature_disabled"
  | "unsupported_platform"
  | "cache_integrity_fail"
  | "redacted_internal";

export interface CommandOk<T> {
  schema: "crablink.command.ok.v1";
  correlation_id: string;
  source: CommandSource;
  data: T;
}

export interface CommandProblem {
  schema: "crablink.command.problem.v1";
  correlation_id: string;
  code: CommandProblemCode;
  message: string;
  retryable: boolean;
  source: CommandSource;
}

export type CommandResult<T> =
  | { ok: true; value: CommandOk<T> }
  | { ok: false; problem: CommandProblem };
```

---

### [C-4] TypeScript command client pattern

```ts id="kz6cxo"
/**
 * RO:WHAT — UI-safe TypeScript wrapper around CrabLink Tauri commands.
 * RO:WHY — Keeps React pages free of raw invoke calls and native boundary details.
 * RO:INTERACTS — @tauri-apps/api/core invoke, commandTypes, route adapters.
 * RO:INVARIANTS — no secret ownership; typed results; correlation IDs; no direct OAP frames.
 * RO:SECURITY — does not store spend authority or private keys.
 * RO:TEST — adapter tests with mocked invoke.
 */

import { invoke } from "@tauri-apps/api/core";
import type { CommandResult } from "./commandTypes";

export interface CommandInvokeOptions {
  correlationId?: string;
}

function newCorrelationId(): string {
  return `cl_${crypto.randomUUID()}`;
}

export async function invokeCommand<T>(
  name: string,
  payload: Record<string, unknown> = {},
  options: CommandInvokeOptions = {},
): Promise<CommandResult<T>> {
  const correlationId = options.correlationId ?? newCorrelationId();

  const response = await invoke<CommandResult<T>>(name, {
    ...payload,
    correlationId,
  });

  return response;
}
```

Rules:

```text id="i6qevk"
Only command adapter files import @tauri-apps/api.
Pages and shared core do not import invoke directly.
```

---

### [C-5] Diagnostics command shape

Rust command:

```rust id="lo23zv"
#[tauri::command]
pub async fn get_app_diagnostics(
    state: tauri::State<'_, AppState>,
    correlation_id: Option<String>,
) -> CommandResult<AppDiagnostics> {
    // validate/generate correlation_id
    // read safe status only
    // return redacted diagnostics
}
```

Diagnostics payload:

```rust id="d6mczt"
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub struct AppDiagnostics {
    pub app_version: String,
    pub run_mode: String,
    pub gateway_base_url_redacted: String,
    pub gateway_status: FeatureStatus,
    pub oap_status: FeatureStatus,
    pub sidecar_status: FeatureStatus,
    pub vault_status: FeatureStatus,
    pub cache_status: FeatureStatus,
    pub amnesia_mode: bool,
    pub developer_mode: bool,
}
```

---

### [C-6] Gateway command pattern

Command path:

```text id="vuhyo1"
resolve_crab_url_gateway
→ validate input URL
→ normalize crab URL
→ call gateway client
→ map HTTP response to strict DTO
→ return CommandOk or CommandProblem
```

Rust command request:

```rust id="pqrpud"
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub struct ResolveCrabUrlRequest {
    pub url: String,
    pub correlation_id: Option<String>,
}
```

Rules:

```text id="kgq19f"
No raw URL execution.
No file://.
No javascript:.
No data:.
No shell command.
No sidecar start.
No spend.
```

---

### [C-7] Settings command pattern

Safe settings commands:

```text id="03uqx2"
read_settings
write_settings
reset_settings
```

Settings command may store:

```text id="m2b1f6"
gateway URL
theme
developer mode
require spend confirmation
safe display labels
last route if enabled
```

Settings command must not store:

```text id="kpqdwu"
private keys
seed phrases
raw spend authority
raw uncapped capability tokens
ledger truth
wallet truth
```

Sensitive storage requires vault IDB.

---

### [C-8] Paid command pattern

Paid command family:

```text id="ga9yjx"
prepare_paid_action_gateway
confirm_paid_action_gateway
refresh_paid_access_gateway
```

State machine:

```text id="4if0us"
idle
→ prepared
→ user_confirmed
→ backend_pending
→ receipt_verified
→ unlocked
```

Command bridge rules:

```text id="pv2n5a"
prepare command does not spend
confirm command requires explicit UI confirmation token/flag
backend wallet path performs economic mutation
receipt/access proof required before unlock
error paths fail closed
```

Example confirmation request:

```rust id="31nkit"
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub struct ConfirmPaidActionRequest {
    pub prepared_action_id: String,
    pub user_confirmed: bool,
    pub idempotency_key: String,
    pub correlation_id: Option<String>,
}
```

Invariant:

```text id="zfut35"
If user_confirmed != true, reject.
```

---

### [C-9] Feature-disabled command pattern

For future features:

```text id="0nsi4n"
oap_probe
sidecar_status
vault_status
media_native_status
facet_runtime_status
```

Initial behavior:

```text id="nk3inf"
Return feature_disabled or disabled status.
Do not silently succeed.
Do not fake capability.
```

---

### [C-10] Redaction pattern

Rust redaction must catch:

```text id="fd8d2e"
Authorization headers
Bearer tokens
macaroons
capability tokens
private keys
seed phrases
wallet signing material
local sidecar auth
full sensitive paths
private main→alt mappings
```

Pseudo pattern:

```rust id="f2hxvh"
pub fn redact_for_ui(input: &str) -> String {
    input
        .replace("Bearer ", "Bearer [REDACTED] ")
        // actual implementation should use safer tokenization/regex patterns
}
```

Do not rely on this pseudo snippet as final implementation; actual code should be tested with redaction fixtures.

---

### [C-11] Error mapping table

| Internal condition     | Command problem code             | Retryable? | UI behavior                     |
| ---------------------- | -------------------------------- | ---------- | ------------------------------- |
| Malformed input        | `bad_request`                    | false      | Show validation message         |
| Gateway down           | `gateway_unavailable`            | true       | Show gateway degraded           |
| Timeout                | `timeout`                        | true       | Offer retry                     |
| Backend 401/403        | `unauthorized` / `policy_denied` | false      | Show auth/policy state          |
| Backend 404            | `not_found`                      | false      | Show not found                  |
| Feature disabled       | `feature_disabled`               | false      | Show disabled/gated state       |
| Cache b3 mismatch      | `cache_integrity_fail`           | false      | Reject render, clear/quarantine |
| Unknown internal error | `redacted_internal`              | maybe      | Show safe problem, log redacted |

---

### [C-12] Metrics labels

Allowed labels:

```text id="vypwur"
command
source
status
reason
run_mode
feature
amnesia
```

Forbidden labels:

```text id="0901x1"
full wallet account
raw passport subject
token
capability
full crab URL with private data
full local path
private main/alt relation
```

Suggested metrics:

```text id="71qjhr"
crablink_command_invocations_total{command,source,status}
crablink_command_latency_seconds{command,source}
crablink_command_rejected_total{command,reason}
crablink_command_redacted_total{source}
crablink_paid_command_fail_closed_total{reason}
crablink_cache_verify_fail_total{reason}
crablink_feature_disabled_total{feature}
```

---

### [C-13] Command registration pattern

Tauri builder should register commands deliberately:

```rust id="vopczv"
tauri::Builder::default()
    .manage(AppState::load()?)
    .invoke_handler(tauri::generate_handler![
        commands::diagnostics::get_app_diagnostics,
        commands::diagnostics::health_check,
        commands::diagnostics::ready_check,
        commands::settings::read_settings,
        commands::settings::write_settings,
        commands::gateway::resolve_crab_url_gateway,
        commands::sidecar::sidecar_status,
        commands::vault::vault_status,
        commands::oap::oap_status,
    ])
    .run(tauri::generate_context!())?;
```

Do not auto-register commands through broad reflection-like patterns.

---

### [C-14] Command module headers

Every command module should use RO headers.

```rust id="2prj20"
//! RO:WHAT — Tauri command handlers for gateway-backed crab URL resolution.
//! RO:WHY — Keeps React route resolution behind typed native bridge and gateway contract.
//! RO:INTERACTS — bridge::envelope, gateway::client, app_state, route parser.
//! RO:INVARIANTS — no direct wallet/ledger/storage/index; no unsafe schemes; redacted errors.
//! RO:METRICS — command latency, gateway failure class, rejection reason.
//! RO:CONFIG — gateway.base_url, gateway.timeout_ms, run.mode.
//! RO:SECURITY — no secrets to UI; no spend; capability headers redacted.
//! RO:TEST — unit malformed URL; mock gateway; redaction regression.
```

---

## 4. Command Catalog

### [CMD-1] Diagnostics commands

```text id="twjig5"
health_check
ready_check
version_check
get_app_diagnostics
```

Purpose:

```text id="sh8dzm"
Show app/gateway/runtime status safely.
```

May touch:

```text id="if7zoz"
gateway health/ready
local app config
feature status
safe diagnostics
```

Must not touch:

```text id="spml0g"
wallet mutation
ledger mutation
private keys
raw tokens
```

---

### [CMD-2] Settings commands

```text id="559mxk"
read_settings
write_settings
reset_settings
clear_safe_settings
```

Purpose:

```text id="nmclet"
Manage safe app preferences.
```

Must separate:

```text id="s1nft5"
safe settings
sensitive/vault storage
display cache
verified cache
```

---

### [CMD-3] Gateway resolution commands

```text id="c85kzn"
resolve_crab_url_gateway
get_asset_page_gateway
get_site_page_gateway
get_profile_gateway
```

Purpose:

```text id="8j15if"
Preserve proven gateway route behavior from the Chrome proof.
```

Rules:

```text id="3q1z0x"
calls svc-gateway
does not call internal services directly
does not spend
does not execute code
```

---

### [CMD-4] Identity display commands

```text id="nw5xrg"
get_identity_me_gateway
bootstrap_identity_gateway
```

`bootstrap_identity_gateway` is mutation-like and must use idempotency.

It may be dev/bootstrap only until real vault/passport design exists.

Must not:

```text id="pzg0ic"
create local private keys casually
store seed phrases
invent passport truth
invent starter ROC
```

---

### [CMD-5] Wallet display commands

```text id="mbtt7r"
get_wallet_balance_gateway
```

Purpose:

```text id="5czan5"
Display backend-derived balance.
```

Must not:

```text id="67mt8h"
mutate balance
cache as current truth forever
create wallet operations silently
```

---

### [CMD-6] Paid action commands

```text id="3613p2"
prepare_paid_action_gateway
confirm_paid_action_gateway
refresh_access_receipt_gateway
```

Purpose:

```text id="jwxcwk"
Support paid storage/view/site/content flows with explicit user confirmation.
```

Rules:

```text id="6ijoj8"
confirmation required
backend proof required
idempotency required for mutation-like calls
fail closed
```

---

### [CMD-7] Deep-link commands

```text id="07sc6b"
open_deep_link
classify_deep_link
```

Purpose:

```text id="ms1wns"
Normalize and route native crab:// input.
```

Must not:

```text id="aq1z5p"
spend
execute code
read files
start sidecar
unlock paid content directly
```

---

### [CMD-8] Cache commands

```text id="g09sx1"
verify_cached_b3
get_cache_status
clear_cache_category
```

Purpose:

```text id="i6rkhq"
Support future offline verified cache.
```

Requires `OFFLINE_CACHE_IDB.MD` before broad use.

---

### [CMD-9] OAP commands

```text id="3jv51e"
oap_status
oap_probe
oap_resolve
```

Requires `OAP_CLIENT_IDB.MD`.

Initial `oap_status` may return disabled.

---

### [CMD-10] Sidecar commands

```text id="db67hj"
sidecar_status
```

Future after IDB:

```text id="my3rmf"
start_sidecar
stop_sidecar
restart_sidecar
```

Requires `SIDECAR_LOCAL_NODE_IDB.MD`.

---

### [CMD-11] Vault commands

```text id="krsw35"
vault_status
```

Future after IDB:

```text id="w9cik3"
lock_vault
unlock_vault
store_passport_key
rotate_vault_key
```

Requires `PASSPORT_WALLET_VAULT_IDB.MD`.

---

### [CMD-12] Media commands

Future only:

```text id="6yrq3m"
media_status
open_media_file_picker
prepare_media_upload
stream_media_segment
```

Requires `MEDIA_TAURI_IDB.MD`.

No large full-file command buffering.

---

### [CMD-13] Facet commands

Initial:

```text id="56ss60"
facet_status
```

Future only after sandbox IDB:

```text id="fjgx4i"
launch_facet_sandbox
stop_facet_sandbox
```

Requires `FACET_SANDBOX_IDB.MD`.

No arbitrary execution from crab links.

---

## 5. Acceptance Gates (PROOF)

### [G-1] Command bridge doctrine gate

```text id="5n5alq"
[ ] TAURI_COMMAND_BRIDGE_IDB.MD exists.
[ ] React/TypeScript/Rust boundary is documented.
[ ] Command families are listed.
[ ] Anti-scope is documented.
[ ] Disabled future features are documented.
```

---

### [G-2] TypeScript adapter gate

```text id="zghgav"
[ ] Only command adapter files import @tauri-apps/api.
[ ] React pages call adapter methods, not raw invoke.
[ ] Shared core has no Tauri imports.
[ ] Shared core has no Chrome imports.
[ ] Command result types exist.
[ ] Command problem types exist.
[ ] Correlation ID helper exists.
[ ] Adapter tests mock invoke.
```

---

### [G-3] Rust envelope gate

```text id="kko4d4"
[ ] CommandOk<T> exists.
[ ] CommandProblem exists.
[ ] CommandSource enum exists.
[ ] CommandProblemCode enum exists.
[ ] Serialization tests exist.
[ ] Unknown/internal errors map to redacted_internal.
[ ] No raw anyhow/debug error crosses UI boundary.
```

---

### [G-4] Initial command gate

```text id="tsbibi"
[ ] health_check exists.
[ ] ready_check exists.
[ ] version_check exists or intentionally deferred.
[ ] get_app_diagnostics exists.
[ ] read_settings exists.
[ ] write_settings exists.
[ ] resolve_crab_url_gateway exists or is stubbed truthfully.
[ ] sidecar_status returns disabled.
[ ] vault_status returns disabled.
[ ] oap_status returns disabled.
```

---

### [G-5] Gateway command gate

```text id="kk6ygz"
[ ] Gateway commands call configured svc-gateway.
[ ] Gateway commands do not call svc-wallet directly.
[ ] Gateway commands do not call ron-ledger directly.
[ ] Gateway commands do not call svc-storage directly.
[ ] Gateway commands do not call svc-index directly.
[ ] Gateway commands do not call omnigate directly in normal mode.
[ ] Gateway errors map to typed problems.
[ ] Gateway timeout is bounded.
```

---

### [G-6] Security gate

```text id="vkrh4t"
[ ] No command returns raw tokens.
[ ] No command returns private keys.
[ ] No command returns seed phrases.
[ ] No command returns uncapped spend authority.
[ ] No command logs secrets.
[ ] Redaction tests exist.
[ ] Developer diagnostics are opt-in.
[ ] Sensitive fields are omitted or redacted.
```

---

### [G-7] Paid command fail-closed gate

```text id="akbl8y"
[ ] prepare_paid_action does not spend.
[ ] confirm_paid_action requires explicit user confirmation.
[ ] confirm_paid_action requires idempotency key.
[ ] wallet unavailable results in fail-closed.
[ ] gateway unavailable results in fail-closed.
[ ] invalid receipt/access proof does not unlock.
[ ] local display cache cannot unlock paid content alone.
```

---

### [G-8] OAP disabled gate

```text id="8n7g3u"
[ ] OAP commands are disabled by default.
[ ] OAP status is visible.
[ ] React never builds OAP frames.
[ ] OAP command implementation requires OAP_CLIENT_IDB.MD.
[ ] Gateway fallback remains available.
```

---

### [G-9] Sidecar disabled gate

```text id="at4g5d"
[ ] sidecar_status exists.
[ ] sidecar_status returns disabled by default.
[ ] No start/stop sidecar commands exist before sidecar IDB.
[ ] Sidecar disabled state is shown truthfully.
[ ] No local service starts silently.
```

---

### [G-10] Vault disabled gate

```text id="88q4fn"
[ ] vault_status exists.
[ ] vault_status returns disabled by default.
[ ] No private-key storage commands exist before vault IDB.
[ ] No seed phrase commands exist.
[ ] No spend authority is persisted.
```

---

### [G-11] Deep-link command gate

```text id="df3h4j"
[ ] open_deep_link validates scheme.
[ ] unsafe schemes reject.
[ ] malformed b3 rejects.
[ ] deep link cannot spend directly.
[ ] deep link cannot execute code.
[ ] deep link cannot read files.
[ ] deep-link errors are redacted.
```

---

### [G-12] Concurrency/bounds gate

```text id="pc5q64"
[ ] Commands use bounded timeouts.
[ ] No locks across await.
[ ] No unbounded retries.
[ ] No unbounded request body.
[ ] Blocking work uses spawn_blocking where needed.
[ ] Command cancellation/shutdown behavior is understood.
```

---

### [G-13] Observability gate

```text id="klhl8k"
[ ] Command invocation metrics exist or are stubbed.
[ ] Command latency metrics exist or are stubbed.
[ ] Rejection reason metrics exist or are stubbed.
[ ] Correlation ID appears in safe diagnostics.
[ ] Metrics labels do not include secrets or high-cardinality private values.
```

---

## 6. Anti-Scope (Forbidden)

Forbidden in the command bridge:

```text id="o0qctq"
- Raw invoke calls scattered across React pages.
- React storing private keys.
- React storing seed phrases.
- TypeScript storing spend authority.
- TypeScript constructing OAP frames.
- Commands named run/execute/eval/shell.
- A generic raw_http command exposed to UI.
- A generic raw_oap command exposed to UI.
- A generic raw_wallet command exposed to UI.
- A generic raw_ledger command exposed to UI.
- Direct ledger mutation from CrabLink.
- Direct wallet mutation outside backend wallet path.
- Direct storage/index mutation from UI.
- OAP bypassing policy.
- Paid unlock from local cache alone.
- Silent ROC spend.
- Fake receipt creation.
- Fake balance creation.
- Fake b3 creation.
- Sidecar auto-start before sidecar IDB.
- Vault/private-key custody before vault IDB.
- Seed phrase import/export before vault IDB.
- Arbitrary code execution from crab links.
- QuickChain/ROX/Solana/bridge/staking/liquidity commands.
- Secret values in logs, metrics, diagnostics, or UI errors.
- Unbounded media transfer through commands.
```

---

## 7. References

Primary references:

```text id="6xnk1s"
CRABLINK_TAURI_IDB.MD
SECURITY_NOTES_CRABLINK_TAURI.MD
TAURI_MIGRATION_IDB.MD
RUN_STACK_AND_MODES_IDB.MD
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

Carryover rules preserved:

```text id="g0lnv8"
Chrome extension proved the product loop.
Tauri becomes the native primary client.
React UI is product UX only.
TypeScript helpers own no secrets.
Tauri Rust backend is authoritative local/native bridge.
Gateway compatibility comes first.
OAP is Rust-side only.
svc-wallet owns wallet mutation.
ron-ledger owns durable economic truth.
No fake balances.
No fake receipts.
No silent spend.
No arbitrary code execution from crab links.
```

---

## 8. Reviewer Checklist

Before approving command bridge work:

```text id="qlmq7x"
[ ] Are commands narrowly named?
[ ] Are commands explicitly registered?
[ ] Do commands return typed envelopes?
[ ] Are raw errors redacted?
[ ] Does React avoid raw invoke?
[ ] Does shared core avoid Tauri imports?
[ ] Does TypeScript avoid secret ownership?
[ ] Does Rust avoid returning secrets?
[ ] Does gateway path preserve svc-gateway boundary?
[ ] Does command bridge avoid direct ledger mutation?
[ ] Does command bridge avoid direct storage/index mutation?
[ ] Are paid commands explicit and fail-closed?
[ ] Is OAP disabled or properly gated?
[ ] Is sidecar disabled or properly gated?
[ ] Is vault disabled or properly gated?
[ ] Are correlation IDs propagated?
[ ] Are metrics safe?
[ ] Are tests present for malformed inputs?
[ ] Are redaction tests present?
[ ] Does this preserve mobile-forward architecture?
```

---

## 9. First Implementation Batch Recommendation

### Batch C1 — Minimal command bridge

Files likely to add:

```text id="xdfb4r"
apps/crablink-tauri/src/adapters/commands/commandTypes.ts
apps/crablink-tauri/src/adapters/commands/commandClient.ts
apps/crablink-tauri/src/adapters/commands/diagnosticsCommands.ts
apps/crablink-tauri/src/adapters/commands/settingsCommands.ts

apps/crablink-tauri/src-tauri/src/bridge/mod.rs
apps/crablink-tauri/src-tauri/src/bridge/envelope.rs
apps/crablink-tauri/src-tauri/src/bridge/error.rs
apps/crablink-tauri/src-tauri/src/bridge/redact.rs
apps/crablink-tauri/src-tauri/src/bridge/correlation.rs

apps/crablink-tauri/src-tauri/src/commands/mod.rs
apps/crablink-tauri/src-tauri/src/commands/diagnostics.rs
apps/crablink-tauri/src-tauri/src/commands/settings.rs
apps/crablink-tauri/src-tauri/src/commands/feature_status.rs
```

Initial commands:

```text id="7xkov5"
health_check
ready_check
get_app_diagnostics
read_settings
write_settings
oap_status
sidecar_status
vault_status
```

Expected first gate:

```text id="ktw5yb"
React can safely call Rust.
Rust returns typed envelopes.
Disabled future features are truthful.
No secrets cross the bridge.
```

---

## 10. Plain-English Summary

The Tauri command bridge is the line between:

```text id="tvl1mk"
CrabLink as a beautiful React product
```

and:

```text id="pil6o2"
CrabLink as a native Rust-powered RON client
```

The bridge must be strong because Tauri gives the app real power.

Correct mental model:

```text id="zc99ev"
React asks.
TypeScript adapts.
Rust validates.
Gateway/OAP/services answer.
Rust redacts.
React renders.
```

Most important rule:

```text id="x88mre"
The command bridge gives CrabLink native power without giving the UI backend authority.
```

```
```
