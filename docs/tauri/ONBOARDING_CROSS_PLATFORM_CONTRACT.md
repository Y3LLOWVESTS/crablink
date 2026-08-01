# CrabLink Cross-Platform Onboarding Contract

## Status

This document is the normative portable onboarding boundary established after
the signed CrabLink desktop acceptance completed successfully.

Contract owner:

```text
packages/crablink-core/src/onboardingContract.js
```

Desktop compatibility path:

```text
apps/crablink-tauri/src/onboarding/onboardingContract.js
```

Schema:

```text
crablink.onboarding.v1
```

## Shared product model

Every CrabLink client uses the same wallet-like Passport posture:

```text
local Passport custody
platform-native PIN
platform-native recovery
redacted onboarding progress
optional local public profile draft
honest local username draft
no cloud login
no server secret custody
no backend-issued identity authority
no wallet or ledger mutation during onboarding
no capability issuance during onboarding
```

The state and DTO constants are owned by `@crablink/core`. Individual clients
must not create parallel onboarding schemas, state labels, Passport labels, or
completion rules.

## Portable lifecycle

The canonical progression is:

```text
welcome
→ username_entry
→ username_checking
→ username_available
  or username_bypassed_for_dev
→ passport_create_requested
→ passport_created_locked
→ recovery_phrase_required
→ recovery_phrase_acknowledged
→ pin_setup_required
→ pin_setup_complete
→ profile_setup
→ profile_saved or profile_skipped
→ complete
```

`blocked` and `error` remain fail-closed states. They do not imply completion.

## Redacted DTO

The only portable persisted onboarding record is:

```json
{
  "schema": "crablink.onboarding.v1",
  "state": "profile_setup",
  "completed": false,
  "username": "example",
  "usernameAvailability": "available",
  "devAvailabilityBypassed": false,
  "passportState": "created_locked",
  "recoveryPhraseAcknowledged": true,
  "pinSetupComplete": true,
  "profileSetup": "pending",
  "createdAt": "2026-07-28T00:00:00.000Z",
  "updatedAt": "2026-07-28T00:01:00.000Z"
}
```

Unknown fields fail validation. This prevents PIN, recovery phrase, seed, root,
VMK, private-key, or platform-sealer material from entering the shared record.

## Platform adapter ports

Each client supplies platform-owned implementations for:

```text
readNativePassportStatus
createNativePassport
beginNativeRecoveryCeremony
unlockNativePassportOperational
clearNativePassport
readOnboardingState
writeOnboardingState
resetOnboardingState
```

The shared contract does not invoke Tauri, Android, iOS, browser, Keychain,
Secret Service, DPAPI, wallet, ledger, gateway, or registry APIs directly.

## Platform presentation contract

| Platform | Username/profile input | PIN | Recovery | Pairing posture |
|---|---|---|---|---|
| Desktop | Keyboard and pointer | platform-native PIN | platform-native recovery | no companion-device pairing |
| Mobile | Touch keyboard | platform-native PIN | platform-native recovery | no companion-device pairing |
| Tablet | Touch or keyboard | platform-native PIN | platform-native recovery | no companion-device pairing |
| TV | remote-friendly username entry; profile may be skipped | platform-native PIN | TV-safe platform-native recovery | no companion-device pairing |

A later explicit import or QR feature may be added, but it is not required for
normal Passport creation, local unlock, or local recovery acknowledgement.

## TV rules

CrabLink TV inherits the same Passport model as desktop:

- remote-friendly username entry;
- local Passport creation and import surfaces;
- platform-native secret handling;
- no PIN through React/WebView;
- no recovery words through React/WebView;
- no cloud login;
- no server custody;
- no required companion device;
- no automatic pairing as the default identity model.

The TV application may adapt layout, focus navigation, and text-entry controls.
It must not alter the state machine, DTO, custody rules, or completion
requirements.

## Completion requirements

A completed record requires all of the following:

```text
accepted username decision
created local Passport
recovery acknowledgement
native PIN setup completion
saved or skipped profile decision
state = complete
completed = true
```

Username and profile truth remain local drafts until separately confirmed by
the appropriate backend or registry path.

## Authority boundaries

This contract does not authorize:

```text
username registry mutation
profile publication
wallet calls
ledger mutation
capability issuance
paid unlock
cloud recovery
server custody
token minting or burning
staking
liquidity
exchange behavior
bridge settlement
```

## Acceptance

Phase 12 is green only when:

```text
shared contract tests pass
desktop constants match the shared owner
desktop completed lifecycle passes the portable validator
desktop/mobile/tablet/TV presentation contracts are present
TV requires no companion-device pairing
local custody invariants remain locked
React production build passes
release Cargo check passes
```
