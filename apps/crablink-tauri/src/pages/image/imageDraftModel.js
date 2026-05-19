/**
 * RO:WHAT — Local image draft model for the React-owned crab://image workspace.
 * RO:WHY — CrabLink refactor; keeps image manifest planning deterministic without touching protected paid upload flows.
 * RO:INTERACTS — ImagePage.jsx, ImageCreate.jsx, ImagePreview.jsx, ImageRenditions.jsx, ImageManifest.jsx.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no ROC charge; no backend publication claim.
 * RO:METRICS — none.
 * RO:CONFIG — app settings can prefill display labels only.
 * RO:SECURITY — no secrets, no direct internal-service calls, no wallet authority.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://image route smoke.
 */

export const IMAGE_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const IMAGE_ROLE_OPTIONS = Object.freeze([
  { value: 'standalone_image', label: 'Standalone image' },
  { value: 'cover_image', label: 'Cover image' },
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'poster', label: 'Poster' },
  { value: 'profile_avatar', label: 'Profile avatar' },
  { value: 'banner_image', label: 'Banner image' },
  { value: 'article_hero', label: 'Article hero' },
  { value: 'ad_creative', label: 'Ad creative' },
  { value: 'game_cover', label: 'Game cover' },
  { value: 'film_poster', label: 'Film poster' },
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
  { value: 'collaborator_split_future', label: 'Collaborator split future' },
  { value: 'rights_review_needed', label: 'Rights review needed' },
]);

export const IMAGE_ACCESS_OPTIONS = Object.freeze([
  { value: 'public_preview', label: 'Public preview' },
  { value: 'free_public_asset', label: 'Free public asset' },
  { value: 'paid_full_resolution_future', label: 'Paid full-resolution future' },
  { value: 'subscriber_access_future', label: 'Subscriber access future' },
  { value: 'owner_only_draft', label: 'Owner-only draft' },
]);

export const IMAGE_PAYOUT_OPTIONS = Object.freeze([
  { value: 'creator_wallet_future', label: 'Creator wallet future' },
  { value: 'creator_provider_treasury_split_future', label: 'Creator/provider/treasury split future' },
  { value: 'site_owner_split_future', label: 'Site owner split future' },
  { value: 'no_payout_draft', label: 'No payout draft' },
]);

export const IMAGE_MODERATION_OPTIONS = Object.freeze([
  { value: 'site_policy_or_creator_default', label: 'Site policy or creator default' },
  { value: 'safe_for_general_audience', label: 'Safe for general audience' },
  { value: 'content_warning_required', label: 'Content warning required' },
  { value: 'age_gate_future', label: 'Age gate future' },
  { value: 'review_required_future', label: 'Review required future' },
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

export const DEFAULT_IMAGE_DRAFT = Object.freeze({
  title: '',
  creatorDisplay: '',
  ownerPassport: '',
  description: '',
  altText: '',
  imageRole: 'standalone_image',
  sourceMode: 'creator_original',
  expectedMimeType: 'image/png',
  dimensions: '',
  colorProfile: 'standard_rgb',
  renditionGroupId: '',
  canonicalImageCrabUrl: '',
  desktopRenditionCrabUrl: '',
  mobileRenditionCrabUrl: '',
  thumbnailCrabUrl: '',
  posterCrabUrl: '',
  linkedSiteCrabUrl: '',
  rightsMode: 'creator_owned_original',
  accessMode: 'public_preview',
  payoutMode: 'creator_wallet_future',
  moderationMode: 'site_policy_or_creator_default',
  tags: 'image, creator',
  contentWarning: '',
  provenanceNote: '',
});

export function buildImageManifestDraft(draft, { app, route, fileFacts } = {}) {
  const tags = parseTags(draft.tags);
  const linkedAssets = buildLinkedAssets(draft);
  const renditions = buildRenditions(draft);
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
      backend_published: false,
      b3_cid_minted: false,
      manifest_cid_minted: false,
      wallet_mutated: false,
      roc_charged: false,
      paid_upload_performed: false,
      note:
        'This is a local React image workspace draft. Real upload, hold, receipt, b3 CID, and manifest CID must come from the gateway-backed paid flow later.',
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
      source_mode: draft.sourceMode,
      expected_mime_type: trimOrNull(draft.expectedMimeType),
      dimensions_hint: trimOrNull(draft.dimensions),
      color_profile: trimOrNull(draft.colorProfile),
      tags,
      content_warning: trimOrNull(draft.contentWarning),
    },
    linked_assets: linkedAssets,
    renditions: {
      rendition_group_id: trimOrNull(draft.renditionGroupId),
      entries: renditions,
      backend_verified: false,
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
      payout_mode: draft.payoutMode,
      roc_price_minor: null,
      split_basis_points: null,
      backend_verified: false,
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

export function statsForImageDraft(draft, fileFacts = null) {
  const tags = parseTags(draft.tags);
  const linkedAssets = buildLinkedAssets(draft);
  const renditions = buildRenditions(draft);

  return {
    tags,
    tagCount: tags.length,
    linkedAssetCount: linkedAssets.length,
    renditionCount: renditions.length,
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
    trimOrNull(draft.dimensions),
    trimOrNull(draft.rightsMode),
    trimOrNull(draft.accessMode),
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

function buildRenditions(draft) {
  return IMAGE_LINKED_ASSET_FIELDS.map((item) => ({
    role: item.role,
    label: item.label,
    crab_url: trimOrNull(draft[item.field]),
    expected_kind: item.expectedKind,
    backend_verified: false,
  })).filter((item) => Boolean(item.crab_url));
}

function normalizeFileFacts(fileFacts) {
  if (!fileFacts) {
    return null;
  }

  return {
    name: trimOrNull(fileFacts.name),
    type: trimOrNull(fileFacts.type),
    size_bytes: Number(fileFacts.size || 0),
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