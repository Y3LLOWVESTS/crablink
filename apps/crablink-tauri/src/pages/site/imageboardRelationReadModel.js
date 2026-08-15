/**
 * RO:WHAT — Deterministic mapping from durable publication-relation pages into existing Imageboard reply inputs.
 * RO:WHY — FINAL_BETA Phase 14 needs backend relation truth to enter the established Imageboard reply/moderation model without a parallel reply state machine.
 * RO:INTERACTS — publicationRelationAdapter.js and imageboardModel.js.
 * RO:INVARIANTS — Comment relations only; exact Image thread root; Image/Comment parent only; named Site context; createdAtMs becomes ISO; public_preview becomes public; private/unlisted never become visible replies.
 * RO:SECURITY — pure read mapping only; no transport, storage, publication mutation, wallet, ledger, receipt, entitlement, follow, settlement, QuickChain, ROX, or Solana authority.
 * RO:TEST — imageboardRelationReadModel.test.mjs.
 */

// FINAL_BETA_PHASE14A6E2_DURABLE_RELATION_MAPPING_V1

export const IMAGEBOARD_RELATION_READ_MODEL_VERSION =
  'crablink.imageboard-relation-read.v1';

export const IMAGEBOARD_RELATION_PAGE_SCHEMA =
  'crablink.publication-relation-page.v1';

export const IMAGEBOARD_RELATION_ITEM_SCHEMA =
  'crablink.publication-relation.v1';

export const IMAGEBOARD_RELATION_READ_SOURCE =
  'publication_relation_page_v1';

export const IMAGEBOARD_RELATION_CONTENT_SOURCE =
  'publication_relation_summary_preview_v1';

const MAX_RELATIONS_PER_PAGE =
  100;

const MAX_RELATION_CURSOR_LENGTH =
  128;

const MAX_RELATION_SUMMARY_LENGTH =
  500;

const MAX_CREATOR_DISPLAY_LENGTH =
  120;

const COMMENT_CRAB_URL_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.comment$/u;

const IMAGE_CRAB_URL_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.image$/u;

const REPLY_PARENT_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.(image|comment)$/u;

const NAMED_SITE_PATTERN =
  /^crab:\/\/[a-z0-9_.-]{1,80}$/u;

export class ImageboardRelationReadError extends Error {
  constructor(
    message,
    reason =
      'imageboard_relation_read_error',
  ) {
    super(
      message,
    );

    this.name =
      'ImageboardRelationReadError';

    this.reason =
      reason;
  }
}

export function mapPublicationRelationPageToImageboardReplies(
  rawPage,
) {
  const page =
    requirePlainObject(
      rawPage,
      'Publication relation page',
    );

  if (
    page.schema !==
      IMAGEBOARD_RELATION_PAGE_SCHEMA
  ) {
    throw new ImageboardRelationReadError(
      'Publication relation page schema is invalid.',
      'invalid_relation_page_schema',
    );
  }

  if (
    Array.isArray(
      page.items,
    ) === false
  ) {
    throw new ImageboardRelationReadError(
      'Publication relation page items must be an array.',
      'invalid_relation_page_items',
    );
  }

  if (
    page.items.length >
      MAX_RELATIONS_PER_PAGE
  ) {
    throw new ImageboardRelationReadError(
      'Publication relation page exceeds the reviewed item bound.',
      'relation_page_too_large',
    );
  }

  const hasMore =
    normalizeHasMore(
      page.hasMore,
    );

  const nextCursor =
    normalizeCursor(
      page.nextCursor,
    );

  if (
    hasMore &&
    nextCursor ===
      null
  ) {
    throw new ImageboardRelationReadError(
      'A relation page with more results must include its opaque continuation cursor.',
      'missing_relation_cursor',
    );
  }

  const replies =
    [];

  let omittedPrivate =
    0;

  for (
    const rawRelation
    of page.items
  ) {
    const mapped =
      mapRelation(
        rawRelation,
      );

    if (
      mapped ===
        null
    ) {
      omittedPrivate +=
        1;

      continue;
    }

    replies.push(
      mapped,
    );
  }

  return deepFreeze({
    modelVersion:
      IMAGEBOARD_RELATION_READ_MODEL_VERSION,

    source:
      IMAGEBOARD_RELATION_READ_SOURCE,

    contentSource:
      IMAGEBOARD_RELATION_CONTENT_SOURCE,

    relationPageSchema:
      IMAGEBOARD_RELATION_PAGE_SCHEMA,

    relationItemSchema:
      IMAGEBOARD_RELATION_ITEM_SCHEMA,

    replies,

    page: {
      receivedItems:
        page.items.length,

      projectedItems:
        replies.length,

      omittedPrivate,

      hasMore,

      nextCursor,
    },
  });
}

function mapRelation(
  rawRelation,
) {
  const relation =
    requirePlainObject(
      rawRelation,
      'Publication relation',
    );

  if (
    relation.schema !==
      IMAGEBOARD_RELATION_ITEM_SCHEMA
  ) {
    throw new ImageboardRelationReadError(
      'Publication relation schema is invalid.',
      'invalid_relation_schema',
    );
  }

  const publication =
    requirePlainObject(
      relation.publication,
      'Publication relation summary',
    );

  if (
    publication.kind !==
      'comment'
  ) {
    throw new ImageboardRelationReadError(
      'Imageboard relation reads accept Comment publications only.',
      'invalid_relation_kind',
    );
  }

  const crabUrl =
    normalizeRequiredPattern(
      publication.crabUrl,
      COMMENT_CRAB_URL_PATTERN,
      'Comment crab URL',
      'invalid_relation_comment_url',
    );

  const parentCrabUrl =
    normalizeRequiredPattern(
      relation.parentCrabUrl,
      REPLY_PARENT_PATTERN,
      'Comment parent crab URL',
      'invalid_relation_parent_url',
    );

  const threadCrabUrl =
    normalizeRequiredPattern(
      relation.threadCrabUrl,
      IMAGE_CRAB_URL_PATTERN,
      'Image thread crab URL',
      'invalid_relation_thread_url',
    );

  const siteCrabUrl =
    normalizeRequiredPattern(
      relation.siteCrabUrl,
      NAMED_SITE_PATTERN,
      'Imageboard Site crab URL',
      'invalid_relation_site_url',
    );

  const visibility =
    normalizeRelationVisibility(
      publication.visibility,
    );

  if (
    visibility ===
      null
  ) {
    return null;
  }

  const body =
    normalizeBoundedText(
      publication.summary,
      MAX_RELATION_SUMMARY_LENGTH,
      'Comment relation summary',
    );

  const creator =
    normalizeCreatorDisplay(
      publication.creatorDisplay,
    );

  const createdAt =
    normalizeCreatedAtMs(
      publication.createdAtMs,
    );

  const b3 =
    normalizeRelationContentEvidence(
      publication.references,
    );

  return Object.freeze({
    siteCrabUrl,

    threadCrabUrl,

    crabUrl,

    parentCrabUrl,

    body,

    creator,

    createdAt,

    visibility,

    b3,

    contentWarning:
      null,
  });
}

function normalizeRelationContentEvidence(
  rawReferences,
) {
  const references =
    requirePlainObject(
      rawReferences,
      'Publication relation references',
    );

  const expectedContentCid =
    String(
      references.contentCid ??
        '',
    ).trim();

  if (
    /^b3:[0-9a-f]{64}$/u.test(
      expectedContentCid,
    ) === false
  ) {
    throw new ImageboardRelationReadError(
      'Publication relation contentCid must be canonical B3 evidence.',
      'invalid_relation_content_cid',
    );
  }

  return Object.freeze({
    expectedContentCid,

    expectedContentCidSource:
      'publication_relation_v1',

    contentVerified:
      false,

    resolvedContentCid:
      null,
  });
}

function normalizeRelationVisibility(
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
    value ===
      'public_preview'
  ) {
    return 'public';
  }

  if (
    value ===
      'public' ||
    value ===
      'deleted' ||
    value ===
      'blocked' ||
    value ===
      'moderated'
  ) {
    return value;
  }

  if (
    value ===
      'private' ||
    value ===
      'unlisted'
  ) {
    return null;
  }

  throw new ImageboardRelationReadError(
    'Publication relation visibility is invalid.',
    'invalid_relation_visibility',
  );
}

function normalizeCreatorDisplay(
  raw,
) {
  if (
    raw ===
      null ||
    raw ===
      undefined
  ) {
    return null;
  }

  const displayName =
    normalizeBoundedText(
      raw,
      MAX_CREATOR_DISPLAY_LENGTH,
      'Creator display',
    );

  if (
    displayName.length ===
      0
  ) {
    return null;
  }

  return Object.freeze({
    username:
      '',

    displayName,

    profileUrl:
      '',
  });
}

function normalizeCreatedAtMs(
  raw,
) {
  const value =
    Number(
      raw,
    );

  if (
    Number.isSafeInteger(
      value,
    ) === false ||
    value <=
      0
  ) {
    throw new ImageboardRelationReadError(
      'Publication relation createdAtMs must be a positive safe integer.',
      'invalid_relation_created_at',
    );
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isFinite(
      date.getTime(),
    ) === false
  ) {
    throw new ImageboardRelationReadError(
      'Publication relation createdAtMs cannot be represented as a timestamp.',
      'invalid_relation_created_at',
    );
  }

  return date.toISOString();
}

function normalizeHasMore(
  raw,
) {
  if (
    typeof raw ===
      'boolean'
  ) {
    return raw;
  }

  throw new ImageboardRelationReadError(
    'Publication relation page hasMore must be boolean.',
    'invalid_relation_has_more',
  );
}

function normalizeCursor(
  raw,
) {
  if (
    raw ===
      null ||
    raw ===
      undefined ||
    raw ===
      ''
  ) {
    return null;
  }

  const value =
    String(
      raw,
    ).trim();

  if (
    value.length ===
      0 ||
    value.length >
      MAX_RELATION_CURSOR_LENGTH
  ) {
    throw new ImageboardRelationReadError(
      'Publication relation continuation cursor is invalid.',
      'invalid_relation_cursor',
    );
  }

  return value;
}

function normalizeRequiredPattern(
  raw,
  pattern,
  label,
  reason,
) {
  const value =
    String(
      raw ??
        '',
    )
      .trim()
      .toLowerCase();

  if (
    pattern.test(
      value,
    )
  ) {
    return value;
  }

  throw new ImageboardRelationReadError(
    `${label} is invalid.`,
    reason,
  );
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
    throw new ImageboardRelationReadError(
      `${label} exceeds its reviewed bound.`,
      'relation_text_too_long',
    );
  }

  return value;
}

function requirePlainObject(
  raw,
  label,
) {
  if (
    raw &&
    typeof raw ===
      'object' &&
    Array.isArray(
      raw,
    ) === false
  ) {
    return raw;
  }

  throw new ImageboardRelationReadError(
    `${label} must be a plain object.`,
    'invalid_relation_object',
  );
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
    ) === false
  ) {
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
  }

  return value;
}
