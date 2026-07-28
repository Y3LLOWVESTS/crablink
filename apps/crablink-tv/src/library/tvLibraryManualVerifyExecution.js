/**
 * RO:WHAT — Runs manually requested CrabLink TV Library verification through reviewed gateway and native adapters.
 * RO:WHY — Phase 9J connects the existing manual control to the Phase 9H flow without giving React direct fetch or invoke authority.
 * RO:INTERACTS — tvGatewayProfilePort, tvGatewayAssetHttpTransport, tvAssetManifestAdapter, and tvLibraryAssetVerifyFlow.
 * RO:INVARIANTS — one request at a time; reviewed gateway origin only; results remain bound to the active Library asset.
 * RO:SECURITY — no global fetch, direct invoke, storage, raw-byte return, wallet, ledger, ROC, entitlement, or finality authority.
 * RO:TEST — tvLibraryManualVerifyExecution.test.mjs and check-crablink-tv-library-manual-verify-execution-foundation-boundary.mjs.
 */

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

import {
  TV_LIBRARY_ASSET_VERIFY_FLOW_STATE,
  runTvLibraryAssetVerifyFlow,
} from './tvLibraryAssetVerifyFlow.js';

import {
  createIdleTvLibraryVerifiedAssetRender,
} from './tvLibraryVerifiedAssetRenderModel.js';

export const TV_LIBRARY_MANUAL_VERIFY_EXECUTION_SCHEMA =
  'crablink.tv.library-manual-verify-execution.v1';

export const TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE =
  Object.freeze({
    IDLE: 'idle',
    RUNNING: 'running',
    READY: 'ready',
    REJECTED: 'rejected',
    BLOCKED: 'blocked',
  });

export const TV_LIBRARY_MANUAL_VERIFY_EXECUTION_LIMITS =
  Object.freeze({
    CODE_CHARS: 96,
    MESSAGE_CHARS: 240,
  });

const TV_GATEWAY_PROFILE_SCHEMA =
  'crablink.tv.gateway-profile.v1';

function freeze(value) {
  return Object.freeze({
    schema:
      TV_LIBRARY_MANUAL_VERIFY_EXECUTION_SCHEMA,

    ...value,
  });
}

function boundedText(
  value,
  fallback,
  maxLength,
) {
  const text =
    typeof value === 'string'
      ? value.trim()
      : '';

  return (text || fallback).slice(
    0,
    maxLength,
  );
}

function idleRender(message) {
  return createIdleTvLibraryVerifiedAssetRender({
    message,
  });
}

function rejectedExecution({
  state =
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
      .REJECTED,

  code,
  message,
  renderView,
}) {
  const boundedMessage =
    boundedText(
      message,
      'Manual Library verification failed.',
      TV_LIBRARY_MANUAL_VERIFY_EXECUTION_LIMITS
        .MESSAGE_CHARS,
    );

  return freeze({
    state,
    ready: false,

    code:
      boundedText(
        code,
        'TV_LIBRARY_MANUAL_VERIFY_REJECTED',
        TV_LIBRARY_MANUAL_VERIFY_EXECUTION_LIMITS
          .CODE_CHARS,
      ),

    message:
      boundedMessage,

    renderView:
      renderView ??
      idleRender(boundedMessage),
  });
}

export function createIdleTvLibraryManualVerifyExecution(
  {
    message =
      'Manual Library verification has not started.',
  } = {},
) {
  const boundedMessage =
    boundedText(
      message,
      'Manual Library verification has not started.',
      TV_LIBRARY_MANUAL_VERIFY_EXECUTION_LIMITS
        .MESSAGE_CHARS,
    );

  return freeze({
    state:
      TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
        .IDLE,

    ready: false,

    code:
      'TV_LIBRARY_MANUAL_VERIFY_IDLE',

    message:
      boundedMessage,

    renderView:
      idleRender(boundedMessage),
  });
}

function executionTarget(detailView) {
  if (
    detailView?.kind !==
    TV_LIBRARY_ASSET_DETAIL_KIND.READY ||
    typeof detailView.assetKind !== 'string' ||
    typeof detailView.canonicalCrabUrl !== 'string' ||
    typeof detailView.cid !== 'string'
  ) {
    return null;
  }

  const assetKind =
    detailView.assetKind.trim();

  const canonicalCrabUrl =
    detailView.canonicalCrabUrl.trim();

  const cid =
    detailView.cid.trim();

  if (
    !assetKind ||
    !canonicalCrabUrl ||
    !cid
  ) {
    return null;
  }

  return Object.freeze({
    assetKind,
    canonicalCrabUrl,
    cid,
  });
}

export function captureTvLibraryManualVerifyExecutionTarget(
  {
    detailView,
  } = {},
) {
  return executionTarget(detailView);
}

export function isCurrentTvLibraryManualVerifyExecutionTarget(
  {
    target,
    detailView,
  } = {},
) {
  const current =
    executionTarget(detailView);

  return Boolean(
    target &&
    current &&
    target.assetKind === current.assetKind &&
    target.canonicalCrabUrl ===
      current.canonicalCrabUrl &&
    target.cid === current.cid
  );
}

export function createRunningTvLibraryManualVerifyExecution(
  {
    detailView,
  } = {},
) {
  if (
    detailView?.kind !==
    TV_LIBRARY_ASSET_DETAIL_KIND.READY
  ) {
    return rejectedExecution({
      state:
        TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
          .BLOCKED,

      code:
        'TV_LIBRARY_MANUAL_VERIFY_DETAIL_REQUIRED',

      message:
        'Manual verification requires an active reviewed Library asset.',
    });
  }

  return freeze({
    state:
      TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
        .RUNNING,

    ready: false,

    code:
      'TV_LIBRARY_MANUAL_VERIFY_RUNNING',

    message:
      'Reading reviewed gateway evidence and checking the native asset manifest.',

    renderView:
      idleRender(
        'Manual verification is running for this Library asset.',
      ),
  });
}

async function readReviewedGatewayOrigin(
  gatewayProfilePort,
) {
  if (
    typeof gatewayProfilePort
      ?.readGatewayProfile !==
    'function'
  ) {
    return rejectedExecution({
      code:
        'TV_LIBRARY_MANUAL_VERIFY_NO_GATEWAY_PROFILE_PORT',

      message:
        'The reviewed gateway-profile adapter is unavailable.',
    });
  }

  let profile;

  try {
    profile =
      await gatewayProfilePort
        .readGatewayProfile();
  } catch {
    return rejectedExecution({
      code:
        'TV_LIBRARY_MANUAL_VERIFY_GATEWAY_PROFILE_FAILED',

      message:
        'The reviewed gateway profile could not be read.',
    });
  }

  if (
    profile?.schema !==
      TV_GATEWAY_PROFILE_SCHEMA ||
    profile.state !== 'ready' ||
    typeof profile.origin !== 'string' ||
    !profile.origin
  ) {
    return rejectedExecution({
      code:
        profile?.errorCode ??
        'TV_LIBRARY_MANUAL_VERIFY_GATEWAY_NOT_READY',

      message:
        'Configure a reviewed gateway profile before manual asset verification.',
    });
  }

  return Object.freeze({
    origin:
      profile.origin,
  });
}

export async function runTvLibraryManualVerifyExecution(
  {
    detailView,
    gatewayProfilePort,
    transport,
    manifestAdapter,

    runVerifyFlow =
      runTvLibraryAssetVerifyFlow,
  } = {},
) {
  if (
    detailView?.kind !==
    TV_LIBRARY_ASSET_DETAIL_KIND.READY
  ) {
    return rejectedExecution({
      state:
        TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
          .BLOCKED,

      code:
        'TV_LIBRARY_MANUAL_VERIFY_DETAIL_REQUIRED',

      message:
        'Manual verification requires an active reviewed Library asset.',
    });
  }

  if (
    typeof runVerifyFlow !== 'function'
  ) {
    return rejectedExecution({
      code:
        'TV_LIBRARY_MANUAL_VERIFY_FLOW_UNAVAILABLE',

      message:
        'The bounded Library verify flow is unavailable.',
    });
  }

  const gateway =
    await readReviewedGatewayOrigin(
      gatewayProfilePort,
    );

  if (!gateway.origin) {
    return gateway;
  }

  let flow;

  try {
    flow =
      await runVerifyFlow({
        detailView,

        gatewayOrigin:
          gateway.origin,

        transport,
        manifestAdapter,
      });
  } catch {
    return rejectedExecution({
      code:
        'TV_LIBRARY_MANUAL_VERIFY_FLOW_FAILED',

      message:
        'Manual verification failed before a bounded result was available.',
    });
  }

  if (
    flow?.state !==
      TV_LIBRARY_ASSET_VERIFY_FLOW_STATE
        .READY ||
    flow.ready !== true
  ) {
    return rejectedExecution({
      code:
        flow?.code ??
        'TV_LIBRARY_MANUAL_VERIFY_REJECTED',

      message:
        flow?.message ??
        'Manual verification was rejected.',

      renderView:
        flow?.renderView,
    });
  }

  return freeze({
    state:
      TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
        .READY,

    ready: true,

    code:
      'TV_LIBRARY_MANUAL_VERIFY_READY',

    message:
      'Manual Library verification completed with native verified render facts.',

    renderView:
      flow.renderView,
  });
}

export function createTvLibraryManualVerifyExecutionLock(
  {
    execute =
      runTvLibraryManualVerifyExecution,
  } = {},
) {
  if (
    typeof execute !== 'function'
  ) {
    throw new TypeError(
      'Manual verify execution lock requires an execute function.',
    );
  }

  let running = false;

  return Object.freeze({
    isRunning() {
      return running;
    },

    async run(input) {
      if (running) {
        return rejectedExecution({
          state:
            TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
              .BLOCKED,

          code:
            'TV_LIBRARY_MANUAL_VERIFY_DUPLICATE_REQUEST',

          message:
            'A manual verification request is already running.',
        });
      }

      running = true;

      try {
        return await execute(input);
      } finally {
        running = false;
      }
    },
  });
}
