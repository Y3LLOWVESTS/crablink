/**
 * RO:WHAT — React hook for the TV network-readiness interaction boundary.
 * RO:WHY — Separates mount loading and manual checks from presentation.
 * RO:INTERACTS — TV adapter, readiness interaction, readiness panel.
 * RO:INVARIANTS — mount reads settings only; explicit action runs health; no polling.
 * RO:SECURITY — React receives redacted projections only; no raw error or origin state.
 * RO:TEST — interaction tests and check-crablink-tv-network-readiness-boundary.mjs.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  tvGatewayHealthPort,
  tvSettingsPort,
} from '../platform/tauriTvAdapter.js';

import {
  createTvNetworkReadinessInteraction,
  INITIAL_TV_NETWORK_READINESS_STATE,
} from './tvNetworkReadinessInteraction.js';

export function useTvNetworkReadiness({
  settingsPort = tvSettingsPort,
  gatewayHealthPort =
    tvGatewayHealthPort,
} = {}) {
  const [state, setState] =
    useState(
      INITIAL_TV_NETWORK_READINESS_STATE,
    );

  const mountedRef = useRef(false);

  const interaction = useMemo(
    () =>
      createTvNetworkReadinessInteraction({
        readSettings: () =>
          settingsPort.readSettings(),
        checkGatewayHealth: () =>
          gatewayHealthPort
            .checkGatewayHealth(),
        onState: (nextState) => {
          if (mountedRef.current) {
            setState(nextState);
          }
        },
      }),
    [
      gatewayHealthPort,
      settingsPort,
    ],
  );

  useEffect(() => {
    mountedRef.current = true;

    void interaction.loadProfile();

    return () => {
      mountedRef.current = false;
    };
  }, [interaction]);

  return {
    ...state,
    checkConnection:
      interaction.checkConnection,
  };
}
