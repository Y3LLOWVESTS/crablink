/**
 * RO:WHAT — Floating record/control button stack for crab://make preview chrome.
 * RO:WHY — App Integration; Concerns: DX/SEC; keeps MakePreviewStudioChrome smaller while preserving studio controls.
 * RO:INTERACTS — MakePreviewStudioChrome, MakePreviewOverlayWidgets, preview drawers, subject editor, recorder state.
 * RO:INVARIANTS — display/user intent only; no fake CIDs; no receipts; no wallet mutation; no paid unlock authority.
 * RO:METRICS — none.
 * RO:CONFIG — local preview/recording UI state only.
 * RO:SECURITY — no secrets, balances, receipts, capabilities, or backend truth are created here.
 * RO:TEST — npm run build; manual crab://make mode/settings/effects/subject/record smoke.
 */

import { MakePreviewIcon } from './MakePreviewOverlayWidgets.jsx';

export default function MakePreviewRecordControls({
  inputReady,
  isCountingDown,
  isRecording,
  onRecordClick,
  onToggleDrawer,
  onToggleSubjectEdit,
  previewDrawer,
  recordDisabled,
  recordLabel,
  recordTitle,
  selectedMode,
  selectedModeLabel,
  subjectEditAvailable,
  subjectEditMode,
  trimEditorActive,
}) {
  const handleDrawerClick = (event, drawer) => {
    event.stopPropagation();
    onToggleDrawer?.(drawer);
  };

  return (
    <div
      className="make-preview-control-stack"
      aria-label="Preview action buttons"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
    >
      <button
        className={`make-preview-round-button make-preview-mode-button ${previewDrawer === 'modes' ? 'is-active' : ''}`}
        type="button"
        aria-label={`Switch video mode. Current mode: ${selectedMode?.label || selectedModeLabel}`}
        title={`Switch video mode · ${selectedMode?.label || selectedModeLabel}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => handleDrawerClick(event, 'modes')}
      >
        <MakePreviewIcon name="puzzle" />
      </button>

      <button
        className={`make-preview-round-button ${previewDrawer === 'settings' ? 'is-active' : ''}`}
        type="button"
        aria-label="Open studio settings"
        title="Studio settings"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => handleDrawerClick(event, 'settings')}
      >
        <MakePreviewIcon name="settings" />
      </button>

      <button
        className={`make-preview-round-button ${previewDrawer === 'effects' ? 'is-active' : ''}`}
        type="button"
        aria-label="Open effects"
        title="Effects"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => handleDrawerClick(event, 'effects')}
      >
        <MakePreviewIcon name="effects" />
      </button>

      {subjectEditAvailable && (
        <button
          className={`make-preview-round-button make-preview-subject-button ${subjectEditMode ? 'is-active' : ''}`}
          type="button"
          aria-label={subjectEditMode ? 'Stop moving subject' : 'Move cutout subject'}
          title={subjectEditMode ? 'Stop moving subject' : 'Move cutout subject'}
          disabled={isRecording || isCountingDown || Boolean(previewDrawer) || trimEditorActive}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSubjectEdit?.();
          }}
        >
          <MakePreviewIcon name="move" />
        </button>
      )}

      <button
        className={`make-preview-record-button ${isRecording ? 'is-recording' : ''} ${isCountingDown ? 'is-countdown' : ''}`}
        type="button"
        aria-label={recordTitle}
        title={recordTitle}
        disabled={recordDisabled}
        onClick={onRecordClick}
      >
        <span className="make-preview-record-glyph" aria-hidden="true">
          <MakePreviewIcon name={isRecording ? 'stop' : inputReady ? 'record' : 'play'} />
        </span>
        <span className="make-preview-record-label">{recordLabel}</span>
      </button>
    </div>
  );
}
