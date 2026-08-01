import {
  createUnavailableAdapterResult,
} from './androidPlatform.js';

export const androidReceiptsAdapter = Object.freeze({
  listRecentReceipts() {
    return Promise.resolve(
      createUnavailableAdapterResult('receipts'),
    );
  },
});
