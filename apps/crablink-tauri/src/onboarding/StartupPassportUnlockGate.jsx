/**
 * RO:WHAT — Startup gate that verifies or obtains native operational Passport unlock before mounting the completed CrabLink shell.
 * RO:WHY — Completed onboarding alone must not bypass the native locked-vault boundary after an application restart.
 * RO:INTERACTS — passportAdapter.js, startupPassportUnlockGate.js, onboardingPassportAbsenceReset.js, and OnboardingRouteGate.jsx.
 * RO:INVARIANTS — native status is rechecked after unlock; React supplies no PIN or secret argument; failed unlocks remain closed; confirmed Passport absence can reset only redacted local onboarding state.
 * RO:TEST — startupPassportUnlockGate.test.mjs, onboardingPassportAbsenceReset.test.mjs, and the React production build.
 */

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  readNativePassportStatus,
  unlockNativePassportOperational,
} from '../adapters/passportAdapter.js';

import {
  resetCompletedOnboardingAfterNativePassportAbsence,
} from './onboardingPassportAbsenceReset.js';

import {
  STARTUP_PASSPORT_GATE_CODES,
  STARTUP_PASSPORT_GATE_STATES,
  createStartupPassportGateFailure,
  runStartupPassportUnlockAttempt,
} from './startupPassportUnlockGate.js';

let sharedStartupUnlockAttempt = null;

function beginSharedStartupUnlockAttempt() {
  if (!sharedStartupUnlockAttempt) {
    sharedStartupUnlockAttempt =
      runStartupPassportUnlockAttempt({
        readStatus:
          readNativePassportStatus,

        unlockOperational:
          unlockNativePassportOperational,
      });
  }

  return sharedStartupUnlockAttempt;
}

function resetSharedStartupUnlockAttempt() {
  sharedStartupUnlockAttempt = null;
}

export default function StartupPassportUnlockGate({
  children,
}) {
  const [
    gateReview,
    setGateReview,
  ] = useState(() => ({
    gateState:
      STARTUP_PASSPORT_GATE_STATES
        .CHECKING,

    code:
      STARTUP_PASSPORT_GATE_CODES
        .CHECKING,

    message:
      'Checking the local native Passport lock state.',
  }));

  const runAttempt =
    useCallback(
      async ({
        forceNewAttempt = false,
      } = {}) => {
        if (forceNewAttempt) {
          resetSharedStartupUnlockAttempt();
        }

        setGateReview({
          gateState:
            STARTUP_PASSPORT_GATE_STATES
              .CHECKING,

          code:
            STARTUP_PASSPORT_GATE_CODES
              .CHECKING,

          message:
            'Checking the local Passport. A native PIN prompt opens only when required.',
        });

        try {
          const review =
            await beginSharedStartupUnlockAttempt();

          setGateReview(review);
        } catch (_error) {
          setGateReview(
            createStartupPassportGateFailure(),
          );
        }
      },
      [],
    );

  const resetAbsentPassportOnboarding =
    useCallback(
      async () => {
        setGateReview({
          gateState:
            STARTUP_PASSPORT_GATE_STATES
              .CHECKING,

          code:
            STARTUP_PASSPORT_GATE_CODES
              .CHECKING,

          message:
            'Resetting redacted local onboarding state after confirmed Passport absence.',
        });

        try {
          await resetCompletedOnboardingAfterNativePassportAbsence();

          resetSharedStartupUnlockAttempt();

          const reload =
            globalThis.location?.reload;

          if (
            typeof reload !==
            'function'
          ) {
            throw new Error(
              'Browser reload is unavailable.',
            );
          }

          reload.call(
            globalThis.location,
          );
        } catch (_error) {
          setGateReview({
            gateState:
              STARTUP_PASSPORT_GATE_STATES
                .BLOCKED,

            code:
              'passport_absence_reset_failed',

            message:
              'CrabLink could not reset the completed onboarding record. Native Passport custody remains absent and the shell remains closed.',
          });
        }
      },
      [],
    );

  useEffect(() => {
    void runAttempt();
  }, [runAttempt]);

  if (
    gateReview.gateState ===
    STARTUP_PASSPORT_GATE_STATES
      .UNLOCKED
  ) {
    return children;
  }

  const checking =
    gateReview.gateState ===
    STARTUP_PASSPORT_GATE_STATES
      .CHECKING;

  const passportAbsenceResetAvailable =
    gateReview.code ===
      STARTUP_PASSPORT_GATE_CODES
        .NO_PASSPORT ||
    gateReview.code ===
      'passport_absence_reset_failed';

  return (
    <main
      className="cl-onboarding-gate"
      data-startup-passport-gate={
        gateReview.gateState
      }
      data-startup-passport-code={
        gateReview.code
      }
    >
      <section className="cl-onboarding-gate__card">
        <p className="cl-onboarding-gate__eyebrow">
          Local Passport security
        </p>

        <h1>Unlock your Passport</h1>

        <p className="cl-onboarding-step__lead">
          CrabLink keeps the normal application
          shell closed until native code confirms
          that your locally stored Passport is
          operationally unlocked.
        </p>

        <div className="cl-onboarding-recovery__facts">
          <article>
            <strong>Native PIN surface</strong>
            <span>
              PIN entry remains outside React and
              is never sent through a WebView
              command argument.
            </span>
          </article>

          <article>
            <strong>Restart protection</strong>
            <span>
              Completing onboarding does not
              bypass the locked-vault boundary on
              later application starts.
            </span>
          </article>

          <article>
            <strong>Fail closed</strong>
            <span>
              Cancelled, rejected, malformed, or
              unavailable unlock results keep the
              CrabLink shell closed.
            </span>
          </article>
        </div>

        <p
          className={
            checking
              ? 'cl-onboarding-feedback cl-onboarding-feedback--info'
              : 'cl-onboarding-feedback cl-onboarding-feedback--error'
          }
          role={
            checking
              ? 'status'
              : 'alert'
          }
          aria-live="polite"
        >
          {gateReview.message}
        </p>

        <dl className="cl-onboarding-gate__status">
          <div>
            <dt>Gate state</dt>
            <dd>
              {gateReview.gateState}
            </dd>
          </div>

          <div>
            <dt>Redacted result</dt>
            <dd>
              {gateReview.code}
            </dd>
          </div>
        </dl>

        {!checking &&
        passportAbsenceResetAvailable ? (
          <>
            <p className="cl-onboarding-gate__notice">
              Native Passport custody is already
              absent. This action clears only
              local settings, profile drafts,
              caches, and completed onboarding
              display state before returning to
              Welcome.
            </p>

            <button
              className="cl-onboarding-gate__primary"
              type="button"
              data-onboarding-passport-absence-reset="available"
              onClick={() => {
                void resetAbsentPassportOnboarding();
              }}
            >
              Reset completed onboarding and return to Welcome
            </button>
          </>
        ) : !checking ? (
          <button
            className="cl-onboarding-gate__primary"
            type="button"
            onClick={() => {
              void runAttempt({
                forceNewAttempt: true,
              });
            }}
          >
            Retry native Passport unlock
          </button>
        ) : null}
      </section>
    </main>
  );
}
