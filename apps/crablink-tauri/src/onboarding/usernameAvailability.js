/**
 * RO:WHAT — Gateway-backed username availability hint adapter for CrabLink onboarding.
 * RO:WHY — FINAL_BETA Phase 1; release onboarding must use an existing public gateway read instead of a hidden development bypass.
 * RO:INTERACTS — WelcomeUsernameStep.jsx, onboardingModel.js, app/settings.js, gatewayClient.js, identityClient.js, and GET /identity/passport/profile/:username.
 * RO:INVARIANTS — only an exact profile_not_found 404 becomes an available hint; an existing profile is unavailable; every other failure fails closed; availability never claims ownership.
 * RO:METRICS — gateway requests retain the existing correlation-id behavior.
 * RO:CONFIG — configured CrabLink gateway settings and request timeout.
 * RO:SECURITY — read-only gateway lookup; no username claim, Passport mutation, wallet/ledger mutation, secret material, arbitrary URL, or direct internal-service call.
 * RO:TEST — welcomeUsernameStep.test.mjs and usernameAvailabilityGateway.test.mjs.
 * FINAL_BETA_PHASE1D_RELEASE_USERNAME_AVAILABILITY_V1
 */

import {
  loadAppSettings,
} from '../app/settings.js';

import {
  createGatewayClient,
} from '../shared/api/gatewayClient.js';

import {
  createIdentityClient,
} from '../shared/api/identityClient.js';

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

export function createGatewayUsernameAvailabilityCheck({
  loadSettings = loadAppSettings,
  createGateway = createGatewayClient,
  createIdentity = createIdentityClient,
} = {}) {
  requireFunction(
    loadSettings,
    'loadSettings',
  );

  requireFunction(
    createGateway,
    'createGateway',
  );

  requireFunction(
    createIdentity,
    'createIdentity',
  );

  return async function checkUsernameThroughGateway(
    username,
  ) {
    const loaded = await loadSettings();

    const settings =
      loaded?.settings &&
      typeof loaded.settings === 'object'
        ? loaded.settings
        : loaded || {};

    const gateway =
      createGateway(settings);

    const identity =
      createIdentity(gateway);

    if (
      !identity ||
      typeof identity.getPassportProfile !==
        'function'
    ) {
      throw new TypeError(
        'Username availability requires the gateway-backed public profile reader.',
      );
    }

    try {
      await identity.getPassportProfile(
        username,
        {
          label:
            'Username availability hint',
        },
      );

      return Object.freeze({
        available: false,
        reason:
          'username_profile_exists',
      });
    } catch (error) {
      const status = Number(
        error?.status || 0,
      );

      const reason =
        backendReason(error);

      if (
        status === 404 &&
        reason === 'profile_not_found'
      ) {
        return Object.freeze({
          available: true,
          reason: 'profile_not_found',
        });
      }

      throw error;
    }
  };
}

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

const gatewayUsernameAvailabilityCheck =
  createGatewayUsernameAvailabilityCheck();

export const usernameAvailabilityAdapter =
  createUsernameAvailabilityAdapter({
    check:
      gatewayUsernameAvailabilityCheck,
  });

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

function backendReason(error) {
  const value =
    error?.reason ||
    error?.data?.code ||
    error?.data?.reason ||
    '';

  return String(value)
    .trim()
    .toLowerCase();
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

function requireFunction(
  value,
  label,
) {
  if (typeof value !== 'function') {
    throw new TypeError(
      `${label} must be a function.`,
    );
  }
}
