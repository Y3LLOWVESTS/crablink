/**
 * RO:WHAT — Local linked-media and audio-lane helpers for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/ECON; lets creators draft linked media intent without granting rights or wallet authority.
 * RO:INTERACTS — MakePage, makeDraftModel, makeTimelineModel, contentViewClient, future reuse-policy DTOs.
 * RO:INVARIANTS — local draft metadata only; no fake reuse rights; no fake payout split; no receipt truth; no ledger mutation.
 * RO:METRICS — none.
 * RO:CONFIG — local Make editor state only.
 * RO:SECURITY — linked preview/view is not remix permission; backend must authorize reuse and payout splits before export/mint.
 * RO:TEST — npm run build; manual crab://make linked video add/select/preview/export-block smoke.
 */

const LINKED_VIDEO_HASH_RE = /^[0-9a-f]{64}$/;
const LINKED_VIDEO_URL_RE = /^crab:\/\/([0-9a-f]{64})\.video$/i;

export const MAKE_LINKED_VIDEO_DEFAULT_RANGE_MS = 30_000;
export const MAKE_LINKED_VIDEO_MAX_DRAFTS = 12;
export const MAKE_LINKED_VIDEO_KIND = 'linked_video';
export const MAKE_LINKED_VIDEO_SOURCE_MODE = 'linked_video_reference';

export const LINKED_VIDEO_RIGHTS_STATUS = Object.freeze({
  NOT_CHECKED: 'not_checked',
  VIEW_PREVIEW_PAID: 'view_preview_paid',
  REUSE_VERIFIED: 'reuse_verified',
  REUSE_DENIED: 'reuse_denied',
});

export const LINKED_VIDEO_REUSE_STATUS = Object.freeze({
  NOT_REQUESTED: 'not_requested',
  TERMS_REQUIRED: 'terms_required',
  AUTHORIZED: 'authorized',
  DENIED: 'denied',
});

export const LINKED_VIDEO_PAYOUT_STATUS = Object.freeze({
  NOT_CONFIGURED: 'not_configured',
  SPLIT_CONFIGURED: 'split_configured',
});

export const LINKED_VIDEO_PREVIEW_STATUS = Object.freeze({
  NOT_LOADED: 'not_loaded',
  LOADING: 'loading',
  READY: 'ready',
  FAILED: 'failed',
});

export const LINKED_VIDEO_EXPORT_STATUS = Object.freeze({
  BLOCKED_UNTIL_REUSE_VERIFIED: 'blocked_until_reuse_verified',
  EXPORTABLE_LINKED_SOURCE: 'exportable_linked_source',
  REFERENCE_ONLY_NOT_RENDERED: 'reference_only_not_rendered',
});

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampMs(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.round(number));
}

function normalizeBps(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(10_000, Math.round(number)));
}

export function normalizeLinkedVideoUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const maybeHash = raw.replace(/^b3:/i, '').trim().toLowerCase();
  if (LINKED_VIDEO_HASH_RE.test(maybeHash)) {
    return `crab://${maybeHash}.video`;
  }

  const match = raw.match(LINKED_VIDEO_URL_RE);
  if (!match) return raw;
  return `crab://${match[1].toLowerCase()}.video`;
}

export function parseLinkedVideoUrl(value) {
  const url = normalizeLinkedVideoUrl(value);
  const match = url.match(LINKED_VIDEO_URL_RE);
  if (!match) {
    return {
      ok: false,
      url,
      hash: '',
      cid: '',
      problem: 'Use crab://<64 lowercase hex>.video or b3:<64 lowercase hex>.',
    };
  }

  const hash = match[1].toLowerCase();
  return {
    ok: true,
    url: `crab://${hash}.video`,
    hash,
    cid: `b3:${hash}`,
    problem: '',
  };
}

export function linkedVideoCidFromUrl(value) {
  const parsed = parseLinkedVideoUrl(value);
  return parsed.ok ? parsed.cid : '';
}

export function formatLinkedVideoRange({ sourceStartMs = 0, sourceEndMs = 0, useEntireSource = false } = {}) {
  if (useEntireSource) return 'entire source';

  const start = clampMs(sourceStartMs, 0);
  const end = clampMs(sourceEndMs, start + MAKE_LINKED_VIDEO_DEFAULT_RANGE_MS);
  const duration = Math.max(0, end - start);

  return `${formatMs(start)} → ${formatMs(end)} (${formatMs(duration)})`;
}

export function formatMs(ms) {
  const total = clampMs(ms, 0);
  const seconds = Math.floor(total / 1000);
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  const remMs = total % 1000;

  if (minutes > 0) {
    return `${minutes}:${String(remSeconds).padStart(2, '0')}.${String(remMs).padStart(3, '0')}`;
  }

  return `${remSeconds}.${String(remMs).padStart(3, '0')}s`;
}

export function deriveLinkedVideoDurationMs(item = {}) {
  const start = clampMs(item.sourceStartMs, 0);
  const end = clampMs(item.sourceEndMs, start + MAKE_LINKED_VIDEO_DEFAULT_RANGE_MS);

  if (item.useEntireSource) {
    return clampMs(item.timelineDurationMs || item.durationMs, MAKE_LINKED_VIDEO_DEFAULT_RANGE_MS);
  }

  return Math.max(1_000, end - start);
}

export function createLinkedVideoDraft(rawUrl, options = {}) {
  const parsed = parseLinkedVideoUrl(rawUrl);
  if (!parsed.ok) {
    throw new Error(parsed.problem);
  }

  const createdAt = nowIso();
  const sourceStartMs = clampMs(options.sourceStartMs, 0);
  const sourceEndMs = clampMs(
    options.sourceEndMs,
    sourceStartMs + MAKE_LINKED_VIDEO_DEFAULT_RANGE_MS,
  );
  const useEntireSource = Boolean(options.useEntireSource);
  const timelineDurationMs = useEntireSource
    ? clampMs(options.timelineDurationMs, MAKE_LINKED_VIDEO_DEFAULT_RANGE_MS)
    : Math.max(1_000, sourceEndMs - sourceStartMs);

  return {
    id: options.id || makeId('make-linked-video'),
    kind: MAKE_LINKED_VIDEO_KIND,
    assetKind: 'video',
    sourceMode: MAKE_LINKED_VIDEO_SOURCE_MODE,
    url: parsed.url,
    crabUrl: parsed.url,
    sourceCid: parsed.cid,
    sourceHash: parsed.hash,
    displayName: options.displayName || `Linked video ${parsed.hash.slice(0, 8)}…`,
    title: options.title || options.displayName || `Linked video ${parsed.hash.slice(0, 8)}…`,
    notes: String(options.notes || '').trim(),
    attributionLabel: String(options.attributionLabel || '').trim(),

    sourceStartMs,
    sourceEndMs,
    useEntireSource,
    timelineDurationMs,
    durationMs: timelineDurationMs,

    rightsStatus: options.rightsStatus || LINKED_VIDEO_RIGHTS_STATUS.NOT_CHECKED,
    reuseStatus: options.reuseStatus || LINKED_VIDEO_REUSE_STATUS.NOT_REQUESTED,
    payoutStatus: options.payoutStatus || LINKED_VIDEO_PAYOUT_STATUS.NOT_CONFIGURED,
    previewStatus: options.previewStatus || LINKED_VIDEO_PREVIEW_STATUS.NOT_LOADED,
    exportStatus:
      options.exportStatus || LINKED_VIDEO_EXPORT_STATUS.BLOCKED_UNTIL_REUSE_VERIFIED,

    includedInExport: Boolean(options.includedInExport) && options.exportStatus === LINKED_VIDEO_EXPORT_STATUS.EXPORTABLE_LINKED_SOURCE,
    insertedInTimeline: true,
    localOnly: true,
    canPreviewLocally: Boolean(options.canPreviewLocally),
    previewProxyOnly: Boolean(options.previewProxyOnly),
    previewLoadedAt: options.previewLoadedAt || null,
    previewRoute: options.previewRoute || '',
    previewReceiptHash: options.previewReceiptHash || '',
    previewPaymentId: options.previewPaymentId || '',

    reuseAuthorizationId: options.reuseAuthorizationId || '',
    reuseReceiptHash: options.reuseReceiptHash || '',
    reusePolicyId: options.reusePolicyId || '',
    reusePolicyVersion: options.reusePolicyVersion || null,

    sourceCreatorAccount: options.sourceCreatorAccount || '',
    makerSplitBps: normalizeBps(options.makerSplitBps, null),
    sourceCreatorSplitBps: normalizeBps(options.sourceCreatorSplitBps, null),

    createsBackendTruth: false,
    createsReceipt: false,
    mutatesWallet: false,
    viewReceiptIsReusePermission: false,

    createdAt,
    updatedAt: createdAt,
    rangeLabel: formatLinkedVideoRange({ sourceStartMs, sourceEndMs, useEntireSource }),
    truthBoundary:
      'This linked video is local Make draft intent only. Paid preview/view is not reuse permission; backend reuse authorization is required before export or payout splits.',
  };
}

export function createLinkedVideoTimelineClipFromDraft(draft = {}) {
  const durationMs = deriveLinkedVideoDurationMs(draft);
  const now = nowIso();
  const clipId = draft.clipId || draft.id || makeId('make-linked-video-clip');

  return {
    id: clipId,
    linkedVideoDraftId: draft.id || clipId,
    kind: MAKE_LINKED_VIDEO_KIND,
    type: MAKE_LINKED_VIDEO_KIND,
    assetKind: 'video',
    sourceMode: MAKE_LINKED_VIDEO_SOURCE_MODE,
    sourceLabel: draft.displayName || draft.title || 'Linked video',
    name: draft.displayName || draft.title || 'Linked video',
    displayName: draft.displayName || draft.title || 'Linked video',
    title: draft.title || draft.displayName || 'Linked video',

    url: draft.url || draft.crabUrl || '',
    crabUrl: draft.crabUrl || draft.url || '',
    sourceCid: draft.sourceCid || linkedVideoCidFromUrl(draft.url || draft.crabUrl || ''),
    sourceHash: draft.sourceHash || '',
    sourceStartMs: clampMs(draft.sourceStartMs, 0),
    sourceEndMs: clampMs(
      draft.sourceEndMs,
      clampMs(draft.sourceStartMs, 0) + MAKE_LINKED_VIDEO_DEFAULT_RANGE_MS,
    ),
    useEntireSource: Boolean(draft.useEntireSource),
    rangeLabel:
      draft.rangeLabel ||
      formatLinkedVideoRange({
        sourceStartMs: draft.sourceStartMs,
        sourceEndMs: draft.sourceEndMs,
        useEntireSource: draft.useEntireSource,
      }),

    durationMs,
    trimStartMs: 0,
    trimEndMs: durationMs,
    timelineDurationMs: durationMs,

    objectUrl: draft.objectUrl || '',
    previewObjectUrl: draft.previewObjectUrl || draft.objectUrl || '',
    mimeType: draft.mimeType || 'video/mp4',
    size: 0,
    file: null,
    blob: null,

    rightsStatus: draft.rightsStatus || LINKED_VIDEO_RIGHTS_STATUS.NOT_CHECKED,
    reuseStatus: draft.reuseStatus || LINKED_VIDEO_REUSE_STATUS.NOT_REQUESTED,
    payoutStatus: draft.payoutStatus || LINKED_VIDEO_PAYOUT_STATUS.NOT_CONFIGURED,
    previewStatus: draft.previewStatus || LINKED_VIDEO_PREVIEW_STATUS.NOT_LOADED,
    exportStatus:
      draft.exportStatus || LINKED_VIDEO_EXPORT_STATUS.BLOCKED_UNTIL_REUSE_VERIFIED,

    includedInExport: false,
    canPreviewLocally: Boolean(draft.canPreviewLocally && (draft.objectUrl || draft.previewObjectUrl)),
    previewProxyOnly: Boolean(draft.previewProxyOnly),
    previewLoadedAt: draft.previewLoadedAt || null,
    previewRoute: draft.previewRoute || '',
    previewReceiptHash: draft.previewReceiptHash || '',
    previewPaymentId: draft.previewPaymentId || '',

    reuseAuthorizationId: draft.reuseAuthorizationId || '',
    reuseReceiptHash: draft.reuseReceiptHash || '',
    reusePolicyId: draft.reusePolicyId || '',
    reusePolicyVersion: draft.reusePolicyVersion || null,
    sourceCreatorAccount: draft.sourceCreatorAccount || '',
    makerSplitBps: normalizeBps(draft.makerSplitBps, null),
    sourceCreatorSplitBps: normalizeBps(draft.sourceCreatorSplitBps, null),

    createsBackendTruth: false,
    createsReceipt: false,
    mutatesWallet: false,
    viewReceiptIsReusePermission: false,
    localOnly: true,
    createdAt: draft.createdAt || now,
    updatedAt: now,
    truthBoundary:
      'Timeline linked-video clip is editor draft intent. Preview proxy can help local playback, but export stays blocked until backend reuse authorization.',
  };
}

export function isLinkedVideoTimelineClip(clip = {}) {
  return clip?.kind === MAKE_LINKED_VIDEO_KIND || clip?.type === MAKE_LINKED_VIDEO_KIND || clip?.sourceMode === MAKE_LINKED_VIDEO_SOURCE_MODE;
}

export function linkedVideoClipCanPreviewLocally(clip = {}) {
  if (!isLinkedVideoTimelineClip(clip)) return false;
  return Boolean(clip.objectUrl || clip.previewObjectUrl) && clip.previewStatus === LINKED_VIDEO_PREVIEW_STATUS.READY;
}

export function linkedVideoTimelineStatusLabel(clip = {}) {
  if (!isLinkedVideoTimelineClip(clip)) return '';

  if (clip.exportStatus === LINKED_VIDEO_EXPORT_STATUS.EXPORTABLE_LINKED_SOURCE) {
    if (clip.sourceCreatorSplitBps != null && clip.makerSplitBps != null) {
      return `Reuse authorized · split ${Math.round(clip.makerSplitBps / 100)}/${Math.round(clip.sourceCreatorSplitBps / 100)}`;
    }
    return 'Reuse authorized';
  }

  if (clip.previewStatus === LINKED_VIDEO_PREVIEW_STATUS.READY) {
    return 'Preview proxy · reuse terms needed';
  }

  if (clip.previewStatus === LINKED_VIDEO_PREVIEW_STATUS.FAILED) {
    return 'Preview failed · reuse blocked';
  }

  return 'Linked reference · preview/reuse needed';
}

export function attachLinkedVideoPreviewToClip(clip = {}, preview = {}) {
  if (!isLinkedVideoTimelineClip(clip)) return clip;

  const hasBlobCtor = typeof Blob !== 'undefined';
  const blob = hasBlobCtor && preview.blob instanceof Blob ? preview.blob : clip.blob || null;
  const objectUrl = preview.objectUrl || clip.objectUrl || clip.previewObjectUrl || '';

  return {
    ...clip,
    blob,
    objectUrl,
    previewObjectUrl: objectUrl,
    mimeType: preview.mimeType || preview.source?.mimeType || clip.mimeType || 'video/mp4',
    canPreviewLocally: Boolean(objectUrl),
    previewProxyOnly: true,
    previewStatus: objectUrl ? LINKED_VIDEO_PREVIEW_STATUS.READY : LINKED_VIDEO_PREVIEW_STATUS.FAILED,
    previewLoadedAt: nowIso(),
    previewRoute: preview.source?.route || preview.previewRoute || clip.previewRoute || '',
    previewReceiptHash:
      preview.payment?.receipt_hash ||
      preview.payment?.receiptHash ||
      preview.previewReceiptHash ||
      clip.previewReceiptHash ||
      '',
    previewPaymentId:
      preview.payment?.payment_id ||
      preview.payment?.paymentId ||
      preview.payment?.id ||
      clip.previewPaymentId ||
      '',
    rightsStatus: objectUrl
      ? LINKED_VIDEO_RIGHTS_STATUS.VIEW_PREVIEW_PAID
      : clip.rightsStatus || LINKED_VIDEO_RIGHTS_STATUS.NOT_CHECKED,
    reuseStatus: clip.reuseStatus || LINKED_VIDEO_REUSE_STATUS.NOT_REQUESTED,
    payoutStatus: clip.payoutStatus || LINKED_VIDEO_PAYOUT_STATUS.NOT_CONFIGURED,
    exportStatus: clip.exportStatus || LINKED_VIDEO_EXPORT_STATUS.BLOCKED_UNTIL_REUSE_VERIFIED,
    includedInExport: false,
    updatedAt: nowIso(),
    truthBoundary:
      'Paid preview proxy is display-only and is not reuse permission. Export remains blocked until backend reuse authorization.',
  };
}

export function updateLinkedVideoRange(draft = {}, patch = {}) {
  const sourceStartMs = clampMs(patch.sourceStartMs ?? draft.sourceStartMs, 0);
  const sourceEndMs = clampMs(
    patch.sourceEndMs ?? draft.sourceEndMs,
    sourceStartMs + MAKE_LINKED_VIDEO_DEFAULT_RANGE_MS,
  );
  const useEntireSource = Boolean(patch.useEntireSource ?? draft.useEntireSource);
  const durationMs = useEntireSource
    ? clampMs(patch.timelineDurationMs ?? draft.timelineDurationMs ?? draft.durationMs, MAKE_LINKED_VIDEO_DEFAULT_RANGE_MS)
    : Math.max(1_000, sourceEndMs - sourceStartMs);

  return {
    ...draft,
    sourceStartMs,
    sourceEndMs,
    useEntireSource,
    timelineDurationMs: durationMs,
    durationMs,
    rangeLabel: formatLinkedVideoRange({ sourceStartMs, sourceEndMs, useEntireSource }),
    updatedAt: nowIso(),
  };
}

export function createLinkedVideoReusePlaceholder(draft = {}) {
  return {
    schema: 'crablink.make.linked-video-reuse-placeholder.v1',
    kind: 'video',
    source_cid: draft.sourceCid || linkedVideoCidFromUrl(draft.url || draft.crabUrl || ''),
    source_crab_url: draft.crabUrl || draft.url || '',
    source_range_ms: {
      start: clampMs(draft.sourceStartMs, 0),
      end: clampMs(draft.sourceEndMs, clampMs(draft.sourceStartMs, 0) + MAKE_LINKED_VIDEO_DEFAULT_RANGE_MS),
    },
    statuses: {
      rights: draft.rightsStatus || LINKED_VIDEO_RIGHTS_STATUS.NOT_CHECKED,
      reuse: draft.reuseStatus || LINKED_VIDEO_REUSE_STATUS.NOT_REQUESTED,
      payout: draft.payoutStatus || LINKED_VIDEO_PAYOUT_STATUS.NOT_CONFIGURED,
      preview: draft.previewStatus || LINKED_VIDEO_PREVIEW_STATUS.NOT_LOADED,
      export: draft.exportStatus || LINKED_VIDEO_EXPORT_STATUS.BLOCKED_UNTIL_REUSE_VERIFIED,
    },
    exportable: draft.exportStatus === LINKED_VIDEO_EXPORT_STATUS.EXPORTABLE_LINKED_SOURCE,
    included_in_export: false,
    local_only: true,
    creates_backend_truth: false,
    warning:
      'This is only a local reuse placeholder. Backend policy/receipt/split facts must replace it before final export or mint.',
  };
}

export function createLinkedAudioDraft(file, options = {}) {
  if (!file) {
    throw new Error('Choose an audio file first.');
  }

  const objectUrl = URL.createObjectURL(file);
  const createdAt = nowIso();

  return {
    id: options.id || makeId('make-audio'),
    kind: 'audio_track',
    sourceMode: 'local_audio_file',
    file,
    objectUrl,
    name: file.name || 'Audio track',
    displayName: options.displayName || file.name || 'Audio track',
    mimeType: file.type || 'audio/mpeg',
    size: Number(file.size || 0),
    startMs: clampMs(options.startMs, 0),
    sourceStartMs: clampMs(options.sourceStartMs, 0),
    sourceEndMs: options.sourceEndMs == null ? null : clampMs(options.sourceEndMs, 0),
    gain: Number.isFinite(Number(options.gain)) ? Number(options.gain) : 1,
    muted: Boolean(options.muted),
    fadeInMs: clampMs(options.fadeInMs, 0),
    fadeOutMs: clampMs(options.fadeOutMs, 0),
    includedInExport: true,
    exportStatus: 'local_audio_pending_ffmpeg_mix',
    localOnly: true,
    createsBackendTruth: false,
    createsReceipt: false,
    mutatesWallet: false,
    createdAt,
    updatedAt: createdAt,
    truthBoundary:
      'Local audio is draft media only. Rust/FFmpeg Make export may mix it into a local source handle; backend minting still happens later through crab://video.',
  };
}

export function createLocalAudioTrackFromFile(file, options = {}) {
  return createLinkedAudioDraft(file, options);
}

export function updateAudioTrack(track = {}, patch = {}) {
  return {
    ...track,
    ...patch,
    startMs: clampMs(patch.startMs ?? track.startMs, 0),
    sourceStartMs: clampMs(patch.sourceStartMs ?? track.sourceStartMs, 0),
    sourceEndMs:
      patch.sourceEndMs === null
        ? null
        : patch.sourceEndMs == null
          ? track.sourceEndMs ?? null
          : clampMs(patch.sourceEndMs, 0),
    gain: Number.isFinite(Number(patch.gain ?? track.gain))
      ? Math.max(0, Math.min(2, Number(patch.gain ?? track.gain)))
      : 1,
    muted: Boolean(patch.muted ?? track.muted),
    fadeInMs: clampMs(patch.fadeInMs ?? track.fadeInMs, 0),
    fadeOutMs: clampMs(patch.fadeOutMs ?? track.fadeOutMs, 0),
    updatedAt: nowIso(),
  };
}

export function revokeMakeAudioTrackUrl(track = {}) {
  if (track?.objectUrl) {
    URL.revokeObjectURL(track.objectUrl);
  }
}

function linkedVideoForSession(item = {}) {
  if (!item) return null;

  const sourceCid = item.sourceCid || linkedVideoCidFromUrl(item.url || item.crabUrl || '');
  if (!sourceCid) return null;

  return {
    id: item.id,
    kind: MAKE_LINKED_VIDEO_KIND,
    sourceMode: MAKE_LINKED_VIDEO_SOURCE_MODE,
    crabUrl: item.crabUrl || item.url,
    sourceCid,
    sourceHash: item.sourceHash || sourceCid.replace(/^b3:/, ''),
    displayName: item.displayName || item.title || 'Linked video',
    sourceStartMs: clampMs(item.sourceStartMs, 0),
    sourceEndMs: clampMs(
      item.sourceEndMs,
      clampMs(item.sourceStartMs, 0) + MAKE_LINKED_VIDEO_DEFAULT_RANGE_MS,
    ),
    timelineDurationMs: deriveLinkedVideoDurationMs(item),
    rangeLabel:
      item.rangeLabel ||
      formatLinkedVideoRange({
        sourceStartMs: item.sourceStartMs,
        sourceEndMs: item.sourceEndMs,
        useEntireSource: item.useEntireSource,
      }),
    rightsStatus: item.rightsStatus || LINKED_VIDEO_RIGHTS_STATUS.NOT_CHECKED,
    reuseStatus: item.reuseStatus || LINKED_VIDEO_REUSE_STATUS.NOT_REQUESTED,
    payoutStatus: item.payoutStatus || LINKED_VIDEO_PAYOUT_STATUS.NOT_CONFIGURED,
    previewStatus: item.previewStatus || LINKED_VIDEO_PREVIEW_STATUS.NOT_LOADED,
    exportStatus:
      item.exportStatus || LINKED_VIDEO_EXPORT_STATUS.BLOCKED_UNTIL_REUSE_VERIFIED,
    previewProxyOnly: Boolean(item.previewProxyOnly),
    canPreviewLocally: linkedVideoClipCanPreviewLocally(item),
    includedInExport: false,
    reuseAuthorizationId: item.reuseAuthorizationId || '',
    reuseReceiptHash: item.reuseReceiptHash || '',
    makerSplitBps: normalizeBps(item.makerSplitBps, null),
    sourceCreatorSplitBps: normalizeBps(item.sourceCreatorSplitBps, null),
    sourceCreatorAccount: item.sourceCreatorAccount || '',
    createsBackendTruth: false,
    createsReceipt: false,
    mutatesWallet: false,
    truthBoundary:
      'Local draft/session metadata only. Reuse authorization and payout splits must come from backend policy/wallet/ledger services.',
  };
}

function audioTrackForSession(track = {}) {
  if (!track) return null;

  return {
    id: track.id,
    kind: 'audio_track',
    sourceMode: 'local_audio_file',
    displayName: track.displayName || track.name || 'Audio track',
    mimeType: track.mimeType || 'audio/mpeg',
    size: Number(track.size || 0),
    startMs: clampMs(track.startMs, 0),
    sourceStartMs: clampMs(track.sourceStartMs, 0),
    sourceEndMs: track.sourceEndMs == null ? null : clampMs(track.sourceEndMs, 0),
    gain: Number.isFinite(Number(track.gain)) ? Number(track.gain) : 1,
    muted: Boolean(track.muted),
    fadeInMs: clampMs(track.fadeInMs, 0),
    fadeOutMs: clampMs(track.fadeOutMs, 0),
    includedInExport: Boolean(track.includedInExport),
    exportStatus: track.exportStatus || 'local_audio_pending_ffmpeg_mix',
    localOnly: true,
    createsBackendTruth: false,
    createsReceipt: false,
    mutatesWallet: false,
  };
}

export function buildMakeLinkedMediaSessionSummary({ linkedVideoDrafts = [], audioTracks = [] } = {}) {
  return {
    schema: 'crablink.make.linked-media-session.v1',
    localOnly: true,
    videos: linkedVideoDrafts.map(linkedVideoForSession).filter(Boolean),
    audioTracks: audioTracks.map(audioTrackForSession).filter(Boolean),
    exportMixingEnabled: true,
    rightsVerificationEnabled: false,
    payoutSplitEnabled: false,
    linkedVideoSourceWindowsEnabled: true,
    linkedVideoTimelineClipsEnabled: true,
    linkedVideoPreviewProxyEnabled: true,
    truthBoundary:
      'Linked media and audio lane entries are local draft metadata only. Preview proxies are display-only. Rights, reuse permission, payout splits, backend manifests, receipts, and wallet settlement are not proven here.',
  };
}