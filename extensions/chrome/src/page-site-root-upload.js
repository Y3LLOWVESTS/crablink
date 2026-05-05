/**
 * RO:WHAT — Adds Root HTML author/upload controls and guards to CrabLink's built-in crab://site workflow.
 * RO:WHY — NEXT_LEVEL site UX; Concerns: DX/SEC/ECON; a site root must be stored HTML b3 bytes, not an embedded image CID.
 * RO:INTERACTS — page.html, page-workflow.js dynamic siteRootDocumentPanel, ronClient.js /paid/o, storage.js settings.
 * RO:INVARIANTS — gateway-only; explicit click before paid write; fills root_document_cid only from backend b3 response; no direct storage/index/ledger calls.
 * RO:METRICS — backend receives normal x-correlation-id from ronClient.js.
 * RO:CONFIG — uses gatewayUrl, authToken, passportSubject, walletAccount, requestTimeoutMs from storage.js.
 * RO:SECURITY — HTML is treated as untrusted content; this module never executes typed HTML; preview/rendering stays sandboxed elsewhere.
 * RO:TEST — scripts/check-chrome.sh; manual crab://site prepare → hold → Store Root HTML → Create Site.
 */

import { RonClient, stableIdempotencyKey } from './ronClient.js';
import { getSettings, rememberProductState } from './storage.js';

const PANEL_ID = 'siteRootHtmlAuthorPanel';
const ROOT_PANEL_ID = 'siteRootDocumentPanel';
const ROOT_CID_INPUT_ID = 'siteRootDocumentCid';
const HOLD_PREVIEW_ID = 'holdPreview';
const SUBMIT_BUTTON_ID = 'submitProductButton';
const STATUS_ID = 'siteRootHtmlStatus';
const SOURCE_ID = 'siteRootHtmlSource';
const FILE_ID = 'siteRootHtmlFile';
const STORE_BUTTON_ID = 'storeSiteRootHtmlButton';
const SAMPLE_BUTTON_ID = 'insertSiteRootSampleButton';
const CLEAR_BUTTON_ID = 'clearSiteRootHtmlButton';

const B3_RE = /^b3:[0-9a-f]{64}$/;
const CRAB_IMAGE_RE = /crab:\/\/([0-9a-f]{64})\.image(?:[?#][^\s"'<>]*)?/gi;
const MAX_ROOT_HTML_BYTES = 1024 * 1024;

let currentSettings = null;
let currentClient = null;
let pageObserver = null;
let holdObserver = null;
let installTimer = 0;
let installed = false;
let lastStoredRootCid = '';
let lastStoredSourceFingerprint = '';
let submitGuardInstalled = false;
let autoClearNoticeShown = false;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void boot();
  }, { once: true });
} else {
  void boot();
}

async function boot() {
  currentSettings = await getSettings();
  currentClient = new RonClient(currentSettings);

  scheduleInstall();

  const root = document.body || document.documentElement;
  if (!root) return;

  pageObserver = new MutationObserver(() => {
    if (installed) return;
    scheduleInstall();
  });

  pageObserver.observe(root, {
    childList: true,
    subtree: true
  });
}

function scheduleInstall() {
  window.clearTimeout(installTimer);
  installTimer = window.setTimeout(() => installWhenReady(), 80);
}

function installWhenReady() {
  if (installed) return;

  const rootPanel = document.getElementById(ROOT_PANEL_ID);
  if (!rootPanel) return;

  if (!document.getElementById(PANEL_ID)) {
    rootPanel.append(buildPanel());
  }

  installed = true;
  stopPageObserver();
  attachHoldObserver();
  attachSubmitGuard();
  updateControls();
}

function buildPanel() {
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.className = 'hold-summary';
  panel.style.marginTop = '16px';
  panel.style.borderColor = 'rgba(56, 189, 248, 0.34)';

  const head = document.createElement('div');
  head.className = 'summary-head';

  const left = document.createElement('div');

  const badge = document.createElement('span');
  badge.className = 'badge badge-warn';
  badge.textContent = 'root html';

  const title = document.createElement('h4');
  title.textContent = 'Store Root HTML First';

  left.append(badge, title);

  const desc = document.createElement('p');
  desc.textContent =
    'Paste the site HTML here, store it as a paid b3 object, then use the returned root document CID. Do not use an image asset CID as the site root.';

  head.append(left, desc);

  const fields = document.createElement('div');
  fields.className = 'workflow-fields';

  const sourceField = document.createElement('div');
  sourceField.className = 'workflow-field full-width';

  const sourceLabel = document.createElement('label');
  sourceLabel.setAttribute('for', SOURCE_ID);
  sourceLabel.textContent = 'Root HTML source';

  const source = document.createElement('textarea');
  source.id = SOURCE_ID;
  source.rows = 14;
  source.spellcheck = false;
  source.autocomplete = 'off';
  source.placeholder = 'Paste the full <!doctype html> root document here. <crab-image> references are allowed.';
  source.style.width = '100%';
  source.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

  const sourceHelp = document.createElement('p');
  sourceHelp.className = 'workflow-help';
  sourceHelp.textContent =
    'The HTML root stores references like <crab-image src="crab://<hash>.image">. The image bytes stay in the image asset, not in the site root.';

  source.addEventListener('input', () => {
    clearRootCidIfItMatchesEmbeddedImage('input');
    updateControls();
  });

  sourceField.append(sourceLabel, source, sourceHelp);

  const fileField = document.createElement('div');
  fileField.className = 'workflow-field';

  const fileLabel = document.createElement('label');
  fileLabel.setAttribute('for', FILE_ID);
  fileLabel.textContent = 'Optional .html file';

  const file = document.createElement('input');
  file.id = FILE_ID;
  file.type = 'file';
  file.accept = '.html,.htm,text/html';

  const fileHelp = document.createElement('p');
  fileHelp.className = 'workflow-help';
  fileHelp.textContent = 'Choose an HTML file to load it into the Root HTML source box.';

  file.addEventListener('change', async () => {
    await loadHtmlFile(file.files?.[0]);
  });

  fileField.append(fileLabel, file, fileHelp);

  const statusField = document.createElement('div');
  statusField.className = 'workflow-field';

  const statusLabel = document.createElement('label');
  statusLabel.textContent = 'Root HTML status';

  const status = document.createElement('p');
  status.id = STATUS_ID;
  status.className = 'workflow-help';
  status.textContent = 'Paste HTML, confirm ROC hold, then store root HTML.';

  statusField.append(statusLabel, status);

  fields.append(sourceField, fileField, statusField);

  const actions = document.createElement('div');
  actions.className = 'workflow-actions';

  const storeButton = document.createElement('button');
  storeButton.id = STORE_BUTTON_ID;
  storeButton.type = 'button';
  storeButton.className = 'prepare-button';
  storeButton.textContent = 'Store Root HTML';
  storeButton.disabled = true;
  storeButton.addEventListener('click', () => {
    void storeRootHtml();
  });

  const sampleButton = document.createElement('button');
  sampleButton.id = SAMPLE_BUTTON_ID;
  sampleButton.type = 'button';
  sampleButton.className = 'secondary';
  sampleButton.textContent = 'Insert image embed sample';
  sampleButton.addEventListener('click', () => {
    const sourceEl = document.getElementById(SOURCE_ID);
    if (!sourceEl) return;

    sourceEl.value = sampleRootHtml();
    sourceEl.dispatchEvent(new Event('input', { bubbles: true }));
    clearRootCidIfItMatchesEmbeddedImage('sample');
    updateControls();
  });

  const clearButton = document.createElement('button');
  clearButton.id = CLEAR_BUTTON_ID;
  clearButton.type = 'button';
  clearButton.className = 'secondary';
  clearButton.textContent = 'Clear Root HTML';
  clearButton.addEventListener('click', () => {
    const sourceEl = document.getElementById(SOURCE_ID);
    const fileEl = document.getElementById(FILE_ID);
    if (sourceEl) sourceEl.value = '';
    if (fileEl) fileEl.value = '';
    lastStoredRootCid = '';
    lastStoredSourceFingerprint = '';
    updateControls();
  });

  actions.append(storeButton, sampleButton, clearButton);

  const guard = document.createElement('div');
  guard.className = 'warning-list';
  guard.style.marginTop = '12px';

  const warning = document.createElement('div');
  warning.className = 'warning-card';
  warning.style.display = 'block';
  warning.textContent =
    'Guard: Create Site is blocked if Root Document CID equals any image CID referenced by <crab-image>. Store the HTML root first, then create the site.';

  guard.append(warning);

  panel.append(head, fields, actions, guard);
  return panel;
}

async function loadHtmlFile(file) {
  if (!file) return;

  if (file.size > MAX_ROOT_HTML_BYTES) {
    setStatus(`HTML file is too large for this MVP guard (${file.size} bytes).`, 'bad');
    return;
  }

  const text = await file.text();
  const sourceEl = document.getElementById(SOURCE_ID);
  if (!sourceEl) return;

  sourceEl.value = text;
  sourceEl.dispatchEvent(new Event('input', { bubbles: true }));
  clearRootCidIfItMatchesEmbeddedImage('file');
  setStatus(`Loaded ${file.name || 'HTML file'} into Root HTML source.`, 'ok');
  updateControls();
}

async function storeRootHtml() {
  const source = currentSource();
  const validation = validateSourceForStore(source);

  if (!validation.ok) {
    setStatus(validation.message, 'bad');
    updateControls();
    return;
  }

  clearRootCidIfItMatchesEmbeddedImage('store');

  const paidProof = paidProofFromHoldPreview();

  if (!paidProof) {
    const message = 'Confirm ROC Hold first. Then click Store Root HTML again to write this HTML root as a paid b3 object.';
    setStatus(message, 'bad');
    window.alert(message);
    updateControls();
    return;
  }

  const storeButton = document.getElementById(STORE_BUTTON_ID);

  try {
    if (storeButton) {
      storeButton.disabled = true;
      storeButton.textContent = 'Storing Root HTML…';
    }

    currentSettings = await getSettings();
    currentClient = new RonClient(currentSettings);

    setStatus('Storing root HTML through gateway paid object path…', 'warn');

    const blob = new Blob([source], { type: 'text/html; charset=utf-8' });
    const idem = stableIdempotencyKey(
      'site-root-html',
      paidProof.txid,
      String(blob.size),
      sourceFingerprint(source)
    );

    const response = await currentClient.requestRaw('/paid/o', {
      method: 'POST',
      body: blob,
      label: 'Site root HTML storage',
      mutation: true,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'x-ron-paid-op': paidProof.op || 'hold',
        'x-ron-paid-asset': paidProof.asset || 'roc',
        'x-ron-paid-estimate-minor': paidProof.amount_minor,
        'x-ron-wallet-txid': paidProof.txid,
        'x-ron-wallet-receipt-hash': paidProof.receipt_hash,
        'x-ron-wallet-from': paidProof.from,
        'x-ron-wallet-to': paidProof.to,
        'x-ron-object-kind': 'site_root_html',
        'x-ron-content-type': 'text/html; charset=utf-8'
      },
      idempotencyKey: idem
    });

    const cid = findCanonicalCid(response.data);

    if (!cid) {
      throw new Error('Root HTML storage response did not include a canonical b3 CID.');
    }

    const imageCids = referencedImageCidsFromSource(source);
    if (imageCids.has(cid)) {
      throw new Error('Storage returned the image asset CID as the root. This means image bytes, not HTML, would become the site root.');
    }

    fillRootCid(cid);

    lastStoredRootCid = cid;
    lastStoredSourceFingerprint = sourceFingerprint(source);

    await rememberProductState(response.data);

    setStatus(`Stored root HTML as ${shortCid(cid)}. Now Create Site can safely use this root document CID.`, 'ok');
    updateControls();
  } catch (error) {
    setStatus(error?.message || String(error), 'bad');
    updateControls();
  } finally {
    if (storeButton) {
      storeButton.textContent = 'Store Root HTML';
    }
  }
}

function fillRootCid(cid) {
  const input = document.getElementById(ROOT_CID_INPUT_ID);
  if (!input) return;

  input.value = cid;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function updateControls() {
  const storeButton = document.getElementById(STORE_BUTTON_ID);
  const submitButton = document.getElementById(SUBMIT_BUTTON_ID);
  const source = currentSource();
  const rootCid = currentRootCid();
  const sourceFingerprintNow = sourceFingerprint(source);
  const sourceValidation = validateSourceForStore(source);
  const paidProof = paidProofFromHoldPreview();
  const rootProblem = rootCidProblem(rootCid, source);

  if (storeButton) {
    storeButton.disabled = !sourceValidation.ok;
    storeButton.title = !sourceValidation.ok
      ? sourceValidation.message
      : !paidProof
        ? 'Valid HTML is present. Confirm ROC Hold first; clicking Store Root HTML will remind you.'
        : 'Store this HTML as the site root document.';
  }

  if (submitButton && rootProblem) {
    submitButton.disabled = true;
    submitButton.title = rootProblem;
  }

  if (rootProblem) {
    setStatus(`${rootProblem} Click Store Root HTML after confirming ROC Hold to replace the prefilled image CID.`, 'bad');
    return;
  }

  if (source && rootCid && lastStoredRootCid && rootCid === lastStoredRootCid && sourceFingerprintNow === lastStoredSourceFingerprint) {
    setStatus(`Ready: Root Document CID points to stored HTML ${shortCid(rootCid)}.`, 'ok');
    return;
  }

  if (source && rootCid && (!lastStoredRootCid || rootCid !== lastStoredRootCid || sourceFingerprintNow !== lastStoredSourceFingerprint)) {
    setStatus('Root HTML has not been stored in this CrabLink session. Click Store Root HTML before Create Site.', 'warn');
    return;
  }

  if (source && !paidProof) {
    setStatus('Root HTML is ready. Confirm ROC Hold, then click Store Root HTML.', 'warn');
    return;
  }

  if (source && paidProof) {
    setStatus('Ready to store Root HTML.', 'ok');
    return;
  }

  if (rootCid && !source) {
    setStatus(`Root Document CID is set to ${shortCid(rootCid)}. If this is an HTML root CID, Create Site may proceed.`, 'ok');
    return;
  }

  setStatus('Paste HTML, confirm ROC hold, then store root HTML.', 'warn');
}

function attachSubmitGuard() {
  if (submitGuardInstalled) return;
  submitGuardInstalled = true;

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!target || target.id !== SUBMIT_BUTTON_ID) return;

      const source = currentSource();
      const rootCid = currentRootCid();
      const problem = rootCidProblem(rootCid, source) || staleSourceProblem(rootCid, source);

      if (!problem) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      setStatus(problem, 'bad');
      window.alert(problem);
    },
    true
  );
}

function clearRootCidIfItMatchesEmbeddedImage(reason) {
  const source = currentSource();
  const rootCid = currentRootCid();
  const input = document.getElementById(ROOT_CID_INPUT_ID);

  if (!source || !rootCid || !input) return false;

  const imageCids = referencedImageCidsFromSource(source);
  if (!imageCids.has(rootCid)) return false;

  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  if (!autoClearNoticeShown || reason === 'sample') {
    autoClearNoticeShown = true;
    setStatus(
      'Cleared the prefilled image CID from Root Document CID. Confirm ROC Hold, then click Store Root HTML to create a new HTML root CID.',
      'warn'
    );
  }

  return true;
}

function rootCidProblem(rootCid, source) {
  if (!rootCid) return '';

  const imageCids = referencedImageCidsFromSource(source);
  if (imageCids.has(rootCid)) {
    return [
      'Create Site blocked: Root Document CID is the same b3 hash as an embedded image.',
      'The site root must be HTML. Put the image only inside <crab-image>, then click Store Root HTML and use the new HTML root CID.'
    ].join(' ');
  }

  return '';
}

function staleSourceProblem(rootCid, source) {
  if (!source || !rootCid) return '';

  if (!lastStoredRootCid || rootCid !== lastStoredRootCid || sourceFingerprint(source) !== lastStoredSourceFingerprint) {
    return 'Create Site blocked: Root HTML source is present but has not been stored yet. Click Store Root HTML first, then Create Site.';
  }

  return '';
}

function validateSourceForStore(source) {
  if (!source) {
    return { ok: false, message: 'Root HTML source is empty.' };
  }

  const size = new TextEncoder().encode(source).length;
  if (size > MAX_ROOT_HTML_BYTES) {
    return { ok: false, message: `Root HTML is too large for this MVP guard (${size} bytes).` };
  }

  if (looksLikeBinaryRoot(source)) {
    return {
      ok: false,
      message: 'Root HTML source looks like binary image bytes. Use image bytes only through <crab-image>, not as the site root.'
    };
  }

  if (!/<(?:!doctype|html|head|body|main|section|div|p|h1|h2|crab-image)\b/i.test(source)) {
    return {
      ok: false,
      message: 'Root source does not look like HTML. Paste a full HTML document or use the sample.'
    };
  }

  return { ok: true, message: '' };
}

function paidProofFromHoldPreview() {
  const raw = document.getElementById(HOLD_PREVIEW_ID)?.textContent || '';

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed?.ok || !parsed?.data || !parsed?.request) {
    return null;
  }

  const data = parsed.data;
  const request = parsed.request;

  const proof = {
    txid: clean(data.txid || data.tx_id || data.hold_id || data.id || ''),
    receipt_hash: clean(data.receipt_hash || data.receiptHash || data.hash || ''),
    from: clean(data.from || request.from || ''),
    to: clean(data.to || request.to || ''),
    amount_minor: clean(data.amount_minor || data.amountMinor || request.amount_minor || ''),
    asset: clean(data.asset || request.asset || 'roc').toLowerCase(),
    op: clean(data.op || 'hold').toLowerCase()
  };

  if (
    !proof.txid ||
    !proof.receipt_hash ||
    !proof.from ||
    !proof.to ||
    !proof.amount_minor ||
    !/^[0-9]+$/.test(proof.amount_minor) ||
    proof.amount_minor === '0'
  ) {
    return null;
  }

  return proof;
}

function findCanonicalCid(value) {
  const seen = new Set();

  function walk(node) {
    if (node === null || node === undefined) return '';

    if (typeof node === 'string') {
      const match = node.match(/b3:[0-9a-f]{64}/i);
      return match ? match[0].toLowerCase() : '';
    }

    if (typeof node !== 'object') return '';
    if (seen.has(node)) return '';
    seen.add(node);

    const preferredKeys = [
      'cid',
      'b3',
      'b3_cid',
      'object_cid',
      'content_cid',
      'stored_cid',
      'root_document_cid',
      'addr',
      'address'
    ];

    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(node, key)) {
        const found = walk(node[key]);
        if (found) return found;
      }
    }

    for (const item of Array.isArray(node) ? node : Object.values(node)) {
      const found = walk(item);
      if (found) return found;
    }

    return '';
  }

  return walk(value);
}

function currentSource() {
  return clean(document.getElementById(SOURCE_ID)?.value || '');
}

function currentRootCid() {
  const input = document.getElementById(ROOT_CID_INPUT_ID);
  const raw = clean(input?.value || '').toLowerCase();

  if (!raw) return '';
  if (/^[0-9a-f]{64}$/.test(raw)) return `b3:${raw}`;
  if (B3_RE.test(raw)) return raw;
  return raw;
}

function referencedImageCidsFromSource(source) {
  const out = new Set();
  const text = String(source || '');
  let match = null;

  CRAB_IMAGE_RE.lastIndex = 0;
  while ((match = CRAB_IMAGE_RE.exec(text))) {
    out.add(`b3:${match[1].toLowerCase()}`);
  }

  return out;
}

function looksLikeBinaryRoot(source) {
  const s = String(source || '').slice(0, 512);
  return (
    s.includes('�PNG') ||
    (s.includes('PNG') && s.includes('IHDR') && s.includes('IDAT')) ||
    s.includes('JFIF') ||
    s.includes('Exif') ||
    s.includes('GIF87a') ||
    s.includes('GIF89a') ||
    (s.includes('WEBP') && s.includes('RIFF'))
  );
}

function sourceFingerprint(source) {
  const text = String(source || '');
  return `${text.length}:${text.slice(0, 96)}:${text.slice(-96)}`;
}

function setStatus(message, tone = 'warn') {
  const status = document.getElementById(STATUS_ID);
  if (status) {
    status.textContent = message;
    status.style.color = tone === 'bad' ? '#fecaca' : tone === 'ok' ? '#bbf7d0' : '#fde68a';
  }

  const footer = document.getElementById('footerStatus');
  if (footer) footer.textContent = message;
}

function attachHoldObserver() {
  const holdPreview = document.getElementById(HOLD_PREVIEW_ID);
  if (!holdPreview || holdObserver) return;

  holdObserver = new MutationObserver(updateControls);
  holdObserver.observe(holdPreview, {
    childList: true,
    characterData: true,
    subtree: true
  });
}

function stopPageObserver() {
  if (pageObserver) {
    pageObserver.disconnect();
    pageObserver = null;
  }
}

function shortCid(cid) {
  const value = clean(cid);
  if (value.length <= 22) return value || 'unknown';
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function clean(value) {
  return String(value ?? '').trim();
}

function sampleRootHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dusty Onion Image Embed Test</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #06111f;
      color: #e5eefc;
    }

    body {
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      padding: 48px 20px;
      background:
        radial-gradient(circle at 20% 10%, rgba(22, 163, 74, 0.28), transparent 34%),
        radial-gradient(circle at 85% 15%, rgba(37, 99, 235, 0.26), transparent 36%),
        linear-gradient(135deg, #020617, #0f172a 58%, #07101f);
    }

    main {
      width: min(960px, 100%);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 34px;
      overflow: hidden;
      background: rgba(15, 23, 42, 0.82);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
    }

    header {
      padding: 44px 48px;
      background: linear-gradient(135deg, rgba(30, 64, 175, 0.34), rgba(20, 83, 45, 0.22));
      border-bottom: 1px solid rgba(148, 163, 184, 0.20);
    }

    .badge {
      display: inline-flex;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(34, 197, 94, 0.16);
      color: #86efac;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1 {
      margin: 22px 0 10px;
      font-size: clamp(48px, 8vw, 92px);
      line-height: 0.9;
      letter-spacing: -0.08em;
    }

    p {
      margin: 0;
      max-width: 720px;
      color: #cbd5e1;
      font-size: 19px;
      line-height: 1.7;
    }

    section {
      padding: 38px 48px 48px;
      display: grid;
      gap: 24px;
    }

    .card {
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 24px;
      padding: 26px;
      background: rgba(2, 6, 23, 0.46);
    }

    crab-image,
    .crab-embedded-image {
      width: 100%;
      border-radius: 24px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      background: rgba(2, 6, 23, 0.72);
    }

    code {
      color: #93c5fd;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <span class="badge">RON site · b3 image embed</span>
      <h1>Crab Image Embed</h1>
      <p>
        This site root document is HTML. It does not store image bytes.
        It stores a <code>&lt;crab-image&gt;</code> reference to a separate b3-backed image asset.
      </p>
    </header>

    <section>
      <div class="card">
        <crab-image
          src="crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image"
          alt="RustyOnions b3-backed image"
        ></crab-image>
      </div>

      <div class="card">
        <p>
          The image above is referenced by its canonical crab asset URL. CrabLink resolves it through
          RustyOnions gateway routes, fetches the canonical <code>b3:</code> bytes, and renders it as
          a sandboxed embedded image.
        </p>
      </div>
    </section>
  </main>
</body>
</html>`;
}