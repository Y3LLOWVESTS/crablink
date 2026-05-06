#!/usr/bin/env bash
# RO:WHAT — Local structural checker for the CrabLink Chrome extension.
# RO:WHY — Catch missing files, bad JSON, broad permissions, unsafe extension patterns, and creator-route regression drift.
# RO:INTERACTS — extensions/chrome, shared/schemas, shared/fixtures, smoke scripts.
# RO:INVARIANTS — minimal permissions; gateway-only; no broad host access; no old crab://b3/<hash> UX; no fake profile/wallet/alt/media truth.
# RO:METRICS — none.
# RO:CONFIG — none.
# RO:SECURITY — blocks risky manifest permissions, fake wallet/profile/alt truth patterns, and route-controller regressions.
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
  "$CHROME_DIR/src/page.css"
  "$CHROME_DIR/src/page.js"
  "$CHROME_DIR/src/page-constants.js"
  "$CHROME_DIR/src/page-dom.js"
  "$CHROME_DIR/src/page-utils.js"
  "$CHROME_DIR/src/page-workflow.js"
  "$CHROME_DIR/src/page-product-preview.js"
  "$CHROME_DIR/src/page-site-root-upload.js"
  "$CHROME_DIR/src/page-site-render-mode.js"
  "$CHROME_DIR/src/page-site-creator-proof.js"
  "$CHROME_DIR/src/page-profile-home.js"
  "$CHROME_DIR/src/page-profile-editor.js"
  "$CHROME_DIR/src/page-profile-avatar.js"
  "$CHROME_DIR/src/page-local-catalog.js"
  "$CHROME_DIR/src/page-profile-polish.js"
  "$CHROME_DIR/src/page-alt-vault.js"
  "$CHROME_DIR/src/page-article-draft.js"
  "$CHROME_DIR/src/page-video-draft.js"
  "$CHROME_DIR/src/page-stream-draft.js"
  "$CHROME_DIR/src/page-podcast-draft.js"
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
)

optional_files=(
  "$ROOT/scripts/make_codebundle.sh"
  "$ROOT/scripts/green-gate-local.sh"
  "$ROOT/scripts/smoke-site-create-local.sh"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "missing: $file"
    exit 1
  fi
done

if [[ -f "$CHROME_DIR/src/page-local-route-mode.js" ]]; then
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
    fail(`${label} missing one of: ${tokens.join(', ')}`);
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
if (!manifest.action || typeof manifest.action !== 'object') fail('manifest.action is required');
if (manifest.action.default_popup) fail('manifest.action.default_popup must be removed; extension icon opens full CrabLink browser');
if (!manifest.background || manifest.background.service_worker !== 'src/background.js') fail('manifest background service_worker must be src/background.js');
if (manifest.background.type !== 'module') fail('manifest background type must be module');
if (!manifest.omnibox || manifest.omnibox.keyword !== 'crab') fail('manifest omnibox keyword must be crab');

const permissions = manifest.permissions || [];
for (const required of ['storage', 'activeTab']) {
  if (!permissions.includes(required)) {
    fail(`manifest permissions missing ${required}`);
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
  'clipboardRead'
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

const pageHtml = readText(path.join(chrome, 'src', 'page.html'));
for (const token of [
  './page.js',
  './page-site-root-upload.js',
  './page-product-preview.js',
  './page-site-render-mode.js',
  './page-site-creator-proof.js',
  './page-profile-home.js',
  './page-profile-editor.js',
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
  'data-open-crab="crab://profile"',
  'data-open-crab="crab://article"',
  'data-open-crab="crab://video"',
  'data-open-crab="crab://stream"',
  'data-open-crab="crab://podcast"'
]) {
  requireIncludes(pageHtml, token, 'page.html');
}

for (const forbidden of [
  './page-local-route-mode.js',
  './page-passport-home.js',
  'passportNextLevelCard',
  'passport-permission-grid',
  'passport-home-actions',
  'passport-username-form'
]) {
  forbidIncludes(pageHtml, forbidden, 'page.html');
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
  'workflowPreview',
  'preparePreview',
  'holdPreview',
  'submitPreview',
  'actionsList',
  'fieldsList',
  'warningsList',
  'developerJson'
]) {
  requireIncludes(pageHtml, `id="${id}"`, 'page.html');
}

const background = readText(path.join(chrome, 'src', 'background.js'));
for (const token of [
  'chrome.action.onClicked',
  'src/page.html?url=',
  "'article'",
  "'video'",
  "'stream'",
  "'podcast'"
]) {
  requireIncludes(background, token, 'background.js');
}

const popupJs = readText(path.join(chrome, 'src', 'popup.js'));
requireIncludes(popupJs, 'chrome.tabs.create', 'popup.js');
requireIncludes(popupJs, 'src/page.html?url=', 'popup.js');

const pageConstants = readText(path.join(chrome, 'src', 'page-constants.js'));
for (const token of [
  'HOME_PAGE_URL',
  'crab://site',
  'BUILT_IN_RON_PAGES',
  'LOCAL_CREATOR_PAGES',
  "'article'",
  "'video'",
  "'stream'",
  "'podcast'"
]) {
  requireIncludes(pageConstants, token, 'page-constants.js');
}

const crab = readText(path.join(chrome, 'src', 'crab.js'));
for (const token of [
  'crab://',
  'b3:',
  "'video'",
  "'stream'",
  "'podcast'",
  "'article'",
  "'post'",
  "'comment'"
]) {
  requireIncludes(crab, token, 'crab.js');
}

const localCreatorFiles = [
  ['page-article-draft.js', 'article', '/assets/article/prepare', 'articleDraftSection'],
  ['page-video-draft.js', 'video', '/assets/video/prepare', 'videoDraftSection'],
  ['page-stream-draft.js', 'stream', '/streams/prepare', 'streamDraftSection'],
  ['page-podcast-draft.js', 'podcast', '/podcasts/prepare', 'podcastDraftSection']
];

for (const [fileName, route, prepareRoute, sectionId] of localCreatorFiles) {
  const source = readText(path.join(chrome, 'src', fileName));

  for (const token of [
    `crab://${route}`,
    prepareRoute,
    sectionId,
    'readCurrentCrabUrl',
    'No b3 CID',
    'No ROC',
    'No wallet mutation',
    'textContent',
    'createElement'
  ]) {
    requireIncludes(source, token, fileName);
  }

  for (const forbidden of [
    'page-local-route-mode',
    'walletPrivateKey',
    'mainPrivateKey',
    'seedPhrase',
    'privateAltKey',
    'innerHTML',
    'crab://b3/',
    'client.publish',
    'ron-ledger',
    'svc-storage',
    'svc-index',
    'svc-wallet'
  ]) {
    forbidIncludes(source, forbidden, fileName);
  }
}

const profileHomeSource = readText(path.join(chrome, 'src', 'page-profile-home.js'));
for (const token of [
  'crablink.public_profile_view.v1',
  'profile-cover-card',
  'profile-avatar-frame',
  'profile-avatar-photo',
  'profile-edit-button',
  'Edit Profile',
  '/o/b3:${hash}',
  'crab://<64hex>.image',
  'gateway-only',
  'no backend profile publishing claim',
  'no wallet mutation',
  'No main passport linkage'
]) {
  requireIncludes(profileHomeSource, token, 'page-profile-home.js');
}

requireAnyIncludes(
  profileHomeSource,
  ['backend profile publishing is not wired yet', 'Backend profile publishing is not wired yet'],
  'page-profile-home.js backend profile publishing status text'
);

for (const forbidden of [
  "actionButton('Create Alt'",
  'Alt passport creation needs a backend route; not implemented locally.',
  'innerHTML',
  'client.publishProfile',
  'publishProfile(',
  'walletPrivateKey',
  'mainPrivateKey',
  'seedPhrase',
  'privateAltKey'
]) {
  forbidIncludes(profileHomeSource, forbidden, 'page-profile-home.js');
}

const profileEditorSource = readText(path.join(chrome, 'src', 'page-profile-editor.js'));
for (const token of [
  'crablinkProfileDraftV1',
  'Create / Edit Profile',
  'Save Local Draft',
  'Copy Public Template',
  'ron.profile.public.template.v1',
  'backend profile publishing is not wired yet',
  'no backend mutation',
  'no wallet authority',
  'crablink:profile-draft-updated'
]) {
  requireIncludes(profileEditorSource, token, 'page-profile-editor.js');
}

for (const forbidden of [
  'walletPrivateKey',
  'mainPrivateKey',
  'seedPhrase',
  'privateAltKey',
  'publishProfile',
  'client.publishProfile',
  'fetch('
]) {
  forbidIncludes(profileEditorSource, forbidden, 'page-profile-editor.js');
}

const profileAvatarSource = readText(path.join(chrome, 'src', 'page-profile-avatar.js'));
for (const token of [
  'Compatibility shim',
  'removeLegacyAvatarMounts',
  'repairMojibakeText',
  'MOJIBAKE_REPAIRS',
  'profileAvatarPreviewMount',
  'profileEditorAvatarPreviewMount',
  'no backend mutation',
  'no wallet authority',
  'no public profile CID claim'
]) {
  requireIncludes(profileAvatarSource, token, 'page-profile-avatar.js');
}

for (const forbidden of [
  "import ",
  'getSettings',
  'fetch(',
  'fetchAvatarObjectUrl(',
  'client.publishProfile',
  'publishProfile(',
  'walletPrivateKey',
  'mainPrivateKey',
  'seedPhrase',
  'privateAltKey',
  'crab://b3/',
  '<all_urls>'
]) {
  forbidIncludes(profileAvatarSource, forbidden, 'page-profile-avatar.js');
}

const profilePolishSource = readText(path.join(chrome, 'src', 'page-profile-polish.js'));
for (const token of [
  'profile-polish-catalog-preview',
  'profile-polish-truth-strip',
  'Developer profile details',
  'Local browser history only',
  'no wallet mutation',
  'no backend profile claim',
  'no fake REP/MOD truth',
  'crablinkRecentSitesV1',
  'crablinkRecentAssetsV1',
  'data-crablink-open-catalog',
  'data-crablink-open-url'
]) {
  requireIncludes(profilePolishSource, token, 'page-profile-polish.js');
}

for (const forbidden of [
  'innerHTML',
  'publishProfile(',
  'client.publishProfile',
  'walletPrivateKey',
  'mainPrivateKey',
  'seedPhrase',
  'privateAltKey',
  'parent_passport',
  'created_by_main',
  'main_private_key',
  'wallet_private_key',
  'crab://b3/'
]) {
  forbidIncludes(profilePolishSource, forbidden, 'page-profile-polish.js');
}

const localCatalogSource = readText(path.join(chrome, 'src', 'page-local-catalog.js'));
for (const token of [
  'My Sites',
  'My Assets',
  'Profile',
  'passport-catalog-stat-row',
  'passport-catalog-action-row',
  'ROC',
  'REP',
  'MOD',
  'stripRocUnit',
  'crablinkRecentSitesV1',
  'crablinkRecentAssetsV1',
  'local browser history only',
  'no backend mutation'
]) {
  requireIncludes(localCatalogSource, token, 'page-local-catalog.js');
}

for (const forbidden of [
  'quick-nav .catalog-quick-button',
  'quickNav.append',
  'quickNav.dataset.localCatalogInstalled',
  'body.textContent = `${value} ROC`'
]) {
  forbidIncludes(localCatalogSource, forbidden, 'page-local-catalog.js');
}

const altVaultSource = readText(path.join(chrome, 'src', 'page-alt-vault.js'));
for (const token of [
  'crablinkAltDraftsV1',
  'Create Alt',
  'Load Alt',
  'Create Alt Draft',
  'openAltVaultFromPassport',
  'passport-alt-vault-row',
  'passport-alt-vault-button',
  'Private local alt vault',
  'No public main linkage',
  'public ID pending backend b3 root',
  'copyPublicSafeTemplate',
  'generateAltDraft',
  'generateRandomHex',
  'local-only drafts',
  'no backend mutation'
]) {
  requireIncludes(altVaultSource, token, 'page-alt-vault.js');
}

for (const forbidden of [
  'openOrCreateAltFromPassport',
  'await setDrafts([draft]);',
  'actionRow.append(button)',
  'parent_passport',
  'created_by_main',
  'main_private_key',
  'wallet_private_key',
  'mainPassport',
  'mainWallet',
  'b3:${',
  'sha256'
]) {
  forbidIncludes(altVaultSource, forbidden, 'page-alt-vault.js');
}

const siteRenderModeSource = readText(path.join(chrome, 'src', 'page-site-render-mode.js'));
for (const token of [
  'crab-image[src], img[data-crab-src]',
  'hydrateCrabImageEmbeds',
  'fetchCrabImageObjectUrl',
  '/o/b3:${ref.hash}',
  'Site Manifest'
]) {
  requireIncludes(siteRenderModeSource, token, 'page-site-render-mode.js');
}

const siteCreatorProofSource = readText(path.join(chrome, 'src', 'page-site-creator-proof.js'));
for (const token of [
  'site creator',
  'Creator source',
  'buildManifestTabs',
  'site-manifest-tabs'
]) {
  requireIncludes(siteCreatorProofSource, token, 'page-site-creator-proof.js');
}

const ronClient = readText(path.join(chrome, 'src', 'ronClient.js'));
for (const token of [
  'getHealth',
  'getReady',
  'getIdentity',
  'getWalletBalance',
  'resolveCrab',
  'getB3Asset',
  'resolveSite',
  'prepareImageAsset',
  'prepareSite',
  'createWalletHold',
  'createSite',
  'x-ron-wallet-txid'
]) {
  requireIncludes(ronClient, token, 'ronClient.js');
}

const storage = readText(path.join(chrome, 'src', 'storage.js'));
for (const token of [
  'rocLedgerBacked',
  'rememberProductState',
  'saveUsernameDraft',
  'normalizeUsername'
]) {
  requireIncludes(storage, token, 'storage.js');
}

const allSourceFiles = [
  'src/background.js',
  'src/content.js',
  'src/crab.js',
  'src/options.html',
  'src/options.js',
  'src/page.html',
  'src/page.js',
  'src/page-constants.js',
  'src/page-dom.js',
  'src/page-product-preview.js',
  'src/page-profile-home.js',
  'src/page-profile-editor.js',
  'src/page-profile-avatar.js',
  'src/page-local-catalog.js',
  'src/page-profile-polish.js',
  'src/page-alt-vault.js',
  'src/page-article-draft.js',
  'src/page-video-draft.js',
  'src/page-stream-draft.js',
  'src/page-podcast-draft.js',
  'src/page-site-creator-proof.js',
  'src/page-site-render-mode.js',
  'src/page-site-root-upload.js',
  'src/page-utils.js',
  'src/page-workflow.js',
  'src/popup.html',
  'src/popup.js',
  'src/ronClient.js',
  'src/storage.js',
  'src/styles.css',
  'src/page.css',
  'manifest.json'
];

const allSources = allSourceFiles.map((relative) => readText(path.join(chrome, relative))).join('\n');

for (const forbidden of [
  'page-local-route-mode',
  'crab://b3/',
  '<all_urls>',
  'chrome.history',
  'chrome.cookies',
  'webRequestBlocking',
  'nativeMessaging',
  'client.createImageAsset',
  'createSiteButton',
  'x-ron-wallet-hold-txid',
  'passportNextLevelCard',
  'passport-permission-grid',
  'parent_passport:',
  'created_by_main',
  'main_private_key',
  'wallet_private_key',
  'walletPrivateKey',
  'mainPrivateKey',
  'seedPhrase'
]) {
  forbidIncludes(allSources, forbidden, 'extension sources');
}

loadAllJsonIn(path.join(shared, 'schemas'));
loadAllJsonIn(path.join(shared, 'fixtures'));

const walletFixture = loadJson(path.join(shared, 'fixtures', 'wallet-balance.sample.json'));
if (walletFixture.schema && walletFixture.schema !== 'crablink.wallet.balance.v1') {
  fail('wallet-balance fixture schema must be crablink.wallet.balance.v1 when present');
}

const assetFixture = loadJson(path.join(shared, 'fixtures', 'asset-page.sample.json'));
const assetFixtureType = assetFixture.schema || assetFixture.type || '';
if (assetFixtureType && assetFixtureType !== 'omnigate.asset-page.v1') {
  fail('asset-page fixture type/schema must be omnigate.asset-page.v1 when present');
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
node --check "$CHROME_DIR/src/page-profile-home.js" >/dev/null
node --check "$CHROME_DIR/src/page-profile-editor.js" >/dev/null
node --check "$CHROME_DIR/src/page-profile-avatar.js" >/dev/null
node --check "$CHROME_DIR/src/page-local-catalog.js" >/dev/null
node --check "$CHROME_DIR/src/page-profile-polish.js" >/dev/null
node --check "$CHROME_DIR/src/page-alt-vault.js" >/dev/null
node --check "$CHROME_DIR/src/page-article-draft.js" >/dev/null
node --check "$CHROME_DIR/src/page-video-draft.js" >/dev/null
node --check "$CHROME_DIR/src/page-stream-draft.js" >/dev/null
node --check "$CHROME_DIR/src/page-podcast-draft.js" >/dev/null
node --check "$CHROME_DIR/src/page-site-root-upload.js" >/dev/null
node --check "$CHROME_DIR/src/page-site-render-mode.js" >/dev/null
node --check "$CHROME_DIR/src/page-site-creator-proof.js" >/dev/null
node --check "$CHROME_DIR/src/options.js" >/dev/null

if [[ -f "$CHROME_DIR/src/page-passport-home.js" ]]; then
  node --check "$CHROME_DIR/src/page-passport-home.js" >/dev/null
fi

bash -n "$ROOT/scripts/check-chrome.sh" >/dev/null
bash -n "$ROOT/scripts/package-chrome.sh" >/dev/null
bash -n "$ROOT/scripts/smoke-local-gateway.sh" >/dev/null

for file in "${optional_files[@]}"; do
  if [[ -f "$file" ]]; then
    bash -n "$file" >/dev/null
  fi
done

echo "json/structure checks: ok"
echo "javascript syntax checks: ok"
echo "bash syntax checks: ok"
echo "CrabLink Chrome extension checks passed."