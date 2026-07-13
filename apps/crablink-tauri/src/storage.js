/**
 * RO:WHAT — Stores CrabLink Chrome settings and safe identity/wallet/product display labels.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keep browser state separate from backend truth.
 * RO:INTERACTS — popup.js, options.js, ronClient.js, safe local storage adapter.
 * RO:INVARIANTS — no private keys; no seed phrases; no fake ROC truth; gateway-only labels.
 * RO:METRICS — none; UI displays last identity/balance/product timestamps.
 * RO:CONFIG — gatewayUrl, timeout, dev token, passport/wallet display labels.
 * RO:SECURITY — dev token is local-only MVP; do not persist production signing material.
 * RO:TEST — scripts/check-chrome.sh plus manual checklist identity/bootstrap/product flows.
 */

export const SETTINGS_SCHEMA_VERSION = 3;

export const DEFAULT_SETTINGS = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  gatewayUrl: 'http://127.0.0.1:8090',
  passportSubject: '',
  walletAccount: '',
  requestedUsername: '',
  requestedHandle: '',
  username: '',
  handle: '',
  usernameStatus: '',
  profileCrabUrl: '',
  publicProfileCid: '',
  usernameUpdatedAt: '',
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
  lastStarterGrantLedgerBacked: false,
  rocBalanceMinorUnits: '',
  rocBalanceDisplay: '',
  rocBalanceUpdatedAt: '',
  rocLedgerBacked: false,
  rocBalanceSource: '',
  rocBalanceReason: '',
  localNodeEnabled: false,
  localNodeUrl: 'http://127.0.0.1:5310',
  localNodeMode: 'disabled',
  localNodeLastCheckedAt: '',
  lastProductActionAt: '',
  lastProductSchema: '',
  lastProductCrabUrl: '',
  lastProductB3Cid: '',
  lastProductSiteName: '',
  lastProductSummary: ''
});

const DURABLE_KEYS = Object.keys(DEFAULT_SETTINGS);

const FALLBACK_STORAGE_KEY = 'crablink.storage.v1';
let memoryFallbackStorage = {};

export function hasChromeLocalStorage() {
  return Boolean(globalThis.chrome?.storage?.local?.get && globalThis.chrome?.storage?.local?.set);
}

export function storageBackendName() {
  if (hasChromeLocalStorage()) {
    return 'chrome.storage.local';
  }

  if (hasLocalStorage()) {
    return 'window.localStorage';
  }

  return 'memory';
}

async function storageGet(keys) {
  const safeKeys = Array.isArray(keys) ? keys : [keys].filter(Boolean);

  if (hasChromeLocalStorage()) {
    return chrome.storage.local.get(safeKeys);
  }

  const state = readFallbackState();

  if (!safeKeys.length) {
    return { ...state };
  }

  return Object.fromEntries(safeKeys.map((key) => [key, state[key]]));
}

async function storageSet(values) {
  const safeValues = values && typeof values === 'object' ? values : {};

  if (hasChromeLocalStorage()) {
    await chrome.storage.local.set(safeValues);
    return;
  }

  const next = {
    ...readFallbackState(),
    ...safeValues,
  };

  writeFallbackState(next);
}

function readFallbackState() {
  if (!hasLocalStorage()) {
    return { ...memoryFallbackStorage };
  }

  try {
    const raw = globalThis.localStorage.getItem(FALLBACK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return { ...memoryFallbackStorage };
  }
}

function writeFallbackState(next) {
  memoryFallbackStorage = {
    ...next,
  };

  if (!hasLocalStorage()) {
    return;
  }

  try {
    globalThis.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(memoryFallbackStorage));
  } catch (_error) {
    // localStorage can be unavailable in strict extension/browser contexts. Memory fallback remains usable.
  }
}

function hasLocalStorage() {
  try {
    return Boolean(globalThis.localStorage?.getItem && globalThis.localStorage?.setItem);
  } catch (_error) {
    return false;
  }
}


export async function getSettings() {
  const stored = await storageGet(DURABLE_KEYS);
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

  await storageSet(merged);
  return merged;
}

export async function resetSettings() {
  const next = normalizeSettings(DEFAULT_SETTINGS);
  await storageSet(next);
  return next;
}

export async function clearDevToken() {
  const current = await getSettings();
  const next = normalizeSettings({
    ...current,
    authToken: ''
  });

  await storageSet(next);
  return next;
}

export async function clearIdentityState() {
  const current = await getSettings();
  const next = normalizeSettings({
    ...current,
    passportSubject: '',
    walletAccount: '',
    requestedUsername: '',
    requestedHandle: '',
    username: '',
    handle: '',
    usernameStatus: '',
    profileCrabUrl: '',
    publicProfileCid: '',
    usernameUpdatedAt: '',
    lastIdentityCheckAt: '',
    lastBootstrapReceiptId: '',
    lastStarterGrantIssued: false,
    lastStarterGrantAmountMinorUnits: '',
    lastStarterGrantReason: '',
    lastStarterGrantLedgerBacked: false,
    rocBalanceMinorUnits: '',
    rocBalanceDisplay: '',
    rocBalanceUpdatedAt: '',
    rocLedgerBacked: false,
    rocBalanceSource: '',
    rocBalanceReason: ''
  });

  await storageSet(next);
  return next;
}

export async function rememberLastCrabUrl(url) {
  const current = await getSettings();
  const next = normalizeSettings({
    ...current,
    lastCrabUrl: cleanString(url)
  });

  await storageSet(next);
  return next;
}

export async function saveUsernameDraft(value) {
  const current = await getSettings();
  const normalized = normalizeUsername(value);

  if (!normalized.ok) {
    throw new Error(normalized.error || '@username is invalid.');
  }

  const next = normalizeSettings({
    ...current,
    requestedUsername: normalized.username,
    requestedHandle: normalized.handle,
    usernameStatus: 'local_draft',
    usernameUpdatedAt: new Date().toISOString()
  });

  await storageSet(next);
  return next;
}

export async function saveIdentityState(payload) {
  const current = await getSettings();
  const identity = extractIdentityState(payload);

  const next = normalizeSettings({
    ...current,
    ...identity,
    passportSubject: identity.passportSubject || current.passportSubject,
    walletAccount: identity.walletAccount || current.walletAccount,
    requestedUsername: identity.requestedUsername || current.requestedUsername,
    requestedHandle: identity.requestedHandle || current.requestedHandle,
    username: identity.username || current.username,
    handle: identity.handle || current.handle,
    usernameStatus: identity.usernameStatus || current.usernameStatus,
    profileCrabUrl: identity.profileCrabUrl || current.profileCrabUrl,
    publicProfileCid: identity.publicProfileCid || current.publicProfileCid,
    usernameUpdatedAt:
      identity.usernameStatus || identity.username || identity.handle
        ? new Date().toISOString()
        : current.usernameUpdatedAt,
    lastBootstrapReceiptId: identity.lastBootstrapReceiptId || current.lastBootstrapReceiptId,
    lastStarterGrantIssued: identity.lastStarterGrantIssued || current.lastStarterGrantIssued,
    lastStarterGrantAmountMinorUnits:
      identity.lastStarterGrantAmountMinorUnits || current.lastStarterGrantAmountMinorUnits,
    lastStarterGrantReason: identity.lastStarterGrantReason || current.lastStarterGrantReason,
    lastStarterGrantLedgerBacked:
      identity.lastStarterGrantLedgerBacked || current.lastStarterGrantLedgerBacked,
    lastIdentityCheckAt: new Date().toISOString()
  });

  await storageSet(next);
  return next;
}

export async function saveBalanceState(payload) {
  const current = await getSettings();
  const balance = extractBalanceState(payload);
  const safeBalance = shouldPreserveLedgerBackedBalance(current, balance)
    ? preserveLedgerBackedBalance(current, balance)
    : balance;

  const next = normalizeSettings({
    ...current,
    ...safeBalance,
    walletAccount: safeBalance.walletAccount || current.walletAccount,
    rocBalanceUpdatedAt: new Date().toISOString()
  });

  await storageSet(next);
  return next;
}

export async function addRecentReceipt(receipt) {
  const current = await getSettings();
  const now = new Date().toISOString();
  const cleanReceipt = {
    id: cleanString(receipt?.id || receipt?.receipt_id || receipt?.receiptId || receipt?.txid),
    route: cleanString(receipt?.route),
    action: cleanString(receipt?.action),
    amountMinorUnits: cleanUnsignedIntegerString(receipt?.amountMinorUnits || receipt?.amount_minor_units),
    ledgerBacked: receipt?.ledgerBacked === true || receipt?.ledger_backed === true,
    source: cleanString(receipt?.source),
    createdAt: cleanString(receipt?.createdAt || receipt?.created_at || now)
  };

  const receipts = normalizeReceipts([cleanReceipt, ...current.recentReceipts]).slice(0, 12);
  const next = normalizeSettings({
    ...current,
    recentReceipts: receipts
  });

  await storageSet(next);
  return next;
}

export async function rememberProductState(payload = {}) {
  const current = await getSettings();
  const data = unwrapData(payload);
  const assetCid = normalizeB3Cid(
    data?.asset_cid ||
      data?.assetCid ||
      data?.content_id ||
      data?.contentId ||
      data?.asset?.cid ||
      data?.asset?.b3 ||
      data?.root_document_cid ||
      data?.rootDocumentCid ||
      ''
  );
  const manifestCid = normalizeB3Cid(
    data?.manifest_cid ||
      data?.manifestCid ||
      data?.manifest?.manifest_cid ||
      data?.manifest?.manifestCid ||
      data?.manifest?.cid ||
      ''
  );
  const crabUrl = cleanString(
    data?.crab_url ||
      data?.crabUrl ||
      data?.links?.crab ||
      data?.site_url ||
      data?.siteUrl ||
      data?.site?.crab_url ||
      data?.asset?.crab_url ||
      data?.url ||
      ''
  );
  const siteName = cleanString(data?.site_name || data?.siteName || data?.site?.name || data?.name || '');
  const schema = cleanString(data?.schema || data?.type || '');

  const next = normalizeSettings({
    ...current,
    lastProductActionAt: new Date().toISOString(),
    lastProductSchema: schema || current.lastProductSchema,
    lastProductCrabUrl: crabUrl || current.lastProductCrabUrl,
    lastProductB3Cid: assetCid || current.lastProductB3Cid,
    lastProductSiteName: siteName || current.lastProductSiteName,
    lastProductSummary:
      crabUrl || assetCid || manifestCid || siteName || schema || current.lastProductSummary
  });

  await storageSet(next);
  return next;
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

export function balanceSummary(settings) {
  const display = cleanString(settings?.rocBalanceDisplay) || 'unknown';
  const source = cleanString(settings?.rocBalanceSource);
  const ledger = settings?.rocLedgerBacked === true ? 'ledger-backed' : 'display-only';

  return source ? `${display} (${ledger}, ${source})` : `${display} (${ledger})`;
}

export function usernameSummary(settings) {
  const confirmed = cleanString(settings?.handle) || normalizeHandle(settings?.username);
  const requested = cleanString(settings?.requestedHandle) || normalizeHandle(settings?.requestedUsername);
  const status = normalizeUsernameStatus(settings?.usernameStatus);

  if (confirmed) {
    if (status === 'confirmed') {
      return `${confirmed} confirmed by backend`;
    }

    return `${confirmed} from backend (${status || 'backend_unknown'})`;
  }

  if (requested) {
    if (status === 'requested') {
      return `${requested} requested`;
    }

    if (status === 'local_draft') {
      return `${requested} local draft`;
    }

    return `${requested} pending backend`;
  }

  return 'No @username requested yet.';
}

export function safeSettingsForDisplay(settings) {
  const safe = normalizeSettings(settings || DEFAULT_SETTINGS);
  return {
    ...safe,
    authToken: safe.authToken ? 'configured' : ''
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
    starterGrant?.txid ||
    starterGrant?.tx_id ||
    receipt?.id ||
    receipt?.txid ||
    receipt?.tx_id ||
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

  const starterGrantLedgerBacked =
    starterGrant?.ledger_backed === true ||
    starterGrant?.ledgerBacked === true ||
    starterGrant?.source === 'svc_wallet.v1' ||
    starterGrant?.source === 'svc-wallet' ||
    starterGrant?.reason === 'issued_by_svc_wallet' ||
    starterGrantIssued === true;

  const usernameInfo = extractUsernameState(data);

  return {
    passportSubject: cleanString(passportSubject),
    walletAccount: cleanString(walletAccount),
    requestedUsername: usernameInfo.requestedUsername,
    requestedHandle: usernameInfo.requestedHandle,
    username: usernameInfo.username,
    handle: usernameInfo.handle,
    usernameStatus: usernameInfo.usernameStatus,
    profileCrabUrl: usernameInfo.profileCrabUrl,
    publicProfileCid: usernameInfo.publicProfileCid,
    lastBootstrapReceiptId: cleanString(receiptId),
    lastStarterGrantIssued: starterGrantIssued,
    lastStarterGrantAmountMinorUnits: cleanUnsignedIntegerString(starterGrantAmountMinorUnits),
    lastStarterGrantReason: cleanString(starterGrantReason),
    lastStarterGrantLedgerBacked: starterGrantLedgerBacked
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

  const source = data?.source || data?.balance_source || data?.balanceSource || '';
  const ledgerBacked =
    data?.ledger_backed === true ||
    data?.ledgerBacked === true ||
    source === 'svc_wallet.v1' ||
    source === 'svc-wallet' ||
    source === 'svc_wallet';

  return {
    walletAccount: cleanString(walletAccount),
    rocBalanceMinorUnits: cleanUnsignedIntegerString(minorUnits),
    rocBalanceDisplay: cleanString(display),
    rocLedgerBacked: ledgerBacked,
    rocBalanceSource: cleanString(source),
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

function extractUsernameState(data) {
  const passport = data?.passport || {};
  const profile = data?.profile || passport?.profile || {};

  const requestedCandidate =
    passport?.requested_username ||
    passport?.requestedUsername ||
    passport?.requested_handle ||
    passport?.requestedHandle ||
    data?.requested_username ||
    data?.requestedUsername ||
    data?.requested_handle ||
    data?.requestedHandle ||
    '';

  const backendCandidate =
    passport?.username ||
    passport?.handle ||
    passport?.public_username ||
    passport?.publicUsername ||
    data?.username ||
    data?.handle ||
    profile?.username ||
    profile?.handle ||
    '';

  const requested = normalizeUsername(requestedCandidate);
  const backend = normalizeUsername(backendCandidate);

  const rawStatus =
    passport?.username_status ||
    passport?.usernameStatus ||
    data?.username_status ||
    data?.usernameStatus ||
    profile?.username_status ||
    profile?.usernameStatus ||
    '';

  const status = normalizeUsernameStatus(rawStatus) || (backend.ok ? 'backend_unknown' : requested.ok ? 'requested' : '');

  return {
    requestedUsername: requested.ok ? requested.username : '',
    requestedHandle: requested.ok ? requested.handle : '',
    username: backend.ok ? backend.username : '',
    handle: backend.ok ? backend.handle : '',
    usernameStatus: status,
    profileCrabUrl: normalizeProfileCrabUrl(
      passport?.profile_crab_url ||
        passport?.profileCrabUrl ||
        data?.profile_crab_url ||
        data?.profileCrabUrl ||
        profile?.crab_url ||
        profile?.crabUrl ||
        ''
    ),
    publicProfileCid: normalizeB3Cid(
      passport?.public_profile_cid ||
        passport?.publicProfileCid ||
        data?.public_profile_cid ||
        data?.publicProfileCid ||
        profile?.cid ||
        profile?.b3 ||
        ''
    )
  };
}

export function normalizeUsername(value) {
  const input = cleanString(value).toLowerCase().replace(/^@+/, '');

  if (!input) {
    return {
      ok: false,
      username: '',
      handle: '',
      error: ''
    };
  }

  if (input.length < 3) {
    return {
      ok: false,
      username: '',
      handle: '',
      error: '@username must be at least 3 characters.'
    };
  }

  if (input.length > 32) {
    return {
      ok: false,
      username: '',
      handle: '',
      error: '@username must be 32 characters or less.'
    };
  }

  if (!/^[a-z0-9]/.test(input)) {
    return {
      ok: false,
      username: '',
      handle: '',
      error: '@username must start with a letter or number.'
    };
  }

  if (!/^[a-z0-9][a-z0-9_.-]*$/.test(input)) {
    return {
      ok: false,
      username: '',
      handle: '',
      error: '@username may only use lowercase letters, numbers, underscore, hyphen, and dot.'
    };
  }

  if (input.includes('..')) {
    return {
      ok: false,
      username: '',
      handle: '',
      error: '@username cannot contain consecutive dots.'
    };
  }

  if (input.endsWith('.') || input.endsWith('-') || input.endsWith('_')) {
    return {
      ok: false,
      username: '',
      handle: '',
      error: '@username cannot end with dot, hyphen, or underscore.'
    };
  }

  if (RESERVED_USERNAMES.has(input)) {
    return {
      ok: false,
      username: '',
      handle: '',
      error: `@${input} is reserved.`
    };
  }

  return {
    ok: true,
    username: input,
    handle: `@${input}`,
    error: ''
  };
}

function normalizeHandle(value) {
  const normalized = normalizeUsername(value);
  return normalized.ok ? normalized.handle : '';
}

function normalizeUsernameStatus(value) {
  const raw = cleanString(value).toLowerCase();

  if (!raw) {
    return '';
  }

  if (USERNAME_STATUSES.has(raw)) {
    return raw;
  }

  return 'backend_unknown';
}

function normalizeProfileCrabUrl(value) {
  const raw = cleanString(value);

  if (!raw) {
    return '';
  }

  if (/^crab:\/\/(@[a-z0-9][a-z0-9_.-]{2,31}|profile\/@[a-z0-9][a-z0-9_.-]{2,31}|[0-9a-f]{64}\.[a-z][a-z0-9_-]{0,31})$/i.test(raw)) {
    return raw;
  }

  return '';
}

const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'app',
  'article',
  'asset',
  'assets',
  'b3',
  'comment',
  'crab',
  'gateway',
  'image',
  'mail',
  'manifest',
  'mod',
  'moderator',
  'music',
  'passport',
  'post',
  'profile',
  'profiles',
  'root',
  'site',
  'sites',
  'support',
  'sys',
  'system',
  'wallet'
]);

const USERNAME_STATUSES = new Set([
  'local_draft',
  'requested',
  'confirmed',
  'rejected',
  'unavailable',
  'backend_unknown'
]);

function normalizeSettings(settings) {
  const gatewayUrl = normalizeGatewayUrl(settings.gatewayUrl || DEFAULT_SETTINGS.gatewayUrl);
  const requested = normalizeUsername(settings.requestedUsername || settings.requestedHandle || '');
  const confirmed = normalizeUsername(settings.username || settings.handle || '');
  const status = normalizeUsernameStatus(settings.usernameStatus);

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    gatewayUrl,
    passportSubject: cleanString(settings.passportSubject),
    walletAccount: cleanString(settings.walletAccount),
    requestedUsername: requested.ok ? requested.username : '',
    requestedHandle: requested.ok ? requested.handle : '',
    username: confirmed.ok ? confirmed.username : '',
    handle: confirmed.ok ? confirmed.handle : '',
    usernameStatus: status || (confirmed.ok ? 'backend_unknown' : requested.ok ? 'local_draft' : ''),
    profileCrabUrl: normalizeProfileCrabUrl(settings.profileCrabUrl),
    publicProfileCid: normalizeB3Cid(settings.publicProfileCid),
    usernameUpdatedAt: cleanString(settings.usernameUpdatedAt),
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
    lastStarterGrantLedgerBacked: settings.lastStarterGrantLedgerBacked === true,
    rocBalanceMinorUnits: cleanUnsignedIntegerString(settings.rocBalanceMinorUnits),
    rocBalanceDisplay: cleanString(settings.rocBalanceDisplay),
    rocBalanceUpdatedAt: cleanString(settings.rocBalanceUpdatedAt),
    rocLedgerBacked: settings.rocLedgerBacked === true,
    rocBalanceSource: cleanString(settings.rocBalanceSource),
    rocBalanceReason: cleanString(settings.rocBalanceReason),
    lastProductActionAt: cleanString(settings.lastProductActionAt),
    lastProductSchema: cleanString(settings.lastProductSchema),
    lastProductCrabUrl: cleanString(settings.lastProductCrabUrl),
    lastProductB3Cid: cleanString(settings.lastProductB3Cid),
    lastProductSiteName: cleanString(settings.lastProductSiteName),
    lastProductSummary: cleanString(settings.lastProductSummary)
  };
}

function shouldPreserveLedgerBackedBalance(current, incoming) {
  const hadLedgerBackedBalance = current?.rocLedgerBacked === true;
  const incomingIsLedgerBacked = incoming?.rocLedgerBacked === true;

  if (!hadLedgerBackedBalance || incomingIsLedgerBacked) {
    return false;
  }

  const currentMinorUnits = cleanUnsignedIntegerString(current?.rocBalanceMinorUnits);
  const currentDisplay = cleanString(current?.rocBalanceDisplay);
  const incomingMinorUnits = cleanUnsignedIntegerString(incoming?.rocBalanceMinorUnits);
  const incomingDisplay = cleanString(incoming?.rocBalanceDisplay);
  const incomingSource = cleanString(incoming?.rocBalanceSource);

  if (!currentMinorUnits && !currentDisplay) {
    return false;
  }

  if (!incomingMinorUnits && !incomingDisplay) {
    return true;
  }

  return (
    incomingSource === '' ||
    incomingSource === 'omnigate_dev_wallet_view.v1' ||
    incomingSource === 'display-only' ||
    incoming?.rocLedgerBacked !== true
  );
}

function preserveLedgerBackedBalance(current, incoming) {
  return {
    ...incoming,
    walletAccount: incoming.walletAccount || current.walletAccount,
    rocBalanceMinorUnits: current.rocBalanceMinorUnits,
    rocBalanceDisplay: current.rocBalanceDisplay,
    rocLedgerBacked: true,
    rocBalanceSource: current.rocBalanceSource,
    rocBalanceReason:
      current.rocBalanceReason || 'preserved_ledger_backed_balance_after_display_only_refresh'
  };
}

export function normalizeGatewayUrl(value) {
  const raw = cleanString(value || DEFAULT_SETTINGS.gatewayUrl).replace(/\/+$/, '');

  if (!/^https?:\/\/[^/]+/i.test(raw)) {
    return DEFAULT_SETTINGS.gatewayUrl;
  }

  return raw;
}

export function normalizeTimeout(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return DEFAULT_SETTINGS.requestTimeoutMs;
  }

  return Math.min(30000, Math.max(1000, Math.floor(n)));
}

function normalizeReceipts(receipts) {
  if (!Array.isArray(receipts)) {
    return [];
  }

  return receipts
    .map((receipt) => ({
      id: cleanString(receipt?.id),
      route: cleanString(receipt?.route),
      action: cleanString(receipt?.action),
      amountMinorUnits: cleanUnsignedIntegerString(receipt?.amountMinorUnits),
      ledgerBacked: receipt?.ledgerBacked === true,
      source: cleanString(receipt?.source),
      createdAt: cleanString(receipt?.createdAt)
    }))
    .filter((receipt) => receipt.id || receipt.route || receipt.action || receipt.createdAt);
}

function unwrapData(payload) {
  if (payload?.data && typeof payload.data === 'object') {
    return payload.data;
  }

  return payload || {};
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function normalizeB3Cid(value) {
  const raw = cleanString(value).toLowerCase();

  if (/^b3:[0-9a-f]{64}$/.test(raw)) {
    return raw;
  }

  if (/^[0-9a-f]{64}$/.test(raw)) {
    return `b3:${raw}`;
  }

  return '';
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