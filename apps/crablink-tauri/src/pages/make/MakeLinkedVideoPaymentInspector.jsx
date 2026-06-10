/**
 * RO:WHAT — Linked video payment/preview inspector for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/ECON; keeps paid preview UI isolated from the main studio shell.
 * RO:INTERACTS — MakePreviewStudioChrome.jsx, MakeLinkedVideoDraftPreview.jsx, content-view quote/pay flow.
 * RO:INVARIANTS — preview/view payment only; no reuse authorization; no export rights; no wallet/ledger mutation here.
 * RO:METRICS — none.
 * RO:CONFIG — local selected linked video preview state only.
 * RO:SECURITY — no fake receipts, balances, CIDs, ownership, reuse rights, or payout split truth.
 * RO:TEST — npm run build; manual crab://make linked video Pay / preview inspector smoke.
 */

import LinkedVideoDraftPreview from './MakeLinkedVideoDraftPreview.jsx';

export default function MakeLinkedVideoPaymentInspector({
  app,
  hasLinkedVideoDrafts = false,
  linkedVideoPreviewItem,
  onClose,
  onPreviewReady,
}) {
  if (!hasLinkedVideoDrafts || !linkedVideoPreviewItem) {
    return null;
  }

  return (
    <div
      className="make-linked-video-strip make-linked-video-payment-inspector"
      aria-label="Selected linked video payment preview"
    >
      <div className="make-linked-video-strip-head">
        <span>Linked source payment</span>
        <strong>{linkedVideoPreviewItem.displayName || 'Linked video reference'}</strong>
        <button
          className="make-linked-video-inspector-close"
          type="button"
          onClick={onClose}
          aria-label="Close linked video payment inspector"
        >
          Close
        </button>
      </div>

      <div className="make-linked-video-payment-note">
        <strong>Preview/view payment only.</strong>
        <span>
          Get a quote and pay here to load source preview bytes into Make. This still does not grant reuse, export, ownership, mint, or payout split rights.
        </span>
      </div>

      <LinkedVideoDraftPreview
        item={linkedVideoPreviewItem}
        app={app}
        onClose={onClose}
        onPreviewReady={onPreviewReady}
      />
    </div>
  );
}
