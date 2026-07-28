#!/usr/bin/env node
/**
 * RO:WHAT — Validates Phase 9N Library verified image render surface.
 * RO:WHY — Image rendering must be confined to a verified object URL surface before execution wiring.
 * RO:INTERACTS — image render model/component, Library detail panel, TvApp state, and Phase 9M boundary.
 * RO:INVARIANTS — only active blob object URLs for image content render; app/panel do not create URLs or fetch bytes.
 * RO:SECURITY — no direct fetch, invoke, Blob construction, object URL creation/revocation, storage, or economic authority.
 * RO:TEST — npm --prefix apps/crablink-tv run check:library-verified-image-render-surface.
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
      `Missing Phase 9N source: ${relativePath}`,
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
  read('apps/crablink-tv/src/library/tvLibraryVerifiedImageRenderSurfaceModel.js');

const modelTest =
  read('apps/crablink-tv/src/library/tvLibraryVerifiedImageRenderSurfaceModel.test.mjs');

const component =
  read('apps/crablink-tv/src/library/TvLibraryVerifiedImageRenderSurface.jsx');

const sourceTest =
  read('apps/crablink-tv/src/library/TvLibraryVerifiedImageRenderSurface.source.test.mjs');

const panel =
  read('apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx');

const app =
  read('apps/crablink-tv/src/app/TvApp.jsx');

const css =
  read('apps/crablink-tv/src/styles/tv.css');

const phase9mBoundary =
  read('scripts/check-crablink-tv-library-verified-object-url-handoff-boundary.mjs');

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
  'verified image render surface model',
  model,
  [
    'TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_SCHEMA',
    'TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE',
    'createIdleTvLibraryVerifiedImageRenderSurface',
    'projectTvLibraryVerifiedImageRenderSurface',
    'TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.ACTIVE',
    "objectUrl.startsWith('blob:')",
    "contentType.startsWith('image/')",
  ],
);

requireFragments(
  'verified image render component',
  component,
  [
    'TvLibraryVerifiedImageRenderSurface',
    '<img',
    'src={renderSurfaceView.objectUrl}',
    'alt={renderSurfaceView.altText}',
    'data-tv-library-verified-image-render-state',
    'referrerPolicy="no-referrer"',
  ],
);

requireFragments(
  'verified image render tests',
  modelTest + '\n' + sourceTest,
  [
    'verified image render surface accepts active image object URL handoffs',
    'verified image render surface rejects non-image or invalid object URLs',
    'verified image render component owns the only image tag and binds src to projected object URL',
    'Library panel and app wire the image surface without direct image or object URL authority',
  ],
);

requireFragments(
  'Library panel image render surface wiring',
  panel,
  [
    'TvLibraryVerifiedImageRenderSurface',
    'imageRenderSurfaceView',
  ],
);

requireFragments(
  'TV app image render surface state',
  app,
  [
    'createIdleTvLibraryVerifiedImageRenderSurface',
    'libraryVerifiedImageRenderSurfaceView',
    'setLibraryVerifiedImageRenderSurfaceView',
    'imageRenderSurfaceView={libraryVerifiedImageRenderSurfaceView}',
  ],
);

requireFragments(
  'Phase 9M predecessor boundary',
  phase9mBoundary,
  [
    'PHASE9M_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF=GREEN',
    'NEXT_PATCH=PHASE9O_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION',
  ],
);

requireFragments(
  'verified image render CSS',
  css,
  [
    '.tv-library-verified-image-surface',
    '.tv-library-verified-image-surface__frame',
    '.tv-library-verified-image-surface__image',
    '.tv-library-verified-image-surface__caption',
    '.tv-library-verified-image-surface__placeholder',
  ],
);

for (const [label, source] of [
  ['verified image render model', executableModel],
  ['verified image render component', executableComponent],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['global fetch', /\bfetch\s*\(/u],
    ['dynamic invoke', /\binvoke\s*\(/u],
    ['object URL creation', /\bURL\.createObjectURL\b|\bcreateObjectURL\s*\(/u],
    ['object URL revocation', /\bURL\.revokeObjectURL\b|\brevokeObjectURL\s*\(/u],
    ['Blob construction', /\bnew\s+Blob\b/u],
    ['local storage', /\blocalStorage\b/u],
    ['session storage', /\bsessionStorage\b/u],
    ['indexedDB', /\bindexedDB\b/u],
    ['unsafe HTML injection', /\bdangerouslySetInnerHTML\b/u],
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
    ['raw image element', /<img\b/u],
    ['src assignment', /\bsrc=/u],
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
    'test:library-verified-image-render-surface'
  ] !==
  'node --test src/library/tvLibraryVerifiedImageRenderSurfaceModel.test.mjs'
) {
  throw new Error(
    'TV image render surface model test script is missing or incorrect.',
  );
}

if (
  tvScripts[
    'test:library-verified-image-render-surface-source'
  ] !==
  'node --test src/library/TvLibraryVerifiedImageRenderSurface.source.test.mjs'
) {
  throw new Error(
    'TV image render surface source test script is missing or incorrect.',
  );
}

if (
  tvScripts[
    'check:library-verified-image-render-surface'
  ] !==
  'node ../../scripts/check-crablink-tv-library-verified-image-render-surface-boundary.mjs'
) {
  throw new Error(
    'TV image render surface boundary script is missing or incorrect.',
  );
}

for (const step of [
  'npm run test:library-verified-image-render-surface',
  'npm run test:library-verified-image-render-surface-source',
  'npm run check:library-verified-image-render-surface',
]) {
  if (!String(tvScripts.check ?? '').includes(step)) {
    throw new Error(
      `TV check chain missing ${step}.`,
    );
  }
}

if (
  rootScripts[
    'tv:library-verified-image-render-surface:check'
  ] !==
  'npm --prefix apps/crablink-tv run check:library-verified-image-render-surface'
) {
  throw new Error(
    'Root image render surface boundary script is missing or incorrect.',
  );
}

for (const required of [
  'apps/crablink-tv/src/library/tvLibraryVerifiedImageRenderSurfaceModel.js',
  'apps/crablink-tv/src/library/tvLibraryVerifiedImageRenderSurfaceModel.test.mjs',
  'apps/crablink-tv/src/library/TvLibraryVerifiedImageRenderSurface.jsx',
  'apps/crablink-tv/src/library/TvLibraryVerifiedImageRenderSurface.source.test.mjs',
  'scripts/check-crablink-tv-library-verified-image-render-surface-boundary.mjs',
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
  'CrabLink TV Library verified image render surface boundary passed.',
);

console.log(
  'Surface: active verified image object URL views render through one bounded TV image component.',
);

console.log(
  'Isolation: app and panel wire a projected surface but do not fetch, invoke, construct Blob, or create/revoke URLs.',
);

console.log(
  'Authority: direct fetch, invoke, object URL creation, storage, wallet, ledger, ROC, entitlement, and finality remain absent.',
);

console.log(
  'PHASE9N_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE=GREEN',
);

console.log(
  'IMAGE_RENDER_SURFACE=ADDED',
);

console.log(
  'IMG_SRC_BOUND_TO_PROJECTED_OBJECT_URL=YES',
);

console.log(
  'REACT_OBJECT_URL_CREATION=ABSENT',
);

console.log(
  'DIRECT_REACT_FETCH=ABSENT',
);

console.log(
  'DIRECT_REACT_INVOKE=ABSENT',
);

console.log(
  'NEXT_PATCH=PHASE9P_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE',
);
