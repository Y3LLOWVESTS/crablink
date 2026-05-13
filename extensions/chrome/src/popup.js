/**
 * RO:WHAT — Popup launcher for the CrabLink full-tab browser.
 * RO:WHY — Makes React the primary browser lane while preserving legacy page.html as an explicit fallback.
 * RO:INTERACTS — chrome.storage.local, chrome.tabs, root react.html, root page.html.
 * RO:INVARIANTS — no backend calls; no wallet mutation; no fake ROC truth; no private keys.
 * RO:METRICS — none.
 * RO:CONFIG — reads lastCrabUrl only.
 * RO:SECURITY — opens only extension-owned built pages with a crab/b3/raw-hash target.
 * RO:TEST — scripts/check-chrome.sh; manual click extension icon from dist/chrome-extension-staging.
 */

const DEFAULT_BROWSER_URL = 'crab://site';

// IMPORTANT:
// These must be root build outputs in the staged extension.
// Do not use src/react.html here because raw JSX cannot run directly in Chrome.
const REACT_PAGE_PREFIX = 'react.html?url=';
const LEGACY_PAGE_PREFIX = 'page.html?url=';

const els = {
  errorText: document.getElementById('errorText'),
  openButton: document.getElementById('openButton'),
  legacyButton: document.getElementById('legacyButton'),
};

document.addEventListener('DOMContentLoaded', () => {
  void launchCrabLinkBrowser('react');
});

els.openButton?.addEventListener('click', () => {
  void launchCrabLinkBrowser('react');
});

els.legacyButton?.addEventListener('click', () => {
  void launchCrabLinkBrowser('legacy');
});

async function launchCrabLinkBrowser(lane = 'react') {
  try {
    const target = await preferredTarget();
    const normalizedLane = lane === 'legacy' ? 'legacy' : 'react';
    const prefix = normalizedLane === 'legacy' ? LEGACY_PAGE_PREFIX : REACT_PAGE_PREFIX;
    const pageUrl = chrome.runtime.getURL(`${prefix}${encodeURIComponent(target)}`);

    await chrome.storage.local.set({
      lastCrabUrl: target,
      preferredBrowserLane: normalizedLane === 'legacy' ? 'react' : normalizedLane,
    });

    await chrome.tabs.create({ url: pageUrl, active: true });

    window.setTimeout(() => {
      window.close();
    }, 60);
  } catch (error) {
    document.body.classList.add('error');
    els.errorText.textContent = error?.message || 'Failed to open CrabLink browser.';
  }
}

async function preferredTarget() {
  const stored = await chrome.storage.local.get(['lastCrabUrl']);
  return normalizeTarget(stored.lastCrabUrl || DEFAULT_BROWSER_URL);
}

function normalizeTarget(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return DEFAULT_BROWSER_URL;
  }

  if (raw.startsWith('crab://')) {
    return normalizeCrabUrl(raw.toLowerCase());
  }

  if (/^b3:[0-9a-fA-F]{64}$/.test(raw)) {
    return raw.toLowerCase();
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return `crab://${raw.toLowerCase()}.image`;
  }

  if (/^[a-z0-9][a-z0-9._-]{0,62}$/i.test(raw)) {
    return `crab://${raw.toLowerCase()}`;
  }

  return DEFAULT_BROWSER_URL;
}

function normalizeCrabUrl(value) {
  const body = String(value || '').replace(/^crab:\/\//, '');

  if (!body) {
    return DEFAULT_BROWSER_URL;
  }

  if (body.startsWith('b3/')) {
    const match = body.slice('b3/'.length).match(/^([0-9a-f]{64})\.([a-z][a-z0-9_-]{0,31})$/i);

    if (match) {
      return `crab://${match[1].toLowerCase()}.${match[2].toLowerCase()}`;
    }

    return DEFAULT_BROWSER_URL;
  }

  return `crab://${body}`;
}