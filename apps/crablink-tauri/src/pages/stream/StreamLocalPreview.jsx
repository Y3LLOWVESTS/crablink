/**
 * RO:WHAT — Local source capture plus canvas compositor surface for the stream control room.
 * RO:WHY — Makes camera/screen/file/scene preview flow through a bounded local canvas before stream-lite publishing.
 * RO:INTERACTS — StreamPage, StreamMediaReadiness, streamDraftModel, streamCompositor, browser media APIs, stream.css.
 * RO:INVARIANTS — permission is explicit; preview/compositor is local only until backend segment route accepts a bounded frame; no b3/receipt/live claim.
 * RO:METRICS — none; future native media manager should report capture/session metrics.
 * RO:CONFIG — uses draft source/look hints only for local display; no spend authority or backend truth is stored.
 * RO:SECURITY — stops tracks/revokes object URLs on unmount; never exposes local paths, ingest secrets, tokens, or backend handles.
 * RO:TEST — manual camera/screen/file/selected-scene preview smoke in CrabLink Tauri; stream-lite frame capture should prefer canvas output.
 */

import { useEffect, useRef, useState } from 'react';
import {
  classifyGetUserMediaError,
  probeWebViewMediaCapabilities,
} from '../../shared/api/mediaDiagnosticsClient.js';
import { DEFAULT_PREVIEW_STATE } from './streamDraftModel.js';
import { describeCompositorMode, drawCompositedFrame } from './streamCompositor.js';

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
  screenCam: {
    label: 'Screen + webcam',
    sourceMode: 'screen_with_webcam_thumbnail_future',
  },
  greenScreen: {
    label: 'Camera + background',
    sourceMode: 'camera_green_screen_background_future',
  },
});

export default function StreamLocalPreview({
  draft,
  onChange,
  onPreviewStateChange,
  mediaReport,
  onMediaProbe,
}) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const overlayVideoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const overlayStreamRef = useRef(null);
  const objectUrlRef = useRef('');
  const draftRef = useRef(draft);
  const previewRef = useRef(DEFAULT_PREVIEW_STATE);

  const [preview, setPreview] = useState(DEFAULT_PREVIEW_STATE);
  const [lastMediaHint, setLastMediaHint] = useState('');

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    previewRef.current = preview;
    onPreviewStateChange?.(preview);
  }, [onPreviewStateChange, preview]);

  useEffect(() => {
    let frame = 0;

    function renderFrame() {
      drawCompositedFrame({
        canvas: canvasRef.current,
        sourceVideo: videoRef.current,
        overlayVideo: overlayVideoRef.current,
        draft: draftRef.current,
        preview: previewRef.current,
      });

      frame = window.requestAnimationFrame(renderFrame);
    }

    frame = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    return () => {
      stopTracksAndUrl();
    };
  }, []);

  async function startSelectedScenePreview() {
    const sourceMode = String(draft.sourceMode || '');

    if (sourceMode === PREVIEW_SOURCES.screenCam.sourceMode) {
      await startCapture('screenCam', {
        sourceMode,
        ingestMode: 'stream_lite_compositor_future',
      });
      return;
    }

    if (sourceMode === PREVIEW_SOURCES.greenScreen.sourceMode) {
      await startCapture('greenScreen', {
        sourceMode,
        ingestMode: 'stream_lite_compositor_future',
      });
      return;
    }

    if (sourceMode === PREVIEW_SOURCES.screen.sourceMode) {
      await startCapture('screen', {
        sourceMode,
        ingestMode: 'not_wired_local_preview',
      });
      return;
    }

    if (sourceMode === PREVIEW_SOURCES.file.sourceMode) {
      fileInputRef.current?.click();
      return;
    }

    await startCapture('camera', {
      sourceMode: PREVIEW_SOURCES.camera.sourceMode,
      ingestMode: 'not_wired_local_preview',
    });
  }

  async function startPreview(source) {
    if (source === 'file') {
      fileInputRef.current?.click();
      return;
    }

    const sourceConfig = PREVIEW_SOURCES[source];

    if (!sourceConfig) {
      updatePreview({
        ...DEFAULT_PREVIEW_STATE,
        status: 'error',
        error: 'Unknown preview source.',
      });
      return;
    }

    await startCapture(source, {
      sourceMode: sourceConfig.sourceMode,
      ingestMode: source === 'screenCam' || source === 'greenScreen'
        ? 'stream_lite_compositor_future'
        : 'not_wired_local_preview',
    });
  }

  async function startCapture(source, { sourceMode, ingestMode }) {
    const sourceConfig = PREVIEW_SOURCES[source] || PREVIEW_SOURCES.camera;
    stopPreview();

    const probe = probeWebViewMediaCapabilities();
    onMediaProbe?.(probe);

    try {
      if (!navigator.mediaDevices) {
        throw new Error(
          'Media capture is not available in this WebView. On macOS, quit and restart with npm run tauri:dev:mac-media after adding Info.plist.',
        );
      }

      const includeAudio = draftRef.current.captureAudio === 'on';
      let mediaStream = null;
      let overlayStream = null;
      let overlayWarning = '';

      if (source === 'screenCam') {
        mediaStream = await captureScreen(includeAudio);

        try {
          overlayStream = await captureCamera(false, {
            width: 640,
            height: 360,
            frameRate: 30,
          });
        } catch (overlayError) {
          overlayWarning = classifyGetUserMediaError(overlayError).message;
        }
      } else if (source === 'screen') {
        mediaStream = await captureScreen(includeAudio);
      } else {
        mediaStream = await captureCamera(includeAudio);
      }

      wireTrackEnd(mediaStream, 'Capture source ended.');

      if (overlayStream) {
        wireTrackEnd(overlayStream, 'Webcam overlay source ended.');
      }

      streamRef.current = mediaStream;
      overlayStreamRef.current = overlayStream;

      await attachMediaStream(videoRef.current, mediaStream);

      if (overlayStream) {
        await attachMediaStream(overlayVideoRef.current, overlayStream);
      }

      onChange?.({
        ...draftRef.current,
        sourceMode,
        ingestMode,
      });

      setLastMediaHint(overlayWarning);

      updatePreview({
        status: 'previewing',
        source,
        label: `${sourceConfig.label} compositor preview active`,
        hasAudio: includeAudio,
        error: '',
        compositor: {
          active: true,
          captureSelector: '.cl-stream-compositor-canvas[data-capture-ready="true"]',
          localOnly: true,
          backendConfirmed: false,
        },
      });
    } catch (error) {
      stopPreview();

      const classified = classifyGetUserMediaError(error);
      setLastMediaHint(classified.message);

      updatePreview({
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
      updatePreview({
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
      ...draftRef.current,
      sourceMode: PREVIEW_SOURCES.file.sourceMode,
      ingestMode: 'stream_lite_compositor_future',
    });

    setLastMediaHint('');

    updatePreview({
      status: 'previewing',
      source: 'file',
      label: `Local file compositor preview: ${safeFileName(file.name)}`,
      hasAudio: false,
      error: '',
      compositor: {
        active: true,
        captureSelector: '.cl-stream-compositor-canvas[data-capture-ready="true"]',
        localOnly: true,
        backendConfirmed: false,
      },
    });
  }

  function stopPreview(message = '') {
    stopTracksAndUrl();

    if (canvasRef.current) {
      canvasRef.current.removeAttribute('data-capture-ready');
    }

    updatePreview({
      ...DEFAULT_PREVIEW_STATE,
      status: message ? 'stopped' : 'idle',
      label: message || DEFAULT_PREVIEW_STATE.label,
    });
  }

  function stopTracksAndUrl() {
    stopMediaStream(streamRef.current);
    stopMediaStream(overlayStreamRef.current);

    streamRef.current = null;
    overlayStreamRef.current = null;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }

    resetVideo(videoRef.current);
    resetVideo(overlayVideoRef.current);
  }

  function wireTrackEnd(mediaStream, message) {
    mediaStream?.getTracks?.().forEach((track) => {
      track.onended = () => {
        if (streamRef.current === mediaStream || overlayStreamRef.current === mediaStream) {
          stopPreview(message);
        }
      };
    });
  }

  function updatePreview(nextPreview) {
    previewRef.current = nextPreview;
    setPreview(nextPreview);
  }

  const isPreviewing = preview.status === 'previewing';
  const mode = describeCompositorMode(draft, preview);
  const canAttemptCamera = Boolean(mediaReport?.canAttemptCamera || navigator.mediaDevices?.getUserMedia);
  const canAttemptScreen = Boolean(mediaReport?.canAttemptScreen || navigator.mediaDevices?.getDisplayMedia);
  const isMac = mediaReport?.nativeStatus?.platform === 'macos';
  const macDevCommand = mediaReport?.nativeStatus?.macosDevMediaProfile || 'npm run tauri:dev:mac-media';

  return (
    <section className="cl-stream-stage" aria-label="Local stream preview">
      <div className="cl-stream-stage-video-wrap">
        <canvas
          ref={canvasRef}
          className="cl-stream-compositor-canvas"
          aria-label="Local composited stream preview canvas"
        />

        <video
          ref={videoRef}
          className="cl-stream-stage-video cl-stream-source-video"
          autoPlay
          muted
          playsInline
          controls={false}
          aria-hidden="true"
          tabIndex={-1}
        />

        <video
          ref={overlayVideoRef}
          className="cl-stream-overlay-video"
          autoPlay
          muted
          playsInline
          controls={false}
          aria-hidden="true"
          tabIndex={-1}
        />

        {!isPreviewing ? (
          <div className="cl-stream-stage-empty">
            <span>STREAM COMPOSITOR</span>
            <strong>Large local canvas preview</strong>
            <p>
              Start a scene, camera, screen, or local video rehearsal. The visible canvas is local
              only until the backend accepts a bounded stream-lite frame.
            </p>
          </div>
        ) : null}

        <div className="cl-stream-stage-badges" aria-label="Preview state">
          <span className={isPreviewing ? 'is-on' : ''}>{isPreviewing ? 'Preview active' : 'Not live'}</span>
          <span className={isPreviewing ? 'is-on' : ''}>Canvas compositor</span>
          <span>{preview.hasAudio ? 'Audio preview on' : 'Audio preview off'}</span>
          <span>{mode.label}</span>
          <span>Backend truth required</span>
        </div>
      </div>

      <div className="cl-stream-stage-controls">
        <div>
          <p className="cl-eyebrow">Local capture</p>
          <h2>{preview.label}</h2>
          <p>
            The visible preview is a local compositor canvas. The stream-lite live loop now captures
            this canvas first, then falls back to raw video only if the compositor is not ready.
          </p>
        </div>

        <div className="cl-stream-control-actions">
          <button
            type="button"
            className="cl-stream-primary"
            onClick={startSelectedScenePreview}
            title="Start the source mode selected by the active scene preset"
          >
            Start selected scene
          </button>
          <button
            type="button"
            onClick={() => startPreview('camera')}
            title={canAttemptCamera ? 'Try camera preview' : 'Camera API may need the macOS dev media profile'}
          >
            Camera
          </button>
          <button
            type="button"
            onClick={() => startPreview('screen')}
            title={canAttemptScreen ? 'Try screen preview' : 'Screen API may need macOS screen recording permission'}
          >
            Screen
          </button>
          <button type="button" onClick={() => startPreview('file')}>
            Local file
          </button>
          <button type="button" onClick={() => stopPreview('Preview stopped by creator.')} disabled={!isPreviewing}>
            Stop
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
            <code>{macDevCommand}</code>, then try Camera again. If permission was denied earlier,
            reset Camera/Microphone with the tccutil commands shown in media readiness.
          </p>
        ) : null}

        {!isMac && !canAttemptCamera ? (
          <p className="cl-stream-info" role="status">
            Camera APIs are not exposed by this WebView right now. Local video rehearsal is available
            immediately; native camera support should stay behind a dedicated Tauri media pass.
          </p>
        ) : null}

        {lastMediaHint ? <p className="cl-stream-info" role="status">{lastMediaHint}</p> : null}
        {preview.error ? <p className="cl-stream-error" role="alert">{preview.error}</p> : null}

        <p className="cl-stream-compositor-note">
          Local compositor only. It does not create a stream, b3 CID, receipt, entitlement, viewer
          count, or wallet event.
        </p>
      </div>
    </section>
  );
}

async function attachMediaStream(video, mediaStream) {
  if (!video || !mediaStream) {
    return;
  }

  video.srcObject = mediaStream;
  video.removeAttribute('src');
  video.loop = false;
  video.muted = true;

  await video.play().catch(() => undefined);
}

function stopMediaStream(mediaStream) {
  mediaStream?.getTracks?.().forEach((track) => {
    track.onended = null;
    track.stop();
  });
}

function resetVideo(video) {
  if (!video) {
    return;
  }

  video.pause();
  video.srcObject = null;
  video.removeAttribute('src');
  video.load();
}

async function captureCamera(includeAudio, options = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera capture is not supported in this WebView.');
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: Number(options.width || 1920) },
      height: { ideal: Number(options.height || 1080) },
      frameRate: { ideal: Number(options.frameRate || 30), max: 60 },
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