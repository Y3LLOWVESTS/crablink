import React from 'react';

import {
  projectTvVerifiedMediaPlaybackSurface,
} from './tvVerifiedMediaPlaybackSurfaceModel.js';

export function TvVerifiedMediaPlaybackSurface({
  playbackView,
  onBack,
  className = '',
}) {
  const surface =
    projectTvVerifiedMediaPlaybackSurface(playbackView);

  const handleControl = (control) => {
    if (control.control === 'back' && typeof onBack === 'function') {
      onBack(surface);
    }
  };

  return (
    <section
      className={
        [
          'tv-verified-media-playback-surface',
          className,
        ].filter(Boolean).join(' ')
      }
      data-playback-state={surface.state}
      data-source-attached={String(surface.sourceAttached)}
      data-player-element-attached={String(surface.playerElementAttached)}
      aria-label="Verified media playback"
    >
      <header className="tv-verified-media-playback-surface__header">
        <p className="tv-eyebrow">Verified media</p>
        <h2>{surface.title}</h2>
        <p>{surface.statusLabel}</p>
      </header>

      {surface.problem ? (
        <div
          className="tv-verified-media-playback-surface__problem"
          role="status"
        >
          <strong>{surface.problem.code}</strong>
          <span>{surface.problem.message}</span>
        </div>
      ) : null}

      <dl className="tv-verified-media-playback-surface__facts">
        {surface.facts.map((fact) => (
          <div
            className="tv-verified-media-playback-surface__fact"
            key={fact.label}
          >
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="tv-verified-media-playback-surface__truth">
        <p>{surface.verificationLabel}</p>
        <p>{surface.sourcePlan}</p>
      </div>

      <div
        className="tv-verified-media-playback-surface__controls"
        aria-label="Playback controls"
      >
        {surface.controls.map((control) => (
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

      <footer className="tv-verified-media-playback-surface__footer">
        Source handoff and player element attach in the next media slices.
      </footer>
    </section>
  );
}

export default TvVerifiedMediaPlaybackSurface;
