/**
 * RO:WHAT — Safe NEXT_LEVEL Builder/Developer view switch plus late-bound music/stream planning panels.
 * RO:WHY — Keeps creator pages usable while preserving developer truth surfaces without hiding prepare/action controls.
 * RO:INTERACTS — page.html, page.js, page-creator-route-guard.js, local creator draft pages.
 * RO:INVARIANTS — local planning only; no upload; no b3 CID claim; no wallet mutation; no ROC charge; no live stream/podcast start.
 * RO:SECURITY — textContent/createElement only; no mic/camera access; no backend calls; no innerHTML.
 * RO:TEST — node --check; manual crab://music, crab://article, crab://video, crab://stream, crab://podcast.
 */

const STYLE_ID = 'crablinkNextLevelPanelsStyles';
const TOOLBAR_ID = 'nextLevelCreatorViewToolbar';
const MUSIC_PANEL_ID = 'nextLevelMusicLyricsAssetPanel';
const STREAM_PANEL_ID = 'nextLevelStreamPodcastPanel';

const VIEW_MODE_KEY = 'crablinkCreatorViewModeV3';
const DEFAULT_VIEW_MODE = 'builder';

const CREATOR_ROUTES = new Set([
  'crab://music',
  'crab://article',
  'crab://video',
  'crab://stream',
  'crab://podcast'
]);

const ROUTE_LABELS = Object.freeze({
  'crab://music': 'Music Studio',
  'crab://article': 'Article Draft',
  'crab://video': 'Video Draft',
  'crab://stream': 'Stream Studio',
  'crab://podcast': 'Podcast Studio'
});

const ROUTE_SECTIONS = Object.freeze({
  'crab://music': 'musicDraftSection',
  'crab://article': 'articleDraftSection',
  'crab://video': 'videoDraftSection',
  'crab://stream': 'streamDraftSection',
  'crab://podcast': 'podcastDraftSection'
});

const ROUTE_BODY_CLASSES = Object.freeze({
  'crab://music': 'crablink-music-draft-view-mode',
  'crab://article': 'crablink-article-draft-view-mode',
  'crab://video': 'crablink-video-draft-view-mode',
  'crab://stream': 'crablink-stream-draft-view-mode',
  'crab://podcast': 'crablink-podcast-draft-view-mode'
});

const ROUTE_NAMES = Object.freeze({
  'crab://music': 'music',
  'crab://article': 'article',
  'crab://video': 'video',
  'crab://stream': 'stream',
  'crab://podcast': 'podcast'
});

const BUILDER_HIDE_PRE_SELECTOR = [
  '#developerJson',
  '#musicManifestPreview',
  '#musicRightsPreview',
  '#musicNextLyricsPreview',
  '#articleManifestPreview',
  '#videoManifestPreview',
  '#streamManifestPreview',
  '#streamPodcastCompanionPreview',
  '#streamNextPodcastPreview',
  '#podcastManifestPreview',
  '.music-manifest-preview',
  '.music-rights-preview',
  '.next-level-preview',
  '.article-manifest-preview',
  '.article-prepare-result',
  '.video-manifest-preview',
  '.video-prepare-result',
  '.stream-manifest-preview',
  '.stream-prepare-result',
  '.stream-podcast-preview',
  '.podcast-manifest-preview',
  '.podcast-prepare-result'
].join(', ');

const ACTION_DETAILS_SELECTOR = [
  '.music-draft-manifest',
  '.article-draft-manifest',
  '.video-draft-manifest',
  '.stream-draft-manifest',
  '.podcast-draft-manifest'
].join(', ');

let renderTimer = 0;
let settleTimer = 0;
let settleUntil = 0;
let lastRoute = '';
let viewMode = DEFAULT_VIEW_MODE;

function boot() {
  installStyles();
  bindEvents();

  void loadViewMode().finally(() => {
    armSettler('initial-storage');
  });

  armSettler('boot');

  window.setTimeout(() => armSettler('boot-150'), 150);
  window.setTimeout(() => armSettler('boot-500'), 500);
  window.setTimeout(() => armSettler('boot-1200'), 1200);
  window.setTimeout(() => armSettler('boot-2600'), 2600);
}

function bindEvents() {
  const root = document.documentElement || document.body;

  if (root) {
    const observer = new MutationObserver(() => scheduleRender('mutation'));
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'class',
        'hidden',
        'open',
        'data-crablink-creator-route',
        'data-crablink-local-route',
        'data-crablink-active-route-kind'
      ]
    });
  }

  document.addEventListener('input', () => scheduleRender('input'), true);
  document.addEventListener('change', () => scheduleRender('change'), true);

  window.addEventListener('popstate', () => armSettler('popstate'));
  window.addEventListener('hashchange', () => armSettler('hashchange'));

  document.addEventListener(
    'submit',
    (event) => {
      if (event.target?.id === 'addressForm') {
        armSettler('address-submit');
      }
    },
    true
  );

  document.addEventListener(
    'click',
    (event) => {
      const modeButton = event.target?.closest?.('[data-next-level-view-mode]');
      if (modeButton) {
        event.preventDefault();
        void setViewMode(modeButton.getAttribute('data-next-level-view-mode'));
        return;
      }

      if (event.target?.closest?.('[data-open-crab]')) {
        armSettler('quick-nav-click');
      }
    },
    true
  );

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (!Object.prototype.hasOwnProperty.call(changes, VIEW_MODE_KEY)) return;

      viewMode = normalizeViewMode(changes[VIEW_MODE_KEY]?.newValue);
      armSettler('storage-view-mode');
    });
  }
}

function armSettler(reason) {
  settleUntil = Date.now() + 5000;
  scheduleRender(reason);
}

function scheduleRender(reason) {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => renderEverything(reason), 70);
}

function scheduleSettlePass() {
  window.clearTimeout(settleTimer);

  if (Date.now() > settleUntil) return;

  settleTimer = window.setTimeout(() => {
    scheduleRender('settle-pass');
  }, 220);
}

function renderEverything(reason) {
  const route = currentRoute();

  if (route !== lastRoute) {
    lastRoute = route;
    settleUntil = Date.now() + 5000;
  }

  if (!CREATOR_ROUTES.has(route)) {
    cleanupToolbar();
    cleanupRoutePanels(route);
    document.body?.removeAttribute('data-crablink-creator-view-mode');
    scheduleSettlePass();
    return;
  }

  markCreatorRoute(route);

  const pagePanel = document.getElementById('pagePanel');
  if (!pagePanel || pagePanel.classList.contains('hidden')) {
    scheduleSettlePass();
    return;
  }

  const activeSection = ensureActiveCreatorSection(route);

  document.body?.setAttribute('data-crablink-creator-view-mode', viewMode);

  renderToolbar(route);
  renderRoutePanels(route);
  applyViewMode(route);
  updateFooter(route);

  if (!activeSection || !document.getElementById(TOOLBAR_ID)) {
    scheduleSettlePass();
    return;
  }

  if (reason !== 'settle-pass') {
    scheduleSettlePass();
  }
}

function markCreatorRoute(route) {
  const routeName = ROUTE_NAMES[route];
  const routeClass = ROUTE_BODY_CLASSES[route];

  if (!document.body || !routeName) return;

  document.body.setAttribute('data-crablink-active-route-kind', 'creator');
  document.body.setAttribute('data-crablink-creator-route', routeName);

  for (const className of Object.values(ROUTE_BODY_CLASSES)) {
    document.body.classList.toggle(className, className === routeClass);
  }
}

function ensureActiveCreatorSection(route) {
  const sectionId = ROUTE_SECTIONS[route];
  if (!sectionId) return null;

  const section = document.getElementById(sectionId);
  if (!section) return null;

  section.classList.remove('hidden');
  section.removeAttribute('aria-hidden');

  return section;
}

function renderRoutePanels(route) {
  cleanupRoutePanels(route);

  if (route === 'crab://music') {
    renderMusicLyricsPanel();
  }

  if (route === 'crab://stream') {
    renderStreamPodcastPanel();
  }
}

function cleanupRoutePanels(route) {
  if (route !== 'crab://music') {
    document.getElementById(MUSIC_PANEL_ID)?.remove();
  }

  if (route !== 'crab://stream') {
    document.getElementById(STREAM_PANEL_ID)?.remove();
  }
}

function renderToolbar(route) {
  const pagePanel = document.getElementById('pagePanel');
  if (!pagePanel) return;

  let toolbar = document.getElementById(TOOLBAR_ID);
  if (!toolbar) {
    toolbar = buildToolbar();

    const facts = document.getElementById('pageFacts');
    const activeSection = document.getElementById(ROUTE_SECTIONS[route]);

    if (facts && facts.parentElement === pagePanel) {
      facts.insertAdjacentElement('afterend', toolbar);
    } else if (activeSection && activeSection.parentElement) {
      activeSection.insertAdjacentElement('beforebegin', toolbar);
    } else {
      pagePanel.prepend(toolbar);
    }
  }

  const routeLabel = ROUTE_LABELS[route] || 'Creator Workspace';
  const modeLabel = viewMode === 'builder' ? 'Builder View' : 'Developer View';

  setText(toolbar.querySelector('[data-next-level-toolbar-title]'), `${routeLabel} · ${modeLabel}`);
  setText(
    toolbar.querySelector('[data-next-level-toolbar-copy]'),
    viewMode === 'builder'
      ? 'Builder View hides raw JSON previews only. Prepare, save, clear, lyrics, and companion options stay visible.'
      : 'Developer View shows raw contract JSON, manifest drafts, route contracts, and local truth boundaries.'
  );

  for (const button of toolbar.querySelectorAll('[data-next-level-view-mode]')) {
    const active = button.getAttribute('data-next-level-view-mode') === viewMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  toolbar.setAttribute('data-view-mode', viewMode);
  toolbar.setAttribute('data-route', route);
}

function buildToolbar() {
  const toolbar = el('section', 'next-level-view-toolbar');
  toolbar.id = TOOLBAR_ID;

  const copy = el('div', 'next-level-view-copy');

  const eyebrow = el('p', 'next-level-view-eyebrow', 'creator workspace view');

  const title = el('h3');
  title.setAttribute('data-next-level-toolbar-title', '1');

  const desc = el('p');
  desc.setAttribute('data-next-level-toolbar-copy', '1');

  copy.append(eyebrow, title, desc);

  const actions = el('div', 'next-level-view-actions');

  const builder = el('button', 'secondary next-level-view-button', 'Builder View');
  builder.type = 'button';
  builder.setAttribute('data-next-level-view-mode', 'builder');

  const developer = el('button', 'secondary next-level-view-button', 'Developer View');
  developer.type = 'button';
  developer.setAttribute('data-next-level-view-mode', 'developer');

  actions.append(builder, developer);
  toolbar.append(copy, actions);

  return toolbar;
}

function renderMusicLyricsPanel() {
  const section = ensureActiveCreatorSection('crab://music');
  if (!section) return;

  let panel = document.getElementById(MUSIC_PANEL_ID);
  if (!panel) {
    panel = buildMusicPanel();

    const notice = section.querySelector('.music-draft-notice');
    const layout = section.querySelector('.music-draft-layout');

    if (notice && notice.parentElement === section) {
      notice.insertAdjacentElement('afterend', panel);
    } else if (layout && layout.parentElement === section) {
      section.insertBefore(panel, layout);
    } else {
      section.append(panel);
    }
  }

  panel.classList.remove('hidden');
  panel.removeAttribute('aria-hidden');
  updateMusicPanel(panel);
}

function buildMusicPanel() {
  const panel = el('section', 'next-level-panel music-lyrics-contract');
  panel.id = MUSIC_PANEL_ID;

  const head = el('div', 'next-level-panel-head');
  const text = el('div');

  text.append(
    smallCaps('lyrics rights boundary'),
    h('h4', 'Lyrics as a separate b3 asset'),
    p('Lyrics should publish as their own future crab://<hash>.lyrics asset, then be referenced from the .music/.song manifest.')
  );

  const badge = el('span', 'next-level-badge amber', 'feature contract');
  head.append(text, badge);

  const warning = el(
    'div',
    'next-level-truth amber',
    'Truth boundary: this does not upload lyrics, does not create a lyrics b3 CID, does not enforce DRM, does not charge ROC, and does not claim publication.'
  );

  const grid = el('div', 'next-level-grid');

  grid.append(
    field('Future lyrics crab URL', 'musicNextLyricsUrl', 'crab://<64hex>.lyrics'),
    selectField('Lyrics access policy', 'musicNextLyricsAccess', [
      ['same-as-music', 'Same as music asset'],
      ['free-preview', 'Free preview'],
      ['paid-separate', 'Paid separately'],
      ['owner-only', 'Owner only']
    ]),
    selectField('Rights mode', 'musicNextLyricsRights', [
      ['separate-rights', 'Separate lyrics rights'],
      ['same-as-song', 'Same as song'],
      ['publisher-controlled', 'Publisher controlled'],
      ['private-unpublished', 'Private / unpublished']
    ]),
    checkboxField('musicNextLyricsDrmBoundary', 'Keep DRM/licensing boundary separate')
  );

  const details = el('details', 'next-level-advanced-details');
  details.open = viewMode === 'developer';

  const summary = el('summary', '', 'Lyrics contract JSON');

  const preview = el('pre', 'next-level-preview');
  preview.id = 'musicNextLyricsPreview';

  details.append(summary, preview);
  panel.append(head, warning, grid, details);

  return panel;
}

function updateMusicPanel(panel) {
  const lyricsUrl = clean(panel.querySelector('#musicNextLyricsUrl')?.value);
  const accessMode = clean(panel.querySelector('#musicNextLyricsAccess')?.value) || 'same-as-music';
  const rightsMode = clean(panel.querySelector('#musicNextLyricsRights')?.value) || 'separate-rights';
  const drmBoundary = Boolean(panel.querySelector('#musicNextLyricsDrmBoundary')?.checked);

  const contract = {
    schema: 'crablink.music-lyrics-asset-contract.local.v1',
    status: 'local_contract_not_published',
    intended_shape: {
      music_asset: 'crab://<64 lowercase hex>.music',
      song_asset: 'crab://<64 lowercase hex>.song',
      lyrics_asset: 'crab://<64 lowercase hex>.lyrics',
      internal_lyrics_cid: 'b3:<64 lowercase hex>'
    },
    linked_assets: {
      lyrics: {
        kind: 'lyrics',
        crab_url: isLyricsUrl(lyricsUrl) ? lyricsUrl.toLowerCase() : null,
        pending_separate_b3_asset: !isLyricsUrl(lyricsUrl),
        access_mode: accessMode,
        rights_mode: rightsMode,
        drm_boundary_separate: drmBoundary
      }
    },
    truth_boundary: {
      lyrics_uploaded: false,
      lyrics_b3_cid_assigned: false,
      music_manifest_published: false,
      drm_enforced: false,
      roc_charged: false,
      wallet_mutated: false
    }
  };

  const preview = panel.querySelector('#musicNextLyricsPreview');
  if (preview) preview.textContent = JSON.stringify(contract, null, 2);
}

function renderStreamPodcastPanel() {
  const section = ensureActiveCreatorSection('crab://stream');
  if (!section) return;

  let panel = document.getElementById(STREAM_PANEL_ID);
  if (!panel) {
    panel = buildStreamPanel();

    const notice = section.querySelector('.stream-draft-notice');
    const layout = section.querySelector('.stream-draft-layout');

    if (notice && notice.parentElement === section) {
      notice.insertAdjacentElement('afterend', panel);
    } else if (layout && layout.parentElement === section) {
      section.insertBefore(panel, layout);
    } else {
      section.append(panel);
    }
  }

  panel.classList.remove('hidden');
  panel.removeAttribute('aria-hidden');
  updateStreamPanel(panel);
}

function buildStreamPanel() {
  const panel = el('section', 'next-level-panel stream-podcast-contract');
  panel.id = STREAM_PANEL_ID;

  const head = el('div', 'next-level-panel-head');
  const text = el('div');

  text.append(
    smallCaps('feature-gated companion output'),
    h('h4', 'Stream + Podcast Mode'),
    p('Plan a stream that can also produce a podcast output: live simulcast, record-for-later, or post-stream podcast publishing.')
  );

  const badge = el('span', 'next-level-badge purple', 'feature gate');
  head.append(text, badge);

  const warning = el(
    'div',
    'next-level-truth purple',
    'Truth boundary: this does not start a stream, does not start a podcast, does not create an RSS feed, does not create ingest keys, and does not charge ROC.'
  );

  const grid = el('div', 'next-level-grid');

  grid.append(
    checkboxField('streamNextPodcastEnabled', 'Enable Stream + Podcast companion mode'),
    selectField('Companion mode', 'streamNextPodcastMode', [
      ['record-for-later', 'Record podcast while streaming'],
      ['simulcast-live', 'Live stream + live podcast simulcast'],
      ['post-stream-episode', 'Publish podcast episode after stream'],
      ['clip-highlights', 'Create highlights / recap episode']
    ]),
    field('Podcast show title', 'streamNextPodcastShow', 'The Skinnycrabby Show'),
    field('Episode title', 'streamNextPodcastEpisode', 'Live from CrabLink'),
    selectField('Publish timing', 'streamNextPodcastTiming', [
      ['manual-after-stream', 'Manual after stream'],
      ['auto-draft-after-stream', 'Auto-create draft after stream'],
      ['same-time-live', 'Same time live'],
      ['scheduled-later', 'Scheduled later']
    ]),
    selectField('Podcast visibility', 'streamNextPodcastVisibility', [
      ['same-as-stream', 'Same as stream'],
      ['public', 'Public'],
      ['passport-only', 'Passport only'],
      ['paid-access', 'Paid access'],
      ['private-draft', 'Private draft']
    ])
  );

  const note = el(
    'p',
    'next-level-note',
    'Terminology: “simulcast” means the same live content is broadcast simultaneously to multiple outputs. “Record for later” means the stream becomes a podcast draft after capture/editing.'
  );

  const details = el('details', 'next-level-advanced-details');
  details.open = viewMode === 'developer';

  const summary = el('summary', '', 'Stream + podcast contract JSON');

  const preview = el('pre', 'next-level-preview');
  preview.id = 'streamNextPodcastPreview';

  details.append(summary, preview);
  panel.append(head, warning, grid, note, details);

  return panel;
}

function updateStreamPanel(panel) {
  const enabled = Boolean(panel.querySelector('#streamNextPodcastEnabled')?.checked);
  const mode = clean(panel.querySelector('#streamNextPodcastMode')?.value) || 'record-for-later';
  const showTitle = clean(panel.querySelector('#streamNextPodcastShow')?.value);
  const episodeTitle = clean(panel.querySelector('#streamNextPodcastEpisode')?.value);
  const timing = clean(panel.querySelector('#streamNextPodcastTiming')?.value) || 'manual-after-stream';
  const visibility = clean(panel.querySelector('#streamNextPodcastVisibility')?.value) || 'same-as-stream';

  panel.setAttribute('data-enabled', enabled ? 'true' : 'false');

  const contract = {
    schema: 'crablink.stream-podcast-companion.local.v1',
    status: enabled ? 'feature_gate_enabled_local_draft' : 'feature_gate_disabled',
    companion_output: {
      enabled,
      mode,
      show_title: showTitle || null,
      episode_title: episodeTitle || null,
      publish_timing: timing,
      visibility,
      future_stream_asset_shape: 'crab://<64 lowercase hex>.stream',
      future_podcast_asset_shape: 'crab://<64 lowercase hex>.podcast'
    },
    terminology: {
      simulcast: 'Same live content broadcast simultaneously to more than one output.',
      recording: 'Stream captured or edited into a podcast episode later.',
      post_stream_publishing: 'Podcast episode created after the stream ends.'
    },
    truth_boundary: {
      stream_started: false,
      podcast_started: false,
      ingest_key_created: false,
      rss_feed_created: false,
      b3_content_id_assigned: false,
      roc_charged: false,
      wallet_mutated: false
    }
  };

  const preview = panel.querySelector('#streamNextPodcastPreview');
  if (preview) preview.textContent = JSON.stringify(contract, null, 2);
}

function applyViewMode(route) {
  const pagePanel = document.getElementById('pagePanel');
  if (!pagePanel) return;

  const builderMode = viewMode === 'builder';

  for (const node of pagePanel.querySelectorAll(BUILDER_HIDE_PRE_SELECTOR)) {
    node.classList.toggle('next-level-builder-hidden', builderMode);
  }

  const developerDetails = document.getElementById('developerDetails');
  if (developerDetails) {
    developerDetails.classList.toggle('next-level-builder-hidden', builderMode);
    if (builderMode) developerDetails.open = false;
  }

  for (const details of pagePanel.querySelectorAll('.next-level-advanced-details')) {
    details.open = !builderMode;
  }

  for (const details of pagePanel.querySelectorAll(ACTION_DETAILS_SELECTOR)) {
    details.classList.remove('next-level-builder-hidden');
    details.open = true;
  }

  for (const id of [
    'musicDraftSection',
    'articleDraftSection',
    'videoDraftSection',
    'streamDraftSection',
    'podcastDraftSection',
    'nextLevelMusicLyricsAssetPanel',
    'nextLevelStreamPodcastPanel'
  ]) {
    const node = document.getElementById(id);
    if (!node) continue;

    if (id === ROUTE_SECTIONS[route] || id === MUSIC_PANEL_ID || id === STREAM_PANEL_ID) {
      node.classList.remove('next-level-builder-hidden');
    }
  }
}

async function loadViewMode() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    viewMode = DEFAULT_VIEW_MODE;
    return;
  }

  try {
    const stored = await chrome.storage.local.get([VIEW_MODE_KEY]);
    viewMode = normalizeViewMode(stored?.[VIEW_MODE_KEY]);

    if (!stored?.[VIEW_MODE_KEY]) {
      await chrome.storage.local.set({ [VIEW_MODE_KEY]: DEFAULT_VIEW_MODE });
      viewMode = DEFAULT_VIEW_MODE;
    }
  } catch {
    viewMode = DEFAULT_VIEW_MODE;
  }
}

async function setViewMode(mode) {
  viewMode = normalizeViewMode(mode);

  document.body?.setAttribute('data-crablink-creator-view-mode', viewMode);

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      await chrome.storage.local.set({ [VIEW_MODE_KEY]: viewMode });
    } catch {
      // View mode is convenience UI only.
    }
  }

  armSettler(`set-view-${viewMode}`);

  document.dispatchEvent(
    new CustomEvent('crablink:creator-view-mode-changed', {
      detail: {
        mode: viewMode,
        route: currentRoute()
      }
    })
  );
}

function normalizeViewMode(mode) {
  return mode === 'developer' ? 'developer' : DEFAULT_VIEW_MODE;
}

function currentRoute() {
  const addressValue = clean(document.getElementById('addressInput')?.value).toLowerCase();
  if (addressValue.startsWith('crab://')) return addressValue.replace(/\/+$/, '');

  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = clean(params.get('url') || params.get('crab')).toLowerCase();
    if (fromQuery.startsWith('crab://')) return fromQuery.replace(/\/+$/, '');
  } catch {
    // Ignore query parsing failures.
  }

  const creatorRoute = clean(document.body?.getAttribute('data-crablink-creator-route')).toLowerCase();
  if (creatorRoute) return `crab://${creatorRoute}`;

  const localRoute = clean(document.body?.getAttribute('data-crablink-local-route')).toLowerCase();
  if (localRoute) return `crab://${localRoute}`;

  return '';
}

function field(label, id, placeholder) {
  const wrapper = el('label', 'next-level-field');
  wrapper.append(labelNode(label));

  const input = document.createElement('input');
  input.id = id;
  input.type = 'text';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.addEventListener('input', () => scheduleRender(`field-${id}`));

  wrapper.append(input);
  return wrapper;
}

function selectField(label, id, options) {
  const wrapper = el('label', 'next-level-field');
  wrapper.append(labelNode(label));

  const select = document.createElement('select');
  select.id = id;
  select.addEventListener('change', () => scheduleRender(`select-${id}`));

  for (const [value, text] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.append(option);
  }

  wrapper.append(select);
  return wrapper;
}

function checkboxField(id, text) {
  const wrapper = el('label', 'next-level-checkbox');

  const input = document.createElement('input');
  input.id = id;
  input.type = 'checkbox';
  input.addEventListener('change', () => scheduleRender(`checkbox-${id}`));

  const span = document.createElement('span');
  span.textContent = text;

  wrapper.append(input, span);
  return wrapper;
}

function labelNode(text) {
  return el('span', 'next-level-label', text);
}

function smallCaps(text) {
  return el('p', 'next-level-eyebrow', text);
}

function h(tag, text) {
  return el(tag, '', text);
}

function p(text) {
  return el('p', '', text);
}

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = text;
  return node;
}

function isLyricsUrl(value) {
  return /^crab:\/\/[0-9a-f]{64}\.lyrics$/i.test(clean(value));
}

function setText(node, value) {
  if (node) node.textContent = String(value ?? '');
}

function updateFooter(route) {
  const footer = document.getElementById('footerStatus');
  if (!footer) return;

  const routeLabel = ROUTE_LABELS[route] || 'Creator Workspace';
  const text =
    viewMode === 'builder'
      ? `${routeLabel} is in Builder View. Raw JSON is hidden, but creator controls remain visible.`
      : `${routeLabel} is in Developer View. Contract JSON and future manifests are visible.`;

  const current = String(footer.textContent || '');

  if (
    !current ||
    current === 'Ready.' ||
    current.includes('Builder View') ||
    current.includes('Developer View') ||
    current.includes('workspace active') ||
    current.includes('creator')
  ) {
    footer.textContent = text;
  }
}

function cleanupToolbar() {
  document.getElementById(TOOLBAR_ID)?.remove();
}

function clean(value) {
  return String(value ?? '').trim();
}

function installStyles() {
  const existing = document.getElementById(STYLE_ID);
  if (existing) {
    existing.remove();
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .next-level-view-toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 14px;
      align-items: center;
      margin: 14px 0 16px;
      padding: 14px 16px;
      border: 1px solid rgba(96, 165, 250, 0.22);
      border-radius: 20px;
      background:
        radial-gradient(circle at top left, rgba(96, 165, 250, 0.11), transparent 48%),
        rgba(2, 6, 23, 0.28);
    }

    .next-level-view-copy {
      min-width: 0;
    }

    .next-level-view-eyebrow {
      margin: 0 0 5px;
      color: #bfdbfe;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .next-level-view-toolbar h3 {
      margin: 0;
      color: #f8fafc;
      font-size: 18px;
      line-height: 1.1;
      letter-spacing: -0.025em;
    }

    .next-level-view-toolbar p:not(.next-level-view-eyebrow) {
      margin: 5px 0 0;
      color: #cbd5e1;
      line-height: 1.4;
      font-size: 13px;
    }

    .next-level-view-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }

    .next-level-view-button {
      min-height: 34px;
      border-radius: 999px !important;
      font-size: 12px;
      font-weight: 950;
      white-space: nowrap;
    }

    .next-level-view-button.active {
      border-color: rgba(147, 197, 253, 0.72) !important;
      color: #ffffff !important;
      background:
        radial-gradient(circle at top left, rgba(59, 130, 246, 0.34), transparent 50%),
        rgba(37, 99, 235, 0.58) !important;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
    }

    body[data-crablink-creator-view-mode="builder"] .next-level-builder-hidden {
      display: none !important;
    }

    body[data-crablink-creator-view-mode="builder"] #developerDetails.next-level-builder-hidden,
    body[data-crablink-creator-view-mode="builder"] .developer-details.next-level-builder-hidden {
      display: none !important;
    }

    .next-level-panel {
      display: grid !important;
      gap: 14px;
      margin: 16px 0;
      padding: 18px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 24px;
      background:
        radial-gradient(circle at top left, rgba(96, 165, 250, 0.10), transparent 44%),
        rgba(2, 6, 23, 0.32);
    }

    .music-lyrics-contract {
      border-color: rgba(251, 191, 36, 0.28);
      background:
        radial-gradient(circle at top left, rgba(251, 191, 36, 0.12), transparent 44%),
        rgba(2, 6, 23, 0.34);
    }

    .stream-podcast-contract {
      border-color: rgba(168, 85, 247, 0.30);
      background:
        radial-gradient(circle at top left, rgba(168, 85, 247, 0.14), transparent 44%),
        rgba(2, 6, 23, 0.34);
    }

    .next-level-panel-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
    }

    .next-level-eyebrow {
      margin: 0 0 7px;
      color: #bfdbfe;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .music-lyrics-contract .next-level-eyebrow {
      color: #fde68a;
    }

    .stream-podcast-contract .next-level-eyebrow {
      color: #ddd6fe;
    }

    .next-level-panel h4 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(24px, 3vw, 36px);
      line-height: 1;
      letter-spacing: -0.055em;
    }

    .next-level-panel p {
      margin: 8px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .next-level-badge {
      display: inline-flex;
      align-items: center;
      min-height: 30px;
      padding: 7px 11px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .next-level-badge.amber {
      border: 1px solid rgba(251, 191, 36, 0.34);
      color: #fde68a;
      background: rgba(113, 63, 18, 0.22);
    }

    .next-level-badge.purple {
      border: 1px solid rgba(168, 85, 247, 0.34);
      color: #ddd6fe;
      background: rgba(88, 28, 135, 0.24);
    }

    .next-level-truth {
      padding: 13px 14px;
      border-radius: 16px;
      line-height: 1.45;
      font-weight: 800;
    }

    .next-level-truth.amber {
      border: 1px solid rgba(251, 191, 36, 0.24);
      color: #fde68a;
      background: rgba(113, 63, 18, 0.14);
    }

    .next-level-truth.purple {
      border: 1px solid rgba(168, 85, 247, 0.24);
      color: #ddd6fe;
      background: rgba(88, 28, 135, 0.16);
    }

    .next-level-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .next-level-field,
    .next-level-checkbox {
      display: grid;
      gap: 7px;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 850;
    }

    .next-level-checkbox {
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      padding: 12px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.36);
    }

    .next-level-label,
    .next-level-checkbox span {
      color: #bfdbfe;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .music-lyrics-contract .next-level-label,
    .music-lyrics-contract .next-level-checkbox span {
      color: #fde68a;
    }

    .stream-podcast-contract .next-level-label,
    .stream-podcast-contract .next-level-checkbox span {
      color: #ddd6fe;
    }

    .next-level-field input,
    .next-level-field select {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid rgba(148, 163, 184, 0.24);
      border-radius: 14px;
      padding: 11px 12px;
      color: #f8fafc;
      background: rgba(15, 23, 42, 0.72);
      font: inherit;
      outline: none;
    }

    .next-level-advanced-details {
      overflow: hidden;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 16px;
      background: rgba(2, 6, 23, 0.28);
    }

    .next-level-advanced-details summary {
      cursor: pointer;
      padding: 12px 14px;
      color: #f8fafc;
      font-weight: 950;
    }

    .next-level-preview {
      max-height: 320px;
      overflow: auto;
      margin: 0;
      padding: 14px;
      border-top: 1px solid rgba(148, 163, 184, 0.18);
      color: #dbeafe;
      background: #020617;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .next-level-note {
      padding: 12px 13px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.34);
    }

    @media (max-width: 980px) {
      .next-level-view-toolbar,
      .next-level-grid {
        grid-template-columns: 1fr;
      }

      .next-level-panel-head {
        flex-direction: column;
      }

      .next-level-view-actions {
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