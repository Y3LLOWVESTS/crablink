/**
 * RO:WHAT — Linked-video timeline bubble for crab://make preview timeline.
 * RO:WHY — App Integration; Concerns: DX/SEC/ECON; isolates linked-source UI before timeline behavior fixes.
 * RO:INTERACTS — MakePreviewStudioChrome.jsx, makePageConstants.js, makeDraftModel.js.
 * RO:INVARIANTS — linked video is a draft reference/preview proxy only; no reuse authorization; no ownership truth; no payout split truth.
 * RO:METRICS — none.
 * RO:CONFIG — local selected linked-video preview state only.
 * RO:SECURITY — no fake receipts, CIDs, balances, reuse rights, or wallet/ledger mutation.
 * RO:TEST — npm run build; manual crab://make linked-video select/move/trim/pay-preview/remove smoke.
 */

import { makeLinkedVideoTimelineItemKey } from './makePageConstants.js';
import { formatDurationMs } from './makeDraftModel.js';

export default function MakePreviewLinkedVideoTimelineClip({
  beginLinkedVideoMoveDrag,
  beginLinkedVideoTrimDrag,
  index = 0,
  isRecording = false,
  item,
  linkedVideoPreviewId,
  onOpenPreview,
  onRemove,
  onSelect,
  previewClipMoveDrag,
  selectedLinkedVideoId,
  timelineVisualOrderForKey,
  timelineVisualTotalDurationMs = 1,
}) {
  if (!item) {
    return null;
  }

  const sourceStartMs = Number(item?.sourceStartMs || 0);
  const sourceEndMs = Number(item?.sourceEndMs || 0);
  const linkedDurationMs = Math.max(
    1,
    Number(item?.timelineDurationMs || 0)
      || (sourceEndMs > sourceStartMs ? sourceEndMs - sourceStartMs : 0)
      || 30_000,
  );
  const active = selectedLinkedVideoId === item.id || linkedVideoPreviewId === item.id;
  const flexGrow = Math.max(
    0.42,
    linkedDurationMs / Math.max(1, Number(timelineVisualTotalDurationMs || 1)),
  );
  const statusLabel = item.rightsStatusLabel || 'Rights not checked';
  const linkedTimelineKey = makeLinkedVideoTimelineItemKey(item.id);
  const displayName = item.displayName || `Linked video ${index + 1}`;
  const order = typeof timelineVisualOrderForKey === 'function'
    ? timelineVisualOrderForKey(linkedTimelineKey)
    : index;

  return (
    <div
      className={`make-preview-mini-clip make-preview-linked-video-clip is-linked-video ${active ? 'is-active' : ''} ${item.previewStatus === 'ready' || item.previewObjectUrl ? 'has-linked-preview-proxy' : ''} ${previewClipMoveDrag?.activeKey === linkedTimelineKey || previewClipMoveDrag?.activeLinkedVideoId === item.id ? 'is-moving' : ''}`}
      key={item.id || item.url || `linked-video-${index}`}
      data-make-timeline-item-key={linkedTimelineKey}
      data-make-linked-video-id={item.id}
      style={{
        order,
        flexGrow,
        '--make-visible-duration-ms': linkedDurationMs,
      }}
      role="listitem"
      title={`${displayName} · ${item.rangeLabel || 'Source window not set'} · ${statusLabel}`}
    >
      {(previewClipMoveDrag?.beforeKey === linkedTimelineKey || previewClipMoveDrag?.beforeLinkedVideoId === item.id) && (
        <span className="make-preview-mini-drop-marker" aria-hidden="true" />
      )}

      <span aria-hidden="true">🔗</span>

      <button
        className="make-preview-mini-move-handle make-preview-linked-video-move"
        type="button"
        aria-label={`Move ${displayName} on the timeline`}
        title="Drag to move this linked video on the timeline"
        disabled={isRecording}
        onPointerDown={(event) => beginLinkedVideoMoveDrag?.(event, item)}
      >
        MOVE
      </button>

      <button
        className="make-preview-mini-clip-main"
        type="button"
        onClick={() => onSelect?.(item.id)}
        title={`Select ${displayName}`}
      >
        <strong>{displayName}</strong>
        <small>
          {formatDurationMs(linkedDurationMs)} · {item.rangeLabel || 'Source window'} · preview proxy
        </small>
      </button>

      <button
        className="make-preview-mini-clip-edit make-preview-linked-video-open"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenPreview?.(item.id);
        }}
        disabled={isRecording}
        title="Open payment, paid preview, and gateway proof for this linked source"
      >
        Pay / preview
      </button>

      <button
        className="make-preview-linked-video-remove"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove?.(item.id);
        }}
        disabled={isRecording}
        title="Remove linked video reference"
        aria-label={`Remove ${displayName}`}
      >
        ×
      </button>

      <em>{statusLabel}</em>

      <button
        className="make-preview-linked-video-trim-handle is-start"
        type="button"
        onPointerDown={(event) => beginLinkedVideoTrimDrag?.(event, item, 'start')}
        disabled={isRecording}
        title="Drag to trim the linked source start"
        aria-label="Trim linked video start"
      />

      <button
        className="make-preview-linked-video-trim-handle is-end"
        type="button"
        onPointerDown={(event) => beginLinkedVideoTrimDrag?.(event, item, 'end')}
        disabled={isRecording}
        title="Drag to trim the linked source end"
        aria-label="Trim linked video end"
      />
    </div>
  );
}
