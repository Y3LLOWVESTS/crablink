/**
 * RO:WHAT — Platform-neutral gateway request and gateway-profile contracts.
 * RO:WHY — Shared UI needs narrow gateway operations without arbitrary transport authority.
 * RO:INTERACTS — desktop gateway adapter, TV gateway-profile adapter, memory adapters later.
 * RO:INVARIANTS — request port is health/ready/resolve only; profile port is read-only.
 * RO:SECURITY — contracts perform no fetch, URL construction, credential handling, or paid unlock.
 * RO:TEST — adapterContracts.test.mjs.
 */

import {
  createMethodPort,
} from './portContract.js';

const GATEWAY_METHODS =
  Object.freeze([
    'health',
    'ready',
    'resolveCrabUrl',
  ]);

const GATEWAY_HEALTH_METHODS =
  Object.freeze([
    'checkGatewayHealth',
  ]);

const GATEWAY_PROFILE_METHODS =
  Object.freeze([
    'readGatewayProfile',
  ]);

export function createGatewayPort(
  methods,
) {
  return createMethodPort(
    'gateway port',
    methods,
    GATEWAY_METHODS,
  );
}

export function createGatewayHealthPort(
  methods,
) {
  return createMethodPort(
    'gateway health port',
    methods,
    GATEWAY_HEALTH_METHODS,
  );
}

export function createGatewayProfilePort(
  methods,
) {
  return createMethodPort(
    'gateway profile port',
    methods,
    GATEWAY_PROFILE_METHODS,
  );
}
