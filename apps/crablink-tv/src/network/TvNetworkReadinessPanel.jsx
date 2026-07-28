/**
 * RO:WHAT — Shows redacted gateway posture and manual health-check truth.
 * RO:WHY — TV users need visible readiness and retry without endpoint disclosure.
 * RO:INTERACTS — readiness hook, settings panel, TV styles.
 * RO:INVARIANTS — fixed manual check; visible dev warning; no polling or fake health.
 * RO:SECURITY — renders sanitized labels and findings only; no raw URL or authority.
 * RO:TEST — interaction tests and network/settings/focus boundary scripts.
 */

import {
  useTvNetworkReadiness,
} from './useTvNetworkReadiness.js';

const PROFILE_LABELS = Object.freeze({
  'release-https':
    'Managed HTTPS',
  'development-lan':
    'Development LAN',
  unconfigured:
    'Unconfigured',
  invalid:
    'Invalid',
});

function timeoutLabel(value) {
  return Number.isInteger(value)
    ? `${value} ms`
    : 'Unavailable';
}

export function TvNetworkReadinessPanel({
  onActivity,
}) {
  const {
    view,
    checking,
    manualCheckAttempted,
    checkConnection,
  } = useTvNetworkReadiness();

  const profileLabel =
    PROFILE_LABELS[
      view.environmentProfile
    ] ?? 'Unavailable';

  const buttonLabel = checking
    ? 'Checking connection…'
    : manualCheckAttempted
      ? 'Check again'
      : 'Check connection';

  async function handleCheckConnection() {
    onActivity?.(
      'Reading the redacted native network profile ' +
      'before one manual gateway health check.',
    );

    const nextState =
      await checkConnection();

    onActivity?.(
      `${nextState.view.title}. ${nextState.view.message}`,
    );
  }

  return (
    <section
      className="tv-network-readiness"
      aria-labelledby="tv-network-readiness-title"
      aria-busy={checking}
    >
      <div className="tv-network-readiness-header">
        <div>
          <p className="tv-card-label">
            Gateway readiness
          </p>

          <h3 id="tv-network-readiness-title">
            Controlled network profile
          </h3>
        </div>

        <span
          className={
            view.developmentProfile
              ? 'tv-network-profile-badge tv-network-profile-badge--development'
              : 'tv-network-profile-badge'
          }
        >
          {profileLabel}
        </span>
      </div>

      {view.developmentProfile ? (
        <p className="tv-network-warning">
          Development LAN profile is active. This is a
          visibly marked private-beta configuration, not a
          release endpoint.
        </p>
      ) : null}

      <div className="tv-network-grid">
        <article className="tv-network-card">
          <span className="tv-card-label">
            Native profile
          </span>

          <strong>{view.displayLabel}</strong>

          <dl className="tv-network-facts">
            <div>
              <dt>Environment</dt>
              <dd>{profileLabel}</dd>
            </div>

            <div>
              <dt>Endpoint</dt>
              <dd>
                Hidden by native host ({view.originDisclosure})
              </dd>
            </div>

            <div>
              <dt>Timeout</dt>
              <dd>
                {timeoutLabel(
                  view.requestTimeoutMs,
                )}
              </dd>
            </div>

            <div>
              <dt>Release policy</dt>
              <dd>
                {view.releaseHttpsRequired
                  ? 'HTTPS required'
                  : 'Rejected'}
              </dd>
            </div>
          </dl>
        </article>

        <article
          className={
            `tv-network-card tv-network-status ` +
            `tv-network-status--${view.status}`
          }
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="tv-card-label">
            Health state
          </span>

          <strong>{view.title}</strong>
          <p>{view.message}</p>

          <dl className="tv-network-facts">
            <div>
              <dt>Status</dt>
              <dd>{view.status}</dd>
            </div>

            <div>
              <dt>Finding</dt>
              <dd>
                {view.errorClass ?? 'none'}
              </dd>
            </div>
          </dl>

          {view.retryRecommended ? (
            <p className="tv-network-retry">
              Manual retry is recommended. Automatic polling
              remains disabled.
            </p>
          ) : null}
        </article>
      </div>

      <div className="tv-network-actions">
        <button
          className="tv-action tv-action--primary"
          type="button"
          data-tv-focusable="true"
          data-tv-focus-key="settings-network-check"
          disabled={
            checking || !view.canRetry
          }
          onClick={handleCheckConnection}
        >
          {buttonLabel}
        </button>

        <p>
          A button press performs one settings read followed by
          at most one fixed native GET /healthz operation. No
          background polling is started.
        </p>
      </div>
    </section>
  );
}
