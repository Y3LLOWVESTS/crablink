/**
 * RO:WHAT — Linked-video paid preview frame and payment action UI.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps preview rendering separate from preview payment controller.
 * RO:INTERACTS — MakeLinkedVideoDraftPreview.jsx, make.css.
 * RO:INVARIANTS — UI only; no wallet mutation; no receipt truth; no export permission.
 * RO:METRICS — none.
 * RO:CONFIG — selected linked video preview state.
 * RO:SECURITY — displays backend-derived facts only; no secrets or spend authority.
 * RO:TEST — npm run build; manual linked video preview smoke.
 */

import {
  linkedVideoPreviewDisplayAmount,
  linkedVideoPreviewErrorMessage,
} from './makeLinkedVideoPreviewFetch.js';

export default function MakeLinkedVideoPreviewFrame({
  access,
  canFetchPreview,
  handleTimeUpdate,
  isBusy,
  item,
  onLoadPaidPreview,
  onPayPreview,
  onQuotePreview,
  preview,
  seekToStart,
  videoRef,
}) {
  return (
    <div className={`make-linked-video-preview-frame is-${preview.status}`}>
      {preview.objectUrl && canFetchPreview ? (
        <video
          key={`${item.id || item.url}:${preview.objectUrl}`}
          ref={videoRef}
          src={preview.objectUrl}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={seekToStart}
          onTimeUpdate={handleTimeUpdate}
        />
      ) : (
        <div className="make-linked-video-preview-locked">
          <strong>
            {preview.status === 'fetching'
              ? 'Fetching paid preview…'
              : access.status === 'paid'
                ? 'Paid preview receipt returned'
                : 'Preview is behind the paid content_view gate'}
          </strong>
          <span>
            Pay to watch this source clip before previewing it in Make. This does not grant export, remix, ownership, or payout rights.
          </span>

          <div className="make-linked-video-preview-pay-actions">
            <button
              type="button"
              onClick={onQuotePreview}
              disabled={isBusy || access.status === 'paid'}
            >
              {access.status === 'quoting'
                ? 'Quoting…'
                : access.quote?.summary
                  ? `Quoted ${linkedVideoPreviewDisplayAmount(access.quote)}`
                  : 'Get preview quote'}
            </button>
            <button
              type="button"
              className="is-primary"
              onClick={access.status === 'paid' ? onLoadPaidPreview : onPayPreview}
              disabled={isBusy || (!access.quote?.summary && access.status !== 'paid')}
            >
              {preview.status === 'fetching'
                ? 'Loading preview…'
                : access.status === 'paid'
                  ? 'Load paid preview'
                  : access.quote?.summary
                    ? `Pay ${linkedVideoPreviewDisplayAmount(access.quote)}`
                    : 'Pay after quote'}
            </button>
          </div>
        </div>
      )}

      {preview.status === 'ready' && (
        <div className="make-linked-video-preview-status">
          Paid preview unlocked · source bytes are display-only.
        </div>
      )}

      {preview.status === 'error' && (
        <div className="make-linked-video-preview-status is-error">
          {linkedVideoPreviewErrorMessage(preview.error)}
        </div>
      )}

      {access.status === 'error' && (
        <div className="make-linked-video-preview-status is-error">
          {linkedVideoPreviewErrorMessage(access.error)}
        </div>
      )}
    </div>
  );
}
