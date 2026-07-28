#!/usr/bin/env node
/**
 * RO:WHAT — Validates Phase 9M Library verified object URL handoff isolation.
 * RO:WHY — Browser Blob/object URL APIs must be isolated before React renders verified bytes.
 * RO:INTERACTS — object URL handoff module, Phase 9L lifecycle model, package scripts, codebundle checks.
 * RO:INVARIANTS — only ready lifecycle tickets create URLs; active URLs are revocable; React remains byte-render free.
 * RO:SECURITY — no direct fetch, invoke, storage, wallet, ledger, ROC, entitlement, finality, or raw React rendering.
 * RO:TEST — npm --prefix apps/crablink-tv run check:library-verified-object-url-handoff.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root =
  path.resolve(
    path.dirname(
      fileURLToPath(
        import.meta.url,
      ),
    ),
    '..',
  );

function read(relativePath) {
  const absolutePath =
    path.join(
      root,
      relativePath,
    );

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing Phase 9M source: ${relativePath}`,
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

const handoff =
  read(
    'apps/crablink-tv/src/library/tvLibraryVerifiedObjectUrlHandoff.js',
  );

const handoffTest =
  read(
    'apps/crablink-tv/src/library/tvLibraryVerifiedObjectUrlHandoff.test.mjs',
  );

const handoffSourceTest =
  read(
    'apps/crablink-tv/src/library/TvLibraryVerifiedObjectUrlHandoff.source.test.mjs',
  );

const lifecycle =
  read(
    'apps/crablink-tv/src/library/tvLibraryVerifiedByteRenderLifecycleModel.js',
  );

const app =
  read('apps/crablink-tv/src/app/TvApp.jsx');

const panel =
  read(
    'apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx',
  );

const phase9lBoundary =
  read(
    'scripts/check-crablink-tv-library-verified-byte-render-lifecycle-boundary.mjs',
  );

const phase9kBoundary =
  read(
    'scripts/check-crablink-tv-library-verified-render-display-boundary.mjs',
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

const executableHandoff =
  stripComments(handoff);

const executableLifecycle =
  stripComments(lifecycle);

const executableApp =
  stripComments(app);

const executablePanel =
  stripComments(panel);

requireFragments(
  'verified object URL handoff',
  handoff,
  [
    'TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_SCHEMA',
    'createBrowserTvLibraryVerifiedObjectUrlPort',
    'openTvLibraryVerifiedObjectUrlHandoff',
    'revokeTvLibraryVerifiedObjectUrlHandoff',
    'replaceTvLibraryVerifiedObjectUrlHandoff',
    'activateTvLibraryVerifiedByteRenderLifecycle',
    'revokeTvLibraryVerifiedByteRenderLifecycle',
    'urlApi.createObjectURL',
    'urlApi.revokeObjectURL',
    'new BlobCtor',
    'assetBytes',
    'contentTypeMatchesDisplay',
  ],
);

requireFragments(
  'verified object URL handoff tests',
  handoffTest + '\n' + handoffSourceTest,
  [
    'opens verified image bytes through an injected port',
    'opens verified article bytes through the same path',
    'rejects unsafe byte or lifecycle mismatches',
    'revokes active object URLs before replacement',
    'browser object URL port wraps only Blob and URL APIs',
    'Phase 9M leaves React surfaces unrendered and lifecycle model byte-free',
  ],
);

requireFragments(
  'Phase 9L predecessor boundary',
  phase9lBoundary,
  [
    'PHASE9L_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE=GREEN',
    'NEXT_PATCH=PHASE9N_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE',
  ],
);

requireFragments(
  'Phase 9K remains a valid predecessor to object URL handoff',
  phase9kBoundary,
  [
    'PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY=GREEN',
    'NEXT_PATCH=PHASE9M_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF',
  ],
);

for (const [label, source] of [
  ['verified object URL handoff', executableHandoff],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['global fetch', /\bfetch\s*\(/u],
    ['dynamic invoke', /\binvoke\s*\(/u],
    ['local storage', /\blocalStorage\b/u],
    ['session storage', /\bsessionStorage\b/u],
    ['indexedDB', /\bindexedDB\b/u],
    ['raw image element', /<img\b/u],
    ['src assignment', /\bsrc=/u],
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
  ['byte lifecycle model', executableLifecycle],
  ['TV app', executableApp],
  ['Library panel', executablePanel],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['object URL creation', /\bURL\.createObjectURL\b|\bcreateObjectURL\s*\(/u],
    ['object URL revocation', /\bURL\.revokeObjectURL\b|\brevokeObjectURL\s*\(/u],
    ['Blob construction', /\bnew\s+Blob\b/u],
    ['raw image element', /<img\b/u],
    ['src assignment', /\bsrc=/u],
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
    'test:library-verified-object-url-handoff'
  ] !==
  'node --test src/library/tvLibraryVerifiedObjectUrlHandoff.test.mjs'
) {
  throw new Error(
    'TV object URL handoff model test script is missing or incorrect.',
  );
}

if (
  tvScripts[
    'test:library-verified-object-url-handoff-source'
  ] !==
  'node --test src/library/TvLibraryVerifiedObjectUrlHandoff.source.test.mjs'
) {
  throw new Error(
    'TV object URL handoff source test script is missing or incorrect.',
  );
}

if (
  tvScripts[
    'check:library-verified-object-url-handoff'
  ] !==
  'node ../../scripts/check-crablink-tv-library-verified-object-url-handoff-boundary.mjs'
) {
  throw new Error(
    'TV object URL handoff boundary script is missing or incorrect.',
  );
}

for (const step of [
  'npm run test:library-verified-object-url-handoff',
  'npm run test:library-verified-object-url-handoff-source',
  'npm run check:library-verified-object-url-handoff',
]) {
  if (!String(tvScripts.check ?? '').includes(step)) {
    throw new Error(
      `TV check chain missing ${step}.`,
    );
  }
}

if (
  rootScripts[
    'tv:library-verified-object-url-handoff:check'
  ] !==
  'npm --prefix apps/crablink-tv run check:library-verified-object-url-handoff'
) {
  throw new Error(
    'Root object URL handoff boundary script is missing or incorrect.',
  );
}

for (const required of [
  'apps/crablink-tv/src/library/tvLibraryVerifiedObjectUrlHandoff.js',
  'apps/crablink-tv/src/library/tvLibraryVerifiedObjectUrlHandoff.test.mjs',
  'apps/crablink-tv/src/library/TvLibraryVerifiedObjectUrlHandoff.source.test.mjs',
  'scripts/check-crablink-tv-library-verified-object-url-handoff-boundary.mjs',
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
  'CrabLink TV Library verified object URL handoff boundary passed.',
);

console.log(
  'Handoff: verified byte lifecycle tickets create and revoke browser object URLs through one isolated port.',
);

console.log(
  'Isolation: Blob and URL APIs are confined to the object URL handoff module.',
);

console.log(
  'Authority: React rendering, direct fetch, invoke, storage, wallet, ledger, ROC, entitlement, and finality remain absent.',
);

console.log(
  'PHASE9M_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF=GREEN',
);

console.log(
  'OBJECT_URL_HANDOFF_PORT=ADDED',
);

console.log(
  'OBJECT_URL_CREATION_ISOLATED=YES',
);

console.log(
  'OBJECT_URL_REVOCATION_ISOLATED=YES',
);

console.log(
  'REACT_IMAGE_RENDER_SURFACE=NOT_ADDED',
);

console.log(
  'NEXT_PATCH=PHASE9O_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION',
);
