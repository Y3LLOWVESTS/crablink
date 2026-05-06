/**
 * RO:WHAT — Emergency launcher for the CrabLink full-tab browser.
 * RO:WHY — Bypasses the old Chrome action popup path and opens the real CrabLink browser surface.
 * RO:INTERACTS — chrome.storage.local, chrome.tabs, src/page.html.
 * RO:INVARIANTS — no backend calls; no wallet mutation; no fake ROC truth; no private keys.
 * RO:METRICS — none.
 * RO:CONFIG — reads lastCrabUrl only.
 * RO:SECURITY — opens only extension-owned page.html with a crab/b3/raw-hash target.
 * RO:TEST — scripts/check-chrome.sh; manual click extension icon.
 */

const DEFAULT_BROWSER_URL = 'crab://site';

const els = {
  errorText: document.getElementById('errorText'),
  openButton: document.getElementById('openButton')
};

document.addEventListener('DOMContentLoaded', () => {
  void launchCrabLinkBrowser();
});

els.openButton.addEventListener('click', () => {
  void launchCrabLinkBrowser();
});

async function launchCrabLinkBrowser() {
  try {
    const target = await preferredTarget();
    const pageUrl = chrome.runtime.getURL(`src/page.html?url=${encodeURIComponent(target)}`);

    await chrome.storage.local.set({ lastCrabUrl: target });
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
    return raw;
  }

  if (/^b3:[0-9a-fA-F]{64}$/.test(raw)) {
    return raw.toLowerCase();
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return `crab://${raw.toLowerCase()}.image`;
  }

  if (/^[a-z0-9][a-z0-9-]{0,62}$/i.test(raw)) {
    return `crab://${raw.toLowerCase()}`;
  }

  return DEFAULT_BROWSER_URL;
}