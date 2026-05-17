#!/usr/bin/env bash
# RO:WHAT — Static/build guardrail for the CrabLink React-primary lane.
# RO:WHY — Verifies React route ownership, gateway-only access, and truthful local-vs-paid route claims.
# RO:INTERACTS — vite.config.js, react.html, page.html compatibility redirect, app/*, pages/*, shared/*.
# RO:INVARIANTS — one route = one owner; gateway-only; no fake b3/receipt truth; no silent ROC spend.
# RO:CONFIG — CRABLINK_REACT_SKIP_BUILD=1 skips Vite build when caller already built.
# RO:SECURITY — blocks direct internal-service URLs, broad Chrome permissions, private-key tokens, and unsafe wallet body drift.
# RO:TEST — run from repo root with scripts/check-react-lane.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_SRC="$ROOT/extensions/chrome/src"
APP_DIR="$CHROME_SRC/app"
PAGES_DIR="$CHROME_SRC/pages"
SHARED_DIR="$CHROME_SRC/shared"

cd "$ROOT"

need_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    echo "error: missing required file: $file"
    exit 1
  fi
}

need_dir() {
  local dir="$1"

  if [[ ! -d "$dir" ]]; then
    echo "error: missing required directory: $dir"
    exit 1
  fi
}

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required for React lane checks"
  exit 1
fi

need_file "$ROOT/package.json"
need_file "$ROOT/vite.config.js"
need_file "$ROOT/scripts/package-chrome.sh"
need_file "$CHROME_SRC/background.js"
need_file "$CHROME_SRC/popup.js"
need_file "$CHROME_SRC/page.html"
need_file "$CHROME_SRC/react.html"
need_file "$APP_DIR/main.jsx"
need_file "$APP_DIR/App.jsx"
need_file "$APP_DIR/router.js"
need_file "$APP_DIR/routeRegistry.js"
need_file "$SHARED_DIR/api/gatewayClient.js"
need_file "$SHARED_DIR/api/walletClient.js"
need_file "$SHARED_DIR/api/siteClient.js"
need_file "$SHARED_DIR/api/contentViewClient.js"
need_file "$SHARED_DIR/embed/embedRegistry.js"
need_file "$SHARED_DIR/embed/safeHtml.js"
need_file "$SHARED_DIR/receipts/recentReceipts.js"
need_file "$PAGES_DIR/site/SiteLaunchFlow.jsx"
need_file "$PAGES_DIR/image/ImagePublishFlow.jsx"
need_file "$PAGES_DIR/asset/AssetContentViewAccess.jsx"
need_file "$PAGES_DIR/asset/AssetHydratedView.jsx"
need_dir "$APP_DIR/shell"
need_dir "$PAGES_DIR"
need_dir "$SHARED_DIR"

ROOT_FOR_NODE="$ROOT" node --input-type=module <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.env.ROOT_FOR_NODE;
const chromeSrc = path.join(root, 'extensions', 'chrome', 'src');
const app = path.join(chromeSrc, 'app');
const pages = path.join(chromeSrc, 'pages');
const shared = path.join(chromeSrc, 'shared');

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

function assertFile(relative) {
  const file = path.join(root, relative);

  if (!fs.existsSync(file)) {
    fail(`missing required file: ${relative}`);
  }
}

function collectTextFiles(dir) {
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
        if (!['node_modules', 'dist', 'coverage', '.vite', 'retired-vanilla'].includes(entry.name)) {
          stack.push(full);
        }
        continue;
      }

      if (/\.(js|jsx|css|html|json)$/i.test(entry.name)) {
        out.push(full);
      }
    }
  }

  return out.sort();
}

const pkg = loadJson(path.join(root, 'package.json'));
if (pkg.type !== 'module') fail('package.json type must remain module');

for (const [name, command] of [
  ['build', 'vite build'],
  ['check:chrome', 'bash scripts/check-chrome.sh'],
  ['check:react', 'bash scripts/check-react-lane.sh'],
  ['package:chrome', 'bash scripts/package-chrome.sh'],
  ['codebundle', 'bash scripts/make_codebundle.sh'],
]) {
  if (pkg.scripts?.[name] !== command) {
    fail(`package.json scripts.${name} must be: ${command}`);
  }
}

const activeVanilla = fs
  .readdirSync(chromeSrc)
  .filter((name) => name === 'page.js' || name === 'page.css' || /^page-.*\.(js|css)$/.test(name));

if (activeVanilla.length > 0) {
  fail(`old vanilla page files must be retired from active src: ${activeVanilla.sort().join(', ')}`);
}

const background = readText(path.join(chromeSrc, 'background.js'));
for (const token of ['chrome.action.onClicked', 'react.html?url=', 'page.html?url=', 'preferredBrowserLane']) {
  requireIncludes(background, token, 'background.js');
}
for (const forbidden of ['src/react.html?url=', 'src/page.html?url=', '<hash>', '<64', '&lt;']) {
  forbidIncludes(background, forbidden, 'background.js');
}

const router = readText(path.join(app, 'router.js'));
for (const token of ['crab://home', 'TYPED_ASSET_RE', 'PROFILE_HANDLE_RE', "kind: 'site'"]) {
  requireIncludes(router, token, 'app/router.js');
}
forbidIncludes(router, 'crab://b3/', 'app/router.js');

for (const relative of [
  'extensions/chrome/src/app/shell/AddressBar.jsx',
  'extensions/chrome/src/app/shell/BalanceChip.jsx',
  'extensions/chrome/src/app/shell/BrowserNav.jsx',
  'extensions/chrome/src/app/shell/HeaderAdSlot.jsx',
  'extensions/chrome/src/app/shell/PassportDrawer.jsx',
  'extensions/chrome/src/app/shell/Shell.jsx',
  'extensions/chrome/src/app/shell/TopBar.jsx',
]) {
  assertFile(relative);
}

for (const [route, files] of new Map([
  ['home', ['HomePage.jsx']],
  ['site', ['SitePage.jsx', 'SiteLaunchFlow.jsx', 'SiteSandboxPreview.jsx', 'siteTemplates.js']],
  ['image', ['ImagePage.jsx', 'ImagePublishFlow.jsx']],
  ['profile', ['ProfilePage.jsx']],
  ['asset', ['AssetPage.jsx', 'AssetResolver.jsx', 'AssetHydratedView.jsx', 'AssetContentViewAccess.jsx']],
  ['music', ['MusicPage.jsx', 'MusicRights.jsx']],
  ['article', ['ArticlePage.jsx', 'articleDraftModel.js', 'ArticlePublishFlow.jsx']],
  ['video', ['VideoPage.jsx', 'videoDraftModel.js']],
  ['stream', ['StreamPage.jsx', 'StreamPodcastMode.jsx']],
  ['podcast', ['PodcastPage.jsx']],
  ['post', ['PostPage.jsx', 'postDraftModel.js', 'PostPublishFlow.jsx']],
  ['comment', ['CommentPage.jsx', 'commentDraftModel.js', 'CommentPublishFlow.jsx']],
  ['ad', ['AdPage.jsx']],
  ['algo', ['AlgoPage.jsx']],
  ['code', ['CodePage.jsx']],
  ['game', ['GamePage.jsx']],
  ['notFound', ['NotFoundPage.jsx']],
  ['problem', ['ProblemPage.jsx']],
]).entries()) {
  for (const file of files) {
    assertFile(path.join('extensions', 'chrome', 'src', 'pages', route, file));
  }
}

for (const relative of [
  'extensions/chrome/src/shared/embed/embedRegistry.js',
  'extensions/chrome/src/shared/embed/safeHtml.js',
  'extensions/chrome/src/shared/embed/sandboxFrame.js',
  'extensions/chrome/src/shared/embed/crabImageEmbed.jsx',
  'extensions/chrome/src/shared/embed/crabPostEmbed.jsx',
  'extensions/chrome/src/shared/embed/crabCommentEmbed.jsx',
  'extensions/chrome/src/shared/embed/crabArticleEmbed.jsx',
]) {
  assertFile(relative);
}

const embedRegistry = readText(path.join(shared, 'embed', 'embedRegistry.js'));
for (const token of [
  'crablink.embed-registry',
  'crab-image',
  'crab-post',
  'crab-comment',
  'crab-article',
  'collectCrabTypedUrls',
  'renderSafeEmbeds',
  'summarizeTextContent',
]) {
  requireIncludes(embedRegistry, token, 'shared/embed/embedRegistry.js');
}
for (const forbidden of ['eval(', 'new Function(', 'innerHTML =', 'dangerouslySetInnerHTML']) {
  forbidIncludes(embedRegistry, forbidden, 'shared/embed/embedRegistry.js');
}

const siteSandbox = readText(path.join(pages, 'site', 'SiteSandboxPreview.jsx'));
for (const token of [
  "['post', 'comment', 'article']",
  'collectCrabTypedUrls',
  'textAssetCache',
  '/o/${ref.cid}',
]) {
  requireIncludes(siteSandbox, token, 'pages/site/SiteSandboxPreview.jsx');
}

const siteSandboxOptionalSignals = ['comment dropdown ready', 'Comment', 'comment'];
if (!siteSandboxOptionalSignals.some((token) => siteSandbox.includes(token))) {
  fail('pages/site/SiteSandboxPreview.jsx missing comment render/dropdown signal');
}

const siteTemplates = readText(path.join(pages, 'site', 'siteTemplates.js'));
for (const token of [
  'Reference Graph Smoke',
  'KNOWN_GOOD_POST_URL',
  'KNOWN_GOOD_COMMENT_URL',
  'KNOWN_GOOD_ARTICLE_URL',
  '<crab-post',
  '<crab-comment',
  '<crab-article',
]) {
  requireIncludes(siteTemplates, token, 'pages/site/siteTemplates.js');
}

const contentViewClient = readText(path.join(shared, 'api', 'contentViewClient.js'));
for (const token of [
  '/content/view/quote',
  '/content/view/pay',
  'quote',
  'pay',
  'Idempotency-Key',
]) {
  requireIncludes(contentViewClient, token, 'shared/api/contentViewClient.js');
}
for (const forbidden of [
  'http://127.0.0.1:8088',
  'http://localhost:8088',
  '127.0.0.1:8088',
  'localhost:8088',
  '/v1/transfer',
  '/v1/hold',
  '/v1/issue',
  '/v1/burn',
]) {
  forbidIncludes(contentViewClient, forbidden, 'shared/api/contentViewClient.js');
}

const assetContentViewAccess = readText(path.join(pages, 'asset', 'AssetContentViewAccess.jsx'));
for (const token of [
  'PAYABLE_KINDS',
  "new Set(['article', 'post', 'comment', 'image'])",
  'createContentViewClient',
  'writeRecentReceipt',
  'writeLocalCatalogEntry',
  '/content/view/quote',
  '/content/view/pay',
  'post content_view',
  'comment content_view',
  'image content_view',
  'article content_view',
  'No silent spend / no fake unlock',
]) {
  requireIncludes(assetContentViewAccess, token, 'pages/asset/AssetContentViewAccess.jsx');
}
for (const forbidden of [
  'wallet/hold',
  'createWalletHold(',
  'svc-wallet',
  'ron-ledger',
]) {
  forbidIncludes(assetContentViewAccess, forbidden, 'pages/asset/AssetContentViewAccess.jsx');
}

const assetHydratedView = readText(path.join(pages, 'asset', 'AssetHydratedView.jsx'));
for (const token of [
  'PAID_CONTENT_VIEW_KINDS',
  "new Set(['article', 'post', 'comment', 'image'])",
  'requiresPaidContentView',
  'contentViewAccess.canView',
  'AssetContentViewAccess',
  'canPreviewImage',
  'Image preview is locked until paid',
  'paid view gate',
  'article/post/comment raw content and image preview bytes are gated',
]) {
  requireIncludes(assetHydratedView, token, 'pages/asset/AssetHydratedView.jsx');
}
for (const forbidden of [
  'dangerouslySetInnerHTML',
]) {
  forbidIncludes(assetHydratedView, forbidden, 'pages/asset/AssetHydratedView.jsx');
}

const paidPublisherRoutes = new Set(['post', 'comment', 'article']);
const localOnlyCreatorRoutes = ['lyrics', 'music', 'podcast', 'stream', 'video', 'ad', 'algo', 'code', 'game'];
const allCreatorRoutes = ['lyrics', 'post', 'comment', 'article', 'music', 'podcast', 'stream', 'video', 'ad', 'algo', 'code', 'game'];

for (const route of allCreatorRoutes) {
  const routeDir = path.join(pages, route);
  const source = collectTextFiles(routeDir).map(readText).join('\n');
  const label = `pages/${route}`;

  requireIncludes(source, `crab://${route}`, label);
  requireIncludes(source, 'truth', label);

  const alwaysForbidden = [
    'canonical_cid: `b3:',
    'canonical_cid: "b3:',
    'manifest_cid: `b3:',
    'assigns_b3_cid: true',
    'assigns_manifest_cid: true',
  ];

  for (const forbidden of alwaysForbidden) {
    forbidIncludes(source, forbidden, label);
  }

  if (localOnlyCreatorRoutes.includes(route)) {
    requireIncludes(source, 'local', label);

    for (const forbidden of [
      'publishes_asset: true',
      'writes_index_pointer: true',
      'performs_paid_action: true',
      'backend_route_claimed: true',
      'wallet/hold',
      'createWalletHold(',
    ]) {
      forbidIncludes(source, forbidden, label);
    }
  }

  if (paidPublisherRoutes.has(route)) {
    requireIncludes(source, `/assets/${route}`, label);
    requireIncludes(source, 'wallet', label);
  }
}

const walletClientPath = path.join(shared, 'api', 'walletClient.js');
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

const gatewayClient = readText(path.join(shared, 'api', 'gatewayClient.js'));
for (const token of ['fetch(', 'x-correlation-id', 'requestTimeoutMs', 'gatewayUrl']) {
  requireIncludes(gatewayClient, token, 'shared/api/gatewayClient.js');
}
for (const forbidden of ['svc-wallet', 'svc-storage', 'svc-index', 'ron-ledger']) {
  forbidIncludes(gatewayClient, forbidden, 'shared/api/gatewayClient.js');
}

const reactSources = [
  path.join(root, 'vite.config.js'),
  path.join(root, 'package.json'),
  path.join(chromeSrc, 'react.html'),
  ...collectTextFiles(app),
  ...collectTextFiles(pages),
  ...collectTextFiles(shared),
].map((file) => [file, readText(file)]);

const forbiddenUiMoneyPhrases = ['ROC ' + 'minor', 'minor ' + 'units'];

for (const [file, source] of reactSources) {
  const label = path.relative(root, file);

  for (const forbidden of [
    'page-local-route-mode',
    'crab://b3/',
    ...forbiddenUiMoneyPhrases,
    '<all_urls>',
    'chrome.history',
    'chrome.cookies',
    'webRequestBlocking',
    'nativeMessaging',
    'x-ron-wallet-hold-txid',
    'walletPrivateKey',
    'mainPrivateKey',
    'privateAltKey',
    'http://127.0.0.1:5307',
    'http://localhost:5307',
    '127.0.0.1:5307',
    'localhost:5307',
    'http://127.0.0.1:9090',
    'http://localhost:9090',
    '127.0.0.1:9090',
    'localhost:9090',
    '/v1/passport/profile',
    '/v1/identity/passport/profile',
  ]) {
    forbidIncludes(source, forbidden, label);
  }
}

console.log('react file/route checks: ok');
NODE

bash -n "$ROOT/scripts/check-react-lane.sh" >/dev/null

if [[ "${CRABLINK_REACT_SKIP_BUILD:-0}" != "1" ]]; then
  npm run build
  need_file "$ROOT/dist/chrome-src/react.html"
  need_file "$ROOT/dist/chrome-src/page.html"
else
  echo "skip: npm run build (CRABLINK_REACT_SKIP_BUILD=1)"
fi

echo "bash syntax checks: ok"
echo "React lane checks passed."