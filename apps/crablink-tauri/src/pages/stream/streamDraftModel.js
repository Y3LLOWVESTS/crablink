/**
 * RO:WHAT — Local stream draft model, stats, and manifest shaping for crab://stream.
 * RO:WHY — Keeps the stream control-room UI honest while backend stream/session routes are still future work.
 * RO:INTERACTS — StreamPage, StreamDraft, StreamPricingPanel, StreamSessionPanel, future /streams routes.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake live state; no receipt; no wallet mutation; no silent spend.
 * RO:METRICS — none; future backend stream routes must expose gateway/wallet/receipt metrics.
 * RO:CONFIG — page may prefill labels from app settings, but backend truth remains absent here.
 * RO:SECURITY — no private ingest token, local path, seed, capability, or spend authority is modeled here.
 * RO:TEST — npm run build plus manual crab://stream route smoke.
 */

export const DEFAULT_STREAM_DRAFT = Object.freeze({
  title: '',
  channelDisplay: '',
  hostDisplay: '',
  description: '',
  streamNotes: '',
  streamKind: 'live_video',
  category: 'independent',
  language: 'en',
  scheduleMode: 'draft_unscheduled',
  startWindow: '',
  timezone: 'local',
  durationGoal: '',
  sourceMode: 'local_camera_or_screen_preview',
  ingestMode: 'not_wired_local_preview',
  captureAudio: 'off',
  accessMode: 'paid_interval_manual_renew',
  priceRoc: '5',
  intervalMinutes: '5',
  graceSeconds: '15',
  freePreviewSeconds: '0',
  renewPromptSeconds: '30',
  creatorWalletAccount: '',
  replayMode: 'replay_asset_future',
  chatMode: 'chat_placeholder_future',
  chatWelcome: '',
  moderationMode: 'site_policy_or_creator_default',
  rightsMode: 'creator_owned_original',
  payoutMode: 'creator_wallet_future',
  coverImageCrabUrl: '',
  posterImageCrabUrl: '',
  trailerVideoCrabUrl: '',
  replayVideoCrabUrl: '',
  siteContextCrabUrl: '',
  podcastMode: 'disabled',
  podcastTitle: '',
  podcastDescription: '',
  podcastOutputCrabUrl: '',
  podcastTranscriptCrabUrl: '',
  tags: 'stream, live, creator',
  contentWarning: '',
});

export const DEFAULT_PREVIEW_STATE = Object.freeze({
  status: 'idle',
  source: 'none',
  label: 'No local preview',
  hasAudio: false,
  error: '',
});

export function buildStreamStats(draft, previewState = DEFAULT_PREVIEW_STATE) {
  const tagList = String(draft.tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const linkedAssetCount = [
    draft.coverImageCrabUrl,
    draft.posterImageCrabUrl,
    draft.trailerVideoCrabUrl,
    draft.replayVideoCrabUrl,
    draft.siteContextCrabUrl,
    draft.podcastOutputCrabUrl,
    draft.podcastTranscriptCrabUrl,
  ].filter((value) => String(value || '').trim()).length;

  const pricing = normalizeStreamPricing(draft);

  return {
    tags: tagList,
    linkedAssetCount,
    pricing,
    previewStatus: previewState.status,
    previewSource: previewState.source,
    previewLabel: previewState.label,
    hasAudio: Boolean(previewState.hasAudio),
  };
}

export function buildStreamManifest(draft, stats, route, previewState = DEFAULT_PREVIEW_STATE) {
  const title = String(draft.title || '').trim();
  const channelDisplay = String(draft.channelDisplay || '').trim();
  const hostDisplay = String(draft.hostDisplay || '').trim();
  const coverImage = String(draft.coverImageCrabUrl || '').trim();
  const posterImage = String(draft.posterImageCrabUrl || '').trim();
  const trailerVideo = String(draft.trailerVideoCrabUrl || '').trim();
  const replayVideo = String(draft.replayVideoCrabUrl || '').trim();
  const siteContext = String(draft.siteContextCrabUrl || '').trim();
  const podcastOutput = String(draft.podcastOutputCrabUrl || '').trim();
  const podcastTranscript = String(draft.podcastTranscriptCrabUrl || '').trim();
  const pricing = stats?.pricing || normalizeStreamPricing(draft);

  return {
    schema: 'crablink.local.stream-control-room-draft.v1',
    status: 'local_control_room_only',
    route: {
      owner: 'StreamPage.jsx',
      source_route: route?.normalizedInput || 'crab://stream',
      route_kind: route?.kind || 'stream',
    },
    asset: {
      kind: 'stream',
      title,
      canonical_cid: null,
      canonical_crab_url: null,
      manifest_cid: null,
      backend_confirmed: false,
    },
    metadata: {
      title,
      channel_display: channelDisplay,
      host_display: hostDisplay,
      stream_kind: draft.streamKind,
      category: draft.category,
      language: draft.language,
      duration_goal: String(draft.durationGoal || '').trim() || null,
      tags: stats?.tags || [],
      description: String(draft.description || '').trim(),
      stream_notes: String(draft.streamNotes || '').trim(),
      content_warning: String(draft.contentWarning || '').trim() || null,
    },
    schedule: {
      mode: draft.scheduleMode,
      start_window: String(draft.startWindow || '').trim() || null,
      timezone: String(draft.timezone || '').trim() || 'local',
      backend_confirmed: false,
    },
    local_preview: {
      status: previewState.status,
      source: previewState.source,
      label: previewState.label,
      has_audio: Boolean(previewState.hasAudio),
      sent_to_backend: false,
      persisted: false,
      b3_verified: false,
    },
    stream_plan: {
      source_mode: draft.sourceMode,
      ingest_mode: draft.ingestMode,
      stream_endpoint: null,
      ingest_token: null,
      stream_session_id: null,
      backend_confirmed: false,
    },
    linked_assets: {
      cover_image_crab_url: coverImage || null,
      poster_image_crab_url: posterImage || null,
      trailer_video_crab_url: trailerVideo || null,
      replay_video_crab_url: replayVideo || null,
      site_context_crab_url: siteContext || null,
      alternates: [],
      renditions: [],
    },
    chat_policy: {
      mode: draft.chatMode,
      welcome_note: String(draft.chatWelcome || '').trim() || null,
      placeholder_only: true,
      backend_confirmed: false,
    },
    moderation: {
      mode: draft.moderationMode,
      backend_confirmed: false,
    },
    replay_policy: {
      mode: draft.replayMode,
      replay_video_crab_url: replayVideo || null,
      backend_confirmed: false,
    },
    podcast_companion: {
      mode: draft.podcastMode,
      title: String(draft.podcastTitle || '').trim(),
      description: String(draft.podcastDescription || '').trim(),
      podcast_output_crab_url: podcastOutput || null,
      podcast_transcript_crab_url: podcastTranscript || null,
      backend_confirmed: false,
    },
    ownership: {
      creator_display: hostDisplay || channelDisplay,
      passport_subject_label: '',
      wallet_account_label: String(draft.creatorWalletAccount || '').trim(),
      backend_confirmed: false,
    },
    rights_policy: {
      rights_mode: draft.rightsMode,
      backend_confirmed: false,
    },
    access_policy: {
      mode: draft.accessMode,
      action: 'stream_watch_interval',
      access_mode: 'paid_interval',
      asset: 'roc',
      price_roc: pricing.priceRoc,
      interval_seconds: pricing.intervalSeconds,
      grace_seconds: pricing.graceSeconds,
      free_preview_seconds: pricing.freePreviewSeconds,
      renew_prompt_seconds: pricing.renewPromptSeconds,
      recipient_account: String(draft.creatorWalletAccount || '').trim() || null,
      manual_renew_only: true,
      autopay_enabled: false,
      backend_confirmed: false,
    },
    economics: {
      payout_mode: draft.payoutMode,
      split_policy_ref: null,
      backend_confirmed: false,
    },
    provenance: {
      created_by: 'CrabLink React local stream control room',
      source: 'crab://stream workspace',
      version: 2,
    },
    versions: [],
    receipts: [],
    truth_boundary: {
      local_only: true,
      creates_content_id: false,
      creates_manifest_id: false,
      creates_index_pointer: false,
      creates_stream_endpoint: false,
      creates_ingest_session: false,
      publishes_to_gateway: false,
      charges_roc: false,
      wallet_mutation: false,
      auto_renews_spend: false,
      fake_live_status: false,
      fake_viewer_count: false,
      replay_backend_confirmed: false,
      podcast_backend_confirmed: false,
    },
  };
}

export function normalizeStreamPricing(draft) {
  const priceRoc = normalizeIntegerString(draft.priceRoc, 5, { min: 1, max: 1000000 });
  const intervalMinutes = normalizeIntegerString(draft.intervalMinutes, 5, { min: 1, max: 1440 });
  const graceSeconds = normalizeIntegerString(draft.graceSeconds, 15, { min: 0, max: 300 });
  const freePreviewSeconds = normalizeIntegerString(draft.freePreviewSeconds, 0, { min: 0, max: 3600 });
  const renewPromptSeconds = normalizeIntegerString(draft.renewPromptSeconds, 30, { min: 0, max: 3600 });

  return {
    priceRoc,
    intervalMinutes,
    intervalSeconds: Number(intervalMinutes) * 60,
    graceSeconds: Number(graceSeconds),
    freePreviewSeconds: Number(freePreviewSeconds),
    renewPromptSeconds: Number(renewPromptSeconds),
    summary: `${priceRoc} ROC / ${intervalMinutes} min`,
  };
}

export function labelFromSnake(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeIntegerString(value, fallback, { min, max }) {
  const parsed = Number.parseInt(String(value ?? '').replace(/[^0-9]/g, ''), 10);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  return String(Math.max(min, Math.min(max, safe)));
}