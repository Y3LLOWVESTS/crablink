import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_SCHEMA,
  TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_STATE,
  TV_RESOURCE_RELEASE_EXECUTOR_COMMAND,
  TV_RESOURCE_RELEASE_EXECUTOR_OPERATION,
  projectTvResourceReleaseExecutorBoundary,
} from './tvResourceReleaseExecutorBoundaryModel.js';

function lifecycleView(overrides = {}) {
  return {
    schema: 'crablink.tv.resource-release-lifecycle.v1',
    state: 'ready',
    mediaKind: 'video',
    mediaHandleId: 'media-handle-executor-video',
    storeKey: 'continue:video:b3:executor-video',
    storeOperation: 'upsert-resume-candidate',
    releaseReason: 'back',
    lifecycleSteps: [
      'pause-player',
      'flush-progress',
      'detach-player-element',
      'release-media-handle',
      'clear-focus',
    ],
    lifecycleStepCount: 5,
    releaseRequested: true,
    releasePlanReady: true,
    releaseExecutionAllowed: false,
    playerMutationAllowed: false,
    handleReleaseAllowed: false,
    storageFlushRequired: true,
    storageFlushSideEffectAllowed: false,
    completed: false,
    positionSeconds: 120,
    ...overrides,
  };
}

test('resource release executor boundary projects idle without input', () => {
  const boundary =
    projectTvResourceReleaseExecutorBoundary(null);

  assert.equal(
    boundary.schema,
    TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_SCHEMA,
  );
  assert.equal(
    boundary.state,
    TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_STATE.IDLE,
  );
  assert.equal(
    boundary.operation,
    TV_RESOURCE_RELEASE_EXECUTOR_OPERATION.NOOP,
  );
  assert.equal(boundary.executorBoundaryReady, false);
  assert.equal(boundary.directExecutionAllowed, false);
});

test('resource release executor boundary queues ordered video release commands', () => {
  const boundary =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView(),
    });

  assert.equal(
    boundary.state,
    TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_STATE.READY,
  );
  assert.equal(
    boundary.operation,
    TV_RESOURCE_RELEASE_EXECUTOR_OPERATION.QUEUE_RELEASE_LIFECYCLE,
  );
  assert.equal(boundary.mediaKind, 'video');
  assert.equal(boundary.commandCount, 5);
  assert.equal(boundary.executorBoundaryReady, true);
  assert.equal(boundary.executorIntentRequired, true);
  assert.equal(boundary.userGestureRequired, true);
  assert.equal(boundary.directExecutionAllowed, false);
  assert.equal(boundary.playerMutationAllowed, false);
  assert.equal(boundary.storageMutationAllowed, false);
  assert.equal(boundary.handleReleaseAllowed, false);
  assert.deepEqual(
    boundary.commandQueue.map((command) => command.command),
    [
      TV_RESOURCE_RELEASE_EXECUTOR_COMMAND.REQUEST_PAUSE,
      TV_RESOURCE_RELEASE_EXECUTOR_COMMAND.REQUEST_PROGRESS_FLUSH,
      TV_RESOURCE_RELEASE_EXECUTOR_COMMAND.REQUEST_PLAYER_DETACH,
      TV_RESOURCE_RELEASE_EXECUTOR_COMMAND.REQUEST_HANDLE_RELEASE,
      TV_RESOURCE_RELEASE_EXECUTOR_COMMAND.REQUEST_FOCUS_CLEAR,
    ],
  );
  assert.equal(
    boundary.commandQueue.every(
      (command) => command.directEffectAllowed === false,
    ),
    true,
  );
});

test('resource release executor boundary queues ended audio release without pause', () => {
  const boundary =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        mediaKind: 'audio',
        mediaHandleId: 'media-handle-executor-audio',
        storeKey: 'continue:audio:b3:executor-audio',
        storeOperation: 'clear-resume-candidate',
        releaseReason: 'ended',
        lifecycleSteps: [
          'flush-progress',
          'detach-player-element',
          'release-media-handle',
          'clear-focus',
        ],
        lifecycleStepCount: 4,
        completed: true,
      }),
    });

  assert.equal(boundary.mediaKind, 'audio');
  assert.equal(boundary.commandCount, 4);
  assert.equal(
    boundary.commandQueue.some(
      (command) =>
        command.command ===
        TV_RESOURCE_RELEASE_EXECUTOR_COMMAND.REQUEST_PAUSE,
    ),
    false,
  );
  assert.equal(
    boundary.commandQueue[0].command,
    TV_RESOURCE_RELEASE_EXECUTOR_COMMAND.REQUEST_PROGRESS_FLUSH,
  );
});

test('resource release executor boundary noops for noop lifecycle views', () => {
  const boundary =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        state: 'noop',
        releaseRequested: false,
        releasePlanReady: false,
        releaseReason: '',
        lifecycleSteps: [],
        lifecycleStepCount: 0,
      }),
    });

  assert.equal(
    boundary.state,
    TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_STATE.NOOP,
  );
  assert.equal(
    boundary.operation,
    TV_RESOURCE_RELEASE_EXECUTOR_OPERATION.NOOP,
  );
  assert.equal(boundary.executorBoundaryReady, false);
  assert.equal(boundary.commandQueue.length, 0);
});

test('resource release executor boundary rejects stale schema and non-ready lifecycle', () => {
  const stale =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        schema: 'crablink.tv.old-lifecycle.v0',
      }),
    });

  assert.equal(stale.problem.code, 'UNSUPPORTED_LIFECYCLE_SCHEMA');

  const rejected =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        state: 'rejected',
      }),
    });

  assert.equal(rejected.problem.code, 'LIFECYCLE_VIEW_NOT_READY');
});

test('resource release executor boundary rejects unsupported media and missing handle', () => {
  const unsupportedKind =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        mediaKind: 'image',
      }),
    });

  assert.equal(
    unsupportedKind.problem.code,
    'MEDIA_KIND_UNSUPPORTED',
  );

  const missingHandle =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        mediaHandleId: '',
      }),
    });

  assert.equal(missingHandle.problem.code, 'MEDIA_HANDLE_REQUIRED');
});

test('resource release executor boundary rejects release plans that are not ready', () => {
  const noRequest =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        releaseRequested: false,
      }),
    });

  assert.equal(noRequest.problem.code, 'RELEASE_REQUEST_REQUIRED');

  const notReady =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        releasePlanReady: false,
      }),
    });

  assert.equal(notReady.problem.code, 'RELEASE_PLAN_NOT_READY');
});

test('resource release executor boundary rejects invalid lifecycle steps', () => {
  const duplicate =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        lifecycleSteps: [
          'pause-player',
          'pause-player',
          'detach-player-element',
          'release-media-handle',
          'clear-focus',
        ],
        lifecycleStepCount: 5,
      }),
    });

  assert.equal(duplicate.problem.code, 'LIFECYCLE_STEP_DUPLICATE');

  const outOfOrder =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        lifecycleSteps: [
          'detach-player-element',
          'flush-progress',
          'release-media-handle',
          'clear-focus',
        ],
        lifecycleStepCount: 4,
      }),
    });

  assert.equal(outOfOrder.problem.code, 'LIFECYCLE_STEP_ORDER_INVALID');

  const missingTerminal =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        lifecycleSteps: [
          'pause-player',
          'flush-progress',
          'detach-player-element',
        ],
        lifecycleStepCount: 3,
      }),
    });

  assert.equal(
    missingTerminal.problem.code,
    'LIFECYCLE_TERMINAL_STEP_REQUIRED',
  );

  const countMismatch =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        lifecycleStepCount: 4,
      }),
    });

  assert.equal(
    countMismatch.problem.code,
    'LIFECYCLE_STEP_COUNT_MISMATCH',
  );
});

test('resource release executor boundary rejects upstream side effects and raw references', () => {
  const releaseExecution =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        releaseExecutionAllowed: true,
      }),
    });

  assert.equal(
    releaseExecution.problem.code,
    'UPSTREAM_RELEASE_EXECUTION_REJECTED',
  );

  const playerMutation =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        playerMutationAllowed: true,
      }),
    });

  assert.equal(
    playerMutation.problem.code,
    'UPSTREAM_PLAYER_MUTATION_REJECTED',
  );

  const handleRelease =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        handleReleaseAllowed: true,
      }),
    });

  assert.equal(
    handleRelease.problem.code,
    'UPSTREAM_HANDLE_RELEASE_REJECTED',
  );

  const storageFlush =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        storageFlushSideEffectAllowed: true,
      }),
    });

  assert.equal(
    storageFlush.problem.code,
    'UPSTREAM_STORAGE_FLUSH_REJECTED',
  );

  const rawReference =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        [['source', 'Url'].join('')]:
          'https://provider.example/media',
      }),
    });

  assert.equal(
    rawReference.problem.code,
    'RAW_LIFECYCLE_REFERENCE_REJECTED',
  );
});

test('resource release executor boundary output has no direct release, storage, source creation, or authority fields', () => {
  const boundary =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView: lifecycleView({
        releaseReason: 'unload',
      }),
    });

  const serialized = JSON.stringify(boundary);

  assert.equal(boundary.directExecutionAllowed, false);
  assert.equal(boundary.playerMutationAllowed, false);
  assert.equal(boundary.storageMutationAllowed, false);
  assert.equal(boundary.handleReleaseAllowed, false);
  assert.equal(boundary.sourceReleaseAllowed, false);
  assert.equal(boundary.nativeExecutorRequired, false);

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
