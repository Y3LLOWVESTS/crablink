import React from 'react';

import {
  projectTvContinueWatchingResourceTruth,
} from './tvContinueWatchingResourceModel.js';

export function TvContinueWatchingResourcePanel({
  playerView,
  progressEvent,
  onPersistCandidate,
  onReleaseRequested,
  className = '',
}) {
  const truth =
    projectTvContinueWatchingResourceTruth({
      playerView,
      progressEvent,
    });

  const handlePersistCandidate = () => {
    if (
      truth.persistCandidate !== true ||
      typeof onPersistCandidate !== 'function'
    ) {
      return;
    }

    onPersistCandidate(truth);
  };

  const handleReleaseRequested = () => {
    if (
      truth.releaseRequested !== true ||
      typeof onReleaseRequested !== 'function'
    ) {
      return;
    }

    onReleaseRequested(truth);
  };

  return (
    <section
      className={
        [
          'tv-continue-watching-resource-panel',
          className,
        ].filter(Boolean).join(' ')
      }
      data-continue-watching-state={truth.state}
      data-media-kind={truth.mediaKind}
      data-persist-candidate={String(truth.persistCandidate)}
      data-storage-mutation-requested={String(
        truth.storageMutationRequested,
      )}
      data-release-requested={String(truth.releaseRequested)}
      data-release-side-effect-allowed={String(
        truth.releaseSideEffectAllowed,
      )}
      aria-label="Continue watching and resource release"
    >
      <header className="tv-continue-watching-resource-panel__header">
        <p className="tv-eyebrow">Continue watching</p>
        <h2>{truth.statusLabel}</h2>
        <p>{truth.releaseLabel}</p>
      </header>

      {truth.problem ? (
        <div
          className="tv-continue-watching-resource-panel__problem"
          role="status"
        >
          <strong>{truth.problem.code}</strong>
          <span>{truth.problem.message}</span>
        </div>
      ) : null}

      <dl className="tv-continue-watching-resource-panel__facts">
        <div>
          <dt>Position</dt>
          <dd>{truth.positionSeconds}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{truth.durationSeconds}</dd>
        </div>
        <div>
          <dt>Posture</dt>
          <dd>{truth.continueWatchingPosture}</dd>
        </div>
        <div>
          <dt>Release</dt>
          <dd>{truth.releasePosture}</dd>
        </div>
      </dl>

      <div className="tv-continue-watching-resource-panel__actions">
        <button
          type="button"
          data-remote-control="persist-candidate"
          disabled={!truth.persistCandidate}
          aria-disabled={!truth.persistCandidate}
          onClick={handlePersistCandidate}
        >
          Mark resume candidate
        </button>

        <button
          type="button"
          data-remote-control="release-requested"
          disabled={!truth.releaseRequested}
          aria-disabled={!truth.releaseRequested}
          onClick={handleReleaseRequested}
        >
          Mark release requested
        </button>
      </div>
    </section>
  );
}

export default TvContinueWatchingResourcePanel;
