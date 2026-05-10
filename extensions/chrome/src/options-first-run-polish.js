/**
 * RO:WHAT — Polished RON Passport + @username status card for Options.
 * RO:WHY — NEXT_LEVEL identity UX; Concerns: DX/SEC; makes backend-confirmed @username state obvious.
 * RO:INTERACTS — options.html, storage.js, ronClient.js, svc-gateway profile routes.
 * RO:INVARIANTS — gateway-only; no private keys; no wallet mutation; no local username confirmation; existing usernames are reused, not replaced.
 * RO:METRICS — sends x-correlation-id through RonClient when refreshing backend profile truth.
 * RO:CONFIG — reads safe local settings from chrome.storage.local via storage.js.
 * RO:SECURITY — textContent/createElement only; no seed phrases; no direct svc-passport/omnigate/wallet calls.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual Options existing-username card check.
 */

import { getSettings, normalizeUsername, saveSettings } from './storage.js';
import { RonClient, RonClientError } from './ronClient.js';

const MOUNT_ID = 'firstRunProfileCardMount';
const STYLE_ID = 'crablinkOptionsFirstRunPolishStyles';
const STATUS_ID = 'firstRunProfileStatus';
const JSON_ID = 'firstRunProfileJson';
const CARD_READY_CLASS = 'first-run-ready';
const CARD_DRAFT_CLASS = 'first-run-draft';
const CARD_EMPTY_CLASS = 'first-run-empty';

let busy = false;
let renderTimer = 0;
let lastProfilePayload = null;

function boot() {
  installStyles();
  bindActions();
  scheduleRender();

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;

      const watched = [
        'passportSubject',
        'walletAccount',
        'requestedUsername',
        'requestedHandle',
        'username',
        'handle',
        'usernameStatus',
        'profileCrabUrl',
        'publicProfileCid',
        'usernameUpdatedAt',
        'rocBalanceDisplay',
        'lastBootstrapReceiptId'
      ];

      if (watched.some((key) => Object.prototype.hasOwnProperty.call(changes, key))) {
        scheduleRender();
      }
    });
  }

  document.addEventListener('crablink:profile-draft-updated', scheduleRender);

  for (const id of ['requestedUsername', 'passportSubject', 'walletAccount', 'usernameStatus', 'profileCrabUrl']) {
    document.getElementById(id)?.addEventListener('input', scheduleRender);
    document.getElementById(id)?.addEventListener('change', scheduleRender);
  }

  window.setTimeout(scheduleRender, 250);
  window.setTimeout(scheduleRender, 900);
}

function bindActions() {
  document.addEventListener('click', (event) => {
    const action = event.target?.closest?.('[data-first-run-action]')?.getAttribute('data-first-run-action');
    if (!action) return;

    event.preventDefault();

    if (action === 'create-or-claim') {
      clickExistingButton('createPassportButton');
      return;
    }

    if (action === 'refresh-identity') {
      clickExistingButton('refreshIdentityButton');
      return;
    }

    if (action === 'refresh-profile') {
      void refreshBackendProfile();
      return;
    }

    if (action === 'copy-status') {
      void copyProfileStatus();
      return;
    }

    if (action === 'open-profile') {
      openLocalProfilePage();
      return;
    }

    if (action === 'toggle-json') {
      toggleJson();
    }
  });
}

function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    void render();
  }, 60);
}

async function render() {
  const mount = document.getElementById(MOUNT_ID);
  if (!mount) return;

  const settings = await safeGetSettings();
  const state = deriveState(settings);

  mount.classList.remove(CARD_READY_CLASS, CARD_DRAFT_CLASS, CARD_EMPTY_CLASS);
  mount.classList.add(state.cardClass);

  mount.textContent = '';

  const head = document.createElement('div');
  head.className = 'first-run-card-head';

  const titleWrap = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Passport identity';

  const title = document.createElement('h2');
  title.textContent = state.title;

  const copy = document.createElement('p');
  copy.className = 'first-run-copy';
  copy.textContent = state.copy;

  titleWrap.append(eyebrow, title, copy);

  const badge = document.createElement('span');
  badge.className = `first-run-status-pill ${state.tone}`;
  badge.textContent = state.badge;

  head.append(titleWrap, badge);

  const facts = document.createElement('div');
  facts.className = 'first-run-facts';
  facts.append(
    fact('Your handle', state.requestedHandle || state.confirmedHandle || 'enter existing @username'),
    fact('Backend-confirmed handle', state.confirmedHandle || 'not confirmed locally'),
    fact('Passport', state.passportSubject || 'not loaded'),
    fact('Wallet', state.walletAccount || 'not loaded'),
    fact('Profile route', state.profileCrabUrl || 'not returned'),
    fact('Public profile CID', state.publicProfileCid || 'not published yet')
  );

  const status = document.createElement('div');
  status.id = STATUS_ID;
  status.className = `first-run-inline-status ${state.tone}`;
  status.textContent = state.statusText;

  const actions = document.createElement('div');
  actions.className = 'first-run-actions';

  actions.append(
    actionButton(state.primaryButtonLabel, 'create-or-claim', busy || !state.canCreateOrClaim),
    actionButton('Refresh Identity', 'refresh-identity', busy),
    actionButton('Read Existing @username', 'refresh-profile', busy || !state.profileLookupHandle),
    actionButton('Open Profile Page', 'open-profile', false),
    actionButton('Copy Status JSON', 'copy-status', false),
    actionButton('Show Last JSON', 'toggle-json', !lastProfilePayload)
  );

  const json = document.createElement('pre');
  json.id = JSON_ID;
  json.className = 'first-run-json hidden';
  json.textContent = lastProfilePayload
    ? JSON.stringify(lastProfilePayload, null, 2)
    : 'No backend profile JSON has been fetched from this card yet.';

  const note = document.createElement('p');
  note.className = 'first-run-note';
  note.textContent =
    'If you already have an @username, enter that same handle in the field below and use Read Existing @username. You are not choosing a new name. Confirmed ownership only comes from the backend.';

  mount.append(head, facts, status, actions, json, note);
}

function deriveState(settings) {
  const typedUsername = document.getElementById('requestedUsername')?.value || '';
  const requested = normalizeUsername(
    settings.handle ||
      settings.username ||
      settings.requestedHandle ||
      settings.requestedUsername ||
      typedUsername ||
      ''
  );

  const confirmed = normalizeUsername(settings.handle || settings.username || '');
  const typed = normalizeUsername(typedUsername);
  const passportSubject = clean(settings.passportSubject || document.getElementById('passportSubject')?.value || '');
  const walletAccount = clean(settings.walletAccount || document.getElementById('walletAccount')?.value || '');
  const usernameStatus = clean(settings.usernameStatus || document.getElementById('usernameStatus')?.value || '');
  const profileCrabUrl = clean(settings.profileCrabUrl || document.getElementById('profileCrabUrl')?.value || '');
  const publicProfileCid = clean(settings.publicProfileCid || '');
  const hasPassport = Boolean(passportSubject);
  const isConfirmed = usernameStatus === 'confirmed' && confirmed.ok;
  const requestedHandle = requested.ok ? requested.handle : typed.ok ? typed.handle : '';
  const confirmedHandle = confirmed.ok ? confirmed.handle : '';
  const lookupHandle = confirmedHandle || requestedHandle;

  if (isConfirmed) {
    return {
      title: `${confirmedHandle} is your confirmed @username`,
      copy: 'You already have a backend-confirmed RON Passport handle. Use refresh/read actions to keep the local display synced; do not choose another username for the same passport.',
      badge: 'confirmed',
      tone: 'ok',
      cardClass: CARD_READY_CLASS,
      requestedHandle,
      confirmedHandle,
      passportSubject,
      walletAccount,
      profileCrabUrl: profileCrabUrl || `crab://${confirmedHandle}`,
      publicProfileCid,
      usernameStatus,
      hasPassport,
      canCreateOrClaim: Boolean(requestedHandle || confirmedHandle),
      profileLookupHandle: lookupHandle,
      primaryButtonLabel: 'Refresh / Re-check Existing @username',
      statusText: `Backend confirmed ${confirmedHandle}. Profile route: ${profileCrabUrl || `crab://${confirmedHandle}`}.`
    };
  }

  if (requested.ok || usernameStatus) {
    return {
      title: requested.ok ? `Use ${requested.handle}` : 'Use your existing @username',
      copy: 'If this is already your handle, read it back from the backend. If it is not claimed yet, create/load the passport and claim it through the gateway.',
      badge: usernameStatus || 'not confirmed',
      tone: usernameStatus === 'unavailable' || usernameStatus === 'rejected' ? 'bad' : 'warn',
      cardClass: CARD_DRAFT_CLASS,
      requestedHandle,
      confirmedHandle,
      passportSubject,
      walletAccount,
      profileCrabUrl,
      publicProfileCid,
      usernameStatus,
      hasPassport,
      canCreateOrClaim: Boolean(requestedHandle),
      profileLookupHandle: lookupHandle,
      primaryButtonLabel: hasPassport ? 'Claim / Re-check This @username' : 'Create Passport + Use This @username',
      statusText: hasPassport
        ? 'Passport is loaded. Read the existing @username or claim it through the gateway if it is not confirmed yet.'
        : 'Enter your existing @username or desired first handle, then create/load the main passport through the gateway.'
    };
  }

  return {
    title: 'Use your RON Passport @username',
    copy: 'If you already have an @username, type that same handle in the field below and read it from the backend. Only create/claim if you do not have one yet.',
    badge: 'not loaded',
    tone: 'muted',
    cardClass: CARD_EMPTY_CLASS,
    requestedHandle: '',
    confirmedHandle: '',
    passportSubject,
    walletAccount,
    profileCrabUrl,
    publicProfileCid,
    usernameStatus,
    hasPassport,
    canCreateOrClaim: false,
    profileLookupHandle: '',
    primaryButtonLabel: 'Create Passport + Use @username',
    statusText: 'Enter your existing @username below, then click Read Existing @username or Create Passport + Use @username.'
  };
}

async function refreshBackendProfile() {
  if (busy) return;

  const settings = await safeGetSettings();
  const state = deriveState(settings);

  if (!state.profileLookupHandle) {
    setInlineStatus('Enter your existing @username before reading backend profile truth.', 'warn');
    return;
  }

  busy = true;
  setInlineStatus(`Reading ${state.profileLookupHandle} through the gateway…`, 'warn');
  scheduleRender();

  try {
    const client = new RonClient(settings);
    const response = await client.getPassportProfile(state.profileLookupHandle);
    const profile = unwrapProfile(response.data);
    const normalized = normalizeBackendProfile(profile, state.profileLookupHandle);

    lastProfilePayload = {
      schema: 'crablink.options.backend-profile-read.v1',
      route: `/identity/passport/profile/${normalized.username}`,
      correlation_id: response.correlationId,
      profile
    };

    if (normalized.usernameStatus === 'confirmed') {
      await saveSettings({
        ...settings,
        requestedUsername: normalized.username,
        requestedHandle: normalized.handle,
        username: normalized.username,
        handle: normalized.handle,
        usernameStatus: 'confirmed',
        profileCrabUrl: normalized.profileCrabUrl,
        publicProfileCid: normalized.publicProfileCid,
        usernameUpdatedAt: new Date().toISOString()
      });

      mirrorFields(normalized);
      setInlineStatus(`${normalized.handle} is confirmed by backend profile read.`, 'ok');
      notifyProfileChanged(normalized);
      scheduleRender();
      return;
    }

    await saveSettings({
      ...settings,
      requestedUsername: normalized.username || settings.requestedUsername || '',
      requestedHandle: normalized.handle || settings.requestedHandle || '',
      usernameStatus: normalized.usernameStatus || 'backend_unknown',
      usernameUpdatedAt: new Date().toISOString()
    });

    setInlineStatus(`Backend returned username_status=${normalized.usernameStatus || 'unknown'}.`, 'warn');
  } catch (error) {
    setInlineStatus(friendlyError(error), 'bad');
  } finally {
    busy = false;
    scheduleRender();
  }
}

async function copyProfileStatus() {
  const settings = await safeGetSettings();
  const state = deriveState(settings);

  const payload = {
    schema: 'crablink.options.passport-username-status.v1',
    requested_handle: state.requestedHandle,
    confirmed_handle: state.confirmedHandle,
    username_status: state.usernameStatus || 'not_loaded',
    passport_subject: state.passportSubject,
    wallet_account: state.walletAccount,
    profile_crab_url: state.profileCrabUrl,
    public_profile_cid: state.publicProfileCid,
    truth_rule: 'Existing @usernames should be reused. Only username_status=confirmed from the backend means confirmed ownership.',
    last_backend_profile_json: lastProfilePayload
  };

  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setInlineStatus('Profile status copied.', 'ok');
  } catch {
    setInlineStatus(JSON.stringify(payload), 'warn');
  }
}

function openLocalProfilePage() {
  const target = 'crab://profile';
  const url = chrome?.runtime?.getURL
    ? chrome.runtime.getURL(`src/page.html?url=${encodeURIComponent(target)}`)
    : `./page.html?url=${encodeURIComponent(target)}`;

  window.open(url, '_blank', 'noopener');
}

function toggleJson() {
  const pre = document.getElementById(JSON_ID);
  if (!pre) return;
  pre.classList.toggle('hidden');
}

function clickExistingButton(id) {
  const button = document.getElementById(id);
  if (!button) {
    setInlineStatus(`Missing button: ${id}`, 'bad');
    return;
  }

  if (button.disabled) {
    setInlineStatus('That action is currently busy or disabled.', 'warn');
    return;
  }

  button.click();
  window.setTimeout(scheduleRender, 500);
  window.setTimeout(scheduleRender, 1600);
}

function fact(label, value) {
  const node = document.createElement('div');
  node.className = 'first-run-fact';

  const title = document.createElement('span');
  title.textContent = label;

  const body = document.createElement('strong');
  body.textContent = clean(value) || '—';

  node.append(title, body);
  return node;
}

function actionButton(label, action, disabled) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = action === 'create-or-claim' ? 'small-button' : 'secondary small-button';
  button.textContent = label;
  button.disabled = Boolean(disabled);
  button.setAttribute('data-first-run-action', action);
  return button;
}

function setInlineStatus(message, tone = 'warn') {
  const status = document.getElementById(STATUS_ID);
  if (status) {
    status.className = `first-run-inline-status ${tone}`;
    status.textContent = message;
  }

  const messageBox = document.getElementById('message');
  if (messageBox) {
    messageBox.className = `settings-message message-${tone}`;
    messageBox.textContent = message;
  }
}

function mirrorFields(profile) {
  setInputValue('requestedUsername', profile.handle);
  setInputValue('usernameStatus', profile.usernameStatus);
  setInputValue('profileCrabUrl', profile.profileCrabUrl);
}

function setInputValue(id, value) {
  const input = document.getElementById(id);
  if (input) input.value = clean(value);
}

function unwrapProfile(data) {
  if (data?.profile && typeof data.profile === 'object') return data.profile;
  if (data?.data && typeof data.data === 'object') return data.data;
  if (data && typeof data === 'object') return data;
  return {};
}

function normalizeBackendProfile(profile, fallbackHandle) {
  const data = profile && typeof profile === 'object' ? profile : {};
  const fallback = normalizeUsername(fallbackHandle || '');
  const username = normalizeUsername(data.username || data.requested_username || data.handle || fallback.username || '');
  const handle = normalizeUsername(data.handle || data.username || username.username || fallback.username || '');
  const cleanUsername = username.ok ? username.username : fallback.username || '';
  const cleanHandle = handle.ok ? handle.handle : cleanUsername ? `@${cleanUsername}` : '';
  const usernameStatus = clean(data.username_status || data.usernameStatus || 'backend_unknown') || 'backend_unknown';

  return {
    username: cleanUsername,
    handle: cleanHandle,
    usernameStatus,
    profileCrabUrl: clean(data.profile_crab_url || data.profileCrabUrl || (cleanHandle ? `crab://${cleanHandle}` : '')),
    publicProfileCid: normalizeNullableCid(data.public_profile_cid || data.publicProfileCid || '')
  };
}

function normalizeNullableCid(value) {
  const raw = clean(value).toLowerCase();

  if (!raw || raw === 'null') return '';
  if (/^b3:[0-9a-f]{64}$/.test(raw)) return raw;
  if (/^[0-9a-f]{64}$/.test(raw)) return `b3:${raw}`;

  return '';
}

function friendlyError(error) {
  const code = clean(error?.data?.code || error?.data?.reason || error?.reason);

  if (error instanceof RonClientError && error.status === 404) {
    return 'No backend profile exists for that @username yet.';
  }

  if (error instanceof RonClientError && error.status === 409) {
    return 'That @username is unavailable for this passport. If you already claimed another username, use that existing handle instead.';
  }

  if (error instanceof RonClientError && error.status === 400 && code === 'reserved_username') {
    return 'That @username is reserved.';
  }

  if (error instanceof RonClientError && error.status === 502) {
    return 'Profile service is unavailable. Check svc-passport and the RustyOnions dev stack.';
  }

  if (error instanceof RonClientError && error.message) {
    return error.message;
  }

  return clean(error?.message) || 'Backend profile read failed.';
}

async function safeGetSettings() {
  try {
    return await getSettings();
  } catch {
    return {};
  }
}

function notifyProfileChanged(profile) {
  document.dispatchEvent(
    new CustomEvent('crablink:profile-draft-updated', {
      detail: {
        source: 'options-first-run-polish',
        profile
      }
    })
  );
}

function clean(value) {
  return String(value ?? '').trim();
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .first-run-profile-card {
      overflow: hidden;
      border-color: rgba(56, 189, 248, 0.34);
      background:
        radial-gradient(circle at top right, rgba(56, 189, 248, 0.18), transparent 44%),
        radial-gradient(circle at bottom left, rgba(34, 197, 94, 0.12), transparent 38%),
        linear-gradient(180deg, rgba(21, 34, 58, 0.92), rgba(13, 22, 40, 0.96));
    }

    .first-run-card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    .first-run-copy,
    .first-run-note {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .first-run-status-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 32px;
      padding: 8px 12px;
      border: 1px solid rgba(148, 163, 184, 0.24);
      border-radius: 999px;
      color: var(--muted);
      background: rgba(8, 17, 34, 0.6);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .first-run-status-pill.ok,
    .first-run-inline-status.ok {
      border-color: rgba(34, 197, 94, 0.38);
      color: #bbf7d0;
      background: rgba(20, 83, 45, 0.18);
    }

    .first-run-status-pill.warn,
    .first-run-inline-status.warn {
      border-color: rgba(56, 189, 248, 0.34);
      color: #bae6fd;
      background: rgba(12, 74, 110, 0.18);
    }

    .first-run-status-pill.bad,
    .first-run-inline-status.bad {
      border-color: rgba(248, 113, 113, 0.36);
      color: #fecaca;
      background: rgba(127, 29, 29, 0.2);
    }

    .first-run-status-pill.muted,
    .first-run-inline-status.muted {
      border-color: rgba(148, 163, 184, 0.24);
      color: #cbd5e1;
      background: rgba(8, 17, 34, 0.46);
    }

    .first-run-facts {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }

    .first-run-fact {
      min-width: 0;
      padding: 12px 13px;
      border: 1px solid rgba(60, 79, 112, 0.68);
      border-radius: 16px;
      background: rgba(8, 17, 34, 0.58);
    }

    .first-run-fact span {
      display: block;
      color: var(--muted);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .first-run-fact strong {
      display: block;
      margin-top: 5px;
      overflow-wrap: anywhere;
      color: var(--text);
      font-size: 13px;
      line-height: 1.3;
    }

    .first-run-inline-status {
      margin: 0 0 14px;
      padding: 12px 13px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 16px;
      color: #cbd5e1;
      background: rgba(8, 17, 34, 0.46);
      font-size: 13px;
      line-height: 1.45;
    }

    .first-run-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .first-run-actions button {
      min-width: 170px;
    }

    .first-run-json {
      max-height: 280px;
      overflow: auto;
      margin: 14px 0 0;
      padding: 14px;
      border: 1px solid rgba(60, 79, 112, 0.72);
      border-radius: 16px;
      background: rgba(2, 6, 23, 0.72);
      color: #dbeafe;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
    }

    .hidden {
      display: none !important;
    }

    @media (max-width: 980px) {
      .first-run-facts {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 760px) {
      .first-run-card-head {
        display: grid;
        grid-template-columns: 1fr;
      }

      .first-run-facts,
      .first-run-actions {
        grid-template-columns: 1fr;
        display: grid;
      }

      .first-run-actions button {
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