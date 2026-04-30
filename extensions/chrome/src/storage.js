/**
 * RO:WHAT — Stores CrabLink Chrome settings and safe identity/wallet display labels.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keep browser state separate from backend truth.
 * RO:INTERACTS — popup.js, options.js, ronClient.js, chrome.storage.local.
 * RO:INVARIANTS — no private keys; no seed phrases; no fake ROC truth; gateway-only labels.
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
  lastStarterGrantIssued: false,
  lastStarterGrantAmountMinorUnits: '',
  lastStarterGrantReason: '',
  rocBalanceMinorUnits: '',
  rocBalanceDisplay: '',
  rocBalanceUpdatedAt: '',
  rocLedgerBacked: false,
  rocBalanceSource: '',
  rocBalanceReason: ''
});

const DURABLE_KEYS = Object.keys(DEFAULT_SETTINGS);
const MAX_RECEIPTS = 20;

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
    lastStarterGrantIssued: false,
    lastStarterGrantAmountMinorUnits: '',
    lastStarterGrantReason: '',
    rocBalanceMinorUnits: '',
    rocBalanceDisplay: '',
    rocBalanceUpdatedAt: '',
    rocLedgerBacked: false,
    rocBalanceSource: '',
    rocBalanceReason: ''
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

export async function rememberLastCrabUrl(url) {
  const current = await getSettings();
  const next = normalizeSettings({
    ...current,
    lastCrabUrl: String(url || '').trim()
  });

  await chrome.storage.local.set(next);
  return next;
}

export async function addRecentReceipt(receipt) {
  const current = await getSettings();
  const normalized = normalizeReceipt(receipt);

  if (!normalized) {
    return current;
  }

  const receipts = [normalized, ...current.recentReceipts]
    .filter((item, index, array) => {
      return array.findIndex((candidate) => candidate.id === item.id) === index;
    })
    .slice(0, MAX_RECEIPTS);

  const next = normalizeSettings({
    ...current,
    recentReceipts: receipts,
    lastBootstrapReceiptId:
      normalized.action === 'passport_bootstrap'
        ? normalized.id
        : current.lastBootstrapReceiptId
  });

  await chrome.storage.local.set(next);
  return next;
}

export function normalizeSettings(settings) {
  const gatewayUrl = normalizeGatewayUrl(settings.gatewayUrl || DEFAULT_SETTINGS.gatewayUrl);

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    gatewayUrl,
    passportSubject: cleanString(settings.passportSubject),
    walletAccount: cleanString(settings.walletAccount),
    authToken: cleanString(settings.authToken),
    requireSpendConfirm: settings.requireSpendConfirm !== false,
    devMode: settings.devMode !== false,
    requestTimeoutMs: normalizeTimeout(settings.requestTimeoutMs),
    lastCrabUrl: cleanString(settings.lastCrabUrl),
    recentReceipts: normalizeReceipts(settings.recentReceipts),
    lastIdentityCheckAt: cleanString(settings.lastIdentityCheckAt),
    lastBootstrapReceiptId: cleanString(settings.lastBootstrapReceiptId),
    lastStarterGrantIssued: settings.lastStarterGrantIssued === true,
    lastStarterGrantAmountMinorUnits: cleanUnsignedIntegerString(
      settings.lastStarterGrantAmountMinorUnits
    ),
    lastStarterGrantReason: cleanString(settings.lastStarterGrantReason),
    rocBalanceMinorUnits: cleanUnsignedIntegerString(settings.rocBalanceMinorUnits),
    rocBalanceDisplay: cleanString(settings.rocBalanceDisplay),
    rocBalanceUpdatedAt: cleanString(settings.rocBalanceUpdatedAt),
    rocLedgerBacked: settings.rocLedgerBacked === true,
    rocBalanceSource: cleanString(settings.rocBalanceSource),
    rocBalanceReason: cleanString(settings.rocBalanceReason)
  };
}

export function normalizeGatewayUrl(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    throw new Error('Gateway URL is required.');
  }

  const url = new URL(raw);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Gateway URL must use http:// or https://.');
  }

  url.hash = '';
  url.search = '';

  return url.toString().replace(/\/$/, '');
}

export function normalizeTimeout(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return DEFAULT_SETTINGS.requestTimeoutMs;
  }

  return Math.min(Math.max(Math.round(n), 1000), 30000);
}

export function hasPassport(settings) {
  return Boolean(cleanString(settings?.passportSubject));
}

export function hasWallet(settings) {
  return Boolean(cleanString(settings?.walletAccount));
}

export function identitySummary(settings) {
  const passport = cleanString(settings?.passportSubject);
  const wallet = cleanString(settings?.walletAccount);

  if (passport && wallet) {
    return `${passport} / ${wallet}`;
  }

  if (passport) {
    return passport;
  }

  if (wallet) {
    return wallet;
  }

  return 'No local passport label loaded.';
}

export function safeSettingsForDisplay(settings) {
  const normalized = normalizeSettings(settings);

  return {
    ...normalized,
    authToken: normalized.authToken ? 'redacted' : ''
  };
}

export function extractIdentityState(payload) {
  const data = unwrapData(payload);
  const passport = data?.passport || {};
  const wallet = data?.wallet || {};
  const starterGrant = data?.starter_grant || data?.starterGrant || {};
  const receipt = data?.receipt || starterGrant?.receipt || {};

  const passportSubject =
    passport?.subject ||
    passport?.passport_subject ||
    passport?.passportSubject ||
    data?.passport_subject ||
    data?.passportSubject ||
    '';

  const walletAccount =
    wallet?.account ||
    wallet?.wallet_account ||
    wallet?.walletAccount ||
    data?.wallet_account ||
    data?.walletAccount ||
    '';

  const receiptId =
    starterGrant?.receipt_id ||
    starterGrant?.receiptId ||
    receipt?.id ||
    receipt?.receipt_id ||
    receipt?.receiptId ||
    data?.receipt_id ||
    data?.receiptId ||
    '';

  const starterGrantIssued =
    starterGrant?.issued === true ||
    starterGrant?.status === 'issued' ||
    starterGrant?.ledger_backed === true ||
    starterGrant?.ledgerBacked === true;

  const starterGrantAmountMinorUnits =
    starterGrant?.amount_minor_units ||
    starterGrant?.amountMinorUnits ||
    starterGrant?.amount ||
    '';

  const starterGrantReason =
    starterGrant?.reason ||
    starterGrant?.status ||
    data?.starter_grant_reason ||
    data?.starterGrantReason ||
    '';

  return {
    passportSubject: cleanString(passportSubject),
    walletAccount: cleanString(walletAccount),
    lastBootstrapReceiptId: cleanString(receiptId),
    lastStarterGrantIssued: starterGrantIssued,
    lastStarterGrantAmountMinorUnits: cleanUnsignedIntegerString(starterGrantAmountMinorUnits),
    lastStarterGrantReason: cleanString(starterGrantReason)
  };
}

export function extractBalanceState(payload) {
  const data = unwrapData(payload);

  const minorUnits =
    data?.available_minor_units ||
    data?.availableMinorUnits ||
    data?.balance_minor_units ||
    data?.balanceMinorUnits ||
    data?.amount_minor_units ||
    data?.amountMinorUnits ||
    '';

  const display =
    data?.display ||
    data?.balance_display ||
    data?.balanceDisplay ||
    formatRocMinorUnits(minorUnits);

  const walletAccount =
    data?.account ||
    data?.wallet_account ||
    data?.walletAccount ||
    '';

  const ledgerBacked =
    data?.ledger_backed === true ||
    data?.ledgerBacked === true ||
    data?.source === 'svc-wallet' ||
    data?.source === 'svc_wallet';

  return {
    walletAccount: cleanString(walletAccount),
    rocBalanceMinorUnits: cleanUnsignedIntegerString(minorUnits),
    rocBalanceDisplay: cleanString(display),
    rocLedgerBacked: ledgerBacked,
    rocBalanceSource: cleanString(data?.source || data?.balance_source || data?.balanceSource),
    rocBalanceReason: cleanString(data?.reason || data?.balance_reason || data?.balanceReason)
  };
}

export function formatRocMinorUnits(value) {
  const cleaned = cleanUnsignedIntegerString(value);

  if (!cleaned) {
    return '';
  }

  return `${cleaned} ROC`;
}

function unwrapData(payload) {
  if (!payload) {
    return {};
  }

  if (payload.data && typeof payload.data === 'object') {
    return payload.data;
  }

  return payload;
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function cleanUnsignedIntegerString(value) {
  const raw = cleanString(value);

  if (!raw) {
    return '';
  }

  if (!/^[0-9]+$/.test(raw)) {
    return '';
  }

  return raw;
}

function normalizeReceipts(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeReceipt)
    .filter(Boolean)
    .slice(0, MAX_RECEIPTS);
}

function normalizeReceipt(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const id = cleanString(value.id || value.receipt_id || value.receiptId);

  if (!id) {
    return null;
  }

  return {
    id,
    route: cleanString(value.route),
    action: cleanString(value.action || 'unknown'),
    createdAt: cleanString(value.createdAt || value.created_at || new Date().toISOString())
  };
}