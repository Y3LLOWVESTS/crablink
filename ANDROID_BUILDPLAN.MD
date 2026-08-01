---
title: CRABLINK_ANDROID_BUILD_PLAN
version: 0.1.0
status: ready-for-implementation
last-updated: 2026-07-31
audience:
  - CrabLink app engineers
  - RustyOnions service owners
  - Passport/security reviewers
  - Android phone and tablet testers
repo-target: crablink
primary-app-target: apps/crablink-android
related-apps:
  - apps/crablink-tauri
  - apps/crablink-tv
shared-js:
  - packages/crablink-core
  - packages/crablink-platform
shared-rust:
  - crates/crablink-native-core
canonical-passport-owner:
  - RustyOnions/crates/svc-passport
platform-targets:
  - Android phones
  - Android tablets
  - foldables and resizable Android windows
follow-on-platform:
  - iOS
---

# CRABLINK_ANDROID_BUILDPLAN.md
## CrabLink Android Phone and Tablet Client

RO:WHAT — Active implementation plan for a touch-first, adaptive Tauri 2 CrabLink client for Android phones and tablets.

RO:WHY — CrabLink already has a mature desktop Tauri application, a proven Android TV/Tauri build lane, portable route/onboarding/receipt contracts, a shared Rust validation crate, and an advanced Native Passport implementation. The fastest credible Android path is therefore not a rewrite and not a direct packaging of the desktop shell. It is a narrow sibling application that reuses tested contracts and native behavior while implementing a mobile-specific shell, lifecycle, permission posture, and root-capable Passport UX.

RO:INTERACTS — `apps/crablink-android`, `apps/crablink-tauri`, `apps/crablink-tv`, `packages/crablink-core`, `packages/crablink-platform`, `crates/crablink-native-core`, `svc-passport`, `ron-proto`, `ron-auth`, `ron-kms`, `ron-naming`, `ron-policy`, `svc-gateway`, `omnigate`, `svc-storage`, `svc-index`, `svc-wallet`, `ron-ledger`, Android Keystore, Kotlin/JNI, Tauri 2 Android, Android phone/tablet lifecycle, and future iOS work.

RO:INVARIANTS — One portable Rust Passport state machine; no Kotlin Passport state machine; local wallet-like Passport custody; Android Keystore protects platform-bound material; PIN/recovery/root confirmation stay native; React receives redacted state only; separate per-device keys; gateway-first networking; verified B3 assets before trusted rendering; backend-derived entitlement/receipt/ROC truth; no node/operator authority; no direct ledger mutation; no fake balances, receipts, ownership, finality, or paid unlock.

RO:METRICS — App launch, route open, deep-link result, gateway readiness, onboarding state, Passport create/restore/unlock/lock result, proof/capability result, B3 verification result, asset cache result, playback start/failure, entitlement result, receipt refresh, lifecycle lock, process-restore result, adaptive layout class, and redacted error class. Never use raw Passport IDs, usernames, keys, nonces, capabilities, URLs, or site names as unbounded metric labels.

RO:CONFIG — Android package identity, environment profile, gateway origin, release HTTPS policy, debug LAN policy, request timeout, asset/media limits, cache quota, auto-lock policy, Passport platform-sealer profile, biometric convenience flag, screen-capture protection, feature flags, ABI targets, signing profile, and release channel.

RO:SECURITY — React owns display and user intent. Rust owns portable Passport, proof, capability, validation, B3, receipt, and confirmed-ROC review. Kotlin owns Android secure UI, Keystore operations, lifecycle callbacks, Android intents, and narrow platform integration. RustyOnions services remain authoritative for identity registration, authorization/revocation, policy, entitlements, receipts, wallet mutation, and ledger truth.

RO:TEST — Pure JS contract/model tests, React source boundaries, Rust unit tests, Kotlin compile tests, Tauri command boundaries, Android manifest/permission checks, APK/AAB integrity checks, phone/tablet adaptive tests, process-death and lifecycle tests, physical-device Passport tests, cross-device restore/revocation tests, media/resource tests, and reproducible final acceptance runners.

---

# 0. Executive Decision

## 0.1 Create a sibling Android application

Create:

```text
apps/crablink-android
```

Do not initialize Android support inside `apps/crablink-tauri` and compile the entire desktop application into the phone package.

Do not stretch `apps/crablink-tv` into a touch interface.

The correct product layout is:

```text
apps/crablink-tauri
  desktop browser/creator shell
  desktop media tooling
  local User Node and optional operator surfaces
  desktop platform sealers

apps/crablink-tv
  remote-first Android TV shell
  delegated read-only Passport posture
  D-pad focus and ten-foot media UI

apps/crablink-android
  touch-first phone/tablet shell
  adaptive compact/medium/expanded layouts
  root-capable personal Passport posture
  Android lifecycle, deep links, sharing, and native secure UI
```

Preferred application identity:

```text
npm package:
  @crablink/crablink-android

Tauri product name:
  CrabLink

Android application ID:
  com.rustyonions.crablink
```

`com.rustyonions.crablink.tv` remains reserved for the TV application.

If a different regular-Android application ID has already been published externally, the published ID becomes authoritative. Before public release, application ID permanence must be reviewed once.

## 0.2 Fast-path doctrine

The fastest safe path is:

```text
1. Boot a minimal Android APK before broad refactoring.
2. Reuse shared contracts directly.
3. Add a mobile-only command registry.
4. Build a mobile shell instead of porting desktop browser chrome.
5. Port one proven product slice at a time.
6. Reuse TV Android native patterns selectively.
7. Consume svc-passport for the real Passport state machine.
8. Test compact, medium, and expanded windows continuously.
9. Defer creator-heavy and node/operator surfaces.
10. Fix the first failure before expanding scope.
```

Wrong sequence:

```text
copy all desktop source
copy all 50 desktop Tauri commands
make desktop CSS responsive
compile
debug hundreds of unrelated mobile failures
```

Correct sequence:

```text
minimal app
→ first APK
→ mobile shell
→ public browsing
→ root-capable Passport
→ verified library/media
→ receipts/ROC/paid access
→ mobile creator-lite
→ hardening and release
```

## 0.3 Safe current label

```text
CRABLINK_ANDROID_BUILDPLAN=READY
CRABLINK_ANDROID_IMPLEMENTATION=NOT_STARTED
PRIMARY_TARGET=PHONE_AND_TABLET
UI_MODEL=TOUCH_FIRST_ADAPTIVE
PASSPORT_POSTURE=ROOT_CAPABLE_PERSONAL_DEVICE
TV_DELEGATED_ONLY_POSTURE=NOT_COPIED
DESKTOP_COMMAND_REGISTRY=NOT_COPIED
DESKTOP_TAB_SHELL=NOT_COPIED
RUSTYONIONS_MUTATION_REQUIRED_FOR_PHASE0=NO
DEFAULT_NEXT_PATCH=ANDROID_PHASE0_REUSE_AND_SCOPE_INVENTORY
```

---

# 1. Deep Source Analysis

## 1.1 Current CrabLink source size and shape

The current CrabLink codebundle contains approximately:

```text
Desktop React/JavaScript source entries: 393
Desktop Tauri Rust source entries:       55
Android TV React/JavaScript entries:    150
Android TV Tauri Rust entries:           21
Android TV Kotlin/Android entries:        21
@crablink/core entries:                   12
@crablink/platform entries:               21
crablink-native-core entries:             12
Desktop route families:                   26
Desktop public Tauri command names:       50
```

This means the mobile project is not starting from zero, but it also means a blind desktop copy would carry a large amount of unrelated authority and presentation complexity.

The desktop route registry includes:

```text
home
library
receipts
quickchain
operator
text
site
image
profile
music
lyrics
article
post
comment
video
make
stream
podcast
chat
ad
algo
code
game
asset
problem
notFound
```

The desktop shell is explicitly tab-preserving and browser-like:

```text
TopBar
BrowserTabs
address bar
Back/Forward/Home/Refresh
up to ten mounted tabs
desktop-size shell assumptions
```

The desktop Tauri configuration also begins at a 960-pixel minimum window width. That is evidence that the desktop shell itself is not the correct mobile shell.

## 1.2 High-value reusable JavaScript

`packages/crablink-core` already owns portable:

```text
crab:// parsing and normalization
typed B3 asset URL parsing
route labels and route ownership metadata
receipt display normalization
portable onboarding contract
mobile/tablet onboarding UI contract
```

The onboarding contract already declares:

```text
mobile username input = touch keyboard
tablet username input = touch or keyboard
PIN surface = platform native
recovery surface = platform native
companion device required = false
QR import required = false
```

`packages/crablink-platform` already owns contracts for:

```text
deep links
diagnostics
gateway health/profile/resolve
settings
catalog reads
receipt display reads
wallet display contract
memory/test adapters
```

These packages should be consumed directly by the Android application.

They should be expanded only when a real mobile product slice requires a missing port.

## 1.3 High-value reusable Rust

`crates/crablink-native-core` already includes:

```text
B3 validation
asset-manifest validation
confirmed ROC projection
crab:// validation
gateway-profile validation
pairing DTOs
settings profiles
TV delegated Passport pairing/authorization review
```

The RustyOnions `svc-passport::native` source now contains portable families for:

```text
authorization
capability contracts/adapters
challenge
client command DTOs
delegated enrollment
device keys
enrollment
PIN contracts
platform-bound vaults
platform storage
proof signing and verification
recovery
recovery mnemonic words/indices
replay consumption
request proof
restore
platform sealer contracts
secure surfaces
status
username projection/registry adapters
vault format
vault crypto
```

This is the canonical state-machine foundation for regular Android.

The Android application must not implement a second identity/vault/proof model in Kotlin.

## 1.4 High-value Android TV groundwork

The TV build proves the repository can already:

```text
initialize and retain an owned Tauri Android project
build Rust for Android
compile Kotlin and Gradle
produce and inspect APKs
use a project-local Tauri CLI in BuildTask
enable edge-to-edge
receive crab:// Android intents
queue bounded intent handoff
use Android Keystore AES-GCM sealing
use AtomicFile and noBackupFilesDir
show native PIN prompts
keep PINs out of WebView
zeroize Java and Rust secret buffers
use one-use verified tickets
fail closed on pause/stop/destroy
contain JNI panic/pending-exception failures
package reviewed native and DEX markers
```

These are reusable patterns.

They are not reusable product semantics.

The TV is delegated and read-only. A personal phone/tablet is normally root-capable after local creation or restore.

## 1.5 Desktop Passport groundwork

The desktop app already exposes fixed, no-secret-argument commands:

```text
passport_status
passport_create
passport_lock
passport_unlock_operational
passport_unlock_root
passport_recovery_ceremony
passport_clear
```

The desktop React adapter:

```text
uses fixed command names
accepts no PIN argument
accepts no recovery words
normalizes redacted DTOs
forces secret-shaped output to ABSENT or REDACTED
```

The regular Android app should preserve these command semantics wherever platform behavior is identical.

Android-specific commands should be added only for genuinely Android-specific behavior such as:

```text
Android share sheet
document picker
biometric convenience
screen-security state
window/adaptive information
notification permission posture
```

## 1.6 Features that must not be copied from desktop

Do not copy into the Android command allowlist:

```text
local_node_start
local_node_stop
local_node_restart
service_node_operator_status
desktop local stream session control
desktop file-path registration
desktop media export chunk pipeline
desktop video probing/transcoding jobs
QuickChain engineering routes
operator moderation/persistence tools
raw arbitrary gateway request
```

Do not copy into the first mobile route registry:

```text
operator
quickchain
make
ad creator
algo creator
code creator
game creator
desktop local stream studio
```

## 1.7 Features that should be adapted, not copied unchanged

Adapt:

```text
HomePage
ProfilePage
SitePage
LibraryPage
ReceiptsPage
AssetPage
ImagePage
Article/Text pages
VideoPage
MusicPage
PodcastPage
Stream consumer page
Passport drawer/status
onboarding steps
```

The data models and adapters are more reusable than the desktop JSX hierarchy and CSS.

## 1.8 Core architectural conclusion

The project has enough reusable substrate to make Android substantially faster than the TV build or desktop migration.

The main new work is:

```text
mobile shell
adaptive layouts
mobile route stack
Android Back/deep links
root-capable Android Passport bridge
mobile lifecycle/process restore
phone/tablet acceptance
Android packaging and permissions
```

The project does not need:

```text
a new network protocol
a new Passport protocol
a new B3 verifier
a new receipt model
a new onboarding state machine
a new gateway architecture
a copy of the desktop operator/node stack
```

---

# 2. Product Definition

## 2.1 What CrabLink Android is

CrabLink Android is the personal touch-first CrabLink application for:

```text
phones
small tablets
large tablets
foldables
resizable Android windows
ChromeOS-style Android windows where supported
external keyboards and pointing devices
```

The same APK should adapt to available window size.

Do not create separate phone and tablet applications.

## 2.2 Personal-device Passport posture

Regular Android is normally a personal, root-capable device.

After create or restore it may hold:

```text
encrypted recovery-root compartment
separate random device key
root-signed device authorization
device-bound narrow capability material
local PIN/passcode protection
optional biometric convenience gate
redacted public Passport status
```

It must still use the device key for routine proof operations.

The root must remain rare-use authority.

The app must also support a delegated-device mode for users who intentionally enroll the device without restoring the root, but that is an explicit alternative, not the default Android identity model.

## 2.3 Mobile beta route scope

### Required consumer/identity routes

```text
crab://home
crab://profile
crab://profile/<handle>
crab://library
crab://receipts
crab://settings
crab://passport
crab://<site-name>
crab://<hash>.image
crab://<hash>.article
crab://<hash>.text
crab://<hash>.video
crab://<hash>.music
crab://<hash>.podcast
crab://<hash>.stream
```

### Beta creator-lite routes

```text
profile edit
basic post/article draft and publish
comment/reply
image selection/upload
basic media selection/upload where backend path is already proven
chat read/reply when its backend route is ready
```

### Deferred routes/surfaces

```text
crab://make full editor
desktop-grade video timeline editor
local transcoding
desktop live-stream studio
Service Node Operator Mode
User Node controls
QuickChain engineering UI
ROX/Solana bridge
staking
liquidity
exchange-facing behavior
ad/algo/code/game creator workbenches
arbitrary plugin or facet execution
```

## 2.4 Mobile beta navigation

Compact width:

```text
bottom navigation:
  Home
  Explore
  Library
  Passport
  More
```

Medium width:

```text
navigation rail
single primary pane
optional temporary detail sheet
```

Expanded width:

```text
navigation rail
list/feed pane
detail pane
optional supporting pane
```

The UI must react to the current app window, not a hardcoded `isTablet` flag.

---

# 3. Architecture

## 3.1 Proposed folder layout

```text
apps/crablink-android/
├── package.json
├── index.html
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── app/
│   │   ├── AndroidApp.jsx
│   │   ├── AndroidAppContext.jsx
│   │   ├── androidRouteRegistry.js
│   │   └── androidRouteStack.js
│   ├── adapters/
│   │   ├── androidPlatform.js
│   │   ├── androidPassportAdapter.js
│   │   ├── androidGatewayAdapter.js
│   │   ├── androidCatalogAdapter.js
│   │   ├── androidAssetAdapter.js
│   │   ├── androidReceiptsAdapter.js
│   │   └── androidMediaAdapter.js
│   ├── layout/
│   │   ├── windowClass.js
│   │   ├── AndroidShell.jsx
│   │   ├── CompactNavigation.jsx
│   │   ├── MediumNavigation.jsx
│   │   ├── ExpandedNavigation.jsx
│   │   ├── ListDetailLayout.jsx
│   │   └── android-shell.css
│   ├── onboarding/
│   ├── passport/
│   ├── pages/
│   ├── media/
│   ├── library/
│   ├── sharing/
│   └── styles/
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── tauri.android.conf.json
    ├── capabilities/
    ├── src/
    │   ├── lib.rs
    │   ├── commands/
    │   ├── passport_android_*.rs
    │   ├── android_lifecycle.rs
    │   ├── android_deep_link.rs
    │   └── android_share.rs
    └── gen/android/
```

Do not create `packages/crablink-mobile-ui` in Phase 0.

Keep mobile UI primitives local until at least three coherent reusable primitives exist and extraction reduces real duplication.

## 3.2 JavaScript ownership

```text
@crablink/core
  portable parsing, labels, onboarding, receipt display

@crablink/platform
  portable port contracts

apps/crablink-android/src
  mobile route registry
  adaptive presentation
  touch interaction
  mobile product composition
```

## 3.3 Rust ownership

```text
svc-passport::native
  portable secret-bearing Passport/vault/proof state machine

crablink-native-core
  non-secret shared validation and display projection

apps/crablink-android/src-tauri
  Android app orchestration
  command registry
  gateway transport
  platform bridge ownership
  lifecycle integration
```

Do not move secret-bearing Passport implementation into `crablink-native-core`.

## 3.4 Kotlin ownership

Kotlin may own:

```text
Android Keystore calls
native PIN/passcode entry
native recovery display/input
native root confirmation
biometric prompt convenience
Android intents
Back/lifecycle callbacks
screen-security flags
document picker/share sheet
narrow platform DTO transport
```

Kotlin must not own:

```text
Passport ID derivation
recovery-to-root derivation
vault format
vault crypto
device authorization rules
proof transcript construction
capability acceptance
username authority
wallet or ledger truth
```

## 3.5 Mobile plugin versus direct JNI

Initial implementation should reuse the proven direct JNI/Kotlin boundary because it is already compile-tested in the repository.

Do not block the first APK on a broad plugin extraction.

After the mobile Passport create/restore path is green, evaluate extracting common Android primitives into a narrow Tauri mobile plugin or shared Android library:

```text
Keystore sealing
secure PIN prompt
secure recovery surface
biometric convenience
lifecycle fail-close
```

Extraction is justified only if it preserves current tests and reduces duplication between TV and regular Android.

---

# 4. Adaptive Phone and Tablet Design Contract

## 4.1 Window classes

Use these mobile webview layout classes:

```text
compact:
  width < 600 CSS px

medium:
  600 <= width < 840 CSS px

expanded:
  840 <= width < 1200 CSS px

large:
  1200 <= width < 1600 CSS px

extra_large:
  width >= 1600 CSS px
```

Width and height are both relevant.

Compact-height landscape must not blindly use a two-pane layout merely because width is medium.

The app must update layout class when:

```text
orientation changes
split-screen changes
freeform window resizes
foldable posture changes available space
keyboard changes viewport
external display/window size changes
```

## 4.2 Implementation strategy

Use:

```text
ResizeObserver
window.visualViewport where available
CSS media/container queries
one centralized windowClass model
safe-area CSS variables
optional native insets/window facts
```

Do not scatter `window.innerWidth` checks across pages.

## 4.3 Compact behavior

```text
one main pane
bottom navigation
full-screen route details
modal sheets for secondary actions
sticky compact media controls
single-column onboarding
touch targets at least mobile-accessible size
no hover-only information
```

## 4.4 Medium behavior

```text
navigation rail
wider cards and feeds
optional list + transient detail
two-column profile/settings where useful
keyboard-aware forms
```

## 4.5 Expanded/tablet behavior

```text
persistent navigation rail
list-detail layouts
supporting pane for Passport/receipt/context facts
larger media presentation
persistent queue/library pane where useful
keyboard and pointer affordances
no stretched phone column centered in empty space
```

## 4.6 Orientation and multi-window

Do not lock the main app to portrait.

Support:

```text
phone portrait
phone landscape
tablet portrait
tablet landscape
split screen
freeform/resizable window
foldable cover and inner displays
```

Secret native surfaces may choose a constrained orientation only if security/usability testing proves it necessary.

---

# 5. Mobile Tauri Command Boundary

## 5.1 Initial command registry

Begin with a narrow registry such as:

```text
app_diagnostics
read_settings
write_settings
health_check_gateway
ready_check_gateway
resolve_crab_url_gateway
catalog_read
asset_manifest_check
asset_fetch_verified
passport_status
passport_create
passport_lock
passport_unlock_operational
passport_unlock_root
passport_recovery_ceremony
passport_clear
```

Add restore/import/export only in their dedicated phase.

Preserve existing generic Passport command names when semantics match desktop.

## 5.2 Explicitly absent

```text
local_node_*
service_node_operator_*
quickchain_*
media_make_export_*
start_local_stream_session
desktop file-path registration
shell/process/eval
arbitrary URL fetch
raw secret export
raw capability export
wallet direct mutation
ledger direct mutation
```

## 5.3 Plugin rule

Every Tauri plugin must have:

```text
one product requirement
confirmed Android support
minimum permission scope
one boundary test
one physical-device acceptance step
```

Do not copy desktop plugins wholesale.

---

# 6. Networking and Deep Links

## 6.1 Gateway-first rule

The Android app talks through:

```text
CrabLink Android
→ svc-gateway
→ omnigate
→ reviewed RustyOnions service routes
```

It must not directly call:

```text
svc-storage
svc-index
svc-wallet
ron-ledger
micronode admin
macronode admin
provider IPs
```

## 6.2 Environment profiles

```text
android-dev-lan
  explicit LAN host
  debug-only cleartext exception when required
  visible development label
  short bounded timeouts

private-beta
  authenticated HTTPS
  approved environment identity
  no arbitrary origin editing by default

release
  HTTPS only
  reviewed origin allowlist
  no dev Passport/session shortcuts
  no cleartext fallback
```

## 6.3 Deep links

Support:

```text
crab://...
```

Register the scheme statically in Android configuration.

Preferred first implementation:

```text
official Tauri deep-link plugin
→ shared parser
→ mobile route registry
```

Fallback if the plugin does not satisfy the required launch/resume behavior:

```text
port the proven bounded MainActivity intent queue from CrabLink TV
```

In either case:

```text
deep link = navigation input only
deep link != authorization
deep link != paid entitlement
deep link != Passport command
deep link != wallet action
```

## 6.4 Android Back priority

```text
1. Close top modal/dialog/sheet.
2. Close nested detail or media overlay.
3. Pop mobile route stack.
4. Allow system Back-to-home.
```

Do not trap Back at the root route.

Support predictive Back without blocking the system’s root animation.

---

# 7. Passport Security Contract

## 7.1 Root-capable Android device

Create/restore flow:

```text
native recovery entropy or native recovery import
→ svc-passport canonical root derivation
→ canonical Passport ID
→ random per-device key
→ root-signed device authorization
→ two encrypted compartments
→ Android Keystore platform sealing
→ locked startup
```

## 7.2 Device separation

Required:

```text
same recovery phrase = same Passport ID
different Android devices = different device keys
different devices = different vault ciphertext
different PINs allowed per device
revocation can target one device
```

## 7.3 PIN/passcode

PIN is:

```text
device-local
not sent to server
not the Passport ID source
not a cloud password
not stored in React
not passed as a Tauri argument
```

Kotlin collects the PIN.

Rust/`svc-passport` owns PIN/vault cryptographic semantics.

Do not reuse the TV delegated PIN verifier as the root-vault KDF.

The TV verifier is a useful secure-UI/ticket pattern, not the canonical root-capable mobile vault algorithm.

## 7.4 Recovery surface

Recovery phrase creation/import must use a native secure surface.

React receives only:

```text
shown
acknowledged
restored
redacted fingerprint/checksum
typed error
```

React never receives:

```text
words
entropy
seed
root private key
vault key
```

## 7.5 Android storage

Use:

```text
Android Keystore non-exportable wrapping/sealing key
app-private no-backup files
atomic file replacement
authenticated versioned envelopes
rollback/corruption detection
bounded records
```

Initial application posture:

```text
cloud backup of Passport material = forbidden
Auto Backup of secret-bearing app state = disabled
```

Public preferences may be reconsidered later, but secret material must never enter cloud backup.

## 7.6 Screen capture and visibility

Apply screenshot/screen-recording protection to:

```text
recovery phrase display
recovery import
PIN entry
root confirmation
private device-management confirmation
Passport export/import secret steps
```

Do not assume global full-app screenshot blocking is necessary.

## 7.7 Biometrics

Biometric unlock is optional convenience after the PIN baseline is green.

It must:

```text
unlock a device-local gate
remain revocable by local policy
fall back to PIN/passcode
never replace recovery
never become network identity
never export platform biometric material
```

---

# 8. Build and Test Strategy

## 8.1 ABI strategy

Fast lane:

```text
first physical-device target = aarch64
emulator target when needed = x86_64
armv7 = only when a real target requires it
```

Do not begin with a massive all-ABI universal artifact if a single target proves the integration faster.

Release can produce:

```text
AAB with required ABI splits
or reviewed APK set for private beta
```

## 8.2 Android SDK posture

Begin from the already working repository posture:

```text
minSdk = 24
targetSdk = 36
Java = 17
Tauri 2 Android
```

Review target SDK and Play requirements again at public release.

## 8.3 Build lanes

Planned commands:

```bash
npm --prefix apps/crablink-android run build

cargo check \
  --manifest-path \
  apps/crablink-android/src-tauri/Cargo.toml

cargo clippy \
  --manifest-path \
  apps/crablink-android/src-tauri/Cargo.toml \
  --all-targets \
  -- \
  -D warnings

npm --prefix apps/crablink-android run tauri -- \
  android build \
  --debug \
  --target aarch64 \
  --apk \
  --ci
```

Add focused root scripts:

```text
android:dev
android:build
android:check
android:android:build:debug:aarch64
android:android:apk:check
android:codebundle:check
```

## 8.4 Verification tiers

### Tier A — pure/host

```text
JS model tests
source boundaries
React build
Rust unit tests
cargo check
strict Clippy
Kotlin syntax/compile
```

### Tier B — packaged artifact

```text
APK ZIP integrity
package identity
version
min/target SDK
ABI
signature
alignment
permissions
intent filters
native library presence
DEX/native markers
```

### Tier C — physical phone

```text
install
launch
Back
deep links
rotation
keyboard
Passport native surfaces
background/resume
process death
media
share sheet
permissions
```

### Tier D — physical tablet/resizable window

```text
medium width
expanded width
portrait
landscape
split screen
keyboard/mouse
list-detail behavior
state preservation
```

Never convert Tier A/B success into a Tier C/D claim.

---

# 9. Milestones

## Milestone A — Bootable Android foundation

Phases:

```text
0–2
```

Output:

```text
minimal sibling app
owned Android project
first aarch64 APK
manifest and artifact checks
```

## Milestone B — Adaptive public CrabLink browser

Phases:

```text
3–6
```

Output:

```text
phone/tablet shell
mobile route stack
crab:// deep links
gateway readiness
home/catalog/profile/site browsing
```

## Milestone C — Root-capable mobile Passport

Phases:

```text
7–10
```

Output:

```text
create
recovery
PIN
restore/import/export
device authorization
proof/capability
lifecycle lock
```

## Milestone D — Verified content and economic display

Phases:

```text
11–14
```

Output:

```text
verified library
media playback
receipts
confirmed ROC
paid entitlement
creator-lite and sharing
```

## Milestone E — Phone/tablet private beta

Phases:

```text
15–18
```

Output:

```text
process-death resilience
tablet differentiation
security/performance hardening
AAB/APK acceptance
physical phone/tablet matrix
```

---

# 10. Phase Plan

## Android Phase 0 — Reuse, Authority, and Scope Inventory

### Goal

Freeze exactly what is reused, adapted, and excluded before runtime mutation.

### Work

```text
- Add this buildplan to the repository.
- Inventory desktop routes, page owners, adapters, and Tauri commands.
- Inventory TV Android/Kotlin/JNI primitives.
- Inventory portable svc-passport native surfaces.
- Create a mobile route matrix.
- Create a mobile command allowlist proposal.
- Classify every source family:
    reuse directly
    adapt
    extract later
    exclude
- Add source tests proving:
    no Android app exists yet
    desktop command registry will not be copied wholesale
    TV Leanback/focus code is not the mobile shell
    mobile uses shared onboarding contract
```

### No behavior change

```text
ANDROID_SOURCE_MUTATED=NO
RUSTYONIONS_MUTATED=NO
APK_BUILT=NO
```

### Acceptance

```text
ANDROID_PHASE0_REUSE_AND_SCOPE_INVENTORY=GREEN
MOBILE_ROUTE_MATRIX=FROZEN
MOBILE_COMMAND_BOUNDARY=PROPOSED
DESKTOP_DIRECT_PORT=REJECTED
SIBLING_APP_DECISION=LOCKED
NEXT_PHASE=ANDROID_PHASE1_MINIMAL_TAURI_APP_AND_FIRST_APK
```

---

## Android Phase 1 — Minimal Tauri App and First APK

### Goal

Prove a new Android sibling application boots before importing product complexity.

### Work

```text
- Create apps/crablink-android.
- Add minimal Vite/React shell.
- Add minimal Tauri Rust host.
- Depend on @crablink/core and @crablink/platform.
- Add app_diagnostics only.
- Initialize Tauri Android.
- Preserve owned gen/android source.
- Repair BuildTask to project-local Tauri CLI if generator repeats TV issue.
- Use edge-to-edge.
- Add standard launcher activity.
- Do not require Leanback.
- Do not lock orientation.
- Add Internet permission only.
- Add debug LAN cleartext as a debug-only configuration.
- Build aarch64 debug APK.
```

### UI

```text
CrabLink
Android foundation
phone/tablet adaptive target
gateway not configured
Passport not connected
```

No fake success.

### Acceptance

```text
ANDROID_PHASE1_MINIMAL_APP=GREEN
ANDROID_REACT_BUILD=GREEN
ANDROID_HOST_CARGO_CHECK=GREEN
ANDROID_KOTLIN_COMPILE=GREEN
ANDROID_AARCH64_APK=GREEN
DESKTOP_COMMANDS_COPIED=NO
TV_LEANBACK_MANIFEST_COPIED=NO
NEXT_PHASE=ANDROID_PHASE2_ANDROID_PROJECT_HARDENING
```

---

## Android Phase 2 — Android Project Hardening and Artifact Lane

### Goal

Make Android builds reproducible and inspectable.

### Work

```text
- Add Android manifest boundary.
- Add APK checker.
- Add package/version/SDK checks.
- Add ABI inspection.
- Add signing and alignment checks.
- Add permission allowlist.
- Add debug/private-beta/release config separation.
- Add release cleartext denial.
- Add app backup/data-extraction posture.
- Add file-provider only if required.
- Add codebundle inclusion for owned Android source.
- Add physical launch acceptance runner.
```

### Permission baseline

```text
INTERNET
```

No camera, microphone, notification, broad storage, contacts, location, Bluetooth, accessibility, overlay, package-install, shell, or nearby-device permission in this phase.

### Acceptance

```text
ANDROID_PHASE2_PROJECT_AND_ARTIFACT_LANE=GREEN
APK_INTEGRITY=GREEN
PERMISSION_ALLOWLIST=GREEN
RELEASE_CLEARTEXT=FORBIDDEN
SECRET_BACKUP=FORBIDDEN
PHYSICAL_DEVICE_EXECUTION=SEPARATE
NEXT_PHASE=ANDROID_PHASE3_SHARED_MOBILE_CONTRACTS
```

---

## Android Phase 3 — Shared Mobile Contracts and Narrow Adapters

### Goal

Create one portable vocabulary before building screens.

### Work

Extend `@crablink/platform` only as needed with:

```text
Passport port
asset-manifest port
verified-asset fetch port
media playback port
confirmed-ROC display port
entitlement port
share/document port
lifecycle/window-profile port
```

Add:

```text
memory/test adapters
Android Tauri adapters
exact DTO normalization
secret-shaped-field rejection
typed redacted errors
```

Keep the command registry narrow.

### Acceptance

```text
ANDROID_PHASE3_SHARED_CONTRACTS=GREEN
CORE_TESTS=GREEN
PLATFORM_TESTS=GREEN
MEMORY_ADAPTER_TESTS=GREEN
RAW_INVOKE_OUTSIDE_PLATFORM=ABSENT
ARBITRARY_URL_PORT=ABSENT
SECRET_FIELDS=REJECTED
NEXT_PHASE=ANDROID_PHASE4_ADAPTIVE_SHELL
```

---

## Android Phase 4 — Adaptive Shell and Navigation

### Goal

Build the real phone/tablet shell.

### Work

```text
- Add centralized window-class model.
- Add compact bottom navigation.
- Add medium navigation rail.
- Add expanded list-detail layout.
- Add global modal/sheet/toast hosts.
- Add safe-area and edge-to-edge styles.
- Add touch and keyboard interaction.
- Add font scaling and reduced-motion posture.
- Add compact-height landscape rules.
- Remove dependency on hover.
- Keep one active route surface.
```

Do not add desktop tabs.

### Required test widths

```text
360
412
599
600
720
839
840
1024
1200
1600
```

Also test compact-height landscape.

### Acceptance

```text
ANDROID_PHASE4_ADAPTIVE_SHELL=GREEN
PHONE_COMPACT_LAYOUT=GREEN
TABLET_MEDIUM_LAYOUT=GREEN
TABLET_EXPANDED_LAYOUT=GREEN
ORIENTATION_LOCK=ABSENT
DESKTOP_TABS=ABSENT
HOVER_ONLY_ACTIONS=ABSENT
NEXT_PHASE=ANDROID_PHASE5_ROUTING_DEEP_LINKS_AND_BACK
```

---

## Android Phase 5 — Mobile Routing, Deep Links, and Back

### Goal

Create deterministic mobile navigation.

### Work

```text
- Reuse @crablink/core parser and route metadata.
- Add mobile route allowlist.
- Add bounded route stack.
- Add modal/detail/route Back priority.
- Register crab:// statically.
- Add cold-start and warm-start deep-link intake.
- Reject malformed/oversized links.
- Add duplicate intent suppression where needed.
- Add predictive Back-compatible system exit.
- Preserve route state across configuration changes.
```

### Acceptance

```text
ANDROID_PHASE5_ROUTING_AND_DEEP_LINKS=GREEN
SHARED_CRAB_PARSER_REUSED=YES
MOBILE_ROUTE_ALLOWLIST=ENFORCED
COLD_START_DEEP_LINK=GREEN
WARM_START_DEEP_LINK=GREEN
BACK_ROOT_TRAPPED=NO
DEEP_LINK_AUTHORITY=NONE
NEXT_PHASE=ANDROID_PHASE6_PUBLIC_BROWSING_BASELINE
```

---

## Android Phase 6 — Gateway, Home, Catalog, Profile, and Site

### Goal

Deliver a useful public browsing application before Passport complexity.

### Work

```text
- Gateway profile/readiness.
- Settings/preferences.
- Home catalog.
- Creator browse.
- Creator profile.
- Site resolution.
- Public image/article/text projection.
- Loading, offline, retry, empty, and typed error states.
- Compact feed and tablet list-detail layouts.
- Optional search only after browse is green.
```

Reuse:

```text
desktop route/page models
TV catalog and creator models
shared route metadata
shared gateway/catalog ports
```

### Acceptance

```text
ANDROID_PHASE6_PUBLIC_BROWSING=GREEN
HOME_CATALOG=GREEN
CREATOR_PROFILE=GREEN
SITE_RESOLUTION=GREEN
PHONE_NAVIGATION=GREEN
TABLET_LIST_DETAIL=GREEN
GATEWAY_FIRST=YES
PASSPORT_REQUIRED_FOR_PUBLIC_CONTENT=NO
NEXT_PHASE=ANDROID_PHASE7_ROOT_CAPABLE_PASSPORT_FOUNDATION
```

This is the first usable anonymous CrabLink Android milestone.

---

## Android Phase 7 — Root-Capable Passport Native Foundation

### Goal

Connect the canonical Native Passport state machine to Android protection and secure UI.

### Work

```text
- Pin exact svc-passport revision.
- Add Android platform-sealer adapter.
- Add atomic no-backup vault storage.
- Add native PIN/passcode surface.
- Add native recovery display/import surface.
- Add native root confirmation.
- Add lifecycle lock callbacks.
- Add secure-screen protection for secret surfaces.
- Add redacted JNI/Tauri DTOs.
- Add status/create/lock/unlock/recovery/clear command wiring.
- Keep app startup locked.
- Keep Kotlin free of Passport state-machine logic.
```

### Important rule

Do not port the TV delegated verifier as the root-vault cryptographic implementation.

Reuse only:

```text
Keystore operation patterns
native prompt patterns
ticket/zeroization patterns
JNI panic/exception handling
lifecycle fail-close patterns
```

### Acceptance

```text
ANDROID_PHASE7_PASSPORT_NATIVE_FOUNDATION=GREEN
ROOT_CAPABLE_DEVICE=SUPPORTED
ANDROID_KEYSTORE=CONNECTED
NO_BACKUP_VAULT_STORAGE=CONNECTED
PIN_IN_WEBVIEW=NO
RECOVERY_WORDS_IN_WEBVIEW=NO
KOTLIN_PASSPORT_STATE_MACHINE=ABSENT
STARTUP_STATE=LOCKED
NEXT_PHASE=ANDROID_PHASE8_MOBILE_ONBOARDING_CREATE
```

---

## Android Phase 8 — Mobile Onboarding and Passport Create

### Goal

Reuse the frozen onboarding state machine for a complete first-run Android flow.

### Flow

```text
Welcome
→ username
→ availability
→ create local Passport
→ native recovery ceremony
→ native PIN setup
→ optional profile
→ complete
→ crab://home
```

### Work

```text
- Consume @crablink/core onboarding contract.
- Add mobile onboarding storage for redacted progress only.
- Add compact and tablet onboarding layouts.
- Connect createNativePassport with no arguments.
- Add native recovery acknowledgement.
- Add native PIN setup.
- Add profile save/skip.
- Add startup unlock gate.
- Add clear/reset.
- Fix profile handoff so chosen username/profile route is coherent.
```

Known desktop issue to avoid:

```text
onboarding completes
but profile page requires manual username route entry
```

Android completion must establish the redacted local profile context and route coherently.

### Acceptance

```text
ANDROID_PHASE8_ONBOARDING_CREATE=GREEN
CLEAN_INSTALL_STARTS_ON_ONBOARDING=YES
PASSPORT_CREATED_LOCKED=YES
RECOVERY_NATIVE_ONLY=YES
PIN_NATIVE_ONLY=YES
PROFILE_HANDOFF_COHERENT=YES
RESTART_UNLOCK_REQUIRED=YES
DEV_IDENTITIES_VISIBLE=NO
NEXT_PHASE=ANDROID_PHASE9_RESTORE_IMPORT_EXPORT_AND_DEVICES
```

---

## Android Phase 9 — Restore, Import/Export, and Device Management

### Goal

Make Android a complete personal Passport device.

### Work

```text
- Native recovery phrase restore.
- Encrypted Passport file import.
- Encrypted Passport file export.
- Default export name: passport.dat.
- Android document picker integration.
- Root-capable restore.
- Optional delegated enrollment.
- Device inventory.
- Self-revocation.
- Root-confirmed other-device revocation.
- Reinstall/device-loss recovery tests.
- Reject duplicate/corrupt/rollback envelopes.
```

The exported file must not be a plaintext seed or raw key dump.

### Acceptance

```text
ANDROID_PHASE9_RESTORE_AND_DEVICE_MANAGEMENT=GREEN
PASSPORT_DAT_EXPORT=ENCRYPTED
PASSPORT_DAT_IMPORT=GREEN
RECOVERY_PHRASE_RESTORE=NATIVE_ONLY
SAME_PHRASE_SAME_PASSPORT_ID=YES
NEW_DEVICE_NEW_DEVICE_KEY=YES
NEW_DEVICE_NEW_CIPHERTEXT=YES
RAW_PRIVATE_KEY_EXPORT=NO
NEXT_PHASE=ANDROID_PHASE10_PROOF_CAPABILITY_AND_REVOCATION
```

---

## Android Phase 10 — Proof, Capability, Username, and Revocation

### Goal

Connect the unlocked Android device to real RustyOnions authorization.

### Work

```text
- Challenge request/validation.
- Device-signed proof.
- Replay rejection.
- Request proof.
- Device-bound capability.
- Scope/audience/environment binding.
- Capability refresh.
- Expiry.
- Revocation.
- Root-required username/device operations.
- Redacted status projection.
- Fixed gateway/omnigate routes only.
```

### Acceptance

```text
ANDROID_PHASE10_PROOF_AND_CAPABILITY=GREEN
REPLAY_REJECTED=YES
EXPIRED_AUTHORITY_REJECTED=YES
REVOKED_DEVICE_REJECTED=YES
SCOPE_ALLOWLIST=ENFORCED
RAW_CAPABILITY_TO_REACT=NO
ROOT_REQUIRED_OPERATIONS=NATIVE_CONFIRMED
NEXT_PHASE=ANDROID_PHASE11_VERIFIED_LIBRARY_AND_ASSETS
```

This closes the Android implementation portion of the Native Passport Phase 17 device model, but not the full Android+iOS Phase 17.

---

## Android Phase 11 — Library and Verified Assets

### Goal

Reuse the TV’s strongest verified-content work in a touch-first library.

### Work

```text
- Library list/detail.
- Manifest fetch.
- Fixed reviewed gateway path.
- B3 verification.
- Corrupt/mismatched rejection.
- Verified image rendering.
- Verified article/text rendering.
- Object URL/local asset-handle lifecycle.
- Bounded bytes.
- Cache quota.
- Source labels.
- Entitlement recheck before paid render.
- Tablet list-detail presentation.
```

Do not transfer large full-file blobs through command results.

### Acceptance

```text
ANDROID_PHASE11_VERIFIED_LIBRARY=GREEN
B3_VERIFY_BEFORE_TRUSTED_RENDER=YES
CORRUPT_BYTES_REJECTED=YES
RAW_LARGE_BYTES_TO_REACT=NO
OBJECT_URL_RESOURCE_RELEASE=GREEN
CACHE_ENTITLEMENT_AUTHORITY=NO
PHONE_LIBRARY=GREEN
TABLET_LIBRARY_LIST_DETAIL=GREEN
NEXT_PHASE=ANDROID_PHASE12_MEDIA_PLAYBACK_AND_LIFECYCLE
```

---

## Android Phase 12 — Media Playback and Lifecycle

### Goal

Deliver verified video, audio, podcast, and stream consumption.

### First implementation

Use the Android WebView/HTML media path first.

Measure:

```text
H.264/AAC
audio
range requests
seek
fullscreen
rotation
headset changes
audio focus
incoming interruption
screen lock
background/resume
long playback
resource release
```

Add a narrow Media3 plugin only if measured WebView limitations justify it.

### Work

```text
- Verified source handoff.
- Video/audio/podcast/stream consumer surfaces.
- Continue Watching.
- Error/retry truth.
- Resource release.
- Audio focus.
- Background policy.
- Compact and tablet controls.
- No silent paid action from autoplay/preload.
```

### Acceptance

```text
ANDROID_PHASE12_MEDIA=GREEN
WEBVIEW_MEDIA_PATH=MEASURED
MEDIA3_FALLBACK=ONLY_IF_REQUIRED
VERIFIED_SOURCE_LABEL=VISIBLE
AUTOPLAY_SPEND=NO
BACKGROUND_DAEMON=NO
RESOURCE_RELEASE=GREEN
PHONE_MEDIA=GREEN
TABLET_MEDIA=GREEN
NEXT_PHASE=ANDROID_PHASE13_RECEIPTS_ROC_AND_PAID_ACCESS
```

---

## Android Phase 13 — Receipts, Confirmed ROC, and Paid Access

### Goal

Bring backend-confirmed economic display and explicit paid access to mobile.

### Work

```text
- Receipt list/display.
- Confirmed ROC projection.
- Wallet/account display status.
- Entitlement checks.
- Explicit spend confirmation.
- Failure/cancel does not unlock.
- Receipt refresh after confirmed action.
- Cache remains display-only.
- Redacted source labels.
```

### Acceptance

```text
ANDROID_PHASE13_RECEIPTS_ROC_PAID_ACCESS=GREEN
RECEIPTS_BACKEND_DERIVED=YES
CONFIRMED_ROC_BACKEND_DERIVED=YES
EXPLICIT_CONFIRMATION_REQUIRED=YES
CANCEL_MUTATION=NO
FAILURE_UNLOCK=NO
CACHE_ENTITLEMENT=NO
DIRECT_LEDGER_MUTATION=NO
NEXT_PHASE=ANDROID_PHASE14_CREATOR_LITE_AND_ANDROID_INTEGRATION
```

This is the core consumer/private-beta gate.

---

## Android Phase 14 — Creator-Lite, Sharing, and Android Integration

### Goal

Add high-value mobile creation without importing the desktop workstation.

### Work

```text
- Profile edit.
- Basic post/article draft.
- Comment/reply.
- Image selection and upload.
- Basic media file selection/upload only where existing backend path is proven.
- Android share sheet for crab:// links.
- Open-with/import intake.
- Clipboard for public links only.
- Camera/gallery permissions requested only at point of use.
- Optional notifications only after a real product need.
```

Deferred:

```text
full crab://make
timeline editor
local transcode
local stream studio
background upload daemon
operator tooling
```

### Acceptance

```text
ANDROID_PHASE14_CREATOR_LITE=GREEN
PROFILE_EDIT=GREEN
POST_OR_ARTICLE_PUBLISH=GREEN
COMMENT_REPLY=GREEN
IMAGE_UPLOAD=GREEN
ANDROID_SHARE_SHEET=GREEN
BROAD_STORAGE_PERMISSION=ABSENT
FULL_MAKE_EDITOR=ABSENT
NEXT_PHASE=ANDROID_PHASE15_PROCESS_DEATH_CACHE_AND_LIFECYCLE
```

---

## Android Phase 15 — Process Death, Offline Cache, and Lifecycle

### Goal

Make the application resilient to real Android lifecycle behavior.

### Work

```text
- Process-death state restoration.
- Rotation and window resize.
- Background auto-lock.
- Pending prompt cancellation.
- Network loss/change.
- Cache corruption.
- Interrupted verified download.
- Low-memory resource release.
- App update/migration.
- Clock change.
- No-backup secret posture.
- Amnesia/private mode.
```

### Acceptance

```text
ANDROID_PHASE15_LIFECYCLE_RESILIENCE=GREEN
PROCESS_DEATH_FAILS_CLOSED=YES
BACKGROUND_LOCK=YES
ROTATION_STATE_SAFE=YES
INTERRUPTED_WRITE_ATOMIC=YES
CACHE_CORRUPTION_REJECTED=YES
SECRET_CLOUD_RESTORE=NO
NEXT_PHASE=ANDROID_PHASE16_TABLET_FOLDABLE_AND_INPUT_ACCEPTANCE
```

---

## Android Phase 16 — Tablet, Foldable, Multi-Window, and Input Acceptance

### Goal

Prove the same application is genuinely optimized for phones and tablets.

### Matrix

```text
compact phone portrait
compact-height phone landscape
large phone
small tablet portrait
tablet landscape
expanded tablet
split screen
resizable/freeform window
foldable cover-width equivalent
foldable expanded-width equivalent
external keyboard
mouse/trackpad
```

### Work

```text
- List-detail canonical layouts.
- Navigation rail transitions.
- Supporting pane where useful.
- Keyboard focus order.
- Pointer hover as enhancement only.
- Hardware keyboard text entry.
- Window resize without route loss.
- Media resize without leak.
- Onboarding and Passport dialogs at all sizes.
```

### Acceptance

```text
ANDROID_PHASE16_ADAPTIVE_ACCEPTANCE=GREEN
PHONE_ACCEPTANCE=GREEN
TABLET_ACCEPTANCE=GREEN
MULTI_WINDOW=GREEN
KEYBOARD=GREEN
POINTER=GREEN
WINDOW_RESIZE_STATE_LOSS=NO
NEXT_PHASE=ANDROID_PHASE17_SECURITY_ACCESSIBILITY_AND_PERFORMANCE
```

---

## Android Phase 17 — Security, Accessibility, and Performance Hardening

### Goal

Harden the mobile client before release packaging.

### Security

```text
- Permission audit.
- Tauri capability audit.
- Command allowlist audit.
- Android exported-component audit.
- Release cleartext audit.
- Secret backup audit.
- WebView storage audit.
- Log/crash/metric redaction.
- Clipboard audit.
- Screenshot-protection audit.
- Dependency audit.
- No raw capability/key/recovery/PIN surface.
```

### Accessibility

```text
- TalkBack.
- semantic labels.
- focus order.
- font scaling.
- contrast.
- reduced motion.
- touch target size.
- keyboard-only operation on tablets.
```

### Performance

```text
- startup.
- route transition.
- list virtualization where needed.
- image memory.
- media resource release.
- cache quota.
- ANR/jank review.
- low-memory behavior.
```

### Acceptance

```text
ANDROID_PHASE17_HARDENING=GREEN
SECRET_SURFACE_SCAN=GREEN
PERMISSION_AUDIT=GREEN
ACCESSIBILITY_ACCEPTANCE=GREEN
LOW_MEMORY_ACCEPTANCE=GREEN
RELEASE_CLEARTEXT=ABSENT
NODE_OPERATOR_AUTHORITY=ABSENT
NEXT_PHASE=ANDROID_PHASE18_RELEASE_AND_FINAL_ACCEPTANCE
```

---

## Android Phase 18 — Release Packaging and Final Acceptance

### Goal

Produce a reproducible Android private-beta/release candidate.

### Work

```text
- Versioning.
- Release signing separation.
- AAB build.
- Release APK when needed for sideloading.
- R8/ProGuard review.
- Native symbol/debug artifact posture.
- Package identity review.
- App Links decision.
- Final codebundle regeneration.
- Final phone/tablet acceptance runner.
- Cross-device Passport demonstration.
- Revocation demonstration.
- Paid access demonstration.
- Upgrade and reinstall demonstration.
```

### Final acceptance

```text
ANDROID_BUILDPLAN_FINAL_ACCEPTANCE=GREEN
ANDROID_PHONE_BUILD=GREEN
ANDROID_TABLET_BUILD=GREEN
ANDROID_AAB=GREEN
ANDROID_RELEASE_PERMISSION_BOUNDARY=GREEN
ANDROID_PASSPORT_CREATE=GREEN
ANDROID_PASSPORT_RESTORE=GREEN
ANDROID_DEVICE_REVOCATION=GREEN
ANDROID_VERIFIED_CONTENT=GREEN
ANDROID_MEDIA=GREEN
ANDROID_RECEIPTS_ROC=GREEN
ANDROID_PAID_ACCESS=GREEN
ANDROID_CREATOR_LITE=GREEN
CODEBUNDLE_REGENERATED=YES
```

Native Passport status:

```text
NATIVE_PASSPORT_PHASE17_ANDROID_INTEGRATION=GREEN
NATIVE_PASSPORT_PHASE17_COMPLETE=NO_UNTIL_IOS
NEXT_MAJOR_PLATFORM=IOS
```

---

# 11. Route Reuse Matrix

| Route/surface | Android posture | Reuse strategy |
|---|---|---|
| Home | Required | Adapt desktop data and TV catalog models |
| Profile view | Required | Adapt desktop page; tablet supporting pane |
| Profile edit | Beta | Adapt safe public draft fields |
| Site | Required | Adapt desktop route owner |
| Library | Required | Combine desktop organization with TV verification pipeline |
| Receipts | Required | Reuse shared receipt normalization; new mobile layout |
| Passport | Required | New mobile UI over native redacted commands |
| Settings | Required | Mobile preferences only |
| Image | Required | Reuse verified asset projection |
| Article/Text | Required | Reuse safe text rendering |
| Video | Required | Adapt consumer playback |
| Music | Required | Adapt consumer playback |
| Podcast | Required | Adapt consumer playback |
| Stream | Consumer only | No local stream authority |
| Post/Comment | Beta creator-lite | Adapt after Passport/publish path |
| Chat | Deferred-to-beta | Read/reply only when backend path is ready |
| Make | Deferred | Desktop workstation only initially |
| Operator | Forbidden | Not in mobile app |
| QuickChain engineering | Forbidden | Not in mobile app |
| Local node | Forbidden | No daemon/node control |
| Ad/Algo/Code/Game creator tools | Deferred | Separate future mobile plans |

---

# 12. Reuse and Extraction Rules

## Reuse directly now

```text
packages/crablink-core
packages/crablink-platform contracts
crablink-native-core
svc-passport::native
shared receipt display
shared onboarding contract
shared crab:// parsing
shared route metadata
```

## Adapt within Android app

```text
desktop route pages
desktop onboarding components
desktop Passport redacted adapter
TV catalog models
TV verified asset models
TV media lifecycle models
TV Android intent patterns
TV Android Keystore/JNI/secure prompt patterns
```

## Extract later only after two-platform proof

Potential extraction targets:

```text
shared Android Keystore operation module
shared Android secure prompt module
shared Android lifecycle lock module
shared mobile Passport bridge
shared adaptive UI primitives
shared verified asset execution port
```

## Never extract into the wrong owner

```text
secret Passport logic -> not crablink-native-core
wallet mutation -> not UI/platform package
ledger truth -> not client
TV focus engine -> not phone shell
desktop operator commands -> not mobile
```

---

# 13. Physical Acceptance Matrix

## Phone

```text
clean install
first launch
create Passport
recovery acknowledgement
PIN setup
restart locked
unlock
background lock
deep link cold/warm
public browse
verified image/article
video/audio
receipt refresh
paid action cancel/failure/success
share link
rotation
process death
app update
```

## Tablet

```text
portrait medium width
landscape expanded width
navigation rail
list-detail
keyboard input
pointer input
split screen
window resize
media resize
onboarding resize
Passport secure surfaces
route state preservation
```

## Cross-device Passport

```text
desktop create → Android restore
Android create → desktop restore
Android device A → Android device B restore
same Passport ID
different device keys
different ciphertext
revoke one Android device
other device remains valid
revoked device cannot refresh/prove
```

---

# 14. Hard Boundaries

Do not add without a separate reviewed phase:

```text
cloud login
server-custodied Passport secret
React PIN input
React recovery words
raw private key export
raw capability export
silent spend
cache-only paid unlock
fake balance
fake receipt
fake ownership
fake B3
fake finality
direct ledger mutation
direct storage/index mutation
Service Node Operator Mode
User Node daemon
QuickChain validator/committee/bond UI
ROX/Solana bridge
staking
liquidity
exchange behavior
background mining/verifier daemon
desktop Make editor
arbitrary shell/process execution
arbitrary remote URL fetch
broad filesystem permission
broad media permission before need
global screenshot blocking without review
```

---

# 15. Development Workflow

Continue the established project workflow:

```text
1. Apply-only patch.
2. User posts terminal output.
3. Review first failure.
4. Verification-only block in the next turn.
5. Fix exact failure before expanding scope.
```

Do not include:

```text
git commands
downloads unless requested
opaque/base64 payloads
combined large mutation + verification
automatic codebundle regeneration after every patch
fake physical-device claims
```

Use:

```text
paste-ready Bash
preflight guards
backups
atomic writes
rollback
APPLIED/GREEN/RED banners
focused tests
exact next command
```

---

# 16. Default First Implementation Patch

Begin with:

```text
ANDROID_PHASE0_REUSE_AND_SCOPE_INVENTORY
```

The first patch should:

```text
1. Add ANDROID_BUILDPLAN.md.
2. Add ANDROID_NOTES.md with an initial safe-current label.
3. Add a source inventory checker.
4. Prove apps/crablink-android does not yet exist.
5. Inventory desktop routes and 50-command boundary.
6. Inventory shared core/platform/native-core surfaces.
7. Inventory TV Android reusable primitives.
8. Print the approved mobile route matrix.
9. Print the forbidden desktop/TV surfaces.
10. Mutate no runtime behavior.
```

Suggested verification:

```bash
node scripts/check-crablink-android-phase0-reuse-inventory.mjs

npm --prefix packages/crablink-core run check

npm --prefix packages/crablink-platform run check

cargo check \
  --manifest-path \
  crates/crablink-native-core/Cargo.toml
```

Expected result:

```text
CRABLINK_ANDROID_PHASE0_REUSE_AND_SCOPE_INVENTORY=GREEN
RUNTIME_BEHAVIOR_CHANGED=NO
ANDROID_APP_CREATED=NO
RUSTYONIONS_MUTATED=NO
NEXT_PATCH=ANDROID_PHASE1_MINIMAL_TAURI_APP_AND_FIRST_APK
```

---

# 17. Final Doctrine

```text
Reuse the protocol.
Reuse the Passport state machine.
Reuse the Android native lessons.
Do not reuse the wrong shell or authority.

One Android app.
Phone and tablet adaptive layouts.
One Passport across platforms.
A separate device key per device.
No secrets in React.
No fake network or economic truth.
```
