/**
 * RO:WHAT — Tauri local stream-room session client.
 * RO:WHY — Gives stream UI a launch/stop/status loop before backend stream routes exist.
 * RO:INTERACTS — StreamSessionPanel.jsx, Tauri stream commands.
 * RO:INVARIANTS — local display state only; no fake b3; no backend live claim; no receipt; no ROC mutation.
 * RO:METRICS — none.
 * RO:CONFIG — uses local draft fields only.
 * RO:SECURITY — never sends ingest secrets, stream keys, capabilities, or spend authority.
 * RO:TEST — npm build plus manual crab://stream launch/stop smoke.
 */

import { callTauri } from '../../platform/tauriPlatform.js';

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