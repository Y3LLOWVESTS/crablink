import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

import {
  projectTvPairingView,
} from './tvPairingViewModel.js';

const INITIAL_VIEW = projectTvPairingView(
  {
    state: 'unconfigured',
  },
  {
    state: 'blocked_unconfigured',
    gatewayState: 'unconfigured',
  },
);

export function TvPairingPanel({
  onActivity,
}) {
  const [view, setView] =
    useState(INITIAL_VIEW);

  const [checkState, setCheckState] =
    useState('idle');

  async function checkPairingReadiness() {
    setCheckState('checking');

    onActivity?.(
      'Reading the native gateway and pairing readiness snapshots.',
    );

    try {
      const [
        gateway,
        pairing,
      ] = await Promise.all([
        invoke('tv_gateway_profile'),
        invoke('tv_pairing_status'),
      ]);

      const nextView =
        projectTvPairingView(
          gateway,
          pairing,
        );

      setView(nextView);
      setCheckState('ready');

      onActivity?.(
        `${nextView.title}. ${nextView.message}`,
      );
    } catch {
      setCheckState('browser');

      onActivity?.(
        'Pairing readiness requires the native Tauri host. No pairing state was created.',
      );
    }
  }

  return (
    <section
      className="tv-pairing-panel"
      aria-labelledby="tv-pairing-title"
    >
      <div className="tv-section-heading">
        <p className="tv-card-label">
          Companion pairing
        </p>

        <h2 id="tv-pairing-title">
          Link this TV without moving account authority here
        </h2>

        <p className="tv-pairing-intro">
          Pairing must be issued by the reviewed CrabLink
          gateway and approved from a trusted desktop or mobile
          companion. The television does not generate its own
          approval, wallet key, password, or confirmed session.
        </p>
      </div>

      <div className="tv-pairing-grid">
        <article className="tv-pairing-card">
          <span className="tv-card-label">
            Gateway profile
          </span>

          <strong>
            {view.gateway.state}
          </strong>

          <dl className="tv-pairing-facts">
            <div>
              <dt>Environment</dt>
              <dd>
                {view.gateway.environmentProfile}
              </dd>
            </div>

            <div>
              <dt>Origin</dt>
              <dd>
                {view.gateway.origin ??
                  'Not configured'}
              </dd>
            </div>

            <div>
              <dt>Transport</dt>
              <dd>
                {view.gateway.transport}
              </dd>
            </div>

            <div>
              <dt>Timeout</dt>
              <dd>
                {view.gateway.requestTimeoutMs} ms
              </dd>
            </div>
          </dl>
        </article>

        <article className="tv-pairing-card">
          <span className="tv-card-label">
            Pairing truth
          </span>

          <strong>{view.title}</strong>
          <p>{view.message}</p>

          {view.pairingCode ? (
            <div className="tv-pairing-code">
              {view.pairingCode}
            </div>
          ) : (
            <p className="tv-pairing-empty">
              No short code or QR challenge has been issued.
            </p>
          )}

          <span
            className={
              `tv-pairing-state ` +
              `tv-pairing-state--${view.kind}`
            }
          >
            Session:{' '}
            {view.sessionPresent
              ? 'native confirmation present'
              : 'not confirmed'}
          </span>
        </article>
      </div>

      <div className="tv-hero-actions">
        <button
          className="tv-action tv-action--primary"
          type="button"
          data-tv-focusable="true"
          data-tv-focus-key="pairing-readiness"
          onClick={checkPairingReadiness}
        >
          {checkState === 'checking'
            ? 'Checking…'
            : 'Check pairing readiness'}
        </button>

        <button
          className="tv-action tv-action--secondary"
          type="button"
          data-tv-focusable="true"
          data-tv-focus-key="pairing-contract"
          onClick={() => {
            onActivity?.(
              'Pairing approval must come from a trusted CrabLink companion. No seed phrase, wallet key, operator credential, reward authority, or ledger authority may enter the TV.',
            );
          }}
        >
          Review pairing security
        </button>
      </div>
    </section>
  );
}
