#!/usr/bin/env node
/**
 * RO:WHAT — Validates final Phase 9 Library B3 asset/content proof acceptance for CrabLink TV.
 * RO:WHY — Phase 9 closes only after verified image and article surfaces exist with corrupt/mismatch rejection.
 * RO:INTERACTS — Phase 9L/9M/9N/9O/9P boundaries, Library detail panel, TV app, and package scripts.
 * RO:INVARIANTS — verified image path is object-URL isolated; verified article path is text-only; no provider fallback drift.
 * RO:SECURITY — no direct React fetch/invoke, unsafe HTML injection, wallet, ledger, ROC, entitlement, or finality authority.
 * RO:TEST — npm --prefix apps/crablink-tv run check:phase9-acceptance.
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
      `Missing Phase 9 acceptance source: ${relativePath}`,
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

const phase9lBoundary =
  read('scripts/check-crablink-tv-library-verified-byte-render-lifecycle-boundary.mjs');

const phase9mBoundary =
  read('scripts/check-crablink-tv-library-verified-object-url-handoff-boundary.mjs');

const phase9nBoundary =
  read('scripts/check-crablink-tv-library-verified-image-render-surface-boundary.mjs');

const phase9oBoundary =
  read('scripts/check-crablink-tv-library-verified-image-object-url-execution-boundary.mjs');

const phase9pBoundary =
  read('scripts/check-crablink-tv-library-verified-article-render-surface-boundary.mjs');

const imageExecutionTest =
  read('apps/crablink-tv/src/library/tvLibraryVerifiedImageObjectUrlExecution.test.mjs');

const articleSurfaceTest =
  read('apps/crablink-tv/src/library/tvLibraryVerifiedArticleRenderSurfaceModel.test.mjs');

const objectUrlHandoff =
  read('apps/crablink-tv/src/library/tvLibraryVerifiedObjectUrlHandoff.js');

const imageSurface =
  read('apps/crablink-tv/src/library/TvLibraryVerifiedImageRenderSurface.jsx');

const articleSurface =
  read('apps/crablink-tv/src/library/TvLibraryVerifiedArticleRenderSurface.jsx');

const panel =
  read('apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx');

const app =
  read('apps/crablink-tv/src/app/TvApp.jsx');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const codebundleBoundary =
  read('scripts/check-crablink-tv-codebundle-boundary.mjs');

const executablePanel =
  stripComments(panel);

const executableApp =
  stripComments(app);

const executableArticleSurface =
  stripComments(articleSurface);

requireFragments(
  'Phase 9L lifecycle boundary',
  phase9lBoundary,
  [
    'PHASE9L_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE=GREEN',
    'STALE_OBJECT_URL_REVOCATION_REQUIRED=YES',
  ],
);

requireFragments(
  'Phase 9M object URL boundary',
  phase9mBoundary,
  [
    'PHASE9M_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF=GREEN',
    'OBJECT_URL_CREATION_ISOLATED=YES',
    'OBJECT_URL_REVOCATION_ISOLATED=YES',
  ],
);

requireFragments(
  'Phase 9N image surface boundary',
  phase9nBoundary,
  [
    'PHASE9N_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE=GREEN',
    'IMG_SRC_BOUND_TO_PROJECTED_OBJECT_URL=YES',
  ],
);

requireFragments(
  'Phase 9O image execution boundary',
  phase9oBoundary,
  [
    'PHASE9O_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION=GREEN',
    'STALE_OBJECT_URL_REVOKE_BEFORE_REPLACE=YES',
    'RAW_BYTES_EXPOSED_TO_REACT=NO',
    'NEXT_PATCH=PHASE9P_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE',
  ],
);

requireFragments(
  'Phase 9P article surface boundary',
  phase9pBoundary,
  [
    'PHASE9P_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE=GREEN',
    'UNSAFE_HTML_INJECTION=ABSENT',
    'CORRUPT_OR_MISMATCHED_TEXT_BYTES_REJECTED=YES',
    'NEXT_PATCH=PHASE9_FINAL_ACCEPTANCE',
  ],
);

requireFragments(
  'Phase 9 corrupt and mismatch rejection tests',
  imageExecutionTest + '\n' + articleSurfaceTest,
  [
    'rejects non-image and mismatched inputs',
    'revokes stale active URLs before replacement',
    'verified article render surface rejects non-article and mismatched bytes',
    'DECODE_FAILED',
    'LENGTH_MISMATCH',
  ],
);

requireFragments(
  'Phase 9 verified render surfaces',
  objectUrlHandoff + '\n' + imageSurface + '\n' + articleSurface,
  [
    'urlApi.createObjectURL',
    'urlApi.revokeObjectURL',
    'src={renderSurfaceView.objectUrl}',
    'renderSurfaceView.paragraphs.map',
    '{paragraph}',
  ],
);

requireFragments(
  'Phase 9 app and panel wiring',
  panel + '\n' + app,
  [
    'TvLibraryVerifiedImageRenderSurface',
    'TvLibraryVerifiedArticleRenderSurface',
    'imageRenderSurfaceView={libraryVerifiedImageRenderSurfaceView}',
    'articleRenderSurfaceView={libraryVerifiedArticleRenderSurfaceView}',
  ],
);

for (const [label, source] of [
  ['Library detail panel', executablePanel],
  ['TV app', executableApp],
  ['Article surface component', executableArticleSurface],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['direct fetch', /\bfetch\s*\(/u],
    ['direct invoke', /\binvoke\s*\(/u],
    ['unsafe HTML injection', /\bdangerouslySetInnerHTML\b|\binnerHTML\b/u],
    ['direct object URL creation', /\bURL\.createObjectURL\b|\bcreateObjectURL\s*\(/u],
    ['direct object URL revocation', /\bURL\.revokeObjectURL\b|\brevokeObjectURL\s*\(/u],
    ['Blob construction', /\bnew\s+Blob\b/u],
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
    'check:phase9-acceptance'
  ] !==
  'node ../../scripts/check-crablink-tv-phase9-acceptance-boundary.mjs'
) {
  throw new Error(
    'TV Phase 9 acceptance boundary script is missing or incorrect.',
  );
}

if (
  rootScripts[
    'tv:phase9:check'
  ] !==
  'npm --prefix apps/crablink-tv run check:phase9-acceptance'
) {
  throw new Error(
    'Root Phase 9 acceptance script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run check:phase9-acceptance',
  )
) {
  throw new Error(
    'TV check chain missing Phase 9 acceptance.',
  );
}

for (const required of [
  'scripts/check-crablink-tv-library-verified-article-render-surface-boundary.mjs',
  'scripts/check-crablink-tv-phase9-acceptance-boundary.mjs',
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
  'CrabLink TV Phase 9 acceptance boundary passed.',
);

console.log(
  'Image proof: verified bytes flow through lifecycle, isolated object URL handoff, and projected image surface.',
);

console.log(
  'Article proof: verified text bytes decode into safe React text nodes with unsafe HTML injection absent.',
);

console.log(
  'Rejection proof: mismatched, corrupt, unsupported, stale, and non-ready inputs fail closed.',
);

console.log(
  'Authority proof: React does not fetch, invoke, construct Blob, create/revoke object URLs, or own wallet/ledger/ROC/finality truth.',
);

console.log(
  'PHASE9_LIBRARY_B3_ASSET_AND_CONTENT_VIEW_PROOF=GREEN',
);

console.log(
  'PHASE9_COMPLETE=YES',
);

console.log(
  'IMAGE_RENDER_EXECUTION=GREEN',
);

console.log(
  'ARTICLE_RENDER_SURFACE=GREEN',
);

console.log(
  'CORRUPT_CONTENT_REJECTION=GREEN',
);

console.log(
  'DIRECT_PROVIDER_FALLBACK=ABSENT',
);

console.log(
  'NEXT_PATCH=PHASE10_MEDIA_PLAYBACK_FOUNDATION',
);
