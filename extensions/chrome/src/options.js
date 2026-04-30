import {
  DEFAULT_SETTINGS,
  clearDevToken,
  getSettings,
  normalizeGatewayUrl,
  normalizeTimeout,
  resetSettings,
  saveSettings
} from './storage.js';
import { RonClient } from './ronClient.js';

const els = {
  saveBadge: document.getElementById('saveBadge'),
  gatewayUrl: document.getElementById('gatewayUrl'),
  requestTimeoutMs: document.getElementById('requestTimeoutMs'),
  passportSubject: document.getElementById('passportSubject'),
  walletAccount: document.getElementById('walletAccount'),
  authToken: document.getElementById('authToken'),
  requireSpendConfirm: document.getElementById('requireSpendConfirm'),
  devMode: document.getElementById('devMode'),
  testGatewayButton: document.getElementById('testGatewayButton'),
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
  showMessage('ok', 'Defaults restored.');
}

async function clearToken() {
  const settings = await clearDevToken();
  fillForm(settings);
  setBadge('ok', 'token cleared');
  showMessage('ok', 'Dev token cleared.');
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

function setBusy(isBusy) {
  els.testGatewayButton.disabled = isBusy;
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

els.saveButton.addEventListener('click', save);
els.resetButton.addEventListener('click', reset);
els.clearTokenButton.addEventListener('click', clearToken);
els.testGatewayButton.addEventListener('click', testGateway);

load().catch((error) => {
  setBadge('bad', 'error');
  showMessage('bad', error.message || 'Failed to load settings.');
});