/**
 * RO:WHAT — Mini timeline header/action bar for crab://make preview chrome.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps preview timeline shell smaller before behavior fixes.
 * RO:INTERACTS — MakePreviewStudioChrome.jsx, makeDraftModel.js, preview timeline state/callbacks.
 * RO:INVARIANTS — UI intent only; no backend truth; no wallet/ledger mutation; no fake receipts/CIDs.
 * RO:METRICS — none.
 * RO:CONFIG — local timeline edit/play/zoom/approve controls only.
 * RO:SECURITY — does not unlock paid content, grant reuse rights, create receipts, or mutate economic state.
 * RO:TEST — npm run build; manual crab://make timeline undo/redo/I/Split/Delete/Edit/Play/Approve smoke.
 */

import { formatDurationMs } from './makeDraftModel.js';

export default function MakePreviewMiniTimelineHeader({
  audioEditActive = false,
  canDeleteTimelineSelection = false,
  canSplitTimelineSelection = false,
  cursorToolActive = false,
  editTimelineButtonDisabled = false,
  editTimelineButtonLabel = 'Edit',
  editTimelineButtonTitle = 'Edit selected timeline item',
  editedClip,
  hasClips = false,
  isRecording = false,
  onApproveSequence,
  onDeleteSelectedTimelineRange,
  onEditTimeline,
  onPlayTimeline,
  onSplitAtTimelineSelection,
  onTimelineRedo,
  onTimelineUndo,
  onTimelineZoomIn,
  onTimelineZoomOut,
  onToggleCursorTool,
  sequenceCanApprove = false,
  sequencePlaying = false,
  timelineCanRedo = false,
  timelineCanUndo = false,
  timelineHasItems = false,
  timelineLoopPlaying = false,
  timelinePlayDisabled = false,
  timelinePlayTitle = 'Play timeline sequence',
  timelineSelection,
  timelineSelectionRangeMs = 0,
  timelineSummaryLabel = 'Timeline',
  timelineZoom = 1,
  trimEditorActive = false,
}) {
  const titleText = trimEditorActive && editedClip
    ? `${editedClip.name || 'Selected clip'} · drag the clip edges`
    : cursorToolActive
      ? timelineSelection?.mode === 'range'
        ? `Range selected · ${formatDurationMs(timelineSelectionRangeMs)}`
        : timelineSelection
          ? 'I cursor placed · Split is ready'
          : 'I cursor · click to split, drag to delete'
      : timelineSummaryLabel;

  return (
    <div className="make-preview-mini-timeline-head">
      <span>{trimEditorActive ? 'Trim clip' : 'Timeline'}</span>
      <strong>{titleText}</strong>

      <div className="make-preview-mini-actions" aria-label="Preview sequence actions">
        <button
          type="button"
          onClick={onTimelineUndo}
          disabled={!timelineCanUndo || isRecording}
          title="Undo timeline action"
        >
          Undo
        </button>

        <button
          type="button"
          onClick={onTimelineRedo}
          disabled={!timelineCanRedo || isRecording}
          title="Redo timeline action"
        >
          Redo
        </button>

        <button
          className={`make-preview-timeline-cursor-button ${cursorToolActive ? 'is-active' : ''}`}
          type="button"
          onClick={onToggleCursorTool}
          disabled={!hasClips || isRecording}
          title="I cursor: click to choose a split point, or drag to select a range"
        >
          I
        </button>

        <button
          type="button"
          onClick={onSplitAtTimelineSelection}
          disabled={!canSplitTimelineSelection || isRecording}
          title="Split selected clip at the I cursor"
        >
          Split
        </button>

        <button
          type="button"
          onClick={onDeleteSelectedTimelineRange}
          disabled={!canDeleteTimelineSelection || isRecording}
          title="Delete highlighted timeline range"
        >
          Delete
        </button>

        <button
          className={`make-preview-timeline-edit ${trimEditorActive || audioEditActive ? 'is-active' : ''}`}
          type="button"
          onClick={onEditTimeline}
          disabled={editTimelineButtonDisabled}
          title={editTimelineButtonTitle}
        >
          {editTimelineButtonLabel}
        </button>

        <button
          type="button"
          onClick={onTimelineZoomOut}
          disabled={timelineZoom <= 1}
          title="Zoom timeline out"
          aria-label="Zoom timeline out"
        >
          −
        </button>

        <button
          type="button"
          onClick={onTimelineZoomIn}
          disabled={!timelineHasItems || timelineZoom >= 6}
          title="Zoom timeline in"
          aria-label="Zoom timeline in"
        >
          +
        </button>

        <button
          type="button"
          onClick={onPlayTimeline}
          disabled={timelinePlayDisabled}
          title={timelinePlayTitle}
        >
          {timelineLoopPlaying || sequencePlaying ? 'Pause' : 'Play'}
        </button>

        <button
          type="button"
          onClick={onApproveSequence}
          disabled={!sequenceCanApprove || trimEditorActive || cursorToolActive}
          title="Approve reviewed sequence for local export"
        >
          Approve
        </button>
      </div>
    </div>
  );
}
