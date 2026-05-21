#!/usr/bin/env python3
# RO:WHAT — Add a bounded Tauri Rust byte bridge for paid music/podcast playback.
# RO:WHY — WebView direct fetch/audio loading can fail for gateway /o/b3:<hash>; Rust can fetch gateway bytes and React can play a typed Blob URL.
# RO:INVARIANTS — gateway-first; fetch only /o/b3:<64hex>; React calls this only after backend content_view receipt; no wallet mutation.
# RO:TEST — npm run build; npm run check:rust:mac-media; paid .podcast page shows audio player.

from pathlib import Path
import re

ROOT = Path.cwd()

ASSETS_RS = ROOT / "src-tauri/src/commands/assets.rs"
LIB_RS = ROOT / "src-tauri/src/lib.rs"
ASSET_VIEW = ROOT / "src/pages/asset/AssetHydratedView.jsx"
AUDIO_PLAYER = ROOT / "src/pages/asset/AssetPaidAudioPlayer.jsx"


def load(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"missing file: {path}")
    return path.read_text()


def save(path: Path, text: str) -> None:
    path.write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        print(f"skip {label}: already patched")
        return text

    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")

    print(f"patch {label}")
    return text.replace(old, new, 1)


def insert_after_once(text: str, marker: str, insertion: str, label: str) -> str:
    if insertion.strip() in text:
        print(f"skip {label}: already patched")
        return text

    count = text.count(marker)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 marker, found {count}")

    print(f"patch {label}")
    return text.replace(marker, marker + insertion, 1)


def insert_before_once(text: str, marker: str, insertion: str, label: str) -> str:
    if insertion.strip() in text:
        print(f"skip {label}: already patched")
        return text

    count = text.count(marker)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 marker, found {count}")

    print(f"patch {label}")
    return text.replace(marker, insertion + marker, 1)


# ---------------------------------------------------------------------------
# 1) New React component: receipt-gated audio bytes via Tauri Rust command.
# ---------------------------------------------------------------------------

AUDIO_PLAYER.write_text(r'''/**
 * RO:WHAT — Receipt-gated paid audio player for .music and .podcast asset pages.
 * RO:WHY — Browser/WebView direct media loading can fail for gateway /o/b3:<hash>; Tauri Rust fetches bounded bytes and React plays a typed Blob URL.
 * RO:INTERACTS — AssetHydratedView.jsx, Tauri fetch_asset_bytes_gateway command, svc-gateway /o/b3:<hash>.
 * RO:INVARIANTS — called only after backend content_view canView; no fake receipt; no wallet mutation; no direct storage/index call.
 * RO:SECURITY — allowlisted gateway object route only on Rust side; object URL revoked; bounded byte cap.
 * RO:TEST — paid crab://<hash>.music and crab://<hash>.podcast pages unlock player after receipt.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
    const response = await invoke('fetch_asset_bytes_gateway', {
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
''')

print("wrote AssetPaidAudioPlayer.jsx")


# ---------------------------------------------------------------------------
# 2) Patch AssetHydratedView to use the new component for music/podcast.
# ---------------------------------------------------------------------------

asset_view = load(ASSET_VIEW)

asset_view = insert_after_once(
    asset_view,
    "import AssetContentViewAccess from './AssetContentViewAccess.jsx';\n",
    "import AssetPaidAudioPlayer from './AssetPaidAudioPlayer.jsx';\n",
    "AssetHydratedView import AssetPaidAudioPlayer",
)

start = asset_view.find("      {(summary.isMusicRoute || summary.isPodcastRoute) && (")
end_marker = '\n\n      <section className="asset-detail-grid" aria-label="Asset details">'
end = asset_view.find(end_marker, start)

if start == -1 or end == -1:
    raise SystemExit("AssetHydratedView audio card block not found")

replacement = """      {(summary.isMusicRoute || summary.isPodcastRoute) && (
        <AssetPaidAudioPlayer
          summary={summary}
          canPreviewAudio={canPreviewAudio}
          assetClient={assetClient}
          audioKindName={audioKindName}
          audioKindLower={audioKindLower}
          audioPlaybackNoun={audioPlaybackNoun}
        />
      )}"""

asset_view = asset_view[:start] + replacement + asset_view[end:]

save(ASSET_VIEW, asset_view)
print("patched AssetHydratedView audio card")


# ---------------------------------------------------------------------------
# 3) Patch Tauri Rust asset commands with bounded gateway byte fetch.
# ---------------------------------------------------------------------------

assets_rs = load(ASSETS_RS)

assets_rs = insert_after_once(
    assets_rs,
    "const MAX_MUSIC_UPLOAD_BYTES: usize = 25 * 1024 * 1024;\n",
    "const MAX_ASSET_BYTES_FETCH_BYTES: usize = 10 * 1024 * 1024;\n",
    "assets.rs audio fetch byte cap",
)

fetch_structs_and_command = r'''
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetBytesFetchRequest {
    pub route: String,
    pub accept: Option<String>,
    pub content_type_hint: Option<String>,
    pub max_bytes: Option<usize>,
    pub headers: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetBytesFetchResponse {
    pub schema: &'static str,
    pub method: &'static str,
    pub route: String,
    pub status: u16,
    pub ok: bool,
    pub correlation_id: String,
    pub content_type: String,
    pub bytes: usize,
    pub body_bytes: Vec<u8>,
}

/// Fetch bounded raw asset bytes through the configured public gateway.
///
/// This exists because binary media preview through the generic JSON/text
/// gateway bridge is intentionally disabled, while WebView direct media fetches
/// can fail with opaque `Load failed` errors. The command is still
/// gateway-first and route-allowlisted: it only fetches `/o/b3:<64hex>`.
#[tauri::command]
pub async fn fetch_asset_bytes_gateway(
    state: State<'_, AppState>,
    request: AssetBytesFetchRequest,
) -> Result<AssetBytesFetchResponse, String> {
    let route = normalize_asset_bytes_route(&request.route)?;
    let max_bytes = request
        .max_bytes
        .unwrap_or(MAX_ASSET_BYTES_FETCH_BYTES)
        .min(MAX_ASSET_BYTES_FETCH_BYTES);

    let request_headers = request.headers.unwrap_or_default();

    let (base_url, timeout_ms, default_passport, default_wallet) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| "settings lock poisoned".to_string())?;

        (
            normalize_base_url(&settings.gateway_url),
            settings.request_timeout_ms.min(30_000),
            settings.passport_label.clone(),
            settings.wallet_account.clone(),
        )
    };

    let correlation_id = header_value(&request_headers, "x-correlation-id")
        .unwrap_or_else(|| "crablink-tauri-asset-bytes".to_string());

    let mut builder = state
        .http
        .get(format!("{base_url}{route}"))
        .timeout(Duration::from_millis(timeout_ms))
        .header("x-correlation-id", correlation_id.clone())
        .header(
            "Accept",
            request
                .accept
                .as_deref()
                .unwrap_or("audio/*,video/*,application/octet-stream,*/*"),
        );

    let effective_passport =
        effective_header_or_default(&request_headers, "x-ron-passport", &default_passport);
    let effective_wallet =
        effective_header_or_default(&request_headers, "x-ron-wallet-account", &default_wallet);

    if let Some(passport) = effective_passport {
        builder = builder.header("x-ron-passport", passport);
    }

    if let Some(wallet) = effective_wallet {
        builder = builder.header("x-ron-wallet-account", wallet);
    }

    for (raw_name, raw_value) in request_headers {
        if should_skip_asset_bytes_header(&raw_name) {
            continue;
        }

        if let (Some(name), Some(value)) = (
            sanitize_header_name(&raw_name),
            sanitize_header_value(&raw_value),
        ) {
            builder = builder.header(name, value);
        }
    }

    let response = builder
        .send()
        .await
        .map_err(|err| format!("asset byte gateway request failed: {}", redact_error(&err.to_string())))?;

    let status = response.status().as_u16();
    let response_headers = response.headers().clone();

    if let Some(content_length) = response.content_length() {
        if content_length > max_bytes as u64 {
            return Err(format!(
                "asset byte response is too large for the MVP bridge: {} bytes > {} bytes",
                content_length, max_bytes
            ));
        }
    }

    let returned_correlation_id = response_headers
        .get("x-correlation-id")
        .and_then(|value| value.to_str().ok())
        .unwrap_or(correlation_id.as_str())
        .to_string();

    let response_content_type = response_headers
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_string();

    let mut content_type = response_content_type.trim().to_string();
    let hint = request.content_type_hint.unwrap_or_default();

    if content_type.is_empty()
        || content_type.eq_ignore_ascii_case("application/octet-stream")
        || content_type.to_ascii_lowercase().starts_with("application/octet-stream")
    {
        let clean_hint = hint.trim();

        if clean_hint.starts_with("audio/") || clean_hint.starts_with("video/") {
            content_type = clean_hint.to_string();
        }
    }

    if content_type.is_empty() {
        content_type = "application/octet-stream".to_string();
    }

    let body = response
        .bytes()
        .await
        .map_err(|err| format!("asset byte gateway response read failed: {}", redact_error(&err.to_string())))?;

    if body.len() > max_bytes {
        return Err(format!(
            "asset byte response is too large for the MVP bridge: {} bytes > {} bytes",
            body.len(),
            max_bytes
        ));
    }

    Ok(AssetBytesFetchResponse {
        schema: "crablink.tauri.asset-bytes-fetch-response.v1",
        method: "GET",
        route,
        status,
        ok: (200..300).contains(&status),
        correlation_id: returned_correlation_id,
        content_type,
        bytes: body.len(),
        body_bytes: body.to_vec(),
    })
}

'''

assets_rs = insert_after_once(
    assets_rs,
    '''#[derive(Debug, Serialize)]
pub struct PaidAssetUploadResponse {
    pub schema: &'static str,
    pub method: &'static str,
    pub route: &'static str,
    pub status: u16,
    pub ok: bool,
    pub correlation_id: String,
    pub content_type: String,
    pub data: Value,
}

''',
    fetch_structs_and_command,
    "assets.rs fetch_asset_bytes_gateway command",
)

fetch_helpers = r'''
fn normalize_asset_bytes_route(value: &str) -> Result<String, String> {
    let raw = value.trim();

    if raw.is_empty() {
        return Err("asset byte fetch requires a gateway object route".to_string());
    }

    if raw.starts_with("http://") || raw.starts_with("https://") {
        return Err("asset byte fetch route must be a gateway path, not an absolute URL".to_string());
    }

    let path = raw.split('?').next().unwrap_or(raw).trim();

    if let Some(hash) = path.strip_prefix("/o/b3:") {
        let clean = hash.to_ascii_lowercase();

        if is_hex_64(&clean) {
            return Ok(format!("/o/b3:{clean}"));
        }
    }

    if let Some(hash) = path.strip_prefix("/o/") {
        let clean = hash.to_ascii_lowercase();

        if is_hex_64(&clean) {
            return Ok(format!("/o/b3:{clean}"));
        }
    }

    Err("asset byte fetch only allows /o/b3:<64 lowercase hex>".to_string())
}

fn is_hex_64(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn should_skip_asset_bytes_header(name: &str) -> bool {
    matches!(
        name.trim().to_ascii_lowercase().as_str(),
        "host"
            | "connection"
            | "content-length"
            | "transfer-encoding"
            | "upgrade"
            | "proxy-authorization"
            | "proxy-authenticate"
            | "accept"
            | "x-correlation-id"
            | "x-ron-passport"
            | "x-ron-wallet-account"
    )
}

'''

assets_rs = insert_before_once(
    assets_rs,
    "fn normalize_base_url(value: &str) -> String {",
    fetch_helpers,
    "assets.rs asset byte fetch helpers",
)

save(ASSETS_RS, assets_rs)


# ---------------------------------------------------------------------------
# 4) Register Tauri command.
# ---------------------------------------------------------------------------

lib_rs = load(LIB_RS)

lib_rs = replace_once(
    lib_rs,
    "            commands::assets::upload_music_asset_gateway,\n",
    "            commands::assets::upload_music_asset_gateway,\n            commands::assets::fetch_asset_bytes_gateway,\n",
    "lib.rs register fetch_asset_bytes_gateway",
)

save(LIB_RS, lib_rs)

print("patched Tauri paid audio byte bridge")
