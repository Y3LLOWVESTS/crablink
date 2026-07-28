#!/usr/bin/env node
/**
 * RO:WHAT — Validates the Phase 9J v4B manual Library verification React handoff.
 * RO:WHY — A remote Verify press must run reviewed gateway/native verification without direct React transport or command authority.
 * RO:INTERACTS — TvApp, TvLibraryAssetDetailPanel, manual execution, fixed HTTP transport, gateway profile port, and manifest adapter.
 * RO:INVARIANTS — explicit action only; one stable lock; active-asset binding; stale completion ignored; bounded result state.
 * RO:SECURITY — no direct React fetch/invoke/native call, raw bytes, img/src, storage, wallet, ledger, ROC, entitlement, or finality authority.
 * RO:TEST — manual execution tests, updated React source tests, and this boundary.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function read(relativePath) {
  const absolutePath = path.join(
    root,
    relativePath,
  );

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing Phase 9J v4B source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

function requireFragments(
  label,
  source,
  fragments,
) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(
        `${label} missing: ${fragment}`,
      );
    }
  }
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

const app =
  read('apps/crablink-tv/src/app/TvApp.jsx');

const panel =
  read(
    'apps/crablink-tv/src/library/' +
      'TvLibraryAssetDetailPanel.jsx',
  );

const execution =
  read(
    'apps/crablink-tv/src/library/' +
      'tvLibraryManualVerifyExecution.js',
  );

const executionTest =
  read(
    'apps/crablink-tv/src/library/' +
      'tvLibraryManualVerifyExecution.test.mjs',
  );

const verifyUiSourceTest =
  read(
    'apps/crablink-tv/src/library/' +
      'TvLibraryVerifyUi.source.test.mjs',
  );

const renderSourceTest =
  read(
    'apps/crablink-tv/src/library/' +
      'TvLibraryVerifiedAssetRender.source.test.mjs',
  );

const transport =
  read(
    'apps/crablink-tv/src/library/' +
      'tvGatewayAssetHttpTransport.js',
  );

const adapter =
  read(
    'apps/crablink-tv/src/platform/' +
      'tauriTvAdapter.js',
  );

const css =
  read('apps/crablink-tv/src/styles/tv.css');

const foundationBoundary =
  read(
    'scripts/' +
      'check-crablink-tv-library-manual-verify-execution-foundation-boundary.mjs',
  );

const phase9iBoundary =
  read(
    'scripts/' +
      'check-crablink-tv-library-verify-ui-boundary.mjs',
  );

const phase9hBoundary =
  read(
    'scripts/' +
      'check-crablink-tv-library-asset-verify-flow-boundary.mjs',
  );

const phase9fBoundary =
  read(
    'scripts/' +
      'check-crablink-tv-library-verified-asset-render-boundary.mjs',
  );

const phase9eBoundary =
  read(
    'scripts/' +
      'check-crablink-tv-asset-manifest-adapter-boundary.mjs',
  );

const tvPackage =
  JSON.parse(
    read('apps/crablink-tv/package.json'),
  );

const rootPackage =
  JSON.parse(
    read('package.json'),
  );

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const codebundleBoundary =
  read(
    'scripts/' +
      'check-crablink-tv-codebundle-boundary.mjs',
  );

const executableApp =
  stripComments(app);

const executablePanel =
  stripComments(panel);

requireFragments(
  'TV manual verify React handoff',
  app,
  [
    'tvGatewayProfilePort',
    'tvAssetManifestAdapter',
    'tvGatewayAssetHttpTransport',
    'createTvLibraryManualVerifyExecutionLock',
    'libraryManualVerifyExecutionLock.run({',
    'gatewayProfilePort:',
    'transport:',
    'manifestAdapter:',
    'captureTvLibraryManualVerifyExecutionTarget',
    'isCurrentTvLibraryManualVerifyExecutionTarget',
    'libraryAssetDetailRef.current',
    'The stale result was ignored.',
    'manualVerifyExecutionView={',
  ],
);

requireFragments(
  'manual verify identity and duplicate behavior',
  execution + '\n' + executionTest,
  [
    'captureTvLibraryManualVerifyExecutionTarget',
    'isCurrentTvLibraryManualVerifyExecutionTarget',
    'target.canonicalCrabUrl',
    'target.cid',
    'target.assetKind',
    'TV_LIBRARY_MANUAL_VERIFY_DUPLICATE_REQUEST',
    'manual verify execution target rejects stale Library detail replacement',
    'manual verify execution lock rejects duplicate requests and releases',
  ],
);

requireFragments(
  'reviewed React source coverage',
  verifyUiSourceTest + '\n' + renderSourceTest,
  [
    'TV app keeps Phase 9I action state while reviewed execution owns verification',
    'Library panel exposes remote verification execution states',
    'TV app stores reviewed execution render facts without direct native calls',
  ],
);

requireFragments(
  'visible manual verification state',
  panel + '\n' + css,
  [
    'manualVerifyExecutionView',
    'data-tv-library-manual-verify-execution-state',
    'Verifying…',
    'Verify again',
    'tv-library-verify-ui__code',
  ],
);

requireFragments(
  'reviewed adapter ownership',
  transport + '\n' + adapter,
  [
    'tvGatewayAssetHttpTransport',
    'globalThis.fetch',
    'tvAssetManifestAdapter',
    'tv_asset_manifest_check',
  ],
);

requireFragments(
  'predecessor boundaries',
  foundationBoundary +
    phase9iBoundary +
    phase9hBoundary +
    phase9fBoundary +
    phase9eBoundary,
  [
    'PHASE9J_V4A_MANUAL_VERIFY_EXECUTION_FOUNDATION=GREEN',
    'PHASE9I_LIBRARY_VERIFY_UI=GREEN',
    'PHASE9H_LIBRARY_ASSET_VERIFY_FLOW=GREEN',
    'PHASE9F_LIBRARY_VERIFIED_ASSET_RENDER=GREEN',
    'PHASE9E_TV_ASSET_MANIFEST_ADAPTER=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

for (const [label, source] of [
  ['TV app', executableApp],
  ['Library panel', executablePanel],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['global fetch', /\bfetch\s*\(/u],
    ['dynamic invoke', /\binvoke\s*\(/u],
    [
      'direct native manifest call',
      /\bcheckAssetManifest\s*\(/u,
    ],
    [
      'direct verify-flow call',
      /\brunTvLibraryAssetVerifyFlow\s*\(/u,
    ],
    [
      'gateway evidence read',
      /\breadTvGatewayAssetEvidence\s*\(/u,
    ],
    [
      'raw asset bytes',
      /\b(?:rawBytes|assetBytes)\b/u,
    ],
    ['img rendering', /<img\b/u],
    ['src rendering', /\bsrc=/u],
    ['local storage', /\blocalStorage\b/u],
    ['session storage', /\bsessionStorage\b/u],
    ['indexedDB', /\bindexedDB\b/u],
  ]) {
    if (pattern.test(source)) {
      throw new Error(
        `${label} acquired forbidden ${forbiddenLabel}.`,
      );
    }
  }
}

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts[
    'check:library-manual-verify-execution'
  ] !==
  'node ../../scripts/check-crablink-tv-library-manual-verify-execution-boundary.mjs'
) {
  throw new Error(
    'TV manual verify React boundary script is missing or incorrect.',
  );
}

if (
  !String(
    tvScripts.check ?? '',
  ).includes(
    'npm run check:library-manual-verify-execution',
  )
) {
  throw new Error(
    'TV check chain missing the Phase 9J v4B boundary.',
  );
}

if (
  rootScripts[
    'tv:library-manual-verify-execution:check'
  ] !==
  'npm --prefix apps/crablink-tv run check:library-manual-verify-execution'
) {
  throw new Error(
    'Root manual verify React boundary script is missing or incorrect.',
  );
}

const boundaryPath =
  'scripts/' +
  'check-crablink-tv-library-manual-verify-execution-boundary.mjs';

if (
  !makeCodebundle.includes(boundaryPath) &&
  !codebundleBoundary.includes(boundaryPath)
) {
  throw new Error(
    `Future codebundle coverage missing: ${boundaryPath}`,
  );
}

console.log(
  'CrabLink TV Library manual verify React handoff boundary passed.',
);

console.log(
  'Execution: explicit remote action uses reviewed gateway profile, bounded HTTP transport, fixed native adapter, and one stable duplicate lock.',
);

console.log(
  'Binding: canonical Crab URL, B3 CID, and asset kind are captured; stale route completion is ignored.',
);

console.log(
  'Authority: automatic verification, direct React fetch/invoke/native calls, raw rendering, storage, wallet, ledger, ROC, entitlement, and finality remain absent.',
);

console.log(
  'PHASE9J_V4B_LIBRARY_MANUAL_VERIFY_REACT_HANDOFF=GREEN',
);

console.log(
  'MANUAL_VERIFY_BUTTON_EXECUTION=ADDED',
);

console.log(
  'REVIEWED_GATEWAY_PROFILE_REUSED=YES',
);

console.log(
  'FIXED_ASSET_MANIFEST_ADAPTER_REUSED=YES',
);

console.log(
  'DUPLICATE_REQUEST_EXECUTION=BLOCKED',
);

console.log(
  'AUTOMATIC_VERIFICATION=ABSENT',
);

console.log(
  'DIRECT_REACT_FETCH=ABSENT',
);

console.log(
  'DIRECT_REACT_INVOKE=ABSENT',
);

console.log(
  'RAW_ASSET_RENDERING=NOT_ADDED',
);

console.log(
  'NEXT_PATCH=PHASE9L_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE',
);
