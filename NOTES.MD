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