/**
 * RO:WHAT — Local-only video playback preview for the crab://video workspace.
 * RO:WHY — Lets creators inspect a local video file before backend media upload/range contracts exist.
 * RO:INTERACTS — VideoDraft.jsx, video.css, browser/WebView object URLs, local draft metadata fields.
 * RO:INVARIANTS — local preview only; no upload; no b3 CID; no manifest CID; no wallet/ROC action; no backend playback claim.
 * RO:METRICS — none.
 * RO:CONFIG — max local preview size is intentionally bounded in this component.
 * RO:SECURITY — no file path is exposed; bytes never cross Tauri command bridge; object URL is revoked; this is not DRM.
 * RO:TEST — npm run build; scripts/check-tauri.sh; manual crab://video local MP4/WebM preview smoke.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';

const MAX_LOCAL_PREVIEW_BYTES = 750 * 1024 * 1024;

const ACCEPTED_VIDEO_TYPES = Object.freeze([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-m4v',
]);

export default function VideoLocalPlaybackPreview({ draft, updateDraft, onFileSelected }) {
  const inputRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState('');
  const [fileMeta, setFileMeta] = useState(null);
  const [videoMeta, setVideoMeta] = useState(null);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!objectUrl) {
      return undefined;
    }

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const metadataPatch = useMemo(() => {
    if (!videoMeta) {
      return null;
    }

    return {
      duration: videoMeta.durationLabel,
      resolution: videoMeta.resolution,
      aspectRatio: videoMeta.aspectRatio,
    };
  }, [videoMeta]);

  function chooseFile(event) {
    const file = event.target.files?.[0] || null;
    clearObjectUrlOnly();
    setVideoMeta(null);
    setProblem('');

    if (!file) {
      setFileMeta(null);
      notifySelectedFile(onFileSelected, null, null);
      return;
    }

    const validation = validateVideoFile(file);

    if (!validation.ok) {
      setFileMeta({
        name: file.name || 'selected file',
        type: file.type || 'unknown',
        size: file.size || 0,
      });
      setProblem(validation.message);
      notifySelectedFile(onFileSelected, null, null);
      return;
    }

    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);
    const nextMeta = {
      name: file.name || 'selected video',
      type: file.type || 'unknown',
      size: file.size || 0,
      lastModified: file.lastModified || 0,
    };

    setFileMeta(nextMeta);
    notifySelectedFile(onFileSelected, file, nextMeta);
  }

  function onLoadedMetadata(event) {
    const video = event.currentTarget;
    const duration = Number(video.duration);
    const width = Number(video.videoWidth);
    const height = Number(video.videoHeight);

    const durationLabel = Number.isFinite(duration) && duration > 0
      ? formatDurationLabel(duration)
      : '';

    setVideoMeta({
      durationSeconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0,
      durationLabel,
      width: Number.isFinite(width) && width > 0 ? width : 0,
      height: Number.isFinite(height) && height > 0 ? height : 0,
      resolution: width > 0 && height > 0 ? `${Math.round(width)}x${Math.round(height)}` : '',
      aspectRatio: width > 0 && height > 0 ? aspectRatioFor(width, height) : '',
    });
  }

  function applyMetadataToDraft() {
    if (!metadataPatch) {
      return;
    }

    if (metadataPatch.duration) {
      updateDraft('duration', metadataPatch.duration);
    }

    if (metadataPatch.resolution) {
      updateDraft('resolution', metadataPatch.resolution);
    }

    if (metadataPatch.aspectRatio) {
      updateDraft('aspectRatio', metadataPatch.aspectRatio);
    }
  }

  function clearPreview() {
    clearObjectUrlOnly();
    setFileMeta(null);
    setVideoMeta(null);
    setProblem('');
    notifySelectedFile(onFileSelected, null, null);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function clearObjectUrlOnly() {
    setObjectUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return '';
    });
  }

  const canApplyMetadata = Boolean(metadataPatch?.duration || metadataPatch?.resolution || metadataPatch?.aspectRatio);
  const hasDifferentMetadata = canApplyMetadata && (
    (metadataPatch.duration && metadataPatch.duration !== draft.duration) ||
    (metadataPatch.resolution && metadataPatch.resolution !== draft.resolution) ||
    (metadataPatch.aspectRatio && metadataPatch.aspectRatio !== draft.aspectRatio)
  );

  return (
    <section className="video-local-player" aria-label="Local video playback preview">
      <div className="video-local-player-head">
        <div>
          <p className="cl-eyebrow">Local playback preview</p>
          <h3>Preview a local video file</h3>
          <p>
            Select an MP4, WebM, Ogg, MOV, or M4V file to test playback inside the Tauri WebView.
            This does not upload, publish, hash, charge ROC, or unlock anything.
          </p>
        </div>

        <Badge tone={objectUrl ? 'success' : 'neutral'} uppercase={false}>
          {objectUrl ? 'preview loaded' : 'optional'}
        </Badge>
      </div>

      <div className="video-local-player-controls">
        <label className="video-local-file-picker">
          <span>Select local video</span>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,.mp4,.webm,.ogv,.ogg,.mov,.m4v"
            onChange={chooseFile}
          />
        </label>

        <Button variant="secondary" onClick={clearPreview} disabled={!fileMeta && !problem}>
          Clear local preview
        </Button>
      </div>

      {problem ? (
        <div className="video-local-player-problem" role="alert">
          <strong>Preview blocked</strong>
          <span>{problem}</span>
        </div>
      ) : null}

      {objectUrl ? (
        <div className="video-local-player-frame">
          <video
            src={objectUrl}
            controls
            preload="metadata"
            playsInline
            onLoadedMetadata={onLoadedMetadata}
          >
            Your browser/WebView cannot play this local video file.
          </video>
        </div>
      ) : (
        <div className="video-local-player-empty" role="note">
          <strong>No local video selected</strong>
          <span>
            The player is intentionally local-only until backend media upload, paid media gates,
            range serving, and verified cache paths are implemented.
          </span>
        </div>
      )}

      <div className="video-local-player-grid">
        <PreviewMeta label="File" value={fileMeta?.name || 'not selected'} />
        <PreviewMeta label="Type" value={fileMeta?.type || 'not selected'} />
        <PreviewMeta label="Size" value={fileMeta ? formatBytes(fileMeta.size) : 'not selected'} />
        <PreviewMeta label="Max preview" value={formatBytes(MAX_LOCAL_PREVIEW_BYTES)} />
        <PreviewMeta label="Duration" value={videoMeta?.durationLabel || 'not inspected'} />
        <PreviewMeta label="Resolution" value={videoMeta?.resolution || 'not inspected'} />
        <PreviewMeta label="Aspect" value={videoMeta?.aspectRatio || 'not inspected'} />
        <PreviewMeta label="Bridge" value="no Tauri command bytes" />
      </div>

      <div className="video-local-player-actions">
        <Button
          variant="secondary"
          onClick={applyMetadataToDraft}
          disabled={!hasDifferentMetadata}
        >
          Apply metadata to draft
        </Button>

        <p>
          The file name and local preview URL are not written into the manifest JSON. Browser controls
          are playback UI only; they are not DRM or anti-rip enforcement.
        </p>
      </div>
    </section>
  );
}

function PreviewMeta({ label, value }) {
  return (
    <div className="video-local-player-meta">
      <span>{label}</span>
      <strong title={String(value || '')}>{value || 'n/a'}</strong>
    </div>
  );
}

function notifySelectedFile(listener, file, meta) {
  if (typeof listener !== 'function') {
    return;
  }

  listener(file, meta);
}

function validateVideoFile(file) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  const size = Number(file?.size || 0);

  if (!file) {
    return {
      ok: false,
      message: 'No file was selected.',
    };
  }

  if (size <= 0) {
    return {
      ok: false,
      message: 'The selected file is empty or unavailable.',
    };
  }

  if (size > MAX_LOCAL_PREVIEW_BYTES) {
    return {
      ok: false,
      message: `Local preview is capped at ${formatBytes(MAX_LOCAL_PREVIEW_BYTES)}. Larger media needs the future bounded range/segment path.`,
    };
  }

  const extensionOk = /\.(mp4|webm|ogv|ogg|mov|m4v)$/i.test(name);
  const typeOk = ACCEPTED_VIDEO_TYPES.includes(type) || type.startsWith('video/');

  if (!typeOk && !extensionOk) {
    return {
      ok: false,
      message: 'Only video files are accepted for local preview.',
    };
  }

  return { ok: true };
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);

  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KiB', 'MiB', 'GiB'];
  let amount = value;
  let unitIndex = 0;

  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  return `${amount >= 10 ? amount.toFixed(0) : amount.toFixed(1)} ${units[unitIndex]}`;
}

function formatDurationLabel(seconds) {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return [hours, minutes, secs]
      .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, '0')))
      .join(':');
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function aspectRatioFor(width, height) {
  const w = Math.max(1, Math.round(Number(width || 0)));
  const h = Math.max(1, Math.round(Number(height || 0)));
  const divisor = gcd(w, h);

  return `${Math.round(w / divisor)}:${Math.round(h / divisor)}`;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x || 1;
}