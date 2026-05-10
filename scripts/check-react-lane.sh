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
need_file "$APP_DIR/appContext.js"
need_file "$APP_DIR/appState.js"
need_file "$APP_DIR/router.js"
need_file "$APP_DIR/routeRegistry.js"
need_file "$APP_DIR/settings.js"
need_dir "$APP_DIR/shell"
need_dir "$PAGES_DIR"
need_dir "$SHARED_DIR"

ROOT_FOR_NODE="$ROOT" node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.env.ROOT_FOR_NODE;
const chromeSrc = path.join(root, 'extensions', 'chrome', 'src');
const app = path.join(chromeSrc, 'app');
const shell = path.join(app, 'shell');
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

function assertFile(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    fail(`missing required file: ${relative}`);
  }
  return file;
}

function assertFileIfStrict(relative, label) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    fail(`${label} missing required file: ${relative}`);
  }
  return file;
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

const vite = readText(path.join(root, 'vite.config.js'));
for (const token of [
  'react.html',
  'page.html',
  'dist/chrome-src',
  '@vitejs/plugin-react',
  'page-media',
  'page-social',
  'page-builder-stubs',
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
  '../shared/styles/base.css',
  '../shared/styles/layout.css',
  '../shared/styles/forms.css',
  '../shared/styles/cards.css',
  '../shared/styles/modals.css',
  '../shared/styles/developer.css',
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

for (const oldAssetPath of ['crab://b3/']) {
  forbidIncludes(router, oldAssetPath, 'app/router.js');
}

const shellFiles = [
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

for (const file of shellFiles) {
  assertFile(path.join('extensions', 'chrome', 'src', 'app', 'shell', file));
}

const shellJsx = readText(path.join(shell, 'Shell.jsx'));
for (const token of ['TopBar', 'HeaderAdSlot', 'ModalHost', 'ToastHost', 'data-route-kind']) {
  requireIncludes(shellJsx, token, 'app/shell/Shell.jsx');
}

const topBar = readText(path.join(shell, 'TopBar.jsx'));
for (const token of ['AddressBar', 'BrowserNav', 'PassportChip', 'BalanceChip', 'theme.toggleTheme', 'openSettings']) {
  requireIncludes(topBar, token, 'app/shell/TopBar.jsx');
}

const passportChip = readText(path.join(shell, 'PassportChip.jsx'));
for (const token of ['PassportDrawer', 'HTTP test mode', 'chrome.storage.local', 'aria-haspopup="dialog"']) {
  requireIncludes(passportChip, token, 'app/shell/PassportChip.jsx');
}

const passportDrawer = readText(path.join(shell, 'PassportDrawer.jsx'));
for (const token of ['Truth boundary', 'refreshIdentity', 'refreshWallet', 'JsonPreview', 'no wallet mutation']) {
  requireIncludes(passportDrawer, token, 'app/shell/PassportDrawer.jsx');
}

for (const forbidden of ['createWalletHold', 'wallet/hold', 'sendTransaction', 'privateKey', 'seedPhrase']) {
  forbidIncludes(passportDrawer, forbidden, 'app/shell/PassportDrawer.jsx');
}

const pageExpectations = new Map([
  ['home', ['HomePage.jsx', 'HomeQuickActions.jsx', 'home.css']],
  ['lyrics', ['LyricsPage.jsx', 'LyricsDraft.jsx', 'lyricsDraftModel.js', 'lyrics.css']],
  ['post', ['PostPage.jsx', 'PostDraft.jsx', 'postDraftModel.js', 'post.css']],
  ['comment', ['CommentPage.jsx', 'CommentDraft.jsx', 'comment.css']],
  ['article', ['ArticlePage.jsx', 'ArticleDraft.jsx', 'article.css']],
  ['music', ['MusicPage.jsx', 'MusicDraft.jsx', 'MusicLinkedAssets.jsx', 'MusicRights.jsx', 'music.css']],
  ['podcast', ['PodcastPage.jsx', 'PodcastDraft.jsx', 'podcast.css']],
  ['stream', ['StreamPage.jsx', 'StreamDraft.jsx', 'StreamPodcastMode.jsx', 'stream.css']],
  ['video', ['VideoPage.jsx', 'VideoDraft.jsx', 'VideoRenditions.jsx', 'video.css']],
  ['ad', ['AdPage.jsx', 'AdCampaignDraft.jsx', 'AdCreativePreview.jsx', 'ad.css']],
  ['algo', ['AlgoPage.jsx', 'AlgoDraft.jsx', 'AlgoTransparency.jsx', 'algo.css']],
  ['code', ['CodePage.jsx', 'CodeDraft.jsx', 'CodeFacet.jsx', 'FacetContractPreview.jsx', 'code.css']],
  ['game', ['GamePage.jsx', 'GameDraft.jsx', 'GameAssets.jsx', 'game.css']],
  ['site', ['SitePage.jsx', 'SiteCreate.jsx', 'SiteRender.jsx', 'SiteManifestDrawer.jsx', 'SiteRootUpload.jsx', 'SiteCreatorProof.jsx', 'site.css']],
  ['image', ['ImagePage.jsx', 'ImageCreate.jsx', 'ImageManifest.jsx', 'ImagePreview.jsx', 'ImageRenditions.jsx', 'image.css']],
  ['profile', ['ProfilePage.jsx', 'ProfileHome.jsx', 'ProfileEditor.jsx', 'ProfileGateway.jsx', 'ProfileAvatar.jsx', 'ProfileAssets.jsx', 'AltVault.jsx', 'profile.css']],
  ['asset', ['AssetPage.jsx', 'AssetResolver.jsx', 'AssetHydratedView.jsx', 'asset.css']],
  ['notFound', ['NotFoundPage.jsx', 'notFound.css']],
  ['problem', ['ProblemPage.jsx', 'problem.css']],
]);

for (const [route, files] of pageExpectations.entries()) {
  for (const file of files) {
    assertFile(path.join('extensions', 'chrome', 'src', 'pages', route, file));
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

  requireIncludes(source, `crab://${route}`, `pages/${route}`);
  requireIncludes(source, 'local', `pages/${route}`);
  requireIncludes(source, 'truth', `pages/${route}`);
  requireIncludes(source, 'false', `pages/${route}`);

  for (const forbidden of [
    'canonical_cid: `b3:',
    'canonical_cid: "b3:',
    'canonical_crab_url: `crab://',
    'manifest_cid: `b3:',
    'assigns_b3_cid: true',
    'assigns_manifest_cid: true',
    'publishes_asset: true',
    'writes_index_pointer: true',
    'performs_paid_action: true',
    'backend_route_claimed: true',
    'paid_access_active: true',
    'createWalletHold(',
    'wallet/hold',
    'fetch(\'http://127.0.0.1:',
    'fetch("http://127.0.0.1:',
  ]) {
    forbidIncludes(source, forbidden, `pages/${route}`);
  }
}

const strictCreatorWorkspaceRoutes = new Set([
  'lyrics',
  'post',
]);

const creatorWorkspaceContracts = {
  lyrics: {
    modelFile: 'lyricsDraftModel.js',
    pageFile: 'LyricsPage.jsx',
    draftFile: 'LyricsDraft.jsx',
    sidePanel: 'LyricsSidePanel',
    schema: 'crablink.local.lyrics-draft.v1',
  },
  post: {
    modelFile: 'postDraftModel.js',
    pageFile: 'PostPage.jsx',
    draftFile: 'PostDraft.jsx',
    sidePanel: 'PostSidePanel',
    schema: 'crablink.local.post-draft.v1',
  },
  comment: {
    modelFile: 'commentDraftModel.js',
    pageFile: 'CommentPage.jsx',
    draftFile: 'CommentDraft.jsx',
    sidePanel: 'CommentSidePanel',
    schema: 'crablink.local.comment-draft.v1',
  },
  article: {
    modelFile: 'articleDraftModel.js',
    pageFile: 'ArticlePage.jsx',
    draftFile: 'ArticleDraft.jsx',
    sidePanel: 'ArticleSidePanel',
    schema: 'crablink.local.article-draft.v1',
  },
  music: {
    modelFile: 'musicDraftModel.js',
    pageFile: 'MusicPage.jsx',
    draftFile: 'MusicDraft.jsx',
    sidePanel: 'MusicSidePanel',
    schema: 'crablink.local.music-draft.v1',
  },
  podcast: {
    modelFile: 'podcastDraftModel.js',
    pageFile: 'PodcastPage.jsx',
    draftFile: 'PodcastDraft.jsx',
    sidePanel: 'PodcastSidePanel',
    schema: 'crablink.local.podcast-draft.v1',
  },
  stream: {
    modelFile: 'streamDraftModel.js',
    pageFile: 'StreamPage.jsx',
    draftFile: 'StreamDraft.jsx',
    sidePanel: 'StreamSidePanel',
    schema: 'crablink.local.stream-draft.v1',
  },
  video: {
    modelFile: 'videoDraftModel.js',
    pageFile: 'VideoPage.jsx',
    draftFile: 'VideoDraft.jsx',
    sidePanel: 'VideoSidePanel',
    schema: 'crablink.local.video-draft.v1',
  },
  ad: {
    modelFile: 'adDraftModel.js',
    pageFile: 'AdPage.jsx',
    draftFile: 'AdCampaignDraft.jsx',
    sidePanel: 'AdSidePanel',
    schema: 'crablink.local.ad-draft.v1',
  },
  algo: {
    modelFile: 'algoDraftModel.js',
    pageFile: 'AlgoPage.jsx',
    draftFile: 'AlgoDraft.jsx',
    sidePanel: 'AlgoSidePanel',
    schema: 'crablink.local.algo-draft.v1',
  },
  code: {
    modelFile: 'codeDraftModel.js',
    pageFile: 'CodePage.jsx',
    draftFile: 'CodeDraft.jsx',
    sidePanel: 'CodeSidePanel',
    schema: 'crablink.local.code-draft.v1',
  },
  game: {
    modelFile: 'gameDraftModel.js',
    pageFile: 'GamePage.jsx',
    draftFile: 'GameDraft.jsx',
    sidePanel: 'GameSidePanel',
    schema: 'crablink.local.game-draft.v1',
  },
};

for (const route of localOnlyRoutes) {
  const contract = creatorWorkspaceContracts[route];
  if (!contract) {
    continue;
  }

  const routeDir = path.join(pages, route);
  const routeLabel = `pages/${route}`;
  const modelRelative = path.join('extensions', 'chrome', 'src', 'pages', route, contract.modelFile);
  const modelPath = path.join(routeDir, contract.modelFile);
  const source = collectTextFiles(routeDir).map(readText).join('\n');

  const hasWorkspaceSignals =
    fs.existsSync(modelPath) ||
    source.includes('useCreatorDraft') ||
    source.includes('CreatorWorkspaceLayout') ||
    source.includes(contract.sidePanel) ||
    source.includes('draftState');

  const mustCheckWorkspaceContract =
    strictCreatorWorkspaceRoutes.has(route) || hasWorkspaceSignals;

  if (!mustCheckWorkspaceContract) {
    continue;
  }

  assertFileIfStrict(modelRelative, routeLabel);

  for (const token of [
    'useCreatorDraft',
    contract.modelFile,
    contract.sidePanel,
    'draftState',
    'CreatorWorkspaceLayout',
    'RouteTruthPanel',
  ]) {
    requireIncludes(source, token, routeLabel);
  }

  for (const forbidden of [
    'let sidePanelState',
    'sidePanelState =',
    '.SidePanel =',
    `${contract.draftFile.replace('.jsx', '')}.SidePanel`,
    'navigator.clipboard.writeText',
    'setCopyState',
    'useMemo, useState',
    'canonical_cid: `b3:',
    'canonical_cid: "b3:',
    'manifest_cid: `b3:',
    'assigns_b3_cid: true',
    'assigns_manifest_cid: true',
    'publishes_asset: true',
    'writes_index_pointer: true',
    'performs_paid_action: true',
    'backend_route_claimed: true',
  ]) {
    forbidIncludes(source, forbidden, routeLabel);
  }

  const modelSource = readText(modelPath);

  for (const token of [
    'DEFAULT_',
    'build',
    'ManifestDraft',
    'stats',
    'Completeness',
    'truth_boundary',
    'local_draft_only',
    'assigns_b3_cid: false',
    'assigns_manifest_cid: false',
    'publishes_asset: false',
    'writes_index_pointer: false',
    'performs_paid_action: false',
    'backend_route_claimed: false',
  ]) {
    requireIncludes(modelSource, token, `${routeLabel}/${contract.modelFile}`);
  }

  requireIncludes(modelSource, contract.schema, `${routeLabel}/${contract.modelFile}`);
}

const requiredSharedFiles = [
  'shared/api/gatewayClient.js',
  'shared/api/identityClient.js',
  'shared/api/walletClient.js',
  'shared/api/assetClient.js',
  'shared/api/siteClient.js',
  'shared/components/ActionBar.jsx',
  'shared/components/Badge.jsx',
  'shared/components/Button.jsx',
  'shared/components/Card.jsx',
  'shared/components/CopyButton.jsx',
  'shared/components/CreatorWorkspaceLayout.jsx',
  'shared/components/DraftStatsPanel.jsx',
  'shared/components/EmptyState.jsx',
  'shared/components/ErrorPanel.jsx',
  'shared/components/Field.jsx',
  'shared/components/FilePicker.jsx',
  'shared/components/JsonPreview.jsx',
  'shared/components/LoadingState.jsx',
  'shared/components/ManifestPreviewPanel.jsx',
  'shared/components/Modal.jsx',
  'shared/components/PageHeader.jsx',
  'shared/components/RouteTruthPanel.jsx',
  'shared/components/SegmentedControl.jsx',
  'shared/components/StatChip.jsx',
  'shared/components/TextArea.jsx',
  'shared/components/TextInput.jsx',
  'shared/components/Toggle.jsx',
  'shared/components/TruthBoundary.jsx',
  'shared/hooks/useCreatorDraft.js',
  'shared/manifest/uniformManifest.js',
  'shared/manifest/manifestDrafts.js',
  'shared/manifest/manifestForm.jsx',
  'shared/manifest/manifestPreview.jsx',
  'shared/manifest/renditionGroups.js',
  'shared/manifest/linkedAssets.js',
  'shared/styles/base.css',
  'shared/styles/layout.css',
  'shared/styles/forms.css',
  'shared/styles/cards.css',
  'shared/styles/modals.css',
  'shared/styles/developer.css',
  'shared/theme/ThemeProvider.jsx',
  'shared/theme/themeStore.js',
  'shared/theme/themeTokens.css',
  'shared/theme/light.css',
  'shared/theme/dark.css',
  'shared/utils/crabUrl.js',
  'shared/utils/b3.js',
  'shared/utils/clipboard.js',
  'shared/utils/format.js',
  'shared/utils/nonce.js',
  'shared/utils/validation.js',
  'shared/utils/viewMode.js',
];

for (const relative of requiredSharedFiles) {
  assertFile(path.join('extensions', 'chrome', 'src', relative));
}

const sharedLayout = readText(path.join(shared, 'styles', 'layout.css'));
for (const token of [
  '.cl-creator-workspace',
  '.cl-creator-workspace-grid',
  '.cl-draft-stats-panel',
  '.cl-manifest-preview-panel',
  '.cl-route-truth-panel',
]) {
  requireIncludes(sharedLayout, token, 'shared/styles/layout.css');
}

const creatorWorkspaceLayout = readText(path.join(shared, 'components', 'CreatorWorkspaceLayout.jsx'));
for (const token of [
  'PageHeader',
  'cl-creator-workspace',
  'cl-creator-principles',
  'cl-creator-workspace-grid',
]) {
  requireIncludes(creatorWorkspaceLayout, token, 'shared/components/CreatorWorkspaceLayout.jsx');
}

const useCreatorDraft = readText(path.join(shared, 'hooks', 'useCreatorDraft.js'));
for (const token of [
  'useMemo',
  'useState',
  'buildManifest',
  'buildStats',
  'getCompleteness',
  'clearDraft',
]) {
  requireIncludes(useCreatorDraft, token, 'shared/hooks/useCreatorDraft.js');
}

const manifestPreviewPanel = readText(path.join(shared, 'components', 'ManifestPreviewPanel.jsx'));
for (const token of [
  'JsonPreview',
  'CopyButton',
  'stringifyManifest',
]) {
  requireIncludes(manifestPreviewPanel, token, 'shared/components/ManifestPreviewPanel.jsx');
}

const routeTruthPanel = readText(path.join(shared, 'components', 'RouteTruthPanel.jsx'));
for (const token of [
  'TruthBoundary',
  'Not claimed here',
  'no b3 CID minted',
  'no wallet mutation',
]) {
  requireIncludes(routeTruthPanel, token, 'shared/components/RouteTruthPanel.jsx');
}

const draftStatsPanel = readText(path.join(shared, 'components', 'DraftStatsPanel.jsx'));
for (const token of [
  'StatChip',
  'completeness',
  'cl-draft-completeness',
]) {
  requireIncludes(draftStatsPanel, token, 'shared/components/DraftStatsPanel.jsx');
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

const gatewayClient = readText(path.join(shared, 'api', 'gatewayClient.js'));
for (const token of ['fetch(', 'x-correlation-id', 'requestTimeoutMs', 'gatewayUrl']) {
  requireIncludes(gatewayClient, token, 'shared/api/gatewayClient.js');
}

for (const forbidden of ['svc-wallet', 'svc-storage', 'svc-index', 'ron-ledger']) {
  forbidIncludes(gatewayClient, forbidden, 'shared/api/gatewayClient.js');
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