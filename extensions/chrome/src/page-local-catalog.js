/**
 * RO:WHAT — Maintains a local CrabLink “My Sites / My Assets” catalogue from rendered backend DTOs.
 * RO:WHY — NEXT_LEVEL UX; Concerns: DX/SEC; keep user-specific catalogue controls in Passport drawer, not global site nav.
 * RO:INTERACTS — page.html, developerJson DTO payloads, chrome.storage.local, CrabLink full-tab navigation.
 * RO:INVARIANTS — local display cache only; no backend mutation; no wallet/ledger/storage/index truth invented.
 * RO:METRICS — none; this is client-side UX state only.
 * RO:CONFIG — stores crablinkRecentSitesV1 and crablinkRecentAssetsV1 in chrome.storage.local.
 * RO:SECURITY — textContent only; no private keys; no spend authority; no main↔alt linkage; no direct service calls.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual Passport → ROC/REP/MOD + Profile/My Sites/My Assets.
 */

const STYLE_ID = 'crablinkLocalCatalogStyles';
const SHEET_ID = 'crablinkLocalCatalogSheet';
const PANEL_ID = 'crablinkLocalCatalogPanel';
const PASSPORT_PANEL_ID = 'passportUserCatalogPanel';
const SITES_KEY = 'crablinkRecentSitesV1';
const ASSETS_KEY = 'crablinkRecentAssetsV1';
const MAX_RECORDS = 32;

let captureTimer = 0;
let installTimer = 0;
let lastFingerprint = '';

function boot() {
  installStyles();
  scheduleInstall();
  scheduleCapture();

  window.setTimeout(scheduleInstall, 120);
  window.setTimeout(scheduleInstall, 400);
  window.setTimeout(scheduleInstall, 1200);

  const observed = document.body || document.documentElement;
  if (observed) {
    const observer = new MutationObserver(() => {
      scheduleInstall();
      scheduleCapture();
    });

    observer.observe(observed, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'open', 'hidden']
    });
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;

      const watched = [
        SITES_KEY,
        ASSETS_KEY,
        'rocBalanceDisplay',
        'rocBalanceMinorUnits',
        'rocLedgerBacked',
        'rocBalanceSource',
        'reputationScore',
        'reputationScorePercent',
        'reputationPercent',
        'repScore',
        'repScorePercent',
        'moderatorScore',
        'moderatorScorePercent',
        'moderationScore',
        'moderationScorePercent',
        'modScore',
        'modScorePercent'
      ];

      if (watched.some((key) => Object.prototype.hasOwnProperty.call(changes, key))) {
        scheduleInstall();
      }
    });
  }

  document.addEventListener('click', (event) => {
    const openKind = event.target?.closest?.('[data-crablink-open-catalog]')?.getAttribute('data-crablink-open-catalog');
    if (openKind) {
      event.preventDefault();
      void openCatalog(openKind);
      return;
    }

    const openUrl = event.target?.closest?.('[data-crablink-open-url]')?.getAttribute('data-crablink-open-url');
    if (openUrl) {
      event.preventDefault();
      closeCatalog({ announce: false });
      openCrabUrl(openUrl);
      return;
    }

    const openProfile = event.target?.closest?.('[data-crablink-open-profile]');
    if (openProfile) {
      event.preventDefault();
      openCrabUrl('crab://profile');
      return;
    }

    const copyValue = event.target?.closest?.('[data-crablink-copy]')?.getAttribute('data-crablink-copy');
    if (copyValue) {
      event.preventDefault();
      void copyText(copyValue, 'Copied.');
      return;
    }

    const clearKind = event.target?.closest?.('[data-crablink-clear-catalog]')?.getAttribute('data-crablink-clear-catalog');
    if (clearKind) {
      event.preventDefault();
      void clearCatalog(clearKind);
      return;
    }

    if (event.target?.closest?.('[data-crablink-close-catalog]')) {
      event.preventDefault();
      closeCatalog({ announce: false });
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCatalog({ announce: false });
    }
  });
}

function scheduleInstall() {
  window.clearTimeout(installTimer);
  installTimer = window.setTimeout(() => {
    installPassportCatalogPanel().catch((error) => {
      setFooter(`Passport catalogue skipped: ${error?.message || error}`);
    });
  }, 80);
}

function scheduleCapture() {
  window.clearTimeout(captureTimer);
  captureTimer = window.setTimeout(() => {
    captureCurrentDeveloperJson().catch(() => {
      // Best-effort local history only.
    });
  }, 160);
}

async function installPassportCatalogPanel() {
  removeOldCatalogButtons();

  const drawer = document.getElementById('passportDrawer');
  if (!drawer) return;

  let panel = document.getElementById(PASSPORT_PANEL_ID);
  if (!panel) {
    panel = document.createElement('section');
    panel.id = PASSPORT_PANEL_ID;
    panel.className = 'passport-user-catalog-panel';
    panel.setAttribute('aria-label', 'Passport user controls');

    const drawerActions = drawer.querySelector('.drawer-actions');
    if (drawerActions) {
      drawer.insertBefore(panel, drawerActions);
    } else {
      drawer.append(panel);
    }
  } else {
    panel.classList.add('passport-user-catalog-panel');
    panel.setAttribute('aria-label', 'Passport user controls');
  }

  const settings = await safeGetSettings();
  renderPassportCatalogPanel(panel, settings);
}

function removeOldCatalogButtons() {
  for (const button of document.querySelectorAll('.catalog-quick-button')) {
    button.remove();
  }
}

function renderPassportCatalogPanel(panel, settings) {
  panel.textContent = '';

  const stats = document.createElement('div');
  stats.className = 'passport-catalog-stat-row';

  stats.append(
    statBox('ROC', rocDisplay(settings), 'Current ROC balance from local wallet/balance state.'),
    statBox(
      'REP',
      scorePercent(settings, ['reputationScorePercent', 'reputationPercent', 'repScorePercent', 'reputationScore', 'repScore']),
      'Public reputation score is not backend-published yet unless settings/DTO data provides it.'
    ),
    statBox(
      'MOD',
      scorePercent(settings, [
        'moderatorScorePercent',
        'moderationScorePercent',
        'modScorePercent',
        'moderatorScore',
        'moderationScore',
        'modScore'
      ]),
      'Public moderator score is not backend-published yet unless settings/DTO data provides it.'
    )
  );

  const actions = document.createElement('div');
  actions.className = 'passport-catalog-action-row';

  const profileButton = document.createElement('button');
  profileButton.id = 'passportCatalogProfileButton';
  profileButton.type = 'button';
  profileButton.className = 'secondary passport-catalog-action-button';
  profileButton.textContent = 'Profile';
  profileButton.setAttribute('data-crablink-open-profile', '1');

  const sitesButton = document.createElement('button');
  sitesButton.id = 'passportCatalogSitesButton';
  sitesButton.type = 'button';
  sitesButton.className = 'secondary passport-catalog-action-button';
  sitesButton.textContent = 'My Sites';
  sitesButton.setAttribute('data-crablink-open-catalog', 'sites');

  const assetsButton = document.createElement('button');
  assetsButton.id = 'passportCatalogAssetsButton';
  assetsButton.type = 'button';
  assetsButton.className = 'secondary passport-catalog-action-button';
  assetsButton.textContent = 'My Assets';
  assetsButton.setAttribute('data-crablink-open-catalog', 'assets');

  actions.append(profileButton, sitesButton, assetsButton);
  panel.append(stats, actions);
}

function statBox(label, value, title) {
  const box = document.createElement('article');
  box.className = 'passport-catalog-stat-box';
  box.title = title || '';

  const term = document.createElement('span');
  term.textContent = `${label}:`;

  const body = document.createElement('strong');
  body.textContent = value || '—';

  box.append(term, body);
  return box;
}

function rocDisplay(settings) {
  const candidates = [
    clean(document.getElementById('drawerRoc')?.textContent),
    clean(document.getElementById('topRocBalance')?.textContent),
    clean(settings.rocBalanceDisplay),
    clean(settings.rocBalanceMinorUnits)
  ];

  for (const candidate of candidates) {
    const display = stripRocUnit(candidate);
    if (display && display !== '0') return display;
  }

  return '—';
}

function stripRocUnit(value) {
  const raw = clean(value);
  if (!raw || raw === '—') return '';

  const withoutLedgerDetail = raw.replace(/\s*\(.*?\)\s*$/g, '').trim();
  const withoutRoc = withoutLedgerDetail.replace(/\s*ROC\b.*$/i, '').trim();

  return withoutRoc || withoutLedgerDetail || raw;
}

function scorePercent(settings, keys) {
  for (const key of keys) {
    const value = settings?.[key];
    const formatted = formatPercent(value);
    if (formatted) return formatted;
  }

  return '—';
}

function formatPercent(value) {
  const raw = clean(value);
  if (!raw || raw === '—' || raw === '-') return '';

  if (/^[-+]?\d+(\.\d+)?%$/.test(raw)) return raw;

  const number = Number(raw);
  if (!Number.isFinite(number)) return '';

  const clamped = Math.max(0, Math.min(100, number));
  const rounded = Number.isInteger(clamped) ? String(clamped) : clamped.toFixed(1).replace(/\.0$/, '');
  return `${rounded}%`;
}

async function captureCurrentDeveloperJson() {
  const payload = readDeveloperPayload();
  if (!payload || typeof payload !== 'object') return;

  const schema = clean(payload.schema || payload.type);
  const fingerprint = `${schema}:${clean(payload.crab_url || payload.crabUrl || payload.url || payload.site_name || payload.siteName || payload.asset_cid || payload.assetCid || payload.root_document_cid || payload.rootDocumentCid || '')}:${clean(payload.manifest_cid || payload.manifestCid || payload.manifest?.manifest_cid || payload.manifest?.manifestCid || '')}`;

  if (!fingerprint || fingerprint === lastFingerprint) return;
  lastFingerprint = fingerprint;

  if (schema === 'omnigate.site-page.v1' || payload.site_name || payload.root_document_cid || payload.rootDocumentCid) {
    const record = siteRecordFromPayload(payload);
    if (record.url || record.siteName || record.manifestCid || record.rootCid) {
      await rememberSiteRecord(record);
      setFooter(`Saved ${record.url || record.siteName || 'site'} to My Sites.`);
    }
    return;
  }

  if (schema === 'omnigate.asset-page.v1' || payload.asset || payload.asset_cid || payload.assetCid || payload.content_id) {
    const record = assetRecordFromPayload(payload);
    if (record.url || record.assetCid || record.manifestCid) {
      await rememberAssetRecord(record);
      setFooter(`Saved ${record.url || record.assetCid || 'asset'} to My Assets.`);
    }
  }
}

function siteRecordFromPayload(payload) {
  const manifest = objectOrEmpty(payload.manifest);
  const owner = objectOrEmpty(payload.owner);
  const payout = objectOrEmpty(payload.payout);
  const metadata = objectOrEmpty(payload.metadata);

  const siteName = clean(firstPresent(payload.site_name, payload.siteName, payload.name));
  const url = clean(firstPresent(payload.links?.crab, payload.crab_url, payload.crabUrl, siteName ? `crab://${siteName}` : ''));
  const rootCid = normalizeB3(firstPresent(payload.root_document_cid, payload.rootDocumentCid, payload.root_cid, payload.rootCid));
  const manifestCid = normalizeB3(
    firstPresent(
      manifest.manifest_cid,
      manifest.manifestCid,
      manifest.cid,
      payload.manifest_cid,
      payload.manifestCid
    )
  );

  return {
    kind: 'site',
    url,
    siteName,
    title: clean(firstPresent(metadata.title, payload.title, payload.site_title, payload.siteTitle, siteName)),
    description: clean(firstPresent(metadata.description, payload.description, payload.site_description, payload.siteDescription)),
    rootCid,
    manifestCid,
    ownerPassport: clean(firstPresent(owner.passport_subject, owner.passportSubject, payload.owner_passport_subject, payload.ownerPassportSubject)),
    ownerWallet: clean(firstPresent(owner.wallet_account, owner.walletAccount, payload.owner_wallet_account, payload.ownerWalletAccount)),
    payoutAccount: clean(firstPresent(payout.recipient_account, payout.recipientAccount, payload.payout_account, payload.payoutAccount)),
    schema: clean(payload.schema || payload.type),
    savedAt: new Date().toISOString()
  };
}

function assetRecordFromPayload(payload) {
  const manifest = objectOrEmpty(payload.manifest);
  const owner = objectOrEmpty(payload.owner);
  const payout = objectOrEmpty(payload.payout);
  const asset = objectOrEmpty(payload.asset);
  const metadata = objectOrEmpty(payload.metadata);

  const assetCid = normalizeB3(
    firstPresent(
      payload.asset_cid,
      payload.assetCid,
      payload.content_id,
      payload.contentId,
      asset.cid,
      asset.b3,
      asset.content_id,
      asset.contentId
    )
  );

  const manifestCid = normalizeB3(
    firstPresent(
      payload.manifest_cid,
      payload.manifestCid,
      manifest.manifest_cid,
      manifest.manifestCid,
      manifest.cid
    )
  );

  const kind = clean(firstPresent(payload.asset_kind, payload.assetKind, asset.kind, metadata.kind, 'asset'));
  const rawHash = assetCid.startsWith('b3:') ? assetCid.slice(3) : '';
  const url = clean(firstPresent(payload.links?.crab, payload.crab_url, payload.crabUrl, rawHash && kind ? `crab://${rawHash}.${kind}` : ''));

  return {
    kind: kind || 'asset',
    url,
    title: clean(firstPresent(metadata.title, payload.title, asset.title, url || assetCid)),
    description: clean(firstPresent(metadata.description, payload.description, asset.description)),
    assetCid,
    manifestCid,
    ownerPassport: clean(firstPresent(owner.passport_subject, owner.passportSubject, payload.owner_passport_subject, payload.ownerPassportSubject)),
    ownerWallet: clean(firstPresent(owner.wallet_account, owner.walletAccount, payload.owner_wallet_account, payload.ownerWalletAccount)),
    payoutAccount: clean(firstPresent(payout.recipient_account, payout.recipientAccount, payload.payout_account, payload.payoutAccount)),
    schema: clean(payload.schema || payload.type),
    savedAt: new Date().toISOString()
  };
}

async function rememberSiteRecord(record) {
  const current = await getCatalog(SITES_KEY);
  const next = upsertRecord(current, normalizeSiteRecord(record), siteIdentity);
  await setCatalog(SITES_KEY, next);
}

async function rememberAssetRecord(record) {
  const current = await getCatalog(ASSETS_KEY);
  const next = upsertRecord(current, normalizeAssetRecord(record), assetIdentity);
  await setCatalog(ASSETS_KEY, next);
}

function normalizeSiteRecord(record) {
  return {
    kind: 'site',
    url: clean(record.url),
    siteName: clean(record.siteName),
    title: clean(record.title),
    description: clean(record.description),
    rootCid: normalizeB3(record.rootCid),
    manifestCid: normalizeB3(record.manifestCid),
    ownerPassport: clean(record.ownerPassport),
    ownerWallet: clean(record.ownerWallet),
    payoutAccount: clean(record.payoutAccount),
    schema: clean(record.schema),
    savedAt: clean(record.savedAt) || new Date().toISOString()
  };
}

function normalizeAssetRecord(record) {
  return {
    kind: clean(record.kind) || 'asset',
    url: clean(record.url),
    title: clean(record.title),
    description: clean(record.description),
    assetCid: normalizeB3(record.assetCid),
    manifestCid: normalizeB3(record.manifestCid),
    ownerPassport: clean(record.ownerPassport),
    ownerWallet: clean(record.ownerWallet),
    payoutAccount: clean(record.payoutAccount),
    schema: clean(record.schema),
    savedAt: clean(record.savedAt) || new Date().toISOString()
  };
}

function upsertRecord(records, record, identityFn) {
  const id = identityFn(record);
  if (!id) return records.slice(0, MAX_RECORDS);

  const without = records.filter((existing) => identityFn(existing) !== id);
  return [record, ...without].slice(0, MAX_RECORDS);
}

function siteIdentity(record) {
  return clean(record.url) || clean(record.siteName) || normalizeB3(record.manifestCid) || normalizeB3(record.rootCid);
}

function assetIdentity(record) {
  return clean(record.url) || normalizeB3(record.assetCid) || normalizeB3(record.manifestCid);
}

async function openCatalog(kind) {
  const isAssets = kind === 'assets';
  const records = await getCatalog(isAssets ? ASSETS_KEY : SITES_KEY);

  const sheet = ensureSheet();
  const panel = sheet.querySelector(`#${PANEL_ID}`);
  if (!panel) return;

  panel.textContent = '';

  const head = document.createElement('div');
  head.className = 'local-catalog-head';

  const titleWrap = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'local-catalog-eyebrow';
  eyebrow.textContent = 'Local CrabLink catalogue';

  const title = document.createElement('h3');
  title.textContent = isAssets ? 'My Assets' : 'My Sites';

  const subtitle = document.createElement('p');
  subtitle.className = 'local-catalog-subtitle';
  subtitle.textContent = isAssets
    ? 'Recently opened or created asset pages saved locally by this browser.'
    : 'Recently opened or created site pages saved locally by this browser.';

  titleWrap.append(eyebrow, title, subtitle);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'local-catalog-close';
  close.textContent = '×';
  close.title = 'Close local catalogue';
  close.setAttribute('data-crablink-close-catalog', '1');

  head.append(titleWrap, close);

  const body = document.createElement('div');
  body.className = 'local-catalog-body';

  if (records.length === 0) {
    body.append(emptyState(isAssets));
  } else {
    body.append(isAssets ? assetTable(records) : siteTable(records));
  }

  const note = document.createElement('p');
  note.className = 'local-catalog-note';
  note.textContent =
    'This is local browser history only. Backend profile manifests, public asset catalogues, and durable site recovery routes are future RustyOnions work.';

  const actions = document.createElement('div');
  actions.className = 'local-catalog-actions';

  const copyJson = document.createElement('button');
  copyJson.type = 'button';
  copyJson.className = 'secondary';
  copyJson.textContent = 'Copy JSON';
  copyJson.setAttribute('data-crablink-copy', JSON.stringify(records, null, 2));

  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'secondary';
  clear.textContent = isAssets ? 'Clear My Assets' : 'Clear My Sites';
  clear.setAttribute('data-crablink-clear-catalog', isAssets ? 'assets' : 'sites');

  const closeBottom = document.createElement('button');
  closeBottom.type = 'button';
  closeBottom.textContent = 'Close';
  closeBottom.setAttribute('data-crablink-close-catalog', '1');

  actions.append(copyJson, clear, closeBottom);

  panel.append(head, body, note, actions);

  sheet.classList.remove('hidden');
  sheet.setAttribute('aria-hidden', 'false');

  try {
    close.focus({ preventScroll: true });
  } catch {
    close.focus();
  }

  setFooter(`${isAssets ? 'My Assets' : 'My Sites'} opened.`);
}

function siteTable(records) {
  const table = baseTable(['Site', 'Title', 'Root CID', 'Manifest CID', 'Owner', 'Actions']);
  const tbody = table.querySelector('tbody');

  for (const record of records) {
    const tr = document.createElement('tr');

    appendTextCell(tr, record.url || record.siteName || 'site');
    appendTextCell(tr, record.title || 'Untitled site');
    appendTextCell(tr, shortCid(record.rootCid));
    appendTextCell(tr, shortCid(record.manifestCid));
    appendTextCell(tr, record.ownerPassport || record.ownerWallet || '—');

    const actions = document.createElement('td');
    actions.className = 'local-catalog-row-actions';

    if (record.url) actions.append(rowButton('Open', 'data-crablink-open-url', record.url));
    if (record.url) actions.append(rowButton('Copy URL', 'data-crablink-copy', record.url));
    if (record.rootCid) actions.append(rowButton('Copy Root', 'data-crablink-copy', record.rootCid));
    if (record.manifestCid) actions.append(rowButton('Copy Manifest', 'data-crablink-copy', record.manifestCid));

    tr.append(actions);
    tbody.append(tr);
  }

  return table;
}

function assetTable(records) {
  const table = baseTable(['Kind', 'Title', 'Asset CID', 'Manifest CID', 'Owner', 'Actions']);
  const tbody = table.querySelector('tbody');

  for (const record of records) {
    const tr = document.createElement('tr');

    appendTextCell(tr, record.kind || 'asset');
    appendTextCell(tr, record.title || record.url || record.assetCid || 'Untitled asset');
    appendTextCell(tr, shortCid(record.assetCid));
    appendTextCell(tr, shortCid(record.manifestCid));
    appendTextCell(tr, record.ownerPassport || record.ownerWallet || '—');

    const actions = document.createElement('td');
    actions.className = 'local-catalog-row-actions';

    if (record.url) actions.append(rowButton('Open', 'data-crablink-open-url', record.url));
    if (record.url) actions.append(rowButton('Copy URL', 'data-crablink-copy', record.url));
    if (record.assetCid) actions.append(rowButton('Copy CID', 'data-crablink-copy', record.assetCid));
    if (record.manifestCid) actions.append(rowButton('Copy Manifest', 'data-crablink-copy', record.manifestCid));

    tr.append(actions);
    tbody.append(tr);
  }

  return table;
}

function baseTable(headers) {
  const wrap = document.createElement('div');
  wrap.className = 'local-catalog-table-wrap';

  const table = document.createElement('table');
  table.className = 'local-catalog-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  for (const header of headers) {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.append(th);
  }

  thead.append(headerRow);

  const tbody = document.createElement('tbody');
  table.append(thead, tbody);
  wrap.append(table);

  return wrap;
}

function appendTextCell(row, value) {
  const td = document.createElement('td');
  td.textContent = clean(value) || '—';
  row.append(td);
}

function rowButton(label, attr, value) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'local-catalog-row-button';
  button.textContent = label;
  button.setAttribute(attr, value);
  return button;
}

function emptyState(isAssets) {
  const empty = document.createElement('div');
  empty.className = 'local-catalog-empty';

  const title = document.createElement('h4');
  title.textContent = isAssets ? 'No local assets saved yet' : 'No local sites saved yet';

  const copy = document.createElement('p');
  copy.textContent = isAssets
    ? 'Open or create an image asset page, then come back here.'
    : 'Open or create a named site, then come back here.';

  empty.append(title, copy);
  return empty;
}

async function clearCatalog(kind) {
  const isAssets = kind === 'assets';
  await setCatalog(isAssets ? ASSETS_KEY : SITES_KEY, []);
  closeCatalog({ announce: false });
  await openCatalog(isAssets ? 'assets' : 'sites');
  setFooter(`${isAssets ? 'My Assets' : 'My Sites'} cleared.`);
}

function ensureSheet() {
  let sheet = document.getElementById(SHEET_ID);
  if (sheet) return sheet;

  sheet = document.createElement('section');
  sheet.id = SHEET_ID;
  sheet.className = 'local-catalog-sheet hidden';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-hidden', 'true');
  sheet.setAttribute('aria-label', 'CrabLink local catalogue');

  const scrim = document.createElement('button');
  scrim.type = 'button';
  scrim.className = 'local-catalog-scrim';
  scrim.title = 'Close local catalogue';
  scrim.setAttribute('data-crablink-close-catalog', '1');

  const panel = document.createElement('article');
  panel.id = PANEL_ID;
  panel.className = 'local-catalog-panel';

  sheet.append(scrim, panel);
  document.body.append(sheet);

  return sheet;
}

function closeCatalog({ announce = true } = {}) {
  const sheet = document.getElementById(SHEET_ID);
  if (!sheet) return;

  sheet.classList.add('hidden');
  sheet.setAttribute('aria-hidden', 'true');

  if (announce) setFooter('Local catalogue closed.');
}

async function getCatalog(key) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];

  const stored = await chrome.storage.local.get([key]);
  const raw = Array.isArray(stored?.[key]) ? stored[key] : [];

  if (key === SITES_KEY) return raw.map(normalizeSiteRecord).filter(siteIdentity).slice(0, MAX_RECORDS);
  return raw.map(normalizeAssetRecord).filter(assetIdentity).slice(0, MAX_RECORDS);
}

async function setCatalog(key, records) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;

  await chrome.storage.local.set({
    [key]: Array.isArray(records) ? records.slice(0, MAX_RECORDS) : []
  });
}

async function safeGetSettings() {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return {};
    return await chrome.storage.local.get(null);
  } catch {
    return {};
  }
}

function readDeveloperPayload() {
  const raw = clean(document.getElementById('developerJson')?.textContent || '');
  if (!raw || raw === '{}') return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function openCrabUrl(url) {
  const input = document.getElementById('addressInput');
  const form = document.getElementById('addressForm');

  if (!input || !form) {
    setFooter(url);
    return;
  }

  input.value = url;

  if (typeof form.requestSubmit === 'function') {
    form.requestSubmit();
    return;
  }

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

async function copyText(value, message) {
  const text = clean(value);
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    setFooter(message || 'Copied.');
  } catch {
    setFooter(text);
  }
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstPresent(...values) {
  for (const value of values) {
    if (value === 0) return '0';
    if (value === false) return 'false';
    if (value !== undefined && value !== null && clean(value) !== '') return value;
  }

  return '';
}

function normalizeB3(value) {
  const raw = clean(value).toLowerCase();

  if (/^b3:[0-9a-f]{64}$/.test(raw)) return raw;
  if (/^[0-9a-f]{64}$/.test(raw)) return `b3:${raw}`;

  return '';
}

function shortCid(value) {
  const cid = normalizeB3(value);
  if (!cid) return '—';
  return `${cid.slice(0, 10)}…${cid.slice(-8)}`;
}

function clean(value) {
  return String(value ?? '').trim();
}

function setFooter(message) {
  const footer = document.getElementById('footerStatus');
  if (footer) footer.textContent = message;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .passport-user-catalog-panel {
      display: grid;
      gap: 10px;
      margin-top: 12px;
      margin-bottom: 10px;
    }

    .passport-catalog-stat-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .passport-catalog-stat-box {
      min-width: 0;
      padding: 9px 8px;
      border: 1px solid rgba(34, 197, 94, 0.24);
      border-radius: 14px;
      background: rgba(2, 6, 23, 0.32);
    }

    .passport-catalog-stat-box span {
      display: block;
      color: #a7f3d0;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .passport-catalog-stat-box strong {
      display: block;
      margin-top: 4px;
      color: #f8fafc;
      font-size: 13px;
      font-weight: 950;
      line-height: 1.15;
      overflow-wrap: anywhere;
    }

    .passport-catalog-action-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .passport-catalog-action-button {
      min-height: 38px;
      padding: 8px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 950;
      white-space: nowrap;
    }

    .local-catalog-sheet.hidden { display: none !important; }

    .local-catalog-sheet {
      position: fixed;
      inset: 0;
      z-index: 95;
      display: grid;
      place-items: center;
      padding: 24px;
    }

    .local-catalog-scrim {
      position: absolute;
      inset: 0;
      border: 0;
      border-radius: 0;
      padding: 0;
      background: rgba(2, 6, 23, 0.68);
      cursor: pointer;
    }

    .local-catalog-scrim:hover {
      transform: none;
      background: rgba(2, 6, 23, 0.74);
    }

    .local-catalog-panel {
      position: relative;
      z-index: 1;
      width: min(1180px, calc(100vw - 44px));
      max-height: min(840px, calc(100vh - 44px));
      overflow: auto;
      display: grid;
      gap: 16px;
      padding: 22px;
      border: 1px solid rgba(34, 197, 94, 0.30);
      border-radius: 28px;
      background:
        radial-gradient(circle at top left, rgba(34, 197, 94, 0.16), transparent 42%),
        linear-gradient(180deg, rgba(17, 28, 49, 0.98), rgba(8, 17, 34, 0.98));
      box-shadow: 0 30px 100px rgba(0, 0, 0, 0.56);
      color: #f8fafc;
    }

    .local-catalog-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: start;
    }

    .local-catalog-eyebrow {
      margin: 0 0 6px;
      color: #86efac;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .local-catalog-head h3 {
      margin: 0;
      color: #bbf7d0;
      font-size: clamp(30px, 4vw, 48px);
      line-height: 1;
      letter-spacing: -0.06em;
    }

    .local-catalog-subtitle,
    .local-catalog-note {
      margin: 8px 0 0;
      color: #cbd5e1;
      font-size: 14px;
      line-height: 1.45;
    }

    .local-catalog-close {
      width: 48px;
      height: 48px;
      border-radius: 16px;
      padding: 0;
      font-size: 28px;
      line-height: 1;
    }

    .local-catalog-body {
      min-width: 0;
    }

    .local-catalog-table-wrap {
      overflow: auto;
      border: 1px solid rgba(148, 163, 184, 0.20);
      border-radius: 18px;
      background: rgba(2, 6, 23, 0.30);
    }

    .local-catalog-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 980px;
    }

    .local-catalog-table th,
    .local-catalog-table td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      text-align: left;
      vertical-align: top;
    }

    .local-catalog-table th {
      color: #a7f3d0;
      background: rgba(15, 23, 42, 0.72);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .local-catalog-table td {
      color: #f8fafc;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .local-catalog-row-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      min-width: 240px;
    }

    .local-catalog-row-button {
      min-height: 30px;
      padding: 6px 9px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 950;
    }

    .local-catalog-empty {
      padding: 22px;
      border: 1px solid rgba(148, 163, 184, 0.20);
      border-radius: 18px;
      background: rgba(2, 6, 23, 0.34);
    }

    .local-catalog-empty h4 {
      margin: 0;
      color: #bbf7d0;
      font-size: 22px;
    }

    .local-catalog-empty p {
      margin: 8px 0 0;
      color: #cbd5e1;
    }

    .local-catalog-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }

    .local-catalog-actions button {
      min-width: 140px;
    }

    @media (max-width: 720px) {
      .passport-catalog-stat-row,
      .passport-catalog-action-row {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .passport-catalog-action-button {
        font-size: 11px;
        padding-left: 5px;
        padding-right: 5px;
      }

      .local-catalog-actions {
        display: grid;
        grid-template-columns: 1fr;
      }

      .local-catalog-actions button {
        min-width: 0;
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