import {
  createUnavailableAdapterResult,
} from './androidPlatform.js';

function unavailable() {
  return Promise.resolve(
    createUnavailableAdapterResult('gateway'),
  );
}

export const androidGatewayAdapter = Object.freeze({
  readProfile: unavailable,
  checkHealth: unavailable,
  resolveCrabUrl: unavailable,
});
