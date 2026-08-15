import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IMAGEBOARD_RELATION_CONTENT_SOURCE,
  IMAGEBOARD_RELATION_READ_SOURCE,
  ImageboardRelationReadError,
  mapPublicationRelationPageToImageboardReplies,
} from './imageboardRelationReadModel.js';

import {
  projectImageboardThreadDetail,
} from './imageboardModel.js';

const SITE =
  'crab://picture-board';

const IMAGE =
  `crab://${'1'.repeat(64)}.image`;

const COMMENT_A =
  `crab://${'a'.repeat(64)}.comment`;

const COMMENT_B =
  `crab://${'b'.repeat(64)}.comment`;

const COMMENT_C =
  `crab://${'c'.repeat(64)}.comment`;

function relation({
  crabUrl =
    COMMENT_A,

  parentCrabUrl =
    IMAGE,

  threadCrabUrl =
    IMAGE,

  siteCrabUrl =
    SITE,

  summary =
    'Durable reply preview',

  creatorDisplay =
    '@alice',

  createdAtMs =
    1_700_000_000_000,

  visibility =
    'public_preview',

  kind =
    'comment',
} = {}) {
  return {
    schema:
      'crablink.publication-relation.v1',

    publication: {
      publicationId:
        crabUrl
          .slice(
            'crab://'.length,
          )
          .split(
            '.',
          )[0],

      kind,

      crabUrl,

      title:
        'Comment',

      summary,

      creatorDisplay,

      createdAtMs,

      visibility,

      references: {
        manifestCid:
          `b3:${'d'.repeat(64)}`,

        contentCid:
          `b3:${'e'.repeat(64)}`,

        siteUrl:
          SITE,
      },
    },

    parentCrabUrl,

    threadCrabUrl,

    siteCrabUrl,
  };
}

function page(
  items,
  {
    hasMore =
      false,

    nextCursor =
      null,
  } = {},
) {
  return {
    schema:
      'crablink.publication-relation-page.v1',

    items,

    hasMore,

    nextCursor,
  };
}

function threadFixture() {
  return {
    schema:
      'crablink.imageboard-thread.v1',

    modelVersion:
      'crablink.imageboard.v1',

    siteCrabUrl:
      SITE,

    imageCrabUrl:
      IMAGE,

    title:
      'Durable thread',

    summary:
      '',

    category:
      'general',

    creator:
      null,

    publishedAt:
      '2026-08-11T00:00:00.000Z',

    updatedAt:
      '2026-08-11T00:00:00.000Z',

    visibility:
      'public',

    moderationState:
      'visible',

    contentWarning:
      null,

    access:
      null,

    replyCount:
      0,

    thumbnail: {
      cid:
        `b3:${'2'.repeat(64)}`,

      alt:
        'Thread image',
    },

    b3: {
      expectedContentCid:
        `b3:${'3'.repeat(64)}`,

      expectedThumbnailCid:
        `b3:${'2'.repeat(64)}`,
    },
  };
}

test(
  'phase14a6e2 maps durable public preview relation truth without inventing creator identity',
  () => {
    const result =
      mapPublicationRelationPageToImageboardReplies(
        page([
          relation(),
        ]),
      );

    assert.equal(
      result.source,
      IMAGEBOARD_RELATION_READ_SOURCE,
    );

    assert.equal(
      result.contentSource,
      IMAGEBOARD_RELATION_CONTENT_SOURCE,
    );

    assert.equal(
      result.replies.length,
      1,
    );

    const reply =
      result.replies[0];

    assert.equal(
      reply.crabUrl,
      COMMENT_A,
    );

    assert.equal(
      reply.parentCrabUrl,
      IMAGE,
    );

    assert.equal(
      reply.threadCrabUrl,
      IMAGE,
    );

    assert.equal(
      reply.siteCrabUrl,
      SITE,
    );

    assert.equal(
      reply.body,
      'Durable reply preview',
    );

    assert.equal(
      reply.visibility,
      'public',
    );

    assert.equal(
      reply.createdAt,
      new Date(
        1_700_000_000_000,
      ).toISOString(),
    );

    assert.deepEqual(
      reply.creator,
      {
        username:
          '',

        displayName:
          '@alice',

        profileUrl:
          '',
      },
    );

    assert.equal(
      reply.contentWarning,
      null,
    );

    assert.deepEqual(
      reply.b3,
      {
        expectedContentCid:
          `b3:${'e'.repeat(64)}`,

        expectedContentCidSource:
          'publication_relation_v1',

        contentVerified:
          false,

        resolvedContentCid:
          null,
      },
    );

    assert.equal(
      Object.isFrozen(
        reply.b3,
      ),
      true,
    );
  },
);

test(
  'phase14a6e2 preserves nested Comment parents and durable moderation states',
  () => {
    const result =
      mapPublicationRelationPageToImageboardReplies(
        page([
          relation({
            crabUrl:
              COMMENT_A,

            createdAtMs:
              1_700_000_000_100,

            visibility:
              'public',
          }),

          relation({
            crabUrl:
              COMMENT_B,

            parentCrabUrl:
              COMMENT_A,

            createdAtMs:
              1_700_000_000_200,

            visibility:
              'moderated',
          }),
        ]),
      );

    assert.equal(
      result.replies.length,
      2,
    );

    assert.equal(
      result.replies[1]
        .parentCrabUrl,
      COMMENT_A,
    );

    assert.equal(
      result.replies[1]
        .visibility,
      'moderated',
    );
  },
);

test(
  'phase14a6e2 private and unlisted relations fail closed out of the projected reply list',
  () => {
    const result =
      mapPublicationRelationPageToImageboardReplies(
        page([
          relation({
            crabUrl:
              COMMENT_A,

            visibility:
              'public',
          }),

          relation({
            crabUrl:
              COMMENT_B,

            visibility:
              'private',
          }),

          relation({
            crabUrl:
              COMMENT_C,

            visibility:
              'unlisted',
          }),
        ]),
      );

    assert.deepEqual(
      result.replies.map(
        (reply) =>
          reply.crabUrl,
      ),
      [
        COMMENT_A,
      ],
    );

    assert.equal(
      result.page.receivedItems,
      3,
    );

    assert.equal(
      result.page.projectedItems,
      1,
    );

    assert.equal(
      result.page.omittedPrivate,
      2,
    );
  },
);

test(
  'phase14a6e2 preserves opaque backend pagination metadata',
  () => {
    const result =
      mapPublicationRelationPageToImageboardReplies(
        page(
          [
            relation(),
          ],
          {
            hasMore:
              true,

            nextCursor:
              'r_89abcdef',
          },
        ),
      );

    assert.equal(
      result.page.hasMore,
      true,
    );

    assert.equal(
      result.page.nextCursor,
      'r_89abcdef',
    );

    assert.equal(
      Object.isFrozen(
        result,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.replies,
      ),
      true,
    );
  },
);

test(
  'phase14a6e2 rejects malformed durable relation truth before Imageboard projection',
  () => {
    const invalidPages =
      [
        {
          schema:
            'wrong.schema',

          items:
            [],

          hasMore:
            false,

          nextCursor:
            null,
        },

        page([
          relation({
            kind:
              'post',
          }),
        ]),

        page([
          relation({
            threadCrabUrl:
              COMMENT_A,
          }),
        ]),

        page([
          relation({
            siteCrabUrl:
              '',
          }),
        ]),

        page(
          [
            relation(),
          ],
          {
            hasMore:
              true,

            nextCursor:
              null,
          },
        ),

        page([
          relation({
            createdAtMs:
              0,
          }),
        ]),
      ];

    for (
      const candidate
      of invalidPages
    ) {
      assert.throws(
        () =>
          mapPublicationRelationPageToImageboardReplies(
            candidate,
          ),

        ImageboardRelationReadError,
      );
    }
  },
);

test(
  'phase14a6e2 mapped relations feed the existing Imageboard ordering and moderation projector',
  () => {
    const mapped =
      mapPublicationRelationPageToImageboardReplies(
        page([
          relation({
            crabUrl:
              COMMENT_B,

            summary:
              'Second reply',

            createdAtMs:
              1_700_000_000_200,

            visibility:
              'moderated',
          }),

          relation({
            crabUrl:
              COMMENT_A,

            summary:
              'First reply',

            createdAtMs:
              1_700_000_000_100,

            visibility:
              'public',
          }),
        ]),
      );

    const detail =
      projectImageboardThreadDetail({
        thread:
          threadFixture(),

        replies:
          mapped.replies,

        settings: {
          replyPageSize:
            50,
        },
      });

    assert.equal(
      detail.replies.totalItems,
      2,
    );

    assert.equal(
      detail.replies.items[0]
        .crabUrl,
      COMMENT_A,
    );

    assert.equal(
      detail.replies.items[0]
        .body,
      'First reply',
    );

    assert.equal(
      detail.replies.items[1]
        .crabUrl,
      COMMENT_B,
    );

    assert.equal(
      detail.replies.items[1]
        .moderationState,
      'moderated',
    );

    assert.equal(
      detail.replies.items[1]
        .body,
      '',
    );

    assert.equal(
      detail.replies.items[1]
        .creator,
      null,
    );
  },
);

test(
  'phase14a6f3 rejects missing malformed or noncanonical relation content cid evidence',
  () => {
    const invalidContentCids =
      [
        null,
        '',
        'b3:abc',
        `b3:${'A'.repeat(64)}`,
        `${'e'.repeat(64)}`,
      ];

    for (
      const contentCid
      of invalidContentCids
    ) {
      const candidate =
        relation();

      candidate
        .publication
        .references
        .contentCid =
          contentCid;

      assert.throws(
        () =>
          mapPublicationRelationPageToImageboardReplies(
            page([
              candidate,
            ]),
          ),

        (
          error,
        ) => {
          assert.equal(
            error instanceof
              ImageboardRelationReadError,
            true,
          );

          assert.equal(
            error.reason,
            'invalid_relation_content_cid',
          );

          return true;
        },
      );
    }

    const missing =
      relation();

    delete missing
      .publication
      .references
      .contentCid;

    assert.throws(
      () =>
        mapPublicationRelationPageToImageboardReplies(
          page([
            missing,
          ]),
        ),

      (
        error,
      ) => {
        assert.equal(
          error instanceof
            ImageboardRelationReadError,
          true,
        );

        assert.equal(
          error.reason,
          'invalid_relation_content_cid',
        );

        return true;
      },
    );
  },
);

