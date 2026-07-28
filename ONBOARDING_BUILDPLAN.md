# CrabLink Onboarding Buildplan

## Status

This buildplan begins after:

- `NATIVE_PASSPORT_PHASE15_FINAL_ACCEPTANCE=GREEN`
- `PHASE15AG_FINAL_ACCEPTANCE=GREEN`
- desktop Native Passport command bridge accepted
- React Passport drawer accepted
- native Passport commands admitted through the CrabLink Tauri boundary
- no React PIN argument path
- no React seed phrase path
- no root export
- no capability issuance
- no username mutation
- no wallet or ledger mutation

Current goal: prove the clean first-run onboarding flow in the CrabLink desktop app first. After the desktop proof is green, reuse the same state machine and DTO contract for phone, tablet, TV, and other clients.

## Problem

CrabLink currently still has development-era identity artifacts visible or reachable in normal app surfaces:

- dev Passport sessions such as Passport A / Passport B
- visitor/dev labels such as `passport:main:visitor-b`
- baked local dev subject/account fallback such as `passport:main:dev` and `acct_dev`
- current username/profile state that can appear prefilled, such as `@skinnycrabby`
- home/dashboard booting before a real new-user onboarding decision exists
- Passport drawer functionality existing, but not yet organized into a clean first-run user journey

This is wrong for beta. A new user should not inherit project dev identities, dev usernames, dev wallets, cached profile labels, or previous test state. First launch must feel clean and personal: choose username, create local custody Passport, record recovery phrase, set PIN, optionally fill profile, land on home.

## Product goal

When a person opens CrabLink for the first time on a clean install, they should see a simple welcome/onboarding flow:

1. Welcome to CrabLink.
2. Pick a username.
3. Check username availability, with a development-only bypass button.
4. Create local wallet-like Passport.
5. Show recovery phrase / seed phrase one time and require acknowledgement.
6. Ask the user to set a PIN through the native secure surface.
7. Ask the user to fill out a few public profile fields, with skip allowed.
8. Mark onboarding complete.
9. Take the user to `crab://home`.

The first implementation target is the desktop Tauri app. Cross-platform behavior must be designed now, but only desktop needs to be implemented and proven in this buildplan.

## Identity model

CrabLink Passport remains wallet-like local custody:

- no cloud login
- no cloud password account
- no cloud-stored secrets
- no backend custody of Passport secrets
- no backend-issued identity pretending to be source of truth
- no React/WebView custody of PINs, seed phrases, root factors, VMKs, private keys, or recovery material
- backend/gateway may check username availability and later confirm registry/profile truth
- local app may hold a redacted onboarding state and public profile draft

## Security rules

### PIN

The PIN must be captured only through the platform native secure input surface.

React/WebView must never receive:

- PIN
- password
- VMK
- root factor
- private key
- raw seed phrase
- recovery root
- platform sealer material

### Recovery phrase / seed phrase

The user can be shown a recovery phrase, but it must be shown by a native secure recovery surface, not by React.

Desktop proof target:

- Rust/native creates or requests the recovery phrase ceremony.
- Native surface displays the phrase one time.
- Native surface asks user to confirm they wrote it down.
- React receives only a redacted ceremony result:
  - `recoveryPhraseShown: true`
  - `recoveryPhraseAcknowledged: true`
  - optional redacted fingerprint/checksum
  - no phrase words
  - no seed bytes
  - no root material

Future mobile/tablet/TV target:

- same DTO semantics
- platform-specific secure display/input
- TV may use a TV-safe recovery display flow, but still no cloud custody and no React/WebView secret custody

### Username

Username selection is a public/draft identity step, not a secret step.

Allowed:

- React username input
- local username draft
- gateway username availability check
- development-only bypass flag

Not allowed:

- claiming confirmed username ownership without registry/gateway confirmation
- hardcoding `@skinnycrabby` as a default user
- silently selecting Passport A / Passport B / visitor-b
- mutating final username registry in this buildplan unless a later phase explicitly adds and tests that backend path

## Desired first-run state machine

Define a shared onboarding state machine.

States:

- `not_started`
- `welcome`
- `username_entry`
- `username_checking`
- `username_available`
- `username_bypassed_for_dev`
- `passport_create_requested`
- `passport_created_locked`
- `recovery_phrase_required`
- `recovery_phrase_acknowledged`
- `pin_setup_required`
- `pin_setup_complete`
- `profile_setup`
- `profile_skipped`
- `profile_saved`
- `complete`
- `blocked`
- `error`

Minimum redacted persisted state:

```json
{
  "schema": "crablink.onboarding.v1",
  "state": "profile_setup",
  "completed": false,
  "username": "example",
  "usernameAvailability": "available | unavailable | bypassed_for_dev | unknown",
  "devAvailabilityBypassed": false,
  "passportState": "no_passport | created_locked | operational_unlocked | unavailable",
  "recoveryPhraseAcknowledged": false,
  "pinSetupComplete": false,
  "profileSetup": "pending | skipped | saved",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

Never persist:

- PIN
- recovery phrase words
- private key
- seed bytes
- root material
- VMK
- platform sealer material

## Desktop first-run routing behavior

On app boot:

1. Load redacted Native Passport status.
2. Load onboarding state.
3. Load safe public profile draft/cache.
4. If onboarding is incomplete and no explicit dev override is active, route to onboarding.
5. If onboarding is complete, route to `crab://home`.
6. If the app is in dev mode, allow a visible “Skip for dev” or “Bypass availability for dev” control, but mark it clearly as development-only.

The home page must not depend on baked dev identity. It may show an empty/clean state until the user completes onboarding or intentionally bypasses it.

## Cleanup targets

### Must clean from normal new-user path

- `@skinnycrabby`
- Passport A / Passport B as visible normal user choices
- `passport:main:visitor-b`
- implicit default dev Passport subject
- implicit default dev wallet account
- starter ROC grant presented as if it belongs to a real new user
- profile cache automatically making a user look configured
- local catalog/profile state presented as real account state before onboarding

### May remain only behind explicit dev/test boundaries

- dev Passport sessions
- local proof cache smoke data
- starter ROC test grant
- username availability bypass
- route smoke dashboard
- debug Passport drawer test controls
- local reset tools
- fake/test profile fixtures

## Files expected to be touched

Likely desktop React files:

- `apps/crablink-tauri/src/app/App.jsx`
- `apps/crablink-tauri/src/app/appState.js`
- `apps/crablink-tauri/src/app/appContext.js`
- `apps/crablink-tauri/src/app/router.js`
- `apps/crablink-tauri/src/app/shell/Shell.jsx`
- `apps/crablink-tauri/src/app/shell/TopBar.jsx`
- `apps/crablink-tauri/src/app/shell/PassportChip.jsx`
- `apps/crablink-tauri/src/app/shell/PassportDrawer.jsx`
- `apps/crablink-tauri/src/app/shell/PassportSummary.jsx`
- `apps/crablink-tauri/src/pages/home/HomePage.jsx`
- `apps/crablink-tauri/src/pages/profile/ProfileEditor.jsx`
- `apps/crablink-tauri/src/shared/utils/devPassportSessions.js`
- `apps/crablink-tauri/src/shared/utils/localDataReset.js`
- new onboarding files under `apps/crablink-tauri/src/onboarding/` or `apps/crablink-tauri/src/pages/onboarding/`

Likely desktop adapter/platform files:

- `apps/crablink-tauri/src/adapters/passportAdapter.js`
- `apps/crablink-tauri/src/adapters/settingsAdapter.js`
- `apps/crablink-tauri/src/platform/tauriPlatform.js`

Likely Rust/Tauri files later:

- `apps/crablink-tauri/src-tauri/src/commands/passport.rs`
- `apps/crablink-tauri/src-tauri/src/lib.rs`
- `apps/crablink-tauri/src-tauri/src/passport_create_command_runtime.rs`
- `apps/crablink-tauri/src-tauri/src/passport_vault_create_runtime.rs`
- possible new native recovery phrase command/runtime file
- possible onboarding command file if native storage is needed

Likely tests:

- new JS model tests for onboarding state
- source boundary tests for no dev artifacts in first-run path
- source boundary tests for no React PIN/seed phrase
- React source tests for welcome/username/profile flow
- adapter tests for fixed commands only
- Rust tests for native recovery/PIN surfaces if added
- final desktop onboarding acceptance test

## Phases

### Phase 0 — Inventory and baseline proof

Goal: map every baked-in dev identity/default and prove the current leakage points before changing behavior.

Tasks:

- Inventory every occurrence of:
  - `skinnycrabby`
  - `passport:main:visitor`
  - `visitor-b`
  - `passport:main:dev`
  - `acct_dev`
  - Passport A
  - Passport B
  - starter grant defaults
  - dev Passport session labels
- Identify which are legitimate tests/dev fixtures and which leak into normal app runtime.
- Add an inventory source test that documents known dev artifacts without failing yet.
- Add an onboarding buildplan reference test that ensures this plan exists.

Acceptance:

- `ONBOARDING_PHASE0_INVENTORY=GREEN`
- no behavior changed
- no dev artifact removed yet
- clear list of runtime cleanup targets printed

### Phase 1 — Onboarding model foundation

Goal: create the shared onboarding state machine and pure helpers.

Tasks:

- Add `src/onboarding/onboardingModel.js`.
- Add state constants and transition helpers.
- Add local redacted DTO shape.
- Add validators:
  - username syntax
  - username availability status
  - recovery acknowledgement
  - PIN setup completion flag
  - profile skipped/saved
  - completion eligibility
- Add tests beside the model.

Acceptance:

- valid first-run state starts at `welcome`
- complete state requires username decision, Passport created/locked, recovery acknowledged, PIN setup complete, and profile skipped/saved
- model never stores PIN/seed/root/private material
- `ONBOARDING_PHASE1_MODEL=GREEN`

### Phase 2 — Onboarding storage adapter

Goal: persist only safe redacted onboarding state.

Tasks:

- Add local onboarding storage adapter.
- Use existing local storage/platform style where possible.
- Support:
  - read
  - write
  - clear/reset
  - migration from absent state
- Do not persist secrets.
- Add tests for absent state, corrupted state, reset, and redaction.

Acceptance:

- clean install reads as `not_started` or `welcome`
- corrupted state fails safe back to onboarding
- reset clears onboarding state
- no secret-shaped field is accepted
- `ONBOARDING_PHASE2_STORAGE=GREEN`

### Phase 3 — First-run route gate

Goal: route clean installs to onboarding instead of home.

Tasks:

- Add onboarding gate near app boot/shell routing.
- If onboarding incomplete, show onboarding page.
- If onboarding complete, show normal shell/home.
- Add dev override only if explicit and visible.
- Home must not fabricate user identity while onboarding incomplete.

Acceptance:

- clean app starts on onboarding
- completed app starts on home
- explicit dev bypass is visible and marked dev-only
- no silent Passport A/B/visitor fallback
- `ONBOARDING_PHASE3_ROUTE_GATE=GREEN`

### Phase 4 — Welcome and username step

Goal: implement the first visible onboarding screens.

Tasks:

- Add welcome page/component.
- Add username input.
- Add username syntax validation.
- Add availability check adapter placeholder.
- Add development-only bypass button:
  - “Bypass availability for dev”
  - sets `devAvailabilityBypassed: true`
  - does not claim confirmed username ownership
- Add tests.

Acceptance:

- username is user-entered, not baked in
- `@skinnycrabby` is not defaulted
- Passport A/B not presented as identity choices
- bypass is clearly dev-only
- `ONBOARDING_PHASE4_USERNAME=GREEN`

### Phase 5 — Desktop Passport create handoff

Goal: connect onboarding to the accepted Phase 15 native Passport create path.

Tasks:

- Use existing `createNativePassport()`.
- Keep PIN entry native only.
- React must call the adapter without arguments.
- After create, status should become `created_locked` or a redacted failure.
- Add onboarding UI state for create pending/success/failure.

Acceptance:

- no React PIN input
- no create PIN argument
- native command bridge remains fixed
- created Passport is locked
- redacted failure shown on cancel/unavailable
- `ONBOARDING_PHASE5_DESKTOP_CREATE=GREEN`

### Phase 6 — Recovery phrase ceremony

Goal: add the one-time recovery phrase acknowledgement flow without exposing recovery material to React.

Tasks:

- Define recovery ceremony DTO:
  - `schema`
  - `state`
  - `shown`
  - `acknowledged`
  - `redacted`
  - optional redacted checksum/fingerprint
- Add native secure recovery phrase surface for desktop.
- React triggers ceremony but never receives phrase words.
- Add tests proving React/source does not contain or accept phrase words.
- Add native tests if Rust runtime is touched.

Acceptance:

- user can complete “write it down” acknowledgement
- React receives only redacted acknowledgement DTO
- no seed phrase words in React state, props, local storage, or logs
- no root export
- `ONBOARDING_PHASE6_RECOVERY_CEREMONY=GREEN`

### Phase 7 — PIN setup confirmation

Goal: complete PIN setup as a native-only step.

Tasks:

- Reuse native secure PIN input.
- React displays only pending/success/failure.
- PIN setup completion moves onboarding forward.
- Add tests proving no PIN field or PIN argument exists in onboarding React.

Acceptance:

- no WebView PIN input
- native prompt path used
- wrong/cancel/unavailable fails closed
- completion stored only as boolean/redacted status
- `ONBOARDING_PHASE7_PIN_SETUP=GREEN`

### Phase 8 — Profile setup or skip

Goal: collect safe public profile fields or allow skip.

Tasks:

- Add profile setup page.
- Allow minimal fields:
  - display name
  - short bio
  - avatar/local placeholder later
  - optional site label later
- Allow skip.
- Save only public/draft profile fields.
- Do not claim backend-confirmed profile unless actually confirmed.

Acceptance:

- profile can be skipped
- profile can be saved as local draft
- no baked `@skinnycrabby`
- no backend-confirmed claim without gateway truth
- `ONBOARDING_PHASE8_PROFILE=GREEN`

### Phase 9 — Completion and home handoff

Goal: complete onboarding and land on clean home.

Tasks:

- Add completion transition.
- Route to `crab://home`.
- Home should show the chosen local username/draft state honestly.
- Passport chip should no longer show dev visitor or Passport A/B by default.
- Add tests.

Acceptance:

- clean first-run path reaches home
- status remains honest/local until backend confirms
- no dev identity defaults appear in normal completed flow
- `ONBOARDING_PHASE9_HOME_HANDOFF=GREEN`

### Phase 10 — Dev artifact quarantine

Goal: keep dev helpers but make them impossible to confuse with real onboarding.

Tasks:

- Move dev sessions behind explicit dev surface or compile/dev flag.
- Remove Passport A/B from normal Passport drawer.
- Remove starter ROC from new-user presentation unless dev mode is explicit.
- Add boundary tests that normal first-run source does not include visible dev defaults.

Acceptance:

- dev fixtures still available for testing
- new users never see Passport A/B as normal choices
- `@skinnycrabby` not in first-run defaults
- no automatic visitor-b
- `ONBOARDING_PHASE10_DEV_QUARANTINE=GREEN`

### Phase 11 — Desktop final acceptance

Goal: prove the desktop onboarding flow end-to-end.

Tasks:

- Add final source/model acceptance tests.
- Run React build.
- Run Tauri consumer check.
- Run relevant Phase 15 Passport regressions.
- Build app.
- Manually test:
  - welcome
  - username
  - dev bypass
  - Passport create
  - recovery acknowledgement
  - PIN setup
  - profile skip/save
  - home handoff
  - reset and clean first-run again

Acceptance:

- `ONBOARDING_DESKTOP_FINAL_ACCEPTANCE=GREEN`
- app opens to onboarding on clean state
- app opens to home after completion
- no React PIN
- no React seed phrase
- no baked username
- no Passport A/B normal flow
- no wallet/ledger mutation
- no capability issuance
- no fake backend-confirmed username/profile

### Phase 12 — Cross-platform onboarding contract

Goal: freeze the portable onboarding model for TV, phone, and tablet.

Tasks:

- Extract shared onboarding model/DTO if needed.
- Document platform-specific UI:
  - desktop
  - mobile
  - tablet
  - TV
- TV-specific:
  - remote-friendly username entry
  - QR/import path later if needed
  - no companion-device pairing as the default Passport model
- Add shared tests.

Acceptance:

- desktop behavior is reusable
- TV/mobile can implement same state machine
- local custody invariant preserved
- `ONBOARDING_CROSS_PLATFORM_CONTRACT=GREEN`

## Manual desktop test checklist

Start from clean local state.

Expected first launch:

- Welcome screen appears.
- No `@skinnycrabby`.
- No Passport A/B.
- No visitor-b.
- User enters username.
- User can check availability or press dev-only bypass.
- User creates local Passport.
- Native secure surface handles PIN.
- Native recovery surface shows recovery phrase and asks acknowledgement.
- React never shows/stores raw phrase unless a later audited exception intentionally changes this rule.
- Profile form appears.
- User saves or skips.
- App lands on `crab://home`.
- Passport drawer shows honest state.
- Refresh/restart preserves completed onboarding.
- Clear/reset returns to welcome.

## Not in this buildplan unless explicitly added later

- production username registry mutation
- cloud login
- cloud recovery
- server custody
- backend-issued Passport identity
- live wallet calls
- live ledger mutation
- token mint/burn
- staking/liquidity/exchange behavior
- capability issuance
- paid access unlock as part of onboarding
- TV implementation beyond shared contract planning

## Default next patch

Begin with Phase 0:

1. Inventory current baked dev identity artifacts.
2. Add an inventory source test.
3. Print cleanup targets.
4. Do not mutate runtime behavior yet.

Suggested first verification:

```bash
node --test apps/crablink-tauri/src/onboarding/onboardingDevArtifactInventory.source.test.mjs
npm --prefix apps/crablink-tauri run build
```

The first real behavior patch should come only after the inventory test tells us exactly where the dev artifacts live.
