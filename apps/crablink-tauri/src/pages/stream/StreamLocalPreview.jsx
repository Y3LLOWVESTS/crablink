/**
 * RO:WHAT — Explicit local camera/screen/file preview surface for the stream control room.
 * RO:WHY — Lets creators design the stream experience without claiming backend ingest/live delivery exists.
 * RO:INTERACTS — StreamPage, StreamMediaReadiness, streamDraftModel, browser media APIs, local file preview, stream.css.
 * RO:INVARIANTS — permission is explicit; preview is local only; no media bytes leave the WebView; no b3/receipt/live claim.
 * RO:METRICS — none; future native media manager should report capture/session metrics.
 * RO:CONFIG — uses draft.captureAudio only for explicit local preview constraints.
 * RO:SECURITY — stops tracks/revokes object URLs on unmount; never exposes local paths, ingest secrets, tokens, or backend handles.
 * RO:TEST — manual camera/screen/file preview smoke in CrabLink Tauri.
 */

import { useEffect, useRef, useState } from 'react';
import {
  classifyGetUserMediaError,
  probeWebViewMediaCapabilities,
} from '../../shared/api/mediaDiagnosticsClient.js';
import { DEFAULT_PREVIEW_STATE } from './streamDraftModel.js';

const PREVIEW_SOURCES = Object.freeze({
  camera: {
    label: 'Camera',
    sourceMode: 'local_camera_preview',
  },
  screen: {
    label: 'Screen / window',
    sourceMode: 'local_screen_preview',
  },
  file: {
    label: 'Local video file',
    sourceMode: 'local_file_rehearsal_preview',
  },
});

export default function StreamLocalPreview({
  draft,
  onChange,
  onPreviewStateChange,
  mediaReport,
  onMediaProbe,
}) {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const objectUrlRef = useRef('');
  const [preview, setPreview] = useState(DEFAULT_PREVIEW_STATE);
  const [lastMediaHint, setLastMediaHint] = useState('');

  useEffect(() => {
    onPreviewStateChange?.(preview);
  }, [onPreviewStateChange, preview]);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [preview.status]);

  useEffect(() => stopTracksAndUrl, []);

  async function startPreview(source) {
    const sourceConfig = PREVIEW_SOURCES[source];

    if (!sourceConfig) {
      setPreview({
        ...DEFAULT_PREVIEW_STATE,
        status: 'error',
        error: 'Unknown preview source.',
      });
      return;
    }

    if (source === 'file') {
      fileInputRef.current?.click();
      return;
    }

    stopPreview();

    const probe = probeWebViewMediaCapabilities();
    onMediaProbe?.(probe);

    try {
      if (!navigator.mediaDevices) {
        throw new Error(
          'Media capture is not available in this WebView. On macOS, quit and restart with npm run tauri:dev:mac-media after adding Info.plist.',
        );
      }

      const includeAudio = draft.captureAudio === 'on';
      const mediaStream =
        source === 'screen'
          ? await captureScreen(includeAudio)
          : await captureCamera(includeAudio);

      mediaStream.getTracks().forEach((track) => {
        track.onended = () => {
          if (streamRef.current === mediaStream) {
            stopPreview('Capture source ended.');
          }
        };
      });

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.removeAttribute('src');
        await videoRef.current.play().catch(() => undefined);
      }

      onChange?.({
        ...draft,
        sourceMode: sourceConfig.sourceMode,
        ingestMode: 'not_wired_local_preview',
      });

      setLastMediaHint('');

      setPreview({
        status: 'previewing',
        source,
        label: `${sourceConfig.label} preview active`,
        hasAudio: includeAudio,
        error: '',
      });
    } catch (error) {
      stopPreview();

      const classified = classifyGetUserMediaError(error);
      setLastMediaHint(classified.message);

      setPreview({
        ...DEFAULT_PREVIEW_STATE,
        status: 'error',
        source,
        label: classified.title || `${sourceConfig.label} preview unavailable`,
        hasAudio: false,
        error: error instanceof Error ? error.message : 'Unable to start local preview.',
      });
    }
  }

  async function onFileSelected(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!String(file.type || '').startsWith('video/')) {
      setPreview({
        ...DEFAULT_PREVIEW_STATE,
        status: 'error',
        source: 'file',
        label: 'Local video file rejected',
        error: 'Choose a video file for local rehearsal preview.',
      });
      return;
    }

    stopPreview();

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = objectUrl;
      videoRef.current.loop = true;
      videoRef.current.muted = true;
      await videoRef.current.play().catch(() => undefined);
    }

    onChange?.({
      ...draft,
      sourceMode: PREVIEW_SOURCES.file.sourceMode,
      ingestMode: 'not_wired_local_preview',
    });

    setLastMediaHint('');

    setPreview({
      status: 'previewing',
      source: 'file',
      label: `Local file rehearsal: ${safeFileName(file.name)}`,
      hasAudio: false,
      error: '',
    });
  }

  function stopPreview(message = '') {
    stopTracksAndUrl();

    setPreview({
      ...DEFAULT_PREVIEW_STATE,
      status: message ? 'stopped' : 'idle',
      label: message || DEFAULT_PREVIEW_STATE.label,
    });
  }

  function stopTracksAndUrl() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
    }

    streamRef.current = null;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }

  const isPreviewing = preview.status === 'previewing';
  const canAttemptCamera = Boolean(mediaReport?.canAttemptCamera || navigator.mediaDevices?.getUserMedia);
  const canAttemptScreen = Boolean(mediaReport?.canAttemptScreen || navigator.mediaDevices?.getDisplayMedia);
  const isMac = mediaReport?.nativeStatus?.platform === 'macos';
  const macDevCommand = mediaReport?.nativeStatus?.macosDevMediaProfile || 'npm run tauri:dev:mac-media';

  return (
    <section className="cl-stream-stage" aria-label="Local stream preview">
      <div className="cl-stream-stage-video-wrap">
        <video
          ref={videoRef}
          className="cl-stream-stage-video"
          autoPlay
          muted
          playsInline
          controls={preview.source === 'file'}
          aria-label="Local camera, screen, or file preview"
        />

        {!isPreviewing ? (
          <div className="cl-stream-stage-empty">
            <span>STREAM CONTROL ROOM</span>
            <strong>Large local preview window</strong>
            <p>
              Try camera/screen when available, or choose a local video file for rehearsal. This does
              not publish, mint, charge, store, or send stream bytes to the backend.
            </p>
          </div>
        ) : null}

        <div className="cl-stream-stage-badges" aria-label="Preview state">
          <span className={isPreviewing ? 'is-on' : ''}>{isPreviewing ? 'Preview active' : 'Not live'}</span>
          <span>{preview.hasAudio ? 'Audio preview on' : 'Audio preview off'}</span>
          <span>Backend ingest not wired</span>
        </div>
      </div>

      <div className="cl-stream-stage-controls">
        <div>
          <p className="cl-eyebrow">Local capture</p>
          <h2>{preview.label}</h2>
          <p>
            This preview uses explicit local permission or a local rehearsal file. Persistent capture
            should move behind Tauri Rust/native media state so switching identities does not kill a
            creator stream.
          </p>
        </div>

        <div className="cl-stream-control-actions">
          <button
            type="button"
            className="cl-stream-primary"
            onClick={() => startPreview('camera')}
            title={canAttemptCamera ? 'Try camera preview' : 'Camera API may need the macOS dev media profile'}
          >
            Start camera preview
          </button>
          <button
            type="button"
            onClick={() => startPreview('screen')}
            title={canAttemptScreen ? 'Try screen preview' : 'Screen API may need macOS screen recording permission'}
          >
            Start screen preview
          </button>
          <button type="button" onClick={() => startPreview('file')}>
            Use local video file
          </button>
          <button type="button" onClick={() => stopPreview('Preview stopped by creator.')} disabled={!isPreviewing}>
            Stop preview
          </button>
        </div>

        <input
          ref={fileInputRef}
          className="cl-stream-hidden-file-input"
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
          onChange={onFileSelected}
          aria-hidden="true"
          tabIndex={-1}
        />

        {isMac && !canAttemptCamera ? (
          <p className="cl-stream-info" role="status">
            macOS camera prompt support was added through Info.plist. Quit CrabLink, run{' '}
            <code>{macDevCommand}</code>, then try Start camera preview again. If permission was
            denied earlier, reset Camera/Microphone with the tccutil commands shown below.
          </p>
        ) : null}

        {!isMac && !canAttemptCamera ? (
          <p className="cl-stream-info" role="status">
            Camera APIs are not exposed by this WebView right now. Local video rehearsal is available
            immediately; native camera support should be wired in a dedicated Tauri media pass.
          </p>
        ) : null}

        {lastMediaHint ? <p className="cl-stream-info" role="status">{lastMediaHint}</p> : null}
        {preview.error ? <p className="cl-stream-error" role="alert">{preview.error}</p> : null}
      </div>
    </section>
  );
}

async function captureCamera(includeAudio) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera capture is not supported in this WebView.');
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 60 },
    },
    audio: includeAudio,
  });
}

async function captureScreen(includeAudio) {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen capture is not supported in this WebView.');
  }

  return navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: includeAudio,
  });
}

function safeFileName(name) {
  const clean = String(name || 'selected video').replace(/[^\w .()\-]/g, '').trim();
  return clean.slice(0, 90) || 'selected video';
}