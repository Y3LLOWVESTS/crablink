import React from 'react';

import {
  projectTvMediaErrorRetryTruth,
} from './tvMediaErrorRetryTruthModel.js';

export function TvMediaErrorRetryTruthPanel({
  playerView,
  focusView,
  mediaEvent,
  onRetry,
  className = '',
}) {
  const truth =
    projectTvMediaErrorRetryTruth({
      playerView,
      focusView,
      mediaEvent,
    });

  const handleRetry = () => {
    if (
      truth.retryAllowed !== true ||
      truth.userRetryRequired !== true ||
      typeof onRetry !== 'function'
    ) {
      return;
    }

    onRetry(truth);
  };

  return (
    <section
      className={
        [
          'tv-media-error-retry-truth-panel',
          className,
        ].filter(Boolean).join(' ')
      }
      data-media-error-state={truth.state}
      data-media-kind={truth.mediaKind}
      data-retry-allowed={String(truth.retryAllowed)}
      data-retry-posture={truth.retryPosture}
      data-automatic-retry-allowed={String(
        truth.automaticRetryAllowed,
      )}
      aria-label="Media playback status"
    >
      <header className="tv-media-error-retry-truth-panel__header">
        <p className="tv-eyebrow">Playback status</p>
        <h2>{truth.statusLabel}</h2>
        <p>{truth.retryLabel}</p>
      </header>

      {truth.problem ? (
        <div
          className="tv-media-error-retry-truth-panel__problem"
          role="status"
        >
          <strong>{truth.problem.code}</strong>
          <span>{truth.problem.message}</span>
        </div>
      ) : null}

      <dl className="tv-media-error-retry-truth-panel__facts">
        <div>
          <dt>Event</dt>
          <dd>{truth.eventKind || 'none'}</dd>
        </div>
        <div>
          <dt>Error</dt>
          <dd>{truth.errorCode || 'none'}</dd>
        </div>
        <div>
          <dt>Retries</dt>
          <dd>
            {truth.retryCount} / {truth.maxRetries}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        data-remote-control="retry"
        data-retry-control={truth.retryControl || 'none'}
        disabled={!truth.retryAllowed}
        aria-disabled={!truth.retryAllowed}
        onClick={handleRetry}
      >
        Retry playback
      </button>
    </section>
  );
}

export default TvMediaErrorRetryTruthPanel;
