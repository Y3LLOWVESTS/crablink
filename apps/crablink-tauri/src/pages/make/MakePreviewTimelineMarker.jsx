/**
 * RO:WHAT — Display-only timeline marker preview layer for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps preview chrome smaller before timeline behavior fixes.
 * RO:INTERACTS — MakePreviewStudioChrome.jsx, makeTimelineModel.js, makeSequenceModel.js.
 * RO:INVARIANTS — local preview only; no backend asset truth; no wallet/ledger mutation; no fake receipts/CIDs.
 * RO:METRICS — none.
 * RO:CONFIG — local timeline marker and clip trim display state.
 * RO:SECURITY — no private paths, capabilities, balances, receipt truth, or spend authority.
 * RO:TEST — npm run build; manual crab://make I-marker/range-loop preview smoke.
 */

import {
  getClipTrimStartMs,
  timelineEffectCssFilter,
} from './makeTimelineModel.js';
import {
  formatTimelinePreciseTimeMs,
  getTimelineAbsolutePositionMs,
} from './makeSequenceModel.js';

export default function MakePreviewTimelineMarker({
  clips = [],
  onSeekTimelinePreviewVideo,
  onTimelinePreviewTimeUpdate,
  timelineLoopPlaying,
  timelinePreview,
  timelinePreviewActive,
  timelinePreviewClip,
  timelinePreviewVideoRef,
}) {
  if (!timelinePreviewActive || !timelinePreviewClip) {
    return null;
  }

  const trimStartMs = getClipTrimStartMs(timelinePreviewClip);
  const previewStatus = timelinePreview?.status || '';
  const previewStartMs = Number(timelinePreview?.startMs || trimStartMs);
  const previewFocusMs = Number(timelinePreview?.focusMs || trimStartMs);
  const previewTargetMs = previewStatus === 'looping' ? previewStartMs : previewFocusMs;
  const markerTimeLabel = timelineLoopPlaying
    ? `${formatTimelinePreciseTimeMs(timelinePreview?.startMs || 0)} – ${formatTimelinePreciseTimeMs(timelinePreview?.endMs || 0)}`
    : formatTimelinePreciseTimeMs(getTimelineAbsolutePositionMs(
        clips,
        timelinePreviewClip.id,
        previewFocusMs,
      ));

  const seekPreview = (targetMs, options = {}) => {
    onSeekTimelinePreviewVideo?.(targetMs, options);
  };

  return (
    <div
      className={`make-preview-marker-layer ${timelineLoopPlaying ? 'is-looping' : 'is-frame-preview'}`}
      aria-label="Timeline marker preview"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <video
        key={`${timelinePreviewClip.id || ''}:${timelinePreviewClip.objectUrl || ''}`}
        ref={timelinePreviewVideoRef}
        className="make-preview-marker-video"
        src={timelinePreviewClip.objectUrl}
        playsInline
        preload="auto"
        style={{ filter: timelineEffectCssFilter(timelinePreviewClip.timelineEffect) }}
        onLoadedMetadata={() => {
          seekPreview(previewTargetMs, { play: previewStatus === 'looping' });
        }}
        onLoadedData={() => {
          if (previewStatus !== 'looping') {
            seekPreview(previewFocusMs);
          }
        }}
        onTimeUpdate={onTimelinePreviewTimeUpdate}
        onEnded={() => {
          if (previewStatus === 'looping') {
            seekPreview(previewStartMs, { play: true });
          }
        }}
      />

      <div className="make-preview-marker-status">
        <span>{timelineLoopPlaying ? 'Looping range' : 'I-marker preview'}</span>
        <strong>{timelinePreviewClip.name || 'Selected clip'}</strong>
        <small>{markerTimeLabel}</small>
      </div>
    </div>
  );
}
