import {
  createUnavailableAdapterResult,
} from './androidPlatform.js';

function unavailable() {
  return Promise.resolve(
    createUnavailableAdapterResult('passport'),
  );
}

export const androidPassportAdapter = Object.freeze({
  readStatus: unavailable,
  createPassport: unavailable,
  lockPassport: unavailable,
  unlockPassport: unavailable,
  beginRecoveryCeremony: unavailable,
  clearPassport: unavailable,
});
