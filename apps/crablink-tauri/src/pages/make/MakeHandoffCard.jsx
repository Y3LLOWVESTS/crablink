/**
 * RO:WHAT — Local Make-to-Video export/handoff card for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; extracts finish/export truth-boundary UI from MakePage.
 * RO:INTERACTS — MakePage.jsx, makeDraftModel.js, shared Badge/Button/Card controls, Video page handoff flow.
 * RO:INVARIANTS — local export descriptor only; no minting; no upload; no wallet/ledger mutation; no fake b3/receipt truth.
 * RO:METRICS — none.
 * RO:CONFIG — local export state, source handle display, linked-media reference facts.
 * RO:SECURITY — displays redacted source handles only; no private paths, raw capabilities, balances, or spend authority.
 * RO:TEST — npm run build; manual approved sequence export/handoff smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';

import { formatBytes } from './makeDraftModel.js';

function makeExportStatusLabel(status) {
  if (status === 'ready') return 'MP4 ready';
  if (status === 'exporting') return 'Exporting MP4';
  if (status === 'error') return 'Export failed';
  return 'Not exported';
}

function shortMakeHandle(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  if (raw.length <= 34) {
    return raw;
  }

  return `${raw.slice(0, 18)}…${raw.slice(-10)}`;
}

export default function MakeHandoffCard({
  audioTracks = [],
  canExportSequence,
  clips,
  exportedSourceReady,
  exportState,
  linkedVideoDrafts = [],
  onCopyPlan,
  onDownload,
  onExportSequence,
  onOpenVideo,
  selectedClip,
  sequenceApproved,
  sequenceState,
}) {
  const hasClips = clips.length > 0;
  const exportBusy = exportState?.status === 'exporting';
  const exportReady = exportedSourceReady;
  const sourceHandle = exportState?.result?.source?.sourceHandle || '';
  const localAudioTracks = audioTracks.filter((track) => track.kind !== 'linked_audio' && track.objectUrl && !track.muted);
  const linkedAudioTracks = audioTracks.filter((track) => track.kind === 'linked_audio');
  const linkedVideoCount = linkedVideoDrafts.length;
  const linkedAudioCount = linkedAudioTracks.length;
  const hasReferenceOnlyLinkedMedia = linkedVideoCount > 0 || linkedAudioCount > 0;
  const exportScopeFacts = [
    {
      key: 'clips',
      label: 'Local clips',
      value: String(clips.length),
      help: clips.length ? 'Rendered into the local MP4.' : 'Record or add local clips first.',
      tone: clips.length ? 'good' : 'neutral',
    },
    {
      key: 'audio',
      label: 'Local audio',
      value: String(localAudioTracks.length),
      help: localAudioTracks.length ? 'Mixed by Rust/FFmpeg during export.' : 'No exportable local audio lane.',
      tone: localAudioTracks.length ? 'good' : 'neutral',
    },
    {
      key: 'linked-video',
      label: 'Linked video',
      value: String(linkedVideoCount),
      help: linkedVideoCount ? 'Previewable after pay, but not export permission.' : 'No linked video references.',
      tone: linkedVideoCount ? 'warn' : 'neutral',
    },
    {
      key: 'linked-audio',
      label: 'Linked audio',
      value: String(linkedAudioCount),
      help: linkedAudioCount ? 'Draft reference only until reuse policy exists.' : 'No linked audio references.',
      tone: linkedAudioCount ? 'warn' : 'neutral',
    },
  ];

  return (
    <Card eyebrow="Finish" title="Export approved sequence, then publish through video" className="make-handoff-card">
      <div className="make-handoff">
        <div className="make-finish-hero">
          <strong>
            {exportReady
              ? 'MP4 source ready for Video'
              : sequenceApproved
                ? hasReferenceOnlyLinkedMedia
                  ? 'Approved local sequence ready; linked media stays reference-only'
                  : 'Approved sequence ready to export'
                : hasClips
                  ? 'Approve the sequence first'
                  : 'Record clips first'}
          </strong>
          <p>
            Make exports one local MP4 and registers it as a redacted source handle. The Video page
            still owns prepare, ROC confirmation, backend receipts, b3 CIDs, manifests, and crab URLs.
            {hasReferenceOnlyLinkedMedia
              ? ' Linked crab:// media is preserved in the plan as provenance/reuse intent, but it is not rendered into this MP4 until backend reuse rights and payout policy are verified.'
              : ''}
          </p>
        </div>

        <div className="make-export-boundary-panel" aria-label="Make export scope and rights facts">
          <div className="make-export-boundary-head">
            <div>
              <span>Export facts</span>
              <strong>{hasReferenceOnlyLinkedMedia ? 'Local export with reference-only linked media' : 'Local export scope'}</strong>
            </div>
            <Badge tone={hasReferenceOnlyLinkedMedia ? 'warning' : 'success'} uppercase={false}>
              {hasReferenceOnlyLinkedMedia ? 'reuse not verified' : 'local-only'}
            </Badge>
          </div>

          <div className="make-export-boundary-grid">
            {exportScopeFacts.map((fact) => (
              <div className={`make-export-boundary-fact is-${fact.tone}`} key={fact.key}>
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
                <small>{fact.help}</small>
              </div>
            ))}
          </div>

          {hasReferenceOnlyLinkedMedia && (
            <div className="make-export-linked-warning" role="note">
              <strong>Paid preview is not reuse permission.</strong>
              <span>
                Linked source previews prove view access only. They do not grant remix, export, ownership,
                payout-split, or mint rights. This export will include local clips and local audio only.
              </span>
            </div>
          )}

          {linkedVideoDrafts.length > 0 && (
            <div className="make-export-linked-list" aria-label="Reference-only linked video sources">
              {linkedVideoDrafts.slice(0, 4).map((item) => (
                <span key={item.id || item.url} title={item.url}>
                  {item.displayName || 'Linked video'} · {item.rangeLabel || 'source range'} · reference-only
                </span>
              ))}
              {linkedVideoDrafts.length > 4 && <em>+{linkedVideoDrafts.length - 4} more</em>}
            </div>
          )}
        </div>

        <div className="make-handoff-steps" aria-label="Make to video handoff steps">
          {[
            sequenceApproved ? 'Full local sequence approved' : 'Play the full sequence and approve it',
            hasReferenceOnlyLinkedMedia
              ? 'Keep linked crab:// media as reference-only plan facts'
              : 'No linked-media reuse rights needed for this local export',
            exportReady ? 'Approved sequence exported as one MP4' : 'Export approved sequence as one MP4',
            exportReady ? 'Fresh local source handle registered' : 'Register MP4 as a local source handle',
            'Open crab://video and prepare renditions',
            'Confirm the paid backend wallet flow and display backend-derived receipts',
          ].map((step, index) => (
            <div
              className={`make-handoff-step ${
                (index === 0 && sequenceApproved) ||
                (index === 1 && (sequenceApproved || !hasReferenceOnlyLinkedMedia)) ||
                (index > 1 && index < 4 && exportReady)
                  ? 'is-complete'
                  : ''
              }`}
              key={step}
            >
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>

        <div className={`make-export-status make-export-status-${exportState?.status || 'idle'}`}>
          <div className="make-export-status-head">
            <strong>{makeExportStatusLabel(exportState?.status)}</strong>
            <span>{Math.round(exportState?.progressPercent || 0)}%</span>
          </div>
          <div className="make-export-meter" aria-hidden="true">
            <span style={{ width: `${Math.max(0, Math.min(100, exportState?.progressPercent || 0))}%` }} />
          </div>
          {exportState?.detail && <p>{exportState.detail}</p>}
          {exportState?.error && <p className="make-alert make-alert-warning">{exportState.error}</p>}
          {sourceHandle && (
            <p>
              Local source handle: <code>{shortMakeHandle(sourceHandle)}</code>
            </p>
          )}
          {exportState?.result?.outputBytes ? (
            <p>
              MP4 output: {exportState.result.outputFileName || 'make-export.mp4'} · {formatBytes(exportState.result.outputBytes)}
            </p>
          ) : null}
        </div>

        <div className="make-handoff-actions">
          <Button variant="secondary" onClick={() => selectedClip && onDownload(selectedClip)} disabled={!selectedClip || exportBusy}>
            Download selected clip
          </Button>
          <Button variant="secondary" onClick={onCopyPlan} disabled={exportBusy}>
            Copy approved plan
          </Button>
          <Button variant="secondary" onClick={onExportSequence} disabled={!canExportSequence}>
            {exportBusy ? 'Exporting MP4…' : 'Export approved MP4'}
          </Button>
          <Button onClick={onOpenVideo} disabled={!exportReady || exportBusy}>
            Open video page
          </Button>
        </div>

        <p className="make-sequence-help">
          Export is local only. Nothing is minted, uploaded, charged, unlocked, or published until you explicitly continue through Video.
        </p>
      </div>
    </Card>
  );
}
