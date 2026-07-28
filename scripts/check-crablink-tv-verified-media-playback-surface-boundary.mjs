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
      `Missing Phase 10B source: ${relativePath}`,
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

const phase10aModel =
  read('apps/crablink-tv/src/media/tvVerifiedMediaPlaybackModel.js');

const phase10aBoundary =
  read('scripts/check-crablink-tv-verified-media-playback-boundary.mjs');

const model =
  read('apps/crablink-tv/src/media/tvVerifiedMediaPlaybackSurfaceModel.js');

const modelTest =
  read('apps/crablink-tv/src/media/tvVerifiedMediaPlaybackSurfaceModel.test.mjs');

const component =
  read('apps/crablink-tv/src/media/TvVerifiedMediaPlaybackSurface.jsx');

const sourceTest =
  read('apps/crablink-tv/src/media/TvVerifiedMediaPlaybackSurface.source.test.mjs');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const executableModel =
  stripComments(model);

const executableComponent =
  stripComments(component);

requireFragments(
  'Phase 10A playback model',
  phase10aModel,
  [
    'crablink.tv.verified-media-playback.v1',
    'video',
    'audio',
    'fullByteVerified',
    'backendServicePathVerified',
  ],
);

requireFragments(
  'Phase 10A boundary',
  phase10aBoundary,
  [
    'PHASE10A_VERIFIED_MEDIA_PLAYBACK_MODEL=GREEN',
    'FULL_BYTE_VS_SERVICE_PATH_TRUTH=EXPLICIT',
    'SOURCE_HANDOFF=NOT_ADDED',
    'NEXT_PATCH=PHASE10B_TV_PLAYBACK_SURFACE_SHELL',
  ],
);

requireFragments(
  'Phase 10B surface model',
  model,
  [
    'TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_SCHEMA',
    'crablink.tv.verified-media-playback-surface.v1',
    'projectTvVerifiedMediaPlaybackSurface',
    'EXPECTED_PLAYBACK_SCHEMA',
    'crablink.tv.verified-media-playback.v1',
    'SOURCE_NOT_ATTACHED_REASON',
    'Local full-byte verification complete.',
    'Backend service-path verification confirmed.',
    'Verified object source pending isolated handoff.',
    'Gateway stream source pending isolated handoff.',
    'sourceAttached: false',
    'playerElementAttached: false',
    'autoplayAllowed: false',
  ],
);

requireFragments(
  'Phase 10B surface component',
  component,
  [
    'TvVerifiedMediaPlaybackSurface',
    'projectTvVerifiedMediaPlaybackSurface',
    'data-playback-state={surface.state}',
    'data-source-attached={String(surface.sourceAttached)}',
    'data-player-element-attached={String(surface.playerElementAttached)}',
    'data-remote-control={control.control}',
    'disabled={!control.enabled}',
    'Source handoff and player element attach in the next media slices.',
  ],
);

requireFragments(
  'Phase 10B surface tests',
  modelTest + '\n' + sourceTest,
  [
    'verified media playback surface projects idle shell without source or player',
    'verified media playback surface renders full-byte video readiness truth',
    'verified media playback surface renders service-path audio truth distinctly',
    'verified media playback surface rejects non-ready playback views',
    'verified media playback surface component does not attach media source or player yet',
  ],
);

rejectFragments(
  'Phase 10B model executable',
  executableModel,
  [
    'sourceUrl',
    'signedUrl',
    'objectUrl',
    'assetBytes',
    'fetch(',
    'invoke(',
    'new Blob',
    'URL.createObjectURL',
    'URL.revokeObjectURL',
    'dangerouslySetInnerHTML',
    'innerHTML',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'wallet',
    'ledger',
    'entitlement',
    'finality',
    'providerFallback',
    'directProvider',
  ],
);

rejectFragments(
  'Phase 10B component executable',
  executableComponent,
  [
    '<video',
    '<audio',
    'src=',
    'sourceUrl',
    'signedUrl',
    'objectUrl',
    'assetBytes',
    'fetch(',
    'invoke(',
    'new Blob',
    'URL.createObjectURL',
    'URL.revokeObjectURL',
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
  tvScripts['test:verified-media-playback-surface'] !==
  'node --test src/media/tvVerifiedMediaPlaybackSurfaceModel.test.mjs src/media/TvVerifiedMediaPlaybackSurface.source.test.mjs'
) {
  throw new Error(
    'TV Phase 10B playback surface test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:verified-media-playback-surface'] !==
  'node ../../scripts/check-crablink-tv-verified-media-playback-surface-boundary.mjs'
) {
  throw new Error(
    'TV Phase 10B playback surface boundary script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:verified-media-playback-surface && npm run check:verified-media-playback-surface',
  )
) {
  throw new Error(
    'TV package check chain does not include Phase 10B playback surface checks.',
  );
}

if (
  rootScripts['tv:verified-media-playback-surface:test'] !==
  'npm --prefix apps/crablink-tv run test:verified-media-playback-surface'
) {
  throw new Error(
    'Root Phase 10B playback surface test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:verified-media-playback-surface:check'] !==
  'node scripts/check-crablink-tv-verified-media-playback-surface-boundary.mjs'
) {
  throw new Error(
    'Root Phase 10B playback surface boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/media/tvVerifiedMediaPlaybackSurfaceModel.js',
  'apps/crablink-tv/src/media/tvVerifiedMediaPlaybackSurfaceModel.test.mjs',
  'apps/crablink-tv/src/media/TvVerifiedMediaPlaybackSurface.jsx',
  'apps/crablink-tv/src/media/TvVerifiedMediaPlaybackSurface.source.test.mjs',
  'scripts/check-crablink-tv-verified-media-playback-surface-boundary.mjs',
]) {
  if (!makeCodebundle.includes(requiredPath)) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV verified media playback surface boundary passed.',
);
console.log(
  'Surface: video/audio readiness projects into a bounded TV shell.',
);
console.log(
  'Isolation: source handoff, player elements, URL creation, fetch, invoke, and storage are still deferred.',
);
console.log(
  'Authority: wallet, ledger, entitlement, ROC, finality, and provider fallback remain absent.',
);
console.log('PHASE10B_TV_PLAYBACK_SURFACE_SHELL=GREEN');
console.log('PLAYBACK_SURFACE_SHELL=ADDED');
console.log('SOURCE_HANDOFF=NOT_ADDED');
console.log('PLAYER_ELEMENT=NOT_ADDED');
console.log('REMOTE_CONTROLS=VISIBLE_DISABLED_SHELL_ONLY');
console.log('NEXT_PATCH=PHASE10C_MEDIA_SOURCE_HANDOFF_FOUNDATION');
