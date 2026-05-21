/**
 * RO:WHAT — Local audio playback preview and selected audio file source for the crab://music workspace.
 * RO:WHY — Lets creators inspect a local track before explicitly minting a bounded backend music asset.
 * RO:INTERACTS — MusicPage.jsx, MusicPublishFlow.jsx, music.css, browser/WebView object URLs.
 * RO:INVARIANTS — preview is local-only; upload is separate explicit flow; no fake b3 CID; no receipt; no file path persisted.
 * RO:METRICS — none.
 * RO:CONFIG — max local preview size is intentionally bounded in this component.
 * RO:SECURITY — no file path is exposed; object URL is revoked; bytes cross the Tauri bridge only in explicit publish flow.
 * RO:TEST — npm run build; manual crab://music local MP3/WAV/FLAC preview smoke.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';

const MAX_LOCAL_PREVIEW_BYTES = 300 * 1024 * 1024;

const ACCEPTED_AUDIO_TYPES = Object.freeze([
  'audio/aac',
  'audio/flac',
  'audio/m4a',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/opus',
  'audio/wav',
  'audio/webm',
  'audio/x-flac',
  'audio/x-m4a',
  'audio/x-wav',
]);

export default function MusicLocalPlaybackPreview({
  draft,
  updateDraft,
  onPreviewMetaChange,
  onFileChange,
}) {
  const inputRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState('');
  const [fileMeta, setFileMeta] = useState(null);
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
    if (!fileMeta?.durationLabel) {
      return null;
    }

    return {
      duration: fileMeta.durationLabel,
    };
  }, [fileMeta]);

  function chooseFile(event) {
    const file = event.target.files?.[0] || null;
    clearObjectUrlOnly();
    setProblem('');

    if (!file) {
      setFileMeta(null);
      notifyPreviewMeta(onPreviewMetaChange, null);
      notifyFile(onFileChange, null);
      return;
    }

    const validation = validateAudioFile(file);

    if (!validation.ok) {
      const blockedMeta = {
        name: file.name || 'selected file',
        type: file.type || inferAudioType(file.name),
        size: file.size || 0,
        status: 'blocked',
      };

      setFileMeta(blockedMeta);
      setProblem(validation.message);
      notifyPreviewMeta(onPreviewMetaChange, null);
      notifyFile(onFileChange, null);
      return;
    }

    const nextObjectUrl = URL.createObjectURL(file);
    const nextMeta = {
      name: file.name || 'selected audio',
      type: file.type || inferAudioType(file.name),
      size: file.size || 0,
      status: 'loaded',
      durationSeconds: 0,
      durationLabel: '',
    };

    setObjectUrl(nextObjectUrl);
    setFileMeta(nextMeta);
    notifyPreviewMeta(onPreviewMetaChange, nextMeta);
    notifyFile(onFileChange, file);
  }

  function onLoadedMetadata(event) {
    const audio = event.currentTarget;
    const duration = Number(audio.duration);
    const durationSeconds = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0;
    const durationLabel = durationSeconds > 0 ? formatDurationLabel(durationSeconds) : '';

    setFileMeta((current) => {
      if (!current) {
        return current;
      }

      const nextMeta = {
        ...current,
        durationSeconds,
        durationLabel,
      };

      notifyPreviewMeta(onPreviewMetaChange, nextMeta);
      return nextMeta;
    });
  }

  function applyMetadataToDraft() {
    if (!metadataPatch?.duration || typeof updateDraft !== 'function') {
      return;
    }

    updateDraft('duration', metadataPatch.duration);
  }

  function clearPreview() {
    clearObjectUrlOnly();
    setFileMeta(null);
    setProblem('');
    notifyPreviewMeta(onPreviewMetaChange, null);
    notifyFile(onFileChange, null);

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

  const hasDifferentMetadata = Boolean(metadataPatch?.duration && metadataPatch.duration !== draft.duration);

  return (
    <section className="cl-music-local-player" aria-label="Local music playback preview">
      <div className="cl-music-local-player-head">
        <div>
          <p className="cl-eyebrow">Local audio preview</p>
          <h3>Preview a local track</h3>
          <p>
            Select an MP3, WAV, FLAC, AAC, M4A, Ogg, Opus, or WebM audio file to test playback
            inside the Tauri WebView. This preview does not mint, hash, charge ROC, or unlock
            anything. Upload happens only through the explicit paid mint flow below.
          </p>
        </div>

        <Badge tone={objectUrl ? 'success' : 'neutral'} uppercase={false}>
          {objectUrl ? 'preview loaded' : 'required for mint'}
        </Badge>
      </div>

      <div className="cl-music-local-player-controls">
        <label className="cl-music-local-file-picker">
          <span>Select local audio</span>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.oga,.opus,.webm"
            onChange={chooseFile}
          />
        </label>

        <Button variant="secondary" onClick={clearPreview} disabled={!fileMeta && !problem}>
          Clear local preview
        </Button>
      </div>

      {problem ? (
        <div className="cl-music-local-player-problem" role="alert">
          <strong>Preview blocked</strong>
          <span>{problem}</span>
        </div>
      ) : null}

      {objectUrl ? (
        <div className="cl-music-local-player-frame">
          <audio src={objectUrl} controls preload="metadata" onLoadedMetadata={onLoadedMetadata}>
            Your browser/WebView cannot play this local audio file.
          </audio>
        </div>
      ) : (
        <div className="cl-music-local-player-empty" role="note">
          <strong>No local audio selected</strong>
          <span>
            Choose an audio file to preview it locally and enable the music-lite mint workflow.
            Cover art is not uploaded here; use a crab:// image reference in linked assets.
          </span>
        </div>
      )}

      <div className="cl-music-local-player-grid">
        <PreviewMeta label="File" value={fileMeta?.name || 'not selected'} />
        <PreviewMeta label="Type" value={fileMeta?.type || 'not selected'} />
        <PreviewMeta label="Size" value={fileMeta ? formatBytes(fileMeta.size) : 'not selected'} />
        <PreviewMeta label="Max preview" value={formatBytes(MAX_LOCAL_PREVIEW_BYTES)} />
        <PreviewMeta label="Duration" value={fileMeta?.durationLabel || 'not inspected'} />
        <PreviewMeta label="Bridge" value="explicit upload only" />
      </div>

      <div className="cl-music-local-player-actions">
        <Button variant="secondary" onClick={applyMetadataToDraft} disabled={!hasDifferentMetadata}>
          Apply duration to draft
        </Button>

        <p>
          The file name and local object URL are not written into the manifest JSON. Browser controls
          are playback UI only; they are not DRM, anti-rip enforcement, paid access proof, or b3 truth.
        </p>
      </div>
    </section>
  );
}

function PreviewMeta({ label, value }) {
  return (
    <div className="cl-music-local-player-meta">
      <span>{label}</span>
      <strong title={String(value || '')}>{value || 'n/a'}</strong>
    </div>
  );
}

function notifyPreviewMeta(listener, meta) {
  if (typeof listener !== 'function') {
    return;
  }

  listener(meta);
}

function notifyFile(listener, file) {
  if (typeof listener !== 'function') {
    return;
  }

  listener(file);
}

function validateAudioFile(file) {
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
      message: `Local preview is capped at ${formatBytes(MAX_LOCAL_PREVIEW_BYTES)}. Larger music files need the future bounded range/segment path.`,
    };
  }

  const extensionOk = /\.(mp3|wav|flac|m4a|aac|ogg|oga|opus|webm)$/i.test(name);
  const typeOk = ACCEPTED_AUDIO_TYPES.includes(type) || type.startsWith('audio/');

  if (!typeOk && !extensionOk) {
    return {
      ok: false,
      message: 'Only audio files are accepted for local music preview.',
    };
  }

  return { ok: true };
}

function inferAudioType(name) {
  const lowerName = String(name || '').toLowerCase();

  if (lowerName.endsWith('.mp3')) return 'audio/mpeg';
  if (lowerName.endsWith('.wav')) return 'audio/wav';
  if (lowerName.endsWith('.flac')) return 'audio/flac';
  if (lowerName.endsWith('.m4a')) return 'audio/mp4';
  if (lowerName.endsWith('.aac')) return 'audio/aac';
  if (lowerName.endsWith('.ogg') || lowerName.endsWith('.oga')) return 'audio/ogg';
  if (lowerName.endsWith('.opus')) return 'audio/opus';
  if (lowerName.endsWith('.webm')) return 'audio/webm';

  return 'audio/mpeg';
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