/**
 * RO:WHAT — Local image draft model for the React-owned crab://image workspace.
 * RO:WHY — Keeps image manifest/rendition planning deterministic without touching protected paid upload flows.
 * RO:INTERACTS — ImagePage.jsx, ImageCreate.jsx, ImagePreview.jsx, ImageRenditions.jsx, ImageManifest.jsx.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no ROC charge; no backend publication claim.
 * RO:METRICS — none.
 * RO:CONFIG — app settings can prefill display labels only.
 * RO:SECURITY — no secrets, no direct internal-service calls, no wallet authority.
 * RO:TEST — npm run build; scripts/check-tauri.sh; manual crab://image route smoke.
 */

export const IMAGE_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const IMAGE_ROLE_OPTIONS = Object.freeze([
  { value: 'standalone_image', label: 'Standalone image' },
  { value: 'album_cover', label: 'Album cover' },
  { value: 'video_thumbnail', label: 'Video thumbnail' },
  { value: 'film_cover', label: 'Film cover' },
  { value: 'cover_image', label: 'Cover image' },
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'poster', label: 'Poster' },
  { value: 'profile_avatar', label: 'Profile avatar' },
  { value: 'banner_image', label: 'Banner image' },
  { value: 'article_hero', label: 'Article hero' },
  { value: 'ad_creative', label: 'Ad creative' },
  { value: 'game_cover', label: 'Game cover' },
]);

export const IMAGE_USE_CASE_OPTIONS = Object.freeze([
  { value: 'standalone_image', label: 'Standalone image' },
  { value: 'album_cover', label: 'Album cover' },
  { value: 'video_thumbnail', label: 'Video thumbnail' },
  { value: 'film_cover', label: 'Film cover' },
  { value: 'cover_image', label: 'Cover image' },
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'poster', label: 'Poster' },
  { value: 'profile_avatar', label: 'Profile avatar' },
  { value: 'banner_image', label: 'Banner image' },
  { value: 'article_hero', label: 'Article hero' },
  { value: 'ad_creative', label: 'Ad creative' },
  { value: 'game_cover', label: 'Game cover' },
]);

export const IMAGE_SOURCE_OPTIONS = Object.freeze([
  { value: 'creator_original', label: 'Creator original' },
  { value: 'camera_original', label: 'Camera original' },
  { value: 'scanner_import', label: 'Scanner import' },
  { value: 'edited_derivative', label: 'Edited derivative' },
  { value: 'commissioned_work', label: 'Commissioned work' },
  { value: 'licensed_import', label: 'Licensed import' },
]);

export const IMAGE_RIGHTS_OPTIONS = Object.freeze([
  { value: 'creator_owned_original', label: 'Creator-owned original' },
  { value: 'licensed_with_terms', label: 'Licensed with terms' },
  { value: 'public_domain_claimed', label: 'Public domain claimed' },
  { value: 'rights_review_needed', label: 'Rights review needed' },
]);

export const IMAGE_ACCESS_OPTIONS = Object.freeze([
  { value: 'public_preview', label: 'Public preview' },
  { value: 'free_public_asset', label: 'Free public asset' },
  { value: 'paid_full_resolution_future', label: 'Paid full-resolution future' },
  { value: 'subscriber_access_future', label: 'Subscriber access future' },
  { value: 'owner_only_draft', label: 'Owner-only draft' },
]);

export const IMAGE_MODERATION_OPTIONS = Object.freeze([
  { value: 'site_policy_or_creator_default', label: 'Site policy or creator default' },
  { value: 'safe_for_general_audience', label: 'Safe for general audience' },
  { value: 'content_warning_required', label: 'Content warning required' },
  { value: 'age_gate_future', label: 'Age gate future' },
  { value: 'review_required_future', label: 'Review required future' },
]);

export const IMAGE_RENDITION_TARGET_OPTIONS = Object.freeze([
  {
    role: 'desktop',
    label: 'Desktop',
    useCase: 'desktop_embed',
    width: 1920,
    height: 1280,
    fit: 'contain',
    contentType: 'image/webp',
    defaultEnabled: true,
    copy: 'Large responsive embed for desktop pages and creator sites.',
  },
  {
    role: 'tablet',
    label: 'Tablet',
    useCase: 'tablet_embed',
    width: 1280,
    height: 960,
    fit: 'contain',
    contentType: 'image/webp',
    defaultEnabled: true,
    copy: 'Mid-size responsive embed for tablets and smaller desktop cards.',
  },
  {
    role: 'mobile',
    label: 'Mobile',
    useCase: 'mobile_embed',
    width: 768,
    height: 1024,
    fit: 'contain',
    contentType: 'image/webp',
    defaultEnabled: true,
    copy: 'Phone-friendly image that preserves the original aspect ratio.',
  },
  {
    role: 'thumbnail',
    label: 'Thumbnail',
    useCase: 'thumbnail',
    width: 320,
    height: 320,
    fit: 'cover',
    contentType: 'image/webp',
    defaultEnabled: true,
    copy: 'Square card/list preview. This crops to fill the target frame.',
  },
  {
    role: 'album_cover',
    label: 'Album cover',
    useCase: 'album_cover',
    width: 1400,
    height: 1400,
    fit: 'cover',
    contentType: 'image/webp',
    defaultEnabled: false,
    copy: 'Square cover art candidate for music pages.',
  },
  {
    role: 'video_thumbnail',
    label: 'Video thumbnail',
    useCase: 'video_thumbnail',
    width: 1280,
    height: 720,
    fit: 'cover',
    contentType: 'image/webp',
    defaultEnabled: false,
    copy: '16:9 thumbnail candidate for video and stream pages.',
  },
  {
    role: 'film_cover',
    label: 'Film cover',
    useCase: 'film_cover',
    width: 1000,
    height: 1500,
    fit: 'cover',
    contentType: 'image/webp',
    defaultEnabled: false,
    copy: 'Poster-like 2:3 cover candidate for film pages.',
  },
]);

export const IMAGE_LINKED_ASSET_FIELDS = Object.freeze([
  {
    field: 'canonicalImageCrabUrl',
    role: 'canonical_or_original',
    label: 'Canonical / original image',
    expectedKind: 'image',
  },
  {
    field: 'desktopRenditionCrabUrl',
    role: 'desktop_rendition',
    label: 'Desktop rendition',
    expectedKind: 'image',
  },
  {
    field: 'mobileRenditionCrabUrl',
    role: 'mobile_rendition',
    label: 'Mobile rendition',
    expectedKind: 'image',
  },
  {
    field: 'thumbnailCrabUrl',
    role: 'thumbnail',
    label: 'Thumbnail',
    expectedKind: 'image',
  },
  {
    field: 'posterCrabUrl',
    role: 'poster_or_cover',
    label: 'Poster / cover',
    expectedKind: 'image',
  },
]);

export const DEFAULT_IMAGE_RENDITION_TARGET_CSV = csvForRenditionRoles(
  IMAGE_RENDITION_TARGET_OPTIONS
    .filter((target) => target.defaultEnabled)
    .map((target) => target.role),
);

export const DEFAULT_IMAGE_DRAFT = Object.freeze({
  title: '',
  creatorDisplay: '',
  ownerPassport: '',
  description: '',
  altText: '',
  imageRole: 'standalone_image',
  useCaseCsv: 'standalone_image',
  sourceMode: 'creator_original',
  expectedMimeType: 'image/png',
  dimensions: '',
  colorProfile: 'standard_rgb',
  renditionGroupId: '',
  renditionTargetCsv: DEFAULT_IMAGE_RENDITION_TARGET_CSV,
  canonicalImageCrabUrl: '',
  desktopRenditionCrabUrl: '',
  mobileRenditionCrabUrl: '',
  thumbnailCrabUrl: '',
  posterCrabUrl: '',
  linkedSiteCrabUrl: '',
  rightsMode: 'creator_owned_original',
  accessMode: 'public_preview',
  moderationMode: 'site_policy_or_creator_default',
  tags: 'image, creator',
  contentWarning: '',
  provenanceNote: '',
});

export function buildImageManifestDraft(draft, { app, route, fileFacts, localRenditions } = {}) {
  const tags = parseTags(draft.tags);
  const linkedAssets = buildLinkedAssets(draft);
  const manualRenditions = buildManualRenditions(draft);
  const generatedRenditions = normalizeGeneratedRenditions(localRenditions);
  const selectedTargets = selectedRenditionTargets(draft.renditionTargetCsv);
  const useCases = parseUseCases(draft.useCaseCsv || draft.imageRole);
  const ownerHint =
    trimOrNull(draft.ownerPassport) ||
    trimOrNull(app?.settings?.passportSubject) ||
    trimOrNull(app?.settings?.handle);

  return {
    schema: 'crablink.local.image-draft.v1',
    manifest_kind: 'image',
    route: {
      requested_url: route?.rawInput || 'crab://image',
      normalized_url: route?.normalizedInput || 'crab://image',
      route_kind: route?.kind || 'image',
    },
    truth_boundary: {
      local_draft: true,
      local_rendition_previews: generatedRenditions.length > 0,
      backend_published: false,
      b3_cid_minted: false,
      manifest_cid_minted: false,
      wallet_mutated: false,
      roc_charged: false,
      paid_upload_performed: false,
      note:
        'This is a local React image workspace draft. Generated rendition previews are local bytes only. Real upload, receipt, b3 CID, crab URL, and manifest truth must come from the gateway-backed paid flow later.',
    },
    identity: {
      creator_display: trimOrNull(draft.creatorDisplay),
      owner_passport_hint: ownerHint,
      backend_verified: false,
    },
    ownership: {
      owner_passport_subject: ownerHint,
      rights_mode: draft.rightsMode,
      backend_verified: false,
    },
    metadata: {
      title: trimOrNull(draft.title),
      description: trimOrNull(draft.description),
      alt_text: trimOrNull(draft.altText),
      image_role: draft.imageRole,
      use_cases: useCases,
      source_mode: draft.sourceMode,
      expected_mime_type: trimOrNull(draft.expectedMimeType),
      dimensions_hint: trimOrNull(draft.dimensions),
      color_profile: trimOrNull(draft.colorProfile),
      tags,
      content_warning: trimOrNull(draft.contentWarning),
    },
    linked_assets: linkedAssets,
    rendition_plan: {
      selected_targets: selectedTargets.map((target) => ({
        role: target.role,
        label: target.label,
        use_case: target.useCase,
        width: target.width,
        height: target.height,
        fit: target.fit,
        content_type: target.contentType,
      })),
      local_generation_supported: true,
      backend_bundle_route_ready: false,
      backend_verified: false,
    },
    renditions: {
      rendition_group_id: trimOrNull(draft.renditionGroupId),
      manual_entries: manualRenditions,
      local_generated_entries: generatedRenditions,
      entries: [...manualRenditions, ...generatedRenditions],
      backend_verified: false,
      note:
        'Local generated entries contain preview dimensions and byte sizes only. They intentionally omit b3 CIDs and crab URLs until backend bundle minting exists.',
    },
    rights_policy: {
      mode: draft.rightsMode,
      provenance_note: trimOrNull(draft.provenanceNote),
      backend_verified: false,
    },
    access_policy: {
      mode: draft.accessMode,
      backend_verified: false,
    },
    economics: {
      pricing_backend_owned: true,
      payout_backend_owned: true,
      backend_verified: false,
      note: 'No custom price or payment split is claimed by this local draft.',
    },
    moderation: {
      mode: draft.moderationMode,
      content_warning: trimOrNull(draft.contentWarning),
      backend_verified: false,
    },
    storage: {
      local_file: normalizeFileFacts(fileFacts),
      content_id: null,
      manifest_cid: null,
      provider: null,
      backend_verified: false,
    },
    provenance: {
      source_mode: draft.sourceMode,
      note: trimOrNull(draft.provenanceNote),
      imported_at: null,
      backend_verified: false,
    },
    receipts: [],
    version_history: [
      {
        version: 1,
        status: 'local_draft',
        b3: null,
        manifest_cid: null,
        created_at: new Date().toISOString(),
      },
    ],
  };
}

export function statsForImageDraft(draft, fileFacts = null, localRenditions = null) {
  const tags = parseTags(draft.tags);
  const linkedAssets = buildLinkedAssets(draft);
  const manualRenditions = buildManualRenditions(draft);
  const generatedRenditions = normalizeGeneratedRenditions(localRenditions);
  const selectedTargets = selectedRenditionTargets(draft.renditionTargetCsv);
  const useCases = parseUseCases(draft.useCaseCsv || draft.imageRole);

  return {
    tags,
    tagCount: tags.length,
    useCases,
    useCaseCount: useCases.length,
    linkedAssetCount: linkedAssets.length,
    renditionCount: manualRenditions.length + generatedRenditions.length,
    manualRenditionCount: manualRenditions.length,
    generatedRenditionCount: generatedRenditions.length,
    selectedRenditionTargetCount: selectedTargets.length,
    generatedRenditionBytes: generatedRenditions.reduce(
      (total, item) => total + Number(item.size_bytes || 0),
      0,
    ),
    hasLocalFile: Boolean(fileFacts?.name),
    localFileName: fileFacts?.name || '',
    localFileBytes: Number(fileFacts?.size || 0),
    localFileType: fileFacts?.type || '',
    hasAltText: Boolean(trimOrNull(draft.altText)),
    hasRights: Boolean(trimOrNull(draft.rightsMode)),
  };
}

export function getImageCompleteness(draft, fileFacts = null) {
  const checks = [
    trimOrNull(draft.title),
    trimOrNull(draft.description),
    trimOrNull(draft.altText),
    trimOrNull(draft.creatorDisplay) || trimOrNull(draft.ownerPassport),
    trimOrNull(draft.tags),
    trimOrNull(draft.expectedMimeType),
    trimOrNull(draft.rightsMode),
    trimOrNull(draft.accessMode),
    parseUseCases(draft.useCaseCsv || draft.imageRole).length > 0,
    selectedRenditionTargets(draft.renditionTargetCsv).length > 0,
    Boolean(fileFacts?.name),
  ];

  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function labelFromSnake(value) {
  return String(value || '')
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

export function parseRenditionTargetCsv(input) {
  return String(input || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function csvForRenditionRoles(roles = []) {
  return Array.from(new Set(roles.map((role) => String(role || '').trim()).filter(Boolean))).join(',');
}

export function selectedRenditionTargets(csv) {
  const raw = csv == null ? DEFAULT_IMAGE_RENDITION_TARGET_CSV : String(csv);
  const selected = new Set(parseRenditionTargetCsv(raw));
  return IMAGE_RENDITION_TARGET_OPTIONS.filter((target) => selected.has(target.role));
}

export function parseUseCases(input) {
  return String(input || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function buildLinkedAssets(draft) {
  const base = IMAGE_LINKED_ASSET_FIELDS.map((item) => ({
    role: item.role,
    crab_url: trimOrNull(draft[item.field]),
    expected_kind: item.expectedKind,
    backend_verified: false,
  })).filter((item) => Boolean(item.crab_url));

  if (trimOrNull(draft.linkedSiteCrabUrl)) {
    base.push({
      role: 'site_context',
      crab_url: trimOrNull(draft.linkedSiteCrabUrl),
      expected_kind: 'site',
      backend_verified: false,
    });
  }

  return base;
}

function buildManualRenditions(draft) {
  return IMAGE_LINKED_ASSET_FIELDS.map((item) => ({
    role: item.role,
    label: item.label,
    crab_url: trimOrNull(draft[item.field]),
    expected_kind: item.expectedKind,
    backend_verified: false,
    source: 'manual_planning_hint',
  })).filter((item) => Boolean(item.crab_url));
}

function normalizeGeneratedRenditions(localRenditions) {
  const entries = Array.isArray(localRenditions?.entries) ? localRenditions.entries : [];

  return entries.map((entry) => ({
    role: trimOrNull(entry.role),
    label: trimOrNull(entry.label),
    use_case: trimOrNull(entry.useCase),
    width: Number(entry.width || 0),
    height: Number(entry.height || 0),
    target_width: Number(entry.targetWidth || 0),
    target_height: Number(entry.targetHeight || 0),
    fit: trimOrNull(entry.fit),
    content_type: trimOrNull(entry.contentType),
    size_bytes: Number(entry.bytes || 0),
    local_preview_only: true,
    backend_verified: false,
    minted: false,
    cid: null,
    crab_url: null,
  }));
}

function normalizeFileFacts(fileFacts) {
  if (!fileFacts) {
    return null;
  }

  return {
    name: trimOrNull(fileFacts.name),
    type: trimOrNull(fileFacts.type),
    size_bytes: Number(fileFacts.size || 0),
    width: Number(fileFacts.width || 0) || null,
    height: Number(fileFacts.height || 0) || null,
    last_modified: trimOrNull(fileFacts.lastModified),
    preview_only: true,
    b3_cid: null,
  };
}

function parseTags(input) {
  return String(input || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 24);
}

function trimOrNull(value) {
  const clean = String(value ?? '').trim();
  return clean || null;
}