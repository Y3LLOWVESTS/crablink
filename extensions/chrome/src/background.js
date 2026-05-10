// CrabLink Extension for Chrome — background service worker.
// Keeps install/default setup thin and never pre-seeds identity or wallet truth.
// RO:WHAT — Initializes safe local defaults and opens CrabLink full-page tabs.
// RO:WHY — Makes the extension icon behave like a browser-launch button, while allowing explicit React-lane tests.
// RO:INTERACTS — chrome.storage.local, chrome.action, chrome.omnibox, chrome.tabs, src/crab.js, src/page.html, root react.html.
// RO:INVARIANTS — gateway-only renderer; no private keys; no fake wallet truth; no silent paid actions.
// RO:SECURITY — local gateway host permissions only; never logs Authorization/dev bearer tokens.

import { normalizeCrabInput } from './crab.js';

const DEFAULT_BROWSER_URL = 'crab://site';
const DEFAULT_REACT_BROWSER_URL = 'crab://profile';

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
    'Open CrabLink: site, image, profile, reactprofile, reactimage, crab://<hash>.image, b3:<hash>, or a site name',
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const command = parseOmniboxCommand(text);
  const seeds = command.target ? [command.target] : ['reactprofile', ...BUILTIN_TARGETS];

  const suggestions = seeds
    .slice(0, 8)
    .map((seed) => {
      try {
        const nextCommand = parseOmniboxCommand(seed || command.defaultTarget);
        const crabUrl = normalizeOmniboxTarget(nextCommand.target || nextCommand.defaultTarget);
        const content = nextCommand.lane === 'react' ? toReactShortcut(nextCommand.target) : seed;
        const laneLabel = nextCommand.lane === 'react' ? 'React refactor lane' : 'protected legacy lane';

        return {
          content,
          description: `Open ${escapeDescription(crabUrl)} in the ${escapeDescription(laneLabel)}`,
        };
      } catch (_error) {
        return null;
      }
    })
    .filter(Boolean);

  suggest(suggestions);
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const command = parseOmniboxCommand(text || DEFAULT_BROWSER_URL);
  const crabUrl = normalizeOmniboxTarget(command.target || command.defaultTarget);

  await chrome.storage.local.set({ lastCrabUrl: crabUrl });
  await openCrabLinkPage(crabUrl, disposition, { lane: command.lane });
});

async function openPreferredCrabLinkPage() {
  const stored = await chrome.storage.local.get(['lastCrabUrl']);
  const crabUrl = normalizeActionTarget(stored.lastCrabUrl || DEFAULT_BROWSER_URL);

  await chrome.storage.local.set({ lastCrabUrl: crabUrl });
  await openCrabLinkPage(crabUrl, 'newForegroundTab', { lane: 'legacy' });
}

function parseOmniboxCommand(input) {
  const raw = String(input || '').trim();

  if (!raw) {
    return {
      lane: 'legacy',
      target: '',
      defaultTarget: DEFAULT_BROWSER_URL,
    };
  }

  if (/^react:\/\//i.test(raw)) {
    return {
      lane: 'react',
      target: raw.replace(/^react:\/\//i, '').trim(),
      defaultTarget: DEFAULT_REACT_BROWSER_URL,
    };
  }

  if (/^react(?::|\s+|\/|$)/i.test(raw)) {
    return {
      lane: 'react',
      target: raw.replace(/^react(?::|\s+|\/)?/i, '').trim(),
      defaultTarget: DEFAULT_REACT_BROWSER_URL,
    };
  }

  const compactReact = parseCompactReactShortcut(raw);
  if (compactReact) {
    return {
      lane: 'react',
      target: compactReact,
      defaultTarget: DEFAULT_REACT_BROWSER_URL,
    };
  }

  return {
    lane: 'legacy',
    target: raw,
    defaultTarget: DEFAULT_BROWSER_URL,
  };
}

function parseCompactReactShortcut(raw) {
  const value = String(raw || '').trim();
  const lower = value.toLowerCase();

  if (!lower.startsWith('react')) {
    return '';
  }

  const rest = value.slice('react'.length).trim();

  if (!rest) {
    return 'profile';
  }

  const restLower = rest.toLowerCase();

  if (BUILTIN_TARGETS.includes(restLower)) {
    return restLower;
  }

  if (restLower.startsWith('crab://') || restLower.startsWith('b3:') || /^[0-9a-f]{64}(\.[a-z0-9_-]+)?$/i.test(rest)) {
    return rest;
  }

  return '';
}

function toReactShortcut(target) {
  const safe = String(target || '').trim();

  if (!safe) {
    return 'reactprofile';
  }

  const lower = safe.toLowerCase();

  if (BUILTIN_TARGETS.includes(lower)) {
    return `react${lower}`;
  }

  return `react ${safe}`;
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
    /^[0-9a-fA-F]{64}$/.test(value) ||
    /^[0-9a-fA-F]{64}\.[a-z0-9_-]+$/.test(value);

  const candidate = explicit ? value : `crab://${value}`;
  const normalized = normalizeCrabInput(candidate, { defaultKind: 'image' });

  if (normalized.url) {
    return normalized.url;
  }

  throw new Error('Unable to normalize CrabLink target.');
}

async function openCrabLinkPage(crabUrl, disposition, { lane = 'legacy' } = {}) {
  const safeLane = lane === 'react' ? 'react' : 'legacy';

  const entry = safeLane === 'react' ? 'react.html' : 'src/page.html';
  const pageUrl = chrome.runtime.getURL(`${entry}?url=${encodeURIComponent(crabUrl)}`);

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