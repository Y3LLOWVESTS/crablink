/**
 * RO:WHAT — Adds an honest local article-draft workspace to crab://article.
 * RO:WHY — NEXT_LEVEL text-asset foundation; Concerns: DX/SEC; prepare the .article UX without pretending backend publication exists.
 * RO:INTERACTS — page.html, page.js built-in page renderer, chrome.storage.local, svc-gateway future article prepare route.
 * RO:INVARIANTS — local draft first; gateway-only prepare attempt; no fake b3 CID; no fake article upload; no wallet mutation; no silent ROC spending.
 * RO:TRUTH — No b3 CID, No ROC charge, No wallet mutation, and no backend publication claim from local drafts.
 * RO:METRICS — backend correlation IDs are generated for prepare attempts.
 * RO:CONFIG — stores crablinkArticleDraftV1 in chrome.storage.local; reads gateway/passport/wallet labels from local settings.
 * RO:SECURITY — textContent/createElement only; no private keys; no direct internal service calls; no executable article body.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://article.
 */

const STYLE_ID = 'crablinkArticleDraftStyles';
const ARTICLE_SECTION_ID = 'articleDraftSection';
const PREPARE_STATUS_ID = 'articleGatewayPrepareStatus';
const PREPARE_RESULT_ID = 'articleGatewayPrepareResult';
const DRAFT_KEY = 'crablinkArticleDraftV1';
const BUILTIN_SCHEMA = 'omnigate.builtin-page.v1';
const ARTICLE_VIEW_CLASS = 'crablink-article-draft-view-mode';
const PROFILE_VIEW_CLASS = 'crablink-profile-view-mode';
const FUTURE_ARTICLE_PREPARE_ROUTE = '/assets/article/prepare';

const DEFAULT_DRAFT = {
  schema: 'crablink.article-draft.local.v1',
  title: '',
  subtitle: '',
  summary: '',
  body: '',
  tags: '',
  language: 'en',
  license: 'all-rights-reserved',
  authorHandle: '',
  updatedAt: ''
};

let renderTimer = 0;
let saveTimer = 0;
let lastRouteSignature = '';
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
    renderArticleDraftWorkspace().catch((error) => {
      setFooter(`Article draft skipped: ${error?.message || error}`);
    });
  }, 90);
}

async function renderArticleDraftWorkspace() {
  if (!isArticlePage()) {
    lastRouteSignature = '';
    lastPrepareResponse = null;
    document.body?.classList.remove(ARTICLE_VIEW_CLASS);
    document.getElementById(ARTICLE_SECTION_ID)?.remove();
    return;
  }

  const pagePanel = document.getElementById('pagePanel');
  if (!pagePanel || pagePanel.classList.contains('hidden')) return;

  enforceArticleOnlyLayout();

  const routeSignature = routeFingerprint();

  let section = document.getElementById(ARTICLE_SECTION_ID);
  if (!section) {
    section = buildArticleSection();
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

  updateArticleStats(section);
  updateArticlePreview(section);
  updateArticleManifest(section);
}

function enforceArticleOnlyLayout() {
  document.body?.classList.add(ARTICLE_VIEW_CLASS);
  document.body?.classList.remove(PROFILE_VIEW_CLASS);
  document.body?.classList.remove('crablink-site-full-view-mode');

  const profile = document.getElementById('profileHomeSection');
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

function buildArticleSection() {
  const section = document.createElement('section');
  section.id = ARTICLE_SECTION_ID;
  section.className = 'article-draft-section content-section';

  const head = document.createElement('div');
  head.className = 'article-draft-head';

  const copy = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'article-draft-eyebrow';
  eyebrow.textContent = 'NEXT_LEVEL text asset foundation';

  const title = document.createElement('h3');
  title.textContent = 'Article Draft';

  const description = document.createElement('p');
  description.textContent =
    'Write, preview, and prepare a local article draft. Gateway prepare is attempted only through the public gateway route and may return “not wired yet” until backend support lands.';

  copy.append(eyebrow, title, description);

  const badge = document.createElement('span');
  badge.className = 'article-draft-badge';
  badge.textContent = 'draft / prepare';

  head.append(copy, badge);

  const notice = document.createElement('div');
  notice.className = 'article-draft-notice';
  notice.textContent =
    'Truth boundary: this page does not create a b3 CID, does not store bytes, does not charge ROC, and does not claim backend article publication. “Send Prepare Request” is a non-mutating gateway preflight attempt only.';

  const layout = document.createElement('div');
  layout.className = 'article-draft-layout';

  const form = buildArticleForm();
  const preview = buildArticlePreview();

  layout.append(form, preview);

  const manifestPanel = document.createElement('details');
  manifestPanel.className = 'article-draft-manifest';
  manifestPanel.open = true;

  const summary = document.createElement('summary');
  summary.textContent = 'Future article manifest draft';

  const manifestActions = document.createElement('div');
  manifestActions.className = 'article-draft-actions';

  const sendPrepare = actionButton('Send Prepare Request', 'data-article-action', 'send-prepare');
  const copyManifest = actionButton('Copy Manifest JSON', 'data-article-action', 'copy-manifest', true);
  const copyTextButton = actionButton('Copy Plain Text', 'data-article-action', 'copy-text', true);
  const saveDraft = actionButton('Save Local Draft', 'data-article-action', 'save', true);
  const clearDraft = actionButton('Clear Draft', 'data-article-action', 'clear', true);

  manifestActions.append(sendPrepare, copyManifest, copyTextButton, saveDraft, clearDraft);

  const prepareStatus = document.createElement('div');
  prepareStatus.id = PREPARE_STATUS_ID;
  prepareStatus.className = 'article-prepare-status';
  prepareStatus.textContent = 'No article prepare request sent yet.';

  const manifest = document.createElement('pre');
  manifest.id = 'articleManifestPreview';
  manifest.className = 'article-manifest-preview';
  manifest.textContent = '{}';

  const prepareResult = document.createElement('pre');
  prepareResult.id = PREPARE_RESULT_ID;
  prepareResult.className = 'article-prepare-result hidden';
  prepareResult.textContent = 'No prepare response yet.';

  manifestPanel.append(summary, manifestActions, prepareStatus, manifest, prepareResult);

  section.append(head, notice, layout, manifestPanel);

  section.addEventListener('input', (event) => {
    if (!event.target?.closest?.('[data-article-field]')) return;

    updateArticleStats(section);
    updateArticlePreview(section);
    updateArticleManifest(section);
    scheduleAutoSave(section);
  });

  section.addEventListener('click', (event) => {
    const action = event.target?.closest?.('[data-article-action]')?.getAttribute('data-article-action');
    if (!action) return;

    event.preventDefault();

    if (action === 'send-prepare') {
      void sendArticlePrepare(section);
      return;
    }

    if (action === 'copy-manifest') {
      void copyTextValue(JSON.stringify(buildFutureManifest(section), null, 2), 'Article manifest draft copied.');
      return;
    }

    if (action === 'copy-text') {
      void copyTextValue(buildPlainText(section), 'Article plain text copied.');
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

function buildArticleForm() {
  const form = document.createElement('form');
  form.className = 'article-draft-form';

  form.append(
    fieldBlock({
      label: 'Title',
      field: inputField('articleTitle', 'title', 'The Future of CrabLink')
    }),
    fieldBlock({
      label: 'Subtitle',
      field: inputField('articleSubtitle', 'subtitle', 'Optional subtitle')
    }),
    fieldBlock({
      label: 'Summary',
      field: textareaField('articleSummary', 'summary', 'Short teaser or abstract for asset pages and site previews.', 3)
    }),
    fieldBlock({
      label: 'Body',
      field: textareaField('articleBody', 'body', 'Write the article body here. Markdown-style plain text is okay for now.', 14)
    }),
    twoColumn(
      fieldBlock({
        label: 'Tags',
        field: inputField('articleTags', 'tags', 'rustyonions, crablink, web3')
      }),
      fieldBlock({
        label: 'Language',
        field: inputField('articleLanguage', 'language', 'en')
      })
    ),
    twoColumn(
      fieldBlock({
        label: 'License',
        field: selectField('articleLicense', 'license', [
          ['all-rights-reserved', 'All rights reserved'],
          ['cc-by', 'CC BY'],
          ['cc-by-sa', 'CC BY-SA'],
          ['public-domain', 'Public domain / CC0']
        ])
      }),
      fieldBlock({
        label: 'Author handle',
        field: inputField('articleAuthorHandle', 'authorHandle', '@skinnycrabby')
      })
    )
  );

  return form;
}

function buildArticlePreview() {
  const panel = document.createElement('article');
  panel.className = 'article-preview-panel';

  const head = document.createElement('div');
  head.className = 'article-preview-head';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'article-draft-eyebrow';
  eyebrow.textContent = 'Safe local preview';

  const title = document.createElement('h4');
  title.id = 'articlePreviewTitle';
  title.textContent = 'Untitled article';

  const subtitle = document.createElement('p');
  subtitle.id = 'articlePreviewSubtitle';
  subtitle.textContent = 'Subtitle preview will appear here.';

  head.append(eyebrow, title, subtitle);

  const stats = document.createElement('div');
  stats.id = 'articleDraftStats';
  stats.className = 'article-draft-stats';

  const body = document.createElement('div');
  body.id = 'articlePreviewBody';
  body.className = 'article-preview-body';
  body.textContent = 'Start writing to preview the article body.';

  const tags = document.createElement('div');
  tags.id = 'articlePreviewTags';
  tags.className = 'article-preview-tags';

  panel.append(head, stats, body, tags);
  return panel;
}

function fieldBlock({ label, field }) {
  const block = document.createElement('label');
  block.className = 'article-field';

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
  input.dataset.articleField = name;
  return input;
}

function textareaField(id, name, placeholder, rows) {
  const textarea = document.createElement('textarea');
  textarea.id = id;
  textarea.placeholder = placeholder;
  textarea.rows = rows;
  textarea.dataset.articleField = name;
  return textarea;
}

function selectField(id, name, options) {
  const select = document.createElement('select');
  select.id = id;
  select.dataset.articleField = name;

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
  row.className = 'article-two-column';
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
  setField(section, 'subtitle', merged.subtitle);
  setField(section, 'summary', merged.summary);
  setField(section, 'body', merged.body);
  setField(section, 'tags', merged.tags);
  setField(section, 'language', merged.language || 'en');
  setField(section, 'license', merged.license || 'all-rights-reserved');
  setField(section, 'authorHandle', merged.authorHandle || localHandle());
}

function updateArticleStats(section) {
  const stats = section.querySelector('#articleDraftStats');
  if (!stats) return;

  const draft = readDraftFromForm(section);
  const words = wordCount(draft.body);
  const chars = draft.body.length;
  const tagCount = parseTags(draft.tags).length;
  const approxBytes = textByteLength(draft.body || '');

  replaceChildren(
    stats,
    statChip('Words', String(words)),
    statChip('Characters', String(chars)),
    statChip('Body bytes', String(approxBytes)),
    statChip('Tags', String(tagCount)),
    statChip('Publish status', 'not wired')
  );
}

function updateArticlePreview(section) {
  const draft = readDraftFromForm(section);

  setText(section.querySelector('#articlePreviewTitle'), draft.title || 'Untitled article');
  setText(section.querySelector('#articlePreviewSubtitle'), draft.subtitle || draft.summary || 'Subtitle preview will appear here.');

  const body = section.querySelector('#articlePreviewBody');
  if (body) {
    body.textContent = '';

    const paragraphs = paragraphList(draft.body);
    if (paragraphs.length === 0) {
      body.textContent = 'Start writing to preview the article body.';
    } else {
      for (const paragraph of paragraphs.slice(0, 12)) {
        const p = document.createElement('p');
        p.textContent = paragraph;
        body.append(p);
      }

      if (paragraphs.length > 12) {
        const more = document.createElement('p');
        more.className = 'article-preview-more';
        more.textContent = `Preview truncated after 12 paragraphs. Total paragraphs: ${paragraphs.length}.`;
        body.append(more);
      }
    }
  }

  const tags = section.querySelector('#articlePreviewTags');
  if (tags) {
    tags.textContent = '';
    const parsedTags = parseTags(draft.tags);

    if (parsedTags.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'article-tag empty';
      empty.textContent = 'no tags';
      tags.append(empty);
    } else {
      for (const tag of parsedTags) {
        const chip = document.createElement('span');
        chip.className = 'article-tag';
        chip.textContent = `#${tag}`;
        tags.append(chip);
      }
    }
  }
}

function updateArticleManifest(section) {
  const pre = section.querySelector('#articleManifestPreview');
  if (!pre) return;

  pre.textContent = JSON.stringify(buildFutureManifest(section), null, 2);
}

function buildFutureManifest(section) {
  const draft = readDraftFromForm(section);
  const tags = parseTags(draft.tags);
  const bodyBytes = textByteLength(draft.body || '');
  const now = new Date().toISOString();

  return {
    schema: 'ron.article.future_manifest_draft.v1',
    status: 'local_draft_not_published',
    truth_boundary: {
      backend_article_routes_wired: false,
      b3_content_id_assigned: false,
      manifest_cid_assigned: false,
      roc_charged: false,
      wallet_mutated: false,
      index_pointer_created: false
    },
    intended_asset: {
      kind: 'article',
      future_crab_url_shape: 'crab://<64 lowercase hex>.article',
      canonical_content_id_pending: true,
      body_bytes_estimate: bodyBytes
    },
    author: {
      handle_display: draft.authorHandle || localHandle(),
      passport_subject_display: localPassportSubject(),
      wallet_account_display: localWalletAccount(),
      backend_confirmed: false
    },
    metadata: {
      title: draft.title,
      subtitle: draft.subtitle,
      summary: draft.summary,
      tags,
      language: draft.language || 'en',
      license: draft.license || 'all-rights-reserved'
    },
    body_preview: {
      text_included_for_local_copy_only: true,
      body: draft.body
    },
    next_required_backend_work: [
      'ron-proto article DTOs',
      'ron-naming .article parser support',
      'omnigate article prepare/create/read route contracts',
      'svc-gateway proxy routes',
      'paid storage admission reuse',
      'index pointer for crab://<hash>.article',
      'asset-page hydration for article kind'
    ],
    last_prepare_attempt: lastPrepareResponse,
    updated_at: now
  };
}

function buildArticlePrepareRequest(section) {
  const draft = readDraftFromForm(section);
  const tags = parseTags(draft.tags);
  const bodyBytes = textByteLength(draft.body || '');

  return stripUndefined({
    schema: 'crablink.article-prepare-request.v1',
    kind: 'article',
    title: draft.title || undefined,
    subtitle: draft.subtitle || undefined,
    summary: draft.summary || undefined,
    body: draft.body || undefined,
    body_bytes: bodyBytes,
    tags,
    language: draft.language || 'en',
    license: draft.license || 'all-rights-reserved',
    author_handle_display: draft.authorHandle || localHandle(),
    payer_account: localWalletAccount(),
    owner_passport_subject: localPassportSubject(),
    client_idempotency_key: stableClientIdempotencyKey(draft.title || draft.body || 'article')
  });
}

async function sendArticlePrepare(section) {
  await saveDraftToStorage(section, { announce: false });

  const status = section.querySelector(`#${PREPARE_STATUS_ID}`);
  const result = section.querySelector(`#${PREPARE_RESULT_ID}`);
  const actionButtonEl = section.querySelector('[data-article-action="send-prepare"]');

  if (status) {
    status.className = 'article-prepare-status pending';
    status.textContent = `Sending non-mutating prepare request to ${FUTURE_ARTICLE_PREPARE_ROUTE}…`;
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
    const requestBody = buildArticlePrepareRequest(section);
    const requestCorrelationId = createCorrelationId();

    const response = await fetch(`${gateway}${FUTURE_ARTICLE_PREPARE_ROUTE}`, {
      method: 'POST',
      headers: stripUndefined({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: settings.authToken ? `Bearer ${settings.authToken}` : undefined,
        'Idempotency-Key': requestBody.client_idempotency_key,
        'x-ron-passport': settings.passportSubject || localPassportSubject(),
        'x-ron-wallet-account': settings.walletAccount || localWalletAccount(),
        'x-correlation-id': requestCorrelationId,
        'x-crablink-client': 'chrome-extension-article-draft'
      }),
      body: JSON.stringify(requestBody)
    });

    const text = await response.text();
    const parsed = parseJsonMaybe(text);
    const payload = {
      schema: 'crablink.article-prepare-attempt.v1',
      ok: response.ok,
      status: response.status,
      status_text: response.statusText,
      route: FUTURE_ARTICLE_PREPARE_ROUTE,
      correlation_id: requestCorrelationId,
      truth_boundary: response.ok
        ? 'Gateway returned a response. This is still prepare/preflight, not publication.'
        : 'Gateway did not accept the future article prepare route. No article was published, no b3 CID was assigned, and no ROC was charged.',
      response: parsed ?? text
    };

    lastPrepareResponse = payload;
    updateArticleManifest(section);

    if (status) {
      status.className = response.ok ? 'article-prepare-status ok' : 'article-prepare-status error';
      status.textContent = response.ok
        ? 'Article prepare response received. This is still not a published article.'
        : `Article prepare failed with HTTP ${response.status}. Backend article routes may not be wired yet.`;
    }

    if (result) {
      result.textContent = JSON.stringify(payload, null, 2);
    }

    setFooter(
      response.ok
        ? 'Article prepare response received.'
        : `Article prepare failed with HTTP ${response.status}; no publication occurred.`
    );
  } catch (error) {
    const payload = {
      schema: 'crablink.article-prepare-attempt.v1',
      ok: false,
      route: FUTURE_ARTICLE_PREPARE_ROUTE,
      error: String(error?.message || error),
      truth_boundary: 'No article was published, no b3 CID was assigned, and no ROC was charged.'
    };

    lastPrepareResponse = payload;
    updateArticleManifest(section);

    if (status) {
      status.className = 'article-prepare-status error';
      status.textContent = `Article prepare failed: ${payload.error}`;
    }

    if (result) {
      result.classList.remove('hidden');
      result.textContent = JSON.stringify(payload, null, 2);
    }

    setFooter('Article prepare failed; no publication occurred.');
  } finally {
    if (actionButtonEl) {
      actionButtonEl.disabled = false;
    }
  }
}

function buildPlainText(section) {
  const draft = readDraftFromForm(section);
  const tags = parseTags(draft.tags).map((tag) => `#${tag}`).join(' ');

  return [
    draft.title || 'Untitled article',
    draft.subtitle ? `\n${draft.subtitle}` : '',
    draft.summary ? `\n\n${draft.summary}` : '',
    draft.body ? `\n\n${draft.body}` : '',
    tags ? `\n\n${tags}` : ''
  ].join('').trim();
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
    setFooter('Article draft saved locally.');
  }
}

async function clearDraft(section) {
  lastPrepareResponse = null;

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [DRAFT_KEY]: { ...DEFAULT_DRAFT, updatedAt: new Date().toISOString() } });
  }

  setField(section, 'title', '');
  setField(section, 'subtitle', '');
  setField(section, 'summary', '');
  setField(section, 'body', '');
  setField(section, 'tags', '');
  setField(section, 'language', 'en');
  setField(section, 'license', 'all-rights-reserved');
  setField(section, 'authorHandle', localHandle());

  const status = section.querySelector(`#${PREPARE_STATUS_ID}`);
  if (status) {
    status.className = 'article-prepare-status';
    status.textContent = 'No article prepare request sent yet.';
  }

  const result = section.querySelector(`#${PREPARE_RESULT_ID}`);
  if (result) {
    result.classList.add('hidden');
    result.textContent = 'No prepare response yet.';
  }

  updateArticleStats(section);
  updateArticlePreview(section);
  updateArticleManifest(section);
  setFooter('Article draft cleared locally.');
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
    subtitle: getField(section, 'subtitle'),
    summary: getField(section, 'summary'),
    body: getField(section, 'body'),
    tags: getField(section, 'tags'),
    language: getField(section, 'language') || 'en',
    license: getField(section, 'license') || 'all-rights-reserved',
    authorHandle: getField(section, 'authorHandle') || localHandle()
  };
}

function getField(section, name) {
  return clean(section.querySelector(`[data-article-field="${name}"]`)?.value || '');
}

function setField(section, name, value) {
  const field = section.querySelector(`[data-article-field="${name}"]`);
  if (field) field.value = String(value ?? '');
}

function statChip(label, value) {
  const chip = document.createElement('span');
  chip.className = 'article-stat-chip';

  const term = document.createElement('span');
  term.textContent = `${label}:`;

  const body = document.createElement('strong');
  body.textContent = value || '—';

  chip.append(term, body);
  return chip;
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

function isArticlePage() {
  const url = readCurrentCrabUrl().toLowerCase();

  if (url.startsWith('crab://')) {
    return url === 'crab://article';
  }

  const payload = readPayload();
  if (!payload) return false;

  const schema = clean(payload.schema || payload.type);
  const slug = clean(payload.slug || payload.page || payload.kind || payload.name || payload.page_kind || '').toLowerCase();
  const title = clean(payload.title || payload.metadata?.title || '').toLowerCase();
  const crab = clean(payload.links?.crab || payload.crab_url || payload.url || '').toLowerCase();

  return (
    schema === BUILTIN_SCHEMA &&
    (slug === 'article' || crab === 'crab://article' || title.includes('article'))
  );
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

function paragraphList(value) {
  return clean(value)
    .split(/\n{2,}/)
    .map((part) => clean(part))
    .filter(Boolean);
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

function stableClientIdempotencyKey(seed) {
  const cleanSeed = clean(seed).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  const safeSeed = cleanSeed.slice(0, 48) || 'article';
  return `crablink-article-prepare-${safeSeed}-${Date.now().toString(36)}`;
}

function createCorrelationId() {
  const random = Math.random().toString(16).slice(2, 10);
  return `crablink-article-${Date.now()}-${random}`;
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
    body.${ARTICLE_VIEW_CLASS} #profileHomeSection,
    body.${ARTICLE_VIEW_CLASS} #workflowSection,
    body.${ARTICLE_VIEW_CLASS} #actionsSection,
    body.${ARTICLE_VIEW_CLASS} #fieldsSection,
    body.${ARTICLE_VIEW_CLASS} #warningsSection,
    body.${ARTICLE_VIEW_CLASS} #sitePageSection,
    body.${ARTICLE_VIEW_CLASS} #prepareSummary,
    body.${ARTICLE_VIEW_CLASS} #holdSection,
    body.${ARTICLE_VIEW_CLASS} #submitSection {
      display: none !important;
    }

    .article-draft-section {
      display: grid;
      gap: 16px;
      border-color: rgba(34, 197, 94, 0.24) !important;
      background:
        radial-gradient(circle at top left, rgba(34, 197, 94, 0.10), transparent 42%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(8, 17, 34, 0.92)) !important;
    }

    .article-draft-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
    }

    .article-draft-eyebrow {
      margin: 0 0 6px;
      color: #86efac;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .article-draft-head h3 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(28px, 4vw, 44px);
      line-height: 1;
      letter-spacing: -0.065em;
    }

    .article-draft-head p:not(.article-draft-eyebrow) {
      margin: 8px 0 0;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .article-draft-badge {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 7px 11px;
      border: 1px solid rgba(251, 191, 36, 0.35);
      border-radius: 999px;
      color: #fde68a;
      background: rgba(113, 63, 18, 0.18);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .article-draft-notice {
      padding: 14px;
      border: 1px solid rgba(251, 191, 36, 0.24);
      border-radius: 18px;
      color: #fde68a;
      background: rgba(113, 63, 18, 0.14);
      line-height: 1.45;
    }

    .article-draft-layout {
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
      gap: 16px;
      align-items: start;
    }

    .article-draft-form,
    .article-preview-panel,
    .article-draft-manifest {
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 24px;
      background: rgba(2, 6, 23, 0.28);
    }

    .article-draft-form {
      display: grid;
      gap: 12px;
      padding: 16px;
    }

    .article-field {
      display: grid;
      gap: 7px;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 850;
    }

    .article-field span {
      color: #a7f3d0;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .article-field input,
    .article-field textarea,
    .article-field select {
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

    .article-field textarea {
      resize: vertical;
      min-height: 92px;
      line-height: 1.45;
    }

    .article-field input:focus,
    .article-field textarea:focus,
    .article-field select:focus {
      border-color: rgba(34, 197, 94, 0.54);
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
    }

    .article-two-column {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .article-preview-panel {
      display: grid;
      gap: 14px;
      padding: 18px;
    }

    .article-preview-head h4 {
      margin: 0;
      color: #f8fafc;
      font-size: clamp(26px, 4vw, 42px);
      line-height: 1;
      letter-spacing: -0.07em;
      overflow-wrap: anywhere;
    }

    .article-preview-head p:not(.article-draft-eyebrow) {
      margin: 8px 0 0;
      color: #bfdbfe;
      line-height: 1.45;
    }

    .article-draft-stats,
    .article-preview-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .article-stat-chip,
    .article-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 28px;
      padding: 6px 9px;
      border: 1px solid rgba(34, 197, 94, 0.22);
      border-radius: 999px;
      color: #bbf7d0;
      background: rgba(22, 101, 52, 0.16);
      font-size: 12px;
      font-weight: 850;
    }

    .article-stat-chip span {
      color: #86efac;
      font-weight: 950;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .article-tag.empty {
      border-color: rgba(148, 163, 184, 0.20);
      color: #94a3b8;
      background: rgba(15, 23, 42, 0.42);
    }

    .article-preview-body {
      display: grid;
      gap: 12px;
      min-height: 220px;
      padding: 16px;
      border: 1px solid rgba(148, 163, 184, 0.14);
      border-radius: 18px;
      color: #e5edff;
      background: rgba(15, 23, 42, 0.48);
      line-height: 1.62;
      white-space: pre-wrap;
    }

    .article-preview-body p {
      margin: 0;
    }

    .article-preview-more {
      color: #fde68a !important;
      font-style: italic;
    }

    .article-draft-manifest {
      overflow: hidden;
    }

    .article-draft-manifest summary {
      cursor: pointer;
      padding: 14px 16px;
      color: #f8fafc;
      font-weight: 950;
    }

    .article-draft-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      padding: 0 16px 14px;
    }

    .article-draft-actions button {
      min-height: 34px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 950;
    }

    .article-prepare-status {
      margin: 0 16px 12px;
      padding: 12px 13px;
      border: 1px solid rgba(148, 163, 184, 0.20);
      border-radius: 14px;
      color: #cbd5e1;
      background: rgba(15, 23, 42, 0.48);
      line-height: 1.4;
    }

    .article-prepare-status.pending {
      border-color: rgba(96, 165, 250, 0.36);
      color: #bfdbfe;
      background: rgba(30, 64, 175, 0.18);
    }

    .article-prepare-status.ok {
      border-color: rgba(34, 197, 94, 0.34);
      color: #bbf7d0;
      background: rgba(22, 101, 52, 0.18);
    }

    .article-prepare-status.error {
      border-color: rgba(248, 113, 113, 0.34);
      color: #fecaca;
      background: rgba(127, 29, 29, 0.20);
    }

    .article-manifest-preview,
    .article-prepare-result {
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

    .article-prepare-result.hidden {
      display: none !important;
    }

    .article-prepare-result {
      border-top-color: rgba(96, 165, 250, 0.22);
    }

    @media (max-width: 980px) {
      .article-draft-layout,
      .article-two-column {
        grid-template-columns: 1fr;
      }

      .article-draft-head {
        flex-direction: column;
      }

      .article-draft-actions {
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