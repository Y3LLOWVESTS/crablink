/**
 * Frontend-only pairing-begin input and result projection.
 *
 * This module does not perform transport, generate challenges, approve
 * pairing, create sessions, or persist credentials. Native Rust owns the
 * fixed-path request and validates the authoritative backend response.
 */

import {
  normalizeTvPairingBeginResponse,
  projectTvPairingView,
} from './tvPairingViewModel.js';

const MAX_DEVICE_NAME_BYTES = 64;

const CONTROL_CHARACTERS =
  /[\u0000-\u001f\u007f-\u009f]/u;

const ERROR_CODE =
  /^[a-z][a-z0-9_]{0,95}$/;

function encodedLength(value) {
  return new TextEncoder()
    .encode(value)
    .byteLength;
}

export function normalizeTvDeviceName(
  value,
) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (
    trimmed.length === 0 ||
    CONTROL_CHARACTERS.test(trimmed) ||
    encodedLength(trimmed) >
      MAX_DEVICE_NAME_BYTES
  ) {
    return null;
  }

  return trimmed;
}

export function normalizeTvPairingBeginFailure(
  value,
) {
  const code =
    typeof value?.code === 'string' &&
    ERROR_CODE.test(value.code)
      ? value.code
      : 'pairing_begin_failed';

  return {
    schema:
      'crablink.tv.pairing-contract-error.v1',
    code,
    retryable:
      value?.retryable === true,
    sessionPresent: false,
  };
}

export function projectTvPairingBeginSuccess(
  gatewayValue,
  responseValue,
  nowMs = Date.now(),
) {
  const response =
    normalizeTvPairingBeginResponse(
      responseValue,
      nowMs,
    );

  if (response.state !== 'waiting') {
    return null;
  }

  const view = projectTvPairingView(
    gatewayValue,
    {
      schema:
        'crablink.tv.pairing-status.v1',
      state: 'waiting',
      gatewayState: 'ready',
      pairingCode:
        response.pairingCode,
      expiresAt:
        response.expiresAt,
      sessionPresent: false,
      approvalAuthority:
        response.approvalAuthority,
      message:
        'Waiting for root-admin device authorization.',
    },
  );

  if (
    view.kind !== 'waiting' ||
    view.sessionPresent
  ) {
    return null;
  }

  return {
    response,
    view,
  };
}
