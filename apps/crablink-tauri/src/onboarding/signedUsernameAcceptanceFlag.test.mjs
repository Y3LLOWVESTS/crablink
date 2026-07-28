/**
 * RO:WHAT — Proves the local signed onboarding acceptance flag exposes only the username availability bypass.
 * RO:WHY — Signed restart acceptance must proceed before live username availability exists without exposing the broad development shell.
 * RO:INTERACTS — OnboardingRouteGate.jsx and WelcomeUsernameStep.jsx.
 * RO:INVARIANTS — official release builds remain unchanged; shell bypass remains tied only to import.meta.env.DEV.
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

const ROUTE_SOURCE = new URL(
  'apps/crablink-tauri/src/onboarding/OnboardingRouteGate.jsx',
  ROOT,
);

const WELCOME_SOURCE = new URL(
  'apps/crablink-tauri/src/onboarding/WelcomeUsernameStep.jsx',
  ROOT,
);

test(
  'signed acceptance flag controls username availability but not shell bypass',
  async () => {
    const [
      routeSource,
      welcomeSource,
    ] = await Promise.all([
      readFile(
        ROUTE_SOURCE,
        'utf8',
      ),

      readFile(
        WELCOME_SOURCE,
        'utf8',
      ),
    ]);

    assert.match(
      routeSource,
      /VITE_CRABLINK_SIGNED_ONBOARDING_ACCEPTANCE/,
    );

    assert.match(
      routeSource,
      /USERNAME_AVAILABILITY_BYPASS_AVAILABLE\s*=\s*DEV_OVERRIDE_AVAILABLE\s*\|\|\s*SIGNED_ONBOARDING_ACCEPTANCE_AVAILABLE/s,
    );

    assert.match(
      routeSource,
      /devAvailabilityBypassAllowed=\{\s*USERNAME_AVAILABILITY_BYPASS_AVAILABLE\s*\}/s,
    );

    assert.match(
      routeSource,
      /developmentShellBypassAllowed=\{\s*DEV_OVERRIDE_AVAILABLE\s*\}/s,
    );

    assert.match(
      welcomeSource,
      /developmentShellBypassAllowed\s*=\s*false/,
    );

    const shellFlagOccurrences = (
      welcomeSource.match(
        /<DevelopmentShellBypass\s+allowed=\{\s*developmentShellBypassAllowed\s*\}/g,
      ) || []
    );

    assert.equal(
      shellFlagOccurrences.length,
      3,
    );

    assert.doesNotMatch(
      welcomeSource,
      /<DevelopmentShellBypass\s+allowed=\{\s*devAvailabilityBypassAllowed\s*\}/,
    );

    assert.match(
      welcomeSource,
      /devAvailabilityBypassAllowed\s*\?\s*\(/,
    );
  },
);

test.after(() => {
  console.log(
    'SIGNED_USERNAME_ACCEPTANCE_FLAG=GREEN',
  );

  console.log(
    'SIGNED_USERNAME_AVAILABILITY_BYPASS=EXPLICIT',
  );

  console.log(
    'SIGNED_DEVELOPMENT_SHELL_BYPASS=BLOCKED',
  );

  console.log(
    'NORMAL_RELEASE_WITHOUT_FLAG=UNCHANGED',
  );
});
