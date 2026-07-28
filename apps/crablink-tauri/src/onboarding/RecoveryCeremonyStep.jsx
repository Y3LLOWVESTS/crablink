/**
 * RO:WHAT — React controller for the native-only Passport recovery ceremony.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; onboarding must block until native code truthfully confirms display and acknowledgement.
 * RO:INTERACTS — passportAdapter.js, onboardingRecoveryCeremony.js, onboardingModel.js, onboardingStorage.js, and OnboardingRouteGate.jsx.
 * RO:INVARIANTS — React triggers the no-argument command and receives redacted flags only; current unavailable runtime never advances.
 * RO:METRICS — none.
 * RO:CONFIG — development shell bypass is supplied by the route gate.
 * RO:SECURITY — no secret input, recovery material state, clipboard action, logging, local secret storage, root export, wallet mutation, or ledger mutation.
 * RO:TEST — recoveryCeremony.test.mjs and the focused Rust command tests.
 */

import {
  useState,
} from 'react';

import {
  beginNativePassportRecoveryCeremony,
} from '../adapters/passportAdapter.js';

import {
  ONBOARDING_STATES,
  acknowledgeRecoveryPhrase,
  requireRecoveryPhrase,
} from './onboardingModel.js';

import {
  writeOnboardingState,
} from './onboardingStorage.js';

import {
  ONBOARDING_RECOVERY_CEREMONY_STATUS,
  reviewOnboardingRecoveryCeremonyDto,
  reviewOnboardingRecoveryCeremonyError,
} from './onboardingRecoveryCeremony.js';

const CEREMONY_UI_STATUS =
  Object.freeze({
    READY: 'ready',
    PENDING: 'pending',
    ACKNOWLEDGED: 'acknowledged',
    FAILURE: 'failure',
  });

export default function RecoveryCeremonyStep({
  onboardingState,
  devShellBypassAllowed = false,
  onOpenDevelopmentShell,
  onStateChange,
}) {
  const [
    ceremonyUi,
    setCeremonyUi,
  ] = useState({
    status:
      CEREMONY_UI_STATUS.READY,
    outcome: null,
  });

  const [
    busy,
    setBusy,
  ] = useState(false);

  const publishState =
    async (nextState) => {
      const persisted =
        await writeOnboardingState(
          nextState,
        );

      if (
        typeof onStateChange ===
        'function'
      ) {
        onStateChange(persisted);
      }

      return persisted;
    };

  const beginCeremony =
    async () => {
      if (busy) {
        return;
      }

      setBusy(true);

      setCeremonyUi({
        status:
          CEREMONY_UI_STATUS.PENDING,
        outcome: null,
      });

      try {
        let requiredState =
          onboardingState;

        if (
          requiredState.state ===
          ONBOARDING_STATES
            .PASSPORT_CREATED_LOCKED
        ) {
          requiredState =
            requireRecoveryPhrase(
              requiredState,
            );

          requiredState =
            await publishState(
              requiredState,
            );
        }

        if (
          requiredState.state !==
          ONBOARDING_STATES
            .RECOVERY_PHRASE_REQUIRED
        ) {
          throw new TypeError(
            'Recovery ceremony state is required.',
          );
        }

        const commandDto =
          await beginNativePassportRecoveryCeremony();

        const outcome =
          reviewOnboardingRecoveryCeremonyDto(
            commandDto,
          );

        if (
          outcome.status !==
          ONBOARDING_RECOVERY_CEREMONY_STATUS
            .ACKNOWLEDGED
        ) {
          setCeremonyUi({
            status:
              CEREMONY_UI_STATUS.FAILURE,
            outcome,
          });

          return;
        }

        const acknowledgedState =
          acknowledgeRecoveryPhrase(
            requiredState,
          );

        await publishState(
          acknowledgedState,
        );

        setCeremonyUi({
          status:
            CEREMONY_UI_STATUS
              .ACKNOWLEDGED,
          outcome,
        });
      } catch (error) {
        setCeremonyUi({
          status:
            CEREMONY_UI_STATUS.FAILURE,
          outcome:
            reviewOnboardingRecoveryCeremonyError(
              error,
            ),
        });
      } finally {
        setBusy(false);
      }
    };

  return (
    <main
      className="cl-onboarding-gate"
      data-onboarding-step="recovery-ceremony"
      data-recovery-ceremony-status={
        ceremonyUi.status
      }
    >
      <section className="cl-onboarding-gate__card">
        <p className="cl-onboarding-gate__eyebrow">
          First-run setup
        </p>

        <p className="cl-onboarding-step__counter">
          Recovery
        </p>

        <h1>Secure your Passport recovery</h1>

        <p className="cl-onboarding-step__lead">
          The desktop-native surface must show
          the recoverable information and
          collect your “write it down”
          acknowledgement. React receives only
          redacted completion flags.
        </p>

        <div className="cl-onboarding-recovery__facts">
          <article>
            <strong>Native display only</strong>
            <span>
              Private recovery information must
              never be rendered inside the
              CrabLink WebView.
            </span>
          </article>

          <article>
            <strong>One-time acknowledgement</strong>
            <span>
              Onboarding advances only after
              native code reports both shown and
              acknowledged.
            </span>
          </article>

          <article>
            <strong>No fake backup</strong>
            <span>
              Until real recoverable Passport
              material exists, this step remains
              unavailable rather than displaying
              decorative data.
            </span>
          </article>
        </div>

        <dl className="cl-onboarding-gate__status">
          <div>
            <dt>Passport</dt>
            <dd>
              {onboardingState.passportState}
            </dd>
          </div>

          <div>
            <dt>Onboarding state</dt>
            <dd>
              {onboardingState.state}
            </dd>
          </div>

          <div>
            <dt>Ceremony status</dt>
            <dd>
              {ceremonyUi.status}
            </dd>
          </div>
        </dl>

        {ceremonyUi.status ===
        CEREMONY_UI_STATUS.PENDING ? (
          <p
            className="cl-onboarding-feedback cl-onboarding-feedback--info"
            role="status"
          >
            Waiting for the native recovery
            ceremony.
          </p>
        ) : null}

        {ceremonyUi.status ===
          CEREMONY_UI_STATUS.FAILURE &&
        ceremonyUi.outcome ? (
          <div
            className="cl-onboarding-feedback cl-onboarding-feedback--error"
            role="alert"
          >
            <strong>
              Recovery setup was not completed
            </strong>

            <p>
              {ceremonyUi.outcome.message}
            </p>

            <p>
              Redacted state:{' '}
              <code>
                {ceremonyUi.outcome.code}
              </code>
            </p>
          </div>
        ) : null}

        <button
          className="cl-onboarding-gate__primary"
          type="button"
          disabled={busy}
          onClick={() => {
            void beginCeremony();
          }}
        >
          {busy
            ? 'Waiting for native recovery…'
            : ceremonyUi.status ===
                  CEREMONY_UI_STATUS.FAILURE
              ? 'Retry native recovery ceremony'
              : 'Begin native recovery ceremony'}
        </button>

        {devShellBypassAllowed &&
        typeof onOpenDevelopmentShell ===
          'function' ? (
          <details className="cl-onboarding-shell-dev-tools">
            <summary>
              Development shell tools
            </summary>

            <p>
              This opens the existing shell for
              the current development session.
              It does not acknowledge recovery
              or complete onboarding.
            </p>

            <button
              className="cl-onboarding-gate__secondary"
              type="button"
              onClick={
                onOpenDevelopmentShell
              }
            >
              Development-only bypass: open CrabLink shell
            </button>
          </details>
        ) : null}
      </section>
    </main>
  );
}
