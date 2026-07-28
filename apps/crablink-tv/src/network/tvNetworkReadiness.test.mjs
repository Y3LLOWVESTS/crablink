import assert from 'node:assert/strict';
import test from 'node:test';

import {
  projectTvNetworkReadiness,
} from './tvNetworkReadiness.js';

function settings(overrides = {}) {
  return {
    schema:
      'crablink.tv.settings-snapshot.v3',

    gatewayState: 'ready',
    gatewayProfile: 'release-https',

    gatewayDisplayLabel:
      'Managed HTTPS gateway',

    gatewayConnectionAllowed: true,
    gatewayDevelopmentProfile: false,

    gatewayOriginDisclosure:
      'redacted',

    requestTimeoutMs: 5_000,
    releaseHttpsRequired: true,

    settingsAuthority:
      'local-ui-preferences-only',

    ...overrides,
  };
}

function health(overrides = {}) {
  return {
    schema:
      'crablink.tv.gateway-health-result.v1',

    state: 'healthy',
    healthy: true,
    status: 200,
    responseBytes: 2,
    retryable: false,
    errorCode: null,

    ...overrides,
  };
}

test(
  'managed profile is redacted and ready for manual check',
  () => {
    const readiness =
      projectTvNetworkReadiness({
        settingsSnapshot:
          settings(),
      });

    assert.equal(
      readiness.status,
      'ready_to_check',
    );

    assert.equal(
      readiness.originDisclosure,
      'redacted',
    );

    assert.equal(
      readiness.developmentProfile,
      false,
    );

    assert.equal(
      readiness.canRetry,
      true,
    );

    assert.equal(
      readiness.healthy,
      false,
    );
  },
);

test(
  'development LAN profile remains visibly marked',
  () => {
    const readiness =
      projectTvNetworkReadiness({
        settingsSnapshot:
          settings({
            gatewayProfile:
              'development-lan',

            gatewayDisplayLabel:
              'Private development LAN',

            gatewayDevelopmentProfile:
              true,
          }),
      });

    assert.equal(
      readiness.environmentProfile,
      'development-lan',
    );

    assert.equal(
      readiness.developmentProfile,
      true,
    );

    assert.equal(
      readiness.displayLabel,
      'Private development LAN',
    );
  },
);

test(
  'unconfigured and invalid profiles never become healthy',
  () => {
    const unconfigured =
      projectTvNetworkReadiness({
        settingsSnapshot:
          settings({
            gatewayState:
              'unconfigured',

            gatewayProfile:
              'unconfigured',

            gatewayDisplayLabel:
              'Gateway not configured',

            gatewayConnectionAllowed:
              false,
          }),
      });

    assert.equal(
      unconfigured.status,
      'unconfigured',
    );

    assert.equal(
      unconfigured.healthy,
      false,
    );

    const malformed =
      projectTvNetworkReadiness({
        settingsSnapshot:
          settings({
            gatewayOriginDisclosure:
              'https://hidden.example',
          }),
      });

    assert.equal(
      malformed.status,
      'idle',
    );

    assert.equal(
      malformed.healthy,
      false,
    );
  },
);

test(
  'healthy and retryable unavailable results remain distinct',
  () => {
    const healthy =
      projectTvNetworkReadiness({
        settingsSnapshot:
          settings(),

        healthResult:
          health(),
      });

    assert.equal(
      healthy.status,
      'healthy',
    );

    assert.equal(
      healthy.healthy,
      true,
    );

    const unavailable =
      projectTvNetworkReadiness({
        settingsSnapshot:
          settings(),

        healthResult:
          health({
            state:
              'unavailable',

            healthy: false,
            status: 0,
            responseBytes: 0,
            retryable: true,

            errorCode:
              'gateway_health_connect_failed',
          }),
      });

    assert.equal(
      unavailable.status,
      'unavailable',
    );

    assert.equal(
      unavailable.healthy,
      false,
    );

    assert.equal(
      unavailable.retryRecommended,
      true,
    );

    assert.equal(
      unavailable.canRetry,
      true,
    );
  },
);

test(
  'malformed health result fails closed without fake readiness',
  () => {
    const readiness =
      projectTvNetworkReadiness({
        settingsSnapshot:
          settings(),

        healthResult:
          health({
            healthy: true,
            state: 'unavailable',
          }),
      });

    assert.equal(
      readiness.status,
      'rejected',
    );

    assert.equal(
      readiness.healthy,
      false,
    );

    assert.equal(
      readiness.errorClass,
      'gateway_health_result_invalid',
    );
  },
);
