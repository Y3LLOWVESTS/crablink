/**
 * RO:WHAT — Strict platform-neutral Explore discovery projection for FINAL_BETA Phase 10.
 * RO:WHY — Explore needs one bounded transparent public-read contract before svc-index, Omnigate, gateway, and desktop transport are connected.
 * RO:INTERACTS — PublicationSummaryV1, future svc-index discovery projection, gateway/Omnigate read routes, and CrabLink Explore.
 * RO:INVARIANTS — recent public content is newest-first, public creators are username-ordered, template sites are newest-updated-first, and all collections are bounded.
 * RO:SECURITY — public display projection only; no follower graph, engagement score, paid promotion, wallet, ledger, receipt, entitlement, QuickChain, ROX, Solana, or mutation authority.
 * RO:TEST — exploreDiscovery.test.mjs.
 */

// FINAL_BETA_PHASE10A3A_EXPLORE_DISCOVERY_CONTRACT_V1

import {
  assertPublicationSummaryV1,
} from './publicationSummary.js';

export const EXPLORE_DISCOVERY_SCHEMA =
  'crablink.explore-discovery.v1';

export const EXPLORE_DISCOVERY_DEFAULT_PUBLICATION_LIMIT =
  12;

export const EXPLORE_DISCOVERY_MAX_PUBLICATIONS =
  24;

export const EXPLORE_DISCOVERY_DEFAULT_CREATOR_LIMIT =
  12;

export const EXPLORE_DISCOVERY_MAX_CREATORS =
  24;

export const EXPLORE_DISCOVERY_DEFAULT_SITE_LIMIT =
  8;

export const EXPLORE_DISCOVERY_MAX_SITES =
  16;

export const EXPLORE_DISCOVERY_CATEGORIES =
  deepFreeze([
    Object.freeze({
      id:
        'recent_public_content',
      label:
        'Recent',
      rule:
        'published_at_desc',
    }),
    Object.freeze({
      id:
        'public_creators',
      label:
        'Creators',
      rule:
        'username_asc',
    }),
    Object.freeze({
      id:
        'template_sites',
      label:
        'Sites',
      rule:
        'updated_at_desc',
    }),
  ]);

export const EXPLORE_DISCOVERY_AUTHORITY =
  deepFreeze({
    publicReadProjectionOnly:
      true,
    engagementRanking:
      false,
    paidRanking:
      false,
    followerGraph:
      false,
    followerCounts:
      false,
    followingCounts:
      false,
    walletMutation:
      false,
    ledgerMutation:
      false,
    receiptAuthority:
      false,
    paidEntitlementAuthority:
      false,
    quickchainMutation:
      false,
    roxInteraction:
      false,
    solanaInteraction:
      false,
  });

const RESPONSE_FIELDS =
  Object.freeze([
    'schema',
    'recentPublications',
    'publicCreators',
    'templateSites',
  ]);

const REQUEST_FIELDS =
  Object.freeze([
    'publicationLimit',
    'creatorLimit',
    'siteLimit',
  ]);

const CREATOR_FIELDS =
  Object.freeze([
    'username',
    'displayName',
    'profileUrl',
    'avatarCid',
  ]);

const SITE_FIELDS =
  Object.freeze([
    'siteUrl',
    'title',
    'summary',
    'creator',
    'templateId',
    'updatedAt',
  ]);

const USERNAME_PATTERN =
  /^[a-z0-9][a-z0-9_-]{2,31}$/u;

const TEMPLATE_ID_PATTERN =
  /^[a-z0-9][a-z0-9_-]{0,63}$/u;

const CANONICAL_B3_CID_PATTERN =
  /^b3:[0-9a-f]{64}$/u;

export function normalizeExploreDiscoveryRequest(
  raw = {},
) {
  const source =
    requirePlainObject(
      raw,
      'Explore discovery request',
    );

  assertAllowedKeys(
    source,
    REQUEST_FIELDS,
    'Explore discovery request',
  );

  return deepFreeze({
    publicationLimit:
      normalizeLimit(
        source.publicationLimit,
        EXPLORE_DISCOVERY_DEFAULT_PUBLICATION_LIMIT,
        EXPLORE_DISCOVERY_MAX_PUBLICATIONS,
        'publicationLimit',
      ),

    creatorLimit:
      normalizeLimit(
        source.creatorLimit,
        EXPLORE_DISCOVERY_DEFAULT_CREATOR_LIMIT,
        EXPLORE_DISCOVERY_MAX_CREATORS,
        'creatorLimit',
      ),

    siteLimit:
      normalizeLimit(
        source.siteLimit,
        EXPLORE_DISCOVERY_DEFAULT_SITE_LIMIT,
        EXPLORE_DISCOVERY_MAX_SITES,
        'siteLimit',
      ),
  });
}

export function normalizeExploreDiscoveryV1(
  raw,
) {
  const source =
    requirePlainObject(
      raw,
      'Explore discovery response',
    );

  assertAllowedKeys(
    source,
    RESPONSE_FIELDS,
    'Explore discovery response',
  );

  if (
    source.schema !==
      EXPLORE_DISCOVERY_SCHEMA
  ) {
    throw new TypeError(
      `Explore discovery schema must be ${EXPLORE_DISCOVERY_SCHEMA}`,
    );
  }

  const recentPublications =
    normalizeRecentPublications(
      source.recentPublications,
    );

  const publicCreators =
    normalizePublicCreators(
      source.publicCreators,
    );

  const templateSites =
    normalizeTemplateSites(
      source.templateSites,
    );

  return deepFreeze({
    schema:
      EXPLORE_DISCOVERY_SCHEMA,

    recentPublications,

    publicCreators,

    templateSites,

    categories:
      EXPLORE_DISCOVERY_CATEGORIES,

    authority:
      EXPLORE_DISCOVERY_AUTHORITY,
  });
}

export function createEmptyExploreDiscovery() {
  return normalizeExploreDiscoveryV1({
    schema:
      EXPLORE_DISCOVERY_SCHEMA,
    recentPublications:
      [],
    publicCreators:
      [],
    templateSites:
      [],
  });
}

function normalizeRecentPublications(
  raw,
) {
  const items =
    requireBoundedArray(
      raw,
      EXPLORE_DISCOVERY_MAX_PUBLICATIONS,
      'recentPublications',
    );

  const identities =
    new Set();

  const reviewed =
    items.map(
      (item) => {
        const publication =
          assertPublicationSummaryV1(
            item,
          );

        if (
          publication.visibility !==
            'public'
        ) {
          throw new TypeError(
            'Explore recentPublications accepts public summaries only',
          );
        }

        const identity =
          `${publication.creator.username}:${publication.publicationId}`;

        if (
          identities.has(
            identity,
          )
        ) {
          throw new TypeError(
            `Explore recentPublications contains duplicate identity: ${identity}`,
          );
        }

        identities.add(
          identity,
        );

        return publication;
      },
    );

  reviewed.sort(
    compareRecentPublications,
  );

  return Object.freeze(
    reviewed,
  );
}

function normalizePublicCreators(
  raw,
) {
  const items =
    requireBoundedArray(
      raw,
      EXPLORE_DISCOVERY_MAX_CREATORS,
      'publicCreators',
    );

  const usernames =
    new Set();

  const reviewed =
    items.map(
      (item) => {
        const creator =
          normalizeCreator(
            item,
            'publicCreators item',
          );

        if (
          usernames.has(
            creator.username,
          )
        ) {
          throw new TypeError(
            `Explore publicCreators contains duplicate username: ${creator.username}`,
          );
        }

        usernames.add(
          creator.username,
        );

        return creator;
      },
    );

  reviewed.sort(
    (left, right) =>
      left.username.localeCompare(
        right.username,
      ),
  );

  return Object.freeze(
    reviewed,
  );
}

function normalizeTemplateSites(
  raw,
) {
  const items =
    requireBoundedArray(
      raw,
      EXPLORE_DISCOVERY_MAX_SITES,
      'templateSites',
    );

  const siteUrls =
    new Set();

  const reviewed =
    items.map(
      (item) => {
        const site =
          normalizeTemplateSite(
            item,
          );

        if (
          siteUrls.has(
            site.siteUrl,
          )
        ) {
          throw new TypeError(
            `Explore templateSites contains duplicate siteUrl: ${site.siteUrl}`,
          );
        }

        siteUrls.add(
          site.siteUrl,
        );

        return site;
      },
    );

  reviewed.sort(
    compareTemplateSites,
  );

  return Object.freeze(
    reviewed,
  );
}

function normalizeTemplateSite(
  raw,
) {
  const source =
    requirePlainObject(
      raw,
      'templateSites item',
    );

  assertAllowedKeys(
    source,
    SITE_FIELDS,
    'templateSites item',
  );

  const siteUrl =
    normalizeCrabUrl(
      source.siteUrl,
      'templateSites item.siteUrl',
    );

  const title =
    normalizeBoundedString(
      source.title,
      160,
      'templateSites item.title',
    );

  const summary =
    normalizeBoundedString(
      source.summary,
      500,
      'templateSites item.summary',
      {
        optional:
          true,
      },
    );

  const creator =
    normalizeCreator(
      source.creator,
      'templateSites item.creator',
    );

  const templateId =
    normalizePatternString(
      source.templateId,
      TEMPLATE_ID_PATTERN,
      64,
      'templateSites item.templateId',
    );

  const updatedAt =
    normalizeCanonicalTimestamp(
      source.updatedAt,
      'templateSites item.updatedAt',
    );

  return deepFreeze({
    siteUrl,
    title,
    summary,
    creator,
    templateId,
    updatedAt,
  });
}

function normalizeCreator(
  raw,
  label,
) {
  const source =
    requirePlainObject(
      raw,
      label,
    );

  assertAllowedKeys(
    source,
    CREATOR_FIELDS,
    label,
  );

  const username =
    normalizePatternString(
      source.username,
      USERNAME_PATTERN,
      32,
      `${label}.username`,
    );

  const displayName =
    normalizeBoundedString(
      source.displayName,
      80,
      `${label}.displayName`,
    );

  const profileUrl =
    normalizeCrabUrl(
      source.profileUrl,
      `${label}.profileUrl`,
    );

  if (
    profileUrl !==
      `crab://@${username}`
  ) {
    throw new TypeError(
      `${label}.profileUrl must match username`,
    );
  }

  const avatarCid =
    normalizeOptionalCid(
      source.avatarCid,
      `${label}.avatarCid`,
    );

  return deepFreeze({
    username,
    displayName,
    profileUrl,
    avatarCid,
  });
}

function compareRecentPublications(
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
    timestampOrder ===
      0
  ) {
    const creatorOrder =
      left.creator.username.localeCompare(
        right.creator.username,
      );

    if (
      creatorOrder ===
        0
    ) {
      return left.publicationId.localeCompare(
        right.publicationId,
      );
    }

    return creatorOrder;
  }

  return timestampOrder;
}

function compareTemplateSites(
  left,
  right,
) {
  const timestampOrder =
    Date.parse(
      right.updatedAt,
    ) -
    Date.parse(
      left.updatedAt,
    );

  if (
    timestampOrder ===
      0
  ) {
    return left.siteUrl.localeCompare(
      right.siteUrl,
    );
  }

  return timestampOrder;
}

function normalizeLimit(
  value,
  fallback,
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
    value < 1 ||
    value > maximum
  ) {
    throw new RangeError(
      `Explore discovery ${label} must be an integer from 1 through ${maximum}`,
    );
  }

  return value;
}

function requireBoundedArray(
  value,
  maximum,
  label,
) {
  if (
    Array.isArray(
      value,
    ) === false
  ) {
    throw new TypeError(
      `Explore discovery ${label} must be an array`,
    );
  }

  if (
    value.length >
      maximum
  ) {
    throw new RangeError(
      `Explore discovery ${label} must contain at most ${maximum} items`,
    );
  }

  return value;
}

function normalizeBoundedString(
  value,
  maximum,
  label,
  options = {},
) {
  if (
    options.optional ===
      true &&
    (
      value === undefined ||
      value === null
    )
  ) {
    return null;
  }

  if (
    typeof value !==
      'string'
  ) {
    throw new TypeError(
      `${label} must be a string`,
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length <
      1 ||
    normalized.length >
      maximum
  ) {
    throw new TypeError(
      `${label} must contain from 1 through ${maximum} characters`,
    );
  }

  return normalized;
}

function normalizePatternString(
  value,
  pattern,
  maximum,
  label,
) {
  const normalized =
    normalizeBoundedString(
      value,
      maximum,
      label,
    );

  if (
    pattern.test(
      normalized,
    ) === false
  ) {
    throw new TypeError(
      `${label} has an invalid format`,
    );
  }

  return normalized;
}

function normalizeCrabUrl(
  value,
  label,
) {
  const normalized =
    normalizeBoundedString(
      value,
      512,
      label,
    );

  if (
    normalized.startsWith(
      'crab://',
    ) === false ||
    /\s/u.test(
      normalized,
    )
  ) {
    throw new TypeError(
      `${label} must be a crab URL`,
    );
  }

  return normalized;
}

function normalizeOptionalCid(
  value,
  label,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    typeof value !==
      'string' ||
    CANONICAL_B3_CID_PATTERN.test(
      value,
    ) === false
  ) {
    throw new TypeError(
      `${label} must be a canonical b3 CID or null`,
    );
  }

  return value;
}

function normalizeCanonicalTimestamp(
  value,
  label,
) {
  if (
    typeof value !==
      'string'
  ) {
    throw new TypeError(
      `${label} must be an ISO timestamp`,
    );
  }

  const timestamp =
    Date.parse(
      value,
    );

  if (
    Number.isFinite(
      timestamp,
    ) === false
  ) {
    throw new TypeError(
      `${label} must be an ISO timestamp`,
    );
  }

  const canonical =
    new Date(
      timestamp,
    ).toISOString();

  if (
    canonical !==
      value
  ) {
    throw new TypeError(
      `${label} must be a canonical UTC ISO timestamp`,
    );
  }

  return canonical;
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

function deepFreeze(
  value,
) {
  if (
    value === null ||
    typeof value !==
      'object' ||
    Object.isFrozen(
      value,
    )
  ) {
    return value;
  }

  Object.freeze(
    value,
  );

  for (
    const nested
    of Object.values(
      value,
    )
  ) {
    deepFreeze(
      nested,
    );
  }

  return value;
}
