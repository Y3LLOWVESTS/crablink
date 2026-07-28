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
      `Missing Phase 11A source: ${relativePath}`,
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

const phase10Acceptance =
  read('scripts/check-crablink-tv-phase10-acceptance-boundary.mjs');

const model =
  read('apps/crablink-tv/src/media/tvContinueWatchingResourceModel.js');

const modelTest =
  read('apps/crablink-tv/src/media/tvContinueWatchingResourceModel.test.mjs');

const component =
  read('apps/crablink-tv/src/media/TvContinueWatchingResourcePanel.jsx');

const componentTest =
  read('apps/crablink-tv/src/media/TvContinueWatchingResourcePanel.source.test.mjs');

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
  'Phase 10 acceptance boundary',
  phase10Acceptance,
  [
    'PHASE10H_PHASE10_ACCEPTANCE_BOUNDARY=GREEN',
    'PHASE10_TRACK=COMPLETE',
    'VIDEO_PLAYBACK_SURFACE=ACCEPTED',
    'AUDIO_PLAYBACK_SURFACE=ACCEPTED',
    'MEDIA_ERROR_RETRY_TRUTH=ACCEPTED',
    'NEXT_PHASE=PHASE11_CONTINUE_WATCHING_AND_RESOURCE_RELEASE',
  ],
);

requireFragments(
  'Phase 11A continue watching resource model',
  model,
  [
    'TV_CONTINUE_WATCHING_RESOURCE_SCHEMA',
    'crablink.tv.continue-watching-resource.v1',
    'TV_PLAYBACK_PROGRESS_EVENT_SCHEMA',
    'crablink.tv.playback-progress-event.v1',
    'projectTvContinueWatchingResourceTruth',
    'RESUME_CANDIDATE',
    'COMPLETE',
    'TV_RESOURCE_RELEASE_REASON',
    'storageMutationRequested: false',
    'releaseSideEffectAllowed: false',
    'RAW_PROGRESS_REFERENCE_REJECTED',
    'AUTOPLAY_NOT_ALLOWED',
  ],
);

requireFragments(
  'Phase 11A continue watching resource panel',
  component,
  [
    'TvContinueWatchingResourcePanel',
    'projectTvContinueWatchingResourceTruth',
    'data-continue-watching-state={truth.state}',
    'data-persist-candidate={String(truth.persistCandidate)}',
    'data-storage-mutation-requested={String(',
    'data-release-requested={String(truth.releaseRequested)}',
    'data-release-side-effect-allowed={String(',
    'data-remote-control="persist-candidate"',
    'data-remote-control="release-requested"',
  ],
);

requireFragments(
  'Phase 11A tests',
  modelTest + '\n' + componentTest,
  [
    'continue watching resource truth marks video resume candidate',
    'continue watching resource truth marks audio resume candidate',
    'continue watching resource truth does not persist below threshold',
    'continue watching resource truth marks complete near the end',
    'continue watching resource truth requests release for back, error, and unload',
    'continue watching resource truth rejects mismatches and raw progress references',
    'continue watching resource panel does not add media, source creation, storage, or authority',
  ],
);

rejectFragments(
  'Phase 11A model executable',
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
    'assetBytes',
    'rawBody',
    'signedUrl',
    'objectUrl',
    'sourceUrl',
  ],
);

rejectFragments(
  'Phase 11A component executable',
  executableComponent,
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
  tvScripts['test:continue-watching-resource'] !==
  'node --test src/media/tvContinueWatchingResourceModel.test.mjs src/media/TvContinueWatchingResourcePanel.source.test.mjs'
) {
  throw new Error(
    'TV Phase 11A continue watching resource test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:continue-watching-resource'] !==
  'node ../../scripts/check-crablink-tv-continue-watching-resource-boundary.mjs'
) {
  throw new Error(
    'TV Phase 11A continue watching resource boundary script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:continue-watching-resource && npm run check:continue-watching-resource',
  )
) {
  throw new Error(
    'TV package check chain does not include Phase 11A continue watching resource checks.',
  );
}

if (
  rootScripts['tv:continue-watching-resource:test'] !==
  'npm --prefix apps/crablink-tv run test:continue-watching-resource'
) {
  throw new Error(
    'Root Phase 11A continue watching resource test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:continue-watching-resource:check'] !==
  'node scripts/check-crablink-tv-continue-watching-resource-boundary.mjs'
) {
  throw new Error(
    'Root Phase 11A continue watching resource boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/media/tvContinueWatchingResourceModel.js',
  'apps/crablink-tv/src/media/tvContinueWatchingResourceModel.test.mjs',
  'apps/crablink-tv/src/media/TvContinueWatchingResourcePanel.jsx',
  'apps/crablink-tv/src/media/TvContinueWatchingResourcePanel.source.test.mjs',
  'scripts/check-crablink-tv-continue-watching-resource-boundary.mjs',
]) {
  if (!makeCodebundle.includes(requiredPath)) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV continue-watching resource boundary passed.',
);
console.log(
  'Progress: verified video/audio players project resume candidates and complete playback truth.',
);
console.log(
  'Release: back, ended, error, and unload release intent is explicit but side-effect free.',
);
console.log(
  'Isolation: storage mutation, resource revocation, source creation, fetch, invoke, native plugin requirement, and authority remain absent.',
);
console.log('PHASE11A_CONTINUE_WATCHING_RESOURCE_FOUNDATION=GREEN');
console.log('CONTINUE_WATCHING_TRUTH=ADDED');
console.log('RESOURCE_RELEASE_TRUTH=ADDED');
console.log('STORAGE_MUTATION=NOT_ADDED');
console.log('RESOURCE_RELEASE_SIDE_EFFECT=NOT_ADDED');
console.log('MEDIA_ELEMENT_CHANGES=NOT_ADDED');
console.log('NEXT_PATCH=PHASE11B_CONTINUE_WATCHING_STORE_ADAPTER');
