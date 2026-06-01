# NEW NOTES - POST CHROME EXTENSION - BEGIN TAURI NOTES - CHECK OLD_NOTES.MD FOR PRIOR NOTES 

### BEGIN NOTE - MAY 17 2026 - 14:20 CST

# Carryover Notes — CrabLink Tauri IDB Session

## 0. Session checkpoint

This session continued the strategic pivot from **Chrome-extension-first** to **Tauri-first**. The reference notes explicitly state that the Chrome extension proved the product model — `crab://` routing, route-owned React pages, gateway-only discipline, typed b3 asset pages, paid image/site/article/post/comment/image views, and receipt-driven unlocks — but that the next phase needs native-client capabilities such as OAP/1, secure local persistence, native deep links, media paths, local node orchestration, and sidecars. 

The working assumption for all future sessions is now:

```text
Chrome Extension = green proof client / browser companion / gateway smoke surface
CrabLink Tauri = primary native Rust-backed RON client
```

The Chrome extension must remain useful and green, but major new product systems should now be designed for Tauri unless they are small proof fixes.

---

## 1. Documents created in this session

We created the first major CrabLink Tauri IDB set in chat. These should be copied into the CrabLink repo, likely under something like:

```text
docs/tauri/
apps/crablink-tauri/docs/
docs/idb/tauri/
```

Recommended final filenames:

```text
CRABLINK_TAURI_IDB.MD
SECURITY_NOTES_CRABLINK_TAURI.MD
TAURI_MIGRATION_IDB.MD
RUN_STACK_AND_MODES_IDB.MD
TAURI_COMMAND_BRIDGE_IDB.MD
CRAB_URL_AND_DEEP_LINK_IDB.MD
STORAGE_AND_SETTINGS_IDB.MD
```

### 1.1 `CRABLINK_TAURI_IDB.MD`

Purpose:

```text
Top-level native app constitution for CrabLink Tauri.
```

Core decisions:

```text
Tauri is primary.
Chrome extension remains proof/companion.
Reuse React instead of starting from scratch.
Gateway compatibility comes first.
OAP is future Rust-side only.
Tauri Rust backend is the local/native trust boundary.
React owns display and user intent, not authority.
No fake receipts.
No fake balances.
No silent spend.
No arbitrary code execution.
No direct ledger mutation.
No app-specific logic inside RustyOnions substrate crates.
```

Most important invariant:

```text
CrabLink Tauri is a client, not the backend.
```

---

### 1.2 `SECURITY_NOTES_CRABLINK_TAURI.MD`

Purpose:

```text
Security notes / threat model for the Tauri app.
```

Core decisions:

```text
React is display/orchestration only.
TypeScript helpers own no secrets.
Tauri Rust commands mediate native privilege.
Secrets do not cross into React.
Deep links are untrusted input.
Paid actions require explicit confirmation.
Vault/private-key custody is future-gated.
Sidecars are future-gated.
OAP is future-gated.
Offline cache must verify b3.
```

Important note:

```text
In later docs I referenced this as SECURITY_NOTES_CRABLINK_TAURI.MD.
The original template target also mentioned apps/crablink-tauri/docs/SECURITY_NOTES.md.
Next session should choose one canonical filename and keep references consistent.
```

Recommended canonical name:

```text
SECURITY_NOTES_CRABLINK_TAURI.MD
```

---

### 1.3 `TAURI_MIGRATION_IDB.MD`

Purpose:

```text
Migration plan from Chrome-extension proof client to Tauri-first app.
```

Core decisions:

```text
Do not rewrite from scratch.
Extract shared React core.
Move Chrome APIs behind adapters.
Move Tauri APIs behind adapters.
Keep Chrome proof client green.
Mount React in Tauri.
Preserve gateway route behavior first.
Add native layers only after gates.
```

The current codebundle confirms the Chrome app already has a large route-owned React structure: `App.jsx`, router/routeRegistry, shell components, route pages, shared API clients, local catalog, shared components, embeds, manifest helpers, receipts, theme, b3/crab utilities, and smoke scripts. 

Migration target shape:

```text
apps/crablink-tauri/
  src/
    React app / adapters
  src-tauri/
    Rust commands / state / gateway client / future OAP / future vault

packages/crablink-core/
  route registry
  pages
  shared components
  manifests
  embeds
  truth boundaries

extensions/chrome/
  maintained proof/companion client
```

---

### 1.4 `RUN_STACK_AND_MODES_IDB.MD`

Purpose:

```text
Define what runs behind the Tauri app.
```

Core decisions:

```text
Default = Gateway Mode.
Localhost = dev/test convenience, not product destiny.
Local Dev Stack Mode = explicit contributor mode.
Optional Local Node / Sidecar Mode = future, disabled by default.
Mobile Mode = gateway-first, no sidecar assumption.
Offline Mode = display/cache only, not backend truth.
```

Most important runtime model:

```text
Normal user:
  CrabLink Tauri → configured gateway → RustyOnions services

Developer:
  CrabLink Tauri → localhost svc-gateway → local dev services

Future power user:
  CrabLink Tauri → optional supervised local node/sidecar
```

Critical invariant:

```text
The app is the client.
The services are the services.
The ledger is the ledger.
The wallet is the wallet.
The gateway is the gateway.
Do not blur these boundaries.
```

---

### 1.5 `TAURI_COMMAND_BRIDGE_IDB.MD`

Purpose:

```text
Define the safe bridge between React/TypeScript and Tauri Rust.
```

Core decisions:

```text
React asks.
TypeScript adapts.
Rust validates.
Gateway/OAP/services answer.
Rust redacts.
React renders.
```

Initial command set should stay small:

```text
health_check
ready_check
version_check
get_app_diagnostics
read_settings
write_settings
resolve_crab_url_gateway
sidecar_status
vault_status
oap_status
```

Forbidden command patterns:

```text
run
execute
eval
shell
raw_http
raw_oap
raw_wallet
raw_ledger
raw_storage
raw_index
```

Critical invariant:

```text
The command bridge gives CrabLink native power without giving the UI backend authority.
```

---

### 1.6 `CRAB_URL_AND_DEEP_LINK_IDB.MD`

Purpose:

```text
Define canonical crab:// URL grammar and native deep-link safety.
```

Canonical forms:

```text
Internal content ID:
  b3:<64 lowercase hex>

Public typed asset URL:
  crab://<64 lowercase hex>.<asset_kind>

Named site URL:
  crab://<site_name>

Profile URL:
  crab://@username
```

Deep-link rule:

```text
A crab:// URL is navigation input.
It is not spend authority.
It is not filesystem authority.
It is not execution authority.
It is not wallet authority.
It is not vault authority.
```

Native Tauri deep links must:

```text
parse first
classify second
policy third
resolve fourth
pay only with explicit confirmation
render only after proof
never execute from the URL
```

---

### 1.7 `STORAGE_AND_SETTINGS_IDB.MD`

Purpose:

```text
Define safe settings, local state, display caches, persistence categories, amnesia behavior, wipe/export controls, and future vault/cache boundaries.
```

Storage categories defined:

```text
safe_settings
display_state
recent_routes
recent_receipts_display_cache
local_catalog_display_cache
creator_drafts
verified_public_asset_cache
encrypted_private_cache_future
vault_future
sidecar_runtime_state
diagnostic_logs
migration_state
```

Critical rules:

```text
Settings are preferences.
Display cache is convenience.
Local catalog is UX helper.
Drafts are unpublished work.
Verified cache is b3-checked bytes.
Vault is future secure authority boundary.
Backend is truth.
```

Most important storage invariant:

```text
If it can spend, sign, unlock, prove ownership, or prove ledger truth,
it does not belong in normal settings storage.
```

---

## 2. Current project doctrine after this session

### 2.1 The Chrome extension is a successful proof, not the final product

The extension proved the product loop. It should remain:

```text
green proof client
browser companion
gateway smoke surface
compatibility target
```

Acceptable Chrome work:

```text
bug fixes
build fixes
smoke-test helpers
gateway route proof
small compatibility updates
documentation
```

Avoid major new Chrome work:

```text
full media system
OAP client
local wallet vault
native service orchestration
sidecar supervision
large streaming subsystem
Tauri-only architecture backports
```

The old extension notes already framed CrabLink as a thin browser client that should call `svc-gateway` only, not internal services. 

---

### 2.2 The Tauri app must be professional, not localhost-locked

The Tauri app must support:

```text
configured remote gateway
configured local gateway
LAN/self-hosted gateway
local dev stack
future optional sidecar/local node
future OAP path
future mobile gateway-first profile
```

It must not assume:

```text
localhost forever
manual dev stack forever
all users run wallet/ledger/storage/index locally
sidecar is always available
desktop APIs exist on mobile
```

---

### 2.3 React reuse is a primary asset

Do not start over. Carry forward:

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
b3/crab URL utilities
gateway clients
paid gate components
```

Remove or isolate:

```text
chrome.storage
chrome.action
extension popup/options-only logic
host permissions
browser extension CSP assumptions
extension-only routing
Chrome packaging as primary product path
```

Replace with:

```text
Tauri settings store
Tauri commands
Tauri deep links
Tauri file dialogs
Tauri secure storage adapter
Tauri media/file APIs
Tauri Rust state
Tauri sidecar/node supervisor
```

---

## 3. Hard invariants to carry into the next session

These must be preserved in every future IDB and code batch.

```text
No fake ROC.
No fake receipts.
No fake balances.
No silent spend.
No arbitrary code execution.
No wallet truth in UI.
No ledger truth in UI.
No direct ledger mutation from CrabLink.
No direct wallet mutation outside backend wallet path.
No direct storage/index mutation from React.
No OAP frame construction in React.
No public main→alt linkage by default.
No private keys in React.
No seed phrases in React/TypeScript/local settings.
No uncapped spend authority in local settings.
No cache as backend truth.
No local catalog as svc-index truth.
No receipt display cache as durable receipt truth.
No localhost hard-lock.
No hidden sidecar launch.
No QuickChain validator/ROX/Solana/bridge/staking/liquidity logic inside CrabLink.
```

---

## 4. Current canonical architecture

Use this as the mental model next session:

```text
CrabLink Tauri App
├── React UI
│   ├── route registry
│   ├── pages
│   ├── asset renderers
│   ├── paid gates
│   ├── truth boundaries
│   └── creator workspaces
│
├── TypeScript adapter layer
│   ├── UI-safe DTO helpers
│   ├── command wrappers
│   ├── gateway wrappers
│   ├── storage adapters
│   ├── deep-link adapters
│   └── no secret ownership
│
├── Tauri Rust backend
│   ├── command handlers
│   ├── app state manager
│   ├── gateway client
│   ├── deep-link parser/handler
│   ├── storage/settings manager
│   ├── redaction/error mapping
│   ├── future OAP client adapter
│   ├── future passport/wallet vault adapter
│   ├── future offline cache verifier
│   ├── future sidecar/local node supervisor
│   └── platform adapters
│
└── RustyOnions backend/services
    ├── svc-gateway
    ├── omnigate
    ├── svc-wallet
    ├── ron-ledger
    ├── svc-storage
    ├── svc-index
    ├── svc-passport
    ├── ron-auth / ron-kms / ron-policy
    └── future OAP/ron-transport path
```

---

## 5. Runtime mode doctrine

Carry this exact model forward:

```text
Gateway Mode:
  default, professional client mode
  CrabLink Tauri → configured svc-gateway

Local Dev Stack Mode:
  contributor testing mode
  CrabLink Tauri → http://127.0.0.1:8090 svc-gateway
  local wallet/passport/storage/index/omnigate/gateway may run externally

Gateway + Rust Command Mode:
  near-term Tauri target
  React → TypeScript adapter → Tauri command → gateway client → svc-gateway

OAP Client Mode:
  future, Rust-side only, feature-gated
  requires OAP_CLIENT_IDB.MD

Sidecar Node Mode:
  future, opt-in, disabled by default
  requires SIDECAR_LOCAL_NODE_IDB.MD

Offline Verified Cache Mode:
  future, display/cache only
  requires OFFLINE_CACHE_IDB.MD

Mobile Gateway Mode:
  future mobile default
  no sidecar assumption
```

---

## 6. Documents still needed

The next session should continue with the remaining Tauri IDBs. Recommended order:

```text
1. PAID_ACTIONS_AND_RECEIPTS_IDB.MD
2. PASSPORT_WALLET_VAULT_IDB.MD
3. OAP_CLIENT_IDB.MD
4. SIDECAR_LOCAL_NODE_IDB.MD
5. OFFLINE_CACHE_IDB.MD
6. MEDIA_TAURI_IDB.MD
7. FACET_SANDBOX_IDB.MD
8. TESTING_MATRIX_TAURI_IDB.MD
9. SECURITY_AND_AMNESIA_IDB.MD if we want a dedicated whole-app amnesia/security constitution beyond the security notes
```

### 6.1 Recommended next file: `PAID_ACTIONS_AND_RECEIPTS_IDB.MD`

This should probably be next because paid gates are central to the CrabLink proof and must survive migration unchanged.

Purpose:

```text
prepare/quote
explicit confirmation
wallet hold/capture/release/transfer path
receipt/access proof
content unlock
balance refresh
receipt display cache
fail-closed paid states
```

Must define:

```text
paid action state machine
receipt source of truth
idempotency keys
correlation IDs
backend wallet route rules
gateway/OAP/sidecar source rules
local cache limitations
paid site_visit/content_view/image/post/comment/article actions
receipt display cache boundaries
no silent spend
```

Core invariant:

```text
No paid content unlocks without backend receipt/access proof.
No spend happens without explicit user confirmation.
```

---

### 6.2 `PASSPORT_WALLET_VAULT_IDB.MD`

Purpose:

```text
local persistent RON Passports
main identity passport
anonymous alt passports
wallet-linked permissions
platform secure storage
vault lock/unlock
main→alt privacy boundaries
```

Must define:

```text
passport is identity/capability record, not wallet
wallet account is economic authority boundary
vault storage categories
local private key handling
platform secure storage
zeroization
biometric/PIN future gates
alt passport privacy
no public main→alt linkage by default
```

This is required before real local key custody.

---

### 6.3 `OAP_CLIENT_IDB.MD`

Purpose:

```text
Tauri Rust-side OAP integration.
```

Must define:

```text
ron-app-sdk integration
OAP/1 frame bounds
1 MiB max frame
64 KiB preferred streaming chunks
timeouts
capability bytes
DTO mapping
gateway fallback
source labeling
error taxonomy
no React OAP frames
```

This should happen before serious native OAP commands.

---

### 6.4 `SIDECAR_LOCAL_NODE_IDB.MD`

Purpose:

```text
optional local micronode/macronode/service bundle.
```

Must define:

```text
sidecar disabled by default
explicit enablement
health/ready
ports
restart backoff
bounded logs
shutdown
binary provenance
mobile limitations
no silent wallet authority
no app-as-backend confusion
```

This addresses the user’s concern about whether we run our own services safely.

---

### 6.5 `OFFLINE_CACHE_IDB.MD`

Purpose:

```text
verified offline assets and local cache.
```

Must define:

```text
which assets can be cached
b3 verification before render
quota
eviction
corruption handling
offline named-site snapshots
receipt display cache
cache is not ownership truth
cache is not wallet truth
cache does not unlock paid content by itself
```

---

### 6.6 `MEDIA_TAURI_IDB.MD`

Purpose:

```text
large images/video/music/podcast/stream handling in Tauri.
```

Must define:

```text
range reads
segment playback
native file preview
upload staging
no full-file command buffering
b3 verification
media manifests
renditions
offline media cache
OAP/gateway media source split
no fake DRM/anti-rip claims
```

---

### 6.7 `FACET_SANDBOX_IDB.MD`

Purpose:

```text
code/game/algo/app facets and sandboxed execution.
```

Must define:

```text
no arbitrary execution by default
facet manifest
permissions
resource limits
network access rules
wallet access rules
storage access rules
svc-sandbox / svc-mod relation
policy allowlists
safe placeholders before execution
```

---

### 6.8 `TESTING_MATRIX_TAURI_IDB.MD`

Purpose:

```text
the green-gate map for the whole Tauri app.
```

Must define:

```text
desktop smoke
mobile smoke
Chrome proof smoke
gateway mode tests
local dev stack tests
command bridge tests
deep-link tests
paid gate tests
settings/storage tests
amnesia tests
OAP tests
vault tests
sidecar tests
offline cache tests
media tests
facet negative tests
security regression tests
```

This should be created before the first major code batch or immediately after the paid/vault/OAP docs.

---

## 7. Suggested opening prompt for next session

Use this to restart smoothly:

```text
We are continuing the CrabLink Tauri IDB phase. In the last session we created CRABLINK_TAURI_IDB.MD, SECURITY_NOTES_CRABLINK_TAURI.MD, TAURI_MIGRATION_IDB.MD, RUN_STACK_AND_MODES_IDB.MD, TAURI_COMMAND_BRIDGE_IDB.MD, CRAB_URL_AND_DEEP_LINK_IDB.MD, and STORAGE_AND_SETTINGS_IDB.MD.

The pivot is from Chrome-extension-first to Tauri-first. The Chrome extension remains a green proof/companion client. CrabLink Tauri is now the primary native Rust-backed RON client. We are not coding the app yet; we are finishing the IDB set first.

Next I am ready for PAID_ACTIONS_AND_RECEIPTS_IDB.MD. Preserve all RustyOnions invariants: gateway compatibility first, no fake ROC, no fake receipts, no silent spend, wallet mutation through svc-wallet, ron-ledger as durable truth, b3 canonical addressing, no direct ledger/storage/index mutation from CrabLink, OAP Rust-side only, sidecar/vault/cache/media future-gated, and no arbitrary crab:// execution.
```

---

## 8. After IDBs: likely implementation path

Once the remaining blueprints are done, the first code phase should be modest and reversible.

Recommended first code phase:

```text
Batch T0 — Create docs folder and add IDBs to repo
Batch T1 — Scaffold apps/crablink-tauri
Batch T2 — Mount existing React shell in Tauri
Batch T3 — Create shared adapter contracts
Batch T4 — Move safe settings behind adapter
Batch T5 — Add minimal Tauri command bridge
Batch T6 — Preserve gateway health/ready/resolve flow
Batch T7 — Add route parity smoke
Batch T8 — Add paid gate parity smoke
Batch T9 — Add deep-link stub/parser tests
Batch T10 — Add storage wipe/amnesia stubs
```

Do not start with:

```text
full OAP
vault
sidecar
large media
facet execution
mobile packaging
QuickChain
```

Those need the remaining IDBs and gates first.

---

## 9. Exact first implementation skeleton after docs

When code begins, likely target structure:

```text
crablink/
  apps/
    crablink-tauri/
      package.json
      vite.config.ts
      index.html
      src/
        main.jsx
        TauriRoot.jsx
        adapters/
          commands/
          storage/
          gateway/
          deepLinks/
      src-tauri/
        Cargo.toml
        tauri.conf.json
        src/
          main.rs
          app_state.rs
          bridge/
            envelope.rs
            error.rs
            redact.rs
            correlation.rs
          commands/
            diagnostics.rs
            settings.rs
            feature_status.rs
          gateway/
            client.rs
          storage/
            safe_settings.rs

  packages/
    crablink-core/
      app/
      routeRegistry/
      shared/
      pages/

  extensions/
    chrome/
      stays green proof/companion
```

This should be introduced gradually.

---

## 10. Key warnings for the next instance

The next assistant must not drift into these mistakes:

```text
Do not propose deleting the Chrome extension.
Do not propose a total React rewrite.
Do not make the app localhost-only.
Do not make normal users run local services.
Do not put wallet/ledger truth in local settings.
Do not store private keys in React/TypeScript.
Do not store seed phrases anywhere.
Do not make OAP a React concern.
Do not let Tauri commands become raw shell/exec/native backdoors.
Do not let deep links spend/unlock/execute.
Do not treat cache as truth.
Do not implement sidecar before its IDB.
Do not implement vault before its IDB.
Do not implement media streaming before its IDB.
Do not implement facet execution before its sandbox IDB.
Do not sneak QuickChain/ROX/Solana/bridge/staking/liquidity into CrabLink.
```

---

## 11. Final checkpoint summary

We ended this session with a strong architectural foundation for Tauri.

The completed docs now define:

```text
What CrabLink Tauri is.
Why the Chrome extension phase is complete enough.
How to migrate React safely.
How runtime modes work.
How Rust commands are bounded.
How crab:// and deep links remain safe.
How settings/storage avoid becoming fake backend truth.
```

The next best step is:

```text
PAID_ACTIONS_AND_RECEIPTS_IDB.MD
```

because paid gates and receipts are the heart of the product proof and must survive the Tauri migration unchanged.


### END NOTE - MAY 17 2026 - 14:20 CST


### BEGIN NOTE -  MAY 18 2026 - 14:05 CST

# CrabLink Tauri Carryover Notes — Continue Fixing Broken Asset/Product Flows

## 0. Current checkpoint

We successfully pivoted CrabLink from Chrome-proof-first into a working **Tauri-first native app**. The Tauri app now launches, renders the copied React shell, and contains the same route/page structure from the Chrome proof client. The current Tauri codebundle scope confirms the app now includes `apps/crablink-tauri`, the Rust command bridge, platform/core packages, Tauri docs, and selected Tauri scripts while excluding Chrome source from the Tauri bundle. 

Current mental model:

```text
RustyOnions backend owns durable truth.
CrabLink Tauri is the primary native client.
Chrome remains green proof / companion.
Tauri React owns display and user intent.
Tauri Rust mediates native/network privilege.
Gateway remains the public boundary.
No direct wallet/storage/index/ledger mutation from the UI.
```

The big lesson from this session: copying the Chrome React frontend got the UI back fast, but **every page that relied on Chrome/WebView `fetch`, `window.confirm()`, Chrome extension storage wording, Blob uploads, or extension-origin assumptions must now be audited and ported to Tauri-native adapters/commands.**

---

## 1. What is working now

### 1.1 Tauri app scaffold and React migration

Working:

```text
apps/crablink-tauri launches.
The copied React CrabLink shell renders.
Routes/pages/components/styles are present.
The Tauri codebundle generator works.
Chrome bundle and Tauri bundle are separate.
Chrome source remains preserved.
```

Important repo workflow now:

```bash
cd /Users/mymac/Desktop/crablink

bash scripts/check-tauri.sh
bash scripts/make_codebundle.sh
```

Current Tauri bundle output:

```text
CODEBUNDLE_TAURI_APP.md
```

Chrome bundle script was retired/renamed to:

```text
scripts/make_codebundle_chrome.sh
```

Expected Chrome bundle output:

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

Both codebundles should stay local and ignored by Git.

---

### 1.2 Local RustyOnions dev stack

The Tauri app should be tested against the same local RustyOnions dev stack used by Chrome.

Expected local shape:

```text
CrabLink Tauri
→ svc-gateway       127.0.0.1:8090
→ omnigate          127.0.0.1:9090
→ svc-wallet        127.0.0.1:8088
→ svc-passport      127.0.0.1:5307
→ svc-storage       127.0.0.1:5303
→ svc-index         127.0.0.1:5304
```

Startup reminder:

```bash
# Terminal 1
cd /Users/mymac/Desktop/RustyOnions
RUST_LOG=info \
SVC_WALLET_ADDR=127.0.0.1:8088 \
cargo run -p svc-wallet

# Terminal 2
cd /Users/mymac/Desktop/RustyOnions
PASSPORT_CONFIG_FILE=crates/svc-passport/config/default.toml \
RUST_LOG=info \
cargo run -p svc-passport

# Terminal 3
cd /Users/mymac/Desktop/RustyOnions
ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"

OMNIGATE_PASSPORT_BASE_URL=http://127.0.0.1:5307 \
OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
OMNIGATE_WALLET_BEARER=dev \
RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303 \
scripts/web3_crablink_dev_stack.sh

# Terminal 4
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run tauri:dev
```

Useful backend verification:

```bash
curl -fsS http://127.0.0.1:8090/healthz && echo
curl -fsS http://127.0.0.1:8090/readyz && echo
curl -fsS http://127.0.0.1:8090/identity/me | jq .
curl -fsS http://127.0.0.1:8090/wallet/acct_dev/balance | jq .
```

Fund `acct_dev` for Tauri testing:

```bash
curl -fsS -X POST http://127.0.0.1:8088/v1/issue \
  -H 'Authorization: Bearer dev' \
  -H "Idempotency-Key: dev-fund-acct-dev-$(date +%s)" \
  -H 'Content-Type: application/json' \
  -d '{"to":"acct_dev","asset":"roc","amount_minor":"1776","memo":"dev fund acct_dev for Tauri"}' \
  | jq .
```

---

## 2. Tauri bridge work completed

### 2.1 Wallet and identity fixed

Initial issue:

```text
Wallet/passport UI loaded from copied Chrome assumptions.
Balance failed with HTTP-preview / extension-origin wording.
acct_dev needed to match funded dev wallet.
```

Fixes made:

```text
apps/crablink-tauri/src-tauri/src/commands/wallet.rs
apps/crablink-tauri/src-tauri/src/commands/identity.rs
apps/crablink-tauri/src-tauri/src/commands/mod.rs
apps/crablink-tauri/src-tauri/src/lib.rs
apps/crablink-tauri/src-tauri/src/state.rs
apps/crablink-tauri/src/shared/api/gatewayClient.js
```

Current behavior:

```text
Wallet balance loads.
Passport/identity loads.
acct_dev shows backend-derived ROC balance.
Tauri Rust calls svc-gateway for wallet/identity.
React no longer depends on WebView fetch for those display reads.
```

Important detail:

```text
state.rs default wallet_account was changed to acct_dev.
```

That matches the dev funding command and avoids showing empty `acct:main:dev`.

---

### 2.2 Gateway health/readiness fixed

Initial issue:

```text
Health check failed:
“Load failed HTTP preview mode may also be blocked by browser/CORS/origin limits...”
```

Cause:

```text
getHealth() and getReady() still used browser/WebView fetch.
```

Fixes made:

```text
apps/crablink-tauri/src-tauri/src/commands/health.rs
apps/crablink-tauri/src-tauri/src/lib.rs
apps/crablink-tauri/src/shared/api/gatewayClient.js
```

Current behavior:

```text
Gateway health works through health_check_gateway.
Gateway readiness works through ready_check_gateway.
```

---

### 2.3 General gateway command bridge added

Initial issue:

```text
Site prepare failed with “Load failed”.
Other product pages would fail the same way.
```

Cause:

```text
GatewayClient.request() still used WebView fetch for most product routes.
Only special methods like wallet/identity/health were routed through invoke().
```

Fixes made:

```text
apps/crablink-tauri/src-tauri/src/commands/gateway.rs
apps/crablink-tauri/src-tauri/src/commands/mod.rs
apps/crablink-tauri/src-tauri/src/lib.rs
apps/crablink-tauri/src/shared/api/gatewayClient.js
```

Current behavior:

```text
JSON/text gateway requests can go through invoke("gateway_request").
Rust command allowlists public svc-gateway routes.
React product clients no longer need raw WebView fetch for JSON/text actions.
```

Critical invariant:

```text
This is not an arbitrary URL fetch command.
It must stay allowlisted to public svc-gateway paths only.
Do not turn it into raw_http, fetch_any_url, shell, eval, run, execute, or generic native authority.
```

Allowlisted route families should remain conservative:

```text
GET  /healthz
GET  /readyz
GET  /identity/me
GET  /identity/passport/profile/...
GET  /crab/resolve
GET  /b3/...
GET  /o/...
GET  /sites/...
GET  /assets/...
GET  /content/...
GET  /wallet/:account/balance

POST /wallet/hold
POST /sites/prepare
POST /sites
POST /paid/o
POST /o
POST /assets/...
POST /content/...
POST /identity/passport/...
POST /sites/...

PUT  /o
PUT  /o/...
PUT  /paid/o
```

Keep adding routes only when the page genuinely needs them and they are public gateway routes.

---

## 3. Site flow status

### 3.1 Site prepare is fixed

Current working:

```text
crab://site
→ fill guided site launch form
→ Prepare Site
→ /sites/prepare succeeds
→ prepare response returns amount/hold details
```

This was fixed by routing JSON/text gateway requests through the Tauri gateway command bridge.

---

### 3.2 Site ROC hold is fixed

Initial issue:

```text
Clicking Confirm ROC Hold produced:
“No ROC hold was sent.”
```

Cause:

```text
SiteLaunchFlow.jsx used window.confirm().
In Tauri/WebView, this is fragile and can return false or behave unlike Chrome.
```

The previous `SiteLaunchFlow.jsx` had `window.confirm()` branches for the hold, root storage, and create-site steps. The old cancellation branch explicitly showed “No ROC hold was sent.” 

Fix made:

```text
apps/crablink-tauri/src/pages/site/SiteLaunchFlow.jsx
apps/crablink-tauri/src/pages/site/SiteLaunchFlow.css
```

Current behavior:

```text
Review ROC Hold
→ in-page explicit confirmation panel appears
→ Send ROC Hold
→ wallet hold is sent through gateway/wallet backend
→ paid proof becomes available
```

Important UX pattern for future pages:

```text
Do not use window.confirm() for paid actions in Tauri.
Use in-page two-step confirmation:
1. Review action
2. Send/Confirm action
```

This preserves:

```text
no silent ROC spend
explicit confirmation
backend wallet truth
receipt/proof display after backend response
```

---

### 3.3 Site root HTML storage is fixed

Initial issue:

```text
Root storage did not work after hold.
```

Cause:

```text
objectClient.js converted root HTML into Blob.
GatewayClient refused/avoided Blob through Tauri command and fell back to WebView fetch.
WebView fetch hit the same Tauri/CORS/origin failure path.
```

The Tauri codebundle showed the older object client path converting paid object bytes into a Blob before calling `gateway.request('/paid/o')`; that was the exact class of behavior that had to be removed for Tauri text uploads. 

Fix made:

```text
apps/crablink-tauri/src/shared/api/objectClient.js
```

Current behavior:

```text
Review Root Storage
→ Send Root HTML
→ root HTML travels as bounded text through gateway_request
→ /paid/o succeeds
→ real b3 root CID returns
→ root CID auto-fills
```

Important pattern:

```text
Small textual assets can be routed through gateway_request as bodyText.
Blob/FormData/ArrayBuffer uploads should not fall back to WebView fetch.
Large/binary asset uploads need dedicated bounded Tauri upload commands.
```

---

### 3.4 Site create still needs verification

Known current status from user:

```text
Prepare Site works.
Send ROC Hold works.
Send Root HTML works.
```

Next immediate site check:

```text
Review Site Create
→ Create Site Pointer
→ verify crab://<site_name> opens and renders
```

If site create fails, likely causes:

```text
1. createSite still has old window.confirm branch if replacement was partial.
2. siteClient.createSite needs strict body/header correction.
3. gateway_request allowlist is missing exact route/method.
4. paid proof field names do not match backend expectation.
5. create response unwrap/summarize path is still Chrome-shaped.
```

Debug location:

```text
Open Developer request/result details
Copy Create request/result
Check:
- route
- status
- reason
- data
- paid_proof
- createRequest
```

---

## 4. Main lesson for all remaining pages

The copied Chrome React code has four recurring incompatibility classes:

```text
1. WebView fetch path
2. window.confirm paid-action prompts
3. Blob/FormData/ArrayBuffer upload path
4. Chrome extension storage/origin wording
```

For every asset/product type, audit and fix these same four things.

Do not assume because the page renders that it is connected. The UI copied well, but many flows are still calling APIs in the old Chrome way.

---

## 5. Golden Tauri porting pattern

For each page/asset flow, use this model:

```text
React page / client helper
→ GatewayClient.request()
→ if Tauri and JSON/text: invoke("gateway_request")
→ Rust allowlisted gateway_request
→ svc-gateway
→ backend service path
```

For wallet display:

```text
React wallet client
→ gateway.getWalletBalance()
→ invoke("wallet_balance_gateway")
→ svc-gateway /wallet/:account/balance
```

For identity display:

```text
React identity client
→ gateway.getIdentityMe()
→ invoke("identity_me_gateway")
→ svc-gateway /identity/me
```

For paid action:

```text
prepare/quote
→ in-page Review action
→ Send action with confirmed: true
→ wallet hold through backend
→ backend receipt/proof
→ upload/create/pay
→ display receipt/proof
→ refresh wallet
```

For text uploads:

```text
string body
→ gateway_request bodyText
→ bounded Rust command
→ svc-gateway
```

For binary uploads:

```text
File/Blob/ArrayBuffer
→ dedicated Tauri upload command
→ bounded body size
→ content-type validated
→ paid proof headers attached
→ svc-gateway
```

Do not push large binary files through command return values or React state. Media must be bounded and honest.

---

## 6. Remaining broken/at-risk feature areas

### 6.1 Image page

Likely files:

```text
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
apps/crablink-tauri/src/pages/image/ImageCreate.jsx
apps/crablink-tauri/src/shared/api/assetClient.js
apps/crablink-tauri/src/shared/api/objectClient.js
apps/crablink-tauri/src/shared/api/walletClient.js
```

Likely issues:

```text
- window.confirm for paid upload or hold
- Blob/File upload through gateway.request
- /assets/image/prepare likely now works if JSON/text
- actual /assets/image upload likely still fails if raw File/Blob falls to fetch
- paid proof header names must match backend contract
```

Image upload probably needs a dedicated Rust command like:

```text
asset_upload_gateway
```

or a more specific:

```text
image_asset_upload_gateway
```

Rules for the image upload command:

```text
- allow POST /assets/image only
- max MVP upload size
- accept bytes from frontend carefully
- attach paid proof headers
- attach x-ron-passport / x-ron-wallet-account
- return JSON metadata only, not file bytes
- no direct svc-storage
```

---

### 6.2 Article page

Likely files:

```text
apps/crablink-tauri/src/pages/article/ArticlePublishFlow.jsx
apps/crablink-tauri/src/pages/article/ArticleDraft.jsx
apps/crablink-tauri/src/shared/api/articleAssetClient.js
apps/crablink-tauri/src/shared/manifest/uniformManifest.js
```

Likely status:

```text
Draft UI renders.
Prepare/publish may be partially wired from Chrome proof.
JSON prepare may work now through gateway_request.
Any final publish with text body should work if it uses gateway.request with JSON/text.
If it builds Blob or uses window.confirm, it must be fixed.
```

Audit:

```text
grep for window.confirm
grep for Blob
grep for FormData
grep for fetch(
grep for chrome.
grep for "extension origin"
```

Expected fix pattern:

```text
Replace window.confirm with in-page Review Article Publish / Send Article Publish.
Ensure body is JSON/text, not Blob.
Use gateway_request.
Do not invent article b3 CID locally.
Display backend returned crab://<hash>.article only.
```

---

### 6.3 Post page

Likely files:

```text
apps/crablink-tauri/src/pages/post/PostPublishFlow.jsx
apps/crablink-tauri/src/pages/post/PostDraft.jsx
apps/crablink-tauri/src/shared/api/postAssetClient.js
```

Likely status:

```text
Same class as article.
Draft UI likely renders.
Publish flow likely still has Chrome assumptions.
```

Expected flow:

```text
prepare post
→ review ROC hold if paid
→ send hold
→ publish post
→ backend returns b3/crab URL
```

---

### 6.4 Comment page

Likely files:

```text
apps/crablink-tauri/src/pages/comment/CommentPublishFlow.jsx
apps/crablink-tauri/src/pages/comment/CommentDraft.jsx
apps/crablink-tauri/src/shared/api/commentAssetClient.js
```

Likely status:

```text
Same class as post/article.
May be text-only and easier than image/media.
```

Expected fix:

```text
remove window.confirm
route JSON/text through gateway_request
normalize backend returned b3/comment URL
refresh wallet after paid action
```

---

### 6.5 Content view / paid access

Likely files:

```text
apps/crablink-tauri/src/shared/api/contentViewClient.js
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
```

Current risk:

```text
May still use window.confirm for pay-to-view.
May rely on gateway.request fetch for quote/pay.
Quote/pay JSON likely works now through gateway_request.
UI confirmation still needs in-page Review Pay / Send Payment.
Receipt display cache must remain display-only.
Offline cache cannot unlock paid content alone.
```

Important invariant:

```text
Paid flow:
prepare/quote
→ explicit confirmation
→ backend wallet path
→ backend receipt
→ unlock/render
→ receipt display cache
→ balance refresh
```

---

### 6.6 Site visit paid access

Likely files:

```text
apps/crablink-tauri/src/shared/api/siteVisitClient.js
apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx
apps/crablink-tauri/src/pages/site/SiteRender.jsx
```

Risk:

```text
Site creation is creator-side.
Site visit is visitor-side.
Do not conflate them.
```

Expected eventual behavior:

```text
Visitor B opens paid site
→ quote/prepare visit
→ explicit confirmation
→ wallet debit from visitor B
→ creator A receives/backend accounting path
→ receipt shown
→ render unlocked content
```

This needs backend truth. No fake visit receipts.

---

### 6.7 Music / lyrics / podcast / stream / video

Likely files:

```text
apps/crablink-tauri/src/pages/music/*
apps/crablink-tauri/src/pages/lyrics/*
apps/crablink-tauri/src/pages/podcast/*
apps/crablink-tauri/src/pages/stream/*
apps/crablink-tauri/src/pages/video/*
apps/crablink-tauri/src/shared/manifest/*
apps/crablink-tauri/src/shared/embed/*
```

Likely status:

```text
Mostly local draft/product scaffolds.
Not all backend publish routes may exist yet.
Media must not be pushed through generic command bodies.
```

Important Tauri media rule:

```text
No full large media file through command results.
Prefer range/segment/rendition-aware commands.
Each rendition has its own b3.
No DRM/anti-rip claims.
No creator-supplied player execution.
```

Near-term recommendation:

```text
Do not attempt full video/music binary upload first.
Start with text/light metadata pages: article, post, comment.
Then image.
Then media after a dedicated media/upload IDB implementation pass.
```

---

### 6.8 Code / game / algo / ad facets

Likely files:

```text
apps/crablink-tauri/src/pages/code/*
apps/crablink-tauri/src/pages/game/*
apps/crablink-tauri/src/pages/algo/*
apps/crablink-tauri/src/pages/ad/*
```

Status:

```text
These should remain inert/draft-first.
Do not execute crab:// code.
Do not run creator-provided scripts.
Do not introduce arbitrary eval/shell/native command paths.
```

Facet doctrine:

```text
crab links can identify code.
They do not execute by default.
Future safe model:
b3hash.code = address
facet.toml = contract
ron-policy = judge
svc-sandbox = cage
svc-mod = heavy jobs
CrabLink = renderer/launcher
```

---

## 7. Chrome-extension wording still needs Tauri cleanup

Observed UI warning:

```text
“React is outside the extension origin and cannot read loaded extension storage.”
```

This is wrong for Tauri. It came from copied Chrome storage/settings assumptions.

Likely files:

```text
apps/crablink-tauri/src/app/settings.js
apps/crablink-tauri/src/storage.js
apps/crablink-tauri/src/app/shell/PassportChip.jsx
apps/crablink-tauri/src/app/shell/PassportDrawer.jsx
apps/crablink-tauri/src/platform/tauriPlatform.js
apps/crablink-tauri/src/platform/platform.js
```

Fix goal:

```text
In Tauri:
- Do not say extension origin.
- Do not say Chrome storage.
- Say “Tauri local app settings” or “local display cache” where appropriate.
- Settings should be mediated through Tauri settings adapter/commands when possible.
```

Do not make local storage authoritative. Use it only for:

```text
UI/session convenience
drafts
display preferences
nonce hints as UX hints only
receipt display cache only
```

Not allowed:

```text
local wallet truth
local receipt truth
local paid unlock truth
local ownership truth
```

---

## 8. Exact next-session priority order

### Priority 1 — Verify site create end-to-end

Start next session by testing:

```text
crab://site
→ Prepare Site
→ Review ROC Hold
→ Send ROC Hold
→ Review Root Storage
→ Send Root HTML
→ Review Site Create
→ Create Site Pointer
→ open crab://<site_name>
```

If it works:

```text
Mark site creator flow as Tauri-green.
Regenerate CODEBUNDLE_TAURI_APP.md.
Move to article/post/comment.
```

If it fails:

```text
Paste Developer request/result details for Create request/result.
Likely fix siteClient.js or allowlist/payload shape.
```

Files to request if create fails:

```text
apps/crablink-tauri/src/shared/api/siteClient.js
apps/crablink-tauri/src/pages/site/SiteLaunchFlow.jsx
apps/crablink-tauri/src-tauri/src/commands/gateway.rs
apps/crablink-tauri/src/shared/api/gatewayClient.js
```

---

### Priority 2 — Fix Tauri wording/storage warnings

This is UX polish but important because it makes the app look broken even when backend truth is working.

Files to request:

```text
apps/crablink-tauri/src/app/settings.js
apps/crablink-tauri/src/storage.js
apps/crablink-tauri/src/app/shell/PassportDrawer.jsx
apps/crablink-tauri/src/app/shell/PassportChip.jsx
apps/crablink-tauri/src/platform/tauriPlatform.js
```

Goal:

```text
Replace extension-origin warnings with Tauri-aware storage/settings status.
```

---

### Priority 3 — Fix article publish

Why article first:

```text
Text-heavy.
Less binary complexity than image/video.
Likely easiest after site root text-storage fix.
```

Files to request:

```text
apps/crablink-tauri/src/pages/article/ArticlePublishFlow.jsx
apps/crablink-tauri/src/pages/article/ArticleDraft.jsx
apps/crablink-tauri/src/shared/api/articleAssetClient.js
apps/crablink-tauri/src/shared/api/walletClient.js
apps/crablink-tauri/src/shared/api/gatewayClient.js
```

Audit checklist:

```text
window.confirm
Blob
FormData
ArrayBuffer
fetch(
chrome.
extension origin
HTTP preview
local fake CID
fake receipt
```

Expected patch pattern:

```text
In-page Review Article Publish.
Send Article Publish only after explicit second click.
JSON/text through gateway_request.
Receipt/proof from backend only.
No local fake b3.
```

---

### Priority 4 — Fix post publish

Files:

```text
apps/crablink-tauri/src/pages/post/PostPublishFlow.jsx
apps/crablink-tauri/src/pages/post/PostDraft.jsx
apps/crablink-tauri/src/shared/api/postAssetClient.js
```

Use the same pattern as article.

---

### Priority 5 — Fix comment publish

Files:

```text
apps/crablink-tauri/src/pages/comment/CommentPublishFlow.jsx
apps/crablink-tauri/src/pages/comment/CommentDraft.jsx
apps/crablink-tauri/src/shared/api/commentAssetClient.js
```

Use the same pattern as article/post.

---

### Priority 6 — Fix image upload

Image needs special handling because it likely uses `File`/`Blob`.

Files:

```text
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
apps/crablink-tauri/src/pages/image/ImageCreate.jsx
apps/crablink-tauri/src/shared/api/assetClient.js
apps/crablink-tauri/src-tauri/src/commands/gateway.rs
apps/crablink-tauri/src-tauri/src/lib.rs
apps/crablink-tauri/src-tauri/src/commands/mod.rs
```

Likely required new command:

```text
apps/crablink-tauri/src-tauri/src/commands/upload.rs
```

or:

```text
apps/crablink-tauri/src-tauri/src/commands/assets.rs
```

Purpose:

```text
Bounded paid image upload to POST /assets/image.
```

This should not be a generic arbitrary upload command.

---

## 9. Search/audit commands for next session

Run from repo root:

```bash
cd /Users/mymac/Desktop/crablink

grep -R "window.confirm" -n apps/crablink-tauri/src | sort
grep -R "fetch(" -n apps/crablink-tauri/src | sort
grep -R "new Blob\\|Blob(" -n apps/crablink-tauri/src | sort
grep -R "FormData" -n apps/crablink-tauri/src | sort
grep -R "ArrayBuffer" -n apps/crablink-tauri/src | sort
grep -R "chrome\\." -n apps/crablink-tauri/src | sort
grep -R "extension origin\\|HTTP preview\\|loaded extension storage" -n apps/crablink-tauri/src | sort
```

Expected interpretation:

```text
window.confirm = replace with in-page explicit confirmation.
fetch( = route through gatewayClient/Tauri adapter unless harmless local.
Blob/FormData/ArrayBuffer = likely needs dedicated Tauri upload command.
chrome. = behind Chrome adapter only, not direct in Tauri path.
extension origin wording = rewrite for Tauri.
```

---

## 10. Testing matrix to preserve

After each feature fix:

```bash
cd /Users/mymac/Desktop/crablink

bash scripts/check-tauri.sh
bash scripts/make_codebundle.sh

cd apps/crablink-tauri
npm run tauri:dev
```

Manual tests:

```text
crab://home
crab://profile
crab://site
crab://image
crab://article
crab://post
crab://comment
crab://library
crab://receipts
```

Backend checks:

```bash
curl -fsS http://127.0.0.1:8090/healthz && echo
curl -fsS http://127.0.0.1:8090/readyz && echo
curl -fsS http://127.0.0.1:8090/wallet/acct_dev/balance | jq .
```

Feature-level tests:

```text
For every paid flow:
- quote/prepare shows amount
- review screen appears
- second click sends action
- wallet balance refreshes
- backend receipt/proof appears
- no local fake receipt
- no silent spend
- cancel/review path sends no ROC
```

---

## 11. Hard invariants to carry forward

Do not violate these while fixing pages:

```text
No fake ROC balances.
No fake receipts.
No silent spend.
No local wallet truth.
No local ledger truth.
No direct svc-wallet from React.
No direct svc-storage from React.
No direct svc-index from React.
No direct ron-ledger from React.
No direct omnigate from React unless specifically routed through gateway contract.
No arbitrary Tauri command execution.
No raw shell/run/eval commands.
No generic arbitrary URL fetch command.
No external settlement / ROX / Solana / bridge work.
No QuickChain implementation yet.
```

Allowed:

```text
Tauri Rust may call configured svc-gateway.
React may request typed commands through adapters.
React may hold display/session state.
React may keep drafts and display-only receipt cache.
Tauri may verify/cache public b3 assets later.
```

Not allowed:

```text
Tauri app mutating ledger truth directly.
React creating balances/receipts.
Cache unlocking paid content alone.
Passports acting as wallets.
Sidecar being enabled by default.
Facet/code execution.
```

---

## 12. Best handoff prompt for the next instance

Use this to resume:

```text
We are continuing the CrabLink Tauri migration. The Tauri app launches and the copied React shell is present. Backend local stack works. Wallet/passport/gateway health now work through Tauri Rust commands. A general allowlisted gateway_request command was added for JSON/text svc-gateway requests. Site prepare works. Site ROC hold was fixed by replacing window.confirm with in-page explicit confirmation. Site root HTML storage was fixed by changing objectClient so text root HTML goes through gateway_request bodyText instead of Blob/WebView fetch. Next we need to verify site create end-to-end, then fix the same broken Chrome assumptions across article, post, comment, image, content view, site visit, and later media pages.

Preserve all invariants: gateway-first, no fake balances/receipts, no silent spend, no direct internal services from React, no arbitrary Tauri commands, no external settlement/QuickChain work.

Work style: ask for 2–3 files at a time and return full paste-ready replacements, not patch scripts.
```

---

## 13. Most important next files to inspect

Start here:

```text
apps/crablink-tauri/src/shared/api/siteClient.js
apps/crablink-tauri/src/pages/site/SiteLaunchFlow.jsx
apps/crablink-tauri/src/shared/api/objectClient.js
```

Then:

```text
apps/crablink-tauri/src/app/settings.js
apps/crablink-tauri/src/storage.js
apps/crablink-tauri/src/app/shell/PassportDrawer.jsx
```

Then text asset flows:

```text
apps/crablink-tauri/src/pages/article/ArticlePublishFlow.jsx
apps/crablink-tauri/src/shared/api/articleAssetClient.js

apps/crablink-tauri/src/pages/post/PostPublishFlow.jsx
apps/crablink-tauri/src/shared/api/postAssetClient.js

apps/crablink-tauri/src/pages/comment/CommentPublishFlow.jsx
apps/crablink-tauri/src/shared/api/commentAssetClient.js
```

Then binary/image:

```text
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
apps/crablink-tauri/src/shared/api/assetClient.js
apps/crablink-tauri/src-tauri/src/commands/gateway.rs
```

---

## 14. Session success summary

This was a major Tauri integration session.

We proved:

```text
Tauri app can run the copied CrabLink React shell.
Tauri Rust can mediate gateway/wallet/identity requests.
Gateway health/readiness can bypass WebView fetch.
JSON/text product actions can route through allowlisted Rust command bridge.
Site prepare works.
Site ROC hold works through explicit in-page confirmation.
Site root HTML storage works after removing Blob/WebView upload path.
```

The remaining work is not a rethink. It is a systematic migration pass:

```text
for each page:
  remove Chrome assumptions
  remove window.confirm
  remove Blob/WebView fetch where needed
  route JSON/text through gateway_request
  add dedicated bounded upload commands for binary/media
  preserve explicit paid-action flow
  verify backend-derived receipt/proof
```

That is the path to making CrabLink Tauri feel like a real native client rather than a copied extension running in a WebView.


### END NOTE - MAY 18 2026 - 14:05 CST




### BEGIN NOTE - MAY 18 2026 - 16:10 CST

## Carryover notes — CrabLink Tauri migration parity session

This was a major success. Based on your manual testing reports, CrabLink Tauri is now very close to Chrome-extension parity in both **look** and **functionality**, while staying aligned with the Tauri-first IDB doctrine: Tauri is now the primary client, Chrome remains the green proof/companion client, gateway compatibility comes first, OAP remains future Rust-side only, b3 remains canonical, wallet/ledger truth stays backend-owned, and paid actions cannot fake receipts or silently spend ROC. 

The most important result is that we did **not** rebuild CrabLink from scratch. We successfully reused the proven React shell, routes, pages, paid gates, creator flows, receipt panels, asset rendering patterns, and gateway clients, which is exactly what the migration IDB says to do. The IDB specifically calls out that the existing React work is a proven asset and should be carried forward where practical. 

---

## What we accomplished

### 1. Tauri is now acting like the real CrabLink client

The Tauri app is now visually and functionally close to the Chrome extension proof. The top shell, address bar, CrabLink navigation, gateway chip, passport/wallet chip, ROC balance chip, settings button, route rendering, and creator workspace flows are all behaving like a native version of the CrabLink browser.

This is important because the goal of the Tauri migration was not “desktop wrapper for Chrome.” The IDB goal is a native Rust-backed RON client with the existing product loop preserved first, then native features added behind gates. 

Current working mental model:

```text
CrabLink Tauri
→ reused React product shell
→ TypeScript gateway/adapters
→ Tauri Rust command bridge where needed
→ configured svc-gateway
→ omnigate / RustyOnions services
→ backend wallet/ledger/storage/index truth
```

Chrome remains valuable, but it is now the proof/companion/smoke surface rather than the primary product target.

---

### 2. Site creation remains fully working

Site creation was already the first fully proven asset/page type after the Tauri migration. It proved the key pattern we then repeated for the other asset types:

```text
draft/prepare
→ explicit ROC hold
→ submit publish/create request
→ backend creates real b3/manifest/index truth
→ returned crab:// route opens
→ page renders through gateway truth
```

This became the template for post, article, comment, and image fixes.

Important carryover lesson: every asset type needed the same class of migration fix because Chrome assumptions and Tauri bridge behavior differed. The asset-specific pages were not conceptually broken; their gateway/Tauri bridge details needed to be made explicit and route-safe.

---

### 3. Post creation was repaired

The post flow was updated from a `window.confirm()` flow into a Tauri-safe review/send flow.

The important behavior now is:

```text
Step 1: prepare post publish
Step 2: review/send ROC hold
Step 3: review/submit post publish
```

The post flow keeps the required invariants:

```text
no silent ROC spend
no fake post CID
no fake receipt
no direct storage/index/ledger calls
publish requires backend hold proof
```

The older `PostPublishFlow.jsx` was larger because it contained more inline confirmation and diagnostic logic. The newer Tauri-safe version is okay because the necessary logic was preserved while changing the confirmation UX away from browser popup behavior.

---

### 4. Article creation was repaired

Article publishing was brought into the same Tauri-safe prepare → hold → publish pattern.

The important result is that articles now behave like proper b3-backed paid text assets:

```text
article draft
→ backend prepare
→ explicit wallet hold
→ article publish
→ crab://<hash>.article returned
→ paid view gate applies when opened
```

No local draft state is treated as published truth. The rendered article page must come from the backend-created content object/manifest after payment access is proven.

---

### 5. Comment creation was repaired

Comment publishing was brought into parity with post/article.

The comment path now has the same hard boundary:

```text
comment creation is a backend publish action
comment view is a backend paid content_view action
local UI cannot invent comment body or receipt truth
```

This matters because comments will eventually become a reference-graph primitive. They need to point to posts/articles/sites/assets without becoming UI-only objects.

---

### 6. Image upload was repaired with a dedicated Tauri binary upload command

This was the most important Tauri-specific technical fix.

The generic `gateway_request` bridge is JSON/text-oriented and is not the right path for raw image bytes. The image publish flow could prepare and hold ROC, but it could not complete upload because the raw `File`/`Blob` was not reliably crossing the Tauri command bridge.

We added the design for a dedicated bounded Rust command:

```text
upload_image_asset_gateway
```

Purpose:

```text
React/ImagePublishFlow
→ assetClient.uploadImage()
→ Tauri invoke upload_image_asset_gateway
→ Rust command sends POST /assets/image
→ svc-gateway receives raw bytes + paid proof headers
```

This preserves the command bridge IDB rule that commands should be small, typed, bounded, and allowlisted, not generic native executors. The IDB explicitly warns against generic `run/execute/eval/shell/raw_*` style commands and says privileged/native behavior must stay behind narrow Tauri commands. 

The new image upload command is intentionally narrow:

```text
fixed route: POST /assets/image
bounded body: 1 MiB MVP
requires paid proof headers
requires image/* content type
uses configured gateway
does not call storage/index/ledger directly
does not create fake CIDs or receipts
```

This is the correct pattern for future binary routes: do not force raw media through the generic JSON/text gateway bridge.

---

### 7. Visitor B dev session now works in Tauri

The first issue was “window blocked.” That happened because the old dev session flow still assumed browser popup/window behavior.

We fixed the Tauri behavior so dev sessions switch the current Tauri window rather than relying on blocked popups.

Then we hit a Vite-specific issue: the app navigated to `/?url=...`, and Vite interpreted `?url` as a special asset query. That produced the `403 Restricted` screen. We fixed that by moving Tauri route/session state into hash parameters:

```text
#url=crab%3A%2F%2Fhome&crablinkSession=visitor-b&starterGrantMinor=1776
```

instead of:

```text
?url=crab%3A%2F%2Fhome&crablinkSession=visitor-b...
```

Carryover rule: in Tauri/Vite dev mode, avoid top-level `?url=` route state. Use hash route/session state for app navigation.

---

### 8. Zoom was added to the Tauri shell

Command + / Command - was not working because the Tauri WebView does not behave exactly like Chrome browser tabs.

We added app-owned UI zoom:

```text
top bar zoom controls
settings modal zoom controls
Command + / Command - / Command 0
stored display-only zoom preference
bounded zoom range
```

This is display-only state. It does not touch backend truth, wallet truth, route truth, receipt truth, or asset truth.

Carryover file set:

```text
apps/crablink-tauri/src/shared/utils/uiZoom.js
apps/crablink-tauri/src/app/shell/TopBar.jsx
apps/crablink-tauri/src/app/shell/Shell.css
```

---

### 9. Site visit payment was repaired

Visitor B could load, but site visit quote/pay initially failed with:

```text
x-ron-wallet-account must match site visit payer account
payer_mismatch
```

The cause was a header/body mismatch. The body said Visitor B was payer, while the gateway/default header could still reflect another wallet account.

We fixed the problem in two places:

```text
gatewayClient.js
siteVisitClient.js
```

Important change:

```text
route-specific headers must override default gateway headers
```

For site visit, quote/pay now sends route-specific:

```text
x-ron-wallet-account: payer_account
x-ron-passport: visitor_passport_subject
Idempotency-Key: ...
```

This matters because account switching in Tauri is URL/session-scoped during dev, while the Rust command bridge and gateway client may still have default settings. Route-specific economic context must win for paid route correctness.

---

### 10. Asset content_view payment was repaired

After site payments, asset pages still had quote/pay problems. The root issue was the same category: `contentViewClient.js` did not send payer/passport headers for `/content/view/quote` and `/content/view/pay`.

We fixed that by making content view quote/pay also send route-specific headers:

```text
x-ron-wallet-account: payer_account
x-ron-passport: viewer_passport_subject
Idempotency-Key: ...
```

We also patched the Rust generic gateway command so request-specific headers override defaults rather than being overwritten by stale default Tauri settings.

This is crucial for Visitor B testing:

```text
Visitor B opens creator A asset
→ content_view quote must use acct_visitor_b
→ content_view pay must use acct_visitor_b
→ recipient remains creator account
→ backend receipt unlocks the content
```

The paid-actions IDB says paid actions must require explicit confirmation, backend wallet path mutation, backend receipts, and display-only local receipt cache. 

---

### 11. Paid asset rendering was repaired for post/article/comment

After content_view payment succeeded, text assets were paid/unlocked, but post/article/comment body rendering was wrong or incomplete.

Root cause: `AssetHydratedView.jsx` fetched `/o/${summary.cid}` and then assumed `response.data` was a plain string. In Tauri command mode, gateway responses can already be parsed objects. That meant text content could be paid/unlocked but not properly parsed into title/body/schema metadata.

We fixed this by making `AssetHydratedView.jsx` normalize multiple possible content shapes:

```text
string raw body
plain text
JSON string
already-parsed object
nested content object
asset_content
text_content
body_content
content_object
```

We also added stronger extraction for:

```text
title
body
summary
language
tags
site relation
parent relation
thread relation
hero image
schema
kind
```

Now paid post/article/comment pages should unlock and render content after backend receipt proof, not from local draft state.

---

### 12. Receipt hash overflow was fixed

The paid receipt panel had long txid / receipt hash / ledger root strings spilling out of the page.

We added CSS wrapping rules to force long proof strings to stay inside their cards:

```text
overflow-wrap: anywhere
word-break: break-word
white-space: normal
min-width: 0
max-width: 100%
```

Carryover file:

```text
apps/crablink-tauri/src/pages/asset/asset.css
```

This is only display cleanup. It does not alter receipt truth.

---

### 13. Gateway command bridge was hardened

The Rust Tauri gateway bridge was updated to better support the migration:

```text
GET/POST/PUT allowlist
relative routes only
bounded route/body/response sizes
configured gateway base URL
request-specific economic headers override defaults
managed headers are skipped/reapplied safely
content body parsed into JSON/string
```

Key carryover file:

```text
apps/crablink-tauri/src-tauri/src/commands/gateway.rs
```

This aligns with the command bridge IDB: Rust commands must be typed, bounded, allowlisted, redacted, and gateway-first. 

---

## Current functional status

Based on manual reports from this session:

```text
Tauri app launches: working
React shell renders: working
Top bar/address bar: working
Zoom controls: working
Gateway health/status UI: working
Creator A / Visitor B switching: working
Site creation: working
Post creation: working
Article creation: working
Comment creation: working
Image creation/upload: patched and expected working after final assetClient + Rust command update
Paid site visit: working after header fixes
Paid post/article/comment view: payment working and render patched
Receipt display: working, overflow patched
Balance chip: showing backend refreshed changes
```

Important qualification: we should begin next session by running the full green gates and one clean manual smoke from a fresh Tauri restart so we can lock this as a stable checkpoint.

---

## Files changed or touched conceptually in this session

Frontend / React / API clients:

```text
apps/crablink-tauri/src/shared/api/gatewayClient.js
apps/crablink-tauri/src/shared/api/siteVisitClient.js
apps/crablink-tauri/src/shared/api/contentViewClient.js
apps/crablink-tauri/src/shared/api/assetClient.js
apps/crablink-tauri/src/shared/utils/devPassportSessions.js
apps/crablink-tauri/src/shared/utils/uiZoom.js
apps/crablink-tauri/src/app/appState.js
apps/crablink-tauri/src/app/shell/TopBar.jsx
apps/crablink-tauri/src/app/shell/Shell.css
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/pages/asset/asset.css
apps/crablink-tauri/src/pages/post/PostPublishFlow.jsx
apps/crablink-tauri/src/pages/article/ArticlePublishFlow.jsx
apps/crablink-tauri/src/pages/comment/CommentPublishFlow.jsx
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
```

Tauri Rust bridge:

```text
apps/crablink-tauri/src-tauri/src/commands/gateway.rs
apps/crablink-tauri/src-tauri/src/commands/assets.rs
apps/crablink-tauri/src-tauri/src/commands/mod.rs
apps/crablink-tauri/src-tauri/src/lib.rs
```

Important theme across the files: site, post, article, comment, image, site_visit, and content_view all needed the same migration principle:

```text
Chrome-ish assumptions out.
Tauri-safe explicit review/send in.
Route-specific headers in.
Backend receipts only.
No fake local unlock.
No raw bytes through generic JSON command bridge.
```

---

## Invariants preserved

We stayed aligned with the core IDBs:

```text
Tauri is primary.
Chrome remains proof/companion.
Gateway compatibility came first.
React owns display and intent only.
Tauri Rust mediates privileged/native operations.
Wallet mutation remains backend-owned.
ron-ledger remains durable economic truth.
b3 hashes remain canonical content truth.
Paid actions require explicit confirmation.
Receipts are backend-derived.
Local receipt cache is display-only.
No fake balances.
No fake receipts.
No silent spend.
No OAP in React.
No QuickChain/external settlement scope creep.
No arbitrary facet/code/game execution.
```

The storage/settings IDB is especially important for next steps: local state can improve UX, but it must never become backend truth; safe settings, display cache, receipt cache, verified public cache, encrypted private cache, and future vault storage must stay separated. 

---

## Known risks / things to verify next session

### 1. Confirm final image upload after the new Rust command

The last patch added `assetClient.js` support for:

```text
invoke('upload_image_asset_gateway')
```

and assumes these Rust-side pieces exist and are registered:

```text
commands/assets.rs
commands/mod.rs includes pub mod assets;
lib.rs registers commands::assets::upload_image_asset_gateway
```

Next session should start by verifying a clean image flow:

```text
crab://image
choose small image under 1 MiB
prepare
review/send ROC hold
review/send image upload
open returned crab://<hash>.image
Visitor B pays content_view
image renders after receipt
```

If it fails, inspect the upload result JSON first. The most likely remaining causes would be missing Rust command registration, `@tauri-apps/api/core` import/build issue, or backend rejecting a required paid proof header.

---

### 2. Run complete green gates

The testing matrix IDB says the test suite must prevent regressions across React, TypeScript adapters, Tauri Rust commands, gateway compatibility, deep links, settings/storage, paid actions, receipts, passports, OAP, sidecars, offline cache, media, facets, amnesia, and security regressions. 

Start next session with:

```bash
cd /Users/mymac/Desktop/crablink
bash scripts/check-tauri.sh
bash scripts/make_codebundle.sh
bash scripts/check-chrome.sh
```

Then launch:

```bash
cd apps/crablink-tauri
npm run tauri:dev
```

Chrome still needs to stay green as proof/companion, even though major product work now targets Tauri.

---

### 3. Verify Creator A / Visitor B accounting end-to-end

Manual checklist:

```text
Creator A:
  create site
  create post
  create article
  create comment
  create image

Visitor B:
  open each route
  quote/pay site_visit or content_view
  confirm B balance decreases
  confirm creator account balance increases or receipt/payout metadata points correctly
  confirm content unlocks only after backend receipt
```

Important: do not rely only on the UI balance chip. Also inspect backend receipt JSON and wallet balance refresh results.

---

### 4. Make sure stale local state does not hide bugs

Because we used dev session URL state, localStorage nonce hints, receipt display cache, and route state, stale local state can confuse testing.

Next session should test at least once with a clean state path:

```text
fresh Tauri restart
fresh gateway/dev stack
fresh Creator A site
fresh Visitor B payment
fresh asset publish
fresh content_view payment
```

Later we should add a proper “Clear local dev state” button following STORAGE_AND_SETTINGS_IDB rather than manually clearing random browser/WebView storage.

---

### 5. Confirm all paid buttons are enabled only when backend quote/proof is usable

We saw cases where the pay/upload button was grayed out because the quote or paid proof was not usable. That is correct fail-closed behavior when data is missing, but the UI should always explain why.

Next session, inspect disabled states for:

```text
site_visit pay
content_view pay
post publish
article publish
comment publish
image upload
```

Each disabled state should have a clear reason:

```text
waiting for prepare
missing wallet
missing passport
missing backend quote
missing paid proof
gateway unavailable
payment already complete
content already unlocked
```

---

## Next session recommended plan

### Step 1 — Lock the current Tauri parity baseline

Do not immediately start OAP, sidecar, vault, offline cache, or media.

First, lock this milestone:

```text
Tauri app looks like Chrome proof.
Tauri app can create all current asset/page types.
Tauri app can pay to view sites/assets.
Tauri app can switch Creator A / Visitor B.
Tauri app can show backend receipts.
Tauri app can refresh wallet balances.
Tauri app keeps Chrome proof green.
```

Suggested first action next session:

```text
Attach latest CODEBUNDLE_TAURI_APP.md after running check-tauri and make_codebundle.
```

Then we can review for cleanup.

---

### Step 2 — Build a formal Tauri manual smoke checklist

Create or update a checklist file, likely:

```text
apps/crablink-tauri/docs/MANUAL_SMOKE_TAURI.md
```

It should include:

```text
Gateway health
Creator A identity
Visitor B identity
Zoom controls
Route navigation
Site create
Post create
Article create
Comment create
Image upload
Paid site visit
Paid post view
Paid article view
Paid comment view
Paid image view
Receipt display
Balance refresh
Reload behavior
Dev session switching
Chrome proof still green
```

This will prevent us from forgetting one asset type when we change shared clients.

---

### Step 3 — Add/extend automated Tauri smoke gates

We need to move from manual “it works” to repeatable gates.

Good next script target:

```text
scripts/check-tauri.sh
```

Should eventually verify:

```text
npm install/build sanity
Vite build
Tauri Rust check
cargo fmt/check for src-tauri
no forbidden command names
no raw invoke scattered across pages if we enforce adapters
no chrome.* leaks into Tauri app
no fake ROC/receipt tokens in app code
required command registrations exist
upload_image_asset_gateway is registered
```

Potential future live smoke:

```text
scripts/smoke-tauri-local-gateway.sh
```

This can be conservative at first: verify gateway health, identity, wallet balance, route resolution. Mutating paid flows can stay manual until we are ready.

---

### Step 4 — Normalize command bridge envelopes

Current commands are useful and working, but the IDB target is a more formal envelope pattern:

```text
CommandOk<T>
CommandProblem
CommandSource
CommandProblemCode
```

The IDB says commands should return typed envelopes, errors should be redacted, and React should call commands through adapters rather than raw native details. 

Next engineering work should gradually move toward:

```text
src-tauri/src/bridge/envelope.rs
src-tauri/src/bridge/error.rs
src-tauri/src/bridge/redact.rs
src-tauri/src/bridge/correlation.rs
```

Do not break working route/product flows while doing this. Treat it as hardening/refactor after parity.

---

### Step 5 — Move raw Tauri invoke usage behind adapters

We introduced a direct Tauri import in `assetClient.js` for the image upload command. That is acceptable as a fast Tauri-specific fix, but long-term the migration IDB wants Tauri APIs isolated behind Tauri adapters and shared product code to remain platform-neutral.

Next cleanup direction:

```text
apps/crablink-tauri/src/adapters/tauri/assetUploadCommand.js
apps/crablink-tauri/src/shared/api/assetClient.js receives upload transport or command adapter
```

Do this carefully. Do not break the working image upload again.

---

### Step 6 — Storage/settings cleanup

The next serious product-quality cleanup is local state.

Targets:

```text
safe settings
recent routes
receipt display cache
local catalog display cache
nonce hints
zoom preference
dev session URL state
creator drafts
clear local state controls
amnesia mode stub
```

Rules from IDB:

```text
settings are not wallet truth
receipt display cache is not receipt truth
last-known balance is not ledger truth
offline bytes must be b3-verified before render
secrets do not live in React/localStorage/plaintext settings/logs/URLs
```

Good next UI addition:

```text
Settings → Local Data
  Clear route history
  Clear receipt display cache
  Clear local catalog display cache
  Clear dev nonce hints
  Reset zoom
  Amnesia mode: disabled/stubbed truthfully
```

---

### Step 7 — Native deep-link prep

We solved internal Tauri route/session state with hash routing, but true native OS-level `crab://` deep links are still a future gate.

Next deep-link work should follow the IDB rule:

```text
deep links are navigation requests, not authority
```

Carryover mental model from the deep-link IDB:

```text
b3 hash = content truth
crab URL = human/product route
deep link = navigation request
gateway/OAP = resolver path
wallet/ledger = economic truth
cache = verified display convenience
```

And the key safety rule:

```text
A crab link can open a door.
It cannot secretly spend, execute, unlock, read files, or become backend truth.
```



Deep-link work should add parser tests before OS registration.

---

### Step 8 — Do not start QuickChain yet

QuickChain stays future only. We are close to proving the internal ROC creator economy loop in Tauri, but we should not jump into QuickChain until the internal loop is boring and repeatable.

Before QuickChain:

```text
all current asset types create successfully
all current paid view gates work
site_visit works
content_view works
wallet receipts are visible
balance changes are backend-derived
accounting/rewarder loop is tested backend-side
Chrome proof remains green
Tauri green gates are repeatable
```

The Tauri IDB explicitly keeps QuickChain and external settlement out of active app scope while internal ROC is still being proven. 

---

## Next-session first prompt recommendation

Use something like this next time:

```text
We migrated CrabLink from Chrome-extension-first to Tauri-first and reached near Chrome parity. Site creation, post/article/comment creation, image upload, Visitor B dev session switching, paid site_visit, paid content_view for article/post/comment/image, zoom controls, and receipt rendering have all been patched. Start by reviewing the latest CODEBUNDLE_TAURI_APP.md and these carryover notes. First priority: run/verify Tauri green gates and inspect for cleanup/regression risks. Do not start OAP, sidecar, vault, media, facets, or QuickChain yet. Keep Tauri primary, Chrome proof green, gateway-first, no fake receipts/balances, no silent spend.
```

---

## Final status estimate

Current Tauri migration status: **very strong early parity milestone**.

I would describe it as:

```text
Chrome proof → Tauri parity migration: ~85–90% for current proven product loop
Tauri hardening/production readiness: ~35–45%
Native RON-client future layers: still gated/future
QuickChain readiness: not yet; internal ROC loop must be made repeatable first
```

The next session should be less about adding new visible features and more about locking the foundation: tests, smoke scripts, local state cleanup, command bridge hardening, and confirming every paid route behaves consistently from a clean restart.


### END NOTE - MAY 18 2026 - 16:10 CST### BEGIN NOTE - MAY..
Pasted text


CODEBUNDLE_TAURI_APP.md
File


NOTES.MD
File

### BEGIN NOTE - MAY 18 2026 - 19:10 CST

Excellent. This is a major checkpoint: **video is now proven end-to-end**.

We now have proof of this loop:

```text
Creator A mints video
→ backend returns canonical crab://<hash>.video
→ Visitor B opens the video route
→ Visitor B pays content_view
→ backend wallet/ledger truth returns receipt
→ CrabLink unlocks video playback
```

The failure you hit before the final success was also useful: when `acct_visitor_b` had no ROC, the backend correctly rejected the transfer with `INSUFFICIENT_FUNDS`, and CrabLink correctly refused to unlock the video locally. That confirms the paid gate is doing what it should: no fake unlock, no silent spend, no local receipt override. This matches the current paid gate invariant in the Tauri codebundle: `AssetContentViewAccess` uses explicit backend payment/receipt flow and the receipt cache is display-only. 

Below are the carry-over notes for the next instance.

---

# RustyOnions / CrabLink Tauri Carry-Over Notes — Post Video Mint + Paid Playback Proof

## 1. Current project state

The project is now firmly in the **Tauri-first CrabLink migration/product phase**.

Chrome remains useful as a proof/companion client, but the main product work is now happening in:

```text
apps/crablink-tauri/
```

The current Tauri codebundle includes the Tauri app source, Rust command bridge, Tauri IDBs, platform/core migration packages, and selected Tauri scripts. 

The active doctrine remains:

```text
Tauri is primary.
Gateway compatibility first.
React owns display/user intent.
Rust mediates native privilege.
Backend owns durable truth.
Wallet mutation goes through svc-wallet.
ron-ledger is economic truth.
b3 is canonical content truth.
crab:// is navigation, not authority.
No fake receipts.
No fake balances.
No silent spend.
No cache-only paid unlock.
No DRM/anti-rip claims.
```

The combined Tauri IDB explicitly says Tauri is the primary client, gateway compatibility comes first, b3 hashes are canonical, wallet/ledger truth remains backend-owned, and there must be no fake balances, fake receipts, silent spend, or arbitrary execution. 

## 2. Major accomplishments from this session

### 2.1 Video local preview was added and proven

We first added a clean local playback preview to `crab://video`.

That gave the creator a way to select a local `.mp4`, `.webm`, `.ogg`, `.mov`, or `.m4v` file and play it in the Tauri WebView before minting. This was intentionally **local-only** at first:

```text
No upload.
No b3 claim.
No backend stream.
No paid unlock.
No file path persisted.
No full media bytes through generic JSON command bridge.
```

This was important because media must stay honest and bounded. The media IDB says large media must not become an unbounded command-bridge blob path, must be source-labeled, must be paid-gated, and must not make fake DRM/anti-rip promises. 

### 2.2 Tauri video mint UI was added

We then added the Tauri-side video minting flow:

```text
VideoLocalPlaybackPreview.jsx
VideoPublishFlow.jsx
videoAssetClient.js
src-tauri/src/commands/assets.rs video upload command
VideoDraft.jsx integration
VideoPage.jsx truth-boundary updates
AssetContentViewAccess video paid gate inclusion
AssetHydratedView video playback inclusion
asset.css video player shell
```

The video flow mirrored the working image flow:

```text
prepare
→ explicit ROC hold
→ upload bytes with paid proof headers
→ backend returns crab://<hash>.video
→ asset page opens
→ viewer pays content_view
→ playback unlocks
```

Important: we did **not** fake a local b3 hash or fake receipt. The backend remained the minting and payment truth.

### 2.3 Backend video-lite routes were added

The first Tauri video prepare attempt returned `404`, which proved the UI was hitting the intended route but RustyOnions backend did not yet expose it.

We then patched RustyOnions backend:

```text
svc-gateway:
  POST /assets/video/prepare
  POST /assets/video

omnigate:
  POST /v1/assets/video/prepare
  POST /v1/assets/video
```

The backend video-lite route coordinates:

```text
video prepare
→ storage estimate
→ wallet hold template
→ paid storage upload
→ b3 CID returned by storage
→ video manifest creation
→ manifest storage
→ index pointer write
→ crab://<hash>.video response
```

The backend is intentionally **video-lite**, not full production streaming:

```text
No transcoding.
No range streaming yet.
No edge streaming yet.
No DRM claim.
No giant media architecture yet.
Small bounded upload proof only.
```

### 2.4 Backend compile/test gates passed

After the `"media".to_owned()` fix in `omnigate`, these passed:

```text
cargo check -p omnigate
cargo check -p svc-gateway -p omnigate
cargo test -p svc-gateway --test product_routes_proxy
cargo test -p omnigate --test image_asset_prepare
```

The important result: image minting was not broken while adding video.

### 2.5 Video mint was proven

The user successfully minted a video.

This proved:

```text
crab://video creator route works
Video prepare succeeds
Explicit ROC hold succeeds
Video upload succeeds
Backend returns canonical crab://<hash>.video
Video appears as a typed asset route
```

### 2.6 Paid video view was proven

The first paid view attempt failed because `acct_visitor_b` had insufficient funds. That was correct behavior.

After funding Wallet B, the user confirmed:

```text
Visitor B paid to view the video
Backend accepted the content_view transfer
CrabLink unlocked playback
Video played
```

That is the key product proof.

## 3. Exact lesson from video implementation

Video taught us several things that directly apply to stream.

### 3.1 Minting and viewing are separate loops

Video required two separate proof loops:

```text
Creator-side mint loop:
  prepare → hold → upload → b3/video asset minted

Viewer-side paid access loop:
  resolve → quote/pay content_view → receipt → unlock playback
```

For stream, we should keep this separation:

```text
Streamer-side stream session loop:
  prepare session → confirm stream terms → start ingest/session → publish stream pointer

Viewer-side stream access loop:
  resolve stream → quote/pay stream_access/time_slice → receipt → watch segment/window
```

### 3.2 Payment failure must block playback

The `INSUFFICIENT_FUNDS` failure was a success case for the system’s integrity.

The client displayed the problem and refused to unlock the video. That means stream must do the same:

```text
No paid stream access receipt
→ no stream playback

Expired paid window
→ pause/blur/lock stream
→ prompt for next payment

Wallet transfer rejected
→ show problem
→ do not keep playing from cache or stale local state
```

### 3.3 Video playback needed blob fallback

Direct `<video src="/b3/hash.video">` was not enough in the current dev setup. We added a bounded paid blob fallback:

```text
After paid receipt:
  fetch video bytes from gateway
  enforce size cap
  create object URL
  play video blob
```

That works for video-lite, but stream should **not** be implemented as one growing blob. Stream needs segment/range/window semantics.

The media IDB already says production media should use bounded range/segment paths, not giant command/results or cache-only unlock. 

## 4. Current stream state

The current Tauri codebundle already has a stream route:

```text
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/StreamDraft.jsx
apps/crablink-tauri/src/pages/stream/StreamPodcastMode.jsx
apps/crablink-tauri/src/pages/stream/stream.css
```

But it is still a **local creator workspace**. The codebundle states that the stream route intentionally stops at local manifest design until backend stream/session routes exist. 

So the next phase should not pretend stream is already live. We need to convert stream from draft-only into a safe **stream-lite proof path**, similar to what we just did for video-lite.

## 5. Answer to the major concern: will switching to User B shut off User A’s stream?

### Short answer

It **could** shut off the stream if we implement the stream incorrectly.

It **should not** shut off the stream if we implement it with the correct Tauri/RustyOnions separation.

### Bad architecture that would cause problems

This would be risky:

```text
User A opens crab://stream
React component owns camera/mic capture
React component owns stream session
React app global passport switches from A to B
StreamPage unmounts or state resets
Camera/mic capture stops
Stream disappears
```

In that bad model, switching from Creator A to Visitor B inside the same single Tauri app session could kill the stream because the stream is tied to the React route and current selected passport.

### Correct architecture

The stream session must be a separate runtime object, not just a React component.

Correct model:

```text
Streamer identity:
  Creator A passport/wallet used to create/start stream session.

Stream session:
  Rust-side/native supervised session or backend session object.
  Has stream_session_id.
  Has stream pointer URL, e.g. crab://<stream_id>.stream or crab://<site>/live.
  Has ingest/capture state.
  Is not destroyed just because viewer identity changes.

Viewer identity:
  Visitor B passport/wallet pays to watch.
  Visitor B never owns the streamer’s capture/session.
```

The stream should survive:

```text
Switching the viewer passport
opening another route
opening the stream in a second window
refreshing the viewer page
Visitor B paying/re-paying
```

The stream may stop only when:

```text
Creator A explicitly ends stream
native capture crashes
backend stream session expires
network/ingest fails
stream TTL ends
creator auth/capability is revoked
```

### Best UX for testing

For dev testing, the cleanest model is:

```text
Window 1: Creator Studio / Stream Control Room
  passport:main:dev / acct_dev
  starts stream
  remains open

Window 2: Viewer Window
  passport:main:visitor-b / acct_visitor_b
  opens stream URL
  pays to watch
```

If we only use one window, the app must support a “Start stream in background” model where the capture/session continues even when navigating away. But for the next proof, two windows or a control-room/player split is safer.

### Product recommendation

Add a concept of:

```text
Stream Control Room
Viewer Page
```

The streamer should not have to remain on the same viewer route. They should have a persistent control surface:

```text
Start stream
Pause stream
End stream
Set price
Set interval
See viewer count
See revenue
See current paid windows
Copy stream URL
```

The viewer gets:

```text
Pay to watch
Watch current stream
See paid window remaining
Re-up / auto-prompt
Receipt display
```

## 6. Stream payment model: ROC every X minutes

The user wants streamers to require ROC spend every X minutes and set custom amount. That is the right direction.

### Core model

A stream should have a pricing policy like:

```json
{
  "access_mode": "paid_interval",
  "price_roc": "5",
  "interval_seconds": 300,
  "grace_seconds": 15,
  "recipient_account": "acct_dev",
  "asset": "roc"
}
```

Human version:

```text
Pay 5 ROC every 5 minutes.
```

The streamer can configure:

```text
price: 1 ROC / 5 ROC / 10 ROC / custom
interval: 1 min / 5 min / 10 min / 30 min / custom
free preview: optional first N seconds
grace period: optional 5–30 seconds
re-up prompt timing: e.g. prompt at 30 seconds left
```

### Payment actions

Do not overload everything into `content_view`.

For stream, define explicit action names:

```text
stream_join
stream_watch_interval
stream_tip
stream_replay_view later
```

Recommended first proof action:

```text
stream_watch_interval
```

Why: it expresses exactly what is being bought. It is not permanent ownership and not a one-time video view.

### Interval access proof

Backend should return an access window:

```json
{
  "schema": "ron.stream-access-receipt.v1",
  "stream_id": "b3:...",
  "viewer_account": "acct_visitor_b",
  "recipient_account": "acct_dev",
  "amount": "5",
  "asset": "roc",
  "paid_from_ms": 1779147900000,
  "paid_until_ms": 1779148200000,
  "receipt_hash": "b3:...",
  "txid": "..."
}
```

CrabLink may display this, but must not invent it.

### Viewer behavior

The viewer page should do this:

```text
1. Resolve stream.
2. Show price and interval.
3. User clicks Pay.
4. Backend returns stream access receipt with paid_until.
5. Playback starts.
6. Timer counts down.
7. At 30 seconds remaining, show “Extend stream access”.
8. At expiration:
   - pause playback
   - blur/lock video
   - keep chat maybe read-only depending policy
   - prompt for another interval payment
```

### No silent subscription yet

For now, avoid automatic recurring charges.

Do **not** build:

```text
auto-pay every X minutes
background spend
hidden renewal
stored spend authority
```

Instead:

```text
manual renew prompt
explicit click each interval
clear countdown
clear amount
clear recipient
receipt after every interval
```

Later, a controlled subscription/allowance system can exist, but it needs a separate vault/spend-cap design.

## 7. Proposed stream architecture

### 7.1 Stream object types

We probably need three objects:

```text
Stream manifest:
  Long-lived stream identity and policy.
  Example: crab://<hash>.stream

Stream session:
  A live occurrence of the stream.
  Example: stream_session_id = live_...

Stream segment/window:
  Time-bounded media chunks or live playlist entries.
  Example: segment N, duration 2–6 sec, b3 verified later if recorded.
```

### 7.2 Stream routes

Frontend/gateway route shape proposal:

```text
POST /streams/prepare
POST /streams
POST /streams/:id/start
POST /streams/:id/stop
GET  /streams/:id/status
GET  /streams/:id/playlist
POST /streams/:id/access/quote
POST /streams/:id/access/pay
GET  /streams/:id/view
```

Could also use asset-style routes later:

```text
POST /assets/stream/prepare
POST /assets/stream
GET  /b3/<hash>.stream
GET  /crab/resolve?url=crab://<hash>.stream
```

For the first proof, I recommend:

```text
POST /streams/prepare
POST /streams/start
GET  /streams/:id/status
POST /streams/:id/access/quote
POST /streams/:id/access/pay
```

because stream is session-like, not just a static asset.

### 7.3 Stream ingest model

For the very first proof, do **not** attempt production-grade live streaming immediately.

Use “stream-lite”:

```text
Creator selects local camera/screen preview.
Tauri/React gets MediaStream from browser APIs.
Stream Control Room shows local preview.
Backend stream session is created and payable.
Viewer can pay and see a simulated/live status surface first.
```

Then next step:

```text
Tauri Rust/native media session supervises capture.
React controls start/stop but does not own truth.
Backend receives short segments or a dev ingest placeholder.
Viewer receives segment/playlist.
```

We should avoid building a fake stream that claims to be real if the viewer is just seeing a local-only preview. Be honest:

```text
local preview
session created
ingest not active
viewer playback not active
paid gate active
```

### 7.4 Stream should not be one giant file

Video-lite could use a bounded blob. Stream cannot.

Stream needs:

```text
short segments
sliding playlist
range/segment fetch
bounded buffer
paid window enforcement
clear expiration behavior
```

Segment sketch:

```text
segment_duration_seconds: 2–6
playlist_window_seconds: 30–60
max_segment_bytes: configured
max_viewer_buffer_seconds: configured
```

### 7.5 Recording/replay

Later, a stream can optionally become a video:

```text
live stream
→ recorded segments
→ post-stream manifest
→ minted replay video
→ crab://<hash>.video
```

That should be a future “archive stream as video” path.

## 8. Stream access and revenue model

### 8.1 Streamer-configurable pricing

In `crab://stream`, add fields:

```text
Access mode:
  free
  paid interval
  ticket/pass
  followers only later
  invite only later

Price:
  ROC amount

Interval:
  1 minute
  5 minutes
  10 minutes
  30 minutes
  custom seconds/minutes

Grace:
  0 seconds
  10 seconds
  30 seconds

Free preview:
  off
  30 seconds
  60 seconds
```

### 8.2 Payout recipient

Default recipient:

```text
creator wallet account
```

Future split:

```text
creator
platform
moderator
collaborator
site owner
```

For now:

```text
100% to creator/dev account
```

### 8.3 Receipts

Every interval payment should create/display a receipt.

Receipt display cache entry:

```text
kind: stream_access
route: crab://<hash>.stream
detail: 5 ROC · acct_visitor_b → acct_dev · 5 min
paid_until: timestamp
source: stream_access_payment_success
```

This should show in:

```text
RecentReceiptsPanel
ReceiptsPage
Library receipts
Stream viewer page
```

## 9. Stream UI plan

### 9.1 Creator stream page

Current `crab://stream` is draft-only. Next instance should convert it into a creator workspace with sections:

```text
Stream setup
Stream pricing
Local preview
Start stream
Live status
Share URL
Developer JSON
```

Fields:

```text
Title
Creator display
Category
Description
Tags
Content warning
Chat mode
Moderation mode
Rights mode
Payout mode
Access mode
Price ROC
Interval minutes
Grace seconds
Free preview seconds
```

Buttons:

```text
Preview camera/screen
Prepare stream
Start stream
Copy stream URL
Stop stream
```

Status chips:

```text
local preview
session prepared
live
paid interval
gateway-backed
viewer access required
```

### 9.2 Viewer stream page

When opening `crab://<hash>.stream`:

```text
Stream title
Creator
Live/offline status
Price
Paid window remaining
Pay to watch button
Player
Receipts
Diagnostics
```

Before payment:

```text
Stream is live
Pay 5 ROC for 5 minutes
```

After payment:

```text
Unlocked until 6:52 PM
Time remaining: 04:12
Extend access
```

Expired:

```text
Paid window expired
Pay another 5 ROC to continue
```

### 9.3 Stream control-room persistence

The control room must not be destroyed by viewer switching.

Implementation options:

```text
Option A — easiest dev proof:
  Use two windows.
  Window 1 Creator A stays on stream control.
  Window 2 Visitor B pays/watches.

Option B — better product:
  Stream session is held by Tauri Rust state.
  React can navigate/switch accounts without killing capture.
  Stream mini-control persists in top bar/sidebar.

Option C — backend-supervised:
  Stream ingest/session continues server-side.
  Client can disconnect/reconnect to control.
```

For next session, build Option A or B, but design toward C.

## 10. Backend stream plan

### 10.1 Minimal backend stream-lite proof

First backend proof should not include real transcoding or full HLS/WebRTC.

Suggested endpoints:

```text
POST /streams/prepare
POST /streams/start
POST /streams/stop
GET  /streams/:stream_id/status
POST /streams/:stream_id/access/quote
POST /streams/:stream_id/access/pay
```

For initial proof, `start` may create a live session record and return:

```json
{
  "schema": "omnigate.stream-start.v1",
  "stream_id": "stream_dev_...",
  "crab_url": "crab://<hash>.stream",
  "status": "live",
  "pricing": {
    "action": "stream_watch_interval",
    "amount": "5",
    "interval_seconds": 300
  }
}
```

### 10.2 Where truth lives

```text
svc-wallet:
  handles interval payments

ron-ledger:
  durable economic truth

omnigate:
  coordinates stream quote/access/session hydration

svc-gateway:
  public route boundary

svc-index:
  stream pointer lookup

svc-storage:
  stream manifests and later recorded segments

ron-policy:
  stream access policy later

CrabLink:
  display, user intent, playback/control UI
```

### 10.3 Avoid direct ledger mutation

Stream logic must not mutate ledger directly. It should call wallet through the same gateway/backend pattern as video/image/site.

## 11. Stream security and safety rules

Carry these into next session:

```text
No local stream unlock without backend receipt.
No cache-only stream entitlement.
No auto-renew spend.
No hidden recurring payment.
No fake viewer count.
No fake live status.
No fake recording status.
No streamer private token in React state/localStorage/URL.
No raw ingest secret in diagnostics.
No direct wallet mutation from React.
No arbitrary executable code from stream chat/facets.
No DRM/anti-rip promises.
```

Stream capture permissions:

```text
Camera/mic/screen permission must be explicit.
Show clear live indicator.
Show stop button.
Show what source is live.
Never start capture automatically.
```

## 12. What to do first in the next session

Recommended next batch:

# Batch S1 — Stream Control Room UI + stream-lite pricing model

Start in CrabLink Tauri first, but do not claim backend live streaming yet.

Modify/add:

```text
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/StreamDraft.jsx
apps/crablink-tauri/src/pages/stream/stream.css
apps/crablink-tauri/src/pages/stream/streamDraftModel.js maybe if needed
apps/crablink-tauri/src/pages/stream/StreamLocalPreview.jsx
apps/crablink-tauri/src/pages/stream/StreamPricingPanel.jsx
apps/crablink-tauri/src/pages/stream/StreamSessionPanel.jsx
```

Goals:

```text
Add camera/screen local preview.
Add stream pricing fields.
Add interval payment fields.
Add truthful status: local preview only / backend not wired yet.
Add manifest JSON preview with stream pricing policy.
Add no fake live stream claim.
```

### Why UI first?

Because we need to settle the product contract before backend routes. Video worked because we first made the UI explicit and honest, then wired backend. Stream has more product questions than video:

```text
Does streamer choose interval?
Does viewer pay manually each interval?
What happens when paid time expires?
Does stream continue when switching identity?
How does creator stop stream?
What does viewer see before payment?
```

Resolve those in the UI model first.

## 13. Second next step

# Batch S2 — Backend stream session/payment routes

After the UI model is clean, implement backend:

```text
svc-gateway:
  /streams/prepare
  /streams/start
  /streams/:id/status
  /streams/:id/access/quote
  /streams/:id/access/pay

omnigate:
  stream prepare/start/status/access handlers
```

Initial version can be stream-session truth without actual media ingest. The paid access proof can be validated first, similar to how site visit/content_view were proven.

## 14. Third next step

# Batch S3 — Viewer paid stream access

Add viewer page for `crab://<hash>.stream`:

```text
resolve stream
show live status
quote stream interval
pay stream_watch_interval
receive paid_until
unlock player/placeholder
count down access window
lock again at expiration
```

Only after this is green should we move to actual media segment delivery.

## 15. Fourth next step

# Batch S4 — Segment/playlist streaming proof

Very simple first version:

```text
Creator publishes short segments
Backend exposes playlist
Viewer fetches latest segment only after active access receipt
Player appends/plays bounded media
```

Do not attempt production livestream quality yet.

Potential future modes:

```text
HLS-like playlist
WebRTC later
OAP media path later
sidecar/local node relay later
edge relay later
```

But keep first proof boring and safe.

## 16. Dev testing checklist for next session

Before stream work:

```text
Start RustyOnions stack.
Fund acct_dev.
Fund acct_visitor_b.
Confirm gateway ready.
Confirm Tauri launches.
Confirm video proof still works after restart.
```

Remember: when the local stack restarts, dev wallet state may reset. The video failure was caused by `acct_visitor_b` not being funded. Keep this as a recurring test note:

```text
If paid access fails with INSUFFICIENT_FUNDS:
  fund acct_visitor_b
  refresh balance
  retry
```

Stream testing should use:

```text
Creator A:
  passport:main:dev
  wallet: acct_dev

Visitor B:
  passport:main:visitor-b
  wallet: acct_visitor_b
```

## 17. Testing gates to preserve

After every stream batch:

```text
bash scripts/check-tauri.sh
```

Also keep these RustyOnions backend checks green after backend stream routes:

```text
cargo fmt -p svc-gateway -p omnigate
cargo check -p svc-gateway -p omnigate
cargo test -p svc-gateway --test product_routes_proxy
cargo test -p omnigate --test image_asset_prepare
```

Then add stream-specific tests once routes exist:

```text
cargo test -p svc-gateway --test stream_routes_proxy
cargo test -p omnigate --test stream_session_prepare
cargo test -p omnigate --test stream_access_pay
```

## 18. Current completion estimate after video proof

For the **Tauri migration/parity phase**, we are now around:

```text
78–82%
```

Why higher than before:

```text
Video route now has local preview.
Video minting works.
Backend video-lite works.
Paid video access works.
Playback after paid receipt works.
Image/site/text/video paid loops are all now conceptually aligned.
```

For the **full Tauri-native end-state**, still around:

```text
55–60%
```

Because still pending:

```text
stream live sessions
real range/segment media path
native deep-link hardening
offline verified cache
OAP proof
vault/secure storage
sidecar supervision
mobile matrix
facet sandboxing
production media pipeline
```

## 19. Exact handoff summary for next instance

Start the next session with this mental model:

```text
We just proved video end-to-end:
  local preview
  video-lite mint
  backend b3 video asset
  paid content_view
  Wallet B receipt
  video playback unlock

The next target is stream.
Current stream route is local draft only.
Do not jump to production livestreaming.
Build stream-lite in phases:
  1. Control Room UI with local preview and pricing policy.
  2. Backend stream session/payment routes.
  3. Viewer paid interval access.
  4. Segment/playlist proof.
```

Critical design decision:

```text
A stream must not be owned by the currently selected viewer passport.
Creator A’s stream session must survive Visitor B viewing/paying.
Use separate stream_session_id and streamer identity.
Viewer payment is separate from streamer capture/control.
```

Payment model:

```text
Streamer sets custom ROC amount and custom interval.
Viewer pays explicitly for each interval.
Backend returns paid_until.
Playback pauses/locks when paid_until expires.
No automatic recurring spend yet.
```

Do not violate:

```text
No fake live state.
No fake stream receipt.
No silent auto-renew.
No local unlock.
No giant streaming blob.
No local cache entitlement.
No direct wallet mutation.
No DRM claim.
```

This is the right next frontier. Video gave us the exact pattern we needed; stream is the same economic truth model, but with session lifetime, paid time windows, and segment/playlist media constraints.


### END NOTE - MAY 18 2026 - 19:10 CST


### BEGIN NOTE - MAY 18 2026 - 20:55 CST

Excellent milestone: **live camera preview is now proven in CrabLink Tauri on macOS.** That is a major unlock for the stream product. The current state is exactly where it should be before backend streaming: the app can capture local camera preview, it can launch a local stream-room marker, it has pricing fields, and it remains honest that no backend stream, b3 mint, receipt, viewer entitlement, or ROC transfer exists yet. The current stream page/code still explicitly marks itself as local draft/preview only and says future stream routes must handle backend status/access/receipts. 

Below are exhaustive carry-over notes for the next session.

---

# CrabLink Tauri Stream Carry-Over Notes

## 1. Current milestone achieved

We successfully got **live camera preview working inside the Tauri app**.

This required adding the macOS media permission path:

```text
src-tauri/Info.plist
NSCameraUsageDescription
NSMicrophoneUsageDescription
```

and adding the dev media launch profile:

```text
src-tauri/tauri.macos.dev-media.conf.json
app.macOSPrivateApi = true
```

The missing npm script problem was fixed by adding:

```text
tauri:dev:mac-media
```

to `apps/crablink-tauri/package.json`.

The final working launch path is:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run tauri:dev:mac-media
```

This matters because the earlier WebView camera failure was not a Rust/React build issue. The app built green. The missing piece was macOS permission/prompt enablement plus the dev media WebView profile.

## 2. Current stream page state

The stream page currently has these working/proven parts:

```text
crab://stream route
large stream control-room UI
camera preview working
screen/file fallback path planned
chat placeholder UI
stream pricing fields
ROC per interval fields
local stream room launch/stop marker
media readiness diagnostics
developer JSON preview
local backend launch request preview
```

The current stream page is intentionally **not backend live**. Its invariants say it is local draft/preview only, with no fake b3 CID, no fake live status, no fake receipt, no ROC mutation, and no backend publication claim. 

The stream pricing panel already models the right product idea: viewer unlock must eventually come from a backend stream access receipt with a `paid_until` style window, and local JSON/preview/cache cannot unlock the stream. 

The local stream session panel is also still only a local Tauri session marker. It does not create a backend stream, b3 address, crab URL, viewer entitlement, receipt, or ROC transfer. 

## 3. Answer: can we launch the app twice?

**Maybe for dev testing, but it is not the right long-term proof path.**

Tauri dev mode may allow launching another process/window depending on how the app/runtime is configured, but there are several risks:

```text
Camera ownership may only work cleanly in one process/window.
macOS privacy permissions may attach to the same dev bundle identity.
The second app instance may reuse app state unexpectedly.
The creator preview can die if the React component unmounts.
Switching passports inside the same app can kill the local MediaStream if the route/session is not isolated.
```

For the proof we actually need, the better mental model is:

```text
Creator A app/session captures camera.
Creator A publishes/starts a backend stream session.
Backend stream session owns viewer truth.
Visitor B watches through a separate viewer path.
Visitor B pays through gateway/wallet.
Backend receipt grants a time-bounded access window.
Viewer playback comes from backend stream/session route, not Creator A’s local React preview state.
```

For local testing, we can use either:

```text
Option A: one Tauri app as Creator A + one regular browser window as Visitor B hitting gateway viewer URL.
Option B: one Tauri app with Creator A route + second Tauri window if/when multi-window support is added.
Option C: two Tauri app instances only as a temporary dev hack, not as the architecture.
```

The cleanest next-session path is **not** “run two apps and hope the camera stays alive.” The clean path is to make the creator camera feed survive independently of route navigation and make viewer playback consume backend truth.

## 4. Biggest architectural issue: keeping the stream alive

Right now the live camera preview is tied to the React/WebView component. That means the stream can die if:

```text
the creator navigates away from crab://stream
the component unmounts
the app reloads
the WebView permission/session resets
we switch from Creator A to Visitor B in the same app
the page re-renders in a way that stops MediaStream tracks
```

That is fine for preview, but not fine for real streaming.

The next architecture must split stream into three layers:

```text
1. Local capture layer
   Camera/mic/screen capture lives behind Tauri/native/session supervision.

2. Backend stream session layer
   Gateway/omnigate/backend creates stream_id, stream manifest, access policy, and viewer endpoint.

3. Viewer access layer
   Visitor B pays ROC, receives backend receipt/access window, then playback is allowed until paid_until.
```

The key invariant:

```text
React may display the camera preview and request actions.
React must not be the authority that keeps a paid stream alive.
```

## 5. What we should copy from the video minting flow

The video page already proved the boring and correct paid-publish workflow:

```text
prepare → explicit wallet hold → bounded upload → backend returns b3/crab URL → asset page resolves → paid content_view can unlock after backend receipt
```

The video publish flow is explicitly documented as a React `prepare → wallet hold → paid video upload` path using `/assets/video/prepare`, `/wallet/hold`, and `/assets/video`, with no silent spend, no fake CIDs, and backend hold proof required. 

The Tauri Rust command bridge for assets already has bounded upload commands for image/video, with fixed routes, max sizes, paid proof headers, and no arbitrary URL/path upload. 

The video client also makes the important distinction clear: `prepareVideoAsset` goes through gateway JSON, but actual video bytes go through a bounded Tauri command because binary media should not go through the generic JSON gateway bridge. 

For stream, we should copy the **workflow shape**, not the exact byte upload model.

Video is finite:

```text
prepare video
hold ROC
upload bounded file
mint b3 video asset
resolve crab://<hash>.video
pay content_view
play video bytes
```

Stream is live/time-based:

```text
prepare stream
hold/publish stream setup ROC if needed
start backend stream session
mint stream descriptor / crab://<hash>.stream
creator ingests live segments/frames
visitor quotes stream_watch_interval
visitor pays ROC
backend returns paid_until receipt
viewer receives bounded live segments only while paid
renew every X minutes
stop stream
optionally mint replay video later
```

## 6. Stream minting should probably mint a stream descriptor, not the live bytes

A live stream cannot be a single immutable b3 object while it is live. The correct b3 truth for stream should be a **stream descriptor/manifest**, not the ever-changing live bytes.

Recommended stream asset model:

```json
{
  "schema": "ron.stream.manifest.v1",
  "kind": "stream",
  "title": "...",
  "creator": "...",
  "status": "scheduled|live|ended",
  "stream_id": "...",
  "access_policy": {
    "action": "stream_watch_interval",
    "asset": "roc",
    "price_roc": "5",
    "interval_seconds": 300,
    "manual_renew_only": true
  },
  "viewer_route": "/streams/{stream_id}/watch",
  "segment_route": "/streams/{stream_id}/segments/{seq}",
  "started_at": "...",
  "ended_at": null,
  "replay_video_crab_url": null
}
```

Then:

```text
crab://<hash>.stream
```

resolves to the stream manifest / page, and the page calls backend stream status and access routes.

Live media chunks/segments should be mutable session state owned by backend/edge services, not canonical b3 truth while live. After the stream ends, we can optionally mint a replay `.video` asset from the recorded stream, with each rendition receiving its own b3. This matches the media IDB: b3 hashes are canonical, media bytes are immutable, manifests describe relationships, playback should use bounded range/segment paths, and cache cannot grant paid entitlement. 

## 7. Proposed next backend contracts

We need a “stream-lite” backend contract before full production streaming.

Suggested gateway routes:

```text
POST /streams/prepare
POST /streams
POST /streams/{stream_id}/start
POST /streams/{stream_id}/stop
GET  /streams/{stream_id}
POST /streams/{stream_id}/access/quote
POST /streams/{stream_id}/access/pay
GET  /streams/{stream_id}/watch
GET  /streams/{stream_id}/segments/latest
GET  /streams/{stream_id}/segments/{seq}
POST /streams/{stream_id}/segments
```

For the first proof, keep it simple:

```text
/streams/prepare
/streams
/streams/{stream_id}/access/quote
/streams/{stream_id}/access/pay
/streams/{stream_id}/segments/latest
```

Do not overbuild WebRTC yet unless needed. A first stream-lite proof can be segment-based.

## 8. Proposed first stream-lite implementation path

### Batch S3A — Stream publish UI using video flow pattern

Frontend files likely needed:

```text
apps/crablink-tauri/src/pages/stream/StreamPublishFlow.jsx
apps/crablink-tauri/src/shared/api/streamAssetClient.js
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/stream.css
```

UI should add:

```text
Prepare stream
Review stream publish quote
Confirm ROC hold
Publish stream descriptor
Copy crab://<hash>.stream
Open stream page
```

The stream publish flow should look/feel like video publish:

```text
prepare
explicit hold
publish
result card
copy/open asset URL
receipt/diagnostic JSON
local catalog entry
```

But the publish result is a **stream descriptor**, not a replay video.

The stream client should mirror video/post clients:

```javascript
prepareStream(payload)
publishStream({ request, paidProof, idempotencyKey })
extractStreamAssetCid(data)
extractStreamAssetUrl(data)
normalizeStreamPublishRequest(...)
```

Headers should mirror the existing paid proof convention:

```text
x-ron-paid-op: hold
x-ron-paid-asset: roc
x-ron-paid-estimate-minor: <amount>
x-ron-wallet-txid: <txid>
x-ron-wallet-receipt-hash: <hash>
x-ron-wallet-from: <payer>
x-ron-wallet-to: <escrow>
x-ron-asset-kind: stream
```

Do not use `x-ron-wallet-hold-txid`; we already learned that the backend expects `x-ron-wallet-txid`.

### Batch S3B — Backend stream descriptor route

RustyOnions side likely needs:

```text
ron-proto stream DTOs
omnigate /assets/stream/prepare
omnigate /assets/stream
svc-gateway proxy routes
tests/smokes
```

Keep stream descriptor publishing similar to article/post/comment/video asset routes.

Possible DTOs:

```text
StreamPrepareRequest
StreamPrepareResponse
StreamPublishRequest
StreamPublishResponse
StreamManifest
StreamAccessPolicy
```

Publish response should include:

```text
cid
b3:<hash>
crab://<hash>.stream
stream_id
status
receipt/paid proof metadata if backend returns it
```

### Batch S3C — Live session start/ingest/status

After minting a stream descriptor, creator must start a live session.

Possible routes:

```text
POST /streams/{stream_id}/start
POST /streams/{stream_id}/stop
GET  /streams/{stream_id}/status
```

The first implementation can keep capture in the Tauri WebView but must move session state out of fragile React display state.

Minimum truthful start flow:

```text
Creator clicks Start backend stream.
Backend marks stream session live.
Creator Tauri begins pushing bounded chunks/frames/segments.
Backend stores rolling live segments under stream_id.
Viewer page polls latest segment or uses future event/WebSocket path.
```

Important: starting backend stream is not the same as minting. Minting creates the descriptor. Starting creates live session state.

### Batch S3D — Visitor B paid watch path

Viewer path must be:

```text
Visitor B opens crab://<hash>.stream
CrabLink resolves descriptor from gateway
Page shows stream status and price
Visitor B clicks Pay to watch
Gateway quotes stream_watch_interval
Visitor B confirms
svc-wallet transfers/captures via backend path
Backend returns receipt and paid_until
Viewer player starts fetching stream segments
When paid_until nears expiration, prompt renew
If expired, stop fetching/blank player and show Renew button
```

No local receipt cache unlock. No preview state unlock. No fake paid window.

The existing `AssetContentViewAccess` code is the right conceptual reference: it explicitly says paid asset bodies unlock only after backend receipt metadata and local receipt memory is display-only. 

## 9. “Every X minutes” ROC spending model

The user requirement is:

```text
streamer sets custom ROC amount
streamer sets custom interval minutes
viewer pays every X minutes
```

Correct invariant:

```text
No hidden recurring spend.
No uncapped auto-pay.
No silent renewal.
```

First proof should be manual renewal only:

```text
5 ROC / 5 minutes
Visitor B clicks Pay
Backend receipt grants paid_until = now + 5 minutes
At 30 seconds remaining, UI shows Renew button
If not renewed, playback stops
Visitor can click Renew
```

Later we can add optional capped autopay, but only after wallet/vault/spend-authority gates exist:

```text
max_roc_per_stream
max_roc_per_hour
max_renewals
explicit cancel
receipt per renewal
visible spend meter
```

Do not build auto-renew now.

## 10. Creator A / Visitor B testing plan

### Preferred dev test

```text
Window/process 1: CrabLink Tauri as Creator A
Window/process 2: separate browser or second Tauri window as Visitor B
```

Until multi-window Tauri is explicit, easiest is:

```text
Creator A uses Tauri to capture/publish/start.
Visitor B uses either another browser pointed at gateway-compatible viewer URL or another Tauri launch if it works locally.
```

But the real proof is not “two windows.” The real proof is:

```text
Creator A can keep backend stream live.
Visitor B can pay and receive segments from backend.
Switching wallet/passport in Visitor B does not affect Creator A capture/session.
```

### Test sequence for next session

```text
1. Start RustyOnions stack.
2. Fund Creator A wallet.
3. Fund Visitor B wallet.
4. Launch CrabLink Tauri with mac media profile.
5. Open crab://stream as Creator A.
6. Start camera preview.
7. Fill stream title/price/interval.
8. Prepare stream.
9. Confirm ROC hold for stream publish.
10. Publish stream descriptor.
11. Receive crab://<hash>.stream.
12. Start backend stream session.
13. Push bounded live test segments.
14. Open stream URL as Visitor B.
15. Confirm stream locked before payment.
16. Pay 5 ROC / 5 minutes.
17. Confirm Visitor B balance decreases.
18. Confirm Creator A/recipient or stream revenue account receives credit according to backend policy.
19. Confirm viewer playback starts only after receipt.
20. Wait/force expiry.
21. Confirm playback stops or requires renewal.
22. Renew and confirm second receipt.
23. Stop stream.
24. Confirm viewer status becomes ended.
25. Optionally mint replay video later.
```

## 11. Important caution: direct camera-to-backend bytes

Do not send full live video blobs over generic Tauri command results or generic JSON request bridges.

The media IDB says large media must not cross the command boundary as one full in-memory blob, and playback should use bounded range/segment paths. 

For first stream-lite, use small bounded segments/chunks only. Possible first-proof formats:

```text
Option A: periodic WebM MediaRecorder chunks from WebView → Tauri command → gateway /streams/{id}/segments
Option B: WebView fetch directly to gateway with bounded chunks and session token
Option C: Tauri-native capture module later, producing bounded handles/segments
```

For fastest proof, **MediaRecorder WebM chunks** may be easiest:

```text
camera MediaStream
MediaRecorder timeslice = 1000–3000 ms
chunk size bounded
POST chunk to gateway stream segment endpoint
backend stores latest N chunks
viewer polls latest playlist/segment
```

Caveat: this is not full production low-latency streaming. But it is honest and testable.

## 12. Stream session authority model

The stream should have two IDs:

```text
asset CID / crab://<hash>.stream
stream_id / backend live session id
```

The `crab://<hash>.stream` should resolve even after the stream ends. It is the canonical stream page/descriptor.

The `stream_id` is mutable session state:

```text
scheduled
live
paused
ended
error
```

The stream descriptor should never fake live status from local UI. Live status must come from backend.

## 13. What must not be done next session

Do not implement:

```text
fake viewer counts
fake live status from local React state
fake stream URL before backend confirms
viewer unlock from local receipt cache
autopay
uncapped renewals
local wallet mutation
direct ledger mutation
direct storage/index calls from Tauri React
full-video blob through command response
creator-supplied player execution
DRM/anti-rip claims
QuickChain/ROX/Solana/external settlement
```

Do not make localhost mandatory for normal users. It is dev-only.

## 14. Concrete next-session task list

### Task 1 — frontend stream publish flow

Create:

```text
apps/crablink-tauri/src/pages/stream/StreamPublishFlow.jsx
apps/crablink-tauri/src/shared/api/streamAssetClient.js
```

Update:

```text
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/stream.css
```

Goal:

```text
Prepare stream
Confirm ROC hold
Publish stream descriptor
Show crab://<hash>.stream
Open/copy stream URL
```

### Task 2 — RustyOnions backend stream descriptor support

Likely crates:

```text
ron-proto
omnigate
svc-gateway
svc-storage/index depending on existing asset route architecture
```

Routes:

```text
POST /assets/stream/prepare
POST /assets/stream
GET /b3/<hash>.stream
GET /crab/resolve?url=crab://<hash>.stream
```

Follow the same boundary as video/post/article:

```text
gateway route only
omnigate hydrates/coördinates
svc-wallet via backend only
storage/index by backend only
Tauri React never mutates truth
```

### Task 3 — stream watch paid interval routes

Add backend access routes:

```text
POST /streams/{stream_id}/access/quote
POST /streams/{stream_id}/access/pay
GET /streams/{stream_id}/access/status
```

Return:

```json
{
  "paid": true,
  "paid_until": "...",
  "receipt_hash": "...",
  "txid": "...",
  "ledger_root": "...",
  "stream_id": "...",
  "viewer_account": "..."
}
```

### Task 4 — viewer page for crab://<hash>.stream

Add stream asset hydration/view mode:

```text
resolve stream descriptor
show locked viewer player
quote/pay button
receipt card
countdown to paid_until
renew button
bounded segment player
```

### Task 5 — live segment proof

Implement simplest honest segment proof:

```text
creator sends bounded chunks
backend stores latest chunks
viewer fetches chunks only after paid access
```

This can start with polling and later evolve to WebSocket/WebRTC/OAP/edge.

## 15. Recommended data contracts

### Stream prepare request

```json
{
  "title": "CrabLink launch stream",
  "description": "Live creator stream",
  "owner_passport_subject": "passport:main:dev",
  "creator_wallet_account": "acct_dev",
  "access_policy": {
    "action": "stream_watch_interval",
    "asset": "roc",
    "price_roc": "5",
    "interval_seconds": 300,
    "grace_seconds": 15,
    "free_preview_seconds": 0,
    "renew_prompt_seconds": 30,
    "manual_renew_only": true
  },
  "chat_policy": {
    "mode": "chat_placeholder_future"
  },
  "client_idempotency_key": "stream-prepare-..."
}
```

### Stream publish request

```json
{
  "title": "...",
  "description": "...",
  "stream_kind": "live_video",
  "access_policy": {...},
  "linked_assets": {...},
  "client_idempotency_key": "stream-publish-..."
}
```

### Stream publish response

```json
{
  "schema": "ron.asset.stream.publish.response.v1",
  "cid": "b3:<64hex>",
  "crab_url": "crab://<64hex>.stream",
  "stream_id": "stream_<id>",
  "status": "scheduled",
  "access_policy": {...},
  "receipt": {...}
}
```

### Stream access pay response

```json
{
  "schema": "ron.stream.access.receipt.v1",
  "stream_id": "stream_<id>",
  "viewer_account": "acct_visitor_b",
  "asset": "roc",
  "amount_roc": "5",
  "interval_seconds": 300,
  "paid_until": "2026-...",
  "txid": "...",
  "receipt_hash": "...",
  "ledger_root": "..."
}
```

## 16. State of codebundle and references

Current codebundle confirms stream files exist:

```text
StreamPage.jsx
StreamLocalPreview.jsx
StreamMediaReadiness.jsx
StreamPricingPanel.jsx
StreamSessionPanel.jsx
streamDraftModel.js
streamSessionClient.js
mediaDiagnosticsClient.js
commands/media.rs
commands/stream.rs
```

The codebundle also confirms the video path exists and should be used as the model for explicit paid publishing: `VideoPublishFlow.jsx`, `videoAssetClient.js`, and the Tauri bounded asset upload command.   

The media IDB confirms the critical stream/media boundaries: b3 is canonical, media bytes immutable, large media bounded, paid media cannot unlock from cache alone, no fake receipts/balances, no DRM claim, and media command paths must be bounded and allowlisted. 

## 17. Best next-session opening prompt

Use this to continue cleanly:

```text
We got live camera preview working in CrabLink Tauri on macOS using Info.plist and the dev mac media profile. Next we need to complete the stream page by adding the stream mint/publish path and then the backend-paid watch path for Visitor B. Use the video minting flow as reference: prepare → explicit ROC hold → backend publish → crab://<hash>.video. For stream, mint a stream descriptor crab://<hash>.stream, start a backend stream session, push bounded live segments, and require Visitor B to pay ROC every X minutes before playback. Do not fake live state, receipts, viewer count, or paid access. Keep Tauri React display-only and gateway-first.
```

## 18. Completion estimate for stream page

Current stream page completion:

```text
UI/control room: 70%
Camera preview: 85%
Local session marker: 60%
Stream publish/mint: 0–10%
Backend stream session: 0–10%
Visitor paid watch: 0–10%
Interval renewal: 0–10%
Replay minting: 0%
Chat: placeholder only
```

Overall stream feature completion:

```text
about 30–35%
```

The hardest part is not the camera anymore. The hardest part is now the backend truth loop:

```text
stream descriptor mint
live session status
bounded segment ingest
paid interval receipts
viewer playback gating
renewal/expiry
creator payout accounting
```

That is the correct next battle.


### END NOTE - MAY 18 2026 - 20:55 CST



### BEGIN NOTES - MAY 19 2026 - 09:15 CST



## What is going wrong

The stream **did mint successfully** as a canonical typed asset:

```text
crab://e0e82ffd0ed95534d50d7e6c172fe02dd2bf30db7933101d54c5d2e58ba2e993.stream
```

The asset page resolves with HTTP `200`, storage availability says `yes`, and size is returned. That means the `.stream` descriptor bytes are in storage and the public `crab://<hash>.stream` resolver path is working.

The failure is later, inside the paid viewer gate:

```text
asset manifest pointer was not found
reason: asset_pointer_not_found
http: 404
```

So the current state is:

```text
✅ Stream descriptor object exists in storage
✅ crab://<hash>.stream resolves as a typed asset
✅ CrabLink shows a stream viewer paid gate
✅ Wallet B has ROC
❌ content_view quote/pay cannot find the asset manifest pointer in svc-index
❌ no backend stream session exists
❌ no live media route exists
❌ no paid_until interval route exists
```

This is not a Tauri display bug. It is a backend/index contract gap.

The Tauri side is behaving honestly. `AssetContentViewAccess.jsx` now treats `stream` as payable through the existing content view gate, and the copy says it will not unlock stream playback unless a backend payment receipt is returned.  The stream viewer card also correctly says there is no fake stream playback and that live playback still requires backend stream status, `paid_until`, and bounded segment routes. That matches our no-fake-unlock invariant.

The backend issue is that content_view does not use “storage object exists” as enough proof. It expects an indexed asset manifest pointer. The stream descriptor publish path likely stored the descriptor bytes, but either did not write the index pointer correctly, wrote it to the wrong route/shape, or svc-index rejected/ignored `.stream` as a manifest-pointer kind. That is why the resolver can show the asset but content_view quote cannot price/pay it.

## Why the stream is not viewable yet

There are two separate meanings of “view” right now:

```text
1. View the descriptor page:
   This should be payable through content_view once svc-index has a stream manifest pointer.

2. View the live stream:
   This does not exist yet. We still need backend stream session/access/segment routes.
```

The current `StreamSessionPanel` is still local-only by design. It says the local room does not create backend stream truth, b3 address, viewer entitlement, receipt, or ROC transfer.  The `streamSessionClient.js` is also explicit that local session state is display-only, creates no fake b3, no backend live claim, no receipt, and no ROC mutation. 

So this is the exact line we have reached:

```text
We can mint a stream descriptor.
We cannot yet start a backend stream.
We cannot yet let Wallet B watch live media.
The content_view descriptor payment is blocked by missing svc-index manifest pointer.
```

## Best next backend fix

The next RustyOnions patch should compare stream publish against the working video publish path and make stream publish store the same kind of index pointer that content_view expects.

The goal is:

```text
POST /assets/stream
  stores descriptor JSON in svc-storage
  returns b3 CID
  writes svc-index asset manifest pointer for kind=stream
  returns manifest_cid / owner / payout / access policy fields
  makes /content/view/quote able to find the pointer
```

For the fastest honest proof, the next backend test should be:

```text
mint stream descriptor
curl /crab/resolve?url=crab://<hash>.stream
curl /content/view/quote for .stream as acct_visitor_b
expect quote amount/recipient/quote_id
pay quote
expect wallet receipt
CrabLink displays backend receipt accepted
```

Then after that, the real stream route family should be added:

```text
POST /streams/{stream_id}/start
POST /streams/{stream_id}/stop
GET  /streams/{stream_id}/status
POST /streams/{stream_id}/access/quote
POST /streams/{stream_id}/access/pay
GET  /streams/{stream_id}/access/status
POST /streams/{stream_id}/segments
GET  /streams/{stream_id}/segments/latest
```

That route family is where `stream_watch_interval`, `paid_until`, renewals, and real live media access belong.

---

# Carryover Notes — CrabLink Tauri Stream Session, Descriptor Mint, Viewer Gate, and Browser Tabs

## 0. Current checkpoint

This session moved `crab://stream` from a local-only concept into the first real backend-backed product slice.

We now have:

```text
CrabLink Tauri stream control room
local camera preview working on macOS media config
stream pricing / interval policy UI
stream descriptor prepare path
explicit ROC hold path
stream descriptor publish path
canonical crab://<hash>.stream mint
asset page resolution for .stream
Wallet B funded and able to attempt paid view
stream paid gate visible on .stream asset page
```

The latest uploaded Tauri codebundle shows the app now includes stream-specific files:

```text
StreamPage.jsx
StreamLocalPreview.jsx
StreamMediaReadiness.jsx
StreamPricingPanel.jsx
StreamPublishFlow.jsx
StreamSessionPanel.jsx
streamDraftModel.js
streamAssetClient.js
streamSessionClient.js
```

and the Tauri Rust side has stream/media command modules present:

```text
src-tauri/src/commands/media.rs
src-tauri/src/commands/stream.rs
```

The codebundle confirms those files are now part of the current Tauri app tree. 

## 1. What was accomplished in CrabLink Tauri

### 1.1 macOS camera/media path

We got live camera preview working in the Tauri WebView using the macOS media dev config.

Important commands:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run tauri:dev:mac-media
```

The normal `npm run check` was also fixed so it uses the mac media config for Cargo check:

```json
"check": "npm run build && npm run check:rust:mac-media",
"check:rust:mac-media": "TAURI_CONFIG=\"$(cat src-tauri/tauri.macos.dev-media.conf.json)\" cargo check --manifest-path src-tauri/Cargo.toml"
```

This matters because `macos-private-api` in `Cargo.toml` requires the matching Tauri config allowlist.

### 1.2 Stream page stabilized

`crab://stream` now loads a route-owned stream control room. It imports and renders:

```text
StreamLocalPreview
StreamPublishFlow
StreamDraft
StreamPodcastMode
StreamPricingPanel
StreamSessionPanel
StreamMediaReadiness
StreamChatPlaceholder
```

The route’s own invariant says local preview is not backend live, and only the backend may return b3 CID, stream URL, receipt, stream ID, live status, or viewer entitlement. 

### 1.3 Stream descriptor mint flow added

We added a stream descriptor mint lane patterned after video:

```text
Prepare stream
→ Review ROC hold
→ Send ROC hold
→ Review publish
→ Publish stream descriptor
→ backend returns crab://<hash>.stream
```

The local UI does not invent a stream CID or URL. The descriptor mint is backend-confirmed only.

### 1.4 Auto-navigation after mint was removed

Earlier, after minting the stream descriptor, CrabLink auto-navigated to the minted `.stream` asset page. That caused the camera preview to stop because `StreamLocalPreview` unmounted and correctly stopped its camera tracks.

We patched the flow so the creator remains on `crab://stream` after mint. This is important until tabs or a backend-supervised stream session exists.

### 1.5 Explicit wallet hold confirmation repaired

The first stream hold failed with:

```text
Wallet hold requires explicit caller confirmation.
```

That came from the client-side no-silent-spend guard. We patched `StreamPublishFlow.jsx` so the wallet hold helper passes:

```js
confirmed: true
```

only after the user clicks the explicit **Send ROC hold** button.

This preserved the no-silent-spend rule.

## 2. What was accomplished in RustyOnions backend

### 2.1 Added stream descriptor routes

We added or patched the backend route surface:

```text
svc-gateway:
  POST /assets/stream/prepare
  POST /assets/stream

omnigate:
  POST /v1/assets/stream/prepare
  POST /v1/assets/stream
```

These routes allowed stream descriptor prepare and publish to work.

### 2.2 Fixed Rust ownership compile issue

The stream publish response originally had:

```rust
request.stream_kind.unwrap_or_else(...)
```

which partially moved `request.stream_kind`, then later tried to borrow `request`.

We fixed it by replacing remaining consuming unwraps with:

```rust
request.stream_kind.clone().unwrap_or_else(...)
```

After that, `omnigate` compiled.

### 2.3 Added `.stream` to content_view kind acceptance

Before the patch, Wallet B’s paid view attempt failed with:

```text
unsupported_asset_kind
content view requires a canonical b3-backed asset target
```

We patched `omnigate/src/routes/v1/content_view.rs` so `stream` is accepted as a content_view target kind. That got us past `unsupported_asset_kind`.

### 2.4 Current backend failure

After accepting `.stream`, the backend now fails later with:

```text
asset manifest pointer was not found
reason: asset_pointer_not_found
status: 404
```

This is progress. It means the backend now recognizes `.stream` as a payable kind, but content_view cannot locate the stream’s asset manifest pointer in svc-index.

## 3. Current proof state

### Working

```text
Tauri app launches with media config.
npm run check passes after package script fix.
crab://stream opens.
Camera preview works.
Prepare stream no longer 404.
Wallet hold works after explicit confirmation fix.
Stream descriptor publishes.
A canonical crab://<hash>.stream is minted.
crab://<hash>.stream resolves with status 200.
Storage says available: yes.
Wallet B can be funded.
Wallet B can attempt paid view.
Stream viewer card appears.
CrabLink refuses fake playback.
```

### Not working yet

```text
Wallet B cannot pay to view stream descriptor yet.
content_view quote/pay returns asset_pointer_not_found.
No stream backend session exists.
No backend live status exists.
No viewer paid_until exists.
No backend segment route exists.
No actual live media is delivered to Wallet B.
No tabs exist yet.
Creator and viewer still share one current route in one WebView.
Switching route can unmount creator preview and stop camera.
```

## 4. Why the screenshots look the way they do

The screenshots show three layers:

### 4.1 Typed asset resolver layer

This works.

The top of the page shows:

```text
Stream Asset
Gateway read
Kind: stream
Status: 200
Storage available: yes
Size: 1248
```

That means the descriptor exists and can be resolved.

### 4.2 Paid content view layer

This fails.

The paid content view card shows:

```text
Amount: Not quoted
Recipient: Manifest recipient not quoted
Quote ID: Not quoted
Problem: asset manifest pointer was not found
```

That means content_view tried to derive a quote from index/manifest truth but could not find the stream asset pointer.

### 4.3 Stream viewer layer

This is honest placeholder behavior.

It says:

```text
Pay to view this stream through the backend wallet path.
No fake stream playback.
The descriptor is real, but live playback requires stream status, paid_until, and bounded segment routes from the backend.
```

That is exactly what it should say at this stage. It avoids cheating by not using local camera preview as viewer playback.

## 5. Root cause hypothesis for `asset_pointer_not_found`

Most likely cause:

```text
POST /assets/stream stores descriptor bytes but does not successfully write the asset manifest pointer in svc-index in the shape content_view expects.
```

Possible sub-causes:

```text
1. The stream pointer write route is wrong.
2. svc-index rejects or ignores asset_kind=stream.
3. The stream pointer body differs from image/video/article pointer body.
4. The pointer is written under raw CID but content_view looks under manifest CID.
5. The pointer write failed but the publish route only returned a warning.
6. The stack was restarted after mint and local index DB was lost while storage still had the descriptor.
7. content_view expects a uniform manifest but stream publish stores descriptor JSON only.
```

The next session should inspect the working video publish route and copy its index pointer contract exactly for stream.

## 6. Backend next steps

### 6.1 Fix stream manifest pointer write

Files likely involved in RustyOnions:

```text
crates/omnigate/src/routes/v1/assets.rs
crates/omnigate/src/routes/v1/content_view.rs
crates/omnigate/tests/content_view.rs
crates/omnigate/tests/asset_page_resolver.rs
crates/svc-gateway/src/routes/product.rs
crates/svc-gateway/tests/product_routes_proxy.rs
```

Goal:

```text
After POST /assets/stream, svc-index must contain a manifest pointer for the stream hash.
```

Test target:

```text
mint stream descriptor
quote content_view on crab://<hash>.stream
expect quote success
pay content_view
expect receipt
```

### 6.2 Make content_view quote useful for stream descriptor

The existing content_view route can be used for a short proof, but it should be labeled carefully:

```text
content_view on .stream = paid stream descriptor/view page access
not live stream segment access
```

Do not pretend this is the final stream interval model.

### 6.3 Add proper stream access routes

After descriptor-level paid view is green, build the real stream access route family:

```text
POST /streams/{stream_id}/start
POST /streams/{stream_id}/stop
GET  /streams/{stream_id}/status
POST /streams/{stream_id}/access/quote
POST /streams/{stream_id}/access/pay
GET  /streams/{stream_id}/access/status
POST /streams/{stream_id}/segments
GET  /streams/{stream_id}/segments/latest
```

The carryover notes already framed this correctly: stream truth should live in backend services, wallet handles payments, ledger is durable economic truth, omnigate coordinates session/access hydration, gateway is the public boundary, index handles stream pointer lookup, and storage handles manifests and later recorded segments. 

## 7. Tauri tabs are now the right next frontend step

Tabs make sense now because the current problem is not just UX polish. It affects the stream proof.

Right now, one WebView has one active route. If Creator A is on `crab://stream` with camera preview running, then navigating to the minted `.stream` page or switching to Wallet B can unmount the stream page and stop local capture.

Tabs can give us this dev/product workflow:

```text
Tab 1:
  Creator A
  crab://stream
  camera preview/live control room stays mounted

Tab 2:
  Visitor B
  crab://<hash>.stream
  pay/view attempt happens separately

Tab 3:
  Receipts or wallet page

Tab 4:
  Home/library/debug page
```

The older stream notes already identified this exact design fork: easiest proof is two windows; better product is persistent Tauri Rust stream state; backend-supervised is the final target.  Tabs are the cleanest Tauri app step between those options.

## 8. Tab design requirements

### 8.1 Placement

Tabs should sit exactly here:

```text
TopBar
Tabs row
HeaderAdSlot
Page content
```

The current shell renders:

```jsx
<TopBar route={route} navigation={navigation} />
<HeaderAdSlot route={route} />
<main className="cl-shell-main">
  {children}
</main>
```

So the next implementation should insert a new `TabStrip` between `TopBar` and `HeaderAdSlot`. 

Target layout:

```jsx
<div className="cl-shell">
  <TopBar ... />
  <TabStrip ... />
  <HeaderAdSlot ... />
  <main ...>
    {children}
  </main>
</div>
```

### 8.2 Maximum tab count

Hard cap:

```text
max open tabs = 10
```

Behavior when user tries to open tab 11:

```text
Show toast:
  “Maximum 10 tabs open”
  “Close a tab before opening another.”
```

Do not silently drop tabs.

### 8.3 Theme integration

Tabs must use existing theme tokens only:

```css
var(--cl-bg)
var(--cl-surface)
var(--cl-card)
var(--cl-border)
var(--cl-text)
var(--cl-muted)
var(--cl-accent)
```

They must look correct in both light and dark themes. No hardcoded blue-heavy design. No separate tab theme.

### 8.4 Visual direction

Tabs should look modern and distinctive, not like old browser tabs.

Suggested look:

```text
rounded floating capsule strip
glass/card surface
active tab has soft glow/accent underline
inactive tabs are pill cards
favicon/icon slot based on route kind
close button appears on hover/focus
new tab button as circular plus
subtle “live” pulse indicator for stream tab
overflow handled by horizontal scroll, not wrapping
```

For stream specifically:

```text
If a tab is crab://stream and preview/session is active:
  show small LIVE / PREVIEW pill
  show animated dot
  warn before closing tab if capture/session active
```

### 8.5 State model

Add a tab state layer, likely under:

```text
apps/crablink-tauri/src/app/tabs/
  tabModel.js
  tabStore.js
```

or directly:

```text
apps/crablink-tauri/src/app/appTabs.js
```

Recommended state shape:

```js
{
  tabs: [
    {
      id,
      url,
      title,
      routeKind,
      history,
      historyIndex,
      pinned: false,
      dirty: false,
      createdAt,
      lastActiveAt,
      sessionFlags: {
        streamPreviewActive: false,
        localStreamRoomActive: false
      }
    }
  ],
  activeTabId
}
```

Cap tabs to 10.

### 8.6 Important implementation warning

A simple tab strip that only remembers URLs will not keep the stream page mounted. If switching tabs uses the same single route outlet, React will still unmount the stream route.

There are two possible phases:

#### Phase T1 — Lightweight browser tabs

```text
Tabs store URLs/history.
Only active tab is mounted.
Switching tabs navigates to that tab URL.
This gives browser UX but does NOT preserve camera preview across tab switches.
```

This is easier and good for general browsing.

#### Phase T2 — Keep-alive route tabs

```text
Each tab keeps its route subtree mounted.
Inactive tabs are hidden with CSS.
Stream tab stays alive while Visitor B tab is active.
```

This is what we need for the stream proof.

For the next stream-centered session, implement **T2 or a hybrid** if practical. At minimum, do not claim tabs solve stream persistence unless the inactive stream tab remains mounted.

### 8.7 Security and authority rules for tabs

Tabs are UI/navigation state only.

Tabs must not:

```text
hold wallet spend authority
hold private keys
hold raw capabilities
auto-pay in background
continue paid actions without foreground confirmation
unlock paid content from cache
run arbitrary executable crab facets
```

Tabs may:

```text
store per-tab URL/history/title
display per-tab route kind
display per-tab local preview/session indicator
ask before closing active capture/session tab
```

## 9. Recommended frontend files for tabs

Likely new files:

```text
apps/crablink-tauri/src/app/shell/TabStrip.jsx
apps/crablink-tauri/src/app/tabs/tabModel.js
apps/crablink-tauri/src/app/tabs/tabStore.js
```

Likely modified files:

```text
apps/crablink-tauri/src/app/shell/Shell.jsx
apps/crablink-tauri/src/app/shell/Shell.css
apps/crablink-tauri/src/app/App.jsx
apps/crablink-tauri/src/app/appContext.js
apps/crablink-tauri/src/app/appState.js
apps/crablink-tauri/src/app/router.js
apps/crablink-tauri/src/app/shell/TopBar.jsx
apps/crablink-tauri/src/app/shell/AddressBar.jsx
```

Potentially modified for stream close warning:

```text
apps/crablink-tauri/src/pages/stream/StreamLocalPreview.jsx
apps/crablink-tauri/src/pages/stream/StreamSessionPanel.jsx
apps/crablink-tauri/src/shared/api/streamSessionClient.js
```

## 10. Testing plan for tabs

### 10.1 Build checks

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check
```

### 10.2 Visual route checks

```text
crab://home
crab://stream
crab://image
crab://site
crab://<hash>.stream
```

Verify:

```text
tab row appears under topbar
ad slot stays under tabs
tab row uses dark theme correctly
tab row uses light theme correctly
address bar reflects active tab URL
active tab changes route
close tab works
new tab opens home
cannot exceed 10 tabs
```

### 10.3 Stream-specific checks

```text
Open tab 1: crab://stream
Start camera preview
Mint stream descriptor
Open tab 2: minted crab://<hash>.stream
Switch back to tab 1
Camera preview should still be alive if T2 keep-alive tabs are implemented
```

If camera preview dies, tabs are only T1 lightweight navigation tabs and do not solve the stream persistence problem yet.

### 10.4 Wallet B test

```text
Tab 1: Creator A / acct_dev / crab://stream
Tab 2: Visitor B / acct_visitor_b / crab://<hash>.stream
Fund wallet B if needed:
  POST /v1/issue to acct_visitor_b
Attempt pay view
Expect current known backend failure until stream manifest pointer is fixed:
  asset_pointer_not_found
```

## 11. Critical invariants to carry forward

```text
No fake stream playback.
No fake live status.
No fake viewer count.
No cache-only paid unlock.
No hidden recurring spend.
No auto-renew until explicitly designed.
No direct wallet or ledger calls from React.
No stream unlock without backend receipt.
No stream segment playback without backend stream/session route.
No pretending descriptor mint equals live stream start.
No local camera preview reused as Wallet B playback.
No stream keys or ingest secrets in React state/localStorage/URL/logs.
```

## 12. Recommended next session order

### Step 1 — Backend diagnosis/fix for `asset_pointer_not_found`

Before more stream viewer UI work, fix RustyOnions so `.stream` descriptor content_view quote can find its manifest pointer.

Do this by comparing working video asset publish/index pointer logic to stream publish/index pointer logic.

### Step 2 — Add browser tabs in Tauri

Build tabs under the topbar and above the ad slot.

Decide upfront whether to implement:

```text
T1 lightweight URL tabs
or
T2 keep-alive tabs
```

For stream proof, T2 is preferred.

### Step 3 — Retest stream descriptor paid view

Once backend pointer lookup is fixed:

```text
Creator A mints stream descriptor.
Wallet B opens .stream tab.
Wallet B pays content_view.
Receipt returns.
Viewer card changes to backend receipt accepted.
Still no live video until stream session routes exist.
```

### Step 4 — Real stream session backend

Implement the stream access/session route family.

### Step 5 — Real live media proof

Only after session/access/pay is green should we attempt bounded media segment delivery.

## 13. Current best estimate

For the stream slice:

```text
Local preview/control room:       70–75%
Descriptor mint:                  80–85%
Descriptor paid view:             45–55% because index pointer is failing
Live backend session truth:        10–15%
Wallet B real live viewing:         5–10%
Tabs needed for stream workflow:    0% implemented, high priority next
```

For the broader Tauri migration:

```text
Tauri shell and route migration:   strong progress
Paid asset flows:                  mostly proven for existing asset classes
Stream:                            descriptor proof achieved, live proof pending
Browser-quality UX:                tabs are now the next major missing piece
```

The big win from this session is that we crossed from “stream is just a UI page” into “stream descriptor is a real minted crab asset.” The next blockers are precise and solvable: fix the backend stream manifest pointer for content_view, then add a tab system that can keep the creator stream control room alive while Wallet B tests the viewer path.


### END NOTE - MAY 19 2026 - 09:15 CST


### BEGIN NOTE - MAY 19 2026 - 12:55 CST

# Carryover Notes — CrabLink Tauri Stream-Lite Paid View Checkpoint

We ended this session at a very important milestone: **Visitor B successfully paid ROC to unlock a `.stream` descriptor through backend `content_view`, but the actual live preview did not render yet.** That is expected from where the code now stands. The backend paid receipt path is proven; the remaining work is wiring the new stream-lite session/segment routes into the creator and viewer UI.

The current CrabLink Tauri bundle includes the stream page files, stream asset client, stream session client, Tauri command bridge, shell tabs, receipts page, and media/stream command modules.  The RustyOnions bundle now includes `crates/omnigate/src/routes/v1/streams.rs` and `crates/omnigate/tests/streams.rs`, which define the stream-lite route family and its receipt-gated latest-segment test.  

---

## 1. Current final checkpoint

### What is now proven

```text
✅ CrabLink Tauri launches with macOS media permissions.
✅ crab://stream local camera preview works.
✅ Browser tabs work well enough to keep the creator stream preview alive.
✅ Switching to Visitor B no longer reloads the Tauri WebView.
✅ Stream descriptor minting works.
✅ New crab://<hash>.stream URLs resolve as typed stream assets.
✅ Stream manifest pointer issue was fixed enough for content_view quote/pay.
✅ Visitor B can pay 5 ROC to Creator A / acct_dev for stream descriptor access.
✅ Backend wallet receipt returns txid, receipt hash, ledger root, payer, recipient, quote id, amount.
✅ Receipt is displayed on the stream asset page.
✅ Receipt is persisted and visible in crab://receipts.
```

The screenshots confirm the paid stream descriptor path is now working: the stream access panel shows “Stream access paid and unlocked,” amount `5 ROC`, payer `acct_visitor_b`, recipient `acct_dev`, txid, receipt hash, manifest CID, and ledger root.

### What is not yet proven

```text
❌ Visitor B still cannot see live video after payment.
❌ Creator tab is not yet publishing backend stream-lite snapshot segments.
❌ Viewer tab is not yet calling /streams/{stream_id}/segments/latest after receipt.
❌ The asset viewer currently shows Stream ID: Not returned.
❌ Stream-lite backend routes exist, but the React UI has not fully wired them.
```

So the current state is **paid descriptor unlock works**, but **paid live playback is not wired yet**.

---

## 2. Why the preview did not appear after payment

The payment succeeded, but the viewer panel still says:

```text
Backend payment receipt accepted for this stream descriptor.
Live segment playback still needs the next backend stream-session routes before video can appear here.
Stream ID: Not returned
```

That points to two remaining gaps.

First, the creator side must start a backend stream session and push at least one bounded preview frame or text segment to Omnigate. The new Tauri `streamSessionClient.js` already has client methods for `startBackendStreamSession`, `publishStreamSnapshotSegment`, `loadLatestPaidStreamSegment`, and `captureCurrentStreamPreviewFrame`, but the stream page UI has not fully wired those into the creator/viewer flow yet.  

Second, the viewer side needs a reliable `stream_id`. The screenshot says `Stream ID Not returned`, so even after payment the asset page does not know which backend route to call:

```text
POST /streams/{stream_id}/segments/latest
```

The backend stream-lite route exists and is intentionally receipt-gated. It stores only an in-memory latest segment, bounds payload size, and requires wallet receipt lookup before returning viewer media.  The test also proves the intended contract: missing receipt is rejected, matching receipt returns the latest segment and `receipt_verified`. 

---

## 3. Major accomplishments from this session

### 3.1 Tabs are now practical for stream testing

We added a modern Tauri browser tab strip under the topbar and above the ad slot.

Important outcomes:

```text
10-tab maximum enforced.
Horizontal scrollbar removed.
Tabs visually fit across the screen.
Selected-tab shading softened.
Light/dark theme preserved.
Tabs keep mounted pages alive.
Creator stream preview survives switching tabs.
```

This is a major CrabLink browser milestone. Before tabs, creator/visitor stream testing required navigation in the same route, which killed the stream preview. Now the creator page can remain mounted while Visitor B opens the stream asset in another tab.

Remaining tab polish:

```text
Possibly add per-tab identity/session later.
Keep global session switch for now because it avoids reload.
Verify 75%, 100%, 115%, 130% zoom after each shell patch.
```

### 3.2 Passport session switch is now stream-safe

Earlier, clicking Visitor B in the passport drawer caused the Tauri WebView to close/reload, which killed the local stream. We changed the dev passport session helper so Tauri same-window switching uses history/settings/event updates instead of `location.assign()` or full reload.

Current behavior:

```text
Use Creator A / Visitor B changes active local dev labels.
The app does not reload.
Mounted tabs stay alive.
Local camera preview remains active.
```

Important limitation:

```text
The passport/session is still global to the Tauri window.
Tab 1 does not truly remain Creator A while Tab 2 is Visitor B.
For dev testing, the stream preview survives, but future per-tab sessions would be cleaner.
```

### 3.3 Passport drawer styling was repaired

The passport drawer had fallen back into plain-text looking layout because new React class names were not styled. We added styling for the newer passport summary/hero/stat/row classes.

Current state:

```text
Drawer is readable again.
Truth boundary copy remains visible.
Creator/visitor dev session controls are clearer.
Receipts/library/profile quick links remain separated from the main dropdown clutter.
```

### 3.4 Stream descriptor mint path works

The stream page now supports the same general shape we used for video/image:

```text
Prepare stream
Review/hold ROC
Publish stream descriptor
Backend returns canonical crab://<hash>.stream
Asset resolves through gateway
```

The stream publish path is honest: it mints a descriptor, not a fake live stream. The stream publish flow file explicitly treats it as prepare → wallet hold → stream descriptor publish and does not claim live ingest or viewer playback exists yet. 

### 3.5 Backend manifest pointer problem was fixed

Earlier failure:

```json
{
  "reason": "asset_pointer_not_found",
  "status": 404
}
```

Root cause:

```text
The .stream descriptor object existed in storage and resolved as an asset,
but content_view could not find an indexed asset manifest pointer.
```

Fix direction completed:

```text
svc-index accepts stream as an asset kind.
omnigate stream publish now follows video-like two-object logic:
  descriptor object CID
  manifest object CID
  asset → manifest pointer
content_view can now quote/pay .stream descriptors.
```

The successful payment proves this blocker is past.

### 3.6 Paid descriptor unlock works end-to-end

Final successful path:

```text
Creator A starts local camera preview.
Creator A mints a new .stream descriptor.
Visitor B opens crab://<hash>.stream.
Visitor B pays 5 ROC through content_view.
Backend wallet returns receipt.
Ledger root and receipt hash display.
CrabLink records receipt in crab://receipts.
```

This is a real internal ROC value-plane proof. No fake balance, no fake receipt, no silent spend, no local unlock.

---

## 4. RustyOnions backend state

### 4.1 New stream-lite route family exists

Current backend route family added under Omnigate:

```text
POST /v1/streams/{stream_id}/start
POST /v1/streams/{stream_id}/stop
GET  /v1/streams/{stream_id}/status
POST /v1/streams/{stream_id}/segments
POST /v1/streams/{stream_id}/segments/latest
```

Gateway proxy routes were added at public paths:

```text
POST /streams/{stream_id}/start
POST /streams/{stream_id}/stop
GET  /streams/{stream_id}/status
POST /streams/{stream_id}/segments
POST /streams/{stream_id}/segments/latest
```

The current backend model is intentionally **stream-lite V1**, not full WebRTC/HLS:

```text
in-memory stream session
bounded latest segment only
creator can publish a bounded data URL or text segment
viewer can fetch latest segment only after wallet receipt lookup
no durable segment storage yet
no ingest keys
no stream secrets
no DRM claims
no auto-renew
```

### 4.2 Omnigate stream route invariants

The new `streams.rs` route states the exact intended security boundary:

```text
in-memory stream session only
latest bounded segment only
viewer media requires wallet receipt lookup
no wallet mutation in stream route
fail-closed receipt validation
no stream keys
no ingest secrets
bounded body
no arbitrary execution
```

That is the correct shape for a first live proof. 

### 4.3 Stream test exists

The new Omnigate test proves this sequence:

```text
start stream session
put latest segment
request latest without receipt → PAYMENT_REQUIRED
request latest with matching wallet receipt → OK
segment returned
access.status = receipt_verified
```

The codebundle’s test snippet shows this exact expected behavior. 

### 4.4 Remaining backend concerns

The backend stream-lite route is currently in-memory. That is fine for proof, but it means:

```text
Restarting Omnigate loses live stream sessions.
Only the latest segment is retained.
No historical segments.
No durable replay.
No multi-viewer fanout model yet.
No paid_until interval model yet.
```

Future backend hardening should eventually move from in-memory latest frame to a bounded stream session service or storage-backed segment/rendition model.

---

## 5. CrabLink Tauri frontend state

### 5.1 Current stream files

The current Tauri app bundle includes:

```text
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/StreamLocalPreview.jsx
apps/crablink-tauri/src/pages/stream/StreamMediaReadiness.jsx
apps/crablink-tauri/src/pages/stream/StreamPricingPanel.jsx
apps/crablink-tauri/src/pages/stream/StreamPublishFlow.jsx
apps/crablink-tauri/src/pages/stream/StreamSessionPanel.jsx
apps/crablink-tauri/src/pages/stream/StreamDraft.jsx
apps/crablink-tauri/src/pages/stream/StreamPodcastMode.jsx
apps/crablink-tauri/src/pages/stream/StreamChatPlaceholder.jsx
apps/crablink-tauri/src/shared/api/streamAssetClient.js
apps/crablink-tauri/src/shared/api/streamSessionClient.js
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
```

The codebundle confirms the stream page/component/client set is now part of the current Tauri app. 

### 5.2 streamSessionClient exists but needs UI wiring

`streamSessionClient.js` already has the right client methods:

```text
startBackendStreamSession()
stopBackendStreamSession()
getBackendStreamStatus()
publishStreamSnapshotSegment()
loadLatestPaidStreamSegment()
captureCurrentStreamPreviewFrame()
```

It also bounds snapshot size and refuses invalid data URLs.  

The missing piece is calling those functions from the right UI moments.

---

## 6. Most important next-session diagnosis

The next session should start with this conclusion:

```text
Paid stream descriptor access works.
Actual preview does not appear because the UI has not yet connected:
  creator preview → backend latest segment
  backend receipt → viewer latest segment request
```

The screenshot’s `Stream ID: Not returned` is the most important clue.

Before adding fancy playback, solve these two questions:

```text
1. Where should the viewer get stream_id from?
2. When should the creator publish the first backend segment?
```

Recommended answer:

```text
stream_id should come from backend stream descriptor/manifest metadata, not local display cache.
creator should publish a manual "current preview snapshot" first before any loop/timer.
```

---

## 7. Next session implementation plan

### Batch A — Wire creator backend stream controls

Files likely involved:

```text
apps/crablink-tauri/src/pages/stream/StreamPublishFlow.jsx
apps/crablink-tauri/src/pages/stream/StreamSessionPanel.jsx
apps/crablink-tauri/src/pages/stream/StreamLocalPreview.jsx
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/shared/api/streamSessionClient.js
apps/crablink-tauri/src/pages/stream/stream.css
```

Add creator-side controls after descriptor mint:

```text
Start backend stream session
Check backend stream status
Publish current preview snapshot
Stop backend stream session
```

Expected creator sequence:

```text
1. Start camera preview.
2. Prepare stream.
3. Hold ROC.
4. Publish stream descriptor.
5. Click Start backend session.
6. Click Publish current preview snapshot.
7. Keep tab open.
```

Use `captureCurrentStreamPreviewFrame()` to capture the current video element frame. Then call `publishStreamSnapshotSegment()` with:

```text
streamId
assetCrabUrl
mediaType: image/jpeg
dataUrl
source: crablink_tauri_creator_snapshot
```

Manual snapshot first. Do not start an automatic frame loop yet. Once manual proof works, add a controlled interval later.

### Batch B — Ensure stream_id is available to viewer

Current issue:

```text
Stream ID: Not returned
```

Possible fix paths:

```text
Preferred backend fix:
content_view pay response for .stream includes stream_id from manifest metadata.

Acceptable frontend fix:
Asset page extracts stream_id from the resolved descriptor JSON if descriptor body is available.

Fallback for local testing only:
Use publish response/local catalog, but do not rely on that for Visitor B truth.
```

Best next backend/frontend contract:

```json
{
  "asset_kind": "stream",
  "stream_id": "stream_...",
  "manifest_cid": "b3:...",
  "asset_crab_url": "crab://<hash>.stream"
}
```

The viewer panel should refuse to call latest segment if `stream_id` is missing and should display a clear diagnostic:

```text
Paid receipt returned, but backend did not return stream_id. Cannot request stream segment.
```

### Batch C — Wire viewer paid latest segment fetch

Files likely involved:

```text
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/pages/asset/asset.css
apps/crablink-tauri/src/shared/api/streamSessionClient.js
```

After `content_view` payment succeeds for `.stream`, collect:

```text
streamId
assetCrabUrl
payerAccount
recipientAccount
txid
receiptHash
amountMinor / amount ROC adapter value
```

Then call:

```text
loadLatestPaidStreamSegment(gateway, {
  streamId,
  assetCrabUrl,
  payerAccount,
  recipientAccount,
  txid,
  receiptHash,
  amountMinor
})
```

Render result:

```text
if segment.data_url starts with image/:
  render <img>
if segment.text:
  render text proof
if no segment:
  show backend returned no segment yet
if receipt rejected:
  lock viewer and show reason
```

The first proof can be a still frame. Do not try live video playback yet.

### Batch D — Add one green smoke path

Create or update a smoke script later:

```text
scripts/web3_stream_lite_live_smoke.sh
```

Target flow:

```text
start stack
mint stream descriptor
start backend stream session
put text segment or image data-url segment
pay content_view
fetch latest segment with receipt
expect ok=true and receipt_verified
```

This should become the backend proof before adding auto-refresh UI.

---

## 8. Testing commands for next session

RustyOnions:

```bash
cd /Users/mymac/Desktop/RustyOnions

cargo fmt -p omnigate -p svc-gateway -p svc-index
cargo check -p omnigate -p svc-gateway -p svc-index
cargo test -p omnigate --test streams
cargo test -p omnigate --test content_view
cargo test -p svc-gateway --test content_view_routes_proxy
cargo test -p svc-index --test http_contract
```

CrabLink Tauri:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri

npm run build
npm run check:rust:mac-media
npm run tauri:dev:mac-media
```

Runtime stack:

```bash
cd /Users/mymac/Desktop/RustyOnions
bash scripts/web3_crablink_dev_stack.sh
```

---

## 9. Manual proof checklist for next session

Use this exact sequence after the next UI wiring patch:

```text
1. Start RustyOnions stack.
2. Launch CrabLink Tauri with npm run tauri:dev:mac-media.
3. Tab 1: Use Creator A / acct_dev.
4. Open crab://stream.
5. Start camera preview.
6. Prepare stream.
7. Hold ROC.
8. Publish stream descriptor.
9. Confirm new crab://<hash>.stream URL.
10. Click Start backend session.
11. Click Publish current preview snapshot.
12. Tab 2: Use Visitor B / acct_visitor_b.
13. Open the new crab://<hash>.stream URL.
14. Pay quoted 5 ROC.
15. Confirm receipt returned.
16. Click or auto-run Load latest paid segment.
17. Expect still preview frame or text segment to render.
18. Confirm no playback appears before receipt.
19. Confirm no playback appears if txid/receiptHash is removed or wrong.
20. Confirm creator preview remains alive in Tab 1.
```

---

## 10. Critical invariants to carry forward

```text
No fake stream playback.
No fake live status.
No fake viewer count.
No cache-only paid unlock.
No hidden recurring spend.
No auto-renew until explicitly designed.
No direct wallet or ledger calls from React.
No stream unlock without backend receipt.
No stream segment return without backend stream route.
No pretending descriptor mint equals live stream start.
No local camera preview reused as Visitor B playback.
No stream keys or ingest secrets in React state/localStorage/URL/logs.
No full-file media through command results.
No creator-supplied executable player.
No DRM/anti-rip promises.
```

For the stream-lite proof, a still image frame is acceptable. It is not full streaming yet, but it proves:

```text
creator preview → backend segment route
viewer payment → wallet receipt
receipt → backend segment access
backend segment → viewer render
```

That is the next honest checkpoint.

---

## 11. Current project completion estimate

For the specific stream feature:

```text
Local camera preview:              90%
Stream control room UI:            75%
Descriptor mint/publish:           85%
Stream manifest pointer/indexing:  80–85%
Paid descriptor unlock:            90%
Backend stream-lite route skeleton:70%
Creator segment publishing UI:     10–20%
Viewer paid segment rendering UI:  10–20%
Interval renewal / paid_until:     0–10%
Durable stream sessions:           0–10%
Real continuous live playback:     5–10%
```

For the broader CrabLink Tauri migration:

```text
Tauri shell:                       strong progress
Browser tabs:                      usable, needs polish/per-tab identity later
Theme/zoom/topbar:                 mostly stable
Paid content_view loop:            proven for several asset classes
Video paid playback:               proven
Stream paid descriptor:            proven
Stream live preview after payment: next target
Chrome proof:                      still useful but no longer primary
```

---

## 12. Best opening prompt for the next session

```text
We successfully proved paid stream descriptor access in CrabLink Tauri: Creator A minted a crab://<hash>.stream descriptor, Visitor B paid 5 ROC through backend content_view, and the receipt appeared in the stream page and receipts page. The preview still did not appear because the creator UI is not yet starting a backend stream-lite session/publishing a snapshot segment, and the viewer UI is not yet loading /streams/{stream_id}/segments/latest after receipt. The stream asset page also showed Stream ID: Not returned. Please review the latest CODEBUNDLE_RS.md and CODEBUNDLE_TAURI_APP.md, then wire the next batch: creator Start backend session + Publish current preview snapshot, viewer Load latest paid segment after receipt, and ensure stream_id is extracted from backend stream descriptor/manifest truth. Keep all invariants: no fake playback, no cache-only unlock, no silent spend, no direct wallet calls from React.
```

That is the cleanest next step.


### END NOTE - MAY 19 2026 - 12:55 CST


### BEGIN NOTE - MAY 19 2026 - 16:05 CST

## CrabLink Tauri Live Stream Carryover Notes — 2026-05-19

### Current high-level status

We made a major breakthrough this session. The `.stream` flow is no longer blocked at payment, receipt verification, descriptor parsing, or viewer routing. The current proof shows that a paid viewer can receive backend-returned stream media after the backend session exists and a segment has been published.

The stream is currently **stream-lite**, meaning it returns the latest bounded backend segment, usually one JPEG frame or a text heartbeat. It is not yet smooth continuous video. The next work is to turn this into a live-feeling paid stream by adding a bounded creator publish loop and a bounded viewer polling loop.

The terminal proof confirmed the backend sequence works: manually starting the backend session succeeded, publishing a text heartbeat segment succeeded, and loading the latest segment with Visitor B’s paid receipt returned `ok: true` with `access.status: receipt_verified`. 

---

# 1. What we accomplished this session

## 1.1 Confirmed the Tauri build/tooling issue was separate from stream logic

Early in the session, `npm run build` succeeded but Rust/Tauri checking failed because plain Cargo check was not receiving the macOS media config needed for the `macos-private-api` Tauri feature. We confirmed the correct app-level package script is:

```json
"check:rust:mac-media": "TAURI_CONFIG=\"$(cat src-tauri/tauri.macos.dev-media.conf.json)\" cargo check --manifest-path src-tauri/Cargo.toml"
```

We also confirmed `tauri: command not found` was a local Tauri CLI install issue, not a code issue. The fix was to run `npm install` inside:

```bash
/Users/mymac/Desktop/crablink/apps/crablink-tauri
```

The current package.json is correct and does not need further changes for this issue.

---

## 1.2 Replaced the old placeholder stream viewer

The asset page previously showed a paid stream placeholder even after ROC payment. It said the receipt was accepted but did not fetch any backend stream segment.

We added and wired:

```text
apps/crablink-tauri/src/pages/asset/StreamPaidSegmentViewer.jsx
```

Then updated:

```text
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
```

so `.stream` assets render `StreamPaidSegmentViewer` instead of the old placeholder `<Card>` block.

Result: after paying for a `.stream` asset, the viewer now:

1. Fetches/parses the descriptor object.
2. Extracts `stream_id`.
3. Uses the backend wallet receipt metadata.
4. Calls the latest-segment route.
5. Renders the returned segment if the backend stream session exists.

This fixed the “paid but no visible stream component behavior” problem.

---

## 1.3 Confirmed descriptor parsing and `stream_id` extraction works

Before the viewer patch, the UI showed:

```text
Stream ID: Not returned
```

After the patch, the UI correctly extracted:

```text
stream_8ccae1a2
```

from the descriptor and attempted to load:

```text
/streams/stream_8ccae1a2/segments/latest
```

This was a major diagnostic milestone because it proved the viewer had enough data to reach the correct backend stream route.

---

## 1.4 Diagnosed the real blocker: backend session was not started

The viewer then returned:

```text
Latest segment was not returned
stream session was not found
```

We ran a direct backend check:

```bash
curl -i http://127.0.0.1:8090/streams/stream_8ccae1a2/status
```

and the backend returned:

```json
{
  "code": "stream_session_not_found",
  "message": "stream session was not found",
  "reason": "stream_not_found"
}
```

This proved the viewer route was working, but the creator-side backend session had not been started or had been lost from Omnigate’s in-memory stream map.

Important conclusion: this was not a payment problem, not a receipt problem, not a content view problem, and not a route proxy problem. It was a creator-side session-start/publish problem.

---

## 1.5 Confirmed the backend stream-lite route contract works

We ran the force-proof terminal sequence:

```text
POST /streams/{stream_id}/start
POST /streams/{stream_id}/segments
POST /streams/{stream_id}/segments/latest
```

The results were successful.

The backend returned:

```json
"ok": true,
"schema": "omnigate.stream-start.v1",
"status": "live"
```

Then the text heartbeat publish returned:

```json
"ok": true,
"schema": "omnigate.stream-segment-put.v1",
"seq": 1
```

Then the paid latest segment request returned:

```json
"ok": true,
"schema": "omnigate.stream-latest-segment.v1",
"access": {
  "status": "receipt_verified"
}
```

This proved the RustyOnions backend path is good for the current stream-lite model. 

---

## 1.6 Patched the creator-side stream session panel

We updated:

```text
apps/crablink-tauri/src/pages/stream/StreamSessionPanel.jsx
```

The previous version already had manual buttons and methods for:

```text
Start backend stream session
Check backend status
Publish current preview snapshot
Publish text heartbeat
Stop backend stream
```

but the user could still mint a stream descriptor and miss the backend start/segment publish sequence. The new version makes the missing sequence automatic.

After a stream descriptor is minted, `StreamSessionPanel` now attempts to:

```text
1. Auto-start backend stream session.
2. Auto-publish the first bounded segment.
3. Prefer a camera snapshot if preview capture is available.
4. Fall back to a text heartbeat if snapshot capture fails.
5. Keep manual buttons for retry/debug.
```

The current uploaded StreamSessionPanel before the patch had the manual methods and buttons, but did not reliably force the initial backend proof sequence after descriptor publish. 

---

## 1.7 Confirmed paid stream image frame render works

After the latest patch, the screenshots showed:

Creator side:

```text
Stream descriptor minted
Stream ID returned
Latest backend segment displayed in side panel
image/jpeg segment published
```

Viewer side:

```text
Backend latest segment
segment #1 · receipt_verified
image/jpeg rendered after ROC payment
```

This means the full paid stream-lite path now works:

```text
Creator camera preview
→ capture frame
→ backend stream-lite segment
→ Visitor B pays ROC
→ backend verifies receipt
→ viewer receives latest image segment
→ viewer renders frame
```

This is the most important proof from the session.

---

# 2. Current exact state of live streaming

## What works now

The following path works:

```text
Creator A:
open crab://stream
start camera preview
prepare stream descriptor
send ROC hold
publish stream descriptor
backend session auto-starts
first segment auto-publishes

Visitor B:
open crab://<hash>.stream
pay ROC content_view
receipt returns
load latest paid segment
viewer renders backend segment
```

The viewer is no longer just showing a placeholder. It now displays backend-returned media after paid receipt verification.

## What does not work yet

The viewer receives only **one frame** unless the creator publishes another segment.

This is expected because the current backend route is:

```text
stream-lite latest segment
```

not full live video transport.

Current stream-lite model:

```text
Backend stores one latest segment in memory.
Creator publishes a frame or text heartbeat.
Viewer fetches latest segment after payment.
```

There is not yet:

```text
continuous creator frame loop
continuous viewer refresh loop
paid_until interval tracking
automatic renewal prompt
smooth video transport
audio
WebRTC/HLS/OAP streaming
durable live segment history
```

---

# 3. Important architecture distinction: video vs stream

The user asked whether we can look at how video worked and make stream work the same way.

The answer is: partly, but not completely.

## Video asset behavior

Video worked because video is an immutable b3 asset. After payment, the viewer fetches a stable video object or blob from storage/gateway. The video is already stored as bytes and can be replayed.

Path:

```text
mint video asset
store video bytes by b3
viewer pays
gateway returns/fetches video bytes
video element plays immutable media
```

## Stream asset behavior

Stream is mutable live state. The `.stream` descriptor is b3-backed, but the actual “what is live right now” content is not the descriptor. It is current session state.

Current stream-lite path:

```text
mint stream descriptor
start backend session in Omnigate memory
creator publishes latest segment
viewer pays
viewer fetches latest segment
```

That is why stream needs extra session work that video did not need.

---

# 4. Critical known landmine: creator/visitor wallet role confusion

In the latest screenshot, the creator-side segment metadata appeared to show:

```text
producer acct_visitor_b
```

while the stream was being tested across creator and visitor identities.

This must be checked carefully next session.

Possible causes:

1. The stream was minted while the app was still on `passport:main:visitor-b`.
2. The creator session panel fell back to the currently selected wallet instead of the descriptor owner/creator account.
3. The descriptor publish response did not expose enough creator account metadata, so the UI used `app.settings.walletAccount`.
4. The user changed identity after minting but before starting/publishing stream segment.

This matters because paid streams must not blur creator and viewer roles.

Next session should verify:

```text
Creator account for stream session = descriptor creator/payout account
Segment producer account = creator account
Viewer payer account = acct_visitor_b
Receipt recipient = creator account
```

If the app uses the currently selected wallet after descriptor publish, we should lock the stream control room to the descriptor creator account and warn if the active wallet changes.

---

# 5. What remains for live stream MVP

There are two definitions of “live stream” now:

## 5.1 Near-term MVP: paid live snapshot stream

This is what we should build next.

It will behave like a low-frame-rate live stream:

```text
Creator tab:
capture current camera frame every 1–2 seconds
POST it to /streams/{stream_id}/segments

Viewer tab:
after payment, poll /streams/{stream_id}/segments/latest every 1–2 seconds
render the newest seq
```

This is safe and consistent with current backend design.

It keeps all invariants:

```text
no fake receipts
no silent ROC spend
no local camera leaking directly to viewer
no direct wallet mutation from UI
no full-file buffering through commands
no arbitrary execution
no external settlement
no cache-based unlock
```

## 5.2 Full real live video

This is future work after MVP.

True smooth video would require a real streaming transport:

```text
WebRTC
HLS / LL-HLS
OAP-backed stream transport
gateway-mediated media sessions
segment/range service
possibly media worker/service route
```

That will need a separate backend blueprint and more serious media/session policy design.

We should not jump straight to smooth video until the snapshot stream MVP is stable, because the current proof gives us a controlled stepping stone.

---

# 6. Next session: exact recommended plan

## Batch 1 — Creator live frame publish loop

Patch:

```text
apps/crablink-tauri/src/pages/stream/StreamSessionPanel.jsx
apps/crablink-tauri/src/shared/api/streamSessionClient.js
apps/crablink-tauri/src/pages/stream/stream.css
```

Add explicit controls:

```text
Start live frame loop
Stop live frame loop
Frame interval selector: 1s / 2s / 5s
Latest publish status
Dropped frame count
Last publish latency
Last backend seq
```

Rules:

```text
Default loop off.
User must explicitly start it.
Never publish if no backend session.
Never run more than one publish at a time.
Drop frame if previous publish is still in flight.
Bound JPEG size and dimensions.
Stop on unmount unless we intentionally support preserved background tab streaming.
No wallet mutation.
No receipt creation.
No stream key.
No hidden spend.
```

Suggested initial settings:

```text
maxWidth: 640
quality: 0.65–0.72
interval: 1500ms or 2000ms
max data URL length guard
```

The creator loop should repeatedly call the same existing backend route:

```text
POST /streams/{stream_id}/segments
```

with:

```json
{
  "asset_crab_url": "crab://<hash>.stream",
  "media_type": "image/jpeg",
  "data_url": "<captured data url>",
  "source": "crablink_tauri_creator_frame_loop"
}
```

Header:

```text
x-ron-wallet-account: <creator account>
```

Potential helper to add in `streamSessionClient.js`:

```text
createStreamFramePublisher()
startStreamFrameLoop()
stopStreamFrameLoop()
```

But keep authority in backend. This is just a UI-controlled publisher loop.

---

## Batch 2 — Viewer latest-segment auto-refresh loop

Patch:

```text
apps/crablink-tauri/src/pages/asset/StreamPaidSegmentViewer.jsx
apps/crablink-tauri/src/pages/asset/asset.css
```

Add controls:

```text
Auto-refresh latest segment
Pause refresh
Refresh interval: 1s / 2s / 5s
Last seq
Last checked
Receipt status
Stream status
```

Rules:

```text
Only start after content_view payment receipt exists.
Never re-pay automatically.
Never create receipt from cache.
Only call latest segment route with backend receipt metadata.
Only update render when seq changes.
Back off on errors.
Stop polling when page unmounts.
Show clear message if session is lost.
```

Viewer route remains:

```text
POST /streams/{stream_id}/segments/latest
```

with:

```json
{
  "asset_crab_url": "crab://<hash>.stream",
  "payer_account": "acct_visitor_b",
  "recipient_account": "acct_dev",
  "txid": "<wallet txid>",
  "receipt_hash": "<receipt hash>",
  "amount_minor": "5"
}
```

Note: the UI should display “ROC” to the user, but backend wire fields may still use existing compatible field names.

---

## Batch 3 — Paid interval / renewal model

The user wants streams where the creator can set:

```text
X ROC every Y minutes
```

This needs product behavior beyond the current one-time content view.

Recommended model:

```text
Creator sets:
price_roc
interval_seconds
grace_seconds
renewal_policy: manual

Viewer flow:
quote current interval
pay explicitly
backend returns paid_until
viewer can watch until paid_until
near expiry, show renewal prompt
viewer confirms next payment manually
no hidden recurring payments
```

Do not implement silent recurring spend.

The UI should show:

```text
Paid until
Time remaining
Renew stream access
Last receipt
Current interval price
Recipient
```

Backend needs to expose enough in the quote/pay response or stream latest response:

```text
paid_until_ms
interval_seconds
amount_roc
recipient_account
payer_account
txid
receipt_hash
```

If backend does not yet have `paid_until`, next session should decide whether to add a temporary gateway/omnigate display field or defer until the interval route is real.

---

## Batch 4 — Session resilience and restart handling

Current stream sessions are in Omnigate memory. That means if Omnigate restarts, all live sessions disappear.

Next session should add clearer UI behavior:

```text
If latest route returns stream_session_not_found:
  show "backend session lost"
  tell creator to restart stream session
  if on creator page, offer "restart backend session + publish first segment"
  if on viewer page, show "stream offline or backend restarted"
```

Future backend design options:

```text
Keep stream descriptor durable by b3.
Keep live session state in memory for MVP.
Later add session registry / durable heartbeat / stream status record.
Do not store every frame as durable b3 unless intentionally publishing clips/VOD.
```

---

## Batch 5 — Identity locking and creator/viewer separation

This is important based on the screenshots.

Next session should patch the creator session logic so that after descriptor publish:

```text
creatorAccount = descriptor creator account or payout recipient
creatorPassport = descriptor creator passport
```

and it should not silently switch to the currently active app wallet if the user changes sessions.

UI warning:

```text
"Active wallet differs from stream creator wallet. Segment publishing must use the creator account that minted this stream."
```

Possible behavior:

```text
Creator control room stores publishedStream.creatorAccount.
Segment publishing requires that account.
If active account differs, disable publish and show switch-account warning.
```

For local dev convenience, we may still allow an override button, but it should be explicit.

---

# 7. Exact files touched or relevant

## Tauri frontend

Main files involved:

```text
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/StreamPublishFlow.jsx
apps/crablink-tauri/src/pages/stream/StreamSessionPanel.jsx
apps/crablink-tauri/src/pages/stream/StreamLocalPreview.jsx
apps/crablink-tauri/src/pages/stream/stream.css
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/pages/asset/StreamPaidSegmentViewer.jsx
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/pages/asset/asset.css
apps/crablink-tauri/src/shared/api/streamAssetClient.js
apps/crablink-tauri/src/shared/api/streamSessionClient.js
apps/crablink-tauri/src/shared/api/contentViewClient.js
```

## RustyOnions backend

Relevant backend areas:

```text
crates/omnigate/src/routes/v1/streams.rs
crates/omnigate/tests/streams.rs
crates/svc-gateway/src/routes/product.rs
crates/svc-gateway/tests/product_routes_proxy.rs
crates/svc-gateway/tests/content_view_routes_proxy.rs
```

The backend route behavior was proven by curl in this session.

---

# 8. Commands to run next session

## Start backend stack

Use the normal RustyOnions dev stack. If the stack is restarted, remember:

```text
local assets disappear
stream sessions disappear
wallet B may need to be re-funded
```

## Tauri app

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
npm run check:rust:mac-media
npm run tauri:dev:mac-media
```

## If Tauri CLI is missing

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm install
npm run tauri:dev:mac-media
```

---

# 9. Manual test plan for next session

## Test A — Current proven stream-lite flow

```text
1. Creator A opens crab://stream.
2. Creator A starts camera preview.
3. Creator A prepares stream.
4. Creator A sends ROC hold.
5. Creator A publishes stream descriptor.
6. Confirm StreamSessionPanel auto-starts backend session.
7. Confirm first latest segment appears in creator side panel.
8. Copy stream URL.
9. Visitor B opens stream URL.
10. Visitor B pays ROC.
11. Click Load latest paid segment.
12. Confirm image frame renders.
```

Expected:

```text
Viewer shows segment #1 or newer
access.status = receipt_verified
media_type = image/jpeg
```

## Test B — Creator manual snapshot refresh

```text
1. Creator clicks Publish current preview snapshot.
2. Confirm creator side panel seq increments.
3. Visitor clicks Load latest paid segment again.
4. Confirm viewer image updates.
```

Expected:

```text
seq increases
viewer frame changes
no second payment required during current proof
```

## Test C — Backend restart/session lost

```text
1. Restart Omnigate or stack.
2. Visitor clicks Load latest paid segment.
3. Confirm viewer shows stream session missing/offline message.
4. Creator clicks Auto start + first segment.
5. Visitor retries.
```

Expected:

```text
clear offline/session-lost UI
no fake stream
no fake receipt
```

## Test D — Role separation

```text
1. Mint as acct_dev.
2. Switch to acct_visitor_b.
3. Try creator segment publishing.
```

Expected desired behavior after future patch:

```text
UI warns active wallet is not stream creator wallet
does not silently publish as visitor
```

---

# 10. Suggested first patch for next session

The next patch should be:

```text
Creator live frame loop + viewer poll loop
```

Recommended order:

## File 1

```text
apps/crablink-tauri/src/shared/api/streamSessionClient.js
```

Add or confirm helpers for:

```text
captureCurrentStreamPreviewFrame
publishStreamSnapshotSegment
loadLatestPaidStreamSegment
```

Then add bounded loop helpers only if it keeps components cleaner. Otherwise keep loops in components.

## File 2

```text
apps/crablink-tauri/src/pages/stream/StreamSessionPanel.jsx
```

Add:

```text
Start live frame loop
Stop live frame loop
interval selector
publish in-flight guard
dropped frame count
last seq
last latency
```

## File 3

```text
apps/crablink-tauri/src/pages/asset/StreamPaidSegmentViewer.jsx
```

Add:

```text
Auto-refresh toggle
pause/resume
poll interval
seq-change detection
session-lost UI
receipt expiry placeholder
```

## File 4

```text
apps/crablink-tauri/src/pages/stream/stream.css
apps/crablink-tauri/src/pages/asset/asset.css
```

Add modern controls/status styling for loop state.

---

# 11. Invariants to preserve next session

These are non-negotiable:

```text
CrabLink Tauri is the client, not backend truth.
Gateway/Omnigate/backend own stream session truth.
svc-wallet owns wallet mutation.
ron-ledger owns durable economic truth.
No fake balance.
No fake receipt.
No silent spend.
No automatic ROC renewal without explicit confirmation.
No local cache unlock for paid stream.
No local camera preview reused directly as viewer truth.
No large video buffers through Tauri command result.
No arbitrary execution.
No creator-supplied player code.
No external settlement or QuickChain work yet.
```

For the stream loop specifically:

```text
Frame loop must be explicit and stoppable.
Only one publish in flight.
Dropped frames are okay.
Backpressure is okay.
Huge frames are rejected.
Errors are visible.
Viewer polling is receipt-gated.
Viewer polling must not create new payments.
```

---

# 12. Estimated completion state

For the stream feature:

```text
Descriptor minting: 90% proven
Paid content_view for stream: 90% proven
Viewer latest segment rendering: 80% proven
Creator backend session start: 75% proven after auto patch
Single-frame paid stream proof: 85% proven
Live-feeling snapshot loop: 25% remaining / next target
Paid interval renewal: 10–15% designed, not implemented
True smooth live video transport: not implemented; future architecture work
```

For the immediate “paid live stream MVP,” we are now around:

```text
60–65% complete
```

The remaining work is mostly loop behavior, role safety, paid interval UX, and resilience.

For true production-grade live video, we are much earlier, probably:

```text
20–25% complete
```

because that requires real transport design and backend media architecture beyond latest JPEG segments.

---

# 13. Bottom line for next session

The next session should start from this exact conclusion:

```text
Paid stream-lite works.
The viewer can render backend-returned image segments after ROC payment.
The remaining blocker is not payment or descriptor parsing.
The remaining blocker is turning one latest segment into a controlled live loop.
```

The first paste-ready batch should implement:

```text
Creator: Start/Stop live frame loop
Viewer: Auto-refresh latest paid segment
```

Then test:

```text
Creator publishes frames every 1–2 seconds.
Visitor B pays once.
Visitor B sees frames update without re-paying.
No silent renewal.
No fake receipt.
No local-only unlock.
```

That is the cleanest next milestone toward real live streaming.


### END NOTE - MAY 19 2026 - 16:05 CST



### BEGIN NOTE - MAY 19 2026 - 17:50 CST

Below are the carryover notes for the next instance.

# CrabLink Tauri Streaming / Creator Studio Carryover Notes

## 0. Current checkpoint

We successfully proved the **paid live stream-lite end-to-end loop** in CrabLink Tauri.

The most important breakthrough was that the stream worked when we launched **two separate app instances**:

```text
Instance A: Creator A / acct_dev
Instance B: Visitor B / acct_visitor_b
```

Creator A started the stream and published frames. Visitor B paid ROC, unlocked the stream, started auto-refresh, and saw frames coming through after payment. This proves the hardest value-loop path for live streaming:

```text
Creator camera / preview
→ stream descriptor
→ backend stream session
→ creator publishes bounded live segments
→ Visitor B pays ROC
→ backend verifies wallet receipt
→ Visitor B polls latest segment
→ frames render after payment
→ no fake receipt
→ no silent spend
→ no cache-only unlock
```

This is **not full production video streaming yet**. It is the intentionally bounded **stream-lite proof**. It uses latest bounded frame/segment delivery, not WebRTC/HLS/audio. The new `STREAM_BLUEPRINT.MD` now defines the next product direction: stop backend work for a while and build an excellent Creator Studio UX around the proven stream-lite path. 

---

## 1. Strategic decision for next session

We are pausing deeper backend streaming work for now.

The next session should focus on **CrabLink Tauri streaming studio UX**, not more Rust backend routes.

The goal is to make the stream page feel like a beautiful, modern creator tool:

```text
Pick source.
Pick look.
Set ROC access.
Go live.
```

The new blueprint says the Creator Studio should support the 90% streaming use cases without becoming an OBS clone:

```text
Camera only
Screen only
Screen with webcam thumbnail
Camera with green screen
Camera with custom background
Quick background switching mid-stream
Saved scene settings
Simple paid access setup
Clear live/publish status
```

The blueprint also says the implementation must be additive: do not replace working stream-lite proof code, do not delete existing panels, and do not rewrite paid/wallet logic. 

---

## 2. What we accomplished in this session

### 2.1 Live camera preview was already proven

Earlier work got the local camera preview working in Tauri on macOS using the dev media path.

Relevant pieces already exist in the Tauri app:

```text
apps/crablink-tauri/src/pages/stream/StreamLocalPreview.jsx
apps/crablink-tauri/src/pages/stream/StreamMediaReadiness.jsx
apps/crablink-tauri/src-tauri/Info.plist
apps/crablink-tauri/src-tauri/tauri.macos.dev-media.conf.json
```

The current `StreamLocalPreview` already supports local camera/screen/file preview style behavior and clearly labels that preview as local capture, not backend truth. The codebundle shows the preview UI has local capture controls, preview status badges, and a warning that persistent capture should eventually move behind stronger native media state so identity switching does not kill the creator stream. 

### 2.2 Stream asset minting and stream descriptor flow worked

The stream page could mint/publish a `.stream` asset descriptor.

The backend session could be started using the stream descriptor. The session had fields like:

```text
stream_id
asset_crab_url
asset_cid
manifest_cid
creator_account
creator_passport
status: live
latest_seq
latest_segment
delivery.mode: stream_lite_latest_segment
```

The important architectural truth: the stream descriptor is b3/crab-addressed content, while the live stream session is backend session state. The live latest segment is not durable b3 media truth.

### 2.3 Manual segment publishing proved backend stream route worked

We manually posted a text heartbeat segment through gateway:

```bash
STREAM_ID="stream_3a4aebe9"
ASSET_URL="crab://e7dd246e59e80b05f435f7a8cf6176a945699e4e4c20f3fe73b9a98d3041b1f8.stream"

curl -sS -X POST "http://127.0.0.1:8090/streams/${STREAM_ID}/segments" \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  -H 'x-ron-wallet-account: acct_dev' \
  -d "{
    \"asset_crab_url\":\"${ASSET_URL}\",
    \"media_type\":\"text/plain\",
    \"text\":\"debug heartbeat $(date -u +%FT%TZ)\",
    \"source\":\"manual_debug_heartbeat\"
  }" | jq .
```

That advanced the backend stream from `seq: 1` to `seq: 2`.

This proved:

```text
gateway /streams/{stream_id}/segments route works
Omnigate stream session accepts segments
asset_crab_url must match the session asset URL
producer_account was correctly acct_dev
latest segment updates in backend status
```

### 2.4 Viewer polling path was proven separately

Visitor B’s paid stream viewer was polling successfully.

At one point, the viewer UI showed values like:

```text
Checked: 20
Errors: 0
Last seq: 1
Unchanged: 20
```

That meant the viewer refresh loop itself was not failing. It was polling the backend correctly, but the backend latest segment was not advancing because the creator loop had stopped or never started.

The key diagnostic rule we established:

```text
If latest_seq is not advancing in /streams/{stream_id}/status:
  creator publishing is stuck.

If latest_seq advances but Visitor B does not update:
  viewer polling/rendering is stuck.
```

### 2.5 We diagnosed the one-window identity-switch problem

When we tried to use one Tauri app window and switch from Creator A to Visitor B, the creator stream would stop, crash, blank, or freeze.

We found several reasons:

```text
Tauri/dev identity switch is global to the app window.
React route state and MediaStream state are fragile during identity switching.
The creator tab can be unmounted, hidden, or lose capture state.
The active wallet label becomes acct_visitor_b, confusing creator publishing.
The media stream can stop when the route/app refreshes.
```

We patched parts of this:

```text
Passport drawer switch became more settings-only.
React error boundary surfaced crashes instead of silent blank screen.
Duplicate lockedCreatorAccount compile error was found and cleaned up.
Creator publish logic was pushed toward descriptor creator account instead of active wallet.
Inactive tab preservation was attempted.
```

But the main conclusion was: **do not rely on one WebView/session for Creator A and Visitor B stream proof yet.**

### 2.6 Two separate app instances solved the proof problem

The successful method was:

```text
Terminal/dev app:
  Creator A starts preview and live frame loop.

Packaged/built app:
  Visitor B opens stream URL, pays, starts refresh.
```

This separated creator capture/control from viewer payment/playback at the process level. That is now the official smoke model until we build real per-tab/per-session identity isolation.

The Stream Blueprint formalizes this as the canonical stream-lite smoke:

```text
Instance 1: Creator A
Instance 2: Visitor B

Creator starts preview.
Creator goes live.
Creator frame loop advances latest_seq.
Visitor pays once.
Visitor auto-refreshes.
Creator changes background.
Visitor sees changed background.
Creator toggles webcam overlay.
Visitor sees overlay.
No second payment occurs during refresh.
```



### 2.7 We clarified why stream-lite is low frame rate

The current system is intentionally conservative.

Current stream-lite works roughly like this:

```text
local preview frame
→ canvas/JPEG snapshot
→ base64 data URL
→ JSON POST through gateway
→ Omnigate latest segment memory
→ paid viewer polls latest segment
```

That is not suitable for smooth 30fps streaming or audio. It is perfect for proving the payment/session/access boundary.

The MEDIA_TAURI_IDB reinforces this direction: large media should not cross the Tauri command boundary as one full in-memory blob, playback should use bounded range/segment paths, cached media must be verified, paid media cannot unlock from cache alone, and CrabLink must not make fake DRM/anti-rip claims. 

---

## 3. Current architecture status

### 3.1 Tauri app remains primary

The project pivot is still Tauri-first. Chrome is proof/companion only.

The COMBINED_IDB says Tauri is now the primary client, gateway compatibility comes first, OAP is Rust-side only, b3 hashes are canonical, wallet/ledger truth remains backend-owned, and the app must not create fake balances, fake receipts, silent spend, or arbitrary code execution. 

### 3.2 React is display and creator UX, not authority

React may:

```text
show camera preview
show stream studio controls
collect title/access/source/look settings
call typed adapters
show backend-derived status
show backend-derived receipts
request explicit paid actions
```

React must not:

```text
own wallet truth
own ledger truth
invent balances
invent receipts
unlock paid content from cache
store secrets
store spend authority
manually build OAP frames
run arbitrary creator code
```

### 3.3 Stream-lite truth boundary

Current stream-lite truth model:

```text
Stream descriptor:
  b3/crab asset truth

Backend stream session:
  Omnigate/session truth, not durable media truth

Latest segment:
  bounded in-memory latest segment, not permanent VOD truth

Paid unlock:
  backend receipt truth through wallet/ledger path

Viewer refresh:
  reuses existing backend receipt proof and does not spend again
```

### 3.4 Paid access invariants remain strict

The paid-action IDB states the central rules:

```text
No fake ROC.
No fake receipts.
No silent spend.
Paid actions require explicit confirmation.
Wallet mutation goes through svc-wallet.
ron-ledger remains durable economic truth.
Local receipt cache is display-only.
CrabLink never directly mutates ledger, storage, index, accounting, rewarder, or QuickChain.
```



---

## 4. Important files for next session

### 4.1 Stream UX / frontend files

Primary files:

```text
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/stream.css
apps/crablink-tauri/src/pages/stream/StreamLocalPreview.jsx
apps/crablink-tauri/src/pages/stream/StreamSessionPanel.jsx
apps/crablink-tauri/src/pages/stream/StreamPublishFlow.jsx
apps/crablink-tauri/src/pages/stream/StreamPricingPanel.jsx
apps/crablink-tauri/src/pages/stream/StreamDraft.jsx
apps/crablink-tauri/src/pages/stream/streamDraftModel.js
apps/crablink-tauri/src/pages/stream/StreamMediaReadiness.jsx
```

Viewer side:

```text
apps/crablink-tauri/src/pages/asset/StreamPaidSegmentViewer.jsx
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
```

API/client:

```text
apps/crablink-tauri/src/shared/api/streamAssetClient.js
apps/crablink-tauri/src/shared/api/streamSessionClient.js
apps/crablink-tauri/src/shared/api/contentViewClient.js
apps/crablink-tauri/src/shared/api/walletClient.js
```

Shell/session risk zone:

```text
apps/crablink-tauri/src/app/shell/PassportDrawer.jsx
apps/crablink-tauri/src/app/shell/BrowserTabs.jsx
apps/crablink-tauri/src/app/shell/Shell.css
apps/crablink-tauri/src/app/App.jsx
apps/crablink-tauri/src/app/settings.js
apps/crablink-tauri/src/shared/utils/devPassportSessions.js
```

### 4.2 Tauri Rust media/command files

```text
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src-tauri/src/commands/stream.rs
apps/crablink-tauri/src-tauri/src/commands/gateway.rs
apps/crablink-tauri/src-tauri/Info.plist
apps/crablink-tauri/src-tauri/tauri.macos.dev-media.conf.json
apps/crablink-tauri/src-tauri/tauri.conf.json
```

### 4.3 Blueprint file to use next

```text
STREAM_BLUEPRINT.MD
```

The current blueprint title is:

```text
CRABLINK_STREAMING_CREATOR_STUDIO_BLUEPRINT.MD
```

It defines the Creator Studio UX, implementation order, component responsibilities, stream-lite integration, compositor contract, green screen plan, background switching, webcam overlay, two-instance smoke, and non-goals. 

---

## 5. What remains for video streaming to work completely

### 5.1 What already works

```text
Camera preview in Tauri dev media mode
.stream descriptor publish/mint path
Backend stream session creation
Manual segment publishing
Creator frame loop in two-app mode
Visitor B paid unlock
Visitor B latest-segment polling
Frames visible after payment
Two-app Creator A / Visitor B smoke proof
```

### 5.2 What is still not done

```text
Beautiful Creator Studio UX
Green screen effect
Background image switching mid-stream
Screen + webcam thumbnail compositor
Saved stream studio presets
Smooth source switching mid-stream
Fallback slate when switching scenes
Frame publishing from composited canvas instead of raw camera only
Polished Go Live flow that hides backend debug clutter
Developer drawer for raw stream status
Production-quality audio/video transport
Audio capture/mic mixing
MediaRecorder chunk path
WebRTC/HLS/OAP media transport
Paid interval renewals
Stream archive/VOD
Chat/moderation/tips/subscriptions
True per-tab/per-session identity isolation
```

### 5.3 Full smooth video is intentionally deferred

Do not try to turn stream-lite JSON/JPEG latest segments into production streaming.

Current stream-lite should be used to prove:

```text
paid access
creator publishing
viewer receipt verification
gateway route behavior
bounded media movement
creator UX
```

Full streaming later needs one of:

```text
MediaRecorder chunks
WebRTC session service
HLS / LL-HLS segment service
OAP media transport
gateway-mediated paid stream sessions
```

---

## 6. Next session mission

The next session should begin **Phase 1 of STREAM_BLUEPRINT.MD**.

### Mission

Build the first version of the **CrabLink Streaming Creator Studio UX**.

Do this as an additive refactor around the working stream page.

Do not rip out working stream-lite proof.

Do not start backend work.

Do not introduce missing placeholder components.

Do not change paid wallet logic.

### Phase 1 goal

Make the stream page look and feel like a real creator studio:

```text
large polished preview area
right-side simple controls
source/look/access grouping
Go Live status/action area
developer drawer collapsed by default
clean stream status bar
modern dark studio aesthetic
green live accents
minimal debug clutter on main screen
```

The blueprint explicitly says Phase 1 should preserve existing camera preview, stream mint/publish path, `StreamSessionPanel` backend controls, and the two-app paid stream proof. 

---

## 7. Recommended next implementation plan

### Step 1 — Create an additive Studio Shell

Add:

```text
apps/crablink-tauri/src/pages/stream/StreamStudioShell.jsx
```

But only if the patch includes the full working component.

The shell should wrap existing components:

```text
StreamStudioShell
  uses existing StreamLocalPreview
  uses existing StreamDraft / draft fields
  uses existing StreamPricingPanel
  uses existing StreamPublishFlow
  uses existing StreamSessionPanel
  hides advanced JSON/debug details behind a drawer
```

Do not create imports for components that do not exist.

### Step 2 — Update StreamPage minimally

`StreamPage.jsx` should mount the new shell but keep the existing data flow.

Do not rewrite the stream publish model.

Do not move wallet/receipt logic.

Do not introduce global state changes.

### Step 3 — Add modern studio CSS

Update:

```text
apps/crablink-tauri/src/pages/stream/stream.css
```

Design direction:

```text
dark studio background
large preview card
right control rail
source/look/access cards
green live accent
rounded panels
clean typography
same light/dark theme compatibility
developer drawer collapsed by default
```

### Step 4 — Preserve stream-lite controls

The first UX pass may reorganize these, but must preserve:

```text
Start preview
Publish stream descriptor
Start backend session / frame loop
Stop backend stream
Copy stream URL
Show latest seq/status somewhere
Show errors clearly
```

### Step 5 — Keep developer diagnostics

Debug details should exist, but not dominate.

Move or keep behind:

```text
Developer details
Stream proof
Backend payload
Latest segment
Receipt proof
Raw JSON
```

### Step 6 — Test with two app instances

Every patch should end with the canonical smoke:

```text
Instance 1: Creator A
Instance 2: Visitor B
Creator starts stream
Visitor pays
Visitor sees frames
No second payment during refresh
```

---

## 8. Phase 2 direction after the studio shell

After Phase 1 is visually strong and still green, Phase 2 should add the compositor model.

New files likely:

```text
apps/crablink-tauri/src/pages/stream/streamStudioModel.js
apps/crablink-tauri/src/pages/stream/streamCompositor.js
apps/crablink-tauri/src/pages/stream/StreamStudioPreview.jsx
```

The compositor contract from the blueprint should expose:

```js
{
  getCanvas(): HTMLCanvasElement | null,

  captureFrameDataUrl(options): Promise<{
    schema: 'crablink.stream-studio-frame.v1',
    mediaType: 'image/jpeg',
    dataUrl: string,
    width: number,
    height: number,
    sourceMode: string,
    effects: {
      greenScreenEnabled: boolean,
      backgroundMode: string,
      webcamOverlayEnabled: boolean
    },
    createdAt: string
  }>,

  captureStream(fps): MediaStream | null
}
```

For current stream-lite:

```text
StreamSessionPanel publishes from captureFrameDataUrl().
```

For future real streaming:

```text
MediaRecorder/WebRTC/OAP can use captureStream().
```

This is the key design bridge: good UX now, no transport dead end later.

---

## 9. Phase 3 direction: green screen and backgrounds

Green screen should be local UX/compositor only.

It should not touch:

```text
wallet
ledger
receipt
paid access
stream ownership
backend entitlement
```

Implementation direction:

```text
hidden source video
work canvas
output canvas
draw background first
draw processed foreground second
apply chroma key alpha
publish composited canvas frame
```

Correct draw order from blueprint:

```text
1. Draw selected background onto output canvas.
2. Draw camera frame into work canvas.
3. Apply chroma key alpha to work canvas pixels.
4. Draw processed foreground over background.
5. Draw overlays/status if needed.
```

Allowed background sources for v1:

```text
none
solid color
bundled image
user-selected local image
later b3-verified image
```

Avoid arbitrary remote URL background galleries for production.

---

## 10. Phase 4 direction: saved presets

Presets are local convenience only.

Allowed to save:

```text
source mode
camera preference hint
green screen settings
background choice metadata
webcam overlay position
stream-lite quality preset
preferred frame interval
draft title/description/tags
```

Forbidden to save:

```text
wallet secrets
raw capabilities
stream keys
paid receipt truth
viewer entitlement truth
private keys
backend ownership truth
ledger state
live backend session
```

Settings must go through existing Tauri settings adapters and remain typed, bounded, non-secret, and safe to reset.

---

## 11. Key test commands for next session

### 11.1 Tauri app checks

From:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
```

Run:

```bash
npm run build
npm run check:rust:mac-media
npm run tauri:dev:mac-media
```

The codebundle confirms these scripts exist, including `tauri:dev:mac-media` and `check:rust:mac-media`. 

### 11.2 Build packaged app for second instance

From:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
```

Run:

```bash
npm run build
npm run tauri -- build --config src-tauri/tauri.macos.dev-media.conf.json
```

Find output:

```bash
find src-tauri/target/release/bundle -maxdepth 4 \
  \( -name "*.app" -o -name "*.dmg" \) -print
```

Open likely app:

```bash
open "src-tauri/target/release/bundle/macos/CrabLink.app"
```

### 11.3 Watch stream status

From:

```bash
cd /Users/mymac/Desktop/RustyOnions
```

Run:

```bash
STREAM_ID="stream_3a4aebe9"

while true; do
  printf "\n--- %s ---\n" "$(date -u +%FT%TZ)"
  curl -fsS "http://127.0.0.1:8090/streams/${STREAM_ID}/status" \
    | jq '.session.status, .session.latest_seq, .session.latest_segment.media_type, .session.latest_segment.source, .session.latest_segment.producer_account, .session.latest_segment.created_at_ms'
  sleep 2
done
```

Expected when creator loop works:

```text
"live"
3, 4, 5...
"image/jpeg"
"crablink_tauri_creator_frame_loop" or compositor equivalent
"acct_dev"
created_at_ms changing
```

### 11.4 Fund Visitor B after stack restart

If wallet B has no ROC after restarting backend stack:

```bash
curl -fsS -X POST http://127.0.0.1:8088/v1/issue \
  -H 'Authorization: Bearer dev' \
  -H "Idempotency-Key: dev-fund-visitor-b-$(date +%s)" \
  -H 'Content-Type: application/json' \
  -d '{"to":"acct_visitor_b","asset":"roc","amount_minor":"1776","memo":"dev fund visitor B"}' \
  | jq .
```

Verify:

```bash
curl -fsS 'http://127.0.0.1:8090/wallet/acct_visitor_b/balance' \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:visitor-b' \
  -H 'x-ron-wallet-account: acct_visitor_b' \
  | jq .
```

---

## 12. Canonical two-app stream smoke for next session

Use this exact order after each major UX patch:

```text
1. Start RustyOnions backend stack.
2. Start Creator A Tauri dev app:
   npm run tauri:dev:mac-media

3. In Creator A:
   - use acct_dev
   - open stream page
   - start camera preview
   - mint/publish stream descriptor
   - start backend session/frame loop
   - copy stream URL
   - do not switch to Visitor B in this instance

4. Build/open packaged app as Visitor B:
   - open .app or .dmg build
   - switch to acct_visitor_b
   - paste/load creator stream URL
   - pay once
   - start auto-refresh

5. Watch terminal:
   - latest_seq must advance
   - producer_account must remain acct_dev
   - viewer must update without second payment
```

This two-instance method is currently the truth-preserving stream proof.

---

## 13. Important warnings for next instance

### 13.1 Do not restart backend unnecessarily

Restarting the stack may clear local assets/sessions and wallet balances.

If the stream URL stops resolving after restart, recreate the stream.

If Visitor B cannot pay, fund `acct_visitor_b` again.

### 13.2 Do not switch passports in the creator instance during stream proof

The one-window identity switch remains risky.

Avoid:

```text
Creator starts stream
same app switches to Visitor B
```

Preferred:

```text
Creator stays Creator A in one app
Visitor B runs in second app
```

### 13.3 Do not make localhost mandatory for normal users

Localhost is dev-only.

Product/default runtime remains gateway-first:

```text
Tauri → configured svc-gateway → omnigate → RustyOnions services
```

### 13.4 Do not push QuickChain/external settlement

Streaming studio UX must not introduce:

```text
ROX
Solana
external settlement
public bridge
staking
liquidity
exchange logic
QuickChain implementation
```

### 13.5 Do not fake smoother streaming

Do not claim stream-lite is production video.

Correct language:

```text
stream-lite proof
bounded latest segment
low-frame preview
paid live proof
```

Avoid:

```text
full WebRTC
DRM
anti-rip
production livestreaming
broadcast-grade video
```

---

## 14. Current definition of done for the next UX phase

The next UX phase is done when:

```text
1. Stream page opens as a polished Creator Studio.
2. Existing camera preview still works.
3. Existing stream mint/publish path still works.
4. Creator can start live frame loop.
5. Visitor B can pay in second app.
6. Visitor B sees frames update.
7. No second payment occurs during refresh.
8. Developer details are available but not cluttering main UI.
9. npm run build passes.
10. npm run check:rust:mac-media passes.
```

Stretch goal for the next session:

```text
The page visually supports the future source/look/access model,
even if green screen and compositor are not wired yet.
```

---

## 15. Recommended first patch for next session

The first patch should be **UX-only/additive**.

Likely files:

```text
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/stream.css
```

Potential new file:

```text
apps/crablink-tauri/src/pages/stream/StreamStudioShell.jsx
```

Do not add:

```text
StreamSourcePicker.jsx
StreamSceneControls.jsx
StreamGoLivePanel.jsx
StreamStudioStatusBar.jsx
```

unless those files are fully implemented in the same patch.

First patch should probably:

```text
wrap existing stream panels in a studio layout
make preview the visual center
move draft/pricing/session controls into right-side cards
add source/look/access visual grouping
add collapsed developer drawer
preserve existing props/state paths
preserve existing live frame loop
preserve existing publish flow
```

---

## 16. Product direction after Phase 1

Once the studio shell is good, proceed:

```text
Phase 2:
  compositor model
  camera/screen source model
  webcam overlay primitive
  captureFrameDataUrl contract

Phase 3:
  green screen MVP
  tolerance slider
  key color picker
  bundled/local background switching

Phase 4:
  saved presets
  reset default
  local-only settings

Phase 5:
  better stream-lite publishing
  fallback switching slate
  1s proof mode
  segment size display
  dropped frame counter

Phase 6:
  write real media transport blueprint
  MediaRecorder chunks
  audio track
  paid_until intervals
  range/segment playback
```

---

## 17. Final handoff summary

We ended this session at a strong checkpoint.

The backend stream-lite proof works. The viewer paid unlock works. The two-app method works. The current limitation is not the paid business loop; it is the creator product experience and the lack of a polished compositor/studio UI.

Next session should start with `STREAM_BLUEPRINT.MD`, keep backend work frozen unless a regression appears, and build the Creator Studio UX around the current proven stream-lite path.

The guiding rule:

```text
Make streaming feel amazing without weakening RustyOnions truth boundaries.
```


### END NOTE - MAY 19 2026 - 17:50 CST


### BEGIN NOTE - MAY 19 2026 - 20:35 CST

# CrabLink Tauri Streaming Creator Studio — Carryover Notes

## 0. Current checkpoint

We reached a major Creator Studio milestone: **person cutout background replacement works**. The stream page can now use local camera input, trace the person, remove the real-world background, and place a selected background behind the creator. This moved us beyond old-school chroma key and into TikTok/Zoom-style creator background replacement.

This is still correctly scoped as **local creator UX**. It does not create stream truth, receipt truth, wallet truth, entitlement truth, viewer count truth, or ledger truth. That matches the stream blueprint’s invariant that Creator Studio is presentation/capture UX only, while paid unlock and stream/session truth stay backend-derived. 

The biggest thing we proved in this session:

```text
Camera frame
→ MediaPipe person segmentation
→ person mask
→ local background image/color
→ composited canvas
→ clean Creator Studio preview
```

This is an excellent product breakthrough because the stream page now feels like it can become a real creator app, not just a backend route test panel.

---

## 1. What we accomplished in this session

### 1.1 Cleaned up the stream page hero/header clutter

At the start, the stream page had an oversized dramatic banner and then a second status strip that still felt too bulky. We removed that clutter and moved toward a compact Creator Studio page.

The blueprint’s goal is a simple product path:

```text
Pick source.
Pick look.
Set ROC access.
Go live.
```

The page now feels much closer to that goal. The blueprint explicitly says the Studio should feel like a sleek creator tool, not a backend test harness, and should support camera, screen, screen + camera, green screen/background, saved scenes, simple paid access, and clear live status without becoming an OBS clone. 

### 1.2 Built the local compositor direction

We introduced/expanded the local compositor path around:

```text
apps/crablink-tauri/src/pages/stream/streamCompositor.js
apps/crablink-tauri/src/pages/stream/StreamLookPanel.jsx
apps/crablink-tauri/src/pages/stream/streamPersonSegmentation.js
apps/crablink-tauri/src/pages/stream/stream.css
```

The current Tauri codebundle shows the stream family now includes `streamCompositor.js`, `StreamLookPanel.jsx`, `streamPersonSegmentation.js`, and `streamStudioModel.js`, which are exactly the right ownership boundaries for the Creator Studio work. 

The architecture is correct:

```text
React/WebView:
  camera/screen capture
  local compositor
  person cutout
  background image/color
  visual controls

Backend:
  stream descriptor
  live stream session
  latest segment route
  paid access
  wallet/receipt/ledger truth
```

### 1.3 Added real person cutout background replacement

We moved from “green screen color key” to actual person segmentation.

Important distinction:

```text
Chroma key:
  removes a selected color from the camera feed

Person cutout:
  uses a segmentation model to identify the person,
  keeps the person,
  removes the real background,
  draws a chosen background behind the person
```

This is what the user wanted: no physical green screen required.

We added/used MediaPipe segmentation through `@mediapipe/tasks-vision`. Current implementation notes:

```text
streamPersonSegmentation.js:
  loads MediaPipe vision task
  runs segmentation on video frames
  returns a local person/background mask
  exposes status to the UI
  keeps this as local visual state only
```

The codebundle’s file header correctly labels this as a local mask only, not b3/wallet/receipt/entitlement/backend truth. 

### 1.4 Fixed the “black silhouette” polarity bug

The first segmentation pass traced the person perfectly but blacked out the subject because the mask polarity was wrong. We diagnosed this as a label/order/polarity mismatch.

Fixes added during the session:

```text
- added explicit polarity handling
- added UI switch for flipping cutout polarity
- moved away from trusting one fixed label order
- added/used auto-detection logic based on likely subject region
- confirmed the subject is now kept and the background is removed
```

The key result: the person is no longer blacked out; the background is removed correctly.

### 1.5 Added background image replacement

We tested background image replacement using the generated beach-with-red-crabs image. The image showed behind the cutout, proving the local background image pipeline works.

Important current behavior:

```text
Open background image
→ read as local image/data URL
→ store in local draft state
→ compositor draws it behind the person
→ next composited frame uses the new background
```

This is still local-only. It does not publish the background image as a b3 asset unless we explicitly build that later.

### 1.6 Fixed decorative circles covering active backgrounds

After background images started working, we found the large green/gray decorative circles were being drawn over the active background. That made uploaded images look tinted or partially covered.

Final intended fix:

```text
Idle slate:
  may show decorative circles/professional splash screen

Active camera/compositor preview:
  must draw clean selected background only
  no decorative circles over uploaded images
```

This preserves the nice professional idle screen while letting active backgrounds render cleanly.

### 1.7 Confirmed the product direction is right

The current page now supports a meaningful “Look” panel:

```text
No cutout
Person cutout
Chroma key
Background presets
Open background image
Image fit
Cutout edge softness
Brightness
Contrast
Saturation
Flip cutout polarity
```

This is exactly the right direction for a modern Creator Studio.

---

## 2. What is working now

Current working items:

```text
CrabLink Tauri app launches with stream media profile
Camera preview works on macOS dev media config
Stream page has polished Creator Studio layout
Person cutout works
Background image replacement works
Solid background replacement works
Chroma key controls still exist
Idle splash screen looks professional
Active preview shows composited person over selected background
Local preview clearly remains local compositor state
```

Run command for stream/media Tauri app:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run tauri:dev:mac-media
```

Useful validation commands:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
npm run check:rust:mac-media
npm run tauri:dev:mac-media
```

If dependencies changed locally because of MediaPipe:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm install
npm run build
```

---

## 3. What must remain sacred

Do not let the next session accidentally weaken the working proof.

The stream blueprint says the current stream page already owns important working pieces: draft state, local preview, publish flow, pricing panel, backend session panel, live frame loop proof, and paid stream-lite integration. The Creator Studio must wrap/reorganize these pieces, not discard them. 

Hard rules:

```text
Do not rewrite StreamPage from scratch.
Do not delete StreamLocalPreview.
Do not delete StreamSessionPanel.
Do not delete StreamPublishFlow.
Do not replace paid/wallet logic.
Do not invent fake balances.
Do not invent fake receipts.
Do not silently spend ROC.
Do not unlock paid stream content from cache alone.
Do not move wallet/ledger truth into React.
Do not claim stream-lite is production WebRTC/HLS video.
```

Correct language:

```text
stream-lite proof
bounded latest segment
composited frame
paid live proof
local creator compositor
```

Avoid claiming:

```text
broadcast-grade video
production livestreaming
DRM
anti-rip
full WebRTC
full HLS
```

---

## 4. Important files for the next session

Primary frontend stream files:

```text
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/stream.css
apps/crablink-tauri/src/pages/stream/StreamLocalPreview.jsx
apps/crablink-tauri/src/pages/stream/StreamLookPanel.jsx
apps/crablink-tauri/src/pages/stream/streamCompositor.js
apps/crablink-tauri/src/pages/stream/streamPersonSegmentation.js
apps/crablink-tauri/src/pages/stream/streamStudioModel.js
apps/crablink-tauri/src/pages/stream/StreamPricingPanel.jsx
apps/crablink-tauri/src/pages/stream/StreamPublishFlow.jsx
apps/crablink-tauri/src/pages/stream/StreamSessionPanel.jsx
apps/crablink-tauri/src/pages/stream/StreamMediaReadiness.jsx
```

Viewer side:

```text
apps/crablink-tauri/src/pages/asset/StreamPaidSegmentViewer.jsx
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
```

Shared API/client files:

```text
apps/crablink-tauri/src/shared/api/streamAssetClient.js
apps/crablink-tauri/src/shared/api/streamSessionClient.js
apps/crablink-tauri/src/shared/api/contentViewClient.js
apps/crablink-tauri/src/shared/api/walletClient.js
```

Tauri media/command files:

```text
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src-tauri/src/commands/stream.rs
apps/crablink-tauri/src-tauri/src/commands/gateway.rs
apps/crablink-tauri/src-tauri/Info.plist
apps/crablink-tauri/src-tauri/tauri.macos.dev-media.conf.json
apps/crablink-tauri/src-tauri/tauri.conf.json
```

The current codebundle confirms those stream files are now part of the Tauri app source tree. 

---

## 5. Current known risks / cleanup items

### 5.1 Fresh codebundle needed

The codebundle currently attached may not include the very last local patch where the active background was cleaned up and idle decorative circles were isolated. Next session should start by generating a fresh codebundle after confirming the working state:

```bash
cd /Users/mymac/Desktop/crablink
scripts/make_codebundle.sh
```

Then attach the new `CODEBUNDLE_TAURI_APP.md`.

### 5.2 MediaPipe model is dev-CDN based right now

The current segmentation implementation was introduced as an MVP and uses remote MediaPipe wasm/model URLs. That is acceptable for local dev proof, but production/offline gates should eventually bundle the model/wasm locally. The file header in the codebundle already says the MVP uses dev CDN/model URL and production should bundle locally. 

Future production requirement:

```text
No required CDN for core creator effects.
Bundle model/wasm locally.
Respect Tauri/offline packaging.
Keep camera frames local.
Do not upload raw camera frames to any ML service.
```

### 5.3 Draft state may contain old bad mask defaults

If the person cutout ever reverts or looks inverted after future patches, check local draft/settings state first. Old values like `personMaskInvert: true` or older polarity fields may persist.

Quick manual workaround:

```text
No cutout → Person cutout
or Clear draft
or reset stream local draft state
```

Long-term fix:

```text
Add a draft schema version / migration for stream studio local state.
Normalize old personMaskInvert/personMaskPolarity fields.
```

### 5.4 Background image size/state needs bounding

Right now background images are local draft state. That is fine for MVP, but storing large base64 image data in long-term settings could become messy.

Next better design:

```text
For immediate dev:
  allow local data URL under size cap

For production:
  use local cache/storage adapter
  store a background image record/id
  keep image local unless explicitly published
  never expose local path to React/backend
```

### 5.5 Performance must be watched

Person segmentation can be expensive. The current proof works, but next session should keep an eye on:

```text
CPU/GPU usage
frame rate
UI responsiveness
mask update interval
segment publish interval
canvas size
background image size
```

Keep graceful degradation:

```text
High quality → balanced → proof mode → no cutout/chroma fallback
```

---

## 6. What remains in the stream blueprint

The blueprint’s 90% target use cases are:

```text
Camera only
Screen only
Screen with webcam thumbnail
Camera with green screen
Camera with custom background
Quick background switching mid-stream
Saved scene settings
Simple paid access setup
Clear live/publish status
```

We have now made meaningful progress on:

```text
Camera only
Camera with custom background
Person cutout background replacement
Chroma key controls
Background switching at local preview level
```

Still remaining:

```text
Screen only UX polish
Screen + webcam thumbnail compositor
Saved local scene presets
Smooth source switching mid-stream
Fallback slate during source/background switching
Go Live one-button flow
Developer drawer cleanup
Composited frame publishing verification
Segment stats/dropped frame counters
Paid interval renewal UX
Audio/mic path later
MediaRecorder chunk path later
WebRTC/HLS/OAP transport later
```

The blueprint says the next transport stage after UX is stable is `canvas.captureStream(fps)` plus optional microphone track into MediaRecorder chunks, then bounded upload/relay and paid viewer segment playback. That is explicitly later, after the Creator Studio UX stabilizes. 

---

## 7. Recommended next-session plan

### Batch 1 — Stabilize and clean current compositor

Start next session by locking in the current working state.

Goals:

```text
Confirm build passes.
Confirm app launches.
Confirm camera preview works.
Confirm person cutout works.
Confirm uploaded background image displays cleanly.
Confirm idle circles are not visible during active preview.
Generate fresh codebundle.
```

Likely files:

```text
apps/crablink-tauri/src/pages/stream/streamCompositor.js
apps/crablink-tauri/src/pages/stream/StreamLookPanel.jsx
apps/crablink-tauri/src/pages/stream/stream.css
apps/crablink-tauri/src/pages/stream/streamPersonSegmentation.js
```

Potential cleanup:

```text
Remove duplicate/obsolete personMaskInvert logic.
Normalize to personMaskFlip/personMaskPolarity only.
Make active background and idle background code clearly separate.
Make loaded background images redraw without the “Loading local background image” badge lingering.
```

Definition of done:

```text
npm run build passes
npm run check:rust:mac-media passes
camera + person cutout + uploaded background all work
```

### Batch 2 — Add saved local scene presets

This is the most logical next product feature because the cutout/background effect now works and users will want to save the setup.

The blueprint defines a scene preset as local creator UX only, with fields for source mode, camera hints, screen flags, overlay position, effects, background, output settings, and a truth boundary. It also explicitly allows saving source mode, camera preference, green-screen/background settings, webcam overlay position, output quality, frame interval, and draft title/description/tags; it forbids saving wallet secrets, raw capabilities, stream keys, receipt truth, entitlement truth, private keys, ownership truth, ledger state, or live backend session. 

Suggested new/updated files:

```text
apps/crablink-tauri/src/pages/stream/streamStudioSettings.js
apps/crablink-tauri/src/pages/stream/streamStudioModel.js
apps/crablink-tauri/src/pages/stream/StreamLookPanel.jsx
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/stream.css
```

Capabilities:

```text
Save current scene
Load saved scene
Reset default scene
Rename scene
Delete scene
Show “local preference only” label
Do not store wallet/session/receipt/backend truth
```

MVP shape:

```js
{
  schema: 'crablink.creator-scene-preset.v1',
  id: 'default',
  name: 'Default',
  sourceMode: 'camera_only',
  backgroundRemovalMode: 'person',
  backgroundMode: 'image',
  backgroundImageName: 'crabs beach',
  backgroundImageFit: 'cover',
  personMaskFeather: 2,
  cameraBrightness: 100,
  cameraContrast: 100,
  cameraSaturation: 100,
  output: {
    width: 1280,
    height: 720,
    quality: 0.72,
    frameIntervalMs: 2000
  },
  truthBoundary: 'Local creator UX preset only. Not stream, wallet, receipt, or entitlement truth.'
}
```

### Batch 3 — Add camera framing / creator comfort controls

Now that the cutout works, creators need to frame themselves better.

Recommended controls:

```text
Mirror preview
Zoom/crop
Horizontal position
Vertical position
Brightness
Contrast
Saturation
Edge softness
Optional “reset camera look”
```

Why this matters: the cutout is good, but the subject framing can still feel raw. Simple framing controls make the Studio feel like a real creator app.

Likely files:

```text
streamCompositor.js
StreamLookPanel.jsx
streamStudioModel.js
stream.css
```

Important rule:

```text
These are local visual effects only.
They do not change backend stream truth except through the composited frame that the creator explicitly publishes.
```

### Batch 4 — Screen + webcam thumbnail compositor

This is the next major blueprint feature after camera/background.

The blueprint describes source modes for Camera Only, Screen Only, Screen + Camera, and Camera + Background. Screen + Camera should keep it simple: screen fills the canvas, webcam appears as a thumbnail, with quick positions like bottom right/bottom left/top right/top left, without building a full layer editor. 

Implementation target:

```text
Screen only:
  capture screen
  draw screen into compositor canvas

Screen + camera:
  capture screen as main source
  capture camera as overlay source
  draw screen first
  draw webcam thumbnail second
  allow position/size/shape controls
```

Likely files:

```text
StreamLocalPreview.jsx
streamCompositor.js
StreamLookPanel.jsx or new Source/Overlay panel
streamStudioModel.js
stream.css
```

MVP controls:

```text
Source: Camera / Screen / Screen + Cam
Webcam overlay: Off/On
Position: bottom right / bottom left / top right / top left
Size: small / medium / large
Shape: rounded rectangle / circle later
```

Definition of done:

```text
Screen capture preview works.
Screen + camera thumbnail works.
Switching to screen mode does not break current camera mode.
No backend truth changes.
```

### Batch 5 — Smooth source/background switching mid-stream

This should be done after source modes and presets exist.

Goal:

```text
Creator can change background or source while live.
Preview updates immediately.
Next published segment uses the new compositor output.
No wallet/receipt/session state changes.
```

Needed UX:

```text
Show a short fallback slate while switching source.
Keep previous source alive until new source is ready when possible.
Do not kill live frame loop accidentally.
Show “Switching source…” state.
Recover cleanly if permission denied.
```

Potential files:

```text
StreamLocalPreview.jsx
streamCompositor.js
StreamSessionPanel.jsx
StreamPage.jsx
stream.css
```

### Batch 6 — Polish Go Live flow

Current stream page still exposes too many pieces separately. The blueprint wants simple main action language like “Start preview,” “Choose source,” “Go live,” “Copy stream link,” and “Stop stream,” while route names, latest seq, data URL, receipt hash, gateway payload, and similar details belong in a developer drawer. 

Target user flow:

```text
1. Start Preview
2. Set Look / Access
3. Go Live
   - publish descriptor if needed
   - start backend stream session
   - start live frame loop
4. Copy stream link
5. Stop Stream
```

Do not change backend semantics. This is orchestration UX, not a new authority path.

Likely files:

```text
StreamPage.jsx
StreamPublishFlow.jsx
StreamSessionPanel.jsx
StreamPricingPanel.jsx
stream.css
```

Definition of done:

```text
Main UI has one obvious Go Live path.
Developer details are collapsible.
Existing manual controls remain available for debugging.
No silent ROC action.
```

### Batch 7 — Two-app paid stream smoke with composited frame

After compositor and Go Live polish, rerun the paid proof:

```text
Instance A:
  Creator A / acct_dev
  Person cutout on
  Background image selected
  Go Live
  Frame loop publishing composited frames

Instance B:
  Visitor B / acct_visitor_b
  Pay once
  Unlock stream
  Auto-refresh latest segment
  See composited person + background
  No second payment during refresh
```

This is the key proof that the visual compositor has entered the real stream-lite path, not just local preview.

The previous carryover notes established the two-app stream-lite value loop: creator preview → descriptor/session → bounded live segments → Visitor B ROC payment → backend receipt verification → latest-segment polling → frames render after payment, with no fake receipt, no silent spend, and no cache-only unlock. 

---

## 8. Backend work status

Backend streaming should remain mostly frozen unless a regression appears.

Already proven:

```text
.stream descriptor publish/mint path
backend stream session creation
manual/latest segment publishing
creator live frame loop in two-app mode
visitor paid unlock
visitor latest-segment polling
frames visible after payment
no second payment on refresh
```

Current backend is good enough for Creator Studio UX work.

Do not start:

```text
WebRTC backend
HLS backend
OAP media transport
paid interval ledger changes
QuickChain
external settlement
ROX/Solana
```

until the Creator Studio UX and stream-lite proof are polished.

---

## 9. Future media transport, not next immediate patch

Full smooth video remains later.

Blueprint-approved future path:

```text
composited canvas.captureStream(fps)
+ optional microphone track
→ MediaRecorder
→ short WebM chunks
→ bounded upload/relay route
→ paid viewer segment playback
```

Audio should not be bolted onto JPEG stream-lite frames. It belongs with chunked/realtime media transport, where microphone/screen audio/mixing/mute state/audio meters can be handled honestly. 

Future options:

```text
MediaRecorder chunks
WebRTC session service
HLS / LL-HLS segment service
OAP media transport
gateway-mediated paid stream sessions
```

But next session should stay on UX/compositor/source/preset work unless the user explicitly chooses to shift back to backend transport.

---

## 10. Testing checklist for next session

Basic frontend gates:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
npm run check:rust:mac-media
npm run tauri:dev:mac-media
```

Manual local Studio smoke:

```text
Open crab://stream
Start camera preview
Enable Person cutout
Select background image
Verify person stays visible
Verify real background is gone
Verify selected background is clean
Verify idle circles disappear during active preview
Stop preview
Verify idle splash returns
```

Compositor smoke:

```text
Change background while camera is active
Change solid background preset
Open background image
Switch image fit cover/contain
Toggle flip polarity only if needed
Adjust edge softness
Adjust brightness/contrast/saturation
Confirm no app crash
```

Stream-lite smoke:

```text
Start backend stack
Ensure wallet B has ROC after stack restart
Launch Creator A instance
Launch Visitor B instance
Creator goes live
Visitor pays once
Visitor sees updated latest frames
Refresh/poll does not re-spend
```

Regression checks:

```text
Image/video/post/article/site paid flows should not be touched.
Wallet labels and balance display should remain backend-derived.
No new secrets in React state/localStorage/logs.
No raw capabilities exposed.
No arbitrary execution from background images or crab links.
```

---

## 11. Recommended first prompt for next session

Use something like:

```text
We are continuing CrabLink Tauri Streaming Creator Studio work. The person cutout and background replacement are now working. The next priority is to stabilize the compositor and add saved local scene presets / source controls according to STREAM_BLUEPRINT.MD. Do not touch backend wallet/ledger logic. Do not replace the stream page from scratch. Provide full paste-ready files only, no downloadable artifacts.
```

Then attach a fresh `CODEBUNDLE_TAURI_APP.md`.

---

## 12. Bottom line

This session was a major product breakthrough.

Before this session, streaming was mostly a backend-paid stream-lite proof with a rough creator page. After this session, CrabLink now has the start of a real Creator Studio:

```text
polished stream page
camera compositor
person cutout
background replacement
background image support
idle/professional splash
local-only effect boundaries
backend truth boundaries preserved
```

Next session should not chase backend complexity. The best next move is:

```text
1. Stabilize current compositor.
2. Save/load local scene presets.
3. Add camera framing controls.
4. Add screen + webcam thumbnail.
5. Polish Go Live flow.
6. Re-run two-app paid smoke with the composited background frame.
```

The guiding rule remains:

```text
Make streaming feel amazing without weakening RustyOnions truth boundaries.
```


### END NOTE - MAY 19 2026 - 20:35 CST


### BEGIN NOTE - MAY 20 2026 - 10:15 CST

Absolutely. This is the right checkpoint to **lock the stream Creator Studio UX proof**, avoid over-polishing it right now, and move into the other creator media pages. The latest CrabLink Tauri bundle confirms the app now has the relevant page families present for this next phase: stream, music, podcast, video, shared API clients, Tauri command bridge files, shared creator components, theme files, and the Tauri IDBs all in the current app tree. 

# Carryover Notes — CrabLink Tauri Media Pages Next Phase

## 0. Current checkpoint

We are stopping stream UX work for now because the core local Creator Studio proof is working extremely well.

The stream page now proves:

```text
camera preview
→ local canvas compositor
→ person cutout
→ background image replacement
→ solid background replacement
→ chroma key path still available
→ mirror preview
→ wide-shot zoom out
→ zoom in
→ X/Y framing
→ brightness / contrast / saturation
→ saved local scene presets
→ polished Go Live guide
```

This is a major milestone. The current stream implementation should now be considered a **locked local Creator Studio proof**, not something to keep expanding in the immediate next session.

The previous carryover already captured the core stream invariant: the current stream page owns local preview/presentation pieces, while stream descriptor/session/payment truth remains backend-derived. It also warned not to delete `StreamLocalPreview`, `StreamPublishFlow`, or `StreamSessionPanel`, and not to replace paid/wallet logic. 

## 1. What we accomplished in the streaming UX phase

### 1.1 We proved a real creator-style local compositor

The stream page moved from a backend test panel into something that feels like a real creator tool.

Working pieces:

```text
StreamLocalPreview.jsx
streamCompositor.js
StreamLookPanel.jsx
streamPersonSegmentation.js
streamStudioModel.js
StreamGoLivePanel.jsx
StreamPage.jsx
stream.css
```

Core product result:

```text
The creator can start a camera preview,
remove the real background,
place themselves over a selected background,
frame themselves,
adjust camera look,
save the scene,
and use a clearer Go Live flow.
```

This is much closer to a TikTok/Zoom/OBS-lite creator studio, but it still correctly avoids becoming an unsafe full execution/media backend.

### 1.2 Person cutout is working

We successfully moved beyond chroma-only green screen. The app can now detect the person, keep the subject, remove the real-world background, and draw a local selected background behind the creator.

Resolved issues:

```text
initial black-silhouette / inverted-mask problem
background circles overlaying active backgrounds
background image not coming through clearly
subject positioning/cropping limitations
zoom-out limitation
brightness/contrast/saturation not visibly changing in Tauri WebView
```

The final fix switched camera color adjustment to a more reliable pixel-processing path rather than depending only on canvas filter behavior.

### 1.3 Creator framing is working

Confirmed working:

```text
move subject up
move subject down
move subject left
move subject right
zoom in strongly
zoom out to a much wider shot
mirror preview
brightness
contrast
saturation
reset framing/look
```

This is good enough to stop here for now. More polish can come later after Music, Podcast, and Video are brought up to the same product quality level.

### 1.4 Saved local scenes are working

The scene preset system is now the right model:

```text
local preference only
stores look/framing/background/source hints
does not store wallet secrets
does not store receipts
does not store stream keys
does not store backend session truth
does not create ownership or entitlement truth
```

This exact local-preset pattern may be useful for Music and Podcast later, especially for creator branding presets, but do not prematurely generalize it until the Music page UX is upgraded.

### 1.5 Go Live UX is cleaner

The stream page now has a human-first “Go Live” panel that guides the creator through:

```text
start preview
set access
publish descriptor
open live controls
copy stream link
developer details
```

Important: this did **not** replace the explicit backend/wallet controls. It just organized them. The hidden/advanced controls remain visible when needed for auditability.

## 2. What remains parked for streaming

Do not work on these immediately unless explicitly restarting stream/backend work:

```text
production live video transport
WebRTC/HLS-style streaming
real multi-segment playback
backend stream durability
viewer live playback beyond stream-lite/latest segment proof
screen + webcam thumbnail compositor
full dual-mode podcast/video stream
creator-side stream analytics
live chat
stream moderation
recording/replay pipeline
audio mixing
camera device picker polish
green screen polish
background publishing as b3 assets
stream backend hardening
```

The correct current language remains:

```text
stream-lite proof
local Creator Studio compositor
bounded latest segment
paid live proof
composited frame
backend-derived stream/session/payment truth
```

Avoid claiming:

```text
production livestreaming
broadcast-grade transport
full WebRTC
full HLS
DRM
anti-rip
cache-based paid unlock
```

## 3. Current stream files to preserve

Do not casually rewrite these:

```text
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/StreamLocalPreview.jsx
apps/crablink-tauri/src/pages/stream/StreamLookPanel.jsx
apps/crablink-tauri/src/pages/stream/streamCompositor.js
apps/crablink-tauri/src/pages/stream/streamPersonSegmentation.js
apps/crablink-tauri/src/pages/stream/streamStudioModel.js
apps/crablink-tauri/src/pages/stream/StreamGoLivePanel.jsx
apps/crablink-tauri/src/pages/stream/StreamPricingPanel.jsx
apps/crablink-tauri/src/pages/stream/StreamPublishFlow.jsx
apps/crablink-tauri/src/pages/stream/StreamSessionPanel.jsx
apps/crablink-tauri/src/pages/stream/StreamMediaReadiness.jsx
apps/crablink-tauri/src/pages/stream/streamDraftModel.js
apps/crablink-tauri/src/pages/stream/stream.css
```

The current codebundle confirms these stream files exist in the Tauri app tree alongside the music, podcast, and video page families. 

## 4. Next phase: Music page first

The next session should begin with **crab://music**.

The current Tauri app tree includes:

```text
apps/crablink-tauri/src/pages/music/music.css
apps/crablink-tauri/src/pages/music/MusicDraft.jsx
apps/crablink-tauri/src/pages/music/MusicLinkedAssets.jsx
apps/crablink-tauri/src/pages/music/MusicPage.jsx
apps/crablink-tauri/src/pages/music/MusicRights.jsx
```

These files are present in the latest bundle. 

### 4.1 Goal for Music page

Bring the Music page up to the new Creator Studio quality bar, but do **not** build backend music publishing unless we explicitly decide to.

The first Music batch should likely be UI/UX and local manifest quality.

Target product concept:

```text
crab://music should feel like a creator music release workspace.
It should support drafting a song/single/album/beat/stem-pack.
It should have clean sections for metadata, local audio preview, cover art, linked assets, rights, access, credits, and manifest preview.
```

### 4.2 Music page should probably support these creator fields

Core release metadata:

```text
title
artist display
album / project title
track number
release type: single, album, beat, stem pack, loop, demo, live recording
genre
mood
language
explicit rating
description
tags
content warning
```

Audio/source fields:

```text
audio source mode
local audio file preview
audio crab URL / future b3 asset pointer
master audio crab URL
preview clip crab URL
stems crab URL
lyrics crab URL
cover image crab URL
music video crab URL
site context crab URL
```

Rights/economics:

```text
rights mode
license mode
payout mode
creator wallet display label
collaborators
splits placeholder
paid access mode
public preview mode
download permission
stream permission
remix permission
commercial use permission
```

Manifest/truth boundary:

```text
local draft only
no fake b3 CID
no fake audio asset CID
no fake receipt
no fake wallet event
no fake ownership truth
no direct ledger mutation
```

### 4.3 Best first Music patch

The best first patch should probably be one of these:

```text
Option A — Music UX shell polish:
  Replace MusicPage/MusicDraft/MusicRights/MusicLinkedAssets/music.css
  Keep it local-only
  Use shared CreatorWorkspaceLayout if already suitable
  Add a better right-side summary and truth panel

Option B — Local audio preview:
  Add MusicLocalPlaybackPreview.jsx
  Allow local audio file selection for preview only
  Extract duration/file facts
  Keep file bytes local
  Do not publish
  Do not create b3
  Do not create paid unlock

Option C — Music manifest model cleanup:
  Improve musicDraftModel.js or equivalent
  Normalize manifest shape toward uniform media assets
  Add linked asset stats
  Add readiness/completeness scoring
```

My recommendation: **start with Option B if the current Music page already has a decent form, otherwise start with Option A.** The local audio preview will make Music feel real quickly, similar to how camera preview made Stream feel real.

### 4.4 Music design principles

Music should not copy Stream’s camera UI. It should feel like a release/studio page.

Good UX direction:

```text
hero: release title / artist / release type
left column: local audio preview + cover art preview
main builder: metadata, track info, linked assets
right rail: release readiness, rights, access, truth boundary
developer mode: manifest JSON
```

Keep the language creator-friendly:

```text
Draft release
Preview audio
Add cover
Link lyrics
Set rights
Set access
Copy manifest
```

Avoid backend claims until routes exist:

```text
Do not say “published”
Do not say “minted”
Do not say “uploaded”
Do not show fake crab://music URLs
Do not show fake receipts
```

## 5. After Music: Podcast page

The current Podcast page is still more of a local manifest builder. The code explicitly says it is a local creator workspace before paid audio/stream publishing flows, and its invariants say no fake b3 CID, no fake manifest CID, no ROC mutation, and no backend publication claim. 

Current podcast files:

```text
apps/crablink-tauri/src/pages/podcast/podcast.css
apps/crablink-tauri/src/pages/podcast/PodcastDraft.jsx
apps/crablink-tauri/src/pages/podcast/PodcastPage.jsx
```

### 5.1 Podcast page goal

Bring Podcast to the same standard as Music, but with show/episode structure.

Target product concept:

```text
crab://podcast should support creating a podcast show or episode draft,
previewing/attaching local audio,
linking transcript/clips/cover art/site context,
setting rights/access,
and preparing a clean local manifest.
```

### 5.2 Podcast fields to support

Show/episode identity:

```text
show title
episode title
host display
cohosts / guests
season
episode number
episode type: audio episode, video podcast, live episode, clip, trailer
category
language
explicit rating
description
episode notes
transcript summary
tags
content warning
```

Linked assets:

```text
cover image crab URL
audio crab URL
video crab URL
live stream crab URL
transcript crab URL
clip crab URL
site context crab URL
sponsor/ad reference future
chapter markers future
```

Access/rights:

```text
public preview
paid episode
paid archive
subscriber-only future
creator-owned original
licensed/interview
payout mode
```

### 5.3 Podcast should probably reuse Music components later

Music and Podcast should converge around shared media primitives:

```text
LocalAudioPreview
CoverArtPreview
MediaLinkedAssets
RightsAndSplitsPanel
AccessPolicyPanel
ManifestTruthPanel
```

Do not generalize too early, but keep the structure similar enough that extraction is easy after both pages work.

## 6. After Music + Podcast: return to Video

The Video page is already more advanced than Music/Podcast in some ways. The current bundle shows `VideoDraft.jsx`, `VideoLocalPlaybackPreview.jsx`, `VideoPublishFlow.jsx`, `VideoRenditions.jsx`, `videoDraftModel.js`, `VideoPage.jsx`, and `video.css`. 

Video has already had paid publish/view work earlier, so do not break it while polishing.

### 6.1 Video next goals

After Music and Podcast:

```text
clean video UX to match new creator workspace standard
review local video preview
review paid publish flow
review content view after payment
clean receipt/hash overflow
ensure b3/video manifest shape stays honest
prepare for dual video + podcast streaming mode
```

### 6.2 Dual stream / podcast + video mode

This should come later, not next session.

The future goal:

```text
A creator can run a video stream and a podcast/audio stream together.
The system can produce a video-oriented stream experience and a podcast-oriented audio/show experience from the same creator session.
```

Possible future modes:

```text
video stream only
audio podcast live only
video + podcast dual mode
screen + webcam with podcast audio
camera stream with separate podcast companion
record video and extract audio/podcast asset later
```

Important truth boundary:

```text
The UI may coordinate two local presentation modes.
The backend still owns stream sessions, asset CIDs, receipts, paid access, and durable truth.
The wallet path still requires explicit prepare/quote → confirm → backend receipt.
No silent dual publishing.
No fake second asset.
No fake podcast transcript/audio CID.
```

## 7. Suggested next-session order

Start next session with this order:

```text
1. Review current Music files.
2. Decide whether to first polish Music UX shell or add local audio preview.
3. Patch Music page in one contained batch.
4. Run npm run build.
5. Smoke crab://music.
6. Then move to Podcast.
7. Only after Music and Podcast feel good, return to Video.
```

Best first concrete next task:

```text
“Please review the current Music page files and provide the first paste-ready batch to modernize crab://music, ideally adding local audio preview while preserving local-only manifest truth.”
```

## 8. Likely files for next Music patch

Expect to touch some subset of:

```text
apps/crablink-tauri/src/pages/music/MusicPage.jsx
apps/crablink-tauri/src/pages/music/MusicDraft.jsx
apps/crablink-tauri/src/pages/music/MusicLinkedAssets.jsx
apps/crablink-tauri/src/pages/music/MusicRights.jsx
apps/crablink-tauri/src/pages/music/music.css
```

Possible new file:

```text
apps/crablink-tauri/src/pages/music/MusicLocalPlaybackPreview.jsx
```

Possible model file if it exists or should be added:

```text
apps/crablink-tauri/src/pages/music/musicDraftModel.js
```

Need to verify the current bundle before generating exact code, because Music may not yet have a model file like Video does.

## 9. Likely files for Podcast patch after Music

Expect to touch:

```text
apps/crablink-tauri/src/pages/podcast/PodcastPage.jsx
apps/crablink-tauri/src/pages/podcast/PodcastDraft.jsx
apps/crablink-tauri/src/pages/podcast/podcast.css
```

Possible new files:

```text
apps/crablink-tauri/src/pages/podcast/PodcastLocalAudioPreview.jsx
apps/crablink-tauri/src/pages/podcast/podcastDraftModel.js
```

## 10. Commands for next session

From the Tauri app:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
npm run check:rust:mac-media
npm run tauri:dev:mac-media
```

For Music/Podcast-only UI work, `npm run build` is the main gate. Keep `check:rust:mac-media` green because the Tauri command bridge should remain healthy.

## 11. Rules to preserve across Music, Podcast, and Video

These are non-negotiable:

```text
Tauri-first.
Gateway compatibility first.
React owns display/user intent, not durable truth.
No wallet truth in React.
No fake balances.
No fake receipts.
No silent ROC spend.
No direct ledger mutation.
No backend publication claim from local draft pages.
No private keys/secrets/capabilities in React state/localStorage/URLs/logs.
No arbitrary code execution.
No creator-supplied player execution.
Cache/display state is not ownership/payment truth.
b3 hashes are canonical truth only after backend/storage/index path confirms them.
crab:// links are navigation/pointers, not authority.
```

For media specifically:

```text
Local preview is allowed.
Local file metadata is allowed.
Local playback is allowed.
Local draft manifest is allowed.
Backend-derived asset CIDs are required before claiming publication.
Backend-derived receipts are required before claiming paid access.
Large media should not be pushed through Tauri command results.
Future media should prefer range/segment/streaming paths.
```

## 12. Important product judgment

We should not keep chasing Stream polish right now. It is finally impressive and stable enough to leave alone.

The best use of the next session is:

```text
Music page → Podcast page → Video polish → dual media/streaming concept
```

This gives CrabLink a broader creator economy surface instead of one excellent Stream page surrounded by older placeholder-feeling media pages. Music and Podcast are also important because they will force us to clarify shared media concepts: cover art, local playback, linked assets, rights, access, credits, manifests, and future paid publishing.

## 13. Mental model for next session

Use this as the next-session north star:

```text
We are no longer proving that Tauri can do impressive camera UX.
We proved that.

Now we are raising the rest of CrabLink’s creator media pages to the same standard,
starting with Music, then Podcast, then returning to Video and future dual-mode media.
```

The next code batch should be **Music-first**, paste-ready, and conservative about backend truth.


### END NOTE - MAY 20 2026 - 10:15 CST



### BEGIN NOTE - MAY 20 2026 - 15:30 CST

Below are the carry-over notes for the next session.

# RustyOnions / CrabLink Tauri Carry-Over Notes

## Session focus completed: `crab://music` minting + paid listening loop

## Next session focus: `crab://podcasts` / podcast studio page

We successfully proved the **music page end-to-end loop**:

```text
crab://music
→ select local audio
→ fill metadata
→ reference optional cover art by crab:// image URL only
→ accept creator rights disclaimer
→ prepare music upload
→ explicit ROC hold
→ upload music bytes
→ mint crab://<hash>.music
→ open minted music asset as wallet B
→ quote paid content_view
→ pay ROC
→ unlock audio player only after backend receipt
```

This is now the exact pattern we should reuse for the podcast page.

---

# 1. Major outcome: Music now works

The important result is that music is no longer just a local draft page. It now supports the full internal ROC loop:

```text
prepare → explicit hold → upload → b3 music asset → paid content_view → player unlock
```

The successful minted test asset was:

```text
crab://b4077f988784d91f21a9b80ded4c671a6fdcd46c5f16fc81ee3bcf32390ff107.music
```

The asset page showed:

```text
Asset kind: music
Status: 200
Storage available: yes
Content type: audio/x-wav
Owner: passport:main:dev
Size: 1048558
Receipt references: paid storage receipt returned
```

Then visitor wallet B was able to pay for the music after wallet B was funded again.

The first payment failure was correct behavior:

```text
HTTP: 409
Reason: wallet_transfer_rejected
Message: svc-wallet rejected content view transfer
```

Cause:

```text
acct_visitor_b had 0 ROC after stack restart.
```

Fix:

```bash
cd /Users/mymac/Desktop/RustyOnions

curl -fsS -X POST http://127.0.0.1:8088/v1/issue \
  -H 'Authorization: Bearer dev' \
  -H "Idempotency-Key: dev-fund-visitor-b-$(date +%s)" \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "acct_visitor_b",
    "asset": "roc",
    "amount_minor": "1776",
    "memo": "dev fund visitor B for music content_view"
  }' \
  | jq .
```

After funding wallet B, the payment worked.

Important recurring gotcha:

```text
Whenever the dev wallet service / stack restarts, acct_visitor_b may need to be funded again.
```

---

# 2. Music frontend files touched / concepts added

## CrabLink Tauri music route

Main files involved:

```text
apps/crablink-tauri/src/pages/music/MusicPage.jsx
apps/crablink-tauri/src/pages/music/MusicLocalPlaybackPreview.jsx
apps/crablink-tauri/src/pages/music/MusicOwnershipDisclaimer.jsx
apps/crablink-tauri/src/pages/music/musicOwnershipDisclaimer.css
apps/crablink-tauri/src/pages/music/MusicPublishFlow.jsx
apps/crablink-tauri/src/pages/music/music.css
apps/crablink-tauri/src/shared/api/musicAssetClient.js
```

The music page now has these important pieces:

```text
1. Local audio preview
2. Metadata form
3. Linked asset references
4. Rights/access/payout draft form
5. Required creator ownership/rights disclaimer
6. Explicit prepare request
7. Explicit ROC hold review/send
8. Explicit music upload review/send
9. Auto-open returned crab://<hash>.music
```

The local preview is not backend truth. It is only a local object URL. The backend mint step is separate and explicit.

---

# 3. Music ownership disclaimer

We added a legal/rights gate before minting. This was important because music is high-risk for copyright infringement.

The creator must confirm:

```text
- They own or control the rights to the music.
- Samples, loops, beats, vocals, stems, and third-party material are cleared.
- They will not upload music that belongs to someone else.
- They understand disputed content can be reviewed, blocked, removed, or have payouts blocked.
- Metadata and creator claims are accurate.
- They enter a creator confirmation signature.
```

Important invariant:

```text
This is a required creator confirmation, not backend legal proof.
```

Manifest truth boundary says:

```text
local_ui_attestation_only: true
proves_legal_ownership: false
backend_verified: false
creates_copyright_registration: false
creates_wallet_authority: false
creates_asset_publication: false
creates_receipt: false
```

For podcasts, we should reuse this concept but adapt the wording:

```text
Podcast creator must confirm they have rights to:
- voice recordings
- guest permissions
- intro/outro music
- sound effects
- clips
- interview releases
- cover art references
- transcripts/show notes
```

---

# 4. Cover art rule for music

The user specifically requested:

```text
Do not upload cover art from the music page.
```

We followed that.

Music page rule:

```text
Cover art is a reference only:
crab://<64hex>.image
```

Music minting uploads only the selected audio file.

No cover image bytes are sent from `crab://music`.

The manifest has fields like:

```text
cover_image_crab_url
cover_image_upload_from_music_page: false
```

Carry this forward to podcasts:

```text
Podcast cover art should also be reference-only.
Use crab://<hash>.image.
Do not upload cover art inside the podcast page.
```

---

# 5. Music client-side paid mint flow

New client:

```text
apps/crablink-tauri/src/shared/api/musicAssetClient.js
```

Important routes it calls:

```text
POST /assets/music/prepare
POST /assets/music
```

It follows the same proven pattern as video.

Important paid proof headers:

```text
x-ron-paid-op
x-ron-paid-asset
x-ron-paid-estimate-minor
x-ron-wallet-txid
x-ron-wallet-receipt-hash
x-ron-wallet-from
x-ron-wallet-to
```

Music-specific metadata headers:

```text
x-ron-music-artist
x-ron-music-album
x-ron-music-release-type
x-ron-music-duration
x-ron-music-genre
x-ron-music-language
x-ron-cover-image-crab-url
x-ron-lyrics-crab-url
x-ron-music-bpm
x-ron-music-key
x-ron-music-explicit-rating
x-ron-music-rights-attested
```

Important detail:

```text
The frontend had to send x-ron-music-rights-attested=true during upload.
```

Backend requires that header.

For podcasts, likely analogous headers:

```text
x-ron-podcast-host
x-ron-podcast-show
x-ron-podcast-episode
x-ron-podcast-season
x-ron-podcast-duration
x-ron-podcast-language
x-ron-podcast-category
x-ron-podcast-explicit-rating
x-ron-podcast-cover-image-crab-url
x-ron-podcast-transcript-crab-url
x-ron-podcast-rights-attested
```

---

# 6. Tauri command bridge added music upload support

We updated the Tauri Rust command bridge so bounded audio bytes can upload through a fixed, allowlisted route.

Main file:

```text
apps/crablink-tauri/src-tauri/src/commands/assets.rs
```

Added command:

```rust
upload_music_asset_gateway
```

Registered in:

```text
apps/crablink-tauri/src-tauri/src/lib.rs
```

The command uses:

```text
POST /assets/music
```

Important bridge limits:

```text
MAX_IMAGE_UPLOAD_BYTES: 1 MiB
MAX_VIDEO_UPLOAD_BYTES: 10 MiB
MAX_MUSIC_UPLOAD_BYTES: 25 MiB
```

The music upload command requires:

```text
Content-Type must start with audio/
Paid proof headers must exist
Idempotency-Key must exist
```

Important invariant:

```text
No arbitrary URL upload.
No filesystem path is exposed.
No direct storage/index/wallet/ledger call from Tauri.
Gateway-first only.
```

For podcasts, we can likely either:

```text
A. Add upload_podcast_asset_gateway with a podcast-specific route and audio/* MIME requirement.
```

or reuse a generic audio bridge only if it remains fixed-route and typed. Better architecture is:

```text
upload_podcast_asset_gateway → /assets/podcast
```

because podcast and music have different manifests, rights language, and product pages.

---

# 7. Backend RustyOnions routes added for music

The original blocker was:

```text
POST /assets/music/prepare returned 404
```

Cause:

```text
svc-gateway and omnigate did not expose music routes yet.
```

We added music-lite backend routes by mirroring video-lite.

## svc-gateway

Main file:

```text
crates/svc-gateway/src/routes/product.rs
```

Added public routes:

```text
POST /assets/music/prepare → omnigate /v1/assets/music/prepare
POST /assets/music         → omnigate /v1/assets/music
```

Tests updated:

```text
crates/svc-gateway/tests/product_routes_proxy.rs
```

The proxy test passed:

```text
cargo test -p svc-gateway --test product_routes_proxy
```

Result:

```text
7 passed
```

## omnigate

Main file:

```text
crates/omnigate/src/routes/v1/assets.rs
```

Added internal routes:

```text
POST /v1/assets/music/prepare
POST /v1/assets/music
```

Added schemas:

```text
omnigate.music-asset-prepare.v1
omnigate.music-asset-upload.v1
```

Added request DTO:

```rust
MusicAssetPrepareRequest
```

Added handlers:

```rust
music_prepare
music_upload
```

Added helpers:

```rust
is_valid_audio_content_type
truthy_header
build_music_manifest
put_music_index_pointer
```

There was one compile failure:

```text
cannot find function put_music_index_pointer
```

Cause:

```text
The helper insertion was skipped because the script saw the call site token.
```

Fix:

```text
Inserted put_music_index_pointer before put_video_index_pointer.
```

After that, the music backend compiled and worked.

For podcasts, expect the same Rust pattern:

```text
svc-gateway:
  POST /assets/podcast/prepare
  POST /assets/podcast

omnigate:
  POST /v1/assets/podcast/prepare
  POST /v1/assets/podcast

response:
  crab://<hash>.podcast
```

---

# 8. Music backend behavior

## Prepare

`music_prepare` validates:

```text
bytes > 0
content_type starts with audio/
legal_attestation_accepted == true
```

It fetches paid storage estimate and returns:

```text
schema: omnigate.music-asset-prepare.v1
asset_kind: music
wallet_hold required
next.create_hold: /v1/wallet/hold
next.submit_upload: /v1/assets/music
```

Important warnings:

```text
music_lite_only_no_transcoding_no_drm_no_cover_art_upload
legal_attestation_is_creator_confirmation_not_backend_ownership_proof
```

## Upload

`music_upload` validates:

```text
Content-Type: audio/*
x-ron-music-rights-attested=true
paid proof headers
```

Then:

```text
1. Sends audio bytes to paid storage.
2. Gets asset CID.
3. Builds music manifest.
4. Stores manifest object.
5. Writes index pointer.
6. Returns crab://<hash>.music.
```

Music manifest includes:

```text
asset_kind: music
kind: music
metadata.title
metadata.description
metadata.tags
metadata.content_type
metadata.media_kind: music
metadata.music.artist_display
metadata.music.album_title
metadata.music.release_type
metadata.music.duration
metadata.music.genre
metadata.music.language
metadata.music.bpm
metadata.music.key_signature
metadata.music.explicit_rating
metadata.music.rights_attested
linked_assets.cover_image_crab_url
linked_assets.cover_image_upload_from_music_page: false
linked_assets.lyrics_crab_url
rights_policy.legal_attestation.accepted
rights_policy.legal_attestation.backend_verified: false
storage.raw_url
storage.paid: true
media.mode: music_lite
media.range_streaming: false
media.transcoding: false
media.drm: false
```

For podcasts, we should create:

```text
podcast_lite
range_streaming: false for MVP
transcoding: false
drm: false
episode_audio_upload only
cover art reference only
transcript reference only
```

---

# 9. Music paid playback frontend fix

After minting worked, the `.music` asset opened but had no player/pay gate.

Cause:

```text
AssetHydratedView.jsx still only treated image/video as media preview kinds and did not include music in paid content-view local route sets.
```

We patched:

```text
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
```

Key changes:

```javascript
const MEDIA_PREVIEW_KINDS = new Set(['image', 'video', 'music']);
const PAID_CONTENT_VIEW_KINDS = new Set(['article', 'post', 'comment', 'image', 'video', 'music', 'stream']);
```

Added:

```javascript
isMusicRoute: kind === 'music'
canPreviewMusic
music_preview_locked
```

Added a music playback card with:

```html
<audio controls preload="metadata">
```

Important behavior:

```text
Before payment:
  pay card appears
  music playback card is locked
  source URL hidden

After payment:
  backend receipt returned
  player appears
  audio bytes fetched from gateway
```

AssetContentViewAccess already had music support:

```text
Pay to listen to this music
Music view paid and unlocked
Music playback below is unlocked only after svc-gateway returned wallet receipt metadata
```

For podcasts, we need to add `podcast` to the same frontend sets and add a podcast playback card or share the music audio player card.

Potential sets after podcast:

```javascript
const MEDIA_PREVIEW_KINDS = new Set(['image', 'video', 'music', 'podcast']);
const PAID_CONTENT_VIEW_KINDS = new Set(['article', 'post', 'comment', 'image', 'video', 'music', 'podcast', 'stream']);
```

---

# 10. Tests / commands that worked

## CrabLink Tauri

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri

npm run build
npm run tauri:dev:mac-media
```

User runs Tauri from:

```text
/Users/mymac/Desktop/crablink/apps/crablink-tauri
```

With media profile:

```bash
npm run tauri:dev:mac-media
```

## RustyOnions

After patches:

```bash
cd /Users/mymac/Desktop/RustyOnions

cargo fmt -p omnigate
cargo fmt -p svc-gateway

cargo test -p svc-gateway --test product_routes_proxy
cargo check -p omnigate --all-targets
cargo check -p svc-gateway --all-targets
```

Gateway test passed:

```text
7 passed
```

Music prepare smoke after stack restart:

```bash
curl -i -X POST http://127.0.0.1:8090/assets/music/prepare \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' \
  -H 'Idempotency-Key: music-prepare-smoke-1' \
  --data '{
    "bytes": 1024,
    "payer_account": "acct_dev",
    "owner_passport_subject": "passport:main:dev",
    "content_type": "audio/mpeg",
    "title": "Music route smoke",
    "artist_display": "CrabLink Test",
    "legal_attestation_accepted": true,
    "client_idempotency_key": "music-prepare-smoke-1"
  }'
```

Expected:

```text
200
schema: omnigate.music-asset-prepare.v1
```

---

# 11. Important architectural invariants preserved

Music work stayed consistent with RustyOnions / CrabLink doctrine:

```text
Tauri is the primary client.
Gateway-first only.
React owns display and user intent, not backend truth.
No silent ROC spend.
No fake balances.
No fake receipts.
No fake b3 CIDs.
No direct wallet/ledger mutation from UI.
svc-wallet owns wallet mutation.
ron-ledger owns economic truth.
omnigate coordinates product route hydration and publish flows.
svc-gateway is the public route boundary.
Storage stores by b3/content ID.
crab:// is navigation, not authority.
Cache never unlocks paid content alone.
Receipt cache is display-only.
```

Music-specific invariants:

```text
Local preview is not publication.
Local preview does not unlock paid content.
Audio upload is explicit.
Music prepare does not create a CID.
Music upload requires paid proof.
Music upload requires rights attestation.
Cover art is reference-only.
No cover art upload from music page.
No transcoding claim.
No DRM/anti-rip claim.
No backend legal ownership proof claim.
```

---

# 12. Next session: Podcast page direction

The next natural page is:

```text
crab://podcasts
```

The podcast page should not be just a duplicate of music. It should feel like a **Podcast Studio** with a small set of impressive, practical audio controls.

The user specifically wants something like the streaming studio, but for podcasts / streaming audio:

```text
- microphone / local audio recording feel
- gain knob
- maybe noise gate
- maybe a few other knobs
- not too much clutter
- modern/impressive
```

Recommended MVP direction:

```text
Podcast Studio Workspace
```

Core sections:

```text
1. Episode draft metadata
2. Local audio preview / recording source panel
3. Podcast Studio controls
4. Guest / host / show metadata
5. Rights / guest permission disclaimer
6. Linked references
7. Paid podcast mint flow
8. Paid podcast playback after content_view receipt
```

---

# 13. Podcast should reuse music’s proven loop

Podcast page should mirror music technically:

```text
Podcast local audio file / recording
→ metadata
→ rights/guest attestation
→ prepare
→ ROC hold
→ upload
→ crab://<hash>.podcast
→ visitor pays content_view
→ audio player unlocks
```

Backend should mirror music-lite:

```text
svc-gateway:
  POST /assets/podcast/prepare
  POST /assets/podcast

omnigate:
  POST /v1/assets/podcast/prepare
  POST /v1/assets/podcast
```

Tauri bridge:

```text
upload_podcast_asset_gateway
```

Client:

```text
podcastAssetClient.js
```

Page files likely:

```text
apps/crablink-tauri/src/pages/podcast/PodcastPage.jsx
apps/crablink-tauri/src/pages/podcast/PodcastDraft.jsx
apps/crablink-tauri/src/pages/podcast/PodcastStudio.jsx
apps/crablink-tauri/src/pages/podcast/PodcastOwnershipDisclaimer.jsx
apps/crablink-tauri/src/pages/podcast/PodcastPublishFlow.jsx
apps/crablink-tauri/src/pages/podcast/podcast.css
apps/crablink-tauri/src/shared/api/podcastAssetClient.js
```

Depending on existing route naming, it may be singular `podcast` or plural `podcasts`. The visible route should probably be:

```text
crab://podcasts
```

Minted asset URL should probably be:

```text
crab://<hash>.podcast
```

Use plural for the studio route and singular for the asset kind.

---

# 14. Podcast metadata fields

Recommended podcast draft fields:

```text
Episode title
Show title
Host / creator display
Guest names
Season number
Episode number
Description
Show notes
Category
Language
Duration
Explicit rating
Tags
Cover image crab URL
Transcript crab URL
Chapters crab URL
Clip/source references
Site/show page crab URL
Access mode
Payout mode
Rights mode
License mode
```

Podcast-specific linked assets:

```text
cover_image_crab_url       // reference-only
transcript_crab_url        // future .article or .transcript asset
chapters_crab_url          // future JSON/text asset
show_page_crab_url         // named site or creator page
music_intro_crab_url       // optional music reference
music_outro_crab_url       // optional music reference
video_episode_crab_url     // optional video companion
```

Do not upload cover art in podcast page.

---

# 15. Podcast rights / legal disclaimer

Podcast attestation should be separate from music’s wording.

Creator should confirm:

```text
I own or control the rights to this episode audio.
I have permission from all speakers/guests whose voices appear.
Any intro/outro music, sound effects, clips, or third-party media are cleared.
I will not upload private conversations without consent.
I will not impersonate someone or upload deceptive AI voice clones.
The title, show name, guest names, collaborators, rights, and payout claims are accurate.
I understand CrabLink may remove, block, review, or freeze payout routing for disputed content.
```

Truth boundary:

```text
Local attestation only.
Does not prove legal ownership.
Does not prove guest release.
Does not create publication.
Does not create receipt.
Does not create payout authority.
Backend policy may still review/reject.
```

---

# 16. Podcast Studio UX idea

The podcast page should impress people, but not become overcomplicated.

Recommended “Podcast Studio” controls:

```text
Input gain
Noise gate
Compressor / voice leveler
Monitor volume
Playback speed for review
```

Possibly also:

```text
Mic test meter
Silence detector
Room tone indicator
Clipping warning
```

Avoid too many controls. Suggested MVP knobs:

```text
Gain
Noise gate
Voice leveler
Monitor
```

## How to implement safely in frontend

Use Web Audio API locally:

```text
MediaStream from microphone or selected audio file
AudioContext
GainNode
DynamicsCompressorNode
AnalyserNode
optional AudioWorklet or ScriptProcessor for gate-like behavior
```

Important limitation:

```text
Frontend audio effects are local preview/recording UX only.
Backend truth is still the uploaded audio bytes and b3 hash.
```

If we do local recording later:

```text
Use MediaRecorder.
Generate Blob.
Preview locally.
Then explicit podcast prepare/hold/upload.
```

No raw mic streams should silently upload.

No background recording.

No auto-mint.

No hidden ROC spend.

## Suggested studio controls in UI

```text
Gain
Range: 0.5x to 2.0x
Purpose: raise/lower mic input.

Noise gate
Range: off / low / medium / high
Purpose: reduce background noise when not speaking.
Implementation can be honest and simple: threshold-based gain reduction.

Voice leveler
Range: off / gentle / strong
Purpose: make speech sound more even.
Use DynamicsCompressorNode.

Monitor
Range: 0% to 100%
Purpose: local preview monitor volume.
```

UI should include honest labels:

```text
Local preview processing only
Not mastering
Not DRM
Not backend proof
```

---

# 17. Podcast backend design

Podcast should not be shoehorned into music or video.

Add dedicated asset kind:

```text
podcast
```

Routes:

```text
POST /assets/podcast/prepare
POST /assets/podcast
GET /b3/<hash>.podcast
GET /crab/resolve?url=crab://<hash>.podcast
POST /content/view/quote
POST /content/view/pay
```

Prepare request DTO:

```rust
PodcastAssetPrepareRequest {
    bytes: u64,
    payer_account: Option<String>,
    owner_passport_subject: Option<String>,
    content_type: Option<String>,
    expected_asset_cid: Option<String>,
    title: Option<String>,
    description: Option<String>,
    tags: Vec<String>,
    show_title: Option<String>,
    host_display: Option<String>,
    guest_display: Option<String>,
    season_number: Option<String>,
    episode_number: Option<String>,
    duration: Option<String>,
    category: Option<String>,
    language: Option<String>,
    explicit_rating: Option<String>,
    cover_image_crab_url: Option<String>,
    transcript_crab_url: Option<String>,
    chapters_crab_url: Option<String>,
    show_page_crab_url: Option<String>,
    rights_mode: Option<String>,
    license_mode: Option<String>,
    guest_permission_attested: bool,
    legal_attestation_accepted: bool,
    client_idempotency_key: Option<String>,
}
```

Validation:

```text
bytes > 0
content_type starts with audio/
legal_attestation_accepted == true
guest_permission_attested == true
```

Upload requires:

```text
x-ron-podcast-rights-attested=true
x-ron-podcast-guest-permission-attested=true
Content-Type: audio/*
paid proof headers
```

Response:

```text
crab://<hash>.podcast
```

Manifest:

```text
asset_kind: podcast
kind: podcast
metadata.media_kind: podcast
metadata.podcast.show_title
metadata.podcast.host_display
metadata.podcast.guest_display
metadata.podcast.season_number
metadata.podcast.episode_number
metadata.podcast.duration
metadata.podcast.category
metadata.podcast.language
metadata.podcast.explicit_rating
linked_assets.cover_image_crab_url
linked_assets.transcript_crab_url
linked_assets.chapters_crab_url
linked_assets.show_page_crab_url
storage.paid: true
media.mode: podcast_lite
media.range_streaming: false
media.transcoding: false
media.drm: false
```

---

# 18. Podcast paid playback frontend

Asset page needs to include podcast after backend exists.

Likely changes:

```javascript
const MEDIA_PREVIEW_KINDS = new Set(['image', 'video', 'music', 'podcast']);

const PAID_CONTENT_VIEW_KINDS = new Set([
  'article',
  'post',
  'comment',
  'image',
  'video',
  'music',
  'podcast',
  'stream',
]);
```

Add `podcast` copy to `AssetContentViewAccess.jsx`:

```text
Pay to listen to this podcast
Podcast view paid and unlocked
Podcast playback below is unlocked only after svc-gateway returned wallet receipt metadata for content_view.
```

Add podcast playback card to `AssetHydratedView.jsx`, likely sharing the audio player shell used for music:

```html
<audio controls preload="metadata">
```

Before payment:

```text
Podcast playback is locked until paid.
```

After payment:

```text
Backend receipt unlocked this podcast episode.
```

---

# 19. Important difference between podcast and stream

Do not confuse:

```text
stream = live / session / real-time-ish
podcast = recorded episode / audio asset
```

Podcast can use uploaded audio bytes like music.

Streaming uses stream descriptors and eventually segment/live routes.

Podcast Studio may feel like streaming studio, but its MVP should mint a recorded/uploaded audio episode.

For now:

```text
Podcast is audio asset publication.
Not live stream.
Not sidecar required.
Not background service.
```

Later, podcast could support:

```text
live-to-recorded podcast
dual stream + podcast capture
scheduled episodes
RSS-like feed
creator show pages
```

But MVP should prove:

```text
podcast audio mint + paid listen
```

---

# 20. Suggested next session order

Best next session workflow:

## Step 1: Inspect current podcast route

Check whether route exists:

```text
crab://podcasts
crab://podcast
```

Find files in Tauri bundle:

```text
apps/crablink-tauri/src/pages/podcast/*
apps/crablink-tauri/src/pages/podcasts/*
router route registration
builtin route registry
```

If no page exists, create the page using music page as model.

## Step 2: Build frontend local Podcast Studio page first

Create:

```text
PodcastPage.jsx
PodcastStudio.jsx
PodcastDraft.jsx
PodcastOwnershipDisclaimer.jsx
PodcastPublishFlow.jsx
podcast.css
podcastAssetClient.js
```

Initial frontend can include:

```text
local audio file preview
studio controls UI
rights disclaimer
metadata
publish flow scaffold
```

## Step 3: Wire Tauri audio upload command

Add:

```rust
upload_podcast_asset_gateway
```

in:

```text
apps/crablink-tauri/src-tauri/src/commands/assets.rs
apps/crablink-tauri/src-tauri/src/lib.rs
```

Use fixed route:

```text
/assets/podcast
```

Limit:

```text
MAX_PODCAST_UPLOAD_BYTES could be 50 MiB for MVP
```

But be careful with command bridge memory. Since current music bridge passes bytes through command, 50 MiB may be high. Safer MVP:

```text
25 MiB or 50 MiB
```

If we choose 50 MiB, call it temporary bounded MVP, not final podcast media path.

## Step 4: Add backend podcast routes

RustyOnions:

```text
crates/svc-gateway/src/routes/product.rs
crates/svc-gateway/tests/product_routes_proxy.rs
crates/omnigate/src/routes/v1/assets.rs
```

Mirror music, not video.

## Step 5: Add asset page paid podcast playback

Patch:

```text
AssetContentViewAccess.jsx
AssetHydratedView.jsx
asset.css if needed
```

## Step 6: Test full loop

```text
Creator wallet:
  crab://podcasts
  select/upload audio
  accept disclaimer
  prepare
  hold ROC
  upload
  get crab://<hash>.podcast

Visitor wallet B:
  fund acct_visitor_b if needed
  open crab://<hash>.podcast
  quote/pay content_view
  audio player unlocks
```

---

# 21. Commands to keep ready for next session

## Run Tauri

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run tauri:dev:mac-media
```

## Build Tauri frontend

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
```

## Fund wallet B

```bash
cd /Users/mymac/Desktop/RustyOnions

curl -fsS -X POST http://127.0.0.1:8088/v1/issue \
  -H 'Authorization: Bearer dev' \
  -H "Idempotency-Key: dev-fund-visitor-b-$(date +%s)" \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "acct_visitor_b",
    "asset": "roc",
    "amount_minor": "1776",
    "memo": "dev fund visitor B for podcast content_view"
  }' \
  | jq .
```

## Check wallet B

```bash
curl -fsS "http://127.0.0.1:8088/v1/balance?account=acct_visitor_b&asset=roc" \
  -H 'Authorization: Bearer dev' \
  | jq .
```

## Backend checks after podcast route patch

```bash
cd /Users/mymac/Desktop/RustyOnions

cargo fmt -p omnigate
cargo fmt -p svc-gateway

cargo test -p svc-gateway --test product_routes_proxy
cargo check -p omnigate --all-targets
cargo check -p svc-gateway --all-targets
```

---

# 22. Podcast page should feel impressive

Design goal:

```text
A creator opens crab://podcasts and immediately feels like CrabLink is a real native creator studio.
```

Not too much clutter. Suggested visual blocks:

```text
Hero:
  Podcast Studio
  Record, polish, mint, and monetize podcast episodes through CrabLink.

Studio panel:
  local file or mic source
  waveform/meter
  gain knob
  noise gate toggle/slider
  voice leveler
  monitor volume

Episode draft:
  show title
  episode title
  host
  guest
  category
  description
  show notes
  tags

Linked assets:
  cover image crab URL
  transcript crab URL
  show page crab URL

Rights gate:
  voice/guest/music/clip permissions

Mint flow:
  prepare
  hold
  upload
```

Potential premium touches:

```text
Animated level meter
Clipping warning
“Room noise” indicator
“Voice ready” badge
Studio preset chips:
  Clean Voice
  Warm Interview
  Noise Reduction
```

But do not overbuild.

A good MVP set:

```text
Gain
Noise Gate
Voice Leveler
Monitor
```

---

# 23. Strong warning for next session

Do not make podcast use music routes.

Avoid shortcuts like:

```text
/assets/music/prepare for podcasts
crab://<hash>.music for podcast episodes
```

That would make the flow work technically but corrupt the product model.

Podcast must have:

```text
asset_kind: podcast
crab://<hash>.podcast
```

---

# 24. Where we are now

Current status:

```text
Chrome proof: still preserved.
Tauri app: primary.
Video: minted and paid playback proven.
Stream UX: locked for now, backend live playback remains future work.
Music: minted and paid playback proven.
Podcast: next target.
```

Music is now the best reference implementation for podcast because it includes:

```text
audio upload
rights disclaimer
cover-art reference-only policy
paid listen flow
audio player unlock
backend music-lite routes
```

For podcast, use music as the main template and add the podcast studio UX layer.


### END NOTE - MAY 20 2026 - 15:30 CST



### BEGIN NOTE - MAY 20 2026 - 18:50 CST

## Carry-over notes for next session: Podcast Studio polish + knobs

We got the hard proof working: **recorded podcast → paid mint → new `.podcast` crab URL → wallet B quote/pay → backend receipt → audio playback works**. The final missing playback issue was not ROC/wallet related; it was a Tauri/WebView raw-audio loading problem. The working fix was the bounded Tauri gateway byte bridge plus the paid audio player path, so podcast playback now follows the same invariant as music: **audio bytes only appear after backend `content_view` receipt**.

Working proof URL from this session:

```text
crab://9b1eb2a9c2caa171d6d36e2d8e91039645cd7ec5c962c313e61c99117dfca92f.podcast
```

The podcast route owner is `PodcastPage.jsx`, which already frames the page as a workspace combining studio recording, metadata, rights attestation, and paid minting, with explicit invariants against fake CIDs, fake receipts, silent ROC spend, and treating local recording as backend stream truth.  The current stream page is the style reference: it is organized around local preview, look controls, access/pricing, publish, and session controls, with backend truth reserved for stream URL, receipts, stream IDs, and viewer entitlement. 

## What is working now

The backend podcast-lite lane is green enough for MVP recorded podcasts. We added/validated:

* `POST /assets/podcast/prepare`
* `POST /assets/podcast`
* `.podcast` asset resolution
* `svc-index` acceptance of `podcast` manifest pointers
* `content_view` quote/pay for podcast
* fail-closed behavior so future podcast uploads should not claim success if the manifest pointer fails
* wallet B paid listen flow
* shared paid audio handling with a Tauri byte bridge for `.music` / `.podcast`

The current podcast page already has rights/guest attestation before minting. The attestation explicitly requires creator ownership/permission, guest permission, third-party material clearance, no private conversations, no impersonation/voice clone, accurate metadata, review acknowledgement, and a creator signature before minting can proceed. 

The current local studio manifest already records the important audio-processing values: preamp dB, input gain, noise gate enabled, noise gate threshold, gate reduction, voice leveler enabled, and monitor enabled.  This is important for the next session because we should make those controls visually impressive and confirm they truly affect the recorded output.

## Do not redo next session

Do **not** start over on podcast backend routes unless a fresh codebundle proves the patches are missing. Do **not** replace the paid content-view model. Do **not** fake playback unlock from local receipt cache. Do **not** add hidden auto-renewal or automatic ROC spend.

The important proof already happened: wallet B paid and listened. Next session should be mostly **frontend UX + audio-control validation**, not backend route work.

## Main next-session goal

Make `crab://podcast` feel like a serious podcast studio, visually closer to the stream studio screenshot:

* large polished studio stage
* professional “ON AIR” / “READY” / “RECORDED” status
* waveform or live meter area
* modern transport controls
* sleek mixer knobs
* right-side checklist like the stream “Preview. Publish. Launch.” panel
* clear paid minting status
* rights checklist folded into the workflow instead of feeling like a form dump
* developer JSON hidden behind a deliberate developer tab

The target should be something that “wows” people before we even explain the backend.

## Proposed UI direction

Use the stream page as the model. The stream page has a strong left “stage” and a right rail with workflow cards. For podcasts, mirror that shape:

```text
Podcast Studio
├─ Left: large studio console
│  ├─ waveform / meter / cover art placeholder
│  ├─ ON AIR badge
│  ├─ record / stop / play / clear controls
│  ├─ selected file / recording facts
│  └─ local playback preview
├─ Right rail
│  ├─ Podcast launch checklist
│  │  1. Mic or file ready
│  │  2. Record / upload episode
│  │  3. Rights + guest attestation
│  │  4. Prepare + hold ROC
│  │  5. Publish podcast asset
│  ├─ Mixer / voice chain summary
│  └─ publish proof / latest crab URL
└─ Lower tabs
   ├─ Episode details
   ├─ Linked assets
   ├─ Rights
   ├─ Publish
   └─ Developer
```

The current `PodcastPage.jsx` route already imports `PodcastDraft`, `PodcastStudio`, `PodcastOwnershipDisclaimer`, `PodcastPublishFlow`, and `JsonPreview`, so the next patch can reorganize those existing pieces rather than rebuilding from scratch. 

## Files to work on next

Primary frontend files:

```text
apps/crablink-tauri/src/pages/podcast/PodcastPage.jsx
apps/crablink-tauri/src/pages/podcast/PodcastStudio.jsx
apps/crablink-tauri/src/pages/podcast/podcast.css
apps/crablink-tauri/src/pages/podcast/PodcastDraft.jsx
apps/crablink-tauri/src/pages/podcast/PodcastPublishFlow.jsx
apps/crablink-tauri/src/pages/podcast/PodcastOwnershipDisclaimer.jsx
```

Reference stream files for design patterns:

```text
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/StreamLocalPreview.jsx
apps/crablink-tauri/src/pages/stream/StreamGoLivePanel.jsx
apps/crablink-tauri/src/pages/stream/StreamLookPanel.jsx
apps/crablink-tauri/src/pages/stream/StreamPricingPanel.jsx
apps/crablink-tauri/src/pages/stream/stream.css
```

The stream route is already organized around preview, saved scenes, look controls, access, publish, and session controls, so reuse its product structure for podcast rather than inventing a totally separate UI pattern. 

## Knob/control validation plan

Next session should verify that each knob is not just cosmetic:

1. **Preamp** should change the signal before the gate.
2. **Gain** should change the recorded signal after preamp.
3. **Noise gate threshold** should visibly open/close the gate.
4. **Noise gate reduction** should affect how quiet the closed-gate background becomes.
5. **Voice leveler** should affect compression/smoothing.
6. **Monitor volume** should only affect local monitoring, not secretly change wallet/backend truth.
7. Add a clear **meter and status readout**: `Input`, `Processed`, `Peak`, `Gate Open/Closed`, `Clipping`.

A very good next patch would add a small diagnostics strip to the mixer:

```text
Input: -32 dB
Processed: -18 dB
Gate: Open
Peak: 72%
Clipping: No
Recorder: audio/mp4; codecs=mp4a.40.2
```

This makes it obvious to the creator that knobs are alive.

## Audio format note

The successful paid podcast proof used an `audio/mp4; codecs=mp4a.40.2` recording. It played only after the Tauri byte bridge fix. Do not assume direct `<audio src="/o/...">` is reliable in Tauri. The safe model is now:

```text
backend content_view receipt
→ AssetPaidAudioPlayer
→ Tauri fetch_asset_bytes_gateway command
→ bounded gateway /o/b3:<hash> fetch
→ typed Blob URL
→ audio controls
```

If playback ever regresses, debug that bridge first before touching wallet or content-view.

## Pay every X minutes feature

We still want this, but it should be a deliberate backend entitlement window, not a local timer.

Correct model:

```text
creator sets price + interval
viewer requests quote
viewer explicitly pays
backend returns receipt + paid_until
UI plays until paid_until
UI prompts renewal before expiry
playback stops/pauses when expired
```

For live podcast streams, reuse the stream interval model. For pre-recorded podcasts, add a future access policy such as:

```json
{
  "mode": "paid_listen_window",
  "price_roc": "5",
  "window_seconds": 300,
  "renewal": "manual_explicit"
}
```

No hidden recurring spend. No automatic wallet transfer. No local-only unlock.

## Suggested next patch order

First patch: **UI-only polish**.

* Rework `PodcastPage.jsx` layout to a stream-style studio shell.
* Rework `PodcastStudio.jsx` into a modern console with a big stage, transport controls, live meters, and sleek knobs.
* Rework `podcast.css` heavily.
* Do not touch backend yet.

Second patch: **knob verification**.

* Add processed/output meter.
* Add gate open/closed state.
* Confirm recorded output uses processed graph, not raw mic.
* Make monitor clearly separate from recorded volume.

Third patch: **podcast access policy UI**.

* Add “One-time listen” vs “Pay every X minutes” controls as UI draft/policy only.
* Do not wire recurring backend charges yet.
* Label it as future/backend-required unless backend support exists.

Fourth patch: **live podcast stream mode**.

* Reuse stream live/session components.
* Podcast live stream should not be a fake podcast recording.
* It should either launch a stream session or link to a stream asset.

## Run commands for next session

From Tauri app:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri

npm run build
npm run check:rust:mac-media
npm run tauri:dev:mac-media
```

If backend was restarted, remember wallet B may need funding again before paid listen tests.

## Manual test script for the next instance

1. Open `crab://podcast`.
2. Start mic.
3. Move preamp/gain/gate knobs and confirm meter changes.
4. Record 5 seconds.
5. Stop recording.
6. Confirm local playback works.
7. Fill title/show/host fields.
8. Complete rights attestation.
9. Prepare / hold ROC / publish.
10. Copy new `.podcast` URL.
11. Switch to `passport:main:visitor-b`.
12. Open the new `.podcast`.
13. Quote/pay.
14. Confirm player appears and audio plays.
15. Confirm no audio source appears before payment.

## Hard invariants to preserve

* CrabLink Tauri is the client, not backend truth.
* React never creates wallet truth, balances, receipts, CIDs, or index pointers.
* Paid playback only after backend `content_view` receipt.
* Receipt cache is display-only.
* Podcast recording is local until paid upload succeeds.
* Live podcast is not the same thing as recorded podcast minting.
* No silent ROC spend.
* No hidden renewal.
* No fake “ON AIR” backend claim unless stream/session backend confirms it.
* Keep gateway-first: Tauri → configured svc-gateway → omnigate/services.
* Keep Chrome proof green, but build the polished podcast product for Tauri first.

## One-sentence mission for next session

Turn the now-working podcast proof into a **sleek, professional Podcast Studio** that visually matches the stream page, proves the audio knobs are real, preserves explicit paid mint/listen invariants, and sets up future pay-per-window podcast listening without adding hidden spend.


### END NOTE - MAY 20 2026 - 18:50 CST


### BEGIN NOTE - MAY 25 2026 - 07:30 CST

Yes — after paid E2E chat works, I would **pause feature expansion and do a consolidation/tidy pass across the major pages**.

The reason is that by then CrabLink Tauri will have proven a very important product loop:

```text
creator creates thing → viewer pays/acts → backend receipt → UI updates honestly
```

At that point, the risk shifts from “can we build the features?” to “does the product feel coherent enough to impress people?”

## Immediate next after paid E2E chat

First, lock in chat properly:

```text
1. Paid chat quote → explicit confirm → svc-wallet transfer/receipt → message appears.
2. Wallet B can pay to send.
3. Creator receives the configured share.
4. Receipt chip displays on the message.
5. Refresh does not duplicate spend.
6. Paid send fails cleanly when wallet B has no ROC.
7. Free chat still works.
8. Paid chat still never creates fake messages or fake receipts.
9. Tests pass for omnigate, svc-gateway, and Tauri build.
```

Once that is green, chat becomes the reusable “social/value” primitive.

## Then yes: tidy the other pages

I would do a **Tauri product polish sprint** across the pages we have already built rather than immediately adding another huge primitive.

Priority order:

```text
1. Podcast
2. Music
3. Video
4. Stream
5. Image
6. Post / Comment / Article
7. Site
8. Profile / Passport drawer
9. Library / Receipts
10. Home
```

The goal should not be to redesign everything from scratch. The goal should be to make every page feel like it belongs to the same polished native app.

For each page, I would standardize:

```text
- compact hero / no wasted vertical space
- modern creator panel
- consistent publish flow
- consistent prepare → confirm → backend receipt language
- consistent receipt chips
- consistent paid unlock UI
- consistent empty states
- consistent developer/truth boundary drawer
- no raw JSON in the main user path
- mobile-ish responsive behavior
- light/dark theme sanity
```

The podcast page is a good model now: it started bulky, then we tightened it into something much more professional. Chat should become another style reference.

## Best “tidy sprint” structure

I would not do it page-by-page randomly. I would create a shared UI/product layer so each cleanup makes the next cleanup faster.

Something like:

```text
Batch A — shared page primitives
- shared CompactHero / RouteHeader
- shared PaidActionPanel
- shared ReceiptChip
- shared BackendTruthStrip
- shared CreatorControlCard
- shared PublishStepRail
- shared DeveloperDrawer
- shared EmptyState variants

Batch B — media page polish
- podcast
- music
- video
- stream

Batch C — text/social page polish
- post
- comment
- article
- chat

Batch D — identity/site polish
- profile
- site
- library
- receipts
- home
```

This would prevent the app from becoming a pile of cool but inconsistent pages.

## What comes after the tidy sprint?

After tidy/polish, I’d move into **integration primitives** — features that make the app feel like a network, not just separate asset pages.

The next big systems should be:

```text
1. Attach chat to stream/podcast/video/site/profile
2. Unified creator dashboard
3. Unified library and receipt history
4. Better local catalog/search
5. Creator pages with all assets, chats, and paid offerings
6. Site builder improvements using existing assets and chats
7. Full backend stream/media transport later
```

The most exciting immediate one is probably:

```text
Attach chat rooms to streams and podcasts.
```

That gives you:

```text
crab://<stream>.stream + live/paid chat
crab://<podcast>.podcast + episode discussion / paid questions
crab://@creator + community chat
crab://<site> + site chat
```

That makes chat portable, which is exactly the CrabLink idea.

## Larger roadmap after that

I would think of the next phases like this:

### Phase 1 — Finish value loop proof

```text
chat paid E2E
paid messages
receipts
creator share
wallet B testing
```

### Phase 2 — Product consolidation

```text
tidy pages
shared UI components
consistent publish/unlock/receipt UX
remove bulky sections
make everything feel native and sleek
```

### Phase 3 — Composition

```text
attach chat to streams/podcasts/sites/profiles
creator dashboard
asset library
receipt center
reference graph surfaces
```

### Phase 4 — Media completion

```text
finish full backend streaming for stream page
finish live podcast streaming
improve video/music/podcast playback robustness
range/segment transport
bounded media pipeline
```

### Phase 5 — Creator economy

```text
creator pages
paid questions
paid comments
paid site visits
paid chat rooms
creator analytics
reward planning
payout summaries
```

### Phase 6 — Advanced future systems

```text
OAP
sidecar/local node
offline cache hardening
facet sandbox
programmable pages
QuickChain only later
```

I would **not** jump to QuickChain, external settlement, heavy sandboxed facets, or full streaming immediately after paid chat. The better move is to make the existing app feel undeniable first.

## My recommendation

After paid E2E chat is proven, do this:

```text
1. Chat paid E2E green.
2. Chat attached to stream/podcast as a read/send panel.
3. One full CrabLink Tauri polish sprint across pages.
4. Creator dashboard / library / receipts consolidation.
5. Then return to full backend stream + podcast live media transport.
```

That order gives you the strongest demo: people can mint media, pay for media, chat around media, see receipts, and understand CrabLink as a real creator-native internet client — before we go deeper into harder transport and protocol work.


### END NOTE - MAY 25 2026 - 07:30 CST



### BEGIN NOTE - MAY 25 2026 - 08:05 CST

Absolutely — redundancy is good. The important separation is:

```text
Storage redundancy:
  Many nodes may store and serve the same bytes by b3.

Ownership / mint uniqueness:
  Only one canonical ownership mint should exist for the same canonical content, unless the original owner explicitly authorizes a derivative, remix, co-owner, license, or repost model.
```

The b3 hash proves **what the content is**. It does not, by itself, prove **who owns it**. Ownership has to be a separate backend truth claim bound to passport, wallet, receipt, timestamp, and policy.

Below are carryover notes for the next session.

---

# RustyOnions / CrabLink Carryover Notes — Chat, Ownership Uniqueness, Redundancy, and Page Tidying

## 1. Current session checkpoint

We are working on the **CrabLink Tauri app** as the primary client. Chrome remains proof/companion only.

Recent focus:

```text
1. Podcast page polish
2. Global zoom-out fix
3. Chat blueprint
4. Chat frontend shell
5. Chat backend route proof
6. Chat frontend/backend integration
7. Ownership uniqueness discussion
```

The app is now able to zoom out much farther globally. The previous minimum zoom was around `75%`; it was patched to allow down to about `40%`, giving much more overview across all pages.

The chat page now visually works and looks good when zoomed out. It has:

```text
Room tab
Builder tab
Publish tab
Moderation tab
Developer tab
iMessage-style bubbles
emoji shortcut row
paid-message price display
truth boundary panel
local preview messages
backend route integration in progress
```

The user likes the direction.

---

## 2. Important new ownership doctrine

The user emphasized a key point:

```text
Redundancy is good.
Different nodes should be able to store and serve the same data like a CDN.
But multiple users should not be able to mint the same thing as if they own it.
```

This is now an important RustyOnions/CrabLink invariant.

### Correct model

```text
b3 address:
  proves content identity/integrity

storage replication:
  many nodes may store and serve the same bytes

mint / ownership claim:
  should be unique and policy-governed

receipt:
  proves a backend-accepted economic action

passport:
  proves identity/capability

wallet:
  proves economic authority
```

The b3 hash is not the ownership record by itself. It is the content identity. Ownership must be recorded by backend-controlled mint/claim/index state.

---

## 3. Redundancy vs theft prevention

We need to preserve both:

### A. Redundancy / CDN behavior

Allowed and desirable:

```text
Node A stores b3:abc...
Node B stores b3:abc...
Node C stores b3:abc...
Any node may serve the exact bytes for b3:abc...
```

This improves:

```text
availability
performance
resilience
cache locality
offline support
future distributed hosting
```

Serving bytes is not the same thing as owning or minting the content.

### B. Unique mint / ownership behavior

Not allowed:

```text
User A mints image/music/video/podcast/post as crab://abc.image
User B uploads the exact same bytes later
User B gets a new ownership mint claiming they created/own crab://abc.image
```

Correct behavior:

```text
Same canonical bytes/content already minted:
  backend detects existing b3/content identity

If same owner / same idempotency:
  return existing mint/receipt/idempotent result

If different user:
  reject duplicate ownership mint
  or return "already minted by another creator"
  do not create new ownership claim
  do not create fake receipt
  do not create new asset pointer
```

Potential response:

```json
{
  "ok": false,
  "reason": "content_already_minted",
  "cid": "b3:<hash>",
  "existingOwner": "crab://@creator",
  "canStoreReplica": true,
  "canMintOwnership": false
}
```

This gives the network redundancy while preventing theft-by-remint.

---

## 4. Important nuance: exact duplicate vs derivative

We need a clear policy distinction.

### Exact duplicate

```text
same canonical bytes
same canonical manifest
same asset kind
same b3
```

Should not allow a second independent ownership mint.

### Authorized repost / mirror

A user may be allowed to mirror/store/serve the same content, but not claim authorship.

Possible future model:

```text
mirror record
pin record
library save
playlist add
site embed
reference graph edge
```

These are not ownership mints.

### Derivative / remix

A derivative can be a new asset only if it has new canonical bytes or a new canonical manifest and it references the original.

Example:

```json
{
  "schema": "crablink.derivative.v1",
  "kind": "music",
  "source": "crab://<original>.music",
  "creator": "crab://@remixer",
  "licenseProof": "...",
  "derivativeBytes": "b3:<new_hash>"
}
```

This produces a new b3 because the content/manifest is genuinely different.

### Co-ownership / collaborator mint

Possible future model:

```text
original creator explicitly grants co-owner
or creator mints with collaborators at initial publish
or backend accepts signed authorization
```

Do not implement casually. Needs policy and receipts.

---

## 5. Strong invariant to add to future notes/blueprints

Use this exact invariant later:

```text
A b3 content ID may be redundantly stored and served by many nodes, but the canonical ownership mint for a given content identity is unique unless backend policy verifies an authorized derivative, mirror, repost, license, or co-owner relationship. Storage replication is not ownership. Cache possession is not ownership. Re-uploading bytes is not ownership. CrabLink must never create a second independent ownership claim for already-minted canonical content.
```

Short version:

```text
Many replicas. One canonical mint.
```

Or:

```text
Replicate bytes, not ownership.
```

---

## 6. Collision / duplicate hash rule

Earlier discussion covered birthday/collision concerns.

Final rule should be:

```text
Same b3 + same canonical bytes:
  valid duplicate storage / dedupe / replica

Same b3 + different bytes:
  reject, quarantine, audit

Same canonical content + different user attempting new mint:
  reject duplicate ownership claim unless authorized by policy
```

These are different protections:

```text
collision protection:
  prevents integrity violations

duplicate mint protection:
  prevents ownership theft
```

Both are needed.

Suggested fail-closed reasons:

```text
hash_collision_or_integrity_violation
content_already_minted
duplicate_ownership_claim
unauthorized_remint
canonical_content_conflict
```

---

## 7. Static content addressing model

For static files:

```text
image
music
video
podcast audio file
article manifest
post manifest
comment manifest
site manifest
```

The b3 address is calculated from canonical bytes.

Examples:

```text
raw file:
  b3 = BLAKE3(file bytes)

canonical JSON/manifest:
  b3 = BLAKE3(canonical manifest bytes)
```

Public URL:

```text
crab://<64 lowercase hex>.<kind>
```

Examples:

```text
crab://<hash>.image
crab://<hash>.music
crab://<hash>.video
crab://<hash>.podcast
crab://<hash>.post
crab://<hash>.chat
```

Important:

```text
b3 gives content identity
mint registry gives ownership
receipt gives economic proof
index pointer gives navigation/discovery
```

Do not conflate these.

---

## 8. Dynamic content addressing model

For dynamic/live content:

```text
streaming
live podcast
chat
live comments
event feeds
```

Do not hash the moving live state as one permanent object.

Correct model:

```text
b3 hash:
  immutable manifest / session descriptor / snapshot / segment / archive

backend session:
  live moving state

receipt:
  paid access proof

event log:
  message/segment/update sequence
```

### Stream

```text
crab://<stream_manifest_hash>.stream
```

Manifest contains:

```text
creator
title
description
pricing
start time
chat room pointer
stream policy
archive policy
```

Live data is delivered through backend session routes:

```text
latest frame
latest segment
viewer receipt state
stream status
```

Finalized segments/archives can each get their own b3.

### Live podcast

```text
crab://<podcast_live_manifest_hash>.podcast-live
```

Live audio is session state.

Final archived episode becomes:

```text
crab://<episode_hash>.podcast
```

or:

```text
crab://<archive_hash>.music / .audio / .podcast
```

depending on final asset kind.

### Chat

```text
crab://<chat_manifest_hash>.chat
```

Manifest defines:

```text
owner
price per message
expiry
mods
blocklist policy
attached stream/podcast/profile/site
payout split
```

Live messages are backend event state.

Later finalized transcript windows can become:

```text
crab://<chatlog_snapshot_hash>.chatlog
```

---

## 9. Current chat implementation status

### Frontend status

CrabLink Tauri has a chat page at:

```text
crab://chat
```

It includes:

```text
Room tab
Builder tab
Publish tab
Moderation tab
Developer tab
emoji shortcuts
local preview bubbles
backend status chips
truth boundary panel
backend route preparation UI
```

The UI looks good at 40% zoom and already feels like a polished chat product.

### Backend status

RustyOnions backend chat route proof is green.

Proven tests:

```text
cargo test -p omnigate --test chat_routes
cargo test -p svc-gateway --test product_routes_proxy
```

Both passed.

Proven backend behaviors:

```text
omnigate /v1/chat/resolve works
omnigate /v1/chat/prepare works
omnigate /v1/chat create works
free room message send/list/latest works
paid message quote works without spending
paid message send fails closed
moderation routes exist but fail closed
gateway /chat routes proxy correctly
```

Important boundary:

```text
Current backend chat is in-memory dev proof only.
No durable chat storage.
No b3 chat descriptor mint.
No index pointer.
No svc-mailbox fanout.
No paid ROC transfer.
No backend receipt.
No real moderation authority.
```

---

## 10. Next chat work: finish paid E2E

The next major implementation target should be:

```text
paid chat message E2E
```

Desired flow:

```text
1. Creator creates paid chat room.
2. Visitor B opens/resolves chat room.
3. Visitor B types message.
4. Backend quotes message price.
5. UI shows explicit confirmation.
6. Visitor B confirms.
7. Backend routes payment through svc-wallet.
8. ron-ledger records truth.
9. svc-wallet returns receipt.
10. Backend accepts message only after receipt.
11. Message appears with receipt chip.
12. Creator balance increases.
13. Visitor B balance decreases.
14. Refresh does not duplicate spend.
15. Failed payment does not create message.
```

Invariants:

```text
no fake paid message
no fake receipt
no silent spend
no optimistic paid message that looks confirmed
no duplicate spend on refresh
no paid unlock from cache
```

Need to decide whether paid chat is:

```text
transfer directly to room owner
hold/capture operation
split payout later
```

Given current project doctrine, use the existing safe wallet front-door and receipt model. Do not mutate ledger from omnigate or gateway directly.

---

## 11. After paid chat E2E: attach chat to other pages

Once paid chat works, next integration should be:

```text
attach chat rooms to stream/podcast/video/site/profile
```

Priority:

```text
1. Stream page chat panel
2. Podcast page episode discussion / live podcast chat
3. Creator profile community chat
4. Site chat
5. Video/music watch/listen room
```

This makes chat portable, which fits CrabLink’s core concept.

Important:

```text
chat attachment is a pointer/reference
not ownership transfer
not a second mint
not a fake backend route
```

Stream/podcast descriptors can include:

```json
{
  "chat": {
    "enabled": true,
    "room": "crab://<hash>.chat",
    "mode": "paid_per_message"
  }
}
```

---

## 12. Existing media status to remember

Podcast page:

```text
audio file store/mint/pay/listen is proven
local podcast studio UI is polished
mic recording works locally
knobs visually/functionally improved
live podcast backend streaming is not proven yet
```

Stream page:

```text
stream-lite latest-frame/latest-segment proof exists
roughly 1fps paid viewing has been shown
full production backend streaming is not proven yet
```

Need to return later to:

```text
finish full backend stream media transport
finish live podcast backend streaming
support proper audio/video segments
support bounded range/segment delivery
support paid live access intervals
support chat alongside live media
```

---

## 13. Page tidying plan after chat paid E2E

After paid chat works, pause new feature expansion and tidy the app.

Goal:

```text
make CrabLink Tauri feel like one cohesive premium app
```

Do not rewrite from scratch. Standardize and polish existing pages.

Priority order:

```text
1. Chat
2. Podcast
3. Music
4. Video
5. Stream
6. Image
7. Post / Comment / Article
8. Site
9. Profile / Passport drawer
10. Library / Receipts
11. Home
```

Shared polish goals:

```text
compact headers
less wasted vertical space
consistent tabs
consistent dark/light theme
consistent prepare/confirm/receipt flow
consistent truth boundary cards
consistent receipt chips
consistent paid unlock panels
consistent backend status chips
developer JSON hidden by default
no raw backend JSON in main user path
better empty states
better mobile/narrow layouts
no overflow or receipt hash spilling
```

We already saw this pattern on podcast:

```text
big hero looked good but wasted space
removed unnecessary hero/principle strip
compacted studio
compacted mixer knobs
kept premium feel
```

Apply this same discipline across other pages.

---

## 14. Shared UI primitives to consider

Before tidying every page manually, create reusable components.

Potential shared components:

```text
CompactRouteHeader
TruthBoundaryCard
BackendStatusRail
ReceiptChip
PaidActionPanel
PublishStepRail
CreatorControlCard
DeveloperDrawer
EmptyState
RouteTabs
AssetSummaryCard
CopyableCrabUrl
```

This would reduce duplicate page-specific CSS and help the app feel coherent.

Important:

```text
React components display state only.
They do not invent backend truth.
They do not create receipts.
They do not mutate wallet state.
```

---

## 15. Ownership uniqueness implementation idea for future backend

Need a backend ownership registry or mint index.

Possible conceptual services/owners:

```text
svc-storage:
  stores bytes by b3
  dedupes exact bytes
  rejects same b3/different bytes

svc-index:
  maps crab URLs / names / asset pages
  can check existing content pointers

omnigate:
  coordinates product route/publish flow
  refuses duplicate ownership mint if already claimed

svc-wallet:
  records paid mint/ownership action through wallet path

ron-ledger:
  durable economic truth

future ownership registry:
  canonical map from content identity to owner/passport/wallet/receipt
```

Potential canonical record:

```json
{
  "schema": "ron.ownership-claim.v1",
  "contentId": "b3:<hash>",
  "kind": "image",
  "canonicalAssetUrl": "crab://<hash>.image",
  "ownerPassport": "crab://@creator",
  "ownerAccount": "acct_creator",
  "mintReceipt": "b3:<receipt_hash>",
  "mintedAt": "2026-...",
  "policy": {
    "duplicatesAllowed": false,
    "mirrorsAllowed": true,
    "derivativesRequireSource": true
  }
}
```

Backend check on publish:

```text
1. Compute canonical content b3 server-side.
2. Check storage for byte identity.
3. Check ownership registry for existing mint.
4. If none:
     allow mint through explicit paid flow.
5. If exists and same owner/idempotency:
     return existing result.
6. If exists and different user:
     reject duplicate ownership claim.
7. If derivative requested:
     require source reference/license/authorization policy.
8. If mirror requested:
     allow mirror/pin/reference, not ownership mint.
```

This should become a future IDB or blueprint section.

Possible filename:

```text
OWNERSHIP_AND_DEDUP_BLUEPRINT.MD
```

---

## 16. Avoid a dangerous misconception

Do not make the rule:

```text
reject all duplicate hashes
```

That would break CDN/dedupe.

Correct rule:

```text
allow duplicate storage/replication of same bytes
reject duplicate ownership mint by unauthorized user
reject same hash with different bytes
```

This preserves:

```text
content-addressed storage
dedupe
multi-node redundancy
creator ownership
anti-theft behavior
```

---

## 17. Near-term next session plan

Start next session here:

```text
Goal:
  finish chat page paid E2E or continue from current chat frontend/backend integration checkpoint
```

Recommended order:

```text
1. Verify current chat frontend build still passes.
2. Run RustyOnions dev stack with new chat routes.
3. In CrabLink Tauri:
     open crab://chat
     set Builder send mode = Free
     Publish → Prepare
     Publish → Create backend room
     send free message
     refresh backend messages
4. Then test paid room:
     set send mode = Paid Per Message
     create room
     type message
     quote paid message
     confirm paid send remains locked
5. Implement paid message confirm flow.
6. Add backend paid-send route wiring through svc-wallet.
7. Add receipt chip display.
8. Add no-double-spend/idempotency test.
9. Add wallet B insufficient ROC failure test.
10. Re-run omnigate/gateway/frontend checks.
```

Target tests:

```text
cargo test -p omnigate --test chat_routes
cargo test -p svc-gateway --test product_routes_proxy
npm run build
npm run check:rust:mac-media
npm run tauri:dev:mac-media
```

Possible new tests later:

```text
cargo test -p omnigate --test chat_paid_messages
cargo test -p svc-gateway --test chat_paid_routes_proxy
```

---

## 18. Demo vision after next few passes

The impressive near-term demo should be:

```text
Creator creates a paid chat room.
Visitor B pays ROC to send a message.
Message appears with receipt chip.
Creator balance increases.
Chat can attach to stream or podcast.
Podcast audio can be minted and paid-listened.
Stream page can show stream-lite paid viewing.
All pages look sleek and consistent.
Zoom out works enough to demo full pages.
```

This creates a strong “next internet” demo:

```text
content-addressed assets
portable identity
internal ROC value plane
paid access
paid social actions
creator ownership
portable chats
redundant storage without ownership theft
```

Do not jump to QuickChain, external settlement, public bridge, or arbitrary executable facets yet.

---

## 19. One-line direction

The next phase should be:

```text
Finish paid chat E2E, then consolidate the app into a polished creator-native Tauri product, while adding ownership uniqueness so redundancy cannot become theft.
```


### END NOTE - MAY 25 2025 - 08:05 CST


### BEGIN NOTE - MAY 26 2026 - 12:45 CST

Absolutely, this is a good stopping point for chat. We proved the important pieces, and the remaining issues are now clear enough to carry forward cleanly.

The current codebase has the right chat architecture direction: the Tauri bundle includes the chat page/component/client stack, and the Rust bundle shows `omnigate` chat now targets b3-addressed descriptors, in-memory live messages, and paid send through `svc-wallet`.   The frontend still has the five chat tabs defined as Room, Builder, Publish, Moderation, and Developer, which makes sense for `crab://chat` studio mode but is too much for a generated room link.  The generic `AssetPage` also still exposes a lot of “gateway truth boundary” developer framing, which is exactly the kind of clutter we should start removing or hiding behind advanced/debug modes. 

## Carryover notes for next session

### Current milestone status

We made major progress on CrabLink Tauri chat.

The working canonical chatroom test link is:

```text
crab://802419d6f56a8fe41a667a45a5097dd877fce7c5b8ed91666f09cea56ca2dd00.chat
```

What is proven:

```text
crab://chat studio page exists and looks modern.
Builder / Publish / Room / Moderation / Developer tabs exist.
Free backend chat room worked earlier.
Paid in-memory chat room worked earlier.
Wallet B paid Wallet A successfully earlier.
ROC deducted correctly when the backend room was loaded in memory.
Receipt / tx / ledger chips appeared on the message.
Canonical .chat route now routes to ChatPage instead of generic AssetPage.
Local preview no longer falsely says “Message removed by moderator.”
Enter-to-send behavior was added.
Shift+Enter remains the intended newline behavior.
```

What is not finished:

```text
Generated crab://<b3hash>.chat link is still stuck resolving.
Because the canonical room is not hydrated, messages typed there are local preview only.
No ROC transfer occurs from the generated canonical link yet.
The UI correctly says local preview / resolving, but the actual paid backend room is not loaded.
Live messages are still not durable and are not descriptor hash truth.
No durable message log yet.
No svc-mailbox fanout yet.
No real moderation authority yet.
```

The key distinction to remember:

```text
crab://<b3hash>.chat = canonical b3 descriptor for the room.
Live messages = still backend event state / in-memory proof for now.
Paid message receipt = economic truth for a paid message send.
Receipt display cache = display-only, not entitlement or ledger truth.
```

## Chat page note for when we return

Do **not** start over. The chat page is mostly good from a UX/UI standpoint. The next chat-specific fix should be targeted.

### Chat bug 1: canonical room resolve is not hydrating

Observed behavior:

```text
Opening crab://802419d6f56a8fe41a667a45a5097dd877fce7c5b8ed91666f09cea56ca2dd00.chat
routes to ChatPage correctly,
but page remains stuck in “Resolving canonical chat descriptor.”
```

Consequences:

```text
backendRoomPage is empty
backendReady is false
typed messages become local preview only
no quote call happens
no paid send happens
no ROC transfer happens
```

Next chat backend/frontend debugging path:

```text
1. Curl the route directly:
   GET /chat/resolve?url=crab://<hash>.chat

2. Confirm whether svc-gateway forwards /chat/resolve correctly.

3. Confirm whether omnigate resolves:
   a. in-memory room by room_id
   b. canonical b3 CID by fetching descriptor from svc-storage

4. Confirm svc-storage can read the stored descriptor at /o/b3:<hash> or whatever path the current storage API expects.

5. Add bounded timeout / structured problem JSON for canonical chat resolve.
   The UI should not spin forever.

6. If storage fetch path is wrong, patch omnigate chat.rs to use the same storage read/write path style used by image/music/podcast assets.
```

Expected successful behavior after that patch:

```text
Open crab://<64hex>.chat
→ ChatPage loads
→ /chat/resolve returns room descriptor
→ backendReady becomes true
→ button changes to “Quote paid message · 1 ROC”
→ Enter creates quote
→ Confirm paid send moves ROC through svc-wallet
→ message appears only after backend receipt
```

### Chat bug 2: canonical room view should not show all studio tabs

The current tab set is appropriate for `crab://chat` builder/studio mode:

```text
Room
Builder
Publish
Moderation
Developer
```

But for a generated room URL like:

```text
crab://<64hex>.chat
```

the UI should be visitor-first and much cleaner.

Recommended behavior:

```text
crab://chat
  Full studio mode:
    Room
    Builder
    Publish
    Moderation
    Developer

crab://<64hex>.chat
  Public room mode:
    Room only by default
    Info / Receipts maybe as subtle secondary panels
    Hide Builder and Publish
    Hide Developer unless debug mode is enabled
    Show Moderation only if backend says viewer can moderate
```

Creator/admin controls should be conditional:

```text
If current passport/wallet matches room owner:
  show “Manage room” button
  expand Builder / Publish / Moderation controls behind a drawer or settings panel

If visitor:
  show only chat, pinned note, price, receipt chips, and room info
```

This will make generated room links feel like real user-facing pages instead of internal tooling.

### Chat bug 3: local preview should not feel like sent chat

Local preview is useful while resolving, but it should be visually distinct.

Recommended copy:

```text
Local preview only
Not sent
Would cost 1 ROC
No receipt
```

Avoid language that implies moderation or backend rejection unless the backend actually returned a moderation response.

## Next major session direction: UI cleanup and UX enhancement

The next session should shift away from deep chat plumbing and focus on **CrabLink Tauri product polish**.

The pages that feel close to done:

```text
Chat page: mostly done visually; needs canonical resolve + simplified generated-room mode.
Podcast page: mostly done UX; knobs/polish can come later.
Stream page: impressive UX; backend streaming remains future, but current studio polish is strong.
Music page: functional paid listen path already proven.
```

The pages that need cleanup:

```text
Image page
Generic Asset page
Post page
Comment page
Article page
Video page if still cluttered
Site builder / site view if developer panels are too exposed
Library / receipts drawer if hashes overflow
Any route that still shows large truth-boundary/dev JSON blocks by default
```

The codebundle confirms the Tauri app currently has a broad set of product pages, including image, asset, article, comment, music, podcast, stream, site, and many future facet routes.  The next work should not add more routes; it should make existing routes feel like real product surfaces.

## UX doctrine for cleanup

Use this rule:

```text
Default view = creator/user product experience.
Advanced view = optional power-user settings.
Developer view = hidden behind debug/advanced toggle.
```

Every page should answer these questions first:

```text
What is this?
Who owns it?
What can I do with it?
Does it cost ROC?
What will happen when I click the main button?
Where is my receipt or link after success?
```

It should not lead with:

```text
route owner
schema name
gateway truth boundary
raw JSON
correlation ID
debug status
giant hash blocks
internal warnings
```

Those can still exist, but behind:

```text
Advanced
Details
Developer JSON
Diagnostics
```

## Two minting modes

This is important and should become a common design pattern across assets.

### 1. Simple Mint

For normal users and demos.

Fields should be minimal:

```text
Upload / choose file
Title
Optional description
Price / access mode
Mint button
```

Simple flow:

```text
Choose file
Preview
Prepare
Show price
Confirm mint
Backend stores bytes
Backend returns crab://<hash>.<kind>
Show copy link + open link
```

Simple Mint should hide:

```text
raw descriptor JSON
advanced metadata
manual payout bps
rendition internals
policy objects
correlation IDs
receipt internals
gateway route details
```

But it must still preserve invariants:

```text
no silent spend
show ROC quote before mint
backend receipt only
b3 hash comes from backend/storage
no fake ownership
no local-only mint truth
```

### 2. Advanced Mint

For creators, power users, and debugging.

Fields can include:

```text
Title
Description
Tags
Alt text
License
Creator display
Owner passport
Owner wallet account
Payout split
Attached chat room
Attached site/profile
Visibility
Access mode
Price
Renditions
Content warnings
Policy notes
Developer JSON preview
Receipt details after success
```

Advanced Mint should still be safe:

```text
React owns display/user intent only.
No private keys.
No local wallet authority.
No fake receipt.
No direct ledger mutation.
Backend truth only.
```

## Suggested component pattern

Create reusable mint layout components eventually:

```text
MintModeToggle.jsx
SimpleMintPanel.jsx
AdvancedMintPanel.jsx
MintQuoteCard.jsx
MintSuccessCard.jsx
ReceiptChip.jsx
CrabUrlCopyCard.jsx
DeveloperDetailsDisclosure.jsx
```

Use them across:

```text
Image
Music
Podcast
Video
Post
Article
Comment
Stream descriptor publish
Chat room descriptor publish
```

The goal is consistency: every minting lane should feel like the same product, not a different prototype.

## Specific cleanup targets

### Image page

This should probably be first.

Current issue:

```text
Image page likely still has too much dev/boundary clutter.
It should become the cleanest example of Simple Mint vs Advanced Mint.
```

Target default layout:

```text
Hero: Mint an image
Left: upload/dropzone + preview
Right: Simple Mint card
Bottom: recent result / copy link / open asset
Advanced collapsed below
```

Simple fields:

```text
Image file
Title
Description optional
Price/access
Mint button
```

Advanced fields:

```text
Tags
Alt text
Payout split
Owner wallet
Owner passport
Rendition options
Attach chat
Attach to site/profile
Developer JSON
```

### Generic Asset page

Current `AssetPage` is useful but developer-heavy. It explicitly presents itself as a typed asset route and truth-boundary reader, which is correct internally but too technical for normal users. 

Better default:

```text
Asset title / kind
Preview if available
Owner / creator
Price or access status
Open / Pay / Copy link
Receipt chips
```

Move to Advanced:

```text
CID
hash
manifest JSON
gateway status
correlation ID
route owner
diagnostics
problem JSON
```

### Post / Comment / Article pages

Use the same simple/advanced split.

Simple:

```text
Write text
Title if article
Price/access
Publish
Copy crab URL
```

Advanced:

```text
Tags
Parent thread/comment link
Attached site/profile
Payout split
Developer JSON
Policy details
```

### Video / Music / Podcast pages

These are mostly functional, but later they should share a unified media publish pattern:

```text
Upload media
Preview locally
Set title/description
Set paid access
Mint
Open paid view
```

Advanced:

```text
Renditions
Duration metadata
Cover art
Transcript/lyrics
Attached chat
License
Payout split
Developer JSON
```

Podcast page note:

```text
Podcast file mint/play is proven.
Live podcast backend streaming is not proven yet.
Do not imply live podcast transport is production-ready.
```

Stream page note:

```text
Stream studio UX is strong.
Bounded stream-lite latest-frame/segment paid viewing was proven around ~1fps.
Full backend streaming remains future work.
Do not over-polish backend streaming claims yet.
```

## Recommended next session plan

Start with a Tauri-only UX cleanup batch. Avoid backend changes unless a route is directly blocking UI proof.

### Batch 1: Image page simple/advanced mint

Files likely needed:

```text
apps/crablink-tauri/src/pages/image/ImagePage.jsx
apps/crablink-tauri/src/pages/image/ImageCreate.jsx
apps/crablink-tauri/src/pages/image/ImagePreview.jsx
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
apps/crablink-tauri/src/pages/image/ImageManifest.jsx
apps/crablink-tauri/src/pages/image/ImageRenditions.jsx
apps/crablink-tauri/src/pages/image/image.css
apps/crablink-tauri/src/pages/image/imageDraftModel.js
```

Goal:

```text
Make image minting feel like a consumer product.
Keep advanced settings available but collapsed.
Keep current paid upload/mint flow intact.
Do not break backend headers or paid proof flow.
```

### Batch 2: Generic Asset page cleanup

Files likely needed:

```text
apps/crablink-tauri/src/pages/asset/AssetPage.jsx
apps/crablink-tauri/src/pages/asset/AssetResolver.jsx
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/pages/asset/asset.css
```

Goal:

```text
Make asset pages reader/viewer-first.
Hide problem JSON and gateway internals behind Details.
Improve long hash wrapping.
Make paid access state obvious.
Make receipt chips attractive and compact.
```

### Batch 3: Text asset cleanup

Files likely needed:

```text
apps/crablink-tauri/src/pages/post/*
apps/crablink-tauri/src/pages/article/*
apps/crablink-tauri/src/pages/comment/*
```

Goal:

```text
Unified text publish UI.
Simple publish first.
Advanced metadata collapsed.
Receipt/link success card consistent.
```

### Batch 4: Shared UX primitives

After cleaning one or two pages manually, extract common components.

Possible shared components:

```text
ProductHero
SimpleAdvancedToggle
MintModeTabs
ReceiptProofStrip
CrabUrlSuccessCard
HashDetailDisclosure
TruthBoundaryDisclosure
```

Keep it lightweight; do not over-abstract before two pages prove the pattern.

## Testing gates for next session

Run Tauri checks after every batch:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
npm run check:rust:mac-media
npm run tauri:dev:mac-media
```

For backend-sensitive pages, also keep RustyOnions stack green:

```bash
cd /Users/mymac/Desktop/RustyOnions
cargo test -p omnigate --test chat_routes
cargo test -p svc-gateway --test product_routes_proxy
```

But for the next UI cleanup session, prefer frontend-only changes unless backend behavior is required.

## Non-negotiable invariants to preserve

```text
No fake ROC.
No fake receipts.
No silent spend.
No local unlock of paid content from cache alone.
No client-side ownership truth.
No direct ledger mutation outside svc-wallet.
No direct storage/index/wallet calls from Tauri React.
Gateway-first.
Tauri Rust remains native trust boundary.
React displays intent and backend truth only.
Receipt cache is display-only.
b3 hash is canonical truth for stored assets/descriptors.
crab:// links are navigation, not authority.
```

## Best immediate next action

Next session should begin with:

```text
“Let’s clean up the Image page and create Simple Mint / Advanced Mint mode.”
```

Ask for or use the freshest Tauri bundle, then patch the image page first. That will establish the design language we can reuse across asset, post, article, comment, video, music, and podcast pages.


### END NOTE - MAY 26 2026 - 12:45 CST



### BEGIN NOTE - MAY 26 2026 - 14:55 CST

Below are the carryover notes for the next session. These notes should be used as the starting point for implementing **automatic image rendition minting** in CrabLink Tauri.

# CrabLink Tauri Carryover Notes — Image Rendition Minting

## Current project state

We are continuing work on **CrabLink Tauri**, which is now the primary product/client layer. Chrome remains proof/companion/smoke surface, but major new UX/product work should target Tauri first.

The current Image page has been cleaned up into the desired **one-card Simple Mint UX**:

```text
Select image / preview surface
→ title
→ description
→ backend quote
→ explicit ROC confirmation
→ mint
→ returned crab:// URL
→ advanced drawer collapsed
```

This one-card Simple Mint layout is now the reference pattern for other page types later: video, music, podcast, post, article, comment, site, chat room descriptor, and stream descriptor.

The latest codebundle still shows the active Tauri image page lane, including `ImagePage.jsx`, `ImagePublishFlow.jsx`, `ImageRenditions.jsx`, `ImageManifest.jsx`, `imageDraftModel.js`, and `image.css`. The current bundle also confirms the Tauri image upload bridge is routed through `upload_image_asset_gateway`, a narrow Rust command that posts to `/assets/image` with bounded image bytes and paid proof headers. 

## Important correction from this session

Do **not** add payment splits or custom ROC price fields right now.

Older carryover notes mentioned payout split fields as possible advanced metadata, but the current direction is different: the UI cleanup is about moving clutter into Advanced drawers, not expanding economics. The current Image page should only use backend quote/hold/mint behavior. Payment splits and custom pricing are future features and should stay out of this batch.

Use this rule:

```text
Allowed now:
  tags
  alt text
  image use cases
  rendition preferences
  source/provenance notes
  rights hint
  manifest preview
  developer JSON

Not now:
  payment split UI
  custom ROC price UI
  local balance/receipt invention
  fake b3/rendition links
```

## What we accomplished in the Image page cleanup

The Image page was transformed from a developer-heavy form into a product-first Simple Mint page.

The desired simple UX is:

```text
One primary creator card
Preview/select image at top
Title and description under preview
Backend quote/confirm/mint controls below form
Advanced options collapsed
Developer JSON collapsed
```

This replaced the bad UX where the page had multiple screens worth of quote/hold/upload details visible. The current direction matches the Tauri migration principle that normal users should see product intent, while route truth, JSON, gateway status, and diagnostics stay behind details drawers. The notes already identify Image as the first cleanup target and say it should become the cleanest Simple Mint / Advanced Mint example. 

The Image page now has the right advanced concept:

```text
Advanced image options
  tags
  alt text
  source/provenance
  rights hint
  use cases
  rendition preferences
  manifest preview
  route truth
```

The important UX insight: the creator should **not** manually paste rendition URLs. Rendition links are backend results, not form inputs.

## Core idea for next session

The next step is to implement automatic image rendition minting.

The user wants this behavior:

```text
Creator uploads one source image
→ CrabLink automatically creates selected resized versions
→ original is minted as canonical .image
→ each generated rendition is minted as its own .image asset
→ main/original manifest links to all renditions
→ each rendition manifest links back to the original
→ embeds can automatically choose the best image for desktop/mobile/tablet/thumbnail/etc.
```

The user specifically mentioned:

```text
album cover
video thumbnail
film cover
desktop
mobile
tablet
thumbnail
possibly other use cases later
```

Important product model:

```text
album cover is not a new asset kind
video thumbnail is not a new asset kind
film cover is not a new asset kind
profile avatar is not a new asset kind
site banner is not a new asset kind

They are all use cases for canonical .image assets.
```

Every generated version should still be a real b3-backed image asset:

```text
original image  → b3:<hash> → crab://<hash>.image
desktop image   → b3:<hash> → crab://<hash>.image
tablet image    → b3:<hash> → crab://<hash>.image
mobile image    → b3:<hash> → crab://<hash>.image
thumbnail image → b3:<hash> → crab://<hash>.image
album cover     → b3:<hash> → crab://<hash>.image
video thumbnail → b3:<hash> → crab://<hash>.image
film cover      → b3:<hash> → crab://<hash>.image
```

## Important architecture boundary

This should not become a hidden multi-spend frontend trick.

Paid actions must remain explicit. The current Image route uses an explicit prepare → ROC hold → upload flow, and the existing Tauri bridge has a narrow command for raw image upload. The carryover notes confirm the command is intentionally fixed-route, bounded, requires paid proof headers, requires `image/*`, uses the configured gateway, and does not call storage/index/ledger directly. 

The risky shortcut would be:

```text
User clicks mint once
→ frontend silently uploads 5 images
→ same hold proof reused or multiple holds hidden
→ unclear receipts
→ unclear accounting
```

Do **not** do that.

The correct long-term model is a backend-supported image bundle flow:

```text
POST /assets/image/bundle/prepare
POST /assets/image/bundle
```

The frontend sends:

```text
original image bytes
requested rendition targets
use cases
title/description/tags/alt text
payer wallet
passport subject
```

The backend/gateway/wallet path returns:

```text
canonical original image asset
rendition group ID
rendition asset list
backend receipt/proof
manifest links
actual b3 CIDs
actual crab URLs
```

## Recommended implementation strategy

### Phase 0 — Inspect current code and clean dead pieces carefully

Start by confirming the current Image route imports only the new one-card components.

Run:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
grep -R "ImageCreate\|ImagePreview" -n src/pages/image src | cat
```

If `ImageCreate.jsx` and `ImagePreview.jsx` are no longer imported anywhere, delete them:

```bash
rm src/pages/image/ImageCreate.jsx
rm src/pages/image/ImagePreview.jsx
```

Be careful: do not delete files simply because they look old. Delete only after import search proves they are unused. The current codebundle still lists those files in the image directory, so this cleanup check should happen at the start of the next session. 

Also search for outdated manual rendition URL fields:

```bash
grep -R "canonicalImageCrabUrl\|desktopRenditionCrabUrl\|mobileRenditionCrabUrl\|thumbnailCrabUrl\|posterCrabUrl" -n src/pages/image src/shared | cat
```

Those fields should no longer be part of the normal Image advanced UX. If they remain in old components only, remove the old component. If they remain in the current draft model, replace them with `useCases` and `renditionTargets`.

### Phase 1 — Frontend planning only, no hidden minting yet

Make sure the Image page draft model cleanly expresses requested renditions and use cases.

Expected draft shape:

```js
{
  title: "",
  description: "",
  altText: "",
  tags: "image, creator",
  accessMode: "public_preview",
  useCases: [
    "standalone_image"
  ],
  renditionTargets: [
    "desktop",
    "tablet",
    "mobile",
    "thumbnail"
  ],
  sourceMode: "creator_original",
  rightsMode: "creator_owned_original",
  creatorDisplay: "",
  provenanceNote: ""
}
```

Possible use cases:

```text
standalone_image
album_cover
podcast_cover
video_thumbnail
film_cover
article_hero
profile_avatar
profile_banner
site_logo
site_banner
game_cover
ad_creative
```

Possible rendition targets:

```text
desktop
tablet
mobile
thumbnail
square_avatar
cover_square
poster
wide_banner
```

Simple form should remain clean. Use cases/renditions belong in Advanced, not on the default form.

### Phase 2 — Add local rendition generation utility

Create a new frontend utility for local image resizing, likely:

```text
apps/crablink-tauri/src/pages/image/imageRenditionGenerator.js
```

Purpose:

```text
Input:
  original File/Blob
  selected rendition targets
  optional crop/fit policy

Output:
  array of generated Blob/File-like objects
  role
  width
  height
  contentType
  bytes
  local preview URL optional
```

Preferred browser APIs:

```text
createImageBitmap(file)
OffscreenCanvas if available
HTMLCanvasElement fallback
canvas.toBlob()
```

Keep it bounded:

```text
maximum input file size: respect existing MVP cap unless intentionally changed
maximum output count: selected targets only
maximum output width/height per target
prefer image/webp for generated renditions if supported
fallback to image/png or original type when needed
do not store generated bytes in localStorage
revoke preview URLs
do not generate unbounded canvases
```

Suggested target definitions:

```js
desktop: {
  role: "desktop",
  maxWidth: 1920,
  maxHeight: 1920,
  fit: "contain",
  contentType: "image/webp",
  quality: 0.86
}

tablet: {
  role: "tablet",
  maxWidth: 1280,
  maxHeight: 1280,
  fit: "contain",
  contentType: "image/webp",
  quality: 0.84
}

mobile: {
  role: "mobile",
  maxWidth: 768,
  maxHeight: 768,
  fit: "contain",
  contentType: "image/webp",
  quality: 0.82
}

thumbnail: {
  role: "thumbnail",
  maxWidth: 320,
  maxHeight: 320,
  fit: "contain",
  contentType: "image/webp",
  quality: 0.8
}

cover_square: {
  role: "cover_square",
  width: 1400,
  height: 1400,
  fit: "cover",
  contentType: "image/webp",
  quality: 0.86
}

square_avatar: {
  role: "square_avatar",
  width: 512,
  height: 512,
  fit: "cover",
  contentType: "image/webp",
  quality: 0.84
}

poster: {
  role: "poster",
  width: 1080,
  height: 1600,
  fit: "cover",
  contentType: "image/webp",
  quality: 0.86
}

wide_banner: {
  role: "wide_banner",
  width: 1600,
  height: 500,
  fit: "cover",
  contentType: "image/webp",
  quality: 0.84
}
```

Do not overcomplicate crop controls yet. For the first implementation, use center crop for cover-style targets and contain for responsive targets. Later we can add manual crop framing.

### Phase 3 — Add a result preview before actual backend bundle minting

Add a collapsed or compact preview section in Advanced:

```text
Generated renditions preview
  desktop — 1920 wide — estimated bytes
  tablet — 1280 wide — estimated bytes
  mobile — 768 wide — estimated bytes
  thumbnail — 320 wide — estimated bytes
  cover square — 1400x1400 — estimated bytes
```

This should be labeled clearly as local generated previews, not minted assets.

Important text:

```text
These renditions are local generated bytes until the backend mint flow returns b3 CIDs and crab URLs.
```

### Phase 4 — Decide between two implementation paths

There are two possible next-session implementation paths.

## Path A — Tauri/frontend proof using current image upload route

This can be done faster, but must be handled carefully.

Process:

```text
1. User selects image and rendition targets.
2. User clicks Get Quote.
3. UI should quote the whole planned operation somehow.
4. User confirms one explicit mint operation.
5. Tauri generates renditions locally.
6. Upload original and generated renditions sequentially through existing image upload route.
7. Display returned URLs/CIDs in a bundle result card.
```

Problem: the current backend may not support one quote/hold covering multiple image uploads. Reusing a single paid proof across multiple uploads may be rejected or semantically wrong. Creating separate hidden holds for each rendition would be bad UX and could violate the explicit-spend rule.

Therefore, Path A should be used only as a clearly labeled proof if we can make the spend confirmation honest:

```text
"Mint original + N generated renditions"
"Backend quote covers this whole operation"
```

If the backend cannot quote the whole bundle, do not fake it.

A safer Path A variation:

```text
Generate renditions locally
Mint only the original through the existing paid flow
Show local rendition previews as "not minted yet"
Defer true rendition minting until backend bundle route exists
```

## Path B — Correct backend-supported image bundle route

This is the preferred production direction.

Need RustyOnions/backend changes, likely in:

```text
ron-proto       — DTOs for image bundle prepare/publish/result
omnigate        — product route handling and hydration shape
svc-gateway     — proxy route
svc-storage     — stores bytes by b3 as usual
svc-wallet      — quote/hold/capture remains wallet path
ron-ledger      — unchanged durable economic truth
```

Possible new routes:

```text
POST /assets/image/bundle/prepare
POST /assets/image/bundle
GET  /b3/<hash>.image
GET  /crab/resolve?url=crab://<hash>.image
```

Possible frontend client methods:

```js
assetClient.prepareImageBundle(payload)
assetClient.uploadImageBundle({
  originalFile,
  renditions,
  metadata,
  paidProof,
  idempotencyKey
})
```

Possible Tauri command:

```text
upload_image_bundle_asset_gateway
```

But be careful: Tauri commands should stay small, typed, bounded, allowlisted, fixed-route, redacted, and gateway-first. The current fixed route `upload_image_asset_gateway` is the good model. The Tauri command bridge should not become generic `upload_anything`, `raw_request`, or `execute` style.

A bundle command might accept:

```json
{
  "headers": {},
  "original": {
    "contentType": "image/png",
    "bodyBytes": []
  },
  "renditions": [
    {
      "role": "desktop",
      "contentType": "image/webp",
      "width": 1920,
      "height": 1080,
      "bodyBytes": []
    }
  ],
  "idempotencyKey": "..."
}
```

But this may be too large for the bridge if many renditions are included. Consider whether the backend route should accept multipart upload. If using JSON arrays of bytes, keep strict caps.

## Recommended next-session plan

Start with frontend groundwork, then decide whether RustyOnions backend bundle support is needed immediately.

### Step 1 — Verify current Image page and upload still work

Run:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
npm run tauri:dev:mac-media
```

Manual smoke:

```text
open crab://image
choose image under current cap
enter title/description
get quote
confirm ROC & mint
copy/open returned crab://<hash>.image
verify image renders
```

The current binary image upload path depends on `upload_image_asset_gateway`, which is already the dedicated Tauri bridge for image bytes. The current bundle shows that command posts to `/assets/image`, uses the image asset kind, sets schema `crablink.tauri.image-asset-upload-response.v1`, and enforces `image/` MIME prefix. 

### Step 2 — Clean old Image files

Only after imports are checked:

```bash
grep -R "ImageCreate\|ImagePreview" -n src | cat
```

If unused:

```bash
rm src/pages/image/ImageCreate.jsx
rm src/pages/image/ImagePreview.jsx
```

Then:

```bash
npm run build
```

### Step 3 — Add `imageRenditionGenerator.js`

Implement local browser-side generation for:

```text
desktop
tablet
mobile
thumbnail
cover_square
square_avatar
poster
wide_banner
```

Keep it display/planning only at first.

Return shape:

```js
{
  role: "desktop",
  label: "Desktop",
  width: 1920,
  height: 1080,
  contentType: "image/webp",
  bytes: 123456,
  blob,
  fileName: "original.desktop.webp",
  previewUrl
}
```

Need cleanup function for preview URLs.

### Step 4 — Update `ImageRenditions.jsx`

Add a button:

```text
Generate local previews
```

Show local generated outputs:

```text
Desktop      1920×1080    123 KB    local preview only
Mobile       768×432      48 KB     local preview only
Thumbnail    320×180      12 KB     local preview only
```

Label clearly:

```text
Not minted yet — no b3 CID or crab URL until backend mint returns.
```

### Step 5 — Update `ImagePublishFlow.jsx` to be bundle-aware, but not misleading

Add awareness of selected rendition targets.

The primary action can say:

```text
Get Bundle Quote
```

or, if backend bundle route is not implemented yet:

```text
Get Image Quote
```

Do not say “Mint all renditions” unless the code actually mints all renditions and returns backend truth for all of them.

Possible interim wording:

```text
Mint original now
```

and in Advanced:

```text
Rendition generation is planned. Local previews do not mint b3 assets yet.
```

### Step 6 — If implementing MVP multi-upload proof, make spend semantics explicit

If we choose to attempt multi-upload with the existing route, the UI must show:

```text
This will mint:
  original
  desktop
  tablet
  mobile
  thumbnail

Total backend quote:
  <backend amount> ROC

Confirm ROC & Mint Bundle
```

Do not make five independent hidden wallet holds. Do not silently spend.

If the backend cannot quote the bundle, stop and implement backend route first.

### Step 7 — Add backend bundle route in RustyOnions if needed

For correct implementation, next session may need latest RustyOnions codebundle too.

Potential DTOs:

```rust
ImageBundlePrepareRequest {
    payer_account: String,
    owner_passport_subject: Option<String>,
    title: String,
    description: Option<String>,
    tags: Vec<String>,
    use_cases: Vec<String>,
    renditions: Vec<ImageRenditionTarget>,
    original_bytes: u64,
}

ImageRenditionTarget {
    role: String,
    width: Option<u32>,
    height: Option<u32>,
    content_type: Option<String>,
    fit: Option<String>,
}

ImageBundlePublishRequest {
    metadata: ImageBundleMetadata,
    original: ImageUploadPart,
    renditions: Vec<ImageUploadPart>,
    paid_proof: PaidProof,
}

ImageBundlePublishResponse {
    canonical: ImageAssetRef,
    rendition_group: ImageRenditionGroup,
    receipt: WalletReceiptRef,
}
```

Possible response shape:

```json
{
  "schema": "crablink.image-bundle-publish-response.v1",
  "canonical": {
    "role": "original",
    "cid": "b3:<original_hash>",
    "url": "crab://<original_hash>.image",
    "width": 3000,
    "height": 2000,
    "content_type": "image/png"
  },
  "rendition_group": {
    "id": "img_rg_<stable_id>",
    "original": "crab://<original_hash>.image",
    "renditions": [
      {
        "role": "desktop",
        "cid": "b3:<desktop_hash>",
        "url": "crab://<desktop_hash>.image",
        "width": 1920,
        "height": 1280,
        "content_type": "image/webp"
      },
      {
        "role": "mobile",
        "cid": "b3:<mobile_hash>",
        "url": "crab://<mobile_hash>.image",
        "width": 768,
        "height": 512,
        "content_type": "image/webp"
      },
      {
        "role": "thumbnail",
        "cid": "b3:<thumb_hash>",
        "url": "crab://<thumb_hash>.image",
        "width": 320,
        "height": 213,
        "content_type": "image/webp"
      }
    ]
  },
  "receipt": {
    "txid": "...",
    "receipt_hash": "..."
  }
}
```

Each rendition should also have enough manifest information to link back:

```json
{
  "kind": "image",
  "role": "mobile",
  "cid": "b3:<mobile_hash>",
  "url": "crab://<mobile_hash>.image",
  "rendition_group_id": "img_rg_<stable_id>",
  "canonical_original": "crab://<original_hash>.image",
  "derived_from": "b3:<original_hash>",
  "width": 768,
  "height": 512,
  "content_type": "image/webp"
}
```

## Manifest doctrine for renditions

The original image manifest should become the canonical manifest for the group:

```json
{
  "kind": "image",
  "canonical": {
    "cid": "b3:<original_hash>",
    "url": "crab://<original_hash>.image",
    "width": 3000,
    "height": 2000,
    "content_type": "image/png"
  },
  "use_cases": [
    "standalone_image",
    "album_cover",
    "video_thumbnail",
    "film_cover"
  ],
  "rendition_group": {
    "id": "img_rg_<stable_id>",
    "original": "crab://<original_hash>.image",
    "renditions": [
      {
        "role": "desktop",
        "url": "crab://<desktop_hash>.image",
        "cid": "b3:<desktop_hash>",
        "width": 1920,
        "height": 1280,
        "content_type": "image/webp"
      }
    ]
  }
}
```

Each generated rendition should carry back-reference metadata:

```json
{
  "kind": "image",
  "role": "desktop",
  "canonical_original": "crab://<original_hash>.image",
  "rendition_group_id": "img_rg_<stable_id>",
  "derived_from": "b3:<original_hash>"
}
```

The embed rule should be simple:

```text
Load canonical image manifest.
Read rendition_group.renditions.
Pick best target for device/slot/DPR.
Render that crab:// image.
Fallback to original if no match exists.
```

## Key invariants for next session

Preserve these strictly:

```text
Tauri is primary.
Gateway-first.
React owns display and intent only.
Tauri Rust mediates native/binary operations.
No raw generic command bridge.
No run/execute/eval/shell/raw_* commands.
No direct storage/index/ledger calls from UI.
No fake b3 CIDs.
No fake rendition URLs.
No fake receipts.
No fake balances.
No silent ROC spend.
No custom ROC pricing UI in this batch.
No payment split UI in this batch.
No local cache unlocking paid content.
Every minted rendition must be backend-returned truth.
Every paid action must be explicit.
Receipts must be backend-derived.
```

## User-facing UX target

The simple Image form should not become more complicated.

Default visible page should still be:

```text
Select image
Preview
Title
Description
Get quote
Confirm ROC & Mint
Result link
```

Advanced drawer should show:

```text
Tags
Alt text
Source
Rights hint
Use cases
Rendition preferences
Local generated preview results
Manifest preview
Developer JSON
```

After successful bundle mint, show a polished result card:

```text
Image minted

Original
  crab://<original>.image
  Copy / Open

Generated versions
  Desktop       crab://<desktop>.image       Copy
  Tablet        crab://<tablet>.image        Copy
  Mobile        crab://<mobile>.image        Copy
  Thumbnail     crab://<thumbnail>.image     Copy
  Album cover   crab://<cover>.image         Copy
  Film cover    crab://<poster>.image        Copy

Receipt
  backend-derived receipt hash
```

Long hashes must wrap cleanly and not spill out of the UI.

## Files likely needed next session

Frontend/Tauri:

```text
apps/crablink-tauri/src/pages/image/ImagePage.jsx
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
apps/crablink-tauri/src/pages/image/ImageRenditions.jsx
apps/crablink-tauri/src/pages/image/ImageManifest.jsx
apps/crablink-tauri/src/pages/image/imageDraftModel.js
apps/crablink-tauri/src/pages/image/image.css
apps/crablink-tauri/src/shared/api/assetClient.js
```

New possible frontend file:

```text
apps/crablink-tauri/src/pages/image/imageRenditionGenerator.js
```

Possible Tauri Rust files if adding a bundle bridge:

```text
apps/crablink-tauri/src-tauri/src/commands/assets.rs
apps/crablink-tauri/src-tauri/src/commands/mod.rs
apps/crablink-tauri/src-tauri/src/lib.rs
```

Backend RustyOnions files if adding proper backend bundle route:

```text
crates/ron-proto/src/asset/*
crates/omnigate/src/routes/v1/assets.rs
crates/svc-gateway/*
crates/svc-storage/*
tests for omnigate and svc-gateway image bundle routes
```

Need a current RustyOnions codebundle before backend route work.

## Testing plan for next session

Start with current UI regression:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
npm run tauri:dev:mac-media
```

Then manual Image smoke:

```text
open crab://image
choose a small image
confirm preview works
enter title/description
open Advanced
select album cover, video thumbnail, film cover
select desktop/mobile/tablet/thumbnail
confirm no manual rendition URL fields are visible
get quote
confirm ROC & mint original
open returned crab URL
```

If adding local generation:

```text
generate renditions
verify local previews display
verify no b3/crab URL is shown for local generated renditions
verify memory cleanup when changing image
verify preview URLs are revoked
verify large image fails politely
```

If adding bundle mint proof:

```text
mint original + selected renditions
verify each returned URL is real crab://<hash>.image
verify each URL opens
verify each asset is b3-backed through gateway
verify canonical result links to renditions
verify renditions link back to original
verify one explicit user confirmation covers the action honestly
verify wallet balance/receipt behavior is backend-derived
```

Run project gates:

```bash
cd /Users/mymac/Desktop/crablink
bash scripts/check-tauri.sh
```

If backend changed, also run the relevant RustyOnions tests for omnigate/svc-gateway image routes.

## Risk list

The main risks are:

```text
1. Accidentally creating hidden multi-spend by uploading each rendition as a separate paid action.
2. Reusing one receipt/proof for multiple uploads when backend does not support that semantic.
3. Showing local generated previews as if they are minted b3 assets.
4. Overloading the Tauri command bridge with too many bytes.
5. Creating huge canvases from large source images.
6. Forgetting to revoke object URLs.
7. Letting long hashes/URLs spill out of result cards.
8. Adding custom ROC price or payment split UI prematurely.
9. Deleting old files before checking imports.
10. Treating local manifest JSON as backend truth.
```

## Most likely next best implementation path

Best next session sequence:

```text
1. Verify current Image one-card mint still builds and works.
2. Delete unused ImageCreate/ImagePreview only if import search proves they are dead.
3. Add imageRenditionGenerator.js for local bounded rendition generation.
4. Show generated local rendition previews in Advanced.
5. Keep actual minting to original only unless backend bundle route is ready.
6. Design/implement backend image bundle prepare/publish route if we want true automatic rendition minting.
7. Update ImagePublishFlow to use bundle route once backend truth exists.
8. Show returned original + rendition crab URLs in a clean success card.
```

The guiding principle for the next session:

```text
Local generation can prepare bytes.
Only backend minting can create truth.
Only backend responses can show b3 CIDs, crab URLs, manifests, receipts, and ownership links.
```

This preserves the CrabLink/RustyOnions mental model and gives us a clean path to make Image the reference implementation for every other media/page type.


### END NOTE - MAY 26 2026 - 14:55 CST



### BEGIN NOTE - MAY 26 2026 - 20:55 CST

Absolutely. Here are the carryover notes for the next session.

# CrabLink Tauri / RustyOnions carryover notes — Image high-res upload + auto-rendition minting

## 1. Current mission

We are working on the **CrabLink Tauri Image page** and the RustyOnions backend upload path needed to support high-resolution image minting.

The intended product behavior is:

1. User opens `crab://image`.
2. User selects one original image file.
3. CrabLink keeps the simplified UI:

   * image preview
   * title
   * description
   * quote
   * explicit ROC confirmation
   * mint
4. In the background, CrabLink can generate multiple resized versions:

   * desktop
   * tablet
   * mobile
   * thumbnail
   * album cover
   * video thumbnail
   * film/cover poster
5. The original image is uploaded first.
6. Each generated rendition is uploaded after that.
7. Each uploaded image/rendition gets its **own backend-returned `crab://<hash>.image` URL**.
8. Generated renditions should point back to the original image through metadata for now.
9. Long-term, this should become a proper backend image-bundle manifest route. For now, the frontend/Tauri proof mints each image separately and shows a display bundle map.

Important invariant: **no fake b3, no fake crab URL, no fake receipt, no hidden ROC spend.** The app must only show backend-returned mint addresses.

## 2. UI status

The simplified Image UI was restored after a regression.

Current desired UI state:

```text
crab://image
Mint an image

[large preview/select image area]

Title
Description

Advanced fields collapsed:
  tags
  alt text
  source/provenance
  rights
  use cases
  rendition preferences
  generated previews
  manifest/debug route truth

Publish card:
  Get bundle quote
  Review ROC hold
  Confirm ROC & Hold
  Mint image bundle
```

The user specifically does **not** want the default Image page to become a developer-heavy workspace. Advanced rendition controls should remain tucked away.

## 3. Frontend/Tauri image-size cap status

The original frontend/Tauri cap was around 1 MiB and rejected images like `2.70 MB` with:

```text
The source image is 2.70 MB, above the current 1.00 MB image upload bridge cap.
```

We decided the creator upload path should support high-resolution images. Target cap discussion:

```text
Preferred user-facing source image cap: around 25 MB
Dev backend HTTP cap used during debugging: 64 MiB / 67,108,864 bytes
```

Why 64 MiB in backend env: it gives room for source + generated image versions during current proof work. OAP frame caps must remain separate and stay around 1 MiB.

## 4. Persistent blocker

Even after raising frontend/Tauri/backend cap attempts, both direct omnigate and gateway still return HTTP 413 for a 2.7 MB probe body:

```text
== omnigate /v1/assets/image direct ==
HTTP/1.1 413 Payload Too Large
x-omnigate-cap: 2048

Failed to buffer the request body: length limit exceeded

== gateway /assets/image ==
HTTP/1.1 413 Payload Too Large

Failed to buffer the request body: length limit exceeded
```

This means the request is still being rejected while Axum is buffering/extracting the body.

## 5. Important correction: `x-omnigate-cap: 2048` is not the body-size cap

We initially suspected `2048` might be a body cap. The grep scan proved that is wrong.

The scan found:

```text
crates/omnigate/configs/omnigate.toml:27:max_inflight = 2048
crates/omnigate/src/admission/fair_queue.rs:98: HeaderName::from_static("x-omnigate-cap")
...
crates/omnigate/tests/readiness_inflight.rs:58: max_inflight: 2048
```

So `x-omnigate-cap: 2048` is fair-queue/admission capacity, not upload bytes. Do **not** chase `2048` as the upload cap. 

The real failing line is:

```text
Failed to buffer the request body: length limit exceeded
```

That points to Axum body extraction / `DefaultBodyLimit`.

## 6. Body-limit scan results

The scan showed actual body-limit locations:

```text
crates/omnigate/src/middleware/body_caps.rs
crates/omnigate/src/middleware/mod.rs
crates/omnigate/src/routes/v1/assets.rs
scripts/web3_crablink_dev_stack.sh
crates/svc-gateway/src/layers/body_caps.rs
crates/svc-gateway/src/config/env.rs
crates/svc-gateway/src/consts.rs
```

Relevant scan findings:

```text
crates/omnigate/src/middleware/body_caps.rs:
  DEFAULT_MAX_BYTES: usize = 64 * MIB
  MAX_CONFIGURABLE_BYTES: usize = 64 * MIB
  configured_max_bytes()
  DefaultBodyLimit::max(max)

crates/omnigate/src/routes/v1/assets.rs:
  extract::DefaultBodyLimit
  .layer(DefaultBodyLimit::max(IMAGE_UPLOAD_BODY_LIMIT_BYTES))

scripts/web3_crablink_dev_stack.sh:
  SVC_GATEWAY_MAX_BODY_BYTES
  OMNIGATE_MAX_BODY_BYTES
  RON_STORAGE_MAX_BODY
  max_content_length = ${OMNIGATE_MAX_BODY_BYTES}
```

This scan suggests the source is now patched toward 64 MiB, at least in the current repo working tree. 

Gateway still has a default 1 MiB constant, but it should respect `SVC_GATEWAY_MAX_BODY_BYTES` if the environment is present. The scan found `svc-gateway/src/config/env.rs` reading `SVC_GATEWAY_MAX_BODY_BYTES`, plus a 1 MiB fallback in `svc-gateway/src/consts.rs`. 

`svc-storage` likely is not the blocker because its runtime default already falls back to `64 * 1024 * 1024`. 

## 7. Runtime process/env status

We verified the running processes:

```text
9090 -> target/debug/omnigate
8090 -> svc-gateway
5303 -> svc-storage
```

The running omnigate process did have the correct env values:

```text
SVC_GATEWAY_MAX_BODY_BYTES=67108864
CRABLINK_DEV_IMAGE_BODY_BYTES=67108864
OMNIGATE_MAX_BODY_BYTES=67108864
RON_STORAGE_MAX_BODY=67108864
```

So this is probably not just missing environment variables.

## 8. Patch attempts made in this session

### 8.1 Omnigate global body cap

We patched / attempted to patch:

```text
crates/omnigate/src/middleware/body_caps.rs
```

Goal:

```rust
const DEFAULT_MAX_BYTES: usize = 64 * MIB;
const MAX_CONFIGURABLE_BYTES: usize = 64 * MIB;

pub fn configured_max_bytes() -> usize {
    std::env::var("OMNIGATE_MAX_BODY_BYTES")
        ...
        .unwrap_or(DEFAULT_MAX_BYTES)
        .min(MAX_CONFIGURABLE_BYTES)
}
```

The scan later showed the current source has this shape. 

### 8.2 Omnigate route-level cap

We patched / attempted to patch:

```text
crates/omnigate/src/routes/v1/assets.rs
```

Goal:

```rust
use axum::extract::DefaultBodyLimit;

const IMAGE_UPLOAD_BODY_LIMIT_BYTES: usize = 64 * 1024 * 1024;

Router::new()
    ...
    .layer(DefaultBodyLimit::max(IMAGE_UPLOAD_BODY_LIMIT_BYTES))
```

The current codebundle showed `IMAGE_UPLOAD_BODY_LIMIT_BYTES` was added in `assets.rs`. 

### 8.3 Omnigate `image_upload` handler

We found the image upload handler still had this shape:

```text
pub async fn image_upload(headers: HeaderMap, body: Bytes) -> Response
```

A grep showed:

```text
576:pub async fn image_upload(headers: HeaderMap, body: Bytes) -> Response
```

We attempted to patch it toward:

```rust
pub async fn image_upload(headers: HeaderMap, body: Body) -> Response {
    let body = match axum::body::to_bytes(body, IMAGE_UPLOAD_BODY_LIMIT_BYTES).await {
        Ok(body) => body,
        Err(_) => return problem(... StatusCode::PAYLOAD_TOO_LARGE ...),
    };

    send_to_storage(..., body, ...).await
}
```

This is likely still the most important direction. The next session should verify the final file really changed from `body: Bytes` to `body: Body`.

### 8.4 Gateway `image_upload` proxy

We found `svc-gateway` can also become a body-buffer blocker after omnigate is fixed.

We attempted to patch:

```text
crates/svc-gateway/src/routes/product.rs
```

from `body: Bytes` to `body: Body`, with manual `axum::body::to_bytes(body, IMAGE_UPLOAD_BODY_LIMIT_BYTES)`.

There was a compile error because I suggested nonexistent helpers:

```text
errors::payload_too_large(...)
errors::bad_request(...)
```

Then we changed direction to use the existing `errors::Problem` response type with `StatusCode::PAYLOAD_TOO_LARGE`.

The compile status after that final patch is unknown from the final output. The last shown error was:

```text
cannot find function bad_request in module errors
```

Next session must inspect `crates/svc-gateway/src/routes/product.rs` around line ~399 and verify the bad helper call is gone.

## 9. Critical next-session first checks

Start next session by checking the actual current source files, not assuming all patch scripts applied cleanly.

Run:

```bash
cd /Users/mymac/Desktop/RustyOnions

echo "== omnigate image upload handler =="
grep -n "pub async fn image_upload" -A35 crates/omnigate/src/routes/v1/assets.rs

echo
echo "== omnigate body caps =="
sed -n '1,90p' crates/omnigate/src/middleware/body_caps.rs

echo
echo "== gateway image upload handler =="
grep -n "pub async fn image_upload" -A35 crates/svc-gateway/src/routes/product.rs

echo
echo "== gateway bad helper leftovers =="
grep -R "errors::bad_request\|errors::payload_too_large" crates/svc-gateway/src/routes/product.rs -n || true
```

What we want to see:

```text
omnigate image_upload uses body: Body, not body: Bytes
svc-gateway image_upload uses body: Body, not body: Bytes
no errors::bad_request
no errors::payload_too_large
```

## 10. Rebuild commands for next session

After source verification/fixes:

```bash
cd /Users/mymac/Desktop/RustyOnions

cargo fmt -p omnigate -p svc-gateway
cargo check -p omnigate
cargo check -p svc-gateway
cargo build -p omnigate
cargo build -p svc-gateway
```

If `svc-gateway` still fails with the `bad_request` error, replace the offending `Err(_)` branch with a direct `Problem` response:

```rust
Err(_) => {
    return errors::Problem {
        code: "image_upload_body_too_large",
        message: "image upload body exceeded the configured image upload cap",
        retryable: false,
        retry_after_ms: None,
        reason: Some("image_upload_body_too_large"),
    }
    .into_response_with(StatusCode::PAYLOAD_TOO_LARGE);
}
```

Also ensure `StatusCode` is imported:

```rust
http::{header, HeaderMap, HeaderName, Method, StatusCode, Uri},
```

## 11. Restart sequence

After build, kill old listeners:

```bash
for port in 9090 8090 5303; do
  PID="$(lsof -nP -iTCP:$port -sTCP:LISTEN -t | head -n 1)"
  if [ -n "$PID" ]; then
    echo "killing port $port pid $PID"
    kill "$PID"
  fi
done

sleep 1

for port in 9090 8090 5303; do
  echo "== port $port after kill =="
  lsof -nP -iTCP:$port -sTCP:LISTEN || true
done
```

Restart the stack with caps:

```bash
cd /Users/mymac/Desktop/RustyOnions

CRABLINK_DEV_IMAGE_BODY_BYTES=67108864 \
SVC_GATEWAY_MAX_BODY_BYTES=67108864 \
OMNIGATE_MAX_BODY_BYTES=67108864 \
RON_STORAGE_MAX_BODY=67108864 \
OMNIGATE_PASSPORT_BASE_URL=http://127.0.0.1:5307 \
OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
OMNIGATE_WALLET_BEARER=dev \
RON_STORAGE_ROC_ECONOMICS_PATH="$(pwd)/configs/roc-economics.dev.toml" \
RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303 \
scripts/web3_crablink_dev_stack.sh
```

## 12. Probe command to rerun

Use this exact probe before trying the Tauri UI again:

```bash
cd /Users/mymac/Desktop/RustyOnions

TMP_BODY="$(mktemp)"
head -c 2700000 /dev/zero > "$TMP_BODY"

echo "== omnigate /v1/assets/image direct =="
curl -sS -i \
  -X POST "http://127.0.0.1:9090/v1/assets/image" \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: image/png" \
  -H "Idempotency-Key: cap-probe-omnigate-$(date +%s)" \
  -H "x-ron-wallet-hold-txid: tx_probe" \
  -H "x-ron-wallet-txid: tx_probe" \
  -H "x-ron-wallet-receipt-hash: b3:0000000000000000000000000000000000000000000000000000000000000000" \
  -H "x-ron-wallet-from: acct_dev" \
  -H "x-ron-wallet-to: escrow_paid_write" \
  --data-binary @"$TMP_BODY" | sed -n '1,80p'

echo
echo "== gateway /assets/image =="
curl -sS -i \
  -X POST "http://127.0.0.1:8090/assets/image" \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: image/png" \
  -H "Idempotency-Key: cap-probe-gateway-$(date +%s)" \
  -H "x-ron-wallet-hold-txid: tx_probe" \
  -H "x-ron-wallet-txid: tx_probe" \
  -H "x-ron-wallet-receipt-hash: b3:0000000000000000000000000000000000000000000000000000000000000000" \
  -H "x-ron-wallet-from: acct_dev" \
  -H "x-ron-wallet-to: escrow_paid_write" \
  --data-binary @"$TMP_BODY" | sed -n '1,80p'

rm -f "$TMP_BODY"
```

Success condition:

```text
No HTTP 413
No "Failed to buffer the request body: length limit exceeded"
```

A `400`, `401`, `402`, or `409` is acceptable for this fake-proof probe.

## 13. If 413 persists after `Body` patches

Next diagnostic should add a temporary debug response/header/log in omnigate body cap creation.

Add a temporary startup/layer log in:

```text
crates/omnigate/src/middleware/body_caps.rs
```

near `pub fn layer()`:

```rust
pub fn layer() -> (PreflightContentLengthGuardLayer, DefaultBodyLimit) {
    let max = configured_max_bytes();
    eprintln!("RO_DEBUG omnigate body cap max bytes = {max}");

    (
        PreflightContentLengthGuardLayer { max },
        DefaultBodyLimit::max(max),
    )
}
```

Then rebuild, restart stack, and confirm the terminal prints:

```text
RO_DEBUG omnigate body cap max bytes = 67108864
```

If it prints 64 MiB and still fails, the body rejection is probably from a different `DefaultBodyLimit` / extractor path, not `body_caps::layer()`.

Then search again:

```bash
grep -R "DefaultBodyLimit::max\|to_bytes(body\|body: Bytes\|RequestBodyLimit\|BodyLimit" \
  crates/omnigate crates/svc-gateway \
  --include='*.rs' -n | sort
```

## 14. Why not test this repeatedly from the UI yet

Do not keep testing through the CrabLink UI while this remains unresolved. The image mint flow can successfully:

1. prepare quote
2. create wallet hold
3. fail upload at HTTP 413

That means repeated UI tests may create multiple successful ROC holds before upload fails. Use the fake curl body probe until direct `9090` and gateway `8090` no longer return 413.

## 15. Project invariants to preserve next session

Do not weaken these:

```text
OAP frame cap remains separate and small.
No direct ledger mutation outside svc-wallet.
No fake receipts.
No fake b3 CIDs.
No fake crab URLs.
No silent ROC spend.
No frontend-owned truth.
No cache unlock of paid content.
Tauri is client, not backend.
Gateway compatibility first.
```

For image uploads, the safe temporary dev stance is:

```text
HTTP image upload cap: 64 MiB in dev
Tauri source image cap: about 25 MiB user-facing, or 64 MiB while debugging
Generated renditions: bounded locally
Each rendition: separate backend upload and backend-returned crab:// URL
Bundle relation: display map only until backend-native bundle manifest exists
```

## 16. Recommended next-session work order

1. Inspect current `assets.rs` and `product.rs` to verify whether `image_upload` is actually using `Body` or still `Bytes`.
2. Fix any `svc-gateway` compile errors.
3. Build both `omnigate` and `svc-gateway`.
4. Kill old ports and restart stack with explicit cap env.
5. Run direct `9090` probe.
6. Only after direct `9090` stops returning 413, run gateway `8090` probe.
7. Only after both stop returning 413, test a real image in CrabLink Tauri.
8. After high-res original works, return to the multi-version/rendition mint flow and verify original + generated versions each return backend `crab://...image`.

The highest-priority unresolved issue is still:

```text
HTTP 413 on /v1/assets/image direct omnigate for a 2.7 MB body:
"Failed to buffer the request body: length limit exceeded"
```

The most likely next code fix is still:

```text
Use Body + explicit axum::body::to_bytes(..., 64 MiB cap) for image_upload in both omnigate and svc-gateway, then verify the final source and binary truly reflect that patch.
```


### END NOTE - MAY 26 2026 - 20:55 CST


### BEGIN NOTE - MAY 27 2026 - 09:10 CST

---

# Carryover Notes — CrabLink Tauri Image Upload Limit Fix + Next Image Page Tasks

## 0. Current checkpoint

We continued debugging the CrabLink Tauri image upload problem where images around **2.7 MB** failed with:

```text
HTTP/1.1 413 Payload Too Large
Failed to buffer the request body: length limit exceeded
```

The issue was **not** in the Tauri UI, and it was **not** fair-queue. It was ultimately a backend body extraction/cap problem that appeared in multiple layers.

Final proof: a **2,700,000 byte image body** now succeeds through:

```text
svc-storage /paid/o          → 200 OK
omnigate /v1/assets/image    → 200 OK
svc-gateway /assets/image    → 200 OK
```

The final successful gateway/omnigate probe returned a full `omnigate.image-asset-upload.v1` response, with raw asset CID, crab URL, storage upload data, manifest CID, index pointer status, owner info, payout info, and links. The usage event showed `bytes_stored = 2700000`, proving the body made it through storage. 

---

## 1. Important cap outcome

The current backend upload cap is now:

```text
67,108,864 bytes
= 64 MiB
≈ 67.1 decimal MB
```

This applies to the backend path when the stack is launched with the correct env vars:

```bash
SVC_GATEWAY_MAX_BODY_BYTES=67108864
OMNIGATE_MAX_BODY_BYTES=67108864
OMNIGATE_MAX_CONTENT_LENGTH=67108864
CRABLINK_DEV_IMAGE_BODY_BYTES=67108864
RON_STORAGE_MAX_BODY=67108864
```

Important caveat for next session:

```text
Backend image path: 64 MiB
CrabLink Tauri command/UI path: may still be around 25 MiB unless raised separately
```

So if a 30+ MiB image works with curl but fails in the Tauri UI, the remaining cap is probably inside the CrabLink Tauri command bridge, not RustyOnions backend.

---

## 2. What was actually wrong

### 2.1 Fair queue was not the blocker

We investigated `crates/omnigate/src/admission/fair_queue.rs` because the response showed:

```text
x-omnigate-cap: 2048
```

Conclusion:

```text
x-omnigate-cap: 2048 is the inflight request capacity header.
It is not a byte cap.
It does not mean 2,048 bytes or 2,048 KB.
```

Fair queue would reject with:

```text
HTTP 503
reason: overloaded
message: server is shedding load; please retry
```

But our failure was:

```text
HTTP 413
text/plain
Failed to buffer the request body: length limit exceeded
```

So the request had already passed fair queue. Fair queue was only adding the `x-omnigate-cap` header to the downstream 413 response.

### 2.2 Omnigate and gateway were partly fixed first

We confirmed `omnigate` and `svc-gateway` image upload handlers now accept `Body` and explicitly buffer with the intended image upload cap, rather than relying on Axum’s default extractor limit.

Relevant behavior now:

```text
omnigate /v1/assets/image:
  Body → to_bytes(body, IMAGE_UPLOAD_BODY_LIMIT_BYTES)

svc-gateway /assets/image:
  Body → to_bytes(body, IMAGE_UPLOAD_BODY_LIMIT_BYTES)
```

Tests that passed after patches:

```text
cargo test -p omnigate --test image_asset_prepare
cargo test -p omnigate --test middleware_contract
cargo test -p svc-gateway --test product_routes_proxy
cargo build -p omnigate -p svc-gateway
```

Final successful test state:

```text
omnigate image_asset_prepare: 5 passed
omnigate middleware_contract: 5 passed
svc-gateway product_routes_proxy: 8 passed
omnigate + svc-gateway build: finished
```

### 2.3 Storage was the real remaining blocker

The direct storage probe proved this:

```bash
POST http://127.0.0.1:5303/paid/o
body bytes: 2700000
```

Before the fix, storage returned:

```text
HTTP/1.1 413 Payload Too Large
Failed to buffer the request body: length limit exceeded
```

That meant `svc-storage` was still using a `bytes::Bytes` extractor on `/paid/o`, so Axum rejected the body before `RON_STORAGE_MAX_BODY` mattered.

The fix was to patch:

```text
crates/svc-storage/src/http/routes/paid_object.rs
```

so the handler takes:

```rust
body: Body
```

and explicitly buffers:

```rust
to_bytes(body, paid_object_body_limit_bytes()).await
```

using:

```text
RON_STORAGE_MAX_BODY
default 64 MiB
max 64 MiB
```

After that, direct storage returned `200 OK` for a 2.7 MB upload and recorded:

```json
"value": 2700000,
"route": "/paid/o"
```

---

## 3. Patch summary that must be preserved

### 3.1 Omnigate config/env patch

File:

```text
crates/omnigate/src/config/env.rs
```

Purpose:

```text
Make OMNIGATE_MAX_BODY_BYTES / OMNIGATE_MAX_CONTENT_LENGTH / CRABLINK_DEV_IMAGE_BODY_BYTES flow into cfg.admission.body.max_content_length.
```

Important detail:

```text
Use String in first_u64_env return, not &'static str, to avoid lifetime compile errors.
```

### 3.2 Omnigate body cap middleware patch

File:

```text
crates/omnigate/src/middleware/body_caps.rs
```

Purpose:

```text
Make HTTP body cap explicit and log active cap.
Default/max: 64 MiB.
Keep OAP frame cap separate.
```

Important invariant:

```text
OAP max frame remains 1 MiB.
HTTP upload body cap is 64 MiB.
Do not conflate these.
```

### 3.3 Omnigate image/media prepare message patch

File:

```text
crates/omnigate/src/routes/v1/assets.rs
```

Purpose:

```text
fetch_storage_estimate now takes a rejection_message argument so image-specific tests remain correct.
```

Specific fixes made:

```text
image_prepare uses:
  "storage estimate rejected image prepare request"

stream_prepare descriptor estimate uses:
  "storage estimate rejected stream prepare request"
```

### 3.4 Gateway image upload patch

File:

```text
crates/svc-gateway/src/routes/product.rs
```

Purpose:

```text
/assets/image accepts Body and explicitly buffers with IMAGE_UPLOAD_BODY_LIMIT_BYTES before proxying to omnigate.
```

### 3.5 Storage paid object patch

File:

```text
crates/svc-storage/src/http/routes/paid_object.rs
```

Purpose:

```text
/paid/o accepts Body and explicitly buffers with RON_STORAGE_MAX_BODY.
This was the final blocker.
```

Tests that passed before unrelated disk/config issues:

```text
paid_write_policy: 5 passed
paid_write_verifier: 19 passed
paid_write_wallet_mode: 1 passed
paid_write_settlement: 1 passed
```

Unrelated remaining issues:

```text
paid_write_economics.rs expects configs/roc-economics.toml, but that file is missing.
Cargo also hit “No space left on device” during one later build.
```

Next session should restore or recreate:

```text
configs/roc-economics.toml
```

while keeping:

```text
configs/roc-economics.dev.toml
```

for local CrabLink testing.

---

## 4. Runtime launch order note

The user noticed Wallet A/dev wallet did not automatically load ROC, but manual Wallet B loading worked.

Likely explanation:

```text
The stack may have been started in a different order than usual.
```

The better dev order is still:

```text
1. Start svc-wallet.
2. Start svc-passport.
3. Start the WEB3_2 / CrabLink dev stack.
4. Start CrabLink Tauri.
```

Do not over-debug the bootstrap issue yet unless it repeats with the proper service order.

Known error seen:

```text
Passport bootstrap failed with HTTP 422.
HTTP preview mode may not have extension storage or gateway host permissions.
```

Current interpretation:

```text
The UI error copy is misleading / inherited from preview-Chrome wording.
The real issue is HTTP 422 from backend validation or wallet/passport bootstrap state.
Manual funding still works, so not a blocker for image testing.
```

Manual funding command for Wallet A/dev if needed:

```bash
curl -fsS -X POST http://127.0.0.1:8088/v1/issue \
  -H 'Authorization: Bearer dev' \
  -H "Idempotency-Key: dev-fund-acct-dev-$(date +%s)" \
  -H 'Content-Type: application/json' \
  -d '{"to":"acct_dev","asset":"roc","amount_minor":"1776","memo":"dev fund acct_dev for Tauri"}' \
  | jq .
```

Wallet B manual funding still works and was used successfully for testing.

---

## 5. Current image-page state

The screenshot shows image minting now works in Tauri.

The image page successfully mints an image bundle and displays:

```text
Original
Desktop rendition
Tablet rendition
Mobile rendition
Thumbnail rendition
Receipt hash
```

Example from the screenshot:

```text
Original: 2.70 MB image/png
Desktop: 1448x1086, 3.30 MB
Tablet: 1280x960, 2.54 MB
Mobile: 768x576, 1.03 MB
Thumbnail: 320x320, 26.57 KB
```

The UI now says:

```text
Image bundle minted
Every listed crab URL came from the backend upload response.
Backend returned
```

This is good. The page is much cleaner than before and should be kept as the image-page reference model for other pages.

---

## 6. Next image-page feature: rendition manifests must cross-link

The next requested image-page improvement:

```text
Each image link / rendition should have the block of alternate versions listed inside its own manifest.
```

Meaning:

```text
Original manifest should know:
  - original CID
  - desktop CID
  - tablet CID
  - mobile CID
  - thumbnail CID

Desktop manifest should know:
  - original CID
  - desktop CID/self
  - tablet CID
  - mobile CID
  - thumbnail CID

Tablet manifest should know the same group.

Mobile manifest should know the same group.

Thumbnail manifest should know the same group.
```

Recommended manifest structure for next implementation:

```json
{
  "rendition_group": {
    "group_id": "b3:<original-or-bundle-root>",
    "source_cid": "b3:<original>",
    "canonical_crab_url": "crab://<original>.image",
    "renditions": [
      {
        "role": "original",
        "cid": "b3:<hash>",
        "crab_url": "crab://<hash>.image",
        "mime": "image/png",
        "bytes": 2700000,
        "width": 0,
        "height": 0
      },
      {
        "role": "desktop",
        "cid": "b3:<hash>",
        "crab_url": "crab://<hash>.image",
        "mime": "image/png",
        "bytes": 3300000,
        "width": 1448,
        "height": 1086
      },
      {
        "role": "tablet",
        "cid": "b3:<hash>",
        "crab_url": "crab://<hash>.image",
        "mime": "image/png",
        "bytes": 2540000,
        "width": 1280,
        "height": 960
      },
      {
        "role": "mobile",
        "cid": "b3:<hash>",
        "crab_url": "crab://<hash>.image",
        "mime": "image/png",
        "bytes": 1030000,
        "width": 768,
        "height": 576
      },
      {
        "role": "thumbnail",
        "cid": "b3:<hash>",
        "crab_url": "crab://<hash>.image",
        "mime": "image/png",
        "bytes": 26570,
        "width": 320,
        "height": 320
      }
    ]
  }
}
```

Important invariant:

```text
Every rendition is still its own canonical b3 asset.
The rendition group is metadata/reference graph, not a replacement for b3 truth.
```

This matters for future:

```text
album covers
video thumbnails
film covers
responsive image sites
creator pages
media pages
large video renditions
```

---

## 7. Next bug: paid image viewing does not render after payment

Current new problem:

```text
When an image is minted and a different wallet pays to view it, the image does not load/render like it used to.
```

This is now the highest-priority functional bug for next session.

Important distinction:

```text
Upload/mint path is now fixed.
Paid view/render path is now broken or regressed.
```

Likely files to inspect in CrabLink Tauri next session:

```text
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/pages/asset/AssetPage.jsx
apps/crablink-tauri/src/pages/image/ImagePage.jsx
apps/crablink-tauri/src/shared/api/contentViewClient.js
apps/crablink-tauri/src/shared/api/assetClient.js
apps/crablink-tauri/src/shared/embed/crabImageEmbed.jsx
apps/crablink-tauri/src/shared/manifest/uniformManifest.js
apps/crablink-tauri/src/app/router.js
```

Likely backend routes to inspect if frontend looks correct:

```text
omnigate:
  crates/omnigate/src/routes/v1/content_view.rs
  crates/omnigate/src/routes/v1/assets.rs
  crates/omnigate/src/routes/v1/crab.rs
  crates/omnigate/src/routes/v1/objects.rs

svc-gateway:
  crates/svc-gateway/src/routes/product.rs
  crates/svc-gateway/src/routes/content_view_routes_proxy.rs if present
  crates/svc-gateway/tests/content_view_routes_proxy.rs
```

Likely failure possibilities:

```text
1. Paid content_view pay succeeds but frontend does not fetch/render the unlocked image bytes.
2. The unlock response contains receipt/entitlement but the image renderer still points at a route requiring a different auth header.
3. The asset page hydrates the manifest but not the raw image object.
4. The Tauri image renderer is using a stale crab:// route instead of gateway HTTP b3/raw route.
5. The owner wallet and viewer wallet are being confused after dev passport switching.
6. Recent upload/rendition changes changed manifest shape, and paid render path expects the older single-image manifest shape.
7. Cache or local catalog is displaying the crab URL but not triggering paid asset render after receipt.
```

Required next-session test matrix:

```text
A. Creator Wallet A mints image → Viewer Wallet B pays → image should render.
B. Creator Wallet B mints image → Viewer Wallet A pays → image should render.
C. Owner opens own image → decide whether owner bypass should exist or whether owner must pay.
D. Viewer with 0 ROC attempts view → explicit insufficient funds / no fake unlock.
E. Viewer after successful payment reloads page → receipt display cache may show, but backend entitlement/receipt remains truth.
```

Do not implement fake unlocks.

Paid flow invariant remains:

```text
quote/prepare → explicit confirmation → backend wallet path → backend receipt → unlock/render → display receipt → balance refresh
```

Offline cache cannot unlock paid content alone.

---

## 8. Important commands for next session

### Start Tauri dev app

User runs:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run tauri:dev:mac-media
```

### Backend stack cap env

Use these when launching the backend stack:

```bash
export OMNIGATE_MAX_BODY_BYTES=67108864
export OMNIGATE_MAX_CONTENT_LENGTH=67108864
export CRABLINK_DEV_IMAGE_BODY_BYTES=67108864
export SVC_GATEWAY_MAX_BODY_BYTES=67108864
export RON_STORAGE_MAX_BODY=67108864

export OMNIGATE_PASSPORT_BASE_URL=http://127.0.0.1:5307
export OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088
export OMNIGATE_WALLET_BEARER=dev
export RON_STORAGE_ROC_ECONOMICS_PATH="$(pwd)/configs/roc-economics.dev.toml"
export RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put
export RON_STORAGE_PAID_WRITE_VERIFIER_MODE=dev-header
```

### Probe storage directly

```bash
curl -sS -i \
  -X POST "http://127.0.0.1:5303/paid/o" \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: image/png" \
  -H "Idempotency-Key: cap-probe-storage-$(date +%s)" \
  -H "x-ron-paid-op: hold" \
  -H "x-ron-paid-asset: roc" \
  -H "x-ron-paid-estimate-minor: 25" \
  -H "x-ron-wallet-hold-txid: tx_probe" \
  -H "x-ron-wallet-txid: tx_probe" \
  -H "x-ron-wallet-receipt-hash: b3:0000000000000000000000000000000000000000000000000000000000000000" \
  -H "x-ron-wallet-from: acct_dev" \
  -H "x-ron-wallet-to: escrow_paid_write" \
  --data-binary @"$TMP_BODY"
```

Expected:

```text
200 OK for 2.7 MB test body
```

### Probe Omnigate and gateway

```text
POST http://127.0.0.1:9090/v1/assets/image
POST http://127.0.0.1:8090/assets/image
```

Expected:

```text
200 OK for 2.7 MB body
schema: omnigate.image-asset-upload.v1
```

---

## 9. Video/streaming implication

This session matters for future large video and streaming work.

Important lesson:

```text
Every layer can have its own body cap:
  Tauri command bridge
  svc-gateway
  omnigate
  svc-storage
  Axum extractor defaults
  explicit to_bytes caps
  middleware DefaultBodyLimit caps
```

For future large video uploads:

```text
Do not push huge videos through a single command result or one unbounded buffer.
Use bounded chunks/ranges/segments.
Each layer must state its own cap clearly.
```

Recommended future model:

```text
Images:
  single bounded upload, currently 64 MiB backend cap

Videos:
  chunked upload or segmented media path
  explicit per-chunk cap
  final manifest references chunks/renditions
  each rendition owns b3
  no full-file video through Tauri command result

Live streaming:
  latest-frame/segment proof now
  future: range/segment/WebRTC/HLS/OAP media transport
  keep OAP frame cap separate from HTTP upload cap
```

Important distinction:

```text
OAP max frame = 1 MiB
Streaming chunk target = 64 KiB
HTTP image upload body cap = 64 MiB
These are different caps for different layers.
```

---

## 10. Next-session recommended order

Recommended order for next session:

```text
1. Generate fresh CODEBUNDLE_RS.md and CODEBUNDLE_TAURI_APP.md.
2. Confirm backend image upload cap remains green with one quick 2.7 MB probe.
3. Test real Tauri image upload with 3 MB / 10 MB / maybe 24 MB.
4. Reproduce paid image viewing bug:
   - mint with Wallet A, pay with Wallet B
   - mint with Wallet B, pay with Wallet A
5. Inspect frontend paid image render path.
6. Fix image not rendering after paid unlock.
7. Add rendition group metadata into each image/rendition manifest.
8. Polish image page UI for linked versions.
9. Add/adjust tests/smoke scripts for:
   - large image upload
   - rendition group manifest shape
   - paid image view render after payment
```

---

## 11. Final project state statement

As of this checkpoint:

```text
Backend large image upload path is green up to 64 MiB.
CrabLink Tauri can mint an image bundle with generated renditions.
Manual wallet funding still works.
Bootstrap/funding issue for Wallet A is secondary and probably startup-order related.
Next critical bug is paid image viewing/rendering after payment with a different wallet.
Next product enhancement is storing sibling rendition links inside every rendition manifest.
```

This is a strong checkpoint. The image upload cap problem was a real backend-layer issue, and it is now proven fixed end-to-end through storage, Omnigate, and gateway.


### END NOTE - MAY 27 2026 - 09:10 CST




### BEGIN NOTE - MAY 27 2026 - 12:50 CST


# CrabLink Tauri / RustyOnions carryover notes — Image bundle manifests, paid image view, and manifest cleanup

## 0. Current checkpoint

We are continuing the **CrabLink Tauri Image page** work. The active goal is to make image bundle minting feel polished and product-ready while preserving RustyOnions truth boundaries:

```text
One selected source image
→ CrabLink generates selected renditions
→ original + renditions mint as real backend-returned .image assets
→ every minted image has its own b3 CID and crab://<hash>.image URL
→ every image manifest in the bundle cross-links to every other sibling version
→ paid viewing works from Wallet B
→ manifest display is detailed but less redundant
```

Current state is **much better than before**:

```text
✅ Full dev stack runner exists and mostly works.
✅ Gateway storage upstream env is fixed.
✅ Image upload bundle minting works again.
✅ Generated versions are dimensionally correct.
✅ Generated versions are byte-size correct.
✅ Paid image view works again after Wallet B pays.
✅ Image preview renders through gateway blob / Tauri-safe byte path.
✅ Image page UX is much cleaner than the older developer-heavy layout.
```

The screenshot confirms paid viewing is working again: Wallet B paid 5 ROC, the receipt returned, and the image preview rendered successfully. The developer JSON also confirms the content-view quote/payment path is returning backend payment metadata, wallet receipt data, `asset_cid`, `asset_crab_url`, `manifest_cid`, and receipt hash fields. 

The remaining image-manifest issue:

```text
Only the original crablink/back-reference is appearing in the manifest/page metadata.
The full list of all minted versions is not yet present in each image’s manifest.
```

The prior notes already define the desired state: original, desktop, tablet, mobile, and thumbnail manifests should each know the same complete group of sibling renditions. 

---

## 1. What we proved today

### 1.1 One-command runner works

We created:

```text
scripts/run-tauri-dev-full-stack.sh
```

Purpose:

```text
Start local RustyOnions services + CrabLink Tauri with one command.
```

The script starts:

```text
svc-wallet      → 127.0.0.1:8088
svc-passport    → 127.0.0.1:5307
svc-storage     → 127.0.0.1:5303
svc-index       → 127.0.0.1:5304
omnigate        → 127.0.0.1:9090
svc-gateway     → 127.0.0.1:8090
CrabLink Tauri  → Vite 127.0.0.1:1420 + Tauri native app
```

Important runner fixes already made:

```text
- Fixed Bash arithmetic bug in wait loops.
- Added wallet health wait before funding.
- Added stale Vite/Tauri port cleanup for :1420.
- Added gateway storage env:
  SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303
- Added long service-start timeout for first post-clean builds.
- Added CARGO_INCREMENTAL=0 and CARGO_BUILD_JOBS=2 defaults to reduce disk/incremental bloat.
```

Important operational note:

```text
The runner does NOT run cargo clean.
```

The long rebuild happened because `cargo clean --manifest-path src-tauri/Cargo.toml` was run manually earlier, removing about 2.8 GiB from the Tauri Rust target. The runner itself only kills stale listeners/ports; it does not delete Rust build artifacts.

Current preferred run command:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

Optional environment:

```bash
CARGO_INCREMENTAL=0 CARGO_BUILD_JOBS=2 scripts/run-tauri-dev-full-stack.sh
```

Do not run `cargo clean` unless disk pressure forces it.

---

## 2. Backend / stack facts that must be preserved

### 2.1 Gateway storage upstream was the root cause of paid image rendering failure

We proved:

```text
svc-storage direct /o/b3:<hash> returned image bytes correctly.
svc-gateway /o/b3:<hash> returned 502 storage_connect.
```

The gateway process was missing:

```text
SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303
```

After the runner set that env correctly, gateway raw object fetch worked and paid image rendering recovered.

This must stay in the stack runner and any future dev-stack docs.

### 2.2 Backend upload cap is fixed

The earlier high-resolution upload blocker is resolved. The notes record that a 2,700,000 byte image body now succeeds through:

```text
svc-storage /paid/o
omnigate /v1/assets/image
svc-gateway /assets/image
```

with the current dev cap:

```text
67,108,864 bytes = 64 MiB
```

The relevant launch env must stay:

```text
SVC_GATEWAY_MAX_BODY_BYTES=67108864
OMNIGATE_MAX_BODY_BYTES=67108864
OMNIGATE_MAX_CONTENT_LENGTH=67108864
CRABLINK_DEV_IMAGE_BODY_BYTES=67108864
RON_STORAGE_MAX_BODY=67108864
```

Important doctrine:

```text
HTTP upload body cap may be 64 MiB for dev image uploads.
OAP max frame remains separate and should not be confused with image upload body cap.
```

The IDBs warn against unbounded media transfer and full-file command buffering for larger media, so this is acceptable for the current image proof but not a general media/streaming strategy. 

---

## 3. Image page state

### 3.1 Current UI status

The image page now has the right product direction:

```text
crab://image
Mint an image

Simple visible flow:
  select image
  preview
  title
  description
  quote
  explicit ROC hold/confirm
  mint result

Advanced collapsed:
  tags
  alt text
  source/provenance
  rights/use-case hints
  rendition preferences
  local rendition preview
  manifest preview
  developer JSON
```

The existing notes describe this desired UX: simple mint should stay the default, with advanced fields tucked away. 

### 3.2 Bundle minting works

Confirmed from screenshot and live test:

```text
Original image minted.
Desktop rendition minted.
Tablet rendition minted.
Mobile rendition minted.
Thumbnail rendition minted.
Receipt returned.
Every displayed crab URL came from a backend upload response.
Dimensions are correct.
Byte sizes are correct.
```

Earlier example bundle shape:

```text
Original: 2.70 MB image/png
Desktop: 1448×1086, 3.30 MB
Tablet: 1280×960, 2.54 MB
Mobile: 768×576, 1.03 MB
Thumbnail: 320×320, 26.57 KB
```

The carryover notes already say this page should become the reference model for other creator pages because it is much cleaner than before. 

---

## 4. Current manifest problem

### 4.1 What is currently happening

The current minted rendition manifests appear to have only a **back-reference** to the original image, not the full sibling list.

The developer JSON for the thumbnail route shows the current structure coming back inside `asset_page`:

```text
description:
  "... Thumbnail generated rendition. Original image: crab://<original>.image Original CID: b3:<original>"

tags:
  image
  creator
  rendition
  role:thumbnail
  original:b3:<original>
```

That proves the current manifest/page metadata has a back-reference to original, but not the full `rendition_group.renditions[]` block. 

### 4.2 Desired behavior

Every image in the bundle should include the same complete rendition group:

```text
Original manifest:
  knows original/self
  knows desktop
  knows tablet
  knows mobile
  knows thumbnail

Desktop manifest:
  knows original
  knows desktop/self
  knows tablet
  knows mobile
  knows thumbnail

Tablet manifest:
  knows original
  knows desktop
  knows tablet/self
  knows mobile
  knows thumbnail

Mobile manifest:
  knows original
  knows desktop
  knows tablet
  knows mobile/self
  knows thumbnail

Thumbnail manifest:
  knows original
  knows desktop
  knows tablet
  knows mobile
  knows thumbnail/self
```

The prior notes include the recommended structure with `rendition_group`, `group_id`, `source_cid`, `canonical_crab_url`, and a `renditions[]` array containing every role, CID, crab URL, MIME type, byte length, width, and height. 

---

## 5. Desired manifest model for next session

Use this as the target structure.

```json
{
  "schema": "crablink.image-asset.v1",
  "kind": "image",
  "asset_cid": "b3:<self>",
  "crab_url": "crab://<self>.image",
  "title": "Creator title",
  "description": "User-authored description only",
  "content_type": "image/png",
  "byte_length": 26570,
  "width": 320,
  "height": 320,
  "owner": {
    "passport_subject": "passport:main:dev",
    "wallet_account": "acct_dev"
  },
  "storage": {
    "available": true,
    "raw_url": "/o/b3:<self>",
    "content_type": "image/png"
  },
  "rendition": {
    "role": "thumbnail",
    "label": "Thumbnail",
    "is_original": false,
    "derived_from": "b3:<original>",
    "canonical_original": "crab://<original>.image"
  },
  "rendition_group": {
    "schema": "crablink.image-rendition-group.v1",
    "group_id": "b3:<original-or-bundle-root>",
    "source_cid": "b3:<original>",
    "canonical_crab_url": "crab://<original>.image",
    "renditions": [
      {
        "role": "original",
        "label": "Original",
        "cid": "b3:<original>",
        "crab_url": "crab://<original>.image",
        "mime": "image/png",
        "bytes": 2700000,
        "width": 3000,
        "height": 2000
      },
      {
        "role": "desktop",
        "label": "Desktop",
        "cid": "b3:<desktop>",
        "crab_url": "crab://<desktop>.image",
        "mime": "image/png",
        "bytes": 3300000,
        "width": 1448,
        "height": 1086
      },
      {
        "role": "tablet",
        "label": "Tablet",
        "cid": "b3:<tablet>",
        "crab_url": "crab://<tablet>.image",
        "mime": "image/png",
        "bytes": 2540000,
        "width": 1280,
        "height": 960
      },
      {
        "role": "mobile",
        "label": "Mobile",
        "cid": "b3:<mobile>",
        "crab_url": "crab://<mobile>.image",
        "mime": "image/png",
        "bytes": 1030000,
        "width": 768,
        "height": 576
      },
      {
        "role": "thumbnail",
        "label": "Thumbnail",
        "cid": "b3:<thumbnail>",
        "crab_url": "crab://<thumbnail>.image",
        "mime": "image/png",
        "bytes": 26570,
        "width": 320,
        "height": 320
      }
    ]
  },
  "receipts": [
    {
      "kind": "paid_storage",
      "receipt_hash": "b3:<receipt>"
    }
  ]
}
```

Important:

```text
description should stay user-authored.
Do not stuff original URL/CID into description once structured fields exist.
Do not rely on tags like original:b3:<hash> as the real relationship model.
Tags may remain for search/display, but the rendition_group is the durable relationship.
```

---

## 6. Manifest cleanup / redundancy reduction target

The user wants manifests to stay **detail rich** but less repetitive.

Current problem areas:

```text
- asset_cid appears in many places.
- asset_crab_url appears in quote, payment, target, summary, raw, receipt.
- content_view quote and payment data are repeated in multiple nested raw blocks.
- asset page repeats original URL/CID in the human description.
- tags repeat structured facts like role and original pointer.
- top asset panels show canonical URL, content ID, hash, content object ID, raw URL in separate places.
- some fields show “manifest CID not returned” while paid content JSON has a manifest_cid elsewhere.
```

Next session should distinguish:

```text
Display summary:
  compact, deduped, human-readable

Developer JSON:
  full backend response, collapsed by default

Manifest:
  structured, durable, not bloated with repeated copies

Receipt display cache:
  display-only copy of backend receipt metadata
```

### Recommended UI display cleanup

For image asset pages, display:

```text
Hero summary:
  title
  kind/image role
  crab URL
  owner
  paid/unlocked status
  copy buttons

Preview:
  image

Image versions:
  compact rendition table/card list
  role | dimensions | bytes | crab URL | copy/open
  mark current/self row

Storage:
  available yes/no
  content type
  raw URL
  size

Receipts:
  paid storage receipt
  content view receipt if present

Developer:
  collapsed raw asset JSON
  collapsed content_view JSON
  collapsed gateway diagnostics
```

Avoid separate duplicated panels for every equivalent CID/hash unless they add a distinct meaning.

---

## 7. Important architecture decision for rendition manifests

There are two possible implementation paths next session.

### Option A — Short-term proof path

Current proof behavior:

```text
Frontend/Tauri generates renditions locally.
Frontend uploads original and each rendition separately.
Each upload gets a backend-returned crab URL.
Frontend builds a bundle display map after all uploads.
```

Short-term manifest cross-link can be added by:

```text
1. Pre-hash original + all generated rendition bytes with Tauri Rust / BLAKE3.
2. Build a full predicted rendition_group before uploads.
3. Send that rendition_group with every image upload.
4. Backend stores it into each image manifest only if that manifest’s self CID appears in the group.
5. Frontend verifies backend-returned CID matches predicted CID.
6. Asset page reads and displays rendition_group from the hydrated asset manifest.
```

Risks:

```text
- Header size if the group is sent as an HTTP header.
- Partial failures if original uploads but one rendition fails.
- Current proof may reuse one hold for multiple uploads; this is acceptable only as a temporary dev proof if the backend policy accepts it, but should not become final product economics.
- Some partial patch attempts may already exist in the working tree; inspect before editing.
```

### Option B — Correct long-term path

The better long-term path is a backend-supported route:

```text
POST /assets/image/bundle/prepare
POST /assets/image/bundle
```

The backend/gateway/omnigate route would:

```text
- accept bundle metadata
- price the whole bundle explicitly
- require one explicit user confirmation
- hold/capture/release correctly
- upload/store original + renditions
- write every per-image manifest with the same rendition_group
- return all crab URLs and receipt data
- fail or settle consistently if a rendition upload fails
```

This is cleaner for accounting, receipts, and durability.

Recommended next-session approach:

```text
Use short-term proof only if we want to finish the current UI quickly.
Document that the final product wants a backend bundle route.
Do not hide multiple paid actions from the user.
Do not fake receipts or fake relationships.
```

---

## 8. Partial patch state warning

A patch attempt was made to add richer rendition manifest support, but it failed partway with:

```text
Could not find summarizeAsset return marker.
```

Because the patch was a multi-file Python patch, assume the working tree may be **partially modified**.

Next session must begin with:

```bash
cd /Users/mymac/Desktop/crablink
git diff -- apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
git diff -- apps/crablink-tauri/src/shared/api/assetClient.js
git diff -- apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
git diff -- apps/crablink-tauri/src-tauri/src/commands/assets.rs
git diff -- apps/crablink-tauri/src-tauri/src/lib.rs
git diff -- apps/crablink-tauri/src-tauri/Cargo.toml

cd /Users/mymac/Desktop/RustyOnions
git diff -- crates/omnigate/src/routes/v1/assets.rs
```

Do not assume all intended changes landed.

Known likely partial changes:

```text
- assetClient.js may include hashImageAssetBytes / rendition group header helpers.
- Tauri Cargo.toml may include blake3.
- Tauri assets.rs may include hash_image_asset_bytes.
- Tauri lib.rs may register the command.
- ImagePublishFlow.jsx may be partially changed.
- AssetHydratedView.jsx likely did not receive the full normalizeRenditionGroup/summarizeAsset patch.
- omnigate assets.rs may or may not include rendition_group header storage support.
```

Before making next changes, generate a fresh codebundle:

```bash
cd /Users/mymac/Desktop/crablink
bash scripts/make_codebundle.sh

cd /Users/mymac/Desktop/RustyOnions
# use the current RustyOnions codebundle generator if needed
```

---

## 9. Current developer JSON observation

The uploaded developer JSON for a paid thumbnail view confirms:

```text
target.hash = 48629c4c...
target.kind = image
state = paid
quote ok = true
payment ok = true
content_view price = 5 ROC
payer = acct_visitor_b
recipient = acct_dev
asset_page.content_type = image/png
asset_page.description contains “Thumbnail generated rendition. Original image: ... Original CID: ...”
asset_page.tags include rendition, role:thumbnail, original:b3:<original>
manifest_cid is present in content_view quote/payment data
```

The key missing piece:

```text
No visible full rendition_group.renditions[] block in the pasted JSON.
```

That matches the screenshot and user observation: only the original link/back-reference appears, not every minted version. 

---

## 10. Files to inspect next session

### CrabLink Tauri frontend

```text
apps/crablink-tauri/src/pages/image/ImagePage.jsx
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
apps/crablink-tauri/src/pages/image/ImageManifest.jsx
apps/crablink-tauri/src/pages/image/ImageRenditions.jsx
apps/crablink-tauri/src/pages/image/imageRenditionGenerator.js
apps/crablink-tauri/src/pages/image/imageDraftModel.js
apps/crablink-tauri/src/shared/api/assetClient.js
apps/crablink-tauri/src/pages/asset/AssetPage.jsx
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/shared/manifest/renditionGroups.js
apps/crablink-tauri/src/shared/manifest/uniformManifest.js
```

### CrabLink Tauri Rust

```text
apps/crablink-tauri/src-tauri/src/commands/assets.rs
apps/crablink-tauri/src-tauri/src/lib.rs
apps/crablink-tauri/src-tauri/Cargo.toml
```

### RustyOnions backend

```text
crates/omnigate/src/routes/v1/assets.rs
crates/omnigate/src/routes/v1/content_view.rs
crates/svc-gateway/src/routes/product.rs
crates/svc-storage/src/http/routes/paid_object.rs
crates/ron-proto/src/... if formal DTOs are introduced later
```

---

## 11. Testing plan for next session

### 11.1 Baseline checks

```bash
cd /Users/mymac/Desktop/crablink
bash scripts/check-tauri.sh
```

```bash
cd /Users/mymac/Desktop/RustyOnions
cargo test -p omnigate --test image_asset_prepare
cargo test -p svc-gateway --test product_routes_proxy
```

If disk pressure returns:

```bash
df -h /
rm -rf /Users/mymac/Desktop/RustyOnions/target/debug/incremental
rm -rf /Users/mymac/Desktop/crablink/apps/crablink-tauri/src-tauri/target/debug/incremental
rm -rf /tmp/crablink-tauri-dev-*
```

Avoid full `cargo clean` unless absolutely needed.

### 11.2 Runtime smoke

Start:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

Then smoke manually:

```text
1. Open crab://image.
2. Select source image.
3. Generate auto versions.
4. Mint image bundle.
5. Confirm result card lists:
   - original
   - desktop
   - tablet
   - mobile
   - thumbnail
6. Open original crab URL.
7. Confirm original manifest page shows full rendition group.
8. Open desktop crab URL.
9. Confirm desktop manifest page shows same full rendition group and marks desktop/self.
10. Repeat for tablet/mobile/thumbnail.
11. Switch to Wallet B.
12. Pay 5 ROC to view one image.
13. Confirm image renders.
14. Confirm content_view receipt is backend-derived.
15. Inspect developer JSON and confirm rendition_group is present.
```

### 11.3 Expected JSON assertion

For every minted image page:

```text
data.rendition_group.renditions.length >= 5
data.rendition_group.renditions includes role=original
data.rendition_group.renditions includes role=desktop
data.rendition_group.renditions includes role=tablet
data.rendition_group.renditions includes role=mobile
data.rendition_group.renditions includes role=thumbnail
current self CID appears exactly once in renditions
canonical_crab_url points to original
source_cid points to original
```

### 11.4 Negative tests

```text
If a rendition upload fails:
  do not display fake link
  do not claim complete bundle
  show partial failure clearly
  keep backend-returned successful links visible
  mark bundle relationship incomplete

If backend CID does not match predicted CID:
  fail closed
  do not write/display rendition_group
  show exact mismatch

If paid view receipt is absent:
  do not render paid image bytes from cache alone

If gateway /o/b3:<hash> returns JSON/problem:
  display gateway byte fetch diagnostic
  do not show broken image silently
```

---

## 12. Manifest UX cleanup principles

Next session should clean the manifest page without stripping useful truth.

### Keep visible

```text
crab URL
CID
kind
role/self rendition
original/canonical pointer
dimensions
byte size
content type
owner passport
owner wallet/payout
storage availability
paid receipt summary
content view receipt summary
rendition group table
copy/open buttons
```

### Move behind details

```text
full gateway response
full content_view quote raw JSON
full content_view payment raw JSON
full wallet_receipt raw object
route diagnostics
attempt lists
correlation IDs
ledger root details
```

### Avoid repeating

```text
same CID in five places
same crab URL in five places
same wallet receipt in three places
same manifest CID in quote/payment/receipt panels
same original URL inside description, tags, and structured fields
```

Use one visible field plus raw JSON for auditing.

---

## 13. Invariants to preserve

```text
Tauri is primary.
Chrome remains proof/companion.
Gateway-first.
React owns display and user intent only.
Tauri Rust owns native/binary bridge work.
No fake b3 CIDs.
No fake crab URLs.
No fake receipts.
No fake balances.
No silent ROC spend.
Every paid action must be explicit.
Every minted image/rendition URL must come from the backend.
Every rendition remains its own canonical b3-backed asset.
The rendition group is metadata/reference graph, not a replacement for b3 truth.
Wallet mutation remains through svc-wallet.
Ledger truth remains ron-ledger.
Cache/display data cannot unlock paid content alone.
No arbitrary crab:// execution.
No QuickChain/ROX/Solana/external settlement creep.
```

The notes repeatedly emphasize that every generated version must still be a real b3-backed `.image` asset and that album covers, thumbnails, posters, and other future uses are image roles/use-cases, not new asset kinds. 

---

## 14. Suggested next-session opening prompt

Use this next time:

```text
We are continuing CrabLink Tauri image bundle manifest work. Current status: the full-stack runner works, gateway storage upstream is fixed, image bundle minting works, generated image versions are correct dimensionally and byte-wise, and paid image view works again through Wallet B. The remaining issue is that each minted image/rendition manifest only has a back-reference to the original image in description/tags, not the full rendition_group block listing original/desktop/tablet/mobile/thumbnail.

Before coding, inspect git diff because the prior rendition_group patch partially applied and failed at “Could not find summarizeAsset return marker.” We need to make every image manifest in a bundle contain the same complete rendition_group.renditions array while keeping each image its own canonical b3 asset. We also need to clean up the manifest display so it stays detail-rich but less redundant. Do not fake b3, crab URLs, receipts, balances, or paid unlocks. Keep Tauri primary, gateway-first, backend truth authoritative, and no silent spend.
```

This is the best stopping point: image minting and paid viewing are green again; next session should focus only on durable rendition manifest cross-linking and manifest UI cleanup.


### END NOTE - MAY 27 2026 - 12:50 CST

### PRIVACY TODO - MAY 27 2026 - 15:25 CST

Yes, I agree with your instinct: **strip sensitive metadata by default, but do not blindly strip everything.**

The best policy for CrabLink is probably:

```text
Default: privacy-safe publish
Advanced: preserve selected creator metadata
Always: warn before publishing exact original metadata
```

For images, I would strip by default:

```text
GPS / location
camera serial numbers
device owner names
software paths
EXIF maker notes when they may leak device info
capture timestamps if user chooses extra privacy
```

For video, I would strip by default:

```text
GPS / location atoms
device/camera identifiers
creation location
creator machine/software path fields
private QuickTime/iPhone metadata
```

For music and indie film, I would **not** automatically destroy useful public metadata like:

```text
artist
title
album/project
copyright
ISRC/UPC if present
cover art
credits
chapters
subtitle tracks
language labels
```

A better long-term CrabLink model is: put important creator/provenance fields into the **manifest**, not hidden file metadata. The file can be privacy-clean, while the manifest intentionally says:

```text
creator
title
rights
credits
license
release date
renditions
source relationship
```

The big b3 issue is important: **if we strip metadata, the bytes change, so the CID changes.** That means CrabLink must be honest in the UI:

```text
Selected source file ≠ published canonical file if metadata was stripped.
Published original = privacy-clean canonical original.
```

I would avoid backend byte mutation. The cleanest architecture is:

```text
CrabLink Tauri detects metadata
→ shows a privacy report
→ strips/keeps based on creator choice
→ computes/uploads the final bytes
→ backend stores exactly those bytes by b3
```

The backend can later reject dangerous uploads or warn on geodata, but `svc-storage` should not silently rewrite bytes after upload because that breaks predicted CIDs and content-addressed truth.

My opinion: **mandatory default geodata stripping is the right call.** Allow an advanced “keep location metadata” override only with a strong warning, because there are rare cases where location is part of the work, but most normal users will not realize they are publishing where a photo/video was taken.

A good UX would be:

```text
Privacy cleanup: On by default
[✓] Remove location data
[✓] Remove device identifiers
[✓] Remove hidden app/system metadata
[ ] Preserve creator credits/tags when safe
[Advanced] Publish exact original metadata
```

So no, stripping metadata is not going too far — **stripping all metadata blindly is going too far**. The right answer is a privacy-preserving sanitizer with creator-controlled preservation of intentional public metadata.


### END PRIVACY TODO NOTE - MAY 27 2026 - 15:25 CST


### BEGIN NOTE - MAY 27 2026 - 15:40 CST

### BEGIN CARRYOVER NOTES — MAY 27 2026 — CrabLink Tauri image completion, image metadata stripping, and video rendition roadmap

## 0. Current checkpoint

We are at a very good stopping point for the **CrabLink Tauri image page**.

The image page is now close to the desired product shape:

```text
✅ Image bundle minting works.
✅ Original + generated sizes mint as real backend-returned .image assets.
✅ Each version receives its own b3 CID and crab://<hash>.image URL.
✅ Paid image viewing works again with Wallet B.
✅ The image preview renders after backend content_view payment receipt.
✅ The original image crab URL appears correctly.
✅ The full rendition/sibling group now appears in the image manifest/page.
✅ The rendition group UI is now clean and useful.
✅ The UI style is very close to final and should be used as the reference pattern for video.
```

The main remaining image task is now:

```text
Add privacy-safe metadata stripping for image uploads.
```

After that, images can probably be considered mostly complete, aside from final polish/tiny UI tweaks.

---

## 1. What we accomplished for images

### 1.1 Image bundle minting is working

The current flow supports a creator selecting one image and minting a bundle of generated image versions.

Current conceptual flow:

```text
selected source image
→ generated original/desktop/tablet/mobile/thumbnail variants
→ each uploaded through backend paid publish path
→ each receives backend-returned CID + crab:// URL
→ each manifest/page exposes the sibling rendition group
```

Important product result:

```text
The creator gets a family of real image assets, not fake local-only variants.
```

Each version is still canonical b3 truth as its own object.

---

### 1.2 Paid image view works again

The screenshots confirmed that Wallet B can pay for a minted image and unlock/render the preview.

Important invariant preserved:

```text
The app does not unlock from cache alone.
The image preview appears only after backend content_view payment returns receipt metadata.
```

The receipt display is display-only. The backend wallet/ledger path remains the source of truth.

---

### 1.3 Rendition group metadata now appears

We fixed the earlier issue where only the original/back-reference appeared in the page/manifest display.

Current desired manifest/page behavior is now working:

```text
original page shows all siblings
desktop page shows all siblings
tablet page shows all siblings
mobile page shows all siblings
thumbnail page shows all siblings
```

Each page should be able to show:

```text
group ID
source CID
canonical original crab URL
current role
all sibling rows
each sibling CID
each sibling crab URL
dimensions
byte size
MIME type
open/copy controls
raw rendition_group JSON in collapsible developer view
```

Important note for future debugging:

```text
Fresh mints are required to test this correctly.
Old mints created before the rendition_group work may not contain the structured group metadata.
```

---

### 1.4 Image page UI is now the reference design for video

The current image rendition group UI is close to ideal:

```text
Clean card layout
Role badge
Crab URL + CID
Facts for dimensions/size/type
Open button
Copy URL
Copy CID
Collapsible raw JSON
```

This should become the model for video rendition groups, except video will need additional fields:

```text
duration
codec
audio codec
container
bitrate
frame rate
poster/thumbnail link
range/segment support later
```

User preference:

```text
The video page should use the same or very similar UI language as the image page.
```

---

## 2. Important architecture boundaries to preserve

### 2.1 CrabLink Tauri is the client, not the backend

CrabLink Tauri may:

```text
generate local previews
prepare local files
sanitize metadata before upload
resize images client-side
eventually encode video client-side
call gateway routes
display backend truth
cache display receipts
```

CrabLink Tauri must not:

```text
invent CIDs after backend disagrees
invent receipts
invent balances
mutate ledger truth
unlock paid content from cache alone
act as storage authority
act as wallet authority
silently spend ROC
```

---

### 2.2 Backend truth remains backend truth

Correct ownership remains:

```text
svc-storage stores bytes by b3 content ID.
svc-index resolves pointers/names.
svc-gateway is the public route boundary.
omnigate hydrates product views.
svc-wallet is the wallet mutation front-door.
ron-ledger is durable economic truth.
CrabLink displays/request actions only.
```

---

### 2.3 Metadata stripping must happen before upload

This is critical.

If the app strips metadata, the bytes change. If the bytes change, the b3 CID changes.

Therefore the correct flow is:

```text
user selects source file
→ CrabLink inspects metadata
→ CrabLink shows privacy report
→ CrabLink strips/keeps metadata according to settings
→ cleaned bytes become the canonical publish bytes
→ b3 prediction/prepare/upload use those cleaned bytes
→ backend stores exactly those bytes
→ manifest discloses privacy-cleaned source relationship
```

Wrong flow:

```text
upload raw bytes
→ backend silently rewrites metadata
→ CID mismatch / broken content-addressed truth
```

Do not silently mutate bytes server-side after the client predicts or submits CIDs.

---

## 3. Next session primary task: image metadata stripping

### 3.1 Goal

Add a privacy-safe image metadata cleanup path that runs before image minting.

Default product behavior should be:

```text
Privacy cleanup: ON
Remove geolocation: ON
Remove device identifiers: ON
Remove hidden app/system metadata: ON
Preserve intentional creator metadata through the manifest, not hidden EXIF.
```

---

### 3.2 What to strip by default for images

Default stripping should remove:

```text
GPS latitude/longitude/altitude
GPS timestamps
camera serial number
lens serial number
device owner name
author fields if hidden/unintended
software paths
local file paths
EXIF maker notes when likely to leak device/private data
thumbnail EXIF blobs if they contain hidden data
possibly capture timestamp, depending on privacy setting
```

Recommended default:

```text
Always remove geodata.
Always remove device serial / owner / local path metadata.
Make capture timestamp removal configurable.
```

Rationale:

```text
Geodata is the highest-risk accidental privacy leak.
A normal creator may not realize an image exposes where it was taken.
```

---

### 3.3 What not to blindly destroy

Do not blindly destroy useful creator information if it is intentionally public.

However, for images specifically, most public-facing creator info should move to the CrabLink manifest:

```text
title
description
creator
rights/license
tags
credit
source relationship
release context
```

The image file itself can be privacy-clean while the manifest carries intentional public metadata.

---

### 3.4 UI requirements for image metadata cleanup

Add a small but clear privacy panel to the image upload/create flow.

Suggested UX:

```text
Privacy cleanup
On by default

✓ Remove location data
✓ Remove device identifiers
✓ Remove hidden app/system metadata
□ Remove capture date/time
□ Preserve safe creator metadata, if detected
Advanced: Publish exact original metadata
```

The “publish exact original metadata” option should require a strong warning.

Suggested warning language:

```text
Exact original metadata may reveal location, device, software, timestamps, or private creator information. Use only if you intentionally want the file metadata preserved.
```

---

### 3.5 Manifest disclosure for sanitized images

The manifest should honestly record that the published bytes were cleaned.

Suggested structured fields, names can be adjusted to match existing manifest helpers:

```json
{
  "privacy": {
    "metadata_policy": "privacy_cleaned",
    "removed": ["gps", "device_identifiers", "software_paths", "maker_notes"],
    "kept": ["none"],
    "source_file_was_rewritten_before_publish": true
  }
}
```

For exact-original mode:

```json
{
  "privacy": {
    "metadata_policy": "exact_original_metadata_requested",
    "warning_acknowledged": true
  }
}
```

Important wording:

```text
Published original = canonical privacy-cleaned original
Selected source file = local file the creator chose
```

Do not imply the b3 CID belongs to the raw unmodified local file if metadata was stripped.

---

### 3.6 Image metadata testing checklist

After implementation, test:

```text
1. Upload image with known GPS EXIF.
2. Confirm privacy panel detects/flags geodata.
3. Mint with cleanup ON.
4. Confirm minted CID is based on cleaned bytes.
5. Confirm paid view still works.
6. Confirm rendition group still works.
7. Confirm downloaded/rendered image no longer contains GPS.
8. Confirm manifest says privacy_cleaned.
9. Confirm exact-original advanced mode is possible only after warning.
10. Confirm no fake receipts/balances were introduced.
```

---

## 4. After images: begin video page cleanup and video rendition system

### 4.1 Product goal for video

Use the image page as the product reference.

Video should support:

```text
one selected source video
→ one canonical publish version
→ optional generated device renditions
→ each rendition minted as a real .video asset
→ every video manifest cross-links to every sibling version
→ paid viewing works through backend receipt
→ page displays clean rendition group UI
```

---

### 4.2 MP4 should be the default format

User preference / project direction:

```text
MP4 should be the default creator-facing video output format because it is the most broadly compatible.
```

Recommended default target:

```text
container: MP4
video: H.264
audio: AAC
```

Advanced/import formats can still be accepted where supported:

```text
WebM
MOV
M4V
Ogg/Theora
other browser/native-supported sources
```

But the product-facing default should be:

```text
“Publish as MP4”
```

---

### 4.3 Client-side video processing is preferred for the early product

The desired direction is:

```text
CrabLink Tauri does the heavy video resizing/conversion locally
→ backend stores final bytes by b3
→ backend does not have to transcode every creator upload
```

This is the right instinct because it reduces early backend complexity and cost.

However, this must be done carefully:

```text
No arbitrary shell commands from Tauri.
No unsafe “run ffmpeg command string” bridge.
No unbounded command results with full video bytes.
No fake claims that every machine can encode every format.
No silent client-side rewrite without user awareness.
```

The correct framing is:

```text
Client-side controlled media preparation
not
server-side silent transcode
not
arbitrary local command execution
```

---

### 4.4 Important caution: MP4 encoding client-side is non-trivial

This will likely be a heavier code batch than image resizing.

Reasons:

```text
image resizing can use canvas/blob paths
video resizing requires decoding frames, scaling, encoding, muxing, and preserving audio
MP4/H.264/AAC browser encoding support may vary by platform
MediaRecorder often outputs WebM depending on browser/runtime
ffmpeg.wasm is possible but heavy
native Tauri/Rust encoding adapters may be better but must be controlled and feature-gated
```

Next session should not assume this is a tiny patch.

Recommended implementation posture:

```text
Start with feasibility and staged rollout.
Do not build an OBS/Adobe/FFmpeg clone all at once.
```

---

## 5. Recommended staged video plan

### Phase V1 — Video UI cleanup first

Before heavy encoding, make the video page match the image page quality.

Tasks:

```text
clean developer clutter
make paid view section clear
make source/manifest facts readable
add modern preview/player card
add video truth boundary messaging
add collapsible developer JSON
style page like image page
```

Goal:

```text
Video page feels as polished as image page before adding heavy processing.
```

---

### Phase V2 — Video rendition manifest/display support

Add video rendition group display first, even if renditions are manually or simply generated.

Manifest/page should support:

```text
video_rendition_group
renditions[]
role
label
cid
crab_url
container
mime
width
height
duration
bytes
video_codec
audio_codec
bitrate
frame_rate
poster_image_cid
thumbnail_image_cid
derived_from
canonical_original
is_original
```

UI should mirror image rendition card:

```text
Role badge
Crab URL + CID
resolution/duration/size/type
codec facts
Open/Copy buttons
Raw JSON collapse
```

---

### Phase V3 — Client-side video metadata stripping

Before resizing/encoding, add metadata privacy cleanup for video.

Default strip:

```text
GPS/location atoms
creation location
device/camera identifiers
software paths
local machine/app metadata
private QuickTime/iPhone metadata
serial numbers
```

Preserve or move to manifest:

```text
title
creator
credits
copyright
license
project name
subtitle/language labels, if intentional
```

Important:

```text
For indie filmmakers, some metadata can be meaningful.
Do not blindly destroy intentional public metadata.
```

Best approach:

```text
strip privacy-sensitive metadata by default
preserve creator-facing fields only if user explicitly opts in
write intentional information into CrabLink manifest
```

---

### Phase V4 — Client-side MP4 preparation

Target product action:

```text
Prepare MP4 versions
```

Suggested default output ladder:

```text
source/original cleaned MP4
1080p desktop, if source is >=1080p
720p standard
480p mobile
360p low-bandwidth/mobile
poster image
thumbnail image
```

Do not generate renditions larger than the source.

Example:

```text
source is 720p
→ original/source
→ 720p
→ 480p
→ 360p
→ poster/thumbnail
not 1080p
```

---

### Phase V5 — Mint video bundle

Once generated locally:

```text
each video file uploads/mints as a real .video asset
poster/thumbnail may mint as .image assets or linked image auxiliaries
every video manifest gets full video_rendition_group
each video page can show all siblings
paid view uses backend content_view receipt
```

The bundle mint flow should follow the image approach:

```text
prepare/quote
explicit confirmation
backend wallet path
backend receipt
upload/publish
backend-returned CIDs
manifest/rendition group hydration
paid unlock/render
```

No silent spend.

---

## 6. Possible technical approaches for client-side MP4

Next session should evaluate one of these carefully.

### Option A — Browser/Web APIs where supported

Pros:

```text
uses platform capabilities
no giant dependency
can be good for previews/simple exports
```

Cons:

```text
MP4/H.264/AAC encoding support may vary
MediaRecorder may prefer WebM
muxing support may be inconsistent
hard to guarantee universal MP4 output
```

---

### Option B — ffmpeg.wasm in a worker

Pros:

```text
predictable format conversion
can produce MP4/H.264/AAC-like workflows depending on build
works fully client-side
```

Cons:

```text
large dependency
high CPU/memory
slow for long videos
licensing/build considerations
bad for low-power machines
must be bounded and cancellable
```

Important invariant:

```text
If used, it should run in a worker-like bounded job with progress/cancel.
Do not block the main UI.
Do not pass huge bytes through Tauri command results.
```

---

### Option C — Controlled Tauri native media adapter

Pros:

```text
better performance
can use platform-native encoders
better for desktop app long term
```

Cons:

```text
platform-specific complexity
requires careful Rust/Tauri bridge design
must not become arbitrary command execution
more testing burden
```

Allowed shape:

```text
tauri command: prepare_video_renditions(request)
request is typed/bounded/allowlisted
output is file handles/paths or staged local artifacts
no shell/eval/raw command
no secrets
redacted errors
progress events
cancel support
```

Forbidden shape:

```text
tauri command: run_ffmpeg(command_string)
```

---

## 7. Recommended video implementation strategy

Best path:

```text
1. Clean video UI.
2. Add video rendition_group display support.
3. Add video metadata scan/strip UX.
4. Add simple poster/thumbnail generation first.
5. Add “keep original MP4 cleaned” path.
6. Add one generated lower-resolution MP4 path.
7. Expand to full ladder after first proof.
```

Avoid trying to ship this all in one giant patch.

First practical video proof could be:

```text
source MP4
→ cleaned original MP4
→ 480p MP4
→ poster image
→ thumbnail image
→ mint as bundle
→ display rendition group
→ paid view works
```

Then expand to:

```text
1080p / 720p / 480p / 360p
```

---

## 8. Metadata policy across asset kinds

### 8.1 Global policy

CrabLink should become privacy-safe by default:

```text
default: strip sensitive metadata
advanced: preserve selected metadata
manifest: intentional public metadata
```

This should apply to:

```text
image
video
music
podcast
possibly documents later
```

---

### 8.2 Music/podcast nuance

Do not blindly strip all audio metadata.

Music creators may need:

```text
artist
title
album
track number
cover art
ISRC
UPC
copyright
lyrics markers
credits
genre
release date
```

Podcast creators may need:

```text
episode title
show title
chapter markers
cover art
author
copyright
description
language
```

But still strip sensitive/private fields:

```text
local file paths
device identifiers
software/private workstation metadata
geolocation if present
hidden comments not intended for publishing
```

The right model:

```text
privacy-sensitive metadata is stripped by default
creator/public metadata is preserved only intentionally
important public fields also go into the CrabLink manifest
```

---

## 9. Testing/gates for next sessions

### 9.1 Standard runner

Use:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

The runner starts the local RustyOnions services and CrabLink Tauri.

---

### 9.2 Image final test checklist

After metadata stripping:

```text
fresh image with EXIF GPS
privacy cleanup ON
mint bundle
verify all versions render
verify rendition group is present on each version
verify paid view with Wallet B works
verify no GPS remains in published bytes
verify manifest records privacy cleanup
verify old exact-original advanced mode requires warning
run build/check gates
```

---

### 9.3 Video future test checklist

For the video work:

```text
import MP4 source
scan metadata
strip privacy-sensitive metadata
generate poster/thumbnail
generate at least one lower-resolution MP4
mint bundle
open each .video page
verify rendition group display
pay from Wallet B
verify paid playback
verify no full-file giant Tauri command result path
verify backend returns real CIDs/receipts
```

---

## 10. Important UI/product preferences to preserve

The user is happy with the current image UI.

Preserve this design language:

```text
clean cards
rounded borders
readable facts
big clear copy/open controls
minimal developer clutter
developer JSON collapsible
truth boundary messages
paid/unpaid state clearly visible
same light/dark theme behavior
```

Use the image page as the video UI template.

The video page should not look like a developer test harness. It should look like a product page.

---

## 11. Known project preferences to remember

```text
Do not provide downloadable artifact files for code patches.
Provide paste-ready code directly in chat.
Prefer exact paths and full files when code is requested.
Tauri is primary.
Chrome remains green proof/companion.
Gateway compatibility first.
ROC is internal.
Do not introduce external settlement/QuickChain/Solana/ROX here.
Do not use “ROC minor” in UI/user-facing copy unless wire compatibility requires it.
No fake balances.
No fake receipts.
No silent spend.
No arbitrary shell/native run commands.
```

---

## 12. Next-session recommended opening plan

Start next session with:

```text
Task 1: finish image metadata stripping
Task 2: final image UI sanity pass
Task 3: begin video page UI cleanup using image page as reference
Task 4: design video metadata/rendition manifest fields
Task 5: prototype client-side MP4 feasibility path cautiously
```

Do **not** jump straight into full video transcoding without first deciding the safe local encoding approach.

The safe order is:

```text
image metadata cleanup
→ image final gate
→ video UI polish
→ video manifest/rendition display
→ video metadata cleanup
→ MP4 client-side encoding/resizing prototype
→ video bundle minting
```

### END CARRYOVER NOTES


### END NOTE - MAY 27 2026 - 15:40 CST


### BEGIN NOTE - MAY 28 2026 - 09:05 CST

Below are the carryover notes for the next session.

# CrabLink Tauri Carryover Notes — Images Manifest Finish → Video Page Start

## Current run path

Use this as the default local dev startup unless debugging needs split terminals:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

This script runs both the RustyOnions backend stack and CrabLink Tauri frontend.

## Current priority for next session

The immediate next session should **finish the image resolved/manifest page display**, then move to the video page.

The image minting form itself is in good shape. Do **not** redesign the image minting page unless absolutely necessary. The advanced form is good as-is. The remaining issue is the **resolved image asset page layout and display of image manifest data**.

## Image work accomplished so far

We made excellent progress on image minting and image privacy handling.

The current image flow now does this:

```text
select source image
→ strip/clean metadata locally
→ verify cleaned bytes before quote/mint
→ generate image versions from the privacy-cleaned source
→ predict b3 CIDs from cleaned bytes
→ get backend quote
→ explicit ROC hold
→ mint cleaned original first
→ mint generated versions
→ verify backend CID matches predicted CID
→ display backend-returned crab URLs
```

The important privacy cleanup behavior is now:

```text
EXIF/GPS/XMP/IPTC/comment/time/text metadata is stripped or blocked
PNG eXIf is detected
PNG unsafe chunks can be stripped directly if WebView re-exports dirty PNG
cleaned blob is rescanned before b3 prediction/upload
mint fails closed if risky metadata remains
```

The sanitizer files touched recently:

```text
apps/crablink-tauri/src/pages/image/imageMetadataSanitizer.js
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
```

Known sanitizer behavior to preserve:

```text
- hash change alone is not treated as proof
- cleaned bytes are rescanned
- mint is blocked if cleaned blocking metadata remains
- PNG eXIf/iTXt/tEXt/zTXt/tIME are stripped when necessary
- metadata cleanup happens before quote, b3 prediction, and upload
- backend CID mismatch still fails the mint
```

This is architecturally correct because the frontend is only preparing local bytes. Backend truth still comes from gateway/wallet/storage responses.

## Current image resolved-page issue

The latest screenshots show that the data is now coming through, but the page still needs layout polish.

Current problem:

```text
1. The image information block exists but needs to be more visually coherent.
2. Some generated version pages now show most data, but title handling is still weak.
3. The page order is not ideal.
4. Preview/pay area is too far down.
5. Versions are buried below payment/preview and info blocks.
6. Mundane gateway facts are too prominent near the top.
```

The user wants this order:

```text
1. Image preview + paid view controls at the top
2. Clean image information / manifest block underneath
3. Image versions / rendition group underneath that
4. Mundane gateway/canonical/storage/receipt/developer facts beneath all of that
```

This should be handled mostly as a display/layout refactor of the resolved asset page, not a minting-flow refactor.

## Image resolved-page files likely involved next

Focus on these files:

```text
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/pages/asset/ImageAssetManifestFacts.jsx
apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx
apps/crablink-tauri/src/pages/asset/asset.css
```

Possibly inspect:

```text
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
```

Only touch `ImagePublishFlow.jsx` if title/creator_intent data is not being stored cleanly for future mints.

## What should happen next for image manifest page

The next patch should not touch the image minting form. It should refactor the image asset display page.

Recommended target layout:

```text
Image Asset
- title/header
- status chips

Paid content view / preview card
- quote/pay buttons
- locked/unlocked state
- image preview box
- backend content_view receipt warning
- no preview bytes until backend receipt

Image manifest information
- title
- image description
- creator display
- source hint
- rights hint
- alt text
- provenance note
- image role
- use cases
- current rendition
- privacy cleanup

Image versions
- original
- desktop
- tablet
- mobile
- thumbnail
- current row highlighted
- open/copy URL/copy CID controls

Gateway/canonical facts
- crab URL
- CID
- hash
- kind
- owner
- payout
- correlation
- storage availability
- receipt references
- diagnostics
- developer JSON
```

Important invariant: paid image bytes must stay locked until content_view pay returns a backend receipt. It is okay for metadata/manifest facts to be visible before payment, but not the protected image bytes.

## Title issue on generated image pages

Generated pages are still not title-perfect. The fix should derive display title in this order:

```text
summary.title
→ rendition_group.creator_intent.title + current rendition label
→ raw title from gateway
→ "Image"
```

For generated versions, ideal display examples:

```text
Example Title — Desktop
Example Title — Tablet
Example Title — Mobile
Example Title — Thumbnail
```

Instead of:

```text
Untitled image
```

This can likely be fixed inside `ImageAssetManifestFacts.jsx` or wherever `AssetHydratedView.jsx` computes the image heading.

Do not fake backend truth. This is only a display title derived from backend-returned manifest/rendition group data.

## Image manifest information display goal

The latest “neat boxes” direction is correct. Preserve it, but polish it.

The page should show image information as boxes, not as a single text blob:

```text
Image Description
example description

Creator Display
@skinnycrabby

Source Hint
Creator Original

Rights Hint
Creator Owned Original

Alt Text
alt text example

Provenance Note
provenance note example

Image Role
Thumbnail

Use Cases
Standalone Image

Current Rendition
Thumbnail · 320×320 · current version

Privacy Cleanup
Verified before minting
```

The note should be short and readable:

```text
These are intentional CrabLink manifest fields. Hidden file metadata such as EXIF/GPS/XMP/IPTC was stripped before minting when privacy verification passed.
```

## Image versions display goal

The versions block is good functionally. Keep the data-rich table, but place it under the image info block.

Current rows:

```text
Original
Desktop
Tablet
Mobile
Thumbnail
```

Each row should continue to show:

```text
role
crab URL / CID
dimensions
size
content type
Open
Copy URL
Copy CID
```

Current version should remain highlighted.

## Mundane info placement

Move or visually demote these below the more useful user-facing sections:

```text
canonical crab URL
content ID
content object CID
hash
asset kind
manifest CID
owner
payout
correlation
storage availability
receipt references
resolve diagnostics
developer JSON
```

These are important, but they should not dominate the top of an image page.

## Do not regress image invariants

Do not break:

```text
- no silent ROC spend
- no fake receipt
- no fake balance
- no fake CID
- no fake backend URL
- no local cache unlock
- no direct storage/index/wallet/ledger mutation from UI
- no image bytes before backend paid content_view receipt
- no raw EXIF/GPS mint by default
- no full backend bypass
```

## Known image status

Image minting is close to complete. Remaining image tasks:

```text
1. Finish resolved image page ordering/layout.
2. Fix generated version display title.
3. Make image manifest info clean and compact.
4. Keep versions block detail-rich but placed lower.
5. Keep mundane gateway facts available but visually lower priority.
6. Run build.
7. Run full local stack with the default script.
8. Mint one fresh test image bundle.
9. Test original, desktop, tablet, mobile, thumbnail pages.
10. Test Wallet B/visitor paid image preview.
```

Suggested test script flow for next session:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

Then in the Tauri app:

```text
1. Go to crab://image
2. Mint a new image with:
   - title
   - description
   - tags
   - creator display
   - source hint
   - rights hint
   - alt text
   - provenance note
   - versions enabled
3. Open original image URL.
4. Open generated desktop/tablet/mobile/thumbnail URLs.
5. Confirm each page shows:
   - title
   - paid preview section at top
   - neat image info block
   - versions below info
   - mundane facts below versions
6. Switch to visitor wallet/passport.
7. Pay to view image.
8. Confirm preview unlocks only after backend receipt.
```

## Next phase after images: video page

After the image manifest page is finished, move to video.

The video page should follow the same UX pattern we developed for images:

```text
simple mint surface
advanced fields available but not cluttering the main flow
clear local preview
explicit quote
explicit ROC hold
backend receipt
backend-returned crab URL
paid view gate
manifest info displayed neatly
versions/renditions displayed cleanly
mundane gateway facts below user-facing content
```

The first video work should be UI/UX, not conversion yet.

Recommended video UI order:

```text
1. Video preview / selected file card
2. Simple title + description
3. Quote / confirm / mint controls
4. Advanced fields drawer
5. Local video details
6. Manifest preview
7. Paid view route display
8. Renditions / versions planning area
```

Video page files likely involved:

```text
apps/crablink-tauri/src/pages/video/VideoPage.jsx
apps/crablink-tauri/src/pages/video/VideoDraft.jsx
apps/crablink-tauri/src/pages/video/VideoLocalPlaybackPreview.jsx
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
apps/crablink-tauri/src/pages/video/videoDraftModel.js
apps/crablink-tauri/src/pages/video/video.css
apps/crablink-tauri/src/pages/asset/AssetPaidAudioPlayer.jsx maybe not relevant
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx for paid video display
apps/crablink-tauri/src/shared/api/videoAssetClient.js
```

## Video metadata stripping and conversion plan

The user specifically wants the video converter written in **Rust for efficiency**, and modular so the code can be reused later when building a full browser.

This is important. Do not implement heavy video conversion in React/JavaScript.

Preferred direction:

```text
Rust-owned video processing
modular core
Tauri command bridge only exposes small typed allowlisted commands
React only displays progress and asks for user intent
no raw shell/eval/run arbitrary commands
no secrets in frontend state
bounded input/output
bounded progress events
clear cancellation
```

Recommended architecture for future video conversion:

```text
apps/crablink-tauri/src-tauri/src/media/
  mod.rs
  video_probe.rs
  video_metadata.rs
  video_transcode.rs
  video_renditions.rs
  video_jobs.rs
  limits.rs
```

Or, better for future reuse:

```text
packages or crates:
  crablink-media-core/
    Rust library for probing, metadata stripping, rendition planning, output manifest
  crablink-tauri/
    Tauri command adapter that calls crablink-media-core
```

Since the current repo is the CrabLink frontend repo, we need to inspect the workspace before deciding exact crate placement. But the design goal should be:

```text
core media processing is reusable Rust
Tauri command layer is thin
React does not own media processing
future CrabLink browser can reuse the Rust media core
```

Possible Rust interface:

```text
probe_video(path) -> VideoProbeSummary
plan_video_renditions(probe, device_targets) -> VideoRenditionPlan
strip_video_metadata(input, output, policy) -> VideoCleanResult
transcode_video_bundle(input, plan, output_dir) -> VideoBundleResult
cancel_video_job(job_id)
get_video_job_status(job_id)
```

Tauri command bridge rules to preserve:

```text
- typed commands only
- allowlisted commands only
- bounded paths, preferably selected-file handles/temp dirs
- no arbitrary shell command
- no run/eval/native raw command
- no private keys/secrets
- redacted errors
- progress events contain no sensitive paths unless necessary
- user explicitly confirms before mint/spend
```

## Video converter technology decision

When we reach video conversion, we need to decide whether to:

```text
A. Use a Rust video processing library directly.
B. Use FFmpeg through a controlled Rust wrapper/sidecar.
C. Use platform-native codecs where possible.
```

Important warning: if using FFmpeg, do not expose arbitrary FFmpeg command strings from React. The React UI should select safe options, and Rust should build the bounded command internally.

Preferred safe model:

```text
React:
  "Make mobile/tablet/desktop MP4 renditions"

Rust:
  validates source
  probes duration/size/container
  enforces caps
  strips metadata
  builds known-safe transcode plan
  produces MP4/H.264/AAC or selected supported profile
  returns b3-ready output file descriptors
```

## Video rendition bundle goal

Eventually, video minting should work like image bundles:

```text
original or cleaned master
desktop rendition
tablet rendition
mobile rendition
thumbnail/poster image
manifest with all renditions
each rendition has own b3 CID
each rendition has own backend-returned crab URL
all versions link back to cleaned canonical/master source
paid access uses backend quote/pay/receipt
```

Important media invariant:

```text
No full large media file should be returned through Tauri command results.
```

Use file paths, byte ranges, segments, or streaming-safe handles. Command results should be small DTOs.

## Video metadata stripping goal

Video metadata to strip eventually:

```text
container metadata
creation time
device/software tags
GPS/location if present
artist/comment/title metadata unless user intentionally sets public fields
embedded thumbnails if they carry metadata
track-level metadata
chapter metadata if not intentionally kept
```

Public CrabLink manifest fields are different and should be preserved intentionally:

```text
title
description
creator display
source hint
rights hint
alt text / poster alt text
provenance note
video role
use cases
rendition list
privacy cleanup verification
```

Same principle as images:

```text
Strip hidden file metadata.
Add intentional CrabLink manifest metadata.
```

## Suggested next-session implementation order

Do not jump straight to video conversion. Finish images first.

### Step 1 — Inspect current image asset display files

Review:

```text
AssetHydratedView.jsx
ImageAssetManifestFacts.jsx
asset.css
ImagePublishFlow.jsx only if needed
```

Confirm how the page currently lays out sections.

### Step 2 — Reorder resolved image asset page

Patch `AssetHydratedView.jsx` so image routes use a dedicated order:

```text
paid preview/access block first
image manifest facts second
rendition group third
mundane asset facts fourth
storage/receipts/diagnostics last
```

Non-image asset routes should remain mostly unchanged.

### Step 3 — Fix display title for generated image pages

Patch image title derivation:

```text
summary.title
creator_intent.title + current rendition label
raw title
fallback
```

Make sure generated pages no longer show `Untitled image` when the structured creator intent has a real title.

### Step 4 — Polish image manifest CSS

Make the info boxes compact and readable at normal zoom and 40–80% zoom.

Avoid giant spacing. Keep:

```text
two-column grid on desktop
one-column on narrow screens
wide boxes for description/alt/provenance
small badges for role/privacy/source
```

### Step 5 — Build and smoke test

Run:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
```

Then run full stack:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

### Step 6 — Fresh image bundle test

Mint a new image bundle after the patch. Do not rely on old mints because old backend metadata may not include the newest structured fields.

Test:

```text
original page
desktop page
tablet page
mobile page
thumbnail page
visitor paid view
```

### Step 7 — Move to video UI/UX

Once image page is acceptable, begin video UI cleanup using image page as reference.

First video session should focus on:

```text
clean layout
simple mint form
advanced drawer
preview placement
paid view area
manifest display
versions/rendition planning UI
```

Do not start heavy Rust video conversion until video UI is coherent.

### Step 8 — Plan Rust video media core

After video UI is clean, start Rust media core design.

Do this deliberately:

```text
define DTOs
define limits
define probe command
define metadata-clean command
define rendition-plan command
define transcode job command
define progress event format
define cancellation
define test matrix
```

## Important user preferences to preserve

```text
- Provide paste-ready code directly in chat.
- Do not provide downloadable patch files.
- Do not redesign image mint form unnecessarily.
- Tauri-first.
- Gateway-first.
- Keep Chrome as proof/companion only.
- No localhost mandatory for normal users.
- No fake balances.
- No fake receipts.
- No fake CIDs.
- No silent spend.
- No external settlement / QuickChain / ROX / Solana creep.
- Use ROC, ROC units, or just ROC in UI/docs; avoid “minor units” wording in user-facing text where possible.
- RustyOnions backend owns durable truth.
- CrabLink Tauri is client/display/user-intent layer.
```

## Current status summary

Images are nearly complete. The privacy cleaner is solid enough to continue testing, including PNG eXIf handling. Image minting and version minting are working. The main remaining image task is **resolved image page polish**: order, title derivation, neat info block, versions placement, mundane info demotion.

After that, move to video page UI/UX. Then build Rust-based modular video metadata stripping and conversion, designed for reuse in a future CrabLink browser.


### END NOTE - MAY 28 2026 - 09:05 CST



### BEGIN NOTE - MAY 28 2026 - 20:10 CST

I reviewed the uploaded carryover notes and newer Tauri codebundle. The notes already define the video goal: MP4 as the default creator-facing output, Rust-owned modular processing, no arbitrary shell bridge, no full video bytes returned through commands, and a video rendition bundle model like images. The current codebundle confirms the relevant Tauri video files already exist: `VideoPage.jsx`, `VideoDraft.jsx`, `VideoLocalPlaybackPreview.jsx`, `VideoPublishFlow.jsx`, `VideoRenditions.jsx`, `videoDraftModel.js`, `video.css`, and `videoAssetClient.js`.   

Here are the carryover notes for the next session:

# Carryover Notes — CrabLink Tauri Image Manifest Complete Enough, Begin Video MP4/Rendition System

## 0. Session checkpoint

We are continuing the RustyOnions / CrabLink Tauri-first project.

Current project doctrine remains:

```text
RustyOnions backend owns durable truth.
CrabLink Tauri is the primary native client.
Chrome remains green proof / companion / gateway smoke surface.
Gateway compatibility comes first.
Tauri Rust mediates native privilege.
React owns display and user intent, not backend authority.
b3 is canonical.
crab:// is navigation, not authority.
ROC is internal.
Paid actions require explicit confirmation.
Wallet mutation goes through svc-wallet.
ron-ledger is durable economic truth.
Cache is convenience, not truth.
```

The immediate image-page work is complete enough for now. The resolved image asset manifest page is presentable and professional enough to move on. It now follows the desired structure:

```text
preview / paid access first
image manifest second
rendition versions third
technical/canonical/storage/receipt/developer facts lower
```

The user is content with the image manifest page for now. Do not keep polishing images unless a regression appears.

The next major work area is video.

---

## 1. What we completed in the latest image sessions

### 1.1 Resolved image pages no longer look like generic asset dumps

We discovered that changing only files in:

```text
apps/crablink-tauri/src/pages/image/
```

was not enough because resolved `crab://<hash>.image` pages are owned by the generic typed asset route:

```text
apps/crablink-tauri/src/pages/asset/AssetPage.jsx
apps/crablink-tauri/src/pages/asset/AssetResolver.jsx
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
```

The important fix was to handle `.image` routes specially inside the resolved asset display layer while leaving non-image asset routes intact.

Current image route layout is now:

```text
top:
  paid preview / pay gate
  asset status summary

middle:
  clean image manifest/certificate
  creator, rendition, rights, privacy strip
  description, alt text, provenance, source, role, use cases

below:
  image rendition group
  original / desktop / tablet / mobile / thumbnail rows
  open/copy actions

bottom:
  technical details
  canonical b3 facts
  storage
  receipts
  gateway attempts
  developer JSON
```

This is acceptable for now.

---

### 1.2 Image manifest page is display-only and preserves truth boundaries

The page must continue to obey:

```text
No fake receipt.
No fake balance.
No fake CID.
No fake backend URL.
No silent ROC spend.
No local cache unlock.
No image bytes before backend paid content_view receipt.
No direct storage/index/wallet/ledger mutation from UI.
```

Image manifests are allowed to show public/intentional manifest metadata before payment, but protected image bytes must remain locked until backend paid view receipt exists.

---

### 1.3 Image rendition group model is the reference for video

The image bundle model now gives us a usable reference for video:

```text
one original/canonical asset
generated sibling renditions
each rendition has its own b3 CID
each rendition has its own crab:// URL
each rendition links back to original/source group
resolved pages show all versions
current version is highlighted
technical facts are preserved but demoted visually
```

This should be the model for video, with video-specific fields.

---

## 2. Current image status

Treat images as “complete enough” for now.

Known image capabilities/status:

```text
image upload/mint works
image versions/renditions work
generated versions show in each manifest
resolved image page layout is acceptable
paid view gate remains explicit
preview remains locked until paid content_view receipt
metadata-stripped / privacy cleanup status is displayable
technical details remain available lower on page
```

Possible future image polish only if needed:

```text
small spacing tweaks
more beautiful locked preview empty state
final visual polish for 100% zoom
metadata verification proof display improvements
```

Do not let this block video work.

---

## 3. Next phase: video page and video rendition system

The next phase is video.

The user wants:

```text
convert most/any common video inputs to MP4
MP4 as the default publishing output
generate different sizes for different devices
mint each version like images
strip unwanted metadata
keep intentional CrabLink manifest metadata
write converter in Rust for efficiency
make the Rust media code modular so it can later be reused in a full CrabLink browser
```

Important user preference:

```text
Do not implement heavy video conversion in React/JavaScript.
Video conversion should be Rust-owned.
React should only display UI, preview, user choices, progress, and confirmation.
```

---

## 4. Current video code already exists

The current Tauri codebundle includes these video-related files:

```text
apps/crablink-tauri/src/pages/video/VideoPage.jsx
apps/crablink-tauri/src/pages/video/VideoDraft.jsx
apps/crablink-tauri/src/pages/video/VideoLocalPlaybackPreview.jsx
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
apps/crablink-tauri/src/pages/video/videoDraftModel.js
apps/crablink-tauri/src/pages/video/video.css
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src-tauri/src/commands/assets.rs
```

The current `VideoPage.jsx` is already framed as:

```text
crab://video
Video Workspace
bounded video-lite uploads
explicit prepare → ROC hold → upload
larger range/segment streaming future
rendition graph ready
linked assets stay separate
local preview is honest
```

That means the page is not empty. We should build on the existing structure instead of starting over.

---

## 5. Video product goal

Use the polished image workflow as the reference.

Video should eventually support:

```text
1. User selects source video.
2. CrabLink probes the source video.
3. CrabLink shows local preview and source facts.
4. User chooses output plan:
   - publish cleaned original/master
   - generate desktop/tablet/mobile/low-bandwidth renditions
   - generate poster/thumbnail assets
5. Rust media pipeline converts/cleans/renders local output files.
6. Each generated video output is minted as a backend .video asset.
7. Each generated poster/thumbnail image is minted as a backend .image asset or linked asset.
8. Backend returns real b3 CIDs/crab URLs for every generated asset.
9. A video rendition group manifest cross-links all sibling versions.
10. Resolved video pages show the same kind of clean versions table as image pages.
11. Paid access uses backend quote/pay/receipt only.
12. No local processed file is treated as published truth until backend mint returns real CIDs.
```

Short product model:

```text
source input
→ cleaned MP4 master
→ desktop/tablet/mobile renditions
→ poster/thumbnail
→ mint each as real backend assets
→ cross-linked video_rendition_group
→ paid view gate
→ clean resolved page
```

---

## 6. Default output format decision

MP4 should be the default creator-facing output format.

Recommended default target:

```text
container: MP4
video codec: H.264
audio codec: AAC
```

Why:

```text
broad browser support
broad mobile support
broad desktop support
good default for creators
easier user story than WebM/MOV fragmentation
```

Supported/import input formats can eventually include:

```text
MP4
MOV
M4V
WebM
Ogg/Theora
possibly AVI/MKV depending on backend/local codec support
```

But the product-facing default should be:

```text
Publish as MP4
```

Important caution:

```text
Do not promise every possible video file can be converted on every machine.
Codec/container support varies.
The UI should say “supported formats” rather than “any file guaranteed.”
```

---

## 7. Recommended default video rendition ladder

The first practical default ladder should be simple.

Suggested output roles:

```text
source_clean_master
desktop_1080p
tablet_720p
mobile_480p
low_360p
poster
thumbnail
```

Do not upscale above source resolution.

Examples:

```text
If source is 4K:
  master/original cleaned
  1080p desktop
  720p tablet
  480p mobile
  360p low
  poster
  thumbnail

If source is 1080p:
  master/original cleaned
  1080p desktop may be same as master or skipped
  720p tablet
  480p mobile
  360p low
  poster
  thumbnail

If source is 720p:
  master/original cleaned
  720p tablet/standard
  480p mobile
  360p low
  poster
  thumbnail

If source is 480p:
  master/original cleaned
  480p mobile
  360p low
  poster
  thumbnail

If source is 360p:
  master/original cleaned
  360p low
  poster
  thumbnail
```

Each rendition should have metadata like:

```text
role
label
width
height
duration
container
mime
video_codec
audio_codec
bitrate
frame_rate
bytes
cid
hash
crab_url
derived_from
source_cid
poster_image_cid
thumbnail_image_cid
is_current
is_original
```

---

## 8. Video manifest/rendition group target

The video equivalent of the image rendition group should look like:

```json
{
  "schema": "crablink.video_rendition_group.v1",
  "group_id": "...",
  "source_cid": "b3:<hash>",
  "canonical_original_crab_url": "crab://<hash>.video",
  "current_role": "mobile_480p",
  "creator_intent": {
    "title": "...",
    "description": "...",
    "creator_display": "...",
    "source_hint": "...",
    "rights_hint": "...",
    "poster_alt_text": "...",
    "provenance_note": "...",
    "video_role": "...",
    "use_cases": [...]
  },
  "privacy_cleanup": {
    "status": "metadata_stripped",
    "verified": true,
    "policy": "default_video_privacy"
  },
  "renditions": [
    {
      "role": "original",
      "label": "Original",
      "cid": "b3:<hash>",
      "crab_url": "crab://<hash>.video",
      "container": "mp4",
      "mime": "video/mp4",
      "width": 1920,
      "height": 1080,
      "duration_ms": 123456,
      "bytes": 12345678,
      "video_codec": "h264",
      "audio_codec": "aac",
      "bitrate": 5000000,
      "frame_rate": "30",
      "is_original": true
    }
  ],
  "linked_assets": {
    "poster": "crab://<hash>.image",
    "thumbnail": "crab://<hash>.image",
    "captions": [],
    "transcript": null
  }
}
```

Backend shape may differ, but this is the desired product model.

---

## 9. Video metadata stripping goal

We need the same principle as images:

```text
Strip hidden file metadata.
Keep intentional CrabLink manifest metadata.
```

Video metadata that should be stripped by default:

```text
container creation time
device/camera identifiers
software tags
GPS/location atoms
QuickTime/iPhone location metadata
serial numbers
local filesystem paths
editing app/project metadata
artist/comment/title metadata if it came from source file and was not intentionally selected
track-level metadata
chapter metadata if not intentionally preserved
embedded thumbnails if they carry private metadata
```

Metadata that may be intentionally preserved or moved into CrabLink manifest:

```text
title
description
creator display
credits
copyright
license
source hint
rights hint
language
subtitle/caption labels
provenance note
poster alt text
use cases
```

Important UX rule:

```text
Do not silently destroy meaningful filmmaker metadata without telling the user.
Default should strip privacy-sensitive hidden metadata.
Creator-facing public fields should be entered intentionally into the CrabLink manifest.
```

---

## 10. Rust video converter architecture

The user specifically wants Rust for efficiency and modularity.

Preferred architecture:

```text
crablink-media-core/
  Rust library for reusable media processing

apps/crablink-tauri/src-tauri/
  thin Tauri command adapter calling crablink-media-core
```

If adding a separate crate inside the CrabLink repo is too much for the first patch, an acceptable temporary structure is:

```text
apps/crablink-tauri/src-tauri/src/media/
  mod.rs
  video_probe.rs
  video_metadata.rs
  video_renditions.rs
  video_transcode.rs
  video_jobs.rs
  limits.rs
```

But the design should still keep reusable core logic separated from Tauri command glue.

Best long-term shape:

```text
crates/crablink-media-core/
  Cargo.toml
  src/
    lib.rs
    error.rs
    limits.rs
    probe.rs
    metadata.rs
    rendition.rs
    transcode.rs
    jobs.rs
    manifest.rs
```

Tauri adapter:

```text
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src-tauri/src/media_adapter.rs
```

React adapter:

```text
apps/crablink-tauri/src/shared/api/mediaDiagnosticsClient.js
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src/pages/video/*
```

---

## 11. Rust media core interface target

Possible Rust interface:

```rust
probe_video(path) -> VideoProbeSummary

plan_video_renditions(
    probe: VideoProbeSummary,
    targets: DeviceRenditionTargets,
) -> VideoRenditionPlan

strip_video_metadata(
    input_path,
    output_path,
    policy: VideoPrivacyPolicy,
) -> VideoCleanResult

transcode_video_bundle(
    input_path,
    plan: VideoRenditionPlan,
    output_dir,
) -> VideoBundleResult

cancel_video_job(job_id)

get_video_job_status(job_id)
```

DTOs should be small and safe:

```text
No full video bytes in command result.
No raw private filesystem path unless needed for internal follow-up command.
No secrets.
No stack traces.
No raw process command string.
No uncapped logs.
```

React should receive:

```text
job_id
status
progress percentage
current step
output descriptors
warnings
safe error messages
```

Not:

```text
full output bytes
raw FFmpeg command
private temp directory paths unless explicitly needed
unredacted stderr
platform secrets
```

---

## 12. Technology decision for conversion

We need to choose an implementation strategy.

Options:

```text
A. Pure Rust video processing library
B. FFmpeg through a controlled Rust wrapper/sidecar
C. Platform-native codec APIs where possible
```

Most realistic path for broad conversion:

```text
Controlled FFmpeg wrapper in Rust, feature-gated and bounded
```

But do not expose arbitrary FFmpeg commands to React.

Correct model:

```text
React:
  user selects “Make MP4 renditions”

Rust:
  validates input file
  probes container/codecs/duration/resolution
  chooses safe known command internally
  enforces limits
  strips metadata
  transcodes to MP4/H.264/AAC
  creates device renditions
  emits progress
  returns output descriptors
```

Forbidden model:

```text
React sends arbitrary ffmpeg args.
Tauri runs shell command.
Tauri exposes run/exec/eval/native raw command.
Unbounded stderr/logs returned to UI.
Full videos passed through command results.
```

If FFmpeg is used:

```text
Use std::process::Command directly with fixed argument construction.
Never use shell=true.
Never accept raw argument strings from UI.
Use allowlisted output profiles.
Use bounded temp directories.
Kill/cancel long jobs.
Redact errors.
Validate file extension/content/probe.
```

---

## 13. Tauri command bridge rules for video

Any Tauri commands added for video must be:

```text
typed
allowlisted
small-surface
bounded
redacted
testable
feature-gated if heavy
no arbitrary native execution
```

Good command families:

```text
media_probe_video
media_plan_video_renditions
media_prepare_video_bundle
media_video_job_status
media_cancel_video_job
media_clear_video_job
media_pick_video_file maybe if file picker is Rust-owned
```

Avoid names like:

```text
run_ffmpeg
execute_media_command
shell_media
raw_transcode
native_exec
raw_file_process
```

The names matter because they signal the trust boundary.

---

## 14. Media job model

Video conversion cannot be a simple blocking command once files get large.

Recommended model:

```text
1. User selects file.
2. React asks Rust to probe.
3. Rust returns probe summary.
4. React displays plan options.
5. User confirms “Prepare MP4 renditions.”
6. Rust creates media job.
7. React polls or subscribes to progress events.
8. User can cancel.
9. Rust writes outputs to bounded temp/staging dir.
10. React displays output descriptors.
11. User confirms mint.
12. Upload/mint happens via existing paid backend path.
```

Job states:

```text
idle
probing
planning
queued
transcoding
stripping_metadata
generating_poster
generating_thumbnail
ready_to_mint
failed
cancelled
minting
minted
```

Progress events should include:

```text
job_id
stage
current_rendition_role
percent
message
warning_count
elapsed_ms
```

Avoid:

```text
full local path spam
large logs
raw stderr dumps
private user filesystem data
```

---

## 15. Backend/minting boundary

Very important:

```text
Client-side video conversion prepares local bytes.
It does not mint.
It does not create backend truth.
It does not create ownership truth.
It does not create paid access truth.
```

Minting still must be:

```text
prepare/quote
→ explicit confirmation
→ backend wallet hold
→ upload generated bytes with paid proof
→ backend returns real CID/crab URL/receipt
→ display backend result
→ refresh wallet
```

For video bundles, minting likely requires a batch-like frontend orchestration at first:

```text
for each output rendition:
  prepare video asset
  hold/pay if needed or use one bundle quote if backend supports later
  upload rendition
  collect backend returned CID/crab URL

then:
  build rendition group manifest using backend returned facts
  possibly publish/update canonical original manifest if backend supports
```

If backend only supports single `/assets/video` upload today, start with a sequential client-side orchestration similar to images.

Do not invent CIDs before backend returns them, except local b3 prediction for display/debug if clearly marked non-authoritative. Backend truth wins.

---

## 16. Video route display target

Resolved `crab://<hash>.video` should eventually mirror the polished image route.

Target order:

```text
video player / paid access first
video manifest/certificate second
video rendition group third
technical/canonical/storage/receipt/developer facts lower
```

Video manifest fields:

```text
title
description
creator display
source hint
rights hint
poster alt text
provenance note
video role
use cases
privacy cleanup
current rendition
duration
resolution
codec/container
```

Video rendition group rows:

```text
role
label
crab URL / CID
resolution
duration
size
container/mime
video codec
audio codec
bitrate
Open
Copy URL
Copy CID
```

Current rendition should be highlighted.

Technical details lower:

```text
canonical crab URL
content ID
content object CID
hash
asset kind
manifest CID
owner
payout
storage availability
receipt references
gateway attempts
developer JSON
```

---

## 17. Existing video page UI target

The video workspace should be cleaned up to match the successful image page design.

Suggested video workspace order:

```text
1. Video preview / selected file card
2. Simple title + description
3. Quote / confirm / mint controls
4. Output plan / rendition plan
5. Advanced fields drawer
6. Local video details
7. Manifest preview
8. Paid view route display
9. Developer JSON/details lower or collapsed
```

The page should feel like:

```text
creator chooses source
creator previews locally
creator chooses simple/advanced metadata
creator prepares MP4/renditions
creator mints
creator receives backend crab URLs
```

Not like:

```text
developer form dump
unbounded backend debug surface
raw JSON-first workflow
```

---

## 18. First next-session implementation decision

There are two possible starts for next session.

### Option A — Video UI cleanup first

Pros:

```text
fast
visible progress
uses image page as design reference
low risk
does not require solving conversion immediately
```

Files:

```text
apps/crablink-tauri/src/pages/video/VideoPage.jsx
apps/crablink-tauri/src/pages/video/VideoDraft.jsx
apps/crablink-tauri/src/pages/video/VideoLocalPlaybackPreview.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
apps/crablink-tauri/src/pages/video/video.css
```

### Option B — Rust media core scaffold first

Pros:

```text
sets correct architecture before UI depends on it
prevents React-owned heavy media processing
starts the reusable converter foundation
```

Files likely:

```text
apps/crablink-tauri/src-tauri/Cargo.toml
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src-tauri/src/commands/mod.rs
apps/crablink-tauri/src-tauri/src/lib.rs
apps/crablink-tauri/src-tauri/src/media/mod.rs
apps/crablink-tauri/src-tauri/src/media/limits.rs
apps/crablink-tauri/src-tauri/src/media/video_probe.rs
apps/crablink-tauri/src-tauri/src/media/video_renditions.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
```

Recommended next-session path:

```text
Start with a small Rust media scaffold and probe/plan DTOs, not full conversion.
Then wire the video UI to show probe and rendition plan.
Then add actual transcode/metadata strip in a later batch.
```

This avoids a risky giant patch.

---

## 19. Recommended next-session implementation order

### Step 1 — Inspect current video files

Open/review:

```text
apps/crablink-tauri/src/pages/video/VideoPage.jsx
apps/crablink-tauri/src/pages/video/VideoDraft.jsx
apps/crablink-tauri/src/pages/video/VideoLocalPlaybackPreview.jsx
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
apps/crablink-tauri/src/pages/video/videoDraftModel.js
apps/crablink-tauri/src/pages/video/video.css
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src-tauri/src/commands/assets.rs
```

### Step 2 — Confirm current video upload/mint status

Before changing conversion, verify what currently works:

```text
Can select local video?
Can local preview play?
Can prepare video asset?
Can explicit ROC hold happen?
Can upload bounded video-lite file?
Does backend return crab://<hash>.video?
Can visitor pay to view?
Does resolved video page play after receipt?
```

This gives the baseline.

### Step 3 — Add or refine Rust media DTO scaffold

Target first commands:

```text
media_probe_video
media_plan_video_renditions
```

These should not transcode yet. They should let us safely inspect:

```text
file name
safe display name
size
duration if known
width/height if known
container if known
mime guess
video/audio codec if known
warnings
supported/unsupported status
recommended output ladder
```

If duration/codec probing is not available without FFmpeg yet, return honest limited info and mark deeper probe unavailable.

### Step 4 — Add video output plan UI

Video page should show:

```text
source facts
recommended MP4 output plan
which renditions will be generated
which renditions are skipped because source too small
estimated output roles
poster/thumbnail plan
privacy cleanup status
```

### Step 5 — Add controlled conversion implementation later

Only after probe/plan UI is clean:

```text
media_prepare_video_bundle
```

This will do:

```text
metadata stripping
MP4 conversion
device renditions
poster/thumbnail extraction
job progress
cancel
output descriptors
```

### Step 6 — Mint generated outputs

After outputs exist locally:

```text
mint original/cleaned master
mint desktop/tablet/mobile/low variants
mint poster/thumbnail if generated
assemble backend-returned facts into rendition group
open resolved video pages
pay/view as visitor
```

---

## 20. Important limits and safety rules

Video files can be large. Do not repeat earlier command-size mistakes.

Rules:

```text
No full large video file through Tauri command result.
No base64 video payloads in React state.
No full-file command buffering for large media.
No unbounded logs.
No raw FFmpeg args from React.
No shell command bridge.
No hidden sidecar execution.
No direct storage/index/wallet/ledger mutation.
No silent ROC spend.
No fake CIDs/receipts/balances.
No paid unlock from local cache alone.
```

Use:

```text
bounded file paths
selected-file handles
temp/staging directories
small DTOs
job IDs
progress events
explicit user confirmation
backend upload path
backend receipts
```

---

## 21. Suggested media limits for first implementation

Initial conservative limits:

```text
max input duration: maybe 10 minutes for MVP
max input size: maybe 250 MB for first local test
max output renditions: 4 video + 2 image assets
max parallel transcodes: 1
max command result DTO: small JSON only
max progress log lines retained: maybe 100
cancel supported before/while processing
```

These can increase later.

UI should say:

```text
Video preparation is local and may be slow.
Large videos are future work.
Some source formats may not be supported yet.
```

Do not overpromise.

---

## 22. Video asset upload/client status to watch

`videoAssetClient.js` already has:

```text
prepareVideoAsset()
uploadVideoAsset()
```

Current upload shape appears to use a `Blob` normalization path. For true large media, that may not be acceptable long-term.

Need inspect carefully next session:

```text
Does uploadVideoAsset pass Blob through gateway.request?
Does gateway.request route Blob safely through Tauri?
Does it use a dedicated asset upload command?
Is there a current video upload size cap?
Does it attach the paid proof headers correctly?
Does it attach x-ron-passport and x-ron-wallet-account correctly?
```

For final video rendition minting, prefer a dedicated bounded Tauri asset upload command similar to image upload, but designed for video size realities.

Possible command:

```text
upload_video_asset_gateway
```

or more general but still allowlisted:

```text
upload_media_asset_gateway
```

If general, it must still be constrained to known asset kinds and routes:

```text
POST /assets/video
POST /assets/music
POST /assets/podcast
```

Do not create arbitrary upload URL authority.

---

## 23. Asset page paid video display

Resolved `.video` pages likely use:

```text
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/shared/embed/crabVideoEmbed.jsx
apps/crablink-tauri/src/shared/api/contentViewClient.js
```

Next session should verify:

```text
paid content_view quote works for .video
pay works for visitor wallet
receipt unlocks video source
video player loads only after receipt
technical details are lower priority
developer JSON is collapsible
```

If current resolved video pages still look like older generic asset pages, apply the same pattern we used for images, but after the video workspace/conversion plan is clear.

---

## 24. What not to do next session

Do not:

```text
Do not start from scratch.
Do not rewrite the whole video page.
Do not convert videos in React.
Do not use ffmpeg.wasm as the default plan unless explicitly chosen after discussion.
Do not add raw shell/eval/run/execute commands.
Do not expose arbitrary FFmpeg strings to the frontend.
Do not make localhost mandatory for users.
Do not bypass gateway.
Do not mint local CIDs as truth.
Do not fake receipts.
Do not fake balances.
Do not silently spend ROC.
Do not add QuickChain/ROX/Solana/external settlement.
Do not claim DRM/anti-rip protection.
Do not execute creator-provided code.
```

---

## 25. Testing workflow for next session

Use the current normal run path:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

Build check:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
```

Rust check if Tauri Rust changes:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check:rust:mac-media
```

If full Tauri check script is needed:

```bash
cd /Users/mymac/Desktop/crablink
bash scripts/check-tauri.sh
```

Manual video smoke after each batch:

```text
1. Open crab://video.
2. Select a small MP4 test file.
3. Confirm local preview plays.
4. Confirm source facts show.
5. Confirm no backend truth is claimed before mint.
6. Prepare/quote.
7. Explicitly confirm ROC hold.
8. Upload/mint.
9. Confirm backend returned crab://<hash>.video.
10. Open resolved video route.
11. Switch visitor wallet/passport.
12. Pay to view if gated.
13. Confirm video bytes render only after backend receipt.
```

Future conversion smoke:

```text
1. Select source MOV/WebM/MP4.
2. Probe.
3. Plan MP4 renditions.
4. Prepare MP4 bundle.
5. Confirm outputs are file descriptors, not command-returned bytes.
6. Mint each generated output.
7. Confirm rendition group cross-links.
8. Confirm each resolved version page shows the group.
```

---

## 26. Suggested opening prompt for next session

Use this to restart smoothly:

```text
We are continuing CrabLink Tauri after finishing the image manifest cleanup. Images are complete enough for now. The next phase is video. We want video conversion/preparation in Rust, modular and reusable for a future CrabLink browser, not heavy React/JS conversion. Default creator-facing output should be MP4/H.264/AAC. We need device renditions like images: cleaned original/master, desktop/tablet/mobile/low versions, poster/thumbnail, and each generated version should mint as its own real backend .video or linked .image asset with backend-returned b3 CIDs/crab URLs. Preserve all invariants: gateway-first, no fake balances/receipts/CIDs, no silent ROC spend, no direct wallet/storage/index/ledger mutation, no full video bytes through command results, no arbitrary shell/ffmpeg command strings from React, paid unlock only after backend content_view receipt. Please inspect the current video files and media command files first, then propose the first small safe batch.
```

---

## 27. Recommended first batch for next assistant

Best first batch should be small and safe:

```text
Batch V0:
  inspect current video files
  summarize current flow
  identify exact gaps

Batch V1:
  add/refine Rust media probe/plan scaffold
  no actual transcode yet
  expose small typed commands only

Batch V2:
  wire video page to show probe facts and recommended rendition plan
  keep UI polished like images

Batch V3:
  add controlled MP4 preparation job
  metadata stripping + output descriptors
  progress/cancel

Batch V4:
  mint all generated renditions
  build video rendition group
  display versions on resolved video pages
```

Do not jump directly into a giant full converter patch.


### END NOTE - MAY 28 2026 - 20:10 CST



### BEGIN NOTE - MAY 28 2026 - 18:00 CST

Here are the carryover notes to paste into the next session so we can continue cleanly.

# CrabLink Tauri Video Page / Video Converter Carryover Notes

## Current project doctrine to preserve

We are continuing RustyOnions / CrabLink with the Tauri-first architecture. CrabLink Tauri is the primary native Rust-backed client. Chrome remains a proof/companion surface only. Gateway compatibility comes first.

The video work must follow the core CrabLink/RustyOnions boundaries:

* React owns display and user intent only.
* Tauri Rust owns native privilege, local file authority, converter jobs, and source staging.
* RustyOnions backend owns durable truth.
* `svc-wallet` / `ron-ledger` own economic mutation truth.
* `svc-storage` / gateway paths own backend asset truth.
* The client must not invent balances, receipts, paid unlocks, ownership, CIDs, or backend truth.
* `crab://` links are navigation/display, not authority.
* b3 hashes are canonical asset truth only after real bytes are stored/confirmed by the backend.
* Local cache/source handles/job descriptors are convenience/status only, not ownership or storage truth.
* No external settlement, ROX, Solana, staking, liquidity, bridge logic, or public-chain code belongs in this work.

## User preference reminders

The user does **not** want downloadable patch files. Provide full paste-ready files directly in chat.

The user prefers complete file replacements with exact paths.

The user runs the full local development program from:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

For app-only checks, use:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check:rust:mac-media
npm run build
```

The user is on a MacBook Pro 2019 Intel Mac.

The user uses a trackpad, so do not assume easy right-click workflows. For copying a file path in Finder, use:

```text
Select file once → Command + Option + C
```

The manual path paste box is a temporary developer bridge and should be replaced with a proper native file picker soon.

## Current video page mission

We are building the CrabLink Tauri `crab://video` page into a real creator video workflow.

Long-term target:

1. Select/import video source.
2. Strip unnecessary metadata.
3. Convert common input formats to MP4/H.264/AAC for broad compatibility.
4. Generate multiple device-friendly renditions:

   * clean master
   * desktop 1080p
   * tablet 720p
   * mobile 480p
   * low bandwidth 360p
   * poster image
   * thumbnail image
5. Mint/upload each real generated asset through backend-owned routes.
6. Build a video bundle/manifest tying all real backend-returned b3 assets together.
7. Show receipts, CIDs, and crab URLs only after backend confirmation.
8. Avoid fake CIDs, fake receipts, fake balances, silent spend, or local-only paid unlock.

## What was proven before this carryover

### 1. Rust media probe/plan scaffold is green

We added a Rust-owned video planning module under:

```text
apps/crablink-tauri/src-tauri/src/media/
```

Key files:

```text
limits.rs
mod.rs
video_probe.rs
video_renditions.rs
```

The first Rust compile error was fixed. The issue was that `VideoProbeSource` needed `Deserialize`, and an attempted edit accidentally duplicated `VideoProbeSource` while removing `VideoProbeInput`. The final fix was to replace `video_probe.rs` cleanly and ensure:

* `VideoProbeInput` exists.
* `VideoProbeSource` derives `Serialize, Deserialize`.
* `VideoProbeSummary` derives `Serialize, Deserialize`.
* `media/mod.rs` does not re-export unused `VideoProbeSource` or `VideoRenditionEntry` unless needed.

Confirmed Rust command:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check:rust:mac-media
```

returned:

```text
Finished `dev` profile [unoptimized + debuginfo] target(s)
```

### 2. Video converter panel can build a Rust MP4 plan

The UI now has a `VideoConverterPanel.jsx` section on `crab://video`.

It receives local WebView preview facts:

* file name
* MIME/content type
* file size
* duration
* width
* height
* frame rate if available

It calls Rust commands:

```text
media_probe_video
media_plan_video_renditions
```

The plan is display/planning only. It does not transcode, upload, mint, or write output files.

The planned outputs are:

```text
source_clean_master
desktop_1080p
tablet_720p
mobile_480p
low_360p
poster_image
thumbnail_image
```

The output ladder avoids upscaling when source resolution is smaller.

### 3. Prepare-job scaffold works

We added the prepare-job scaffold.

Key Rust file:

```text
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
```

Key state addition:

```text
AppState.video_jobs
```

Key Rust commands:

```text
media_prepare_video_bundle
media_get_video_job_status
media_cancel_video_job
```

Key UI behavior:

* Click **Build MP4 plan**.
* Click **Start prepare job**.
* Progress moves through phases.
* On completion, descriptor-only `staged://...` handles appear.
* Cancel works.

The user tested this successfully. Screenshot showed:

```text
Prepare Job: completed
Progress: 100%
Phase: Completed Descriptor Scaffold
Outputs: 7
```

The generated descriptors looked like:

```text
staged://video-job/video_prepare_<timestamp>_<counter>/source_clean_master.mp4
staged://video-job/video_prepare_<timestamp>_<counter>/desktop_1080p.mp4
staged://video-job/video_prepare_<timestamp>_<counter>/tablet_720p.mp4
staged://video-job/video_prepare_<timestamp>_<counter>/mobile_480p.mp4
staged://video-job/video_prepare_<timestamp>_<counter>/low_360p.mp4
staged://video-job/video_prepare_<timestamp>_<counter>/poster_image.image
staged://video-job/video_prepare_<timestamp>_<counter>/thumbnail_image.image
```

These are **not real files yet**. They are descriptor-only handles. That wording is correct and must remain clear until real staged output writing exists.

Cancel was also tested successfully by the user.

### 4. Native source registration batch was added

The most recent batch added native video source staging.

New Rust file:

```text
apps/crablink-tauri/src-tauri/src/media/video_sources.rs
```

Updated Rust state:

```text
AppState.video_sources
```

New commands:

```text
media_register_video_source
media_get_video_source
media_clear_video_source
```

The goal is to give Rust native file authority without returning private paths to React.

Current manual developer flow:

1. Select local video in the browser/WebView local preview picker.
2. Copy the same file’s full path from Finder.
3. Paste into Native source staging.
4. Click **Register native source**.
5. Rust validates the file and returns a redacted `video_source_*` handle.
6. React sees only the handle and facts, not the private filesystem path.
7. Start prepare job with `sourceHandle`.
8. The job should show source authority as `native handle`.

Important implementation detail:

`media_prepare_video_bundle` currently checks that a supplied `sourceHandle` exists and that the registered source size matches the plan source size. This is good because it prevents the plan from being prepared against a different file than the registered native file.

Important path entry details on macOS:

* Use exact path casing: `Desktop`, not `desktop`.
* Do not include surrounding quotes.
* Correct example:

```text
/Users/mymac/Desktop/Screen Recording 2026-05-19 at 7.09.39 PM.mov
```

Incorrect example:

```text
'/Users/mymac/desktop/Screen Recording 2026-05-19 at 7.09.39 PM.mov'
```

The incorrect example has both lowercase `desktop` and single quotes.

### 5. Current tested sample video

The user tested with a macOS QuickTime screen recording:

```text
Screen Recording 2026-05-19 at 7.09.39 PM.mov
```

Observed facts from UI:

```text
Type: video/quicktime
Size: about 20.4 MiB / 20.37 MB
Resolution: 2880×1578
Duration: 0:10
Target: MP4 / H.264 / AAC
```

This is a good test file because it is bigger than the current video-lite mint cap and is a MOV/QuickTime input that should later be converted to MP4.

## Current file map for video converter work

Important Rust files:

```text
apps/crablink-tauri/src-tauri/src/media/limits.rs
apps/crablink-tauri/src-tauri/src/media/mod.rs
apps/crablink-tauri/src-tauri/src/media/video_probe.rs
apps/crablink-tauri/src-tauri/src/media/video_renditions.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
apps/crablink-tauri/src-tauri/src/media/video_sources.rs
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src-tauri/src/state.rs
apps/crablink-tauri/src-tauri/src/lib.rs
```

Important React/JS files:

```text
apps/crablink-tauri/src/shared/api/videoConverterClient.js
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
apps/crablink-tauri/src/pages/video/VideoDraft.jsx
apps/crablink-tauri/src/pages/video/VideoLocalPlaybackPreview.jsx
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/video.css
```

## Current command bridge state

The Tauri command bridge currently exposes media commands similar to:

```text
media_status
media_register_video_source
media_get_video_source
media_clear_video_source
media_probe_video
media_plan_video_renditions
media_prepare_video_bundle
media_get_video_job_status
media_cancel_video_job
```

These must stay typed, allowlisted, source-labeled, redacted, and bounded.

Never add commands like:

```text
run
execute
eval
shell
raw_command
raw_ffmpeg
native_exec
```

No raw FFmpeg args or arbitrary native command strings should be passed from React.

## Current UI state

The video page now has:

1. Local video preview picker/player.
2. Video facts display.
3. Native source staging panel with a manual path box.
4. Build MP4 plan button.
5. Start prepare job button.
6. Cancel job button.
7. Output ladder display.
8. Prepare job progress/status display.
9. JSON preview for developer details.
10. Existing paid video mint flow below.

The native source staging UI is currently developer-ish and should be improved later. The immediate UX improvement is a native file picker button so the user does not have to copy/paste paths.

## Critical known issue: current video-lite mint cap

The current video-lite mint/upload path is capped at:

```text
10 MB
```

The user selected a 20.37 MB / 20.4 MiB video and the current paid video mint flow showed:

```text
Mint flow blocked
This video-lite upload path is capped at 10.00 MB. Larger media needs the future bounded range/segment path.
```

This is expected for now, but it must be fixed before real video minting is complete.

Do **not** solve this by blindly pushing full large video bytes through the Tauri command bridge.

Correct future fix:

1. Keep tiny video-lite upload only for quick proof tests.
2. Add a real bounded large-media upload path.
3. Use staged files/range/segment/chunk upload.
4. Avoid full-file command result buffering.
5. Upload each generated rendition separately.
6. Backend returns real b3/crab URLs.
7. Bundle/manifest references only backend-confirmed assets.
8. Receipt/balance state remains backend-derived.

The current 10 MB cap is a marker showing where the old video-lite path ends and the real staged media path must begin.

## What should happen at the start of the next session

First, confirm the latest native source registration batch is green.

Run:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check:rust:mac-media
npm run build
```

Then run the app:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

Then smoke test:

```text
1. Open crab://video.
2. Select the 20.4 MiB MOV in the local preview picker.
3. Let metadata load.
4. Copy the same file path from Finder using Command + Option + C.
5. Paste raw path into Native source staging.
6. Click Register native source.
7. Confirm a video_source_* handle appears.
8. Confirm JSON does not show the private path.
9. Click Build MP4 plan.
10. Click Start prepare job.
11. Confirm the job says source/native handle, not preview facts only.
12. Confirm descriptor-only outputs still appear.
13. Test Clear source handle.
```

If registration fails, check:

```text
- No single quotes around the path.
- Desktop capitalized correctly.
- File still exists.
- The selected preview file and native path file are the same file.
- File size is under current native source registration cap.
```

## Recommended next batch

The next best batch is:

```text
Native file picker for video source registration
```

Reason: the manual path box works as a developer bridge, but the user is on a MacBook trackpad and copying paths is awkward. A native picker also reduces path casing/quote mistakes.

Desired behavior:

```text
1. Add button: Choose native source.
2. Native OS picker opens.
3. User selects video file.
4. Rust validates source immediately.
5. Rust registers source internally.
6. React receives redacted VideoSourceRegistration DTO.
7. UI shows video_source_* handle, file name, size, type, and authority.
8. Private canonical path never returns to React.
9. Manual path paste can remain hidden under Developer / Advanced.
```

Likely implementation approach:

* Add Tauri v2 dialog support.
* Use a controlled file picker, not shell.
* Accept video extensions only:

  * `.mp4`
  * `.m4v`
  * `.mov`
  * `.webm`
  * `.ogv`
  * `.ogg`
  * `.mkv`
  * `.avi`
* Register the selected path using the existing `video_sources.rs` logic.
* Return only the existing redacted `VideoSourceRegistration` DTO.
* Preserve current manual path registration as fallback/developer-only.

Possible files for that batch:

```text
apps/crablink-tauri/package.json
apps/crablink-tauri/src-tauri/Cargo.toml
apps/crablink-tauri/src-tauri/capabilities/default.json
apps/crablink-tauri/src-tauri/src/lib.rs
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src/shared/api/videoConverterClient.js
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
apps/crablink-tauri/src/pages/video/video.css
```

Verify exact Tauri v2 dialog plugin package/permission names before generating code.

## Batch after native file picker

After source selection is clean, start real staged-file output.

Target batch:

```text
Real staged output skeleton
```

This should still avoid a full codec engine at first. Start by proving that Rust can create a job staging directory and write small manifest/descriptor files safely.

Possible staged path model:

```text
app cache / CrabLink / media-jobs / <job_id> /
  source_clean_master.mp4      future
  desktop_1080p.mp4            future
  tablet_720p.mp4              future
  mobile_480p.mp4              future
  low_360p.mp4                 future
  poster_image.png             future
  thumbnail_image.jpg          future
  bundle_plan.json             first real file to write
```

Important:

* Do not expose absolute output filesystem paths to React.
* Return redacted staged handles.
* Add a Rust command later to open/reveal staged output directory only if safe and explicit.
* Track cleanup later.
* No backend truth yet.

Potential command additions later:

```text
media_get_video_job_output
media_clear_video_job
media_clear_completed_video_jobs
media_open_staged_output_folder
```

Be careful with “open folder” commands. They should be allowlisted and never accept arbitrary paths from React.

## Real conversion strategy notes

The user wants the converter written in Rust for efficiency and modularity so the code can be reused later in a future CrabLink browser.

Important distinction:

* The converter/job orchestration should be Rust-owned.
* The UI should not do conversion.
* The UI should not pass raw codec args.
* The UI should not buffer full files.
* The codec backend must be controlled and allowlisted.

Possible long-term options:

1. Rust-owned adapter around a controlled encoding engine.
2. Platform-native media APIs for macOS where practical.
3. A bundled/sidecar codec engine only if tightly controlled, explicit, and not exposed as shell/args.
4. Pure Rust encoding if feasible for the limited required codecs, but this may be much larger than the app-level job system.

For CrabLink architecture, the crucial part is not whether the encoder internally uses a library; the crucial part is:

* Rust owns the job.
* Inputs are handles, not arbitrary commands.
* Outputs are staged descriptors/files.
* Codec/rendition profiles are allowlisted.
* No user-supplied execution.
* No raw shell bridge.
* No fake backend truth.

## Future real transcode job shape

When replacing descriptor scaffold with real work:

* Use a Rust job record with status/progress/cancel.
* Do not hold locks across blocking/long-running work.
* Spawn blocking CPU/media work outside UI thread.
* Use a cancellation flag/token.
* Bound max source size for MVP.
* Bound output count.
* Bound output dimensions.
* Bound bitrate profiles.
* Bound temp/staging directory.
* Use fixed profiles:

  * clean MP4 master
  * desktop 1080p
  * tablet 720p
  * mobile 480p
  * low 360p
  * poster
  * thumbnail
* Do not upscale.
* Preserve aspect ratio.
* Strip hidden metadata by default.
* Preserve intentional manifest fields separately.
* Return progress and staged output facts only.
* Never return raw video bytes through command results.

Output descriptors should eventually include:

```text
role
label
assetKind
targetMime
container
videoCodec
audioCodec
width
height
durationSeconds
stagedHandle
existsOnDisk
bytes
localVerificationHash maybe
backendCid null until upload
crabUrl null until backend upload/mint
readyForMint true only when staged file exists and passed local checks
```

Use “local verification hash” carefully. Do not label it as canonical backend truth until backend confirms.

## Future large-media upload path

The video mint/publish flow must be upgraded after conversion works.

Current `VideoPublishFlow.jsx` is video-lite and blocks files over 10 MB. That path should not be the final route for generated videos.

Target large-media path:

1. Prepare quote/policy.
2. Explicit user confirmation.
3. Wallet hold/capture through backend.
4. Upload staged rendition by chunks/ranges/segments.
5. Backend stores by b3 and returns confirmed b3/crab URL.
6. Repeat for each rendition/poster/thumbnail.
7. Create video bundle/manifest referencing backend-confirmed outputs.
8. Display backend receipt and refreshed balance.

Do not:

* Base64 large video in JSON.
* Put full video bytes in React state.
* Put full video bytes in Tauri command return values.
* Claim local cache unlocks paid content.
* Fake CIDs or receipts.
* Use local descriptors as backend truth.

## Known UI/UX follow-up items

1. Add native file picker.
2. Hide manual path paste under Advanced/Developer after picker exists.
3. Make the converter panel less developer-heavy once real conversion works.
4. Add “Convert to MP4” button only when real transcode exists.
5. Add “Open staged outputs” only after safe output directory handling is implemented.
6. Add clear status language:

   * preview facts only
   * native source registered
   * descriptor scaffold
   * real staged files
   * uploaded/backend-confirmed
   * minted/backend-confirmed
7. Keep detail-rich JSON previews available in developer mode.
8. Avoid cluttering the main creator view once the path is proven.

## Current safety invariants to keep testing

Every batch must preserve:

```text
No fake b3 CIDs.
No fake crab URLs.
No fake receipts.
No fake balances.
No silent ROC spend.
No arbitrary execution.
No shell/eval/raw command bridge.
No raw FFmpeg args from React.
No private path returned to React.
No full large-media command result buffering.
No wallet mutation from video/source/cache/job code.
No backend truth claimed from local descriptors.
No paid unlock from cache alone.
```

## Current green gates

Run these after each batch:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check:rust:mac-media
npm run build
```

Manual gates:

```text
1. crab://video route loads.
2. Local preview picker still works.
3. Video metadata still loads.
4. Native source registration works.
5. Registered source handle does not reveal private path.
6. Build MP4 plan works.
7. Start prepare job works.
8. Cancel job works.
9. Completed job shows 7 descriptor-only outputs.
10. Publish flow still blocks >10 MB until large-media path is implemented.
11. No wallet/balance/receipt changes occur from converter/source/job buttons.
```

## Best next-session opening request

Use this at the next session start:

```text
We are continuing CrabLink Tauri video page work. We have Rust video probe/plan, prepare-job scaffold, cancel/status polling, and native source registration via manual path. The next batch should add a proper native file picker for video source registration so the user does not need to copy/paste paths. Preserve Tauri-first rules: Rust owns native file authority, React gets only a redacted source handle, no full video bytes through commands, no shell bridge, no raw FFmpeg args, no fake CIDs/receipts, no wallet mutation. Provide full paste-ready files only, no downloads.
```

## Summary of where we are

The video converter is now structurally on the right path.

Proven:

* UI can preview local video.
* Rust can receive safe preview facts.
* Rust can plan MP4 renditions.
* Rust can run a prepare-job scaffold.
* Progress/status/cancel works.
* Descriptor-only outputs appear.
* Native source registration infrastructure has been added.

Not yet done:

* Native file picker.
* Real staged output files.
* Real MP4 conversion.
* Metadata stripping.
* Poster/thumbnail extraction.
* Large-media upload path.
* Backend-confirmed b3 for each rendition.
* Video bundle minting.
* Removal/replacement of the 10 MB video-lite cap.
* Paid viewing of generated videos through the final range/segment media path.

The next session should start with the native file picker batch, then move into real staged-file output once that is green.


### END NOTE - MAY 28 2026 - 18:00 CST


### BEGIN NOTE - MAY 30 2026 - 09:40 CST

I built these notes around the current carryover, the Tauri-first IDB, and the video-page notes. The existing notes establish the hard boundaries: React owns display/user intent, Tauri Rust owns native file/media authority, backend services own durable truth, and local source/job descriptors are not CIDs, receipts, ownership, or unlock truth.  The next work should move toward actual conversion, but still avoid raw shell bridges, raw FFmpeg args from React, full video bytes in command results, fake CIDs, and the current 10 MB video-lite shortcut path.  The Tauri IDB also reinforces that Tauri is the native trust boundary, gateway compatibility comes first, OAP is Rust-side only, and wallet/ledger truth stays backend-owned. 

# CrabLink Tauri Video Page / Video Converter Carryover Notes

## 0. Session checkpoint

We are continuing work on the CrabLink Tauri app, specifically the `crab://video` creator workflow.

The project is now firmly in the **Tauri-first** phase:

```text
CrabLink Tauri = primary native Rust-backed RON client
Chrome extension = green proof client / browser companion / gateway smoke surface
RustyOnions backend = durable substrate/value-plane truth
```

The current video-page mission is to move from:

```text
local video preview
+ Rust-owned source registration
+ MP4/rendition planning
+ descriptor-only prepare job
```

toward:

```text
real local video preparation
+ metadata stripping
+ MOV/WebM/etc. → MP4/H.264/AAC conversion
+ device renditions
+ poster/thumbnail extraction
+ safe staged outputs
+ later backend-confirmed mint/upload for each generated asset
```

The user specifically wants to start getting to actual conversions soon.

Do not jump straight to a giant unsafe media patch. The right next phase is:

```text
1. Confirm latest UI/native picker batches are green.
2. Add real Rust-side converter capability detection/status.
3. Add safe staging directory model.
4. Convert exactly one simple output first: source MOV/WebM/etc. → cleaned MP4 master.
5. Prove staged file exists, has bounded metadata, and can be previewed locally.
6. Only then expand to 1080p/720p/480p/360p plus poster/thumbnail.
7. Only after real outputs exist, design the large-media upload/mint path.
```

---

## 1. User preferences to preserve

The user does **not** want downloadable patch files.

Always provide:

```text
full paste-ready files
exact paths
complete file replacements when practical
Cargo.toml changes if dependencies change
commands to run after each batch
manual smoke tests
```

Do not provide artifact downloads or patch files.

The user is on:

```text
MacBook Pro 2019
Intel Mac
macOS
trackpad
```

The user runs the full local dev program from:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

For app-only checks:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check:rust:mac-media
npm run build
```

For the media-enabled Tauri dev profile:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run tauri:dev:mac-media
```

The manual path paste workflow was only a temporary developer bridge. The newer native picker batch should replace it as the normal path. The manual field should remain hidden under Advanced/Developer only.

---

## 2. Hard architecture doctrine

Preserve these boundaries in every future batch:

```text
React:
  - display
  - route rendering
  - user intent
  - small DTOs
  - local preview UI
  - no private path authority
  - no backend truth

TypeScript adapters:
  - call allowlisted Tauri commands
  - normalize small DTOs
  - no secrets
  - no media bytes
  - no raw native commands

Tauri Rust:
  - native file picker
  - local file authority
  - source handle registry
  - converter jobs
  - staging directory management
  - redaction
  - bounded progress/status
  - future local verification hashes
  - no wallet/ledger mutation

RustyOnions backend:
  - durable storage truth
  - b3/canonical asset confirmation
  - wallet/ledger truth
  - paid access receipt truth
  - bundle/manifest truth after backend confirmation
```

Never let CrabLink Tauri become:

```text
wallet truth
ledger truth
storage truth
index truth
receipt truth
ownership truth
paid unlock truth
```

`crab://` remains navigation, not authority.

Local video source handles and local staged output descriptors are local convenience/status only. They are not backend truth.

---

## 3. Current state before next session

### 3.1 What was already proven before the newest two batches

The existing carryover notes say the Rust media probe/plan scaffold is green.

Rust media module area:

```text
apps/crablink-tauri/src-tauri/src/media/
```

Key files:

```text
apps/crablink-tauri/src-tauri/src/media/limits.rs
apps/crablink-tauri/src-tauri/src/media/mod.rs
apps/crablink-tauri/src-tauri/src/media/video_probe.rs
apps/crablink-tauri/src-tauri/src/media/video_renditions.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
apps/crablink-tauri/src-tauri/src/media/video_sources.rs
```

The video page could already:

```text
select local video in WebView preview picker
read local preview metadata
build Rust MP4 plan
show planned output ladder
start descriptor-only prepare job
show job progress
cancel job
complete descriptor scaffold
show staged:// descriptor handles
```

The planned outputs are:

```text
source_clean_master
desktop_1080p
tablet_720p
mobile_480p
low_360p
poster_image
thumbnail_image
```

Important: these were descriptor-only. They were not real files yet.

### 3.2 Current tested sample video

The user tested with a macOS QuickTime screen recording:

```text
Screen Recording 2026-05-19 at 7.09.39 PM.mov
```

Observed facts:

```text
Type: video/quicktime
Size: about 20.4 MiB / 20.37 MB
Resolution: 2880×1578
Duration: 0:10
Target: MP4 / H.264 / AAC
```

This is an ideal next test file because:

```text
it is a MOV/QuickTime input
it should be converted to MP4
it is larger than the current 10 MB video-lite mint cap
it is short enough for early conversion tests
it proves large-media work cannot rely on the old lite path
```

### 3.3 Current known video-lite mint cap

The current `VideoPublishFlow.jsx` video-lite upload path blocks files over:

```text
10 MB
```

The tested 20.4 MiB MOV hits:

```text
Mint flow blocked
This video-lite upload path is capped at 10.00 MB. Larger media needs the future bounded range/segment path.
```

This is expected for now.

Do **not** solve this by pushing full large video bytes through React, JSON, or Tauri command return values.

Correct future solution:

```text
staged output files
bounded range/segment/chunk upload
explicit prepare/quote
explicit confirmation
backend wallet path
backend receipt
backend b3/crab URL confirmation
bundle manifest after backend confirmation
```

---

## 4. Newest batches provided in the current conversation

These were provided as paste-ready code but may not yet be user-confirmed green.

### 4.1 Batch: native video source picker

Purpose:

```text
replace manual path copying with a native macOS/Tauri file picker
return only a redacted video_source_* handle to React
keep private filesystem path in Rust state only
```

Expected files changed:

```text
apps/crablink-tauri/src-tauri/Cargo.toml
apps/crablink-tauri/src-tauri/src/lib.rs
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src/shared/api/videoConverterClient.js
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
```

Expected dependency addition:

```toml
tauri-plugin-dialog = "2"
```

Expected command added:

```text
media_choose_video_source
```

Expected behavior:

```text
crab://video
→ select local preview video
→ Choose native source
→ native OS picker opens
→ user selects same file
→ Rust registers source
→ React receives redacted handle/facts
→ no private path visible in developer JSON
```

Manual path input should become Advanced/Developer fallback only.

### 4.2 Batch: wire converter panel into video draft and improve local metadata flow

Purpose:

```text
pass selected local video facts and playback metadata into VideoConverterPanel
make VideoLocalPlaybackPreview report metadata up to VideoDraft
place MP4 preparation panel under local preview
add missing converter styles
```

Expected files changed:

```text
apps/crablink-tauri/src/pages/video/VideoDraft.jsx
apps/crablink-tauri/src/pages/video/VideoLocalPlaybackPreview.jsx
apps/crablink-tauri/src/pages/video/video.css
```

Expected behavior:

```text
local preview picker loads file
metadata detected: duration/resolution/aspect
VideoConverterPanel receives selectedFileFacts + playbackMeta
Build MP4 plan works from those facts
Choose native source registers Rust source handle
Start prepare job uses native_handle when available
```

### 4.3 Important status caveat

The newest two batches were provided but not yet confirmed by the user as compiled/tested.

Next session must start by confirming:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check:rust:mac-media
npm run build
```

Then:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

Manual smoke:

```text
1. Open crab://video.
2. Select the 20.4 MiB MOV in the local preview picker.
3. Confirm local playback and metadata.
4. Click Choose native source.
5. Pick the same MOV through native picker.
6. Confirm a video_source_* handle appears.
7. Confirm developer JSON does not reveal private path.
8. Click Build MP4 plan.
9. Click Start prepare job.
10. Confirm job source says native_handle.
11. Confirm descriptor outputs still appear.
12. Confirm Clear source handle works.
13. Confirm video-lite publish still blocks >10 MB.
```

If the build fails, fix compile/build issues first before starting conversion.

---

## 5. Current important file map

### Rust / Tauri

```text
apps/crablink-tauri/src-tauri/Cargo.toml
apps/crablink-tauri/src-tauri/src/lib.rs
apps/crablink-tauri/src-tauri/src/state.rs

apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src-tauri/src/commands/assets.rs

apps/crablink-tauri/src-tauri/src/media/limits.rs
apps/crablink-tauri/src-tauri/src/media/mod.rs
apps/crablink-tauri/src-tauri/src/media/video_probe.rs
apps/crablink-tauri/src-tauri/src/media/video_renditions.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
apps/crablink-tauri/src-tauri/src/media/video_sources.rs
```

### React / JS

```text
apps/crablink-tauri/src/shared/api/videoConverterClient.js
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src/platform/tauriPlatform.js

apps/crablink-tauri/src/pages/video/VideoPage.jsx
apps/crablink-tauri/src/pages/video/VideoDraft.jsx
apps/crablink-tauri/src/pages/video/VideoLocalPlaybackPreview.jsx
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
apps/crablink-tauri/src/pages/video/videoDraftModel.js
apps/crablink-tauri/src/pages/video/video.css
```

### Asset / resolved media playback area to inspect later

```text
apps/crablink-tauri/src/pages/asset/AssetPage.jsx
apps/crablink-tauri/src/pages/asset/AssetResolver.jsx
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/shared/embed/crabVideoEmbed.jsx
```

---

## 6. Current command bridge state

Current media commands are expected to include:

```text
media_status
media_choose_video_source
media_register_video_source
media_get_video_source
media_clear_video_source
media_probe_video
media_plan_video_renditions
media_prepare_video_bundle
media_get_video_job_status
media_cancel_video_job
```

These must stay:

```text
typed
allowlisted
small DTO only
redacted
bounded
source-labeled
policy-aware where needed
testable
```

Do not add commands named:

```text
run
execute
eval
shell
raw_command
raw_ffmpeg
native_exec
raw_args
raw_process
```

Do not let React pass arbitrary command lines, raw FFmpeg arguments, shell fragments, paths to output anywhere, or environment variables.

The converter command model should be:

```text
React requests intent:
  prepare source_clean_master
  include 1080p true/false
  include poster true/false

Rust owns implementation:
  chooses safe encoder backend
  chooses safe args internally
  chooses staging directory
  validates source handle
  reports progress
  returns small DTOs
```

---

## 7. Safety invariants for every future video batch

Never violate:

```text
No fake b3 CIDs.
No fake crab URLs.
No fake receipts.
No fake balances.
No silent ROC spend.
No arbitrary execution.
No shell/eval/raw command bridge.
No raw FFmpeg args from React.
No private path returned to React.
No full large-media command result buffering.
No full video bytes in React state.
No base64 video payloads in JSON.
No wallet mutation from video/source/cache/job code.
No direct storage/index/wallet/ledger mutation from Tauri media code.
No backend truth claimed from local descriptors.
No paid unlock from local cache alone.
No hidden sidecar execution.
No fake DRM/anti-rip claims.
No auto-spend from autoplay/preload.
```

Use:

```text
native source handles
Rust-owned private paths
safe app-local staging directories
small DTOs
job IDs
bounded progress logs
bounded progress events
cancel tokens
explicit confirmation before spend/upload
backend-confirmed b3/crab URLs
backend receipts
```

---

## 8. Actual conversion strategy: recommended next architecture

The user wants to start actual conversions soon. The safest way is to implement conversion in layers.

### 8.1 Do not start with a full rendition ladder

Do not start by generating all seven outputs in one patch.

Start with:

```text
source_clean_master.mp4
```

Only this first.

First real conversion should prove:

```text
source handle can be opened by Rust
staging directory can be created
output path is app-owned
source MOV can become MP4
metadata stripping policy is applied
job progress updates honestly
cancel works if possible
output descriptor reports real existsOnDisk=true
output descriptor reports bytes
output descriptor can optionally report localVerificationHash
React can preview staged output through a safe local preview mechanism later
no backend CID is claimed
```

### 8.2 Recommended progression

Batch VC1 — converter capability/status and staging model:

```text
Add converter backend status DTO.
Add safe staging root.
Add job output descriptor fields for real files.
Add no-op capability checks.
No conversion yet.
```

Batch VC2 — real clean master conversion:

```text
Given a registered native source handle:
  create safe job directory
  create source_clean_master.mp4
  strip unneeded metadata if supported
  transcode/remux to MP4/H.264/AAC if supported
  report progress and final descriptor
```

Batch VC3 — local staged output preview:

```text
Add safe read/preview of staged source_clean_master.mp4.
Avoid returning raw private path.
Prefer safe app protocol/asset URL later.
For first proof, use a controlled command to provide metadata and maybe small preview handle only.
```

Batch VC4 — poster/thumbnail extraction:

```text
Generate poster_image and thumbnail_image from a frame.
Use safe dimensions and output formats.
No backend mint yet.
```

Batch VC5 — device rendition ladder:

```text
desktop_1080p
tablet_720p
mobile_480p
low_360p
```

Rules:

```text
do not upscale
skip outputs larger than source
one transcode at a time
clear progress
bounded log lines
cancel support
```

Batch VC6 — local manifest/rendition group from real staged outputs:

```text
local rendition group references staged outputs only
backendCid=null
crabUrl=null
readyForMint=true only for real staged files that passed local checks
```

Batch VC7 — large-media upload/mint design:

```text
dedicated staged file upload command
bounded chunks/ranges/segments
backend returns real b3/crab URLs
explicit quote/confirm/wallet receipt path
no full-file React buffering
```

---

## 9. Converter backend decision notes

We need actual conversion in Rust-side code, but there are tradeoffs.

### 9.1 What not to do

Do not implement conversion by:

```text
React passing ffmpeg args
React passing shell commands
Tauri command named raw_ffmpeg
Tauri command that accepts arbitrary executable path
Tauri command that accepts arbitrary output path
Tauri command that pipes full video bytes through JSON
Tauri command returning MP4 bytes/base64
```

### 9.2 Practical conversion options to evaluate

The next assistant should inspect current `Cargo.toml`, current macOS dev environment, and decide the smallest green path.

Possible paths:

```text
Option A: Rust wrapper around an internally controlled FFmpeg binary/process
  Pros:
    most practical for MOV/WebM/MP4/H.264/AAC
    best codec coverage
    easiest to generate renditions/posters
  Cons:
    process execution risk
    packaging/licensing concerns
    must never expose raw args to React
    must define controlled arg templates in Rust only

Option B: ffmpeg-next crate / native libav bindings
  Pros:
    Rust API wrapper
    no shell command strings
  Cons:
    requires system libraries
    can be painful on macOS packaging
    more complex code
    still has FFmpeg licensing/dependency concerns

Option C: GStreamer bindings
  Pros:
    powerful media pipeline
  Cons:
    heavy dependency
    macOS packaging complexity
    likely too much for current MVP

Option D: pure Rust crates only
  Pros:
    cleaner supply chain if available
  Cons:
    likely not enough codec/container support for MOV → MP4/H.264/AAC
    may be unrealistic for “any/most video file types”
```

Most likely practical route:

```text
Use an internally controlled Rust-side FFmpeg integration for MVP conversion,
but wrap it behind a safe VideoTranscoder trait so the implementation can be swapped later.
```

Critical rule:

```text
React chooses roles/policy, not command args.
Rust owns safe templates.
```

Recommended Rust abstraction:

```rust
trait VideoTranscoder {
    fn backend_status(&self) -> VideoConverterBackendStatus;
    fn prepare_clean_master(&self, job: VideoPrepareRequest) -> Result<VideoPrepareOutput, VideoError>;
    fn prepare_rendition(&self, job: VideoPrepareRequest, role: VideoRenditionRole) -> Result<VideoPrepareOutput, VideoError>;
    fn extract_still(&self, job: VideoPrepareRequest, role: StillRole) -> Result<VideoPrepareOutput, VideoError>;
}
```

Possible modules:

```text
apps/crablink-tauri/src-tauri/src/media/video_transcode.rs
apps/crablink-tauri/src-tauri/src/media/video_staging.rs
apps/crablink-tauri/src-tauri/src/media/video_progress.rs
apps/crablink-tauri/src-tauri/src/media/video_backend.rs
```

Keep the code modular so it can later be reused in a future Rust-backed CrabLink browser.

---

## 10. Staging directory model

Before real conversion, define a staging model.

### 10.1 Staging root

Use an app-owned local data/cache directory.

Potential structure:

```text
<app_local_data>/media_staging/video/<job_id>/
  source_clean_master.mp4
  desktop_1080p.mp4
  tablet_720p.mp4
  mobile_480p.mp4
  low_360p.mp4
  poster_image.jpg
  thumbnail_image.jpg
  job_manifest.local.json
```

Do not stage into arbitrary user-selected directories for MVP.

Do not let React choose output paths.

### 10.2 Staging cleanup

Need future controls:

```text
Clear staged outputs for job
Clear all failed jobs
Clear all media staging
Keep last N jobs
Max staging bytes
Show storage usage
```

Initial conservative policy:

```text
max input size: 250 MB for first conversion tests
max input duration: 10 minutes
max parallel jobs: 1
max staged jobs retained: small number, maybe 5
max progress log lines: 100
```

### 10.3 Output descriptor shape

Real output descriptor should eventually include:

```text
role
label
assetKind
targetMime
container
videoCodec
audioCodec
width
height
durationSeconds
stagedHandle
existsOnDisk
bytes
localVerificationHash
localVerificationHashKind
backendCid
crabUrl
readyForMint
warning
```

Important:

```text
backendCid = null until backend confirms upload/storage
crabUrl = null until backend confirms typed asset URL
readyForMint = true only if real staged file exists and passed local checks
localVerificationHash is not backend truth
```

Use wording like:

```text
local verification hash
```

Do not call it canonical b3 truth unless it is confirmed by backend storage route semantics.

---

## 11. Actual conversion scope for first real patch

The next actual conversion patch should be small.

Recommended first conversion batch:

```text
Batch VC1/VC2 combined if manageable:
  add video_staging.rs
  add video_transcode.rs
  add converter backend status
  implement clean-master-only conversion
  keep all other outputs descriptor-only or pending
```

Better if split:

```text
VC1:
  staging + backend status + DTO expansion
  no conversion

VC2:
  clean-master conversion
```

### 11.1 First conversion acceptance criteria

For the 20.4 MiB MOV test file:

```text
Choose native source works.
Build MP4 plan works.
Start prepare job creates real job directory.
source_clean_master.mp4 exists on disk.
source_clean_master.mp4 bytes > 0.
descriptor shows existsOnDisk=true.
descriptor shows bytes.
descriptor shows readyForMint=true for clean master only.
other renditions may remain pending/descriptor-only.
no backendCid/crabUrl shown.
no private source path shown in React.
no private output path shown in React unless in developer-only redacted form.
cancel does not leave UI stuck.
npm run check:rust:mac-media passes.
npm run build passes.
```

### 11.2 UI wording for first conversion

Do not overpromise. Use clear labels:

```text
Converter backend: available/unavailable
Clean master: ready/pending/failed
Renditions: future
Poster/thumbnail: future
Backend mint: not yet
```

Main button could become:

```text
Prepare clean MP4
```

Not yet:

```text
Mint final video
Full conversion complete
DRM protected
Published
```

---

## 12. Large-media upload path after conversion

Do not use current `VideoPublishFlow.jsx` as final large-media route.

Current video-lite path exists for proof, but it is capped at 10 MB.

Final path should be staged-file based:

```text
1. User prepares local video bundle.
2. App shows real staged outputs.
3. User chooses which outputs to mint.
4. App asks backend for quote/policy.
5. User explicitly confirms paid action.
6. Backend wallet path creates hold/capture/release/receipt.
7. Tauri uploads each staged file via bounded chunks/ranges/segments.
8. Backend stores each object by canonical b3.
9. Backend returns confirmed b3 and crab URL for each asset.
10. App builds bundle/manifest referencing backend-confirmed assets only.
11. App displays backend receipt and refreshed balance.
12. Resolved `.video` page uses backend-confirmed rendition group.
```

Do not:

```text
upload one giant Blob through React
base64 video in JSON
return file bytes from Tauri
invent b3 locally and call it backend CID
unlock paid video from staged file alone
```

Potential future command family:

```text
media_upload_staged_video_asset_gateway
media_upload_staged_media_asset_gateway
media_mint_video_bundle_gateway
```

If general upload command exists, constrain it to known routes and asset kinds:

```text
POST /assets/video
POST /assets/music
POST /assets/podcast
POST /assets/image
```

No arbitrary upload URL authority.

---

## 13. Resolved video playback future

After minting works, resolved `.video` pages need real playback behavior.

Long-term playback should support:

```text
paid gate
backend content_view receipt
rendition selection
poster/thumbnail
range/segment reads
safe player source handle
verified cache later
no autoplay spend
bounded preload
cancelable requests
```

React owns:

```text
player UI
controls
source labels
progress display
error display
```

Tauri Rust owns:

```text
safe media source resolution
range/segment access later
cache handles later
local path safety
redaction
verification state
```

Avoid:

```text
file:///Users/... raw paths in React
arbitrary local path playback
unverified remote URLs
full bytes in JS memory
fake paid unlocks
```

---

## 14. UI/UX follow-up items

Current goal is a professional creator workflow, not a backend test panel.

Keep:

```text
detailed developer JSON
truth boundary labels
clear source status
clear job status
clear no-transcode/no-backend language
```

But improve main UX over time:

```text
large clean local preview at top
native source picker near preview
MP4 preparation below preview
planned outputs as cards
job progress simple and visual
advanced JSON collapsible
manual path hidden under Advanced
publish/mint separate and clearly backend-confirmed only
```

Recommended status ladder labels:

```text
Preview facts only
Native source registered
Plan ready
Clean MP4 preparing
Staged file ready
Uploaded/backend-confirmed
Minted/backend-confirmed
```

Use these labels so the user knows exactly where truth comes from.

---

## 15. Testing gates

Run after every batch:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check:rust:mac-media
npm run build
```

Full stack:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

Manual current smoke:

```text
1. crab://video route loads.
2. Local preview picker works.
3. Video metadata loads.
4. Native source picker opens.
5. Registered source handle appears.
6. Registered source handle does not reveal private path.
7. Build MP4 plan works.
8. Start prepare job works.
9. Cancel job works.
10. Completed job shows outputs.
11. No fake backend CIDs/crab URLs appear.
12. No wallet/balance/receipt changes occur from converter/source/job buttons.
13. Video-lite publish still blocks >10 MB until large-media upload path exists.
```

Manual first-conversion smoke once implemented:

```text
1. Use the 20.4 MiB MOV test file.
2. Choose native source.
3. Build plan.
4. Click Prepare clean MP4.
5. Confirm progress updates.
6. Confirm source_clean_master.mp4 staged output reports existsOnDisk=true.
7. Confirm bytes > 0.
8. Confirm readyForMint=true only for real staged file.
9. Confirm no backendCid/crabUrl until upload.
10. Confirm no private path in React/developer JSON.
11. Confirm app can clear/cancel/retry without stuck state.
```

---

## 16. Known risks

### 16.1 FFmpeg/process execution risk

Actual conversion likely requires FFmpeg or a media backend.

Risk:

```text
arbitrary execution
raw args from React
platform packaging
licensing
large logs
stuck process
unbounded stderr
zombie process
cancel not killing child
```

Mitigation:

```text
controlled Rust-only templates
no raw args from React
bounded logs
job timeout
kill process on cancel
one job at a time
redacted errors
backend status command
clear packaging notes
```

### 16.2 Large-file memory risk

Risk:

```text
full-file buffer in memory
base64 in JS
command result too large
WebView freeze
Tauri invoke failure
```

Mitigation:

```text
file paths/handles only in Rust
streaming/chunked process IO
small DTOs
staged files on disk
no media bytes returned
```

### 16.3 Truth-boundary drift

Risk:

```text
local hash displayed as backend CID
staged file shown as minted
local preview treated as paid unlock
```

Mitigation:

```text
backendCid=null until upload
crabUrl=null until backend response
receipt=null until backend wallet/content route
labels: local/staged/backend-confirmed
```

### 16.4 UX clutter

Risk:

```text
video page becomes too developer-heavy
JSON panels crowd creator workflow
too many status badges
```

Mitigation:

```text
simple main creator flow
developer details collapsible
advanced manual path hidden
clear primary buttons
one next action at a time
```

---

## 17. Recommended next-session opening request

Use this message to begin the next session:

```text
We are continuing the CrabLink Tauri video page. Please review the latest codebundle, NOTES.MD, COMBINED_IDB.MD, and the recent carryover notes. The newest batches attempted to add the Tauri native video source picker and wire VideoConverterPanel into VideoDraft/VideoLocalPlaybackPreview with improved converter CSS. First confirm/fix the green gates: npm run check:rust:mac-media and npm run build. Then smoke test crab://video with the 20.4 MiB MOV sample: local preview, metadata, Choose native source, Build MP4 plan, Start prepare job, no private path leaked.

After that, I want to start actual conversions. Do not jump to a huge full converter. Please propose the smallest safe batch toward real conversion: staging directory + converter backend status + clean-master-only MP4 output first. Keep React as display/user intent only, keep all raw native media authority in Rust, no raw FFmpeg args from React, no shell/eval/raw command bridge, no full video bytes through Tauri/React, no fake CIDs/receipts/balances, and no large-media upload until staged output files are proven.
```

---

## 18. Best next batch recommendation

The best next code batch should probably be:

```text
Batch VC1 — Staging + backend status, no conversion yet
```

Files likely touched:

```text
apps/crablink-tauri/src-tauri/src/media/mod.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
apps/crablink-tauri/src-tauri/src/media/video_staging.rs
apps/crablink-tauri/src-tauri/src/media/video_backend.rs
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src-tauri/src/state.rs
apps/crablink-tauri/src/shared/api/videoConverterClient.js
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
apps/crablink-tauri/src/pages/video/video.css
```

Goals:

```text
add app-owned media staging root
add job directory allocation
add converter backend status DTO
add output descriptor fields for real files
add status panel showing conversion backend unavailable/available
do not convert yet unless backend is already simple and safe
```

Then:

```text
Batch VC2 — Clean master conversion
```

Files likely touched:

```text
apps/crablink-tauri/src-tauri/src/media/video_transcode.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src/shared/api/videoConverterClient.js
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
```

Goal:

```text
first real source_clean_master.mp4 staged file from registered native source handle
```

Only after VC2 is green should we expand the rendition ladder.

---

## 19. Bottom-line handoff

We are now at the threshold where the video page has enough foundation to start real conversion work.

The foundation now is:

```text
local video preview
metadata detection
Rust-owned source handle registration
native file picker batch proposed
MP4/rendition plan
prepare job scaffold
descriptor outputs
cancel/status flow
paid video-lite path still present but capped at 10 MB
```

The next real milestone is:

```text
A MOV selected through CrabLink becomes a real staged MP4 file on disk through Rust-owned conversion, with no path leaks, no large JS buffers, no fake backend truth, and clear UI status.
```

That is the first serious conversion proof.

After that:

```text
poster/thumbnail
device renditions
local staged rendition group
bounded large-media upload
backend-confirmed b3/crab URLs
paid viewer playback
```

Keep every step small, green, and honest.


### END NOTE - MAY 30 2026 - 09:40 CST


### BEGIN NOTE - MAY 30 2026 - 10:45 CST

The notes below capture the current proven checkpoint and the next work sequence. The important architectural guardrails are still: Tauri Rust owns native media authority, React only displays/user intent, large media must not cross the command bridge as a full blob, local paths stay hidden, and b3/crab/receipt/wallet truth must remain backend-derived.  

# CrabLink Tauri Video Page Carryover Notes — Clean MP4 Conversion Proven, Next Steps to Complete Video Page

## 0. Session checkpoint

We continued work on the CrabLink Tauri video page and moved from a descriptor-only video conversion scaffold to the first real Rust-owned local video conversion proof.

The major milestone achieved:

```text
MOV source selected once through Rust-owned native picker
→ Rust registered source internally
→ React received only redacted video_source_* handle
→ Rust ran controlled FFmpeg clean-MP4 job
→ source_clean_master.mp4 was written locally
→ no private path returned to React
→ no full video bytes returned through command bridge
→ no fake backend CID/crab URL/receipt/wallet truth claimed
```

This is the first successful proof that CrabLink Tauri can perform a real local video conversion in Rust-owned native code while preserving the project’s media/security boundaries.

Current result from user-provided developer JSON:

```text
nativeSourceRegistered: true
sourceAuthority: native_registered_source
sourceHandle: video_source_1780154984219_1
job.status: completed
job.phase: completed_clean_master
source_clean_master.existsOnDisk: true
source_clean_master.bytes: 101868
source_clean_master.readyForMint: true
truthBoundary.simulatedJob: false
truthBoundary.hasNativeSourceHandle: true
truthBoundary.runsTranscode: true
truthBoundary.stripsMetadata: true
truthBoundary.writesOutputFiles: true
truthBoundary.returnsVideoBytes: false
truthBoundary.returnsPrivatePath: false
contentId: null
crabUrl: null
```

This means conversion worked locally. It does **not** mean the video was minted or uploaded yet. `contentId: null` and `crabUrl: null` are correct at this stage.

---

## 1. User preference / workflow reminder

The user does **not** want downloadable patch files. Provide full paste-ready files directly in chat.

The user runs the full local CrabLink/RustyOnions dev environment from:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

For Tauri Rust/media checks, the user runs:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check:rust:mac-media
npm run build
```

The user is on a 2019 Intel MacBook Pro.

FFmpeg is installed and available:

```text
ffmpeg version 8.1.1
built with Apple clang version 16.0.0
enabled libs include libx264, aac/audiotoolbox, videotoolbox, etc.
```

Do not waste time asking them to install FFmpeg unless the backend status later says unavailable.

---

## 2. What was broken before this session

Initially, the video page had a bad UX:

```text
1. User selected a file through the browser/WebView local preview picker.
2. User had to select the same file again through “Choose native source.”
```

This felt redundant and bad, and the user correctly objected.

The technical reason was:

```text
Browser/WebView file picker:
  good for preview and metadata
  bad for Rust-side FFmpeg authority

Native file picker:
  gives Rust internal path/file authority
  returns only redacted handle to React
```

But as a product flow, selecting the same file twice is unacceptable.

The native picker also appeared to hang/spin and forced the user to force quit. The likely cause was the original synchronous/blocking picker path being called in a way that made the UI feel stuck.

---

## 3. Patch applied in this session

We changed the intended UX to a one-selection conversion flow:

```text
Select video for conversion
→ Rust native picker opens
→ Rust registers source internally
→ React receives safe video_source_* DTO
→ UI auto-builds MP4 plan
→ Prepare clean MP4 runs from sourceHandle
```

Important updated files from the latest patch:

```text
apps/crablink-tauri/src-tauri/src/media/mod.rs
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
```

Important Rust behavior:

```text
media_choose_video_source is async
native file picker runs through tauri::async_runtime::spawn_blocking
Rust registers selected path internally
React receives safe VideoSourceRegistration
React does not receive path
React does not receive video bytes
```

Important UI behavior:

```text
Primary button is now “Select video for conversion”
No need to load the local preview first
Local preview metadata is optional
After native selection, the MP4 plan appears automatically
Prepare clean MP4 uses the registered source handle
```

---

## 4. Current proven result

The latest test used:

```text
Screen Recording 2026-05-18 at 5.36.56 PM.mov
contentType: video/quicktime
bytes: 827063
```

The app successfully produced:

```text
source_clean_master.mp4
existsOnDisk: true
bytes: 101868
readyForMint: true
```

The successful conversion proves:

```text
Rust can access the selected native file internally.
FFmpeg can run from the controlled Rust template.
The source MOV can be converted to MP4.
The staged clean MP4 output is created.
The command bridge does not expose private path.
The command bridge does not return media bytes.
The output remains local/staged only.
No backend CID/crab URL is faked.
No receipt/wallet mutation occurs.
```

This is the correct current milestone.

---

## 5. What is still descriptor-only / not complete

The following outputs are still placeholders/descriptors:

```text
desktop_1080p.mp4
tablet_720p.mp4
mobile_480p.mp4
low_360p.mp4
poster_image.jpg
thumbnail_image.jpg
```

In the successful JSON, they correctly show:

```text
existsOnDisk: false
bytes: null
contentId: null
crabUrl: null
readyForMint: false
note: Descriptor only in this batch.
```

This is expected. The first real proof was only:

```text
source_clean_master.mp4
```

Do not treat the missing device renditions/posters as a bug yet.

---

## 6. Current known limitation: metadata still missing

The latest JSON shows:

```text
durationSeconds: null
width: null
height: null
frameRate: null
resolution: null
aspectRatio: null
```

This means the current Rust path can register and convert the file, but the planning metadata is still based on shallow facts and does not yet perform Rust-side deep probing.

The current warning is accurate:

```text
Duration is not known yet.
Resolution is not known yet.
The rendition ladder will stay conservative.
```

This must be fixed next.

The app currently uses WebView/browser metadata if available, but for a clean native conversion path, Rust should deep-probe the selected source using a controlled `ffprobe` path.

---

## 7. Current warning duplication issue

The latest JSON shows duplicate warnings, such as:

```text
Duration is not known yet.
Resolution is not known yet.
Source should be converted...
```

appearing more than once because warnings from probe/plan/job are being accumulated without deduplication.

This is a cleanup item for the next session.

A helper should deduplicate warnings while preserving order, likely in:

```text
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
```

or a small shared media utility module, for example:

```text
apps/crablink-tauri/src-tauri/src/media/video_warnings.rs
```

Do not over-engineer this. A simple `Vec<String>` + `HashSet<String>` helper is fine.

---

## 8. Current staging behavior

The conversion writes local staged output under a Rust-owned temp/staging area, expected roughly like:

```text
std::env::temp_dir()/crablink-tauri/video-staging/<job_id>/source_clean_master.mp4
```

The app only returns a staged handle like:

```text
staged://video-job/<job_id>/source_clean_master.mp4
```

The UI does not receive the real filesystem path.

This is good.

Needed next:

```text
1. Add clear/cleanup command for staged job output.
2. Add optional reveal/open command that accepts staged:// handle only.
3. Add optional preview/play command or safe local staged media URL.
4. Add staging quota and cleanup policy later.
```

Do not return raw private paths to React.

---

## 9. Important architectural invariants to preserve

These must remain true for all future video work:

```text
Tauri Rust owns native media authority.
React does not receive private paths.
React does not receive full video bytes.
React does not receive raw FFmpeg commands.
React does not construct shell commands.
No run/eval/shell/native raw command bridge.
FFmpeg use is fixed-template and Rust-owned.
All outputs are bounded and source-labeled.
Clean local output is not automatically backend truth.
No fake b3 CID.
No fake crab URL.
No fake receipt.
No silent ROC spend.
No wallet mutation from video page.
No ledger mutation from video page.
No upload/mint until explicit user action and backend confirmation.
No cache/offline unlock for paid media.
No DRM/anti-rip claims.
No creator-supplied player execution.
```

---

## 10. Current relevant files

### Rust media command bridge

```text
apps/crablink-tauri/src-tauri/src/commands/media.rs
```

Owns:

```text
media_status
media_choose_video_source
media_register_video_source
media_get_video_source
media_clear_video_source
media_probe_video
media_plan_video_renditions
media_prepare_video_bundle
media_get_video_job_status
media_cancel_video_job
```

Important behavior:

```text
media_choose_video_source should remain async.
Native picker should stay inside spawn_blocking.
Picker returns VideoSourceRegistration only.
```

### Rust media modules

```text
apps/crablink-tauri/src-tauri/src/media/mod.rs
apps/crablink-tauri/src-tauri/src/media/limits.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
apps/crablink-tauri/src-tauri/src/media/video_probe.rs
apps/crablink-tauri/src-tauri/src/media/video_renditions.rs
apps/crablink-tauri/src-tauri/src/media/video_sources.rs
apps/crablink-tauri/src-tauri/src/media/video_transcode.rs
```

Note: `video_transcode.rs` was introduced in the conversion patch. If the user generates a new codebundle and it is missing, confirm whether the file was actually created.

### React video page / UI

```text
apps/crablink-tauri/src/pages/video/VideoPage.jsx
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
apps/crablink-tauri/src/pages/video/VideoDraft.jsx
apps/crablink-tauri/src/pages/video/VideoLocalPlaybackPreview.jsx
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
apps/crablink-tauri/src/pages/video/video.css
apps/crablink-tauri/src/pages/video/videoDraftModel.js
```

### Video converter client

```text
apps/crablink-tauri/src/shared/api/videoConverterClient.js
```

Make sure it supports:

```text
chooseVideoSource
registerVideoSource
getVideoSource
clearVideoSource
probeVideo
planVideoRenditions
prepareVideoBundle
getVideoJobStatus
cancelVideoJob
```

### Tauri capability

```text
apps/crablink-tauri/src-tauri/capabilities/default.json
```

Must include:

```json
"permissions": ["core:default", "dialog:default"]
```

or equivalent dialog permission.

---

## 11. Exact next-session goal

The next session should aim to move from:

```text
One real clean MP4 output
```

to:

```text
Full local video preparation bundle proof:
  clean MP4 master
  one or more device MP4 renditions
  poster image
  thumbnail image
  local staged manifest
  accurate metadata
  optional local preview/reveal
```

Backend upload/mint can be after that, but the video page is not truly complete until it can upload/mint the bundle and then view/pay/play the minted asset through the backend paid path.

---

## 12. Recommended next-session batch order

### Batch V1 — Stabilize current conversion and add Rust-side deep probe

Highest priority.

Purpose:

```text
Make Rust determine duration, width, height, frame rate, codecs, audio presence, and rotation from the registered native file.
```

Implementation plan:

```text
Add controlled ffprobe wrapper.
No shell.
No raw args from React.
No private path returned.
No giant stdout.
Bound process duration.
Bound parsed JSON output.
Return redacted VideoProbeSummary.
```

Recommended file:

```text
apps/crablink-tauri/src-tauri/src/media/video_deep_probe.rs
```

or extend:

```text
apps/crablink-tauri/src-tauri/src/media/video_probe.rs
```

Recommended Rust function shape:

```text
deep_probe_registered_video(source: &RegisteredVideoSource) -> Result<VideoDeepProbeSummary, VideoProbeError>
```

Suggested ffprobe template:

```text
ffprobe
  -v error
  -print_format json
  -show_format
  -show_streams
  <input_path>
```

But implement as controlled `Command::new("ffprobe")`, not shell string.

Returned metadata should include:

```text
container/format
durationSeconds
width
height
displayAspectRatio
sampleAspectRatio
frameRate
videoCodec
audioCodec
hasAudio
hasVideo
rotation/side data if present
bitrate if available
```

Then update:

```text
video_sources.rs
video_probe.rs
video_renditions.rs
commands/media.rs
VideoConverterPanel.jsx
```

Expected result after V1:

```text
durationSeconds no longer null
width no longer null
height no longer null
aspect ratio known
rendition ladder avoids upscaling accurately
warnings reduced
```

Acceptance test:

```text
Select MOV once.
Developer JSON shows nativeSourceRegistered=true.
probe.width/height/durationSeconds populated.
plan entries have real width/height.
desktop_1080p skipped when source is below 1080p.
```

---

### Batch V2 — Deduplicate warnings and clean developer JSON

Purpose:

```text
Make developer details less noisy and professional.
```

Current problem:

```text
Warnings are repeated from probe → plan → job.
```

Implementation plan:

```text
Add dedupe_warnings helper.
Apply before storing VideoJobRecord.warnings.
Optionally categorize warnings:
  source warnings
  plan warnings
  job warnings
```

Acceptance test:

```text
Each warning appears once.
Developer JSON remains rich but not redundant.
UI warning block is readable.
```

This can be done in the same session as V1.

---

### Batch V3 — Generate first actual derived rendition: 720p MP4

Purpose:

```text
Prove clean master → device rendition pipeline.
```

Start with exactly one derived output:

```text
tablet_720p.mp4
```

Do not jump immediately to all renditions. Prove one derived rendition first.

Expected behavior:

```text
If source height > 720:
  produce tablet_720p.mp4
  existsOnDisk=true
  bytes > 0
  readyForMint=true

If source height <= 720:
  skip 720p to avoid upscaling
```

The current source had unknown dimensions. After deep probe, skipping decisions should become accurate.

Controlled FFmpeg template should:

```text
Use clean master as input.
Scale down only.
Preserve aspect ratio.
Force even dimensions for H.264.
Use libx264.
Use yuv420p.
Use AAC audio if audio exists.
Strip metadata/chapters/subtitle/data streams unless intentionally supported.
Use +faststart.
```

Do not upscale.

Potential output descriptor updates:

```text
tablet_720p.existsOnDisk: true
tablet_720p.bytes: <nonzero>
tablet_720p.readyForMint: true
contentId: null
crabUrl: null
```

Backend fields remain null until upload/mint.

Acceptance test:

```text
Use source >720p if possible.
Prepare job completes.
Clean master exists.
720p output exists.
Other outputs remain descriptor-only or skipped.
No private path returned.
No raw FFmpeg args exposed.
```

---

### Batch V4 — Generate mobile/low renditions

After 720p proof is green, add:

```text
mobile_480p.mp4
low_360p.mp4
```

Rules:

```text
Only generate lower renditions when source height is higher than target.
Skip if source is already smaller.
Never upscale.
Output descriptors must mark skipped or descriptor-only clearly.
```

Expected output states:

```text
existsOnDisk=true only for real files.
readyForMint=true only for real staged files.
contentId/crabUrl remain null until upload.
```

---

### Batch V5 — Poster and thumbnail extraction

Generate:

```text
poster_image.jpg
thumbnail_image.jpg
```

Suggested approach:

```text
Use clean master as input.
Pick frame at 1 second or 10% duration.
Fallback to first frame if very short.
Scale poster to max 1280x720 preserving aspect.
Scale thumbnail to 480x270 preserving aspect.
Use JPEG or PNG consistently.
Strip metadata.
```

Suggested outputs:

```text
poster_image.jpg
thumbnail_image.jpg
```

Expected descriptors:

```text
assetKind: image
existsOnDisk: true
bytes > 0
readyForMint: true
contentId: null
crabUrl: null
```

Later these should mint as separate `.image` assets or as linked assets inside the video manifest.

---

### Batch V6 — Local staged manifest and local predicted hashes

Purpose:

```text
Create a complete local preparation manifest describing the bundle before backend upload.
```

Potential staged file:

```text
video_prepare_manifest.json
```

Fields:

```text
schema: crablink.local.video-prepare-manifest.v1
jobId
source safe display info
probe metadata
clean master descriptor
rendition descriptors
poster/thumbnail descriptors
warnings
createdAt
truthBoundary
```

Local BLAKE3:

It is safe to compute local BLAKE3 fingerprints of staged files, but label them carefully:

```text
localPredictedB3
localFingerprint
expectedBackendB3
```

Do **not** call them minted `contentId` until backend upload confirms.

Recommended field naming:

```text
localPredictedContentId: "b3:<hash>"
backendContentId: null
backendCrabUrl: null
backendVerified: false
```

When upload/mint later happens:

```text
backendContentId must equal localPredictedContentId
otherwise show hard mismatch and fail
```

This mirrors the image CID mismatch lesson from earlier sessions.

---

### Batch V7 — Add “Open staged output” or “Preview clean MP4” safely

The user will need a way to confirm the converted MP4 visually.

Do not return raw path to React.

Preferred options:

Option A:

```text
media_reveal_staged_output(stagedHandle)
```

Rust validates:

```text
staged://video-job/<job_id>/<allowed_file>
job exists
file is under staging root
file exists
```

Then Rust opens/reveals the file using native OS behavior. It does not return the filesystem path.

Option B:

```text
media_open_staged_output(stagedHandle)
```

Rust opens the file in the default system player.

Option C, later:

```text
Safe local media protocol / range endpoint for staged handles
```

Example:

```text
crablink-staged://video-job/<job_id>/source_clean_master.mp4
```

or Tauri custom protocol.

For now, Option A or B is simpler and safer.

Acceptance test:

```text
Click Open/Revealed staged clean MP4.
Finder/player opens.
React never sees the private path.
Invalid stagedHandle is rejected.
Path traversal is rejected.
```

---

### Batch V8 — Cleanup, quotas, and amnesia behavior

Current staging likely leaves files in temp.

Need:

```text
Clear current job output
Clear all video staging
Auto-clean old staging jobs
Staging quota
Amnesia-mode purge
```

Suggested commands:

```text
media_clear_video_job(jobId)
media_clear_all_video_staging()
media_get_video_staging_status()
```

Staging status should return safe summary only:

```text
jobCount
bytesTotal
oldestCreatedAt
quotaBytes
warnings
```

No raw paths.

Acceptance test:

```text
Clear job removes staged files.
Developer JSON no longer reports stale existsOnDisk.
App restart does not claim stale truth.
Amnesia mode can purge staging.
```

---

### Batch V9 — Backend upload/mint path for video bundle

This is the point where local conversion becomes a real CrabLink video asset.

Current local conversion is not enough. To complete the video page, the app eventually needs:

```text
prepare upload quote
explicit confirmation
upload staged outputs
backend returns real b3 IDs
backend returns crab:// URLs
manifest stores all variants
receipt returned by backend wallet path if paid
balance refresh
video page render/playback via backend route
```

Do not use the old small-file path blindly for large media.

Known issue from prior memory:

```text
Current video-lite mint/upload path has a 10 MB cap that blocks larger videos.
User wants this removed/reworked later using a proper bounded large-media range/segment/staged upload path rather than unsafe full-file command buffering.
```

Video upload must be designed as:

```text
bounded staged upload
chunk/range aware
backend-derived b3 verification
no full large media bytes in Tauri command result
no silent spend
```

Potential route families to inspect later:

```text
shared/api/videoAssetClient.js
src/pages/video/VideoPublishFlow.jsx
src/pages/video/VideoRenditions.jsx
RustyOnions svc-gateway product routes
omnigate routes/v1/assets or video routes
svc-storage object routes
```

Backend completion rules:

```text
Storage stores bytes by b3.
Gateway/omnigate route boundaries remain authoritative.
Wallet/ledger mutation only through backend wallet path.
Video manifest references all version assets.
Each rendition gets its own b3.
Public URL form: crab://<64hex>.video
Poster/thumbnail may be separate crab://<hash>.image assets.
```

---

## 13. What “video page complete” should mean

The video page is complete when it supports this creator flow:

```text
1. User opens crab://video.
2. User clicks Select video for conversion.
3. Rust native picker selects source once.
4. Rust deep-probes source.
5. UI shows accurate metadata.
6. User clicks Prepare video bundle.
7. Rust creates:
   - clean master MP4
   - device renditions
   - poster image
   - thumbnail image
   - local prepare manifest
8. UI previews/reveals staged outputs safely.
9. User chooses title/description/tags/access/price/rights.
10. User clicks Publish/mint.
11. App shows quote/confirmation for paid storage or minting if applicable.
12. Backend receives upload bytes through bounded route.
13. Backend returns b3 IDs and crab URLs.
14. App verifies backend b3 matches local predicted hashes.
15. Manifest includes all versions and linked assets.
16. App displays minted crab:// video link.
17. Another wallet/user can pay and view/play the video through backend-derived paid access.
```

The video page should not be considered complete if it only stages local files.

---

## 14. UI/UX cleanup needed for video page

Current video page likely still has some dev/scaffold feel.

Need to align it with the cleaned image page style:

```text
Top:
  preview / selected source / conversion status

Middle:
  prepare controls and output cards

Below:
  manifest/access/pricing/publish flow

Developer details:
  collapsible
  rich but not visually dominant
```

Recommended UX labels:

```text
Select video for conversion
Prepare video bundle
Clean MP4 master
Device versions
Poster & thumbnail
Ready to publish
Backend not minted yet
```

Avoid confusing terms:

```text
Do not call staged local output “minted.”
Do not call localPredictedB3 “backend CID.”
Do not call local staged handle “crab URL.”
Do not show null contentId as an error if upload has not happened.
```

Suggested output card states:

```text
Planned
Skipped
Converting
Ready locally
Ready to publish
Published
Failed
Cancelled
```

---

## 15. Testing matrix for next session

### Required local checks

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check:rust:mac-media
npm run build
```

### Full stack launch

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

### Manual tests

Test at least:

```text
Small MOV screen recording
Small MP4 already compatible
MOV with audio
MOV without audio
MP4 with audio
Very short video, around 5 seconds
A file with spaces/special characters in name
Cancel picker
Cancel running conversion
Clear staged output
```

### Success criteria for clean master

```text
sourceHandle starts with video_source_
nativeFileAuthority=true
sourceAuthority=native_registered_source
phase=completed_clean_master
source_clean_master.existsOnDisk=true
source_clean_master.bytes > 0
source_clean_master.readyForMint=true
truthBoundary.simulatedJob=false
truthBoundary.runsTranscode=true
truthBoundary.writesOutputFiles=true
truthBoundary.returnsPrivatePath=false
truthBoundary.returnsVideoBytes=false
contentId=null before upload
crabUrl=null before upload
```

### Success criteria after deep probe

```text
durationSeconds populated
width populated
height populated
aspectRatio populated
frameRate populated if discoverable
videoCodec populated
audioCodec populated if audio exists
hasAudio true/false known
1080p skipped if source below 1080p
720p/480p/360p generated only when not upscaling
```

### Failure states to test

```text
ffmpeg unavailable
ffprobe unavailable
unsupported extension
missing file after registration
invalid staged handle
corrupt/empty video
conversion timeout
user cancel
staging cleanup failure
```

Failures should be typed/redacted:

```text
No stack traces.
No private path.
No shell command output dump.
No raw stderr dump unless redacted and bounded.
```

---

## 16. Do not do next session

Avoid these traps:

```text
Do not return local filesystem paths to React.
Do not stream full video bytes through Tauri command result.
Do not make React pass raw FFmpeg arguments.
Do not add a generic shell/run command.
Do not mint fake crab URLs.
Do not invent content IDs before backend confirmation.
Do not silently upload or spend ROC.
Do not unlock video from local staged cache.
Do not call local staged output “owned.”
Do not claim DRM/anti-rip protection.
Do not jump to QuickChain/ROX/Solana/external settlement.
Do not build production transcoding farm inside CrabLink Tauri.
Do not require sidecar/local node for normal video page flow.
Do not make localhost mandatory for normal users beyond dev mode.
```

---

## 17. Ideal exact next patch plan

### Patch 1: Deep probe + warning dedupe

Files likely touched:

```text
apps/crablink-tauri/src-tauri/src/media/mod.rs
apps/crablink-tauri/src-tauri/src/media/video_probe.rs
apps/crablink-tauri/src-tauri/src/media/video_sources.rs
apps/crablink-tauri/src-tauri/src/media/video_deep_probe.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
```

Expected result:

```text
Selecting a video once populates true duration/width/height.
Warnings are not duplicated.
Plan accurately skips 1080p when needed.
```

### Patch 2: One real derived rendition

Files likely touched:

```text
apps/crablink-tauri/src-tauri/src/media/video_transcode.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
apps/crablink-tauri/src-tauri/src/media/video_renditions.rs
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
```

Expected result:

```text
clean master exists
tablet_720p exists if source is above 720p
tablet_720p skipped if source is <=720p
```

### Patch 3: Poster/thumbnail extraction

Files likely touched:

```text
apps/crablink-tauri/src-tauri/src/media/video_transcode.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
```

Expected result:

```text
poster_image.jpg exists
thumbnail_image.jpg exists
both readyForMint=true locally
contentId/crabUrl remain null until upload
```

### Patch 4: Local staged manifest + clear/reveal actions

Files likely touched:

```text
apps/crablink-tauri/src-tauri/src/media/video_staging.rs
apps/crablink-tauri/src-tauri/src/media/mod.rs
apps/crablink-tauri/src-tauri/src/commands/media.rs
apps/crablink-tauri/src/shared/api/videoConverterClient.js
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
apps/crablink-tauri/src/pages/video/video.css
```

Expected result:

```text
prepare manifest exists
clear staging works
reveal/open staged output works without exposing path
staging status shows safe summary only
```

### Patch 5: Video publish/mint integration

Files likely touched:

```text
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
apps/crablink-tauri/src/shared/manifest/renditionGroups.js
apps/crablink-tauri/src/shared/manifest/linkedAssets.js
apps/crablink-tauri/src/shared/manifest/uniformManifest.js
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/shared/embed/crabVideoEmbed.jsx
```

Likely also needs backend inspection/patch later:

```text
RustyOnions svc-gateway video asset routes
omnigate asset/video hydration
svc-storage upload/large object path
svc-index manifest pointer/indexing
```

Expected result:

```text
backend returns real b3/crab URLs
UI verifies local predicted hash vs backend hash
manifest includes all variants
video page can render minted video asset
paid access works through backend receipt path
```

---

## 18. Current completion estimate

Current video page status:

```text
UI shell exists: yes
video draft/page exists: yes
local preview exists: yes
native one-pick source registration: yes
real clean MP4 conversion: yes
device rendition planning: yes
real device renditions: no
poster/thumbnail real extraction: no
deep metadata probe: no
local staged manifest: no
safe staged preview/reveal: no
cleanup/quota: no
backend upload/mint bundle: no
paid playback of minted video: not yet proven in this session
large media upload beyond 10 MB: not solved
```

Estimated progress:

```text
Local conversion foundation: 55–65% complete
Full video page as creator product: 35–45% complete
Backend-integrated paid video asset flow: 20–30% complete
```

The biggest breakthrough was proving Rust-owned conversion without violating the Tauri security boundary.

---

## 19. Highest priority next action

Start the next session with this exact request:

```text
We have proven source_clean_master.mp4 conversion from a native registered MOV source. Next patch should add Rust-side ffprobe deep metadata probing, deduplicate warning accumulation, and update the video page so the plan uses real duration/width/height/aspect ratio after single native source selection. Keep paths redacted, no full video bytes through command results, no raw FFmpeg args from React, and no fake b3/crab/receipt/wallet truth.
```

After that patch is green, request:

```text
Next patch: generate one real 720p MP4 rendition from the clean master, only when it does not upscale, then mark that output existsOnDisk=true/readyForMint=true while keeping backend contentId/crabUrl null until upload.
```

Then:

```text
Next patch: add poster and thumbnail extraction from clean master.
```

Then:

```text
Next patch: add local staged manifest, cleanup, and safe reveal/open staged output by staged handle.
```

Then:

```text
Next patch: integrate staged video bundle with backend upload/mint route and verify backend b3 against local predicted b3.
```

---

## 20. Short summary for the next AI instance

We are working on CrabLink Tauri video page.

The project is Tauri-first. Chrome is only proof/companion. React owns display/user intent only. Tauri Rust owns native privilege. No private paths, no video bytes, no raw FFmpeg args, no fake CIDs, no fake receipts, no silent spend.

We fixed the bad two-file-pick UX. The video page now has a single “Select video for conversion” path that opens the Rust-owned native picker, registers a redacted `video_source_*` handle, auto-builds an MP4 plan, and prepares a clean MP4 master.

The latest test succeeded. Developer JSON showed `nativeSourceRegistered=true`, `sourceAuthority=native_registered_source`, job phase `completed_clean_master`, `source_clean_master.existsOnDisk=true`, `bytes=101868`, `readyForMint=true`, `simulatedJob=false`, `runsTranscode=true`, `stripsMetadata=true`, `writesOutputFiles=true`, `returnsPrivatePath=false`, and `returnsVideoBytes=false`.

Still missing: Rust-side ffprobe deep metadata, warning dedupe, real 720p/480p/360p renditions, poster/thumbnail extraction, local staged manifest, cleanup/reveal/preview, backend upload/mint, b3 verification, paid video playback.

Next session should start with deep probe + warning dedupe, then one real 720p rendition.

Keep this as the next-session starting point. The most important single next patch is **Rust-side ffprobe/deep probe + warning dedupe**, because accurate dimensions/duration are needed before we safely generate 720p/480p/360p without accidental upscaling.


### END NOTE - MAY 30 2026 - 10:45 CST



### BEGIN NOTE - MAY 30 2026 - 18:40 CST


# CrabLink Tauri Video Page Carryover Notes — Post Video-Lite Minting Breakthrough

## 0. Executive checkpoint

We made a major jump on the CrabLink Tauri `crab://video` page.

The video page has now progressed from:

```text
local preview / descriptor-only planning
```

to:

```text
one native source pick
→ Rust-held private file handle
→ FFmpeg local staging
→ multiple MP4/JPEG outputs
→ staged:// handles
→ video publish flow detects staged outputs
→ prepare / hold / upload flow
→ successful minting of each version
```

The user reports that they are able to mint each generated version. This means the first full video-lite variant path is now proven at a product level:

```text
staged MP4 output
→ paid video prepare
→ wallet hold
→ staged upload through Rust/Tauri
→ gateway/backend returns real b3/crab truth
```

This is a major milestone.

Important distinction:

```text
This is video-lite minting, not final large-media transport.
```

The current path is valid for proving the workflow with small files. It is not the final large video, range upload, segmented upload, HLS, streaming, or durable media transport architecture.

---

## 1. Current proven state

### 1.1 Native source UX

The old bad UX was:

```text
choose file once for browser preview
then choose native source again for Rust
```

We replaced that direction with a one-click native source flow:

```text
Choose video source + build plan
```

This opens the native OS picker once, Rust registers the private source path internally, and React receives only a redacted `sourceHandle`.

Preserved invariants:

```text
React does not receive private filesystem paths.
React does not receive raw video bytes.
React does not receive native command strings.
React does not control FFmpeg arguments.
```

Current relevant file:

```text
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
```

A latest-job display cache/event was added:

```text
localStorage key:
crablink.video.latestPrepareJob.v1

event:
crablink:video-prepare-job-updated
```

Purpose:

```text
VideoPublishFlow can see the completed Rust prepare job and its staged outputs.
```

This cache is display/UI state only. It is not backend truth.

---

### 1.2 Rust FFmpeg staging

Rust now runs FFmpeg locally through a controlled job path.

Current observed staged outputs include roughly:

```text
source_clean_master.mp4
desktop_1080p.mp4
tablet_720p.mp4
mobile_480p.mp4
low_360p.mp4
poster_image.jpg
thumbnail_image.jpg
```

The outputs are represented to React as:

```text
staged://video-job/<job_id>/<role>.mp4
staged://video-job/<job_id>/<role>.jpg
```

The job response correctly marks local outputs as staged and not backend truth:

```text
contentId: null
crabUrl: null
readyForMint: true
existsOnDisk: true
```

Correct meaning:

```text
readyForMint=true means a local staged file exists and can be uploaded later.
It does not mean a backend b3 CID exists.
It does not mean a crab URL exists.
It does not mean a receipt exists.
It does not mean ownership or paid unlock truth exists.
```

Preserved invariants:

```text
No fake b3.
No fake crab URL.
No fake receipt.
No wallet mutation from conversion.
No upload from conversion.
No local cache unlock.
```

---

### 1.3 Video publish flow

The publish panel now detects staged outputs and shows:

```text
Paid video bundle mint flow
READY / PREPARE / HOLD / STAGED UPLOAD
```

It correctly displays staged outputs with checkboxes.

The UI now has enough data to mint selected staged outputs.

Current relevant files:

```text
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src-tauri/src/commands/assets.rs
apps/crablink-tauri/src-tauri/src/lib.rs
```

The upload flow attempts:

```text
video outputs → /assets/video
poster/thumbnail outputs → /assets/image
```

through Tauri commands:

```text
upload_staged_video_asset_gateway
upload_staged_image_asset_gateway
```

This was modeled after the successful image page flow.

---

### 1.4 Strict JSON prepare fix

A failure occurred:

```text
video prepare request must be strict JSON
```

Cause:

The first video publish patch sent extra frontend-only fields to `/assets/video/prepare`:

```text
bundle_kind
rendition_count
```

The backend prepare DTO rejects unknown fields.

Fix applied:

`normalizeVideoPrepareRequest()` in:

```text
apps/crablink-tauri/src/shared/api/videoAssetClient.js
```

must not include:

```text
bundle_kind
rendition_count
local job ids
staged handles
rendition group previews
manifest previews
frontend-only fields
```

The prepare request body must stay strict and should only include backend-supported fields such as:

```text
bytes
payer_account
owner_passport_subject
content_type
title
description
tags
video_kind
duration
resolution
aspect_ratio
codec_format
frame_rate
language
client_idempotency_key
```

Carry this lesson forward:

```text
Any backend route with deny_unknown_fields must receive only exact DTO fields.
Do not send product/UI metadata to strict prepare DTOs unless the backend contract supports them.
```

---

## 2. Current user-observed result

The user reported:

```text
The quality kind of seems too good to be true.
The 360p version looks about right, lesser quality.
The 480p version looked too good to be true.
But minting succeeded for each version.
```

This is an important clue.

The staged/minted outputs may currently differ by bitrate, but not necessarily by actual pixel dimensions.

Likely current bug:

```text
Height-only planned targets may not actually scale the video.
```

Why:

The plan may include entries like:

```json
{
  "role": "mobile_480p",
  "width": null,
  "height": 480
}
```

But the Rust FFmpeg target builder likely only creates a scale filter if both width and height are present.

Bad current behavior likely:

```text
width=null, height=480
→ no scale filter
→ FFmpeg outputs original dimensions with 480p bitrate settings
→ file may look too sharp / too close to original
```

This would explain:

```text
480p looks too good
360p looks worse because bitrate is lower
but neither may actually be dimensionally resized
```

Next session should treat this as a top-priority correctness fix.

---

## 3. Critical next fixes

## 3.1 Fix FFmpeg scaling for height-only targets

File likely involved:

```text
apps/crablink-tauri/src-tauri/src/media/video_transcode.rs
```

Current likely issue:

```rust
fn scale_filter(&self) -> Option<String> {
    let width = self.width?;
    let height = self.height?;
    ...
}
```

This returns `None` if width is null, even if height is known.

Required behavior:

If both width and height are known:

```text
scale=<even_width>:<even_height>:force_original_aspect_ratio=decrease
```

If only height is known:

```text
scale=-2:<height>
```

If only width is known:

```text
scale=<width>:-2
```

For video, FFmpeg should preserve aspect ratio and ensure even dimensions.

Examples:

```text
desktop_1080p → scale=-2:1080
tablet_720p   → scale=-2:720
mobile_480p   → scale=-2:480
low_360p      → scale=-2:360
```

This should make renditions dimensionally real, not just bitrate-limited.

Acceptance criteria:

```text
Minted 480p output has actual height <= 480.
Minted 360p output has actual height <= 360.
No upscaling beyond source height.
Aspect ratio preserved.
Width is even.
MP4 playback still works.
```

Important nuance:

For small source videos below target height, the planner should skip higher targets rather than upscale. This behavior already exists conceptually, but unknown dimensions currently make the planner conservative. After deep probe is improved, skipped entries should become more accurate.

---

## 3.2 Add actual output dimension verification

After transcode, the job currently knows:

```text
bytes
existsOnDisk
stagedHandle
```

But it may not know actual output dimensions.

Next session should add a verification step after each FFmpeg output:

```text
ffprobe output file
→ actual width
→ actual height
→ duration
→ maybe codec
→ maybe bitrate
```

The job output descriptor should then include actual facts:

```text
actualWidth
actualHeight
actualDurationSeconds
actualContainer
actualVideoCodec
actualAudioCodec
```

or reuse existing fields if clean.

Important UX goal:

Show a “Rendition verification” panel:

```text
Role: Mobile 480p
Planned: 480p
Actual: 854×480
Bytes: 381.1 KiB
Status: verified
Backend: pending/minted
```

This will resolve the user’s uncertainty over whether quality/dimensions are real.

Do not overclaim. Use labels like:

```text
planned
staged
verified locally
backend minted
```

not vague claims like:

```text
final
owned
published
```

unless backend truth confirms it.

---

## 3.3 Fix video playback byte route normalization

After minting, the user screenshot showed playback fallback trouble:

```text
Video byte fetch diagnostics
Status: error
video playback bytes failed: load failed
```

It displayed a source URL like:

```text
http://127.0.0.1:8090/o/b3:<hash>
```

and also typed b3 route text.

The playback problem appears separate from minting:

```text
minting succeeds
but viewer byte loading is unreliable
```

Next session should inspect:

```text
apps/crablink-tauri/src/pages/video/VideoLocalPlaybackPreview.jsx
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/shared/embed/crabVideoEmbed.jsx
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src/shared/api/objectClient.js
apps/crablink-tauri/src-tauri/src/commands/assets.rs
```

Goal:

Normalize all minted video raw-byte playback routes to the actual gateway-supported object route.

Most likely correct canonical gateway object byte route:

```text
/o/b3:<64hex>
```

or whichever route the backend actually supports for raw object bytes.

Avoid malformed/new/legacy variants unless confirmed:

```text
/b3:<hash>.video
/b3/<hash>.video
/o/<hash>.video
```

The playback code should be able to derive from either:

```text
crab://<hash>.video
b3:<hash>
backend content_id
asset URL
```

into a single raw object route.

Acceptance criteria:

```text
Open each minted video crab URL.
Viewer resolves backend hydrated page.
Viewer can fetch/play raw video bytes.
Diagnostics show route used and success.
No fake fallback success.
```

If a direct `<video src="http://127.0.0.1:8090/o/b3:<hash>">` fails because of content-type or range behavior, the next fallback should use the Tauri `fetch_asset_bytes_gateway` bridge to fetch bytes and create an object URL in React, but this must remain bounded for video-lite only.

Long-term large video cannot rely on full byte fetch into React.

---

## 3.4 Make every video version appear in every other version’s manifest

This is now one of the most important product completeness items.

The image page already established the desired behavior:

```text
Each minted image variant’s manifest links to all other variants.
```

We need the same for video.

Desired video behavior:

When minting a bundle like:

```text
source_clean_master.video
desktop_1080p.video
tablet_720p.video
mobile_480p.video
low_360p.video
poster_image.image
thumbnail_image.image
```

Each resulting video asset page should know:

```text
I am one member of a video rendition group.
Here are all other video renditions.
Here are linked poster/thumbnail images.
Here is the canonical/master version.
Here is the current selected version.
```

Each respective manifest should include a cross-linked version map.

Minimum desired manifest/rendition structure:

```json
{
  "renditionGroup": {
    "schema": "crablink.video-rendition-group.v1",
    "groupId": "b3:<master-or-manifest-cid>",
    "canonicalRole": "source_clean_master",
    "canonicalCrabUrl": "crab://<hash>.video",
    "sourceJobId": "video_prepare_...",
    "relationshipTruth": "backend_returned_asset_urls_after_explicit_paid_upload",
    "renditions": [
      {
        "role": "source_clean_master",
        "label": "Clean MP4 master",
        "assetKind": "video",
        "mime": "video/mp4",
        "bytes": 101868,
        "width": null,
        "height": null,
        "cid": "b3:<hash>",
        "crabUrl": "crab://<hash>.video",
        "backendVerified": true
      },
      {
        "role": "mobile_480p",
        "label": "Mobile 480p MP4",
        "assetKind": "video",
        "mime": "video/mp4",
        "bytes": 392255,
        "width": 854,
        "height": 480,
        "cid": "b3:<hash>",
        "crabUrl": "crab://<hash>.video",
        "backendVerified": true
      }
    ],
    "linkedImages": [
      {
        "role": "poster_image",
        "assetKind": "image",
        "crabUrl": "crab://<hash>.image"
      },
      {
        "role": "thumbnail_image",
        "assetKind": "image",
        "crabUrl": "crab://<hash>.image"
      }
    ]
  }
}
```

But exact shape must match current manifest conventions.

Important next-session task:

Study the image manifest/rendition implementation and mirror it.

Likely files to inspect:

```text
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
apps/crablink-tauri/src/pages/image/ImageManifest.jsx
apps/crablink-tauri/src/pages/image/ImageManifestFacts.jsx
apps/crablink-tauri/src/pages/image/ImageRenditions.jsx
apps/crablink-tauri/src/shared/manifest/renditionGroups.js
apps/crablink-tauri/src/shared/manifest/uniformManifest.js
apps/crablink-tauri/src/shared/manifest/linkedAssets.js
apps/crablink-tauri/src/shared/api/assetClient.js
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
```

Need to determine whether the backend currently accepts arbitrary rendition group metadata through headers and stores it into the asset manifest.

Current staged upload sends headers such as:

```text
x-ron-video-rendition-role
x-ron-video-rendition-label
x-ron-video-rendition-group
x-ron-image-rendition-role
x-ron-image-rendition-label
x-ron-image-rendition-group
```

But because outputs are uploaded one-by-one, early uploads cannot know final backend CIDs for later uploads unless we do a second manifest update step or a two-pass design.

Possible designs:

### Option A — Frontend display bundle only

Current-ish state:

```text
Upload outputs one-by-one.
Build a client-side result bundle after all uploads return.
Display all URLs in the publish panel.
Maybe local catalog stores cross-link bundle.
```

Pros:

```text
Easy.
Works now.
No backend changes.
```

Cons:

```text
Each backend asset manifest may not contain all sibling versions.
Opening any minted version later may not show all versions unless local display cache survives.
Not durable.
Not acceptable as final version linking.
```

### Option B — Predeclare planned siblings in each upload

For each upload, include a planned rendition group header with roles/staged handles, but CIDs unknown.

Pros:

```text
Each asset knows the planned group structure.
```

Cons:

```text
Does not include final sibling CIDs/crab URLs.
Still incomplete.
```

### Option C — Upload a bundle manifest after all assets mint

After all outputs upload and backend returns CIDs/crab URLs:

```text
Build video bundle manifest JSON.
Upload/publish it as a manifest object.
Set groupId to manifest CID.
Each video asset manifest refers to this bundle manifest.
```

Pros:

```text
Durable cross-link source.
Avoids rewriting individual asset manifests.
All versions can resolve the group by a shared manifest pointer.
```

Cons:

```text
Requires backend route/contract to store a video bundle manifest or generic text/object manifest.
Viewer must know how to fetch/render it.
Individual asset manifests still need pointer unless upload can include it.
```

### Option D — Two-phase asset manifest update

Upload all outputs first. Then update/rewrite each asset manifest to include the final full group.

Pros:

```text
Each version’s manifest directly lists every other version.
Matches image behavior most directly.
```

Cons:

```text
Requires backend manifest update/rewrite route.
May not exist.
Could violate immutable content-addressing if not modeled carefully.
If b3 is content-addressed truth, mutating a manifest after upload likely means creating a new manifest CID rather than mutating old content.
```

Recommended next approach:

```text
First inspect how images achieved cross-linking.
Do not invent a new backend contract until we know current image mechanism.
If image flow already passes the full rendition group in each upload and backend stores it, mirror that exactly.
If image flow relies on local/manifest builder display cache, document that and improve video to parity.
```

Important principle:

```text
b3 hashes are immutable content truth.
If a manifest changes, it becomes a new b3 object.
Do not pretend an old b3 manifest mutated in place.
Names/pointers may update; canonical content does not.
```

---

## 4. Current likely file state from this session

### 4.1 `VideoConverterPanel.jsx`

Current purpose:

```text
Native source picker
source registration
probe/plan
local prepare job
output list
developer JSON
latest job display cache/event
```

Recent fixes added:

```text
LATEST_JOB_STORAGE_KEY
useEffect syncing state.job to localStorage
useEffect dispatching crablink:video-prepare-job-updated
short display for job IDs and staged handles
humanized phases
```

Next risk:

If the publish panel does not pick up latest job, check that the effect is present and `VideoPublishFlow` uses the same key:

```text
crablink.video.latestPrepareJob.v1
```

---

### 4.2 `videoAssetClient.js`

Current purpose:

```text
prepare video asset
upload browser-file video asset
upload staged video asset
upload staged image asset
normalize paid proof
extract returned CIDs/crab URLs
```

Recent fix:

```text
normalizeVideoPrepareRequest() must not send bundle_kind or rendition_count.
```

Next risk:

If backend still rejects prepare strict JSON, compare the actual outgoing request in developer details to the backend DTO.

The next likely unknown field could be:

```text
codec_format
frame_rate
video_kind
aspect_ratio
language
```

If those are also not supported by the backend DTO, remove them too. Do not guess. Inspect backend route DTO for `/assets/video/prepare`.

---

### 4.3 `VideoPublishFlow.jsx`

Current purpose:

```text
Detect latest staged outputs
select outputs to mint
send prepare
review/send wallet hold
review/send bundle upload
upload staged outputs through Tauri
build result bundle
fill draft URLs
cache local catalog entries
```

Known needed patch still pending:

Remove these fields from `buildPreparePayload()` if still present:

```text
bundle_kind
rendition_count
```

Even though `videoAssetClient.js` now strips them, it is better to remove them at the source too so developer JSON matches strict DTO expectations.

Also ensure:

```text
prepare request developer panel shows strict DTO only
staged output group metadata is not included in prepare
rendition group metadata is only used during upload or future bundle manifest step
```

---

### 4.4 `assets.rs`

Current purpose:

```text
upload_image_asset_gateway
upload_video_asset_gateway
upload_staged_video_asset_gateway
upload_staged_image_asset_gateway
fetch_asset_bytes_gateway
hash_image_asset_bytes
```

Important current limits:

```text
MAX_VIDEO_UPLOAD_BYTES = 10 MiB
MAX_IMAGE_UPLOAD_BYTES = 25 MiB
```

This is okay for current video-lite proof. It is not final large-media support.

Next large-media note:

```text
Do not solve larger videos by simply raising MAX_VIDEO_UPLOAD_BYTES and reading huge files into memory.
The future solution should be staged/range/segment/chunked upload from Rust, with bounded memory.
```

Potential issue:

`upload_staged_paid_asset_gateway()` currently reads the whole staged file into memory before POST. This is acceptable only under the current 10 MiB video-lite cap. It must not become the final media path.

---

## 5. Next session recommended plan

## Step 1 — Regenerate/read current codebundle

User will likely attach a fresh codebundle.

Read these first:

```text
CODEBUNDLE_TAURI_APP.md
CODEBUNDLE_RS.md if backend route contracts are needed
COMBINED_IDB.MD
ALLNOTES.MD
CODECHECK.MD
CODECOMMENTS.MD
```

Follow current project doctrine:

```text
Tauri-first.
Gateway compatibility first.
React display/user intent only.
Rust mediates native privilege.
Backend owns b3/receipt/wallet truth.
No fake balances.
No fake receipts.
No silent spend.
No arbitrary execution.
No external settlement.
No QuickChain implementation.
```

---

## Step 2 — Fix strict prepare source-side payload

Patch:

```text
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
```

Remove from `buildPreparePayload()`:

```text
bundle_kind
rendition_count
```

Then test:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
```

Then run full stack:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

Manual:

```text
Open crab://video
Use completed staged outputs
Send Prepare Request
Confirm no strict JSON failure
```

If still strict JSON failure:

```text
Inspect outgoing request developer JSON.
Inspect backend DTO.
Remove any unsupported field.
```

---

## Step 3 — Fix height-only scaling

Patch likely file:

```text
apps/crablink-tauri/src-tauri/src/media/video_transcode.rs
```

Target behavior:

```text
height only → scale=-2:<height>
width only  → scale=<width>:-2
both        → bounded target with aspect ratio decrease
neither     → no scale filter
```

Run:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check:rust:mac-media
npm run build
```

Manual:

```text
Convert same source video.
Compare output file sizes and dimensions.
Mint 480p and 360p again.
Confirm visual quality and actual dimensions match labels.
```

---

## Step 4 — Add output verification

Add a small Rust ffprobe probe for staged outputs after transcode.

Potential new/modified files:

```text
apps/crablink-tauri/src-tauri/src/media/video_probe.rs
apps/crablink-tauri/src-tauri/src/media/video_transcode.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
```

Needed additions to output DTO:

```text
actualWidth
actualHeight
actualDurationSeconds
actualVideoCodec
actualAudioCodec
verificationStatus
```

UI additions:

```text
VideoConverterPanel.jsx
VideoPublishFlow.jsx
```

Display:

```text
planned target
actual staged dimensions
actual bytes
verification status
```

Acceptance:

```text
User can visually see "Mobile 480p → actual 854×480" or similar.
No more guessing based on perceived quality.
```

---

## Step 5 — Fix video playback route

Investigate current playback path.

Relevant likely files:

```text
apps/crablink-tauri/src/pages/video/VideoLocalPlaybackPreview.jsx
apps/crablink-tauri/src/shared/embed/crabVideoEmbed.jsx
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src-shared/api/objectClient.js
apps/crablink-tauri/src-tauri/src/commands/assets.rs
```

Goal:

```text
For crab://<hash>.video, reliably derive gateway raw object URL:
http://127.0.0.1:8090/o/b3:<hash>
```

or whichever route backend confirms.

Acceptance:

```text
Minted video page loads and plays video.
Diagnostic panel says byte route success.
No failed direct fallback for a valid minted object.
```

---

## Step 6 — Mirror image manifest cross-linking

This is a major product parity task.

First inspect image page implementation:

```text
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
apps/crablink-tauri/src/pages/image/ImageManifest.jsx
apps/crablink-tauri/src/pages/image/ImageManifestFacts.jsx
apps/crablink-tauri/src/pages/image/ImageRenditions.jsx
apps/crablink-tauri/src/shared/manifest/renditionGroups.js
apps/crablink-tauri/src/shared/manifest/uniformManifest.js
apps/crablink-tauri/src/shared/api/assetClient.js
```

Questions to answer before coding:

```text
How do image variants cross-link today?
Is the cross-link persisted in backend asset manifest?
Is it only a frontend/local manifest preview?
Does backend accept rendition group headers?
Can an already-minted asset manifest be updated?
Are image CIDs immutable asset bytes or manifest CIDs?
Where does "all versions" actually live?
```

Then implement video parity.

Minimum visible UI requirement:

```text
Every opened video version page should show:
- current version
- master version
- desktop/tablet/mobile/low versions
- poster image
- thumbnail image
- copy/open buttons for every linked crab URL
```

Minimum manifest/data requirement:

```text
Each version’s manifest or hydrated view should include all sibling versions in a structured version group.
```

Do not hardcode only local catalog. Need backend-derived or backend-linked truth for durability if possible.

---

## 6. Testing matrix for next session

### 6.1 Build checks

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check:rust:mac-media
npm run build
```

### 6.2 Full stack run

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

### 6.3 Manual happy path

```text
1. Open crab://video.
2. Choose video source + build plan.
3. Start local MP4 prepare job.
4. Confirm outputs stage.
5. Confirm actual dimensions after new verification.
6. Send Prepare Request.
7. Review ROC Hold.
8. Send ROC Hold.
9. Review Bundle Upload.
10. Upload bundle.
11. Confirm every selected output returns real crab URL.
12. Open each returned video URL.
13. Confirm playback.
14. Confirm each version lists all sibling versions.
```

### 6.4 Regression checks

```text
Cancel native picker should not freeze app.
Manual path fallback still works or fails cleanly.
Prepare without staged outputs fails gracefully.
Upload without hold proof fails.
Upload should not include private path in React JSON.
Developer JSON should not show native command strings.
contentId/crabUrl stay null until backend returns truth.
```

### 6.5 Scaling correctness checks

Use a source with known dimensions, such as 1920×1080.

Expected after scale fix:

```text
desktop_1080p actual height: 1080
tablet_720p actual height: 720
mobile_480p actual height: 480
low_360p actual height: 360
```

Use a source with lower dimensions, such as 640×360.

Expected:

```text
1080p skipped
720p skipped
480p skipped
360p produced or master only
no upscaling
```

---

## 7. Current risks and cautions

### 7.1 Do not confuse bitrate degradation with resolution scaling

A lower bitrate file can look worse while still being the same pixel dimensions.

We need actual dimension verification, not visual guessing.

---

### 7.2 Do not turn video-lite into unsafe large-video upload

Current proof can read small staged files into memory.

Do not simply raise caps for real media.

Future large-video architecture should use:

```text
Rust-side chunked/range upload
bounded buffers
no full-file command result
backend media route
segment manifests
possibly HLS/fragmented MP4 later
```

---

### 7.3 Do not create fake bundle truth locally

The publish panel may build a local bundle map after upload.

That is useful UX, but it is not durable backend truth unless backend stores/fetches it.

Label honestly:

```text
display bundle map
backend returned asset URLs
local catalog convenience
```

until real backend manifest/group route exists.

---

### 7.4 Do not mutate immutable b3 content

If manifests are content-addressed, changing the manifest changes the b3 CID.

Correct models:

```text
new manifest CID
name/pointer update
separate bundle manifest object
hydration layer joins siblings
```

Incorrect model:

```text
silently mutate existing b3 object
```

---

### 7.5 Keep passports and wallets separate

Video publishing still follows:

```text
passport = identity/capability
wallet = economic authority
svc-wallet = mutation front door
ron-ledger = truth
```

Do not store spend authority in React.

---

## 8. Product UX notes

The page is becoming functional but needs polish.

Current good signs:

```text
Publish fields appear.
Staged outputs list appears.
Minting each version works.
Converter panel explains staged vs backend truth.
```

Needed UX improvements:

```text
Show actual rendition verification.
Make version selection visually compact.
Show "minted" status per output after upload.
Show copy/open buttons per returned version.
Move long IDs to copy buttons / developer details.
Prevent huge stat-card overflow.
Make playback diagnostics less raw and more human.
```

Suggested future status vocabulary:

```text
Planned
Staged locally
Verified locally
Prepared
Held
Uploading
Minted by backend
Playable
Linked in manifest
```

Avoid confusing vocabulary:

```text
completed
final
owned
published
```

unless the exact truth layer is clear.

---

## 9. Suggested next code batch scope

The next assistant should not try to fix everything in one giant risky patch unless the user asks.

Best next batch:

```text
Batch A:
- strict prepare source cleanup in VideoPublishFlow
- FFmpeg height-only scaling fix
- add minimal actual dimension verification to Rust output DTO
- show actual dimensions in VideoConverterPanel
```

Then test.

Next batch after that:

```text
Batch B:
- playback route normalization
- video viewer fallback cleanup
```

Then test.

Next batch after that:

```text
Batch C:
- image-style rendition manifest cross-linking for video
- version list on video asset pages
- poster/thumbnail linked asset display
```

This sequencing reduces risk.

---

## 10. One-sentence current state for next session

CrabLink Tauri video page now successfully stages and mints multiple Rust-generated video/image variants, but next session must fix real dimension scaling/verification, repair minted video playback route normalization, and make every minted video version cross-link all sibling versions in its manifest/view like the completed image rendition flow.


### END NOTE - MAY 30 2026 - 18:40 CST



### BEGIN NOTE - MAY 30 2026 - 19:30 CST

Got it. I updated the project memory with this new checkpoint: **all staged video qualities now mint successfully with their own backend mints**, and the next priorities are **video upload limits, bundle manifest cross-linking, and video page UI cleanup**.

I anchored these carryover notes to the current Tauri/video notes and codebundle state, especially the proven staged-output path, strict prepare DTO lesson, current 10 MB frontend cap, and the existing warning that larger video support should not become unsafe full-file buffering.  

# CrabLink Tauri Video Page Carryover Notes — Post Verified Multi-Quality Mint Success

## 0. Executive checkpoint

We made another major breakthrough on the CrabLink Tauri `crab://video` page.

The user confirmed that after the Rust-side video correctness patch:

```text
all generated staged video qualities minted successfully
each quality minted as its own backend asset
each minted output has its own backend-returned b3/crab truth
```

This means the current video-lite path has now proven:

```text
one native source pick
→ Rust-held private source handle
→ FFmpeg local staging
→ real multi-quality MP4/JPEG outputs
→ ffprobe-style output verification path added
→ staged:// handles exposed to React
→ publish panel detects staged outputs
→ explicit prepare
→ explicit wallet hold
→ staged upload through Tauri
→ backend returns real CIDs/crab URLs
→ every selected quality can mint independently
```

This is a very strong product checkpoint.

Important status distinction:

```text
We have proven video-lite multi-rendition minting.
We have not yet proven final large-video media transport.
```

The current path is good enough to keep developing product UX and manifest relationships. It is not yet the final upload/range/segment/HLS/media transport architecture for large videos.

---

## 1. Current proven state

### 1.1 Native source UX is now good

The old bad UX was:

```text
choose file once for browser preview
then choose native source again for Rust
```

That has been replaced with:

```text
Choose video source + build plan
```

The current UX opens the native OS picker once. Rust registers the source privately and React receives only a redacted source handle.

Preserved invariants:

```text
React does not receive private filesystem paths.
React does not receive raw video bytes.
React does not receive native command strings.
React does not control FFmpeg arguments.
```

Relevant frontend file:

```text
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
```

Relevant Rust/media files:

```text
apps/crablink-tauri/src-tauri/src/media/video_sources.rs
apps/crablink-tauri/src-tauri/src/media/video_probe.rs
apps/crablink-tauri/src-tauri/src/media/video_renditions.rs
apps/crablink-tauri/src-tauri/src/media/video_transcode.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
```

The latest-job bridge remains important:

```text
localStorage key:
crablink.video.latestPrepareJob.v1

event:
crablink:video-prepare-job-updated
```

Purpose:

```text
VideoConverterPanel publishes the completed Rust job.
VideoPublishFlow reads the latest job and offers selectable staged outputs.
```

Important truth boundary:

```text
This localStorage/event bridge is display/UI state only.
It is not backend truth.
It is not receipt truth.
It is not wallet truth.
It is not ownership truth.
```

---

### 1.2 Rust FFmpeg staging is now product-proven

Rust now runs local FFmpeg through controlled, allowlisted job code.

Current intended staged outputs include:

```text
source_clean_master.mp4
desktop_1080p.mp4
tablet_720p.mp4
mobile_480p.mp4
low_360p.mp4
poster_image.jpg
thumbnail_image.jpg
```

The outputs are represented to React as redacted staged handles:

```text
staged://video-job/<job_id>/<role>.mp4
staged://video-job/<job_id>/<role>.jpg
```

The output descriptor correctly keeps backend truth empty until upload:

```text
contentId: null
crabUrl: null
readyForMint: true
existsOnDisk: true
```

Correct meaning:

```text
readyForMint=true means a local staged file exists and can be uploaded.
It does not mean a b3 CID exists.
It does not mean a crab URL exists.
It does not mean a receipt exists.
It does not mean ownership exists.
It does not mean paid unlock exists.
```

Preserved invariants:

```text
No fake b3.
No fake crab URL.
No fake receipt.
No wallet mutation from conversion.
No upload from conversion.
No local cache unlock.
No private source path returned to React.
No raw video bytes returned to React.
No native FFmpeg command string returned to React.
```

---

### 1.3 First Rust correctness patch succeeded

The first batch replaced:

```text
apps/crablink-tauri/src-tauri/src/media/video_transcode.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
```

Main purpose of that patch:

```text
fix height-only scaling
add output verification facts
make descriptors use actual probed dimensions/codecs/duration when available
preserve staged-output truth boundaries
```

Important fixes added:

```text
height-only target support:
  scale=-2:<height-like expression>

width-only target support:
  scale=<width-like expression>:-2

box target support:
  scale with force_original_aspect_ratio=decrease

even dimensions:
  -2 / trunc(.../2)*2 behavior to keep H.264-friendly even output dimensions

ffprobe verification:
  actual_width
  actual_height
  actual_duration_seconds
  actual_video_codec
  actual_audio_codec
  dimensions_within_target
  verification status / note
```

Why this mattered:

```text
Before the patch, 480p and 360p outputs may have looked too good because height-only planned targets may not have actually applied a scale filter.
After the patch, dimensions should be honest and verified.
```

The user then confirmed the important practical result:

```text
all qualities minted successfully
each one minted with its respective quality
```

This means the immediate scaling/verification patch did not break minting and likely fixed the original “quality too good to be true” concern.

---

### 1.4 Video publish flow is working

Relevant files:

```text
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src-tauri/src/commands/assets.rs
apps/crablink-tauri/src-tauri/src/lib.rs
```

Current flow:

```text
VideoPublishFlow detects staged outputs
creator selects outputs to mint
prepare video asset
review/send wallet hold
upload selected staged outputs
video outputs go to /assets/video
poster/thumbnail outputs go to /assets/image
backend returns real CID/crab URL per upload
publish panel displays results
local catalog/display draft can be updated
```

Tauri commands used:

```text
upload_staged_video_asset_gateway
upload_staged_image_asset_gateway
```

Current backend truth rule:

```text
Backend upload response is the only source of minted b3/crab truth.
Frontend and Rust staging do not invent CIDs or crab URLs.
```

---

## 2. Current known next priorities

The next session should focus on three major areas, in this order:

```text
1. Raise/rework video upload limits safely.
2. Make every video in a bundle list/cross-link the other bundle videos in manifests.
3. Clean up the video page UI so it looks like the image page, not a dev page.
```

Recommended order matters.

We should not start with heavy UI cleanup before we understand whether the upload limit and manifest data model will change visible state. The video page can be cleaned up in parallel later, but the data path should be made less temporary first.

---

# 3. Priority 1 — Raise/rework the current video upload cap

## 3.1 Current observed problem

The user reports that video upload is currently capped at:

```text
10 MB
```

Known frontend constant in current codebundle:

```text
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx

const MAX_SIMPLE_VIDEO_BYTES = 10 * 1024 * 1024;
```

Known Rust/backend-side note from prior carryover:

```text
apps/crablink-tauri/src-tauri/src/commands/assets.rs

MAX_VIDEO_UPLOAD_BYTES = 10 MiB
MAX_IMAGE_UPLOAD_BYTES = 25 MiB
```

Important: there may also be backend service caps in RustyOnions:

```text
svc-gateway body cap
omnigate body cap
/assets/video route cap
request timeout
gateway timeout
Tauri command timeout / body read behavior
```

Do not assume the Tauri frontend constant is the only cap.

---

## 3.2 Critical architectural caution

Do not solve larger videos by blindly changing:

```text
10 MiB → 500 MiB
```

if the current command reads the whole staged file into memory before forwarding.

The user wants larger video support, but CrabLink/RustyOnions rules require bounded media behavior:

```text
No giant media files returned through Tauri command results.
No raw video bytes in React state.
No private paths sent to React.
No unbounded memory buffering.
No fake “streaming” claim if we are still doing one full upload body.
```

Safe mental model:

```text
Temporary video-lite cap increase:
  okay if moderate and clearly bounded

Final large-media support:
  staged/range/segment/chunked upload from Rust
  bounded memory
  backend route support
  byte-range playback later
```

---

## 3.3 Recommended next-session approach for limits

The next session should inspect the current implementation first:

```text
apps/crablink-tauri/src-tauri/src/commands/assets.rs
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
RustyOnions svc-gateway /assets/video route caps
RustyOnions omnigate /assets/video handling
```

Questions to answer from code:

```text
Does upload_staged_video_asset_gateway read the entire staged file with std::fs::read?
Does it stream from file into reqwest Body?
Does it calculate local b3 before upload?
Does it enforce MAX_VIDEO_UPLOAD_BYTES before reading?
Does backend route accept Content-Length over 10 MiB?
Does svc-gateway have body cap middleware that rejects larger bodies?
Does omnigate have a separate route/body cap?
Does /assets/video prepare include bytes and reject above a configured threshold?
Does wallet estimate/hold price scale with bytes?
```

If current Rust command full-buffers the file, then the immediate patch should be a controlled intermediate step:

```text
Raise cap modestly for video-lite, e.g. 50 MiB or 100 MiB, not unlimited.
Make the limit a named constant and use it consistently.
Update UI copy to say “Video-lite upload cap”.
Ensure error message tells user the current cap and future large-media path.
```

If current Rust command can stream safely, then a larger dev cap is acceptable:

```text
Raise staged video cap higher, e.g. 250 MiB, but still bounded.
Keep browser/direct file upload lower if needed.
Prefer staged upload path for larger outputs.
```

Best long-term design:

```text
staged file path stays Rust-private
Rust opens file
Rust streams file in bounded chunks to gateway/backend
backend accepts streaming body or multipart/chunk route
gateway enforces explicit cap
wallet prepare/hold uses bytes
backend returns receipt/CID truth
frontend receives only result JSON
```

---

## 3.4 Likely files for the upload cap patch

Frontend:

```text
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/shared/api/videoAssetClient.js
```

Tauri Rust:

```text
apps/crablink-tauri/src-tauri/src/commands/assets.rs
apps/crablink-tauri/src-tauri/src/media/limits.rs
```

Backend RustyOnions, likely:

```text
crates/omnigate/src/routes/v1/assets.rs
crates/svc-gateway/src/...
crates/omnigate/tests/...
crates/svc-gateway/tests/...
```

Exact backend file names must be verified from the current RustyOnions codebundle before patching.

---

## 3.5 Acceptance criteria for limit work

The next patch should be considered good only if:

```text
Tauri Rust check passes.
Frontend build passes.
The UI shows the new cap accurately.
Attempting a file above cap fails clearly before wallet hold.
Attempting a staged output under cap proceeds.
No raw bytes are exposed to React.
No private path is exposed to React.
No fake CID or fake receipt is generated.
```

Manual smoke:

```text
1. Use a source that produces at least one staged MP4 above 10 MiB but below the new cap.
2. Confirm prepare succeeds.
3. Confirm hold succeeds.
4. Confirm staged upload succeeds.
5. Confirm backend returns real b3/crab URL.
6. Open minted crab:// video link.
7. Confirm smaller existing videos still mint.
8. Try a file above the new cap and confirm a clear cap error before spend.
```

---

# 4. Priority 2 — Make bundle manifests cross-link all video versions

## 4.1 User goal

The user wants:

```text
every video version in a bundle should list the other video versions in its manifest
```

This should mirror what was done for images.

Example desired experience:

```text
Open crab://<desktop_1080p_hash>.video
→ manifest/page shows:
  source_clean_master
  desktop_1080p
  tablet_720p
  mobile_480p
  low_360p
  poster_image
  thumbnail_image

Open crab://<mobile_480p_hash>.video
→ manifest/page still shows:
  source_clean_master
  desktop_1080p
  tablet_720p
  mobile_480p
  low_360p
  poster_image
  thumbnail_image
```

The key is not just displaying the bundle in the publish panel. The user wants the relationship durable enough that each minted version can find the rest later.

---

## 4.2 Current known issue

Current staged upload appears to upload outputs one-by-one.

This creates a sequencing problem:

```text
first upload does not yet know final backend CIDs/crab URLs for later uploads
second upload may know first upload, but not all later uploads
last upload can know earlier uploads, but earlier uploaded manifests cannot include later URLs unless updated or pointed to a shared bundle manifest
```

This means a naive one-pass upload cannot make every version’s immutable manifest contain all siblings unless one of the following is true:

```text
the backend accepts a precomputed bundle manifest pointer
the backend lets us update/rewrite manifests after all uploads finish
the backend stores group metadata separately and hydrate-time lookup joins it
the frontend only displays local bundle data, which is not durable
```

Important content-addressing principle:

```text
b3 hashes are immutable content truth.
If manifest bytes change, that creates a new b3 object.
Do not pretend an old b3 manifest mutated in place.
Names/pointers can update; canonical content cannot.
```

---

## 4.3 Immediate next step: study image implementation

Do not invent a new video manifest contract until the next session inspects exactly how image bundles currently work.

Files to inspect:

```text
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
apps/crablink-tauri/src/pages/image/ImageManifest.jsx
apps/crablink-tauri/src/pages/asset/ImageAssetManifestFacts.jsx
apps/crablink-tauri/src/pages/image/ImageRenditions.jsx
apps/crablink-tauri/src/shared/manifest/renditionGroups.js
apps/crablink-tauri/src/shared/manifest/uniformManifest.js
apps/crablink-tauri/src/shared/manifest/linkedAssets.js
apps/crablink-tauri/src/shared/api/assetClient.js
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
apps/crablink-tauri/src/shared/embed/crabVideoEmbed.jsx
```

Specific questions:

```text
How does image store rendition group metadata?
Is it sent in headers?
Is it sent in the upload body metadata?
Is it stored by backend into each asset manifest?
Is it only frontend/local-catalog display data?
Does the image asset page hydrate the sibling list from backend manifest facts?
Does the image asset page hydrate the sibling list from local catalog?
Does a fresh app instance still show siblings after opening one image URL?
```

The last question matters most:

```text
If the image cross-linking survives app restart / fresh open, it is durable backend-backed.
If it only appears because the local publish panel cached it, it is display-only.
```

---

## 4.4 Current possible designs

### Option A — Frontend display bundle only

Current-ish path:

```text
upload outputs one by one
build a client-side result bundle after all uploads return
display all URLs in the publish panel
maybe write local catalog entries
```

Pros:

```text
easy
works now
no backend changes
good for immediate UI polish
```

Cons:

```text
not durable
fresh app instance may not know sibling versions
each backend asset manifest may not contain all siblings
not acceptable as final answer to user's goal
```

Use this only as a temporary UX improvement, not final manifest truth.

---

### Option B — Predeclare planned siblings in each upload

Path:

```text
each upload includes planned roles/group metadata
backend stores planned group structure
CIDs/crab URLs unknown for future siblings
```

Pros:

```text
each asset can know it belongs to a planned group
no second pass required
```

Cons:

```text
does not include final sibling CIDs/crab URLs
still incomplete
not enough for “open any version and see all other links”
```

Useful only as supporting metadata, not complete cross-linking.

---

### Option C — Bundle manifest object after all mints

Path:

```text
upload all video/image outputs
collect all returned CIDs/crab URLs
build a video bundle manifest JSON
publish that bundle manifest as its own object/asset
all versions point to the bundle manifest if possible
viewer can fetch bundle manifest to show siblings
```

Pros:

```text
durable group source
content-addressed
does not require mutating already minted asset manifests
cleanly matches b3 immutability
can include videos, poster, thumbnail, captions later
```

Cons:

```text
requires route/contract for generic/video bundle manifest object
individual assets still need a way to know the bundle manifest pointer
if pointer was not known at first upload, assets need update or index relationship
```

This is probably the cleanest long-term model if backend supports it.

---

### Option D — Two-phase manifest update/rewrite

Path:

```text
upload all outputs
collect all CIDs/crab URLs
rewrite or republish each asset manifest with full sibling list
```

Pros:

```text
each version directly lists every other version
matches user goal most directly
```

Cons:

```text
may require new backend route
cannot mutate old b3 content in place
must model as new manifest CID or updated pointer
could become confusing if asset CID and manifest CID differ
```

This can work only if backend architecture already supports asset manifest revisions or mutable index pointers.

---

### Option E — Backend rendition group index

Path:

```text
all uploaded assets share a group id
backend stores relationships in svc-index
asset hydration asks index for siblings by group id
asset manifest may contain group id, while sibling list is hydrated from index
```

Pros:

```text
good fit for reference graphs
does not mutate immutable content
each asset can hydrate siblings
works for future video/music/images/film/podcast bundles
```

Cons:

```text
requires backend/index contract
more work than local UI patch
must define ownership/policy for who can add assets to a group
```

This may be the most RustyOnions-native long-term model, but it is likely beyond the next UI patch.

---

## 4.5 Recommended manifest strategy for next session

Recommended next-session plan:

```text
Step 1: Inspect image implementation and document how image cross-linking really works.
Step 2: Bring video to image parity using the same mechanism.
Step 3: If image mechanism is only local/display cache, improve video display cache but mark it display-only.
Step 4: Design the durable backend-backed video bundle manifest/index flow as the next backend contract.
```

Do not skip Step 1.

The safest immediate implementation is:

```text
create a normalized video result bundle after all uploads return
include every minted output with role/label/kind/cid/crabUrl/width/height/codec/bytes
write local catalog display entries for every output
update draft/video manifest preview with a clear rendition group block
make video page/opened asset display the known local bundle if available
```

But label it correctly:

```text
local display bundle
not backend truth
not durable manifest truth
```

The final implementation should become durable after backend support is confirmed or added.

---

## 4.6 Desired video bundle manifest shape

Do not treat this as final contract. It is a sketch for the next session to compare against current image conventions.

Possible durable shape:

```json
{
  "schema": "crablink.video.bundle.v1",
  "kind": "video_bundle",
  "groupId": "video-rendition-group:<stable-id-or-bundle-cid>",
  "primaryRole": "source_clean_master",
  "createdAt": "<iso timestamp>",
  "source": {
    "title": "<title>",
    "creator": "<passport subject>",
    "wallet": "<owner wallet display/account if allowed>"
  },
  "videos": [
    {
      "role": "source_clean_master",
      "label": "Clean master",
      "assetKind": "video",
      "contentId": "b3:<hash>",
      "crabUrl": "crab://<hash>.video",
      "mime": "video/mp4",
      "width": 1920,
      "height": 1080,
      "durationSeconds": 123.45,
      "codec": "h264",
      "audioCodec": "aac",
      "bytes": 12345678
    },
    {
      "role": "mobile_480p",
      "label": "Mobile 480p",
      "assetKind": "video",
      "contentId": "b3:<hash>",
      "crabUrl": "crab://<hash>.video",
      "mime": "video/mp4",
      "width": 854,
      "height": 480,
      "durationSeconds": 123.45,
      "codec": "h264",
      "audioCodec": "aac",
      "bytes": 3456789
    }
  ],
  "linkedImages": [
    {
      "role": "poster_image",
      "label": "Poster image",
      "assetKind": "image",
      "contentId": "b3:<hash>",
      "crabUrl": "crab://<hash>.image",
      "mime": "image/jpeg"
    },
    {
      "role": "thumbnail_image",
      "label": "Thumbnail image",
      "assetKind": "image",
      "contentId": "b3:<hash>",
      "crabUrl": "crab://<hash>.image",
      "mime": "image/jpeg"
    }
  ],
  "truthBoundary": {
    "backendCids": true,
    "frontendDisplayCache": false,
    "receiptTruth": "wallet/backend receipt only",
    "paidUnlockTruth": "content-view/wallet/backend only"
  }
}
```

Again: exact shape must match the current manifest conventions, especially `renditionGroups.js`, `linkedAssets.js`, and `uniformManifest.js`.

---

## 4.7 Acceptance criteria for bundle cross-linking

Minimum acceptable next milestone:

```text
After minting a video bundle, the publish panel displays a clean “Video versions” section.
Each minted version shows all sibling minted versions.
Each result includes role, label, quality, CID, crab URL, bytes, and copy buttons.
The draft/manifest preview includes the bundle relationship.
Local catalog entries are written for every version.
Opening a minted video from the same app session can show sibling versions from the local display bundle.
All display-cache-only data is clearly not called backend truth.
```

Durable acceptance goal:

```text
Fresh app instance opens any minted video URL.
Hydrated asset page shows all sibling versions.
The sibling list comes from backend manifest/index truth or a content-addressed bundle manifest.
No local-only cache is required.
Every sibling link is backend-returned crab URL/CID.
No immutable b3 content is pretended to mutate.
```

---

# 5. Priority 3 — Clean up video page UI to match image page polish

## 5.1 User goal

The video page currently still feels like a developer page.

The user wants it to look and feel more like the image page:

```text
clean
professional
creator-friendly
less dev clutter
better visual hierarchy
still detail-rich underneath
```

This matches prior image-page work: keep the data, but make it neat.

---

## 5.2 Current video page rough structure

Relevant files:

```text
apps/crablink-tauri/src/pages/video/VideoPage.jsx
apps/crablink-tauri/src/pages/video/VideoDraft.jsx
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
apps/crablink-tauri/src/pages/video/VideoLocalPlaybackPreview.jsx
apps/crablink-tauri/src/pages/video/video.css
```

Current functional blocks likely include:

```text
route truth panel
draft form
local preview
converter panel
rendition plan
publish flow
developer JSON/details
manifest preview
copy buttons
technical status chips
```

Problem:

```text
Too much implementation detail is visible at the top level.
Developer diagnostics compete with creator workflow.
Minting mechanics are visible before the user understands the simple flow.
```

---

## 5.3 Desired video page layout

Mirror the image page’s cleaner hierarchy.

Recommended top-level layout:

```text
Top hero:
  title
  short purpose
  key status badges
  one clear CTA: Choose video source

Main upper area:
  left: polished video preview / poster preview / playback preview
  right: publish card with prepare/hold/upload status

Middle:
  selected source facts
  verified output versions
  quality cards

Lower:
  manifest / linked assets / advanced fields
  developer diagnostics collapsed by default
```

Possible visual order:

```text
1. Video preview / source picker
2. Pay/mint action card
3. Verified versions / rendition group
4. Poster + thumbnail
5. Manifest / metadata fields
6. Advanced / developer JSON collapsed
```

For consistency with image page:

```text
preview and pay stuff should be high on page
version/rendition cards underneath
manifest/detail-rich info lower
mundane technical/debug info lowest and collapsed
```

---

## 5.4 UI principles for video page cleanup

Keep:

```text
source facts
verified output facts
version list
bundle result list
manifest preview
developer JSON
copy buttons
truth boundaries
```

But reorganize:

```text
creator workflow first
developer diagnostics last
advanced controls collapsed
technical JSON hidden by default
plain-language state labels
clean cards instead of huge raw panels
```

Avoid:

```text
giant JSON visible by default
too many warning badges at top
duplicated facts across multiple blocks
scary dev labels for normal creator flow
button overload
raw staged handles as primary visible content
```

Preferred labels:

```text
Choose source
Prepare versions
Review ROC hold
Mint selected versions
Open video
Copy crab URL
Copy CID
Show developer details
```

Avoid making normal users read:

```text
staged://video-job/...
strict DTO
idempotency key
receipt hash
wallet txid
gateway correlation id
```

Those belong in developer details.

---

## 5.5 Suggested component responsibilities after cleanup

### `VideoPage.jsx`

Should own:

```text
page shell
principles
top-level layout
route truth panel placement
```

Should not own:

```text
upload details
job polling details
FFmpeg facts rendering details
manifest cross-link logic
```

### `VideoDraft.jsx`

Should own:

```text
creator-facing draft metadata
title
description
tags
rights/access/price form integration
manifest preview integration
```

Should avoid:

```text
huge embedded technical conversion flow
```

### `VideoConverterPanel.jsx`

Should own:

```text
source selection
local prepare job
output readiness
verified staged versions
poster/thumbnail generation display
```

Should render as:

```text
compact source card
verified output cards
developer details collapsed
```

### `VideoPublishFlow.jsx`

Should own:

```text
prepare/hold/upload sequence
output selection
result bundle
copy/open links
local catalog entries
```

Should render as:

```text
clean mint card
stepper-style progress
selected outputs summary
successful output result cards
developer request/response collapsed
```

### `VideoRenditions.jsx`

Should own:

```text
quality/version list display
roles
labels
dimensions
bytes
codec facts
relationship/bundle display
```

Should become the reusable display for:

```text
planned renditions
staged renditions
minted renditions
hydrated manifest renditions
```

### `VideoLocalPlaybackPreview.jsx`

Should own:

```text
safe local preview only
no b3 truth
no backend unlock claim
```

Potentially it can be visually promoted to the top-left preview position.

### `video.css`

Should carry most UI polish.

Need to mirror the image page’s visual language:

```text
cards
section spacing
two-column upper layout
responsive collapse
quality chips
muted metadata
developer drawers
result cards
poster/thumbnail grid
```

---

## 5.6 UI acceptance criteria

The video page cleanup is good when:

```text
A normal creator can understand the flow without reading JSON.
The first visible action is obvious.
The page looks like a product page, not an API tester.
The advanced data is still available but collapsed.
The user can see source preview and mint controls near the top.
The generated versions are clearly listed as cards.
The minted results are easy to open/copy.
The page visually matches the polish level of the image page.
No functionality is removed.
No truth boundary is weakened.
```

Manual UX smoke:

```text
1. Open crab://video.
2. The page should look clean before selecting a file.
3. Choose source.
4. Preview should be prominent.
5. Prepare versions.
6. Verified output cards should show real dimensions/qualities clearly.
7. Mint selected versions.
8. Results should appear as clean cards.
9. Developer JSON should be collapsed but accessible.
10. Nothing should imply local preview is backend truth.
```

---

# 6. Known invariants to preserve

## 6.1 Tauri-first doctrine

Continue treating CrabLink Tauri as the primary client.

```text
Tauri = primary native Rust-backed RON client
Chrome = proof/companion/gateway smoke surface
```

Do not redesign major video work around Chrome first.

---

## 6.2 React / Rust authority split

React may:

```text
render UI
collect user intent
show source facts
request native commands
request backend client calls
show backend-returned CIDs/crab URLs
show receipts returned by backend/wallet flow
```

React must not:

```text
receive private source paths
receive raw media bytes
receive private keys
invent CIDs
invent receipts
invent balances
unlock paid content from cache
mutate ledger truth
bypass wallet confirmation
construct raw native shell commands
```

Tauri Rust may:

```text
hold native source paths privately
run allowlisted FFmpeg/ffprobe commands
stage local outputs
stream/upload staged files through bounded commands
redact outputs
return staged handles and facts
```

Tauri Rust must not:

```text
become wallet truth
become ledger truth
invent backend CIDs
invent receipts
unlock paid content locally
return huge video bytes in command results
expose private paths
run arbitrary commands
```

Backend remains truth for:

```text
b3 CID
crab URL
receipt
wallet hold/capture/release
ledger mutation
paid unlock
ownership
storage/index truth
```

---

## 6.3 ROC / wallet / paid-flow invariants

Paid flow stays:

```text
prepare/quote
→ explicit user confirmation
→ wallet hold
→ backend upload/mint
→ backend receipt/truth
→ render/unlock/display
```

Never allow:

```text
silent ROC spend
fake receipt
fake balance
fake hold
frontend-only unlock of paid content
Tauri direct ledger mutation
gateway/omnigate direct ledger mutation
```

---

## 6.4 b3 / crab invariants

Canonical internal content ID:

```text
b3:<64 lowercase hex>
```

Public asset URL:

```text
crab://<64 lowercase hex>.video
crab://<64 lowercase hex>.image
```

Reminder:

```text
b3 is content truth.
crab:// is navigation.
Names/pointers can resolve.
Cache does not create truth.
```

For bundle manifests:

```text
Do not mutate b3 content in place.
If manifest content changes, it is a new b3 object.
If an index pointer changes, call it a pointer/index update, not mutation of the old manifest.
```

---

# 7. Recommended next-session patch order

## Batch 1 — Upload limit investigation and controlled cap raise

Goal:

```text
remove the immediate 10 MB blocker without unsafe unbounded media behavior
```

Files likely involved:

```text
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src-tauri/src/commands/assets.rs
apps/crablink-tauri/src-tauri/src/media/limits.rs
```

Possible backend files after inspection:

```text
crates/omnigate/src/routes/v1/assets.rs
crates/svc-gateway/...
```

Patch goals:

```text
centralize video upload cap
make UI display actual cap
align frontend and Rust cap
fail before wallet hold if over cap
keep staged upload private
do not expose bytes/path to React
```

If full-buffering exists:

```text
raise only moderately and document as video-lite cap
```

If streaming exists or can be implemented cleanly:

```text
raise more confidently but still bounded
```

---

## Batch 2 — Video bundle result model

Goal:

```text
after all selected staged outputs mint, build a normalized result bundle object
```

Likely files:

```text
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src/shared/catalog/localCatalog.js
```

Patch goals:

```text
collect every successful output
normalize roles/kinds/cids/crabUrls/facts
write local catalog display entries
show clean result cards
prepare structure for manifest cross-linking
```

---

## Batch 3 — Inspect/mirror image manifest cross-linking

Goal:

```text
make video match image rendition/link behavior
```

Files to inspect first:

```text
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
apps/crablink-tauri/src/pages/image/ImageManifest.jsx
apps/crablink-tauri/src/pages/asset/ImageAssetManifestFacts.jsx
apps/crablink-tauri/src/pages/image/ImageRenditions.jsx
apps/crablink-tauri/src/shared/manifest/renditionGroups.js
apps/crablink-tauri/src/shared/manifest/linkedAssets.js
apps/crablink-tauri/src/shared/manifest/uniformManifest.js
```

Then patch video files:

```text
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
apps/crablink-tauri/src/pages/video/videoDraftModel.js
apps/crablink-tauri/src/shared/embed/crabVideoEmbed.jsx
```

Acceptance:

```text
video manifests/drafts/result display show all sibling versions
poster/thumbnail are linked assets
roles and URLs are not duplicated messily
developer JSON shows normalized bundle
```

---

## Batch 4 — Durable backend bundle manifest or index strategy

Only after image behavior is understood.

Potential backend routes/contracts:

```text
generic object manifest upload
video bundle manifest upload
rendition group index write
asset manifest revision pointer
```

Need to avoid:

```text
pretending immutable b3 manifests mutate
```

Best likely direction:

```text
content-addressed bundle manifest
or svc-index relationship graph keyed by group id
```

This may require RustyOnions backend changes.

---

## Batch 5 — UI cleanup to image-page quality

Goal:

```text
make crab://video feel like a polished creator page
```

Likely files:

```text
apps/crablink-tauri/src/pages/video/VideoPage.jsx
apps/crablink-tauri/src/pages/video/VideoDraft.jsx
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
apps/crablink-tauri/src/pages/video/VideoLocalPlaybackPreview.jsx
apps/crablink-tauri/src/pages/video/video.css
```

Patch goals:

```text
preview and mint flow at top
versions in attractive cards
manifest/details below
developer JSON collapsed
result bundle clean
no dev-page look
same polish as image page
```

---

# 8. Testing / green gates

Run from the user’s current default path:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

For Tauri app checks:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run check:rust:mac-media
npm run build
```

If frontend-only patch:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
```

If RustyOnions backend changes:

```bash
cd /Users/mymac/Desktop/RustyOnions
cargo fmt
cargo clippy --all-targets -- -D warnings
cargo test
```

Use narrower package checks if full workspace is too heavy, but do not skip relevant route tests.

Manual video smoke checklist:

```text
1. Start full dev stack.
2. Open CrabLink Tauri.
3. Confirm wallet/dev account has ROC.
4. Navigate to crab://video.
5. Choose native video source.
6. Prepare versions.
7. Confirm verified dimensions for 1080p/720p/480p/360p.
8. Select multiple video outputs and poster/thumbnail.
9. Prepare video asset.
10. Confirm strict DTO does not include frontend-only fields.
11. Review wallet hold.
12. Upload/mint.
13. Confirm every selected version returns CID/crab URL.
14. Open every returned crab:// video URL.
15. Confirm playback or capture route error.
16. Confirm result bundle lists all versions.
17. Confirm page UI is clean and developer details are collapsed.
18. Try video above old 10 MB cap but below new cap.
19. Try video above new cap and verify clean pre-spend failure.
```

Regression checks:

```text
image page still mints images and renditions
music/podcast pages still play after paid unlock
stream page still works for stream-lite
wallet hold path still requires explicit confirmation
no silent spend introduced
no fake CID/receipt introduced
```

---

# 9. Important warnings for next AI instance

Do not:

```text
turn CrabLink Tauri into backend truth
invent balances
invent receipts
invent b3 CIDs
return private paths to React
return raw video bytes through command results
make localhost mandatory for normal users
introduce QuickChain/external settlement
introduce ROX/Solana/staking/liquidity
claim DRM/anti-rip protection
make cache unlock paid content
mutate immutable b3 manifests in place
```

Do:

```text
keep Tauri primary
keep gateway compatibility first
preserve explicit paid flow
mirror image page patterns where possible
use Rust for media-native work
keep video media bounded and honest
collapse developer diagnostics by default
make normal creator workflow clean
document display-only vs backend truth
```

---

# 10. One-paragraph starting prompt for next session

We are continuing CrabLink Tauri `crab://video`. The latest success: after the Rust `video_transcode.rs` / `video_jobs.rs` correctness patch, all generated staged qualities minted successfully with their own backend mints. Video-lite multi-rendition minting is now proven. Next priorities are: raise/rework the current 10 MB video upload cap safely, make every video in a bundle list/cross-link the other videos in the bundle like images, and clean up the video page UI so it looks like the polished image page instead of a dev page. Preserve all invariants: Tauri is primary; React is display/user intent only; Rust holds native paths privately; backend returns b3/crab truth; paid actions require explicit confirmation; no fake balances, no fake receipts, no silent spend, no private paths or raw video bytes in React, and no unbounded large-media buffering. Start by inspecting `VideoPublishFlow.jsx`, `videoAssetClient.js`, `assets.rs`, the image rendition/manifest files, and current backend upload caps before patching.

---

# 11. Recommended first next patch

The best first patch next session is:

```text
Upload cap cleanup and investigation patch
```

Target:

```text
centralize the video-lite upload cap
raise it safely
align UI + Tauri Rust constants
ensure over-cap failure happens before wallet hold
add clear user-facing copy
do not create unsafe full-file buffering
```

Suggested patch files after inspection:

```text
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src-tauri/src/commands/assets.rs
apps/crablink-tauri/src-tauri/src/media/limits.rs
```

Only after this is green should the next patch tackle:

```text
video bundle result normalization
image-style manifest/rendition cross-linking
video page UI polish
```


### END NOTE - MAY 30 2026 - 19:30 CST



### BEGIN NOTE - MAY 31 2026 - 13:10 CST

The next session should focus on **durable video bundle manifest parity with images**. The current codebundle shows we already added video-specific manifest/display pieces like `VideoAssetManifestFacts.jsx`, `VideoRenditionGroupCard`, and `normalizeVideoRenditionGroup`, but your screenshot proves the hydrated `.video` asset page still says **Bundle: Not returned** and does not list the sibling versions yet.   The carryover notes also correctly identify the core problem: every video version should know the clean master, desktop/tablet/mobile/low versions, poster, and thumbnail, but a naive one-by-one upload cannot make early immutable manifests know later backend-returned URLs unless we use the same mechanism images use or add a durable bundle/index contract. 

# CrabLink Tauri Carryover Notes — Video Page / Video Manifest Parity

## Current session stopping point

We made strong progress on the `crab://video` route. The video mint page now looks much closer to the image page, and the post-mint result panel is a real improvement.

The latest successful video mint now shows a clean backend-returned bundle result after minting:

* 5 video outputs
* 2 image outputs
* clean master video
* desktop 1080p video
* tablet 720p video
* mobile 480p video
* low 360p video
* poster image
* thumbnail image

The mint result panel now displays each returned output with:

* role / type
* crab URL
* b3 CID
* asset facts
* Open button
* Copy URL button
* Copy CID button

This is much closer to the image mint result experience.

However, the key missing piece remains:

**Opening a minted video version does not yet show the full sibling rendition group on the video asset/manifest page.**

In the latest screenshot, opening the clean master `.video` asset page shows:

* `Video manifest`
* `Untitled video`
* `Clean master`
* creator/passport field
* current role
* access info
* canonical URL / content object ID / hash
* paid content view panel

But the page still says:

* `Bundle: Not returned`

And it does **not** show the full sibling list:

* clean master
* desktop 1080p
* tablet 720p
* mobile 480p
* low 360p
* poster image
* thumbnail image

This is the next major task.

---

## User goal for next session

The user wants video to behave like image bundles.

For images, after minting multiple generated versions, each image manifest page can show the other generated versions. The image page has the desired model:

* original/canonical asset
* generated sibling renditions
* every rendition has its own b3 CID
* every rendition has its own crab URL
* resolved pages show all versions
* current version is highlighted
* technical details are preserved but visually demoted

Video must match that behavior.

Desired video behavior:

Open:

```text
crab://<clean_master_hash>.video
```

The manifest page should show:

```text
Clean master
Desktop 1080p
Tablet 720p
Mobile 480p
Low 360p
Poster image
Thumbnail image
```

Open:

```text
crab://<mobile_480p_hash>.video
```

The manifest page should still show the same group, with `Mobile 480p` highlighted as the current version.

Open:

```text
crab://<poster_hash>.image
```

If the poster is part of a video bundle, the image asset page should preferably show that it belongs to a video bundle and list the associated videos too, or at minimum show a clear linked-assets/bundle relationship.

---

## Most important distinction

The post-mint result panel is now good, but it is not enough.

There are two different surfaces:

1. **Mint result panel**

   * This is the page immediately after upload.
   * It already has local knowledge of all returned results.
   * It can show all versions because the upload flow has the full completed bundle in memory.

2. **Hydrated asset/manifest page**

   * This is what you see when visiting `crab://<hash>.video`.
   * This page must retrieve enough data from gateway/backend/index/manifest/local catalog to reconstruct the sibling group.
   * This is currently incomplete.

The remaining problem is not just UI polish. It is a data propagation / hydration problem.

---

## Current working pieces

### Video page shell

Current route:

```text
apps/crablink-tauri/src/pages/video/VideoPage.jsx
```

Current purpose:

* owns `crab://video`
* uses the image-style simple mint workspace
* renders `VideoDraft`
* keeps React display-only
* no fake b3 CID
* no fake manifest CID
* no direct wallet mutation
* no backend publication claim before gateway response

This file is mostly okay now.

---

### Video draft page

Current route:

```text
apps/crablink-tauri/src/pages/video/VideoDraft.jsx
```

Current purpose:

* video preview/select card
* title + description
* collapsed advanced fields
* collapsed prepare MP4 versions section
* publish flow below

This is much closer to image page layout now.

Still possible polish later:

* reduce vertical size of the empty preview if it still feels too tall
* make “Choose video” positioning match image page exactly
* make advanced drawers visually identical to image page
* keep title/description spacing aligned with image page

But do not let this block manifest work.

---

### Video converter / Rust prepare flow

Relevant files:

```text
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
apps/crablink-tauri/src/shared/api/videoConverterClient.js
apps/crablink-tauri/src-tauri/src/media/video_sources.rs
apps/crablink-tauri/src-tauri/src/media/video_probe.rs
apps/crablink-tauri/src-tauri/src/media/video_renditions.rs
apps/crablink-tauri/src-tauri/src/media/video_transcode.rs
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
apps/crablink-tauri/src-tauri/src/commands/media.rs
```

Current status:

* user can choose one native source
* Rust registers private path internally
* React receives only a redacted source handle / facts
* Rust prepares staged outputs
* staged outputs include videos and JPEG images
* staged outputs can be minted successfully
* no local preview path is persisted as backend truth
* no React-side private path authority
* no fake receipt
* no fake CID

Known remaining converter issue from previous notes:

* verify actual dimensions of outputs
* there may be a height-only scaling bug or insufficient proof that 480p/360p are dimensionally resized correctly
* add output dimension verification after FFmpeg output
* do not rely only on bitrate/size drop as proof

This is important but lower priority than manifest cross-linking unless output quality/resizing blocks user trust.

---

### Video publish flow

Relevant file:

```text
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
```

Current status:

* prepare request works
* explicit ROC hold works
* staged upload works
* 7 outputs minted successfully
* post-mint result panel now shows all outputs
* auto-open after mint was removed, so the user can inspect returned results
* Open/Copy buttons work in result list
* primary URL and primary CID are displayed

Current successful bundle roles:

```text
source_clean_master
desktop_1080p
tablet_720p
mobile_480p
low_360p
poster_image
thumbnail_image
```

Current mint result screenshot looked good:

```text
Video bundle minted
5 Videos
2 Images
Primary CID
Receipt
Clean Master
Desktop 1080p
Tablet 720p
Mobile 480p
Low 360p
Poster Image
Thumbnail Image
```

This is a major improvement.

Remaining issue:

The publish flow can display the completed bundle locally, but the hydrated asset page does not yet receive or reconstruct that bundle relationship.

---

## Current suspected root cause

The upload flow mints outputs one by one.

That creates a sequencing problem.

When the first asset is uploaded, it may not yet know the final backend-returned CIDs/crab URLs for later outputs.

Example:

1. Upload clean master.

   * Backend returns clean master CID/URL.
   * But desktop/tablet/mobile/poster/thumbnail backend URLs may not yet exist.

2. Upload desktop 1080p.

   * Could know clean master.
   * Still may not know all later outputs.

3. Upload final thumbnail.

   * Now the flow knows all prior outputs.
   * But earlier immutable asset manifests cannot be silently mutated.

Because b3 content is immutable, we must not pretend an existing b3 manifest changed in place.

So there are only a few valid strategies:

### Strategy A — Match image implementation exactly

This is the safest immediate approach.

Next session should inspect the image pipeline carefully and copy its mechanism.

Questions to answer:

```text
How does image bundle cross-linking actually work?
Does image send sibling data in headers?
Does image send sibling data in upload metadata?
Does backend store the sibling map in every image asset manifest?
Does the asset page read the sibling map from backend response?
Does it fall back to local catalog?
Does it still work after app restart?
```

Files to inspect first:

```text
apps/crablink-tauri/src/pages/image/ImagePublishFlow.jsx
apps/crablink-tauri/src/pages/image/ImageManifest.jsx
apps/crablink-tauri/src/pages/asset/ImageAssetManifestFacts.jsx
apps/crablink-tauri/src/pages/image/ImageRenditions.jsx
apps/crablink-tauri/src/shared/manifest/renditionGroups.js
apps/crablink-tauri/src/shared/manifest/uniformManifest.js
apps/crablink-tauri/src/shared/manifest/linkedAssets.js
apps/crablink-tauri/src/shared/api/assetClient.js
```

Then compare with:

```text
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoRenditions.jsx
apps/crablink-tauri/src/shared/api/videoAssetClient.js
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
apps/crablink-tauri/src/pages/asset/VideoAssetManifestFacts.jsx
```

Do not invent a new contract before confirming the image mechanism.

---

### Strategy B — Local display bundle cache as temporary bridge

If image cross-linking turns out to be local/display-cache based, we can implement the same for video.

This would mean:

* after video mint completes, build a normalized completed bundle object from backend-returned results
* write display-only local catalog entries for every output
* key the bundle by every output CID
* when opening any output in the same app session, hydrate sibling display from local catalog
* label it clearly as display cache, not durable backend truth

Important wording:

```text
Local display bundle
Not backend manifest truth
Not durable ownership truth
Not paid unlock truth
Not receipt truth
```

This is acceptable as a short-term UI bridge, but not final.

---

### Strategy C — Backend/index-backed rendition group

This is probably the cleanest long-term RustyOnions-native model.

Each asset gets:

```text
group_id
role
canonical/source CID
```

Then backend/index/omnigate can hydrate:

```text
all assets in this group
```

This avoids mutating immutable b3 content.

Possible backend/index idea:

```text
svc-index stores relation:
group_id -> asset CIDs/URLs/roles
asset_cid -> group_id
```

Then asset hydration returns the group.

Pros:

* works after app restart
* no local display cache required
* respects b3 immutability
* future-ready for image/video/music/podcast bundles
* clean fit for reference-graph sites

Cons:

* requires backend/index contract
* more work than UI patch
* must define who can add assets to a group
* must ensure paid/ownership policy is correct

This is likely needed eventually.

---

### Strategy D — Bundle manifest object

Another durable approach:

1. Upload all outputs.
2. Collect backend-returned CIDs/crab URLs.
3. Build one video bundle manifest object.
4. Publish that object as its own content-addressed JSON.
5. Each asset page uses a bundle manifest pointer or index lookup to show siblings.

Pros:

* content-addressed
* no mutation of old b3 content
* can include poster, thumbnail, captions, subtitles, transcripts later
* durable and inspectable

Cons:

* individual assets still need a way to find the bundle manifest
* if pointer was not known at first upload, need index relationship or manifest revision pointer
* requires backend route/contract for generic bundle manifest object

Good long-term direction, but first inspect image implementation.

---

## Key current code pieces to inspect/fix

### `AssetHydratedView.jsx`

Relevant file:

```text
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
```

Current work already added:

* import `VideoAssetManifestFacts`
* render `VideoAssetManifestFacts` for video route
* added `VideoRenditionGroupCard`
* added `normalizeVideoRenditionGroup`
* added `normalizeVideoRenditionItem`
* added `normalizeVideoRenditionSelf`
* attempted to treat image rendition card as video bundle when image page sees video renditions

Problem shown by screenshot:

* video asset page does not receive a usable `summary.renditionGroup`
* `VideoAssetManifestFacts` says bundle not returned
* `VideoRenditionGroupCard` probably does not render because `summary.renditionGroup?.renditions?.length` is zero

Next debugging steps:

1. Open a minted `.video` page.
2. Use existing developer JSON/details if available.
3. Inspect hydrated gateway response shape.
4. Find where the video group metadata exists, if anywhere.
5. Confirm whether backend response includes:

   * `rendition_group`
   * `renditionGroup`
   * `metadata.rendition_group`
   * `metadata.video_rendition_group`
   * `manifest.rendition_group`
   * `manifest.video_rendition_group`
   * headers converted to body fields
   * local catalog entry
6. Fix normalizer paths accordingly.

Likely issue:

The frontend normalizer is ready to read a video rendition group, but the gateway/hydrated response is not returning one for the individual `.video` asset.

---

### `VideoAssetManifestFacts.jsx`

Relevant file:

```text
apps/crablink-tauri/src/pages/asset/VideoAssetManifestFacts.jsx
```

Current status:

* exists
* renders a video manifest card
* knows about `summary.renditionGroup`
* displays `Bundle: Not returned` when no group exists

Needed improvements:

* once the sibling group is hydrated, show:

  * current role
  * bundle count
  * canonical primary
  * poster/thumbnail relationship
* improve layout to match image manifest page more closely
* avoid smashed text / missing spaces in fields
* make title/description cleaner

Current screenshot shows text formatting issues:

```text
Creatorpassport main:dev
RenditionClean master
BundleNot returned
Accesspaid content_view
```

There should be spacing or pill/fact-card formatting:

```text
Creator: passport:main:dev
Rendition: Clean master
Bundle: 7 linked outputs
Access: paid content_view
```

Fix CSS/layout for video manifest identity strip if needed.

---

### `VideoRenditionGroupCard`

Relevant location:

```text
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
```

Current status:

* likely exists
* should show a table similar to image rendition group card
* currently not appearing because no group is hydrated

Once group data exists, verify:

* it renders for `.video`
* current version is highlighted
* primary/source version is highlighted
* poster/thumbnail are visually distinguished as linked image assets
* Open button navigates correctly
* Copy URL and Copy CID buttons work
* raw JSON is collapsed

Suggested labels:

```text
Clean master
Desktop 1080p
Tablet 720p
Mobile 480p
Low 360p
Poster image
Thumbnail image
```

Suggested fact labels:

```text
Group ID
Source CID
Canonical primary
Current role
```

---

### `VideoPublishFlow.jsx`

Relevant file:

```text
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
```

Current status:

* post-mint display is good
* shows `7 minted`
* shows `5 Videos`, `2 Images`
* lists all rows
* raw video rendition group JSON exists
* likely builds a completed bundle object from returned results

Needed next:

* ensure the completed rendition group uses backend-returned CIDs/URLs, not predicted-only values
* ensure the group’s relationship truth changes from prediction to backend-returned truth after upload
* ensure every result includes:

  * role
  * label
  * assetKind
  * cid
  * crabUrl
  * mime/contentType
  * bytes
  * width/height if known
  * backendVerified or predictionMatched
* ensure if writing local catalog, it writes entries for every output, not only primary video
* ensure local catalog links each CID to the completed bundle if using temporary display cache

Important invariant:

Do not call predicted CIDs backend truth unless the backend confirms the same CID.

Better language after upload:

```text
relationship_truth: backend_returned_asset_urls_after_explicit_paid_upload
```

rather than:

```text
rust_staged_b3_prediction_before_backend_verified_upload
```

Only use predicted values for pre-upload preview.

---

### `videoAssetClient.js`

Relevant file:

```text
apps/crablink-tauri/src/shared/api/videoAssetClient.js
```

Likely needs inspection next session.

Questions:

* Does it attach rendition group metadata to video upload headers?
* Does it attach the same group to every video output?
* Does it include poster/thumbnail links?
* Does it send predicted group or completed group?
* Does it send role/label headers?
* Does backend accept/retain these headers?
* Are image outputs using image headers while video outputs use video headers?
* Are poster/thumbnail images being uploaded with a video group or only image-specific metadata?

Headers to inspect:

```text
x-ron-video-rendition-role
x-ron-video-rendition-label
x-ron-video-rendition-group
x-ron-image-rendition-role
x-ron-image-rendition-label
x-ron-image-rendition-group
```

Need to determine if backend persists these into hydration.

---

### Backend / gateway side to inspect if needed

If frontend is correctly sending metadata but asset hydration does not return it, inspect backend.

Likely RustyOnions files to inspect:

```text
svc-gateway asset upload routes
omnigate hydration routes
asset DTOs in ron-proto
svc-index relationship/pointer storage
svc-storage object metadata path
```

Potential issue:

The upload route may accept headers for upload-time diagnostics but not persist them into asset manifest/hydrated response.

If so, frontend cannot solve durable cross-linking alone.

Next session should not fake durability. If backend does not persist group data, either:

1. add backend persistence/index support, or
2. implement local display cache and label it display-only.

---

## Screenshots from latest session

### Screenshot 1 — Video mint result page

Status:

* much improved
* clean “Video bundle minted” card appears
* shows 7 minted outputs
* rows are readable
* role labels are good
* Open / Copy URL / Copy CID actions exist
* this part is close to acceptable

Remaining polish:

* primary CID and receipt fact cards are too wide / text overflows visually
* may need truncation or smaller typography
* table layout is mostly okay but can be refined later
* not urgent compared to manifest page

### Screenshot 2 — Opened `.video` asset page

Status:

* resolves as `.video`
* shows paid content view panel
* video manifest card appears
* clean master role appears
* canonical URL and content object ID are shown

Problems:

* sibling group not shown
* `Bundle: Not returned`
* fields appear cramped / no visible separators between label and value
* no rendition table
* no poster/thumbnail links
* no full version list
* this is the main next-session target

---

## Next-session priority order

### Priority 1 — Determine why video asset page does not have rendition group data

Start with inspection, not blind patching.

Steps:

1. Open latest `CODEBUNDLE_TAURI_APP.md`.
2. Inspect `AssetHydratedView.jsx`.
3. Inspect `VideoAssetManifestFacts.jsx`.
4. Inspect `VideoPublishFlow.jsx`.
5. Inspect `videoAssetClient.js`.
6. Inspect image equivalents:

   * `ImagePublishFlow.jsx`
   * `ImageAssetManifestFacts.jsx`
   * `ImageRenditions.jsx`
   * `renditionGroups.js`
   * `uniformManifest.js`
   * `linkedAssets.js`
7. Compare how image group data is stored and hydrated.
8. Identify whether video lacks:

   * upload metadata
   * backend persistence
   * frontend parsing
   * local catalog mapping
   * asset hydration display

Deliverable:

A precise diagnosis:

```text
Video group missing because ______.
Image group works because ______.
Best parity fix is ______.
```

---

### Priority 2 — Bring video asset manifest to image parity

Once the data source is known, implement.

Minimum target:

For any opened `.video` version, show:

```text
Video versions
Clean master
Desktop 1080p
Tablet 720p
Mobile 480p
Low 360p
Poster image
Thumbnail image
```

Each row must include:

```text
role/label
crab URL
b3 CID
mime/type
bytes
resolution if known
Open
Copy URL
Copy CID
```

Highlight:

* current opened version
* clean master / primary source
* linked images as image assets

Do not fake backend truth.

If using local cache, label as local display bundle.

---

### Priority 3 — If necessary, write local display bundle cache

If backend/hydration does not return durable group metadata yet, implement display cache.

Suggested structure:

```text
localCatalog.videoBundlesByCid[cid] = completedBundle
```

or equivalent existing local catalog mechanism.

Each minted output CID should map to the same completed bundle.

On asset hydration:

1. Try backend/hydrated rendition group first.
2. If missing, try local display bundle by CID.
3. If found, render it as:

   * “Local display bundle”
   * “Backend CIDs returned”
   * “Sibling relationship from local display cache”
4. Do not call it durable backend manifest truth.

Acceptance for temporary bridge:

```text
After minting a video bundle, click Open on any returned video.
The opened video page shows all 7 outputs from local display cache.
Restart may lose it unless persisted; label accurately.
```

Durable acceptance later:

```text
Fresh app instance opens any minted video URL and still shows siblings from backend/index/manifest truth.
```

---

### Priority 4 — Improve video manifest page layout

After sibling data appears, polish the manifest card.

Fix spacing issues:

Bad current look:

```text
Creatorpassport main:dev
RenditionClean master
BundleNot returned
Accesspaid content_view
```

Desired:

```text
Creator
passport:main:dev

Rendition
Clean master

Bundle
7 linked outputs

Access
paid content_view
```

Use image manifest page as reference.

Also improve video manifest description:

Current:

```text
CrabLink video bundle output: Clean MP4 master. Role: source_clean_master...
```

Better:

```text
Clean MP4 master from a CrabLink video bundle. Prepared locally by Rust/FFmpeg, then minted after explicit ROC confirmation.
```

Keep technical truth but make it readable.

---

### Priority 5 — Video mint flow polish to match image flow

The user still likes the image flow better.

Current video mint page is improved, but final polish should make it closer to image:

Image flow:

```text
Preview
Title / description
Advanced fields collapsed
Quote / ROC hold / mint
Developer details collapsed
Advanced options collapsed
```

Video should be:

```text
Preview
Title / description
Advanced fields collapsed
Prepare MP4 versions collapsed
Quote / ROC hold / mint
Video versions result after mint
Advanced mint details collapsed
Advanced video options collapsed
```

Do not show developer-like status rows unless drawer is opened.

The publish flow should use friendly copy:

```text
1. Get bundle quote
2. Review ROC hold
3. Mint video bundle
```

Not too much route/API language in default view.

---

## Testing plan for next session

Run from project root:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

Then in another terminal if needed:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run build
npm run check:rust:mac-media
```

Manual test:

1. Open `crab://video`.
2. Choose a source video.
3. Build MP4 plan.
4. Mint all selected outputs.
5. Confirm result panel shows 7 outputs.
6. Copy all returned URLs.
7. Open clean master `.video`.
8. Confirm manifest page shows all versions.
9. Open desktop 1080p `.video`.
10. Confirm manifest page shows all versions and highlights desktop.
11. Open mobile 480p `.video`.
12. Confirm manifest page shows all versions and highlights mobile.
13. Open low 360p `.video`.
14. Confirm manifest page shows all versions and highlights low.
15. Open poster `.image`.
16. Confirm it either shows video bundle relationship or at least linked asset context.
17. Open thumbnail `.image`.
18. Confirm same.
19. Restart app if testing durable behavior.
20. Open a saved video URL again.
21. Confirm whether sibling list persists.
22. If it does not persist, label current behavior as local display cache and plan backend/index fix.

Important expected result:

```text
Every sibling link must be backend-returned crab URL/CID.
No fake CID.
No fake manifest CID.
No fake receipt.
No local cache unlock.
No silent spend.
No mutation of immutable b3 content.
```

---

## Likely implementation path next session

Recommended first patch should probably be diagnostic/normalization, not a huge rewrite.

Suggested next-session patch sequence:

### Patch 1 — Inspect and expose hydrated video raw response

Add or use existing developer JSON on asset page to inspect:

```text
summary.raw
summary.renditionGroup
summary.rendition
hydrated response fields
metadata fields
manifest fields
local catalog lookup result
```

Goal:

Find whether group data is absent or only misparsed.

### Patch 2 — Fix parser paths

If group exists but parser misses it, update:

```text
normalizeVideoRenditionGroup
normalizeVideoRenditionItem
summarizeAsset
VideoAssetManifestFacts
VideoRenditionGroupCard
```

Add aliases for all observed backend field names.

### Patch 3 — Add local bundle fallback if backend group is absent

If backend does not return group, add local display fallback.

Likely touch:

```text
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/shared/catalog/localCatalog.js
apps/crablink-tauri/src/pages/asset/AssetHydratedView.jsx
```

Requirements:

* write completed bundle after mint
* map every CID to same bundle
* asset page checks local bundle by current CID
* render as display-only local relationship
* never call it backend truth

### Patch 4 — Backend/index durable fix if needed

If image uses backend/index and video does not, mirror image backend behavior for video.

This may require RustyOnions changes and should be handled carefully.

Potential backend path:

```text
upload route accepts rendition group metadata
gateway stores group relationship into index/metadata
omnigate/hydration returns rendition group for every asset in group
```

Do this only after confirming the image path.

---

## Important architecture invariants to preserve

* CrabLink Tauri is the client, not backend truth.
* React owns display and user intent only.
* Tauri Rust owns native privilege and local media prep.
* Wallet mutation only through backend wallet path.
* No direct ledger mutation from UI.
* No fake ROC balance.
* No fake receipt.
* No silent spend.
* No fake b3 CID.
* No fake manifest CID.
* No cache-only paid unlock.
* No private source file path in React state or logs.
* No full large-video byte transport through React commands for future large media.
* Current video-lite can remain bounded, but large video needs range/segment/staged path.
* b3 hashes are immutable content truth.
* If manifest bytes change, it creates a new b3 object.
* Do not pretend existing immutable manifests mutate in place.
* Sibling maps are relationship metadata, not replacement for canonical asset truth.

---

## Current status estimate for video page

Video minting mechanics:

```text
~70% complete
```

Post-mint result display:

```text
~80% complete
```

Video asset/manifest page:

```text
~40–50% complete
```

Durable video bundle cross-linking:

```text
~25–35% complete
```

Overall video page/product readiness:

```text
~60–65% complete
```

The core mint pipeline works. The next biggest unlock is making the opened video asset pages show the full bundle just like image pages.

---

## Success definition for next session

The next session is successful if we can say:

```text
I minted a video bundle.
The mint result page showed all outputs.
I opened clean master and saw all versions.
I opened desktop and saw all versions.
I opened mobile and saw all versions.
I opened low 360p and saw all versions.
The current version was highlighted.
All sibling URLs/CIDs came from backend response or clearly labeled local display cache.
No fake manifest truth was claimed.
```

Stretch goal:

```text
After restarting CrabLink, opening any minted video URL still shows all siblings from durable backend/index/manifest truth.
```

That stretch goal may require backend work if the current gateway does not persist video rendition group metadata.

The most important next-session starting point is: **inspect how the image page actually persists and hydrates rendition groups, then mirror that mechanism for video instead of inventing a separate contract.**


### END NOTE - MAY 31 2026 - 13:10 CST


### BEGIN NOTE - MAY 31 2026 - 15:40 CST

Below is a comprehensive carryover note set for the next instance.

# Carryover Notes — New `make` Page / CrabLink Creator Studio

## 0. Session checkpoint

We are pivoting from polishing individual media pages into a broader creator tool concept: a new **`crab://make`** page.

The idea is to create a **local video creation studio** that reuses the best existing work from:

* `crab://stream`: camera preview, person cutout / green-screen-style background replacement, framing, saved scene/look controls.
* `crab://podcast`: mic/file recording, voice/audio controls, meters, preamp/gain/gate/leveler-style studio controls.
* `crab://video`: Rust/FFmpeg staging, MP4 version generation, poster/thumbnail generation, paid mint flow, video rendition group manifests.

The goal is **not** to turn stream/podcast/video pages into one bloated page. The new page should be a separate creator workspace:

```text
crab://make
```

Its job is to help a creator **record, assemble, preview, export, and then mint** a finished video asset.

The final minted output should still use normal video asset truth:

```text
crab://<b3hash>.video
```

The `make` page is a **tool/workspace route**, not a new asset kind by default.

The attached codebundle confirms the app already has dedicated Stream, Podcast, and Video page areas, including the relevant files under `apps/crablink-tauri/src/pages/stream`, `apps/crablink-tauri/src/pages/podcast`, and `apps/crablink-tauri/src/pages/video`. 

---

## 1. Important current context before starting

### 1.1 Stream page has reusable creator-studio technology

The stream page already moved beyond a backend test panel and now has a local creator studio feel. Existing stream work includes:

```text
StreamLocalPreview.jsx
streamCompositor.js
StreamLookPanel.jsx
streamPersonSegmentation.js
streamStudioModel.js
StreamGoLivePanel.jsx
StreamPage.jsx
stream.css
```

The working product result is that the creator can start a camera preview, remove the real background, place themselves over a selected background, frame themselves, adjust the camera look, save the scene, and use a cleaner Go Live flow. 

For `make`, this is the core visual engine to reuse or adapt.

Do **not** casually rewrite the stream files. Use them as reference, and only extract/shared-copy logic when it helps.

### 1.2 Stream features still parked should now inform Make

The old notes explicitly parked several stream features, including:

```text
screen + webcam thumbnail compositor
recording/replay pipeline
audio mixing
camera device picker polish
background publishing as b3 assets
```

Those parked items map directly to the proposed `make` page. The key difference is that `make` is not live streaming. It is local creation and export.

This matters because `make` can be simpler and safer than production livestreaming:

```text
capture locally
compose locally
record clips locally
export/stage locally
then mint via existing video asset path
```

No need to solve full production livestreaming to build `make`.

### 1.3 Podcast page has reusable audio-studio technology

The podcast notes describe a studio layout with a large console, waveform/meter area, record/stop/play controls, local playback preview, and a right rail with launch checklist and mixer/voice chain summary. 

The podcast audio controls already track important processing values:

```text
preamp dB
input gain
noise gate enabled
noise gate threshold
gate reduction
voice leveler enabled
monitor enabled
```

The notes also say next work should verify that those controls are not just cosmetic and that the mixer should expose clear meter/status readouts such as input, processed level, gate open/closed, peak, clipping, and recorder codec. 

For `make`, reuse this concept as a **Video Audio Chain**:

```text
mic input
screen audio if available
preamp
gain
gate
leveler/compressor
monitor volume
input/output meters
mute toggles
```

### 1.4 Video page has the export/mint path to reuse

The current video route is intentionally a simple video mint workspace. Its route owner says the flow is:

```text
choose one source video
prepare MP4 versions
confirm ROC hold
mint selected video bundle as backend-returned assets
```

The video page also keeps key invariants: local draft only, no fake b3 CID, no fake manifest CID, no ROC mutation from React, and backend CIDs only. 

`make` should not invent a second video mint path. It should eventually feed an exported local video into the existing video staging/mint machinery.

---

## 2. New page concept

### Proposed route

```text
crab://make
```

### Proposed product name

Use one of these internally:

```text
Make
CrabLink Make
Make Studio
Creator Studio
Video Maker
```

Visible page copy can be simple:

```text
Make videos
Record clips, compose scenes, capture your screen, mix audio, export MP4, and mint as crab:// video assets.
```

### Core product promise

```text
A local TikTok/OBS/CapCut-lite style creator studio inside CrabLink Tauri.
```

But be careful with claims. Do not say it is production OBS, production TikTok, DRM, anti-rip, full live broadcast, or full editor. First version should be honest:

```text
local creator studio
camera/screen capture proof
clip-based recording
basic compositor
basic audio chain
bounded export
video mint integration
```

---

## 3. What Make should do

### 3.1 TikTok-style segmented recording

The user specifically wants this behavior:

```text
hit record
stop
hit record again for next part
stop
repeat
then export all clips as one video
```

This should become the central recording model.

Core UX:

```text
Record button
Pause/stop segment button
Retake last clip
Clear all clips
Clip strip / timeline
Clip count
Total duration
Selected clip preview
Export stitched video
```

First pass can avoid deep editing. Do not build a full timeline editor yet.

Initial clip operations:

```text
append clip
delete clip
retake last clip
reorder clips later
trim clips later
split clips later
add captions later
```

### 3.2 Camera studio mode

Reuse stream concepts:

```text
camera preview
person cutout
background replacement
mirror toggle
subject X/Y position
subject zoom
brightness
contrast
saturation
scene presets
```

The `make` page should not mutate stream session truth. These are local display/composition controls.

### 3.3 Screen recording mode

Add a source mode:

```text
camera
screen
camera + screen PiP
file/import
```

For screen recording:

```text
choose screen/window/tab if WebView supports getDisplayMedia
show clear screen-recording active indicator
allow system audio only if available/allowed
never start screen capture automatically
always require explicit user click
```

The first pass should test whether Tauri WebView on the user’s Intel Mac supports:

```javascript
navigator.mediaDevices.getDisplayMedia
```

If it works, use browser-side capture for the first proof. If it does not work reliably in Tauri, park native screen capture for a Rust-side/Tauri command phase.

### 3.4 Screen recording with optional PiP webcam

User wants screen recording with optional PiP video of themselves.

PiP controls:

```text
enable webcam PiP
disable webcam PiP
PiP position: top-left, top-right, bottom-left, bottom-right, custom
PiP size: small, medium, large
PiP shape: rectangle / rounded / circle later
mirror webcam
use person cutout in PiP optionally
background replacement in PiP optionally
```

First pass should prioritize:

```text
screen source + webcam overlay rectangle
move/resize PiP
record combined canvas
```

### 3.5 Audio controls

Reuse podcast studio ideas:

```text
mic source
screen audio if available
mic mute
screen audio mute
preamp
gain
noise gate
gate reduction
voice leveler
monitor volume
input meter
processed meter
clipping warning
```

Important: audio settings are local creator controls. They do not create wallet/backend truth.

### 3.6 Export path

The clean long-term flow should be:

```text
Make local clips
→ render/compose clips locally
→ export a clean master MP4
→ send exported master into existing video staging/conversion pipeline
→ generate device versions + poster + thumbnail
→ prepare quote
→ explicit ROC hold
→ mint video bundle
→ backend returns crab://<hash>.video links
```

The first version does not need a perfect editor. It needs a reliable path from local recording to an MP4 file or staged handle.

---

## 4. Proposed architecture

## 4.1 Keep Make as a client-side creator workspace

Make should not be a backend service at first.

Do **not** add new RustyOnions services or ledger paths.

Do **not** create fake asset truth.

Do **not** create fake receipts.

Do **not** directly mutate wallet or ledger.

Make should be:

```text
React UI + browser media APIs + local preview state
Tauri/Rust helper only where native media/staging/export requires it
existing video mint flow for final upload
```

## 4.2 Proposed file structure

Create a new page folder:

```text
apps/crablink-tauri/src/pages/make/
```

Proposed files:

```text
apps/crablink-tauri/src/pages/make/MakePage.jsx
apps/crablink-tauri/src/pages/make/MakeStudio.jsx
apps/crablink-tauri/src/pages/make/MakeRecorder.jsx
apps/crablink-tauri/src/pages/make/MakeScreenCapture.jsx
apps/crablink-tauri/src/pages/make/MakeCameraStage.jsx
apps/crablink-tauri/src/pages/make/MakeTimeline.jsx
apps/crablink-tauri/src/pages/make/MakeAudioMixer.jsx
apps/crablink-tauri/src/pages/make/MakeSceneControls.jsx
apps/crablink-tauri/src/pages/make/MakeExportFlow.jsx
apps/crablink-tauri/src/pages/make/makeDraftModel.js
apps/crablink-tauri/src/pages/make/makeStudioModel.js
apps/crablink-tauri/src/pages/make/makeCompositor.js
apps/crablink-tauri/src/pages/make/make.css
```

Start local. Do not prematurely move everything into shared packages.

After the first proof works, consider extracting shared compositor/audio code:

```text
apps/crablink-tauri/src/shared/media/compositor.js
apps/crablink-tauri/src/shared/media/personSegmentation.js
apps/crablink-tauri/src/shared/media/audioChain.js
```

But only extract after confirming Make works.

## 4.3 Route registration

Next instance should inspect:

```text
apps/crablink-tauri/src/app/routeRegistry.js
apps/crablink-tauri/src/app/router.js
apps/crablink-tauri/src/app/shell/BrowserNav.jsx
apps/crablink-tauri/src/pages/home/HomeQuickActions.jsx
```

Then add a visible route:

```text
crab://make
```

Possibly add sidebar/nav label:

```text
Make
```

Do not remove existing stream/podcast/video routes.

---

## 5. Proposed Make data model

### 5.1 `MakeProject`

Local-only draft:

```javascript
{
  schema: 'crablink.make-project.v1',
  title: '',
  description: '',
  mode: 'video',
  createdAt: '',
  updatedAt: '',
  clips: [],
  scene: {},
  audioChain: {},
  exportPlan: {},
  rights: {},
}
```

### 5.2 `MakeClip`

Each record/stop creates one clip:

```javascript
{
  id: 'clip_<nonce>',
  sourceMode: 'camera' | 'screen' | 'screen_pip' | 'import',
  blobUrl: '',
  durationMs: 0,
  width: 1280,
  height: 720,
  fps: 30,
  mimeType: 'video/webm' | 'video/mp4',
  createdAt: '',
  localOnly: true,
}
```

Important: do not persist raw blobs in `localStorage`.

Use in-memory blobs for first pass. Later, use Tauri app data directory or staged temp files explicitly.

### 5.3 `MakeScene`

Reuse stream scene idea:

```javascript
{
  backgroundMode: 'none' | 'solid' | 'image' | 'blur' | 'person_cutout',
  backgroundColor: '#111111',
  backgroundImageUrl: '',
  subjectX: 0,
  subjectY: 0,
  subjectScale: 1,
  mirror: true,
  brightness: 1,
  contrast: 1,
  saturation: 1,
}
```

### 5.4 `MakeAudioChain`

Reuse podcast audio chain:

```javascript
{
  micEnabled: true,
  screenAudioEnabled: false,
  preampDb: 0,
  inputGain: 1,
  noiseGateEnabled: false,
  noiseGateThresholdDb: -45,
  gateReductionDb: -24,
  voiceLevelerEnabled: false,
  monitorEnabled: false,
  monitorVolume: 0.75,
}
```

### 5.5 `MakeExportPlan`

```javascript
{
  target: 'mp4_master',
  width: 1280,
  height: 720,
  fps: 30,
  includePoster: true,
  includeThumbnail: true,
  deviceRenditions: true,
}
```

---

## 6. UI design target

### 6.1 Layout

Use a creator-studio layout:

```text
Make Page
├─ Hero / mode tabs
│  ├─ Camera
│  ├─ Screen
│  ├─ Screen + PiP
│  └─ Import
│
├─ Main studio grid
│  ├─ Left: large preview stage
│  │  ├─ canvas/video preview
│  │  ├─ recording status
│  │  ├─ elapsed time
│  │  └─ active source labels
│  │
│  └─ Right: control rail
│     ├─ Source controls
│     ├─ Scene / green-screen controls
│     ├─ Audio chain controls
│     ├─ PiP controls
│     └─ Export readiness
│
├─ Timeline / clip strip
│  ├─ clip cards
│  ├─ retake last
│  ├─ clear all
│  └─ total duration
│
└─ Export + Mint panel
   ├─ export MP4
   ├─ prepare video versions
   ├─ quote
   ├─ ROC hold
   └─ mint video bundle
```

### 6.2 Visual direction

Make should feel more like the polished stream/podcast studio pages than the older dev panels.

Use:

```text
large preview canvas
rounded studio cards
clear active source badges
big record button
clip timeline strip
right-side mixer/effects panels
collapsed developer details
```

Avoid:

```text
raw JSON visible by default
too many tiny controls above the fold
dev-page look
horizontal cramped mint rows
fake “live” language unless actually streaming
```

### 6.3 Recording UX

States:

```text
No source selected
Source ready
Recording
Paused / segment saved
Export ready
Exporting
Export complete
Ready to mint
```

Buttons:

```text
Start camera
Choose screen
Enable PiP
Record
Stop segment
Retake last clip
Clear clips
Preview stitched result
Export MP4
Mint as video
```

---

## 7. Security and privacy invariants

This page is media-heavy, so privacy rules need to be explicit.

### 7.1 Capture must be explicit

Never auto-start:

```text
camera
microphone
screen capture
system audio
```

All capture must begin from a visible user action.

### 7.2 Screen recording warning

When screen recording starts, show a visible warning:

```text
Screen recording active. Avoid capturing passwords, wallets, private messages, or seed phrases.
```

### 7.3 No secrets in draft state

Do not store:

```text
raw screen frames
raw file paths
private keys
tokens
wallet credentials
receipt authority
uncapped spend authority
```

### 7.4 Local media is not backend truth

Make clips are local-only until uploaded through the video asset flow.

Make must never claim:

```text
owned
minted
paid
published
receipt-backed
backend-stored
```

until backend returns real asset truth.

### 7.5 No fake paid unlock

Make is creation-side only. It should not alter paid viewing.

The final minted video still uses existing paid content-view logic.

### 7.6 No arbitrary execution

Do not add plugin/script/eval behavior. Make is a controlled local compositor, not a code execution environment.

---

## 8. Relationship to existing pages

### 8.1 Stream page

Stream remains for:

```text
live descriptor
stream-lite proof
local stream preview
go-live UX
paid live/session concept
```

Make reuses visual/compositor ideas but is for:

```text
recorded video production
clip assembly
screen recording
exporting MP4
minting video
```

Do not merge them.

### 8.2 Podcast page

Podcast remains for:

```text
audio episode creation
audio upload/recording
podcast rights
podcast paid minting
```

Make reuses audio controls but is for video. It may later create video podcasts, but first pass should stay focused on video creation.

### 8.3 Video page

Video remains for:

```text
upload/convert/mint existing video files
MP4 version generation
poster/thumbnail generation
paid video bundle mint
manifest/rendition display
```

Make should eventually hand an exported file/staged handle into this same path.

---

## 9. Implementation phases for next session

## Phase 0 — Verify current state before starting Make

Before coding Make, next instance should briefly verify:

```text
npm run build
npm run check:rust:mac-media
scripts/run-tauri-dev-full-stack.sh
```

Also verify the recent video-page safety fix:

```text
Open crab://video fresh
Do not select a file
Confirm quote/hold/mint are blocked
Confirm stale previous staged jobs do not enable minting
```

This matters because Make will also create staged media and must not repeat the stale-localStorage bug.

## Phase 1 — Add route shell

Create:

```text
apps/crablink-tauri/src/pages/make/MakePage.jsx
apps/crablink-tauri/src/pages/make/make.css
apps/crablink-tauri/src/pages/make/makeDraftModel.js
```

Register route:

```text
crab://make
```

Initial route should show:

```text
hero
mode tabs
empty studio stage
right rail
timeline placeholder
export placeholder
```

No capture yet.

## Phase 2 — Reuse stream camera preview / person cutout

Add:

```text
MakeCameraStage.jsx
MakeSceneControls.jsx
makeCompositor.js
```

Start with camera mode:

```text
start camera
stop camera
preview camera
mirror
position
zoom
brightness/contrast/saturation
background replacement/person cutout if reusable safely
```

Do not mutate stream state.

## Phase 3 — Add segmented recording

Add:

```text
MakeRecorder.jsx
MakeTimeline.jsx
```

Use browser MediaRecorder for first proof:

```text
record current canvas stream
stop segment
append clip
show clip strip
retake last clip
clear all
preview selected clip
```

First pass can record WebM if that is what WebView supports. Export to MP4 can come after.

## Phase 4 — Add screen recording

Add:

```text
MakeScreenCapture.jsx
```

Test `getDisplayMedia`.

Modes:

```text
screen only
screen + mic
screen + PiP webcam
```

Add visible safety warning.

If Tauri WebView does not support screen capture reliably, create a graceful blocked state:

```text
Screen capture is not available in this WebView yet. Native capture bridge required.
```

Do not fake it.

## Phase 5 — Add PiP compositor

Use canvas composition:

```text
draw screen source full frame
draw webcam source as overlay
optional person cutout on webcam
draw rounded rectangle / border later
```

Controls:

```text
PiP on/off
position
size
mirror
```

## Phase 6 — Add audio chain

Reuse podcast ideas:

```text
mic input
screen audio if present
preamp/gain/gate/leveler controls
meters
mute toggles
monitor toggle
```

First pass can show meter and simple gain/mute. Gate/leveler can be wired after the base audio graph is stable.

## Phase 7 — Export/stage output

Options:

1. Browser-side canvas MediaRecorder creates a single local recording blob.
2. Rust/FFmpeg stitches segments into MP4.
3. Existing video conversion pipeline generates clean master + renditions.

Best path:

```text
record clips locally
stage clips or exported master through Rust media module
use FFmpeg to concatenate/transcode into MP4
feed exported MP4 to existing video version pipeline
```

Do not full-buffer huge video files through command results.

Respect the current large-media doctrine:

```text
bounded staging
staged handles
range/segment/future large media path
no unsafe full-file command buffering
```

## Phase 8 — Mint integration

Once Make exports a fresh MP4 master:

```text
MakeExportFlow
→ VideoConverterPanel-compatible staged source
→ VideoPublishFlow-compatible fresh job
→ quote
→ explicit ROC hold
→ mint bundle
```

Important: use the same fresh-session/stale-job safety pattern from the video page.

Do not allow old Make exports from localStorage to silently mint.

---

## 10. Rust/Tauri implications

First version can be mostly React/browser media.

Rust/Tauri may be needed for:

```text
FFmpeg export/concat/transcode
safe temp staging
large media path
native screen capture fallback
file save/export dialog
media probing
poster/thumbnail extraction
```

Existing Rust media files in the codebundle are relevant:

```text
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
apps/crablink-tauri/src-tauri/src/media/video_probe.rs
apps/crablink-tauri/src-tauri/src/media/video_renditions.rs
apps/crablink-tauri/src-tauri/src/media/video_sources.rs
apps/crablink-tauri/src-tauri/src/media/video_transcode.rs
```

Do not add broad raw commands.

Safe command families should be small and specific, for example:

```text
make_export_status
make_stage_clip
make_export_project
make_clear_export
```

Avoid forbidden patterns:

```text
run
execute
eval
shell
raw_*
```

---

## 11. Naming and product boundaries

Use:

```text
Make project
Make clip
Make scene
Make export
Make studio
```

Avoid implying backend truth:

```text
Make asset
Make ownership
Make receipt
Make minted project
```

until the video upload backend returns actual truth.

Final assets should remain:

```text
.video
.image poster
.image thumbnail
```

A future `.make` project asset could exist later, but not now. That would need a separate manifest design for editable project graphs.

---

## 12. Manual test plan for Make

### Route smoke

```text
crab://make opens
no camera starts automatically
no mic starts automatically
no screen capture starts automatically
no old clips auto-load unless explicitly saved/loaded
developer JSON hidden by default
```

### Camera smoke

```text
start camera
preview appears
mirror works
framing works
look controls work
stop camera releases stream
```

### Green-screen/person cutout smoke

```text
enable cutout
background replacement appears
subject not inverted
subject can move/scale
disable returns to normal camera
```

### Recording smoke

```text
record segment 1
stop
record segment 2
stop
timeline shows 2 clips
retake last removes/replaces segment 2
clear all removes clips
```

### Screen smoke

```text
choose screen/window
visible warning appears
screen preview appears
stop capture releases stream
```

### PiP smoke

```text
screen mode works
enable webcam PiP
webcam overlay appears
position changes work
size changes work
disable PiP removes overlay
```

### Audio smoke

```text
mic meter moves
mute stops mic meter/output
gain visibly changes meter
gate/leveler either works or is clearly disabled/future
monitor toggle does not create feedback disaster
```

### Export smoke

```text
export blocked with no clips
export starts with clips
export status visible
export output playable
export output not stored as fake backend asset
```

### Mint smoke

```text
exported video can enter video prepare pipeline
quote works
ROC hold is explicit
mint only works after fresh export/current-session proof
backend returns real crab:// video links
manifest sibling list works
```

---

## 13. Biggest technical risks

### 13.1 Tauri WebView screen capture support

`getDisplayMedia` may not behave consistently in Tauri WebView on macOS. First task is to test it.

Fallback plan:

```text
ship camera-only Make first
park native screen capture bridge
do not fake screen recording
```

### 13.2 MediaRecorder codec support

The WebView may record:

```text
video/webm
video/mp4
different codecs depending on platform
```

Need runtime codec detection:

```javascript
MediaRecorder.isTypeSupported(...)
```

Do not hard-code MP4 capture from browser unless proven.

### 13.3 Clip stitching

Concatenating browser-recorded blobs is not always safe by just joining bytes.

Better long-term:

```text
record segments
stage each segment
FFmpeg concat/transcode in Rust
produce clean MP4 master
```

### 13.4 Audio/video sync

Mixing:

```text
screen video
webcam video
mic audio
screen audio
effects chain
```

can drift. Keep first pass simple.

### 13.5 Performance on Intel MacBook Pro

Default to bounded settings:

```text
720p
30 fps
short clips
reasonable canvas size
no 4K default
no heavy segmentation by default during screen capture unless user enables it
```

### 13.6 Privacy

Screen recording can capture secrets. UI needs visible warnings and explicit stop controls.

---

## 14. Exact files next instance should inspect first

```text
apps/crablink-tauri/src/app/routeRegistry.js
apps/crablink-tauri/src/app/router.js
apps/crablink-tauri/src/pages/stream/StreamPage.jsx
apps/crablink-tauri/src/pages/stream/StreamLocalPreview.jsx
apps/crablink-tauri/src/pages/stream/streamCompositor.js
apps/crablink-tauri/src/pages/stream/streamPersonSegmentation.js
apps/crablink-tauri/src/pages/stream/StreamLookPanel.jsx
apps/crablink-tauri/src/pages/stream/streamStudioModel.js
apps/crablink-tauri/src/pages/stream/stream.css
apps/crablink-tauri/src/pages/podcast/PodcastPage.jsx
apps/crablink-tauri/src/pages/podcast/PodcastStudio.jsx
apps/crablink-tauri/src/pages/podcast/podcast.css
apps/crablink-tauri/src/pages/video/VideoConverterPanel.jsx
apps/crablink-tauri/src/pages/video/VideoPublishFlow.jsx
apps/crablink-tauri/src/pages/video/VideoDraft.jsx
apps/crablink-tauri/src/pages/video/video.css
apps/crablink-tauri/src/shared/api/videoConverterClient.js
apps/crablink-tauri/src-tauri/src/media/video_jobs.rs
apps/crablink-tauri/src-tauri/src/media/video_transcode.rs
apps/crablink-tauri/src-tauri/src/media/video_renditions.rs
```

---

## 15. Suggested next-session first patch

The first patch should **not** attempt everything.

Best first batch:

```text
1. Add crab://make route.
2. Add MakePage.jsx and make.css.
3. Create polished empty creator-studio shell.
4. Add mode tabs: Camera, Screen, Screen + PiP, Import.
5. Add empty stage, right rail, and timeline placeholder.
6. Add route card to nav/home if appropriate.
7. No camera/screen capture yet.
```

Second batch:

```text
Camera preview + stream look controls reuse.
```

Third batch:

```text
Segmented recording and timeline.
```

Fourth batch:

```text
Screen capture + PiP.
```

Fifth batch:

```text
Export to video staging.
```

Sixth batch:

```text
Mint integration using existing video flow.
```

---

## 16. Non-negotiable invariants for Make

```text
No fake ROC.
No fake receipts.
No fake balances.
No silent spend.
No fake CIDs.
No fake manifests.
No auto camera/mic/screen start.
No localStorage raw media.
No old/stale staged job minting.
No cache-based paid unlock.
No direct ledger mutation.
No direct wallet mutation from React.
No backend truth invented by Make.
No raw file paths in manifests.
No arbitrary code execution.
No DRM/anti-rip claims.
No production livestreaming claims.
```

---

## 17. Summary for the next instance

Build `crab://make` as a new local creator studio page.

Reuse stream’s compositor/person-cutout/background/framing/look ideas, podcast’s audio mixer/recording controls, and video’s Rust/FFmpeg export + paid mint pipeline. Start with a clean route shell, then camera mode, then segmented recording, then screen + PiP, then export, then mint.

The first milestone is not “full CapCut.” The first milestone is:

```text
open crab://make
start camera
compose preview
record multiple clips
see clips in timeline
export a bounded local video proof
```

Then wire that exported video into the existing video bundle mint path.


### END NOTE - MAY 31 2026 - 15:40 CST


### BEGIN NOTE - MAY 31 2026 - 21:35 CST

Here are the carryover notes for the next instance.

# CrabLink Tauri Carryover Notes — Make Studio / `crab://make`

## 0. Session checkpoint

We continued work on the CrabLink Tauri app after the video-page work and pivoted into building a new flagship creator page:

```text
crab://make
```

The user’s intent is clear:

```text
Make Studio should become the centerpiece creator experience in CrabLink.
```

It should combine the best local creator tools from:

```text
stream page:
  camera/screen preview
  green-screen/background concepts
  composited canvas
  creator studio flow

podcast page:
  audio controls
  microphone settings
  local audio studio feel

video page:
  final video publish/mint path
  Rust/FFmpeg conversion and staged rendition flow
  backend paid prepare/confirm/upload/mint flow
```

The Make page is not meant to replace video/stream/podcast. It is meant to become the creative command center where users create local media, then hand off finished media into the specialized publishing pages.

Current desired mental model:

```text
Make = create/edit/record local media
Video = convert/transcode/stage/mint/publish video assets
Stream = live stream / stream-lite / future backend streaming
Podcast = podcast/audio publishing/studio
```

## 1. User preference reminders

The user explicitly prefers:

```text
- No downloadable patch files.
- Provide full paste-ready files directly in chat.
- Exact paths.
- Full replacement files when practical.
- Keep Tauri as primary.
- Keep Chrome green only as proof/companion.
- Avoid fake backend truth.
- Avoid fake balances.
- Avoid fake receipts.
- Avoid silent spend.
- Avoid external settlement / QuickChain creep.
- Avoid raw localhost assumptions for normal users, but local dev uses full stack script.
```

Current normal run path remembered from prior work:

```bash
cd /Users/mymac/Desktop/crablink
scripts/run-tauri-dev-full-stack.sh
```

For Tauri media/dev profile, the project also has:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run tauri:dev:mac-media
```

But the newer full-stack path is the default unless debugging requires split terminals.

## 2. Important boundary/invariant recap

Make Studio is currently a local creator workspace. It must not become a backend authority.

Must preserve:

```text
- Make creates local clips and session-plan metadata only.
- Make does not create b3 CIDs.
- Make does not create crab:// asset truth.
- Make does not mint video assets.
- Make does not create or fake manifests.
- Make does not create or fake receipts.
- Make does not create wallet truth.
- Make does not mutate ledger truth.
- Make does not unlock paid content from local cache.
- Make does not store private keys, raw capabilities, tokens, or spend authority.
- Make does not execute creator-supplied code.
```

Correct flow remains:

```text
Make local recording/composition
→ user downloads/exports local clip
→ crab://video
→ Rust/FFmpeg prepare/transcode/staging
→ explicit backend paid prepare/confirm/upload/mint
→ backend-derived receipt
→ backend-derived manifest
→ backend-derived crab://<b3>.video
```

Make can store local draft metadata in localStorage/sessionStorage, but it must remain convenience state only.

## 3. What was accomplished this session

### 3.1 Added Make route

We added Make as a first-class route:

```text
apps/crablink-tauri/src/app/routeRegistry.js
```

The route registry now lazy-loads:

```javascript
make: lazy(() => import('../pages/make/MakePage.jsx'))
```

The route was added to creator route lists so `crab://make` resolves as a built-in creator page.

Labeling was added:

```text
make → Make Studio
```

### 3.2 Created Make folder

New folder:

```text
apps/crablink-tauri/src/pages/make/
```

New files:

```text
apps/crablink-tauri/src/pages/make/MakePage.jsx
apps/crablink-tauri/src/pages/make/make.css
apps/crablink-tauri/src/pages/make/makeDraftModel.js
```

### 3.3 Built local draft/session model

Created:

```text
apps/crablink-tauri/src/pages/make/makeDraftModel.js
```

Major responsibilities:

```text
- Local draft defaults.
- Local draft normalization.
- Local draft persistence key.
- Local session-plan persistence key.
- Make mode definitions.
- Scene preset definitions.
- Output preset definitions.
- Tag normalization.
- ROC display-hint normalization.
- Session-plan generation.
- Readiness derivation.
- MediaRecorder MIME type selection.
- Format helpers for bytes and duration.
```

Important constants:

```javascript
MAKE_DRAFT_STORAGE_KEY = 'crablink.make.draft.v1'
MAKE_SESSION_PLAN_STORAGE_KEY = 'crablink.make.latestSessionPlan.v1'
```

Current Make modes:

```text
camera
screen
screen_pip
camera_background
audio_only
```

Current scenes:

```text
midnight
ocean
ember
paper
```

Current output presets:

```text
social_720p       1280×720
desktop_1080p     1920×1080
vertical_720x1280 720×1280
```

Current draft fields include:

```text
title
description
tagsText
creatorNotes
accessPriceRoc
selectedMode
selectedScene
outputPreset
targetFps
includeMic
echoCancellation
noiseSuppression
autoGainControl
pipCorner
pipSize
```

The session plan is intentionally explicit that it is not backend truth:

```text
not CID
not receipt
not wallet balance
not paid entitlement
not ownership proof
not published video manifest
```

### 3.4 Built first Make UI

Initial Make UI included:

```text
- large preview canvas
- source mode segmented control
- start preview / stop preview
- record clip / stop clip
- local clip cards
- draft form
- local session plan
- right-side readiness/status rail
- truth boundary panel
- video handoff panel
```

This proved:

```text
crab://make loads
canvas preview renders
audio-card visual mode works
draft fields persist locally
right rail shows readiness
session plan can be copied
video handoff button exists
```

### 3.5 User noticed brand-risk wording and asked for repo script

The first Make copy included:

```text
TikTok-style
```

The user did not want lawsuit/brand issues and asked for a script to replace this wording.

We created a script:

```text
scripts/replace-tiktok-copy.sh
```

Purpose:

```text
replace TikTok / tiktok / TikTok-style / tik tok / Tik Tok-style with "popular style"
```

The user ran it and reported it worked.

Important next-instance note:

```text
Do not reintroduce "TikTok", "tik tok", or similar brand wording in code, docs, copy, comments, or UI.
```

Preferred wording:

```text
popular style
short-form style
social clip style
segmented clip flow
creator-style recording
```

Avoid:

```text
TikTok-style
tik tok style
TikTok-like
```

### 3.6 Built second Make polish batch

After screenshots, we improved the Make page substantially.

Main UI improvements:

```text
- Added command center at the top.
- Made preview the hero element.
- Replaced pill mode selector with richer mode cards.
- Added stronger flagship studio styling.
- Collapsed advanced project fields behind a disclosure.
- Added a timeline/review section directly under preview.
- Added selected clip review panel.
- Added retake last / clear timeline actions.
- Added compact right rail.
- Added better readiness summary.
- Added sticky side rail.
- Reduced form-heavy first impression.
- Preserved local-only truth boundary.
```

The user responded:

```text
this is very very cool
```

This is a strong signal that the Make direction is correct.

## 4. Current Make page UX state

The page now feels much closer to a flagship studio.

Current high-level layout:

```text
CreatorWorkspaceLayout
  Hero/header:
    crab://make
    Make Studio
    local studio / record clips / video handoff badges
    principles cards

  Main content:
    MakeCommandDeck
    Preview card
    Mode card deck
    Timeline card
    Project card
    Handoff card

  Side rail:
    Ready check
    Device inventory
    Recorder details
    Truth boundary
    Optional JSON session plan
```

### 4.1 Command center

The `MakeCommandDeck` currently shows:

```text
- creator command center label
- project title
- current mode/status copy
- mode stat
- canvas stat
- clips stat
- total duration stat
- start preview / stop preview
- record clip / stop clip
- video handoff
- now recording active clip label
```

This is good and should remain central.

### 4.2 Preview

The preview uses a canvas and draws:

```text
- scene backgrounds
- camera full-frame mode
- screen full-frame mode
- screen + PiP camera
- camera + scene background
- audio-only visualizer card
- idle overlay
- footer HUD
- preview topbar
- recording badge
```

The canvas is recorded using:

```javascript
canvas.captureStream(fps)
```

Recorder path:

```text
canvas stream
+ optional microphone track
→ MediaRecorder
→ local Blob
→ object URL
→ local clip list
```

### 4.3 Timeline

Timeline currently supports:

```text
- empty state
- total segments
- total duration
- total local storage size
- horizontal clip strip
- selected clip preview
- download clip
- remove clip
- retake last clip
- clear timeline
```

Not yet implemented:

```text
- reorder clips
- trim clips
- join clips
- export all clips as one final video
- native Rust concat/transcode
- waveform
- frame thumbnails
```

### 4.4 Project form

The page currently keeps only title and access price visible by default.

Advanced project details are collapsed:

```text
description
tags
canvas preset
scene
FPS
microphone toggles
PiP corner
PiP size
creator notes
```

This was a good improvement because the screenshots showed the earlier page had too much visible form density.

### 4.5 Handoff

Handoff card currently explains:

```text
1. Download/export the clip you want to publish.
2. Open crab://video.
3. Run Rust/FFmpeg prepare and rendition staging.
4. Confirm the paid backend wallet flow.
5. Display backend-derived receipts and manifests.
```

This is correct for now because Make does not yet have a safe integrated “export to video pipeline” command.

## 5. Current known issues / likely bugs to verify

### 5.1 MediaRecorder / WebView support

Need verify on the user’s Intel Mac / Tauri WebView:

```text
- camera mode starts preview
- screen mode opens picker
- screen + PiP opens both correctly
- audio-card mode can record with mic
- stop recording creates a playable local clip
- downloaded clip plays in QuickTime/VLC/browser
```

Potential issue:

```text
WebKit/Tauri may record WebM, which may not be ideal for Apple playback.
```

Current MIME selection tries:

```text
video/webm;codecs=vp9,opus
video/webm;codecs=vp8,opus
video/webm;codecs=h264,opus
video/webm
video/mp4;codecs=avc1.42E01E,mp4a.40.2
video/mp4
```

But actual support depends on WebView.

### 5.2 `captureStream` support

Need verify:

```text
canvas.captureStream()
```

exists in this Tauri WebView. The second patch added a guard, but runtime confirmation is still needed.

### 5.3 Mode switching while preview is active

Current behavior disables mode cards when input is ready. This avoids state confusion, but UX may feel rigid.

Future better behavior:

```text
Changing mode while preview active should prompt:
"Restart preview to switch modes?"
```

Then safely stop tracks and restart with new mode.

### 5.4 Device count may show zero before permission

Device enumeration often returns empty labels/counts before permissions are granted. This is expected browser behavior.

Need decide UX:

```text
- Show "grant permission to detect devices"
- Refresh after preview starts
- Explain zero count is not fatal
```

### 5.5 Local object URL persistence

Clips are object URLs and disappear when app closes/reloads. This is correct but could surprise users.

Need improve UX:

```text
- stronger "Download before closing" warning
- beforeunload/navigation warning if clips exist
- local clip save/export path later through Tauri Rust
```

### 5.6 No final composition/export yet

Current Make records individual clips. It does not concatenate multiple segments into one final file.

This is fine for the first proof but will become a priority.

Need future path:

```text
short term:
  download each clip manually

next:
  export selected clip

then:
  join clips locally with Rust/FFmpeg command

eventual:
  full Make → Video staged file handoff
```

### 5.7 No drag/reorder yet

Timeline is display/select only. Need future reorder.

Possible near-term simple UX:

```text
move left / move right buttons
```

Avoid introducing heavy drag library unless needed.

### 5.8 No clip trimming yet

No trim in/out. Important for professional UX.

Possible staged plan:

```text
Batch 1: clip metadata and selected clip preview
Batch 2: simple trim fields in seconds
Batch 3: visual trim handles
Batch 4: Rust/FFmpeg trim during export
```

### 5.9 No green screen/person segmentation in Make yet

Make does not yet import or reuse stream green-screen code.

Current stream page has:

```text
streamCompositor.js
streamPersonSegmentation.js
StreamLookPanel.jsx
StreamLocalPreview.jsx
StreamPodcastMode.jsx
```

Need extract reusable compositor/effects logic later so Make/Stream/Podcast share a single local media foundation.

### 5.10 No screen + PiP position resize UI beyond basic controls

Current controls:

```text
pipCorner
pipSize range
```

Future better UX:

```text
- drag PiP inside preview
- resize handles
- safe snap corners
- scene-specific default PiP positions
```

### 5.11 No keyboard shortcuts

Potential future shortcuts:

```text
Space: record/stop
P: start/stop preview
R: retake last
V: video handoff
1-5: switch mode when preview inactive
```

Need avoid conflicts with typing in fields.

### 5.12 Header/sidebar scroll feel

Screenshots showed page uses a lot of vertical height. Second polish batch reduced it, but next instance should verify:

```text
- preview is visible without excessive scrolling
- side rail does not trap scroll awkwardly
- command center and preview feel visually balanced
- on 40% zoom it still looks coherent
- on 100% zoom it is usable
```

## 6. Exact files touched in Make work

Primary files:

```text
apps/crablink-tauri/src/app/routeRegistry.js
apps/crablink-tauri/src/pages/make/makeDraftModel.js
apps/crablink-tauri/src/pages/make/MakePage.jsx
apps/crablink-tauri/src/pages/make/make.css
```

Support script added:

```text
scripts/replace-tiktok-copy.sh
```

No Rust files were changed for Make.

No Cargo dependencies were changed.

No Tauri capabilities were changed.

No backend routes were changed.

## 7. Current route/source structure to preserve

The latest codebundle shows Make is now part of the Tauri app source tree:

```text
apps/crablink-tauri/src/pages/make/make.css
apps/crablink-tauri/src/pages/make/makeDraftModel.js
apps/crablink-tauri/src/pages/make/MakePage.jsx
```

Route registry includes Make in the same route family as other creator pages.

Do not move Make into stream/video/podcast. Keep it route-owned.

Better future structure may eventually be:

```text
apps/crablink-tauri/src/pages/make/
  MakePage.jsx
  make.css
  makeDraftModel.js
  makeCanvasRenderer.js
  makeRecorder.js
  makeTimelineModel.js
  MakeCommandDeck.jsx
  MakeModeDeck.jsx
  MakePreviewStage.jsx
  MakeTimeline.jsx
  MakeProjectPanel.jsx
  MakeScenePresetPanel.jsx

apps/crablink-tauri/src/shared/media/
  localCapture.js
  localRecorder.js
  canvasCompositor.js
  clipTimeline.js
```

But do not prematurely over-split unless the file gets painful to patch.

## 8. Recommended next batch: Make polish batch 3

The next best batch should probably focus on actual creator UX rather than backend work.

Suggested scope:

```text
- Add scene preset cards.
- Add recording countdown.
- Add post-record "keep / retake / record next" flow.
- Add stronger unsaved clips warning.
- Add better empty states and creator copy.
- Add a top-level "Finish" experience that clarifies handoff.
```

### 8.1 Scene preset cards

Add visual cards for:

```text
Studio Demo
Screen Tutorial
Podcast Clip
Music Visualizer
Course Lesson
Vertical Short
```

Each scene preset should set multiple draft fields:

```text
selectedMode
selectedScene
outputPreset
targetFps
pipCorner
pipSize
includeMic
```

Example presets:

```text
Studio Demo:
  mode: camera
  scene: midnight
  canvas: social_720p
  mic: true

Screen Tutorial:
  mode: screen_pip
  scene: ocean
  canvas: desktop_1080p
  mic: true
  pipCorner: bottom-right
  pipSize: 24

Podcast Clip:
  mode: audio_only
  scene: ember
  canvas: social_720p
  mic: true

Course Lesson:
  mode: screen_pip
  scene: paper
  canvas: desktop_1080p
  mic: true
  pipCorner: top-right
  pipSize: 22

Vertical Short:
  mode: camera
  scene: midnight
  canvas: vertical_720x1280
  mic: true
```

This will make Make feel more like a product and less like raw settings.

### 8.2 Recording countdown

Before recording starts:

```text
3
2
1
Recording
```

Implementation idea:

```text
const [countdown, setCountdown] = useState(0)
```

Add a wrapper:

```text
beginRecordingCountdown()
```

Then call existing `startRecording()` after countdown.

Important:

```text
- Cancel countdown if user changes preview/stops input.
- Do not start if preview no longer ready.
- Show countdown overlay in preview.
```

### 8.3 Keep / retake / next clip flow

After a clip records, show a focused panel:

```text
Clip saved
[Play]
[Keep + record next]
[Retake]
[Download]
[Finish]
```

Current behavior automatically saves every clip. That is okay, but the UX can be more professional by making the latest clip feel like a decision.

Implementation options:

```text
simple:
  add "Latest clip" panel above timeline

or:
  selected clip defaults to newest and shows prominent action buttons
```

Avoid deleting automatically unless user explicitly hits retake.

### 8.4 Unsaved clip warning

Add local warning if user has clips and tries to navigate away or close.

Browser/Tauri path:

```javascript
window.addEventListener('beforeunload', ...)
```

App navigation path may need local warning in buttons first:

```text
"You have local clips. Download them before leaving."
```

Do not block internal navigation too aggressively yet.

### 8.5 Finish/export panel

Current "video handoff" is good but could feel more like a final step.

Add a stronger panel:

```text
Finish
- Download selected clip
- Copy session plan
- Open video page
```

Potential copy:

```text
Make does not publish by itself yet. For now, download your clip and open Video to convert, stage versions, confirm ROC access, and mint.
```

Later this can become a real command:

```text
Send selected local clip to video staging
```

But do not fake that yet.

## 9. Recommended next batch: Make architecture batch 4

After UX polish, split reusable logic.

Current `MakePage.jsx` is large because it contains:

```text
React state
input management
recording management
canvas drawing
timeline UI
project UI
side panel UI
handoff UI
canvas helper functions
media helper functions
```

This was okay for rapid build, but it should be modularized soon.

Recommended extraction:

```text
apps/crablink-tauri/src/pages/make/makeCanvasRenderer.js
  drawPreviewFrame
  drawSceneBackground
  drawAudioCard
  drawIdleOverlay
  drawFooterHud
  drawGlassLabel
  drawCoverVideo
  drawContainVideo
  roundRect
  pipRect
  isVideoReady

apps/crablink-tauri/src/pages/make/makeRecorder.js
  selectRecorderMimeType? maybe move from model later
  buildClipName
  downloadClip
  revokeClipUrls
  stopRecorderStream
  audioTracksFrom

apps/crablink-tauri/src/pages/make/makeCapture.js
  attachStream
  stopAllStreams
  buildCameraConstraints
  buildMicConstraints
```

Then optional component extraction:

```text
MakeCommandDeck.jsx
MakeModeDeck.jsx
MakeTimelineCard.jsx
MakeProjectCard.jsx
MakeHandoffCard.jsx
MakeSidePanel.jsx
```

Do this only after one more UX batch, because the layout is still evolving.

## 10. Future larger feature roadmap for Make

### 10.1 Clip joining/export

Goal:

```text
multiple recorded segments → one final export file
```

Possible safe path:

```text
Phase 1:
  user downloads clips individually

Phase 2:
  user selects one clip and opens video page

Phase 3:
  Tauri Rust command concatenates same-codec clips using FFmpeg concat demuxer

Phase 4:
  Make exports a staged local file into video prepare flow

Phase 5:
  video page receives file/staged path without reselecting manually
```

Important safety:

```text
- Do not pass full large media bytes through command results.
- Use paths/handles/staging IDs.
- Respect media bounds.
- No unsafe full-file command buffering.
```

### 10.2 Clip trim

Short-term UI:

```text
trimStartSeconds
trimEndSeconds
```

Longer-term UI:

```text
visual handles on clip strip
```

Rust export path:

```text
ffmpeg -ss trimStart -to trimEnd -i input ...
```

Need avoid destructive edits. Keep source clips intact.

### 10.3 Clip reorder

Short-term:

```text
Move left
Move right
```

Long-term:

```text
drag reorder
```

Do not add a heavy dependency until needed.

### 10.4 Green screen / background removal

Reuse from stream:

```text
streamPersonSegmentation.js
streamCompositor.js
StreamLookPanel.jsx
```

Need probably extract shared:

```text
shared/media/personSegmentation.js
shared/media/compositor.js
```

Make modes could eventually include:

```text
camera_green_screen
screen_green_pip
```

Important:

```text
No claims of perfect segmentation.
No arbitrary creator-supplied shader/code execution.
```

### 10.5 Screen recording with PiP

Basic proof exists conceptually through `screen_pip`, but needs real runtime verification.

Need improve:

```text
- handle screen picker cancellation
- handle camera denial separately from screen denial
- allow PiP off/on while screen preview remains live
- allow dragging/resizing PiP
```

### 10.6 Audio controls

Current Make has:

```text
includeMic
echoCancellation
noiseSuppression
autoGainControl
```

Future from podcast page:

```text
gain slider
monitor toggle
noise gate
simple EQ preset
compressor preset
voice/music mode
```

Need be careful:

```text
Browser Web Audio can be used locally.
No backend truth involved.
No private audio saved unless user records.
```

### 10.7 Visualizer modes

Audio card currently draws a fake/simple animated visualizer based on sine waves, not real audio analysis.

Future:

```text
real AnalyserNode waveform
music visualizer themes
podcast title card
album-cover style scene
```

Need label honestly if not real audio reactive.

### 10.8 Project templates

Make should eventually open with beautiful templates:

```text
Record a course lesson
Record a screen tutorial
Record a creator update
Record a podcast clip
Record a music visualizer
Record a product demo
Record a webcam clip
```

Templates should configure modes/settings, not create backend truth.

### 10.9 Integrated video pipeline handoff

Desired future UX:

```text
Finish
→ choose clip or joined export
→ stage local file through Tauri Rust
→ open video page with staged file reference
→ video page runs existing prepare/transcode/mint flow
```

This must be designed carefully because of the existing bug remembered from video page:

```text
Previous selected file from last instance could be reused when no file was selected.
```

Make/video handoff must never silently reuse stale file state.

Need invariant:

```text
A file/staged media handoff must be explicit, source-labeled, session-scoped, clearable, and visible in UI.
```

### 10.10 Media library / local project save

Longer-term Make should support local projects:

```text
project title
draft metadata
clip list
scene settings
trim/reorder metadata
local staged media references
```

But local storage cannot hold large blobs safely. Need Tauri Rust local project storage later.

Possible path:

```text
Make project manifest in app data
clips in app-managed local media folder
bounded quota
clear project data command
no paid unlock truth
```

## 11. Important video-page carryover still relevant

From prior sessions:

```text
- video-lite mint/upload path currently has a 10 MB cap that blocks larger videos.
- user wants this reworked later using proper bounded large-media range/segment/staged upload path.
- video conversion/staging now can generate multiple FFmpeg outputs and mint them.
- need to fix likely height-only scaling bug.
- need actual output dimension verification.
- need video playback byte route normalization/load fallback.
- need every minted video version’s manifest to list/cross-link all other versions like image rendition group flow.
- video page UI still needs polish to look like image page and not dev page.
```

Make depends on the video pipeline becoming polished and reliable.

Do not try to solve all of video inside Make.

## 12. Testing checklist for next instance

Run:

```bash
cd /Users/mymac/Desktop/crablink
npm run build
```

Then:

```bash
scripts/run-tauri-dev-full-stack.sh
```

Manual route:

```text
crab://make
```

Manual Make tests:

```text
1. Page loads.
2. No "TikTok" or "tik tok" copy remains.
3. Preview canvas appears.
4. Audio Card mode shows idle preview.
5. Camera mode asks for camera and renders preview.
6. Screen mode asks for screen and renders preview.
7. Screen + PiP asks for screen and camera, renders both.
8. Start preview can be stopped.
9. Record clip works.
10. Stop clip creates local clip.
11. Local clip previews.
12. Download clip works.
13. Retake last removes newest clip.
14. Clear removes all clips.
15. Title persists across reload.
16. Advanced panel opens/closes.
17. Copy session plan works.
18. Open video page navigates to crab://video.
19. Closing/reloading with local clips does not imply published truth.
20. No wallet/receipt/CID claims are shown by Make.
```

If available, test with:

```text
- no camera permission
- no mic permission
- screen picker cancel
- camera present / no mic
- mic present / no camera
- screen sharing ended externally
```

## 13. UX observations from screenshots

The screenshots after first Make batch showed:

```text
- The page looked cool but very tall.
- The right readiness panel consumed a lot of vertical space.
- Draft details were too prominent and form-heavy.
- The preview looked good and should remain the hero.
- There was a visible "TikTok-style" copy issue, later resolved by script.
- Mode controls were usable but looked less flagship before the second patch.
```

The second patch addressed these by:

```text
- command center
- card-based modes
- collapsed advanced details
- timeline emphasis
- compact right rail
- stronger flagship styling
```

Need verify with fresh screenshots at normal zoom.

## 14. Copy/style rules for Make

Use product language like:

```text
Make Studio
creator command center
record clips
segments
timeline
scene presets
video handoff
local clip
local draft
popular style
short-form clip
screen tutorial
podcast clip
music visualizer
course lesson
```

Avoid:

```text
TikTok
Tik Tok
TikTok-style
OBS clone
DRM claims
ownership claims from local recording
receipt generated
minted locally
published locally
```

Preferred truth-boundary copy:

```text
Make records local clips. Video publishing, paid confirmation, receipts, manifests, and crab:// asset truth come from the backend video flow.
```

## 15. Architecture doctrine for Make

Make is allowed to:

```text
- use browser camera/screen/mic APIs
- draw composited canvas previews
- record local clips with MediaRecorder
- store draft metadata locally
- store session-plan metadata locally
- provide manual download/export
- navigate to video page
- show local-only status
```

Make is not allowed to:

```text
- call wallet mutation APIs directly
- call ledger APIs
- invent balance
- invent receipt
- invent CID
- invent crab URL
- unlock paid content from cache
- treat local clip as published asset
- execute arbitrary media/player code
- pass large media bytes through Tauri command results
```

## 16. Suggested exact next implementation order

### Next session batch 1: scene presets + countdown

Files likely touched:

```text
apps/crablink-tauri/src/pages/make/makeDraftModel.js
apps/crablink-tauri/src/pages/make/MakePage.jsx
apps/crablink-tauri/src/pages/make/make.css
```

Add:

```text
MAKE_SCENE_PRESETS
applyMakePreset()
countdown state
countdown overlay
beginRecordingCountdown()
cancelCountdown()
```

### Next session batch 2: keep/retake/next clip flow

Files likely touched:

```text
MakePage.jsx
make.css
```

Add:

```text
latest clip decision card
Keep + record next
Retake
Download
Finish
```

### Next session batch 3: unsaved clip warning + improved handoff

Files likely touched:

```text
MakePage.jsx
make.css
```

Add:

```text
beforeunload warning
stronger local blob warning
finish/export panel polish
```

### Next session batch 4: modularize Make internals

Files likely created:

```text
apps/crablink-tauri/src/pages/make/makeCanvasRenderer.js
apps/crablink-tauri/src/pages/make/makeRecorder.js
apps/crablink-tauri/src/pages/make/makeCapture.js
```

Maybe component files:

```text
MakeCommandDeck.jsx
MakeModeDeck.jsx
MakeTimelineCard.jsx
MakeProjectCard.jsx
MakeHandoffCard.jsx
MakeSidePanel.jsx
```

Do not overdo the split before UX stabilizes.

## 17. Current “definition of good” for Make

Make should feel:

```text
beautiful
obvious
creator-first
less dev-panel
less form-heavy
more visual
fast to understand
safe and honest
```

The first experience should be:

```text
1. User lands on crab://make.
2. They see a polished studio, not a settings page.
3. They pick a template or mode.
4. They start preview.
5. They record a segment.
6. They see it appear in a timeline.
7. They can retake or continue.
8. They can finish and hand off to video.
```

Make should become the page a creator wants to open first.

## 18. Final checkpoint statement

At the end of this session:

```text
crab://make exists.
The route loads.
The UI direction is validated by the user.
Local draft/session plan model exists.
Local recording/timeline model exists.
The page has a polished command-center/preview/timeline layout.
Brand-risk "TikTok" wording has been replaced with "popular style" via script.
The page still correctly avoids backend truth, wallet truth, receipt truth, and paid unlock claims.
```

The next instance should continue from this checkpoint and focus on Make Studio polish first, then modularization, then eventual safe local export/handoff into the video pipeline.


### END NOTE - MAY 31 2026 - 21:35 CST




### BEGIN NOTE - JUNE 1 2026 - 10:10 CST

Absolutely. Here are the carryover notes for the next instance. These are written so we can restart cleanly next session and continue building `crab://make` as the centerpiece, batteries-included creator studio.

# CrabLink Tauri Carryover Notes — Make Studio Centerpiece / Person Cutout Background Replacement

## 0. Current session checkpoint

We are continuing CrabLink Tauri work, using the newest uploaded codebundle:

```text
CODEBUNDLE_TAURI_APP.md
Generated: 2026-06-01T14:56:50Z
Root: /Users/mymac/Desktop/crablink
Git: 3b1fa66 (dirty)
```

The latest codebundle confirms the Tauri app has the Make route files in place:

```text
apps/crablink-tauri/src/pages/make/make.css
apps/crablink-tauri/src/pages/make/makeDraftModel.js
apps/crablink-tauri/src/pages/make/MakePage.jsx
```

It also confirms the stream feature files we need to port from:

```text
apps/crablink-tauri/src/pages/stream/streamCompositor.js
apps/crablink-tauri/src/pages/stream/streamPersonSegmentation.js
apps/crablink-tauri/src/pages/stream/StreamLocalPreview.jsx
apps/crablink-tauri/src/pages/stream/StreamLookPanel.jsx
apps/crablink-tauri/src/pages/stream/streamStudioModel.js
```

The newest codebundle is the active reference. 

The user’s current strategic direction is now very clear:

```text
Build crab://make first.
Make Studio should become CrabLink’s centerpiece.
CrabLink should feel batteries-included for creators.
```

The user also added an important product principle to memory:

```text
Data sovereignty is key for content creators.
Sites are reference graphs.
Content creators own their own content.
```

This must shape future design. Make Studio should help creators create, control, export, and eventually publish their own media without surrendering ownership or pretending local draft state is backend truth.

---

## 1. Language correction: this is not “green screen” anymore

The user explicitly corrected the terminology:

```text
Do not call the next feature “green screen” as the primary language.
```

Correct language going forward:

```text
person cutout
background removal
background replacement
software cutout
subject cutout
camera cutout
cutout effect
```

Wrong or outdated language:

```text
green screen
chroma key as the main UX term
```

Technical note: The stream page still has some legacy “green screen” fields and code paths because it historically started from chroma-key style work. We can preserve those internally temporarily if needed for compatibility, but Make’s product UI should call the feature **Person Cutout** or **Background Replacement**.

Very important cleanup: the latest codebundle still shows brand-risk wording in `streamPersonSegmentation.js` comments: “TikTok/Zoom-style background replacement.” That should be cleaned up in a future patch to something like “popular creator-app background replacement” or “software background replacement,” because the user previously asked to remove that brand wording from the repo. 

---

## 2. Highest-level product thesis

CrabLink should not just be a viewer for `crab://` links.

CrabLink should become:

```text
A batteries-included creator client.
```

`crab://make` is the center of that experience.

Make Studio should eventually let a creator:

```text
record camera clips
record screen clips
record screen + PiP camera clips
use person cutout/background replacement
use image backgrounds
use video backgrounds
use audio/podcast-style controls
use a teleprompter
record segmented clips
review a timeline
retake clips
reorder clips
trim clips
export local master media
handoff to crab://video for conversion/renditions/minting
publish through backend-derived truth
```

The mental model stays:

```text
Make = local creative studio
Video = conversion/rendition/mint/publish flow
Stream = live/stream-lite flow
Podcast = audio/podcast publishing flow
Backend = b3, manifests, receipts, paid access, ledger/wallet truth
```

Make should be powerful locally, but it must remain honest about what it is.

---

## 3. Hard boundaries that must not drift

Make Studio is allowed to be a rich local media creation workspace. It is not allowed to become backend authority.

Preserve these invariants:

```text
Make creates local clips and session plans only.
Make does not create b3 CIDs.
Make does not create crab:// asset truth.
Make does not mint video assets.
Make does not create or fake manifests.
Make does not create or fake receipts.
Make does not create wallet truth.
Make does not mutate ledger truth.
Make does not unlock paid content from local cache.
Make does not store private keys.
Make does not store raw capabilities, backend tokens, or spend authority.
Make does not execute creator-supplied code.
Make does not claim DRM or anti-rip protection.
Make does not make fake ownership claims from a local recording.
```

The current Make page header already states the correct boundary: local clips only, no fake CIDs, no fake receipts, no wallet mutation, no paid unlock from cache. 

The correct publish path remains:

```text
Make local recording/composition
→ local clip/master export
→ crab://video
→ Rust/FFmpeg prepare/transcode/staging
→ explicit backend paid prepare/confirm/upload/mint
→ backend-derived receipt
→ backend-derived manifest
→ backend-derived crab://<b3>.video
```

This is especially important because the product principle is data sovereignty. The creator should own their source media and exported files, while the backend provides durable b3 truth only after explicit publish/mint flow.

---

## 4. What exists now in Make Studio

The current Make route exists and loads. Earlier notes confirm:

```text
crab://make exists
route loads
local draft/session plan model exists
local recording/timeline model exists
the UI direction was validated by the user
the page is moving toward a polished command-center/preview/timeline layout
```

The prior notes define the “definition of good” for Make as:

```text
beautiful
obvious
creator-first
less dev-panel
less form-heavy
more visual
fast to understand
safe and honest
```

The desired first experience is:

```text
1. User lands on crab://make.
2. They see a polished studio, not a settings page.
3. They pick a template or mode.
4. They start preview.
5. They record a segment.
6. They see it appear in a timeline.
7. They can retake or continue.
8. They can finish and hand off to video.
```

This remains the guiding UX north star. 

Current Make features now include:

```text
scene preset cards
recording countdown
record-next / retake / download flow
unsaved local clip warning
finish/export panel
local teleprompter
preview-only teleprompter overlay
teleprompter position and scroll speed controls
video-page handoff copy
```

The newest codebundle shows the teleprompter editor, including the explicit truth boundary: the overlay is above the preview for the creator and is not drawn into the recorded canvas. 

The newest codebundle also shows Make’s current timeline, project panel, and handoff wiring, including `MakeTimelineCard`, `MakeProjectCard`, and `MakeHandoffCard`, plus preview-only teleprompter controls. 

---

## 5. What exists now in Stream that should be ported to Make

The stream page has already proven the most important local creator-studio effect:

```text
person cutout / background removal / background replacement
```

The stream notes state that the app moved past chroma-only green screen and can detect the person, keep the subject, remove the real background, and draw a selected background behind the creator. They also note that subject positioning, zoom, mirror, brightness, contrast, saturation, and saved local scenes are working. 

The stream implementation includes:

```text
streamPersonSegmentation.js
streamCompositor.js
StreamLookPanel.jsx
StreamLocalPreview.jsx
streamStudioModel.js
```

The codebundle shows `streamPersonSegmentation.js` using MediaPipe Tasks Vision with `FilesetResolver` and `ImageSegmenter`, a selfie segmentation landscape model, local status state, mask state, and `requestPersonSegmentationMask(...)`. 

The codebundle also shows `streamCompositor.js` drawing a stable local canvas output, interacting with `streamPersonSegmentation`, and explicitly staying local-only without b3, wallet, receipt, entitlement, or backend live-status truth. 

That stream code is exactly the foundation for Make’s next major feature.

---

## 6. Immediate next goal

Next session should focus on this:

```text
Port the stream person cutout/background replacement system into crab://make.
```

This should not be a backend task. It should be a local compositor task.

The first Make cutout/background version should support:

```text
camera mode with person cutout
camera mode with solid background
camera mode with image background
camera mode with video background
screen + PiP mode where webcam PiP can use person cutout
screen + PiP mode where PiP can have transparent/cutout subject over screen
optional background replacement behind the PiP subject
```

The user specifically wants:

```text
Use either images or video for the background using the cutout effect.
```

So the design should not stop at static image backgrounds. We should plan for both:

```text
backgroundKind: 'none' | 'solid' | 'image' | 'video'
backgroundImageUrl / backgroundImageObjectUrl
backgroundVideoUrl / backgroundVideoObjectUrl
```

Because this is local-only at first, local object URLs are acceptable, but they must be revoked when replaced/unmounted.

---

## 7. Recommended implementation plan for next session

### Batch 1 — clean language and create Make media foundation

Likely files touched:

```text
apps/crablink-tauri/src/pages/make/makeDraftModel.js
apps/crablink-tauri/src/pages/make/MakePage.jsx
apps/crablink-tauri/src/pages/make/make.css
```

Likely files created:

```text
apps/crablink-tauri/src/pages/make/makePersonSegmentation.js
apps/crablink-tauri/src/pages/make/makeCompositor.js
```

Possible later files, but not necessarily first batch:

```text
apps/crablink-tauri/src/pages/make/MakeBackgroundPanel.jsx
apps/crablink-tauri/src/pages/make/MakeCutoutPanel.jsx
apps/crablink-tauri/src/pages/make/MakePreviewStage.jsx
```

Important: Do not prematurely extract shared files unless patching becomes painful. Earlier notes explicitly recommended keeping Make route-owned until the feature proves itself, then possibly extracting shared media logic later. 

First cleanup tasks:

```text
- Replace “green screen” product copy in Make with “person cutout” / “background replacement”.
- Clean remaining brand-risk “TikTok” wording in streamPersonSegmentation.js comments.
- Keep internal legacy greenScreen fields only if necessary for stream compatibility.
```

### Batch 2 — port segmentation helper

The safest first move is probably to copy/adapt:

```text
apps/crablink-tauri/src/pages/stream/streamPersonSegmentation.js
```

into:

```text
apps/crablink-tauri/src/pages/make/makePersonSegmentation.js
```

Do not import stream’s helper directly if doing so couples Make to Stream’s route semantics or naming. The better first step is route-owned duplication with cleaned naming, then extract shared media later.

New Make helper header should say something like:

```text
RO:WHAT — Local person cutout/background-removal helper for Make Studio.
RO:WHY — Enables software subject isolation for creator recording without requiring physical green screens.
RO:INTERACTS — makeCompositor.js, MakePage.jsx, @mediapipe/tasks-vision.
RO:INVARIANTS — local visual mask only; no b3, wallet, receipt, entitlement, ownership, or backend truth.
```

Do not mention TikTok. Do not call this “green screen” in the header.

Preserve useful segmentation behavior:

```text
MediaPipe ImageSegmenter
selfie segmenter landscape model
status reporting
mask caching
min interval throttling
in-flight guard
clear mask on source stop
waiting_for_video state
error state
```

Known risk:

```text
The current stream code uses CDN/model URLs for MVP.
Production should eventually bundle model/wasm locally.
```

This is acceptable for current dev/proof, but the UI should not claim fully offline cutout until the model is bundled.

### Batch 3 — create Make compositor

Create:

```text
apps/crablink-tauri/src/pages/make/makeCompositor.js
```

Start from the relevant parts of:

```text
apps/crablink-tauri/src/pages/stream/streamCompositor.js
```

But rename semantics for Make:

```text
drawMakeFrame(...)
describeMakeCompositorMode(...)
clearMakeCompositorState(...)
```

Make compositor responsibilities:

```text
set canvas size from Make output preset
draw active background
draw camera source
apply person cutout mask when enabled
draw screen source when in screen/screen_pip mode
draw PiP overlay
draw audio-only slate
draw local badges if needed
return readiness status for recording
```

Make compositor must not:

```text
publish to backend
call wallet
call gateway directly
create CIDs
create receipts
store secrets
claim stream/live status
```

### Batch 4 — add Make draft fields

Update:

```text
apps/crablink-tauri/src/pages/make/makeDraftModel.js
```

Add local-only fields such as:

```javascript
backgroundRemovalMode: 'off' | 'person_cutout'
backgroundKind: 'scene' | 'solid' | 'image' | 'video'
backgroundSolidColor: '#111111'
backgroundImageName: ''
backgroundVideoName: ''
subjectMirror: true
subjectOffsetX: 0
subjectOffsetY: 0
subjectScale: 100
subjectBrightness: 100
subjectContrast: 100
subjectSaturation: 100
cutoutFeather: 6
cutoutStatus: 'idle'
```

For local object URLs, do **not** persist the actual object URL or file path in localStorage. Keep names/metadata only in the draft model, and keep the actual selected file/video object URL in component state.

The draft/session plan may include:

```text
background kind
background file display name
cutout enabled yes/no
subject framing values
```

But it should clearly remain local project metadata, not publish truth.

### Batch 5 — wire MakePage preview drawing

Current Make likely has a canvas render loop already. Replace or adapt that render loop so it calls `drawMakeFrame(...)`.

Inputs to the compositor:

```text
canvasRef.current
cameraVideoRef.current
screenVideoRef.current
backgroundImageElementRef.current
backgroundVideoElementRef.current
draft
inputState
```

Important behavior:

```text
If preview is not ready, draw idle slate.
If camera is ready and cutout is off, draw normal camera.
If camera is ready and cutout is on, request segmentation mask and draw cutout.
If backgroundKind is image, draw selected image behind subject.
If backgroundKind is video, draw selected video behind subject and keep it looping/muted.
If screen_pip is active, draw screen full canvas and camera/PiP on top.
If screen_pip + person cutout is active, draw cutout subject in PiP region.
```

### Batch 6 — add UI controls

Add a panel inside Make’s project/settings area, ideally not too form-heavy.

Suggested UI labels:

```text
Background replacement
Person cutout
Background source
Solid color
Image background
Video background
Choose image
Choose video
Subject framing
Mirror
Move X
Move Y
Zoom
Brightness
Contrast
Saturation
Reset look
```

Avoid saying “green screen” except maybe in a migration note or advanced developer label if absolutely necessary.

The UI should feel creator-first:

```text
Person Cutout: Off / On
Background: Scene / Solid / Image / Video
Framing: Mirror / Zoom / Position
Look: Brightness / Contrast / Saturation
```

Do not overload the main hero area. Keep the page polished.

### Batch 7 — image/video background handling

For local image background:

```text
input type=file accept="image/*"
create object URL
load into Image element
draw to canvas cover-fit
revoke old object URL when replaced/unmounted
store only display name in draft/session plan
```

For local video background:

```text
input type=file accept="video/*"
create object URL
attach to hidden video element
muted
loop
playsInline
autoplay after user action where possible
draw current frame to canvas cover-fit
revoke old object URL when replaced/unmounted
store only display name in draft/session plan
```

Potential Tauri/WebView issue:

```text
Autoplay may fail unless muted and triggered after a user action.
```

Fallback:

```text
Show “Video background loaded; press Start preview to animate.”
```

Do not fake video support if the WebView blocks playback.

---

## 8. Important technical risks

### 8.1 Performance

Person segmentation can be expensive. Stream currently uses a minimum segmentation interval around 95ms. 

Make should preserve throttling:

```text
do not run segmentation every animation frame
reuse the last mask
show a status badge if model is loading or unavailable
degrade gracefully to normal camera
```

Make should not claim broken cutout as working. If the model fails, show:

```text
Person cutout unavailable. Recording can continue without background replacement.
```

### 8.2 Video background object URLs

Need to revoke URLs:

```text
URL.revokeObjectURL(oldUrl)
```

When:

```text
new background selected
draft reset
component unmount
clear background
```

### 8.3 Canvas recording

The recorded clip should be from the composited canvas stream, not raw camera, once cutout is enabled.

Expected:

```text
canvas.captureStream(targetFps)
```

Then combine audio tracks as current Make does.

Need verify that if background video is drawing to canvas, it appears in the recorded clip.

### 8.4 PiP + cutout

First version can support cutout in camera-only mode first. Then PiP cutout.

Recommended sequence:

```text
1. Camera + cutout + static scene/solid background.
2. Camera + cutout + image background.
3. Camera + cutout + video background.
4. Screen + PiP normal camera.
5. Screen + PiP cutout camera.
```

Avoid trying to land all edge cases in one patch if it becomes too large.

### 8.5 Do not accidentally couple to Stream’s backend flow

Stream includes publish/session panels and stream-lite backend logic. Do not bring those into Make.

Only port:

```text
local compositor
person segmentation helper
look/framing controls
background selection concepts
```

Do not port:

```text
StreamPublishFlow
StreamSessionPanel
streamSessionClient
stream-lite backend latest-frame loop
publishedStream state
live descriptor flow
viewer paid segment logic
```

The stream code itself separates clean Studio UX from publish/session controls, and even collapses advanced controls to keep the Studio clean while preserving explicit ROC hold/publishing controls. 

---

## 9. Make’s current handoff state

Make’s current finish panel still tells the user to download/export locally, then open Video to convert, stage versions, confirm ROC access, and mint through backend truth. The codebundle shows this truth boundary explicitly in `MakeHandoffCard`. 

Current limitation:

```text
Make does not yet directly pass a staged file handle into crab://video.
```

Near-term acceptable path:

```text
download selected clip
open crab://video
manually choose exported clip
run existing video conversion/mint flow
```

Future desired path:

```text
Make local clips
→ export/stage master file
→ direct handoff to VideoConverterPanel-compatible staged source
→ video renditions
→ explicit ROC confirmation
→ backend mint
```

Do not solve direct handoff until Make’s local composer is stable.

---

## 10. Data sovereignty implications for Make

This is now a key product principle and should influence copy and features.

Make should communicate:

```text
Your drafts are local.
Your source clips are yours.
Your exported media is yours.
Publishing creates backend b3 truth only when you explicitly choose to publish.
Sites reference your assets; they do not swallow your ownership.
```

Future UX ideas that fit this principle:

```text
local project export
local source bundle
download all clips
download session plan
export master video
show exactly what is local vs published
show “not minted yet” status
show “backend-derived” only after publish
asset manifest cross-links after mint
```

Avoid:

```text
claiming CrabLink owns the clip
treating local drafts as site-owned data
auto-uploading without explicit action
silently monetizing without clear confirmation
```

---

## 11. Recommended file plan for next session

### Minimum first patch files

```text
apps/crablink-tauri/src/pages/make/makeDraftModel.js
apps/crablink-tauri/src/pages/make/MakePage.jsx
apps/crablink-tauri/src/pages/make/make.css
apps/crablink-tauri/src/pages/make/makePersonSegmentation.js
apps/crablink-tauri/src/pages/make/makeCompositor.js
```

### Possible second patch files

```text
apps/crablink-tauri/src/pages/make/MakeCutoutPanel.jsx
apps/crablink-tauri/src/pages/make/MakeBackgroundPanel.jsx
apps/crablink-tauri/src/pages/make/MakePreviewStage.jsx
```

### Avoid touching unless necessary

```text
apps/crablink-tauri/src/pages/video/*
apps/crablink-tauri/src-tauri/*
RustyOnions backend crates
wallet/ledger/accounting/rewarder code
gateway/omnigate routes
```

No backend changes should be required for this next Make cutout/background batch.

---

## 12. Suggested next-session patch order

### Patch 1: route-owned helper files

Create:

```text
makePersonSegmentation.js
makeCompositor.js
```

Basic Make compositor supports:

```text
camera
audio-only slate
scene/solid background
person cutout status
normal draw if cutout disabled
```

Test:

```text
npm run build
scripts/run-tauri-dev-full-stack.sh
open crab://make
camera preview works
cutout off works
cutout on shows model loading then subject cutout
recorded clip includes composited canvas
```

### Patch 2: image backgrounds

Add:

```text
choose image background
image object URL state
image cover-fit draw
clear image
revoke URL cleanup
draft stores image display name only
```

Test:

```text
choose image background
enable person cutout
record clip
download clip
verify image appears behind subject
reset/replace image
verify no stale background after reset
```

### Patch 3: video backgrounds

Add:

```text
choose video background
hidden video element
loop/muted/playsInline
draw video frame behind subject
play/pause tied to preview state
revoke URL cleanup
```

Test:

```text
choose video background
start preview
video animates behind subject
record clip
download clip
verify video background appears in clip
stop preview
tracks/object URLs cleaned up
```

### Patch 4: PiP cutout

Add:

```text
screen_pip mode draws screen full canvas
camera PiP supports normal mode
camera PiP supports cutout mode
PiP background can be transparent over screen or replaced by local background
```

Test:

```text
screen + PiP preview
PiP size slider
PiP corner select
enable cutout
record clip
download clip
verify screen and PiP are in recorded clip
```

---

## 13. Testing checklist for next session

Run:

```bash
cd /Users/mymac/Desktop/crablink
npm run build
scripts/run-tauri-dev-full-stack.sh
```

If debugging only frontend:

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tauri
npm run tauri:dev:mac-media
```

Manual tests:

```text
Open crab://make.
Verify page loads.
Verify scene presets still work.
Verify teleprompter still works.
Verify preview start/stop still works.
Verify camera mode works without cutout.
Verify camera mode works with person cutout.
Verify cutout fails gracefully if model unavailable.
Verify image background appears behind subject.
Verify video background appears behind subject.
Verify local clip recording captures composited output.
Verify record countdown still works.
Verify Keep + record next still works.
Verify Retake revokes/removes latest clip.
Verify Download selected clip still works.
Verify Finish panel still opens crab://video.
Verify no fake CID/receipt/manifest is shown.
Verify no wallet action happens from Make.
Verify local object URLs are revoked on clear/unmount.
```

Regression tests:

```text
Start preview.
Stop preview.
Start preview again.
Switch mode while stopped.
Try changing preset while preview running: should block or warn as current behavior does.
Record a clip.
Navigate away with unsaved clip: warning should appear.
Return to Make: local draft metadata persists, but raw clip blobs should not be falsely restored.
```

Important stale-state test, based on prior video-page bug:

```text
Open crab://make fresh.
Do not select a background.
Do not start preview.
Verify old background object URL is not reused from prior session.
Open crab://video fresh.
Do not select a file.
Confirm stale previous staged jobs do not enable minting.
```

This matters because Make will eventually stage media and must not repeat stale local-state bugs.

---

## 14. UX requirements for next Make work

The page should stay polished.

Do not turn Make into a raw settings wall. The cutout/background controls should feel like a creator tool:

```text
simple toggles
visual cards
clear preview feedback
short labels
collapsed advanced controls
local-only honesty
```

Suggested layout:

```text
Main preview area:
  camera/screen/canvas
  recording badge
  countdown overlay
  teleprompter overlay
  small cutout status badge

Under/near preview:
  scene presets
  mode cards
  timeline

Project/details panel:
  title/description/tags
  teleprompter
  background replacement
  audio
  PiP
  creator notes
```

The first visible page should still feel like:

```text
a studio
not a developer panel
```

---

## 15. Copy rules

Use:

```text
Make Studio
creator command center
record clips
segments
timeline
scene presets
video handoff
local clip
local draft
person cutout
background replacement
software cutout
image background
video background
subject framing
popular style
short-form clip
screen tutorial
podcast clip
music visualizer
course lesson
```

Avoid:

```text
TikTok
Tik Tok
TikTok-style
green screen as primary UX term
OBS clone
DRM claims
ownership claims from local recording
receipt generated
minted locally
published locally
```

Preferred truth-boundary copy:

```text
Make records local clips. Video publishing, paid confirmation, receipts, manifests, and crab:// asset truth come from the backend video flow.
```

---

## 16. Architecture note for future shared media extraction

Eventually, Make, Stream, Podcast, and possibly Video should share a local media foundation.

Possible future shared structure:

```text
apps/crablink-tauri/src/shared/media/localCapture.js
apps/crablink-tauri/src/shared/media/localRecorder.js
apps/crablink-tauri/src/shared/media/canvasCompositor.js
apps/crablink-tauri/src/shared/media/personSegmentation.js
apps/crablink-tauri/src/shared/media/backgroundSources.js
apps/crablink-tauri/src/shared/media/audioChain.js
apps/crablink-tauri/src/shared/media/clipTimeline.js
```

But do not do this too early. First prove Make’s route-owned cutout/background flow, then extract once the Make and Stream abstractions are clearly aligned.

---

## 17. What not to do next session

Do not jump to:

```text
QuickChain
ROX
Solana
external settlement
public bridge
staking/liquidity
new backend services
wallet/ledger changes
large-media backend redesign
full WebRTC/HLS
full video editor timeline
drag-and-drop library
sandboxed executable facets
```

Do not start with backend work. The next best work is local Make Studio product capability.

---

## 18. Final next-session goal statement

The next instance should start from this goal:

```text
Make Studio is CrabLink’s flagship batteries-included creator page.
Next, port Stream’s proven person cutout/background replacement into Make.
Support local image and local video backgrounds.
Keep it local, bounded, honest, creator-owned, and backend-truth-safe.
```

The first successful milestone should be:

```text
In crab://make, a creator can start camera preview, enable Person Cutout, choose an image or video background, record a local segment from the composited canvas, download it, and hand it off to crab://video for backend-derived publishing.
```

That will be a major product step: CrabLink starts feeling like a real creator studio, not just a set of asset pages.


### END NOTE - JUNE 1 2026 - 10:10 CST