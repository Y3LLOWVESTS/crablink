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