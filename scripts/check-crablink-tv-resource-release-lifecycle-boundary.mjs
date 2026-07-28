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
      `Missing Phase 11C source: ${relativePath}`,
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

const phase11bBoundary =
  read('scripts/check-crablink-tv-continue-watching-store-adapter-boundary.mjs');

const model =
  read('apps/crablink-tv/src/media/tvResourceReleaseLifecycleModel.js');

const modelTest =
  read('apps/crablink-tv/src/media/tvResourceReleaseLifecycleModel.test.mjs');

const component =
  read('apps/crablink-tv/src/media/TvResourceReleaseLifecyclePanel.jsx');

const componentTest =
  read('apps/crablink-tv/src/media/TvResourceReleaseLifecyclePanel.source.test.mjs');

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
  'Phase 11B continue watching store adapter boundary',
  phase11bBoundary,
  [
    'PHASE11B_CONTINUE_WATCHING_STORE_ADAPTER=GREEN',
    'CONTINUE_WATCHING_STORE_ADAPTER=ADDED',
    'RESUME_UPSERT_REQUEST=ADDED',
    'RESUME_CLEAR_REQUEST=ADDED',
    'STORE_WRITE_SIDE_EFFECT=NOT_ADDED',
    'RESOURCE_RELEASE_SIDE_EFFECT=NOT_ADDED',
    'NEXT_PATCH=PHASE11C_RESOURCE_RELEASE_LIFECYCLE_ADAPTER',
  ],
);

requireFragments(
  'Phase 11C resource release lifecycle model',
  model,
  [
    'TV_RESOURCE_RELEASE_LIFECYCLE_SCHEMA',
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
    'storageFlushSideEffectAllowed: false',
    'RAW_ADAPTER_REFERENCE_REJECTED',
    'UPSTREAM_STORAGE_SIDE_EFFECT_REJECTED',
    'UPSTREAM_ADAPTER_EXECUTION_REJECTED',
    'UPSTREAM_RELEASE_SIDE_EFFECT_REJECTED',
  ],
);

requireFragments(
  'Phase 11C resource release lifecycle panel',
  component,
  [
    'TvResourceReleaseLifecyclePanel',
    'projectTvResourceReleaseLifecycle',
    'data-release-lifecycle-state={lifecycle.state}',
    'data-release-reason={lifecycle.releaseReason || \'none\'}',
    'data-release-plan-ready={String(lifecycle.releasePlanReady)}',
    'data-release-execution-allowed={String(',
    'data-player-mutation-allowed={String(',
    'data-handle-release-allowed={String(',
    'data-storage-flush-side-effect-allowed={String(',
    'data-remote-control="release-lifecycle-ready"',
  ],
);

requireFragments(
  'Phase 11C tests',
  modelTest + '\n' + componentTest,
  [
    'resource release lifecycle plans back release with progress flush',
    'resource release lifecycle plans ended release without pause',
    'resource release lifecycle plans error and unload release safely',
    'resource release lifecycle noops without release request',
    'resource release lifecycle rejects upstream side effects and raw references',
    'resource release lifecycle output has no direct release, storage, source creation, or authority fields',
    'resource release lifecycle panel does not add media, direct release, storage, source creation, or authority',
  ],
);

rejectFragments(
  'Phase 11C model executable',
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
  'Phase 11C component executable',
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
  tvScripts['test:resource-release-lifecycle'] !==
  'node --test src/media/tvResourceReleaseLifecycleModel.test.mjs src/media/TvResourceReleaseLifecyclePanel.source.test.mjs'
) {
  throw new Error(
    'TV Phase 11C resource release lifecycle test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:resource-release-lifecycle'] !==
  'node ../../scripts/check-crablink-tv-resource-release-lifecycle-boundary.mjs'
) {
  throw new Error(
    'TV Phase 11C resource release lifecycle boundary script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:resource-release-lifecycle && npm run check:resource-release-lifecycle',
  )
) {
  throw new Error(
    'TV package check chain does not include Phase 11C resource release lifecycle checks.',
  );
}

if (
  rootScripts['tv:resource-release-lifecycle:test'] !==
  'npm --prefix apps/crablink-tv run test:resource-release-lifecycle'
) {
  throw new Error(
    'Root Phase 11C resource release lifecycle test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:resource-release-lifecycle:check'] !==
  'node scripts/check-crablink-tv-resource-release-lifecycle-boundary.mjs'
) {
  throw new Error(
    'Root Phase 11C resource release lifecycle boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/media/tvResourceReleaseLifecycleModel.js',
  'apps/crablink-tv/src/media/tvResourceReleaseLifecycleModel.test.mjs',
  'apps/crablink-tv/src/media/TvResourceReleaseLifecyclePanel.jsx',
  'apps/crablink-tv/src/media/TvResourceReleaseLifecyclePanel.source.test.mjs',
  'scripts/check-crablink-tv-resource-release-lifecycle-boundary.mjs',
]) {
  if (!makeCodebundle.includes(requiredPath)) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV resource release lifecycle boundary passed.',
);
console.log(
  'Lifecycle: release requests become ordered pause, flush, detach, release-handle, and clear-focus plans.',
);
console.log(
  'Safety: lifecycle planning is side-effect-free; no player mutation, handle release, storage flush, or URL revocation is executed.',
);
console.log(
  'Isolation: media elements, source creation, fetch, invoke, native plugin requirement, and authority remain absent.',
);
console.log('PHASE11C_RESOURCE_RELEASE_LIFECYCLE_ADAPTER=GREEN');
console.log('RESOURCE_RELEASE_LIFECYCLE=ADDED');
console.log('ORDERED_RELEASE_STEPS=ADDED');
console.log('RELEASE_EXECUTION_SIDE_EFFECT=NOT_ADDED');
console.log('PLAYER_MUTATION_SIDE_EFFECT=NOT_ADDED');
console.log('HANDLE_RELEASE_SIDE_EFFECT=NOT_ADDED');
console.log('NEXT_PATCH=PHASE11D_RELEASE_EXECUTOR_BOUNDARY');
