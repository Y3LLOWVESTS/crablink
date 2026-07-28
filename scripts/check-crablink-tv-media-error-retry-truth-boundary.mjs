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
      `Missing Phase 10G source: ${relativePath}`,
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

const phase10fBoundary =
  read('scripts/check-crablink-tv-playback-controls-focus-boundary.mjs');

const truthModel =
  read('apps/crablink-tv/src/media/tvMediaErrorRetryTruthModel.js');

const truthTest =
  read('apps/crablink-tv/src/media/tvMediaErrorRetryTruthModel.test.mjs');

const truthComponent =
  read('apps/crablink-tv/src/media/TvMediaErrorRetryTruthPanel.jsx');

const truthSourceTest =
  read('apps/crablink-tv/src/media/TvMediaErrorRetryTruthPanel.source.test.mjs');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const executableTruthModel =
  stripComments(truthModel);

const executableTruthComponent =
  stripComments(truthComponent);

requireFragments(
  'Phase 10F boundary',
  phase10fBoundary,
  [
    'PHASE10F_PLAYBACK_CONTROLS_AND_FOCUS_MODEL=GREEN',
    'REMOTE_CONTROL_FOCUS_MODEL=ADDED',
    'VIDEO_AND_AUDIO_CONTROL_UNIFICATION=ADDED',
    'AUTOPLAY=DISABLED',
    'NEXT_PATCH=PHASE10G_MEDIA_ERROR_RETRY_TRUTH_MODEL',
  ],
);

requireFragments(
  'Phase 10G media error retry truth model',
  truthModel,
  [
    'TV_MEDIA_ERROR_RETRY_TRUTH_SCHEMA',
    'crablink.tv.media-error-retry-truth.v1',
    'TV_MEDIA_PLAYER_EVENT_SCHEMA',
    'crablink.tv.media-player-event.v1',
    'projectTvMediaErrorRetryTruth',
    'TV_MEDIA_RETRY_POSTURE',
    'USER_ALLOWED',
    'BLOCKED',
    'automaticRetryAllowed: false',
    'userRetryRequired',
    'RETRYABLE_ERROR_CODES',
    'MEDIA_ERR_NETWORK',
    'MEDIA_ERR_DECODE',
    'AUTOPLAY_NOT_ALLOWED',
    'RAW_MEDIA_EVENT_REFERENCE_REJECTED',
  ],
);

requireFragments(
  'Phase 10G media error retry truth panel',
  truthComponent,
  [
    'TvMediaErrorRetryTruthPanel',
    'projectTvMediaErrorRetryTruth',
    'data-media-error-state={truth.state}',
    'data-media-kind={truth.mediaKind}',
    'data-retry-allowed={String(truth.retryAllowed)}',
    'data-retry-posture={truth.retryPosture}',
    'data-automatic-retry-allowed={String(',
    'data-remote-control="retry"',
    'data-retry-control={truth.retryControl || \'none\'}',
    'onRetry(truth)',
  ],
);

requireFragments(
  'Phase 10G tests',
  truthTest + '\n' + truthSourceTest,
  [
    'media error retry truth reports buffering without retry exposure',
    'media error retry truth allows user retry for focused network errors',
    'media error retry truth blocks retry when play activation is unavailable',
    'media error retry truth blocks retry after limit or unsupported source errors',
    'media error retry truth rejects media event mismatches and raw references',
    'media error retry truth panel does not add media, source creation, storage, or authority',
  ],
);

rejectFragments(
  'Phase 10G truth model executable',
  executableTruthModel,
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
    'assetBytes',
    'rawBody',
    'signedUrl',
    'objectUrl',
    'sourceUrl',
  ],
);

rejectFragments(
  'Phase 10G truth component executable',
  executableTruthComponent,
  [
    '<video',
    '<audio',
    'src=',
    'autoPlay',
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
  tvScripts['test:media-error-retry-truth'] !==
  'node --test src/media/tvMediaErrorRetryTruthModel.test.mjs src/media/TvMediaErrorRetryTruthPanel.source.test.mjs'
) {
  throw new Error(
    'TV Phase 10G media error retry truth test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:media-error-retry-truth'] !==
  'node ../../scripts/check-crablink-tv-media-error-retry-truth-boundary.mjs'
) {
  throw new Error(
    'TV Phase 10G media error retry truth boundary script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:media-error-retry-truth && npm run check:media-error-retry-truth',
  )
) {
  throw new Error(
    'TV package check chain does not include Phase 10G media error retry truth checks.',
  );
}

if (
  rootScripts['tv:media-error-retry-truth:test'] !==
  'npm --prefix apps/crablink-tv run test:media-error-retry-truth'
) {
  throw new Error(
    'Root Phase 10G media error retry truth test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:media-error-retry-truth:check'] !==
  'node scripts/check-crablink-tv-media-error-retry-truth-boundary.mjs'
) {
  throw new Error(
    'Root Phase 10G media error retry truth boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/media/tvMediaErrorRetryTruthModel.js',
  'apps/crablink-tv/src/media/tvMediaErrorRetryTruthModel.test.mjs',
  'apps/crablink-tv/src/media/TvMediaErrorRetryTruthPanel.jsx',
  'apps/crablink-tv/src/media/TvMediaErrorRetryTruthPanel.source.test.mjs',
  'scripts/check-crablink-tv-media-error-retry-truth-boundary.mjs',
]) {
  if (!makeCodebundle.includes(requiredPath)) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV media error retry truth boundary passed.',
);
console.log(
  'Truth: healthy, buffering, ended, and error player events project into explicit retry posture.',
);
console.log(
  'Retry: user-driven retry may be exposed only through focused Play activation and never as automatic retry.',
);
console.log(
  'Isolation: media elements, source creation, fetch, invoke, storage, autoplay, native plugin requirement, and authority remain absent.',
);
console.log('PHASE10G_MEDIA_ERROR_RETRY_TRUTH_MODEL=GREEN');
console.log('MEDIA_ERROR_RETRY_TRUTH=ADDED');
console.log('BUFFERING_TRUTH=ADDED');
console.log('USER_DRIVEN_RETRY_ONLY=ADDED');
console.log('AUTOMATIC_RETRY=BLOCKED');
console.log('MEDIA_ELEMENT_CHANGES=NOT_ADDED');
console.log('NEXT_PATCH=PHASE10H_PHASE10_ACCEPTANCE_BOUNDARY');
