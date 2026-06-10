/**
 * RO:WHAT — Audio lane UI for crab://make preview timeline.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; isolates audio timeline display before drag/drop behavior fixes.
 * RO:INTERACTS — MakePreviewStudioChrome.jsx, makeAudioTimelineModel.js, makeSequenceModel.js.
 * RO:INVARIANTS — local draft audio UI only; no backend rights truth; no wallet/ledger mutation; no fake receipts/CIDs.
 * RO:METRICS — none.
 * RO:CONFIG — local audio offset, trim, volume, mute display state.
 * RO:SECURITY — linked audio remains draft-only; no reuse authorization, payout split, receipt, or ownership truth is created here.
 * RO:TEST — npm run build; manual crab://make audio lane add/move/trim/volume/export smoke.
 */

import {
  formatTimelineClockMs,
  getAudioTrackTimelinePlate,
} from './makeAudioTimelineModel.js';
import { formatDurationMs } from './makeDraftModel.js';
import { clamp } from './makeSequenceModel.js';

export default function MakePreviewAudioLane({
  audioLaneVisualDurationMs = 1,
  audioMoveDrag,
  audioTracks = [],
  audioTrimDrag,
  beginAudioTrackOffsetDrag,
  beginAudioTrackTrimDrag,
  hasAudioTracks = false,
  isRecording = false,
  onOpenLinkedAudioComposer,
  onRemoveAudioTrack,
  onRequestAddAudioTrack,
  onSelectAudioTrack,
  onUpdateAudioTrackTiming,
  onUpdateAudioTrackVolume,
  preparedAudioTracks = [],
  selectedAudioTrack,
  setAudioPreviewNode,
  totalTimelineDurationMs = 0,
}) {
  const selectAudioTrack = (trackId) => {
    if (!trackId) {
      return;
    }

    onSelectAudioTrack?.(trackId);
  };

  return (
    <div className="make-preview-audio-lane" aria-label="Audio timeline lane">
      <div className="make-preview-audio-lane-head">
        <div>
          <span aria-hidden="true">♪</span>
          <strong>Audio lane</strong>
          <small>
            {hasAudioTracks
              ? `${audioTracks.length} draft track${audioTracks.length === 1 ? '' : 's'} · local files mix on export`
              : 'Add local sound or paste an audio link'}
          </small>
        </div>
        <div className="make-preview-audio-actions">
          <button
            type="button"
            onClick={onRequestAddAudioTrack}
            disabled={isRecording}
            title="Add a local audio file"
            aria-label="Add a local audio file"
          >
            + Audio
          </button>
          <button
            type="button"
            onClick={onOpenLinkedAudioComposer}
            disabled={isRecording}
            title="Paste a crab:// audio or music reuse link"
            aria-label="Paste a crab:// audio or music reuse link"
          >
            🔗 Audio
          </button>
        </div>
      </div>

      {hasAudioTracks ? (
        <>
          <div
            className="make-preview-audio-track-list make-preview-audio-track-list-timeline"
            aria-label="Audio timeline clips"
          >
            {preparedAudioTracks.map((track) => {
              const plate = getAudioTrackTimelinePlate(track, audioLaneVisualDurationMs);
              const maxOffsetMs = Math.max(
                60_000,
                Number(audioLaneVisualDurationMs || totalTimelineDurationMs || 0),
                Number(track.offsetMs || 0) + Math.max(1000, Number(track.effectiveDurationMs || track.durationMs || 0)),
              );
              const audioDurationMs = Math.max(0, Number(track.durationMs || 0));
              const audioTrimStartMs = clamp(Number(track.trimStartMs || 0), 0, audioDurationMs, 0);
              const audioTrimEndMs = clamp(
                Number(track.trimEndMs || audioDurationMs),
                audioTrimStartMs,
                audioDurationMs || audioTrimStartMs,
                audioDurationMs || audioTrimStartMs,
              );
              const audioEffectiveLengthMs = Math.max(0, audioTrimEndMs - audioTrimStartMs);
              const audioCanTrim = track.kind !== 'linked_audio' && audioDurationMs > 100;

              return (
                <div
                  className={`make-preview-audio-track ${track.kind === 'linked_audio' ? 'is-linked' : 'is-local'} ${track.muted ? 'is-muted' : ''} ${audioMoveDrag === track.id ? 'is-moving' : ''} ${audioTrimDrag?.startsWith(`${track.id}:`) ? 'is-trimming' : ''} ${selectedAudioTrack?.id === track.id ? 'is-selected' : ''}`}
                  key={track.id}
                  role="group"
                  tabIndex={0}
                  aria-label={`Audio timeline clip ${track.name || track.displayName || 'audio clip'}`}
                  onPointerDown={() => selectAudioTrack(track.id)}
                  onFocus={() => selectAudioTrack(track.id)}
                  style={{
                    '--make-audio-left-pct': `${plate.leftPct}%`,
                    '--make-audio-width-pct': `${plate.widthPct}%`,
                  }}
                >
                  {track.kind !== 'linked_audio' && track.objectUrl ? (
                    <audio
                      ref={(node) => setAudioPreviewNode?.(track.id, node)}
                      src={track.objectUrl}
                      preload="auto"
                    />
                  ) : null}

                  <span className="make-preview-audio-track-icon" aria-hidden="true">
                    {track.kind === 'linked_audio' ? '🔗' : '♫'}
                  </span>

                  <div className="make-preview-audio-track-main">
                    <strong>{track.name || track.displayName || 'Audio track'}</strong>
                    <small>
                      {track.kind === 'linked_audio'
                        ? `${track.url} · unverified`
                        : `${formatDurationMs(track.effectiveDurationMs || track.durationMs || 0)} · starts ${formatTimelineClockMs(track.offsetMs || 0)} · local only`}
                    </small>

                    <div className="make-preview-audio-timeline-rail">
                      <span
                        className="make-preview-audio-timeline-plate"
                        style={{
                          left: `${plate.leftPct}%`,
                          width: `${plate.widthPct}%`,
                        }}
                      >
                        <button
                          className="make-preview-audio-move-handle"
                          type="button"
                          disabled={isRecording}
                          onPointerDown={(event) => beginAudioTrackOffsetDrag?.(event, track)}
                          title="Drag to move this audio clip on the timeline"
                          aria-label={`Move ${track.name || track.displayName || 'audio clip'} on the audio timeline`}
                        >
                          MOVE
                        </button>
                      </span>
                    </div>

                    {audioCanTrim && selectedAudioTrack?.id === track.id ? (
                      <>
                        <button
                          className="make-preview-audio-trim-handle is-start"
                          type="button"
                          disabled={isRecording}
                          onPointerDown={(event) => beginAudioTrackTrimDrag?.(event, track, 'start')}
                          aria-label={`Trim start of ${track.name || track.displayName || 'audio clip'}`}
                          title="Drag to trim the beginning of this audio clip"
                        />
                        <button
                          className="make-preview-audio-trim-handle is-end"
                          type="button"
                          disabled={isRecording}
                          onPointerDown={(event) => beginAudioTrackTrimDrag?.(event, track, 'end')}
                          aria-label={`Trim end of ${track.name || track.displayName || 'audio clip'}`}
                          title="Drag to trim the end of this audio clip"
                        />
                        <span className="make-preview-audio-trim-hint">Drag audio edges</span>
                      </>
                    ) : null}
                  </div>

                  <div className="make-preview-audio-position">
                    <button
                      type="button"
                      onClick={() => onUpdateAudioTrackTiming?.(track.id, { offsetMs: Math.max(0, Number(track.offsetMs || 0) - 1000) })}
                      title="Move audio one second earlier"
                    >
                      −1s
                    </button>
                    <label>
                      <span>Start {formatTimelineClockMs(track.offsetMs || 0)}</span>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(0, Math.round(maxOffsetMs))}
                        step="100"
                        value={Math.round(Number(track.offsetMs || 0))}
                        onChange={(event) => onUpdateAudioTrackTiming?.(track.id, { offsetMs: Number(event.target.value) })}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => onUpdateAudioTrackTiming?.(track.id, { offsetMs: Math.min(maxOffsetMs, Number(track.offsetMs || 0) + 1000) })}
                      title="Move audio one second later"
                    >
                      +1s
                    </button>
                  </div>

                  {audioCanTrim ? (
                    <label className="make-preview-audio-trim-length">
                      <span>Length {formatTimelineClockMs(audioEffectiveLengthMs)}</span>
                      <input
                        type="range"
                        min="100"
                        max={Math.max(100, audioDurationMs - audioTrimStartMs)}
                        step="100"
                        value={Math.max(100, Math.round(audioEffectiveLengthMs))}
                        onChange={(event) => onUpdateAudioTrackTiming?.(track.id, {
                          trimEndMs: Math.min(audioDurationMs, audioTrimStartMs + Number(event.target.value)),
                        })}
                      />
                    </label>
                  ) : null}

                  <label className="make-preview-audio-volume">
                    <span>Vol</span>
                    <input
                      type="range"
                      min="0"
                      max="150"
                      step="5"
                      value={Math.round(Number(track.volumePct ?? 100))}
                      onChange={(event) => onUpdateAudioTrackVolume?.(track.id, Number(event.target.value))}
                    />
                    <b>{Math.round(Number(track.volumePct ?? 100))}%</b>
                  </label>

                  <button
                    className="make-preview-audio-mute"
                    type="button"
                    onClick={() => onUpdateAudioTrackTiming?.(track.id, { muted: !track.muted })}
                  >
                    {track.muted ? 'Unmute' : 'Mute'}
                  </button>

                  <button
                    className="make-preview-audio-remove"
                    type="button"
                    aria-label={`Remove ${track.name || track.displayName || 'audio track'}`}
                    onClick={() => onRemoveAudioTrack?.(track.id)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {selectedAudioTrack ? (() => {
            const track = selectedAudioTrack;
            const maxOffsetMs = Math.max(
              60_000,
              Number(audioLaneVisualDurationMs || totalTimelineDurationMs || 0),
              Number(track.offsetMs || 0) + Math.max(1000, Number(track.effectiveDurationMs || track.durationMs || 0)),
            );
            const audioDurationMs = Math.max(0, Number(track.durationMs || 0));
            const audioTrimStartMs = clamp(Number(track.trimStartMs || 0), 0, audioDurationMs, 0);
            const audioTrimEndMs = clamp(
              Number(track.trimEndMs || audioDurationMs),
              audioTrimStartMs,
              audioDurationMs || audioTrimStartMs,
              audioDurationMs || audioTrimStartMs,
            );
            const audioEffectiveLengthMs = Math.max(0, audioTrimEndMs - audioTrimStartMs);
            const audioCanTrim = track.kind !== 'linked_audio' && audioDurationMs > 100;

            return (
              <div
                className={`make-preview-audio-controls-panel ${track.kind === 'linked_audio' ? 'is-linked' : 'is-local'}`}
                aria-label={`Audio controls for ${track.name || track.displayName || 'selected audio clip'}`}
              >
                <div className="make-preview-audio-controls-title">
                  <span aria-hidden="true">🎧</span>
                  <strong>{track.name || track.displayName || 'Audio clip'}</strong>
                  <small>
                    {track.kind === 'linked_audio'
                      ? 'linked reference'
                      : `${formatTimelineClockMs(audioEffectiveLengthMs)} selected`}
                  </small>
                </div>

                <label className="make-preview-audio-control make-preview-audio-control-start">
                  <span>Start {formatTimelineClockMs(track.offsetMs || 0)}</span>
                  <input
                    type="range"
                    min="0"
                    max={maxOffsetMs}
                    step="250"
                    value={Math.min(maxOffsetMs, Math.round(Number(track.offsetMs || 0)))}
                    onChange={(event) => onUpdateAudioTrackTiming?.(track.id, {
                      offsetMs: Number(event.target.value),
                    })}
                  />
                </label>

                {audioCanTrim ? (
                  <label className="make-preview-audio-control make-preview-audio-control-length">
                    <span>Length {formatTimelineClockMs(audioEffectiveLengthMs)}</span>
                    <input
                      type="range"
                      min="100"
                      max={Math.max(100, audioDurationMs - audioTrimStartMs)}
                      step="100"
                      value={Math.max(100, Math.round(audioEffectiveLengthMs))}
                      onChange={(event) => onUpdateAudioTrackTiming?.(track.id, {
                        trimEndMs: Math.min(audioDurationMs, audioTrimStartMs + Number(event.target.value)),
                      })}
                    />
                  </label>
                ) : (
                  <div className="make-preview-audio-control make-preview-audio-control-note">
                    <span>Length</span>
                    <strong>{track.kind === 'linked_audio' ? 'Draft reference only' : 'Too short to trim'}</strong>
                  </div>
                )}

                <label className="make-preview-audio-control make-preview-audio-control-volume">
                  <span>Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="5"
                    value={Math.round(Number(track.volumePct ?? 100))}
                    onChange={(event) => onUpdateAudioTrackVolume?.(track.id, Number(event.target.value))}
                  />
                  <strong>{Math.round(Number(track.volumePct ?? 100))}%</strong>
                </label>

                <button
                  className="make-preview-audio-controls-button"
                  type="button"
                  onClick={() => onUpdateAudioTrackTiming?.(track.id, { muted: !track.muted })}
                >
                  {track.muted ? 'Unmute' : 'Mute'}
                </button>

                <button
                  className="make-preview-audio-controls-button is-danger"
                  type="button"
                  onClick={() => onRemoveAudioTrack?.(track.id)}
                  aria-label={`Remove ${track.name || track.displayName || 'audio clip'}`}
                >
                  Remove
                </button>
              </div>
            );
          })() : null}
        </>
      ) : (
        <div className="make-preview-audio-empty">
          <span />
          <strong>No audio lane yet</strong>
          <small>Local audio files can now mix into export. Linked audio references remain draft-only until rights and payout checks are built.</small>
        </div>
      )}
    </div>
  );
}
