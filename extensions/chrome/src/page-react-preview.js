/**
 * RO:WHAT — Adds a safe legacy-lane button that opens the current route in the React refactor lane.
 * RO:WHY — CrabLink refactor DX; makes extension-origin React testing discoverable without flipping the live toolbar path.
 * RO:INTERACTS — page.html, addressInput, footerStatus, root react.html packaged by scripts/package-chrome.sh.
 * RO:INVARIANTS — no backend calls; no wallet mutation; no fake receipt/balance/profile truth; old page.html remains protected.
 * RO:METRICS — none.
 * RO:CONFIG — current address bar route only.
 * RO:SECURITY — opens packaged extension page only; does not execute crab:// content or request new permissions.
 * RO:TEST — node --check; click React in old lane; verify react.html?url=<encoded crab URL> opens.
 */

const STYLE_ID = 'crablinkReactPreviewBridgeStyles';
const BUTTON_ID = 'reactPreviewButton';
const DEFAULT_REACT_ROUTE = 'crab://profile';

function boot() {
  installStyles();
  wireReactPreviewButton();
}

function wireReactPreviewButton() {
  const button = ensureButton();

  if (!button || button.dataset.crablinkReactPreviewReady === '1') {
    return;
  }

  button.dataset.crablinkReactPreviewReady = '1';
  button.addEventListener('click', openReactPreview);
}

function ensureButton() {
  const existing = document.getElementById(BUTTON_ID);

  if (existing) {
    prepareButton(existing);
    return existing;
  }

  const topActions = document.querySelector('.top-actions');
  if (!topActions) {
    return null;
  }

  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.className = 'secondary react-preview-button';

  const balance = document.getElementById('topRocBalance');
  if (balance && balance.parentElement === topActions) {
    topActions.insertBefore(button, balance);
  } else {
    topActions.append(button);
  }

  prepareButton(button);
  return button;
}

function prepareButton(button) {
  button.textContent = 'React';
  button.title = 'Open the current CrabLink route in the React refactor lane';
  button.setAttribute('aria-label', 'Open React refactor preview');
}

function openReactPreview(event) {
  const route = currentCrabRoute();
  const url = reactUrlFor(route);

  if (!url) {
    setFooterSoft('React preview unavailable: packaged react.html was not found.');
    return;
  }

  if (event?.metaKey || event?.ctrlKey) {
    copyReactUrl(url);
    return;
  }

  setFooterSoft(`Opening React preview for ${route}`);
  window.open(url, '_blank', 'noopener,noreferrer');
}

function reactUrlFor(crabUrl) {
  const encoded = encodeURIComponent(crabUrl || DEFAULT_REACT_ROUTE);

  try {
    if (globalThis.chrome?.runtime?.getURL) {
      return chrome.runtime.getURL(`react.html?url=${encoded}`);
    }
  } catch {
    // Fall through to URL-relative mode.
  }

  try {
    return new URL(`../react.html?url=${encoded}`, window.location.href).toString();
  } catch {
    return `../react.html?url=${encoded}`;
  }
}

async function copyReactUrl(url) {
  try {
    await navigator.clipboard.writeText(url);
    setFooterSoft('React preview URL copied.');
  } catch {
    setFooterSoft('React preview URL copy failed; opened preview instead.');
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function currentCrabRoute() {
  const fromAddress = normalizeCrabLike(document.getElementById('addressInput')?.value);
  if (fromAddress) {
    return fromAddress;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = normalizeCrabLike(params.get('url') || params.get('crab'));
    if (fromUrl) {
      return fromUrl;
    }
  } catch {
    // Query parsing is best-effort only.
  }

  return DEFAULT_REACT_ROUTE;
}

function normalizeCrabLike(value) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return '';
  }

  if (/^crab:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '');
  }

  const b3Match = raw.match(/^b3:([0-9a-f]{64})$/i);
  if (b3Match) {
    return `crab://${b3Match[1].toLowerCase()}.image`;
  }

  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return `crab://${raw.toLowerCase()}.image`;
  }

  if (/^[0-9a-f]{64}\.[a-z0-9_-]+$/i.test(raw)) {
    return `crab://${raw.toLowerCase()}`;
  }

  if (/^[a-z0-9][a-z0-9-]{0,62}$/i.test(raw)) {
    return `crab://${raw.toLowerCase()}`;
  }

  return '';
}

function setFooterSoft(message) {
  const footer = document.getElementById('footerStatus');
  if (footer) {
    footer.textContent = message;
  }
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .react-preview-button {
      min-width: 76px;
      border-color: rgba(125, 211, 252, 0.4) !important;
      background:
        linear-gradient(135deg, rgba(59, 130, 246, 0.26), rgba(14, 165, 233, 0.16)),
        rgba(15, 23, 42, 0.72) !important;
      color: #dbeafe !important;
      font-weight: 950 !important;
      letter-spacing: 0.01em;
    }

    .react-preview-button:hover {
      border-color: rgba(147, 197, 253, 0.72) !important;
      background:
        linear-gradient(135deg, rgba(59, 130, 246, 0.36), rgba(14, 165, 233, 0.25)),
        rgba(15, 23, 42, 0.82) !important;
      color: #ffffff !important;
    }

    @media (max-width: 900px) {
      .react-preview-button {
        flex: 1;
      }
    }
  `;

  document.head.append(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}