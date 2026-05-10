/**
 * RO:WHAT — Adds an honest local streamer-studio workspace to crab://stream.
 * RO:WHY — NEXT_LEVEL live media foundation; Concerns: DX/SEC; prove streamer UX without pretending backend live-streaming exists.
 * RO:INTERACTS — page.html, page.js shell, chrome.storage.local, future svc-gateway /streams/prepare route.
 * RO:INVARIANTS — local draft first; gateway-only prepare attempt; no stream key generation; no broadcast; no fake b3 CID; no wallet mutation.
 * RO:TRUTH — No b3 CID, No ROC charge, No wallet mutation, and no backend publication claim from local drafts.
 * RO:METRICS — client correlation IDs are generated for prepare attempts.
 * RO:CONFIG — stores crablinkStreamDraftV1 metadata only; local camera/screen preview streams are not persisted.
 * RO:SECURITY — textContent/createElement only; no private keys; no stream keys; no direct internal service calls; media preview requires user gesture.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://stream.
 */

const STYLE_ID = 'crablinkStreamDraftStyles';
const STREAM_SECTION_ID = 'streamDraftSection';
const ARTICLE_SECTION_ID = 'articleDraftSection';
const VIDEO_SECTION_ID = 'videoDraftSection';
const PROFILE_SECTION_ID = 'profileHomeSection';
const STREAM_PREPARE_STATUS_ID = 'streamGatewayPrepareStatus';
const STREAM_PREPARE_RESULT_ID = 'streamGatewayPrepareResult';
const DRAFT_KEY = 'crablinkStreamDraftV1';
const BUILTIN_SCHEMA = 'omnigate.builtin-page.v1';
const STREAM_VIEW_CLASS = 'crablink-stream-draft-view-mode';
const ARTICLE_VIEW_CLASS = 'crablink-article-draft-view-mode';
const VIDEO_VIEW_CLASS = 'crablink-video-draft-view-mode';
const PROFILE_VIEW_CLASS = 'crablink-profile-view-mode';
const FUTURE_STREAM_PREPARE_ROUTE = '/streams/prepare';

const DEFAULT_DRAFT = {
  schema: 'crablink.stream-draft.local.v1',
  title: '',
  category: '',
  description: '',
  tags: '',
  language: 'en',
  visibility: 'public',
  chatMode: 'open',
  moderationMode: 'passport-moderated',
  streamMode: 'camera',
  creatorHandle: '',
  thumbnailCrabUrl: '',
  suggestedPriceMinor: '0',
  tipsEnabled: true,
  updatedAt: ''
};

let renderTimer = 0;
let saveTimer = 0;
let lastRouteSignature = '';
let localPreviewStream = null;
let localPreviewMode = '';
let lastPrepareResponse = null;

function boot() {
  installStyles();
  scheduleRender();

  const root = document.getElementById('pagePanel') || document.body || document.documentElement;
  if (root) {
    const observer = new MutationObserver(scheduleRender);
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
      if (areaName === 'local' && Object.prototype.hasOwnProperty.call(changes, DRAFT_KEY)) {
        scheduleRender();
      }
    });
  }
}

function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    renderStreamDraftWorkspace().catch((error) => {
      setFooter(`Stream draft skipped: ${error?.message || error}`);
    });
  }, 90);
}

async function renderStreamDraftWorkspace() {
  if (!isStreamPage()) {
    lastRouteSignature = '';
    document.body?.classList.remove(STREAM_VIEW_CLASS);
    document.getElementById(STREAM_SECTION_ID)?.remove();
    stopLocalPreview();
    return;
  }

  showStreamShell();
  enforceStreamOnlyLayout();

  const pagePanel = document.getElementById('pagePanel');
  if (!pagePanel) return;

  const routeSignature = routeFingerprint();

  let section = document.getElementById(STREAM_SECTION_ID);
  if (!section) {
    section = buildStreamSection();

    const workflow = document.getElementById('workflowSection');
    const actions = document.getElementById('actionsSection');
    const fields = document.getElementById('fieldsSection');

    if (workflow && workflow.parentElement === pagePanel) {
      pagePanel.insertBefore(section, workflow);
    } else if (actions && actions.parentElement === pagePanel) {
      pagePanel.insertBefore(section, actions);
    } else if (fields && fields.parentElement === pagePanel) {
      pagePanel.insertBefore(section, fields);
    } else {
      pagePanel.append(section);
    }
  }

  if (routeSignature !== lastRouteSignature) {
    lastRouteSignature = routeSignature;
    await loadDraftIntoForm(section);
  }

  updateStreamPreviewState(section);
  updateStreamManifest(section);
}

function showStreamShell() {
  const loading = document.getElementById('loadingPanel');
  const error = document.getElementById('errorPanel');
  const page = document.getElementById('pagePanel');

  loading?.classList.add('hidden');
  error?.classList.add('hidden');
  page?.classList.remove('hidden');

  setText(document.getElementById('pageBadge'), 'stream');
  setText(document.getElementById('pageTitle'), 'CrabLink Stream Studio');
  setText(
    document.getElementById('pageDescription'),
    'Local streamer workspace and prepare scaffold. Live publishing is intentionally disabled until RustyOnions exposes real stream routes.'
  );

  const facts = document.getElementById('pageFacts');
  if (facts) {
    facts.dataset.streamFactsInstalled = '1';
    facts.textContent = '';
    facts.append(
      factCard('Surface', 'crab://stream'),
      factCard('Future public shape', 'crab://<64 lowercase hex>.stream'),
      factCard('Current status', 'local studio only'),
      factCard('Prepare route', FUTURE_STREAM_PREPARE_ROUTE)
    );
  }

  const developer = document.getElementById('developerJson');
  if (developer) {
    const payload = readPayload();
    if (!payload || !isStreamPayload(payload)) {
      developer.textContent = JSON.stringify(
        {
          schema: 'crablink.stream.local_page.v1',
          route: 'crab://stream',
          status: 'local_studio_not_live',
          truth_boundary: {
            backend_stream_routes_wired: false,
            stream_session_created: false,
            b3_stream_manifest_assigned: false,
            ingest_key_created: false,
            roc_charged: false,
            wallet_mutated: false,
            broadcast_started: false
          }
        },
        null,
        2
      );
    }
  }
}

function factCard(label, value) {
  const card = document.createElement('article');
  card.className = 'fact-card';

  const term = document.createElement('span');
  term.textContent = label;

  const body = document.createElement('strong');
  body.textContent = value;

  card.append(term, body);
  return card;
}

function enforceStreamOnlyLayout() {
  document.body?.classList.add(STREAM_VIEW_CLASS);
  document.body?.classList.remove(ARTICLE_VIEW_CLASS);
  document.body?.classList.remove(VIDEO_VIEW_CLASS);
  document.body?.classList.remove(PROFILE_VIEW_CLASS);
  document.body?.classList.remove('crablink-site-full-view-mode');

  for (const id of [ARTICLE_SECTION_ID, VIDEO_SECTION_ID]) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  const profile = document.getElementById(PROFILE_SECTION_ID);
  if (profile) {
    profile.classList.add('hidden');
    profile.setAttribute('aria-hidden', 'true');
  }

  for (const id of [
    'workflowSection',
    'actionsSection',
    'fieldsSection',
    'warningsSection',
    'sitePageSection',
    'prepareSummary',
    'holdSection',
    'submitSection'
  ]) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }
}

function buildStreamSection() {
  const section = document.createElement('section');
  section.id = STREAM_SECTION_ID;
  section.className = 'stream-draft-section content-section';

  const head = document.createElement('div');
  head.className = 'stream-draft-head';

  const copy = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'stream-draft-eyebrow';
  eyebrow.textContent = 'NEXT_LEVEL live creator foundation';

  const title = document.createElement('h3');
  title.textContent = 'Stream Studio';

  const description = document.createElement('p');
  description.textContent =
    'Preview camera, mic, or screen locally and prepare future stream metadata. Backend live streaming, ingest, chat, tips, and payout routes are not live yet.';

  copy.append(eyebrow, title, description);

  const badge = document.createElement('span');
  badge.className = 'stream-draft-badge';
  badge.textContent = 'local preview only';

  head.append(copy, badge);

  const notice = document.createElement('div');
  notice.className = 'stream-draft-notice';
  notice.textContent =
    'Truth boundary: this page does not go live, does not create an ingest key, does not upload or relay media, does not create a b3 stream manifest, does not charge ROC, and does not claim backend stream publication.';

  const layout = document.createElement('div');
  layout.className = 'stream-draft-layout';

  const form = buildStreamForm();
  const preview = buildStreamPreview();

  layout.append(form, preview);

  const manifestPanel = document.createElement('details');
  manifestPanel.className = 'stream-draft-manifest';
  manifestPanel.open = true;

  const summary = document.createElement('summary');
  summary.textContent = 'Future stream manifest draft';

  const manifestActions = document.createElement('div');
  manifestActions.className = 'stream-draft-actions';

  const sendPrepare = actionButton('Send Prepare Request', 'data-stream-action', 'send-prepare');
  const copyManifest = actionButton('Copy Manifest JSON', 'data-stream-action', 'copy-manifest', true);
  const copyMetadata = actionButton('Copy Metadata JSON', 'data-stream-action', 'copy-metadata', true);
  const saveDraft = actionButton('Save Local Draft', 'data-stream-action', 'save', true);
  const clearDraft = actionButton('Clear Draft', 'data-stream-action', 'clear', true);

  manifestActions.append(sendPrepare, copyManifest, copyMetadata, saveDraft, clearDraft);

  const prepareStatus = document.createElement('div');
  prepareStatus.id = STREAM_PREPARE_STATUS_ID;
  prepareStatus.className = 'stream-prepare-status';
  prepareStatus.textContent = 'No stream prepare request sent yet.';

  const manifest = document.createElement('pre');
  manifest.id = 'streamManifestPreview';
  manifest.className = 'stream-manifest-preview';
  manifest.textContent = '{}';

  const prepareResult = document.createElement('pre');
  prepareResult.id = STREAM_PREPARE_RESULT_ID;
  prepareResult.className = 'stream-prepare-result hidden';
  prepareResult.textContent = 'No prepare response yet.';

  manifestPanel.append(summary, manifestActions, prepareStatus, manifest, prepareResult);
  section.append(head, notice, layout, manifestPanel);

  section.addEventListener('input', (event) => {
    if (!event.target?.closest?.('[data-stream-field]')) return;

    updateStreamPreviewState(section);
    updateStreamManifest(section);
    scheduleAutoSave(section);
  });

  section.addEventListener('change', (event) => {
    if (!event.target?.closest?.('[data-stream-field]')) return;

    updateStreamPreviewState(section);
    updateStreamManifest(section);
    scheduleAutoSave(section);
  });

  section.addEventListener('click', (event) => {
    const action = event.target?.closest?.('[data-stream-action]')?.getAttribute('data-stream-action');
    if (!action) return;

    event.preventDefault();

    if (action === 'start-camera') {
      void startCameraPreview(section);
      return;
    }

    if (action === 'start-screen') {
      void startScreenPreview(section);
      return;
    }

    if (action === 'stop-preview') {
      stopLocalPreview();
      updateStreamPreviewState(section);
      updateStreamManifest(section);
      setFooter('Local stream preview stopped.');
      return;
    }

    if (action === 'send-prepare') {
      void sendStreamPrepare(section);
      return;
    }

    if (action === 'copy-manifest') {
      void copyTextValue(JSON.stringify(buildFutureManifest(section), null, 2), 'Stream manifest draft copied.');
      return;
    }

    if (action === 'copy-metadata') {
      void copyTextValue(JSON.stringify(buildStreamPrepareRequest(section), null, 2), 'Stream metadata request copied.');
      return;
    }

    if (action === 'save') {
      void saveDraftToStorage(section, { announce: true });
      return;
    }

    if (action === 'clear') {
      void clearDraft(section);
    }
  });

  return section;
}

function buildStreamForm() {
  const form = document.createElement('form');
  form.className = 'stream-draft-form';

  const controls = document.createElement('div');
  controls.className = 'stream-preview-controls';

  const cameraButton = actionButton('Start Camera/Mic Preview', 'data-stream-action', 'start-camera');
  const screenButton = actionButton('Start Screen Preview', 'data-stream-action', 'start-screen', true);
  const stopButton = actionButton('Stop Preview', 'data-stream-action', 'stop-preview', true);

  controls.append(cameraButton, screenButton, stopButton);

  form.append(
    controls,
    fieldBlock({
      label: 'Stream title',
      field: inputField('streamTitle', 'title', 'The Way of the Crab — Live')
    }),
    twoColumn(
      fieldBlock({
        label: 'Category / game',
        field: inputField('streamCategory', 'category', 'Just Chatting')
      }),
      fieldBlock({
        label: 'Stream mode',
        field: selectField('streamMode', 'streamMode', [
          ['camera', 'Camera / mic'],
          ['screen', 'Screen share'],
          ['external-encoder', 'External encoder later'],
          ['hybrid', 'Hybrid later']
        ])
      })
    ),
    fieldBlock({
      label: 'Description',
      field: textareaField('streamDescription', 'description', 'Describe the live stream, schedule, topic, and audience.', 5)
    }),
    twoColumn(
      fieldBlock({
        label: 'Tags',
        field: inputField('streamTags', 'tags', 'rustyonions, crablink, live')
      }),
      fieldBlock({
        label: 'Language',
        field: inputField('streamLanguage', 'language', 'en')
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Visibility',
        field: selectField('streamVisibility', 'visibility', [
          ['public', 'Public'],
          ['unlisted', 'Unlisted'],
          ['private', 'Private draft']
        ])
      }),
      fieldBlock({
        label: 'Chat mode',
        field: selectField('streamChatMode', 'chatMode', [
          ['open', 'Open chat later'],
          ['passport-only', 'Passport-only chat later'],
          ['followers-only', 'Followers-only later'],
          ['disabled', 'Chat disabled']
        ])
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Moderation',
        field: selectField('streamModerationMode', 'moderationMode', [
          ['passport-moderated', 'Passport moderators'],
          ['creator-only', 'Creator only'],
          ['site-mods', 'Site-designated mods later'],
          ['disabled', 'No moderation metadata']
        ])
      }),
      fieldBlock({
        label: 'Creator handle',
        field: inputField('streamCreatorHandle', 'creatorHandle', '@skinnycrabby')
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Thumbnail crab URL',
        field: inputField('streamThumbnailCrabUrl', 'thumbnailCrabUrl', 'crab://<hash>.image')
      }),
      fieldBlock({
        label: 'Suggested access price minor units',
        field: inputField('streamSuggestedPriceMinor', 'suggestedPriceMinor', '0')
      })
    ),
    checkboxBlock({
      label: 'Tips enabled later',
      field: checkboxField('streamTipsEnabled', 'tipsEnabled')
    })
  );

  return form;
}

function buildStreamPreview() {
  const panel = document.createElement('article');
  panel.className = 'stream-preview-panel';

  const head = document.createElement('div');
  head.className = 'stream-preview-head';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'stream-draft-eyebrow';
  eyebrow.textContent = 'Safe local studio preview';

  const title = document.createElement('h4');
  title.id = 'streamPreviewTitle';
  title.textContent = 'Untitled stream';

  const description = document.createElement('p');
  description.id = 'streamPreviewDescription';
  description.textContent = 'Start camera or screen preview to test your local setup. Nothing is broadcast.';

  head.append(eyebrow, title, description);

  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'stream-player-shell';

  const video = document.createElement('video');
  video.id = 'streamPreviewPlayer';
  video.autoplay = true;
  video.muted = true;
  video.controls = true;
  video.playsInline = true;

  const empty = document.createElement('div');
  empty.id = 'streamPreviewEmpty';
  empty.className = 'stream-preview-empty';
  empty.textContent = 'No local stream preview running.';

  mediaWrap.append(video, empty);

  const stats = document.createElement('div');
  stats.id = 'streamDraftStats';
  stats.className = 'stream-draft-stats';

  const tags = document.createElement('div');
  tags.id = 'streamPreviewTags';
  tags.className = 'stream-preview-tags';

  panel.append(head, mediaWrap, stats, tags);
  return panel;
}

function fieldBlock({ label, field }) {
  const block = document.createElement('label');
  block.className = 'stream-field';

  const span = document.createElement('span');
  span.textContent = label;

  block.append(span, field);
  return block;
}

function checkboxBlock({ label, field }) {
  const block = document.createElement('label');
  block.className = 'stream-checkbox-field';

  const span = document.createElement('span');
  span.textContent = label;

  block.append(field, span);
  return block;
}

function inputField(id, name, placeholder) {
  const input = document.createElement('input');
  input.id = id;
  input.type = 'text';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.dataset.streamField = name;
  return input;
}

function textareaField(id, name, placeholder, rows) {
  const textarea = document.createElement('textarea');
  textarea.id = id;
  textarea.placeholder = placeholder;
  textarea.rows = rows;
  textarea.dataset.streamField = name;
  return textarea;
}

function selectField(id, name, options) {
  const select = document.createElement('select');
  select.id = id;
  select.dataset.streamField = name;

  for (const [value, label] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  return select;
}

function checkboxField(id, name) {
  const input = document.createElement('input');
  input.id = id;
  input.type = 'checkbox';
  input.checked = true;
  input.dataset.streamField = name;
  return input;
}

function twoColumn(left, right) {
  const row = document.createElement('div');
  row.className = 'stream-two-column';
  row.append(left, right);
  return row;
}

function actionButton(label, attr, value, secondary = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.setAttribute(attr, value);
  if (secondary) button.className = 'secondary';
  return button;
}

async function loadDraftIntoForm(section) {
  const draft = await getDraft();
  const merged = { ...DEFAULT_DRAFT, ...draft };

  setField(section, 'title', merged.title);
  setField(section, 'category', merged.category);
  setField(section, 'description', merged.description);
  setField(section, 'tags', merged.tags);
  setField(section, 'language', merged.language || 'en');
  setField(section, 'visibility', merged.visibility || 'public');
  setField(section, 'chatMode', merged.chatMode || 'open');
  setField(section, 'moderationMode', merged.moderationMode || 'passport-moderated');
  setField(section, 'streamMode', merged.streamMode || 'camera');
  setField(section, 'creatorHandle', merged.creatorHandle || localHandle());
  setField(section, 'thumbnailCrabUrl', merged.thumbnailCrabUrl);
  setField(section, 'suggestedPriceMinor', merged.suggestedPriceMinor || '0');
  setField(section, 'tipsEnabled', merged.tipsEnabled !== false);
}

async function startCameraPreview(section) {
  stopLocalPreview();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    localPreviewStream = stream;
    localPreviewMode = 'camera';
    attachPreviewStream(section, stream);
    setField(section, 'streamMode', 'camera');
    updateStreamPreviewState(section);
    updateStreamManifest(section);
    setFooter('Local camera/mic preview started. Nothing is broadcasting.');
  } catch (error) {
    localPreviewStream = null;
    localPreviewMode = '';
    updateStreamPreviewState(section);
    setFooter(`Camera preview failed: ${error?.message || error}`);
  }
}

async function startScreenPreview(section) {
  stopLocalPreview();

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });

    localPreviewStream = stream;
    localPreviewMode = 'screen';

    for (const track of stream.getTracks()) {
      track.addEventListener('ended', () => {
        stopLocalPreview();
        updateStreamPreviewState(section);
        updateStreamManifest(section);
      });
    }

    attachPreviewStream(section, stream);
    setField(section, 'streamMode', 'screen');
    updateStreamPreviewState(section);
    updateStreamManifest(section);
    setFooter('Local screen preview started. Nothing is broadcasting.');
  } catch (error) {
    localPreviewStream = null;
    localPreviewMode = '';
    updateStreamPreviewState(section);
    setFooter(`Screen preview failed: ${error?.message || error}`);
  }
}

function attachPreviewStream(section, stream) {
  const video = section.querySelector('#streamPreviewPlayer');
  const empty = section.querySelector('#streamPreviewEmpty');

  if (video) {
    video.srcObject = stream;
    video.play().catch(() => {
      // Browser may require user gesture despite this being button-initiated.
    });
  }

  empty?.classList.add('hidden');
}

function stopLocalPreview() {
  if (localPreviewStream) {
    for (const track of localPreviewStream.getTracks()) {
      try {
        track.stop();
      } catch {
        // Best-effort local preview cleanup.
      }
    }
  }

  localPreviewStream = null;
  localPreviewMode = '';

  const video = document.getElementById('streamPreviewPlayer');
  if (video) {
    video.srcObject = null;
  }

  document.getElementById('streamPreviewEmpty')?.classList.remove('hidden');
}

function updateStreamPreviewState(section) {
  const draft = readDraftFromForm(section);

  setText(section.querySelector('#streamPreviewTitle'), draft.title || 'Untitled stream');
  setText(
    section.querySelector('#streamPreviewDescription'),
    draft.description || 'Start camera or screen preview to test your local setup. Nothing is broadcast.'
  );

  const tracks = localPreviewStream ? localPreviewStream.getTracks() : [];
  const videoTracks = tracks.filter((track) => track.kind === 'video');
  const audioTracks = tracks.filter((track) => track.kind === 'audio');

  const stats = section.querySelector('#streamDraftStats');
  if (stats) {
    replaceChildren(
      stats,
      statChip('Preview', localPreviewStream ? 'running' : 'stopped'),
      statChip('Mode', localPreviewMode || draft.streamMode || 'camera'),
      statChip('Video tracks', String(videoTracks.length)),
      statChip('Audio tracks', String(audioTracks.length)),
      statChip('Go live', 'not wired'),
      statChip('Tips', draft.tipsEnabled ? 'future enabled' : 'disabled')
    );
  }

  const tags = section.querySelector('#streamPreviewTags');
  if (tags) {
    tags.textContent = '';
    const parsedTags = parseTags(draft.tags);

    if (parsedTags.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'stream-tag empty';
      empty.textContent = 'no tags';
      tags.append(empty);
    } else {
      for (const tag of parsedTags) {
        const chip = document.createElement('span');
        chip.className = 'stream-tag';
        chip.textContent = `#${tag}`;
        tags.append(chip);
      }
    }
  }
}

function updateStreamManifest(section) {
  const pre = section.querySelector('#streamManifestPreview');
  if (!pre) return;

  pre.textContent = JSON.stringify(buildFutureManifest(section), null, 2);
}

function buildFutureManifest(section) {
  const draft = readDraftFromForm(section);
  const tags = parseTags(draft.tags);
  const now = new Date().toISOString();
  const tracks = localPreviewStream ? localPreviewStream.getTracks() : [];

  return {
    schema: 'ron.stream.future_manifest_draft.v1',
    status: 'local_studio_not_live',
    truth_boundary: {
      backend_stream_routes_wired: false,
      stream_session_created: false,
      ingest_key_created: false,
      b3_stream_manifest_assigned: false,
      roc_charged: false,
      wallet_mutated: false,
      index_pointer_created: false,
      broadcast_started: false,
      chat_room_created: false,
      tips_route_created: false
    },
    intended_surface: {
      route: 'crab://stream',
      kind: 'stream',
      future_public_url_shape: 'crab://<64 lowercase hex>.stream',
      canonical_stream_manifest_pending: true,
      local_preview_running: Boolean(localPreviewStream),
      local_preview_mode: localPreviewMode || draft.streamMode || 'camera',
      local_preview_tracks: tracks.map((track) => ({
        kind: track.kind,
        label: track.label || 'local device',
        enabled: track.enabled,
        ready_state: track.readyState
      }))
    },
    creator: {
      handle_display: draft.creatorHandle || localHandle(),
      passport_subject_display: localPassportSubject(),
      wallet_account_display: localWalletAccount(),
      backend_confirmed: false
    },
    metadata: {
      title: draft.title,
      category: draft.category,
      description: draft.description,
      tags,
      language: draft.language || 'en',
      visibility: draft.visibility || 'public',
      chat_mode: draft.chatMode || 'open',
      moderation_mode: draft.moderationMode || 'passport-moderated',
      stream_mode: draft.streamMode || 'camera',
      thumbnail_crab_url: draft.thumbnailCrabUrl,
      suggested_access_price_minor_units: normalizeMinorUnits(draft.suggestedPriceMinor),
      tips_enabled_later: Boolean(draft.tipsEnabled)
    },
    next_required_backend_work: [
      'stream prepare/start/stop DTOs',
      'capability-gated stream session creation',
      'ingest key issuance without exposing private wallet/passport keys',
      'stream manifest object and crab://<hash>.stream resolver',
      'live chat route and moderation policy',
      'tip/payment route through the internal wallet service only',
      'provider/relay availability metadata',
      'VOD archive plan after stream end'
    ],
    last_prepare_attempt: lastPrepareResponse,
    updated_at: now
  };
}

function buildStreamPrepareRequest(section) {
  const draft = readDraftFromForm(section);
  const tags = parseTags(draft.tags);

  return stripUndefined({
    schema: 'crablink.stream-prepare-request.v1',
    kind: 'stream',
    title: draft.title || undefined,
    category: draft.category || undefined,
    description: draft.description || undefined,
    tags,
    language: draft.language || 'en',
    visibility: draft.visibility || 'public',
    chat_mode: draft.chatMode || 'open',
    moderation_mode: draft.moderationMode || 'passport-moderated',
    stream_mode: draft.streamMode || localPreviewMode || 'camera',
    thumbnail_crab_url: draft.thumbnailCrabUrl || undefined,
    suggested_access_price_minor_units: normalizeMinorUnits(draft.suggestedPriceMinor),
    tips_enabled: Boolean(draft.tipsEnabled),
    local_preview_running: Boolean(localPreviewStream),
    upload_bytes_included: false,
    body_note: 'CrabLink stream draft prepare sends metadata only. Media bytes are not uploaded and no live broadcast is started by this scaffold.',
    payer_account: localWalletAccount(),
    owner_passport_subject: localPassportSubject(),
    creator_handle_display: draft.creatorHandle || localHandle(),
    client_idempotency_key: stableClientIdempotencyKey(draft.title || draft.category || 'stream')
  });
}

async function sendStreamPrepare(section) {
  await saveDraftToStorage(section, { announce: false });

  const status = section.querySelector(`#${STREAM_PREPARE_STATUS_ID}`);
  const result = section.querySelector(`#${STREAM_PREPARE_RESULT_ID}`);
  const actionButtonEl = section.querySelector('[data-stream-action="send-prepare"]');

  if (status) {
    status.className = 'stream-prepare-status pending';
    status.textContent = `Sending non-mutating prepare request to ${FUTURE_STREAM_PREPARE_ROUTE}…`;
  }

  if (result) {
    result.classList.remove('hidden');
    result.textContent = 'Waiting for gateway response…';
  }

  if (actionButtonEl) {
    actionButtonEl.disabled = true;
  }

  try {
    const settings = await getGatewaySettings();
    const gateway = normalizeGatewayUrl(settings.gatewayUrl || 'http://127.0.0.1:8090');
    const requestBody = buildStreamPrepareRequest(section);
    const requestCorrelationId = createCorrelationId();

    const response = await fetch(`${gateway}${FUTURE_STREAM_PREPARE_ROUTE}`, {
      method: 'POST',
      headers: stripUndefined({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: settings.authToken ? `Bearer ${settings.authToken}` : undefined,
        'Idempotency-Key': requestBody.client_idempotency_key,
        'x-ron-passport': settings.passportSubject || localPassportSubject(),
        'x-ron-wallet-account': settings.walletAccount || localWalletAccount(),
        'x-correlation-id': requestCorrelationId,
        'x-crablink-client': 'chrome-extension-stream-draft'
      }),
      body: JSON.stringify(requestBody)
    });

    const text = await response.text();
    const parsed = parseJsonMaybe(text);

    const payload = {
      schema: 'crablink.stream-prepare-attempt.v1',
      ok: response.ok,
      status: response.status,
      status_text: response.statusText,
      route: FUTURE_STREAM_PREPARE_ROUTE,
      correlation_id: requestCorrelationId,
      truth_boundary: response.ok
        ? 'Gateway returned a response. This is still prepare/preflight, not stream publication.'
        : 'Gateway did not accept the future stream prepare route. No stream was started, no ingest key was issued, no b3 manifest was assigned, and no ROC was charged.',
      response: parsed ?? text
    };

    lastPrepareResponse = payload;
    updateStreamManifest(section);

    if (status) {
      status.className = response.ok ? 'stream-prepare-status ok' : 'stream-prepare-status error';
      status.textContent = response.ok
        ? 'Stream prepare response received. This is still not a live stream.'
        : `Stream prepare failed with HTTP ${response.status}. Backend stream routes may not be wired yet.`;
    }

    if (result) {
      result.textContent = JSON.stringify(payload, null, 2);
    }

    setFooter(
      response.ok
        ? 'Stream prepare response received.'
        : `Stream prepare failed with HTTP ${response.status}; no stream was started.`
    );
  } catch (error) {
    const payload = {
      schema: 'crablink.stream-prepare-attempt.v1',
      ok: false,
      route: FUTURE_STREAM_PREPARE_ROUTE,
      error: String(error?.message || error),
      truth_boundary: 'No stream was started, no ingest key was issued, no b3 manifest was assigned, and no ROC was charged.'
    };

    lastPrepareResponse = payload;
    updateStreamManifest(section);

    if (status) {
      status.className = 'stream-prepare-status error';
      status.textContent = `Stream prepare failed: ${payload.error}`;
    }

    if (result) {
      result.classList.remove('hidden');
      result.textContent = JSON.stringify(payload, null, 2);
    }

    setFooter('Stream prepare failed; no stream was started.');
  } finally {
    if (actionButtonEl) {
      actionButtonEl.disabled = false;
    }
  }
}

function scheduleAutoSave(section) {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void saveDraftToStorage(section, { announce: false });
  }, 650);
}

async function saveDraftToStorage(section, { announce = false } = {}) {
  const draft = {
    ...readDraftFromForm(section),
    schema: DEFAULT_DRAFT.schema,
    updatedAt: new Date().toISOString()
  };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [DRAFT_KEY]: draft });
  }

  if (announce) {
    setFooter('Stream draft metadata saved locally.');
  }
}

async function clearDraft(section) {
  lastPrepareResponse = null;
  stopLocalPreview();

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [DRAFT_KEY]: { ...DEFAULT_DRAFT, updatedAt: new Date().toISOString() } });
  }

  setField(section, 'title', '');
  setField(section, 'category', '');
  setField(section, 'description', '');
  setField(section, 'tags', '');
  setField(section, 'language', 'en');
  setField(section, 'visibility', 'public');
  setField(section, 'chatMode', 'open');
  setField(section, 'moderationMode', 'passport-moderated');
  setField(section, 'streamMode', 'camera');
  setField(section, 'creatorHandle', localHandle());
  setField(section, 'thumbnailCrabUrl', '');
  setField(section, 'suggestedPriceMinor', '0');
  setField(section, 'tipsEnabled', true);

  const status = section.querySelector(`#${STREAM_PREPARE_STATUS_ID}`);
  if (status) {
    status.className = 'stream-prepare-status';
    status.textContent = 'No stream prepare request sent yet.';
  }

  const result = section.querySelector(`#${STREAM_PREPARE_RESULT_ID}`);
  if (result) {
    result.classList.add('hidden');
    result.textContent = 'No prepare response yet.';
  }

  updateStreamPreviewState(section);
  updateStreamManifest(section);
  setFooter('Stream draft cleared locally.');
}

async function getDraft() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return {};

  try {
    const stored = await chrome.storage.local.get([DRAFT_KEY]);
    const draft = stored?.[DRAFT_KEY];
    return draft && typeof draft === 'object' ? draft : {};
  } catch {
    return {};
  }
}

async function getGatewaySettings() {
  const defaults = {
    gatewayUrl: 'http://127.0.0.1:8090',
    authToken: '',
    passportSubject: '',
    walletAccount: ''
  };

  if (typeof chrome === 'undefined' || !chrome.storage?.local) return defaults;

  try {
    const stored = await chrome.storage.local.get(Object.keys(defaults));
    return { ...defaults, ...stored };
  } catch {
    return defaults;
  }
}

function readDraftFromForm(section) {
  return {
    title: getField(section, 'title'),
    category: getField(section, 'category'),
    description: getField(section, 'description'),
    tags: getField(section, 'tags'),
    language: getField(section, 'language') || 'en',
    visibility: getField(section, 'visibility') || 'public',
    chatMode: getField(section, 'chatMode') || 'open',
    moderationMode: getField(section, 'moderationMode') || 'passport-moderated',
    streamMode: getField(section, 'streamMode') || localPreviewMode || 'camera',
    creatorHandle: getField(section, 'creatorHandle') || localHandle(),
    thumbnailCrabUrl: getField(section, 'thumbnailCrabUrl'),
    suggestedPriceMinor: getField(section, 'suggestedPriceMinor') || '0',
    tipsEnabled: Boolean(getField(section, 'tipsEnabled'))
  };
}

function getField(section, name) {
  const field = section.querySelector(`[data-stream-field="${name}"]`);
  if (!field) return '';

  if (field.type === 'checkbox') {
    return field.checked;
  }

  return clean(field.value || '');
}

function setField(section, name, value) {
  const field = section.querySelector(`[data-stream-field="${name}"]`);
  if (!field) return;

  if (field.type === 'checkbox') {
    field.checked = Boolean(value);
    return;
  }

  field.value = String(value ?? '');
}

function statChip(label, value) {
  const chip = document.createElement('span');
  chip.className = 'stream-stat-chip';

  const term = document.createElement('span');
  term.textContent = `${label}:`;

  const body = document.createElement('strong');
  body.textContent = value || '—';

  chip.append(term, body);
  return chip;
}

function isStreamPage() {
  const url = readCurrentCrabUrl().toLowerCase();
  if (url === 'crab://stream') return true;

  const payload = readPayload();
  if (!payload) return false;

  return isStreamPayload(payload);
}

function isStreamPayload(payload) {
  const schema = clean(payload?.schema || payload?.type);
  const slug = clean(payload?.slug || payload?.page || payload?.kind || payload?.name || payload?.page_kind || '').toLowerCase();
  const title = clean(payload?.title || payload?.metadata?.title || '').toLowerCase();
  const crab = clean(payload?.links?.crab || payload?.crab_url || payload?.url || payload?.route || '').toLowerCase();

  return (
    schema === 'crablink.stream.local_page.v1' ||
    schema === 'ron.stream.future_manifest_draft.v1' ||
    (schema === BUILTIN_SCHEMA && (slug === 'stream' || crab === 'crab://stream' || title.includes('stream'))) ||
    crab === 'crab://stream'
  );
}

function readCurrentCrabUrl() {
  const address = clean(document.getElementById('addressInput')?.value || '');
  if (address) return address;

  try {
    const params = new URLSearchParams(window.location.search);
    return clean(params.get('url') || '');
  } catch {
    return '';
  }
}

function routeFingerprint() {
  const payload = readPayload();
  return JSON.stringify({
    url: readCurrentCrabUrl(),
    schema: payload?.schema || '',
    slug: payload?.slug || payload?.page || payload?.kind || payload?.name || payload?.page_kind || ''
  });
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

function parseTags(value) {
  return clean(value)
    .split(/[,\s]+/)
    .map((tag) => tag.replace(/^#+/, '').toLowerCase().replace(/[^a-z0-9._-]/g, ''))
    .filter(Boolean)
    .slice(0, 16);
}

function localHandle() {
  const candidates = [
    document.querySelector('.profile-handle-line')?.textContent,
    document.querySelector('#drawerMessage')?.textContent?.match(/@[\w.-]+/)?.[0],
    '@username'
  ];

  for (const candidate of candidates) {
    const handle = clean(candidate);
    if (handle.startsWith('@') && handle !== '@username') return handle;
  }

  return '@username';
}

function localPassportSubject() {
  const value = clean(document.getElementById('drawerPassport')?.textContent || '');
  return value && value !== '—' ? value : 'passport:main:dev';
}

function localWalletAccount() {
  const value = clean(document.getElementById('drawerWallet')?.textContent || '');
  return value && value !== '—' ? value : 'acct_dev';
}

function normalizeMinorUnits(value) {
  const raw = clean(value).replace(/[^\d]/g, '');
  if (!raw) return '0';
  return String(Math.max(0, Number(raw) || 0));
}

function normalizeGatewayUrl(value) {
  const raw = clean(value) || 'http://127.0.0.1:8090';
  return raw.replace(/\/+$/, '');
}

function stableClientIdempotencyKey(seed) {
  const cleanSeed = clean(seed).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  const safeSeed = cleanSeed.slice(0, 48) || 'stream';
  return `crablink-stream-prepare-${safeSeed}-${Date.now().toString(36)}`;
}

function createCorrelationId() {
  const random = Math.random().toString(16).slice(2, 10);
  return `crablink-stream-${Date.now()}-${random}`;
}

function parseJsonMaybe(text) {
  const raw = String(text ?? '');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function copyTextValue(value, message) {
  const text = String(value ?? '');
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    setFooter(message || 'Copied.');
  } catch {
    setFooter(text.slice(0, 240));
  }
}

function setText(node, value) {
  if (node) node.textContent = String(value ?? '');
}

function setFooter(message) {
  const footer = document.getElementById('footerStatus');
  if (footer) footer.textContent = message;
}

function replaceChildren(node, ...children) {
  node.textContent = '';
  node.append(...children);
}

function stripUndefined(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined && item !== null && item !== '') {
      out[key] = item;
    }
  }

  return out;
}

function clean(value) {
  return String(value ?? '').trim();
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body.${STREAM_VIEW_CLASS} #${ARTICLE_SECTION_ID},
    body.${STREAM_VIEW_CLASS} #${VIDEO_SECTION_ID},
    body.${STREAM_VIEW_CLASS} #${PROFILE_SECTION_ID},
    body.${STREAM_VIEW_CLASS} #workflowSection,
    body.${STREAM_VIEW_CLASS} #actionsSection,
    body.${STREAM_VIEW_CLASS} #fieldsSection,
    body.${STREAM_VIEW_CLASS} #warningsSection,
    body.${STREAM_VIEW_CLASS} #sitePageSection,
    body.${STREAM_VIEW_CLASS} #prepareSummary,
    body.${STREAM_VIEW_CLASS} #holdSection,
    body.${STREAM_VIEW_CLASS} #submitSection {
      display: none !important;
    }

    .stream-draft-section {
      display: grid;
      gap: 16px;
      border-color: rgba(244, 114, 182, 0.28) !important;
      background:
        radial-gradient(circle at top left, rgba(244, 114, 182, 0.14), transparent 42%),
        radial-gradient(circle at top right, rgba(34, 197, 94, 0.10), transparent 38%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(8, 17, 34, 0.95)) !important;
    }

    .stream-draft-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
    }

    .stream-draft-eyebrow {
      margin: 0 0 6px;
      color: #f9a8d4;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .stream-draft-head h3 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(32px, 5vw, 56px);
      line-height: 1;
      letter-spacing: -0.075em;
    }

    .stream-draft-head p:not(.stream-draft-eyebrow) {
      margin: 8px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .stream-draft-badge {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 7px 11px;
      border: 1px solid rgba(244, 114, 182, 0.42);
      border-radius: 999px;
      color: #fbcfe8;
      background: rgba(131, 24, 67, 0.20);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .stream-draft-notice {
      padding: 14px;
      border: 1px solid rgba(251, 191, 36, 0.24);
      border-radius: 18px;
      color: #fde68a;
      background: rgba(113, 63, 18, 0.14);
      line-height: 1.45;
    }

    .stream-draft-layout {
      display: grid;
      grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
      gap: 16px;
      align-items: start;
    }

    .stream-draft-form,
    .stream-preview-panel,
    .stream-draft-manifest {
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 24px;
      background: rgba(2, 6, 23, 0.30);
    }

    .stream-draft-form {
      display: grid;
      gap: 12px;
      padding: 16px;
    }

    .stream-preview-controls {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      padding: 14px;
      border: 1px dashed rgba(244, 114, 182, 0.36);
      border-radius: 20px;
      background: rgba(131, 24, 67, 0.12);
    }

    .stream-preview-controls button {
      min-height: 42px;
      border-radius: 14px;
      font-size: 12px;
      font-weight: 950;
    }

    .stream-field {
      display: grid;
      gap: 7px;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 850;
    }

    .stream-field span,
    .stream-checkbox-field span {
      color: #f9a8d4;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .stream-field input,
    .stream-field textarea,
    .stream-field select {
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

    .stream-field textarea {
      resize: vertical;
      min-height: 112px;
      line-height: 1.45;
    }

    .stream-field input:focus,
    .stream-field textarea:focus,
    .stream-field select:focus {
      border-color: rgba(244, 114, 182, 0.60);
      box-shadow: 0 0 0 3px rgba(244, 114, 182, 0.12);
    }

    .stream-checkbox-field {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 11px 12px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.46);
      cursor: pointer;
    }

    .stream-checkbox-field input {
      width: 18px;
      height: 18px;
    }

    .stream-two-column {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .stream-preview-panel {
      display: grid;
      gap: 14px;
      padding: 18px;
    }

    .stream-preview-head h4 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(26px, 4vw, 44px);
      line-height: 1;
      letter-spacing: -0.075em;
      overflow-wrap: anywhere;
    }

    .stream-preview-head p:not(.stream-draft-eyebrow) {
      margin: 8px 0 0;
      color: #fbcfe8;
      line-height: 1.45;
    }

    .stream-player-shell {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 340px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 22px;
      background:
        radial-gradient(circle at center, rgba(244, 114, 182, 0.11), transparent 42%),
        #020617;
      overflow: hidden;
    }

    .stream-player-shell video {
      width: 100%;
      max-height: 620px;
      background: #000;
    }

    .stream-preview-empty {
      position: absolute;
      inset: 16px;
      display: grid;
      place-items: center;
      border: 1px dashed rgba(148, 163, 184, 0.24);
      border-radius: 18px;
      color: #94a3b8;
      background: rgba(15, 23, 42, 0.50);
      font-weight: 900;
      text-align: center;
      padding: 18px;
    }

    .stream-preview-empty.hidden {
      display: none !important;
    }

    .stream-draft-stats,
    .stream-preview-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .stream-stat-chip,
    .stream-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 28px;
      padding: 6px 9px;
      border: 1px solid rgba(244, 114, 182, 0.26);
      border-radius: 999px;
      color: #fbcfe8;
      background: rgba(131, 24, 67, 0.18);
      font-size: 12px;
      font-weight: 850;
      max-width: 100%;
      overflow-wrap: anywhere;
    }

    .stream-stat-chip span {
      color: #f9a8d4;
      font-weight: 950;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .stream-tag.empty {
      border-color: rgba(148, 163, 184, 0.20);
      color: #94a3b8;
      background: rgba(15, 23, 42, 0.42);
    }

    .stream-draft-manifest {
      overflow: hidden;
    }

    .stream-draft-manifest summary {
      cursor: pointer;
      padding: 14px 16px;
      color: #f8fafc;
      font-weight: 950;
    }

    .stream-draft-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      padding: 0 16px 14px;
    }

    .stream-draft-actions button {
      min-height: 34px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 950;
    }

    .stream-prepare-status {
      margin: 0 16px 12px;
      padding: 12px 13px;
      border: 1px solid rgba(148, 163, 184, 0.20);
      border-radius: 14px;
      color: #cbd5e1;
      background: rgba(15, 23, 42, 0.48);
      line-height: 1.4;
    }

    .stream-prepare-status.pending {
      border-color: rgba(244, 114, 182, 0.38);
      color: #fbcfe8;
      background: rgba(131, 24, 67, 0.18);
    }

    .stream-prepare-status.ok {
      border-color: rgba(34, 197, 94, 0.34);
      color: #bbf7d0;
      background: rgba(22, 101, 52, 0.18);
    }

    .stream-prepare-status.error {
      border-color: rgba(248, 113, 113, 0.34);
      color: #fecaca;
      background: rgba(127, 29, 29, 0.20);
    }

    .stream-manifest-preview,
    .stream-prepare-result {
      max-height: 460px;
      overflow: auto;
      margin: 0;
      padding: 16px;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
      color: #dbeafe;
      background: #020617;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .stream-prepare-result.hidden {
      display: none !important;
    }

    .stream-prepare-result {
      border-top-color: rgba(244, 114, 182, 0.24);
    }

    @media (max-width: 980px) {
      .stream-draft-layout,
      .stream-two-column,
      .stream-preview-controls {
        grid-template-columns: 1fr;
      }

      .stream-draft-head {
        flex-direction: column;
      }

      .stream-draft-actions {
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