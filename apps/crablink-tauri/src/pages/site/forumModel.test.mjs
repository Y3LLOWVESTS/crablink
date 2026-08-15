import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FORUM_MAX_CATEGORIES,
  FORUM_MODEL_VERSION,
  ForumModelError,
  createForumReply,
  createForumThreadFromPublication,
  normalizeForumPolicyState,
  normalizeForumSettings,
  projectForumThreadDetail,
  projectForumThreadList,
} from './forumModel.js';

const HASH_A =
  'a'.repeat(
    64,
  );

const HASH_B =
  'b'.repeat(
    64,
  );

const HASH_C =
  'c'.repeat(
    64,
  );

const HASH_D =
  'd'.repeat(
    64,
  );

const SITE =
  'crab://rusty-forum';

const POST_A =
  `crab://${HASH_A}.post`;

const POST_B =
  `crab://${HASH_B}.post`;

const COMMENT_A =
  `crab://${HASH_C}.comment`;

const COMMENT_B =
  `crab://${HASH_D}.comment`;

const SETTINGS =
  Object.freeze({
    categories: [
      {
        id:
          'general',

        label:
          'General',
      },
      {
        id:
          'development',

        label:
          'Development',
      },
    ],

    pageSize:
      2,

    replyPageSize:
      2,
  });

function postSummary({
  hash =
    HASH_A,

  title =
    'Forum thread',

  publishedAt =
    '2026-08-12T18:00:00.000Z',

  updatedAt =
    publishedAt,

  visibility =
    'public',

  siteUrl =
    SITE,

  kind =
    'post',

  pinned =
    false,
} =
  {}) {
  return {
    schema:
      'crablink.publication-summary.v1',

    publicationId:
      `post-${hash.slice(
        0,
        8,
      )}`,

    kind,

    crabUrl:
      `crab://${hash}.${kind}`,

    title,

    summary:
      'A durable Forum Post summary.',

    creator:
      {
        username:
          'rusty_crab',

        displayName:
          'Rusty Crab',

        profileUrl:
          'crab://@rusty_crab',

        avatarCid:
          `b3:${HASH_D}`,
      },

    publishedAt,

    updatedAt,

    visibility,

    access:
      'free',

    thumbnail:
      null,

    references:
      {
        manifestCid:
          `b3:${HASH_D}`,

        contentCid:
          `b3:${HASH_C}`,

        siteUrl,
      },

    pinned,
  };
}

function thread({
  summary =
    {},

  category =
    'general',

  policyState =
    {},

  replyCount =
    0,

  latestActivityAt,
} =
  {}) {
  return createForumThreadFromPublication(
    postSummary(
      summary,
    ),
    {
      settings:
        SETTINGS,

      siteCrabUrl:
        SITE,

      category,

      policyState,

      replyCount,

      latestActivityAt,
    },
  );
}

function reply({
  crabUrl =
    COMMENT_A,

  parentCrabUrl =
    POST_A,

  threadCrabUrl =
    POST_A,

  siteCrabUrl =
    SITE,

  body =
    'Forum reply body.',

  createdAt =
    '2026-08-12T18:05:00.000Z',

  visibility =
    'public',
} =
  {}) {
  return createForumReply({
    siteCrabUrl,

    threadCrabUrl,

    crabUrl,

    parentCrabUrl,

    body,

    creator:
      {
        displayName:
          'Reply User',
      },

    createdAt,

    visibility,
  });
}

test(
  'phase15a1 locks Forum identity categories and bounded page sizes',
  () => {
    const settings =
      normalizeForumSettings(
        SETTINGS,
      );

    assert.equal(
      FORUM_MODEL_VERSION,
      'crablink.forum-model.v1',
    );

    assert.equal(
      FORUM_MAX_CATEGORIES,
      12,
    );

    assert.equal(
      settings.categories.length,
      2,
    );

    assert.equal(
      settings.pageSize,
      2,
    );

    assert.equal(
      settings.replyPageSize,
      2,
    );

    assert.equal(
      Object.isFrozen(
        settings,
      ),
      true,
    );
  },
);

test(
  'phase15a1 Forum thread root requires canonical Post publication and exact named Site context',
  () => {
    const created =
      thread();

    assert.equal(
      created.postCrabUrl,
      POST_A,
    );

    assert.equal(
      created.siteCrabUrl,
      SITE,
    );

    assert.throws(
      () =>
        thread({
          summary:
            {
              kind:
                'image',
            },
        }),

      (
        error,
      ) =>
        error instanceof
          ForumModelError,
    );

    assert.throws(
      () =>
        thread({
          summary:
            {
              siteUrl:
                'crab://different-forum',
            },
        }),

      (
        error,
      ) =>
        error.reason ===
          'site_context_mismatch',
    );
  },
);

test(
  'phase15a1 publication pinned metadata cannot invent Forum sticky policy truth',
  () => {
    const created =
      thread({
        summary:
          {
            pinned:
              true,
          },
      });

    assert.equal(
      created.sticky,
      false,
    );

    assert.equal(
      created.policyStateSource,
      'none',
    );
  },
);

test(
  'phase15a1 sticky and locked state require explicit reviewed policy evidence',
  () => {
    assert.throws(
      () =>
        normalizeForumPolicyState({
          sticky:
            true,
        }),

      (
        error,
      ) =>
        error.reason ===
          'policy_evidence_required',
    );

    const policy =
      normalizeForumPolicyState({
        sticky:
          true,

        locked:
          true,

        source:
          'reviewed_policy',
      });

    assert.equal(
      policy.sticky,
      true,
    );

    assert.equal(
      policy.locked,
      true,
    );
  },
);

test(
  'phase15a1 locked Forum thread is readable but cannot accept replies',
  () => {
    const created =
      thread({
        policyState:
          {
            locked:
              true,

            source:
              'reviewed_policy',
          },
      });

    assert.equal(
      created.locked,
      true,
    );

    assert.equal(
      created.canReply,
      false,
    );
  },
);

test(
  'phase15a1 thread list orders reviewed sticky threads before latest activity',
  () => {
    const oldSticky =
      thread({
        policyState:
          {
            sticky:
              true,

            source:
              'reviewed_policy',
          },

        latestActivityAt:
          '2026-08-12T17:00:00.000Z',
      });

    const newerNormal =
      thread({
        summary:
          {
            hash:
              HASH_B,
          },

        latestActivityAt:
          '2026-08-12T20:00:00.000Z',
      });

    const projection =
      projectForumThreadList({
        threads:
          [
            newerNormal,
            oldSticky,
          ],

        settings:
          SETTINGS,
      });

    assert.equal(
      projection.items[0]
        .postCrabUrl,
      POST_A,
    );

    assert.equal(
      projection.items[0]
        .sticky,
      true,
    );

    assert.equal(
      projection.ordering,
      'sticky_then_latest_activity',
    );
  },
);

test(
  'phase15a1 Forum category filtering and pagination remain deterministic and bounded',
  () => {
    const projection =
      projectForumThreadList({
        threads:
          [
            thread({
              category:
                'general',
            }),

            thread({
              summary:
                {
                  hash:
                    HASH_B,
                },

              category:
                'development',
            }),
          ],

        settings:
          {
            ...SETTINGS,

            pageSize:
              1,
          },

        category:
          'development',

        page:
          1,
      });

    assert.equal(
      projection.totalItems,
      1,
    );

    assert.equal(
      projection.items[0]
        .category,
      'development',
    );

    assert.equal(
      projection.pageSize,
      1,
    );
  },
);

test(
  'phase15a1 private and unlisted Forum roots stay out of public thread projection',
  () => {
    const projection =
      projectForumThreadList({
        threads:
          [
            thread({
              summary:
                {
                  visibility:
                    'private',
                },
            }),

            thread({
              summary:
                {
                  hash:
                    HASH_B,

                  visibility:
                    'unlisted',
                },
            }),
          ],

        settings:
          SETTINGS,
      });

    assert.equal(
      projection.totalItems,
      0,
    );
  },
);

test(
  'phase15a1 deleted blocked and moderated Forum roots become redacted placeholders',
  () => {
    for (
      const visibility
      of [
        'deleted',
        'blocked',
        'moderated',
      ]
    ) {
      const projection =
        projectForumThreadList({
          threads:
            [
              thread({
                summary:
                  {
                    visibility,
                  },
              }),
            ],

          settings:
            SETTINGS,
        });

      assert.equal(
        projection.items[0]
          .moderationState,
        visibility,
      );

      assert.equal(
        projection.items[0]
          .summary,
        '',
      );

      assert.equal(
        projection.items[0]
          .creator,
        null,
      );

      assert.equal(
        projection.items[0]
          .canOpen,
        false,
      );
    }
  },
);

test(
  'phase15a1 Forum replies reuse typed Comment roots and support nested Comment parents',
  () => {
    const direct =
      reply();

    const nested =
      reply({
        crabUrl:
          COMMENT_B,

        parentCrabUrl:
          COMMENT_A,

        createdAt:
          '2026-08-12T18:06:00.000Z',
      });

    assert.equal(
      direct.parentCrabUrl,
      POST_A,
    );

    assert.equal(
      nested.parentCrabUrl,
      COMMENT_A,
    );

    assert.equal(
      nested.threadCrabUrl,
      POST_A,
    );
  },
);

test(
  'phase15a1 Forum detail rejects reply Site or Post-thread drift',
  () => {
    const root =
      thread();

    assert.throws(
      () =>
        projectForumThreadDetail({
          thread:
            root,

          replies:
            [
              reply({
                siteCrabUrl:
                  'crab://wrong-forum',
              }),
            ],

          settings:
            SETTINGS,
        }),

      (
        error,
      ) =>
        error.reason ===
          'reply_site_mismatch',
    );

    assert.throws(
      () =>
        projectForumThreadDetail({
          thread:
            root,

          replies:
            [
              reply({
                threadCrabUrl:
                  POST_B,

                parentCrabUrl:
                  POST_B,
              }),
            ],

          settings:
            SETTINGS,
        }),

      (
        error,
      ) =>
        error.reason ===
          'reply_thread_mismatch',
    );
  },
);

test(
  'phase15a1 Forum detail orders reply chain oldest first and exposes latest activity',
  () => {
    const root =
      thread();

    const detail =
      projectForumThreadDetail({
        thread:
          root,

        replies:
          [
            reply({
              crabUrl:
                COMMENT_B,

              parentCrabUrl:
                COMMENT_A,

              createdAt:
                '2026-08-12T18:10:00.000Z',
            }),

            reply({
              createdAt:
                '2026-08-12T18:05:00.000Z',
            }),
          ],

        settings:
          SETTINGS,
      });

    assert.equal(
      detail.replies.items[0]
        .crabUrl,
      COMMENT_A,
    );

    assert.equal(
      detail.replies.items[1]
        .crabUrl,
      COMMENT_B,
    );

    assert.equal(
      detail.latestActivityAt,
      '2026-08-12T18:10:00.000Z',
    );
  },
);

test(
  'phase15a1 locked root keeps Forum detail read-only while preserving reply history',
  () => {
    const root =
      thread({
        policyState:
          {
            locked:
              true,

            source:
              'reviewed_policy',
          },
      });

    const detail =
      projectForumThreadDetail({
        thread:
          root,

        replies:
          [
            reply(),
          ],

        settings:
          SETTINGS,
      });

    assert.equal(
      detail.canReply,
      false,
    );

    assert.equal(
      detail.replies.totalItems,
      1,
    );
  },
);
