/**
 * RO:WHAT — Local sequence review card for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; extracts sequence approval UI from the route container.
 * RO:INTERACTS — MakePage.jsx, makeDraftModel.js, shared Badge/Button/Card controls.
 * RO:INVARIANTS — local review state only; no backend asset truth; no wallet/ledger mutation; no fake receipts/CIDs.
 * RO:METRICS — none.
 * RO:CONFIG — local sequence review status and clip duration values.
 * RO:SECURITY — no secrets, capabilities, balances, native paths, or spend authority.
 * RO:TEST — npm run build; manual crab://make record/review/approve sequence smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';

import { formatDurationMs } from './makeDraftModel.js';

function sequenceStatusLabel(status) {
  if (status === 'approved') return 'Approved';
  if (status === 'reviewed') return 'Review complete';
  if (status === 'playing') return 'Playing';
  if (status === 'paused') return 'Paused';
  if (status === 'draft') return 'Needs review';
  return 'No sequence';
}

export default function MakeSequenceReviewCard({
  clips,
  isRecording,
  onApprove,
  onPause,
  onPlay,
  onRestart,
  sequenceState,
  totalDurationMs,
}) {
  const hasClips = clips.length > 0;
  const currentClip = clips[sequenceState.currentIndex] || clips[0] || null;
  const canApprove = hasClips && sequenceState.status === 'reviewed' && !isRecording;
  const approved = sequenceState.status === 'approved';

  return (
    <Card eyebrow="Sequence review" title="Watch the full clip flow" className="make-sequence-card">
      <div className="make-sequence-grid">
        <div className={`make-sequence-player-shell make-sequence-monitor-shell ${currentClip ? 'has-current' : ''}`}>
          {currentClip ? (
            <div className="make-sequence-monitor-copy">
              <span>Preview monitor</span>
              <strong>Playback now runs inside the main studio preview.</strong>
              <small>{sequenceState.status === 'playing' ? 'Playing now' : sequenceStatusLabel(sequenceState.status)} · {currentClip.name}</small>
            </div>
          ) : (
            <div className="make-sequence-empty">
              <strong>No sequence yet.</strong>
              <span>Record two or more clips to review the full flow before export.</span>
            </div>
          )}
        </div>

        <div className="make-sequence-panel">
          <div className="make-sequence-status-row">
            <Badge tone={approved ? 'success' : sequenceState.status === 'reviewed' ? 'info' : 'neutral'} uppercase={false}>
              {sequenceStatusLabel(sequenceState.status)}
            </Badge>
            <span>{clips.length} clips · {formatDurationMs(totalDurationMs)}</span>
          </div>

          <p>
            This plays every local clip in order so you can approve the exact creator-app flow before
            export. Approval is local only and creates no backend asset, receipt, or paid unlock.
          </p>

          {hasClips && (
            <div className="make-sequence-now">
              <span>Now previewing</span>
              <strong>{currentClip ? `${sequenceState.currentIndex + 1}. ${currentClip.name}` : 'Not started'}</strong>
            </div>
          )}

          {sequenceState.error && <p className="make-alert make-alert-warning">{sequenceState.error}</p>}

          <div className="make-button-row">
            <Button variant="secondary" onClick={onPlay} disabled={!hasClips || isRecording}>
              Play sequence
            </Button>
            <Button variant="secondary" onClick={onPause} disabled={!hasClips || sequenceState.status !== 'playing'}>
              Pause
            </Button>
            <Button variant="secondary" onClick={onRestart} disabled={!hasClips || isRecording}>
              Restart
            </Button>
            <Button onClick={onApprove} disabled={!canApprove}>
              Approve sequence
            </Button>
          </div>

          {!approved && hasClips && (
            <p className="make-sequence-help">
              Play through the final clip to unlock approval. Any new recording, retake, remove, or clear action resets approval.
            </p>
          )}

          {approved && (
            <div className="make-approved-box">
              <strong>Approved for export.</strong>
              <span>The next handoff step can join these clips into one MP4 and send that fresh local source to Video.</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
