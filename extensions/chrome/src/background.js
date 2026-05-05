// CrabLink Extension for Chrome — background service worker.
// Keeps install/default setup thin and never pre-seeds identity or wallet truth.
// RO:WHAT — Initializes safe local defaults and bridges Chrome omnibox input to CrabLink full-page tabs.
// RO:WHY — Lets users type `crab <target>` in the browser URL bar without putting product logic in the extension.
// RO:INTERACTS — chrome.storage.local, chrome.omnibox, chrome.tabs, src/crab.js, src/page.html.
// RO:INVARIANTS — gateway-only renderer; no private keys; no fake wallet truth; no silent paid actions.
// RO:SECURITY — local gateway host permissions only; never logs Authorization/dev bearer tokens.

import { normalizeCrabInput } from './crab.js';

const DEFAULTS = {
  schemaVersion: 3,
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

chrome.omnibox.setDefaultSuggestion({
  description: 'Open CrabLink: site, image, music, article, crab://<hash>.image, b3:<hash>, or a site name'
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const value = String(text || '').trim();
  const seeds = value ? [value] : ['site', 'image', 'music', 'article'];

  const suggestions = seeds
    .slice(0, 4)
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
  const crabUrl = normalizeOmniboxTarget(text || 'site');
  await chrome.storage.local.set({ lastCrabUrl: crabUrl });
  await openCrabLinkPage(crabUrl, disposition);
});

function normalizeOmniboxTarget(input) {
  const value = String(input || '').trim();

  if (!value) {
    return 'crab://site';
  }

  const lower = value.toLowerCase();
  if (['site', 'image', 'music', 'article'].includes(lower)) {
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

  throw new Error('Unable to normalize CrabLink omnibox target.');
}

async function openCrabLinkPage(crabUrl, disposition) {
  const pageUrl = chrome.runtime.getURL(`src/page.html?url=${encodeURIComponent(crabUrl)}`);

  if (disposition === 'newBackgroundTab') {
    await chrome.tabs.create({ url: pageUrl, active: false });
    return;
  }

  if (disposition === 'newForegroundTab') {
    await chrome.tabs.create({ url: pageUrl, active: true });
    return;
  }

  try {
    await chrome.tabs.update({ url: pageUrl });
  } catch (_error) {
    await chrome.tabs.create({ url: pageUrl, active: true });
  }
}

function escapeDescription(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}