#!/usr/bin/env bash
# RO:WHAT — Static/build guardrail for the CrabLink React refactor lane.
# RO:WHY — Keeps the route-owned React app honest while the proven legacy page.html lane remains protected.
# RO:INTERACTS — vite.config.js, react.html, app/*, pages/*, shared/*, package.json, green-gate-local.sh.
# RO:INVARIANTS — one route = one owner; no fake b3/manifest/receipt truth; no silent ROC spend; gateway-only backend access.
# RO:METRICS — none.
# RO:CONFIG — CRABLINK_REACT_SKIP_BUILD=1 skips Vite build when a caller already built.
# RO:SECURITY — blocks broad permissions, direct internal-service URLs, private-key tokens, and unsafe route regressions.
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
need_file "$CHROME_SRC/react.html"
need_file "$APP_DIR/main.jsx"
need_file "$APP_DIR/App.jsx"
need_file "$APP_DIR/router.js"
need_file "$APP_DIR/routeRegistry.js"
need_file "$SHARED_DIR/api/gatewayClient.js"
need_file "$SHARED_DIR/api/walletClient.js"
need_file "$SHARED_DIR/api/siteClient.js"
need_file "$PAGES_DIR/site/SiteLaunchFlow.jsx"
need_file "$PAGES_DIR/image/ImagePublishFlow.jsx"
need_dir "$APP_DIR/shell"
need_dir "$PAGES_DIR"
need_dir "$SHARED_DIR"

ROOT_FOR_NODE="$ROOT" node <<'NODE'
const fs = require('fs');
const path = require('path');

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

function collectTextFiles(dir) {
  const out = [];
  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', 'coverage', '.vite'].includes(entry.name)) {
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

function extractSuggestionArgument(source) {
  const marker = 'chrome.omnibox.setDefaultSuggestion';
  const start = source.indexOf(marker);

  if (start < 0) {
    return '';
  }

  const open = source.indexOf('(', start);
  if (open < 0) {
    return '';
  }

  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (depth === 0) {
      return source.slice(open + 1, i);
    }
  }

  return '';
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

const forbiddenLocalRouteController = path.join(chromeSrc, 'page-local-route-mode.js');
if (fs.existsSync(forbiddenLocalRouteController)) {
  fail('page-local-route-mode.js must not return; route ownership belongs to app/router.js and route pages');
}

const pageHtml = readText(path.join(chromeSrc, 'page.html'));
forbidIncludes(pageHtml, 'page-local-route-mode.js', 'src/page.html');
forbidIncludes(pageHtml, 'page-local-route-mode', 'src/page.html');

const background = readText(path.join(chromeSrc, 'background.js'));
for (const token of ['chrome.action.onClicked', 'src/page.html?url=', 'src/react.html?url=', 'reactprofile']) {
  requireIncludes(background, token, 'src/background.js');
}

const suggestion = extractSuggestionArgument(background);
if (!suggestion) {
  fail('src/background.js missing chrome.omnibox.setDefaultSuggestion call');
}

for (const token of ['<hash>', '<64', '&lt;', '&gt;']) {
  if (suggestion.includes(token)) {
    fail(`src/background.js omnibox suggestion must not include placeholder token: ${token}`);
  }
}

const vite = readText(path.join(root, 'vite.config.js'));
for (const token of [
  'react.html',
  'page.html',
  'dist/chrome-src',
  '@vitejs/plugin-react',
]) {
  requireIncludes(vite, token, 'vite.config.js');
}

const reactHtml = readText(path.join(chromeSrc, 'react.html'));
for (const token of ['id="root"', 'type="module"', './app/main.jsx']) {
  requireIncludes(reactHtml, token, 'react.html');
}

const main = readText(path.join(app, 'main.jsx'));
for (const token of [
  'createRoot',
  "import App from './App.jsx'",
  '../shared/theme/themeTokens.css',
  '../shared/theme/light.css',
  '../shared/theme/dark.css',
]) {
  requireIncludes(main, token, 'app/main.jsx');
}

const appJsx = readText(path.join(app, 'App.jsx'));
for (const token of [
  'AppContextProvider',
  'ThemeProvider',
  'Shell',
  'Suspense',
  'getRouteComponent',
  'useRouteState',
]) {
  requireIncludes(appJsx, token, 'app/App.jsx');
}

const registry = readText(path.join(app, 'routeRegistry.js'));
const requiredRoutes = [
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
];

for (const route of requiredRoutes) {
  requireIncludes(registry, `${route}: lazy(() => import(`, 'app/routeRegistry.js');
}

for (const token of [
  'LOW_RISK_STUB_ROUTE_KINDS',
  'PROVEN_FLOW_ROUTE_KINDS',
  'CREATOR_ROUTE_KINDS',
  'hasRouteKind',
]) {
  requireIncludes(registry, token, 'app/routeRegistry.js');
}

const router = readText(path.join(app, 'router.js'));
for (const token of [
  'crab://home',
  'TYPED_ASSET_RE',
  'PROFILE_HANDLE_RE',
  'PROFILE_PAGE_RE',
  'kind: hasRouteKind(assetKind) ? assetKind : \'asset\'',
  'kind: \'site\'',
]) {
  requireIncludes(router, token, 'app/router.js');
}
forbidIncludes(router, 'crab://b3/', 'app/router.js');

const requiredShellFiles = [
  'AddressBar.jsx',
  'BalanceChip.jsx',
  'BrowserNav.jsx',
  'CreatorChip.jsx',
  'HeaderAdSlot.jsx',
  'ModalHost.jsx',
  'PassportActions.jsx',
  'PassportChip.jsx',
  'PassportDrawer.jsx',
  'PassportSummary.jsx',
  'Shell.css',
  'Shell.jsx',
  'ToastHost.jsx',
  'TopBar.jsx',
];

for (const file of requiredShellFiles) {
  const full = path.join(app, 'shell', file);
  if (!fs.existsSync(full)) {
    fail(`missing required shell file: ${path.relative(root, full)}`);
  }
}

const pageExpectations = new Map([
  ['home', ['HomePage.jsx', 'HomeQuickActions.jsx', 'home.css']],
  ['lyrics', ['LyricsPage.jsx', 'LyricsDraft.jsx', 'lyricsDraftModel.js', 'lyrics.css']],
  ['post', ['PostPage.jsx', 'PostDraft.jsx', 'postDraftModel.js', 'post.css']],
  ['comment', ['CommentPage.jsx', 'CommentDraft.jsx', 'commentDraftModel.js', 'comment.css']],
  ['article', ['ArticlePage.jsx', 'ArticleDraft.jsx', 'articleDraftModel.js', 'article.css']],
  ['music', ['MusicPage.jsx', 'MusicDraft.jsx', 'MusicLinkedAssets.jsx', 'MusicRights.jsx', 'music.css']],
  ['podcast', ['PodcastPage.jsx', 'PodcastDraft.jsx', 'podcastDraftModel.js', 'podcast.css']],
  ['stream', ['StreamPage.jsx', 'StreamDraft.jsx', 'streamDraftModel.js', 'StreamPodcastMode.jsx', 'stream.css']],
  ['video', ['VideoPage.jsx', 'VideoDraft.jsx', 'videoDraftModel.js', 'VideoRenditions.jsx', 'video.css']],
  ['ad', ['AdPage.jsx', 'AdCampaignDraft.jsx', 'AdCreativePreview.jsx', 'adDraftModel.js', 'ad.css']],
  ['algo', ['AlgoPage.jsx', 'AlgoDraft.jsx', 'AlgoTransparency.jsx', 'algoDraftModel.js', 'algo.css']],
  ['code', ['CodePage.jsx', 'CodeDraft.jsx', 'CodeFacet.jsx', 'FacetContractPreview.jsx', 'codeDraftModel.js', 'code.css']],
  ['game', ['GamePage.jsx', 'GameDraft.jsx', 'GameAssets.jsx', 'gameDraftModel.js', 'game.css']],
  ['site', ['SitePage.jsx', 'SiteCreate.jsx', 'SiteLaunchFlow.jsx', 'SiteRender.jsx', 'SiteRootUpload.jsx', 'site.css']],
  ['image', ['ImagePage.jsx', 'ImageCreate.jsx', 'ImagePublishFlow.jsx', 'ImagePreview.jsx', 'ImageRenditions.jsx', 'image.css']],
  ['profile', ['ProfilePage.jsx', 'ProfileHome.jsx', 'ProfileEditor.jsx', 'ProfileGateway.jsx', 'ProfileAvatar.jsx', 'ProfileAssets.jsx', 'AltVault.jsx', 'profile.css']],
  ['asset', ['AssetPage.jsx', 'AssetResolver.jsx', 'AssetHydratedView.jsx', 'asset.css']],
  ['notFound', ['NotFoundPage.jsx', 'notFound.css']],
  ['problem', ['ProblemPage.jsx', 'problem.css']],
]);

for (const [route, files] of pageExpectations.entries()) {
  for (const file of files) {
    const full = path.join(pages, route, file);
    if (!fs.existsSync(full)) {
      fail(`missing required route file: ${path.relative(root, full)}`);
    }
  }
}

const localOnlyRoutes = [
  'lyrics',
  'post',
  'comment',
  'article',
  'music',
  'podcast',
  'stream',
  'video',
  'ad',
  'algo',
  'code',
  'game',
];

for (const route of localOnlyRoutes) {
  const routeDir = path.join(pages, route);
  const source = collectTextFiles(routeDir).map(readText).join('\n');
  const label = `pages/${route}`;

  requireIncludes(source, `crab://${route}`, label);
  requireIncludes(source, 'local', label);
  requireIncludes(source, 'truth', label);

  for (const forbidden of [
    'canonical_cid: `b3:',
    'canonical_cid: "b3:',
    'manifest_cid: `b3:',
    'assigns_b3_cid: true',
    'assigns_manifest_cid: true',
    'publishes_asset: true',
    'writes_index_pointer: true',
    'performs_paid_action: true',
    'backend_route_claimed: true',
    'wallet/hold',
    'createWalletHold(',
    'fetch(\'http://127.0.0.1:',
    'fetch("http://127.0.0.1:',
  ]) {
    forbidIncludes(source, forbidden, label);
  }
}

const requiredSharedFiles = [
  'api/gatewayClient.js',
  'api/identityClient.js',
  'api/walletClient.js',
  'api/assetClient.js',
  'api/siteClient.js',
  'api/objectClient.js',
  'components/CreatorWorkspaceLayout.jsx',
  'components/DraftStatsPanel.jsx',
  'components/ManifestPreviewPanel.jsx',
  'components/RouteTruthPanel.jsx',
  'components/TruthBoundary.jsx',
  'hooks/useCreatorDraft.js',
  'manifest/uniformManifest.js',
  'manifest/manifestDrafts.js',
  'manifest/manifestPreview.jsx',
  'styles/base.css',
  'styles/layout.css',
  'styles/forms.css',
  'styles/cards.css',
  'styles/modals.css',
  'styles/developer.css',
  'theme/ThemeProvider.jsx',
  'theme/themeStore.js',
  'theme/themeTokens.css',
  'theme/light.css',
  'theme/dark.css',
  'utils/crabUrl.js',
  'utils/b3.js',
  'utils/format.js',
  'utils/nonce.js',
  'utils/validation.js',
];

for (const relative of requiredSharedFiles) {
  const full = path.join(shared, relative);
  if (!fs.existsSync(full)) {
    fail(`missing required shared file: ${path.relative(root, full)}`);
  }
}

const walletClient = readText(path.join(shared, 'api', 'walletClient.js'));
for (const token of [
  'Wallet display and explicit hold API helper',
  'normalizeWalletHoldRequest',
  'toWalletHoldApiBody',
  'normalizeWalletHoldResponse',
  'expectedNonceFromWalletError',
  'loadNextNonceHint',
  'persistNextNonceHint',
  'clearNextNonceHint',
  'confirmed !== true',
]) {
  requireIncludes(walletClient, token, 'shared/api/walletClient.js');
}

const holdBodyStart = walletClient.indexOf('export function toWalletHoldApiBody');
if (holdBodyStart < 0) {
  fail('shared/api/walletClient.js missing toWalletHoldApiBody export');
}
const holdBodySlice = walletClient.slice(holdBodyStart, walletClient.indexOf('\n}', holdBodyStart) + 2);
for (const token of ['from:', 'to:', 'asset:', 'amount_minor:', 'nonce:', 'memo:', 'idempotency_key:']) {
  requireIncludes(holdBodySlice, token, 'toWalletHoldApiBody');
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
  forbidIncludes(holdBodySlice, forbidden, 'toWalletHoldApiBody');
}

const siteLaunchFlow = readText(path.join(pages, 'site', 'SiteLaunchFlow.jsx'));
for (const token of [
  'loadNextNonceHint',
  'persistNextNonceHint',
  'normalizeWalletHoldResponse',
  'expectedNonceFromWalletError',
]) {
  requireIncludes(siteLaunchFlow, token, 'pages/site/SiteLaunchFlow.jsx');
}

const imagePublishFlow = readText(path.join(pages, 'image', 'ImagePublishFlow.jsx'));
for (const token of [
  'Confirm ROC hold?',
  '/wallet/hold',
  'wallet hold proof headers',
]) {
  requireIncludes(imagePublishFlow, token, 'pages/image/ImagePublishFlow.jsx');
}
forbidIncludes(imagePublishFlow, 'ui_preview_request:', 'pages/image/ImagePublishFlow.jsx');
forbidIncludes(imagePublishFlow, 'api_request:', 'pages/image/ImagePublishFlow.jsx');

const rootWallet = readText(path.join(root, 'shared', 'api', 'walletClient.js'));
for (const token of ['Wallet display API helper', 'createWalletClient', 'getBalance']) {
  requireIncludes(rootWallet, token, 'root shared/api/walletClient.js');
}
for (const forbidden of [
  'loadNextNonceHint',
  'persistNextNonceHint',
  'MAX_IDEMPOTENCY_KEY_BYTES',
  'expectedNonceFromWalletError',
  'normalizeWalletHoldResponse',
  'toWalletHoldApiBody',
]) {
  forbidIncludes(rootWallet, forbidden, 'root shared/api/walletClient.js');
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

for (const [file, source] of reactSources) {
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

const light = readText(path.join(shared, 'theme', 'light.css'));
const dark = readText(path.join(shared, 'theme', 'dark.css'));
requireIncludes(light, "[data-theme='light']", 'shared/theme/light.css');
requireIncludes(dark, "[data-theme='dark']", 'shared/theme/dark.css');
requireIncludes(dark, '--cl-bg: #000000', 'shared/theme/dark.css');

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