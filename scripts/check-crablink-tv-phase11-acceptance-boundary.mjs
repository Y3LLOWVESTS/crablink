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
      `Missing Phase 11 acceptance source: ${relativePath}`,
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

const predecessorBoundaries = Object.freeze([
  [
    'Phase 10 acceptance',
    'scripts/check-crablink-tv-phase10-acceptance-boundary.mjs',
    [
      'PHASE10H_PHASE10_ACCEPTANCE_BOUNDARY=GREEN',
      'PHASE10_TRACK=COMPLETE',
      'VIDEO_PLAYBACK_SURFACE=ACCEPTED',
      'AUDIO_PLAYBACK_SURFACE=ACCEPTED',
      'MEDIA_ERROR_RETRY_TRUTH=ACCEPTED',
      'NEXT_PHASE=PHASE11_CONTINUE_WATCHING_AND_RESOURCE_RELEASE',
    ],
  ],
  [
    'Phase 11A continue watching resource',
    'scripts/check-crablink-tv-continue-watching-resource-boundary.mjs',
    [
      'PHASE11A_CONTINUE_WATCHING_RESOURCE_FOUNDATION=GREEN',
      'CONTINUE_WATCHING_TRUTH=ADDED',
      'RESOURCE_RELEASE_TRUTH=ADDED',
      'STORAGE_MUTATION=NOT_ADDED',
      'RESOURCE_RELEASE_SIDE_EFFECT=NOT_ADDED',
      'NEXT_PATCH=PHASE11B_CONTINUE_WATCHING_STORE_ADAPTER',
    ],
  ],
  [
    'Phase 11B continue watching store adapter',
    'scripts/check-crablink-tv-continue-watching-store-adapter-boundary.mjs',
    [
      'PHASE11B_CONTINUE_WATCHING_STORE_ADAPTER=GREEN',
      'CONTINUE_WATCHING_STORE_ADAPTER=ADDED',
      'RESUME_UPSERT_REQUEST=ADDED',
      'RESUME_CLEAR_REQUEST=ADDED',
      'STORE_WRITE_SIDE_EFFECT=NOT_ADDED',
      'RESOURCE_RELEASE_SIDE_EFFECT=NOT_ADDED',
      'NEXT_PATCH=PHASE11C_RESOURCE_RELEASE_LIFECYCLE_ADAPTER',
    ],
  ],
  [
    'Phase 11C resource release lifecycle',
    'scripts/check-crablink-tv-resource-release-lifecycle-boundary.mjs',
    [
      'PHASE11C_RESOURCE_RELEASE_LIFECYCLE_ADAPTER=GREEN',
      'RESOURCE_RELEASE_LIFECYCLE=ADDED',
      'ORDERED_RELEASE_STEPS=ADDED',
      'RELEASE_EXECUTION_SIDE_EFFECT=NOT_ADDED',
      'PLAYER_MUTATION_SIDE_EFFECT=NOT_ADDED',
      'HANDLE_RELEASE_SIDE_EFFECT=NOT_ADDED',
      'NEXT_PATCH=PHASE11D_RELEASE_EXECUTOR_BOUNDARY',
    ],
  ],
  [
    'Phase 11D release executor boundary',
    'scripts/check-crablink-tv-resource-release-executor-boundary.mjs',
    [
      'PHASE11D_RELEASE_EXECUTOR_BOUNDARY=GREEN',
      'RESOURCE_RELEASE_EXECUTOR_BOUNDARY=ADDED',
      'ORDERED_EXECUTOR_COMMAND_QUEUE=ADDED',
      'DIRECT_RELEASE_EXECUTION=NOT_ADDED',
      'PLAYER_MUTATION_SIDE_EFFECT=NOT_ADDED',
      'STORAGE_MUTATION_SIDE_EFFECT=NOT_ADDED',
      'HANDLE_RELEASE_SIDE_EFFECT=NOT_ADDED',
      'NEXT_PATCH=PHASE11E_PHASE11_ACCEPTANCE_BOUNDARY',
    ],
  ],
]);

for (const [label, relativePath, fragments] of predecessorBoundaries) {
  requireFragments(label, read(relativePath), fragments);
}

const runtimeFiles = Object.freeze([
  [
    'Phase 11A continue watching resource model',
    'apps/crablink-tv/src/media/tvContinueWatchingResourceModel.js',
    [
      'crablink.tv.continue-watching-resource.v1',
      'projectTvContinueWatchingResourceTruth',
      'RESUME_CANDIDATE',
      'COMPLETE',
      'storageMutationRequested: false',
      'releaseSideEffectAllowed: false',
      'RAW_PROGRESS_REFERENCE_REJECTED',
    ],
  ],
  [
    'Phase 11B continue watching store adapter model',
    'apps/crablink-tv/src/media/tvContinueWatchingStoreAdapterModel.js',
    [
      'crablink.tv.continue-watching-store-adapter.v1',
      'projectTvContinueWatchingStoreAdapter',
      'UPSERT_RESUME',
      'CLEAR_RESUME',
      'storeWriteRequested: true',
      'storageSideEffectAllowed: false',
      'adapterExecutionAllowed: false',
      'releaseSideEffectAllowed: false',
    ],
  ],
  [
    'Phase 11C resource release lifecycle model',
    'apps/crablink-tv/src/media/tvResourceReleaseLifecycleModel.js',
    [
      'crablink.tv.resource-release-lifecycle.v1',
      'projectTvResourceReleaseLifecycle',
      'PAUSE_PLAYER',
      'FLUSH_PROGRESS',
      'DETACH_PLAYER_ELEMENT',
      'RELEASE_MEDIA_HANDLE',
      'CLEAR_FOCUS',
      'releaseExecutionAllowed: false',
      'playerMutationAllowed: false',
      'handleReleaseAllowed: false',
    ],
  ],
  [
    'Phase 11D resource release executor boundary model',
    'apps/crablink-tv/src/media/tvResourceReleaseExecutorBoundaryModel.js',
    [
      'crablink.tv.resource-release-executor-boundary.v1',
      'projectTvResourceReleaseExecutorBoundary',
      'QUEUE_RELEASE_LIFECYCLE',
      'REQUEST_PAUSE',
      'REQUEST_PROGRESS_FLUSH',
      'REQUEST_PLAYER_DETACH',
      'REQUEST_HANDLE_RELEASE',
      'REQUEST_FOCUS_CLEAR',
      'directExecutionAllowed: false',
      'playerMutationAllowed: false',
      'storageMutationAllowed: false',
      'handleReleaseAllowed: false',
    ],
  ],
]);

for (const [label, relativePath, fragments] of runtimeFiles) {
  requireFragments(label, read(relativePath), fragments);
}

const panelFiles = Object.freeze([
  [
    'Phase 11A continue watching resource panel',
    'apps/crablink-tv/src/media/TvContinueWatchingResourcePanel.jsx',
    [
      'TvContinueWatchingResourcePanel',
      'projectTvContinueWatchingResourceTruth',
      'data-persist-candidate={String(truth.persistCandidate)}',
      'data-storage-mutation-requested={String(',
      'data-release-side-effect-allowed={String(',
    ],
  ],
  [
    'Phase 11B continue watching store adapter panel',
    'apps/crablink-tv/src/media/TvContinueWatchingStoreAdapterPanel.jsx',
    [
      'TvContinueWatchingStoreAdapterPanel',
      'projectTvContinueWatchingStoreAdapter',
      'data-store-write-requested={String(adapter.storeWriteRequested)}',
      'data-storage-side-effect-allowed={String(',
      'data-adapter-execution-allowed={String(',
    ],
  ],
  [
    'Phase 11C resource release lifecycle panel',
    'apps/crablink-tv/src/media/TvResourceReleaseLifecyclePanel.jsx',
    [
      'TvResourceReleaseLifecyclePanel',
      'projectTvResourceReleaseLifecycle',
      'data-release-plan-ready={String(lifecycle.releasePlanReady)}',
      'data-release-execution-allowed={String(',
      'data-player-mutation-allowed={String(',
      'data-handle-release-allowed={String(',
    ],
  ],
  [
    'Phase 11D resource release executor boundary panel',
    'apps/crablink-tv/src/media/TvResourceReleaseExecutorBoundaryPanel.jsx',
    [
      'TvResourceReleaseExecutorBoundaryPanel',
      'projectTvResourceReleaseExecutorBoundary',
      'data-executor-boundary-ready={String(',
      'data-direct-execution-allowed={String(',
      'data-player-mutation-allowed={String(',
      'data-storage-mutation-allowed={String(',
      'data-handle-release-allowed={String(',
    ],
  ],
]);

for (const [label, relativePath, fragments] of panelFiles) {
  requireFragments(label, read(relativePath), fragments);
}

const executableRuntime =
  [
    'apps/crablink-tv/src/media/tvContinueWatchingResourceModel.js',
    'apps/crablink-tv/src/media/TvContinueWatchingResourcePanel.jsx',
    'apps/crablink-tv/src/media/tvContinueWatchingStoreAdapterModel.js',
    'apps/crablink-tv/src/media/TvContinueWatchingStoreAdapterPanel.jsx',
    'apps/crablink-tv/src/media/tvResourceReleaseLifecycleModel.js',
    'apps/crablink-tv/src/media/TvResourceReleaseLifecyclePanel.jsx',
    'apps/crablink-tv/src/media/tvResourceReleaseExecutorBoundaryModel.js',
    'apps/crablink-tv/src/media/TvResourceReleaseExecutorBoundaryPanel.jsx',
  ]
    .map((relativePath) => stripComments(read(relativePath)))
    .join('\n');

rejectFragments(
  'Phase 11 acceptance runtime executable',
  executableRuntime,
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
    'assetBytes',
    'rawBody',
    'signedUrl',
    'objectUrl',
    'sourceUrl',
  ],
);

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

const requiredTvScripts = Object.freeze({
  'test:continue-watching-resource':
    'node --test src/media/tvContinueWatchingResourceModel.test.mjs src/media/TvContinueWatchingResourcePanel.source.test.mjs',
  'check:continue-watching-resource':
    'node ../../scripts/check-crablink-tv-continue-watching-resource-boundary.mjs',
  'test:continue-watching-store-adapter':
    'node --test src/media/tvContinueWatchingStoreAdapterModel.test.mjs src/media/TvContinueWatchingStoreAdapterPanel.source.test.mjs',
  'check:continue-watching-store-adapter':
    'node ../../scripts/check-crablink-tv-continue-watching-store-adapter-boundary.mjs',
  'test:resource-release-lifecycle':
    'node --test src/media/tvResourceReleaseLifecycleModel.test.mjs src/media/TvResourceReleaseLifecyclePanel.source.test.mjs',
  'check:resource-release-lifecycle':
    'node ../../scripts/check-crablink-tv-resource-release-lifecycle-boundary.mjs',
  'test:resource-release-executor-boundary':
    'node --test src/media/tvResourceReleaseExecutorBoundaryModel.test.mjs src/media/TvResourceReleaseExecutorBoundaryPanel.source.test.mjs',
  'check:resource-release-executor-boundary':
    'node ../../scripts/check-crablink-tv-resource-release-executor-boundary.mjs',
  'test:phase11-acceptance':
    'node --test src/media/tvPhase11AcceptanceBoundary.source.test.mjs',
  'check:phase11-acceptance':
    'node ../../scripts/check-crablink-tv-phase11-acceptance-boundary.mjs',
});

for (const [scriptName, expectedCommand] of Object.entries(requiredTvScripts)) {
  if (tvScripts[scriptName] !== expectedCommand) {
    throw new Error(`TV script ${scriptName} is missing or incorrect.`);
  }
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:phase11-acceptance && npm run check:phase11-acceptance',
  )
) {
  throw new Error(
    'TV package check chain does not include Phase 11 acceptance checks.',
  );
}

const requiredRootScripts = Object.freeze({
  'tv:phase11:acceptance:test':
    'npm --prefix apps/crablink-tv run test:phase11-acceptance',
  'tv:phase11:acceptance:check':
    'node scripts/check-crablink-tv-phase11-acceptance-boundary.mjs',
});

for (const [scriptName, expectedCommand] of Object.entries(requiredRootScripts)) {
  if (rootScripts[scriptName] !== expectedCommand) {
    throw new Error(`Root script ${scriptName} is missing or incorrect.`);
  }
}

const makeCodebundle =
  read('scripts/make_codebundle.sh');

for (const requiredPath of [
  'apps/crablink-tv/src/media/tvPhase11AcceptanceBoundary.source.test.mjs',
  'scripts/check-crablink-tv-phase11-acceptance-boundary.mjs',
]) {
  if (!makeCodebundle.includes(requiredPath)) {
    throw new Error(`Future codebundle coverage missing: ${requiredPath}`);
  }
}

console.log('CrabLink TV Phase 11 acceptance boundary passed.');
console.log(
  'Acceptance: Phase 11A through Phase 11D markers and successor chain are present.',
);
console.log(
  'Continue watching: resume candidate truth, completed playback clear requests, and bounded store adapter requests are accepted.',
);
console.log(
  'Release: ordered lifecycle plans and executor command queues are accepted as side-effect-free requests.',
);
console.log(
  'Isolation: storage writes, player mutation, handle release, source creation, fetch, invoke, native plugin requirement, wallet, ledger, ROC authority, finality, and provider fallback remain absent.',
);
console.log('PHASE11E_PHASE11_ACCEPTANCE_BOUNDARY=GREEN');
console.log('PHASE11_TRACK=COMPLETE');
console.log('CONTINUE_WATCHING_TRUTH=ACCEPTED');
console.log('CONTINUE_WATCHING_STORE_ADAPTER=ACCEPTED');
console.log('RESOURCE_RELEASE_LIFECYCLE=ACCEPTED');
console.log('RESOURCE_RELEASE_EXECUTOR_BOUNDARY=ACCEPTED');
console.log('DIRECT_RELEASE_EXECUTION=NOT_ADDED');
console.log('STORAGE_MUTATION_SIDE_EFFECT=NOT_ADDED');
console.log('PLAYER_MUTATION_SIDE_EFFECT=NOT_ADDED');
console.log('HANDLE_RELEASE_SIDE_EFFECT=NOT_ADDED');
console.log('NEXT_PHASE=NATIVE_PASSPORT_PHASE16_TV_DELEGATED_INTEGRATION');
