import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createForumPublicReader,
} from './forumPublicRead.js';

const SITE =
  'crab://rusty-forum';

const POST =
  `crab://${'a'.repeat(
    64,
  )}.post`;

const COMMENT_A =
  `crab://${'b'.repeat(
    64,
  )}.comment`;

const COMMENT_B =
  `crab://${'c'.repeat(
    64,
  )}.comment`;

function relation(
  {
    crabUrl,
    parentCrabUrl,
    createdAtMs,
    visibility =
      'public',
  },
) {
  return {
    schema:
      'crablink.publication-relation.v1',

    publication: {
      publicationId:
        crabUrl,

      kind:
        'comment',

      crabUrl,

      title:
        'Comment',

      summary:
        `Reply ${crabUrl.slice(
          -12,
        )}`,

      creatorDisplay:
        '@alice',

      createdAtMs,

      visibility,

      references: {
        manifestCid:
          `b3:${'d'.repeat(
            64,
          )}`,

        contentCid:
          `b3:${'e'.repeat(
            64,
          )}`,

        siteUrl:
          SITE,
      },
    },

    parentCrabUrl,

    threadCrabUrl:
      POST,

    siteCrabUrl:
      SITE,
  };
}

const rootPage =
  {
    schema:
      'crablink.site-publication-page.v1',

    items: [
      {
        schema:
          'crablink.site-publication.v1',

        publicationId:
          'thread-a',

        kind:
          'post',

        crabUrl:
          POST,

        title:
          'Forum thread',

        summary:
          'Durable root',

        creatorDisplay:
          '@root',

        createdAtMs:
          1_700_000_000_000,

        visibility:
          'public',

        references: {
          manifestCid:
            `b3:${'f'.repeat(
              64,
            )}`,

          contentCid:
            `b3:${'1'.repeat(
              64,
            )}`,

          siteUrl:
            SITE,
        },

        tags: [
          'forum',
          'forum-category:development',
        ],

        siteCrabUrl:
          SITE,
      },
    ],

    nextCursor:
      null,

    hasMore:
      false,
  };

test(
  'phase15 Forum reader recursively hydrates Post to Comment to Comment and derives exact activity',
  async () => {
    const calls =
      [];

    const reader =
      createForumPublicReader({
        sitePublicationClient: {
          async listSitePublications() {
            return rootPage;
          },
        },

        relationClient: {
          async listPublicationRelations(
            request,
          ) {
            calls.push(
              request.parentCrabUrl,
            );

            if (
              request.parentCrabUrl ===
                POST
            ) {
              return {
                schema:
                  'crablink.publication-relation-page.v1',

                items: [
                  relation({
                    crabUrl:
                      COMMENT_A,

                    parentCrabUrl:
                      POST,

                    createdAtMs:
                      1_700_000_100_000,
                  }),
                ],

                hasMore:
                  false,

                nextCursor:
                  null,
              };
            }

            if (
              request.parentCrabUrl ===
                COMMENT_A
            ) {
              return {
                schema:
                  'crablink.publication-relation-page.v1',

                items: [
                  relation({
                    crabUrl:
                      COMMENT_B,

                    parentCrabUrl:
                      COMMENT_A,

                    createdAtMs:
                      1_700_000_200_000,
                  }),
                ],

                hasMore:
                  false,

                nextCursor:
                  null,
              };
            }

            return {
              schema:
                'crablink.publication-relation-page.v1',

              items:
                [],

              hasMore:
                false,

              nextCursor:
                null,
            };
          },
        },
      });

    const result =
      await reader.loadPage({
        siteCrabUrl:
          SITE,
      });

    assert.equal(
      result.records.length,
      1,
    );

    assert.equal(
      result.records[0]
        .replies.length,
      2,
    );

    assert.equal(
      result.records[0]
        .thread
        .replyCount,
      2,
    );

    assert.equal(
      result.records[0]
        .thread
        .replyCountKnown,
      true,
    );

    assert.equal(
      result.records[0]
        .thread
        .latestActivityAt,
      new Date(
        1_700_000_200_000,
      ).toISOString(),
    );

    assert.deepEqual(
      result.records[0]
        .detail
        .replies
        .items
        .map(
          (reply) =>
            reply.crabUrl,
        ),
      [
        COMMENT_A,
        COMMENT_B,
      ],
    );

    assert.equal(
      result.records[0]
        .replies[0]
        .creator
        .identityVerified,
      false,
    );

    assert.equal(
      result.truth
        .creatorIdentityInvented,
      false,
    );

    assert.equal(
      calls.includes(
        POST,
      ),
      true,
    );

    assert.equal(
      calls.includes(
        COMMENT_A,
      ),
      true,
    );

    assert.equal(
      calls.includes(
        COMMENT_B,
      ),
      true,
    );
  },
);

test(
  'phase15 Forum reader omits private relation truth instead of exposing it',
  async () => {
    const reader =
      createForumPublicReader({
        sitePublicationClient: {
          async listSitePublications() {
            return rootPage;
          },
        },

        relationClient: {
          async listPublicationRelations(
            request,
          ) {
            if (
              request.parentCrabUrl ===
                POST
            ) {
              return {
                schema:
                  'crablink.publication-relation-page.v1',

                items: [
                  relation({
                    crabUrl:
                      COMMENT_A,

                    parentCrabUrl:
                      POST,

                    createdAtMs:
                      1_700_000_100_000,

                    visibility:
                      'private',
                  }),
                ],

                hasMore:
                  false,

                nextCursor:
                  null,
              };
            }

            return {
              schema:
                'crablink.publication-relation-page.v1',

              items:
                [],

              hasMore:
                false,

              nextCursor:
                null,
            };
          },
        },
      });

    const result =
      await reader.loadPage({
        siteCrabUrl:
          SITE,
      });

    assert.equal(
      result.records[0]
        .replies.length,
      0,
    );

    assert.equal(
      result.records[0]
        .thread
        .replyCount,
      0,
    );

    assert.equal(
      result.records[0]
        .thread
        .latestActivitySource,
      'site_publication_created_at_ms',
    );
  },
);

test(
  'phase15 Forum reader rejects relation thread drift',
  async () => {
    const reader =
      createForumPublicReader({
        sitePublicationClient: {
          async listSitePublications() {
            return rootPage;
          },
        },

        relationClient: {
          async listPublicationRelations() {
            return {
              schema:
                'crablink.publication-relation-page.v1',

              items: [
                {
                  ...relation({
                    crabUrl:
                      COMMENT_A,

                    parentCrabUrl:
                      POST,

                    createdAtMs:
                      1_700_000_100_000,
                  }),

                  threadCrabUrl:
                    `crab://${'9'.repeat(
                      64,
                    )}.post`,
                },
              ],

              hasMore:
                false,

              nextCursor:
                null,
            };
          },
        },
      });

    await assert.rejects(
      reader.loadPage({
        siteCrabUrl:
          SITE,
      }),
      (error) =>
        error.reason ===
          'relation_thread_mismatch',
    );
  },
);
