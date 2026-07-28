/**
 * RO:WHAT — Final onboarding completion screen that stores the safe completion transition and opens crab://home.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; profile save/skip must become an explicit, restart-safe handoff into the normal CrabLink shell.
 * RO:INTERACTS — onboardingModel.js, onboardingStorage.js, onboardingHomeHandoff.js, app/settings.js, OnboardingRouteGate.jsx, HomePage.jsx, and PassportChip.jsx.
 * RO:INVARIANTS — local username remains unconfirmed; known dev identity labels do not win display; no network call, wallet/ledger mutation, capability issuance, PIN, seed phrase, root, key, or VMK handling.
 * RO:METRICS — none.
 * RO:CONFIG — final route crab://home.
 * RO:SECURITY — only redacted onboarding state and public local-draft display settings are persisted.
 * RO:TEST — onboardingHomeHandoff.test.mjs.
 */

import {
  useState,
} from 'react';

import {
  completeOnboarding,
} from './onboardingModel.js';

import {
  writeOnboardingState,
} from './onboardingStorage.js';

import {
  buildOnboardingHomeSettingsProjection,
  writeCrabLinkHomeRoute,
} from './onboardingHomeHandoff.js';

import {
  loadAppSettings,
  saveAppSettings,
} from '../app/settings.js';

const COMPLETION_UI_STATUS =
  Object.freeze({
    READY: 'ready',
    COMPLETING: 'completing',
    FAILURE: 'failure',
  });

export default function OnboardingCompletionStep({
  onboardingState,
  onStateChange,
}) {
  const [busy, setBusy] =
    useState(false);

  const [completionUi, setCompletionUi] =
    useState({
      status:
        COMPLETION_UI_STATUS.READY,

      message: '',
    });

  const username =
    String(
      onboardingState.username || '',
    )
      .replace(/^@+/, '')
      .trim();

  const profileDecision =
    onboardingState.profileSetup ===
      'saved'
      ? 'Local profile draft saved'
      : 'Profile setup skipped';

  const finishOnboarding =
    async () => {
      if (busy) {
        return;
      }

      setBusy(true);

      setCompletionUi({
        status:
          COMPLETION_UI_STATUS
            .COMPLETING,

        message:
          'Preparing the clean CrabLink home handoff.',
      });

      try {
        const current =
          await loadAppSettings();

        const settingsProjection =
          buildOnboardingHomeSettingsProjection({
            onboardingState,

            currentSettings:
              current.settings,
          });

        await saveAppSettings(
          settingsProjection,
        );

        writeCrabLinkHomeRoute();

        const completedState =
          completeOnboarding(
            onboardingState,
          );

        const persisted =
          await writeOnboardingState(
            completedState,
          );

        if (
          typeof onStateChange ===
          'function'
        ) {
          onStateChange(persisted);
        }
      } catch (_error) {
        setCompletionUi({
          status:
            COMPLETION_UI_STATUS.FAILURE,

          message:
            'CrabLink did not complete the home handoff. Onboarding remains open so you can retry safely.',
        });
      } finally {
        setBusy(false);
      }
    };

  return (
    <main
      className="cl-onboarding-gate"
      data-onboarding-step="completion"
      data-onboarding-completion-status={
        completionUi.status
      }
    >
      <section className="cl-onboarding-gate__card">
        <p className="cl-onboarding-gate__eyebrow">
          First-run setup
        </p>

        <p className="cl-onboarding-step__counter">
          Ready for CrabLink
        </p>

        <h1>
          Your local Passport setup is ready
        </h1>

        <p className="cl-onboarding-step__lead">
          Finish onboarding to open
          crab://home. Your selected username
          remains a local draft until a real
          RustyOnions gateway response confirms
          it.
        </p>

        <dl className="cl-onboarding-gate__status">
          <div>
            <dt>Username</dt>

            <dd>
              @{username} local draft
            </dd>
          </div>

          <div>
            <dt>Passport</dt>

            <dd>
              Created locally
            </dd>
          </div>

          <div>
            <dt>Recovery</dt>

            <dd>
              Acknowledged
            </dd>
          </div>

          <div>
            <dt>PIN setup</dt>

            <dd>
              Confirmed natively
            </dd>
          </div>

          <div>
            <dt>Profile</dt>

            <dd>
              {profileDecision}
            </dd>
          </div>

          <div>
            <dt>Network confirmation</dt>

            <dd>
              Not confirmed
            </dd>
          </div>
        </dl>

        {completionUi.status ===
        COMPLETION_UI_STATUS
          .COMPLETING ? (
          <p
            className="cl-onboarding-feedback cl-onboarding-feedback--info"
            role="status"
          >
            {completionUi.message}
          </p>
        ) : null}

        {completionUi.status ===
        COMPLETION_UI_STATUS.FAILURE ? (
          <p
            className="cl-onboarding-feedback cl-onboarding-feedback--error"
            role="alert"
          >
            {completionUi.message}
          </p>
        ) : null}

        <button
          className="cl-onboarding-gate__primary"
          type="button"
          disabled={busy}
          onClick={() => {
            void finishOnboarding();
          }}
        >
          {busy
            ? 'Opening crab://home…'
            : 'Finish setup and open CrabLink'}
        </button>

        <p className="cl-onboarding-gate__notice">
          This handoff stores only redacted
          onboarding completion and public local
          display labels. It performs no username
          registration, wallet action, ledger
          action, capability issuance, or paid
          access operation.
        </p>
      </section>
    </main>
  );
}
