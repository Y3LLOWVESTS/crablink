/**
 * RO:WHAT — Local profile draft model for the React-owned crab://profile route.
 * RO:WHY — CrabLink refactor; profile needs a polished identity surface without claiming backend profile publication.
 * RO:INTERACTS — ProfilePage, ProfileHome, ProfileEditor, ProfileAvatar, ProfileAssets, AltVault, validation helpers.
 * RO:INVARIANTS — local draft only; no fake username claim; no fake reputation/mod score; no alt linkage leak.
 * RO:METRICS — none.
 * RO:CONFIG — app settings can prefill display-only passport/wallet labels.
 * RO:SECURITY — no private keys, no seed phrases, no backend publication claim, no direct internal-service calls.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://profile route smoke.
 */

import {
  imageHashFromCrabUrl as sharedImageHashFromCrabUrl,
  isCrabImageUrl as sharedIsCrabImageUrl,
  normalizeUsernameHandle,
  validateCrabUrl,
  validateUsername,
} from '../../shared/utils/validation.js';

export const PROFILE_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const PROFILE_STATUS_OPTIONS = Object.freeze([
  { value: 'local_draft', label: 'Local draft' },
  { value: 'private_preview', label: 'Private preview' },
  { value: 'draft_saved', label: 'Draft saved' },
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

export const USERNAME_STATUS_LABELS = Object.freeze({
  local_draft: 'Local draft',
  requested: 'Requested',
  confirmed: 'Backend confirmed',
  rejected: 'Rejected',
  unavailable: 'Unavailable',
  backend_unknown: 'Backend unknown',
});

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
  const usernameTruth = getUsernameTruth(safeDraft, app);
  const validations = validateProfileDraft(safeDraft);

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
      username_backend_confirmed: usernameTruth.backendConfirmed,
      username_status: usernameTruth.status,
      reputation_backend_confirmed: false,
      moderation_backend_confirmed: false,
      alt_main_link_public: false,
      wallet_mutated: false,
      roc_charged: false,
      note:
        'This profile is a local CrabLink React draft. Backend profile publication, username claims, reputation, moderation truth, and public discovery must come from gateway-backed services later.',
    },
    validation: {
      local_syntax_only: true,
      handle: serializeValidation(validations.handle),
      avatar: serializeValidation(validations.avatar),
      banner: serializeValidation(validations.banner),
      website: serializeValidation(validations.website),
      asset_catalogue: serializeValidation(validations.assetCatalogue),
      site_catalogue: serializeValidation(validations.siteCatalogue),
    },
    identity: {
      display_name: cleanOrNull(safeDraft.displayName),
      handle_hint: cleanHandle(safeDraft.handle),
      username_hint: usernameTruth.username || null,
      username_display: usernameTruth.display || null,
      username_source: usernameTruth.source,
      username_backend_confirmed: usernameTruth.backendConfirmed,
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
        local_syntax_ok: validations.avatar.ok,
        backend_verified: false,
      },
      banner: {
        crab_url: cleanOrNull(safeDraft.bannerCrabUrl),
        expected_kind: 'image',
        local_syntax_ok: validations.banner.ok,
        backend_verified: false,
      },
    },
    catalogues: {
      assets: {
        crab_url: cleanOrNull(safeDraft.assetCatalogCrabUrl),
        local_syntax_ok: validations.assetCatalogue.ok,
        backend_verified: false,
      },
      sites: {
        crab_url: cleanOrNull(safeDraft.siteCatalogCrabUrl),
        local_syntax_ok: validations.siteCatalogue.ok,
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
  const validations = validateProfileDraft(safeDraft);
  const usernameTruth = getUsernameTruth(safeDraft, app);

  return {
    tagCount: tags.length,
    tags,
    hasAvatar: isCrabImageUrl(safeDraft.avatarCrabUrl),
    hasBanner: isCrabImageUrl(safeDraft.bannerCrabUrl),
    hasBio: Boolean(cleanOrNull(safeDraft.bio)),
    hasHandle: Boolean(cleanHandle(safeDraft.handle)),
    hasValidHandle: validations.handle.ok,
    usernameTruth,
    validations,
    hasPassport: Boolean(cleanOrNull(safeDraft.ownerPassport)),
    hasWallet: Boolean(cleanOrNull(safeDraft.walletAccount)),
    hasAssetCatalog: Boolean(cleanOrNull(safeDraft.assetCatalogCrabUrl)),
    hasSiteCatalog: Boolean(cleanOrNull(safeDraft.siteCatalogCrabUrl)),
  };
}

export function getProfileCompleteness(draft, app) {
  const safeDraft = normalizeProfileDraft(draft, app);
  const validations = validateProfileDraft(safeDraft);

  const checks = [
    cleanOrNull(safeDraft.displayName),
    validations.handle.ok,
    cleanOrNull(safeDraft.bio),
    cleanOrNull(safeDraft.tagline),
    validations.avatar.ok && cleanOrNull(safeDraft.avatarCrabUrl),
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
  const preferredHandle = preferredHandleFromSettings(settings);

  return {
    ...DEFAULT_PROFILE_DRAFT,
    ...(draft || {}),
    handle:
      cleanHandle(draft?.handle) ||
      preferredHandle ||
      DEFAULT_PROFILE_DRAFT.handle,
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

export function validateProfileDraft(draft) {
  const safeDraft = {
    ...DEFAULT_PROFILE_DRAFT,
    ...(draft || {}),
  };

  return {
    handle: validateProfileHandle(safeDraft.handle),
    avatar: validateCrabUrl(safeDraft.avatarCrabUrl, { optional: true, kind: 'image' }),
    banner: validateCrabUrl(safeDraft.bannerCrabUrl, { optional: true, kind: 'image' }),
    website: validateCrabUrl(safeDraft.websiteCrabUrl, { optional: true }),
    assetCatalogue: validateCrabUrl(safeDraft.assetCatalogCrabUrl, { optional: true }),
    siteCatalogue: validateCrabUrl(safeDraft.siteCatalogCrabUrl, { optional: true }),
  };
}

export function validateProfileHandle(value) {
  return validateUsername(value, { optional: false });
}

export function getUsernameTruth(draft, app = {}) {
  const settings = app?.settings || {};
  const safeDraft = {
    ...DEFAULT_PROFILE_DRAFT,
    ...(draft || {}),
  };

  const confirmedHandle = cleanHandle(settings.handle || settings.username);
  const requestedHandle = cleanHandle(settings.requestedHandle || settings.requestedUsername);
  const draftHandle = cleanHandle(safeDraft.handle);
  const status = normalizeUsernameStatus(settings.usernameStatus);
  const confirmed = status === 'confirmed' && Boolean(confirmedHandle);
  const rejected = status === 'rejected' || status === 'unavailable';

  if (confirmed) {
    const validation = validateProfileHandle(confirmedHandle);

    return {
      display: validation.display || confirmedHandle,
      username: validation.normalized,
      handle: validation.display || confirmedHandle,
      backendConfirmed: true,
      status,
      source: 'backend confirmed',
      tone: 'success',
      validation,
      requestedHandle,
      draftHandle,
    };
  }

  if (requestedHandle) {
    const validation = validateProfileHandle(requestedHandle);

    return {
      display: validation.display || requestedHandle,
      username: validation.normalized,
      handle: validation.display || requestedHandle,
      backendConfirmed: false,
      status: rejected ? status : status === 'requested' ? 'requested' : 'local_draft',
      source: rejected ? USERNAME_STATUS_LABELS[status] : 'requested locally',
      tone: rejected ? 'danger' : 'warning',
      validation,
      requestedHandle,
      draftHandle,
    };
  }

  const validation = validateProfileHandle(draftHandle);

  return {
    display: validation.display || draftHandle,
    username: validation.normalized,
    handle: validation.display || draftHandle,
    backendConfirmed: false,
    status: 'local_draft',
    source: 'local draft',
    tone: validation.ok ? 'warning' : 'danger',
    validation,
    requestedHandle,
    draftHandle,
  };
}

export function getRocTruth(app = {}) {
  const settings = app?.settings || {};
  const walletData = app?.walletState?.data || app?.wallet?.data || null;
  const balanceFromWallet =
    walletData?.available_display ||
    walletData?.balance_display ||
    walletData?.display ||
    walletData?.formatted ||
    '';
  const balanceFromSettings = settings.rocBalanceDisplay || '';
  const ledgerBacked = Boolean(
    walletData?.ledger_backed ||
      walletData?.ledgerBacked ||
      walletData?.source === 'ledger',
  );
  const source =
    walletData?.source ||
    (walletData ? 'gateway wallet response' : settings.rocBalanceSource ? `${settings.rocBalanceSource} (stored display hint)` : balanceFromSettings ? 'stored display hint' : 'not loaded');

  return {
    display: balanceFromWallet || balanceFromSettings || 'not loaded',
    ledgerBacked,
    source,
    checkedAt: app?.walletState?.checkedAt || settings.rocBalanceUpdatedAt || '',
  };
}

export function preferredHandleFromSettings(settings = {}) {
  return cleanHandle(
    settings.handle ||
      settings.username ||
      settings.requestedHandle ||
      settings.requestedUsername ||
      '',
  );
}

export function normalizeUsernameStatus(value) {
  const status = String(value || '').trim().toLowerCase();

  if (USERNAME_STATUS_LABELS[status]) {
    return status;
  }

  return 'backend_unknown';
}

export function parseTags(input) {
  return String(input || '')
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 24);
}

export function cleanHandle(value) {
  return normalizeUsernameHandle(value);
}

export function cleanOrNull(value) {
  const clean = String(value ?? '').trim();
  return clean || null;
}

export function isCrabImageUrl(value) {
  return sharedIsCrabImageUrl(value);
}

export function imageHashFromCrabUrl(value) {
  return sharedImageHashFromCrabUrl(value);
}

export function labelFromSnake(value) {
  return String(value || '')
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function serializeValidation(validation) {
  return {
    ok: Boolean(validation?.ok),
    code: validation?.code || '',
    message: validation?.message || '',
    normalized: validation?.normalized || '',
    display: validation?.display || '',
  };
}