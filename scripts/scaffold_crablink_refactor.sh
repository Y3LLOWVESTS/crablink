#!/usr/bin/env bash
set -euo pipefail

# RO:WHAT — Creates the CrabLink refactor scaffold without overwriting existing work.
# RO:WHY — DX/GOV/RES; prepares one-route-one-owner app architecture with safe migration.
# RO:INTERACTS — CrabLink repo files, Chrome MV3 extension, React/Vite app scaffold.
# RO:INVARIANTS — non-destructive by default; no direct backend calls; no fake truth; gateway-only client boundary.
# RO:METRICS — prints created/skipped/updated counts.
# RO:CONFIG — ROOT may be passed as arg 1; CRABLINK_SCAFFOLD_OVERWRITE=1 overwrites scaffoldable text files.
# RO:SECURITY — does not write secrets; does not mutate backend; placeholder icons only if missing.
# RO:TEST — bash -n; scripts/check-chrome.sh; scripts/package-chrome.sh; scripts/make_codebundle.sh.

ROOT="${1:-$(pwd)}"
OVERWRITE="${CRABLINK_SCAFFOLD_OVERWRITE:-0}"

CREATED=0
SKIPPED=0
UPDATED=0

cd "$ROOT"

say() {
  printf '%s\n' "$*"
}

ensure_parent() {
  local path="$1"
  mkdir -p "$(dirname "$path")"
}

mark_created() {
  CREATED=$((CREATED + 1))
  say "created: $1"
}

mark_updated() {
  UPDATED=$((UPDATED + 1))
  say "updated: $1"
}

mark_skipped() {
  SKIPPED=$((SKIPPED + 1))
  say "skipped: $1"
}

# Writes stdin to a file only when the file is missing, unless overwrite is enabled.
# This avoids giant double-quoted Bash strings, so JS template syntax/backticks cannot run as shell code.
write_stream_once() {
  local path="$1"
  local existed=0

  ensure_parent "$path"

  if [ -e "$path" ]; then
    existed=1
  fi

  if [ "$existed" = "1" ] && [ "$OVERWRITE" != "1" ]; then
    cat >/dev/null
    mark_skipped "$path"
    return 0
  fi

  cat > "$path"

  if [ "$existed" = "1" ]; then
    mark_updated "$path"
  else
    mark_created "$path"
  fi
}

pascal_name() {
  local raw
  raw="$(basename "$1")"
  raw="${raw%.*}"

  printf '%s' "$raw" \
    | sed -E 's/[^A-Za-z0-9]+/ /g' \
    | awk '{
        out="";
        for (i=1; i<=NF; i++) {
          token=$i;
          out=out toupper(substr(token,1,1)) substr(token,2);
        }
        if (out == "") out="Scaffold";
        if (out ~ /^[0-9]/) out="Scaffold" out;
        print out;
      }'
}

write_markdown_doc() {
  local path="$1"
  local title
  title="$(basename "$path")"
  title="${title%.*}"

  write_stream_once "$path" <<EOF
# ${title}

RO:WHAT — Scaffold document for the CrabLink refactor.
RO:WHY — Keeps design intent, route ownership, safety boundaries, and UX decisions visible.
RO:INTERACTS — CrabLink extension, shared schemas, route registry, gateway-facing client code.
RO:INVARIANTS — Gateway-only client boundary; no fake backend truth; no silent ROC spending.
RO:SECURITY — Do not store private keys, seed phrases, spend authority, or secrets here.
RO:TEST — Reviewed during scaffold/refactor planning and updated as implementation lands.

## Status

Scaffold placeholder.

## Notes

Fill this file as the refactor progresses.
EOF
}

write_json_schema_stub() {
  local path="$1"
  local name
  name="$(basename "$path")"
  name="${name%.json}"

  write_stream_once "$path" <<EOF
{
  "\$schema": "https://json-schema.org/draft/2020-12/schema",
  "\$id": "https://crablink.local/schemas/${name}.json",
  "title": "${name}",
  "type": "object",
  "additionalProperties": true,
  "properties": {
    "schema": {
      "type": "string"
    }
  }
}
EOF
}

write_json_fixture_stub() {
  local path="$1"
  local name
  name="$(basename "$path")"
  name="${name%.json}"

  write_stream_once "$path" <<EOF
{
  "schema": "crablink.fixture.${name}.v1",
  "scaffold": true,
  "truth_boundary": "fixture-only; not backend truth"
}
EOF
}

write_js_stub() {
  local path="$1"
  local name
  name="$(pascal_name "$path")"

  write_stream_once "$path" <<EOF
/**
 * RO:WHAT — Scaffold module for ${path}.
 * RO:WHY — CrabLink refactor; keeps responsibilities small, route-owned, and testable.
 * RO:INTERACTS — Route registry, shared app context, gateway client, or page-local UI.
 * RO:INVARIANTS — gateway-only backend access; no fake receipts/balances/CIDs; no silent ROC spend.
 * RO:METRICS — none yet.
 * RO:CONFIG — none yet.
 * RO:SECURITY — no secrets or spend authority stored here.
 * RO:TEST — static checks plus route/page smoke tests once implemented.
 */

export function init${name}() {
  return {
    ok: true,
    module: '${path}',
    scaffold: true,
  };
}
EOF
}

write_jsx_stub() {
  local path="$1"
  local name
  name="$(pascal_name "$path")"

  write_stream_once "$path" <<EOF
/**
 * RO:WHAT — React scaffold component for ${path}.
 * RO:WHY — CrabLink refactor; gives this UI surface a single clear owner.
 * RO:INTERACTS — App shell, route registry, shared components, and page-local CSS.
 * RO:INVARIANTS — no fake backend truth; no silent ROC spend; no direct internal-service calls.
 * RO:METRICS — none yet.
 * RO:CONFIG — app context/settings when wired.
 * RO:SECURITY — render trusted UI only; untrusted crab content belongs in sandboxed surfaces.
 * RO:TEST — component and route smoke tests once implemented.
 */

export default function ${name}() {
  return (
    <section className="cl-card cl-scaffold-card">
      <p className="cl-eyebrow">Scaffold</p>
      <h1>${name}</h1>
      <p>${path}</p>
    </section>
  );
}
EOF
}

write_css_stub() {
  local path="$1"

  write_stream_once "$path" <<EOF
/*
 * RO:WHAT — Stylesheet scaffold for ${path}.
 * RO:WHY — CrabLink refactor; page styles stay close to page owners and use shared tokens.
 * RO:INTERACTS — shared/theme/themeTokens.css and page/component modules.
 * RO:INVARIANTS — use CSS variables; avoid hard-coded colors unless intentionally local.
 * RO:TEST — visual/manual checks in CrabLink full-tab browser.
 */

.cl-scaffold-card {
  width: 100%;
}
EOF
}

write_png_placeholder() {
  local path="$1"

  ensure_parent "$path"

  if [ -e "$path" ] && [ "$OVERWRITE" != "1" ]; then
    mark_skipped "$path"
    return 0
  fi

  local b64
  b64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='

  if command -v base64 >/dev/null 2>&1; then
    if printf '%s' "$b64" | base64 -d > "$path" 2>/dev/null; then
      mark_created "$path"
      return 0
    fi

    if printf '%s' "$b64" | base64 -D > "$path" 2>/dev/null; then
      mark_created "$path"
      return 0
    fi
  fi

  say "warning: could not create PNG placeholder for $path; base64 decode unavailable"
  SKIPPED=$((SKIPPED + 1))
}

create_directories() {
  mkdir -p \
    docs \
    shared/js \
    shared/schemas \
    shared/fixtures \
    extensions/chrome/docs \
    extensions/chrome/assets/icons \
    extensions/chrome/src/app/shell \
    extensions/chrome/src/shared/api \
    extensions/chrome/src/shared/components \
    extensions/chrome/src/shared/embed \
    extensions/chrome/src/shared/manifest \
    extensions/chrome/src/shared/theme \
    extensions/chrome/src/shared/utils \
    extensions/chrome/src/shared/styles \
    extensions/chrome/src/pages/home \
    extensions/chrome/src/pages/site \
    extensions/chrome/src/pages/image \
    extensions/chrome/src/pages/profile \
    extensions/chrome/src/pages/music \
    extensions/chrome/src/pages/lyrics \
    extensions/chrome/src/pages/article \
    extensions/chrome/src/pages/post \
    extensions/chrome/src/pages/comment \
    extensions/chrome/src/pages/video \
    extensions/chrome/src/pages/stream \
    extensions/chrome/src/pages/podcast \
    extensions/chrome/src/pages/ad \
    extensions/chrome/src/pages/algo \
    extensions/chrome/src/pages/code \
    extensions/chrome/src/pages/game \
    extensions/chrome/src/pages/asset \
    extensions/chrome/src/pages/notFound \
    extensions/chrome/src/pages/problem \
    extensions/chrome/src/legacy \
    extensions/chrome/test/fixtures \
    scripts
}

write_root_files() {
  write_stream_once "README.md" <<'EOF'
# CrabLink

RO:WHAT — Browser-client repo for RustyOnions CrabLink.
RO:WHY — Provides the user-facing crab:// browser/extension UX.
RO:INTERACTS — RustyOnions svc-gateway, Chrome MV3, shared schemas/helpers.
RO:INVARIANTS — thin client; gateway-only backend access; no silent ROC spending; no fake backend truth.
RO:SECURITY — no private-key custody or spend authority in this scaffold.
RO:TEST — scripts/check-chrome.sh, scripts/package-chrome.sh, and smoke scripts.

## Status

Refactor scaffold placeholder.
EOF

  write_stream_once "CHANGELOG.md" <<'EOF'
# Changelog

## Unreleased

- Added CrabLink refactor scaffold.
EOF

  write_stream_once "SECURITY.md" <<'EOF'
# Security

CrabLink is a thin browser client.

Rules:

- Gateway-only backend access.
- No direct calls to svc-wallet, svc-storage, svc-index, omnigate, or ron-ledger.
- No silent ROC spending.
- No fake balances, receipts, b3 CIDs, or backend truth.
- No private keys or seed phrases stored in this scaffold.
EOF

  write_stream_once "CONTRIBUTING.md" <<'EOF'
# Contributing

Every code file should keep a short RO header explaining what it does, why it exists, what it touches, and the invariants it must preserve.

Prefer small files. If a JS/JSX file approaches 400 lines, split it by responsibility.
EOF

  write_stream_once "package.json" <<'EOF'
{
  "name": "crablink",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "CrabLink browser clients for RustyOnions crab:// UX.",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "check:chrome": "bash scripts/check-chrome.sh",
    "package:chrome": "bash scripts/package-chrome.sh",
    "codebundle": "bash scripts/make_codebundle.sh"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {}
}
EOF

  write_stream_once "vite.config.js" <<'EOF'
/**
 * RO:WHAT — Vite build config for the CrabLink full-tab Chrome app.
 * RO:WHY — DX; gives the refactored UI a modern, modular React build path.
 * RO:INTERACTS — extensions/chrome/src/page.html and app/main.jsx.
 * RO:INVARIANTS — browser-only bundle; no server assumptions; extension remains gateway-only.
 * RO:METRICS — none.
 * RO:CONFIG — build output path only.
 * RO:SECURITY — no secrets embedded at build time.
 * RO:TEST — npm run build plus scripts/check-chrome.sh.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'extensions/chrome/src',
  build: {
    outDir: '../../../dist/chrome-src',
    emptyOutDir: true,
    sourcemap: true
  }
});
EOF
}

write_docs() {
  write_markdown_doc "docs/CRABLINK_REFACTOR_PLAN.md"
  write_markdown_doc "docs/ROUTE_CONTRACTS.md"
  write_markdown_doc "docs/MANIFEST_MODEL.md"
  write_markdown_doc "docs/THEME_AND_AD_SLOT.md"
  write_markdown_doc "docs/SANDBOX_MODEL.md"
  write_markdown_doc "docs/TESTING_MATRIX.md"

  write_stream_once "extensions/chrome/docs/blueprint.md" <<'EOF'
# CrabLink Extension for Chrome — Blueprint

RO:WHAT — Chrome extension blueprint for CrabLink.
RO:WHY — Defines the safe browser-client boundary for RustyOnions.
RO:INTERACTS — Chrome MV3, svc-gateway, shared client helpers, full-tab React app.
RO:INVARIANTS — thin client; gateway-only; no private-key custody; no silent ROC spend.
RO:SECURITY — minimal permissions; no direct internal service calls.
RO:TEST — manual checklist, check-chrome, package-chrome, smoke scripts.

## Refactor rule

One route equals one page owner.

Shared shell owns:

- topbar
- address bar
- theme
- header ad slot
- modal/toast hosts

Pages own their own content.
EOF

  write_stream_once "extensions/chrome/docs/CREATOR_WORKSPACES.MD" <<'EOF'
# Creator Workspaces

RO:WHAT — Notes for CrabLink creator workspaces.
RO:WHY — Keeps built-in page UX aligned during refactor.
RO:INTERACTS — pages/site, pages/image, pages/music, pages/video, pages/stream, pages/podcast, pages/code, pages/game.
RO:INVARIANTS — Builder View is clean; Developer View contains contracts/JSON/truth boundaries.
RO:SECURITY — no arbitrary executable code from crab links.
RO:TEST — manual route smoke and future component tests.

## Workspaces

- Site
- Image
- Profile
- Music
- Lyrics
- Article
- Post
- Comment
- Video
- Stream
- Podcast
- Ad
- Algo
- Code
- Game
EOF

  write_stream_once "extensions/chrome/src/legacy/README.md" <<'EOF'
# Legacy bridge

RO:WHAT — Temporary holding area for old page-layer compatibility code.
RO:WHY — Lets us migrate CrabLink one route at a time without breaking proven flows.
RO:INTERACTS — old page.js/page-* files and new app/pages modules.
RO:INVARIANTS — temporary only; do not add new product behavior here.
RO:SECURITY — no backend mutation or direct service calls.
RO:TEST — remove after new route owners are smoke-green.

## Migration rule

Move behavior from old patch-style files into route-owned pages or shared components, then delete the legacy bridge.
EOF

  write_stream_once "extensions/chrome/test/manual-checklist.md" <<'EOF'
# CrabLink Chrome Manual Checklist

RO:WHAT — Manual QA checklist for the CrabLink Chrome extension.
RO:WHY — Captures user-visible proof during refactor migration.
RO:INTERACTS — Chrome MV3 extension, full-tab app, local gateway smoke.
RO:INVARIANTS — gateway-only; no fake truth; no silent ROC spend.
RO:SECURITY — verify no secrets appear in UI/logs.
RO:TEST — run after scaffold and each migration phase.

## Basic

- [ ] Load unpacked extension.
- [ ] Open full-tab CrabLink browser.
- [ ] Confirm topbar renders.
- [ ] Confirm Header Ad Slot says Ad Space.
- [ ] Confirm home page renders.

## Route ownership

- [ ] crab://site routes to Site page.
- [ ] crab://image routes to Image page.
- [ ] crab://profile routes to Profile page.
- [ ] Unknown route shows Not Found/Problem page.

## Safety

- [ ] No silent ROC spend.
- [ ] No fake balance/receipt/CID.
- [ ] Gateway offline state is clear.
EOF
}

write_chrome_shell_files() {
  write_stream_once "extensions/chrome/manifest.json" <<'EOF'
{
  "manifest_version": 3,
  "name": "CrabLink Extension for Chrome",
  "description": "Resolve crab:// links, view b3 asset pages, and connect to local RustyOnions gateways.",
  "version": "0.1.0",
  "action": {
    "default_title": "Open CrabLink Browser"
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
  "omnibox": {
    "keyword": "crab"
  },
  "icons": {
    "16": "assets/icons/icon16.png",
    "32": "assets/icons/icon32.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
EOF

  write_stream_once "extensions/chrome/README.md" <<'EOF'
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
EOF

  write_stream_once "extensions/chrome/src/page.html" <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CrabLink</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./app/main.jsx"></script>
  </body>
</html>
EOF

  write_stream_once "extensions/chrome/src/popup.html" <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CrabLink Popup</title>
  </head>
  <body>
    <main>
      <h1>CrabLink</h1>
      <p>Open the full CrabLink browser tab from the extension action.</p>
    </main>
    <script type="module" src="./popup.js"></script>
  </body>
</html>
EOF

  write_stream_once "extensions/chrome/src/options.html" <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CrabLink Options</title>
  </head>
  <body>
    <main>
      <h1>CrabLink Options</h1>
      <p>Scaffold placeholder.</p>
    </main>
    <script type="module" src="./options.js"></script>
  </body>
</html>
EOF

  write_stream_once "extensions/chrome/src/background.js" <<'EOF'
/**
 * RO:WHAT — Chrome MV3 service worker for CrabLink.
 * RO:WHY — Opens the full-tab CrabLink browser and owns install-time extension glue.
 * RO:INTERACTS — manifest.json and src/page.html.
 * RO:INVARIANTS — no durable runtime truth in service worker globals; no backend mutation here.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no secrets stored or logged.
 * RO:TEST — load unpacked extension and click toolbar action.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.info('CrabLink installed');
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/page.html') });
});
EOF

  write_stream_once "extensions/chrome/src/content.js" <<'EOF'
/**
 * RO:WHAT — Minimal content script placeholder for CrabLink.
 * RO:WHY — Reserved for future user-triggered crab:// link helpers.
 * RO:INTERACTS — Chrome activeTab flow when enabled.
 * RO:INVARIANTS — no broad navigation hijacking; no page scraping by default.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no secrets; no hidden behavior.
 * RO:TEST — extension load smoke.
 */

export {};
EOF
}

write_app_core() {
  write_stream_once "extensions/chrome/src/app/main.jsx" <<'EOF'
/**
 * RO:WHAT — React entrypoint for the CrabLink full-tab browser shell.
 * RO:WHY — CrabLink refactor; replaces patch-heavy DOM ownership with a single app root.
 * RO:INTERACTS — App.jsx, page.html, shared theme/styles, route registry.
 * RO:INVARIANTS — gateway-only client boundary; no fake backend truth; no silent ROC spend.
 * RO:METRICS — none yet.
 * RO:CONFIG — extension settings are loaded by App/settings.
 * RO:SECURITY — untrusted crab content must render through sandboxed surfaces.
 * RO:TEST — npm run build and Chrome manual route smoke.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

import '../shared/theme/themeTokens.css';
import '../shared/theme/light.css';
import '../shared/theme/dark.css';
import '../shared/styles/base.css';
import '../shared/styles/layout.css';
import '../shared/styles/forms.css';
import '../shared/styles/cards.css';
import '../shared/styles/modals.css';
import '../shared/styles/developer.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('CrabLink root element not found');
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

  write_stream_once "extensions/chrome/src/app/App.jsx" <<'EOF'
/**
 * RO:WHAT — Top-level CrabLink React app.
 * RO:WHY — Owns shell, routing, theme, modal/toast hosts, and app-wide context.
 * RO:INTERACTS — Shell, router, app context, route registry.
 * RO:INVARIANTS — one active page owner; shared shell owns topbar/theme/ad slot.
 * RO:METRICS — none yet.
 * RO:CONFIG — reads settings through app/settings.
 * RO:SECURITY — no direct calls to internal RustyOnions services.
 * RO:TEST — route smoke tests once wired.
 */

import Shell from './shell/Shell.jsx';
import HomePage from '../pages/home/HomePage.jsx';

export default function App() {
  return (
    <Shell>
      <HomePage />
    </Shell>
  );
}
EOF

  write_stream_once "extensions/chrome/src/app/routeRegistry.js" <<'EOF'
/**
 * RO:WHAT — Explicit registry for built-in CrabLink route owners.
 * RO:WHY — Enforces one-route-one-page ownership during the refactor.
 * RO:INTERACTS — router.js and pages/* page modules.
 * RO:INVARIANTS — every built-in route maps to exactly one owner; no late DOM rescue scripts.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — route registry does not grant capabilities or spend authority.
 * RO:TEST — route registry smoke tests once implemented.
 */

import HomePage from '../pages/home/HomePage.jsx';
import SitePage from '../pages/site/SitePage.jsx';
import ImagePage from '../pages/image/ImagePage.jsx';
import ProfilePage from '../pages/profile/ProfilePage.jsx';
import MusicPage from '../pages/music/MusicPage.jsx';
import LyricsPage from '../pages/lyrics/LyricsPage.jsx';
import ArticlePage from '../pages/article/ArticlePage.jsx';
import PostPage from '../pages/post/PostPage.jsx';
import CommentPage from '../pages/comment/CommentPage.jsx';
import VideoPage from '../pages/video/VideoPage.jsx';
import StreamPage from '../pages/stream/StreamPage.jsx';
import PodcastPage from '../pages/podcast/PodcastPage.jsx';
import AdPage from '../pages/ad/AdPage.jsx';
import AlgoPage from '../pages/algo/AlgoPage.jsx';
import CodePage from '../pages/code/CodePage.jsx';
import GamePage from '../pages/game/GamePage.jsx';
import AssetPage from '../pages/asset/AssetPage.jsx';
import NotFoundPage from '../pages/notFound/NotFoundPage.jsx';
import ProblemPage from '../pages/problem/ProblemPage.jsx';

export const ROUTES = Object.freeze({
  home: HomePage,
  site: SitePage,
  image: ImagePage,
  profile: ProfilePage,
  music: MusicPage,
  lyrics: LyricsPage,
  article: ArticlePage,
  post: PostPage,
  comment: CommentPage,
  video: VideoPage,
  stream: StreamPage,
  podcast: PodcastPage,
  ad: AdPage,
  algo: AlgoPage,
  code: CodePage,
  game: GamePage,
  asset: AssetPage,
  notFound: NotFoundPage,
  problem: ProblemPage
});

export const BUILT_IN_ROUTE_KINDS = Object.freeze(Object.keys(ROUTES));
EOF

  write_stream_once "extensions/chrome/src/app/router.js" <<'EOF'
/**
 * RO:WHAT — CrabLink route parsing and page selection helpers.
 * RO:WHY — Centralizes navigation so pages do not fight over DOM ownership.
 * RO:INTERACTS — routeRegistry.js, shared/utils/crabUrl.js, Shell address bar.
 * RO:INVARIANTS — parse only; backend validation remains canonical; no fake route truth.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — does not grant capabilities; only selects UI owner.
 * RO:TEST — unit tests for crab:// and b3 route parsing.
 */

import { ROUTES } from './routeRegistry.js';

export function getRouteComponent(kind) {
  return ROUTES[kind] || ROUTES.notFound;
}

export function normalizeRouteKind(input) {
  const value = String(input || '').trim();

  if (!value) return 'home';

  if (value.startsWith('crab://')) {
    const body = value.slice('crab://'.length);
    const first = body.split(/[/.?#]/)[0];
    return ROUTES[first] ? first : 'asset';
  }

  return ROUTES[value] ? value : 'notFound';
}
EOF
}

write_shell_files() {
  write_stream_once "extensions/chrome/src/app/shell/Shell.jsx" <<'EOF'
/**
 * RO:WHAT — Main CrabLink browser shell.
 * RO:WHY — Shared shell owns topbar, browser controls, ad slot, modal/toast hosts, and page outlet.
 * RO:INTERACTS — TopBar, HeaderAdSlot, ModalHost, ToastHost, page components.
 * RO:INVARIANTS — pages own content; shell owns global browser frame; no route-specific patching here.
 * RO:METRICS — none yet.
 * RO:CONFIG — theme/settings once wired.
 * RO:SECURITY — untrusted crab content belongs inside sandboxed renderers, not the shell.
 * RO:TEST — visual/manual full-tab smoke.
 */

import TopBar from './TopBar.jsx';
import HeaderAdSlot from './HeaderAdSlot.jsx';
import ToastHost from './ToastHost.jsx';
import ModalHost from './ModalHost.jsx';
import './Shell.css';

export default function Shell({ children }) {
  return (
    <div className="cl-shell" data-theme="light">
      <TopBar />
      <HeaderAdSlot />
      <main className="cl-shell-main">{children}</main>
      <ToastHost />
      <ModalHost />
    </div>
  );
}
EOF

  write_stream_once "extensions/chrome/src/app/shell/TopBar.jsx" <<'EOF'
/**
 * RO:WHAT — Top browser bar for CrabLink.
 * RO:WHY — Keeps identity, navigation, address entry, and status controls consistent.
 * RO:INTERACTS — AddressBar, BrowserNav, PassportChip, BalanceChip, CreatorChip.
 * RO:INVARIANTS — display backend-derived truth only; do not invent passport/balance state.
 * RO:METRICS — none.
 * RO:CONFIG — gateway/settings once wired.
 * RO:SECURITY — no secret values rendered.
 * RO:TEST — visual/manual shell smoke.
 */

import AddressBar from './AddressBar.jsx';
import BrowserNav from './BrowserNav.jsx';
import PassportChip from './PassportChip.jsx';
import BalanceChip from './BalanceChip.jsx';

export default function TopBar() {
  return (
    <header className="cl-topbar">
      <div className="cl-brand">CrabLink</div>
      <BrowserNav />
      <AddressBar />
      <PassportChip />
      <BalanceChip />
    </header>
  );
}
EOF

  write_stream_once "extensions/chrome/src/app/shell/AddressBar.jsx" <<'EOF'
/**
 * RO:WHAT — CrabLink address bar scaffold.
 * RO:WHY — Central place for crab:// input and route navigation.
 * RO:INTERACTS — router.js and Shell.
 * RO:INVARIANTS — frontend parsing is convenience only; backend validation remains canonical.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no secrets rendered in address input.
 * RO:TEST — manual route entry smoke.
 */

export default function AddressBar() {
  return (
    <label className="cl-address">
      <span className="sr-only">CrabLink address</span>
      <input placeholder="crab://site" aria-label="CrabLink address" />
    </label>
  );
}
EOF

  write_stream_once "extensions/chrome/src/app/shell/BrowserNav.jsx" <<'EOF'
/**
 * RO:WHAT — Browser navigation controls for CrabLink.
 * RO:WHY — Keeps Back/Forward/Home/Refresh controls consistent.
 * RO:INTERACTS — Shell and future router history.
 * RO:INVARIANTS — UI controls do not mutate backend truth.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no privileged Chrome APIs until explicitly needed.
 * RO:TEST — manual browser navigation smoke.
 */

export default function BrowserNav() {
  return (
    <nav className="cl-browser-nav" aria-label="Browser navigation">
      <button type="button">Back</button>
      <button type="button">Forward</button>
      <button type="button">Home</button>
      <button type="button">Refresh</button>
    </nav>
  );
}
EOF

  write_stream_once "extensions/chrome/src/app/shell/PassportChip.jsx" <<'EOF'
/**
 * RO:WHAT — Passport chip scaffold.
 * RO:WHY — Displays backend-confirmed identity state when available.
 * RO:INTERACTS — identity client and Shell.
 * RO:INVARIANTS — do not claim confirmed username/passport unless backend provides it.
 * RO:METRICS — none.
 * RO:CONFIG — identity settings once wired.
 * RO:SECURITY — no private keys or private alt mappings rendered.
 * RO:TEST — identity UI smoke once backend truth is wired.
 */

export default function PassportChip() {
  return <span className="cl-chip">Passport</span>;
}
EOF

  write_stream_once "extensions/chrome/src/app/shell/BalanceChip.jsx" <<'EOF'
/**
 * RO:WHAT — ROC balance chip scaffold.
 * RO:WHY — Displays backend-derived wallet balance when available.
 * RO:INTERACTS — wallet client and Shell.
 * RO:INVARIANTS — no fake balances; no local ledger truth; no silent spend.
 * RO:METRICS — none.
 * RO:CONFIG — wallet account setting once wired.
 * RO:SECURITY — no spend authority stored or displayed.
 * RO:TEST — wallet display smoke once wired.
 */

export default function BalanceChip() {
  return <span className="cl-chip">ROC</span>;
}
EOF

  write_stream_once "extensions/chrome/src/app/shell/CreatorChip.jsx" <<'EOF'
/**
 * RO:WHAT — Creator identity chip scaffold.
 * RO:WHY — Shows site/asset creator identity when gateway responses provide it.
 * RO:INTERACTS — hydrated asset/site DTOs and Shell.
 * RO:INVARIANTS — placeholder identity must be clearly local/stub unless backend confirmed.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no private identity data rendered.
 * RO:TEST — site/asset creator display smoke.
 */

export default function CreatorChip() {
  return <span className="cl-chip">Creator</span>;
}
EOF

  write_stream_once "extensions/chrome/src/app/shell/HeaderAdSlot.jsx" <<'EOF'
/**
 * RO:WHAT — Standardized CrabLink header ad slot.
 * RO:WHY — Reserves a protocol-native ad placement without invasive tracking or page-specific hacks.
 * RO:INTERACTS — Shell theme tokens and future crab://ad manifests.
 * RO:INVARIANTS — clearly labeled; one header slot; no third-party tracking scripts.
 * RO:METRICS — none yet.
 * RO:CONFIG — future ad feature gate.
 * RO:SECURITY — displays safe static placeholder until backend ad contracts exist.
 * RO:TEST — visual/manual shell smoke.
 */

export default function HeaderAdSlot() {
  return (
    <aside className="cl-header-ad" aria-label="Advertisement">
      <span>Ad Space</span>
    </aside>
  );
}
EOF

  write_stream_once "extensions/chrome/src/app/shell/ToastHost.jsx" <<'EOF'
/**
 * RO:WHAT — Global toast host scaffold.
 * RO:WHY — Gives all pages consistent status feedback.
 * RO:INTERACTS — appEvents and Shell.
 * RO:INVARIANTS — do not leak secrets in toast text.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — redact tokens/errors before display.
 * RO:TEST — UI smoke once wired.
 */

export default function ToastHost() {
  return <div id="toast-host" aria-live="polite" />;
}
EOF

  write_stream_once "extensions/chrome/src/app/shell/ModalHost.jsx" <<'EOF'
/**
 * RO:WHAT — Global modal host scaffold.
 * RO:WHY — Replaces page-bottom manifest/debug injections with controlled overlays.
 * RO:INTERACTS — appEvents, Manifest drawers, Shell.
 * RO:INVARIANTS — modals are dismissible and user-triggered.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no untrusted scripts in modal content.
 * RO:TEST — modal smoke once wired.
 */

export default function ModalHost() {
  return <div id="modal-host" />;
}
EOF

  write_stream_once "extensions/chrome/src/app/shell/Shell.css" <<'EOF'
/*
 * RO:WHAT — Shell layout styles for the CrabLink full-tab browser.
 * RO:WHY — Provides a premium, spacious, consistent application frame.
 * RO:INTERACTS — Shell.jsx, TopBar.jsx, HeaderAdSlot.jsx, shared theme tokens.
 * RO:INVARIANTS — use CSS variables; light mode remains default.
 * RO:TEST — visual/manual full-tab smoke.
 */

.cl-shell {
  min-height: 100vh;
  background: var(--cl-bg);
  color: var(--cl-text);
}

.cl-topbar {
  display: grid;
  grid-template-columns: auto auto minmax(220px, 1fr) auto auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--cl-border);
  background: var(--cl-surface);
}

.cl-brand {
  font-weight: 800;
  white-space: nowrap;
}

.cl-header-ad {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  margin: 0;
  border-bottom: 1px solid var(--cl-border);
  background: var(--cl-ad-bg);
  color: var(--cl-muted);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.cl-shell-main {
  width: min(1440px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.25rem 0 2.5rem;
}
EOF
}

write_home_page() {
  write_stream_once "extensions/chrome/src/pages/home/HomePage.jsx" <<'EOF'
/**
 * RO:WHAT — CrabLink home page scaffold.
 * RO:WHY — Gives the full-tab browser a safe default landing page.
 * RO:INTERACTS — HomeQuickActions and route registry.
 * RO:INVARIANTS — no fake backend truth; quick actions only navigate.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no backend mutation from home page.
 * RO:TEST — full-tab route smoke.
 */

import HomeQuickActions from './HomeQuickActions.jsx';
import './home.css';

export default function HomePage() {
  return (
    <section className="cl-page home-page">
      <div className="cl-card">
        <p className="cl-eyebrow">CrabLink</p>
        <h1>Welcome to CrabLink</h1>
        <p>Refactor scaffold is ready. Built-in crab:// pages can now move into route-owned folders.</p>
      </div>
      <HomeQuickActions />
    </section>
  );
}
EOF

  write_stream_once "extensions/chrome/src/pages/home/HomeQuickActions.jsx" <<'EOF'
/**
 * RO:WHAT — Home quick-action card scaffold.
 * RO:WHY — Keeps common creator/browser actions visible without bloating HomePage.
 * RO:INTERACTS — future router navigation.
 * RO:INVARIANTS — quick actions do not mutate backend truth.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no spend actions here.
 * RO:TEST — home page smoke.
 */

export default function HomeQuickActions() {
  return (
    <div className="cl-card">
      <p className="cl-eyebrow">Quick Actions</p>
      <p>Site, Image, Profile, Music, Video, Stream, Podcast, and more.</p>
    </div>
  );
}
EOF
}

write_theme_and_styles() {
  write_stream_once "extensions/chrome/src/shared/theme/themeTokens.css" <<'EOF'
/*
 * RO:WHAT — Shared semantic theme tokens for CrabLink.
 * RO:WHY — Gives every crab:// page a uniform light/dark foundation.
 * RO:INTERACTS — ThemeProvider, Shell, all page CSS files.
 * RO:INVARIANTS — components use tokens instead of raw ad hoc colors.
 * RO:TEST — visual/manual theme smoke.
 */

:root {
  --cl-bg: #f6f7fb;
  --cl-surface: #ffffff;
  --cl-card: #ffffff;
  --cl-text: #111827;
  --cl-muted: #6b7280;
  --cl-border: #d8dee9;
  --cl-accent: #2563eb;
  --cl-danger: #b91c1c;
  --cl-warning: #92400e;
  --cl-success: #047857;
  --cl-ad-bg: #eef2ff;
}
EOF

  write_stream_once "extensions/chrome/src/shared/theme/light.css" <<'EOF'
/*
 * RO:WHAT — Light theme token overrides for CrabLink.
 * RO:WHY — Light mode is the default user-facing mode.
 * RO:INTERACTS — themeTokens.css and ThemeProvider.
 * RO:INVARIANTS — readable contrast; no page-specific global hacks.
 * RO:TEST — visual/manual theme smoke.
 */

[data-theme='light'] {
  color-scheme: light;
}
EOF

  write_stream_once "extensions/chrome/src/shared/theme/dark.css" <<'EOF'
/*
 * RO:WHAT — Dark theme token overrides for CrabLink.
 * RO:WHY — Provides a uniform dark mode across CrabLink pages.
 * RO:INTERACTS — themeTokens.css and ThemeProvider.
 * RO:INVARIANTS — readable contrast; no page-specific global hacks.
 * RO:TEST — visual/manual theme smoke.
 */

[data-theme='dark'] {
  color-scheme: dark;
  --cl-bg: #070b13;
  --cl-surface: #0f172a;
  --cl-card: #111827;
  --cl-text: #e5e7eb;
  --cl-muted: #9ca3af;
  --cl-border: #263244;
  --cl-accent: #60a5fa;
  --cl-ad-bg: #111827;
}
EOF

  write_stream_once "extensions/chrome/src/shared/styles/base.css" <<'EOF'
/*
 * RO:WHAT — Base CSS reset and typography for CrabLink.
 * RO:WHY — Keeps app rendering consistent across all built-in pages.
 * RO:INTERACTS — React app root and all page components.
 * RO:INVARIANTS — do not style untrusted crab content directly.
 * RO:TEST — visual/manual app smoke.
 */

* {
  box-sizing: border-box;
}

html,
body,
#root {
  min-height: 100%;
  margin: 0;
}

body {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
EOF

  write_stream_once "extensions/chrome/src/shared/styles/layout.css" <<'EOF'
/*
 * RO:WHAT — Shared layout primitives for CrabLink.
 * RO:WHY — Avoids repeated page-level layout boilerplate.
 * RO:INTERACTS — shared components and pages.
 * RO:INVARIANTS — pages stay responsive and full-width.
 * RO:TEST — visual/manual route smoke.
 */

.cl-page {
  display: grid;
  gap: 1rem;
}
EOF

  write_stream_once "extensions/chrome/src/shared/styles/cards.css" <<'EOF'
/*
 * RO:WHAT — Shared card styles for CrabLink.
 * RO:WHY — Makes pages feel consistent and premium.
 * RO:INTERACTS — Card.jsx and scaffold pages.
 * RO:INVARIANTS — use theme tokens.
 * RO:TEST — visual/manual route smoke.
 */

.cl-card {
  border: 1px solid var(--cl-border);
  border-radius: 18px;
  background: var(--cl-card);
  padding: 1rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.cl-eyebrow {
  margin: 0 0 0.35rem;
  color: var(--cl-muted);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
EOF

  write_stream_once "extensions/chrome/src/shared/styles/forms.css" <<'EOF'
/*
 * RO:WHAT — Shared form styles for CrabLink.
 * RO:WHY — Keeps creator forms consistent across built-in pages.
 * RO:INTERACTS — shared form components.
 * RO:INVARIANTS — accessible labels and visible focus states.
 * RO:TEST — visual/manual form smoke.
 */

.cl-field {
  display: grid;
  gap: 0.35rem;
}
EOF

  write_stream_once "extensions/chrome/src/shared/styles/modals.css" <<'EOF'
/*
 * RO:WHAT — Shared modal and drawer styles for CrabLink.
 * RO:WHY — Replaces append-to-page manifest/debug panels with consistent overlays.
 * RO:INTERACTS — Modal.jsx, ModalHost.jsx, manifest drawers.
 * RO:INVARIANTS — modal content must be user-triggered and dismissible.
 * RO:TEST — visual/manual modal smoke.
 */

.cl-modal {
  border: 1px solid var(--cl-border);
  border-radius: 18px;
  background: var(--cl-card);
}
EOF

  write_stream_once "extensions/chrome/src/shared/styles/developer.css" <<'EOF'
/*
 * RO:WHAT — Developer-view styles for CrabLink.
 * RO:WHY — Keeps JSON/contracts/diagnostics available without dominating Builder View.
 * RO:INTERACTS — JsonPreview.jsx and Developer panels.
 * RO:INVARIANTS — developer data must not claim fake backend truth.
 * RO:TEST — visual/manual developer toggle smoke.
 */

.cl-json {
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
EOF
}

write_special_shared_files() {
  write_stream_once "extensions/chrome/src/shared/api/gatewayClient.js" <<'EOF'
/**
 * RO:WHAT — Gateway-only HTTP client scaffold for CrabLink.
 * RO:WHY — Centralizes all backend requests through svc-gateway.
 * RO:INTERACTS — shared RonClient wrappers and page flows.
 * RO:INVARIANTS — no direct calls to omnigate/storage/index/wallet/ledger services.
 * RO:METRICS — none yet.
 * RO:CONFIG — baseUrl and timeout settings.
 * RO:SECURITY — tokens must be redacted; no secrets logged.
 * RO:TEST — gateway smoke once wired.
 */

export class GatewayClient {
  constructor({ baseUrl = 'http://127.0.0.1:8090' } = {}) {
    this.baseUrl = String(baseUrl || 'http://127.0.0.1:8090').replace(/\/+$/, '');
  }

  url(path) {
    const route = String(path || '');
    return this.baseUrl + (route.startsWith('/') ? route : '/' + route);
  }
}
EOF

  write_stream_once "extensions/chrome/src/shared/api/identityClient.js" <<'EOF'
/**
 * RO:WHAT — Identity API scaffold for CrabLink.
 * RO:WHY — Keeps passport/profile calls gateway-only and explicit.
 * RO:INTERACTS — gatewayClient and profile pages.
 * RO:INVARIANTS — backend confirms identity truth; no fake usernames/passports.
 * RO:METRICS — none.
 * RO:CONFIG — gateway client.
 * RO:SECURITY — no private keys or private alt mappings.
 * RO:TEST — identity route smoke once backend is wired.
 */

export function createIdentityClient(gateway) {
  return { gateway };
}
EOF

  write_stream_once "extensions/chrome/src/shared/api/walletClient.js" <<'EOF'
/**
 * RO:WHAT — Wallet display API scaffold for CrabLink.
 * RO:WHY — Keeps balance/hold flows explicit and gateway-routed.
 * RO:INTERACTS — gatewayClient, BalanceChip, paid asset/site flows.
 * RO:INVARIANTS — no fake balances; no silent spend; wallet/ledger truth stays backend-owned.
 * RO:METRICS — none.
 * RO:CONFIG — gateway client.
 * RO:SECURITY — no spend authority stored locally.
 * RO:TEST — wallet smoke once backend is wired.
 */

export function createWalletClient(gateway) {
  return { gateway };
}
EOF

  write_stream_once "extensions/chrome/src/shared/api/assetClient.js" <<'EOF'
/**
 * RO:WHAT — Asset API scaffold for CrabLink.
 * RO:WHY — Centralizes asset prepare/upload/resolve calls through gateway.
 * RO:INTERACTS — image page, asset page, gatewayClient.
 * RO:INVARIANTS — no fake b3 CIDs; no fake receipts; explicit paid confirmation.
 * RO:METRICS — none.
 * RO:CONFIG — gateway client.
 * RO:SECURITY — no direct storage calls from UI.
 * RO:TEST — image asset smoke once migrated.
 */

export function createAssetClient(gateway) {
  return { gateway };
}
EOF

  write_stream_once "extensions/chrome/src/shared/api/siteClient.js" <<'EOF'
/**
 * RO:WHAT — Site API scaffold for CrabLink.
 * RO:WHY — Preserves proven site prepare/create/open flow behind one client boundary.
 * RO:INTERACTS — site page, gatewayClient.
 * RO:INVARIANTS — no fake site pointer; no direct index/storage calls.
 * RO:METRICS — none.
 * RO:CONFIG — gateway client.
 * RO:SECURITY — site creation requires backend authority and explicit paid confirmation when applicable.
 * RO:TEST — site create/open smoke once migrated.
 */

export function createSiteClient(gateway) {
  return { gateway };
}
EOF

  write_stream_once "extensions/chrome/src/shared/manifest/uniformManifest.js" <<'EOF'
/**
 * RO:WHAT — Uniform manifest builder for CrabLink asset drafts.
 * RO:WHY — Prevents every built-in page from inventing a different manifest shape.
 * RO:INTERACTS — manifestDrafts, manifestForm, pages/*, shared schemas.
 * RO:INVARIANTS — draft state is not backend truth; no fake CIDs/receipts/policy enforcement.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no private keys, spend authority, or private alt mappings.
 * RO:TEST — manifest schema tests once implemented.
 */

export function createUniformManifestDraft(kind, overrides = {}) {
  return {
    schema: 'crablink.uniform-manifest.draft.v1',
    kind,
    identity: {},
    ownership: {},
    metadata: {},
    linked_assets: {},
    renditions: {},
    versions: [],
    rights_policy: {},
    access_policy: {},
    ad_policy: {},
    economics: {},
    feature_gates: {},
    required_capabilities: [],
    provenance: {},
    storage: {},
    receipts: [],
    truth_boundary: 'local draft only; not backend truth until published and confirmed',
    ...overrides
  };
}
EOF

  write_stream_once "extensions/chrome/src/shared/embed/safeHtml.js" <<'EOF'
/**
 * RO:WHAT — Safe HTML helper placeholder for CrabLink site rendering.
 * RO:WHY — Separates untrusted crab content handling from trusted shell UI.
 * RO:INTERACTS — sandboxFrame and site renderer.
 * RO:INVARIANTS — no arbitrary script execution; sanitizer rules must fail closed.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — all untrusted HTML must be sanitized/sandboxed before display.
 * RO:TEST — sanitizer tests before production use.
 */

export function markUntrustedHtml(html) {
  return String(html || '');
}
EOF

  write_stream_once "extensions/chrome/src/shared/embed/sandboxFrame.js" <<'EOF'
/**
 * RO:WHAT — Sandbox frame helper placeholder for untrusted crab content.
 * RO:WHY — Keeps CrabLink shell trusted while rendering user/site content in a cage.
 * RO:INTERACTS — SiteRender and embed registry.
 * RO:INVARIANTS — sandbox permissions must be minimal and explicit.
 * RO:METRICS — none.
 * RO:CONFIG — future sandbox policy.
 * RO:SECURITY — do not enable scripts/forms/popups without a reviewed policy.
 * RO:TEST — sandbox contract tests once wired.
 */

export function getDefaultSandboxAttributes() {
  return 'allow-same-origin';
}
EOF

  write_stream_once "shared/js/storageSchema.js" <<'EOF'
/**
 * RO:WHAT — Shared CrabLink extension storage defaults.
 * RO:WHY — Keeps local settings predictable across popup/options/full-tab UI.
 * RO:INTERACTS — Chrome storage adapter and shared settings code.
 * RO:INVARIANTS — local storage is convenience cache only; never backend truth.
 * RO:METRICS — none.
 * RO:CONFIG — gateway URL, timeout, dev mode, labels.
 * RO:SECURITY — no private keys, seed phrases, or spend authority.
 * RO:TEST — settings schema tests once implemented.
 */

export const DEFAULT_SETTINGS = Object.freeze({
  schemaVersion: 1,
  gatewayUrl: 'http://127.0.0.1:8090',
  requestTimeoutMs: 5000,
  passportSubject: '',
  walletAccount: '',
  requireSpendConfirm: true,
  devMode: false
});
EOF
}

write_script_stub() {
  local path="$1"
  local title
  title="$(basename "$path")"

  write_stream_once "$path" <<EOF
#!/usr/bin/env bash
set -euo pipefail

# RO:WHAT — Scaffold placeholder for ${title}.
# RO:WHY — Ops/DX; keeps CrabLink scripts discoverable during refactor.
# RO:INTERACTS — CrabLink repo, Chrome extension files, local gateway when implemented.
# RO:INVARIANTS — no secrets echoed; fail loudly; no destructive cleanup.
# RO:METRICS — prints status only.
# RO:CONFIG — none yet.
# RO:SECURITY — no credentials written or displayed.
# RO:TEST — invoked manually until implemented.

printf '%s\n' '${title}: scaffold placeholder'
EOF

  chmod +x "$path"
}

create_from_lists() {
  local schemas=(
    shared/schemas/asset-page.schema.json
    shared/schemas/extension-settings.schema.json
    shared/schemas/identity-me.schema.json
    shared/schemas/passport-bootstrap.schema.json
    shared/schemas/problem.schema.json
    shared/schemas/public-profile.schema.json
    shared/schemas/site-page.schema.json
    shared/schemas/wallet-balance.schema.json
    shared/schemas/uniform-manifest.schema.json
    shared/schemas/rendition-group.schema.json
  )

  local fixtures=(
    shared/fixtures/asset-page.sample.json
    shared/fixtures/identity-me.empty.sample.json
    shared/fixtures/identity-me.ready.sample.json
    shared/fixtures/passport-bootstrap.sample.json
    shared/fixtures/problem.not-found.json
    shared/fixtures/problem.policy-denied.json
    shared/fixtures/public-profile.confirmed.sample.json
    shared/fixtures/site-page.sample.json
    shared/fixtures/wallet-balance.sample.json
    shared/fixtures/uniform-manifest.sample.json
    shared/fixtures/rendition-group.sample.json
    extensions/chrome/test/fixtures/asset-page.sample.json
    extensions/chrome/test/fixtures/problem.not-found.json
    extensions/chrome/test/fixtures/problem.policy-denied.json
    extensions/chrome/test/fixtures/site-page.sample.json
  )

  local js_files=(
    shared/js/crab.js
    shared/js/errors.js
    shared/js/ids.js
    shared/js/ronClient.js
    extensions/chrome/src/popup.js
    extensions/chrome/src/options.js
    extensions/chrome/src/options-first-run-polish.js
    extensions/chrome/src/page.js
    extensions/chrome/src/crab.js
    extensions/chrome/src/ronClient.js
    extensions/chrome/src/storage.js
    extensions/chrome/src/app/appContext.js
    extensions/chrome/src/app/appEvents.js
    extensions/chrome/src/app/appState.js
    extensions/chrome/src/app/settings.js
    extensions/chrome/src/shared/embed/embedRegistry.js
    extensions/chrome/src/shared/embed/crabImageEmbed.jsx
    extensions/chrome/src/shared/embed/crabVideoEmbed.jsx
    extensions/chrome/src/shared/embed/crabAudioEmbed.jsx
    extensions/chrome/src/shared/embed/crabArticleEmbed.jsx
    extensions/chrome/src/shared/embed/crabPostEmbed.jsx
    extensions/chrome/src/shared/embed/crabCommentEmbed.jsx
    extensions/chrome/src/shared/manifest/manifestDrafts.js
    extensions/chrome/src/shared/manifest/manifestForm.jsx
    extensions/chrome/src/shared/manifest/manifestSections.jsx
    extensions/chrome/src/shared/manifest/manifestPreview.jsx
    extensions/chrome/src/shared/manifest/renditionGroups.js
    extensions/chrome/src/shared/manifest/linkedAssets.js
    extensions/chrome/src/shared/manifest/versionHistory.js
    extensions/chrome/src/shared/manifest/rightsPolicy.js
    extensions/chrome/src/shared/manifest/accessPolicy.js
    extensions/chrome/src/shared/manifest/economicsPolicy.js
    extensions/chrome/src/shared/manifest/provenance.js
    extensions/chrome/src/shared/theme/themeStore.js
    extensions/chrome/src/shared/theme/ThemeProvider.jsx
    extensions/chrome/src/shared/utils/crabUrl.js
    extensions/chrome/src/shared/utils/b3.js
    extensions/chrome/src/shared/utils/clipboard.js
    extensions/chrome/src/shared/utils/dom.js
    extensions/chrome/src/shared/utils/events.js
    extensions/chrome/src/shared/utils/format.js
    extensions/chrome/src/shared/utils/nonce.js
    extensions/chrome/src/shared/utils/validation.js
    extensions/chrome/src/shared/utils/viewMode.js
    extensions/chrome/src/legacy/page-legacy-bridge.js
  )

  local components=(
    extensions/chrome/src/shared/components/ActionBar.jsx
    extensions/chrome/src/shared/components/Badge.jsx
    extensions/chrome/src/shared/components/Button.jsx
    extensions/chrome/src/shared/components/Card.jsx
    extensions/chrome/src/shared/components/CopyButton.jsx
    extensions/chrome/src/shared/components/EmptyState.jsx
    extensions/chrome/src/shared/components/ErrorPanel.jsx
    extensions/chrome/src/shared/components/Field.jsx
    extensions/chrome/src/shared/components/FilePicker.jsx
    extensions/chrome/src/shared/components/JsonPreview.jsx
    extensions/chrome/src/shared/components/LoadingState.jsx
    extensions/chrome/src/shared/components/Modal.jsx
    extensions/chrome/src/shared/components/PageHeader.jsx
    extensions/chrome/src/shared/components/SegmentedControl.jsx
    extensions/chrome/src/shared/components/StatChip.jsx
    extensions/chrome/src/shared/components/TextArea.jsx
    extensions/chrome/src/shared/components/TextInput.jsx
    extensions/chrome/src/shared/components/Toggle.jsx
    extensions/chrome/src/shared/components/TruthBoundary.jsx
  )

  local pages=(
    extensions/chrome/src/pages/site/SitePage.jsx
    extensions/chrome/src/pages/site/SiteCreate.jsx
    extensions/chrome/src/pages/site/SiteRender.jsx
    extensions/chrome/src/pages/site/SiteManifestDrawer.jsx
    extensions/chrome/src/pages/site/SiteCreatorProof.jsx
    extensions/chrome/src/pages/site/SiteRootUpload.jsx
    extensions/chrome/src/pages/image/ImagePage.jsx
    extensions/chrome/src/pages/image/ImageCreate.jsx
    extensions/chrome/src/pages/image/ImagePreview.jsx
    extensions/chrome/src/pages/image/ImageRenditions.jsx
    extensions/chrome/src/pages/image/ImageManifest.jsx
    extensions/chrome/src/pages/profile/ProfilePage.jsx
    extensions/chrome/src/pages/profile/ProfileHome.jsx
    extensions/chrome/src/pages/profile/ProfileEditor.jsx
    extensions/chrome/src/pages/profile/ProfileAvatar.jsx
    extensions/chrome/src/pages/profile/ProfileGateway.jsx
    extensions/chrome/src/pages/profile/ProfileAssets.jsx
    extensions/chrome/src/pages/profile/AltVault.jsx
    extensions/chrome/src/pages/music/MusicPage.jsx
    extensions/chrome/src/pages/music/MusicDraft.jsx
    extensions/chrome/src/pages/music/MusicRights.jsx
    extensions/chrome/src/pages/music/MusicLinkedAssets.jsx
    extensions/chrome/src/pages/lyrics/LyricsPage.jsx
    extensions/chrome/src/pages/lyrics/LyricsDraft.jsx
    extensions/chrome/src/pages/article/ArticlePage.jsx
    extensions/chrome/src/pages/article/ArticleDraft.jsx
    extensions/chrome/src/pages/post/PostPage.jsx
    extensions/chrome/src/pages/post/PostDraft.jsx
    extensions/chrome/src/pages/comment/CommentPage.jsx
    extensions/chrome/src/pages/comment/CommentDraft.jsx
    extensions/chrome/src/pages/video/VideoPage.jsx
    extensions/chrome/src/pages/video/VideoDraft.jsx
    extensions/chrome/src/pages/video/VideoRenditions.jsx
    extensions/chrome/src/pages/stream/StreamPage.jsx
    extensions/chrome/src/pages/stream/StreamDraft.jsx
    extensions/chrome/src/pages/stream/StreamPodcastMode.jsx
    extensions/chrome/src/pages/podcast/PodcastPage.jsx
    extensions/chrome/src/pages/podcast/PodcastDraft.jsx
    extensions/chrome/src/pages/ad/AdPage.jsx
    extensions/chrome/src/pages/ad/AdCampaignDraft.jsx
    extensions/chrome/src/pages/ad/AdCreativePreview.jsx
    extensions/chrome/src/pages/algo/AlgoPage.jsx
    extensions/chrome/src/pages/algo/AlgoDraft.jsx
    extensions/chrome/src/pages/algo/AlgoTransparency.jsx
    extensions/chrome/src/pages/code/CodePage.jsx
    extensions/chrome/src/pages/code/CodeDraft.jsx
    extensions/chrome/src/pages/code/CodeFacet.jsx
    extensions/chrome/src/pages/code/FacetContractPreview.jsx
    extensions/chrome/src/pages/game/GamePage.jsx
    extensions/chrome/src/pages/game/GameDraft.jsx
    extensions/chrome/src/pages/game/GameAssets.jsx
    extensions/chrome/src/pages/asset/AssetPage.jsx
    extensions/chrome/src/pages/asset/AssetResolver.jsx
    extensions/chrome/src/pages/asset/AssetHydratedView.jsx
    extensions/chrome/src/pages/notFound/NotFoundPage.jsx
    extensions/chrome/src/pages/problem/ProblemPage.jsx
  )

  local css_files=(
    extensions/chrome/src/styles.css
    extensions/chrome/src/page.css
    extensions/chrome/src/pages/home/home.css
    extensions/chrome/src/pages/site/site.css
    extensions/chrome/src/pages/image/image.css
    extensions/chrome/src/pages/profile/profile.css
    extensions/chrome/src/pages/music/music.css
    extensions/chrome/src/pages/lyrics/lyrics.css
    extensions/chrome/src/pages/article/article.css
    extensions/chrome/src/pages/post/post.css
    extensions/chrome/src/pages/comment/comment.css
    extensions/chrome/src/pages/video/video.css
    extensions/chrome/src/pages/stream/stream.css
    extensions/chrome/src/pages/podcast/podcast.css
    extensions/chrome/src/pages/ad/ad.css
    extensions/chrome/src/pages/algo/algo.css
    extensions/chrome/src/pages/code/code.css
    extensions/chrome/src/pages/game/game.css
    extensions/chrome/src/pages/asset/asset.css
    extensions/chrome/src/pages/notFound/notFound.css
    extensions/chrome/src/pages/problem/problem.css
  )

  local script_files=(
    scripts/check-chrome.sh
    scripts/green-gate-local.sh
    scripts/make_codebundle.sh
    scripts/package-chrome.sh
    scripts/smoke-first-run-profile.sh
    scripts/smoke-local-gateway.sh
    scripts/smoke-profile-gateway.sh
    scripts/smoke-site-create-local.sh
  )

  local png_files=(
    extensions/chrome/assets/icons/icon16.png
    extensions/chrome/assets/icons/icon32.png
    extensions/chrome/assets/icons/icon48.png
    extensions/chrome/assets/icons/icon128.png
    extensions/chrome/assets/icons/logo.png
  )

  local file

  for file in "${schemas[@]}"; do
    write_json_schema_stub "$file"
  done

  for file in "${fixtures[@]}"; do
    write_json_fixture_stub "$file"
  done

  for file in "${js_files[@]}"; do
    case "$file" in
      *.jsx) write_jsx_stub "$file" ;;
      *) write_js_stub "$file" ;;
    esac
  done

  for file in "${components[@]}"; do
    write_jsx_stub "$file"
  done

  for file in "${pages[@]}"; do
    write_jsx_stub "$file"
  done

  for file in "${css_files[@]}"; do
    write_css_stub "$file"
  done

  for file in "${script_files[@]}"; do
    write_script_stub "$file"
  done

  for file in "${png_files[@]}"; do
    write_png_placeholder "$file"
  done
}

main() {
  say "CrabLink refactor scaffold"
  say "root: $ROOT"
  say "overwrite scaffoldable text files: $OVERWRITE"
  say ""

  create_directories
  write_root_files
  write_docs
  write_chrome_shell_files
  write_app_core
  write_shell_files
  write_home_page
  write_theme_and_styles
  write_special_shared_files
  create_from_lists

  say ""
  say "Scaffold complete."
  say "created: $CREATED"
  say "updated: $UPDATED"
  say "skipped: $SKIPPED"
  say ""
  say "Next recommended checks:"
  say "  bash -n scripts/scaffold_crablink_refactor.sh"
  say "  scripts/check-chrome.sh"
  say "  scripts/package-chrome.sh"
  say "  scripts/make_codebundle.sh"
}

main "$@"
