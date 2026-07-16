import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeTvGatewayProfile,
  normalizeTvPairingStatus,
  projectTvPairingView,
} from './tvPairingViewModel.js';

const READY_GATEWAY = {
  schema: 'crablink.tv.gateway-profile.v1',
  state: 'ready',
  environmentProfile: 'development-lan',
  origin: 'http://192.168.1.50:8090',
  transport: 'development-lan-http',
  pairingPath: '/v1/tv/pairing',
  requestTimeoutMs: 5000,
  errorCode: null,
};

test('unconfigured gateway cannot invent a pairing code', () => {
  const view = projectTvPairingView(
    {
      state: 'unconfigured',
    },
    {
      state: 'blocked_unconfigured',
      gatewayState: 'unconfigured',
      pairingCode: 'ABC234',
      sessionPresent: true,
    },
  );

  assert.equal(view.kind, 'setup');
  assert.equal(view.pairingCode, null);
  assert.equal(
    view.sessionPresent,
    false,
  );
});

test('reviewed gateway can become ready without claiming pairing', () => {
  const view = projectTvPairingView(
    READY_GATEWAY,
    {
      state: 'ready_to_begin',
      gatewayState: 'ready',
      sessionPresent: false,
      approvalAuthority:
        'companion-crablink-required',
    },
  );

  assert.equal(view.kind, 'ready');
  assert.equal(view.pairingCode, null);
  assert.equal(
    view.sessionPresent,
    false,
  );
});

test('waiting state requires a strict code and expiry', () => {
  const malformed = projectTvPairingView(
    READY_GATEWAY,
    {
      state: 'waiting',
      gatewayState: 'ready',
      pairingCode: '123',
      expiresAt: 'not-a-time',
    },
  );

  assert.equal(
    malformed.kind,
    'problem',
  );

  const accepted = projectTvPairingView(
    READY_GATEWAY,
    {
      state: 'waiting',
      gatewayState: 'ready',
      pairingCode: 'ABC234',
      expiresAt:
        '2026-07-16T22:00:00Z',
    },
  );

  assert.equal(
    accepted.kind,
    'waiting',
  );

  assert.equal(
    accepted.pairingCode,
    'ABC234',
  );
});

test('paired label without native session truth fails closed', () => {
  const view = projectTvPairingView(
    READY_GATEWAY,
    {
      state: 'paired',
      gatewayState: 'ready',
      sessionPresent: false,
    },
  );

  assert.equal(view.kind, 'problem');
  assert.equal(
    view.sessionPresent,
    false,
  );
});

test('normalizers discard credentials and unknown secret fields', () => {
  const gateway =
    normalizeTvGatewayProfile({
      ...READY_GATEWAY,
      origin:
        'https://user:secret@gateway.example',
      privateKey: 'forbidden',
    });

  const pairing =
    normalizeTvPairingStatus({
      state: 'waiting',
      gatewayState: 'ready',
      pairingCode: 'ABC234',
      expiresAt:
        '2026-07-16T22:00:00Z',
      token: 'forbidden',
      seedPhrase: 'forbidden',
    });

  assert.equal(gateway.origin, null);
  assert.equal(
    'privateKey' in gateway,
    false,
  );

  assert.equal('token' in pairing, false);
  assert.equal(
    'seedPhrase' in pairing,
    false,
  );
});
