/**
 * RO:WHAT — Stream media readiness diagnostic panel.
 * RO:WHY — Camera/screen failures need clear, truthful diagnostics before native capture is wired.
 * RO:INTERACTS — mediaDiagnosticsClient, StreamPage, StreamLocalPreview, stream.css.
 * RO:INVARIANTS — diagnostics only; no capture start; no backend stream; no receipt; no wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — reads runtime platform facts only.
 * RO:SECURITY — no media bytes, local paths, ingest tokens, capabilities, shell execution, or spend authority are collected.
 * RO:TEST — manual crab://stream diagnostic smoke.
 */

import { useEffect, useState } from 'react';
import { buildMediaReadinessReport } from '../../shared/api/mediaDiagnosticsClient.js';

export default function StreamMediaReadiness({ report, onReport }) {
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState('');

  useEffect(() => {
    if (!report) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setBusy(true);

    try {
      const nextReport = await buildMediaReadinessReport();
      onReport?.(nextReport);
    } finally {
      setBusy(false);
    }
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report || {}, null, 2));
      setCopyState('Copied media readiness JSON');
    } catch (_error) {
      setCopyState('Clipboard unavailable in this WebView');
    }

    window.setTimeout(() => setCopyState(''), 2200);
  }

  async function copyMacResetCommands() {
    const commands = report?.macosFixPlan?.privacyResetCommands || [];

    try {
      await navigator.clipboard.writeText(commands.join('\n'));
      setCopyState('Copied macOS privacy reset commands');
    } catch (_error) {
      setCopyState('Clipboard unavailable in this WebView');
    }

    window.setTimeout(() => setCopyState(''), 2200);
  }

  const cameraReady = Boolean(report?.canAttemptCamera);
  const screenReady = Boolean(report?.canAttemptScreen);
  const recommendation = report?.webviewProbe?.recommendation || 'not checked';
  const platform = report?.nativeStatus?.platform || 'unknown';
  const isMac = platform === 'macos';
  const macosFixPlan = report?.macosFixPlan || null;

  return (
    <section className="cl-stream-panel cl-stream-media-readiness" aria-label="Media readiness">
      <div className="cl-stream-media-readiness-head">
        <div>
          <p className="cl-eyebrow">Media readiness</p>
          <h2>Camera permission diagnostic</h2>
          <p>
            This checks the WebView media API, macOS permission posture, and next action. It does not
            start camera, mic, screen capture, backend streaming, or wallet actions.
          </p>
        </div>

        <div className="cl-stream-media-score">
          <span>{platform}</span>
          <strong>{cameraReady ? 'Camera API visible' : 'Camera API hidden'}</strong>
        </div>
      </div>

      <div className="cl-stream-media-grid">
        <ReadinessItem label="Camera API" value={cameraReady ? 'Available to try' : 'Unavailable'} good={cameraReady} />
        <ReadinessItem label="Screen API" value={screenReady ? 'Available to try' : 'Unavailable'} good={screenReady} />
        <ReadinessItem
          label="Camera permission"
          value={report?.permissionProbe?.camera || 'unknown'}
          good={report?.permissionProbe?.camera === 'granted' || report?.permissionProbe?.camera === 'prompt'}
        />
        <ReadinessItem
          label="Native capture"
          value={report?.nativeStatus?.nativeCaptureWired ? 'Wired' : 'Not wired'}
          good={Boolean(report?.nativeStatus?.nativeCaptureWired)}
        />
      </div>

      <div className="cl-stream-media-note">
        <strong>{formatLabel(recommendation)}</strong>
        <span>
          {cameraReady
            ? 'Click Start camera preview to request permission from the WebView.'
            : isMac
              ? 'macOS needs the Info.plist purpose strings and the dev media profile. Quit CrabLink and restart with npm run tauri:dev:mac-media.'
              : 'Use local video rehearsal now. Native camera/mic capture should be wired in a dedicated Tauri media pass.'}
        </span>
      </div>

      {macosFixPlan ? (
        <div className="cl-stream-macos-fix">
          <p className="cl-eyebrow">macOS fix plan</p>
          <h3>Permission prompt path</h3>
          <ol>
            {macosFixPlan.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <div className="cl-stream-command-box">
            <span>Dev media launch command</span>
            <code>{macosFixPlan.devCommand}</code>
          </div>

          {macosFixPlan.privacyResetCommands.length ? (
            <div className="cl-stream-command-box">
              <span>Reset stale denied permission state if needed</span>
              {macosFixPlan.privacyResetCommands.map((command) => (
                <code key={command}>{command}</code>
              ))}
            </div>
          ) : null}

          {macosFixPlan.systemSettingsPaths.length ? (
            <details className="cl-stream-media-details">
              <summary>Manual System Settings paths</summary>
              <ul>
                {macosFixPlan.systemSettingsPaths.map((path) => (
                  <li key={path}>{path}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      <details className="cl-stream-media-details">
        <summary>Permission model notes</summary>
        <ul>
          <li>{report?.nativeStatus?.cameraPermissionModel || 'Camera permission model not checked.'}</li>
          <li>{report?.nativeStatus?.microphonePermissionModel || 'Microphone permission model not checked.'}</li>
          <li>{report?.nativeStatus?.screenPermissionModel || 'Screen permission model not checked.'}</li>
        </ul>
      </details>

      <div className="cl-stream-session-actions">
        <button type="button" onClick={refresh} disabled={busy}>
          {busy ? 'Checking...' : 'Check media readiness'}
        </button>
        <button type="button" onClick={copyReport} disabled={!report}>
          Copy diagnostic JSON
        </button>
        {macosFixPlan?.privacyResetCommands?.length ? (
          <button type="button" onClick={copyMacResetCommands}>
            Copy macOS reset commands
          </button>
        ) : null}
      </div>

      {copyState ? <p className="cl-stream-info" role="status">{copyState}</p> : null}
    </section>
  );
}

function ReadinessItem({ label, value, good }) {
  return (
    <div className={`cl-stream-media-item ${good ? 'is-good' : 'is-warn'}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}