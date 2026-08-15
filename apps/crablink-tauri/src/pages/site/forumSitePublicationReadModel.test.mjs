import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readFile,
} from 'node:fs/promises';

import {
  mapSitePublicationPageToForumThreads,
} from './forumSitePublicationReadModel.js';

import {
  projectForumThreadList,
} from './forumModel.js';

const SITE =
  'crab://rusty-forum';

const CONTENT =
  `b3:${'c'.repeat(
    64,
  )}`;

function publication({
  hash =
    'a',

  publicationId =
    'thread-a',

  kind =
    'post',

  tags =
    [
      'forum',
      'forum-category:general',
    ],

  siteCrabUrl =
    SITE,

  referenceSite =
    siteCrabUrl,

  visibility =
    'public',

  createdAtMs =
    1_700_000_000_000,

  creatorDisplay =
    '@alice',
} =
  {}) {
  return {
    schema:
      'crablink.site-publication.v1',

    publicationId,

    kind,

    crabUrl:
      `crab://${hash.repeat(
        64,
      )}.${kind}`,

    title:
      `Thread ${publicationId}`,

    summary:
      'Durable Forum root.',

    creatorDisplay,

    createdAtMs,

    visibility,

    references: {
      manifestCid:
        `b3:${'b'.repeat(
          64,
        )}`,

      contentCid:
        CONTENT,

      siteUrl:
        referenceSite,
    },

    tags,

    siteCrabUrl,
  };
}

function page(
  items,
  {
    nextCursor =
      null,

    hasMore =
      false,
  } =
    {},
) {
  return {
    schema:
      'crablink.site-publication-page.v1',

    items,

    nextCursor,

    hasMore,
  };
}

test(
  'phase15a4a2c3 Forum projection selects only Post roots carrying exact Forum taxonomy',
  () => {
    const result =
      mapSitePublicationPageToForumThreads(
        page([
          publication(),
          publication({
            hash:
              'd',

            publicationId:
              'image-root',

            kind:
              'image',
          }),
          publication({
            hash:
              'e',

            publicationId:
              'ordinary-post',

            tags: [
              'news',
            ],
          }),
        ]),
        {
          siteCrabUrl:
            SITE,
        },
      );

    assert.equal(
      result.items.length,
      1,
    );

    const thread =
      result.items[0];

    assert.equal(
      thread.schema,
      'crablink.forum-thread.v1',
    );

    assert.equal(
      thread.category,
      'general',
    );

    assert.equal(
      thread.postCrabUrl,
      `crab://${'a'.repeat(
        64,
      )}.post`,
    );

    assert.equal(
      thread.creator,
      null,
    );

    assert.equal(
      thread.creatorDisplay,
      '@alice',
    );

    assert.equal(
      thread.creatorIdentityVerified,
      false,
    );

    assert.equal(
      thread.replyCountKnown,
      false,
    );

    assert.equal(
      thread.sticky,
      false,
    );

    assert.equal(
      thread.locked,
      false,
    );

    assert.equal(
      thread.policyStateSource,
      'none',
    );

    assert.equal(
      thread.b3
        .expectedContentCid,
      CONTENT,
    );
  },
);

test(
  'phase15a4a2c3 Forum category comes only from exactly one safe backend category tag',
  () => {
    assert.throws(
      () =>
        mapSitePublicationPageToForumThreads(
          page([
            publication({
              tags: [
                'forum',
              ],
            }),
          ]),
          {
            siteCrabUrl:
              SITE,
          },
        ),
      (error) =>
        error.reason ===
          'forum_category_tag_required',
    );

    assert.throws(
      () =>
        mapSitePublicationPageToForumThreads(
          page([
            publication({
              tags: [
                'forum',
                'forum-category:general',
                'forum-category:development',
              ],
            }),
          ]),
          {
            siteCrabUrl:
              SITE,
          },
        ),
      (error) =>
        error.reason ===
          'forum_category_tag_required',
    );

    assert.throws(
      () =>
        mapSitePublicationPageToForumThreads(
          page([
            publication({
              tags: [
                'forum',
                'forum-category:General Discussion',
              ],
            }),
          ]),
          {
            siteCrabUrl:
              SITE,
          },
        ),
      (error) =>
        error.reason ===
          'invalid_forum_category_tag',
    );
  },
);

test(
  'phase15a4a2c3 Forum projection uses backend createdAtMs and preserves moderation placeholders',
  () => {
    const result =
      mapSitePublicationPageToForumThreads(
        page([
          publication({
            hash:
              '1',

            publicationId:
              'public',

            visibility:
              'public',
          }),

          publication({
            hash:
              '2',

            publicationId:
              'deleted',

            visibility:
              'deleted',
          }),

          publication({
            hash:
              '3',

            publicationId:
              'blocked',

            visibility:
              'blocked',
          }),

          publication({
            hash:
              '4',

            publicationId:
              'moderated',

            visibility:
              'moderated',
          }),

          publication({
            hash:
              '5',

            publicationId:
              'private',

            visibility:
              'private',
          }),

          publication({
            hash:
              '6',

            publicationId:
              'unlisted',

            visibility:
              'unlisted',
          }),
        ]),
        {
          siteCrabUrl:
            SITE,
        },
      );

    assert.equal(
      result.items.length,
      4,
    );

    assert.equal(
      result.items[0]
        .publishedAt,
      new Date(
        1_700_000_000_000,
      ).toISOString(),
    );

    assert.equal(
      result.items[0]
        .latestActivitySource,
      'site_publication_created_at_ms',
    );

    assert.deepEqual(
      result.items.map(
        (item) =>
          item.moderationState,
      ),
      [
        'visible',
        'deleted',
        'blocked',
        'moderated',
      ],
    );

    const projected =
      projectForumThreadList(
        {
          threads:
            result.items,

          settings: {
            categories: [
              {
                id:
                  'general',

                label:
                  'General',
              },
            ],

            pageSize:
              10,
          },
        },
      );

    assert.equal(
      projected.items.length,
      4,
    );

    assert.equal(
      projected.items
        .find(
          (item) =>
            item.moderationState ===
              'deleted',
        )
        .title,
      'Deleted thread',
    );
  },
);

test(
  'phase15a4a2c3 Forum root projection rejects cross-Site truth and missing content evidence',
  () => {
    assert.throws(
      () =>
        mapSitePublicationPageToForumThreads(
          page([
            publication({
              siteCrabUrl:
                'crab://other-forum',

              referenceSite:
                'crab://other-forum',
            }),
          ]),
          {
            siteCrabUrl:
              SITE,
          },
        ),
      (error) =>
        error.reason ===
          'forum_site_context_mismatch',
    );

    const missingContent =
      publication();

    missingContent.references
      .contentCid =
        null;

    assert.throws(
      () =>
        mapSitePublicationPageToForumThreads(
          page([
            missingContent,
          ]),
          {
            siteCrabUrl:
              SITE,
          },
        ),
      (error) =>
        error.reason ===
          'forum_content_cid_required',
    );
  },
);

test(
  'phase15a4a2c3 Forum durable root model contains no local category activity or sticky authority source',
  async () => {
    const source =
      await readFile(
        new URL(
          './forumSitePublicationReadModel.js',
          import.meta.url,
        ),
        'utf8',
      );

    for (
      const required
      of [
        'forum-category:',
        'site_publication_created_at_ms',
        "policyStateSource:",
        "'none'",
        'creatorIdentityVerified:',
        'false',
        'replyCountKnown:',
      ]
    ) {
      assert.equal(
        source.includes(
          required,
        ),
        true,
        `missing Forum durable-root boundary: ${required}`,
      );
    }

    for (
      const forbidden
      of [
        'sessionStorage',
        'localStorage',
        'PublicationSummaryV1.pinned',
        'sticky: true',
        'locked: true',
        "category: 'general'",
        'Date.now(',
      ]
    ) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
        `forbidden Forum root authority source: ${forbidden}`,
      );
    }
  },
);
