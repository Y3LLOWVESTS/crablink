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

import DeveloperDisclosure from '../shared/components/DeveloperDisclosure.jsx';

import {
  projectStartupPassportPresentation,
} from './startupPassportPresentation.js';

import {
  STARTUP_PASSPORT_GATE_CODES,
  STARTUP_PASSPORT_GATE_STATES,
  createStartupPassportGateFailure,
  runStartupPassportUnlockAttempt,
} from './startupPassportUnlockGate.js';

const FINAL_BETA_PHASE4A4_STARTUP_LOCK_CLARITY =
  'FINAL_BETA_PHASE4A4_STARTUP_LOCK_CLARITY_V1';

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

  const presentation =
    projectStartupPassportPresentation(
      gateReview,
    );

  return (
    <main
      className="cl-onboarding-gate"
      data-startup-passport-gate={
        gateReview.gateState
      }
      data-startup-passport-code={
        gateReview.code
      }
      data-final-beta-startup-lock={
        FINAL_BETA_PHASE4A4_STARTUP_LOCK_CLARITY
      }
    >
      <section className="cl-onboarding-gate__card">
        <p className="cl-onboarding-gate__eyebrow">
          Passport security
        </p>

        <h1>{presentation.title}</h1>

        <p className="cl-onboarding-step__lead">
          {presentation.lead}
        </p>

        <div className="cl-onboarding-recovery__facts">
          <article>
            <strong>PIN stays private</strong>
            <span>
              PIN entry happens in the native
              desktop prompt, never inside this
              CrabLink page.
            </span>
          </article>

          <article>
            <strong>Protected at startup</strong>
            <span>
              The local Passport must be unlocked
              again when CrabLink starts after a
              restart.
            </span>
          </article>

          <article>
            <strong>CrabLink stays closed</strong>
            <span>
              Cancelling or failing the unlock
              never opens the normal application
              shell.
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

        <dl
          className="cl-onboarding-gate__status"
          aria-label="Passport startup status"
        >
          <div>
            <dt>CrabLink access</dt>
            <dd>
              {presentation.accessLabel}
            </dd>
          </div>

          <div>
            <dt>Local Passport</dt>
            <dd>
              {presentation.passportLabel}
            </dd>
          </div>
        </dl>

        <DeveloperDisclosure
          title="Advanced startup details"
          summary="Redacted startup gate state and result code"
        >
          <dl
            className="cl-onboarding-gate__status"
            aria-label="Advanced startup Passport details"
          >
            <div>
              <dt>Gate state</dt>
              <dd>
                {gateReview.gateState}
              </dd>
            </div>

            <div>
              <dt>Result code</dt>
              <dd>
                {gateReview.code}
              </dd>
            </div>
          </dl>
        </DeveloperDisclosure>

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
              {presentation.actionLabel}
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
            {presentation.actionLabel}
          </button>
        ) : null}
      </section>
    </main>
  );
}
