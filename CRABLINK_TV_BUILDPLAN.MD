---
title: CRABLINK_TV_BUILD_PLAN
version: 0.1.0
status: active-build-plan
last-updated: 2026-07-15
audience: contributors, CrabLink app engineers, RustyOnions service owners, security reviewers, private-beta testers
repo-target: crablink
primary-app-target: apps/crablink-tv
related-app: apps/crablink-tauri
related-repo: RustyOnions
hardware-target: Android TV box, RK3528-class, 4 GB RAM, 32 GB storage
---

# CRABLINK_TV_BUILD_PLAN.md — CrabLink TV Android/Tauri Client

RO:WHAT — Active implementation plan for a remote-first CrabLink TV client built as a sibling Tauri Android application inside the existing CrabLink repository.

RO:WHY — CrabLink needs a lightweight television client for browsing `crab://` content, playing verified media, using existing purchases, pairing with a trusted CrabLink device, and displaying backend-confirmed receipts without importing desktop node/operator behavior into an Android TV device.

RO:INTERACTS — `apps/crablink-tv`, `apps/crablink-tauri`, `packages/crablink-core`, `packages/crablink-platform`, future `packages/crablink-tv-ui`, future shared native CrabLink crate, `svc-gateway`, `omnigate`, `svc-passport`, `ron-auth`, `ron-proto`, `svc-storage`, `svc-index`, `svc-wallet`, `ron-ledger`, `ron-policy`, Android TV, Tauri 2.

RO:INVARIANTS — Same repository, separate TV application; client-only posture; remote-only navigation; backend-derived identity, entitlement, receipt, and ROC truth; no local node, operator mode, wallet keys, direct ledger mutation, fake receipt, fake balance, silent spend, direct-provider privacy fallback, ROX/Solana runtime, or service-node administration.

RO:METRICS — App launch, route open, focus-navigation failure, gateway readiness, pairing result, media start/failure/buffer, entitlement result, receipt refresh, B3 verification result, cache integrity, and redacted error class.

RO:CONFIG — TV application identifier, gateway URL, pairing URL, request timeout, environment profile, release HTTPS policy, development LAN profile, cache quota, media limits, feature flags, and Android-specific permissions.

RO:SECURITY — React owns display and user intent only. Tauri Rust owns privileged network, secure-session, integrity, and native-device operations. The TV stores only minimum device-bound session material. No seed phrase, private wallet key, unrestricted capability, operator credential, or reward authority may enter React state, browser storage, URLs, logs, QR codes, or error messages.

RO:TEST — Pure JavaScript route/focus tests, React build checks, Rust command/unit tests, boundary scripts, Android compile/build checks, ADB launch and key-event tests, target-device media tests, pairing expiry/revocation tests, entitlement/receipt truth tests, privacy/error tests, soak tests, and a reproducible TV acceptance runner.

---

## 0. Safe Current Label

```text
CrabLink TV build plan: READY.
CrabLink TV implementation: NOT STARTED.
CrabLink desktop BUILD_PLAN_Z Phase 22: must reach final GREEN_PARKED acceptance before TV source mutation begins.
CrabLink TV posture: sibling Android/Tauri client, not a node and not an operator surface.
```

The current CrabLink desktop and RustyOnions Phase 22 work must not be restarted or rewritten for TV. Finish the existing Phase 22 acceptance failure first, then begin TV Phase 0 from a known-green desktop baseline.

The TV plan is implementation-oriented. Each phase must add real behavior, focused tests, compile/build checks, and fixes before the next phase expands scope.

---

## 1. Product Definition

### 1.1 What CrabLink TV is

CrabLink TV is a television client for the CrabLink/RustyOnions content and account experience.

Initial product role:

```text
browse
resolve crab:// routes
view creator pages
view images and publications
play video, music, streams, and podcasts
use already-approved paid entitlements
show receipt history
show confirmed ROC from durable backend receipts
pair with desktop/mobile CrabLink
retain minimal device-bound session state
```

### 1.2 What CrabLink TV is not

CrabLink TV must not become:

```text
a CrabLink User Node
an embedded micronode
a public Service Node
a content-serving node
a Service Node Operator console
a reward planner
a reward issuer
a wallet-key custodian
a ledger authority
a local minting surface
a ROX/Solana bridge client
a general creator workstation
a desktop app squeezed onto a TV
```

### 1.3 Initial hardware topology

```text
MacBook / development host
├── CrabLink desktop application
├── RustyOnions local/private-beta services
├── CrabLink User Node / micronode when required
└── local gateway reachable through the LAN development profile

Android TV box
└── CrabLink TV client only
```

The target box is expected to be inexpensive and resource-constrained compared with the MacBook. The TV must consume approved client APIs rather than hosting node infrastructure.

---

## 2. Repository and Architecture Decision

### 2.1 Same repository, separate application

Create the TV application here:

```text
crablink/apps/crablink-tv
```

Do not create a separate repository.

Do not initialize Android support inside the existing desktop app and then compile all desktop commands into the TV package.

The two applications have different product responsibilities:

```text
apps/crablink-tauri
  desktop shell
  creator tools
  local media tools
  User Node controls
  Service Node Operator Mode
  desktop filesystem behavior
  desktop-specific plugins

apps/crablink-tv
  ten-foot shell
  remote navigation
  browse and playback
  pairing
  read-only receipts and confirmed ROC
  narrow TV settings
  no node/operator/creator-authority surfaces
```

### 2.2 Shared package strategy

The repository already contains the correct package boundaries, but the shared packages remain mostly migration targets. Make them real incrementally.

Recommended final layout:

```text
crablink/
├── apps/
│   ├── crablink-tauri/
│   └── crablink-tv/
├── packages/
│   ├── crablink-core/
│   ├── crablink-platform/
│   └── crablink-tv-ui/
├── crates/
│   └── crablink-native-core/
└── scripts/
```

Ownership:

```text
@crablink/core
  pure JavaScript/React-neutral CrabLink behavior
  crab:// parsing and route models
  content/creator display models
  receipt display normalization
  no Chrome APIs
  no Tauri APIs
  no DOM assumptions where avoidable
  no backend authority

@crablink/platform
  adapter contracts
  Tauri adapter
  memory/test adapter
  future Chrome compatibility adapter
  settings, gateway, pairing, receipts, diagnostics ports

@crablink/tv-ui
  TV focus engine
  rails, cards, overlays, player chrome
  remote-navigation primitives
  route focus memory
  ten-foot typography and spacing
  no network authority

crablink-native-core
  pure Rust shared validation
  canonical crab:// and B3 validation
  receipt/confirmed-ROC projection validation
  pairing/session DTO validation
  bounded gateway request helpers where platform-neutral
  no Tauri dependency
  no Android dependency
```

Do not add a separate `crablink-client` package at the start. Create it only if later implementation proves that `@crablink/core` and `@crablink/platform` cannot own the shared client behavior cleanly.

### 2.3 Migration rule

Do not perform a broad desktop refactor before the first TV APK boots.

Correct sequence:

```text
1. Create a minimal TV app.
2. Prove Android build and launch.
3. Extract one shared behavior family at a time.
4. Keep desktop behavior green after every extraction.
5. Add TV use of the extracted behavior.
```

Wrong sequence:

```text
move the whole desktop app into packages
rewrite every route
create many new abstractions
then try Android for the first time
```

---

## 3. Authority and Security Boundaries

### 3.1 TV client authority

CrabLink TV may:

```text
send explicit user intent
query gateway readiness
resolve crab:// routes
request hydrated creator/content views
request backend entitlement checks
request media URLs or bounded media sessions
request receipt history
request confirmed ROC display projection
initiate pairing
store a device-bound session
clear/revoke its local session
maintain a verified display cache
```

CrabLink TV must not:

```text
hold wallet private keys or seed phrases
mint, issue, transfer, burn, or settle ROC
mutate ron-ledger directly
trust local cache as entitlement truth
treat pending evidence as confirmed ROC
create fake receipts or balances
silently spend
approve its own pairing
issue unrestricted capabilities
run or control micronode/macronode
expose Service Node operator commands
connect directly to content providers as a privacy fallback
bypass sanctions/policy denial
activate ROX, Solana, bridge, staking, liquidity, or exchange behavior
```

### 3.2 Tauri command allowlist

The TV command bridge must be a new narrow registry. It must not import the desktop registry wholesale.

Expected TV-safe commands:

```text
tv_diagnostics
tv_settings_read
tv_settings_write
tv_gateway_health
tv_gateway_ready
tv_resolve_crab_url
tv_fetch_view
tv_fetch_asset_manifest
tv_fetch_small_verified_asset
tv_pairing_begin
tv_pairing_poll
tv_pairing_cancel
tv_session_status
tv_session_clear
tv_receipts_list
tv_confirmed_roc
tv_entitlement_check
tv_media_prepare
tv_device_info
```

Explicitly absent:

```text
local_node_start
local_node_stop
local_node_restart
service_node_operator_*
media_choose_local_file
media_export_*
local_stream_*
asset_upload_*
creator publish commands
raw shell/process commands
arbitrary URL fetch
raw capability export
wallet mutation commands
ledger mutation commands
```

### 3.3 Tauri permissions

Create a TV-specific capability file and grant only the commands/plugins used by the TV window/webview.

Do not copy desktop default permissions without review.

Every plugin added to the TV app must have:

```text
one product reason
one minimum permission scope
one focused test
one explicit mobile-support check
```

---

## 4. Route and Feature Scope

### 4.1 Alpha route registry

The TV app should use a dedicated route registry rather than expose every desktop route.

Initial supported routes:

```text
crab://home
crab://profile/...
crab://library
crab://receipts
crab://settings
crab://pair
crab://<site-name>
crab://<hash>.image
crab://<hash>.video
crab://<hash>.music
crab://<hash>.podcast
crab://<hash>.stream
crab://<hash>.article
crab://<hash>.text
```

Initial route posture:

| Route family | TV Alpha posture | Notes |
|---|---:|---|
| Home/catalog | Included | Continue Watching, Following, Recent Purchases, Featured/Recent content |
| Creator/profile | Included | Read/browse only |
| Image | Included | Fullscreen viewer; B3-backed metadata |
| Video | Included | Remote playback controls |
| Music | Included | Remote playback controls |
| Podcast | Included | Remote playback controls |
| Stream | Included with controlled source | No local streaming authority |
| Article/text/site | Included | Ten-foot reading layout |
| Library | Included | Backend-derived and local display organization |
| Receipts | Included | Display only |
| Confirmed ROC | Included | Durable wallet/ledger receipt projection only |
| Search | Optional after browse is green | Remote keyboard/voice complexity deferred |
| Chat | Read-only deferred | No TV text-composer requirement in Alpha |
| Make/video editor | Excluded | Desktop creator surface |
| Publish flows | Excluded | No creator authority in TV Alpha |
| Operator | Excluded | Service Node administration forbidden |
| QuickChain readiness | Excluded | Internal engineering surface |
| User Node controls | Excluded | TV is client-only |
| Ads/algo/code/game creation | Excluded | Creator/developer surfaces |

### 4.2 Paid-content posture

TV Alpha may consume content for which the backend confirms a current entitlement.

TV Alpha must not perform an independent spend flow.

Correct Alpha flow:

```text
open content
→ request backend entitlement
→ backend confirms entitlement/receipt
→ play or display content
```

Failure flow:

```text
open content
→ entitlement unavailable/expired/denied
→ content remains locked
→ show pairing/companion approval guidance
```

A later phase may add companion-approved purchasing, but the TV must still not hold wallet keys or silently spend.

---

## 5. Android TV Platform Rules

### 5.1 TV manifest requirements

The generated Android project must declare:

```text
TV launcher activity/category
TV application banner
no touchscreen requirement
leanback software feature posture
network permissions actually required
landscape/TV presentation behavior
non-exported components unless intentionally exported
```

The app must appear in the Android TV launcher after sideloading.

For early private testing, the application may expose both ordinary Android launcher and TV launcher categories if required by the specific box. Before release, launcher behavior must be reviewed against the intended distribution profile.

### 5.2 Application identity

Use a separate identifier:

```text
com.rustyonions.crablink.tv
```

This separates:

```text
permissions
signing
versioning
store listing
update channel
icons/banner
application data
capabilities
crash reports
```

### 5.3 Android support floor

Tauri currently supports Android 7.0/API 24 as its minimum Android version. The target RK3528-class Android 13 device is above that floor.

Do not raise `minSdkVersion` without a demonstrated API requirement.

Do not assume ABI. Query the actual device before optimizing build outputs:

```bash
adb shell getprop ro.product.cpu.abi
adb shell getprop ro.product.cpu.abilist
```

Begin with a universal debug APK. Add split-per-ABI release builds only after device installation is green.

### 5.4 Network permissions and Android version drift

The app requires normal network permissions for gateway access.

Development LAN access must be treated as a platform behavior with tests. Android 16 introduced an opt-in local-network protection path, and Android 17 requires local-network permission for apps targeting API 37 or higher. The TV app must be prepared to request the relevant permission when its target SDK reaches that behavior.

Do not add broad nearby-device or local-network permissions before the target SDK/device behavior requires them.

### 5.5 Cleartext policy

Release builds must fail closed on cleartext HTTP.

Development may allow cleartext only through a dedicated debug Android configuration limited to the controlled LAN/dev endpoint.

Never use a release-wide `cleartextTrafficPermitted="true"` base configuration.

---

## 6. TV Navigation and Focus Model

### 6.1 Remote is the primary input

The entire Alpha must work without mouse or touchscreen.

Required mappings:

```text
D-pad Up/Down/Left/Right → spatial focus movement
Center/Enter             → activate focused control
Back/Escape              → previous view or close top overlay
Play/Pause               → media playback toggle
Left/Right in player     → seek when the seek surface is active
Home                     → system-owned behavior; do not intercept
```

### 6.2 Focus engine

Do not rely only on browser tab order.

Implement a small deterministic focus layer in `@crablink/tv-ui`:

```text
focusable item IDs
row/rail membership
explicit directional neighbors where layout is ambiguous
nearest-item fallback for dynamic rows
one active focus target
route-level focus memory
modal focus trap
focus restore after Back
scroll focused item into view
focus-visible styling
no hidden focus targets
```

Recommended API shape:

```text
<TvFocusRoot>
<TvFocusScope id="home">
<TvRail id="continue-watching">
<TvFocusable id="asset:<cid>">
useTvFocusMemory(routeKey)
useTvRemoteKeys()
```

### 6.3 Focus invariants

Every route must prove:

```text
all visible actions are reachable
no focus dead end
no focus jump to hidden/offscreen UI
Back returns to the previous logical surface
returning to a rail restores the prior card
opening a modal moves focus into it
closing a modal restores the launching control
scrolling keeps the focused item visible
rapid key repeat does not queue unbounded work
```

### 6.4 Accessibility

Use semantic HTML controls wherever possible.

Custom focus components must preserve:

```text
role
accessible name
selected/pressed/expanded state
logical DOM order
sufficient focus contrast
large target presentation
screen-reader compatibility where supported
```

Do not consume every D-pad event blindly; accessibility services may own navigation behavior.

---

## 7. Network and Gateway Model

### 7.1 `localhost` rule

Inside the TV app:

```text
127.0.0.1 = the TV box
```

It is not the MacBook.

The development profile must use a reachable host address, for example:

```text
MacBook gateway: https://192.168.1.50:<port>
TV box:          192.168.1.80
```

### 7.2 Network profiles

Define explicit profiles:

```text
tv-dev-lan
  explicit host/IP
  debug-only cleartext exception when unavoidable
  no secrets in URL
  visible DEV badge
  short request timeouts

private-beta
  authenticated HTTPS
  pinned/approved environment identity
  pairing required
  no arbitrary endpoint editing by default

release
  HTTPS only
  reviewed origin allowlist
  production policy/sanctions enforcement
  no dev session shortcuts
```

### 7.3 Gateway-first rule

The TV app talks to approved client routes through `svc-gateway`/`omnigate`.

It must not call:

```text
svc-storage directly
svc-index directly
svc-wallet directly
ron-ledger directly
micronode admin directly
macronode admin directly
provider IPs directly
```

### 7.4 Origin allowlist

Rust-side network commands must validate destination origins against the selected profile.

No arbitrary URL fetch command may be exposed to React.

The request API should accept a typed operation, not an unrestricted URL:

```text
ResolveCrabUrl
FetchHomeCatalog
FetchCreatorPage
FetchAssetManifest
FetchSmallAsset
CheckEntitlement
ListReceipts
FetchConfirmedRoc
BeginPairing
PollPairing
```

---

## 8. Media Architecture

### 8.1 First implementation

Start with the Android WebView/HTML media path because it is the smallest integration and preserves the Tauri/web stack.

Prove on the actual box:

```text
MP4 H.264/AAC playback
WebM playback if used by CrabLink
audio playback
range requests
pause/resume
seek
fullscreen
remote play/pause key
route exit cleanup
screen sleep behavior
30-minute playback stability
```

### 8.2 Native Media3 fallback

Do not build a native player before testing the WebView path.

If the measured WebView path fails on codec support, remote media keys, buffering, fullscreen, track selection, or long-play stability, implement a narrow Tauri Android plugin backed by AndroidX Media3 ExoPlayer and MediaSession.

The plugin must remain narrow:

```text
prepare typed media item
play
pause
seek
stop
query status
emit bounded playback events
release player
```

It must not become a general native execution bridge.

### 8.3 Media truth

For small assets, the native client may download bounded bytes and verify the complete BLAKE3 digest locally.

For large/range-streamed media, the TV must distinguish:

```text
backend-verified B3 manifest and service path
local full-byte verification not yet complete
local verification completed after full cached download
```

Do not label a range stream as fully client-verified unless the complete object digest has actually been checked.

### 8.4 Playback state

Continue Watching state is convenience/display state, not backend receipt or ownership truth.

Persist only:

```text
content identifier
last position
updated time
completed flag
selected audio/subtitle preferences if safe
```

Do not persist signed media URLs, raw capabilities, or unrestricted tokens.

---

## 9. Pairing and Session Model

### 9.1 Pairing UX

First-run pairing:

```text
1. TV requests a pairing challenge.
2. TV displays a QR code and short code.
3. User opens trusted desktop/mobile CrabLink.
4. Companion device reviews TV name, environment, expiry, and requested scopes.
5. Companion device approves or denies.
6. TV polls using a one-time challenge handle.
7. Backend issues a narrow device-bound session.
8. TV stores minimum session material in secure native storage.
9. TV clears challenge material.
```

### 9.2 Pairing scope

Initial session scopes:

```text
identity.read
catalog.read
content.read
entitlement.read
receipts.read
confirmed_roc.read
session.revoke_self
```

Not granted:

```text
wallet.spend
wallet.transfer
ledger.write
reward.issue
node.control
operator.admin
content.publish
capability.delegate_unbounded
```

### 9.3 Secure storage

Use native secure storage. Tauri Stronghold is a candidate because it supports Android, but it must be integrated with a TV-specific threat review and a device-local key derivation/storage strategy.

React receives only session status and redacted account display data.

React must not receive:

```text
refresh token
raw capability
private key
Stronghold password/material
pairing secret
```

### 9.4 Session lifecycle

Implement and test:

```text
challenge expiry
approval denial
poll timeout
single-use challenge
session expiry
refresh failure
remote revocation
local unpair
clock skew handling
network loss during pairing
reinstall behavior
account switch
```

---

## 10. Backend Work Required for Pairing

CrabLink TV should reuse existing content, identity, wallet-display, and receipt routes wherever possible.

New backend behavior should be limited to missing pairing/session functionality.

Likely owners:

```text
ron-proto
  strict pairing challenge/request/status/session DTOs

ron-auth
  narrow device capability/session validation

svc-passport
  challenge issuance, approval binding, device session issue/revoke

ron-policy
  allowed TV session scopes and expiry limits

svc-gateway
  public client route exposure and limits

omnigate
  typed pairing orchestration/view hydration where needed

ron-audit
  redacted pairing/session lifecycle audit records
```

Explicit non-owners:

```text
CrabLink React does not issue sessions.
CrabLink TV Rust does not self-approve pairing.
svc-wallet does not own device identity.
ron-ledger does not own pairing.
svc-storage and svc-index do not issue capabilities.
```

No backend pairing mutation is required for the first bootable-shell phases. Add pairing backend work only after remote navigation, gateway readiness, and content routing are green.

---

## 11. Receipts, Confirmed ROC, and Entitlements

### 11.1 Shared confirmed-ROC validation

The desktop app already contains a real confirmed-ROC projection validator tied to wallet/ledger receipts and accepted User Node replay.

Extract that pure validator into `crablink-native-core` before implementing TV confirmed ROC.

Both desktop and TV must execute the same validation behavior.

Confirmed ROC requires:

```text
wallet/ledger receipt source
non-zero receipt set
ledger replay confirmed
required accepted replay gates
pending-evidence-only = false
display-only client posture
no client wallet mutation
no client ledger mutation
no client finality authority
```

### 11.2 Receipt display

TV receipt records may show:

```text
operation label
content/creator label
confirmed amount
confirmed timestamp
receipt status
operation ID in abbreviated form
backend source label
```

Do not expose raw capabilities, private metadata, or unnecessary account identifiers on a shared television screen.

### 11.3 Entitlement truth

A local receipt cache may accelerate display, but it cannot unlock paid content by itself.

Every paid-content open must resolve through the backend entitlement path.

```text
local receipt cache = display hint
backend entitlement = access truth
```

---

## 12. Privacy, Policy, and Shared-Screen Safety

### 12.1 Privacy route behavior

If the approved privacy route is unavailable:

```text
do not fall back to direct provider IP
show a typed unavailable/degraded state
allow retry or return
keep content locked when entitlement cannot be confirmed
```

### 12.2 Sanctions/policy denial

The TV app must not hardcode sanctioned jurisdictions.

Canonical TOML-backed service policy remains server-owned.

The TV app displays typed denial states and must not provide a bypass or alternate direct endpoint.

### 12.3 Shared-screen redaction

A television is often visible to multiple people.

Default account surfaces should minimize:

```text
full receipt operation IDs
email addresses
private account identifiers
private creator/admin labels
exact diagnostic endpoint details
session/token details
```

Provide an optional privacy mode that hides confirmed ROC and recent purchases on the home screen while leaving them available behind an explicit account action.

---

## 13. Cache and Offline Posture

### 13.1 Alpha cache

Use a small bounded display/media cache only after online flows are green.

Cache may hold:

```text
verified thumbnails
creator avatars
hydrated public page summaries
continue-watching position
small fully B3-verified assets
bounded media segments if policy permits
```

Cache must not hold:

```text
wallet keys
raw capabilities
operator credentials
unbounded media
unverified bytes labeled verified
receipt-based entitlement authority
private pairing challenge after completion
```

### 13.2 Cache integrity

Cache entries require:

```text
canonical content ID
verification state
size
created/accessed time
profile/environment binding
expiry or revalidation policy
```

Corrupt or mismatched cache entries are deleted and re-fetched; they do not silently display.

### 13.3 Offline messaging

Alpha offline posture is truthful:

```text
public cached content may display when fully verified and policy permits
paid content remains subject to approved offline entitlement rules
receipt cache remains display-only
unavailable backend truth is shown as unavailable, not guessed
```

Do not claim trusted offline paid access until a separate offline-entitlement behavior is implemented and tested.

---

# 14. Implementation Phases

## TV Phase 0 — Phase 22 Close and Baseline Audit

### Goal

Start TV work from a known-green CrabLink desktop state and document the exact toolchain/device facts.

### Work

```text
- Finish the existing Phase 22 final acceptance runner.
- Confirm desktop build and strict Rust check remain green.
- Record Node/npm/Rust/Tauri/Java/Android SDK/NDK versions.
- Record target device Android version, ABI, resolution, WebView version, and available storage.
- Confirm ADB sees the device.
- Confirm no existing apps/crablink-tv path conflicts.
- Identify root package/workspace script changes needed for a sibling app.
```

### Focused verification

```bash
cd /Users/mymac/Desktop/crablink

npm --prefix apps/crablink-tauri run build
cargo test --manifest-path apps/crablink-tauri/src-tauri/Cargo.toml
cargo clippy --manifest-path apps/crablink-tauri/src-tauri/Cargo.toml --all-targets -- -D warnings

node --version
npm --version
rustc --version
cargo --version
npm --prefix apps/crablink-tauri run tauri -- --version
java -version
adb version
adb devices
adb shell getprop ro.build.version.release
adb shell getprop ro.product.cpu.abi
adb shell wm size
adb shell dumpsys webviewupdate
```

### Exit gate

```text
Phase 22 final acceptance is GREEN_PARKED.
Desktop Tauri remains green.
ADB identifies the TV device.
Toolchain and device facts are recorded.
```

### Forbidden scope

```text
No TV source mutation before the baseline is green.
No desktop refactor.
No Android plugin work.
```

---

## TV Phase 1 — Sibling Application Scaffold

### Goal

Create a minimal separate Tauri/React app without disturbing the desktop app.

### Work

```text
- Create apps/crablink-tv.
- Add package.json using the repository's existing npm/Tauri/Vite versions.
- Add minimal Vite/React entry.
- Add src-tauri Cargo.toml, build.rs, lib.rs, main.rs, tauri.conf.json.
- Use identifier com.rustyonions.crablink.tv.
- Create TV-specific capability file.
- Register only diagnostics/settings placeholders needed to boot.
- Add root/app scripts for tv:dev, tv:build, tv:check.
- Add a static TV shell with a visible build/profile label.
```

### Tests

```text
- package scripts parse
- React production build
- Rust cargo check/test/clippy
- boundary script proves forbidden desktop command names are absent
```

### Exit gate

```text
The TV app builds for the host Tauri target.
The desktop app still builds unchanged.
The TV invoke registry contains no node/operator/creator-authority commands.
```

---

## TV Phase 2 — Android Initialization and Launcher Proof

### Goal

Generate the Android project, configure TV launcher metadata, build a debug APK, sideload it, and launch from the TV home screen.

### Work

```text
- Run Tauri Android initialization in apps/crablink-tv.
- Review generated Gradle/Kotlin/manifest files before modification.
- Add TV launcher category.
- Add application banner and TV icon resources.
- Declare touchscreen not required.
- Declare leanback feature posture.
- Add INTERNET and ACCESS_NETWORK_STATE only as required.
- Keep cleartext disabled in the default/release path.
- Add a debug-only Android network config later when LAN HTTP is required.
- Set landscape/TV presentation behavior without overconstraining future Android versions.
```

### Commands

```bash
cd /Users/mymac/Desktop/crablink/apps/crablink-tv

npm run tauri android init
npm run tauri android build -- --apk

find src-tauri/gen/android/app/build/outputs -type f \( -name '*.apk' -o -name '*.aab' \) -print
adb install -r /absolute/path/to/generated-debug.apk
adb shell monkey -p com.rustyonions.crablink.tv -c android.intent.category.LEANBACK_LAUNCHER 1
```

### Device checks

```text
- App appears in TV launcher.
- Banner/icon render correctly.
- App launches without touch.
- Back exits or follows the current root behavior predictably.
- No crash loop.
- `adb logcat` contains no secret-bearing output.
```

### Exit gate

```text
A debug APK is installed and launchable from the TV home screen.
```

---

## TV Phase 3 — Remote Focus Foundation

### Goal

Prove deterministic remote-only navigation in a static TV shell.

### Work

```text
- Create packages/crablink-tv-ui.
- Add TvFocusRoot, TvFocusScope, TvRail, TvFocusable.
- Add key mapping for arrows, select, Back, and media play/pause.
- Add strong focus visuals.
- Add route/rail focus memory.
- Add modal focus trap and restore.
- Add scroll-into-view behavior.
- Build static Home, Account, and Settings cards.
```

### Focus tests

Use pure `node:test` tests for focus graph behavior and a browser/static test for DOM focus behavior.

Use ADB key events on-device:

```bash
adb shell input keyevent KEYCODE_DPAD_RIGHT
adb shell input keyevent KEYCODE_DPAD_DOWN
adb shell input keyevent KEYCODE_DPAD_CENTER
adb shell input keyevent KEYCODE_BACK
```

### Exit gate

```text
Every static control is reachable with remote keys.
No focus dead ends exist.
Back and focus restore work on the device.
```

---

## TV Phase 4 — Make Shared JavaScript Packages Real

### Goal

Extract the minimum platform-neutral behavior required by both desktop and TV.

### First extraction families

```text
1. crab:// parser and normalized route model
2. route labels and asset-kind mapping
3. receipt display normalization
4. gateway/settings/diagnostics adapter contracts
5. memory adapters for tests
```

### Rules

```text
- One behavior family per patch.
- Add pure unit tests before changing imports.
- Move desktop use to the shared package.
- Run desktop checks.
- Add TV use.
- Do not move desktop-only pages.
```

### Exit gate

```text
Desktop and TV use the same tested crab:// parser and core route model.
No shared package imports Chrome or Tauri APIs.
```

---

## TV Phase 5 — Shared Native Validation Core

### Goal

Create a pure Rust crate for validation used by both Tauri applications.

### Initial modules

```text
crab_url
b3
confirmed_roc
receipt
pairing_dto
error
```

### Migration order

```text
- Move confirmed-ROC projection validation from desktop into shared crate.
- Preserve existing Phase 22 test behavior.
- Move pure B3/crab validation helpers where duplication exists.
- Add TV path dependency.
- Keep Tauri commands as thin adapters.
```

### Exit gate

```text
Desktop Phase 22 confirmed-ROC tests remain green against shared code.
TV can compile the shared crate for Android.
Shared crate has no Tauri/Android dependency.
```

---

## TV Phase 6 — TV Settings and Network Profile

### Goal

Add safe TV settings and a truthful LAN/private-beta connectivity model.

### Settings

```text
environment profile
gateway display label
gateway URL in dev only or managed profile
request timeout
autoplay preference
captions preference
privacy mode
cache quota
clear local session
```

### Work

```text
- Add typed settings DTO validation in Rust.
- Add secure defaults.
- Add development-only LAN endpoint support.
- Add release HTTPS requirement.
- Add typed origin allowlist.
- Add TV diagnostics with redacted endpoint information.
- Add readiness screen and retry behavior.
```

### Exit gate

```text
TV reaches the controlled gateway from the physical box.
Release config rejects cleartext and unapproved origins.
Development profile is visibly marked.
```

---

## TV Phase 7 — TV Route Stack and `crab://` Navigation

### Goal

Build a TV-specific route registry, history stack, Back behavior, and deep-link intake.

### Work

```text
- Add supported TV route registry.
- Add route stack independent of desktop browser tabs.
- Add Back behavior: close overlay → player chrome → detail → rail → root.
- Add route focus restoration.
- Add typed not-found/problem routes.
- Add Android intent/deep-link handling only for approved crab:// input.
- Validate all incoming links before navigation.
```

Tauri mobile deep-link behavior must be tested on-device. If the standard plugin does not provide the required Android lifecycle behavior, add a narrow Kotlin plugin using Android `onNewIntent` and pass only validated URL input to Rust/React.

### Exit gate

```text
The TV can open a typed crab:// route from its own UI and from an Android intent.
Malformed or unsupported routes fail safely.
Back behavior is predictable.
```

---

## TV Phase 8 — Home Catalog and Creator Browsing

### Goal

Replace static rails with real backend-derived data.

### Home rails

```text
Continue Watching
Following
Recent Purchases
Recently Viewed
Featured/Recent public content
Creators
```

Only rails backed by real data should be shown. Empty rails should be omitted or display a truthful empty state.

### Work

```text
- Add typed catalog/view route through gateway/omnigate.
- Render TV cards with bounded image loading.
- Open creator/profile pages.
- Add loading, empty, unavailable, denied, and malformed-response states.
- Preserve focus after route return and data refresh.
```

### Exit gate

```text
Physical TV loads a real catalog from the controlled environment.
A creator page opens and returns to the originating card.
No fake catalog data is used in acceptance mode.
```

---

## TV Phase 9 — B3 Asset and Content View Proof

### Goal

Render real B3-backed image/text/article assets with truthful integrity states.

### Work

```text
- Reuse canonical crab:// and b3 validation.
- Fetch asset manifest through gateway.
- Verify small fetched bytes against full BLAKE3 digest.
- Render image and text/article views.
- Reject corrupt bytes, hash mismatch, oversized response, unsupported kind, and content-type mismatch.
- Add typed privacy-route unavailable state.
```

### Exit gate

```text
One image and one text/article asset render from real backend data.
A deliberately corrupt asset is rejected.
No direct provider fallback occurs.
```

---

## TV Phase 10 — Media Playback Proof

### Goal

Play one real video and one audio asset with a remote-only control surface.

### Work

```text
- Add TV player route and overlay.
- Prove WebView HTML media first.
- Add play/pause/seek/back/fullscreen behavior.
- Add buffering/error state.
- Add manifest/service verification labels.
- Add continue-watching persistence.
- Release media resources on route exit.
- Run 30-minute playback and repeated open/close tests.
```

### Native fallback condition

Implement Media3 plugin only if device evidence demonstrates that the WebView player cannot satisfy the required playback behavior.

### Exit gate

```text
A real video and audio item play on the target box.
Remote play/pause and seek work.
No resource leak/crash appears during repeated playback.
```

---

## TV Phase 11 — Pairing DTOs and Local Pairing UI

### Goal

Build the TV pairing state machine and UI against a deterministic local/mock adapter before backend mutation.

### Work

```text
- Define strict pairing DTOs in shared JS/Rust layers.
- Implement PairingIdle/Waiting/Approved/Denied/Expired/Cancelled/Error states.
- Display QR code and short code without embedding secrets beyond the one-time public challenge.
- Add countdown and cancel.
- Add memory adapter tests.
- Add focus-safe pairing screen.
```

### Exit gate

```text
Every pairing state is deterministic and tested.
No raw session token is rendered or logged.
```

---

## TV Phase 12 — Backend Pairing and Secure Device Session

### Goal

Connect the TV pairing state machine to real RustyOnions identity/session behavior.

### Work order

```text
ron-proto strict DTOs
→ ron-auth validation
→ svc-passport challenge/session behavior
→ ron-policy scope/expiry gates
→ gateway/omnigate routes
→ CrabLink desktop/mobile approval surface
→ CrabLink TV polling and secure storage
```

### Required tests

```text
approval happy path
denial
expiry
replay of challenge
wrong environment
wrong device binding
scope escalation
revocation
refresh failure
unpair
secret redaction
```

### Exit gate

```text
TV pairs with a trusted CrabLink device.
Session survives app restart.
Remote revocation and local unpair work.
TV has read-only scopes only.
```

---

## TV Phase 13 — Library, Receipts, and Confirmed ROC

### Goal

Show paired-user library, real receipts, and confirmed ROC using shared validation.

### Work

```text
- Add library view.
- Add recent receipt view.
- Add account summary.
- Add confirmed ROC projection validation through shared Rust crate.
- Add privacy-mode redaction.
- Add refresh and stale/unavailable states.
```

### Rejection tests

```text
pending evidence
fake source
zero receipt count
missing operation IDs
ledger replay false
user replay false
client mutation authority true
malformed amount
wrong schema/version
```

### Exit gate

```text
TV shows confirmed ROC only from a valid wallet/ledger receipt projection.
Pending or fake evidence never becomes confirmed display truth.
```

---

## TV Phase 14 — Existing Entitlement and Paid Access

### Goal

Allow playback/viewing of already-approved paid content without adding TV wallet authority.

### Work

```text
- Add entitlement-check operation.
- Add locked/entitled/expired/unavailable/denied states.
- Use backend entitlement on every paid open.
- Add companion-device approval handoff message for non-entitled content.
- Keep local receipt/cache non-authoritative.
```

### Exit gate

```text
Existing entitled content opens.
Non-entitled content remains locked.
Network/receipt/cache failure does not unlock content.
No TV spend command exists.
```

---

## TV Phase 15 — Cache, Offline, Privacy, and Policy Errors

### Goal

Add bounded verified caching and complete failure-state truth.

### Work

```text
- Add cache index and quota.
- Cache verified thumbnails/small assets.
- Add corrupt-cache eviction.
- Add offline public-content behavior.
- Add privacy-route unavailable UI.
- Add sanctions/policy-denied UI.
- Add session-expired UI.
- Add gateway degraded UI.
- Add no-direct-provider boundary test.
```

### Exit gate

```text
Offline/cached behavior is truthful.
Paid access is never granted by cache alone.
All policy/privacy failures fail closed.
```

---

## TV Phase 16 — Device Performance and Accessibility

### Goal

Prove the app is usable on the actual low-cost box, not just in a desktop browser.

### Tests

```text
cold launch measurement
warm launch measurement
home rail with realistic item count
500 synthetic D-pad events
rapid key repeat
route open/back cycles
30-minute video playback
30-minute audio playback
2-hour navigation/playback soak
network disconnect/reconnect
app background/resume
screen resolution 720p/1080p/4K where available
large text/focus visibility
TalkBack/basic accessibility review
storage pressure/cache eviction
```

### Performance posture

Record baseline memory, CPU, launch, and playback metrics first. Then add regression thresholds based on the measured target box rather than inventing desktop-class budgets.

### Exit gate

```text
No OOM, crash loop, focus lock, runaway key queue, or unreleased player appears in the device matrix.
```

---

## TV Phase 17 — Reproducible Alpha Acceptance Runner

### Goal

Create one local acceptance runner that proves the complete TV Alpha behavior.

### Runner outline

```text
1. Check desktop Phase 22 parked marker/baseline.
2. Build shared JS packages.
3. Run pure route/focus tests.
4. Build TV React app.
5. Test/clippy shared native core.
6. Test/clippy TV Tauri Rust.
7. Build Android debug APK.
8. Install/update APK over ADB.
9. Launch through LEANBACK_LAUNCHER.
10. Drive remote key smoke.
11. Confirm gateway ready.
12. Open real creator/content route.
13. Play media smoke.
14. Run pairing/session smoke.
15. Run receipt/confirmed-ROC smoke.
16. Run entitlement-denial smoke.
17. Run corrupt-B3 rejection smoke.
18. Run privacy-route unavailable smoke.
19. Print explicit GREEN_PARKED only after all gates pass.
```

Suggested scripts:

```text
scripts/check-crablink-tv-command-boundary.mjs
scripts/check-crablink-tv-route-boundary.mjs
scripts/check-crablink-tv-focus-boundary.mjs
scripts/check-crablink-tv-no-node-authority.mjs
scripts/check-crablink-tv-no-silent-spend.mjs
scripts/check-crablink-tv-receipt-truth.mjs
scripts/check-crablink-tv-no-direct-provider.mjs
scripts/check-crablink-tv-android-manifest.sh
scripts/check-crablink-tv-device-smoke.sh
scripts/check-crablink-tv-alpha-acceptance.sh
```

### Exit gate

```text
CRABLINK_TV_ALPHA_GREEN_PARKED
```

---

## TV Phase 18 — Private Beta Hardening

### Goal

Prepare a small controlled-device beta after Alpha is green.

### Work

```text
- Add release signing outside source control.
- Produce reproducible signed APK/AAB.
- Add version/update-channel policy.
- Add crash/diagnostic export with redaction.
- Add session/device management UI on companion CrabLink.
- Add multiple-TV device revocation.
- Add beta support runbook.
- Review Android target SDK and local-network permission behavior.
- Review TV app quality requirements.
- Run supply-chain and dependency audit.
- Run security review of pairing and secure storage.
```

### Exit gate

```text
Signed private-beta artifact installs cleanly.
Device pairing/revocation works across the beta environment.
No debug endpoint, cleartext exception, dev token, or broad permission remains in the beta build.
```

---

## TV Phase 19 — Store/Production Decision

This phase is deferred until private beta proves the product.

Potential later work:

```text
Google Play TV listing
store banner/icon assets
AAB upload/signing workflow
TV app quality review
content recommendations/home-screen channels
search/voice integration
native Media3 promotion if still needed
companion-approved purchase flow
mobile CrabLink pairing companion
offline entitlement design
broader codec/subtitle/audio-track support
```

This phase does not authorize public release merely because an APK builds.

---

# 15. Testing Matrix

## 15.1 Pure JavaScript

```text
crab:// parser vectors
route registry allow/deny
focus graph movement
focus restoration
Back stack
pairing state machine
receipt display normalization
settings validation
cache index behavior
```

Use Node's built-in test runner unless a larger React test framework becomes necessary.

## 15.2 React/static build

```text
production build
route chunk generation
forbidden desktop import scan
no chrome.* in shared core
no direct @tauri-apps/api in shared core
TV shell focus smoke
```

## 15.3 Rust

```text
shared native validator unit tests
serde deny_unknown_fields where DTOs are security-sensitive
B3 vectors
confirmed-ROC rejection matrix
origin allowlist
settings/profile validation
pairing DTO validation
secret redaction
```

## 15.4 Android build

```text
manifest entries
identifier
TV banner
leanback launcher
no-touch requirement
permissions
cleartext release posture
minSdk/targetSdk review
ABI output
APK install
```

## 15.5 Physical device

```text
launcher visibility
remote-only navigation
Back behavior
focus restore
LAN gateway access
pairing
media
resume/background
network loss
cache corruption
session expiry/revocation
```

## 15.6 Cross-repository

```text
real gateway catalog
real B3 object
real corrupt-object rejection
real receipt projection
real confirmed ROC
real entitlement denial
real privacy route unavailable
real policy denial
```

---

# 16. Initial File Map

Expected first files:

```text
apps/crablink-tv/
  package.json
  index.html
  vite.config.js
  src/
    main.jsx
    app/
      TvApp.jsx
      tvRouter.js
      tvRouteRegistry.js
      tvAppState.js
    pages/
      home/TvHomePage.jsx
      settings/TvSettingsPage.jsx
      problem/TvProblemPage.jsx
    styles/
      tv.css
  src-tauri/
    Cargo.toml
    build.rs
    tauri.conf.json
    tauri.android.conf.json
    capabilities/tv.json
    src/
      main.rs
      lib.rs
      state.rs
      commands/
        mod.rs
        diagnostics.rs
        settings.rs

packages/crablink-tv-ui/
  package.json
  src/
    index.js
    focus/
      focusGraph.js
      TvFocusRoot.jsx
      TvFocusScope.jsx
      TvFocusable.jsx
      useTvRemoteKeys.js
      useTvFocusMemory.js
    layout/
      TvRail.jsx
      TvCard.jsx
      TvOverlay.jsx

crates/crablink-native-core/
  Cargo.toml
  src/
    lib.rs
    error.rs
    crab_url.rs
    b3.rs
    confirmed_roc.rs
    pairing.rs
```

Generated Android files must not be guessed before `tauri android init`; inspect the generated source and patch exact files.

---

# 17. First Three Implementation Patches

## Patch 1 — TV Phase 0 audit only

```text
No source mutation.
Run Phase 22 final acceptance and toolchain/device inspection.
Record exact generated constraints before scaffolding.
```

## Patch 2 — TV Phase 1 host scaffold

```text
Create apps/crablink-tv host-buildable shell.
Add narrow Tauri registry.
Add no-node/no-operator boundary test.
Run desktop and TV host checks.
```

## Patch 3 — TV Phase 2 Android launcher proof

```text
Run Android init.
Patch exact generated manifest/resources.
Build universal debug APK.
Sideload and launch from TV home.
Drive Back/select/D-pad smoke.
```

Do not begin shared-package migration until Patch 3 proves that the chosen Tauri/Android path works on the actual box.

---

# 18. Alpha Definition of Done

CrabLink TV Alpha is complete only when all of the following are true:

```text
[ ] lives inside the existing CrabLink repository
[ ] uses a separate Tauri Android application and identifier
[ ] installs by APK on the target Android TV box
[ ] appears in the TV launcher with correct banner/icon
[ ] works entirely with D-pad/select/back
[ ] restores focus across route returns
[ ] connects to a controlled gateway from the physical TV
[ ] parses and opens supported crab:// routes
[ ] browses a real creator/catalog surface
[ ] renders a real B3-backed image or publication
[ ] rejects corrupt B3 content
[ ] plays a real video and audio asset
[ ] pairs with a trusted CrabLink companion device
[ ] stores only a narrow device-bound session securely
[ ] displays real receipt history
[ ] displays confirmed ROC only from valid wallet/ledger receipt projection
[ ] opens already-entitled paid content only after backend confirmation
[ ] does not silently spend
[ ] contains no local node or Service Node Operator commands
[ ] contains no direct-provider privacy fallback
[ ] fails closed on session, entitlement, privacy, policy, and integrity errors
[ ] passes physical-device soak and acceptance runner
[ ] prints CRABLINK_TV_ALPHA_GREEN_PARKED
```

---

# 19. Permanent Forbidden Scope Unless Separately Authorized

```text
local micronode runtime on TV
public Service Node runtime on TV
Service Node Operator Mode
reward issuance or planning
wallet private-key custody
seed phrase entry
unilateral wallet spend
silent spend
ledger mutation
fake receipts or balances
pending evidence labeled confirmed ROC
direct-provider privacy fallback
hardcoded sanctions jurisdiction lists
ROX/Solana bridge runtime
staking
liquidity
exchange-facing behavior
production deployment from a debug artifact
```

---

# 20. Default Next Action

After the current BUILD_PLAN_Z Phase 22 acceptance runner is repaired and prints its green parked result:

```text
Run TV Phase 0.
Inspect the exact CrabLink workspace and Android toolchain.
Create the smallest host-buildable apps/crablink-tv shell.
Run desktop and TV focused checks.
Initialize Android.
Build and sideload the first launcher-visible debug APK.
Fix the first demonstrated failure before expanding into shared packages or backend pairing.
```

That is the correct high-momentum starting point for CrabLink TV.

---

## Official Platform References Reviewed

```text
Tauri 2 — prerequisites, project creation, Android development, mobile plugins, permissions, Stronghold, Google Play builds
Android Developers — create and run a TV app, TV launcher/manifest requirements, D-pad navigation, focus system, controller handling
Android Developers — Media3 ExoPlayer and MediaSession for Android TV
Android Developers — network permissions, network security configuration, Android 16/17 local-network permission changes
```
