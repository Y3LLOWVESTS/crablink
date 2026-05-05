#!/usr/bin/env bash
# RO:WHAT — Local structural checker for the CrabLink Chrome extension.
# RO:WHY — Catch missing files, bad JSON, broad permissions, and obvious NEXT_LEVEL/site-render drift before packaging.
# RO:INTERACTS — extensions/chrome, shared/schemas, shared/fixtures, smoke scripts.
# RO:INVARIANTS — minimal permissions; gateway-only; no broad host access; no old crab://b3/<hash> UX.
# RO:METRICS — none.
# RO:CONFIG — none.
# RO:SECURITY — blocks risky manifest permissions and checks crab-image/site-creator proof remains read-only/gateway-only.
# RO:TEST — run from crablink repo root with scripts/check-chrome.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_DIR="$ROOT/extensions/chrome"
SHARED_DIR="$ROOT/shared"

required_files=(
  "$CHROME_DIR/manifest.json"
  "$CHROME_DIR/src/background.js"
  "$CHROME_DIR/src/content.js"
  "$CHROME_DIR/src/popup.html"
  "$CHROME_DIR/src/popup.js"
  "$CHROME_DIR/src/options.html"
  "$CHROME_DIR/src/options.js"
  "$CHROME_DIR/src/styles.css"
  "$CHROME_DIR/src/page.html"
  "$CHROME_DIR/src/page.js"
  "$CHROME_DIR/src/page-constants.js"
  "$CHROME_DIR/src/page-dom.js"
  "$CHROME_DIR/src/page-utils.js"
  "$CHROME_DIR/src/page-workflow.js"
  "$CHROME_DIR/src/page-product-preview.js"
  "$CHROME_DIR/src/page-site-root-upload.js"
  "$CHROME_DIR/src/page-site-render-mode.js"
  "$CHROME_DIR/src/page-site-creator-proof.js"
  "$CHROME_DIR/src/page.css"
  "$CHROME_DIR/src/ronClient.js"
  "$CHROME_DIR/src/storage.js"
  "$CHROME_DIR/src/crab.js"
  "$CHROME_DIR/assets/icons/icon16.png"
  "$CHROME_DIR/assets/icons/icon32.png"
  "$CHROME_DIR/assets/icons/icon48.png"
  "$CHROME_DIR/assets/icons/icon128.png"
  "$SHARED_DIR/schemas/asset-page.schema.json"
  "$SHARED_DIR/schemas/site-page.schema.json"
  "$SHARED_DIR/schemas/problem.schema.json"
  "$SHARED_DIR/schemas/extension-settings.schema.json"
  "$SHARED_DIR/schemas/identity-me.schema.json"
  "$SHARED_DIR/schemas/passport-bootstrap.schema.json"
  "$SHARED_DIR/schemas/wallet-balance.schema.json"
  "$SHARED_DIR/fixtures/asset-page.sample.json"
  "$SHARED_DIR/fixtures/site-page.sample.json"
  "$SHARED_DIR/fixtures/problem.not-found.json"
  "$SHARED_DIR/fixtures/problem.policy-denied.json"
  "$SHARED_DIR/fixtures/identity-me.empty.sample.json"
  "$SHARED_DIR/fixtures/identity-me.ready.sample.json"
  "$SHARED_DIR/fixtures/passport-bootstrap.sample.json"
  "$SHARED_DIR/fixtures/wallet-balance.sample.json"
  "$ROOT/scripts/check-chrome.sh"
  "$ROOT/scripts/package-chrome.sh"
  "$ROOT/scripts/smoke-local-gateway.sh"
  "$ROOT/scripts/smoke-site-create-local.sh"
  "$ROOT/scripts/green-gate-local.sh"
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

ROOT_FOR_NODE="$ROOT" node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.env.ROOT_FOR_NODE;
const chrome = path.join(root, 'extensions', 'chrome');
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

function requireAnyIncludes(source, tokens, label) {
  if (!tokens.some((token) => source.includes(token))) {
    fail(`${label} missing one of: ${tokens.join(' | ')}`);
  }
}

function forbidIncludes(source, token, label) {
  if (source.includes(token)) {
    fail(`${label} must not include token: ${token}`);
  }
}

function loadAllJsonIn(folder) {
  for (const entry of fs.readdirSync(folder)) {
    if (entry.endsWith('.json')) {
      loadJson(path.join(folder, entry));
    }
  }
}

const manifest = loadJson(path.join(chrome, 'manifest.json'));

if (manifest.manifest_version !== 3) fail('manifest_version must be 3');
if (!manifest.omnibox || manifest.omnibox.keyword !== 'crab') {
  fail('manifest omnibox keyword must be crab');
}

const permissions = new Set(manifest.permissions || []);
const allowedPermissions = new Set(['storage', 'activeTab']);

for (const permission of permissions) {
  if (!allowedPermissions.has(permission)) {
    fail(`unexpected Chrome permission: ${permission}`);
  }
}

const hostPermissions = new Set(manifest.host_permissions || []);
const allowedHosts = new Set(['http://127.0.0.1:*/*', 'http://localhost:*/*']);

for (const host of hostPermissions) {
  if (!allowedHosts.has(host)) {
    fail(`unexpected host permission: ${host}`);
  }
}

for (const blocked of [
  '<all_urls>',
  'tabs',
  'history',
  'cookies',
  'downloads',
  'webRequest',
  'webRequestBlocking',
  'nativeMessaging',
  'unlimitedStorage',
  'clipboardRead'
]) {
  if (permissions.has(blocked)) {
    fail(`blocked permission present: ${blocked}`);
  }
}

const popupHtml = readText(path.join(chrome, 'src', 'popup.html'));
const popupJs = readText(path.join(chrome, 'src', 'popup.js'));
const pageHtml = readText(path.join(chrome, 'src', 'page.html'));
const pageCss = readText(path.join(chrome, 'src', 'page.css'));
const ronClient = readText(path.join(chrome, 'src', 'ronClient.js'));
const storageJs = readText(path.join(chrome, 'src', 'storage.js'));
const crabJs = readText(path.join(chrome, 'src', 'crab.js'));
const optionsHtml = readText(path.join(chrome, 'src', 'options.html'));
const optionsJs = readText(path.join(chrome, 'src', 'options.js'));
const backgroundJs = readText(path.join(chrome, 'src', 'background.js'));
const siteRenderModeSource = readText(path.join(chrome, 'src', 'page-site-render-mode.js'));
const siteCreatorProofSource = readText(path.join(chrome, 'src', 'page-site-creator-proof.js'));
const smokeLocal = readText(path.join(root, 'scripts', 'smoke-local-gateway.sh'));
const smokeSite = readText(path.join(root, 'scripts', 'smoke-site-create-local.sh'));
const greenGate = readText(path.join(root, 'scripts', 'green-gate-local.sh'));

const pageModuleNames = [
  'page.js',
  'page-constants.js',
  'page-dom.js',
  'page-utils.js',
  'page-workflow.js',
  'page-product-preview.js',
  'page-site-root-upload.js',
  'page-site-render-mode.js',
  'page-site-creator-proof.js'
];

const pageSources = pageModuleNames
  .map((name) => readText(path.join(chrome, 'src', name)))
  .join('\n');

const allSources = [
  popupHtml,
  popupJs,
  pageHtml,
  pageCss,
  ronClient,
  storageJs,
  crabJs,
  optionsHtml,
  optionsJs,
  backgroundJs,
  pageSources
].join('\n');

for (const token of [
  './page-site-root-upload.js',
  './page-product-preview.js',
  './page-site-render-mode.js',
  './page-site-creator-proof.js'
]) {
  requireIncludes(pageHtml, token, 'page.html');
}

for (const id of [
  'addressForm',
  'addressInput',
  'goButton',
  'backButton',
  'forwardButton',
  'homeButton',
  'refreshButton',
  'passportButton',
  'settingsButton',
  'topRocBalance',
  'passportDrawer',
  'pagePanel',
  'workflowSection',
  'workflowForm',
  'developerJson'
]) {
  requireIncludes(pageHtml, `id="${id}"`, 'page.html');
}

for (const token of [
  'Full-tab CrabLink browser shell',
  'navigateTo',
  'renderBuiltinPage',
  'renderAssetPage',
  'client.resolveCrab',
  'client.resolveSite',
  'client.getB3Asset',
  'client.prepareImageAsset',
  'client.prepareSite',
  'client.createWalletHold',
  'client.createSite',
  'refreshBalanceAfterMutation'
]) {
  requireIncludes(pageSources, token, 'page modules');
}

for (const token of [
  'RO:WHAT',
  'IMAGE_EMBED_SELECTOR',
  'crab-image[src], img[data-crab-src]',
  'hydrateCrabImageEmbeds',
  'hydrateOneCrabImage',
  'fetchCrabImageObjectUrl',
  'parseCrabImageRef',
  '/o/b3:${ref.hash}',
  'Site Manifest'
]) {
  requireIncludes(siteRenderModeSource, token, 'page-site-render-mode.js');
}

requireAnyIncludes(
  siteRenderModeSource,
  [
    'Only crab://<64 lowercase hex>.image references are supported',
    'crab://<64 lowercase hex>.image'
  ],
  'page-site-render-mode.js canonical crab image support'
);

for (const token of [
  'img-src data: blob:',
  "script-src 'none'",
  "connect-src 'none'"
]) {
  requireIncludes(siteRenderModeSource, token, 'page-site-render-mode.js sandbox policy');
}

for (const token of [
  'RO:WHAT',
  'site creator:',
  'site-creator-chip',
  'site-creator-link',
  'site-creator-stats',
  'site-reputation-score',
  'site-moderator-score',
  'creatorHandle',
  'creatorProfileCrabUrl',
  'creatorReputationLabel',
  'creatorModeratorLabel',
  'crablinkSiteCreatorHandle'
]) {
  requireIncludes(siteCreatorProofSource, token, 'page-site-creator-proof.js');
}

requireAnyIncludes(
  siteCreatorProofSource,
  [
    'CrabLink will not invent reputation truth',
    'not invent reputation truth',
    'will not invent'
  ],
  'page-site-creator-proof.js reputation truth guard'
);

for (const token of [
  'getHealth()',
  'getReady()',
  'getIdentity()',
  'bootstrapPassport(',
  'getWalletBalance(',
  'resolveCrab(',
  'getB3Asset(',
  'resolveSite(',
  'prepareImageAsset(',
  'prepareSite(',
  'createSite(',
  'createWalletHold(',
  'uploadImageAsset(',
  'requestRaw(',
  'x-ron-wallet-txid',
  'stableIdempotencyKey'
]) {
  requireIncludes(ronClient, token, 'ronClient.js');
}

for (const token of [
  'function makeCorrelationId()',
  'stableIdempotencyKey(',
  'compactIdempotencyKey(',
  'fnv1a64Hex('
]) {
  requireIncludes(ronClient, token, 'ronClient idempotency/correlation helpers');
}

for (const token of [
  'SETTINGS_SCHEMA_VERSION = 3',
  'getSettings',
  'saveIdentityState',
  'saveBalanceState',
  'lastStarterGrantLedgerBacked'
]) {
  requireIncludes(storageJs, token, 'storage.js');
}

for (const token of [
  'schemaVersion: 3',
  'chrome.omnibox.onInputEntered',
  'openCrabLinkPage',
  'src/page.html?url=',
  'music',
  'article'
]) {
  requireIncludes(backgroundJs, token, 'background.js');
}

for (const token of [
  'normalizeCrabInput',
  'parseCrabUrl',
  'formatCrabAsset',
  'formatB3',
  'normalizeHash',
  'normalizeAssetKind'
]) {
  requireIncludes(crabJs, token, 'crab.js');
}

requireAnyIncludes(
  crabJs,
  [
    'crab://${normalizeHash(hash)}.${normalizeAssetKind(kind)}',
    'crab://${hash}.${kind}',
    'crab://'
  ],
  'crab.js crab asset formatting'
);

for (const token of [
  'CrabLink',
  'gateway',
  'passport',
  'wallet',
  'Create'
]) {
  requireIncludes(popupHtml + popupJs, token, 'popup files');
}

for (const token of [
  'gatewayUrl',
  'passportSubject',
  'walletAccount',
  'requestTimeoutMs'
]) {
  requireIncludes(optionsHtml + optionsJs, token, 'options files');
}

for (const token of [
  'CRABLINK_SMOKE_RUN_UPLOAD',
  'CRABLINK_SMOKE_RUN_KNOWN_GOOD',
  'CRABLINK_SMOKE_RUN_BOOTSTRAP',
  '/assets/image/prepare',
  '/assets/image',
  '/wallet/hold'
]) {
  requireIncludes(smokeLocal, token, 'smoke-local-gateway.sh');
}

requireAnyIncludes(
  smokeLocal,
  [
    'raw byte match',
    'paid_image_raw',
    'raw bytes',
    'raw_byte',
    '/o/',
    'gateway raw'
  ],
  'smoke-local-gateway.sh raw preview verification'
);

requireAnyIncludes(
  smokeLocal,
  [
    'POST /assets/image/prepare',
    '/assets/image/prepare'
  ],
  'smoke-local-gateway.sh image prepare route'
);

requireAnyIncludes(
  smokeLocal,
  [
    'POST /assets/image',
    '/assets/image'
  ],
  'smoke-local-gateway.sh image upload route'
);

for (const token of [
  'CRABLINK_SITE_REQUIRE_CRAB_RESOLVE',
  '/sites/prepare',
  '/sites',
  '/wallet/hold',
  'crab://$CRABLINK_SITE_NAME',
  'x-ron-wallet-hold-txid',
  'x-ron-wallet-txid'
]) {
  requireIncludes(smokeSite, token, 'smoke-site-create-local.sh');
}

requireAnyIncludes(
  smokeSite,
  [
    'GET /sites',
    '/sites/$(url_encode "$CRABLINK_SITE_NAME")',
    '/sites/$',
    'site_page'
  ],
  'smoke-site-create-local.sh site lookup route'
);

for (const token of [
  'CRABLINK_GREEN_MUTATING',
  'CRABLINK_GREEN_RUN_UPLOAD',
  'CRABLINK_GREEN_RUN_SITE',
  'scripts/check-chrome.sh',
  'scripts/package-chrome.sh',
  'scripts/smoke-local-gateway.sh',
  'scripts/smoke-site-create-local.sh'
]) {
  requireIncludes(greenGate, token, 'green-gate-local.sh');
}

loadAllJsonIn(path.join(shared, 'schemas'));
loadAllJsonIn(path.join(shared, 'fixtures'));

const assetSchema = loadJson(path.join(shared, 'schemas', 'asset-page.schema.json'));
if (assetSchema.type !== 'object') {
  fail('asset-page schema must describe a JSON object');
}

const siteSchema = loadJson(path.join(shared, 'schemas', 'site-page.schema.json'));
if (siteSchema.type !== 'object') {
  fail('site-page schema must describe a JSON object');
}

const settingsSchema = loadJson(path.join(shared, 'schemas', 'extension-settings.schema.json'));
if (settingsSchema.properties?.schemaVersion?.const !== 3) {
  fail('extension-settings schemaVersion const must be 3');
}

const bootstrap = loadJson(path.join(shared, 'fixtures', 'passport-bootstrap.sample.json'));
const grant = bootstrap.starter_grant || {};
if (bootstrap.schema !== 'crablink.identity.bootstrap.v1') {
  fail('passport-bootstrap fixture schema must be crablink.identity.bootstrap.v1');
}
if (grant.issued !== true || String(grant.amount_minor_units) !== '1776' || !grant.receipt_id) {
  fail('passport-bootstrap fixture must show issued 1776 ROC with a receipt');
}
if ((bootstrap.capabilities || {}).can_spend === true) {
  fail('passport bootstrap fixture must not grant can_spend');
}

const balance = loadJson(path.join(shared, 'fixtures', 'wallet-balance.sample.json'));
if (balance.schema !== 'crablink.wallet.balance.v1') {
  fail('wallet-balance fixture schema must be crablink.wallet.balance.v1');
}
if (balance.ledger_backed !== true || balance.source !== 'svc_wallet.v1') {
  fail('wallet-balance fixture must be ledger-backed from svc_wallet.v1');
}

const siteFixture = loadJson(path.join(shared, 'fixtures', 'site-page.sample.json'));
const siteFixtureType = siteFixture.schema || siteFixture.type || '';
if (siteFixtureType !== 'omnigate.site-page.v1') {
  fail('site-page fixture must identify omnigate.site-page.v1 through schema or type');
}

const assetFixture = loadJson(path.join(shared, 'fixtures', 'asset-page.sample.json'));
const assetFixtureType = assetFixture.schema || assetFixture.type || '';
if (assetFixtureType && assetFixtureType !== 'omnigate.asset-page.v1') {
  fail('asset-page fixture type/schema must be omnigate.asset-page.v1 when present');
}

for (const forbidden of [
  'crab://b3/',
  'client.createImageAsset',
  'createSiteButton',
  'owner_wallet_account: settings.walletAccount || undefined,\n      content_type'
]) {
  forbidIncludes(allSources, forbidden, 'extension sources');
}

for (const forbidden of [
  '<all_urls>',
  'chrome.tabs.query',
  'chrome.history',
  'chrome.cookies',
  'webRequestBlocking',
  'nativeMessaging'
]) {
  forbidIncludes(allSources, forbidden, 'extension sources');
}

console.log('json/structure checks: ok');
NODE

node --check "$CHROME_DIR/src/background.js" >/dev/null
node --check "$CHROME_DIR/src/content.js" >/dev/null
node --check "$CHROME_DIR/src/crab.js" >/dev/null
node --check "$CHROME_DIR/src/ronClient.js" >/dev/null
node --check "$CHROME_DIR/src/storage.js" >/dev/null
node --check "$CHROME_DIR/src/popup.js" >/dev/null
node --check "$CHROME_DIR/src/page.js" >/dev/null
node --check "$CHROME_DIR/src/page-constants.js" >/dev/null
node --check "$CHROME_DIR/src/page-dom.js" >/dev/null
node --check "$CHROME_DIR/src/page-utils.js" >/dev/null
node --check "$CHROME_DIR/src/page-workflow.js" >/dev/null
node --check "$CHROME_DIR/src/page-product-preview.js" >/dev/null
node --check "$CHROME_DIR/src/page-site-root-upload.js" >/dev/null
node --check "$CHROME_DIR/src/page-site-render-mode.js" >/dev/null
node --check "$CHROME_DIR/src/page-site-creator-proof.js" >/dev/null
node --check "$CHROME_DIR/src/options.js" >/dev/null

bash -n "$ROOT/scripts/check-chrome.sh" >/dev/null
bash -n "$ROOT/scripts/package-chrome.sh" >/dev/null
bash -n "$ROOT/scripts/smoke-local-gateway.sh" >/dev/null
bash -n "$ROOT/scripts/smoke-site-create-local.sh" >/dev/null
bash -n "$ROOT/scripts/green-gate-local.sh" >/dev/null
bash -n "$ROOT/scripts/make_codebundle.sh" >/dev/null

echo "javascript syntax checks: ok"
echo "bash syntax checks: ok"
echo "CrabLink Chrome extension checks passed."