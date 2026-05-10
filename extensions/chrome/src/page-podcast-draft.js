/**
 * RO:WHAT — Adds an honest local podcast-studio workspace to crab://podcast.
 * RO:WHY — NEXT_LEVEL audio creator foundation; Concerns: DX/SEC; prove podcast UX for upload/live audio without pretending backend publishing exists.
 * RO:INTERACTS — page.html, page.js shell, chrome.storage.local, future svc-gateway /podcasts/prepare route.
 * RO:INVARIANTS — local draft first; gateway-only prepare attempt; no fake b3 CID; no fake audio upload; no stream key; no wallet mutation.
 * RO:TRUTH — No b3 CID, No ROC charge, No wallet mutation, and no backend publication claim from local drafts.
 * RO:METRICS — client correlation IDs are generated for prepare attempts.
 * RO:CONFIG — stores crablinkPodcastDraftV1 metadata only; selected local audio file bytes and mic preview streams are not persisted.
 * RO:SECURITY — textContent/createElement only; no private keys; no stream keys; no direct internal service calls; mic preview requires user gesture.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://podcast.
 */

const STYLE_ID = 'crablinkPodcastDraftStyles';
const PODCAST_SECTION_ID = 'podcastDraftSection';
const ARTICLE_SECTION_ID = 'articleDraftSection';
const VIDEO_SECTION_ID = 'videoDraftSection';
const STREAM_SECTION_ID = 'streamDraftSection';
const PROFILE_SECTION_ID = 'profileHomeSection';
const PODCAST_PREPARE_STATUS_ID = 'podcastGatewayPrepareStatus';
const PODCAST_PREPARE_RESULT_ID = 'podcastGatewayPrepareResult';
const DRAFT_KEY = 'crablinkPodcastDraftV1';
const BUILTIN_SCHEMA = 'omnigate.builtin-page.v1';
const PODCAST_VIEW_CLASS = 'crablink-podcast-draft-view-mode';
const ARTICLE_VIEW_CLASS = 'crablink-article-draft-view-mode';
const VIDEO_VIEW_CLASS = 'crablink-video-draft-view-mode';
const STREAM_VIEW_CLASS = 'crablink-stream-draft-view-mode';
const PROFILE_VIEW_CLASS = 'crablink-profile-view-mode';
const FUTURE_PODCAST_PREPARE_ROUTE = '/podcasts/prepare';

const DEFAULT_DRAFT = {
  schema: 'crablink.podcast-draft.local.v1',
  showTitle: '',
  episodeTitle: '',
  episodeNumber: '',
  seasonNumber: '',
  description: '',
  category: '',
  tags: '',
  language: 'en',
  visibility: 'public',
  audioMode: 'upload',
  podcastKind: 'episode',
  creatorHandle: '',
  coverImageCrabUrl: '',
  suggestedPriceMinor: '0',
  tipsEnabled: true,
  updatedAt: ''
};

let renderTimer = 0;
let saveTimer = 0;
let lastRouteSignature = '';
let selectedAudioFile = null;
let selectedAudioObjectUrl = '';
let localMicStream = null;
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
    renderPodcastDraftWorkspace().catch((error) => {
      setFooter(`Podcast draft skipped: ${error?.message || error}`);
    });
  }, 90);
}

async function renderPodcastDraftWorkspace() {
  if (!isPodcastPage()) {
    lastRouteSignature = '';
    document.body?.classList.remove(PODCAST_VIEW_CLASS);
    document.getElementById(PODCAST_SECTION_ID)?.remove();
    stopMicPreview();
    revokeSelectedAudioObjectUrl();
    selectedAudioFile = null;
    return;
  }

  showPodcastShell();
  enforcePodcastOnlyLayout();

  const pagePanel = document.getElementById('pagePanel');
  if (!pagePanel) return;

  const routeSignature = routeFingerprint();

  let section = document.getElementById(PODCAST_SECTION_ID);
  if (!section) {
    section = buildPodcastSection();

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

  updatePodcastPreviewState(section);
  updatePodcastManifest(section);
}

function showPodcastShell() {
  const loading = document.getElementById('loadingPanel');
  const error = document.getElementById('errorPanel');
  const page = document.getElementById('pagePanel');

  loading?.classList.add('hidden');
  error?.classList.add('hidden');
  page?.classList.remove('hidden');

  setText(document.getElementById('pageBadge'), 'podcast');
  setText(document.getElementById('pageTitle'), 'CrabLink Podcast Studio');
  setText(
    document.getElementById('pageDescription'),
    'Local podcast workspace for audio upload drafts and live mic preview. Publishing is intentionally disabled until RustyOnions exposes real podcast routes.'
  );

  const facts = document.getElementById('pageFacts');
  if (facts) {
    facts.dataset.podcastFactsInstalled = '1';
    facts.textContent = '';
    facts.append(
      factCard('Surface', 'crab://podcast'),
      factCard('Future episode shape', 'crab://<64 lowercase hex>.podcast'),
      factCard('Modes', 'audio upload / live mic preview'),
      factCard('Prepare route', FUTURE_PODCAST_PREPARE_ROUTE)
    );
  }

  const developer = document.getElementById('developerJson');
  if (developer) {
    const payload = readPayload();
    if (!payload || !isPodcastPayload(payload)) {
      developer.textContent = JSON.stringify(
        {
          schema: 'crablink.podcast.local_page.v1',
          route: 'crab://podcast',
          status: 'local_studio_not_published',
          truth_boundary: {
            backend_podcast_routes_wired: false,
            podcast_episode_created: false,
            audio_bytes_uploaded: false,
            live_audio_session_created: false,
            b3_content_id_assigned: false,
            manifest_cid_assigned: false,
            roc_charged: false,
            wallet_mutated: false
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

function enforcePodcastOnlyLayout() {
  document.body?.classList.add(PODCAST_VIEW_CLASS);
  document.body?.classList.remove(ARTICLE_VIEW_CLASS);
  document.body?.classList.remove(VIDEO_VIEW_CLASS);
  document.body?.classList.remove(STREAM_VIEW_CLASS);
  document.body?.classList.remove(PROFILE_VIEW_CLASS);
  document.body?.classList.remove('crablink-site-full-view-mode');

  for (const id of [ARTICLE_SECTION_ID, VIDEO_SECTION_ID, STREAM_SECTION_ID]) {
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

function buildPodcastSection() {
  const section = document.createElement('section');
  section.id = PODCAST_SECTION_ID;
  section.className = 'podcast-draft-section content-section';

  const head = document.createElement('div');
  head.className = 'podcast-draft-head';

  const copy = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'podcast-draft-eyebrow';
  eyebrow.textContent = 'NEXT_LEVEL audio creator foundation';

  const title = document.createElement('h3');
  title.textContent = 'Podcast Studio';

  const description = document.createElement('p');
  description.textContent =
    'Draft a podcast episode, preview a local audio upload, or test live mic audio locally. Backend podcast publishing, live audio, paid access, and episode manifests are not live yet.';

  copy.append(eyebrow, title, description);

  const badge = document.createElement('span');
  badge.className = 'podcast-draft-badge';
  badge.textContent = 'local audio studio';

  head.append(copy, badge);

  const notice = document.createElement('div');
  notice.className = 'podcast-draft-notice';
  notice.textContent =
    'Truth boundary: this page does not upload audio bytes, does not create a live stream, does not create a b3 CID, does not create a podcast manifest, does not charge ROC, and does not publish a podcast. Prepare is a non-mutating gateway attempt only.';

  const layout = document.createElement('div');
  layout.className = 'podcast-draft-layout';

  const form = buildPodcastForm();
  const preview = buildPodcastPreview();

  layout.append(form, preview);

  const manifestPanel = document.createElement('details');
  manifestPanel.className = 'podcast-draft-manifest';
  manifestPanel.open = true;

  const summary = document.createElement('summary');
  summary.textContent = 'Future podcast manifest draft';

  const manifestActions = document.createElement('div');
  manifestActions.className = 'podcast-draft-actions';

  const sendPrepare = actionButton('Send Prepare Request', 'data-podcast-action', 'send-prepare');
  const copyManifest = actionButton('Copy Manifest JSON', 'data-podcast-action', 'copy-manifest', true);
  const copyMetadata = actionButton('Copy Metadata JSON', 'data-podcast-action', 'copy-metadata', true);
  const saveDraft = actionButton('Save Local Draft', 'data-podcast-action', 'save', true);
  const clearDraft = actionButton('Clear Draft', 'data-podcast-action', 'clear', true);

  manifestActions.append(sendPrepare, copyManifest, copyMetadata, saveDraft, clearDraft);

  const prepareStatus = document.createElement('div');
  prepareStatus.id = PODCAST_PREPARE_STATUS_ID;
  prepareStatus.className = 'podcast-prepare-status';
  prepareStatus.textContent = 'No podcast prepare request sent yet.';

  const manifest = document.createElement('pre');
  manifest.id = 'podcastManifestPreview';
  manifest.className = 'podcast-manifest-preview';
  manifest.textContent = '{}';

  const prepareResult = document.createElement('pre');
  prepareResult.id = PODCAST_PREPARE_RESULT_ID;
  prepareResult.className = 'podcast-prepare-result hidden';
  prepareResult.textContent = 'No prepare response yet.';

  manifestPanel.append(summary, manifestActions, prepareStatus, manifest, prepareResult);
  section.append(head, notice, layout, manifestPanel);

  section.addEventListener('input', (event) => {
    if (!event.target?.closest?.('[data-podcast-field]')) return;

    updatePodcastPreviewState(section);
    updatePodcastManifest(section);
    scheduleAutoSave(section);
  });

  section.addEventListener('change', (event) => {
    if (event.target?.id === 'podcastAudioFile') {
      handleAudioFileSelected(section, event.target.files?.[0] || null);
      return;
    }

    if (!event.target?.closest?.('[data-podcast-field]')) return;

    updatePodcastPreviewState(section);
    updatePodcastManifest(section);
    scheduleAutoSave(section);
  });

  section.addEventListener('click', (event) => {
    const action = event.target?.closest?.('[data-podcast-action]')?.getAttribute('data-podcast-action');
    if (!action) return;

    event.preventDefault();

    if (action === 'start-mic') {
      void startMicPreview(section);
      return;
    }

    if (action === 'stop-mic') {
      stopMicPreview();
      updatePodcastPreviewState(section);
      updatePodcastManifest(section);
      setFooter('Local podcast mic preview stopped.');
      return;
    }

    if (action === 'send-prepare') {
      void sendPodcastPrepare(section);
      return;
    }

    if (action === 'copy-manifest') {
      void copyTextValue(JSON.stringify(buildFutureManifest(section), null, 2), 'Podcast manifest draft copied.');
      return;
    }

    if (action === 'copy-metadata') {
      void copyTextValue(JSON.stringify(buildPodcastPrepareRequest(section), null, 2), 'Podcast metadata request copied.');
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

function buildPodcastForm() {
  const form = document.createElement('form');
  form.className = 'podcast-draft-form';

  const modeControls = document.createElement('div');
  modeControls.className = 'podcast-mode-controls';

  const micButton = actionButton('Start Live Mic Preview', 'data-podcast-action', 'start-mic');
  const stopMicButton = actionButton('Stop Mic Preview', 'data-podcast-action', 'stop-mic', true);

  const fileBlock = document.createElement('label');
  fileBlock.className = 'podcast-audio-drop';

  const fileTitle = document.createElement('strong');
  fileTitle.textContent = 'Choose local audio upload';

  const fileHint = document.createElement('span');
  fileHint.textContent = 'Preview only. Audio bytes are not persisted and are not uploaded by this scaffold.';

  const fileInput = document.createElement('input');
  fileInput.id = 'podcastAudioFile';
  fileInput.type = 'file';
  fileInput.accept = 'audio/*';

  fileBlock.append(fileTitle, fileHint, fileInput);
  modeControls.append(micButton, stopMicButton);

  form.append(
    modeControls,
    fileBlock,
    twoColumn(
      fieldBlock({
        label: 'Show title',
        field: inputField('podcastShowTitle', 'showTitle', 'The CrabCast')
      }),
      fieldBlock({
        label: 'Episode title',
        field: inputField('podcastEpisodeTitle', 'episodeTitle', 'The Way of the Crab')
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Season',
        field: inputField('podcastSeasonNumber', 'seasonNumber', '1')
      }),
      fieldBlock({
        label: 'Episode',
        field: inputField('podcastEpisodeNumber', 'episodeNumber', '1')
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Podcast kind',
        field: selectField('podcastKind', 'podcastKind', [
          ['episode', 'Episode'],
          ['show', 'Show page later'],
          ['live-audio', 'Live audio session later'],
          ['clip', 'Clip later']
        ])
      }),
      fieldBlock({
        label: 'Audio mode',
        field: selectField('podcastAudioMode', 'audioMode', [
          ['upload', 'Audio upload draft'],
          ['live', 'Live mic preview'],
          ['hybrid', 'Hybrid later']
        ])
      })
    ),
    fieldBlock({
      label: 'Description / show notes',
      field: textareaField('podcastDescription', 'description', 'Describe this episode, guests, show notes, links, and audience.', 6)
    }),
    twoColumn(
      fieldBlock({
        label: 'Category',
        field: inputField('podcastCategory', 'category', 'Technology')
      }),
      fieldBlock({
        label: 'Tags',
        field: inputField('podcastTags', 'tags', 'rustyonions, crablink, podcast')
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Language',
        field: inputField('podcastLanguage', 'language', 'en')
      }),
      fieldBlock({
        label: 'Visibility',
        field: selectField('podcastVisibility', 'visibility', [
          ['public', 'Public'],
          ['unlisted', 'Unlisted'],
          ['private', 'Private draft']
        ])
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Creator handle',
        field: inputField('podcastCreatorHandle', 'creatorHandle', '@skinnycrabby')
      }),
      fieldBlock({
        label: 'Cover image crab URL',
        field: inputField('podcastCoverImageCrabUrl', 'coverImageCrabUrl', 'crab://<hash>.image')
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Suggested access price minor units',
        field: inputField('podcastSuggestedPriceMinor', 'suggestedPriceMinor', '0')
      }),
      checkboxBlock({
        label: 'Tips enabled later',
        field: checkboxField('podcastTipsEnabled', 'tipsEnabled')
      })
    )
  );

  return form;
}

function buildPodcastPreview() {
  const panel = document.createElement('article');
  panel.className = 'podcast-preview-panel';

  const head = document.createElement('div');
  head.className = 'podcast-preview-head';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'podcast-draft-eyebrow';
  eyebrow.textContent = 'Safe local audio preview';

  const title = document.createElement('h4');
  title.id = 'podcastPreviewTitle';
  title.textContent = 'Untitled podcast episode';

  const description = document.createElement('p');
  description.id = 'podcastPreviewDescription';
  description.textContent = 'Choose a local audio file or start mic preview. Nothing is published.';

  head.append(eyebrow, title, description);

  const playerWrap = document.createElement('div');
  playerWrap.className = 'podcast-player-shell';

  const audio = document.createElement('audio');
  audio.id = 'podcastAudioPreviewPlayer';
  audio.controls = true;
  audio.preload = 'metadata';

  const empty = document.createElement('div');
  empty.id = 'podcastPreviewEmpty';
  empty.className = 'podcast-preview-empty';
  empty.textContent = 'No local audio selected and no mic preview running.';

  const micBadge = document.createElement('div');
  micBadge.id = 'podcastMicBadge';
  micBadge.className = 'podcast-mic-badge hidden';
  micBadge.textContent = 'LIVE MIC LOCAL PREVIEW';

  playerWrap.append(audio, empty, micBadge);

  const stats = document.createElement('div');
  stats.id = 'podcastDraftStats';
  stats.className = 'podcast-draft-stats';

  const tags = document.createElement('div');
  tags.id = 'podcastPreviewTags';
  tags.className = 'podcast-preview-tags';

  panel.append(head, playerWrap, stats, tags);
  return panel;
}

function fieldBlock({ label, field }) {
  const block = document.createElement('label');
  block.className = 'podcast-field';

  const span = document.createElement('span');
  span.textContent = label;

  block.append(span, field);
  return block;
}

function checkboxBlock({ label, field }) {
  const block = document.createElement('label');
  block.className = 'podcast-checkbox-field';

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
  input.dataset.podcastField = name;
  return input;
}

function textareaField(id, name, placeholder, rows) {
  const textarea = document.createElement('textarea');
  textarea.id = id;
  textarea.placeholder = placeholder;
  textarea.rows = rows;
  textarea.dataset.podcastField = name;
  return textarea;
}

function selectField(id, name, options) {
  const select = document.createElement('select');
  select.id = id;
  select.dataset.podcastField = name;

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
  input.dataset.podcastField = name;
  return input;
}

function twoColumn(left, right) {
  const row = document.createElement('div');
  row.className = 'podcast-two-column';
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

  setField(section, 'showTitle', merged.showTitle);
  setField(section, 'episodeTitle', merged.episodeTitle);
  setField(section, 'episodeNumber', merged.episodeNumber);
  setField(section, 'seasonNumber', merged.seasonNumber);
  setField(section, 'description', merged.description);
  setField(section, 'category', merged.category);
  setField(section, 'tags', merged.tags);
  setField(section, 'language', merged.language || 'en');
  setField(section, 'visibility', merged.visibility || 'public');
  setField(section, 'audioMode', merged.audioMode || 'upload');
  setField(section, 'podcastKind', merged.podcastKind || 'episode');
  setField(section, 'creatorHandle', merged.creatorHandle || localHandle());
  setField(section, 'coverImageCrabUrl', merged.coverImageCrabUrl);
  setField(section, 'suggestedPriceMinor', merged.suggestedPriceMinor || '0');
  setField(section, 'tipsEnabled', merged.tipsEnabled !== false);
}

function handleAudioFileSelected(section, file) {
  selectedAudioFile = file || null;
  lastPrepareResponse = null;
  revokeSelectedAudioObjectUrl();

  const audio = section.querySelector('#podcastAudioPreviewPlayer');
  const empty = section.querySelector('#podcastPreviewEmpty');
  const micBadge = section.querySelector('#podcastMicBadge');

  stopMicPreview();

  if (!selectedAudioFile) {
    if (audio) {
      audio.removeAttribute('src');
      audio.load();
    }

    empty?.classList.remove('hidden');
    micBadge?.classList.add('hidden');
    updatePodcastPreviewState(section);
    updatePodcastManifest(section);
    return;
  }

  selectedAudioObjectUrl = URL.createObjectURL(selectedAudioFile);

  if (audio) {
    audio.src = selectedAudioObjectUrl;
    audio.dataset.objectUrl = selectedAudioObjectUrl;
    audio.load();
  }

  empty?.classList.add('hidden');
  micBadge?.classList.add('hidden');

  if (!getField(section, 'episodeTitle')) {
    setField(section, 'episodeTitle', titleFromFilename(selectedAudioFile.name));
  }

  setField(section, 'audioMode', 'upload');

  updatePodcastPreviewState(section);
  updatePodcastManifest(section);
  scheduleAutoSave(section);
}

async function startMicPreview(section) {
  revokeSelectedAudioObjectUrl();

  const audio = section.querySelector('#podcastAudioPreviewPlayer');
  const fileInput = section.querySelector('#podcastAudioFile');
  const empty = section.querySelector('#podcastPreviewEmpty');
  const micBadge = section.querySelector('#podcastMicBadge');

  if (fileInput) fileInput.value = '';
  selectedAudioFile = null;
  stopMicPreview();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });

    localMicStream = stream;

    if (audio) {
      audio.srcObject = stream;
      audio.controls = true;
      audio.muted = true;
      audio.play().catch(() => {
        // Browser may require user gesture despite this being button-initiated.
      });
    }

    empty?.classList.add('hidden');
    micBadge?.classList.remove('hidden');
    setField(section, 'audioMode', 'live');

    updatePodcastPreviewState(section);
    updatePodcastManifest(section);
    setFooter('Local podcast mic preview started. Nothing is broadcasting or recording.');
  } catch (error) {
    localMicStream = null;
    empty?.classList.remove('hidden');
    micBadge?.classList.add('hidden');
    updatePodcastPreviewState(section);
    setFooter(`Podcast mic preview failed: ${error?.message || error}`);
  }
}

function stopMicPreview() {
  if (localMicStream) {
    for (const track of localMicStream.getTracks()) {
      try {
        track.stop();
      } catch {
        // Best-effort local mic cleanup.
      }
    }
  }

  localMicStream = null;

  const audio = document.getElementById('podcastAudioPreviewPlayer');
  if (audio) {
    audio.srcObject = null;
  }

  document.getElementById('podcastMicBadge')?.classList.add('hidden');

  if (!selectedAudioFile) {
    document.getElementById('podcastPreviewEmpty')?.classList.remove('hidden');
  }
}

function revokeSelectedAudioObjectUrl() {
  if (selectedAudioObjectUrl) {
    try {
      URL.revokeObjectURL(selectedAudioObjectUrl);
    } catch {
      // Best-effort object URL cleanup.
    }
  }

  selectedAudioObjectUrl = '';
}

function updatePodcastPreviewState(section) {
  const draft = readDraftFromForm(section);

  const displayTitle = draft.episodeTitle || draft.showTitle || selectedAudioFile?.name || 'Untitled podcast episode';
  const displaySubtitle = [
    draft.showTitle ? `Show: ${draft.showTitle}` : '',
    draft.category ? `Category: ${draft.category}` : '',
    draft.description || ''
  ].filter(Boolean).join(' • ');

  setText(section.querySelector('#podcastPreviewTitle'), displayTitle);
  setText(
    section.querySelector('#podcastPreviewDescription'),
    displaySubtitle || 'Choose a local audio file or start mic preview. Nothing is published.'
  );

  const micTracks = localMicStream ? localMicStream.getAudioTracks() : [];

  const stats = section.querySelector('#podcastDraftStats');
  if (stats) {
    replaceChildren(
      stats,
      statChip('Mode', localMicStream ? 'live mic local' : draft.audioMode || 'upload'),
      statChip('Audio file', selectedAudioFile ? selectedAudioFile.name : 'none'),
      statChip('Bytes', selectedAudioFile ? String(selectedAudioFile.size) : '0'),
      statChip('Type', selectedAudioFile ? selectedAudioFile.type || 'unknown' : localMicStream ? 'microphone' : 'none'),
      statChip('Mic tracks', String(micTracks.length)),
      statChip('Publish status', 'not wired'),
      statChip('Tips', draft.tipsEnabled ? 'future enabled' : 'disabled')
    );
  }

  const tags = section.querySelector('#podcastPreviewTags');
  if (tags) {
    tags.textContent = '';
    const parsedTags = parseTags(draft.tags);

    if (parsedTags.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'podcast-tag empty';
      empty.textContent = 'no tags';
      tags.append(empty);
    } else {
      for (const tag of parsedTags) {
        const chip = document.createElement('span');
        chip.className = 'podcast-tag';
        chip.textContent = `#${tag}`;
        tags.append(chip);
      }
    }
  }
}

function updatePodcastManifest(section) {
  const pre = section.querySelector('#podcastManifestPreview');
  if (!pre) return;

  pre.textContent = JSON.stringify(buildFutureManifest(section), null, 2);
}

function buildFutureManifest(section) {
  const draft = readDraftFromForm(section);
  const tags = parseTags(draft.tags);
  const now = new Date().toISOString();
  const micTracks = localMicStream ? localMicStream.getAudioTracks() : [];

  return {
    schema: 'ron.podcast.future_manifest_draft.v1',
    status: 'local_studio_not_published',
    truth_boundary: {
      backend_podcast_routes_wired: false,
      podcast_episode_created: false,
      show_page_created: false,
      audio_bytes_uploaded: false,
      live_audio_session_created: false,
      b3_content_id_assigned: false,
      manifest_cid_assigned: false,
      roc_charged: false,
      wallet_mutated: false,
      index_pointer_created: false,
      tips_route_created: false
    },
    intended_surface: {
      route: 'crab://podcast',
      kind: 'podcast',
      future_episode_url_shape: 'crab://<64 lowercase hex>.podcast',
      future_audio_url_shape: 'crab://<64 lowercase hex>.audio',
      canonical_manifest_pending: true,
      selected_audio_file_present: Boolean(selectedAudioFile),
      selected_file_name: selectedAudioFile?.name || '',
      selected_content_type: selectedAudioFile?.type || '',
      selected_bytes: selectedAudioFile?.size || 0,
      local_mic_preview_running: Boolean(localMicStream),
      local_mic_tracks: micTracks.map((track) => ({
        kind: track.kind,
        label: track.label || 'local microphone',
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
    show: {
      title: draft.showTitle,
      category: draft.category,
      language: draft.language || 'en',
      cover_image_crab_url: draft.coverImageCrabUrl
    },
    episode: {
      title: draft.episodeTitle,
      season_number: normalizeOptionalNumber(draft.seasonNumber),
      episode_number: normalizeOptionalNumber(draft.episodeNumber),
      description: draft.description,
      tags,
      visibility: draft.visibility || 'public',
      podcast_kind: draft.podcastKind || 'episode',
      audio_mode: localMicStream ? 'live-preview-local' : draft.audioMode || 'upload',
      suggested_access_price_minor_units: normalizeMinorUnits(draft.suggestedPriceMinor),
      tips_enabled_later: Boolean(draft.tipsEnabled)
    },
    next_required_backend_work: [
      'podcast prepare/create DTOs',
      'audio upload route using paid storage admission',
      'live audio session route for stream-style podcasting',
      'podcast episode manifest and crab://<hash>.podcast resolver',
      'show/feed manifest support',
      'RSS/export compatibility later',
      'comments/chat/moderation policy',
      'tip/payment route through the internal wallet service only',
      'VOD/archive and transcript plan'
    ],
    last_prepare_attempt: lastPrepareResponse,
    updated_at: now
  };
}

function buildPodcastPrepareRequest(section) {
  const draft = readDraftFromForm(section);
  const tags = parseTags(draft.tags);

  return stripUndefined({
    schema: 'crablink.podcast-prepare-request.v1',
    kind: 'podcast',
    show_title: draft.showTitle || undefined,
    episode_title: draft.episodeTitle || selectedAudioFile?.name || undefined,
    season_number: normalizeOptionalNumber(draft.seasonNumber),
    episode_number: normalizeOptionalNumber(draft.episodeNumber),
    description: draft.description || undefined,
    category: draft.category || undefined,
    tags,
    language: draft.language || 'en',
    visibility: draft.visibility || 'public',
    podcast_kind: draft.podcastKind || 'episode',
    audio_mode: localMicStream ? 'live-preview-local' : draft.audioMode || 'upload',
    cover_image_crab_url: draft.coverImageCrabUrl || undefined,
    suggested_access_price_minor_units: normalizeMinorUnits(draft.suggestedPriceMinor),
    tips_enabled: Boolean(draft.tipsEnabled),
    file_name: selectedAudioFile?.name || undefined,
    content_type: selectedAudioFile?.type || undefined,
    bytes: selectedAudioFile?.size || undefined,
    local_mic_preview_running: Boolean(localMicStream),
    upload_bytes_included: false,
    body_note: 'CrabLink podcast draft prepare sends metadata only. Audio bytes are not uploaded and no live broadcast is started by this scaffold.',
    payer_account: localWalletAccount(),
    owner_passport_subject: localPassportSubject(),
    creator_handle_display: draft.creatorHandle || localHandle(),
    client_idempotency_key: stableClientIdempotencyKey(draft.episodeTitle || draft.showTitle || selectedAudioFile?.name || 'podcast')
  });
}

async function sendPodcastPrepare(section) {
  await saveDraftToStorage(section, { announce: false });

  const status = section.querySelector(`#${PODCAST_PREPARE_STATUS_ID}`);
  const result = section.querySelector(`#${PODCAST_PREPARE_RESULT_ID}`);
  const actionButtonEl = section.querySelector('[data-podcast-action="send-prepare"]');

  if (status) {
    status.className = 'podcast-prepare-status pending';
    status.textContent = `Sending non-mutating prepare request to ${FUTURE_PODCAST_PREPARE_ROUTE}…`;
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
    const requestBody = buildPodcastPrepareRequest(section);
    const requestCorrelationId = createCorrelationId();

    const response = await fetch(`${gateway}${FUTURE_PODCAST_PREPARE_ROUTE}`, {
      method: 'POST',
      headers: stripUndefined({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: settings.authToken ? `Bearer ${settings.authToken}` : undefined,
        'Idempotency-Key': requestBody.client_idempotency_key,
        'x-ron-passport': settings.passportSubject || localPassportSubject(),
        'x-ron-wallet-account': settings.walletAccount || localWalletAccount(),
        'x-correlation-id': requestCorrelationId,
        'x-crablink-client': 'chrome-extension-podcast-draft'
      }),
      body: JSON.stringify(requestBody)
    });

    const text = await response.text();
    const parsed = parseJsonMaybe(text);

    const payload = {
      schema: 'crablink.podcast-prepare-attempt.v1',
      ok: response.ok,
      status: response.status,
      status_text: response.statusText,
      route: FUTURE_PODCAST_PREPARE_ROUTE,
      correlation_id: requestCorrelationId,
      truth_boundary: response.ok
        ? 'Gateway returned a response. This is still prepare/preflight, not podcast publication.'
        : 'Gateway did not accept the future podcast prepare route. No podcast was published, no audio bytes were uploaded, no b3 CID was assigned, and no ROC was charged.',
      response: parsed ?? text
    };

    lastPrepareResponse = payload;
    updatePodcastManifest(section);

    if (status) {
      status.className = response.ok ? 'podcast-prepare-status ok' : 'podcast-prepare-status error';
      status.textContent = response.ok
        ? 'Podcast prepare response received. This is still not a published podcast.'
        : `Podcast prepare failed with HTTP ${response.status}. Backend podcast routes may not be wired yet.`;
    }

    if (result) {
      result.textContent = JSON.stringify(payload, null, 2);
    }

    setFooter(
      response.ok
        ? 'Podcast prepare response received.'
        : `Podcast prepare failed with HTTP ${response.status}; no podcast was published.`
    );
  } catch (error) {
    const payload = {
      schema: 'crablink.podcast-prepare-attempt.v1',
      ok: false,
      route: FUTURE_PODCAST_PREPARE_ROUTE,
      error: String(error?.message || error),
      truth_boundary: 'No podcast was published, no audio bytes were uploaded, no b3 CID was assigned, and no ROC was charged.'
    };

    lastPrepareResponse = payload;
    updatePodcastManifest(section);

    if (status) {
      status.className = 'podcast-prepare-status error';
      status.textContent = `Podcast prepare failed: ${payload.error}`;
    }

    if (result) {
      result.classList.remove('hidden');
      result.textContent = JSON.stringify(payload, null, 2);
    }

    setFooter('Podcast prepare failed; no podcast was published.');
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
    setFooter('Podcast draft metadata saved locally.');
  }
}

async function clearDraft(section) {
  lastPrepareResponse = null;
  selectedAudioFile = null;
  stopMicPreview();
  revokeSelectedAudioObjectUrl();

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [DRAFT_KEY]: { ...DEFAULT_DRAFT, updatedAt: new Date().toISOString() } });
  }

  const file = section.querySelector('#podcastAudioFile');
  if (file) file.value = '';

  const audio = section.querySelector('#podcastAudioPreviewPlayer');
  if (audio) {
    audio.removeAttribute('src');
    audio.srcObject = null;
    audio.load();
  }

  section.querySelector('#podcastPreviewEmpty')?.classList.remove('hidden');
  section.querySelector('#podcastMicBadge')?.classList.add('hidden');

  setField(section, 'showTitle', '');
  setField(section, 'episodeTitle', '');
  setField(section, 'episodeNumber', '');
  setField(section, 'seasonNumber', '');
  setField(section, 'description', '');
  setField(section, 'category', '');
  setField(section, 'tags', '');
  setField(section, 'language', 'en');
  setField(section, 'visibility', 'public');
  setField(section, 'audioMode', 'upload');
  setField(section, 'podcastKind', 'episode');
  setField(section, 'creatorHandle', localHandle());
  setField(section, 'coverImageCrabUrl', '');
  setField(section, 'suggestedPriceMinor', '0');
  setField(section, 'tipsEnabled', true);

  const status = section.querySelector(`#${PODCAST_PREPARE_STATUS_ID}`);
  if (status) {
    status.className = 'podcast-prepare-status';
    status.textContent = 'No podcast prepare request sent yet.';
  }

  const result = section.querySelector(`#${PODCAST_PREPARE_RESULT_ID}`);
  if (result) {
    result.classList.add('hidden');
    result.textContent = 'No prepare response yet.';
  }

  updatePodcastPreviewState(section);
  updatePodcastManifest(section);
  setFooter('Podcast draft cleared locally.');
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
    showTitle: getField(section, 'showTitle'),
    episodeTitle: getField(section, 'episodeTitle'),
    episodeNumber: getField(section, 'episodeNumber'),
    seasonNumber: getField(section, 'seasonNumber'),
    description: getField(section, 'description'),
    category: getField(section, 'category'),
    tags: getField(section, 'tags'),
    language: getField(section, 'language') || 'en',
    visibility: getField(section, 'visibility') || 'public',
    audioMode: getField(section, 'audioMode') || 'upload',
    podcastKind: getField(section, 'podcastKind') || 'episode',
    creatorHandle: getField(section, 'creatorHandle') || localHandle(),
    coverImageCrabUrl: getField(section, 'coverImageCrabUrl'),
    suggestedPriceMinor: getField(section, 'suggestedPriceMinor') || '0',
    tipsEnabled: Boolean(getField(section, 'tipsEnabled'))
  };
}

function getField(section, name) {
  const field = section.querySelector(`[data-podcast-field="${name}"]`);
  if (!field) return '';

  if (field.type === 'checkbox') {
    return field.checked;
  }

  return clean(field.value || '');
}

function setField(section, name, value) {
  const field = section.querySelector(`[data-podcast-field="${name}"]`);
  if (!field) return;

  if (field.type === 'checkbox') {
    field.checked = Boolean(value);
    return;
  }

  field.value = String(value ?? '');
}

function statChip(label, value) {
  const chip = document.createElement('span');
  chip.className = 'podcast-stat-chip';

  const term = document.createElement('span');
  term.textContent = `${label}:`;

  const body = document.createElement('strong');
  body.textContent = value || '—';

  chip.append(term, body);
  return chip;
}

function isPodcastPage() {
  const url = readCurrentCrabUrl().toLowerCase();
  if (url === 'crab://podcast') return true;

  const payload = readPayload();
  if (!payload) return false;

  return isPodcastPayload(payload);
}

function isPodcastPayload(payload) {
  const schema = clean(payload?.schema || payload?.type);
  const slug = clean(payload?.slug || payload?.page || payload?.kind || payload?.name || payload?.page_kind || '').toLowerCase();
  const title = clean(payload?.title || payload?.metadata?.title || '').toLowerCase();
  const crab = clean(payload?.links?.crab || payload?.crab_url || payload?.url || payload?.route || '').toLowerCase();

  return (
    schema === 'crablink.podcast.local_page.v1' ||
    schema === 'ron.podcast.future_manifest_draft.v1' ||
    (schema === BUILTIN_SCHEMA && (slug === 'podcast' || crab === 'crab://podcast' || title.includes('podcast'))) ||
    crab === 'crab://podcast'
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

function normalizeOptionalNumber(value) {
  const raw = clean(value).replace(/[^\d]/g, '');
  if (!raw) return undefined;
  return Number(raw);
}

function normalizeGatewayUrl(value) {
  const raw = clean(value) || 'http://127.0.0.1:8090';
  return raw.replace(/\/+$/, '');
}

function stableClientIdempotencyKey(seed) {
  const cleanSeed = clean(seed).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  const safeSeed = cleanSeed.slice(0, 48) || 'podcast';
  return `crablink-podcast-prepare-${safeSeed}-${Date.now().toString(36)}`;
}

function createCorrelationId() {
  const random = Math.random().toString(16).slice(2, 10);
  return `crablink-podcast-${Date.now()}-${random}`;
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
    body.${PODCAST_VIEW_CLASS} #${ARTICLE_SECTION_ID},
    body.${PODCAST_VIEW_CLASS} #${VIDEO_SECTION_ID},
    body.${PODCAST_VIEW_CLASS} #${STREAM_SECTION_ID},
    body.${PODCAST_VIEW_CLASS} #${PROFILE_SECTION_ID},
    body.${PODCAST_VIEW_CLASS} #workflowSection,
    body.${PODCAST_VIEW_CLASS} #actionsSection,
    body.${PODCAST_VIEW_CLASS} #fieldsSection,
    body.${PODCAST_VIEW_CLASS} #warningsSection,
    body.${PODCAST_VIEW_CLASS} #sitePageSection,
    body.${PODCAST_VIEW_CLASS} #prepareSummary,
    body.${PODCAST_VIEW_CLASS} #holdSection,
    body.${PODCAST_VIEW_CLASS} #submitSection {
      display: none !important;
    }

    .podcast-draft-section {
      display: grid;
      gap: 16px;
      border-color: rgba(251, 191, 36, 0.30) !important;
      background:
        radial-gradient(circle at top left, rgba(251, 191, 36, 0.14), transparent 42%),
        radial-gradient(circle at top right, rgba(34, 197, 94, 0.10), transparent 38%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(8, 17, 34, 0.95)) !important;
    }

    .podcast-draft-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
    }

    .podcast-draft-eyebrow {
      margin: 0 0 6px;
      color: #fcd34d;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .podcast-draft-head h3 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(32px, 5vw, 56px);
      line-height: 1;
      letter-spacing: -0.075em;
    }

    .podcast-draft-head p:not(.podcast-draft-eyebrow) {
      margin: 8px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .podcast-draft-badge {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 7px 11px;
      border: 1px solid rgba(251, 191, 36, 0.42);
      border-radius: 999px;
      color: #fde68a;
      background: rgba(113, 63, 18, 0.20);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .podcast-draft-notice {
      padding: 14px;
      border: 1px solid rgba(251, 191, 36, 0.26);
      border-radius: 18px;
      color: #fde68a;
      background: rgba(113, 63, 18, 0.14);
      line-height: 1.45;
    }

    .podcast-draft-layout {
      display: grid;
      grid-template-columns: minmax(0, 0.84fr) minmax(0, 1.16fr);
      gap: 16px;
      align-items: start;
    }

    .podcast-draft-form,
    .podcast-preview-panel,
    .podcast-draft-manifest {
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 24px;
      background: rgba(2, 6, 23, 0.30);
    }

    .podcast-draft-form {
      display: grid;
      gap: 12px;
      padding: 16px;
    }

    .podcast-mode-controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 14px;
      border: 1px dashed rgba(251, 191, 36, 0.38);
      border-radius: 20px;
      background: rgba(113, 63, 18, 0.12);
    }

    .podcast-mode-controls button {
      min-height: 42px;
      border-radius: 14px;
      font-size: 12px;
      font-weight: 950;
    }

    .podcast-audio-drop {
      display: grid;
      gap: 8px;
      padding: 16px;
      border: 1px dashed rgba(251, 191, 36, 0.38);
      border-radius: 20px;
      background: rgba(113, 63, 18, 0.12);
      color: #cbd5e1;
    }

    .podcast-audio-drop strong {
      color: #fde68a;
      font-size: 18px;
      letter-spacing: -0.03em;
    }

    .podcast-audio-drop span {
      color: #94a3b8;
      line-height: 1.4;
    }

    .podcast-audio-drop input {
      width: 100%;
      color: #e2e8f0;
    }

    .podcast-field {
      display: grid;
      gap: 7px;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 850;
    }

    .podcast-field span,
    .podcast-checkbox-field span {
      color: #fcd34d;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .podcast-field input,
    .podcast-field textarea,
    .podcast-field select {
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

    .podcast-field textarea {
      resize: vertical;
      min-height: 124px;
      line-height: 1.45;
    }

    .podcast-field input:focus,
    .podcast-field textarea:focus,
    .podcast-field select:focus {
      border-color: rgba(251, 191, 36, 0.60);
      box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12);
    }

    .podcast-checkbox-field {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 11px 12px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.46);
      cursor: pointer;
    }

    .podcast-checkbox-field input {
      width: 18px;
      height: 18px;
    }

    .podcast-two-column {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .podcast-preview-panel {
      display: grid;
      gap: 14px;
      padding: 18px;
    }

    .podcast-preview-head h4 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(26px, 4vw, 44px);
      line-height: 1;
      letter-spacing: -0.075em;
      overflow-wrap: anywhere;
    }

    .podcast-preview-head p:not(.podcast-draft-eyebrow) {
      margin: 8px 0 0;
      color: #fde68a;
      line-height: 1.45;
    }

    .podcast-player-shell {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 260px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 22px;
      background:
        radial-gradient(circle at center, rgba(251, 191, 36, 0.11), transparent 42%),
        #020617;
      overflow: hidden;
      padding: 22px;
    }

    .podcast-player-shell audio {
      width: min(100%, 760px);
    }

    .podcast-preview-empty {
      display: grid;
      place-items: center;
      min-height: 136px;
      width: 100%;
      border: 1px dashed rgba(148, 163, 184, 0.24);
      border-radius: 18px;
      color: #94a3b8;
      background: rgba(15, 23, 42, 0.50);
      font-weight: 900;
      text-align: center;
      padding: 18px;
    }

    .podcast-preview-empty.hidden {
      display: none !important;
    }

    .podcast-mic-badge {
      position: absolute;
      top: 14px;
      right: 14px;
      padding: 7px 10px;
      border: 1px solid rgba(34, 197, 94, 0.35);
      border-radius: 999px;
      color: #bbf7d0;
      background: rgba(22, 101, 52, 0.20);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.08em;
    }

    .podcast-mic-badge.hidden {
      display: none !important;
    }

    .podcast-draft-stats,
    .podcast-preview-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .podcast-stat-chip,
    .podcast-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 28px;
      padding: 6px 9px;
      border: 1px solid rgba(251, 191, 36, 0.28);
      border-radius: 999px;
      color: #fde68a;
      background: rgba(113, 63, 18, 0.18);
      font-size: 12px;
      font-weight: 850;
      max-width: 100%;
      overflow-wrap: anywhere;
    }

    .podcast-stat-chip span {
      color: #fcd34d;
      font-weight: 950;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .podcast-tag.empty {
      border-color: rgba(148, 163, 184, 0.20);
      color: #94a3b8;
      background: rgba(15, 23, 42, 0.42);
    }

    .podcast-draft-manifest {
      overflow: hidden;
    }

    .podcast-draft-manifest summary {
      cursor: pointer;
      padding: 14px 16px;
      color: #f8fafc;
      font-weight: 950;
    }

    .podcast-draft-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      padding: 0 16px 14px;
    }

    .podcast-draft-actions button {
      min-height: 34px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 950;
    }

    .podcast-prepare-status {
      margin: 0 16px 12px;
      padding: 12px 13px;
      border: 1px solid rgba(148, 163, 184, 0.20);
      border-radius: 14px;
      color: #cbd5e1;
      background: rgba(15, 23, 42, 0.48);
      line-height: 1.4;
    }

    .podcast-prepare-status.pending {
      border-color: rgba(251, 191, 36, 0.40);
      color: #fde68a;
      background: rgba(113, 63, 18, 0.18);
    }

    .podcast-prepare-status.ok {
      border-color: rgba(34, 197, 94, 0.34);
      color: #bbf7d0;
      background: rgba(22, 101, 52, 0.18);
    }

    .podcast-prepare-status.error {
      border-color: rgba(248, 113, 113, 0.34);
      color: #fecaca;
      background: rgba(127, 29, 29, 0.20);
    }

    .podcast-manifest-preview,
    .podcast-prepare-result {
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

    .podcast-prepare-result.hidden {
      display: none !important;
    }

    .podcast-prepare-result {
      border-top-color: rgba(251, 191, 36, 0.24);
    }

    @media (max-width: 980px) {
      .podcast-draft-layout,
      .podcast-two-column,
      .podcast-mode-controls {
        grid-template-columns: 1fr;
      }

      .podcast-draft-head {
        flex-direction: column;
      }

      .podcast-draft-actions {
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