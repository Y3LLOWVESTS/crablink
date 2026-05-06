// CrabLink Extension for Chrome — background service worker.
// Keeps install/default setup thin and never pre-seeds identity or wallet truth.
// RO:WHAT — Initializes safe local defaults and opens CrabLink full-page tabs.
// RO:WHY — Makes the extension icon behave like a browser-launch button, not a tiny popup.
// RO:INTERACTS — chrome.storage.local, chrome.action, chrome.omnibox, chrome.tabs, src/crab.js, src/page.html.
// RO:INVARIANTS — gateway-only renderer; no private keys; no fake wallet truth; no silent paid actions.
// RO:SECURITY — local gateway host permissions only; never logs Authorization/dev bearer tokens.

import { normalizeCrabInput } from './crab.js';

const DEFAULT_BROWSER_URL = 'crab://site';
const BUILTIN_TARGETS = ['site', 'image', 'profile', 'music', 'article', 'video', 'stream', 'podcast'];

const DEFAULTS = {
  schemaVersion: 3,
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
  lastProductActionAt: '',
  lastProductSchema: '',
  lastProductCrabUrl: '',
  lastProductB3Cid: '',
  lastProductSiteName: '',
  lastProductSummary: ''
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
  }

  if (Object.keys(next).length > 0) {
    await chrome.storage.local.set(next);
  }
});

chrome.action.onClicked.addListener(async () => {
  await openPreferredCrabLinkPage();
});

chrome.omnibox.setDefaultSuggestion({
  description:
    'Open CrabLink: site, image, profile, music, article, video, stream, podcast, crab://<hash>.image, b3:<hash>, or a site name'
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const value = String(text || '').trim();
  const seeds = value ? [value] : BUILTIN_TARGETS;

  const suggestions = seeds
    .slice(0, 8)
    .map((seed) => {
      try {
        const crabUrl = normalizeOmniboxTarget(seed);
        return {
          content: seed,
          description: `Open ${escapeDescription(crabUrl)} in a full CrabLink tab`
        };
      } catch (_error) {
        return null;
      }
    })
    .filter(Boolean);

  suggest(suggestions);
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const crabUrl = normalizeOmniboxTarget(text || DEFAULT_BROWSER_URL);
  await chrome.storage.local.set({ lastCrabUrl: crabUrl });
  await openCrabLinkPage(crabUrl, disposition);
});

async function openPreferredCrabLinkPage() {
  const stored = await chrome.storage.local.get(['lastCrabUrl']);
  const crabUrl = normalizeActionTarget(stored.lastCrabUrl || DEFAULT_BROWSER_URL);

  await chrome.storage.local.set({ lastCrabUrl: crabUrl });
  await openCrabLinkPage(crabUrl, 'newForegroundTab');
}

function normalizeActionTarget(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return DEFAULT_BROWSER_URL;
  }

  try {
    return normalizeOmniboxTarget(raw);
  } catch (_error) {
    return DEFAULT_BROWSER_URL;
  }
}

function normalizeOmniboxTarget(input) {
  const value = String(input || '').trim();

  if (!value) {
    return DEFAULT_BROWSER_URL;
  }

  const lower = value.toLowerCase();

  if (BUILTIN_TARGETS.includes(lower)) {
    return `crab://${lower}`;
  }

  const explicit =
    value.startsWith('crab://') ||
    value.startsWith('b3:') ||
    /^[0-9a-fA-F]{64}$/.test(value);

  const candidate = explicit ? value : `crab://${value}`;
  const normalized = normalizeCrabInput(candidate, { defaultKind: 'image' });

  if (normalized.url) {
    return normalized.url;
  }

  throw new Error('Unable to normalize CrabLink target.');
}

async function openCrabLinkPage(crabUrl, disposition) {
  const pageUrl = chrome.runtime.getURL(`src/page.html?url=${encodeURIComponent(crabUrl)}`);

  if (disposition === 'newBackgroundTab') {
    await chrome.tabs.create({ url: pageUrl, active: false });
    return;
  }

  await chrome.tabs.create({ url: pageUrl, active: true });
}

function escapeDescription(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}