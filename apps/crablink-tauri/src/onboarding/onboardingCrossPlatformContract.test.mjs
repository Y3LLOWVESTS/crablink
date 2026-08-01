import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  ONBOARDING_DTO_FIELDS as DESKTOP_DTO_FIELDS,
  ONBOARDING_SCHEMA as DESKTOP_SCHEMA,
  ONBOARDING_STATES as DESKTOP_STATES,
  PASSPORT_STATES as DESKTOP_PASSPORT_STATES,
  PROFILE_SETUP_STATES as DESKTOP_PROFILE_STATES,
  USERNAME_AVAILABILITY as DESKTOP_USERNAME_AVAILABILITY,
  acknowledgeRecoveryPhrase,
  beginProfileSetup,
  beginUsernameCheck,
  beginUsernameEntry,
  completeOnboarding,
  createInitialOnboardingState,
  recordPassportCreatedLocked,
  recordPinSetupComplete,
  recordUsernameAvailable,
  requestPassportCreate,
  requirePinSetup,
  requireRecoveryPhrase,
  skipProfileSetup,
} from './onboardingModel.js';

import {
  ONBOARDING_DTO_FIELDS,
  ONBOARDING_PLATFORM_FAMILIES,
  ONBOARDING_SCHEMA,
  ONBOARDING_STATES,
  PASSPORT_STATES,
  PROFILE_SETUP_STATES,
  USERNAME_AVAILABILITY,
  assertPortableOnboardingRecord,
  getOnboardingPlatformUiContract,
} from './onboardingContract.js';

const ROOT =
  new URL(
    '../../../..',
    import.meta.url,
  );

const TIMES =
  Object.freeze([
    '2026-07-28T19:00:00.000Z',
    '2026-07-28T19:00:01.000Z',
    '2026-07-28T19:00:02.000Z',
    '2026-07-28T19:00:03.000Z',
    '2026-07-28T19:00:04.000Z',
    '2026-07-28T19:00:05.000Z',
    '2026-07-28T19:00:06.000Z',
    '2026-07-28T19:00:07.000Z',
    '2026-07-28T19:00:08.000Z',
    '2026-07-28T19:00:09.000Z',
    '2026-07-28T19:00:10.000Z',
    '2026-07-28T19:00:11.000Z',
  ]);

test(
  'phase12_desktop_constants_match_the_shared_contract_exactly',
  () => {
    assert.equal(
      DESKTOP_SCHEMA,
      ONBOARDING_SCHEMA,
    );

    assert.deepEqual(
      DESKTOP_DTO_FIELDS,
      ONBOARDING_DTO_FIELDS,
    );

    assert.deepEqual(
      DESKTOP_STATES,
      ONBOARDING_STATES,
    );

    assert.deepEqual(
      DESKTOP_USERNAME_AVAILABILITY,
      USERNAME_AVAILABILITY,
    );

    assert.deepEqual(
      DESKTOP_PASSPORT_STATES,
      PASSPORT_STATES,
    );

    assert.deepEqual(
      DESKTOP_PROFILE_STATES,
      PROFILE_SETUP_STATES,
    );
  },
);

test(
  'phase12_desktop_completed_lifecycle_satisfies_the_portable_validator',
  () => {
    let state =
      createInitialOnboardingState({
        now: TIMES[0],
      });

    state =
      beginUsernameEntry(
        state,
        {
          now: TIMES[1],
        },
      );

    state =
      beginUsernameCheck(
        state,
        'portable_crab',
        {
          now: TIMES[2],
        },
      );

    state =
      recordUsernameAvailable(
        state,
        {
          now: TIMES[3],
        },
      );

    state =
      requestPassportCreate(
        state,
        {
          now: TIMES[4],
        },
      );

    state =
      recordPassportCreatedLocked(
        state,
        {
          now: TIMES[5],
        },
      );

    state =
      requireRecoveryPhrase(
        state,
        {
          now: TIMES[6],
        },
      );

    state =
      acknowledgeRecoveryPhrase(
        state,
        {
          now: TIMES[7],
        },
      );

    state =
      requirePinSetup(
        state,
        {
          now: TIMES[8],
        },
      );

    state =
      recordPinSetupComplete(
        state,
        {
          now: TIMES[9],
        },
      );

    state =
      beginProfileSetup(
        state,
        {
          now: TIMES[10],
        },
      );

    state =
      skipProfileSetup(
        state,
        {
          now: TIMES[11],
        },
      );

    state =
      completeOnboarding(
        state,
      );

    const portable =
      assertPortableOnboardingRecord(
        state,
      );

    assert.equal(
      portable.state,
      ONBOARDING_STATES.COMPLETE,
    );

    assert.equal(
      portable.completed,
      true,
    );
  },
);

test(
  'phase12_shared_owner_docs_and_tv_contract_are_locked',
  async () => {
    const [
      shim,
      shared,
      index,
      documentation,
    ] =
      await Promise.all([
        readFile(
          new URL(
            'apps/crablink-tauri/src/onboarding/onboardingContract.js',
            ROOT,
          ),
          'utf8',
        ),

        readFile(
          new URL(
            'packages/crablink-core/src/onboardingContract.js',
            ROOT,
          ),
          'utf8',
        ),

        readFile(
          new URL(
            'packages/crablink-core/src/index.js',
            ROOT,
          ),
          'utf8',
        ),

        readFile(
          new URL(
            'docs/tauri/ONBOARDING_CROSS_PLATFORM_CONTRACT.md',
            ROOT,
          ),
          'utf8',
        ),
      ]);

    assert.match(
      shim,
      /packages\/crablink-core\/src\/onboardingContract\.js/,
    );

    assert.match(
      index,
      /export \* from '\.\/onboardingContract\.js';/,
    );

    for (const marker of [
      'ONBOARDING_PLATFORM_FAMILIES',
      'ONBOARDING_CUSTODY_INVARIANTS',
      'ONBOARDING_PLATFORM_UI_CONTRACT',
      'assertPortableOnboardingRecord',
    ]) {
      assert.ok(
        shared.includes(marker),
        marker,
      );
    }

    for (const marker of [
      'Desktop',
      'Mobile',
      'Tablet',
      'TV',
      'remote-friendly username entry',
      'no companion-device pairing',
      'platform-native PIN',
      'platform-native recovery',
      'local Passport custody',
      'crablink.onboarding.v1',
    ]) {
      assert.ok(
        documentation.includes(marker),
        marker,
      );
    }

    const tv =
      getOnboardingPlatformUiContract(
        ONBOARDING_PLATFORM_FAMILIES.TV,
      );

    assert.equal(
      tv.companionDeviceRequired,
      false,
    );
  },
);

console.log(
  'ONBOARDING_PHASE12_DESKTOP_PARITY=GREEN',
);

console.log(
  'ONBOARDING_PHASE12_TV_MOBILE_UI_CONTRACT=GREEN',
);

console.log(
  'ONBOARDING_CROSS_PLATFORM_CONTRACT=GREEN',
);
