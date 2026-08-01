### BEGIN NOTE - JULY 16 2026 - 16:45 CST

# CrabLink TV — Exhaustive Carry-Over Notes

**Notes file:** `ANDROID_TV_NOTES.md`
**Project:** RustyOnions / CrabLink
**Application:** CrabLink TV
**Repository:** `/Users/mymac/Desktop/crablink`
**TV application:** `/Users/mymac/Desktop/crablink/apps/crablink-tv`
**Session date:** July 16, 2026
**Current implementation phase:** Phase 3D
**Current acceptance status:** Implementation landed; final acceptance blocked by Rust formatting only
**Next session’s first task:** Apply Rust formatting and resume Phase 3D verification
**Next feature patch after Phase 3D is green:** `TV_BOUNDED_GATEWAY_HEALTH_AND_PAIRING_BEGIN_DTO`

---

## 1. Notes and platform lane separation

The user established separate notes files so each client platform remains in its own lane:

* `ANDROID_TV_NOTES.md` is exclusively for CrabLink TV.
* `ANDROID_NOTES.md` is reserved for the future regular Android phone/tablet application.
* Desktop CrabLink work should remain in its existing CrabLink/RustyOnions notes.
* After the regular Android application is built, the user is interested in taking the next platform step and building an iOS CrabLink application.
* The iOS application is future work and is not part of the current CrabLink TV phase.

Do not merge regular Android-phone implementation notes into this TV file. CrabLink TV and regular Android may share core behavior, but they have distinct layouts, lifecycle behavior, navigation requirements, device constraints, and acceptance work.

---

## 2. High-level product direction

CrabLink TV is a dedicated remote-first television client built as a sibling Tauri application inside the CrabLink repository.

It is not a resized copy of the desktop interface. It needs television-specific behavior:

* D-pad-first navigation.
* Strong visible focus.
* Ten-foot typography and spacing.
* Predictable Back behavior.
* Landscape layout.
* Leanback launcher integration.
* No touchscreen requirement.
* Remote-friendly scrolling.
* Companion-based pairing rather than typing account secrets with a TV remote.
* Truthful states for gateway readiness, pairing, micronode participation, ROC, receipts, and content access.

The current build is an implementation foundation, not yet a full consumer media application.

---

## 3. Core architectural invariants

These invariants must remain in effect throughout future CrabLink TV work.

### 3.1 Client-only authority boundary

CrabLink TV is a client surface. It must not become:

* A wallet authority.
* A ledger authority.
* A ROC minting authority.
* A reward payout authority.
* A bridge authority.
* A service-node operator console.
* A creator publishing console.
* A content-moderation authority.
* A production settlement surface.

The TV may eventually display backend-confirmed ROC, receipts, content entitlements, micronode state, and pairing state, but it must never fabricate them locally.

### 3.2 Micronode direction

Every CrabLink user platform is intended eventually to run or participate through a micronode path so users can:

* Verify QuickChain and ledger evidence.
* Produce bounded reward-eligible verification evidence.
* Participate in the network.
* Earn ROC after authoritative confirmation.

The TV application currently exposes only local scheduling preferences for this future verifier behavior.

It does **not** currently:

* Start a micronode.
* Attach a micronode.
* Generate evidence.
* Claim rewards.
* Change balances.
* Mutate receipts.
* Write to a ledger.

The current native settings snapshot truthfully reports:

```text
micronode_attached = false
```

### 3.3 ROC truth boundary

CrabLink TV must display only confirmed/backend-derived ROC truth.

Never add:

* Placeholder ROC balances.
* Locally incremented reward totals.
* Fake confirmed ROC.
* Fake receipts.
* Local paid-content entitlement.
* Cache-only access unlock.
* Direct reward-claim buttons.
* Local wallet or ledger mutation.

### 3.4 Pairing authority boundary

Pairing approval must come from a trusted desktop or mobile CrabLink companion through a reviewed gateway.

The TV must not:

* Generate its own approved session.
* Invent a pairing code.
* Invent a QR challenge.
* Store a seed phrase.
* Store a wallet private key.
* Accept operator credentials.
* Accept account passwords as the preferred TV onboarding method.
* Claim that pairing succeeded without native device-bound session truth.

### 3.5 Network and deployment boundary

No live production gateway submission, pairing mutation, wallet action, ledger action, ROC action, or production deployment was performed in this session.

Phase 3D currently provides only:

* Gateway-profile validation.
* Gateway readiness projection.
* Pairing readiness projection.
* Local Tauri command snapshots.
* UI representation of those snapshots.

No pairing HTTP request has been added yet.

---

## 4. Repository and application structure

CrabLink TV lives at:

```text
/Users/mymac/Desktop/crablink/apps/crablink-tv
```

It is a sibling application to the existing desktop Tauri client:

```text
apps/
├── crablink-tauri/
└── crablink-tv/
```

Important TV directories now include:

```text
apps/crablink-tv/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── app/
│   │   └── TvApp.jsx
│   ├── focus/
│   │   ├── focusGraph.js
│   │   ├── focusGraph.test.mjs
│   │   └── useTvRemoteNavigation.js
│   ├── navigation/
│   │   ├── tvRouteModel.js
│   │   ├── tvRouteModel.test.mjs
│   │   └── useTvSectionHistory.js
│   ├── pairing/
│   │   ├── TvPairingPanel.jsx
│   │   ├── tvPairingViewModel.js
│   │   └── tvPairingViewModel.test.mjs
│   ├── settings/
│   │   ├── TvSettingsPanel.jsx
│   │   ├── tvPreferences.js
│   │   ├── tvPreferences.test.mjs
│   │   └── useTvPreferences.js
│   └── styles/
│       └── tv.css
└── src-tauri/
    ├── Cargo.toml
    ├── Cargo.lock
    ├── build.rs
    ├── tauri.conf.json
    ├── capabilities/
    │   └── tv.json
    ├── icons/
    │   └── icon.png
    ├── src/
    │   ├── main.rs
    │   ├── lib.rs
    │   └── commands/
    │       ├── mod.rs
    │       ├── diagnostics.rs
    │       ├── settings.rs
    │       ├── gateway.rs
    │       └── pairing.rs
    └── gen/android/
```

---

## 5. Application identity and Android posture

### 5.1 Application identity

```text
Package name: @crablink/crablink-tv
Android/Tauri identifier: com.rustyonions.crablink.tv
Version: 0.1.0
Version code: 1000
```

### 5.2 Android manifest posture

The owned Android project has been configured for television use:

* `android.permission.INTERNET`
* Leanback feature required.
* Touchscreen not required.
* Standard Android launcher category present.
* Android TV Leanback launcher category present.
* Landscape orientation.
* TV banner installed.
* Dedicated CrabLink TV application identity.

The application currently uses only the expected Internet permission. No broad filesystem, shell, process, wallet, operator, or background-surveillance permission was added.

### 5.3 Android TV branding

Branding was generated from:

```text
/Users/mymac/Desktop/crablink/assets/app-logo.png
```

Installed assets include:

* Tauri icon: 512×512 RGBA.
* Android launcher icons across mdpi through xxxhdpi.
* Round launcher icons.
* Adaptive foreground icons.
* TV banner: 320×180.

The brand-asset checker passed before the current final formatting interruption.

### 5.4 Theme posture

First-run default:

```text
dark
```

Supported choices:

```text
dark
light
system
```

Storage key:

```text
crablink.theme.mode
```

The theme is applied during initial HTML bootstrap to avoid a first-render light flash.

---

## 6. Android development environment

The Android toolchain was installed without Android Studio and without emulator/system-image downloads.

Known environment:

```text
Tauri CLI: 2.11.4
Android command-line tools: 20.0
ADB: 37.0.0
Android API: 36
Android Build Tools: 36.0.0 and 35.0.0
Android NDK: 29.0.14206865
Gradle: 8.14.3
Android Gradle Plugin: 8.11.0
Kotlin: 1.9.25
Java: 17
```

Installed Rust Android targets:

```text
aarch64-linux-android
armv7-linux-androideabi
i686-linux-android
x86_64-linux-android
```

No Android emulator is currently part of the workflow. Testing uses deterministic local checks and the physical Android TV box.

---

## 7. Android BuildTask repair

The generated Tauri Android `BuildTask.kt` initially attempted to invoke a bare `tauri` executable.

It was repaired to use the project-local Tauri JavaScript CLI:

```text
../node_modules/@tauri-apps/cli/tauri.js
```

The resolved path is:

```text
/Users/mymac/Desktop/crablink/apps/crablink-tv/node_modules/@tauri-apps/cli/tauri.js
```

The dedicated Android BuildTask checker passed.

Do not regenerate or overwrite the Android project without checking that this repair remains present.

---

## 8. Android artifacts and physical-device proof

### 8.1 ARM64 artifact

Preserved artifact:

```text
/Users/mymac/Desktop/crablink/artifacts/crablink-tv/CrabLink-TV-0.1.0-arm64-v8a-debug.apk
```

Known properties:

```text
ABI: arm64-v8a
Approximate size: 223 MB
Package: com.rustyonions.crablink.tv
Version: 0.1.0
Version code: 1000
Minimum SDK: 24
Target SDK: 36
Signing: debug, APK Signature Scheme v2
SHA-256:
e550f0ce40dd07b451dc1e57d27e0fb129b46213e5d8c8c5279ab0664c7bd0a0
```

The physical Android TV box rejected this artifact because the device userspace does not support the ARM64 application ABI.

Retain this artifact and continue producing ARM64 builds for compatible devices.

### 8.2 ARMv7 artifact

Preserved artifact:

```text
/Users/mymac/Desktop/crablink/artifacts/crablink-tv/CrabLink-TV-0.1.0-armeabi-v7a-debug.apk
```

Known properties:

```text
ABI: armeabi-v7a
Approximate size: 103 MB
Package: com.rustyonions.crablink.tv
Version: 0.1.0
Version code: 1000
Minimum SDK: 24
Target SDK: 36
Signing: debug, APK Signature Scheme v2
SHA-256:
3a7796f2d606fe1d0fc1dc4fafbd954fe710fbbe1c46ee323f819f45c7f3202c
```

### 8.3 Physical-device result

The ARMv7 APK:

* Installed successfully on the physical Android TV box.
* Launched successfully.
* Displayed the CrabLink TV application.
* Established the project’s first successful Android application launch.

Known box details:

```text
Android TV OS: 14
Build:
rk3539_box_32-user 14 UTT2.241219.001
```

This proves the device supports the 32-bit ARM application path.

The build string alone does not conclusively prove kernel bitness or exact SoC identity, but the rejected ARM64 APK and accepted ARMv7 APK prove the relevant application ABI behavior.

---

## 9. Completed implementation phases

## Phase 0 — Baseline audit

Phase 0 established the repository boundary and confirmed that CrabLink TV should be a sibling application rather than a new standalone repository.

Key decisions:

* Keep TV in the CrabLink repository.
* Reuse shared behavior where appropriate.
* Do not copy desktop layout wholesale.
* Preserve strict client-only authority.
* Keep Android TV, regular Android, desktop, and future iOS interfaces in separate implementation lanes.
* Defer broad package migration until basic Android launcher proof was achieved.

---

## Phase 1 — Tauri television host scaffold

A dedicated Tauri + React/Vite application was created under:

```text
apps/crablink-tv
```

The initial native command bridge exposed only:

```text
tv_diagnostics
tv_settings_read
```

The capability file allowed only:

```text
core:default
```

The scaffold intentionally contained no:

* Wallet command.
* Ledger command.
* Operator command.
* Creator command.
* Node command.
* Reward command.

The diagnostics command reports a client-only posture.

---

## Phase 2 — Android TV initialization and hardware proof

Phase 2 covered:

* Android command-line toolchain setup.
* Tauri Android initialization.
* Owned Android project preservation.
* Leanback manifest configuration.
* Landscape orientation.
* Branding.
* Theme bootstrap.
* BuildTask repair.
* ARM64 build.
* ARMv7 build.
* APK inspection.
* Signing and alignment checks.
* Physical ARMv7 installation and launch.

The Android project beneath:

```text
apps/crablink-tv/src-tauri/gen/android
```

contains project-owned source and configuration and is intentionally retained.

Generated/transient Android output remains excluded:

* Gradle build directories.
* `.gradle` state.
* Local SDK path files.
* JNI links.
* APK files.
* Android App Bundles.
* Signing material.

---

## Codebundle boundary repair

The original CrabLink codebundle generator was desktop-focused and did not fully include the TV application.

The codebundle process was expanded to include:

* TV React source.
* TV Rust source.
* Owned Android project source.
* Kotlin source.
* Gradle source.
* TV manifest and resources.
* TV boundary scripts.
* Brand-asset metadata.

It continues to exclude:

* APKs.
* Tauri/Rust targets.
* Gradle build output.
* JNI links.
* Machine-local configuration.
* Secrets.
* Binary bodies.

A dedicated checker was created:

```text
scripts/check-crablink-tv-codebundle-boundary.mjs
```

Phase 3C’s regenerated bundle reported:

```text
TV-related entries: 100
```

Phase 3D added more required files to the generator and checker, but a new bundle has **not yet been generated**, because the final Phase 3D acceptance stopped at formatting.

---

## Phase 3A — Remote and spatial-focus foundation

Phase 3A replaced the informational launcher page with the first real remote-driven TV shell.

Created:

```text
apps/crablink-tv/src/focus/focusGraph.js
apps/crablink-tv/src/focus/focusGraph.test.mjs
apps/crablink-tv/src/focus/useTvRemoteNavigation.js
scripts/check-crablink-tv-focus-boundary.mjs
```

Implemented:

* D-pad Up, Down, Left, and Right handling.
* Deterministic geometric target selection.
* Same-row and same-column preference.
* Lane and angle penalties.
* Deterministic source-order tie breaking.
* Initial autofocus.
* Focus scroll-into-view.
* Strong focus rings.
* Dark/light/system focus visibility.
* Native Enter/Select button activation.
* Input/select/textarea arrow-key preservation.
* Reduced-motion support.

Initial top-level sections included:

```text
Home
Earn ROC
Library
Settings
```

Later Phase 3D added:

```text
Pair
```

Focused tests:

```text
5 focus graph tests
```

All five were green in the most recent completed run.

---

## Phase 3B — Route history, Back behavior, and focus restoration

Created:

```text
apps/crablink-tv/src/navigation/tvRouteModel.js
apps/crablink-tv/src/navigation/tvRouteModel.test.mjs
apps/crablink-tv/src/navigation/useTvSectionHistory.js
scripts/check-crablink-tv-route-boundary.mjs
```

Implemented:

* Deterministic TV route-state model.
* Browser-history entries for section changes.
* No duplicate history entry when selecting the active section.
* Back navigation to previous TV section.
* Back remains untrapped at route depth zero so Android may leave the app normally.
* Focus restoration to:

  1. Recorded focus key.
  2. Active section navigation item.
  3. Home navigation item.
* Focus state written into route history.
* Invalid route state fails closed to Home.

Focused tests:

```text
6 route tests
```

All six were green in the most recent completed run.

A patching bug initially left `setActiveSectionId` in `TvApp.jsx`, but the checker caught it. The stale local state was removed, and route-derived state is now the source of truth.

---

## Phase 3C — Theme, resource, and verification participation preferences

Created:

```text
apps/crablink-tv/src/settings/tvPreferences.js
apps/crablink-tv/src/settings/tvPreferences.test.mjs
apps/crablink-tv/src/settings/useTvPreferences.js
apps/crablink-tv/src/settings/TvSettingsPanel.jsx
scripts/check-crablink-tv-settings-boundary.mjs
```

Implemented local preferences:

### Theme

```text
dark
light
system
```

### Verification resource mode

```text
low
balanced
plugged-in
```

### Participation preference

```text
enabled
paused
```

Important truth boundary:

* Participation defaults to enabled as local scheduling intent.
* No verifier is attached.
* No work is started by changing the preference.
* No reward evidence is produced.
* No ROC is created.
* No wallet or ledger state changes.

Storage keys:

```text
crablink.theme.mode
crablink.tv.resourceMode
crablink.tv.verificationEnabled
```

The native settings snapshot was upgraded to:

```text
crablink.tv.settings-snapshot.v2
```

It now reports:

```text
environment_profile = android-tv-client
android_initialized = true
privacy_mode = true
micronode_attached = false
settings_authority = local-ui-preferences-only
```

Focused tests:

```text
5 settings tests
```

All five were green in the most recent completed run.

A wording test initially failed because the plugged-in description said “bounded batches” instead of “bounded verification batches.” The description was corrected and all settings tests passed.

---

## Phase 3D — Gateway profile and companion-pairing foundation

Phase 3D implementation has landed but final acceptance is not yet complete.

Created:

```text
apps/crablink-tv/src-tauri/src/commands/gateway.rs
apps/crablink-tv/src-tauri/src/commands/pairing.rs
apps/crablink-tv/src/pairing/tvPairingViewModel.js
apps/crablink-tv/src/pairing/tvPairingViewModel.test.mjs
apps/crablink-tv/src/pairing/TvPairingPanel.jsx
scripts/check-crablink-tv-pairing-boundary.mjs
```

Modified:

```text
apps/crablink-tv/src-tauri/Cargo.toml
apps/crablink-tv/src-tauri/Cargo.lock
apps/crablink-tv/src-tauri/src/commands/mod.rs
apps/crablink-tv/src-tauri/src/lib.rs
apps/crablink-tv/src-tauri/src/commands/settings.rs
apps/crablink-tv/src/app/TvApp.jsx
apps/crablink-tv/src/styles/tv.css
apps/crablink-tv/package.json
package.json
scripts/check-crablink-tv-command-boundary.mjs
scripts/check-crablink-tv-codebundle-boundary.mjs
scripts/make_codebundle.sh
```

### 9.1 Native commands after Phase 3D

The native TV command registry now contains exactly four read-only commands:

```text
tv_diagnostics
tv_gateway_profile
tv_pairing_status
tv_settings_read
```

Capability permissions remain:

```text
core:default
```

No new Tauri plugins or broad permissions were added.

### 9.2 Gateway profile configuration

The gateway profile is read from compile-time environment values:

```text
CRABLINK_TV_GATEWAY_PROFILE
CRABLINK_TV_GATEWAY_ORIGIN
CRABLINK_TV_REQUEST_TIMEOUT_MS
```

Supported profiles:

```text
release-https
development-lan
```

Gateway states:

```text
unconfigured
ready
invalid
```

Validation behavior:

* Missing profile and origin produce truthful `unconfigured`.
* Unknown profile is rejected.
* Missing origin is rejected.
* Invalid URL is rejected.
* Embedded username/password is rejected.
* URL paths are rejected.
* URL query strings are rejected.
* URL fragments are rejected.
* The configured value must be an origin only.
* Release profile requires HTTPS.
* Release loopback and unspecified hosts are rejected.
* Development LAN accepts explicit private-LAN HTTP or HTTPS.
* Development loopback is rejected because `127.0.0.1` on the television refers to the television itself.
* Development `.local` names are accepted.
* Private IPv4 addresses are accepted.
* IPv6 unique-local and link-local hosts are handled.
* Request timeout defaults to 5,000 ms.
* Request timeout is clamped from 1,000 through 30,000 ms.
* Invalid profile output does not return the rejected raw origin.

No HTTP request is performed by `tv_gateway_profile`.

### 9.3 Pairing readiness command

`tv_pairing_status` derives a safe status from the gateway profile.

Possible current native readiness states:

```text
blocked_unconfigured
blocked_invalid_gateway
ready_to_begin
```

Current response guarantees:

```text
pairing_code = None
expires_at = None
session_present = false
approval_authority = companion-crablink-required
```

A ready gateway does not mean the TV is paired. It only means a future backend pairing request may be attempted.

### 9.4 Pairing frontend projection

The frontend normalizes gateway and pairing results.

It rejects unknown or malformed values.

Pairing-code format:

```text
^[A-Z2-9]{6}$
```

A displayed waiting challenge requires:

* Pairing state `waiting`.
* Valid six-character code.
* Valid expiry timestamp.

A paired projection requires:

```text
state = paired
sessionPresent = true
```

A paired label without native session truth fails closed.

The normalizer discards unexpected sensitive fields such as:

```text
privateKey
seedPhrase
token
```

### 9.5 Pairing panel

A new top-level TV section was added:

```text
Pair
```

The pairing panel:

* Reads `tv_gateway_profile`.
* Reads `tv_pairing_status`.
* Shows gateway state.
* Shows environment profile.
* Shows sanitized origin.
* Shows transport.
* Shows timeout.
* Shows pairing readiness.
* Shows no code unless a valid challenge actually exists.
* Shows no confirmed session unless native truth reports one.
* Explains the trusted-companion approval boundary.

The panel currently performs only local Tauri invocations. It does not perform a pairing HTTP request.

### 9.6 Phase 3D focused tests that passed before the final formatting interruption

Frontend pairing tests:

```text
5 passed
```

Test cases:

1. Unconfigured gateway cannot invent a pairing code.
2. Reviewed gateway can become ready without claiming pairing.
3. Waiting state requires a strict code and expiry.
4. Paired label without native session truth fails closed.
5. Normalizers discard credentials and unknown secret fields.

Earlier native Rust suite before the MSRV repair:

```text
12 passed
0 failed
```

It included:

* Diagnostics truth.
* Missing gateway profile.
* Timeout bounding.
* Release HTTPS acceptance.
* Release cleartext rejection.
* Development LAN acceptance.
* Development loopback rejection.
* Credential/path/query/fragment rejection.
* Pairing blocked for unconfigured gateway.
* Pairing blocked for invalid gateway.
* Ready gateway remains unpaired.
* Settings snapshot truth.

The Phase 3D pairing and command-boundary scripts also passed before strict Clippy found the MSRV issue.

---

## 10. Problems found and repaired during this session

The following failures were encountered and fixed.

### 10.1 Codebundle checker missing

Cause:

* The verification block was run before the mutation block that created the checker.

Resolution:

* Run the codebundle mutation patch first.
* Then rerun verification.

### 10.2 Focus boundary exact-string mismatch

Cause:

* `TvApp.jsx` split a sentence across adjacent JavaScript string fragments.
* The checker expected the entire sentence as one source fragment.

Resolution:

* Checker changed to inspect the real split fragments.

### 10.3 Stale local section state

Cause:

* A Python patch helper treated an empty replacement string as “already installed,” because an empty string exists in every file.
* The stale `setActiveSectionId` declaration remained.

Resolution:

* Removed the stale state declaration.
* Route-history state now exclusively owns `activeSectionId`.

### 10.4 Settings wording test

Cause:

* Plugged-in mode said “bounded batches.”
* The test required the explicit safety wording “bounded verification.”

Resolution:

* Changed the description to “Larger bounded verification batches…”

### 10.5 Pairing checker phrase mismatch

Cause:

* The checker looked for a test-title phrase in the implementation file.

Resolution:

* Checker now verifies the actual fail-closed branch:

```text
if (!pairing.sessionPresent)
```

and the actual rejection message.

### 10.6 Strict Clippy MSRV failure

Cause:

The gateway implementation used:

```rust
Ipv6Addr::is_unicast_link_local()
```

The crate’s declared MSRV is Rust 1.80, but that method became stable later. Strict Clippy rejected it through:

```text
clippy::incompatible-msrv
```

Resolution applied:

```rust
fn is_ipv6_unicast_link_local(address: Ipv6Addr) -> bool {
    address.segments()[0] & 0xffc0 == 0xfe80
}
```

This directly checks the IPv6 link-local `fe80::/10` prefix.

A focused regression test was added with positive fixtures:

```text
fe80::1
feff::1
febf:ffff::1
```

and negative fixtures:

```text
fec0::1
fc00::1
::1
2001:db8::1
```

The incompatible standard-library call was removed from the source.

---

## 11. Current unresolved blocker

The final acceptance command stopped at its first step:

```text
cargo fmt --manifest-path apps/crablink-tv/src-tauri/Cargo.toml -- --check
```

Rustfmt reported formatting differences in:

```text
apps/crablink-tv/src-tauri/src/commands/gateway.rs
apps/crablink-tv/src-tauri/src/commands/pairing.rs
apps/crablink-tv/src-tauri/src/commands/settings.rs
```

This is currently a formatting failure, not a known semantic or compiler failure.

Because the verification script used `set -e`, it stopped immediately.

Therefore, after the MSRV patch, the following have **not yet been run**:

* Focused IPv6 MSRV regression test.
* Gateway tests.
* Pairing tests.
* Strict Clippy.
* Full TV acceptance.
* Final Android boundary sweep.
* Final codebundle regeneration.
* Phase 3D source-capture confirmation.
* Final green Phase 3D banner.

Do not record Phase 3D as fully accepted yet.

Correct status:

```text
PHASE_3D_IMPLEMENTATION=LANDED
PHASE_3D_FINAL_ACCEPTANCE=PENDING
CURRENT_BLOCKER=RUSTFMT_CHECK
```

---

## 12. Exact first action for the next session

Do not begin a new feature patch first.

Run formatting on the entire TV Rust crate:

```bash
cd /Users/mymac/Desktop/crablink

cargo fmt \
  --manifest-path apps/crablink-tv/src-tauri/Cargo.toml
```

Then confirm formatting:

```bash
cargo fmt \
  --manifest-path apps/crablink-tv/src-tauri/Cargo.toml \
  -- \
  --check
```

Do not manually reformat each diff unless `cargo fmt` itself fails.

After formatting passes, run the first focused new regression test:

```bash
cargo test \
  --manifest-path apps/crablink-tv/src-tauri/Cargo.toml \
  ipv6_link_local_detection_uses_msrv_compatible_prefix_check \
  --offline
```

Then run:

```bash
cargo test \
  --manifest-path apps/crablink-tv/src-tauri/Cargo.toml \
  gateway \
  --offline

cargo test \
  --manifest-path apps/crablink-tv/src-tauri/Cargo.toml \
  pairing \
  --offline
```

Then strict Clippy:

```bash
cargo clippy \
  --manifest-path apps/crablink-tv/src-tauri/Cargo.toml \
  --all-targets \
  --offline \
  -- \
  -D warnings
```

Then the complete application acceptance:

```bash
npm --prefix apps/crablink-tv run check
```

Then rerun all relevant TV boundaries:

```bash
npm run tv:pairing:test
npm run tv:pairing:check
npm run tv:settings:check
npm run tv:route:check
npm run tv:focus:check

node scripts/check-crablink-tv-command-boundary.mjs

npm run tv:android:check
npm run tv:android:build-task:check
npm run tv:theme:check
npm run tv:brand:check
```

Then regenerate the final codebundle:

```bash
bash scripts/make_codebundle.sh
npm run tv:codebundle:check
```

Finally confirm the removed MSRV-incompatible call remains absent:

```bash
if grep -RFn \
  --include='*.rs' \
  '.is_unicast_link_local()' \
  apps/crablink-tv/src-tauri/src
then
  echo "ERROR: incompatible IPv6 helper call remains."
  exit 1
else
  echo "GREEN: no post-MSRV is_unicast_link_local call remains."
fi
```

Only after all of those pass should Phase 3D be marked green.

---

## 13. Expected final Phase 3D acceptance state

The desired completed state is:

```text
CRABLINK_TV_PHASE3D_STATUS=GREEN
TV_GATEWAY_PROFILE_TESTS=GREEN
TV_IPV6_LINK_LOCAL_MSRV_CHECK=GREEN
TV_RELEASE_HTTPS_ENFORCEMENT=GREEN
TV_DEVELOPMENT_LAN_VALIDATION=GREEN
TV_LOOPBACK_REJECTION=GREEN
TV_PAIRING_PROJECTION_TESTS=GREEN
TV_NO_FAKE_PAIRING_CODE=GREEN
TV_NO_FAKE_SESSION=GREEN
TV_COMPANION_APPROVAL_BOUNDARY=GREEN
TV_STRICT_CLIPPY=GREEN
TV_FULL_ACCEPTANCE=GREEN
TV_CODEBUNDLE_COVERAGE=GREEN
NETWORK_REQUEST_PERFORMED=NO
ANDROID_APK_REBUILD_PERFORMED=NO
PHYSICAL_PAIRING_TEST_PENDING=YES
```

---

## 14. Next feature patch after Phase 3D is green

Next planned patch:

```text
TV_BOUNDED_GATEWAY_HEALTH_AND_PAIRING_BEGIN_DTO
```

Do not begin it until formatting, tests, strict Clippy, full acceptance, and codebundle regeneration are green.

Expected direction:

* Add a bounded gateway-health request model.
* Add explicit pairing-begin request and response DTOs.
* Validate response size, state, code format, expiry, and error taxonomy.
* Reuse the reviewed gateway profile.
* Preserve strict timeout bounds.
* Do not invent a pairing challenge.
* Do not create a session without an authoritative backend response.
* Do not store account secrets.
* Do not expose wallet, reward, ROC, ledger, or operator authority.
* Add focused Rust tests beside each behavior.
* Add frontend projection tests before broad UI expansion.
* Fix the first failure before expanding scope.

Inspect the current build plan and freshly generated codebundle before writing that patch.

---

## 15. Physical-device testing still pending

The original Phase 2 launcher was physically tested, but the later Phase 3 UI has not yet been rebuilt and exercised on the TV box.

Pending physical checks include:

### Remote navigation

* Initial focus appears visibly.
* D-pad moves among the expected targets.
* No unreachable controls.
* Focus does not disappear offscreen.
* Focused elements scroll into view.
* Enter/Select activates buttons once.
* Mouse/touch assumptions are not required.

### Back behavior

* Back from Pair, Settings, Library, or Earn returns to the previous TV route.
* Focus restores to the expected control.
* Back at Home is not trapped by the web interface.
* Android can exit or apply system Back behavior normally.

### Settings

* Dark, light, and system choices render correctly.
* Settings survive application restart.
* Resource mode controls remain reachable by remote.
* Participation pause/resume preference remains local intent only.
* No false micronode-running state is shown.

### Pairing

* Unconfigured gateway shows blocked/unconfigured.
* Invalid gateway shows a truthful problem.
* Ready gateway shows ready-to-begin without a fake code.
* No pairing code appears unless a real future backend response supplies one.
* No session confirmation appears without native session truth.

### Layout

* Text fits the target television.
* Overscan-safe margins remain acceptable.
* No horizontal clipping.
* Long gateway origins wrap safely.
* Focus scale does not clip neighboring controls.
* Light theme remains readable from television distance.

---

## 16. APK rebuild posture

No APK rebuild was performed after Phases 3A through 3D.

The last physically accepted APK predates:

* Remote spatial focus.
* Route history.
* Back handling.
* Settings controls.
* Pairing section.
* Gateway profile.
* MSRV repair.

After the current logical phase is green, a later milestone should build both:

```text
armv7 / armeabi-v7a
arm64 / arm64-v8a
```

Continue preserving both ABI paths.

The physical TV box currently needs the ARMv7 artifact.

Do not delete the preserved ARM64 artifact simply because this particular box rejected it.

---

## 17. Codebundle status

The latest attached codebundle was generated before Phase 3D was fully added.

It contains the Phase 3C application and reported:

```text
TV-related entries: 100
```

The Phase 3D patch updated:

```text
scripts/make_codebundle.sh
scripts/check-crablink-tv-codebundle-boundary.mjs
```

to require:

```text
apps/crablink-tv/src/pairing/tvPairingViewModel.js
apps/crablink-tv/src/pairing/tvPairingViewModel.test.mjs
apps/crablink-tv/src/pairing/TvPairingPanel.jsx
apps/crablink-tv/src-tauri/src/commands/gateway.rs
apps/crablink-tv/src-tauri/src/commands/pairing.rs
scripts/check-crablink-tv-pairing-boundary.mjs
```

However, the final bundle regeneration did not run because the acceptance process stopped at rustfmt.

After the next-session repair, regenerate:

```text
CODEBUNDLE_TAURI_APP.md
```

That regenerated file, not the currently attached pre-Phase-3D bundle, becomes the source reference for continuing implementation.

---

## 18. Root scripts currently added for TV work

Important root scripts include:

```text
tv:focus:test
tv:focus:check
tv:route:test
tv:route:check
tv:settings:test
tv:settings:check
tv:pairing:test
tv:pairing:check
tv:android:check
tv:android:build-task:check
tv:brand:check
tv:theme:check
tv:codebundle:check
tv:android:build:debug
tv:android:build:debug:armv7
tv:android:apk:check
tv:android:apk:check:armv7
```

The TV application’s own `check` command currently runs:

* Native command boundary.
* Focus boundary.
* Route boundary.
* Settings boundary.
* Pairing boundary.
* Vite build.
* Rust tests.
* Strict Clippy with `-D warnings`.

---

## 19. Important boundary scripts

Current TV-focused scripts include:

```text
scripts/check-crablink-tv-command-boundary.mjs
scripts/check-crablink-tv-focus-boundary.mjs
scripts/check-crablink-tv-route-boundary.mjs
scripts/check-crablink-tv-settings-boundary.mjs
scripts/check-crablink-tv-pairing-boundary.mjs
scripts/check-crablink-tv-android-tv-boundary.mjs
scripts/check-crablink-tv-android-build-task.mjs
scripts/check-crablink-tv-brand-assets.mjs
scripts/check-crablink-tv-theme-default.mjs
scripts/check-crablink-tv-debug-apk.sh
scripts/check-crablink-tv-codebundle-boundary.mjs
scripts/make_codebundle.sh
```

Do not remove these as “temporary” scripts. They are focused acceptance boundaries for real behavior.

---

## 20. Development discipline to preserve

* No Git mutations or Git workflow commands until the user explicitly changes the current restriction.
* Do not include `git add`, `git commit`, or `git push`.
* No broad downloads.
* No Android Studio or emulator installation unless explicitly requested.
* No old CPU limiter variables.
* Keep mutation and verification commands in separate Bash blocks.
* Include the verification block in the same response as a mutation patch.
* Fix the first compiler, formatter, test, or checker failure before expanding scope.
* Prefer small behavior slices with matching tests.
* No fake success banners before the command chain actually reaches the banner.
* No fake pairing code.
* No fake session.
* No fake ROC.
* No fake receipts.
* No fake content access.
* No live wallet or ledger mutation.
* No production deployment.
* No bridge, staking, liquidity, or exchange behavior.
* Preserve codebundle coverage for every new owned source file.

---

## 21. Storage and disk posture

Disk space was constrained during Android setup.

Known approximate usage during the session:

```text
~/.gradle: approximately 2.5 GB
TV Tauri target: approximately 5.6 GB
Generated Android project/output: approximately 758 MB
Free disk at that point: approximately 13 GiB
```

Do not recommend broad deletion of caches by default. Those caches preserve expensive Android and Rust build work.

Xcode may be considered for removal only if the user explicitly decides it is needed for disk recovery. Future iOS work will require reconsidering that decision.

---

## 22. Future regular Android application

The regular Android application is planned after the TV beta reaches an appropriate milestone.

Its notes file will be:

```text
ANDROID_NOTES.md
```

Likely application path:

```text
apps/crablink-android
```

The regular Android application should share protocol and business behavior but should not reuse the TV layout directly.

Regular Android will need:

* Touch-first navigation.
* Phone/tablet responsive layout.
* Android lifecycle integration.
* Bounded WorkManager verification jobs.
* Explicit foreground-service behavior where required.
* Battery, charging, and network constraints.
* Mobile companion pairing/approval capabilities.
* The same no-fake-ROC and no-fake-finality invariants.

Do not place that implementation into `apps/crablink-tv`.

---

## 23. Future iOS direction

After the regular Android client, the user wants to seriously consider building an iOS CrabLink client.

This is not yet an active build phase.

Before beginning iOS:

* Finish the TV and regular Android shared-core boundaries.
* Identify behavior that belongs in shared Rust/core packages.
* Keep platform lifecycle and presentation code separate.
* Define iOS background-execution limitations truthfully.
* Avoid promising continuous micronode behavior that iOS cannot support.
* Create a separate iOS notes/build-plan lane when that work begins.

---

## 24. Files to attach in the next session

Because the user currently has poor internet, the next session only needs the core continuation set:

```text
ANDROID_TV_NOTES.md
<current CrabLink TV build-plan file>
CODEBUNDLE_TAURI_APP.md
```

Important: regenerate `CODEBUNDLE_TAURI_APP.md` after the formatting and final acceptance repair, when possible.

The terminal-output file is optional because the current failure and exact next commands are captured in these notes.

Do not attach:

```text
ANDROID_NOTES.md
```

until the regular Android application work begins.

---

## 25. Immediate resume summary

At the start of the next session:

1. Read `ANDROID_TV_NOTES.md`.
2. Read the active CrabLink TV build plan.
3. Inspect the latest codebundle.
4. Do not expand scope.
5. Run `cargo fmt` on the TV Rust crate.
6. Confirm `cargo fmt --check`.
7. Run the new IPv6 MSRV regression test.
8. Run gateway and pairing tests.
9. Run strict Clippy.
10. Run full TV acceptance.
11. Regenerate and verify the codebundle.
12. Only then mark Phase 3D green.
13. Proceed to:

```text
TV_BOUNDED_GATEWAY_HEALTH_AND_PAIRING_BEGIN_DTO
```

Current final status:

```text
CRABLINK_TV_PHASE0=COMPLETE
CRABLINK_TV_PHASE1=COMPLETE
CRABLINK_TV_PHASE2=HARDWARE_ACCEPTED_ARMV7
CRABLINK_TV_PHASE3A=GREEN
CRABLINK_TV_PHASE3B=GREEN
CRABLINK_TV_PHASE3C=GREEN
CRABLINK_TV_PHASE3D=IMPLEMENTED_ACCEPTANCE_PENDING
CURRENT_FAILURE=RUSTFMT_CHECK
NEXT_REPAIR=RUN_CARGO_FMT_THEN_RESUME_ACCEPTANCE
NEXT_FEATURE=TV_BOUNDED_GATEWAY_HEALTH_AND_PAIRING_BEGIN_DTO
NETWORK_MUTATION_PERFORMED=NO
PAIRING_SESSION_CREATED=NO
ROC_MUTATION_PERFORMED=NO
ANDROID_APK_REBUILT_AFTER_PHASE3=NO
PHYSICAL_PHASE3_UI_TEST=PENDING
```

---

### END NOTE - JULY 16 2026 - 16:45 CST




### BEGIN NOTE - JULY 17 2026 - 11:40 CST


These notes are ready to paste into `ANDROID_TV_NOTES.md` or the next-session carry-over section.

# CrabLink TV Carry-Over Notes — Phase 4 Shared JavaScript Extraction

**Date:** July 16–17, 2026
**Repository:** `/Users/mymac/Desktop/crablink`
**Primary application:** `apps/crablink-tv`
**Desktop compatibility application:** `apps/crablink-tauri`
**Current phase:** CrabLink TV Phase 4 — Make Shared JavaScript Packages Real
**Current status:** Phase 4 extraction families 1 and 2 are complete and green
**Next implementation slice:** Receipt display normalization foundation
**Codebundle regenerated during this session:** No
**Git operations performed:** None

---

# 0. Current Status Summary

The CrabLink TV project is currently in **TV Phase 4**, whose purpose is to move genuinely platform-neutral JavaScript behavior into real shared packages used by both desktop CrabLink and CrabLink TV.

The Phase 4 build-plan extraction order is:

```text
1. crab:// parser and normalized route model
2. route labels and asset-kind mapping
3. receipt display normalization
4. gateway/settings/diagnostics adapter contracts
5. memory adapters for tests
```

The first two extraction families are now complete. 

Current safe status:

```text
TV_PHASE4_SHARED_CRAB_URL_FOUNDATION=GREEN
TV_PHASE4_DESKTOP_SHARED_PARSER_MIGRATION=GREEN
TV_PHASE4_SHARED_ROUTE_MODEL_MIGRATION=GREEN
TV_PHASE4_ROUTE_METADATA=GREEN
TV_FOCUS_SHARED_LABEL_BOUNDARY=GREEN

PHASE4_EXTRACTION_FAMILY_1=COMPLETE
PHASE4_EXTRACTION_FAMILY_2=COMPLETE

NEXT_SLICE=RECEIPT_DISPLAY_NORMALIZATION_FOUNDATION
```

The final full acceptance run passed:

```text
Shared core tests:                 18 passed
Desktop parser migration tests:    5 passed
Desktop route-metadata tests:      6 passed
TV route tests:                   11 passed
TV focus graph tests:              5 passed
TV native Rust tests:             28 passed
Desktop production build:          green
TV production build:               green
TV strict Clippy:                   green
```

The final terminal markers confirm the route-metadata family, repaired focus boundary, desktop build, TV build, native tests, and strict Clippy are all green. 

---

# 1. Session Goal and Starting Point

At the beginning of this work, Phase 3’s local implementation and regression surfaces were already green. The current session moved into Phase 4 rather than returning to broad planning.

The Phase 4 rules followed throughout the session were:

```text
- One behavior family per patch.
- Add pure unit tests before changing consumers.
- Move desktop behavior to the shared package first.
- Run desktop checks.
- Add TV consumption after the shared and desktop surfaces are green.
- Do not move desktop-only React pages into shared core.
- Do not give shared code Chrome, Tauri, DOM, network, storage, wallet,
  receipt-mutation, ROC-mutation, or ledger authority.
```

This session implemented and migrated:

```text
Family 1:
- shared crab:// parser
- desktop parser migration
- TV normalized route-model migration

Family 2:
- shared route labels
- shared typed-asset labels
- shared typed-asset route-owner mapping
- desktop migration
- TV navigation-label migration
- focus-boundary repair for the new ownership arrangement
```

---

# 2. Phase 4 Family 1 — Shared `crab://` Parser Foundation

## 2.1 New Shared Core Package Behavior

The first real behavior family was added to:

```text
packages/crablink-core
```

Primary files:

```text
packages/crablink-core/src/crabUrl.js
packages/crablink-core/src/crabUrl.test.mjs
packages/crablink-core/src/index.js
packages/crablink-core/package.json
scripts/check-crablink-core-boundary.mjs
package.json
```

The parser now owns the platform-neutral rules for:

```text
- stripping crab:// prefixes
- removing query strings and fragments
- validating raw 64-character lowercase/uppercase hexadecimal hashes
- normalizing raw hashes
- validating and normalizing b3:<hash> CIDs
- converting raw hashes and b3 CIDs to canonical typed asset routes
- parsing crab://<hash>.<kind>
- normalizing typed asset kinds
- recognizing caller-supplied built-in route names
- normalizing safe site names
- converting crab://<hash>.image back to b3:<hash>
- failing closed for invalid or unusable input
```

Important design decision:

```text
@crablink/core owns syntax and normalization.
Callers own which built-in routes are valid for their product surface.
```

The shared parser does not invent desktop pages, TV sections, network destinations, ownership, paid access, receipt truth, or backend confirmation.

## 2.2 Shared Parser Tests

Ten pure Node tests were added and passed:

```text
1. shared package identity
2. prefix/query/fragment stripping
3. raw hash and b3 normalization
4. raw hash to canonical image route
5. b3 CID to canonical image route
6. typed asset parsing
7. caller-owned built-in route recognition
8. site-name normalization and invalid-input rejection
9. canonical typed asset creation
10. image route to b3 CID conversion
```

Final parser-foundation status:

```text
TV_PHASE4_SHARED_CRAB_URL_FOUNDATION=GREEN
SHARED_BEHAVIOR_FAMILY=CRAB_URL_PARSER
SHARED_PARSER_TEST_COUNT=10

RAW_HASH_NORMALIZATION=YES
B3_CID_NORMALIZATION=YES
TYPED_ASSET_NORMALIZATION=YES
BUILTIN_ROUTE_NORMALIZATION=YES
SITE_NAME_NORMALIZATION=YES
INVALID_INPUT_FAILS_CLOSED=YES
```

The initial parser acceptance also proved that Chrome, Tauri, DOM, network, storage, wallet, ledger, and ROC authority were absent. 

## 2.3 Shared Parser Acceptance Log

```text
/Users/mymac/Desktop/CRABLINK_TV_PHASE4_SHARED_CRAB_URL_20260716_233251.log
```

---

# 3. Desktop Shared-Parser Migration

## 3.1 Compatibility Migration Strategy

The desktop application already had a local parser utility at:

```text
apps/crablink-tauri/src/shared/utils/crabUrl.js
```

Instead of immediately rewriting every desktop import, that file was converted into a compatibility re-export of the new shared parser implementation.

This preserved existing import paths while making `@crablink/core` the only parser-rule owner.

The compatibility surface delegates these exports:

```text
crabImageUrlToCid
initCrabUrl
isB3Cid
isRawHash
isTypedAssetUrl
makeCrabAssetUrl
makeCrabSiteUrl
normalizeAssetKind
normalizeB3Cid
normalizeHash
normalizeSiteName
normalizeTypedAssetUrl
parseCrabInput
parseTypedAssetBody
stripCrabPrefix
stripQueryAndHash
```

## 3.2 Existing Desktop Consumers Migrated

Three existing desktop consumers continued using their reviewed local import path but now reached shared core through the compatibility re-export:

```text
apps/crablink-tauri/src/shared/api/contentViewClient.js
apps/crablink-tauri/src/shared/api/siteClient.js
apps/crablink-tauri/src/shared/api/siteVisitClient.js
```

Final migration markers:

```text
DESKTOP_COMPATIBILITY_SHIM=YES
DESKTOP_DUPLICATE_PARSER_RULES=REMOVED
DESKTOP_EXISTING_CONSUMER_COUNT=3

CONTENT_VIEW_CLIENT_MIGRATED=YES
SITE_CLIENT_MIGRATED=YES
SITE_VISIT_CLIENT_MIGRATED=YES
```

## 3.3 Desktop Migration Tests and Boundary

New test:

```text
apps/crablink-tauri/src/shared/utils/crabUrl.shared.test.mjs
```

New boundary:

```text
scripts/check-crablink-desktop-shared-crab-url-boundary.mjs
```

Five desktop migration tests passed:

```text
1. desktop compatibility exports are the same shared function objects
2. desktop parser identity reports @crablink/core/crab-url
3. raw hash parsing uses shared canonical behavior
4. site and typed-asset helpers retain compatible output
5. invalid desktop input still fails closed
```

Desktop production build passed with:

```text
322 modules transformed
```

The complete TV regression also remained green with all 28 native tests and strict Clippy. 

## 3.4 Desktop Parser Migration Log

```text
/Users/mymac/Desktop/CRABLINK_TV_PHASE4_DESKTOP_SHARED_PARSER_20260716_233912.log
```

---

# 4. TV Shared Route-Model Migration

## 4.1 TV Route Model Now Uses Shared Parsing

The TV-specific route model was migrated at:

```text
apps/crablink-tv/src/navigation/tvRouteModel.js
```

It now imports `parseCrabInput` from shared core and derives normalized `crab://` route truth from that implementation.

The TV route model now stores both:

```text
sectionId
crabRoute
```

The normalized `crabRoute` is regenerated from the validated section ID rather than trusting serialized history data.

## 4.2 Behavior Kept TV-Local

The following behavior deliberately remains TV-specific:

```text
- section depth
- browser-history state
- pushState/replaceState/popstate behavior
- Back-key handling
- focus-key tracking
- focus restoration
- root Back behavior
- section navigation
```

This is an important architectural boundary:

```text
Shared core owns crab:// parsing and normalized route truth.
CrabLink TV owns remote navigation and TV history behavior.
```

## 4.3 Fail-Closed Route Behavior

The migration added or confirmed the following protections:

```text
- unsupported TV crab:// routes fail closed to Home
- malformed route input fails closed to Home
- invalid serialized history objects fail closed to the root route
- stored crabRoute material is not trusted
- crabRoute is regenerated from the validated section ID
- selecting the current section does not create a new history entry
```

## 4.4 TV Route Tests

The route suite initially increased from six to nine tests:

```text
1. deterministic root route
2. shared normalized crab route
3. unsupported routes fail closed to Home
4. invalid history state fails closed
5. stored route data is regenerated
6. moving sections increments depth
7. selecting active section adds no history
8. focus restoration uses the recorded control
9. common TV Back keys are recognized
```

Final route-model status:

```text
TV_PHASE4_SHARED_ROUTE_MODEL_MIGRATION=GREEN
TV_SHARED_PARSER_CONSUMER=YES
TV_SECTION_ROUTE_NORMALIZATION=SHARED
TV_UNSUPPORTED_ROUTE_POSTURE=FAIL_CLOSED_TO_HOME
TV_STORED_ROUTE_TAMPER_REGENERATION=YES

TV_BROWSER_HISTORY_LOCAL=YES
TV_BACK_HANDLING_LOCAL=YES
TV_FOCUS_RESTORATION_LOCAL=YES
TV_ROUTE_DEPTH_LOCAL=YES
```

The migration passed the desktop build, complete TV acceptance, all 28 native tests, and strict Clippy. 

## 4.5 TV Shared Route Log

```text
/Users/mymac/Desktop/CRABLINK_TV_PHASE4_SHARED_ROUTE_MODEL_20260716_235205.log
```

---

# 5. Phase 4 Family 2 — Shared Route Metadata

## 5.1 Shared Route-Metadata Module

A second shared behavior family was created:

```text
packages/crablink-core/src/routeMetadata.js
packages/crablink-core/src/routeMetadata.test.mjs
```

The module exports:

```text
normalizeRouteKind
routeKindLabel
assetKindLabel
resolveAssetRouteOwner
describeAssetKind
```

## 5.2 Shared Route Labels

Shared core now owns generic route label formatting.

Examples:

```text
home             -> Home
notFound         -> Not Found
make             -> Make Studio
podcasts         -> Podcasts
creator_profile  -> Creator Profile
paid-video       -> Paid Video
```

Caller-owned display overrides are allowed, but they must be:

```text
- strings
- non-empty after trimming
- no more than 80 characters
- free of control characters
```

An invalid override is ignored and generic formatting is used.

## 5.3 Shared Typed-Asset Labels

Shared core now owns typed-asset display labels.

Examples:

```text
image         -> Image Asset
video         -> Video Asset
chat          -> Chat Room
unknown_kind  -> Unknown Kind Asset
empty/invalid -> Unknown Asset
```

## 5.4 Shared Typed-Asset Route Ownership

Shared core now owns pure route-owner selection:

```text
resolveAssetRouteOwner(assetKind, supportedRouteKinds, fallback)
```

Behavior:

```text
- a supported asset kind maps to its corresponding route owner
- an unsupported kind maps to the generic asset fallback
- invalid input cannot smuggle an unsupported route owner
```

Examples:

```text
video + supported video route  -> video
chat + supported chat route    -> chat
podcast + supported route      -> podcast
mesh + unsupported route       -> asset
invalid Unicode kind           -> asset
```

This is only a display/router-selection rule. It does not prove content ownership, entitlement, receipt validity, payment, or backend availability.

---

# 6. Desktop Route-Metadata Migration

## 6.1 Desktop Route Registry

Modified:

```text
apps/crablink-tauri/src/app/routeRegistry.js
```

The old local `routeKindLabel` implementation was removed.

The registry now delegates directly to the shared function:

```text
routeKindLabel as sharedRouteKindLabel
```

and exports that shared implementation through the desktop registry.

Desktop lazy-loaded React pages remain local. Shared core does not import or own React components.

## 6.2 Desktop Router

Modified:

```text
apps/crablink-tauri/src/app/router.js
```

The following duplicated desktop behavior was removed:

```text
function titleForKind(...)
const typedRouteOwner = { kind: ... }.kind
literal Chat Room typed-asset title
```

The desktop router now uses:

```text
routeKindLabel
assetKindLabel
resolveAssetRouteOwner
BUILT_IN_ROUTE_KINDS
```

This preserved existing route behavior while centralizing the pure mapping rules.

## 6.3 Desktop Route-Metadata Tests

Added:

```text
apps/crablink-tauri/src/app/routeMetadata.shared.test.mjs
```

Six tests passed:

```text
1. desktop route labels delegate to shared core
2. typed video uses shared asset mapping
3. unknown asset kinds fail to generic asset owner
4. chat assets retain Chat Room label and chat owner
5. desktop route registry and shared owner selection agree
6. desktop asset labels equal shared display values
```

---

# 7. TV Navigation-Label Migration

## 7.1 TV Route Metadata Adapter

Added:

```text
apps/crablink-tv/src/navigation/tvRouteMetadata.js
```

This adapter imports the shared `routeKindLabel` function.

TV keeps only one deliberate product-specific override:

```text
earn -> Earn ROC
```

The override object is frozen:

```text
TV_ROUTE_LABEL_OVERRIDES
```

This means shared core owns generic formatting while TV owns the intentional product wording that differs from a generic label.

## 7.2 TV Application Migration

Modified:

```text
apps/crablink-tv/src/app/TvApp.jsx
```

The five navigation labels were migrated from literal strings to shared projections:

```text
tvRouteLabel('home')
tvRouteLabel('earn')
tvRouteLabel('library')
tvRouteLabel('pair')
tvRouteLabel('settings')
```

The visible labels remain:

```text
Home
Earn ROC
Library
Pair
Settings
```

No visible copy was intentionally changed.

## 7.3 TV Route Tests Expanded

Two tests were added to the existing TV route suite:

```text
TV route labels use shared core
TV keeps the intentional Earn ROC override
```

The TV route suite therefore increased from nine tests to eleven.

Final result:

```text
TV_ROUTE_TEST_COUNT=11
TV_EARN_ROC_OVERRIDE=INTENTIONAL_AND_VERIFIED
DISPLAY_COPY_CHANGED=NO
```

---

# 8. Route-Metadata Package and Boundary Wiring

## 8.1 Shared Core Package Wiring

Modified:

```text
packages/crablink-core/package.json
packages/crablink-core/src/index.js
```

Added export:

```text
./route-metadata
```

Added scripts:

```text
test:route-metadata
check:route-metadata
```

The standard shared-core check now runs:

```text
npm run test
npm run check:boundary
npm run check:route-metadata
```

## 8.2 Desktop Package Wiring

Modified:

```text
apps/crablink-tauri/package.json
```

Added scripts:

```text
test:route-metadata
check:route-metadata-boundary
check:route-metadata
```

The desktop standard acceptance chain now includes the route-metadata family.

## 8.3 TV Package Wiring

Modified:

```text
apps/crablink-tv/package.json
```

Added:

```text
check:route-metadata
```

The TV standard check now runs the route-metadata boundary after the route boundary and before settings/pairing/build/native checks.

## 8.4 Root Package Wiring

Modified:

```text
package.json
```

Added root commands:

```text
core:route-metadata:test
core:route-metadata:boundary:check
core:route-metadata:check

core:desktop:route-metadata:test
core:desktop:route-metadata:check

tv:route-metadata:check
```

## 8.5 Route-Metadata Boundary

Added:

```text
scripts/check-crablink-route-metadata-boundary.mjs
```

The boundary proves:

```text
- shared core owns route-label formatting
- shared core owns asset labels
- shared core owns typed-asset route-owner selection
- desktop uses the shared functions
- TV uses the shared label projection
- TV retains only the intentional Earn ROC override
- duplicated desktop formatters were removed
- duplicated TV navigation literals were removed
- shared metadata does not import platform APIs
```

It also protects the following authority boundaries:

```text
No Chrome authority
No Tauri authority
No DOM authority
No network authority
No local/session storage authority
No wallet authority
No receipt mutation
No ROC mutation
No ledger authority
```

---

# 9. Errors Encountered and How They Were Solved

## 9.1 Error 1 — Python Syntax Error in the First Route-Metadata Patch

### Terminal failure

The first route-metadata mutation failed before doing any work:

```text
File "<stdin>", line 1563
    desktop_check =
                   ^
SyntaxError: invalid syntax
```

The same invalid pattern also existed for `tv_check`.

The incorrect Python assignments were split immediately after the equals sign:

```python
desktop_check =
    desktop_scripts.get("check", "")
```

and:

```python
tv_check =
    tv_scripts.get("check", "")
```

### Impact

Python parses the entire heredoc before executing it. Because parsing failed:

```text
- no files were created
- no package JSON was changed
- no source files were changed
- no partial route-metadata mutation existed
```

The verification script subsequently failed at preflight with:

```text
ERROR: shared routeMetadata.js is missing.
```

That verification failure did not identify a repository defect. It only confirmed that the mutation had never executed.

### Solution

The assignments were corrected to valid Python expressions:

```python
desktop_check = desktop_scripts.get("check", "")
tv_check = tv_scripts.get("check", "")
```

### Workflow Lesson

For future corrections:

```text
Always provide the complete corrected mutation block and the complete
separate verification block.

Do not provide only isolated line replacements unless explicitly requested.
```

This user preference must be preserved in future sessions.

---

## 9.2 Error 2 — Brittle Exact Full-Function Match

### Terminal failure

The corrected script next failed during pre-write source matching:

```text
ERROR: desktop duplicated route-label function:
expected one structural anchor; found 0
```

### Cause

The patch attempted to replace the entire `routeKindLabel` function using one exact multiline string.

Although the function existed, its actual whitespace or formatting did not exactly equal the hardcoded patch anchor.

### Impact

The script was designed to prepare all changed content before writing any file.

Because the source match failed during preparation:

```text
- the new routeMetadata.js file was not written
- no package scripts were changed
- no desktop or TV source was partially edited
- the repository remained in the prior green state
```

This was an intentional fail-safe property.

### Solution

The mutation was rewritten to use semantic, anchored regular-expression matches for:

```text
export function routeKindLabel(kind) { ... }
function titleForKind(kind) { ... }
the typedRouteOwner object expression
the routeRegistry import
```

The replacement logic also validated expected markers inside the matched function body before replacing it.

For example, the route-label function was required to contain expected behavior such as:

```text
return 'Unknown'
return 'Not Found'
return 'Make Studio'
```

This prevented a regex from silently deleting an unrelated function.

### Additional Hardening Added

Before the first file write, the corrected patch validated:

```text
- every required new marker exists in the prepared output
- old duplicated functions are absent from prepared output
- all five TV literal labels are removed from TvApp.jsx
- new files do not already exist
- all package scripts are in the expected pre-patch state
```

The successful mutation printed:

```text
All edits were prepared and validated before the first file write.
```

### Workflow Lesson

Use exact string anchors for small, stable statements.

Use bounded semantic regex matching for larger functions whose formatting may vary, and validate the matched body before replacement.

Never write some files and then discover that a later source anchor was wrong.

---

## 9.3 Error 3 — Stale Focus Boundary Expected Literal `Earn ROC` in `TvApp.jsx`

### Failure Context

After the route-metadata implementation was applied:

```text
- 8 shared metadata tests passed
- 6 desktop metadata tests passed
- 11 TV route tests passed
- shared core acceptance passed
- desktop metadata acceptance passed
- desktop production build passed
```

The full TV acceptance then failed in:

```text
scripts/check-crablink-tv-focus-boundary.mjs
```

Error:

```text
Error: TV shell focus boundary is missing: Earn ROC
```

The stale checker still required this literal inside `TvApp.jsx`:

```text
Earn ROC
```

However, the migration had correctly moved that product override to:

```text
apps/crablink-tv/src/navigation/tvRouteMetadata.js
```

and `TvApp.jsx` now projected it using:

```text
tvRouteLabel('earn')
```

The failed full acceptance is recorded in the earlier route-metadata log. 

### Important Nuance

This was not a focus-graph failure.

It was not a visible-copy regression.

It was not a shared-route failure.

It was a stale static scanner whose ownership assumption was no longer correct.

### Solution

The focus checker was updated to verify both sides of the new arrangement:

In `TvApp.jsx`:

```text
tvRouteLabel('earn')
```

In `tvRouteMetadata.js`:

```text
TV_ROUTE_LABEL_OVERRIDES
earn: 'Earn ROC'
export function tvRouteLabel
```

The focus checker now validates:

```text
- the TV shell projects the shared label
- the product-specific Earn ROC override still exists
- visible copy remains protected
- focus behavior remains protected
- confirmed ROC remains display-only
```

### Final Repair Result

The repair passed:

```text
TV_FOCUS_SHARED_LABEL_REPAIR=APPLIED
TV_FOCUS_SHARED_LABEL_PREFLIGHT=GREEN
TV_FOCUS_SHARED_LABEL_BOUNDARY=GREEN
```

The five focused remote-navigation tests passed, and the complete TV check later passed. 

### Workflow Lesson

When moving constants or behavior into shared modules, update static boundary scanners to validate the new ownership chain rather than requiring literals to remain in the old file.

Do not weaken the invariant. Move the invariant check to the new owner.

---

# 10. Final Green Acceptance Results

## 10.1 Shared Core

Final shared-core suite:

```text
18 tests passed
0 failed
```

Composition:

```text
10 crab:// parser tests
8 route-metadata tests
```

Shared boundaries passed:

```text
check-crablink-core-boundary.mjs
check-crablink-route-metadata-boundary.mjs
```

## 10.2 Desktop

Focused desktop shared-parser suite:

```text
5 passed
0 failed
```

Focused desktop route-metadata suite:

```text
6 passed
0 failed
```

Desktop production build:

```text
Vite 5.4.21
323 modules transformed
build completed successfully
```

## 10.3 TV Frontend

TV focus graph:

```text
5 passed
0 failed
```

TV route suite:

```text
11 passed
0 failed
```

TV frontend production build:

```text
47 modules transformed
build completed successfully
```

## 10.4 TV Native Rust

Native test result:

```text
28 passed
0 failed
0 ignored
```

Strict Clippy result:

```text
cargo clippy --all-targets --offline -- -D warnings
green
```

## 10.5 TV Boundaries Confirmed Green

```text
command boundary
gateway-health boundary
pairing-begin boundary
remote-focus boundary
shared route-model boundary
shared route-metadata boundary
settings boundary
pairing boundary
```

## 10.6 Final Safe Markers

```text
TV_PHASE4_ROUTE_METADATA=GREEN
TV_FOCUS_SHARED_LABEL_BOUNDARY=GREEN

SHARED_ROUTE_LABEL_OWNER=@crablink/core
TV_LABEL_PROJECTION=tvRouteLabel
TV_EARN_ROC_OVERRIDE=INTENTIONAL_AND_VERIFIED

FOCUS_BEHAVIOR_CHANGED=NO
DISPLAY_COPY_CHANGED=NO

DESKTOP_PRODUCTION_BUILD=GREEN
TV_FULL_ACCEPTANCE=GREEN

WALLET_RECEIPT_ROC_LEDGER_AUTHORITY_ADDED=NO
PHASE4_EXTRACTION_FAMILY_2=COMPLETE
```

The complete final run, including all 28 native tests and strict Clippy, is recorded in the last acceptance output. 

---

# 11. Files Added During This Session

## Shared core

```text
packages/crablink-core/src/crabUrl.js
packages/crablink-core/src/crabUrl.test.mjs
packages/crablink-core/src/routeMetadata.js
packages/crablink-core/src/routeMetadata.test.mjs
```

## Desktop

```text
apps/crablink-tauri/src/shared/utils/crabUrl.shared.test.mjs
apps/crablink-tauri/src/app/routeMetadata.shared.test.mjs
```

## TV

```text
apps/crablink-tv/src/navigation/tvRouteMetadata.js
```

## Boundary scripts

```text
scripts/check-crablink-core-boundary.mjs
scripts/check-crablink-desktop-shared-crab-url-boundary.mjs
scripts/check-crablink-route-metadata-boundary.mjs
```

---

# 12. Existing Files Modified During This Session

## Shared core/package wiring

```text
packages/crablink-core/src/index.js
packages/crablink-core/package.json
package.json
```

## Desktop parser and routing

```text
apps/crablink-tauri/src/shared/utils/crabUrl.js
apps/crablink-tauri/src/app/routeRegistry.js
apps/crablink-tauri/src/app/router.js
apps/crablink-tauri/package.json
```

## TV route and presentation

```text
apps/crablink-tv/src/navigation/tvRouteModel.js
apps/crablink-tv/src/navigation/tvRouteModel.test.mjs
apps/crablink-tv/src/app/TvApp.jsx
apps/crablink-tv/package.json
```

## Existing boundary scripts updated

```text
scripts/check-crablink-core-boundary.mjs
scripts/check-crablink-tv-route-boundary.mjs
scripts/check-crablink-tv-focus-boundary.mjs
```

---

# 13. Acceptance Logs Created During This Session

```text
/Users/mymac/Desktop/CRABLINK_TV_PHASE4_SHARED_CRAB_URL_20260716_233251.log

/Users/mymac/Desktop/CRABLINK_TV_PHASE4_DESKTOP_SHARED_PARSER_20260716_233912.log

/Users/mymac/Desktop/CRABLINK_TV_PHASE4_SHARED_ROUTE_MODEL_20260716_235205.log

/Users/mymac/Desktop/CRABLINK_TV_PHASE4_ROUTE_METADATA_20260717_000108.log
- failed because the first mutation had a Python syntax error and never executed

/Users/mymac/Desktop/CRABLINK_TV_PHASE4_ROUTE_METADATA_20260717_105212.log
- failed because the corrected mutation had not applied after the brittle source match

/Users/mymac/Desktop/CRABLINK_TV_PHASE4_ROUTE_METADATA_20260717_110028.log
- focused implementation checks were green
- full TV acceptance failed only because of the stale Earn ROC focus-boundary check

/Users/mymac/Desktop/CRABLINK_TV_PHASE4_FOCUS_LABEL_REPAIR_20260717_111049.log
- final green acceptance
```

The final log should be treated as the authoritative end-of-session acceptance record:

```text
/Users/mymac/Desktop/CRABLINK_TV_PHASE4_FOCUS_LABEL_REPAIR_20260717_111049.log
```

---

# 14. Architecture and Authority Boundaries Preserved

## Shared JavaScript Core May Own

```text
- crab:// syntax
- b3 CID normalization
- typed-asset syntax
- caller-supplied built-in route matching
- site-name normalization
- generic route labels
- typed-asset labels
- pure typed-asset route-owner selection
- immutable display descriptions
```

## Shared JavaScript Core Must Not Own

```text
- React components
- desktop lazy page registry
- TV browser history
- TV focus movement
- TV Back behavior
- Chrome APIs
- Tauri APIs
- native command invocation
- network fetch
- gateway selection
- persistent storage
- session secrets
- pairing approval
- wallet operations
- ledger operations
- receipt validation authority
- paid-unlock authority
- reward issuance
- ROC confirmation
- node management
```

## Desktop Still Owns

```text
- lazy React page ownership
- desktop route rendering
- desktop browser/application shell behavior
- desktop-specific components
```

## TV Still Owns

```text
- TV section registry
- TV product copy overrides
- TV browser history
- route depth
- remote Back handling
- focus keys
- focus restoration
- D-pad behavior
- TV-specific rendering
```

---

# 15. Important Nuances to Preserve

## 15.1 Shared Package Imports

The current consumers use direct relative imports into:

```text
packages/crablink-core/src/index.js
```

This is working and green in the current workspace/Vite layout.

Do not casually convert this to another package-resolution strategy without checking workspace/package-lock behavior first.

## 15.2 Parser Built-In Routes Are Caller-Owned

The shared parser must not contain a universal list of desktop or TV routes.

Callers pass their accepted built-in route names.

This prevents the shared parser from becoming a hidden product router.

## 15.3 Serialized TV Route Data Is Not Trusted

Do not trust stored `crabRoute` material from browser history.

Always regenerate normalized route truth from the validated `sectionId`.

## 15.4 Unsupported TV Routes Fail Closed

The current safe fallback is:

```text
Home
```

Do not invent a route or preserve an unsupported route merely because it exists in serialized state.

## 15.5 `Earn ROC` Is an Intentional TV Override

Generic shared formatting would produce:

```text
Earn
```

TV deliberately uses:

```text
Earn ROC
```

This override belongs in:

```text
apps/crablink-tv/src/navigation/tvRouteMetadata.js
```

The shell should project it through:

```text
tvRouteLabel('earn')
```

Static scanners must validate both files rather than demanding the literal remain in `TvApp.jsx`.

## 15.6 No Receipt Truth Has Been Moved Yet

Route metadata includes only display and route-owner selection.

It does not validate receipts.

It does not prove confirmed ROC.

It does not unlock paid content.

It does not authorize a wallet or ledger action.

## 15.7 Existing Core-Boundary Output Has Stale Wording

The shared-core boundary currently still prints:

```text
Consumer migration: intentionally deferred until parser tests are green.
```

That wording was accurate when the parser foundation first landed, but desktop and TV parser migration are now complete.

This is not breaking any test or authority boundary, but it is stale status text.

The next session may update it when touching the shared-core boundary, provided the change remains a truthful boundary statement and does not become a docs-only detour.

A more current statement would describe both consumers as migrated.

## 15.8 Physical Device Gates Remain Separate

This session proved local frontend, desktop, native Rust, and strict Clippy acceptance.

It does not replace physical Android TV device validation.

Still outstanding as a separate device gate:

```text
- build/rebuild APK when appropriate
- install on Android TV hardware
- confirm launcher appearance
- confirm D-pad reachability
- confirm Back behavior on-device
- inspect logcat for crashes and secret-bearing output
```

Do not confuse local Phase 4 green status with physical-device completion.

---

# 16. Next Session — Exact Starting Point

## Immediate Next Slice

```text
TV Phase 4 extraction family 3
RECEIPT_DISPLAY_NORMALIZATION_FOUNDATION
```

The build plan places receipt display normalization immediately after route labels and asset-kind mapping. 

## First Action

Do not immediately write a broad receipt module.

First inspect the actual current desktop receipt surfaces and identify real duplicated pure display behavior.

Likely areas to inspect include current receipt/read-model utilities and consumers such as:

```text
apps/crablink-tauri/src/shared/receipts/
apps/crablink-tauri/src/pages/receipts/
apps/crablink-tauri/src/shared/paid/
apps/crablink-tauri/src/shared/catalog/
```

Use the current repository or a freshly generated codebundle to determine exact filenames and imports.

Do not rely on remembered source formatting.

## Required Scope Decision

Separate three concepts carefully:

```text
1. Receipt display normalization
2. Receipt validation
3. Receipt authority
```

Phase 4 family 3 should implement only number 1.

Allowed shared JavaScript behavior may include pure normalization such as:

```text
- stable receipt status labels
- safe display IDs or shortened hashes
- display-safe timestamps
- operation labels
- confirmed/pending/rejected display posture
- bounded reason labels
- redacted or omission-safe display fields
- immutable display projections
```

The exact functions must be based on real current desktop behavior, not invented abstractions.

## Explicitly Out of Scope for Phase 4 Family 3

Do not move or invent:

```text
- cryptographic receipt verification
- accepted wallet/ledger receipt truth
- paid unlock decisions
- entitlement decisions
- confirmed ROC authority
- balance authority
- wallet mutation
- ledger mutation
- receipt persistence authority
- session secrets
- backend finality
- fake confirmation
```

Receipt display normalization must remain:

```text
display-only
fail-closed
non-authoritative
platform-neutral
```

## Recommended Implementation Order

Follow the same successful extraction cadence:

```text
1. Inspect exact current receipt sources and consumers.
2. Identify one narrow, real duplicated display-normalization family.
3. Add pure shared-core receipt display tests first.
4. Add the shared implementation.
5. Add a no-platform/no-authority boundary.
6. Migrate desktop receipt display behavior.
7. Run focused desktop tests and desktop production build.
8. Add TV consumption only where a real TV receipt/confirmed-ROC display surface exists.
9. Do not add a fake TV receipt UI merely to claim migration.
10. Run full shared-core, desktop, and TV acceptance.
```

## Expected New Shared Files

Names should be confirmed against actual source, but the likely shared shape is:

```text
packages/crablink-core/src/receiptDisplay.js
packages/crablink-core/src/receiptDisplay.test.mjs
```

Potential export namespace:

```text
@crablink/core/receipt-display
```

Do not commit to exact function names until the current desktop receipt code has been inspected.

## Expected Tests

Tests should prove at minimum:

```text
- valid receipt display input normalizes deterministically
- absent optional fields do not invent values
- unknown status fails to a non-confirmed posture
- confirmed labels require explicit confirmed input
- pending labels cannot be displayed as confirmed
- rejected/failed input cannot become paid or confirmed
- IDs/hashes are bounded and display-safe
- secret-shaped or unknown fields are discarded
- outputs are immutable where practical
- no receipt display function mutates input
```

## Acceptance Sequence

After the next patch, use focused checks before broad checks.

Suggested order:

```bash
cd /Users/mymac/Desktop/crablink

npm run core:check
npm run core:desktop:check
npm run core:desktop:route-metadata:check
npm run tv:route:test
npm run tv:focus:test
npm --prefix apps/crablink-tauri run build
npm run tv:check
```

Add new receipt-specific commands before the broad checks once they exist.

---

# 17. Remaining Phase 4 Work After Receipt Display Normalization

After family 3 is complete:

```text
4. gateway/settings/diagnostics adapter contracts
5. memory adapters for tests
```

## Family 4 — Adapter Contracts

This should extract pure interfaces/contracts only.

Potential shared concerns:

```text
- gateway profile view shape
- settings adapter shape
- diagnostics projection shape
- error/result envelopes
```

Must not move:

```text
- Tauri invoke calls
- native networking
- Android platform behavior
- environment variables
- persistent storage
- secret handling
```

## Family 5 — Memory Adapters

This should provide deterministic test adapters for:

```text
- settings
- gateway profiles
- diagnostics
- receipt display models
```

They must be test support, not fake production success.

Memory adapters must not fabricate:

```text
- successful pairing
- device-bound sessions
- confirmed ROC
- paid unlocks
- accepted receipts
- balances
- ledger finality
```

---

# 18. Development and Terminal Workflow to Preserve

## Patch Style

Always provide:

```text
Terminal 1 — complete mutation block
Terminal 2 — complete verification block
```

If a correction is required, provide the entire corrected blocks again.

Do not provide only isolated replacement lines unless explicitly requested.

## Source Safety

Before writing:

```text
- validate required source files
- validate expected current-state markers
- prepare every output
- validate required new markers
- validate removal of old duplicate markers
- only then write files
```

## Failure Handling

```text
- stop at the first real failure
- identify whether it is mutation, source mismatch, syntax, test, build, or boundary
- fix the exact failure before expanding scope
- do not run broad checks after mutation preflight fails
```

## Shell Behavior

```text
- do not use exit inside provided functions
- return statuses
- keep the terminal open
- capture and print the first failed step
```

## Commands Not to Add

Do not include:

```text
git add
git commit
git push
```

No Git mutations should be performed unless the user explicitly reverses the current restriction.

Do not add CPU-limiter environment settings unless explicitly requested.

---

# 19. Current Native TV Authority Surface

The current registered native TV commands remain:

```text
tv_diagnostics
tv_gateway_health
tv_gateway_profile
tv_pairing_begin
tv_pairing_status
tv_settings_read
```

Current capabilities remain:

```text
core:default
```

The current native boundaries still prove:

```text
- reviewed fixed gateway-health path
- reviewed fixed pairing-begin path
- bounded request timeouts
- bounded response sizes
- no redirects
- no arbitrary URL requests
- no ambient proxy use
- no credential exposure
- no local pairing approval
- no session fabrication
- no wallet authority
- no ledger authority
- no reward authority
- no ROC authority
- no node/operator/creator authority
```

All 28 native tests remained green after the shared JavaScript migrations.

---

# 20. Pairing Status Still Not Implemented Beyond Current Foundation

The current pairing surface remains a truthful private-beta foundation.

Present:

```text
- gateway profile review
- gateway health
- pairing readiness
- pairing begin
- backend-issued challenge projection
- seven fixed read-only scopes
- trusted desktop/mobile approval requirement
```

Still absent:

```text
- challenge polling
- approved session creation
- device-bound secure session persistence
- authenticated content requests
- unpair/revoke-self flow
- session revocation propagation
```

Do not let the next shared-JavaScript phases accidentally imply that pairing is complete.

---

# 21. Theme and Platform Notes to Preserve

For CrabLink TV:

```text
- preserve dark, light, and system theme support
- dark remains the intended default before physical APK/device testing
- do not remove light mode
```

Notes separation:

```text
ANDROID_TV_NOTES.md = CrabLink TV only
ANDROID_NOTES.md    = future regular Android client only
```

Do not merge the regular Android application plan into the TV notes.

Future platform direction remains:

```text
desktop
Android TV
regular Android
iOS
```

The current active implementation remains CrabLink TV Phase 4.

---

# 22. Final Next-Session Handoff

Start the next session with this exact status:

```text
Repository:
/Users/mymac/Desktop/crablink

Current phase:
CrabLink TV Phase 4

Completed:
Extraction family 1 — crab:// parser and normalized route model
Extraction family 2 — route labels and asset-kind mapping

Green:
18 shared-core tests
5 desktop parser migration tests
6 desktop route-metadata tests
11 TV route tests
5 TV focus tests
28 native TV tests
desktop production build
TV production build
strict native Clippy

Next slice:
Receipt display normalization foundation

Do not redo:
shared crab:// parser
desktop parser compatibility migration
TV shared route model
shared route labels
asset-kind labels
typed-asset route-owner mapping
TV Earn ROC label projection
focus-boundary repair

First next action:
Inspect the real current desktop receipt display sources and identify the
smallest platform-neutral display-normalization behavior family.

Authority rule:
Display normalization only.
No receipt truth, paid unlock, confirmed ROC, wallet, or ledger authority.
```

Final safe conclusion:

```text
CrabLink TV Phase 4 is in progress.

Extraction family 1 is complete and green.
Extraction family 2 is complete and green.

The project is ready to begin:
RECEIPT_DISPLAY_NORMALIZATION_FOUNDATION
```

The next session should use these notes together with a current CrabLink codebundle or direct repository inspection, since the codebundle was not regenerated after the final green repair.



### END NOTE - JULY 17 2026 - 11:40 CST


### BEGIN NOTE - JULY 18 2026 - 13:15 CST

These are ready to paste into `ANDROID_TV_NOTES.md` as the authoritative handoff for the next CrabLink TV session.

### BEGIN NOTE — JULY 18, 2026 — CRABLINK TV PHASE 6 NETWORK READINESS HANDOFF

# CrabLink TV Comprehensive Carry-Over Notes

**Date:** July 18, 2026
**Repository:** `/Users/mymac/Desktop/crablink`
**Primary TV application:** `apps/crablink-tv`
**Desktop compatibility application:** `apps/crablink-tauri`
**Shared JavaScript packages:** `packages/crablink-core`, `packages/crablink-platform`
**Shared native crate:** `crates/crablink-native-core`
**Android TV notes file:** `ANDROID_TV_NOTES.md`
**Regular Android notes file:** `ANDROID_NOTES.md`
**Latest build plan supplied:** `CRABLINK_TV_BUILDPLAN(4).MD`
**Latest codebundle supplied:** `CODEBUNDLE_TAURI_APP(36).md`
**Git operations performed during this work:** None
**Codebundle regenerated after the final failed attempt:** No
**Current active phase:** TV Phase 6 — TV Settings and Network Profile
**Current active slice:** Phase 6 slice 2B — visible network profile and manual readiness retry
**Current repository condition:** Last verified green baseline preserved; Phase 6 slice 2B was not applied

---

# 0. Executive Status

The CrabLink TV project is healthy and making real progress.

The project is not in a broken or partially mutated state. The most recent Phase 6 slice 2B mutation attempt failed during its pre-write Python parsing step and printed:

```text
REPOSITORY_UNCHANGED=YES
DO_NOT_RUN_VERIFICATION=YES
```

Therefore, none of the proposed Phase 6 slice 2B files or modifications were written.

The current safe project status is:

```text
CRABLINK_TV_PHASE0=COMPLETE
CRABLINK_TV_PHASE1=COMPLETE
CRABLINK_TV_PHASE2=COMPLETE_WITH_ARMV7_DEVICE_PROOF
CRABLINK_TV_PHASE3=COMPLETE
CRABLINK_TV_PHASE4=COMPLETE
CRABLINK_TV_PHASE5=COMPLETE

PHASE6_SLICE_1=COMPLETE
PHASE6_SLICE_2A=COMPLETE
PHASE6_SLICE_2B=NOT_APPLIED

PHASE6_OVERALL=NOT_COMPLETE
LAST_GREEN_BASELINE=PRESERVED
REPOSITORY_DAMAGED=NO
NEXT_ACTION=REPAIR_AND_APPLY_PHASE6_SLICE_2B
```

The last fully verified green run proved:

```text
TV_PHASE6_NETWORK_READINESS_MODEL=GREEN
PLATFORM_CONTRACT_TEST_COUNT=9
TV_NETWORK_READINESS_TEST_COUNT=5
TV_NATIVE_TEST_COUNT=31
GATEWAY_HEALTH_PORT_METHOD_COUNT=1
FIXED_GATEWAY_HEALTH_COMMAND=tv_gateway_health
NATIVE_HEALTH_RESULT_SCHEMA_BOUND=YES
NATIVE_SETTINGS_SCHEMA_BOUND=YES
MANAGED_HTTPS_PROJECTION=YES
DEVELOPMENT_LAN_VISIBILITY=YES
GATEWAY_ORIGIN_DISCLOSURE=redacted
MALFORMED_HEALTH_FAILS_CLOSED=YES
RETRYABLE_FAILURE_REMAINS_UNAVAILABLE=YES
REACT_NETWORK_UI_ADDED=NO
AUTOMATIC_POLLING_ADDED=NO
ARBITRARY_NETWORK_AUTHORITY_ADDED=NO
SESSION_WALLET_LEDGER_ROC_AUTHORITY_ADDED=NO
ANDROID_ARMV7_NATIVE_CORE_COMPILES=YES
CODEBUNDLE_PHASE6_COVERAGE=GREEN
CODEBUNDLE_REGENERATED=NO
PHASE6_SLICE_2A=COMPLETE
NEXT_SLICE=NETWORK_PROFILE_UI_AND_MANUAL_RETRY
```

That run included five passing readiness-model tests, nine passing platform-contract tests, all 31 TV native tests, strict Rust Clippy, an ARMv7 shared-core check, a desktop production build, and the complete `npm run tv:check` acceptance chain. 

---

# 1. Latest Source-of-Truth References

The supplied build plan defines CrabLink TV as a separate, remote-first, client-only Android/Tauri application. It must share canonical CrabLink behavior without importing desktop node, operator, creator-authority, wallet-key, ledger-mutation, or bridge behavior. The plan contains 20 phases, numbered 0 through 19. 

The latest codebundle was generated on July 18, 2026 and contains the current desktop app, TV app, Android project, shared packages, shared native crate, and selected boundary scripts. The bundle states that the repository remains the source of truth. 

The latest codebundle confirms the current Phase 6 state:

```text
Present:
  apps/crablink-tv/src/network/tvNetworkReadiness.js
  apps/crablink-tv/src/network/tvNetworkReadiness.test.mjs
  scripts/check-crablink-tv-network-readiness-boundary.mjs

Not present:
  apps/crablink-tv/src/network/tvNetworkReadinessInteraction.js
  apps/crablink-tv/src/network/tvNetworkReadinessInteraction.test.mjs
  apps/crablink-tv/src/network/useTvNetworkReadiness.js
  apps/crablink-tv/src/network/TvNetworkReadinessPanel.jsx
```

The TV package currently runs the Phase 6 slice 2A model test and boundary, but it does not yet contain the proposed slice 2B interaction-test command. 

This proves that the failed slice 2B attempts did not partially land.

---

# 2. Product Direction and Platform Boundaries

CrabLink TV is not intended to be the desktop application displayed on a television.

The TV application is:

```text
remote-first
ten-foot UI
browse-first
playback-first
client-only
gateway-controlled
pairing-capable
receipt-display capable
confirmed-ROC display capable
strictly bounded
```

The desktop application remains the full workstation:

```text
creator tools
file and media workflows
advanced configuration
User Node controls
Service Node Operator Mode
moderation and persistence review
detailed receipts and account inspection
keyboard and mouse workflows
dense forms and information
```

The TV application should eventually emphasize:

```text
Home rails
creator browsing
content details
video
audio
streams
podcasts
Continue Watching
library
existing paid entitlements
display-only receipts
display-only confirmed ROC
pairing with a trusted companion
simple device/network settings
```

The TV must not gain:

```text
micronode runtime
Service Node runtime
operator administration
creator publishing authority
wallet private keys
seed phrases
direct ledger mutation
local ROC minting
reward planning
direct provider fallback
ROX or Solana runtime
bridge settlement
staking
liquidity
exchange behavior
fake receipts
fake balances
fake finality
```

React owns presentation and explicit user intent. Tauri Rust owns controlled native commands, validation, transport, session handling, integrity checks, and secure storage when those later phases are implemented.

---

# 3. Hardware and APK Facts

The target Android TV device is an RK3528/RK3539-class box with approximately:

```text
4 GB RAM
32 GB storage
Android TV OS 14
```

The processor hardware is 64-bit capable, but the installed Android operating system accepts the 32-bit ARM build and rejected the 64-bit APK.

Therefore:

```text
CURRENT_REQUIRED_APK_ABI=ARMv7
ANDROID_TARGET=armv7-linux-androideabi
```

The successful installation method is:

```text
1. Build the ARMv7 APK on the Mac.
2. Copy the APK to a USB thumb drive.
3. Plug the thumb drive into the Android TV box.
4. Open the APK through the TV file manager.
5. Install/update the application.
6. Launch it through the TV application screen.
```

ADB installation is not the user’s preferred device workflow. ADB remains useful later for diagnostics, key events, logs, performance measurements, and automated acceptance, but APK transfer for ordinary visual checkpoints should use the thumb drive.

The user decided not to spend time testing another APK immediately because Phase 6 and Phase 7 are still primarily infrastructure. The next important APK checkpoint should be around Phase 10, after substantial visual and playback work is present.

---

# 4. Completed Phase Ledger

## Phase 0 — Baseline and desktop protection

Status:

```text
COMPLETE
```

The TV project began without restarting or rewriting the existing CrabLink desktop implementation.

The desktop app has repeatedly remained buildable while shared packages and the TV application were added.

Desktop compatibility remains part of major TV acceptance sweeps.

No broad desktop refactor was performed before proving the TV app.

---

## Phase 1 — Sibling TV application scaffold

Status:

```text
COMPLETE
```

Implemented:

```text
apps/crablink-tv
separate React/Vite application
separate Tauri Rust host
separate package scripts
separate Tauri configuration
separate capability file
identifier com.rustyonions.crablink.tv
minimal TV command registry
host build support
TV-specific shell
```

The TV app is a sibling application in the existing CrabLink repository rather than a separate repository.

The desktop application and TV application remain distinct products.

The TV host capability set remains narrow.

---

## Phase 2 — Android initialization and launcher proof

Status:

```text
COMPLETE_WITH_ARMV7_DEVICE_PROOF
```

Implemented and proven:

```text
Tauri Android project generated
Android TV launcher category
LEANBACK_LAUNCHER behavior
TV banner resources
TV application icon resources
touchscreen not required
TV/leanback manifest posture
landscape-oriented presentation
Android APK output path
ARMv7 APK build
physical installation and launch
```

The application successfully installed and launched on the Android TV box when built for the 32-bit ARM target.

The current APK output directory is under:

```text
apps/crablink-tv/src-tauri/gen/android/app/build/outputs/apk
```

The project preserves Android-generated output boundaries and relevant `.gitignore` coverage.

---

## Phase 3 — Remote focus and TV shell foundation

Status:

```text
COMPLETE
```

Implemented:

```text
deterministic spatial focus graph
D-pad up/down/left/right behavior
remote Select/Enter handling
visible focus rings
explicit initial focus
scroll-into-view behavior
TV Back handling
route history foundation
route focus restoration
static Home/Account/Settings navigation
TV shell replacing the minimal landing page
```

Focused focus-graph tests were added and passed.

The focus boundary proves:

```text
arrows navigate
Enter/Select activates
initial focus is explicit
focus remains visible
dark/light/system themes preserve focus visibility
ROC posture remains display-only
```

The app supports dark, light, and system theme selections.

Dark mode remains the default for first run.

Light and system modes must not be removed.

The persistent theme key is:

```text
crablink.theme.mode
```

Remote navigation remains a central invariant for all future UI.

New controls must be:

```text
button or other semantic native control
data-tv-focusable="true"
given a stable data-tv-focus-key
visible under dark/light/system themes
reachable without touch
```

---

## Phase 4 — Shared JavaScript packages

Status:

```text
COMPLETE
```

Platform-neutral behavior was moved into real shared packages.

Implemented families include:

```text
canonical crab:// parsing
normalized route model
route labels
asset-kind mapping
receipt display normalization
adapter contracts
memory/test adapters
```

Desktop and TV share canonical route behavior instead of maintaining divergent parsers.

The shared packages do not own backend authority.

`@crablink/core` remains pure and platform-neutral.

`@crablink/platform` owns narrow immutable adapter contracts.

The shared platform package now contains exact ports for:

```text
diagnostics
gateway requests
gateway profile reads
gateway health checks
settings
read-only settings
```

Memory adapters remain deterministic test fixtures and are not imported by production desktop or TV sources.

---

## Phase 5 — Shared native validation core

Status:

```text
COMPLETE
```

A shared Rust validation crate exists at:

```text
crates/crablink-native-core
```

The crate is independent of Tauri and Android.

It owns reusable native validation for behavior such as:

```text
crab:// validation
B3 validation
confirmed-ROC projection
receipt-related validation
pairing DTO validation
request timeout validation
```

Both desktop and TV use shared native behavior without duplicating core acceptance rules.

The last acceptance baseline included:

```text
SHARED_NATIVE_CORE_TEST_COUNT=22
ANDROID_ARMV7_NATIVE_CORE_COMPILES=YES
```

The TV Tauri command modules remain thin adapters around shared validation and controlled transport.

---

# 5. Gateway and Pairing Foundation Completed Before Phase 6

The TV currently registers these native commands:

```text
tv_diagnostics
tv_gateway_health
tv_gateway_profile
tv_pairing_begin
tv_pairing_status
tv_settings_read
```

No node, operator, creator, wallet, reward, or ledger commands exist in the TV registry.

## Gateway profile

The native gateway profile supports:

```text
release HTTPS profile
explicit private development-LAN profile
unconfigured state
invalid state
```

Validation rejects:

```text
credentials in URLs
paths where only an origin is allowed
queries and fragments
invalid ports
TV loopback addresses for development-LAN use
cleartext release profiles
unapproved origins
invalid timeout values
```

Development LAN is explicitly marked and is not allowed to masquerade as a release profile.

Configured origins are redacted from frontend DTOs.

## Gateway health

The native command:

```text
tv_gateway_health
```

performs one fixed reviewed request:

```text
GET /healthz
```

The boundary enforces:

```text
1–30 second timeout
16 KiB maximum streamed response
no arbitrary caller URL
no redirects
no ambient proxy use
no credentials
no response-body exposure
no pairing/session authority
no wallet/ledger/reward/ROC authority
```

## Pairing begin

The native pairing-begin command uses a fixed reviewed route:

```text
POST /v1/tv/pairing
```

The pairing request has:

```text
validated device name
64-byte maximum device name
seven fixed read-only scopes
native clock
1–30 second timeout
8 KiB maximum response
no redirects
no ambient proxy use
no arbitrary caller URL
```

The backend is the only challenge authority.

A trusted desktop or mobile CrabLink companion is the future approval authority.

The TV does not approve itself.

The current pairing frontend can truthfully show:

```text
unconfigured
ready to begin
waiting for approval
sanitized failure
```

It does not create a session.

It does not invent a pairing code.

It does not mark the device paired without authoritative session material.

---

# 6. Phase 6 Work Completed

Phase 6 is titled:

```text
TV Settings and Network Profile
```

The build-plan goal is to add safe TV settings and a truthful LAN/private-beta connectivity model. Its final exit gate requires the physical TV to reach the controlled gateway, release configuration to reject cleartext/unapproved origins, and the development profile to remain visibly marked. 

## Phase 6 slice 1 — typed settings and redacted profile

Status:

```text
COMPLETE / GREEN
```

Implemented:

```text
typed native settings snapshot
gateway state
gateway profile
gateway display label
gateway connection-allowed flag
development-profile flag
redacted origin disclosure
bounded request timeout
release HTTPS requirement
local settings authority label
```

Current schema:

```text
crablink.tv.settings-snapshot.v3
```

Relevant fields:

```text
gatewayState
gatewayProfile
gatewayDisplayLabel
gatewayConnectionAllowed
gatewayDevelopmentProfile
gatewayOriginDisclosure
requestTimeoutMs
releaseHttpsRequired
settingsAuthority
```

Important values:

```text
gatewayOriginDisclosure=redacted
settingsAuthority=local-ui-preferences-only
```

The native settings snapshot does not expose the configured gateway URL.

The current React settings page includes local device preferences for:

```text
theme
resource mode
participation preference
```

The participation preference is only local future scheduling intent.

It does not start verification work.

It does not create evidence.

It does not create ROC.

It does not change wallet or ledger state.

The current native truth still reports:

```text
Micronode attachment: not active in this build
```

---

## Phase 6 slice 2A — pure network-readiness model

Status:

```text
COMPLETE / GREEN
```

Added:

```text
apps/crablink-tv/src/network/tvNetworkReadiness.js
apps/crablink-tv/src/network/tvNetworkReadiness.test.mjs
scripts/check-crablink-tv-network-readiness-boundary.mjs
```

The shared platform package gained:

```text
createGatewayHealthPort
```

The exact method is:

```text
checkGatewayHealth
```

The TV adapter exports:

```text
tvGatewayHealthPort
```

The adapter invokes only:

```text
tv_gateway_health
```

The pure readiness projection validates:

```text
settings schema v3
gateway-health-result schema v1
settings authority
redacted origin posture
release HTTPS requirement
allowed profile values
allowed health states
status and response-byte bounds
healthy-state consistency
retryable-state consistency
```

Current health schema:

```text
crablink.tv.gateway-health-result.v1
```

The projection can produce:

```text
idle
checking
unconfigured
blocked
ready_to_check
healthy
unavailable
rejected
```

Important behavior:

```text
malformed native health results fail closed
unconfigured profiles never become healthy
invalid profiles never become healthy
retryable failures remain unavailable
development LAN remains visibly identified
gateway origin remains redacted
no network execution exists in the pure model
no automatic polling exists
```

Five focused tests passed:

```text
managed profile is redacted and ready for manual check
development LAN profile remains visibly marked
unconfigured and invalid profiles never become healthy
healthy and retryable unavailable results remain distinct
malformed health result fails closed without fake readiness
```

The complete Phase 6 slice 2A acceptance run is the latest green repository baseline.

---

# 7. Phase 6 Slice 2B — Intended Scope

Phase 6 slice 2B is the next required implementation.

Its purpose is to turn the green Phase 6 model into a visible, remote-friendly TV surface.

Expected new files:

```text
apps/crablink-tv/src/network/tvNetworkReadinessInteraction.js
apps/crablink-tv/src/network/tvNetworkReadinessInteraction.test.mjs
apps/crablink-tv/src/network/useTvNetworkReadiness.js
apps/crablink-tv/src/network/TvNetworkReadinessPanel.jsx
```

Expected integrations:

```text
apps/crablink-tv/src/settings/TvSettingsPanel.jsx
apps/crablink-tv/src/app/TvApp.jsx
apps/crablink-tv/src/styles/tv.css
scripts/check-crablink-tv-network-readiness-boundary.mjs
scripts/check-crablink-tv-settings-boundary.mjs
scripts/check-crablink-tv-focus-boundary.mjs
scripts/check-crablink-tv-codebundle-boundary.mjs
apps/crablink-tv/package.json
package.json
```

Expected visible behavior:

```text
Gateway readiness panel
managed HTTPS label
development-LAN warning label
redacted/hidden endpoint label
request timeout display
health state display
sanitized finding/error class
Check connection button
Check again button
checking state
manual retry recommendation
ARIA live feedback
remote focus support
```

Expected interaction behavior:

```text
initial mount reads the native settings snapshot only
initial mount does not execute gateway health transport
health check runs only after explicit user action
one native settings read precedes the health check
duplicate button actions share one in-flight operation
button disables while checking
health errors preserve only redacted settings data
raw error text is not placed in React state
no automatic polling
```

Expected focus key:

```text
settings-network-check
```

Expected focused interaction tests:

```text
profile load reads settings without running health transport
manual check reads settings then invokes one fixed health operation
duplicate manual checks share one in-flight operation
settings failure blocks health execution and fails closed
health failure preserves only the redacted settings snapshot
```

Expected completion marker:

```text
PHASE6=COMPLETE
NEXT_PHASE=PHASE7_ROUTE_ERROR_AND_OVERLAY_FOUNDATION
```

---

# 8. Failed Phase 6 Slice 2B Attempts

Two slice 2B mutation attempts occurred. Neither wrote repository files.

## Attempt 1 — hardcoded esbuild path

The mutation attempted to validate staged JSX through:

```text
node_modules/.bin/esbuild
```

The expected local binary was not found at that exact hardcoded path.

The mutation correctly stopped before writes:

```text
PRECHECK_FAILED: local esbuild binary is missing; no download was attempted
REPOSITORY_UNCHANGED=YES
PHASE6_NETWORK_READINESS_UI_MUTATION_STOPPED=YES
DO_NOT_RUN_VERIFICATION=YES
```

The TV production build had previously succeeded, so the issue was not that the frontend toolchain was generally unavailable. The issue was that the mutation script assumed one exact binary location.

Terminal 2 was run despite the explicit `DO_NOT_RUN_VERIFICATION=YES` output. It reported the expected missing new source file:

```text
MISSING_SOURCE=apps/crablink-tv/src/network/tvNetworkReadinessInteraction.js
```

That was confirmation that no mutation occurred.

## Attempt 2 — corrected resolver with Python syntax error

The next mutation added a local esbuild resolver, but contained this invalid Python structure:

```python
ESBUILD_COMMAND =
    resolve_esbuild_command()
```

Python does not allow an assignment to end after the equals sign unless the expression is explicitly enclosed in parentheses or otherwise continued.

The mutation failed while parsing the embedded Python before any write:

```text
File "<stdin>", line 392
    ESBUILD_COMMAND =
                     ^
SyntaxError: invalid syntax
```

The script again printed:

```text
REPOSITORY_UNCHANGED=YES
DO_NOT_RUN_VERIFICATION=YES
```

Terminal 2 was again run afterward and again found the expected missing interaction source.

Current conclusion:

```text
SLICE2B_ATTEMPT_1=NO_WRITES
SLICE2B_ATTEMPT_2=NO_WRITES
REPOSITORY_UNCHANGED=YES
OLD_PATCHES_MUST_NOT_BE_RERUN
```

---

# 9. Exact First Action for the Next Session

Do not begin Phase 7.

Do not rerun either previous Phase 6 slice 2B block.

Do not regenerate the codebundle before repairing the slice.

Start from the latest green Phase 6 slice 2A source.

The immediate repair is to correct the Python assignment in a complete regenerated mutation block:

```python
ESBUILD_COMMAND = resolve_esbuild_command()
```

or:

```python
ESBUILD_COMMAND = (
    resolve_esbuild_command()
)
```

The next mutation must still:

```text
validate all expected current-source anchors before writing
confirm slice 2B files do not already exist
stage every new full file
prepare every edited file in memory
syntax-check JavaScript and boundary scripts
validate staged JSX with a locally resolved tool
perform no download
write nothing until all prechecks pass
use atomic replacement
print APPLIED markers only after writes succeed
run a post-write TV production build
```

The mutation must not merely patch the one Python line in isolation. Because neither earlier mutation wrote anything, provide a complete corrected Phase 6 slice 2B mutation block and a separate verification block.

Before the first repository write, the corrected script should prove:

```text
tvNetworkReadiness.js exists
tvNetworkReadiness.test.mjs exists
tvGatewayHealthPort exists
tv_settings_read exists
tv_gateway_health exists
Phase 6 slice 2B files do not exist
TvSettingsPanel remains at the known slice 2A baseline
TvApp remains at the known slice 2A baseline
network-readiness boundary remains at the known slice 2A baseline
focus/settings/codebundle boundary anchors each match exactly once
```

Do not use a hardcoded assumption that esbuild must exist at one path.

A safer validation strategy is:

```text
1. Search normal repository and app-local node_modules locations.
2. Use an already-installed local executable if present.
3. Use npm exec --offline only if it resolves from installed packages.
4. Attempt no network access.
5. Abort with REPOSITORY_UNCHANGED=YES if no local validator resolves.
```

The Python syntax should itself be checked carefully before the block is delivered.

---

# 10. Recommended Next-Session Command Cadence

The repository ended the current session at a verified green baseline. Do not waste the beginning of the next session rerunning every broad test before making the slice 2B repair.

Preferred cadence:

```text
1. Inspect the latest carry-over notes.
2. Inspect the current Phase 6 files from codebundle 36.
3. Prepare the corrected complete slice 2B mutation.
4. Run mutation.
5. Confirm every APPLIED marker.
6. Run focused interaction tests.
7. Run network-readiness boundary.
8. Run settings and focus boundaries.
9. Run TV production build.
10. Run complete tv:check once.
11. Run ARMv7 shared-core check.
12. Run desktop production build.
13. Mark Phase 6 complete.
```

Do not run the verification block when mutation output contains:

```text
DO_NOT_RUN_VERIFICATION=YES
```

If the mutation fails before writes, inspect the exact failure and prepare a corrected full mutation block. Do not rerun the failed block unchanged.

If the mutation writes files but a post-write check fails, perform a targeted repair against the actual new source. Do not rerun the original create-only mutation.

---

# 11. Momentum and Acceleration Strategy

The user wants faster progress without sacrificing correctness.

The project should continue using QuickChain discipline, but the slices can be more coherent and less microscopic.

## One discovery pass per session

At the beginning of a session:

```text
read ANDROID_TV_NOTES.md
read the latest build plan section
inspect the latest codebundle once
identify exact source anchors
```

Do not repeatedly rediscover the same files before every patch.

## Focused checks during a phase

After a behavior slice, run only the checks directly affected by that slice.

Examples:

```text
pure model tests
specific boundary script
TV frontend build
focused Rust module tests
```

Do not run the complete desktop build, ARMv7 check, all native tests, and full TV acceptance after every tiny edit.

## Full checks at meaningful boundaries

Run broad acceptance:

```text
when a phase closes
before an APK checkpoint
after changing shared packages used by desktop and TV
after changing native command registration
after changing Android project configuration
```

## Larger coherent patches

A good accelerated slice can include:

```text
one model
its tests
one React surface
its integration
one boundary update
its package scripts
```

Avoid splitting a single small feature across many sessions when the exact source is already known.

Still avoid combining unrelated phase goals into one enormous mutation.

## Codebundle policy

Do not regenerate the approximately multi-megabyte codebundle after every small patch.

Regenerate when:

```text
a phase closes
a major source mismatch appears
the next session needs a new complete source reference
an APK milestone is reached
the user explicitly requests it
```

## Stable validation markers

Validate:

```text
function names
component names
command names
schema names
focus keys
script names
short state identifiers
```

Do not validate long prose paragraphs that can wrap or be reworded harmlessly.

## Tool-path discipline

Do not assume:

```text
node_modules/.bin/esbuild
```

or another tool exists in one exact location.

Use package scripts and installed local resolution where practical.

The fact that:

```text
npm --prefix apps/crablink-tv run build
```

passes is stronger evidence than a brittle direct path check.

## Mutation discipline

Every mutation must:

```text
precheck first
write nothing until validation completes
use atomic writes
print REPOSITORY_UNCHANGED=YES on pre-write failure
verify every expected new file exists before broad testing
print clear APPLIED markers
```

## Terminal discipline

Continue these rules:

```text
no git commands
no downloads unless explicitly requested
no exit or exit 0 at the end of terminal blocks
no zsh pipestatus acceptance wrappers
no CPU limiters unless explicitly requested
mutation and verification remain separate blocks
full corrected blocks rather than isolated line replacements
```

---

# 12. Phase 7 Plan — Route Error and Overlay Foundation

Phase 7 is:

```text
TV Route Stack and crab:// Navigation
```

Its goal is to build a TV-specific route registry, route stack, Back behavior, focus restoration, typed problem routes, and Android deep-link intake. 

Recommended accelerated Phase 7 structure:

## Phase 7A — route state and typed failures

Implement together:

```text
TV route registry
supported route ownership
route stack
typed not-found route
typed problem route
unsupported-route rejection
malformed-route rejection
route transition tests
```

Use the existing shared `crab://` parser and route metadata.

Do not create another route parser.

## Phase 7B — overlays and Back priority

Implement:

```text
overlay state
problem overlay
detail overlay
Back priority model
close overlay before route pop
restore focus after overlay close
restore focus after route return
```

Target Back order:

```text
close overlay
→ hide player chrome when applicable
→ leave detail
→ return to rail
→ return to root
```

## Phase 7C — Android intent intake

Implement only after the in-app route stack is green:

```text
approved crab:// intent filter
native validated deep-link intake
onNewIntent handling if required
sanitized handoff from Android to Rust/React
malformed intent rejection
unsupported route rejection
focus selection after intent open
```

Do not add a broad Android plugin until the standard path is proven insufficient.

Phase 7 is visually noticeable through problem views, overlays, transitions, and Back behavior, but it remains mostly navigation infrastructure.

---

# 13. Phase 8 Plan — Home Catalog and Creator Browsing

Phase 8 is the major visual turning point.

The build plan requires real backend-derived catalog data, TV rails, bounded images, creator/profile pages, truthful loading/error states, and focus restoration. 

Recommended accelerated Phase 8 structure:

## Phase 8A — typed catalog contract

Implement:

```text
catalog DTO model
strict response normalization
gateway/omnigate read-only port
loading state
malformed-response state
unavailable state
empty state
no fake sample-data acceptance mode
```

The model should support only rails backed by actual data.

Potential rail labels:

```text
Continue Watching
Following
Recent Purchases
Recently Viewed
Featured or Recent Public Content
Creators
```

Do not display a rail merely because a static placeholder exists.

## Phase 8B — TV rails and cards

Implement:

```text
large TV content cards
horizontal rails
bounded thumbnail loading
fallback artwork
visible focus scaling/border
rail scrolling
focus memory
empty rail omission or truthful empty state
```

Cards should not reproduce dense desktop layouts.

## Phase 8C — creator browsing

Implement:

```text
creator/profile route
creator header
creator content rails
loading and unavailable states
open creator from Home
Back to originating card
focus restoration after refresh
```

Phase 8 should be the first APK where the application visibly starts resembling a complete media product.

---

# 14. Phase 9 Plan — B3 Asset and Content Views

Phase 9 adds real content proof.

The build plan requires at least one real image and one real text/article asset, full BLAKE3 verification for fetched small bytes, typed manifest validation, and corrupt-asset rejection. 

Recommended accelerated Phase 9 structure:

## Phase 9A — manifest and verified-byte foundation

Implement:

```text
typed asset-manifest command/port
canonical crab:// validation
canonical B3 validation
bounded response size
full BLAKE3 verification
content-type validation
asset-kind validation
no direct provider fallback
```

## Phase 9B — image and article views

Implement:

```text
image detail screen
text/article detail screen
manifest/service verification label
loading state
unavailable state
privacy-route unavailable state
unsupported-kind state
corrupt-byte state
hash-mismatch state
oversized-response state
content-type mismatch state
```

Acceptance must include a deliberately corrupted response that is visibly rejected.

No cache or frontend state may override an integrity failure.

---

# 15. Phase 10 Plan — Media Playback Proof

Phase 10 is the intended next APK milestone.

The build plan requires one real video and one real audio item to play on the target box with remote controls, buffering/error states, Continue Watching, resource cleanup, and repeated playback tests. 

Recommended accelerated Phase 10 structure:

## Phase 10A — player state model and route

Implement:

```text
TV player route
player view model
idle/loading/ready/playing/paused/buffering/error/ended states
media manifest projection
verified-service labels
route exit cleanup contract
focused tests
```

## Phase 10B — WebView video and audio proof

Start with normal HTML media elements inside the Tauri WebView.

Implement:

```text
video playback
audio playback
play/pause
seek forward
seek backward
Back behavior
fullscreen-style TV presentation
buffering indication
sanitized playback errors
remote focus and media-key behavior
```

Do not introduce Android Media3 merely because it is available.

The build plan explicitly says Media3 should be added only if device evidence shows the WebView player cannot meet required behavior.

## Phase 10C — Continue Watching and stability

Implement:

```text
bounded progress persistence
Continue Watching rail integration
route-exit resource release
repeated open/close test
30-minute video test
30-minute audio test
background/resume review
```

At the completion of Phase 10:

```text
run complete TV acceptance
build a fresh ARMv7 debug APK
verify the APK ABI
copy it to a thumb drive
install it on the Android TV box
perform the next major visual/device review
```

This APK should contain substantially more visible progress than the current build.

---

# 16. APK Checkpoint Decision

The user’s current decision is:

```text
Do not build and physically inspect an APK after every infrastructure phase.
Push through approximately Phase 10.
Then build and save a fresh ARMv7 APK.
Install it from a thumb drive.
Review the cumulative visual and playback changes on the Android TV box.
```

The next APK should ideally include:

```text
completed Phase 6 readiness panel
completed Phase 7 route/error/overlay behavior
Phase 8 real catalog rails
creator browsing
Phase 9 real image and article views
Phase 10 real video and audio playback proof
```

That will provide a much more meaningful device checkpoint.

An APK can still be built earlier if a specific Android-only defect must be investigated, but routine visual inspection should wait for the larger Phase 10 milestone.

---

# 17. Phase 11 and Later Context

After Phase 10, the build plan continues:

```text
Phase 11 — Pairing DTOs and Local Pairing UI
Phase 12 — Backend Pairing and Secure Device Session
Phase 13 — Library, Receipts, and Confirmed ROC
Phase 14 — Existing Entitlement and Paid Access
Phase 15 — Cache, Offline, Privacy, and Policy Errors
Phase 16 — Device Performance and Accessibility
Phase 17 — Reproducible Alpha Acceptance Runner
Phase 18 — Private Beta Hardening
Phase 19 — Store/Production Decision
```

The existing pairing-begin work is an early foundation, not completion of Phases 11 or 12.

Current pairing truth:

```text
backend challenge may be requested
waiting state may be displayed
approval remains external
no secure device session exists
no persistent pairing exists
no companion approval has been implemented
```

Future receipt and confirmed-ROC work must remain display-only and backend-derived.

Paid access must never be granted from local cache alone.

---

# 18. Cross-Platform Roadmap

The current desired platform sequence is:

```text
1. CrabLink desktop
2. CrabLink TV / Android TV
3. regular Android phone/tablet application
4. iOS/iPadOS application
5. web application where practical
6. coordinated cross-platform beta and launch preparation
```

`ANDROID_TV_NOTES.md` must remain exclusively for the Android TV product.

`ANDROID_NOTES.md` must remain exclusively for the future regular Android phone/tablet client.

Do not mix the two platform tracks.

The TV application remains optimized for browsing and playback.

The future Android and iOS clients can handle more account interaction, pairing approval, search, mobile navigation, and limited creator/customer workflows, but they must preserve the same backend authority boundaries.

---

# 19. Current Security and Truth Invariants

These must remain intact through every future phase:

```text
React does not own wallet truth.
React does not own ledger truth.
React does not own pairing approval truth.
React does not own entitlement truth.
React does not own confirmed ROC truth.
React does not own B3 integrity truth without native verification.
```

Network behavior:

```text
no arbitrary caller URL
no direct provider fallback
no ambient proxy use
no hidden cleartext release path
development LAN visibly marked
release requires HTTPS
timeouts bounded
responses bounded
origins redacted
errors sanitized
```

Pairing behavior:

```text
backend issues challenge
trusted companion approves
TV does not approve itself
no fake pairing code
no fake paired state
no session created before authoritative approval
```

Economic behavior:

```text
no ROC minting
no ROC burning
no direct reward claim
no wallet mutation
no ledger mutation
no fake receipt
no fake balance
no fake finality
no cache-only paid unlock
```

Node behavior:

```text
no micronode runtime in TV
no macronode runtime in TV
no operator commands
no creator-authority commands
no public serving
```

External behavior:

```text
no ROX runtime
no Solana runtime
no bridge settlement
no staking
no liquidity
no exchange behavior
```

---

# 20. Testing and Acceptance Policy Going Forward

## Focused tests first

For each real behavior:

```text
add the behavior
add focused unit tests
run the focused tests
run the directly related boundary
fix the first failure
```

## Shared-package changes

When changing `@crablink/core` or `@crablink/platform`:

```text
run package tests
run package boundary
build TV
build desktop
```

## Native-core changes

When changing `crablink-native-core`:

```text
run focused crate tests
run crate Clippy
run ARMv7 cargo check
run affected desktop and TV native tests
```

## Tauri command changes

When adding a native command:

```text
update command registry
update capability/boundary checks
add Rust tests
run command-boundary check
run strict Clippy
```

## Phase closeout

At the end of a phase:

```text
focused tests green
TV frontend build green
TV native tests green
strict Clippy green
shared package checks green
desktop build green when shared surfaces changed
ARMv7 check green when native surfaces changed
full npm run tv:check green
codebundle coverage updated
```

Do not claim a phase complete based only on source markers.

---

# 21. Important Workflow Rules

The next session must preserve these user requirements:

```text
No Git commands or mutations.
No git add.
No git commit.
No git push.
No downloads unless explicitly requested.
No background work promises.
No terminal blocks ending with exit or exit 0.
Do not rely on zsh pipestatus.
Do not restore CPU limiters unless explicitly requested.
```

Patch format:

```text
complete paste-ready Bash block
mutation first
verification separately
both supplied in the same response
no isolated line replacement when a correction is needed
```

Mutation safety:

```text
validate current source before writing
write nothing until all validation completes
atomic writes
print APPLIED markers
print REPOSITORY_UNCHANGED=YES on pre-write failure
confirm all newly expected files exist before verification
```

Source validation:

```text
prefer stable identifiers
prefer function names
prefer component names
prefer command names
prefer schema strings
prefer focus keys
avoid long prose exact-match gates
avoid backslash-sensitive multiline Python literals
```

Codebundle:

```text
source of truth remains repository
do not regenerate after every small slice
regenerate at phase milestones or when needed
```

---

# 22. First Paragraph for the Next Session

Use this to resume immediately:

```text
We are continuing CrabLink TV in /Users/mymac/Desktop/crablink. Phases 0–5 are complete. Phase 6 slice 1 and slice 2A are complete and green. The latest verified baseline passed five network-readiness model tests, nine platform-contract tests, all 31 TV native tests, strict Clippy, ARMv7 shared-core compilation, desktop production build, and the full TV acceptance chain. Phase 6 slice 2B has not been applied. Two slice 2B mutations failed before writes: the first used a hardcoded esbuild location; the second contained an invalid split Python assignment at ESBUILD_COMMAND =. Both printed REPOSITORY_UNCHANGED=YES. Start by producing one complete corrected Phase 6 slice 2B mutation and separate verification. Do not rerun either old patch. Complete the visible redacted network-profile panel and remote-focusable manual retry, close Phase 6, then move directly into accelerated Phase 7 route/error/overlay work.
```

---

# 23. Immediate Next Milestones

```text
Milestone 1:
  Correct Phase 6 slice 2B mutation.
  Add visible network readiness panel.
  Add manual health retry.
  Add duplicate-request lock.
  Complete Phase 6.

Milestone 2:
  Phase 7 route registry, typed problem routes, overlays, Back priority, focus restore, approved deep links.

Milestone 3:
  Phase 8 real backend catalog, TV rails, cards, creator pages.

Milestone 4:
  Phase 9 real B3 image and article views with corrupt-byte rejection.

Milestone 5:
  Phase 10 real video and audio playback, remote controls, Continue Watching, stability checks.

Milestone 6:
  Build and verify fresh ARMv7 APK.
  Copy to thumb drive.
  Install and visually inspect on Android TV.
```

---

# 24. Final Handoff Status

```text
PROJECT=CRABLINK_TV
DATE=2026-07-18

PHASE0=COMPLETE
PHASE1=COMPLETE
PHASE2=COMPLETE
PHASE3=COMPLETE
PHASE4=COMPLETE
PHASE5=COMPLETE

PHASE6_SLICE1=GREEN
PHASE6_SLICE2A=GREEN
PHASE6_SLICE2B=NOT_APPLIED
PHASE6=IN_PROGRESS

LAST_GREEN_TV_NATIVE_TEST_COUNT=31
LAST_GREEN_NETWORK_MODEL_TEST_COUNT=5
LAST_GREEN_PLATFORM_CONTRACT_TEST_COUNT=9
LAST_GREEN_SHARED_NATIVE_CORE_TEST_COUNT=22

ANDROID_ARMV7_NATIVE_CORE=GREEN
DESKTOP_BUILD=GREEN
TV_FULL_ACCEPTANCE=GREEN_AT_SLICE2A_BASELINE

VISIBLE_NETWORK_READINESS_PANEL=NOT_ADDED
MANUAL_NETWORK_RETRY_UI=NOT_ADDED
AUTOMATIC_POLLING=NOT_ADDED
NEW_TAURI_COMMAND_FOR_SLICE2B=NOT_REQUIRED
REPOSITORY_DAMAGED=NO

NEXT_ACTION=COMPLETE_PHASE6_SLICE2B
NEXT_PHASE=PHASE7_ROUTE_ERROR_AND_OVERLAY_FOUNDATION
NEXT_MAJOR_APK_CHECKPOINT=AFTER_PHASE10
APK_DEVICE_TRANSFER=USB_THUMB_DRIVE
REQUIRED_ANDROID_ABI=ARMV7

MOMENTUM_POSTURE=ACCELERATED_FOCUSED_IMPLEMENTATION
GIT_MUTATIONS=FORBIDDEN_UNLESS_USER_REVERSES
DOWNLOADS=FORBIDDEN_UNLESS_USER_REQUESTS
CODEBUNDLE_REGENERATION=PHASE_MILESTONES_ONLY
```

### END NOTE — JULY 18, 2026 — CRABLINK TV PHASE 6 NETWORK READINESS HANDOFF

These notes preserve the complete green baseline and set a faster Phase 6–10 execution path without loosening the project’s safety or truth boundaries.


### END NOTE - JULY 18 2026 - 13:15 CST


### BEGIN NOTE - JULY 19 2026 - 19:25 CST


These notes reconcile the terminal output with the attached build plan’s Phase 8 goals and exit gates. 

# ANDROID_TV_NOTES.md — CrabLink TV Carryover Notes

## Session boundary

**Session period:** July 19–20, 2026
**Repository:** `/Users/mymac/Desktop/crablink`
**Application:** `apps/crablink-tv`
**Current phase:** TV Phase 8 — Home Catalog and Creator Browsing
**Current slice:** Phase 8A foundation
**Immediate status:** Catalog model complete and green; read-only catalog-port mutation rolled back cleanly
**Exact next task:** Repair and reapply the shared read-only catalog port before starting the TV catalog adapter
**APK status:** No new APK built
**Device-testing plan:** Continue implementation through approximately Phase 10 before producing and testing the next Android TV APK

---

# 1. Executive summary

This session completed and closed TV Phase 7, then began TV Phase 8.

Phase 7 is fully complete. CrabLink TV now has:

* An explicit TV route registry.
* An immutable route stack capped at 32 entries.
* Deterministic Back behavior.
* Typed detail and problem overlays.
* Focus restoration.
* Approved Android `crab://` intent intake.
* Cold-start and warm-intent handling.
* Canonical route review before navigation.
* Live React handoff for approved Android intents.
* Full Phase 7 codebundle registration and milestone regeneration.

Phase 8A then added a real, strict, backend-facing catalog response model. That model is now committed to the working repository and fully green.

The catalog model provides:

* A strict versioned catalog schema.
* A bounded set of approved rails.
* Bounded item counts.
* Canonical `crab://` route validation.
* Creator/content ownership matching.
* Image-only thumbnail references.
* Bounded progress values.
* Truthful loading, unavailable, malformed, empty, and ready states.
* Empty-rail omission.
* No static sample or placeholder catalog acceptance.

The next attempted slice was the shared `@crablink/platform` read-only catalog port. Its implementation passed staging, its five focused tests passed, and its new catalog boundary passed. The real repository mutation then failed during the existing platform acceptance chain because the pre-existing platform boundary script still expected the old exact `package.json` check command.

The mutation’s rollback worked correctly.

As a result:

* The Phase 8A catalog model remains present and green.
* The failed catalog-port files and package registrations were removed.
* The existing platform package was restored to its previous green state.
* Phase 7 remained green.
* Full TV acceptance remained green.
* ARMv7 native-core compile remained green.
* Desktop production build remained green.
* No catalog adapter, catalog transport, or native catalog command was added.

Do not start the TV catalog adapter yet.

The first task next session is to repair the shared catalog-port mutation by updating the existing platform boundary checker in the same atomic patch.

---

# 2. Current authoritative phase posture

## Completed phases

```text
TV Phase 0: COMPLETE
TV Phase 1: COMPLETE
TV Phase 2: COMPLETE
TV Phase 3: COMPLETE
TV Phase 4: COMPLETE
TV Phase 5: COMPLETE
TV Phase 6: COMPLETE
TV Phase 7: COMPLETE
```

## Current phase

```text
TV Phase 8: IN PROGRESS
Phase 8A typed catalog model: COMPLETE AND GREEN
Phase 8A read-only catalog port: NOT APPLIED
Phase 8A TV catalog adapter: NOT STARTED
Native catalog command: NOT ADDED
Catalog transport: NOT ADDED
Home catalog React integration: NOT STARTED
Creator browsing UI: NOT STARTED
```

## Current safe label

```text
PHASE7=COMPLETE
PHASE8A_CATALOG_MODEL=GREEN
PHASE8A_READONLY_CATALOG_PORT=ROLLED_BACK
PHASE8A=IN_PROGRESS
NEXT_PATCH=REPAIRED_PHASE8A_READONLY_CATALOG_PORT
DO_NOT_START_TV_CATALOG_ADAPTER=YES
APK_BUILD=NOT_RUN
```

---

# 3. Work completed during this session

## 3.1 Phase 7C Android `crab://` intent review foundation

The Phase 7C intent-review layer was completed and verified.

### Native intake posture

The Android side supports:

```text
onCreate intent intake
onNewIntent warm-intent intake
approved crab:// VIEW handling
bounded pending-intent queue
safe JSON quoting
React readiness handshake
cold-start queue delivery
warm-event delivery
```

Important native bounds and identifiers:

```text
Maximum queued intents: 16
Maximum URL length: 2048
Event source: android-intent
Event name: crablink-tv-android-intent
Queue key: __CRABLINK_TV_PENDING_INTENTS__
Ready key: __CRABLINK_TV_ANDROID_INTENT_READY__
```

The generated Android activity uses `JSONObject.quote(url)` before passing the URL into the WebView.

The manifest includes the approved `crab` scheme and Android VIEW/BROWSABLE posture without adding unrelated Android permissions or authority.

### Intent review behavior

The local JavaScript review layer:

* Requires an object payload.
* Requires `source === "android-intent"`.
* Requires a string URL.
* Trims the URL.
* Rejects empty URLs.
* Rejects URLs longer than 2048 characters.
* Rejects control characters.
* Requires the `crab://` scheme.
* Reuses the canonical TV route registry.
* Rejects malformed, foreign, and desktop-only routes.
* Produces bounded destination focus information.
* Does not hydrate content or invent success.

### Intent-review tests

Seven focused tests are green:

```text
1. Native-source payload is trimmed and frozen.
2. Approved section selects destination focus.
3. Approved section without a TV surface stays truthful.
4. Typed asset route targets library focus.
5. Creator route remains bounded to Home.
6. Malformed, oversized, and control-character payloads fail closed.
7. Foreign schemes and desktop-only routes become typed rejections.
```

---

## 3.2 Phase 7C handoff model

A separate handoff model was added between native intent delivery and React UI behavior.

It provides:

```text
TV_ANDROID_INTENT_EVENT
TV_ANDROID_INTENT_QUEUE
TV_ANDROID_INTENT_READY
TV_ANDROID_INTENT_QUEUE_LIMIT
setTvAndroidIntentReady
takePendingTvAndroidIntents
projectTvAndroidIntentUiAction
TV_ANDROID_INTENT_UI_ACTION
```

Behavior:

* Marks the React surface ready.
* Drains a bounded queue.
* Freezes the drained payload list.
* Projects reviewed routes into detail or problem actions.
* Keeps unsupported routes typed and truthful.
* Does not add network, storage, wallet, ledger, receipt, reward, or ROC authority.

Six focused tests are green:

```text
1. Handoff constants match the Android bridge.
2. Readiness marker toggles safely.
3. Pending queue is bounded, drained, and frozen.
4. Approved section becomes a destination detail action.
5. Asset intake targets the Library surface.
6. Unsupported intake becomes a typed problem action.
```

Combined Android-intent test count:

```text
Intent review tests: 7
Handoff-model tests: 6
Total focused Android-intent tests: 13
```

---

## 3.3 Phase 7C live React handoff

The live React handoff was integrated into the current TV application.

The implementation:

* Registers the Android intent listener before marking React ready.
* Drains cold-start queued intents after readiness is established.
* Handles warm intents through the same reviewed path.
* Removes a matching queued payload when the native event also arrives.
* Prevents a queued/event duplicate from being handled twice.
* Uses the canonical review model.
* Navigates approved routes through the current section-history controller.
* Opens approved routes through the current detail-overlay controller.
* Opens rejected routes through the typed problem-overlay controller.
* Preserves existing Back priority.
* Preserves focus return through existing route and overlay controllers.
* Adds no new economic, identity, session, receipt, wallet, ledger, or ROC authority.

Verified behavior:

```text
LISTENER_BEFORE_READY=GREEN
COLD_START_QUEUE_DRAIN=GREEN
WARM_INTENT_EVENT_HANDOFF=GREEN
DUPLICATE_QUEUE_EVENT_SUPPRESSION=GREEN
APPROVED_ROUTE_NAVIGATION_AND_DETAIL=GREEN
TYPED_PROBLEM_OVERLAY=GREEN
DESTINATION_FOCUS_RESTORE=GREEN
```

---

## 3.4 Phase 7 closeout

Phase 7C files and scripts were registered in codebundle coverage.

The Phase 7 milestone codebundle was regenerated successfully.

Confirmed Phase 7 closeout:

```text
PHASE7C_NATIVE_INTAKE=GREEN
PHASE7C_REVIEW_FOUNDATION=GREEN
PHASE7C_HANDOFF_MODEL=GREEN
PHASE7C_LIVE_REACT_HANDOFF=GREEN
CODEBUNDLE_COVERAGE=GREEN
CODEBUNDLE_BOUNDARY=GREEN
PHASE7C=COMPLETE
PHASE7=COMPLETE
```

The generated bundle reportedly contained 136 TV-related entries at the Phase 7 closeout milestone.

No APK was built as part of this closeout.

---

# 4. Phase 8A typed catalog model — completed

## 4.1 Files now present

These files should currently exist:

```text
apps/crablink-tv/src/catalog/tvCatalogModel.js
apps/crablink-tv/src/catalog/tvCatalogModel.test.mjs
scripts/check-crablink-tv-catalog-model-boundary.mjs
```

The parent directory now exists:

```text
apps/crablink-tv/src/catalog/
```

An earlier write attempt failed because this directory did not yet exist. A narrow directory-repair block created it without modifying source or package files. The corrected mutation later used `path.parent.mkdir(parents=True, exist_ok=True)` before atomic writes.

---

## 4.2 Package scripts now present

The TV package should contain:

```text
test:catalog-model
  node --test src/catalog/tvCatalogModel.test.mjs

check:catalog-model
  node ../../scripts/check-crablink-tv-catalog-model-boundary.mjs
```

The root package should contain:

```text
tv:catalog-model:test
  npm --prefix apps/crablink-tv run test:catalog-model

tv:catalog-model:check
  node scripts/check-crablink-tv-catalog-model-boundary.mjs
```

The TV `check` chain now includes:

```text
npm run test:catalog-model
npm run check:catalog-model
```

These commands are positioned after the Phase 7 Android-intent React boundary and before the route-metadata boundary.

---

## 4.3 Catalog schema and bounds

The catalog model defines:

```text
Schema: crablink.tv.catalog.v1
Maximum rails: 7
Maximum items per rail: 32
```

Approved rail identifiers:

```text
continue-watching
following
recent-purchases
recently-viewed
featured
recent-public
creators
```

Canonical labels are owned locally by the catalog model rather than trusted from backend-provided labels.

Examples:

```text
continue-watching → Continue Watching
following → Following
recent-purchases → Recent Purchases
recently-viewed → Recently Viewed
featured → Featured
recent-public → Recent Public Content
creators → Creators
```

Unknown rail identifiers fail closed.

Duplicate rail identifiers fail closed.

Empty rails are omitted.

A catalog containing no non-empty approved rails produces a truthful empty view.

---

## 4.4 Catalog item validation

Each item requires:

```text
bounded ID
bounded title
bounded optional subtitle
canonical crab:// route
matching creator/content kind
optional canonical image thumbnail
optional bounded progress percentage
```

ID posture:

```text
Maximum length: 80
Allowed characters: letters, digits, period, underscore, colon, hyphen
```

Title posture:

```text
Required
Trimmed
Maximum length: 120
```

Subtitle posture:

```text
Optional
Trimmed
Maximum length: 180
```

Route posture:

* Uses `resolveTvRouteInput`.
* Requires `requireCrabScheme: true`.
* Rejects malformed routes.
* Rejects typed not-found routes.
* Allows only asset- or site-owned routes.
* Rejects foreign HTTP/HTTPS URLs.
* Rejects desktop-only routes such as `crab://operator`.

Kind posture:

```text
site route → creator
asset route → content
```

A backend-provided item kind that does not match canonical route ownership is rejected.

Thumbnail posture:

* Optional.
* Must resolve as a canonical asset route.
* Must have the canonical image asset kind.
* Video or other asset kinds cannot be used as thumbnail references.

Progress posture:

```text
null or absent → no progress
integer 0 through 100 → accepted
negative, fractional, or greater than 100 → rejected
```

Unknown backend fields are discarded rather than retained.

The model does not retain backend-supplied wallet, token, ledger, secret, or arbitrary metadata fields.

---

## 4.5 Catalog view states

The catalog model now provides truthful immutable states:

```text
loading
unavailable
malformed
empty
ready
```

### Loading

* Immutable.
* Contains an empty rail list.
* Does not create fake placeholder rails.

### Unavailable

Approved sanitized codes include:

```text
catalog_unavailable
gateway_unconfigured
gateway_unreachable
```

Unknown raw codes collapse to:

```text
catalog_unavailable
```

The state also includes a bounded boolean retryable posture.

Raw backend errors are discarded.

### Malformed

Used when:

* Schema is wrong.
* Timestamp is invalid.
* Rail shape is invalid.
* Rail identifier is unknown.
* Duplicate rail exists.
* Item is invalid.
* Route is invalid.
* Creator/content kind is inconsistent.
* Thumbnail is not a canonical image.
* Progress is out of range.

Malformed responses never become ready catalog data.

### Empty

Used when the response is structurally valid but no non-empty rails remain.

### Ready

Used only after the complete response passes normalization.

---

## 4.6 Catalog-model tests

Eight focused tests are green:

```text
1. Loading view is immutable and contains no fake rails.
2. Valid backend catalog is normalized and deeply frozen.
3. Empty rails are omitted and produce a truthful empty state.
4. Unknown schema and rail identifiers fail closed.
5. Foreign and unsupported card routes fail closed.
6. Creator and content kinds must match canonical route ownership.
7. Thumbnail must be a canonical image route and progress is bounded.
8. Unavailable state is typed, sanitized, and non-authoritative.
```

Latest confirmed result:

```text
CRABLINK_TV_PHASE8A_CATALOG_MODEL=GREEN
STRICT_CATALOG_SCHEMA=GREEN
BACKEND_DERIVED_RAIL_ALLOWLIST=GREEN
CANONICAL_CARD_ROUTE_VALIDATION=GREEN
BOUNDED_IMAGE_THUMBNAIL_REFERENCE=GREEN
LOADING_STATE=GREEN
UNAVAILABLE_STATE=GREEN
MALFORMED_STATE=GREEN
EMPTY_STATE=GREEN
READY_STATE=GREEN
EMPTY_RAIL_OMISSION=GREEN
SAMPLE_DATA_ACCEPTANCE=ABSENT
CATALOG_MODEL_TEST_COUNT=8
```

---

# 5. Phase 8A read-only catalog-port attempt — rolled back

## 5.1 Intended implementation

The attempted patch was designed to add a shared `@crablink/platform` contract with exactly one method:

```text
readCatalog
```

Planned files:

```text
packages/crablink-platform/src/contracts/catalogPort.js
packages/crablink-platform/src/contracts/catalogPort.test.mjs
scripts/check-crablink-platform-catalog-boundary.mjs
```

Planned package changes:

```text
packages/crablink-platform/src/index.js
packages/crablink-platform/package.json
package.json
```

Planned platform export:

```text
./catalog → ./src/contracts/catalogPort.js
```

Planned platform scripts:

```text
test:catalog
check:catalog-boundary
```

Planned root scripts:

```text
platform:catalog:test
platform:catalog:check
```

The contract was intentionally narrow:

```text
method count: 1
method: readCatalog
immutable: yes
construction-time calls: 0
result passthrough: yes
error passthrough: yes
network authority: absent
Tauri invoke authority: absent
storage authority: absent
wallet authority: absent
ledger authority: absent
receipt authority: absent
reward authority: absent
ROC authority: absent
```

No TV adapter, native command, or network operation was part of that patch.

---

## 5.2 What passed before the failure

The staged files were valid.

Five focused catalog-port tests passed:

```text
1. Catalog port exposes exactly one immutable read method.
2. Catalog port fails closed when readCatalog is absent.
3. Catalog port construction performs no read.
4. Catalog port preserves adapter results without inventing success.
5. Catalog port preserves adapter errors.
```

The new catalog-port boundary also passed.

These markers appeared before repository mutation verification:

```text
PHASE8A_CATALOG_PORT_STAGE=GREEN
PHASE8A_READONLY_CATALOG_PORT=GREEN
NEXT_PATCH=PHASE8A_TV_CATALOG_ADAPTER
```

After writing the files, these focused commands also passed initially:

```text
npm run platform:catalog:test
npm run platform:catalog:check
```

Therefore, the new port implementation itself was not the cause of failure.

---

## 5.3 Exact failure

The mutation changed the platform package’s `check` command from:

```text
npm run test &&
npm run check:boundary &&
npm run check:memory
```

to:

```text
npm run test &&
npm run test:catalog &&
npm run check:boundary &&
npm run check:catalog-boundary &&
npm run check:memory
```

The pre-existing boundary script:

```text
scripts/check-crablink-platform-contracts-boundary.mjs
```

contains an exact assertion for the platform package acceptance command.

At approximately line 376, it threw:

```text
Error: Platform package acceptance command is missing or incorrect.
```

The failed command was:

```text
npm --prefix packages/crablink-platform run check
```

The failure occurred when that command reached:

```text
npm run check:boundary
```

The problem was not the new port’s behavior. The problem was that the existing platform boundary checker had not been updated to recognize the expanded acceptance chain.

---

## 5.4 Rollback result

The mutation rollback succeeded.

Confirmed rollback markers:

```text
PHASE8A_CATALOG_PORT_ROLLED_BACK=YES
PHASE8A_CATALOG_MODEL_PRESERVED=YES
PHASE7_GREEN_BASELINE_PRESERVED=YES
```

The verification block was then run after rollback, so its seven catalog-port failures were expected.

Those failures correctly showed that the proposed catalog-port files and scripts were absent.

---

# 6. Current repository state after rollback

## 6.1 Files that should remain present

```text
apps/crablink-tv/src/catalog/tvCatalogModel.js
apps/crablink-tv/src/catalog/tvCatalogModel.test.mjs
scripts/check-crablink-tv-catalog-model-boundary.mjs
```

All completed Phase 7 files should remain present, including:

```text
apps/crablink-tv/src/navigation/tvAndroidIntentIntake.js
apps/crablink-tv/src/navigation/tvAndroidIntentIntake.test.mjs
apps/crablink-tv/src/navigation/tvAndroidIntentHandoff.js
apps/crablink-tv/src/navigation/tvAndroidIntentHandoff.test.mjs
apps/crablink-tv/src/navigation/useTvAndroidIntentHandoff.js
scripts/check-crablink-tv-android-intent-foundation-boundary.mjs
scripts/check-crablink-tv-android-intent-react-boundary.mjs
```

---

## 6.2 Files that should currently be absent

Because the catalog-port mutation rolled back, these should not exist:

```text
packages/crablink-platform/src/contracts/catalogPort.js
packages/crablink-platform/src/contracts/catalogPort.test.mjs
scripts/check-crablink-platform-catalog-boundary.mjs
```

---

## 6.3 Registrations that should currently be absent

The platform index should not currently export:

```text
createCatalogPort
```

The platform package should not currently contain:

```text
exports["./catalog"]
scripts["test:catalog"]
scripts["check:catalog-boundary"]
```

The root package should not currently contain:

```text
scripts["platform:catalog:test"]
scripts["platform:catalog:check"]
```

---

## 6.4 Platform acceptance command after rollback

The platform package should be restored to:

```text
npm run test &&
npm run check:boundary &&
npm run check:memory
```

The terminal output confirmed the restored platform acceptance chain passed after rollback.

---

# 7. Green verification state at session end

Despite the failed catalog-port attempt, the current repository baseline is green.

## Platform package

Green after rollback:

```text
9 shared adapter-contract tests
platform contract boundary
6 deterministic memory-adapter tests
memory-adapter boundary
complete existing platform check
```

## TV JavaScript and boundary checks

Green:

```text
network-readiness tests
network-readiness interaction tests
gateway-health boundary
pairing-begin boundary
focus tests
route-model tests
route-registry tests
route boundaries
overlay/back tests
overlay boundaries
Android intent tests
Android intent handoff tests
Android intent boundaries
catalog-model tests
catalog-model boundary
route-metadata boundary
settings boundary
pairing boundary
TV production build
```

## TV Rust

Green:

```text
31 Rust tests passed
0 failed
cargo clippy passed with -D warnings
```

## Android native shared core

Green:

```text
cargo check
--manifest-path crates/crablink-native-core/Cargo.toml
--target armv7-linux-androideabi
--offline
```

## Desktop

Green:

```text
npm run build
200 modules transformed
desktop production build successful
```

## Final session-end status

```text
PHASE8A_CATALOG_MODEL=GREEN
FULL_TV_ACCEPTANCE=GREEN
ARMV7_NATIVE_CORE=GREEN
DESKTOP_BUILD=GREEN
PHASE8A_READONLY_CATALOG_PORT=NOT_APPLIED
DO_NOT_START_TV_CATALOG_ADAPTER=YES
```

---

# 8. Exact first task for the next session

Do not rerun the failed catalog-port patch unchanged.

The next session must first inspect the exact current contents of:

```text
scripts/check-crablink-platform-contracts-boundary.mjs
packages/crablink-platform/package.json
packages/crablink-platform/src/index.js
packages/crablink-platform/src/contracts/portContract.js
package.json
```

The most important location is the platform-boundary assertion around the error line:

```text
scripts/check-crablink-platform-contracts-boundary.mjs
approximately line 376
```

Search the entire boundary script for all assumptions related to:

```text
platform package acceptance command
allowed contract list
expected package exports
expected index exports
contract filenames
method-port registrations
printed contract summary
TV adapter contract imports
desktop adapter contract imports
```

Do not repair only the first exact string without checking the surrounding boundary rules. Once the acceptance-command assertion is fixed, another stale contract-list assertion may become the next failure.

---

# 9. Corrected catalog-port patch requirements

The repaired mutation should atomically include all of the following:

## New files

```text
packages/crablink-platform/src/contracts/catalogPort.js
packages/crablink-platform/src/contracts/catalogPort.test.mjs
scripts/check-crablink-platform-catalog-boundary.mjs
```

## Existing files to modify

```text
packages/crablink-platform/src/index.js
packages/crablink-platform/package.json
package.json
scripts/check-crablink-platform-contracts-boundary.mjs
```

The previous attempt omitted the final file from its mutation.

## Port behavior

```text
Exactly one method: readCatalog
Immutable method port
No method invocation during construction
Adapter result returned unchanged
Adapter error propagated unchanged
No fetch
No direct invoke
No storage
No wallet
No ledger
No receipt
No reward
No ROC
No finality authority
```

## Acceptance-chain behavior

The platform package’s intended expanded check chain is:

```text
npm run test &&
npm run test:catalog &&
npm run check:boundary &&
npm run check:catalog-boundary &&
npm run check:memory
```

The existing platform-contract boundary must be updated to recognize that exact command.

The boundary’s contract description should also acknowledge the catalog port if it currently asserts or prints a closed list of shared contracts.

## Rollback coverage

The repaired mutation must back up and restore:

```text
packages/crablink-platform/src/index.js
packages/crablink-platform/package.json
package.json
scripts/check-crablink-platform-contracts-boundary.mjs
```

On failure it must remove:

```text
packages/crablink-platform/src/contracts/catalogPort.js
packages/crablink-platform/src/contracts/catalogPort.test.mjs
scripts/check-crablink-platform-catalog-boundary.mjs
```

The Phase 8A catalog-model files must remain untouched.

---

# 10. Focused verification sequence after the repaired port patch

Run the smallest checks first:

```text
node --check packages/crablink-platform/src/contracts/catalogPort.js
node --check packages/crablink-platform/src/contracts/catalogPort.test.mjs
node --check scripts/check-crablink-platform-catalog-boundary.mjs
node --check scripts/check-crablink-platform-contracts-boundary.mjs
```

Then:

```text
npm run platform:catalog:test
npm run platform:catalog:check
npm --prefix packages/crablink-platform run check
```

Then regressions:

```text
npm run tv:catalog-model:test
npm run tv:catalog-model:check
npm run tv:check
```

Then native and desktop:

```text
cargo check \
  --manifest-path crates/crablink-native-core/Cargo.toml \
  --target armv7-linux-androideabi \
  --offline

npm run build
```

Do not proceed until all are green.

Expected corrected completion posture:

```text
PHASE8A_READONLY_CATALOG_PORT=GREEN
CATALOG_PORT_METHOD_COUNT=1
CATALOG_PORT_METHOD=readCatalog
CATALOG_PORT_TEST_COUNT=5
FULL_PLATFORM_ACCEPTANCE=GREEN
FULL_TV_ACCEPTANCE=GREEN
ARMV7_NATIVE_CORE=GREEN
DESKTOP_BUILD=GREEN
TV_CATALOG_TRANSPORT=NOT_ADDED
NATIVE_CATALOG_COMMAND=NOT_ADDED
NEXT_PATCH=PHASE8A_TV_CATALOG_ADAPTER
```

---

# 11. What comes after the repaired catalog port

Only after the read-only catalog port is fully green should work move to the TV adapter.

Likely Phase 8A sequence:

```text
1. Repair shared read-only catalog port.
2. Add the narrow TV catalog adapter.
3. Add a fixed typed native catalog-read operation.
4. Add native response bounds and strict DTO handling.
5. Connect the response to tvCatalogModel.
6. Add a duplicate-request-safe catalog interaction/controller.
7. Replace static Home rails with truthful catalog states.
8. Add creator-card navigation.
9. Add creator/profile page projection.
10. Add focus restoration after route return and data refresh.
11. Add Phase 8 codebundle coverage at a meaningful milestone.
12. Build/test the next APK around Phase 10, not now.
```

Do not create a TV adapter that calls a nonexistent command and presents fake success.

Do not expose an arbitrary URL to React.

The eventual native operation must be a fixed typed operation such as:

```text
FetchHomeCatalog
```

or an exact reviewed command such as:

```text
tv_catalog_read
```

The final name must be chosen from the exact current command/adapter conventions, not guessed.

---

# 12. Phase 8 build-plan target

Phase 8 is not complete merely because the catalog model exists.

The build-plan exit gate requires:

```text
Physical TV loads a real catalog from the controlled environment.
A creator page opens and returns to the originating card.
No fake catalog data is used in acceptance mode.
```

Remaining Phase 8 work includes:

```text
typed gateway/omnigate catalog route
native fixed-path catalog read
TV adapter
Home loading UI
Home unavailable UI
Home malformed-response UI
Home empty UI
real ready-state rails
bounded thumbnails
creator cards
creator/profile page
focus preservation
refresh behavior
route return behavior
physical-TV validation
```

The current catalog model is the validation and state foundation for this work, not the complete Phase 8 feature.

---

# 13. Authority boundaries to preserve

CrabLink TV remains a client-only surface.

Phase 8 must not add:

```text
wallet keys
seed phrases
wallet spending
ledger mutation
receipt authority
ROC authority
reward authority
node control
operator commands
creator publishing
arbitrary URL fetch
direct provider access
fake entitlement
fake receipt
fake balance
fake catalog success
sample rails in acceptance mode
```

Catalog data must remain:

```text
backend-derived
strictly normalized
read-only
bounded
fail-closed
display-oriented
non-authoritative for wallet/ledger state
```

The TV React layer should receive normalized display data and typed state only.

Native Rust should own privileged network execution and response bounds.

---

# 14. Terminal and patch rules for the next session

Continue following these project rules:

```text
No Git commands or Git mutations.
No downloads unless explicitly requested.
No base64, gzip, lzma, or encoded payloads.
Use human-readable Bash/Python patch blocks.
Provide the complete corrected mutation block.
Provide a separate complete verification block.
Do not use exit or exit 0 in terminal blocks.
Leave the interactive shell open.
Do not rely on zsh pipestatus.
Do not add CPU limiters unless explicitly requested.
Validate exact source anchors before writing.
Stage all generated files before repository mutation.
Write nothing until staging passes.
Print an APPLIED marker only after successful writes and checks.
Rollback every modified existing file on post-write failure.
State when the repository remains unchanged after precheck failure.
Use stable identifiers rather than long prose as patch anchors.
```

Avoid Python formatting that splits assignments after `=`.

Bad:

```python
value =
    expression
```

Safe:

```python
value = (
    expression
)
```

---

# 15. Codebundle posture

The last confirmed milestone regeneration occurred at the Phase 7 closeout.

Phase 8A catalog-model work intentionally printed:

```text
CODEBUNDLE_REGENERATION=NOT_NEEDED
```

The catalog-port attempt also intended no regeneration and then rolled back.

Therefore, unless a bundle was generated manually outside these logs, the current milestone bundle may not include the new Phase 8A catalog-model files.

Do not regenerate a bundle merely to retry the shared catalog port unless exact live source inspection cannot be completed from the current bundle and terminal-visible files.

A meaningful next bundle milestone would be after:

```text
shared catalog port
TV catalog adapter
native catalog read
catalog interaction model
initial Home integration
```

are green.

---

# 16. Android TV device facts and testing posture

Known device posture:

```text
Android TV OS: 14
Build: rk3539_box_32-user 14 UTT2.241219.001
Working APK architecture: 32-bit / ARMv7
64-bit APK: previously rejected
32-bit APK: installs and launches
Installation method used: USB thumb drive
```

The user successfully installed an earlier APK by:

```text
copy APK to USB drive
connect USB drive to TV
install APK
launch app
```

No ADB installation was required for that physical test.

Current plan:

```text
Do not build another APK yet.
Continue through approximately Phase 10.
Build the next APK after the Home/catalog, B3 content, and media work provides substantial visible changes.
```

Keep light and dark theme support, but dark mode remains the intended default before the next meaningful APK/device test.

---

# 17. Current test inventory highlights

Latest relevant focused counts:

```text
Platform base contract tests: 9
Platform memory-adapter tests: 6
TV network-readiness tests: 5
TV network-readiness interaction tests: 6
TV focus tests: 9
TV route-model tests: 11
TV route-registry tests: 11
TV overlay/back tests: 10
TV Android-intent review tests: 7
TV Android-intent handoff tests: 6
TV catalog-model tests: 8
TV native Rust tests: 31
Attempted catalog-port tests: 5, but rolled back
```

The five catalog-port tests proved the proposed implementation in staging, but they are not currently part of the repository because the whole port mutation rolled back.

---

# 18. Do not misread the failed verification

The seven catalog-port verification failures do not indicate seven independent product defects.

They all resulted from running verification after rollback:

```text
missing catalogPort.js
missing catalogPort.test.mjs
missing catalog boundary
missing platform catalog scripts
missing package export
missing index export
missing root scripts
```

This is the correct post-rollback state.

The one real mutation failure was:

```text
Existing platform boundary expected the old exact platform check command.
```

Fix that integration point first.

---

# 19. Momentum plan for the next session

To increase progress without sacrificing correctness:

```text
Step 1:
Inspect the complete existing platform boundary once.

Step 2:
Prepare one corrected catalog-port mutation that includes every affected checker and package file.

Step 3:
Run the five focused tests and both platform boundaries.

Step 4:
Run full platform acceptance immediately.

Step 5:
Run the catalog-model regressions and complete TV acceptance.

Step 6:
Run ARMv7 native-core compile and desktop build.

Step 7:
If fully green, move directly to the TV catalog adapter rather than writing extra planning documents.

Step 8:
Keep the adapter slice small and behavior-backed.

Step 9:
Continue into fixed native catalog transport and Home interaction without regenerating the codebundle between every micro-slice.

Step 10:
Regenerate the codebundle at the next meaningful Phase 8 milestone.
```

---

# 20. Exact handoff sentence for the next session

```text
We are working on CrabLink TV Phase 8A. Phase 7 is complete. The strict TV catalog model is present and fully green with eight tests. The first shared read-only catalog-port attempt passed staging and its five tests, but the real mutation rolled back because scripts/check-crablink-platform-contracts-boundary.mjs still expected the old exact platform package check command. The catalog-port files and registrations are currently absent; the catalog model remains present. Start by inspecting and updating the existing platform boundary checker, then reapply the catalog-port mutation atomically. Do not start the TV catalog adapter until full platform acceptance, full TV acceptance, ARMv7 compile, and desktop build are green.
```

---

# 21. Final session-end status

```text
REPOSITORY=/Users/mymac/Desktop/crablink
ACTIVE_APP=apps/crablink-tv

PHASE7=COMPLETE

PHASE8=IN_PROGRESS
PHASE8A_CATALOG_MODEL=GREEN
CATALOG_MODEL_TEST_COUNT=8

PHASE8A_READONLY_CATALOG_PORT=ROLLED_BACK
CATALOG_PORT_FILES_PRESENT=NO
CATALOG_PORT_PACKAGE_REGISTRATION_PRESENT=NO
CATALOG_PORT_TEST_COUNT_IN_REPOSITORY=0

TV_CATALOG_ADAPTER=NOT_STARTED
TV_CATALOG_TRANSPORT=NOT_ADDED
NATIVE_CATALOG_COMMAND=NOT_ADDED
HOME_CATALOG_UI=NOT_STARTED
CREATOR_BROWSING_UI=NOT_STARTED

FULL_EXISTING_PLATFORM_ACCEPTANCE=GREEN
FULL_TV_ACCEPTANCE=GREEN
TV_NATIVE_RUST_TEST_COUNT=31
ARMV7_NATIVE_CORE=GREEN
DESKTOP_BUILD=GREEN

APK_BUILD=NOT_RUN
NEXT_APK_TARGET=AROUND_PHASE10
CODEBUNDLE_REGENERATION=NOT_NEEDED_YET

NEXT_PATCH=REPAIRED_PHASE8A_READONLY_CATALOG_PORT
DO_NOT_START_TV_CATALOG_ADAPTER=YES
```

Paste this into `ANDROID_TV_NOTES.md`; keep it separate from the future regular Android client’s `ANDROID_NOTES.md`.



### END NOTE - JULY 19 2026 - 19:25 CST



### BEGIN NOTE - JULY 20 2026 - 12:30 CST

# CrabLink TV Carry-Over Notes — End of Session

## Current working branch / repo context

Repository:

`/Users/mymac/Desktop/crablink`

Terminal prompt:

`mymac@RustyOnionsDevNet crablink %`

Current active track:

**CrabLink TV**

Current persisted state after this session:

**Phase 8 is complete and green. Phase 9A was attempted, partially validated, then rolled back cleanly.**

The repo should currently be at the **Phase 8H green baseline**, not the Phase 9A library asset detail state. The final Phase 9A verification correctly reported missing Phase 9A files because the failed Phase 9A mutation rolled the repository back to the preflight baseline.

---

# Session outcome summary

This was a strong forward-progress session. We completed the remaining Phase 8 Home Catalog / Creator Profile track and began Phase 9. Several patches initially failed because the new boundary checks were too strict or were checking stale markers, but each rollback worked correctly, and the final accepted state is clean.

Completed and persisted in this session:

* Phase 8D thumbnail JSX repair
* Phase 8E creator profile page foundation
* Phase 8F creator profile return focus and refresh
* Phase 8G creator profile acceptance polish
* Phase 8H Phase 8 Home Catalog acceptance
* Phase 8 Home Catalog track officially complete

Attempted but **not persisted**:

* Phase 9A Library asset detail foundation

Phase 9A partially worked during mutation, but rolled back because two boundary checks failed. The next session should start by repairing Phase 9A and applying it again as **Phase 9A v2**.

---

# What is definitely complete

## Phase 8D — Bounded catalog thumbnails

Phase 8D is complete and green.

What was accomplished:

* Added bounded catalog thumbnail projection behavior.
* Ensured thumbnails are not raw image loads.
* Catalog cards display local thumbnail badges/descriptors only.
* Thumbnail routes are reviewed and bounded.
* Non-image, foreign, malformed, and oversized thumbnail inputs fail closed.
* The Vite/JSX stray `>` issue in `TvHomeCatalogPanel.jsx` was repaired.
* The thumbnail boundary was hardened to catch that JSX failure pattern in the future.

Confirmed green markers:

```text
PHASE8D_THUMBNAIL_JSX_REPAIR=GREEN
STRAY_JSX_GT_REMOVED=YES
THUMBNAIL_BOUNDARY_HARDENED=YES
TV_REACT_BUILD_CLEAN=GREEN
PHASE8D_BOUNDED_CATALOG_THUMBNAILS=GREEN
```

Important files from this phase:

* `apps/crablink-tv/src/catalog/tvCatalogThumbnailModel.js`
* `apps/crablink-tv/src/catalog/tvCatalogThumbnailModel.test.mjs`
* `scripts/check-crablink-tv-catalog-thumbnail-boundary.mjs`
* Updated `apps/crablink-tv/src/catalog/TvHomeCatalogPanel.jsx`
* Updated `apps/crablink-tv/src/styles/tv.css`
* Updated package scripts and codebundle boundary coverage

---

## Phase 8E — Creator profile page foundation

Phase 8E is complete and green.

What was accomplished:

* Added a local creator profile projection model.
* Creator catalog cards with reviewed `crab://` site routes can open a local creator profile page.
* Non-creator, non-site, malformed, or foreign routes fail closed.
* Added visible creator profile panel.
* No new native command was added.
* No invoke/fetch/storage authority was added.
* No wallet, ledger, ROC, entitlement, receipt, reward, or finality authority was added.
* Creator profile panel is Home-side and built from already reviewed catalog route data.

Confirmed green markers:

```text
PHASE8E_CREATOR_PROFILE_PAGE_FOUNDATION=GREEN
CREATOR_PROFILE_MODEL_TEST_COUNT=4
VISIBLE_CREATOR_PROFILE_PANEL=YES
CREATOR_SITE_ROUTES_ONLY=YES
NATIVE_COMMAND=NOT_ADDED
INVOKE_FETCH_STORAGE_AUTHORITY=ABSENT
WALLET_LEDGER_ROC_FINALITY_AUTHORITY=ABSENT
TV_REACT_BUILD_CLEAN=GREEN
```

Important files added:

* `apps/crablink-tv/src/catalog/tvCreatorProfileModel.js`
* `apps/crablink-tv/src/catalog/tvCreatorProfileModel.test.mjs`
* `apps/crablink-tv/src/catalog/TvCreatorProfilePanel.jsx`
* `apps/crablink-tv/src/catalog/TvCreatorProfilePanel.source.test.mjs`
* `scripts/check-crablink-tv-creator-profile-boundary.mjs`

Important integration:

* `TvApp.jsx` now routes reviewed creator cards into a visible creator profile panel.
* Creator profile only accepts reviewed site-owned routes.
* Asset routes remain owned by Library handoff logic.

---

## Phase 8F — Creator profile return focus and refresh

Phase 8F is complete and green after v2.

What was accomplished:

* Added bounded creator profile focus-return model.
* Added explicit focus reasons:

  * profile opened
  * profile closed
  * catalog refresh
* Added focus key normalization.
* Unsafe focus keys fall back to `creator-browse-search`.
* Closing a creator profile creates a bounded return-focus request.
* Refreshing Home catalog preserves a bounded focus-return request.
* TV app uses `requestAnimationFrame` to restore focus to the matching `data-tv-focus-key`.
* No automatic polling was added.
* No native command was added.
* No storage, fetch, invoke, wallet, ledger, ROC, entitlement, receipt, reward, or finality behavior was added.

Confirmed green markers:

```text
PHASE8F_PROFILE_RETURN_FOCUS_AND_REFRESH=GREEN
CREATOR_PROFILE_FOCUS_TEST_COUNT=4
PROFILE_CLOSE_RETURN_FOCUS=YES
PROFILE_REFRESH_FOCUS_REQUEST=YES
STALE_NEXT_MARKER_REPAIRED=YES
TV_REACT_BUILD_CLEAN=GREEN
```

Important files added:

* `apps/crablink-tv/src/catalog/tvCreatorProfileFocusModel.js`
* `apps/crablink-tv/src/catalog/tvCreatorProfileFocusModel.test.mjs`
* `scripts/check-crablink-tv-creator-profile-focus-boundary.mjs`

Important integration:

* `TvApp.jsx` imports `useEffect`.
* `TvApp.jsx` owns `creatorProfileFocusRequest`.
* `TvApp.jsx` writes `document.documentElement.dataset.tvReturnFocusKey`.
* The first failed version expected literal `data-tv-return-focus-key`; v2 corrected this to `dataset.tvReturnFocusKey`.

---

## Phase 8G — Creator profile acceptance polish

Phase 8G is complete and green after v2.

What was accomplished:

* Added visible creator profile focus/refresh status.
* `TvCreatorProfilePanel` now receives `focusRequest`.
* Profile page displays:

  * current focus request kind
  * return focus target
  * focus reason/status copy
* Added acceptance source tests for creator profile polish.
* Added boundary for profile polish.
* Scoped authority scanning to the new profile-polish surface rather than all of `TvApp.jsx`.

Confirmed green markers:

```text
PHASE8G_CREATOR_PROFILE_ACCEPTANCE_POLISH=GREEN
VISIBLE_PROFILE_FOCUS_STATUS=YES
PROFILE_FOCUS_REQUEST_PROP=YES
STALE_NEXT_MARKERS_REPAIRED=YES
TV_REACT_BUILD_CLEAN=GREEN
```

Important files added:

* `apps/crablink-tv/src/catalog/TvCreatorProfileAcceptance.source.test.mjs`
* `scripts/check-crablink-tv-creator-profile-acceptance-boundary.mjs`

Important lesson:

The first Phase 8G attempt failed because the checker scanned all of `TvApp.jsx` for `ledger`. That was too broad because existing baseline ROC-readiness copy already contains `ledger`. The v2 fix scoped the scan to the new profile-polish surface.

Carry this lesson forward: **do not scan the entire app for forbidden words when existing baseline explanatory copy already contains those words. Scope scans to the new executable/model/panel surface.**

---

## Phase 8H — Phase 8 Home Catalog acceptance

Phase 8H is complete and green after v3.

What was accomplished:

* Added a dedicated Phase 8 Home Catalog acceptance source test.
* Added a Phase 8 acceptance boundary.
* Verified the full Phase 8 Home Catalog stack:

  * catalog model
  * route handoff
  * thumbnails
  * creator browse
  * creator profile
  * creator profile focus
  * creator profile acceptance polish
* Confirmed Phase 8 executable surfaces did not add forbidden authority.
* Updated boundary next markers to move from Phase 8 to Phase 9.
* Closed the Phase 8 Home Catalog track.

Confirmed green markers:

```text
PHASE8H_PHASE8_HOME_CATALOG_ACCEPTANCE=GREEN
PHASE8_HOME_CATALOG_TRACK=COMPLETE
PHASE8_ACCEPTANCE_SOURCE_TEST_COUNT=4
CATALOG_CREATOR_PROFILE_STACK_ACCEPTED=YES
NATIVE_COMMAND=NOT_ADDED
INVOKE_FETCH_STORAGE_AUTHORITY=ABSENT
WALLET_LEDGER_FINALITY_AUTHORITY=ABSENT_IN_PHASE8_EXECUTABLE_SURFACES
TV_REACT_BUILD_CLEAN=GREEN
NEXT_PATCH=PHASE9A_LIBRARY_ASSET_DETAIL_FOUNDATION
```

Important files added:

* `apps/crablink-tv/src/catalog/TvHomeCatalogPhase8Acceptance.source.test.mjs`
* `scripts/check-crablink-tv-phase8-home-catalog-acceptance-boundary.mjs`

Important fix history:

* Phase 8H v1 failed because it expected the wrong catalog projection name: `projectTvHomeCatalog`.
* Correct actual projection name is `projectTvCatalogResponse`.
* Phase 8H v1 also read the wrong package path from the test directory, resolving to `apps/package.json`.
* Fixed by reading `package.json` from the TV app root.
* Phase 8H v2 failed because the acceptance boundary required older predecessor boundaries to already have the new Phase 9 next marker.
* Phase 8H v3 fixed next-marker updates robustly with regex replacement across older Phase 8 boundary scripts.
* v3 passed.

Current important marker:

```text
NEXT_PATCH=PHASE9A_LIBRARY_ASSET_DETAIL_FOUNDATION
```

---

# Current repository state at end of session

The repo should currently include the completed Phase 8 files and checks.

Persisted Phase 8 files should include:

```text
apps/crablink-tv/src/catalog/tvCatalogThumbnailModel.js
apps/crablink-tv/src/catalog/tvCatalogThumbnailModel.test.mjs
apps/crablink-tv/src/catalog/tvCreatorProfileModel.js
apps/crablink-tv/src/catalog/tvCreatorProfileModel.test.mjs
apps/crablink-tv/src/catalog/TvCreatorProfilePanel.jsx
apps/crablink-tv/src/catalog/TvCreatorProfilePanel.source.test.mjs
apps/crablink-tv/src/catalog/tvCreatorProfileFocusModel.js
apps/crablink-tv/src/catalog/tvCreatorProfileFocusModel.test.mjs
apps/crablink-tv/src/catalog/TvCreatorProfileAcceptance.source.test.mjs
apps/crablink-tv/src/catalog/TvHomeCatalogPhase8Acceptance.source.test.mjs
scripts/check-crablink-tv-catalog-thumbnail-boundary.mjs
scripts/check-crablink-tv-creator-profile-boundary.mjs
scripts/check-crablink-tv-creator-profile-focus-boundary.mjs
scripts/check-crablink-tv-creator-profile-acceptance-boundary.mjs
scripts/check-crablink-tv-phase8-home-catalog-acceptance-boundary.mjs
```

The repo should **not** currently include the Phase 9A files, because Phase 9A rolled back.

Expected missing Phase 9A files after rollback:

```text
apps/crablink-tv/src/library/tvLibraryAssetDetailModel.js
apps/crablink-tv/src/library/tvLibraryAssetDetailModel.test.mjs
apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx
apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.source.test.mjs
scripts/check-crablink-tv-library-asset-detail-boundary.mjs
```

The Phase 9A verification output showed those files missing because rollback succeeded. That is expected and healthy.

---

# Phase 9A attempt summary — not persisted

Phase 9A was attempted at the end of the session.

Patch goal:

**Library asset detail foundation**

Intended behavior:

* Add a local Library asset-detail projection model.
* Build details from already reviewed asset handoffs.
* Use canonical route identifiers only:

  * asset kind
  * canonical crab URL
  * B3 CID
  * hash
* Add visible Library asset detail panel.
* Wire asset catalog cards into Library detail state.
* Avoid raw asset loading.
* Avoid native/gateway reads.
* Avoid wallet, ledger, ROC, finality, entitlement, receipt, reward, or storage authority.

What passed during the attempted mutation:

```text
PHASE9A_LIBRARY_ASSET_DETAIL_BASELINE=VALID
PHASE9A_LIBRARY_ASSET_DETAIL_NEW_FILE_SYNTAX=GREEN
LIBRARY_ASSET_DETAIL_MODEL_SYNTAX=GREEN
LIBRARY_ASSET_DETAIL_TEST_SYNTAX=GREEN
LIBRARY_ASSET_DETAIL_REACT_TEST_SYNTAX=GREEN
LIBRARY_ASSET_DETAIL_BOUNDARY_SYNTAX=GREEN
LIBRARY_ASSET_DETAIL_MODEL_TESTS=GREEN
LIBRARY_ASSET_DETAIL_REACT_SOURCE_TESTS=GREEN
TV_REACT_BUILD_CLEAN=GREEN
CODEBUNDLE_SCRIPT_SYNTAX=GREEN
CODEBUNDLE_BOUNDARY_SYNTAX=GREEN
```

Model tests passed:

```text
✔ library asset detail constants and idle view are explicit and immutable
✔ reviewed asset handoffs become bounded Library asset details
✔ non-detail and non-asset handoffs fail closed
✔ library asset detail bounds long text and focus keys
```

React/source tests passed:

```text
✔ library asset detail model projects reviewed asset route identifiers
✔ library asset detail panel renders identifiers without raw asset loading
✔ TV app stores Library asset detail state from reviewed asset handoffs
✔ library asset detail CSS exposes visible TV surfaces
```

Clean build passed during mutation:

```text
TV_REACT_BUILD_CLEAN=GREEN
```

But the mutation rolled back due to two boundary failures.

---

# Phase 9A failure details

## Failure 1 — Library asset detail boundary false positive

Failure:

```text
Error: library asset detail app slice acquired forbidden ledger authority.
```

Cause:

The boundary scanned an app slice around `projectTvLibraryAssetDetail`, `TvLibraryAssetDetailPanel`, and `libraryAssetDetailView`. That slice still captured existing baseline copy in `TvApp.jsx` containing the word `ledger`, likely from the existing ROC truth/readiness cards:

```text
No placeholder balance, direct reward claim, or local ledger authority...
```

This is not newly added Phase 9A authority. It is pre-existing explanatory text.

Fix for next session:

* Do not scan a broad `TvApp.jsx` slice for `ledger`.
* Either:

  * scan only the new Library asset detail model and panel for forbidden authority, and separately check the app only for forbidden executable markers like `invoke(`, `fetch(`, `tv_library_asset_read`, storage, timers; or
  * build a narrower app slice that only captures the new Library integration block and does not include baseline readiness copy; or
  * use positive assertions for app integration and a narrow denylist for actual authority APIs, not plain text words like `ledger`.
* Keep the `ledger`/`wallet`/`finality` denylist for the new model and panel surfaces, where it is meaningful.
* Avoid broad whole-app word scans because `TvApp.jsx` intentionally contains existing explanatory terms like `ledger`, `reward`, `ROC`, etc.

Recommended correction:

In `scripts/check-crablink-tv-library-asset-detail-boundary.mjs`, change this:

```js
['library asset detail app slice', appLibrarySlice]
```

so it does not apply the full forbidden word list to the app slice.

Use separate app checks:

```js
for (const pattern of [
  /\binvoke\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetInterval\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\blocalStorage\b/u,
  /\bsessionStorage\b/u,
  /\bindexedDB\b/u,
  /tv_library_asset_read/u,
]) {
  if (pattern.test(appLibrarySlice)) {
    throw new Error(`Library app slice acquired forbidden behavior: ${pattern}`);
  }
}
```

Then keep the full semantic authority word scan for:

```text
tvLibraryAssetDetailModel.js
TvLibraryAssetDetailPanel.jsx
```

That matches the fix pattern used successfully in Phase 8G v2.

---

## Failure 2 — Phase 8 predecessor boundary next-marker mismatch

Failure:

```text
Error: home catalog React boundary missing: NEXT_PATCH=PHASE9B_LIBRARY_ASSET_DETAIL_ACCEPTANCE
```

Cause:

During Phase 9A, the patch updated the Phase 8 acceptance boundary from:

```text
NEXT_PATCH=PHASE9A_LIBRARY_ASSET_DETAIL_FOUNDATION
```

to:

```text
NEXT_PATCH=PHASE9B_LIBRARY_ASSET_DETAIL_ACCEPTANCE
```

Then the new Phase 9A boundary required every predecessor Phase 8 boundary, including older Home Catalog React boundary, to also have:

```text
NEXT_PATCH=PHASE9B_LIBRARY_ASSET_DETAIL_ACCEPTANCE
```

But the older Home Catalog React boundary apparently still had a stale or different `NEXT_PATCH` marker. This is the same category of issue we hit in Phase 8H: older boundary scripts often keep historical next markers. Treat this as metadata/checker maintenance, not a functional Phase 9A behavior failure.

Fix for next session:

* In Phase 9A v2, robustly update all relevant predecessor boundary scripts using regex replacement:

```python
re.sub(
    r"NEXT_PATCH=PHASE[0-9A-Z_]+",
    "NEXT_PATCH=PHASE9B_LIBRARY_ASSET_DETAIL_ACCEPTANCE",
    text,
)
```

* Apply that replacement to all predecessor scripts Phase 9A wants to check, including:

```text
scripts/check-crablink-tv-home-catalog-react-boundary.mjs
scripts/check-crablink-tv-catalog-route-handoff-boundary.mjs
scripts/check-crablink-tv-creator-browse-boundary.mjs
scripts/check-crablink-tv-creator-browse-react-boundary.mjs
scripts/check-crablink-tv-catalog-thumbnail-boundary.mjs
scripts/check-crablink-tv-creator-profile-boundary.mjs
scripts/check-crablink-tv-creator-profile-focus-boundary.mjs
scripts/check-crablink-tv-creator-profile-acceptance-boundary.mjs
scripts/check-crablink-tv-phase8-home-catalog-acceptance-boundary.mjs
```

* Alternatively, do not require every older boundary to carry the newest next marker; require only its own green marker. However, our recent patch style has been updating predecessor next markers to keep momentum and reduce stale guidance, so regex replacement is probably the better fit.

---

# Recommended next-session starting point

Do not regenerate a codebundle at the start of the next session unless source inspection becomes genuinely necessary.

Start with:

**Phase 9A Library asset detail foundation v2**

Purpose:

* Reapply the same useful Phase 9A functionality.
* Correct the boundary false positive for `ledger`.
* Correct predecessor next-marker replacement.
* Keep the same focused tests that already passed.

Next patch should be named:

```text
PHASE9A_LIBRARY_ASSET_DETAIL_FOUNDATION_V2
```

or function name:

```bash
apply_phase9a_library_asset_detail_foundation_fast_v2
```

The v2 patch should preserve the working pieces from the failed Phase 9A attempt:

* `tvLibraryAssetDetailModel.js`
* `tvLibraryAssetDetailModel.test.mjs`
* `TvLibraryAssetDetailPanel.jsx`
* `TvLibraryAssetDetailPanel.source.test.mjs`
* `check-crablink-tv-library-asset-detail-boundary.mjs`
* `TvApp.jsx` integration
* `tv.css` Library detail styles
* package script additions
* codebundle boundary additions

But fix:

1. Scoped authority scan in library asset detail boundary.
2. Robust predecessor `NEXT_PATCH` replacement.

Expected successful markers for next session:

```text
PHASE9A_LIBRARY_ASSET_DETAIL_FOUNDATION_APPLIED=YES
PHASE9A_LIBRARY_ASSET_DETAIL_FOUNDATION=GREEN
LIBRARY_ASSET_DETAIL_MODEL_TEST_COUNT=4
VISIBLE_LIBRARY_ASSET_DETAIL_PANEL=YES
ASSET_ROUTE_IDENTIFIERS=CANONICAL_ONLY
RAW_ASSET_LOADING=ABSENT
NATIVE_COMMAND=NOT_ADDED
INVOKE_FETCH_STORAGE_AUTHORITY=ABSENT
WALLET_LEDGER_ROC_FINALITY_AUTHORITY=ABSENT
TV_REACT_BUILD_CLEAN=GREEN
NEXT_PATCH=PHASE9B_LIBRARY_ASSET_DETAIL_ACCEPTANCE
```

---

# Exact command/test posture for next session

When starting next session, do not run a broad full suite first. Use QuickChain-style focused checks.

Recommended first patch verification sequence after applying Phase 9A v2:

```text
node --check apps/crablink-tv/src/library/tvLibraryAssetDetailModel.js
node --check apps/crablink-tv/src/library/tvLibraryAssetDetailModel.test.mjs
node --check apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.source.test.mjs
node --check scripts/check-crablink-tv-library-asset-detail-boundary.mjs
npm run tv:library-asset-detail:test
npm run tv:library-asset-detail-react:test
npm run tv:library-asset-detail:check
npm run tv:phase8-home-catalog-acceptance:check
npm --prefix apps/crablink-tv run build
bash -n scripts/make_codebundle.sh
node --check scripts/check-crablink-tv-codebundle-boundary.mjs
```

Keep using build-log scanning so a Vite/esbuild diagnostic does not get missed even when the build exits green.

---

# Phase 9A intended design details to preserve

The model from the failed attempt was good and should be reused.

## Intended new model

File:

```text
apps/crablink-tv/src/library/tvLibraryAssetDetailModel.js
```

Exports:

```text
TV_LIBRARY_ASSET_DETAIL_SCHEMA
TV_LIBRARY_ASSET_DETAIL_KIND
TV_LIBRARY_ASSET_DETAIL_LIMITS
createIdleTvLibraryAssetDetail
projectTvLibraryAssetDetail
```

Schema:

```text
crablink.tv.library-asset-detail.v1
```

Kinds:

```text
idle
ready
rejected
```

Rules:

* Accept only `TV_CATALOG_CARD_HANDOFF_KIND.DETAIL`.
* Accept only handoff routes where `route.owner === 'asset'`.
* Reject non-detail handoffs.
* Reject non-asset handoffs.
* Bound all string fields.
* Freeze returned views.
* Preserve canonical route identifiers from already reviewed route:

  * `route.assetKind`
  * `route.normalized`
  * `route.cid`
  * `route.hash`
* Do not load raw asset bytes.
* Do not call native or gateway commands.
* Do not invent asset finality.

## Intended tests

File:

```text
apps/crablink-tv/src/library/tvLibraryAssetDetailModel.test.mjs
```

Tests that already passed:

```text
library asset detail constants and idle view are explicit and immutable
reviewed asset handoffs become bounded Library asset details
non-detail and non-asset handoffs fail closed
library asset detail bounds long text and focus keys
```

## Intended panel

File:

```text
apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx
```

Behavior:

* Visible Library asset detail panel.
* Shows empty state if no asset selected.
* Shows reviewed route identifiers when ready.
* Displays:

  * Kind
  * Canonical crab URL
  * B3 CID
  * Hash
* Has a remote-focusable clear button:

  * focus key: `library-asset-detail-clear`
* No `<img>`.
* No `src=`.
* No fetch/invoke/storage/native reads.
* No wallet/ledger/ROC/finality behavior.

## Intended panel/source tests

File:

```text
apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.source.test.mjs
```

Tests that already passed:

```text
library asset detail model projects reviewed asset route identifiers
library asset detail panel renders identifiers without raw asset loading
TV app stores Library asset detail state from reviewed asset handoffs
library asset detail CSS exposes visible TV surfaces
```

## Intended app integration

File:

```text
apps/crablink-tv/src/app/TvApp.jsx
```

Add imports:

```text
createIdleTvLibraryAssetDetail
projectTvLibraryAssetDetail
TvLibraryAssetDetailPanel
```

Add state:

```text
libraryAssetDetailView
setLibraryAssetDetailView
```

Add clear function:

```text
clearLibraryAssetDetail
```

In `inspectCatalogItem`, after creator-profile handling and before generic detail fallback:

```text
if handoff.route?.owner === 'asset':
  projectTvLibraryAssetDetail(...)
  setLibraryAssetDetailView(...)
  navigateToSection(handoff.targetSectionId, initiatingFocusKey)
  openDetail(handoff.overlay)
  setActivityMessage(...)
  return
```

Render Library panel only on Library section:

```text
activeSectionId === 'library'
```

Important: this can coexist with the existing overlay detail. In Phase 9A, the Library asset detail panel is the persistent visible Library surface, while `openDetail(handoff.overlay)` still shows the already existing bounded route detail overlay. Do not introduce gateway-backed asset hydration yet.

## Intended CSS

File:

```text
apps/crablink-tv/src/styles/tv.css
```

Add visible surfaces:

```text
.tv-library-asset-detail
.tv-library-asset-detail__heading
.tv-library-asset-detail__copy
.tv-library-asset-detail__card
.tv-library-asset-detail__fact
.tv-library-asset-detail__empty
```

---

# Important project rules to keep following

Do:

* Provide paste-ready Bash mutation blocks.
* Provide a separate verification block.
* Use plain text, human-readable patches only.
* Keep patches small and focused.
* Run focused tests first.
* Fix the first failing compiler/test/boundary issue before expanding scope.
* Keep using rollback-safe mutations.
* Keep checking clean Vite build logs for hidden plugin diagnostics.
* Update codebundle boundary coverage when adding files, but do not regenerate the codebundle unless genuinely needed.
* Preserve light/dark support.
* Keep dark mode as the intended default before the next Android TV APK/device test.

Do not:

* Do not use base64, gzip, compressed, encoded, or opaque payloads.
* Do not include `git add`, `git commit`, or `git push` unless explicitly requested.
* Do not end terminal blocks with `exit` or `exit 0`.
* Do not rely on zsh `pipestatus`.
* Do not add live wallet calls.
* Do not add live ledger mutation.
* Do not add live RPC submission.
* Do not add production deployment behavior.
* Do not add production minting/burning.
* Do not add bridge settlement.
* Do not add staking/liquidity/exchange behavior.
* Do not fake finality or fake success output.
* Do not add placeholder-only scaffolding.
* Do not run broad codebundle regeneration unless needed.

---

# Current next-phase roadmap

## Immediate next session

Start with:

```text
PHASE9A_LIBRARY_ASSET_DETAIL_FOUNDATION_V2
```

Fixes needed:

* Scope the Library asset detail boundary app authority scan.
* Robustly update predecessor boundary next markers to `PHASE9B_LIBRARY_ASSET_DETAIL_ACCEPTANCE`.
* Reapply the model, panel, app integration, CSS, package scripts, and codebundle boundary entries from the prior Phase 9A attempt.

Goal:

```text
PHASE9A_LIBRARY_ASSET_DETAIL_FOUNDATION=GREEN
```

## After Phase 9A

Next marker should be:

```text
PHASE9B_LIBRARY_ASSET_DETAIL_ACCEPTANCE
```

Likely Phase 9B goals:

* Add explicit acceptance around Library asset detail.
* Confirm asset cards from Home route into Library detail reliably.
* Confirm canonical-only route identifiers remain visible.
* Confirm no raw image/media loading.
* Confirm no gateway/native reads.
* Confirm no fake ownership/entitlement/finality.
* Confirm focus/clear path does not interfere with creator profile focus behavior.
* Keep full TV build clean.

## After Phase 9B

Likely Phase 9C / Phase 9 continuation:

* Add Library list/foundation from reviewed local state, not storage.
* Add asset detail return focus model if needed.
* Add bounded asset preview placeholders, not real media loading.
* Add problem overlay behavior for rejected Library asset routes.
* Add acceptance for Library section from Home asset cards.
* Still avoid gateway-backed asset hydration until the build plan explicitly reaches that part.

## Broader CrabLink TV path after Phase 9

Likely later phases, based on current direction:

* Phase 9: Library asset detail and Library section acceptance.
* Phase 10: More visible TV surfaces before next Android TV APK test.
* After Phase 10: build/test another Android TV APK on device.
* After TV reaches a strong milestone: continue toward regular Android app.
* After Android app: move toward iOS/iPadOS app, as previously discussed.

---

# Current status for next assistant

Begin next session by saying:

“Phase 8 is complete. Phase 9A was attempted and rolled back. We need Phase 9A v2: same Library asset-detail model/panel integration, but with scoped authority checks and robust predecessor next-marker repair.”

Then provide a full corrected paste-ready Bash mutation block and a separate verification block.

Do **not** ask for a new codebundle unless the next terminal output exposes source mismatch that cannot be diagnosed from the pasted output.

Do **not** produce a carry-over note patch unless the user explicitly asks to write notes into a repo file.


### END NOTE - JULY 20 2026 - 12:30 CST


### BEGIN NOTE - JULY 21 2026 - 10:55 CST


# CRABLINK TV — COMPREHENSIVE SESSION CARRY-OVER NOTES

**Session date:** July 21, 2026
**Repository:** `/Users/mymac/Desktop/crablink`
**Primary application:** `apps/crablink-tv`
**Current broad build-plan phase:** TV Phase 9 — B3 Asset and Content View Proof
**Current granular implementation point:** Phase 9J v4A complete
**Exact next patch:** `PHASE9J_V4B_LIBRARY_MANUAL_VERIFY_REACT_HANDOFF`

These notes are intended for `ANDROID_TV_NOTES.md`. They cover the complete state of CrabLink TV at the end of this session, including the marker-chain repairs, Android TV APK test, Phase 9J implementation progress, verification results, unresolved boundaries, and the work sequence for the next session and thereafter.

---

## 1. Executive handoff status

CrabLink TV is currently in a healthy and compile-clean state.

The repository has advanced beyond the old Phase 9I-only implementation baseline. Phase 9J has now been split into smaller implementation slices:

```text
Phase 9J v4A — manual verification execution foundation: COMPLETE
Phase 9J v4B — React execution handoff: NEXT
Phase 9K — verified render display: AFTER v4B
Phase 10 — real video/audio playback proof: AFTER Phase 9
```

The exact current condition is:

```text
PHASE9J_V4A_MANUAL_VERIFY_EXECUTION_FOUNDATION=GREEN
GATEWAY_HTTP_TRANSPORT=ADDED
REVIEWED_GATEWAY_PROFILE_REUSED=YES
PHASE9H_VERIFY_FLOW_REUSED=YES
DUPLICATE_REQUEST_LOCK=ADDED
RAW_GATEWAY_EVIDENCE_RETURNED_TO_REACT=NO
REACT_EXECUTION_HANDOFF=NOT_ADDED_IN_V4A
TV_REACT_BUILD_CLEAN=GREEN
NEXT_PATCH=PHASE9J_V4B_LIBRARY_MANUAL_VERIFY_REACT_HANDOFF
```

All focused Phase 9J v4A tests passed. Phase 9H and Phase 9I regressions remained green, and the production Vite build succeeded. No rollback occurred. 

The broad Phase 9 exit gate has **not** been reached yet. The build plan requires real B3-backed image and text/article rendering, corrupt-content rejection, and no direct provider fallback before Phase 9 can be considered complete. 

---

# 2. Major accomplishments during this session

## 2.1 The Phase 8 through Phase 9 predecessor-marker chain was repaired

Before continuing Phase 9J implementation, the repository had several stale `NEXT_PATCH` markers left over from earlier failed or rolled-back Phase 9J attempts.

The repair updated the complete affected chain so that the completed predecessor boundaries now point toward:

```text
NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY
```

The repaired chain included:

```text
scripts/check-crablink-tv-home-catalog-react-boundary.mjs
scripts/check-crablink-tv-catalog-route-handoff-boundary.mjs
scripts/check-crablink-tv-creator-browse-boundary.mjs
scripts/check-crablink-tv-creator-browse-react-boundary.mjs
scripts/check-crablink-tv-catalog-thumbnail-boundary.mjs
scripts/check-crablink-tv-creator-profile-boundary.mjs
scripts/check-crablink-tv-creator-profile-focus-boundary.mjs
scripts/check-crablink-tv-creator-profile-acceptance-boundary.mjs
scripts/check-crablink-tv-phase8-home-catalog-acceptance-boundary.mjs
scripts/check-crablink-tv-library-asset-detail-boundary.mjs
```

The repair passed:

```text
syntax checks for all ten files
Phase 8 Home catalog React boundary
catalog route handoff boundary
creator browse model boundary
creator browse React boundary
thumbnail boundary
creator profile boundary
creator profile focus boundary
creator profile acceptance boundary
Phase 8 closing acceptance boundary
Phase 9A Library-detail boundary
Phase 9B Library-detail acceptance boundary
```

Final repair markers were:

```text
PHASE8_PHASE9A_SUCCESSOR_CHAIN_REPAIR=GREEN
PHASE8_HOME_CATALOG_ACCEPTANCE=GREEN
PHASE9A_LIBRARY_ASSET_DETAIL_BOUNDARY=GREEN
PHASE9B_LIBRARY_ASSET_DETAIL_ACCEPTANCE=GREEN
REMAINING_PHASE9J_MARKERS_IN_REPAIRED_CHAIN=0
```

This ended the prior situation where each later boundary exposed another stale predecessor marker one at a time.

Important historical rule:

```text
DO_NOT_RERUN=PHASE9J_V3
```

Phase 9J v3 was built against the old marker state and must never be rerun.

---

## 2.2 A new 32-bit Android TV APK was built and tested

A new `armeabi-v7a` debug APK was built for the current Android TV device.

The target device remains:

```text
Android TV OS: 14
Device build: rk3539_box_32-user 14 UTT2.241219.001
Working ABI: armeabi-v7a / 32-bit
64-bit APK posture: previously rejected by this device
Installation method: USB thumb drive
ADB on TV: not currently used
```

The preserved APK was placed under:

```text
/Users/mymac/Desktop/crablink/artifacts/crablink-tv/
```

The generated Gradle APK was under:

```text
/Users/mymac/Desktop/crablink/apps/crablink-tv/src-tauri/gen/android/app/build/outputs/apk/
```

The APK was successfully installed and launched on the Android TV box.

### What the device test proved

The following were visibly working:

```text
32-bit APK installs successfully
application launches successfully
dark mode is the default
light mode support remains preserved
landscape TV layout works
all five top-level tabs are reachable
D-pad focus is strongly visible
focus moves across top navigation
text remains readable at television distance
safe-area spacing is generally appropriate
the app does not look like a stretched mobile layout
```

The five visible top-level surfaces were:

```text
Home
Earn ROC
Library
Pair
Settings
```

### What the device test revealed

The five first-view screens currently use essentially the same large hero-page structure:

```text
small section label
very large headline
descriptive paragraph
two generic action buttons
large unused right-side area
```

This makes the application look more like an architectural or product prototype than a finished content application.

The test confirmed that a great deal of current work is infrastructure and state-model work rather than visible UI work.

Specific visual observations:

```text
Headlines are readable but consume too much vertical and horizontal space.
The five routes look too similar to one another.
The right side of each page is mostly empty.
Generic review/native-bridge buttons reinforce the placeholder appearance.
Home does not yet immediately look like a streaming/content catalog.
Library does not yet look like an asset grid or collection.
Pair does not yet center a pairing code or QR challenge.
Settings does not yet resemble a settings dashboard.
Earn ROC does not yet show tasks, progress, history, or confirmed outcomes.
```

Some implemented panels may render farther down the page or only after valid gateway/backend state becomes available. Nevertheless, the first visible screen remains introductory and largely placeholder-like.

### Important physical-device acceptance distinction

The APK proved the shell, packaging, focus presentation, and route navigation.

It did **not** prove all of the broad Phase 8 or Phase 9 physical-device exit gates.

Still unproven on the physical TV:

```text
loading a real controlled-environment catalog
showing real catalog rails on the first screen
opening a real backend creator profile
fetching a real B3 asset through the gateway
running native manifest verification from the Verify button
rendering a real verified image
rendering a real verified article/text asset
rejecting a deliberately corrupt asset on-device
LAN cleartext/HTTPS behavior from the Android WebView
Android WebView CORS behavior for the gateway origin
```

The APK that was tested represented the **Phase 9I React behavior**. It was built before Phase 9J v4A was applied, so the installed APK does not contain the new v4A execution foundation.

---

# 3. Phase 9J v4A implementation completed

Phase 9J was intentionally divided into smaller slices after earlier large patches repeatedly rolled back due to stale boundary assumptions.

Phase 9J v4A added the non-React execution foundation first.

The slice did **not** wire the Verify button to real execution yet.

---

## 3.1 New files added

The following files now exist in the repository:

```text
apps/crablink-tv/src/library/tvGatewayAssetHttpTransport.js

apps/crablink-tv/src/library/tvGatewayAssetHttpTransport.test.mjs

apps/crablink-tv/src/library/tvLibraryManualVerifyExecution.js

apps/crablink-tv/src/library/tvLibraryManualVerifyExecution.test.mjs

scripts/check-crablink-tv-library-manual-verify-execution-foundation-boundary.mjs
```

---

## 3.2 Existing files modified

The following existing files were changed:

```text
apps/crablink-tv/package.json

package.json

scripts/make_codebundle.sh

scripts/check-crablink-tv-codebundle-boundary.mjs
```

These changes added:

```text
focused Phase 9J v4A package scripts
root convenience scripts
Phase 9J v4A steps to the TV check chain
future codebundle coverage for the new source files
future codebundle coverage for the new boundary script
```

No React component was modified in v4A.

No Rust command was added in v4A.

The existing fixed native asset-manifest command and adapter are reused later by injection.

---

# 4. New bounded HTTP transport behavior

The new transport file is:

```text
apps/crablink-tv/src/library/tvGatewayAssetHttpTransport.js
```

Its purpose is to provide one narrow, reviewed browser/WebView HTTP surface for fetching gateway manifest JSON and small asset bytes.

React does not call `fetch` directly.

The gateway fetch model consumes injected transport methods.

---

## 4.1 Transport operations

The transport exposes:

```text
createTvGatewayAssetHttpTransport(...)
tvGatewayAssetHttpTransport
fetchJson(...)
fetchBytes(...)
```

The default implementation uses:

```text
globalThis.fetch
```

This keeps the global fetch dependency confined to one reviewed adapter.

---

## 4.2 Fixed request posture

Every request must use:

```text
method: GET
credentials: omit
cache: no-store
redirect: error
```

This means:

```text
no cookies
no ambient browser credentials
no cached response acceptance
no redirect following
no POST/PUT/PATCH/DELETE authority
```

---

## 4.3 URL restrictions

The transport accepts only:

```text
http:
https:
```

It rejects:

```text
file:
data:
javascript:
other non-HTTP schemes
URLs containing a username
URLs containing a password
empty or malformed URL values
```

The transport does not accept a command name, local path, provider selector, or arbitrary native operation.

The URL ultimately comes from the already-reviewed gateway profile plus typed asset-evidence route construction.

---

## 4.4 Body-size limits

The currently defined limits are:

```text
MAX_MANIFEST_BYTES=65,536
MAX_ASSET_BYTES=4,194,304
```

Equivalent approximate sizes:

```text
manifest: 64 KiB
small asset: 4 MiB
```

The transport checks the declared `Content-Length` when available.

It also checks the actual body size after reading.

Manifest JSON that exceeds the limit is rejected.

Empty or oversized byte responses are rejected.

This is intended for small verified assets, not large video/audio media.

Large media remains a Phase 10 concern.

---

## 4.5 Response handling

For JSON:

```text
status must be successful
declared size must be within the limit
text is read
encoded text size is checked
JSON is parsed
```

For bytes:

```text
status must be successful
declared size must be within the limit
arrayBuffer is read
actual byte size is checked
Uint8Array is returned to the internal flow
```

The transport itself may internally return bytes to the verification flow, but the Phase 9J execution result intentionally does not expose the bytes to React.

---

# 5. New manual-verification execution model

The new execution file is:

```text
apps/crablink-tv/src/library/tvLibraryManualVerifyExecution.js
```

This model composes the existing Phase 9 surfaces:

```text
active reviewed Library detail
reviewed gateway-profile port
bounded HTTP transport
Phase 9G gateway evidence model
Phase 9E fixed native asset-manifest adapter
Phase 9H verification flow
verified render projection
```

It does not invent a second verification rule set.

---

## 5.1 Execution schema and states

The schema is:

```text
crablink.tv.library-manual-verify-execution.v1
```

The states are:

```text
idle
running
ready
rejected
blocked
```

These states are immutable/frozen outputs.

---

## 5.2 Entry points

The model provides:

```text
createIdleTvLibraryManualVerifyExecution(...)

createRunningTvLibraryManualVerifyExecution(...)

runTvLibraryManualVerifyExecution(...)

createTvLibraryManualVerifyExecutionLock(...)
```

---

## 5.3 Reviewed gateway reuse

The execution model expects an injected gateway-profile port with:

```text
readGatewayProfile()
```

The existing Tauri TV adapter already exposes:

```text
tvGatewayProfilePort
```

The expected reviewed gateway profile must have:

```text
schema: crablink.tv.gateway-profile.v1
state: ready
origin: non-empty string
```

Invalid, unavailable, malformed, or non-ready gateway profiles fail closed.

The execution model does not hardcode a localhost address or LAN IP.

It reuses the reviewed profile selected by the existing settings/network path.

---

## 5.4 Verification-flow reuse

The execution model delegates to:

```text
runTvLibraryAssetVerifyFlow(...)
```

That Phase 9H flow already owns composition of:

```text
gateway evidence retrieval
native manifest verification
asset/detail identity matching
verified-render projection
fail-closed rejection
```

The Phase 9J model does not recreate those rules.

---

## 5.5 Native adapter posture

The execution model consumes the manifest adapter through dependency injection.

It does not import:

```text
@tauri-apps/api
invoke
tauriTvAdapter
tvAssetManifestAdapter
```

The React integration in v4B will supply the existing:

```text
tvAssetManifestAdapter
```

This maintains the narrow fixed-command architecture.

---

## 5.6 Duplicate-request lock

The new lock prevents concurrent manual verification requests.

Behavior:

```text
first request begins
lock reports running
second request while first is active is blocked
second request receives TV_LIBRARY_MANUAL_VERIFY_DUPLICATE_REQUEST
first request completes
lock releases in finally
later requests may run
```

This is important for TV remotes because repeated Center/Enter presses can otherwise queue duplicate gateway and native work.

### Critical integration requirement

The lock is stateful per instance.

The React handoff must create one stable instance using something equivalent to:

```text
useRef
```

or another stable lifecycle mechanism.

It must **not** construct a new lock on every React render, or duplicate protection would be defeated.

---

## 5.7 Fail-closed behavior

The execution model rejects or blocks:

```text
missing active Library asset
non-ready Library detail
missing gateway-profile adapter
gateway profile read failure
invalid gateway profile schema
non-ready gateway profile
missing verification flow
verification-flow exception
verification-flow rejection
native verification failure
identity mismatch propagated by the Phase 9H flow
duplicate execution request
```

Messages and error codes are bounded before being returned to UI state.

---

## 5.8 Data intentionally not returned to React

The execution result does not expose:

```text
raw gateway evidence
raw manifest response
raw asset bytes
unrestricted URL
capability material
wallet state
ledger state
receipt authority
reward authority
ROC authority
entitlement authority
finality authority
```

React receives bounded execution state and verified-render facts only.

---

# 6. Phase 9J v4A focused tests

## 6.1 Gateway HTTP transport tests

Test command:

```text
npm --prefix apps/crablink-tv run test:gateway-asset-http-transport
```

Result:

```text
tests: 2
pass: 2
fail: 0
```

Test coverage:

```text
fixed anonymous no-store GET requests
HTTP and HTTPS acceptance
non-HTTP scheme rejection
URL credential rejection
response-status rejection
declared oversize rejection
bounded byte response acceptance
Uint8Array projection
```

---

## 6.2 Manual execution tests

Test command:

```text
npm --prefix apps/crablink-tv run test:library-manual-verify-execution
```

Result:

```text
tests: 4
pass: 4
fail: 0
```

Test coverage:

```text
explicit immutable constants and idle/running views
reviewed gateway profile and Phase 9H flow composition
fail-closed gateway rejection
fail-closed verification-flow rejection
no raw evidence/asset-byte return
duplicate-request rejection
lock release after completion
```

---

## 6.3 New Phase 9J v4A boundary

Boundary command:

```text
npm --prefix apps/crablink-tv run check:library-manual-verify-execution-foundation
```

Result:

```text
PHASE9J_V4A_MANUAL_VERIFY_EXECUTION_FOUNDATION=GREEN
```

The boundary proves:

```text
fixed anonymous GET transport
redirect rejection
bounded JSON and byte bodies
reviewed gateway origin
injected Phase 9H flow
no raw evidence return
duplicate-request lock
no React handoff in v4A
no dynamic invoke
no storage authority
no wallet/ledger/receipt/reward/ROC/entitlement/finality authority
```

---

# 7. Regression checks completed after v4A

## 7.1 Phase 9H model regression

Command:

```text
npm --prefix apps/crablink-tv run test:library-asset-verify-flow
```

Result:

```text
tests: 5
pass: 5
fail: 0
```

Coverage remained green for:

```text
idle flow state
image verification composition
article verification composition
gateway/evidence rejection
missing native adapter rejection
native failure
mismatched verified result rejection
```

---

## 7.2 Phase 9H boundary regression

Command:

```text
npm --prefix apps/crablink-tv run check:library-asset-verify-flow
```

Result:

```text
PHASE9H_LIBRARY_ASSET_VERIFY_FLOW=GREEN
```

The existing boundary still confirms:

```text
active Library-detail binding
canonical URL binding
B3 CID binding
asset-kind binding
no React auto-run
no global fetch in React
no storage
no img/src rendering
no wallet/ledger/receipt/reward/ROC/entitlement/finality authority
```

---

## 7.3 Phase 9I UI-model regression

Command:

```text
npm --prefix apps/crablink-tv run test:library-verify-ui
```

Result:

```text
tests: 5
pass: 5
fail: 0
```

The UI model still handles:

```text
idle state
ready image asset
ready article asset
rejected previous render state
unsupported asset blocking
already-verified asset blocking
manual request-state transition
```

---

## 7.4 Phase 9I UI boundary regression

Command:

```text
npm --prefix apps/crablink-tv run check:library-verify-ui
```

Result:

```text
PHASE9I_LIBRARY_VERIFY_UI=GREEN
```

The boundary now truthfully states:

```text
manual verifier execution is owned by Phase 9J
```

However, the React handoff has not yet been applied.

---

## 7.5 Production React build

Command:

```text
npm --prefix apps/crablink-tv run build
```

Result:

```text
84 modules transformed
production build succeeded
TV_REACT_BUILD_CLEAN=GREEN
```

Output observed:

```text
dist/index.html
dist/assets/index-BvXOsoTr.css
dist/assets/index-D1wbzLvN.js
```

The v4A mutation and separate verification both completed with no failures. 

---

# 8. Current codebundle status

At the beginning of the session, the user ran:

```text
bash scripts/make_codebundle.sh
```

That generated:

```text
/Users/mymac/Desktop/crablink/CODEBUNDLE_TAURI_APP.md
```

The attached `CODEBUNDLE_TAURI_APP(59).md` represented the baseline used before Phase 9J v4A was applied. It was a valid source-inspection reference for the Phase 9I baseline and predecessor-marker state. 

Important distinction:

```text
CODEBUNDLE_TAURI_APP(59).md = pre-v4A source snapshot
current repository = post-v4A source
```

The current repository is ahead of that attached codebundle by the five new v4A files and the four modified package/codebundle files.

The v4A patch updated `make_codebundle.sh` and the codebundle boundary so the next generated bundle will include the new files.

Do not regenerate another codebundle automatically.

Regenerate only when:

```text
the next session needs exact post-v4A source inspection
a patch anchor cannot be verified from the existing source snapshot
a meaningful implementation milestone has been completed
the existing bundle is materially stale for the requested work
```

---

# 9. Current implementation truth at session end

The exact source posture is:

```text
Phase 8 implementation: complete at current automated-boundary level
Phase 9A Library detail: complete
Phase 9B Library detail acceptance: complete
Phase 9C verified asset manifest model: present
Phase 9D native asset-manifest command: present
Phase 9E fixed frontend adapter: present
Phase 9F verified-render projection model: present
Phase 9G gateway asset-fetch model: present
Phase 9H composed verification flow: present
Phase 9I manual verification UI/request state: present
Phase 9J v4A execution foundation: present and green
Phase 9J v4B React handoff: not yet present
Phase 9K verified display: not yet complete
```

The current Verify button still only enters the local Phase 9I requested state.

It does not yet call:

```text
tvGatewayProfilePort
tvGatewayAssetHttpTransport
runTvLibraryManualVerifyExecution
tvAssetManifestAdapter
```

The application therefore cannot yet complete the real flow from a remote button press.

---

# 10. Exact next-session task

## Phase 9J v4B — Library manual verify React handoff

This must be the first implementation patch of the next session.

Do not jump directly to Phase 9K.

Do not rebuild another APK before v4B unless a debugging reason appears.

---

## 10.1 Primary v4B objective

Connect the existing remote-focusable Phase 9I Verify control to the new v4A execution foundation.

The final manual user path should become:

```text
user opens a reviewed image/article Library detail
→ Verify control is ready
→ user presses Center/Enter
→ UI enters running state
→ reviewed gateway profile is read
→ bounded gateway manifest/asset evidence is fetched
→ fixed native asset-manifest adapter validates the request
→ Phase 9H verifies identity and integrity
→ bounded execution result returns
→ verified-render facts are stored in React state
→ UI shows ready, rejected, blocked, or failure state truthfully
```

No automatic verification may occur.

---

## 10.2 Expected React dependencies

The v4B handoff will need to consume the existing narrow ports and models:

```text
tvGatewayProfilePort
tvAssetManifestAdapter
tvGatewayAssetHttpTransport
runTvLibraryManualVerifyExecution
createTvLibraryManualVerifyExecutionLock
createIdleTvLibraryManualVerifyExecution
createRunningTvLibraryManualVerifyExecution
```

The exact import location should remain narrow and intentional.

React must not import `invoke` directly.

React must not call `fetch` directly.

---

## 10.3 Expected files to change in v4B

Likely primary files:

```text
apps/crablink-tv/src/app/TvApp.jsx

apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx

apps/crablink-tv/src/library/TvLibraryVerifyUi.source.test.mjs

apps/crablink-tv/src/library/TvLibraryVerifiedAssetRender.source.test.mjs

apps/crablink-tv/src/styles/tv.css

apps/crablink-tv/package.json

package.json

scripts/make_codebundle.sh

scripts/check-crablink-tv-codebundle-boundary.mjs
```

Likely new files:

```text
apps/crablink-tv/src/library/TvLibraryManualVerifyExecution.source.test.mjs

scripts/check-crablink-tv-library-manual-verify-execution-boundary.mjs
```

A separate React controller/helper may be warranted if wiring directly into `TvApp.jsx` becomes too large. Avoid creating a placeholder-only abstraction.

---

## 10.4 Stable execution lock requirement

The v4B React code must retain one lock instance across renders.

Correct posture:

```text
one lock per mounted TV application or Library verification controller
stable through React rerenders
released after success or failure
reset only when the owner unmounts
```

Incorrect posture:

```text
createTvLibraryManualVerifyExecutionLock() inside render
new lock on each state change
duplicate requests accidentally allowed
```

---

## 10.5 Active-asset binding requirement

A verification result must never be applied to a different Library asset if the route changes while the request is running.

The v4B implementation must:

```text
capture the active canonical Crab URL
capture the active B3 CID
capture the active asset kind
run verification against that exact detail view
compare the result/request identity before applying it
ignore or reject stale completion after Library-detail replacement
reset execution/render state when the active detail changes
```

This is particularly important because gateway/native work is asynchronous.

---

## 10.6 Running-state UX

While verification is active:

```text
Verify control should be disabled or otherwise non-activating
button text/status should clearly indicate verification is running
duplicate remote presses must not queue work
Back/navigation behavior must remain predictable
canonical asset facts must remain visible
no fake progress percentage should be invented
```

A truthful label such as `Verifying…` is acceptable.

Do not invent stages that are not reported by the actual model.

---

## 10.7 Result-state UX

The panel must visibly distinguish:

```text
idle
ready to verify
running
verified
rejected
blocked
transport/profile/native failure
unsupported kind
already verified
```

Messages must come from bounded execution/core behavior rather than arbitrary success strings.

The UI may display verified facts, but it must not claim that raw content has rendered until Phase 9K implements that surface.

---

# 11. Two boundary traps that must be repaired in v4B

## 11.1 The v4A foundation boundary currently forbids React consumption

The current file:

```text
scripts/check-crablink-tv-library-manual-verify-execution-foundation-boundary.mjs
```

was intentionally written to prove that React did **not** consume the v4A foundation yet.

It currently rejects React/app usage of tokens such as:

```text
tvLibraryManualVerifyExecution
tvGatewayAssetHttpTransport
runTvLibraryAssetVerifyFlow
```

That behavior is correct for v4A but will become stale in v4B.

Before or as part of the React handoff, the v4A boundary must be updated so it continues to validate the foundation without prohibiting the now-intended reviewed React imports.

The boundary should continue proving:

```text
transport options remain fixed
limits remain bounded
execution model remains adapter-injected
execution model does not import Tauri
no storage/economic authority appears
duplicate lock remains present
```

It should stop claiming:

```text
React handoff is absent
React must not import the execution foundation
```

A new v4B boundary should own the React handoff assertions.

---

## 11.2 The stale Phase 9F adapter prohibition must be removed

Earlier Phase 9J v3 attempts exposed a stale assertion in:

```text
scripts/check-crablink-tv-library-verified-asset-render-boundary.mjs
```

That boundary still comes from a time before gateway/native execution ownership existed.

The stale logic prohibits the identifier:

```text
tvAssetManifestAdapter
```

inside the executable TV app.

That prohibition is no longer valid once Phase 9J v4B deliberately injects the fixed adapter.

The obsolete adapter-name ban must be removed.

However, the following direct-authority bans must remain:

```text
direct checkAssetManifest(...) invocation from React
direct invoke(...)
direct native command string ownership in React
direct arbitrary fetch in React
raw asset-byte rendering
unreviewed img/src behavior
wallet/ledger/ROC/finality authority
```

The intended distinction is:

```text
allowed:
React passes fixed tvAssetManifestAdapter into reviewed execution model

forbidden:
React directly calls checkAssetManifest(...)
React directly calls invoke(...)
```

This boundary repair should be included in v4B before the Phase 9F regression boundary is run.

---

# 12. Required v4B focused verification sequence

Use the faster focused cadence.

Do not run full TV/platform acceptance automatically.

The v4B mutation should run only:

```text
syntax checks for changed/new files

new v4B source/model tests

new v4B boundary

v4A transport tests

v4A execution tests

v4A foundation boundary after its intended update

Phase 9I verify UI model and boundary

Phase 9H verify flow model and boundary

Phase 9F verified-render model/source/boundary

Phase 9E adapter test/boundary if the adapter import changes

TV Vite production build
```

Run Rust or Android checks only if the patch unexpectedly changes native code, command contracts, capabilities, Android configuration, or shared platform contracts.

Expected successful markers should include something equivalent to:

```text
PHASE9J_V4B_LIBRARY_MANUAL_VERIFY_REACT_HANDOFF=GREEN
MANUAL_VERIFY_BUTTON_EXECUTION=ADDED
REVIEWED_GATEWAY_PROFILE_REUSED=YES
FIXED_ASSET_MANIFEST_ADAPTER_REUSED=YES
DUPLICATE_REQUEST_EXECUTION=BLOCKED
AUTOMATIC_VERIFICATION=ABSENT
DIRECT_REACT_FETCH=ABSENT
DIRECT_REACT_INVOKE=ABSENT
RAW_ASSET_RENDERING=NOT_ADDED
TV_REACT_BUILD_CLEAN=GREEN
NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY
```

If v4B completes all intended execution behavior, Phase 9J can then be considered complete.

---

# 13. Phase 9K work after v4B

## Phase 9K — Library verified render display

Phase 9K should turn verified results into a visibly useful Library experience.

This is where the project should begin addressing the placeholder-like device UI observed during the APK test.

---

## 13.1 Phase 9K visible goals

The Library surface should become recognizably distinct from the generic hero page.

It should show:

```text
asset identity
asset type
verification status
B3 CID
canonical crab:// route
gateway/source posture
verified/rejected state
content-specific display surface
retry or return controls
```

For verified assets, image and article/text views should no longer look identical.

---

## 13.2 Image display requirements

A verified image path must be designed carefully.

It must not simply assign an unreviewed provider URL to:

```text
<img src=...>
```

The implementation needs a reviewed lifecycle such as:

```text
gateway fetch
bounded bytes
full BLAKE3 verification
content-type validation
safe local/object URL creation
render
object URL revocation on detail change/unmount
```

Alternately, a narrow Tauri asset protocol or native verified-content command may be preferable if WebView object URLs prove unreliable.

The exact approach should be selected based on the current Tauri/Android environment rather than guessed.

Required image rejection cases:

```text
B3 mismatch
wrong asset kind
wrong canonical URL
wrong CID
unsupported content type
oversized body
empty body
invalid image bytes
stale result for another asset
privacy route unavailable
```

---

## 13.3 Article/text display requirements

For text/article:

```text
bytes must be fully verified
UTF-8 decoding must be bounded
malformed text must fail closed
HTML must not be injected unsafely
arbitrary script/style execution must remain impossible
ten-foot typography must be used
long documents need remote-friendly scrolling
Back must restore focus to the originating asset card
```

Plain verified text is the safest first visible implementation.

Rich HTML/article rendering should use existing safe-content/sandbox primitives only after review.

---

## 13.4 Phase 9 physical-device proof

Before Phase 9 is declared complete, test on the actual Android TV:

```text
one real image from the controlled gateway
one real text/article asset
one intentionally corrupted asset
one oversized asset response
one unavailable gateway/privacy route
one route-return focus restoration
```

Required broad Phase 9 exit truth:

```text
real image renders
real text/article renders
corrupt object is rejected
no direct provider fallback occurs
```

This aligns with the build plan’s Phase 9 exit gate. 

---

# 14. Known gaps and risks to track

## 14.1 Current APK is behind source

The installed APK contains Phase 9I UI behavior.

The repository now contains Phase 9J v4A.

Do not assume physical-device behavior for v4A until a later APK is built.

A sensible next APK milestone is:

```text
after Phase 9J v4B and Phase 9K
```

or, if progress remains fast:

```text
after Phase 10 media playback foundation
```

The earlier preference to avoid rebuilding after every small patch still applies.

---

## 14.2 Android WebView network behavior is not yet proven

The new transport uses `globalThis.fetch`.

The following remain unproven on the physical Android TV WebView:

```text
CORS policy
HTTP cleartext policy
LAN gateway reachability
origin/CSP restrictions
redirect behavior as implemented by the WebView
large response behavior
background/resume behavior
network disconnect behavior
```

These should be tested once v4B makes the flow executable.

---

## 14.3 No explicit request timeout in the new transport

The current v4A transport does not yet use:

```text
AbortController
request timeout
route-change cancellation
application-unmount cancellation
```

The build plan expects bounded request timeouts.

This does not block the foundation slice, but timeout/cancellation must be added before final Phase 9 acceptance or during immediate hardening after v4B.

---

## 14.4 Content-Type validation is not yet proven at transport level

The transport currently checks:

```text
scheme
credentials
status
declared length
actual length
JSON parsing
```

It does not by itself establish a complete content-type acceptance policy.

Phase 9 acceptance requires content-type mismatch rejection.

This must be owned either by:

```text
gateway evidence model
native manifest validation
verified render layer
or a narrowly reviewed combination
```

Do not assume it is covered until focused tests prove it.

---

## 14.5 Four-megabyte small-asset cap

The 4 MiB cap is appropriate for a first small-asset path but may reject larger images or documents.

Do not increase it casually.

Any later increase should consider:

```text
target TV memory
WebView memory
BLAKE3 verification cost
network timeout
malicious allocation pressure
actual catalog asset sizes
```

Large video/audio must not use this full-byte small-asset path.

---

## 14.6 Route-change race

The current execution foundation receives a detail object at request start.

The React owner must prevent the result from being applied after the user navigates to another asset.

This must be explicitly tested in v4B.

---

## 14.7 Generic visual shell

The APK test showed that the top-level pages remain too similar.

This is not a functional failure, but it is now a visible product priority.

After Phase 9 integrity is complete:

```text
Home should become real catalog rails.
Library should become a collection/detail surface.
Pair should center pairing challenge UX.
Settings should become visible settings/status cards.
Earn ROC should become confirmed task/outcome UI.
```

Avoid replacing the current generic pages with fake data.

Only real backend-derived or truthful empty/unavailable content should appear.

---

# 15. Work after Phase 9

## TV Phase 10 — Media Playback Proof

The next broad build-plan phase after Phase 9 is real video and audio playback.

The build plan requires:

```text
one real video asset
one real audio asset
remote-only playback controls
play/pause
seek
Back
fullscreen behavior
buffering/error state
verification/service labels
continue-watching persistence
resource release on route exit
30-minute playback test
repeated open/close testing
```

Use WebView HTML media first.

Do not build a Media3 plugin unless actual device evidence shows that WebView playback cannot satisfy codec, remote-control, buffering, fullscreen, or stability needs.

The tested Android TV box is the source of truth for that decision. 

---

## TV Phase 11 — Pairing DTOs and deterministic local UI

After media proof:

```text
strict pairing DTOs
idle/waiting/approved/denied/expired/cancelled/error states
QR and short-code display
countdown
cancel
focus-safe pairing screen
memory adapter tests
no session secret rendering
```

The current Pair page is only an introductory shell and earlier pairing foundation—not the final pairing product.

---

## TV Phase 12 — Backend pairing and secure device session

Then:

```text
real challenge issuance
companion approval
scope validation
single-use challenge
expiry
denial
revocation
secure native storage
restart persistence
local unpair
remote revoke
read-only TV scopes
```

The TV must never self-approve pairing.

---

## TV Phase 13 — Library, receipts, and confirmed ROC

Then:

```text
paired-user Library
real receipt history
account summary
confirmed ROC from durable backend receipt projection
privacy-mode redaction
refresh/stale/unavailable states
```

Pending or fake evidence must never become confirmed ROC.

---

## TV Phase 14 — Existing entitlement and paid access

Then:

```text
backend entitlement check on every paid open
locked/entitled/expired/unavailable/denied states
existing purchases open only after backend confirmation
non-entitled content remains locked
no TV wallet spend command
no silent spend
```

---

## TV Phase 15 — Cache, offline, privacy, and policy errors

Then:

```text
bounded verified cache
cache quota
corrupt-cache eviction
offline public content
privacy-route unavailable UI
policy denial UI
session expiry UI
gateway degradation UI
no direct provider fallback
```

Local receipt/cache data remains display-only and cannot unlock paid content.

---

## TV Phase 16 — Device performance and accessibility

Then prove the product on the actual low-cost hardware:

```text
cold and warm launch
realistic catalog size
rapid D-pad input
500 synthetic key events
route open/back cycles
30-minute video
30-minute audio
two-hour soak
network disconnect/reconnect
background/resume
720p/1080p/4K where available
focus contrast
large text
TalkBack/basic accessibility
storage pressure
cache eviction
```

---

## TV Phase 17 — Reproducible Alpha acceptance

Eventually produce one acceptance runner that proves:

```text
build
APK
launch
remote focus
gateway
catalog
creator route
real asset
corrupt-asset rejection
media
pairing
session
receipts
confirmed ROC
entitlement denial
privacy-route failure
```

Final Alpha marker:

```text
CRABLINK_TV_ALPHA_GREEN_PARKED
```

---

## TV Phase 18 — Private beta hardening

After Alpha:

```text
release signing
signed APK/AAB
version/update policy
redacted diagnostics
device management
multiple-TV revocation
support runbook
target-SDK review
local-network permission review
dependency/supply-chain audit
pairing/secure-storage security review
```

---

## TV Phase 19 — Store/production decision

Deferred until private beta proves the product.

An APK building successfully does not authorize production release.

The broad remaining roadmap and permanent forbidden scope are defined in the attached build plan. 

---

# 16. Permanent authority boundaries to preserve

CrabLink TV remains a client and display surface.

It must never acquire:

```text
local micronode runtime
public Service Node runtime
Service Node Operator Mode
wallet private keys
seed phrase entry
unilateral wallet spending
silent spending
ledger mutation
reward issuance
fake receipts
fake balances
pending evidence labeled confirmed ROC
direct-provider privacy fallback
hardcoded sanctions bypass
ROX/Solana bridge runtime
staking
liquidity
exchange-facing behavior
production deployment from debug artifacts
```

React owns:

```text
display
focus state
local presentation state
explicit user intent
```

Tauri/native and backend surfaces own:

```text
fixed privileged commands
network/profile validation
integrity checks
session handling
backend-derived truth
```

---

# 17. Workflow rules for the next session

Continue using the faster focused cadence.

For ordinary Phase 9 patches:

```text
validate all anchors before writing
print baseline digests
keep repository unchanged on preflight abort
backup every modified file
remove new files on rollback
print explicit rollback markers
print explicit APPLIED marker
run syntax checks
run new focused tests
run directly related old regressions
run the TV package build
use separate verification block
leave the terminal open
```

Do not:

```text
use base64/gzip/lzma/encoded mutation payloads
end scripts with exit
use compressed or opaque patches
run full TV acceptance after every small React slice
run desktop build without a shared-contract reason
run armv7 APK build after every patch
regenerate codebundle after every patch
include git add/commit/push unless explicitly requested
```

Use plain-text, inspectable Bash.

The next patch should be smaller than the earlier all-in-one Phase 9J attempts.

---

# 18. Recommended first actions in the next session

Before mutation, confirm the v4A baseline with focused commands:

```text
npm --prefix apps/crablink-tv run test:gateway-asset-http-transport

npm --prefix apps/crablink-tv run test:library-manual-verify-execution

npm --prefix apps/crablink-tv run check:library-manual-verify-execution-foundation

npm --prefix apps/crablink-tv run test:library-asset-verify-flow

npm --prefix apps/crablink-tv run check:library-asset-verify-flow

npm --prefix apps/crablink-tv run test:library-verify-ui

npm --prefix apps/crablink-tv run check:library-verify-ui

npm --prefix apps/crablink-tv run build
```

Then inspect exact current anchors in:

```text
apps/crablink-tv/src/app/TvApp.jsx

apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx

apps/crablink-tv/src/library/TvLibraryVerifyUi.source.test.mjs

apps/crablink-tv/src/library/TvLibraryVerifiedAssetRender.source.test.mjs

scripts/check-crablink-tv-library-verified-asset-render-boundary.mjs

scripts/check-crablink-tv-library-manual-verify-execution-foundation-boundary.mjs
```

Then implement:

```text
PHASE9J_V4B_LIBRARY_MANUAL_VERIFY_REACT_HANDOFF
```

Fix the first compiler, syntax, test, or boundary failure before expanding the patch.

---

# 19. Final session-end markers

```text
ANDROID_TV_32_BIT_APK=BUILT_AND_DEVICE_TESTED

ANDROID_TV_APP_LAUNCH=GREEN

DARK_THEME_DEFAULT=CONFIRMED_ON_DEVICE

TOP_LEVEL_ROUTE_COUNT=5

DEVICE_UI_POSTURE=FUNCTIONAL_BUT_PLACEHOLDER_HEAVY

PHASE8_PHASE9A_SUCCESSOR_CHAIN_REPAIR=GREEN

REMAINING_PHASE9J_MARKERS_IN_REPAIRED_CHAIN=0

PHASE9J_V4A_MANUAL_VERIFY_EXECUTION_FOUNDATION=GREEN

GATEWAY_HTTP_TRANSPORT_TEST_COUNT=2

MANUAL_VERIFY_EXECUTION_TEST_COUNT=4

PHASE9H_VERIFY_FLOW_TEST_COUNT=5

PHASE9I_VERIFY_UI_TEST_COUNT=5

REVIEWED_GATEWAY_PROFILE_REUSED=YES

PHASE9H_VERIFY_FLOW_REUSED=YES

DUPLICATE_REQUEST_LOCK=GREEN

RAW_GATEWAY_EVIDENCE_RETURNED_TO_REACT=NO

REACT_EXECUTION_HANDOFF=NOT_ADDED_IN_V4A

RAW_ASSET_RENDERING=NOT_ADDED

WALLET_LEDGER_ROC_FINALITY_AUTHORITY=ABSENT

TV_REACT_BUILD_CLEAN=GREEN

CURRENT_REPOSITORY_IMPLEMENTATION=PHASE9J_V4A

INSTALLED_DEVICE_APK_IMPLEMENTATION=PHASE9I

DO_NOT_RERUN=PHASE9J_V3

NEXT_PATCH=PHASE9J_V4B_LIBRARY_MANUAL_VERIFY_REACT_HANDOFF

AFTER_V4B=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY

AFTER_PHASE9=PHASE10_MEDIA_PLAYBACK_PROOF
```



### END NOTE - JULY 21 2026 - 10:55 CST


### BEGIN NOTE - JULY 21 2026 - 13:25 CST

# IMPORTANT NOTE REGARDING IDENTITY, LOGIN, SESSION ETC - PASSPORTS:

Absolutely. Here are three drop-in note blocks so the rule is reflected at the **RustyOnions substrate level**, the **CrabLink product/client level**, and the **CrabLink TV implementation level**.

## 1. Main RustyOnions notes

````markdown
## Platform Identity Rule — Passport Is Wallet-Like, Not Cloud Login

CrabLink / RustyOnions Passport identity must be treated as a wallet-like account model, closer to a Solflare / Phantom style account than a cloud login.

This applies across the full platform surface:

- RustyOnions backend/substrate
- CrabLink desktop
- CrabLink Android TV
- CrabLink Android
- CrabLink iOS
- future CrabLink clients

Core rule:

```text
CrabLink Passport = wallet-like identity/account
````

A Passport must not become:

```text
cloud login
password account
server-owned identity
cloud-stored Passport secret
backend-custodied account
backend-issued identity pretending to be source of truth
```

The correct posture:

```text
local Passport creation/import/unlock
offline-storable identity material
client-owned secret custody
backend/gateway verifies proofs/capabilities/receipts/entitlements/policy
backend does not own or custody the Passport secret
```

RustyOnions services may verify Passport-derived proofs, enforce policy, validate capabilities, resolve receipts, verify entitlement, and serve public-facing content paths. They must not become a cloud identity custodian or store user Passport secrets.

Nodes and services remain public-facing infrastructure surfaces where appropriate. The system should not drift into private cloud-account login semantics.

````

## 2. CrabLink notes

```markdown
## CrabLink Passport Model — Wallet-Like Local Identity

CrabLink identity must be platform-wide and wallet-like.

The Passport model should be understood like a Solana wallet account used through wallets such as Solflare or Phantom:

```text
Passport is created/imported/unlocked locally
Passport secret can be stored offline
client owns Passport custody
backend verifies proofs and capabilities
backend does not custody Passport secrets
````

CrabLink must not introduce a conventional cloud login model:

```text
no cloud password account
no cloud-stored login secret
no backend-custodied Passport
no server-owned source-of-truth identity
no backend-issued account identity pretending to be the Passport
```

This applies to every CrabLink client:

```text
desktop
Android TV
Android
iOS
future clients
```

The backend/gateway role is verification and service access:

```text
verify Passport-derived proof
verify capability scope
verify receipt truth
verify entitlement
verify policy/sanctions/privacy path
serve public-facing content routes
reject invalid or unauthorized requests
```

The backend/gateway role is not identity custody.

Future wording should prefer:

```text
Passport Onboarding
Local Passport Unlock
Passport Import / Restore
Read-Only Capability Review
Device-local session posture
Optional cross-device delegation
```

Avoid wording that implies:

```text
cloud login
central account registration
server-owned account
pairing one Passport into another Passport
backend custody of Passport secret
```

Optional cross-device delegation may exist later, but it must be explicit, scoped, reviewable, revocable, and proof/capability based. It must not replace local Passport ownership.

````

## 3. CrabLink TV notes

```markdown
## CrabLink TV Identity Direction — Replace Pairing With Passport-First Onboarding

CrabLink TV should not drift into cloud login or cloud account pairing.

The original TV build plan contains Phase 11 / Phase 12 language around pairing, challenge/session behavior, and companion approval. Before those phases are implemented, that model should be revised into a Passport-first model. The current plan’s pairing/session language should be treated as provisional and subject to rewrite. 

New direction:

```text
TV Passport Onboarding
Local Passport Unlock
Passport Import / Restore
Read-Only Capability Review
Device-local session posture
Optional cross-device delegation
No cloud account login
No server-custodied Passport secret
````

CrabLink TV should treat a Passport like a wallet-style account:

```text
local Passport identity
client-side custody
offline-storable secret material
no cloud password account
no backend-stored login secret
no server-owned identity
```

The TV may create/import/unlock a local Passport, but it must not store raw Passport secrets in React state, browser storage, URLs, QR codes, logs, or diagnostics.

Backend/gateway may verify:

```text
Passport proof
capability scope
receipt truth
entitlement truth
policy state
content access rules
```

Backend/gateway must not:

```text
own the Passport
custody the Passport secret
issue a fake source-of-truth identity
turn TV access into cloud login
```

Cross-device behavior, if added later, should be framed as optional delegation or review, not as “pairing” one Passport into another Passport.

Implementation impact:

```text
Phase 11 should become Passport onboarding/local unlock state machine.
Phase 12 should become Passport-backed capability/proof/session integration.
Pairing terminology should be replaced or narrowed.
No cloud login route should be added.
No server-side Passport custody should be introduced.
No backend-issued identity should pretend to be the Passport.
```

This does not block current Phase 9 work. It should be handled before starting the current plan’s Phase 11/12 identity/session phases. The TV build plan currently defines pairing/session phases, so those sections need a future rewrite before implementation.

````

The key phrase I would keep consistent everywhere is:

```text
CrabLink Passport is wallet-like identity, not cloud login.
````

### END NOTE - JULY 21 2026 - 13:25 CST


### BEGIN NOTE - JULY 21 2026 - 19:55 CST

Below are the carry-over notes for the next session.

# CrabLink TV carry-over notes — Phase 9 complete / Phase 10 next

## 0. Current status snapshot

```text
PROJECT=CrabLink TV
TRACK=Android TV / Tauri sibling app
CURRENT_GREEN_BASELINE=Phase 9 complete
LAST_GREEN_PHASE=PHASE9_LIBRARY_B3_ASSET_AND_CONTENT_VIEW_PROOF
NEXT_PHASE=PHASE10_MEDIA_PLAYBACK_FOUNDATION
OVERALL_COMPLETION=50%+
PHASE9_STATUS=COMPLETE / GREEN
```

Final Phase 9 terminal proof:

```text
PHASE9P_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE=GREEN
PHASE9_LIBRARY_B3_ASSET_AND_CONTENT_VIEW_PROOF=GREEN
PHASE9_COMPLETE=YES
IMAGE_RENDER_EXECUTION=GREEN
ARTICLE_RENDER_SURFACE=GREEN
CORRUPT_CONTENT_REJECTION=GREEN
UNSAFE_HTML_INJECTION=ABSENT
DIRECT_PROVIDER_FALLBACK=ABSENT
TV_REACT_BUILD_CLEAN=GREEN
NEXT_PATCH=PHASE10_MEDIA_PLAYBACK_FOUNDATION
```

Phase 9 is closed. Do **not** rerun Phase 9 mutation patches in the next session. Start Phase 10 from this green baseline.

The newest uploaded codebundle, `CODEBUNDLE_TAURI_APP(63).md`, was generated after Phase 9O and before the final Phase 9P/acceptance patch, so it is useful context but **slightly stale** after the final Phase 9 closeout. It shows the Phase 9O source set and the current CrabLink TV structure, but it does not include the final 9P article surface and Phase 9 acceptance files that were created after it. 

---

# 1. What we accomplished in this session

## 1.1 Phase 9N — verified image render surface

We completed Phase 9N after one mutation correction.

The first Phase 9N mutation aborted safely because `node --check` cannot directly parse `.jsx` files in this Node setup. The repository stayed unchanged:

```text
REPOSITORY_UNCHANGED=YES
```

We then repaired the mutation lane by removing direct `.jsx` `node --check` from prewrite validation and relying on source tests plus Vite build for JSX validation.

Final Phase 9N result:

```text
PHASE9N_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE=GREEN
IMAGE_RENDER_SURFACE=ADDED
IMG_SRC_BOUND_TO_PROJECTED_OBJECT_URL=YES
REACT_OBJECT_URL_CREATION=ABSENT
DIRECT_REACT_FETCH=ABSENT
DIRECT_REACT_INVOKE=ABSENT
TV_REACT_BUILD_CLEAN=GREEN
NEXT_PATCH=PHASE9O_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION
```

What Phase 9N added:

```text
apps/crablink-tv/src/library/tvLibraryVerifiedImageRenderSurfaceModel.js
apps/crablink-tv/src/library/tvLibraryVerifiedImageRenderSurfaceModel.test.mjs
apps/crablink-tv/src/library/TvLibraryVerifiedImageRenderSurface.jsx
apps/crablink-tv/src/library/TvLibraryVerifiedImageRenderSurface.source.test.mjs
scripts/check-crablink-tv-library-verified-image-render-surface-boundary.mjs
```

It also wired the image render surface into:

```text
apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx
apps/crablink-tv/src/app/TvApp.jsx
apps/crablink-tv/src/styles/tv.css
apps/crablink-tv/package.json
package.json
scripts/make_codebundle.sh
scripts/check-crablink-tv-codebundle-boundary.mjs
```

Phase 9N behavior:

```text
- Projects only active verified object URL handoff views.
- Accepts only blob: object URLs.
- Accepts only image/* content types.
- Requires canonicalCrabUrl and cid.
- Renders image through a dedicated bounded component.
- Keeps panel/app free of direct <img>, src assignment, fetch, invoke, Blob, URL.createObjectURL, and URL.revokeObjectURL authority.
```

Important design split:

```text
Phase 9M owns object URL handoff.
Phase 9N owns projected image render surface.
React receives a bounded surface view only.
React does not create/revoke object URLs.
```

## 1.2 Phase 9N marker-chain repair

After Phase 9N, one boundary had a successor-marker expectation issue. The mutation repair script aborted because the file was already in the correct final state, but the verification confirmed the chain was correct.

Final marker chain after Phase 9N:

```text
Phase 9L → Phase 9N
Phase 9M → Phase 9O
Phase 9N → Phase 9O
```

Final proof:

```text
PHASE9N_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE=GREEN
PHASE9M_OBJECT_URL_HANDOFF_BOUNDARY=PASS
PHASE9N_IMAGE_RENDER_SURFACE_BOUNDARY=PASS
PHASE9L_BYTE_RENDER_LIFECYCLE_BOUNDARY=PASS
TV_REACT_BUILD_CLEAN=GREEN
NEXT_PATCH=PHASE9O_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION
```

## 1.3 Phase 9O — verified image object URL execution

We added the Phase 9O execution model that composes the previous Phase 9 pieces:

```text
Phase 9L — verified byte render lifecycle
Phase 9M — isolated object URL handoff
Phase 9N — verified image render surface
Phase 9O — execution model joining all three
```

Files added:

```text
apps/crablink-tv/src/library/tvLibraryVerifiedImageObjectUrlExecution.js
apps/crablink-tv/src/library/tvLibraryVerifiedImageObjectUrlExecution.test.mjs
apps/crablink-tv/src/library/TvLibraryVerifiedImageObjectUrlExecution.source.test.mjs
scripts/check-crablink-tv-library-verified-image-object-url-execution-boundary.mjs
```

Package/codebundle wiring updated:

```text
apps/crablink-tv/package.json
package.json
scripts/make_codebundle.sh
scripts/check-crablink-tv-codebundle-boundary.mjs
```

Initial Phase 9O verification found two narrow issues:

```text
1. Test expectation was too strict.
   text/plain/article input was accepted by object URL handoff but then rejected by image surface.
   Correct rejection code was SURFACE_REJECTED, not HANDOFF_REJECTED.

2. Phase 9N predecessor/successor marker drift.
   The Phase 9N final successor needed to be Phase 9P,
   while its Phase 9M predecessor check needed to remain Phase 9M → Phase 9O.
```

We repaired both.

Final Phase 9O proof:

```text
PHASE9O_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION=GREEN
IMAGE_OBJECT_URL_EXECUTION=ADDED
STALE_OBJECT_URL_REVOKE_BEFORE_REPLACE=YES
IMAGE_SURFACE_READY_FROM_EXECUTION=YES
RAW_BYTES_EXPOSED_TO_REACT=NO
DIRECT_REACT_FETCH=ABSENT
DIRECT_REACT_INVOKE=ABSENT
TV_REACT_BUILD_CLEAN=GREEN
NEXT_PATCH=PHASE9P_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE
```

Phase 9O behavior:

```text
- Takes ready verified image lifecycle state.
- Uses object URL handoff port for object URL creation.
- Projects the object URL into the verified image surface.
- Revokes stale active object URLs before replacement.
- Supports explicit revoke of active execution state.
- Rejects non-image/mismatched inputs fail-closed.
- Does not expose raw bytes to React.
- Does not fetch/invoke/build Blob/create URL/revoke URL directly in React.
```

## 1.4 Codebundle regeneration after Phase 9O

After Phase 9O was green, we ran:

```bash
bash scripts/make_codebundle.sh
```

It wrote:

```text
/Users/mymac/Desktop/crablink/CODEBUNDLE_TAURI_APP.md
```

That generated/uploaded `CODEBUNDLE_TAURI_APP(63).md`.

Important note for next session:

```text
CODEBUNDLE_TAURI_APP(63).md includes Phase 9O.
It does not include the final Phase 9P/Phase 9 acceptance patch.
After Phase 9P closeout, the repository is newer than the uploaded codebundle.
```

Next session should either:

```text
- use current terminal proof as source of truth, or
- regenerate a new codebundle before deeper Phase 10 source inspection if needed.
```

Do not regenerate just for the sake of it unless we need source inspection.

## 1.5 Phase 9P — verified article/text render surface

We added the final Phase 9P article/text surface and then closed Phase 9.

Files added:

```text
apps/crablink-tv/src/library/tvLibraryVerifiedArticleRenderSurfaceModel.js
apps/crablink-tv/src/library/tvLibraryVerifiedArticleRenderSurfaceModel.test.mjs
apps/crablink-tv/src/library/TvLibraryVerifiedArticleRenderSurface.jsx
apps/crablink-tv/src/library/TvLibraryVerifiedArticleRenderSurface.source.test.mjs
scripts/check-crablink-tv-library-verified-article-render-surface-boundary.mjs
scripts/check-crablink-tv-phase9-acceptance-boundary.mjs
```

Wiring updated:

```text
apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx
apps/crablink-tv/src/app/TvApp.jsx
apps/crablink-tv/src/styles/tv.css
apps/crablink-tv/package.json
package.json
scripts/make_codebundle.sh
scripts/check-crablink-tv-codebundle-boundary.mjs
```

Phase 9P behavior:

```text
- Projects ready verified article/text byte lifecycle into a bounded article render surface.
- Accepts text/*, application/json, and +json content types.
- Requires ready lifecycle state.
- Requires ARTICLE_READER display kind.
- Requires canonicalCrabUrl and cid.
- Checks byte length against verified contentLength.
- Rejects empty bytes.
- Rejects oversized text bytes.
- Rejects mismatched length.
- Rejects invalid UTF-8.
- Normalizes visible text into bounded paragraphs.
- Renders paragraphs as React text nodes only.
- Does not use dangerouslySetInnerHTML or innerHTML.
- Treats HTML-like input as literal text, not markup.
```

Final Phase 9P proof:

```text
PHASE9P_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE=GREEN
ARTICLE_RENDER_SURFACE=ADDED
TEXT_DECODING_BOUNDARY=ADDED
UNSAFE_HTML_INJECTION=ABSENT
CORRUPT_OR_MISMATCHED_TEXT_BYTES_REJECTED=YES
NEXT_PATCH=PHASE9_FINAL_ACCEPTANCE
```

## 1.6 Phase 9 final acceptance boundary

We added and passed:

```text
scripts/check-crablink-tv-phase9-acceptance-boundary.mjs
```

Final acceptance proof:

```text
CrabLink TV Phase 9 acceptance boundary passed.
Image proof: verified bytes flow through lifecycle, isolated object URL handoff, and projected image surface.
Article proof: verified text bytes decode into safe React text nodes with unsafe HTML injection absent.
Rejection proof: mismatched, corrupt, unsupported, stale, and non-ready inputs fail closed.
Authority proof: React does not fetch, invoke, construct Blob, create/revoke object URLs, or own wallet/ledger/ROC/finality truth.
PHASE9_LIBRARY_B3_ASSET_AND_CONTENT_VIEW_PROOF=GREEN
PHASE9_COMPLETE=YES
IMAGE_RENDER_EXECUTION=GREEN
ARTICLE_RENDER_SURFACE=GREEN
CORRUPT_CONTENT_REJECTION=GREEN
DIRECT_PROVIDER_FALLBACK=ABSENT
NEXT_PATCH=PHASE10_MEDIA_PLAYBACK_FOUNDATION
```

Final production build also passed:

```text
TV_REACT_BUILD_CLEAN=GREEN
vite build passed
95 modules transformed
```

---

# 2. Phase 9 complete inventory

Phase 9 is now complete across the Library B3 asset/content proof path.

## Completed Phase 9 surfaces

```text
9A — Library asset detail foundation
9B — Library asset detail acceptance
9E — asset manifest adapter
9F — verified asset render model / facts
9G — gateway asset fetch model
9H/9I — verify/manual verify flow
9J — successor chain repair
9K — verified render display projection
9L — verified byte render lifecycle
9M — isolated object URL handoff
9N — verified image render surface
9O — verified image object URL execution
9P — verified article/text render surface
Final — Phase 9 acceptance boundary
```

## Final Phase 9 proof chain

```text
B3/library asset detail
→ manifest/fetch/verify flow
→ verified render facts
→ verified display projection
→ byte render lifecycle
→ object URL handoff for image bytes
→ image render surface
→ image object URL execution
→ article/text safe render surface
→ final Phase 9 acceptance
```

## Final Phase 9 authority boundaries

The completed Phase 9 keeps these forbidden in React/app/panel render authority:

```text
direct fetch
direct invoke
new Blob
URL.createObjectURL
URL.revokeObjectURL
dangerouslySetInnerHTML
innerHTML
wallet authority
ledger authority
ROC authority
entitlement authority
finality authority
direct provider fallback
raw byte rendering in React
```

Object URL creation/revocation is isolated to the handoff module/port.

Article text is rendered as safe React text nodes.

Image rendering uses a projected object URL surface, not direct bytes.

---

# 3. Buildplan changes that must carry forward

We also made a major buildplan/model correction during this overall workstream.

## 3.1 CrabLink identity model changed to Passport-first / wallet-like local custody

The CrabLink TV buildplan was rewritten away from cloud login/pairing/password-account semantics and toward local wallet-like Passport identity.

Current rule:

```text
CrabLink Passport = wallet-like identity/account
```

This applies across:

```text
desktop
Android TV
Android
iOS
future clients
```

The buildplan now says the TV app should support:

```text
create local CrabLink Passport
import/restore local CrabLink Passport
unlock local CrabLink Passport
retain minimum device-local Passport/capability state
use backend-verified proofs/capabilities/receipts/entitlements
```

It must not become:

```text
cloud login
password account
server-owned identity
backend-issued identity pretending to be Passport source of truth
cloud-stored Passport secret
backend-custodied Passport secret
```

The active buildplan explicitly describes CrabLink Passport identity as wallet-like, local/offline-storable, client-custodied, and not a cloud login; backend/gateway verify proofs, capabilities, receipts, entitlements, and policy without owning/custodying Passport secrets. 

## 3.2 Important implication for future phases

The older “pairing/session” language in existing TV files may still exist in code or earlier phase scaffolds, but future phases must interpret or migrate it as:

```text
Passport onboarding
local Passport unlock
Passport import/restore
read-only capability review
optional cross-device delegation
device-local session/posture
```

Future work must avoid deepening the old cloud-style login/pairing model.

## 3.3 What not to do in Phase 10+

Do not add:

```text
cloud account login
password auth as identity source
backend-custodied Passport
cloud-stored Passport secret
QR codes containing secrets
React state containing Passport seed/private key/capability secrets
localStorage/sessionStorage/indexedDB custody of Passport secrets
unrestricted capability
wallet/ledger/ROC authority in React
```

The TV app remains:

```text
client-only
remote-only navigation
display/user-intent only in React
native/Rust boundary for privileged operations
backend truth for receipts/entitlements/confirmed ROC
```

---

# 4. Next session: exact starting point

Start from:

```text
PHASE9_COMPLETE=YES
NEXT_PATCH=PHASE10_MEDIA_PLAYBACK_FOUNDATION
```

Do not rerun:

```text
Phase 9N mutation
Phase 9O mutation
Phase 9O repair
Phase 9P mutation
Phase 9 final acceptance mutation
```

First thing next session should be one of these two options:

```text
Option A — directly start Phase 10A mutation from terminal-proven green baseline.

Option B — regenerate a fresh codebundle first if we need exact current source after Phase 9P:
bash scripts/make_codebundle.sh
```

Since `CODEBUNDLE_TAURI_APP(63).md` is slightly stale after Phase 9P, regenerate only if the next patch needs exact source inspection.

---

# 5. Recommended Phase 10 direction

## 5.1 Phase 10 name

```text
PHASE10_MEDIA_PLAYBACK_FOUNDATION
```

Likely first slice:

```text
PHASE10A_VERIFIED_MEDIA_PLAYBACK_MODEL
```

or

```text
PHASE10A_MEDIA_PLAYBACK_CAPABILITY_MODEL
```

The first Phase 10 slice should be small and model-first.

## 5.2 Phase 10 purpose

Phase 10 should begin turning verified assets into bounded TV media playback readiness.

The goal is not to jump straight into full streaming/player complexity.

Correct first objective:

```text
Create a deterministic playback-readiness model that accepts only verified media render facts/lifecycle state and projects a safe TV playback view.
```

## 5.3 Media families likely in Phase 10

Phase 10 may include:

```text
video
music/audio
podcast/audio
stream placeholder/readiness
possibly image/article already handled by Phase 9 as non-player surfaces
```

Keep media playback separate from:

```text
Passport onboarding
paid spend confirmation
native wallet authority
live streaming publishing
creator workstation tools
service node behavior
local node behavior
```

## 5.4 Phase 10A should probably add

Suggested files:

```text
apps/crablink-tv/src/media/tvVerifiedMediaPlaybackModel.js
apps/crablink-tv/src/media/tvVerifiedMediaPlaybackModel.test.mjs
apps/crablink-tv/src/media/TvVerifiedMediaPlaybackSurface.jsx
apps/crablink-tv/src/media/TvVerifiedMediaPlaybackSurface.source.test.mjs
scripts/check-crablink-tv-verified-media-playback-boundary.mjs
```

Potential app/panel wiring can be delayed to 10B if 10A should stay model-only.

## 5.5 Phase 10A expected behavior

Start with a projection model:

```text
input:
  verified render/display facts or byte lifecycle view
  asset kind
  content type
  content length
  canonicalCrabUrl
  cid

output:
  idle / ready / rejected media playback view
```

Accept only supported media types:

```text
video/*
audio/*
possibly application/vnd.apple.mpegurl only later, not first slice
```

Reject:

```text
image/*
text/*
application/json
missing identifiers
non-ready lifecycle
oversized content length
unsupported kind/content-type mismatch
```

The model should not play bytes yet.

## 5.6 Phase 10A authority boundaries

Must remain absent:

```text
direct React fetch
direct React invoke
direct media byte loading without verification
direct provider fallback
wallet/ledger/ROC/entitlement/finality authority
autoplay spend
silent paid unlock
unsafe HTML injection
localStorage/sessionStorage/indexedDB authority
```

For media element surfaces, be careful:

```text
<video> and <audio> may be introduced later only after a projected, verified source model exists.
src assignment should be bound only to a verified projected playback source.
Object URL creation should remain isolated if used.
```

## 5.7 Likely Phase 10 sequence

Suggested sequence:

```text
Phase 10A — verified media playback readiness model
Phase 10B — TV playback surface component shell
Phase 10C — media object URL/source handoff, isolated like Phase 9M
Phase 10D — video playback surface
Phase 10E — audio/podcast playback surface
Phase 10F — playback controls/focus model
Phase 10G — media error/retry truth model
Phase 10H — Phase 10 acceptance boundary
```

Keep slices small. Avoid a huge all-in-one player patch.

---

# 6. Fast build cadence to preserve

The user explicitly requested faster progress and less oversized patching. Continue the focused lane:

```text
ordinary patch = focused mutation + focused verification
```

For normal Phase 10 slices, run only:

```text
new syntax checks
new focused tests
new focused boundary
direct predecessor boundary
TV production build
```

Skip these unless the patch touches relevant areas:

```text
full TV acceptance
desktop build
armv7 Android checks
full platform acceptance
codebundle regeneration
full repository-wide checks
```

Use full acceptance only when closing a phase or touching shared/native/platform contracts.

## Patch style rules to keep

```text
plain-text Bash only
no base64/gzip/lzma/opaque payloads
separate mutation and verification blocks
repository unchanged on abort
print PREWRITE=OK before writes
print APPLIED=YES after writes
no git add/commit/push
no terminal-closing exit
use run_step/failure counter in verification
```

Do not use `mapfile`; macOS bash 3.2 does not support it.

Do not validate `.jsx` using direct `node --check`; use source tests and Vite build for JSX.

---

# 7. Known pitfalls from this session

## 7.1 Node cannot direct-check JSX

This failed:

```bash
node --check TvLibraryVerifiedImageRenderSurface.jsx
```

Error:

```text
ERR_UNKNOWN_FILE_EXTENSION ".jsx"
```

Future mutation scripts should not prewrite-check `.jsx` directly.

Use:

```text
node --check .js/.mjs files
node --test source tests
npm --prefix apps/crablink-tv run build
```

## 7.2 Successor-marker replacements must be scoped

We hit repeated predecessor/successor drift because broad replacements changed markers inside predecessor-check blocks.

Future marker updates must distinguish:

```text
predecessor check markers
final printed NEXT_PATCH markers
```

When a boundary checks its predecessor, do **not** advance that predecessor marker unless the predecessor itself actually changed.

Example from Phase 9:

```text
Phase 9N final NEXT_PATCH became Phase 9P.
But Phase 9N's check of Phase 9M must remain Phase 9M → Phase 9O.
```

## 7.3 Source of truth hierarchy

Use this order next session:

```text
1. latest terminal output proving Phase 9 complete
2. actual repo source on user machine
3. CODEBUNDLE_TAURI_APP(63).md for Phase 9O-era reference
4. older codebundles/notes only if needed
```

Because the final Phase 9P patch happened after the uploaded codebundle, terminal output and user repo are newer than the attached bundle.

---

# 8. What to mention at the start of next session

A good first next-session status line:

```text
We are starting from PHASE9_COMPLETE=YES. The next patch is PHASE10_MEDIA_PLAYBACK_FOUNDATION. The attached CODEBUNDLE_TAURI_APP(63) is useful but slightly stale because Phase 9P and the Phase 9 acceptance boundary landed after it. We can either regenerate a fresh codebundle or start with a focused Phase 10A model patch from the green terminal proof.
```

---

# 9. Completion status

Current overall status:

```text
CRABLINK_TV_OVERALL_COMPLETION_RATE=50%+
PHASE7=COMPLETE
PHASE8=COMPLETE
PHASE9=COMPLETE
NEXT_PHASE=PHASE10_MEDIA_PLAYBACK_FOUNDATION
```

The project has now crossed the halfway mark for the TV build. Phase 10 should start turning the verified asset proof into actual verified media playback foundations.


### END NOTE - JULY 21 2026 - 19:55 CST


### BEGIN NOTE - JULY 22 2026 - 00:25 CST

CRABLINK TV CARRY-OVER NOTES — Phase 11 Complete, Phase 12 Paused for Passport Realignment

RO — Carry-over notes for the CrabLink TV session that completed Phase 11 and stopped before Phase 12 implementation.RO — Preserve the exact implementation state, corrected direction, and next-session restart point so Phase 12 does not drift into the wrong workstream.RO — apps/crablink-tv, apps/crablink-tauri, packages/crablink-core, packages/crablink-platform, crates/crablink-native-core, RustyOnions svc-passport, ron-auth, ron-proto, ron-policy, svc-gateway, omnigate.RO — CrabLink TV remains client-only; Passport is wallet-like/local-custody; React is display/user intent only; no cloud login, backend-held Passport secret, raw seed/PIN/capability in React, fake receipt, fake balance, wallet spend authority, ledger mutation, ROX/Solana/bridge runtime, node/operator authority, or direct provider fallback.RO — Future work should track Passport onboarding/unlock result, proof/capability review, expiry/revocation, entitlement/receipt truth, redacted error class, route open, gateway readiness, media start/failure/buffer, and focus-navigation failure.RO — TV gateway URL, Passport proof/capability endpoint, environment/audience, capability scopes, request timeout, release HTTPS policy, cache/media limits, Android TV feature flags, auto-lock and local Passport posture.RO — Client-custodied Passport secrets stay local/native. Backend verifies proof/capability/receipt/entitlement/policy and must not own or recover Passport secrets.RO — Phase 11 accepted via focused JS/model/source tests, boundary scripts, predecessor boundaries, and TV production build. Phase 12 must restart with RustyOnions/native Passport contracts before TV UI work.

0. Safe Current Label

CrabLink TV implementation: ACTIVE.
Current completed TV phase: Phase 11.
Phase 11 status: COMPLETE / GREEN.
Phase 12 status: NOT STARTED / PAUSED.
Reason Phase 12 paused: successor direction needed correction from TV library/playback polish to backend/native Passport proof and capability integration.
Next session must not run the previously drafted Phase12A library-playback patch.
Correct next workstream: Native Passport / svc-passport / ron-proto / ron-auth / ron-policy proof-capability alignment.

This session ended with Phase 11 complete and with Phase 12 intentionally stopped before implementation.

The most important carry-over correction is:

Do not proceed with Phase12A_LIBRARY_PLAYBACK_INTEGRATION.
That patch was not run and should remain abandoned.

The correct next step is not more TV media polish. It is the Passport/proof/capability work required by the current CrabLink TV build plan.

1. What We Accomplished This Session

1.1 Phase 11 was completed and accepted

The session closed the full Phase 11 track for CrabLink TV.

Phase 11 covered:

continue-watching truth
continue-watching store adapter
resource-release lifecycle adapter
resource-release executor boundary
Phase 11 acceptance boundary

The phase progressed through these slices:

Phase11A — Continue-watching resource truth
Phase11B — Continue-watching store adapter
Phase11C — Resource release lifecycle adapter
Phase11D — Resource release executor boundary
Phase11E — Phase 11 acceptance boundary

Each slice was handled in the current project style:

focused model/source behavior
focused unit/source tests
focused boundary scripts
direct predecessor checks
related boundary checks
TV production build
no broad platform acceptance unless needed

1.2 Phase11C was confirmed green

Phase11C added the resource-release lifecycle adapter.

Confirmed Phase11C outcomes:

PHASE11C_RESOURCE_RELEASE_LIFECYCLE_ADAPTER=GREEN
RESOURCE_RELEASE_LIFECYCLE=ADDED
ORDERED_RELEASE_STEPS=ADDED
DIRECT_RELEASE_EXECUTION=NOT_ADDED
PLAYER_MUTATION_SIDE_EFFECT=NOT_ADDED
STORAGE_MUTATION_SIDE_EFFECT=NOT_ADDED
HANDLE_RELEASE_SIDE_EFFECT=NOT_ADDED
MEDIA_ELEMENT_CHANGES=NOT_ADDED
TV_REACT_BUILD_CLEAN=GREEN
NEXT_PATCH=PHASE11D_RELEASE_EXECUTOR_BOUNDARY

Phase11C behavior:

schema: crablink.tv.resource-release-lifecycle.v1
model: projectTvResourceReleaseLifecycle
release steps:
  pause-player
  flush-progress
  detach-player-element
  release-media-handle
  clear-focus

Important lifecycle rules:

- Ended playback omits the pause-player request.
- Error/back/unload release paths can request pause first.
- The lifecycle is a planned release sequence only.
- It does not actually mutate the player.
- It does not detach the element.
- It does not release native handles.
- It does not write storage.
- It does not create source URLs.

Phase11C was intentionally a truth/planning layer, not an execution layer.

1.3 Phase11D was confirmed green

Phase11D added the resource-release executor boundary.

Confirmed Phase11D outcomes:

PHASE11D_RELEASE_EXECUTOR_BOUNDARY=GREEN
RESOURCE_RELEASE_EXECUTOR_BOUNDARY=ADDED
ORDERED_EXECUTOR_COMMAND_QUEUE=ADDED
DIRECT_RELEASE_EXECUTION=NOT_ADDED
PLAYER_MUTATION_SIDE_EFFECT=NOT_ADDED
STORAGE_MUTATION_SIDE_EFFECT=NOT_ADDED
HANDLE_RELEASE_SIDE_EFFECT=NOT_ADDED
MEDIA_ELEMENT_CHANGES=NOT_ADDED
TV_REACT_BUILD_CLEAN=GREEN
NEXT_PATCH=PHASE11E_PHASE11_ACCEPTANCE_BOUNDARY

Phase11D behavior:

schema: crablink.tv.resource-release-executor-boundary.v1
model: projectTvResourceReleaseExecutorBoundary
command schema: crablink.tv.resource-release-executor-command.v1

Lifecycle-to-command mapping:

pause-player
  → request-pause

flush-progress
  → request-progress-flush

detach-player-element
  → request-player-detach

release-media-handle
  → request-handle-release

clear-focus
  → request-focus-clear

Boundary guarantees:

- Validates release step order.
- Rejects duplicate release steps.
- Rejects missing required terminal release steps.
- Rejects unsupported media kinds.
- Rejects missing media handle IDs.
- Rejects stale/non-ready lifecycle plans.
- Rejects upstream direct side-effect permissions.
- Rejects raw references.
- Keeps executor commands request-only.

Explicitly absent:

native media release
actual player pause
actual progress flush
actual element detach
actual handle release
actual focus mutation
storage writes
source URL creation
media element changes
fetch/invoke calls
wallet/ledger/ROC/finality authority

Phase11D completed the release executor boundary, not a native release executor.

1.4 Phase11E was confirmed green and closed Phase 11

Phase11E added the Phase 11 acceptance boundary.

Confirmed Phase11E outcomes:

PHASE11E_PHASE11_ACCEPTANCE_BOUNDARY=GREEN
PHASE11_TRACK=COMPLETE
CONTINUE_WATCHING_TRUTH=ACCEPTED
CONTINUE_WATCHING_STORE_ADAPTER=ACCEPTED
RESOURCE_RELEASE_LIFECYCLE=ACCEPTED
RESOURCE_RELEASE_EXECUTOR_BOUNDARY=ACCEPTED
DIRECT_RELEASE_EXECUTION=NOT_ADDED
STORAGE_MUTATION_SIDE_EFFECT=NOT_ADDED
PLAYER_MUTATION_SIDE_EFFECT=NOT_ADDED
HANDLE_RELEASE_SIDE_EFFECT=NOT_ADDED
TV_REACT_BUILD_CLEAN=GREEN

Phase11E verified the chain from Phase11A through Phase11D.

It accepted:

continue-watching truth
resume candidate truth
completion/clear truth
bounded store adapter requests
ordered resource-release lifecycle plans
bounded executor command queues
side-effect-free release requests

It rejected or kept absent:

direct storage writes
direct player mutation
direct media-handle release
direct source release
native executor requirement
source URL creation
object URL creation
fetch/invoke
media element creation
wallet/ledger/ROC/finality authority
provider fallback
raw bytes
raw body
browser storage

1.5 TV production build stayed green after Phase 11

The TV React/Vite production build remained green after Phase11E.

Observed prior green shape:

TV_PRODUCTION_BUILD=GREEN
TV_REACT_BUILD_CLEAN=GREEN
Vite build green

This matters because Phase 11 touched app source and boundary scripts, but did not break the TV build.

2. What Phase 11 Now Means Product-Wise

Phase 11 does not mean full playback persistence is finished.

Phase 11 means the TV app now has a stronger, truthful local model for:

when playback progress should become a continue-watching candidate
when playback should be considered complete
what should be stored or cleared
what resource-release lifecycle should be requested
what ordered release executor commands should be queued
what remains side-effect-free and unimplemented

Phase 11 established the truth and boundary posture needed before any later platform-native release/storage implementation.

Current truth:

The TV app can model continue-watching and release intent.
The TV app can request bounded store/release actions.
The TV app does not yet execute native media handle release.
The TV app does not yet persist real resume state through a production native store.
The TV app does not yet attach Phase 11 behavior to every real playback route.

This is the correct kind of progress for the current build cadence: real local behavior, tests, and boundaries, but no premature native side effects.

3. Important Phase 12 Correction

3.1 What went wrong

After Phase11E, a Phase12A patch was drafted for:

PHASE12A_LIBRARY_PLAYBACK_INTEGRATION_FOUNDATION

That proposed patch would have added a TV-local library-to-playback integration model.

It was not run.

The user correctly stopped the direction because the current CrabLink TV build plan says Phase 12 is supposed to deal with Passport/proof/capability integration.

The incorrect draft would have started Phase 12 as:

library/media playback route polish
TV-local playback intent
verified library asset to playback surface projection

That was safe in terms of no side effects, but it was the wrong phase owner and wrong product direction.

3.2 Correct Phase 12 direction

Correct Phase 12 direction:

Backend Passport Proof and Capability Integration

This Phase 12 work is mostly outside apps/crablink-tv.

Correct owner order:

RustyOnions:
  svc-passport
  ron-proto
  ron-auth
  ron-kms
  ron-policy
  svc-gateway
  omnigate
  ron-audit

CrabLink:
  apps/crablink-tauri
  apps/crablink-tv
  packages/crablink-platform
  packages/crablink-core
  crates/crablink-native-core where non-secret validation is needed

TV should be a consumer/projection surface after the shared proof/capability work exists.

3.3 Corrected Phase 12 label

Use this label going forward:

PHASE12_BACKEND_PASSPORT_PROOF_AND_CAPABILITY_INTEGRATION

Do not use:

PHASE12_TV_LIBRARY_POLISH_AND_PLAYBACK_INTEGRATION

The bad label likely exists in the Phase11E acceptance boundary or successor markers because it was generated before the correction.

Next session should repair the successor marker before implementing Phase 12.

4. Native Passport Build Plan Discussion

4.1 Why we paused TV implementation

We paused TV implementation to discuss the larger Native Passport architecture.

The reason: Phase 12 is not a TV-only phase. It affects:

RustyOnions identity services
native proof verification
capability lifecycle
desktop app
Android TV app
regular Android app
iOS app
local Passport creation/import/unlock behavior

The current TV build plan says the Passport model must be wallet-like:

local/offline-storable
client-custodied
created/imported/restored/unlocked locally
backend verifies proof/capability/receipt/entitlement/policy
no cloud login
no password account
no cloud-stored Passport secret
no backend-custodied Passport secret

4.2 Initial Native Passport build plan created

A standalone NATIVE_PASSPORT_BUILDPLAN.md was created during the session.

The first version proposed a new CrabLink crate:

crablink/crates/crablink-passport-core

Its intended purpose was local mnemonic/key/vault/proof behavior.

4.3 User corrected the crate ownership

The user correctly pointed out that RustyOnions already has:

svc-passport

Therefore, adding a second Passport crate would create duplicate ownership and conflict with the 33-crate canon/no-new-crate direction.

The corrected decision:

Do not create crablink-passport-core.
Use svc-passport as the single canonical Passport owner.
Fold native Passport library behavior into svc-passport behind proper feature gates.
Make necessary changes to ron-proto, ron-auth, ron-kms, ron-policy, svc-gateway, omnigate, and CrabLink adapters as needed.

4.4 Updated Native Passport build plan v0.2.0 created

An updated plan was produced:

NATIVE_PASSPORT_BUILDPLAN_v0.2.0.md

Key correction in that plan:

svc-passport remains the single canonical Passport crate.
No new Passport crate is added.

The corrected direction uses:

svc-passport native-client feature
svc-passport server feature
feature-gated client-safe modules
server/runtime modules excluded from CrabLink client builds

Expected svc-passport split:

svc_passport::native
  mnemonic
  deterministic Passport identity derivation
  Passport ID derivation
  local encrypted vault
  PIN KDF/unlock review
  proof transcript construction
  local proof signing
  secret redaction and zeroization
  no HTTP server
  no Axum
  no Hyper
  no Tower
  no service runtime
  no metrics exporter
  no listener

svc_passport::server / existing service runtime
  challenge issuance
  proof acceptance orchestration
  replay store
  public-key registration
  capability issue/refresh/revoke
  profile/status routes
  HTTP handlers
  metrics/readiness
  KMS-backed service signing

This plan was created for future use, but we explicitly set it aside for the immediate carry-over notes.

5. Security and Product Decisions Made This Session

5.1 Passport is not a cloud login

Hard rule:

CrabLink Passport is not a username/password account.
CrabLink Passport is not a server-created account.
CrabLink Passport is not cloud-stored.
CrabLink Passport is not recoverable by support.

Backend may store or verify:

Passport ID
public key
public profile pointer
challenge state
capability status
revocation status
redacted audit events

Backend must not store:

seed phrase
mnemonic entropy
private Passport key
PIN
device secret
vault key
raw decrypted vault

5.2 Passport is wallet-like, but not a Phantom/Solflare clone

The user used Phantom/Solflare only as an analogy for UX:

generate recovery phrase
set local PIN
unlock locally
restore on another device with recovery phrase
lose seed/PIN/device = no recovery

CrabLink Passport is not intended to become:

a crypto wallet clone
a token trading wallet
a Solana wallet
a bridge client
a staking client
an exchange-facing surface

5.3 PIN and recovery phrase semantics

Correct model:

recovery phrase
→ deterministic Passport identity
→ stable Passport ID across devices

local PIN + device keystore
→ unlocks encrypted local vault on that device

The PIN is not part of permanent identity derivation.

Reasons:

- A short PIN has low entropy.
- The recovery phrase is the portable root.
- A user should be able to restore the same Passport on a new device and choose a new PIN.
- Losing the PIN but keeping the recovery phrase allows restore.
- Losing the recovery phrase and device means the Passport is gone forever.

5.4 TV should not own the core Passport state machine

TV must not invent a separate Passport model.

TV should:

display redacted Passport status
collect user intent
request native unlock/proof flows
request read-only TV capability scopes
show proof/capability accepted/denied/expired/revoked states
show backend-derived receipts/entitlements/confirmed ROC

TV must not:

derive Passport keys in JS
store seed/PIN/capability in React
self-approve scopes
issue capabilities
mutate wallet/ledger
request wallet spend on TV
become node/operator/admin surface

6. Current Known Source Marker Issue

Because Phase11E was completed before the Phase 12 correction, the repository may contain a wrong next-phase marker.

Expected wrong marker:

NEXT_PHASE=PHASE12_TV_LIBRARY_POLISH_AND_PLAYBACK_INTEGRATION

Correct marker should be something like:

NEXT_PHASE=PHASE12_BACKEND_PASSPORT_PROOF_AND_CAPABILITY_INTEGRATION

or:

NEXT_PATCH=PHASE12A_PASSPORT_PROOF_CAPABILITY_ALIGNMENT

Next session should search and repair any wrong marker in:

scripts/check-crablink-tv-phase11-acceptance-boundary.mjs
apps/crablink-tv/package.json check descriptions if present
root package.json script comments if any
scripts/make_codebundle.sh if notes/check descriptions mention Phase 12
carry-over notes if copied into repo

Do this as a small Phase12 alignment patch before any runtime implementation.

7. Current Correct Next Session Plan

7.1 First action next session

Start by confirming current repository state.

CrabLink:

cd /Users/mymac/Desktop/crablink

npm --prefix apps/crablink-tv run check:phase11-acceptance
npm --prefix apps/crablink-tv run build

RustyOnions:

cd /Users/mymac/Desktop/RustyOnions

cargo check --workspace

If either baseline is red, fix the first failure before Phase 12 expansion.

7.2 Next patch should be a marker/authority alignment patch

Recommended next patch label:

PHASE12A_PASSPORT_PROOF_CAPABILITY_ALIGNMENT

Purpose:

- Repair the wrong Phase11E successor marker.
- Add or reference the Native Passport build plan in repo docs if desired.
- Add a small boundary check proving Phase 12 points at Passport/proof/capability, not library playback.
- Add no runtime authority.
- Add no new crate.
- Add no wallet/ledger mutation.
- Keep TV build green.

Expected output labels:

PHASE12A_PASSPORT_PROOF_CAPABILITY_ALIGNMENT=GREEN
PHASE12_SUCCESSOR_MARKER_REPAIRED=YES
PHASE12_LIBRARY_PLAYBACK_PATCH=ABANDONED
PHASE12_OWNER=RUSTYONIONS_NATIVE_PASSPORT
SVC_PASSPORT_CANONICAL_OWNER=YES
NEW_PASSPORT_CRATE=NOT_ADDED
TV_RUNTIME_BEHAVIOR_CHANGED=NO
TV_REACT_BUILD_CLEAN=GREEN
NEXT_PATCH=NATIVE_PASSPORT_PHASE0B_SVC_PASSPORT_FEATURE_BOUNDARY

7.3 After marker alignment, switch to RustyOnions

The actual implementation should move back into RustyOnions.

Correct initial RustyOnions patches:

Native Passport Phase 0B:
  inspect svc-passport feature graph and current public API
  add or document server/native-client feature separation
  no behavior change if possible

Native Passport Phase 1:
  ron-proto strict proof/capability DTOs

Native Passport Phase 2:
  ron-auth canonical proof transcript and verification helpers

Native Passport Phase 3:
  svc-passport native mnemonic/identity derivation and golden vectors

Native Passport Phase 4:
  svc-passport native vault/PIN unlock

Native Passport Phase 5:
  svc-passport server challenge/replay/capability lifecycle

Native Passport Phase 6:
  svc-gateway + omnigate public route exposure

Native Passport Phase 7:
  CrabLink desktop adapter consumes shared behavior

Native Passport Phase 8:
  CrabLink TV adapter consumes shared behavior

7.4 Do not start with TV UI

Do not start Phase 12 by building TV screens.

The TV UI should come after:

strict DTOs exist
native/client proof construction exists
server challenge/replay exists
capability lifecycle exists
gateway/omnigate route posture exists

A TV screen without these would become placeholder theater.

8. Commands to Run Next Time

8.1 CrabLink status commands

cd /Users/mymac/Desktop/crablink

npm --prefix apps/crablink-tv run check:phase11-acceptance
npm --prefix apps/crablink-tv run build

grep -R   "PHASE12_TV_LIBRARY_POLISH_AND_PLAYBACK_INTEGRATION\|PHASE12_BACKEND_PASSPORT_PROOF_AND_CAPABILITY_INTEGRATION\|PHASE12A_LIBRARY_PLAYBACK\|PHASE12A_PASSPORT"   scripts apps/crablink-tv package.json apps/crablink-tv/package.json

8.2 RustyOnions status commands

cd /Users/mymac/Desktop/RustyOnions

cargo check --workspace
cargo check -p svc-passport
cargo test -p svc-passport

8.3 svc-passport inspection commands

cd /Users/mymac/Desktop/RustyOnions

find crates/svc-passport -maxdepth 3 -type f   | sort

sed -n '1,220p' crates/svc-passport/Cargo.toml
sed -n '1,220p' crates/svc-passport/src/lib.rs
sed -n '1,260p' crates/svc-passport/src/main.rs
sed -n '1,260p' crates/svc-passport/src/token/mod.rs
sed -n '1,260p' crates/svc-passport/src/state/mod.rs
sed -n '1,260p' crates/svc-passport/src/kms/mod.rs

Use the actual latest codebundle if available, but source inspection is preferred before mutation.

9. Files Most Likely Changed This Session

Phase 11 changes likely added or modified files in CrabLink similar to:

apps/crablink-tv/src/media/tvContinueWatchingResourceModel.js
apps/crablink-tv/src/media/tvContinueWatchingResourceModel.test.mjs
apps/crablink-tv/src/media/TvContinueWatchingResourcePanel.jsx
apps/crablink-tv/src/media/TvContinueWatchingResourcePanel.source.test.mjs

apps/crablink-tv/src/media/tvContinueWatchingStoreAdapterModel.js
apps/crablink-tv/src/media/tvContinueWatchingStoreAdapterModel.test.mjs
apps/crablink-tv/src/media/TvContinueWatchingStoreAdapterPanel.jsx
apps/crablink-tv/src/media/TvContinueWatchingStoreAdapterPanel.source.test.mjs

apps/crablink-tv/src/media/tvResourceReleaseLifecycleModel.js
apps/crablink-tv/src/media/tvResourceReleaseLifecycleModel.test.mjs
apps/crablink-tv/src/media/TvResourceReleaseLifecyclePanel.jsx
apps/crablink-tv/src/media/TvResourceReleaseLifecyclePanel.source.test.mjs

apps/crablink-tv/src/media/tvResourceReleaseExecutorBoundaryModel.js
apps/crablink-tv/src/media/tvResourceReleaseExecutorBoundaryModel.test.mjs
apps/crablink-tv/src/media/TvResourceReleaseExecutorBoundaryPanel.jsx
apps/crablink-tv/src/media/TvResourceReleaseExecutorBoundaryPanel.source.test.mjs

apps/crablink-tv/src/media/tvPhase11AcceptanceBoundary.source.test.mjs

scripts/check-crablink-tv-continue-watching-resource-boundary.mjs
scripts/check-crablink-tv-continue-watching-store-adapter-boundary.mjs
scripts/check-crablink-tv-resource-release-lifecycle-boundary.mjs
scripts/check-crablink-tv-resource-release-executor-boundary.mjs
scripts/check-crablink-tv-phase11-acceptance-boundary.mjs

apps/crablink-tv/package.json
package.json
scripts/make_codebundle.sh

The exact current codebundle should be treated as source of truth.

10. Phase 11 Behavior Summary for Future Review

10.1 Continue-watching truth

Accepted behavior:

- Bounded model decides whether playback is resume-eligible.
- Completed playback clears resume candidate.
- Release/completion states are truth labels, not direct storage writes.
- Thresholds are deterministic.
- No fake persistence.

Important expected thresholds from prior work:

resume threshold: around 10 seconds
completion if ended or ratio >= .92 or remaining <= 30 seconds

These thresholds should be verified from current source before modifying.

10.2 Store adapter

Accepted behavior:

upsert-resume-candidate
clear-resume-candidate
noop

The adapter produces requests only.

It does not:

write localStorage
write sessionStorage
write indexedDB
call native storage
mutate release resources
mint receipts
touch wallet/ledger

10.3 Release lifecycle

Accepted behavior:

pause-player
flush-progress
detach-player-element
release-media-handle
clear-focus

Requests only.

No execution.

10.4 Release executor boundary

Accepted behavior:

request-pause
request-progress-flush
request-player-detach
request-handle-release
request-focus-clear

Commands only.

No execution.

10.5 Phase 11 acceptance

Accepted as a whole:

Phase 11A through Phase 11D are present and successor-linked.
Phase 11 track is complete.
All Phase 11 behavior remains side-effect-free at this layer.

11. What Not To Do Next

Do not run or revive the drafted patch named conceptually:

PHASE12A_LIBRARY_PLAYBACK_INTEGRATION_FOUNDATION

Do not add:

apps/crablink-tv/src/media/tvLibraryPlaybackIntegrationModel.js
apps/crablink-tv/src/media/TvLibraryPlaybackIntegrationPanel.jsx
scripts/check-crablink-tv-library-playback-integration-boundary.mjs

unless a later reviewed plan explicitly reintroduces library playback under the correct phase.

Do not create:

crablink/crates/crablink-passport-core

Current decision is to use:

RustyOnions/crates/svc-passport

as the canonical Passport owner.

Do not start with:

TV Passport placeholder UI
mock proof success strings
fake capability state
fake entitlement
fake receipt
fake confirmed ROC
cloud login
server account bootstrap
pairing as real identity

Do not let old notes override the newer wallet-like Passport model.

12. Correct Passport Workstream Summary

The desired user experience:

User creates a CrabLink Passport.
App generates a recovery phrase.
User writes it down.
User sets a local PIN.
Device stores encrypted local Passport vault.
Later, user unlocks locally with PIN.
App signs proof challenges locally.
Backend verifies proof and issues narrow capability.
User can restore the same Passport on another device with the recovery phrase and choose a new PIN.
If recovery phrase and usable device access are lost, the Passport is gone.

Important split:

Recovery phrase:
  portable identity recovery

PIN:
  local vault unlock only

Backend:
  proof/capability verification only

React:
  display and user intent only

Canonical owner decision:

svc-passport owns Passport semantics.
ron-proto owns DTOs.
ron-auth owns pure verification helpers.
ron-kms owns reusable crypto/key primitives.
ron-policy owns scope/TTL/policy gates.
svc-gateway and omnigate expose/proxy/orchestrate routes.
CrabLink native layers call into shared Rust behavior and present redacted status.

13. Recommended Immediate Patch for Next Session

Patch name

PHASE12A_PASSPORT_SUCCESSOR_REALIGNMENT

Purpose

Repair CrabLink TV successor markers and boundary wording only.
Do not add Passport runtime behavior yet.
Do not add new crates.
Do not add TV UI.
Do not mutate RustyOnions yet unless intentionally switching repos.

Expected mutation surface

Likely files:

scripts/check-crablink-tv-phase11-acceptance-boundary.mjs
apps/crablink-tv/src/media/tvPhase11AcceptanceBoundary.source.test.mjs
apps/crablink-tv/package.json if script metadata needs adjustment
scripts/make_codebundle.sh only if the new alignment test/boundary file is added

Possible new file:

scripts/check-crablink-tv-phase12-passport-successor-boundary.mjs

Possible new source test:

apps/crablink-tv/src/passport/tvPhase12PassportSuccessorBoundary.source.test.mjs

But keep it minimal.

Expected verification

cd /Users/mymac/Desktop/crablink

node --check scripts/check-crablink-tv-phase11-acceptance-boundary.mjs
npm --prefix apps/crablink-tv run check:phase11-acceptance
npm --prefix apps/crablink-tv run build

If adding a new boundary:

npm --prefix apps/crablink-tv run test:phase12-passport-successor
npm --prefix apps/crablink-tv run check:phase12-passport-successor

Expected summary labels:

PHASE12A_PASSPORT_SUCCESSOR_REALIGNMENT=GREEN
PHASE11E_SUCCESSOR_MARKER_CORRECTED=YES
PHASE12_PASSPORT_PROOF_CAPABILITY_OWNER=RUSTYONIONS
SVC_PASSPORT_CANONICAL_OWNER=YES
NEW_PASSPORT_CRATE=NOT_ADDED
TV_LIBRARY_PLAYBACK_PHASE12=ABANDONED
TV_RUNTIME_BEHAVIOR_CHANGED=NO
TV_REACT_BUILD_CLEAN=GREEN
NEXT_REPO=RustyOnions
NEXT_PATCH=NATIVE_PASSPORT_PHASE0B_SVC_PASSPORT_FEATURE_BOUNDARY

14. Longer-Term Sequence After Restart

Stage A — CrabLink marker repair

A1. Repair Phase 11 successor marker.
A2. Add boundary so Phase 12 cannot drift back to TV library playback.
A3. Keep TV build green.
A4. Stop CrabLink TV work temporarily.

Stage B — RustyOnions Passport foundation

B1. cargo check --workspace baseline.
B2. svc-passport feature boundary: server vs native-client.
B3. ron-proto strict Passport proof/capability DTOs.
B4. ron-auth canonical transcript verifier.
B5. svc-passport native mnemonic/key/id derivation.
B6. svc-passport native vault/PIN unlock.
B7. svc-passport server challenge/replay store.
B8. svc-passport capability issue/refresh/revoke.
B9. ron-policy scope/TTL gates.
B10. gateway/omnigate route exposure.

Stage C — Desktop proof

C1. Desktop creates/imports/unlocks Passport.
C2. Desktop signs proof challenge locally.
C3. Backend accepts proof.
C4. Desktop stores capability in native encrypted posture.
C5. React receives redacted status only.

Stage D — TV proof

D1. TV imports/restores Passport.
D2. TV unlocks with local PIN.
D3. TV requests read-only scopes only.
D4. TV displays capability accepted/denied/expired/revoked.
D5. TV uses backend-derived receipts/entitlements/confirmed ROC.

Stage E — Android and iOS

E1. Android reuses same svc-passport native client behavior.
E2. Android uses Android Keystore device protection.
E3. iOS reuses same derivation/proof behavior.
E4. iOS uses Keychain/Secure Enclave-backed protection where suitable.
E5. Cross-platform restore proves same recovery phrase = same Passport ID.

15. Current Completion Estimate

Do not overstate this.

CrabLink TV status after this session:

Phases through 11: complete/green.
Phase 12: paused before implementation.
Visible UI remains still partly infrastructure-heavy.
Major backend/native identity work remains before Passport UX is real.

A rough TV-only phase count depends on the active build plan, but the reliable statement is:

CrabLink TV is past media/continue-watching/resource-release foundation work.
The next major blocker is shared Native Passport proof/capability infrastructure.

Avoid saying Phase 12 is partially complete. It is not.

16. Final Carry-Over Summary

WE COMPLETED:
  Phase 11A continue-watching truth.
  Phase 11B continue-watching store adapter.
  Phase 11C resource-release lifecycle adapter.
  Phase 11D resource-release executor boundary.
  Phase 11E Phase 11 acceptance boundary.
  TV production build remained green.
  Phase 11 is complete.

WE STOPPED:
  Before Phase 12 implementation.

WHY WE STOPPED:
  A Phase 12 library/playback integration patch was drafted, but the user correctly caught that Phase 12 should be Passport/proof/capability integration.

IMPORTANT CORRECTION:
  Do not run the Phase12A library-playback patch.
  Do not create a new crablink-passport-core crate.
  Use svc-passport as the canonical Passport owner.
  Repair the bad Phase 12 successor marker before implementation.

NEXT BEST PATCH:
  PHASE12A_PASSPORT_SUCCESSOR_REALIGNMENT in CrabLink.
  Then switch to RustyOnions for Native Passport Phase 0B / svc-passport feature boundary.

CURRENT SAFE NEXT COMMANDS:
  cd /Users/mymac/Desktop/crablink
  npm --prefix apps/crablink-tv run check:phase11-acceptance
  npm --prefix apps/crablink-tv run build

  cd /Users/mymac/Desktop/RustyOnions
  cargo check --workspace
  cargo check -p svc-passport
  cargo test -p svc-passport

17. One-Line Restart Prompt for Next Session

We are resuming CrabLink TV after Phase 11 complete/green. Do not run the old Phase12A

### END NOTE - JULY 22 2026 - 00:25 CST




### BEGIN NOTE - JULY 31 2026 - 20:30 CST



The notes below consolidate the original CrabLink TV build history, the Passport Native Phase 16 work, the latest verified APK, and the newly added device-acceptance runner. The latest runner is statically green but physical execution remains blocked by unavailable hardware.  The preceding fresh ARMv7 APK build and package inspection were fully green.  Earlier Android TV and Passport carry-over records establish the broader phase history and security boundaries.  

# RustyOnions / CrabLink Comprehensive Carry-Over Notes

## CrabLink TV — Android TV Application and Native Passport Integration

### Session wrap-up: July 31, 2026 — 20:18 Central Time

---

# 1. Purpose of these notes

These notes preserve the complete CrabLink TV implementation history from the beginning of the dedicated Android TV application through the current Native Passport Phase 16 stopping point.

They are intended to allow a later session to resume without reconstructing:

* Why CrabLink TV exists as a separate application.
* Which television-specific foundations have been implemented.
* Which product phases are green.
* Which approaches were attempted and rolled back.
* Which native Passport security invariants are mandatory.
* Which Rust, Kotlin, JNI, Android Keystore, Tauri, and React surfaces now exist.
* Which APK is the latest verified build.
* Why the project is paused.
* What must be tested on the physical Android TV box.
* What remains in Phase 16F.
* What commands and workflow rules must be used when work resumes.

These notes cover only:

```text
apps/crablink-tv
CrabLink TV Android project
CrabLink TV Native Passport Phase 16
Android TV physical-device acceptance
```

They do not begin or replace the future regular Android phone/tablet application.

---

# 2. Current high-level status

CrabLink TV is near the finish line.

The application foundation, television navigation, catalog browsing, verified asset handling, media playback, lifecycle/resource behavior, and almost all Native Passport implementation work are present and compile-tested.

Current honest posture:

```text
CRABLINK_TV_APPLICATION_FOUNDATION=GREEN
CRABLINK_TV_CONTENT_AND_MEDIA_SURFACES=GREEN
PASSPORT_NATIVE_PHASE16_IMPLEMENTATION=NEAR_COMPLETE
PASSPORT_NATIVE_PHASE16E3B3B=GREEN
PASSPORT_NATIVE_PHASE16E3B3C_RUNNER=GREEN
PASSPORT_NATIVE_PHASE16E3B3C_DEVICE_EXECUTION=NOT_RUN
PASSPORT_NATIVE_PHASE16F=NOT_STARTED
PHYSICAL_ANDROID_TV_HARDWARE=NOT_CURRENTLY_AVAILABLE
PHASE16_COMPLETE=NO
ANDROID_TV_BUILD_FORMALLY_COMPLETE=NO
ESTIMATED_IMPLEMENTATION_COMPLETION=90_TO_95_PERCENT
```

The remaining work is important but comparatively narrow:

1. Run the physical Phase 16E3B3C prompt/lifecycle acceptance.
2. Build the final Phase 16F redacted Passport/status surface.
3. Prove operational unlock and proof use on the actual device.
4. Prove revocation and forbidden-authority behavior.
5. Run final APK and Android TV acceptance.
6. Regenerate the codebundle at the final milestone.
7. Mark Phase 16 and the Android TV Passport path complete only after truthful device evidence.

The project is paused because the television and Android TV box are not presently available—not because of a compiler failure or unresolved static implementation defect.

---

# 3. Repository and application identity

Primary repository:

```text
/Users/mymac/Desktop/crablink
```

CrabLink TV application:

```text
/Users/mymac/Desktop/crablink/apps/crablink-tv
```

Tauri/Rust application:

```text
/Users/mymac/Desktop/crablink/apps/crablink-tv/src-tauri
```

Owned Android project:

```text
/Users/mymac/Desktop/crablink/apps/crablink-tv/src-tauri/gen/android
```

Application identity:

```text
NPM_PACKAGE=@crablink/crablink-tv
ANDROID_APPLICATION_ID=com.rustyonions.crablink.tv
VERSION_NAME=0.1.0
VERSION_CODE=1000
MIN_SDK=24
TARGET_SDK=36
```

Current APK type:

```text
DEBUG_APK=YES
SIGNATURE_SCHEME=APK_V2
TARGET_ABI=armeabi-v7a
```

---

# 4. Platform-lane separation

CrabLink TV is a dedicated television application. It must remain separate from the future regular Android application.

Current lane:

```text
apps/crablink-tv
ANDROID_TV_NOTES.md
```

Future regular Android lane:

```text
apps/crablink-android
ANDROID_NOTES.md
```

Future iOS work must receive its own application and notes/buildplan lane.

The regular Android application may share protocol models, Rust/core behavior, Passport contracts, and client adapters, but it must not directly reuse the television layout.

CrabLink TV is:

* Remote-first.
* D-pad-first.
* Ten-foot-interface oriented.
* Landscape oriented.
* Leanback-launcher integrated.
* Designed to work without a touchscreen.
* Focus-management heavy.
* Conservative about prompts and background behavior.
* A delegated/read-only client rather than a root administrative client.

The regular Android application will later require:

* Touch-first interaction.
* Responsive phone and tablet layouts.
* Mobile lifecycle semantics.
* WorkManager/background constraints.
* Foreground-service declarations where legitimately required.
* Mobile approval/companion behavior.
* Separate UX and acceptance tests.

Do not mix those concerns into `apps/crablink-tv`.

---

# 5. Core product and authority boundaries

## 5.1 Client-only posture

CrabLink TV is a client surface.

It must never become:

* A wallet authority.
* A ledger authority.
* A ROC minting or issuance authority.
* A reward payout authority.
* A settlement authority.
* A bridge authority.
* A staking or liquidity authority.
* A username mutation authority.
* A creator publishing authority.
* A service-node operator console.
* A moderation authority.
* A root Passport administrative device.
* A source of fake balances, receipts, finality, entitlements, or ownership.

React owns:

```text
display
focus
navigation
user intent
redacted status projection
```

Tauri/Rust/Kotlin own:

```text
native privilege
device-local secret handling
Android Keystore interaction
PIN prompt and PIN verification
JNI boundaries
local proof/runtime state
fail-closed lifecycle behavior
```

RustyOnions/backend services own:

```text
durable network truth
authorization truth
capability truth
receipt truth
entitlement truth
confirmed ROC truth
revocation truth
policy enforcement
```

## 5.2 ROC boundary

CrabLink TV may display only confirmed/backend-derived ROC state.

It must not:

* Create placeholder balances.
* Locally increment rewards.
* Fabricate confirmed ROC.
* Fabricate receipts.
* Unlock paid content from cache alone.
* Claim settlement from a local UI transition.
* Mutate wallet or ledger state.
* Expose direct reward-claim authority.

## 5.3 Micronode boundary

CrabLink clients are intended eventually to participate in bounded verification/micronode behavior, but the current TV application does not yet:

* Start a production micronode.
* Attach a production micronode.
* Produce reward-authoritative evidence.
* Claim rewards.
* Change balances.
* Mutate receipts.
* Write ledger state.

Existing settings may represent local scheduling intent only.

They must not claim that a verifier or micronode is attached unless native/backend truth confirms it.

## 5.4 Passport identity model

The project moved away from cloud-login identity semantics.

Current identity rule:

```text
CrabLink Passport = wallet-like, locally custodied identity/account
```

This applies across:

```text
desktop
Android TV
regular Android
iOS
future CrabLink clients
```

A Passport must not become:

* A cloud username/password account.
* A backend-owned identity.
* A server-custodied Passport secret.
* A cloud-stored recovery secret.
* A backend-issued identity pretending to be the source of truth.

The backend/gateway may verify:

```text
proofs
authorizations
capabilities
receipts
entitlements
policy
revocation state
```

It must not own the Passport secret.

---

# 6. Android TV delegated Passport security model

The TV is not a root Passport device.

Its intended posture is:

```text
DELEGATED=YES
REVOCABLE=YES
READ_ONLY=YES
DEVICE_BOUND=YES
ROOT_ADMIN=NO
```

The TV may eventually possess only:

* Its own locally generated device key.
* A root-signed TV device authorization.
* A narrowly scoped read capability.
* Device-local sealed material needed to use those items.
* A local PIN verifier/wrapping posture.
* Redacted public status suitable for UI display.

The TV must never receive or store:

* Passport recovery phrase.
* Passport recovery root.
* Root-admin private key.
* Root signing authority.
* Unrestricted delegation.
* Wallet spending authority.
* Username claim/transfer/release authority.
* Publishing authority.
* Node/operator authority.
* Raw unrestricted capabilities.
* Secrets in React state.
* Secrets in WebView JavaScript.
* Secrets in `localStorage`.
* Secrets in `sessionStorage`.
* Secrets in IndexedDB.
* PIN strings.
* PIN bytes passed into public Tauri commands.

Mandatory non-disclosure posture:

```text
RAW_DEVICE_KEY_RETURNED_TO_KOTLIN_CALLER=NO
RAW_CAPABILITY_RETURNED_TO_KOTLIN_CALLER=NO
RAW_DEVICE_KEY_RETURNED_TO_WEBVIEW=NO
RAW_CAPABILITY_RETURNED_TO_WEBVIEW=NO
PRIVATE_MATERIAL_EXPORTED=NO
PIN_RETURNED_TO_WEBVIEW=NO
PIN_BYTES_CROSS_JNI=NO
```

---

# 7. Android environment and known physical device

Known development toolchain:

```text
TAURI_CLI=2.11.4
ANDROID_COMMAND_LINE_TOOLS=20.0
ANDROID_API=36
ANDROID_BUILD_TOOLS=36.0.0_AND_35.0.0
ANDROID_NDK=29.0.14206865
GRADLE=8.14.3
ANDROID_GRADLE_PLUGIN=8.11.0
KOTLIN=1.9.25
JAVA=17
NODE_OBSERVED=22.16.0
```

Installed Rust Android targets include:

```text
aarch64-linux-android
armv7-linux-androideabi
i686-linux-android
x86_64-linux-android
```

Known Android TV device:

```text
OS=Android 14
BUILD=rk3539_box_32-user 14 UTT2.241219.001
INSTALLATION_METHOD=USB
ADB_AVAILABLE_FOR_WORKFLOW=NO
SUPPORTED_APPLICATION_ABI=32_BIT_ARMV7
```

Important hardware result:

* An ARM64 APK was previously rejected.
* An ARMv7 APK installed and launched successfully.
* Therefore, the target device workflow must use `armeabi-v7a`.
* Do not treat the device as ARM64-capable for application packaging merely because its SoC may theoretically support 64-bit hardware.
* The application/userspace evidence says ARMv7 is the working target.

---

# 8. Android project and launcher posture

The Android project has been configured for television use.

Confirmed posture includes:

* Internet permission.
* Leanback feature required.
* Touchscreen feature not required.
* Standard launcher category.
* Leanback launcher category.
* Landscape orientation.
* TV banner.
* Dedicated CrabLink TV identifier.
* Debug signing for current development APKs.
* No broad filesystem or operator permissions.
* No wallet or secret-management permission surfaced to React.

Application theme support:

```text
dark
light
system
```

Default first-run theme:

```text
dark
```

The initial HTML/bootstrap applies the theme early to prevent a bright first-render flash.

---

# 9. Android BuildTask repair that must be preserved

The generated Tauri Android `BuildTask.kt` initially attempted to invoke a bare `tauri` binary.

It was repaired to use the application-local JavaScript CLI:

```text
../node_modules/@tauri-apps/cli/tauri.js
```

Resolved local CLI path:

```text
/Users/mymac/Desktop/crablink/apps/crablink-tv/node_modules/@tauri-apps/cli/tauri.js
```

Do not casually regenerate or overwrite the Android project without verifying that this repair remains present.

The build currently prints a Gradle deprecation warning for the Java `exec` API, but the build remains green.

---

# 10. CrabLink TV implementation history

## 10.1 Phase 0 — repository and architecture baseline

Phase 0 established that CrabLink TV should be:

* A sibling application to desktop CrabLink.
* Built inside the same repository.
* Tauri-first.
* Remote-first.
* Client-only.
* Truthful about absent network/backend state.
* Isolated from wallet, ledger, operator, reward, bridge, and publishing authority.

It also established the separation between:

```text
apps/crablink-tauri
apps/crablink-tv
future apps/crablink-android
```

Status:

```text
PHASE0=COMPLETE
```

## 10.2 Phase 1 — television application shell

The dedicated TV application shell was created.

Core application surfaces included:

```text
apps/crablink-tv/index.html
apps/crablink-tv/package.json
apps/crablink-tv/vite.config.js
apps/crablink-tv/src/main.jsx
apps/crablink-tv/src/app/TvApp.jsx
apps/crablink-tv/src/styles/tv.css
apps/crablink-tv/src-tauri/
```

The shell established:

* Television layout.
* Ten-foot typography.
* TV-safe spacing.
* Dark/light/system theme support.
* Section-based navigation.
* Basic settings and diagnostics.
* Tauri native command ownership.
* No wallet/ledger authority.

Status:

```text
PHASE1=COMPLETE
```

## 10.3 Phase 2 — Android TV project and hardware acceptance

The owned Android project was generated and repaired.

Work included:

* Package identity.
* Leanback manifest configuration.
* Banner and icon generation.
* Landscape orientation.
* No-touchscreen declaration.
* ARM target builds.
* APK integrity/signature/ABI checks.
* Physical installation testing.

Two architecture paths were explored:

```text
arm64-v8a
armeabi-v7a
```

Physical evidence:

* ARM64 rejected by the device.
* ARMv7 installed.
* ARMv7 launched.
* CrabLink TV rendered on the physical box.

This was the project’s first successful Android application launch.

Status:

```text
PHASE2=COMPLETE
HARDWARE_ACCEPTED_ABI=armeabi-v7a
```

## 10.4 Phase 3 — native diagnostics, settings, gateway, and pairing foundations

Phase 3 established native Tauri command surfaces for television diagnostics and reviewed network posture.

Implemented areas included:

* Diagnostics snapshot.
* Settings snapshot.
* Gateway profile validation.
* Pairing readiness.
* Fixed reviewed origins.
* Safe DTO projection.
* Strict request bounds.
* No arbitrary caller-controlled URLs.
* No ambient proxy use.
* No credential disclosure.
* No raw response-body disclosure.

Gateway-health posture:

```text
METHOD=GET
PATH=/healthz
TIMEOUT=BOUNDED
RESPONSE_SIZE=BOUNDED
REDIRECTS=DISABLED
ARBITRARY_URLS=ABSENT
CREDENTIALS=ABSENT
```

Pairing-begin posture:

```text
METHOD=POST
PATH=/v1/tv/pairing
DEVICE_NAME=VALIDATED
SCOPES=FIXED_READ_ONLY
DUPLICATE_REQUEST=BLOCKED
CHALLENGE_AUTHORITY=BACKEND
APPROVAL_AUTHORITY=TRUSTED_COMPANION
```

Important historical note:

The early pairing model used companion approval language. Later Passport work corrected the broader identity model to wallet-like local custody and delegated device authorization. Existing pairing code should be interpreted as bounded authorization/delegation—not as a cloud login.

Status:

```text
PHASE3=COMPLETE
```

## 10.5 Phase 4 — shared JavaScript/core extraction

Shared client behavior was extracted so that desktop and TV did not independently invent incompatible route or platform rules.

The work included shared:

* `crab://` normalization.
* Route metadata.
* Platform contracts.
* Receipt display boundaries.
* Core route labels.
* Shared client behavior that belongs outside presentation layers.

The intent was to ensure:

```text
desktop presentation != TV presentation
shared protocol truth = one implementation
```

Status:

```text
PHASE4=COMPLETE
```

## 10.6 Phase 5 — client/platform contract hardening

The TV application and shared packages were hardened so that:

* React remained display/user-intent only.
* Tauri commands remained fixed and reviewed.
* Receipt and ROC display remained backend-derived.
* Platform capabilities remained explicit.
* Memory or placeholder adapters could not silently become production authority.
* Node/operator/wallet/ledger responsibilities remained absent.

Status:

```text
PHASE5=COMPLETE
```

## 10.7 Phase 6 — visible network readiness

Phase 6 built the visible network-readiness experience.

Implemented behavior included:

* Gateway readiness projection.
* Manual health retry.
* Duplicate-request lock.
* Truthful offline/error states.
* No automatic success.
* No fake session.
* Bounded health request behavior.
* TV-safe status presentation.

Earlier Phase 6 work briefly stopped before the final visible panel slice, but the missing slice was subsequently completed before Phase 7.

Status:

```text
PHASE6=COMPLETE
```

## 10.8 Phase 7 — routing, overlays, Back priority, and Android intent intake

Phase 7 established the robust television navigation model.

Implemented behavior included:

### Route policy

```text
APPROVED_ROUTE_POLICY=EXPLICIT
IMMUTABLE_ROUTE_STACK=ADDED
ROUTE_STACK_LIMIT=32
SHARED_CRAB_PARSER_REUSED=YES
```

### TV route behavior

* Shared `crab://` normalization.
* TV-local route registry.
* Explicit section history.
* Unsupported routes fail closed.
* Typed problem/error routes.
* Overlay ownership.
* Overlay-before-route Back priority.
* Root Back not trapped by WebView.
* Recorded focus restoration.
* Fallback focus to section tab, then Home.

### Android intents

* Android intent intake.
* Intent-to-route handoff.
* Reviewed route allowlist.
* Destination focus projection.
* No arbitrary route authority.

Known verification counts included:

```text
ANDROID_INTENT_TESTS=7
ROUTE_REGISTRY_REGRESSION_TESTS=11
PRODUCTION_BUILD=GREEN
```

Status:

```text
PHASE7=COMPLETE
```

## 10.9 Phase 8 — home catalog and creator browsing

Phase 8 added real read-only catalog and creator discovery surfaces.

### Phase 8A — catalog read boundary

Implemented:

* Native catalog read.
* Fixed reviewed request path.
* Bounded response.
* Redirects disabled.
* Caller-controlled arbitrary URL absent.
* Raw body disclosure absent.

Known focused test count:

```text
NATIVE_CATALOG_READ_TESTS=5
```

### Tauri catalog transport

Implemented:

```text
tvCatalogPort
readCatalog
tv_catalog_read
```

The transport reached green after repair iterations.

### Phase 8B — catalog card route handoff

Catalog cards were connected to reviewed route handoff.

Known test count:

```text
CARD_ROUTE_HANDOFF_TESTS=6
```

### Phase 8C — creator browse

Implemented:

* Creator browse model.
* Creator browse interaction.
* Creator browse React panel.
* Safe catalog-derived creator projection.

Known tests:

```text
CREATOR_BROWSE_MODEL_TESTS=7
CREATOR_BROWSE_REACT_TESTS=4
```

### Phase 8D — bounded thumbnails

Implemented:

* Bounded thumbnail projection.
* Safe fallback state.
* No caller-controlled arbitrary fetch path.
* No unbounded image behavior.

Known tests:

```text
THUMBNAIL_TESTS=4
```

### Phase 8E — creator profile

Implemented creator profile page and redacted/read-only creator information.

### Phase 8F — focus return

Returning from profile/detail views restores meaningful TV focus.

### Phase 8G — polish

Television spacing, navigation, loading, empty, and error states were hardened.

### Phase 8H — acceptance

The full Phase 8 acceptance passed.

Status:

```text
PHASE8=COMPLETE
```

## 10.10 Phase 9 — library, verified assets, and byte lifecycle

Phase 9 built the library and verified asset display pipeline.

Implemented behavior included:

* Library asset detail boundary.
* Manifest/evidence review.
* Gateway fetch with reviewed paths and bounds.
* B3/content verification.
* Corrupt or mismatched bytes rejected.
* Verified display projection.
* Object URL ownership and release.
* No render-before-verification.
* No cache-only entitlement authority.
* No raw uncontrolled body exposure.

Important implementation history:

* A manifest command approach was attempted and rolled back twice.
* The baseline was restored rather than leaving partial command authority.
* An early verified-render attempt was rolled back.
* The gateway fetch approach was repaired and reached green.
* Successor/checker repairs were required.
* The verified display boundary was eventually integrated.
* Byte render lifecycle passed.
* Object URL handoff and release behavior were completed in the later Phase 9 slices.
* Final Phase 9 acceptance was green before media playback work proceeded.

Known milestones included:

```text
PHASE9A_DETAIL_BOUNDARY=GREEN
PHASE9B_ACCEPTANCE=GREEN
PHASE9E_ADAPTER=GREEN
PHASE9G_GATEWAY_FETCH=GREEN
PHASE9J_SUCCESSOR_REPAIR=GREEN
PHASE9K_VERIFIED_DISPLAY_BOUNDARY=APPLIED
PHASE9L_BYTE_RENDER_LIFECYCLE=GREEN
PHASE9=COMPLETE
```

Status:

```text
PHASE9=COMPLETE
```

## 10.11 Phase 10 — verified media playback

Phase 10 implemented real verified media playback surfaces.

### Phase 10A — playback model

Media playback model and syntax checks reached green.

### Phase 10B — playback surface shell

A television playback shell was added.

### Phase 10C — verified source handoff

Only verified media sources are handed into playback.

### Phase 10D — video playback

Verified video playback reached green.

### Phase 10E — audio playback

Verified audio playback reached green.

### Phase 10F — remote control focus

Implemented:

* TV-focusable playback controls.
* Remote play/pause behavior.
* Predictable focus rail.
* Ten-foot UI controls.

### Phase 10G — error and retry truth

Playback errors remain truthful.

Retry does not imply:

* Verification success.
* Entitlement success.
* Receipt success.
* Network success.

### Phase 10H — acceptance

Full Phase 10 acceptance passed.

Status:

```text
PHASE10=COMPLETE
```

## 10.12 Phase 11 — Continue Watching and resource release

Phase 11 added the playback continuation and cleanup lifecycle.

Implemented surfaces included:

* Continue Watching state model.
* Continue Watching panel.
* Continue Watching persistence adapter model.
* Resource release lifecycle model.
* Resource release execution boundary.
* Object URL and media resource cleanup.
* Error/retry integration.
* Phase 11 acceptance boundary.

The emphasis was on preventing:

* Leaked object URLs.
* Stale verified bytes.
* Orphaned playback resources.
* False continuation state.
* Local continuation state becoming entitlement or ownership truth.

Status:

```text
PHASE11=COMPLETE
```

## 10.13 Transition from TV media work to Native Passport Phase 16

After the original TV content/media foundation was sufficiently mature, work returned to the Passport Native Buildplan.

Desktop Phase 15 and the separate onboarding buildplan were completed first because the Passport model needed to be proven on desktop before integrating it into Android TV.

Desktop onboarding ultimately reached:

```text
ENTIRE_ONBOARDING_BUILDPLAN=GREEN
NEXT_WORK=RETURN_TO_PASSPORT_NATIVE_PHASE16_CRABLINK_TV
```

Only then did active implementation return to CrabLink TV Native Passport integration.

---

# 11. Native Passport Phase 16 overview

Phase 16’s purpose is to make the Android TV device a real delegated Passport client without giving it root authority.

The original five-part finish direction was:

```text
Patch 1 — Phase 16B3B
Android JNI Keystore sealer and atomic device-material store

Patch 2 — Phase 16C
Pairing/authorization acquisition and durable replay-safe state

Patch 3 — Phase 16D
Root-signed authorization, narrow capability, authority runtime, proof use

Patch 4 — Phase 16E
Native PIN, lock/unlock, restart, background, suspension, fail-closed lifecycle

Patch 5 — Phase 16F
Redacted UI, revocation enforcement, forbidden-authority matrix, device acceptance
```

The implementation grew into smaller focused subpatches, but the architectural sequence remained the same.

---

# 12. Phase 16A — delegated Passport contract

## 12.1 Phase 16A1 — authoritative successor alignment

Completed and green.

This aligned the buildplan so that the authoritative successor path actually led into the Android TV delegated Passport implementation.

No disconnected placeholder phase was allowed to remain the source of truth.

## 12.2 Phase 16A2 — delegated read-only contract foundation

Completed and green.

Canonical schema:

```text
crablink.tv.delegated-passport.v1
```

Canonical device class:

```text
tv_read_only
```

The contract established:

* Device-bound identity.
* Root-signed authorization.
* Narrow read capability.
* Revocation.
* Expiry.
* Fixed allowed scopes.
* No root authority.
* No wallet authority.
* No publishing authority.
* No username mutation.
* No operator authority.

Status:

```text
PHASE16A1=GREEN
PHASE16A2=GREEN
```

---

# 13. Phase 16B — Android Keystore, JNI, and atomic material storage

Phase 16B built the native material-storage foundation.

Important Rust/Tauri surfaces include:

```text
apps/crablink-tv/src-tauri/src/passport_android_keystore.rs
apps/crablink-tv/src-tauri/src/passport_tv_device_material.rs
apps/crablink-tv/src-tauri/src/passport_android_jni.rs
```

Important Android/Kotlin surfaces were added under:

```text
apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/
```

Implemented behavior included:

* Android Keystore-backed sealing.
* Native device key storage.
* Narrow capability storage.
* Atomic replacement behavior.
* JNI bridge ownership.
* Secret array clearing.
* Rust-side zeroization.
* No raw material returned to WebView.
* No public Tauri secret command.

## 13.1 JNI lifetime repair history

The first Android ARMv7 build exposed a JNI lifetime mismatch.

Several focused repairs were attempted:

* Initial repair applied.
* A narrow transform failed.
* A revised transform applied.
* A post-write lifetime check failed and restored source.
* Whitespace/anchor repair was applied.
* The JNI source was eventually preserved in a compile-safe form.
* No public Tauri command was added.
* No React secret surface was added.

Final posture:

```text
ANDROID_ARMV7_JNI_COMPILE=GREEN
PUBLIC_TAURI_COMMAND_ADDED=NO
REACT_SECRET_SURFACE_ADDED=NO
```

---

# 14. Phase 16C — production JNI scan, pairing state, replay, and hydration

Phase 16C hardened production JNI and state hydration.

## 14.1 Production JNI scan and denylist

Implemented:

* Production JNI code scan.
* Test fixtures excluded from production scan.
* Defensive secret identifier denylist.
* Pairing runtime secret identifiers forbidden.
* Reviewed JNI secret-use exceptions kept narrow.
* Stale companion-panel requirement removed from checker.

Important posture:

```text
JNI_PRODUCTION_CODE_SCAN=ADDED
TEST_FIXTURES_EXCLUDED=YES
PRODUCTION_SECRET_SEED_IDENTIFIER=FORBIDDEN
PAIRING_RUNTIME_SECRET_IDENTIFIER=FORBIDDEN
```

## 14.2 Startup hydration boundary

Implemented startup hydration of redacted public state.

Required false-state defaults were enforced:

```text
AUTHORIZATION_PRESENT_FALSE_REQUIRED=YES
CAPABILITY_PRESENT_FALSE_REQUIRED=YES
SESSION_PRESENT_FALSE_REQUIRED=YES
```

Hydration posture:

```text
HYDRATED_MATERIAL=REDACTED_PUBLIC_RECORD_ONLY
CORRUPT_STORE_POSTURE=FAIL_CLOSED
CHANGED_DEVICE_KEY_INVALIDATES_PENDING_REQUEST=YES
```

## 14.3 Replay-safe durable state

The Phase 16C path also established replay-safe pairing/authorization record behavior.

Replay or mismatched state must not become accepted authorization.

The project’s proof and authority invariants require rejecting mismatches involving:

* Device key.
* Root/authorization binding.
* Capability binding.
* Request identity.
* Operation identity.
* Nonce.
* Expiry.
* Revocation.
* Scope.

Status:

```text
PHASE16C=GREEN_AT_IMPLEMENTED_BOUNDARIES
```

---

# 15. Phase 16D — delegated authority runtime and proof boundaries

Phase 16D built the delegated authority runtime.

Important Rust surface:

```text
apps/crablink-tv/src-tauri/src/passport_tv_authority_runtime.rs
```

Implemented behavior included:

* Root-signed authorization hydration.
* Narrow delegated capability hydration.
* Expiry enforcement.
* Revocation enforcement.
* Scope allowlist enforcement.
* Proof request expiry ceilings.
* Invalid hydration clearing.
* Device proof port abstraction.
* No raw authorization returned.
* No raw capability returned.
* No session fabricated.
* No production signing bypass.

## 15.1 Phase 16D3 authority runtime

The initial D3 verification correctly failed because the runtime and checker did not yet exist.

The implementation patch then added:

* Rust authority runtime.
* Android startup authority hydration.
* Device proof port.
* Explicit posture that production signing remained locked until the appropriate later phase.

A test fixture syntax defect was repaired without broadening scope.

Focused tests passed:

```text
DISCOVERED_TEST_COUNT=5
```

Host verification confirmed:

```text
REVOCATION_BLOCKS_PROOF=YES
EXPIRY_BLOCKS_PROOF=YES
PROOF_SCOPE_ALLOWLIST=ENFORCED
PROOF_EXPIRY_CEILINGS=ENFORCED
INVALID_HYDRATION_CLEARS_RUNTIME=GREEN
```

A fresh Android build completed with warnings only.

Final D3 posture:

```text
PHASE16D3_GREEN=YES
EXPIRED_AUTHORITY_PROOF_USE=BLOCKED
FORBIDDEN_SCOPE_PROOF_USE=BLOCKED
RAW_AUTHORIZATION_RETURNED=NO
RAW_CAPABILITY_RETURNED=NO
SESSION_CREATED=NO
PUBLIC_TAURI_COMMAND_COUNT=8
```

Status:

```text
PHASE16D1=GREEN
PHASE16D2=GREEN
PHASE16D3=GREEN
```

---

# 16. Phase 16E — native PIN and lifecycle unlock

Phase 16E built the device-local PIN and operational unlock chain.

Important Rust surfaces include:

```text
apps/crablink-tv/src-tauri/src/passport_tv_native_pin_lifecycle.rs
apps/crablink-tv/src-tauri/src/passport_tv_operational_unlock.rs
apps/crablink-tv/src-tauri/src/passport_android_operational_material_port.rs
apps/crablink-tv/src-tauri/src/passport_android_jni.rs
```

Important Kotlin surfaces include:

```text
MainActivity.kt
TvPassportNativePinCoordinator.kt
TvPassportNativePinPrompt.kt
TvPassportNativePinVerifierStore.kt
TvPassportOperationalUnlockBridge.kt
```

## 16.1 Core native PIN invariants

The PIN is:

```text
DEVICE_LOCAL=YES
ROOT_SECRET=NO
CLOUD_PASSWORD=NO
WEBVIEW_INPUT=NO
TAURI_ARGUMENT=NO
```

Enrollment requirements:

* Explicit user action.
* Two-entry confirmation.
* Constant-time comparison over character arrays.
* No conversion to `String`.
* Clear both PIN arrays.
* Do not automatically unlock after enrollment.
* Do not expose PIN material to WebView or Rust.

Unlock requirements:

* Explicit user action.
* Native prompt.
* Local verifier check.
* One-use 32-byte verified ticket.
* Clear PIN material before JNI handoff.
* JNI receives the verified-ticket path—not the PIN.
* Wrong PIN must not invoke native unseal.
* Cancellation must not invoke native unseal.
* Concurrent prompts must be blocked.
* Invalid result must fail closed.
* Missing verifier must fail closed.
* Prompt unavailable must fail closed.
* JNI exception or panic must fail closed.

Lifecycle requirements:

* Restart begins locked.
* Background fails closed.
* Suspension fails closed.
* Explicit lock fails closed.
* Invalid hydration fails closed.
* Revocation blocks use.
* No automatic prompt on startup.
* No automatic unlock on startup.
* No automatic prompt on resume.

## 16.2 Global operational runtime

The operational runtime was connected through focused subphases.

Implemented surfaces included:

* Global operational runtime foundation.
* Verified PIN ticket consumption.
* Android Keystore material unseal ports.
* Device key unseal.
* Narrow capability unseal.
* Redacted JNI receipt.
* Global fail-closed lock.
* Panic containment.
* Pending JNI exception clearing.
* Secret array zeroization.
* Rust `Zeroizing<Vec<u8>>` use.

Important posture:

```text
VERIFIED_PIN_TICKET=CONSUMED_ONCE_BEFORE_UNSEAL
JAVA_SECRET_ARRAYS=ZEROIZED
RUST_SECRET_BUFFERS=ZEROIZING
SUCCESS_RECEIPT=REDACTED
FAILURE_RECEIPT=REDACTED_FAILED_CLOSED
JNI_PANIC_CONTAINMENT=ADDED
JNI_PENDING_EXCEPTION_CLEAR=ADDED
```

## 16.3 Phase 16E3B3A — PIN coordinator

Phase 16E3B3A completed the PIN coordinator.

Verified behavior:

```text
PIN_ENROLLMENT=TWO_ENTRY_EXPLICIT_NATIVE_FLOW
PIN_CONFIRMATION=CONSTANT_TIME_CHAR_ARRAY_COMPARISON
PIN_CONVERTED_TO_STRING=NO
ENROLLMENT_AUTOMATIC_UNLOCK=NO
CORRECT_PIN_JNI_UNLOCK=CONNECTED_IN_COORDINATOR
WRONG_PIN_JNI_UNLOCK=BLOCKED
CANCEL_JNI_UNLOCK=BLOCKED
CONCURRENT_PROMPT=BLOCKED
FAIL_CLOSED_LOCK_HOOK=ADDED
```

At B3A, the coordinator existed but the Activity request surface and lifecycle callbacks were intentionally not yet connected.

Status:

```text
PHASE16E3B3A=GREEN
```

## 16.4 Phase 16E3B3B — explicit request and lifecycle lock

Phase 16E3B3B connected the coordinator to reviewed native controls and Android lifecycle callbacks.

Explicit controls:

```text
MENU_OR_F1=PIN_ENROLLMENT_OR_UNLOCK
INFO_OR_F2=EXPLICIT_OPERATIONAL_LOCK
```

The F1/F2 fallback exists so a USB keyboard can test the path if the remote does not expose MENU/INFO key codes.

MainActivity behavior:

* `dispatchKeyEvent` owns the reviewed key codes.
* Action occurs only on key-up.
* Repeated key events do not duplicate the action.
* Owned key events are consumed.
* Other key events delegate to the superclass.

Lifecycle behavior:

```text
onPause -> failClosedOnLifecycleBoundary
onStop -> failClosedOnLifecycleBoundary
onDestroy -> failClosedOnLifecycleBoundary
```

`onDestroy` also releases the stored WebView reference.

No prompt was added to:

```text
onCreate
onResume
```

### B3B implementation and repair history

The first B3B apply rolled back because the mutation patch used a brittle regular expression against the Phase 16E3B3A predecessor checker.

Exact failure:

```text
Phase 16E3B3A successor-guard match count was 0, expected 1
```

A narrow repair made the B3A checker successor-aware using stable markers rather than the brittle regular expression.

That repair:

* Changed one checker file.
* Preserved pre-successor rejection.
* Did not mutate MainActivity.
* Did not add the B3B boundary yet.

The revised B3B apply then completed:

```text
PHASE16E3B3B_APPLY=APPLIED
CHANGED_FILE_COUNT=5
```

The first B3B verification then found a checker false positive:

```text
Activity secret boundary contains forbidden fragment: evaluateJavascript(
```

The issue was not introduced by B3B. `MainActivity.kt` already contained an unrelated reviewed `evaluateJavascript` path elsewhere in the file.

A narrow checker repair changed the scan from the entire Activity to only the B3B-owned methods:

```text
dispatchKeyEvent
onPause
onStop
onDestroy
```

The secret boundary remained enforced within those methods.

After that repair, full verification passed.

### B3B final verification

Green checks included:

* Rustfmt.
* Boundary script syntax.
* B3B boundary.
* B3A predecessor.
* B2B2C predecessor.
* B2B2B predecessor.
* B2B2A predecessor.
* Public Tauri command boundary.
* Host `cargo check`.
* Host Clippy with `-D warnings`.
* Removal of stale Android artifacts.
* Fresh ARMv7 Android build.
* APK acceptance.
* Native-library byte matching.
* DEX marker inspection.

Final B3B posture:

```text
NATIVE_PASSPORT_PHASE16E3B3B_EXPLICIT_REQUEST_AND_LIFECYCLE_LOCK=GREEN
PHASE16E3B3B_GREEN=YES
ANDROID_TARGET_RUST_COMPILE=GREEN
ANDROID_KOTLIN_COMPILE=GREEN
ANDROID_ARMV7_APK_BUILD=GREEN
EXPLICIT_NATIVE_REQUEST=MENU_OR_F1
EXPLICIT_NATIVE_LOCK=INFO_OR_F2
AUTOMATIC_STARTUP_PROMPT=NO
AUTOMATIC_STARTUP_UNLOCK=NO
BACKGROUND_LOCK=CONNECTED
SUSPENSION_LOCK=CONNECTED
DESTROY_LOCK=CONNECTED
PIN_BYTES_CROSS_JNI=NO
WRONG_PIN_JNI_UNLOCK=BLOCKED
CANCEL_JNI_UNLOCK=BLOCKED
CONCURRENT_PROMPT=BLOCKED
PUBLIC_TAURI_COMMAND_COUNT=8
```

Status:

```text
PHASE16E3B3B=GREEN
```

## 16.5 Phase 16E3B3C — physical-device acceptance runner

Phase 16E3B3C could not be physically executed because the television and Android TV box were unavailable.

Instead of falsely marking the phase green, a truthful device-acceptance runner was added.

Added files:

```text
scripts/run-crablink-tv-native-passport-phase16e3b3c-device-runtime-acceptance.sh
scripts/check-crablink-tv-native-passport-phase16e3b3c-device-runtime-acceptance-boundary.mjs
```

Added package scripts:

```text
check:native-passport-phase16e3b3c-device-runtime-acceptance
accept:native-passport-phase16e3b3c-device-runtime

tv:native-passport:phase16e3b3c:device-runtime:check
tv:native-passport:phase16e3b3c:device-runtime:accept
```

The runner:

* Requires the current ARMv7 APK.
* Checks ZIP integrity.
* Confirms `armeabi-v7a`.
* Rejects unexpected ARM64 packaging.
* Records the APK SHA-256.
* Prints the exact device plan.
* Requires manual `PASS` or `FAIL` for each observation.
* Does not default to pass.
* Does not auto-install.
* Does not use ADB.
* Records the first failed observation.
* Does not claim Phase 16F operational proof.
* Does not claim revocation proof.
* Does not claim forbidden-authority proof.

### Plan-only mode

The runner supports:

```text
--plan
```

Plan-only mode truthfully emits:

```text
NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE=NOT_RUN
ANDROID_RUNTIME_EXECUTION=NOT_RUN
PLAN_ONLY=YES
NO_RUNTIME_CLAIM=YES
```

### Static runner verification

The acceptance runner and checker passed:

* Runner presence.
* Executable bit.
* Shell syntax.
* Checker syntax.
* Codebundle script syntax.
* Package wiring.
* Future codebundle selection.
* Boundary check.
* Root package boundary entry.
* Plan-only execution.
* B3B predecessor.
* B3A predecessor.
* Public Tauri command boundary.

Final runner posture:

```text
NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE_RUNNER=GREEN
PHASE16E3B3C_RUNNER_VERIFICATION=GREEN
PHASE16E3B3C_RUNNER_STATE=APPLIED_AND_STATICALLY_VERIFIED
PHASE16E3B3C_GREEN=NOT_YET_CLAIMED
PHYSICAL_DEVICE_ACCEPTANCE=NOT_RUN
ANDROID_RUNTIME_EXECUTION=NOT_RUN
```

Status:

```text
PHASE16E3B3C_RUNNER=GREEN
PHASE16E3B3C_PHYSICAL_ACCEPTANCE=PENDING_HARDWARE
```

---

# 17. Latest verified APK

Current latest APK:

```text
/Users/mymac/Desktop/crablink/apps/crablink-tv/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

Build time observed:

```text
July 31, 2026 at approximately 19:58 local time
```

Artifact properties:

```text
APK_ABI=armeabi-v7a
APK_SIZE_BYTES=208194028
APK_APPROXIMATE_SIZE=199_MIB
APK_SHA256=61c4683d2e4db2350a702ba940e2292e23b375a0c88429236b186eaf76532467
```

Native library:

```text
NATIVE_LIBRARY_SIZE_BYTES=200517128
NATIVE_LIBRARY_SHA256=f2a1a35f35fa00ccde28eb9a5df8994d507aa46c7e6f5e87b4101c7328bcde02
NATIVE_LIBRARY_FORMAT=ELF_32_BIT_ARM
```

Packaging verification:

```text
TARGET_AND_PACKAGED_NATIVE_LIBRARY_MATCH=YES
PACKAGED_AND_APK_NATIVE_LIBRARY_MATCH=YES
APK_ZIP_INTEGRITY=GREEN
APK_ALIGNMENT=GREEN
APK_SIGNING=GREEN
APK_ABIS=armeabi-v7a
```

Application verification:

```text
APPLICATION_ID=com.rustyonions.crablink.tv
VERSION_NAME=0.1.0
VERSION_CODE=1000
MIN_SDK=24
TARGET_SDK=36
DEBUGGABLE=true
LEANBACK_REQUIRED=true
TOUCHSCREEN_REQUIRED=false
ORIENTATION=landscape
TV_BANNER=present
```

Debug signing:

```text
SIGNATURE_SCHEME_V2=YES
SIGNER=Android Debug
```

Packaged native markers confirmed:

```text
Java_com_rustyonions_crablink_tv_TvPassportOperationalUnlockBridge_unlockAfterVerifiedNativePin
consumeVerifiedPinTicketForNative
unsealStoredDeviceKeyForNative
unsealStoredNarrowCapabilityForNative
operationally_unlocked
failed_closed
native_panic_blocked
```

Packaged DEX markers confirmed:

```text
MainActivity
TvPassportNativePinCoordinator
dispatchKeyEvent
requestExplicitEnrollmentOrUnlock
requestExplicitLock
failClosedOnLifecycleBoundary
requestEnrollmentPin
requestEnrollmentConfirmation
TvPassportOperationalUnlockBridge
unlockAfterVerifiedNativePin
consumeVerifiedPinTicketForNative
```

This APK is build-verified and package-verified.

It is not yet physically verified for the new PIN/lifecycle behavior.

Do not write:

```text
ANDROID_RUNTIME_EXECUTION=GREEN
```

until the runner has been completed on the physical device.

---

# 18. Public Tauri command boundary

The public TV command allowlist remains exactly eight commands:

```text
tv_asset_manifest_check
tv_catalog_read
tv_diagnostics
tv_gateway_health
tv_gateway_profile
tv_pairing_begin
tv_pairing_status
tv_settings_read
```

Current posture:

```text
PUBLIC_TAURI_COMMAND_COUNT=8
PUBLIC_PASSPORT_TAURI_COMMAND_ADDED=NO
```

No public Tauri command was added for:

* PIN enrollment.
* PIN verification.
* PIN unlock.
* Device key return.
* Capability return.
* Raw authorization return.
* Secret export.
* Passport root operations.

The native Passport path remains Android-owned through Kotlin/JNI and private Rust runtime surfaces.

---

# 19. Important files now involved

## 19.1 Rust/Tauri Passport files

```text
apps/crablink-tv/src-tauri/Cargo.toml
apps/crablink-tv/src-tauri/Cargo.lock
apps/crablink-tv/src-tauri/src/lib.rs

apps/crablink-tv/src-tauri/src/passport_android_jni.rs
apps/crablink-tv/src-tauri/src/passport_android_keystore.rs
apps/crablink-tv/src-tauri/src/passport_android_operational_material_port.rs

apps/crablink-tv/src-tauri/src/passport_tv_authority_runtime.rs
apps/crablink-tv/src-tauri/src/passport_tv_authorization_replay.rs
apps/crablink-tv/src-tauri/src/passport_tv_delegated_authority.rs
apps/crablink-tv/src-tauri/src/passport_tv_device_material.rs
apps/crablink-tv/src-tauri/src/passport_tv_native_pin_lifecycle.rs
apps/crablink-tv/src-tauri/src/passport_tv_operational_unlock.rs
apps/crablink-tv/src-tauri/src/passport_tv_pairing_runtime.rs
```

## 19.2 Kotlin/Android Passport files

Exact directory:

```text
apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/
```

Important files include:

```text
MainActivity.kt
TvPassportNativePinCoordinator.kt
TvPassportNativePinPrompt.kt
TvPassportNativePinVerifierStore.kt
TvPassportOperationalUnlockBridge.kt
```

Additional authority, hydration, storage, and JNI bridge Kotlin files may exist in the same directory and should be inspected from the repository rather than reconstructed from memory.

## 19.3 Core TV React areas

```text
apps/crablink-tv/src/app/
apps/crablink-tv/src/catalog/
apps/crablink-tv/src/focus/
apps/crablink-tv/src/library/
apps/crablink-tv/src/media/
apps/crablink-tv/src/navigation/
apps/crablink-tv/src/network/
apps/crablink-tv/src/pairing/
apps/crablink-tv/src/platform/
apps/crablink-tv/src/settings/
apps/crablink-tv/src/styles/
```

## 19.4 Phase 16 scripts/checkers

There are many sequential Phase 16 checker files under:

```text
scripts/
```

The latest added Phase 16E files are:

```text
scripts/check-crablink-tv-native-passport-phase16e3b3a-pin-coordinator-boundary.mjs
scripts/check-crablink-tv-native-passport-phase16e3b3b-explicit-request-lifecycle-lock-boundary.mjs
scripts/check-crablink-tv-native-passport-phase16e3b3c-device-runtime-acceptance-boundary.mjs
scripts/run-crablink-tv-native-passport-phase16e3b3c-device-runtime-acceptance.sh
```

## 19.5 Package and codebundle wiring

Changed wiring includes:

```text
apps/crablink-tv/package.json
package.json
scripts/make_codebundle.sh
```

The new runner/checker are included in future codebundle selection.

The codebundle itself was not regenerated after the latest patches.

---

# 20. Codebundle posture

The latest previously generated codebundle predates the final Phase 16E3B3B and E3B3C work.

Current truth:

```text
CODEBUNDLE_REGENERATED=NO
LATEST_CODEBUNDLE_IS_STALE_RELATIVE_TO_FINAL_SESSION_PATCHES=YES
SOURCE_OF_TRUTH=REPOSITORY
```

Do not treat the older codebundle as containing the final:

* MainActivity key integration.
* Lifecycle lock integration.
* B3B boundary repair.
* B3C device runner.
* B3C boundary checker.
* New package scripts.

When the project reaches a meaningful next milestone—preferably after physical acceptance and Phase 16F completion—regenerate the codebundle.

Do not regenerate it merely to satisfy an intermediate patch ritual.

---

# 21. Known non-blocking warnings

The fresh Android build emitted Rust dead-code warnings in surfaces intentionally prepared for later runtime use.

Examples include:

```text
TV_DEVICE_PROOF_PORT_SCHEMA never used
LOWER_HEX_ID_BYTES never used
TvDeviceProofPortRequestV1 never constructed
TvDeviceProofPortReceiptV1 never constructed
TvDeviceProofPort trait never used
request_device_proof never used
validate_proof_request never used
validate_proof_receipt never used
valid_lower_hex_id never used
```

Some enum variants were also not yet constructed in production:

```text
ScopeDenied
ProofRequestInvalid
ProofRequestBeyondAuthority
RuntimeLocked
ProofReceiptInvalid

Cancelled
WrongPin
PromptUnavailable

Background
Suspension
```

These warnings were non-blocking in the Android target build.

Host Clippy with:

```text
-D warnings
```

passed.

The generated Android build also prints:

```text
BuildTask.kt exec API is deprecated
Gradle deprecated features used
future Gradle 9 incompatibility warning
```

These warnings did not block the Gradle 8.14.3 APK build.

Do not spend time cleaning these warnings before the device acceptance unless one becomes the first actual failure.

---

# 22. Work completed specifically in the final July 31 session

This final session completed the following sequence:

1. Began from a green Phase 16E3B3A PIN coordinator.
2. Attempted the Phase 16E3B3B explicit request/lifecycle patch.
3. The first apply rolled back because of a brittle predecessor-checker regex.
4. Added a narrow successor-awareness repair to the B3A checker.
5. Re-ran the revised B3B apply.
6. Added:

   * MENU/F1 explicit enrollment/unlock.
   * INFO/F2 explicit lock.
   * `onPause` fail-close.
   * `onStop` fail-close.
   * `onDestroy` fail-close.
   * B3B boundary checker.
   * Package scripts.
   * Future codebundle selection.
7. First B3B verification failed because the checker scanned an unrelated existing `evaluateJavascript` call elsewhere in MainActivity.
8. Narrowed the secret scan to the four B3B-owned methods.
9. Re-ran B3B verification.
10. Passed all predecessor checks.
11. Passed command boundary.
12. Passed host Cargo check.
13. Passed host Clippy.
14. Deleted stale native/APK artifacts.
15. Built a fresh ARMv7 APK.
16. Passed APK acceptance.
17. Proved target, packaged, and APK native libraries were byte-identical.
18. Proved required native and DEX markers were packaged.
19. Marked Phase 16E3B3B green.
20. Added the Phase 16E3B3C physical-device acceptance runner.
21. Added a boundary ensuring:

    * No automatic pass.
    * No false runtime claim.
    * No ADB requirement.
    * No Phase 16F proof claim.
22. Verified the runner and plan-only mode.
23. Stopped because no television or Android TV box was available.
24. Did not regenerate the codebundle.
25. Did not mutate RustyOnions.

Session-end truth:

```text
PHASE16E3B3B=GREEN
PHASE16E3B3C_RUNNER=GREEN
PHASE16E3B3C_DEVICE_EXECUTION=BLOCKED_BY_HARDWARE_AVAILABILITY
PHASE16F=NOT_STARTED
```

---

# 23. Exact physical-device acceptance that remains

When the television and Android TV box are available, use the latest ARMv7 APK.

Install manually by USB:

```text
/Users/mymac/Desktop/crablink/apps/crablink-tv/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

Then run from the CrabLink repository:

```bash
npm run tv:native-passport:phase16e3b3c:device-runtime:accept
```

The runner asks for explicit `PASS` or `FAIL`.

Do not pipe synthetic input into it.

Do not mark an item `PASS` unless the behavior was directly observed.

Required observations:

## 23.1 Installation and startup

Confirm:

* This exact APK was installed from USB.
* It launched on the recorded Android TV.
* No automatic PIN prompt appeared on startup.
* No silent automatic unlock occurred.
* The application remained stable.

## 23.2 First enrollment

Use:

```text
MENU remote key
or
F1 on a USB keyboard
```

Confirm:

* A native Android PIN enrollment prompt appears.
* No WebView PIN form appears.
* The first PIN entry is accepted only as the first enrollment step.
* A second confirmation entry is required.
* A mismatched confirmation fails closed.
* A matched confirmation enrolls the verifier.
* Successful enrollment does not automatically unlock.

## 23.3 Unlock behavior

Press MENU or F1 again.

Confirm:

* A native unlock prompt appears.
* Cancel leaves the application locked.
* Wrong PIN leaves the application locked.
* No visible success state appears for wrong PIN.
* Correct PIN completes without crash or hang.
* No PIN, key, capability, recovery material, or raw receipt is displayed.

Phase 16E3B3C only requires correct-PIN flow stability.

The stronger proof that operational material was truly unsealed and used belongs to Phase 16F.

## 23.4 Explicit lock

Use:

```text
INFO remote key
or
F2 on a USB keyboard
```

Confirm:

* Explicit lock action is invoked.
* App remains stable.
* Subsequent sensitive behavior requires a new explicit unlock.

## 23.5 Background and resume

Send the app to the background or Home screen.

Return to CrabLink TV.

Confirm:

* No automatic prompt appears.
* No automatic unlock occurs.
* The app is fail-closed.

## 23.6 Relaunch

Close/restart the application.

Confirm:

* Relaunch begins locked.
* No automatic prompt appears.
* No automatic unlock occurs.

## 23.7 Disclosure review

Throughout the test, confirm there is no visible disclosure of:

* PIN.
* Device key.
* Capability.
* Raw authorization.
* Recovery phrase.
* Recovery root.
* Root-admin key.
* Session token.
* Private material.

## 23.8 Remote compatibility note

The physical remote may not emit:

```text
KEYCODE_MENU
KEYCODE_INFO
```

If those controls do not trigger on the remote, attach a USB keyboard and use:

```text
F1=ENROLL_OR_UNLOCK
F2=LOCK
```

If F1/F2 work but MENU/INFO do not, record that truthfully. It is a device/UX mapping issue, not permission to mark the remote-path observation as passed.

---

# 24. Required Phase 16F work after E3B3C passes

Phase 16F is the final Passport-native Android TV phase.

It must not begin with a fake completion claim.

## 24.1 Phase 16F1 — redacted status surface

Likely next patch:

```text
NATIVE_PASSPORT_PHASE16F1_REDACTED_STATUS_SURFACE
```

Required UI states:

```text
no Passport/device authorization
authorization pending
authorized
locked
operationally unlocked
expired
revoked
invalid/corrupt state
redacted @username when available
clear fail-closed error state
```

Allowed UI information:

* Redacted status.
* Redacted username.
* Device authorization posture.
* Lock posture.
* Expiry/revocation posture.
* Safe retry or explicit unlock intent.
* Truthful read-only capability status.

Forbidden UI information:

* Private key.
* Device secret.
* Recovery phrase.
* Recovery root.
* Root-admin key.
* Raw authorization.
* Raw capability.
* Session token.
* PIN or verifier material.
* Unapproved root identifier details.

The UI must not infer operational unlock merely because the prompt closed.

It must consume a redacted native receipt/status projection.

## 24.2 Operational unlock proof

Phase 16F must prove that correct PIN results in the intended native chain:

```text
native PIN verified
one-use ticket created
ticket consumed once
device key unsealed
narrow capability unsealed
global operational runtime hydrated
proof-sensitive request uses device-bound runtime
redacted success status projected
```

It must also prove:

```text
wrong PIN -> no ticket
cancel -> no ticket
expired ticket -> rejected
reused ticket -> rejected
JNI failure -> fail closed
pending exception -> fail closed
panic -> fail closed
invalid receipt -> fail closed
```

## 24.3 Revocation enforcement

Revocation must be performed externally by a legitimate root-admin desktop/mobile device.

After revocation, confirm on TV:

* Existing proof-sensitive use is blocked.
* Capability refresh is rejected.
* New proof request is rejected.
* Operational runtime clears or fails closed.
* UI shows revoked state.
* Restart does not restore access.
* Cached state does not override revocation.
* No local “re-authorize” action bypasses root authority.

## 24.4 Expiry enforcement

Confirm:

* Expired authorization cannot unlock proof use.
* Expired capability cannot produce accepted proof.
* UI shows expired rather than generic success.
* Refresh requires the legitimate authorization path.

## 24.5 Scope enforcement

The TV must remain constrained to the approved read-only scope set.

It may eventually access only reviewed read surfaces such as:

```text
identity/profile read
catalog/content read
entitlement read
receipt read
confirmed ROC read
```

It must reject attempts outside the delegated scope.

## 24.6 Forbidden-authority regression matrix

The final phase must prove the TV cannot:

```text
authorize another device
revoke another device
claim a username
transfer a username
release a username
publish content
edit creator truth
spend ROC
issue ROC
mutate a ledger
create settlement
administer rewards
operate a service node
bridge assets
stake assets
provide liquidity
export the device key
export a raw capability
receive the recovery phrase
receive the recovery root
receive the root-admin private key
```

These should be tested through source boundaries, command allowlists, native behavior, and physical UI review.

## 24.7 Final application acceptance

After Phase 16F implementation:

1. Run focused Phase 16F checks.
2. Run all relevant Phase 16 predecessor boundaries.
3. Run public command boundary.
4. Run host Cargo check.
5. Run strict Clippy.
6. Remove stale ARMv7 artifacts.
7. Build a fresh ARMv7 APK.
8. Run APK integrity/signature/ABI/alignment checks.
9. Inspect packaged native and DEX markers.
10. Install the final APK by USB.
11. Run physical device acceptance.
12. Record exact device behavior.
13. Regenerate the codebundle.
14. Create final Android TV closeout notes.
15. Only then mark Phase 16 complete.

---

# 25. Exact resume order

When returning to this work, do not immediately write a new Phase 16F patch.

Use this order:

## Step 1 — load project context

Read:

```text
ANDROID_TV_NOTES.md
PASSPORT_NATIVE_BUILDPLAN.md
latest CrabLink TV carry-over notes
latest repository source
```

Remember that the old codebundle is stale relative to B3B/B3C.

## Step 2 — confirm the APK still exists

Expected path:

```text
apps/crablink-tv/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

Expected SHA-256 from the last session:

```text
61c4683d2e4db2350a702ba940e2292e23b375a0c88429236b186eaf76532467
```

If the file has changed, do not claim it is the same artifact.

Run the standard build/acceptance lane again if a fresh APK is needed.

## Step 3 — install physically

Copy the APK to USB media and install it manually on the Android TV box.

No ADB is required for the current workflow.

## Step 4 — run the interactive runner

From repository root:

```bash
npm run tv:native-passport:phase16e3b3c:device-runtime:accept
```

Answer only:

```text
PASS
FAIL
```

based on actual observations.

## Step 5 — fix the first physical failure

If any item fails:

```text
FIRST_FAILURE=<observation>
NEXT_ACTION=FIX_FIRST_REPORTED_FAILURE
```

Do not continue down the checklist and treat later items as authoritative.

Do not begin Phase 16F until the E3B3C prompt/lifecycle acceptance is honestly green or until a narrowly identified hardware-specific issue has been repaired and retested.

## Step 6 — start Phase 16F1

After E3B3C passes:

```text
NEXT_PATCH=NATIVE_PASSPORT_PHASE16F1_REDACTED_STATUS_SURFACE
```

Continue the established two-turn patch workflow.

---

# 26. Development workflow rules that must carry forward

## 26.1 Patch/verification separation

Every change must be split into separate turns:

1. Apply-only patch.
2. User runs it and posts output.
3. Review the first failure or success.
4. Verification-only block in the next turn.

Do not combine a large mutation and its full verification into one terminal block.

## 26.2 No repository commands

Do not include any repository-management commands.

Forbidden in assistant blocks:

```text
git
git apply
git diff
git status
git add
git commit
git push
```

The user handles repository operations separately.

## 26.3 No downloads

Do not add downloads unless explicitly requested.

## 26.4 Codebundle cadence

Do not regenerate the codebundle after every patch.

Regenerate only:

* At a major phase milestone.
* At final session wrap-up when specifically useful.
* When the user explicitly requests it.
* When exact current source inspection cannot otherwise be performed.

## 26.5 First-failure discipline

* Run focused checks.
* Stop at the first actual failure.
* Repair the exact file and behavior.
* Re-run the focused check.
* Do not expand scope while red.

## 26.6 Shell patch style

Use paste-ready Bash functions.

Prefer:

```text
function
return
backup
atomic write
rollback on failure
explicit APPLIED/RED markers
```

Avoid terminating the user’s shell with `exit`.

## 26.7 Truthful acceptance

Never convert:

```text
source check
host test
Android compile
APK packaging
static marker inspection
```

into:

```text
physical device behavior proven
```

Use:

```text
ANDROID_RUNTIME_EXECUTION=NOT_RUN
```

until the device test actually occurs.

## 26.8 Repository scope

The latest TV work mutated CrabLink only.

Current posture:

```text
RUSTYONIONS_MUTATED=NO
```

Do not modify RustyOnions during the remaining TV client phase unless the first real integration failure proves a backend contract change is required and the user explicitly agrees to cross that boundary.

---

# 27. Things not to do when resuming

Do not:

* Rebuild the TV app as a cloud login.
* Reintroduce companion-device secret custody.
* Put PIN input in React.
* Pass PIN through a public Tauri command.
* Return raw device key material to Kotlin.
* Return raw capability material to Kotlin.
* Return secret material to WebView.
* Add `@JavascriptInterface` secret bridges.
* Put Passport secrets in local storage.
* Add automatic startup unlock.
* Add automatic startup prompt.
* Prompt automatically on resume.
* Treat enrollment as unlock.
* Treat prompt closure as successful unlock.
* Allow wrong PIN to invoke JNI unseal.
* Allow cancellation to invoke JNI unseal.
* Allow concurrent prompt execution.
* Let a D3 test helper become a production bypass.
* Add more public Tauri commands without a documented reviewed need.
* Expand the current eight-command allowlist casually.
* Treat the stale codebundle as current source.
* Use ARM64 for the known Android TV box.
* Claim physical acceptance without the box.
* Mark Phase 16 complete before Phase 16F.
* Start the regular Android application inside `apps/crablink-tv`.
* Mix future iOS implementation into the TV phase.
* Add wallet, ledger, ROC mutation, bridge, staking, or node authority.

---

# 28. Broader roadmap after Android TV completion

After the Android TV Passport path is fully green, the expected platform roadmap is:

```text
1. Finish CrabLink TV Phase 16 physical and final acceptance.
2. Build the regular Android phone/tablet application.
3. Build the iOS application.
4. Reconcile shared Passport/core behavior across desktop, TV, Android, and iOS.
5. Continue CrabNode/micronode integration and real network participation work.
6. Evaluate QuickChain behavior with the completed clients.
7. Return to the remaining ROX Anchor/Solana testnet integration.
8. Run full beta-system flows across clients, nodes, ROC, QuickChain, and ROX Anchor.
```

The regular Android and iOS clients should reuse:

* Shared route normalization.
* Shared Passport contracts.
* Shared read-only DTOs.
* Shared proof models.
* Shared receipt and entitlement truth rules.
* Shared native-core behavior where platform-independent.

They should not reuse:

* TV layout.
* TV focus graph.
* Leanback navigation assumptions.
* TV remote key mappings.
* TV-specific lifecycle UX.

---

# 29. Final status ledger

```text
PROJECT=RUSTYONIONS_CRABLINK
APPLICATION=CRABLINK_TV
REPOSITORY=/Users/mymac/Desktop/crablink
APP_PATH=apps/crablink-tv

ORIGINAL_TV_PHASE0=COMPLETE
ORIGINAL_TV_PHASE1=COMPLETE
ORIGINAL_TV_PHASE2=COMPLETE
ORIGINAL_TV_PHASE3=COMPLETE
ORIGINAL_TV_PHASE4=COMPLETE
ORIGINAL_TV_PHASE5=COMPLETE
ORIGINAL_TV_PHASE6=COMPLETE
ORIGINAL_TV_PHASE7=COMPLETE
ORIGINAL_TV_PHASE8=COMPLETE
ORIGINAL_TV_PHASE9=COMPLETE
ORIGINAL_TV_PHASE10=COMPLETE
ORIGINAL_TV_PHASE11=COMPLETE

PASSPORT_NATIVE_PHASE16A=GREEN
PASSPORT_NATIVE_PHASE16B=GREEN
PASSPORT_NATIVE_PHASE16C=GREEN
PASSPORT_NATIVE_PHASE16D=GREEN
PASSPORT_NATIVE_PHASE16E3B3A=GREEN
PASSPORT_NATIVE_PHASE16E3B3B=GREEN
PASSPORT_NATIVE_PHASE16E3B3C_RUNNER=GREEN
PASSPORT_NATIVE_PHASE16E3B3C_PHYSICAL_ACCEPTANCE=NOT_RUN
PASSPORT_NATIVE_PHASE16F=NOT_STARTED

LATEST_APK_ABI=armeabi-v7a
LATEST_APK_SHA256=61c4683d2e4db2350a702ba940e2292e23b375a0c88429236b186eaf76532467
LATEST_APK_STATIC_ACCEPTANCE=GREEN
LATEST_APK_DEVICE_ACCEPTANCE=NOT_RUN

EXPECTED_DEVICE_OS=Android_14
EXPECTED_DEVICE_BUILD=rk3539_box_32-user_14_UTT2.241219.001
INSTALLATION_METHOD=USB
ADB_REQUIRED=NO

EXPLICIT_NATIVE_REQUEST=MENU_OR_F1
EXPLICIT_NATIVE_LOCK=INFO_OR_F2
AUTOMATIC_STARTUP_PROMPT=NO
AUTOMATIC_STARTUP_UNLOCK=NO
BACKGROUND_LOCK=CONNECTED
SUSPENSION_LOCK=CONNECTED
DESTROY_LOCK=CONNECTED

PIN_BYTES_CROSS_JNI=NO
RAW_DEVICE_KEY_RETURNED_TO_KOTLIN_CALLER=NO
RAW_CAPABILITY_RETURNED_TO_KOTLIN_CALLER=NO
RAW_DEVICE_KEY_RETURNED_TO_WEBVIEW=NO
RAW_CAPABILITY_RETURNED_TO_WEBVIEW=NO
PRIVATE_MATERIAL_EXPORTED=NO

PUBLIC_TAURI_COMMAND_COUNT=8
PUBLIC_PASSPORT_TAURI_COMMAND_ADDED=NO

PHYSICAL_DEVICE_AVAILABLE=NO
CURRENT_BLOCKER=HARDWARE_AVAILABILITY
CURRENT_COMPILER_FAILURE=NONE
CURRENT_STATIC_BOUNDARY_FAILURE=NONE

CODEBUNDLE_REGENERATED=NO
CURRENT_CODEBUNDLE_STALE=YES
RUSTYONIONS_MUTATED=NO

PHASE16_COMPLETE=NO
ANDROID_TV_FORMALLY_COMPLETE=NO
ESTIMATED_ANDROID_TV_IMPLEMENTATION_COMPLETION=90_TO_95_PERCENT

NEXT_ACTION=OBTAIN_ANDROID_TV_BOX_AND_TELEVISION
NEXT_COMMAND=npm_run_tv:native-passport:phase16e3b3c:device-runtime:accept
NEXT_PATCH_AFTER_DEVICE_GREEN=NATIVE_PASSPORT_PHASE16F1_REDACTED_STATUS_SURFACE
```

---

# 30. One-paragraph restart summary

CrabLink TV is a dedicated Tauri Android TV client whose original navigation, gateway, catalog, creator, verified-asset, media playback, Continue Watching, and resource-release phases are complete. Native Passport Phase 16 has implemented Android Keystore material storage, JNI secret handling, replay-safe hydration, delegated authorization, revocation/expiry/scope review, device proof boundaries, one-use verified PIN tickets, native PIN enrollment and confirmation, operational unlock wiring, explicit MENU/F1 enrollment or unlock, INFO/F2 lock, and fail-closed Android lifecycle behavior. All host checks, predecessor boundaries, strict Clippy, fresh ARMv7 compilation, APK checks, native-library matching, and packaged marker checks are green. The latest APK is SHA-256 `61c4683d2e4db2350a702ba940e2292e23b375a0c88429236b186eaf76532467`. Work is paused only because no television or Android TV box is currently available. Resume by installing that APK through USB and running `npm run tv:native-passport:phase16e3b3c:device-runtime:accept`. After prompt/lifecycle acceptance is physically green, implement Phase 16F’s redacted status UI, operational proof, revocation enforcement, forbidden-authority matrix, and final device acceptance. Do not mark Phase 16 or the Android TV build complete before those physical proofs are recorded.

These notes are ready to paste into `ANDROID_TV_NOTES.md` as the authoritative July 31 session handoff.




### END NOTE - JULY 31 2026 - 20:30 CST