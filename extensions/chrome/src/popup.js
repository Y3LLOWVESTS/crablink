/**
 * RO:WHAT — Popup controller for CrabLink health, passport, balance, receipts, built-in pages, diagnostics, and resolver UX.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; expose gateway-backed state without local truth.
 * RO:INTERACTS — storage.js, ronClient.js, crab.js, svc-gateway public routes, page.html full-tab browser.
 * RO:INVARIANTS — no private keys; no fake ROC; diagnostics stay read-only; product pages open full tab.
 * RO:METRICS — sends correlation IDs through ronClient.js for backend metrics/logs.
 * RO:CONFIG — uses gateway URL, timeout, passport label, wallet label, dev token from storage.js.
 * RO:SECURITY — redacts secrets; does not display Authorization values; no silent product mutation.
 * RO:TEST — scripts/check-chrome.sh, scripts/smoke-local-gateway.sh, manual checklist.
 */

import { normalizeCrabInput } from './crab.js';
import { RonClient } from './ronClient.js';
import {
  addRecentReceipt,
  balanceSummary,
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
const BUILT_IN_RON_PAGES = new Set(['site', 'image', 'music', 'article']);
const BUILTIN_PAGE_SCHEMA = 'omnigate.builtin-page.v1';

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

  receiptBadge: byId('receiptBadge'),
  receiptList: byId('receiptList'),

  ronPagesBadge: byId('ronPagesBadge'),
  ronPageButtons: Array.from(document.querySelectorAll('[data-crab-page]')),

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
    label: 'Built-in page: site',
    method: 'GET',
    path: '/crab/resolve?url=crab://site',
    run: () => client.resolveCrab('crab://site')
  },
  {
    label: 'Built-in page: image',
    method: 'GET',
    path: '/crab/resolve?url=crab://image',
    run: () => client.resolveCrab('crab://image')
  },
  {
    label: 'Built-in page: music',
    method: 'GET',
    path: '/crab/resolve?url=crab://music',
    run: () => client.resolveCrab('crab://music')
  },
  {
    label: 'Built-in page: article',
    method: 'GET',
    path: '/crab/resolve?url=crab://article',
    run: () => client.resolveCrab('crab://article')
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
    ? `Passport ready: ${identitySummary(settings)} — ${balanceSummary(settings)}`
    : 'No passport label is loaded yet. Create or load one through the gateway.';

  els.identityCheckedAt.textContent = formatDate(settings.lastIdentityCheckAt);
  els.balanceCheckedAt.textContent = formatDate(settings.rocBalanceUpdatedAt);
  els.bootstrapReceiptId.textContent = settings.lastBootstrapReceiptId || 'none';

  if (settings.lastStarterGrantIssued) {
    els.starterGrantStatus.textContent = settings.lastStarterGrantLedgerBacked
      ? 'issued by backend'
      : 'issued, ledger not verified';
  } else if (settings.lastStarterGrantReason) {
    els.starterGrantStatus.textContent = settings.lastStarterGrantReason;
  } else {
    els.starterGrantStatus.textContent = 'pending backend';
  }

  els.starterGrantAmount.textContent = settings.lastStarterGrantAmountMinorUnits
    ? `${settings.lastStarterGrantAmountMinorUnits} ROC`
    : 'unknown';

  setPassportBadge();
  renderReceipts(settings.recentReceipts);
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
        amountMinorUnits: identity.lastStarterGrantAmountMinorUnits,
        ledgerBacked: identity.lastStarterGrantLedgerBacked,
        source: identity.lastStarterGrantLedgerBacked ? 'svc_wallet.v1' : '',
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

function renderReceipts(receipts) {
  els.receiptList.textContent = '';

  if (!Array.isArray(receipts) || receipts.length === 0) {
    setBadge(els.receiptBadge, 'muted', 'empty');
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No receipts stored yet. Create/load a passport after the wallet-backed starter grant is live.';
    els.receiptList.append(empty);
    return;
  }

  setBadge(els.receiptBadge, 'ok', String(receipts.length));

  for (const receipt of receipts.slice(0, 5)) {
    const row = document.createElement('div');
    row.className = 'receipt-row';

    const main = document.createElement('div');
    const id = document.createElement('strong');
    id.className = 'mono';
    id.textContent = receipt.id;

    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = [
      receipt.action || 'receipt',
      receipt.amountMinorUnits ? `${receipt.amountMinorUnits} ROC` : '',
      receipt.ledgerBacked ? 'ledger-backed' : ''
    ].filter(Boolean).join(' · ');

    main.append(id, meta);

    const badge = document.createElement('span');
    badge.className = `badge ${receipt.ledgerBacked ? 'badge-ok' : 'badge-muted'}`;
    badge.textContent = receipt.ledgerBacked ? 'ledger' : 'saved';

    row.append(main, badge);
    els.receiptList.append(row);
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

async function openBuiltInRonPage(pageName) {
  const page = String(pageName || '').trim().toLowerCase();

  if (!BUILT_IN_RON_PAGES.has(page)) {
    showMessage('bad', 'Invalid built-in page name.');
    return;
  }

  const url = `crab://${page}`;
  await openFullCrabTab(url);
}

async function openFullCrabTab(crabUrl) {
  const clean = String(crabUrl || '').trim();

  if (!clean) {
    showMessage('bad', 'Missing crab URL.');
    return;
  }

  try {
    await rememberLastCrabUrl(clean);
    const pageUrl = chrome.runtime.getURL(`src/page.html?url=${encodeURIComponent(clean)}`);
    await chrome.tabs.create({ url: pageUrl, active: true });
    window.close();
  } catch (error) {
    showMessage('bad', `Could not open CrabLink tab: ${formatError(error)}`);
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

  if (parsed.url && shouldOpenFullPage(parsed)) {
    await openFullCrabTab(parsed.url);
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

function shouldOpenFullPage(parsed) {
  if (!parsed || !parsed.url) {
    return false;
  }

  if (parsed.type === 'asset') {
    return true;
  }

  if (parsed.type === 'site') {
    return BUILT_IN_RON_PAGES.has(String(parsed.name || '').toLowerCase());
  }

  return String(parsed.url).startsWith('crab://');
}

function renderResult(parsed, response) {
  const data = response?.data;
  const payload = data && typeof data === 'object' ? data : response;
  const isBuiltinPage = payload && payload.schema === BUILTIN_PAGE_SCHEMA;

  els.result.classList.remove('hidden');
  els.resultTitle.textContent = resultTitleFor(parsed, payload);
  els.resultSubtitle.textContent = resultSubtitleFor(parsed, payload, response);
  els.resultKind.textContent = isBuiltinPage ? String(payload.status || 'page') : parsed.type;

  clearFacts();

  if (isBuiltinPage) {
    renderBuiltinPageFacts(payload);
  } else {
    renderGenericParsedFacts(parsed);
    addBackendFacts(payload);
  }

  els.resultJson.textContent = JSON.stringify(payload, null, 2);
  els.resultJson.classList.toggle('hidden', isBuiltinPage);

  configureCopyButton(els.copyCrabButton, parsed.url || payload?.crab_url || payload?.crabUrl || payload?.links?.crab);
  configureCopyButton(
    els.copyB3Button,
    parsed.contentId ||
      payload?.content_id ||
      payload?.contentId ||
      payload?.manifest_cid ||
      payload?.manifestCid ||
      payload?.manifest?.manifest_cid ||
      payload?.manifest?.manifestCid
  );

  els.copyJsonButton.classList.remove('hidden');
}

function renderBuiltinPageFacts(payload) {
  addFact('Crab URL', payload.url || '');
  addFact('Page kind', payload.page_kind || payload.pageKind || '');
  addFact('Page status', payload.status || '');
  addFact('Requires passport', boolText(payload.requires_passport ?? payload.requiresPassport));
  addFact('Requires wallet', boolText(payload.requires_wallet ?? payload.requiresWallet));

  if (payload.description) {
    addFact('Description', payload.description);
  }

  const actions = Array.isArray(payload.actions) ? payload.actions : [];
  if (actions.length > 0) {
    addFact(
      'Actions',
      actions
        .map((action) => {
          const label = action.label || action.id || 'action';
          const method = action.method || 'GET';
          const route = action.route || '';
          const confirm = action.requires_confirmation ? 'confirm' : 'no-confirm';
          return `${label} — ${method} ${route} (${confirm})`;
        })
        .join('\n')
    );
  } else {
    addFact('Actions', 'None enabled yet');
  }

  const fields = Array.isArray(payload.fields) ? payload.fields : [];
  if (fields.length > 0) {
    addFact(
      'Fields',
      fields
        .map((field) => {
          const required = field.required ? 'required' : 'optional';
          const accept = field.accept ? `, ${field.accept}` : '';
          return `${field.label || field.name} — ${field.type || 'text'} (${required}${accept})`;
        })
        .join('\n')
    );
  }

  const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
  if (warnings.length > 0) {
    addFact('Warnings', warnings.join('\n'));
  }
}

function renderGenericParsedFacts(parsed) {
  if (parsed.type === 'asset') {
    addFact('crab URL', parsed.url);
    addFact('b3 CID', parsed.contentId);
    addFact('Asset kind', parsed.kind);
    addFact('Hash', parsed.hash);
  }

  if (parsed.type === 'site' || parsed.type === 'builtin') {
    addFact('crab URL', parsed.url);
    addFact('Name', parsed.name);
  }
}

function addBackendFacts(payload) {
  if (!payload || typeof payload !== 'object') {
    return;
  }

  const candidates = [
    ['Backend schema', payload.schema],
    ['Backend type', payload.type],
    ['Page kind', payload.page_kind || payload.pageKind],
    ['Page status', payload.status],
    ['Content ID', payload.content_id || payload.contentId],
    ['Asset CID', payload.asset_cid || payload.assetCid],
    ['Asset kind', payload.asset_kind || payload.assetKind],
    ['Manifest CID', payload.manifest_cid || payload.manifestCid || payload.manifest?.manifest_cid],
    ['Site name', payload.name || payload.site_name || payload.siteName],
    ['Owner passport', payload.owner_passport_subject || payload.ownerPassportSubject || payload.owner?.passport_subject],
    ['Wallet account', payload.wallet_account || payload.walletAccount || payload.owner?.wallet_account],
    ['Requires passport', boolText(payload.requires_passport ?? payload.requiresPassport)],
    ['Requires wallet', boolText(payload.requires_wallet ?? payload.requiresWallet)],
    ['Action count', Array.isArray(payload.actions) ? String(payload.actions.length) : ''],
    ['Warnings', Array.isArray(payload.warnings) ? payload.warnings.map(String).join(' | ') : ''],
    ['Ledger backed', boolText(payload.ledger_backed ?? payload.ledgerBacked)],
    ['Starter grant', starterGrantSummary(payload.starter_grant || payload.starterGrant)],
    ['Reason', payload.reason]
  ];

  for (const [label, value] of candidates) {
    if (value !== undefined && value !== null && value !== '') {
      addFact(label, String(value));
    }
  }
}

function resultTitleFor(parsed, payload = null) {
  if (payload && typeof payload === 'object' && payload.title) {
    return String(payload.title);
  }

  if (parsed.type === 'asset') {
    return `Asset page: ${parsed.kind}`;
  }

  if (parsed.type === 'site') {
    return `Site: ${parsed.name}`;
  }

  if (parsed.type === 'builtin') {
    return `Built-in page: ${parsed.url}`;
  }

  return 'Crab resolve';
}

function resultSubtitleFor(parsed, payload = null, response = null) {
  if (payload && payload.schema === BUILTIN_PAGE_SCHEMA) {
    const status = payload.status ? `Status: ${payload.status}` : 'Resolved built-in page';
    const route = response?.route ? ` · ${response.route}` : '';
    return `${status}${route}`;
  }

  return response?.route || parsed.display || parsed.url || '';
}

function clearResult() {
  lastParsed = null;
  lastResult = null;
  els.result.classList.add('hidden');
  els.resultJson.textContent = '{}';
  els.resultJson.classList.remove('hidden');
  clearFacts();
  configureCopyButton(els.copyCrabButton, '');
  configureCopyButton(els.copyB3Button, '');
  els.copyJsonButton.classList.add('hidden');
}

function clearFacts() {
  els.resultFacts.textContent = '';
}

function addFact(label, value) {
  const clean = value === undefined || value === null ? '' : String(value);

  if (!clean) {
    return;
  }

  const row = document.createElement('div');
  row.className = 'row';

  const left = document.createElement('span');
  left.className = 'label';
  left.textContent = label;

  const right = document.createElement('span');
  right.className = 'value mono';
  right.textContent = clean;

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

  for (const button of els.ronPageButtons) {
    button.disabled = isBusy;
  }
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
    const amount = value.amount_minor_units || value.amountMinorUnits || '';
    return amount ? `issued ${amount} ROC` : 'issued';
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

for (const button of els.ronPageButtons) {
  button.addEventListener('click', () => openBuiltInRonPage(button.dataset.crabPage));
}

load().catch((error) => {
  setBadge(els.nodeBadge, 'bad', 'error');
  showMessage('bad', error.message || 'Failed to load popup.');
});