/**
 * RO:WHAT — Truthful placeholder adapter for CrabLink username availability checks.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; onboarding needs a stable adapter contract before a gateway availability route is connected.
 * RO:INTERACTS — WelcomeUsernameStep.jsx and onboardingModel.js.
 * RO:INVARIANTS — the default adapter never claims availability or username ownership; only an injected checker may return available/unavailable.
 * RO:METRICS — none.
 * RO:CONFIG — optional injected check function.
 * RO:SECURITY — username is public draft data; no Passport, wallet, capability, registry mutation, or secret material.
 * RO:TEST — welcomeUsernameStep.test.mjs.
 */

import {
  validateOnboardingUsername,
} from './onboardingModel.js';

export const USERNAME_AVAILABILITY_CHECK_SCHEMA =
  'crablink.username-availability-check.v1';

export const USERNAME_AVAILABILITY_CHECK_STATUS =
  Object.freeze({
    NOT_CONFIGURED: 'not_configured',
    AVAILABLE: 'available',
    UNAVAILABLE: 'unavailable',
    ERROR: 'error',
  });

export function createUsernameAvailabilityAdapter({
  check,
} = {}) {
  const configuredCheck =
    typeof check === 'function'
      ? check
      : null;

  async function checkUsernameAvailability(
    username,
  ) {
    const validation =
      validateOnboardingUsername(username);

    if (!validation.ok) {
      return freezeResult({
        username:
          validation.normalized || '',
        status:
          USERNAME_AVAILABILITY_CHECK_STATUS.ERROR,
        available: null,
        checked: false,
        reason: validation.code,
      });
    }

    if (!configuredCheck) {
      return freezeResult({
        username: validation.normalized,
        status:
          USERNAME_AVAILABILITY_CHECK_STATUS
            .NOT_CONFIGURED,
        available: null,
        checked: false,
        reason:
          'availability_adapter_not_configured',
      });
    }

    try {
      const response =
        await configuredCheck(
          validation.normalized,
        );

      if (response?.available === true) {
        return freezeResult({
          username: validation.normalized,
          status:
            USERNAME_AVAILABILITY_CHECK_STATUS
              .AVAILABLE,
          available: true,
          checked: true,
          reason: null,
        });
      }

      if (response?.available === false) {
        return freezeResult({
          username: validation.normalized,
          status:
            USERNAME_AVAILABILITY_CHECK_STATUS
              .UNAVAILABLE,
          available: false,
          checked: true,
          reason:
            normalizeReason(
              response.reason,
              'username_unavailable',
            ),
        });
      }

      return freezeResult({
        username: validation.normalized,
        status:
          USERNAME_AVAILABILITY_CHECK_STATUS.ERROR,
        available: null,
        checked: false,
        reason:
          'invalid_availability_response',
      });
    } catch (_error) {
      return freezeResult({
        username: validation.normalized,
        status:
          USERNAME_AVAILABILITY_CHECK_STATUS.ERROR,
        available: null,
        checked: false,
        reason:
          'availability_check_failed',
      });
    }
  }

  return Object.freeze({
    checkUsernameAvailability,
  });
}

export const usernameAvailabilityAdapter =
  createUsernameAvailabilityAdapter();

export function checkUsernameAvailability(
  username,
) {
  return usernameAvailabilityAdapter
    .checkUsernameAvailability(username);
}

function freezeResult({
  username,
  status,
  available,
  checked,
  reason,
}) {
  return Object.freeze({
    schema:
      USERNAME_AVAILABILITY_CHECK_SCHEMA,
    username,
    status,
    available,
    checked,
    reason,
  });
}

function normalizeReason(
  value,
  fallback,
) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return fallback;
  }

  return value
    .trim()
    .slice(0, 120);
}
