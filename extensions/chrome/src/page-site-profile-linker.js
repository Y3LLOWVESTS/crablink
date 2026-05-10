/**
 * RO:WHAT — Adds a direct read-only public-profile shortcut to rendered crab:// site creator bars.
 * RO:WHY — NEXT_LEVEL creator identity UX; Concerns: DX/SEC; make site creator @username actionable without pretending profile manifests are published.
 * RO:INTERACTS — page-site-render-mode.js, page-site-creator-proof.js, page.html, storage.js, developer JSON payloads.
 * RO:INVARIANTS — gateway-only; no backend mutation; no fake profile publication; no fake REP/MOD; local display labels are not profile proof.
 * RO:METRICS — none; this only changes local browser navigation to existing CrabLink routes.
 * RO:CONFIG — reads local settings only to detect/avoid local-display-only creator labels.
 * RO:SECURITY — textContent/createElement only; opens only crab://@username or explicit crab:// profile URLs from backend/manifest fields.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual rendered site → Read Profile → crab://@username profile lookup.
 */

import { getSettings } from './storage.js';

const SITE_SCHEMA = 'omnigate.site-page.v1';
const STYLE_ID = 'crablinkSiteProfileLinkerStyles';
const VIEWPORT_ID = 'crablinkSiteViewport';
const CREATOR_HANDLE_ID = 'crablinkSiteCreatorHandle';
const PROFILE_BUTTON_ID = 'crablinkSiteCreatorProfileButton';
const PROFILE_HINT_ID = 'crablinkSiteCreatorProfileHint';

let renderTimer = 0;
let lastSignature = '';

function boot() {
  installStyles();
  scheduleEnhance();

  const observed = document.getElementById('pagePanel') || document.body || document.documentElement;
  if (observed) {
    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(observed, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'data-profile-published', 'data-creator-source']
    });
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;

      const watched = [
        'handle',
        'username',
        'requestedHandle',
        'requestedUsername',
        'usernameStatus',
        'profileCrabUrl',
        'publicProfileCid'
      ];

      if (watched.some((key) => Object.prototype.hasOwnProperty.call(changes, key))) {
        scheduleEnhance();
      }
    });
  }

  document.addEventListener(
    'click',
    (event) => {
      const button = event.target?.closest?.(`#${PROFILE_BUTTON_ID}`);
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const url = button.getAttribute('data-crablink-site-creator-profile-url') || '';
      if (!url) {
        setFooter('No backend/manifest creator profile route is available yet.');
        return;
      }

      openCrabUrl(url);
    },
    true
  );
}

function scheduleEnhance() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    enhanceCreatorProfileShortcut().catch((error) => {
      setFooter(`Creator profile shortcut skipped: ${error?.message || error}`);
    });
  }, 90);
}

async function enhanceCreatorProfileShortcut() {
  const payload = readPayload();
  const viewport = document.getElementById(VIEWPORT_ID);
  const creatorButton = document.getElementById(CREATOR_HANDLE_ID);

  if (!payload || payload.schema !== SITE_SCHEMA || !viewport || !creatorButton) {
    cleanupShortcut();
    lastSignature = '';
    return;
  }

  const settings = await safeSettings();
  const creator = creatorProfileInfo(payload, settings);
  const signature = JSON.stringify({
    site: siteUrl(payload),
    handle: creator.handle,
    source: creator.source,
    profileUrl: creator.profileUrl,
    lookupUrl: creator.lookupUrl,
    status: creator.status
  });

  if (signature === lastSignature && document.getElementById(PROFILE_BUTTON_ID)) {
    return;
  }

  lastSignature = signature;
  installShortcut(creatorButton, creator);
}

function installShortcut(creatorButton, creator) {
  const chip = creatorButton.closest('.site-creator-chip');
  if (!chip) return;

  let button = document.getElementById(PROFILE_BUTTON_ID);
  if (!button) {
    button = document.createElement('button');
    button.id = PROFILE_BUTTON_ID;
    button.type = 'button';
    button.className = 'site-creator-profile-shortcut';
  }

  button.textContent = creator.lookupUrl ? 'Read Profile' : 'Profile Pending';
  button.disabled = !creator.lookupUrl;
  button.setAttribute('data-crablink-site-creator-profile-url', creator.lookupUrl || '');
  button.setAttribute('data-profile-source', creator.source);
  button.title = creator.lookupUrl
    ? `Read ${creator.handle} through CrabLink public profile lookup: ${creator.lookupUrl}`
    : creator.status;

  if (!button.parentElement) {
    const stats = chip.querySelector('#crablinkSiteCreatorStats');
    if (stats) {
      chip.insertBefore(button, stats);
    } else {
      chip.append(button);
    }
  }

  let hint = document.getElementById(PROFILE_HINT_ID);
  if (!hint) {
    hint = document.createElement('span');
    hint.id = PROFILE_HINT_ID;
    hint.className = 'site-creator-profile-hint';
    chip.append(hint);
  }

  hint.textContent = creator.lookupUrl ? creator.status : 'profile route not proven';
  hint.title = creator.truthBoundary;
}

function cleanupShortcut() {
  document.getElementById(PROFILE_BUTTON_ID)?.remove();
  document.getElementById(PROFILE_HINT_ID)?.remove();
}

function creatorProfileInfo(payload, settings) {
  const publicProfile = firstObject(payload.public_profile, payload.publicProfile, payload.profile, payload.creator, payload.owner);
  const explicitUrl = clean(
    publicProfile.crab_url ||
      publicProfile.crabUrl ||
      publicProfile.profile_crab_url ||
      publicProfile.profileCrabUrl ||
      payload.creator_crab_url ||
      payload.creator_profile_crab_url ||
      payload.owner_crab_url ||
      payload.owner_profile_crab_url ||
      ''
  );

  const profileCid = clean(
    publicProfile.cid ||
      publicProfile.profile_cid ||
      publicProfile.profileCid ||
      payload.creator_profile_cid ||
      payload.owner_profile_cid ||
      ''
  );

  const manifestHandle = clean(
    publicProfile.username ||
      publicProfile.handle ||
      payload.creator_username ||
      payload.creator_handle ||
      payload.owner_username ||
      payload.owner_handle ||
      ''
  );

  const localHandle = clean(settings.username || settings.handle || settings.requestedUsername || settings.requestedHandle || '');
  const handle = normalizeHandle(manifestHandle || localHandle || '');
  const source = creatorSource(payload, publicProfile, explicitUrl, profileCid, manifestHandle, localHandle);
  const lookupUrl = profileLookupUrl({
    handle,
    explicitUrl,
    source
  });

  const hasPublishedProfile = Boolean(explicitUrl || profileCid || publicProfile.schema || publicProfile.kind);
  const status = lookupUrl
    ? hasPublishedProfile
      ? 'published profile route'
      : 'site-manifest @username lookup'
    : source === 'local-display'
      ? 'local display label only'
      : 'profile route not proven';

  return {
    handle: handle || '@username',
    source,
    profileUrl: explicitUrl.startsWith('crab://') ? explicitUrl : '',
    lookupUrl,
    status,
    truthBoundary: lookupUrl
      ? 'This opens a read-only public profile lookup through CrabLink. It does not prove profile manifest publication unless the backend/manifest supplies a profile route or CID.'
      : 'CrabLink will not create a profile lookup from local display labels alone.'
  };
}

function creatorSource(payload, publicProfile, explicitUrl, profileCid, manifestHandle, localHandle) {
  if (explicitUrl || profileCid || publicProfile.schema || publicProfile.kind) return 'published-profile';
  if (payload.creator || payload.owner_username || payload.creator_username || payload.owner_handle || payload.creator_handle || manifestHandle) {
    return 'site-manifest';
  }
  if (localHandle) return 'local-display';
  return 'placeholder';
}

function profileLookupUrl({ handle, explicitUrl, source }) {
  if (explicitUrl && explicitUrl.startsWith('crab://')) return explicitUrl;

  const normalized = normalizeHandle(handle);
  const isUsableHandle = /^@[a-z0-9][a-z0-9._-]{1,31}$/.test(normalized) && normalized !== '@username';
  const isManifestBacked = source === 'published-profile' || source === 'site-manifest';

  if (!isUsableHandle || !isManifestBacked) return '';

  return `crab://${normalized}`;
}

function readPayload() {
  const raw = clean(document.getElementById('developerJson')?.textContent || '');
  if (!raw || raw === '{}') return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function safeSettings() {
  try {
    return await getSettings();
  } catch {
    return {};
  }
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  }

  return {};
}

function siteUrl(payload) {
  return clean(
    payload.links?.crab ||
      payload.crab_url ||
      (payload.site_name ? `crab://${payload.site_name}` : payload.name ? `crab://${payload.name}` : 'crab://site')
  );
}

function normalizeHandle(value) {
  const raw = clean(value).replace(/^@+/, '');
  if (!raw || raw === 'username') return '';

  if (raw.startsWith('passport:')) return '';

  const safe = raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');

  return safe ? `@${safe}` : '';
}

function openCrabUrl(url) {
  const input = document.getElementById('addressInput');
  const form = document.getElementById('addressForm');

  if (!input || !form) {
    setFooter(url);
    return;
  }

  input.value = url;

  if (typeof form.requestSubmit === 'function') {
    form.requestSubmit();
    return;
  }

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function clean(value) {
  return String(value ?? '').trim();
}

function setFooter(message) {
  const footer = document.getElementById('footerStatus');
  if (footer) footer.textContent = message;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .site-creator-profile-shortcut {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 28px;
      padding: 5px 10px;
      border: 1px solid rgba(59, 130, 246, 0.34);
      border-radius: 999px;
      color: #dbeafe;
      background:
        radial-gradient(circle at top left, rgba(59, 130, 246, 0.26), transparent 48%),
        rgba(30, 64, 175, 0.34);
      font-size: 11px;
      font-weight: 950;
      line-height: 1;
      white-space: nowrap;
    }

    .site-creator-profile-shortcut:hover:not(:disabled) {
      transform: translateY(-1px);
      border-color: rgba(147, 197, 253, 0.58);
      color: #ffffff;
      background:
        radial-gradient(circle at top left, rgba(59, 130, 246, 0.34), transparent 48%),
        rgba(37, 99, 235, 0.62);
    }

    .site-creator-profile-shortcut:disabled {
      cursor: not-allowed;
      border-color: rgba(148, 163, 184, 0.18);
      color: #94a3b8;
      background: rgba(15, 23, 42, 0.42);
      opacity: 0.78;
    }

    .site-creator-profile-hint {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 5px 8px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 999px;
      color: #cbd5e1;
      background: rgba(15, 23, 42, 0.38);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    @media (max-width: 760px) {
      .site-creator-profile-shortcut,
      .site-creator-profile-hint {
        width: 100%;
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