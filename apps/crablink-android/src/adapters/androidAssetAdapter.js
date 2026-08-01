import {
  createUnavailableAdapterResult,
} from './androidPlatform.js';

function unavailable() {
  return Promise.resolve(
    createUnavailableAdapterResult('verified-asset'),
  );
}

export const androidAssetAdapter = Object.freeze({
  checkManifest: unavailable,
  fetchVerifiedAsset: unavailable,
});
