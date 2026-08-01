import {
  createUnavailableAdapterResult,
} from './androidPlatform.js';

export const androidCatalogAdapter = Object.freeze({
  readCatalog() {
    return Promise.resolve(
      createUnavailableAdapterResult('catalog'),
    );
  },
});
