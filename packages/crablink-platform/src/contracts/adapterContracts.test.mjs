import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDiagnosticsPort,
  createGatewayHealthPort,
  createGatewayPort,
  createGatewayProfilePort,
  createReadonlySettingsPort,
  createSettingsPort,
} from '../index.js';

test(
  'diagnostics port exposes exactly one immutable method',
  () => {
    const getDiagnostics = async () => ({
      clientOnly: true,
    });

    const port = createDiagnosticsPort({
      getDiagnostics,
      hiddenAuthority: async () => true,
    });

    assert.deepEqual(
      Object.keys(port),
      ['getDiagnostics'],
    );

    assert.equal(
      port.getDiagnostics,
      getDiagnostics,
    );

    assert.equal(
      Object.isFrozen(port),
      true,
    );

    assert.equal(
      port.hiddenAuthority,
      undefined,
    );
  },
);

test(
  'gateway request port exposes only health ready and resolve',
  () => {
    const health = async () => 'health';
    const ready = async () => 'ready';
    const resolveCrabUrl = async () => 'resolve';

    const port = createGatewayPort({
      health,
      ready,
      resolveCrabUrl,
      arbitraryFetch: async () => 'forbidden',
    });

    assert.deepEqual(
      Object.keys(port),
      [
        'health',
        'ready',
        'resolveCrabUrl',
      ],
    );

    assert.equal(port.health, health);
    assert.equal(port.ready, ready);
    assert.equal(
      port.resolveCrabUrl,
      resolveCrabUrl,
    );

    assert.equal(
      port.arbitraryFetch,
      undefined,
    );
  },
);

test(
  'gateway health port exposes one immutable manual check',
  async () => {
    const checkGatewayHealth =
      async () => ({
        state: 'unavailable',
        retryable: true,
      });

    const port =
      createGatewayHealthPort({
        checkGatewayHealth,
        arbitraryFetch:
          async () => undefined,
      });

    assert.deepEqual(
      Object.keys(port),
      ['checkGatewayHealth'],
    );

    assert.equal(
      port.checkGatewayHealth,
      checkGatewayHealth,
    );

    assert.equal(
      Object.isFrozen(port),
      true,
    );

    assert.equal(
      port.arbitraryFetch,
      undefined,
    );

    assert.deepEqual(
      await port.checkGatewayHealth(),
      {
        state: 'unavailable',
        retryable: true,
      },
    );
  },
);

test(
  'gateway profile port remains separate and read only',
  async () => {
    const readGatewayProfile =
      async () => ({
        state: 'unconfigured',
      });

    const port =
      createGatewayProfilePort({
        readGatewayProfile,
        writeGatewayProfile:
          async () => undefined,
      });

    assert.deepEqual(
      Object.keys(port),
      ['readGatewayProfile'],
    );

    assert.deepEqual(
      await port.readGatewayProfile(),
      {
        state: 'unconfigured',
      },
    );

    assert.equal(
      port.writeGatewayProfile,
      undefined,
    );
  },
);

test(
  'settings port exposes exact read and write methods',
  () => {
    const readSettings = async () => ({});
    const writeSettings =
      async (settings) => settings;

    const port = createSettingsPort({
      readSettings,
      writeSettings,
      deleteSettings:
        async () => undefined,
    });

    assert.deepEqual(
      Object.keys(port),
      [
        'readSettings',
        'writeSettings',
      ],
    );

    assert.equal(
      port.readSettings,
      readSettings,
    );

    assert.equal(
      port.writeSettings,
      writeSettings,
    );

    assert.equal(
      port.deleteSettings,
      undefined,
    );
  },
);

test(
  'readonly settings port cannot acquire write authority',
  () => {
    const readSettings = async () => ({
      settingsAuthority:
        'local-ui-preferences-only',
    });

    const port =
      createReadonlySettingsPort({
        readSettings,
        writeSettings:
          async () => undefined,
      });

    assert.deepEqual(
      Object.keys(port),
      ['readSettings'],
    );

    assert.equal(
      port.writeSettings,
      undefined,
    );
  },
);

test(
  'ports fail closed when required methods are absent',
  () => {
    assert.throws(
      () =>
        createDiagnosticsPort({}),
      /requires getDiagnostics/,
    );

    assert.throws(
      () =>
        createGatewayPort({
          health: async () => undefined,
          ready: async () => undefined,
        }),
      /requires resolveCrabUrl/,
    );

    assert.throws(
      () =>
        createGatewayHealthPort({}),
      /requires checkGatewayHealth/,
    );

    assert.throws(
      () =>
        createSettingsPort({
          readSettings: async () => undefined,
          writeSettings: 'not-a-function',
        }),
      /requires writeSettings/,
    );
  },
);

test(
  'port construction performs no calls and does not mutate input',
  () => {
    let callCount = 0;

    const methods = {
      getDiagnostics: async () => {
        callCount += 1;
      },
      extra: async () => {
        callCount += 100;
      },
    };

    const snapshot = {
      ...methods,
    };

    const port =
      createDiagnosticsPort(methods);

    assert.equal(callCount, 0);

    assert.deepEqual(
      methods,
      snapshot,
    );

    assert.equal(
      Object.isFrozen(methods),
      false,
    );

    assert.equal(
      Object.isFrozen(port),
      true,
    );
  },
);

test(
  'ports preserve adapter results and errors without inventing success',
  async () => {
    const expected = {
      state: 'blocked',
      retryable: false,
    };

    const gateway =
      createGatewayProfilePort({
        readGatewayProfile:
          async () => expected,
      });

    assert.equal(
      await gateway.readGatewayProfile(),
      expected,
    );

    const expectedError =
      new Error('native unavailable');

    const diagnostics =
      createDiagnosticsPort({
        getDiagnostics: async () => {
          throw expectedError;
        },
      });

    await assert.rejects(
      diagnostics.getDiagnostics(),
      (error) => error === expectedError,
    );
  },
);
