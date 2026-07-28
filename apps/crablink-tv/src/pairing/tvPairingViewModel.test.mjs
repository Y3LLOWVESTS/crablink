import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeTvDeviceName,
  normalizeTvPairingBeginFailure,
  projectTvPairingBeginSuccess,
} from './tvPairingBeginInteraction.js';

import {
  normalizeTvGatewayProfile,
  normalizeTvPairingBeginResponse,
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

test('pairing begin response accepts bounded waiting truth only', () => {
  const response =
    normalizeTvPairingBeginResponse(
      {
        schema:
          'crablink.tv.pairing-begin-response.v1',
        state: 'waiting',
        challengeHandle:
          'challenge_12345678',
        pairingCode: 'ABC234',
        expiresAt:
          '2030-01-02T03:04:05Z',
        approvalAuthority:
          'companion-crablink-required',

        // Unknown input fields are never copied into the
        // normalized frontend projection.
        token: 'discarded',
        walletKey: 'discarded',
      },
      Date.parse(
        '2026-07-16T22:00:00Z',
      ),
    );

  assert.equal(response.state, 'waiting');

  assert.equal(
    response.challengeHandle,
    'challenge_12345678',
  );

  assert.equal(
    response.pairingCode,
    'ABC234',
  );

  assert.equal(
    response.expiresAt,
    '2030-01-02T03:04:05Z',
  );

  assert.equal(
    response.sessionPresent,
    false,
  );

  assert.equal(
    response.approvalAuthority,
    'companion-crablink-required',
  );

  assert.equal(
    'token' in response,
    false,
  );

  assert.equal(
    'walletKey' in response,
    false,
  );
});

test('malformed pairing begin response fails closed', () => {
  const malformed =
    normalizeTvPairingBeginResponse(
      {
        schema: 'wrong.schema',
        state: 'paired',
        challengeHandle: 'short',
        pairingCode: 'ABC10I',
        expiresAt: 'not-a-time',
        approvalAuthority:
          'self-approved',
        sessionPresent: true,
      },
      Date.parse(
        '2026-07-16T22:00:00Z',
      ),
    );

  assert.equal(
    malformed.state,
    'error',
  );

  assert.equal(
    malformed.challengeHandle,
    null,
  );

  assert.equal(
    malformed.pairingCode,
    null,
  );

  assert.equal(
    malformed.expiresAt,
    null,
  );

  assert.equal(
    malformed.sessionPresent,
    false,
  );

  assert.equal(
    malformed.errorCode,
    'pairing_begin_response_invalid',
  );

  const expired =
    normalizeTvPairingBeginResponse(
      {
        schema:
          'crablink.tv.pairing-begin-response.v1',
        state: 'waiting',
        challengeHandle:
          'challenge_12345678',
        pairingCode: 'ABC234',
        expiresAt:
          '2020-01-02T03:04:05Z',
        approvalAuthority:
          'companion-crablink-required',
      },
      Date.parse(
        '2026-07-16T22:00:00Z',
      ),
    );

  assert.equal(
    expired.state,
    'error',
  );

  assert.equal(
    expired.pairingCode,
    null,
  );

  assert.equal(
    expired.sessionPresent,
    false,
  );
});

test('pairing device name is trimmed and byte bounded', () => {
  assert.equal(
    normalizeTvDeviceName(
      '  Living Room TV  ',
    ),
    'Living Room TV',
  );

  assert.equal(
    normalizeTvDeviceName(''),
    null,
  );

  assert.equal(
    normalizeTvDeviceName(
      'Living\u0000Room',
    ),
    null,
  );

  assert.equal(
    normalizeTvDeviceName(
      'é'.repeat(33),
    ),
    null,
  );
});

test('pairing begin success projects waiting without session', () => {
  const projected =
    projectTvPairingBeginSuccess(
      READY_GATEWAY,
      {
        schema:
          'crablink.tv.pairing-begin-response.v1',
        state: 'waiting',
        challengeHandle:
          'challenge_12345678',
        pairingCode: 'ABC234',
        expiresAt:
          '2030-01-02T03:04:05Z',
        approvalAuthority:
          'companion-crablink-required',
      },
      Date.parse(
        '2026-07-17T00:00:00Z',
      ),
    );

  assert.ok(projected);

  assert.equal(
    projected.view.kind,
    'waiting',
  );

  assert.equal(
    projected.view.pairingCode,
    'ABC234',
  );

  assert.equal(
    projected.view.sessionPresent,
    false,
  );

  assert.equal(
    projected.response.challengeHandle,
    'challenge_12345678',
  );
});

test('pairing begin failure discards unknown fields', () => {
  const failure =
    normalizeTvPairingBeginFailure({
      schema:
        'crablink.tv.pairing-contract-error.v1',
      code:
        'pairing_begin_unavailable',
      retryable: true,
      token: 'discarded',
      walletKey: 'discarded',
      rawResponse: 'discarded',
    });

  assert.equal(
    failure.code,
    'pairing_begin_unavailable',
  );

  assert.equal(
    failure.retryable,
    true,
  );

  assert.equal(
    failure.sessionPresent,
    false,
  );

  assert.equal(
    'token' in failure,
    false,
  );

  assert.equal(
    'walletKey' in failure,
    false,
  );

  assert.equal(
    'rawResponse' in failure,
    false,
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
