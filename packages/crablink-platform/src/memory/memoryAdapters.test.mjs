import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMemoryDiagnosticsAdapter,
  createMemoryGatewayProfileAdapter,
  createMemoryReceiptDisplayAdapter,
  createMemorySettingsAdapter,
} from './index.js';

test(
  'memory settings snapshots are immutable and isolated',
  async () => {
    const initial = {
      theme: 'dark',
      nested: {
        resourceMode: 'balanced',
      },
    };

    const adapter =
      createMemorySettingsAdapter(initial);

    initial.theme = 'light';
    initial.nested.resourceMode = 'low';

    const snapshot =
      await adapter.readSettings();

    assert.deepEqual(
      snapshot,
      {
        theme: 'dark',
        nested: {
          resourceMode: 'balanced',
        },
      },
    );

    assert.equal(
      Object.isFrozen(snapshot),
      true,
    );

    assert.equal(
      Object.isFrozen(snapshot.nested),
      true,
    );
  },
);

test(
  'memory settings writes replace state without retaining caller references',
  async () => {
    const adapter =
      createMemorySettingsAdapter();

    const next = {
      theme: 'system',
      participation: {
        enabled: true,
      },
    };

    const written =
      await adapter.writeSettings(next);

    next.theme = 'light';
    next.participation.enabled = false;

    assert.deepEqual(
      written,
      {
        theme: 'system',
        participation: {
          enabled: true,
        },
      },
    );

    assert.deepEqual(
      await adapter.readSettings(),
      written,
    );
  },
);

test(
  'memory gateway profiles default to unconfigured without pairing or session',
  async () => {
    const adapter =
      createMemoryGatewayProfileAdapter();

    assert.deepEqual(
      await adapter.readGatewayProfile(),
      {
        state: 'unconfigured',
        configured: false,
        paired: false,
        sessionPresent: false,
        ready: false,
        transportAuthority: false,
      },
    );

    const reviewed =
      createMemoryGatewayProfileAdapter({
        state: 'reviewed',
        paired: true,
        sessionPresent: true,
        ready: true,
      });

    assert.deepEqual(
      await reviewed.readGatewayProfile(),
      {
        state: 'reviewed',
        configured: true,
        paired: false,
        sessionPresent: false,
        ready: false,
        transportAuthority: false,
      },
    );
  },
);

test(
  'memory diagnostics remain client only and native unavailable',
  async () => {
    const adapter =
      createMemoryDiagnosticsAdapter({
        app: 'CrabLink Test',
        profile: 'fixture',
        available: true,
        nativeBridge: true,
      });

    assert.deepEqual(
      await adapter.getDiagnostics(),
      {
        app: 'CrabLink Test',
        profile: 'fixture',
        available: false,
        clientOnly: true,
        nativeBridge: false,
        authority: 'display-only',
      },
    );
  },
);

test(
  'memory receipt fixtures are immutable display-only models',
  async () => {
    const adapter =
      createMemoryReceiptDisplayAdapter([
        {
          id: 'fixture-1',
          label: 'Unconfirmed test display',
          action: 'preview',
          amount: '0 ROC',
          backendDerived: false,
        },
      ]);

    const receipts =
      await adapter.listRecentReceipts();

    assert.equal(receipts.length, 1);
    assert.equal(
      Object.isFrozen(receipts),
      true,
    );

    assert.equal(
      Object.isFrozen(receipts[0]),
      true,
    );

    assert.deepEqual(
      receipts[0],
      {
        id: 'fixture-1',
        label: 'Unconfirmed test display',
        action: 'preview',
        amount: '0 ROC',
        displayOnly: true,
        backendDerived: false,
        accepted: false,
        paidEntitlementAuthority: false,
        confirmedRocAuthority: false,
        walletAuthority: false,
        ledgerAuthority: false,
        finalityAuthority: false,
        unlocksPaidContent: false,
        sessionPresent: false,
      },
    );
  },
);

test(
  'memory adapters reject unsupported data and backend authority claims',
  () => {
    assert.throws(
      () =>
        createMemorySettingsAdapter({
          bad: () => true,
        }),
      /plain data/,
    );

    assert.throws(
      () =>
        createMemoryGatewayProfileAdapter({
          state: 'paired',
        }),
      /state is invalid/,
    );

    assert.throws(
      () =>
        createMemoryReceiptDisplayAdapter([
          {
            id: 'bad-1',
            label: 'Bad fixture',
            backendDerived: true,
          },
        ]),
      /cannot claim backend receipt truth/,
    );

    assert.throws(
      () =>
        createMemoryReceiptDisplayAdapter([
          {
            id: 'bad-2',
            label: 'Bad fixture',
            unlocksPaidContent: true,
          },
        ]),
      /cannot claim backend receipt truth/,
    );
  },
);
