/**
 * RO:WHAT — Portal popover for adding linked media references in crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC; keeps linked-reference UI separate from the main preview chrome.
 * RO:INTERACTS — MakePreviewStudioChrome and makeLinkedMediaModel-backed draft metadata.
 * RO:INVARIANTS — draft metadata only; no reuse permission; no payout split truth; no wallet mutation; no export authority.
 * RO:METRICS — none.
 * RO:CONFIG — local linked media input state only.
 * RO:SECURITY — no private keys, capabilities, balances, receipts, or backend truth are created here.
 * RO:TEST — npm run build; manual linked video/audio composer smoke.
 */

import { createPortal } from 'react-dom';

export default function MakeLinkedMediaComposerPopover({
  closeLinkedMediaComposer,
  handleLinkedMediaComposerSubmit,
  linkedMediaComposer,
  updateLinkedMediaComposerField,
}) {
  if (!linkedMediaComposer || typeof document === 'undefined') {
    return null;
  }

  return createPortal((
    <>
      <div
        className="make-linked-media-popover-backdrop"
        aria-hidden="true"
        onClick={closeLinkedMediaComposer}
      />
      <div
        className="make-linked-media-popover"
        role="dialog"
        aria-modal="false"
        aria-label={linkedMediaComposer.kind === 'audio' ? 'Paste audio link' : 'Paste video link'}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="make-linked-media-popover-head">
          <div>
            <span>{linkedMediaComposer.kind === 'audio' ? 'Audio link' : 'Video reuse link'}</span>
            <strong>{linkedMediaComposer.kind === 'audio' ? 'Paste crab:// audio' : 'Paste crab:// video'}</strong>
          </div>
          <button type="button" aria-label="Close linked media composer" onClick={closeLinkedMediaComposer}>
            ×
          </button>
        </div>

        <form className="make-linked-media-form" onSubmit={handleLinkedMediaComposerSubmit}>
          <input
            autoFocus
            type="text"
            value={linkedMediaComposer.url || ''}
            onChange={(event) => updateLinkedMediaComposerField({ url: event.target.value })}
            placeholder={linkedMediaComposer.kind === 'audio'
              ? 'crab://<64 lowercase hex>.music'
              : 'crab://<64 lowercase hex>.video'}
          />
          <button type="submit">
            {linkedMediaComposer.kind === 'video' ? 'Insert draft clip' : 'Store unverified link'}
          </button>
        </form>

        <div
          className={`make-linked-media-time-grid ${linkedMediaComposer.kind === 'video' ? 'is-editable' : 'is-future'}`}
          aria-label={linkedMediaComposer.kind === 'video' ? 'Linked video source start and end' : 'Future linked media trim window'}
        >
          <label>
            <span>Source start</span>
            <input
              type="text"
              value={linkedMediaComposer.sourceStartText || '0:00'}
              onChange={(event) => updateLinkedMediaComposerField({ sourceStartText: event.target.value })}
              placeholder="0:00"
              disabled={linkedMediaComposer.kind !== 'video'}
            />
          </label>
          <label>
            <span>Source end</span>
            <input
              type="text"
              value={linkedMediaComposer.useEntireSource ? '' : (linkedMediaComposer.sourceEndText || '0:30')}
              onChange={(event) => updateLinkedMediaComposerField({ sourceEndText: event.target.value })}
              placeholder="0:30"
              disabled={linkedMediaComposer.kind !== 'video' || linkedMediaComposer.useEntireSource}
            />
          </label>
          <label className="make-linked-media-entire">
            <input
              type="checkbox"
              checked={Boolean(linkedMediaComposer.useEntireSource)}
              onChange={(event) => updateLinkedMediaComposerField({ useEntireSource: event.target.checked })}
              disabled={linkedMediaComposer.kind !== 'video'}
            />
            <span>
              {linkedMediaComposer.kind === 'video'
                ? 'Use whole source instead of a start/end window'
                : 'Audio link timing is draft-only for now'}
            </span>
          </label>
          {linkedMediaComposer.kind === 'video' && (
            <small className="make-linked-media-time-help">
              Examples: 0:30, 1:23, 01:02:03, 90, or 1m30s. This source window is draft metadata until backend rights/export inclusion is built.
            </small>
          )}
        </div>

        <p>
          Linked media is stored as draft metadata only. Backend reuse authorization, ROC split receipts, and export inclusion still need the RustyOnions service path.
        </p>
      </div>
    </>
  ), document.body);
}
