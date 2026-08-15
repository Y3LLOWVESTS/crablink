/**
 * RO:WHAT — Maps durable Site-publication roots into Forum thread read models.
 * RO:WHY — FINAL_BETA Phase 15 needs public Forum thread discovery from backend Site truth.
 * RO:INTERACTS — sitePublicationAdapter, forumModel, later publicationRelationAdapter reply hydration.
 * RO:INVARIANTS — Post + forum tag only; exactly one safe category tag; exact Site; backend createdAtMs only; no local category or activity truth.
 * RO:SECURITY — creatorDisplay stays display-only; sticky/locked remain false until reviewed policy evidence; no mutation or economic authority.
 * RO:TEST — forumSitePublicationReadModel.test.mjs.
 */

// FINAL_BETA_PHASE15A4A2C3_FORUM_SITE_PUBLICATION_ROOT_PROJECTION_V1

import {
  assertSitePublicationPageV1,
} from '../../adapters/sitePublicationAdapter.js';

import {
  FORUM_MODEL_VERSION,
  FORUM_THREAD_SCHEMA,
} from './forumModel.js';

export const FORUM_SITE_PUBLICATION_READ_SOURCE =
  'site_publication_v1';

export const FORUM_SITE_PUBLICATION_PAGE_SCHEMA =
  'crablink.forum-site-publication-page.v1';

const NAMED_SITE_PATTERN =
  /^crab:\/\/[a-z0-9][a-z0-9_-]{0,62}$/u;

const POST_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.post$/u;

const CATEGORY_TAG_PATTERN =
  /^forum-category:([a-z0-9][a-z0-9_-]{0,31})$/u;

const PUBLIC_FORUM_VISIBILITIES =
  new Set([
    'public',
    'public_preview',
    'deleted',
    'blocked',
    'moderated',
  ]);

export class ForumSitePublicationReadError extends Error {
  constructor(
    message,
    reason =
      'forum_site_publication_read_error',
  ) {
    super(
      String(
        message ||
          'Forum Site-publication projection failed.',
      ),
    );

    this.name =
      'ForumSitePublicationReadError';

    this.reason =
      reason;
  }
}

export function mapSitePublicationPageToForumThreads(
  rawPage,
  {
    siteCrabUrl,
  } =
    {},
) {
  const page =
    assertSitePublicationPageV1(
      rawPage,
    );

  const activeSite =
    normalizeNamedSite(
      siteCrabUrl,
    );

  const items =
    [];

  for (
    const publication
    of page.items
  ) {
    if (
      publication.siteCrabUrl !==
        activeSite
    ) {
      fail(
        'Forum root Site does not match the active Forum Site.',
        'forum_site_context_mismatch',
      );
    }

    if (
      publication.kind !==
        'post'
    ) {
      continue;
    }

    const forumTagCount =
      publication.tags.filter(
        (tag) =>
          tag ===
            'forum',
      ).length;

    if (
      forumTagCount ===
        0
    ) {
      continue;
    }

    if (
      forumTagCount !==
        1
    ) {
      fail(
        'Forum root must contain exactly one Forum marker tag.',
        'invalid_forum_root_tag',
      );
    }

    if (
      publication.visibility ===
        'private' ||
      publication.visibility ===
        'unlisted'
    ) {
      continue;
    }

    if (
      PUBLIC_FORUM_VISIBILITIES.has(
        publication.visibility,
      ) ===
        false
    ) {
      fail(
        'Forum root visibility is unsupported.',
        'invalid_forum_visibility',
      );
    }

    const category =
      categoryFromTags(
        publication.tags,
      );

    const contentCid =
      publication.references
        .contentCid;

    if (
      typeof contentCid !==
        'string' ||
      contentCid.length ===
        0
    ) {
      fail(
        'Forum Post root requires backend content CID evidence.',
        'forum_content_cid_required',
      );
    }

    if (
      publication.references
        .siteUrl !==
        activeSite
    ) {
      fail(
        'Forum Post Site reference must equal the active Forum Site.',
        'forum_site_reference_required',
      );
    }

    if (
      POST_PATTERN.test(
        publication.crabUrl,
      ) ===
        false
    ) {
      fail(
        'Forum thread root must be a canonical Post URL.',
        'forum_post_root_required',
      );
    }

    const publishedAt =
      timestampFromMs(
        publication.createdAtMs,
      );

    const moderationState =
      moderationStateFromVisibility(
        publication.visibility,
      );

    items.push(
      deepFreeze({
        schema:
          FORUM_THREAD_SCHEMA,

        modelVersion:
          FORUM_MODEL_VERSION,

        source:
          FORUM_SITE_PUBLICATION_READ_SOURCE,

        publicationId:
          publication.publicationId,

        siteCrabUrl:
          activeSite,

        postCrabUrl:
          publication.crabUrl,

        title:
          boundedText(
            publication.title,
            160,
            'Forum thread title',
          ),

        summary:
          boundedText(
            publication.summary,
            1000,
            'Forum thread summary',
          ),

        creator:
          null,

        creatorDisplay:
          publication.creatorDisplay,

        creatorIdentityVerified:
          false,

        category,

        publishedAt,

        updatedAt:
          publishedAt,

        latestActivityAt:
          publishedAt,

        latestActivitySource:
          'site_publication_created_at_ms',

        visibility:
          publication.visibility,

        moderationState,

        replyCount:
          0,

        replyCountKnown:
          false,

        sticky:
          false,

        locked:
          false,

        policyStateSource:
          'none',

        canReply:
          moderationState ===
            'visible',

        tags:
          publication.tags,

        b3:
          deepFreeze({
            expectedContentCid:
              contentCid,

            contentVerified:
              false,

            resolvedContentCid:
              null,
          }),
      }),
    );
  }

  return deepFreeze({
    schema:
      FORUM_SITE_PUBLICATION_PAGE_SCHEMA,

    source:
      FORUM_SITE_PUBLICATION_READ_SOURCE,

    siteCrabUrl:
      activeSite,

    items,

    nextCursor:
      page.nextCursor,

    hasMore:
      page.hasMore,
  });
}

function categoryFromTags(
  tags,
) {
  const categoryTags =
    tags.filter(
      (tag) =>
        tag.startsWith(
          'forum-category:',
        ),
    );

  if (
    categoryTags.length !==
      1
  ) {
    fail(
      'Forum root requires exactly one backend category tag.',
      'forum_category_tag_required',
    );
  }

  const match =
    categoryTags[0]
      .match(
        CATEGORY_TAG_PATTERN,
      );

  if (
    match ===
      null
  ) {
    fail(
      'Forum category tag is not in the reviewed safe form.',
      'invalid_forum_category_tag',
    );
  }

  return match[1];
}

function moderationStateFromVisibility(
  visibility,
) {
  if (
    visibility ===
      'public' ||
    visibility ===
      'public_preview'
  ) {
    return 'visible';
  }

  return visibility;
}

function timestampFromMs(
  value,
) {
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
      'Forum root backend timestamp is invalid.',
      'invalid_forum_created_at',
    );
  }

  return date.toISOString();
}

function boundedText(
  value,
  maximum,
  label,
) {
  const text =
    String(
      value ??
        '',
    ).trim();

  if (
    text.length >
      maximum
  ) {
    fail(
      `${label} exceeds the Forum model bound.`,
      'forum_text_bound_exceeded',
    );
  }

  return text;
}

function normalizeNamedSite(
  value,
) {
  const site =
    String(
      value ??
        '',
    )
      .trim()
      .toLowerCase();

  if (
    NAMED_SITE_PATTERN.test(
      site,
    ) ===
      false
  ) {
    fail(
      'Forum read requires a canonical named Site URL.',
      'invalid_forum_site',
    );
  }

  return site;
}

function fail(
  message,
  reason,
) {
  throw new ForumSitePublicationReadError(
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
