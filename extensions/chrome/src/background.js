// CrabLink Extension for Chrome — background service worker.
// Keeps install/default setup thin.

const DEFAULTS = {
  schemaVersion: 1,
  gatewayUrl: 'http://127.0.0.1:8090',
  passportSubject: 'passport:main:dev',
  walletAccount: 'acct_dev',
  authToken: '',
  requireSpendConfirm: true,
  devMode: true,
  requestTimeoutMs: 5000
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const next = {};

  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (existing[key] === undefined) {
      next[key] = value;
    }
  }

  if (Object.keys(next).length > 0) {
    await chrome.storage.local.set(next);
  }
});
