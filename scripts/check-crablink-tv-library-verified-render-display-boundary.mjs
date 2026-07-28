#!/usr/bin/env node
/**
 * RO:WHAT — Validates Phase 9K Library verified render display surfaces.
 * RO:WHY — Verified image/article assets need distinct visible TV surfaces without direct byte/render authority.
 * RO:INTERACTS — tvLibraryVerifiedRenderDisplayModel, TvLibraryAssetDetailPanel, CSS, and Phase 9J manual execution boundary.
 * RO:INVARIANTS — display requires verified render facts and active identifier match; byte render lifecycle remains deferred.
 * RO:SECURITY — no direct React fetch, invoke, provider fallback, img/src, object URL, wallet, ledger, ROC, entitlement, or finality behavior.
 * RO:TEST — model tests, source tests, and this boundary.
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
      `Missing Phase 9K source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(
        `${label} missing: ${fragment}`,
      );
    }
  }
}

const model =
  read(
    'apps/crablink-tv/src/library/' +
      'tvLibraryVerifiedRenderDisplayModel.js',
  );

const modelTest =
  read(
    'apps/crablink-tv/src/library/' +
      'tvLibraryVerifiedRenderDisplayModel.test.mjs',
  );

const sourceTest =
  read(
    'apps/crablink-tv/src/library/' +
      'TvLibraryVerifiedRenderDisplay.source.test.mjs',
  );

const panel =
  read(
    'apps/crablink-tv/src/library/' +
      'TvLibraryAssetDetailPanel.jsx',
  );

const css =
  read('apps/crablink-tv/src/styles/tv.css');

const phase9jBoundary =
  read(
    'scripts/' +
      'check-crablink-tv-library-manual-verify-execution-boundary.mjs',
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
    'scripts/check-crablink-tv-codebundle-boundary.mjs',
  );

const executableModel =
  stripComments(model);

const executablePanel =
  stripComments(panel);

requireFragments(
  'verified render display model',
  model + '\n' + modelTest,
  [
    'TV_LIBRARY_VERIFIED_RENDER_DISPLAY_SCHEMA',
    'IMAGE_FRAME',
    'ARTICLE_READER',
    'projectTvLibraryVerifiedRenderDisplay',
    'verifiedRenderView.canonicalCrabUrl',
    'verifiedRenderView.cid',
    'detail.canonicalCrabUrl',
    'detail.cid',
    'verified display projects a distinct image frame surface',
    'verified display projects a distinct article reader surface',
    'verified display rejects stale or mismatched render facts',
  ],
);

requireFragments(
  'verified render display React surface',
  panel + '\n' + sourceTest,
  [
    'verifiedRenderDisplayView',
    'projectTvLibraryVerifiedRenderDisplay',
    'tv-library-verified-display',
    'data-tv-library-verified-display-state',
    'data-tv-library-verified-display-kind',
    'tv-library-verified-display__image-frame',
    'tv-library-verified-display__article-reader',
    'Verified image display',
    'Verified article reader',
  ],
);

requireFragments(
  'verified render display CSS',
  css,
  [
    '.tv-library-verified-display',
    '.tv-library-verified-display__status',
    '.tv-library-verified-display__image-frame',
    '.tv-library-verified-display__image-glyph',
    '.tv-library-verified-display__article-reader',
    '.tv-library-verified-display__article-lines',
  ],
);

requireFragments(
  'Phase 9J predecessor boundary',
  phase9jBoundary,
  [
    'PHASE9J_V4B_LIBRARY_MANUAL_VERIFY_REACT_HANDOFF=GREEN',
    'NEXT_PATCH=PHASE9L_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE',
  ],
);

for (const [label, source] of [
  ['display model', executableModel],
  ['Library panel', executablePanel],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['global fetch', /\bfetch\s*\(/u],
    ['dynamic invoke', /\binvoke\s*\(/u],
    ['native manifest call', /\bcheckAssetManifest\s*\(/u],
    ['verify flow call', /\brunTvLibraryAssetVerifyFlow\s*\(/u],
    ['gateway evidence read', /\breadTvGatewayAssetEvidence\s*\(/u],
    ['object URL creation', /\bcreateObjectURL\s*\(/u],
    ['Blob construction', /\bnew\s+Blob\b/u],
    ['raw image element', /<img\b/u],
    ['src assignment', /\bsrc=/u],
    ['unsafe HTML injection', /\bdangerouslySetInnerHTML\b/u],
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
    'test:library-verified-render-display'
  ] !==
  'node --test src/library/tvLibraryVerifiedRenderDisplayModel.test.mjs'
) {
  throw new Error(
    'TV verified render display model test script is missing or incorrect.',
  );
}

if (
  tvScripts[
    'test:library-verified-render-display-source'
  ] !==
  'node --test src/library/TvLibraryVerifiedRenderDisplay.source.test.mjs'
) {
  throw new Error(
    'TV verified render display source test script is missing or incorrect.',
  );
}

if (
  tvScripts[
    'check:library-verified-render-display'
  ] !==
  'node ../../scripts/check-crablink-tv-library-verified-render-display-boundary.mjs'
) {
  throw new Error(
    'TV verified render display boundary script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run check:library-verified-render-display',
  )
) {
  throw new Error(
    'TV check chain missing Phase 9K verified render display boundary.',
  );
}

if (
  rootScripts[
    'tv:library-verified-render-display:check'
  ] !==
  'npm --prefix apps/crablink-tv run check:library-verified-render-display'
) {
  throw new Error(
    'Root verified render display boundary script is missing or incorrect.',
  );
}

for (const required of [
  'apps/crablink-tv/src/library/tvLibraryVerifiedRenderDisplayModel.js',
  'apps/crablink-tv/src/library/tvLibraryVerifiedRenderDisplayModel.test.mjs',
  'apps/crablink-tv/src/library/TvLibraryVerifiedRenderDisplay.source.test.mjs',
  'scripts/check-crablink-tv-library-verified-render-display-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(required) &&
    !codebundleBoundary.includes(required)
  ) {
    throw new Error(
      `Future codebundle coverage missing: ${required}`,
    );
  }
}

console.log(
  'CrabLink TV Library verified render display boundary passed.',
);

console.log(
  'Display: verified image and article results project distinct ten-foot surfaces.',
);

console.log(
  'Binding: display requires active Library detail identifiers to match verified render facts.',
);

console.log(
  'Authority: direct React fetch, invoke, provider fallback, img/src, object URL creation, raw bytes, wallet, ledger, ROC, entitlement, and finality remain absent.',
);

console.log(
  'PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY=GREEN',
);

console.log(
  'IMAGE_VERIFIED_DISPLAY_SURFACE=ADDED',
);

console.log(
  'ARTICLE_VERIFIED_DISPLAY_SURFACE=ADDED',
);

console.log(
  'IDENTIFIER_BOUND_DISPLAY=YES',
);

console.log(
  'DIRECT_REACT_FETCH=ABSENT',
);

console.log(
  'DIRECT_REACT_INVOKE=ABSENT',
);

console.log(
  'RAW_BYTE_RENDERING=NOT_ADDED',
);

console.log(
  'NEXT_PATCH=PHASE9M_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF',
);