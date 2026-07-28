/**
 * RO:WHAT — Visible Library detail surface for identifiers and verified render facts from reviewed asset handoffs.
 * RO:WHY — Gives asset selections a persistent TV destination before network rendering.
 * RO:INTERACTS — tvLibraryAssetDetailModel and TvApp Library state.
 * RO:INVARIANTS — renders identifiers and verified facts only; empty/rejected states stay truthful; Clear is remote-focusable.
 * RO:SECURITY — no invoke, fetch, storage, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — TvLibraryAssetDetailPanel.source.test.mjs and check-crablink-tv-library-asset-detail-boundary.mjs.
 */

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

import {
  TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND,
} from './tvLibraryVerifiedAssetRenderModel.js';

import {
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND,
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE,
  projectTvLibraryVerifiedRenderDisplay,
} from './tvLibraryVerifiedRenderDisplayModel.js';

import {
  TV_LIBRARY_VERIFY_UI_STATE,
} from './tvLibraryVerifyUiModel.js';

import {
  TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE,
} from './tvLibraryManualVerifyExecution.js';

import {
  TvLibraryVerifiedImageRenderSurface,
} from './TvLibraryVerifiedImageRenderSurface.jsx';

import {
  TvLibraryVerifiedArticleRenderSurface,
} from './TvLibraryVerifiedArticleRenderSurface.jsx';

export function TvLibraryAssetDetailPanel({
  detailView,
  verifiedRenderView,
  verifyUiView,
  manualVerifyExecutionView,
  imageRenderSurfaceView,
  articleRenderSurfaceView,
  onVerifyAsset,
  onClear,
}) {
  const ready =
    detailView?.kind ===
    TV_LIBRARY_ASSET_DETAIL_KIND.READY;

  const verifiedRenderKind =
    verifiedRenderView?.kind ??
    TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.IDLE;

  const verifiedRenderReady =
    verifiedRenderKind ===
    TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.READY;

  const verifiedRenderDisplayView =
    projectTvLibraryVerifiedRenderDisplay({
      detailView,
      verifiedRenderView,
    });

  const verifiedDisplayState =
    verifiedRenderDisplayView.state ??
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE.IDLE;

  const verifiedDisplayReady =
    verifiedDisplayState ===
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE.READY;

  const verifiedDisplayImage =
    verifiedRenderDisplayView.displayKind ===
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.IMAGE_FRAME;

  const verifiedDisplayArticle =
    verifiedRenderDisplayView.displayKind ===
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.ARTICLE_READER;

  const verifyUiState =
    verifyUiView?.state ??
    TV_LIBRARY_VERIFY_UI_STATE.IDLE;

  const verifyUiCanRequest =
    verifyUiView?.canRequest === true;

  const manualVerifyExecutionState =
    manualVerifyExecutionView?.state ??
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE.IDLE;

  const manualVerifyRunning =
    manualVerifyExecutionState ===
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE.RUNNING;

  const manualVerifyReady =
    manualVerifyExecutionState ===
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE.READY;

  const manualVerifyRejected =
    manualVerifyExecutionState ===
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE.REJECTED;

  const manualVerifyBlocked =
    manualVerifyExecutionState ===
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE.BLOCKED;

  const verifyUiBlocked =
    verifyUiState ===
    TV_LIBRARY_VERIFY_UI_STATE.BLOCKED;

  const verifyControlActive =
    verifyUiCanRequest &&
    !manualVerifyRunning;

  const verifyControlLabel =
    manualVerifyRunning
      ? 'Verifying…'
      : manualVerifyReady ||
          verifiedRenderReady
        ? 'Verified'
        : manualVerifyRejected
          ? 'Verify again'
          : 'Verify asset';

  const manualVerifyStatus =
    manualVerifyRunning
      ? 'Verification running'
      : manualVerifyReady
        ? 'Verified'
        : manualVerifyRejected
          ? 'Verification rejected'
          : manualVerifyBlocked ||
              verifyUiBlocked
            ? 'Verification blocked'
            : verifyUiCanRequest
              ? 'Ready for manual verify'
              : 'Manual verify unavailable';

  const manualVerifyMessage =
    manualVerifyExecutionState !==
      TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE.IDLE
      ? manualVerifyExecutionView?.message
      : verifyUiView?.message;

  const manualVerifyCode =
    manualVerifyExecutionState !==
      TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE.IDLE
      ? manualVerifyExecutionView?.code
      : verifyUiView?.code;

  return (
    <section
      className="tv-library-asset-detail"
      aria-labelledby="tv-library-asset-detail-title"
      data-tv-library-asset-detail-kind={
        detailView?.kind ??
        TV_LIBRARY_ASSET_DETAIL_KIND.IDLE
      }
    >
      <div className="tv-section-heading tv-library-asset-detail__heading">
        <div>
          <p className="tv-card-label">
            Library asset
          </p>

          <h2 id="tv-library-asset-detail-title">
            {detailView?.title ??
              'No Library asset selected'}
          </h2>

          <p className="tv-library-asset-detail__copy">
            {detailView?.summary ??
              'Choose a reviewed asset card from the Home catalog.'}
          </p>
        </div>

        {ready ? (
          <div className="tv-library-asset-detail__actions">
            <button
              className="tv-action"
              type="button"
              data-tv-focusable="true"
              data-tv-focus-key="library-asset-verify"
              aria-disabled={
                verifyControlActive ? undefined : 'true'
              }
              data-tv-verification-running={
                manualVerifyRunning
                  ? 'true'
                  : undefined
              }
              onClick={
                verifyControlActive
                  ? onVerifyAsset
                  : undefined
              }
            >
              {verifyControlLabel}
            </button>

            <button
              className="tv-action tv-action--secondary"
              type="button"
              data-tv-focusable="true"
              data-tv-focus-key="library-asset-detail-clear"
              onClick={onClear}
            >
              Clear asset detail
            </button>
          </div>
        ) : null}
      </div>

      {ready ? (
        <>
        <div className="tv-library-asset-detail__card">
          <div className="tv-library-asset-detail__fact">
            <span>Kind</span>
            <strong>{detailView.assetKind}</strong>
          </div>

          <div className="tv-library-asset-detail__fact">
            <span>Canonical crab URL</span>
            <code>{detailView.canonicalCrabUrl}</code>
          </div>

          <div className="tv-library-asset-detail__fact">
            <span>B3 CID</span>
            <code>{detailView.cid}</code>
          </div>

          <div className="tv-library-asset-detail__fact">
            <span>Hash</span>
            <code>{detailView.hash}</code>
          </div>
        </div>

        <div
          className="tv-library-verified-render"
          data-tv-library-verified-render-kind={verifiedRenderKind}
        >
          <div className="tv-library-verified-render__status">
            <span>Verified render</span>

            <strong>
              {verifiedRenderReady
                ? `Verified ${verifiedRenderView.renderKind} render ready`
                : verifiedRenderKind ===
                    TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.REJECTED
                  ? 'Verified render rejected'
                  : 'Verified render pending'}
            </strong>
          </div>

          {verifiedRenderReady ? (
            <div className="tv-library-verified-render__facts">
              <div className="tv-library-verified-render__fact">
                <span>Content type</span>
                <code>{verifiedRenderView.contentType}</code>
              </div>

              <div className="tv-library-verified-render__fact">
                <span>Content length</span>
                <strong>{verifiedRenderView.contentLength}</strong>
              </div>

              <div className="tv-library-verified-render__fact">
                <span>Max verified bytes</span>
                <strong>{verifiedRenderView.maxVerifiedAssetBytes}</strong>
              </div>
            </div>
          ) : (
            <p>
              {verifiedRenderView?.message ??
                'Awaiting a native verified manifest result before rendering this asset.'}
            </p>
          )}
        </div>

        <div
          className="tv-library-verified-display"
          data-tv-library-verified-display-state={
            verifiedDisplayState
          }
          data-tv-library-verified-display-kind={
            verifiedRenderDisplayView.displayKind ??
            'pending'
          }
        >
          <div className="tv-library-verified-display__status">
            <span>Verified display</span>

            <strong>
              {verifiedDisplayReady
                ? verifiedRenderDisplayView.title
                : 'Verified display pending'}
            </strong>
          </div>

          {verifiedDisplayReady &&
          verifiedDisplayImage ? (
            <div className="tv-library-verified-display__image-frame">
              <div
                className="tv-library-verified-display__image-glyph"
                aria-hidden="true"
              >
                IMG
              </div>

              <div>
                <strong>Verified image display surface</strong>

                <p>
                  {verifiedRenderDisplayView.copy}
                </p>
              </div>
            </div>
          ) : null}

          {verifiedDisplayReady &&
          verifiedDisplayArticle ? (
            <div className="tv-library-verified-display__article-reader">
              <div className="tv-library-verified-display__article-lines">
                <span />
                <span />
                <span />
              </div>

              <div>
                <strong>Verified article reader surface</strong>

                <p>
                  {verifiedRenderDisplayView.copy}
                </p>
              </div>
            </div>
          ) : null}

          {!verifiedDisplayReady ? (
            <p>
              {verifiedRenderDisplayView.message}
            </p>
          ) : null}
        </div>

        <TvLibraryVerifiedImageRenderSurface
          renderSurfaceView={imageRenderSurfaceView}
        />

        <TvLibraryVerifiedArticleRenderSurface
          renderSurfaceView={articleRenderSurfaceView}
        />

        <div
          className="tv-library-verify-ui"
          data-tv-library-verify-ui-state={verifyUiState}
          data-tv-library-manual-verify-execution-state={
            manualVerifyExecutionState
          }
        >
          <div className="tv-library-verify-ui__status">
            <span>Manual verification</span>

            <strong>
              {manualVerifyStatus}
            </strong>
          </div>

          <p className="tv-library-verify-ui__message">
            {manualVerifyMessage ??
              'Manual verification is waiting for a reviewed asset detail.'}
          </p>

          {manualVerifyCode ? (
            <code className="tv-library-verify-ui__code">
              {manualVerifyCode}
            </code>
          ) : null}
        </div>
        </>
      ) : (
        <div className="tv-library-asset-detail__empty">
          <strong>
            {detailView?.kind ===
            TV_LIBRARY_ASSET_DETAIL_KIND.REJECTED
              ? 'The reviewed asset route was rejected.'
              : 'No reviewed asset detail is active.'}
          </strong>

          <p>
            Select an asset card on Home to project its canonical
            route identifiers into this Library surface.
          </p>
        </div>
      )}
    </section>
  );
}
