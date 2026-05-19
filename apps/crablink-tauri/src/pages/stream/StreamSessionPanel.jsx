/**
 * RO:WHAT — Stream session status panel for the local stream control room.
 * RO:WHY — Adds launch/stop controls for a local room before backend stream routes exist.
 * RO:INTERACTS — StreamPage, StreamLocalPreview, StreamPricingPanel, Tauri local stream commands.
 * RO:INVARIANTS — no fake backend live status; no fake viewer count; no fake revenue; no receipt; no wallet mutation.
 * RO:METRICS — none; future session routes need stream/status/payment metrics.
 * RO:CONFIG — reads local draft and preview state only.
 * RO:SECURITY — no ingest token, stream key, capability, or receipt data is displayed or invented.
 * RO:TEST — manual crab://stream launch/stop smoke.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  buildBackendLaunchRequestPreview,
  getLocalStreamSession,
  startLocalStreamSession,
  stopLocalStreamSession,
} from '../../shared/api/streamSessionClient.js';
import { labelFromSnake } from './streamDraftModel.js';

export default function StreamSessionPanel({ draft, previewState, pricing }) {
  const [localSession, setLocalSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [copyState, setCopyState] = useState('');

  const previewActive = previewState.status === 'previewing';

  const launchPreview = useMemo(
    () => buildBackendLaunchRequestPreview({ draft, previewState, pricing }),
    [draft, previewState, pricing],
  );

  useEffect(() => {
    let cancelled = false;

    getLocalStreamSession()
      .then((session) => {
        if (!cancelled) {
          setLocalSession(session || null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocalSession(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function onStartLocalRoom() {
    setBusy(true);
    setProblem('');
    setCopyState('');

    try {
      const session = await startLocalStreamSession({ draft, previewState, pricing });
      setLocalSession(session);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error || 'Unable to launch local stream room.'));
    } finally {
      setBusy(false);
    }
  }

  async function onStopLocalRoom() {
    setBusy(true);
    setProblem('');
    setCopyState('');

    try {
      await stopLocalStreamSession('Stopped by creator from StreamSessionPanel');
      setLocalSession(null);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error || 'Unable to stop local stream room.'));
    } finally {
      setBusy(false);
    }
  }

  async function copyBackendLaunchPreview() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(launchPreview, null, 2));
      setCopyState('Copied backend launch request preview');
    } catch (_error) {
      setCopyState('Clipboard unavailable in this WebView');
    }

    window.setTimeout(() => setCopyState(''), 2200);
  }

  const localActive = Boolean(localSession);

  return (
    <section className="cl-stream-panel cl-stream-session-panel" aria-label="Stream session status">
      <p className="cl-eyebrow">Session control</p>
      <h2>{localActive ? 'Local room launched' : 'Ready to launch local room'}</h2>
      <p>
        This creates a local Tauri session marker for the control room only. It does not create a
        backend stream, b3 address, crab URL, viewer entitlement, receipt, or ROC transfer.
      </p>

      <div className="cl-stream-session-status">
        <Status
          label="Local preview"
          value={previewActive ? previewState.label : 'Off'}
          tone={previewActive ? 'good' : 'idle'}
        />
        <Status
          label="Local room"
          value={localActive ? 'Active' : 'Not launched'}
          tone={localActive ? 'good' : 'idle'}
        />
        <Status label="Backend session" value="Not created" tone="idle" />
        <Status label="Viewer count" value="Not backend-confirmed" tone="idle" />
      </div>

      <div className="cl-stream-session-card">
        <span>Draft access policy</span>
        <strong>{pricing.summary}</strong>
        <small>
          {labelFromSnake(draft.accessMode)} · manual renewal · recipient:{' '}
          {draft.creatorWalletAccount.trim() || 'not set'}
        </small>
      </div>

      {localSession ? (
        <div className="cl-stream-session-result" aria-label="Local stream room result">
          <span>Local session id</span>
          <strong>{localSession.sessionId}</strong>
          <small>{localSession.status}</small>
        </div>
      ) : null}

      <div className="cl-stream-session-actions">
        <button
          type="button"
          className="cl-stream-primary"
          onClick={onStartLocalRoom}
          disabled={busy || localActive}
        >
          Launch local stream room
        </button>
        <button type="button" onClick={onStopLocalRoom} disabled={busy || !localActive}>
          Stop local stream room
        </button>
        <button type="button" onClick={copyBackendLaunchPreview}>
          Copy backend launch request
        </button>
      </div>

      <div className="cl-stream-session-actions">
        <button type="button" disabled>
          Start backend stream later
        </button>
        <button type="button" disabled>
          Mint crab:// stream later
        </button>
      </div>

      {problem ? <p className="cl-stream-error" role="alert">{problem}</p> : null}
      {copyState ? <p className="cl-stream-info" role="status">{copyState}</p> : null}

      <div className="cl-stream-truth-box">
        <strong>Next backend step</strong>
        <p>
          The copied request is the shape we should wire to /streams/prepare and /streams/start in
          the backend stream-lite batch. Viewer paid windows still need backend wallet receipts
          before any unlock.
        </p>
      </div>
    </section>
  );
}

function Status({ label, value, tone }) {
  return (
    <div className={`cl-stream-session-status-item is-${tone || 'idle'}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}