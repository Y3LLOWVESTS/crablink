/**
 * RO:WHAT — Local sequence playback layer for crab://make preview.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; extracts video playback overlay from MakePage.
 * RO:INTERACTS — MakePage.jsx, makeTimelineModel.js, local sequence preview state.
 * RO:INVARIANTS — local playback only; no backend asset truth; no wallet/ledger mutation; no fake receipts/CIDs.
 * RO:METRICS — none.
 * RO:CONFIG — local clip trim/effect playback state.
 * RO:SECURITY — no private paths, capabilities, balances, receipt truth, or spend authority.
 * RO:TEST — npm run build; manual crab://make sequence play/pause/restart smoke.
 */

import { useEffect, useRef, useState } from 'react';

import {
  getClipTrimEndMs,
  getClipTrimStartMs,
  timelineEffectCssFilter,
  timelinePreviewTimeReachedEnd,
} from './makeTimelineModel.js';

function sequenceStatusLabel(status) {
  if (status === 'approved') return 'Approved';
  if (status === 'reviewed') return 'Review complete';
  if (status === 'playing') return 'Playing';
  if (status === 'paused') return 'Paused';
  if (status === 'draft') return 'Needs review';
  return 'No sequence';
}

function settleSequenceVideoSeek(video, seconds) {
  return new Promise((resolve) => {
    if (!video || !Number.isFinite(seconds)) {
      resolve();
      return;
    }

    const target = Math.max(0, seconds);
    const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;

    if (Math.abs(current - target) <= 0.025) {
      resolve();
      return;
    }

    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener('seeked', finish);
      video.removeEventListener('timeupdate', finish);
      video.removeEventListener('canplay', finish);
      video.removeEventListener('error', finish);
    };

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve();
    };

    const timer = window.setTimeout(finish, 700);

    video.addEventListener('seeked', finish, { once: true });
    video.addEventListener('timeupdate', finish, { once: true });
    video.addEventListener('canplay', finish, { once: true });
    video.addEventListener('error', finish, { once: true });

    try {
      video.currentTime = target;
    } catch (_error) {
      finish();
    }
  });
}

async function prepareSequenceVideoForClipStart(video, clip = null) {
  if (!video) {
    return;
  }

  const trimStartMs = clip ? getClipTrimStartMs(clip) : 0;
  const trimEndMs = clip ? getClipTrimEndMs(clip) : 0;
  const targetSeconds = Number.isFinite(trimStartMs) ? Math.max(0, trimStartMs / 1000) : 0;
  const endSeconds =
    Number.isFinite(trimEndMs) && trimEndMs > 0 ? trimEndMs / 1000 : Number.POSITIVE_INFINITY;
  const currentSeconds = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  const atOrPastEnd =
    Number.isFinite(endSeconds) && currentSeconds >= Math.max(targetSeconds, endSeconds - 0.04);
  const beforeStart = currentSeconds + 0.04 < targetSeconds;
  const awayFromStart = Math.abs(currentSeconds - targetSeconds) > 0.06;

  if (atOrPastEnd || beforeStart || awayFromStart) {
    await settleSequenceVideoSeek(video, targetSeconds);
  }
}

export default function MakePreviewPlaybackLayer({
  currentClip,
  nextClip,
  onEnded,
  onPause,
  onRestart,
  onTimeUpdate,
  onReady,
  sequenceState,
  sequenceVideoRef,
}) {
  const [readyClipId, setReadyClipId] = useState('');
  const [snapshotClipKey, setSnapshotClipKey] = useState('');
  const readyClipRef = useRef('');
  const snapshotCanvasRef = useRef(null);
  const status = sequenceState?.status || 'idle';
  const visible = Boolean(currentClip && ['playing', 'paused', 'reviewed', 'approved'].includes(status));
  const currentClipKey = currentClip ? `${currentClip.id || ''}:${currentClip.objectUrl || ''}` : '';
  const nextClipKey = nextClip ? `${nextClip.id || ''}:${nextClip.objectUrl || ''}` : '';
  const videoReady = Boolean(currentClipKey && readyClipId === currentClipKey);
  const snapshotVisible = Boolean(snapshotClipKey && (!videoReady || snapshotClipKey !== currentClipKey));

  useEffect(() => {
    readyClipRef.current = '';
    setReadyClipId('');
  }, [currentClipKey]);

  useEffect(() => {
    if (!videoReady || !snapshotClipKey) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSnapshotClipKey('');
    }, 180);

    return () => window.clearTimeout(timer);
  }, [snapshotClipKey, videoReady]);

  if (!visible) {
    return null;
  }

  const markReady = (event) => {
    if (readyClipRef.current === currentClipKey) {
      return;
    }

    readyClipRef.current = currentClipKey;
    setReadyClipId(currentClipKey);
    onReady?.(event, currentClip);
  };

  const capturePlaybackSnapshot = (video) => {
    const canvas = snapshotCanvasRef.current;
    if (!canvas || !video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return;
    }

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      setSnapshotClipKey(currentClipKey);
    } catch (_error) {
      // Best-effort local transition polish; playback must continue even if frame capture fails.
    }
  };

  const prepareThenMarkReady = (event) => {
    prepareSequenceVideoForClipStart(event.currentTarget, currentClip)
      .then(() => markReady(event))
      .catch(() => markReady(event));
  };

  const handleLayerTimeUpdate = (event) => {
    const video = event.currentTarget;

    if (timelinePreviewTimeReachedEnd(video, currentClip)) {
      capturePlaybackSnapshot(video);
    }

    onTimeUpdate(event, currentClip);
  };

  const handleLayerEnded = () => {
    capturePlaybackSnapshot(sequenceVideoRef.current);
    onEnded(currentClip);
  };

  const shouldPreloadNext = Boolean(nextClip?.objectUrl && nextClipKey && nextClipKey !== currentClipKey);

  return (
    <div
      className={`make-preview-playback-layer is-${status} ${videoReady ? 'is-ready' : 'is-loading'} ${snapshotVisible ? 'has-snapshot' : ''}`}
      aria-label="Local sequence playback in preview"
      data-current-clip-id={currentClip?.id || ''}
    >
      <canvas
        ref={snapshotCanvasRef}
        className={`make-preview-playback-snapshot ${snapshotVisible ? 'is-visible' : ''}`}
        aria-hidden="true"
      />

      <video
        key={currentClipKey || currentClip.id || currentClip.objectUrl}
        ref={sequenceVideoRef}
        className={`make-preview-playback-video ${videoReady ? 'is-ready' : 'is-loading'}`}
        data-sequence-clip-id={currentClip?.id || ''}
        src={currentClip.objectUrl}
        playsInline
        preload="auto"
        style={{ filter: timelineEffectCssFilter(currentClip.timelineEffect) }}
        onEnded={handleLayerEnded}
        onLoadedMetadata={prepareThenMarkReady}
        onLoadedData={markReady}
        onCanPlay={markReady}
        onPlaying={markReady}
        onTimeUpdate={handleLayerTimeUpdate}
      />

      {shouldPreloadNext && (
        <video
          key={`preload-${nextClipKey}`}
          className="make-preview-playback-preload"
          src={nextClip.objectUrl}
          preload="auto"
          muted
          playsInline
          aria-hidden="true"
          tabIndex={-1}
        />
      )}

      <div className="make-preview-playback-status">
        <span>{sequenceStatusLabel(status)}</span>
        <strong>{currentClip.name || 'Selected clip'}</strong>
      </div>

      <div className="make-preview-playback-actions" aria-label="Playback controls">
        <button type="button" onClick={onPause} disabled={status !== 'playing'}>
          Pause
        </button>
        <button type="button" onClick={onRestart}>
          Restart
        </button>
      </div>
    </div>
  );
}
