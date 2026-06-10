/**
 * RO:WHAT — Local clip timeline editor card for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; extracts clip timeline rendering from MakePage route state.
 * RO:INTERACTS — MakePage.jsx, makeTimelineModel.js, makeDraftModel.js, MakeSharedControls.jsx.
 * RO:INVARIANTS — local draft timeline edits only; no backend asset truth; no wallet/ledger mutation; no fake receipts/CIDs.
 * RO:METRICS — none.
 * RO:CONFIG — local clip trim/effect/order display state.
 * RO:SECURITY — no private paths, capabilities, balances, receipt truth, or spend authority.
 * RO:TEST — npm run build; manual crab://make clip select/cut/effect/download smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';

import { formatBytes, formatDurationMs } from './makeDraftModel.js';
import { StatPill } from './MakeSharedControls.jsx';
import {
  MAKE_TIMELINE_EFFECTS,
  clipTimelineLabel,
  describeTimelineEdits,
  getClipTimelineDurationMs,
  getClipTrimEndMs,
  getClipTrimStartMs,
  seekVideoToTimelineStart,
  timelineEffectCssFilter,
  timelinePreviewTimeReachedEnd,
} from './makeTimelineModel.js';

export default function MakeTimelineCard({
  canRecord,
  clips,
  isRecording,
  latestClip,
  onClear,
  onDownload,
  onMoveSelected,
  onRecordNext,
  onRemove,
  onReplaceSelected,
  onRetakeLast,
  onSelect,
  onUpdateSelectedTimeline,
  selectedClip,
  selectedClipId,
  totalDurationMs,
}) {
  const selectedIndex = selectedClip ? clips.findIndex((clip) => clip.id === selectedClip.id) : -1;
  const timelineSummary = describeTimelineEdits(clips);
  const selectedTrimStart = selectedClip ? getClipTrimStartMs(selectedClip) : 0;
  const selectedTrimEnd = selectedClip ? getClipTrimEndMs(selectedClip) : 0;
  const selectedDuration = selectedClip?.durationMs || 0;
  const selectedTimelineDuration = selectedClip ? getClipTimelineDurationMs(selectedClip) : 0;

  return (
    <Card
      eyebrow="Timeline"
      title="Clip timeline"
      className="make-timeline-card make-timeline-editor-card"
      actions={
        clips.length ? (
          <div className="make-card-actions">
            <Button variant="secondary" size="sm" onClick={onRetakeLast}>Retake last</Button>
            <Button variant="secondary" size="sm" onClick={onClear}>Clear</Button>
          </div>
        ) : null
      }
    >
      <div className="make-timeline-summary make-timeline-summary-modern">
        <StatPill label="Segments" value={String(clips.length)} />
        <StatPill label="Cut duration" value={formatDurationMs(totalDurationMs)} />
        <StatPill label="Edits" value={timelineSummary.hasEdits ? `${timelineSummary.trimmedCount + timelineSummary.effectedCount}` : '0'} />
        <StatPill label="Storage" value={formatBytes(clips.reduce((sum, clip) => sum + Number(clip.sizeBytes || 0), 0))} />
      </div>

      {clips.length === 0 ? (
        <div className="make-empty-timeline">
          <div className="make-empty-timeline-art">
            <span />
            <span />
            <span />
          </div>
          <strong>No clips recorded yet.</strong>
          <p>Start preview, record a segment, stop, then repeat. Your clip timeline will appear here.</p>
        </div>
      ) : (
        <div className="make-timeline-layout make-timeline-editor-layout">
          <div className="make-timeline-rail-shell" aria-label="Recorded clip timeline">
            <div className="make-timeline-ruler" aria-hidden="true">
              <span>00:00</span>
              <span>{formatDurationMs(totalDurationMs)}</span>
            </div>

            <div className="make-clip-timeline-rail" role="list">
              {clips.map((clip, index) => {
                const selected = clip.id === selectedClipId || (!selectedClipId && clip.id === selectedClip?.id);
                const clipDuration = getClipTimelineDurationMs(clip);
                const flexGrow = Math.max(0.35, clipDuration / Math.max(1, totalDurationMs));
                const trimStartPct = clip.durationMs > 0 ? Math.min(94, Math.max(0, (getClipTrimStartMs(clip) / clip.durationMs) * 100)) : 0;
                const trimEndPct = clip.durationMs > 0 ? Math.min(100, Math.max(trimStartPct, (getClipTrimEndMs(clip) / clip.durationMs) * 100)) : 100;

                return (
                  <button
                    className={`make-timeline-segment ${selected ? 'is-selected' : ''} ${clip.timelineEffect && clip.timelineEffect !== 'none' ? 'has-effect' : ''}`}
                    key={clip.id}
                    type="button"
                    onClick={() => onSelect(clip.id)}
                    style={{ flexGrow }}
                    title={`${clip.name} · ${formatDurationMs(clipDuration)} · ${clipTimelineLabel(clip)}`}
                  >
                    <span className="make-timeline-segment-fill" style={{ left: `${trimStartPct}%`, right: `${Math.max(0, 100 - trimEndPct)}%` }} />
                    <span className="make-timeline-segment-index">{index + 1}</span>
                    <span className="make-timeline-segment-title">{clip.name}</span>
                    <span className="make-timeline-segment-meta">{formatDurationMs(clipDuration)}</span>
                    <span className="make-timeline-segment-edit">{clipTimelineLabel(clip)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedClip && (
            <article className="make-selected-clip make-selected-clip-editor">
              <div className="make-selected-preview-frame">
                <video
                  src={selectedClip.objectUrl}
                  controls
                  preload="metadata"
                  style={{ filter: timelineEffectCssFilter(selectedClip.timelineEffect) }}
                  onLoadedMetadata={(event) => {
                    seekVideoToTimelineStart(event.currentTarget, selectedClip).catch(() => {});
                  }}
                  onTimeUpdate={(event) => {
                    const video = event.currentTarget;
                    if (timelinePreviewTimeReachedEnd(video, selectedClip)) {
                      video.pause();
                    }
                  }}
                />
                <div className="make-selected-preview-badges">
                  <Badge tone="info" uppercase={false}>{clipTimelineLabel(selectedClip)}</Badge>
                  {selectedClip.replacedAt && <Badge tone="success" uppercase={false}>replaced</Badge>}
                </div>
              </div>

              <div className="make-selected-clip-body make-selected-editor-body">
                <div className="make-selected-title-row">
                  <div>
                    <p className="cl-eyebrow">Selected local clip</p>
                    <h3>{selectedIndex + 1}. {selectedClip.name}</h3>
                  </div>
                  <div className="make-timeline-move-row" aria-label="Move selected clip">
                    <Button variant="secondary" size="sm" onClick={() => onMoveSelected(-1)} disabled={selectedIndex <= 0 || isRecording}>
                      ← Move
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => onMoveSelected(1)} disabled={selectedIndex < 0 || selectedIndex >= clips.length - 1 || isRecording}>
                      Move →
                    </Button>
                  </div>
                </div>

                <div className="make-clip-stats">
                  <Badge tone="neutral" uppercase={false}>{selectedClip.mimeType || 'browser blob'}</Badge>
                  <Badge tone="info" uppercase={false}>{formatBytes(selectedClip.sizeBytes)}</Badge>
                  <Badge tone="success" uppercase={false}>{formatDurationMs(selectedTimelineDuration)}</Badge>
                </div>

                <div className="make-timeline-edit-grid">
                  <div className="make-trim-panel">
                    <div className="make-trim-head">
                      <strong>Cut</strong>
                      <span>{formatDurationMs(selectedTrimStart)} → {formatDurationMs(selectedTrimEnd)}</span>
                    </div>
                    <label className="make-range-field">
                      <span>Start</span>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(0, selectedDuration)}
                        step="100"
                        value={selectedTrimStart}
                        onChange={(event) => onUpdateSelectedTimeline({ trimStartMs: Number(event.target.value) })}
                      />
                    </label>
                    <label className="make-range-field">
                      <span>End</span>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(0, selectedDuration)}
                        step="100"
                        value={selectedTrimEnd}
                        onChange={(event) => onUpdateSelectedTimeline({ trimEndMs: Number(event.target.value) })}
                      />
                    </label>
                    <div className="make-trim-actions">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onUpdateSelectedTimeline({ trimStartMs: 0, trimEndMs: selectedDuration })}
                      >
                        Reset cut
                      </Button>
                      <span>Original {formatDurationMs(selectedDuration)}</span>
                    </div>
                  </div>

                  <div className="make-effect-panel">
                    <div className="make-trim-head">
                      <strong>Effect</strong>
                      <span>{clipTimelineLabel(selectedClip)}</span>
                    </div>
                    <div className="make-effect-grid" aria-label="Timeline effects">
                      {MAKE_TIMELINE_EFFECTS.map((effect) => (
                        <button
                          className={`make-effect-button ${selectedClip.timelineEffect === effect.value ? 'is-selected' : ''}`}
                          key={effect.value}
                          type="button"
                          onClick={() => onUpdateSelectedTimeline({ timelineEffect: effect.value })}
                        >
                          <span style={{ filter: effect.filter }}>{effect.shortLabel || effect.label}</span>
                          <small>{effect.copy}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {latestClip?.id === selectedClip.id && (
                  <div className="make-latest-decision">
                    <strong>Latest clip saved.</strong>
                    <span>Keep it, cut it, add a look, record the next segment, or retake it before moving on.</span>
                  </div>
                )}

                <div className="make-button-row make-timeline-action-row">
                  {latestClip?.id === selectedClip.id && (
                    <Button variant="secondary" size="sm" onClick={onRecordNext} disabled={!canRecord || isRecording}>
                      Keep + record next
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={onReplaceSelected} disabled={isRecording}>
                    Replace
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onDownload(selectedClip)}>
                    Download
                  </Button>
                  {latestClip?.id === selectedClip.id ? (
                    <Button variant="secondary" size="sm" onClick={onRetakeLast}>
                      Retake
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => onRemove(selectedClip.id)}>
                      Discard
                    </Button>
                  )}
                </div>

                <p className="make-sequence-help">
                  Timeline cuts and effects are local Make edits. Export renders them into local blobs before Video handles backend minting truth.
                </p>
              </div>
            </article>
          )}
        </div>
      )}
    </Card>
  );
}
