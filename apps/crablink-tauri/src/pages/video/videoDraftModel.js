/**
 * RO:WHAT — Local draft model for the React-owned crab://video workspace.
 * RO:WHY — CrabLink refactor; keeps video manifest drafting deterministic, reusable, and separate from UI rendering.
 * RO:INTERACTS — VideoPage.jsx, VideoDraft.jsx, useCreatorDraft, future uniform manifest/rendition helpers.
 * RO:INVARIANTS — local draft only; no b3 CID minting; no manifest CID; no upload; no wallet or ROC mutation.
 * RO:METRICS — none.
 * RO:CONFIG — route/app labels only; no backend config.
 * RO:SECURITY — stores inert text references only; crab URLs are not fetched or executed here.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://video route smoke.
 */

export const VIDEO_SCHEMA = 'crablink.local.video-draft.v1';

export const DEFAULT_VIDEO_DRAFT = Object.freeze({
  title: '',
  creatorDisplay: '',
  description: '',
  videoKind: 'standard_video',
  language: 'en',
  category: 'independent',
  duration: '',
  resolution: '1920x1080',
  aspectRatio: '16:9',
  codecFormat: 'mp4_h264_aac',
  frameRate: '30',
  colorProfile: 'standard_dynamic_range',
  posterImageCrabUrl: '',
  thumbnailImageCrabUrl: '',
  trailerVideoCrabUrl: '',
  sourceMasterVideoCrabUrl: '',
  desktopRenditionCrabUrl: '',
  mobileRenditionCrabUrl: '',
  lowBandwidthRenditionCrabUrl: '',
  audioOnlyRenditionCrabUrl: '',
  captionsCrabUrl: '',
  dubCrabUrl: '',
  transcriptCrabUrl: '',
  siteContextCrabUrl: '',
  rightsMode: 'creator_owned_original',
  accessMode: 'public_preview',
  payoutMode: 'creator_wallet_future',
  moderationMode: 'site_policy_or_creator_default',
  tags: 'video, demo',
  contentWarning: '',
});

export const VIDEO_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const VIDEO_KIND_OPTIONS = Object.freeze([
  { value: 'standard_video', label: 'Standard video' },
  { value: 'short_clip', label: 'Short clip' },
  { value: 'music_video', label: 'Music video' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'podcast_video', label: 'Podcast video' },
  { value: 'stream_replay', label: 'Stream replay' },
  { value: 'trailer_or_preview', label: 'Trailer or preview' },
]);

export const VIDEO_CATEGORY_OPTIONS = Object.freeze([
  { value: 'independent', label: 'Independent' },
  { value: 'education', label: 'Education' },
  { value: 'music', label: 'Music' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'news_commentary', label: 'News / commentary' },
  { value: 'film_preview', label: 'Film preview' },
  { value: 'livestream_replay', label: 'Livestream replay' },
]);

export const VIDEO_RIGHTS_OPTIONS = Object.freeze([
  { value: 'creator_owned_original', label: 'Creator-owned original' },
  { value: 'licensed_media_future', label: 'Licensed media future' },
  { value: 'collaborative_rights_future', label: 'Collaborative rights future' },
  { value: 'public_domain_claim_future', label: 'Public-domain claim future' },
  { value: 'rights_review_required', label: 'Rights review required' },
]);

export const VIDEO_ACCESS_OPTIONS = Object.freeze([
  { value: 'public_preview', label: 'Public preview' },
  { value: 'free_full_view_future', label: 'Free full view future' },
  { value: 'paid_full_view_future', label: 'Paid full view future' },
  { value: 'site_members_only_future', label: 'Site members only future' },
  { value: 'age_or_content_gate_future', label: 'Age/content gate future' },
]);

export const VIDEO_PAYOUT_OPTIONS = Object.freeze([
  { value: 'creator_wallet_future', label: 'Creator wallet future' },
  { value: 'creator_and_collaborators_future', label: 'Creator + collaborators future' },
  { value: 'site_split_future', label: 'Site split future' },
  { value: 'no_payout_draft', label: 'No payout draft' },
]);

export const VIDEO_MODERATION_OPTIONS = Object.freeze([
  { value: 'site_policy_or_creator_default', label: 'Site policy or creator default' },
  { value: 'comments_disabled_future', label: 'Comments disabled future' },
  { value: 'moderated_comments_future', label: 'Moderated comments future' },
  { value: 'age_or_content_gate_future', label: 'Age/content gate future' },
]);

export const VIDEO_RENDITION_FIELDS = Object.freeze([
  {
    field: 'sourceMasterVideoCrabUrl',
    role: 'source_master',
    label: 'Source/master video',
    expectedKind: 'video',
    help: 'Original or highest-quality future source object.',
  },
  {
    field: 'desktopRenditionCrabUrl',
    role: 'desktop',
    label: 'Desktop rendition',
    expectedKind: 'video',
    help: 'Full web playback rendition for desktop/laptop displays.',
  },
  {
    field: 'mobileRenditionCrabUrl',
    role: 'mobile',
    label: 'Mobile rendition',
    expectedKind: 'video',
    help: 'Smaller or vertical-friendly rendition for phones.',
  },
  {
    field: 'lowBandwidthRenditionCrabUrl',
    role: 'low_bandwidth',
    label: 'Low-bandwidth rendition',
    expectedKind: 'video',
    help: 'Reduced bitrate rendition for slower connections.',
  },
  {
    field: 'audioOnlyRenditionCrabUrl',
    role: 'audio_only',
    label: 'Audio-only rendition',
    expectedKind: 'music',
    help: 'Future audio-only companion object for listening modes.',
  },
]);

export const VIDEO_LINKED_ASSET_FIELDS = Object.freeze([
  {
    field: 'posterImageCrabUrl',
    role: 'poster_image',
    label: 'Poster image',
    expectedKind: 'image',
    help: 'Large cover/poster image. Keep this as a canonical .image asset later.',
  },
  {
    field: 'thumbnailImageCrabUrl',
    role: 'thumbnail_image',
    label: 'Thumbnail image',
    expectedKind: 'image',
    help: 'Small preview image for feeds, cards, and search.',
  },
  {
    field: 'trailerVideoCrabUrl',
    role: 'trailer_video',
    label: 'Trailer or preview video',
    expectedKind: 'video',
    help: 'Optional trailer or short preview object.',
  },
  {
    field: 'captionsCrabUrl',
    role: 'captions',
    label: 'Captions/subtitles asset',
    expectedKind: 'dub',
    help: 'Future captions/subtitles should remain separately addressed linked assets.',
  },
  {
    field: 'dubCrabUrl',
    role: 'dub_or_alt_audio',
    label: 'Dub / alternate audio asset',
    expectedKind: 'dub',
    help: 'Future dub/alternate audio object, separate from the core video bytes.',
  },
  {
    field: 'transcriptCrabUrl',
    role: 'transcript',
    label: 'Transcript asset',
    expectedKind: 'article',
    help: 'Optional transcript/reference text object.',
  },
  {
    field: 'siteContextCrabUrl',
    role: 'site_context',
    label: 'Site context',
    expectedKind: 'site',
    help: 'Optional site where this video is planned to appear.',
  },
]);

export function buildVideoManifestDraft(draft, context = {}) {
  const safeDraft = normalizeVideoDraft(draft);
  const stats = statsForVideoDraft(safeDraft);
  const tags = parseTags(safeDraft.tags);
  const renditions = buildRenditions(safeDraft);
  const linkedAssets = buildLinkedAssets(safeDraft);
  const creatorDisplay = trimOrNull(safeDraft.creatorDisplay);

  return {
    schema: VIDEO_SCHEMA,
    route: 'crab://video',
    asset_kind: 'video',
    local_workspace: true,
    generated_by: 'CrabLink React video workspace',
    route_context: {
      requested_url: context?.route?.url || context?.route?.rawUrl || 'crab://video',
      route_kind: context?.route?.kind || 'video',
    },
    identity: {
      creator_display: creatorDisplay,
      passport_subject_hint: context?.app?.settings?.passportSubject || null,
      username_hint: context?.app?.settings?.handle || context?.app?.settings?.requestedHandle || null,
      backend_confirmed: false,
    },
    ownership: {
      owner_display: creatorDisplay,
      owner_passport_subject: context?.app?.settings?.passportSubject || null,
      owner_backend_confirmed: false,
      payout_address_confirmed: false,
    },
    metadata: {
      title: trimOrNull(safeDraft.title),
      description: trimOrNull(safeDraft.description),
      video_kind: safeDraft.videoKind,
      language: trimOrNull(safeDraft.language) || 'en',
      category: safeDraft.category,
      duration_label: trimOrNull(safeDraft.duration),
      duration_seconds: parseDurationSeconds(safeDraft.duration),
      resolution: trimOrNull(safeDraft.resolution),
      aspect_ratio: trimOrNull(safeDraft.aspectRatio),
      codec_format: safeDraft.codecFormat,
      frame_rate: trimOrNull(safeDraft.frameRate),
      color_profile: safeDraft.colorProfile,
      tags,
      content_warning: trimOrNull(safeDraft.contentWarning),
      stats,
    },
    linked_assets: linkedAssets,
    renditions,
    rights_policy: {
      mode: safeDraft.rightsMode,
      note: 'Local planning field only until backend video rights contracts exist.',
    },
    access_policy: {
      mode: safeDraft.accessMode,
      paid_access_active: false,
      backend_enforced: false,
    },
    economics: {
      payout_mode: safeDraft.payoutMode,
      roc_charge_active: false,
      receipt_required: false,
    },
    moderation_policy: {
      mode: safeDraft.moderationMode,
      backend_confirmed: false,
    },
    provenance: {
      created_by: 'CrabLink React local draft',
      source: 'crab://video workspace',
      version: 1,
    },
    versions: [],
    receipts: [],
    truth_boundary: {
      local_draft_only: true,
      assigns_b3_cid: false,
      assigns_manifest_cid: false,
      publishes_asset: false,
      writes_index_pointer: false,
      performs_paid_action: false,
      backend_route_claimed: false,
      uploads_bytes: false,
      streams_media: false,
    },
  };
}

export function statsForVideoDraft(draft) {
  const safeDraft = normalizeVideoDraft(draft);
  const title = safeDraft.title.trim();
  const description = safeDraft.description.trim();
  const tags = parseTags(safeDraft.tags);
  const renditions = buildRenditions(safeDraft);
  const linkedAssets = buildLinkedAssets(safeDraft);
  const durationSeconds = parseDurationSeconds(safeDraft.duration);
  const crabLinkCount = countCrabLinks(Object.values(safeDraft).join('\n'));

  return {
    title_characters: title.length,
    description_characters: description.length,
    description_words: description ? description.split(/\s+/).length : 0,
    tags: tags.length,
    tag_list: tags,
    crab_links: crabLinkCount,
    rendition_count: renditions.length,
    linked_asset_count: linkedAssets.length,
    support_asset_count: linkedAssets.filter((asset) => asset.role !== 'site_context').length,
    duration_seconds: durationSeconds,
    duration_minutes: durationSeconds ? Math.max(1, Math.round(durationSeconds / 60)) : 0,
  };
}

export function getVideoCompleteness(draft) {
  const safeDraft = normalizeVideoDraft(draft);
  const checks = [
    safeDraft.title.trim(),
    safeDraft.creatorDisplay.trim(),
    safeDraft.description.trim(),
    safeDraft.language.trim(),
    safeDraft.videoKind,
    safeDraft.category,
    safeDraft.resolution.trim(),
    safeDraft.aspectRatio.trim(),
    safeDraft.codecFormat,
    safeDraft.rightsMode,
    safeDraft.accessMode,
    safeDraft.moderationMode,
  ];

  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

export function normalizeVideoDraft(draft) {
  return {
    ...DEFAULT_VIDEO_DRAFT,
    ...(draft || {}),
  };
}

export function parseTags(input) {
  return String(input || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function labelFromSnake(value) {
  return String(value || '')
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildRenditions(draft) {
  return VIDEO_RENDITION_FIELDS.map((item) => ({
    role: item.role,
    crab_url: trimOrNull(draft[item.field]),
    expected_kind: item.expectedKind,
    backend_verified: false,
  })).filter((item) => Boolean(item.crab_url));
}

function buildLinkedAssets(draft) {
  return VIDEO_LINKED_ASSET_FIELDS.map((item) => ({
    role: item.role,
    crab_url: trimOrNull(draft[item.field]),
    expected_kind: item.expectedKind,
    backend_verified: false,
  })).filter((item) => Boolean(item.crab_url));
}

function parseDurationSeconds(input) {
  const value = String(input || '').trim();

  if (!value) {
    return null;
  }

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const parts = value.split(':').map((part) => Number(part));

  if (parts.some((part) => !Number.isFinite(part) || part < 0)) {
    return null;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
}

function countCrabLinks(input) {
  const matches = String(input || '').match(/\bcrab:\/\/[^\s<>"')]+/g);
  return matches ? matches.length : 0;
}

function trimOrNull(value) {
  const clean = String(value || '').trim();
  return clean || null;
}