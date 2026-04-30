/**
 * RO:WHAT — Stores CrabLink Chrome settings and safe identity labels.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keep browser state separate from backend truth.
 * RO:INTERACTS — popup.js, options.js, ronClient.js, chrome.storage.local.
 * RO:INVARIANTS — no private keys; no seed phrases; no local ROC truth; gateway-only labels.
 * RO:METRICS — none; UI displays last identity/balance check timestamps.
 * RO:CONFIG — gatewayUrl, timeout, dev token, passport/wallet display labels.
 * RO:SECURITY — dev token is local-only MVP; do not persist production signing material.
 * RO:TEST — scripts/check-chrome.sh plus manual checklist identity bootstrap flow.
 */

export const SETTINGS_SCHEMA_VERSION = 2;

export const DEFAULT_SETTINGS = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  gatewayUrl: 'http://127.0.0.1:8090',
  passportSubject: '',
  walletAccount: '',
  authToken: '',
  requireSpendConfirm: true,
  devMode: true,
  requestTimeoutMs: 5000,
  lastCrabUrl: '',
  recentReceipts: [],
  lastIdentityCheckAt: '',
  lastBootstrapReceiptId: '',
  rocBalanceMinorUnits: '',
  rocBalanceDisplay: '',
  rocBalanceUpdatedAt: ''
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
  const next = normalizeSettings({
    ...current,
    authToken: ''
  });

  await chrome.storage.local.set(next);
  return next;
}

export async function clearIdentityState() {
  const current = await getSettings();
  const next = normalizeSettings({
    ...current,
    passportSubject: '',
    walletAccount: '',
    lastIdentityCheckAt: '',
    lastBootstrapReceiptId: '',
    rocBalanceMinorUnits: '',
    rocBalanceDisplay: '',
    rocBalanceUpdatedAt: ''
  });

  await chrome.storage.local.set(next);
  return next;
}

export async function saveIdentityState(payload) {
  const current = await getSettings();
  const identity = extractIdentityState(payload);

  const next = normalizeSettings({
    ...current,
    ...identity,
    lastIdentityCheckAt: new Date().toISOString()
  });

  await chrome.storage.local.set(next);
  return next;
}

export async function saveBalanceState(payload) {
  const current = await getSettings();
  const balance = extractBalanceState(payload);

  const next = normalizeSettings({
    ...current,
    ...balance,
    rocBalanceUpdatedAt: new Date().toISOString()
  });

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
    recentReceipts: normalizeRecentReceipts(settings.recentReceipts),
    lastIdentityCheckAt: String(settings.lastIdentityCheckAt || '').trim(),
    lastBootstrapReceiptId: String(settings.lastBootstrapReceiptId || '').trim(),
    rocBalanceMinorUnits: normalizeMinorUnitString(settings.rocBalanceMinorUnits),
    rocBalanceDisplay: String(settings.rocBalanceDisplay || '').trim(),
    rocBalanceUpdatedAt: String(settings.rocBalanceUpdatedAt || '').trim()
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

export function hasPassport(settings) {
  return Boolean(String(settings?.passportSubject || '').trim());
}

export function hasWallet(settings) {
  return Boolean(String(settings?.walletAccount || '').trim());
}

export function identitySummary(settings) {
  if (hasPassport(settings) && hasWallet(settings)) {
    return 'Passport ready with linked wallet label.';
  }

  if (hasPassport(settings)) {
    return 'Passport ready. Wallet label is not loaded.';
  }

  return 'No RON Passport loaded.';
}

export function extractIdentityState(payload) {
  const root = unwrapPayload(payload);

  const passportSubject = firstString(
    root.passportSubject,
    root.passport_subject,
    root.subject,
    root.identity?.passportSubject,
    root.identity?.passport_subject,
    root.identity?.subject,
    root.passport?.passportSubject,
    root.passport?.passport_subject,
    root.passport?.subject
  );

  const walletAccount = firstString(
    root.walletAccount,
    root.wallet_account,
    root.account,
    root.wallet?.walletAccount,
    root.wallet?.wallet_account,
    root.wallet?.account,
    root.identity?.walletAccount,
    root.identity?.wallet_account,
    root.passport?.walletAccount,
    root.passport?.wallet_account
  );

  const lastBootstrapReceiptId = firstString(
    root.receiptId,
    root.receipt_id,
    root.bootstrapReceiptId,
    root.bootstrap_receipt_id,
    root.receipt?.id,
    root.receipt?.receipt_id,
    root.wallet_receipt?.id,
    root.wallet_receipt?.receipt_id
  );

  return {
    passportSubject,
    walletAccount,
    lastBootstrapReceiptId
  };
}

export function extractBalanceState(payload) {
  const root = unwrapPayload(payload);

  const minorUnits = firstDefined(
    root.rocBalanceMinorUnits,
    root.roc_balance_minor_units,
    root.balanceMinorUnits,
    root.balance_minor_units,
    root.availableMinorUnits,
    root.available_minor_units,
    root.balance?.minorUnits,
    root.balance?.minor_units,
    root.balance?.availableMinorUnits,
    root.balance?.available_minor_units,
    root.wallet?.balanceMinorUnits,
    root.wallet?.balance_minor_units
  );

  const display = firstString(
    root.rocBalanceDisplay,
    root.roc_balance_display,
    root.balanceDisplay,
    root.balance_display,
    root.formatted,
    root.display,
    root.balance?.display,
    root.balance?.formatted,
    root.wallet?.balanceDisplay,
    root.wallet?.balance_display
  );

  const normalizedMinor = normalizeMinorUnitString(minorUnits);
  const fallbackDisplay = normalizedMinor ? `${normalizedMinor} minor ROC` : '';

  return {
    rocBalanceMinorUnits: normalizedMinor,
    rocBalanceDisplay: display || fallbackDisplay
  };
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

function unwrapPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  if (payload.data && typeof payload.data === 'object') {
    return payload.data;
  }

  return payload;
}

function firstString(...values) {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    const text = String(value).trim();
    if (text) {
      return text;
    }
  }

  return '';
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return '';
}

function normalizeMinorUnitString(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return '';
    }

    return Math.trunc(value).toString();
  }

  const text = String(value).trim();

  if (!text) {
    return '';
  }

  if (!/^-?[0-9]+$/.test(text)) {
    return '';
  }

  return text;
}