import React, {
  useRef,
} from 'react';

import {
  projectTvVerifiedVideoPlayback,
} from './tvVerifiedVideoPlaybackModel.js';

export function TvVerifiedVideoPlaybackSurface({
  sourceProjection,
  videoElementSource,
  onBack,
  onControl,
  className = '',
}) {
  const videoRef = useRef(null);

  const player =
    projectTvVerifiedVideoPlayback({
      sourceProjection,
      videoElementSource,
    });

  const handleControl = (control) => {
    const videoElement = videoRef.current;

    if (control.control === 'back') {
      if (typeof onBack === 'function') {
        onBack(player);
      }

      return;
    }

    if (!control.enabled || !videoElement) {
      return;
    }

    if (control.control === 'play') {
      const playResult = videoElement.play();

      if (
        playResult &&
        typeof playResult.catch === 'function'
      ) {
        playResult.catch(() => {});
      }
    }

    if (control.control === 'pause') {
      videoElement.pause();
    }

    if (control.control === 'seek-backward') {
      videoElement.currentTime =
        Math.max(0, videoElement.currentTime - 30);
    }

    if (control.control === 'seek-forward') {
      videoElement.currentTime =
        Math.min(
          videoElement.duration || videoElement.currentTime + 30,
          videoElement.currentTime + 30,
        );
    }

    if (
      control.control === 'fullscreen' &&
      typeof videoElement.requestFullscreen === 'function'
    ) {
      videoElement.requestFullscreen();
    }

    if (typeof onControl === 'function') {
      onControl(control.control, player);
    }
  };

  return (
    <section
      className={
        [
          'tv-verified-video-playback-surface',
          className,
        ].filter(Boolean).join(' ')
      }
      data-video-playback-state={player.state}
      data-video-player-attached={String(player.videoElementAttached)}
      data-autoplay-allowed={String(player.autoplayAllowed)}
      aria-label="Verified video playback"
    >
      <header className="tv-verified-video-playback-surface__header">
        <p className="tv-eyebrow">Verified video</p>
        <h2>{player.statusLabel}</h2>
        <p>{player.truthLabel}</p>
      </header>

      {player.problem ? (
        <div
          className="tv-verified-video-playback-surface__problem"
          role="status"
        >
          <strong>{player.problem.code}</strong>
          <span>{player.problem.message}</span>
        </div>
      ) : null}

      {player.state === 'ready' ? (
        <video
          ref={videoRef}
          className="tv-verified-video-playback-surface__video"
          data-crablink-video-player="verified"
          src={player.videoElementSource}
          preload="metadata"
          playsInline
          controls={false}
          aria-label="Verified CrabLink video"
        />
      ) : null}

      <div
        className="tv-verified-video-playback-surface__controls"
        aria-label="Verified video controls"
      >
        {player.controls.map((control) => (
          <button
            key={control.control}
            type="button"
            data-remote-control={control.control}
            disabled={!control.enabled}
            aria-disabled={!control.enabled}
            onClick={() => handleControl(control)}
          >
            {control.label}
          </button>
        ))}
      </div>

      <dl className="tv-verified-video-playback-surface__facts">
        <div>
          <dt>Type</dt>
          <dd>{player.contentType || 'unknown'}</dd>
        </div>
        <div>
          <dt>Length</dt>
          <dd>{player.contentLength}</dd>
        </div>
        <div>
          <dt>Handle</dt>
          <dd>{player.mediaHandleId || 'none'}</dd>
        </div>
      </dl>
    </section>
  );
}

export default TvVerifiedVideoPlaybackSurface;
