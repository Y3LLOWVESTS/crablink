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