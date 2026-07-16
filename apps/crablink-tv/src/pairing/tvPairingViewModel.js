/**
 * Display-only normalization for gateway and pairing command results.
 *
 * Unknown fields are discarded. A pairing code is shown only for a valid
 * waiting state. A paired state is accepted only when native truth says a
 * device-bound session is present.
 */

const GATEWAY_STATES = new Set([
  'unconfigured',
  'ready',
  'invalid',
]);

const PAIRING_STATES = new Set([
  'blocked_unconfigured',
  'blocked_invalid_gateway',
  'ready_to_begin',
  'waiting',
  'paired',
  'expired',
  'denied',
  'cancelled',
  'error',
]);

function safeString(
  value,
  maximumLength,
) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (
    trimmed.length === 0 ||
    trimmed.length > maximumLength
  ) {
    return null;
  }

  return trimmed;
}

function safeOrigin(value) {
  const raw = safeString(value, 512);

  if (!raw) {
    return null;
  }

  try {
    const parsed = new URL(raw);

    if (
      !['http:', 'https:'].includes(
        parsed.protocol,
      ) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

function safePairingCode(value) {
  const code = safeString(value, 12);

  if (!code || !/^[A-Z2-9]{6}$/.test(code)) {
    return null;
  }

  return code;
}

function safeExpiry(value) {
  const expiry = safeString(value, 64);

  if (
    !expiry ||
    !Number.isFinite(Date.parse(expiry))
  ) {
    return null;
  }

  return expiry;
}

export function normalizeTvGatewayProfile(
  value,
) {
  const state = GATEWAY_STATES.has(
    value?.state,
  )
    ? value.state
    : 'invalid';

  return {
    schema:
      value?.schema ===
      'crablink.tv.gateway-profile.v1'
        ? value.schema
        : 'crablink.tv.gateway-profile.v1',
    state,
    environmentProfile:
      safeString(
        value?.environmentProfile,
        64,
      ) ?? 'invalid',
    origin:
      state === 'ready'
        ? safeOrigin(value?.origin)
        : null,
    transport:
      safeString(value?.transport, 64) ??
      'none',
    pairingPath:
      value?.pairingPath ===
      '/v1/tv/pairing'
        ? value.pairingPath
        : '/v1/tv/pairing',
    requestTimeoutMs:
      Number.isSafeInteger(
        value?.requestTimeoutMs,
      )
        ? Math.min(
            30_000,
            Math.max(
              1_000,
              value.requestTimeoutMs,
            ),
          )
        : 5_000,
    errorCode:
      state === 'invalid'
        ? safeString(value?.errorCode, 96)
        : null,
  };
}

export function normalizeTvPairingStatus(
  value,
) {
  const state = PAIRING_STATES.has(
    value?.state,
  )
    ? value.state
    : 'error';

  const pairingCode =
    state === 'waiting'
      ? safePairingCode(
          value?.pairingCode,
        )
      : null;

  const expiresAt =
    state === 'waiting'
      ? safeExpiry(value?.expiresAt)
      : null;

  return {
    schema:
      'crablink.tv.pairing-status.v1',
    state,
    gatewayState:
      GATEWAY_STATES.has(
        value?.gatewayState,
      )
        ? value.gatewayState
        : 'invalid',
    pairingCode,
    expiresAt,
    sessionPresent:
      value?.sessionPresent === true,
    approvalAuthority:
      value?.approvalAuthority ===
      'companion-crablink-required'
        ? value.approvalAuthority
        : 'companion-crablink-required',
    message:
      safeString(value?.message, 320) ??
      'No pairing status message was provided.',
  };
}

export function projectTvPairingView(
  gatewayValue,
  pairingValue,
) {
  const gateway =
    normalizeTvGatewayProfile(
      gatewayValue,
    );

  const pairing =
    normalizeTvPairingStatus(
      pairingValue,
    );

  if (
    gateway.state === 'invalid' ||
    pairing.state ===
      'blocked_invalid_gateway'
  ) {
    return {
      kind: 'problem',
      title: 'Gateway profile needs attention',
      message:
        'Pairing remains blocked until the native gateway profile passes validation.',
      gateway,
      pairing,
      pairingCode: null,
      sessionPresent: false,
    };
  }

  if (
    gateway.state === 'unconfigured' ||
    pairing.state ===
      'blocked_unconfigured'
  ) {
    return {
      kind: 'setup',
      title: 'Gateway profile not configured',
      message:
        'Configure a release HTTPS or explicit development LAN gateway before pairing.',
      gateway,
      pairing,
      pairingCode: null,
      sessionPresent: false,
    };
  }

  if (pairing.state === 'ready_to_begin') {
    return {
      kind: 'ready',
      title: 'Ready for a backend pairing request',
      message:
        'No pairing challenge exists yet. A future native request must obtain it from the reviewed gateway.',
      gateway,
      pairing,
      pairingCode: null,
      sessionPresent: false,
    };
  }

  if (pairing.state === 'waiting') {
    if (
      !pairing.pairingCode ||
      !pairing.expiresAt
    ) {
      return {
        kind: 'problem',
        title: 'Malformed pairing challenge rejected',
        message:
          'CrabLink TV refused to display an incomplete pairing challenge.',
        gateway,
        pairing,
        pairingCode: null,
        sessionPresent: false,
      };
    }

    return {
      kind: 'waiting',
      title: 'Approve this TV from CrabLink',
      message:
        'Enter the short code in a trusted desktop or mobile CrabLink companion.',
      gateway,
      pairing,
      pairingCode: pairing.pairingCode,
      sessionPresent: false,
    };
  }

  if (pairing.state === 'paired') {
    if (!pairing.sessionPresent) {
      return {
        kind: 'problem',
        title: 'Unconfirmed session rejected',
        message:
          'A paired label without native device-bound session truth is not accepted.',
        gateway,
        pairing,
        pairingCode: null,
        sessionPresent: false,
      };
    }

    return {
      kind: 'paired',
      title: 'TV session confirmed',
      message:
        'The native layer reports a device-bound session. No wallet key or reward authority moved to the TV.',
      gateway,
      pairing,
      pairingCode: null,
      sessionPresent: true,
    };
  }

  return {
    kind: 'problem',
    title: 'Pairing is not active',
    message:
      pairing.message,
    gateway,
    pairing,
    pairingCode: null,
    sessionPresent: false,
  };
}
