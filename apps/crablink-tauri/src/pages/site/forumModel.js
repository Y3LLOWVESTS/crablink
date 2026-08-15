/**
 * RO:WHAT — FINAL_BETA Phase 15 Forum domain/read projection foundation.
 * RO:WHY — Defines discussion-first Post roots and Comment reply chains before UI/template registration.
 * RO:INTERACTS — PublicationSummaryV1, canonical .post/.comment URLs, reviewed policy state.
 * RO:INVARIANTS — Forum reuses existing Post/Comment contracts; sticky/locked never come from invented client truth.
 * RO:SECURITY — pure read/model behavior only; no publication, moderation, wallet, ledger, ROC, QuickChain, ROX, or Solana mutation.
 * RO:TEST — forumModel.test.mjs.
 */

import {
  assertPublicationSummaryV1,
} from '../../../../../packages/crablink-core/src/publicationSummary.js';

export const FORUM_MODEL_VERSION =
  'crablink.forum-model.v1';

export const FORUM_THREAD_SCHEMA =
  'crablink.forum-thread.v1';

export const FORUM_REPLY_SCHEMA =
  'crablink.forum-reply.v1';

export const FORUM_MAX_CATEGORIES =
  12;

export const FORUM_MAX_PAGE_SIZE =
  50;

export const FORUM_MAX_REPLY_PAGE_SIZE =
  100;

export const FORUM_MODERATION_STATES =
  Object.freeze([
    'visible',
    'deleted',
    'blocked',
    'moderated',
  ]);

export const FORUM_POLICY_STATE_SOURCES =
  Object.freeze([
    'none',
    'reviewed_policy',
  ]);

const B3_CID_PATTERN =
  /^b3:[0-9a-f]{64}$/u;

const POST_URL_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.post$/u;

const COMMENT_URL_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.comment$/u;

const NAMED_SITE_PATTERN =
  /^crab:\/\/[a-z0-9][a-z0-9_-]{0,62}$/u;

const PUBLIC_THREAD_VISIBILITY =
  new Set([
    'public',
    'public_preview',
    'deleted',
    'blocked',
    'moderated',
  ]);

export class ForumModelError extends Error {
  constructor(
    message,
    reason =
      'forum_model_error',
  ) {
    super(
      String(
        message ||
          'Forum model validation failed.',
      ),
    );

    this.name =
      'ForumModelError';

    this.reason =
      reason;
  }
}

export function normalizeForumSettings(
  raw =
    {},
) {
  const source =
    isPlainObject(
      raw,
    )
      ? raw
      : {};

  const rawCategories =
    Array.isArray(
      source.categories,
    )
      ? source.categories
      : [
          {
            id:
              'general',

            label:
              'General',
          },
        ];

  if (
    rawCategories.length ===
      0 ||
    rawCategories.length >
      FORUM_MAX_CATEGORIES
  ) {
    throw new ForumModelError(
      'Forum categories must contain between one and twelve entries.',
      'invalid_categories',
    );
  }

  const seen =
    new Set();

  const categories =
    rawCategories.map(
      (
        category,
        index,
      ) => {
        const normalized =
          normalizeCategory(
            category,
            index,
          );

        if (
          seen.has(
            normalized.id,
          )
        ) {
          throw new ForumModelError(
            'Forum category IDs must be unique.',
            'duplicate_category',
          );
        }

        seen.add(
          normalized.id,
        );

        return normalized;
      },
    );

  return deepFreeze({
    categories,

    pageSize:
      normalizeInteger(
        source.pageSize,
        20,
        1,
        FORUM_MAX_PAGE_SIZE,
        'pageSize',
      ),

    replyPageSize:
      normalizeInteger(
        source.replyPageSize,
        50,
        1,
        FORUM_MAX_REPLY_PAGE_SIZE,
        'replyPageSize',
      ),
  });
}

export function normalizeForumPolicyState(
  raw =
    {},
) {
  const source =
    isPlainObject(
      raw,
    )
      ? raw
      : {};

  const sticky =
    source.sticky ===
      true;

  const locked =
    source.locked ===
      true;

  const stateSource =
    clean(
      source.source ||
        'none',
    );

  if (
    FORUM_POLICY_STATE_SOURCES.includes(
      stateSource,
    ) ===
      false
  ) {
    throw new ForumModelError(
      'Forum sticky or locked state requires reviewed policy evidence.',
      'invalid_policy_state_source',
    );
  }

  if (
    (
      sticky ||
      locked
    ) &&
    stateSource !==
      'reviewed_policy'
  ) {
    throw new ForumModelError(
      'Forum sticky or locked state cannot be created from local client truth.',
      'policy_evidence_required',
    );
  }

  return deepFreeze({
    sticky,

    locked,

    source:
      stateSource,
  });
}

export function createForumThreadFromPublication(
  rawPublication,
  {
    settings =
      {},

    siteCrabUrl,

    category,

    policyState =
      {},

    replyCount =
      0,

    latestActivityAt,
  } =
    {},
) {
  let summary;

  try {
    summary =
      assertPublicationSummaryV1(
        rawPublication,
      );
  } catch (error) {
    throw new ForumModelError(
      error?.message ||
        'Forum thread requires a valid PublicationSummaryV1.',
      'invalid_publication_summary',
    );
  }

  if (
    summary.kind !==
      'post'
  ) {
    throw new ForumModelError(
      'Forum thread root must be a typed Post publication.',
      'post_thread_required',
    );
  }

  const postCrabUrl =
    normalizeTypedUrl(
      summary.crabUrl,
      POST_URL_PATTERN,
      'Forum Post URL is invalid.',
      'invalid_post_url',
    );

  const normalizedSite =
    normalizeNamedSiteUrl(
      siteCrabUrl,
    );

  const publicationSite =
    normalizeNamedSiteUrl(
      summary.references
        ?.siteUrl,
    );

  if (
    publicationSite !==
      normalizedSite
  ) {
    throw new ForumModelError(
      'Forum Post Site reference does not match the active Forum.',
      'site_context_mismatch',
    );
  }

  const normalizedSettings =
    normalizeForumSettings(
      settings,
    );

  const normalizedCategory =
    normalizeSelectedCategory(
      category ??
        normalizedSettings
          .categories[0]
          .id,

      normalizedSettings,
    );

  const policy =
    normalizeForumPolicyState(
      policyState,
    );

  const visibility =
    clean(
      summary.visibility,
    ).toLowerCase();

  const moderationState =
    moderationStateFromVisibility(
      visibility,
    );

  const publishedAt =
    normalizeTimestamp(
      summary.publishedAt,
      'publishedAt',
    );

  const updatedAt =
    normalizeTimestamp(
      summary.updatedAt ||
        summary.publishedAt,
      'updatedAt',
    );

  const activityAt =
    normalizeTimestamp(
      latestActivityAt ||
        updatedAt ||
        publishedAt,
      'latestActivityAt',
    );

  const contentCid =
    normalizeB3Cid(
      summary.references
        ?.contentCid,
      'Forum Post content CID',
    );

  return deepFreeze({
    schema:
      FORUM_THREAD_SCHEMA,

    modelVersion:
      FORUM_MODEL_VERSION,

    siteCrabUrl:
      normalizedSite,

    postCrabUrl,

    title:
      boundedText(
        summary.title,
        160,
        'title',
      ),

    summary:
      boundedText(
        summary.summary ||
          '',
        1000,
        'summary',
      ),

    creator:
      summary.creator,

    category:
      normalizedCategory,

    publishedAt,

    updatedAt,

    latestActivityAt:
      activityAt,

    visibility,

    moderationState,

    replyCount:
      normalizeInteger(
        replyCount,
        0,
        0,
        1_000_000,
        'replyCount',
      ),

    sticky:
      policy.sticky,

    locked:
      policy.locked,

    policyStateSource:
      policy.source,

    canReply:
      moderationState ===
        'visible' &&
      policy.locked ===
        false,

    b3:
      deepFreeze({
        expectedContentCid:
          contentCid,

        contentVerified:
          false,

        resolvedContentCid:
          null,
      }),
  });
}

export function createForumReply(
  raw,
) {
  const source =
    requirePlainObject(
      raw,
      'Forum reply',
      'invalid_reply',
    );

  const siteCrabUrl =
    normalizeNamedSiteUrl(
      source.siteCrabUrl,
    );

  const threadCrabUrl =
    normalizeTypedUrl(
      source.threadCrabUrl,
      POST_URL_PATTERN,
      'Forum reply thread must be a typed Post.',
      'invalid_reply_thread',
    );

  const crabUrl =
    normalizeTypedUrl(
      source.crabUrl,
      COMMENT_URL_PATTERN,
      'Forum reply URL must be a typed Comment.',
      'invalid_reply_url',
    );

  const parentCrabUrl =
    clean(
      source.parentCrabUrl,
    ).toLowerCase();

  if (
    POST_URL_PATTERN.test(
      parentCrabUrl,
    ) ===
      false &&
    COMMENT_URL_PATTERN.test(
      parentCrabUrl,
    ) ===
      false
  ) {
    throw new ForumModelError(
      'Forum reply parent must be the Post root or another Comment.',
      'invalid_reply_parent',
    );
  }

  if (
    parentCrabUrl.endsWith(
      '.post',
    ) &&
    parentCrabUrl !==
      threadCrabUrl
  ) {
    throw new ForumModelError(
      'Forum direct reply Post parent must equal the thread root.',
      'reply_parent_thread_mismatch',
    );
  }

  const visibility =
    clean(
      source.visibility ||
        'public',
    ).toLowerCase();

  return deepFreeze({
    schema:
      FORUM_REPLY_SCHEMA,

    modelVersion:
      FORUM_MODEL_VERSION,

    siteCrabUrl,

    threadCrabUrl,

    crabUrl,

    parentCrabUrl,

    body:
      boundedText(
        source.body,
        20_000,
        'body',
      ),

    creator:
      source.creator ??
        null,

    createdAt:
      normalizeTimestamp(
        source.createdAt,
        'createdAt',
      ),

    visibility,

    moderationState:
      moderationStateFromVisibility(
        visibility,
      ),
  });
}

export function projectForumThreadList({
  threads =
    [],

  settings =
    {},

  category =
    'all',

  page =
    1,
} =
  {}) {
  if (
    Array.isArray(
      threads,
    ) ===
      false
  ) {
    throw new ForumModelError(
      'Forum thread list must be an array.',
      'invalid_thread_list',
    );
  }

  const normalizedSettings =
    normalizeForumSettings(
      settings,
    );

  const selectedCategory =
    category ===
      'all'
      ? 'all'
      : normalizeSelectedCategory(
          category,
          normalizedSettings,
        );

  const normalized =
    threads.map(
      normalizeForumThread,
    );

  const publicThreads =
    normalized.filter(
      (thread) =>
        PUBLIC_THREAD_VISIBILITY.has(
          thread.visibility,
        ),
    );

  const filtered =
    selectedCategory ===
      'all'
      ? publicThreads
      : publicThreads.filter(
          (thread) =>
            thread.category ===
              selectedCategory,
        );

  const ordered =
    [
      ...filtered,
    ].sort(
      forumThreadOrder,
    );

  const paged =
    paginate(
      ordered,
      normalizeInteger(
        page,
        1,
        1,
        1_000_000,
        'page',
      ),
      normalizedSettings
        .pageSize,
    );

  return deepFreeze({
    modelVersion:
      FORUM_MODEL_VERSION,

    category:
      selectedCategory,

    ordering:
      'sticky_then_latest_activity',

    page:
      paged.page,

    pageSize:
      paged.pageSize,

    totalItems:
      paged.totalItems,

    totalPages:
      paged.totalPages,

    hasPrevious:
      paged.hasPrevious,

    hasNext:
      paged.hasNext,

    state:
      paged.items.length >
        0
        ? 'ready'
        : 'empty',

    items:
      paged.items.map(
        projectThreadCard,
      ),
  });
}

export function projectForumThreadDetail({
  thread,

  replies =
    [],

  settings =
    {},

  page =
    1,
} =
  {}) {
  const root =
    normalizeForumThread(
      thread,
    );

  if (
    Array.isArray(
      replies,
    ) ===
      false
  ) {
    throw new ForumModelError(
      'Forum replies must be an array.',
      'invalid_reply_list',
    );
  }

  const normalizedSettings =
    normalizeForumSettings(
      settings,
    );

  const normalizedReplies =
    replies.map(
      (reply) => {
        const normalized =
          normalizeForumReply(
            reply,
          );

        if (
          normalized.siteCrabUrl !==
            root.siteCrabUrl
        ) {
          throw new ForumModelError(
            'Forum reply Site does not match the thread Site.',
            'reply_site_mismatch',
          );
        }

        if (
          normalized.threadCrabUrl !==
            root.postCrabUrl
        ) {
          throw new ForumModelError(
            'Forum reply thread does not match the Post root.',
            'reply_thread_mismatch',
          );
        }

        return normalized;
      },
    )
      .filter(
        (reply) =>
          PUBLIC_THREAD_VISIBILITY.has(
            reply.visibility,
          ),
      )
      .sort(
        oldestReplyFirst,
      );

  const paged =
    paginate(
      normalizedReplies,
      normalizeInteger(
        page,
        1,
        1,
        1_000_000,
        'page',
      ),
      normalizedSettings
        .replyPageSize,
    );

  const latestActivityAt =
    normalizedReplies.reduce(
      (
        latest,
        reply,
      ) =>
        Date.parse(
          reply.createdAt,
        ) >
        Date.parse(
          latest,
        )
          ? reply.createdAt
          : latest,
      root.latestActivityAt,
    );

  return deepFreeze({
    modelVersion:
      FORUM_MODEL_VERSION,

    thread:
      projectThreadCard(
        root,
      ),

    latestActivityAt,

    canReply:
      root.canReply,

    replies:
      {
        page:
          paged.page,

        pageSize:
          paged.pageSize,

        totalItems:
          paged.totalItems,

        totalPages:
          paged.totalPages,

        hasPrevious:
          paged.hasPrevious,

        hasNext:
          paged.hasNext,

        items:
          paged.items.map(
            projectReply,
          ),
      },
  });
}

function normalizeForumThread(
  raw,
) {
  const source =
    requirePlainObject(
      raw,
      'Forum thread',
      'invalid_thread',
    );

  if (
    source.schema !==
      FORUM_THREAD_SCHEMA
  ) {
    throw new ForumModelError(
      'Forum thread schema is invalid.',
      'invalid_thread_schema',
    );
  }

  return source;
}

function normalizeForumReply(
  raw,
) {
  const source =
    requirePlainObject(
      raw,
      'Forum reply',
      'invalid_reply',
    );

  if (
    source.schema !==
      FORUM_REPLY_SCHEMA
  ) {
    throw new ForumModelError(
      'Forum reply schema is invalid.',
      'invalid_reply_schema',
    );
  }

  return source;
}

function projectThreadCard(
  thread,
) {
  const redacted =
    thread.moderationState !==
      'visible';

  return deepFreeze({
    postCrabUrl:
      thread.postCrabUrl,

    category:
      thread.category,

    title:
      redacted
        ? moderationLabel(
            thread.moderationState,
          )
        : thread.title,

    summary:
      redacted
        ? ''
        : thread.summary,

    creator:
      redacted
        ? null
        : thread.creator,

    publishedAt:
      thread.publishedAt,

    latestActivityAt:
      thread.latestActivityAt,

    replyCount:
      thread.replyCount,

    sticky:
      thread.sticky,

    locked:
      thread.locked,

    policyStateSource:
      thread.policyStateSource,

    moderationState:
      thread.moderationState,

    canOpen:
      thread.moderationState ===
        'visible',

    canReply:
      thread.canReply,
  });
}

function projectReply(
  reply,
) {
  const redacted =
    reply.moderationState !==
      'visible';

  return deepFreeze({
    crabUrl:
      reply.crabUrl,

    parentCrabUrl:
      reply.parentCrabUrl,

    body:
      redacted
        ? ''
        : reply.body,

    creator:
      redacted
        ? null
        : reply.creator,

    createdAt:
      reply.createdAt,

    moderationState:
      reply.moderationState,
  });
}

function forumThreadOrder(
  left,
  right,
) {
  if (
    left.sticky !==
      right.sticky
  ) {
    return left.sticky
      ? -1
      : 1;
  }

  const activityDifference =
    Date.parse(
      right.latestActivityAt,
    ) -
    Date.parse(
      left.latestActivityAt,
    );

  if (
    activityDifference !==
      0
  ) {
    return activityDifference;
  }

  return left.postCrabUrl.localeCompare(
    right.postCrabUrl,
  );
}

function oldestReplyFirst(
  left,
  right,
) {
  const timeDifference =
    Date.parse(
      left.createdAt,
    ) -
    Date.parse(
      right.createdAt,
    );

  if (
    timeDifference !==
      0
  ) {
    return timeDifference;
  }

  return left.crabUrl.localeCompare(
    right.crabUrl,
  );
}

function moderationStateFromVisibility(
  raw,
) {
  const visibility =
    clean(
      raw,
    ).toLowerCase();

  if (
    visibility ===
      'public' ||
    visibility ===
      'public_preview'
  ) {
    return 'visible';
  }

  if (
    FORUM_MODERATION_STATES.includes(
      visibility,
    )
  ) {
    return visibility;
  }

  if (
    visibility ===
      'private' ||
    visibility ===
      'unlisted'
  ) {
    return visibility;
  }

  throw new ForumModelError(
    'Forum visibility is invalid.',
    'invalid_visibility',
  );
}

function moderationLabel(
  state,
) {
  if (
    state ===
      'deleted'
  ) {
    return 'Deleted thread';
  }

  if (
    state ===
      'blocked'
  ) {
    return 'Blocked thread';
  }

  if (
    state ===
      'moderated'
  ) {
    return 'Moderated thread';
  }

  return 'Unavailable thread';
}

function normalizeCategory(
  raw,
  index,
) {
  const source =
    requirePlainObject(
      raw,
      `Forum category ${index + 1}`,
      'invalid_category',
    );

  const id =
    clean(
      source.id,
    ).toLowerCase();

  const label =
    clean(
      source.label,
    );

  if (
    /^[a-z0-9][a-z0-9_-]{0,31}$/u.test(
      id,
    ) ===
      false ||
    label.length ===
      0 ||
    label.length >
      64
  ) {
    throw new ForumModelError(
      'Forum category ID or label is invalid.',
      'invalid_category',
    );
  }

  return deepFreeze({
    id,

    label,
  });
}

function normalizeSelectedCategory(
  raw,
  settings,
) {
  const value =
    clean(
      raw,
    ).toLowerCase();

  if (
    settings.categories.some(
      (category) =>
        category.id ===
          value,
    )
  ) {
    return value;
  }

  throw new ForumModelError(
    'Forum category does not exist.',
    'unknown_category',
  );
}

function normalizeNamedSiteUrl(
  raw,
) {
  const value =
    clean(
      raw,
    ).toLowerCase();

  if (
    NAMED_SITE_PATTERN.test(
      value,
    )
  ) {
    return value;
  }

  throw new ForumModelError(
    'Forum requires an exact named crab:// Site URL.',
    'invalid_site_url',
  );
}

function normalizeTypedUrl(
  raw,
  pattern,
  message,
  reason,
) {
  const value =
    clean(
      raw,
    ).toLowerCase();

  if (
    pattern.test(
      value,
    )
  ) {
    return value;
  }

  throw new ForumModelError(
    message,
    reason,
  );
}

function normalizeB3Cid(
  raw,
  label,
) {
  const value =
    clean(
      raw,
    );

  if (
    B3_CID_PATTERN.test(
      value,
    )
  ) {
    return value;
  }

  throw new ForumModelError(
    `${label} must be a canonical B3 CID.`,
    'invalid_b3_cid',
  );
}

function normalizeTimestamp(
  raw,
  label,
) {
  const value =
    clean(
      raw,
    );

  const timestamp =
    Date.parse(
      value,
    );

  if (
    Number.isFinite(
      timestamp,
    )
  ) {
    return new Date(
      timestamp,
    ).toISOString();
  }

  throw new ForumModelError(
    `${label} must be a valid timestamp.`,
    'invalid_timestamp',
  );
}

function boundedText(
  raw,
  maxLength,
  label,
) {
  const value =
    clean(
      raw,
    );

  if (
    value.length >
      maxLength
  ) {
    throw new ForumModelError(
      `${label} exceeds the Forum bound.`,
      'text_too_long',
    );
  }

  return value;
}

function normalizeInteger(
  raw,
  fallback,
  minimum,
  maximum,
  label,
) {
  const value =
    raw ===
      undefined ||
    raw ===
      null ||
    raw ===
      ''
      ? fallback
      : Number(
          raw,
        );

  if (
    Number.isSafeInteger(
      value,
    ) &&
    value >=
      minimum &&
    value <=
      maximum
  ) {
    return value;
  }

  throw new ForumModelError(
    `${label} is outside the Forum bound.`,
    'invalid_integer',
  );
}

function paginate(
  items,
  page,
  pageSize,
) {
  const totalItems =
    items.length;

  const totalPages =
    totalItems ===
      0
      ? 0
      : Math.ceil(
          totalItems /
          pageSize,
        );

  const start =
    (
      page -
      1
    ) *
    pageSize;

  const pageItems =
    start <
      totalItems
      ? items.slice(
          start,
          start +
            pageSize,
        )
      : [];

  return {
    page,

    pageSize,

    totalItems,

    totalPages,

    hasPrevious:
      page >
        1,

    hasNext:
      start +
        pageSize <
      totalItems,

    items:
      pageItems,
  };
}

function requirePlainObject(
  raw,
  label,
  reason,
) {
  if (
    isPlainObject(
      raw,
    )
  ) {
    return raw;
  }

  throw new ForumModelError(
    `${label} must be an object.`,
    reason,
  );
}

function isPlainObject(
  value,
) {
  return Boolean(
    value,
  ) &&
    typeof value ===
      'object' &&
    Array.isArray(
      value,
    ) ===
      false;
}

function clean(
  value,
) {
  return String(
    value ??
      '',
  ).trim();
}

function deepFreeze(
  value,
) {
  if (
    value &&
    typeof value ===
      'object' &&
    Object.isFrozen(
      value,
    ) ===
      false
  ) {
    for (
      const child
      of Object.values(
        value,
      )
    ) {
      deepFreeze(
        child,
      );
    }

    Object.freeze(
      value,
    );
  }

  return value;
}
