/**
 * RO:WHAT — Local profile draft model for the React-owned crab://profile route.
 * RO:WHY — CrabLink refactor; profile needs a polished identity surface without claiming backend profile publication.
 * RO:INTERACTS — ProfilePage, ProfileHome, ProfileEditor, ProfileAvatar, ProfileAssets, AltVault.
 * RO:INVARIANTS — local draft only; no fake username claim; no fake reputation/mod score; no alt linkage leak.
 * RO:METRICS — none.
 * RO:CONFIG — app settings can prefill display-only passport/wallet labels.
 * RO:SECURITY — no private keys, no seed phrases, no backend publication claim, no direct internal-service calls.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://profile route smoke.
 */

export const PROFILE_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const PROFILE_STATUS_OPTIONS = Object.freeze([
  { value: 'local_draft', label: 'Local draft' },
  { value: 'private_preview', label: 'Private preview' },
  { value: 'publish_later', label: 'Publish later' },
  { value: 'backend_required', label: 'Backend required' },
]);

export const PROFILE_DISCOVERY_OPTIONS = Object.freeze([
  { value: 'not_published', label: 'Not published' },
  { value: 'local_only', label: 'Local only' },
  { value: 'public_manifest_future', label: 'Public manifest future' },
  { value: 'username_claim_future', label: '@username claim future' },
]);

export const PROFILE_ALT_POLICY_OPTIONS = Object.freeze([
  { value: 'private_by_default', label: 'Private by default' },
  { value: 'never_link_publicly', label: 'Never link publicly' },
  { value: 'site_scoped_alt_future', label: 'Site-scoped alt future' },
  { value: 'manual_disclosure_only', label: 'Manual disclosure only' },
]);

export const DEFAULT_PROFILE_DRAFT = Object.freeze({
  displayName: 'Skinnycrabby',
  handle: '@skinnycrabby',
  bio: '',
  tagline: 'CrabLink creator profile draft',
  avatarCrabUrl: '',
  bannerCrabUrl: '',
  ownerPassport: '',
  walletAccount: '',
  profileStatus: 'local_draft',
  discoveryMode: 'not_published',
  altPolicyMode: 'private_by_default',
  locationLabel: '',
  websiteCrabUrl: '',
  assetCatalogCrabUrl: '',
  siteCatalogCrabUrl: '',
  tags: 'creator, crablink',
  reputationNote: 'Not backend confirmed',
  moderationNote: 'Not backend confirmed',
});

export function buildProfileManifestDraft(draft, { app, route } = {}) {
  const safeDraft = normalizeProfileDraft(draft, app);
  const tags = parseTags(safeDraft.tags);

  return {
    schema: 'crablink.local.profile-draft.v1',
    manifest_kind: 'profile',
    route: {
      requested_url: route?.rawInput || 'crab://profile',
      normalized_url: route?.normalizedInput || 'crab://profile',
      route_kind: route?.kind || 'profile',
    },
    truth_boundary: {
      local_draft: true,
      backend_published: false,
      public_profile_cid_exists: false,
      username_backend_confirmed: false,
      reputation_backend_confirmed: false,
      moderation_backend_confirmed: false,
      alt_main_link_public: false,
      wallet_mutated: false,
      roc_charged: false,
      note:
        'This profile is a local CrabLink React draft. Backend profile publication, username claims, reputation, moderation truth, and public discovery must come from gateway-backed services later.',
    },
    identity: {
      display_name: cleanOrNull(safeDraft.displayName),
      handle_hint: cleanHandle(safeDraft.handle),
      owner_passport_hint: cleanOrNull(safeDraft.ownerPassport),
      wallet_account_hint: cleanOrNull(safeDraft.walletAccount),
      backend_verified: false,
    },
    profile: {
      tagline: cleanOrNull(safeDraft.tagline),
      bio: cleanOrNull(safeDraft.bio),
      location_label: cleanOrNull(safeDraft.locationLabel),
      website_crab_url: cleanOrNull(safeDraft.websiteCrabUrl),
      tags,
      status: safeDraft.profileStatus,
      discovery_mode: safeDraft.discoveryMode,
    },
    media: {
      avatar: {
        crab_url: cleanOrNull(safeDraft.avatarCrabUrl),
        expected_kind: 'image',
        backend_verified: false,
      },
      banner: {
        crab_url: cleanOrNull(safeDraft.bannerCrabUrl),
        expected_kind: 'image',
        backend_verified: false,
      },
    },
    catalogues: {
      assets: {
        crab_url: cleanOrNull(safeDraft.assetCatalogCrabUrl),
        backend_verified: false,
      },
      sites: {
        crab_url: cleanOrNull(safeDraft.siteCatalogCrabUrl),
        backend_verified: false,
      },
    },
    reputation_summary: {
      score: null,
      display: safeDraft.reputationNote || 'Not backend confirmed',
      backend_verified: false,
    },
    moderation_summary: {
      score: null,
      display: safeDraft.moderationNote || 'Not backend confirmed',
      backend_verified: false,
    },
    alt_privacy: {
      mode: safeDraft.altPolicyMode,
      main_to_alt_public_link: false,
      alt_to_main_public_link: false,
      note:
        'Alt identities remain private by default. This local profile draft does not reveal or compute alt linkage.',
    },
    receipts: [],
    version_history: [
      {
        version: 1,
        status: 'local_draft',
        profile_manifest_cid: null,
        created_at: new Date().toISOString(),
      },
    ],
  };
}

export function statsForProfileDraft(draft, app) {
  const safeDraft = normalizeProfileDraft(draft, app);
  const tags = parseTags(safeDraft.tags);

  return {
    tagCount: tags.length,
    tags,
    hasAvatar: isCrabImageUrl(safeDraft.avatarCrabUrl),
    hasBanner: isCrabImageUrl(safeDraft.bannerCrabUrl),
    hasBio: Boolean(cleanOrNull(safeDraft.bio)),
    hasHandle: Boolean(cleanHandle(safeDraft.handle)),
    hasPassport: Boolean(cleanOrNull(safeDraft.ownerPassport)),
    hasAssetCatalog: Boolean(cleanOrNull(safeDraft.assetCatalogCrabUrl)),
    hasSiteCatalog: Boolean(cleanOrNull(safeDraft.siteCatalogCrabUrl)),
  };
}

export function getProfileCompleteness(draft, app) {
  const safeDraft = normalizeProfileDraft(draft, app);
  const checks = [
    cleanOrNull(safeDraft.displayName),
    cleanHandle(safeDraft.handle),
    cleanOrNull(safeDraft.bio),
    cleanOrNull(safeDraft.tagline),
    cleanOrNull(safeDraft.avatarCrabUrl),
    cleanOrNull(safeDraft.ownerPassport),
    cleanOrNull(safeDraft.walletAccount),
    cleanOrNull(safeDraft.tags),
    safeDraft.profileStatus,
    safeDraft.altPolicyMode,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function normalizeProfileDraft(draft, app) {
  const settings = app?.settings || {};

  return {
    ...DEFAULT_PROFILE_DRAFT,
    ...(draft || {}),
    ownerPassport:
      cleanOrNull(draft?.ownerPassport) ||
      cleanOrNull(settings.passportSubject) ||
      DEFAULT_PROFILE_DRAFT.ownerPassport,
    walletAccount:
      cleanOrNull(draft?.walletAccount) ||
      cleanOrNull(settings.walletAccount) ||
      DEFAULT_PROFILE_DRAFT.walletAccount,
  };
}

export function parseTags(input) {
  return String(input || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 24);
}

export function cleanHandle(value) {
  const clean = String(value || '').trim();
  if (!clean) {
    return '';
  }

  return clean.startsWith('@') ? clean : `@${clean}`;
}

export function cleanOrNull(value) {
  const clean = String(value ?? '').trim();
  return clean || null;
}

export function isCrabImageUrl(value) {
  return /^crab:\/\/[0-9a-f]{64}\.image$/i.test(String(value || '').trim());
}

export function imageHashFromCrabUrl(value) {
  const match = String(value || '').trim().match(/^crab:\/\/([0-9a-f]{64})\.image$/i);
  return match ? match[1].toLowerCase() : '';
}

export function labelFromSnake(value) {
  return String(value || '')
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}