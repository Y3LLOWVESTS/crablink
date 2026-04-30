#!/usr/bin/env bash
set -euo pipefail

echo "Scaffolding CrabLink browser-clients layout into: $(pwd)"
echo "This script creates/overwrites scaffold files only. It does not delete anything."

mkdir -p \
  docs \
  extensions/chrome/src \
  extensions/chrome/assets/icons \
  extensions/chrome/test/fixtures \
  extensions/firefox \
  extensions/edge \
  extensions/safari \
  shared/js \
  shared/schemas \
  shared/fixtures \
  browser \
  scripts \
  tools

cat > README.md <<'CRABLINK_EOF'
# CrabLink

CrabLink is the browser-client layer for RustyOnions: starting with the Chrome extension for resolving `crab://` links, viewing b3 asset pages, connecting to local RON gateways, and enabling future browser-based ROC/Web3 workflows.

## Current focus

The first product target is the **CrabLink Extension for Chrome**.

## Repository layout

```text
docs/                 Blueprints, security model, route contracts, and UX notes.
extensions/chrome/    CrabLink Extension for Chrome.
extensions/firefox/   Future CrabLink Extension for Firefox.
extensions/edge/      Future CrabLink Extension for Edge.
extensions/safari/    Future CrabLink Extension for Safari.
shared/               Shared browser-client helpers, schemas, and fixtures.
browser/              Future full CrabLink browser or browser shell.
scripts/              Local checks, packaging, and smoke helpers.
tools/                Future developer tooling.
```

## Boundary

CrabLink is a browser-client repo. It should call RustyOnions public `svc-gateway` routes and should not own ledger truth, wallet truth, storage truth, backend hydration truth, or private-key custody.
CRABLINK_EOF

cat > LICENSE <<'CRABLINK_EOF'
Dual-licensed under either of:

MIT License
Apache License, Version 2.0

At your option.

Before public release, replace this placeholder with full license text or add separate LICENSE-MIT and LICENSE-APACHE files.
CRABLINK_EOF

cat > CONTRIBUTING.md <<'CRABLINK_EOF'
# Contributing to CrabLink

CrabLink is the browser-client layer for RustyOnions.

## Rules

- Keep browser clients thin.
- Call public `svc-gateway` routes only.
- Do not call internal services directly from the extension.
- Do not silently spend ROC.
- Do not fake receipts.
- Do not store private keys or seed phrases in the MVP.
- Use minimal browser permissions.
- Keep the first Chrome MVP dependency-free.

## First target

The first target is the CrabLink Extension for Chrome using Manifest V3, plain JavaScript, plain HTML, and plain CSS.
CRABLINK_EOF

cat > SECURITY.md <<'CRABLINK_EOF'
# CrabLink Security Policy

## MVP security rules

- No silent ROC spending.
- No fake receipts.
- No private-key storage.
- No seed phrase handling.
- No token logging.
- No direct calls to `ron-ledger`, `svc-wallet`, `svc-storage`, `svc-index`, or `omnigate`.
- Public extension calls should go through `svc-gateway`.

## Reporting

For now, report security issues privately to the repository owner.
CRABLINK_EOF

cat > CHANGELOG.md <<'CRABLINK_EOF'
# Changelog

## Unreleased

- Initial CrabLink browser-clients repository scaffold.
- Added Chrome extension MVP layout.
- Added future extension lanes for Firefox, Edge, and Safari.
- Added future browser shell lane.
CRABLINK_EOF

cat > .gitignore <<'CRABLINK_EOF'
.DS_Store
node_modules/
dist/
build/
coverage/
*.log
*.tmp
.env
.env.local
CRABLINK_EOF

cat > docs/CHROME_EXTENSION_BLUEPRINT.md <<'CRABLINK_EOF'
# Chrome Extension Blueprint

The CrabLink Extension for Chrome is the first browser-client target for RustyOnions.

## Purpose

The extension provides a browser-facing UX for:

- configuring a local RustyOnions `svc-gateway`
- checking `/healthz` and `/readyz`
- resolving `crab://` links
- viewing b3 asset pages
- viewing named site pages
- preparing future paid image/site workflows safely

## MVP goals

- Dependency-free Manifest V3 extension.
- Plain JavaScript, HTML, and CSS.
- Minimal permissions.
- Local gateway configuration.
- Health and readiness checks.
- `crab://<hash>.<kind>` asset resolution.
- `crab://<site_name>` site resolution.
- Safe error display.

## MVP non-goals

- No private-key custody.
- No seed phrase import.
- No silent ROC spending.
- No fake receipts.
- No direct ledger mutation.
- No full custom browser engine.

## Boundary

The extension should call public `svc-gateway` routes only. It should not call `ron-ledger`, `svc-wallet`, `svc-storage`, `svc-index`, or `omnigate` directly.
CRABLINK_EOF

cat > docs/EXTENSION_SECURITY_MODEL.md <<'CRABLINK_EOF'
# Extension Security Model

## Hard rules

- Never silently spend ROC.
- Never fake receipts.
- Never store seed phrases or private keys in the MVP.
- Never log bearer tokens.
- Never send auth tokens to non-gateway hosts.
- Never request broad host permissions unless a later batch explicitly requires it.

## MVP permissions

Start with:

- `storage`
- `activeTab`
- local gateway host permissions for `127.0.0.1` and `localhost`

## Token handling

The MVP may allow a dev bearer/cap token for local testing. That token must not be logged, copied into receipts, shown in full, or sent to non-gateway hosts.

## Paid action handling

Every paid action must require explicit user confirmation and must display the action, payer account, target, amount, route, and correlation ID before execution.
CRABLINK_EOF

cat > docs/CRAB_URL_UX.md <<'CRABLINK_EOF'
# Crab URL UX

## Canonical public asset URL

```text
crab://<64 lowercase hex>.<asset_kind>
```

Example:

```text
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.image
```

## Internal content ID

```text
b3:<64 lowercase hex>
```

## Named site URL

```text
crab://<site_name>
```

## UX rule

Names are human pointers. b3 hashes are canonical content identifiers.
CRABLINK_EOF

cat > docs/BACKEND_ROUTE_CONTRACTS.md <<'CRABLINK_EOF'
# Backend Route Contracts

CrabLink should call `svc-gateway` public routes only.

## Initial routes

```text
GET  /healthz
GET  /readyz
GET  /crab/resolve?url=...
GET  /b3/:hash.kind
POST /paid/o/prepare
POST /assets/image/prepare
POST /assets/image
POST /sites/prepare
POST /sites
GET  /sites/:name
```

## Boundary

CrabLink does not call `ron-ledger`, `svc-wallet`, `svc-storage`, `svc-index`, or `omnigate` directly.

## Header strategy

Useful headers for configured local/dev flows:

```text
Authorization: Bearer <token>
x-ron-passport: <passport_subject>
x-ron-wallet-account: <wallet_account>
x-correlation-id: <generated_id>
Idempotency-Key: <generated_id_for_mutations>
Content-Type: application/json
```
CRABLINK_EOF

cat > docs/FUTURE_BROWSER_PLAN.md <<'CRABLINK_EOF'
# Future Browser Plan

CrabLink may eventually become a full browser or browser shell for RustyOnions.

## Not now

The current product target is the CrabLink Extension for Chrome.

## Future possibilities

- Native `crab://` navigation.
- Built-in RustyOnions gateway discovery.
- Local passport UX.
- Safer paid action prompts.
- First-class b3 asset pages.
- Built-in developer tools for RustyOnions apps and sites.
CRABLINK_EOF

cat > extensions/chrome/manifest.json <<'CRABLINK_EOF'
{
  "manifest_version": 3,
  "name": "CrabLink Extension for Chrome",
  "description": "Resolve crab:// links, view b3 asset pages, and connect to local RustyOnions gateways.",
  "version": "0.1.0",
  "action": {
    "default_title": "CrabLink",
    "default_popup": "src/popup.html"
  },
  "options_page": "src/options.html",
  "background": {
    "service_worker": "src/background.js",
    "type": "module"
  },
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "http://127.0.0.1:*/*",
    "http://localhost:*/*"
  ],
  "icons": {
    "16": "assets/icons/icon16.png",
    "32": "assets/icons/icon32.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
CRABLINK_EOF

cat > extensions/chrome/README.md <<'CRABLINK_EOF'
# CrabLink Extension for Chrome

This is the first CrabLink browser extension.

## Load unpacked

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click "Load unpacked".
5. Select `extensions/chrome`.

## Default local gateway

```text
http://127.0.0.1:8090
```

## MVP behavior

- Configure local gateway URL in options.
- Check RustyOnions node health/readiness.
- Resolve `crab://` links through `svc-gateway`.
- View b3 asset and site route responses.
CRABLINK_EOF

cat > extensions/chrome/src/background.js <<'CRABLINK_EOF'
// CrabLink Extension for Chrome — background service worker.
// Keeps install/default setup thin.

const DEFAULTS = {
  schemaVersion: 1,
  gatewayUrl: 'http://127.0.0.1:8090',
  passportSubject: 'passport:main:dev',
  walletAccount: 'acct_dev',
  authToken: '',
  requireSpendConfirm: true,
  devMode: true,
  requestTimeoutMs: 5000
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const next = {};

  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (existing[key] === undefined) {
      next[key] = value;
    }
  }

  if (Object.keys(next).length > 0) {
    await chrome.storage.local.set(next);
  }
});
CRABLINK_EOF

cat > extensions/chrome/src/content.js <<'CRABLINK_EOF'
// CrabLink content helper.
// MVP intentionally does not auto-hijack navigation.

(() => {
  window.__crablinkContentScriptLoaded = true;
})();
CRABLINK_EOF

cat > extensions/chrome/src/popup.html <<'CRABLINK_EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>CrabLink</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body class="popup">
    <header class="header">
      <div>
        <h1>CrabLink</h1>
        <p>RustyOnions browser client</p>
      </div>
      <span id="nodeBadge" class="badge badge-muted">checking</span>
    </header>

    <section class="card">
      <div class="row">
        <span class="label">Gateway</span>
        <span id="gatewayUrl" class="value">loading...</span>
      </div>
      <div class="row">
        <span class="label">Passport</span>
        <span id="passportSubject" class="value">not set</span>
      </div>
      <div class="row">
        <span class="label">Wallet</span>
        <span id="walletAccount" class="value">not set</span>
      </div>
      <div class="button-row">
        <button id="checkNodeButton">Check Node</button>
        <button id="openOptionsButton">Settings</button>
      </div>
    </section>

    <section class="card">
      <label for="crabInput">crab:// URL, b3 CID, or raw hash</label>
      <input id="crabInput" type="text" placeholder="crab://<hash>.image" />

      <div class="button-row">
        <button id="resolveButton">Resolve</button>
        <button id="clearButton" class="secondary">Clear</button>
      </div>
    </section>

    <section id="message" class="message hidden"></section>
    <section id="result" class="card result hidden"></section>

    <script type="module" src="./popup.js"></script>
  </body>
</html>
CRABLINK_EOF

cat > extensions/chrome/src/popup.js <<'CRABLINK_EOF'
import { normalizeCrabInput } from './crab.js';
import { getSettings } from './storage.js';
import { RonClient } from './ronClient.js';

const els = {
  nodeBadge: document.getElementById('nodeBadge'),
  gatewayUrl: document.getElementById('gatewayUrl'),
  passportSubject: document.getElementById('passportSubject'),
  walletAccount: document.getElementById('walletAccount'),
  checkNodeButton: document.getElementById('checkNodeButton'),
  openOptionsButton: document.getElementById('openOptionsButton'),
  crabInput: document.getElementById('crabInput'),
  resolveButton: document.getElementById('resolveButton'),
  clearButton: document.getElementById('clearButton'),
  message: document.getElementById('message'),
  result: document.getElementById('result')
};

let client = null;

function setBadge(kind, text) {
  els.nodeBadge.className = `badge badge-${kind}`;
  els.nodeBadge.textContent = text;
}

function showMessage(kind, text) {
  els.message.className = `message message-${kind}`;
  els.message.textContent = text;
}

function clearMessage() {
  els.message.className = 'message hidden';
  els.message.textContent = '';
}

function showResult(title, data) {
  els.result.className = 'card result';
  els.result.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
  `;
}

function clearResult() {
  els.result.className = 'card result hidden';
  els.result.innerHTML = '';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function load() {
  const settings = await getSettings();
  client = new RonClient(settings);

  els.gatewayUrl.textContent = settings.gatewayUrl;
  els.passportSubject.textContent = settings.passportSubject || 'not set';
  els.walletAccount.textContent = settings.walletAccount || 'not set';

  await checkNode();
}

async function checkNode() {
  clearMessage();

  try {
    setBadge('muted', 'checking');

    const health = await client.getHealth();
    const ready = await client.getReady();

    if (ready.ok || ready.ready === true) {
      setBadge('ok', 'online');
      showMessage('ok', 'RustyOnions gateway is online and ready.');
    } else if (health.ok) {
      setBadge('warn', 'degraded');
      showMessage('warn', 'Gateway is alive but not ready.');
    } else {
      setBadge('warn', 'health issue');
      showMessage('warn', 'Gateway health check returned an unexpected response.');
    }
  } catch (error) {
    setBadge('bad', 'offline');
    showMessage('bad', error.message || 'Gateway is offline.');
  }
}

async function resolveInput() {
  clearMessage();
  clearResult();

  let parsed;
  try {
    parsed = normalizeCrabInput(els.crabInput.value);
  } catch (error) {
    showMessage('bad', error.message);
    return;
  }

  try {
    if (parsed.type === 'asset') {
      const data = await client.getB3Asset(parsed.hash, parsed.kind);
      showResult(`Asset: ${parsed.kind}`, data);
      return;
    }

    if (parsed.type === 'site') {
      const data = await client.resolveSite(parsed.name);
      showResult(`Site: ${parsed.name}`, data);
      return;
    }

    const data = await client.resolveCrab(parsed.url);
    showResult('Crab Resolve', data);
  } catch (error) {
    showMessage('bad', error.message || 'Resolve failed.');
  }
}

els.checkNodeButton.addEventListener('click', checkNode);
els.openOptionsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
els.resolveButton.addEventListener('click', resolveInput);
els.clearButton.addEventListener('click', () => {
  els.crabInput.value = '';
  clearMessage();
  clearResult();
});

load().catch((error) => {
  setBadge('bad', 'error');
  showMessage('bad', error.message || 'Failed to load CrabLink.');
});
CRABLINK_EOF

cat > extensions/chrome/src/options.html <<'CRABLINK_EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>CrabLink Settings</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body class="options">
    <header class="header">
      <div>
        <h1>CrabLink Settings</h1>
        <p>Configure the local RustyOnions gateway and beta identity hints.</p>
      </div>
    </header>

    <main class="card">
      <label for="gatewayUrl">Gateway URL</label>
      <input id="gatewayUrl" type="url" placeholder="http://127.0.0.1:8090" />

      <label for="passportSubject">Passport subject</label>
      <input id="passportSubject" type="text" placeholder="passport:main:dev" />

      <label for="walletAccount">Wallet account</label>
      <input id="walletAccount" type="text" placeholder="acct_dev" />

      <label for="authToken">Dev bearer/cap token</label>
      <input id="authToken" type="password" placeholder="optional dev token" />

      <label class="checkbox">
        <input id="requireSpendConfirm" type="checkbox" />
        Require confirmation before paid actions
      </label>

      <label class="checkbox">
        <input id="devMode" type="checkbox" />
        Dev mode
      </label>

      <div class="button-row">
        <button id="saveButton">Save Settings</button>
        <button id="resetButton" class="secondary">Reset Defaults</button>
      </div>

      <section id="message" class="message hidden"></section>
    </main>

    <script type="module" src="./options.js"></script>
  </body>
</html>
CRABLINK_EOF

cat > extensions/chrome/src/options.js <<'CRABLINK_EOF'
import { DEFAULT_SETTINGS, getSettings, saveSettings } from './storage.js';

const els = {
  gatewayUrl: document.getElementById('gatewayUrl'),
  passportSubject: document.getElementById('passportSubject'),
  walletAccount: document.getElementById('walletAccount'),
  authToken: document.getElementById('authToken'),
  requireSpendConfirm: document.getElementById('requireSpendConfirm'),
  devMode: document.getElementById('devMode'),
  saveButton: document.getElementById('saveButton'),
  resetButton: document.getElementById('resetButton'),
  message: document.getElementById('message')
};

function showMessage(kind, text) {
  els.message.className = `message message-${kind}`;
  els.message.textContent = text;
}

function validateGatewayUrl(value) {
  const url = new URL(value);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Gateway URL must start with http:// or https://.');
  }

  return url.toString().replace(/\/$/, '');
}

async function load() {
  const settings = await getSettings();

  els.gatewayUrl.value = settings.gatewayUrl;
  els.passportSubject.value = settings.passportSubject || '';
  els.walletAccount.value = settings.walletAccount || '';
  els.authToken.value = settings.authToken || '';
  els.requireSpendConfirm.checked = settings.requireSpendConfirm;
  els.devMode.checked = settings.devMode;
}

async function save() {
  try {
    const next = {
      gatewayUrl: validateGatewayUrl(els.gatewayUrl.value.trim()),
      passportSubject: els.passportSubject.value.trim(),
      walletAccount: els.walletAccount.value.trim(),
      authToken: els.authToken.value.trim(),
      requireSpendConfirm: els.requireSpendConfirm.checked,
      devMode: els.devMode.checked
    };

    await saveSettings(next);
    showMessage('ok', 'Settings saved.');
  } catch (error) {
    showMessage('bad', error.message || 'Failed to save settings.');
  }
}

async function reset() {
  await saveSettings(DEFAULT_SETTINGS);
  await load();
  showMessage('ok', 'Defaults restored.');
}

els.saveButton.addEventListener('click', save);
els.resetButton.addEventListener('click', reset);

load().catch((error) => {
  showMessage('bad', error.message || 'Failed to load settings.');
});
CRABLINK_EOF

cat > extensions/chrome/src/styles.css <<'CRABLINK_EOF'
:root {
  color-scheme: light dark;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
  background: #111827;
  color: #f9fafb;
}

body.popup {
  width: 380px;
  min-height: 420px;
}

body.options {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #374151;
}

.header h1 {
  margin: 0;
  font-size: 20px;
}

.header p {
  margin: 4px 0 0;
  color: #9ca3af;
  font-size: 13px;
}

.card {
  margin: 12px;
  padding: 14px;
  border: 1px solid #374151;
  border-radius: 14px;
  background: #1f2937;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 6px 0;
}

.label {
  color: #9ca3af;
}

.value {
  max-width: 230px;
  overflow-wrap: anywhere;
  text-align: right;
}

.badge {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.badge-muted {
  background: #374151;
  color: #d1d5db;
}

.badge-ok {
  background: #064e3b;
  color: #a7f3d0;
}

.badge-warn {
  background: #78350f;
  color: #fde68a;
}

.badge-bad {
  background: #7f1d1d;
  color: #fecaca;
}

label {
  display: block;
  margin: 12px 0 6px;
  color: #d1d5db;
  font-size: 13px;
}

input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #4b5563;
  border-radius: 10px;
  padding: 10px;
  background: #111827;
  color: #f9fafb;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox input {
  width: auto;
}

.button-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

button {
  border: 0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #2563eb;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

button.secondary {
  background: #4b5563;
}

.message {
  margin: 12px;
  padding: 12px;
  border-radius: 12px;
  font-size: 13px;
}

.message-ok {
  background: #064e3b;
  color: #a7f3d0;
}

.message-warn {
  background: #78350f;
  color: #fde68a;
}

.message-bad {
  background: #7f1d1d;
  color: #fecaca;
}

.hidden {
  display: none;
}

.result h2 {
  margin-top: 0;
  font-size: 16px;
}

pre {
  max-height: 260px;
  overflow: auto;
  padding: 10px;
  border-radius: 10px;
  background: #0b1020;
  color: #d1d5db;
  font-size: 12px;
}
CRABLINK_EOF

cat > extensions/chrome/src/ronClient.js <<'CRABLINK_EOF'
export class RonClient {
  constructor(settings) {
    this.settings = settings;
    this.gatewayUrl = settings.gatewayUrl.replace(/\/$/, '');
  }

  async getHealth() {
    return this.request('/healthz');
  }

  async getReady() {
    return this.request('/readyz');
  }

  async resolveCrab(url) {
    return this.request(`/crab/resolve?url=${encodeURIComponent(url)}`);
  }

  async getB3Asset(hash, kind) {
    return this.request(`/b3/${hash}.${kind}`);
  }

  async resolveSite(name) {
    return this.request(`/sites/${encodeURIComponent(name)}`);
  }

  async request(path, options = {}) {
    const method = options.method || 'GET';
    const correlationId = makeCorrelationId();

    const headers = {
      Accept: 'application/json',
      'x-correlation-id': correlationId
    };

    if (this.settings.authToken) {
      headers.Authorization = `Bearer ${this.settings.authToken}`;
    }

    if (this.settings.passportSubject) {
      headers['x-ron-passport'] = this.settings.passportSubject;
    }

    if (this.settings.walletAccount) {
      headers['x-ron-wallet-account'] = this.settings.walletAccount;
    }

    let body;

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Idempotency-Key'] = makeIdempotencyKey();
      body = JSON.stringify(options.body);
    }

    const controller = new AbortController();
    const timeoutMs = this.settings.requestTimeoutMs || 5000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.gatewayUrl}${path}`, {
        method,
        headers,
        body,
        signal: controller.signal
      });

      const parsed = await parseResponse(response);

      if (!response.ok) {
        throw new Error(formatProblem(response.status, parsed, correlationId));
      }

      return parsed;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms. Correlation ID: ${correlationId}`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return { ok: response.ok, status: response.status };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      ok: response.ok,
      status: response.status,
      body: text
    };
  }
}

function formatProblem(status, parsed, correlationId) {
  const reason =
    parsed?.error ||
    parsed?.reason ||
    parsed?.message ||
    parsed?.title ||
    parsed?.body ||
    'Backend request failed';

  return `${reason} (HTTP ${status}, correlation ${correlationId})`;
}

function makeCorrelationId() {
  return `crablink-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeIdempotencyKey() {
  return `crablink-idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
CRABLINK_EOF

cat > extensions/chrome/src/storage.js <<'CRABLINK_EOF'
export const DEFAULT_SETTINGS = {
  schemaVersion: 1,
  gatewayUrl: 'http://127.0.0.1:8090',
  passportSubject: 'passport:main:dev',
  walletAccount: 'acct_dev',
  authToken: '',
  requireSpendConfirm: true,
  devMode: true,
  requestTimeoutMs: 5000,
  lastCrabUrl: '',
  recentReceipts: []
};

export async function getSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  return {
    ...DEFAULT_SETTINGS,
    ...stored
  };
}

export async function saveSettings(next) {
  const current = await getSettings();
  await chrome.storage.local.set({
    ...current,
    ...next,
    schemaVersion: DEFAULT_SETTINGS.schemaVersion
  });
}
CRABLINK_EOF

cat > extensions/chrome/src/crab.js <<'CRABLINK_EOF'
const HASH_RE = /^[0-9a-f]{64}$/;
const B3_RE = /^b3:([0-9a-f]{64})$/;
const CRAB_ASSET_RE = /^crab:\/\/([0-9a-f]{64})\.([a-z][a-z0-9_-]*)$/;
const CRAB_SITE_RE = /^crab:\/\/([a-zA-Z0-9][a-zA-Z0-9._-]{0,127})$/;

export function normalizeCrabInput(input) {
  const value = String(input || '').trim();

  if (!value) {
    throw new Error('Enter a crab:// URL, b3 CID, or raw 64-character hash.');
  }

  const crabAsset = value.match(CRAB_ASSET_RE);
  if (crabAsset) {
    return {
      type: 'asset',
      hash: crabAsset[1],
      kind: crabAsset[2],
      url: value
    };
  }

  const crabSite = value.match(CRAB_SITE_RE);
  if (crabSite) {
    return {
      type: 'site',
      name: crabSite[1],
      url: value
    };
  }

  const b3 = value.match(B3_RE);
  if (b3) {
    return {
      type: 'asset',
      hash: b3[1],
      kind: 'image',
      url: `crab://${b3[1]}.image`
    };
  }

  if (HASH_RE.test(value)) {
    return {
      type: 'asset',
      hash: value,
      kind: 'image',
      url: `crab://${value}.image`
    };
  }

  if (value.startsWith('crab://')) {
    return {
      type: 'crab',
      url: value
    };
  }

  throw new Error('Invalid CrabLink input.');
}
CRABLINK_EOF

cat > extensions/chrome/test/manual-checklist.md <<'CRABLINK_EOF'
# CrabLink Extension for Chrome Manual Checklist

## Load extension

- Open `chrome://extensions`.
- Enable Developer Mode.
- Click "Load unpacked".
- Select `extensions/chrome`.

## Settings

- Open extension options.
- Confirm gateway URL defaults to `http://127.0.0.1:8090`.
- Save settings.
- Reopen popup and confirm settings appear.

## Backend checks

- Start RustyOnions product stack.
- Click "Check Node".
- Confirm badge shows online or degraded with a useful message.
- Stop backend.
- Click "Check Node".
- Confirm badge shows offline with a useful message.

## Resolve checks

- Enter a valid `crab://<64hex>.image`.
- Confirm the extension calls the gateway and renders JSON.
- Enter an invalid hash.
- Confirm local validation rejects it cleanly.

## Safety checks

- Confirm no payment action happens automatically.
- Confirm no private key or seed phrase field exists.
- Confirm extension permissions are minimal.
CRABLINK_EOF

cat > extensions/chrome/test/fixtures/asset-page.sample.json <<'CRABLINK_EOF'
{
  "type": "omnigate.asset-page.v1",
  "asset_kind": "image",
  "content_id": "b3:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "crab_url": "crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.image",
  "manifest": {
    "present": true
  },
  "storage": {
    "available": true
  },
  "receipts": []
}
CRABLINK_EOF

cat > extensions/chrome/test/fixtures/site-page.sample.json <<'CRABLINK_EOF'
{
  "type": "omnigate.site-page.v1",
  "name": "example-site",
  "crab_url": "crab://example-site",
  "manifest_cid": "b3:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "hydrated": true
}
CRABLINK_EOF

cat > extensions/chrome/test/fixtures/problem.not-found.json <<'CRABLINK_EOF'
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "reason": "not_found",
  "detail": "The requested CrabLink object was not found."
}
CRABLINK_EOF

cat > extensions/chrome/test/fixtures/problem.policy-denied.json <<'CRABLINK_EOF'
{
  "type": "about:blank",
  "title": "Policy Denied",
  "status": 403,
  "reason": "policy_denied",
  "detail": "The backend policy denied this action."
}
CRABLINK_EOF

cat > extensions/firefox/README.md <<'CRABLINK_EOF'
# CrabLink Extension for Firefox

Placeholder for the future CrabLink Extension for Firefox.

Chrome is the first implementation target.
CRABLINK_EOF

cat > extensions/firefox/PLACEHOLDER.md <<'CRABLINK_EOF'
# Firefox Placeholder

Future home of the CrabLink Extension for Firefox.
CRABLINK_EOF

cat > extensions/edge/README.md <<'CRABLINK_EOF'
# CrabLink Extension for Edge

Placeholder for the future CrabLink Extension for Edge.

Chrome is the first implementation target.
CRABLINK_EOF

cat > extensions/edge/PLACEHOLDER.md <<'CRABLINK_EOF'
# Edge Placeholder

Future home of the CrabLink Extension for Edge.
CRABLINK_EOF

cat > extensions/safari/README.md <<'CRABLINK_EOF'
# CrabLink Extension for Safari

Placeholder for the future CrabLink Extension for Safari.

Chrome is the first implementation target.
CRABLINK_EOF

cat > extensions/safari/PLACEHOLDER.md <<'CRABLINK_EOF'
# Safari Placeholder

Future home of the CrabLink Extension for Safari.
CRABLINK_EOF

cat > shared/js/crab.js <<'CRABLINK_EOF'
// Shared CrabLink crab URL helpers placeholder.
// Chrome MVP currently uses extensions/chrome/src/crab.js.
CRABLINK_EOF

cat > shared/js/ronClient.js <<'CRABLINK_EOF'
// Shared CrabLink gateway client placeholder.
// Chrome MVP currently uses extensions/chrome/src/ronClient.js.
CRABLINK_EOF

cat > shared/js/storageSchema.js <<'CRABLINK_EOF'
export const EXTENSION_SETTINGS_SCHEMA_VERSION = 1;
CRABLINK_EOF

cat > shared/js/errors.js <<'CRABLINK_EOF'
export function redactSecret(value) {
  if (!value) return '';
  return `${String(value).slice(0, 4)}…redacted`;
}
CRABLINK_EOF

cat > shared/js/ids.js <<'CRABLINK_EOF'
export function makeCrabLinkId(prefix = 'crablink') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
CRABLINK_EOF

cat > shared/schemas/asset-page.schema.json <<'CRABLINK_EOF'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CrabLink Asset Page",
  "type": "object"
}
CRABLINK_EOF

cat > shared/schemas/site-page.schema.json <<'CRABLINK_EOF'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CrabLink Site Page",
  "type": "object"
}
CRABLINK_EOF

cat > shared/schemas/problem.schema.json <<'CRABLINK_EOF'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CrabLink Problem Response",
  "type": "object"
}
CRABLINK_EOF

cat > shared/schemas/extension-settings.schema.json <<'CRABLINK_EOF'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CrabLink Extension Settings",
  "type": "object"
}
CRABLINK_EOF

cat > shared/fixtures/asset-page.sample.json <<'CRABLINK_EOF'
{
  "type": "omnigate.asset-page.v1",
  "asset_kind": "image",
  "content_id": "b3:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "crab_url": "crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.image"
}
CRABLINK_EOF

cat > shared/fixtures/site-page.sample.json <<'CRABLINK_EOF'
{
  "type": "omnigate.site-page.v1",
  "name": "example-site",
  "crab_url": "crab://example-site"
}
CRABLINK_EOF

cat > shared/fixtures/problem.not-found.json <<'CRABLINK_EOF'
{
  "title": "Not Found",
  "status": 404,
  "reason": "not_found"
}
CRABLINK_EOF

cat > shared/fixtures/problem.policy-denied.json <<'CRABLINK_EOF'
{
  "title": "Policy Denied",
  "status": 403,
  "reason": "policy_denied"
}
CRABLINK_EOF

cat > browser/README.md <<'CRABLINK_EOF'
# CrabLink Browser

Future home of the full CrabLink browser or browser shell.

Do not build this before the CrabLink Extension for Chrome proves the UX and backend contract.
CRABLINK_EOF

cat > browser/FUTURE.md <<'CRABLINK_EOF'
# Future CrabLink Browser Ideas

- Native `crab://` navigation.
- Built-in RustyOnions gateway connection.
- First-class b3 asset pages.
- Local passport UX.
- Paid action prompts.
- Developer tools for RustyOnions apps and sites.
CRABLINK_EOF

cat > scripts/check-chrome.sh <<'CRABLINK_EOF'
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_DIR="$ROOT/extensions/chrome"

required_files=(
  "$CHROME_DIR/manifest.json"
  "$CHROME_DIR/src/background.js"
  "$CHROME_DIR/src/content.js"
  "$CHROME_DIR/src/popup.html"
  "$CHROME_DIR/src/popup.js"
  "$CHROME_DIR/src/options.html"
  "$CHROME_DIR/src/options.js"
  "$CHROME_DIR/src/styles.css"
  "$CHROME_DIR/src/ronClient.js"
  "$CHROME_DIR/src/storage.js"
  "$CHROME_DIR/src/crab.js"
  "$CHROME_DIR/assets/icons/icon16.png"
  "$CHROME_DIR/assets/icons/icon32.png"
  "$CHROME_DIR/assets/icons/icon48.png"
  "$CHROME_DIR/assets/icons/icon128.png"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "missing: $file"
    exit 1
  fi
done

echo "CrabLink Chrome extension scaffold looks complete."
CRABLINK_EOF

cat > scripts/package-chrome.sh <<'CRABLINK_EOF'
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/dist"
PACKAGE="$OUT/crablink-extension-chrome.zip"

mkdir -p "$OUT"

python3 - "$ROOT" "$PACKAGE" <<'PY'
import sys
import zipfile
from pathlib import Path

root = Path(sys.argv[1])
package = Path(sys.argv[2])
chrome = root / "extensions" / "chrome"

with zipfile.ZipFile(package, "w", compression=zipfile.ZIP_DEFLATED) as z:
    for path in chrome.rglob("*"):
        if path.is_file():
            z.write(path, path.relative_to(chrome))

print(f"wrote: {package}")
PY
CRABLINK_EOF

cat > scripts/smoke-local-gateway.sh <<'CRABLINK_EOF'
#!/usr/bin/env bash
set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:8090}"

echo "Checking CrabLink local gateway: $GATEWAY_URL"

curl -fsS "$GATEWAY_URL/healthz" >/dev/null
echo "healthz: ok"

curl -fsS "$GATEWAY_URL/readyz" >/dev/null
echo "readyz: ok"
CRABLINK_EOF

cat > tools/README.md <<'CRABLINK_EOF'
# CrabLink Tools

Future home for CrabLink developer tools.

Examples:

- route contract checkers
- extension packaging helpers
- fixture generators
- browser compatibility checks
CRABLINK_EOF

chmod +x scripts/check-chrome.sh scripts/package-chrome.sh scripts/smoke-local-gateway.sh

if command -v python3 >/dev/null 2>&1; then
  python3 <<'PY'
from pathlib import Path
import struct
import zlib

def make_png(path, size):
    width = height = size
    color = (37, 99, 235, 255)
    raw = b''.join(b'\x00' + bytes(color) * width for _ in range(height))

    def chunk(kind, data):
        return (
            struct.pack(">I", len(data)) +
            kind +
            data +
            struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
        )

    png = (
        b'\x89PNG\r\n\x1a\n' +
        chunk(b'IHDR', struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)) +
        chunk(b'IDAT', zlib.compress(raw, 9)) +
        chunk(b'IEND', b'')
    )

    Path(path).write_bytes(png)

for size in (16, 32, 48, 128):
    make_png(f"extensions/chrome/assets/icons/icon{size}.png", size)
    print(f"wrote: extensions/chrome/assets/icons/icon{size}.png")
PY
else
  echo "python3 not found; icon PNG files were not generated."
  echo "Add icon16.png, icon32.png, icon48.png, and icon128.png before loading the extension."
fi

echo ""
echo "CrabLink scaffold complete."
echo ""
echo "Verification:"
echo "  scripts/check-chrome.sh"
echo ""
echo "File count:"
find . -type f | sort | wc -l
