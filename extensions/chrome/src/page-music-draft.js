/**
 * RO:WHAT — Adds an honest local music/song creator workspace to crab://music.
 * RO:WHY — NEXT_LEVEL music primitive foundation; Concerns: DX/SEC; prove song/audio UX without pretending backend publishing exists.
 * RO:INTERACTS — page.html, page.js shell, chrome.storage.local, future svc-gateway /assets/music/prepare route.
 * RO:INVARIANTS — local draft first; gateway-only prepare attempt; no fake b3 CID; no fake song upload; no wallet mutation; no silent ROC spending.
 * RO:TRUTH — No b3 CID, No ROC charge, No wallet mutation, and no backend publication claim from local drafts.
 * RO:METRICS — client correlation IDs are generated for prepare attempts.
 * RO:CONFIG — stores crablinkMusicDraftV1 metadata only; selected local audio file bytes are not persisted.
 * RO:SECURITY — textContent/createElement only; no private keys; no direct internal service calls; no executable lyrics/body.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://music.
 */

const STYLE_ID = 'crablinkMusicDraftStyles';
const MUSIC_SECTION_ID = 'musicDraftSection';
const ARTICLE_SECTION_ID = 'articleDraftSection';
const VIDEO_SECTION_ID = 'videoDraftSection';
const STREAM_SECTION_ID = 'streamDraftSection';
const PODCAST_SECTION_ID = 'podcastDraftSection';
const PROFILE_SECTION_ID = 'profileHomeSection';
const MUSIC_PREPARE_STATUS_ID = 'musicGatewayPrepareStatus';
const MUSIC_PREPARE_RESULT_ID = 'musicGatewayPrepareResult';
const DRAFT_KEY = 'crablinkMusicDraftV1';
const BUILTIN_SCHEMA = 'omnigate.builtin-page.v1';
const MUSIC_VIEW_CLASS = 'crablink-music-draft-view-mode';
const ARTICLE_VIEW_CLASS = 'crablink-article-draft-view-mode';
const VIDEO_VIEW_CLASS = 'crablink-video-draft-view-mode';
const STREAM_VIEW_CLASS = 'crablink-stream-draft-view-mode';
const PODCAST_VIEW_CLASS = 'crablink-podcast-draft-view-mode';
const PROFILE_VIEW_CLASS = 'crablink-profile-view-mode';
const FUTURE_MUSIC_PREPARE_ROUTE = '/assets/music/prepare';

const DEFAULT_DRAFT = {
  schema: 'crablink.music-draft.local.v1',
  trackTitle: '',
  artistName: '',
  albumTitle: '',
  description: '',
  genre: '',
  tags: '',
  language: 'en',
  license: 'all-rights-reserved',
  creatorHandle: '',
  coverImageCrabUrl: '',
  suggestedPriceMinor: '0',
  lyrics: '',
  updatedAt: ''
};

let renderTimer = 0;
let saveTimer = 0;
let lastRouteSignature = '';
let selectedAudioFile = null;
let selectedAudioObjectUrl = '';
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

  window.addEventListener('beforeunload', revokeSelectedAudioObjectUrl);
}

function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    renderMusicDraftWorkspace().catch((error) => {
      setFooter(`Music draft skipped: ${error?.message || error}`);
    });
  }, 90);
}

async function renderMusicDraftWorkspace() {
  if (!isMusicPage()) {
    lastRouteSignature = '';
    lastPrepareResponse = null;
    revokeSelectedAudioObjectUrl();
    document.body?.classList.remove(MUSIC_VIEW_CLASS);
    document.getElementById(MUSIC_SECTION_ID)?.remove();
    return;
  }

  const pagePanel = document.getElementById('pagePanel');
  if (!pagePanel || pagePanel.classList.contains('hidden')) return;

  enforceMusicOnlyLayout();
  updateHeroForMusic();

  const routeSignature = routeFingerprint();

  let section = document.getElementById(MUSIC_SECTION_ID);
  if (!section) {
    section = buildMusicSection();
    const developerDetails = document.getElementById('developerDetails');

    if (developerDetails && developerDetails.parentElement === pagePanel) {
      pagePanel.insertBefore(section, developerDetails);
    } else {
      pagePanel.append(section);
    }
  }

  if (routeSignature !== lastRouteSignature) {
    lastRouteSignature = routeSignature;
    await loadDraftIntoForm(section);
  }

  updateMusicStats(section);
  updateMusicPreview(section);
  updateMusicManifest(section);
}

function enforceMusicOnlyLayout() {
  document.body?.classList.add(MUSIC_VIEW_CLASS);
  document.body?.classList.remove(ARTICLE_VIEW_CLASS);
  document.body?.classList.remove(VIDEO_VIEW_CLASS);
  document.body?.classList.remove(STREAM_VIEW_CLASS);
  document.body?.classList.remove(PODCAST_VIEW_CLASS);
  document.body?.classList.remove(PROFILE_VIEW_CLASS);
  document.body?.classList.remove('crablink-site-full-view-mode');
  document.body?.setAttribute('data-crablink-creator-route', 'music');
  document.body?.setAttribute('data-crablink-active-route-kind', 'creator');

  for (const id of [
    ARTICLE_SECTION_ID,
    VIDEO_SECTION_ID,
    STREAM_SECTION_ID,
    PODCAST_SECTION_ID,
    PROFILE_SECTION_ID
  ]) {
    const node = document.getElementById(id);
    if (node) {
      node.classList.add('hidden');
      node.setAttribute('aria-hidden', 'true');
    }
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
    if (el) {
      el.classList.add('hidden');
      el.setAttribute('aria-hidden', 'true');
    }
  }
}

function updateHeroForMusic() {
  setText(document.getElementById('pageBadge'), 'local studio');
  setText(document.getElementById('pageTitle'), 'RON Music Studio');
  setText(
    document.getElementById('pageDescription'),
    'Draft a song/music asset, preview local audio, and generate a future manifest. Publishing is not wired yet.'
  );

  const facts = document.getElementById('pageFacts');
  if (!facts) return;

  facts.textContent = '';
  facts.append(
    factTile('Crab URL', 'crab://music'),
    factTile('Page kind', 'music'),
    factTile('Status', 'local draft'),
    factTile('Backend route', FUTURE_MUSIC_PREPARE_ROUTE),
    factTile('ROC charge', 'none on page load'),
    factTile('b3 CID', 'not assigned locally')
  );
}

function buildMusicSection() {
  const section = document.createElement('section');
  section.id = MUSIC_SECTION_ID;
  section.className = 'music-draft-section content-section';

  const head = document.createElement('div');
  head.className = 'music-draft-head';

  const copy = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'music-draft-eyebrow';
  eyebrow.textContent = 'NEXT_LEVEL music asset foundation';

  const title = document.createElement('h3');
  title.textContent = 'Song / Music Draft';

  const description = document.createElement('p');
  description.textContent =
    'Build a local song draft, preview a selected audio file, and prepare future .music/.song manifest data without claiming publication.';

  copy.append(eyebrow, title, description);

  const badge = document.createElement('span');
  badge.className = 'music-draft-badge';
  badge.textContent = 'draft / prepare';

  head.append(copy, badge);

  const notice = document.createElement('div');
  notice.className = 'music-draft-notice';
  notice.textContent =
    'Truth boundary: this page does not upload audio, does not create a b3 CID, does not create a manifest CID, does not charge ROC, and does not claim backend music publication. “Send Prepare Request” is a non-mutating gateway preflight attempt only.';

  const layout = document.createElement('div');
  layout.className = 'music-draft-layout';

  const form = buildMusicForm();
  const preview = buildMusicPreview();

  layout.append(form, preview);

  const manifestPanel = document.createElement('details');
  manifestPanel.className = 'music-draft-manifest';
  manifestPanel.open = true;

  const summary = document.createElement('summary');
  summary.textContent = 'Future music manifest draft';

  const manifestActions = document.createElement('div');
  manifestActions.className = 'music-draft-actions';

  manifestActions.append(
    actionButton('Send Prepare Request', 'send-prepare'),
    actionButton('Copy Manifest JSON', 'copy-manifest', true),
    actionButton('Copy Metadata JSON', 'copy-metadata', true),
    actionButton('Save Local Draft', 'save', true),
    actionButton('Clear Draft', 'clear', true)
  );

  const prepareStatus = document.createElement('div');
  prepareStatus.id = MUSIC_PREPARE_STATUS_ID;
  prepareStatus.className = 'music-prepare-status';
  prepareStatus.textContent = 'No music prepare request sent yet.';

  const manifest = document.createElement('pre');
  manifest.id = 'musicManifestPreview';
  manifest.className = 'music-manifest-preview';
  manifest.textContent = '{}';

  const prepareResult = document.createElement('pre');
  prepareResult.id = MUSIC_PREPARE_RESULT_ID;
  prepareResult.className = 'music-prepare-result hidden';
  prepareResult.textContent = 'No prepare response yet.';

  manifestPanel.append(summary, manifestActions, prepareStatus, manifest, prepareResult);
  section.append(head, notice, layout, manifestPanel);

  section.addEventListener('input', (event) => {
    if (!event.target?.closest?.('[data-music-field]')) return;

    updateMusicStats(section);
    updateMusicPreview(section);
    updateMusicManifest(section);
    scheduleAutoSave(section);
  });

  section.addEventListener('change', (event) => {
    if (event.target?.id === 'musicAudioFile') {
      handleAudioFileSelection(event.target.files?.[0] || null, section);
      return;
    }

    if (!event.target?.closest?.('[data-music-field]')) return;

    updateMusicStats(section);
    updateMusicPreview(section);
    updateMusicManifest(section);
    scheduleAutoSave(section);
  });

  section.addEventListener('click', (event) => {
    const action = event.target?.closest?.('[data-music-action]')?.getAttribute('data-music-action');
    if (!action) return;

    event.preventDefault();

    if (action === 'send-prepare') {
      void sendMusicPrepare(section);
      return;
    }

    if (action === 'copy-manifest') {
      void copyTextValue(JSON.stringify(buildFutureManifest(section), null, 2), 'Music manifest draft copied.');
      return;
    }

    if (action === 'copy-metadata') {
      void copyTextValue(JSON.stringify(buildMusicMetadata(section), null, 2), 'Music metadata copied.');
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

function buildMusicForm() {
  const form = document.createElement('form');
  form.className = 'music-draft-form';

  const fileBlock = document.createElement('label');
  fileBlock.className = 'music-field music-file-field';

  const fileLabel = document.createElement('span');
  fileLabel.textContent = 'Local audio preview file';

  const fileInput = document.createElement('input');
  fileInput.id = 'musicAudioFile';
  fileInput.type = 'file';
  fileInput.accept = 'audio/*';

  const fileHelp = document.createElement('small');
  fileHelp.textContent =
    'Local preview only. The selected audio file is not uploaded or stored by CrabLink from this draft page.';

  fileBlock.append(fileLabel, fileInput, fileHelp);

  form.append(
    fileBlock,
    twoColumn(
      fieldBlock({
        label: 'Track title',
        field: inputField('musicTrackTitle', 'trackTitle', 'Rusty Onion Blues')
      }),
      fieldBlock({
        label: 'Artist name',
        field: inputField('musicArtistName', 'artistName', '@skinnycrabby')
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Album / collection',
        field: inputField('musicAlbumTitle', 'albumTitle', 'CrabLink Sessions')
      }),
      fieldBlock({
        label: 'Genre',
        field: inputField('musicGenre', 'genre', 'indie / electronic / folk')
      })
    ),
    fieldBlock({
      label: 'Description',
      field: textareaField('musicDescription', 'description', 'Short description for the future asset page.', 3)
    }),
    twoColumn(
      fieldBlock({
        label: 'Tags',
        field: inputField('musicTags', 'tags', 'music, song, crablink')
      }),
      fieldBlock({
        label: 'Language',
        field: inputField('musicLanguage', 'language', 'en')
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'License',
        field: selectField('musicLicense', 'license', [
          ['all-rights-reserved', 'All rights reserved'],
          ['cc-by', 'CC BY'],
          ['cc-by-sa', 'CC BY-SA'],
          ['public-domain', 'Public domain / CC0']
        ])
      }),
      fieldBlock({
        label: 'Suggested price',
        field: inputField('musicSuggestedPriceMinor', 'suggestedPriceMinor', '0')
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Creator handle',
        field: inputField('musicCreatorHandle', 'creatorHandle', '@skinnycrabby')
      }),
      fieldBlock({
        label: 'Cover image crab URL',
        field: inputField('musicCoverImageCrabUrl', 'coverImageCrabUrl', 'crab://<64hex>.image')
      })
    ),
    fieldBlock({
      label: 'Lyrics / notes',
      field: textareaField('musicLyrics', 'lyrics', 'Optional lyrics, credits, or production notes.', 8)
    })
  );

  return form;
}

function buildMusicPreview() {
  const panel = document.createElement('article');
  panel.className = 'music-preview-panel';

  const head = document.createElement('div');
  head.className = 'music-preview-head';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'music-draft-eyebrow';
  eyebrow.textContent = 'Safe local preview';

  const title = document.createElement('h4');
  title.id = 'musicPreviewTitle';
  title.textContent = 'Untitled track';

  const subtitle = document.createElement('p');
  subtitle.id = 'musicPreviewSubtitle';
  subtitle.textContent = 'Artist preview will appear here.';

  head.append(eyebrow, title, subtitle);

  const audioWrap = document.createElement('div');
  audioWrap.className = 'music-audio-preview';

  const audio = document.createElement('audio');
  audio.id = 'musicAudioPreview';
  audio.controls = true;
  audio.className = 'hidden';

  const empty = document.createElement('p');
  empty.id = 'musicAudioEmpty';
  empty.textContent = 'Choose a local audio file to preview it here. No upload happens.';

  audioWrap.append(audio, empty);

  const stats = document.createElement('div');
  stats.id = 'musicDraftStats';
  stats.className = 'music-draft-stats';

  const tags = document.createElement('div');
  tags.id = 'musicPreviewTags';
  tags.className = 'music-preview-tags';

  const lyrics = document.createElement('div');
  lyrics.id = 'musicPreviewLyrics';
  lyrics.className = 'music-preview-lyrics';
  lyrics.textContent = 'Lyrics or notes preview will appear here.';

  panel.append(head, audioWrap, stats, tags, lyrics);
  return panel;
}

function handleAudioFileSelection(file, section) {
  revokeSelectedAudioObjectUrl();
  selectedAudioFile = file || null;

  const audio = section.querySelector('#musicAudioPreview');
  const empty = section.querySelector('#musicAudioEmpty');

  if (!selectedAudioFile || !audio || !empty) {
    if (audio) {
      audio.removeAttribute('src');
      audio.classList.add('hidden');
    }
    if (empty) empty.classList.remove('hidden');
    updateMusicStats(section);
    updateMusicManifest(section);
    return;
  }

  selectedAudioObjectUrl = URL.createObjectURL(selectedAudioFile);
  audio.src = selectedAudioObjectUrl;
  audio.classList.remove('hidden');
  empty.classList.add('hidden');

  updateMusicStats(section);
  updateMusicManifest(section);
  setFooter(`Loaded local audio preview: ${selectedAudioFile.name}. No upload occurred.`);
}

function fieldBlock({ label, field }) {
  const block = document.createElement('label');
  block.className = 'music-field';

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
  input.dataset.musicField = name;
  return input;
}

function textareaField(id, name, placeholder, rows) {
  const textarea = document.createElement('textarea');
  textarea.id = id;
  textarea.placeholder = placeholder;
  textarea.rows = rows;
  textarea.dataset.musicField = name;
  return textarea;
}

function selectField(id, name, options) {
  const select = document.createElement('select');
  select.id = id;
  select.dataset.musicField = name;

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
  row.className = 'music-two-column';
  row.append(left, right);
  return row;
}

function actionButton(label, action, secondary = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('data-music-action', action);
  if (secondary) button.className = 'secondary';
  return button;
}

async function loadDraftIntoForm(section) {
  const draft = await getDraft();
  const merged = { ...DEFAULT_DRAFT, ...draft };

  setField(section, 'trackTitle', merged.trackTitle);
  setField(section, 'artistName', merged.artistName || localHandle());
  setField(section, 'albumTitle', merged.albumTitle);
  setField(section, 'description', merged.description);
  setField(section, 'genre', merged.genre);
  setField(section, 'tags', merged.tags);
  setField(section, 'language', merged.language || 'en');
  setField(section, 'license', merged.license || 'all-rights-reserved');
  setField(section, 'creatorHandle', merged.creatorHandle || localHandle());
  setField(section, 'coverImageCrabUrl', merged.coverImageCrabUrl);
  setField(section, 'suggestedPriceMinor', merged.suggestedPriceMinor || '0');
  setField(section, 'lyrics', merged.lyrics);
}

function updateMusicStats(section) {
  const stats = section.querySelector('#musicDraftStats');
  if (!stats) return;

  const draft = readDraftFromForm(section);
  const tagCount = parseTags(draft.tags).length;
  const lyricsWords = wordCount(draft.lyrics);
  const lyricsBytes = textByteLength(draft.lyrics || '');
  const audioSize = selectedAudioFile ? selectedAudioFile.size : 0;

  replaceChildren(
    stats,
    statChip('Audio file', selectedAudioFile ? selectedAudioFile.name : 'none'),
    statChip('Audio bytes', audioSize ? String(audioSize) : '0'),
    statChip('Lyrics words', String(lyricsWords)),
    statChip('Lyrics bytes', String(lyricsBytes)),
    statChip('Tags', String(tagCount)),
    statChip('Publish status', 'not wired')
  );
}

function updateMusicPreview(section) {
  const draft = readDraftFromForm(section);

  setText(section.querySelector('#musicPreviewTitle'), draft.trackTitle || 'Untitled track');
  setText(
    section.querySelector('#musicPreviewSubtitle'),
    [draft.artistName || draft.creatorHandle || localHandle(), draft.albumTitle, draft.genre]
      .filter(Boolean)
      .join(' • ') || 'Artist preview will appear here.'
  );

  const tags = section.querySelector('#musicPreviewTags');
  if (tags) {
    tags.textContent = '';
    const parsedTags = parseTags(draft.tags);

    if (parsedTags.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'music-tag empty';
      empty.textContent = 'no tags';
      tags.append(empty);
    } else {
      for (const tag of parsedTags) {
        const chip = document.createElement('span');
        chip.className = 'music-tag';
        chip.textContent = `#${tag}`;
        tags.append(chip);
      }
    }
  }

  const lyrics = section.querySelector('#musicPreviewLyrics');
  if (lyrics) {
    lyrics.textContent = draft.lyrics || draft.description || 'Lyrics or notes preview will appear here.';
  }
}

function updateMusicManifest(section) {
  const pre = section.querySelector('#musicManifestPreview');
  if (!pre) return;

  pre.textContent = JSON.stringify(buildFutureManifest(section), null, 2);
}

function buildFutureManifest(section) {
  const metadata = buildMusicMetadata(section);
  const now = new Date().toISOString();

  return {
    schema: 'ron.music.future_manifest_draft.v1',
    status: 'local_draft_not_published',
    truth_boundary: {
      backend_music_routes_wired: false,
      audio_uploaded: false,
      b3_content_id_assigned: false,
      manifest_cid_assigned: false,
      roc_charged: false,
      wallet_mutated: false,
      index_pointer_created: false
    },
    intended_asset: {
      kind: 'music',
      alternate_kind: 'song',
      future_crab_url_shape: 'crab://<64 lowercase hex>.music or crab://<64 lowercase hex>.song',
      canonical_content_id_pending: true,
      selected_local_audio_file: selectedAudioFile
        ? {
            name: selectedAudioFile.name,
            type: selectedAudioFile.type,
            size_bytes: selectedAudioFile.size,
            last_modified: selectedAudioFile.lastModified || null
          }
        : null
    },
    creator: {
      handle_display: metadata.creator_handle_display,
      passport_subject_display: localPassportSubject(),
      wallet_account_display: localWalletAccount(),
      backend_confirmed: false
    },
    metadata,
    next_required_backend_work: [
      'ron-proto music/song DTOs',
      'ron-naming .music/.song parser support',
      'omnigate music prepare/create/read route contracts',
      'svc-gateway proxy routes',
      'paid storage admission reuse for audio bytes',
      'index pointer for crab://<hash>.music and crab://<hash>.song',
      'asset-page hydration for music/song kind',
      'paid play/view accounting policy'
    ],
    last_prepare_attempt: lastPrepareResponse,
    updated_at: now
  };
}

function buildMusicMetadata(section) {
  const draft = readDraftFromForm(section);

  return {
    title: draft.trackTitle,
    artist_name: draft.artistName,
    album_title: draft.albumTitle,
    description: draft.description,
    genre: draft.genre,
    tags: parseTags(draft.tags),
    language: draft.language || 'en',
    license: draft.license || 'all-rights-reserved',
    creator_handle_display: draft.creatorHandle || localHandle(),
    cover_image_crab_url: draft.coverImageCrabUrl,
    suggested_price_minor_units: normalizeIntegerString(draft.suggestedPriceMinor),
    lyrics_or_notes: draft.lyrics
  };
}

function buildMusicPrepareRequest(section) {
  const metadata = buildMusicMetadata(section);

  return stripUndefined({
    schema: 'crablink.music-prepare-request.v1',
    kind: 'music',
    alternate_kind: 'song',
    title: metadata.title || undefined,
    artist_name: metadata.artist_name || undefined,
    album_title: metadata.album_title || undefined,
    description: metadata.description || undefined,
    genre: metadata.genre || undefined,
    tags: metadata.tags,
    language: metadata.language,
    license: metadata.license,
    cover_image_crab_url: metadata.cover_image_crab_url || undefined,
    suggested_price_minor_units: metadata.suggested_price_minor_units,
    selected_audio_file: selectedAudioFile
      ? {
          name: selectedAudioFile.name,
          type: selectedAudioFile.type,
          size_bytes: selectedAudioFile.size,
          last_modified: selectedAudioFile.lastModified || null
        }
      : undefined,
    payer_account: localWalletAccount(),
    owner_passport_subject: localPassportSubject(),
    creator_handle_display: metadata.creator_handle_display,
    client_idempotency_key: stableClientIdempotencyKey(metadata.title || metadata.artist_name || 'music')
  });
}

async function sendMusicPrepare(section) {
  await saveDraftToStorage(section, { announce: false });

  const status = section.querySelector(`#${MUSIC_PREPARE_STATUS_ID}`);
  const result = section.querySelector(`#${MUSIC_PREPARE_RESULT_ID}`);
  const actionButtonEl = section.querySelector('[data-music-action="send-prepare"]');

  if (status) {
    status.className = 'music-prepare-status pending';
    status.textContent = `Sending non-mutating prepare request to ${FUTURE_MUSIC_PREPARE_ROUTE}…`;
  }

  if (result) {
    result.classList.remove('hidden');
    result.textContent = 'Waiting for gateway response…';
  }

  if (actionButtonEl) actionButtonEl.disabled = true;

  try {
    const settings = await getGatewaySettings();
    const gateway = normalizeGatewayUrl(settings.gatewayUrl || 'http://127.0.0.1:8090');
    const requestBody = buildMusicPrepareRequest(section);
    const requestCorrelationId = createCorrelationId();

    const response = await fetch(`${gateway}${FUTURE_MUSIC_PREPARE_ROUTE}`, {
      method: 'POST',
      headers: stripUndefined({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: settings.authToken ? `Bearer ${settings.authToken}` : undefined,
        'Idempotency-Key': requestBody.client_idempotency_key,
        'x-ron-passport': settings.passportSubject || localPassportSubject(),
        'x-ron-wallet-account': settings.walletAccount || localWalletAccount(),
        'x-correlation-id': requestCorrelationId,
        'x-crablink-client': 'chrome-extension-music-draft'
      }),
      body: JSON.stringify(requestBody)
    });

    const text = await response.text();
    const parsed = parseJsonMaybe(text);
    const payload = {
      schema: 'crablink.music-prepare-attempt.v1',
      ok: response.ok,
      status: response.status,
      status_text: response.statusText,
      route: FUTURE_MUSIC_PREPARE_ROUTE,
      correlation_id: requestCorrelationId,
      truth_boundary: response.ok
        ? 'Gateway returned a response. This is still prepare/preflight, not music publication.'
        : 'Gateway did not accept the future music prepare route. No audio was uploaded, no b3 CID was assigned, and no ROC was charged.',
      response: parsed ?? text
    };

    lastPrepareResponse = payload;
    updateMusicManifest(section);

    if (status) {
      status.className = response.ok ? 'music-prepare-status ok' : 'music-prepare-status error';
      status.textContent = response.ok
        ? 'Music prepare response received. This is still not a published song.'
        : `Music prepare failed with HTTP ${response.status}. Backend music routes may not be wired yet.`;
    }

    if (result) result.textContent = JSON.stringify(payload, null, 2);

    setFooter(
      response.ok
        ? 'Music prepare response received.'
        : `Music prepare failed with HTTP ${response.status}; no publication occurred.`
    );
  } catch (error) {
    const payload = {
      schema: 'crablink.music-prepare-attempt.v1',
      ok: false,
      route: FUTURE_MUSIC_PREPARE_ROUTE,
      error: String(error?.message || error),
      truth_boundary: 'No music was published, no b3 CID was assigned, and no ROC was charged.'
    };

    lastPrepareResponse = payload;
    updateMusicManifest(section);

    if (status) {
      status.className = 'music-prepare-status error';
      status.textContent = `Music prepare failed: ${payload.error}`;
    }

    if (result) {
      result.classList.remove('hidden');
      result.textContent = JSON.stringify(payload, null, 2);
    }

    setFooter('Music prepare failed; no publication occurred.');
  } finally {
    if (actionButtonEl) actionButtonEl.disabled = false;
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

  if (announce) setFooter('Music draft saved locally.');
}

async function clearDraft(section) {
  lastPrepareResponse = null;
  selectedAudioFile = null;
  revokeSelectedAudioObjectUrl();

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [DRAFT_KEY]: { ...DEFAULT_DRAFT, updatedAt: new Date().toISOString() } });
  }

  setField(section, 'trackTitle', '');
  setField(section, 'artistName', localHandle());
  setField(section, 'albumTitle', '');
  setField(section, 'description', '');
  setField(section, 'genre', '');
  setField(section, 'tags', '');
  setField(section, 'language', 'en');
  setField(section, 'license', 'all-rights-reserved');
  setField(section, 'creatorHandle', localHandle());
  setField(section, 'coverImageCrabUrl', '');
  setField(section, 'suggestedPriceMinor', '0');
  setField(section, 'lyrics', '');

  const file = section.querySelector('#musicAudioFile');
  if (file) file.value = '';

  const audio = section.querySelector('#musicAudioPreview');
  if (audio) {
    audio.removeAttribute('src');
    audio.classList.add('hidden');
  }

  const empty = section.querySelector('#musicAudioEmpty');
  if (empty) empty.classList.remove('hidden');

  const status = section.querySelector(`#${MUSIC_PREPARE_STATUS_ID}`);
  if (status) {
    status.className = 'music-prepare-status';
    status.textContent = 'No music prepare request sent yet.';
  }

  const result = section.querySelector(`#${MUSIC_PREPARE_RESULT_ID}`);
  if (result) {
    result.classList.add('hidden');
    result.textContent = 'No prepare response yet.';
  }

  updateMusicStats(section);
  updateMusicPreview(section);
  updateMusicManifest(section);
  setFooter('Music draft cleared locally.');
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
    trackTitle: getField(section, 'trackTitle'),
    artistName: getField(section, 'artistName'),
    albumTitle: getField(section, 'albumTitle'),
    description: getField(section, 'description'),
    genre: getField(section, 'genre'),
    tags: getField(section, 'tags'),
    language: getField(section, 'language') || 'en',
    license: getField(section, 'license') || 'all-rights-reserved',
    creatorHandle: getField(section, 'creatorHandle') || localHandle(),
    coverImageCrabUrl: getField(section, 'coverImageCrabUrl'),
    suggestedPriceMinor: getField(section, 'suggestedPriceMinor') || '0',
    lyrics: getField(section, 'lyrics')
  };
}

function getField(section, name) {
  return clean(section.querySelector(`[data-music-field="${name}"]`)?.value || '');
}

function setField(section, name, value) {
  const field = section.querySelector(`[data-music-field="${name}"]`);
  if (field) field.value = String(value ?? '');
}

function statChip(label, value) {
  const chip = document.createElement('span');
  chip.className = 'music-stat-chip';

  const term = document.createElement('span');
  term.textContent = `${label}:`;

  const body = document.createElement('strong');
  body.textContent = value || '—';

  chip.append(term, body);
  return chip;
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

function readCurrentCrabUrl() {
  const addressValue = clean(document.getElementById('addressInput')?.value || '');
  if (addressValue) return addressValue;

  try {
    const params = new URLSearchParams(window.location.search);
    return clean(params.get('url') || params.get('crab') || '');
  } catch {
    return '';
  }
}

function isMusicPage() {
  const url = readCurrentCrabUrl().toLowerCase();

  if (url.startsWith('crab://')) {
    return url === 'crab://music';
  }

  const payload = readPayload();
  if (!payload) return false;

  const schema = clean(payload.schema || payload.type);
  const slug = clean(payload.slug || payload.page || payload.kind || payload.name || payload.page_kind || '').toLowerCase();
  const title = clean(payload.title || payload.metadata?.title || '').toLowerCase();
  const crab = clean(payload.links?.crab || payload.crab_url || payload.url || '').toLowerCase();

  return schema === BUILTIN_SCHEMA && (slug === 'music' || crab === 'crab://music' || title.includes('music'));
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

function wordCount(value) {
  const text = clean(value);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function textByteLength(value) {
  try {
    return new TextEncoder().encode(String(value ?? '')).length;
  } catch {
    return String(value ?? '').length;
  }
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

function normalizeGatewayUrl(value) {
  const raw = clean(value) || 'http://127.0.0.1:8090';
  return raw.replace(/\/+$/, '');
}

function normalizeIntegerString(value) {
  const raw = clean(value);
  if (!raw) return '0';

  const number = Number(raw);
  if (!Number.isFinite(number) || number < 0) return '0';

  return String(Math.floor(number));
}

function stableClientIdempotencyKey(seed) {
  const cleanSeed = clean(seed).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  const safeSeed = cleanSeed.slice(0, 48) || 'music';
  return `crablink-music-prepare-${safeSeed}-${Date.now().toString(36)}`;
}

function createCorrelationId() {
  const random = Math.random().toString(16).slice(2, 10);
  return `crablink-music-${Date.now()}-${random}`;
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

function revokeSelectedAudioObjectUrl() {
  if (!selectedAudioObjectUrl) return;

  try {
    URL.revokeObjectURL(selectedAudioObjectUrl);
  } catch {
    // Best-effort cleanup only.
  }

  selectedAudioObjectUrl = '';
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
    body.${MUSIC_VIEW_CLASS} #profileHomeSection,
    body.${MUSIC_VIEW_CLASS} #articleDraftSection,
    body.${MUSIC_VIEW_CLASS} #videoDraftSection,
    body.${MUSIC_VIEW_CLASS} #streamDraftSection,
    body.${MUSIC_VIEW_CLASS} #podcastDraftSection,
    body.${MUSIC_VIEW_CLASS} #workflowSection,
    body.${MUSIC_VIEW_CLASS} #actionsSection,
    body.${MUSIC_VIEW_CLASS} #fieldsSection,
    body.${MUSIC_VIEW_CLASS} #warningsSection,
    body.${MUSIC_VIEW_CLASS} #sitePageSection,
    body.${MUSIC_VIEW_CLASS} #prepareSummary,
    body.${MUSIC_VIEW_CLASS} #holdSection,
    body.${MUSIC_VIEW_CLASS} #submitSection {
      display: none !important;
    }

    .music-draft-section {
      display: grid;
      gap: 16px;
      border-color: rgba(96, 165, 250, 0.26) !important;
      background:
        radial-gradient(circle at top left, rgba(96, 165, 250, 0.12), transparent 42%),
        radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.10), transparent 36%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(8, 17, 34, 0.92)) !important;
    }

    .music-draft-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
    }

    .music-draft-eyebrow {
      margin: 0 0 6px;
      color: #bfdbfe;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .music-draft-head h3 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(28px, 4vw, 44px);
      line-height: 1;
      letter-spacing: -0.065em;
    }

    .music-draft-head p:not(.music-draft-eyebrow) {
      margin: 8px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .music-draft-badge {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 7px 11px;
      border: 1px solid rgba(96, 165, 250, 0.35);
      border-radius: 999px;
      color: #bfdbfe;
      background: rgba(30, 64, 175, 0.18);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .music-draft-notice {
      padding: 14px;
      border: 1px solid rgba(251, 191, 36, 0.24);
      border-radius: 18px;
      color: #fde68a;
      background: rgba(113, 63, 18, 0.14);
      line-height: 1.45;
    }

    .music-draft-layout {
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
      gap: 16px;
      align-items: start;
    }

    .music-draft-form,
    .music-preview-panel,
    .music-draft-manifest {
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 24px;
      background: rgba(2, 6, 23, 0.28);
    }

    .music-draft-form {
      display: grid;
      gap: 12px;
      padding: 16px;
    }

    .music-field {
      display: grid;
      gap: 7px;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 850;
    }

    .music-field span {
      color: #bfdbfe;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .music-field small {
      color: #94a3b8;
      line-height: 1.4;
    }

    .music-field input,
    .music-field textarea,
    .music-field select {
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

    .music-field input[type="file"] {
      color: #cbd5e1;
    }

    .music-field textarea {
      resize: vertical;
      min-height: 92px;
      line-height: 1.45;
    }

    .music-field input:focus,
    .music-field textarea:focus,
    .music-field select:focus {
      border-color: rgba(96, 165, 250, 0.54);
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.12);
    }

    .music-two-column {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .music-preview-panel {
      display: grid;
      gap: 14px;
      padding: 18px;
    }

    .music-preview-head h4 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(26px, 4vw, 42px);
      line-height: 1;
      letter-spacing: -0.07em;
      overflow-wrap: anywhere;
    }

    .music-preview-head p:not(.music-draft-eyebrow) {
      margin: 8px 0 0;
      color: #bfdbfe;
      line-height: 1.45;
    }

    .music-audio-preview {
      display: grid;
      gap: 10px;
      padding: 16px;
      border: 1px solid rgba(96, 165, 250, 0.18);
      border-radius: 18px;
      background:
        radial-gradient(circle at top left, rgba(96, 165, 250, 0.12), transparent 50%),
        rgba(15, 23, 42, 0.48);
    }

    .music-audio-preview audio {
      width: 100%;
    }

    .music-audio-preview p {
      margin: 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .music-draft-stats,
    .music-preview-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .music-stat-chip,
    .music-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 28px;
      padding: 6px 9px;
      border: 1px solid rgba(96, 165, 250, 0.22);
      border-radius: 999px;
      color: #bfdbfe;
      background: rgba(30, 64, 175, 0.16);
      font-size: 12px;
      font-weight: 850;
      max-width: 100%;
      overflow-wrap: anywhere;
    }

    .music-stat-chip span {
      color: #93c5fd;
      font-weight: 950;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .music-stat-chip strong {
      overflow-wrap: anywhere;
    }

    .music-tag.empty {
      border-color: rgba(148, 163, 184, 0.20);
      color: #94a3b8;
      background: rgba(15, 23, 42, 0.42);
    }

    .music-preview-lyrics {
      min-height: 160px;
      padding: 16px;
      border: 1px solid rgba(148, 163, 184, 0.14);
      border-radius: 18px;
      color: #e5edff;
      background: rgba(15, 23, 42, 0.48);
      line-height: 1.62;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .music-draft-manifest {
      overflow: hidden;
    }

    .music-draft-manifest summary {
      cursor: pointer;
      padding: 14px 16px;
      color: #f8fafc;
      font-weight: 950;
    }

    .music-draft-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      padding: 0 16px 14px;
    }

    .music-draft-actions button {
      min-height: 34px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 950;
    }

    .music-prepare-status {
      margin: 0 16px 12px;
      padding: 12px 13px;
      border: 1px solid rgba(148, 163, 184, 0.20);
      border-radius: 14px;
      color: #cbd5e1;
      background: rgba(15, 23, 42, 0.48);
      line-height: 1.4;
    }

    .music-prepare-status.pending {
      border-color: rgba(96, 165, 250, 0.36);
      color: #bfdbfe;
      background: rgba(30, 64, 175, 0.18);
    }

    .music-prepare-status.ok {
      border-color: rgba(34, 197, 94, 0.34);
      color: #bbf7d0;
      background: rgba(22, 101, 52, 0.18);
    }

    .music-prepare-status.error {
      border-color: rgba(248, 113, 113, 0.34);
      color: #fecaca;
      background: rgba(127, 29, 29, 0.20);
    }

    .music-manifest-preview,
    .music-prepare-result {
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

    .music-prepare-result.hidden,
    .hidden {
      display: none !important;
    }

    .music-prepare-result {
      border-top-color: rgba(96, 165, 250, 0.22);
    }

    @media (max-width: 980px) {
      .music-draft-layout,
      .music-two-column {
        grid-template-columns: 1fr;
      }

      .music-draft-head {
        flex-direction: column;
      }

      .music-draft-actions {
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