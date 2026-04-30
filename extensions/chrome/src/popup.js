/**
 * RO:WHAT — Popup controller for CrabLink health, passport, balance, diagnostics, and resolver UX.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; expose gateway-backed state without local truth.
 * RO:INTERACTS — storage.js, ronClient.js, crab.js, svc-gateway public routes.
 * RO:INVARIANTS — no private keys; no fake ROC; diagnostics stay read-only; mutations require a button.
 * RO:METRICS — sends correlation IDs through ronClient.js for backend metrics/logs.
 * RO:CONFIG — uses gateway URL, timeout, passport label, wallet label, dev token from storage.js.
 * RO:SECURITY — redacts secrets; does not display Authorization values.
 * RO:TEST — scripts/check-chrome.sh, scripts/smoke-local-gateway.sh, manual checklist.
 */

import { normalizeCrabInput } from './crab.js';
import { RonClient } from './ronClient.js';
import {
  addRecentReceipt,
  extractIdentityState,
  getSettings,
  hasPassport,
  hasWallet,
  identitySummary,
  rememberLastCrabUrl,
  saveBalanceState,
  saveIdentityState
} from './storage.js';

const SAMPLE_HASH = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const els = {
  nodeBadge: byId('nodeBadge'),
  gatewayUrl: byId('gatewayUrl'),
  passportSubject: byId('passportSubject'),
  walletAccount: byId('walletAccount'),
  rocBalance: byId('rocBalance'),
  ledgerBacked: byId('ledgerBacked'),
  checkNodeButton: byId('checkNodeButton'),
  refreshIdentityButton: byId('refreshIdentityButton'),
  openOptionsButton: byId('openOptionsButton'),

  passportBadge: byId('passportBadge'),
  passportSummary: byId('passportSummary'),
  identityCheckedAt: byId('identityCheckedAt'),
  balanceCheckedAt: byId('balanceCheckedAt'),
  starterGrantStatus: byId('starterGrantStatus'),
  starterGrantAmount: byId('starterGrantAmount'),
  bootstrapReceiptId: byId('bootstrapReceiptId'),
  createPassportButton: byId('createPassportButton'),
  refreshBalanceButton: byId('refreshBalanceButton'),

  diagnosticsBadge: byId('diagnosticsBadge'),
  diagnosticsList: byId('diagnosticsList'),
  runDiagnosticsButton: byId('runDiagnosticsButton'),

  crabInput: byId('crabInput'),
  defaultAssetKind: byId('defaultAssetKind'),
  resolveButton: byId('resolveButton'),

  result: byId('result'),
  resultTitle: byId('resultTitle'),
  resultSubtitle: byId('resultSubtitle'),
  resultKind: byId('resultKind'),
  resultFacts: byId('resultFacts'),
  resultJson: byId('resultJson'),
  copyCrabButton: byId('copyCrabButton'),
  copyB3Button: byId('copyB3Button'),
  copyJsonButton: byId('copyJsonButton'),

  messageBox: byId('messageBox')
};

let settings = null;
let client = null;
let lastParsed = null;
let lastResult = null;

const diagnosticDefinitions = [
  {
    label: 'Gateway health',
    method: 'GET',
    path: '/healthz',
    run: () => client.getHealth()
  },
  {
    label: 'Gateway readiness',
    method: 'GET',
    path: '/readyz',
    run: () => client.getReady()
  },
  {
    label: 'Passport identity',
    method: 'GET',
    path: '/identity/me',
    run: () => client.getIdentity()
  },
  {
    label: 'Wallet balance',
    method: 'GET',
    path: () => `/wallet/${settings.walletAccount || ':account'}/balance`,
    enabled: () => hasWallet(settings),
    run: () => client.getWalletBalance(settings.walletAccount)
  },
  {
    label: 'Typed b3 asset page',
    method: 'GET',
    path: `/b3/${SAMPLE_HASH}.image`,
    run: () => client.getB3Asset(SAMPLE_HASH, 'image')
  },
  {
    label: 'crab:// resolver',
    method: 'GET',
    path: `/crab/resolve?url=crab://${SAMPLE_HASH}.image`,
    run: () => client.resolveCrab(`crab://${SAMPLE_HASH}.image`)
  },
  {
    label: 'Passport bootstrap',
    method: 'POST',
    path: '/identity/passport/bootstrap',
    mutation: true,
    skipReason: 'Skipped by diagnostics because this is a mutation route.'
  }
];

function byId(id) {
  const el = document.getElementById(id);

  if (!el) {
    throw new Error(`Missing popup element: ${id}`);
  }

  return el;
}

async function load() {
  settings = await getSettings();
  client = new RonClient(settings);
  renderSettings(settings);
  renderDiagnosticsIdle();

  if (settings.lastCrabUrl) {
    els.crabInput.value = settings.lastCrabUrl;
  }

  await checkNode({ quiet: true });
}

function renderSettings(nextSettings) {
  settings = nextSettings;

  els.gatewayUrl.textContent = settings.gatewayUrl;
  els.passportSubject.textContent = settings.passportSubject || 'not loaded';
  els.walletAccount.textContent = settings.walletAccount || 'not linked';
  els.rocBalance.textContent = settings.rocBalanceDisplay || 'unknown';
  els.ledgerBacked.textContent = settings.rocLedgerBacked ? 'ledger-backed' : 'display-only';

  els.passportSummary.textContent = hasPassport(settings)
    ? `Passport ready: ${identitySummary(settings)}`
    : 'No passport label is loaded yet. Create or load one through the gateway.';

  els.identityCheckedAt.textContent = formatDate(settings.lastIdentityCheckAt);
  els.balanceCheckedAt.textContent = formatDate(settings.rocBalanceUpdatedAt);
  els.bootstrapReceiptId.textContent = settings.lastBootstrapReceiptId || 'none';

  if (settings.lastStarterGrantIssued) {
    els.starterGrantStatus.textContent = 'issued by backend';
  } else if (settings.lastStarterGrantReason) {
    els.starterGrantStatus.textContent = settings.lastStarterGrantReason;
  } else {
    els.starterGrantStatus.textContent = 'pending backend';
  }

  els.starterGrantAmount.textContent = settings.lastStarterGrantAmountMinorUnits
    ? `${settings.lastStarterGrantAmountMinorUnits} ROC`
    : 'unknown';

  setPassportBadge();
  syncPassportButtons();
}

function setPassportBadge() {
  if (!hasPassport(settings)) {
    setBadge(els.passportBadge, 'warn', 'create');
    return;
  }

  if (settings.rocLedgerBacked) {
    setBadge(els.passportBadge, 'ok', 'ledger');
    return;
  }

  setBadge(els.passportBadge, 'ok', 'ready');
}

function syncPassportButtons() {
  els.createPassportButton.classList.toggle('hidden', hasPassport(settings));
  els.refreshBalanceButton.classList.toggle('hidden', !hasWallet(settings));
}

async function checkNode(options = {}) {
  try {
    setBusy(true);
    setBadge(els.nodeBadge, 'muted', 'checking');

    await client.getHealth();
    await client.getReady();

    setBadge(els.nodeBadge, 'ok', 'online');

    if (!options.quiet) {
      showMessage('ok', 'RustyOnions gateway is online and ready.');
    }

    return true;
  } catch (error) {
    setBadge(els.nodeBadge, 'bad', 'offline');

    if (!options.quiet) {
      showMessage('bad', formatError(error));
    }

    return false;
  } finally {
    setBusy(false);
  }
}

async function refreshIdentity() {
  try {
    setBusy(true);
    setBadge(els.passportBadge, 'muted', 'checking');

    const response = await client.getIdentity();
    const saved = await saveIdentityState(response.data);

    settings = saved;
    client = new RonClient(settings);
    renderSettings(saved);
    renderBackendWarnings(response.data);

    if (hasWallet(saved)) {
      await refreshBalance({ quiet: true });
    }

    setBadge(els.passportBadge, 'ok', hasPassport(saved) ? 'ready' : 'empty');
    showMessage('ok', `Identity refreshed. Correlation: ${response.correlationId}`);
  } catch (error) {
    setBadge(els.passportBadge, 'bad', 'error');
    showMessage('bad', formatError(error));
  } finally {
    setBusy(false);
  }
}

async function createPassport() {
  try {
    setBusy(true);
    setBadge(els.passportBadge, 'muted', 'creating');

    const response = await client.bootstrapPassport({
      desired_starting_balance_minor_units: '1776'
    });

    const identity = extractIdentityState(response.data);

    if (!identity.passportSubject) {
      throw new Error('Passport bootstrap response did not include a passport subject.');
    }

    let saved = await saveIdentityState(response.data);

    if (identity.lastBootstrapReceiptId) {
      saved = await addRecentReceipt({
        id: identity.lastBootstrapReceiptId,
        route: '/identity/passport/bootstrap',
        action: 'passport_bootstrap',
        createdAt: new Date().toISOString()
      });
    }

    settings = saved;
    client = new RonClient(settings);
    renderSettings(saved);
    renderBackendWarnings(response.data);

    if (hasWallet(saved)) {
      await refreshBalance({ quiet: true });
    }

    setBadge(els.passportBadge, 'ok', 'created');
    showMessage('ok', `Passport created/loaded through gateway. Correlation: ${response.correlationId}`);
  } catch (error) {
    setBadge(els.passportBadge, 'bad', 'error');
    showMessage('bad', formatError(error));
  } finally {
    setBusy(false);
  }
}

async function refreshBalance(options = {}) {
  if (!hasWallet(settings)) {
    if (!options.quiet) {
      showMessage('warn', 'No wallet account label is loaded yet.');
    }

    return;
  }

  try {
    setBusy(true);

    const response = await client.getWalletBalance(settings.walletAccount);
    const saved = await saveBalanceState(response.data);

    settings = saved;
    client = new RonClient(settings);
    renderSettings(saved);
    renderBackendWarnings(response.data);

    if (!options.quiet) {
      showMessage(
        saved.rocLedgerBacked ? 'ok' : 'warn',
        saved.rocLedgerBacked
          ? `Ledger-backed balance refreshed. Correlation: ${response.correlationId}`
          : `Display-only balance refreshed. Correlation: ${response.correlationId}`
      );
    }
  } catch (error) {
    if (!options.quiet) {
      showMessage('bad', formatError(error));
    }
  } finally {
    setBusy(false);
  }
}

function renderDiagnosticsIdle() {
  els.diagnosticsList.textContent = '';

  for (const item of diagnosticDefinitions) {
    const row = document.createElement('div');
    row.className = 'diagnostic-row';

    const left = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = item.label;
    const path = document.createElement('div');
    path.className = 'muted mono';
    path.textContent = `${item.method} ${typeof item.path === 'function' ? item.path() : item.path}`;
    left.append(title, path);

    const badge = document.createElement('span');
    badge.className = 'badge badge-muted';
    badge.textContent = item.mutation ? 'skip' : 'idle';

    row.append(left, badge);
    els.diagnosticsList.append(row);
  }
}

async function runDiagnostics() {
  setBusy(true);
  setBadge(els.diagnosticsBadge, 'muted', 'running');
  els.diagnosticsList.textContent = '';

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of diagnosticDefinitions) {
    const row = makeDiagnosticRow(item, 'running');
    els.diagnosticsList.append(row.el);

    if (item.mutation || item.skipReason) {
      skipped += 1;
      updateDiagnosticRow(row, 'warn', 'skip', item.skipReason || 'Skipped.');
      continue;
    }

    if (item.enabled && !item.enabled()) {
      skipped += 1;
      updateDiagnosticRow(row, 'warn', 'skip', 'Missing required local label.');
      continue;
    }

    try {
      const response = await item.run();
      passed += 1;
      updateDiagnosticRow(row, 'ok', String(response.status || 200), response.correlationId || 'ok');
    } catch (error) {
      failed += 1;
      updateDiagnosticRow(row, 'bad', 'fail', formatError(error));
    }
  }

  if (failed > 0) {
    setBadge(els.diagnosticsBadge, 'bad', `${failed} failed`);
    showMessage('bad', `Diagnostics finished: ${passed} passed, ${failed} failed, ${skipped} skipped.`);
  } else {
    setBadge(els.diagnosticsBadge, 'ok', 'passed');
    showMessage('ok', `Diagnostics finished: ${passed} passed, ${skipped} skipped.`);
  }

  setBusy(false);
}

function makeDiagnosticRow(item, status) {
  const el = document.createElement('div');
  el.className = 'diagnostic-row';

  const left = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = item.label;

  const path = document.createElement('div');
  path.className = 'muted mono';
  path.textContent = `${item.method} ${typeof item.path === 'function' ? item.path() : item.path}`;

  const detail = document.createElement('div');
  detail.className = 'muted';

  left.append(title, path, detail);

  const badge = document.createElement('span');
  badge.className = 'badge badge-muted';
  badge.textContent = status;

  el.append(left, badge);

  return { el, badge, detail };
}

function updateDiagnosticRow(row, kind, text, detail) {
  row.badge.className = `badge badge-${kind}`;
  row.badge.textContent = text;
  row.detail.textContent = detail || '';
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
    ['Backend schema', payload.schema],
    ['Backend type', payload.type],
    ['Content ID', payload.content_id || payload.contentId],
    ['Asset CID', payload.asset_cid || payload.assetCid],
    ['Manifest CID', payload.manifest_cid || payload.manifestCid],
    ['Site name', payload.name || payload.site_name || payload.siteName],
    ['Owner passport', payload.owner_passport_subject || payload.ownerPassportSubject],
    ['Wallet account', payload.wallet_account || payload.walletAccount],
    ['Ledger backed', boolText(payload.ledger_backed ?? payload.ledgerBacked)],
    ['Starter grant', starterGrantSummary(payload.starter_grant || payload.starterGrant)],
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

function clearResult() {
  lastParsed = null;
  lastResult = null;
  els.result.classList.add('hidden');
  els.resultJson.textContent = '{}';
  clearFacts();
  configureCopyButton(els.copyCrabButton, '');
  configureCopyButton(els.copyB3Button, '');
  els.copyJsonButton.classList.add('hidden');
}

function clearFacts() {
  els.resultFacts.textContent = '';
}

function addFact(label, value) {
  const row = document.createElement('div');
  row.className = 'row';

  const left = document.createElement('span');
  left.className = 'label';
  left.textContent = label;

  const right = document.createElement('span');
  right.className = 'value mono';
  right.textContent = value;

  row.append(left, right);
  els.resultFacts.append(row);
}

function configureCopyButton(button, value) {
  const clean = String(value || '').trim();
  button.classList.toggle('hidden', !clean);
  button.dataset.copyValue = clean;
}

async function copyFromButton(button) {
  const value = button.dataset.copyValue || '';

  if (!value) {
    return;
  }

  await navigator.clipboard.writeText(value);
  showMessage('ok', 'Copied to clipboard.');
}

function renderBackendWarnings(payload) {
  const warnings = Array.isArray(payload?.warnings) ? payload.warnings : [];

  if (warnings.length === 0) {
    return;
  }

  showMessage('warn', warnings.map(String).join(' | '));
}

function setBusy(isBusy) {
  els.checkNodeButton.disabled = isBusy;
  els.refreshIdentityButton.disabled = isBusy;
  els.createPassportButton.disabled = isBusy;
  els.refreshBalanceButton.disabled = isBusy;
  els.runDiagnosticsButton.disabled = isBusy;
  els.resolveButton.disabled = isBusy;
}

function setBadge(el, kind, text) {
  el.className = `badge badge-${kind}`;
  el.textContent = text;
}

function showMessage(kind, text) {
  els.messageBox.className = `message message-${kind}`;
  els.messageBox.textContent = text;
}

function clearMessage() {
  els.messageBox.className = 'message message-muted';
  els.messageBox.textContent = '';
}

function formatError(error) {
  const parts = [];

  if (error?.message) {
    parts.push(error.message);
  }

  if (error?.status) {
    parts.push(`HTTP ${error.status}`);
  }

  if (error?.route) {
    parts.push(error.route);
  }

  if (error?.correlationId) {
    parts.push(`correlation ${error.correlationId}`);
  }

  return parts.join(' — ') || 'Request failed.';
}

function formatDate(value) {
  if (!value) {
    return 'never';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function boolText(value) {
  if (value === true) {
    return 'true';
  }

  if (value === false) {
    return 'false';
  }

  return '';
}

function starterGrantSummary(value) {
  if (!value || typeof value !== 'object') {
    return '';
  }

  if (value.issued === true) {
    return 'issued';
  }

  return value.reason || value.status || '';
}

els.checkNodeButton.addEventListener('click', () => checkNode());
els.refreshIdentityButton.addEventListener('click', refreshIdentity);
els.openOptionsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
els.createPassportButton.addEventListener('click', createPassport);
els.refreshBalanceButton.addEventListener('click', () => refreshBalance());
els.runDiagnosticsButton.addEventListener('click', runDiagnostics);
els.resolveButton.addEventListener('click', resolveInput);
els.copyCrabButton.addEventListener('click', () => copyFromButton(els.copyCrabButton));
els.copyB3Button.addEventListener('click', () => copyFromButton(els.copyB3Button));
els.copyJsonButton.addEventListener('click', async () => {
  const payload = lastResult?.data || lastResult || {};
  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  showMessage('ok', 'Copied JSON to clipboard.');
});

load().catch((error) => {
  setBadge(els.nodeBadge, 'bad', 'error');
  showMessage('bad', error.message || 'Failed to load popup.');
});