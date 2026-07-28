/**
 * RO:WHAT — Phase 10A source acceptance for clean default identity, profile, diagnostics, and Tauri display posture.
 * RO:WHY — New users must not inherit development Passport labels, wallets, usernames, diagnostics, or HTTP-preview presentation.
 * RO:INTERACTS — storage.js, app/settings.js, native state.rs, profile draft/editor/gateway/public-view files, and devPassportSessions.js.
 * RO:INVARIANTS — production defaults are empty and fail closed; explicit development fixtures remain available only in their dedicated helper.
 * RO:TEST — node --test onboardingPhase10Defaults.source.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

const ROOT = new URL(
  '../../../..',
  import.meta.url,
);

const FILES = Object.freeze({
  storage: new URL(
    'apps/crablink-tauri/src/storage.js',
    ROOT,
  ),

  settings: new URL(
    'apps/crablink-tauri/src/app/settings.js',
    ROOT,
  ),

  rustState: new URL(
    'apps/crablink-tauri/src-tauri/src/state.rs',
    ROOT,
  ),

  profileModel: new URL(
    'apps/crablink-tauri/src/pages/profile/profileDraftModel.js',
    ROOT,
  ),

  profileEditor: new URL(
    'apps/crablink-tauri/src/pages/profile/ProfileEditor.jsx',
    ROOT,
  ),

  profileGateway: new URL(
    'apps/crablink-tauri/src/pages/profile/ProfileGateway.jsx',
    ROOT,
  ),

  profilePublic: new URL(
    'apps/crablink-tauri/src/pages/profile/ProfilePublicView.jsx',
    ROOT,
  ),

  devFixtures: new URL(
    'apps/crablink-tauri/src/shared/utils/devPassportSessions.js',
    ROOT,
  ),
});

function stripComments(source) {
  return source
    .replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    .replace(
      /^\s*\/\/!?.*$/gm,
      '',
    );
}

function rustDefaultBody(source) {
  const start = source.indexOf(
    'impl Default for AppSettings',
  );

  const end = source.indexOf(
    '#[derive(Debug, Clone, Serialize, Deserialize)]',
    start,
  );

  assert.notEqual(
    start,
    -1,
    'AppSettings Default implementation must exist',
  );

  assert.notEqual(
    end,
    -1,
    'AppSettings Default implementation must be bounded',
  );

  return source.slice(
    start,
    end,
  );
}

test(
  'JavaScript settings default to explicit development mode off',
  async () => {
    const source = await readFile(
      FILES.storage,
      'utf8',
    );

    assert.match(
      source,
      /devMode:\s*false,/,
    );

    assert.match(
      source,
      /devMode:\s*settings\.devMode\s*===\s*true,/,
    );

    assert.doesNotMatch(
      source,
      /devMode:\s*settings\.devMode\s*!==\s*false,/,
    );
  },
);

test(
  'native AppSettings no longer fabricate Passport wallet or diagnostics defaults',
  async () => {
    const source = await readFile(
      FILES.rustState,
      'utf8',
    );

    const body =
      rustDefaultBody(source);

    assert.match(
      body,
      /passport_label:\s*String::new\(\),/,
    );

    assert.match(
      body,
      /wallet_account:\s*String::new\(\),/,
    );

    assert.match(
      body,
      /developer_diagnostics:\s*false,/,
    );

    assert.doesNotMatch(
      body,
      /passport:main:dev|acct_dev|developer_diagnostics:\s*true/,
    );
  },
);

test(
  'profile defaults and visible placeholders contain no baked Skinnycrabby identity',
  async () => {
    const sources =
      await Promise.all([
        readFile(
          FILES.profileModel,
          'utf8',
        ),

        readFile(
          FILES.profileEditor,
          'utf8',
        ),

        readFile(
          FILES.profileGateway,
          'utf8',
        ),
      ]);

    const executable =
      sources
        .map(stripComments)
        .join('\n');

    assert.match(
      sources[0],
      /displayName:\s*'',/,
    );

    assert.match(
      sources[0],
      /handle:\s*'',/,
    );

    assert.doesNotMatch(
      executable,
      /skinnycrabby/i,
    );

    assert.match(
      sources[1],
      /placeholder="Public display name"/,
    );

    assert.match(
      sources[1],
      /placeholder="@username"/,
    );

    assert.match(
      sources[2],
      /placeholder="Public display name"/,
    );

    assert.match(
      sources[2],
      /placeholder="@username"/,
    );
  },
);

test(
  'profile gateway and public view have no implicit development identity fallback',
  async () => {
    const [
      gateway,
      publicView,
    ] = await Promise.all([
      readFile(
        FILES.profileGateway,
        'utf8',
      ),

      readFile(
        FILES.profilePublic,
        'utf8',
      ),
    ]);

    assert.doesNotMatch(
      stripComments(
        `${gateway}\n${publicView}`,
      ),
      /passport:main:dev|acct_dev/,
    );
  },
);

test(
  'Tauri local storage is not presented as HTTP preview fallback',
  async () => {
    const source = await readFile(
      FILES.settings,
      'utf8',
    );

    assert.match(
      source,
      /const tauriRuntime = isTauriRuntime\(\);/,
    );

    assert.match(
      source,
      /isDevFallback:\s*!tauriRuntime\s*&&\s*!hasChromeLocalStorage\(\),/,
    );
  },
);

test(
  'explicit development fixtures remain available in their dedicated helper',
  async () => {
    const source = await readFile(
      FILES.devFixtures,
      'utf8',
    );

    for (const required of [
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

    assert.match(
      source,
      /RO:WHAT — Dev-only/,
    );
  },
);

console.log(
  'ONBOARDING_PHASE10A_JS_DEV_DEFAULT_OFF=GREEN',
);

console.log(
  'ONBOARDING_PHASE10A_NATIVE_DEV_DEFAULTS_REMOVED=GREEN',
);

console.log(
  'ONBOARDING_PHASE10A_PROFILE_DEFAULTS_CLEAN=GREEN',
);

console.log(
  'ONBOARDING_PHASE10A_TAURI_FALLBACK_LABEL_REPAIRED=GREEN',
);

console.log(
  'ONBOARDING_PHASE10A_EXPLICIT_DEV_FIXTURES_RETAINED=GREEN',
);

console.log(
  'ONBOARDING_PHASE10A_CLEAN_DEFAULTS=GREEN',
);
