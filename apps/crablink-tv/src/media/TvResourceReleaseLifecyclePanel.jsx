import React from 'react';

import {
  projectTvResourceReleaseLifecycle,
} from './tvResourceReleaseLifecycleModel.js';

export function TvResourceReleaseLifecyclePanel({
  adapterView,
  onLifecycleReady,
  className = '',
}) {
  const lifecycle =
    projectTvResourceReleaseLifecycle({
      adapterView,
    });

  const handleLifecycleReady = () => {
    if (
      lifecycle.releasePlanReady !== true ||
      typeof onLifecycleReady !== 'function'
    ) {
      return;
    }

    onLifecycleReady(lifecycle);
  };

  return (
    <section
      className={
        [
          'tv-resource-release-lifecycle-panel',
          className,
        ].filter(Boolean).join(' ')
      }
      data-release-lifecycle-state={lifecycle.state}
      data-release-reason={lifecycle.releaseReason || 'none'}
      data-release-plan-ready={String(lifecycle.releasePlanReady)}
      data-release-execution-allowed={String(
        lifecycle.releaseExecutionAllowed,
      )}
      data-player-mutation-allowed={String(
        lifecycle.playerMutationAllowed,
      )}
      data-handle-release-allowed={String(
        lifecycle.handleReleaseAllowed,
      )}
      data-storage-flush-side-effect-allowed={String(
        lifecycle.storageFlushSideEffectAllowed,
      )}
      aria-label="Resource release lifecycle"
    >
      <header className="tv-resource-release-lifecycle-panel__header">
        <p className="tv-eyebrow">Resource release</p>
        <h2>{lifecycle.statusLabel}</h2>
        <p>{lifecycle.mediaHandleId || 'No media handle selected.'}</p>
      </header>

      {lifecycle.problem ? (
        <div
          className="tv-resource-release-lifecycle-panel__problem"
          role="status"
        >
          <strong>{lifecycle.problem.code}</strong>
          <span>{lifecycle.problem.message}</span>
        </div>
      ) : null}

      <ol className="tv-resource-release-lifecycle-panel__steps">
        {lifecycle.lifecycleSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <dl className="tv-resource-release-lifecycle-panel__facts">
        <div>
          <dt>Store operation</dt>
          <dd>{lifecycle.storeOperation}</dd>
        </div>
        <div>
          <dt>Flush required</dt>
          <dd>{String(lifecycle.storageFlushRequired)}</dd>
        </div>
        <div>
          <dt>Step count</dt>
          <dd>{lifecycle.lifecycleStepCount}</dd>
        </div>
      </dl>

      <button
        type="button"
        data-remote-control="release-lifecycle-ready"
        disabled={!lifecycle.releasePlanReady}
        aria-disabled={!lifecycle.releasePlanReady}
        onClick={handleLifecycleReady}
      >
        Queue release lifecycle
      </button>
    </section>
  );
}

export default TvResourceReleaseLifecyclePanel;
