import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTvNetworkReadinessInteraction,
} from './tvNetworkReadinessInteraction.js';

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

function deferred() {
  let resolve;
  let reject;

  const promise = new Promise(
    (resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    },
  );

  return {
    promise,
    resolve,
    reject,
  };
}

test(
  'profile load reads settings without running health transport',
  async () => {
    let settingsReads = 0;
    let healthChecks = 0;
    const states = [];

    const interaction =
      createTvNetworkReadinessInteraction({
        readSettings: async () => {
          settingsReads += 1;
          return settings();
        },
        checkGatewayHealth: async () => {
          healthChecks += 1;
          return health();
        },
        onState: (state) => {
          states.push(state);
        },
      });

    const state =
      await interaction.loadProfile();

    assert.equal(settingsReads, 1);
    assert.equal(healthChecks, 0);
    assert.equal(states.length, 1);
    assert.equal(
      state.view.status,
      'ready_to_check',
    );
    assert.equal(
      state.manualCheckAttempted,
      false,
    );
  },
);

test(
  'manual check reads settings then invokes one fixed health operation',
  async () => {
    const calls = [];

    const states = [];

    const interaction =
      createTvNetworkReadinessInteraction({
        readSettings: async () => {
          calls.push('settings');
          return settings();
        },
        checkGatewayHealth: async () => {
          calls.push('health');
          return health();
        },
        onState: (state) => {
          states.push(state);
        },
      });

    const operation =
      interaction.checkConnection();

    assert.equal(
      states[0].checking,
      true,
    );

    const state = await operation;

    assert.deepEqual(
      calls,
      ['settings', 'health'],
    );
    assert.equal(
      state.view.status,
      'healthy',
    );
    assert.equal(
      state.view.healthy,
      true,
    );
    assert.equal(
      state.manualCheckAttempted,
      true,
    );
  },
);

test(
  'duplicate manual checks share one in-flight operation',
  async () => {
    const settingsResult = deferred();
    const healthResult = deferred();
    let settingsReads = 0;
    let healthChecks = 0;

    const interaction =
      createTvNetworkReadinessInteraction({
        readSettings: () => {
          settingsReads += 1;
          return settingsResult.promise;
        },
        checkGatewayHealth: () => {
          healthChecks += 1;
          return healthResult.promise;
        },
      });

    const first =
      interaction.checkConnection();
    const second =
      interaction.checkConnection();

    assert.equal(first, second);
    assert.equal(settingsReads, 1);
    assert.equal(healthChecks, 0);

    settingsResult.resolve(settings());
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(healthChecks, 1);

    healthResult.resolve(health());

    const state = await first;

    assert.equal(
      state.view.status,
      'healthy',
    );
  },
);

test(
  'settings failure blocks health execution and fails closed',
  async () => {
    let healthChecks = 0;

    const interaction =
      createTvNetworkReadinessInteraction({
        readSettings: async () => {
          throw new Error(
            'raw native settings failure',
          );
        },
        checkGatewayHealth: async () => {
          healthChecks += 1;
          return health();
        },
      });

    const state =
      await interaction.checkConnection();

    assert.equal(healthChecks, 0);
    assert.equal(
      state.view.status,
      'unavailable',
    );
    assert.equal(
      state.view.healthy,
      false,
    );
    assert.equal(
      state.view.errorClass,
      'native_host_unavailable',
    );
    assert.equal(
      JSON.stringify(state).includes(
        'raw native settings failure',
      ),
      false,
    );
  },
);

test(
  'health failure preserves only the redacted settings snapshot',
  async () => {
    const interaction =
      createTvNetworkReadinessInteraction({
        readSettings: async () =>
          settings(),
        checkGatewayHealth: async () => {
          throw {
            message:
              'failed https://secret.example/healthz',
            origin:
              'https://secret.example',
          };
        },
      });

    const state =
      await interaction.checkConnection();

    assert.equal(
      state.view.status,
      'unavailable',
    );
    assert.equal(
      state.view.displayLabel,
      'Managed HTTPS gateway',
    );
    assert.equal(
      state.view.originDisclosure,
      'redacted',
    );
    assert.equal(
      state.view.requestTimeoutMs,
      5_000,
    );
    assert.equal(
      state.view.errorClass,
      'native_host_unavailable',
    );

    const serialized =
      JSON.stringify(state);

    assert.equal(
      serialized.includes(
        'secret.example',
      ),
      false,
    );
    assert.equal(
      serialized.includes(
        '/healthz',
      ),
      false,
    );
  },
);

test(
  'manual check supersedes a slower mount profile read',
  async () => {
    const slowProfile = deferred();
    let settingsReads = 0;

    const interaction =
      createTvNetworkReadinessInteraction({
        readSettings: () => {
          settingsReads += 1;

          return settingsReads === 1
            ? slowProfile.promise
            : Promise.resolve(settings());
        },
        checkGatewayHealth: async () =>
          health(),
      });

    const profileLoad =
      interaction.loadProfile();

    const checked =
      await interaction.checkConnection();

    assert.equal(
      checked.view.status,
      'healthy',
    );

    slowProfile.resolve(
      settings({
        gatewayDisplayLabel:
          'Stale profile result',
      }),
    );

    await profileLoad;

    const finalState =
      interaction.getState();

    assert.equal(
      finalState.view.status,
      'healthy',
    );
    assert.equal(
      finalState.view.displayLabel,
      'Managed HTTPS gateway',
    );
  },
);
