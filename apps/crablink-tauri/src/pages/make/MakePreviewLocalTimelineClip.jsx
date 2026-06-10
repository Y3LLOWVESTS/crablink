/**
 * RO:WHAT — Local-video timeline bubble for crab://make preview timeline.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; isolates local clip UI before timeline behavior fixes.
 * RO:INTERACTS — MakePreviewStudioChrome.jsx, makeTimelineModel.js, makeSequenceModel.js.
 * RO:INVARIANTS — local draft video UI only; no fake CIDs; no fake receipts; no wallet/ledger mutation; no paid unlock from cache.
 * RO:METRICS — none.
 * RO:CONFIG — local clip trim, cursor selection, and preview timeline display state only.
 * RO:SECURITY — no private keys, capabilities, balances, receipts, or backend truth are created here.
 * RO:TEST — npm run build; manual crab://make local-clip select/move/trim/cursor/range smoke.
 */

import { makeOverlayClipDurationMs, makeOverlayClipLookLabel } from './MakePreviewOverlayWidgets.jsx';
import { makeLocalTimelineItemKey } from './makePageConstants.js';
import { formatDurationMs } from './makeDraftModel.js';
import {
  clamp,
  formatTimelinePreciseTimeMs,
  getTimelineAbsolutePositionMs,
  getTimelineClipVisibleDurationMs,
  sourceMsToVisiblePct,
  sourceRangeToVisiblePlate,
} from './makeSequenceModel.js';

export default function MakePreviewLocalTimelineClip({
  beginPreviewClipMoveDrag,
  beginPreviewTrimDrag,
  beginTimelineCursorDrag,
  clip,
  clips = [],
  cursorToolActive = false,
  index = 0,
  isRecording = false,
  onSelectClip,
  previewClipMoveDrag,
  resetTimelineCursorSelection,
  selectedClip,
  selectedClipId = '',
  sequenceActive = false,
  sequenceClip,
  sequenceCurrentIndex = 0,
  sequenceState,
  sequenceStatus = '',
  setSelectedTimelineMediaKind,
  timelineLoopPlaying = false,
  timelinePreview,
  timelinePreviewClip,
  timelineSelection,
  timelineSelectionEndMs = 0,
  timelineSelectionStartMs = 0,
  timelineVisualOrderForKey,
  timelineVisualTotalDurationMs = 1,
  toggleTrimEditor,
  trimEditorClipId = '',
}) {
  if (!clip?.id) {
    return null;
  }

  const active = clip.id === selectedClipId || (!selectedClipId && selectedClip?.id === clip.id);
  const previewingLoop = timelineLoopPlaying && timelinePreviewClip?.id === clip.id;
  const playing = (sequenceActive && sequenceClip?.id === clip.id) || previewingLoop;
  const played = !previewingLoop && (
    sequenceStatus === 'reviewed'
    || sequenceStatus === 'approved'
    || (sequenceActive && index < sequenceCurrentIndex)
  );
  const trimming = trimEditorClipId === clip.id;
  const durationMs = makeOverlayClipDurationMs(clip);
  const rawDurationMs = Math.max(0, Number(clip.durationMs || 0));
  const visibleDurationMs = Math.max(1, getTimelineClipVisibleDurationMs(clip));
  const trimmed = rawDurationMs > 0 && visibleDurationMs + 8 < rawDurationMs;
  const trimStartPct = 0;
  const rightTrimPct = 0;
  const playProgressPct = played
    ? 100
    : previewingLoop
      ? clamp(Number(timelinePreview?.progressPct || 0), 0, 100, 0)
      : playing
        ? clamp(Number(sequenceState?.currentClipProgressPct || 0), 0, 100, 0)
        : 0;
  const playheadPct = clamp(playProgressPct, 0, 100, 0);
  const playRightPct = Math.max(0, 100 - playheadPct);
  const hasCursorSelection = timelineSelection?.clipId === clip.id;
  const selectionPlate = hasCursorSelection
    ? sourceRangeToVisiblePlate(clip, timelineSelectionStartMs, timelineSelectionEndMs)
    : { leftPct: 0, rightPct: 0, widthPct: 0 };
  const selectionStartPct = selectionPlate.leftPct;
  const selectionEndPct = selectionPlate.rightPct;
  const selectionRightPct = Math.max(0, 100 - selectionEndPct);
  const cursorPct = hasCursorSelection
    ? sourceMsToVisiblePct(clip, Number(timelineSelection?.focusMs || timelineSelectionStartMs))
    : 0;
  const flexGrow = Math.max(
    0.42,
    visibleDurationMs / Math.max(1, Number(timelineVisualTotalDurationMs || 1)),
  );
  const localTimelineKey = makeLocalTimelineItemKey(clip.id);
  const order = typeof timelineVisualOrderForKey === 'function'
    ? timelineVisualOrderForKey(localTimelineKey)
    : index;
  const displayName = clip.name || `Clip ${index + 1}`;

  return (
    <div
      className={`make-preview-mini-clip ${active ? 'is-active' : ''} ${playing ? 'is-playing' : ''} ${trimming ? 'is-trimming' : ''} ${trimmed ? 'is-trimmed' : ''} ${cursorToolActive ? 'is-cursor-tool' : ''} ${hasCursorSelection ? 'has-cursor-selection' : ''} ${hasCursorSelection && timelineSelection?.mode !== 'range' ? 'has-insert-marker' : ''} ${hasCursorSelection && timelineSelection?.mode === 'range' ? 'has-range-selection' : ''} ${previewClipMoveDrag?.activeKey === localTimelineKey || previewClipMoveDrag?.activeClipId === clip.id ? 'is-moving' : ''}`}
      data-make-local-clip-id={clip.id}
      data-make-timeline-item-key={localTimelineKey}
      style={{
        order,
        flexGrow,
        '--make-visible-duration-ms': visibleDurationMs,
        '--make-timeline-cursor-pct': hasCursorSelection ? `${cursorPct}%` : undefined,
        '--make-timeline-range-left': hasCursorSelection && timelineSelection?.mode === 'range' ? `${selectionStartPct}%` : undefined,
        '--make-timeline-range-right': hasCursorSelection && timelineSelection?.mode === 'range' ? `${selectionRightPct}%` : undefined,
      }}
      role="listitem"
      title={`${index + 1}. ${clip.name || 'clip'} · ${formatDurationMs(durationMs)}${trimmed ? ` kept from ${formatDurationMs(rawDurationMs)}` : ''}`}
    >
      {(previewClipMoveDrag?.beforeKey === localTimelineKey || previewClipMoveDrag?.beforeClipId === clip.id) && (
        <span className="make-preview-mini-drop-marker" aria-hidden="true" />
      )}

      <span
        className="make-preview-mini-clip-trim-fill"
        style={{ left: `${trimStartPct}%`, right: `${rightTrimPct}%` }}
        aria-hidden="true"
      />

      <span
        className="make-preview-mini-clip-play-fill"
        style={{ left: `${trimStartPct}%`, right: `${playRightPct}%` }}
        aria-hidden="true"
      />

      {hasCursorSelection && timelineSelection?.mode === 'range' && (
        <span
          className="make-preview-timeline-range-plate"
          style={{
            left: `${Number.isFinite(Number(timelineSelection?.visualLeftPct)) ? Number(timelineSelection.visualLeftPct) : selectionStartPct}%`,
            width: `${Math.max(
              1.4,
              Number.isFinite(Number(timelineSelection?.visualWidthPct))
                ? Number(timelineSelection.visualWidthPct)
                : selectionEndPct - selectionStartPct,
            )}%`,
          }}
          aria-hidden="true"
        />
      )}

      {hasCursorSelection && timelineSelection?.mode !== 'range' && (
        <>
          <span
            className="make-preview-timeline-insert"
            style={{ left: `${cursorPct}%` }}
            aria-hidden="true"
          />
          <span
            key={`${clip.id}-${Math.round(Number(timelineSelection?.focusMs || timelineSelectionStartMs || 0))}`}
            className="make-preview-timeline-time-badge"
            style={{ left: `${cursorPct}%` }}
            aria-hidden="true"
          >
            {formatTimelinePreciseTimeMs(getTimelineAbsolutePositionMs(
              clips,
              clip.id,
              Number(timelineSelection?.focusMs || timelineSelectionStartMs || 0),
            ))}
          </span>
        </>
      )}

      {cursorToolActive && !trimming && (
        <button
          className="make-preview-timeline-cursor-capture"
          type="button"
          aria-label={`Place I cursor or drag-select ${clip.name || `clip ${index + 1}`}`}
          title="I cursor: click to place split point, drag to highlight range"
          onPointerDown={(event) => beginTimelineCursorDrag?.(event, clip)}
        />
      )}

      <button
        className="make-preview-mini-move-handle"
        type="button"
        aria-label={`Move ${clip.name || `clip ${index + 1}`} on the timeline`}
        title="Drag to move this clip on the timeline"
        disabled={isRecording}
        onPointerDown={(event) => beginPreviewClipMoveDrag?.(event, clip)}
      >
        MOVE
      </button>

      <button
        className="make-preview-mini-clip-main"
        type="button"
        onClick={() => {
          if (cursorToolActive) {
            return;
          }

          setSelectedTimelineMediaKind?.('video');
          resetTimelineCursorSelection?.();
          onSelectClip?.(clip.id);
        }}
        title={`Select ${displayName}`}
      >
        <span>{index + 1}</span>
        <strong>{displayName}</strong>
        <small>
          {formatDurationMs(durationMs)}{trimmed ? ` kept · ${formatDurationMs(rawDurationMs)} raw` : ''} · {makeOverlayClipLookLabel(clip)}
        </small>
      </button>

      <button
        className={`make-preview-mini-clip-edit ${trimming ? 'is-active' : ''}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setSelectedTimelineMediaKind?.('video');
          toggleTrimEditor?.(clip.id);
        }}
        disabled={isRecording}
        title={trimming ? 'Done trimming' : `Trim ${displayName}`}
      >
        {trimming ? 'Done' : 'Edit'}
      </button>

      {trimming && (
        <>
          <button
            className="make-preview-trim-handle is-start"
            style={{ left: '0.04rem' }}
            type="button"
            aria-label={`Trim start of ${clip.name || `clip ${index + 1}`}`}
            title="Drag to cut the beginning"
            onPointerDown={(event) => beginPreviewTrimDrag?.(event, clip, 'start')}
          />
          <button
            className="make-preview-trim-handle is-end"
            style={{ right: '0.04rem' }}
            type="button"
            aria-label={`Trim end of ${clip.name || `clip ${index + 1}`}`}
            title="Drag to cut the ending"
            onPointerDown={(event) => beginPreviewTrimDrag?.(event, clip, 'end')}
          />
          <span className="make-preview-trim-hint">Drag edges</span>
        </>
      )}
    </div>
  );
}
