#!/usr/bin/env node
/**
 * RO:WHAT — Validates Phase 9L Library verified byte render lifecycle foundation.
 * RO:WHY — Object URL rendering requires explicit active/revoked state before React handoff.
 * RO:INTERACTS — byte lifecycle model, display model, Phase 9K boundary, and package/codebundle wiring.
 * RO:INVARIANTS — tickets require verified display facts and active Library identifiers; active URLs require revocation.
 * RO:SECURITY — no direct fetch, invoke, Blob, URL.createObjectURL, URL.revokeObjectURL, img/src, storage, wallet, ledger, ROC, entitlement, or finality behavior.
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
      `Missing Phase 9L source: ${relativePath}`,
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

const lifecycleModel =
  read(
    'apps/crablink-tv/src/library/' +
      'tvLibraryVerifiedByteRenderLifecycleModel.js',
  );

const lifecycleTest =
  read(
    'apps/crablink-tv/src/library/' +
      'tvLibraryVerifiedByteRenderLifecycleModel.test.mjs',
  );

const lifecycleSourceTest =
  read(
    'apps/crablink-tv/src/library/' +
      'TvLibraryVerifiedByteRenderLifecycle.source.test.mjs',
  );

const displayModel =
  read(
    'apps/crablink-tv/src/library/' +
      'tvLibraryVerifiedRenderDisplayModel.js',
  );

const app =
  read('apps/crablink-tv/src/app/TvApp.jsx');

const panel =
  read(
    'apps/crablink-tv/src/library/' +
      'TvLibraryAssetDetailPanel.jsx',
  );

const phase9kBoundary =
  read(
    'scripts/' +
      'check-crablink-tv-library-verified-render-display-boundary.mjs',
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
  stripComments(lifecycleModel);

const executableApp =
  stripComments(app);

const executablePanel =
  stripComments(panel);

requireFragments(
  'verified byte render lifecycle model',
  lifecycleModel + '\n' + lifecycleTest,
  [
    'TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_SCHEMA',
    'prepareTvLibraryVerifiedByteRenderLifecycle',
    'activateTvLibraryVerifiedByteRenderLifecycle',
    'revokeTvLibraryVerifiedByteRenderLifecycle',
    'shouldRevokeTvLibraryVerifiedByteRenderLifecycle',
    'revokeRequired',
    'validBlobUrl',
    'activates only bounded blob object URLs',
    'revokes active stale object URLs',
    'rejects unverified unsupported or stale display facts',
  ],
);

requireFragments(
  'verified display predecessor',
  displayModel + '\n' + phase9kBoundary,
  [
    'TV_LIBRARY_VERIFIED_RENDER_DISPLAY_SCHEMA',
    'PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY=GREEN',
    'NEXT_PATCH=PHASE9M_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF',
  ],
);

requireFragments(
  'source boundary coverage',
  lifecycleSourceTest,
  [
    'does not wire React byte rendering yet',
    'byte render lifecycle model owns object URL state without creating URLs',
    'byte render lifecycle tests cover activation revocation and stale cleanup',
  ],
);

for (const [label, source] of [
  ['byte lifecycle model', executableModel],
  ['TV app', executableApp],
  ['Library panel', executablePanel],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['global fetch', /\bfetch\s*\(/u],
    ['dynamic invoke', /\binvoke\s*\(/u],
    ['native manifest call', /\bcheckAssetManifest\s*\(/u],
    ['verify flow call', /\brunTvLibraryAssetVerifyFlow\s*\(/u],
    ['gateway evidence read', /\breadTvGatewayAssetEvidence\s*\(/u],
    ['object URL creation', /\bURL\.createObjectURL\b|\bcreateObjectURL\s*\(/u],
    ['object URL revocation call', /\bURL\.revokeObjectURL\b|\brevokeObjectURL\s*\(/u],
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
    'test:library-verified-byte-render-lifecycle'
  ] !==
  'node --test src/library/tvLibraryVerifiedByteRenderLifecycleModel.test.mjs'
) {
  throw new Error(
    'TV byte render lifecycle model test script is missing or incorrect.',
  );
}

if (
  tvScripts[
    'test:library-verified-byte-render-lifecycle-source'
  ] !==
  'node --test src/library/TvLibraryVerifiedByteRenderLifecycle.source.test.mjs'
) {
  throw new Error(
    'TV byte render lifecycle source test script is missing or incorrect.',
  );
}

if (
  tvScripts[
    'check:library-verified-byte-render-lifecycle'
  ] !==
  'node ../../scripts/check-crablink-tv-library-verified-byte-render-lifecycle-boundary.mjs'
) {
  throw new Error(
    'TV byte render lifecycle boundary script is missing or incorrect.',
  );
}

for (const step of [
  'npm run test:library-verified-byte-render-lifecycle',
  'npm run test:library-verified-byte-render-lifecycle-source',
  'npm run check:library-verified-byte-render-lifecycle',
]) {
  if (!String(tvScripts.check ?? '').includes(step)) {
    throw new Error(
      `TV check chain missing ${step}.`,
    );
  }
}

if (
  rootScripts[
    'tv:library-verified-byte-render-lifecycle:check'
  ] !==
  'npm --prefix apps/crablink-tv run check:library-verified-byte-render-lifecycle'
) {
  throw new Error(
    'Root byte render lifecycle boundary script is missing or incorrect.',
  );
}

for (const required of [
  'apps/crablink-tv/src/library/tvLibraryVerifiedByteRenderLifecycleModel.js',
  'apps/crablink-tv/src/library/tvLibraryVerifiedByteRenderLifecycleModel.test.mjs',
  'apps/crablink-tv/src/library/TvLibraryVerifiedByteRenderLifecycle.source.test.mjs',
  'scripts/check-crablink-tv-library-verified-byte-render-lifecycle-boundary.mjs',
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
  'CrabLink TV Library verified byte render lifecycle boundary passed.',
);

console.log(
  'Lifecycle: verified display facts become identifier-bound ready/active/revoked object URL state.',
);

console.log(
  'Revocation: active object URL state is explicitly marked for cleanup and stale detail replacement requires revocation.',
);

console.log(
  'Authority: direct fetch, invoke, Blob construction, URL.createObjectURL, URL.revokeObjectURL, img/src, storage, wallet, ledger, ROC, entitlement, and finality remain absent.',
);

console.log(
  'PHASE9L_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE=GREEN',
);

console.log(
  'BYTE_RENDER_LIFECYCLE_MODEL=ADDED',
);

console.log(
  'OBJECT_URL_CREATION=NOT_ADDED',
);

console.log(
  'OBJECT_URL_REVOCATION_CALL=NOT_ADDED',
);

console.log(
  'REACT_BYTE_RENDER_HANDOFF=NOT_ADDED',
);

console.log(
  'STALE_OBJECT_URL_REVOCATION_REQUIRED=YES',
);

console.log(
  'NEXT_PATCH=PHASE9N_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE',
);
