/**
 * RO:WHAT — Drawer panel for the crab://make preview chrome.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps MakePreviewStudioChrome smaller while preserving local studio controls.
 * RO:INTERACTS — MakePreviewStudioChrome, MakeModeDeck, MakePresetDeck, MakeCutoutCard.
 * RO:INVARIANTS — display/user intent only; no fake CIDs; no fake receipts; no wallet mutation; no paid unlock from cache.
 * RO:METRICS — none.
 * RO:CONFIG — local draft preview settings only.
 * RO:SECURITY — no private keys, capabilities, balances, receipts, or backend truth are created here.
 * RO:TEST — npm run build; manual crab://make drawer/mode/preset/effects smoke.
 */

import Button from '../../shared/components/Button.jsx';

import MakeCutoutCard from './MakeCutoutCard.jsx';
import MakeModeDeck from './MakeModeDeck.jsx';
import MakePresetDeck from './MakePresetDeck.jsx';
import { PREVIEW_TIMELINE_EFFECTS } from './makePageConstants.js';
import { formatDurationMs } from './makeDraftModel.js';

export default function MakePreviewDrawer({
  activeDrawer,
  backgroundImageUrl,
  backgroundVideoUrl,
  canApplyTimelineEffect,
  draft,
  drawerEyebrow,
  drawerTitle,
  hasClips,
  inputReady,
  inputState,
  isCountingDown,
  isRecording,
  onApplyPreset,
  onChooseBackgroundImage,
  onChooseBackgroundVideo,
  onClearBackgroundMedia,
  onCloseDrawer,
  onModeChange,
  onOpenVideo,
  onStartInputs,
  onStopInputs,
  onUpdateDraft,
  onUpdateSelectedTimeline,
  outputPreset,
  previewDrawer,
  recorderState,
  selectedClip,
  selectedClipDurationMs,
  selectedMode,
  selectedModeLabel,
  sourceModeLocked,
}) {
  if (!activeDrawer) {
    return null;
  }

  return (
    <aside
      className="make-preview-drawer"
      aria-label={`${previewDrawer} drawer`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="make-preview-drawer-head">
        <div>
          <span>{drawerEyebrow}</span>
          <strong>{drawerTitle}</strong>
        </div>
        <button type="button" aria-label="Close drawer" onClick={onCloseDrawer}>
          ×
        </button>
      </div>

      {previewDrawer === 'modes' ? (
        <div className="make-preview-drawer-body">
          <section className="make-preview-drawer-section">
            <div className="make-preview-drawer-section-head">
              <strong>Video mode</strong>
              <span>{selectedMode?.label || selectedModeLabel}</span>
            </div>

            <MakeModeDeck
              activeMode={draft.selectedMode}
              disabled={sourceModeLocked}
              onChange={onModeChange}
            />

            {sourceModeLocked && (
              <p className="make-preview-drawer-note">
                Stop preview before switching camera, screen, PiP, cutout, or audio-card source modes. This keeps capture permissions predictable.
              </p>
            )}
          </section>

          <section className="make-preview-drawer-section">
            <div className="make-preview-drawer-section-head">
              <strong>Scene preset</strong>
              <span>{draft.scenePreset || 'custom'}</span>
            </div>

            <MakePresetDeck
              activePreset={draft.scenePreset}
              disabled={sourceModeLocked}
              onApply={onApplyPreset}
            />
          </section>
        </div>
      ) : previewDrawer === 'effects' ? (
        <div className="make-preview-drawer-body">
          <section className="make-preview-drawer-section">
            <div className="make-preview-drawer-section-head">
              <strong>Timeline look</strong>
              <span>{selectedClip ? `${selectedClip.name || 'Selected clip'} · ${formatDurationMs(selectedClipDurationMs)}` : 'Select a clip'}</span>
            </div>

            <div className="make-preview-effect-grid">
              {PREVIEW_TIMELINE_EFFECTS.map((effect) => {
                const selected = (selectedClip?.timelineEffect || selectedClip?.timeline?.effect || 'none') === effect.value;

                return (
                  <button
                    className={`make-preview-effect-tile ${selected ? 'is-selected' : ''}`}
                    key={effect.value}
                    type="button"
                    disabled={!canApplyTimelineEffect}
                    onClick={() => onUpdateSelectedTimeline?.({ timelineEffect: effect.value })}
                  >
                    <strong>{effect.label}</strong>
                    <small>{effect.copy}</small>
                  </button>
                );
              })}
            </div>

            {!canApplyTimelineEffect && (
              <p className="make-preview-drawer-note">
                Record or select a clip to apply timeline looks. Clip trimming now happens directly on the preview timeline by dragging clip edges.
              </p>
            )}
          </section>

          <section className="make-preview-drawer-section">
            <div className="make-preview-drawer-section-head">
              <strong>Live cutout</strong>
              <span>Local preview and recording compositor</span>
            </div>

            <MakeCutoutCard
              backgroundImageUrl={backgroundImageUrl}
              backgroundVideoUrl={backgroundVideoUrl}
              compositorState={{ cutout: { status: 'drawer' } }}
              disabled={isRecording || isCountingDown}
              draft={draft}
              onChooseBackgroundImage={onChooseBackgroundImage}
              onChooseBackgroundVideo={onChooseBackgroundVideo}
              onClearBackgroundMedia={onClearBackgroundMedia}
              onUpdate={onUpdateDraft}
            />
          </section>
        </div>
      ) : (
        <div className="make-preview-drawer-body">
          <section className="make-preview-drawer-section">
            <div className="make-preview-drawer-section-head">
              <strong>Source</strong>
              <span>{selectedMode?.label || selectedModeLabel} · {outputPreset.width}×{outputPreset.height}</span>
            </div>

            <MakeModeDeck
              activeMode={draft.selectedMode}
              disabled={inputReady || isRecording || isCountingDown}
              onChange={onModeChange}
            />
          </section>

          <section className="make-preview-drawer-section">
            <div className="make-preview-drawer-section-head">
              <strong>Preset</strong>
              <span>{draft.scenePreset || 'custom'}</span>
            </div>

            <MakePresetDeck
              activePreset={draft.scenePreset}
              disabled={inputReady || isRecording || isCountingDown}
              onApply={onApplyPreset}
            />
          </section>

          <section className="make-preview-drawer-section make-preview-drawer-actions">
            {!inputReady ? (
              <Button onClick={onStartInputs} disabled={inputState.status === 'starting'}>
                {inputState.status === 'starting' ? 'Starting…' : 'Start preview'}
              </Button>
            ) : (
              <Button variant="secondary" onClick={onStopInputs} disabled={isRecording}>
                Stop preview
              </Button>
            )}

            <Button variant="secondary" onClick={onOpenVideo} disabled={!hasClips || isRecording}>
              Video handoff
            </Button>
          </section>

          {recorderState.activeName && (
            <p className="make-preview-drawer-note">
              Active clip: <strong>{recorderState.activeName}</strong>
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
