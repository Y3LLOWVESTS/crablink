import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FINAL_BETA_PHASE5A1_EXPLICIT_DEVELOPER_SURFACE,
  getDeveloperSurfacePosture,
  isExplicitDeveloperSurface,
} from './developerSurfaceMode.js';

import {
  isExplicitPassportDrawerDevSurface,
} from './shell/passportDrawerDevGate.js';

test('Phase 5A1 shared developer surface marker is locked', () => {
  assert.equal(
    FINAL_BETA_PHASE5A1_EXPLICIT_DEVELOPER_SURFACE,
    'FINAL_BETA_PHASE5A1_EXPLICIT_DEVELOPER_SURFACE_V1',
  );
});

test('Phase 5A1 hides developer surfaces by default', () => {
  assert.equal(
    isExplicitDeveloperSurface(),
    false,
  );

  assert.deepEqual(
    getDeveloperSurfacePosture(),
    {
      enabled: false,
      buildEligible: false,
      explicitlyEnabled: false,
      releaseVisible: false,
      label: 'Developer tools hidden',
    },
  );
});

test('Phase 5A1 requires both development build and explicit devMode', () => {
  assert.equal(
    isExplicitDeveloperSurface({
      buildDev: true,
      settings: {},
    }),
    false,
  );

  assert.equal(
    isExplicitDeveloperSurface({
      buildDev: false,
      settings: {
        devMode: true,
      },
    }),
    false,
  );

  assert.equal(
    isExplicitDeveloperSurface({
      buildDev: true,
      settings: {
        devMode: false,
      },
    }),
    false,
  );

  assert.equal(
    isExplicitDeveloperSurface({
      buildDev: true,
      settings: {
        devMode: true,
      },
    }),
    true,
  );
});

test('Phase 5A1 release posture fails closed with stale dev settings', () => {
  const posture =
    getDeveloperSurfacePosture({
      buildDev: false,
      settings: {
        devMode: true,
      },
    });

  assert.equal(
    posture.enabled,
    false,
  );

  assert.equal(
    posture.buildEligible,
    false,
  );

  assert.equal(
    posture.explicitlyEnabled,
    true,
  );

  assert.equal(
    posture.releaseVisible,
    false,
  );
});

test('Phase 5A1 Passport fixture visibility delegates to the shared contract', () => {
  const cases = [
    {
      buildDev: false,
      settings: {},
    },
    {
      buildDev: true,
      settings: {},
    },
    {
      buildDev: false,
      settings: {
        devMode: true,
      },
    },
    {
      buildDev: true,
      settings: {
        devMode: true,
      },
    },
  ];

  for (const value of cases) {
    assert.equal(
      isExplicitPassportDrawerDevSurface(value),
      isExplicitDeveloperSurface(value),
    );
  }
});
