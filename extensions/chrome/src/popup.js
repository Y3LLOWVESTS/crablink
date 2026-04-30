/**
 * RO:WHAT — Popup controller for gateway status, passport bootstrap, wallet balance, diagnostics, and crab resolves.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; make RON usable while preserving service boundaries.
 * RO:INTERACTS — storage.js, ronClient.js, crab.js, svc-gateway routes.
 * RO:INVARIANTS — no silent spending; no local key custody; identity labels are not wallet truth.
 * RO:METRICS — sends x-correlation-id through RonClient for backend correlation.
 * RO:CONFIG — reads gatewayUrl, passportSubject, walletAccount, requestTimeoutMs.
 * RO:SECURITY — no seed phrases/PIN storage in this MVP; backend capability checks fail closed.
 * RO:TEST — scripts/check-chrome.sh plus manual identity/bootstrap/diagnostics checklist.
 */

import { normalizeCrabInput } from './crab.js';
import {
  extractBalanceState,
  extractIdentityState,
  getSettings,
  hasPassport,
  hasWallet,
  identitySummary,
  rememberLastCrabUrl,
  saveBalanceState,
  saveIdentityState,
  saveSettings
} from './storage.js';
import { RonClient, RonClientError } from './ronClient.js';

const DIAG_SAMPLE_HASH = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const els = {
  nodeBadge: document.getElementById('nodeBadge'),
  gatewayUrl: document.getElementById('gatewayUrl'),
  passportSubject: document.getElementById('passportSubject'),
  walletAccount: document.getElementById('walletAccount'),
  rocBalance: document.getElementById('rocBalance'),
  checkNodeButton: document.getElementById('checkNodeButton'),
  refreshIdentityButton: document.getElementById('refreshIdentityButton'),
  openOptionsButton: document.getElementById('openOptionsButton'),
  passportStatusText: document.getElementById('passportStatusText'),
  passportBadge: document.getElementById('passportBadge'),
  lastIdentityCheck: document.getElementById('lastIdentityCheck'),
  balanceUpdatedAt: document.getElementById('balanceUpdatedAt'),
  createPassportButton: document.getElementById('createPassportButton'),
  refreshBalanceButton: document.getElementById('refreshBalanceButton'),
  diagnosticsBadge: document.getElementById('diagnosticsBadge'),
  diagnosticsList: document.getElementById('diagnosticsList'),
  runDiagnosticsButton: document.getElementById('runDiagnosticsButton'),
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

  renderSettings();
  renderDiagnosticsShell();

  if (settings.lastCrabUrl) {
    els.crabInput.value = settings.lastCrabUrl;
  }

  const nodeReady = await checkNode({ quiet: true });

  if (nodeReady) {
    await refreshIdentity({ quiet: true });
  }
}

function renderSettings() {
  els.gatewayUrl.textContent = settings.gatewayUrl;
  els.passportSubject.textContent = settings.passportSubject || 'not loaded';
  els.walletAccount.textContent = settings.walletAccount || 'not loaded';
  els.rocBalance.textContent = settings.rocBalanceDisplay || 'unknown';
  els.lastIdentityCheck.textContent = shortTimestamp(settings.lastIdentityCheckAt) || 'never';
  els.balanceUpdatedAt.textContent = shortTimestamp(settings.rocBalanceUpdatedAt) || 'never';

  if (hasPassport(settings)) {
    els.passportBadge.textContent = hasWallet(settings) ? 'ready' : 'partial';
    els.passportBadge.className = hasWallet(settings) ? 'pill pill-ok' : 'pill pill-warn';
    els.passportStatusText.textContent = identitySummary(settings);
    els.createPassportButton.classList.add('hidden');
    els.refreshBalanceButton.classList.toggle('hidden', !hasWallet(settings));
    return;
  }

  els.passportBadge.textContent = 'needed';
  els.passportBadge.className = 'pill pill-warn';
  els.passportStatusText.textContent = 'Create or load a RON Passport before using wallet-linked RustyOnions flows.';
  els.createPassportButton.classList.remove('hidden');
  els.refreshBalanceButton.classList.add('hidden');
}

function diagnosticDefinitions() {
  return [
    {
      id: 'healthz',
      label: 'Gateway health',
      route: 'GET /healthz',
      run: () => client.getHealth()
    },
    {
      id: 'readyz',
      label: 'Gateway readiness',
      route: 'GET /readyz',
      run: () => client.getReady()
    },
    {
      id: 'identity',
      label: 'Passport identity',
      route: 'GET /identity/me',
      run: () => client.getIdentity()
    },
    {
      id: 'wallet',
      label: 'Wallet balance',
      route: settings.walletAccount
        ? `GET /wallet/${settings.walletAccount}/balance`
        : 'GET /wallet/:account/balance',
      skip: () => !settings.walletAccount,
      skipReason: 'wallet label not loaded',
      run: () => client.getWalletBalance(settings.walletAccount)
    },
    {
      id: 'b3_asset',
      label: 'Typed b3 asset page',
      route: `GET /b3/${DIAG_SAMPLE_HASH}.image`,
      run: () => client.getB3Asset(DIAG_SAMPLE_HASH, 'image')
    },
    {
      id: 'crab_resolve',
      label: 'crab:// resolver',
      route: `GET /crab/resolve?url=crab://${DIAG_SAMPLE_HASH}.image`,
      run: () => client.resolveCrab(`crab://${DIAG_SAMPLE_HASH}.image`)
    },
    {
      id: 'bootstrap',
      label: 'Passport bootstrap',
      route: 'POST /identity/passport/bootstrap',
      skip: () => true,
      skipReason: 'skipped: mutation route',
      run: null
    }
  ];
}

function renderDiagnosticsShell() {
  els.diagnosticsList.textContent = '';

  for (const item of diagnosticDefinitions()) {
    const row = document.createElement('div');
    row.className = 'diagnostic-row';
    row.dataset.diagId = item.id;

    const main = document.createElement('div');
    main.className = 'diagnostic-main';

    const label = document.createElement('span');
    label.className = 'diagnostic-label';
    label.textContent = item.label;

    const route = document.createElement('span');
    route.className = 'diagnostic-route mono';
    route.textContent = item.route;

    main.append(label, route);

    const status = document.createElement('span');
    status.className = 'diagnostic-status diagnostic-idle';
    status.textContent = 'idle';

    row.append(main, status);
    els.diagnosticsList.append(row);
  }

  setDiagnosticsBadge('idle', 'idle');
}

function setDiagnosticRow(id, kind, text) {
  const row = els.diagnosticsList.querySelector(`[data-diag-id="${id}"]`);
  if (!row) {
    return;
  }

  const status = row.querySelector('.diagnostic-status');
  status.className = `diagnostic-status diagnostic-${kind}`;
  status.textContent = text;
}

function setDiagnosticsBadge(kind, text) {
  els.diagnosticsBadge.className = `pill ${kind === 'ok' ? 'pill-ok' : kind === 'bad' ? 'pill-bad' : kind === 'warn' ? 'pill-warn' : ''}`;
  els.diagnosticsBadge.textContent = text;
}

async function runDiagnostics() {
  clearMessage();
  setBusy(true);
  setDiagnosticsBadge('warn', 'running');

  let okCount = 0;
  let warnCount = 0;
  let badCount = 0;

  try {
    for (const item of diagnosticDefinitions()) {
      if (item.skip && item.skip()) {
        warnCount += 1;
        setDiagnosticRow(item.id, 'warn', item.skipReason || 'skipped');
        continue;
      }

      setDiagnosticRow(item.id, 'pending', 'checking');

      try {
        const response = await item.run();
        const status = response?.status ? `HTTP ${response.status}` : 'ok';

        okCount += 1;
        setDiagnosticRow(item.id, 'ok', status);
      } catch (error) {
        badCount += 1;
        setDiagnosticRow(item.id, 'bad', diagnosticErrorLabel(error));
      }
    }

    if (badCount > 0) {
      setDiagnosticsBadge('bad', `${badCount} fail`);
      showMessage('bad', `Diagnostics found ${badCount} failing route(s).`);
      return;
    }

    if (warnCount > 0) {
      setDiagnosticsBadge('warn', `${okCount} ok`);
      showMessage('warn', `Diagnostics passed ${okCount} read-only route(s). ${warnCount} route(s) were skipped by design.`);
      return;
    }

    setDiagnosticsBadge('ok', 'green');
    showMessage('ok', 'All read-only diagnostics passed.');
  } finally {
    setBusy(false);
  }
}

async function checkNode(options = {}) {
  const quiet = Boolean(options.quiet);

  if (!quiet) {
    clearMessage();
  }

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
      if (!quiet) {
        showMessage('ok', 'RustyOnions gateway is online and ready.');
      }
      return true;
    }

    if (healthOk) {
      setBadge('warn', 'degraded');
      if (!quiet) {
        showMessage('warn', 'Gateway is alive, but readiness is not green.');
      }
      return false;
    }

    throw health.reason || ready.reason || new Error('Gateway is offline.');
  } catch (error) {
    setBadge('bad', 'offline');
    showMessage('bad', formatError(error));
    return false;
  } finally {
    setBusy(false);
  }
}

async function refreshIdentity(options = {}) {
  const quiet = Boolean(options.quiet);

  if (!quiet) {
    clearMessage();
  }

  try {
    setBusy(true);

    const response = await client.getIdentity();
    const identity = extractIdentityState(response.data);

    if (!identity.passportSubject) {
      await saveSettings({
        ...settings,
        lastIdentityCheckAt: new Date().toISOString()
      });
      settings = await getSettings();
      renderSettings();
      renderDiagnosticsShell();

      if (!quiet) {
        showMessage('warn', 'Gateway responded, but no passport is loaded for this browser client.');
      }

      return false;
    }

    settings = await saveIdentityState(response.data);
    client = new RonClient(settings);
    renderSettings();
    renderDiagnosticsShell();

    if (settings.walletAccount) {
      await refreshBalance({ quiet: true });
    }

    if (!quiet) {
      showMessage('ok', 'Passport state refreshed from the RustyOnions gateway.');
    }

    return true;
  } catch (error) {
    renderSettings();

    if (isMissingIdentityRoute(error)) {
      const text = hasPassport(settings)
        ? 'Identity route is not available yet; using saved passport labels.'
        : 'Passport service is not available yet. Create will work after gateway exposes identity bootstrap routes.';

      if (!quiet) {
        showMessage('warn', text);
      }

      return false;
    }

    if (!quiet) {
      showMessage('bad', formatError(error));
    }

    return false;
  } finally {
    setBusy(false);
  }
}

async function createPassport() {
  clearMessage();

  try {
    setBusy(true);
    setBadge('muted', 'creating');

    const response = await client.bootstrapPassport();
    const identity = extractIdentityState(response.data);

    if (!identity.passportSubject) {
      throw new RonClientError('Passport bootstrap response did not include a passport subject.', {
        route: response.route,
        status: response.status,
        correlationId: response.correlationId,
        data: response.data
      });
    }

    settings = await saveIdentityState(response.data);
    client = new RonClient(settings);
    renderSettings();
    renderDiagnosticsShell();

    if (settings.walletAccount) {
      await refreshBalance({ quiet: true });
    }

    setBadge('ok', 'online');
    showMessage('ok', 'RON Passport created/loaded through the configured gateway.');
  } catch (error) {
    if (isMissingIdentityRoute(error)) {
      setBadge('warn', 'backend todo');
      showMessage('warn', 'Gateway is reachable, but passport bootstrap routes are not implemented yet.');
      return;
    }

    setBadge('bad', 'error');
    showMessage('bad', formatError(error));
  } finally {
    setBusy(false);
  }
}

async function refreshBalance(options = {}) {
  const quiet = Boolean(options.quiet);

  if (!quiet) {
    clearMessage();
  }

  if (!settings.walletAccount) {
    if (!quiet) {
      showMessage('warn', 'Wallet account is not loaded yet.');
    }
    return false;
  }

  try {
    setBusy(true);

    const response = await client.getWalletBalance(settings.walletAccount);
    const balance = extractBalanceState(response.data);

    settings = await saveBalanceState(balance);
    client = new RonClient(settings);
    renderSettings();

    if (!quiet) {
      showMessage('ok', 'Wallet balance refreshed from the RustyOnions gateway.');
    }

    return true;
  } catch (error) {
    if (isMissingWalletRoute(error)) {
      if (!quiet) {
        showMessage('warn', 'Wallet balance route is not available yet. Balance will appear after gateway exposes it.');
      }
      return false;
    }

    if (!quiet) {
      showMessage('bad', formatError(error));
    }

    return false;
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
    ['Owner passport', payload.owner_passport_subject || payload.ownerPassportSubject],
    ['Wallet account', payload.wallet_account || payload.walletAccount],
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
  els.refreshIdentityButton.disabled = isBusy;
  els.createPassportButton.disabled = isBusy;
  els.refreshBalanceButton.disabled = isBusy;
  els.runDiagnosticsButton.disabled = isBusy;
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

function diagnosticErrorLabel(error) {
  if (error instanceof RonClientError) {
    if (error.status) {
      return `HTTP ${error.status}`;
    }

    if (error.message.includes('timed out')) {
      return 'timeout';
    }

    return 'failed';
  }

  return 'failed';
}

function isMissingIdentityRoute(error) {
  return error instanceof RonClientError &&
    (error.status === 404 || error.status === 405 || error.status === 501) &&
    (error.route.includes('/identity/') || error.route === '/identity/me');
}

function isMissingWalletRoute(error) {
  return error instanceof RonClientError &&
    (error.status === 404 || error.status === 405 || error.status === 501) &&
    error.route.includes('/wallet/');
}

function shortTimestamp(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

els.checkNodeButton.addEventListener('click', () => checkNode({ quiet: false }));
els.refreshIdentityButton.addEventListener('click', () => refreshIdentity({ quiet: false }));
els.createPassportButton.addEventListener('click', createPassport);
els.refreshBalanceButton.addEventListener('click', () => refreshBalance({ quiet: false }));
els.runDiagnosticsButton.addEventListener('click', runDiagnostics);
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