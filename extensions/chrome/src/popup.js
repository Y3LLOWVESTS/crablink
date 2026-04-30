import { normalizeCrabInput } from './crab.js';
import { getSettings, rememberLastCrabUrl } from './storage.js';
import { RonClient, RonClientError } from './ronClient.js';

const els = {
  nodeBadge: document.getElementById('nodeBadge'),
  gatewayUrl: document.getElementById('gatewayUrl'),
  passportSubject: document.getElementById('passportSubject'),
  walletAccount: document.getElementById('walletAccount'),
  checkNodeButton: document.getElementById('checkNodeButton'),
  openOptionsButton: document.getElementById('openOptionsButton'),
  crabInput: document.getElementById('crabInput'),
  defaultAssetKind: document.getElementById('defaultAssetKind'),
  resolveButton: document.getElementById('resolveButton'),
  clearButton: document.getElementById('clearButton'),
  message: document.getElementById('message'),
  result: document.getElementById('result'),
  resultTitle: document.getElementById('resultTitle'),
  resultSubtitle: document.getElementById('resultSubtitle'),
  resultKind: document.getElementById('resultKind'),
  resultFacts: document.getElementById('resultFacts'),
  copyCrabButton: document.getElementById('copyCrabButton'),
  copyB3Button: document.getElementById('copyB3Button'),
  copyJsonButton: document.getElementById('copyJsonButton'),
  resultJson: document.getElementById('resultJson')
};

let settings = null;
let client = null;
let lastResult = null;
let lastParsed = null;

async function load() {
  settings = await getSettings();
  client = new RonClient(settings);

  els.gatewayUrl.textContent = settings.gatewayUrl;
  els.passportSubject.textContent = settings.passportSubject || 'not set';
  els.walletAccount.textContent = settings.walletAccount || 'not set';

  if (settings.lastCrabUrl) {
    els.crabInput.value = settings.lastCrabUrl;
  }

  await checkNode();
}

async function checkNode() {
  clearMessage();

  try {
    setBusy(true);
    setBadge('muted', 'checking');

    const [health, ready] = await Promise.allSettled([
      client.getHealth(),
      client.getReady()
    ]);

    const healthOk = health.status === 'fulfilled';
    const readyOk =
      ready.status === 'fulfilled' &&
      (ready.value?.data?.ok === true || ready.value?.data?.ready === true || ready.value?.ok === true);

    if (readyOk) {
      setBadge('ok', 'online');
      showMessage('ok', 'RustyOnions gateway is online and ready.');
      return;
    }

    if (healthOk) {
      setBadge('warn', 'degraded');
      showMessage('warn', 'Gateway is alive, but readiness is not green.');
      return;
    }

    throw health.reason || ready.reason || new Error('Gateway is offline.');
  } catch (error) {
    setBadge('bad', 'offline');
    showMessage('bad', formatError(error));
  } finally {
    setBusy(false);
  }
}

async function resolveInput() {
  clearMessage();
  clearResult();

  let parsed;
  try {
    parsed = normalizeCrabInput(els.crabInput.value, {
      defaultKind: els.defaultAssetKind.value
    });
  } catch (error) {
    showMessage('bad', error.message);
    return;
  }

  try {
    setBusy(true);
    await rememberLastCrabUrl(parsed.url || parsed.display || els.crabInput.value);

    let response;

    if (parsed.type === 'asset') {
      response = await client.getB3Asset(parsed.hash, parsed.kind);
    } else if (parsed.type === 'site') {
      response = await client.resolveSite(parsed.name);
    } else {
      response = await client.resolveCrab(parsed.url);
    }

    lastParsed = parsed;
    lastResult = response;

    renderResult(parsed, response);
    showMessage('ok', 'Resolved through the configured RustyOnions gateway.');
  } catch (error) {
    showMessage('bad', formatError(error));
  } finally {
    setBusy(false);
  }
}

function renderResult(parsed, response) {
  const data = response?.data;
  const payload = data && typeof data === 'object' ? data : response;

  els.result.classList.remove('hidden');
  els.resultTitle.textContent = resultTitleFor(parsed);
  els.resultSubtitle.textContent = response?.route || parsed.display || parsed.url || '';
  els.resultKind.textContent = parsed.type;

  clearFacts();

  if (parsed.type === 'asset') {
    addFact('crab URL', parsed.url);
    addFact('b3 CID', parsed.contentId);
    addFact('Asset kind', parsed.kind);
    addFact('Hash', parsed.hash);
  }

  if (parsed.type === 'site') {
    addFact('crab URL', parsed.url);
    addFact('Site name', parsed.name);
  }

  addBackendFacts(payload);

  els.resultJson.textContent = JSON.stringify(payload, null, 2);

  configureCopyButton(els.copyCrabButton, parsed.url || payload?.crab_url || payload?.crabUrl);
  configureCopyButton(
    els.copyB3Button,
    parsed.contentId || payload?.content_id || payload?.contentId || payload?.manifest_cid || payload?.manifestCid
  );

  els.copyJsonButton.classList.remove('hidden');
}

function addBackendFacts(payload) {
  if (!payload || typeof payload !== 'object') {
    return;
  }

  const candidates = [
    ['Backend type', payload.type],
    ['Content ID', payload.content_id || payload.contentId],
    ['Manifest CID', payload.manifest_cid || payload.manifestCid],
    ['Site name', payload.name || payload.site_name || payload.siteName],
    ['Hydrated', payload.hydrated],
    ['Status', payload.status],
    ['Reason', payload.reason]
  ];

  for (const [label, value] of candidates) {
    if (value !== undefined && value !== null && value !== '') {
      addFact(label, String(value));
    }
  }
}

function resultTitleFor(parsed) {
  if (parsed.type === 'asset') {
    return `Asset page: ${parsed.kind}`;
  }

  if (parsed.type === 'site') {
    return `Site: ${parsed.name}`;
  }

  return 'Crab resolve';
}

function configureCopyButton(button, value) {
  if (!value) {
    button.classList.add('hidden');
    button.dataset.copyValue = '';
    return;
  }

  button.classList.remove('hidden');
  button.dataset.copyValue = String(value);
}

async function copyValue(value, label) {
  if (!value) {
    showMessage('warn', `Nothing to copy for ${label}.`);
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    showMessage('ok', `Copied ${label}.`);
  } catch {
    showMessage('bad', `Could not copy ${label}.`);
  }
}

function addFact(label, value) {
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');

  dt.textContent = label;
  dd.textContent = String(value);

  els.resultFacts.append(dt, dd);
}

function clearFacts() {
  while (els.resultFacts.firstChild) {
    els.resultFacts.removeChild(els.resultFacts.firstChild);
  }
}

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

function clearResult() {
  lastResult = null;
  lastParsed = null;
  els.result.classList.add('hidden');
  els.resultTitle.textContent = 'Result';
  els.resultSubtitle.textContent = '';
  els.resultKind.textContent = 'unknown';
  els.resultJson.textContent = '';
  clearFacts();
  configureCopyButton(els.copyCrabButton, '');
  configureCopyButton(els.copyB3Button, '');
}

function setBusy(isBusy) {
  els.checkNodeButton.disabled = isBusy;
  els.resolveButton.disabled = isBusy;
}

function formatError(error) {
  if (error instanceof RonClientError) {
    const parts = [error.message];

    if (error.status) {
      parts.push(`HTTP ${error.status}`);
    }

    if (error.route) {
      parts.push(error.route);
    }

    if (error.correlationId) {
      parts.push(`correlation ${error.correlationId}`);
    }

    return parts.join(' — ');
  }

  return error?.message || 'Unexpected CrabLink error.';
}

els.checkNodeButton.addEventListener('click', checkNode);
els.openOptionsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
els.resolveButton.addEventListener('click', resolveInput);
els.clearButton.addEventListener('click', () => {
  els.crabInput.value = '';
  clearMessage();
  clearResult();
});

els.copyCrabButton.addEventListener('click', () => copyValue(els.copyCrabButton.dataset.copyValue, 'crab URL'));
els.copyB3Button.addEventListener('click', () => copyValue(els.copyB3Button.dataset.copyValue, 'b3 CID'));
els.copyJsonButton.addEventListener('click', () => {
  const value = lastResult?.data ? JSON.stringify(lastResult.data, null, 2) : els.resultJson.textContent;
  copyValue(value, 'JSON');
});

els.crabInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    resolveInput();
  }
});

load().catch((error) => {
  setBadge('bad', 'error');
  showMessage('bad', formatError(error));
});