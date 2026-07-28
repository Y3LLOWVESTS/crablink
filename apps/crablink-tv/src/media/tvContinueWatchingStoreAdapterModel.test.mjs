import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_CONTINUE_WATCHING_STORE_ADAPTER_SCHEMA,
  TV_CONTINUE_WATCHING_STORE_ADAPTER_STATE,
  TV_CONTINUE_WATCHING_STORE_OPERATION,
  TV_CONTINUE_WATCHING_RELEASE_OPERATION,
  projectTvContinueWatchingStoreAdapter,
} from './tvContinueWatchingStoreAdapterModel.js';

function resourceTruth(overrides = {}) {
  return {
    schema: 'crablink.tv.continue-watching-resource.v1',
    state: 'ready',
    mediaKind: 'video',
    mediaHandleId: 'media-handle-store-video',
    canonicalCrabUrl: 'crab://creator.example/video/store',
    cid: 'b3:store-video',
    contentType: 'video/mp4',
    positionSeconds: 120,
    durationSeconds: 600,
    progressRatio: 0.2,
    continueWatchingPosture: 'resume-candidate',
    persistCandidate: true,
    persistAllowed: true,
    storageMutationRequested: false,
    releaseRequested: false,
    releaseReason: '',
    releaseSideEffectAllowed: false,
    completed: false,
    ...overrides,
  };
}

test('continue watching store adapter projects idle without input', () => {
  const adapter =
    projectTvContinueWatchingStoreAdapter(null);

  assert.equal(
    adapter.schema,
    TV_CONTINUE_WATCHING_STORE_ADAPTER_SCHEMA,
  );
  assert.equal(
    adapter.state,
    TV_CONTINUE_WATCHING_STORE_ADAPTER_STATE.IDLE,
  );
  assert.equal(
    adapter.operation,
    TV_CONTINUE_WATCHING_STORE_OPERATION.NOOP,
  );
  assert.equal(adapter.storeWriteRequested, false);
  assert.equal(adapter.storageSideEffectAllowed, false);
  assert.equal(adapter.adapterExecutionAllowed, false);
});

test('continue watching store adapter requests video resume upsert without executing storage', () => {
  const adapter =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth(),
    });

  assert.equal(
    adapter.state,
    TV_CONTINUE_WATCHING_STORE_ADAPTER_STATE.READY,
  );
  assert.equal(
    adapter.operation,
    TV_CONTINUE_WATCHING_STORE_OPERATION.UPSERT_RESUME,
  );
  assert.equal(adapter.mediaKind, 'video');
  assert.equal(adapter.storeWriteRequested, true);
  assert.equal(adapter.storageSideEffectAllowed, false);
  assert.equal(adapter.adapterExecutionAllowed, false);
  assert.match(adapter.storeKey, /^continue:video:/u);
});

test('continue watching store adapter requests audio resume upsert without executing storage', () => {
  const adapter =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth({
        mediaKind: 'audio',
        mediaHandleId: 'media-handle-store-audio',
        canonicalCrabUrl: 'crab://creator.example/audio/store',
        cid: 'b3:store-audio',
        contentType: 'audio/mpeg',
      }),
    });

  assert.equal(
    adapter.operation,
    TV_CONTINUE_WATCHING_STORE_OPERATION.UPSERT_RESUME,
  );
  assert.equal(adapter.mediaKind, 'audio');
  assert.match(adapter.storeKey, /^continue:audio:/u);
  assert.equal(adapter.contentType, 'audio/mpeg');
});

test('continue watching store adapter requests clear for completed playback', () => {
  const adapter =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth({
        completed: true,
        persistCandidate: false,
        persistAllowed: false,
        continueWatchingPosture: 'complete',
        positionSeconds: 590,
        durationSeconds: 600,
        progressRatio: 0.9833,
      }),
    });

  assert.equal(
    adapter.operation,
    TV_CONTINUE_WATCHING_STORE_OPERATION.CLEAR_RESUME,
  );
  assert.equal(adapter.completed, true);
  assert.equal(adapter.storeWriteRequested, true);
  assert.equal(adapter.storageSideEffectAllowed, false);
});

test('continue watching store adapter preserves release request as side-effect-free intent', () => {
  const adapter =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth({
        releaseRequested: true,
        releaseReason: 'back',
      }),
    });

  assert.equal(
    adapter.releaseOperation,
    TV_CONTINUE_WATCHING_RELEASE_OPERATION.RELEASE_REQUESTED,
  );
  assert.equal(adapter.releaseRequested, true);
  assert.equal(adapter.releaseReason, 'back');
  assert.equal(adapter.releaseSideEffectAllowed, false);
});

test('continue watching store adapter noops when progress is not a resume candidate', () => {
  const adapter =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth({
        continueWatchingPosture: 'none',
        persistCandidate: false,
        persistAllowed: false,
        positionSeconds: 5,
        progressRatio: 0.0083,
      }),
    });

  assert.equal(
    adapter.state,
    TV_CONTINUE_WATCHING_STORE_ADAPTER_STATE.NOOP,
  );
  assert.equal(
    adapter.operation,
    TV_CONTINUE_WATCHING_STORE_OPERATION.NOOP,
  );
  assert.equal(adapter.storeWriteRequested, false);
});

test('continue watching store adapter rejects stale schema and non-ready truth', () => {
  const stale =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth({
        schema: 'crablink.tv.old-resource.v0',
      }),
    });

  assert.equal(
    stale.problem.code,
    'UNSUPPORTED_RESOURCE_TRUTH_SCHEMA',
  );

  const nonReady =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth({
        state: 'rejected',
      }),
    });

  assert.equal(nonReady.problem.code, 'RESOURCE_TRUTH_NOT_READY');
});

test('continue watching store adapter rejects unsupported media kind and missing identity', () => {
  const unsupportedKind =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth({
        mediaKind: 'image',
      }),
    });

  assert.equal(
    unsupportedKind.problem.code,
    'RESOURCE_MEDIA_KIND_UNSUPPORTED',
  );

  const missingHandle =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth({
        mediaHandleId: '',
      }),
    });

  assert.equal(missingHandle.problem.code, 'MEDIA_HANDLE_REQUIRED');

  const missingCid =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth({
        cid: '',
      }),
    });

  assert.equal(missingCid.problem.code, 'CID_REQUIRED');
});

test('continue watching store adapter rejects upstream mutation and raw media references', () => {
  const upstreamStorage =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth({
        storageMutationRequested: true,
      }),
    });

  assert.equal(
    upstreamStorage.problem.code,
    'UPSTREAM_STORAGE_MUTATION_REJECTED',
  );

  const upstreamRelease =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth({
        releaseSideEffectAllowed: true,
      }),
    });

  assert.equal(
    upstreamRelease.problem.code,
    'UPSTREAM_RELEASE_SIDE_EFFECT_REJECTED',
  );

  const rawReference =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth({
        [['source', 'Url'].join('')]:
          'https://provider.example/media',
      }),
    });

  assert.equal(
    rawReference.problem.code,
    'RAW_RESOURCE_REFERENCE_REJECTED',
  );
});

test('continue watching store adapter output has no direct storage, source creation, or authority fields', () => {
  const adapter =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth: resourceTruth({
        releaseRequested: true,
        releaseReason: 'unload',
      }),
    });

  const serialized = JSON.stringify(adapter);

  assert.equal(adapter.storageSideEffectAllowed, false);
  assert.equal(adapter.adapterExecutionAllowed, false);
  assert.equal(adapter.releaseSideEffectAllowed, false);

  for (const forbidden of [
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
    'localStorage',
    'sessionStorage',
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
