import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  ONBOARDING_CONTRACT_VERSION,
  ONBOARDING_CUSTODY_INVARIANTS,
  ONBOARDING_DTO_FIELDS,
  ONBOARDING_PLATFORM_FAMILIES,
  ONBOARDING_PLATFORM_PORT_METHODS,
  ONBOARDING_PLATFORM_UI_CONTRACT,
  ONBOARDING_SCHEMA,
  ONBOARDING_STATES,
  PASSPORT_STATES,
  PROFILE_SETUP_STATES,
  USERNAME_AVAILABILITY,
  assertOnboardingPlatformFamily,
  assertPortableOnboardingRecord,
  getOnboardingPlatformUiContract,
} from './onboardingContract.js';

const CREATED_AT =
  '2026-07-28T18:00:00.000Z';

const UPDATED_AT =
  '2026-07-28T18:01:00.000Z';

function welcomeRecord() {
  return {
    schema:
      ONBOARDING_SCHEMA,

    state:
      ONBOARDING_STATES.WELCOME,

    completed: false,

    username: '',

    usernameAvailability:
      USERNAME_AVAILABILITY.UNKNOWN,

    devAvailabilityBypassed:
      false,

    passportState:
      PASSPORT_STATES.NO_PASSPORT,

    recoveryPhraseAcknowledged:
      false,

    pinSetupComplete:
      false,

    profileSetup:
      PROFILE_SETUP_STATES.PENDING,

    createdAt:
      CREATED_AT,

    updatedAt:
      CREATED_AT,
  };
}

function completeRecord() {
  return {
    ...welcomeRecord(),

    state:
      ONBOARDING_STATES.COMPLETE,

    completed: true,

    username:
      'portable_crab',

    usernameAvailability:
      USERNAME_AVAILABILITY.AVAILABLE,

    passportState:
      PASSPORT_STATES.CREATED_LOCKED,

    recoveryPhraseAcknowledged:
      true,

    pinSetupComplete:
      true,

    profileSetup:
      PROFILE_SETUP_STATES.SKIPPED,

    updatedAt:
      UPDATED_AT,
  };
}

test(
  'phase12_shared_schema_states_and_fields_are_frozen',
  () => {
    assert.equal(
      ONBOARDING_CONTRACT_VERSION,
      1,
    );

    assert.equal(
      ONBOARDING_SCHEMA,
      'crablink.onboarding.v1',
    );

    assert.ok(
      ONBOARDING_DTO_FIELDS.includes(
        'recoveryPhraseAcknowledged',
      ),
    );

    assert.equal(
      Object.isFrozen(
        ONBOARDING_DTO_FIELDS,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        ONBOARDING_STATES,
      ),
      true,
    );
  },
);

test(
  'phase12_welcome_and_complete_redacted_records_are_portable',
  () => {
    assert.doesNotThrow(
      () =>
        assertPortableOnboardingRecord(
          welcomeRecord(),
        ),
    );

    const complete =
      assertPortableOnboardingRecord(
        completeRecord(),
      );

    assert.equal(
      complete.completed,
      true,
    );

    assert.equal(
      complete.state,
      ONBOARDING_STATES.COMPLETE,
    );
  },
);

test(
  'phase12_secret_or_unknown_fields_are_rejected',
  () => {
    for (const secretField of [
      'pin',
      'recoveryPhrase',
      'seedPhrase',
      'privateKey',
      'rootFactor',
      'vmk',
      'platformSealerMaterial',
    ]) {
      assert.throws(
        () =>
          assertPortableOnboardingRecord({
            ...welcomeRecord(),
            [secretField]:
              'forbidden',
          }),

        /fields do not match/,
      );
    }
  },
);

test(
  'phase12_completion_requires_every_local_onboarding decision',
  () => {
    const base =
      completeRecord();

    for (const patch of [
      {
        username: '',
      },
      {
        usernameAvailability:
          USERNAME_AVAILABILITY.UNKNOWN,
      },
      {
        passportState:
          PASSPORT_STATES.NO_PASSPORT,
      },
      {
        recoveryPhraseAcknowledged:
          false,
      },
      {
        pinSetupComplete:
          false,
      },
      {
        profileSetup:
          PROFILE_SETUP_STATES.PENDING,
      },
    ]) {
      assert.throws(
        () =>
          assertPortableOnboardingRecord({
            ...base,
            ...patch,
          }),
      );
    }
  },
);

test(
  'phase12_every_platform_uses_native_local_custody_ports',
  () => {
    assert.deepEqual(
      Object.values(
        ONBOARDING_PLATFORM_FAMILIES,
      ).sort(),

      [
        'desktop',
        'mobile',
        'tablet',
        'tv',
      ],
    );

    assert.equal(
      ONBOARDING_CUSTODY_INVARIANTS
        .localPassportCustodyRequired,
      true,
    );

    assert.equal(
      ONBOARDING_CUSTODY_INVARIANTS
        .webviewPinCustodyAllowed,
      false,
    );

    assert.equal(
      ONBOARDING_CUSTODY_INVARIANTS
        .webviewRecoveryCustodyAllowed,
      false,
    );

    assert.equal(
      ONBOARDING_CUSTODY_INVARIANTS
        .serverPassportSecretCustodyAllowed,
      false,
    );

    for (const method of [
      'createNativePassport',
      'beginNativeRecoveryCeremony',
      'unlockNativePassportOperational',
      'clearNativePassport',
    ]) {
      assert.ok(
        ONBOARDING_PLATFORM_PORT_METHODS.includes(
          method,
        ),
      );
    }
  },
);

test(
  'phase12_tv_is_remote_friendly_without_default_companion_pairing',
  () => {
    const tv =
      getOnboardingPlatformUiContract(
        assertOnboardingPlatformFamily(
          ONBOARDING_PLATFORM_FAMILIES.TV,
        ),
      );

    assert.equal(
      tv.usernameInputMode,
      'remote_friendly',
    );

    assert.equal(
      tv.recoveryDisplaySurface,
      'tv_safe_native',
    );

    assert.equal(
      tv.companionDeviceRequired,
      false,
    );

    assert.equal(
      tv.qrImportRequired,
      false,
    );

    assert.equal(
      ONBOARDING_PLATFORM_UI_CONTRACT
        .mobile
        .companionDeviceRequired,
      false,
    );
  },
);

test(
  'phase12_shared_contract_has_no_ambient_platform_authority',
  async () => {
    const source =
      await readFile(
        new URL(
          './onboardingContract.js',
          import.meta.url,
        ),
        'utf8',
      );

    for (const forbidden of [
      '@tauri-apps/',
      'chrome.',
      'localStorage',
      'sessionStorage',
      'navigator.',
      'window.',
      'document.',
      'fetch(',
      'invoke(',
      'wallet.spend(',
      'ledger.write(',
    ]) {
      assert.equal(
        source.includes(forbidden),
        false,
        forbidden,
      );
    }
  },
);

console.log(
  'ONBOARDING_PHASE12_SHARED_CONTRACT=GREEN',
);

console.log(
  'ONBOARDING_PHASE12_LOCAL_CUSTODY=GREEN',
);

console.log(
  'ONBOARDING_PHASE12_TV_NO_DEFAULT_PAIRING=GREEN',
);
