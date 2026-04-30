export const DEFAULT_SETTINGS = {
  schemaVersion: 1,
  gatewayUrl: 'http://127.0.0.1:8090',
  passportSubject: 'passport:main:dev',
  walletAccount: 'acct_dev',
  authToken: '',
  requireSpendConfirm: true,
  devMode: true,
  requestTimeoutMs: 5000,
  lastCrabUrl: '',
  recentReceipts: []
};

export async function getSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  return {
    ...DEFAULT_SETTINGS,
    ...stored
  };
}

export async function saveSettings(next) {
  const current = await getSettings();
  await chrome.storage.local.set({
    ...current,
    ...next,
    schemaVersion: DEFAULT_SETTINGS.schemaVersion
  });
}
