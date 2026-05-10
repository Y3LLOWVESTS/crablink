/**
 * RO:WHAT — Adds music rights and separate lyrics-asset contract UX to crab://music.
 * RO:WHY — NEXT_LEVEL music primitive safety; lyrics should be independently b3-addressed for rights, DRM, licensing, and paywall boundaries.
 * RO:INTERACTS — page-music-draft.js, page.html, chrome.storage.local, future crab://<hash>.lyrics route support.
 * RO:INVARIANTS — no fake b3 CID; no lyrics upload; no rights claim; no wallet mutation; local manifest preview only.
 * RO:TRUTH — Lyrics may be drafted locally, but publication requires a separate future b3-backed .lyrics asset.
 * RO:METRICS — none; client-side local draft UX only.
 * RO:CONFIG — stores crablinkMusicRightsDraftV1 only.
 * RO:SECURITY — textContent/createElement only; no direct internal service calls; no executable lyric/body content.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://music.
 */

const STYLE_ID = 'crablinkMusicRightsStyles';
const PANEL_ID = 'musicRightsPanel';
const PREVIEW_ID = 'musicRightsPreview';
const DRAFT_KEY = 'crablinkMusicRightsDraftV1';
const MUSIC_SECTION_ID = 'musicDraftSection';
const MUSIC_VIEW_CLASS = 'crablink-music-draft-view-mode';

const DEFAULT_RIGHTS_DRAFT = {
  schema: 'crablink.music-rights.local.v1',
  separateLyricsAsset: true,
  lyricsCrabUrl: '',
  lyricsRightsMode: 'separate-rights',
  lyricsAccessMode: 'same-as-music',
  lyricsDrmBoundary: true,
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
    renderRightsPanel(reason).catch((error) => {
      setFooter(`Music rights panel skipped: ${error?.message || error}`);
    });
  }, 90);
}

async function renderRightsPanel(reason) {
  if (!isMusicRoute()) {
    cleanupPanel();
    lastSignature = '';
    return;
  }

  const section = document.getElementById(MUSIC_SECTION_ID);
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

  updatePreview(panel);
  scheduleManifestPatch();
}

function buildPanel() {
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.className = 'music-rights-panel';

  const head = document.createElement('div');
  head.className = 'music-rights-head';

  const copy = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'music-rights-eyebrow';
  eyebrow.textContent = 'rights boundary';

  const title = document.createElement('h4');
  title.textContent = 'Lyrics as a separate b3 asset';

  const desc = document.createElement('p');
  desc.textContent =
    'Model lyrics as their own future crab://<hash>.lyrics asset and reference that asset from the .music/.song manifest.';

  copy.append(eyebrow, title, desc);

  const badge = document.createElement('span');
  badge.className = 'music-rights-badge';
  badge.textContent = 'lyrics asset';

  head.append(copy, badge);

  const boundary = document.createElement('div');
  boundary.className = 'music-rights-boundary';
  boundary.textContent =
    'Truth boundary: this panel does not upload lyrics, does not create a lyrics b3 CID, does not create a music manifest CID, does not enforce DRM, and does not charge ROC. It only makes the future asset contract explicit.';

  const fields = document.createElement('div');
  fields.className = 'music-rights-fields';

  fields.append(
    checkboxField({
      id: 'musicSeparateLyricsAsset',
      name: 'separateLyricsAsset',
      label: 'Use separate lyrics asset reference',
      help: 'Recommended. Lyrics can have separate licensing, paywall, takedown, and rights rules.'
    }),
    twoColumn(
      fieldBlock({
        label: 'Future lyrics crab URL',
        field: inputField('musicLyricsCrabUrl', 'lyricsCrabUrl', 'crab://<64hex>.lyrics'),
        help: 'Optional today. Future published lyrics should resolve as their own typed asset.'
      }),
      fieldBlock({
        label: 'Lyrics rights mode',
        field: selectField('musicLyricsRightsMode', 'lyricsRightsMode', [
          ['separate-rights', 'Separate lyrics rights'],
          ['same-as-song', 'Same as music/song'],
          ['publisher-controlled', 'Publisher controlled'],
          ['private-unpublished', 'Private / unpublished']
        ]),
        help: 'This is local metadata until backend rights policy exists.'
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'Lyrics access mode',
        field: selectField('musicLyricsAccessMode', 'lyricsAccessMode', [
          ['same-as-music', 'Same paywall as music'],
          ['free-preview', 'Free preview'],
          ['paid-separate', 'Paid separately'],
          ['owner-only', 'Owner only']
        ]),
        help: 'Future policy input only. No paywall is enforced here.'
      }),
      checkboxField({
        id: 'musicLyricsDrmBoundary',
        name: 'lyricsDrmBoundary',
        label: 'Keep DRM/licensing boundary separate',
        help: 'Helps avoid mixing audio, lyrics, and publishing rights into one inseparable blob.'
      })
    ),
    fieldBlock({
      label: 'Rights / licensing notes',
      field: textareaField('musicRightsNotes', 'notes', 'Optional notes for future lyrics rights policy.', 4),
      help: 'Local-only notes. Do not paste secrets or private contracts here.'
    })
  );

  const actions = document.createElement('div');
  actions.className = 'music-rights-actions';

  actions.append(
    actionButton('Save Rights Draft', 'save'),
    actionButton('Copy Rights JSON', 'copy', true),
    actionButton('Clear Rights Draft', 'clear', true)
  );

  const preview = document.createElement('pre');
  preview.id = PREVIEW_ID;
  preview.className = 'music-rights-preview';
  preview.textContent = '{}';

  panel.append(head, boundary, fields, actions, preview);
  return panel;
}

function insertPanel(section, panel) {
  const notice = section.querySelector('.music-draft-notice');
  const layout = section.querySelector('.music-draft-layout');

  if (notice && notice.parentElement === section) {
    notice.insertAdjacentElement('afterend', panel);
    return;
  }

  if (layout && layout.parentElement === section) {
    section.insertBefore(panel, layout);
    return;
  }

  section.append(panel);
}

function bindPanel(panel) {
  panel.addEventListener('input', (event) => {
    if (!event.target?.closest?.('[data-music-rights-field]')) return;
    updatePreview(panel);
    scheduleSave(panel);
    scheduleManifestPatch();
  });

  panel.addEventListener('change', (event) => {
    if (!event.target?.closest?.('[data-music-rights-field]')) return;
    updatePreview(panel);
    scheduleSave(panel);
    scheduleManifestPatch();
  });

  panel.addEventListener('click', (event) => {
    const action = event.target?.closest?.('[data-music-rights-action]')?.getAttribute('data-music-rights-action');
    if (!action) return;

    event.preventDefault();

    if (action === 'save') {
      void saveDraft(panel, { announce: true });
      return;
    }

    if (action === 'copy') {
      void copyText(JSON.stringify(buildRightsContract(panel), null, 2), 'Music rights JSON copied.');
      return;
    }

    if (action === 'clear') {
      void clearDraft(panel);
    }
  });
}

function fillPanel(panel, draft) {
  const merged = { ...DEFAULT_RIGHTS_DRAFT, ...draft };

  setField(panel, 'separateLyricsAsset', Boolean(merged.separateLyricsAsset));
  setField(panel, 'lyricsCrabUrl', merged.lyricsCrabUrl);
  setField(panel, 'lyricsRightsMode', merged.lyricsRightsMode || 'separate-rights');
  setField(panel, 'lyricsAccessMode', merged.lyricsAccessMode || 'same-as-music');
  setField(panel, 'lyricsDrmBoundary', merged.lyricsDrmBoundary !== false);
  setField(panel, 'notes', merged.notes);
}

function updatePreview(panel) {
  const preview = panel.querySelector(`#${PREVIEW_ID}`);
  if (!preview) return;

  preview.textContent = JSON.stringify(buildRightsContract(panel), null, 2);
}

function buildRightsContract(panel) {
  const draft = readPanelDraft(panel);
  const normalizedLyricsUrl = normalizeLyricsCrabUrl(draft.lyricsCrabUrl);

  return {
    schema: 'crablink.music-rights.local.v1',
    status: 'local_draft_not_published',
    purpose: 'Reference lyrics as an independent future b3-backed asset from a .music/.song manifest.',
    recommended_manifest_shape: {
      music_asset: 'crab://<64hex>.music',
      song_asset: 'crab://<64hex>.song',
      lyrics_asset: 'crab://<64hex>.lyrics',
      internal_lyrics_cid: 'b3:<64 lowercase hex>'
    },
    truth_boundary: {
      lyrics_uploaded: false,
      lyrics_b3_cid_assigned: false,
      lyrics_manifest_published: false,
      drm_enforced: false,
      wallet_mutated: false,
      roc_charged: false
    },
    lyrics_reference: {
      enabled: draft.separateLyricsAsset,
      kind: 'lyrics',
      crab_url: normalizedLyricsUrl || '',
      pending_separate_b3_asset: !normalizedLyricsUrl,
      rights_mode: draft.lyricsRightsMode,
      access_mode: draft.lyricsAccessMode,
      drm_boundary_separate: draft.lyricsDrmBoundary
    },
    notes: draft.notes,
    updated_at: new Date().toISOString()
  };
}

function scheduleManifestPatch() {
  window.clearTimeout(patchTimer);
  patchTimer = window.setTimeout(patchMusicManifestPreview, 80);
}

function patchMusicManifestPreview() {
  if (!isMusicRoute()) return;

  const manifestPre = document.getElementById('musicManifestPreview');
  const panel = document.getElementById(PANEL_ID);
  if (!manifestPre || !panel) return;

  const raw = String(manifestPre.textContent || '').trim();
  if (!raw || raw === '{}') return;

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    return;
  }

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return;

  const contract = buildRightsContract(panel);

  manifest.linked_assets = {
    ...(manifest.linked_assets && typeof manifest.linked_assets === 'object' ? manifest.linked_assets : {}),
    lyrics: {
      schema: 'ron.asset-reference.future.v1',
      kind: 'lyrics',
      status: contract.lyrics_reference.enabled ? 'separate_asset_expected' : 'disabled_for_this_draft',
      crab_url: contract.lyrics_reference.crab_url || null,
      internal_cid_pending: true,
      future_crab_url_shape: 'crab://<64 lowercase hex>.lyrics',
      rights_mode: contract.lyrics_reference.rights_mode,
      access_mode: contract.lyrics_reference.access_mode,
      drm_boundary_separate: contract.lyrics_reference.drm_boundary_separate
    }
  };

  manifest.rights_boundary = {
    ...(manifest.rights_boundary && typeof manifest.rights_boundary === 'object' ? manifest.rights_boundary : {}),
    lyrics_are_independent_asset: contract.lyrics_reference.enabled,
    lyrics_publication_not_claimed: true,
    lyrics_drm_not_enforced_locally: true,
    lyrics_wallet_charge_not_performed: true
  };

  manifest.next_required_backend_work = Array.from(
    new Set([
      ...(Array.isArray(manifest.next_required_backend_work) ? manifest.next_required_backend_work : []),
      'lyrics typed asset kind support',
      'lyrics manifest DTO and route contract',
      'music/song manifest reference to b3 lyrics asset',
      'rights/paywall policy for lyrics access',
      'optional DRM/licensing metadata boundary'
    ])
  );

  manifestPre.textContent = JSON.stringify(manifest, null, 2);
}

function fieldBlock({ label, field, help }) {
  const block = document.createElement('label');
  block.className = 'music-rights-field';

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
  input.dataset.musicRightsField = name;
  return input;
}

function textareaField(id, name, placeholder, rows) {
  const textarea = document.createElement('textarea');
  textarea.id = id;
  textarea.placeholder = placeholder;
  textarea.rows = rows;
  textarea.dataset.musicRightsField = name;
  return textarea;
}

function selectField(id, name, options) {
  const select = document.createElement('select');
  select.id = id;
  select.dataset.musicRightsField = name;

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
  wrapper.className = 'music-rights-checkbox';

  const input = document.createElement('input');
  input.id = id;
  input.type = 'checkbox';
  input.dataset.musicRightsField = name;

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
  row.className = 'music-rights-two-column';
  row.append(left, right);
  return row;
}

function actionButton(label, action, secondary = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.dataset.musicRightsAction = action;
  if (secondary) button.className = 'secondary';
  return button;
}

function readPanelDraft(panel) {
  return {
    separateLyricsAsset: Boolean(getField(panel, 'separateLyricsAsset')),
    lyricsCrabUrl: clean(getField(panel, 'lyricsCrabUrl')),
    lyricsRightsMode: clean(getField(panel, 'lyricsRightsMode')) || 'separate-rights',
    lyricsAccessMode: clean(getField(panel, 'lyricsAccessMode')) || 'same-as-music',
    lyricsDrmBoundary: Boolean(getField(panel, 'lyricsDrmBoundary')),
    notes: clean(getField(panel, 'notes'))
  };
}

function getField(panel, name) {
  const field = panel.querySelector(`[data-music-rights-field="${name}"]`);
  if (!field) return '';

  if (field.type === 'checkbox') return field.checked;
  return field.value;
}

function setField(panel, name, value) {
  const field = panel.querySelector(`[data-music-rights-field="${name}"]`);
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
    schema: DEFAULT_RIGHTS_DRAFT.schema,
    updatedAt: new Date().toISOString()
  };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [DRAFT_KEY]: draft });
  }

  if (announce) setFooter('Music rights draft saved locally.');
}

async function clearDraft(panel) {
  const cleanDraft = { ...DEFAULT_RIGHTS_DRAFT, updatedAt: new Date().toISOString() };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [DRAFT_KEY]: cleanDraft });
  }

  fillPanel(panel, cleanDraft);
  updatePreview(panel);
  scheduleManifestPatch();
  setFooter('Music rights draft cleared locally.');
}

async function getDraft() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return DEFAULT_RIGHTS_DRAFT;

  try {
    const stored = await chrome.storage.local.get([DRAFT_KEY]);
    const draft = stored?.[DRAFT_KEY];
    return draft && typeof draft === 'object' && !Array.isArray(draft) ? draft : DEFAULT_RIGHTS_DRAFT;
  } catch {
    return DEFAULT_RIGHTS_DRAFT;
  }
}

function normalizeLyricsCrabUrl(value) {
  const raw = clean(value).toLowerCase();
  const match = /^crab:\/\/([0-9a-f]{64})\.lyrics$/.exec(raw);

  if (!match) return '';
  return `crab://${match[1]}.lyrics`;
}

function cleanupPanel() {
  document.getElementById(PANEL_ID)?.remove();
}

function isMusicRoute() {
  const route = currentCrabUrl();
  if (!route) return false;
  return route === 'crab://music';
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
    body.${MUSIC_VIEW_CLASS} #pageFacts {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    body.${MUSIC_VIEW_CLASS} #pageFacts > div {
      display: grid;
      gap: 7px;
      min-width: 0;
      padding: 14px 16px;
      border: 1px solid rgba(96, 165, 250, 0.18);
      border-radius: 18px;
      background:
        radial-gradient(circle at top left, rgba(96, 165, 250, 0.10), transparent 52%),
        rgba(15, 23, 42, 0.44);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.025);
    }

    body.${MUSIC_VIEW_CLASS} #pageFacts > div span {
      display: block;
      color: #bfdbfe;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.11em;
      line-height: 1.15;
      text-transform: uppercase;
    }

    body.${MUSIC_VIEW_CLASS} #pageFacts > div strong {
      display: block;
      color: #f8fafc;
      font-size: 14px;
      font-weight: 950;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .music-rights-panel {
      display: grid;
      gap: 14px;
      padding: 17px;
      border: 1px solid rgba(251, 191, 36, 0.24);
      border-radius: 24px;
      background:
        radial-gradient(circle at top left, rgba(251, 191, 36, 0.12), transparent 44%),
        rgba(2, 6, 23, 0.28);
    }

    .music-rights-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
    }

    .music-rights-eyebrow {
      margin: 0 0 6px;
      color: #fde68a;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .music-rights-head h4 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(23px, 3vw, 34px);
      line-height: 1;
      letter-spacing: -0.055em;
    }

    .music-rights-head p:not(.music-rights-eyebrow) {
      margin: 8px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .music-rights-badge {
      display: inline-flex;
      align-items: center;
      min-height: 30px;
      padding: 7px 11px;
      border: 1px solid rgba(251, 191, 36, 0.32);
      border-radius: 999px;
      color: #fde68a;
      background: rgba(113, 63, 18, 0.20);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .music-rights-boundary {
      padding: 13px 14px;
      border: 1px solid rgba(251, 191, 36, 0.24);
      border-radius: 16px;
      color: #fde68a;
      background: rgba(113, 63, 18, 0.14);
      line-height: 1.45;
    }

    .music-rights-fields {
      display: grid;
      gap: 12px;
    }

    .music-rights-two-column {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .music-rights-field,
    .music-rights-checkbox {
      display: grid;
      gap: 7px;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 850;
    }

    .music-rights-checkbox {
      grid-template-columns: auto minmax(0, 1fr);
      align-items: start;
      padding: 12px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.36);
    }

    .music-rights-checkbox input {
      margin-top: 2px;
    }

    .music-rights-checkbox small {
      grid-column: 2;
    }

    .music-rights-field span,
    .music-rights-checkbox span {
      color: #fde68a;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .music-rights-field small,
    .music-rights-checkbox small {
      color: #94a3b8;
      line-height: 1.4;
    }

    .music-rights-field input,
    .music-rights-field textarea,
    .music-rights-field select {
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

    .music-rights-field textarea {
      resize: vertical;
      min-height: 88px;
      line-height: 1.45;
    }

    .music-rights-field input:focus,
    .music-rights-field textarea:focus,
    .music-rights-field select:focus {
      border-color: rgba(251, 191, 36, 0.54);
      box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12);
    }

    .music-rights-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }

    .music-rights-actions button {
      min-height: 34px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 950;
    }

    .music-rights-preview {
      max-height: 320px;
      overflow: auto;
      margin: 0;
      padding: 14px;
      border: 1px solid rgba(251, 191, 36, 0.18);
      border-radius: 16px;
      color: #fef3c7;
      background: #020617;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    @media (max-width: 980px) {
      body.${MUSIC_VIEW_CLASS} #pageFacts,
      .music-rights-two-column {
        grid-template-columns: 1fr;
      }

      .music-rights-head {
        flex-direction: column;
      }

      .music-rights-actions {
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