/**
 * RO:WHAT — Adds a feature-gated stream + podcast companion mode panel to crab://stream.
 * RO:WHY — NEXT_LEVEL creator workflow; lets streamers model simulcast/live podcast/record-for-later without pretending backend streaming exists.
 * RO:INTERACTS — page-stream-draft.js, page.html, chrome.storage.local, future /streams/prepare and /podcasts/prepare route contracts.
 * RO:INVARIANTS — no live stream starts; no podcast starts; no ingest key; no RSS feed; no b3 CID; no ROC charge; no wallet mutation.
 * RO:TRUTH — This is local product planning metadata only; backend stream/podcast routes remain future work.
 * RO:METRICS — none; local-only feature-gate UX.
 * RO:CONFIG — stores crablinkStreamPodcastCompanionV1 only.
 * RO:SECURITY — textContent/createElement only; no mic/camera access; no stream keys; no direct internal service calls.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://stream.
 */

const STYLE_ID = 'crablinkStreamPodcastModeStyles';
const PANEL_ID = 'streamPodcastCompanionPanel';
const PREVIEW_ID = 'streamPodcastCompanionPreview';
const DRAFT_KEY = 'crablinkStreamPodcastCompanionV1';
const STREAM_SECTION_ID = 'streamDraftSection';
const STREAM_VIEW_CLASS = 'crablink-stream-draft-view-mode';

const DEFAULT_DRAFT = {
  schema: 'crablink.stream-podcast-companion.local.v1',
  enabled: false,
  mode: 'record-for-later',
  showTitle: '',
  episodeTitle: '',
  podcastVisibility: 'same-as-stream',
  publishTiming: 'manual-after-stream',
  exportRssLater: true,
  captureChatSummary: false,
  captureHighlights: true,
  notes: '',
  updatedAt: ''
};

let renderTimer = 0;
let saveTimer = 0;
let patchTimer = 0;
let lastSignature = '';

function boot() {
  installStyles();
  scheduleRender('boot');

  const root = document.getElementById('pagePanel') || document.body || document.documentElement;
  if (root) {
    const observer = new MutationObserver(() => scheduleRender('mutation'));
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
        scheduleRender('storage');
      }
    });
  }
}

function scheduleRender(reason) {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    renderCompanionPanel(reason).catch((error) => {
      setFooter(`Stream + podcast panel skipped: ${error?.message || error}`);
    });
  }, 90);
}

async function renderCompanionPanel(reason) {
  if (!isStreamRoute()) {
    cleanupPanel();
    lastSignature = '';
    return;
  }

  const section = document.getElementById(STREAM_SECTION_ID);
  if (!section || section.classList.contains('hidden')) {
    return;
  }

  const draft = await getDraft();
  const signature = JSON.stringify({
    reason,
    route: currentCrabUrl(),
    draft
  });

  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = buildPanel();
    insertPanel(section, panel);
    bindPanel(panel);
  }

  if (signature !== lastSignature) {
    lastSignature = signature;
    fillPanel(panel, draft);
  }

  updateEnabledState(panel);
  updatePreview(panel);
  scheduleManifestPatch();
}

function buildPanel() {
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.className = 'stream-podcast-panel';

  const head = document.createElement('div');
  head.className = 'stream-podcast-head';

  const copy = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'stream-podcast-eyebrow';
  eyebrow.textContent = 'feature-gated companion output';

  const title = document.createElement('h4');
  title.textContent = 'Stream + Podcast Mode';

  const desc = document.createElement('p');
  desc.textContent =
    'Plan a live stream that can also become a podcast output: simulcast live, record for later, or publish a post-stream episode.';

  copy.append(eyebrow, title, desc);

  const badge = document.createElement('span');
  badge.className = 'stream-podcast-badge';
  badge.textContent = 'feature gate';

  head.append(copy, badge);

  const boundary = document.createElement('div');
  boundary.className = 'stream-podcast-boundary';
  boundary.textContent =
    'Truth boundary: this does not start a stream, does not start a podcast, does not create ingest keys, does not create an RSS feed, does not assign b3 CIDs, and does not charge ROC. It only records local intent for future backend route contracts.';

  const fields = document.createElement('div');
  fields.className = 'stream-podcast-fields';

  fields.append(
    checkboxField({
      id: 'streamPodcastEnabled',
      name: 'enabled',
      label: 'Enable Stream + Podcast companion mode',
      help: 'Feature-gated local planning only. Backend stream/podcast routes are not wired yet.'
    }),
    twoColumn(
      fieldBlock({
        label: 'Companion mode',
        field: selectField('streamPodcastMode', 'mode', [
          ['simulcast-live', 'Live podcast simulcast'],
          ['record-for-later', 'Record podcast while streaming'],
          ['post-stream-episode', 'Publish episode after stream'],
          ['clip-highlights', 'Create highlights / recap episode']
        ]),
        help: '“Simulcast” fits when the same content is broadcast live to more than one output.'
      }),
      fieldBlock({
        label: 'Publish timing',
        field: selectField('streamPodcastPublishTiming', 'publishTiming', [
          ['manual-after-stream', 'Manual after stream'],
          ['auto-draft-after-stream', 'Auto-create draft after stream'],
          ['same-time-live', 'Same time live'],
          ['scheduled-later', 'Scheduled later']
        ]),
        help: 'No publishing happens in CrabLink yet.'
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Podcast show title',
        field: inputField('streamPodcastShowTitle', 'showTitle', 'The Skinnycrabby Show'),
        help: 'Local display metadata for a future podcast output.'
      }),
      fieldBlock({
        label: 'Episode title',
        field: inputField('streamPodcastEpisodeTitle', 'episodeTitle', 'Live from CrabLink'),
        help: 'Future episode title if this stream becomes a podcast.'
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Podcast visibility',
        field: selectField('streamPodcastVisibility', 'podcastVisibility', [
          ['same-as-stream', 'Same as stream'],
          ['public', 'Public'],
          ['passport-only', 'Passport only'],
          ['paid-access', 'Paid access'],
          ['private-draft', 'Private draft']
        ]),
        help: 'Future access policy input only.'
      }),
      checkboxField({
        id: 'streamPodcastExportRssLater',
        name: 'exportRssLater',
        label: 'Plan RSS/export compatibility',
        help: 'Future compatibility target. No RSS feed is created here.'
      })
    ),
    twoColumn(
      checkboxField({
        id: 'streamPodcastCaptureChatSummary',
        name: 'captureChatSummary',
        label: 'Capture chat summary later',
        help: 'Future moderation/transcript feature only.'
      }),
      checkboxField({
        id: 'streamPodcastCaptureHighlights',
        name: 'captureHighlights',
        label: 'Capture highlights later',
        help: 'Future clipping/recap metadata only.'
      })
    ),
    fieldBlock({
      label: 'Companion notes',
      field: textareaField('streamPodcastNotes', 'notes', 'Optional notes for stream-to-podcast workflow.', 4),
      help: 'Local-only notes. Do not paste stream keys, secrets, or private contracts here.'
    })
  );

  const actions = document.createElement('div');
  actions.className = 'stream-podcast-actions';

  actions.append(
    actionButton('Save Companion Draft', 'save'),
    actionButton('Copy Companion JSON', 'copy', true),
    actionButton('Clear Companion Draft', 'clear', true)
  );

  const preview = document.createElement('pre');
  preview.id = PREVIEW_ID;
  preview.className = 'stream-podcast-preview';
  preview.textContent = '{}';

  panel.append(head, boundary, fields, actions, preview);
  return panel;
}

function insertPanel(section, panel) {
  const notice = section.querySelector('.stream-draft-notice');
  const layout = section.querySelector('.stream-draft-layout');

  if (notice && notice.parentElement === section) {
    notice.insertAdjacentElement('afterend', panel);
    return;
  }

  if (layout && layout.parentElement === section) {
    section.insertBefore(panel, layout);
    return;
  }

  const head = section.querySelector('.stream-draft-head');
  if (head && head.parentElement === section) {
    head.insertAdjacentElement('afterend', panel);
    return;
  }

  section.append(panel);
}

function bindPanel(panel) {
  panel.addEventListener('input', (event) => {
    if (!event.target?.closest?.('[data-stream-podcast-field]')) return;
    updateEnabledState(panel);
    updatePreview(panel);
    scheduleSave(panel);
    scheduleManifestPatch();
  });

  panel.addEventListener('change', (event) => {
    if (!event.target?.closest?.('[data-stream-podcast-field]')) return;
    updateEnabledState(panel);
    updatePreview(panel);
    scheduleSave(panel);
    scheduleManifestPatch();
  });

  panel.addEventListener('click', (event) => {
    const action = event.target?.closest?.('[data-stream-podcast-action]')?.getAttribute(
      'data-stream-podcast-action'
    );
    if (!action) return;

    event.preventDefault();

    if (action === 'save') {
      void saveDraft(panel, { announce: true });
      return;
    }

    if (action === 'copy') {
      void copyText(JSON.stringify(buildCompanionContract(panel), null, 2), 'Stream + podcast JSON copied.');
      return;
    }

    if (action === 'clear') {
      void clearDraft(panel);
    }
  });
}

function fillPanel(panel, draft) {
  const merged = { ...DEFAULT_DRAFT, ...draft };

  setField(panel, 'enabled', Boolean(merged.enabled));
  setField(panel, 'mode', merged.mode || 'record-for-later');
  setField(panel, 'showTitle', merged.showTitle);
  setField(panel, 'episodeTitle', merged.episodeTitle);
  setField(panel, 'podcastVisibility', merged.podcastVisibility || 'same-as-stream');
  setField(panel, 'publishTiming', merged.publishTiming || 'manual-after-stream');
  setField(panel, 'exportRssLater', merged.exportRssLater !== false);
  setField(panel, 'captureChatSummary', Boolean(merged.captureChatSummary));
  setField(panel, 'captureHighlights', merged.captureHighlights !== false);
  setField(panel, 'notes', merged.notes);
}

function updateEnabledState(panel) {
  const enabled = Boolean(getField(panel, 'enabled'));
  panel.setAttribute('data-stream-podcast-enabled', enabled ? 'true' : 'false');

  for (const field of panel.querySelectorAll('[data-stream-podcast-field]')) {
    if (field.getAttribute('data-stream-podcast-field') === 'enabled') continue;
    field.disabled = !enabled;
  }
}

function updatePreview(panel) {
  const preview = panel.querySelector(`#${PREVIEW_ID}`);
  if (!preview) return;

  preview.textContent = JSON.stringify(buildCompanionContract(panel), null, 2);
}

function buildCompanionContract(panel) {
  const draft = readPanelDraft(panel);

  return {
    schema: 'crablink.stream-podcast-companion.local.v1',
    status: draft.enabled ? 'feature_gate_enabled_local_draft' : 'feature_gate_disabled',
    terminology: {
      simulcast:
        'Use simulcast when the same live content is broadcast simultaneously as both a stream and podcast-style live output.',
      recording:
        'Use stream + podcast recording when the stream is captured or edited into a podcast episode later.',
      post_stream_publishing:
        'Use post-stream podcast publishing when a podcast episode is created after the stream ends.'
    },
    companion_output: {
      enabled: draft.enabled,
      mode: draft.mode,
      show_title: draft.showTitle,
      episode_title: draft.episodeTitle,
      visibility: draft.podcastVisibility,
      publish_timing: draft.publishTiming,
      rss_export_later: draft.exportRssLater,
      capture_chat_summary_later: draft.captureChatSummary,
      capture_highlights_later: draft.captureHighlights
    },
    future_routes: {
      stream_prepare: '/streams/prepare',
      podcast_prepare: '/podcasts/prepare',
      stream_asset_shape: 'crab://<64 lowercase hex>.stream',
      podcast_asset_shape: 'crab://<64 lowercase hex>.podcast'
    },
    truth_boundary: {
      stream_started: false,
      podcast_started: false,
      ingest_key_created: false,
      rss_feed_created: false,
      b3_content_id_assigned: false,
      roc_charged: false,
      wallet_mutated: false
    },
    notes: draft.notes,
    updated_at: new Date().toISOString()
  };
}

function scheduleManifestPatch() {
  window.clearTimeout(patchTimer);
  patchTimer = window.setTimeout(patchStreamManifestPreview, 80);
}

function patchStreamManifestPreview() {
  if (!isStreamRoute()) return;

  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;

  const manifestPre =
    document.getElementById('streamManifestPreview') ||
    document.querySelector('#streamDraftSection pre[id$="ManifestPreview"]') ||
    document.querySelector('#streamDraftSection pre');

  if (!manifestPre) return;

  const raw = String(manifestPre.textContent || '').trim();
  if (!raw || raw === '{}') return;

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    return;
  }

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return;

  const contract = buildCompanionContract(panel);

  manifest.feature_gates = {
    ...(manifest.feature_gates && typeof manifest.feature_gates === 'object' ? manifest.feature_gates : {}),
    stream_podcast_companion: contract.companion_output.enabled
  };

  manifest.companion_outputs = {
    ...(manifest.companion_outputs && typeof manifest.companion_outputs === 'object'
      ? manifest.companion_outputs
      : {}),
    podcast: {
      schema: 'ron.stream-companion-output.future.v1',
      status: contract.companion_output.enabled ? 'planned_local_draft' : 'disabled',
      mode: contract.companion_output.mode,
      show_title: contract.companion_output.show_title || null,
      episode_title: contract.companion_output.episode_title || null,
      visibility: contract.companion_output.visibility,
      publish_timing: contract.companion_output.publish_timing,
      rss_export_later: contract.companion_output.rss_export_later,
      capture_chat_summary_later: contract.companion_output.capture_chat_summary_later,
      capture_highlights_later: contract.companion_output.capture_highlights_later,
      podcast_asset_shape: contract.future_routes.podcast_asset_shape
    }
  };

  manifest.truth_boundary = {
    ...(manifest.truth_boundary && typeof manifest.truth_boundary === 'object' ? manifest.truth_boundary : {}),
    companion_podcast_not_started: true,
    companion_podcast_not_published: true,
    companion_rss_not_created: true,
    companion_wallet_not_mutated: true
  };

  manifest.next_required_backend_work = Array.from(
    new Set([
      ...(Array.isArray(manifest.next_required_backend_work) ? manifest.next_required_backend_work : []),
      'stream companion-output DTOs',
      'feature gate for stream + podcast mode',
      'podcast draft creation from stream session',
      'optional live podcast simulcast route',
      'post-stream podcast publishing route',
      'RSS/export compatibility policy'
    ])
  );

  manifestPre.textContent = JSON.stringify(manifest, null, 2);
}

function fieldBlock({ label, field, help }) {
  const block = document.createElement('label');
  block.className = 'stream-podcast-field';

  const span = document.createElement('span');
  span.textContent = label;

  block.append(span, field);

  if (help) {
    const small = document.createElement('small');
    small.textContent = help;
    block.append(small);
  }

  return block;
}

function inputField(id, name, placeholder) {
  const input = document.createElement('input');
  input.id = id;
  input.type = 'text';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.dataset.streamPodcastField = name;
  return input;
}

function textareaField(id, name, placeholder, rows) {
  const textarea = document.createElement('textarea');
  textarea.id = id;
  textarea.placeholder = placeholder;
  textarea.rows = rows;
  textarea.dataset.streamPodcastField = name;
  return textarea;
}

function selectField(id, name, options) {
  const select = document.createElement('select');
  select.id = id;
  select.dataset.streamPodcastField = name;

  for (const [value, label] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  return select;
}

function checkboxField({ id, name, label, help }) {
  const wrapper = document.createElement('label');
  wrapper.className = 'stream-podcast-checkbox';

  const input = document.createElement('input');
  input.id = id;
  input.type = 'checkbox';
  input.dataset.streamPodcastField = name;

  const copy = document.createElement('span');
  copy.textContent = label;

  wrapper.append(input, copy);

  if (help) {
    const small = document.createElement('small');
    small.textContent = help;
    wrapper.append(small);
  }

  return wrapper;
}

function twoColumn(left, right) {
  const row = document.createElement('div');
  row.className = 'stream-podcast-two-column';
  row.append(left, right);
  return row;
}

function actionButton(label, action, secondary = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.dataset.streamPodcastAction = action;
  if (secondary) button.className = 'secondary';
  return button;
}

function readPanelDraft(panel) {
  return {
    enabled: Boolean(getField(panel, 'enabled')),
    mode: clean(getField(panel, 'mode')) || 'record-for-later',
    showTitle: clean(getField(panel, 'showTitle')),
    episodeTitle: clean(getField(panel, 'episodeTitle')),
    podcastVisibility: clean(getField(panel, 'podcastVisibility')) || 'same-as-stream',
    publishTiming: clean(getField(panel, 'publishTiming')) || 'manual-after-stream',
    exportRssLater: Boolean(getField(panel, 'exportRssLater')),
    captureChatSummary: Boolean(getField(panel, 'captureChatSummary')),
    captureHighlights: Boolean(getField(panel, 'captureHighlights')),
    notes: clean(getField(panel, 'notes'))
  };
}

function getField(panel, name) {
  const field = panel.querySelector(`[data-stream-podcast-field="${name}"]`);
  if (!field) return '';

  if (field.type === 'checkbox') return field.checked;
  return field.value;
}

function setField(panel, name, value) {
  const field = panel.querySelector(`[data-stream-podcast-field="${name}"]`);
  if (!field) return;

  if (field.type === 'checkbox') {
    field.checked = Boolean(value);
    return;
  }

  field.value = String(value ?? '');
}

function scheduleSave(panel) {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void saveDraft(panel, { announce: false });
  }, 650);
}

async function saveDraft(panel, { announce = false } = {}) {
  const draft = {
    ...readPanelDraft(panel),
    schema: DEFAULT_DRAFT.schema,
    updatedAt: new Date().toISOString()
  };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [DRAFT_KEY]: draft });
  }

  if (announce) setFooter('Stream + podcast companion draft saved locally.');
}

async function clearDraft(panel) {
  const cleanDraft = { ...DEFAULT_DRAFT, updatedAt: new Date().toISOString() };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [DRAFT_KEY]: cleanDraft });
  }

  fillPanel(panel, cleanDraft);
  updateEnabledState(panel);
  updatePreview(panel);
  scheduleManifestPatch();
  setFooter('Stream + podcast companion draft cleared locally.');
}

async function getDraft() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return DEFAULT_DRAFT;

  try {
    const stored = await chrome.storage.local.get([DRAFT_KEY]);
    const draft = stored?.[DRAFT_KEY];
    return draft && typeof draft === 'object' && !Array.isArray(draft) ? draft : DEFAULT_DRAFT;
  } catch {
    return DEFAULT_DRAFT;
  }
}

function cleanupPanel() {
  document.getElementById(PANEL_ID)?.remove();
}

function isStreamRoute() {
  const route = currentCrabUrl();
  if (!route) return false;
  return route === 'crab://stream';
}

function currentCrabUrl() {
  const address = clean(document.getElementById('addressInput')?.value || '').toLowerCase();
  if (address.startsWith('crab://')) return address.replace(/\/+$/, '');

  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = clean(params.get('url') || params.get('crab') || '').toLowerCase();
    if (fromQuery.startsWith('crab://')) return fromQuery.replace(/\/+$/, '');
  } catch {
    return '';
  }

  return '';
}

async function copyText(value, message) {
  const text = String(value ?? '');
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    setFooter(message || 'Copied.');
  } catch {
    setFooter(text.slice(0, 240));
  }
}

function setFooter(message) {
  const footer = document.getElementById('footerStatus');
  if (footer) footer.textContent = message;
}

function clean(value) {
  return String(value ?? '').trim();
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .stream-podcast-panel {
      display: grid;
      gap: 14px;
      padding: 17px;
      border: 1px solid rgba(168, 85, 247, 0.26);
      border-radius: 24px;
      background:
        radial-gradient(circle at top left, rgba(168, 85, 247, 0.14), transparent 44%),
        radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.10), transparent 42%),
        rgba(2, 6, 23, 0.28);
    }

    .stream-podcast-panel[data-stream-podcast-enabled="true"] {
      border-color: rgba(34, 197, 94, 0.34);
      background:
        radial-gradient(circle at top left, rgba(34, 197, 94, 0.12), transparent 44%),
        radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.14), transparent 42%),
        rgba(2, 6, 23, 0.30);
    }

    .stream-podcast-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
    }

    .stream-podcast-eyebrow {
      margin: 0 0 6px;
      color: #ddd6fe;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .stream-podcast-head h4 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(23px, 3vw, 34px);
      line-height: 1;
      letter-spacing: -0.055em;
    }

    .stream-podcast-head p:not(.stream-podcast-eyebrow) {
      margin: 8px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .stream-podcast-badge {
      display: inline-flex;
      align-items: center;
      min-height: 30px;
      padding: 7px 11px;
      border: 1px solid rgba(168, 85, 247, 0.34);
      border-radius: 999px;
      color: #ddd6fe;
      background: rgba(88, 28, 135, 0.22);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .stream-podcast-boundary {
      padding: 13px 14px;
      border: 1px solid rgba(168, 85, 247, 0.24);
      border-radius: 16px;
      color: #ddd6fe;
      background: rgba(88, 28, 135, 0.14);
      line-height: 1.45;
    }

    .stream-podcast-fields {
      display: grid;
      gap: 12px;
    }

    .stream-podcast-two-column {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .stream-podcast-field,
    .stream-podcast-checkbox {
      display: grid;
      gap: 7px;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 850;
    }

    .stream-podcast-checkbox {
      grid-template-columns: auto minmax(0, 1fr);
      align-items: start;
      padding: 12px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.36);
    }

    .stream-podcast-checkbox input {
      margin-top: 2px;
    }

    .stream-podcast-checkbox small {
      grid-column: 2;
    }

    .stream-podcast-field span,
    .stream-podcast-checkbox span {
      color: #ddd6fe;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .stream-podcast-field small,
    .stream-podcast-checkbox small {
      color: #94a3b8;
      line-height: 1.4;
    }

    .stream-podcast-field input,
    .stream-podcast-field textarea,
    .stream-podcast-field select {
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

    .stream-podcast-field input:disabled,
    .stream-podcast-field textarea:disabled,
    .stream-podcast-field select:disabled,
    .stream-podcast-checkbox input:disabled {
      opacity: 0.58;
      cursor: not-allowed;
    }

    .stream-podcast-field textarea {
      resize: vertical;
      min-height: 88px;
      line-height: 1.45;
    }

    .stream-podcast-field input:focus,
    .stream-podcast-field textarea:focus,
    .stream-podcast-field select:focus {
      border-color: rgba(168, 85, 247, 0.54);
      box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.12);
    }

    .stream-podcast-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }

    .stream-podcast-actions button {
      min-height: 34px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 950;
    }

    .stream-podcast-preview {
      max-height: 320px;
      overflow: auto;
      margin: 0;
      padding: 14px;
      border: 1px solid rgba(168, 85, 247, 0.20);
      border-radius: 16px;
      color: #ede9fe;
      background: #020617;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    @media (max-width: 980px) {
      .stream-podcast-two-column {
        grid-template-columns: 1fr;
      }

      .stream-podcast-head {
        flex-direction: column;
      }

      .stream-podcast-actions {
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