/**
 * RO:WHAT — Receipt-gated paid audio player for .music and .podcast asset pages.
 * RO:WHY — Browser/WebView direct media loading can fail for gateway /o/b3:<hash>; Tauri Rust fetches bounded bytes and React plays a typed Blob URL.
 * RO:INTERACTS — AssetHydratedView.jsx, Tauri fetch_asset_bytes_gateway command, svc-gateway /o/b3:<hash>.
 * RO:INVARIANTS — called only after backend content_view canView; no fake receipt; no wallet mutation; no direct storage/index call.
 * RO:SECURITY — allowlisted gateway object route only on Rust side; object URL revoked; bounded byte cap.
 * RO:TEST — paid crab://<hash>.music and crab://<hash>.podcast pages unlock player after receipt.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { callTauri } from '../../platform/tauriPlatform.js';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export default function AssetPaidAudioPlayer({
  summary,
  canPreviewAudio,
  assetClient,
  audioKindName = 'Audio',
  audioKindLower = 'audio',
  audioPlaybackNoun = 'audio asset',
}) {
  const objectUrlRef = useRef('');
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({
    status: 'idle',
    objectUrl: '',
    source: null,
    attempts: [],
    error: null,
  });

  const route = useMemo(() => paidAudioRoute(summary), [summary?.hash, summary?.cid, summary?.rawUrl]);

  useEffect(() => {
    return () => {
      revokeObjectUrl(objectUrlRef);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function run() {
      revokeObjectUrl(objectUrlRef);

      if (!canPreviewAudio) {
        setState({
          status: 'locked',
          objectUrl: '',
          source: null,
          attempts: [],
          error: null,
        });
        return;
      }

      if (!route) {
        setState({
          status: 'error',
          objectUrl: '',
          source: null,
          attempts: [],
          error: new Error('No canonical gateway raw audio route was available.'),
        });
        return;
      }

      setState({
        status: 'loading',
        objectUrl: '',
        source: null,
        attempts: [],
        error: null,
      });

      const attempts = [];

      try {
        const response = await fetchPaidAudioBytes({
          route,
          summary,
          assetClient,
          audioKindName,
        });

        const bytes = normalizeBodyBytes(response.bodyBytes);
        const contentType = normalizeAudioContentType(
          response.contentType,
          summary?.contentType,
          summary?.kind,
        );

        if (bytes.byteLength <= 0) {
          throw new Error('Gateway returned an empty audio object.');
        }

        if (bytes.byteLength > MAX_AUDIO_BYTES) {
          throw new Error(
            `Audio object is ${formatBytes(bytes.byteLength)}, above the ${formatBytes(MAX_AUDIO_BYTES)} MVP playback bridge cap. Future range/segment playback is required.`,
          );
        }

        const blob = new Blob([bytes], { type: contentType });
        const objectUrl = URL.createObjectURL(blob);

        attempts.push({
          label: 'Tauri gateway byte bridge',
          route,
          ok: true,
          bytes: bytes.byteLength,
          contentType,
          status: response.status,
          correlationId: response.correlationId,
        });

        if (!alive) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        objectUrlRef.current = objectUrl;
        setState({
          status: 'ready',
          objectUrl,
          source: {
            label: 'Tauri gateway byte bridge',
            route,
            bytes: bytes.byteLength,
            contentType,
            status: response.status,
            correlationId: response.correlationId,
          },
          attempts,
          error: null,
        });
      } catch (error) {
        attempts.push({
          label: 'Tauri gateway byte bridge',
          route,
          ok: false,
          error: serializeError(error),
        });

        if (!alive) {
          return;
        }

        setState({
          status: 'error',
          objectUrl: '',
          source: null,
          attempts,
          error,
        });
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, [
    assetClient,
    audioKindName,
    canPreviewAudio,
    revision,
    route,
    summary?.contentType,
    summary?.hash,
    summary?.kind,
  ]);

  function reloadAudio() {
    setRevision((value) => value + 1);
  }

  function openSource() {
    if (!route) {
      return;
    }

    const url =
      typeof assetClient?.gateway?.url === 'function'
        ? assetClient.gateway.url(route)
        : `${String(assetClient?.gateway?.baseUrl || 'http://127.0.0.1:8090').replace(/\/+$/, '')}${route}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <Card
      eyebrow="Playback"
      title={`${audioKindName} playback`}
      className="asset-preview-card"
      actions={
        <div className="asset-copy-actions">
          <Button variant="secondary" onClick={reloadAudio} disabled={!canPreviewAudio || state.status === 'loading'}>
            {state.status === 'loading' ? 'Loading audio…' : 'Reload audio'}
          </Button>
          <Button variant="secondary" onClick={openSource} disabled={!canPreviewAudio || !route}>
            Open source
          </Button>
        </div>
      }
    >
      {canPreviewAudio && state.status === 'ready' && state.objectUrl ? (
        <div className="asset-audio-preview-shell">
          <audio
            src={state.objectUrl}
            controls
            preload="metadata"
            onError={() => {
              setState((current) => ({
                ...current,
                status: 'error',
                error: new Error(
                  `${audioKindName} bytes were fetched through Tauri, but this WebView could not decode ${current.source?.contentType || 'the returned audio format'}.`,
                ),
              }));
            }}
          >
            Your WebView cannot play this gateway {audioKindLower} asset.
          </audio>
        </div>
      ) : (
        <div className="asset-preview-empty">
          <strong>
            {canPreviewAudio
              ? state.status === 'loading'
                ? `Loading ${audioKindLower} bytes from the gateway…`
                : `${audioKindName} bytes were not previewable yet.`
              : `${audioKindName} playback is locked until paid.`}
          </strong>
          <span>
            {canPreviewAudio
              ? `The backend receipt is valid. CrabLink is fetching the ${audioKindLower} object through the bounded Tauri gateway byte bridge and creating a typed local Blob URL for playback.`
              : `The ${audioPlaybackNoun} metadata is visible, but CrabLink will not fetch or play audio bytes until the backend returns a paid content_view receipt.`}
          </span>
        </div>
      )}

      <div className="asset-preview-source-strip" aria-label={`${audioKindName} preview source`}>
        <div>
          <span>Current source</span>
          <strong>{canPreviewAudio ? state.source?.label || 'Tauri gateway byte bridge' : 'Locked'}</strong>
        </div>
        <div>
          <span>Source URL</span>
          <strong>{canPreviewAudio ? route || 'n/a' : 'Hidden until paid'}</strong>
        </div>
        <div>
          <span>Preview mode</span>
          <strong>{canPreviewAudio ? audioModeLabel(state.status) : 'paid view gate'}</strong>
        </div>
      </div>

      <TruthBoundary
        tone={canPreviewAudio && state.status === 'ready' ? 'success' : 'warning'}
        title={
          canPreviewAudio && state.status === 'ready'
            ? `Backend receipt unlocked this ${audioKindLower} view`
            : canPreviewAudio
              ? `${audioKindName} bytes are unlocked but not decoded yet`
              : `${audioKindName} audio is still gated`
        }
        copy={
          canPreviewAudio && state.status === 'ready'
            ? `This player appears only after the backend content_view path returned a paid receipt and Tauri fetched bounded gateway bytes. Local receipt memory is display-only and cannot unlock playback by itself.`
            : canPreviewAudio
              ? `The backend receipt is valid. If this still does not decode, the next issue is the captured codec/container, not ROC payment.`
              : `${audioKindName} metadata can be displayed before payment, but CrabLink will not fetch audio bytes until a backend receipt unlocks this content view.`
        }
      />

      {canPreviewAudio && state.status !== 'locked' && (
        <details className="asset-preview-fallbacks" open={state.status === 'error'}>
          <summary>Audio byte fetch diagnostics</summary>
          <div>
            <span>Status</span>
            <strong>{state.status}</strong>
          </div>
          {state.source && (
            <div>
              <span>Blob source</span>
              <strong>
                {state.source.route} · {formatBytes(state.source.bytes)} · {state.source.contentType || 'unknown type'}
              </strong>
            </div>
          )}
          {state.error && (
            <div>
              <span>Error</span>
              <strong>{state.error.message || String(state.error)}</strong>
            </div>
          )}
          {state.attempts.map((attempt, index) => (
            <div key={`${attempt.route || 'route'}:${index}`}>
              <span>{attempt.label || `Attempt ${index + 1}`}</span>
              <strong>
                {attempt.ok
                  ? `${attempt.route} · ${formatBytes(attempt.bytes)} · ${attempt.contentType || 'unknown type'}`
                  : `${attempt.route || 'route unavailable'} · ${attempt.error?.message || 'failed'}`}
              </strong>
            </div>
          ))}
        </details>
      )}
    </Card>
  );
}

async function fetchPaidAudioBytes({ route, summary, assetClient, audioKindName }) {
  if (canUseTauriInvoke()) {
    const response = await callTauri('fetch_asset_bytes_gateway', {
      request: {
        route,
        accept: audioAcceptHeader(summary?.contentType, summary?.kind),
        contentTypeHint: normalizeAudioContentType('', summary?.contentType, summary?.kind),
        maxBytes: MAX_AUDIO_BYTES,
        headers: {
          'x-ron-asset-kind': summary?.kind || 'audio',
        },
      },
    });

    return {
      status: Number(response?.status || 0),
      correlationId: response?.correlationId || response?.correlation_id || '',
      contentType: response?.contentType || response?.content_type || '',
      bodyBytes: response?.bodyBytes || response?.body_bytes || [],
    };
  }

  if (!assetClient?.gateway?.request) {
    throw new Error('Gateway client is unavailable for audio playback.');
  }

  const response = await assetClient.gateway.request(route, {
    label: `${audioKindName} playback bytes`,
    parseAs: 'blob',
    headers: {
      Accept: audioAcceptHeader(summary?.contentType, summary?.kind),
    },
  });

  const blob = response?.data;

  if (!(blob instanceof Blob)) {
    throw new Error('Gateway did not return an audio blob.');
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());

  return {
    status: response?.status || 0,
    correlationId: response?.correlationId || '',
    contentType: blob.type || summary?.contentType || '',
    bodyBytes: bytes,
  };
}

function paidAudioRoute(summary = {}) {
  const rawRoute = normalizeObjectRoute(summary.rawUrl);

  if (rawRoute) {
    return rawRoute;
  }

  const cidRoute = normalizeObjectRoute(summary.cid);

  if (cidRoute) {
    return cidRoute;
  }

  const hash = cleanHash(summary.hash);

  return hash ? `/o/b3:${hash}` : '';
}

function normalizeObjectRoute(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      return normalizeObjectRoute(new URL(raw).pathname);
    } catch (_error) {
      return '';
    }
  }

  if (/^b3:[0-9a-f]{64}$/i.test(raw)) {
    return `/o/${raw.toLowerCase()}`;
  }

  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return `/o/b3:${raw.toLowerCase()}`;
  }

  const direct = raw.match(/^\/o\/(b3:)?([0-9a-f]{64})$/i);

  if (direct) {
    return `/o/b3:${direct[2].toLowerCase()}`;
  }

  return '';
}

function normalizeBodyBytes(value) {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView?.(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  if (Array.isArray(value)) {
    return new Uint8Array(value.map((item) => Number(item || 0) & 0xff));
  }

  throw new Error('Tauri audio byte response did not contain a byte array.');
}

function normalizeAudioContentType(responseType, hintType, kind = 'audio') {
  const response = String(responseType || '').trim().toLowerCase();
  const hint = String(hintType || '').trim().toLowerCase();

  if (response.startsWith('audio/') && !response.includes('octet-stream')) {
    return response;
  }

  if (hint.startsWith('audio/')) {
    return hint;
  }

  return kind === 'podcast' ? 'audio/mp4' : 'audio/mpeg';
}

function audioAcceptHeader(contentType, kind = 'music') {
  const clean = String(contentType || '').trim();

  if (clean.toLowerCase().startsWith('audio/')) {
    return `${clean},audio/*,*/*`;
  }

  return kind === 'podcast'
    ? 'audio/mp4,audio/aac,audio/mpeg,audio/wav,audio/webm,audio/ogg,audio/*,*/*'
    : 'audio/mpeg,audio/mp4,audio/wav,audio/*,*/*';
}

function audioModeLabel(status) {
  switch (status) {
    case 'loading':
      return 'Tauri byte bridge loading';
    case 'ready':
      return 'Tauri blob playback';
    case 'error':
      return 'audio blob unavailable';
    default:
      return 'gateway audio bytes';
  }
}

function cleanHash(value) {
  const clean = String(value || '').trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(clean) ? clean : '';
}

function canUseTauriInvoke() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
}

function revokeObjectUrl(ref) {
  if (ref.current) {
    URL.revokeObjectURL(ref.current);
    ref.current = '';
  }
}

function serializeError(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || String(error || 'unknown error'),
    status: Number(error?.status || 0),
    reason: error?.reason || error?.code || '',
    correlationId: error?.correlationId || '',
    data: error?.data || null,
  };
}

function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}
