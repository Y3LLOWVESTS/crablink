/**
 * RO:WHAT — Bounded public Forum reader joining Site roots with durable Comment relations.
 * RO:WHY — FINAL_BETA Phase 15 needs truthful reply count, nested reply chains, and reply-derived latest activity.
 * RO:INTERACTS — sitePublicationAdapter, publicationRelationAdapter, forumSitePublicationReadModel, forumRelationReadModel, forumModel.
 * RO:INVARIANTS — existing generic routes only; max 20 roots/read, max 100 replies/thread; nested traversal is cycle-safe and fail-closed on bounds.
 * RO:SECURITY — public reads only; no creator identity invention, publication/moderation mutation, wallet, ledger, follow, QuickChain, ROX, or Solana authority.
 * RO:TEST — forumPublicRead.test.mjs.
 */

// FINAL_BETA_PHASE15_FORUM_PUBLIC_READ_V1

import {
  createPublicationRelationAdapter,
} from '../../adapters/publicationRelationAdapter.js';

import {
  createSitePublicationAdapter,
} from '../../adapters/sitePublicationAdapter.js';

import {
  projectForumThreadDetail,
  projectForumThreadList,
} from './forumModel.js';

import {
  mapPublicationRelationPageToForumReplies,
} from './forumRelationReadModel.js';

import {
  mapSitePublicationPageToForumThreads,
} from './forumSitePublicationReadModel.js';

export const FORUM_ROOT_READ_LIMIT =
  20;

export const FORUM_REPLY_READ_LIMIT =
  100;

export const FORUM_RELATION_REQUEST_LIMIT =
  128;

export const FORUM_PUBLIC_READ_SOURCE =
  'site_publications_plus_publication_relations_v1';

const SITE_PATTERN =
  /^crab:\/\/[a-z0-9][a-z0-9_-]{0,62}$/u;

export class ForumPublicReadError extends Error {
  constructor(
    message,
    reason =
      'forum_public_read_error',
  ) {
    super(
      String(
        message ||
          'Forum public read failed.',
      ),
    );

    this.name =
      'ForumPublicReadError';

    this.reason =
      reason;
  }
}

export function isResolvedForumSite(
  result,
) {
  const candidates =
    [
      result?.summary?.templateId,
      result?.summary?.template_id,
      result?.summary?.template?.id,
      result?.data?.templateId,
      result?.data?.template_id,
      result?.data?.template?.id,
      result?.data?.site?.templateId,
      result?.data?.site?.template_id,
    ];

  return candidates.some(
    (candidate) =>
      String(
        candidate ??
          '',
      )
        .trim()
        .toLowerCase() ===
      'forum',
  );
}

export function createForumPublicReader({
  gateway =
    null,

  sitePublicationClient =
    null,

  relationClient =
    null,
} =
  {}) {
  const siteClient =
    sitePublicationClient ||
    (
      gateway
        ? createSitePublicationAdapter(
            gateway,
          )
        : null
    );

  const comments =
    relationClient ||
    (
      gateway
        ? createPublicationRelationAdapter(
            gateway,
          )
        : null
    );

  if (
    siteClient?.listSitePublications ===
      undefined ||
    comments?.listPublicationRelations ===
      undefined
  ) {
    throw new ForumPublicReadError(
      'Forum public reader requires Site-publication and publication-relation clients.',
      'forum_read_clients_required',
    );
  }

  return Object.freeze({
    async loadPage({
      siteCrabUrl,
      cursor =
        null,

      limit =
        FORUM_ROOT_READ_LIMIT,
    } =
    {}) {
      const site =
        normalizeSite(
          siteCrabUrl,
        );

      const rootPage =
        await siteClient
          .listSitePublications({
            siteCrabUrl:
              site,

            cursor,

            limit,
          });

      const projectedRoots =
        mapSitePublicationPageToForumThreads(
          rootPage,
          {
            siteCrabUrl:
              site,
          },
        );

      const records =
        [];

      for (
        const thread
        of projectedRoots.items
      ) {
        const record =
          await hydrateThread({
            thread,

            relationClient:
              comments,
          });

        records.push(
          record,
        );
      }

      return buildForumPage({
        siteCrabUrl:
          site,

        records,

        nextCursor:
          projectedRoots.nextCursor,

        hasMore:
          projectedRoots.hasMore,
      });
    },
  });
}

export function mergeForumReadPages(
  current,
  next,
) {
  if (
    current ===
      null ||
    current ===
      undefined
  ) {
    return next;
  }

  if (
    current.siteCrabUrl !==
      next.siteCrabUrl
  ) {
    throw new ForumPublicReadError(
      'Forum read pages must belong to the same Site.',
      'forum_page_site_mismatch',
    );
  }

  const byThread =
    new Map();

  for (
    const record
    of [
      ...current.records,
      ...next.records,
    ]
  ) {
    byThread.set(
      record.thread.postCrabUrl,
      record,
    );
  }

  return buildForumPage({
    siteCrabUrl:
      current.siteCrabUrl,

    records:
      [
        ...byThread.values(),
      ],

    nextCursor:
      next.nextCursor,

    hasMore:
      next.hasMore,
  });
}

async function hydrateThread({
  thread,
  relationClient,
}) {
  const replies =
    await loadReplyTree({
      relationClient,

      siteCrabUrl:
        thread.siteCrabUrl,

      threadCrabUrl:
        thread.postCrabUrl,
    });

  const settings =
    settingsFromThreads(
      [
        thread,
      ],
    );

  const preliminary =
    projectForumThreadDetail({
      thread,

      replies,

      settings,

      page:
        1,
    });

  const hydratedThread =
    deepFreeze({
      ...thread,

      replyCount:
        preliminary.replies
          .totalItems,

      replyCountKnown:
        true,

      latestActivityAt:
        preliminary
          .latestActivityAt,

      latestActivitySource:
        replies.length >
          0
          ? 'publication_relations'
          : 'site_publication_created_at_ms',
    });

  const detail =
    projectForumThreadDetail({
      thread:
        hydratedThread,

      replies,

      settings,

      page:
        1,
    });

  return deepFreeze({
    thread:
      hydratedThread,

    replies,

    detail,

    relationTraversal:
      deepFreeze({
        complete:
          true,

        boundedReplyLimit:
          FORUM_REPLY_READ_LIMIT,

        boundedRequestLimit:
          FORUM_RELATION_REQUEST_LIMIT,
      }),
  });
}

async function loadReplyTree({
  relationClient,
  siteCrabUrl,
  threadCrabUrl,
}) {
  const queue =
    [
      threadCrabUrl,
    ];

  const visitedParents =
    new Set();

  const repliesByUrl =
    new Map();

  let requestCount =
    0;

  while (
    queue.length >
      0
  ) {
    if (
      repliesByUrl.size >=
        FORUM_REPLY_READ_LIMIT
    ) {
      throw new ForumPublicReadError(
        'Forum reply traversal reached the reviewed 100-reply beta bound.',
        'forum_reply_bound_exceeded',
      );
    }

    if (
      requestCount >=
        FORUM_RELATION_REQUEST_LIMIT
    ) {
      throw new ForumPublicReadError(
        'Forum reply traversal reached the reviewed request bound.',
        'forum_relation_request_bound_exceeded',
      );
    }

    const parent =
      queue.shift();

    if (
      visitedParents.has(
        parent,
      )
    ) {
      continue;
    }

    visitedParents.add(
      parent,
    );

    let cursor =
      null;

    let parentComplete =
      false;

    while (
      parentComplete ===
        false
    ) {
      if (
        requestCount >=
          FORUM_RELATION_REQUEST_LIMIT
      ) {
        throw new ForumPublicReadError(
          'Forum reply traversal reached the reviewed request bound.',
          'forum_relation_request_bound_exceeded',
        );
      }

      requestCount +=
        1;

      const rawPage =
        await relationClient
          .listPublicationRelations({
            parentCrabUrl:
              parent,

            cursor,

            limit:
              FORUM_REPLY_READ_LIMIT,
          });

      const mapped =
        mapPublicationRelationPageToForumReplies(
          rawPage,
          {
            siteCrabUrl,

            threadCrabUrl,
          },
        );

      for (
        const reply
        of mapped.replies
      ) {
        if (
          repliesByUrl.has(
            reply.crabUrl,
          )
        ) {
          continue;
        }

        if (
          repliesByUrl.size >=
            FORUM_REPLY_READ_LIMIT
        ) {
          throw new ForumPublicReadError(
            'Forum reply traversal reached the reviewed 100-reply beta bound.',
            'forum_reply_bound_exceeded',
          );
        }

        repliesByUrl.set(
          reply.crabUrl,
          reply,
        );

        queue.push(
          reply.crabUrl,
        );
      }

      if (
        mapped.page.hasMore ===
          true
      ) {
        cursor =
          mapped.page.nextCursor;
      } else {
        parentComplete =
          true;
      }
    }
  }

  return deepFreeze(
    [
      ...repliesByUrl
        .values(),
    ],
  );
}

function buildForumPage({
  siteCrabUrl,
  records,
  nextCursor,
  hasMore,
}) {
  const threads =
    records.map(
      (record) =>
        record.thread,
    );

  const settings =
    settingsFromThreads(
      threads,
    );

  const projection =
    projectForumThreadList({
      threads,

      settings,

      category:
        'all',

      page:
        1,
    });

  return deepFreeze({
    source:
      FORUM_PUBLIC_READ_SOURCE,

    siteCrabUrl,

    records,

    threads,

    settings,

    projection,

    nextCursor:
      nextCursor ||
      null,

    hasMore:
      hasMore ===
        true,

    truth:
      deepFreeze({
        rootSource:
          'site_publication_v1',

        replySource:
          'publication_relation_v1',

        categorySource:
          'forum_category_tag',

        activitySource:
          'max_root_or_complete_relation_reply',

        replyCountExactForLoadedThreads:
          true,

        creatorIdentityInvented:
          false,

        stickyOrLockedInvented:
          false,
      }),
  });
}

function settingsFromThreads(
  threads,
) {
  const categories =
    [];

  const seen =
    new Set();

  for (
    const thread
    of threads
  ) {
    const category =
      String(
        thread?.category ??
          '',
      ).trim();

    if (
      category ===
        '' ||
      seen.has(
        category,
      )
    ) {
      continue;
    }

    seen.add(
      category,
    );

    categories.push({
      id:
        category,

      label:
        category
          .split(
            /[_-]/u,
          )
          .filter(
            Boolean,
          )
          .map(
            (part) =>
              part.slice(
                0,
                1,
              )
                .toUpperCase() +
              part.slice(
                1,
              ),
          )
          .join(
            ' ',
          ),
    });
  }

  if (
    categories.length ===
      0
  ) {
    categories.push({
      id:
        'general',

      label:
        'General',
    });
  }

  if (
    categories.length >
      12
  ) {
    throw new ForumPublicReadError(
      'Forum backend category set exceeds the reviewed twelve-category bound.',
      'forum_category_bound_exceeded',
    );
  }

  return deepFreeze({
    categories,

    pageSize:
      50,

    replyPageSize:
      100,
  });
}

function normalizeSite(
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
    SITE_PATTERN.test(
      value,
    ) ===
      false
  ) {
    throw new ForumPublicReadError(
      'Forum public read requires a canonical named Site URL.',
      'invalid_forum_site',
    );
  }

  return value;
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
