import { DEFAULT_SETTINGS, getSettings, saveSettings } from './storage.js';

const els = {
  gatewayUrl: document.getElementById('gatewayUrl'),
  passportSubject: document.getElementById('passportSubject'),
  walletAccount: document.getElementById('walletAccount'),
  authToken: document.getElementById('authToken'),
  requireSpendConfirm: document.getElementById('requireSpendConfirm'),
  devMode: document.getElementById('devMode'),
  saveButton: document.getElementById('saveButton'),
  resetButton: document.getElementById('resetButton'),
  message: document.getElementById('message')
};

function showMessage(kind, text) {
  els.message.className = `message message-${kind}`;
  els.message.textContent = text;
}

function validateGatewayUrl(value) {
  const url = new URL(value);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Gateway URL must start with http:// or https://.');
  }

  return url.toString().replace(/\/$/, '');
}

async function load() {
  const settings = await getSettings();

  els.gatewayUrl.value = settings.gatewayUrl;
  els.passportSubject.value = settings.passportSubject || '';
  els.walletAccount.value = settings.walletAccount || '';
  els.authToken.value = settings.authToken || '';
  els.requireSpendConfirm.checked = settings.requireSpendConfirm;
  els.devMode.checked = settings.devMode;
}

async function save() {
  try {
    const next = {
      gatewayUrl: validateGatewayUrl(els.gatewayUrl.value.trim()),
      passportSubject: els.passportSubject.value.trim(),
      walletAccount: els.walletAccount.value.trim(),
      authToken: els.authToken.value.trim(),
      requireSpendConfirm: els.requireSpendConfirm.checked,
      devMode: els.devMode.checked
    };

    await saveSettings(next);
    showMessage('ok', 'Settings saved.');
  } catch (error) {
    showMessage('bad', error.message || 'Failed to save settings.');
  }
}

async function reset() {
  await saveSettings(DEFAULT_SETTINGS);
  await load();
  showMessage('ok', 'Defaults restored.');
}

els.saveButton.addEventListener('click', save);
els.resetButton.addEventListener('click', reset);

load().catch((error) => {
  showMessage('bad', error.message || 'Failed to load settings.');
});
