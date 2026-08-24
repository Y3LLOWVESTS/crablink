/**
 * RO:WHAT — Desktop onboarding step that either resumes verified existing Native Passport custody or creates a new Passport through the native adapter.
 * RO:WHY — Onboarding must not become stuck or attempt duplicate custody creation when localStorage and native Passport state diverge.
 * RO:INTERACTS — passportAdapter.js, onboardingPassportCreate.js, onboardingModel.js, onboardingStorage.js, OnboardingRouteGate.jsx.
 * RO:INVARIANTS — read-only native status is checked before creation; create runs only after confirmed no_passport; existing custody advances only from verified locked/unlocked native status; failures remain redacted.
 * RO:METRICS — none.
 * RO:CONFIG — development shell bypass is supplied by the outer route gate.
 * RO:SECURITY — no PIN input, password input, secret prop, recovery material, root, private key, VMK, capability, wallet, or ledger authority.
 * RO:TEST — passportCreateStep.test.mjs, physicalM1ExistingPassportOnboardingReconciliation.test.mjs, and the existing Phase 15 Passport acceptance tests.
 */

import {
  useEffect,
  useState,
} from 'react';

import {
  createNativePassport,
  readNativePassportStatus,
} from '../adapters/passportAdapter.js';

import {
  ONBOARDING_STATES,
  PASSPORT_STATES,
  recordExistingPassportForOnboarding,
  recordPassportCreatedLocked,
  requestPassportCreate,
} from './onboardingModel.js';

import {
  writeOnboardingState,
} from './onboardingStorage.js';

import {
  ONBOARDING_PASSPORT_CREATE_CODES,
  ONBOARDING_PASSPORT_CREATE_STATUS,
  createExistingPassportConfirmedOutcome,
  createRedactedPassportCreateFailure,
  reviewOnboardingNativePassportPresence,
  reviewOnboardingPassportCreateError,
  reviewOnboardingPassportCreateResult,
} from './onboardingPassportCreate.js';

const CREATE_UI_STATUS = Object.freeze({
  READY: 'ready',
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILURE: 'failure',
});

export default function PassportCreateStep({
  onboardingState,
  devShellBypassAllowed = false,
  onOpenDevelopmentShell,
  onStateChange,
}) {
  const [
    createUi,
    setCreateUi,
  ] = useState(() =>
    initialCreateUi(onboardingState),
  );

  const [
    busy,
    setBusy,
  ] = useState(false);

  useEffect(() => {
    if (
      onboardingState.state ===
      ONBOARDING_STATES
        .PASSPORT_CREATED_LOCKED
    ) {
      setCreateUi(
        initialCreateUi(onboardingState),
      );
    }
  }, [
    onboardingState.passportState,
    onboardingState.state,
  ]);

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

  const reconcileExistingPassport =
    async (
      requestedState,
      presence,
    ) => {
      const existingState =
        recordExistingPassportForOnboarding(
          requestedState,
          {
            operationalUnlocked:
              presence
                .operationalUnlocked,
          },
        );

      await publishState(
        existingState,
      );

      setCreateUi({
        status:
          CREATE_UI_STATUS.SUCCESS,
        outcome:
          createExistingPassportConfirmedOutcome({
            operationalUnlocked:
              presence
                .operationalUnlocked,
          }),
      });
    };

  const createPassport =
    async () => {
      if (busy) {
        return;
      }

      setBusy(true);

      setCreateUi({
        status: CREATE_UI_STATUS.PENDING,
        outcome: null,
      });

      try {
        let requestedState =
          onboardingState;

        if (
          onboardingState.state ===
            ONBOARDING_STATES
              .USERNAME_AVAILABLE ||
          onboardingState.state ===
            ONBOARDING_STATES
              .USERNAME_BYPASSED_FOR_DEV
        ) {
          requestedState =
            requestPassportCreate(
              onboardingState,
            );

          requestedState =
            await publishState(
              requestedState,
            );
        }

        if (
          requestedState.state !==
          ONBOARDING_STATES
            .PASSPORT_CREATE_REQUESTED
        ) {
          throw new TypeError(
            'Passport create request state is required.',
          );
        }

        const initialPresence =
          reviewOnboardingNativePassportPresence(
            await readNativePassportStatus(),
          );

        if (
          initialPresence.existing
        ) {
          await reconcileExistingPassport(
            requestedState,
            initialPresence,
          );

          return;
        }

        if (
          !initialPresence.safeToCreate
        ) {
          setCreateUi({
            status:
              CREATE_UI_STATUS.FAILURE,
            outcome:
              createRedactedPassportCreateFailure(
                ONBOARDING_PASSPORT_CREATE_CODES
                  .UNAVAILABLE,
              ),
          });

          return;
        }

        const commandResult =
          await createNativePassport();

        const outcome =
          reviewOnboardingPassportCreateResult(
            commandResult,
          );

        if (
          outcome.code ===
          ONBOARDING_PASSPORT_CREATE_CODES
            .ALREADY_EXISTS
        ) {
          const postCreatePresence =
            reviewOnboardingNativePassportPresence(
              await readNativePassportStatus(),
            );

          if (
            postCreatePresence.existing
          ) {
            await reconcileExistingPassport(
              requestedState,
              postCreatePresence,
            );

            return;
          }
        }

        if (
          outcome.status !==
          ONBOARDING_PASSPORT_CREATE_STATUS
            .CREATED_LOCKED
        ) {
          setCreateUi({
            status:
              CREATE_UI_STATUS.FAILURE,
            outcome,
          });

          return;
        }

        const createdState =
          recordPassportCreatedLocked(
            requestedState,
          );

        await publishState(createdState);

        setCreateUi({
          status: CREATE_UI_STATUS.SUCCESS,
          outcome,
        });
      } catch (error) {
        setCreateUi({
          status: CREATE_UI_STATUS.FAILURE,
          outcome:
            reviewOnboardingPassportCreateError(
              error,
            ),
        });
      } finally {
        setBusy(false);
      }
    };

  const createdLocked =
    onboardingState.state ===
    ONBOARDING_STATES
      .PASSPORT_CREATED_LOCKED;

  const existingConfirmed =
    createUi.outcome?.status ===
    ONBOARDING_PASSPORT_CREATE_STATUS
      .EXISTING_CONFIRMED;

  return (
    <main
      className="cl-onboarding-gate"
      data-onboarding-step="passport-create"
      data-passport-create-status={
        createUi.status
      }
    >
      <section className="cl-onboarding-gate__card">
        <p className="cl-onboarding-gate__eyebrow">
          First-run setup
        </p>

        <p className="cl-onboarding-step__counter">
          Local Passport
        </p>

        <h1>Create your local Passport</h1>

        <p className="cl-onboarding-step__lead">
          CrabLink will open the reviewed
          desktop-native secure input surface.
          Private input stays outside React and
          is never passed as a WebView argument.
        </p>

        <div className="cl-onboarding-passport-create__facts">
          <article>
            <strong>Native secure input</strong>
            <span>
              The desktop application owns the
              secure create prompt.
            </span>
          </article>

          <article>
            <strong>Created locked</strong>
            <span>
              Successful creation stores an
              encrypted local Passport and
              leaves it locked.
            </span>
          </article>

          <article>
            <strong>Redacted result only</strong>
            <span>
              React receives status flags, not
              secrets, recovery roots, vault
              bytes, keys, or wallet authority.
            </span>
          </article>
        </div>

        <dl className="cl-onboarding-gate__status">
          <div>
            <dt>Username draft</dt>
            <dd>
              @{onboardingState.username}
            </dd>
          </div>

          <div>
            <dt>Passport state</dt>
            <dd>
              {onboardingState.passportState}
            </dd>
          </div>

          <div>
            <dt>Create status</dt>
            <dd>{createUi.status}</dd>
          </div>
        </dl>

        {createUi.status ===
        CREATE_UI_STATUS.PENDING ? (
          <p
            className="cl-onboarding-feedback cl-onboarding-feedback--info"
            role="status"
          >
            Waiting for the native secure
            Passport create surface.
          </p>
        ) : null}

        {createUi.status ===
          CREATE_UI_STATUS.FAILURE &&
        createUi.outcome ? (
          <div
            className="cl-onboarding-feedback cl-onboarding-feedback--error"
            role="alert"
          >
            <strong>
              Passport creation was not completed
            </strong>

            <p>{createUi.outcome.message}</p>

            <p>
              Failure code:{' '}
              <code>
                {createUi.outcome.code}
              </code>
            </p>
          </div>
        ) : null}

        {(createdLocked ||
          createUi.status ===
            CREATE_UI_STATUS.SUCCESS) &&
        createUi.outcome ? (
          <div
            className="cl-onboarding-feedback cl-onboarding-feedback--success"
            role="status"
          >
            <strong>
              {existingConfirmed
                ? 'Existing local Passport confirmed'
                : 'Local Passport created and locked'}
            </strong>

            <p>{createUi.outcome.message}</p>

            <p>
              The next onboarding phase will
              begin the native recovery phrase
              ceremony.
            </p>
          </div>
        ) : null}

        {!createdLocked ? (
          <button
            className="cl-onboarding-gate__primary"
            type="button"
            disabled={busy}
            onClick={() => {
              void createPassport();
            }}
          >
            {busy
              ? 'Waiting for native create…'
              : createUi.status ===
                    CREATE_UI_STATUS.FAILURE
                ? 'Retry native Passport creation'
                : 'Create local Passport'}
          </button>
        ) : null}

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
              It does not create a Passport or
              complete onboarding.
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

function initialCreateUi(
  onboardingState,
) {
  if (
    onboardingState.state ===
    ONBOARDING_STATES
      .PASSPORT_CREATED_LOCKED
  ) {
    const operationalUnlocked =
      onboardingState.passportState ===
      PASSPORT_STATES
        .OPERATIONAL_UNLOCKED;

    const existingPassport =
      onboardingState.passportState ===
        PASSPORT_STATES.STORED_LOCKED ||
      operationalUnlocked;

    if (existingPassport) {
      return {
        status: CREATE_UI_STATUS.SUCCESS,
        outcome:
          createExistingPassportConfirmedOutcome({
            operationalUnlocked,
          }),
      };
    }

    if (
      onboardingState.passportState !==
      PASSPORT_STATES.CREATED_LOCKED
    ) {
      return {
        status: CREATE_UI_STATUS.FAILURE,
        outcome:
          createRedactedPassportCreateFailure(
            ONBOARDING_PASSPORT_CREATE_CODES
              .INVALID_RESPONSE,
          ),
      };
    }

    return {
      status: CREATE_UI_STATUS.SUCCESS,
      outcome:
        reviewOnboardingPassportCreateResult({
          state: 'created_locked',
          redacted: true,
          nativeSecureInputRequested: true,
          pinReceivedFromWebview: false,
          secretMaterialReturned: false,
          encryptedVaultMutated: true,
          platformMaterialMutated: true,
          recoveryRootUnsealed: false,
          walletOrLedgerMutated: false,
        }),
    };
  }

  if (
    onboardingState.state ===
    ONBOARDING_STATES
      .PASSPORT_CREATE_REQUESTED
  ) {
    return {
      status: CREATE_UI_STATUS.FAILURE,
      outcome:
        createRedactedPassportCreateFailure(
          ONBOARDING_PASSPORT_CREATE_CODES
            .INTERRUPTED,
        ),
    };
  }

  return {
    status: CREATE_UI_STATUS.READY,
    outcome: null,
  };
}
