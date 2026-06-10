/**
 * RO:WHAT — Presentational shell for the crab://make route.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps MakePage focused on state orchestration while this component owns route markup.
 * RO:INTERACTS — MakePage.jsx, MakePreviewStudioChrome.jsx, Make command/timeline/project/handoff cards.
 * RO:INVARIANTS — display/user intent only; no fake CIDs; no fake receipts; no wallet/ledger mutation; no backend truth.
 * RO:METRICS — none.
 * RO:CONFIG — local Make page layout and control wiring only.
 * RO:SECURITY — receives local state/callbacks; does not create capabilities, balances, receipts, or spend authority.
 * RO:TEST — npm run build; manual crab://make render/start/record/timeline/export smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Card from '../../shared/components/Card.jsx';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';

import MakeCommandDeck from './MakeCommandDeck.jsx';
import MakeCutoutCard from './MakeCutoutCard.jsx';
import MakeHandoffCard from './MakeHandoffCard.jsx';
import MakeModeDeck from './MakeModeDeck.jsx';
import MakePresetDeck from './MakePresetDeck.jsx';
import MakePreviewPlaybackLayer from './MakePreviewPlaybackLayer.jsx';
import MakePreviewStudioChrome from './MakePreviewStudioChrome.jsx';
import MakeProjectCard from './MakeProjectCard.jsx';
import MakeSequenceReviewCard from './MakeSequenceReviewCard.jsx';
import MakeTimelineCard from './MakeTimelineCard.jsx';
import {
  MakePrompterControls,
  MakePrompterOverlay,
  MakeSubjectPreviewOverlay,
} from './MakePreviewOverlayWidgets.jsx';
import { formatDurationMs } from './makeDraftModel.js';

export default function MakePageLayout({ view }) {
  const {
    replaceClipInputRef,
    replaceSelectedClipFromFile,
    addClipInputRef,
    addTimelineClipsFromFiles,
    audioTrackInputRef,
    addAudioTracksFromFiles,
    canRecord,
    clips,
    countdown,
    draft,
    inputReady,
    inputState,
    isRecording,
    cancelCountdown,
    openVideoPage,
    startInputs,
    beginRecordingCountdown,
    stopInputs,
    stopRecording,
    outputPreset,
    recorderState,
    recordingElapsedMs,
    totalDurationMs,
    previewShellRef,
    canvasRef,
    cameraVideoRef,
    screenVideoRef,
    backgroundVideoRef,
    cutoutPreviewInteractive,
    subjectEditMode,
    previewDrawer,
    previewTimelineActive,
    isCountingDown,
    resetSubjectPreviewTransform,
    endSubjectDrag,
    beginSubjectDrag,
    moveSubjectDrag,
    showSubjectHudBriefly,
    zoomSubject,
    subjectHudVisible,
    selectedMode,
    currentSequenceClip,
    nextSequenceClip,
    handleSequenceClipEnded,
    pauseSequence,
    restartSequence,
    handleSequenceClipTimeUpdate,
    handleSequenceClipReady,
    sequenceState,
    sequenceVideoRef,
    prompterRunning,
    hasPrompterScript,
    togglePrompterRun,
    app,
    backgroundImageUrl,
    backgroundVideoUrl,
    applyPreset,
    requestAddTimelineClip,
    addLinkedVideoDraft,
    removeLinkedVideoDraft,
    commitTimelineClips,
    selectedClipId,
    timelinePlaybackItemOrder,
    commitTimelineItemOrder,
    updateLinkedVideoDraftTiming,
    handleLinkedVideoPreviewReady,
    audioTracks,
    linkedVideoDrafts,
    requestAddAudioTrack,
    addLinkedAudioDraft,
    removeAudioTrack,
    updateAudioTrackVolume,
    updateAudioTrackTiming,
    totalTimelineDurationMs,
    audioPreviewRefs,
    chooseBackgroundImage,
    chooseBackgroundVideo,
    clearBackgroundMedia,
    setPreviewDrawer,
    updateDraft,
    playSequence,
    approveSequence,
    setSelectedClipId,
    updateSelectedClipTimeline,
    updateClipTimelineById,
    captureTimelineHistory,
    splitTimelineAt,
    deleteTimelineRange,
    undoTimeline,
    redoTimeline,
    timelineHistoryState,
    selectedClip,
    setSubjectEditMode,
    setPreviewTimelineActive,
    compositorState,
    recorderMimeType,
    latestClip,
    clearClips,
    downloadClip,
    removeClip,
    moveSelectedClip,
    requestReplaceSelectedClip,
    retakeLastClip,
    resetDraft,
    preparedAudioTracks,
    canExportSequence,
    makeExportReady,
    makeExportState,
    copyPlan,
    exportApprovedSequence,
    sequenceApproved,
    sessionPlan,
  } = view;

  const side = null;

  return (
    <CreatorWorkspaceLayout
      eyebrow="crab://make"
      title="Make Studio"
      copy="A polished local studio for recording clips, composing scenes, capturing your screen, reviewing a timeline, and handing the final media into the existing CrabLink video mint pipeline."
      className="make-page"
      badges={[
        { label: 'local studio', tone: 'success' },
        { label: 'record clips', tone: 'info' },
        { label: 'video handoff', tone: 'neutral' },
      ]}
      principles={[
        {
          eyebrow: 'Flow',
          title: 'Segmented clips first',
          copy: 'Record one part, stop, record the next, review the strip, then export the clip you want to publish.',
        },
        {
          eyebrow: 'Studio',
          title: 'Screen and camera together',
          copy: 'Camera, screen, PiP, audio card, and scene modes live in one creator-first workspace.',
        },
        {
          eyebrow: 'Truth',
          title: 'Video pipeline owns publishing',
          copy: 'Make creates local media. crab://video still owns conversion, paid confirmation, backend receipts, and published manifests.',
        },
      ]}
      side={side}
    >
      <input
        ref={replaceClipInputRef}
        className="make-hidden-file-input"
        type="file"
        accept="video/*"
        onChange={replaceSelectedClipFromFile}
      />
      <input
        ref={addClipInputRef}
        className="make-hidden-file-input"
        type="file"
        accept="video/*"
        multiple
        onChange={addTimelineClipsFromFiles}
      />
      <input
        ref={audioTrackInputRef}
        className="make-hidden-file-input"
        type="file"
        accept="audio/*"
        multiple
        onChange={addAudioTracksFromFiles}
      />

      <section className="make-shell" aria-label="Make Studio">
        <MakeCommandDeck
          canRecord={canRecord}
          clips={clips}
          countdown={countdown}
          draft={draft}
          inputReady={inputReady}
          inputState={inputState}
          isRecording={isRecording}
          onCancelCountdown={cancelCountdown}
          onOpenVideo={openVideoPage}
          onStartInputs={startInputs}
          onStartRecording={beginRecordingCountdown}
          onStopInputs={stopInputs}
          onStopRecording={stopRecording}
          outputPreset={outputPreset}
          recorderState={recorderState}
          recordingElapsedMs={recordingElapsedMs}
          totalDurationMs={totalDurationMs}
        />

        <Card
          eyebrow="Studio preview"
          title="Compose and record"
          className="make-preview-card make-flagship-card"
          actions={
            <Badge tone={inputReady ? 'success' : inputState.status === 'error' ? 'danger' : 'neutral'}>
              {inputState.status}
            </Badge>
          }
        >
          <div ref={previewShellRef} className="make-preview-shell">
            <canvas
              ref={canvasRef}
              className="make-preview-canvas"
              width={outputPreset.width}
              height={outputPreset.height}
              aria-label="Make Studio composited preview canvas"
            />
            <video ref={cameraVideoRef} className="make-hidden-video" muted playsInline />
            <video ref={screenVideoRef} className="make-hidden-video" muted playsInline />
            <video ref={backgroundVideoRef} className="make-hidden-video" muted playsInline loop />

            <MakeSubjectPreviewOverlay
              active={cutoutPreviewInteractive && subjectEditMode && !previewDrawer && !previewTimelineActive && !isRecording && !isCountingDown}
              disabled={isRecording}
              offsetX={draft.subjectOffsetX}
              offsetY={draft.subjectOffsetY}
              onDoubleClick={resetSubjectPreviewTransform}
              onPointerCancel={endSubjectDrag}
              onPointerDown={beginSubjectDrag}
              onPointerMove={moveSubjectDrag}
              onPointerUp={endSubjectDrag}
              onShowHud={showSubjectHudBriefly}
              onZoomIn={() => zoomSubject(8)}
              onZoomOut={() => zoomSubject(-8)}
              scale={draft.subjectScale}
              visible={subjectHudVisible}
            />

            <div className="make-preview-topbar">
              <span>{selectedMode.label}</span>
              <span>{outputPreset.width}×{outputPreset.height}</span>
              <span>{draft.targetFps}fps</span>
            </div>

            {isRecording && (
              <div className="make-recording-badge" role="status">
                <span /> Recording {formatDurationMs(recordingElapsedMs)}
              </div>
            )}

            {countdown > 0 && (
              <div className="make-countdown-overlay" role="status" aria-live="assertive">
                <strong>{countdown}</strong>
                <span>Recording starts now</span>
              </div>
            )}

            <MakePreviewPlaybackLayer
              currentClip={currentSequenceClip}
              nextClip={nextSequenceClip}
              onEnded={handleSequenceClipEnded}
              onPause={pauseSequence}
              onRestart={restartSequence}
              onTimeUpdate={handleSequenceClipTimeUpdate}
              onReady={handleSequenceClipReady}
              sequenceState={sequenceState}
              sequenceVideoRef={sequenceVideoRef}
            />

            <MakePrompterOverlay draft={draft} running={prompterRunning} />
            <MakePrompterControls
              draft={draft}
              hasPrompterScript={hasPrompterScript}
              onToggleRun={togglePrompterRun}
              running={prompterRunning}
            />

            <MakePreviewStudioChrome
              app={app}
              backgroundImageUrl={backgroundImageUrl}
              backgroundVideoUrl={backgroundVideoUrl}
              canRecord={canRecord}
              clips={clips}
              countdown={countdown}
              draft={draft}
              inputReady={inputReady}
              inputState={inputState}
              isCountingDown={isCountingDown}
              isRecording={isRecording}
              onApplyPreset={applyPreset}
              onAddTimelineClip={requestAddTimelineClip}
              onAddLinkedVideoDraft={addLinkedVideoDraft}
              onRemoveLinkedVideoDraft={removeLinkedVideoDraft}
              onReorderClips={(nextClips) => commitTimelineClips(nextClips, { selectClipId: selectedClipId })}
              timelineItemOrder={timelinePlaybackItemOrder}
              onReorderTimelineItems={commitTimelineItemOrder}
              onUpdateLinkedVideoDraftTiming={updateLinkedVideoDraftTiming}
              onLinkedVideoPreviewReady={handleLinkedVideoPreviewReady}
              audioTracks={audioTracks}
              linkedVideoDrafts={linkedVideoDrafts}
              onRequestAddAudioTrack={requestAddAudioTrack}
              onAddLinkedAudioDraft={addLinkedAudioDraft}
              onRemoveAudioTrack={removeAudioTrack}
              onUpdateAudioTrackVolume={updateAudioTrackVolume}
              onUpdateAudioTrackTiming={updateAudioTrackTiming}
              totalTimelineDurationMs={totalTimelineDurationMs}
              audioPreviewRefs={audioPreviewRefs}
              onChooseBackgroundImage={chooseBackgroundImage}
              onChooseBackgroundVideo={chooseBackgroundVideo}
              onClearBackgroundMedia={clearBackgroundMedia}
              onCloseDrawer={() => setPreviewDrawer('')}
              onModeChange={(selectedModeValue) => updateDraft({ selectedMode: selectedModeValue, scenePreset: '' })}
              onOpenVideo={openVideoPage}
              onPauseSequence={pauseSequence}
              onPlaySequence={playSequence}
              onRestartSequence={restartSequence}
              onApproveSequence={approveSequence}
              onSelectClip={setSelectedClipId}
              onStartInputs={startInputs}
              onStartRecording={beginRecordingCountdown}
              onStopInputs={stopInputs}
              onStopRecording={stopRecording}
              onUpdateDraft={updateDraft}
              onUpdateSelectedTimeline={typeof updateSelectedClipTimeline === 'function' ? updateSelectedClipTimeline : null}
              onUpdateClipTimeline={updateClipTimelineById}
              onCaptureTimelineHistory={captureTimelineHistory}
              onSplitTimelineAt={splitTimelineAt}
              onDeleteTimelineRange={deleteTimelineRange}
              onTimelineUndo={undoTimeline}
              onTimelineRedo={redoTimeline}
              timelineCanUndo={timelineHistoryState.undoCount > 0}
              timelineCanRedo={timelineHistoryState.redoCount > 0}
              outputPreset={outputPreset}
              previewDrawer={previewDrawer}
              recorderState={recorderState}
              recordingElapsedMs={recordingElapsedMs}
              sequenceState={sequenceState}
              selectedClip={selectedClip}
              selectedClipId={selectedClipId}
              selectedMode={selectedMode}
              subjectEditAvailable={cutoutPreviewInteractive}
              subjectEditMode={subjectEditMode}
              onToggleSubjectEdit={() => setSubjectEditMode((current) => !current)}
              onTimelineHoverChange={setPreviewTimelineActive}
              setPreviewDrawer={setPreviewDrawer}
              totalDurationMs={totalDurationMs}
            />
          </div>

          <MakePresetDeck
            activePreset={draft.scenePreset}
            disabled={inputReady || isRecording || isCountingDown}
            onApply={applyPreset}
          />

          <MakeModeDeck
            activeMode={draft.selectedMode}
            disabled={inputReady || isRecording || isCountingDown}
            onChange={(selectedModeValue) => updateDraft({ selectedMode: selectedModeValue, scenePreset: '' })}
          />

          <MakeCutoutCard
            backgroundImageUrl={backgroundImageUrl}
            backgroundVideoUrl={backgroundVideoUrl}
            compositorState={compositorState}
            disabled={isRecording || isCountingDown}
            draft={draft}
            onChooseBackgroundImage={chooseBackgroundImage}
            onChooseBackgroundVideo={chooseBackgroundVideo}
            onClearBackgroundMedia={clearBackgroundMedia}
            onUpdate={updateDraft}
          />

          {inputState.error && <p className="make-alert make-alert-danger">{inputState.error}</p>}
          {inputState.warning && <p className="make-alert make-alert-warning">{inputState.warning}</p>}
          {!recorderMimeType && (
            <p className="make-alert make-alert-warning">
              MediaRecorder did not report a preferred MIME type. Recording may still work through the browser default, but final MP4 should still go through the video page.
            </p>
          )}

          {recorderState.error && <p className="make-alert make-alert-danger">{recorderState.error}</p>}
        </Card>

        <MakeTimelineCard
          canRecord={canRecord}
          clips={clips}
          isRecording={isRecording}
          latestClip={latestClip}
          onClear={clearClips}
          onDownload={downloadClip}
          onRemove={removeClip}
          onMoveSelected={moveSelectedClip}
          onRecordNext={beginRecordingCountdown}
          onReplaceSelected={requestReplaceSelectedClip}
          onRetakeLast={retakeLastClip}
          onSelect={setSelectedClipId}
          onUpdateSelectedTimeline={updateSelectedClipTimeline}
          selectedClip={selectedClip}
          selectedClipId={selectedClipId}
          totalDurationMs={totalDurationMs}
        />

        <MakeSequenceReviewCard
          clips={clips}
          isRecording={isRecording}
          onApprove={approveSequence}
          onPause={pauseSequence}
          onPlay={playSequence}
          onRestart={restartSequence}
          sequenceState={sequenceState}
          totalDurationMs={totalDurationMs}
        />

        <MakeProjectCard
          draft={draft}
          hasPrompterScript={hasPrompterScript}
          onReset={resetDraft}
          onTogglePrompterRun={togglePrompterRun}
          onUpdate={updateDraft}
          outputPreset={outputPreset}
          prompterRunning={prompterRunning}
        />

        <MakeHandoffCard
          audioTracks={preparedAudioTracks}
          canExportSequence={canExportSequence}
          clips={clips}
          exportedSourceReady={makeExportReady}
          exportState={makeExportState}
          linkedVideoDrafts={linkedVideoDrafts}
          onCopyPlan={copyPlan}
          onDownload={downloadClip}
          onExportSequence={exportApprovedSequence}
          onOpenVideo={openVideoPage}
          selectedClip={selectedClip}
          sequenceApproved={sequenceApproved}
          sequenceState={sequenceState}
          sessionPlan={sessionPlan}
        />
      </section>
    </CreatorWorkspaceLayout>
  );
}
