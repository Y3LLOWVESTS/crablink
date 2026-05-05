/**
 * RO:WHAT — Makes named crab:// site pages render as full-page sandboxed websites with RON image references.
 * RO:WHY — NEXT_LEVEL product polish; Concerns: DX/SEC; sites should render b3-backed referenced assets without owning bytes.
 * RO:INTERACTS — page-product-preview.js source loader, storage.js, page.html, svc-gateway /o raw object reads.
 * RO:INVARIANTS — gateway-only; no backend mutation; no direct storage/index/ledger calls; site HTML only renders in sandboxed iframe.
 * RO:METRICS — none; embedded image bytes are fetched through svc-gateway and backend service metrics.
 * RO:CONFIG — reads gateway URL/dev auth/passport/wallet labels from storage.js for gateway reads only.
 * RO:SECURITY — iframe sandbox disables scripts/forms/plugins; injected CSP blocks external fetch/connect/form actions; crab-image only supports crab://<hash>.image.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual new-site smoke with <crab-image>.
 */

import { getSettings } from './storage.js';

const SITE_SCHEMA = 'omnigate.site-page.v1';

const STYLE_ID = 'crablinkSiteRenderModeStyles';
const VIEWPORT_ID = 'crablinkSiteViewport';
const FRAME_ID = 'crablinkSiteFullFrame';
const DETAILS_ID = 'crablinkSiteProofDetails';
const SOURCE_ID = 'crablinkSiteSourceProof';
const STATUS_ID = 'crablinkSiteViewportStatus';
const CREATOR_HANDLE_ID = 'crablinkSiteCreatorHandle';

const WEBSITE_MODE_CLASS = 'crablink-site-full-view-mode';
const IMAGE_EMBED_SELECTOR = 'crab-image[src], img[data-crab-src]';
const MAX_EMBED_BYTES = 12 * 1024 * 1024;

let scheduled = 0;
let enhancing = false;
let lastPageSignature = '';
let embedRun = 0;
const embedObjectUrls = new Set();
const embedBlobCache = new Map();

function boot() {
  installStyles();
  scheduleEnhance();

  const root = document.getElementById('pagePanel') || document.body || document.documentElement;
  if (!root) return;

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true
  });

  window.addEventListener('resize', () => {
    const frame = document.getElementById(FRAME_ID);
    if (frame) sizeSiteFrame(frame, { force: true });
  });
}

function scheduleEnhance() {
  window.clearTimeout(scheduled);
  scheduled = window.setTimeout(enhanceSiteView, 90);
}

function enhanceSiteView() {
  if (enhancing) return;

  const payload = readPayload();

  if (!payload || payload.schema !== SITE_SCHEMA) {
    cleanupSiteView();
    return;
  }

  const legacyRootCard = document.querySelector('#sitePageCards .site-root-preview-card');
  const sourceEl = legacyRootCard?.querySelector('.site-root-source');

  if (!legacyRootCard || !sourceEl) {
    cleanupSiteView();
    return;
  }

  enhancing = true;

  try {
    document.body?.classList.add(WEBSITE_MODE_CLASS);

    const pageSignature = JSON.stringify({
      schema: payload.schema,
      site: siteUrl(payload),
      root: rootCid(payload),
      manifest: manifestCid(payload)
    });

    const viewport = ensureViewport(payload);

    if (pageSignature !== lastPageSignature) {
      lastPageSignature = pageSignature;
      resetFrame(viewport);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }

    updateViewportText(viewport, payload);
    updateDetails(viewport, payload, sourceEl);
    renderWhenSourceReady(viewport, payload, sourceEl);
  } finally {
    enhancing = false;
  }
}

function cleanupSiteView() {
  const viewport = document.getElementById(VIEWPORT_ID);

  if (viewport) {
    viewport.remove();
  }

  document.body?.classList.remove(WEBSITE_MODE_CLASS);
  releaseEmbedObjectUrls();
  lastPageSignature = '';
}

function ensureViewport(payload) {
  let viewport = document.getElementById(VIEWPORT_ID);
  if (viewport) return viewport;

  viewport = document.createElement('section');
  viewport.id = VIEWPORT_ID;
  viewport.className = 'site-viewport';

  const toolbar = document.createElement('header');
  toolbar.className = 'site-viewport-toolbar';

  const identity = document.createElement('div');
  identity.className = 'site-viewport-identity';

  const label = document.createElement('span');
  label.className = 'site-viewport-label';
  label.textContent = 'crab site';

  const title = document.createElement('h2');
  title.id = 'crablinkSiteViewportTitle';
  title.textContent = siteTitle(payload);

  const meta = document.createElement('p');
  meta.id = 'crablinkSiteViewportMeta';
  meta.textContent = `${siteUrl(payload)} • root ${shortCid(rootCid(payload))}`;

  identity.append(label, title, meta);

  const actions = document.createElement('div');
  actions.className = 'site-viewport-actions';

  const creator = document.createElement('span');
  creator.className = 'site-creator-chip';

  const creatorLabel = document.createElement('span');
  creatorLabel.className = 'site-creator-label';
  creatorLabel.textContent = 'site creator:';

  const creatorButton = document.createElement('button');
  creatorButton.id = CREATOR_HANDLE_ID;
  creatorButton.type = 'button';
  creatorButton.className = 'site-creator-link';
  creatorButton.textContent = creatorHandle(payload);
  creatorButton.title = "Open this creator's future read-only passport/profile manifest.";
  creatorButton.addEventListener('click', () => openCreatorProfile(readPayload() || payload));

  creator.append(creatorLabel, creatorButton);

  const manifestButton = actionButton('Site Manifest');
  manifestButton.addEventListener('click', () => toggleManifest(viewport));

  actions.append(creator, manifestButton);
  toolbar.append(identity, actions);

  const status = document.createElement('p');
  status.id = STATUS_ID;
  status.className = 'site-viewport-status';
  status.textContent = 'Loading site…';

  const frameWrap = document.createElement('div');
  frameWrap.className = 'site-frame-wrap';

  const frame = document.createElement('iframe');
  frame.id = FRAME_ID;
  frame.className = 'site-full-frame site-frame-loading';
  frame.title = 'Sandboxed CrabLink site renderer';
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.setAttribute('referrerpolicy', 'no-referrer');
  frame.setAttribute('aria-label', 'Sandboxed RON site');
  frame.setAttribute('scrolling', 'no');

  frame.addEventListener('load', () => {
    try {
      frame.contentWindow?.scrollTo(0, 0);
    } catch {
      // Best-effort only.
    }

    sizeSiteFrame(frame, { force: true });
    window.setTimeout(() => sizeSiteFrame(frame, { force: true }), 180);

    hydrateCrabImageEmbeds(frame).catch((error) => {
      setStatus(`Site loaded; image embed failed: ${error.message || error}`);
      sizeSiteFrame(frame, { force: true });
    });
  });

  frameWrap.append(frame);

  const proof = document.createElement('details');
  proof.id = DETAILS_ID;
  proof.className = 'site-proof-details';

  const summary = document.createElement('summary');
  summary.textContent = 'Site manifest / proof';

  const proofGrid = document.createElement('div');
  proofGrid.id = 'crablinkSiteProofGrid';
  proofGrid.className = 'site-proof-grid';

  const sourcePre = document.createElement('pre');
  sourcePre.id = SOURCE_ID;
  sourcePre.className = 'site-source-proof hidden';
  sourcePre.textContent = 'Root source not loaded yet.';

  const sourceToggle = actionButton('Show root source');
  sourceToggle.className = 'site-source-toggle secondary';
  sourceToggle.addEventListener('click', () => toggleSource(viewport));

  proof.append(summary, proofGrid, sourceToggle, sourcePre);
  viewport.append(toolbar, status, frameWrap, proof);

  const pagePanel = document.getElementById('pagePanel');
  if (pagePanel?.firstChild) {
    pagePanel.insertBefore(viewport, pagePanel.firstChild);
  } else {
    pagePanel?.append(viewport);
  }

  return viewport;
}

function updateViewportText(viewport, payload) {
  const title = viewport.querySelector('#crablinkSiteViewportTitle');
  if (title) title.textContent = siteTitle(payload);

  const meta = viewport.querySelector('#crablinkSiteViewportMeta');
  if (meta) meta.textContent = `${siteUrl(payload)} • root ${shortCid(rootCid(payload))}`;

  const creator = viewport.querySelector(`#${CREATOR_HANDLE_ID}`);
  if (creator) {
    creator.textContent = creatorHandle(payload);
    creator.setAttribute('data-crab-profile-url', creatorProfileCrabUrl(payload));
  }

  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = siteTitle(payload);

  const pageDescription = document.getElementById('pageDescription');
  if (pageDescription) pageDescription.textContent = siteDescription(payload);

  const pageBadge = document.getElementById('pageBadge');
  if (pageBadge) pageBadge.textContent = 'site';
}

function updateDetails(viewport, payload, sourceEl) {
  const grid = viewport.querySelector('#crablinkSiteProofGrid');
  const sourcePre = viewport.querySelector(`#${SOURCE_ID}`);
  if (!grid || !sourcePre) return;

  replaceChildren(
    grid,
    proofCard('Crab URL', siteUrl(payload)),
    proofCard('Site creator', creatorHandle(payload)),
    proofCard('Site name', payload.site_name || payload.name || 'not declared'),
    proofCard('Root document CID', rootCid(payload)),
    proofCard('Manifest CID', manifestCid(payload)),
    proofCard('Manifest status', manifestStatus(payload)),
    proofCard('Owner passport', ownerPassport(payload)),
    proofCard('Owner wallet', payload.owner?.wallet_account || payload.owner_wallet_account || 'not declared'),
    proofCard('Payout action', payload.payout?.default_action || payload.payout_action || 'not declared'),
    proofCard('Payout account', payload.payout?.recipient_account || payload.payout_account || 'not declared'),
    proofCard('Routes', routeCount(payload)),
    proofCard('Assets', assetCount(payload)),
    proofCard('Receipts', receiptCount(payload))
  );

  const source = clean(sourceEl.textContent);
  sourcePre.textContent = source || 'Root source not loaded yet.';
}

function renderWhenSourceReady(viewport, payload, sourceEl) {
  const frame = viewport.querySelector(`#${FRAME_ID}`);
  const source = clean(sourceEl.textContent);
  if (!frame) return;

  if (!isRenderableSource(source)) {
    frame.removeAttribute('srcdoc');
    frame.removeAttribute('data-source-signature');
    frame.classList.add('site-frame-loading');
    sizeSiteFrame(frame, { force: true });
    setStatus('Loading site…');
    return;
  }

  const signature = sourceFingerprint(source, payload);
  if (frame.getAttribute('data-source-signature') === signature) {
    sizeSiteFrame(frame);
    return;
  }

  releaseEmbedObjectUrls();
  frame.setAttribute('data-source-signature', signature);
  frame.classList.add('site-frame-loading');
  frame.srcdoc = sandboxDocument(source, payload);
  setStatus('Rendering site…');
  sizeSiteFrame(frame, { force: true });
}

function sandboxDocument(source, payload) {
  const title = escapeHtml(siteTitle(payload));
  const csp = [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "script-src 'none'",
    "connect-src 'none'",
    "img-src data: blob:",
    "style-src 'unsafe-inline'"
  ].join('; ');

  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">`;
  const viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1">';
  const charsetMeta = '<meta charset="utf-8">';
  const fitStyle = [
    '<style id="crablink-sandbox-fit">',
    'html { min-height: 100%; width: 100%; margin: 0; }',
    'body { min-height: 100%; width: 100%; margin: 0; }',
    'crab-image { display: block; min-height: 88px; margin: 16px 0; padding: 16px; border: 1px dashed rgba(148, 163, 184, 0.55); border-radius: 14px; color: #94a3b8; background: rgba(15, 23, 42, 0.08); }',
    'crab-image:empty::before { content: "Loading b3 image reference…"; }',
    'img.crab-embedded-image { display: block; max-width: 100%; height: auto; }',
    '.crab-image-error { display: block; margin: 16px 0; padding: 14px; border: 1px solid rgba(248, 113, 113, 0.45); border-radius: 14px; color: #991b1b; background: rgba(254, 226, 226, 0.82); font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }',
    '</style>'
  ].join('\n');

  if (/<head\b[^>]*>/i.test(source)) {
    return source.replace(
      /<head\b([^>]*)>/i,
      `<head$1>\n${charsetMeta}\n${viewportMeta}\n${cspMeta}\n<title>${title}</title>\n${fitStyle}`
    );
  }

  if (/<html\b[^>]*>/i.test(source)) {
    return source.replace(
      /<html\b([^>]*)>/i,
      `<html$1>\n<head>\n${charsetMeta}\n${viewportMeta}\n${cspMeta}\n<title>${title}</title>\n${fitStyle}\n</head>`
    );
  }

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    charsetMeta,
    viewportMeta,
    cspMeta,
    `<title>${title}</title>`,
    fitStyle,
    '</head>',
    '<body>',
    source,
    '</body>',
    '</html>'
  ].join('\n');
}

function toggleManifest(viewport) {
  const details = viewport.querySelector(`#${DETAILS_ID}`);
  if (!details) return;

  details.open = !details.open;
  setStatus(details.open ? 'Showing site manifest proof.' : 'Site loaded.');
}

function toggleSource(viewport) {
  const source = viewport.querySelector(`#${SOURCE_ID}`);
  const toggle = viewport.querySelector('.site-source-toggle');
  if (!source) return;

  const hidden = source.classList.toggle('hidden');
  if (toggle) toggle.textContent = hidden ? 'Show root source' : 'Hide root source';
}

function openCreatorProfile(payload) {
  const target = creatorProfileCrabUrl(payload);

  if (!target) {
    setStatus('Read-only passport/profile pages are planned for the next identity batch.');
    return;
  }

  const input = document.getElementById('addressInput');
  const form = document.getElementById('addressForm');

  if (input && form) {
    input.value = target;
    setStatus(`Opening creator profile ${target}…`);

    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
      return;
    }

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
}

function resetFrame(viewport) {
  const frame = viewport.querySelector(`#${FRAME_ID}`);
  if (!frame) return;

  releaseEmbedObjectUrls();
  frame.removeAttribute('data-source-signature');
  frame.removeAttribute('srcdoc');
  frame.style.height = '';
  frame.classList.add('site-frame-loading');
  sizeSiteFrame(frame, { force: true });
}

function sizeSiteFrame(frame, options = {}) {
  if (!frame) return;

  const force = Boolean(options.force);
  const fallbackHeight = safeViewportHeight();
  const key = `${frame.getAttribute('data-source-signature') || 'loading'}|${window.innerWidth}|${window.innerHeight}`;

  if (!force && frame.getAttribute('data-size-key') === key) return;

  frame.setAttribute('data-size-key', key);
  frame.style.height = `${fallbackHeight}px`;

  if (!frame.srcdoc) return;

  window.requestAnimationFrame(() => {
    let measured = fallbackHeight;

    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      const body = doc?.body;
      const html = doc?.documentElement;

      measured = Math.max(
        body?.scrollHeight || 0,
        body?.offsetHeight || 0,
        html?.scrollHeight || 0,
        html?.offsetHeight || 0,
        fallbackHeight
      );
    } catch {
      measured = fallbackHeight;
    }

    const maxReasonableHeight = Math.max(fallbackHeight, Math.min(window.innerHeight * 3, 3200));
    frame.style.height = `${Math.min(Math.max(measured + 8, fallbackHeight), maxReasonableHeight)}px`;
  });
}

async function hydrateCrabImageEmbeds(frame) {
  const runId = embedRun;

  let doc = null;
  try {
    doc = frame.contentDocument || frame.contentWindow?.document || null;
  } catch {
    doc = null;
  }

  if (!doc) return;

  const nodes = Array.from(doc.querySelectorAll(IMAGE_EMBED_SELECTOR));
  if (nodes.length === 0) {
    frame.classList.remove('site-frame-loading');
    setStatus('Site loaded.');
    sizeSiteFrame(frame, { force: true });
    return;
  }

  let ok = 0;
  let failed = 0;

  for (const node of nodes) {
    if (runId !== embedRun) return;

    try {
      await hydrateOneCrabImage(node);
      ok += 1;
    } catch (error) {
      failed += 1;
      replaceWithImageError(node, error.message || String(error));
    }

    sizeSiteFrame(frame, { force: true });
  }

  frame.classList.remove('site-frame-loading');

  if (failed > 0) {
    setStatus(`Site loaded with ${ok} b3 image embed${ok === 1 ? '' : 's'} and ${failed} failed embed${failed === 1 ? '' : 's'}.`);
  } else {
    setStatus(`Site loaded with ${ok} b3 image embed${ok === 1 ? '' : 's'}.`);
  }

  sizeSiteFrame(frame, { force: true });
}

async function hydrateOneCrabImage(node) {
  const ref = parseCrabImageRef(node);
  const objectUrl = await fetchCrabImageObjectUrl(ref);

  const img = node.ownerDocument.createElement('img');
  img.className = 'crab-embedded-image';
  img.alt = node.getAttribute('alt') || node.getAttribute('data-alt') || 'RON b3 image asset';
  img.src = objectUrl;
  img.decoding = 'async';
  img.loading = 'lazy';
  img.addEventListener('load', () => {
    const frame = document.getElementById(FRAME_ID);
    if (frame) sizeSiteFrame(frame, { force: true });
  });

  if (node.tagName.toLowerCase() === 'img') {
    node.src = objectUrl;
    node.classList.add('crab-embedded-image');
    node.removeAttribute('data-crab-src');
    return;
  }

  node.replaceWith(img);
}

function parseCrabImageRef(node) {
  const raw = clean(node.getAttribute('src') || node.getAttribute('data-crab-src'));
  const match = raw.match(/^crab:\/\/([0-9a-f]{64})\.image$/);

  if (!match) {
    throw new Error('Only crab://<64 lowercase hex>.image references are supported in this beta renderer.');
  }

  return {
    url: raw,
    hash: match[1]
  };
}

async function fetchCrabImageObjectUrl(ref) {
  if (embedBlobCache.has(ref.hash)) {
    return embedBlobCache.get(ref.hash);
  }

  const settings = await getSettings();
  const base = String(settings.gatewayUrl || 'http://127.0.0.1:8090').replace(/\/+$/, '');
  const rawPath = `/o/b3:${ref.hash}`;
  const response = await fetch(`${base}${rawPath}`, {
    method: 'GET',
    headers: gatewayHeaders(settings),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while loading ${ref.url}`);
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_EMBED_BYTES) {
    throw new Error(`Image embed exceeds ${MAX_EMBED_BYTES} byte beta cap.`);
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  const blob = new Blob([bytes], { type: contentType });
  const objectUrl = URL.createObjectURL(blob);

  embedObjectUrls.add(objectUrl);
  embedBlobCache.set(ref.hash, objectUrl);

  return objectUrl;
}

function gatewayHeaders(settings) {
  const headers = {};

  if (settings.authToken) {
    headers.Authorization = `Bearer ${settings.authToken}`;
  }

  if (settings.passportSubject) {
    headers['x-ron-passport'] = settings.passportSubject;
  }

  if (settings.walletAccount) {
    headers['x-ron-wallet-account'] = settings.walletAccount;
  }

  headers['x-crablink-client'] = 'chrome-extension-site-renderer';

  return headers;
}

function replaceWithImageError(node, message) {
  const error = node.ownerDocument.createElement('div');
  error.className = 'crab-image-error';
  error.textContent = `Unable to load crab image: ${message}`;
  node.replaceWith(error);
}

function setStatus(message) {
  const status = document.getElementById(STATUS_ID);
  if (status) status.textContent = message;

  const footer = document.getElementById('footerStatus');
  if (footer) footer.textContent = message;
}

function safeViewportHeight() {
  const topbar = document.querySelector('.browser-topbar')?.getBoundingClientRect().height || 74;
  const toolbar = document.querySelector('.site-viewport-toolbar')?.getBoundingClientRect().height || 64;
  return Math.max(640, Math.floor(window.innerHeight - topbar - toolbar));
}

function releaseEmbedObjectUrls() {
  for (const objectUrl of embedObjectUrls) {
    try {
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Best-effort cleanup only.
    }
  }

  embedObjectUrls.clear();
  embedBlobCache.clear();
  embedRun += 1;
}

function proofCard(label, value) {
  const card = document.createElement('article');
  card.className = 'site-proof-card';

  const term = document.createElement('span');
  term.textContent = label;

  const body = document.createElement('strong');
  body.textContent = clean(value) || '—';

  card.append(term, body);
  return card;
}

function actionButton(label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.textContent = label;
  return button;
}

function replaceChildren(node, ...children) {
  node.textContent = '';
  node.append(...children);
}

function readPayload() {
  const raw = clean(document.getElementById('developerJson')?.textContent || '');
  if (!raw || raw === '{}') return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRenderableSource(source) {
  if (!source) return false;

  const lowered = source.toLowerCase();
  return !(
    lowered.startsWith('loading root') ||
    lowered.includes('unable to load root document source') ||
    lowered.includes('failed to load root source') ||
    lowered.includes('no root document route available') ||
    lowered.includes('root source not loaded')
  );
}

function sourceFingerprint(source, payload) {
  const root = rootCid(payload);
  const manifest = manifestCid(payload);
  return `${root}|${manifest}|${source.length}|${source.slice(0, 80)}|${source.slice(-80)}`;
}

function siteTitle(payload) {
  return clean(payload.metadata?.title || payload.title || payload.site_name || payload.name || 'RON Site');
}

function siteDescription(payload) {
  return clean(payload.metadata?.description || payload.description || 'Manifest-backed RustyOnions site.');
}

function siteUrl(payload) {
  return clean(
    payload.links?.crab ||
      payload.crab_url ||
      (payload.site_name ? `crab://${payload.site_name}` : payload.name ? `crab://${payload.name}` : 'crab://site')
  );
}

function rootCid(payload) {
  return clean(
    payload.root_document_cid ||
      payload.rootDocumentCid ||
      payload.manifest?.root_document_cid ||
      payload.route_map?.['/'] ||
      payload.routes?.['/'] ||
      ''
  );
}

function manifestCid(payload) {
  return clean(payload.manifest?.manifest_cid || payload.manifest_cid || '');
}

function manifestStatus(payload) {
  const status = payload.manifest?.status || payload.manifest_status || 'unknown';
  const hydration = payload.manifest?.hydration_status || payload.hydration_status || '';
  return hydration ? `${status} / ${hydration}` : status;
}

function ownerPassport(payload) {
  return clean(payload.owner?.passport_subject || payload.owner_passport_subject || '');
}

function routeCount(payload) {
  const routes = payload.route_map || payload.routes || {};
  return String(Object.keys(routes).length);
}

function assetCount(payload) {
  const assets = payload.asset_map || payload.assets || {};
  return String(Object.keys(assets).length);
}

function receiptCount(payload) {
  const receipts = payload.receipts || payload.storage_receipts || [];
  return Array.isArray(receipts) ? String(receipts.length) : '0';
}

function creatorHandle(payload) {
  const raw = clean(
    payload.creator?.username ||
      payload.creator?.handle ||
      payload.owner?.username ||
      payload.owner?.handle ||
      payload.passport?.username ||
      payload.passport?.handle ||
      payload.public_profile?.username ||
      payload.public_profile?.handle ||
      payload.publicProfile?.username ||
      payload.publicProfile?.handle ||
      payload.owner_username ||
      payload.owner_handle ||
      payload.creator_username ||
      payload.creator_handle ||
      ''
  );

  return normalizeHandle(raw || '@username');
}

function creatorProfileCrabUrl(payload) {
  const explicit = clean(
    payload.creator?.crab_url ||
      payload.creator?.crabUrl ||
      payload.creator?.profile_crab_url ||
      payload.creator?.profileCrabUrl ||
      payload.owner?.crab_url ||
      payload.owner?.crabUrl ||
      payload.owner?.profile_crab_url ||
      payload.owner?.profileCrabUrl ||
      payload.passport?.profile_crab_url ||
      payload.passport?.profileCrabUrl ||
      payload.public_profile?.crab_url ||
      payload.public_profile?.crabUrl ||
      payload.publicProfile?.crabUrl ||
      payload.creator_crab_url ||
      payload.creator_profile_crab_url ||
      payload.owner_crab_url ||
      payload.owner_profile_crab_url ||
      ''
  );

  if (explicit) return explicit;

  const handle = creatorHandle(payload);
  if (!handle || handle === '@username') return '';

  return `crab://${handle}`;
}

function normalizeHandle(value) {
  const raw = clean(value).replace(/^@+/, '');
  if (!raw || raw === 'username') return '@username';
  if (raw.startsWith('passport:')) return '@username';

  const safe = raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');

  return safe ? `@${safe}` : '@username';
}

function shortCid(value) {
  const raw = clean(value);
  if (!raw) return 'unknown';
  if (raw.length <= 18) return raw;
  return `${raw.slice(0, 12)}…${raw.slice(-8)}`;
}

function clean(value) {
  return String(value ?? '').trim();
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body.crablink-site-full-view-mode .browser-main {
      align-items: stretch !important;
      width: 100vw !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    body.crablink-site-full-view-mode .quick-nav {
      display: none !important;
    }

    body.crablink-site-full-view-mode #pagePanel {
      width: 100vw !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    body.crablink-site-full-view-mode #pagePanel > :not(#${VIEWPORT_ID}):not(.developer-details) {
      display: none !important;
    }

    body.crablink-site-full-view-mode #developerDetails {
      width: 100vw !important;
      max-width: none !important;
      margin: 0 !important;
      border-radius: 0 !important;
    }

    .site-viewport {
      width: 100vw;
      max-width: none;
      min-width: 0;
      margin: 0;
      border: 0;
      border-radius: 0;
      overflow: hidden;
      background: rgba(15, 23, 42, 0.72);
      box-shadow: none;
    }

    .site-viewport-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 14px 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.20);
      background: rgba(15, 23, 42, 0.82);
    }

    .site-viewport-identity {
      display: grid;
      gap: 5px;
      min-width: 0;
    }

    .site-viewport-label {
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 900;
      text-transform: lowercase;
      letter-spacing: 0.02em;
    }

    .site-viewport-identity h2 {
      margin: 0;
      color: #f8fafc;
      font-size: 18px;
      line-height: 1.2;
    }

    .site-viewport-identity p,
    .site-viewport-status {
      margin: 0;
      color: #dbeafe;
      font-size: 13px;
      line-height: 1.45;
    }

    .site-viewport-actions {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;
    }

    .site-creator-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 34px;
      padding: 0 10px;
      border-radius: 14px;
      color: #dbeafe;
      background: rgba(15, 23, 42, 0.48);
      white-space: nowrap;
    }

    .site-creator-label {
      color: #e2e8f0;
      font-size: 12px;
      font-weight: 800;
    }

    .site-creator-link {
      min-height: 30px;
      padding: 0 10px;
      border: 0;
      border-radius: 12px;
      color: #fff;
      background: #3b82f6;
      font-size: 12px;
      font-weight: 950;
      cursor: pointer;
    }

    .site-creator-link:hover {
      filter: brightness(1.08);
    }

    .site-viewport-status {
      padding: 12px 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.20);
      background: rgba(15, 23, 42, 0.72);
    }

    .site-frame-wrap {
      width: 100vw;
      max-width: none;
      background: #020617;
    }

    .site-full-frame {
      display: block;
      width: 100vw;
      max-width: none;
      min-height: 640px;
      border: 0;
      background: #fff;
    }

    .site-frame-loading {
      background:
        radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.25), transparent 34%),
        linear-gradient(135deg, #020617, #0f172a);
    }

    .site-proof-details {
      padding: 0 20px 16px;
      border-top: 1px solid rgba(148, 163, 184, 0.22);
      background: rgba(15, 23, 42, 0.82);
    }

    .site-proof-details summary {
      cursor: pointer;
      padding: 12px 0;
      color: #e5edff;
      font-size: 13px;
      font-weight: 900;
    }

    .site-proof-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }

    .site-proof-card {
      display: grid;
      gap: 6px;
      min-width: 0;
      padding: 12px;
      border: 1px solid rgba(148, 163, 184, 0.20);
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.66);
    }

    .site-proof-card span {
      color: #a7b4cb;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .site-proof-card strong {
      min-width: 0;
      overflow-wrap: anywhere;
      color: #f8fafc;
      font-size: 12px;
      line-height: 1.4;
    }

    .site-source-toggle {
      margin-bottom: 10px;
    }

    .site-source-proof {
      max-height: 360px;
      overflow: auto;
      padding: 14px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 14px;
      color: #dbeafe;
      background: #020617;
      white-space: pre-wrap;
    }

    .site-source-proof.hidden {
      display: none !important;
    }

    @media (max-width: 980px) {
      .site-viewport-toolbar {
        align-items: flex-start;
        flex-direction: column;
      }

      .site-viewport-actions {
        justify-content: flex-start;
      }
    }
  `;

  document.head.append(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}