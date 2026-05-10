/**
 * RO:WHAT — Renders CrabLink's local and gateway-read .profile pages as real profile-style surfaces.
 * RO:WHY — NEXT_LEVEL identity UX; Concerns: DX/SEC; make profiles feel real while preserving backend truth boundaries.
 * RO:INTERACTS — page.html, storage.js, page-profile-editor.js, ronClient.js, configured svc-gateway raw object and profile routes.
 * RO:INVARIANTS — gateway-only; no wallet mutation; no fake reputation/mod truth; no alt linkage; public profile truth only from backend DTOs.
 * RO:METRICS — sends x-correlation-id through RonClient for public profile reads; avatar preview is client-side only.
 * RO:CONFIG — reads safe local settings through storage.js and local profile draft through chrome.storage.local.
 * RO:SECURITY — textContent/createElement only; avatar accepts only crab://<64hex>.image and fetches only gateway /o/b3:<hash>.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://profile, crab://@username, crab://profile/@username, crab://username.profile.
 */

import { RonClient, RonClientError } from './ronClient.js';
import { balanceSummary, getSettings } from './storage.js';

const STYLE_ID = 'crablinkProfileHomeStyles';
const PROFILE_URL = 'crab://profile';
const PROFILE_DRAFT_KEY = 'crablinkProfileDraftV1';
const PROFILE_SECTION_ID = 'profileHomeSection';
const PROFILE_VIEW_CLASS = 'crablink-profile-view-mode';
const BACKEND_PROFILE_PUBLISHING_STATUS = 'backend profile publishing is not wired yet';

let renderTimer = 0;
let profileAvatarObjectUrl = '';

function boot() {
  installStyles();
  bindIdentityRouteInterceptors();
  scheduleRenderOrCleanup();

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;

      const watched = [
        PROFILE_DRAFT_KEY,
        'gatewayUrl',
        'authToken',
        'passportSubject',
        'walletAccount',
        'requestedUsername',
        'requestedHandle',
        'username',
        'handle',
        'usernameStatus',
        'profileCrabUrl',
        'publicProfileCid',
        'rocBalanceDisplay',
        'rocBalanceMinorUnits',
        'rocLedgerBacked',
        'rocBalanceSource',
        'lastProductActionAt',
        'lastProductSchema',
        'lastProductCrabUrl',
        'lastProductB3Cid',
        'lastProductSiteName',
        'lastProductSummary',
        'recentReceipts'
      ];

      if (watched.some((key) => Object.prototype.hasOwnProperty.call(changes, key))) {
        scheduleRenderOrCleanup();
      }
    });
  }

  document.addEventListener('crablink:profile-draft-updated', scheduleRenderOrCleanup);

  for (const id of ['backButton', 'forwardButton', 'homeButton', 'refreshButton']) {
    document.getElementById(id)?.addEventListener('click', () => {
      window.setTimeout(scheduleRenderOrCleanup, 120);
      window.setTimeout(scheduleRenderOrCleanup, 450);
    });
  }

  window.addEventListener('popstate', scheduleRenderOrCleanup);

  window.setTimeout(scheduleRenderOrCleanup, 100);
  window.setTimeout(scheduleRenderOrCleanup, 450);
  window.setTimeout(scheduleRenderOrCleanup, 1200);
}

function bindIdentityRouteInterceptors() {
  document.addEventListener(
    'submit',
    (event) => {
      const form = event.target;
      if (!form || form.id !== 'addressForm') return;

      const input = document.getElementById('addressInput');
      const parsed = parseIdentityRoute(input?.value);

      if (!parsed) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      void renderIdentityPage(parsed, { updateAddress: true });
    },
    true
  );

  document.addEventListener(
    'click',
    (event) => {
      const button = event.target?.closest?.('[data-open-crab]');
      if (!button) return;

      const parsed = parseIdentityRoute(button.getAttribute('data-open-crab') || '');
      if (!parsed) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      void renderIdentityPage(parsed, { updateAddress: true });
    },
    true
  );

  document.addEventListener('click', (event) => {
    const openEditor = event.target?.closest?.('[data-crablink-edit-profile]');
    if (openEditor) {
      event.preventDefault();
      const payload = readDeveloperPayload() || {};
      openProfileEditor(payload);
      return;
    }

    const copyValue = event.target?.closest?.('[data-crablink-copy-profile-value]')?.getAttribute(
      'data-crablink-copy-profile-value'
    );
    if (copyValue) {
      event.preventDefault();
      void copyText(copyValue, 'Copied.');
      return;
    }

    const openValue = event.target?.closest?.('[data-crablink-open-profile-url]')?.getAttribute(
      'data-crablink-open-profile-url'
    );
    if (openValue) {
      event.preventDefault();
      submitCrabUrl(openValue);
    }
  });
}

function scheduleRenderOrCleanup() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    const parsed = currentIdentityRoute();

    if (parsed) {
      void renderIdentityPage(parsed, { updateAddress: false });
    } else {
      cleanupIdentityPage();
    }
  }, 80);
}

async function renderIdentityPage(parsed, { updateAddress = true } = {}) {
  const settings = await safeGetSettings();
  const profileDraft = await getProfileDraft();
  const route = enrichRoute(parsed, settings);

  prepareProfileCanvas();

  if (route.kind === 'profile' && route.shouldReadGatewayProfile) {
    await renderGatewayProfilePage(route, settings, { updateAddress });
    return;
  }

  const payload = buildIdentityPayload(route, settings, profileDraft);

  if (updateAddress) setAddress(payload.url);

  setDeveloperJson(payload);

  if (payload.route_kind === 'profile' && payload.local_profile_match) {
    await renderLocalProfilePage(payload, settings);
  } else {
    renderReservedIdentityPage(payload);
  }

  setFooter(payload.footer_status);
}

function prepareProfileCanvas() {
  hidePanelsForIdentityRoute();

  const pagePanel = document.getElementById('pagePanel');
  if (pagePanel) pagePanel.classList.remove('hidden');

  document.body.classList.remove('crablink-site-full-view-mode');
  document.body.classList.add(PROFILE_VIEW_CLASS);
}

async function renderGatewayProfilePage(route, settings, { updateAddress = true } = {}) {
  const requestedHandle = normalizeHandle(route.handle || route.username || route.raw);
  const username = stripAt(requestedHandle);
  const requestedUrl = route.route_form === 'profile-page' ? `crab://${username}.profile` : `crab://${requestedHandle}`;

  if (updateAddress) setAddress(requestedUrl);

  const loadingPayload = buildGatewayProfileLoadingPayload(route, requestedHandle);
  setDeveloperJson(loadingPayload);
  renderProfileLoadingPage(loadingPayload);
  setFooter(`Reading public profile ${requestedHandle || route.raw} through the gateway…`);

  try {
    const client = new RonClient(settings);
    const response = await client.getPassportProfile(username || requestedHandle || route.raw);
    const profile = normalizeGatewayProfileResponse(response, route, requestedHandle);
    const payload = buildGatewayProfilePayload(route, profile, response);

    setDeveloperJson(payload);
    await renderPublicProfilePage(payload, settings);
    setFooter(payload.footer_status);
  } catch (error) {
    const payload = buildGatewayProfileErrorPayload(route, requestedHandle, error);
    setDeveloperJson(payload);
    renderReservedIdentityPage(payload);
    setFooter(payload.footer_status);
  }
}

function cleanupIdentityPage() {
  revokeProfileAvatarObjectUrl();
  document.body.classList.remove(PROFILE_VIEW_CLASS);

  const section = document.getElementById(PROFILE_SECTION_ID);
  if (section) section.classList.add('hidden');

  const hero = document.querySelector('#pagePanel > .page-hero');
  if (hero) hero.classList.remove('hidden');

  const facts = document.getElementById('pageFacts');
  if (facts) facts.classList.remove('hidden');
}

function hidePanelsForIdentityRoute() {
  for (const id of ['loadingPanel', 'errorPanel']) {
    document.getElementById(id)?.classList.add('hidden');
  }

  for (const id of ['sitePageSection', 'workflowSection', 'actionsSection', 'fieldsSection', 'warningsSection']) {
    document.getElementById(id)?.classList.add('hidden');
  }

  const hero = document.querySelector('#pagePanel > .page-hero');
  if (hero) hero.classList.add('hidden');

  const facts = document.getElementById('pageFacts');
  if (facts) facts.classList.add('hidden');
}

async function renderLocalProfilePage(payload, settings) {
  const section = ensureProfileSection();
  clearElement(section);
  section.className = 'content-section profile-home-section profile-page-shell profile-local-section';

  const cover = buildProfileCover(payload, { source: 'local' });
  const grid = buildProfileBodyGrid(payload, { source: 'local' });
  const footer = buildProfileTruthFooter(payload, { source: 'local' });

  section.append(cover, grid, footer);
  await hydrateProfileAvatar(payload, settings);
}

async function renderPublicProfilePage(payload, settings) {
  const section = ensureProfileSection();
  clearElement(section);
  section.className = 'content-section profile-home-section profile-page-shell profile-gateway-read-section';

  const cover = buildProfileCover(payload, { source: 'gateway' });
  const grid = buildProfileBodyGrid(payload, { source: 'gateway' });
  const footer = buildProfileTruthFooter(payload, { source: 'gateway' });

  section.append(cover, grid, footer);
  await hydrateProfileAvatar(payload, settings);
}

function renderProfileLoadingPage(payload) {
  revokeProfileAvatarObjectUrl();

  const section = ensureProfileSection();
  clearElement(section);
  section.className = 'content-section profile-home-section profile-page-shell profile-gateway-read-section';

  const cover = document.createElement('article');
  cover.className = 'profile-cover-card reserved gateway-loading';

  const top = document.createElement('div');
  top.className = 'profile-cover-top';

  const titleBlock = document.createElement('div');
  const badge = document.createElement('span');
  badge.className = 'profile-route-badge muted';
  badge.textContent = payload.badge;

  const title = document.createElement('h2');
  title.textContent = payload.title;

  const description = document.createElement('p');
  description.textContent = payload.description;

  titleBlock.append(badge, title, description);

  const status = document.createElement('span');
  status.className = payload.status_class;
  status.textContent = payload.status_label;

  top.append(titleBlock, status);
  cover.append(top);
  section.append(cover, buildProfileTruthFooter(payload, { source: 'loading' }));
}

function renderReservedIdentityPage(payload) {
  revokeProfileAvatarObjectUrl();

  const section = ensureProfileSection();
  clearElement(section);
  section.className = 'content-section profile-home-section profile-page-shell profile-reserved-section';

  const cover = document.createElement('article');
  cover.className = 'profile-cover-card reserved';

  const top = document.createElement('div');
  top.className = 'profile-cover-top';

  const titleBlock = document.createElement('div');

  const badge = document.createElement('span');
  badge.className = 'profile-route-badge muted';
  badge.textContent = payload.badge;

  const title = document.createElement('h2');
  title.textContent = payload.title;

  const description = document.createElement('p');
  description.textContent = payload.description;

  titleBlock.append(badge, title, description);

  const status = document.createElement('span');
  status.className = payload.status_class;
  status.textContent = payload.status_label;

  top.append(titleBlock, status);

  const facts = document.createElement('div');
  facts.className = 'profile-detail-grid';

  for (const [label, value] of payload.facts || []) {
    facts.append(detailTile(label, value));
  }

  cover.append(top, facts);

  const cards = document.createElement('div');
  cards.className = 'profile-card-grid';

  for (const card of payload.cards || []) {
    cards.append(card);
  }

  section.append(cover, cards, buildProfileTruthFooter(payload, { source: 'reserved' }));
}

function ensureProfileSection() {
  let section = document.getElementById(PROFILE_SECTION_ID);
  if (section) {
    section.classList.remove('hidden');
    return section;
  }

  const pagePanel = document.getElementById('pagePanel');
  section = document.createElement('section');
  section.id = PROFILE_SECTION_ID;
  section.className = 'content-section profile-home-section profile-page-shell';

  const developerDetails = document.getElementById('developerDetails');
  if (pagePanel && developerDetails) {
    pagePanel.insertBefore(section, developerDetails);
  } else if (pagePanel) {
    pagePanel.append(section);
  } else {
    document.body.append(section);
  }

  return section;
}

function buildProfileCover(payload, options = {}) {
  const source = options.source || 'local';
  const draft = payload.local_profile_draft || emptyProfileDraft();

  const cover = document.createElement('article');
  cover.className = source === 'gateway' ? 'profile-cover-card backend-confirmed' : 'profile-cover-card';

  const top = document.createElement('div');
  top.className = 'profile-cover-top';

  const left = document.createElement('div');
  left.className = 'profile-cover-left';

  const avatar = document.createElement('div');
  avatar.className = 'profile-avatar-frame';

  const img = document.createElement('img');
  img.id = 'profileAvatarImage';
  img.className = 'profile-avatar-photo hidden';
  img.alt = `${payload.handle || 'Profile'} avatar`;

  const fallback = document.createElement('div');
  fallback.id = 'profileAvatarFallback';
  fallback.className = 'profile-avatar-fallback';
  fallback.textContent = source === 'gateway' ? initialsFromName(payload.display_name, payload.handle) : '🦀';

  const state = document.createElement('span');
  state.id = 'profileAvatarState';
  state.className = 'profile-avatar-state';
  state.textContent = draft.avatarCrabUrl ? 'loading image…' : 'no avatar';

  avatar.append(img, fallback, state);

  const identity = document.createElement('div');
  identity.className = 'profile-cover-identity';

  const badge = document.createElement('span');
  badge.className = source === 'gateway' ? 'profile-route-badge ok' : 'profile-route-badge';
  badge.textContent = source === 'gateway' ? 'public profile' : 'local profile draft';

  const title = document.createElement('h2');
  title.textContent = payload.display_name || 'RON Profile';

  const handle = document.createElement('p');
  handle.className = 'profile-handle-line';
  handle.textContent = payload.handle;

  const statusLine = document.createElement('p');
  statusLine.className = 'profile-status-copy';
  statusLine.textContent = profileStatusLine(payload, source);

  identity.append(badge, title, handle, statusLine);
  left.append(avatar, identity);

  const actions = document.createElement('div');
  actions.className = 'profile-cover-actions';

  if (source === 'local') {
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'profile-edit-button';
    edit.textContent = 'Edit Profile';
    edit.setAttribute('data-crablink-edit-profile', '1');
    actions.append(edit);
  }

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'secondary profile-small-button';
  copy.textContent = 'Copy Profile URL';
  copy.setAttribute('data-crablink-copy-profile-value', payload.profile_crab_url || payload.url);

  const copyHandle = document.createElement('button');
  copyHandle.type = 'button';
  copyHandle.className = 'secondary profile-small-button';
  copyHandle.textContent = 'Copy Handle';
  copyHandle.setAttribute('data-crablink-copy-profile-value', payload.handle || '');

  actions.append(copy, copyHandle);
  top.append(left, actions);

  const bio = document.createElement('section');
  bio.className = 'profile-about-panel';

  const bioHead = document.createElement('div');
  bioHead.className = 'profile-about-head';

  const bioTitle = document.createElement('h3');
  bioTitle.textContent = 'About';

  const bioStatus = document.createElement('span');
  bioStatus.className = payload.handle_status === 'confirmed' ? 'profile-pill ok' : 'profile-pill pending';
  bioStatus.textContent = payload.handle_status === 'confirmed' ? 'backend confirmed' : source === 'gateway' ? payload.handle_status || 'backend read' : 'local / pending';

  bioHead.append(bioTitle, bioStatus);

  const bioCopy = document.createElement('p');
  bioCopy.className = draft.bio ? 'profile-bio-copy' : 'profile-bio-copy muted';
  bioCopy.textContent = draft.bio || (source === 'local' ? 'No profile bio saved yet. Click Edit Profile to add one.' : 'No public bio returned by the gateway.');

  const tags = document.createElement('div');
  tags.className = 'profile-tag-row';

  const tagValues = Array.isArray(draft.tags) ? draft.tags : [];
  if (tagValues.length === 0) {
    const emptyTag = document.createElement('span');
    emptyTag.className = 'profile-tag muted';
    emptyTag.textContent = source === 'local' ? 'no tags yet' : 'no public tags';
    tags.append(emptyTag);
  } else {
    for (const tag of tagValues) {
      const chip = document.createElement('span');
      chip.className = 'profile-tag';
      chip.textContent = `#${tag}`;
      tags.append(chip);
    }
  }

  bio.append(bioHead, bioCopy, tags);

  const stats = document.createElement('div');
  stats.className = 'profile-stat-grid';

  stats.append(
    statChip('ROC', source === 'local' ? stripRocUnit(payload.roc_balance) || '—' : '—', source === 'local' ? 'ledger-backed balance label' : 'not public'),
    statChip('REP', scoreDisplay(payload.reputation_score), payload.reputation_help || 'not published yet'),
    statChip('MOD', scoreDisplay(payload.moderator_score), payload.moderation_help || 'not published yet'),
    statChip('Profile', source === 'gateway' ? payload.handle_status || 'backend read' : draft.exists ? 'draft saved' : 'not created', source === 'gateway' ? 'gateway profile status' : 'local-only profile status')
  );

  cover.append(top, bio, stats);
  return cover;
}

function profileStatusLine(payload, source) {
  if (source === 'gateway') {
    if (payload.handle_status === 'confirmed') return 'Backend-confirmed public profile handle.';
    return 'Public profile route read through the gateway. Confirmation depends on backend username_status.';
  }

  if (payload.handle_status === 'confirmed') return 'Backend-confirmed profile handle.';
  return `Local profile draft. ${BACKEND_PROFILE_PUBLISHING_STATUS}.`;
}

function buildProfileBodyGrid(payload, options = {}) {
  const source = options.source || 'local';
  const grid = document.createElement('div');
  grid.className = 'profile-card-grid';

  grid.append(buildIdentityCard(payload, source), buildSsoCard(payload, source), buildAssetCard(payload, source));
  return grid;
}

function buildIdentityCard(payload, source = 'local') {
  const card = document.createElement('article');
  card.className = 'profile-info-card';

  const head = cardHead(
    source === 'gateway' ? 'Public identity' : 'Identity',
    source === 'gateway' ? 'Backend-returned public profile fields only.' : 'Passport labels and backend-derived wallet display.'
  );

  const details = document.createElement('div');
  details.className = 'profile-detail-grid compact';

  details.append(
    detailTile('Passport', payload.passport_subject || (source === 'gateway' ? 'not public' : 'not loaded')),
    detailTile('Wallet', source === 'gateway' ? 'not public' : payload.wallet_account || 'not loaded'),
    detailTile('Ledger', source === 'gateway' ? 'not public' : payload.ledger_status || 'not loaded'),
    detailTile('Profile route', payload.profile_crab_url || 'not published'),
    detailTile('Profile CID', payload.public_profile_cid || 'not published'),
    detailTile('Handle status', payload.handle_status || 'unknown')
  );

  card.append(head, details);
  return card;
}

function buildSsoCard(payload, source = 'local') {
  const card = document.createElement('article');
  card.className = 'profile-info-card';

  const head = cardHead(
    source === 'gateway' ? 'Public profile truth' : 'SSO direction',
    source === 'gateway' ? 'This view stays read-only and does not infer private state.' : 'One profile for open-membership RustyOnions sites.'
  );

  const list = document.createElement('ul');
  list.className = 'profile-clean-list';

  const items = source === 'gateway'
    ? [
        'Public profile data came from svc-gateway.',
        'Wallet spending authority is not exposed by a public profile.',
        'Private main↔alt linkages are not shown or inferred.',
        'Reputation and moderator scores remain blank unless backend truth includes them.'
      ]
    : [
        'A site may later allow RON Passport membership instead of per-site registration.',
        'Wallet spending still requires explicit user confirmation.',
        'Alt passports remain separate unless the user intentionally links them.',
        'Reputation and moderator scores remain blank until backend truth exists.'
      ];

  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    list.append(li);
  }

  card.append(head, list);
  return card;
}

function buildAssetCard(payload, source = 'local') {
  const card = document.createElement('article');
  card.className = 'profile-info-card';

  const head = cardHead(
    source === 'gateway' ? 'Public profile actions' : 'Profile actions',
    source === 'gateway' ? 'Read-only actions for this backend profile.' : 'Local profile tools and next useful surfaces.'
  );

  const actions = document.createElement('div');
  actions.className = 'profile-action-grid';

  if (source === 'local') {
    actions.append(actionButton('Edit Profile', () => openProfileEditor(payload)));
  }

  actions.append(
    actionButton('Open crab://site', () => submitCrabUrl('crab://site')),
    actionButton('Open crab://image', () => submitCrabUrl('crab://image')),
    actionButton('Open Image Page', () => openAvatarImage(payload), {
      disabled: !isCanonicalImageUrl(payload.local_profile_draft?.avatarCrabUrl)
    }),
    actionButton('Copy JSON', () => copyText(JSON.stringify(payload, null, 2), 'Profile JSON copied.'), {
      secondary: true
    }),
    actionButton('Open Settings', () => openOptionsPage(), { secondary: true })
  );

  const note = document.createElement('p');
  note.className = 'profile-card-note';
  note.textContent =
    source === 'gateway'
      ? 'This public profile is read-only. CrabLink does not infer wallet, reputation, moderation, or private alt state from missing fields.'
      : `Profile data here is local-only until RustyOnions publishes profile/passport manifests. ${BACKEND_PROFILE_PUBLISHING_STATUS}. The avatar preview reads image bytes through the configured gateway.`;

  card.append(head, actions, note);
  return card;
}

function buildProfileTruthFooter(payload, options = {}) {
  const source = options.source || 'local';
  const footer = document.createElement('div');
  footer.className = 'profile-truth-footer';

  const title = document.createElement('strong');
  title.textContent = 'Truth boundary';

  const copy = document.createElement('span');
  if (source === 'gateway') {
    copy.textContent =
      'This page was loaded through svc-gateway as a read-only public profile. CrabLink does not infer wallet balance, spend authority, private alt mappings, private receipts, reputation, moderation, or profile ownership from local state.';
  } else if (payload.route_kind === 'profile') {
    copy.textContent =
      `This page may show local draft profile data, but it does not claim backend profile publication, username ownership, reputation, moderation, wallet authority, or private alt linkage unless backend DTOs explicitly provide those fields. ${BACKEND_PROFILE_PUBLISHING_STATUS}.`;
  } else {
    copy.textContent = 'This reserved route is display-only. CrabLink has not fetched or verified a backend manifest for it.';
  }

  footer.append(title, copy);
  return footer;
}

async function hydrateProfileAvatar(payload, settings) {
  const draft = payload.local_profile_draft || emptyProfileDraft();
  const avatarUrl = clean(draft.avatarCrabUrl);
  const img = document.getElementById('profileAvatarImage');
  const fallback = document.getElementById('profileAvatarFallback');
  const state = document.getElementById('profileAvatarState');

  if (!img || !fallback || !state) return;

  revokeProfileAvatarObjectUrl();

  if (!avatarUrl) {
    img.classList.add('hidden');
    fallback.classList.remove('hidden');
    state.textContent = 'no avatar';
    return;
  }

  const parsed = parseImageCrabUrl(avatarUrl);
  if (!parsed.ok) {
    img.classList.add('hidden');
    fallback.classList.remove('hidden');
    state.textContent = 'invalid image URL';
    return;
  }

  img.classList.add('hidden');
  fallback.classList.remove('hidden');
  state.textContent = 'loading image…';

  try {
    const objectUrl = await fetchProfileAvatarObjectUrl(parsed.hash, settings);
    profileAvatarObjectUrl = objectUrl;

    img.src = objectUrl;
    img.classList.remove('hidden');
    fallback.classList.add('hidden');
    state.textContent = 'gateway preview';
  } catch (error) {
    img.classList.add('hidden');
    fallback.classList.remove('hidden');
    state.textContent = shortError(error?.message || 'image failed');
  }
}

async function fetchProfileAvatarObjectUrl(hash, settings) {
  const gateway = normalizeGatewayUrl(settings.gatewayUrl);
  const response = await fetch(`${gateway}/o/b3:${hash}`, {
    method: 'GET',
    headers: makeGatewayHeaders(settings)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    throw new Error('empty bytes');
  }

  return URL.createObjectURL(blob);
}

function makeGatewayHeaders(settings) {
  const headers = {
    Accept: 'image/*'
  };

  const token = clean(settings.authToken);
  const passport = clean(settings.passportSubject);
  const wallet = clean(settings.walletAccount);

  if (token) headers.Authorization = `Bearer ${token}`;
  if (passport) headers['x-ron-passport'] = passport;
  if (wallet) headers['x-ron-wallet-account'] = wallet;

  return headers;
}

function revokeProfileAvatarObjectUrl() {
  if (!profileAvatarObjectUrl) return;

  try {
    URL.revokeObjectURL(profileAvatarObjectUrl);
  } catch {
    // Best-effort cleanup only.
  }

  profileAvatarObjectUrl = '';
}

function buildIdentityPayload(route, settings, profileDraft) {
  if (route.kind === 'passport') {
    return buildPassportPayload(route);
  }

  if (route.kind === 'alt') {
    return buildAltPayload(route);
  }

  return buildProfilePayload(route, settings, profileDraft);
}

function buildProfilePayload(route, settings, profileDraft) {
  const isLocal = route.isGeneric || route.isLocalHandle;
  const localHandle = displayHandle(settings);
  const requestedHandle = route.handle || localHandle;
  const resolvedHandle = isLocal ? localHandle : requestedHandle;
  const profileCrabUrl = profileRoute(settings);
  const publicProfileCid = clean(settings.publicProfileCid);
  const handleStatus = isLocal ? localHandleStatus(settings) : 'unresolved';
  const draft = isLocal ? profileDraft : emptyProfileDraft();
  const draftDisplayName = clean(draft.displayName);

  const payload = {
    schema: 'crablink.public_profile_view.v1',
    route_kind: 'profile',
    url: route.isGeneric ? PROFILE_URL : `crab://${stripAt(resolvedHandle)}.profile`,
    requested_url: route.raw,
    handle: resolvedHandle,
    handle_status: handleStatus,
    display_name: draftDisplayName || displayNameFromHandle(resolvedHandle),
    passport_subject: isLocal ? clean(settings.passportSubject) : '',
    wallet_account: isLocal ? clean(settings.walletAccount) : '',
    roc_balance: isLocal ? balanceSummary(settings) : 'not shown',
    ledger_status: isLocal
      ? settings.rocLedgerBacked
        ? `ledger-backed${settings.rocBalanceSource ? `, ${settings.rocBalanceSource}` : ''}`
        : 'not ledger-backed yet'
      : 'not shown',
    profile_crab_url: isLocal ? profileCrabUrl : '',
    public_profile_cid: isLocal ? publicProfileCid : '',
    local_profile_match: isLocal,
    local_profile_draft: draft,
    reputation_score: null,
    moderator_score: null,
    reputation_summary: null,
    moderation_summary: null,
    reputation_help: 'not computed yet',
    moderation_help: 'not computed yet',
    warnings: profileWarnings(isLocal)
  };

  return {
    ...payload,
    badge: 'profile',
    title: payload.display_name,
    description: isLocal
      ? `Local SSO-style profile page. ${BACKEND_PROFILE_PUBLISHING_STATUS}.`
      : `Reserved named .profile route. ${BACKEND_PROFILE_PUBLISHING_STATUS}.`,
    status_class: isLocal
      ? payload.handle_status === 'confirmed'
        ? 'profile-pill ok'
        : 'profile-pill pending'
      : 'profile-pill muted',
    status_label: isLocal
      ? payload.handle_status === 'confirmed'
        ? 'backend confirmed'
        : 'local / pending'
      : 'not resolved',
    footer_status: isLocal
      ? 'Loaded local crab://profile page.'
      : `Reserved .profile route ${payload.url}; ${BACKEND_PROFILE_PUBLISHING_STATUS}.`,
    facts: profileFacts(payload, isLocal),
    cards: []
  };
}

function buildGatewayProfileLoadingPayload(route, requestedHandle) {
  const handle = requestedHandle || normalizeHandle(route.handle) || '@username';

  return {
    schema: 'crablink.public-profile-loading.v1',
    route_kind: 'profile',
    url: `crab://${handle}`,
    requested_url: route.raw,
    handle,
    handle_status: 'gateway_lookup',
    display_name: displayNameFromHandle(handle),
    profile_crab_url: `crab://${handle}`,
    local_profile_match: false,
    local_profile_draft: emptyProfileDraft(),
    badge: 'profile',
    title: `Loading ${handle}`,
    description: 'CrabLink is reading this public profile through svc-gateway.',
    status_class: 'profile-pill pending',
    status_label: 'gateway lookup',
    footer_status: `Reading public profile ${handle}…`,
    facts: [],
    cards: []
  };
}

function buildGatewayProfilePayload(route, profile, response) {
  const publicProfileCid = clean(
    profile.public_profile_cid || profile.publicProfileCid || profile.profile_cid || profile.profileCid
  );
  const reputationScore = firstPresent(
    profile.reputation_score,
    profile.reputationScore,
    profile.reputation_summary?.score,
    profile.reputationSummary?.score
  );
  const moderatorScore = firstPresent(
    profile.moderator_score,
    profile.moderatorScore,
    profile.moderation_score,
    profile.moderationScore,
    profile.moderation_summary?.score,
    profile.moderationSummary?.score
  );
  const avatar = clean(
    profile.avatar_image || profile.avatarImage || profile.avatar_crab_url || profile.avatarCrabUrl
  ).toLowerCase();
  const username = stripAt(profile.username || profile.handle || route.handle || route.username);
  const handle = normalizeHandle(profile.handle || profile.username || username);
  const status = clean(profile.username_status || profile.usernameStatus || profile.status) || 'backend_unknown';
  const profileUrl = clean(profile.profile_crab_url || profile.profileCrabUrl) || `crab://${handle}`;
  const displayName = clean(profile.display_name || profile.displayName) || displayNameFromHandle(handle);

  return {
    schema: 'crablink.public-profile-gateway-view.v1',
    route_kind: 'profile',
    url: profileUrl,
    requested_url: route.raw,
    gateway_response_schema: clean(response?.schema || response?.data?.schema),
    backend_schema: clean(profile.schema),
    correlation_id: clean(response?.correlationId),
    handle,
    username,
    handle_status: status,
    display_name: displayName,
    passport_subject: clean(profile.passport_subject || profile.passportSubject),
    wallet_account: '',
    roc_balance: 'not public',
    ledger_status: 'not public',
    profile_crab_url: profileUrl,
    public_profile_cid: publicProfileCid,
    local_profile_match: false,
    local_profile_draft: {
      ...emptyProfileDraft(),
      exists: true,
      schema: 'crablink.gateway-public-profile.v1',
      status,
      handle,
      displayName,
      bio: clean(profile.bio),
      avatarCrabUrl: avatar,
      backendPublished: true,
      publicProfileCid,
      profileCrabUrl: profileUrl,
      tags: normalizeProfileTags(profile.tags || profile.public_tags || profile.publicTags)
    },
    reputation_score: reputationScore,
    moderator_score: moderatorScore,
    reputation_summary: profile.reputation_summary || profile.reputationSummary || null,
    moderation_summary: profile.moderation_summary || profile.moderationSummary || null,
    reputation_help: isPresent(reputationScore) ? 'backend provided' : 'not computed yet',
    moderation_help: isPresent(moderatorScore) ? 'backend provided' : 'not computed yet',
    warnings: [
      'This is a read-only public profile view loaded through the configured gateway.',
      'CrabLink does not infer wallet balance, spend authority, private alt mappings, private receipts, or private permissions from this profile.',
      'Reputation and moderator scores are shown only when backend fields are present.',
      'A missing public_profile_cid means no b3 profile manifest has been published yet.'
    ],
    badge: 'profile',
    title: displayName,
    description: 'Read-only public profile loaded from RustyOnions backend truth.',
    status_class: status === 'confirmed' ? 'profile-pill ok' : 'profile-pill pending',
    status_label: status === 'confirmed' ? 'backend confirmed' : status,
    footer_status: `Loaded public profile ${handle} through svc-gateway.`,
    facts: [],
    cards: []
  };
}

function buildGatewayProfileErrorPayload(route, requestedHandle, error) {
  const details = normalizeProfileRouteError(error);
  const handle = requestedHandle || normalizeHandle(route.handle || route.username) || '@username';

  return {
    schema: 'crablink.public-profile-error.v1',
    route_kind: 'profile',
    url: `crab://${handle}`,
    requested_url: route.raw,
    handle,
    handle_status: details.status,
    display_name: displayNameFromHandle(handle),
    passport_subject: '',
    wallet_account: '',
    roc_balance: 'not shown',
    ledger_status: 'not shown',
    profile_crab_url: '',
    public_profile_cid: '',
    local_profile_match: false,
    local_profile_draft: emptyProfileDraft(),
    reputation_score: null,
    moderator_score: null,
    reputation_summary: null,
    moderation_summary: null,
    reputation_help: 'not computed yet',
    moderation_help: 'not computed yet',
    warnings: [
      details.message,
      'CrabLink did not use stale local profile data as proof.',
      'No wallet, reputation, moderator score, private alt mapping, or spend authority is inferred.'
    ],
    badge: 'profile',
    title: `${handle} profile`,
    description: details.message,
    status_class: details.retryable ? 'profile-pill pending' : 'profile-pill muted',
    status_label: details.status,
    footer_status: details.footer,
    facts: [
      ['Crab URL', `crab://${handle}`],
      ['Route', '/identity/passport/profile/:username'],
      ['HTTP status', details.httpStatus || 'unknown'],
      ['Backend code', details.code || 'unknown'],
      ['Retryable', details.retryable ? 'yes' : 'no'],
      ['Gateway path', 'svc-gateway only']
    ],
    cards: [
      reservedRuleCard('Profile lookup result', [
        details.message,
        'If this is your username, claim it or refresh the public profile from CrabLink settings/profile.',
        'If services restarted during development, in-memory profile claims may need to be recreated.'
      ]),
      reservedRuleCard('Truth boundary', [
        'No confirmed username is displayed unless the backend returns username_status="confirmed".',
        'No public profile CID is shown unless the backend returns one.',
        'No reputation or moderation score is fabricated.'
      ])
    ]
  };
}

function buildPassportPayload(route) {
  const payload = {
    schema: 'crablink.reserved-passport-root.v1',
    route_kind: 'passport',
    url: `crab://${route.hash}.passport`,
    passport_public_id: route.hash,
    b3_root: `b3:${route.hash}`,
    status: 'reserved_route'
  };

  return {
    ...payload,
    badge: 'passport',
    title: 'Passport Root',
    description:
      'Reserved identity/capability proof route. Backend .passport manifest hydration is not wired yet.',
    status_class: 'profile-pill muted',
    status_label: 'reserved',
    footer_status: 'Reserved .passport route loaded. Backend passport root hydration is not wired yet.',
    facts: [
      ['Crab URL', payload.url],
      ['Public ID', payload.passport_public_id],
      ['Expected b3 root', payload.b3_root],
      ['Route kind', '.passport'],
      ['Backend status', 'not wired'],
      ['Wallet authority', 'not exposed']
    ],
    cards: [
      reservedRuleCard('Passport identity root', [
        'Future .passport IDs should be BLAKE3 hashes of canonical main passport public root manifests.',
        'A .passport page is not a raw wallet.',
        'No private keys, wallet secrets, private alt mappings, or spend authority are shown here.'
      ]),
      reservedRuleCard('Future .passport may include', [
        'schema/version',
        'kind = main',
        'passport verification key',
        'public random nonce',
        'optional profile pointer',
        'optional public capability summary'
      ])
    ]
  };
}

function buildAltPayload(route) {
  const payload = {
    schema: 'crablink.reserved-alt-root.v1',
    route_kind: 'alt',
    url: `crab://${route.hash}.alt`,
    alt_public_id: route.hash,
    b3_root: `b3:${route.hash}`,
    status: 'reserved_route'
  };

  return {
    ...payload,
    badge: 'alt',
    title: 'Alt Identity Root',
    description:
      'Reserved pseudonymous identity route. Backend .alt manifest hydration is not wired yet.',
    status_class: 'profile-pill muted',
    status_label: 'privacy reserved',
    footer_status: 'Reserved .alt route loaded. No main passport linkage is shown or inferred.',
    facts: [
      ['Crab URL', payload.url],
      ['Alt public ID', payload.alt_public_id],
      ['Expected b3 root', payload.b3_root],
      ['Route kind', '.alt'],
      ['Backend status', 'not wired'],
      ['Main linkage', 'not public / not shown']
    ],
    cards: [
      reservedRuleCard('Pseudonymous alt root', [
        'An alt must be a separate identity root.',
        'The public route must not reveal which main passport created it.',
        'Alt privacy is pseudonymous, not absolute anonymity against timing, funding, or device correlation.'
      ]),
      reservedRuleCard('Must not include or derive from', [
        'main passport ID',
        'main username',
        'main wallet account',
        'main public key',
        'funding source',
        'local device ID',
        'parent relationship'
      ])
    ]
  };
}

function reservedRuleCard(titleText, items) {
  const card = document.createElement('article');
  card.className = 'profile-info-card';

  const head = cardHead(titleText, 'Read-only reserved route information.');

  const list = document.createElement('ul');
  list.className = 'profile-clean-list';

  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    list.append(li);
  }

  card.append(head, list);
  return card;
}

function profileFacts(payload, isLocal) {
  return [
    ['Crab URL', payload.url],
    ['Handle', payload.handle],
    ['Handle status', payload.handle_status],
    ['Passport', isLocal ? payload.passport_subject || 'not loaded' : 'not resolved locally'],
    ['Wallet', isLocal ? payload.wallet_account || 'not loaded' : 'not shown'],
    ['ROC', isLocal ? payload.roc_balance || 'not loaded' : 'not shown'],
    ['Profile draft', isLocal ? (payload.local_profile_draft.exists ? 'local draft saved' : 'not created') : 'not resolved'],
    ['Profile route', isLocal ? payload.profile_crab_url || 'not published' : 'not resolved'],
    ['Profile CID', isLocal ? payload.public_profile_cid || 'not published' : 'not resolved'],
    ['SSO mode', isLocal ? 'local scaffold' : 'reserved backend route']
  ];
}

function detailTile(label, value) {
  const tile = document.createElement('div');
  tile.className = 'profile-detail-tile';

  const title = document.createElement('span');
  title.textContent = label;

  const body = document.createElement('strong');
  body.textContent = clean(value) || '—';

  tile.append(title, body);
  return tile;
}

function statChip(label, value, help) {
  const chip = document.createElement('div');
  chip.className = 'profile-stat-chip';

  const title = document.createElement('span');
  title.textContent = `${label}:`;

  const body = document.createElement('strong');
  body.textContent = clean(value) || '—';

  const sub = document.createElement('small');
  sub.textContent = help;

  chip.append(title, body, sub);
  return chip;
}

function cardHead(title, description) {
  const head = document.createElement('div');
  head.className = 'profile-card-head';

  const h = document.createElement('h3');
  h.textContent = title;

  const p = document.createElement('p');
  p.textContent = description;

  head.append(h, p);
  return head;
}

function actionButton(label, onClick, options = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.className = options.secondary ? 'secondary profile-action-button' : 'profile-action-button';
  button.disabled = options.disabled === true;
  button.addEventListener('click', onClick);
  return button;
}

function openProfileEditor(payload) {
  document.dispatchEvent(
    new CustomEvent('crablink:open-profile-editor', {
      detail: {
        handle: payload.handle,
        passportSubject: payload.passport_subject,
        walletAccount: payload.wallet_account
      }
    })
  );

  setFooter('Opened local profile editor.');
}

function openAvatarImage(payload) {
  const url = clean(payload.local_profile_draft?.avatarCrabUrl);
  if (isCanonicalImageUrl(url)) {
    submitCrabUrl(url);
  }
}

function openOptionsPage() {
  if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage();
    return;
  }

  setFooter('Open CrabLink settings from the extension controls.');
}

function parseIdentityRoute(value) {
  const raw = clean(value);
  if (!raw) return null;

  const lower = raw.toLowerCase();

  if (lower === 'profile' || lower === 'me' || lower === PROFILE_URL || lower === 'crab://me') {
    return { kind: 'profile', raw, isGeneric: true, handle: '', username: '', route_form: 'local-profile' };
  }

  if (!lower.startsWith('crab://')) return null;

  let body = raw.slice('crab://'.length).trim();
  body = body.replace(/^\/+/, '').replace(/\/+$/, '');

  const lowerBody = body.toLowerCase();

  const rootMatch = /^([0-9a-f]{64})\.(passport|alt)$/.exec(lowerBody);
  if (rootMatch) {
    return {
      kind: rootMatch[2],
      raw,
      hash: rootMatch[1]
    };
  }

  const profilePathMatch = /^profile\/@?([a-z0-9][a-z0-9._-]{1,31})$/.exec(lowerBody);
  if (profilePathMatch) {
    return profileRouteObject(raw, profilePathMatch[1], 'profile-path');
  }

  const directHandleMatch = /^@([a-z0-9][a-z0-9._-]{1,31})$/.exec(lowerBody);
  if (directHandleMatch) {
    return profileRouteObject(raw, directHandleMatch[1], 'profile-handle');
  }

  const profileMatch = /^@?([a-z0-9][a-z0-9._-]{1,31})\.profile$/.exec(lowerBody);
  if (profileMatch) {
    return profileRouteObject(raw, profileMatch[1], 'profile-page');
  }

  return null;
}

function profileRouteObject(raw, username, routeForm) {
  const handle = normalizeHandle(username);
  if (!handle) return null;

  return {
    kind: 'profile',
    raw,
    isGeneric: false,
    handle,
    username: stripAt(handle),
    route_form: routeForm
  };
}

function currentIdentityRoute() {
  const input = document.getElementById('addressInput')?.value || '';
  const param = new URLSearchParams(window.location.search).get('url') || '';

  return parseIdentityRoute(input) || parseIdentityRoute(param);
}

function enrichRoute(route, settings) {
  if (route.kind !== 'profile') return route;

  const isLocalHandle = route.isGeneric || handleMatchesLocal(route.handle, settings);

  return {
    ...route,
    isLocalHandle,
    shouldReadGatewayProfile: !route.isGeneric && !isLocalHandle
  };
}

function handleMatchesLocal(handle, settings) {
  const target = normalizeHandle(handle);
  if (!target) return false;

  const candidates = [settings.handle, settings.requestedHandle, settings.username, settings.requestedUsername]
    .map(normalizeHandle)
    .filter(Boolean);

  return candidates.includes(target);
}

function displayHandle(settings) {
  return (
    normalizeHandle(settings.handle) ||
    normalizeHandle(settings.requestedHandle) ||
    normalizeHandle(settings.username) ||
    normalizeHandle(settings.requestedUsername) ||
    '@username'
  );
}

function localHandleStatus(settings) {
  if (clean(settings.handle) && clean(settings.usernameStatus) === 'confirmed') return 'confirmed';
  if (clean(settings.handle)) return clean(settings.usernameStatus) || 'backend_unknown';
  if (clean(settings.requestedHandle) || clean(settings.requestedUsername)) return clean(settings.usernameStatus) || 'local_draft';
  return 'not_requested';
}

function profileRoute(settings) {
  const route = clean(settings.profileCrabUrl);
  if (route.startsWith('crab://')) return route;

  const cid = clean(settings.publicProfileCid);
  if (/^b3:[0-9a-f]{64}$/i.test(cid)) return `crab://${cid.slice(3).toLowerCase()}.profile`;

  return '';
}

function profileWarnings(isLocal) {
  if (!isLocal) {
    return [
      'This named profile route is a display placeholder unless gateway profile truth is returned.',
      'CrabLink has not resolved a backend profile manifest for this handle.',
      'No wallet, passport, reputation, moderation, or profile truth is inferred.'
    ];
  }

  return [
    'This profile page is a CrabLink local scaffold.',
    'Username/profile ownership is not backend-confirmed unless identity/profile DTOs say so.',
    'No private keys, wallet secrets, private alt mappings, or spend authority are shown here.'
  ];
}

async function safeGetSettings() {
  try {
    return await getSettings();
  } catch {
    return {};
  }
}

async function getProfileDraft() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return emptyProfileDraft();

  try {
    const stored = await chrome.storage.local.get([PROFILE_DRAFT_KEY]);
    return normalizeProfileDraft(stored?.[PROFILE_DRAFT_KEY]);
  } catch {
    return emptyProfileDraft();
  }
}

function normalizeProfileDraft(value) {
  const draft = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  if (!draft) return emptyProfileDraft();

  const tags = normalizeProfileTags(draft.tags);

  return {
    exists: true,
    schema: 'crablink.local-profile-draft.v1',
    status: clean(draft.status) || 'local_private_draft',
    handle: clean(draft.handle),
    passportSubject: clean(draft.passportSubject),
    walletLabel: clean(draft.walletLabel),
    displayName: clean(draft.displayName),
    bio: clean(draft.bio),
    avatarCrabUrl: clean(draft.avatarCrabUrl || draft.avatar_crab_url).toLowerCase(),
    tags,
    createdAt: clean(draft.createdAt),
    updatedAt: clean(draft.updatedAt),
    backendPublished: draft.backendPublished === true,
    publicProfileCid: clean(draft.publicProfileCid),
    profileCrabUrl: clean(draft.profileCrabUrl),
    warnings: Array.isArray(draft.warnings) ? draft.warnings.map(clean).filter(Boolean) : []
  };
}

function emptyProfileDraft() {
  return {
    exists: false,
    schema: 'crablink.local-profile-draft.v1',
    status: 'not_created',
    handle: '',
    passportSubject: '',
    walletLabel: '',
    displayName: '',
    bio: '',
    avatarCrabUrl: '',
    tags: [],
    createdAt: '',
    updatedAt: '',
    backendPublished: false,
    publicProfileCid: '',
    profileCrabUrl: '',
    warnings: []
  };
}

function normalizeGatewayProfileResponse(response, route, requestedHandle) {
  const candidate =
    response?.profile ||
    response?.public_profile ||
    response?.publicProfile ||
    response?.data?.profile ||
    response?.data?.public_profile ||
    response?.data?.publicProfile ||
    response?.data ||
    response;
  const profile = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate : {};
  const handle = normalizeHandle(profile.handle || profile.username || requestedHandle || route.handle || route.username);

  return {
    ...profile,
    username: stripAt(profile.username || handle),
    handle
  };
}

function normalizeProfileRouteError(error) {
  const httpStatus = error?.status || error?.httpStatus || error?.details?.status || '';
  const code = clean(error?.code || error?.details?.code || error?.body?.code || error?.reason);

  if (httpStatus === 404 || code === 'profile_not_found') {
    return errorInfo(
      'profile_not_found',
      httpStatus,
      code || 'profile_not_found',
      false,
      'No public profile found for this username yet.',
      'Profile not found yet. Claim or refresh your username.'
    );
  }

  if (httpStatus === 409 || code === 'username_unavailable') {
    return errorInfo(
      'username_unavailable',
      httpStatus,
      code || 'username_unavailable',
      false,
      'That username is already taken or unavailable.',
      'Username unavailable.'
    );
  }

  if (httpStatus === 400 || code === 'reserved_username') {
    return errorInfo(
      'reserved_username',
      httpStatus,
      code || 'reserved_username',
      false,
      'That username is reserved by RustyOnions.',
      'Username is reserved.'
    );
  }

  if (httpStatus === 502 || code === 'upstream_unavailable' || code === 'passport_upstream') {
    return errorInfo(
      'profile_upstream_unavailable',
      httpStatus,
      code || 'upstream_unavailable',
      true,
      'Profile service is temporarily unavailable. Check that the RustyOnions dev stack is running.',
      'Profile service is temporarily unavailable.'
    );
  }

  const fallback = error instanceof RonClientError ? error.message : error?.message;
  return errorInfo(
    'backend_unknown',
    httpStatus,
    code || 'unknown',
    false,
    fallback || 'Could not read this public profile.',
    fallback || 'Could not read this public profile.'
  );
}

function errorInfo(status, httpStatus, code, retryable, message, footer) {
  return { status, httpStatus, code, retryable, message, footer };
}

function parseImageCrabUrl(value) {
  const raw = clean(value).toLowerCase();
  const match = /^crab:\/\/([0-9a-f]{64})\.image$/.exec(raw);

  if (!match) return { ok: false, hash: '', url: raw };

  return {
    ok: true,
    hash: match[1],
    url: `crab://${match[1]}.image`
  };
}

function isCanonicalImageUrl(value) {
  return parseImageCrabUrl(value).ok;
}

function normalizeGatewayUrl(value) {
  return (clean(value) || 'http://127.0.0.1:8090').replace(/\/+$/, '');
}

function displayNameFromHandle(handle) {
  const raw = stripAt(handle);
  if (!raw || raw === 'username') return 'RON Profile';

  return raw
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function initialsFromName(name, handle) {
  const source = clean(name) || clean(handle) || 'RON';
  const parts = source
    .replace(/^@+/, '')
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  return (parts[0] || 'RON').slice(0, 2).toUpperCase();
}

function normalizeHandle(value) {
  const raw = clean(value).replace(/^@+/, '').toLowerCase();
  if (!raw) return '';

  const safe = raw.replace(/[^a-z0-9._-]/g, '').replace(/^[._-]+|[._-]+$/g, '');
  return safe ? `@${safe}` : '';
}

function stripAt(value) {
  return clean(value).replace(/^@+/, '');
}

function stripRocUnit(value) {
  return clean(value).replace(/\s*ROC\s*$/i, '');
}

function normalizeProfileTags(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => clean(tag).replace(/^#+/, '').toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
}

function firstPresent(...values) {
  for (const value of values) {
    if (isPresent(value)) return value;
  }
  return null;
}

function isPresent(value) {
  return value !== null && value !== undefined && clean(value) !== '';
}

function scoreDisplay(value) {
  return isPresent(value) ? String(value) : '—%';
}

function shortError(value) {
  const raw = clean(value);
  if (raw.length <= 24) return raw;
  return `${raw.slice(0, 24)}…`;
}

function submitCrabUrl(url) {
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

function setAddress(url) {
  const input = document.getElementById('addressInput');
  if (input) input.value = url;
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

function readDeveloperPayload() {
  const raw = clean(document.getElementById('developerJson')?.textContent || '');
  if (!raw || raw === '{}') return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setDeveloperJson(payload) {
  const details = document.getElementById('developerDetails');
  const pre = document.getElementById('developerJson');

  if (details) details.open = false;
  if (pre) pre.textContent = JSON.stringify(payload || {}, null, 2);
}

function clearElement(el) {
  if (el) el.textContent = '';
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
    body.${PROFILE_VIEW_CLASS} #pagePanel {
      max-width: min(1240px, calc(100vw - 420px));
      width: min(1240px, calc(100vw - 420px));
      margin-left: auto;
      margin-right: auto;
    }

    body.${PROFILE_VIEW_CLASS} #pagePanel > .page-hero,
    body.${PROFILE_VIEW_CLASS} #pageFacts {
      display: none !important;
    }

    .profile-page-shell {
      display: grid;
      gap: 16px;
      border: 0 !important;
      background: transparent !important;
      padding: 0 !important;
    }

    .profile-gateway-read-section #profileGatewayClaimCard {
      display: none !important;
    }

    .profile-cover-card,
    .profile-info-card,
    .profile-truth-footer {
      border: 1px solid rgba(34, 197, 94, 0.24);
      background:
        radial-gradient(circle at top left, rgba(34, 197, 94, 0.12), transparent 42%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(8, 17, 34, 0.94));
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22);
    }

    .profile-cover-card.backend-confirmed {
      border-color: rgba(59, 130, 246, 0.34);
      background:
        radial-gradient(circle at top left, rgba(59, 130, 246, 0.16), transparent 42%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(8, 17, 34, 0.96));
    }

    .profile-cover-card {
      display: grid;
      gap: 18px;
      padding: 22px;
      border-radius: 30px;
      overflow: hidden;
    }

    .profile-cover-card.reserved {
      gap: 20px;
    }

    .profile-cover-top {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: start;
    }

    .profile-cover-left {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 18px;
      align-items: center;
      min-width: 0;
    }

    .profile-avatar-frame {
      position: relative;
      width: 168px;
      height: 168px;
      border: 1px solid rgba(34, 197, 94, 0.38);
      border-radius: 36px;
      overflow: hidden;
      display: grid;
      place-items: center;
      background:
        radial-gradient(circle at top left, rgba(34, 197, 94, 0.18), transparent 48%),
        rgba(2, 6, 23, 0.56);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
    }

    .profile-avatar-photo {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }

    .profile-avatar-fallback {
      width: 92px;
      height: 92px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 30px;
      background: rgba(15, 23, 42, 0.62);
      color: #f8fafc;
      font-size: 48px;
      font-weight: 950;
      line-height: 1;
    }

    .profile-avatar-state {
      position: absolute;
      left: 10px;
      right: 10px;
      bottom: 10px;
      display: inline-flex;
      justify-content: center;
      padding: 6px 8px;
      border: 1px solid rgba(34, 197, 94, 0.30);
      border-radius: 999px;
      background: rgba(2, 6, 23, 0.72);
      color: #bbf7d0;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .profile-cover-identity {
      min-width: 0;
    }

    .profile-route-badge {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 6px 11px;
      border: 1px solid rgba(34, 197, 94, 0.28);
      border-radius: 999px;
      background: rgba(22, 101, 52, 0.22);
      color: #86efac;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .profile-route-badge.ok {
      border-color: rgba(59, 130, 246, 0.38);
      background: rgba(30, 64, 175, 0.28);
      color: #bfdbfe;
    }

    .profile-route-badge.muted {
      border-color: rgba(148, 163, 184, 0.30);
      background: rgba(30, 41, 59, 0.44);
      color: #cbd5e1;
    }

    .profile-cover-identity h2,
    .profile-cover-card.reserved h2 {
      margin: 12px 0 0;
      color: #f8fafc;
      font-size: clamp(44px, 7vw, 82px);
      line-height: 0.92;
      letter-spacing: -0.08em;
      overflow-wrap: anywhere;
    }

    .profile-handle-line {
      margin: 12px 0 0;
      color: #bbf7d0;
      font-size: clamp(20px, 2.2vw, 30px);
      font-weight: 950;
      letter-spacing: -0.04em;
    }

    .profile-status-copy,
    .profile-cover-card.reserved p {
      margin: 9px 0 0;
      color: #cbd5e1;
      font-size: 15px;
      line-height: 1.45;
    }

    .profile-cover-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }

    .profile-edit-button,
    .profile-small-button,
    .profile-action-button {
      min-height: 42px;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 950;
    }

    .profile-edit-button {
      background: #2563eb !important;
      color: #ffffff !important;
      border-color: rgba(147, 197, 253, 0.42) !important;
      box-shadow: 0 10px 30px rgba(37, 99, 235, 0.24);
    }

    .profile-about-panel {
      display: grid;
      gap: 10px;
      padding: 16px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 22px;
      background: rgba(2, 6, 23, 0.28);
    }

    .profile-about-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }

    .profile-about-head h3,
    .profile-card-head h3 {
      margin: 0;
      color: #f8fafc;
      font-size: 22px;
      letter-spacing: -0.04em;
    }

    .profile-bio-copy {
      margin: 0;
      color: #e2e8f0;
      font-size: 16px;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .profile-bio-copy.muted {
      color: #94a3b8;
      font-style: italic;
    }

    .profile-tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .profile-tag {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 6px 10px;
      border: 1px solid rgba(34, 197, 94, 0.26);
      border-radius: 999px;
      background: rgba(22, 101, 52, 0.14);
      color: #bbf7d0;
      font-size: 12px;
      font-weight: 900;
    }

    .profile-tag.muted {
      border-color: rgba(148, 163, 184, 0.20);
      background: rgba(30, 41, 59, 0.34);
      color: #94a3b8;
    }

    .profile-stat-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .profile-stat-chip,
    .profile-detail-tile {
      display: grid;
      gap: 5px;
      min-width: 0;
      padding: 13px;
      border: 1px solid rgba(34, 197, 94, 0.20);
      border-radius: 18px;
      background: rgba(2, 6, 23, 0.34);
    }

    .profile-stat-chip span,
    .profile-detail-tile span {
      color: #a7f3d0;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.10em;
      text-transform: uppercase;
    }

    .profile-stat-chip strong {
      color: #f8fafc;
      font-size: 22px;
      line-height: 1;
      overflow-wrap: anywhere;
    }

    .profile-stat-chip small {
      color: #94a3b8;
      line-height: 1.25;
    }

    .profile-card-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      align-items: stretch;
    }

    .profile-info-card {
      display: grid;
      align-content: start;
      gap: 14px;
      min-width: 0;
      padding: 17px;
      border-radius: 24px;
    }

    .profile-card-head p,
    .profile-card-note {
      margin: 7px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .profile-detail-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .profile-detail-grid.compact {
      grid-template-columns: 1fr;
    }

    .profile-detail-tile strong {
      color: #f8fafc;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }

    .profile-clean-list {
      display: grid;
      gap: 9px;
      margin: 0;
      padding-left: 18px;
      color: #dbeafe;
      line-height: 1.45;
    }

    .profile-action-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 9px;
    }

    .profile-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 28px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .profile-pill.ok {
      border: 1px solid rgba(34, 197, 94, 0.34);
      background: rgba(22, 101, 52, 0.18);
      color: #bbf7d0;
    }

    .profile-pill.pending {
      border: 1px solid rgba(251, 191, 36, 0.38);
      background: rgba(113, 63, 18, 0.20);
      color: #fde68a;
    }

    .profile-pill.muted {
      border: 1px solid rgba(148, 163, 184, 0.28);
      background: rgba(30, 41, 59, 0.38);
      color: #cbd5e1;
    }

    .profile-truth-footer {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 14px 16px;
      border-radius: 20px;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .profile-truth-footer strong {
      color: #bbf7d0;
      white-space: nowrap;
    }

    @media (max-width: 1280px) {
      body.${PROFILE_VIEW_CLASS} #pagePanel {
        max-width: calc(100vw - 40px);
        width: calc(100vw - 40px);
      }
    }

    @media (max-width: 980px) {
      .profile-cover-top,
      .profile-cover-left {
        grid-template-columns: 1fr;
      }

      .profile-cover-actions {
        justify-content: stretch;
      }

      .profile-cover-actions button {
        flex: 1;
      }

      .profile-stat-grid,
      .profile-card-grid,
      .profile-detail-grid {
        grid-template-columns: 1fr;
      }

      .profile-avatar-frame {
        width: 148px;
        height: 148px;
      }
    }

    @media (max-width: 640px) {
      .profile-cover-card {
        padding: 16px;
        border-radius: 24px;
      }

      .profile-cover-identity h2,
      .profile-cover-card.reserved h2 {
        font-size: 42px;
      }

      .profile-truth-footer {
        display: grid;
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