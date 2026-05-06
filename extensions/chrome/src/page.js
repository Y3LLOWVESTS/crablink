/**
 * RO:WHAT — Full-tab CrabLink browser shell for rendering crab:// pages through svc-gateway.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; popup is a launcher, this page is the browser surface.
 * RO:INTERACTS — ronClient.js, storage.js, crab.js, page-workflow.js, svc-gateway /crab/resolve, /sites/:name, /b3/:hash.:kind.
 * RO:INVARIANTS — gateway-only; no private keys; wallet hold requires explicit user confirmation; no direct ledger/storage/index calls.
 * RO:METRICS — sends correlation IDs via ronClient.js.
 * RO:CONFIG — reads gateway URL, timeout, passport, wallet, username draft, and dev token from storage.js.
 * RO:SECURITY — does not execute backend-provided scripts or HTML; renders DTOs as text only; no silent ROC spend.
 * RO:TEST — scripts/check-chrome.sh; manual full-tab navigation, Passport drawer, prepare-route checks, explicit hold, and image upload confirmation.
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

const LOCAL_CREATOR_PAGES = new Set(['article', 'video', 'stream', 'podcast']);

const LOCAL_CREATOR_ROUTE_META = Object.freeze({
  article: {
    title: 'CrabLink Article Draft',
    localSchema: 'crablink.article.local_page.v1',
    description:
      'Local article draft and prepare scaffold. Publishing is intentionally disabled until RustyOnions exposes real .article routes.',
    warning: 'Backend article publishing routes may not be wired yet.',
    prepareRoute: '/assets/article/prepare',
    sectionId: 'articleDraftSection',
    bodyClass: 'crablink-article-draft-view-mode'
  },
  video: {
    title: 'CrabLink Video Draft',
    localSchema: 'crablink.video.local_page.v1',
    description:
      'Local video draft and prepare scaffold. Publishing is intentionally disabled until RustyOnions exposes real .video routes.',
    warning: 'Backend video publishing routes may not be wired yet.',
    prepareRoute: '/assets/video/prepare',
    sectionId: 'videoDraftSection',
    bodyClass: 'crablink-video-draft-view-mode'
  },
  stream: {
    title: 'CrabLink Stream Studio',
    localSchema: 'crablink.stream.local_page.v1',
    description:
      'Local stream studio scaffold. Starting a live stream is intentionally disabled until backend stream sessions are wired.',
    warning: 'Backend stream routes and ingest/session keys are not wired yet.',
    prepareRoute: '/streams/prepare',
    sectionId: 'streamDraftSection',
    bodyClass: 'crablink-stream-draft-view-mode'
  },
  podcast: {
    title: 'CrabLink Podcast Studio',
    localSchema: 'crablink.podcast.local_page.v1',
    description:
      'Local podcast studio scaffold for audio upload/live-audio planning. Publishing is intentionally disabled until backend podcast routes are wired.',
    warning: 'Backend podcast publishing and feed routes are not wired yet.',
    prepareRoute: '/podcasts/prepare',
    sectionId: 'podcastDraftSection',
    bodyClass: 'crablink-podcast-draft-view-mode'
  }
});

const LOCAL_CREATOR_SECTION_IDS = Object.freeze([
  'articleDraftSection',
  'videoDraftSection',
  'streamDraftSection',
  'podcastDraftSection'
]);

const LOCAL_CREATOR_BODY_CLASSES = Object.freeze([
  'crablink-article-draft-view-mode',
  'crablink-video-draft-view-mode',
  'crablink-stream-draft-view-mode',
  'crablink-podcast-draft-view-mode'
]);

const GENERIC_LOCAL_ROUTE_SECTION_IDS = Object.freeze([
  'workflowSection',
  'actionsSection',
  'fieldsSection',
  'warningsSection',
  'sitePageSection',
  'prepareSummary',
  'holdSection',
  'submitSection'
]);

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
  const initial = normalizeStartupUrl(urlParam || settings.lastCrabUrl || HOME_PAGE_URL);

  navigationStack = [initial];
  navigationIndex = 0;
  replaceBrowserState(initial, navigationIndex);
  updateNavigationButtons();

  els.addressInput.value = initial;
  await navigateTo(initial, { pushHistory: false });
}

async function navigateTo(input, options = {}) {
  const raw = normalizeStartupUrl(String(input || '').trim() || HOME_PAGE_URL);
  const parsed = parseBrowserInput(raw);
  const isLocalCreator = isLocalCreatorParsed(parsed);

  currentInput = raw;
  els.addressInput.value = parsed.url || raw;

  showLoading(
    isLocalCreator
      ? `Opening local ${parsed.url || raw} creator workspace...`
      : `Resolving ${raw} through ${settings.gatewayUrl}...`
  );
  setBusy(true);

  try {
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

function normalizeStartupUrl(value) {
  const raw = String(value || '').trim();
  const localRoute = localCreatorRouteFromValue(raw);

  if (localRoute) {
    return `crab://${localRoute}`;
  }

  return raw || HOME_PAGE_URL;
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

  const localRoute = localCreatorRouteFromValue(value);

  if (localRoute) {
    return {
      type: 'builtin',
      name: localRoute,
      url: `crab://${localRoute}`,
      display: `crab://${localRoute}`,
      localCreator: true
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
    const target = crabTargetFromValue(lower);

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
    const pageName = String(parsed.name || '').toLowerCase();

    if (LOCAL_CREATOR_PAGES.has(pageName)) {
      return makeLocalCreatorRouteResponse(parsed);
    }

    return client.resolveCrab(parsed.url);
  }

  if (parsed.type === 'asset') {
    return client.getB3Asset(parsed.hash, parsed.kind);
  }

  if (parsed.type === 'site') {
    const parsedName = String(parsed.name || '').toLowerCase();
    const localRoute = localCreatorRouteFromValue(parsed.url || parsed.name || '');

    if (localRoute || LOCAL_CREATOR_PAGES.has(parsedName)) {
      const pageName = localRoute || parsedName;

      return makeLocalCreatorRouteResponse({
        type: 'builtin',
        name: pageName,
        url: `crab://${pageName}`,
        display: `crab://${pageName}`,
        localCreator: true
      });
    }

    if (BUILT_IN_RON_PAGES.has(parsedName)) {
      return client.resolveCrab(`crab://${parsedName}`);
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

function makeLocalCreatorRouteResponse(parsed) {
  const pageKind = String(parsed?.name || '').toLowerCase();
  const url = `crab://${pageKind}`;
  const now = new Date().toISOString();
  const details = localCreatorRouteDetails(pageKind);

  return {
    ok: true,
    status: 200,
    route: 'local:crablink.creator-route',
    correlationId: `crablink-local-${Date.now().toString(36)}`,
    data: {
      schema: BUILTIN_PAGE_SCHEMA,
      local_schema: details.localSchema,
      draft_schema: details.localSchema,
      url,
      route: url,
      crab_url: url,
      slug: pageKind,
      page: pageKind,
      page_kind: pageKind,
      kind: pageKind,
      title: details.title,
      description: details.description,
      status: 'local_scaffold_not_published',
      requires_passport: true,
      requires_wallet: false,
      local_only: true,
      custom_local_renderer: true,
      updated_at: now,
      links: {
        crab: url,
        prepare: details.prepareRoute
      },
      warnings: [
        details.warning,
        'This is a local CrabLink creator workspace. No b3 CID was assigned, no ROC was charged, and no backend publication occurred.'
      ],
      actions: [],
      fields: [
        { label: 'Route mode', value: 'local_creator_scaffold' },
        { label: 'Surface', value: url },
        { label: 'Publication status', value: 'not published' },
        { label: 'Backend mutation', value: 'none' },
        { label: 'Wallet mutation', value: 'none' }
      ],
      truth_boundary: {
        backend_published: false,
        b3_content_id_assigned: false,
        manifest_cid_assigned: false,
        roc_charged: false,
        wallet_mutated: false,
        index_pointer_created: false
      },
      local_renderer: {
        owner: `page-${pageKind}-draft.js`,
        expected_section_id: details.sectionId,
        body_class: details.bodyClass,
        route_authority: 'address_bar_or_page_url'
      }
    }
  };
}

function localCreatorRouteDetails(pageKind) {
  return (
    LOCAL_CREATOR_ROUTE_META[pageKind] || {
      title: `CrabLink ${titleCase(pageKind)} Workspace`,
      localSchema: `crablink.${pageKind || 'unknown'}.local_page.v1`,
      description: 'Local CrabLink creator workspace.',
      warning: 'This local creator route is not backend-published yet.',
      prepareRoute: '',
      sectionId: '',
      bodyClass: ''
    }
  );
}

function titleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isLocalCreatorParsed(parsed) {
  const pageName = String(parsed?.name || '').toLowerCase();
  return parsed?.localCreator === true || LOCAL_CREATOR_PAGES.has(pageName);
}

function isLocalCreatorPayload(payload, parsed) {
  const pageName = localCreatorRouteFromValue(
    payload?.url ||
      payload?.route ||
      payload?.crab_url ||
      payload?.links?.crab ||
      parsed?.url ||
      parsed?.display ||
      parsed?.name ||
      ''
  );

  return Boolean(pageName && LOCAL_CREATOR_PAGES.has(pageName));
}

function localCreatorRouteFromValue(value) {
  const raw = String(value || '').trim().toLowerCase();

  if (!raw) {
    return '';
  }

  if (LOCAL_CREATOR_PAGES.has(raw)) {
    return raw;
  }

  if (!raw.startsWith('crab://')) {
    return '';
  }

  const target = crabTargetFromValue(raw);
  return LOCAL_CREATOR_PAGES.has(target) ? target : '';
}

function crabTargetFromValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .slice('crab://'.length)
    .replace(/^\/+/, '')
    .split(/[/?#]/)[0]
    .trim();
}

function enterLocalCreatorRoute(pageKind) {
  const route = String(pageKind || '').toLowerCase();
  const meta = localCreatorRouteDetails(route);

  if (!LOCAL_CREATOR_PAGES.has(route)) {
    return;
  }

  clearLocalCreatorBodyClasses(route);
  removeInactiveLocalCreatorSections(route);
  hideGenericLocalRouteSections();

  if (document.body) {
    document.body.dataset.crablinkLocalRoute = route;
    if (meta.bodyClass) {
      document.body.classList.add(meta.bodyClass);
    }
    document.body.classList.remove('crablink-profile-view-mode');
    document.body.classList.remove('crablink-site-full-view-mode');
  }

  document.dispatchEvent(
    new CustomEvent('crablink:local-route-mode', {
      detail: {
        route,
        url: `crab://${route}`,
        sectionId: meta.sectionId,
        bodyClass: meta.bodyClass
      }
    })
  );
}

function leaveLocalCreatorRoutes() {
  if (!document.body) {
    return;
  }

  for (const className of LOCAL_CREATOR_BODY_CLASSES) {
    document.body.classList.remove(className);
  }

  delete document.body.dataset.crablinkLocalRoute;
}

function clearLocalCreatorBodyClasses(activeRoute) {
  if (!document.body) {
    return;
  }

  const activeMeta = localCreatorRouteDetails(activeRoute);

  for (const className of LOCAL_CREATOR_BODY_CLASSES) {
    if (className !== activeMeta.bodyClass) {
      document.body.classList.remove(className);
    }
  }
}

function removeInactiveLocalCreatorSections(activeRoute) {
  const activeMeta = localCreatorRouteDetails(activeRoute);
  const activeSectionId = activeMeta.sectionId || '';

  for (const sectionId of LOCAL_CREATOR_SECTION_IDS) {
    if (sectionId === activeSectionId) {
      continue;
    }

    const section = document.getElementById(sectionId);
    if (section) {
      section.remove();
    }
  }
}

function hideGenericLocalRouteSections() {
  for (const sectionId of GENERIC_LOCAL_ROUTE_SECTION_IDS) {
    const section = document.getElementById(sectionId);
    if (!section) {
      continue;
    }

    section.classList.add('hidden');
    section.setAttribute('aria-hidden', 'true');
  }
}

function renderPage(parsed, response) {
  const payload = response?.data && typeof response.data === 'object' ? response.data : response;
  const isLocalCreator = isLocalCreatorPayload(payload, parsed);
  const localRoute = isLocalCreator
    ? localCreatorRouteFromValue(
        payload?.url ||
          payload?.route ||
          payload?.crab_url ||
          payload?.links?.crab ||
          parsed?.url ||
          parsed?.name ||
          ''
      )
    : '';

  hideAllPanels();
  els.pagePanel.classList.remove('hidden');

  els.developerDetails.open = false;
  els.developerJson.textContent = JSON.stringify(payload || {}, null, 2);

  if (isLocalCreator && localRoute) {
    enterLocalCreatorRoute(localRoute);
  } else {
    leaveLocalCreatorRoutes();
  }

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

  const isLocalCreator = isLocalCreatorPayload(payload, parsed);
  const localRoute = isLocalCreator
    ? localCreatorRouteFromValue(
        payload?.url ||
          payload?.route ||
          payload?.crab_url ||
          payload?.links?.crab ||
          parsed?.url ||
          parsed?.name ||
          ''
      )
    : '';

  if (isLocalCreator && localRoute) {
    enterLocalCreatorRoute(localRoute);
  }

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

  if (isLocalCreator) {
    workflow.clearWorkflow();
    hideGenericLocalRouteSections();
    renderActions([]);
    renderFields([]);
    renderWarnings(payload.warnings || []);
  } else {
    workflow.renderWorkflow(payload);
    renderActions(payload.actions || []);
    renderFields(payload.fields || []);
    renderWarnings(payload.warnings || []);
  }

  configureCopyButtons(payload.url || parsed.url, payload);
}

function renderAssetPage(parsed, response, payload) {
  workflow.clearWorkflow();
  hideSitePageSection();
  leaveLocalCreatorRoutes();

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
  leaveLocalCreatorRoutes();

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
      return [
        receipt.action || receipt.kind || `#${index + 1}`,
        [
          receipt.txid || receipt.tx_id || receipt.receipt_id || '',
          receipt.account || receipt.wallet_account || '',
          receipt.amount_minor || receipt.amountMinor || ''
        ]
          .filter(Boolean)
          .join(' / ')
      ];
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
  leaveLocalCreatorRoutes();

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
  const cleanUrl = normalizeStartupUrl(String(url || HOME_PAGE_URL).trim() || HOME_PAGE_URL);

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
  const cleanUrl = normalizeStartupUrl(String(url || HOME_PAGE_URL).trim() || HOME_PAGE_URL);
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
  const usernameRow = ensureDrawerUsernameRow();
  usernameRow.value.textContent = drawerUsernameHandle(settings);
  usernameRow.status.textContent = drawerUsernameStatus(settings);
  styleDrawerUsernameRow(usernameRow);

  els.drawerPassport.textContent = settings.passportSubject || 'not loaded';
  els.drawerGateway.textContent = settings.gatewayUrl || '—';
  els.drawerWallet.textContent = settings.walletAccount || 'not linked';
  els.drawerRoc.textContent = settings.rocBalanceDisplay || 'unknown';
  els.drawerLedger.textContent = settings.rocLedgerBacked ? 'ledger-backed' : 'display-only';

  reorderDrawerIdentityRows(usernameRow.row);

  if (settings.passportSubject) {
    const userText = drawerUsernameHandle(settings);
    const userStatus = drawerUsernameStatus(settings);
    const userSummary =
      userText && userText !== 'not requested'
        ? `${userText} (${userStatus})`
        : 'no username requested';

    els.drawerMessage.textContent = `${identitySummary(settings)} — ${userSummary} — ${balanceSummary(settings)}`;
  } else {
    els.drawerMessage.textContent = 'No passport loaded yet.';
  }

  renderTopBarState();
}

function ensureDrawerUsernameRow() {
  let row = document.getElementById('drawerUsernameRow');
  let label = document.getElementById('drawerUsernameLabel');
  let value = document.getElementById('drawerUsername');
  let status = document.getElementById('drawerUsernameStatus');

  if (!row) {
    row = document.createElement('div');
    row.id = 'drawerUsernameRow';
    row.className = 'drawer-username-row';
  }

  if (!label) {
    label = document.createElement('span');
    label.id = 'drawerUsernameLabel';
  }

  label.textContent = 'USERNAME';

  if (!value) {
    value = document.createElement('strong');
    value.id = 'drawerUsername';
    value.textContent = 'not requested';
  }

  if (!status) {
    status = document.createElement('em');
    status.id = 'drawerUsernameStatus';
    status.className = 'drawer-username-status';
    status.textContent = 'local only';
  }

  if (!row.contains(label)) {
    row.append(label);
  }

  if (!row.contains(value)) {
    row.append(value);
  }

  if (!row.contains(status)) {
    row.append(status);
  }

  reorderDrawerIdentityRows(row);

  return { row, label, value, status };
}

function reorderDrawerIdentityRows(usernameRow) {
  const gatewayCell = els.drawerGateway?.parentElement || null;
  const passportCell = els.drawerPassport?.parentElement || null;
  const walletCell = els.drawerWallet?.parentElement || null;
  const host =
    gatewayCell?.parentElement ||
    passportCell?.parentElement ||
    walletCell?.parentElement ||
    usernameRow?.parentElement ||
    els.passportDrawer;

  if (!host || !usernameRow) {
    return;
  }

  if (usernameRow.parentElement !== host) {
    host.insertBefore(usernameRow, gatewayCell || passportCell || walletCell || host.firstElementChild);
  }

  if (gatewayCell && usernameRow !== gatewayCell) {
    host.insertBefore(usernameRow, gatewayCell);
  } else if (host.firstElementChild !== usernameRow) {
    host.insertBefore(usernameRow, host.firstElementChild);
  }

  if (passportCell && gatewayCell && passportCell !== usernameRow && passportCell !== gatewayCell) {
    host.insertBefore(passportCell, gatewayCell);
  }
}

function styleDrawerUsernameRow(parts) {
  if (!parts?.row || !parts?.label || !parts?.value || !parts?.status) {
    return;
  }

  parts.row.style.borderColor = 'rgba(34, 197, 94, 0.52)';
  parts.row.style.background =
    'linear-gradient(180deg, rgba(34, 197, 94, 0.08), rgba(8, 17, 34, 0.78))';

  parts.label.style.color = 'var(--muted, #a9b6cc)';
  parts.label.style.fontStyle = 'normal';
  parts.label.style.fontWeight = '900';
  parts.label.style.letterSpacing = '0.04em';
  parts.label.style.textTransform = 'uppercase';

  parts.value.style.color = 'var(--good, #86efac)';
  parts.value.style.fontWeight = '950';

  parts.status.style.display = 'block';
  parts.status.style.marginTop = '4px';
  parts.status.style.color = '#d1fae5';
  parts.status.style.fontStyle = 'italic';
  parts.status.style.fontWeight = '800';
}

function drawerUsernameHandle(nextSettings) {
  const handle = cleanUsernameHandle(
    nextSettings?.handle ||
      nextSettings?.requestedHandle ||
      nextSettings?.username ||
      nextSettings?.requestedUsername ||
      ''
  );

  return handle || 'not requested';
}

function drawerUsernameStatus(nextSettings) {
  const status = String(nextSettings?.usernameStatus || '').trim();

  if (nextSettings?.handle && status === 'confirmed') {
    return 'confirmed by backend';
  }

  if (nextSettings?.handle) {
    return status ? `${status} from backend` : 'backend status unknown';
  }

  if (nextSettings?.requestedHandle || nextSettings?.requestedUsername) {
    if (status === 'requested') {
      return 'requested; awaiting backend confirmation';
    }

    if (status === 'local_draft') {
      return 'local draft; not backend confirmed';
    }

    return status ? `${status}; not backend confirmed` : 'pending backend confirmation';
  }

  return 'none';
}

function cleanUsernameHandle(value) {
  const raw = String(value || '').trim().toLowerCase();

  if (!raw) {
    return '';
  }

  if (raw.startsWith('@')) {
    return raw;
  }

  if (/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(raw)) {
    return `@${raw}`;
  }

  return raw;
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