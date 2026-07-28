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
      `Missing Phase 11D source: ${relativePath}`,
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

const phase11cBoundary =
  read('scripts/check-crablink-tv-resource-release-lifecycle-boundary.mjs');

const model =
  read('apps/crablink-tv/src/media/tvResourceReleaseExecutorBoundaryModel.js');

const modelTest =
  read('apps/crablink-tv/src/media/tvResourceReleaseExecutorBoundaryModel.test.mjs');

const component =
  read('apps/crablink-tv/src/media/TvResourceReleaseExecutorBoundaryPanel.jsx');

const componentTest =
  read('apps/crablink-tv/src/media/TvResourceReleaseExecutorBoundaryPanel.source.test.mjs');

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
  'Phase 11C resource release lifecycle boundary',
  phase11cBoundary,
  [
    'PHASE11C_RESOURCE_RELEASE_LIFECYCLE_ADAPTER=GREEN',
    'RESOURCE_RELEASE_LIFECYCLE=ADDED',
    'ORDERED_RELEASE_STEPS=ADDED',
    'RELEASE_EXECUTION_SIDE_EFFECT=NOT_ADDED',
    'PLAYER_MUTATION_SIDE_EFFECT=NOT_ADDED',
    'HANDLE_RELEASE_SIDE_EFFECT=NOT_ADDED',
    'NEXT_PATCH=PHASE11D_RELEASE_EXECUTOR_BOUNDARY',
  ],
);

requireFragments(
  'Phase 11D resource release executor boundary model',
  model,
  [
    'TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_SCHEMA',
    'crablink.tv.resource-release-executor-boundary.v1',
    'TV_RESOURCE_RELEASE_EXECUTOR_COMMAND_SCHEMA',
    'crablink.tv.resource-release-executor-command.v1',
    'projectTvResourceReleaseExecutorBoundary',
    'QUEUE_RELEASE_LIFECYCLE',
    'REQUEST_PAUSE',
    'REQUEST_PROGRESS_FLUSH',
    'REQUEST_PLAYER_DETACH',
    'REQUEST_HANDLE_RELEASE',
    'REQUEST_FOCUS_CLEAR',
    'executorBoundaryReady: true',
    'directExecutionAllowed: false',
    'playerMutationAllowed: false',
    'storageMutationAllowed: false',
    'handleReleaseAllowed: false',
    'sourceReleaseAllowed: false',
    'RAW_LIFECYCLE_REFERENCE_REJECTED',
    'UPSTREAM_RELEASE_EXECUTION_REJECTED',
    'UPSTREAM_PLAYER_MUTATION_REJECTED',
    'UPSTREAM_HANDLE_RELEASE_REJECTED',
    'UPSTREAM_STORAGE_FLUSH_REJECTED',
  ],
);

requireFragments(
  'Phase 11D resource release executor boundary panel',
  component,
  [
    'TvResourceReleaseExecutorBoundaryPanel',
    'projectTvResourceReleaseExecutorBoundary',
    'data-release-executor-state={boundary.state}',
    'data-release-executor-operation={boundary.operation}',
    'data-executor-boundary-ready={String(',
    'data-direct-execution-allowed={String(',
    'data-player-mutation-allowed={String(',
    'data-storage-mutation-allowed={String(',
    'data-handle-release-allowed={String(',
    'data-executor-command={command.command}',
    'data-direct-effect-allowed={String(',
    'data-remote-control="queue-release-executor"',
  ],
);

requireFragments(
  'Phase 11D tests',
  modelTest + '\n' + componentTest,
  [
    'resource release executor boundary queues ordered video release commands',
    'resource release executor boundary queues ended audio release without pause',
    'resource release executor boundary noops for noop lifecycle views',
    'resource release executor boundary rejects invalid lifecycle steps',
    'resource release executor boundary rejects upstream side effects and raw references',
    'resource release executor boundary output has no direct release, storage, source creation, or authority fields',
    'resource release executor boundary panel does not add media, direct release, storage, source creation, or authority',
  ],
);

rejectFragments(
  'Phase 11D model executable',
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
  'Phase 11D component executable',
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
  tvScripts['test:resource-release-executor-boundary'] !==
  'node --test src/media/tvResourceReleaseExecutorBoundaryModel.test.mjs src/media/TvResourceReleaseExecutorBoundaryPanel.source.test.mjs'
) {
  throw new Error(
    'TV Phase 11D resource release executor boundary test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:resource-release-executor-boundary'] !==
  'node ../../scripts/check-crablink-tv-resource-release-executor-boundary.mjs'
) {
  throw new Error(
    'TV Phase 11D resource release executor boundary script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:resource-release-executor-boundary && npm run check:resource-release-executor-boundary',
  )
) {
  throw new Error(
    'TV package check chain does not include Phase 11D resource release executor boundary checks.',
  );
}

if (
  rootScripts['tv:resource-release-executor-boundary:test'] !==
  'npm --prefix apps/crablink-tv run test:resource-release-executor-boundary'
) {
  throw new Error(
    'Root Phase 11D resource release executor boundary test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:resource-release-executor-boundary:check'] !==
  'node scripts/check-crablink-tv-resource-release-executor-boundary.mjs'
) {
  throw new Error(
    'Root Phase 11D resource release executor boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/media/tvResourceReleaseExecutorBoundaryModel.js',
  'apps/crablink-tv/src/media/tvResourceReleaseExecutorBoundaryModel.test.mjs',
  'apps/crablink-tv/src/media/TvResourceReleaseExecutorBoundaryPanel.jsx',
  'apps/crablink-tv/src/media/TvResourceReleaseExecutorBoundaryPanel.source.test.mjs',
  'scripts/check-crablink-tv-resource-release-executor-boundary.mjs',
]) {
  if (!makeCodebundle.includes(requiredPath)) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV resource release executor boundary passed.',
);
console.log(
  'Executor: lifecycle plans become ordered, bounded executor command queues.',
);
console.log(
  'Safety: executor boundary requires user intent and keeps direct execution, player mutation, storage mutation, and handle release disabled.',
);
console.log(
  'Isolation: media elements, source creation, fetch, invoke, native plugin requirement, and authority remain absent.',
);
console.log('PHASE11D_RELEASE_EXECUTOR_BOUNDARY=GREEN');
console.log('RESOURCE_RELEASE_EXECUTOR_BOUNDARY=ADDED');
console.log('ORDERED_EXECUTOR_COMMAND_QUEUE=ADDED');
console.log('DIRECT_RELEASE_EXECUTION=NOT_ADDED');
console.log('PLAYER_MUTATION_SIDE_EFFECT=NOT_ADDED');
console.log('STORAGE_MUTATION_SIDE_EFFECT=NOT_ADDED');
console.log('HANDLE_RELEASE_SIDE_EFFECT=NOT_ADDED');
console.log('NEXT_PATCH=PHASE11E_PHASE11_ACCEPTANCE_BOUNDARY');
