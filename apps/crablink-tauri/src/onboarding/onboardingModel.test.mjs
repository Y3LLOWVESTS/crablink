/**
 * RO:WHAT — Focused tests for the CrabLink onboarding model.
 * RO:WHY — Proves the redacted first-run state machine before storage, routing, native commands, and UI integration.
 * RO:INTERACTS — onboardingModel.js and shared username validation.
 * RO:INVARIANTS — completion requires every onboarding decision; unknown secret fields reject.
 * RO:TEST — node --test onboardingModel.test.mjs.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ONBOARDING_DTO_FIELDS,
  ONBOARDING_SCHEMA,
  ONBOARDING_STATES,
  PASSPORT_STATES,
  PROFILE_SETUP_STATES,
  USERNAME_AVAILABILITY,
  acknowledgeRecoveryPhrase,
  assertSafeOnboardingState,
  beginProfileSetup,
  beginUsernameCheck,
  beginUsernameEntry,
  bypassUsernameForDev,
  canCompleteOnboarding,
  completeOnboarding,
  createInitialOnboardingState,
  getOnboardingCompletionEligibility,
  isPassportCreated,
  isPinSetupComplete,
  isProfileSetupComplete,
  isRecoveryAcknowledged,
  isUsernameAvailabilityStatus,
  recordPassportCreatedLocked,
  recordPinSetupComplete,
  recordUsernameAvailable,
  recordUsernameUnavailable,
  requestPassportCreate,
  requirePinSetup,
  requireRecoveryPhrase,
  saveProfileSetup,
  skipProfileSetup,
  validateOnboardingState,
  validateOnboardingUsername,
} from './onboardingModel.js';

const TIMES = Object.freeze([
  '2026-07-26T05:00:00.000Z',
  '2026-07-26T05:01:00.000Z',
  '2026-07-26T05:02:00.000Z',
  '2026-07-26T05:03:00.000Z',
  '2026-07-26T05:04:00.000Z',
  '2026-07-26T05:05:00.000Z',
  '2026-07-26T05:06:00.000Z',
  '2026-07-26T05:07:00.000Z',
  '2026-07-26T05:08:00.000Z',
  '2026-07-26T05:09:00.000Z',
  '2026-07-26T05:10:00.000Z',
  '2026-07-26T05:11:00.000Z',
  '2026-07-26T05:12:00.000Z',
]);

function buildProfileSetupState({
  devBypass = false,
} = {}) {
  let state =
    createInitialOnboardingState({
      now: TIMES[0],
    });

  state = beginUsernameEntry(state, {
    now: TIMES[1],
  });

  if (devBypass) {
    state = bypassUsernameForDev(
      state,
      'dev_crab',
      { now: TIMES[2] },
    );
  } else {
    state = beginUsernameCheck(
      state,
      '@New_Crab',
      { now: TIMES[2] },
    );

    state = recordUsernameAvailable(state, {
      now: TIMES[3],
    });
  }

  state = requestPassportCreate(state, {
    now: TIMES[4],
  });

  state = recordPassportCreatedLocked(
    state,
    { now: TIMES[5] },
  );

  state = requireRecoveryPhrase(state, {
    now: TIMES[6],
  });

  state = acknowledgeRecoveryPhrase(
    state,
    { now: TIMES[7] },
  );

  state = requirePinSetup(state, {
    now: TIMES[8],
  });

  state = recordPinSetupComplete(state, {
    now: TIMES[9],
  });

  return beginProfileSetup(state, {
    now: TIMES[10],
  });
}

test(
  'valid first-run state starts at welcome with an exact redacted DTO',
  () => {
    const state =
      createInitialOnboardingState({
        now: TIMES[0],
      });

    assert.equal(
      state.schema,
      ONBOARDING_SCHEMA,
    );

    assert.equal(
      state.state,
      ONBOARDING_STATES.WELCOME,
    );

    assert.equal(state.completed, false);
    assert.equal(state.username, '');

    assert.equal(
      state.usernameAvailability,
      USERNAME_AVAILABILITY.UNKNOWN,
    );

    assert.equal(
      state.passportState,
      PASSPORT_STATES.NO_PASSPORT,
    );

    assert.equal(
      state.recoveryPhraseAcknowledged,
      false,
    );

    assert.equal(
      state.pinSetupComplete,
      false,
    );

    assert.equal(
      state.profileSetup,
      PROFILE_SETUP_STATES.PENDING,
    );

    assert.deepEqual(
      new Set(Object.keys(state)),
      new Set(ONBOARDING_DTO_FIELDS),
    );

    assert.equal(
      Object.isFrozen(state),
      true,
    );

    assert.deepEqual(
      validateOnboardingState(state),
      {
        ok: true,
        errors: [],
      },
    );
  },
);

test(
  'validators normalize username syntax and reject false completion posture',
  () => {
    const valid =
      validateOnboardingUsername(
        '@Crabby_7',
      );

    assert.equal(valid.ok, true);

    assert.equal(
      valid.normalized,
      'crabby_7',
    );

    assert.equal(
      validateOnboardingUsername('ab').ok,
      false,
    );

    assert.equal(
      isUsernameAvailabilityStatus(
        USERNAME_AVAILABILITY.AVAILABLE,
      ),
      true,
    );

    assert.equal(
      isUsernameAvailabilityStatus(
        'confirmed',
      ),
      false,
    );

    assert.equal(
      isRecoveryAcknowledged(true),
      true,
    );

    assert.equal(
      isRecoveryAcknowledged('true'),
      false,
    );

    assert.equal(
      isPinSetupComplete(true),
      true,
    );

    assert.equal(
      isPinSetupComplete(1),
      false,
    );

    assert.equal(
      isProfileSetupComplete(
        PROFILE_SETUP_STATES.SKIPPED,
      ),
      true,
    );

    assert.equal(
      isProfileSetupComplete(
        PROFILE_SETUP_STATES.SAVED,
      ),
      true,
    );

    assert.equal(
      isProfileSetupComplete(
        PROFILE_SETUP_STATES.PENDING,
      ),
      false,
    );

    assert.equal(
      isPassportCreated(
        PASSPORT_STATES.CREATED_LOCKED,
      ),
      true,
    );

    assert.equal(
      isPassportCreated(
        PASSPORT_STATES.NO_PASSPORT,
      ),
      false,
    );
  },
);

test(
  'normal username availability path reaches complete only after every required decision',
  () => {
    let state = buildProfileSetupState();

    assert.equal(
      state.state,
      ONBOARDING_STATES.PROFILE_SETUP,
    );

    assert.equal(
      canCompleteOnboarding(state),
      false,
    );

    assert.deepEqual(
      getOnboardingCompletionEligibility(
        state,
      ).missing,
      ['profile_setup_decision'],
    );

    state = skipProfileSetup(state, {
      now: TIMES[11],
    });

    assert.equal(
      canCompleteOnboarding(state),
      true,
    );

    state = completeOnboarding(state, {
      now: TIMES[12],
    });

    assert.equal(
      state.state,
      ONBOARDING_STATES.COMPLETE,
    );

    assert.equal(state.completed, true);
    assert.equal(state.username, 'new_crab');

    assert.equal(
      state.usernameAvailability,
      USERNAME_AVAILABILITY.AVAILABLE,
    );

    assert.equal(
      state.passportState,
      PASSPORT_STATES.CREATED_LOCKED,
    );

    assert.equal(
      state.recoveryPhraseAcknowledged,
      true,
    );

    assert.equal(
      state.pinSetupComplete,
      true,
    );

    assert.equal(
      state.profileSetup,
      PROFILE_SETUP_STATES.SKIPPED,
    );

    assert.deepEqual(
      validateOnboardingState(state),
      {
        ok: true,
        errors: [],
      },
    );
  },
);

test(
  'development bypass stays explicit and never claims confirmed availability',
  () => {
    let state = buildProfileSetupState({
      devBypass: true,
    });

    assert.equal(
      state.username,
      'dev_crab',
    );

    assert.equal(
      state.usernameAvailability,
      USERNAME_AVAILABILITY
        .BYPASSED_FOR_DEV,
    );

    assert.equal(
      state.devAvailabilityBypassed,
      true,
    );

    assert.notEqual(
      state.usernameAvailability,
      USERNAME_AVAILABILITY.AVAILABLE,
    );

    state = saveProfileSetup(state, {
      now: TIMES[11],
    });

    state = completeOnboarding(state, {
      now: TIMES[12],
    });

    assert.equal(state.completed, true);

    assert.equal(
      state.profileSetup,
      PROFILE_SETUP_STATES.SAVED,
    );
  },
);

test(
  'unavailable username returns to entry without permitting Passport creation',
  () => {
    let state =
      createInitialOnboardingState({
        now: TIMES[0],
      });

    state = beginUsernameEntry(state, {
      now: TIMES[1],
    });

    state = beginUsernameCheck(
      state,
      'taken_name',
      { now: TIMES[2] },
    );

    state = recordUsernameUnavailable(
      state,
      { now: TIMES[3] },
    );

    assert.equal(
      state.state,
      ONBOARDING_STATES.USERNAME_ENTRY,
    );

    assert.equal(
      state.usernameAvailability,
      USERNAME_AVAILABILITY.UNAVAILABLE,
    );

    assert.throws(
      () => requestPassportCreate(state),
      /Cannot request Passport creation/,
    );
  },
);

test(
  'completion eligibility identifies every missing first-run requirement',
  () => {
    const state =
      createInitialOnboardingState({
        now: TIMES[0],
      });

    assert.deepEqual(
      getOnboardingCompletionEligibility(
        state,
      ).missing,
      [
        'username_decision',
        'passport_created',
        'recovery_phrase_acknowledged',
        'pin_setup_complete',
        'profile_setup_decision',
      ],
    );

    assert.equal(
      canCompleteOnboarding(state),
      false,
    );

    assert.throws(
      () => completeOnboarding(state),
      /Cannot complete onboarding/,
    );
  },
);

test(
  'unknown and secret-bearing fields are rejected instead of persisted',
  () => {
    const safe =
      createInitialOnboardingState({
        now: TIMES[0],
      });

    const forbiddenFields = [
      ['pin', '1234'],
      ['password', 'secret'],
      ['seedPhrase', 'word word word'],
      ['mnemonic', 'word word word'],
      ['recoveryWords', ['word']],
      ['rootFactor', 'root'],
      ['recoveryRoot', 'root'],
      ['privateKey', 'key'],
      ['secretKey', 'key'],
      ['vmk', 'key'],
      ['platformSealerMaterial', 'key'],
    ];

    for (const [field, value] of
      forbiddenFields) {
      const candidate = {
        ...safe,
        [field]: value,
      };

      const validation =
        validateOnboardingState(candidate);

      assert.equal(
        validation.ok,
        false,
        field,
      );

      assert.match(
        validation.errors.join(','),
        /unknown_fields/,
        field,
      );

      assert.throws(
        () =>
          assertSafeOnboardingState(
            candidate,
          ),
        /Invalid redacted onboarding state/,
        field,
      );
    }

    const serialized = JSON.stringify(safe);

    for (const [field] of forbiddenFields) {
      assert.equal(
        serialized.includes(`"${field}"`),
        false,
        field,
      );
    }
  },
);

test(
  'ordered transitions fail closed when earlier decisions are absent',
  () => {
    const initial =
      createInitialOnboardingState({
        now: TIMES[0],
      });

    assert.throws(
      () => requestPassportCreate(initial),
      /Cannot request Passport creation/,
    );

    assert.throws(
      () => recordPassportCreatedLocked(initial),
      /Cannot record locked Passport creation/,
    );

    assert.throws(
      () => requireRecoveryPhrase(initial),
      /Cannot require recovery phrase ceremony/,
    );

    assert.throws(
      () => requirePinSetup(initial),
      /Cannot require PIN setup/,
    );

    assert.throws(
      () => beginProfileSetup(initial),
      /Cannot begin profile setup/,
    );
  },
);

console.log(
  'ONBOARDING_PHASE1_FIRST_RUN_STATE=GREEN',
);

console.log(
  'ONBOARDING_PHASE1_USERNAME_VALIDATION=GREEN',
);

console.log(
  'ONBOARDING_PHASE1_COMPLETION_ELIGIBILITY=GREEN',
);

console.log(
  'ONBOARDING_PHASE1_SECRET_FIELD_REJECTION=GREEN',
);

console.log(
  'ONBOARDING_PHASE1_ORDERED_TRANSITIONS=GREEN',
);

console.log(
  'ONBOARDING_PHASE1_MODEL=GREEN',
);
