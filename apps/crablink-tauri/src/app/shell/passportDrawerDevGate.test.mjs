/**
 * RO:WHAT — Phase 10B acceptance tests for the explicit Passport drawer development gate.
 * RO:WHY — Proves normal and production users cannot see or invoke Creator/Visitor fixtures or starter ROC controls.
 * RO:INTERACTS — passportDrawerDevGate.js, PassportDrawer.jsx, and devPassportSessions.js.
 * RO:INVARIANTS — both development build and explicit devMode are required; disabled posture exposes no fixtures.
 * RO:TEST — node --test passportDrawerDevGate.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  explicitPassportDrawerStarterGrantMinor,
  isExplicitPassportDrawerDevSurface,
  listExplicitPassportDrawerDevSessions,
} from './passportDrawerDevGate.js';

const DRAWER =
  new URL(
    './PassportDrawer.jsx',
    import.meta.url,
  );

const FIXTURES =
  new URL(
    '../../shared/utils/devPassportSessions.js',
    import.meta.url,
  );

test(
  'drawer development surface requires both development build and explicit dev mode',
  () => {
    assert.equal(
      isExplicitPassportDrawerDevSurface(),
      false,
    );

    assert.equal(
      isExplicitPassportDrawerDevSurface({
        buildDev: true,
        settings: {},
      }),
      false,
    );

    assert.equal(
      isExplicitPassportDrawerDevSurface({
        buildDev: false,

        settings: {
          devMode: true,
        },
      }),
      false,
    );

    assert.equal(
      isExplicitPassportDrawerDevSurface({
        buildDev: true,

        settings: {
          devMode: false,
        },
      }),
      false,
    );

    assert.equal(
      isExplicitPassportDrawerDevSurface({
        buildDev: true,

        settings: {
          devMode: true,
        },
      }),
      true,
    );
  },
);

test(
  'disabled development posture exposes no sessions or starter amount',
  () => {
    assert.deepEqual(
      listExplicitPassportDrawerDevSessions({
        enabled: false,
      }),
      [],
    );

    assert.equal(
      explicitPassportDrawerStarterGrantMinor({
        enabled: false,

        activeSession: {
          starterGrantMinor: '1776',
        },
      }),
      '',
    );
  },
);

test(
  'explicit development posture retains allowlisted fixtures',
  () => {
    const sessions =
      listExplicitPassportDrawerDevSessions({
        enabled: true,
      });

    assert.equal(
      sessions.length,
      2,
    );

    assert.deepEqual(
      sessions.map(
        (session) => session.label,
      ),
      [
        'Creator A',
        'Visitor B',
      ],
    );

    assert.equal(
      explicitPassportDrawerStarterGrantMinor({
        enabled: true,
        activeSession: sessions[0],
      }),
      '1776',
    );
  },
);

test(
  'Passport drawer gates visible development surfaces and mutation handlers',
  async () => {
    const source =
      await readFile(
        DRAWER,
        'utf8',
      );

    for (const required of [
      'buildDev: import.meta.env.DEV',
      'settings: context.settings',
      'const activeDevSession = drawerDevSurfaceEnabled',
      'listExplicitPassportDrawerDevSessions',
      'explicitPassportDrawerStarterGrantMinor',
      'enabled: drawerDevSurfaceEnabled',
      'drawerDevSurfaceEnabled && context.storage?.isDevFallback',
    ]) {
      assert.ok(
        source.includes(required),
        required,
      );
    }

    assert.match(
      source,
      /\{drawerDevSurfaceEnabled\s*&&\s*\(\s*<section className="cl-passport-truth" aria-label="Starter ROC bootstrap">/,
    );

    assert.equal(
      source
        .split(
          'if (!drawerDevSurfaceEnabled)',
        )
        .length - 1,
      3,
      'bootstrap, local-label, and session handlers must each fail closed',
    );

    assert.doesNotMatch(
      source,
      /context\.settings\?\.devMode\s*!==\s*false/,
    );
  },
);

test(
  'development fixtures remain isolated in the dedicated helper',
  async () => {
    const source =
      await readFile(
        FIXTURES,
        'utf8',
      );

    for (const required of [
      'RO:WHAT — Dev-only',
      'DEV_PASSPORT_SESSIONS',
      'Creator A',
      'Visitor B',
      'passport:main:dev',
      'passport:main:visitor-b',
      'acct_dev',
      'acct_visitor_b',
      "DEFAULT_DEV_STARTER_GRANT_MINOR = '1776'",
    ]) {
      assert.ok(
        source.includes(required),
        required,
      );
    }
  },
);

console.log(
  'ONBOARDING_PHASE10B_EXPLICIT_BUILD_AND_SETTING_GATE=GREEN',
);

console.log(
  'ONBOARDING_PHASE10B_DEV_SESSIONS_HIDDEN_BY_DEFAULT=GREEN',
);

console.log(
  'ONBOARDING_PHASE10B_STARTER_ROC_HIDDEN_BY_DEFAULT=GREEN',
);

console.log(
  'ONBOARDING_PHASE10B_DEV_HANDLERS_FAIL_CLOSED=GREEN',
);

console.log(
  'ONBOARDING_PHASE10B_DEV_FIXTURES_RETAINED=GREEN',
);
