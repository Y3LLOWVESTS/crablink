/**
 * RO:WHAT — Adds creator username/profile proof and tabbed site manifest proof to rendered crab:// sites.
 * RO:WHY — NEXT_LEVEL product polish; Concerns: DX/SEC; show identity/manifest proof without cluttering the site page.
 * RO:INTERACTS — page-site-render-mode.js, page.html, storage.js, developer JSON payloads from svc-gateway/omnigate.
 * RO:INVARIANTS — gateway-only; read-only DOM enhancement; no backend mutation; no fake reputation/profile/manifest truth.
 * RO:METRICS — none; displayed values are backend/manifest/passport fields when present.
 * RO:CONFIG — reads local display labels only from chrome.storage through storage.js.
 * RO:SECURITY — no innerHTML; no script injection; profile navigation only uses explicit backend-published crab:// profile URLs.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://<site> creator and manifest popup checks.
 */

import { getSettings } from './storage.js';

const SITE_SCHEMA = 'omnigate.site-page.v1';
const STYLE_ID = 'crablinkSiteCreatorProofStyles';
const VIEWPORT_ID = 'crablinkSiteViewport';
const CREATOR_HANDLE_ID = 'crablinkSiteCreatorHandle';
const CREATOR_STATS_ID = 'crablinkSiteCreatorStats';
const PROFILE_SHEET_ID = 'crablinkCreatorProfileSheet';
const PROFILE_PANEL_ID = 'crablinkCreatorProfilePanel';
const MANIFEST_SHEET_ID = 'crablinkSiteManifestSheet';
const MANIFEST_PANEL_ID = 'crablinkSiteManifestPanel';

let renderTimer = 0;
let lastSignature = '';

function boot() {
  installStyles();
  scheduleEnhance();

  const observed = document.getElementById('pagePanel') || document.body || document.documentElement;
  if (observed) {
    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(observed, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'open']
    });
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;

      const watched = [
        'requestedHandle',
        'requestedUsername',
        'handle',
        'username',
        'usernameStatus',
        'profileCrabUrl',
        'publicProfileCid',
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
        scheduleEnhance();
      }
    });
  }

  document.addEventListener('click', (event) => {
    const creatorButton = event.target?.closest?.(`#${CREATOR_HANDLE_ID}`);
    if (creatorButton) {
      const payload = readPayload();
      if (!payload || payload.schema !== SITE_SCHEMA) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      void openCreatorProof(payload);
      return;
    }

    const manifestButton = findManifestButtonFromEvent(event);
    if (manifestButton) {
      const payload = readPayload();
      if (!payload || payload.schema !== SITE_SCHEMA) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      openManifestProof(payload);
      return;
    }

    const closeSheet = event.target?.closest?.('[data-crablink-close-proof-sheet]');
    if (closeSheet) {
      event.preventDefault();
      closeProofSheets();
      return;
    }

    const tab = event.target?.closest?.('[data-crablink-manifest-tab]');
    if (tab) {
      event.preventDefault();
      activateManifestTab(tab.getAttribute('data-crablink-manifest-tab'));
      return;
    }

    const copyValue = event.target?.closest?.('[data-crablink-copy-proof]')?.getAttribute('data-crablink-copy-proof');
    if (copyValue) {
      event.preventDefault();
      void copyText(copyValue);
      return;
    }

    const openUrl = event.target?.closest?.('[data-crablink-open-proof-url]')?.getAttribute('data-crablink-open-proof-url');
    if (openUrl) {
      event.preventDefault();
      closeProofSheets();
      openCrabUrl(openUrl);
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeProofSheets();
    }
  });
}

function scheduleEnhance() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    enhanceSiteCreatorProof().catch((error) => {
      setFooter(`Creator proof skipped: ${error?.message || error}`);
    });
  }, 80);
}

async function enhanceSiteCreatorProof() {
  const payload = readPayload();
  const viewport = document.getElementById(VIEWPORT_ID);
  const creatorButton = document.getElementById(CREATOR_HANDLE_ID);

  if (!payload || payload.schema !== SITE_SCHEMA || !viewport || !creatorButton) {
    lastSignature = '';
    return;
  }

  const settings = await safeSettings();
  const creator = creatorInfo(payload, settings);
  const manifest = manifestInfo(payload);
  const signature = JSON.stringify({
    site: siteUrl(payload),
    handle: creator.handle,
    source: creator.source,
    profileUrl: creator.profileUrl,
    profileCid: creator.profileCid,
    rep: creator.reputation,
    mod: creator.moderator,
    root: rootCid(payload),
    manifestCid: manifest.manifestCid
  });

  if (signature === lastSignature && document.getElementById(CREATOR_STATS_ID)) {
    return;
  }

  lastSignature = signature;

  creatorButton.textContent = creator.handle;
  creatorButton.title = creator.profileUrl
    ? `Open read-only creator proof. Backend-published profile route: ${creator.profileUrl}`
    : 'Open read-only creator proof. No backend-published profile route is available yet.';

  creatorButton.setAttribute('data-creator-source', creator.source);
  creatorButton.setAttribute('data-profile-published', creator.profileUrl ? '1' : '0');

  ensureCreatorStats(creatorButton, creator);
  upgradeManifestButton(viewport);
}

function ensureCreatorStats(creatorButton, creator) {
  const chip = creatorButton.closest('.site-creator-chip');
  if (!chip) return;

  let stats = document.getElementById(CREATOR_STATS_ID);
  if (!stats) {
    stats = document.createElement('span');
    stats.id = CREATOR_STATS_ID;
    stats.className = 'site-creator-stats';
    chip.append(stats);
  }

  replaceChildren(
    stats,
    creatorStat('REP', creator.reputation || '—', creator.reputation ? 'ok' : 'pending'),
    creatorStat('MOD', creator.moderator || '—', creator.moderator ? 'ok' : 'pending'),
    creatorStat('Source', creator.sourceLabel, creator.sourceTone)
  );
}

function creatorStat(label, value, tone) {
  const item = document.createElement('span');
  item.className = `site-creator-stat ${tone || 'muted'}`;

  const term = document.createElement('span');
  term.textContent = `${label}:`;

  const body = document.createElement('strong');
  body.textContent = value || '—';

  item.append(term, body);
  return item;
}

function upgradeManifestButton(viewport) {
  const button = findManifestButton(viewport);
  if (!button) return;

  button.classList.add('site-manifest-modal-button');
  button.title = 'Open tabbed site manifest proof.';
  button.setAttribute('data-crablink-site-manifest-modal', '1');
}

function findManifestButtonFromEvent(event) {
  const button = event.target?.closest?.('button');
  if (!button) return null;
  if (button.getAttribute('data-crablink-site-manifest-modal') === '1') return button;
  if (clean(button.textContent).toLowerCase() === 'site manifest') return button;
  return null;
}

function findManifestButton(root) {
  for (const button of root.querySelectorAll('button')) {
    if (clean(button.textContent).toLowerCase() === 'site manifest') {
      return button;
    }
  }

  return null;
}

async function openCreatorProof(payload) {
  const settings = await safeSettings();
  const creator = creatorInfo(payload, settings);
  const site = siteInfo(payload);
  const sheet = ensureSheet(PROFILE_SHEET_ID, PROFILE_PANEL_ID, 'Creator proof');

  const panel = sheet.querySelector(`#${PROFILE_PANEL_ID}`);
  panel.textContent = '';

  const head = proofHead({
    eyebrow: 'site creator',
    title: creator.handle,
    subtitle: creator.profileUrl
      ? 'Backend-published creator profile route is available.'
      : 'Read-only creator proof. No backend-published profile route is available yet.'
  });

  const hero = document.createElement('section');
  hero.className = 'creator-proof-hero';

  const avatar = document.createElement('div');
  avatar.className = 'creator-proof-avatar';
  avatar.textContent = avatarLetters(creator.handle);

  const copy = document.createElement('div');
  copy.className = 'creator-proof-copy';

  const handle = document.createElement('h4');
  handle.textContent = creator.handle;

  const source = document.createElement('p');
  source.className = 'creator-proof-source';
  source.textContent = `Creator source: ${creator.sourceLabel}`;

  const note = document.createElement('p');
  note.textContent = creator.profileUrl
    ? 'CrabLink can open this published profile route, but still treats the page as read-only proof.'
    : 'CrabLink will not synthesize a crab://@username profile. A clickable profile requires backend/manifest-published proof.';

  copy.append(handle, source, note);
  hero.append(avatar, copy);

  const grid = document.createElement('div');
  grid.className = 'creator-proof-grid';

  grid.append(
    proofCard('Handle', creator.handle),
    proofCard('Profile route', creator.profileUrl || 'not published'),
    proofCard('Profile CID', creator.profileCid || 'not published'),
    proofCard('Owner passport', creator.ownerPassport || 'not declared'),
    proofCard('Owner wallet', creator.ownerWallet || 'not declared'),
    proofCard('Reputation', creator.reputation || 'not scored yet'),
    proofCard('Moderator score', creator.moderator || 'not scored yet'),
    proofCard('Site', site.url),
    proofCard('Site title', site.title),
    proofCard('Root document', rootCid(payload) || 'not declared')
  );

  const actions = document.createElement('div');
  actions.className = 'creator-proof-actions';

  if (creator.profileUrl) {
    actions.append(actionButton('Open Profile', 'data-crablink-open-proof-url', creator.profileUrl));
    actions.append(actionButton('Copy Profile URL', 'data-crablink-copy-proof', creator.profileUrl, true));
  }

  actions.append(actionButton('Copy Handle', 'data-crablink-copy-proof', creator.handle, true));
  actions.append(actionButton('Copy Site URL', 'data-crablink-copy-proof', site.url, true));

  const truth = document.createElement('p');
  truth.className = 'creator-proof-truth-note';
  truth.textContent =
    'Truth boundary: this modal displays backend/manifest/local display fields only. It does not publish profiles, create identity routes, mutate wallets, or claim reputation/moderation truth unless supplied.';

  panel.append(head, hero, grid, actions, truth);
  showSheet(sheet);
}

function openManifestProof(payload) {
  const sheet = ensureSheet(MANIFEST_SHEET_ID, MANIFEST_PANEL_ID, 'Site manifest proof');
  const panel = sheet.querySelector(`#${MANIFEST_PANEL_ID}`);

  panel.textContent = '';

  const site = siteInfo(payload);
  const manifest = manifestInfo(payload);

  const head = proofHead({
    eyebrow: 'manifest proof',
    title: site.title,
    subtitle: `${site.url} • ${manifest.manifestCid || 'manifest CID not declared'}`
  });

  const tabs = buildManifestTabs(payload);
  panel.append(head, tabs);
  showSheet(sheet);
}

function buildManifestTabs(payload) {
  const root = document.createElement('section');
  root.className = 'site-manifest-proof';

  const tabs = document.createElement('div');
  tabs.className = 'site-manifest-tabs';
  tabs.setAttribute('role', 'tablist');

  const panels = document.createElement('div');
  panels.className = 'site-manifest-tab-panels';

  const tabDefs = [
    ['summary', 'Summary', manifestSummaryPanel(payload)],
    ['ownership', 'Ownership', manifestOwnershipPanel(payload)],
    ['routes', 'Routes', manifestMapPanel('Routes', routeMap(payload), 'No routes declared.')],
    ['assets', 'Assets', manifestMapPanel('Assets', assetMap(payload), 'No assets declared.')],
    ['receipts', 'Receipts', receiptsPanel(payload)],
    ['raw', 'Raw JSON', rawPanel(payload)]
  ];

  for (const [key, label, panel] of tabDefs) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = key === 'summary' ? 'site-manifest-tab active' : 'site-manifest-tab';
    button.textContent = label;
    button.setAttribute('data-crablink-manifest-tab', key);
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', key === 'summary' ? 'true' : 'false');

    panel.classList.add('site-manifest-tab-panel');
    panel.dataset.manifestPanel = key;
    if (key !== 'summary') {
      panel.classList.add('hidden');
    }

    tabs.append(button);
    panels.append(panel);
  }

  root.append(tabs, panels);
  return root;
}

function activateManifestTab(key) {
  const safeKey = clean(key) || 'summary';

  for (const button of document.querySelectorAll('.site-manifest-tab')) {
    const active = button.getAttribute('data-crablink-manifest-tab') === safeKey;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  }

  for (const panel of document.querySelectorAll('.site-manifest-tab-panel')) {
    panel.classList.toggle('hidden', panel.dataset.manifestPanel !== safeKey);
  }
}

function manifestSummaryPanel(payload) {
  const panel = document.createElement('div');
  panel.className = 'site-manifest-summary';

  const site = siteInfo(payload);
  const manifest = manifestInfo(payload);

  const grid = document.createElement('div');
  grid.className = 'site-manifest-grid';

  grid.append(
    proofCard('Crab URL', site.url),
    proofCard('Title', site.title),
    proofCard('Description', site.description || 'not declared'),
    proofCard('Site name', site.name || 'not declared'),
    proofCard('Root document CID', rootCid(payload) || 'not declared'),
    proofCard('Manifest CID', manifest.manifestCid || 'not declared'),
    proofCard('Manifest status', manifest.status || 'unknown'),
    proofCard('Hydration status', manifest.hydrationStatus || 'unknown'),
    proofCard('Route count', String(Object.keys(routeMap(payload)).length)),
    proofCard('Asset count', String(Object.keys(assetMap(payload)).length))
  );

  const actions = document.createElement('div');
  actions.className = 'site-manifest-actions';

  actions.append(actionButton('Copy Site URL', 'data-crablink-copy-proof', site.url, true));
  if (rootCid(payload)) actions.append(actionButton('Copy Root CID', 'data-crablink-copy-proof', rootCid(payload), true));
  if (manifest.manifestCid) actions.append(actionButton('Copy Manifest CID', 'data-crablink-copy-proof', manifest.manifestCid, true));

  panel.append(grid, actions);
  return panel;
}

function manifestOwnershipPanel(payload) {
  const panel = document.createElement('div');
  panel.className = 'site-manifest-summary';

  const owner = ownerInfo(payload);
  const payout = payoutInfo(payload);
  const creator = creatorInfo(payload, {});

  const grid = document.createElement('div');
  grid.className = 'site-manifest-grid';

  grid.append(
    proofCard('Site creator', creator.handle),
    proofCard('Creator source', creator.sourceLabel),
    proofCard('Owner passport', owner.passport || 'not declared'),
    proofCard('Owner wallet', owner.wallet || 'not declared'),
    proofCard('Payout account', payout.account || 'not declared'),
    proofCard('Payout action', payout.action || 'not declared'),
    proofCard('Reputation', creator.reputation || 'not scored yet'),
    proofCard('Moderator score', creator.moderator || 'not scored yet'),
    proofCard('Profile route', creator.profileUrl || 'not published'),
    proofCard('Profile CID', creator.profileCid || 'not published')
  );

  panel.append(grid);
  return panel;
}

function manifestMapPanel(title, map, emptyText) {
  const panel = document.createElement('div');
  panel.className = 'site-manifest-map-panel';

  const h = document.createElement('h4');
  h.textContent = title;

  const keys = Object.keys(map || {});
  if (keys.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'site-proof-empty';
    empty.textContent = emptyText;
    panel.append(h, empty);
    return panel;
  }

  const list = document.createElement('div');
  list.className = 'site-manifest-map-list';

  for (const key of keys.sort()) {
    const row = document.createElement('article');
    row.className = 'site-manifest-map-row';

    const left = document.createElement('div');

    const route = document.createElement('strong');
    route.textContent = key;

    const value = document.createElement('p');
    value.textContent = clean(map[key]) || '—';

    left.append(route, value);

    const actions = document.createElement('div');
    actions.className = 'site-manifest-row-actions';

    if (clean(map[key])) {
      actions.append(actionButton('Copy', 'data-crablink-copy-proof', clean(map[key]), true));
    }

    row.append(left, actions);
    list.append(row);
  }

  panel.append(h, list);
  return panel;
}

function receiptsPanel(payload) {
  const panel = document.createElement('div');
  panel.className = 'site-manifest-map-panel';

  const h = document.createElement('h4');
  h.textContent = 'Receipts';

  const receipts = normalizeReceipts(payload);

  if (receipts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'site-proof-empty';
    empty.textContent = 'No receipts were included in this site page response.';
    panel.append(h, empty);
    return panel;
  }

  const list = document.createElement('div');
  list.className = 'site-manifest-map-list';

  receipts.forEach((receipt, index) => {
    const row = document.createElement('article');
    row.className = 'site-manifest-map-row';

    const left = document.createElement('div');

    const title = document.createElement('strong');
    title.textContent = clean(receipt.id || receipt.receipt_id || receipt.hash || `receipt ${index + 1}`);

    const text = document.createElement('p');
    text.textContent = safeJsonLine(receipt);

    left.append(title, text);

    const actions = document.createElement('div');
    actions.className = 'site-manifest-row-actions';
    actions.append(actionButton('Copy', 'data-crablink-copy-proof', JSON.stringify(receipt, null, 2), true));

    row.append(left, actions);
    list.append(row);
  });

  panel.append(h, list);
  return panel;
}

function rawPanel(payload) {
  const panel = document.createElement('div');
  panel.className = 'site-manifest-raw-panel';

  const actions = document.createElement('div');
  actions.className = 'site-manifest-actions';
  actions.append(actionButton('Copy Raw JSON', 'data-crablink-copy-proof', JSON.stringify(payload, null, 2), true));

  const pre = document.createElement('pre');
  pre.className = 'site-manifest-raw-json';
  pre.textContent = JSON.stringify(payload, null, 2);

  panel.append(actions, pre);
  return panel;
}

function ensureSheet(sheetId, panelId, label) {
  let sheet = document.getElementById(sheetId);
  if (sheet) return sheet;

  sheet = document.createElement('section');
  sheet.id = sheetId;
  sheet.className = 'proof-sheet hidden';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-hidden', 'true');
  sheet.setAttribute('aria-label', label);

  const scrim = document.createElement('button');
  scrim.type = 'button';
  scrim.className = 'proof-sheet-scrim';
  scrim.setAttribute('data-crablink-close-proof-sheet', '1');
  scrim.title = 'Close proof modal';

  const panel = document.createElement('article');
  panel.id = panelId;
  panel.className = 'proof-sheet-panel';

  sheet.append(scrim, panel);
  document.body.append(sheet);

  return sheet;
}

function showSheet(sheet) {
  sheet.classList.remove('hidden');
  sheet.setAttribute('aria-hidden', 'false');

  const close = sheet.querySelector('[data-crablink-close-proof-sheet]');
  if (close) {
    try {
      close.focus({ preventScroll: true });
    } catch {
      close.focus();
    }
  }
}

function closeProofSheets() {
  for (const sheet of document.querySelectorAll('.proof-sheet')) {
    sheet.classList.add('hidden');
    sheet.setAttribute('aria-hidden', 'true');
  }
}

function proofHead({ eyebrow, title, subtitle }) {
  const head = document.createElement('header');
  head.className = 'proof-sheet-head';

  const copy = document.createElement('div');

  const eye = document.createElement('p');
  eye.className = 'proof-eyebrow';
  eye.textContent = eyebrow || 'proof';

  const h = document.createElement('h3');
  h.textContent = title || 'Proof';

  const p = document.createElement('p');
  p.textContent = subtitle || '';

  copy.append(eye, h, p);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'proof-close';
  close.textContent = '×';
  close.setAttribute('data-crablink-close-proof-sheet', '1');
  close.title = 'Close';

  head.append(copy, close);
  return head;
}

function proofCard(label, value) {
  const card = document.createElement('article');
  card.className = 'proof-card';

  const term = document.createElement('span');
  term.textContent = label;

  const body = document.createElement('strong');
  body.textContent = clean(value) || '—';

  card.append(term, body);
  return card;
}

function actionButton(label, attr, value, secondary = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;

  if (secondary) {
    button.className = 'secondary';
  }

  button.setAttribute(attr, value);
  return button;
}

async function safeSettings() {
  try {
    return await getSettings();
  } catch {
    return {};
  }
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

function siteInfo(payload) {
  return {
    url: siteUrl(payload),
    name: clean(payload.site_name || payload.name || ''),
    title: clean(payload.metadata?.title || payload.title || payload.site_name || payload.name || 'RON Site'),
    description: clean(payload.metadata?.description || payload.description || '')
  };
}

function siteUrl(payload) {
  return clean(
    payload.links?.crab ||
      payload.crab_url ||
      (payload.site_name ? `crab://${payload.site_name}` : payload.name ? `crab://${payload.name}` : 'crab://site')
  );
}

function manifestInfo(payload) {
  const manifest = payload.manifest && typeof payload.manifest === 'object' ? payload.manifest : {};
  return {
    manifestCid: clean(manifest.manifest_cid || manifest.manifestCid || payload.manifest_cid || payload.manifestCid || ''),
    status: clean(manifest.status || payload.manifest_status || payload.manifestStatus || 'unknown'),
    hydrationStatus: clean(manifest.hydration_status || manifest.hydrationStatus || payload.hydration_status || payload.hydrationStatus || 'unknown')
  };
}

function ownerInfo(payload) {
  const owner = payload.owner && typeof payload.owner === 'object' ? payload.owner : {};
  return {
    passport: clean(owner.passport_subject || owner.passportSubject || payload.owner_passport_subject || payload.ownerPassportSubject || ''),
    wallet: clean(owner.wallet_account || owner.walletAccount || payload.owner_wallet_account || payload.ownerWalletAccount || '')
  };
}

function payoutInfo(payload) {
  const payout = payload.payout && typeof payload.payout === 'object' ? payload.payout : {};
  return {
    account: clean(payout.recipient_account || payout.recipientAccount || payload.payout_account || payload.payoutAccount || ''),
    action: clean(payout.default_action || payout.defaultAction || payload.payout_action || payload.payoutAction || '')
  };
}

function creatorInfo(payload, settings = {}) {
  const owner = ownerInfo(payload);
  const publicProfile = firstObject(payload.public_profile, payload.publicProfile, payload.profile, payload.creator, payload.owner);

  const rawHandle = clean(
    publicProfile.username ||
      publicProfile.handle ||
      payload.creator_username ||
      payload.creator_handle ||
      payload.owner_username ||
      payload.owner_handle ||
      settings.username ||
      settings.handle ||
      settings.requestedUsername ||
      settings.requestedHandle ||
      ''
  );

  const profileUrl = clean(
    publicProfile.crab_url ||
      publicProfile.crabUrl ||
      publicProfile.profile_crab_url ||
      publicProfile.profileCrabUrl ||
      payload.creator_crab_url ||
      payload.creator_profile_crab_url ||
      payload.owner_crab_url ||
      payload.owner_profile_crab_url ||
      settings.profileCrabUrl ||
      ''
  );

  const profileCid = clean(
    publicProfile.cid ||
      publicProfile.profile_cid ||
      publicProfile.profileCid ||
      payload.creator_profile_cid ||
      payload.owner_profile_cid ||
      settings.publicProfileCid ||
      ''
  );

  const source = creatorSource(payload, settings, publicProfile, rawHandle, profileUrl, profileCid);
  const reputation = firstScore(publicProfile, settings, [
    'reputationScorePercent',
    'reputationPercent',
    'repScorePercent',
    'reputation_score_percent',
    'reputation_score',
    'reputationScore',
    'repScore'
  ]);
  const moderator = firstScore(publicProfile, settings, [
    'moderatorScorePercent',
    'moderationScorePercent',
    'modScorePercent',
    'moderator_score_percent',
    'moderator_score',
    'moderationScore',
    'moderatorScore',
    'modScore'
  ]);

  return {
    handle: normalizeHandle(rawHandle || owner.passport || '@username'),
    profileUrl: profileUrl.startsWith('crab://') ? profileUrl : '',
    profileCid: normalizeB3(profileCid),
    ownerPassport: owner.passport,
    ownerWallet: owner.wallet,
    reputation,
    moderator,
    source,
    sourceLabel: sourceLabel(source),
    sourceTone: sourceTone(source)
  };
}

function creatorSource(payload, settings, publicProfile, rawHandle, profileUrl, profileCid) {
  if (profileUrl || profileCid || publicProfile.schema || publicProfile.kind) return 'published-profile';
  if (payload.creator || payload.owner_username || payload.creator_username || payload.owner_handle || payload.creator_handle) return 'site-manifest';
  if (rawHandle && (settings.username || settings.handle || settings.requestedUsername || settings.requestedHandle)) return 'local-display';
  if (ownerInfo(payload).passport) return 'owner-passport';
  return 'placeholder';
}

function sourceLabel(source) {
  if (source === 'published-profile') return 'published profile';
  if (source === 'site-manifest') return 'site manifest';
  if (source === 'local-display') return 'local display';
  if (source === 'owner-passport') return 'owner passport';
  return 'placeholder';
}

function sourceTone(source) {
  if (source === 'published-profile') return 'ok';
  if (source === 'site-manifest') return 'ok';
  if (source === 'local-display') return 'pending';
  if (source === 'owner-passport') return 'pending';
  return 'muted';
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  }

  return {};
}

function firstScore(primary, secondary, keys) {
  for (const source of [primary || {}, secondary || {}]) {
    for (const key of keys) {
      const formatted = formatPercent(source[key]);
      if (formatted) return formatted;
    }
  }

  return '';
}

function formatPercent(value) {
  const raw = clean(value);
  if (!raw || raw === '—' || raw === '-') return '';

  if (/^[-+]?\d+(\.\d+)?%$/.test(raw)) return raw;

  const number = Number(raw);
  if (!Number.isFinite(number)) return '';

  const bounded = Math.max(0, Math.min(100, number));
  const rounded = Number.isInteger(bounded) ? String(bounded) : bounded.toFixed(1).replace(/\.0$/, '');
  return `${rounded}%`;
}

function routeMap(payload) {
  return objectMap(payload.route_map || payload.routeMap || payload.routes || {});
}

function assetMap(payload) {
  return objectMap(payload.asset_map || payload.assetMap || payload.assets || {});
}

function objectMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') {
      out[key] = item;
    } else if (item && typeof item === 'object') {
      out[key] = item.cid || item.content_id || item.contentId || item.url || JSON.stringify(item);
    } else {
      out[key] = String(item ?? '');
    }
  }

  return out;
}

function normalizeReceipts(payload) {
  const candidates = [
    payload.receipts,
    payload.storage_receipts,
    payload.storageReceipts,
    payload.manifest?.receipts,
    payload.manifest?.storage_receipts
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function rootCid(payload) {
  return normalizeB3(
    payload.root_document_cid ||
      payload.rootDocumentCid ||
      payload.manifest?.root_document_cid ||
      payload.manifest?.rootDocumentCid ||
      payload.route_map?.['/'] ||
      payload.routes?.['/'] ||
      ''
  );
}

function normalizeB3(value) {
  const raw = clean(value).toLowerCase();
  if (/^b3:[0-9a-f]{64}$/.test(raw)) return raw;
  if (/^[0-9a-f]{64}$/.test(raw)) return `b3:${raw}`;
  return raw;
}

function normalizeHandle(value) {
  const raw = clean(value).replace(/^@+/, '');
  if (!raw || raw === 'username') return '@username';

  if (raw.startsWith('passport:')) {
    const tail = raw.split(':').filter(Boolean).pop() || 'passport';
    return `@${tail.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'passport'}`;
  }

  const safe = raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');

  return safe ? `@${safe}` : '@username';
}

function avatarLetters(handle) {
  const raw = normalizeHandle(handle).replace(/^@/, '');
  const parts = raw.split(/[._-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || 'R'}${parts[1][0] || 'O'}`.toUpperCase();
  }

  return raw.slice(0, 2).toUpperCase() || 'RO';
}

function safeJsonLine(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value ?? '');
  }
}

async function copyText(value) {
  const text = clean(value);
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    setFooter('Copied.');
  } catch {
    setFooter(text);
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

function replaceChildren(node, ...children) {
  node.textContent = '';
  node.append(...children);
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
    .site-creator-chip {
      gap: 8px !important;
      flex-wrap: wrap;
      border: 1px solid rgba(34, 197, 94, 0.20);
    }

    .site-creator-link[data-profile-published="1"] {
      background: linear-gradient(135deg, #16a34a, #2563eb) !important;
    }

    .site-creator-stats {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .site-creator-stat {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-height: 26px;
      padding: 5px 8px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 999px;
      color: #cbd5e1;
      background: rgba(15, 23, 42, 0.42);
      font-size: 11px;
      line-height: 1;
      white-space: nowrap;
    }

    .site-creator-stat span {
      color: #94a3b8;
      font-weight: 950;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .site-creator-stat strong {
      color: #f8fafc;
      font-weight: 950;
    }

    .site-creator-stat.ok {
      border-color: rgba(34, 197, 94, 0.30);
      background: rgba(22, 101, 52, 0.18);
    }

    .site-creator-stat.ok strong {
      color: #bbf7d0;
    }

    .site-creator-stat.pending {
      border-color: rgba(251, 191, 36, 0.28);
      background: rgba(113, 63, 18, 0.16);
    }

    .site-creator-stat.pending strong {
      color: #fde68a;
    }

    .site-manifest-modal-button {
      border-color: rgba(34, 197, 94, 0.28) !important;
    }

    .proof-sheet.hidden {
      display: none !important;
    }

    .proof-sheet {
      position: fixed;
      inset: 0;
      z-index: 9998;
      display: grid;
      place-items: center;
      padding: 24px;
    }

    .proof-sheet-scrim {
      position: absolute;
      inset: 0;
      z-index: 0;
      border: 0;
      border-radius: 0;
      padding: 0;
      background: rgba(2, 6, 23, 0.72);
      backdrop-filter: blur(14px);
      cursor: pointer;
    }

    .proof-sheet-scrim:hover {
      transform: none;
      background: rgba(2, 6, 23, 0.78);
    }

    .proof-sheet-panel {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 16px;
      width: min(1180px, calc(100vw - 44px));
      max-height: min(840px, calc(100vh - 44px));
      overflow: auto;
      padding: 22px;
      border: 1px solid rgba(34, 197, 94, 0.28);
      border-radius: 28px;
      color: #f8fafc;
      background:
        radial-gradient(circle at top left, rgba(34, 197, 94, 0.14), transparent 42%),
        radial-gradient(circle at top right, rgba(59, 130, 246, 0.10), transparent 36%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(8, 17, 34, 0.98));
      box-shadow: 0 30px 100px rgba(0, 0, 0, 0.58);
    }

    .proof-sheet-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: start;
    }

    .proof-eyebrow {
      margin: 0 0 6px;
      color: #86efac;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .proof-sheet-head h3 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(30px, 4vw, 48px);
      line-height: 1;
      letter-spacing: -0.065em;
      overflow-wrap: anywhere;
    }

    .proof-sheet-head p:not(.proof-eyebrow) {
      margin: 8px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }

    .proof-close {
      width: 48px;
      height: 48px;
      padding: 0;
      border-radius: 16px;
      font-size: 30px;
      line-height: 1;
    }

    .creator-proof-hero {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 16px;
      align-items: center;
      padding: 18px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 24px;
      background: rgba(2, 6, 23, 0.28);
    }

    .creator-proof-avatar {
      display: grid;
      place-items: center;
      width: 92px;
      height: 92px;
      border-radius: 28px;
      color: #052e16;
      background:
        radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.65), transparent 32%),
        linear-gradient(135deg, #86efac, #60a5fa);
      font-size: 32px;
      font-weight: 950;
      letter-spacing: -0.09em;
      box-shadow: 0 18px 44px rgba(34, 197, 94, 0.18);
    }

    .creator-proof-copy h4 {
      margin: 0;
      color: #f8fafc;
      font-size: 30px;
      letter-spacing: -0.06em;
    }

    .creator-proof-copy p {
      margin: 7px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .creator-proof-source {
      color: #bbf7d0 !important;
      font-weight: 950;
    }

    .creator-proof-grid,
    .site-manifest-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 10px;
    }

    .proof-card {
      display: grid;
      gap: 6px;
      min-width: 0;
      padding: 13px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 18px;
      background: rgba(15, 23, 42, 0.52);
    }

    .proof-card span {
      color: #94a3b8;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.10em;
      text-transform: uppercase;
    }

    .proof-card strong {
      color: #f8fafc;
      overflow-wrap: anywhere;
      line-height: 1.35;
    }

    .creator-proof-actions,
    .site-manifest-actions,
    .site-manifest-row-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }

    .creator-proof-actions button,
    .site-manifest-actions button,
    .site-manifest-row-actions button {
      min-height: 34px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 950;
    }

    .creator-proof-truth-note {
      margin: 0;
      padding: 14px;
      border: 1px solid rgba(251, 191, 36, 0.22);
      border-radius: 18px;
      color: #fde68a;
      background: rgba(113, 63, 18, 0.14);
      line-height: 1.45;
    }

    .site-manifest-proof {
      display: grid;
      gap: 14px;
    }

    .site-manifest-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 18px;
      background: rgba(2, 6, 23, 0.24);
    }

    .site-manifest-tab {
      min-height: 36px;
      padding: 8px 12px;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.52);
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 950;
    }

    .site-manifest-tab.active {
      border-color: rgba(34, 197, 94, 0.36);
      color: #052e16;
      background: #86efac;
    }

    .site-manifest-tab-panels {
      min-width: 0;
    }

    .site-manifest-tab-panel.hidden {
      display: none !important;
    }

    .site-manifest-tab-panel {
      display: grid;
      gap: 14px;
      min-width: 0;
    }

    .site-manifest-map-panel h4 {
      margin: 0 0 10px;
      color: #bbf7d0;
      font-size: 20px;
      letter-spacing: -0.04em;
    }

    .site-manifest-map-list {
      display: grid;
      gap: 9px;
    }

    .site-manifest-map-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      min-width: 0;
      padding: 13px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.44);
    }

    .site-manifest-map-row strong {
      color: #f8fafc;
      overflow-wrap: anywhere;
    }

    .site-manifest-map-row p {
      margin: 5px 0 0;
      color: #94a3b8;
      overflow-wrap: anywhere;
      line-height: 1.35;
    }

    .site-proof-empty {
      margin: 0;
      padding: 18px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 16px;
      color: #94a3b8;
      background: rgba(2, 6, 23, 0.26);
    }

    .site-manifest-raw-panel {
      display: grid;
      gap: 10px;
      min-width: 0;
    }

    .site-manifest-raw-json {
      max-height: 480px;
      overflow: auto;
      margin: 0;
      padding: 14px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 16px;
      color: #dbeafe;
      background: #020617;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    @media (max-width: 760px) {
      .proof-sheet {
        padding: 12px;
      }

      .proof-sheet-panel {
        width: calc(100vw - 24px);
        max-height: calc(100vh - 24px);
        padding: 16px;
        border-radius: 22px;
      }

      .proof-sheet-head,
      .creator-proof-hero,
      .site-manifest-map-row {
        grid-template-columns: 1fr;
      }

      .creator-proof-actions,
      .site-manifest-actions,
      .site-manifest-row-actions {
        justify-content: flex-start;
      }

      .creator-proof-actions button,
      .site-manifest-actions button,
      .site-manifest-row-actions button {
        width: 100%;
      }

      .site-creator-stats {
        width: 100%;
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