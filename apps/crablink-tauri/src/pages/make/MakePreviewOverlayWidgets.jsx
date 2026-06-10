/**
 * RO:WHAT — Preview overlay widgets for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps preview-only controls out of the route container.
 * RO:INTERACTS — MakePage.jsx, MakePreviewStudioChrome future split, make.css.
 * RO:INVARIANTS — preview UI only; no recording authority; no export truth; no wallet/ledger mutation.
 * RO:METRICS — none.
 * RO:CONFIG — subject transform/prompter draft display values.
 * RO:SECURITY — no secrets, native paths, receipt truth, or spend authority.
 * RO:TEST — npm run build; manual crab://make cutout drag/zoom + prompter smoke.
 */

export function MakePreviewIcon({ name }) {
  if (name === 'settings') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
        <path d="M20.1 13.2a7.6 7.6 0 0 0 .05-1.2 7.6 7.6 0 0 0-.05-1.2l2.02-1.55-2-3.46-2.38.96a8.4 8.4 0 0 0-2.08-1.2L15.3 3h-4l-.36 2.55a8.4 8.4 0 0 0-2.08 1.2l-2.38-.96-2 3.46L6.5 10.8A7.6 7.6 0 0 0 6.45 12c0 .4.02.8.05 1.2l-2.02 1.55 2 3.46 2.38-.96c.63.5 1.33.9 2.08 1.2l.36 2.55h4l.36-2.55a8.4 8.4 0 0 0 2.08-1.2l2.38.96 2-3.46-2.02-1.55Z" />
      </svg>
    );
  }

  if (name === 'effects') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.8 13.7 8l5.5 1.7-5.5 1.7L12 16.6l-1.7-5.2-5.5-1.7L10.3 8 12 2.8Z" />
        <path d="m18.5 14.2.9 2.7 2.8.9-2.8.9-.9 2.7-.9-2.7-2.8-.9 2.8-.9.9-2.7Z" />
      </svg>
    );
  }

  if (name === 'puzzle') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.7 3.1a3.1 3.1 0 0 1 4.6 2.7c0 .35-.06.68-.17.99h2.67c1 0 1.8.8 1.8 1.8v2.56c.28-.09.58-.14.9-.14a3 3 0 1 1 0 6c-.32 0-.62-.05-.9-.14v2.56c0 1-.8 1.8-1.8 1.8h-4.18a1.25 1.25 0 0 1-1.02-1.97c.16-.23.25-.52.25-.84a1.52 1.52 0 1 0-3.04 0c0 .32.09.61.25.84a1.25 1.25 0 0 1-1.02 1.97H4.3c-1 0-1.8-.8-1.8-1.8v-3.77c0-.88.9-1.48 1.72-1.14.24.1.5.16.78.16a1.55 1.55 0 0 0 0-3.1c-.28 0-.54.05-.78.16A1.25 1.25 0 0 1 2.5 10.6V8.59c0-1 .8-1.8 1.8-1.8h2.67a3.1 3.1 0 0 1 2.73-3.68Z" />
      </svg>
    );
  }

  if (name === 'move') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.8 15.2 6h-2.1v4.9H18V8.8L21.2 12 18 15.2v-2.1h-4.9V18h2.1L12 21.2 8.8 18h2.1v-4.9H6v2.1L2.8 12 6 8.8v2.1h4.9V6H8.8L12 2.8Z" />
      </svg>
    );
  }

  if (name === 'stop') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="7" y="7" width="10" height="10" rx="2" />
      </svg>
    );
  }

  if (name === 'play') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5.6v12.8L18.8 12 8 5.6Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}




export function makeOverlayClipDurationMs(clip = {}) {
  const durationMs = Number(clip.durationMs || 0);
  const startMs = Number(clip.trimStartMs ?? clip.timeline?.trimStartMs ?? 0);
  const endMs = Number(clip.trimEndMs ?? clip.timeline?.trimEndMs ?? durationMs);

  if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
    return Math.max(0, endMs - startMs);
  }

  return Math.max(0, durationMs);
}




export function makeOverlayClipLookLabel(clip = {}) {
  const value = String(clip.timelineEffect || clip.timeline?.effect || 'clean').trim();
  return value === 'none' ? 'clean' : value || 'clean';
}





export function MakeSubjectPreviewOverlay({
  active,
  disabled,
  offsetX,
  offsetY,
  onDoubleClick,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onShowHud,
  onZoomIn,
  onZoomOut,
  scale,
  visible,
}) {
  if (!active) {
    return null;
  }

  const safeScale = Number(scale || 100);
  const safeX = Number(offsetX || 0);
  const safeY = Number(offsetY || 0);

  return (
    <div
      className={`make-subject-overlay ${visible ? 'is-visible' : ''} ${disabled ? 'is-disabled' : ''}`}
      aria-label="Drag to position cutout subject. Zoom controls are preview-only and are not recorded."
      onDoubleClick={disabled ? undefined : onDoubleClick}
      onPointerCancel={disabled ? undefined : onPointerCancel}
      onPointerDown={disabled ? undefined : onPointerDown}
      onPointerMove={disabled ? undefined : onPointerMove}
      onPointerUp={disabled ? undefined : onPointerUp}
      onClick={() => onShowHud?.()}
      role="presentation"
    >
      <div className="make-subject-drag-hint" aria-hidden="true">
        <span />
        <strong>Drag to move</strong>
      </div>

      <div
        className={`make-subject-zoom-popover ${visible ? 'is-visible' : ''}`}
        aria-label="Preview zoom controls. Not recorded."
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          disabled={disabled}
          aria-label="Zoom subject out"
          onClick={onZoomOut}
        >
          −
        </button>
        <span>{Math.round(safeScale)}%</span>
        <button
          type="button"
          disabled={disabled}
          aria-label="Zoom subject in"
          onClick={onZoomIn}
        >
          +
        </button>
      </div>

      <div className={`make-subject-transform-readout ${visible ? 'is-visible' : ''}`} aria-hidden="true">
        X {Math.round(safeX)} · Y {Math.round(safeY)}
      </div>
    </div>
  );
}




export function MakePrompterOverlay({ draft, running }) {
  const script = draft.scriptText.trim();

  if (!draft.teleprompterEnabled || !script) {
    return null;
  }

  const durationSeconds = Math.max(18, 110 - Number(draft.teleprompterSpeed || 38));
  const anchorClass = draft.teleprompterAnchor === 'top' ? 'make-prompter-top' : 'make-prompter-bottom';

  return (
    <div
      className={`make-prompter-overlay ${anchorClass} ${running ? 'is-running' : ''}`}
      style={{ '--make-prompter-duration': `${durationSeconds}s` }}
      aria-hidden={!draft.teleprompterEnabled}
    >
      <div className="make-prompter-window">
        <pre key={`${running ? 'run' : 'pause'}-${script.length}-${draft.teleprompterSpeed}`}>{script}</pre>
      </div>
      <span>Teleprompter preview only · not recorded</span>
    </div>
  );
}




export function MakePrompterControls({ draft, hasPrompterScript, onToggleRun, running }) {
  if (!draft.teleprompterEnabled || !hasPrompterScript) {
    return null;
  }

  return (
    <div className="make-prompter-controls">
      <span>Prompt visible to creator only</span>
      <button type="button" onClick={onToggleRun}>
        {running ? 'Pause' : 'Run'}
      </button>
    </div>
  );
}


