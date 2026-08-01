import {
  createUnavailableAdapterResult,
} from './androidPlatform.js';

function unavailable() {
  return Promise.resolve(
    createUnavailableAdapterResult('media'),
  );
}

export const androidMediaAdapter = Object.freeze({
  prepareMedia: unavailable,
  releaseMedia: unavailable,
});
