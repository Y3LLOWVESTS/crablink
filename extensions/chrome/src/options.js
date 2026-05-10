/**
 * RO:WHAT — Options-page controller for gateway settings and safe first-run identity/profile labels.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; lets users configure CrabLink and request a backend-confirmed @username without storing keys.
 * RO:INTERACTS — storage.js, ronClient.js, svc-gateway identity/profile routes.
 * RO:INVARIANTS — no private keys; no seed phrases; no local ROC truth; gateway-only bootstrap/profile claim.
 * RO:METRICS — sends x-correlation-id through RonClient for backend correlation.
 * RO:CONFIG — gatewayUrl, timeout, dev token, passport/wallet labels, requested @username.
 * RO:SECURITY — dev token is local-only MVP; username confirmed only when backend returns username_status="confirmed".
 * RO:TEST — scripts/check-chrome.sh plus manual settings, first-run passport, and profile claim checks.
 */

import {
  DEFAULT_SETTINGS,
  addRecentReceipt,
  clearDevToken,
  clearIdentityState,
  extractIdentityState,
  getSettings,
  normalizeGatewayUrl,
  normalizeTimeout,
  normalizeUsername,
  resetSettings,
  saveIdentityState,
  saveSettings
} from './storage.js';
import { RonClient, RonClientError } from './ronClient.js';

const els = {
  saveBadge: document.getElementById('saveBadge'),
  gatewayUrl: document.getElementById('gatewayUrl'),
  requestTimeoutMs: document.getElementById('requestTimeoutMs'),
  passportSubject: document.getElementById('passportSubject'),
  walletAccount: document.getElementById('walletAccount'),
  requestedUsername: document.getElementById('requestedUsername'),
  usernameStatus: document.getElementById('usernameStatus'),
  profileCrabUrl: document.getElementById('profileCrabUrl'),
  rocBalanceDisplay: document.getElementById('rocBalanceDisplay'),
  lastBootstrapReceiptId: document.getElementById('lastBootstrapReceiptId'),
  authToken: document.getElementById('authToken'),
  requireSpendConfirm: document.getElementById('requireSpendConfirm'),
  devMode: document.getElementById('devMode'),
  testGatewayButton: document.getElementById('testGatewayButton'),
  refreshIdentityButton: document.getElementById('refreshIdentityButton'),
  createPassportButton: document.getElementById('createPassportButton'),
  clearIdentityButton: document.getElementById('clearIdentityButton'),
  clearTokenButton: document.getElementById('clearTokenButton'),
  saveButton: document.getElementById('saveButton'),
  resetButton: document.getElementById('resetButton'),
  message: document.getElementById('message'),

  summaryPassport: document.getElementById('summaryPassport'),
  summaryWallet: document.getElementById('summaryWallet'),
  summaryUsername: document.getElementById('summaryUsername'),
  summaryRoc: document.getElementById('summaryRoc')
};

async function load() {
  const settings = await getSettings();
  fillForm(settings);
  setBadge('muted', 'settings');
}

function fillForm(settings) {
  els.gatewayUrl.value = settings.gatewayUrl;
  els.requestTimeoutMs.value = settings.requestTimeoutMs;
  els.passportSubject.value = settings.passportSubject || '';
  els.walletAccount.value = settings.walletAccount || '';
  els.requestedUsername.value = settings.handle || settings.requestedHandle || '';
  els.usernameStatus.value = usernameStatusLabel(settings);
  els.profileCrabUrl.value = settings.profileCrabUrl || settings.publicProfileCid || '';
  els.rocBalanceDisplay.value = settings.rocBalanceDisplay || '';
  els.lastBootstrapReceiptId.value = settings.lastBootstrapReceiptId || '';
  els.authToken.value = settings.authToken || '';
  els.requireSpendConfirm.checked = Boolean(settings.requireSpendConfirm);
  els.devMode.checked = Boolean(settings.devMode);

  if (els.createPassportButton) {
    els.createPassportButton.textContent = settings.passportSubject
      ? 'Claim / Refresh @username'
      : 'Create Passport + Claim @username';
  }

  fillSummary(settings);
}

function fillSummary(settings) {
  if (els.summaryPassport) {
    els.summaryPassport.textContent = settings.passportSubject || 'not loaded';
  }

  if (els.summaryWallet) {
    els.summaryWallet.textContent = settings.walletAccount || 'not loaded';
  }

  if (els.summaryUsername) {
    els.summaryUsername.textContent =
      settings.usernameStatus === 'confirmed' && settings.handle
        ? `Confirmed ${settings.handle}`
        : settings.requestedHandle || settings.handle || 'choose @username';
  }

  if (els.summaryRoc) {
    els.summaryRoc.textContent = settings.rocBalanceDisplay || 'not loaded';
  }
}

function readForm() {
  const requested = normalizeUsername(els.requestedUsername.value);

  if (els.requestedUsername.value.trim() && !requested.ok) {
    throw new Error(requested.error || '@username is invalid.');
  }

  return {
    gatewayUrl: normalizeGatewayUrl(els.gatewayUrl.value),
    requestTimeoutMs: normalizeTimeout(els.requestTimeoutMs.value),
    passportSubject: els.passportSubject.value.trim(),
    walletAccount: els.walletAccount.value.trim(),
    requestedUsername: requested.ok ? requested.username : '',
    requestedHandle: requested.ok ? requested.handle : '',
    usernameStatus: requested.ok ? 'local_draft' : '',
    authToken: els.authToken.value.trim(),
    requireSpendConfirm: els.requireSpendConfirm.checked,
    devMode: els.devMode.checked
  };
}

async function save() {
  try {
    const current = await getSettings();
    const next = preserveBackendConfirmedUsername(current, readForm());
    const saved = await saveSettings(next);

    fillForm(saved);
    setBadge('ok', 'saved');
    showMessage('ok', 'Settings saved.');
  } catch (error) {
    setBadge('bad', 'error');
    showMessage('bad', error.message || 'Failed to save settings.');
  }
}

async function reset() {
  const settings = await resetSettings();

  fillForm(settings);
  setBadge('ok', 'reset');
  showMessage('ok', 'Defaults restored. Passport labels are now empty until loaded or created.');
}

async function clearToken() {
  const settings = await clearDevToken();

  fillForm(settings);
  setBadge('ok', 'token cleared');
  showMessage('ok', 'Dev token cleared.');
}

async function clearIdentity() {
  const settings = await clearIdentityState();

  fillForm(settings);
  setBadge('ok', 'identity cleared');
  showMessage('ok', 'Local identity labels cleared. Backend passport/wallet/profile truth was not modified.');
}

async function testGateway() {
  try {
    const pending = {
      ...DEFAULT_SETTINGS,
      ...readForm()
    };

    const client = new RonClient(pending);

    setBusy(true);
    setBadge('muted', 'testing');

    const health = await client.getHealth();
    const ready = await client.getReady();

    const readyOk = ready?.data?.ok === true || ready?.data?.ready === true || ready?.ok === true;

    if (readyOk) {
      setBadge('ok', 'online');
      showMessage('ok', `Gateway is online and ready. Correlation: ${ready.correlationId}`);
    } else {
      setBadge('warn', 'degraded');
      showMessage('warn', `Gateway health responded, but readiness is not green. Correlation: ${health.correlationId}`);
    }
  } catch (error) {
    setBadge('bad', 'offline');
    showMessage('bad', friendlyProfileError(error, 'Gateway test failed.'));
  } finally {
    setBusy(false);
  }
}

async function refreshIdentity() {
  try {
    const pending = {
      ...DEFAULT_SETTINGS,
      ...readForm()
    };

    const client = new RonClient(pending);

    setBusy(true);
    setBadge('muted', 'identity');

    const response = await client.getIdentity();
    const identity = extractIdentityState(response.data);

    if (!identity.passportSubject) {
      setBadge('warn', 'not loaded');
      showMessage('warn', 'Gateway responded, but no passport is loaded for this browser client.');
      return;
    }

    let saved = await saveIdentityState(response.data);

    const profileRefresh = await refreshPublicProfileIfPossible(client, saved);
    if (profileRefresh.saved) {
      saved = profileRefresh.saved;
      fillForm(saved);
      setBadge('ok', 'confirmed');
      showMessage('ok', `Identity and ${saved.handle} profile refreshed. Correlation: ${profileRefresh.correlationId || response.correlationId}`);
      return;
    }

    fillForm(saved);
    setBadge('ok', 'identity');
    showMessage('ok', profileRefresh.message || `Identity refreshed. Correlation: ${response.correlationId}`);
  } catch (error) {
    if (isMissingIdentityRoute(error)) {
      setBadge('warn', 'backend todo');
      showMessage('warn', 'Identity route is not available yet. Backend route target: GET /identity/me.');
      return;
    }

    setBadge('bad', 'error');
    showMessage('bad', friendlyProfileError(error, 'Failed to refresh identity.'));
  } finally {
    setBusy(false);
  }
}

async function createPassport() {
  try {
    const requested = normalizeUsername(els.requestedUsername.value);

    if (!requested.ok) {
      setBadge('warn', 'username');
      showMessage('warn', requested.error || 'Choose an @username before creating the main passport.');
      els.requestedUsername.focus();
      return;
    }

    const current = await getSettings();
    const pending = {
      ...DEFAULT_SETTINGS,
      ...preserveBackendConfirmedUsername(current, readForm())
    };

    const localSaved = await saveSettings(pending);
    fillForm(localSaved);

    const client = new RonClient(localSaved);

    setBusy(true);
    setBadge('muted', 'creating');
    showMessage('warn', `Creating/loading passport and requesting ${requested.handle} through the gateway…`);

    const response = await client.bootstrapPassport({
      desired_starting_balance_minor_units: '1776',
      requested_username: requested.username,
      requested_handle: requested.handle
    });

    const identity = extractIdentityState(response.data);

    if (!identity.passportSubject && !localSaved.passportSubject) {
      throw new Error('Passport bootstrap response did not include a passport subject.');
    }

    let saved = await saveIdentityState(response.data);

    if (identity.lastBootstrapReceiptId) {
      saved = await addRecentReceipt({
        id: identity.lastBootstrapReceiptId,
        route: '/identity/passport/bootstrap',
        action: 'passport_bootstrap',
        amountMinorUnits: identity.lastStarterGrantAmountMinorUnits,
        ledgerBacked: identity.lastStarterGrantLedgerBacked,
        source: identity.lastStarterGrantLedgerBacked ? 'svc_wallet.v1' : '',
        createdAt: new Date().toISOString()
      });
    }

    const passportSubject = saved.passportSubject || identity.passportSubject || localSaved.passportSubject;
    const profileResult = await claimPublicProfile(client, {
      requested,
      passportSubject,
      saved
    });

    if (profileResult.saved) {
      saved = profileResult.saved;
      fillForm(saved);
      setBadge('ok', 'confirmed');
      showMessage(
        'ok',
        `Passport ready and ${saved.handle} confirmed by backend. Profile route: ${saved.profileCrabUrl || `crab://${saved.handle}`}.`
      );
      return;
    }

    const draftSaved = await saveSettings({
      ...saved,
      requestedUsername: requested.username,
      requestedHandle: requested.handle,
      usernameStatus: profileResult.status || 'backend_unknown',
      usernameUpdatedAt: new Date().toISOString()
    });

    fillForm(draftSaved);
    setBadge('warn', 'profile pending');
    showMessage('warn', profileResult.message || 'Passport was created/loaded, but backend profile claim did not confirm yet.');
  } catch (error) {
    if (isMissingIdentityRoute(error)) {
      setBadge('warn', 'backend todo');
      showMessage('warn', 'Passport bootstrap route is not available yet. Backend route target: POST /identity/passport/bootstrap.');
      return;
    }

    setBadge('bad', 'error');
    showMessage('bad', friendlyProfileError(error, 'Failed to create passport or claim username.'));
  } finally {
    setBusy(false);
  }
}

async function claimPublicProfile(client, { requested, passportSubject, saved }) {
  if (!requested?.ok || !passportSubject) {
    return {
      saved: null,
      status: 'local_draft',
      message: 'Passport was created/loaded, but no valid @username/passport subject was available to claim.'
    };
  }

  try {
    const response = await client.claimPassportProfile({
      passport_subject: passportSubject,
      requested_username: requested.handle,
      display_name: displayNameFromUsername(requested.username),
      bio: '',
      avatar_image: ''
    });

    const profile = normalizePublicProfileResponse(response.data, requested);

    if (profile.usernameStatus !== 'confirmed') {
      return {
        saved: await saveSettings({
          ...saved,
          requestedUsername: requested.username,
          requestedHandle: requested.handle,
          username: profile.username || '',
          handle: profile.handle || requested.handle,
          usernameStatus: profile.usernameStatus || 'backend_unknown',
          profileCrabUrl: profile.profileCrabUrl || '',
          publicProfileCid: profile.publicProfileCid || '',
          usernameUpdatedAt: new Date().toISOString()
        }),
        status: profile.usernameStatus || 'backend_unknown',
        message: `Profile route returned username_status=${profile.usernameStatus || 'unknown'}; not marking as confirmed.`
      };
    }

    const next = await saveSettings({
      ...saved,
      requestedUsername: profile.username,
      requestedHandle: profile.handle,
      username: profile.username,
      handle: profile.handle,
      usernameStatus: 'confirmed',
      profileCrabUrl: profile.profileCrabUrl,
      publicProfileCid: profile.publicProfileCid,
      usernameUpdatedAt: new Date().toISOString()
    });

    return {
      saved: next,
      status: 'confirmed',
      correlationId: response.correlationId,
      message: `${profile.handle} confirmed by backend.`
    };
  } catch (error) {
    return {
      saved: null,
      status: statusFromProfileError(error),
      message: friendlyProfileError(error, 'Passport was created/loaded, but profile claim failed.')
    };
  }
}

async function refreshPublicProfileIfPossible(client, settings) {
  const candidate =
    normalizeUsername(settings.handle || settings.username || settings.requestedHandle || settings.requestedUsername || '');

  if (!candidate.ok) {
    return {
      saved: null,
      message: 'Identity refreshed. No @username is available to refresh yet.'
    };
  }

  try {
    const response = await client.getPassportProfile(candidate.username);
    const profile = normalizePublicProfileResponse(response.data, candidate);

    if (profile.usernameStatus !== 'confirmed') {
      const saved = await saveSettings({
        ...settings,
        requestedUsername: candidate.username,
        requestedHandle: candidate.handle,
        username: profile.username || settings.username || '',
        handle: profile.handle || settings.handle || candidate.handle,
        usernameStatus: profile.usernameStatus || 'backend_unknown',
        profileCrabUrl: profile.profileCrabUrl || '',
        publicProfileCid: profile.publicProfileCid || '',
        usernameUpdatedAt: new Date().toISOString()
      });

      return {
        saved,
        correlationId: response.correlationId,
        message: `Profile returned username_status=${saved.usernameStatus}; not marking as confirmed.`
      };
    }

    const saved = await saveSettings({
      ...settings,
      requestedUsername: profile.username,
      requestedHandle: profile.handle,
      username: profile.username,
      handle: profile.handle,
      usernameStatus: 'confirmed',
      profileCrabUrl: profile.profileCrabUrl,
      publicProfileCid: profile.publicProfileCid,
      usernameUpdatedAt: new Date().toISOString()
    });

    return {
      saved,
      correlationId: response.correlationId,
      message: `${profile.handle} profile refreshed and confirmed.`
    };
  } catch (error) {
    if (error instanceof RonClientError && error.status === 404) {
      return {
        saved: await saveSettings({
          ...settings,
          requestedUsername: candidate.username,
          requestedHandle: candidate.handle,
          usernameStatus: settings.usernameStatus === 'confirmed' ? 'backend_unknown' : settings.usernameStatus || 'local_draft',
          profileCrabUrl: settings.usernameStatus === 'confirmed' ? '' : settings.profileCrabUrl || '',
          publicProfileCid: settings.usernameStatus === 'confirmed' ? '' : settings.publicProfileCid || ''
        }),
        message: `Identity refreshed. No public profile found for ${candidate.handle} yet.`
      };
    }

    return {
      saved: null,
      message: friendlyProfileError(error, 'Identity refreshed, but profile refresh failed.')
    };
  }
}

function normalizePublicProfileResponse(data, fallback) {
  const profile = unwrapProfilePayload(data);
  const fallbackUsername = fallback?.username || normalizeUsername(fallback?.handle || fallback || '').username || '';
  const username = normalizeUsername(profile.username || profile.requested_username || profile.handle || fallbackUsername);
  const handle = normalizeUsername(profile.handle || profile.username || fallbackUsername);

  return {
    username: username.ok ? username.username : fallbackUsername,
    handle: handle.ok ? handle.handle : fallback?.handle || (fallbackUsername ? `@${fallbackUsername}` : ''),
    usernameStatus: cleanString(profile.username_status || profile.usernameStatus || 'backend_unknown') || 'backend_unknown',
    profileCrabUrl: cleanString(profile.profile_crab_url || profile.profileCrabUrl),
    publicProfileCid: normalizeOptionalCid(profile.public_profile_cid || profile.publicProfileCid)
  };
}

function unwrapProfilePayload(data) {
  if (data?.profile && typeof data.profile === 'object') return data.profile;
  if (data?.data && typeof data.data === 'object') return data.data;
  if (data && typeof data === 'object') return data;
  return {};
}

function preserveBackendConfirmedUsername(current, next) {
  const requested = normalizeUsername(next.requestedHandle || next.requestedUsername || '');

  if (!requested.ok) {
    return {
      ...next,
      requestedUsername: '',
      requestedHandle: '',
      username: '',
      handle: '',
      usernameStatus: '',
      profileCrabUrl: '',
      publicProfileCid: '',
      usernameUpdatedAt: ''
    };
  }

  if (current.usernameStatus === 'confirmed' && requested.username === current.username) {
    return {
      ...next,
      requestedUsername: requested.username,
      requestedHandle: requested.handle,
      username: current.username,
      handle: current.handle || requested.handle,
      usernameStatus: 'confirmed',
      profileCrabUrl: current.profileCrabUrl || '',
      publicProfileCid: current.publicProfileCid || '',
      usernameUpdatedAt: current.usernameUpdatedAt || ''
    };
  }

  return {
    ...next,
    requestedUsername: requested.username,
    requestedHandle: requested.handle,
    username: '',
    handle: '',
    usernameStatus: 'local_draft',
    profileCrabUrl: '',
    publicProfileCid: '',
    usernameUpdatedAt: ''
  };
}

function usernameStatusLabel(settings) {
  if (settings?.usernameStatus === 'confirmed' && settings?.handle) {
    return `Confirmed ${settings.handle}`;
  }

  if (settings?.usernameStatus === 'unavailable') {
    return 'unavailable';
  }

  if (settings?.usernameStatus === 'rejected') {
    return 'rejected';
  }

  if (settings?.handle) {
    return settings.usernameStatus || 'backend_unknown';
  }

  if (settings?.requestedHandle) {
    return settings.usernameStatus || 'local_draft';
  }

  return '';
}

function statusFromProfileError(error) {
  const code = cleanString(error?.data?.code || error?.data?.reason || error?.reason);

  if (error instanceof RonClientError && error.status === 409) return 'unavailable';
  if (error instanceof RonClientError && error.status === 400 && code === 'reserved_username') return 'rejected';
  if (error instanceof RonClientError && error.status === 404) return 'local_draft';
  if (error instanceof RonClientError && error.status === 502) return 'backend_unknown';

  return 'backend_unknown';
}

function friendlyProfileError(error, fallback) {
  const code = cleanString(error?.data?.code || error?.data?.reason || error?.reason);

  if (error instanceof RonClientError && error.status === 409) {
    return 'That username is already taken. Try another one.';
  }

  if (error instanceof RonClientError && error.status === 400 && code === 'reserved_username') {
    return 'That username is reserved by RustyOnions. Try another one.';
  }

  if (error instanceof RonClientError && error.status === 404) {
    return 'No public profile found for this username yet.';
  }

  if (error instanceof RonClientError && error.status === 502) {
    return 'Profile service is temporarily unavailable. Check that the RustyOnions dev stack and svc-passport are running.';
  }

  if (error instanceof RonClientError && error.message) {
    return error.message;
  }

  return error?.message || fallback || 'Profile request failed.';
}

function renderUsernameHelp() {
  const requested = normalizeUsername(els.requestedUsername.value);

  if (!els.requestedUsername.value.trim()) {
    showMessage('warn', 'Choose an @username before first-run passport creation.');
    return;
  }

  if (!requested.ok) {
    showMessage('warn', requested.error || '@username is invalid.');
    return;
  }

  showMessage('warn', `${requested.handle} is a local draft until RustyOnions confirms it through the gateway.`);
}

function setBusy(isBusy) {
  els.testGatewayButton.disabled = isBusy;
  els.refreshIdentityButton.disabled = isBusy;
  els.createPassportButton.disabled = isBusy;
  els.clearIdentityButton.disabled = isBusy;
  els.saveButton.disabled = isBusy;
  els.resetButton.disabled = isBusy;
}

function setBadge(kind, text) {
  els.saveBadge.className = `badge badge-${kind}`;
  els.saveBadge.textContent = text;
}

function showMessage(kind, text) {
  els.message.className = `message message-${kind}`;
  els.message.textContent = text;
}

function isMissingIdentityRoute(error) {
  return Boolean(
    error &&
      (error.status === 404 || error.status === 405 || error.status === 501) &&
      (String(error.route || '').includes('/identity/') || String(error.route || '') === '/identity/me')
  );
}

function displayNameFromUsername(username) {
  return cleanString(username)
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ') || 'CrabLink User';
}

function normalizeOptionalCid(value) {
  const raw = cleanString(value).toLowerCase();

  if (!raw || raw === 'null') return '';
  if (/^b3:[0-9a-f]{64}$/.test(raw)) return raw;
  if (/^[0-9a-f]{64}$/.test(raw)) return `b3:${raw}`;

  return '';
}

function cleanString(value) {
  return String(value ?? '').trim();
}

els.saveButton.addEventListener('click', save);
els.resetButton.addEventListener('click', reset);
els.clearTokenButton.addEventListener('click', clearToken);
els.clearIdentityButton.addEventListener('click', clearIdentity);
els.testGatewayButton.addEventListener('click', testGateway);
els.refreshIdentityButton.addEventListener('click', refreshIdentity);
els.createPassportButton.addEventListener('click', createPassport);
els.requestedUsername.addEventListener('input', renderUsernameHelp);
els.requestedUsername.addEventListener('change', renderUsernameHelp);

load().catch((error) => {
  setBadge('bad', 'error');
  showMessage('bad', error.message || 'Failed to load settings.');
});