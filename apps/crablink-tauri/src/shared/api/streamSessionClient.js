/**
 * RO:WHAT — Stream-lite session client for CrabLink Tauri.
 * RO:WHY — Bridges local stream control UI to gateway-backed stream session and latest-segment routes.
 * RO:INTERACTS — StreamSessionPanel.jsx, StreamPublishFlow.jsx, AssetContentViewAccess.jsx, Tauri gateway command bridge.
 * RO:INVARIANTS — local helpers never fake b3/live/receipt truth; viewer segment fetch requires backend receipt metadata.
 * RO:METRICS — gateway requests carry correlation IDs through GatewayClient.
 * RO:CONFIG — uses configured gateway URL through the shared gateway client.
 * RO:SECURITY — no stream keys, ingest secrets, capabilities, or spend authority; bounded data URLs only.
 * RO:TEST — npm run build; manual stream descriptor publish, backend start, compositor frame put, paid latest fetch.
 */

import { callTauri } from '../../platform/tauriPlatform.js';

const MAX_STREAM_FRAME_DATA_URL_BYTES = 640 * 1024;
const DEFAULT_CAPTURE_MAX_WIDTH = 640;
const DEFAULT_CAPTURE_QUALITY = 0.72;
const DEFAULT_CAPTURE_SELECTOR =
  '.cl-stream-compositor-canvas[data-capture-ready="true"], .cl-stream-stage-video';

export function startLocalStreamSession({ draft, previewState, pricing }) {
  const intervalSeconds = Number(
    pricing?.intervalSeconds || Number(draft.intervalMinutes || 5) * 60 || 300,
  );

  return callTauri('start_local_stream_session', {
    request: {
      title: String(draft.title || '').trim() || 'Untitled stream',
      channelDisplay: String(draft.channelDisplay || '').trim() || 'Local stream room',
      priceRoc: String(pricing?.priceRoc || draft.priceRoc || '5').replace(/[^0-9]/g, '') || '5',
      intervalSeconds,
      recipientAccount: String(draft.creatorWalletAccount || '').trim(),
      previewSource: String(previewState?.source || 'none'),
      previewLabel: String(previewState?.label || 'No local preview'),
    },
  });
}

export function getLocalStreamSession() {
  return callTauri('get_local_stream_session');
}

export function stopLocalStreamSession(reason = 'Stopped by creator') {
  return callTauri('stop_local_stream_session', { reason });
}

export async function startBackendStreamSession(gateway, {
  streamId,
  assetCrabUrl,
  assetCid,
  manifestCid,
  title,
  creatorAccount,
  creatorPassport,
} = {}) {
  assertGateway(gateway, 'Start backend stream session');
  const safeStreamId = normalizeStreamId(streamId);

  if (!safeStreamId) {
    throw new Error('Backend stream session requires a stream_id from the publish response.');
  }

  return gateway.request(`/streams/${encodeURIComponent(safeStreamId)}/start`, {
    method: 'POST',
    label: 'Start backend stream-lite session',
    mutation: true,
    body: dropEmpty({
      stream_id: safeStreamId,
      asset_crab_url: cleanString(assetCrabUrl),
      asset_cid: cleanString(assetCid),
      manifest_cid: cleanString(manifestCid),
      title: cleanString(title),
      creator_account: cleanString(creatorAccount),
      creator_passport: cleanString(creatorPassport),
    }),
  });
}

export async function stopBackendStreamSession(gateway, streamId, reason = 'Stopped by creator') {
  assertGateway(gateway, 'Stop backend stream session');
  const safeStreamId = normalizeStreamId(streamId);

  if (!safeStreamId) {
    throw new Error('Backend stream stop requires a stream_id.');
  }

  return gateway.request(`/streams/${encodeURIComponent(safeStreamId)}/stop`, {
    method: 'POST',
    label: 'Stop backend stream-lite session',
    mutation: true,
    body: {
      reason: cleanString(reason) || 'Stopped by creator',
    },
  });
}

export async function getBackendStreamStatus(gateway, streamId) {
  assertGateway(gateway, 'Read backend stream status');
  const safeStreamId = normalizeStreamId(streamId);

  if (!safeStreamId) {
    throw new Error('Backend stream status requires a stream_id.');
  }

  return gateway.request(`/streams/${encodeURIComponent(safeStreamId)}/status`, {
    method: 'GET',
    label: 'Backend stream status',
  });
}

export async function publishStreamSnapshotSegment(gateway, {
  streamId,
  assetCrabUrl,
  mediaType = 'image/jpeg',
  dataUrl = '',
  text = '',
  source = 'crablink_tauri_creator_snapshot',
} = {}) {
  assertGateway(gateway, 'Publish stream snapshot segment');
  const safeStreamId = normalizeStreamId(streamId);

  if (!safeStreamId) {
    throw new Error('Stream snapshot requires a stream_id.');
  }

  const cleanDataUrl = cleanString(dataUrl);
  const cleanText = cleanString(text);

  if (!cleanDataUrl && !cleanText) {
    throw new Error('Stream snapshot requires a data URL or text segment.');
  }

  if (cleanDataUrl && (!cleanDataUrl.startsWith('data:') || cleanDataUrl.length > MAX_STREAM_FRAME_DATA_URL_BYTES)) {
    throw new Error('Stream snapshot data URL is too large or invalid for stream-lite v1.');
  }

  return gateway.request(`/streams/${encodeURIComponent(safeStreamId)}/segments`, {
    method: 'POST',
    label: 'Publish stream-lite latest segment',
    mutation: true,
    body: dropEmpty({
      asset_crab_url: cleanString(assetCrabUrl),
      media_type: cleanString(mediaType) || 'image/jpeg',
      data_url: cleanDataUrl,
      text: cleanText,
      source: cleanString(source) || 'crablink_tauri_creator_snapshot',
    }),
  });
}

export async function loadLatestPaidStreamSegment(gateway, {
  streamId,
  assetCrabUrl,
  payerAccount,
  recipientAccount,
  txid,
  receiptHash,
  amountMinor,
} = {}) {
  assertGateway(gateway, 'Load latest paid stream segment');
  const safeStreamId = normalizeStreamId(streamId);

  if (!safeStreamId) {
    throw new Error('Latest stream segment requires a stream_id.');
  }

  return gateway.request(`/streams/${encodeURIComponent(safeStreamId)}/segments/latest`, {
    method: 'POST',
    label: 'Load paid stream-lite latest segment',
    body: dropEmpty({
      asset_crab_url: cleanString(assetCrabUrl),
      payer_account: cleanString(payerAccount),
      recipient_account: cleanString(recipientAccount),
      txid: cleanString(txid),
      receipt_hash: cleanString(receiptHash),
      amount_minor: cleanString(amountMinor),
    }),
  });
}

export function captureCurrentStreamPreviewFrame({
  selector = DEFAULT_CAPTURE_SELECTOR,
  maxWidth = DEFAULT_CAPTURE_MAX_WIDTH,
  quality = DEFAULT_CAPTURE_QUALITY,
} = {}) {
  const compositor = document.querySelector('.cl-stream-compositor-canvas[data-capture-ready="true"]');
  const requested = document.querySelector(selector || DEFAULT_CAPTURE_SELECTOR);
  const source = compositor || requested;

  if (!source) {
    throw new Error('No local stream preview canvas or video element was found.');
  }

  if (isCanvasElement(source)) {
    return captureCanvasFrame(source, {
      maxWidth,
      quality,
      sourceKind: 'composited_canvas',
    });
  }

  return captureVideoFrame(source, {
    maxWidth,
    quality,
    sourceKind: 'raw_video_fallback',
  });
}

export function buildBackendLaunchRequestPreview({ draft, previewState, pricing }) {
  return {
    schema: 'crablink.future-stream-backend-launch-request-preview.v1',
    route: 'crab://stream',
    status: 'preview_only_backend_not_wired',
    title: String(draft.title || '').trim() || 'Untitled stream',
    channel_display: String(draft.channelDisplay || '').trim(),
    host_display: String(draft.hostDisplay || '').trim(),
    stream_kind: draft.streamKind,
    source_mode: draft.sourceMode,
    preview: {
      source: previewState?.source || 'none',
      label: previewState?.label || 'No local preview',
      status: previewState?.status || 'idle',
      sent_to_backend: false,
      compositor: previewState?.compositor || null,
    },
    access_policy: {
      action: 'stream_watch_interval',
      asset: 'roc',
      price_roc: String(pricing?.priceRoc || draft.priceRoc || '5'),
      interval_seconds: Number(pricing?.intervalSeconds || 300),
      grace_seconds: Number(pricing?.graceSeconds || 0),
      free_preview_seconds: Number(pricing?.freePreviewSeconds || 0),
      manual_renew_only: true,
      autopay_enabled: false,
      backend_confirmed: false,
    },
    truth_boundary: {
      backend_stream_created: false,
      b3_minted: false,
      crab_url_created: false,
      receipt_created: false,
      wallet_mutated: false,
      viewer_count_confirmed: false,
    },
  };
}

function captureCanvasFrame(canvas, { maxWidth, quality, sourceKind }) {
  if (!canvas.width || !canvas.height) {
    throw new Error('Local stream compositor canvas is not ready to capture a frame.');
  }

  const scale = Math.min(1, Number(maxWidth || DEFAULT_CAPTURE_MAX_WIDTH) / canvas.width);
  const width = Math.max(1, Math.round(canvas.width * scale));
  const height = Math.max(1, Math.round(canvas.height * scale));
  const out = document.createElement('canvas');

  out.width = width;
  out.height = height;

  const context = out.getContext('2d');

  if (!context) {
    throw new Error('Canvas capture is unavailable in this WebView.');
  }

  context.drawImage(canvas, 0, 0, width, height);

  return encodeCapturedCanvas(out, {
    width,
    height,
    quality,
    sourceKind,
  });
}

function captureVideoFrame(video, { maxWidth, quality, sourceKind }) {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error('Local stream preview is not ready to capture a frame.');
  }

  const scale = Math.min(1, Number(maxWidth || DEFAULT_CAPTURE_MAX_WIDTH) / video.videoWidth);
  const width = Math.max(1, Math.round(video.videoWidth * scale));
  const height = Math.max(1, Math.round(video.videoHeight * scale));
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas capture is unavailable in this WebView.');
  }

  context.drawImage(video, 0, 0, width, height);

  return encodeCapturedCanvas(canvas, {
    width,
    height,
    quality,
    sourceKind,
  });
}

function encodeCapturedCanvas(canvas, { width, height, quality, sourceKind }) {
  const dataUrl = canvas.toDataURL('image/jpeg', Number(quality || DEFAULT_CAPTURE_QUALITY));

  if (!dataUrl.startsWith('data:image/jpeg') || dataUrl.length > MAX_STREAM_FRAME_DATA_URL_BYTES) {
    throw new Error('Captured stream frame is too large for stream-lite v1. Lower quality or max width.');
  }

  return {
    schema: 'crablink.stream-lite-captured-frame.v1',
    mediaType: 'image/jpeg',
    dataUrl,
    width,
    height,
    source: sourceKind,
    capturedAt: new Date().toISOString(),
    truth_boundary:
      'This is a local preview frame. It becomes viewer-visible only after backend segment route accepts it and viewer supplies backend wallet receipt proof.',
  };
}

function isCanvasElement(value) {
  return typeof HTMLCanvasElement !== 'undefined' && value instanceof HTMLCanvasElement;
}

function assertGateway(gateway, label) {
  if (!gateway?.request) {
    throw new Error(`${label} requires the configured gateway client.`);
  }
}

function normalizeStreamId(value) {
  const clean = cleanString(value);

  if (/^[A-Za-z0-9_-]{1,96}$/.test(clean)) {
    return clean;
  }

  return '';
}

function dropEmpty(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, child]) => {
      if (child === undefined || child === null) return false;
      if (typeof child === 'string' && !child.trim()) return false;
      return true;
    }),
  );
}

function cleanString(value) {
  return String(value ?? '').trim();
}