#!/usr/bin/env bash
# RO:WHAT — Static integrity checker for the CrabLink Chrome extension.
# RO:WHY — Keeps the React-primary cutover safe while preserving legacy page.html as a fallback.
# RO:INTERACTS — manifest.json, background.js, popup.js/html, react.html, page.html, shared fixtures, packaging scripts.
# RO:INVARIANTS — local host permissions only; gateway-only client boundary; no fake backend truth; no silent ROC spend.
# RO:METRICS — none.
# RO:CONFIG — repo-relative paths only.
# RO:SECURITY — rejects risky Chrome permissions and direct internal service URLs.
# RO:TEST — run from repo root with scripts/check-chrome.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_DIR="$ROOT/extensions/chrome"
CHROME_SRC="$CHROME_DIR/src"
SHARED_DIR="$ROOT/shared"

cd "$ROOT"

required_files=(
  "$CHROME_DIR/manifest.json"
  "$CHROME_SRC/background.js"
  "$CHROME_SRC/content.js"
  "$CHROME_SRC/popup.html"
  "$CHROME_SRC/popup.js"
  "$CHROME_SRC/options.html"
  "$CHROME_SRC/options.js"
  "$CHROME_SRC/page.html"
  "$CHROME_SRC/page.js"
  "$CHROME_SRC/react.html"
  "$CHROME_SRC/app/main.jsx"
  "$CHROME_SRC/app/App.jsx"
  "$CHROME_SRC/app/router.js"
  "$CHROME_SRC/app/routeRegistry.js"
  "$CHROME_SRC/shared/api/gatewayClient.js"
  "$CHROME_SRC/shared/api/walletClient.js"
  "$CHROME_SRC/shared/api/identityClient.js"
  "$CHROME_SRC/shared/api/assetClient.js"
  "$CHROME_SRC/shared/api/siteClient.js"
  "$SHARED_DIR/fixtures/asset-page.sample.json"
  "$SHARED_DIR/fixtures/problem.not-found.json"
  "$SHARED_DIR/fixtures/problem.policy-denied.json"
  "$SHARED_DIR/fixtures/identity-me.empty.sample.json"
  "$SHARED_DIR/fixtures/identity-me.ready.sample.json"
  "$SHARED_DIR/fixtures/passport-bootstrap.sample.json"
  "$SHARED_DIR/fixtures/public-profile.confirmed.sample.json"
  "$SHARED_DIR/fixtures/wallet-balance.sample.json"
  "$ROOT/scripts/check-chrome.sh"
  "$ROOT/scripts/check-react-lane.sh"
  "$ROOT/scripts/package-chrome.sh"
  "$ROOT/scripts/smoke-local-gateway.sh"
  "$ROOT/scripts/smoke-profile-gateway.sh"
  "$ROOT/scripts/smoke-first-run-profile.sh"
  "$ROOT/scripts/green-gate-local.sh"
  "$ROOT/scripts/make_codebundle.sh"
)

optional_files=(
  "$ROOT/scripts/smoke-site-create-local.sh"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "missing: $file"
    exit 1
  fi
done

if [[ -f "$CHROME_SRC/page-local-route-mode.js" ]]; then
  echo "error: page-local-route-mode.js must not exist; it regressed creator-route navigation"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required for CrabLink checks"
  exit 1
fi

ROOT_FOR_NODE="$ROOT" node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.env.ROOT_FOR_NODE;
const chrome = path.join(root, 'extensions', 'chrome');
const chromeSrc = path.join(chrome, 'src');
const shared = path.join(root, 'shared');

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function loadJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch (error) {
    fail(`invalid JSON in ${file}: ${error.message}`);
  }
}

function requireIncludes(source, token, label) {
  if (!source.includes(token)) {
    fail(`${label} missing token: ${token}`);
  }
}

function forbidIncludes(source, token, label) {
  if (source.includes(token)) {
    fail(`${label} must not include token: ${token}`);
  }
}

function collectFiles(dir, pattern) {
  const out = [];
  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', '.vite', 'coverage'].includes(entry.name)) {
          stack.push(full);
        }
        continue;
      }

      if (pattern.test(entry.name)) {
        out.push(full);
      }
    }
  }

  return out.sort();
}

function loadAllJsonIn(folder) {
  if (!fs.existsSync(folder)) {
    return;
  }

  for (const file of collectFiles(folder, /\.json$/)) {
    loadJson(file);
  }
}

const manifest = loadJson(path.join(chrome, 'manifest.json'));

if (manifest.manifest_version !== 3) fail('manifest_version must be 3');
if (!manifest.action || typeof manifest.action !== 'object') fail('manifest.action is required');
if (manifest.action.default_popup) fail('manifest.action.default_popup must remain removed; extension icon opens full CrabLink browser');
if (!manifest.background || manifest.background.service_worker !== 'src/background.js') fail('manifest background service_worker must be src/background.js');
if (manifest.background.type !== 'module') fail('manifest background type must be module');
if (!manifest.omnibox || manifest.omnibox.keyword !== 'crab') fail('manifest omnibox keyword must be crab');

const permissions = manifest.permissions || [];
for (const required of ['storage', 'activeTab']) {
  if (!permissions.includes(required)) {
    fail(`manifest permissions must include ${required}`);
  }
}

for (const forbidden of [
  'tabs',
  'history',
  'cookies',
  'downloads',
  'webRequest',
  'webRequestBlocking',
  'nativeMessaging',
  'unlimitedStorage',
  'clipboardRead',
]) {
  if (permissions.includes(forbidden)) {
    fail(`manifest must not request risky permission: ${forbidden}`);
  }
}

const hostPermissions = manifest.host_permissions || [];
const allowedHosts = new Set(['http://127.0.0.1:*/*', 'http://localhost:*/*']);

for (const host of hostPermissions) {
  if (!allowedHosts.has(host)) {
    fail(`manifest host_permissions must remain local-only; found ${host}`);
  }
}

const background = readText(path.join(chromeSrc, 'background.js'));
for (const token of [
  'chrome.action.onClicked',
  'chrome.omnibox.setDefaultSuggestion',
  'src/react.html?url=',
  'src/page.html?url=',
  'preferredBrowserLane',
  'reactprofile',
  'legacy',
  'crab://64hex.image',
]) {
  requireIncludes(background, token, 'background.js');
}

for (const forbidden of [
  '<hash>',
  '<64',
  '&lt;',
  'chrome.history',
  'chrome.cookies',
  'webRequestBlocking',
  'nativeMessaging',
  'http://127.0.0.1:5303',
  'http://127.0.0.1:5304',
  'http://127.0.0.1:8088',
  'http://127.0.0.1:9090',
  'svc-wallet',
  'svc-storage',
  'svc-index',
  'ron-ledger',
]) {
  forbidIncludes(background, forbidden, 'background.js');
}

const popupHtml = readText(path.join(chromeSrc, 'popup.html'));
for (const token of [
  'Open React CrabLink',
  'Open Legacy Fallback',
  './popup.js',
  'crab://<hash>.image',
]) {
  requireIncludes(popupHtml, token, 'popup.html');
}

const popupJs = readText(path.join(chromeSrc, 'popup.js'));
for (const token of [
  'chrome.tabs.create',
  'src/react.html?url=',
  'src/page.html?url=',
  'launchCrabLinkBrowser(\'react\')',
  'launchCrabLinkBrowser(\'legacy\')',
]) {
  requireIncludes(popupJs, token, 'popup.js');
}

for (const forbidden of [
  'fetch(',
  'wallet/hold',
  'assets/image',
  'sites/prepare',
  'Authorization',
  'privateKey',
  'seedPhrase',
]) {
  forbidIncludes(popupJs, forbidden, 'popup.js');
}

const pageHtml = readText(path.join(chromeSrc, 'page.html'));
for (const token of [
  './page.js',
  './page-site-root-upload.js',
  './page-product-preview.js',
  './page-site-render-mode.js',
  './page-site-creator-proof.js',
  './page-profile-home.js',
  './page-profile-editor.js',
  './page-profile-gateway.js',
  './page-profile-avatar.js',
  './page-local-catalog.js',
  './page-profile-polish.js',
  './page-article-draft.js',
  './page-video-draft.js',
  './page-stream-draft.js',
  './page-podcast-draft.js',
  './page-alt-vault.js',
  'id="drawerRoc"',
  'hidden aria-hidden="true"',
]) {
  requireIncludes(pageHtml, token, 'page.html legacy lane');
}

for (const forbidden of [
  './page-local-route-mode.js',
  './page-passport-home.js',
  'passportNextLevelCard',
  'passport-permission-grid',
  'passport-home-actions',
  'passport-username-form',
]) {
  forbidIncludes(pageHtml, forbidden, 'page.html');
}

const reactHtml = readText(path.join(chromeSrc, 'react.html'));
for (const token of [
  'id="root"',
  './app/main.jsx',
  'type="module"',
]) {
  requireIncludes(reactHtml, token, 'react.html');
}

const routeRegistry = readText(path.join(chromeSrc, 'app', 'routeRegistry.js'));
for (const route of [
  'home',
  'site',
  'image',
  'profile',
  'music',
  'lyrics',
  'article',
  'post',
  'comment',
  'video',
  'stream',
  'podcast',
  'ad',
  'algo',
  'code',
  'game',
  'asset',
  'notFound',
  'problem',
]) {
  requireIncludes(routeRegistry, `${route}: lazy(() => import(`, 'routeRegistry.js');
}

const router = readText(path.join(chromeSrc, 'app', 'router.js'));
for (const token of [
  'crab://home',
  'TYPED_ASSET_RE',
  'PROFILE_HANDLE_RE',
  'kind: \'site\'',
]) {
  requireIncludes(router, token, 'router.js');
}
forbidIncludes(router, 'crab://b3/', 'router.js');

const appMain = readText(path.join(chromeSrc, 'app', 'main.jsx'));
for (const token of [
  'createRoot',
  "import App from './App.jsx'",
  '../shared/theme/themeTokens.css',
  '../shared/theme/light.css',
  '../shared/theme/dark.css',
]) {
  requireIncludes(appMain, token, 'app/main.jsx');
}

const walletClient = readText(path.join(chromeSrc, 'shared', 'api', 'walletClient.js'));
for (const token of [
  'toWalletHoldApiBody',
  'expectedNonceFromWalletError',
  'loadNextNonceHint',
  'persistNextNonceHint',
  'confirmed !== true',
]) {
  requireIncludes(walletClient, token, 'shared/api/walletClient.js');
}

const bodyStart = walletClient.indexOf('export function toWalletHoldApiBody');
if (bodyStart < 0) {
  fail('shared/api/walletClient.js missing toWalletHoldApiBody');
}
const bodyEnd = walletClient.indexOf('\n}', bodyStart);
const holdBody = walletClient.slice(bodyStart, bodyEnd > bodyStart ? bodyEnd : bodyStart + 700);

for (const token of ['from:', 'to:', 'asset:', 'amount_minor:', 'nonce:', 'memo:', 'idempotency_key:']) {
  requireIncludes(holdBody, token, 'toWalletHoldApiBody');
}

for (const forbidden of [
  'schema',
  'api_request',
  'apiRequest',
  'ui_preview_request',
  'uiPreviewRequest',
  'hold_template',
  'holdTemplate',
  'wallet_hold',
  'walletHold',
  'paid_storage',
  'paidStorage',
]) {
  forbidIncludes(holdBody, forbidden, 'toWalletHoldApiBody strict body');
}

const reactSources = collectFiles(path.join(chromeSrc, 'app'), /\.(js|jsx|css|html)$/)
  .concat(collectFiles(path.join(chromeSrc, 'pages'), /\.(js|jsx|css|html)$/))
  .concat(collectFiles(path.join(chromeSrc, 'shared'), /\.(js|jsx|css|html)$/));

for (const file of reactSources) {
  const source = readText(file);
  const label = path.relative(root, file);

  for (const forbidden of [
    'page-local-route-mode',
    'crab://b3/',
    '<all_urls>',
    'chrome.history',
    'chrome.cookies',
    'webRequestBlocking',
    'nativeMessaging',
    'x-ron-wallet-hold-txid',
    'walletPrivateKey',
    'mainPrivateKey',
    'privateAltKey',
    'http://127.0.0.1:5303',
    'http://localhost:5303',
    'http://127.0.0.1:5304',
    'http://localhost:5304',
    'http://127.0.0.1:8088',
    'http://localhost:8088',
    'http://127.0.0.1:9090',
    'http://localhost:9090',
    '/v1/passport/profile',
    '/v1/identity/passport/profile',
  ]) {
    forbidIncludes(source, forbidden, label);
  }
}

loadAllJsonIn(path.join(shared, 'fixtures'));
loadAllJsonIn(path.join(shared, 'schemas'));
loadAllJsonIn(path.join(chrome, 'test', 'fixtures'));

console.log('json/structure checks: ok');
NODE

for file in \
  "$CHROME_SRC/background.js" \
  "$CHROME_SRC/content.js" \
  "$CHROME_SRC/popup.js" \
  "$CHROME_SRC/options.js" \
  "$CHROME_SRC/storage.js" \
  "$CHROME_SRC/ronClient.js" \
  "$CHROME_SRC/crab.js"; do
  node --check "$file" >/dev/null
done

bash -n "$ROOT/scripts/check-chrome.sh" >/dev/null
bash -n "$ROOT/scripts/check-react-lane.sh" >/dev/null
bash -n "$ROOT/scripts/package-chrome.sh" >/dev/null
bash -n "$ROOT/scripts/smoke-local-gateway.sh" >/dev/null
bash -n "$ROOT/scripts/smoke-profile-gateway.sh" >/dev/null
bash -n "$ROOT/scripts/smoke-first-run-profile.sh" >/dev/null
bash -n "$ROOT/scripts/green-gate-local.sh" >/dev/null
bash -n "$ROOT/scripts/make_codebundle.sh" >/dev/null

for file in "${optional_files[@]}"; do
  if [[ -f "$file" ]]; then
    bash -n "$file" >/dev/null
  fi
done

echo "json/structure checks: ok"
echo "javascript syntax checks: ok"
echo "bash syntax checks: ok"
echo "CrabLink Chrome extension checks passed."