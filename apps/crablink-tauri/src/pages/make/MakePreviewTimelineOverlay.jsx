/**
 * RO:WHAT — Mini timeline overlay shell for the crab://make preview studio.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps MakePreviewStudioChrome focused on orchestration while this file owns timeline chrome composition.
 * RO:INTERACTS — MakePreviewStudioChrome.jsx, MakePreviewMiniTimelineHeader.jsx, local/linked clip timeline bubbles, audio lane, linked payment inspector.
 * RO:INVARIANTS — display/user intent only; no fake CIDs; no fake receipts; no wallet/ledger mutation; no paid unlock from cache.
 * RO:METRICS — none.
 * RO:CONFIG — local timeline display, selection, zoom, and draft-edit controls only.
 * RO:SECURITY — no private keys, capabilities, balances, receipts, or backend truth are created here.
 * RO:TEST — npm run build; manual crab://make timeline/linked-video/audio lane smoke.
 */

import MakeLinkedVideoPaymentInspector from './MakeLinkedVideoPaymentInspector.jsx';
import MakePreviewAudioLane from './MakePreviewAudioLane.jsx';
import MakePreviewLinkedVideoTimelineClip from './MakePreviewLinkedVideoTimelineClip.jsx';
import MakePreviewLocalTimelineClip from './MakePreviewLocalTimelineClip.jsx';
import MakePreviewMiniTimelineHeader from './MakePreviewMiniTimelineHeader.jsx';

export default function MakePreviewTimelineOverlay({
  app,
  audioEditActive,
  audioLaneVisualDurationMs,
  audioMoveDrag,
  audioTracks = [],
  audioTrimDrag,
  beginAudioTrackOffsetDrag,
  beginAudioTrackTrimDrag,
  beginLinkedVideoMoveDrag,
  beginLinkedVideoTrimDrag,
  beginPreviewClipMoveDrag,
  beginPreviewTrimDrag,
  beginTimelineCursorDrag,
  canDeleteTimelineSelection,
  canSplitTimelineSelection,
  clips = [],
  cursorToolActive,
  deleteSelectedTimelineRange,
  editTargetClipId,
  editTimelineButtonDisabled,
  editTimelineButtonLabel,
  editTimelineButtonTitle,
  editedClip,
  hasAudioTracks,
  hasClips,
  hasLinkedVideoDrafts,
  isRecording,
  linkedVideoDrafts = [],
  linkedVideoPreviewId,
  linkedVideoPreviewItem,
  onAddTimelineClip,
  onApproveSequence,
  onLinkedVideoPreviewReady,
  onPlayTimeline,
  onRemoveAudioTrack,
  onRemoveLinkedVideoDraft,
  onRequestAddAudioTrack,
  onSelectClip,
  onTimelineHoverChange,
  onTimelineRedo,
  onTimelineUndo,
  onUpdateAudioTrackTiming,
  onUpdateAudioTrackVolume,
  openLinkedMediaComposer,
  preparedAudioTracks = [],
  previewClipMoveDrag,
  previewTimelineRailRef,
  resetTimelineCursorSelection,
  selectedAudioTrack,
  selectedClip,
  selectedClipId,
  selectedLinkedVideoId,
  sequenceActive,
  sequenceCanApprove,
  sequenceClip,
  sequenceCurrentIndex,
  sequencePlaying,
  sequenceState,
  sequenceStatus,
  setAudioPreviewNode,
  setLinkedVideoPreviewId,
  setPreviewDrawer,
  setSelectedAudioTrackId,
  setSelectedLinkedVideoId,
  setSelectedTimelineMediaKind,
  setTimelineTool,
  setTrimEditorClipId,
  setTimelineZoomBounded,
  splitAtTimelineSelection,
  timelineCanRedo,
  timelineCanUndo,
  timelineHasItems,
  timelineLoopPlaying,
  timelinePlayDisabled,
  timelinePlayTitle,
  timelinePreview,
  timelinePreviewClip,
  timelineSelection,
  timelineSelectionEndMs,
  timelineSelectionRangeMs,
  timelineSelectionStartMs,
  timelineSummaryLabel,
  timelineVisualItemKeys = [],
  timelineVisualOrderForKey,
  timelineVisualTotalDurationMs,
  timelineZoom,
  toggleTrimEditor,
  trimEditorActive,
  trimEditorClipId,
  totalTimelineDurationMs,
}) {
  const handleEditTimeline = () => {
    if (audioEditActive) {
      setSelectedTimelineMediaKind?.('audio');
      setSelectedAudioTrackId?.(selectedAudioTrack?.id || '');
      setTrimEditorClipId?.('');
      setTimelineTool?.('select');
      resetTimelineCursorSelection?.();
      return;
    }

    setSelectedTimelineMediaKind?.('video');
    toggleTrimEditor?.(editTargetClipId);
  };

  const handleToggleCursorTool = () => {
    setPreviewDrawer?.('');
    setTrimEditorClipId?.('');
    setTimelineTool?.((current) => (current === 'cursor' ? 'select' : 'cursor'));
    resetTimelineCursorSelection?.();
  };

  const handleOpenLinkedVideoPreview = (linkedVideoId) => {
    setSelectedLinkedVideoId?.(linkedVideoId);
    setLinkedVideoPreviewId?.(linkedVideoId);
  };

  const handleRemoveLinkedVideo = (linkedVideoId) => {
    if (linkedVideoPreviewId === linkedVideoId) {
      setLinkedVideoPreviewId?.('');
    }

    onRemoveLinkedVideoDraft?.(linkedVideoId);
  };

  const handleSelectLinkedVideo = (linkedVideoId) => {
    resetTimelineCursorSelection?.();
    setTrimEditorClipId?.('');
    setTimelineTool?.('select');
    setSelectedLinkedVideoId?.(linkedVideoId);
  };

  const handleSelectAudioTrack = (trackId) => {
    setSelectedTimelineMediaKind?.('audio');
    setSelectedAudioTrackId?.(trackId);
    setTrimEditorClipId?.('');
    setTimelineTool?.('select');
  };

  return (
    <div
      className="make-preview-mini-timeline"
      aria-label="Preview timeline overlay"
      onPointerEnter={() => onTimelineHoverChange?.(true)}
      onPointerLeave={() => onTimelineHoverChange?.(false)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onFocus={() => onTimelineHoverChange?.(true)}
      onBlur={() => onTimelineHoverChange?.(false)}
    >
      <MakePreviewMiniTimelineHeader
        audioEditActive={audioEditActive}
        canDeleteTimelineSelection={canDeleteTimelineSelection}
        canSplitTimelineSelection={canSplitTimelineSelection}
        cursorToolActive={cursorToolActive}
        editTimelineButtonDisabled={editTimelineButtonDisabled}
        editTimelineButtonLabel={editTimelineButtonLabel}
        editTimelineButtonTitle={editTimelineButtonTitle}
        editedClip={editedClip}
        hasClips={hasClips}
        isRecording={isRecording}
        onApproveSequence={onApproveSequence}
        onDeleteSelectedTimelineRange={deleteSelectedTimelineRange}
        onEditTimeline={handleEditTimeline}
        onPlayTimeline={onPlayTimeline}
        onSplitAtTimelineSelection={splitAtTimelineSelection}
        onTimelineRedo={onTimelineRedo}
        onTimelineUndo={onTimelineUndo}
        onTimelineZoomIn={() => setTimelineZoomBounded?.((current) => current + 0.25)}
        onTimelineZoomOut={() => setTimelineZoomBounded?.((current) => current - 0.25)}
        onToggleCursorTool={handleToggleCursorTool}
        sequenceCanApprove={sequenceCanApprove}
        sequencePlaying={sequencePlaying}
        timelineCanRedo={timelineCanRedo}
        timelineCanUndo={timelineCanUndo}
        timelineHasItems={timelineHasItems}
        timelineLoopPlaying={timelineLoopPlaying}
        timelinePlayDisabled={timelinePlayDisabled}
        timelinePlayTitle={timelinePlayTitle}
        timelineSelection={timelineSelection}
        timelineSelectionRangeMs={timelineSelectionRangeMs}
        timelineSummaryLabel={timelineSummaryLabel}
        timelineZoom={timelineZoom}
        trimEditorActive={trimEditorActive}
      />

      <div className="make-preview-mini-scroll" aria-label="Scrollable timeline">
        <div
          ref={previewTimelineRailRef}
          className={`make-preview-mini-rail ${previewClipMoveDrag ? 'is-reordering' : ''}`}
          role="list"
          aria-label="Make timeline clips and linked video references"
        >
          {timelineHasItems ? (
            <>
              {hasClips ? clips.map((clip, index) => (
                <MakePreviewLocalTimelineClip
                  beginPreviewClipMoveDrag={beginPreviewClipMoveDrag}
                  beginPreviewTrimDrag={beginPreviewTrimDrag}
                  beginTimelineCursorDrag={beginTimelineCursorDrag}
                  clip={clip}
                  clips={clips}
                  cursorToolActive={cursorToolActive}
                  index={index}
                  isRecording={isRecording}
                  key={clip.id}
                  onSelectClip={onSelectClip}
                  previewClipMoveDrag={previewClipMoveDrag}
                  resetTimelineCursorSelection={resetTimelineCursorSelection}
                  selectedClip={selectedClip}
                  selectedClipId={selectedClipId}
                  sequenceActive={sequenceActive}
                  sequenceClip={sequenceClip}
                  sequenceCurrentIndex={sequenceCurrentIndex}
                  sequenceState={sequenceState}
                  sequenceStatus={sequenceStatus}
                  setSelectedTimelineMediaKind={setSelectedTimelineMediaKind}
                  timelineLoopPlaying={timelineLoopPlaying}
                  timelinePreview={timelinePreview}
                  timelinePreviewClip={timelinePreviewClip}
                  timelineSelection={timelineSelection}
                  timelineSelectionEndMs={timelineSelectionEndMs}
                  timelineSelectionStartMs={timelineSelectionStartMs}
                  timelineVisualOrderForKey={timelineVisualOrderForKey}
                  timelineVisualTotalDurationMs={timelineVisualTotalDurationMs}
                  toggleTrimEditor={toggleTrimEditor}
                  trimEditorClipId={trimEditorClipId}
                />
              )) : null}

              {previewClipMoveDrag?.afterLast && timelineVisualItemKeys.length > 0 && (
                <span
                  className="make-preview-mini-drop-marker is-after-last"
                  style={{ order: 10_000 }}
                  aria-hidden="true"
                />
              )}

              {linkedVideoDrafts.map((item, index) => (
                <MakePreviewLinkedVideoTimelineClip
                  beginLinkedVideoMoveDrag={beginLinkedVideoMoveDrag}
                  beginLinkedVideoTrimDrag={beginLinkedVideoTrimDrag}
                  index={index}
                  isRecording={isRecording}
                  item={item}
                  key={item.id || item.url || `linked-video-${index}`}
                  linkedVideoPreviewId={linkedVideoPreviewId}
                  onOpenPreview={handleOpenLinkedVideoPreview}
                  onRemove={handleRemoveLinkedVideo}
                  onSelect={handleSelectLinkedVideo}
                  previewClipMoveDrag={previewClipMoveDrag}
                  selectedLinkedVideoId={selectedLinkedVideoId}
                  timelineVisualOrderForKey={timelineVisualOrderForKey}
                  timelineVisualTotalDurationMs={timelineVisualTotalDurationMs}
                />
              ))}
            </>
          ) : (
            <div className="make-preview-mini-empty">
              <span />
              <strong>Record your first segment</strong>
              <small>Clips appear here while you stay in the preview.</small>
            </div>
          )}

          <button
            className="make-preview-mini-add-clip"
            type="button"
            onClick={onAddTimelineClip}
            disabled={isRecording}
            title="Add a local video to the Make timeline"
            aria-label="Add a local video to the Make timeline"
          >
            <span aria-hidden="true">+</span>
          </button>
          <button
            className="make-preview-mini-link-clip"
            type="button"
            onClick={() => openLinkedMediaComposer?.('video')}
            disabled={isRecording}
            title="Paste a crab:// video reuse link"
            aria-label="Paste a crab:// video reuse link"
          >
            <span aria-hidden="true">🔗</span>
          </button>
        </div>
      </div>

      <MakeLinkedVideoPaymentInspector
        app={app}
        hasLinkedVideoDrafts={hasLinkedVideoDrafts}
        linkedVideoPreviewItem={linkedVideoPreviewItem}
        onClose={() => setLinkedVideoPreviewId?.('')}
        onPreviewReady={(preview) => {
          if (linkedVideoPreviewItem?.id) {
            onLinkedVideoPreviewReady?.(linkedVideoPreviewItem.id, preview);
          }
        }}
      />

      <MakePreviewAudioLane
        audioLaneVisualDurationMs={audioLaneVisualDurationMs}
        audioMoveDrag={audioMoveDrag}
        audioTracks={audioTracks}
        audioTrimDrag={audioTrimDrag}
        beginAudioTrackOffsetDrag={beginAudioTrackOffsetDrag}
        beginAudioTrackTrimDrag={beginAudioTrackTrimDrag}
        hasAudioTracks={hasAudioTracks}
        isRecording={isRecording}
        onOpenLinkedAudioComposer={() => openLinkedMediaComposer?.('audio')}
        onRemoveAudioTrack={onRemoveAudioTrack}
        onRequestAddAudioTrack={onRequestAddAudioTrack}
        onSelectAudioTrack={handleSelectAudioTrack}
        onUpdateAudioTrackTiming={onUpdateAudioTrackTiming}
        onUpdateAudioTrackVolume={onUpdateAudioTrackVolume}
        preparedAudioTracks={preparedAudioTracks}
        selectedAudioTrack={selectedAudioTrack}
        setAudioPreviewNode={setAudioPreviewNode}
        totalTimelineDurationMs={totalTimelineDurationMs}
      />
    </div>
  );
}
