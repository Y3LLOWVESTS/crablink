/**
 * RO:WHAT — Local stub pages for crab://lyrics, crab://comment, crab://post, crab://ad, crab://algo, crab://code, and crab://game.
 * RO:WHY — NEXT_LEVEL pre-refactor coverage; lock foreseeable built-ins before folder-based page ownership refactor.
 * RO:INTERACTS — page.html, page.js shell, page-uniform-manifest.js, future route contracts.
 * RO:INVARIANTS — no backend mutation; no wallet mutation; no fake b3 CID; no fake publication; no fake moderation/ad/sandbox state.
 * RO:SECURITY — textContent/createElement only; no network; no storage writes; no executable user content; no ad tracking.
 * RO:TEST — node --check; manual crab://lyrics, crab://comment, crab://post, crab://ad, crab://algo, crab://code, crab://game.
 */

import { assetTypeSpec, buildUniformManifestDraft } from './page-uniform-manifest.js';

const STYLE_ID = 'crablinkSocialStubStyles';
const SECTION_ID = 'socialStubSection';
const PREVIEW_ID = 'socialStubManifestPreview';

const ROUTES = Object.freeze({
  'crab://lyrics': {
    ...assetTypeSpec('lyrics'),
    title: 'Lyrics Draft',
    badge: 'lyrics stub',
    description:
      'Draft lyrics as a future independent b3-backed asset that can be referenced from .music or .song manifests.',
    accentClass: 'lyrics',
    linkedAssets: {
      music: { kind: 'music', pending: true },
      song: { kind: 'song', pending: true }
    },
    nextBackendWork: [
      'ron-proto lyrics DTOs',
      'typed .lyrics parser support',
      'lyrics prepare/create/read routes',
      'music/song manifest lyrics reference field',
      'rights/paywall/DRM boundary for lyrics access'
    ],
    fields: [
      field('title', 'Lyrics title', 'Song lyrics title'),
      field('linkedMusicUrl', 'Linked music/song crab URL', 'crab://<64hex>.music or crab://<64hex>.song'),
      select('rightsMode', 'Rights mode', [
        ['separate-rights', 'Separate lyrics rights'],
        ['same-as-song', 'Same as linked song'],
        ['publisher-controlled', 'Publisher controlled'],
        ['private-unpublished', 'Private / unpublished']
      ]),
      select('accessMode', 'Access mode', [
        ['same-as-music', 'Same as music'],
        ['free-preview', 'Free preview'],
        ['paid-separate', 'Paid separately'],
        ['owner-only', 'Owner only']
      ]),
      textarea('body', 'Lyrics body', 'Paste or write lyrics here. Local stub only.', 10)
    ]
  },

  'crab://comment': {
    ...assetTypeSpec('comment'),
    title: 'Comment Draft',
    badge: 'comment stub',
    description:
      'Draft a future b3-backed comment asset with parent linkage, moderation metadata, and optional paid/reputation policy.',
    accentClass: 'comment',
    nextBackendWork: [
      'ron-proto comment DTOs',
      'parent asset/site reference validation',
      'comment prepare/create/read routes',
      'moderation policy hooks',
      'comment index/feed projection',
      'paid/reputation policy hooks if enabled'
    ],
    fields: [
      field('parentUrl', 'Parent asset / page', 'crab://<64hex>.post, crab://<64hex>.article, crab://site-name'),
      field('authorHandle', 'Display handle', '@username or anonymous alt label'),
      select('visibility', 'Visibility', [
        ['public', 'Public'],
        ['passport-only', 'Passport only'],
        ['site-members', 'Site members'],
        ['private-draft', 'Private draft']
      ]),
      select('moderationMode', 'Moderation mode', [
        ['site-policy', 'Site policy'],
        ['creator-approval', 'Creator approval'],
        ['auto-visible', 'Auto visible'],
        ['held-for-review', 'Held for review']
      ]),
      textarea('body', 'Comment body', 'Write a comment. Local stub only.', 8)
    ]
  },

  'crab://post': {
    ...assetTypeSpec('post'),
    title: 'Post Draft',
    badge: 'post stub',
    description:
      'Draft a future b3-backed post asset with tags, visibility, reply/comment policy, and creator payout metadata.',
    accentClass: 'post',
    nextBackendWork: [
      'ron-proto post DTOs',
      'post prepare/create/read routes',
      'tag/feed/index projection',
      'comment policy hooks',
      'passport/alt author display policy',
      'paid access and creator payout policy if enabled'
    ],
    fields: [
      field('title', 'Post title', 'A short post title'),
      field('authorHandle', 'Display handle', '@username or anonymous alt label'),
      field('tags', 'Tags', 'rustyonions, crablink, post'),
      select('visibility', 'Visibility', [
        ['public', 'Public'],
        ['passport-only', 'Passport only'],
        ['paid-access', 'Paid access'],
        ['private-draft', 'Private draft']
      ]),
      select('commentPolicy', 'Comment policy', [
        ['open', 'Open comments'],
        ['passport-only', 'Passport only'],
        ['site-members', 'Site members'],
        ['closed', 'Closed']
      ]),
      textarea('body', 'Post body', 'Write a post. Local stub only.', 9)
    ]
  },

  'crab://ad': {
    ...assetTypeSpec('ad', {
      futureRoutes: {
        prepare: '/ads/campaigns/prepare',
        publish: '/ads/campaigns',
        read: '/ads/campaigns/<hash>'
      }
    }),
    title: 'Ad Campaign Draft',
    badge: 'feature-gated ad stub',
    description:
      'Plan a future feature-gated ad campaign asset with strict policy, budget, targeting, and anti-tracking boundaries.',
    accentClass: 'ad',
    featureGate: 'ads',
    nextBackendWork: [
      'svc-ads campaign DTOs',
      'feature gate for ad campaign creation',
      'ad policy review route',
      'budget hold/capture/release route',
      'privacy-preserving placement rules',
      'no third-party tracking enforcement'
    ],
    fields: [
      field('campaignName', 'Campaign name', 'CrabLink launch campaign'),
      field('destinationCrabUrl', 'Destination crab URL', 'crab://site-name or crab://<64hex>.post'),
      select('campaignGoal', 'Campaign goal', [
        ['awareness', 'Awareness'],
        ['site-visit', 'Site visit'],
        ['asset-view', 'Asset view'],
        ['creator-follow', 'Creator follow']
      ]),
      select('audienceMode', 'Audience mode', [
        ['contextual-only', 'Contextual only'],
        ['site-opt-in', 'Site opt-in'],
        ['passport-opt-in', 'Passport opt-in'],
        ['disabled', 'Disabled']
      ]),
      field('budgetMinor', 'Budget minor units', '0'),
      textarea('creativeText', 'Creative text', 'Ad copy draft. No tracking pixel. No upload.', 6)
    ]
  },

  'crab://algo': {
    ...assetTypeSpec('algo'),
    title: 'Open Algorithm Draft',
    badge: 'algo stub',
    description:
      'Draft an open-source algorithm manifest for feed ranking, recommendation, moderation, search, or discovery logic.',
    accentClass: 'algo',
    nextBackendWork: [
      'algorithm manifest DTOs',
      'open-source algo registry routes',
      'facet/permission contract integration',
      'deterministic evaluation metadata',
      'sandboxed execution policy if runnable'
    ],
    fields: [
      field('algoName', 'Algorithm name', 'Open Discovery Ranker'),
      field('repoUrl', 'Source repository URL', 'https://example.invalid/repo'),
      select('algoKind', 'Algorithm kind', [
        ['feed-ranking', 'Feed ranking'],
        ['recommendation', 'Recommendation'],
        ['moderation', 'Moderation'],
        ['search-ranking', 'Search ranking'],
        ['curation', 'Curation']
      ]),
      select('license', 'License', [
        ['mit-apache', 'MIT OR Apache-2.0'],
        ['mit', 'MIT'],
        ['apache-2.0', 'Apache-2.0'],
        ['gpl-compatible', 'GPL-compatible'],
        ['custom-review-required', 'Custom / review required']
      ]),
      textarea('descriptionBody', 'Algorithm description', 'Explain inputs, outputs, fairness notes, and transparency goals.', 8)
    ]
  },

  'crab://code': {
    ...assetTypeSpec('code'),
    title: 'Code Block Draft',
    badge: 'facet-gated code stub',
    description:
      'Draft a future code primitive. The b3 code address is not executable by itself; facet.toml is the contract and svc-sandbox is the cage.',
    accentClass: 'code',
    featureGate: 'code-primitives',
    nextBackendWork: [
      'code primitive manifest DTOs',
      'facet.toml permission contract',
      'svc-sandbox execution policy',
      'ron-policy capability review',
      'no arbitrary execution from crab links',
      'CrabLink renderer/launcher boundary'
    ],
    fields: [
      field('moduleName', 'Code module name', 'hello-card'),
      select('runtime', 'Runtime', [
        ['wasm', 'WASM'],
        ['javascript', 'JavaScript'],
        ['typescript', 'TypeScript'],
        ['lua', 'Lua'],
        ['static-template', 'Static template']
      ]),
      select('permissionProfile', 'Permission profile', [
        ['none', 'No permissions'],
        ['render-only', 'Render only'],
        ['storage-read', 'Storage read'],
        ['wallet-readonly', 'Wallet readonly'],
        ['policy-review-required', 'Policy review required']
      ]),
      field('facetUrl', 'Future facet.toml crab URL', 'crab://<64hex>.facet'),
      textarea('codeNotes', 'Code notes', 'Describe what this code primitive should do. Do not paste secrets.', 8)
    ]
  },

  'crab://game': {
    ...assetTypeSpec('game'),
    title: 'Game Draft',
    badge: 'game stub',
    description:
      'Draft a future b3-backed game manifest with assets, permissions, save-data policy, and optional multiplayer/economy gates.',
    accentClass: 'game',
    featureGate: 'games',
    nextBackendWork: [
      'game manifest DTOs',
      'game asset bundle references',
      'sandbox/runtime policy',
      'save-data ownership policy',
      'multiplayer/session routes if enabled',
      'paid access and payout policy if enabled'
    ],
    fields: [
      field('gameTitle', 'Game title', 'Crab Runner'),
      select('gameKind', 'Game kind', [
        ['single-player', 'Single-player'],
        ['multiplayer', 'Multiplayer'],
        ['interactive-fiction', 'Interactive fiction'],
        ['arcade', 'Arcade'],
        ['experimental', 'Experimental']
      ]),
      select('runtime', 'Runtime', [
        ['web-rendered', 'Web-rendered'],
        ['wasm-sandbox', 'WASM sandbox'],
        ['streamed', 'Streamed'],
        ['native-future', 'Native future']
      ]),
      select('savePolicy', 'Save-data policy', [
        ['local-only', 'Local only'],
        ['passport-owned', 'Passport-owned'],
        ['site-owned', 'Site-owned'],
        ['disabled', 'Disabled']
      ]),
      textarea('gameDescription', 'Game description', 'Describe gameplay, asset bundle needs, and permissions.', 8)
    ]
  }
});

const ROUTE_VALUES = new Set(Object.keys(ROUTES));

const HIDE_IDS = [
  'loadingPanel',
  'errorPanel',
  'workflowSection',
  'actionsSection',
  'fieldsSection',
  'warningsSection',
  'sitePageSection',
  'prepareSummary',
  'holdSection',
  'submitSection',
  'profileHomeSection',
  'musicDraftSection',
  'articleDraftSection',
  'videoDraftSection',
  'streamDraftSection',
  'podcastDraftSection',
  'nextLevelMusicLyricsAssetPanel',
  'nextLevelStreamPodcastPanel',
  'musicRightsPanel',
  'streamPodcastCompanionPanel'
];

const BODY_CLASSES_TO_REMOVE = [
  'crablink-profile-view-mode',
  'crablink-site-full-view-mode',
  'crablink-music-draft-view-mode',
  'crablink-article-draft-view-mode',
  'crablink-video-draft-view-mode',
  'crablink-stream-draft-view-mode',
  'crablink-podcast-draft-view-mode'
];

let renderTimer = 0;
let activeRoute = '';

function boot() {
  installStyles();
  ensureQuickNavButtons();
  bindEvents();
  scheduleRender('boot');

  window.setTimeout(() => scheduleRender('boot-150'), 150);
  window.setTimeout(() => scheduleRender('boot-600'), 600);
  window.setTimeout(() => scheduleRender('boot-1400'), 1400);
}

function bindEvents() {
  document.addEventListener(
    'submit',
    (event) => {
      if (event.target?.id !== 'addressForm') return;

      const route = normalizedRoute(document.getElementById('addressInput')?.value);
      if (!ROUTE_VALUES.has(route)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      renderRoute(route, { updateAddress: true });
    },
    true
  );

  document.addEventListener(
    'click',
    (event) => {
      const button = event.target?.closest?.('[data-open-crab]');
      if (!button) return;

      const route = normalizedRoute(button.getAttribute('data-open-crab'));
      if (!ROUTE_VALUES.has(route)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      renderRoute(route, { updateAddress: true });
    },
    true
  );

  document.addEventListener('input', (event) => {
    if (!event.target?.closest?.(`#${SECTION_ID}`)) return;
    updatePreview();
  });

  document.addEventListener('change', (event) => {
    if (!event.target?.closest?.(`#${SECTION_ID}`)) return;
    updatePreview();
  });

  document.addEventListener('click', (event) => {
    const action = event.target?.closest?.('[data-social-stub-action]')?.getAttribute('data-social-stub-action');
    if (!action) return;

    event.preventDefault();

    if (action === 'copy-json') {
      void copyText(JSON.stringify(buildPayload(), null, 2), 'Uniform manifest JSON copied.');
      return;
    }

    if (action === 'clear') {
      clearFields();
      updatePreview();
      setFooter(`${ROUTES[activeRoute]?.title || 'Stub'} cleared locally.`);
    }
  });

  window.addEventListener('popstate', () => scheduleRender('popstate'));
  window.addEventListener('hashchange', () => scheduleRender('hashchange'));

  const root = document.getElementById('pagePanel') || document.body || document.documentElement;
  if (root) {
    const observer = new MutationObserver(() => scheduleRender('mutation'));
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'data-crablink-active-route-kind', 'data-crablink-creator-route']
    });
  }
}

function scheduleRender(reason) {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    ensureQuickNavButtons();

    const route = currentRoute();

    if (ROUTE_VALUES.has(route)) {
      renderRoute(route, { updateAddress: false, reason });
      return;
    }

    cleanup();
  }, 90);
}

function renderRoute(route, { updateAddress = false } = {}) {
  const meta = ROUTES[route];
  if (!meta) return;

  activeRoute = route;

  if (updateAddress) setAddress(route);

  prepareShell(meta);
  renderStub(meta);
  updatePreview();

  document.dispatchEvent(
    new CustomEvent('crablink:social-stub-route', {
      detail: {
        route,
        kind: meta.kind,
        sectionId: SECTION_ID
      }
    })
  );
}

function prepareShell(meta) {
  const pagePanel = document.getElementById('pagePanel');
  if (pagePanel) {
    pagePanel.classList.remove('hidden');
    pagePanel.removeAttribute('aria-hidden');
  }

  for (const id of HIDE_IDS) {
    const node = document.getElementById(id);
    if (!node) continue;

    node.classList.add('hidden');
    node.setAttribute('aria-hidden', 'true');
  }

  if (document.body) {
    for (const className of BODY_CLASSES_TO_REMOVE) document.body.classList.remove(className);

    document.body.setAttribute('data-crablink-active-route-kind', 'stub');
    document.body.setAttribute('data-crablink-stub-route', meta.slug);
    document.body.removeAttribute('data-crablink-creator-route');
  }

  setText(document.getElementById('pageBadge'), meta.badge);
  setText(document.getElementById('pageTitle'), meta.title);
  setText(document.getElementById('pageDescription'), meta.description);

  const hero = document.querySelector('#pagePanel > .page-hero');
  if (hero) {
    hero.classList.remove('hidden');
    hero.removeAttribute('aria-hidden');
  }

  const facts = document.getElementById('pageFacts');
  if (facts) {
    facts.classList.remove('hidden');
    facts.removeAttribute('aria-hidden');
    clearChildren(facts);
    facts.append(
      factTile('Crab URL', `crab://${meta.slug}`),
      factTile('Future kind', meta.kind),
      factTile('Status', 'local stub'),
      factTile('Future route', meta.futureRoutes.prepare),
      factTile('Asset URL shape', meta.assetShape),
      factTile('ROC charge', 'none on page load')
    );
  }
}

function renderStub(meta) {
  const section = ensureSection();
  section.className = `content-section social-stub-section ${meta.accentClass}`;
  section.classList.remove('hidden');
  section.removeAttribute('aria-hidden');
  clearChildren(section);

  const head = document.createElement('div');
  head.className = 'social-stub-head';

  const copy = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'social-stub-eyebrow';
  eyebrow.textContent = 'pre-refactor built-in stub';

  const title = document.createElement('h3');
  title.textContent = meta.title;

  const desc = document.createElement('p');
  desc.textContent = meta.description;

  copy.append(eyebrow, title, desc);

  const badge = document.createElement('span');
  badge.className = 'social-stub-badge';
  badge.textContent = meta.kind;

  head.append(copy, badge);

  const truth = document.createElement('div');
  truth.className = 'social-stub-truth';
  truth.textContent =
    'Truth boundary: this page does not publish content, does not create a b3 CID, does not create an index pointer, does not charge ROC, does not mutate a wallet, and does not claim backend route support.';

  const grid = document.createElement('div');
  grid.className = 'social-stub-grid';

  for (const fieldDef of meta.fields) grid.append(buildField(fieldDef));

  const actions = document.createElement('div');
  actions.className = 'social-stub-actions';

  const copyJson = document.createElement('button');
  copyJson.type = 'button';
  copyJson.textContent = 'Copy Uniform Manifest JSON';
  copyJson.setAttribute('data-social-stub-action', 'copy-json');

  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'secondary';
  clear.textContent = 'Clear Stub';
  clear.setAttribute('data-social-stub-action', 'clear');

  actions.append(copyJson, clear);

  const previewDetails = document.createElement('details');
  previewDetails.className = 'social-stub-preview-details';
  previewDetails.open = true;

  const summary = document.createElement('summary');
  summary.textContent = 'Uniform manifest draft';

  const preview = document.createElement('pre');
  preview.id = PREVIEW_ID;
  preview.className = 'social-stub-preview';

  previewDetails.append(summary, preview);
  section.append(head, truth, grid, actions, previewDetails);
}

function ensureSection() {
  let section = document.getElementById(SECTION_ID);
  if (section) return section;

  const pagePanel = document.getElementById('pagePanel');
  section = document.createElement('section');
  section.id = SECTION_ID;
  section.className = 'content-section social-stub-section';

  const developerDetails = document.getElementById('developerDetails');
  if (pagePanel && developerDetails?.parentElement === pagePanel) {
    pagePanel.insertBefore(section, developerDetails);
  } else if (pagePanel) {
    pagePanel.append(section);
  } else {
    document.body.append(section);
  }

  return section;
}

function buildField(fieldDef) {
  const label = document.createElement('label');
  label.className = fieldDef.type === 'textarea' ? 'social-stub-field full' : 'social-stub-field';

  const span = document.createElement('span');
  span.textContent = fieldDef.label;

  let control;

  if (fieldDef.type === 'textarea') {
    control = document.createElement('textarea');
    control.rows = fieldDef.rows || 6;
  } else if (fieldDef.type === 'select') {
    control = document.createElement('select');

    for (const [value, text] of fieldDef.options || []) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      control.append(option);
    }
  } else {
    control = document.createElement('input');
    control.type = 'text';
  }

  control.dataset.socialStubField = fieldDef.name;
  control.placeholder = fieldDef.placeholder || '';
  control.autocomplete = 'off';

  label.append(span, control);
  return label;
}

function updatePreview() {
  const preview = document.getElementById(PREVIEW_ID);
  if (!preview) return;

  const payload = buildPayload();
  preview.textContent = JSON.stringify(payload, null, 2);
  setDeveloperJson(payload);
}

function buildPayload() {
  const meta = ROUTES[activeRoute];
  if (!meta) return {};

  const localFields = {};
  for (const fieldDef of meta.fields) {
    localFields[fieldDef.name] = fieldValue(fieldDef.name);
  }

  const linkedAssets = buildLinkedAssets(meta, localFields);

  return buildUniformManifestDraft({
    kind: meta.kind,
    slug: meta.slug,
    title: localFields.title || localFields.gameTitle || localFields.campaignName || localFields.algoName || localFields.moduleName || meta.title,
    description:
      localFields.descriptionBody ||
      localFields.gameDescription ||
      localFields.codeNotes ||
      localFields.creativeText ||
      localFields.body ||
      meta.description,
    fields: localFields,
    tags: localFields.tags,
    featureGate: meta.featureGate || '',
    linkedAssets,
    policy: {
      visibility: localFields.visibility || 'local-draft',
      accessMode: localFields.accessMode || localFields.audienceMode || 'not-wired',
      moderationMode: localFields.moderationMode || 'not-wired',
      commentPolicy: localFields.commentPolicy || null
    },
    economics: {
      priceMinor: localFields.budgetMinor || '0',
      paidAccessEnabled: localFields.visibility === 'paid-access' || localFields.accessMode === 'paid-separate'
    },
    futureRoutes: meta.futureRoutes,
    assetShape: meta.assetShape,
    nextBackendWork: meta.nextBackendWork,
    requiredCapabilities: capabilitiesFor(meta.kind)
  });
}

function buildLinkedAssets(meta, localFields) {
  const out = { ...(meta.linkedAssets || {}) };

  if (localFields.linkedMusicUrl) {
    out.music_or_song = {
      kind: localFields.linkedMusicUrl.endsWith('.song') ? 'song' : 'music',
      crabUrl: localFields.linkedMusicUrl,
      pending: false
    };
  }

  if (localFields.destinationCrabUrl) {
    out.destination = {
      kind: 'destination',
      crabUrl: localFields.destinationCrabUrl,
      pending: false
    };
  }

  if (localFields.parentUrl) {
    out.parent = {
      kind: 'parent',
      crabUrl: localFields.parentUrl,
      pending: false
    };
  }

  if (localFields.facetUrl) {
    out.facet = {
      kind: 'facet',
      crabUrl: localFields.facetUrl,
      pending: false
    };
  }

  return out;
}

function capabilitiesFor(kind) {
  if (kind === 'ad') return ['feature:ads', 'policy:ad-review', 'wallet:explicit-budget-hold'];
  if (kind === 'algo') return ['feature:open-algorithms', 'policy:transparency-review'];
  if (kind === 'code') return ['feature:code-primitives', 'facet:required', 'sandbox:required', 'policy:deny-by-default'];
  if (kind === 'game') return ['feature:games', 'sandbox:required'];
  if (kind === 'comment') return ['policy:moderation'];
  return [];
}

function cleanup() {
  const section = document.getElementById(SECTION_ID);
  if (section) {
    section.classList.add('hidden');
    section.setAttribute('aria-hidden', 'true');
  }

  if (document.body?.getAttribute('data-crablink-active-route-kind') === 'stub') {
    document.body.removeAttribute('data-crablink-active-route-kind');
    document.body.removeAttribute('data-crablink-stub-route');
  }

  activeRoute = '';
}

function clearFields() {
  const section = document.getElementById(SECTION_ID);
  if (!section) return;

  for (const control of section.querySelectorAll('[data-social-stub-field]')) {
    control.value = '';
  }
}

function fieldValue(name) {
  return clean(document.querySelector(`#${SECTION_ID} [data-social-stub-field="${name}"]`)?.value);
}

function factTile(label, value) {
  const tile = document.createElement('div');

  const title = document.createElement('span');
  title.textContent = label;

  const body = document.createElement('strong');
  body.textContent = value;

  tile.append(title, body);
  return tile;
}

function currentRoute() {
  const address = normalizedRoute(document.getElementById('addressInput')?.value);
  if (address) return address;

  try {
    const params = new URLSearchParams(window.location.search);
    return normalizedRoute(params.get('url') || params.get('crab'));
  } catch {
    return '';
  }
}

function normalizedRoute(value) {
  const raw = clean(value).toLowerCase();
  if (!raw.startsWith('crab://')) return '';
  return raw.replace(/\/+$/, '');
}

function setAddress(route) {
  const input = document.getElementById('addressInput');
  if (input) input.value = route;

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('url', route);
    window.history.pushState({ crabUrl: route }, '', url.toString());
  } catch {
    // Navigation state is convenience-only.
  }
}

function ensureQuickNavButtons() {
  const nav = document.querySelector('.quick-nav');
  if (!nav) return;

  for (const route of ROUTE_VALUES) {
    if (nav.querySelector(`[data-open-crab="${route}"]`)) continue;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = route;
    button.setAttribute('data-open-crab', route);
    nav.append(button);
  }
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(String(text || ''));
    setFooter(message || 'Copied.');
  } catch {
    setFooter(String(text || '').slice(0, 240));
  }
}

function setDeveloperJson(payload) {
  const details = document.getElementById('developerDetails');
  const pre = document.getElementById('developerJson');

  if (details) details.open = false;
  if (pre) pre.textContent = JSON.stringify(payload || {}, null, 2);
}

function clearChildren(node) {
  if (node) node.textContent = '';
}

function setText(node, value) {
  if (node) node.textContent = String(value ?? '');
}

function setFooter(message) {
  const footer = document.getElementById('footerStatus');
  if (footer) footer.textContent = message;
}

function field(name, label, placeholder) {
  return { name, label, placeholder, type: 'input' };
}

function textarea(name, label, placeholder, rows) {
  return { name, label, placeholder, rows, type: 'textarea' };
}

function select(name, label, options) {
  return { name, label, options, type: 'select' };
}

function clean(value) {
  return String(value ?? '').trim();
}

function installStyles() {
  const old = document.getElementById(STYLE_ID);
  if (old) old.remove();

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body[data-crablink-active-route-kind="stub"] #workflowSection,
    body[data-crablink-active-route-kind="stub"] #actionsSection,
    body[data-crablink-active-route-kind="stub"] #fieldsSection,
    body[data-crablink-active-route-kind="stub"] #warningsSection,
    body[data-crablink-active-route-kind="stub"] #sitePageSection,
    body[data-crablink-active-route-kind="stub"] #profileHomeSection,
    body[data-crablink-active-route-kind="stub"] #musicDraftSection,
    body[data-crablink-active-route-kind="stub"] #articleDraftSection,
    body[data-crablink-active-route-kind="stub"] #videoDraftSection,
    body[data-crablink-active-route-kind="stub"] #streamDraftSection,
    body[data-crablink-active-route-kind="stub"] #podcastDraftSection {
      display: none !important;
    }

    .social-stub-section {
      display: grid;
      gap: 16px;
      border-color: rgba(148, 163, 184, 0.24) !important;
      background:
        radial-gradient(circle at top left, rgba(96, 165, 250, 0.10), transparent 42%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(8, 17, 34, 0.92)) !important;
    }

    .social-stub-section.lyrics,
    .social-stub-section.ad {
      border-color: rgba(251, 191, 36, 0.28) !important;
      background:
        radial-gradient(circle at top left, rgba(251, 191, 36, 0.12), transparent 42%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(8, 17, 34, 0.92)) !important;
    }

    .social-stub-section.comment,
    .social-stub-section.algo {
      border-color: rgba(34, 197, 94, 0.28) !important;
      background:
        radial-gradient(circle at top left, rgba(34, 197, 94, 0.11), transparent 42%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(8, 17, 34, 0.92)) !important;
    }

    .social-stub-section.post,
    .social-stub-section.code,
    .social-stub-section.game {
      border-color: rgba(168, 85, 247, 0.30) !important;
      background:
        radial-gradient(circle at top left, rgba(168, 85, 247, 0.13), transparent 42%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(8, 17, 34, 0.92)) !important;
    }

    .social-stub-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
    }

    .social-stub-eyebrow {
      margin: 0 0 7px;
      color: #bfdbfe;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .social-stub-head h3 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(30px, 4vw, 46px);
      line-height: 1;
      letter-spacing: -0.065em;
    }

    .social-stub-head p:not(.social-stub-eyebrow) {
      margin: 8px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .social-stub-badge {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 7px 11px;
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 999px;
      color: #dbeafe;
      background: rgba(30, 41, 59, 0.34);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .social-stub-truth {
      padding: 14px;
      border: 1px solid rgba(251, 191, 36, 0.24);
      border-radius: 18px;
      color: #fde68a;
      background: rgba(113, 63, 18, 0.14);
      line-height: 1.45;
      font-weight: 800;
    }

    .social-stub-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .social-stub-field {
      display: grid;
      gap: 7px;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 850;
    }

    .social-stub-field.full {
      grid-column: 1 / -1;
    }

    .social-stub-field span {
      color: #bfdbfe;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .social-stub-field input,
    .social-stub-field textarea,
    .social-stub-field select {
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

    .social-stub-field textarea {
      resize: vertical;
      min-height: 140px;
      line-height: 1.5;
    }

    .social-stub-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }

    .social-stub-actions button {
      min-height: 36px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 950;
    }

    .social-stub-preview-details {
      overflow: hidden;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 16px;
      background: rgba(2, 6, 23, 0.28);
    }

    .social-stub-preview-details summary {
      cursor: pointer;
      padding: 12px 14px;
      color: #f8fafc;
      font-weight: 950;
    }

    .social-stub-preview {
      max-height: 420px;
      overflow: auto;
      margin: 0;
      padding: 16px;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
      color: #dbeafe;
      background: #020617;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    body[data-crablink-active-route-kind="stub"] #pageFacts {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    body[data-crablink-active-route-kind="stub"] #pageFacts > div {
      display: grid;
      gap: 7px;
      min-width: 0;
      padding: 14px 16px;
      border: 1px solid rgba(96, 165, 250, 0.18);
      border-radius: 18px;
      background: rgba(15, 23, 42, 0.44);
    }

    body[data-crablink-active-route-kind="stub"] #pageFacts > div span {
      display: block;
      color: #bfdbfe;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.11em;
      line-height: 1.15;
      text-transform: uppercase;
    }

    body[data-crablink-active-route-kind="stub"] #pageFacts > div strong {
      display: block;
      color: #f8fafc;
      font-size: 14px;
      font-weight: 950;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    @media (max-width: 980px) {
      .social-stub-head {
        flex-direction: column;
      }

      .social-stub-grid,
      body[data-crablink-active-route-kind="stub"] #pageFacts {
        grid-template-columns: 1fr;
      }

      .social-stub-actions {
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