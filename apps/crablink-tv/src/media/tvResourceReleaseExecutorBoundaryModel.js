export const TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_SCHEMA =
  'crablink.tv.resource-release-executor-boundary.v1';

export const TV_RESOURCE_RELEASE_EXECUTOR_COMMAND_SCHEMA =
  'crablink.tv.resource-release-executor-command.v1';

export const TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_STATE = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  NOOP: 'noop',
  REJECTED: 'rejected',
});

export const TV_RESOURCE_RELEASE_EXECUTOR_OPERATION = Object.freeze({
  QUEUE_RELEASE_LIFECYCLE: 'queue-release-lifecycle',
  NOOP: 'noop',
});

export const TV_RESOURCE_RELEASE_EXECUTOR_COMMAND = Object.freeze({
  REQUEST_PAUSE: 'request-pause',
  REQUEST_PROGRESS_FLUSH: 'request-progress-flush',
  REQUEST_PLAYER_DETACH: 'request-player-detach',
  REQUEST_HANDLE_RELEASE: 'request-handle-release',
  REQUEST_FOCUS_CLEAR: 'request-focus-clear',
});

const LIFECYCLE_SCHEMA =
  'crablink.tv.resource-release-lifecycle.v1';

const LIFECYCLE_STEP = Object.freeze({
  PAUSE_PLAYER: 'pause-player',
  FLUSH_PROGRESS: 'flush-progress',
  DETACH_PLAYER_ELEMENT: 'detach-player-element',
  RELEASE_MEDIA_HANDLE: 'release-media-handle',
  CLEAR_FOCUS: 'clear-focus',
});

const STEP_TO_COMMAND = Object.freeze({
  [LIFECYCLE_STEP.PAUSE_PLAYER]:
    TV_RESOURCE_RELEASE_EXECUTOR_COMMAND.REQUEST_PAUSE,
  [LIFECYCLE_STEP.FLUSH_PROGRESS]:
    TV_RESOURCE_RELEASE_EXECUTOR_COMMAND.REQUEST_PROGRESS_FLUSH,
  [LIFECYCLE_STEP.DETACH_PLAYER_ELEMENT]:
    TV_RESOURCE_RELEASE_EXECUTOR_COMMAND.REQUEST_PLAYER_DETACH,
  [LIFECYCLE_STEP.RELEASE_MEDIA_HANDLE]:
    TV_RESOURCE_RELEASE_EXECUTOR_COMMAND.REQUEST_HANDLE_RELEASE,
  [LIFECYCLE_STEP.CLEAR_FOCUS]:
    TV_RESOURCE_RELEASE_EXECUTOR_COMMAND.REQUEST_FOCUS_CLEAR,
});

const VALID_STEP_ORDER = Object.freeze([
  LIFECYCLE_STEP.PAUSE_PLAYER,
  LIFECYCLE_STEP.FLUSH_PROGRESS,
  LIFECYCLE_STEP.DETACH_PLAYER_ELEMENT,
  LIFECYCLE_STEP.RELEASE_MEDIA_HANDLE,
  LIFECYCLE_STEP.CLEAR_FOCUS,
]);

const RAW_REFERENCE_KEY_PARTS = Object.freeze([
  ['s', 'r', 'c'],
  ['u', 'r', 'l'],
  ['source', 'Ref'],
  ['source', 'Location'],
  ['source', 'Url'],
  ['object', 'Url'],
  ['signed', 'Url'],
  ['asset', 'Bytes'],
  ['bytes'],
  ['blob'],
  ['raw', 'Body'],
  ['provider', 'Url'],
]);

const RAW_REFERENCE_KEYS =
  new Set(
    RAW_REFERENCE_KEY_PARTS.map((parts) =>
      parts.join('').toLowerCase(),
    ),
  );

function cleanText(value) {
  return String(value ?? '').trim();
}

function lowerText(value) {
  return cleanText(value).toLowerCase();
}

function boundedText(value, fallback = '', limit = 160) {
  const text = cleanText(value);

  if (!text) {
    return fallback;
  }

  if (text.length > limit) {
    return `${text.slice(0, limit - 3)}...`;
  }

  return text;
}

function boundedInteger(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.trunc(number);
}

function hasRawReferenceKey(value, seen = new Set()) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (seen.has(value)) {
    return false;
  }

  seen.add(value);

  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = String(key).toLowerCase();

    if (RAW_REFERENCE_KEYS.has(normalizedKey)) {
      return true;
    }

    if (hasRawReferenceKey(nested, seen)) {
      return true;
    }
  }

  return false;
}

function baseProjection(overrides = {}) {
  return {
    schema: TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_SCHEMA,
    state: TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_STATE.IDLE,
    commandSchema: TV_RESOURCE_RELEASE_EXECUTOR_COMMAND_SCHEMA,
    operation: TV_RESOURCE_RELEASE_EXECUTOR_OPERATION.NOOP,
    mediaKind: 'unknown',
    mediaHandleId: '',
    storeKey: '',
    releaseReason: '',
    commandQueue: [],
    commandCount: 0,
    executorBoundaryReady: false,
    executorIntentRequired: true,
    userGestureRequired: true,
    directExecutionAllowed: false,
    playerMutationAllowed: false,
    storageMutationAllowed: false,
    handleReleaseAllowed: false,
    sourceReleaseAllowed: false,
    nativeExecutorRequired: false,
    statusLabel: 'No resource release executor command is queued.',
    problem: null,
    ...overrides,
  };
}

function rejectedProjection(code, message) {
  return baseProjection({
    state: TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_STATE.REJECTED,
    statusLabel: 'Resource release executor boundary rejected this lifecycle plan.',
    problem: {
      code,
      message,
    },
  });
}

function noopProjection(lifecycleView, statusLabel) {
  return baseProjection({
    state: TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_STATE.NOOP,
    mediaKind: lowerText(lifecycleView.mediaKind),
    mediaHandleId: boundedText(lifecycleView.mediaHandleId),
    storeKey: boundedText(lifecycleView.storeKey, '', 192),
    releaseReason: boundedText(lifecycleView.releaseReason),
    statusLabel,
  });
}

function lifecycleStepProblem(steps) {
  if (!Array.isArray(steps)) {
    return {
      code: 'LIFECYCLE_STEPS_REQUIRED',
      message: 'Executor boundary requires ordered lifecycle steps.',
    };
  }

  if (steps.length === 0) {
    return {
      code: 'LIFECYCLE_STEPS_REQUIRED',
      message: 'Executor boundary requires at least one lifecycle step.',
    };
  }

  const seen = new Set();
  let lastIndex = -1;

  for (const rawStep of steps) {
    const step = lowerText(rawStep);
    const orderIndex = VALID_STEP_ORDER.indexOf(step);

    if (orderIndex < 0) {
      return {
        code: 'LIFECYCLE_STEP_UNSUPPORTED',
        message: 'Lifecycle step is not accepted by executor boundary.',
      };
    }

    if (seen.has(step)) {
      return {
        code: 'LIFECYCLE_STEP_DUPLICATE',
        message: 'Lifecycle step may appear only once.',
      };
    }

    if (orderIndex < lastIndex) {
      return {
        code: 'LIFECYCLE_STEP_ORDER_INVALID',
        message: 'Lifecycle steps must remain in safe release order.',
      };
    }

    seen.add(step);
    lastIndex = orderIndex;
  }

  for (const requiredStep of [
    LIFECYCLE_STEP.DETACH_PLAYER_ELEMENT,
    LIFECYCLE_STEP.RELEASE_MEDIA_HANDLE,
    LIFECYCLE_STEP.CLEAR_FOCUS,
  ]) {
    if (!seen.has(requiredStep)) {
      return {
        code: 'LIFECYCLE_TERMINAL_STEP_REQUIRED',
        message: 'Lifecycle plan is missing a terminal release step.',
      };
    }
  }

  return null;
}

function commandForStep(step, index, lifecycleView) {
  return {
    schema: TV_RESOURCE_RELEASE_EXECUTOR_COMMAND_SCHEMA,
    command: STEP_TO_COMMAND[step],
    lifecycleStep: step,
    ordinal: index + 1,
    mediaKind: lowerText(lifecycleView.mediaKind),
    mediaHandleId: boundedText(lifecycleView.mediaHandleId),
    storeKey: boundedText(lifecycleView.storeKey, '', 192),
    releaseReason: boundedText(lifecycleView.releaseReason),
    directEffectAllowed: false,
    executorOnly: true,
  };
}

function readyProjection(lifecycleView) {
  const steps =
    lifecycleView.lifecycleSteps.map((step) => lowerText(step));

  const commandQueue =
    steps.map((step, index) =>
      commandForStep(step, index, lifecycleView),
    );

  return baseProjection({
    state: TV_RESOURCE_RELEASE_EXECUTOR_BOUNDARY_STATE.READY,
    operation:
      TV_RESOURCE_RELEASE_EXECUTOR_OPERATION.QUEUE_RELEASE_LIFECYCLE,
    mediaKind: lowerText(lifecycleView.mediaKind),
    mediaHandleId: boundedText(lifecycleView.mediaHandleId),
    storeKey: boundedText(lifecycleView.storeKey, '', 192),
    releaseReason: boundedText(lifecycleView.releaseReason),
    commandQueue,
    commandCount: commandQueue.length,
    executorBoundaryReady: true,
    executorIntentRequired: true,
    userGestureRequired: true,
    directExecutionAllowed: false,
    playerMutationAllowed: false,
    storageMutationAllowed: false,
    handleReleaseAllowed: false,
    sourceReleaseAllowed: false,
    nativeExecutorRequired: false,
    statusLabel:
      'Resource release lifecycle is ready for a bounded executor queue.',
  });
}

function validateLifecycleView(lifecycleView) {
  if (!lifecycleView || typeof lifecycleView !== 'object') {
    return {
      code: 'LIFECYCLE_VIEW_REQUIRED',
      message: 'Executor boundary requires a lifecycle view.',
    };
  }

  if (hasRawReferenceKey(lifecycleView)) {
    return {
      code: 'RAW_LIFECYCLE_REFERENCE_REJECTED',
      message:
        'Executor boundary input must not expose raw media references.',
    };
  }

  if (lifecycleView.schema !== LIFECYCLE_SCHEMA) {
    return {
      code: 'UNSUPPORTED_LIFECYCLE_SCHEMA',
      message: 'Lifecycle schema is not accepted.',
    };
  }

  if (
    lifecycleView.state !== 'ready' &&
    lifecycleView.state !== 'noop'
  ) {
    return {
      code: 'LIFECYCLE_VIEW_NOT_READY',
      message: 'Executor boundary only accepts ready or noop lifecycle views.',
    };
  }

  const mediaKind =
    lowerText(lifecycleView.mediaKind);

  if (mediaKind !== 'video' && mediaKind !== 'audio') {
    return {
      code: 'MEDIA_KIND_UNSUPPORTED',
      message: 'Executor boundary accepts only video or audio lifecycle views.',
    };
  }

  if (!cleanText(lifecycleView.mediaHandleId)) {
    return {
      code: 'MEDIA_HANDLE_REQUIRED',
      message: 'Executor boundary requires a media handle id.',
    };
  }

  if (lifecycleView.releaseExecutionAllowed === true) {
    return {
      code: 'UPSTREAM_RELEASE_EXECUTION_REJECTED',
      message: 'Executor boundary requires a side-effect-free lifecycle plan.',
    };
  }

  if (lifecycleView.playerMutationAllowed === true) {
    return {
      code: 'UPSTREAM_PLAYER_MUTATION_REJECTED',
      message: 'Executor boundary requires no upstream player mutation permission.',
    };
  }

  if (lifecycleView.handleReleaseAllowed === true) {
    return {
      code: 'UPSTREAM_HANDLE_RELEASE_REJECTED',
      message: 'Executor boundary requires no upstream handle release permission.',
    };
  }

  if (lifecycleView.storageFlushSideEffectAllowed === true) {
    return {
      code: 'UPSTREAM_STORAGE_FLUSH_REJECTED',
      message: 'Executor boundary requires no upstream storage flush side effect.',
    };
  }

  if (lifecycleView.state === 'ready') {
    if (lifecycleView.releaseRequested !== true) {
      return {
        code: 'RELEASE_REQUEST_REQUIRED',
        message: 'Ready lifecycle plans must request release.',
      };
    }

    if (lifecycleView.releasePlanReady !== true) {
      return {
        code: 'RELEASE_PLAN_NOT_READY',
        message: 'Executor boundary requires a ready release plan.',
      };
    }

    const stepProblem =
      lifecycleStepProblem(lifecycleView.lifecycleSteps);

    if (stepProblem) {
      return stepProblem;
    }

    if (
      boundedInteger(lifecycleView.lifecycleStepCount) !==
      lifecycleView.lifecycleSteps.length
    ) {
      return {
        code: 'LIFECYCLE_STEP_COUNT_MISMATCH',
        message: 'Lifecycle step count does not match step list.',
      };
    }
  }

  return null;
}

export function projectTvResourceReleaseExecutorBoundary(input) {
  if (!input || typeof input !== 'object') {
    return baseProjection();
  }

  const lifecycleView =
    input.lifecycleView;

  const problem =
    validateLifecycleView(lifecycleView);

  if (problem) {
    return rejectedProjection(problem.code, problem.message);
  }

  if (
    lifecycleView.state === 'noop' ||
    lifecycleView.releaseRequested !== true
  ) {
    return noopProjection(
      lifecycleView,
      'No bounded release executor command is required yet.',
    );
  }

  return readyProjection(lifecycleView);
}
