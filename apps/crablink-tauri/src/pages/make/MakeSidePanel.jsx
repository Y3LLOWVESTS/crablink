/**
 * RO:WHAT — Right-side readiness, device, recorder, and truth-boundary panel for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; moves status-card markup out of MakePage.
 * RO:INTERACTS — MakePage.jsx, makeDraftModel.js, shared Card/Button/StatChip/JsonPreview controls.
 * RO:INVARIANTS — displays derived local/session state only; no backend truth; no wallet/ledger mutation; no fake receipts.
 * RO:METRICS — none.
 * RO:CONFIG — local device/recorder/session-plan display state.
 * RO:SECURITY — no secrets, private keys, raw capabilities, balances, or spend authority.
 * RO:TEST — npm run build; manual crab://make side-panel readiness/device smoke.
 */

import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import StatChip from '../../shared/components/StatChip.jsx';

import { formatDurationMs } from './makeDraftModel.js';

export default function MakeSidePanel({
  clips,
  deviceState,
  inputState,
  onCopyPlan,
  onRefreshDevices,
  onToggleDeveloperPlan,
  readiness,
  recorderMimeType,
  sessionPlan,
  showDeveloperPlan,
  totalDurationMs,
}) {
  return (
    <div className="make-side-stack">
      <Card eyebrow="Studio status" title="Ready check" className="make-side-card make-ready-card">
        <div className="make-side-hero-stat">
          <strong>{readiness.summary === 'ready_to_export_draft' ? 'Ready' : 'Drafting'}</strong>
          <span>{clips.length} clips · {formatDurationMs(totalDurationMs)}</span>
        </div>

        <div className="make-compact-status-list">
          {readiness.cards.map((card) => (
            <div className={`make-compact-status make-tone-${card.tone || 'neutral'}`} key={card.key}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.help}</small>
            </div>
          ))}
        </div>
      </Card>

      <Card
        eyebrow="Devices"
        title="Capture inventory"
        className="make-side-card"
        actions={<Button variant="secondary" size="sm" onClick={onRefreshDevices}>Refresh</Button>}
      >
        <div className="make-stat-grid make-stat-grid-two">
          <StatChip label="Cameras" value={String(deviceState.cameras)} help={deviceState.status} tone="neutral" size="sm" />
          <StatChip label="Mics" value={String(deviceState.microphones)} help={deviceState.status} tone="neutral" size="sm" />
        </div>
        {deviceState.error && <p className="make-alert make-alert-warning">{deviceState.error}</p>}
      </Card>

      <Card eyebrow="Local media path" title="Recorder details" className="make-side-card">
        <div className="make-pipeline-list">
          <span>Canvas preview</span>
          <span>MediaRecorder</span>
          <span>Local clip blob</span>
          <span>Manual video-page handoff</span>
        </div>
        <p className="make-side-copy">
          Preferred MIME: <strong>{recorderMimeType || 'browser default / unavailable'}</strong>
        </p>
        <p className="make-side-copy">
          Current input: <strong>{inputState.status}</strong>. Clips in memory: <strong>{clips.length}</strong>.
        </p>
        <div className="make-button-row">
          <Button variant="secondary" size="sm" onClick={onCopyPlan}>Copy plan</Button>
          <Button variant="secondary" size="sm" onClick={onToggleDeveloperPlan}>
            {showDeveloperPlan ? 'Hide JSON' : 'Show JSON'}
          </Button>
        </div>
      </Card>

      <Card eyebrow="Truth boundary" title="What Make does not do" className="make-side-card">
        <ul className="make-boundary-list">
          <li>No wallet mutation.</li>
          <li>No ledger mutation.</li>
          <li>No fake receipt or fake balance.</li>
          <li>No local cache paid unlock.</li>
          <li>No creator-supplied executable player.</li>
        </ul>
      </Card>

      {showDeveloperPlan && <JsonPreview data={sessionPlan} label="Make session plan" initiallyOpen />}
    </div>
  );
}
