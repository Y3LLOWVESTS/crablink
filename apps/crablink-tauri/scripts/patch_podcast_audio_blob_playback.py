#!/usr/bin/env python3
# RO:WHAT — Patch music/podcast asset playback to use receipt-gated blob fetch instead of direct typed route playback.
# RO:WHY — .podcast content_view now unlocks, but direct <audio src=/b3/...podcast> can hit JSON/typed routes or missing MIME.
# RO:INVARIANTS — no fake unlock; audio bytes are fetched only after content_view canView is true; no silent ROC spend.
# RO:TEST — npm run build; open paid .podcast as wallet B; pay; confirm audio blob diagnostics/player.

from pathlib import Path

PATH = Path("src/pages/asset/AssetHydratedView.jsx")


def load(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"missing file: {path}")
    return path.read_text()


def save(path: Path, text: str) -> None:
    path.write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            print(f"skip {label}: already patched")
            return text
        raise SystemExit(f"{label}: marker not found")

    print(f"patch {label}")
    return text.replace(old, new, 1)


def insert_before_once(text: str, marker: str, insertion: str, label: str) -> str:
    if insertion.strip() in text:
        print(f"skip {label}: already patched")
        return text

    count = text.count(marker)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 marker, found {count}")

    print(f"patch {label}")
    return text.replace(marker, insertion + marker, 1)


text = load(PATH)

text = replace_once(
    text,
    "const MAX_VIDEO_BLOB_PREVIEW_BYTES = 12 * 1024 * 1024;\n",
    "const MAX_VIDEO_BLOB_PREVIEW_BYTES = 12 * 1024 * 1024;\nconst MAX_AUDIO_BLOB_PREVIEW_BYTES = 50 * 1024 * 1024;\n",
    "audio preview byte cap",
)

text = replace_once(
    text,
    """  const [videoFetchState, setVideoFetchState] = useState({
    status: 'idle',
    source: null,
    attempts: [],
    error: null,
  });
  const [previewIndex, setPreviewIndex] = useState(0);""",
    """  const [videoFetchState, setVideoFetchState] = useState({
    status: 'idle',
    source: null,
    attempts: [],
    error: null,
  });
  const [audioObjectUrl, setAudioObjectUrl] = useState('');
  const audioObjectUrlRef = useRef('');
  const [audioFetchState, setAudioFetchState] = useState({
    status: 'idle',
    source: null,
    attempts: [],
    error: null,
  });
  const [previewIndex, setPreviewIndex] = useState(0);""",
    "audio blob state",
)

text = replace_once(
    text,
    """  const previewSource = previewSources[previewIndex] || null;
  const previewUrl = previewSource?.url ? withCacheBuster(previewSource.url, previewRevision) : '';
  const videoPlaybackUrl = videoObjectUrl || previewUrl;""",
    """  const previewSource = previewSources[previewIndex] || null;
  const previewUrl = previewSource?.url ? withCacheBuster(previewSource.url, previewRevision) : '';
  const videoPlaybackUrl = videoObjectUrl || previewUrl;
  const audioPlaybackUrl = audioObjectUrl || previewUrl;""",
    "audio playback url",
)

text = replace_once(
    text,
    """    setVideoFetchState({
      status: 'idle',
      source: null,
      attempts: [],
      error: null,
    });
    setOwnedVideoObjectUrl('');
  }, [summary.hash, summary.kind, summary.crabUrl]);""",
    """    setVideoFetchState({
      status: 'idle',
      source: null,
      attempts: [],
      error: null,
    });
    setAudioFetchState({
      status: 'idle',
      source: null,
      attempts: [],
      error: null,
    });
    setOwnedVideoObjectUrl('');
    setOwnedAudioObjectUrl('');
  }, [summary.hash, summary.kind, summary.crabUrl]);""",
    "reset audio fetch on route change",
)

text = replace_once(
    text,
    """  useEffect(() => {
    return () => {
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
        videoObjectUrlRef.current = '';
      }
    };
  }, []);""",
    """  useEffect(() => {
    return () => {
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
        videoObjectUrlRef.current = '';
      }

      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = '';
      }
    };
  }, []);""",
    "cleanup audio object url",
)

audio_effect = r'''  useEffect(() => {
    let alive = true;

    async function run() {
      if (!canPreviewAudio || !summary.hash || !assetClient?.gateway?.request) {
        setAudioFetchState({
          status: 'idle',
          source: null,
          attempts: [],
          error: null,
        });
        setOwnedAudioObjectUrl('');
        return;
      }

      const routes = audioBlobRoutes(summary);

      if (routes.length === 0) {
        setAudioFetchState({
          status: 'error',
          source: null,
          attempts: [],
          error: new Error('No gateway audio byte route was available.'),
        });
        setOwnedAudioObjectUrl('');
        return;
      }

      setAudioFetchState({
        status: 'loading',
        source: null,
        attempts: [],
        error: null,
      });

      const attempts = [];

      for (const routeCandidate of routes) {
        try {
          const response = await assetClient.gateway.request(routeCandidate.route, {
            label: `${audioKindName} playback bytes`,
            parseAs: 'blob',
            headers: {
              Accept: audioAcceptHeader(summary.contentType, summary.kind),
            },
          });

          const blob = await normalizeAudioBlobResponse(response?.data, summary.contentType, summary.kind);

          if (blob.size > MAX_AUDIO_BLOB_PREVIEW_BYTES) {
            throw new Error(
              `Audio playback blob exceeded ${formatBytes(MAX_AUDIO_BLOB_PREVIEW_BYTES)}. Future range/segment playback is required.`,
            );
          }

          const objectUrl = URL.createObjectURL(blob);

          attempts.push({
            route: routeCandidate.route,
            label: routeCandidate.label,
            status: response?.status || 0,
            ok: true,
            bytes: blob.size,
            contentType: blob.type || summary.contentType || '',
          });

          if (!alive) {
            URL.revokeObjectURL(objectUrl);
            return;
          }

          setOwnedAudioObjectUrl(objectUrl);
          setAudioFetchState({
            status: 'ready',
            source: {
              route: routeCandidate.route,
              label: routeCandidate.label,
              status: response?.status || 0,
              bytes: blob.size,
              contentType: blob.type || summary.contentType || '',
              correlationId: response?.correlationId || '',
            },
            attempts,
            error: null,
          });
          return;
        } catch (error) {
          attempts.push({
            route: routeCandidate.route,
            label: routeCandidate.label,
            ok: false,
            error: serializeError(error),
          });
        }
      }

      if (!alive) {
        return;
      }

      setOwnedAudioObjectUrl('');
      setAudioFetchState({
        status: 'error',
        source: null,
        attempts,
        error: attempts[attempts.length - 1]?.error || new Error('Audio byte fetch failed.'),
      });
    }

    void run();

    return () => {
      alive = false;
    };
  }, [
    assetClient,
    audioKindName,
    canPreviewAudio,
    summary.cid,
    summary.contentType,
    summary.hash,
    summary.kind,
    summary.rawUrl,
  ]);

  function setOwnedAudioObjectUrl(nextUrl) {
    const previous = audioObjectUrlRef.current;

    if (previous && previous !== nextUrl) {
      URL.revokeObjectURL(previous);
    }

    audioObjectUrlRef.current = nextUrl || '';
    setAudioObjectUrl(nextUrl || '');
  }

'''

text = insert_before_once(
    text,
    "  function setOwnedVideoObjectUrl(nextUrl) {",
    audio_effect,
    "audio blob fetch effect",
)

start_marker = "      {(summary.isMusicRoute || summary.isPodcastRoute) && (\n        <Card\n          eyebrow=\"Playback\""
end_marker = "\n\n      <section className=\"asset-detail-grid\" aria-label=\"Asset details\">"

start = text.find(start_marker)
if start == -1:
    raise SystemExit("audio card start marker not found")

end = text.find(end_marker, start)
if end == -1:
    raise SystemExit("audio card end marker not found")

new_card = r'''      {(summary.isMusicRoute || summary.isPodcastRoute) && (
        <Card
          eyebrow="Playback"
          title={`${audioKindName} playback`}
          className="asset-preview-card"
          actions={
            <div className="asset-copy-actions">
              <Button variant="secondary" onClick={reloadPreview} disabled={!canPreviewAudio || audioFetchState.status === 'loading'}>
                {audioFetchState.status === 'loading' ? 'Loading audio…' : 'Reload audio'}
              </Button>
              <Button
                variant="secondary"
                onClick={openPreviewSource}
                disabled={!canPreviewAudio || !(audioFetchState.source?.route || previewSource?.url)}
              >
                Open source
              </Button>
            </div>
          }
        >
          {canPreviewAudio && audioFetchState.status === 'ready' && audioPlaybackUrl ? (
            <div className="asset-audio-preview-shell">
              <audio
                src={audioPlaybackUrl}
                controls
                preload="metadata"
                onError={() => {
                  setOwnedAudioObjectUrl('');
                  setAudioFetchState((current) => ({
                    ...current,
                    status: 'error',
                    error: new Error(
                      `${audioKindName} bytes were fetched, but this WebView could not decode ${current.source?.contentType || 'the returned audio format'}.`,
                    ),
                  }));
                }}
              >
                Your browser/WebView cannot play this gateway {audioKindLower} asset.
              </audio>
            </div>
          ) : (
            <div className="asset-preview-empty">
              <strong>
                {canPreviewAudio
                  ? audioFetchState.status === 'loading'
                    ? `Loading ${audioKindLower} bytes from the gateway…`
                    : `${audioKindName} bytes were not previewable from the gateway.`
                  : `${audioKindName} playback is locked until paid.`}
              </strong>
              <span>
                {canPreviewAudio
                  ? `The asset hydrated and paid content_view succeeded, but the ${audioKindLower} byte route did not produce a decodable audio blob yet. Check the diagnostics below; if the fetched type is audio/webm on macOS, the next fix is to record podcast takes as WAV/AAC before minting.`
                  : `The ${audioPlaybackNoun} metadata is visible, but CrabLink will not fetch or play audio bytes until the backend returns a paid content_view receipt.`}
              </span>
            </div>
          )}

          <div className="asset-preview-source-strip" aria-label={`${audioKindName} preview source`}>
            <div>
              <span>Current source</span>
              <strong>
                {canPreviewAudio
                  ? audioFetchState.source?.label || previewSource?.label || 'No source'
                  : 'Locked'}
              </strong>
            </div>
            <div>
              <span>Source URL</span>
              <strong>
                {canPreviewAudio
                  ? audioFetchState.source?.route || previewSource?.url || 'n/a'
                  : 'Hidden until paid'}
              </strong>
            </div>
            <div>
              <span>Preview mode</span>
              <strong>{canPreviewAudio ? audioModeLabel(audioFetchState.status) : 'paid view gate'}</strong>
            </div>
          </div>

          {summary.isPodcastRoute && (
            <TruthBoundary
              tone={canPreviewAudio && audioFetchState.status === 'ready' ? 'success' : 'warning'}
              title={
                canPreviewAudio && audioFetchState.status === 'ready'
                  ? 'Backend receipt unlocked this podcast episode'
                  : canPreviewAudio
                    ? 'Podcast bytes are unlocked but not decoded yet'
                    : 'Podcast audio is still gated'
              }
              copy={
                canPreviewAudio && audioFetchState.status === 'ready'
                  ? 'This podcast player appears only after the backend content_view path returned a paid receipt and the gateway returned audio bytes. Local receipt memory is display-only and cannot unlock playback by itself.'
                  : canPreviewAudio
                    ? 'The backend receipt is valid, but CrabLink still needs a playable gateway audio blob. This is a media/codec or raw-object route issue, not a wallet issue.'
                    : 'Podcast metadata can be displayed before payment, but CrabLink will not reveal or fetch the audio source until a backend receipt unlocks this content view.'
              }
            />
          )}

          {canPreviewAudio && audioFetchState.status !== 'idle' && (
            <details className="asset-preview-fallbacks" open={audioFetchState.status === 'error'}>
              <summary>Audio byte fetch diagnostics</summary>
              <div>
                <span>Status</span>
                <strong>{audioFetchState.status}</strong>
              </div>
              {audioFetchState.source && (
                <div>
                  <span>Blob source</span>
                  <strong>
                    {audioFetchState.source.route} · {formatBytes(audioFetchState.source.bytes)} ·{' '}
                    {audioFetchState.source.contentType || 'unknown type'}
                  </strong>
                </div>
              )}
              {audioFetchState.error && (
                <div>
                  <span>Error</span>
                  <strong>{audioFetchState.error.message || String(audioFetchState.error)}</strong>
                </div>
              )}
              {audioFetchState.attempts.map((attempt, index) => (
                <div key={`${attempt.route}:${index}`}>
                  <span>{attempt.label || `Attempt ${index + 1}`}</span>
                  <strong>
                    {attempt.ok
                      ? `${attempt.route} · ${formatBytes(attempt.bytes)} · ${attempt.contentType || 'unknown type'}`
                      : `${attempt.route} · ${attempt.error?.message || 'failed'}`}
                  </strong>
                </div>
              ))}
            </details>
          )}

          {canPreviewAudio && failedPreviewSources.length > 0 && (
            <details className="asset-preview-fallbacks">
              <summary>Failed direct audio element attempts</summary>
              {failedPreviewSources.map((source, index) => (
                <div key={`${source.key}:${index}`}>
                  <span>{source.label}</span>
                  <strong>{source.url}</strong>
                </div>
              ))}
            </details>
          )}
        </Card>
      )}'''

text = text[:start] + new_card + text[end:]

helpers = r'''
function audioBlobRoutes(summary = {}) {
  const candidates = [
    { route: summary.rawUrl, label: 'Resolved raw audio URL' },
    { route: summary.cid ? `/o/${summary.cid}` : '', label: 'Content ID object' },
    { route: summary.hash ? `/o/b3:${summary.hash}` : '', label: 'Hash object' },
    { route: summary.hash && summary.kind ? `/b3/${summary.hash}.${summary.kind}` : '', label: 'Typed b3 route fallback' },
  ];

  const seen = new Set();
  const out = [];

  for (const candidate of candidates) {
    const route = normalizeGatewayRoute(candidate.route);

    if (!route || seen.has(route)) {
      continue;
    }

    seen.add(route);
    out.push({
      route,
      label: candidate.label,
    });
  }

  return out;
}

function audioAcceptHeader(contentType, kind = 'music') {
  const clean = String(contentType || '').trim();

  if (clean.toLowerCase().startsWith('audio/')) {
    return `${clean},audio/*,*/*`;
  }

  return kind === 'podcast'
    ? 'audio/wav,audio/mp4,audio/aac,audio/mpeg,audio/webm,audio/ogg,audio/*,*/*'
    : 'audio/mpeg,audio/mp4,audio/wav,audio/*,*/*';
}

async function normalizeAudioBlobResponse(blob, contentType, kind = 'music') {
  if (!(blob instanceof Blob)) {
    throw new Error('Gateway did not return an audio blob.');
  }

  if (blob.size <= 0) {
    throw new Error('Gateway returned an empty audio blob.');
  }

  const returnedType = String(blob.type || '').toLowerCase();

  if (returnedType.includes('json') || returnedType.startsWith('text/')) {
    const text = await blob.text();
    throw new Error(`Gateway returned non-audio data: ${text.slice(0, 180)}`);
  }

  if (returnedType.startsWith('audio/')) {
    return blob;
  }

  const bytes = await blob.arrayBuffer();
  const sniffedType = sniffAudioContentType(bytes);
  const inferredType = sniffedType || inferAudioContentType(contentType, kind);

  return new Blob([bytes], {
    type: inferredType,
  });
}

function sniffAudioContentType(buffer) {
  const bytes = new Uint8Array(buffer || new ArrayBuffer(0));

  if (bytes.length >= 12) {
    const riff = ascii(bytes, 0, 4);
    const wave = ascii(bytes, 8, 4);

    if (riff === 'RIFF' && wave === 'WAVE') {
      return 'audio/wav';
    }

    const ftyp = ascii(bytes, 4, 4);

    if (ftyp === 'ftyp') {
      return 'audio/mp4';
    }
  }

  if (bytes.length >= 4) {
    const prefix4 = ascii(bytes, 0, 4);

    if (prefix4 === 'OggS') {
      return 'audio/ogg';
    }

    if (prefix4 === 'ID3\x03' || prefix4 === 'ID3\x04') {
      return 'audio/mpeg';
    }
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return 'audio/mpeg';
  }

  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return 'audio/webm';
  }

  return '';
}

function ascii(bytes, start, length) {
  let out = '';

  for (let index = start; index < start + length && index < bytes.length; index += 1) {
    out += String.fromCharCode(bytes[index]);
  }

  return out;
}

function inferAudioContentType(contentType, kind = 'music') {
  const clean = String(contentType || '').trim().toLowerCase();

  if (clean.startsWith('audio/')) {
    return clean;
  }

  return kind === 'podcast' ? 'audio/webm' : 'audio/mpeg';
}

function audioModeLabel(status) {
  switch (status) {
    case 'loading':
      return 'paid blob fetch loading';
    case 'ready':
      return 'paid blob playback';
    case 'error':
      return 'audio blob unavailable';
    default:
      return 'gateway audio bytes';
  }
}

'''

text = insert_before_once(
    text,
    "function videoBlobRoutes(summary = {}) {",
    helpers,
    "audio blob helper functions",
)

save(PATH, text)

print("patched receipt-gated audio blob playback")
