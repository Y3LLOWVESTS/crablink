import React, {
  useRef,
} from 'react';

import {
  projectTvVerifiedAudioPlayback,
} from './tvVerifiedAudioPlaybackModel.js';

export function TvVerifiedAudioPlaybackSurface({
  sourceProjection,
  audioElementSource,
  onBack,
  onControl,
  className = '',
}) {
  const audioRef = useRef(null);

  const player =
    projectTvVerifiedAudioPlayback({
      sourceProjection,
      audioElementSource,
    });

  const handleControl = (control) => {
    const audioElement = audioRef.current;

    if (control.control === 'back') {
      if (typeof onBack === 'function') {
        onBack(player);
      }

      return;
    }

    if (!control.enabled || !audioElement) {
      return;
    }

    if (control.control === 'play') {
      const playResult = audioElement.play();

      if (
        playResult &&
        typeof playResult.catch === 'function'
      ) {
        playResult.catch(() => {});
      }
    }

    if (control.control === 'pause') {
      audioElement.pause();
    }

    if (control.control === 'seek-backward') {
      audioElement.currentTime =
        Math.max(0, audioElement.currentTime - 30);
    }

    if (control.control === 'seek-forward') {
      audioElement.currentTime =
        Math.min(
          audioElement.duration || audioElement.currentTime + 30,
          audioElement.currentTime + 30,
        );
    }

    if (typeof onControl === 'function') {
      onControl(control.control, player);
    }
  };

  return (
    <section
      className={
        [
          'tv-verified-audio-playback-surface',
          className,
        ].filter(Boolean).join(' ')
      }
      data-audio-playback-state={player.state}
      data-audio-player-attached={String(player.audioElementAttached)}
      data-autoplay-allowed={String(player.autoplayAllowed)}
      aria-label="Verified audio playback"
    >
      <header className="tv-verified-audio-playback-surface__header">
        <p className="tv-eyebrow">Verified audio</p>
        <h2>{player.statusLabel}</h2>
        <p>{player.truthLabel}</p>
      </header>

      {player.problem ? (
        <div
          className="tv-verified-audio-playback-surface__problem"
          role="status"
        >
          <strong>{player.problem.code}</strong>
          <span>{player.problem.message}</span>
        </div>
      ) : null}

      {player.state === 'ready' ? (
        <audio
          ref={audioRef}
          className="tv-verified-audio-playback-surface__audio"
          data-crablink-audio-player="verified"
          src={player.audioElementSource}
          preload="metadata"
          controls={false}
          aria-label="Verified CrabLink audio"
        />
      ) : null}

      <div
        className="tv-verified-audio-playback-surface__controls"
        aria-label="Verified audio controls"
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

      <dl className="tv-verified-audio-playback-surface__facts">
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

export default TvVerifiedAudioPlaybackSurface;
