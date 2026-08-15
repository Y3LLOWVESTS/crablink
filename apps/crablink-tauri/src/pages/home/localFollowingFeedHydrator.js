/**
 * RO:WHAT — Bounded local-first hydration of public timelines for locally followed creators.
 * RO:WHY — Home needs network-published creator timelines without uploading the private following list.
 * RO:INTERACTS — localFollowingPort, publicationPort, local following normalization, PublicationPageV1, and Phase 9A1 composition.
 * RO:INVARIANTS — one local following read; individual creator timeline reads; bounded batch and concurrency; truthful partial failure.
 * RO:SECURITY — never sends the complete following record to the network and grants no follow, wallet, ledger, receipt, ranking, or finality authority.
 * RO:TEST — localFollowingFeedHydrator.test.mjs.
 */

// FINAL_BETA_PHASE9A2_CREATOR_TIMELINE_HYDRATION_V1

import {
  normalizeLocalFollowingRecord,
} from '../../../../../packages/crablink-core/src/localFollowing.js';

import {
  composeLocalFollowingFeed,
} from '../../../../../packages/crablink-core/src/localFollowingFeed.js';

import {
  assertPublicationPageV1,
} from '../../../../../packages/crablink-core/src/publicationSummary.js';

export const LOCAL_FOLLOWING_HYDRATION_SCHEMA =
  'crablink.local-following-hydration.v1';

export const LOCAL_FOLLOWING_HYDRATION_DEFAULT_CREATOR_LIMIT =
  16;

export const LOCAL_FOLLOWING_HYDRATION_MAX_CREATORS =
  32;

export const LOCAL_FOLLOWING_HYDRATION_DEFAULT_CONCURRENCY =
  4;

export const LOCAL_FOLLOWING_HYDRATION_MAX_CONCURRENCY =
  8;

export const LOCAL_FOLLOWING_HYDRATION_DEFAULT_PUBLICATION_LIMIT =
  20;

export const LOCAL_FOLLOWING_HYDRATION_MAX_PUBLICATION_LIMIT =
  50;

const INPUT_FIELDS =
  Object.freeze([
    'followingPort',
    'publicationPort',
    'creatorOffset',
    'creatorLimit',
    'concurrency',
    'publicationLimit',
  ]);

export async function hydrateLocalFollowingFeedBatch(
  input = {},
) {
  const source =
    requirePlainObject(
      input,
      'local following hydration input',
    );

  assertAllowedKeys(
    source,
    INPUT_FIELDS,
    'local following hydration input',
  );

  const followingPort =
    requireFollowingPort(
      source.followingPort,
    );

  const publicationPort =
    requirePublicationPort(
      source.publicationPort,
    );

  const creatorOffset =
    normalizeOffset(
      source.creatorOffset,
    );

  const creatorLimit =
    normalizeBoundedInteger(
      source.creatorLimit,
      LOCAL_FOLLOWING_HYDRATION_DEFAULT_CREATOR_LIMIT,
      1,
      LOCAL_FOLLOWING_HYDRATION_MAX_CREATORS,
      'local following hydration creatorLimit',
    );

  const concurrency =
    normalizeBoundedInteger(
      source.concurrency,
      LOCAL_FOLLOWING_HYDRATION_DEFAULT_CONCURRENCY,
      1,
      LOCAL_FOLLOWING_HYDRATION_MAX_CONCURRENCY,
      'local following hydration concurrency',
    );

  const publicationLimit =
    normalizeBoundedInteger(
      source.publicationLimit,
      LOCAL_FOLLOWING_HYDRATION_DEFAULT_PUBLICATION_LIMIT,
      1,
      LOCAL_FOLLOWING_HYDRATION_MAX_PUBLICATION_LIMIT,
      'local following hydration publicationLimit',
    );

  const rawFollowing =
    await followingPort
      .readLocalFollowing();

  const followingRecord =
    rawFollowing === null ||
    rawFollowing === undefined
      ? null
      : normalizeLocalFollowingRecord(
          rawFollowing,
        );

  const entries =
    followingRecord === null
      ? []
      : followingRecord.entries;

  const selectedEntries =
    entries.slice(
      creatorOffset,
      creatorOffset +
        creatorLimit,
    );

  const hasMoreCreators =
    creatorOffset +
      selectedEntries.length <
    entries.length;

  const nextCreatorOffset =
    hasMoreCreators
      ? creatorOffset +
        selectedEntries.length
      : null;

  if (
    selectedEntries.length ===
    0
  ) {
    return freezeHydrationResult({
      status:
        'empty',
      feed:
        composeLocalFollowingFeed({
          followingRecord,
          creatorPages:
            [],
        }),
      creatorPages:
        [],
      failures:
        [],
      followedCreatorCount:
        entries.length,
      selectedCreatorCount:
        0,
      successfulCreatorCount:
        0,
      failedCreatorCount:
        0,
      creatorOffset,
      nextCreatorOffset,
      hasMoreCreators,
      publicationLimit,
    });
  }

  const results =
    new Array(
      selectedEntries.length,
    );

  let nextIndex =
    0;

  async function hydrateWorker() {
    while (
      nextIndex <
      selectedEntries.length
    ) {
      const index =
        nextIndex;

      nextIndex +=
        1;

      const entry =
        selectedEntries[index];

      try {
        const rawPage =
          await publicationPort
            .listCreatorPublications({
              username:
                entry.username,
              limit:
                publicationLimit,
            });

        const page =
          assertPublicationPageV1(
            rawPage,
          );

        composeLocalFollowingFeed({
          followingRecord,
          creatorPages: [
            {
              username:
                entry.username,
              page,
            },
          ],
        });

        results[index] =
          Object.freeze({
            status:
              'fulfilled',
            username:
              entry.username,
            page,
          });
      } catch (error) {
        results[index] =
          Object.freeze({
            status:
              'rejected',
            username:
              entry.username,
            failure:
              normalizeHydrationFailure(
                error,
                entry.username,
              ),
          });
      }
    }
  }

  const workerCount =
    Math.min(
      concurrency,
      selectedEntries.length,
    );

  await Promise.all(
    Array.from(
      {
        length:
          workerCount,
      },
      () =>
        hydrateWorker(),
    ),
  );

  const creatorPages =
    Object.freeze(
      results
        .filter(
          (result) =>
            result.status ===
            'fulfilled',
        )
        .map(
          (result) =>
            Object.freeze({
              username:
                result.username,
              page:
                result.page,
            }),
        ),
    );

  const failures =
    Object.freeze(
      results
        .filter(
          (result) =>
            result.status ===
            'rejected',
        )
        .map(
          (result) =>
            result.failure,
        ),
    );

  const feed =
    composeLocalFollowingFeed({
      followingRecord,
      creatorPages,
    });

  const successfulCreatorCount =
    creatorPages.length;

  const failedCreatorCount =
    failures.length;

  let status =
    'ready';

  if (
    successfulCreatorCount ===
      0 &&
    failedCreatorCount >
      0
  ) {
    status =
      'error';
  } else if (
    failedCreatorCount >
    0
  ) {
    status =
      'partial';
  }

  return freezeHydrationResult({
    status,
    feed,
    creatorPages,
    failures,
    followedCreatorCount:
      entries.length,
    selectedCreatorCount:
      selectedEntries.length,
    successfulCreatorCount,
    failedCreatorCount,
    creatorOffset,
    nextCreatorOffset,
    hasMoreCreators,
    publicationLimit,
  });
}

function requireFollowingPort(
  value,
) {
  if (
    value === null ||
    typeof value !==
      'object' ||
    typeof value.readLocalFollowing !==
      'function'
  ) {
    throw new TypeError(
      'local following hydration requires readLocalFollowing',
    );
  }

  return value;
}

function requirePublicationPort(
  value,
) {
  if (
    value === null ||
    typeof value !==
      'object' ||
    typeof value.listCreatorPublications !==
      'function'
  ) {
    throw new TypeError(
      'local following hydration requires listCreatorPublications',
    );
  }

  return value;
}

function normalizeOffset(
  value,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return 0;
  }

  if (
    Number.isInteger(
      value,
    ) === false ||
    value < 0
  ) {
    throw new RangeError(
      'local following hydration creatorOffset must be a non-negative integer',
    );
  }

  return value;
}

function normalizeBoundedInteger(
  value,
  fallback,
  minimum,
  maximum,
  label,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  if (
    Number.isInteger(
      value,
    ) === false ||
    value < minimum ||
    value > maximum
  ) {
    throw new RangeError(
      `${label} must be an integer from ${minimum} through ${maximum}`,
    );
  }

  return value;
}

function normalizeHydrationFailure(
  error,
  username,
) {
  const message =
    String(
      error?.message ||
      'creator timeline hydration failed',
    )
      .trim()
      .slice(
        0,
        240,
      );

  const status =
    Number(
      error?.status ||
      error?.response?.status ||
      0,
    );

  const retryable =
    error?.retryable === true ||
    status === 0 ||
    status === 408 ||
    status === 429 ||
    status >= 500;

  return Object.freeze({
    username,
    message:
      message ||
      'creator timeline hydration failed',
    status:
      Number.isFinite(
        status,
      )
        ? status
        : 0,
    retryable,
  });
}

function freezeHydrationResult(
  value,
) {
  return Object.freeze({
    schema:
      LOCAL_FOLLOWING_HYDRATION_SCHEMA,
    status:
      value.status,
    feed:
      value.feed,
    creatorPages:
      Object.freeze([
        ...value.creatorPages,
      ]),
    failures:
      Object.freeze([
        ...value.failures,
      ]),
    followedCreatorCount:
      value.followedCreatorCount,
    selectedCreatorCount:
      value.selectedCreatorCount,
    successfulCreatorCount:
      value.successfulCreatorCount,
    failedCreatorCount:
      value.failedCreatorCount,
    creatorOffset:
      value.creatorOffset,
    nextCreatorOffset:
      value.nextCreatorOffset,
    hasMoreCreators:
      value.hasMoreCreators,
    publicationLimit:
      value.publicationLimit,
  });
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
