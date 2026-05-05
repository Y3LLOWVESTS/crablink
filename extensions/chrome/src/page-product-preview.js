/**
 * RO:WHAT — Enhances hydrated asset/site pages with safe previews and readable manifest metadata.
 * RO:WHY — NEXT_LEVEL product polish; Concerns: DX/SEC; make b3-backed pages usable without expanding backend scope.
 * RO:INTERACTS — page.html, page.js rendered DTOs, svc-gateway /o/<cid> raw-object routes.
 * RO:INVARIANTS — gateway-only; no direct storage/index/ledger calls; no extension innerHTML; image/site previews are read-only byte fetches.
 * RO:METRICS — none; backend /o fetches still carry normal gateway/service metrics.
 * RO:CONFIG — reads gatewayUrl from storage.js settings.
 * RO:SECURITY — image preview uses <img>; site source preview is text; rendered site preview uses sandboxed iframe with restrictive CSP and scripts disabled.
 * RO:TEST — scripts/check-chrome.sh; manual crab://<hash>.image preview and crab://<site> root preview.
 */

import { getSettings } from './storage.js';

const ASSET_SCHEMA = 'omnigate.asset-page.v1';
const SITE_SCHEMA = 'omnigate.site-page.v1';
const ENHANCER_ID = 'productPreviewEnhancer';
const STYLE_ID = 'crablinkProductPreviewStyles';
const MAX_SITE_ROOT_PREVIEW_BYTES = 128 * 1024;

let scheduled = 0;
let lastSignature = '';

function boot() {
  installPreviewStyles();

  const developerJson = document.getElementById('developerJson');

  if (!developerJson) {
    return;
  }

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(developerJson, {
    childList: true,
    characterData: true,
    subtree: true
  });

  scheduleEnhance();
}

function scheduleEnhance() {
  window.clearTimeout(scheduled);
  scheduled = window.setTimeout(enhanceFromDeveloperJson, 35);
}

async function enhanceFromDeveloperJson() {
  const payload = readPayload();

  if (!payload || typeof payload !== 'object') {
    clearEnhancer();
    lastSignature = '';
    return;
  }

  const schema = payload.schema || payload.type || '';
  const signature = JSON.stringify({
    schema,
    asset: payload.asset_cid || payload.content_id || '',
    site: payload.site_name || payload.name || '',
    root: payload.root_document_cid || payload.route_map?.['/'] || '',
    manifest: payload.manifest?.manifest_cid || payload.manifest_cid || ''
  });

  if (signature === lastSignature && document.getElementById(ENHANCER_ID)) {
    return;
  }

  lastSignature = signature;

  if (schema === ASSET_SCHEMA) {
    const settings = await getSettings();
    renderAssetEnhancement(payload, settings);
    return;
  }

  if (schema === SITE_SCHEMA) {
    const settings = await getSettings();
    renderSiteEnhancement(payload, settings);
    return;
  }

  clearEnhancer();
}

function readPayload() {
  const developerJson = document.getElementById('developerJson');
  const raw = String(developerJson?.textContent || '').trim();

  if (!raw || raw === '{}') {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function renderAssetEnhancement(payload, settings) {
  const section = productSection();
  const cards = productCards();

  if (!section || !cards) {
    return;
  }

  clearCards(cards);
  cards.classList.add('asset-page-grid');
  cards.classList.remove('site-page-grid');
  forceAssetGridLayout(cards);

  setProductHeader(
    'Asset Page',
    'Manifest-backed asset metadata, ownership, payout routing, storage/provider data, receipts, and safe preview.',
    'safe preview'
  );

  section.classList.remove('hidden');

  const assetKind = cleanLower(payload.asset_kind || 'asset');
  const assetCid = assetCidFromPayload(payload);
  const rawRoute = rawObjectRoute(payload, assetCid);
  const rawUrl = absoluteGatewayUrl(settings, rawRoute);

  const preview = previewCard({ payload, assetKind, assetCid, rawRoute, rawUrl });
  preview.style.gridColumn = '1 / -1';

  const metadata = infoCard(
    'Metadata',
    [
      ['Title', payload.metadata?.title || payload.title || 'untitled'],
      ['Description', payload.metadata?.description || payload.description || 'no description'],
      ['Tags', tagsText(payload.metadata?.tags || payload.tags)],
      ['Kind', assetKind]
    ],
    'asset-metadata-card'
  );

  const ownership = infoCard(
    'Ownership',
    [
      ['Passport', payload.owner?.passport_subject || payload.owner_passport_subject || 'not declared'],
      ['Wallet', payload.owner?.wallet_account || payload.owner_wallet_account || 'not linked']
    ],
    'asset-owner-card'
  );

  const payout = infoCard(
    'Payout',
    [
      ['Default action', payload.payout?.default_action || payload.payout_action || 'not declared'],
      ['Recipient account', payload.payout?.recipient_account || payload.payout_account || 'not declared'],
      ['Split policy', payoutText(payload.payout)]
    ],
    'asset-payout-card'
  );

  const manifest = infoCard(
    'Manifest',
    [
      ['Status', manifestText(payload.manifest)],
      ['Manifest CID', payload.manifest?.manifest_cid || payload.manifest_cid || linkCid(payload.links?.manifest) || 'missing', 'hash'],
      ['Raw manifest route', payload.links?.manifest_raw || payload.manifest?.manifest_raw || payload.links?.manifest || 'not exposed', 'route']
    ],
    'asset-manifest-card'
  );

  const storage = infoCard(
    'Storage / Provider',
    [
      ['Available', boolText(payload.storage?.available)],
      ['Size', sizeText(payload.storage?.size_bytes || payload.size_bytes)],
      ['Content type', payload.storage?.content_type || payload.content_type || 'not declared'],
      ['Raw route', rawRoute || 'not exposed', 'route'],
      ['Provider', payload.storage?.provider || payload.storage?.provider_ref || payload.provider?.id || payload.provider || 'not declared'],
      ['Replicas', payload.storage?.replicas || payload.storage?.replica_count || 'not declared']
    ],
    'asset-storage-card'
  );

  const receipts = receiptsCard(payload.receipts);

  for (const card of [preview, metadata, ownership, payout, manifest, storage, receipts]) {
    forceReadableCard(card);
    cards.append(card);
  }

  const marker = document.createElement('div');
  marker.id = ENHANCER_ID;
  marker.hidden = true;
  cards.append(marker);
}

function renderSiteEnhancement(payload, settings) {
  const section = productSection();
  const cards = productCards();

  if (!section || !cards) {
    return;
  }

  cards.classList.remove('asset-page-grid');
  cards.classList.add('site-page-grid');
  resetGridInlineStyles(cards);

  setProductHeader(
    'Site Page',
    'Manifest-backed site metadata, ownership, payout routing, root document, and reference graph.',
    'safe site preview'
  );

  const old = document.getElementById(ENHANCER_ID);
  if (old) old.remove();

  const rootCid = rootDocumentCid(payload);
  const root = document.createElement('div');
  root.id = ENHANCER_ID;
  root.className = 'site-page-enhancer';

  root.append(siteRootCard({ payload, settings, rootCid }));
  cards.prepend(root);
}

function previewCard({ payload, assetKind, assetCid, rawRoute, rawUrl }) {
  const card = baseCard(assetKind === 'image' ? 'Image Preview' : 'Preview', 'asset-preview-section');

  card.style.minHeight = '520px';
  card.style.borderColor = 'rgba(56, 189, 248, 0.38)';

  const body = document.createElement('div');
  body.className = 'asset-preview-card';
  body.style.display = 'grid';
  body.style.gridTemplateColumns = 'minmax(0, 1fr)';
  body.style.gridTemplateRows = 'auto auto minmax(260px, 1fr) auto';
  body.style.gap = '14px';
  body.style.alignItems = 'stretch';
  body.style.justifyContent = 'stretch';
  body.style.minHeight = '430px';
  body.style.width = '100%';

  const controls = controlsRow('asset-preview-controls');
  const status = statusText('asset-preview-status');
  const facts = factsList('asset-preview-facts');

  appendRow(facts, 'Asset CID', assetCid || 'not declared', 'hash');
  appendRow(facts, 'Raw route', rawRoute || 'not exposed', 'route');
  appendRow(facts, 'Safety', 'Auto-loaded through svc-gateway /o as a read-only byte fetch.');

  if (!rawRoute || !rawUrl) {
    status.textContent = 'No raw object route was exposed for this asset.';
    body.append(facts, status);
    card.append(body);
    return card;
  }

  const copyRoute = button('Copy raw route', 'secondary');
  copyRoute.addEventListener('click', async () => {
    await copyText(rawRoute);
    setFooter('Copied raw object route.');
  });

  const copyCid = button('Copy b3 CID', 'secondary');
  copyCid.disabled = !assetCid;
  copyCid.addEventListener('click', async () => {
    await copyText(assetCid);
    setFooter('Copied asset CID.');
  });

  controls.append(copyRoute, copyCid);

  if (assetKind === 'image') {
    const reload = button('Reload preview', 'secondary');
    reload.style.minHeight = '44px';

    const img = document.createElement('img');
    img.alt = altTextForImage(payload);
    img.style.display = 'block';
    img.style.alignSelf = 'center';
    img.style.justifySelf = 'center';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '620px';
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.borderRadius = '18px';
    img.style.objectFit = 'contain';
    img.style.background = 'rgba(2, 6, 23, 0.72)';
    img.style.boxShadow = '0 22px 60px rgba(0, 0, 0, 0.36)';

    function loadImage() {
      status.textContent = 'Loading image preview through svc-gateway /o…';
      img.src = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}crablink_preview=${Date.now()}`;
    }

    img.addEventListener('load', () => {
      body.classList.add('asset-preview-loaded');
      status.textContent = 'Preview loaded automatically through svc-gateway /o. CrabLink does not execute asset code.';
    });

    img.addEventListener('error', () => {
      body.classList.remove('asset-preview-loaded');
      status.textContent = 'Preview failed to load. Check that the gateway /o route and svc-storage object are both available.';
    });

    reload.addEventListener('click', loadImage);

    controls.prepend(reload);
    body.append(controls, status, img, facts);
    card.append(body);

    window.setTimeout(loadImage, 0);
    return card;
  }

  status.textContent = 'Inline preview is currently enabled only for image assets. Other assets remain manifest-first until their safe renderer exists.';
  body.append(controls, status, facts);
  card.append(body);
  return card;
}

function siteRootCard({ payload, settings, rootCid }) {
  const card = baseCard('Root Document Preview', 'site-root-preview-card');
  const route = rootCid ? objectRouteFromCid(rootCid) : '';
  const rawUrl = absoluteGatewayUrl(settings, route);
  const siteUrl = payload.links?.crab || payload.crab_url || (payload.site_name ? `crab://${payload.site_name}` : payload.name ? `crab://${payload.name}` : 'unknown');
  let lastLoadedSource = '';

  const list = factsList('site-root-facts');
  appendRow(list, 'Root CID', rootCid || 'not declared', 'hash');
  appendRow(list, 'Route', route || 'not available', 'route');
  appendRow(list, 'Site', siteUrl);
  appendRow(list, 'Safety', 'Source is auto-fetched as text. Rendered preview is optional, sandboxed, script-blocked, and CSP-restricted.');
  card.append(list);

  const controls = controlsRow('site-root-controls');
  const reload = button('Reload source', 'secondary');
  reload.disabled = !rawUrl;

  const showRendered = button('Show sandbox preview', 'secondary');
  showRendered.disabled = true;

  const copyCid = button('Copy root CID', 'secondary');
  copyCid.disabled = !rootCid;

  const copyRoute = button('Copy raw route', 'secondary');
  copyRoute.disabled = !route;

  const status = statusText('site-root-status');
  status.textContent = rawUrl
    ? 'Loading root document source through svc-gateway /o…'
    : 'This site page did not expose a root_document_cid.';

  const source = document.createElement('pre');
  source.className = 'site-root-source';
  source.textContent = rawUrl ? 'Loading root source…' : 'No root document route available.';

  const frame = document.createElement('iframe');
  frame.className = 'site-root-frame hidden';
  frame.title = 'Sandboxed RON site root document preview';
  frame.setAttribute('sandbox', '');
  frame.setAttribute('referrerpolicy', 'no-referrer');

  async function loadSource() {
    if (!rawUrl) return;

    reload.disabled = true;
    showRendered.disabled = true;
    frame.classList.add('hidden');
    frame.removeAttribute('srcdoc');
    source.textContent = 'Loading root source…';
    status.textContent = 'Fetching root document bytes through svc-gateway /o…';

    try {
      const result = await fetchLimitedText(
        `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}crablink_site_preview=${Date.now()}`,
        MAX_SITE_ROOT_PREVIEW_BYTES
      );

      lastLoadedSource = result.text;
      source.textContent = result.text || '[empty root document]';
      showRendered.disabled = !lastLoadedSource;
      status.textContent = result.truncated
        ? `Loaded first ${MAX_SITE_ROOT_PREVIEW_BYTES} byte(s) of root document as text. Sandboxed preview is disabled for truncated content.`
        : 'Loaded root document source as text. Use sandbox preview only when you want a script-blocked visual check.';
      showRendered.disabled = Boolean(result.truncated) || !lastLoadedSource;
    } catch (error) {
      lastLoadedSource = '';
      source.textContent = formatPreviewError(error);
      status.textContent = 'Failed to load root source. Check gateway /o and svc-storage availability.';
    } finally {
      reload.disabled = false;
    }
  }

  reload.addEventListener('click', loadSource);

  showRendered.addEventListener('click', () => {
    if (!lastLoadedSource) return;

    frame.srcdoc = sandboxedSitePreviewDocument(lastLoadedSource, {
      title: payload.metadata?.title || payload.title || payload.site_name || 'RON Site',
      rootCid,
      siteUrl
    });
    frame.classList.remove('hidden');
    status.textContent = 'Rendered in a sandboxed iframe with scripts disabled and external network loads blocked by CSP.';
  });

  copyCid.addEventListener('click', async () => {
    await copyText(rootCid);
    setFooter('Copied root document CID.');
  });

  copyRoute.addEventListener('click', async () => {
    await copyText(route);
    setFooter('Copied root document raw route.');
  });

  controls.append(reload, showRendered, copyCid, copyRoute);
  card.append(controls, status, source, frame);

  if (rawUrl) {
    window.setTimeout(loadSource, 0);
  }

  return card;
}

function infoCard(title, rows, className = '') {
  const card = baseCard(title, className);
  const list = factsList();

  for (const row of rows) {
    const [label, value, kind] = row;
    appendRow(list, label, value, kind);
  }

  card.append(list);
  return card;
}

function receiptsCard(receipts) {
  if (!Array.isArray(receipts) || receipts.length === 0) {
    return infoCard('Receipts', [['Status', 'No receipts returned for this page.']], 'asset-receipts-card');
  }

  const rows = receipts.slice(0, 6).map((receipt, index) => {
    if (receipt && typeof receipt === 'object') {
      const kind = receipt.receipt_kind || receipt.kind || receipt.action || `receipt ${index + 1}`;
      const txid = receipt.wallet_txid || receipt.txid || receipt.transaction_id || '';
      const hash = receipt.wallet_receipt_hash || receipt.receipt_hash || receipt.hash || '';
      return [`#${index + 1}`, [kind, txid, hash].filter(Boolean).join(' · ') || JSON.stringify(receipt), 'hash'];
    }

    return [`#${index + 1}`, String(receipt)];
  });

  if (receipts.length > rows.length) {
    rows.push(['More', `${receipts.length - rows.length} additional receipt(s) in Developer JSON`]);
  }

  return infoCard('Receipts', rows, 'asset-receipts-card');
}

function baseCard(title, className = '') {
  const card = document.createElement('article');
  card.className = ['site-card', className].filter(Boolean).join(' ');

  const heading = document.createElement('h4');
  heading.textContent = title;
  card.append(heading);

  return card;
}

function controlsRow(className = '') {
  const row = document.createElement('div');
  row.className = ['workflow-actions', className].filter(Boolean).join(' ');
  return row;
}

function statusText(className = '') {
  const status = document.createElement('p');
  status.className = ['drawer-message', className].filter(Boolean).join(' ');
  status.style.margin = '0';
  status.style.color = 'var(--muted)';
  status.style.fontSize = '14px';
  status.style.lineHeight = '1.5';
  return status;
}

function factsList(className = '') {
  const list = document.createElement('dl');
  if (className) list.className = className;
  list.style.margin = '0';
  list.style.display = 'grid';
  list.style.gap = '10px';
  return list;
}

function appendRow(list, label, value, kind = '') {
  const term = document.createElement('dt');
  term.textContent = label;

  const description = document.createElement('dd');
  description.textContent = value === undefined || value === null || value === '' ? '—' : String(value);

  const cleanKind = String(kind || '').trim();
  if (cleanKind) {
    description.classList.add(`value-${cleanKind}`);
  }

  list.append(term, description);
}

function button(label, className) {
  const el = document.createElement('button');
  el.type = 'button';
  if (className) el.className = className;
  el.textContent = label;
  return el;
}

function clearCards(cards) {
  cards.textContent = '';
}

function clearEnhancer() {
  const old = document.getElementById(ENHANCER_ID);
  if (old) old.remove();

  const cards = productCards();
  if (cards) {
    cards.classList.remove('asset-page-grid');
    cards.classList.remove('site-page-grid');
    resetGridInlineStyles(cards);
  }
}

function productSection() {
  return document.getElementById('sitePageSection');
}

function productCards() {
  return document.getElementById('sitePageCards');
}

function setProductHeader(title, description, badge) {
  const section = productSection();
  if (section) section.classList.remove('hidden');

  const heading = document.getElementById('productPageSectionTitle') || document.querySelector('#sitePageSection .section-head h3');
  if (heading) heading.textContent = title;

  const subhead = document.getElementById('productPageSectionDescription') || document.querySelector('#sitePageSection .section-head p');
  if (subhead) subhead.textContent = description;

  const safeBadge = document.getElementById('productPageSectionBadge') || document.querySelector('#sitePageSection .draft-safe-badge');
  if (safeBadge) safeBadge.textContent = badge;
}

function forceAssetGridLayout(cards) {
  cards.style.display = 'grid';
  cards.style.gridTemplateColumns = 'minmax(0, 1.15fr) minmax(340px, 0.85fr)';
  cards.style.gap = '18px';
  cards.style.alignItems = 'stretch';
  cards.style.width = '100%';
}

function resetGridInlineStyles(cards) {
  cards.style.display = '';
  cards.style.gridTemplateColumns = '';
  cards.style.gap = '';
  cards.style.width = '';
  cards.style.alignItems = '';
}

function forceReadableCard(card) {
  card.style.minWidth = '0';
  card.style.padding = '20px';
  card.style.borderRadius = '22px';

  const heading = card.querySelector('h4');
  if (heading) {
    heading.style.fontSize = '20px';
    heading.style.lineHeight = '1.08';
    heading.style.marginBottom = '16px';
  }

  const list = card.querySelector('dl');
  if (list) {
    list.style.display = 'grid';
    list.style.gap = '14px';
    list.style.margin = '0';
  }

  for (const term of card.querySelectorAll('dt')) {
    term.style.fontSize = '11px';
    term.style.letterSpacing = '0.16em';
  }

  for (const description of card.querySelectorAll('dd')) {
    description.style.margin = '-8px 0 0';
    description.style.fontFamily =
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    description.style.fontSize = '15px';
    description.style.lineHeight = '1.52';
    description.style.overflowWrap = 'anywhere';
  }

  for (const description of card.querySelectorAll('dd.value-hash, dd.value-route')) {
    description.style.padding = '10px 11px';
    description.style.border = '1px solid rgba(148, 163, 184, 0.18)';
    description.style.borderRadius = '12px';
    description.style.background = 'rgba(2, 6, 23, 0.42)';
    description.style.color = '#dbeafe';
    description.style.fontFamily =
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
    description.style.fontSize = '12px';
    description.style.lineHeight = '1.45';
  }
}

function assetCidFromPayload(payload) {
  return payload.asset_cid || payload.content_id || payload.cid || '';
}

function rawObjectRoute(payload, fallbackCid) {
  return (
    payload.links?.raw ||
    payload.links?.raw_url ||
    payload.raw_url ||
    payload.raw_route ||
    payload.storage?.raw ||
    payload.storage?.raw_url ||
    payload.storage?.route ||
    (fallbackCid ? objectRouteFromCid(fallbackCid) : '')
  );
}

function rootDocumentCid(payload) {
  return (
    payload.root_document_cid ||
    payload.rootDocumentCid ||
    payload.manifest?.root_document_cid ||
    payload.route_map?.['/'] ||
    payload.routes?.['/'] ||
    ''
  );
}

function objectRouteFromCid(value) {
  const clean = String(value || '').trim();

  if (!clean) return '';
  if (clean.startsWith('/o/')) return clean;
  if (/^b3:[0-9a-f]{64}$/.test(clean)) return `/o/${clean}`;
  if (/^[0-9a-f]{64}$/.test(clean)) return `/o/b3:${clean}`;

  return '';
}

function absoluteGatewayUrl(settings, route) {
  const cleanRoute = String(route || '').trim();

  if (!cleanRoute) return '';
  if (/^https?:\/\//i.test(cleanRoute)) return cleanRoute;

  const base = String(settings?.gatewayUrl || 'http://127.0.0.1:8090').trim().replace(/\/+$/, '');
  return `${base}${cleanRoute.startsWith('/') ? cleanRoute : `/${cleanRoute}`}`;
}

function cleanLower(value) {
  return String(value || '').trim().toLowerCase();
}

function tagsText(tags) {
  if (Array.isArray(tags)) return tags.filter(Boolean).join(', ') || 'none';
  return String(tags || '').trim() || 'none';
}

function payoutText(payout) {
  if (!payout || typeof payout !== 'object') return 'not declared';
  if (Array.isArray(payout.splits)) return `${payout.splits.length} split(s)`;
  if (payout.basis_points !== undefined || payout.bps !== undefined) return `${payout.basis_points ?? payout.bps} bps`;
  return 'not declared';
}

function manifestText(manifest) {
  if (manifest === true) return 'present';
  if (!manifest) return 'missing';
  if (typeof manifest === 'object' && manifest.present === true) return 'present';
  if (typeof manifest === 'object' && manifest.present === false) return 'missing';
  return manifest.status || 'unknown';
}

function boolText(value) {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return 'unknown';
}

function sizeText(value) {
  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) {
    return 'not declared';
  }

  if (n < 1024) return `${n} bytes`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}

function linkCid(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/b3:[0-9a-f]{64}/);
  return match ? match[0] : '';
}

function altTextForImage(payload) {
  const title = payload.metadata?.title || payload.title || 'b3-backed image';
  const description = payload.metadata?.description || payload.description || '';
  return description ? `${title}: ${description}` : title;
}

async function fetchLimitedText(url, maxBytes) {
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      Accept: 'text/html,text/plain,application/octet-stream;q=0.9,*/*;q=0.1'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const decoder = new TextDecoder('utf-8', { fatal: false });
  const reader = response.body?.getReader ? response.body.getReader() : null;

  if (!reader) {
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const truncated = bytes.byteLength > maxBytes;
    return {
      text: decoder.decode(bytes.slice(0, maxBytes)),
      truncated,
      totalBytes: bytes.byteLength
    };
  }

  const chunks = [];
  let totalBytes = 0;
  let truncated = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      if (!value) continue;

      const remaining = maxBytes - totalBytes;

      if (remaining <= 0) {
        truncated = true;
        await reader.cancel();
        break;
      }

      if (value.byteLength > remaining) {
        chunks.push(value.slice(0, remaining));
        totalBytes += remaining;
        truncated = true;
        await reader.cancel();
        break;
      }

      chunks.push(value);
      totalBytes += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = concatUint8Arrays(chunks, totalBytes);
  return {
    text: decoder.decode(bytes),
    truncated,
    totalBytes
  };
}

function concatUint8Arrays(chunks, totalBytes) {
  const out = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return out;
}

function sandboxedSitePreviewDocument(source, details = {}) {
  const title = escapeHtml(details.title || 'RON Site Preview');
  const rootCid = escapeHtml(details.rootCid || 'unknown root');
  const siteUrl = escapeHtml(details.siteUrl || 'unknown site');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; font-src data:; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'">
<title>${title}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #ffffff; color: #0f172a; }
  .crablink-preview-banner { position: sticky; top: 0; z-index: 999999; padding: 10px 12px; background: #0f172a; color: #e2e8f0; font: 12px/1.4 system-ui, sans-serif; border-bottom: 1px solid #334155; }
  .crablink-preview-banner strong { color: #93c5fd; }
  .crablink-preview-body { min-height: 100vh; }
</style>
</head>
<body>
<div class="crablink-preview-banner"><strong>CrabLink sandbox preview</strong> — scripts, forms, external fetches, and external media are blocked. Site: ${siteUrl}. Root: ${rootCid}.</div>
<div class="crablink-preview-body">
${source}
</div>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatPreviewError(error) {
  const message = error?.message || String(error || 'unknown error');
  return `Unable to load root document source.\n\n${message}`;
}

async function copyText(value) {
  const text = String(value || '');

  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
}

function setFooter(message) {
  const footer = document.getElementById('footerStatus');
  if (footer) footer.textContent = message;
}

function installPreviewStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #sitePageCards.asset-page-grid {
      display: grid !important;
      grid-template-columns: minmax(0, 1.15fr) minmax(340px, 0.85fr) !important;
      gap: 18px !important;
      align-items: stretch !important;
      width: 100% !important;
    }

    #sitePageCards.asset-page-grid .asset-preview-section {
      grid-column: 1 / -1 !important;
      min-height: 520px !important;
    }

    #sitePageCards.asset-page-grid .site-card {
      min-width: 0 !important;
      padding: 20px !important;
      border-radius: 22px !important;
    }

    #sitePageCards.asset-page-grid .site-card h4 {
      font-size: 20px !important;
      line-height: 1.08 !important;
      margin-bottom: 16px !important;
    }

    #sitePageCards.asset-page-grid .site-card dd {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      font-size: 15px !important;
      line-height: 1.52 !important;
      overflow-wrap: anywhere !important;
    }

    #sitePageCards.asset-page-grid .site-card dd.value-hash,
    #sitePageCards.asset-page-grid .site-card dd.value-route {
      padding: 10px 11px !important;
      border: 1px solid rgba(148, 163, 184, 0.18) !important;
      border-radius: 12px !important;
      background: rgba(2, 6, 23, 0.42) !important;
      color: #dbeafe !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace !important;
      font-size: 12px !important;
      line-height: 1.45 !important;
    }

    #sitePageCards.asset-page-grid .asset-preview-card img {
      max-width: 100% !important;
      max-height: 620px !important;
      object-fit: contain !important;
    }

    #sitePageCards.site-page-grid .site-page-enhancer {
      grid-column: 1 / -1 !important;
      display: grid !important;
      min-width: 0 !important;
    }

    #sitePageCards.site-page-grid .site-root-preview-card {
      border-color: rgba(56, 189, 248, 0.32) !important;
      background: linear-gradient(180deg, rgba(14, 165, 233, 0.08), rgba(8, 17, 34, 0.56)) !important;
    }

    #sitePageCards.site-page-grid .site-root-source {
      max-height: 360px !important;
      margin-top: 12px !important;
      border: 1px solid rgba(148, 163, 184, 0.22) !important;
      border-radius: 16px !important;
      background: #020617 !important;
      color: #dbeafe !important;
      white-space: pre-wrap !important;
      overflow: auto !important;
    }

    #sitePageCards.site-page-grid .site-root-frame {
      width: 100% !important;
      min-height: 420px !important;
      margin-top: 12px !important;
      border: 1px solid rgba(148, 163, 184, 0.28) !important;
      border-radius: 16px !important;
      background: #ffffff !important;
    }

    @media (max-width: 980px) {
      #sitePageCards.asset-page-grid {
        grid-template-columns: 1fr !important;
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