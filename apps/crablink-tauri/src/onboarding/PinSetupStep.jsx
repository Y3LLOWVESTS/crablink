/**
 * RO:WHAT — React controller for native-only Passport PIN confirmation during onboarding.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; onboarding must confirm the created vault can unlock through the platform-native secret surface before profile setup.
 * RO:INTERACTS — onboardingPinSetup.js, onboardingModel.js, onboardingStorage.js, passportAdapter.js, and OnboardingRouteGate.jsx.
 * RO:INVARIANTS — React supplies no PIN argument and renders no PIN field; cancel, rejection, unavailable, and unsafe responses remain blocked.
 * RO:METRICS — none.
 * RO:CONFIG — development shell bypass is supplied by the route gate.
 * RO:SECURITY — only a redacted completion boolean enters onboarding storage; no PIN, VMK, recovery root, private key, wallet, or ledger material enters React.
 * RO:TEST — pinSetupStep.test.mjs and onboardingPinSetup.test.mjs.
 */

import {
  useState,
} from 'react';

import {
  beginNativeOnboardingPinSetup,
  PIN_SETUP_REVIEW_STATES,
} from './onboardingPinSetup.js';

import {
  beginProfileSetup,
  ONBOARDING_STATES,
  recordPinSetupComplete,
  requirePinSetup,
} from './onboardingModel.js';

import {
  writeOnboardingState,
} from './onboardingStorage.js';

const PIN_SETUP_UI_STATUS =
  Object.freeze({
    READY: 'ready',
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILURE: 'failure',
  });

const ACCEPTED_PIN_SETUP_STATES =
  new Set([
    PIN_SETUP_REVIEW_STATES.COMPLETE,
    PIN_SETUP_REVIEW_STATES
      .ALREADY_COMPLETE,
  ]);

export default function PinSetupStep({
  onboardingState,
  devShellBypassAllowed = false,
  onOpenDevelopmentShell,
  onStateChange,
}) {
  const [busy, setBusy] = useState(false);

  const [pinSetupUi, setPinSetupUi] =
    useState({
      status: PIN_SETUP_UI_STATUS.READY,
      message: '',
    });

  const publishState = async (nextState) => {
    const persisted =
      await writeOnboardingState(nextState);

    if (typeof onStateChange === 'function') {
      onStateChange(persisted);
    }

    return persisted;
  };

  const confirmPinSetup = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    setPinSetupUi({
      status: PIN_SETUP_UI_STATUS.PENDING,
      message:
        'Waiting for the platform-native PIN prompt.',
    });

    try {
      let requiredState = onboardingState;

      if (
        requiredState.state ===
        ONBOARDING_STATES
          .RECOVERY_PHRASE_ACKNOWLEDGED
      ) {
        requiredState = requirePinSetup(
          requiredState,
        );

        requiredState = await publishState(
          requiredState,
        );
      }

      if (
        requiredState.state ===
        ONBOARDING_STATES.PIN_SETUP_COMPLETE
      ) {
        const profileState =
          beginProfileSetup(requiredState);

        await publishState(profileState);

        setPinSetupUi({
          status: PIN_SETUP_UI_STATUS.SUCCESS,
          message:
            'PIN setup was already confirmed. Continuing to profile setup.',
        });

        return;
      }

      if (
        requiredState.state !==
        ONBOARDING_STATES.PIN_SETUP_REQUIRED
      ) {
        throw new TypeError(
          'PIN setup required state is missing.',
        );
      }

      const review =
        await beginNativeOnboardingPinSetup();

      if (
        review.pinSetupComplete !== true ||
        !ACCEPTED_PIN_SETUP_STATES.has(
          review.state,
        )
      ) {
        setPinSetupUi({
          status: PIN_SETUP_UI_STATUS.FAILURE,
          message: messageForRejectedReview(
            review,
          ),
        });

        return;
      }

      const completedState =
        recordPinSetupComplete(
          requiredState,
        );

      const persistedCompleteState =
        await publishState(completedState);

      const profileState = beginProfileSetup(
        persistedCompleteState,
      );

      await publishState(profileState);

      setPinSetupUi({
        status: PIN_SETUP_UI_STATUS.SUCCESS,
        message:
          'PIN setup confirmed through the native secure surface.',
      });
    } catch (_error) {
      setPinSetupUi({
        status: PIN_SETUP_UI_STATUS.FAILURE,
        message:
          'Native PIN confirmation did not complete. CrabLink received no secret details.',
      });
    } finally {
      setBusy(false);
    }
  };

  const alreadyConfirmed =
    onboardingState.state ===
    ONBOARDING_STATES.PIN_SETUP_COMPLETE;

  return (
    <main
      className="cl-onboarding-gate"
      data-onboarding-step="pin-setup"
      data-pin-setup-status={
        pinSetupUi.status
      }
    >
      <section className="cl-onboarding-gate__card">
        <p className="cl-onboarding-gate__eyebrow">
          First-run setup
        </p>

        <p className="cl-onboarding-step__counter">
          PIN confirmation
        </p>

        <h1>Confirm your Passport PIN</h1>

        <p className="cl-onboarding-step__lead">
          CrabLink opens the platform-native
          hidden PIN prompt. This page never
          contains a PIN field and receives only
          redacted success or failure status.
        </p>

        <dl className="cl-onboarding-gate__status">
          <div>
            <dt>Passport</dt>
            <dd>
              {onboardingState.passportState}
            </dd>
          </div>

          <div>
            <dt>Recovery acknowledgement</dt>
            <dd>
              {onboardingState
                .recoveryPhraseAcknowledged
                ? 'Recorded'
                : 'Missing'}
            </dd>
          </div>

          <div>
            <dt>PIN setup</dt>
            <dd>
              {onboardingState.pinSetupComplete
                ? 'Confirmed'
                : 'Pending'}
            </dd>
          </div>
        </dl>

        {pinSetupUi.status ===
        PIN_SETUP_UI_STATUS.PENDING ? (
          <p
            className="cl-onboarding-feedback cl-onboarding-feedback--info"
            role="status"
          >
            {pinSetupUi.message}
          </p>
        ) : null}

        {pinSetupUi.status ===
          PIN_SETUP_UI_STATUS.FAILURE ? (
          <div
            className="cl-onboarding-feedback cl-onboarding-feedback--error"
            role="alert"
          >
            <strong>
              PIN setup was not confirmed
            </strong>

            <p>{pinSetupUi.message}</p>
          </div>
        ) : null}

        {pinSetupUi.status ===
          PIN_SETUP_UI_STATUS.SUCCESS ? (
          <p
            className="cl-onboarding-feedback cl-onboarding-feedback--success"
            role="status"
          >
            {pinSetupUi.message}
          </p>
        ) : null}

        <button
          className="cl-onboarding-gate__primary"
          type="button"
          disabled={busy}
          onClick={() => {
            void confirmPinSetup();
          }}
        >
          {busy
            ? 'Waiting for native PIN prompt…'
            : alreadyConfirmed
              ? 'Continue to profile setup'
              : pinSetupUi.status ===
                    PIN_SETUP_UI_STATUS.FAILURE
                ? 'Retry native PIN confirmation'
                : 'Confirm PIN in native prompt'}
        </button>

        <p className="cl-onboarding-gate__notice">
          Cancelled, rejected, unavailable, or
          unsafe native responses leave this step
          incomplete. Only the boolean completion
          status is saved locally.
        </p>

        {devShellBypassAllowed &&
        typeof onOpenDevelopmentShell ===
          'function' ? (
          <details className="cl-onboarding-shell-dev-tools">
            <summary>
              Development shell tools
            </summary>

            <p>
              This opens the existing shell for
              the current development session. It
              does not confirm PIN setup or
              complete onboarding.
            </p>

            <button
              className="cl-onboarding-gate__secondary"
              type="button"
              onClick={onOpenDevelopmentShell}
            >
              Development-only bypass: open CrabLink shell
            </button>
          </details>
        ) : null}
      </section>
    </main>
  );
}

function messageForRejectedReview(review) {
  switch (review?.state) {
    case PIN_SETUP_REVIEW_STATES.CANCELLED:
      return 'The native PIN prompt was cancelled. PIN setup remains incomplete.';
    case PIN_SETUP_REVIEW_STATES.REJECTED:
      return 'The native PIN confirmation was rejected. Check the PIN and try again.';
    case PIN_SETUP_REVIEW_STATES.NO_PASSPORT:
      return 'No local Passport vault is available for PIN confirmation.';
    default:
      return 'Native PIN confirmation is unavailable. PIN setup remains incomplete.';
  }
}
