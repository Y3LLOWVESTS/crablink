#!/usr/bin/env node
/**
 * RO:WHAT — Validates Phase 9P Library verified article render surface.
 * RO:WHY — Phase 9 must close with both image and article/text verified render surfaces.
 * RO:INTERACTS — article render model/component, Library detail panel, TvApp state, and Phase 9O boundary.
 * RO:INVARIANTS — only ready verified article/text bytes decode; rendered text never uses unsafe HTML injection.
 * RO:SECURITY — no direct fetch, invoke, Blob construction, object URL authority, storage, or economic authority.
 * RO:TEST — npm --prefix apps/crablink-tv run check:library-verified-article-render-surface.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root =
  path.resolve(
    path.dirname(
      fileURLToPath(import.meta.url),
    ),
    '..',
  );

function read(relativePath) {
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing Phase 9P source: ${relativePath}`,
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
  read('apps/crablink-tv/src/library/tvLibraryVerifiedArticleRenderSurfaceModel.js');

const modelTest =
  read('apps/crablink-tv/src/library/tvLibraryVerifiedArticleRenderSurfaceModel.test.mjs');

const component =
  read('apps/crablink-tv/src/library/TvLibraryVerifiedArticleRenderSurface.jsx');

const sourceTest =
  read('apps/crablink-tv/src/library/TvLibraryVerifiedArticleRenderSurface.source.test.mjs');

const panel =
  read('apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx');

const app =
  read('apps/crablink-tv/src/app/TvApp.jsx');

const css =
  read('apps/crablink-tv/src/styles/tv.css');

const phase9oBoundary =
  read('scripts/check-crablink-tv-library-verified-image-object-url-execution-boundary.mjs');

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

const executableComponent =
  stripComments(component);

const executablePanel =
  stripComments(panel);

const executableApp =
  stripComments(app);

requireFragments(
  'verified article render surface model',
  model,
  [
    'TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_SCHEMA',
    'projectTvLibraryVerifiedArticleRenderSurface',
    'TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE.READY',
    'TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.ARTICLE_READER',
    'TextDecoder',
    'contentLength !== byteLength',
    'paragraphsFromText',
  ],
);

requireFragments(
  'verified article render component',
  component,
  [
    'TvLibraryVerifiedArticleRenderSurface',
    'renderSurfaceView.paragraphs.map',
    'tv-library-verified-article-surface__reader',
    'tv-library-verified-article-surface__paragraph',
    '{paragraph}',
  ],
);

requireFragments(
  'verified article render tests',
  modelTest + '\n' + sourceTest,
  [
    'verified article render surface decodes bounded verified text bytes',
    'verified article render surface renders html-like input as text paragraphs only',
    'verified article render surface accepts json article bytes as visible text',
    'verified article render surface rejects non-article and mismatched bytes',
    'verified article surface component renders text nodes without unsafe HTML',
  ],
);

requireFragments(
  'Library panel article render wiring',
  panel,
  [
    'TvLibraryVerifiedArticleRenderSurface',
    'articleRenderSurfaceView',
  ],
);

requireFragments(
  'TV app article render state',
  app,
  [
    'createIdleTvLibraryVerifiedArticleRenderSurface',
    'libraryVerifiedArticleRenderSurfaceView',
    'setLibraryVerifiedArticleRenderSurfaceView',
    'articleRenderSurfaceView={libraryVerifiedArticleRenderSurfaceView}',
  ],
);

requireFragments(
  'Phase 9O predecessor boundary',
  phase9oBoundary,
  [
    'PHASE9O_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION=GREEN',
    'NEXT_PATCH=PHASE9P_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE',
  ],
);

requireFragments(
  'verified article render CSS',
  css,
  [
    '.tv-library-verified-article-surface',
    '.tv-library-verified-article-surface__reader',
    '.tv-library-verified-article-surface__paragraph',
    '.tv-library-verified-article-surface__placeholder',
  ],
);

for (const [label, source] of [
  ['verified article render model', executableModel],
  ['verified article render component', executableComponent],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['global fetch', /\bfetch\s*\(/u],
    ['dynamic invoke', /\binvoke\s*\(/u],
    ['object URL creation', /\bURL\.createObjectURL\b|\bcreateObjectURL\s*\(/u],
    ['object URL revocation', /\bURL\.revokeObjectURL\b|\brevokeObjectURL\s*\(/u],
    ['Blob construction', /\bnew\s+Blob\b/u],
    ['unsafe HTML injection', /\bdangerouslySetInnerHTML\b|\binnerHTML\b/u],
    ['local storage', /\blocalStorage\b/u],
    ['session storage', /\bsessionStorage\b/u],
    ['indexedDB', /\bindexedDB\b/u],
    ['wallet language', /\bwallet\b/u],
    ['ledger language', /\bledger\b/u],
    ['ROC language', /\bROC\b/u],
    ['entitlement language', /\bentitlement\b/u],
    ['finality language', /\bfinality\b/u],
  ]) {
    if (pattern.test(source)) {
      throw new Error(
        `${label} acquired forbidden ${forbiddenLabel}.`,
      );
    }
  }
}

for (const [label, source] of [
  ['Library detail panel', executablePanel],
  ['TV app', executableApp],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['unsafe HTML injection', /\bdangerouslySetInnerHTML\b|\binnerHTML\b/u],
    ['object URL creation', /\bURL\.createObjectURL\b|\bcreateObjectURL\s*\(/u],
    ['object URL revocation', /\bURL\.revokeObjectURL\b|\brevokeObjectURL\s*\(/u],
    ['Blob construction', /\bnew\s+Blob\b/u],
    ['global fetch', /\bfetch\s*\(/u],
    ['dynamic invoke', /\binvoke\s*\(/u],
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
    'test:library-verified-article-render-surface'
  ] !==
  'node --test src/library/tvLibraryVerifiedArticleRenderSurfaceModel.test.mjs'
) {
  throw new Error(
    'TV article render surface model test script is missing or incorrect.',
  );
}

if (
  tvScripts[
    'test:library-verified-article-render-surface-source'
  ] !==
  'node --test src/library/TvLibraryVerifiedArticleRenderSurface.source.test.mjs'
) {
  throw new Error(
    'TV article render surface source test script is missing or incorrect.',
  );
}

if (
  tvScripts[
    'check:library-verified-article-render-surface'
  ] !==
  'node ../../scripts/check-crablink-tv-library-verified-article-render-surface-boundary.mjs'
) {
  throw new Error(
    'TV article render surface boundary script is missing or incorrect.',
  );
}

for (const step of [
  'npm run test:library-verified-article-render-surface',
  'npm run test:library-verified-article-render-surface-source',
  'npm run check:library-verified-article-render-surface',
]) {
  if (!String(tvScripts.check ?? '').includes(step)) {
    throw new Error(
      `TV check chain missing ${step}.`,
    );
  }
}

if (
  rootScripts[
    'tv:library-verified-article-render-surface:check'
  ] !==
  'npm --prefix apps/crablink-tv run check:library-verified-article-render-surface'
) {
  throw new Error(
    'Root article render surface boundary script is missing or incorrect.',
  );
}

for (const required of [
  'apps/crablink-tv/src/library/tvLibraryVerifiedArticleRenderSurfaceModel.js',
  'apps/crablink-tv/src/library/tvLibraryVerifiedArticleRenderSurfaceModel.test.mjs',
  'apps/crablink-tv/src/library/TvLibraryVerifiedArticleRenderSurface.jsx',
  'apps/crablink-tv/src/library/TvLibraryVerifiedArticleRenderSurface.source.test.mjs',
  'scripts/check-crablink-tv-library-verified-article-render-surface-boundary.mjs',
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
  'CrabLink TV Library verified article render surface boundary passed.',
);

console.log(
  'Surface: ready verified article bytes decode into bounded React text nodes.',
);

console.log(
  'Isolation: article rendering does not fetch, invoke, construct Blob, create object URLs, or use unsafe HTML injection.',
);

console.log(
  'Authority: wallet, ledger, ROC, entitlement, and finality remain absent.',
);

console.log(
  'PHASE9P_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE=GREEN',
);

console.log(
  'ARTICLE_RENDER_SURFACE=ADDED',
);

console.log(
  'TEXT_DECODING_BOUNDARY=ADDED',
);

console.log(
  'UNSAFE_HTML_INJECTION=ABSENT',
);

console.log(
  'CORRUPT_OR_MISMATCHED_TEXT_BYTES_REJECTED=YES',
);

console.log(
  'NEXT_PATCH=PHASE9_FINAL_ACCEPTANCE',
);
