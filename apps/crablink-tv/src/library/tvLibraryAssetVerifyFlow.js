/**
 * RO:WHAT — Composes TV Library asset gateway evidence, native manifest check, and verified render projection.
 * RO:WHY — Phase 9 needs one deterministic verify flow before React can expose a manual verify action.
 * RO:INTERACTS — tvGatewayAssetFetchModel, injected manifest-check adapter ports, and tvLibraryVerifiedAssetRenderModel.
 * RO:INVARIANTS — gateway evidence and native verification must stay bound to the active Library canonical URL, B3 CID, and asset kind.
 * RO:SECURITY — no global fetch, storage, cache persistence, img/src rendering, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — tvLibraryAssetVerifyFlow.test.mjs and check-crablink-tv-library-asset-verify-flow-boundary.mjs.
 */

import {
  TV_GATEWAY_ASSET_EVIDENCE_SCHEMA,
  TV_GATEWAY_ASSET_FETCH_STATE,
  projectTvGatewayAssetFetchRequest,
  readTvGatewayAssetEvidence,
} from './tvGatewayAssetFetchModel.js';

import {
  TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND,
  createIdleTvLibraryVerifiedAssetRender,
  projectTvLibraryVerifiedAssetRender,
} from './tvLibraryVerifiedAssetRenderModel.js';

export const TV_LIBRARY_ASSET_VERIFY_FLOW_SCHEMA =
  'crablink.tv.library-asset-verify-flow.v1';

export const TV_LIBRARY_ASSET_VERIFY_FLOW_STATE =
  Object.freeze({
    IDLE: 'idle',
    READY: 'ready',
    REJECTED: 'rejected',
  });

export const TV_LIBRARY_ASSET_VERIFY_FLOW_LIMITS =
  Object.freeze({
    CODE_CHARS: 96,
    MESSAGE_CHARS: 240,
  });

function freeze(value) {
  return Object.freeze({
    schema: TV_LIBRARY_ASSET_VERIFY_FLOW_SCHEMA,
    ...value,
  });
}

function boundedText(value, fallback, maxLength) {
  const text =
    typeof value === 'string'
      ? value.trim()
      : '';

  return (text || fallback).slice(
    0,
    maxLength,
  );
}

export function createIdleTvLibraryAssetVerifyFlow(
  {
    message =
      'Library asset verification has not started.',
  } = {},
) {
  return freeze({
    state: TV_LIBRARY_ASSET_VERIFY_FLOW_STATE.IDLE,
    ready: false,
    renderView:
      createIdleTvLibraryVerifiedAssetRender({
        message,
      }),
    code: 'TV_LIBRARY_ASSET_VERIFY_FLOW_IDLE',
    message: boundedText(
      message,
      'Library asset verification has not started.',
      TV_LIBRARY_ASSET_VERIFY_FLOW_LIMITS.MESSAGE_CHARS,
    ),
  });
}

function rejectedFlow({
  code,
  message,
  renderView,
}) {
  return freeze({
    state: TV_LIBRARY_ASSET_VERIFY_FLOW_STATE.REJECTED,
    ready: false,
    renderView:
      renderView ??
      createIdleTvLibraryVerifiedAssetRender({
        message:
          'Verification failed before render facts were available.',
      }),
    code: boundedText(
      code,
      'TV_LIBRARY_ASSET_VERIFY_FLOW_REJECTED',
      TV_LIBRARY_ASSET_VERIFY_FLOW_LIMITS.CODE_CHARS,
    ),
    message: boundedText(
      message,
      'Library asset verification failed.',
      TV_LIBRARY_ASSET_VERIFY_FLOW_LIMITS.MESSAGE_CHARS,
    ),
  });
}

function isReadyGatewayEvidence(evidence) {
  return Boolean(
    evidence &&
      evidence.schema === TV_GATEWAY_ASSET_EVIDENCE_SCHEMA &&
      evidence.state === TV_GATEWAY_ASSET_FETCH_STATE.READY &&
      evidence.ready === true &&
      evidence.request &&
      evidence.manifest &&
      evidence.assetBytes instanceof Uint8Array,
  );
}

function nativeManifestRequest(evidence) {
  return Object.freeze({
    manifest: evidence.manifest,
    assetBytes: evidence.assetBytes,
  });
}

export async function runTvLibraryAssetVerifyFlow(
  {
    detailView,
    gatewayOrigin,
    transport,
    manifestAdapter,
  } = {},
) {
  const request =
    projectTvGatewayAssetFetchRequest({
      detailView,
      gatewayOrigin,
    });

  if (request.ready !== true) {
    return rejectedFlow({
      code:
        request.code ??
        'TV_LIBRARY_ASSET_VERIFY_FLOW_BAD_GATEWAY_REQUEST',
      message:
        request.message ??
        'Gateway request was not ready for verification.',
    });
  }

  const evidence =
    await readTvGatewayAssetEvidence({
      request,
      transport,
    });

  if (!isReadyGatewayEvidence(evidence)) {
    return rejectedFlow({
      code:
        evidence.code ??
        'TV_LIBRARY_ASSET_VERIFY_FLOW_BAD_GATEWAY_EVIDENCE',
      message:
        evidence.message ??
        'Gateway evidence was not ready for native verification.',
    });
  }

  if (
    typeof manifestAdapter?.checkAssetManifest !==
    'function'
  ) {
    return rejectedFlow({
      code:
        'TV_LIBRARY_ASSET_VERIFY_FLOW_NO_NATIVE_ADAPTER',
      message:
        'A fixed native asset-manifest adapter is required.',
    });
  }

  let verification;

  try {
    verification =
      await manifestAdapter.checkAssetManifest(
        nativeManifestRequest(evidence),
      );
  } catch {
    return rejectedFlow({
      code:
        'TV_LIBRARY_ASSET_VERIFY_FLOW_NATIVE_CHECK_FAILED',
      message:
        'Native asset manifest verification failed.',
    });
  }

  const renderView =
    projectTvLibraryVerifiedAssetRender({
      detailView,
      verification,
    });

  if (
    renderView.kind !==
    TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.READY
  ) {
    return rejectedFlow({
      code:
        'TV_LIBRARY_ASSET_VERIFY_FLOW_RENDER_REJECTED',
      message:
        renderView.message ??
        'Native verification did not produce render-ready facts.',
      renderView,
    });
  }

  return freeze({
    state: TV_LIBRARY_ASSET_VERIFY_FLOW_STATE.READY,
    ready: true,
    request,
    evidence,
    verification,
    renderView,
    code: 'TV_LIBRARY_ASSET_VERIFY_FLOW_READY',
    message:
      'Library asset verification completed and render facts are ready.',
  });
}
