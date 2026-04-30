/**
 * RO:WHAT — Options-page controller for gateway settings and safe identity labels.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; lets users configure CrabLink without storing keys.
 * RO:INTERACTS — storage.js, ronClient.js, svc-gateway identity routes.
 * RO:INVARIANTS — no private keys; no seed phrases; no local ROC truth; gateway-only bootstrap.
 * RO:METRICS — sends x-correlation-id through RonClient for backend correlation.
 * RO:CONFIG — gatewayUrl, timeout, dev token, passport/wallet labels.
 * RO:SECURITY — dev token is local-only MVP; clear token/identity controls are explicit.
 * RO:TEST — scripts/check-chrome.sh plus manual settings and identity checks.
 */

import {
  DEFAULT_SETTINGS,
  clearDevToken,
  clearIdentityState,
  extractIdentityState,
  getSettings,
  normalizeGatewayUrl,
  normalizeTimeout,
  resetSettings,
  saveIdentityState,
  saveSettings
} from './storage.js';
import { RonClient } from './ronClient.js';

const els = {
  saveBadge: document.getElementById('saveBadge'),
  gatewayUrl: document.getElementById('gatewayUrl'),
  requestTimeoutMs: document.getElementById('requestTimeoutMs'),
  passportSubject: document.getElementById('passportSubject'),
  walletAccount: document.getElementById('walletAccount'),
  rocBalanceDisplay: document.getElementById('rocBalanceDisplay'),
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
  message: document.getElementById('message')
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
  els.rocBalanceDisplay.value = settings.rocBalanceDisplay || '';
  els.authToken.value = settings.authToken || '';
  els.requireSpendConfirm.checked = Boolean(settings.requireSpendConfirm);
  els.devMode.checked = Boolean(settings.devMode);
}

function readForm() {
  return {
    gatewayUrl: normalizeGatewayUrl(els.gatewayUrl.value),
    requestTimeoutMs: normalizeTimeout(els.requestTimeoutMs.value),
    passportSubject: els.passportSubject.value.trim(),
    walletAccount: els.walletAccount.value.trim(),
    authToken: els.authToken.value.trim(),
    requireSpendConfirm: els.requireSpendConfirm.checked,
    devMode: els.devMode.checked
  };
}

async function save() {
  try {
    const next = readForm();
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
  showMessage('ok', 'Local identity labels cleared. Backend passport/wallet truth was not modified.');
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
    showMessage('bad', error.message || 'Gateway test failed.');
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

    const saved = await saveIdentityState(response.data);
    fillForm(saved);
    setBadge('ok', 'identity');
    showMessage('ok', `Identity refreshed. Correlation: ${response.correlationId}`);
  } catch (error) {
    if (isMissingIdentityRoute(error)) {
      setBadge('warn', 'backend todo');
      showMessage('warn', 'Identity route is not available yet. Backend route target: GET /identity/me.');
      return;
    }

    setBadge('bad', 'error');
    showMessage('bad', error.message || 'Failed to refresh identity.');
  } finally {
    setBusy(false);
  }
}

async function createPassport() {
  try {
    const pending = {
      ...DEFAULT_SETTINGS,
      ...readForm()
    };

    const client = new RonClient(pending);

    setBusy(true);
    setBadge('muted', 'creating');

    const response = await client.bootstrapPassport();
    const identity = extractIdentityState(response.data);

    if (!identity.passportSubject) {
      throw new Error('Passport bootstrap response did not include a passport subject.');
    }

    const saved = await saveIdentityState(response.data);
    fillForm(saved);
    setBadge('ok', 'created');
    showMessage('ok', `Passport created/loaded through gateway. Correlation: ${response.correlationId}`);
  } catch (error) {
    if (isMissingIdentityRoute(error)) {
      setBadge('warn', 'backend todo');
      showMessage('warn', 'Passport bootstrap route is not available yet. Backend route target: POST /identity/passport/bootstrap.');
      return;
    }

    setBadge('bad', 'error');
    showMessage('bad', error.message || 'Failed to create passport.');
  } finally {
    setBusy(false);
  }
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

els.saveButton.addEventListener('click', save);
els.resetButton.addEventListener('click', reset);
els.clearTokenButton.addEventListener('click', clearToken);
els.clearIdentityButton.addEventListener('click', clearIdentity);
els.testGatewayButton.addEventListener('click', testGateway);
els.refreshIdentityButton.addEventListener('click', refreshIdentity);
els.createPassportButton.addEventListener('click', createPassport);

load().catch((error) => {
  setBadge('bad', 'error');
  showMessage('bad', error.message || 'Failed to load settings.');
});