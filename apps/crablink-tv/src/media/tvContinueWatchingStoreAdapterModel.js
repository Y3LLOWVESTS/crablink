export const TV_CONTINUE_WATCHING_STORE_ADAPTER_SCHEMA =
  'crablink.tv.continue-watching-store-adapter.v1';

export const TV_CONTINUE_WATCHING_STORE_OPERATION_SCHEMA =
  'crablink.tv.continue-watching-store-operation.v1';

export const TV_CONTINUE_WATCHING_STORE_ADAPTER_STATE = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  NOOP: 'noop',
  REJECTED: 'rejected',
});

export const TV_CONTINUE_WATCHING_STORE_OPERATION = Object.freeze({
  UPSERT_RESUME: 'upsert-resume-candidate',
  CLEAR_RESUME: 'clear-resume-candidate',
  NOOP: 'noop',
});

export const TV_CONTINUE_WATCHING_RELEASE_OPERATION = Object.freeze({
  RELEASE_REQUESTED: 'release-requested',
  NONE: 'none',
});

const EXPECTED_RESOURCE_SCHEMA =
  'crablink.tv.continue-watching-resource.v1';

const STORE_KEY_LIMIT = 192;
const TEXT_LIMIT = 160;

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

function boundedText(value, fallback = '', limit = TEXT_LIMIT) {
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

function boundedRatio(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  if (number > 1) {
    return 1;
  }

  return Number(number.toFixed(4));
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

function safeKeyPart(value) {
  const text =
    cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9:_./-]+/gu, '-')
      .replace(/-+/gu, '-')
      .replace(/^-|-$/gu, '');

  return text || 'unknown';
}

function storeKeyFor(resourceTruth) {
  const mediaKind =
    safeKeyPart(resourceTruth.mediaKind);

  const cid =
    safeKeyPart(resourceTruth.cid);

  const crab =
    safeKeyPart(resourceTruth.canonicalCrabUrl);

  const key =
    `continue:${mediaKind}:${cid}:${crab}`;

  if (key.length > STORE_KEY_LIMIT) {
    return key.slice(0, STORE_KEY_LIMIT);
  }

  return key;
}

function baseProjection(overrides = {}) {
  return {
    schema: TV_CONTINUE_WATCHING_STORE_ADAPTER_SCHEMA,
    state: TV_CONTINUE_WATCHING_STORE_ADAPTER_STATE.IDLE,
    operationSchema: TV_CONTINUE_WATCHING_STORE_OPERATION_SCHEMA,
    operation: TV_CONTINUE_WATCHING_STORE_OPERATION.NOOP,
    storeKey: '',
    mediaKind: 'unknown',
    mediaHandleId: '',
    canonicalCrabUrl: '',
    cid: '',
    contentType: '',
    positionSeconds: 0,
    durationSeconds: 0,
    progressRatio: 0,
    completed: false,
    storeWriteRequested: false,
    storageSideEffectAllowed: false,
    adapterExecutionAllowed: false,
    releaseOperation: TV_CONTINUE_WATCHING_RELEASE_OPERATION.NONE,
    releaseRequested: false,
    releaseReason: '',
    releaseSideEffectAllowed: false,
    statusLabel: 'No continue-watching store operation is requested.',
    problem: null,
    ...overrides,
  };
}

function rejectedProjection(code, message) {
  return baseProjection({
    state: TV_CONTINUE_WATCHING_STORE_ADAPTER_STATE.REJECTED,
    statusLabel: 'Continue-watching store adapter rejected this input.',
    problem: {
      code,
      message,
    },
  });
}

function noopProjection(resourceTruth, statusLabel) {
  return baseProjection({
    state: TV_CONTINUE_WATCHING_STORE_ADAPTER_STATE.NOOP,
    storeKey: storeKeyFor(resourceTruth),
    mediaKind: lowerText(resourceTruth.mediaKind),
    mediaHandleId: boundedText(resourceTruth.mediaHandleId),
    canonicalCrabUrl: boundedText(resourceTruth.canonicalCrabUrl),
    cid: boundedText(resourceTruth.cid),
    contentType: boundedText(resourceTruth.contentType),
    positionSeconds: boundedInteger(resourceTruth.positionSeconds),
    durationSeconds: boundedInteger(resourceTruth.durationSeconds),
    progressRatio: boundedRatio(resourceTruth.progressRatio),
    completed: resourceTruth.completed === true,
    releaseOperation:
      resourceTruth.releaseRequested === true
        ? TV_CONTINUE_WATCHING_RELEASE_OPERATION.RELEASE_REQUESTED
        : TV_CONTINUE_WATCHING_RELEASE_OPERATION.NONE,
    releaseRequested: resourceTruth.releaseRequested === true,
    releaseReason: boundedText(resourceTruth.releaseReason),
    releaseSideEffectAllowed: false,
    statusLabel,
  });
}

function upsertProjection(resourceTruth) {
  return baseProjection({
    state: TV_CONTINUE_WATCHING_STORE_ADAPTER_STATE.READY,
    operation: TV_CONTINUE_WATCHING_STORE_OPERATION.UPSERT_RESUME,
    storeKey: storeKeyFor(resourceTruth),
    mediaKind: lowerText(resourceTruth.mediaKind),
    mediaHandleId: boundedText(resourceTruth.mediaHandleId),
    canonicalCrabUrl: boundedText(resourceTruth.canonicalCrabUrl),
    cid: boundedText(resourceTruth.cid),
    contentType: boundedText(resourceTruth.contentType),
    positionSeconds: boundedInteger(resourceTruth.positionSeconds),
    durationSeconds: boundedInteger(resourceTruth.durationSeconds),
    progressRatio: boundedRatio(resourceTruth.progressRatio),
    completed: false,
    storeWriteRequested: true,
    storageSideEffectAllowed: false,
    adapterExecutionAllowed: false,
    releaseOperation:
      resourceTruth.releaseRequested === true
        ? TV_CONTINUE_WATCHING_RELEASE_OPERATION.RELEASE_REQUESTED
        : TV_CONTINUE_WATCHING_RELEASE_OPERATION.NONE,
    releaseRequested: resourceTruth.releaseRequested === true,
    releaseReason: boundedText(resourceTruth.releaseReason),
    releaseSideEffectAllowed: false,
    statusLabel:
      'Continue-watching resume candidate is ready for a bounded store adapter.',
  });
}

function clearProjection(resourceTruth) {
  return baseProjection({
    state: TV_CONTINUE_WATCHING_STORE_ADAPTER_STATE.READY,
    operation: TV_CONTINUE_WATCHING_STORE_OPERATION.CLEAR_RESUME,
    storeKey: storeKeyFor(resourceTruth),
    mediaKind: lowerText(resourceTruth.mediaKind),
    mediaHandleId: boundedText(resourceTruth.mediaHandleId),
    canonicalCrabUrl: boundedText(resourceTruth.canonicalCrabUrl),
    cid: boundedText(resourceTruth.cid),
    contentType: boundedText(resourceTruth.contentType),
    positionSeconds: boundedInteger(resourceTruth.positionSeconds),
    durationSeconds: boundedInteger(resourceTruth.durationSeconds),
    progressRatio: boundedRatio(resourceTruth.progressRatio),
    completed: true,
    storeWriteRequested: true,
    storageSideEffectAllowed: false,
    adapterExecutionAllowed: false,
    releaseOperation:
      resourceTruth.releaseRequested === true
        ? TV_CONTINUE_WATCHING_RELEASE_OPERATION.RELEASE_REQUESTED
        : TV_CONTINUE_WATCHING_RELEASE_OPERATION.NONE,
    releaseRequested: resourceTruth.releaseRequested === true,
    releaseReason: boundedText(resourceTruth.releaseReason),
    releaseSideEffectAllowed: false,
    statusLabel:
      'Completed playback is ready for a bounded resume-clear adapter.',
  });
}

function validateResourceTruth(resourceTruth) {
  if (!resourceTruth || typeof resourceTruth !== 'object') {
    return {
      code: 'RESOURCE_TRUTH_REQUIRED',
      message: 'Continue-watching resource truth is required.',
    };
  }

  if (hasRawReferenceKey(resourceTruth)) {
    return {
      code: 'RAW_RESOURCE_REFERENCE_REJECTED',
      message:
        'Store adapter input must not expose raw media references.',
    };
  }

  if (resourceTruth.schema !== EXPECTED_RESOURCE_SCHEMA) {
    return {
      code: 'UNSUPPORTED_RESOURCE_TRUTH_SCHEMA',
      message: 'Continue-watching resource truth schema is not accepted.',
    };
  }

  if (resourceTruth.state !== 'ready') {
    return {
      code: 'RESOURCE_TRUTH_NOT_READY',
      message: 'Store adapter only accepts ready resource truth.',
    };
  }

  const mediaKind = lowerText(resourceTruth.mediaKind);

  if (mediaKind !== 'video' && mediaKind !== 'audio') {
    return {
      code: 'RESOURCE_MEDIA_KIND_UNSUPPORTED',
      message: 'Store adapter accepts only video or audio resource truth.',
    };
  }

  if (!cleanText(resourceTruth.mediaHandleId)) {
    return {
      code: 'MEDIA_HANDLE_REQUIRED',
      message: 'Store adapter requires a media handle id.',
    };
  }

  if (!cleanText(resourceTruth.cid)) {
    return {
      code: 'CID_REQUIRED',
      message: 'Store adapter requires a content identity.',
    };
  }

  if (resourceTruth.storageMutationRequested === true) {
    return {
      code: 'UPSTREAM_STORAGE_MUTATION_REJECTED',
      message: 'Store adapter input must be truth-only before adaptation.',
    };
  }

  if (resourceTruth.releaseSideEffectAllowed === true) {
    return {
      code: 'UPSTREAM_RELEASE_SIDE_EFFECT_REJECTED',
      message: 'Store adapter input must not permit release side effects.',
    };
  }

  return null;
}

export function projectTvContinueWatchingStoreAdapter(input) {
  if (!input || typeof input !== 'object') {
    return baseProjection();
  }

  const resourceTruth =
    input.resourceTruth;

  const problem =
    validateResourceTruth(resourceTruth);

  if (problem) {
    return rejectedProjection(problem.code, problem.message);
  }

  if (resourceTruth.completed === true) {
    return clearProjection(resourceTruth);
  }

  if (
    resourceTruth.persistCandidate === true &&
    resourceTruth.persistAllowed === true
  ) {
    return upsertProjection(resourceTruth);
  }

  return noopProjection(
    resourceTruth,
    'Playback progress does not require a continue-watching store operation.',
  );
}
