#!/usr/bin/env node
/**
 * RO:WHAT — Validates CrabLink TV Phase 9I manual Library verify UI.
 * RO:WHY — The TV Library needs a visible, remote-focusable manual verify action before execution wiring.
 * RO:INTERACTS — tvLibraryVerifyUiModel, TvLibraryAssetDetailPanel, TvApp, and Phase 9H verify-flow boundary.
 * RO:INVARIANTS — UI state is bound to the active Library asset detail and cannot fabricate verified render facts.
 * RO:SECURITY — no auto-run, global fetch, React native invoke, storage, img/src rendering, raw bytes, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — node scripts/check-crablink-tv-library-verify-ui-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root =
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
  );

function read(relativePath) {
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing Phase 9I source: ${relativePath}`,
    );
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing: ${fragment}`);
    }
  }
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

const model =
  read('apps/crablink-tv/src/library/tvLibraryVerifyUiModel.js');

const modelTest =
  read('apps/crablink-tv/src/library/tvLibraryVerifyUiModel.test.mjs');

const sourceTest =
  read('apps/crablink-tv/src/library/TvLibraryVerifyUi.source.test.mjs');

const panel =
  read('apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx');

const app =
  read('apps/crablink-tv/src/app/TvApp.jsx');

const css =
  read('apps/crablink-tv/src/styles/tv.css');

const phase9hBoundary =
  read('scripts/check-crablink-tv-library-asset-verify-flow-boundary.mjs');

const phase9gBoundary =
  read('scripts/check-crablink-tv-gateway-asset-fetch-boundary.mjs');

const phase9fBoundary =
  read('scripts/check-crablink-tv-library-verified-asset-render-boundary.mjs');

const phase9eBoundary =
  read('scripts/check-crablink-tv-asset-manifest-adapter-boundary.mjs');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const codebundleBoundary =
  read('scripts/check-crablink-tv-codebundle-boundary.mjs');

const executableModel =
  stripComments(model);

const executablePanel =
  stripComments(panel);

const executableApp =
  stripComments(app);

requireFragments(
  'Library verify UI model',
  model,
  [
    'TV_LIBRARY_VERIFY_UI_SCHEMA',
    'TV_LIBRARY_VERIFY_UI_STATE',
    'createIdleTvLibraryVerifyUiView',
    'projectTvLibraryVerifyUiView',
    'requestTvLibraryVerifyUiView',
    'TV_LIBRARY_ASSET_DETAIL_KIND.READY',
    'TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.READY',
    'canRequest',
  ],
);

requireFragments(
  'Library verify UI model tests',
  modelTest,
  [
    'verify UI constants and idle view are explicit and immutable',
    'verify UI is ready for reviewed image assets without verified render facts',
    'verify UI is ready for reviewed article assets after rejected render facts',
    'verify UI blocks unsupported or already verified assets',
    'verify UI request moves only a ready view into requested state',
  ],
);

requireFragments(
  'Library verify UI source tests',
  sourceTest,
  [
    'verify UI model remains action eligibility state only',
    'Library panel exposes remote verification execution states',
    'TV app keeps Phase 9I action state while reviewed execution owns verification',
    'verify UI CSS exposes visible TV surfaces',
  ],
);

requireFragments(
  'Library detail panel verify UI',
  panel,
  [
    'verifyUiView',
    'onVerifyAsset',
    'tv-library-verify-ui',
    'data-tv-library-verify-ui-state',
    'library-asset-verify',
    'Manual verification',
    'Verify asset',
  ],
);

requireFragments(
  'TV app verify UI state',
  app,
  [
    'createIdleTvLibraryVerifyUiView',
    'projectTvLibraryVerifyUiView',
    'requestTvLibraryVerifyUiView',
    'libraryVerifyUiView',
    'requestLibraryAssetVerification',
    'verifyUiView={libraryVerifyUiView}',
    'onVerifyAsset={requestLibraryAssetVerification}',
  ],
);

requireFragments(
  'Phase 9H successor marker',
  phase9hBoundary,
  [
    'PHASE9H_LIBRARY_ASSET_VERIFY_FLOW=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

requireFragments(
  'Phase 9G successor marker',
  phase9gBoundary,
  [
    'PHASE9G_TV_GATEWAY_ASSET_FETCH=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

requireFragments(
  'Phase 9F successor marker',
  phase9fBoundary,
  [
    'PHASE9F_LIBRARY_VERIFIED_ASSET_RENDER=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

requireFragments(
  'Phase 9E successor marker',
  phase9eBoundary,
  [
    'PHASE9E_TV_ASSET_MANIFEST_ADAPTER=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

for (const [label, source] of [
  ['Library verify UI model', executableModel],
  ['Library detail panel executable surface', executablePanel],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['verify flow execution', /\brunTvLibraryAssetVerifyFlow\s*\(/u],
    ['gateway request projection execution', /\bprojectTvGatewayAssetFetchRequest\s*\(/u],
    ['gateway evidence read execution', /\breadTvGatewayAssetEvidence\s*\(/u],
    ['native manifest check execution', /\bcheckAssetManifest\s*\(/u],
    ['dynamic invoke', /\binvoke\s*\(/u],
    ['global fetch', /\bfetch\s*\(/u],
    ['local storage', /\blocalStorage\b/u],
    ['session storage', /\bsessionStorage\b/u],
    ['indexedDB', /\bindexedDB\b/u],
    ['raw bytes', /\b(?:rawBytes|assetBytes)\b/u],
    ['img rendering', /<img\b/u],
    ['src rendering', /\bsrc=/u],
    ['wallet authority', /\bwallet\b/iu],
    ['ledger authority', /\bledger\b/iu],
    ['receipt authority', /\breceipt\b/iu],
    ['reward authority', /\breward\b/iu],
    ['ROC authority', /\broc\b/iu],
    ['entitlement authority', /\bentitlement\b/iu],
    ['finality authority', /\bfinality\b/iu],
  ]) {
    if (pattern.test(source)) {
      throw new Error(
        `${label} acquired forbidden ${forbiddenLabel}.`,
      );
    }
  }
}

for (const [forbiddenLabel, pattern] of [
  ['verify flow execution', /\brunTvLibraryAssetVerifyFlow\s*\(/u],
  ['gateway request projection execution', /\bprojectTvGatewayAssetFetchRequest\s*\(/u],
  ['gateway evidence read execution', /\breadTvGatewayAssetEvidence\s*\(/u],
  ['native manifest check execution', /\bcheckAssetManifest\s*\(/u],
  ['dynamic invoke', /\binvoke\s*\(/u],
  ['global fetch', /\bfetch\s*\(/u],
  ['local storage', /\blocalStorage\b/u],
  ['session storage', /\bsessionStorage\b/u],
  ['indexedDB', /\bindexedDB\b/u],
  ['raw bytes', /\b(?:rawBytes|assetBytes)\b/u],
  ['img rendering', /<img\b/u],
  ['src rendering', /\bsrc=/u],
]) {
  if (pattern.test(executableApp)) {
    throw new Error(
      `TV app executable surface acquired forbidden Phase 9I behavior: ${forbiddenLabel}.`,
    );
  }
}

for (const selector of [
  '.tv-library-verify-ui',
  '.tv-library-verify-ui__status',
  '.tv-library-verify-ui__message',
  '.tv-library-asset-detail__actions',
]) {
  if (!css.includes(selector)) {
    throw new Error(
      `TV CSS missing verify UI selector: ${selector}`,
    );
  }
}

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts['test:library-verify-ui'] !==
  'node --test src/library/tvLibraryVerifyUiModel.test.mjs'
) {
  throw new Error(
    'TV Library verify UI model test script is missing or incorrect.',
  );
}

if (
  tvScripts['test:library-verify-ui-source'] !==
  'node --test src/library/TvLibraryVerifyUi.source.test.mjs'
) {
  throw new Error(
    'TV Library verify UI source test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:library-verify-ui'] !==
  'node ../../scripts/check-crablink-tv-library-verify-ui-boundary.mjs'
) {
  throw new Error(
    'TV Library verify UI boundary script is missing or incorrect.',
  );
}

for (const step of [
  'npm run test:library-verify-ui',
  'npm run test:library-verify-ui-source',
  'npm run check:library-verify-ui',
]) {
  if (!String(tvScripts.check ?? '').includes(step)) {
    throw new Error(
      `TV check chain does not include ${step}.`,
    );
  }
}

if (
  rootScripts['tv:library-verify-ui:test'] !==
  'npm --prefix apps/crablink-tv run test:library-verify-ui'
) {
  throw new Error(
    'Root Library verify UI model test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:library-verify-ui-source:test'] !==
  'npm --prefix apps/crablink-tv run test:library-verify-ui-source'
) {
  throw new Error(
    'Root Library verify UI source test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:library-verify-ui:check'] !==
  'npm --prefix apps/crablink-tv run check:library-verify-ui'
) {
  throw new Error(
    'Root Library verify UI boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/library/tvLibraryVerifyUiModel.js',
  'apps/crablink-tv/src/library/tvLibraryVerifyUiModel.test.mjs',
  'apps/crablink-tv/src/library/TvLibraryVerifyUi.source.test.mjs',
  'scripts/check-crablink-tv-library-verify-ui-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV Library verify UI boundary passed.',
);

console.log(
  'UI: reviewed image/article Library assets expose a remote-focusable manual verify control.',
);

console.log(
  'Authority: the Phase 9I model remains action eligibility only; reviewed manual execution is owned by Phase 9J.',
);

console.log(
  'Isolation: no automatic verification, direct fetch, React native invoke, img/src rendering, raw bytes, storage, wallet, ledger, receipt, reward, ROC, entitlement, or finality behavior is owned by Phase 9I.',
);

console.log(
  'PHASE9I_LIBRARY_VERIFY_UI=GREEN',
);

console.log(
  'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
);
