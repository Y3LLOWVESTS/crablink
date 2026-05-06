/**
 * RO:WHAT — Adds a private local Alt Vault scaffold to CrabLink's Passport drawer.
 * RO:WHY — NEXT_LEVEL identity UX; Concerns: DX/SEC; let users explicitly create/load alt drafts without fake public .alt truth.
 * RO:INTERACTS — page.html, page-local-catalog.js Passport drawer controls, chrome.storage.local.
 * RO:INVARIANTS — local-only drafts; no backend mutation; no public b3 .alt claim; no wallet/ledger/index/passport truth invented.
 * RO:METRICS — none; client-side local UX state only.
 * RO:CONFIG — stores local private drafts under crablinkAltDraftsV1.
 * RO:SECURITY — no private keys; no spend authority; no public main linkage; public-safe template excludes parent/user/wallet linkage.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual Passport → Create Alt → Create Alt Draft / Load Alt.
 */

const STYLE_ID = 'crablinkAltVaultStyles';
const SHEET_ID = 'crablinkAltVaultSheet';
const PANEL_ID = 'crablinkAltVaultPanel';
const ALT_ROW_ID = 'passportAltVaultRow';
const DRAFTS_KEY = 'crablinkAltDraftsV1';
const MAX_DRAFTS = 24;

let installTimer = 0;

function boot() {
  installStyles();
  scheduleInstall();

  window.setTimeout(scheduleInstall, 100);
  window.setTimeout(scheduleInstall, 350);
  window.setTimeout(scheduleInstall, 1200);

  const observed = document.body || document.documentElement;
  if (observed) {
    const observer = new MutationObserver(scheduleInstall);
    observer.observe(observed, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && Object.prototype.hasOwnProperty.call(changes, DRAFTS_KEY)) {
        scheduleInstall();
      }
    });
  }

  document.addEventListener('click', (event) => {
    const passportButton = event.target?.closest?.('#passportButton');
    if (passportButton) {
      window.setTimeout(scheduleInstall, 0);
      window.setTimeout(scheduleInstall, 120);
      return;
    }

    const open = event.target?.closest?.('[data-crablink-open-alt-vault]');
    if (open) {
      event.preventDefault();
      void openAltVaultFromPassport();
      return;
    }

    const create = event.target?.closest?.('[data-crablink-create-alt-draft]');
    if (create) {
      event.preventDefault();
      void createAltDraftAndRefresh();
      return;
    }

    const copyPublic = event.target?.closest?.('[data-crablink-copy-alt-public-template]');
    if (copyPublic) {
      event.preventDefault();
      const localId = copyPublic.getAttribute('data-crablink-copy-alt-public-template') || '';
      void copyPublicSafeTemplate(localId);
      return;
    }

    const copyValue = event.target?.closest?.('[data-crablink-copy-alt-value]')?.getAttribute('data-crablink-copy-alt-value');
    if (copyValue) {
      event.preventDefault();
      void copyText(copyValue, 'Copied alt draft value.');
      return;
    }

    const deleteId = event.target?.closest?.('[data-crablink-delete-alt-draft]')?.getAttribute('data-crablink-delete-alt-draft');
    if (deleteId) {
      event.preventDefault();
      void deleteAltDraftAndRefresh(deleteId);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAltVault({ announce: false });
    }
  });
}

function scheduleInstall() {
  window.clearTimeout(installTimer);
  installTimer = window.setTimeout(() => {
    void installAltVaultButton();
  }, 60);
}

async function installAltVaultButton() {
  const drawer = document.getElementById('passportDrawer');
  if (!drawer) return;

  const drawerActions = drawer.querySelector('.drawer-actions');
  const drawerMessage = document.getElementById('drawerMessage');
  if (!drawerActions) return;

  removeOldInlineAltButtons();

  let row = document.getElementById(ALT_ROW_ID);
  if (!row) {
    row = document.createElement('section');
    row.id = ALT_ROW_ID;
    row.className = 'passport-alt-vault-row';

    if (drawerMessage) {
      drawer.insertBefore(row, drawerMessage);
    } else if (drawerActions.nextSibling) {
      drawer.insertBefore(row, drawerActions.nextSibling);
    } else {
      drawer.append(row);
    }
  }

  let button = row.querySelector('[data-crablink-open-alt-vault]');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary passport-alt-vault-button';
    button.title = 'Create or load private local alt drafts.';
    button.setAttribute('data-crablink-open-alt-vault', '1');
    row.append(button);
  }

  const drafts = await getDrafts();
  button.textContent = drafts.length > 0 ? 'Load Alt' : 'Create Alt';
  button.title =
    drafts.length > 0
      ? `Load private local alt draft${drafts.length === 1 ? '' : 's'} (${drafts.length}).`
      : 'Open the private Alt Vault and explicitly create a local alt draft.';
}

function removeOldInlineAltButtons() {
  for (const button of document.querySelectorAll('.passport-catalog-action-row [data-crablink-open-alt-vault]')) {
    button.remove();
  }

  for (const row of document.querySelectorAll('.passport-catalog-action-row.has-alt-vault')) {
    row.classList.remove('has-alt-vault');
  }
}

async function openAltVaultFromPassport() {
  await openAltVault();
}

async function openAltVault() {
  const drafts = await getDrafts();
  const sheet = ensureSheet();
  const panel = sheet.querySelector(`#${PANEL_ID}`);

  panel.textContent = '';

  const head = document.createElement('div');
  head.className = 'alt-vault-head';

  const titleWrap = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'alt-vault-eyebrow';
  eyebrow.textContent = 'Private local alt vault';

  const title = document.createElement('h3');
  title.textContent = 'Alt Drafts';

  const subtitle = document.createElement('p');
  subtitle.className = 'alt-vault-subtitle';
  subtitle.textContent =
    'Local-only pseudonymous identity drafts. These are not public .alt identities until RustyOnions supports backend alt root manifests.';

  titleWrap.append(eyebrow, title, subtitle);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'alt-vault-close';
  close.textContent = '×';
  close.title = 'Close Alt Vault';
  close.addEventListener('click', () => closeAltVault());

  head.append(titleWrap, close);

  const ruleGrid = document.createElement('div');
  ruleGrid.className = 'alt-vault-rule-grid';

  ruleGrid.append(
    ruleCard('No public main linkage', 'Alt drafts do not publish which main passport created them.'),
    ruleCard('No b3 claim yet', 'Public .alt IDs must later be b3 hashes of backend-confirmed alt public roots.'),
    ruleCard('No wallet authority', 'Alt drafts do not inherit wallet spend permission or ledger authority.')
  );

  const body = document.createElement('div');
  body.className = 'alt-vault-body';

  if (drafts.length === 0) {
    body.append(emptyState());
  } else {
    body.append(draftsTable(drafts));
  }

  const note = document.createElement('p');
  note.className = 'alt-vault-note';
  note.textContent =
    'This vault is a local planning surface only. Do not treat these drafts as real network identities, public b3 roots, wallets, or anonymity guarantees.';

  const actions = document.createElement('div');
  actions.className = 'alt-vault-actions';

  const create = document.createElement('button');
  create.type = 'button';
  create.textContent = drafts.length === 0 ? 'Create Alt Draft' : 'Create Another Alt Draft';
  create.setAttribute('data-crablink-create-alt-draft', '1');

  const copyAll = document.createElement('button');
  copyAll.type = 'button';
  copyAll.className = 'secondary';
  copyAll.textContent = 'Copy Local JSON';
  copyAll.disabled = drafts.length === 0;
  copyAll.setAttribute('data-crablink-copy-alt-value', JSON.stringify(drafts, null, 2));

  const closeBottom = document.createElement('button');
  closeBottom.type = 'button';
  closeBottom.className = 'secondary';
  closeBottom.textContent = 'Close';
  closeBottom.addEventListener('click', () => closeAltVault());

  actions.append(create, copyAll, closeBottom);

  panel.append(head, ruleGrid, body, note, actions);

  sheet.classList.remove('hidden');
  sheet.setAttribute('aria-hidden', 'false');
  close.focus({ preventScroll: true });

  setFooter(
    drafts.length === 0
      ? 'Alt Vault opened. Click Create Alt Draft to make a local-only draft.'
      : 'Opened private local Alt Vault.'
  );
}

function ensureSheet() {
  let sheet = document.getElementById(SHEET_ID);
  if (sheet) return sheet;

  sheet = document.createElement('section');
  sheet.id = SHEET_ID;
  sheet.className = 'alt-vault-sheet hidden';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-hidden', 'true');
  sheet.setAttribute('aria-label', 'Private local alt vault');

  const scrim = document.createElement('button');
  scrim.type = 'button';
  scrim.className = 'alt-vault-scrim';
  scrim.title = 'Close Alt Vault';
  scrim.addEventListener('click', () => closeAltVault());

  const panel = document.createElement('article');
  panel.id = PANEL_ID;
  panel.className = 'alt-vault-panel';

  sheet.append(scrim, panel);
  document.body.append(sheet);

  return sheet;
}

function closeAltVault({ announce = true } = {}) {
  const sheet = document.getElementById(SHEET_ID);
  if (!sheet) return;

  sheet.classList.add('hidden');
  sheet.setAttribute('aria-hidden', 'true');

  if (announce) setFooter('Alt Vault closed.');
}

function ruleCard(title, copy) {
  const card = document.createElement('article');
  card.className = 'alt-vault-rule-card';

  const h = document.createElement('h4');
  h.textContent = title;

  const p = document.createElement('p');
  p.textContent = copy;

  card.append(h, p);
  return card;
}

function emptyState() {
  const empty = document.createElement('div');
  empty.className = 'alt-vault-empty';

  const title = document.createElement('h4');
  title.textContent = 'No alt drafts yet';

  const copy = document.createElement('p');
  copy.textContent =
    'Click Create Alt Draft to make a local planning draft. It will remain private and local until real backend alt roots exist.';

  empty.append(title, copy);
  return empty;
}

function draftsTable(drafts) {
  const wrap = document.createElement('div');
  wrap.className = 'alt-vault-table-wrap';

  const table = document.createElement('table');
  table.className = 'alt-vault-table';

  const thead = document.createElement('thead');
  const header = document.createElement('tr');

  for (const label of ['Draft', 'Local ID', 'Public status', 'Privacy', 'Created', 'Actions']) {
    const th = document.createElement('th');
    th.textContent = label;
    header.append(th);
  }

  thead.append(header);

  const tbody = document.createElement('tbody');

  for (const draft of drafts) {
    const tr = document.createElement('tr');

    appendTextCell(tr, draft.label);
    appendTextCell(tr, shortId(draft.localId));
    appendTextCell(tr, draft.publicIdStatus);
    appendTextCell(tr, draft.privacyMode);
    appendTextCell(tr, formatDate(draft.createdAt));

    const actions = document.createElement('td');
    actions.className = 'alt-vault-row-actions';

    actions.append(
      rowButton('Copy Draft', 'data-crablink-copy-alt-value', JSON.stringify(draft, null, 2)),
      rowButton('Copy Public-Safe Template', 'data-crablink-copy-alt-public-template', draft.localId),
      rowButton('Delete', 'data-crablink-delete-alt-draft', draft.localId, 'danger')
    );

    tr.append(actions);
    tbody.append(tr);
  }

  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function appendTextCell(row, value) {
  const td = document.createElement('td');
  td.textContent = clean(value) || '—';
  row.append(td);
}

function rowButton(label, attr, value, variant = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = variant === 'danger' ? 'alt-vault-row-button danger' : 'alt-vault-row-button';
  button.textContent = label;
  button.setAttribute(attr, value);
  return button;
}

async function createAltDraftAndRefresh() {
  const drafts = await getDrafts();
  const draft = generateAltDraft(drafts.length + 1);

  await setDrafts([draft, ...drafts].slice(0, MAX_DRAFTS));
  await openAltVault();
  await installAltVaultButton();

  setFooter('Created local alt draft. Public .alt b3 root is pending backend support.');
}

function generateAltDraft(index) {
  const now = new Date().toISOString();
  const entropy = generateRandomHex(32);
  const suffix = entropy.slice(0, 8);

  return {
    schema: 'crablink.local-alt-draft.v1',
    label: `Alt Draft ${index}`,
    localId: makeLocalId(),
    localEntropyHint: entropy,
    createdAt: now,
    updatedAt: now,
    status: 'local_private_draft',
    publicIdStatus: 'public ID pending backend b3 root',
    expectedFutureRoute: 'crab://<b3-of-alt-public-root>.alt',
    privacyMode: 'No public main linkage',
    walletAuthority: 'none',
    networkPublished: false,
    notes:
      `Local planning draft ${suffix}. Do not publish parent relationship, funding source, main wallet, main profile, or device identity.`
  };
}

function makeLocalId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `local-alt-${crypto.randomUUID()}`;
  }

  return `local-alt-${generateRandomHex(16)}`;
}

function generateRandomHex(byteCount) {
  const bytes = new Uint8Array(byteCount);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function copyPublicSafeTemplate(localId) {
  const drafts = await getDrafts();
  const draft = drafts.find((item) => item.localId === localId);
  if (!draft) {
    setFooter('Alt draft not found.');
    return;
  }

  const publicSafeTemplate = {
    schema: 'ron.alt.public-root.template.v1',
    status: 'template_only_not_backend_confirmed',
    kind: 'alt',
    public_random_nonce_required: true,
    independent_alt_public_key_required: true,
    optional_alt_profile_pointer: null,
    must_not_include: [
      'main passport ID',
      'main username',
      'main wallet account',
      'main public key',
      'funding source',
      'local device ID',
      'parent relationship',
      'private main-to-alt linkage'
    ],
    future_public_url: 'crab://<b3-of-alt-public-root>.alt',
    local_reference: {
      draft_label: draft.label,
      local_id: draft.localId,
      created_at: draft.createdAt
    }
  };

  await copyText(JSON.stringify(publicSafeTemplate, null, 2), 'Copied public-safe alt root template.');
}

async function deleteAltDraftAndRefresh(localId) {
  const drafts = await getDrafts();
  const next = drafts.filter((draft) => draft.localId !== localId);

  await setDrafts(next);
  await openAltVault();
  await installAltVaultButton();

  setFooter('Deleted local alt draft.');
}

async function getDrafts() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];

  const stored = await chrome.storage.local.get([DRAFTS_KEY]);
  const raw = Array.isArray(stored?.[DRAFTS_KEY]) ? stored[DRAFTS_KEY] : [];

  return raw.map(normalizeDraft).filter((draft) => draft.localId).slice(0, MAX_DRAFTS);
}

async function setDrafts(drafts) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;

  await chrome.storage.local.set({
    [DRAFTS_KEY]: Array.isArray(drafts) ? drafts.map(normalizeDraft).slice(0, MAX_DRAFTS) : []
  });
}

function normalizeDraft(value) {
  const draft = value && typeof value === 'object' ? value : {};
  const now = new Date().toISOString();

  return {
    schema: 'crablink.local-alt-draft.v1',
    label: clean(draft.label) || 'Alt Draft',
    localId: clean(draft.localId),
    localEntropyHint: clean(draft.localEntropyHint),
    createdAt: clean(draft.createdAt) || now,
    updatedAt: clean(draft.updatedAt) || clean(draft.createdAt) || now,
    status: clean(draft.status) || 'local_private_draft',
    publicIdStatus: clean(draft.publicIdStatus) || 'public ID pending backend b3 root',
    expectedFutureRoute: clean(draft.expectedFutureRoute) || 'crab://<b3-of-alt-public-root>.alt',
    privacyMode: clean(draft.privacyMode) || 'No public main linkage',
    walletAuthority: clean(draft.walletAuthority) || 'none',
    networkPublished: draft.networkPublished === true,
    notes: clean(draft.notes)
  };
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

function shortId(value) {
  const raw = clean(value);
  if (raw.length <= 22) return raw || '—';
  return `${raw.slice(0, 12)}…${raw.slice(-8)}`;
}

function formatDate(value) {
  const raw = clean(value);
  if (!raw) return '—';

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
    .passport-alt-vault-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      margin-top: 10px;
      margin-bottom: 10px;
    }

    .passport-alt-vault-button {
      width: 100%;
      min-height: 42px;
      padding: 10px 12px;
      border-radius: 14px;
      border-color: rgba(196, 181, 253, 0.34) !important;
      background:
        radial-gradient(circle at top left, rgba(168, 85, 247, 0.18), transparent 48%),
        rgba(71, 85, 105, 0.78) !important;
      color: #f8fafc !important;
      font-size: 13px;
      font-weight: 950;
    }

    .passport-alt-vault-button:hover {
      border-color: rgba(196, 181, 253, 0.56) !important;
      background:
        radial-gradient(circle at top left, rgba(168, 85, 247, 0.26), transparent 48%),
        rgba(79, 70, 229, 0.72) !important;
    }

    .alt-vault-sheet.hidden {
      display: none !important;
    }

    .alt-vault-sheet {
      position: fixed;
      inset: 0;
      z-index: 98;
      display: grid;
      place-items: center;
      padding: 24px;
    }

    .alt-vault-scrim {
      position: absolute;
      inset: 0;
      border: 0;
      border-radius: 0;
      padding: 0;
      background: rgba(2, 6, 23, 0.70);
      cursor: pointer;
    }

    .alt-vault-scrim:hover {
      transform: none;
      background: rgba(2, 6, 23, 0.76);
    }

    .alt-vault-panel {
      position: relative;
      z-index: 1;
      width: min(1120px, calc(100vw - 44px));
      max-height: min(850px, calc(100vh - 44px));
      overflow: auto;
      display: grid;
      gap: 16px;
      padding: 22px;
      border: 1px solid rgba(196, 181, 253, 0.34);
      border-radius: 28px;
      background:
        radial-gradient(circle at top left, rgba(168, 85, 247, 0.18), transparent 42%),
        linear-gradient(180deg, rgba(17, 28, 49, 0.98), rgba(8, 17, 34, 0.98));
      box-shadow: 0 30px 100px rgba(0, 0, 0, 0.58);
      color: #f8fafc;
    }

    .alt-vault-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: start;
    }

    .alt-vault-eyebrow {
      margin: 0 0 6px;
      color: #c4b5fd;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .alt-vault-head h3 {
      margin: 0;
      color: #ddd6fe;
      font-size: clamp(30px, 4vw, 48px);
      line-height: 1;
      letter-spacing: -0.06em;
    }

    .alt-vault-subtitle,
    .alt-vault-note {
      margin: 8px 0 0;
      color: #cbd5e1;
      font-size: 14px;
      line-height: 1.45;
    }

    .alt-vault-close {
      width: 48px;
      height: 48px;
      border-radius: 16px;
      padding: 0;
      font-size: 28px;
      line-height: 1;
    }

    .alt-vault-rule-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .alt-vault-rule-card {
      padding: 14px;
      border: 1px solid rgba(196, 181, 253, 0.22);
      border-radius: 18px;
      background: rgba(2, 6, 23, 0.34);
    }

    .alt-vault-rule-card h4 {
      margin: 0;
      color: #ddd6fe;
      font-size: 15px;
    }

    .alt-vault-rule-card p {
      margin: 7px 0 0;
      color: #cbd5e1;
      font-size: 13px;
      line-height: 1.4;
    }

    .alt-vault-table-wrap {
      overflow: auto;
      border: 1px solid rgba(148, 163, 184, 0.20);
      border-radius: 18px;
      background: rgba(2, 6, 23, 0.30);
    }

    .alt-vault-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 980px;
    }

    .alt-vault-table th,
    .alt-vault-table td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      text-align: left;
      vertical-align: top;
    }

    .alt-vault-table th {
      color: #ddd6fe;
      background: rgba(15, 23, 42, 0.74);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .alt-vault-table td {
      color: #f8fafc;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .alt-vault-row-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      min-width: 330px;
    }

    .alt-vault-row-button {
      min-height: 30px;
      padding: 6px 9px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 950;
    }

    .alt-vault-row-button.danger {
      border-color: rgba(248, 113, 113, 0.32);
      background: rgba(127, 29, 29, 0.34);
      color: #fecaca;
    }

    .alt-vault-empty {
      padding: 22px;
      border: 1px solid rgba(196, 181, 253, 0.20);
      border-radius: 18px;
      background: rgba(2, 6, 23, 0.34);
    }

    .alt-vault-empty h4 {
      margin: 0;
      color: #ddd6fe;
      font-size: 22px;
    }

    .alt-vault-empty p {
      margin: 8px 0 0;
      color: #cbd5e1;
    }

    .alt-vault-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }

    .alt-vault-actions button {
      min-width: 160px;
    }

    @media (max-width: 720px) {
      .alt-vault-rule-grid {
        grid-template-columns: 1fr;
      }

      .alt-vault-actions {
        display: grid;
        grid-template-columns: 1fr;
      }

      .alt-vault-actions button {
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