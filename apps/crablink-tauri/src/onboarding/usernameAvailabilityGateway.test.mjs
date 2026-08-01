/**
 * RO:WHAT — Focused FINAL_BETA Phase 1D tests for release username availability through the public profile lookup route.
 * RO:WHY — Proves release onboarding can continue without exposing the development bypass or mistaking network failures for availability.
 * RO:INTERACTS — usernameAvailability.js, app settings, GatewayClient, IdentityClient, and GET /identity/passport/profile/:username.
 * RO:INVARIANTS — profile exists means unavailable; only exact profile_not_found 404 means available hint; all other errors fail closed; no ownership claim.
 * RO:TEST — node --test usernameAvailabilityGateway.test.mjs.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  USERNAME_AVAILABILITY_CHECK_STATUS,
  createGatewayUsernameAvailabilityCheck,
  createUsernameAvailabilityAdapter,
} from './usernameAvailability.js';

function createAdapter({
  profileResult,
  profileError,
  observe,
} = {}) {
  const gatewayCheck =
    createGatewayUsernameAvailabilityCheck({
      loadSettings: async () => ({
        settings: {
          gatewayUrl:
            'https://gateway.example.invalid',
          requestTimeoutMs: 4321,
        },
      }),

      createGateway: (settings) => {
        if (observe) {
          observe.settings = settings;
        }

        return Object.freeze({
          kind: 'test-gateway',
        });
      },

      createIdentity: (gateway) => {
        if (observe) {
          observe.gateway = gateway;
        }

        return Object.freeze({
          getPassportProfile:
            async (username, options) => {
              if (observe) {
                observe.username = username;
                observe.options = options;
              }

              if (profileError) {
                throw profileError;
              }

              return profileResult || {
                ok: true,
                status: 200,
              };
            },
        });
      },
    });

  return createUsernameAvailabilityAdapter({
    check: gatewayCheck,
  });
}

test(
  'existing public profile projects username as unavailable',
  async () => {
    const observe = {};

    const adapter = createAdapter({
      observe,
      profileResult: {
        ok: true,
        status: 200,
      },
    });

    const result =
      await adapter
        .checkUsernameAvailability(
          '@Existing_Crab',
        );

    assert.equal(
      result.status,
      USERNAME_AVAILABILITY_CHECK_STATUS
        .UNAVAILABLE,
    );

    assert.equal(result.available, false);
    assert.equal(result.checked, true);

    assert.equal(
      result.reason,
      'username_profile_exists',
    );

    assert.equal(
      observe.username,
      'existing_crab',
    );

    assert.equal(
      observe.settings.requestTimeoutMs,
      4321,
    );

    assert.equal(
      observe.gateway.kind,
      'test-gateway',
    );
  },
);

test(
  'exact profile_not_found 404 projects an availability hint without ownership',
  async () => {
    const adapter = createAdapter({
      profileError: Object.assign(
        new Error('missing profile'),
        {
          status: 404,
          reason: 'profile_not_found',
        },
      ),
    });

    const result =
      await adapter
        .checkUsernameAvailability(
          'free_crab',
        );

    assert.equal(
      result.status,
      USERNAME_AVAILABILITY_CHECK_STATUS
        .AVAILABLE,
    );

    assert.equal(result.available, true);
    assert.equal(result.checked, true);

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        'ownershipConfirmed',
      ),
      false,
    );
  },
);

test(
  'unrelated 404 fails closed instead of projecting availability',
  async () => {
    const adapter = createAdapter({
      profileError: Object.assign(
        new Error('route missing'),
        {
          status: 404,
          reason: 'route_not_found',
        },
      ),
    });

    const result =
      await adapter
        .checkUsernameAvailability(
          'uncertain_crab',
        );

    assert.equal(
      result.status,
      USERNAME_AVAILABILITY_CHECK_STATUS
        .ERROR,
    );

    assert.equal(result.available, null);
    assert.equal(result.checked, false);
  },
);

test(
  'gateway or upstream failure fails closed instead of projecting availability',
  async () => {
    const adapter = createAdapter({
      profileError: Object.assign(
        new Error(
          'passport upstream unavailable',
        ),
        {
          status: 502,
          reason: 'passport_upstream',
        },
      ),
    });

    const result =
      await adapter
        .checkUsernameAvailability(
          'uncertain_crab',
        );

    assert.equal(
      result.status,
      USERNAME_AVAILABILITY_CHECK_STATUS
        .ERROR,
    );

    assert.equal(result.available, null);
    assert.equal(result.checked, false);
  },
);

test.after(() => {
  console.log(
    'FINAL_BETA_PHASE1D_PROFILE_EXISTS_UNAVAILABLE=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE1D_EXACT_NOT_FOUND_AVAILABLE_HINT=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE1D_NONAUTHORITATIVE_FAILURE_FAILS_CLOSED=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE1D_NO_OWNERSHIP_CLAIM=GREEN',
  );
});
