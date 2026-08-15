/**
 * RO:WHAT — Public entry point for platform-neutral CrabLink behavior.
 * RO:WHY — Desktop and TV require one tested source for shared route semantics.
 * RO:INTERACTS — crabUrl.js and future shared display-normalization families.
 * RO:INVARIANTS — no Chrome APIs, Tauri APIs, DOM assumptions, or backend authority.
 */

export const CRABLINK_CORE_PACKAGE =
  '@crablink/core';

export {
  crabImageUrlToCid,
  initCrabUrl,
  isB3Cid,
  isRawHash,
  isTypedAssetUrl,
  makeCrabAssetUrl,
  makeCrabSiteUrl,
  normalizeAssetKind,
  normalizeB3Cid,
  normalizeHash,
  normalizeSiteName,
  normalizeTypedAssetUrl,
  parseCrabInput,
  parseTypedAssetBody,
  stripCrabPrefix,
  stripQueryAndHash,
} from './crabUrl.js';

export {
  assetKindLabel,
  describeAssetKind,
  normalizeRouteKind,
  resolveAssetRouteOwner,
  routeKindLabel,
} from './routeMetadata.js';

export {
  RECEIPT_DISPLAY_FILTERS,
  buildReceiptProofText,
  countReceiptDisplayGroups,
  filterReceiptDisplayList,
  formatReceiptAmount,
  formatReceiptTimestamp,
  normalizeReceiptAction,
  normalizeReceiptDisplay,
  normalizeReceiptDisplayList,
  receiptActionLabel,
  receiptDisplayClassName,
  receiptDisplayKey,
  receiptTimestampMillis,
} from './receiptDisplay.js';

export * from './onboardingContract.js';

export * from './publicationSummary.js';

export {
  LOCAL_FOLLOWING_SCHEMA,
  LOCAL_FOLLOWING_MAX_ENTRIES,
  createEmptyLocalFollowingRecord,
  normalizeLocalFollowingRecord,
  normalizeLocalFollowingEntry,
  normalizePublicProfileRef,
  normalizeFollowingUsername,
  findLocalFollowingEntry,
  isLocallyFollowing,
  followLocalProfile,
  unfollowLocalProfile,
} from './localFollowing.js';

export {
  LOCAL_FOLLOWING_FEED_DEFAULT_LIMIT,
  LOCAL_FOLLOWING_FEED_MAX_ITEMS,
  LOCAL_FOLLOWING_FEED_SCHEMA,
  composeLocalFollowingFeed,
} from './localFollowingFeed.js';

export {
  updateLocalFollowingRefreshMetadata,
} from './localFollowingRefreshMetadata.js';

export {
  LOCAL_FOLLOWING_FEED_CACHE_MAX_ITEMS,
  LOCAL_FOLLOWING_FEED_CACHE_SCHEMA,
  LOCAL_FOLLOWING_FEED_CACHE_VIEW_SCHEMA,
  createLocalFollowingFeedCache,
  normalizeLocalFollowingFeedCache,
  projectOfflineLocalFollowingFeedCache,
  updateLocalFollowingFeedCache,
} from './localFollowingFeedCache.js';

export {
  EXPLORE_DISCOVERY_AUTHORITY,
  EXPLORE_DISCOVERY_CATEGORIES,
  EXPLORE_DISCOVERY_DEFAULT_CREATOR_LIMIT,
  EXPLORE_DISCOVERY_DEFAULT_PUBLICATION_LIMIT,
  EXPLORE_DISCOVERY_DEFAULT_SITE_LIMIT,
  EXPLORE_DISCOVERY_MAX_CREATORS,
  EXPLORE_DISCOVERY_MAX_PUBLICATIONS,
  EXPLORE_DISCOVERY_MAX_SITES,
  EXPLORE_DISCOVERY_SCHEMA,
  createEmptyExploreDiscovery,
  normalizeExploreDiscoveryRequest,
  normalizeExploreDiscoveryV1,
} from './exploreDiscovery.js';
