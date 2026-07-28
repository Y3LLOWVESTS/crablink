export const TV_RESOURCE_RELEASE_LIFECYCLE_SCHEMA =
  'crablink.tv.resource-release-lifecycle.v1';

export const TV_RESOURCE_RELEASE_LIFECYCLE_STATE = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  NOOP: 'noop',
  REJECTED: 'rejected',
});

export const TV_RESOURCE_RELEASE_LIFECYCLE_STEP = Object.freeze({
  PAUSE_PLAYER: 'pause-player',
  FLUSH_PROGRESS: 'flush-progress',
  DETACH_PLAYER_ELEMENT: 'detach-player-element',
  RELEASE_MEDIA_HANDLE: 'release-media-handle',
  CLEAR_FOCUS: 'clear-focus',
});

export const TV_RESOURCE_RELEASE_LIFECYCLE_REASON = Object.freeze({
  BACK: 'back',
  ENDED: 'ended',
  ERROR: 'error',
  UNLOAD: 'unload',
});

const STORE_ADAPTER_SCHEMA =
  'crablink.tv.continue-watching-store-adapter.v1';

const RELEASE_REQUESTED =
  'release-requested';

const STORE_OPERATION_NOOP =
  'noop';

const STORE_OPERATION_UPSERT =
  'upsert-resume-candidate';

const STORE_OPERATION_CLEAR =
  'clear-resume-candidate';

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
    schema: TV_RESOURCE_RELEASE_LIFECYCLE_SCHEMA,
    state: TV_RESOURCE_RELEASE_LIFECYCLE_STATE.IDLE,
    mediaKind: 'unknown',
    mediaHandleId: '',
    storeKey: '',
    storeOperation: STORE_OPERATION_NOOP,
    releaseReason: '',
    lifecycleSteps: [],
    lifecycleStepCount: 0,
    releaseRequested: false,
    releasePlanReady: false,
    releaseExecutionAllowed: false,
    playerMutationAllowed: false,
    handleReleaseAllowed: false,
    storageFlushRequired: false,
    storageFlushSideEffectAllowed: false,
    completed: false,
    positionSeconds: 0,
    statusLabel: 'No resource release lifecycle is requested.',
    problem: null,
    ...overrides,
  };
}

function rejectedProjection(code, message) {
  return baseProjection({
    state: TV_RESOURCE_RELEASE_LIFECYCLE_STATE.REJECTED,
    statusLabel: 'Resource release lifecycle rejected this adapter view.',
    problem: {
      code,
      message,
    },
  });
}

function noopProjection(adapterView, statusLabel) {
  return baseProjection({
    state: TV_RESOURCE_RELEASE_LIFECYCLE_STATE.NOOP,
    mediaKind: lowerText(adapterView.mediaKind),
    mediaHandleId: boundedText(adapterView.mediaHandleId),
    storeKey: boundedText(adapterView.storeKey, '', 192),
    storeOperation: lowerText(adapterView.operation) || STORE_OPERATION_NOOP,
    completed: adapterView.completed === true,
    positionSeconds: boundedInteger(adapterView.positionSeconds),
    statusLabel,
  });
}

function lifecycleStepsFor(adapterView) {
  const releaseReason =
    lowerText(adapterView.releaseReason);

  const steps = [];

  if (
    releaseReason === TV_RESOURCE_RELEASE_LIFECYCLE_REASON.BACK ||
    releaseReason === TV_RESOURCE_RELEASE_LIFECYCLE_REASON.ERROR ||
    releaseReason === TV_RESOURCE_RELEASE_LIFECYCLE_REASON.UNLOAD
  ) {
    steps.push(TV_RESOURCE_RELEASE_LIFECYCLE_STEP.PAUSE_PLAYER);
  }

  if (
    adapterView.operation === STORE_OPERATION_UPSERT ||
    adapterView.operation === STORE_OPERATION_CLEAR
  ) {
    steps.push(TV_RESOURCE_RELEASE_LIFECYCLE_STEP.FLUSH_PROGRESS);
  }

  steps.push(
    TV_RESOURCE_RELEASE_LIFECYCLE_STEP.DETACH_PLAYER_ELEMENT,
    TV_RESOURCE_RELEASE_LIFECYCLE_STEP.RELEASE_MEDIA_HANDLE,
    TV_RESOURCE_RELEASE_LIFECYCLE_STEP.CLEAR_FOCUS,
  );

  return steps;
}

function lifecycleProjection(adapterView) {
  const lifecycleSteps =
    lifecycleStepsFor(adapterView);

  return baseProjection({
    state: TV_RESOURCE_RELEASE_LIFECYCLE_STATE.READY,
    mediaKind: lowerText(adapterView.mediaKind),
    mediaHandleId: boundedText(adapterView.mediaHandleId),
    storeKey: boundedText(adapterView.storeKey, '', 192),
    storeOperation: lowerText(adapterView.operation) || STORE_OPERATION_NOOP,
    releaseReason: lowerText(adapterView.releaseReason),
    lifecycleSteps,
    lifecycleStepCount: lifecycleSteps.length,
    releaseRequested: true,
    releasePlanReady: true,
    releaseExecutionAllowed: false,
    playerMutationAllowed: false,
    handleReleaseAllowed: false,
    storageFlushRequired:
      lifecycleSteps.includes(
        TV_RESOURCE_RELEASE_LIFECYCLE_STEP.FLUSH_PROGRESS,
      ),
    storageFlushSideEffectAllowed: false,
    completed: adapterView.completed === true,
    positionSeconds: boundedInteger(adapterView.positionSeconds),
    statusLabel:
      'Resource release lifecycle plan is ready for a bounded executor.',
  });
}

function validateAdapterView(adapterView) {
  if (!adapterView || typeof adapterView !== 'object') {
    return {
      code: 'STORE_ADAPTER_VIEW_REQUIRED',
      message: 'Resource release lifecycle requires a store adapter view.',
    };
  }

  if (hasRawReferenceKey(adapterView)) {
    return {
      code: 'RAW_ADAPTER_REFERENCE_REJECTED',
      message:
        'Resource release lifecycle input must not expose raw media references.',
    };
  }

  if (adapterView.schema !== STORE_ADAPTER_SCHEMA) {
    return {
      code: 'UNSUPPORTED_STORE_ADAPTER_SCHEMA',
      message: 'Store adapter schema is not accepted.',
    };
  }

  if (
    adapterView.state !== 'ready' &&
    adapterView.state !== 'noop'
  ) {
    return {
      code: 'STORE_ADAPTER_VIEW_NOT_READY',
      message: 'Resource release lifecycle only accepts ready or noop adapter views.',
    };
  }

  const mediaKind =
    lowerText(adapterView.mediaKind);

  if (mediaKind !== 'video' && mediaKind !== 'audio') {
    return {
      code: 'MEDIA_KIND_UNSUPPORTED',
      message: 'Resource release lifecycle accepts only video or audio.',
    };
  }

  if (!cleanText(adapterView.mediaHandleId)) {
    return {
      code: 'MEDIA_HANDLE_REQUIRED',
      message: 'Resource release lifecycle requires a media handle id.',
    };
  }

  if (adapterView.storageSideEffectAllowed === true) {
    return {
      code: 'UPSTREAM_STORAGE_SIDE_EFFECT_REJECTED',
      message: 'Resource release lifecycle requires side-effect-free store adapter input.',
    };
  }

  if (adapterView.adapterExecutionAllowed === true) {
    return {
      code: 'UPSTREAM_ADAPTER_EXECUTION_REJECTED',
      message: 'Resource release lifecycle must not receive already-executable adapter input.',
    };
  }

  if (adapterView.releaseSideEffectAllowed === true) {
    return {
      code: 'UPSTREAM_RELEASE_SIDE_EFFECT_REJECTED',
      message: 'Resource release lifecycle requires side-effect-free release input.',
    };
  }

  const operation =
    lowerText(adapterView.operation);

  if (
    operation !== STORE_OPERATION_NOOP &&
    operation !== STORE_OPERATION_UPSERT &&
    operation !== STORE_OPERATION_CLEAR
  ) {
    return {
      code: 'STORE_OPERATION_UNSUPPORTED',
      message: 'Store adapter operation is not accepted.',
    };
  }

  if (adapterView.releaseRequested === true) {
    const releaseOperation =
      lowerText(adapterView.releaseOperation);

    if (releaseOperation !== RELEASE_REQUESTED) {
      return {
        code: 'RELEASE_OPERATION_REQUIRED',
        message: 'Release requested requires release-requested operation.',
      };
    }

    const releaseReason =
      lowerText(adapterView.releaseReason);

    if (
      !Object.values(TV_RESOURCE_RELEASE_LIFECYCLE_REASON).includes(
        releaseReason,
      )
    ) {
      return {
        code: 'RELEASE_REASON_UNSUPPORTED',
        message: 'Release reason is not accepted.',
      };
    }
  }

  return null;
}

export function projectTvResourceReleaseLifecycle(input) {
  if (!input || typeof input !== 'object') {
    return baseProjection();
  }

  const adapterView =
    input.adapterView;

  const problem =
    validateAdapterView(adapterView);

  if (problem) {
    return rejectedProjection(problem.code, problem.message);
  }

  if (adapterView.releaseRequested !== true) {
    return noopProjection(
      adapterView,
      'No resource release lifecycle is required yet.',
    );
  }

  return lifecycleProjection(adapterView);
}
