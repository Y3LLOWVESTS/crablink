import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  OWN_PROFILE_WORKSPACE_ROUTE,
  resolveOwnProfileHandle,
  synchronizeOwnProfileHandle,
} from './ownProfileIdentity.js';

test('Phase 4A1 keeps crab://profile as the owner workspace route', () => {
  assert.equal(
    OWN_PROFILE_WORKSPACE_ROUTE,
    'crab://profile',
  );
});

test('Phase 4A1 maps the onboarding requested handle into the owner workspace', () => {
  assert.equal(
    resolveOwnProfileHandle({
      settings: {
        requestedHandle: '@rustycreator',
        usernameStatus: 'local_draft',
      },
    }),
    '@rustycreator',
  );
});

test('Phase 4A1 normalizes onboarding requestedUsername without claiming confirmation', () => {
  assert.equal(
    resolveOwnProfileHandle({
      settings: {
        requestedUsername: 'RustyCreator',
        usernameStatus: 'local_draft',
      },
    }),
    '@rustycreator',
  );
});

test('Phase 4A1 prefers the current username truth projection', () => {
  assert.equal(
    resolveOwnProfileHandle({
      usernameTruth: {
        display: '@confirmed',
      },
      settings: {
        requestedHandle: '@draft',
      },
    }),
    '@confirmed',
  );
});

test('Phase 4A1 adopts late settings hydration until the user edits the field', () => {
  assert.equal(
    synchronizeOwnProfileHandle({
      currentHandle: '',
      candidateHandle: '@hydrated',
      manuallyEdited: false,
    }),
    '@hydrated',
  );

  assert.equal(
    synchronizeOwnProfileHandle({
      currentHandle: '@manual',
      candidateHandle: '@hydrated',
      manuallyEdited: true,
    }),
    '@manual',
  );
});

test('Phase 4A1 wires owner identity hydration into ProfileGateway safely', () => {
  const source = readFileSync(
    new URL('./ProfileGateway.jsx', import.meta.url),
    'utf8',
  );

  assert.match(
    source,
    /FINAL_BETA_PHASE4A1_OWN_PROFILE_AUTO_SEED_V1/,
  );

  assert.match(
    source,
    /resolveOwnProfileHandle\(\{/,
  );

  assert.match(
    source,
    /synchronizeOwnProfileHandle\(\{/,
  );

  assert.match(
    source,
    /requestedHandleEditedRef\.current = true/,
  );

  assert.match(
    source,
    /onChange=\{handleRequestedHandleChange\}/,
  );
});
