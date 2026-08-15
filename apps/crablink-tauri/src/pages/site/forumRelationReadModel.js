/**
 * RO:WHAT — Maps durable publication-relation pages into Forum Comment replies.
 * RO:WHY — FINAL_BETA Phase 15 needs real Forum reply topology and activity from reviewed relation truth.
 * RO:INTERACTS — publicationRelationAdapter, forumPublicRead, forumModel.
 * RO:INVARIANTS — Comment only; exact Post thread; Post/Comment parent only; exact named Site; max 100/page; private/unlisted omitted.
 * RO:SECURITY — creatorDisplay remains display-only; no transport, publication, moderation, wallet, ledger, follow, QuickChain, ROX, or Solana authority.
 * RO:TEST — forumPublicRead.test.mjs.
 */

// FINAL_BETA_PHASE15_FORUM_RELATION_READ_V1

import {
  createForumReply,
} from './forumModel.js';

export const FORUM_RELATION_PAGE_SCHEMA =
  'crablink.publication-relation-page.v1';

export const FORUM_RELATION_ITEM_SCHEMA =
  'crablink.publication-relation.v1';

export const FORUM_RELATION_READ_SOURCE =
  'publication_relation_page_v1';

const MAX_ITEMS =
  100;

const MAX_CURSOR =
  128;

const MAX_BODY =
  1000;

const MAX_CREATOR_DISPLAY =
  120;

const POST_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.post$/u;

const COMMENT_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.comment$/u;

const PARENT_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.(post|comment)$/u;

const SITE_PATTERN =
  /^crab:\/\/[a-z0-9][a-z0-9_-]{0,62}$/u;

const B3_PATTERN =
  /^b3:[0-9a-f]{64}$/u;

export class ForumRelationReadError extends Error {
  constructor(
    message,
    reason =
      'forum_relation_read_error',
  ) {
    super(
      String(
        message ||
          'Forum relation read failed.',
      ),
    );

    this.name =
      'ForumRelationReadError';

    this.reason =
      reason;
  }
}

export function mapPublicationRelationPageToForumReplies(
  rawPage,
  {
    siteCrabUrl,
    threadCrabUrl,
  } =
    {},
) {
  const page =
    plainObject(
      rawPage,
      'Publication relation page',
      'invalid_relation_page',
    );

  if (
    page.schema !==
      FORUM_RELATION_PAGE_SCHEMA
  ) {
    fail(
      'Publication relation page schema is invalid.',
      'invalid_relation_page_schema',
    );
  }

  if (
    Array.isArray(
      page.items,
    ) ===
      false
  ) {
    fail(
      'Publication relation page items must be an array.',
      'invalid_relation_page_items',
    );
  }

  if (
    page.items.length >
      MAX_ITEMS
  ) {
    fail(
      'Publication relation page exceeds the reviewed 100-item bound.',
      'relation_page_too_large',
    );
  }

  const site =
    normalizedPattern(
      siteCrabUrl,
      SITE_PATTERN,
      'Forum Site',
      'invalid_forum_site',
    );

  const thread =
    normalizedPattern(
      threadCrabUrl,
      POST_PATTERN,
      'Forum Post thread',
      'invalid_forum_thread',
    );

  if (
    typeof page.hasMore !==
      'boolean'
  ) {
    fail(
      'Publication relation hasMore must be boolean.',
      'invalid_relation_has_more',
    );
  }

  const nextCursor =
    normalizeCursor(
      page.nextCursor,
    );

  if (
    page.hasMore ===
      true &&
    nextCursor ===
      null
  ) {
    fail(
      'Publication relation continuation cursor is required.',
      'missing_relation_cursor',
    );
  }

  const replies =
    [];

  let omittedPrivate =
    0;

  for (
    const relation
    of page.items
  ) {
    const reply =
      mapRelation(
        relation,
        {
          siteCrabUrl:
            site,

          threadCrabUrl:
            thread,
        },
      );

    if (
      reply ===
        null
    ) {
      omittedPrivate +=
        1;

      continue;
    }

    replies.push(
      reply,
    );
  }

  return deepFreeze({
    source:
      FORUM_RELATION_READ_SOURCE,

    schema:
      FORUM_RELATION_PAGE_SCHEMA,

    siteCrabUrl:
      site,

    threadCrabUrl:
      thread,

    replies,

    page:
      {
        receivedItems:
          page.items.length,

        projectedItems:
          replies.length,

        omittedPrivate,

        hasMore:
          page.hasMore,

        nextCursor,
      },
  });
}

function mapRelation(
  raw,
  {
    siteCrabUrl,
    threadCrabUrl,
  },
) {
  const relation =
    plainObject(
      raw,
      'Publication relation',
      'invalid_relation',
    );

  if (
    relation.schema !==
      FORUM_RELATION_ITEM_SCHEMA
  ) {
    fail(
      'Publication relation schema is invalid.',
      'invalid_relation_schema',
    );
  }

  const publication =
    plainObject(
      relation.publication,
      'Publication relation publication',
      'invalid_relation_publication',
    );

  if (
    String(
      publication.kind ??
        '',
    )
      .trim()
      .toLowerCase() !==
      'comment'
  ) {
    fail(
      'Forum publication relations accept Comment publications only.',
      'invalid_relation_kind',
    );
  }

  const crabUrl =
    normalizedPattern(
      publication.crabUrl,
      COMMENT_PATTERN,
      'Forum Comment URL',
      'invalid_relation_comment',
    );

  const parentCrabUrl =
    normalizedPattern(
      relation.parentCrabUrl,
      PARENT_PATTERN,
      'Forum reply parent',
      'invalid_relation_parent',
    );

  const relationThread =
    normalizedPattern(
      relation.threadCrabUrl,
      POST_PATTERN,
      'Forum relation thread',
      'invalid_relation_thread',
    );

  const relationSite =
    normalizedPattern(
      relation.siteCrabUrl,
      SITE_PATTERN,
      'Forum relation Site',
      'invalid_relation_site',
    );

  if (
    relationThread !==
      threadCrabUrl
  ) {
    fail(
      'Forum relation thread does not match the active Post root.',
      'relation_thread_mismatch',
    );
  }

  if (
    relationSite !==
      siteCrabUrl
  ) {
    fail(
      'Forum relation Site does not match the active Forum Site.',
      'relation_site_mismatch',
    );
  }

  if (
    parentCrabUrl.endsWith(
      '.post',
    ) &&
    parentCrabUrl !==
      threadCrabUrl
  ) {
    fail(
      'Forum direct Post parent must equal the thread root.',
      'relation_parent_thread_mismatch',
    );
  }

  const visibility =
    normalizeVisibility(
      publication.visibility,
    );

  if (
    visibility ===
      null
  ) {
    return null;
  }

  const references =
    plainObject(
      publication.references,
      'Publication relation references',
      'invalid_relation_references',
    );

  const contentCid =
    String(
      references.contentCid ??
        '',
    )
      .trim()
      .toLowerCase();

  if (
    B3_PATTERN.test(
      contentCid,
    ) ===
      false
  ) {
    fail(
      'Forum relation content CID must be canonical B3 evidence.',
      'invalid_relation_content_cid',
    );
  }

  const referenceSite =
    normalizedPattern(
      references.siteUrl,
      SITE_PATTERN,
      'Forum relation reference Site',
      'invalid_relation_reference_site',
    );

  if (
    referenceSite !==
      siteCrabUrl
  ) {
    fail(
      'Forum relation reference Site does not match the active Forum Site.',
      'relation_reference_site_mismatch',
    );
  }

  const creatorDisplay =
    boundedText(
      publication.creatorDisplay,
      MAX_CREATOR_DISPLAY,
      'creatorDisplay',
    );

  const creator =
    creatorDisplay
      ? deepFreeze({
          displayName:
            creatorDisplay,

          identityVerified:
            false,
        })
      : null;

  const reply =
    createForumReply({
      siteCrabUrl,

      threadCrabUrl,

      crabUrl,

      parentCrabUrl,

      body:
        boundedText(
          publication.summary,
          MAX_BODY,
          'Comment summary',
        ),

      creator,

      createdAt:
        createdAtIso(
          publication.createdAtMs,
        ),

      visibility,
    });

  return deepFreeze({
    ...reply,

    creatorDisplay:
      creatorDisplay ||
      null,

    creatorIdentityVerified:
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

  fail(
    'Forum relation visibility is unsupported.',
    'invalid_relation_visibility',
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
    value.length <
      1 ||
    value.length >
      MAX_CURSOR
  ) {
    fail(
      'Forum relation cursor is outside the supported bound.',
      'invalid_relation_cursor',
    );
  }

  return value;
}

function createdAtIso(
  raw,
) {
  const value =
    Number(
      raw,
    );

  if (
    Number.isSafeInteger(
      value,
    ) ===
      false ||
    value <=
      0
  ) {
    fail(
      'Forum relation createdAtMs must be a positive safe integer.',
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
    ) ===
      false
  ) {
    fail(
      'Forum relation createdAtMs is not representable.',
      'invalid_relation_created_at',
    );
  }

  return date.toISOString();
}

function boundedText(
  raw,
  maximum,
  label,
) {
  if (
    raw ===
      null ||
    raw ===
      undefined
  ) {
    return '';
  }

  const value =
    String(
      raw,
    ).trim();

  if (
    value.length >
      maximum
  ) {
    fail(
      `${label} exceeds its reviewed bound.`,
      'relation_text_too_long',
    );
  }

  return value;
}

function normalizedPattern(
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
    ) ===
      false
  ) {
    fail(
      `${label} is invalid.`,
      reason,
    );
  }

  return value;
}

function plainObject(
  raw,
  label,
  reason,
) {
  if (
    raw &&
    typeof raw ===
      'object' &&
    Array.isArray(
      raw,
    ) ===
      false
  ) {
    return raw;
  }

  fail(
    `${label} must be an object.`,
    reason,
  );
}

function fail(
  message,
  reason,
) {
  throw new ForumRelationReadError(
    message,
    reason,
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
