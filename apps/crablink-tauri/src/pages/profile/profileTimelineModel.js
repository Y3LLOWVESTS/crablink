/**
 * RO:WHAT — Pure public-profile timeline presentation model for FINAL_BETA Phase 7.
 * RO:WHY — Profile UI needs one deterministic interpretation of backend publication pages.
 * RO:INTERACTS — PublicationPageV1, desktop publication adapter, and future profile timeline UI.
 * RO:INVARIANTS — backend-derived pages only; bounded pagination; owner edit only for own profile.
 * RO:SECURITY — local catalog is never public-profile authority and relationship actions remain absent.
 * RO:TEST — profileTimelineModel.test.mjs.
 */

// FINAL_BETA_PHASE7A1_PROFILE_TIMELINE_MODEL_V1

export const PROFILE_TIMELINE_TABS =
  Object.freeze([
    Object.freeze({
      id:
        'posts',
      label:
        'Posts',
    }),
    Object.freeze({
      id:
        'about',
      label:
        'About',
    }),
    Object.freeze({
      id:
        'sites',
      label:
        'Sites',
    }),
  ]);

export const PROFILE_TIMELINE_STATUSES =
  Object.freeze([
    'idle',
    'loading',
    'ready',
    'stale',
    'offline',
    'error',
  ]);

const INPUT_FIELDS =
  Object.freeze([
    'username',
    'page',
    'activeTab',
    'status',
    'isOwner',
    'errorMessage',
    'lastUpdatedAt',
  ]);

const USERNAME_PATTERN =
  /^[a-z0-9][a-z0-9_-]{2,31}$/u;

export function createProfileTimelineModel(
  input = {},
) {
  const source =
    requireRecord(
      input,
      'profile timeline input',
    );

  rejectUnknownFields(
    source,
  );

  const username =
    normalizeUsername(
      source.username,
    );

  const status =
    normalizeStatus(
      source.status,
    );

  const activeTab =
    normalizeTab(
      source.activeTab,
    );

  const isOwner =
    normalizeOwner(
      source.isOwner,
    );

  const page =
    normalizePage(
      source.page,
    );

  const items =
    page
      ? page.items
      : Object.freeze([]);

  const pinnedPublication =
    items.find(
      (item) =>
        item.pinned === true,
    ) || null;

  const postItems =
    items.filter(
      (item) =>
        publicationKind(item) !== 'site' &&
        item !== pinnedPublication,
    );

  const siteItems =
    items.filter(
      (item) =>
        publicationKind(item) === 'site' &&
        item !== pinnedPublication,
    );

  const hasItems =
    items.length > 0;

  const empty =
    canDisplaySnapshot(status) &&
    hasItems === false;

  const freshness =
    createFreshness(
      status,
      source.lastUpdatedAt,
    );

  const tabs =
    Object.freeze(
      PROFILE_TIMELINE_TABS.map(
        (tab) =>
          Object.freeze({
            ...tab,
            visible:
              tab.id !== 'sites' ||
              siteItems.length > 0,
            selected:
              tab.id === activeTab,
          }),
      ),
    );

  const canLoadMore =
    page !== null &&
    page.hasMore === true &&
    typeof page.nextCursor === 'string' &&
    page.nextCursor.length > 0 &&
    (
      status === 'ready' ||
      status === 'stale'
    );

  const ownerAction =
    isOwner
      ? Object.freeze({
          id:
            'edit-profile',
          label:
            'Edit profile',
          route:
            'crab://profile',
        })
      : null;

  return deepFreeze({
    schema:
      'crablink.profile-timeline-model.v1',

    username,
    status,
    activeTab,
    tabs,

    pinnedPublication,
    postItems,
    siteItems,

    empty,
    emptyState:
      empty
        ? Object.freeze({
            title:
              'No publications yet',
            message:
              `@${username} has not published public content yet.`,
          })
        : null,

    pagination:
      Object.freeze({
        hasMore:
          page?.hasMore === true,
        nextCursor:
          page?.nextCursor || null,
        canLoadMore,
        pageSize:
          items.length,
        maximumPageSize:
          50,
      }),

    freshness,

    error:
      status === 'error'
        ? normalizeErrorMessage(
            source.errorMessage,
          )
        : null,

    owner:
      Object.freeze({
        isOwner,
        editAction:
          ownerAction,
      }),

    relationship:
      Object.freeze({
        followAction:
          null,
        relationshipContractReady:
          false,
      }),

    authority:
      Object.freeze({
        publicationSource:
          'backend-publication-projection',
        localCatalogAuthority:
          false,
        profileMutationAuthority:
          false,
        relationshipAuthority:
          false,
        economicAuthority:
          false,
      }),
  });
}

export function normalizeProfileTimelineTab(
  value,
) {
  return normalizeTab(
    value,
  );
}

function normalizePage(
  value,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const page =
    requireRecord(
      value,
      'profile timeline page',
    );

  if (
    page.schema !==
      'crablink.publication-page.v1'
  ) {
    throw new TypeError(
      'profile timeline requires PublicationPageV1',
    );
  }

  if (
    Array.isArray(
      page.items,
    ) === false
  ) {
    throw new TypeError(
      'profile timeline page requires items',
    );
  }

  if (
    page.items.length > 50
  ) {
    throw new RangeError(
      'profile timeline page exceeds 50 items',
    );
  }

  if (
    typeof page.hasMore !==
      'boolean'
  ) {
    throw new TypeError(
      'profile timeline page requires hasMore',
    );
  }

  if (
    page.nextCursor !== null &&
    typeof page.nextCursor !==
      'string'
  ) {
    throw new TypeError(
      'profile timeline nextCursor is invalid',
    );
  }

  if (
    page.hasMore === true &&
    (
      typeof page.nextCursor !==
        'string' ||
      page.nextCursor.length === 0
    )
  ) {
    throw new TypeError(
      'profile timeline hasMore requires nextCursor',
    );
  }

  for (const item of page.items) {
    requireRecord(
      item,
      'profile timeline publication',
    );
  }

  return deepFreeze(
    cloneJsonValue(
      page,
    ),
  );
}

function normalizeTab(
  value,
) {
  const normalized =
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : 'posts';

  const exists =
    PROFILE_TIMELINE_TABS.some(
      (tab) =>
        tab.id === normalized,
    );

  return exists
    ? normalized
    : 'posts';
}

function normalizeStatus(
  value,
) {
  const normalized =
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : 'idle';

  if (
    PROFILE_TIMELINE_STATUSES.includes(
      normalized,
    ) === false
  ) {
    throw new TypeError(
      'profile timeline status is invalid',
    );
  }

  return normalized;
}

function normalizeOwner(
  value,
) {
  if (
    value === undefined
  ) {
    return false;
  }

  if (
    typeof value !==
      'boolean'
  ) {
    throw new TypeError(
      'profile timeline isOwner requires boolean',
    );
  }

  return value;
}

function normalizeUsername(
  value,
) {
  const normalized =
    typeof value === 'string'
      ? value.trim()
      : '';

  if (
    USERNAME_PATTERN.test(
      normalized,
    ) === false
  ) {
    throw new TypeError(
      'profile timeline username is invalid',
    );
  }

  return normalized;
}

function normalizeErrorMessage(
  value,
) {
  const normalized =
    typeof value === 'string'
      ? value.trim()
      : '';

  if (
    normalized.length === 0
  ) {
    return 'Profile publications could not be loaded.';
  }

  return normalized.slice(
    0,
    240,
  );
}

function createFreshness(
  status,
  lastUpdatedAt,
) {
  const updatedAt =
    normalizeOptionalText(
      lastUpdatedAt,
      64,
    );

  if (status === 'offline') {
    return Object.freeze({
      state:
        'offline',
      label:
        'Offline copy',
      updatedAt,
      live:
        false,
    });
  }

  if (status === 'stale') {
    return Object.freeze({
      state:
        'stale',
      label:
        'May be out of date',
      updatedAt,
      live:
        false,
    });
  }

  if (status === 'loading') {
    return Object.freeze({
      state:
        'loading',
      label:
        'Loading publications',
      updatedAt:
        null,
      live:
        false,
    });
  }

  if (status === 'error') {
    return Object.freeze({
      state:
        'error',
      label:
        'Publications unavailable',
      updatedAt,
      live:
        false,
    });
  }

  if (status === 'ready') {
    return Object.freeze({
      state:
        'live',
      label:
        'Current',
      updatedAt,
      live:
        true,
    });
  }

  return Object.freeze({
    state:
      'idle',
    label:
      'Not loaded',
    updatedAt:
      null,
    live:
      false,
  });
}

function publicationKind(
  item,
) {
  if (
    typeof item.kind === 'string'
  ) {
    return item.kind;
  }

  if (
    typeof item.contentKind === 'string'
  ) {
    return item.contentKind;
  }

  return '';
}

function canDisplaySnapshot(
  status,
) {
  return (
    status === 'ready' ||
    status === 'stale' ||
    status === 'offline'
  );
}

function normalizeOptionalText(
  value,
  maximum,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(
      value,
    ).trim();

  if (
    normalized.length === 0
  ) {
    return null;
  }

  return normalized.slice(
    0,
    maximum,
  );
}

function rejectUnknownFields(
  source,
) {
  const unknown =
    Object.keys(
      source,
    ).filter(
      (key) =>
        INPUT_FIELDS.includes(
          key,
        ) === false,
    );

  if (
    unknown.length > 0
  ) {
    throw new TypeError(
      `profile timeline input contains unknown field: ${unknown[0]}`,
    );
  }
}

function requireRecord(
  value,
  label,
) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new TypeError(
      `${label} requires a plain record`,
    );
  }

  return value;
}

function cloneJsonValue(
  value,
) {
  return JSON.parse(
    JSON.stringify(
      value,
    ),
  );
}

function deepFreeze(
  value,
) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  for (
    const child
    of Object.values(value)
  ) {
    deepFreeze(
      child,
    );
  }

  return Object.freeze(
    value,
  );
}
