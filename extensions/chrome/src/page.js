/**
 * RO:WHAT — Full-tab CrabLink browser shell for rendering crab:// pages through svc-gateway.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; popup is a control panel, this page is the browser surface.
 * RO:INTERACTS — ronClient.js, storage.js, crab.js, page-workflow.js, svc-gateway /crab/resolve, /sites/:name, /b3/:hash.:kind.
 * RO:INVARIANTS — gateway-only; no private keys; wallet hold requires explicit user confirmation; no direct ledger/storage/index calls.
 * RO:METRICS — sends correlation IDs via ronClient.js.
 * RO:CONFIG — reads gateway URL, timeout, passport, wallet, dev token from storage.js.
 * RO:SECURITY — does not execute backend-provided scripts or HTML; renders DTOs as text only; no silent ROC spend.
 * RO:TEST — scripts/check-chrome.sh; manual full-tab navigation, prepare-route checks, explicit hold, and image upload confirmation.
 */

import { normalizeCrabInput } from './crab.js';
import { RonClient } from './ronClient.js';
import {
  balanceSummary,
  getSettings,
  hasWallet,
  identitySummary,
  rememberLastCrabUrl,
  saveBalanceState,
  saveIdentityState
} from './storage.js';
import {
  ASSET_PAGE_SCHEMA,
  BUILTIN_PAGE_SCHEMA,
  BUILT_IN_RON_PAGES,
  HOME_PAGE_URL,
  SITE_PAGE_SCHEMA
} from './page-constants.js';
import { clearChildren, els } from './page-dom.js';
import { createWorkflowController } from './page-workflow.js';
import { boolText, formatError, setBadgeForStatus } from './page-utils.js';

let settings = null;
let client = null;
let currentInput = '';
let currentParsed = null;
let currentResponse = null;
let currentBuiltinPayload = null;
let navigationStack = [];
let navigationIndex = -1;
let pageBusy = false;

const workflow = createWorkflowController({
  getSettings: () => settings,
  getClient: () => client,
  getCurrentParsed: () => currentParsed,
  getCurrentBuiltinPayload: () => currentBuiltinPayload,
  setCurrentBuiltinPayload: (value) => {
    currentBuiltinPayload = value;
  },
  setBusy,
  showFooter,
  copyText,
  refreshBalanceAfterMutation,
  navigateTo: (url) => navigateTo(url)
});

async function load() {
  settings = await getSettings();
  client = new RonClient(settings);
  renderTopBarState();
  renderPassportDrawer();

  const urlParam = new URLSearchParams(window.location.search).get('url');
  const initial = urlParam || settings.lastCrabUrl || HOME_PAGE_URL;

  navigationStack = [initial];
  navigationIndex = 0;
  replaceBrowserState(initial, navigationIndex);
  updateNavigationButtons();

  els.addressInput.value = initial;
  await navigateTo(initial, { pushHistory: false });
}

async function navigateTo(input, options = {}) {
  const raw = String(input || '').trim() || HOME_PAGE_URL;
  currentInput = raw;
  els.addressInput.value = raw;

  showLoading(`Resolving ${raw} through ${settings.gatewayUrl}…`);
  setBusy(true);

  try {
    const parsed = parseBrowserInput(raw);
    const response = await resolveParsed(parsed);

    currentParsed = parsed;
    currentResponse = response;

    const resolvedUrl = parsed.url || raw;
    await rememberLastCrabUrl(resolvedUrl);
    syncBrowserHistory(resolvedUrl, options);

    renderPage(parsed, response);
    showFooter(`Resolved ${resolvedUrl}. Correlation: ${response.correlationId || 'n/a'}`);
  } catch (error) {
    showError(formatError(error));
    showFooter('Page load failed.');
  } finally {
    setBusy(false);
  }
}

function parseBrowserInput(input) {
  const value = String(input || '').trim();

  if (!value) {
    return {
      type: 'builtin',
      name: 'site',
      url: HOME_PAGE_URL,
      display: HOME_PAGE_URL
    };
  }

  const lower = value.toLowerCase();

  if (BUILT_IN_RON_PAGES.has(lower)) {
    return {
      type: 'builtin',
      name: lower,
      url: `crab://${lower}`,
      display: `crab://${lower}`
    };
  }

  if (lower.startsWith('crab://')) {
    const target = lower.slice('crab://'.length);

    if (BUILT_IN_RON_PAGES.has(target)) {
      return {
        type: 'builtin',
        name: target,
        url: `crab://${target}`,
        display: `crab://${target}`
      };
    }
  }

  const parsed = normalizeCrabInput(value, {
    defaultKind: 'image'
  });

  if (parsed.type === 'asset') {
    return parsed;
  }

  if (parsed.type === 'site') {
    return parsed;
  }

  return {
    ...parsed,
    type: parsed.type || 'crab',
    url: parsed.url || value,
    display: parsed.display || parsed.url || value
  };
}

async function resolveParsed(parsed) {
  if (parsed.type === 'builtin') {
    return client.resolveCrab(parsed.url);
  }

  if (parsed.type === 'asset') {
    return client.getB3Asset(parsed.hash, parsed.kind);
  }

  if (parsed.type === 'site') {
    if (BUILT_IN_RON_PAGES.has(String(parsed.name || '').toLowerCase())) {
      return client.resolveCrab(`crab://${String(parsed.name).toLowerCase()}`);
    }

    const crabUrl = parsed.url || `crab://${parsed.name}`;

    try {
      return await client.resolveCrab(crabUrl);
    } catch (error) {
      if (shouldFallbackToDirectSiteRoute(error)) {
        return client.resolveSite(parsed.name);
      }

      throw error;
    }
  }

  return client.resolveCrab(parsed.url);
}

function shouldFallbackToDirectSiteRoute(error) {
  const route = String(error?.route || '');

  return (
    route.startsWith('/crab/resolve') &&
    (error?.status === 404 || error?.status === 405 || error?.status === 501)
  );
}

function renderPage(parsed, response) {
  const payload = response?.data && typeof response.data === 'object' ? response.data : response;

  hideAllPanels();
  els.pagePanel.classList.remove('hidden');

  els.developerDetails.open = false;
  els.developerJson.textContent = JSON.stringify(payload || {}, null, 2);

  if (payload?.schema === BUILTIN_PAGE_SCHEMA) {
    renderBuiltinPage(parsed, response, payload);
    return;
  }

  workflow.clearWorkflow();

  if (payload?.schema === ASSET_PAGE_SCHEMA || payload?.type === ASSET_PAGE_SCHEMA) {
    renderAssetPage(parsed, response, payload);
    return;
  }

  if (payload?.schema === SITE_PAGE_SCHEMA || payload?.type === SITE_PAGE_SCHEMA) {
    renderSitePage(parsed, response, payload);
    return;
  }

  renderGenericPage(parsed, response, payload);
}

function renderBuiltinPage(parsed, response, payload) {
  currentBuiltinPayload = payload;
  hideSitePageSection();
  const status = String(payload.status || 'resolved');

  setBadgeForStatus(els.pageBadge, status);
  const title = payload.title || `Built-in page: ${payload.url || parsed.url}`;
  els.pageTitle.textContent = title;
  updateDocumentTitle(title);
  els.pageDescription.textContent = payload.description || 'Built-in RustyOnions page metadata.';

  clearChildren(els.pageFacts);
  addFact('Crab URL', payload.url || parsed.url || '');
  addFact('Page kind', payload.page_kind || payload.pageKind || parsed.name || '');
  addFact('Status', status);
  addFact('Requires passport', boolText(payload.requires_passport ?? payload.requiresPassport));
  addFact('Requires wallet', boolText(payload.requires_wallet ?? payload.requiresWallet));
  addFact('Gateway route', response.route || '/crab/resolve');

  workflow.renderWorkflow(payload);
  renderActions(payload.actions || []);
  renderFields(payload.fields || []);
  renderWarnings(payload.warnings || []);

  configureCopyButtons(payload.url || parsed.url, payload);
}

function renderAssetPage(parsed, response, payload) {
  workflow.clearWorkflow();
  hideSitePageSection();

  els.pageBadge.className = 'badge badge-ok';
  els.pageBadge.textContent = 'asset';
  const title = `${payload.asset_kind || parsed.kind || 'Asset'} page`;
  els.pageTitle.textContent = title;
  updateDocumentTitle(title);
  els.pageDescription.textContent =
    payload.metadata?.description ||
    'Typed b3 asset page resolved through the RustyOnions gateway.';

  clearChildren(els.pageFacts);
  addFact('Asset CID', payload.asset_cid || parsed.contentId || '');
  addFact('Asset kind', payload.asset_kind || parsed.kind || '');
  addFact('Crab URL', payload.links?.crab || parsed.url || '');
  addFact('Manifest', payload.manifest?.manifest_cid || 'missing');
  addFact('Owner passport', payload.owner?.passport_subject || payload.owner_passport_subject || '');
  addFact('Owner wallet', payload.owner?.wallet_account || payload.owner_wallet_account || '');
  addFact('Payout recipient', payload.payout?.recipient_account || '');
  addFact('Storage', payload.storage?.available ? 'available' : 'not available');
  addFact('Gateway route', response.route || '');

  renderActions([]);
  renderFields([]);
  renderWarnings(payload.warnings || []);

  configureCopyButtons(payload.links?.crab || parsed.url, payload);
}

function renderSitePage(parsed, response, payload) {
  workflow.clearWorkflow();

  els.pageBadge.className = 'badge badge-ok';
  els.pageBadge.textContent = 'site';

  const title = payload.metadata?.title || payload.title || payload.site_name || parsed.name || 'RON Site';
  const siteUrl =
    payload.links?.crab ||
    payload.crab_url ||
    parsed.url ||
    `crab://${payload.site_name || parsed.name || ''}`;
  const description =
    payload.metadata?.description ||
    payload.description ||
    'Manifest-backed RON site resolved through your RustyOnions gateway.';

  els.pageTitle.textContent = title;
  updateDocumentTitle(title);
  els.pageDescription.textContent = description;

  clearChildren(els.pageFacts);
  addFact('Crab URL', siteUrl);
  addFact('Site name', payload.site_name || payload.name || parsed.name || '');
  addFact('Root document CID', payload.root_document_cid || '');
  addFact('Manifest CID', payload.manifest?.manifest_cid || payload.manifest_cid || '');
  addFact('Manifest status', manifestStatusText(payload.manifest));
  addFact('Owner passport', payload.owner?.passport_subject || payload.owner_passport_subject || '');
  addFact('Owner wallet', payload.owner?.wallet_account || payload.owner_wallet_account || '');
  addFact('Payout action', payload.payout?.default_action || '');
  addFact('Payout account', payload.payout?.recipient_account || '');
  addFact('Routes', objectSize(payload.route_map));
  addFact('Assets', objectSize(payload.asset_map));
  addFact('Receipts', Array.isArray(payload.receipts) ? payload.receipts.length : '');
  addFact('Gateway route', response.route || '');

  renderSitePageCards(payload);
  renderActions([]);
  renderFields([]);
  renderWarnings(payload.warnings || []);

  configureCopyButtons(siteUrl, payload);
}

function renderSitePageCards(payload) {
  if (!els.sitePageSection || !els.sitePageCards) {
    return;
  }

  clearChildren(els.sitePageCards);
  els.sitePageSection.classList.remove('hidden');

  appendSiteCard('Ownership', [
    ['Passport', payload.owner?.passport_subject || payload.owner_passport_subject || 'not declared'],
    ['Wallet', payload.owner?.wallet_account || payload.owner_wallet_account || 'not linked']
  ]);

  appendSiteCard('Payout', [
    ['Default action', payload.payout?.default_action || 'not declared'],
    ['Recipient account', payload.payout?.recipient_account || 'not declared']
  ]);

  appendSiteCard('Manifest', [
    ['Status', payload.manifest?.status || 'unknown'],
    ['Hydration', payload.manifest?.hydration_status || 'unknown'],
    ['Manifest CID', payload.manifest?.manifest_cid || payload.manifest_cid || 'missing'],
    ['Raw manifest route', payload.links?.manifest_raw || payload.manifest?.manifest_raw || 'not exposed']
  ]);

  appendSiteCard('Metadata', [
    ['Title', payload.metadata?.title || payload.title || 'untitled'],
    ['Description', payload.metadata?.description || payload.description || 'no description'],
    ['Tags', Array.isArray(payload.metadata?.tags) ? payload.metadata.tags.join(', ') : 'none']
  ]);

  appendMapCard('Route map', payload.route_map, 'No routes declared yet.');
  appendMapCard('Asset map', payload.asset_map, 'No assets declared yet.');

  if (Array.isArray(payload.receipts) && payload.receipts.length > 0) {
    appendReceiptCard(payload.receipts);
  } else {
    appendSiteCard('Receipts', [['Status', 'No receipts returned for this page.']]);
  }
}

function hideSitePageSection() {
  if (!els.sitePageSection || !els.sitePageCards) {
    return;
  }

  clearChildren(els.sitePageCards);
  els.sitePageSection.classList.add('hidden');
}

function appendSiteCard(title, rows) {
  if (!els.sitePageCards) {
    return;
  }

  const card = document.createElement('article');
  card.className = 'site-card';

  const heading = document.createElement('h4');
  heading.textContent = title;
  card.append(heading);

  const list = document.createElement('dl');
  for (const [label, value] of rows) {
    appendDescriptionRow(list, label, value);
  }

  card.append(list);
  els.sitePageCards.append(card);
}

function appendMapCard(title, mapValue, emptyText) {
  const entries = mapEntries(mapValue);
  const rows = entries.length > 0 ? entries : [['Status', emptyText]];
  appendSiteCard(title, rows);
}

function appendReceiptCard(receipts) {
  const rows = receipts.slice(0, 6).map((receipt, index) => {
    if (receipt && typeof receipt === 'object') {
      const kind = receipt.receipt_kind || receipt.kind || receipt.action || `receipt ${index + 1}`;
      const txid = receipt.wallet_txid || receipt.txid || receipt.transaction_id || '';
      const hash = receipt.wallet_receipt_hash || receipt.receipt_hash || receipt.hash || '';
      const value = [kind, txid, hash].filter(Boolean).join(' · ');
      return [`#${index + 1}`, value || JSON.stringify(receipt)];
    }

    return [`#${index + 1}`, String(receipt)];
  });

  if (receipts.length > rows.length) {
    rows.push(['More', `${receipts.length - rows.length} additional receipt(s) in Developer JSON`]);
  }

  appendSiteCard('Receipts', rows);
}

function appendDescriptionRow(list, label, value) {
  const term = document.createElement('dt');
  term.textContent = label;

  const description = document.createElement('dd');
  description.textContent = value === undefined || value === null || value === '' ? '—' : String(value);

  list.append(term, description);
}

function mapEntries(mapValue) {
  if (!mapValue || typeof mapValue !== 'object' || Array.isArray(mapValue)) {
    return [];
  }

  return Object.entries(mapValue).map(([key, value]) => [key, value]);
}

function objectSize(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }

  return String(Object.keys(value).length);
}

function manifestStatusText(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    return '';
  }

  return [manifest.status, manifest.hydration_status].filter(Boolean).join(' / ');
}

function renderGenericPage(parsed, response, payload) {
  workflow.clearWorkflow();
  hideSitePageSection();

  els.pageBadge.className = 'badge badge-muted';
  els.pageBadge.textContent = parsed.type || 'result';
  const title = parsed.display || parsed.url || 'CrabLink Result';
  els.pageTitle.textContent = title;
  updateDocumentTitle(title);
  els.pageDescription.textContent = 'Generic gateway response. See Developer JSON for full details.';

  clearChildren(els.pageFacts);
  addFact('Input', currentInput);
  addFact('Route', response?.route || '');
  addFact('Status', String(response?.status || 'ok'));
  addFact('Correlation', response?.correlationId || '');

  renderActions([]);
  renderFields([]);
  renderWarnings(payload?.warnings || []);

  configureCopyButtons(parsed.url || '', payload);
}

function renderActions(actions) {
  clearChildren(els.actionsList);

  if (!Array.isArray(actions) || actions.length === 0) {
    els.actionsSection.classList.add('hidden');
    return;
  }

  els.actionsSection.classList.remove('hidden');

  for (const action of actions) {
    const card = document.createElement('article');
    card.className = 'action-card';

    const title = document.createElement('h4');
    title.textContent = action.label || action.id || 'Action';

    const description = document.createElement('p');
    description.textContent = action.mutates
      ? 'Mutating backend action. CrabLink displays the route contract; paid mutation requires explicit gated workflow.'
      : 'Non-mutating prepare/read action. CrabLink can call this route as a preflight check.';

    const route = document.createElement('span');
    route.className = 'action-route';
    route.textContent = `${action.method || 'GET'} ${action.route || ''}${
      action.requires_confirmation ? ' · requires confirmation' : ''
    }`;

    card.append(title, description, route);
    els.actionsList.append(card);
  }
}

function renderFields(fields) {
  clearChildren(els.fieldsList);

  if (!Array.isArray(fields) || fields.length === 0) {
    els.fieldsSection.classList.add('hidden');
    return;
  }

  els.fieldsSection.classList.remove('hidden');

  for (const field of fields) {
    const card = document.createElement('article');
    card.className = 'field-card';

    const title = document.createElement('h4');
    title.textContent = field.label || field.name || 'Field';

    const description = document.createElement('p');
    description.textContent = field.required
      ? 'Required field for this RustyOnions product page.'
      : 'Optional field for this RustyOnions product page.';

    const meta = document.createElement('span');
    meta.className = 'field-meta';
    meta.textContent = `${field.type || 'text'}${field.accept ? ` · ${field.accept}` : ''}`;

    card.append(title, description, meta);
    els.fieldsList.append(card);
  }
}

function renderWarnings(warnings) {
  clearChildren(els.warningsList);

  if (!Array.isArray(warnings) || warnings.length === 0) {
    els.warningsSection.classList.add('hidden');
    return;
  }

  els.warningsSection.classList.remove('hidden');

  for (const warning of warnings) {
    const card = document.createElement('article');
    card.className = 'warning-card';

    const text = document.createElement('p');
    text.textContent = String(warning);

    card.append(text);
    els.warningsList.append(card);
  }
}

function addFact(label, value) {
  const clean = value === undefined || value === null ? '' : String(value);

  if (!clean) {
    return;
  }

  const card = document.createElement('div');
  card.className = 'fact-card';

  const key = document.createElement('span');
  key.textContent = label;

  const val = document.createElement('strong');
  val.textContent = clean;

  card.append(key, val);
  els.pageFacts.append(card);
}

function configureCopyButtons(crabUrl, payload) {
  const cleanUrl = String(crabUrl || '').trim();

  els.copyUrlButton.disabled = !cleanUrl;
  els.copyUrlButton.dataset.copyValue = cleanUrl;
  els.copyJsonButton.dataset.copyValue = JSON.stringify(payload || {}, null, 2);
}

function syncBrowserHistory(url, options = {}) {
  const cleanUrl = String(url || HOME_PAGE_URL).trim() || HOME_PAGE_URL;

  if (navigationIndex < 0) {
    navigationStack = [cleanUrl];
    navigationIndex = 0;
    replaceBrowserState(cleanUrl, navigationIndex);
    updateNavigationButtons();
    return;
  }

  if (options.pushHistory === false || options.replaceCurrent === true) {
    navigationStack[navigationIndex] = cleanUrl;
    replaceBrowserState(cleanUrl, navigationIndex);
    updateNavigationButtons();
    return;
  }

  if (navigationStack[navigationIndex] === cleanUrl) {
    replaceBrowserState(cleanUrl, navigationIndex);
    updateNavigationButtons();
    return;
  }

  navigationStack = navigationStack.slice(0, navigationIndex + 1);
  navigationStack.push(cleanUrl);
  navigationIndex = navigationStack.length - 1;

  const nextUrl = pageLocationFor(cleanUrl);
  window.history.pushState({ url: cleanUrl, navigationIndex }, '', nextUrl.toString());
  updateNavigationButtons();
}

function replaceBrowserState(url, index) {
  const cleanUrl = String(url || HOME_PAGE_URL).trim() || HOME_PAGE_URL;
  const safeIndex = Number.isInteger(index) && index >= 0 ? index : 0;
  const nextUrl = pageLocationFor(cleanUrl);
  window.history.replaceState({ url: cleanUrl, navigationIndex: safeIndex }, '', nextUrl.toString());
}

function pageLocationFor(crabUrl) {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('url', crabUrl);
  return nextUrl;
}

function updateNavigationButtons() {
  els.backButton.disabled = pageBusy || navigationIndex <= 0;
  els.forwardButton.disabled =
    pageBusy || navigationIndex < 0 || navigationIndex >= navigationStack.length - 1;
  els.homeButton.disabled = pageBusy || (currentParsed?.url || currentInput || '') === HOME_PAGE_URL;
}

function updateDocumentTitle(title) {
  const clean = String(title || '').trim();
  document.title = clean ? `${clean} — CrabLink` : 'CrabLink Browser';
}

function showLoading(text) {
  hideAllPanels();
  els.loadingPanel.classList.remove('hidden');
  els.loadingText.textContent = text || 'Resolving through your local RustyOnions gateway.';
}

function showError(message) {
  hideAllPanels();
  els.errorPanel.classList.remove('hidden');
  els.errorText.textContent = message || 'Unknown error.';
}

function hideAllPanels() {
  els.loadingPanel.classList.add('hidden');
  els.errorPanel.classList.add('hidden');
  els.pagePanel.classList.add('hidden');
}

function renderTopBarState() {
  const balanceText = String(settings?.rocBalanceDisplay || '0 ROC').trim() || '0 ROC';
  els.topRocBalance.textContent = balanceText;
  els.topRocBalance.title = settings?.rocLedgerBacked
    ? `${balanceText} · ledger-backed`
    : `${balanceText} · display-only`;
}

function renderPassportDrawer() {
  els.drawerGateway.textContent = settings.gatewayUrl || '—';
  els.drawerPassport.textContent = settings.passportSubject || 'not loaded';
  els.drawerWallet.textContent = settings.walletAccount || 'not linked';
  els.drawerRoc.textContent = settings.rocBalanceDisplay || 'unknown';
  els.drawerLedger.textContent = settings.rocLedgerBacked ? 'ledger-backed' : 'display-only';

  if (settings.passportSubject) {
    els.drawerMessage.textContent = `${identitySummary(settings)} — ${balanceSummary(settings)}`;
  } else {
    els.drawerMessage.textContent = 'No passport loaded yet.';
  }

  renderTopBarState();
}

async function checkNodeFromDrawer() {
  try {
    setBusy(true);
    await client.getHealth();
    await client.getReady();
    els.drawerMessage.textContent = 'Gateway is online and ready.';
    showFooter('Gateway is online and ready.');
  } catch (error) {
    els.drawerMessage.textContent = formatError(error);
    showFooter('Gateway check failed.');
  } finally {
    setBusy(false);
  }
}

async function refreshIdentityFromDrawer() {
  try {
    setBusy(true);
    const response = await client.getIdentity();
    settings = await saveIdentityState(response.data);
    client = new RonClient(settings);

    let balanceWarning = '';
    if (hasWallet(settings)) {
      try {
        const balance = await client.getWalletBalance(settings.walletAccount);
        settings = await saveBalanceState(balance.data);
        client = new RonClient(settings);
      } catch (balanceError) {
        balanceWarning = ` Balance refresh failed; kept cached balance. ${formatError(balanceError)}`;
      }
    }

    renderPassportDrawer();
    showFooter(`Passport refreshed. Correlation: ${response.correlationId}.${balanceWarning}`);
  } catch (error) {
    els.drawerMessage.textContent = formatError(error);
  } finally {
    setBusy(false);
  }
}

async function refreshBalanceFromDrawer() {
  if (!hasWallet(settings)) {
    els.drawerMessage.textContent = 'No wallet account label is loaded.';
    return;
  }

  try {
    setBusy(true);
    await refreshBalanceAfterMutation();
    showFooter('Balance refreshed.');
  } catch (error) {
    els.drawerMessage.textContent = formatError(error);
  } finally {
    setBusy(false);
  }
}

async function refreshBalanceAfterMutation() {
  if (!hasWallet(settings)) {
    return;
  }

  const response = await client.getWalletBalance(settings.walletAccount);
  settings = await saveBalanceState(response.data);
  client = new RonClient(settings);
  renderPassportDrawer();
}

function setBusy(isBusy) {
  pageBusy = Boolean(isBusy);
  els.goButton.disabled = pageBusy;
  els.refreshButton.disabled = pageBusy;
  els.drawerCheckNodeButton.disabled = pageBusy;
  els.drawerRefreshIdentityButton.disabled = pageBusy;
  els.drawerRefreshBalanceButton.disabled = pageBusy;
  workflow.setBusyState(pageBusy);
  updateNavigationButtons();
}

function showFooter(message) {
  els.footerStatus.textContent = message || '';
}

async function copyText(value) {
  const clean = String(value || '').trim();

  if (!clean) {
    return;
  }

  await navigator.clipboard.writeText(clean);
  showFooter('Copied to clipboard.');
}

els.addressForm.addEventListener('submit', (event) => {
  event.preventDefault();
  navigateTo(els.addressInput.value);
});

els.backButton.addEventListener('click', () => {
  if (!pageBusy && navigationIndex > 0) {
    window.history.back();
  }
});

els.forwardButton.addEventListener('click', () => {
  if (!pageBusy && navigationIndex < navigationStack.length - 1) {
    window.history.forward();
  }
});

els.homeButton.addEventListener('click', () => {
  if (!pageBusy) {
    navigateTo(HOME_PAGE_URL);
  }
});

els.refreshButton.addEventListener('click', () => {
  navigateTo(currentParsed?.url || currentInput || els.addressInput.value, {
    replaceCurrent: true
  });
});

els.retryButton.addEventListener('click', () => {
  navigateTo(currentInput || els.addressInput.value, {
    replaceCurrent: true
  });
});

els.workflowForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (els.workflowForm.reportValidity()) {
    workflow.buildDraftPreview();
  }
});

els.sendPrepareButton.addEventListener('click', () => {
  if (els.workflowForm.reportValidity()) {
    workflow.sendPrepareRequest();
  }
});

els.clearDraftButton.addEventListener('click', () => {
  els.workflowForm.reset();
  workflow.resetDraftPreview({ clearFile: true });
  showFooter('Cleared local request draft.');
});

els.copyDraftButton.addEventListener('click', () => {
  workflow.copyDraft();
});

els.copyPrepareButton.addEventListener('click', () => {
  workflow.copyPrepare();
});

els.holdEscrowAccount.addEventListener('input', () => {
  workflow.rebuildHoldPreviewFromInputs();
});

els.holdNonce.addEventListener('input', () => {
  workflow.rebuildHoldPreviewFromInputs();
});

els.confirmHoldButton.addEventListener('click', () => {
  workflow.confirmWalletHold();
});

els.copyHoldButton.addEventListener('click', () => {
  workflow.copyHold();
});

els.submitProductButton.addEventListener('click', () => {
  workflow.submitProduct();
});

els.copySubmitButton.addEventListener('click', () => {
  workflow.copySubmit();
});

els.openReturnedPageButton.addEventListener('click', () => {
  workflow.openReturnedPage();
});

els.copyReturnedUrlButton.addEventListener('click', () => {
  workflow.copyReturnedUrl();
});

els.passportButton.addEventListener('click', () => {
  els.passportDrawer.classList.toggle('hidden');
  renderPassportDrawer();
});

els.closePassportButton.addEventListener('click', () => {
  els.passportDrawer.classList.add('hidden');
});

els.settingsButton.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

els.drawerCheckNodeButton.addEventListener('click', checkNodeFromDrawer);
els.drawerRefreshIdentityButton.addEventListener('click', refreshIdentityFromDrawer);
els.drawerRefreshBalanceButton.addEventListener('click', refreshBalanceFromDrawer);

els.copyUrlButton.addEventListener('click', () => copyText(els.copyUrlButton.dataset.copyValue));
els.copyJsonButton.addEventListener('click', () => copyText(els.copyJsonButton.dataset.copyValue));

for (const button of Array.from(document.querySelectorAll('[data-open-crab]'))) {
  button.addEventListener('click', () => {
    navigateTo(button.dataset.openCrab);
  });
}

window.addEventListener('popstate', (event) => {
  const url =
    event.state?.url || new URLSearchParams(window.location.search).get('url') || HOME_PAGE_URL;
  const nextIndex = Number(event.state?.navigationIndex);

  if (Number.isInteger(nextIndex) && nextIndex >= 0 && nextIndex < navigationStack.length) {
    navigationIndex = nextIndex;
  }

  navigateTo(url, { pushHistory: false });
});

load().catch((error) => {
  showError(error.message || 'Failed to load CrabLink page.');
});