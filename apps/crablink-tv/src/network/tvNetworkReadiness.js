/**
 * RO:WHAT — Projects native settings and gateway health into a TV-safe readiness view.
 * RO:WHY — The TV client needs truthful connectivity and manual retry without endpoint disclosure.
 * RO:INTERACTS — tv_settings_read, tv_gateway_health, future TvNetworkReadinessPanel.
 * RO:INVARIANTS — no raw origin; no invented healthy state; development remains visibly marked.
 * RO:SECURITY — no invoke, network, storage, session, wallet, ledger, receipt, reward, or ROC authority.
 * RO:TEST — tvNetworkReadiness.test.mjs.
 */

const SETTINGS_SCHEMA =
  'crablink.tv.settings-snapshot.v3';

const HEALTH_SCHEMA =
  'crablink.tv.gateway-health-result.v1';

const SETTINGS_AUTHORITY =
  'local-ui-preferences-only';

const ALLOWED_PROFILES =
  new Set([
    'unconfigured',
    'invalid',
    'release-https',
    'development-lan',
  ]);

const ALLOWED_HEALTH_STATES =
  new Set([
    'healthy',
    'unavailable',
    'blocked',
    'rejected',
  ]);

const KNOWN_ERROR_CODES =
  new Set([
    'gateway_profile_unconfigured',
    'gateway_profile_invalid',
    'gateway_health_url_invalid',
    'gateway_health_timeout',
    'gateway_health_connect_failed',
    'gateway_health_body_failed',
    'gateway_health_transport_failed',
    'gateway_health_response_too_large',
    'gateway_health_status_rejected',
  ]);

function boundedLabel(
  value,
  fallback,
) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 80
  ) {
    return fallback;
  }

  return value;
}

function normalizedErrorClass(value) {
  return KNOWN_ERROR_CODES.has(value)
    ? value
    : 'gateway_health_unavailable';
}

function invalidProjection({
  status,
  title,
  message,
  errorClass = null,
  canRetry = true,
}) {
  return {
    status,
    title,
    message,
    displayLabel:
      'Native gateway profile unavailable',
    environmentProfile: 'invalid',
    developmentProfile: false,
    requestTimeoutMs: null,
    originDisclosure: 'redacted',
    releaseHttpsRequired: true,
    healthy: false,
    retryRecommended: false,
    canRetry,
    errorClass,
  };
}

function normalizeSettings(
  settingsSnapshot,
) {
  if (
    settingsSnapshot === null ||
    typeof settingsSnapshot !== 'object' ||
    settingsSnapshot.schema !==
      SETTINGS_SCHEMA ||
    settingsSnapshot.settingsAuthority !==
      SETTINGS_AUTHORITY ||
    settingsSnapshot.gatewayOriginDisclosure !==
      'redacted' ||
    settingsSnapshot.releaseHttpsRequired !== true ||
    !ALLOWED_PROFILES.has(
      settingsSnapshot.gatewayProfile,
    ) ||
    typeof settingsSnapshot.gatewayState !==
      'string' ||
    typeof settingsSnapshot.gatewayDisplayLabel !==
      'string' ||
    typeof settingsSnapshot.gatewayConnectionAllowed !==
      'boolean' ||
    typeof settingsSnapshot.gatewayDevelopmentProfile !==
      'boolean' ||
    !Number.isInteger(
      settingsSnapshot.requestTimeoutMs,
    ) ||
    settingsSnapshot.requestTimeoutMs < 1_000 ||
    settingsSnapshot.requestTimeoutMs > 30_000
  ) {
    return null;
  }

  const readyProfile =
    settingsSnapshot.gatewayProfile ===
      'release-https' ||
    settingsSnapshot.gatewayProfile ===
      'development-lan';

  const expectedConnectionAllowed =
    settingsSnapshot.gatewayState ===
      'ready' &&
    readyProfile;

  const expectedDevelopmentProfile =
    settingsSnapshot.gatewayProfile ===
      'development-lan';

  if (
    settingsSnapshot.gatewayConnectionAllowed !==
      expectedConnectionAllowed ||
    settingsSnapshot.gatewayDevelopmentProfile !==
      expectedDevelopmentProfile
  ) {
    return null;
  }

  return {
    state:
      settingsSnapshot.gatewayState,

    profile:
      settingsSnapshot.gatewayProfile,

    displayLabel:
      boundedLabel(
        settingsSnapshot.gatewayDisplayLabel,
        'Gateway profile',
      ),

    connectionAllowed:
      settingsSnapshot.gatewayConnectionAllowed,

    developmentProfile:
      settingsSnapshot.gatewayDevelopmentProfile,

    requestTimeoutMs:
      settingsSnapshot.requestTimeoutMs,
  };
}

function normalizeHealth(
  healthResult,
) {
  if (
    healthResult === null ||
    typeof healthResult !== 'object' ||
    healthResult.schema !== HEALTH_SCHEMA ||
    !ALLOWED_HEALTH_STATES.has(
      healthResult.state,
    ) ||
    typeof healthResult.healthy !==
      'boolean' ||
    !Number.isInteger(
      healthResult.status,
    ) ||
    healthResult.status < 0 ||
    healthResult.status > 599 ||
    !Number.isInteger(
      healthResult.responseBytes,
    ) ||
    healthResult.responseBytes < 0 ||
    typeof healthResult.retryable !==
      'boolean' ||
    !(
      healthResult.errorCode === null ||
      typeof healthResult.errorCode ===
        'string'
    )
  ) {
    return null;
  }

  const expectedHealthy =
    healthResult.state === 'healthy';

  if (
    healthResult.healthy !==
      expectedHealthy
  ) {
    return null;
  }

  if (
    healthResult.healthy &&
    (
      healthResult.status < 200 ||
      healthResult.status > 299 ||
      healthResult.retryable ||
      healthResult.errorCode !== null
    )
  ) {
    return null;
  }

  return healthResult;
}

export function projectTvNetworkReadiness({
  settingsSnapshot = null,
  healthResult = null,
  phase = 'idle',
} = {}) {
  if (phase === 'checking') {
    return invalidProjection({
      status: 'checking',
      title:
        'Checking controlled gateway',
      message:
        'The fixed native health check is in progress.',
      canRetry: false,
    });
  }

  const settings =
    normalizeSettings(
      settingsSnapshot,
    );

  if (!settings) {
    return invalidProjection({
      status:
        phase === 'host_unavailable'
          ? 'unavailable'
          : 'idle',

      title:
        phase === 'host_unavailable'
          ? 'Native gateway check unavailable'
          : 'Gateway readiness not checked',

      message:
        phase === 'host_unavailable'
          ? 'The Tauri host is unavailable. No readiness was assumed.'
          : 'Read the native network profile before trusting connectivity.',

      errorClass:
        phase === 'host_unavailable'
          ? 'native_host_unavailable'
          : null,
    });
  }

  const base = {
    displayLabel:
      settings.displayLabel,

    environmentProfile:
      settings.profile,

    developmentProfile:
      settings.developmentProfile,

    requestTimeoutMs:
      settings.requestTimeoutMs,

    originDisclosure: 'redacted',
    releaseHttpsRequired: true,
    healthy: false,
    retryRecommended: false,
    canRetry: true,
    errorClass: null,
  };

  if (!settings.connectionAllowed) {
    return {
      ...base,

      status:
        settings.state ===
          'unconfigured'
          ? 'unconfigured'
          : 'blocked',

      title:
        settings.state ===
          'unconfigured'
          ? 'Gateway not configured'
          : 'Gateway profile blocked',

      message:
        'Connectivity remains disabled until a reviewed native profile is ready.',

      errorClass:
        settings.state ===
          'unconfigured'
          ? null
          : 'gateway_profile_invalid',
    };
  }

  if (phase === 'host_unavailable') {
    return {
      ...base,
      status: 'unavailable',
      title:
        'Native gateway check unavailable',
      message:
        'No healthy native result was received. The configured origin remains redacted.',
      retryRecommended: true,
      errorClass:
        'native_host_unavailable',
    };
  }

  if (healthResult === null) {
    return {
      ...base,
      status: 'ready_to_check',
      title:
        'Gateway profile ready to check',
      message:
        'A manual action may run one bounded native GET /healthz check.',
    };
  }

  const health =
    normalizeHealth(
      healthResult,
    );

  if (!health) {
    return {
      ...base,
      status: 'rejected',
      title:
        'Gateway result rejected',
      message:
        'The native health result was malformed and did not establish readiness.',
      errorClass:
        'gateway_health_result_invalid',
    };
  }

  if (health.healthy) {
    return {
      ...base,
      status: 'healthy',
      title:
        'Controlled gateway is healthy',
      message:
        'The fixed native health check returned a bounded successful response.',
      healthy: true,
    };
  }

  if (
    health.state ===
    'unavailable'
  ) {
    return {
      ...base,
      status: 'unavailable',
      title:
        'Gateway temporarily unavailable',
      message:
        health.retryable
          ? 'The failure is retryable. No automatic polling was started.'
          : 'The gateway did not establish readiness.',
      retryRecommended:
        health.retryable,
      errorClass:
        normalizedErrorClass(
          health.errorCode,
        ),
    };
  }

  if (
    health.state ===
    'blocked'
  ) {
    return {
      ...base,
      status: 'blocked',
      title:
        'Gateway check blocked',
      message:
        'The reviewed profile blocked network execution before transport.',
      errorClass:
        normalizedErrorClass(
          health.errorCode,
        ),
    };
  }

  return {
    ...base,
    status: 'rejected',
    title:
      'Gateway response rejected',
    message:
      'The bounded response did not satisfy the native readiness contract.',
    errorClass:
      normalizedErrorClass(
        health.errorCode,
      ),
  };
}
