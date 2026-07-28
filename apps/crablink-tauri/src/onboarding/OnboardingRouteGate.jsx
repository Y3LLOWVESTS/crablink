/**
 * RO:WHAT — React boot gate that keeps the normal CrabLink context and shell unmounted until onboarding completes.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; clean installs must enter first-run onboarding instead of inherited development identity surfaces.
 * RO:INTERACTS — onboardingStorage.js, onboardingRouteGate.js, App.jsx, future welcome/username onboarding steps.
 * RO:INVARIANTS — production has no route-gate bypass; development bypass is explicit, visible, session-only, and does not mark onboarding complete.
 * RO:METRICS — none.
 * RO:CONFIG — import.meta.env.DEV controls availability of the development-only bypass.
 * RO:SECURITY — displays redacted progress only; no PIN, seed phrase, recovery words, private material, wallet, ledger, or capability authority.
 * RO:TEST — onboardingRouteGate.test.mjs and React production build.
 */

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ONBOARDING_STORAGE_KEY,
  readOnboardingState,
} from './onboardingStorage.js';

import {
  ONBOARDING_GATE_TARGETS,
  getOnboardingRouteGateDecision,
  shouldMountNormalCrabLinkShell,
} from './onboardingRouteGate.js';

import {
  ONBOARDING_STATES,
} from './onboardingModel.js';

import WelcomeUsernameStep from './WelcomeUsernameStep.jsx';
import PassportCreateStep from './PassportCreateStep.jsx';
import RecoveryCeremonyStep from './RecoveryCeremonyStep.jsx';
import PinSetupStep from './PinSetupStep.jsx';
import ProfileSetupStep from './ProfileSetupStep.jsx';
import OnboardingCompletionStep from './OnboardingCompletionStep.jsx';
import StartupPassportUnlockGate from './StartupPassportUnlockGate.jsx';

import './onboardingRouteGate.css';

const WELCOME_USERNAME_STATES =
  new Set([
    ONBOARDING_STATES.WELCOME,
    ONBOARDING_STATES.USERNAME_ENTRY,
    ONBOARDING_STATES.USERNAME_CHECKING,
  ]);

const PASSPORT_CREATE_STATES =
  new Set([
    ONBOARDING_STATES.USERNAME_AVAILABLE,
    ONBOARDING_STATES
      .USERNAME_BYPASSED_FOR_DEV,
    ONBOARDING_STATES
      .PASSPORT_CREATE_REQUESTED,
  ]);

const RECOVERY_CEREMONY_STATES =
  new Set([
    ONBOARDING_STATES
      .PASSPORT_CREATED_LOCKED,
    ONBOARDING_STATES
      .RECOVERY_PHRASE_REQUIRED,
  ]);

const PIN_SETUP_STATES =
  new Set([
    ONBOARDING_STATES
      .RECOVERY_PHRASE_ACKNOWLEDGED,
    ONBOARDING_STATES
      .PIN_SETUP_REQUIRED,
    ONBOARDING_STATES
      .PIN_SETUP_COMPLETE,
  ]);

const PROFILE_SETUP_ROUTE_STATES =
  new Set([
    ONBOARDING_STATES.PROFILE_SETUP,
  ]);

const ONBOARDING_COMPLETION_STATES =
  new Set([
    ONBOARDING_STATES.PROFILE_SKIPPED,
    ONBOARDING_STATES.PROFILE_SAVED,
  ]);

const DEV_OVERRIDE_AVAILABLE =
  Boolean(import.meta.env.DEV);

const SIGNED_ONBOARDING_ACCEPTANCE_AVAILABLE =
  import.meta.env
    .VITE_CRABLINK_SIGNED_ONBOARDING_ACCEPTANCE ===
  '1';

const USERNAME_AVAILABILITY_BYPASS_AVAILABLE =
  DEV_OVERRIDE_AVAILABLE ||
  SIGNED_ONBOARDING_ACCEPTANCE_AVAILABLE;

export default function OnboardingRouteGate({
  children,
}) {
  const [
    loadState,
    setLoadState,
  ] = useState(() => ({
    status: 'loading',
    onboardingState: null,
  }));

  const [
    devOverrideActive,
    setDevOverrideActive,
  ] = useState(false);

  const loadOnboardingState =
    useCallback(async () => {
      setLoadState({
        status: 'loading',
        onboardingState: null,
      });

      try {
        const onboardingState =
          await readOnboardingState();

        setLoadState({
          status: 'ready',
          onboardingState,
        });
      } catch (error) {
        try {
          console.error(
            'CrabLink onboarding state load failed',
            {
              name:
                error?.name || 'Error',
            },
          );
        } catch (_ignored) {
          // Console may be unavailable in a constrained WebView.
        }

        setLoadState({
          status: 'blocked',
          onboardingState: null,
        });
      }
    }, []);

  useEffect(() => {
    void loadOnboardingState();

    const handleStorageChange = (event) => {
      if (
        event?.key ===
        ONBOARDING_STORAGE_KEY
      ) {
        void loadOnboardingState();
      }
    };

    window.addEventListener(
      'storage',
      handleStorageChange,
    );

    return () => {
      window.removeEventListener(
        'storage',
        handleStorageChange,
      );
    };
  }, [loadOnboardingState]);

  if (loadState.status === 'loading') {
    return (
      <OnboardingGateFrame
        gateState="loading"
        eyebrow="First-run setup"
        title="Preparing CrabLink"
      >
        <p>
          Loading safe local onboarding
          progress.
        </p>
      </OnboardingGateFrame>
    );
  }

  if (
    loadState.status === 'blocked' ||
    !loadState.onboardingState
  ) {
    return (
      <OnboardingGateFrame
        gateState="blocked"
        eyebrow="First-run setup blocked"
        title="CrabLink could not load onboarding state"
      >
        <p>
          The normal CrabLink shell remains
          closed rather than guessing an
          identity or account.
        </p>

        <button
          className="cl-onboarding-gate__primary"
          type="button"
          onClick={() => {
            void loadOnboardingState();
          }}
        >
          Retry safe onboarding load
        </button>
      </OnboardingGateFrame>
    );
  }

  const decision =
    getOnboardingRouteGateDecision(
      loadState.onboardingState,
      {
        devOverrideAllowed:
          DEV_OVERRIDE_AVAILABLE,
        devOverrideActive,
      },
    );

  if (
    decision.target ===
    ONBOARDING_GATE_TARGETS.BLOCKED
  ) {
    return (
      <OnboardingGateFrame
        gateState="blocked"
        eyebrow="First-run setup blocked"
        title="Stored onboarding progress was rejected"
      >
        <p>
          CrabLink will not open the normal
          shell from invalid or unsafe local
          state.
        </p>

        <button
          className="cl-onboarding-gate__primary"
          type="button"
          onClick={() => {
            void loadOnboardingState();
          }}
        >
          Reload safe onboarding state
        </button>
      </OnboardingGateFrame>
    );
  }

  if (
    shouldMountNormalCrabLinkShell(
      decision,
    )
  ) {
    if (decision.developmentOverride) {
      return (
        <>
          <aside
            className="cl-onboarding-dev-banner"
            role="status"
            data-onboarding-dev-override="true"
          >
            <div>
              <strong>
                Development-only onboarding
                bypass active
              </strong>

              <span>
                Onboarding is still incomplete.
                This session does not claim a
                real username, Passport, wallet,
                balance, or backend-confirmed
                identity.
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setDevOverrideActive(false);
              }}
            >
              Return to onboarding
            </button>
          </aside>

          {children}
        </>
      );
    }

    return (
      <StartupPassportUnlockGate>
        {children}
      </StartupPassportUnlockGate>
    );
  }

  const onboardingState =
    loadState.onboardingState;

  if (
    WELCOME_USERNAME_STATES.has(
      onboardingState.state,
    )
  ) {
    return (
      <WelcomeUsernameStep
        onboardingState={
          onboardingState
        }
        devAvailabilityBypassAllowed={
          USERNAME_AVAILABILITY_BYPASS_AVAILABLE
        }
        developmentShellBypassAllowed={
          DEV_OVERRIDE_AVAILABLE
        }
        developmentShellBypassLabel="Development-only bypass: open CrabLink shell"
        developmentShellBypassNotice="This temporary development session does not complete onboarding and does not claim a real username, Passport, wallet, balance, or backend-confirmed identity."
        onOpenDevelopmentShell={() => {
          setDevOverrideActive(true);
        }}
        onStateChange={(nextState) => {
          setLoadState({
            status: 'ready',
            onboardingState: nextState,
          });
        }}
      />
    );
  }

  if (
    PASSPORT_CREATE_STATES.has(
      onboardingState.state,
    )
  ) {
    return (
      <PassportCreateStep
        onboardingState={
          onboardingState
        }
        devShellBypassAllowed={
          DEV_OVERRIDE_AVAILABLE
        }
        onOpenDevelopmentShell={() => {
          setDevOverrideActive(true);
        }}
        onStateChange={(nextState) => {
          setLoadState({
            status: 'ready',
            onboardingState: nextState,
          });
        }}
      />
    );
  }

  if (
    RECOVERY_CEREMONY_STATES.has(
      onboardingState.state,
    )
  ) {
    return (
      <RecoveryCeremonyStep
        onboardingState={
          onboardingState
        }
        devShellBypassAllowed={
          DEV_OVERRIDE_AVAILABLE
        }
        onOpenDevelopmentShell={() => {
          setDevOverrideActive(true);
        }}
        onStateChange={(nextState) => {
          setLoadState({
            status: 'ready',
            onboardingState: nextState,
          });
        }}
      />
    );
  }

  if (
    PIN_SETUP_STATES.has(
      onboardingState.state,
    )
  ) {
    return (
      <PinSetupStep
        onboardingState={
          onboardingState
        }
        devShellBypassAllowed={
          DEV_OVERRIDE_AVAILABLE
        }
        onOpenDevelopmentShell={() => {
          setDevOverrideActive(true);
        }}
        onStateChange={(nextState) => {
          setLoadState({
            status: 'ready',
            onboardingState: nextState,
          });
        }}
      />
    );
  }

  if (
    ONBOARDING_COMPLETION_STATES.has(
      onboardingState.state,
    )
  ) {
    return (
      <OnboardingCompletionStep
        onboardingState={
          onboardingState
        }
        onStateChange={(nextState) => {
          setLoadState({
            status: 'ready',
            onboardingState: nextState,
          });
        }}
      />
    );
  }

  if (
    PROFILE_SETUP_ROUTE_STATES.has(
      onboardingState.state,
    )
  ) {
    return (
      <ProfileSetupStep
        onboardingState={
          onboardingState
        }
        devShellBypassAllowed={
          DEV_OVERRIDE_AVAILABLE
        }
        onOpenDevelopmentShell={() => {
          setDevOverrideActive(true);
        }}
        onStateChange={(nextState) => {
          setLoadState({
            status: 'ready',
            onboardingState: nextState,
          });
        }}
      />
    );
  }

  return (
    <OnboardingGateFrame
      gateState="onboarding"
      eyebrow="First-run setup"
      title="Welcome to CrabLink"
    >
      <p>
        This clean local profile must complete
        onboarding before the normal CrabLink
        shell opens.
      </p>

      <dl className="cl-onboarding-gate__status">
        <div>
          <dt>Progress</dt>
          <dd>
            {onboardingState.state}
          </dd>
        </div>

        <div>
          <dt>Passport</dt>
          <dd>
            {onboardingState.passportState}
          </dd>
        </div>

        <div>
          <dt>Username</dt>
          <dd>
            {onboardingState.username
              ? `@${onboardingState.username}`
              : 'Not selected'}
          </dd>
        </div>
      </dl>

      <p className="cl-onboarding-gate__notice">
        Username entry and the remaining
        first-run steps arrive in the next
        onboarding phases. No development
        identity has been selected for you.
      </p>

      {DEV_OVERRIDE_AVAILABLE ? (
        <div className="cl-onboarding-gate__dev">
          <p>
            <strong>
              Development tools only
            </strong>
          </p>

          <p>
            The following control temporarily
            opens the existing shell for this
            process. It does not complete
            onboarding and is unavailable in
            production builds.
          </p>

          <button
            className="cl-onboarding-gate__secondary"
            type="button"
            onClick={() => {
              setDevOverrideActive(true);
            }}
          >
            Development-only bypass: open CrabLink shell
          </button>
        </div>
      ) : null}
    </OnboardingGateFrame>
  );
}

function OnboardingGateFrame({
  children,
  eyebrow,
  gateState,
  title,
}) {
  return (
    <main
      className="cl-onboarding-gate"
      data-onboarding-gate-state={
        gateState
      }
    >
      <section className="cl-onboarding-gate__card">
        <p className="cl-onboarding-gate__eyebrow">
          {eyebrow}
        </p>

        <h1>{title}</h1>

        {children}
      </section>
    </main>
  );
}
