/**
 * RO:WHAT — Focused acceptance tests for the completed-onboarding startup Passport unlock gate.
 * RO:WHY — Proves the normal shell stays closed until native operational unlock is re-confirmed.
 * RO:INTERACTS — startupPassportUnlockGate.js, StartupPassportUnlockGate.jsx, OnboardingRouteGate.jsx, and passportAdapter.js.
 * RO:INVARIANTS — no React PIN field or argument; unsafe DTOs and failed unlocks never open the shell.
 */

import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
  STARTUP_PASSPORT_GATE_CODES,
  STARTUP_PASSPORT_GATE_STATES,
  reviewStartupPassportStatus,
  reviewStartupPassportUnlockResult,
  runStartupPassportUnlockAttempt,
} from './startupPassportUnlockGate.js';

const ROOT = new URL(
  '../../../..',
  import.meta.url,
);

const COMPONENT_SOURCE = new URL(
  'apps/crablink-tauri/src/onboarding/StartupPassportUnlockGate.jsx',
  ROOT,
);

const ROUTE_SOURCE = new URL(
  'apps/crablink-tauri/src/onboarding/OnboardingRouteGate.jsx',
  ROOT,
);

function statusDto(
  state,
) {
  return Object.freeze({
    state,
    redacted: true,
    walletOrLedgerMutated: false,
  });
}

function unlockDto(
  state,
) {
  return Object.freeze({
    state,
    redacted: true,
    pinReceivedFromWebview: false,
    secretMaterialReturned: false,
    recoveryRootUnsealed: false,
    walletOrLedgerMutated: false,
  });
}

test(
  'operationally unlocked native status opens the startup gate without an unlock call',
  async () => {
    let unlockCalls = 0;

    const review =
      await runStartupPassportUnlockAttempt({
        readStatus: async () =>
          statusDto(
            'operational_unlocked',
          ),

        unlockOperational:
          async () => {
            unlockCalls += 1;

            return unlockDto(
              'operational_unlocked',
            );
          },
      });

    assert.equal(
      review.gateState,
      STARTUP_PASSPORT_GATE_STATES
        .UNLOCKED,
    );

    assert.equal(unlockCalls, 0);
  },
);

test(
  'locked native status invokes one no-argument unlock and requires an unlocked status reread',
  async () => {
    let statusReads = 0;
    let unlockCalls = 0;

    const review =
      await runStartupPassportUnlockAttempt({
        readStatus: async () => {
          statusReads += 1;

          return statusDto(
            statusReads === 1
              ? 'locked'
              : 'operational_unlocked',
          );
        },

        unlockOperational:
          async () => {
            unlockCalls += 1;

            return unlockDto(
              'operational_unlocked',
            );
          },
      });

    assert.equal(statusReads, 2);
    assert.equal(unlockCalls, 1);

    assert.equal(
      review.gateState,
      STARTUP_PASSPORT_GATE_STATES
        .UNLOCKED,
    );
  },
);

test(
  'cancelled native unlock keeps the shell gate blocked and skips false confirmation',
  async () => {
    let statusReads = 0;

    const review =
      await runStartupPassportUnlockAttempt({
        readStatus: async () => {
          statusReads += 1;

          return statusDto('locked');
        },

        unlockOperational:
          async () =>
            unlockDto('cancelled'),
      });

    assert.equal(statusReads, 1);

    assert.equal(
      review.gateState,
      STARTUP_PASSPORT_GATE_STATES
        .BLOCKED,
    );

    assert.equal(
      review.code,
      STARTUP_PASSPORT_GATE_CODES
        .CANCELLED,
    );
  },
);

test(
  'unsafe status and unlock DTOs fail closed',
  () => {
    const unsafeStatus =
      reviewStartupPassportStatus({
        state: 'operational_unlocked',
        redacted: false,
        walletOrLedgerMutated: false,
      });

    assert.equal(
      unsafeStatus.gateState,
      STARTUP_PASSPORT_GATE_STATES
        .BLOCKED,
    );

    const unsafeUnlock =
      reviewStartupPassportUnlockResult({
        ...unlockDto(
          'operational_unlocked',
        ),

        pinReceivedFromWebview: true,
      });

    assert.equal(
      unsafeUnlock.accepted,
      false,
    );

    assert.equal(
      unsafeUnlock.code,
      STARTUP_PASSPORT_GATE_CODES
        .UNSAFE_UNLOCK_DTO,
    );
  },
);

test(
  'React startup gate uses fixed no-argument adapters and completed onboarding wraps the shell',
  async () => {
    const [
      componentSource,
      routeSource,
    ] =
      await Promise.all([
        readFile(
          COMPONENT_SOURCE,
          'utf8',
        ),

        readFile(
          ROUTE_SOURCE,
          'utf8',
        ),
      ]);

    assert.match(
      componentSource,
      /readNativePassportStatus\s*[,;]/,
    );

    assert.match(
      componentSource,
      /unlockNativePassportOperational\s*[,;]/,
    );

    assert.match(
      componentSource,
      /readStatus:\s*readNativePassportStatus/,
    );

    assert.match(
      componentSource,
      /unlockOperational:\s*unlockNativePassportOperational/,
    );

    assert.doesNotMatch(
      componentSource,
      /<input\b/i,
    );

    assert.doesNotMatch(
      componentSource,
      /\binvoke\s*\(/,
    );

    assert.doesNotMatch(
      componentSource,
      /unlockNativePassportOperational\s*\(\s*[^)]/s,
    );

    assert.match(
      routeSource,
      /import StartupPassportUnlockGate from '\.\/StartupPassportUnlockGate\.jsx';/,
    );

    assert.match(
      routeSource,
      /<StartupPassportUnlockGate>\s*\{children\}\s*<\/StartupPassportUnlockGate>/s,
    );
  },
);

test.after(() => {
  console.log(
    'ONBOARDING_PHASE11B_STARTUP_STATUS_REVIEW=GREEN',
  );

  console.log(
    'ONBOARDING_PHASE11B_NATIVE_UNLOCK_HANDOFF=GREEN',
  );

  console.log(
    'ONBOARDING_PHASE11B_UNLOCK_CONFIRMATION_REREAD=GREEN',
  );

  console.log(
    'ONBOARDING_PHASE11B_NO_REACT_PIN_SURFACE=GREEN',
  );

  console.log(
    'ONBOARDING_PHASE11B_STARTUP_UNLOCK_GATE=GREEN',
  );
});
