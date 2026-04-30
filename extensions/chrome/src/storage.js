// CrabLink storage layer.
// Durable extension preferences live here. Backend truth does not.

export const SETTINGS_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  gatewayUrl: 'http://127.0.0.1:8090',
  passportSubject: 'passport:main:dev',
  walletAccount: 'acct_dev',
  authToken: '',
  requireSpendConfirm: true,
  devMode: true,
  requestTimeoutMs: 5000,
  lastCrabUrl: '',
  recentReceipts: []
});

const DURABLE_KEYS = Object.keys(DEFAULT_SETTINGS);

export async function getSettings() {
  const stored = await chrome.storage.local.get(DURABLE_KEYS);
  const merged = {
    ...DEFAULT_SETTINGS,
    ...stored
  };

  return normalizeSettings(merged);
}

export async function saveSettings(next) {
  const current = await getSettings();
  const merged = normalizeSettings({
    ...current,
    ...next,
    schemaVersion: SETTINGS_SCHEMA_VERSION
  });

  await chrome.storage.local.set(merged);
  return merged;
}

export async function resetSettings() {
  await chrome.storage.local.set({ ...DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS };
}

export async function clearDevToken() {
  const current = await getSettings();
  const next = {
    ...current,
    authToken: ''
  };

  await chrome.storage.local.set(next);
  return next;
}

export function normalizeSettings(settings) {
  const gatewayUrl = normalizeGatewayUrl(settings.gatewayUrl || DEFAULT_SETTINGS.gatewayUrl);

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    gatewayUrl,
    passportSubject: String(settings.passportSubject || '').trim(),
    walletAccount: String(settings.walletAccount || '').trim(),
    authToken: String(settings.authToken || '').trim(),
    requireSpendConfirm: Boolean(settings.requireSpendConfirm),
    devMode: Boolean(settings.devMode),
    requestTimeoutMs: normalizeTimeout(settings.requestTimeoutMs),
    lastCrabUrl: String(settings.lastCrabUrl || '').trim(),
    recentReceipts: normalizeRecentReceipts(settings.recentReceipts)
  };
}

export function normalizeGatewayUrl(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return DEFAULT_SETTINGS.gatewayUrl;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Gateway URL must be a valid URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Gateway URL must start with http:// or https://.');
  }

  parsed.hash = '';
  parsed.search = '';

  return parsed.toString().replace(/\/$/, '');
}

export function normalizeTimeout(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return DEFAULT_SETTINGS.requestTimeoutMs;
  }

  const rounded = Math.round(n);

  if (rounded < 1000) {
    return 1000;
  }

  if (rounded > 30000) {
    return 30000;
  }

  return rounded;
}

export function redactSecret(value) {
  const text = String(value || '');

  if (!text) {
    return '';
  }

  if (text.length <= 8) {
    return '••••••••';
  }

  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

export function safeSettingsForDisplay(settings) {
  return {
    ...settings,
    authToken: settings.authToken ? redactSecret(settings.authToken) : ''
  };
}

export async function rememberLastCrabUrl(url) {
  const settings = await getSettings();
  await saveSettings({
    ...settings,
    lastCrabUrl: String(url || '').trim()
  });
}

export async function addRecentReceipt(receipt) {
  const settings = await getSettings();

  const safeReceipt = {
    id: String(receipt?.id || receipt?.receipt_id || receipt?.txid || ''),
    route: String(receipt?.route || ''),
    action: String(receipt?.action || ''),
    createdAt: String(receipt?.createdAt || new Date().toISOString())
  };

  const recentReceipts = [
    safeReceipt,
    ...settings.recentReceipts
  ]
    .filter((item) => item.id || item.route || item.action)
    .slice(0, 20);

  await saveSettings({
    ...settings,
    recentReceipts
  });

  return recentReceipts;
}

function normalizeRecentReceipts(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      id: String(item?.id || ''),
      route: String(item?.route || ''),
      action: String(item?.action || ''),
      createdAt: String(item?.createdAt || '')
    }))
    .filter((item) => item.id || item.route || item.action)
    .slice(0, 20);
}