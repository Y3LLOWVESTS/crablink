/**
 * RO:WHAT — Preview studio chrome for the crab://make route.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps the route shell smaller while preserving local creator-studio UX.
 * RO:INTERACTS — MakePage.jsx, make timeline/audio/sequence models, linked video preview, cutout/preset/mode cards.
 * RO:INVARIANTS — display/user intent only; inactive tabs cannot retain body-level overlays; no fake CIDs, receipts, wallet mutation, or cache-only unlock.
 * RO:METRICS — none.
 * RO:CONFIG — local draft settings and timeline editor state only.
 * RO:SECURITY — no private keys, capabilities, balances, receipts, or backend truth are created here.
 * RO:TEST — npm run build; manual crab://make preview/timeline/audio/linked-video smoke.
 */

import { useEffect } from 'react';

import MakeLinkedMediaComposerPopover from './MakeLinkedMediaComposerPopover.jsx';
import MakePreviewDrawer from './MakePreviewDrawer.jsx';
import MakePreviewRecordControls from './MakePreviewRecordControls.jsx';
import MakePreviewTimelineMarker from './MakePreviewTimelineMarker.jsx';
import MakePreviewTimelineOverlay from './MakePreviewTimelineOverlay.jsx';
import useMakePreviewTimelineController from './useMakePreviewTimelineController.js';

export default function MakePreviewStudioChrome({
  app,
  backgroundImageUrl,
  backgroundVideoUrl,
  canRecord,
  clips,
  countdown,
  draft,
  inputReady,
  inputState,
  isCountingDown,
  isRecording,
  onApplyPreset,
  onAddTimelineClip,
  onAddLinkedVideoDraft,
  onRemoveLinkedVideoDraft,
  onReorderClips,
  timelineItemOrder = [],
  onReorderTimelineItems,
  onUpdateLinkedVideoDraftTiming,
  onLinkedVideoPreviewReady,
  audioTracks = [],
  linkedVideoDrafts = [],
  onRequestAddAudioTrack,
  onAddLinkedAudioDraft,
  onRemoveAudioTrack,
  onUpdateAudioTrackVolume,
  onUpdateAudioTrackTiming,
  totalTimelineDurationMs = 0,
  audioPreviewRefs,
  onChooseBackgroundImage,
  onChooseBackgroundVideo,
  onClearBackgroundMedia,
  onCloseDrawer,
  onModeChange,
  onOpenVideo,
  onPauseSequence,
  onPlaySequence,
  onRestartSequence,
  onApproveSequence,
  onSelectClip,
  onStartInputs,
  onStartRecording,
  onStopInputs,
  onStopRecording,
  onUpdateDraft,
  onUpdateSelectedTimeline,
  onUpdateClipTimeline,
  onCaptureTimelineHistory,
  onSplitTimelineAt,
  onDeleteTimelineRange,
  onTimelineUndo,
  onTimelineRedo,
  timelineCanUndo = false,
  timelineCanRedo = false,
  outputPreset,
  previewDrawer,
  recorderState,
  recordingElapsedMs,
  sequenceState,
  selectedClip,
  selectedClipId,
  selectedMode,
  subjectEditAvailable = false,
  subjectEditMode = false,
  onToggleSubjectEdit,
  onTimelineHoverChange,
  setPreviewDrawer,
  totalDurationMs,
}) {
  const {
    activeDrawer,
    audioEditActive,
    audioLaneVisualDurationMs,
    audioMoveDrag,
    audioTrimDrag,
    beginAudioTrackOffsetDrag,
    beginAudioTrackTrimDrag,
    beginLinkedVideoMoveDrag,
    beginLinkedVideoTrimDrag,
    beginPreviewClipMoveDrag,
    beginPreviewTrimDrag,
    beginTimelineCursorDrag,
    canApplyTimelineEffect,
    canDeleteTimelineSelection,
    canSplitTimelineSelection,
    closeLinkedMediaComposer,
    cursorToolActive,
    deleteSelectedTimelineRange,
    drawerEyebrow,
    drawerTitle,
    editTargetClipId,
    editTimelineButtonDisabled,
    editTimelineButtonLabel,
    editTimelineButtonTitle,
    editedClip,
    handleLinkedMediaComposerSubmit,
    handleRecordClick,
    handleTimelinePlayClick,
    handleTimelinePreviewTimeUpdate,
    hasAudioTracks,
    hasClips,
    hasLinkedVideoDrafts,
    linkedMediaComposer,
    linkedVideoPreviewId,
    linkedVideoPreviewItem,
    openLinkedMediaComposer,
    preparedAudioTracks,
    previewClipMoveDrag,
    previewTimelineRailRef,
    recordDisabled,
    recordLabel,
    recordTitle,
    resetTimelineCursorSelection,
    selectedAudioTrack,
    selectedClipDurationMs,
    selectedLinkedVideoId,
    selectedModeLabel,
    sequenceActive,
    sequenceCanApprove,
    sequenceClip,
    sequenceCurrentIndex,
    sequencePlaying,
    sequenceStatus,
    setAudioPreviewNode,
    setLinkedVideoPreviewId,
    setSelectedAudioTrackId,
    setSelectedLinkedVideoId,
    setSelectedTimelineMediaKind,
    setTimelineTool,
    setTimelineZoomBounded,
    setTrimEditorClipId,
    seekTimelinePreviewVideo,
    sourceModeLocked,
    splitAtTimelineSelection,
    timelineHasItems,
    timelineLoopPlaying,
    timelinePlayDisabled,
    timelinePlayTitle,
    timelinePreview,
    timelinePreviewActive,
    timelinePreviewClip,
    timelinePreviewVideoRef,
    timelineSelection,
    timelineSelectionEndMs,
    timelineSelectionRangeMs,
    timelineSelectionStartMs,
    timelineSummaryLabel,
    timelineVisualItemKeys,
    timelineVisualOrderForKey,
    timelineVisualTotalDurationMs,
    timelineZoom,
    toggleDrawer,
    toggleTrimEditor,
    trimEditorActive,
    trimEditorClipId,
    updateLinkedMediaComposerField,
  } = useMakePreviewTimelineController({
    canRecord,
    clips,
    countdown,
    inputReady,
    inputState,
    isCountingDown,
    isRecording,
    onAddLinkedAudioDraft,
    onAddLinkedVideoDraft,
    onCaptureTimelineHistory,
    onDeleteTimelineRange,
    onPauseSequence,
    onPlaySequence,
    onReorderTimelineItems,
    onSelectClip,
    onSplitTimelineAt,
    onStartInputs,
    onStartRecording,
    onStopRecording,
    onTimelineHoverChange,
    onUpdateAudioTrackTiming,
    onUpdateClipTimeline,
    onUpdateLinkedVideoDraftTiming,
    onUpdateSelectedTimeline,
    previewDrawer,
    recordingElapsedMs,
    selectedClip,
    selectedClipId,
    selectedMode,
    sequenceState,
    setPreviewDrawer,
    timelineItemOrder,
    audioTracks,
    linkedVideoDrafts,
    totalTimelineDurationMs,
    audioPreviewRefs,
    totalDurationMs,
  });

  const isActiveTab = app?.isActiveTab !== false;

  useEffect(() => {
    if (!isActiveTab && linkedMediaComposer) {
      closeLinkedMediaComposer();
    }
  }, [closeLinkedMediaComposer, isActiveTab, linkedMediaComposer]);

  return (
    <div
      className={`make-preview-chrome ${activeDrawer ? 'has-open-drawer' : ''} ${isRecording ? 'is-recording' : ''} ${sequenceActive ? 'is-sequence-active' : ''} ${timelinePreviewActive ? 'has-timeline-preview' : ''} ${timelineLoopPlaying ? 'is-range-looping' : ''} ${trimEditorActive ? 'is-trimming-clip' : ''} ${cursorToolActive ? 'is-timeline-cursor' : ''} ${previewClipMoveDrag ? 'is-moving-timeline-item' : ''}`}
      style={{ '--make-timeline-zoom': timelineZoom }}
      aria-label="Preview controls. These controls are not recorded into the canvas."
    >
      <MakePreviewRecordControls
        inputReady={inputReady}
        isCountingDown={isCountingDown}
        isRecording={isRecording}
        onRecordClick={handleRecordClick}
        onToggleDrawer={toggleDrawer}
        onToggleSubjectEdit={onToggleSubjectEdit}
        previewDrawer={previewDrawer}
        recordDisabled={recordDisabled}
        recordLabel={recordLabel}
        recordTitle={recordTitle}
        selectedMode={selectedMode}
        selectedModeLabel={selectedModeLabel}
        subjectEditAvailable={subjectEditAvailable}
        subjectEditMode={subjectEditMode}
        trimEditorActive={trimEditorActive}
      />

      <MakePreviewTimelineMarker
        clips={clips}
        onSeekTimelinePreviewVideo={seekTimelinePreviewVideo}
        onTimelinePreviewTimeUpdate={handleTimelinePreviewTimeUpdate}
        timelineLoopPlaying={timelineLoopPlaying}
        timelinePreview={timelinePreview}
        timelinePreviewActive={timelinePreviewActive}
        timelinePreviewClip={timelinePreviewClip}
        timelinePreviewVideoRef={timelinePreviewVideoRef}
      />

      <MakePreviewTimelineOverlay
        app={app}
        audioEditActive={audioEditActive}
        audioLaneVisualDurationMs={audioLaneVisualDurationMs}
        audioMoveDrag={audioMoveDrag}
        audioTracks={audioTracks}
        audioTrimDrag={audioTrimDrag}
        beginAudioTrackOffsetDrag={beginAudioTrackOffsetDrag}
        beginAudioTrackTrimDrag={beginAudioTrackTrimDrag}
        beginLinkedVideoMoveDrag={beginLinkedVideoMoveDrag}
        beginLinkedVideoTrimDrag={beginLinkedVideoTrimDrag}
        beginPreviewClipMoveDrag={beginPreviewClipMoveDrag}
        beginPreviewTrimDrag={beginPreviewTrimDrag}
        beginTimelineCursorDrag={beginTimelineCursorDrag}
        canDeleteTimelineSelection={canDeleteTimelineSelection}
        canSplitTimelineSelection={canSplitTimelineSelection}
        clips={clips}
        cursorToolActive={cursorToolActive}
        deleteSelectedTimelineRange={deleteSelectedTimelineRange}
        editTargetClipId={editTargetClipId}
        editTimelineButtonDisabled={editTimelineButtonDisabled}
        editTimelineButtonLabel={editTimelineButtonLabel}
        editTimelineButtonTitle={editTimelineButtonTitle}
        editedClip={editedClip}
        hasAudioTracks={hasAudioTracks}
        hasClips={hasClips}
        hasLinkedVideoDrafts={hasLinkedVideoDrafts}
        isRecording={isRecording}
        linkedVideoDrafts={linkedVideoDrafts}
        linkedVideoPreviewId={linkedVideoPreviewId}
        linkedVideoPreviewItem={linkedVideoPreviewItem}
        onAddTimelineClip={onAddTimelineClip}
        onApproveSequence={onApproveSequence}
        onLinkedVideoPreviewReady={onLinkedVideoPreviewReady}
        onPlayTimeline={handleTimelinePlayClick}
        onRemoveAudioTrack={onRemoveAudioTrack}
        onRemoveLinkedVideoDraft={onRemoveLinkedVideoDraft}
        onRequestAddAudioTrack={onRequestAddAudioTrack}
        onSelectClip={onSelectClip}
        onTimelineHoverChange={onTimelineHoverChange}
        onTimelineRedo={onTimelineRedo}
        onTimelineUndo={onTimelineUndo}
        onUpdateAudioTrackTiming={onUpdateAudioTrackTiming}
        onUpdateAudioTrackVolume={onUpdateAudioTrackVolume}
        openLinkedMediaComposer={openLinkedMediaComposer}
        preparedAudioTracks={preparedAudioTracks}
        previewClipMoveDrag={previewClipMoveDrag}
        previewTimelineRailRef={previewTimelineRailRef}
        resetTimelineCursorSelection={resetTimelineCursorSelection}
        selectedAudioTrack={selectedAudioTrack}
        selectedClip={selectedClip}
        selectedClipId={selectedClipId}
        selectedLinkedVideoId={selectedLinkedVideoId}
        sequenceActive={sequenceActive}
        sequenceCanApprove={sequenceCanApprove}
        sequenceClip={sequenceClip}
        sequenceCurrentIndex={sequenceCurrentIndex}
        sequencePlaying={sequencePlaying}
        sequenceState={sequenceState}
        sequenceStatus={sequenceStatus}
        setAudioPreviewNode={setAudioPreviewNode}
        setLinkedVideoPreviewId={setLinkedVideoPreviewId}
        setPreviewDrawer={setPreviewDrawer}
        setSelectedAudioTrackId={setSelectedAudioTrackId}
        setSelectedLinkedVideoId={setSelectedLinkedVideoId}
        setSelectedTimelineMediaKind={setSelectedTimelineMediaKind}
        setTimelineTool={setTimelineTool}
        setTrimEditorClipId={setTrimEditorClipId}
        setTimelineZoomBounded={setTimelineZoomBounded}
        splitAtTimelineSelection={splitAtTimelineSelection}
        timelineCanRedo={timelineCanRedo}
        timelineCanUndo={timelineCanUndo}
        timelineHasItems={timelineHasItems}
        timelineLoopPlaying={timelineLoopPlaying}
        timelinePlayDisabled={timelinePlayDisabled}
        timelinePlayTitle={timelinePlayTitle}
        timelinePreview={timelinePreview}
        timelinePreviewClip={timelinePreviewClip}
        timelineSelection={timelineSelection}
        timelineSelectionEndMs={timelineSelectionEndMs}
        timelineSelectionRangeMs={timelineSelectionRangeMs}
        timelineSelectionStartMs={timelineSelectionStartMs}
        timelineSummaryLabel={timelineSummaryLabel}
        timelineVisualItemKeys={timelineVisualItemKeys}
        timelineVisualOrderForKey={timelineVisualOrderForKey}
        timelineVisualTotalDurationMs={timelineVisualTotalDurationMs}
        timelineZoom={timelineZoom}
        toggleTrimEditor={toggleTrimEditor}
        trimEditorActive={trimEditorActive}
        trimEditorClipId={trimEditorClipId}
        totalTimelineDurationMs={totalTimelineDurationMs}
      />

      <MakeLinkedMediaComposerPopover
        active={isActiveTab}
        closeLinkedMediaComposer={closeLinkedMediaComposer}
        handleLinkedMediaComposerSubmit={handleLinkedMediaComposerSubmit}
        linkedMediaComposer={linkedMediaComposer}
        updateLinkedMediaComposerField={updateLinkedMediaComposerField}
      />
      <MakePreviewDrawer
        activeDrawer={activeDrawer}
        backgroundImageUrl={backgroundImageUrl}
        backgroundVideoUrl={backgroundVideoUrl}
        canApplyTimelineEffect={canApplyTimelineEffect}
        draft={draft}
        drawerEyebrow={drawerEyebrow}
        drawerTitle={drawerTitle}
        hasClips={hasClips}
        inputReady={inputReady}
        inputState={inputState}
        isCountingDown={isCountingDown}
        isRecording={isRecording}
        onApplyPreset={onApplyPreset}
        onChooseBackgroundImage={onChooseBackgroundImage}
        onChooseBackgroundVideo={onChooseBackgroundVideo}
        onClearBackgroundMedia={onClearBackgroundMedia}
        onCloseDrawer={onCloseDrawer}
        onModeChange={onModeChange}
        onOpenVideo={onOpenVideo}
        onStartInputs={onStartInputs}
        onStopInputs={onStopInputs}
        onUpdateDraft={onUpdateDraft}
        onUpdateSelectedTimeline={onUpdateSelectedTimeline}
        outputPreset={outputPreset}
        previewDrawer={previewDrawer}
        recorderState={recorderState}
        selectedClip={selectedClip}
        selectedClipDurationMs={selectedClipDurationMs}
        selectedMode={selectedMode}
        selectedModeLabel={selectedModeLabel}
        sourceModeLocked={sourceModeLocked}
      />
    </div>
  );
}

/* Make Studio timeline editor phase 1 helpers end. */
