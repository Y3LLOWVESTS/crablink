/**
 * RO:WHAT — Pure local-first composition model for the CrabLink following Home feed.
 * RO:WHY — FINAL_BETA Phase 9 combines public creator timelines selected by the private local following record.
 * RO:INTERACTS — localFollowing.js and publicationSummary.js only.
 * RO:INVARIANTS — followed creators only; validated public publication pages; local dedupe; newest-first chronology; bounded output.
 * RO:SECURITY — no network call, browser storage, Tauri call, public social graph, ranking signal, or economic authority.
 * RO:TEST — localFollowingFeed.test.mjs.
 */

// FINAL_BETA_PHASE9A1_LOCAL_FOLLOWING_FEED_MODEL_V1

import {
  normalizeFollowingUsername,
  normalizeLocalFollowingRecord,
} from './localFollowing.js';

import {
  assertPublicationPageV1,
} from './publicationSummary.js';

export const LOCAL_FOLLOWING_FEED_SCHEMA =
  'crablink.local-following-feed.v1';

export const LOCAL_FOLLOWING_FEED_DEFAULT_LIMIT =
  50;

export const LOCAL_FOLLOWING_FEED_MAX_ITEMS =
  50;

const COMPOSE_FIELDS =
  Object.freeze([
    'followingRecord',
    'creatorPages',
    'limit',
  ]);

const CREATOR_PAGE_FIELDS =
  Object.freeze([
    'username',
    'page',
  ]);

export function composeLocalFollowingFeed(
  input = {},
) {
  const source =
    requirePlainObject(
      input,
      'local following feed input',
    );

  assertAllowedKeys(
    source,
    COMPOSE_FIELDS,
    'local following feed input',
  );

  const followingRecord =
    source.followingRecord === null ||
    source.followingRecord === undefined
      ? null
      : normalizeLocalFollowingRecord(
          source.followingRecord,
        );

  const creatorPages =
    source.creatorPages === undefined
      ? []
      : source.creatorPages;

  if (
    Array.isArray(
      creatorPages,
    ) === false
  ) {
    throw new TypeError(
      'local following feed creatorPages must be an array',
    );
  }

  const limit =
    normalizeFeedLimit(
      source.limit,
    );

  const followedUsernames =
    new Set(
      followingRecord === null
        ? []
        : followingRecord.entries.map(
            (entry) =>
              entry.username,
          ),
    );

  const hydratedUsernames =
    new Set();

  const publicationsByKey =
    new Map();

  for (
    const creatorPage
    of creatorPages
  ) {
    const reviewedSource =
      requirePlainObject(
        creatorPage,
        'local following feed creator page',
      );

    assertAllowedKeys(
      reviewedSource,
      CREATOR_PAGE_FIELDS,
      'local following feed creator page',
    );

    const username =
      normalizeFollowingUsername(
        reviewedSource.username,
      );

    if (
      followedUsernames.has(
        username,
      ) === false
    ) {
      throw new TypeError(
        `local following feed source is not locally followed: ${username}`,
      );
    }

    const page =
      assertPublicationPageV1(
        reviewedSource.page,
      );

    hydratedUsernames.add(
      username,
    );

    for (
      const publication
      of page.items
    ) {
      if (
        publication.creator.username !==
        username
      ) {
        throw new TypeError(
          `local following feed creator mismatch for ${publication.publicationId}`,
        );
      }

      if (
        publication.visibility !==
        'public'
      ) {
        continue;
      }

      const key =
        `${username}:${publication.publicationId}`;

      if (
        publicationsByKey.has(
          key,
        )
      ) {
        const previous =
          publicationsByKey.get(
            key,
          );

        if (
          JSON.stringify(
            previous,
          ) ===
          JSON.stringify(
            publication,
          )
        ) {
          continue;
        }

        throw new TypeError(
          `local following feed contains conflicting duplicate publication: ${key}`,
        );
      }

      publicationsByKey.set(
        key,
        publication,
      );
    }
  }

  const merged =
    Array.from(
      publicationsByKey.values(),
    );

  merged.sort(
    comparePublicationsChronologically,
  );

  const truncated =
    merged.length > limit;

  const items =
    Object.freeze(
      merged.slice(
        0,
        limit,
      ),
    );

  return Object.freeze({
    schema:
      LOCAL_FOLLOWING_FEED_SCHEMA,
    items,
    followedCreatorCount:
      followedUsernames.size,
    hydratedCreatorCount:
      hydratedUsernames.size,
    sourcePageCount:
      creatorPages.length,
    truncated,
  });
}

function comparePublicationsChronologically(
  left,
  right,
) {
  const timestampOrder =
    Date.parse(
      right.publishedAt,
    ) -
    Date.parse(
      left.publishedAt,
    );

  if (
    timestampOrder === 0
  ) {
    const creatorOrder =
      left.creator.username.localeCompare(
        right.creator.username,
      );

    if (
      creatorOrder === 0
    ) {
      return left.publicationId
        .localeCompare(
          right.publicationId,
        );
    }

    return creatorOrder;
  }

  return timestampOrder;
}

function normalizeFeedLimit(
  value,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return LOCAL_FOLLOWING_FEED_DEFAULT_LIMIT;
  }

  if (
    Number.isInteger(
      value,
    ) === false ||
    value < 1 ||
    value >
      LOCAL_FOLLOWING_FEED_MAX_ITEMS
  ) {
    throw new RangeError(
      `local following feed limit must be an integer from 1 through ${LOCAL_FOLLOWING_FEED_MAX_ITEMS}`,
    );
  }

  return value;
}

function requirePlainObject(
  value,
  label,
) {
  if (
    value === null ||
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
      ) === false
    ) {
      throw new TypeError(
        `${label} contains unsupported field: ${key}`,
      );
    }
  }
}
