/**
 * RO:WHAT — Adds a local-only profile editor for CrabLink's crab://profile scaffold.
 * RO:WHY — NEXT_LEVEL profile/SSO UX; Concerns: DX/SEC; users can draft display profile data before backend profile manifests exist.
 * RO:INTERACTS — page-profile-home.js, chrome.storage.local, page.html.
 * RO:INVARIANTS — local draft only; no backend mutation; no public profile CID claim; no wallet authority; no fake reputation/moderation truth.
 * RO:METRICS — none; client-side UX only.
 * RO:CONFIG — stores local profile draft under crablinkProfileDraftV1.
 * RO:SECURITY — textContent only; no private keys; no seed phrases; no spend authority; profile template excludes private identity/wallet material.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://profile → Create / Edit Profile.
 */

const STYLE_ID = 'crablinkProfileEditorStyles';
const SHEET_ID = 'crablinkProfileEditorSheet';
const PANEL_ID = 'crablinkProfileEditorPanel';
const PROFILE_DRAFT_KEY = 'crablinkProfileDraftV1';

let lastContext = {};

function boot() {
  installStyles();

  document.addEventListener('crablink:open-profile-editor', (event) => {
    void openProfileEditor(event.detail || {});
  });

  document.addEventListener('click', (event) => {
    const open = event.target?.closest?.('[data-crablink-open-profile-editor]');
    if (open) {
      event.preventDefault();
      void openProfileEditor({});
      return;
    }

    const save = event.target?.closest?.('[data-crablink-save-profile-draft]');
    if (save) {
      event.preventDefault();
      void saveProfileDraftFromForm();
      return;
    }

    const clear = event.target?.closest?.('[data-crablink-clear-profile-draft]');
    if (clear) {
      event.preventDefault();
      void clearProfileDraftAndRefresh();
      return;
    }

    const copy = event.target?.closest?.('[data-crablink-copy-profile-template]');
    if (copy) {
      event.preventDefault();
      void copyPublicProfileTemplate();
      return;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeProfileEditor({ announce: false });
    }
  });
}

async function openProfileEditor(context = {}) {
  lastContext = normalizeContext(context);

  const draft = await getProfileDraft();
  const sheet = ensureSheet();
  const panel = sheet.querySelector(`#${PANEL_ID}`);

  panel.textContent = '';

  const head = document.createElement('div');
  head.className = 'profile-editor-head';

  const titleWrap = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'profile-editor-eyebrow';
  eyebrow.textContent = 'Local profile draft';

  const title = document.createElement('h3');
  title.textContent = 'Create / Edit Profile';

  const subtitle = document.createElement('p');
  subtitle.className = 'profile-editor-subtitle';
  subtitle.textContent =
    'Draft SSO profile fields locally. These are not published or backend-confirmed until RustyOnions profile manifests exist.';

  titleWrap.append(eyebrow, title, subtitle);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'profile-editor-close';
  close.textContent = '×';
  close.title = 'Close profile editor';
  close.addEventListener('click', () => closeProfileEditor());

  head.append(titleWrap, close);

  const form = document.createElement('form');
  form.id = 'profileEditorForm';
  form.className = 'profile-editor-form';
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void saveProfileDraftFromForm();
  });

  form.append(
    textField({
      id: 'profileEditorDisplayName',
      label: 'Display name',
      value: draft.displayName || displayNameFromHandle(lastContext.handle),
      maxLength: 64,
      placeholder: 'Skinnycrabby',
      help: 'Local display name only. Backend profile publishing is not wired yet.'
    }),
    textAreaField({
      id: 'profileEditorBio',
      label: 'Bio',
      value: draft.bio,
      maxLength: 240,
      placeholder: 'Write a short public profile bio.',
      help: 'Keep this public-safe. Do not include secrets, recovery phrases, or private account details.'
    }),
    textField({
      id: 'profileEditorAvatarCrabUrl',
      label: 'Avatar image crab:// URL',
      value: draft.avatarCrabUrl,
      maxLength: 96,
      placeholder: 'crab://<64hex>.image',
      help: 'Optional. Must be a canonical image URL if provided.'
    }),
    textField({
      id: 'profileEditorTags',
      label: 'Tags',
      value: draft.tags.join(', '),
      maxLength: 160,
      placeholder: 'creator, music, articles',
      help: 'Comma-separated local tags. Public profile catalogue is future backend work.'
    })
  );

  const status = document.createElement('div');
  status.id = 'profileEditorStatus';
  status.className = 'profile-editor-status';
  status.textContent = draft.exists
    ? `Local draft saved ${formatDate(draft.updatedAt || draft.createdAt)}.`
    : 'No local profile draft saved yet.';

  const ruleGrid = document.createElement('div');
  ruleGrid.className = 'profile-editor-rule-grid';

  ruleGrid.append(
    ruleCard('Local only', 'Saving here writes to this Chrome profile only, not RustyOnions backend truth.'),
    ruleCard('No wallet authority', 'Profiles do not contain spend permission, keys, seed phrases, or ledger truth.'),
    ruleCard('Backend pending', 'Public profile CIDs, reputation, and moderator scores remain blank until backend DTOs exist.')
  );

  const actions = document.createElement('div');
  actions.className = 'profile-editor-actions';

  const save = document.createElement('button');
  save.type = 'submit';
  save.textContent = 'Save Local Draft';
  save.setAttribute('data-crablink-save-profile-draft', '1');

  const copyTemplate = document.createElement('button');
  copyTemplate.type = 'button';
  copyTemplate.className = 'secondary';
  copyTemplate.textContent = 'Copy Public Template';
  copyTemplate.setAttribute('data-crablink-copy-profile-template', '1');

  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'secondary danger-lite';
  clear.textContent = 'Clear Draft';
  clear.disabled = !draft.exists;
  clear.setAttribute('data-crablink-clear-profile-draft', '1');

  const closeBottom = document.createElement('button');
  closeBottom.type = 'button';
  closeBottom.className = 'secondary';
  closeBottom.textContent = 'Close';
  closeBottom.addEventListener('click', () => closeProfileEditor());

  actions.append(save, copyTemplate, clear, closeBottom);

  form.append(status, actions);
  panel.append(head, ruleGrid, form);

  sheet.classList.remove('hidden');
  sheet.setAttribute('aria-hidden', 'false');
  close.focus({ preventScroll: true });

  setFooter('Opened local profile editor.');
}

function ensureSheet() {
  let sheet = document.getElementById(SHEET_ID);
  if (sheet) return sheet;

  sheet = document.createElement('section');
  sheet.id = SHEET_ID;
  sheet.className = 'profile-editor-sheet hidden';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-hidden', 'true');
  sheet.setAttribute('aria-label', 'Local profile editor');

  const scrim = document.createElement('button');
  scrim.type = 'button';
  scrim.className = 'profile-editor-scrim';
  scrim.title = 'Close profile editor';
  scrim.addEventListener('click', () => closeProfileEditor());

  const panel = document.createElement('article');
  panel.id = PANEL_ID;
  panel.className = 'profile-editor-panel';

  sheet.append(scrim, panel);
  document.body.append(sheet);

  return sheet;
}

function closeProfileEditor({ announce = true } = {}) {
  const sheet = document.getElementById(SHEET_ID);
  if (!sheet) return;

  sheet.classList.add('hidden');
  sheet.setAttribute('aria-hidden', 'true');

  if (announce) setFooter('Profile editor closed.');
}

async function saveProfileDraftFromForm() {
  const draft = readDraftFromForm();
  const status = document.getElementById('profileEditorStatus');

  if (!draft.ok) {
    if (status) {
      status.className = 'profile-editor-status error';
      status.textContent = draft.error || 'Profile draft is invalid.';
    }
    return;
  }

  await setProfileDraft(draft.value);

  if (status) {
    status.className = 'profile-editor-status ok';
    status.textContent = 'Local profile draft saved.';
  }

  document.dispatchEvent(new CustomEvent('crablink:profile-draft-updated', { detail: draft.value }));
  setFooter('Saved local profile draft.');
}

function readDraftFromForm() {
  const displayName = clean(document.getElementById('profileEditorDisplayName')?.value);
  const bio = clean(document.getElementById('profileEditorBio')?.value);
  const avatarCrabUrl = clean(document.getElementById('profileEditorAvatarCrabUrl')?.value);
  const tagsRaw = clean(document.getElementById('profileEditorTags')?.value);

  if (displayName.length > 64) {
    return { ok: false, error: 'Display name must be 64 characters or less.' };
  }

  if (bio.length > 240) {
    return { ok: false, error: 'Bio must be 240 characters or less.' };
  }

  if (avatarCrabUrl && !/^crab:\/\/[0-9a-f]{64}\.image$/i.test(avatarCrabUrl)) {
    return { ok: false, error: 'Avatar must be empty or crab://<64hex>.image.' };
  }

  const tags = normalizeTags(tagsRaw);
  if (!tags.ok) return tags;

  const now = new Date().toISOString();

  return {
    ok: true,
    value: {
      schema: 'crablink.local-profile-draft.v1',
      status: 'local_private_draft',
      handle: clean(lastContext.handle),
      passportSubject: clean(lastContext.passportSubject),
      walletLabel: clean(lastContext.walletAccount),
      displayName,
      bio,
      avatarCrabUrl: avatarCrabUrl.toLowerCase(),
      tags: tags.value,
      createdAt: now,
      updatedAt: now,
      backendPublished: false,
      publicProfileCid: '',
      profileCrabUrl: '',
      warnings: [
        'local-only draft',
        'backend profile publishing is not wired yet',
        'no wallet authority',
        'no private key material'
      ]
    }
  };
}

function normalizeTags(value) {
  if (!value) return { ok: true, value: [] };

  const tags = value
    .split(',')
    .map((item) => clean(item).toLowerCase())
    .filter(Boolean)
    .map((item) => item.replace(/^#+/, ''));

  const unique = Array.from(new Set(tags)).slice(0, 12);

  for (const tag of unique) {
    if (!/^[a-z0-9][a-z0-9._-]{0,31}$/.test(tag)) {
      return { ok: false, error: `Invalid tag: ${tag}` };
    }
  }

  return { ok: true, value: unique };
}

async function copyPublicProfileTemplate() {
  const draftResult = readDraftFromForm();
  const draft = draftResult.ok ? draftResult.value : await getProfileDraft();

  const template = {
    schema: 'ron.profile.public.template.v1',
    status: 'template_only_not_backend_confirmed',
    handle: clean(draft.handle || lastContext.handle),
    display_name: clean(draft.displayName),
    bio: clean(draft.bio),
    avatar_crab_url: clean(draft.avatarCrabUrl),
    tags: Array.isArray(draft.tags) ? draft.tags : [],
    future_public_url: 'crab://<b3-of-profile-public-manifest>.profile',
    must_not_include: [
      'private keys',
      'seed phrases',
      'wallet spend authority',
      'private alt mappings',
      'private receipts',
      'recovery material',
      'private device identifiers'
    ],
    note: 'Template only. Backend profile publishing is not wired yet.'
  };

  await copyText(JSON.stringify(template, null, 2), 'Copied public profile template.');
}

async function clearProfileDraftAndRefresh() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.remove(PROFILE_DRAFT_KEY);
  }

  document.dispatchEvent(new CustomEvent('crablink:profile-draft-updated', { detail: null }));
  await openProfileEditor(lastContext);
  setFooter('Cleared local profile draft.');
}

async function getProfileDraft() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return emptyDraft();
  }

  const stored = await chrome.storage.local.get([PROFILE_DRAFT_KEY]);
  return normalizeProfileDraft(stored?.[PROFILE_DRAFT_KEY]);
}

async function setProfileDraft(draft) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;

  await chrome.storage.local.set({
    [PROFILE_DRAFT_KEY]: normalizeProfileDraft(draft)
  });
}

function normalizeProfileDraft(value) {
  const draft = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  if (!draft) return emptyDraft();

  const tags = Array.isArray(draft.tags)
    ? draft.tags.map((tag) => clean(tag).toLowerCase()).filter(Boolean).slice(0, 12)
    : [];

  return {
    exists: true,
    schema: 'crablink.local-profile-draft.v1',
    status: clean(draft.status) || 'local_private_draft',
    handle: clean(draft.handle),
    passportSubject: clean(draft.passportSubject),
    walletLabel: clean(draft.walletLabel),
    displayName: clean(draft.displayName),
    bio: clean(draft.bio),
    avatarCrabUrl: clean(draft.avatarCrabUrl),
    tags,
    createdAt: clean(draft.createdAt),
    updatedAt: clean(draft.updatedAt),
    backendPublished: draft.backendPublished === true,
    publicProfileCid: clean(draft.publicProfileCid),
    profileCrabUrl: clean(draft.profileCrabUrl),
    warnings: Array.isArray(draft.warnings) ? draft.warnings.map(clean).filter(Boolean) : []
  };
}

function emptyDraft() {
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

function normalizeContext(context) {
  return {
    handle: clean(context.handle),
    passportSubject: clean(context.passportSubject || context.passport_subject),
    walletAccount: clean(context.walletAccount || context.wallet_account)
  };
}

function textField({ id, label, value, maxLength, placeholder, help }) {
  const wrap = document.createElement('label');
  wrap.className = 'profile-editor-field';
  wrap.setAttribute('for', id);

  const labelText = document.createElement('span');
  labelText.textContent = label;

  const input = document.createElement('input');
  input.id = id;
  input.type = 'text';
  input.value = clean(value);
  input.maxLength = maxLength;
  input.placeholder = placeholder || '';
  input.autocomplete = 'off';
  input.spellcheck = false;

  const helpText = document.createElement('small');
  helpText.textContent = help || '';

  wrap.append(labelText, input, helpText);
  return wrap;
}

function textAreaField({ id, label, value, maxLength, placeholder, help }) {
  const wrap = document.createElement('label');
  wrap.className = 'profile-editor-field';
  wrap.setAttribute('for', id);

  const labelText = document.createElement('span');
  labelText.textContent = label;

  const input = document.createElement('textarea');
  input.id = id;
  input.value = clean(value);
  input.maxLength = maxLength;
  input.placeholder = placeholder || '';
  input.rows = 4;
  input.spellcheck = true;

  const helpText = document.createElement('small');
  helpText.textContent = help || '';

  wrap.append(labelText, input, helpText);
  return wrap;
}

function ruleCard(title, copy) {
  const card = document.createElement('article');
  card.className = 'profile-editor-rule-card';

  const h = document.createElement('h4');
  h.textContent = title;

  const p = document.createElement('p');
  p.textContent = copy;

  card.append(h, p);
  return card;
}

function displayNameFromHandle(handle) {
  const raw = clean(handle).replace(/^@+/, '');
  if (!raw || raw === 'username') return '';

  return raw
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
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

function formatDate(value) {
  const raw = clean(value);
  if (!raw) return '';

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  return date.toLocaleString();
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
    .profile-editor-sheet.hidden { display: none !important; }

    .profile-editor-sheet {
      position: fixed;
      inset: 0;
      z-index: 99;
      display: grid;
      place-items: center;
      padding: 24px;
    }

    .profile-editor-scrim {
      position: absolute;
      inset: 0;
      border: 0;
      border-radius: 0;
      padding: 0;
      background: rgba(2, 6, 23, 0.70);
      cursor: pointer;
    }

    .profile-editor-scrim:hover {
      transform: none;
      background: rgba(2, 6, 23, 0.76);
    }

    .profile-editor-panel {
      position: relative;
      z-index: 1;
      width: min(940px, calc(100vw - 44px));
      max-height: min(850px, calc(100vh - 44px));
      overflow: auto;
      display: grid;
      gap: 16px;
      padding: 22px;
      border: 1px solid rgba(34, 197, 94, 0.34);
      border-radius: 28px;
      background:
        radial-gradient(circle at top left, rgba(34, 197, 94, 0.17), transparent 42%),
        linear-gradient(180deg, rgba(17, 28, 49, 0.98), rgba(8, 17, 34, 0.98));
      box-shadow: 0 30px 100px rgba(0, 0, 0, 0.58);
      color: #f8fafc;
    }

    .profile-editor-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: start;
    }

    .profile-editor-eyebrow {
      margin: 0 0 6px;
      color: #86efac;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .profile-editor-head h3 {
      margin: 0;
      color: #bbf7d0;
      font-size: clamp(30px, 4vw, 46px);
      line-height: 1;
      letter-spacing: -0.06em;
    }

    .profile-editor-subtitle {
      margin: 8px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .profile-editor-close {
      width: 48px;
      height: 48px;
      border-radius: 16px;
      padding: 0;
      font-size: 28px;
      line-height: 1;
    }

    .profile-editor-rule-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .profile-editor-rule-card {
      padding: 14px;
      border: 1px solid rgba(34, 197, 94, 0.22);
      border-radius: 18px;
      background: rgba(2, 6, 23, 0.34);
    }

    .profile-editor-rule-card h4 {
      margin: 0;
      color: #bbf7d0;
      font-size: 15px;
    }

    .profile-editor-rule-card p {
      margin: 7px 0 0;
      color: #cbd5e1;
      font-size: 13px;
      line-height: 1.4;
    }

    .profile-editor-form {
      display: grid;
      gap: 13px;
    }

    .profile-editor-field {
      display: grid;
      gap: 7px;
    }

    .profile-editor-field span {
      color: #a7f3d0;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .profile-editor-field input,
    .profile-editor-field textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 14px;
      background: rgba(2, 6, 23, 0.42);
      color: #f8fafc;
      padding: 12px 13px;
      font: inherit;
      font-weight: 800;
      outline: none;
    }

    .profile-editor-field textarea {
      resize: vertical;
      line-height: 1.45;
      font-weight: 700;
    }

    .profile-editor-field input:focus,
    .profile-editor-field textarea:focus {
      border-color: rgba(96, 165, 250, 0.70);
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.16);
    }

    .profile-editor-field small {
      color: #94a3b8;
      line-height: 1.35;
    }

    .profile-editor-status {
      padding: 11px 13px;
      border: 1px solid rgba(148, 163, 184, 0.20);
      border-radius: 14px;
      color: #cbd5e1;
      background: rgba(2, 6, 23, 0.28);
      font-weight: 800;
    }

    .profile-editor-status.ok {
      border-color: rgba(34, 197, 94, 0.34);
      color: #bbf7d0;
    }

    .profile-editor-status.error {
      border-color: rgba(248, 113, 113, 0.34);
      color: #fecaca;
    }

    .profile-editor-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }

    .profile-editor-actions button {
      min-width: 150px;
    }

    .profile-editor-actions .danger-lite {
      border-color: rgba(248, 113, 113, 0.26);
      color: #fecaca;
    }

    @media (max-width: 720px) {
      .profile-editor-rule-grid {
        grid-template-columns: 1fr;
      }

      .profile-editor-actions {
        display: grid;
        grid-template-columns: 1fr;
      }

      .profile-editor-actions button {
        min-width: 0;
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