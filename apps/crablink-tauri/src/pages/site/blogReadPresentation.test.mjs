/**
 * RO:WHAT — FINAL_BETA Phase 13A5 Blog reader and closeout-focused tests.
 * RO:WHY — Proves named Blog reads use public gateway publication truth and remain chronological/scriptless.
 * RO:TEST — node --test blogReadPresentation.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  BLOG_READ_MODEL_VERSION,
  isResolvedBlogSite,
  projectResolvedBlogPublications,
} from './blogReadModel.js';

const SITE =
  'crab://alice-blog';

const ARTICLE_A =
  `crab://${'a'.repeat(64)}.article`;

const ARTICLE_B =
  `crab://${'b'.repeat(64)}.article`;

const POST_C =
  `crab://${'c'.repeat(64)}.post`;

const OTHER_ARTICLE =
  `crab://${'d'.repeat(64)}.article`;

function blogResult() {
  return {
    summary: {
      siteName:
        'alice-blog',

      crabUrl:
        SITE,

      title:
        'Alice Blog',

      tags: [
        'engineering',
        'notes',
      ],
    },

    data: {
      schema:
        'omnigate.site-page.v1',

      manifest: {
        template_id:
          'blog',

        template_version:
          1,
      },
    },
  };
}

function publication({
  crabUrl,
  kind,
  siteUrl = SITE,
  publishedAt,
  visibility = 'public',
  title,
}) {
  return {
    schema:
      'crablink.publication-summary.v1',

    publicationId:
      crabUrl,

    kind,

    crabUrl,

    title:
      title ||
      crabUrl,

    summary:
      `${kind} summary`,

    creator: {
      username:
        'alice',

      displayName:
        'Alice',

      profileUrl:
        'crab://@alice',

      avatarCid:
        null,
    },

    publishedAt,

    updatedAt:
      publishedAt,

    visibility,

    access:
      'free',

    thumbnail:
      null,

    references: {
      manifestCid:
        null,

      contentCid:
        null,

      siteUrl,
    },

    pinned:
      false,
  };
}

test(
  'Phase 13A5 detects resolved Blog provenance from the named Site DTO',
  () => {
    assert.equal(
      isResolvedBlogSite(
        blogResult(),
      ),
      true,
    );

    const nonBlog =
      blogResult();

    nonBlog.data.manifest.template_id =
      'imageboard';

    assert.equal(
      isResolvedBlogSite(
        nonBlog,
      ),
      false,
    );
  },
);

test(
  'Phase 13A5 read model identity is locked',
  () => {
    const projection =
      projectResolvedBlogPublications({
        result:
          blogResult(),

        publications: [],
      });

    assert.equal(
      projection.modelVersion,
      BLOG_READ_MODEL_VERSION,
    );

    assert.equal(
      projection.ordering,
      'chronological',
    );
  },
);

test(
  'Phase 13A5 only includes public Article and Post summaries attached to the exact Blog',
  () => {
    const projection =
      projectResolvedBlogPublications({
        result:
          blogResult(),

        publications: [
          publication({
            crabUrl:
              ARTICLE_A,

            kind:
              'article',

            publishedAt:
              '2026-08-01T12:00:00Z',
          }),

          publication({
            crabUrl:
              POST_C,

            kind:
              'post',

            publishedAt:
              '2026-08-03T12:00:00Z',
          }),

          publication({
            crabUrl:
              OTHER_ARTICLE,

            kind:
              'article',

            siteUrl:
              'crab://another-blog',

            publishedAt:
              '2026-08-04T12:00:00Z',
          }),

          publication({
            crabUrl:
              ARTICLE_B,

            kind:
              'article',

            publishedAt:
              '2026-08-02T12:00:00Z',

            visibility:
              'deleted',
          }),
        ],
      });

    assert.deepEqual(
      projection.items.map(
        (item) =>
          item.crabUrl,
      ),
      [
        POST_C,
        ARTICLE_A,
      ],
    );
  },
);

test(
  'Phase 13A5 Blog read ordering is deterministically newest first',
  () => {
    const projection =
      projectResolvedBlogPublications({
        result:
          blogResult(),

        publications: [
          publication({
            crabUrl:
              ARTICLE_A,

            kind:
              'article',

            publishedAt:
              '2026-08-01T12:00:00Z',
          }),

          publication({
            crabUrl:
              ARTICLE_B,

            kind:
              'article',

            publishedAt:
              '2026-08-02T12:00:00Z',
          }),

          publication({
            crabUrl:
              POST_C,

            kind:
              'post',

            publishedAt:
              '2026-08-03T12:00:00Z',
          }),
        ],
      });

    assert.deepEqual(
      projection.items.map(
        (item) =>
          item.crabUrl,
      ),
      [
        POST_C,
        ARTICLE_B,
        ARTICLE_A,
      ],
    );
  },
);

test(
  'Phase 13A5 featured content is the newest attached public Article',
  () => {
    const projection =
      projectResolvedBlogPublications({
        result:
          blogResult(),

        publications: [
          publication({
            crabUrl:
              ARTICLE_A,

            kind:
              'article',

            publishedAt:
              '2026-08-01T12:00:00Z',
          }),

          publication({
            crabUrl:
              ARTICLE_B,

            kind:
              'article',

            publishedAt:
              '2026-08-02T12:00:00Z',
          }),

          publication({
            crabUrl:
              POST_C,

            kind:
              'post',

            publishedAt:
              '2026-08-03T12:00:00Z',
          }),
        ],
      });

    assert.equal(
      projection.featured.crabUrl,
      ARTICLE_B,
    );
  },
);

test(
  'Phase 13A5 transparent category filtering supports Articles and Posts',
  () => {
    const publications =
      [
        publication({
          crabUrl:
            ARTICLE_A,

          kind:
            'article',

          publishedAt:
            '2026-08-01T12:00:00Z',
        }),

        publication({
          crabUrl:
            POST_C,

          kind:
            'post',

          publishedAt:
            '2026-08-03T12:00:00Z',
        }),
      ];

    const articles =
      projectResolvedBlogPublications({
        result:
          blogResult(),

        publications,

        category:
          'article',
      });

    const posts =
      projectResolvedBlogPublications({
        result:
          blogResult(),

        publications,

        category:
          'post',
      });

    assert.deepEqual(
      articles.items.map(
        (item) =>
          item.kind,
      ),
      [
        'article',
      ],
    );

    assert.deepEqual(
      posts.items.map(
        (item) =>
          item.kind,
      ),
      [
        'post',
      ],
    );
  },
);

test(
  'Phase 13A5 archive groups real publications by UTC month',
  () => {
    const projection =
      projectResolvedBlogPublications({
        result:
          blogResult(),

        publications: [
          publication({
            crabUrl:
              ARTICLE_A,

            kind:
              'article',

            publishedAt:
              '2026-08-01T12:00:00Z',
          }),

          publication({
            crabUrl:
              ARTICLE_B,

            kind:
              'article',

            publishedAt:
              '2026-07-31T12:00:00Z',
          }),
        ],
      });

    assert.deepEqual(
      projection.archive.map(
        (group) =>
          group.key,
      ),
      [
        '2026-08',
        '2026-07',
      ],
    );
  },
);

test(
  'Phase 13A5 named Site tags remain bounded reader topics',
  () => {
    const result =
      blogResult();

    result.summary.tags =
      Array.from(
        {
          length:
            40,
        },
        (
          _value,
          index,
        ) =>
          `tag-${index}`,
      );

    const projection =
      projectResolvedBlogPublications({
        result,

        publications: [],
      });

    assert.equal(
      projection.siteTags.length,
      24,
    );
  },
);

test(
  'Phase 13A5 empty state does not invent publications',
  () => {
    const projection =
      projectResolvedBlogPublications({
        result:
          blogResult(),

        publications: [],
      });

    assert.equal(
      projection.state,
      'empty',
    );

    assert.equal(
      projection.featured,
      null,
    );

    assert.deepEqual(
      projection.items,
      [],
    );
  },
);

test(
  'Phase 13A5 Blog reader uses gateway publication reads and existing typed routes only',
  async () => {
    const source =
      await readFile(
        new URL(
          './BlogReaderPresentation.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    assert.equal(
      source.includes(
        'createPublicationAdapter',
      ),
      true,
    );

    assert.equal(
      source.includes(
        '.listCreatorPublications',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'beginBlogCommentIntent',
      ),
      true,
    );

    assert.equal(
      source.includes(
        "'crab://comment'",
      ),
      true,
    );

    assert.equal(
      source.includes(
        '/blog/',
      ),
      false,
    );

    assert.equal(
      source.includes(
        'fetch(',
      ),
      false,
    );
  },
);

test(
  'Phase 13A5 named Site renderer attaches Blog presentation only after access is allowed',
  async () => {
    const source =
      await readFile(
        new URL(
          './SiteRender.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    assert.equal(
      source.includes(
        "import BlogReaderPresentation",
      ),
      true,
    );

    assert.equal(
      source.includes(
        'canRenderPreview &&',
      ),
      true,
    );

    assert.equal(
      source.includes(
        '<BlogReaderPresentation',
      ),
      true,
    );

    assert.equal(
      source.includes(
        '<SiteSandboxPreview',
      ),
      true,
    );
  },
);
