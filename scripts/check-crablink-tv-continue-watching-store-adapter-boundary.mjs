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
      `Missing Phase 11B source: ${relativePath}`,
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

const phase11aBoundary =
  read('scripts/check-crablink-tv-continue-watching-resource-boundary.mjs');

const model =
  read('apps/crablink-tv/src/media/tvContinueWatchingStoreAdapterModel.js');

const modelTest =
  read('apps/crablink-tv/src/media/tvContinueWatchingStoreAdapterModel.test.mjs');

const component =
  read('apps/crablink-tv/src/media/TvContinueWatchingStoreAdapterPanel.jsx');

const componentTest =
  read('apps/crablink-tv/src/media/TvContinueWatchingStoreAdapterPanel.source.test.mjs');

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
  'Phase 11A continue watching resource boundary',
  phase11aBoundary,
  [
    'PHASE11A_CONTINUE_WATCHING_RESOURCE_FOUNDATION=GREEN',
    'CONTINUE_WATCHING_TRUTH=ADDED',
    'RESOURCE_RELEASE_TRUTH=ADDED',
    'STORAGE_MUTATION=NOT_ADDED',
    'RESOURCE_RELEASE_SIDE_EFFECT=NOT_ADDED',
    'NEXT_PATCH=PHASE11B_CONTINUE_WATCHING_STORE_ADAPTER',
  ],
);

requireFragments(
  'Phase 11B continue watching store adapter model',
  model,
  [
    'TV_CONTINUE_WATCHING_STORE_ADAPTER_SCHEMA',
    'crablink.tv.continue-watching-store-adapter.v1',
    'TV_CONTINUE_WATCHING_STORE_OPERATION_SCHEMA',
    'crablink.tv.continue-watching-store-operation.v1',
    'projectTvContinueWatchingStoreAdapter',
    'UPSERT_RESUME',
    'CLEAR_RESUME',
    'storeWriteRequested: true',
    'storageSideEffectAllowed: false',
    'adapterExecutionAllowed: false',
    'releaseSideEffectAllowed: false',
    'RAW_RESOURCE_REFERENCE_REJECTED',
    'UPSTREAM_STORAGE_MUTATION_REJECTED',
    'UPSTREAM_RELEASE_SIDE_EFFECT_REJECTED',
  ],
);

requireFragments(
  'Phase 11B continue watching store adapter panel',
  component,
  [
    'TvContinueWatchingStoreAdapterPanel',
    'projectTvContinueWatchingStoreAdapter',
    'data-store-adapter-state={adapter.state}',
    'data-store-operation={adapter.operation}',
    'data-store-write-requested={String(adapter.storeWriteRequested)}',
    'data-storage-side-effect-allowed={String(',
    'data-adapter-execution-allowed={String(',
    'data-release-operation={adapter.releaseOperation}',
    'data-release-side-effect-allowed={String(',
    'data-remote-control="queue-store-operation"',
    'data-remote-control="queue-release-operation"',
  ],
);

requireFragments(
  'Phase 11B tests',
  modelTest + '\n' + componentTest,
  [
    'continue watching store adapter requests video resume upsert without executing storage',
    'continue watching store adapter requests audio resume upsert without executing storage',
    'continue watching store adapter requests clear for completed playback',
    'continue watching store adapter preserves release request as side-effect-free intent',
    'continue watching store adapter noops when progress is not a resume candidate',
    'continue watching store adapter rejects upstream mutation and raw media references',
    'continue watching store adapter panel does not add media, direct storage, source creation, or authority',
  ],
);

rejectFragments(
  'Phase 11B model executable',
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
  'Phase 11B component executable',
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
  tvScripts['test:continue-watching-store-adapter'] !==
  'node --test src/media/tvContinueWatchingStoreAdapterModel.test.mjs src/media/TvContinueWatchingStoreAdapterPanel.source.test.mjs'
) {
  throw new Error(
    'TV Phase 11B continue watching store adapter test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:continue-watching-store-adapter'] !==
  'node ../../scripts/check-crablink-tv-continue-watching-store-adapter-boundary.mjs'
) {
  throw new Error(
    'TV Phase 11B continue watching store adapter boundary script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:continue-watching-store-adapter && npm run check:continue-watching-store-adapter',
  )
) {
  throw new Error(
    'TV package check chain does not include Phase 11B continue watching store adapter checks.',
  );
}

if (
  rootScripts['tv:continue-watching-store-adapter:test'] !==
  'npm --prefix apps/crablink-tv run test:continue-watching-store-adapter'
) {
  throw new Error(
    'Root Phase 11B continue watching store adapter test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:continue-watching-store-adapter:check'] !==
  'node scripts/check-crablink-tv-continue-watching-store-adapter-boundary.mjs'
) {
  throw new Error(
    'Root Phase 11B continue watching store adapter boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/media/tvContinueWatchingStoreAdapterModel.js',
  'apps/crablink-tv/src/media/tvContinueWatchingStoreAdapterModel.test.mjs',
  'apps/crablink-tv/src/media/TvContinueWatchingStoreAdapterPanel.jsx',
  'apps/crablink-tv/src/media/TvContinueWatchingStoreAdapterPanel.source.test.mjs',
  'scripts/check-crablink-tv-continue-watching-store-adapter-boundary.mjs',
]) {
  if (!makeCodebundle.includes(requiredPath)) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV continue-watching store adapter boundary passed.',
);
console.log(
  'Adapter: resume upsert and completed-playback clear requests are modeled from Phase 11A truth.',
);
console.log(
  'Release: release requests remain side-effect-free adapter intent.',
);
console.log(
  'Isolation: direct storage writes, source creation, fetch, invoke, native plugin requirement, and authority remain absent.',
);
console.log('PHASE11B_CONTINUE_WATCHING_STORE_ADAPTER=GREEN');
console.log('CONTINUE_WATCHING_STORE_ADAPTER=ADDED');
console.log('RESUME_UPSERT_REQUEST=ADDED');
console.log('RESUME_CLEAR_REQUEST=ADDED');
console.log('STORE_WRITE_SIDE_EFFECT=NOT_ADDED');
console.log('RESOURCE_RELEASE_SIDE_EFFECT=NOT_ADDED');
console.log('NEXT_PATCH=PHASE11C_RESOURCE_RELEASE_LIFECYCLE_ADAPTER');
