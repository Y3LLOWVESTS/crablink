import React from 'react';

import {
  projectTvPlaybackControlsFocus,
} from './tvPlaybackControlsFocusModel.js';

export function TvPlaybackControlsFocusRail({
  playerView,
  focusRequest,
  onBack,
  onControl,
  className = '',
}) {
  const focus =
    projectTvPlaybackControlsFocus({
      playerView,
      focusRequest,
    });

  const handleControl = (control) => {
    if (control.control === 'back') {
      if (typeof onBack === 'function') {
        onBack(focus);
      }

      return;
    }

    if (
      control.activationAllowed !== true ||
      typeof onControl !== 'function'
    ) {
      return;
    }

    onControl(control.control, focus);
  };

  return (
    <section
      className={
        [
          'tv-playback-controls-focus-rail',
          className,
        ].filter(Boolean).join(' ')
      }
      data-playback-controls-state={focus.state}
      data-media-kind={focus.mediaKind}
      data-focused-control={focus.focusedControl}
      data-remote-focus-enabled={String(focus.remoteFocusEnabled)}
      aria-label="Playback controls"
    >
      <p className="tv-playback-controls-focus-rail__status">
        {focus.statusLabel}
      </p>

      {focus.problem ? (
        <div
          className="tv-playback-controls-focus-rail__problem"
          role="status"
        >
          <strong>{focus.problem.code}</strong>
          <span>{focus.problem.message}</span>
        </div>
      ) : null}

      <div
        className="tv-playback-controls-focus-rail__controls"
        role="group"
        aria-label="Remote playback controls"
      >
        {focus.controls.map((control) => (
          <button
            key={control.control}
            type="button"
            data-remote-control={control.control}
            data-focused={String(control.selected === true)}
            data-activation-allowed={String(
              control.activationAllowed === true,
            )}
            disabled={!control.enabled}
            aria-disabled={!control.enabled}
            onClick={() => handleControl(control)}
          >
            {control.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export default TvPlaybackControlsFocusRail;
