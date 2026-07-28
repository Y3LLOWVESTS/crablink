#!/usr/bin/env node
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
      `Missing Phase 10C source: ${relativePath}`,
    );
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing: ${fragment}`);
    }
  }
}

function rejectFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (source.includes(fragment)) {
      throw new Error(`${label} contains forbidden fragment: ${fragment}`);
    }
  }
}

const phase10bModel =
  read('apps/crablink-tv/src/media/tvVerifiedMediaPlaybackSurfaceModel.js');

const phase10bBoundary =
  read('scripts/check-crablink-tv-verified-media-playback-surface-boundary.mjs');

const sourceModel =
  read('apps/crablink-tv/src/media/tvVerifiedMediaSourceHandoffModel.js');

const sourceTest =
  read('apps/crablink-tv/src/media/tvVerifiedMediaSourceHandoffModel.test.mjs');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const executableModel =
  stripComments(sourceModel);

requireFragments(
  'Phase 10B playback surface model',
  phase10bModel,
  [
    'crablink.tv.verified-media-playback-surface.v1',
    'projectTvVerifiedMediaPlaybackSurface',
    'sourceAttached: false',
    'playerElementAttached: false',
    'autoplayAllowed: false',
  ],
);

requireFragments(
  'Phase 10B playback surface boundary',
  phase10bBoundary,
  [
    'PHASE10B_TV_PLAYBACK_SURFACE_SHELL=GREEN',
    'SOURCE_HANDOFF=NOT_ADDED',
    'PLAYER_ELEMENT=NOT_ADDED',
    'NEXT_PATCH=PHASE10C_MEDIA_SOURCE_HANDOFF_FOUNDATION',
  ],
);

requireFragments(
  'Phase 10C source handoff model',
  sourceModel,
  [
    'TV_VERIFIED_MEDIA_SOURCE_HANDOFF_SCHEMA',
    'crablink.tv.verified-media-source-handoff.v1',
    'TV_VERIFIED_MEDIA_SOURCE_HANDOFF_PROJECTION_SCHEMA',
    'crablink.tv.verified-media-source-handoff-projection.v1',
    'projectTvVerifiedMediaSourceHandoff',
    'EXPECTED_PLAYBACK_SURFACE_SCHEMA',
    'crablink.tv.verified-media-playback-surface.v1',
    'LOCAL_FULL_BYTE',
    'BACKEND_SERVICE_PATH',
    'ISOLATED_OBJECT_SOURCE',
    'GATEWAY_STREAM_SOURCE',
    'sourceAttached: true',
    'sourceReadyForPlayerElement: true',
    'playerElementAttached: false',
    'autoplayAllowed: false',
    'Local full-byte media handle reviewed for player handoff.',
    'Backend service-path stream handle reviewed for player handoff.',
  ],
);

requireFragments(
  'Phase 10C source handoff tests',
  sourceTest,
  [
    'verified media source handoff accepts local full-byte video handle',
    'verified media source handoff accepts backend service-path audio stream handle',
    'verified media source handoff rejects identifier and content mismatches',
    'verified media source handoff rejects delivery truth mismatches',
    'verified media source handoff rejects raw media references and keeps player absent',
    'verified media source handoff output has no authority or media byte fields',
  ],
);

rejectFragments(
  'Phase 10C source handoff executable model',
  executableModel,
  [
    '<video',
    '<audio',
    'src=',
    'fetch(',
    'invoke(',
    'new Blob',
    'createObjectURL',
    'revokeObjectURL',
    'dangerouslySetInnerHTML',
    'innerHTML',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'autoPlay',
    'wallet',
    'ledger',
    'entitlement',
    'finality',
    'providerFallback',
    'directProvider',
  ],
);

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:verified-media-source-handoff'] !==
  'node --test src/media/tvVerifiedMediaSourceHandoffModel.test.mjs'
) {
  throw new Error(
    'TV Phase 10C source handoff test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:verified-media-source-handoff'] !==
  'node ../../scripts/check-crablink-tv-verified-media-source-handoff-boundary.mjs'
) {
  throw new Error(
    'TV Phase 10C source handoff boundary script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:verified-media-source-handoff && npm run check:verified-media-source-handoff',
  )
) {
  throw new Error(
    'TV package check chain does not include Phase 10C source handoff checks.',
  );
}

if (
  rootScripts['tv:verified-media-source-handoff:test'] !==
  'npm --prefix apps/crablink-tv run test:verified-media-source-handoff'
) {
  throw new Error(
    'Root Phase 10C source handoff test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:verified-media-source-handoff:check'] !==
  'node scripts/check-crablink-tv-verified-media-source-handoff-boundary.mjs'
) {
  throw new Error(
    'Root Phase 10C source handoff boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/media/tvVerifiedMediaSourceHandoffModel.js',
  'apps/crablink-tv/src/media/tvVerifiedMediaSourceHandoffModel.test.mjs',
  'scripts/check-crablink-tv-verified-media-source-handoff-boundary.mjs',
]) {
  if (!makeCodebundle.includes(requiredPath)) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV verified media source handoff boundary passed.',
);
console.log(
  'Handoff: Phase 10B playback surfaces accept local full-byte and backend service-path source handles.',
);
console.log(
  'Isolation: raw media references, player elements, URL creation, fetch, invoke, storage, and autoplay remain absent.',
);
console.log(
  'Authority: wallet, ledger, entitlement, ROC, finality, and provider fallback remain absent.',
);
console.log('PHASE10C_MEDIA_SOURCE_HANDOFF_FOUNDATION=GREEN');
console.log('SOURCE_HANDOFF_MODEL=ADDED');
console.log('LOCAL_FULL_BYTE_HANDLE_REVIEW=ADDED');
console.log('BACKEND_SERVICE_PATH_HANDLE_REVIEW=ADDED');
console.log('RAW_MEDIA_REFERENCE_EXPOSURE=ABSENT');
console.log('PLAYER_ELEMENT=NOT_ADDED');
console.log('NEXT_PATCH=PHASE10D_VIDEO_PLAYBACK_SURFACE');
