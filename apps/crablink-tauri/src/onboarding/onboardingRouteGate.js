/**
 * RO:WHAT — Pure first-run route-gate decision model for CrabLink onboarding.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; blocks the normal shell until redacted onboarding state is complete.
 * RO:INTERACTS — onboardingModel.js, OnboardingRouteGate.jsx, onboardingStorage.js, App.jsx.
 * RO:INVARIANTS — incomplete users reach onboarding; only valid complete state reaches the normal shell; development override is explicit and session-only.
 * RO:METRICS — none.
 * RO:CONFIG — development override availability is supplied by the caller.
 * RO:SECURITY — no identity, Passport, wallet, ledger, capability, PIN, seed, or recovery authority.
 * RO:TEST — onboardingRouteGate.test.mjs.
 */

import {
  ONBOARDING_STATES,
  validateOnboardingState,
} from './onboardingModel.js';

export const ONBOARDING_GATE_TARGETS =
  Object.freeze({
    ONBOARDING: 'onboarding',
    NORMAL_SHELL: 'normal_shell',
    DEVELOPMENT_SHELL:
      'development_shell',
    BLOCKED: 'blocked',
  });

export function getOnboardingRouteGateDecision(
  onboardingState,
  {
    devOverrideAllowed = false,
    devOverrideActive = false,
  } = {},
) {
  const validation =
    validateOnboardingState(
      onboardingState,
    );

  if (!validation.ok) {
    return freezeDecision({
      target:
        ONBOARDING_GATE_TARGETS.BLOCKED,
      reason: 'invalid_onboarding_state',
      onboardingComplete: false,
      developmentOverride: false,
      validationErrors:
        validation.errors,
    });
  }

  const onboardingComplete =
    onboardingState.completed === true &&
    onboardingState.state ===
      ONBOARDING_STATES.COMPLETE;

  if (onboardingComplete) {
    return freezeDecision({
      target:
        ONBOARDING_GATE_TARGETS
          .NORMAL_SHELL,
      reason: 'onboarding_complete',
      onboardingComplete: true,
      developmentOverride: false,
      validationErrors: [],
    });
  }

  if (
    devOverrideAllowed === true &&
    devOverrideActive === true
  ) {
    return freezeDecision({
      target:
        ONBOARDING_GATE_TARGETS
          .DEVELOPMENT_SHELL,
      reason:
        'explicit_development_override',
      onboardingComplete: false,
      developmentOverride: true,
      validationErrors: [],
    });
  }

  return freezeDecision({
    target:
      ONBOARDING_GATE_TARGETS.ONBOARDING,
    reason: 'onboarding_incomplete',
    onboardingComplete: false,
    developmentOverride: false,
    validationErrors: [],
  });
}

export function shouldMountNormalCrabLinkShell(
  decision,
) {
  return (
    decision?.target ===
      ONBOARDING_GATE_TARGETS
        .NORMAL_SHELL ||
    decision?.target ===
      ONBOARDING_GATE_TARGETS
        .DEVELOPMENT_SHELL
  );
}

function freezeDecision({
  target,
  reason,
  onboardingComplete,
  developmentOverride,
  validationErrors,
}) {
  return Object.freeze({
    target,
    reason,
    onboardingComplete,
    developmentOverride,
    validationErrors: Object.freeze([
      ...(validationErrors || []),
    ]),
  });
}
