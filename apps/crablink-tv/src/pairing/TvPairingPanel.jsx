import {
  useRef,
  useState,
} from 'react';
import { invoke } from '@tauri-apps/api/core';

import {
  normalizeTvDeviceName,
  normalizeTvPairingBeginFailure,
  projectTvPairingBeginSuccess,
} from './tvPairingBeginInteraction.js';

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

const INITIAL_BEGIN_STATE = {
  phase: 'idle',
  challengeHandle: null,
  expiresAt: null,
  code: null,
  retryable: false,
};

export function TvPairingPanel({
  onActivity,
}) {
  const [view, setView] =
    useState(INITIAL_VIEW);

  const [checkState, setCheckState] =
    useState('idle');

  const [deviceName, setDeviceName] =
    useState('CrabLink TV');

  const [beginState, setBeginState] =
    useState(INITIAL_BEGIN_STATE);

  const beginInFlightRef =
    useRef(false);

  const beginIsBusy =
    beginState.phase === 'submitting';

  const beginIsWaiting =
    beginState.phase === 'waiting';

  const canBegin =
    view.kind === 'ready' &&
    !beginIsBusy &&
    !beginIsWaiting;

  async function checkPairingReadiness() {
    if (
      checkState === 'checking' ||
      beginIsBusy ||
      beginIsWaiting
    ) {
      return;
    }

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
      setBeginState(INITIAL_BEGIN_STATE);

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

  async function beginPairing() {
    if (beginInFlightRef.current) {
      onActivity?.(
        'A pairing request is already in progress. No duplicate request was sent.',
      );

      return;
    }

    if (view.kind !== 'ready') {
      setBeginState({
        ...INITIAL_BEGIN_STATE,
        phase: 'error',
        code:
          'pairing_readiness_required',
      });

      onActivity?.(
        'Check pairing readiness before requesting a backend challenge.',
      );

      return;
    }

    const normalizedDeviceName =
      normalizeTvDeviceName(deviceName);

    if (!normalizedDeviceName) {
      setBeginState({
        ...INITIAL_BEGIN_STATE,
        phase: 'error',
        code: 'device_name_invalid',
      });

      onActivity?.(
        'The TV name must contain 1–64 UTF-8 bytes and no control characters.',
      );

      return;
    }

    beginInFlightRef.current = true;

    setBeginState({
      ...INITIAL_BEGIN_STATE,
      phase: 'submitting',
    });

    onActivity?.(
      'Requesting a backend-issued pairing challenge. No session has been created.',
    );

    try {
      const rawResponse = await invoke(
        'tv_pairing_begin',
        {
          deviceName:
            normalizedDeviceName,
        },
      );

      const projection =
        projectTvPairingBeginSuccess(
          view.gateway,
          rawResponse,
        );

      if (!projection) {
        setBeginState({
          ...INITIAL_BEGIN_STATE,
          phase: 'error',
          code:
            'pairing_begin_response_invalid',
        });

        onActivity?.(
          'The backend pairing response failed closed. No challenge or session was accepted.',
        );

        return;
      }

      setView(projection.view);

      setBeginState({
        phase: 'waiting',
        challengeHandle:
          projection.response
            .challengeHandle,
        expiresAt:
          projection.response.expiresAt,
        code: null,
        retryable: false,
      });

      onActivity?.(
        `${projection.view.title}. ${projection.view.message}`,
      );
    } catch (error) {
      const failure =
        normalizeTvPairingBeginFailure(
          error,
        );

      setBeginState({
        phase: 'error',
        challengeHandle: null,
        expiresAt: null,
        code: failure.code,
        retryable:
          failure.retryable,
      });

      onActivity?.(
        failure.retryable
          ? 'The pairing request is temporarily unavailable and may be retried. No session was created.'
          : 'The pairing request was rejected. No challenge or session was accepted.',
      );
    } finally {
      beginInFlightRef.current = false;
    }
  }

  return (
    <section
      className="tv-pairing-panel"
      aria-labelledby="tv-pairing-title"
    >
      <div className="tv-section-heading">
        <p className="tv-card-label">
          Passport TV authorization
        </p>

        <h2 id="tv-pairing-title">
          Link this TV without moving account authority here
        </h2>

        <p className="tv-pairing-intro">
          Pairing must be issued by the reviewed CrabLink
          gateway and authorized from a root-capable desktop or
          mobile root-admin device. The television does not
          generate its own approval, wallet key, password, or
          confirmed session.
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

          {beginState.expiresAt ? (
            <p className="tv-pairing-expiry">
              Challenge expires:{' '}
              <strong>
                {beginState.expiresAt}
              </strong>
            </p>
          ) : null}

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

      <div className="tv-pairing-form">
        <label
          className="tv-pairing-field"
          htmlFor="tv-pairing-device-name"
        >
          <span>TV name</span>

          <input
            id="tv-pairing-device-name"
            type="text"
            value={deviceName}
            maxLength={64}
            autoComplete="off"
            spellCheck="false"
            disabled={
              beginIsBusy ||
              beginIsWaiting
            }
            data-tv-focusable="true"
            data-tv-focus-key="pairing-device-name"
            onChange={(event) => {
              setDeviceName(
                event.target.value,
              );
            }}
          />

          <small>
            Sent only as the display name for this backend
            pairing request.
          </small>
        </label>

        {beginState.phase === 'error' ? (
          <p
            className="tv-pairing-feedback tv-pairing-feedback--error"
            role="status"
          >
            Pairing request failed closed:{' '}
            <strong>
              {beginState.code}
            </strong>
            {beginState.retryable
              ? ' — retry is allowed.'
              : ' — retry requires a new user action.'}
          </p>
        ) : null}

        {beginState.phase === 'waiting' ? (
          <p
            className="tv-pairing-feedback"
            role="status"
          >
            Public pairing request accepted. Verify the code
            on a root-admin CrabLink device. A TV session does not
            exist yet.
          </p>
        ) : null}
      </div>

      <div className="tv-hero-actions">
        <button
          className="tv-action tv-action--primary"
          type="button"
          data-tv-focusable="true"
          data-tv-focus-key="pairing-readiness"
          disabled={
            checkState === 'checking' ||
            beginIsBusy ||
            beginIsWaiting
          }
          onClick={checkPairingReadiness}
        >
          {checkState === 'checking'
            ? 'Checking…'
            : 'Check pairing readiness'}
        </button>

        <button
          className="tv-action tv-action--primary"
          type="button"
          data-tv-focusable="true"
          data-tv-focus-key="pairing-begin"
          disabled={!canBegin}
          onClick={beginPairing}
        >
          {beginIsBusy
            ? 'Requesting challenge…'
            : beginIsWaiting
              ? 'Waiting for approval'
              : 'Request pairing code'}
        </button>

        <button
          className="tv-action tv-action--secondary"
          type="button"
          data-tv-focusable="true"
          data-tv-focus-key="pairing-contract"
          onClick={() => {
            onActivity?.(
              'Pairing authorization must come from a root-admin CrabLink device. No recovery phrase, root key, wallet key, operator credential, reward authority, or ledger authority may enter the TV.',
            );
          }}
        >
          Review pairing security
        </button>
      </div>
    </section>
  );
}
