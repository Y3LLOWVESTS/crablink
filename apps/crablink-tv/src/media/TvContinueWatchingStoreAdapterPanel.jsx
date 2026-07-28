import React from 'react';

import {
  projectTvContinueWatchingStoreAdapter,
} from './tvContinueWatchingStoreAdapterModel.js';

export function TvContinueWatchingStoreAdapterPanel({
  resourceTruth,
  onStoreOperation,
  onReleaseOperation,
  className = '',
}) {
  const adapter =
    projectTvContinueWatchingStoreAdapter({
      resourceTruth,
    });

  const handleStoreOperation = () => {
    if (
      adapter.storeWriteRequested !== true ||
      typeof onStoreOperation !== 'function'
    ) {
      return;
    }

    onStoreOperation(adapter);
  };

  const handleReleaseOperation = () => {
    if (
      adapter.releaseRequested !== true ||
      typeof onReleaseOperation !== 'function'
    ) {
      return;
    }

    onReleaseOperation(adapter);
  };

  return (
    <section
      className={
        [
          'tv-continue-watching-store-adapter-panel',
          className,
        ].filter(Boolean).join(' ')
      }
      data-store-adapter-state={adapter.state}
      data-store-operation={adapter.operation}
      data-store-write-requested={String(adapter.storeWriteRequested)}
      data-storage-side-effect-allowed={String(
        adapter.storageSideEffectAllowed,
      )}
      data-adapter-execution-allowed={String(
        adapter.adapterExecutionAllowed,
      )}
      data-release-operation={adapter.releaseOperation}
      data-release-side-effect-allowed={String(
        adapter.releaseSideEffectAllowed,
      )}
      aria-label="Continue watching store adapter"
    >
      <header className="tv-continue-watching-store-adapter-panel__header">
        <p className="tv-eyebrow">Resume adapter</p>
        <h2>{adapter.statusLabel}</h2>
        <p>{adapter.storeKey || 'No store key selected.'}</p>
      </header>

      {adapter.problem ? (
        <div
          className="tv-continue-watching-store-adapter-panel__problem"
          role="status"
        >
          <strong>{adapter.problem.code}</strong>
          <span>{adapter.problem.message}</span>
        </div>
      ) : null}

      <dl className="tv-continue-watching-store-adapter-panel__facts">
        <div>
          <dt>Operation</dt>
          <dd>{adapter.operation}</dd>
        </div>
        <div>
          <dt>Position</dt>
          <dd>{adapter.positionSeconds}</dd>
        </div>
        <div>
          <dt>Progress</dt>
          <dd>{adapter.progressRatio}</dd>
        </div>
        <div>
          <dt>Release</dt>
          <dd>{adapter.releaseOperation}</dd>
        </div>
      </dl>

      <div className="tv-continue-watching-store-adapter-panel__actions">
        <button
          type="button"
          data-remote-control="queue-store-operation"
          disabled={!adapter.storeWriteRequested}
          aria-disabled={!adapter.storeWriteRequested}
          onClick={handleStoreOperation}
        >
          Queue store operation
        </button>

        <button
          type="button"
          data-remote-control="queue-release-operation"
          disabled={!adapter.releaseRequested}
          aria-disabled={!adapter.releaseRequested}
          onClick={handleReleaseOperation}
        >
          Queue release operation
        </button>
      </div>
    </section>
  );
}

export default TvContinueWatchingStoreAdapterPanel;
