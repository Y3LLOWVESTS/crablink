#!/usr/bin/env node
/**
 * RO:WHAT — Validates Phase 9O Library verified image object URL execution.
 * RO:WHY — Execution must compose verified bytes, object URL handoff, and image surface without authority drift.
 * RO:INTERACTS — image execution model, object URL handoff, image render surface, package scripts, codebundle.
 * RO:INVARIANTS — ready verified image bytes produce projected image surfaces; stale URLs revoke before replacement.
 * RO:SECURITY — no direct fetch, invoke, Blob construction, URL creation/revocation outside handoff, or economic authority.
 * RO:TEST — npm --prefix apps/crablink-tv run check:library-verified-image-object-url-execution.
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
      `Missing Phase 9O source: ${relativePath}`,
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

const execution =
  read('apps/crablink-tv/src/library/tvLibraryVerifiedImageObjectUrlExecution.js');

const executionTest =
  read('apps/crablink-tv/src/library/tvLibraryVerifiedImageObjectUrlExecution.test.mjs');

const sourceTest =
  read('apps/crablink-tv/src/library/TvLibraryVerifiedImageObjectUrlExecution.source.test.mjs');

const objectUrlHandoff =
  read('apps/crablink-tv/src/library/tvLibraryVerifiedObjectUrlHandoff.js');

const imageSurfaceModel =
  read('apps/crablink-tv/src/library/tvLibraryVerifiedImageRenderSurfaceModel.js');

const imageSurfaceComponent =
  read('apps/crablink-tv/src/library/TvLibraryVerifiedImageRenderSurface.jsx');

const phase9mBoundary =
  read('scripts/check-crablink-tv-library-verified-object-url-handoff-boundary.mjs');

const phase9nBoundary =
  read('scripts/check-crablink-tv-library-verified-image-render-surface-boundary.mjs');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const codebundleBoundary =
  read('scripts/check-crablink-tv-codebundle-boundary.mjs');

const executableExecution =
  stripComments(execution);

requireFragments(
  'verified image object URL execution',
  execution,
  [
    'TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_SCHEMA',
    'executeTvLibraryVerifiedImageObjectUrl',
    'revokeTvLibraryVerifiedImageObjectUrlExecution',
    'openTvLibraryVerifiedObjectUrlHandoff',
    'replaceTvLibraryVerifiedObjectUrlHandoff',
    'revokeTvLibraryVerifiedObjectUrlHandoff',
    'projectTvLibraryVerifiedImageRenderSurface',
    'createIdleTvLibraryVerifiedImageRenderSurface',
  ],
);

requireFragments(
  'verified image object URL execution tests',
  executionTest + '\n' + sourceTest,
  [
    'opens a ready image lifecycle into a render surface',
    'revokes stale active URLs before replacement',
    'rejects non-image and mismatched inputs',
    'revokes active execution state',
    "Object.hasOwn(execution, 'assetBytes')",
    'execution module does not own browser or React rendering authority',
  ],
);

requireFragments(
  'Phase 9M object URL handoff predecessor',
  phase9mBoundary,
  [
    'PHASE9M_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF=GREEN',
    'NEXT_PATCH=PHASE9O_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION',
  ],
);

requireFragments(
  'Phase 9N image surface predecessor',
  phase9nBoundary,
  [
    'PHASE9N_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE=GREEN',
    'NEXT_PATCH=PHASE9P_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE',
  ],
);

requireFragments(
  'isolated object URL and projected image surface',
  objectUrlHandoff + '\n' + imageSurfaceModel + '\n' + imageSurfaceComponent,
  [
    'urlApi.createObjectURL',
    'urlApi.revokeObjectURL',
    "objectUrl.startsWith('blob:')",
    'src={renderSurfaceView.objectUrl}',
  ],
);

for (const [forbiddenLabel, pattern] of [
  ['global fetch', /\bfetch\s*\(/u],
  ['dynamic invoke', /\binvoke\s*\(/u],
  ['object URL creation', /\bURL\.createObjectURL\b|\bcreateObjectURL\s*\(/u],
  ['object URL revocation', /\bURL\.revokeObjectURL\b|\brevokeObjectURL\s*\(/u],
  ['Blob construction', /\bnew\s+Blob\b/u],
  ['raw image element', /<img\b/u],
  ['src assignment', /\bsrc=/u],
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
  if (pattern.test(executableExecution)) {
    throw new Error(
      `image object URL execution acquired forbidden ${forbiddenLabel}.`,
    );
  }
}

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts[
    'test:library-verified-image-object-url-execution'
  ] !==
  'node --test src/library/tvLibraryVerifiedImageObjectUrlExecution.test.mjs'
) {
  throw new Error(
    'TV image object URL execution model test script is missing or incorrect.',
  );
}

if (
  tvScripts[
    'test:library-verified-image-object-url-execution-source'
  ] !==
  'node --test src/library/TvLibraryVerifiedImageObjectUrlExecution.source.test.mjs'
) {
  throw new Error(
    'TV image object URL execution source test script is missing or incorrect.',
  );
}

if (
  tvScripts[
    'check:library-verified-image-object-url-execution'
  ] !==
  'node ../../scripts/check-crablink-tv-library-verified-image-object-url-execution-boundary.mjs'
) {
  throw new Error(
    'TV image object URL execution boundary script is missing or incorrect.',
  );
}

for (const step of [
  'npm run test:library-verified-image-object-url-execution',
  'npm run test:library-verified-image-object-url-execution-source',
  'npm run check:library-verified-image-object-url-execution',
]) {
  if (!String(tvScripts.check ?? '').includes(step)) {
    throw new Error(
      `TV check chain missing ${step}.`,
    );
  }
}

if (
  rootScripts[
    'tv:library-verified-image-object-url-execution:check'
  ] !==
  'npm --prefix apps/crablink-tv run check:library-verified-image-object-url-execution'
) {
  throw new Error(
    'Root image object URL execution boundary script is missing or incorrect.',
  );
}

for (const required of [
  'apps/crablink-tv/src/library/tvLibraryVerifiedImageObjectUrlExecution.js',
  'apps/crablink-tv/src/library/tvLibraryVerifiedImageObjectUrlExecution.test.mjs',
  'apps/crablink-tv/src/library/TvLibraryVerifiedImageObjectUrlExecution.source.test.mjs',
  'scripts/check-crablink-tv-library-verified-image-object-url-execution-boundary.mjs',
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
  'CrabLink TV Library verified image object URL execution boundary passed.',
);

console.log(
  'Execution: ready verified image bytes produce a projected TV image surface through isolated object URL handoff.',
);

console.log(
  'Revocation: stale active object URLs revoke before replacement and can be cleared explicitly.',
);

console.log(
  'Authority: execution does not fetch, invoke, construct Blob, create/revoke URLs directly, or touch wallet, ledger, ROC, entitlement, or finality.',
);

console.log(
  'PHASE9O_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION=GREEN',
);

console.log(
  'IMAGE_OBJECT_URL_EXECUTION=ADDED',
);

console.log(
  'STALE_OBJECT_URL_REVOKE_BEFORE_REPLACE=YES',
);

console.log(
  'IMAGE_SURFACE_READY_FROM_EXECUTION=YES',
);

console.log(
  'RAW_BYTES_EXPOSED_TO_REACT=NO',
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
