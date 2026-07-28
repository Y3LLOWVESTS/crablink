/**
 * RO:WHAT — Coordinates TV profile reads and manual health checks.
 * RO:WHY — Keeps network interaction testable and explicit.
 * RO:INTERACTS — readiness model, hook, settings and health ports.
 * RO:INVARIANTS — settings precede health; duplicate checks share one promise; no polling.
 * RO:SECURITY — publishes redacted projections only; raw errors and origins stay private.
 * RO:TEST — tvNetworkReadinessInteraction.test.mjs.
 */

import {
  projectTvNetworkReadiness,
} from './tvNetworkReadiness.js';

export const INITIAL_TV_NETWORK_READINESS_STATE =
  Object.freeze({
    view:
      projectTvNetworkReadiness(),
    checking: false,
    manualCheckAttempted: false,
  });

function requireOperation(
  value,
  label,
) {
  if (typeof value !== 'function') {
    throw new TypeError(
      `${label} must be a function`,
    );
  }

  return value;
}

export function createTvNetworkReadinessInteraction({
  readSettings,
  checkGatewayHealth,
  onState = () => {},
}) {
  const readSettingsOperation =
    requireOperation(
      readSettings,
      'readSettings',
    );

  const checkGatewayHealthOperation =
    requireOperation(
      checkGatewayHealth,
      'checkGatewayHealth',
    );

  const publishState =
    requireOperation(
      onState,
      'onState',
    );

  let settingsSnapshot = null;
  let healthResult = null;
  let phase = 'idle';
  let manualCheckAttempted = false;
  let checkInFlight = null;
  let operationVersion = 0;

  function currentState() {
    return {
      view:
        projectTvNetworkReadiness({
          settingsSnapshot,
          healthResult,
          phase,
        }),
      checking:
        phase === 'checking',
      manualCheckAttempted,
    };
  }

  function publish() {
    const nextState = currentState();

    publishState(nextState);

    return nextState;
  }

  async function loadProfile() {
    const version =
      operationVersion + 1;

    operationVersion = version;

    try {
      const nextSettingsSnapshot =
        await readSettingsOperation();

      if (version !== operationVersion) {
        return currentState();
      }

      settingsSnapshot =
        nextSettingsSnapshot;
      healthResult = null;
      phase = 'idle';
    } catch {
      if (version !== operationVersion) {
        return currentState();
      }

      settingsSnapshot = null;
      healthResult = null;
      phase = 'host_unavailable';
    }

    return publish();
  }

  function checkConnection() {
    if (checkInFlight) {
      return checkInFlight;
    }

    manualCheckAttempted = true;

    const version =
      operationVersion + 1;

    operationVersion = version;
    phase = 'checking';
    publish();

    checkInFlight = (async () => {
      let nextSettingsSnapshot;

      try {
        nextSettingsSnapshot =
          await readSettingsOperation();
      } catch {
        if (version !== operationVersion) {
          return currentState();
        }

        settingsSnapshot = null;
        healthResult = null;
        phase = 'host_unavailable';

        return publish();
      }

      if (version !== operationVersion) {
        return currentState();
      }

      settingsSnapshot =
        nextSettingsSnapshot;
      healthResult = null;
      phase = 'idle';

      const profileState =
        currentState();

      if (
        profileState.view.status !==
          'ready_to_check'
      ) {
        return publish();
      }

      phase = 'checking';
      publish();

      try {
        const nextHealthResult =
          await checkGatewayHealthOperation();

        if (version !== operationVersion) {
          return currentState();
        }

        healthResult =
          nextHealthResult;
        phase = 'idle';
      } catch {
        if (version !== operationVersion) {
          return currentState();
        }

        healthResult = null;
        phase = 'host_unavailable';
      }

      return publish();
    })().finally(() => {
      checkInFlight = null;
    });

    return checkInFlight;
  }

  return Object.freeze({
    loadProfile,
    checkConnection,
    getState: currentState,
  });
}
