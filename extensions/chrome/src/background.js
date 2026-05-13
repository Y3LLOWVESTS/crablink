// CrabLink Extension for Chrome — background service worker.
// Keeps install/default setup thin and never pre-seeds identity or wallet truth.
// RO:WHAT — Initializes safe local defaults and opens CrabLink full-page tabs.
// RO:WHY — Makes the extension icon open the Vite-built React browser lane while preserving built legacy fallback.
// RO:INTERACTS — chrome.storage.local, chrome.action, chrome.omnibox, chrome.tabs, root react.html, root page.html.
// RO:INVARIANTS — gateway-only renderer; no private keys; no fake wallet truth; no silent paid actions.
// RO:SECURITY — local gateway host permissions only; never logs Authorization/dev bearer tokens.
// RO:TEST — scripts/check-chrome.sh; scripts/check-react-lane.sh; manual click extension icon from dist/chrome-extension-staging.

const DEFAULT_BROWSER_URL = 'crab://site';
const DEFAULT_REACT_BROWSER_URL = 'crab://site';

// IMPORTANT:
// These must be root build outputs in the packaged/staged extension.
// Do not use src/react.html here. Raw src/react.html imports ./app/main.jsx,
// which Chrome serves as application/octet-stream and causes a blank page.
const LEGACY_PAGE_PREFIX = 'page.html?url=';
const REACT_PAGE_PREFIX = 'react.html?url=';

const BUILTIN_TARGETS = [
  'site',
  'image',
  'profile',
  'music',
  'lyrics',
  'article',
  'post',
  'comment',
  'video',
  'stream',
  'podcast',
  'ad',
  'algo',
  'code',
  'game',
];

const DEFAULTS = {
  schemaVersion: 4,
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
  preferredBrowserLane: 'react',
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
  lastProductActionAt: '',
  lastProductSchema: '',
  lastProductCrabUrl: '',
  lastProductB3Cid: '',
  lastProductSiteName: '',
  lastProductSummary: '',
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const next = {};

  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (existing[key] === undefined) {
      next[key] = value;
    }
  }

  if (existing.schemaVersion !== undefined && Number(existing.schemaVersion) < DEFAULTS.schemaVersion) {
    next.schemaVersion = DEFAULTS.schemaVersion;
    next.preferredBrowserLane = existing.preferredBrowserLane || 'react';
  }

  if (Object.keys(next).length > 0) {
    await chrome.storage.local.set(next);
  }
});

chrome.action.onClicked.addListener(async () => {
  await openPreferredCrabLinkPage({ forceLane: 'react' });
});

chrome.omnibox.setDefaultSuggestion({
  description: escapeDescription(
    'Open CrabLink React: site, image, profile, reactprofile, legacy site, crab://64hex.image, b3:64hex, or a site name',
  ),
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const parsed = parseOmniboxText(text);
  await openCrabLinkPage(parsed.target, {
    lane: parsed.lane,
    disposition,
  });
});

async function openPreferredCrabLinkPage({ forceLane = '' } = {}) {
  const stored = await chrome.storage.local.get(['lastCrabUrl', 'preferredBrowserLane']);
  const target = normalizeTarget(stored.lastCrabUrl || DEFAULT_REACT_BROWSER_URL);
  const lane = normalizeLane(forceLane || stored.preferredBrowserLane || 'react');

  await openCrabLinkPage(target, { lane });
}

async function openCrabLinkPage(target, { lane = 'react', disposition = 'currentTab' } = {}) {
  const normalizedTarget = normalizeTarget(target || DEFAULT_BROWSER_URL);
  const normalizedLane = normalizeLane(lane);
  const prefix = normalizedLane === 'legacy' ? LEGACY_PAGE_PREFIX : REACT_PAGE_PREFIX;
  const url = chrome.runtime.getURL(`${prefix}${encodeURIComponent(normalizedTarget)}`);

  await chrome.storage.local.set({
    lastCrabUrl: normalizedTarget,
    preferredBrowserLane: normalizedLane === 'legacy' ? 'react' : normalizedLane,
  });

  if (disposition === 'currentTab') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tabs?.[0]?.id) {
      await chrome.tabs.update(tabs[0].id, { url, active: true });
      return;
    }
  }

  await chrome.tabs.create({
    url,
    active: disposition !== 'backgroundTab',
  });
}

function parseOmniboxText(text) {
  const raw = String(text || '').trim();

  if (!raw) {
    return {
      lane: 'react',
      target: DEFAULT_REACT_BROWSER_URL,
    };
  }

  const clean = raw.replace(/\s+/g, ' ');
  const lower = clean.toLowerCase();

  if (lower === 'legacy' || lower === 'old' || lower === 'page') {
    return {
      lane: 'legacy',
      target: DEFAULT_BROWSER_URL,
    };
  }

  if (lower === 'react') {
    return {
      lane: 'react',
      target: DEFAULT_REACT_BROWSER_URL,
    };
  }

  if (lower.startsWith('legacy ') || lower.startsWith('old ') || lower.startsWith('page ')) {
    return {
      lane: 'legacy',
      target: normalizeTarget(clean.replace(/^(legacy|old|page)\s+/i, '')),
    };
  }

  if (lower.startsWith('react ')) {
    return {
      lane: 'react',
      target: normalizeTarget(clean.replace(/^react\s+/i, '')),
    };
  }

  if (lower.startsWith('react') && BUILTIN_TARGETS.includes(lower.slice('react'.length))) {
    return {
      lane: 'react',
      target: `crab://${lower.slice('react'.length)}`,
    };
  }

  if (lower.startsWith('legacy') && BUILTIN_TARGETS.includes(lower.slice('legacy'.length))) {
    return {
      lane: 'legacy',
      target: `crab://${lower.slice('legacy'.length)}`,
    };
  }

  return {
    lane: 'react',
    target: normalizeTarget(clean),
  };
}

function normalizeLane(value) {
  const lane = String(value || '').trim().toLowerCase();
  return lane === 'legacy' || lane === 'page' || lane === 'old' ? 'legacy' : 'react';
}

function normalizeTarget(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return DEFAULT_BROWSER_URL;
  }

  const lower = raw.toLowerCase();

  if (lower.startsWith('crab://')) {
    return normalizeCrabUrl(lower);
  }

  if (/^b3:[0-9a-f]{64}$/i.test(raw)) {
    return raw.toLowerCase();
  }

  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return `crab://${raw.toLowerCase()}.image`;
  }

  if (BUILTIN_TARGETS.includes(lower)) {
    return `crab://${lower}`;
  }

  if (/^@[a-z0-9][a-z0-9_.-]{2,31}$/i.test(raw)) {
    return `crab://${raw.toLowerCase()}`;
  }

  if (/^[a-z0-9][a-z0-9._-]{0,62}$/i.test(raw)) {
    return `crab://${raw.toLowerCase()}`;
  }

  return DEFAULT_BROWSER_URL;
}

function normalizeCrabUrl(value) {
  const raw = String(value || '').trim();

  if (!raw.startsWith('crab://')) {
    return DEFAULT_BROWSER_URL;
  }

  const body = raw.slice('crab://'.length);

  if (!body) {
    return DEFAULT_BROWSER_URL;
  }

  if (body.startsWith('b3/')) {
    const maybe = body.slice('b3/'.length);
    const match = maybe.match(/^([0-9a-f]{64})\.([a-z][a-z0-9_-]{0,31})$/i);

    if (match) {
      return `crab://${match[1].toLowerCase()}.${match[2].toLowerCase()}`;
    }

    return DEFAULT_BROWSER_URL;
  }

  return `crab://${body}`;
}

function escapeDescription(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/"/g, '&quot;');
}