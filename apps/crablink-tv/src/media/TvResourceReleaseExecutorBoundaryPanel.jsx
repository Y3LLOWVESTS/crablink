import React from 'react';

import {
  projectTvResourceReleaseExecutorBoundary,
} from './tvResourceReleaseExecutorBoundaryModel.js';

export function TvResourceReleaseExecutorBoundaryPanel({
  lifecycleView,
  onExecutorReady,
  className = '',
}) {
  const boundary =
    projectTvResourceReleaseExecutorBoundary({
      lifecycleView,
    });

  const handleExecutorReady = () => {
    if (
      boundary.executorBoundaryReady !== true ||
      typeof onExecutorReady !== 'function'
    ) {
      return;
    }

    onExecutorReady(boundary);
  };

  return (
    <section
      className={
        [
          'tv-resource-release-executor-boundary-panel',
          className,
        ].filter(Boolean).join(' ')
      }
      data-release-executor-state={boundary.state}
      data-release-executor-operation={boundary.operation}
      data-executor-boundary-ready={String(
        boundary.executorBoundaryReady,
      )}
      data-direct-execution-allowed={String(
        boundary.directExecutionAllowed,
      )}
      data-player-mutation-allowed={String(
        boundary.playerMutationAllowed,
      )}
      data-storage-mutation-allowed={String(
        boundary.storageMutationAllowed,
      )}
      data-handle-release-allowed={String(
        boundary.handleReleaseAllowed,
      )}
      aria-label="Resource release executor boundary"
    >
      <header className="tv-resource-release-executor-boundary-panel__header">
        <p className="tv-eyebrow">Release executor</p>
        <h2>{boundary.statusLabel}</h2>
        <p>{boundary.mediaHandleId || 'No media handle selected.'}</p>
      </header>

      {boundary.problem ? (
        <div
          className="tv-resource-release-executor-boundary-panel__problem"
          role="status"
        >
          <strong>{boundary.problem.code}</strong>
          <span>{boundary.problem.message}</span>
        </div>
      ) : null}

      <ol className="tv-resource-release-executor-boundary-panel__commands">
        {boundary.commandQueue.map((command) => (
          <li
            key={`${command.ordinal}-${command.command}`}
            data-executor-command={command.command}
            data-lifecycle-step={command.lifecycleStep}
            data-direct-effect-allowed={String(
              command.directEffectAllowed,
            )}
          >
            {command.command}
          </li>
        ))}
      </ol>

      <dl className="tv-resource-release-executor-boundary-panel__facts">
        <div>
          <dt>Commands</dt>
          <dd>{boundary.commandCount}</dd>
        </div>
        <div>
          <dt>Reason</dt>
          <dd>{boundary.releaseReason || 'none'}</dd>
        </div>
        <div>
          <dt>User gesture</dt>
          <dd>{String(boundary.userGestureRequired)}</dd>
        </div>
      </dl>

      <button
        type="button"
        data-remote-control="queue-release-executor"
        disabled={!boundary.executorBoundaryReady}
        aria-disabled={!boundary.executorBoundaryReady}
        onClick={handleExecutorReady}
      >
        Queue release executor
      </button>
    </section>
  );
}

export default TvResourceReleaseExecutorBoundaryPanel;
