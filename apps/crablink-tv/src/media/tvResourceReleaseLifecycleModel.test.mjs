import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_RESOURCE_RELEASE_LIFECYCLE_SCHEMA,
  TV_RESOURCE_RELEASE_LIFECYCLE_STATE,
  TV_RESOURCE_RELEASE_LIFECYCLE_STEP,
  projectTvResourceReleaseLifecycle,
} from './tvResourceReleaseLifecycleModel.js';

function adapterView(overrides = {}) {
  return {
    schema: 'crablink.tv.continue-watching-store-adapter.v1',
    state: 'ready',
    operation: 'upsert-resume-candidate',
    storeKey: 'continue:video:b3:release-video',
    mediaKind: 'video',
    mediaHandleId: 'media-handle-release-video',
    canonicalCrabUrl: 'crab://creator.example/video/release',
    cid: 'b3:release-video',
    contentType: 'video/mp4',
    positionSeconds: 120,
    durationSeconds: 600,
    progressRatio: 0.2,
    completed: false,
    storeWriteRequested: true,
    storageSideEffectAllowed: false,
    adapterExecutionAllowed: false,
    releaseOperation: 'release-requested',
    releaseRequested: true,
    releaseReason: 'back',
    releaseSideEffectAllowed: false,
    ...overrides,
  };
}

test('resource release lifecycle projects idle without input', () => {
  const lifecycle =
    projectTvResourceReleaseLifecycle(null);

  assert.equal(
    lifecycle.schema,
    TV_RESOURCE_RELEASE_LIFECYCLE_SCHEMA,
  );
  assert.equal(
    lifecycle.state,
    TV_RESOURCE_RELEASE_LIFECYCLE_STATE.IDLE,
  );
  assert.equal(lifecycle.releaseRequested, false);
  assert.equal(lifecycle.releasePlanReady, false);
  assert.equal(lifecycle.releaseExecutionAllowed, false);
});

test('resource release lifecycle plans back release with progress flush', () => {
  const lifecycle =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView(),
    });

  assert.equal(
    lifecycle.state,
    TV_RESOURCE_RELEASE_LIFECYCLE_STATE.READY,
  );
  assert.equal(lifecycle.mediaKind, 'video');
  assert.equal(lifecycle.releaseReason, 'back');
  assert.equal(lifecycle.releaseRequested, true);
  assert.equal(lifecycle.releasePlanReady, true);
  assert.equal(lifecycle.releaseExecutionAllowed, false);
  assert.equal(lifecycle.playerMutationAllowed, false);
  assert.equal(lifecycle.handleReleaseAllowed, false);
  assert.equal(lifecycle.storageFlushRequired, true);
  assert.equal(lifecycle.storageFlushSideEffectAllowed, false);

  assert.deepEqual(lifecycle.lifecycleSteps, [
    TV_RESOURCE_RELEASE_LIFECYCLE_STEP.PAUSE_PLAYER,
    TV_RESOURCE_RELEASE_LIFECYCLE_STEP.FLUSH_PROGRESS,
    TV_RESOURCE_RELEASE_LIFECYCLE_STEP.DETACH_PLAYER_ELEMENT,
    TV_RESOURCE_RELEASE_LIFECYCLE_STEP.RELEASE_MEDIA_HANDLE,
    TV_RESOURCE_RELEASE_LIFECYCLE_STEP.CLEAR_FOCUS,
  ]);
});

test('resource release lifecycle plans ended release without pause', () => {
  const lifecycle =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        operation: 'clear-resume-candidate',
        releaseReason: 'ended',
        completed: true,
      }),
    });

  assert.equal(lifecycle.releaseReason, 'ended');
  assert.equal(lifecycle.completed, true);
  assert.equal(
    lifecycle.lifecycleSteps.includes(
      TV_RESOURCE_RELEASE_LIFECYCLE_STEP.PAUSE_PLAYER,
    ),
    false,
  );
  assert.equal(
    lifecycle.lifecycleSteps.includes(
      TV_RESOURCE_RELEASE_LIFECYCLE_STEP.FLUSH_PROGRESS,
    ),
    true,
  );
});

test('resource release lifecycle plans error and unload release safely', () => {
  for (const releaseReason of ['error', 'unload']) {
    const lifecycle =
      projectTvResourceReleaseLifecycle({
        adapterView: adapterView({
          mediaKind: 'audio',
          mediaHandleId: `media-handle-${releaseReason}`,
          storeKey: `continue:audio:${releaseReason}`,
          releaseReason,
        }),
      });

    assert.equal(lifecycle.mediaKind, 'audio');
    assert.equal(lifecycle.releaseReason, releaseReason);
    assert.equal(
      lifecycle.lifecycleSteps[0],
      TV_RESOURCE_RELEASE_LIFECYCLE_STEP.PAUSE_PLAYER,
    );
    assert.equal(lifecycle.releaseExecutionAllowed, false);
  }
});

test('resource release lifecycle noops without release request', () => {
  const lifecycle =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        state: 'noop',
        operation: 'noop',
        storeWriteRequested: false,
        releaseOperation: 'none',
        releaseRequested: false,
        releaseReason: '',
      }),
    });

  assert.equal(
    lifecycle.state,
    TV_RESOURCE_RELEASE_LIFECYCLE_STATE.NOOP,
  );
  assert.equal(lifecycle.releaseRequested, false);
  assert.equal(lifecycle.releasePlanReady, false);
  assert.equal(lifecycle.lifecycleSteps.length, 0);
});

test('resource release lifecycle rejects stale schema and non-ready adapter', () => {
  const stale =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        schema: 'crablink.tv.old-adapter.v0',
      }),
    });

  assert.equal(
    stale.problem.code,
    'UNSUPPORTED_STORE_ADAPTER_SCHEMA',
  );

  const rejected =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        state: 'rejected',
      }),
    });

  assert.equal(
    rejected.problem.code,
    'STORE_ADAPTER_VIEW_NOT_READY',
  );
});

test('resource release lifecycle rejects unsupported media and operations', () => {
  const unsupportedKind =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        mediaKind: 'image',
      }),
    });

  assert.equal(
    unsupportedKind.problem.code,
    'MEDIA_KIND_UNSUPPORTED',
  );

  const unsupportedOperation =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        operation: 'delete-everything',
      }),
    });

  assert.equal(
    unsupportedOperation.problem.code,
    'STORE_OPERATION_UNSUPPORTED',
  );

  const missingHandle =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        mediaHandleId: '',
      }),
    });

  assert.equal(missingHandle.problem.code, 'MEDIA_HANDLE_REQUIRED');
});

test('resource release lifecycle rejects invalid release operation and reason', () => {
  const invalidOperation =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        releaseOperation: 'none',
      }),
    });

  assert.equal(
    invalidOperation.problem.code,
    'RELEASE_OPERATION_REQUIRED',
  );

  const invalidReason =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        releaseReason: 'teleport',
      }),
    });

  assert.equal(
    invalidReason.problem.code,
    'RELEASE_REASON_UNSUPPORTED',
  );
});

test('resource release lifecycle rejects upstream side effects and raw references', () => {
  const storageSideEffect =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        storageSideEffectAllowed: true,
      }),
    });

  assert.equal(
    storageSideEffect.problem.code,
    'UPSTREAM_STORAGE_SIDE_EFFECT_REJECTED',
  );

  const adapterExecution =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        adapterExecutionAllowed: true,
      }),
    });

  assert.equal(
    adapterExecution.problem.code,
    'UPSTREAM_ADAPTER_EXECUTION_REJECTED',
  );

  const releaseSideEffect =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        releaseSideEffectAllowed: true,
      }),
    });

  assert.equal(
    releaseSideEffect.problem.code,
    'UPSTREAM_RELEASE_SIDE_EFFECT_REJECTED',
  );

  const rawReference =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        [['source', 'Url'].join('')]:
          'https://provider.example/media',
      }),
    });

  assert.equal(
    rawReference.problem.code,
    'RAW_ADAPTER_REFERENCE_REJECTED',
  );
});

test('resource release lifecycle output has no direct release, storage, source creation, or authority fields', () => {
  const lifecycle =
    projectTvResourceReleaseLifecycle({
      adapterView: adapterView({
        releaseReason: 'unload',
      }),
    });

  const serialized = JSON.stringify(lifecycle);

  assert.equal(lifecycle.releaseExecutionAllowed, false);
  assert.equal(lifecycle.playerMutationAllowed, false);
  assert.equal(lifecycle.handleReleaseAllowed, false);
  assert.equal(lifecycle.storageFlushSideEffectAllowed, false);

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
