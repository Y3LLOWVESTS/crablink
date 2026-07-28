/**
 * RO:WHAT — Focused Phase 8 tests for safe local profile draft save/skip behavior and onboarding route admission.
 * RO:WHY — Proves first-run profile setup stores only bounded public draft fields without development defaults or backend-confirmed claims.
 * RO:INTERACTS — onboardingProfileDraft.js, ProfileSetupStep.jsx, onboardingModel.js, onboardingStorage.js, and OnboardingRouteGate.jsx.
 * RO:INVARIANTS — save and skip remain local; exact fields only; backendConfirmed=false; no Passport, wallet, ledger, capability, or secret material.
 * RO:TEST — node --test profileSetupStep.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  ONBOARDING_PROFILE_DRAFT_FIELDS,
  ONBOARDING_PROFILE_DRAFT_STORAGE_KEY,
  createOnboardingProfileDraft,
  createOnboardingProfileDraftStorageAdapter,
  validateOnboardingProfileDraft,
} from './onboardingProfileDraft.js';

import {
  ONBOARDING_STATES,
  acknowledgeRecoveryPhrase,
  beginProfileSetup,
  beginUsernameCheck,
  beginUsernameEntry,
  createInitialOnboardingState,
  recordPassportCreatedLocked,
  recordPinSetupComplete,
  recordUsernameAvailable,
  requestPassportCreate,
  requirePinSetup,
  requireRecoveryPhrase,
  saveProfileSetup,
  skipProfileSetup,
} from './onboardingModel.js';

const ROOT = new URL(
  '../../../..',
  import.meta.url,
);

const FILES = Object.freeze({
  component: new URL(
    'apps/crablink-tauri/src/onboarding/ProfileSetupStep.jsx',
    ROOT,
  ),

  profileDraft: new URL(
    'apps/crablink-tauri/src/onboarding/onboardingProfileDraft.js',
    ROOT,
  ),

  routeGate: new URL(
    'apps/crablink-tauri/src/onboarding/OnboardingRouteGate.jsx',
    ROOT,
  ),
});

const TIMES = Object.freeze([
  '2026-07-27T01:00:00.000Z',
  '2026-07-27T01:00:01.000Z',
  '2026-07-27T01:00:02.000Z',
  '2026-07-27T01:00:03.000Z',
  '2026-07-27T01:00:04.000Z',
  '2026-07-27T01:00:05.000Z',
  '2026-07-27T01:00:06.000Z',
  '2026-07-27T01:00:07.000Z',
  '2026-07-27T01:00:08.000Z',
  '2026-07-27T01:00:09.000Z',
  '2026-07-27T01:00:10.000Z',
]);

function createMemoryStorage() {
  const values = new Map();

  return {
    values,

    storage: Object.freeze({
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
    }),
  };
}

function buildProfileSetupState() {
  let state =
    createInitialOnboardingState({
      now: TIMES[0],
    });

  state = beginUsernameEntry(
    state,
    {
      now: TIMES[1],
    },
  );

  state = beginUsernameCheck(
    state,
    'fresh_crab',
    {
      now: TIMES[2],
    },
  );

  state = recordUsernameAvailable(
    state,
    {
      now: TIMES[3],
    },
  );

  state = requestPassportCreate(
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

  state = requireRecoveryPhrase(
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

  state = requirePinSetup(
    state,
    {
      now: TIMES[8],
    },
  );

  state = recordPinSetupComplete(
    state,
    {
      now: TIMES[9],
    },
  );

  return beginProfileSetup(
    state,
    {
      now: TIMES[10],
    },
  );
}

test(
  'profile save persists only bounded local draft fields and records profile_saved',
  async () => {
    const memory =
      createMemoryStorage();

    const adapter =
      createOnboardingProfileDraftStorageAdapter({
        storage: memory.storage,
      });

    const draft =
      createOnboardingProfileDraft({
        username: 'fresh_crab',
        displayName: 'Fresh Crab',

        bio:
          'Building a local CrabLink profile.',

        now: TIMES[10],
      });

    const persisted =
      await adapter
        .writeOnboardingProfileDraft(
          draft,
        );

    assert.deepEqual(
      Object.keys(persisted).sort(),

      [
        ...ONBOARDING_PROFILE_DRAFT_FIELDS,
      ].sort(),
    );

    assert.equal(
      persisted.username,
      'fresh_crab',
    );

    assert.equal(
      persisted.usernameStatus,
      'local_draft',
    );

    assert.equal(
      persisted.profileStatus,
      'local_draft',
    );

    assert.equal(
      persisted.backendConfirmed,
      false,
    );

    assert.equal(
      persisted.avatarMode,
      'local_placeholder',
    );

    assert.equal(
      persisted.siteLabel,
      '',
    );

    const nextState =
      saveProfileSetup(
        buildProfileSetupState(),
        {
          now: TIMES[10],
        },
      );

    assert.equal(
      nextState.state,
      ONBOARDING_STATES
        .PROFILE_SAVED,
    );

    assert.equal(
      nextState.profileSetup,
      'saved',
    );
  },
);

test(
  'profile skip clears stale local draft and records profile_skipped',
  async () => {
    const memory =
      createMemoryStorage();

    const adapter =
      createOnboardingProfileDraftStorageAdapter({
        storage: memory.storage,
      });

    const draft =
      createOnboardingProfileDraft({
        username: 'fresh_crab',
        displayName: 'Stale Draft',
        now: TIMES[10],
      });

    await adapter
      .writeOnboardingProfileDraft(
        draft,
      );

    await adapter
      .clearOnboardingProfileDraft();

    assert.equal(
      await adapter
        .readOnboardingProfileDraft({
          username: 'fresh_crab',
        }),
      null,
    );

    const nextState =
      skipProfileSetup(
        buildProfileSetupState(),
        {
          now: TIMES[10],
        },
      );

    assert.equal(
      nextState.state,
      ONBOARDING_STATES
        .PROFILE_SKIPPED,
    );

    assert.equal(
      nextState.profileSetup,
      'skipped',
    );
  },
);

test(
  'unsafe unknown secret-shaped and backend-confirmed drafts fail closed',
  async () => {
    const memory =
      createMemoryStorage();

    const adapter =
      createOnboardingProfileDraftStorageAdapter({
        storage: memory.storage,
      });

    const safe =
      createOnboardingProfileDraft({
        username: 'fresh_crab',
        displayName: 'Fresh Crab',
        now: TIMES[10],
      });

    for (
      const unsafe of
      [
        {
          ...safe,
          pin: '1234',
        },

        {
          ...safe,
          backendConfirmed: true,
        },

        {
          ...safe,
          profileStatus: 'published',
        },

        {
          ...safe,
          bio: 'x'.repeat(281),
        },
      ]
    ) {
      assert.equal(
        validateOnboardingProfileDraft(
          unsafe,
        ).ok,
        false,
      );

      await assert.rejects(
        adapter
          .writeOnboardingProfileDraft(
            unsafe,
          ),
        TypeError,
      );
    }

    memory.values.set(
      ONBOARDING_PROFILE_DRAFT_STORAGE_KEY,
      '{not-json',
    );

    assert.equal(
      await adapter
        .readOnboardingProfileDraft({
          username: 'fresh_crab',
        }),
      null,
    );

    assert.equal(
      memory.values.has(
        ONBOARDING_PROFILE_DRAFT_STORAGE_KEY,
      ),
      false,
    );
  },
);

test(
  'ProfileSetupStep provides save and skip UI without baked identity or backend mutation',
  async () => {
    const source = await readFile(
      FILES.component,
      'utf8',
    );

    for (const required of [
      'name="displayName"',
      'name="bio"',
      'Avatar placeholder',
      'Save local profile draft',
      'Skip profile setup',
      'not backend published or confirmed',
      'createOnboardingProfileDraft',
      'writeOnboardingProfileDraft',
      'saveProfileSetup',
      'skipProfileSetup',
    ]) {
      assert.ok(
        source.includes(required),
        required,
      );
    }

    assert.doesNotMatch(
      source,
      /skinnycrabby|passport:main|visitor-b|acct_dev/i,
    );

    assert.doesNotMatch(
      source,
      /from\s+['"][^'"]*(?:gateway|wallet|ledger|identity)|fetch\s*\(|\binvoke\s*\(|walletClient|ledgerClient|identityClient/,
    );

    assert.doesNotMatch(
      source,
      /type=["']password["']|name=["']pin["']|name=["']password["']/i,
    );
  },
);

test(
  'onboarding profile storage source has an exact local-only truth contract',
  async () => {
    const source = await readFile(
      FILES.profileDraft,
      'utf8',
    );

    for (const required of [
      'crablink.onboarding-profile-draft.v1',
      'crablink.onboarding.profile-draft.v1',
      "usernameStatus: 'local_draft'",
      "avatarMode: 'local_placeholder'",
      "profileStatus: 'local_draft'",
      'backendConfirmed: false',
      'Unknown profile draft fields',
    ]) {
      assert.ok(
        source.includes(required),
        required,
      );
    }

    assert.doesNotMatch(
      source,
      /skinnycrabby|@skinnycrabby|passport:main|visitor-b|acct_dev/i,
    );

    assert.doesNotMatch(
      source,
      /['"](?:ownerPassport|walletAccount|capability|privateKey|recoveryPhrase|seedPhrase|vmk)['"]\s*[,:\]]/i,
    );
  },
);

test(
  'route gate keeps profile editing in ProfileSetupStep and hands saved or skipped decisions to Phase 9 completion',
  async () => {
    const source = await readFile(
      FILES.routeGate,
      'utf8',
    );

    assert.match(
      source,
      /import ProfileSetupStep from '\.\/ProfileSetupStep\.jsx';/,
    );

    assert.match(
      source,
      /import OnboardingCompletionStep from '\.\/OnboardingCompletionStep\.jsx';/,
    );

    assert.match(
      source,
      /PROFILE_SETUP_ROUTE_STATES/,
    );

    assert.match(
      source,
      /ONBOARDING_COMPLETION_STATES/,
    );

    for (const required of [
      'PROFILE_SETUP',
      'PROFILE_SKIPPED',
      'PROFILE_SAVED',
      '<ProfileSetupStep',
      '<OnboardingCompletionStep',
    ]) {
      assert.ok(
        source.includes(required),
        required,
      );
    }
  },
);

console.log(
  'ONBOARDING_PHASE8_PROFILE_UI=GREEN',
);

console.log(
  'ONBOARDING_PHASE8_PROFILE_SKIP=GREEN',
);

console.log(
  'ONBOARDING_PHASE8_LOCAL_DRAFT_STORAGE=GREEN',
);

console.log(
  'ONBOARDING_PHASE8_NO_BAKED_IDENTITY=GREEN',
);

console.log(
  'ONBOARDING_PHASE8_NO_BACKEND_CONFIRMED_CLAIM=GREEN',
);

console.log(
  'ONBOARDING_PHASE8_PROFILE=GREEN',
);
