/**
 * RO:WHAT — First-run profile setup screen that saves a bounded local public draft or records an explicit skip decision.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; onboarding needs an honest profile decision before final completion and home handoff.
 * RO:INTERACTS — onboardingProfileDraft.js, onboardingModel.js, onboardingStorage.js, and OnboardingRouteGate.jsx.
 * RO:INVARIANTS — local draft only; no backend publication/confirmation claim; no development username default; no Passport, wallet, ledger, capability, or secret material.
 * RO:METRICS — none.
 * RO:CONFIG — display name max 80 characters and bio max 280 characters.
 * RO:SECURITY — stores only public draft fields plus explicit backendConfirmed=false; performs no gateway, wallet, ledger, or native command.
 * RO:TEST — profileSetupStep.test.mjs.
 */

import {
  useEffect,
  useState,
} from 'react';

import {
  ONBOARDING_PROFILE_LIMITS,
  clearOnboardingProfileDraft,
  createOnboardingProfileDraft,
  readOnboardingProfileDraft,
  writeOnboardingProfileDraft,
} from './onboardingProfileDraft.js';

import {
  ONBOARDING_STATES,
  saveProfileSetup,
  skipProfileSetup,
} from './onboardingModel.js';

import {
  writeOnboardingState,
} from './onboardingStorage.js';

const PROFILE_UI_STATUS =
  Object.freeze({
    READY: 'ready',
    SAVING: 'saving',
    SAVED: 'saved',
    SKIPPED: 'skipped',
    FAILURE: 'failure',
  });

export default function ProfileSetupStep({
  onboardingState,
  devShellBypassAllowed = false,
  onOpenDevelopmentShell,
  onStateChange,
}) {
  const [
    displayName,
    setDisplayName,
  ] = useState('');

  const [bio, setBio] =
    useState('');

  const [
    savedDraft,
    setSavedDraft,
  ] = useState(null);

  const [busy, setBusy] =
    useState(false);

  const [profileUi, setProfileUi] =
    useState({
      status:
        PROFILE_UI_STATUS.READY,

      message: '',
    });

  const username =
    onboardingState.username;

  const profileSaved =
    onboardingState.state ===
    ONBOARDING_STATES.PROFILE_SAVED;

  const profileSkipped =
    onboardingState.state ===
    ONBOARDING_STATES.PROFILE_SKIPPED;

  useEffect(() => {
    let active = true;

    void readOnboardingProfileDraft({
      username,
    }).then((draft) => {
      if (!active || !draft) {
        return;
      }

      setSavedDraft(draft);

      setDisplayName(
        draft.displayName,
      );

      setBio(draft.bio);
    });

    return () => {
      active = false;
    };
  }, [username]);

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

  const saveLocalDraft =
    async (event) => {
      event.preventDefault();

      if (
        busy ||
        profileSaved ||
        profileSkipped
      ) {
        return;
      }

      setBusy(true);

      setProfileUi({
        status:
          PROFILE_UI_STATUS.SAVING,

        message:
          'Saving a local profile draft.',
      });

      try {
        const draft =
          createOnboardingProfileDraft({
            username,
            displayName,
            bio,
          });

        const persistedDraft =
          await writeOnboardingProfileDraft(
            draft,
          );

        const nextState =
          saveProfileSetup(
            onboardingState,
          );

        await publishState(nextState);

        setSavedDraft(
          persistedDraft,
        );

        setProfileUi({
          status:
            PROFILE_UI_STATUS.SAVED,

          message:
            'Local profile draft saved. It is not backend published or confirmed.',
        });
      } catch (_error) {
        setProfileUi({
          status:
            PROFILE_UI_STATUS.FAILURE,

          message:
            'The local profile draft was not saved. Check the display name and try again.',
        });
      } finally {
        setBusy(false);
      }
    };

  const skipLocalDraft =
    async () => {
      if (
        busy ||
        profileSaved ||
        profileSkipped
      ) {
        return;
      }

      setBusy(true);

      try {
        await clearOnboardingProfileDraft();

        const nextState =
          skipProfileSetup(
            onboardingState,
          );

        await publishState(nextState);

        setSavedDraft(null);

        setProfileUi({
          status:
            PROFILE_UI_STATUS.SKIPPED,

          message:
            'Profile setup skipped. You can create a local profile draft later.',
        });
      } catch (_error) {
        setProfileUi({
          status:
            PROFILE_UI_STATUS.FAILURE,

          message:
            'The profile decision was not stored. Try again.',
        });
      } finally {
        setBusy(false);
      }
    };

  if (
    profileSaved ||
    profileSkipped
  ) {
    return (
      <ProfileDecisionRecorded
        onboardingState={
          onboardingState
        }
        profileUi={profileUi}
        savedDraft={savedDraft}
        devShellBypassAllowed={
          devShellBypassAllowed
        }
        onOpenDevelopmentShell={
          onOpenDevelopmentShell
        }
      />
    );
  }

  return (
    <main
      className="cl-onboarding-gate"
      data-onboarding-step="profile-setup"
      data-profile-status={
        profileUi.status
      }
    >
      <section className="cl-onboarding-gate__card">
        <p className="cl-onboarding-gate__eyebrow">
          First-run setup
        </p>

        <p className="cl-onboarding-step__counter">
          Profile setup
        </p>

        <h1>
          Create your local profile draft
        </h1>

        <p className="cl-onboarding-step__lead">
          Add a public display name and
          short bio, or skip this step.
          Nothing here is published or
          backend confirmed.
        </p>

        <div className="cl-onboarding-profile-truth">
          <span>Chosen username</span>

          <strong>
            @{username}
          </strong>

          <p>
            Local onboarding draft only.
            Username and profile confirmation
            still require real gateway/backend
            truth.
          </p>
        </div>

        <form
          className="cl-onboarding-profile-form"
          onSubmit={(event) => {
            void saveLocalDraft(event);
          }}
        >
          <label>
            <span>Display name</span>

            <input
              type="text"
              name="displayName"
              autoComplete="name"
              maxLength={
                ONBOARDING_PROFILE_LIMITS
                  .displayName
              }
              value={displayName}
              onChange={(event) => {
                setDisplayName(
                  event.target.value,
                );
              }}
              placeholder="How should your public profile be labeled?"
              disabled={busy}
              required
            />
          </label>

          <label>
            <span>Short bio</span>

            <textarea
              name="bio"
              rows="4"
              maxLength={
                ONBOARDING_PROFILE_LIMITS
                  .bio
              }
              value={bio}
              onChange={(event) => {
                setBio(
                  event.target.value,
                );
              }}
              placeholder="A short public-facing description"
              disabled={busy}
            />

            <small>
              {bio.length}/
              {
                ONBOARDING_PROFILE_LIMITS
                  .bio
              }
            </small>
          </label>

          <div className="cl-onboarding-profile-placeholder">
            <span aria-hidden="true">
              {initialsFor(
                displayName ||
                username,
              )}
            </span>

            <div>
              <strong>
                Avatar placeholder
              </strong>

              <p>
                A local avatar or crab://
                image can be added later.
                No image is uploaded during
                onboarding.
              </p>
            </div>
          </div>

          <p className="cl-onboarding-username-form__hint">
            Optional site label is
            intentionally deferred. This
            phase stores no Passport,
            wallet, ledger, capability,
            or secret fields.
          </p>

          {profileUi.status ===
          PROFILE_UI_STATUS.FAILURE ? (
            <p
              className="cl-onboarding-feedback cl-onboarding-feedback--error"
              role="alert"
            >
              {profileUi.message}
            </p>
          ) : null}

          {profileUi.status ===
          PROFILE_UI_STATUS.SAVING ? (
            <p
              className="cl-onboarding-feedback cl-onboarding-feedback--info"
              role="status"
            >
              {profileUi.message}
            </p>
          ) : null}

          <div className="cl-onboarding-step__actions">
            <button
              className="cl-onboarding-gate__primary"
              type="submit"
              disabled={busy}
            >
              {busy
                ? 'Saving local draft…'
                : 'Save local profile draft'}
            </button>

            <button
              className="cl-onboarding-gate__secondary"
              type="button"
              disabled={busy}
              onClick={() => {
                void skipLocalDraft();
              }}
            >
              Skip profile setup
            </button>
          </div>
        </form>

        <DevelopmentShellTools
          allowed={
            devShellBypassAllowed
          }
          onOpen={
            onOpenDevelopmentShell
          }
        />
      </section>
    </main>
  );
}

function ProfileDecisionRecorded({
  onboardingState,
  profileUi,
  savedDraft,
  devShellBypassAllowed,
  onOpenDevelopmentShell,
}) {
  const profileSaved =
    onboardingState.state ===
    ONBOARDING_STATES.PROFILE_SAVED;

  return (
    <main
      className="cl-onboarding-gate"
      data-onboarding-step="profile-decision-recorded"
      data-profile-decision={
        profileSaved
          ? 'saved'
          : 'skipped'
      }
    >
      <section className="cl-onboarding-gate__card">
        <p className="cl-onboarding-gate__eyebrow">
          First-run setup
        </p>

        <p className="cl-onboarding-step__counter">
          Profile decision recorded
        </p>

        <h1>
          {profileSaved
            ? 'Local profile draft saved'
            : 'Profile setup skipped'}
        </h1>

        <p className="cl-onboarding-step__lead">
          {profileSaved
            ? 'Your bounded local draft is stored, but it is not published or backend confirmed.'
            : 'No profile draft was stored. You can create one later from CrabLink.'}
        </p>

        {profileSaved &&
        savedDraft ? (
          <dl className="cl-onboarding-gate__status">
            <div>
              <dt>Username</dt>

              <dd>
                @{savedDraft.username}
              </dd>
            </div>

            <div>
              <dt>Display name</dt>

              <dd>
                {savedDraft.displayName}
              </dd>
            </div>

            <div>
              <dt>Profile truth</dt>

              <dd>
                Local draft only
              </dd>
            </div>
          </dl>
        ) : null}

        <p
          className="cl-onboarding-feedback cl-onboarding-feedback--success"
          role="status"
        >
          {profileUi.message ||
            'Profile decision persisted. Completion and home handoff are handled in the next onboarding phase.'}
        </p>

        <DevelopmentShellTools
          allowed={
            devShellBypassAllowed
          }
          onOpen={
            onOpenDevelopmentShell
          }
        />
      </section>
    </main>
  );
}

function DevelopmentShellTools({
  allowed,
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
        This opens the existing shell for
        the current development session.
        It does not publish the profile or
        complete onboarding.
      </p>

      <button
        className="cl-onboarding-gate__secondary"
        type="button"
        onClick={onOpen}
      >
        Development-only bypass: open CrabLink shell
      </button>
    </details>
  );
}

function initialsFor(value) {
  const clean =
    String(value || '')
      .replace(/^@/, '')
      .trim();

  const parts =
    clean
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`
      .toUpperCase();
  }

  return (
    clean
      .slice(0, 2)
      .toUpperCase() ||
    'CL'
  );
}
