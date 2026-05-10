/**
 * RO:WHAT — Gateway-only public profile claim/read bridge for CrabLink profile pages.
 * RO:WHY — NEXT_LEVEL identity truth; Concerns: DX/SEC; consume backend-confirmed @username state without inventing it locally.
 * RO:INTERACTS — ronClient.js, storage.js, page-profile-home.js, chrome.storage.local, svc-gateway public profile routes.
 * RO:INVARIANTS — gateway-only; no wallet mutation; no local confirmed username; no profile CID claim unless backend returns one.
 * RO:METRICS — sends x-correlation-id through RonClient for backend route tracing.
 * RO:CONFIG — reads gatewayUrl, authToken, passportSubject, walletAccount, username draft, and local profile draft.
 * RO:SECURITY — textContent/createElement only; no private keys; no seed phrases; no spend authority; no direct internal service calls.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://profile → Claim Public @username / Refresh Backend Profile.
 * RO:ROUTES — POST /identity/passport/profile/claim; GET /identity/passport/profile/:username.
 */

import { RonClient, RonClientError } from './ronClient.js';
import { getSettings } from './storage.js';

const STYLE_ID = 'crablinkProfileGatewayStyles';
const CARD_ID = 'profileGatewayClaimCard';
const STATUS_ID = 'profileGatewayClaimStatus';
const PROFILE_DRAFT_KEY = 'crablinkProfileDraftV1';
const PROFILE_SECTION_ID = 'profileHomeSection';
const PROFILE_VIEW_CLASS = 'crablink-profile-view-mode';

let enhanceTimer = 0;
let busy = false;

function boot() {
  installStyles();
  bindProfileGatewayActions();
  observeProfileRender();
  scheduleEnhance();

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;

      const watched = [
        PROFILE_DRAFT_KEY,
        'passportSubject',
        'walletAccount',
        'requestedUsername',
        'requestedHandle',
        'username',
        'handle',
        'usernameStatus',
        'profileCrabUrl',
        'publicProfileCid',
        'usernameUpdatedAt'
      ];

      if (watched.some((key) => Object.prototype.hasOwnProperty.call(changes, key))) {
        scheduleEnhance();
      }
    });
  }

  document.addEventListener('crablink:profile-draft-updated', scheduleEnhance);
  window.setTimeout(scheduleEnhance, 200);
  window.setTimeout(scheduleEnhance, 800);
}

function bindProfileGatewayActions() {
  document.addEventListener('click', (event) => {
    const claim = event.target?.closest?.('[data-crablink-claim-profile]');
    if (claim) {
      event.preventDefault();
      void claimProfileThroughGateway();
      return;
    }

    const refresh = event.target?.closest?.('[data-crablink-refresh-profile]');
    if (refresh) {
      event.preventDefault();
      void refreshProfileThroughGateway();
      return;
    }

    const copy = event.target?.closest?.('[data-crablink-copy-profile-status]');
    if (copy) {
      event.preventDefault();
      void copyProfileStatus();
    }
  });
}

function observeProfileRender() {
  const observed = document.body || document.documentElement;
  if (!observed) return;

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(observed, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'hidden']
  });
}

function scheduleEnhance() {
  window.clearTimeout(enhanceTimer);
  enhanceTimer = window.setTimeout(() => {
    void enhanceProfilePage();
  }, 80);
}

async function enhanceProfilePage() {
  if (!isProfilePageVisible()) {
    document.getElementById(CARD_ID)?.remove();
    return;
  }

  const section = document.getElementById(PROFILE_SECTION_ID);
  if (!section) return;

  const settings = await safeGetSettings();
  const draft = await getProfileDraft();
  const candidate = buildProfileCandidate(settings, draft);
  const card = ensureGatewayCard(section);

  renderGatewayCard(card, candidate, settings);
}

function ensureGatewayCard(section) {
  let card = document.getElementById(CARD_ID);
  if (card) return card;

  card = document.createElement('article');
  card.id = CARD_ID;
  card.className = 'profile-info-card profile-gateway-card';

  const grid = section.querySelector('.profile-card-grid');
  if (grid) {
    grid.prepend(card);
    return card;
  }

  section.append(card);
  return card;
}

function renderGatewayCard(card, candidate, settings) {
  card.textContent = '';

  const head = document.createElement('div');
  head.className = 'profile-card-head';

  const title = document.createElement('h3');
  title.textContent = 'Backend profile claim';

  const description = document.createElement('p');
  description.textContent =
    'Claim or refresh a public @username through the configured gateway. CrabLink only marks it confirmed when the backend says username_status = confirmed.';

  head.append(title, description);

  const details = document.createElement('div');
  details.className = 'profile-detail-grid compact';

  details.append(
    detailTile('Candidate handle', candidate.handle || 'not chosen'),
    detailTile('Passport', candidate.passportSubject || 'not loaded'),
    detailTile('Gateway', normalizeGatewayUrl(settings.gatewayUrl)),
    detailTile('Backend status', backendStatusLabel(settings)),
    detailTile('Profile route', clean(settings.profileCrabUrl) || 'not returned yet'),
    detailTile('Profile CID', clean(settings.publicProfileCid) || 'not published yet')
  );

  const status = document.createElement('div');
  status.id = STATUS_ID;
  status.className = statusClass(settings);
  status.textContent = statusText(candidate, settings);

  const actions = document.createElement('div');
  actions.className = 'profile-gateway-action-row';

  const claim = document.createElement('button');
  claim.type = 'button';
  claim.className = 'profile-action-button';
  claim.textContent = clean(settings.usernameStatus) === 'confirmed' ? 'Re-Check Claim' : 'Claim Public @username';
  claim.disabled = busy || !candidate.canClaim;
  claim.setAttribute('data-crablink-claim-profile', '1');

  const refresh = document.createElement('button');
  refresh.type = 'button';
  refresh.className = 'secondary profile-action-button';
  refresh.textContent = 'Refresh Backend Profile';
  refresh.disabled = busy || !candidate.handle;
  refresh.setAttribute('data-crablink-refresh-profile', '1');

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'secondary profile-action-button';
  copy.textContent = 'Copy Profile Status';
  copy.setAttribute('data-crablink-copy-profile-status', '1');

  actions.append(claim, refresh, copy);

  const note = document.createElement('p');
  note.className = 'profile-card-note';
  note.textContent =
    'This route updates display state only after a gateway response. It does not create wallet authority, spend ROC, expose private keys, or publish a b3 profile manifest.';

  card.append(head, details, status, actions, note);
}

function detailTile(label, value) {
  const tile = document.createElement('div');
  tile.className = 'profile-detail-tile';

  const title = document.createElement('span');
  title.textContent = label;

  const body = document.createElement('strong');
  body.textContent = clean(value) || '—';

  tile.append(title, body);
  return tile;
}

async function claimProfileThroughGateway() {
  if (busy) return;

  const settings = await safeGetSettings();
  const draft = await getProfileDraft();
  const candidate = buildProfileCandidate(settings, draft);

  if (!candidate.canClaim) {
    setStatus('Choose a local @username and load a passport before claiming.', 'warn');
    return;
  }

  busy = true;
  setStatus(`Claiming ${candidate.handle} through gateway…`, 'pending');
  scheduleEnhance();

  try {
    const client = new RonClient(settings);
    const response = await client.claimPassportProfile({
      passport_subject: candidate.passportSubject,
      requested_username: candidate.handle,
      display_name: candidate.displayName,
      bio: candidate.bio,
      avatar_image: candidate.avatarImage
    });

    const profile = unwrapProfile(response);
    await persistBackendProfile(profile);
    setStatus(successMessage(profile), 'ok');
    notifyProfileChanged(profile);
  } catch (error) {
    setStatus(friendlyProfileError(error), 'error');
  } finally {
    busy = false;
    scheduleEnhance();
  }
}

async function refreshProfileThroughGateway() {
  if (busy) return;

  const settings = await safeGetSettings();
  const draft = await getProfileDraft();
  const candidate = buildProfileCandidate(settings, draft);

  if (!candidate.handle) {
    setStatus('Choose a local @username before refreshing a backend profile.', 'warn');
    return;
  }

  busy = true;
  setStatus(`Reading ${candidate.handle} through gateway…`, 'pending');
  scheduleEnhance();

  try {
    const client = new RonClient(settings);
    const response = await client.getPassportProfile(candidate.handle);
    const profile = unwrapProfile(response);
    await persistBackendProfile(profile);
    setStatus(successMessage(profile), 'ok');
    notifyProfileChanged(profile);
  } catch (error) {
    setStatus(friendlyProfileError(error), 'error');
  } finally {
    busy = false;
    scheduleEnhance();
  }
}

async function copyProfileStatus() {
  const settings = await safeGetSettings();
  const draft = await getProfileDraft();
  const candidate = buildProfileCandidate(settings, draft);
  const summary = {
    schema: 'crablink.profile.gateway-status.v1',
    handle: candidate.handle,
    passport_subject: candidate.passportSubject,
    username_status: clean(settings.usernameStatus) || 'local_draft',
    profile_crab_url: clean(settings.profileCrabUrl),
    public_profile_cid: clean(settings.publicProfileCid),
    note: 'CrabLink marks username ownership confirmed only when backend username_status is confirmed.'
  };

  try {
    await navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
    setStatus('Profile status copied.', 'ok');
  } catch {
    setStatus(JSON.stringify(summary), 'pending');
  }
}

async function persistBackendProfile(profile) {
  const normalized = normalizeBackendProfile(profile);
  const now = new Date().toISOString();

  if (!normalized.username || !normalized.handle) {
    throw new Error('Backend profile response did not include a username.');
  }

  const next = {
    username: normalized.username,
    handle: normalized.handle,
    usernameStatus: normalized.usernameStatus,
    profileCrabUrl: normalized.profileCrabUrl,
    publicProfileCid: normalized.publicProfileCid,
    usernameUpdatedAt: now
  };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set(next);
  }

  if (normalized.usernameStatus !== 'confirmed') {
    throw new Error(`Backend returned username_status=${normalized.usernameStatus || 'unknown'}.`);
  }
}

function normalizeBackendProfile(profile) {
  const data = profile && typeof profile === 'object' ? profile : {};
  const username = normalizeUsername(data.username || data.requested_username || data.handle || '');
  const handle = normalizeHandle(data.handle || data.username || username || '');
  const usernameStatus = clean(data.username_status || data.usernameStatus || 'backend_unknown') || 'backend_unknown';
  const profileCrabUrl = clean(data.profile_crab_url || data.profileCrabUrl || (handle ? `crab://${handle}` : ''));
  const publicProfileCid = normalizeNullableCid(data.public_profile_cid || data.publicProfileCid || '');

  return {
    ...data,
    username,
    handle,
    usernameStatus,
    profileCrabUrl,
    publicProfileCid
  };
}

function unwrapProfile(response) {
  const data = response?.data;

  if (data?.profile && typeof data.profile === 'object') return data.profile;
  if (data?.data && typeof data.data === 'object') return data.data;
  if (data && typeof data === 'object') return data;

  throw new Error('Backend profile response was empty.');
}

function buildProfileCandidate(settings, draft) {
  const handle =
    normalizeHandle(settings.handle) ||
    normalizeHandle(settings.requestedHandle) ||
    normalizeHandle(settings.username) ||
    normalizeHandle(settings.requestedUsername) ||
    normalizeHandle(draft.handle);

  const passportSubject = clean(settings.passportSubject || draft.passportSubject);
  const displayName = clean(draft.displayName) || displayNameFromHandle(handle);
  const bio = clean(draft.bio);
  const avatarImage = isCanonicalImageUrl(draft.avatarCrabUrl) ? clean(draft.avatarCrabUrl).toLowerCase() : '';

  return {
    handle,
    username: normalizeUsername(handle),
    passportSubject,
    displayName,
    bio,
    avatarImage,
    canClaim: Boolean(handle && passportSubject)
  };
}

async function safeGetSettings() {
  try {
    return await getSettings();
  } catch {
    return {};
  }
}

async function getProfileDraft() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return emptyProfileDraft();

  try {
    const stored = await chrome.storage.local.get([PROFILE_DRAFT_KEY]);
    return normalizeProfileDraft(stored?.[PROFILE_DRAFT_KEY]);
  } catch {
    return emptyProfileDraft();
  }
}

function normalizeProfileDraft(value) {
  const draft = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  if (!draft) return emptyProfileDraft();

  return {
    handle: clean(draft.handle),
    passportSubject: clean(draft.passportSubject),
    displayName: clean(draft.displayName),
    bio: clean(draft.bio),
    avatarCrabUrl: clean(draft.avatarCrabUrl || draft.avatar_crab_url).toLowerCase()
  };
}

function emptyProfileDraft() {
  return {
    handle: '',
    passportSubject: '',
    displayName: '',
    bio: '',
    avatarCrabUrl: ''
  };
}

function backendStatusLabel(settings) {
  const status = clean(settings.usernameStatus);
  if (status === 'confirmed') return 'confirmed by backend';
  if (status === 'unavailable') return 'username unavailable';
  if (status === 'rejected') return 'rejected';
  if (status === 'backend_unknown') return 'backend unknown';
  if (status) return status;
  return 'local draft only';
}

function statusText(candidate, settings) {
  const status = clean(settings.usernameStatus);

  if (status === 'confirmed' && clean(settings.handle)) {
    return `${clean(settings.handle)} is backend-confirmed. Public profile route: ${clean(settings.profileCrabUrl) || `crab://${clean(settings.handle)}`}.`;
  }

  if (!candidate.handle) return 'No local @username is ready to claim yet. Add one in Settings or bootstrap identity first.';
  if (!candidate.passportSubject) return 'No passport subject is loaded yet. Bootstrap or configure the main passport first.';

  return `${candidate.handle} is ready to claim through the gateway. This will not spend ROC or publish a b3 manifest.`;
}

function statusClass(settings) {
  const status = clean(settings.usernameStatus);
  if (status === 'confirmed') return 'profile-gateway-status ok';
  if (status === 'unavailable' || status === 'rejected') return 'profile-gateway-status error';
  return 'profile-gateway-status pending';
}

function setStatus(message, tone = 'pending') {
  const el = document.getElementById(STATUS_ID);
  if (el) {
    el.className = `profile-gateway-status ${tone}`;
    el.textContent = message;
  }

  const footer = document.getElementById('footerStatus');
  if (footer) footer.textContent = message;
}

function successMessage(profile) {
  const normalized = normalizeBackendProfile(profile);
  if (normalized.usernameStatus === 'confirmed') {
    return `${normalized.handle} confirmed by backend.`;
  }

  return `Profile returned username_status=${normalized.usernameStatus || 'unknown'}.`;
}

function friendlyProfileError(error) {
  const data = error?.data || {};
  const code = clean(data.code || data.reason || error?.reason);

  if (error instanceof RonClientError && error.status === 409) {
    return 'That username is already taken. Try another one.';
  }

  if (error instanceof RonClientError && error.status === 400 && code === 'reserved_username') {
    return 'That username is reserved by RustyOnions. Try another one.';
  }

  if (error instanceof RonClientError && error.status === 404) {
    return 'Backend profile not found for that username yet.';
  }

  if (error instanceof RonClientError && error.status === 502) {
    return 'Gateway could not reach the profile backend. Check your RustyOnions stack.';
  }

  if (error instanceof RonClientError && error.status) {
    return `${error.message}${code ? ` (${code})` : ''}`;
  }

  return clean(error?.message) || 'Profile request failed.';
}

function notifyProfileChanged(profile) {
  document.dispatchEvent(
    new CustomEvent('crablink:profile-draft-updated', {
      detail: {
        source: 'gateway-profile-route',
        profile: normalizeBackendProfile(profile)
      }
    })
  );
}

function isProfilePageVisible() {
  const section = document.getElementById(PROFILE_SECTION_ID);
  return Boolean(
    document.body?.classList?.contains(PROFILE_VIEW_CLASS) &&
      section &&
      !section.classList.contains('hidden')
  );
}

function normalizeHandle(value) {
  const username = normalizeUsername(value);
  return username ? `@${username}` : '';
}

function normalizeUsername(value) {
  return clean(value)
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');
}

function normalizeNullableCid(value) {
  const raw = clean(value).toLowerCase();
  if (!raw) return '';
  if (/^b3:[0-9a-f]{64}$/.test(raw)) return raw;
  if (/^[0-9a-f]{64}$/.test(raw)) return `b3:${raw}`;
  return '';
}

function displayNameFromHandle(handle) {
  const username = normalizeUsername(handle);
  if (!username) return '';

  return username
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function isCanonicalImageUrl(value) {
  return /^crab:\/\/[0-9a-f]{64}\.image$/i.test(clean(value));
}

function normalizeGatewayUrl(value) {
  return (clean(value) || 'http://127.0.0.1:8090').replace(/\/+$/, '');
}

function clean(value) {
  return String(value ?? '').trim();
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .profile-gateway-card {
      border-color: rgba(14, 165, 233, 0.34) !important;
      background:
        radial-gradient(circle at top right, rgba(14, 165, 233, 0.14), transparent 42%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(8, 17, 34, 0.96)) !important;
    }

    .profile-gateway-status {
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 18px;
      padding: 12px 14px;
      color: #cbd5e1;
      background: rgba(2, 6, 23, 0.42);
      line-height: 1.45;
    }

    .profile-gateway-status.ok {
      border-color: rgba(34, 197, 94, 0.34);
      color: #bbf7d0;
      background: rgba(20, 83, 45, 0.18);
    }

    .profile-gateway-status.warn,
    .profile-gateway-status.pending {
      border-color: rgba(56, 189, 248, 0.28);
      color: #bae6fd;
      background: rgba(12, 74, 110, 0.16);
    }

    .profile-gateway-status.error {
      border-color: rgba(248, 113, 113, 0.34);
      color: #fecaca;
      background: rgba(127, 29, 29, 0.2);
    }

    .profile-gateway-action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .profile-gateway-action-row button {
      min-width: 180px;
    }

    @media (max-width: 720px) {
      .profile-gateway-action-row {
        display: grid;
        grid-template-columns: 1fr;
      }

      .profile-gateway-action-row button {
        min-width: 0;
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