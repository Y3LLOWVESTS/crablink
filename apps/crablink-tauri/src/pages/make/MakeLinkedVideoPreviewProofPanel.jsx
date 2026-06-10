/**
 * RO:WHAT — Display-only linked-video preview proof/details panel.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; separates proof rendering from preview payment controller.
 * RO:INTERACTS — MakeLinkedVideoDraftPreview.jsx, makeLinkedVideoPreviewFetch.js.
 * RO:INVARIANTS — display-only facts; not reuse permission; not ownership; not export authority; not ledger truth.
 * RO:METRICS — preview attempt/status display.
 * RO:CONFIG — none.
 * RO:SECURITY — shows redacted/backend-derived facts only.
 * RO:TEST — npm run build; manual linked video preview proof disclosure smoke.
 */

import { linkedVideoPreviewDisplayAmount } from './makeLinkedVideoPreviewFetch.js';

export default function MakeLinkedVideoPreviewProofPanel({ access, preview, receiptFacts }) {
  if (!(access?.quote?.summary || access?.payment?.summary || preview?.source)) {
    return null;
  }

  return (
    <details className="make-linked-video-preview-proof">
      <summary>Preview payment / gateway proof</summary>
      <div>
        <span>Amount</span>
        <strong>{receiptFacts.amount || linkedVideoPreviewDisplayAmount(access.quote)}</strong>
      </div>
      <div>
        <span>Route</span>
        <strong>{preview.source?.route || 'Preview bytes not loaded yet'}</strong>
      </div>
      <div>
        <span>Transport</span>
        <strong>{preview.source?.transport || preview.source?.label || 'Not loaded yet'}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong>{preview.source?.status ? `HTTP ${preview.source.status}` : 'Not loaded yet'}</strong>
      </div>
      <div>
        <span>Tx</span>
        <strong>{receiptFacts.txid || 'Not paid yet'}</strong>
      </div>
      <div>
        <span>Receipt</span>
        <strong>{receiptFacts.receiptHash || 'Not returned yet'}</strong>
      </div>
      {preview.source?.attempts?.length > 0 && (
        <div>
          <span>Attempts</span>
          <strong>
            {preview.source.attempts
              .map((attempt) => attempt.ok
                ? `${attempt.label || attempt.route}: ok ${attempt.status || ''}`.trim()
                : `${attempt.label || attempt.route}: ${attempt.error || 'failed'}`)
              .join(' | ')
              .slice(0, 900)}
          </strong>
        </div>
      )}
      <p>
        This is display-only preview access. It is not a reuse license, payout split, export permission, ownership proof, or backend mint.
      </p>
    </details>
  );
}
