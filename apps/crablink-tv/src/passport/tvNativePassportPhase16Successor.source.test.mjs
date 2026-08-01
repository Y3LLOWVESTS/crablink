/**
 * RO:WHAT — Locks the completed CrabLink TV Phase 11 successor to Native
 * Passport Phase 16.
 *
 * RO:WHY — The abandoned library-playback successor must not displace the
 * active delegated Passport workstream.
 *
 * RO:INVARIANTS — marker and package wiring only; no TV runtime, UI,
 * Android Keystore, device key, pairing execution, proof, or capability.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

const ROOT =
  new URL(
    '../../../..',
    import.meta.url,
  );

async function read(relativePath) {
  return readFile(
    new URL(
      relativePath,
      ROOT,
    ),
    'utf8',
  );
}

test(
  'phase16a1_phase11_points_to_native_passport_phase16',
  async () => {
    const source =
      await read(
        'scripts/check-crablink-tv-phase11-acceptance-boundary.mjs',
      );

    assert.match(
      source,
      /NEXT_PHASE=NATIVE_PASSPORT_PHASE16_TV_DELEGATED_INTEGRATION/,
    );

    assert.doesNotMatch(
      source,
      /NEXT_PHASE=PHASE12_TV_LIBRARY_POLISH_AND_PLAYBACK_INTEGRATION/,
    );
  },
);

test(
  'phase16a1_shared_contract_preserves_tv_local_custody',
  async () => {
    const source =
      await read(
        'packages/crablink-core/src/onboardingContract.js',
      );

    for (const marker of [
      'ONBOARDING_PLATFORM_FAMILIES',
      'ONBOARDING_CUSTODY_INVARIANTS',
      'ONBOARDING_PLATFORM_UI_CONTRACT',
      'localPassportCustodyRequired',
      'companionDeviceRequired',
      'tv_safe_native',
    ]) {
      assert.ok(
        source.includes(marker),
        marker,
      );
    }
  },
);

test(
  'phase16a1_package_scripts_lock_the_successor_boundary',
  async () => {
    const [
      tvPackage,
      rootPackage,
    ] =
      await Promise.all([
        read(
          'apps/crablink-tv/package.json',
        ),

        read(
          'package.json',
        ),
      ]);

    const tv =
      JSON.parse(tvPackage);

    const root =
      JSON.parse(rootPackage);

    assert.equal(
      tv.scripts[
        'test:native-passport-phase16-successor'
      ],

      'node --test src/passport/tvNativePassportPhase16Successor.source.test.mjs',
    );

    assert.equal(
      tv.scripts[
        'check:native-passport-phase16-successor'
      ],

      'node ../../scripts/check-crablink-tv-native-passport-phase16-successor-boundary.mjs',
    );

    assert.match(
      tv.scripts.check,
      /npm run test:native-passport-phase16-successor && npm run check:native-passport-phase16-successor/,
    );

    assert.equal(
      root.scripts[
        'tv:native-passport:phase16:successor:test'
      ],

      'npm --prefix apps/crablink-tv run test:native-passport-phase16-successor',
    );

    assert.equal(
      root.scripts[
        'tv:native-passport:phase16:successor:check'
      ],

      'node scripts/check-crablink-tv-native-passport-phase16-successor-boundary.mjs',
    );
  },
);

test(
  'phase16a1_codebundle_covers_the_new_successor_surfaces',
  async () => {
    const source =
      await read(
        'scripts/make_codebundle.sh',
      );

    for (const path of [
      'apps/crablink-tv/src/passport/tvNativePassportPhase16Successor.source.test.mjs',
      'scripts/check-crablink-tv-native-passport-phase16-successor-boundary.mjs',
    ]) {
      assert.ok(
        source.includes(path),
        path,
      );
    }
  },
);
