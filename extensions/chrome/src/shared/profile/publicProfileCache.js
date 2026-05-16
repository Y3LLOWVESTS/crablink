/**
 * RO:WHAT — Session/local cache bridge for backend-confirmed public passport profiles.
 * RO:WHY — Lets profile claim/read responses populate shell/passport UI without faking /identity/me truth.
 * RO:INTERACTS — ProfileGateway, PassportDrawer, PassportSummary, browser localStorage/session events.
 * RO:INVARIANTS — cached profile is display-only; backend confirmation still requires username_status=confirmed.
 * RO:METRICS — none.
 * RO:CONFIG — browser storage only; no backend config.
 * RO:SECURITY — stores public profile metadata only; no private keys, tokens, alt mappings, or spend authority.
 * RO:TEST — claim @username, open passport drawer, refresh page, verify backend-confirmed handle persists.
 */

export const PUBLIC_PROFILE_CACHE_KEY = 'crablink.public_profile.v1';
export const PUBLIC_PROFILE_CONFIRMED_EVENT = 'crablink:public-profile-confirmed';

export function writePublicProfileCache(profile, meta = {}) {
  const envelope = normalizePublicProfileEnvelope(profile, meta);

  if (!envelope?.profile?.handle) {
    return null;
  }

  try {
    localStorage.setItem(PUBLIC_PROFILE_CACHE_KEY, JSON.stringify(envelope));
  } catch (_error) {
    // Local cache is a display bridge only. Backend remains the source of truth.
  }

  try {
    sessionStorage.setItem(PUBLIC_PROFILE_CACHE_KEY, JSON.stringify(envelope));
  } catch (_error) {
    // Session cache is best-effort.
  }

  dispatchPublicProfileEvent(envelope);
  return envelope;
}

export function readPublicProfileCache() {
  const fromSession = readStorageJson('sessionStorage');
  if (fromSession?.profile?.handle) {
    return fromSession;
  }

  const fromLocal = readStorageJson('localStorage');
  if (fromLocal?.profile?.handle) {
    return fromLocal;
  }

  return null;
}

export function clearPublicProfileCache() {
  try {
    localStorage.removeItem(PUBLIC_PROFILE_CACHE_KEY);
  } catch (_error) {
    // Ignore cache cleanup errors.
  }

  try {
    sessionStorage.removeItem(PUBLIC_PROFILE_CACHE_KEY);
  } catch (_error) {
    // Ignore cache cleanup errors.
  }

  dispatchPublicProfileEvent(null);
}

export function subscribePublicProfileCache(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  const onCustom = (event) => {
    listener(event?.detail || readPublicProfileCache());
  };

  const onStorage = (event) => {
    if (event?.key === PUBLIC_PROFILE_CACHE_KEY) {
      listener(readPublicProfileCache());
    }
  };

  try {
    window.addEventListener(PUBLIC_PROFILE_CONFIRMED_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
  } catch (_error) {
    return () => {};
  }

  listener(readPublicProfileCache());

  return () => {
    try {
      window.removeEventListener(PUBLIC_PROFILE_CONFIRMED_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    } catch (_error) {
      // Ignore unsubscribe errors.
    }
  };
}

export function normalizePublicProfileEnvelope(profile, meta = {}) {
  const safeProfile = normalizePublicProfile(profile);

  if (!safeProfile.handle) {
    return null;
  }

  return {
    schema: 'crablink.public-profile-cache.v1',
    profile: safeProfile,
    meta: {
      source: stringValue(meta.source, 'svc-gateway public profile route'),
      action: stringValue(meta.action, ''),
      route: stringValue(meta.route, ''),
      correlationId: stringValue(meta.correlationId, meta.correlation_id, ''),
      cachedAt: new Date().toISOString(),
    },
  };
}

export function normalizePublicProfile(profile = {}) {
  const raw = objectValue(profile);
  const username = normalizeUsername(raw.username || raw.handle);
  const handle = normalizeHandle(raw.handle || username);
  const status = normalizeUsernameStatus(raw.usernameStatus || raw.username_status || raw.status);

  return {
    schema: stringValue(raw.schema, 'svc-passport.public-profile.v1'),
    passportSubject: stringValue(raw.passportSubject, raw.passport_subject),
    passportKind: stringValue(raw.passportKind, raw.passport_kind),
    username,
    handle,
    usernameStatus: status,
    usernameStatusLabel: labelForStatus(status),
    backendConfirmed: status === 'confirmed' && Boolean(handle),
    displayName: nullableString(raw.displayName, raw.display_name, raw.name),
    bio: nullableString(raw.bio),
    avatarImage: nullableString(raw.avatarImage, raw.avatar_image, raw.avatarUrl, raw.avatar_url),
    profileCrabUrl: stringValue(raw.profileCrabUrl, raw.profile_crab_url, handle ? `crab://${handle}` : ''),
    publicProfileCid: nullableString(raw.publicProfileCid, raw.public_profile_cid),
    reputationScore: nullableNumber(raw.reputationScore, raw.reputation_score),
    moderatorScore: nullableNumber(raw.moderatorScore, raw.moderator_score),
    warnings: arrayStrings(raw.warnings),
    raw,
  };
}

function dispatchPublicProfileEvent(envelope) {
  try {
    window.dispatchEvent(
      new CustomEvent(PUBLIC_PROFILE_CONFIRMED_EVENT, {
        detail: envelope,
      }),
    );
  } catch (_error) {
    // Event bridge is best-effort.
  }
}

function readStorageJson(kind) {
  try {
    const store = kind === 'sessionStorage' ? sessionStorage : localStorage;
    const raw = store.getItem(PUBLIC_PROFILE_CACHE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const envelope = normalizePublicProfileEnvelope(parsed?.profile || parsed, parsed?.meta || {});

    return envelope?.profile?.handle ? envelope : null;
  } catch (_error) {
    return null;
  }
}

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .replace(/^crab:\/\/@?/i, '')
    .replace(/^profile\/@?/i, '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase();
}

function normalizeHandle(value) {
  const username = normalizeUsername(value);
  return username ? `@${username}` : '';
}

function normalizeUsernameStatus(value) {
  const status = String(value || '').trim().toLowerCase();

  switch (status) {
    case 'confirmed':
    case 'requested':
    case 'rejected':
    case 'unavailable':
    case 'reserved':
    case 'local_draft':
      return status;
    default:
      return 'backend_unknown';
  }
}

function labelForStatus(status) {
  switch (status) {
    case 'confirmed':
      return 'Confirmed';
    case 'requested':
      return 'Requested';
    case 'rejected':
      return 'Rejected';
    case 'unavailable':
      return 'Unavailable';
    case 'reserved':
      return 'Reserved';
    case 'local_draft':
      return 'Local draft';
    default:
      return 'Backend unknown';
  }
}

function stringValue(...values) {
  for (const value of values) {
    const clean = String(value ?? '').trim();
    if (clean) return clean;
  }

  return '';
}

function nullableString(...values) {
  const clean = stringValue(...values);
  return clean || null;
}

function nullableNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    const n = Number(value);
    if (Number.isFinite(n)) {
      return n;
    }
  }

  return null;
}

function arrayStrings(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}