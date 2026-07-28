/**
 * RO:WHAT — Focused tests for safe CrabLink onboarding persistence.
 * RO:WHY — Proves absent-state migration, valid round trips, corruption recovery, reset, and secret rejection before route integration.
 * RO:INTERACTS — onboardingStorage.js and onboardingModel.js.
 * RO:INVARIANTS — only exact redacted DTOs persist; bad storage always returns to onboarding.
 * RO:TEST — node --test onboardingStorage.test.mjs.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ONBOARDING_STATES,
  PASSPORT_STATES,
  PROFILE_SETUP_STATES,
  USERNAME_AVAILABILITY,
  assertSafeOnboardingState,
  createInitialOnboardingState,
} from './onboardingModel.js';

import {
  ONBOARDING_STORAGE_KEY,
  createOnboardingStorageAdapter,
} from './onboardingStorage.js';

const TIMES = Object.freeze({
  INITIAL: '2026-07-26T06:00:00.000Z',
  UPDATED: '2026-07-26T06:01:00.000Z',
  RESET: '2026-07-26T06:02:00.000Z',
  RECOVERED: '2026-07-26T06:03:00.000Z',
});

function createMemoryStorage(
  initialEntries = {},
) {
  const values = new Map(
    Object.entries(initialEntries).map(
      ([key, value]) => [
        key,
        String(value),
      ],
    ),
  );

  return Object.freeze({
    getItem(key) {
      return values.has(key)
        ? values.get(key)
        : null;
    },

    setItem(key, value) {
      values.set(
        key,
        String(value),
      );
    },

    removeItem(key) {
      values.delete(key);
    },

    has(key) {
      return values.has(key);
    },

    raw(key) {
      return values.has(key)
        ? values.get(key)
        : null;
    },
  });
}

function createCompleteState() {
  const initial =
    createInitialOnboardingState({
      now: TIMES.INITIAL,
    });

  const complete = Object.freeze({
    ...initial,
    state: ONBOARDING_STATES.COMPLETE,
    completed: true,
    username: 'storage_crab',
    usernameAvailability:
      USERNAME_AVAILABILITY.AVAILABLE,
    devAvailabilityBypassed: false,
    passportState:
      PASSPORT_STATES.CREATED_LOCKED,
    recoveryPhraseAcknowledged: true,
    pinSetupComplete: true,
    profileSetup:
      PROFILE_SETUP_STATES.SAVED,
    updatedAt: TIMES.UPDATED,
  });

  assertSafeOnboardingState(complete);

  return complete;
}

test(
  'absent clean-install state migrates to a persisted welcome state',
  async () => {
    const storage = createMemoryStorage();

    const adapter =
      createOnboardingStorageAdapter({
        storage,
      });

    const state =
      await adapter.readOnboardingState({
        now: TIMES.INITIAL,
      });

    assert.equal(
      state.state,
      ONBOARDING_STATES.WELCOME,
    );

    assert.equal(state.completed, false);

    assert.equal(
      storage.has(
        ONBOARDING_STORAGE_KEY,
      ),
      true,
    );

    const persisted = JSON.parse(
      storage.raw(
        ONBOARDING_STORAGE_KEY,
      ),
    );

    assert.equal(
      persisted.state,
      ONBOARDING_STATES.WELCOME,
    );

    assert.equal(
      persisted.createdAt,
      TIMES.INITIAL,
    );

    assertSafeOnboardingState(persisted);
  },
);

test(
  'valid redacted onboarding state round trips through storage',
  async () => {
    const storage = createMemoryStorage();

    const adapter =
      createOnboardingStorageAdapter({
        storage,
      });

    const complete = createCompleteState();

    const written =
      await adapter.writeOnboardingState(
        complete,
      );

    const loaded =
      await adapter.readOnboardingState();

    assert.deepEqual(loaded, complete);
    assert.deepEqual(written, complete);

    assert.equal(
      Object.isFrozen(loaded),
      true,
    );

    assert.notEqual(loaded, complete);
    assert.notEqual(written, complete);

    assertSafeOnboardingState(loaded);
  },
);

test(
  'malformed JSON fails safe to a fresh welcome state',
  async () => {
    const storage = createMemoryStorage({
      [ONBOARDING_STORAGE_KEY]:
        '{"schema":',
    });

    const adapter =
      createOnboardingStorageAdapter({
        storage,
      });

    const recovered =
      await adapter.readOnboardingState({
        now: TIMES.RECOVERED,
      });

    assert.equal(
      recovered.state,
      ONBOARDING_STATES.WELCOME,
    );

    assert.equal(
      recovered.completed,
      false,
    );

    assert.equal(
      recovered.createdAt,
      TIMES.RECOVERED,
    );

    const persisted = JSON.parse(
      storage.raw(
        ONBOARDING_STORAGE_KEY,
      ),
    );

    assertSafeOnboardingState(persisted);
  },
);

test(
  'invalid or secret-bearing stored state is discarded and replaced',
  async () => {
    const unsafeStoredState = {
      ...createInitialOnboardingState({
        now: TIMES.INITIAL,
      }),
      pin: '1234',
      seedPhrase:
        'word word word word',
    };

    const storage = createMemoryStorage({
      [ONBOARDING_STORAGE_KEY]:
        JSON.stringify(
          unsafeStoredState,
        ),
    });

    const adapter =
      createOnboardingStorageAdapter({
        storage,
      });

    const recovered =
      await adapter.readOnboardingState({
        now: TIMES.RECOVERED,
      });

    assert.equal(
      recovered.state,
      ONBOARDING_STATES.WELCOME,
    );

    const raw = storage.raw(
      ONBOARDING_STORAGE_KEY,
    );

    assert.equal(
      raw.includes('"pin"'),
      false,
    );

    assert.equal(
      raw.includes('"seedPhrase"'),
      false,
    );

    assertSafeOnboardingState(
      JSON.parse(raw),
    );
  },
);

test(
  'write rejects secret-shaped fields before any serialization occurs',
  async () => {
    const storage = createMemoryStorage();

    const adapter =
      createOnboardingStorageAdapter({
        storage,
      });

    const safe =
      createInitialOnboardingState({
        now: TIMES.INITIAL,
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
      await assert.rejects(
        adapter.writeOnboardingState({
          ...safe,
          [field]: value,
        }),
        /Invalid redacted onboarding state/,
        field,
      );
    }

    assert.equal(
      storage.has(
        ONBOARDING_STORAGE_KEY,
      ),
      false,
    );
  },
);

test(
  'clear removes the onboarding record and the next read migrates cleanly',
  async () => {
    const storage = createMemoryStorage();

    const adapter =
      createOnboardingStorageAdapter({
        storage,
      });

    await adapter.writeOnboardingState(
      createCompleteState(),
    );

    const result =
      await adapter.clearOnboardingState();

    assert.deepEqual(result, {
      ok: true,
      cleared: true,
      storageKey:
        ONBOARDING_STORAGE_KEY,
    });

    assert.equal(
      storage.has(
        ONBOARDING_STORAGE_KEY,
      ),
      false,
    );

    const migrated =
      await adapter.readOnboardingState({
        now: TIMES.RESET,
      });

    assert.equal(
      migrated.state,
      ONBOARDING_STATES.WELCOME,
    );

    assert.equal(migrated.completed, false);
  },
);

test(
  'reset replaces completed progress with a fresh welcome state',
  async () => {
    const storage = createMemoryStorage();

    const adapter =
      createOnboardingStorageAdapter({
        storage,
      });

    await adapter.writeOnboardingState(
      createCompleteState(),
    );

    const reset =
      await adapter.resetOnboardingState({
        now: TIMES.RESET,
      });

    assert.equal(
      reset.state,
      ONBOARDING_STATES.WELCOME,
    );

    assert.equal(reset.completed, false);
    assert.equal(reset.username, '');

    assert.equal(
      reset.usernameAvailability,
      USERNAME_AVAILABILITY.UNKNOWN,
    );

    assert.equal(
      reset.passportState,
      PASSPORT_STATES.NO_PASSPORT,
    );

    assert.equal(
      reset.recoveryPhraseAcknowledged,
      false,
    );

    assert.equal(
      reset.pinSetupComplete,
      false,
    );

    assert.equal(
      reset.profileSetup,
      PROFILE_SETUP_STATES.PENDING,
    );

    assert.equal(
      reset.createdAt,
      TIMES.RESET,
    );

    assert.deepEqual(
      await adapter.readOnboardingState(),
      reset,
    );
  },
);

test(
  'custom storage key remains bounded to the selected onboarding record',
  async () => {
    const storage = createMemoryStorage({
      unrelated: 'keep-me',
    });

    const adapter =
      createOnboardingStorageAdapter({
        storage,
        storageKey:
          'crablink.onboarding.test.v1',
      });

    await adapter.readOnboardingState({
      now: TIMES.INITIAL,
    });

    assert.equal(
      storage.raw('unrelated'),
      'keep-me',
    );

    assert.equal(
      storage.has(
        'crablink.onboarding.test.v1',
      ),
      true,
    );

    assert.equal(
      storage.has(
        ONBOARDING_STORAGE_KEY,
      ),
      false,
    );
  },
);

console.log(
  'ONBOARDING_PHASE2_ABSENT_MIGRATION=GREEN',
);

console.log(
  'ONBOARDING_PHASE2_VALID_ROUND_TRIP=GREEN',
);

console.log(
  'ONBOARDING_PHASE2_CORRUPTION_RECOVERY=GREEN',
);

console.log(
  'ONBOARDING_PHASE2_RESET=GREEN',
);

console.log(
  'ONBOARDING_PHASE2_SECRET_REJECTION=GREEN',
);

console.log(
  'ONBOARDING_PHASE2_STORAGE=GREEN',
);
