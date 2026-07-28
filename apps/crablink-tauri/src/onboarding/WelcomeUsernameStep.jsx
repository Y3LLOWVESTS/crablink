/**
 * RO:WHAT — Visible CrabLink welcome and username-selection step.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; clean installs need a real user-entered identity draft instead of baked development accounts.
 * RO:INTERACTS — onboardingModel.js, onboardingStorage.js, usernameAvailability.js, OnboardingRouteGate.jsx.
 * RO:INVARIANTS — username begins empty; normal flow never claims ownership without a configured availability check; development bypass stays explicit.
 * RO:METRICS — none.
 * RO:CONFIG — development bypass visibility is supplied by the boot gate.
 * RO:SECURITY — username is public draft data; no PIN, password, seed phrase, recovery material, root, private key, VMK, or wallet authority.
 * RO:TEST — welcomeUsernameStep.test.mjs and React production build.
 */

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ONBOARDING_STATES,
  USERNAME_AVAILABILITY,
  beginUsernameCheck,
  beginUsernameEntry,
  bypassUsernameForDev,
  recordUsernameAvailable,
  recordUsernameUnavailable,
  returnToUsernameEntry,
  validateOnboardingUsername,
} from './onboardingModel.js';

import {
  writeOnboardingState,
} from './onboardingStorage.js';

import {
  USERNAME_AVAILABILITY_CHECK_STATUS,
  checkUsernameAvailability,
} from './usernameAvailability.js';

export default function WelcomeUsernameStep({
  onboardingState,
  devAvailabilityBypassAllowed = false,
  developmentShellBypassAllowed = false,
  developmentShellBypassLabel,
  developmentShellBypassNotice,
  onOpenDevelopmentShell,
  onStateChange,
}) {
  const [
    usernameDraft,
    setUsernameDraft,
  ] = useState(
    onboardingState.username || '',
  );

  const [
    feedback,
    setFeedback,
  ] = useState(null);

  const [
    busy,
    setBusy,
  ] = useState(false);

  useEffect(() => {
    setUsernameDraft(
      onboardingState.username || '',
    );
  }, [
    onboardingState.state,
    onboardingState.username,
  ]);

  const validation = useMemo(
    () =>
      validateOnboardingUsername(
        usernameDraft,
      ),
    [usernameDraft],
  );

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

  const beginUsernameSelection =
    async () => {
      setBusy(true);
      setFeedback(null);

      try {
        await publishState(
          beginUsernameEntry(
            onboardingState,
          ),
        );
      } catch (_error) {
        setFeedback({
          kind: 'error',
          message:
            'CrabLink could not begin username selection.',
        });
      } finally {
        setBusy(false);
      }
    };

  const submitAvailabilityCheck =
    async (event) => {
      event.preventDefault();

      if (!validation.ok) {
        setFeedback({
          kind: 'error',
          message:
            usernameValidationMessage(
              validation.code,
            ),
        });

        return;
      }

      setBusy(true);

      setFeedback({
        kind: 'info',
        message:
          'Checking username availability.',
      });

      let checkingState = null;

      try {
        checkingState =
          beginUsernameCheck(
            onboardingState,
            validation.normalized,
          );

        await publishState(checkingState);

        const result =
          await checkUsernameAvailability(
            validation.normalized,
          );

        if (
          result.status ===
          USERNAME_AVAILABILITY_CHECK_STATUS
            .AVAILABLE
        ) {
          const availableState =
            recordUsernameAvailable(
              checkingState,
            );

          await publishState(
            availableState,
          );

          setFeedback({
            kind: 'success',
            message:
              'The availability adapter reports this username as available. Ownership is not claimed until a later confirmed registry flow.',
          });

          return;
        }

        if (
          result.status ===
          USERNAME_AVAILABILITY_CHECK_STATUS
            .UNAVAILABLE
        ) {
          const unavailableState =
            recordUsernameUnavailable(
              checkingState,
            );

          await publishState(
            unavailableState,
          );

          setFeedback({
            kind: 'error',
            message:
              'That username is unavailable. Choose another username.',
          });

          return;
        }

        const entryState =
          returnToUsernameEntry(
            checkingState,
          );

        await publishState(entryState);

        setFeedback({
          kind: 'info',
          message:
            result.status ===
            USERNAME_AVAILABILITY_CHECK_STATUS
              .NOT_CONFIGURED
              ? 'Live username availability is not connected yet. Development builds may use the explicit availability bypass.'
              : 'The username availability check could not be completed.',
        });
      } catch (_error) {
        if (checkingState) {
          try {
            await publishState(
              returnToUsernameEntry(
                checkingState,
              ),
            );
          } catch (_ignored) {
            // The route gate remains closed if safe state persistence fails.
          }
        }

        setFeedback({
          kind: 'error',
          message:
            'The username availability check could not be completed.',
        });
      } finally {
        setBusy(false);
      }
    };

  const bypassAvailabilityForDev =
    async () => {
      if (!devAvailabilityBypassAllowed) {
        return;
      }

      if (!validation.ok) {
        setFeedback({
          kind: 'error',
          message:
            usernameValidationMessage(
              validation.code,
            ),
        });

        return;
      }

      setBusy(true);
      setFeedback(null);

      try {
        const bypassedState =
          bypassUsernameForDev(
            onboardingState,
            validation.normalized,
          );

        await publishState(
          bypassedState,
        );

        setFeedback({
          kind: 'warning',
          message:
            'Development-only availability bypass recorded. Username ownership is not confirmed.',
        });
      } catch (_error) {
        setFeedback({
          kind: 'error',
          message:
            'CrabLink could not record the development-only availability bypass.',
        });
      } finally {
        setBusy(false);
      }
    };

  const changeUsername =
    async () => {
      setBusy(true);
      setFeedback(null);

      try {
        await publishState(
          returnToUsernameEntry(
            onboardingState,
          ),
        );
      } catch (_error) {
        setFeedback({
          kind: 'error',
          message:
            'CrabLink could not return to username entry.',
        });
      } finally {
        setBusy(false);
      }
    };

  if (
    onboardingState.state ===
    ONBOARDING_STATES.WELCOME
  ) {
    return (
      <OnboardingStepFrame
        eyebrow="First-run setup"
        title="Welcome to CrabLink"
        step="Welcome"
      >
        <p className="cl-onboarding-step__lead">
          CrabLink uses a local wallet-like
          Passport. There is no cloud password
          account and CrabLink does not take
          custody of your Passport secrets.
        </p>

        <div className="cl-onboarding-step__facts">
          <article>
            <strong>Local custody</strong>
            <span>
              Your future Passport belongs to
              this device and your recovery
              material.
            </span>
          </article>

          <article>
            <strong>Public username</strong>
            <span>
              Begin with a username you choose.
              It is public draft information,
              not a secret.
            </span>
          </article>

          <article>
            <strong>No assumed identity</strong>
            <span>
              CrabLink will not silently select
              a development account for you.
            </span>
          </article>
        </div>

        <button
          className="cl-onboarding-gate__primary"
          type="button"
          disabled={busy}
          onClick={() => {
            void beginUsernameSelection();
          }}
        >
          {busy
            ? 'Preparing username step…'
            : 'Choose a username'}
        </button>

        <DevelopmentShellBypass
          allowed={
            developmentShellBypassAllowed
          }
          label={
            developmentShellBypassLabel
          }
          notice={
            developmentShellBypassNotice
          }
          onOpen={
            onOpenDevelopmentShell
          }
        />
      </OnboardingStepFrame>
    );
  }

  if (
    onboardingState.state ===
      ONBOARDING_STATES.USERNAME_ENTRY ||
    onboardingState.state ===
      ONBOARDING_STATES.USERNAME_CHECKING
  ) {
    const checking =
      onboardingState.state ===
      ONBOARDING_STATES.USERNAME_CHECKING;

    return (
      <OnboardingStepFrame
        eyebrow="First-run setup"
        title="Pick your username"
        step="Username"
      >
        <p className="cl-onboarding-step__lead">
          Choose the public username people
          will use to find you. This does not
          create or claim the username yet.
        </p>

        <form
          className="cl-onboarding-username-form"
          onSubmit={(event) => {
            void submitAvailabilityCheck(
              event,
            );
          }}
        >
          <label
            htmlFor="crablink-onboarding-username"
          >
            Username
          </label>

          <div className="cl-onboarding-username-field">
            <span aria-hidden="true">@</span>

            <input
              id="crablink-onboarding-username"
              name="username"
              type="text"
              value={usernameDraft}
              placeholder="your_username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              minLength={3}
              maxLength={32}
              disabled={busy || checking}
              onChange={(event) => {
                setUsernameDraft(
                  event.target.value,
                );

                setFeedback(null);
              }}
            />
          </div>

          <p className="cl-onboarding-username-form__hint">
            Use 3–32 lowercase letters,
            numbers, or underscores. Start
            with a letter.
          </p>

          {usernameDraft ? (
            <p
              className={
                validation.ok
                  ? 'cl-onboarding-feedback cl-onboarding-feedback--success'
                  : 'cl-onboarding-feedback cl-onboarding-feedback--error'
              }
              role="status"
            >
              {validation.ok
                ? `Username syntax is valid: @${validation.normalized}`
                : usernameValidationMessage(
                    validation.code,
                  )}
            </p>
          ) : null}

          {feedback ? (
            <FeedbackMessage
              feedback={feedback}
            />
          ) : null}

          <div className="cl-onboarding-step__actions">
            <button
              className="cl-onboarding-gate__primary"
              type="submit"
              disabled={
                busy ||
                checking ||
                !validation.ok
              }
            >
              {busy || checking
                ? 'Checking availability…'
                : 'Check availability'}
            </button>

            {devAvailabilityBypassAllowed ? (
              <button
                className="cl-onboarding-gate__secondary"
                type="button"
                disabled={
                  busy ||
                  checking ||
                  !validation.ok
                }
                onClick={() => {
                  void bypassAvailabilityForDev();
                }}
              >
                Bypass availability for dev
              </button>
            ) : null}
          </div>
        </form>

        {devAvailabilityBypassAllowed ? (
          <p className="cl-onboarding-step__dev-warning">
            <strong>
              Development-only:
            </strong>{' '}
            bypassing availability records a
            local development flag. It does not
            confirm username ownership.
          </p>
        ) : null}

        <DevelopmentShellBypass
          allowed={
            developmentShellBypassAllowed
          }
          label={
            developmentShellBypassLabel
          }
          notice={
            developmentShellBypassNotice
          }
          onOpen={
            onOpenDevelopmentShell
          }
        />
      </OnboardingStepFrame>
    );
  }

  if (
    onboardingState.state ===
      ONBOARDING_STATES.USERNAME_AVAILABLE ||
    onboardingState.state ===
      ONBOARDING_STATES
        .USERNAME_BYPASSED_FOR_DEV
  ) {
    const devBypassed =
      onboardingState.usernameAvailability ===
      USERNAME_AVAILABILITY
        .BYPASSED_FOR_DEV;

    return (
      <OnboardingStepFrame
        eyebrow="First-run setup"
        title="Username decision recorded"
        step="Username"
      >
        <div className="cl-onboarding-username-result">
          <span>Selected username</span>

          <strong>
            @{onboardingState.username}
          </strong>

          <p>
            {devBypassed
              ? 'Development-only availability bypass is active. Username ownership has not been confirmed.'
              : 'The configured availability adapter reported this username as available. This is not yet a final registry ownership claim.'}
          </p>
        </div>

        <p className="cl-onboarding-gate__notice">
          The next phase connects this
          onboarding flow to local Passport
          creation.
        </p>

        {feedback ? (
          <FeedbackMessage
            feedback={feedback}
          />
        ) : null}

        <button
          className="cl-onboarding-gate__secondary"
          type="button"
          disabled={busy}
          onClick={() => {
            void changeUsername();
          }}
        >
          Change username
        </button>

        <DevelopmentShellBypass
          allowed={
            developmentShellBypassAllowed
          }
          label={
            developmentShellBypassLabel
          }
          notice={
            developmentShellBypassNotice
          }
          onOpen={
            onOpenDevelopmentShell
          }
        />
      </OnboardingStepFrame>
    );
  }

  return (
    <OnboardingStepFrame
      eyebrow="First-run setup"
      title="Continue onboarding"
      step="Progress"
    >
      <p>
        Username selection is complete.
        CrabLink is waiting for the next
        secure onboarding step.
      </p>
    </OnboardingStepFrame>
  );
}

function OnboardingStepFrame({
  children,
  eyebrow,
  step,
  title,
}) {
  return (
    <main
      className="cl-onboarding-gate"
      data-onboarding-step={
        step.toLowerCase()
      }
    >
      <section className="cl-onboarding-gate__card">
        <p className="cl-onboarding-gate__eyebrow">
          {eyebrow}
        </p>

        <p className="cl-onboarding-step__counter">
          {step}
        </p>

        <h1>{title}</h1>

        {children}
      </section>
    </main>
  );
}

function FeedbackMessage({
  feedback,
}) {
  return (
    <p
      className={`cl-onboarding-feedback cl-onboarding-feedback--${feedback.kind}`}
      role={
        feedback.kind === 'error'
          ? 'alert'
          : 'status'
      }
    >
      {feedback.message}
    </p>
  );
}

function DevelopmentShellBypass({
  allowed,
  label,
  notice,
  onOpen,
}) {
  if (
    !allowed ||
    typeof onOpen !== 'function'
  ) {
    return null;
  }

  return (
    <details className="cl-onboarding-shell-dev-tools">
      <summary>
        Development shell tools
      </summary>

      <p>
        {notice ||
          'This temporary development session does not complete onboarding.'}
      </p>

      <button
        className="cl-onboarding-gate__secondary"
        type="button"
        onClick={onOpen}
      >
        {label ||
          'Development-only bypass: open CrabLink shell'}
      </button>
    </details>
  );
}

function usernameValidationMessage(
  code,
) {
  switch (code) {
    case 'username_too_short':
      return 'Username must contain at least 3 characters.';

    case 'username_too_long':
      return 'Username must contain no more than 32 characters.';

    case 'username_must_start_with_letter':
      return 'Username must start with a lowercase letter.';

    case 'username_invalid_characters':
      return 'Use only lowercase letters, numbers, and underscores.';

    case 'username_double_underscore':
      return 'Username cannot contain two underscores in a row.';

    default:
      return 'Enter a valid username.';
  }
}
