/**
 * RO:WHAT — Adds an honest local video-draft workspace to crab://video.
 * RO:WHY — NEXT_LEVEL media-asset foundation; Concerns: DX/SEC; prepare .video UX without pretending backend publication exists.
 * RO:INTERACTS — page.html, page.js shell, chrome.storage.local, future svc-gateway /assets/video/prepare route.
 * RO:INVARIANTS — local draft first; gateway-only prepare attempt; no fake b3 CID; no fake video upload; no wallet mutation; no silent ROC spending.
 * RO:METRICS — client correlation IDs are generated for prepare attempts.
 * RO:CONFIG — stores crablinkVideoDraftV1 metadata only; selected local video file bytes are not persisted.
 * RO:SECURITY — textContent/createElement only; no private keys; no direct internal service calls; no executable media metadata.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://video.
 */

const STYLE_ID = 'crablinkVideoDraftStyles';
const VIDEO_SECTION_ID = 'videoDraftSection';
const ARTICLE_SECTION_ID = 'articleDraftSection';
const PROFILE_SECTION_ID = 'profileHomeSection';
const VIDEO_PREPARE_STATUS_ID = 'videoGatewayPrepareStatus';
const VIDEO_PREPARE_RESULT_ID = 'videoGatewayPrepareResult';
const DRAFT_KEY = 'crablinkVideoDraftV1';
const BUILTIN_SCHEMA = 'omnigate.builtin-page.v1';
const VIDEO_VIEW_CLASS = 'crablink-video-draft-view-mode';
const ARTICLE_VIEW_CLASS = 'crablink-article-draft-view-mode';
const PROFILE_VIEW_CLASS = 'crablink-profile-view-mode';
const FUTURE_VIDEO_PREPARE_ROUTE = '/assets/video/prepare';

const DEFAULT_DRAFT = {
  schema: 'crablink.video-draft.local.v1',
  title: '',
  description: '',
  tags: '',
  language: 'en',
  license: 'all-rights-reserved',
  creatorHandle: '',
  thumbnailCrabUrl: '',
  suggestedPriceMinor: '0',
  updatedAt: ''
};

let renderTimer = 0;
let saveTimer = 0;
let lastRouteSignature = '';
let selectedFile = null;
let selectedObjectUrl = '';
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
    renderVideoDraftWorkspace().catch((error) => {
      setFooter(`Video draft skipped: ${error?.message || error}`);
    });
  }, 90);
}

async function renderVideoDraftWorkspace() {
  if (!isVideoPage()) {
    lastRouteSignature = '';
    document.body?.classList.remove(VIDEO_VIEW_CLASS);
    document.getElementById(VIDEO_SECTION_ID)?.remove();
    return;
  }

  showVideoShell();
  enforceVideoOnlyLayout();

  const pagePanel = document.getElementById('pagePanel');
  if (!pagePanel) return;

  const routeSignature = routeFingerprint();

  let section = document.getElementById(VIDEO_SECTION_ID);
  if (!section) {
    section = buildVideoSection();

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

  updateVideoFileState(section);
  updateVideoManifest(section);
}

function showVideoShell() {
  const loading = document.getElementById('loadingPanel');
  const error = document.getElementById('errorPanel');
  const page = document.getElementById('pagePanel');

  loading?.classList.add('hidden');
  error?.classList.add('hidden');
  page?.classList.remove('hidden');

  setText(document.getElementById('pageBadge'), 'video');
  setText(document.getElementById('pageTitle'), 'CrabLink Video Draft');
  setText(
    document.getElementById('pageDescription'),
    'Local video draft and prepare scaffold. Publishing is intentionally disabled until RustyOnions exposes real .video routes.'
  );

  const facts = document.getElementById('pageFacts');
  if (facts) {
    facts.dataset.videoFactsInstalled = '1';
    facts.textContent = '';
    facts.append(
      factCard('Asset kind', 'video'),
      factCard('Public shape', 'crab://<64 lowercase hex>.video'),
      factCard('Current status', 'local draft only'),
      factCard('Prepare route', FUTURE_VIDEO_PREPARE_ROUTE)
    );
  }

  const developer = document.getElementById('developerJson');
  if (developer) {
    const payload = readPayload();
    if (!payload || !isVideoPayload(payload)) {
      developer.textContent = JSON.stringify(
        {
          schema: 'crablink.video.local_page.v1',
          route: 'crab://video',
          status: 'local_draft_not_published',
          truth_boundary: {
            backend_video_routes_wired: false,
            b3_content_id_assigned: false,
            manifest_cid_assigned: false,
            roc_charged: false,
            wallet_mutated: false,
            index_pointer_created: false,
            video_bytes_uploaded: false
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

function enforceVideoOnlyLayout() {
  document.body?.classList.add(VIDEO_VIEW_CLASS);
  document.body?.classList.remove(ARTICLE_VIEW_CLASS);
  document.body?.classList.remove(PROFILE_VIEW_CLASS);
  document.body?.classList.remove('crablink-site-full-view-mode');

  const article = document.getElementById(ARTICLE_SECTION_ID);
  if (article) {
    article.remove();
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

function buildVideoSection() {
  const section = document.createElement('section');
  section.id = VIDEO_SECTION_ID;
  section.className = 'video-draft-section content-section';

  const head = document.createElement('div');
  head.className = 'video-draft-head';

  const copy = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'video-draft-eyebrow';
  eyebrow.textContent = 'NEXT_LEVEL media asset foundation';

  const title = document.createElement('h3');
  title.textContent = 'Video Draft';

  const description = document.createElement('p');
  description.textContent =
    'Choose a local video, preview it, and prepare future manifest metadata. Backend .video publishing and streaming routes are not live yet.';

  copy.append(eyebrow, title, description);

  const badge = document.createElement('span');
  badge.className = 'video-draft-badge';
  badge.textContent = 'local media draft';

  head.append(copy, badge);

  const notice = document.createElement('div');
  notice.className = 'video-draft-notice';
  notice.textContent =
    'Truth boundary: this page does not upload video bytes, does not create a b3 CID, does not create a manifest CID, does not charge ROC, and does not publish a .video asset. Prepare is a non-mutating gateway attempt only.';

  const layout = document.createElement('div');
  layout.className = 'video-draft-layout';

  const form = buildVideoForm();
  const preview = buildVideoPreview();

  layout.append(form, preview);

  const manifestPanel = document.createElement('details');
  manifestPanel.className = 'video-draft-manifest';
  manifestPanel.open = true;

  const summary = document.createElement('summary');
  summary.textContent = 'Future video manifest draft';

  const manifestActions = document.createElement('div');
  manifestActions.className = 'video-draft-actions';

  const sendPrepare = actionButton('Send Prepare Request', 'data-video-action', 'send-prepare');
  const copyManifest = actionButton('Copy Manifest JSON', 'data-video-action', 'copy-manifest', true);
  const copyMetadata = actionButton('Copy Metadata JSON', 'data-video-action', 'copy-metadata', true);
  const saveDraft = actionButton('Save Local Draft', 'data-video-action', 'save', true);
  const clearDraft = actionButton('Clear Draft', 'data-video-action', 'clear', true);

  manifestActions.append(sendPrepare, copyManifest, copyMetadata, saveDraft, clearDraft);

  const prepareStatus = document.createElement('div');
  prepareStatus.id = VIDEO_PREPARE_STATUS_ID;
  prepareStatus.className = 'video-prepare-status';
  prepareStatus.textContent = 'No video prepare request sent yet.';

  const manifest = document.createElement('pre');
  manifest.id = 'videoManifestPreview';
  manifest.className = 'video-manifest-preview';
  manifest.textContent = '{}';

  const prepareResult = document.createElement('pre');
  prepareResult.id = VIDEO_PREPARE_RESULT_ID;
  prepareResult.className = 'video-prepare-result hidden';
  prepareResult.textContent = 'No prepare response yet.';

  manifestPanel.append(summary, manifestActions, prepareStatus, manifest, prepareResult);

  section.append(head, notice, layout, manifestPanel);

  section.addEventListener('input', (event) => {
    if (!event.target?.closest?.('[data-video-field]')) return;

    updateVideoFileState(section);
    updateVideoManifest(section);
    scheduleAutoSave(section);
  });

  section.addEventListener('change', (event) => {
    if (event.target?.id !== 'videoFile') return;
    handleVideoFileSelected(section, event.target.files?.[0] || null);
  });

  section.addEventListener('click', (event) => {
    const action = event.target?.closest?.('[data-video-action]')?.getAttribute('data-video-action');
    if (!action) return;

    event.preventDefault();

    if (action === 'send-prepare') {
      void sendVideoPrepare(section);
      return;
    }

    if (action === 'copy-manifest') {
      void copyTextValue(JSON.stringify(buildFutureManifest(section), null, 2), 'Video manifest draft copied.');
      return;
    }

    if (action === 'copy-metadata') {
      void copyTextValue(JSON.stringify(buildVideoPrepareRequest(section), null, 2), 'Video metadata request copied.');
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

function buildVideoForm() {
  const form = document.createElement('form');
  form.className = 'video-draft-form';

  const fileBlock = document.createElement('label');
  fileBlock.className = 'video-file-drop';

  const fileTitle = document.createElement('strong');
  fileTitle.textContent = 'Choose local video';

  const fileHint = document.createElement('span');
  fileHint.textContent = 'Preview only. Bytes are not persisted and are not uploaded by this scaffold.';

  const input = document.createElement('input');
  input.id = 'videoFile';
  input.type = 'file';
  input.accept = 'video/*';

  fileBlock.append(fileTitle, fileHint, input);

  form.append(
    fileBlock,
    fieldBlock({
      label: 'Title',
      field: inputField('videoTitle', 'title', 'The Way of the Crab')
    }),
    fieldBlock({
      label: 'Description',
      field: textareaField('videoDescription', 'description', 'Describe the video, provenance, and intended audience.', 5)
    }),
    twoColumn(
      fieldBlock({
        label: 'Tags',
        field: inputField('videoTags', 'tags', 'rustyonions, crablink, video')
      }),
      fieldBlock({
        label: 'Language',
        field: inputField('videoLanguage', 'language', 'en')
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'License',
        field: selectField('videoLicense', 'license', [
          ['all-rights-reserved', 'All rights reserved'],
          ['cc-by', 'CC BY'],
          ['cc-by-sa', 'CC BY-SA'],
          ['public-domain', 'Public domain / CC0']
        ])
      }),
      fieldBlock({
        label: 'Creator handle',
        field: inputField('videoCreatorHandle', 'creatorHandle', '@skinnycrabby')
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Thumbnail crab URL',
        field: inputField('videoThumbnailCrabUrl', 'thumbnailCrabUrl', 'crab://<hash>.image')
      }),
      fieldBlock({
        label: 'Suggested price minor units',
        field: inputField('videoSuggestedPriceMinor', 'suggestedPriceMinor', '0')
      })
    )
  );

  return form;
}

function buildVideoPreview() {
  const panel = document.createElement('article');
  panel.className = 'video-preview-panel';

  const head = document.createElement('div');
  head.className = 'video-preview-head';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'video-draft-eyebrow';
  eyebrow.textContent = 'Safe local preview';

  const title = document.createElement('h4');
  title.id = 'videoPreviewTitle';
  title.textContent = 'Untitled video';

  const description = document.createElement('p');
  description.id = 'videoPreviewDescription';
  description.textContent = 'Choose a local video file to preview it here.';

  head.append(eyebrow, title, description);

  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'video-player-shell';

  const video = document.createElement('video');
  video.id = 'videoPreviewPlayer';
  video.controls = true;
  video.preload = 'metadata';
  video.playsInline = true;

  const empty = document.createElement('div');
  empty.id = 'videoPreviewEmpty';
  empty.className = 'video-preview-empty';
  empty.textContent = 'No local video selected.';

  mediaWrap.append(video, empty);

  const stats = document.createElement('div');
  stats.id = 'videoDraftStats';
  stats.className = 'video-draft-stats';

  const tags = document.createElement('div');
  tags.id = 'videoPreviewTags';
  tags.className = 'video-preview-tags';

  panel.append(head, mediaWrap, stats, tags);
  return panel;
}

function fieldBlock({ label, field }) {
  const block = document.createElement('label');
  block.className = 'video-field';

  const span = document.createElement('span');
  span.textContent = label;

  block.append(span, field);
  return block;
}

function inputField(id, name, placeholder) {
  const input = document.createElement('input');
  input.id = id;
  input.type = 'text';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.dataset.videoField = name;
  return input;
}

function textareaField(id, name, placeholder, rows) {
  const textarea = document.createElement('textarea');
  textarea.id = id;
  textarea.placeholder = placeholder;
  textarea.rows = rows;
  textarea.dataset.videoField = name;
  return textarea;
}

function selectField(id, name, options) {
  const select = document.createElement('select');
  select.id = id;
  select.dataset.videoField = name;

  for (const [value, label] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  return select;
}

function twoColumn(left, right) {
  const row = document.createElement('div');
  row.className = 'video-two-column';
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
  setField(section, 'description', merged.description);
  setField(section, 'tags', merged.tags);
  setField(section, 'language', merged.language || 'en');
  setField(section, 'license', merged.license || 'all-rights-reserved');
  setField(section, 'creatorHandle', merged.creatorHandle || localHandle());
  setField(section, 'thumbnailCrabUrl', merged.thumbnailCrabUrl);
  setField(section, 'suggestedPriceMinor', merged.suggestedPriceMinor || '0');
}

function handleVideoFileSelected(section, file) {
  selectedFile = file || null;
  lastPrepareResponse = null;

  if (selectedObjectUrl) {
    try {
      URL.revokeObjectURL(selectedObjectUrl);
    } catch {
      // Best-effort object URL cleanup.
    }
    selectedObjectUrl = '';
  }

  const video = section.querySelector('#videoPreviewPlayer');
  const empty = section.querySelector('#videoPreviewEmpty');

  if (!selectedFile) {
    if (video) {
      video.removeAttribute('src');
      video.load();
    }
    empty?.classList.remove('hidden');
    updateVideoFileState(section);
    updateVideoManifest(section);
    return;
  }

  selectedObjectUrl = URL.createObjectURL(selectedFile);

  if (video) {
    video.src = selectedObjectUrl;
    video.dataset.objectUrl = selectedObjectUrl;
    video.load();
  }

  empty?.classList.add('hidden');

  if (!getField(section, 'title')) {
    setField(section, 'title', titleFromFilename(selectedFile.name));
  }

  updateVideoFileState(section);
  updateVideoManifest(section);
  scheduleAutoSave(section);
}

function updateVideoFileState(section) {
  const draft = readDraftFromForm(section);

  setText(section.querySelector('#videoPreviewTitle'), draft.title || selectedFile?.name || 'Untitled video');
  setText(
    section.querySelector('#videoPreviewDescription'),
    draft.description || 'Choose a local video file to preview it here.'
  );

  const stats = section.querySelector('#videoDraftStats');
  if (stats) {
    replaceChildren(
      stats,
      statChip('File', selectedFile ? selectedFile.name : 'none'),
      statChip('Bytes', selectedFile ? String(selectedFile.size) : '0'),
      statChip('Type', selectedFile ? selectedFile.type || 'unknown' : 'none'),
      statChip('Publish status', 'not wired'),
      statChip('Upload', 'not sent')
    );
  }

  const tags = section.querySelector('#videoPreviewTags');
  if (tags) {
    tags.textContent = '';
    const parsedTags = parseTags(draft.tags);

    if (parsedTags.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'video-tag empty';
      empty.textContent = 'no tags';
      tags.append(empty);
    } else {
      for (const tag of parsedTags) {
        const chip = document.createElement('span');
        chip.className = 'video-tag';
        chip.textContent = `#${tag}`;
        tags.append(chip);
      }
    }
  }
}

function updateVideoManifest(section) {
  const pre = section.querySelector('#videoManifestPreview');
  if (!pre) return;

  pre.textContent = JSON.stringify(buildFutureManifest(section), null, 2);
}

function buildFutureManifest(section) {
  const draft = readDraftFromForm(section);
  const tags = parseTags(draft.tags);
  const now = new Date().toISOString();

  return {
    schema: 'ron.video.future_manifest_draft.v1',
    status: 'local_draft_not_published',
    truth_boundary: {
      backend_video_routes_wired: false,
      b3_content_id_assigned: false,
      manifest_cid_assigned: false,
      roc_charged: false,
      wallet_mutated: false,
      index_pointer_created: false,
      video_bytes_uploaded: false,
      streaming_plan_committed: false
    },
    intended_asset: {
      kind: 'video',
      future_crab_url_shape: 'crab://<64 lowercase hex>.video',
      canonical_content_id_pending: true,
      selected_file_present: Boolean(selectedFile),
      file_name: selectedFile?.name || '',
      content_type: selectedFile?.type || '',
      bytes: selectedFile?.size || 0
    },
    media_plan: {
      phase: 'draft_only',
      needed_before_real_publish: [
        'video prepare/create DTOs',
        'paid storage admission for large media',
        'range/streaming route design',
        'thumbnail manifest link',
        'provider/storage availability metadata',
        'index pointer for crab://<hash>.video',
        'video asset-page hydration'
      ]
    },
    creator: {
      handle_display: draft.creatorHandle || localHandle(),
      passport_subject_display: localPassportSubject(),
      wallet_account_display: localWalletAccount(),
      backend_confirmed: false
    },
    metadata: {
      title: draft.title,
      description: draft.description,
      tags,
      language: draft.language || 'en',
      license: draft.license || 'all-rights-reserved',
      thumbnail_crab_url: draft.thumbnailCrabUrl,
      suggested_price_minor_units: normalizeMinorUnits(draft.suggestedPriceMinor)
    },
    last_prepare_attempt: lastPrepareResponse,
    updated_at: now
  };
}

function buildVideoPrepareRequest(section) {
  const draft = readDraftFromForm(section);
  const tags = parseTags(draft.tags);

  return stripUndefined({
    schema: 'crablink.video-prepare-request.v1',
    kind: 'video',
    title: draft.title || selectedFile?.name || undefined,
    description: draft.description || undefined,
    tags,
    language: draft.language || 'en',
    license: draft.license || 'all-rights-reserved',
    thumbnail_crab_url: draft.thumbnailCrabUrl || undefined,
    suggested_price_minor_units: normalizeMinorUnits(draft.suggestedPriceMinor),
    file_name: selectedFile?.name || undefined,
    content_type: selectedFile?.type || undefined,
    bytes: selectedFile?.size || undefined,
    upload_bytes_included: false,
    body_note: 'CrabLink video draft prepare sends metadata only. Video bytes are not uploaded by this scaffold.',
    payer_account: localWalletAccount(),
    owner_passport_subject: localPassportSubject(),
    creator_handle_display: draft.creatorHandle || localHandle(),
    client_idempotency_key: stableClientIdempotencyKey(draft.title || selectedFile?.name || 'video')
  });
}

async function sendVideoPrepare(section) {
  await saveDraftToStorage(section, { announce: false });

  const status = section.querySelector(`#${VIDEO_PREPARE_STATUS_ID}`);
  const result = section.querySelector(`#${VIDEO_PREPARE_RESULT_ID}`);
  const actionButtonEl = section.querySelector('[data-video-action="send-prepare"]');

  if (status) {
    status.className = 'video-prepare-status pending';
    status.textContent = `Sending non-mutating prepare request to ${FUTURE_VIDEO_PREPARE_ROUTE}…`;
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
    const requestBody = buildVideoPrepareRequest(section);
    const requestCorrelationId = createCorrelationId();

    const response = await fetch(`${gateway}${FUTURE_VIDEO_PREPARE_ROUTE}`, {
      method: 'POST',
      headers: stripUndefined({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: settings.authToken ? `Bearer ${settings.authToken}` : undefined,
        'Idempotency-Key': requestBody.client_idempotency_key,
        'x-ron-passport': settings.passportSubject || localPassportSubject(),
        'x-ron-wallet-account': settings.walletAccount || localWalletAccount(),
        'x-correlation-id': requestCorrelationId,
        'x-crablink-client': 'chrome-extension-video-draft'
      }),
      body: JSON.stringify(requestBody)
    });

    const text = await response.text();
    const parsed = parseJsonMaybe(text);

    const payload = {
      schema: 'crablink.video-prepare-attempt.v1',
      ok: response.ok,
      status: response.status,
      status_text: response.statusText,
      route: FUTURE_VIDEO_PREPARE_ROUTE,
      correlation_id: requestCorrelationId,
      truth_boundary: response.ok
        ? 'Gateway returned a response. This is still prepare/preflight, not video publication.'
        : 'Gateway did not accept the future video prepare route. No video was published, no bytes were uploaded, no b3 CID was assigned, and no ROC was charged.',
      response: parsed ?? text
    };

    lastPrepareResponse = payload;
    updateVideoManifest(section);

    if (status) {
      status.className = response.ok ? 'video-prepare-status ok' : 'video-prepare-status error';
      status.textContent = response.ok
        ? 'Video prepare response received. This is still not a published video.'
        : `Video prepare failed with HTTP ${response.status}. Backend video routes may not be wired yet.`;
    }

    if (result) {
      result.textContent = JSON.stringify(payload, null, 2);
    }

    setFooter(
      response.ok
        ? 'Video prepare response received.'
        : `Video prepare failed with HTTP ${response.status}; no publication occurred.`
    );
  } catch (error) {
    const payload = {
      schema: 'crablink.video-prepare-attempt.v1',
      ok: false,
      route: FUTURE_VIDEO_PREPARE_ROUTE,
      error: String(error?.message || error),
      truth_boundary: 'No video was published, no bytes were uploaded, no b3 CID was assigned, and no ROC was charged.'
    };

    lastPrepareResponse = payload;
    updateVideoManifest(section);

    if (status) {
      status.className = 'video-prepare-status error';
      status.textContent = `Video prepare failed: ${payload.error}`;
    }

    if (result) {
      result.classList.remove('hidden');
      result.textContent = JSON.stringify(payload, null, 2);
    }

    setFooter('Video prepare failed; no publication occurred.');
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
    setFooter('Video draft metadata saved locally.');
  }
}

async function clearDraft(section) {
  selectedFile = null;
  lastPrepareResponse = null;

  if (selectedObjectUrl) {
    try {
      URL.revokeObjectURL(selectedObjectUrl);
    } catch {
      // Best-effort object URL cleanup.
    }
    selectedObjectUrl = '';
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [DRAFT_KEY]: { ...DEFAULT_DRAFT, updatedAt: new Date().toISOString() } });
  }

  const file = section.querySelector('#videoFile');
  if (file) file.value = '';

  const video = section.querySelector('#videoPreviewPlayer');
  if (video) {
    video.removeAttribute('src');
    video.load();
  }

  section.querySelector('#videoPreviewEmpty')?.classList.remove('hidden');

  setField(section, 'title', '');
  setField(section, 'description', '');
  setField(section, 'tags', '');
  setField(section, 'language', 'en');
  setField(section, 'license', 'all-rights-reserved');
  setField(section, 'creatorHandle', localHandle());
  setField(section, 'thumbnailCrabUrl', '');
  setField(section, 'suggestedPriceMinor', '0');

  const status = section.querySelector(`#${VIDEO_PREPARE_STATUS_ID}`);
  if (status) {
    status.className = 'video-prepare-status';
    status.textContent = 'No video prepare request sent yet.';
  }

  const result = section.querySelector(`#${VIDEO_PREPARE_RESULT_ID}`);
  if (result) {
    result.classList.add('hidden');
    result.textContent = 'No prepare response yet.';
  }

  updateVideoFileState(section);
  updateVideoManifest(section);
  setFooter('Video draft cleared locally.');
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
    description: getField(section, 'description'),
    tags: getField(section, 'tags'),
    language: getField(section, 'language') || 'en',
    license: getField(section, 'license') || 'all-rights-reserved',
    creatorHandle: getField(section, 'creatorHandle') || localHandle(),
    thumbnailCrabUrl: getField(section, 'thumbnailCrabUrl'),
    suggestedPriceMinor: getField(section, 'suggestedPriceMinor') || '0'
  };
}

function getField(section, name) {
  return clean(section.querySelector(`[data-video-field="${name}"]`)?.value || '');
}

function setField(section, name, value) {
  const field = section.querySelector(`[data-video-field="${name}"]`);
  if (field) field.value = String(value ?? '');
}

function statChip(label, value) {
  const chip = document.createElement('span');
  chip.className = 'video-stat-chip';

  const term = document.createElement('span');
  term.textContent = `${label}:`;

  const body = document.createElement('strong');
  body.textContent = value || '—';

  chip.append(term, body);
  return chip;
}

function isVideoPage() {
  const url = readCurrentCrabUrl().toLowerCase();
  if (url === 'crab://video') return true;

  const payload = readPayload();
  if (!payload) return false;

  return isVideoPayload(payload);
}

function isVideoPayload(payload) {
  const schema = clean(payload?.schema || payload?.type);
  const slug = clean(payload?.slug || payload?.page || payload?.kind || payload?.name || payload?.page_kind || '').toLowerCase();
  const title = clean(payload?.title || payload?.metadata?.title || '').toLowerCase();
  const crab = clean(payload?.links?.crab || payload?.crab_url || payload?.url || payload?.route || '').toLowerCase();

  return (
    schema === 'crablink.video.local_page.v1' ||
    schema === 'ron.video.future_manifest_draft.v1' ||
    (schema === BUILTIN_SCHEMA && (slug === 'video' || crab === 'crab://video' || title.includes('video'))) ||
    crab === 'crab://video'
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

function titleFromFilename(name) {
  return clean(name)
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  const safeSeed = cleanSeed.slice(0, 48) || 'video';
  return `crablink-video-prepare-${safeSeed}-${Date.now().toString(36)}`;
}

function createCorrelationId() {
  const random = Math.random().toString(16).slice(2, 10);
  return `crablink-video-${Date.now()}-${random}`;
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
    body.${VIDEO_VIEW_CLASS} #${ARTICLE_SECTION_ID},
    body.${VIDEO_VIEW_CLASS} #${PROFILE_SECTION_ID},
    body.${VIDEO_VIEW_CLASS} #workflowSection,
    body.${VIDEO_VIEW_CLASS} #actionsSection,
    body.${VIDEO_VIEW_CLASS} #fieldsSection,
    body.${VIDEO_VIEW_CLASS} #warningsSection,
    body.${VIDEO_VIEW_CLASS} #sitePageSection,
    body.${VIDEO_VIEW_CLASS} #prepareSummary,
    body.${VIDEO_VIEW_CLASS} #holdSection,
    body.${VIDEO_VIEW_CLASS} #submitSection {
      display: none !important;
    }

    .video-draft-section {
      display: grid;
      gap: 16px;
      border-color: rgba(96, 165, 250, 0.26) !important;
      background:
        radial-gradient(circle at top left, rgba(96, 165, 250, 0.12), transparent 42%),
        radial-gradient(circle at top right, rgba(34, 197, 94, 0.09), transparent 36%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.90), rgba(8, 17, 34, 0.94)) !important;
    }

    .video-draft-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
    }

    .video-draft-eyebrow {
      margin: 0 0 6px;
      color: #93c5fd;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .video-draft-head h3 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(30px, 5vw, 52px);
      line-height: 1;
      letter-spacing: -0.07em;
    }

    .video-draft-head p:not(.video-draft-eyebrow) {
      margin: 8px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .video-draft-badge {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 7px 11px;
      border: 1px solid rgba(96, 165, 250, 0.42);
      border-radius: 999px;
      color: #bfdbfe;
      background: rgba(30, 64, 175, 0.18);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .video-draft-notice {
      padding: 14px;
      border: 1px solid rgba(251, 191, 36, 0.24);
      border-radius: 18px;
      color: #fde68a;
      background: rgba(113, 63, 18, 0.14);
      line-height: 1.45;
    }

    .video-draft-layout {
      display: grid;
      grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
      gap: 16px;
      align-items: start;
    }

    .video-draft-form,
    .video-preview-panel,
    .video-draft-manifest {
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 24px;
      background: rgba(2, 6, 23, 0.30);
    }

    .video-draft-form {
      display: grid;
      gap: 12px;
      padding: 16px;
    }

    .video-file-drop {
      display: grid;
      gap: 8px;
      padding: 16px;
      border: 1px dashed rgba(96, 165, 250, 0.42);
      border-radius: 20px;
      background: rgba(30, 64, 175, 0.12);
      color: #cbd5e1;
    }

    .video-file-drop strong {
      color: #bfdbfe;
      font-size: 18px;
      letter-spacing: -0.03em;
    }

    .video-file-drop span {
      color: #94a3b8;
      line-height: 1.4;
    }

    .video-file-drop input {
      width: 100%;
      color: #e2e8f0;
    }

    .video-field {
      display: grid;
      gap: 7px;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 850;
    }

    .video-field span {
      color: #93c5fd;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .video-field input,
    .video-field textarea,
    .video-field select {
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

    .video-field textarea {
      resize: vertical;
      min-height: 112px;
      line-height: 1.45;
    }

    .video-field input:focus,
    .video-field textarea:focus,
    .video-field select:focus {
      border-color: rgba(96, 165, 250, 0.60);
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.12);
    }

    .video-two-column {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .video-preview-panel {
      display: grid;
      gap: 14px;
      padding: 18px;
    }

    .video-preview-head h4 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(26px, 4vw, 42px);
      line-height: 1;
      letter-spacing: -0.07em;
      overflow-wrap: anywhere;
    }

    .video-preview-head p:not(.video-draft-eyebrow) {
      margin: 8px 0 0;
      color: #bfdbfe;
      line-height: 1.45;
    }

    .video-player-shell {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 320px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 22px;
      background:
        radial-gradient(circle at center, rgba(96, 165, 250, 0.10), transparent 42%),
        #020617;
      overflow: hidden;
    }

    .video-player-shell video {
      width: 100%;
      max-height: 560px;
      background: #000;
    }

    .video-preview-empty {
      position: absolute;
      inset: 16px;
      display: grid;
      place-items: center;
      border: 1px dashed rgba(148, 163, 184, 0.24);
      border-radius: 18px;
      color: #94a3b8;
      background: rgba(15, 23, 42, 0.48);
      font-weight: 900;
    }

    .video-preview-empty.hidden {
      display: none !important;
    }

    .video-draft-stats,
    .video-preview-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .video-stat-chip,
    .video-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 28px;
      padding: 6px 9px;
      border: 1px solid rgba(96, 165, 250, 0.24);
      border-radius: 999px;
      color: #bfdbfe;
      background: rgba(30, 64, 175, 0.16);
      font-size: 12px;
      font-weight: 850;
      max-width: 100%;
      overflow-wrap: anywhere;
    }

    .video-stat-chip span {
      color: #93c5fd;
      font-weight: 950;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .video-tag.empty {
      border-color: rgba(148, 163, 184, 0.20);
      color: #94a3b8;
      background: rgba(15, 23, 42, 0.42);
    }

    .video-draft-manifest {
      overflow: hidden;
    }

    .video-draft-manifest summary {
      cursor: pointer;
      padding: 14px 16px;
      color: #f8fafc;
      font-weight: 950;
    }

    .video-draft-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      padding: 0 16px 14px;
    }

    .video-draft-actions button {
      min-height: 34px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 950;
    }

    .video-prepare-status {
      margin: 0 16px 12px;
      padding: 12px 13px;
      border: 1px solid rgba(148, 163, 184, 0.20);
      border-radius: 14px;
      color: #cbd5e1;
      background: rgba(15, 23, 42, 0.48);
      line-height: 1.4;
    }

    .video-prepare-status.pending {
      border-color: rgba(96, 165, 250, 0.36);
      color: #bfdbfe;
      background: rgba(30, 64, 175, 0.18);
    }

    .video-prepare-status.ok {
      border-color: rgba(34, 197, 94, 0.34);
      color: #bbf7d0;
      background: rgba(22, 101, 52, 0.18);
    }

    .video-prepare-status.error {
      border-color: rgba(248, 113, 113, 0.34);
      color: #fecaca;
      background: rgba(127, 29, 29, 0.20);
    }

    .video-manifest-preview,
    .video-prepare-result {
      max-height: 440px;
      overflow: auto;
      margin: 0;
      padding: 16px;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
      color: #dbeafe;
      background: #020617;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .video-prepare-result.hidden {
      display: none !important;
    }

    .video-prepare-result {
      border-top-color: rgba(96, 165, 250, 0.22);
    }

    @media (max-width: 980px) {
      .video-draft-layout,
      .video-two-column {
        grid-template-columns: 1fr;
      }

      .video-draft-head {
        flex-direction: column;
      }

      .video-draft-actions {
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