#!/usr/bin/env bash
# RO:WHAT — Static integrity checker for the CrabLink Chrome extension.
# RO:WHY — Verifies React-primary packaging and confirms old vanilla page files are inactive.
# RO:INTERACTS — manifest.json, background.js, popup.js/html, page.html redirect, react.html, app/pages/shared, package script.
# RO:INVARIANTS — gateway-only client; no fake backend truth; no silent ROC spend; root react.html is primary.
# RO:SECURITY — rejects risky permissions, raw src launch regressions, direct internal-service URLs, and unsafe wallet body drift.
# RO:TEST — run from repo root with scripts/check-chrome.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_DIR="$ROOT/extensions/chrome"
CHROME_SRC="$CHROME_DIR/src"

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
  "$ROOT/scripts/package-chrome.sh"
  "$ROOT/scripts/check-chrome.sh"
  "$ROOT/scripts/check-react-lane.sh"
  "$ROOT/scripts/make_codebundle.sh"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "missing: $file"
    exit 1
  fi
done

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required for CrabLink checks"
  exit 1
fi

ROOT_FOR_NODE="$ROOT" node --input-type=module <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.env.ROOT_FOR_NODE;
const chrome = path.join(root, 'extensions', 'chrome');
const chromeSrc = path.join(chrome, 'src');

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
    fail(`invalid JSON in ${path.relative(root, file)}: ${error.message}`);
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

  while (stack.length > 0) {
    const current = stack.pop();

    if (!fs.existsSync(current)) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', '.vite', 'coverage', 'retired-vanilla'].includes(entry.name)) {
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
  if (!fs.existsSync(folder)) return;

  for (const file of collectFiles(folder, /\.json$/)) {
    loadJson(file);
  }
}

const activeVanilla = fs
  .readdirSync(chromeSrc)
  .filter((name) => name === 'page.js' || name === 'page.css' || /^page-.*\.(js|css)$/.test(name));

if (activeVanilla.length > 0) {
  fail(`old vanilla page files must be retired from active src: ${activeVanilla.sort().join(', ')}`);
}

const manifest = loadJson(path.join(chrome, 'manifest.json'));
if (manifest.manifest_version !== 3) fail('manifest_version must be 3');
if (!manifest.action || typeof manifest.action !== 'object') fail('manifest.action is required');
if (manifest.action.default_popup) fail('manifest.action.default_popup must remain removed');
if (!manifest.background || manifest.background.service_worker !== 'src/background.js') {
  fail('manifest background service_worker must be src/background.js');
}
if (manifest.background.type !== 'module') fail('manifest background type must be module');
if (!manifest.omnibox || manifest.omnibox.keyword !== 'crab') fail('manifest omnibox keyword must be crab');

const permissions = manifest.permissions || [];
for (const required of ['storage', 'activeTab']) {
  if (!permissions.includes(required)) {
    fail(`manifest permissions must include ${required}`);
  }
}
for (const forbidden of ['tabs', 'history', 'cookies', 'downloads', 'webRequest', 'webRequestBlocking', 'nativeMessaging', 'unlimitedStorage', 'clipboardRead']) {
  if (permissions.includes(forbidden)) {
    fail(`manifest must not request risky permission: ${forbidden}`);
  }
}

const allowedHosts = new Set(['http://127.0.0.1:*/*', 'http://localhost:*/*']);
for (const host of manifest.host_permissions || []) {
  if (!allowedHosts.has(host)) {
    fail(`manifest host_permissions must remain local-only; found ${host}`);
  }
}

const background = readText(path.join(chromeSrc, 'background.js'));
for (const token of ['chrome.action.onClicked', 'react.html?url=', 'page.html?url=', 'preferredBrowserLane']) {
  requireIncludes(background, token, 'background.js');
}
for (const forbidden of ['src/react.html?url=', 'src/page.html?url=', '<hash>', '<64', '&lt;', 'chrome.history', 'chrome.cookies', 'webRequestBlocking', 'nativeMessaging']) {
  forbidIncludes(background, forbidden, 'background.js');
}

const popupJs = readText(path.join(chromeSrc, 'popup.js'));
for (const token of ['chrome.tabs.create', 'react.html?url=', 'page.html?url=']) {
  requireIncludes(popupJs, token, 'popup.js');
}
for (const forbidden of ['src/react.html?url=', 'src/page.html?url=', 'fetch(', 'wallet/hold', 'assets/image', 'sites/prepare', 'Authorization', 'privateKey', 'seedPhrase']) {
  forbidIncludes(popupJs, forbidden, 'popup.js');
}

const pageHtml = readText(path.join(chromeSrc, 'page.html'));
for (const token of ['react.html', 'compatibility redirect', 'window.location.replace']) {
  requireIncludes(pageHtml, token, 'page.html compatibility redirect');
}
for (const forbidden of ['./page.js', './page-', './page.css', 'id="drawerRoc"', 'page-local-route-mode']) {
  forbidIncludes(pageHtml, forbidden, 'page.html compatibility redirect');
}

const reactHtml = readText(path.join(chromeSrc, 'react.html'));
for (const token of ['id="root"', './app/main.jsx', 'type="module"']) {
  requireIncludes(reactHtml, token, 'react.html source entry');
}

const routeRegistry = readText(path.join(chromeSrc, 'app', 'routeRegistry.js'));
for (const route of ['home', 'site', 'image', 'profile', 'music', 'lyrics', 'article', 'post', 'comment', 'video', 'stream', 'podcast', 'ad', 'algo', 'code', 'game', 'asset', 'notFound', 'problem']) {
  requireIncludes(routeRegistry, `${route}: lazy(() => import(`, 'routeRegistry.js');
}

const walletClientPath = path.join(chromeSrc, 'shared', 'api', 'walletClient.js');
const walletModule = await import(pathToFileURL(walletClientPath).href);
if (typeof walletModule.toWalletHoldApiBody !== 'function') {
  fail('shared/api/walletClient.js missing toWalletHoldApiBody export');
}

const holdBody = walletModule.toWalletHoldApiBody({
  from: 'acct:main',
  to: 'acct:escrow',
  asset: 'roc',
  amount_minor: '25',
  nonce: 7,
  memo: 'CrabLink static contract check',
  idempotency_key: 'check-wallet-hold-7',
});

const expectedHoldKeys = ['amount_minor', 'asset', 'from', 'idempotency_key', 'memo', 'nonce', 'to'];
const actualHoldKeys = Object.keys(holdBody).sort();
if (JSON.stringify(actualHoldKeys) !== JSON.stringify(expectedHoldKeys)) {
  fail(`toWalletHoldApiBody keys drifted: expected ${expectedHoldKeys.join(',')} got ${actualHoldKeys.join(',')}`);
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

loadAllJsonIn(path.join(root, 'shared', 'fixtures'));
loadAllJsonIn(path.join(root, 'shared', 'schemas'));
loadAllJsonIn(path.join(chrome, 'test', 'fixtures'));

console.log('json/structure checks: ok');
NODE

while IFS= read -r file; do
  node --check "$file" >/dev/null
done < <(
  find "$CHROME_SRC" -type f -name '*.js' \
    ! -path "$CHROME_SRC/legacy/retired-vanilla/*" \
    ! -path "$CHROME_SRC/app/*" \
    ! -path "$CHROME_SRC/pages/*" \
    ! -path "$CHROME_SRC/shared/*" \
    | sort
)

while IFS= read -r file; do
  node --check "$file" >/dev/null
done < <(
  find "$CHROME_SRC/app" "$CHROME_SRC/shared" "$CHROME_SRC/pages" -type f -name '*.js' | sort
)

bash -n "$ROOT/scripts/check-chrome.sh" >/dev/null
bash -n "$ROOT/scripts/check-react-lane.sh" >/dev/null
bash -n "$ROOT/scripts/package-chrome.sh" >/dev/null
bash -n "$ROOT/scripts/smoke-local-gateway.sh" >/dev/null
bash -n "$ROOT/scripts/smoke-profile-gateway.sh" >/dev/null
bash -n "$ROOT/scripts/smoke-first-run-profile.sh" >/dev/null
bash -n "$ROOT/scripts/green-gate-local.sh" >/dev/null
bash -n "$ROOT/scripts/make_codebundle.sh" >/dev/null

if [[ -f "$ROOT/scripts/smoke-site-create-local.sh" ]]; then
  bash -n "$ROOT/scripts/smoke-site-create-local.sh" >/dev/null
fi

echo "json/structure checks: ok"
echo "javascript syntax checks: ok"
echo "bash syntax checks: ok"
echo "CrabLink Chrome extension checks passed."