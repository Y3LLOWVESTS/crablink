/**
 * RO:WHAT — FINAL_BETA Imageboard deterministic thread, moderation, pagination, and B3 projection model.
 * RO:WHY — Phase 14 needs one safe image-first behavior foundation before product UI and publish handoffs.
 * RO:INTERACTS — PublicationSummaryV1 now; later ImagePage, CommentPage, Site template registration, and reader UI.
 * RO:INVARIANTS — Image is the thread root; replies are typed comments; named Site context is exact; B3 claims require canonical evidence.
 * RO:SECURITY — read/projection model only; no wallet, ledger, storage, index, publication, moderation, or entitlement authority.
 * RO:TEST — node --test imageboardModel.test.mjs.
 */

import {
  PUBLICATION_VISIBILITY_STATES,
  assertPublicationSummaryV1,
} from '../../../../../packages/crablink-core/src/publicationSummary.js';

export const IMAGEBOARD_MODEL_VERSION =
  'crablink.imageboard.v1';

export const IMAGEBOARD_THREAD_SCHEMA =
  'crablink.imageboard-thread.v1';

export const IMAGEBOARD_REPLY_SCHEMA =
  'crablink.imageboard-reply.v1';

export const IMAGEBOARD_DEFAULT_PAGE_SIZE =
  24;

export const IMAGEBOARD_MAX_PAGE_SIZE =
  48;

export const IMAGEBOARD_DEFAULT_REPLY_PAGE_SIZE =
  50;

export const IMAGEBOARD_MAX_REPLY_PAGE_SIZE =
  100;

export const IMAGEBOARD_MAX_CATEGORIES =
  12;

export const IMAGEBOARD_MODERATION_STATES =
  Object.freeze([
    'visible',
    'content_warning',
    'deleted',
    'blocked',
    'moderated',
  ]);

const PUBLICATION_VISIBILITY =
  new Set(
    PUBLICATION_VISIBILITY_STATES,
  );

const PUBLIC_BOARD_VISIBILITY =
  new Set([
    'public',
    'deleted',
    'blocked',
    'moderated',
  ]);

const DEFAULT_CATEGORY =
  Object.freeze({
    id:
      'general',

    label:
      'General',

    description:
      '',
  });

export class ImageboardModelError extends Error {
  constructor(
    message,
    reason =
      'imageboard_model_error',
  ) {
    super(
      message,
    );

    this.name =
      'ImageboardModelError';

    this.reason =
      reason;
  }
}

export function normalizeImageboardSettings(
  raw = {},
) {
  const input =
    isPlainObject(
      raw,
    )
      ? raw
      : {};

  const rawCategories =
    Array.isArray(
      input.categories,
    ) &&
    input.categories.length >
      0
      ? input.categories
      : [
          DEFAULT_CATEGORY,
        ];

  if (
    rawCategories.length >
    IMAGEBOARD_MAX_CATEGORIES
  ) {
    throw new ImageboardModelError(
      'Imageboard categories exceed the reviewed bound.',
      'category_limit_exceeded',
    );
  }

  const categories =
    rawCategories.map(
      normalizeCategoryDefinition,
    );

  const ids =
    categories.map(
      (category) =>
        category.id,
    );

  if (
    new Set(
      ids,
    ).size !==
    ids.length
  ) {
    throw new ImageboardModelError(
      'Imageboard category IDs must be unique.',
      'duplicate_category',
    );
  }

  const pageSize =
    normalizeBoundedInteger(
      input.pageSize,
      IMAGEBOARD_DEFAULT_PAGE_SIZE,
      1,
      IMAGEBOARD_MAX_PAGE_SIZE,
      'pageSize',
    );

  const replyPageSize =
    normalizeBoundedInteger(
      input.replyPageSize,
      IMAGEBOARD_DEFAULT_REPLY_PAGE_SIZE,
      1,
      IMAGEBOARD_MAX_REPLY_PAGE_SIZE,
      'replyPageSize',
    );

  const warningLabel =
    normalizeBoundedText(
      input.warningLabel ??
        'Content warning',

      80,
      'warningLabel',
    );

  return deepFreeze({
    modelVersion:
      IMAGEBOARD_MODEL_VERSION,

    categories,

    pageSize,

    replyPageSize,

    warningLabel,
  });
}

export function createImageboardThreadFromPublication(
  rawSummary,
  options = {},
) {
  const summary =
    assertPublicationSummaryV1(
      rawSummary,
    );

  if (
    summary.kind !==
    'image'
  ) {
    throw new ImageboardModelError(
      'Imageboard thread roots must be typed Image publications.',
      'thread_root_not_image',
    );
  }

  const settings =
    normalizeImageboardSettings(
      options.settings,
    );

  const siteCrabUrl =
    normalizeNamedSiteCrabUrl(
      options.siteCrabUrl ??
      summary.references
        ?.siteUrl,
    );

  const summarySiteCrabUrl =
    normalizeNamedSiteCrabUrl(
      summary.references
        ?.siteUrl,
    );

  if (
    summarySiteCrabUrl !==
    siteCrabUrl
  ) {
    throw new ImageboardModelError(
      'Imageboard thread Site reference does not match the active board.',
      'site_context_mismatch',
    );
  }

  if (
    summary.thumbnail ===
      null ||
    summary.thumbnail ===
      undefined ||
    summary.thumbnail.kind !==
      'image'
  ) {
    throw new ImageboardModelError(
      'Imageboard thread requires a canonical image thumbnail.',
      'thumbnail_required',
    );
  }

  const thumbnailCid =
    normalizeCanonicalB3Cid(
      summary.thumbnail.cid,
      'thumbnail CID',
    );

  const contentCid =
    normalizeCanonicalB3Cid(
      summary.references
        ?.contentCid,
      'content CID',
    );

  const category =
    normalizeThreadCategory(
      options.category ??
        settings.categories[0]
          .id,

      settings,
    );

  const contentWarning =
    normalizeContentWarning(
      options.contentWarning,

      settings.warningLabel,
    );

  const moderationState =
    projectModerationState(
      summary.visibility,
      contentWarning,
    );

  const replyCount =
    normalizeBoundedInteger(
      options.replyCount,
      0,
      0,
      1_000_000,
      'replyCount',
    );

  return deepFreeze({
    schema:
      IMAGEBOARD_THREAD_SCHEMA,

    modelVersion:
      IMAGEBOARD_MODEL_VERSION,

    siteCrabUrl,

    imageCrabUrl:
      normalizeTypedCrabUrl(
        summary.crabUrl,
        'image',
        'imageCrabUrl',
      ),

    title:
      normalizeBoundedText(
        summary.title ||
          'Untitled image thread',
        160,
        'title',
      ),

    summary:
      normalizeBoundedText(
        summary.summary ||
          '',
        500,
        'summary',
      ),

    category,

    creator:
      summary.creator,

    publishedAt:
      normalizeTimestamp(
        summary.publishedAt,
        'publishedAt',
      ),

    updatedAt:
      normalizeTimestamp(
        summary.updatedAt,
        'updatedAt',
      ),

    visibility:
      normalizeVisibility(
        summary.visibility,
      ),

    moderationState,

    contentWarning,

    access:
      summary.access,

    replyCount,

    thumbnail: {
      cid:
        thumbnailCid,

      alt:
        normalizeBoundedText(
          summary.thumbnail.alt ||
            summary.title ||
            'Imageboard thumbnail',
          240,
          'thumbnail alt',
        ),
    },

    b3: {
      expectedContentCid:
        contentCid,

      expectedThumbnailCid:
        thumbnailCid,
    },
  });
}

export function createImageboardReply(
  raw,
  thread,
  options = {},
) {
  const root =
    assertImageboardThread(
      thread,
    );

  if (
    isPlainObject(
      raw,
    ) ===
    false
  ) {
    throw new ImageboardModelError(
      'Imageboard reply must be a plain object.',
      'invalid_reply',
    );
  }

  const siteCrabUrl =
    normalizeNamedSiteCrabUrl(
      raw.siteCrabUrl,
    );

  if (
    siteCrabUrl !==
    root.siteCrabUrl
  ) {
    throw new ImageboardModelError(
      'Imageboard reply Site context does not match its thread.',
      'reply_site_context_mismatch',
    );
  }

  const threadCrabUrl =
    normalizeTypedCrabUrl(
      raw.threadCrabUrl,
      'image',
      'threadCrabUrl',
    );

  if (
    threadCrabUrl !==
    root.imageCrabUrl
  ) {
    throw new ImageboardModelError(
      'Imageboard reply thread context does not match the image root.',
      'reply_thread_context_mismatch',
    );
  }

  const crabUrl =
    normalizeTypedCrabUrl(
      raw.crabUrl,
      'comment',
      'reply crab URL',
    );

  const parentCrabUrl =
    normalizeReplyParentCrabUrl(
      raw.parentCrabUrl,
    );

  if (
    parentCrabUrl.endsWith(
      '.image',
    ) &&
    parentCrabUrl !==
      root.imageCrabUrl
  ) {
    throw new ImageboardModelError(
      'Direct Imageboard reply parent must be the active image thread.',
      'reply_parent_mismatch',
    );
  }

  if (
    parentCrabUrl ===
    crabUrl
  ) {
    throw new ImageboardModelError(
      'Imageboard reply cannot parent itself.',
      'reply_self_parent',
    );
  }

  const visibility =
    normalizeVisibility(
      raw.visibility ??
        'public',
    );

  const settings =
    normalizeImageboardSettings(
      options.settings,
    );

  const contentWarning =
    normalizeContentWarning(
      raw.contentWarning,

      settings.warningLabel,
    );

  return deepFreeze({
    schema:
      IMAGEBOARD_REPLY_SCHEMA,

    modelVersion:
      IMAGEBOARD_MODEL_VERSION,

    siteCrabUrl,

    threadCrabUrl,

    crabUrl,

    parentCrabUrl,

    body:
      normalizeBoundedText(
        raw.body ??
          '',
        4000,
        'reply body',
      ),

    creator:
      normalizeCreatorProjection(
        raw.creator,
      ),

    createdAt:
      normalizeTimestamp(
        raw.createdAt,
        'createdAt',
      ),

    visibility,

    moderationState:
      projectModerationState(
        visibility,
        contentWarning,
      ),

    contentWarning,
  });
}

export function verifyImageboardB3(
  thread,
  evidence = {},
) {
  const normalizedThread =
    assertImageboardThread(
      thread,
    );

  const expectedContentCid =
    normalizedThread.b3
      .expectedContentCid;

  const expectedThumbnailCid =
    normalizedThread.b3
      .expectedThumbnailCid;

  const resolvedContentCid =
    evidence.resolvedContentCid
      ? normalizeCanonicalB3Cid(
          evidence.resolvedContentCid,
          'resolved content CID',
        )
      : '';

  const resolvedThumbnailCid =
    evidence.resolvedThumbnailCid
      ? normalizeCanonicalB3Cid(
          evidence.resolvedThumbnailCid,
          'resolved thumbnail CID',
        )
      : '';

  if (
    resolvedContentCid ===
    ''
  ) {
    return deepFreeze({
      verified:
        false,

      contentVerified:
        false,

      thumbnailVerified:
        null,

      reason:
        'resolved_content_cid_required',

      expectedContentCid,

      resolvedContentCid,

      expectedThumbnailCid,

      resolvedThumbnailCid,
    });
  }

  if (
    resolvedContentCid !==
    expectedContentCid
  ) {
    return deepFreeze({
      verified:
        false,

      contentVerified:
        false,

      thumbnailVerified:
        null,

      reason:
        'content_cid_mismatch',

      expectedContentCid,

      resolvedContentCid,

      expectedThumbnailCid,

      resolvedThumbnailCid,
    });
  }

  if (
    resolvedThumbnailCid &&
    resolvedThumbnailCid !==
      expectedThumbnailCid
  ) {
    return deepFreeze({
      verified:
        false,

      contentVerified:
        true,

      thumbnailVerified:
        false,

      reason:
        'thumbnail_cid_mismatch',

      expectedContentCid,

      resolvedContentCid,

      expectedThumbnailCid,

      resolvedThumbnailCid,
    });
  }

  return deepFreeze({
    verified:
      true,

    contentVerified:
      true,

    thumbnailVerified:
      resolvedThumbnailCid
        ? true
        : null,

    reason:
      'verified',

    expectedContentCid,

    resolvedContentCid,

    expectedThumbnailCid,

    resolvedThumbnailCid,
  });
}

export function projectImageboardGrid({
  threads = [],
  settings = {},
  category = 'all',
  page = 1,
  revealWarnings = false,
} = {}) {
  if (
    Array.isArray(
      threads,
    ) ===
    false
  ) {
    throw new ImageboardModelError(
      'Imageboard grid threads must be an array.',
      'invalid_thread_list',
    );
  }

  const normalizedSettings =
    normalizeImageboardSettings(
      settings,
    );

  const selectedCategory =
    normalizeGridCategory(
      category,
      normalizedSettings,
    );

  const normalizedPage =
    normalizeBoundedInteger(
      page,
      1,
      1,
      1_000_000,
      'page',
    );

  const eligible =
    threads
      .map(
        assertImageboardThread,
      )
      .filter(
        (thread) =>
          PUBLIC_BOARD_VISIBILITY.has(
            thread.visibility,
          ),
      )
      .filter(
        (thread) =>
          selectedCategory ===
            'all' ||
          thread.category ===
            selectedCategory,
      )
      .sort(
        newestThreadFirst,
      );

  const paged =
    paginate(
      eligible,
      normalizedPage,
      normalizedSettings.pageSize,
    );

  return deepFreeze({
    modelVersion:
      IMAGEBOARD_MODEL_VERSION,

    category:
      selectedCategory,

    ordering:
      'newest_first',

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
        (thread) =>
          projectThreadCard(
            thread,
            revealWarnings,
          ),
      ),
  });
}

export function projectImageboardReplyPreview(
  raw,
  options = {},
) {
  if (
    isPlainObject(
      raw,
    ) ===
      false
  ) {
    throw new ImageboardModelError(
      'Imageboard reply preview must be a plain object.',
      'invalid_reply_preview',
    );
  }

  const visibility =
    normalizeVisibility(
      raw.visibility ??
        'public',
    );

  const contentWarning =
    normalizeContentWarning(
      raw.contentWarning,

      options.warningLabel ??
        'Content warning',
    );

  const normalized =
    {
      crabUrl:
        normalizeTypedCrabUrl(
          raw.crabUrl,
          'comment',
          'reply crab URL',
        ),

      parentCrabUrl:
        normalizeReplyParentCrabUrl(
          raw.parentCrabUrl,
        ),

      body:
        normalizeBoundedText(
          raw.body ??
            '',
          4000,
          'reply body',
        ),

      creator:
        normalizeCreatorProjection(
          raw.creator,
        ),

      createdAt:
        normalizeTimestamp(
          raw.createdAt,
          'createdAt',
        ),

      visibility,

      moderationState:
        projectModerationState(
          visibility,
          contentWarning,
        ),

      contentWarning,
    };

  return deepFreeze(
    projectReply(
      normalized,
      options.revealWarnings ===
        true,
    ),
  );
}

export function projectImageboardThreadDetail({
  thread,
  replies = [],
  settings = {},
  replyPage = 1,
  revealWarnings = false,
} = {}) {
  const root =
    assertImageboardThread(
      thread,
    );

  if (
    Array.isArray(
      replies,
    ) ===
    false
  ) {
    throw new ImageboardModelError(
      'Imageboard replies must be an array.',
      'invalid_reply_list',
    );
  }

  const normalizedSettings =
    normalizeImageboardSettings(
      settings,
    );

  const normalizedReplies =
    replies
      .map(
        (reply) =>
          createImageboardReply(
            reply,
            root,
            {
              settings:
                normalizedSettings,
            },
          ),
      )
      .filter(
        (reply) =>
          PUBLIC_BOARD_VISIBILITY.has(
            reply.visibility,
          ),
      )
      .sort(
        oldestReplyFirst,
      );

  const paged =
    paginate(
      normalizedReplies,
      normalizeBoundedInteger(
        replyPage,
        1,
        1,
        1_000_000,
        'replyPage',
      ),
      normalizedSettings.replyPageSize,
    );

  return deepFreeze({
    modelVersion:
      IMAGEBOARD_MODEL_VERSION,

    thread:
      projectThreadCard(
        root,
        revealWarnings,
      ),

    replies: {
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
          (reply) =>
            projectReply(
              reply,
              revealWarnings,
            ),
        ),
    },
  });
}

function projectThreadCard(
  thread,
  revealWarnings,
) {
  const state =
    thread.moderationState;

  if (
    state ===
    'deleted'
  ) {
    return {
      imageCrabUrl:
        thread.imageCrabUrl,

      category:
        thread.category,

      moderationState:
        state,

      title:
        'Deleted thread',

      summary:
        '',

      creator:
        null,

      thumbnail:
        null,

      contentWarning:
        null,

      publishedAt:
        thread.publishedAt,

      replyCount:
        thread.replyCount,
    };
  }

  if (
    state ===
    'blocked'
  ) {
    return {
      imageCrabUrl:
        thread.imageCrabUrl,

      category:
        thread.category,

      moderationState:
        state,

      title:
        'Blocked thread',

      summary:
        '',

      creator:
        null,

      thumbnail:
        null,

      contentWarning:
        null,

      publishedAt:
        thread.publishedAt,

      replyCount:
        thread.replyCount,
    };
  }

  if (
    state ===
    'moderated'
  ) {
    return {
      imageCrabUrl:
        thread.imageCrabUrl,

      category:
        thread.category,

      moderationState:
        state,

      title:
        'Moderated thread',

      summary:
        '',

      creator:
        null,

      thumbnail:
        null,

      contentWarning:
        null,

      publishedAt:
        thread.publishedAt,

      replyCount:
        thread.replyCount,
    };
  }

  const warningHidden =
    state ===
      'content_warning' &&
    revealWarnings ===
      false;

  return {
    imageCrabUrl:
      thread.imageCrabUrl,

    category:
      thread.category,

    moderationState:
      state,

    title:
      thread.title,

    summary:
      warningHidden
        ? ''
        : thread.summary,

    creator:
      thread.creator,

    thumbnail:
      warningHidden
        ? null
        : thread.thumbnail,

    contentWarning:
      thread.contentWarning,

    publishedAt:
      thread.publishedAt,

    replyCount:
      thread.replyCount,
  };
}

function projectReply(
  reply,
  revealWarnings,
) {
  const state =
    reply.moderationState;

  if (
    state ===
      'deleted' ||
    state ===
      'blocked' ||
    state ===
      'moderated'
  ) {
    return {
      crabUrl:
        reply.crabUrl,

      parentCrabUrl:
        reply.parentCrabUrl,

      moderationState:
        state,

      body:
        '',

      creator:
        null,

      createdAt:
        reply.createdAt,

      contentWarning:
        null,
    };
  }

  const warningHidden =
    state ===
      'content_warning' &&
    revealWarnings ===
      false;

  return {
    crabUrl:
      reply.crabUrl,

    parentCrabUrl:
      reply.parentCrabUrl,

    moderationState:
      state,

    body:
      warningHidden
        ? ''
        : reply.body,

    creator:
      reply.creator,

    createdAt:
      reply.createdAt,

    contentWarning:
      reply.contentWarning,
  };
}

function projectModerationState(
  visibility,
  contentWarning,
) {
  const normalizedVisibility =
    normalizeVisibility(
      visibility,
    );

  if (
    normalizedVisibility ===
      'deleted'
  ) {
    return 'deleted';
  }

  if (
    normalizedVisibility ===
      'blocked'
  ) {
    return 'blocked';
  }

  if (
    normalizedVisibility ===
      'moderated'
  ) {
    return 'moderated';
  }

  if (
    normalizedVisibility ===
      'public' &&
    contentWarning
  ) {
    return 'content_warning';
  }

  return 'visible';
}

function assertImageboardThread(
  raw,
) {
  if (
    isPlainObject(
      raw,
    ) ===
      false ||
    raw.schema !==
      IMAGEBOARD_THREAD_SCHEMA ||
    raw.modelVersion !==
      IMAGEBOARD_MODEL_VERSION
  ) {
    throw new ImageboardModelError(
      'Invalid Imageboard thread projection.',
      'invalid_thread',
    );
  }

  normalizeNamedSiteCrabUrl(
    raw.siteCrabUrl,
  );

  normalizeTypedCrabUrl(
    raw.imageCrabUrl,
    'image',
    'imageCrabUrl',
  );

  normalizeCanonicalB3Cid(
    raw.b3
      ?.expectedContentCid,
    'expected content CID',
  );

  normalizeCanonicalB3Cid(
    raw.b3
      ?.expectedThumbnailCid,
    'expected thumbnail CID',
  );

  if (
    IMAGEBOARD_MODERATION_STATES.includes(
      raw.moderationState,
    ) ===
    false
  ) {
    throw new ImageboardModelError(
      'Invalid Imageboard moderation projection.',
      'invalid_moderation_state',
    );
  }

  return raw;
}

function normalizeCategoryDefinition(
  raw,
) {
  const input =
    typeof raw ===
      'string'
      ? {
          id:
            raw,

          label:
            raw,
        }
      : raw;

  if (
    isPlainObject(
      input,
    ) ===
    false
  ) {
    throw new ImageboardModelError(
      'Imageboard category must be a string or plain object.',
      'invalid_category',
    );
  }

  const id =
    normalizeCategoryId(
      input.id ??
        input.label,
    );

  const label =
    normalizeBoundedText(
      input.label ??
        id,
      40,
      'category label',
    );

  const description =
    normalizeBoundedText(
      input.description ??
        '',
      160,
      'category description',
    );

  return {
    id,

    label,

    description,
  };
}

function normalizeThreadCategory(
  raw,
  settings,
) {
  const id =
    normalizeCategoryId(
      raw,
    );

  if (
    settings.categories.some(
      (category) =>
        category.id ===
        id,
    ) ===
    false
  ) {
    throw new ImageboardModelError(
      'Imageboard thread category is not configured for this board.',
      'unknown_thread_category',
    );
  }

  return id;
}

function normalizeGridCategory(
  raw,
  settings,
) {
  const value =
    String(
      raw ??
        'all',
    )
      .trim()
      .toLowerCase();

  if (
    value ===
    'all'
  ) {
    return value;
  }

  return normalizeThreadCategory(
    value,
    settings,
  );
}

function normalizeCategoryId(
  raw,
) {
  const value =
    String(
      raw ??
        '',
    )
      .trim()
      .toLowerCase();

  if (
    /^[a-z0-9][a-z0-9_-]{0,31}$/.test(
      value,
    )
  ) {
    return value;
  }

  throw new ImageboardModelError(
    'Imageboard category ID is invalid.',
    'invalid_category_id',
  );
}

function normalizeContentWarning(
  raw,
  fallback,
) {
  if (
    raw ===
      undefined ||
    raw ===
      null ||
    raw ===
      false ||
    raw ===
      ''
  ) {
    return null;
  }

  if (
    raw ===
    true
  ) {
    return normalizeBoundedText(
      fallback,
      160,
      'content warning',
    );
  }

  return normalizeBoundedText(
    raw,
    160,
    'content warning',
  );
}

function normalizeVisibility(
  raw,
) {
  const value =
    String(
      raw ??
        '',
    )
      .trim()
      .toLowerCase();

  if (
    PUBLICATION_VISIBILITY.has(
      value,
    )
  ) {
    return value;
  }

  throw new ImageboardModelError(
    'Imageboard visibility state is invalid.',
    'invalid_visibility',
  );
}

function normalizeReplyParentCrabUrl(
  raw,
) {
  const value =
    String(
      raw ??
        '',
    )
      .trim()
      .toLowerCase();

  if (
    /^crab:\/\/[a-f0-9]{64}\.(image|comment)$/.test(
      value,
    )
  ) {
    return value;
  }

  throw new ImageboardModelError(
    'Imageboard reply parent must be a typed Image or Comment URL.',
    'invalid_reply_parent',
  );
}

function normalizeTypedCrabUrl(
  raw,
  kind,
  label,
) {
  const value =
    String(
      raw ??
        '',
    )
      .trim()
      .toLowerCase();

  const pattern =
    new RegExp(
      `^crab://[a-f0-9]{64}\\.${kind}$`,
    );

  if (
    pattern.test(
      value,
    )
  ) {
    return value;
  }

  throw new ImageboardModelError(
    `${label} must be a canonical typed CrabLink URL.`,
    'invalid_typed_crab_url',
  );
}

function normalizeNamedSiteCrabUrl(
  raw,
) {
  const value =
    String(
      raw ??
        '',
    )
      .trim()
      .toLowerCase();

  if (
    /^crab:\/\/[a-z0-9_.-]{1,80}$/.test(
      value,
    )
  ) {
    return value;
  }

  throw new ImageboardModelError(
    'Imageboard requires a named crab:// Site context.',
    'invalid_site_context',
  );
}

function normalizeCanonicalB3Cid(
  raw,
  label,
) {
  const value =
    String(
      raw ??
        '',
    )
      .trim()
      .toLowerCase();

  if (
    /^b3:[a-f0-9]{64}$/.test(
      value,
    )
  ) {
    return value;
  }

  throw new ImageboardModelError(
    `${label} must be a canonical B3 CID.`,
    'invalid_b3_cid',
  );
}

function normalizeCreatorProjection(
  raw,
) {
  if (
    isPlainObject(
      raw,
    ) ===
    false
  ) {
    return null;
  }

  return {
    username:
      normalizeBoundedText(
        raw.username ??
          '',
        32,
        'creator username',
      ),

    displayName:
      normalizeBoundedText(
        raw.displayName ??
          '',
        120,
        'creator display name',
      ),

    profileUrl:
      normalizeBoundedText(
        raw.profileUrl ??
          '',
        160,
        'creator profile URL',
      ),
  };
}

function normalizeTimestamp(
  raw,
  label,
) {
  const value =
    String(
      raw ??
        '',
    ).trim();

  const timestamp =
    Date.parse(
      value,
    );

  if (
    Number.isFinite(
      timestamp,
    ) ===
    false
  ) {
    throw new ImageboardModelError(
      `${label} must be a valid timestamp.`,
      'invalid_timestamp',
    );
  }

  return new Date(
    timestamp,
  ).toISOString();
}

function normalizeBoundedInteger(
  raw,
  fallback,
  minimum,
  maximum,
  label,
) {
  const candidate =
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
    Number.isInteger(
      candidate,
    ) ===
      false ||
    candidate <
      minimum ||
    candidate >
      maximum
  ) {
    throw new ImageboardModelError(
      `${label} is outside its reviewed bound.`,
      'invalid_bounded_integer',
    );
  }

  return candidate;
}

function normalizeBoundedText(
  raw,
  maximum,
  label,
) {
  const value =
    String(
      raw ??
        '',
    ).trim();

  if (
    value.length >
    maximum
  ) {
    throw new ImageboardModelError(
      `${label} exceeds its reviewed bound.`,
      'text_bound_exceeded',
    );
  }

  return value;
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

  const pagedItems =
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
      pagedItems,
  };
}

function newestThreadFirst(
  left,
  right,
) {
  const difference =
    Date.parse(
      right.publishedAt,
    ) -
    Date.parse(
      left.publishedAt,
    );

  if (
    difference !==
    0
  ) {
    return difference;
  }

  return left.imageCrabUrl
    .localeCompare(
      right.imageCrabUrl,
    );
}

function oldestReplyFirst(
  left,
  right,
) {
  const difference =
    Date.parse(
      left.createdAt,
    ) -
    Date.parse(
      right.createdAt,
    );

  if (
    difference !==
    0
  ) {
    return difference;
  }

  return left.crabUrl
    .localeCompare(
      right.crabUrl,
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
