import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT =
  path.resolve(
    new URL('../../../..', import.meta.url)
      .pathname,
  );

const SCRIPT =
  path.join(
    ROOT,
    'apps/crablink-tauri/scripts/onboarding_phase11c3_signed_desktop_acceptance.sh',
  );

test(
  'Phase 11C3 recorder locks signed build and clear-absence acceptance',
  async () => {
    const source =
      await readFile(
        SCRIPT,
        'utf8',
      );

    for (const required of [
      'VITE_CRABLINK_SIGNED_ONBOARDING_ACCEPTANCE=1',
      'APPLE_SIGNING_IDENTITY="$signing_identity"',
      'CrabLink Local Development Code Signing',
      'codesign',
      '--verify',
      '--deep',
      '--strict',
      'Identifier=com.rustyonions.crablink',
      'com.rustyonions.crablink.native-passport.v1',
      'recovery-root',
      'device-key',
      'ONBOARDING_PHASE11C3_PRECREATE_KEYCHAIN_ABSENCE',
      'Reset completed onboarding and return to Welcome',
      'ONBOARDING_PHASE11C3_POSTCREATE_KEYCHAIN_PRESENCE',
      'ONBOARDING_PHASE11C3_RESTART_PIN_GATE',
      'ONBOARDING_PHASE11C3_RESTART_UNLOCK',
      'ONBOARDING_PHASE11C3_PUBLIC_CLEAR',
      'ONBOARDING_PHASE11C3_POSTCLEAR_KEYCHAIN_ABSENCE',
      'ONBOARDING_PHASE11C3_FINAL_SIGNED_WELCOME',
      'ONBOARDING_DESKTOP_FINAL_ACCEPTANCE=GREEN',
      'NEXT_PATCH=ONBOARDING_PHASE12_CROSS_PLATFORM_CONTRACT',
    ]) {
      assert.ok(
        source.includes(required),
        required,
      );
    }

    assert.doesNotMatch(
      source,
      /security\s+delete-generic-password/,
    );

    assert.doesNotMatch(
      source,
      /find-generic-password[\s\S]{0,80}\s-g(?:\s|$)/,
    );

    for (const forbidden of [
      'wallet mutation performed',
      'ledger mutation performed',
      'capability issued',
      'username ownership confirmed',
      'recovery words entered in terminal',
      'PIN entered in terminal',
    ]) {
      assert.ok(
        !source.includes(forbidden),
        forbidden,
      );
    }
  },
);
