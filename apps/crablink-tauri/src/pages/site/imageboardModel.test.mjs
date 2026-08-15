import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IMAGEBOARD_MAX_CATEGORIES,
  IMAGEBOARD_MODEL_VERSION,
  IMAGEBOARD_MODERATION_STATES,
  ImageboardModelError,
  createImageboardReply,
  createImageboardThreadFromPublication,
  normalizeImageboardSettings,
  projectImageboardGrid,
  projectImageboardThreadDetail,
  verifyImageboardB3,
} from './imageboardModel.js';

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
  'crab://picture-board';

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
          'art',

        label:
          'Art',
      },
      {
        id:
          'photography',

        label:
          'Photography',
      },
    ],

    pageSize:
      2,

    replyPageSize:
      2,
  });

function imageSummary({
  hash = HASH_A,
  thumbnailHash = HASH_B,
  contentHash = HASH_C,
  title = 'Image thread',
  publishedAt = '2026-08-11T12:00:00.000Z',
  visibility = 'public',
  siteUrl = SITE,
  kind = 'image',
} = {}) {
  return {
    schema:
      'crablink.publication-summary.v1',

    publicationId:
      `image-${hash.slice(0, 8)}`,

    kind,

    crabUrl:
      `crab://${hash}.${kind}`,

    title,

    summary:
      'A safe Imageboard thread summary.',

    creator: {
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

    updatedAt:
      publishedAt,

    visibility,

    access:
      'free',

    thumbnail: {
      kind:
        'image',

      cid:
        `b3:${thumbnailHash}`,

      alt:
        'Imageboard thumbnail',
    },

    references: {
      manifestCid:
        `b3:${HASH_D}`,

      contentCid:
        `b3:${contentHash}`,

      siteUrl,
    },

    pinned:
      false,
  };
}

function thread(
  overrides = {},
) {
  return createImageboardThreadFromPublication(
    imageSummary(
      overrides.summary,
    ),
    {
      settings:
        SETTINGS,

      siteCrabUrl:
        SITE,

      category:
        overrides.category ??
        'general',

      contentWarning:
        overrides.contentWarning,

      replyCount:
        overrides.replyCount ??
        0,
    },
  );
}

function reply({
  hash,
  root,
  createdAt,
  parentCrabUrl,
  visibility = 'public',
  body = 'Imageboard reply',
  contentWarning,
}) {
  return {
    siteCrabUrl:
      SITE,

    threadCrabUrl:
      root.imageCrabUrl,

    crabUrl:
      `crab://${hash}.comment`,

    parentCrabUrl:
      parentCrabUrl ??
      root.imageCrabUrl,

    body,

    creator: {
      username:
        'reply_user',

      displayName:
        'Reply User',

      profileUrl:
        'crab://@reply_user',
    },

    createdAt,

    visibility,

    contentWarning,
  };
}

test(
  'Phase 14A1 locks Imageboard identity and moderation states',
  () => {
    assert.equal(
      IMAGEBOARD_MODEL_VERSION,
      'crablink.imageboard.v1',
    );

    assert.deepEqual(
      IMAGEBOARD_MODERATION_STATES,
      [
        'visible',
        'content_warning',
        'deleted',
        'blocked',
        'moderated',
      ],
    );
  },
);

test(
  'Phase 14A1 board categories and page sizes remain bounded',
  () => {
    const settings =
      normalizeImageboardSettings(
        SETTINGS,
      );

    assert.deepEqual(
      settings.categories.map(
        (category) =>
          category.id,
      ),
      [
        'general',
        'art',
        'photography',
      ],
    );

    assert.equal(
      settings.pageSize,
      2,
    );

    assert.equal(
      settings.replyPageSize,
      2,
    );

    assert.throws(
      () =>
        normalizeImageboardSettings({
          categories:
            Array.from(
              {
                length:
                  IMAGEBOARD_MAX_CATEGORIES +
                  1,
              },
              (
                _value,
                index,
              ) => ({
                id:
                  `board${index}`,

                label:
                  `Board ${index}`,
              }),
            ),
        }),
      /categories exceed/,
    );
  },
);

test(
  'Phase 14A1 Image publication becomes the typed thread root',
  () => {
    const value =
      thread();

    assert.equal(
      value.imageCrabUrl,
      `crab://${HASH_A}.image`,
    );

    assert.equal(
      value.siteCrabUrl,
      SITE,
    );

    assert.equal(
      value.category,
      'general',
    );

    assert.equal(
      Object.isFrozen(
        value,
      ),
      true,
    );
  },
);

test(
  'Phase 14A1 non-Image publication cannot become an Imageboard thread',
  () => {
    assert.throws(
      () =>
        createImageboardThreadFromPublication(
          imageSummary({
            kind:
              'post',
          }),
          {
            settings:
              SETTINGS,

            siteCrabUrl:
              SITE,

            category:
              'general',
          },
        ),
      (error) => {
        assert.equal(
          error instanceof
            ImageboardModelError,
          true,
        );

        assert.equal(
          error.reason,
          'thread_root_not_image',
        );

        return true;
      },
    );
  },
);

test(
  'Phase 14A1 Image thread requires exact named Site context',
  () => {
    assert.throws(
      () =>
        createImageboardThreadFromPublication(
          imageSummary(),
          {
            settings:
              SETTINGS,

            siteCrabUrl:
              'crab://different-board',

            category:
              'general',
          },
        ),
      /does not match/,
    );
  },
);

test(
  'Phase 14A1 B3 verification succeeds only with matching resolved content evidence',
  () => {
    const value =
      thread();

    const missing =
      verifyImageboardB3(
        value,
      );

    assert.equal(
      missing.verified,
      false,
    );

    assert.equal(
      missing.reason,
      'resolved_content_cid_required',
    );

    const verified =
      verifyImageboardB3(
        value,
        {
          resolvedContentCid:
            `b3:${HASH_C}`,

          resolvedThumbnailCid:
            `b3:${HASH_B}`,
        },
      );

    assert.equal(
      verified.verified,
      true,
    );

    assert.equal(
      verified.contentVerified,
      true,
    );

    assert.equal(
      verified.thumbnailVerified,
      true,
    );
  },
);

test(
  'Phase 14A1 B3 mismatch fails closed',
  () => {
    const value =
      thread();

    const mismatch =
      verifyImageboardB3(
        value,
        {
          resolvedContentCid:
            `b3:${HASH_D}`,
        },
      );

    assert.equal(
      mismatch.verified,
      false,
    );

    assert.equal(
      mismatch.reason,
      'content_cid_mismatch',
    );
  },
);

test(
  'Phase 14A1 thumbnail grid is newest first and category-filterable',
  () => {
    const older =
      thread({
        category:
          'general',

        summary: {
          hash:
            HASH_A,

          publishedAt:
            '2026-08-10T12:00:00.000Z',
        },
      });

    const newer =
      thread({
        category:
          'art',

        summary: {
          hash:
            HASH_B,

          thumbnailHash:
            HASH_C,

          contentHash:
            HASH_D,

          publishedAt:
            '2026-08-11T12:00:00.000Z',
        },
      });

    const all =
      projectImageboardGrid({
        threads: [
          older,
          newer,
        ],

        settings:
          SETTINGS,
      });

    assert.deepEqual(
      all.items.map(
        (item) =>
          item.imageCrabUrl,
      ),
      [
        newer.imageCrabUrl,
        older.imageCrabUrl,
      ],
    );

    const art =
      projectImageboardGrid({
        threads: [
          older,
          newer,
        ],

        settings:
          SETTINGS,

        category:
          'art',
      });

    assert.deepEqual(
      art.items.map(
        (item) =>
          item.category,
      ),
      [
        'art',
      ],
    );
  },
);

test(
  'Phase 14A1 grid pagination is deterministic and bounded',
  () => {
    const values =
      [
        HASH_A,
        HASH_B,
        HASH_C,
      ].map(
        (
          hash,
          index,
        ) =>
          thread({
            summary: {
              hash,

              thumbnailHash:
                index ===
                  0
                  ? HASH_B
                  : HASH_D,

              contentHash:
                index ===
                  2
                  ? HASH_B
                  : HASH_C,

              publishedAt:
                `2026-08-${String(
                  9 +
                  index,
                ).padStart(
                  2,
                  '0',
                )}T12:00:00.000Z`,
            },
          }),
      );

    const first =
      projectImageboardGrid({
        threads:
          values,

        settings:
          SETTINGS,

        page:
          1,
      });

    assert.equal(
      first.items.length,
      2,
    );

    assert.equal(
      first.hasNext,
      true,
    );

    const second =
      projectImageboardGrid({
        threads:
          values,

        settings:
          SETTINGS,

        page:
          2,
      });

    assert.equal(
      second.items.length,
      1,
    );

    assert.equal(
      second.hasPrevious,
      true,
    );

    assert.equal(
      second.hasNext,
      false,
    );
  },
);

test(
  'Phase 14A1 content warning hides thumbnail and summary until explicit reveal',
  () => {
    const warned =
      thread({
        contentWarning:
          'Sensitive imagery',
      });

    const hidden =
      projectImageboardGrid({
        threads: [
          warned,
        ],

        settings:
          SETTINGS,
      });

    assert.equal(
      hidden.items[0]
        .moderationState,
      'content_warning',
    );

    assert.equal(
      hidden.items[0]
        .thumbnail,
      null,
    );

    assert.equal(
      hidden.items[0]
        .summary,
      '',
    );

    const revealed =
      projectImageboardGrid({
        threads: [
          warned,
        ],

        settings:
          SETTINGS,

        revealWarnings:
          true,
      });

    assert.equal(
      revealed.items[0]
        .thumbnail.cid,
      `b3:${HASH_B}`,
    );
  },
);

test(
  'Phase 14A1 deleted blocked and moderated threads project as non-image placeholders',
  () => {
    for (
      const visibility
      of [
        'deleted',
        'blocked',
        'moderated',
      ]
    ) {
      const value =
        thread({
          summary: {
            visibility,
          },
        });

      const projection =
        projectImageboardGrid({
          threads: [
            value,
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
          .thumbnail,
        null,
      );

      assert.equal(
        projection.items[0]
          .creator,
        null,
      );
    }
  },
);

test(
  'Phase 14A1 private and unlisted roots do not enter the public board projection',
  () => {
    for (
      const visibility
      of [
        'private',
        'unlisted',
      ]
    ) {
      const value =
        thread({
          summary: {
            visibility,
          },
        });

      const projection =
        projectImageboardGrid({
          threads: [
            value,
          ],

          settings:
            SETTINGS,
        });

      assert.equal(
        projection.items.length,
        0,
      );

      assert.equal(
        projection.state,
        'empty',
      );
    }
  },
);

test(
  'Phase 14A1 thread detail orders typed Comment replies oldest first',
  () => {
    const root =
      thread();

    const newer =
      reply({
        hash:
          HASH_C,

        root,

        createdAt:
          '2026-08-11T13:00:00.000Z',
      });

    const older =
      reply({
        hash:
          HASH_D,

        root,

        createdAt:
          '2026-08-11T12:00:00.000Z',
      });

    const detail =
      projectImageboardThreadDetail({
        thread:
          root,

        replies: [
          newer,
          older,
        ],

        settings:
          SETTINGS,
      });

    assert.deepEqual(
      detail.replies.items.map(
        (item) =>
          item.crabUrl,
      ),
      [
        older.crabUrl,
        newer.crabUrl,
      ],
    );
  },
);

test(
  'Phase 14A1 nested Comment reply may parent another Comment in the same image thread context',
  () => {
    const root =
      thread();

    const first =
      createImageboardReply(
        reply({
          hash:
            HASH_C,

          root,

          createdAt:
            '2026-08-11T12:00:00.000Z',
        }),
        root,
        {
          settings:
            SETTINGS,
        },
      );

    const nested =
      createImageboardReply(
        reply({
          hash:
            HASH_D,

          root,

          parentCrabUrl:
            first.crabUrl,

          createdAt:
            '2026-08-11T12:01:00.000Z',
        }),
        root,
        {
          settings:
            SETTINGS,
        },
      );

    assert.equal(
      nested.parentCrabUrl,
      first.crabUrl,
    );
  },
);

test(
  'Phase 14A1 reply with the wrong Image thread context fails closed',
  () => {
    const root =
      thread();

    assert.throws(
      () =>
        createImageboardReply(
          {
            ...reply({
              hash:
                HASH_D,

              root,

              createdAt:
                '2026-08-11T12:00:00.000Z',
            }),

            threadCrabUrl:
              `crab://${HASH_B}.image`,
          },
          root,
          {
            settings:
              SETTINGS,
          },
        ),
      /thread context does not match/,
    );
  },
);
