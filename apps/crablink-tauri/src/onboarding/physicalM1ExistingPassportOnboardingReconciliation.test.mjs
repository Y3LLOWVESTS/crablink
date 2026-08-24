/**
 * RO:WHAT — Focused Physical M1 proof for reconciling incomplete onboarding with an already-existing Native Passport.
 * RO:WHY — Native custody can survive while WebView onboarding state is reset or stale; the app must resume without duplicate creation or fake ceremony success.
 * RO:INTERACTS — onboardingPassportCreate.js, onboardingModel.js, onboardingRecoveryCeremony.js, and PassportCreateStep.jsx.
 * RO:INVARIANTS — creation is allowed only after safe no_passport status; existing custody is read-only proof; stored recovery acknowledgement never claims a new display.
 * RO:SECURITY — no PIN, recovery words, root material, VMK, private key, capability, username ownership, wallet, or ledger mutation.
 * RO:TEST — node --test physicalM1ExistingPassportOnboardingReconciliation.test.mjs.
 */

import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
  ONBOARDING_NATIVE_PASSPORT_PRESENCE,
  ONBOARDING_PASSPORT_CREATE_STATUS,
  createExistingPassportConfirmedOutcome,
  reviewOnboardingNativePassportPresence,
} from './onboardingPassportCreate.js';

import {
  ONBOARDING_RECOVERY_CEREMONY_CODES,
  ONBOARDING_RECOVERY_CEREMONY_STATUS,
  reviewOnboardingRecoveryCeremonyDto,
} from './onboardingRecoveryCeremony.js';

import {
  ONBOARDING_STATES,
  PASSPORT_STATES,
  beginUsernameCheck,
  beginUsernameEntry,
  createInitialOnboardingState,
  isPassportCreated,
  recordExistingPassportForOnboarding,
  recordUsernameAvailable,
  requestPassportCreate,
} from './onboardingModel.js';

function nativeStatus(
  state,
  patch = {},
) {
  return {
    state,
    redacted: true,
    nativeRuntimeReady:
      state ===
      'operational_unlocked',
    readOnly: true,
    unlockPerformed: false,
    platformSealerAccessed: false,
    runtimeIoPerformed: false,
    storageMutated: false,
    walletOrLedgerMutated: false,
    ...patch,
  };
}

function requestedState() {
  let state =
    createInitialOnboardingState({
      now:
        '2026-08-19T07:00:00.000Z',
    });

  state =
    beginUsernameEntry(
      state,
      {
        now:
          '2026-08-19T07:00:01.000Z',
      },
    );

  state =
    beginUsernameCheck(
      state,
      'testmac',
      {
        now:
          '2026-08-19T07:00:02.000Z',
      },
    );

  state =
    recordUsernameAvailable(
      state,
      {
        now:
          '2026-08-19T07:00:03.000Z',
      },
    );

  return requestPassportCreate(
    state,
    {
      now:
        '2026-08-19T07:00:04.000Z',
    },
  );
}

test(
  'native presence allows create only after safe no_passport truth',
  () => {
    const absent =
      reviewOnboardingNativePassportPresence(
        nativeStatus(
          'no_passport',
        ),
      );

    assert.equal(
      absent.state,
      ONBOARDING_NATIVE_PASSPORT_PRESENCE
        .ABSENT,
    );
    assert.equal(
      absent.existing,
      false,
    );
    assert.equal(
      absent.safeToCreate,
      true,
    );

    for (const existingState of [
      'locked',
      'stored_locked',
      'operational_unlocked',
    ]) {
      const existing =
        reviewOnboardingNativePassportPresence(
          nativeStatus(
            existingState,
          ),
        );

      assert.equal(
        existing.existing,
        true,
      );
      assert.equal(
        existing.safeToCreate,
        false,
      );
    }
  },
);

test(
  'unsafe or unknown native status cannot authorize create or reconciliation',
  () => {
    for (const dto of [
      {},
      nativeStatus(
        'root_unlocked',
      ),
      nativeStatus(
        'locked',
        {
          redacted: false,
        },
      ),
      nativeStatus(
        'no_passport',
        {
          nativeRuntimeReady: true,
        },
      ),
      nativeStatus(
        'locked',
        {
          nativeRuntimeReady: true,
        },
      ),
      nativeStatus(
        'operational_unlocked',
        {
          nativeRuntimeReady: false,
        },
      ),
      nativeStatus(
        'no_passport',
        {
          storageMutated: true,
        },
      ),
    ]) {
      const review =
        reviewOnboardingNativePassportPresence(
          dto,
        );

      assert.equal(
        review.state,
        ONBOARDING_NATIVE_PASSPORT_PRESENCE
          .UNAVAILABLE,
      );

      assert.equal(
        review.existing,
        false,
      );

      assert.equal(
        review.safeToCreate,
        false,
      );
    }
  },
);

test(
  'existing locked Passport resumes the recovery route without claiming fresh creation',
  () => {
    const before =
      requestedState();

    const resumed =
      recordExistingPassportForOnboarding(
        before,
        {
          now:
            '2026-08-19T07:00:05.000Z',
        },
      );

    assert.equal(
      resumed.state,
      ONBOARDING_STATES
        .PASSPORT_CREATED_LOCKED,
    );

    assert.equal(
      resumed.passportState,
      PASSPORT_STATES.STORED_LOCKED,
    );

    assert.equal(
      isPassportCreated(
        resumed.passportState,
      ),
      true,
    );

    assert.equal(
      resumed.recoveryPhraseAcknowledged,
      false,
    );

    const outcome =
      createExistingPassportConfirmedOutcome();

    assert.equal(
      outcome.status,
      ONBOARDING_PASSPORT_CREATE_STATUS
        .EXISTING_CONFIRMED,
    );

    assert.equal(
      outcome.nativeSecureInputRequested,
      false,
    );
  },
);

test(
  'durable already_acknowledged recovery truth resumes without repeat display',
  () => {
    const outcome =
      reviewOnboardingRecoveryCeremonyDto({
        state:
          'already_acknowledged',
        shown: false,
        acknowledged: true,
        redacted: true,
        recoveryFingerprint:
          'REDACTED',
        nativeSecureSurfaceRequested:
          false,
        wordsReturnedToWebview: false,
        secretMaterialReturned: false,
        recoveryRootExported: false,
        walletOrLedgerMutated: false,
      });

    assert.equal(
      outcome.status,
      ONBOARDING_RECOVERY_CEREMONY_STATUS
        .ACKNOWLEDGED,
    );

    assert.equal(
      outcome.code,
      ONBOARDING_RECOVERY_CEREMONY_CODES
        .ALREADY_ACKNOWLEDGED,
    );

    assert.equal(
      outcome.shown,
      false,
    );

    assert.equal(
      outcome.acknowledged,
      true,
    );

    assert.equal(
      outcome.nativeSecureSurfaceRequested,
      false,
    );
  },
);

test(
  'PassportCreateStep checks native status before create and rechecks an already_exists race',
  async () => {
    const source =
      await readFile(
        new URL(
          './PassportCreateStep.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    for (const required of [
      'readNativePassportStatus',
      'reviewOnboardingNativePassportPresence',
      'recordExistingPassportForOnboarding',
      'reconcileExistingPassport',
      'initialPresence.safeToCreate',
      'ALREADY_EXISTS',
      'postCreatePresence',
    ]) {
      assert.ok(
        source.includes(
          required,
        ),
        required,
      );
    }

    const createBody =
      source
        .split(
          'const createPassport =',
        )[1];

    assert.ok(
      createBody,
      'createPassport body',
    );

    const firstStatusRead =
      createBody.indexOf(
        'readNativePassportStatus()',
      );

    const createCall =
      createBody.indexOf(
        'createNativePassport()',
      );

    assert.ok(
      firstStatusRead >= 0,
    );

    assert.ok(
      createCall >= 0,
    );

    assert.ok(
      firstStatusRead <
        createCall,
      'native status must be reviewed before native create',
    );

    assert.ok(
      createBody
        .split(
          'readNativePassportStatus()',
        )
        .length - 1 >= 2,
      'already_exists race must re-read native status',
    );

    assert.doesNotMatch(
      source,
      /type=["']password["']/i,
    );

    const effectBody =
      source
        .split(
          'useEffect(() => {',
        )[1]
        ?.split(
          '}, [',
        )[0] || '';

    assert.match(
      effectBody,
      /initialCreateUi\(\s*onboardingState\s*\)/,
      'state rerender must reuse custody-aware UI truth',
    );

    assert.doesNotMatch(
      effectBody,
      /state:\s*['"]created_locked['"]/,
      'state rerender must not synthesize fresh creation truth',
    );

    const initialUiBody =
      source
        .split(
          'function initialCreateUi(',
        )[1] || '';

    const storedLockedBranch =
      initialUiBody.search(
        /PASSPORT_STATES\s*\.\s*STORED_LOCKED/,
      );

    const operationalUnlockedBranch =
      initialUiBody.search(
        /PASSPORT_STATES\s*\.\s*OPERATIONAL_UNLOCKED/,
      );

    const freshCreatedDto =
      initialUiBody.indexOf(
        "state: 'created_locked'",
      );

    assert.ok(
      storedLockedBranch >= 0,
      'stored existing custody branch',
    );

    assert.ok(
      operationalUnlockedBranch >= 0,
      'unlocked existing custody branch',
    );

    assert.ok(
      freshCreatedDto >= 0,
      'fresh creation branch',
    );

    assert.ok(
      storedLockedBranch <
        freshCreatedDto,
      'existing custody must be classified before fresh creation truth',
    );

    assert.ok(
      operationalUnlockedBranch <
        freshCreatedDto,
      'existing unlocked custody must be classified before fresh creation truth',
    );

    assert.match(
      source,
      /Existing local Passport confirmed/,
      'existing custody needs truthful success copy',
    );
  },
);
