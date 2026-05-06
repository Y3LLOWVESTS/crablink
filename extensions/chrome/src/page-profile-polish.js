/**
 * RO:WHAT — Applies final profile-page polish without changing backend truth or profile publication semantics.
 * RO:WHY — NEXT_LEVEL identity UX; Concerns: DX/SEC; make crab://profile feel social while preserving local-only honesty.
 * RO:INTERACTS — page-profile-home.js, page-profile-editor.js, page-local-catalog.js, page.html, chrome.storage.local.
 * RO:INVARIANTS — local display only; no wallet mutation; no backend profile claim; no fake REP/MOD truth; no main-alt linkage.
 * RO:METRICS — none; client-side view polish only.
 * RO:CONFIG — reads local catalogue keys and safe display settings from chrome.storage.local.
 * RO:SECURITY — textContent/createElement only; no private keys; no spend authority; only uses existing CrabLink navigation hooks.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://profile with My Sites/My Assets catalogue preview.
 */

const STYLE_ID = 'crablinkProfilePolishStyles';
const PROFILE_SECTION_ID = 'profileHomeSection';
const POLISH_CLASS = 'crablink-profile-polished';
const STATUS_ID = 'profilePolishTruthStrip';
const CATALOG_ID = 'profilePolishCatalogPreview';
const DEV_DETAILS_ID = 'profilePolishDevDetails';
const SITES_KEY = 'crablinkRecentSitesV1';
const ASSETS_KEY = 'crablinkRecentAssetsV1';
const DRAFT_KEY = 'crablinkProfileDraftV1';
const MAX_PREVIEW_ITEMS = 3;

let renderTimer = 0;
let lastSignature = '';

function boot() {
  installStyles();
  schedulePolish();

  const root = document.getElementById('pagePanel') || document.body || document.documentElement;
  if (root) {
    const observer = new MutationObserver(schedulePolish);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'hidden']
    });
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;

      const watched = [
        SITES_KEY,
        ASSETS_KEY,
        DRAFT_KEY,
        'requestedHandle',
        'requestedUsername',
        'handle',
        'username',
        'usernameStatus',
        'profileCrabUrl',
        'publicProfileCid',
        'rocBalanceDisplay',
        'rocBalanceMinorUnits',
        'rocBalanceUpdatedAt',
        'rocLedgerBacked',
        'rocBalanceSource',
        'rocBalanceReason',
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
        schedulePolish();
      }
    });
  }

  document.addEventListener('crablink:profile-draft-updated', schedulePolish);
  document.addEventListener('crablink:open-profile-editor', () => {
    window.setTimeout(schedulePolish, 140);
    window.setTimeout(schedulePolish, 520);
  });

  for (const id of ['passportButton', 'drawerRefreshBalanceButton', 'drawerCheckNodeButton', 'drawerRefreshIdentityButton']) {
    document.getElementById(id)?.addEventListener('click', () => {
      window.setTimeout(schedulePolish, 120);
      window.setTimeout(schedulePolish, 480);
      window.setTimeout(schedulePolish, 1200);
    });
  }
}

function schedulePolish() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    polishProfilePage().catch((error) => {
      const footer = document.getElementById('footerStatus');
      if (footer) footer.textContent = `Profile polish skipped: ${error?.message || error}`;
    });
  }, 90);
}

async function polishProfilePage() {
  const section = document.getElementById(PROFILE_SECTION_ID);

  if (!section || section.classList.contains('hidden')) {
    lastSignature = '';
    return;
  }

  const payload = readDeveloperPayload();
  const schema = clean(payload?.schema || '');

  if (schema && !schema.includes('profile')) {
    return;
  }

  const [settings, profileDraft, sites, assets] = await Promise.all([
    getLocalSettings(),
    getProfileDraft(),
    getCatalog(SITES_KEY),
    getCatalog(ASSETS_KEY)
  ]);

  const profileRoc = profileRocDisplay(settings);
  const profileLedger = ledgerSummary(settings);

  const signature = JSON.stringify({
    handle: handleFrom(payload, settings),
    status: settings.usernameStatus,
    profileRoute: settings.profileCrabUrl,
    profileCid: settings.publicProfileCid,
    roc: profileRoc,
    ledger: profileLedger,
    draftSaved: Boolean(profileDraft.exists),
    draftAvatar: profileDraft.avatarCrabUrl,
    draftTags: profileDraft.tags,
    siteIds: sites.map(recordIdentity),
    assetIds: assets.map(recordIdentity),
    rep: firstScore(settings, [
      'reputationScorePercent',
      'reputationPercent',
      'repScorePercent',
      'reputationScore',
      'repScore'
    ]),
    mod: firstScore(settings, [
      'moderatorScorePercent',
      'moderationScorePercent',
      'modScorePercent',
      'moderatorScore',
      'moderationScore',
      'modScore'
    ])
  });

  if (signature === lastSignature && section.classList.contains(POLISH_CLASS)) {
    syncRocStatOnly(section, settings);
    return;
  }

  lastSignature = signature;
  section.classList.add(POLISH_CLASS);

  normalizeProfileStats(section, settings, profileDraft);
  ensureTruthStrip(section, payload, settings, profileDraft);
  ensureCatalogPreview(section, sites, assets);
  wrapDeveloperCards(section);
  improveCoverSpacing(section);
}

function syncRocStatOnly(section, settings) {
  const chips = Array.from(section.querySelectorAll('.profile-stat-chip'));

  for (const chip of chips) {
    const label = clean(chip.querySelector('span')?.textContent).replace(/:$/, '').toUpperCase();
    if (label !== 'ROC') continue;

    const strong = chip.querySelector('strong');
    const small = chip.querySelector('small');

    if (strong) {
      const display = profileRocDisplay(settings, strong.textContent);
      if (display) strong.textContent = display;
    }

    if (small) {
      small.textContent = ledgerSummary(settings);
    }
  }
}

function normalizeProfileStats(section, settings, profileDraft) {
  const chips = Array.from(section.querySelectorAll('.profile-stat-chip'));

  for (const chip of chips) {
    const label = clean(chip.querySelector('span')?.textContent).replace(/:$/, '').toUpperCase();
    const strong = chip.querySelector('strong');
    const small = chip.querySelector('small');

    if (!strong || !small) continue;

    if (label === 'ROC') {
      const display = profileRocDisplay(settings, strong.textContent);
      strong.textContent = display || '—';
      small.textContent = ledgerSummary(settings);
      chip.title = 'ROC balance display is backend-derived when svc-wallet is available; otherwise CrabLink labels fallback state honestly.';
      chip.classList.add('profile-stat-roc-polished');
      continue;
    }

    if (label === 'REP') {
      const rep = firstScore(settings, [
        'reputationScorePercent',
        'reputationPercent',
        'repScorePercent',
        'reputationScore',
        'repScore'
      ]);
      strong.textContent = rep || '—';
      small.textContent = rep ? 'backend/local signal' : 'not scored yet';
      chip.title = 'Reputation score remains blank unless backend or explicit safe local DTO state provides it.';
      chip.classList.add('profile-stat-pending-polished');
      continue;
    }

    if (label === 'MOD') {
      const mod = firstScore(settings, [
        'moderatorScorePercent',
        'moderationScorePercent',
        'modScorePercent',
        'moderatorScore',
        'moderationScore',
        'modScore'
      ]);
      strong.textContent = mod || '—';
      small.textContent = mod ? 'backend/local signal' : 'not scored yet';
      chip.title = 'Moderator score remains blank unless backend or explicit safe local DTO state provides it.';
      chip.classList.add('profile-stat-pending-polished');
      continue;
    }

    if (label === 'PROFILE') {
      strong.textContent = profileDraft.exists ? 'saved' : 'draft';
      small.textContent = profileDraft.exists ? 'local profile draft' : 'local only';
      chip.title = 'Profile data is local-only until RustyOnions publishes public profile/passport manifests.';
      chip.classList.add('profile-stat-profile-polished');
    }
  }
}

function ensureTruthStrip(section, payload, settings, profileDraft) {
  const cover = section.querySelector('.profile-cover-card');
  if (!cover) return;

  let strip = section.querySelector(`#${STATUS_ID}`);
  if (!strip) {
    strip = document.createElement('div');
    strip.id = STATUS_ID;
    strip.className = 'profile-polish-truth-strip';

    const about = cover.querySelector('.profile-about-panel');
    if (about) {
      cover.insertBefore(strip, about);
    } else {
      cover.append(strip);
    }
  }

  replaceChildren(
    strip,
    truthPill('Handle', handleStatusLabel(settings), handleStatusClass(settings)),
    truthPill('Profile route', settings.profileCrabUrl ? 'published' : 'not published', settings.profileCrabUrl ? 'ok' : 'pending'),
    truthPill('Profile CID', settings.publicProfileCid ? shortCid(settings.publicProfileCid) : 'not published', settings.publicProfileCid ? 'ok' : 'pending'),
    truthPill('Avatar', avatarStatus(profileDraft), avatarStatusClass(profileDraft)),
    truthPill('Source', sourceLabel(payload, settings), 'muted')
  );
}

function truthPill(label, value, tone = 'muted') {
  const pill = document.createElement('span');
  pill.className = `profile-polish-truth-pill ${tone}`;

  const term = document.createElement('span');
  term.textContent = `${label}:`;

  const body = document.createElement('strong');
  body.textContent = value || '—';

  pill.append(term, body);
  return pill;
}

function ensureCatalogPreview(section, sites, assets) {
  let preview = section.querySelector(`#${CATALOG_ID}`);
  if (!preview) {
    preview = document.createElement('section');
    preview.id = CATALOG_ID;
    preview.className = 'profile-polish-catalog-preview';

    const devDetails = section.querySelector(`#${DEV_DETAILS_ID}`);
    const cardGrid = section.querySelector('.profile-card-grid');

    if (devDetails) {
      section.insertBefore(preview, devDetails);
    } else if (cardGrid) {
      section.insertBefore(preview, cardGrid);
    } else {
      section.append(preview);
    }
  }

  const recentSites = sites.slice(0, MAX_PREVIEW_ITEMS);
  const recentAssets = assets.slice(0, MAX_PREVIEW_ITEMS);

  const head = document.createElement('div');
  head.className = 'profile-polish-catalog-head';

  const copy = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'profile-polish-eyebrow';
  eyebrow.textContent = 'Local creator library';

  const title = document.createElement('h3');
  title.textContent = 'My Sites & Assets';

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Local browser history only. Public profile catalogues are future backend work.';

  copy.append(eyebrow, title, subtitle);

  const actions = document.createElement('div');
  actions.className = 'profile-polish-catalog-actions';

  const sitesButton = document.createElement('button');
  sitesButton.type = 'button';
  sitesButton.className = 'secondary';
  sitesButton.textContent = `My Sites (${sites.length})`;
  sitesButton.setAttribute('data-crablink-open-catalog', 'sites');

  const assetsButton = document.createElement('button');
  assetsButton.type = 'button';
  assetsButton.className = 'secondary';
  assetsButton.textContent = `My Assets (${assets.length})`;
  assetsButton.setAttribute('data-crablink-open-catalog', 'assets');

  actions.append(sitesButton, assetsButton);
  head.append(copy, actions);

  const columns = document.createElement('div');
  columns.className = 'profile-polish-catalog-columns';

  columns.append(
    previewColumn(
      'Recent Sites',
      recentSites,
      sitePreviewItem,
      'No local sites captured yet. Open or create a crab://site to populate this list.'
    ),
    previewColumn(
      'Recent Assets',
      recentAssets,
      assetPreviewItem,
      'No local assets captured yet. Open or mint an image asset to populate this list.'
    )
  );

  replaceChildren(preview, head, columns);
}

function previewColumn(titleText, records, renderItem, emptyText) {
  const column = document.createElement('article');
  column.className = 'profile-polish-catalog-column';

  const title = document.createElement('h4');
  title.textContent = titleText;

  const list = document.createElement('div');
  list.className = 'profile-polish-mini-list';

  if (records.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'profile-polish-empty';
    empty.textContent = emptyText;
    list.append(empty);
  } else {
    for (const record of records) {
      list.append(renderItem(record));
    }
  }

  column.append(title, list);
  return column;
}

function sitePreviewItem(record) {
  return previewItem({
    eyebrow: 'site',
    title: record.title || record.siteName || record.url || 'Untitled site',
    subtitle: record.url || record.siteName || shortCid(record.rootCid),
    meta: record.rootCid ? `root ${shortCid(record.rootCid)}` : 'manifest-backed site',
    url: record.url,
    copyValue: record.url || record.rootCid || record.manifestCid
  });
}

function assetPreviewItem(record) {
  return previewItem({
    eyebrow: record.kind || 'asset',
    title: record.title || record.url || record.assetCid || 'Untitled asset',
    subtitle: record.url || shortCid(record.assetCid),
    meta: record.assetCid ? `asset ${shortCid(record.assetCid)}` : 'b3-backed asset',
    url: record.url,
    copyValue: record.url || record.assetCid || record.manifestCid
  });
}

function previewItem({ eyebrow, title, subtitle, meta, url, copyValue }) {
  const item = document.createElement('article');
  item.className = 'profile-polish-mini-item';

  const copy = document.createElement('div');
  copy.className = 'profile-polish-mini-copy';

  const top = document.createElement('span');
  top.textContent = eyebrow || 'item';

  const h = document.createElement('strong');
  h.textContent = title || 'Untitled';

  const p = document.createElement('p');
  p.textContent = subtitle || meta || 'local record';

  const small = document.createElement('small');
  small.textContent = meta || 'local record';

  copy.append(top, h, p, small);

  const actions = document.createElement('div');
  actions.className = 'profile-polish-mini-actions';

  if (url) {
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'secondary';
    open.textContent = 'Open';
    open.setAttribute('data-crablink-open-url', url);
    actions.append(open);
  }

  if (copyValue) {
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'secondary';
    copyButton.textContent = 'Copy';
    copyButton.setAttribute('data-crablink-copy', copyValue);
    actions.append(copyButton);
  }

  item.append(copy, actions);
  return item;
}

function wrapDeveloperCards(section) {
  const grid = section.querySelector('.profile-card-grid');
  if (!grid || grid.closest(`#${DEV_DETAILS_ID}`)) return;

  const details = document.createElement('details');
  details.id = DEV_DETAILS_ID;
  details.className = 'profile-polish-dev-details';

  const summary = document.createElement('summary');

  const title = document.createElement('span');
  title.textContent = 'Developer profile details';

  const hint = document.createElement('small');
  hint.textContent = 'Identity labels, SSO direction, and local actions';

  summary.append(title, hint);

  grid.parentNode.insertBefore(details, grid);
  details.append(summary, grid);
}

function improveCoverSpacing(section) {
  const cover = section.querySelector('.profile-cover-card');
  if (!cover) return;

  const handle = cover.querySelector('.profile-handle-line');
  if (handle) {
    handle.title = 'Local handle display. Backend username reservation is not wired yet unless status says backend confirmed.';
  }

  const edit = cover.querySelector('[data-crablink-edit-profile]');
  if (edit) {
    edit.classList.add('profile-polish-primary-edit');
  }

  const copyButton = cover.querySelector('[data-crablink-copy-profile-url]');
  if (copyButton) {
    copyButton.classList.add('profile-polish-copy-profile');
  }
}

async function getLocalSettings() {
  const defaults = {
    requestedHandle: '',
    requestedUsername: '',
    handle: '',
    username: '',
    usernameStatus: '',
    profileCrabUrl: '',
    publicProfileCid: '',
    rocBalanceDisplay: '',
    rocBalanceMinorUnits: '',
    rocBalanceUpdatedAt: '',
    rocLedgerBacked: false,
    rocBalanceSource: '',
    rocBalanceReason: '',
    reputationScore: '',
    reputationScorePercent: '',
    reputationPercent: '',
    repScore: '',
    repScorePercent: '',
    moderatorScore: '',
    moderatorScorePercent: '',
    moderationScore: '',
    moderationScorePercent: '',
    modScore: '',
    modScorePercent: ''
  };

  if (typeof chrome === 'undefined' || !chrome.storage?.local) return defaults;

  try {
    const stored = await chrome.storage.local.get(Object.keys(defaults));
    return { ...defaults, ...stored };
  } catch {
    return defaults;
  }
}

async function getProfileDraft() {
  const fallback = {
    exists: false,
    avatarCrabUrl: '',
    tags: []
  };

  if (typeof chrome === 'undefined' || !chrome.storage?.local) return fallback;

  try {
    const stored = await chrome.storage.local.get([DRAFT_KEY]);
    const draft = stored?.[DRAFT_KEY];
    if (!draft || typeof draft !== 'object') return fallback;

    return {
      ...fallback,
      ...draft,
      exists: true,
      avatarCrabUrl: clean(draft.avatarCrabUrl || draft.avatar_crab_url || ''),
      tags: Array.isArray(draft.tags) ? draft.tags.map(clean).filter(Boolean) : []
    };
  } catch {
    return fallback;
  }
}

async function getCatalog(key) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];

  try {
    const stored = await chrome.storage.local.get([key]);
    const records = stored?.[key];
    return Array.isArray(records) ? records.filter((record) => record && typeof record === 'object') : [];
  } catch {
    return [];
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

function handleFrom(payload, settings) {
  const raw = clean(
    payload?.handle ||
      payload?.username ||
      settings.handle ||
      settings.username ||
      settings.requestedHandle ||
      settings.requestedUsername ||
      ''
  );

  if (!raw) return '@username';
  return raw.startsWith('@') ? raw : `@${raw}`;
}

function handleStatusLabel(settings) {
  const status = clean(settings.usernameStatus || '');
  if (status === 'backend_confirmed' || status === 'confirmed') return 'backend confirmed';
  if (status === 'local_draft') return 'local draft';
  if (settings.requestedHandle || settings.requestedUsername) return 'local draft';
  return 'not chosen';
}

function handleStatusClass(settings) {
  const status = clean(settings.usernameStatus || '');
  if (status === 'backend_confirmed' || status === 'confirmed') return 'ok';
  if (status === 'local_draft' || settings.requestedHandle || settings.requestedUsername) return 'pending';
  return 'muted';
}

function avatarStatus(profileDraft) {
  if (!profileDraft.exists) return 'not created';
  if (isCanonicalImageUrl(profileDraft.avatarCrabUrl)) return 'b3 image draft';
  if (profileDraft.avatarCrabUrl) return 'invalid local URL';
  return 'no avatar';
}

function avatarStatusClass(profileDraft) {
  if (isCanonicalImageUrl(profileDraft.avatarCrabUrl)) return 'ok';
  if (profileDraft.avatarCrabUrl) return 'pending';
  return 'muted';
}

function sourceLabel(payload, settings) {
  const status = handleStatusLabel(settings);
  const routeKind = clean(payload?.route_kind || payload?.schema || 'profile');
  return `${status}; ${routeKind}`;
}

function ledgerSummary(settings) {
  const drawerLedger = clean(document.getElementById('drawerLedger')?.textContent);
  const source = clean(settings.rocBalanceSource);
  const reason = clean(settings.rocBalanceReason);

  if (isGoodText(drawerLedger) && !/unknown/i.test(drawerLedger)) {
    return drawerLedger.replace(/^svc_/, 'svc-');
  }

  if (settings.rocLedgerBacked === true) return 'ledger-backed';
  if (source) return source.replace(/^svc_/, 'svc-');
  if (reason) return reason;
  if (hasBalanceProof(settings)) return 'balance cache';

  return 'balance label';
}

function profileRocDisplay(settings, currentText = '') {
  const priorityCandidates = [
    document.getElementById('topRocBalance')?.textContent,
    document.getElementById('passportCatalogRoc')?.textContent,
    document.getElementById('drawerRoc')?.textContent,
    settings.rocBalanceDisplay,
    settings.rocBalanceMinorUnits,
    currentText
  ];

  for (const candidate of priorityCandidates) {
    const display = normalizeRocCandidate(candidate, settings, { allowZero: false });
    if (display) return display;
  }

  for (const candidate of priorityCandidates) {
    const display = normalizeRocCandidate(candidate, settings, { allowZero: hasBalanceProof(settings) });
    if (display) return display;
  }

  return '';
}

function normalizeRocCandidate(value, settings, options = {}) {
  const allowZero = Boolean(options.allowZero);
  const raw = clean(value);

  if (!isGoodText(raw)) return '';

  const display = stripRocUnit(raw);
  if (!isGoodText(display)) return '';

  if (display === '0' && !allowZero) return '';

  const numericLike = display.replaceAll(',', '');
  if (/^\d+$/.test(numericLike)) {
    return display;
  }

  if (/^\d+\.\d+$/.test(numericLike)) {
    return display.replace(/\.0+$/, '');
  }

  if (settings.rocLedgerBacked === true && display !== 'unknown') {
    return display;
  }

  return '';
}

function hasBalanceProof(settings) {
  return Boolean(
    settings.rocLedgerBacked === true ||
      clean(settings.rocBalanceUpdatedAt) ||
      clean(settings.rocBalanceSource) ||
      clean(settings.rocBalanceReason) ||
      clean(document.getElementById('drawerLedger')?.textContent).toLowerCase().includes('ledger')
  );
}

function stripRocUnit(value) {
  const raw = clean(value);
  if (!raw || raw === '—') return '';

  const withoutLedgerDetail = raw.replace(/\s*\(.*?\)\s*$/g, '').trim();
  const withoutRoc = withoutLedgerDetail.replace(/\s*ROC\b.*$/i, '').trim();

  return withoutRoc || withoutLedgerDetail || raw;
}

function recordIdentity(record) {
  return clean(record.url || record.siteName || record.assetCid || record.rootCid || record.manifestCid || record.title);
}

function firstScore(settings, keys) {
  for (const key of keys) {
    const formatted = formatPercent(settings?.[key]);
    if (formatted) return formatted;
  }

  return '';
}

function formatPercent(value) {
  const raw = clean(value);
  if (!raw || raw === '—' || raw === '-') return '';

  if (/^[-+]?\d+(\.\d+)?%$/.test(raw)) return raw;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return '';

  const bounded = Math.max(0, Math.min(100, parsed));
  const rounded = Number.isInteger(bounded) ? String(bounded) : bounded.toFixed(1).replace(/\.0$/, '');
  return `${rounded}%`;
}

function isCanonicalImageUrl(value) {
  return /^crab:\/\/[0-9a-f]{64}\.image$/.test(clean(value));
}

function shortCid(value) {
  const raw = clean(value);
  if (!raw) return '—';
  if (raw.length <= 18) return raw;
  return `${raw.slice(0, 10)}…${raw.slice(-8)}`;
}

function isGoodText(value) {
  const raw = clean(value);
  if (!raw) return false;
  if (raw === '—' || raw === '-' || raw === '–') return false;
  if (/^(unknown|undefined|null|nan)$/i.test(raw)) return false;
  return true;
}

function replaceChildren(node, ...children) {
  node.textContent = '';
  node.append(...children);
}

function clean(value) {
  return String(value ?? '').trim();
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #passportDrawer.passport-drawer {
      background:
        radial-gradient(circle at 8% 0%, rgba(34, 197, 94, 0.13), transparent 34%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.985), rgba(8, 17, 34, 0.992)) !important;
      border-color: rgba(96, 165, 250, 0.24) !important;
      box-shadow:
        0 34px 110px rgba(0, 0, 0, 0.70),
        0 0 0 1px rgba(148, 163, 184, 0.08) inset !important;
      backdrop-filter: blur(18px) saturate(125%) !important;
      -webkit-backdrop-filter: blur(18px) saturate(125%) !important;
      isolation: isolate;
    }

    #passportDrawer.passport-drawer::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: -1;
      border-radius: inherit;
      background: rgba(8, 17, 34, 0.94);
      pointer-events: none;
    }

    #passportDrawer .drawer-grid > div,
    #passportDrawer .passport-catalog-stat-box,
    #passportDrawer .drawer-message {
      background: rgba(8, 17, 34, 0.82) !important;
    }

    #passportDrawer .drawer-actions button,
    #passportDrawer .passport-catalog-action-button,
    #passportDrawer .passport-alt-vault-button {
      text-shadow: 0 1px 10px rgba(0, 0, 0, 0.22);
    }

    .${POLISH_CLASS} {
      gap: 18px !important;
    }

    .${POLISH_CLASS} .profile-cover-card {
      position: relative;
      overflow: hidden;
    }

    .${POLISH_CLASS} .profile-cover-card::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 8% 8%, rgba(34, 197, 94, 0.13), transparent 36%),
        radial-gradient(circle at 88% 18%, rgba(59, 130, 246, 0.12), transparent 34%);
      opacity: 0.78;
    }

    .${POLISH_CLASS} .profile-cover-card > * {
      position: relative;
      z-index: 1;
    }

    .${POLISH_CLASS} .profile-cover-top {
      align-items: start;
    }

    .${POLISH_CLASS} .profile-cover-identity h2 {
      letter-spacing: -0.065em;
    }

    .${POLISH_CLASS} .profile-handle-line {
      color: #86efac;
      font-weight: 950;
    }

    .profile-polish-primary-edit {
      box-shadow: 0 12px 32px rgba(37, 99, 235, 0.24);
    }

    .profile-polish-copy-profile {
      opacity: 0.92;
    }

    .${POLISH_CLASS} .profile-stat-grid {
      gap: 10px;
    }

    .${POLISH_CLASS} .profile-stat-chip {
      min-height: 96px;
      border-radius: 20px;
      background:
        radial-gradient(circle at top left, rgba(148, 163, 184, 0.11), transparent 42%),
        rgba(15, 23, 42, 0.56);
    }

    .${POLISH_CLASS} .profile-stat-chip strong {
      letter-spacing: -0.045em;
    }

    .profile-stat-roc-polished {
      border-color: rgba(34, 197, 94, 0.32) !important;
      background:
        radial-gradient(circle at top left, rgba(34, 197, 94, 0.17), transparent 46%),
        rgba(15, 23, 42, 0.58) !important;
    }

    .profile-stat-roc-polished strong {
      color: #86efac !important;
    }

    .profile-stat-pending-polished strong {
      color: #e2e8f0 !important;
    }

    .profile-stat-profile-polished strong {
      color: #bfdbfe !important;
    }

    .profile-polish-truth-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 20px;
      background: rgba(2, 6, 23, 0.30);
    }

    .profile-polish-truth-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 32px;
      padding: 7px 10px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 999px;
      color: #cbd5e1;
      background: rgba(15, 23, 42, 0.48);
      font-size: 12px;
      line-height: 1;
    }

    .profile-polish-truth-pill span {
      color: #94a3b8;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .profile-polish-truth-pill strong {
      color: #f8fafc;
      font-weight: 950;
    }

    .profile-polish-truth-pill.ok {
      border-color: rgba(34, 197, 94, 0.34);
      color: #bbf7d0;
      background: rgba(22, 101, 52, 0.15);
    }

    .profile-polish-truth-pill.ok strong {
      color: #bbf7d0;
    }

    .profile-polish-truth-pill.pending {
      border-color: rgba(251, 191, 36, 0.36);
      color: #fde68a;
      background: rgba(113, 63, 18, 0.18);
    }

    .profile-polish-truth-pill.pending strong {
      color: #fde68a;
    }

    .profile-polish-catalog-preview,
    .profile-polish-dev-details {
      border: 1px solid rgba(34, 197, 94, 0.22);
      border-radius: 26px;
      background:
        radial-gradient(circle at top left, rgba(34, 197, 94, 0.10), transparent 42%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(8, 17, 34, 0.92));
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.20);
    }

    .profile-polish-catalog-preview {
      display: grid;
      gap: 14px;
      padding: 18px;
    }

    .profile-polish-catalog-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
    }

    .profile-polish-eyebrow {
      margin: 0 0 6px;
      color: #86efac;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .profile-polish-catalog-head h3,
    .profile-polish-catalog-column h4 {
      margin: 0;
      color: #f8fafc;
      letter-spacing: -0.04em;
    }

    .profile-polish-catalog-head h3 {
      font-size: 24px;
    }

    .profile-polish-catalog-head p:not(.profile-polish-eyebrow) {
      margin: 6px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .profile-polish-catalog-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }

    .profile-polish-catalog-actions button,
    .profile-polish-mini-actions button {
      min-height: 34px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 950;
    }

    .profile-polish-catalog-columns {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .profile-polish-catalog-column {
      display: grid;
      gap: 10px;
      min-width: 0;
      padding: 14px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 22px;
      background: rgba(2, 6, 23, 0.26);
    }

    .profile-polish-mini-list {
      display: grid;
      gap: 9px;
    }

    .profile-polish-mini-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      min-width: 0;
      padding: 11px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.44);
    }

    .profile-polish-mini-copy {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .profile-polish-mini-copy span {
      color: #86efac;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.10em;
      text-transform: uppercase;
    }

    .profile-polish-mini-copy strong {
      color: #f8fafc;
      overflow-wrap: anywhere;
    }

    .profile-polish-mini-copy p,
    .profile-polish-mini-copy small,
    .profile-polish-empty {
      margin: 0;
      color: #94a3b8;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .profile-polish-mini-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: flex-end;
    }

    .profile-polish-dev-details {
      overflow: hidden;
    }

    .profile-polish-dev-details > summary {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      padding: 15px 17px;
      cursor: pointer;
      color: #f8fafc;
      font-weight: 950;
      list-style: none;
    }

    .profile-polish-dev-details > summary::-webkit-details-marker {
      display: none;
    }

    .profile-polish-dev-details > summary::after {
      content: '⌄';
      color: #86efac;
      font-size: 18px;
      line-height: 1;
      transition: transform 150ms ease;
    }

    .profile-polish-dev-details[open] > summary::after {
      transform: rotate(180deg);
    }

    .profile-polish-dev-details > summary small {
      color: #94a3b8;
      font-size: 12px;
      font-weight: 700;
      text-align: right;
    }

    .profile-polish-dev-details .profile-card-grid {
      padding: 0 17px 17px;
    }

    @media (max-width: 980px) {
      .${POLISH_CLASS} .profile-cover-top,
      .${POLISH_CLASS} .profile-cover-left,
      .profile-polish-catalog-head,
      .profile-polish-dev-details > summary {
        grid-template-columns: 1fr !important;
        flex-direction: column;
        align-items: stretch;
      }

      .profile-polish-catalog-columns {
        grid-template-columns: 1fr;
      }

      .profile-polish-catalog-actions,
      .profile-polish-mini-actions {
        justify-content: flex-start;
      }

      .profile-polish-mini-item {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .${POLISH_CLASS} .profile-avatar-frame {
        width: 132px !important;
        height: 132px !important;
      }

      .${POLISH_CLASS} .profile-cover-actions {
        display: grid !important;
        grid-template-columns: 1fr !important;
      }

      .${POLISH_CLASS} .profile-cover-actions button {
        width: 100% !important;
      }

      .profile-polish-truth-strip {
        display: grid;
        grid-template-columns: 1fr;
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