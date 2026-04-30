import { normalizeCrabInput } from './crab.js';
import { getSettings } from './storage.js';
import { RonClient } from './ronClient.js';

const els = {
  nodeBadge: document.getElementById('nodeBadge'),
  gatewayUrl: document.getElementById('gatewayUrl'),
  passportSubject: document.getElementById('passportSubject'),
  walletAccount: document.getElementById('walletAccount'),
  checkNodeButton: document.getElementById('checkNodeButton'),
  openOptionsButton: document.getElementById('openOptionsButton'),
  crabInput: document.getElementById('crabInput'),
  resolveButton: document.getElementById('resolveButton'),
  clearButton: document.getElementById('clearButton'),
  message: document.getElementById('message'),
  result: document.getElementById('result')
};

let client = null;

function setBadge(kind, text) {
  els.nodeBadge.className = `badge badge-${kind}`;
  els.nodeBadge.textContent = text;
}

function showMessage(kind, text) {
  els.message.className = `message message-${kind}`;
  els.message.textContent = text;
}

function clearMessage() {
  els.message.className = 'message hidden';
  els.message.textContent = '';
}

function showResult(title, data) {
  els.result.className = 'card result';
  els.result.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
  `;
}

function clearResult() {
  els.result.className = 'card result hidden';
  els.result.innerHTML = '';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function load() {
  const settings = await getSettings();
  client = new RonClient(settings);

  els.gatewayUrl.textContent = settings.gatewayUrl;
  els.passportSubject.textContent = settings.passportSubject || 'not set';
  els.walletAccount.textContent = settings.walletAccount || 'not set';

  await checkNode();
}

async function checkNode() {
  clearMessage();

  try {
    setBadge('muted', 'checking');

    const health = await client.getHealth();
    const ready = await client.getReady();

    if (ready.ok || ready.ready === true) {
      setBadge('ok', 'online');
      showMessage('ok', 'RustyOnions gateway is online and ready.');
    } else if (health.ok) {
      setBadge('warn', 'degraded');
      showMessage('warn', 'Gateway is alive but not ready.');
    } else {
      setBadge('warn', 'health issue');
      showMessage('warn', 'Gateway health check returned an unexpected response.');
    }
  } catch (error) {
    setBadge('bad', 'offline');
    showMessage('bad', error.message || 'Gateway is offline.');
  }
}

async function resolveInput() {
  clearMessage();
  clearResult();

  let parsed;
  try {
    parsed = normalizeCrabInput(els.crabInput.value);
  } catch (error) {
    showMessage('bad', error.message);
    return;
  }

  try {
    if (parsed.type === 'asset') {
      const data = await client.getB3Asset(parsed.hash, parsed.kind);
      showResult(`Asset: ${parsed.kind}`, data);
      return;
    }

    if (parsed.type === 'site') {
      const data = await client.resolveSite(parsed.name);
      showResult(`Site: ${parsed.name}`, data);
      return;
    }

    const data = await client.resolveCrab(parsed.url);
    showResult('Crab Resolve', data);
  } catch (error) {
    showMessage('bad', error.message || 'Resolve failed.');
  }
}

els.checkNodeButton.addEventListener('click', checkNode);
els.openOptionsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
els.resolveButton.addEventListener('click', resolveInput);
els.clearButton.addEventListener('click', () => {
  els.crabInput.value = '';
  clearMessage();
  clearResult();
});

load().catch((error) => {
  setBadge('bad', 'error');
  showMessage('bad', error.message || 'Failed to load CrabLink.');
});
