/**
 * RO:WHAT — Strict bounded display cache for previously validated local-first Home publication summaries.
 * RO:WHY — Home may retain prior public summaries for truthful stale/offline rendering during temporary network loss.
 * RO:INTERACTS — PublicationSummaryV1 and crablink.local-following.v1 only.
 * RO:INVARIANTS — maximum 50 summaries; public summaries only; deterministic chronology; current local follows gate offline visibility.
 * RO:SECURITY — cache is display-only and never creates follows, posts, deletion truth, freshness, entitlement, paid unlock, ranking, receipt, wallet, ledger, QuickChain, ROX, or Solana authority.
 * RO:TEST — localFollowingFeedCache.test.mjs.
 */

// FINAL_BETA_PHASE9A6_BOUNDED_OFFLINE_FEED_CACHE_CORE_V1

import {
  assertPublicationSummaryV1,
} from './publicationSummary.js';

import {
  normalizeLocalFollowingRecord,
} from './localFollowing.js';

export const LOCAL_FOLLOWING_FEED_CACHE_SCHEMA =
  'crablink.local-following-feed-cache.v1';

export const LOCAL_FOLLOWING_FEED_CACHE_VIEW_SCHEMA =
  'crablink.local-following-feed-cache-view.v1';

export const LOCAL_FOLLOWING_FEED_CACHE_MAX_ITEMS =
  50;

const FEED_SCHEMA =
  'crablink.local-following-feed.v1';

const CACHE_FIELDS =
  Object.freeze([
    'schema',
    'items',
    'cachedAt',
  ]);

const UPDATE_FIELDS =
  Object.freeze([
    'cache',
    'feed',
    'cachedAt',
  ]);

const VIEW_FIELDS =
  Object.freeze([
    'cache',
    'followingRecord',
  ]);

export function createLocalFollowingFeedCache(
  input = {},
) {
  return updateLocalFollowingFeedCache({
    cache:
      null,
    feed:
      input.feed,
    cachedAt:
      input.cachedAt,
  });
}

export function updateLocalFollowingFeedCache(
  input = {},
) {
  const source =
    requirePlainObject(
      input,
      'local following feed cache update',
    );

  assertAllowedKeys(
    source,
    UPDATE_FIELDS,
    'local following feed cache update',
  );

  const cachedAt =
    normalizeCanonicalTimestamp(
      source.cachedAt,
      'local following feed cache cachedAt',
    );

  const previous =
    source.cache ===
      null ||
    source.cache ===
      undefined
      ? null
      : normalizeLocalFollowingFeedCache(
          source.cache,
        );

  if (
    previous !==
      null &&
    Date.parse(
      cachedAt,
    ) <
      Date.parse(
        previous.cachedAt,
      )
  ) {
    throw new RangeError(
      'local following feed cache cachedAt must not regress',
    );
  }

  const incomingItems =
    normalizeFeedItems(
      source.feed,
    );

  const byIdentity =
    new Map();

  if (
    previous !==
    null
  ) {
    for (
      const item
      of previous.items
    ) {
      byIdentity.set(
        publicationIdentity(
          item,
        ),
        item,
      );
    }
  }

  for (
    const item
    of incomingItems
  ) {
    byIdentity.set(
      publicationIdentity(
        item,
      ),
      item,
    );
  }

  const items =
    [...byIdentity.values()]
      .sort(
        comparePublications,
      )
      .slice(
        0,
        LOCAL_FOLLOWING_FEED_CACHE_MAX_ITEMS,
      );

  return freezeCache({
    schema:
      LOCAL_FOLLOWING_FEED_CACHE_SCHEMA,
    items,
    cachedAt,
  });
}

export function normalizeLocalFollowingFeedCache(
  value,
) {
  const source =
    requirePlainObject(
      value,
      'local following feed cache',
    );

  assertExactKeys(
    source,
    CACHE_FIELDS,
    'local following feed cache',
  );

  if (
    source.schema !==
      LOCAL_FOLLOWING_FEED_CACHE_SCHEMA
  ) {
    throw new TypeError(
      'local following feed cache schema is invalid',
    );
  }

  const cachedAt =
    normalizeCanonicalTimestamp(
      source.cachedAt,
      'local following feed cache cachedAt',
    );

  if (
    Array.isArray(
      source.items,
    ) ===
      false
  ) {
    throw new TypeError(
      'local following feed cache items must be an array',
    );
  }

  if (
    source.items.length >
      LOCAL_FOLLOWING_FEED_CACHE_MAX_ITEMS
  ) {
    throw new RangeError(
      `local following feed cache exceeds ${LOCAL_FOLLOWING_FEED_CACHE_MAX_ITEMS} items`,
    );
  }

  const items =
    normalizePublicationItems(
      source.items,
      'local following feed cache',
    );

  assertDeterministicOrder(
    items,
  );

  return freezeCache({
    schema:
      LOCAL_FOLLOWING_FEED_CACHE_SCHEMA,
    items,
    cachedAt,
  });
}

export function projectOfflineLocalFollowingFeedCache(
  input = {},
) {
  const source =
    requirePlainObject(
      input,
      'offline local following feed cache projection',
    );

  assertAllowedKeys(
    source,
    VIEW_FIELDS,
    'offline local following feed cache projection',
  );

  const cache =
    normalizeLocalFollowingFeedCache(
      source.cache,
    );

  const followingRecord =
    source.followingRecord ===
      null ||
    source.followingRecord ===
      undefined
      ? null
      : normalizeLocalFollowingRecord(
          source.followingRecord,
        );

  const followedUsernames =
    new Set(
      followingRecord ===
        null
        ? []
        : followingRecord.entries.map(
            (entry) =>
              entry.username,
          ),
    );

  const items =
    cache.items.filter(
      (item) =>
        followedUsernames.has(
          item.creator.username,
        ),
    );

  return Object.freeze({
    schema:
      LOCAL_FOLLOWING_FEED_CACHE_VIEW_SCHEMA,
    status:
      'stale-offline',
    items:
      Object.freeze([
        ...items,
      ]),
    cachedAt:
      cache.cachedAt,
    sourceItemCount:
      cache.items.length,
    visibleItemCount:
      items.length,
    filteredItemCount:
      cache.items.length -
      items.length,
  });
}

function normalizeFeedItems(
  feed,
) {
  const source =
    requirePlainObject(
      feed,
      'local following feed cache source feed',
    );

  if (
    source.schema !==
      FEED_SCHEMA
  ) {
    throw new TypeError(
      'local following feed cache requires the reviewed local following feed schema',
    );
  }

  if (
    Array.isArray(
      source.items,
    ) ===
      false
  ) {
    throw new TypeError(
      'local following feed cache source items must be an array',
    );
  }

  if (
    source.items.length >
      LOCAL_FOLLOWING_FEED_CACHE_MAX_ITEMS
  ) {
    throw new RangeError(
      `local following feed cache source exceeds ${LOCAL_FOLLOWING_FEED_CACHE_MAX_ITEMS} items`,
    );
  }

  const items =
    normalizePublicationItems(
      source.items,
      'local following feed cache source',
    );

  assertDeterministicOrder(
    items,
  );

  return items;
}

function normalizePublicationItems(
  values,
  label,
) {
  const seen =
    new Set();

  const items =
    [];

  for (
    const raw
    of values
  ) {
    const item =
      assertPublicationSummaryV1(
        raw,
      );

    if (
      item.visibility !==
        'public'
    ) {
      throw new TypeError(
        `${label} may cache only public publication summaries`,
      );
    }

    const identity =
      publicationIdentity(
        item,
      );

    if (
      seen.has(
        identity,
      )
    ) {
      throw new TypeError(
        `${label} contains duplicate publication identity: ${identity}`,
      );
    }

    seen.add(
      identity,
    );

    items.push(
      item,
    );
  }

  return items;
}

function publicationIdentity(
  item,
) {
  return `${item.creator.username}:${item.publicationId}`;
}

function comparePublications(
  left,
  right,
) {
  const timeDifference =
    Date.parse(
      right.publishedAt,
    ) -
    Date.parse(
      left.publishedAt,
    );

  if (
    timeDifference !==
      0
  ) {
    return timeDifference;
  }

  const creatorDifference =
    left.creator.username.localeCompare(
      right.creator.username,
    );

  if (
    creatorDifference !==
      0
  ) {
    return creatorDifference;
  }

  return left.publicationId.localeCompare(
    right.publicationId,
  );
}

function assertDeterministicOrder(
  items,
) {
  const sorted =
    [...items].sort(
      comparePublications,
    );

  for (
    let index = 0;
    index < items.length;
    index += 1
  ) {
    if (
      publicationIdentity(
        items[index],
      ) !==
        publicationIdentity(
          sorted[index],
        )
    ) {
      throw new TypeError(
        'local following feed cache items must use reviewed chronological ordering',
      );
    }
  }
}

function freezeCache(
  value,
) {
  return Object.freeze({
    schema:
      value.schema,
    items:
      Object.freeze([
        ...value.items,
      ]),
    cachedAt:
      value.cachedAt,
  });
}

function normalizeCanonicalTimestamp(
  value,
  label,
) {
  if (
    typeof value !==
      'string' ||
    value.length ===
      0
  ) {
    throw new TypeError(
      `${label} must be a timestamp`,
    );
  }

  const milliseconds =
    Date.parse(
      value,
    );

  if (
    Number.isFinite(
      milliseconds,
    ) ===
      false
  ) {
    throw new TypeError(
      `${label} must be a timestamp`,
    );
  }

  const canonical =
    new Date(
      milliseconds,
    ).toISOString();

  if (
    canonical !==
      value
  ) {
    throw new TypeError(
      `${label} must be canonical ISO time`,
    );
  }

  return canonical;
}

function requirePlainObject(
  value,
  label,
) {
  if (
    value ===
      null ||
    typeof value !==
      'object' ||
    Array.isArray(
      value,
    ) ||
    Object.getPrototypeOf(
      value,
    ) !==
      Object.prototype
  ) {
    throw new TypeError(
      `${label} must be a plain object`,
    );
  }

  return value;
}

function assertAllowedKeys(
  source,
  allowed,
  label,
) {
  for (
    const key
    of Object.keys(
      source,
    )
  ) {
    if (
      allowed.includes(
        key,
      ) ===
        false
    ) {
      throw new TypeError(
        `${label} contains unsupported field: ${key}`,
      );
    }
  }
}

function assertExactKeys(
  source,
  expected,
  label,
) {
  assertAllowedKeys(
    source,
    expected,
    label,
  );

  for (
    const key
    of expected
  ) {
    if (
      Object.hasOwn(
        source,
        key,
      ) ===
        false
    ) {
      throw new TypeError(
        `${label} requires field: ${key}`,
      );
    }
  }
}
