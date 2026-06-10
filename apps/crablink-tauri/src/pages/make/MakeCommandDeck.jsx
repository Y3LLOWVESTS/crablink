/**
 * RO:WHAT — Command center deck for crab://make preview, record, stop, and video handoff controls.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps top-level MakePage focused on route state instead of command markup.
 * RO:INTERACTS — MakePage.jsx, MakeSharedControls.jsx, makeDraftModel.js, shared Button.
 * RO:INVARIANTS — display/control intent only; no backend truth; no wallet/ledger mutation; no fake receipts/CIDs.
 * RO:METRICS — none.
 * RO:CONFIG — local draft mode and output preset display values.
 * RO:SECURITY — no secrets, native paths, spend authority, balances, or receipt truth.
 * RO:TEST — npm run build; manual crab://make start/record/stop/video-handoff smoke.
 */

import Button from '../../shared/components/Button.jsx';

import { findMakeMode, formatDurationMs } from './makeDraftModel.js';
import { StatPill } from './MakeSharedControls.jsx';

export default function MakeCommandDeck({
  canRecord,
  clips,
  countdown,
  draft,
  inputReady,
  inputState,
  isRecording,
  onCancelCountdown,
  onOpenVideo,
  onStartInputs,
  onStartRecording,
  onStopInputs,
  onStopRecording,
  outputPreset,
  recorderState,
  recordingElapsedMs,
  totalDurationMs,
}) {
  return (
    <section className="make-command-deck" aria-label="Make Studio command center">
      <div className="make-command-main">
        <div className="make-orb" aria-hidden="true">
          <span />
        </div>
        <div>
          <p className="cl-eyebrow">Creator command center</p>
          <h2>{draft.title || 'Untitled Make project'}</h2>
          <p>
            {inputReady
              ? `${findMakeMode(draft.selectedMode).label} is ready. Record a segment whenever you are set.`
              : 'Start a preview, record segments, then review the timeline before video handoff.'}
          </p>
        </div>
      </div>

      <div className="make-command-stats">
        <StatPill label="Mode" value={findMakeMode(draft.selectedMode).shortLabel} />
        <StatPill label="Canvas" value={`${outputPreset.width}×${outputPreset.height}`} />
        <StatPill label="Clips" value={String(clips.length)} />
        <StatPill label="Total" value={formatDurationMs(totalDurationMs)} />
      </div>

      <div className="make-command-actions">
        {!inputReady ? (
          <Button onClick={onStartInputs} disabled={inputState.status === 'starting'}>
            {inputState.status === 'starting' ? 'Starting…' : 'Start preview'}
          </Button>
        ) : (
          <Button variant="secondary" onClick={onStopInputs} disabled={isRecording}>
            Stop preview
          </Button>
        )}

        {countdown > 0 ? (
          <Button variant="secondary" onClick={onCancelCountdown}>
            Cancel {countdown}
          </Button>
        ) : !isRecording ? (
          <Button onClick={onStartRecording} disabled={!canRecord}>
            Record clip
          </Button>
        ) : (
          <Button variant="secondary" onClick={onStopRecording}>
            Stop {formatDurationMs(recordingElapsedMs)}
          </Button>
        )}

        <Button variant="secondary" onClick={onOpenVideo} disabled={clips.length === 0 || isRecording}>
          Video handoff
        </Button>
      </div>

      {recorderState.activeName && (
        <div className="make-now-recording">
          <span />
          {recorderState.activeName}
        </div>
      )}
    </section>
  );
}
