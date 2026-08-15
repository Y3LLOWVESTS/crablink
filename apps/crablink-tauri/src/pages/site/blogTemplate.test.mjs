/**
 * RO:WHAT — Focused FINAL_BETA Phase 13A1 Blog specialization tests.
 * RO:WHY — Proves Blog behavior remains deterministic, typed, chronological, bounded, and shared-engine based.
 * RO:TEST — node --test blogTemplate.test.mjs.
 */

import assert from 'node:assert/strict';

import test from 'node:test';

import {
  BLOG_ORDERING,
  BLOG_TEMPLATE_ID,
  BLOG_TEMPLATE_MODEL_VERSION,
  BLOG_TEMPLATE_VERSION,
  BLOG_THEME_PRESETS,
  BlogTemplateError,
  buildBlogArchive,
  createBlogTemplateDefinitionV1,
  createBlogTemplateInstanceV1,
  normalizeBlogSettings,
  projectBlogArticleDetail,
  projectBlogLanding,
  renderBlogTemplateV1,
} from './blogTemplate.js';

import {
  SITE_TEMPLATE_ENGINE_VERSION,
  SITE_TEMPLATE_INSTANCE_SCHEMA,
} from './siteTemplateEngine.js';

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

const ARTICLE_A =
  `crab://${HASH_A}.article`;

const ARTICLE_B =
  `crab://${HASH_B}.article`;

const POST_C =
  `crab://${HASH_C}.post`;

const COMMENT_D =
  `crab://${HASH_D}.comment`;

function publications() {
  return [
    {
      crabUrl:
        ARTICLE_A,

      title:
        'Older article',

      summary:
        'First article',

      publishedAt:
        '2026-08-01T12:00:00Z',

      tags: [
        'rust',
      ],

      categories: [
        'engineering',
      ],
    },

    {
      crabUrl:
        POST_C,

      title:
        'Newest post',

      summary:
        'Latest update',

      publishedAt:
        '2026-08-03T12:00:00Z',

      tags: [
        'update',
      ],

      categories: [
        'notes',
      ],
    },

    {
      crabUrl:
        ARTICLE_B,

      title:
        'Middle article',

      summary:
        'Second article',

      publishedAt:
        '2026-08-02T12:00:00Z',

      tags: [
        'rust',
        'release',
      ],

      categories: [
        'engineering',
      ],
    },
  ];
}

test(
  'Phase 13A1 Blog identity ordering and theme presets are locked',
  () => {
    assert.equal(
      BLOG_TEMPLATE_ID,
      'blog',
    );

    assert.equal(
      BLOG_TEMPLATE_VERSION,
      1,
    );

    assert.equal(
      BLOG_TEMPLATE_MODEL_VERSION,
      'crablink.blog-template.v1',
    );

    assert.equal(
      BLOG_ORDERING,
      'chronological',
    );

    assert.deepEqual(
      Object.keys(
        BLOG_THEME_PRESETS,
      ),
      [
        'classic',
        'paper',
        'compact',
      ],
    );
  },
);

test(
  'Phase 13A1 Blog definition uses the shared engine and required landing sections',
  () => {
    const definition =
      createBlogTemplateDefinitionV1();

    assert.equal(
      definition.id,
      BLOG_TEMPLATE_ID,
    );

    assert.equal(
      definition.version,
      BLOG_TEMPLATE_VERSION,
    );

    assert.equal(
      definition.sections.some(
        (section) =>
          section.id ===
          'hero',
      ),
      true,
    );

    assert.equal(
      definition.sections.some(
        (section) =>
          section.id ===
          'about',
      ),
      true,
    );

    const recent =
      definition.sections.find(
        (section) =>
          section.id ===
          'recent',
      );

    assert.deepEqual(
      recent.kinds,
      [
        'article',
        'post',
      ],
    );

    assert.equal(
      recent.order,
      'chronological',
    );

    assert.equal(
      definition.navigation.some(
        (item) =>
          item.id ===
          'archive',
      ),
      true,
    );

    assert.equal(
      definition.navigation.some(
        (item) =>
          item.id ===
          'author',
      ),
      true,
    );
  },
);

test(
  'Phase 13A1 optional featured article becomes a typed asset-reference block',
  () => {
    const definition =
      createBlogTemplateDefinitionV1({
        featuredArticleCrabUrl:
          ARTICLE_A,
      });

    const featured =
      definition.sections.find(
        (section) =>
          section.id ===
          'featured_article',
      );

    assert.equal(
      featured.type,
      'asset_reference',
    );

    assert.equal(
      featured.crabUrl,
      ARTICLE_A,
    );
  },
);

test(
  'Phase 13A1 Blog instance and output remain on the Phase 12 shared engine',
  () => {
    const instance =
      createBlogTemplateInstanceV1({
        title:
          'Rusty Notes',

        theme:
          'paper',
      });

    assert.equal(
      instance.schema,
      SITE_TEMPLATE_INSTANCE_SCHEMA,
    );

    assert.equal(
      instance.engineVersion,
      SITE_TEMPLATE_ENGINE_VERSION,
    );

    const output =
      renderBlogTemplateV1({
        title:
          'Rusty Notes',

        theme:
          'paper',
      });

    assert.equal(
      output.engineVersion,
      SITE_TEMPLATE_ENGINE_VERSION,
    );

    assert.equal(
      output.rendered.html.includes(
        'data-site-template-id="blog"',
      ),
      true,
    );

    for (
      const forbidden
      of [
        '<script',
        '<style',
        '<iframe',
        '<form',
        'javascript:',
      ]
    ) {
      assert.equal(
        output.rendered.html
          .toLowerCase()
          .includes(
            forbidden,
          ),
        false,
      );
    }
  },
);

test(
  'Phase 13A1 Blog landing orders posts and articles newest first without opaque ranking',
  () => {
    const landing =
      projectBlogLanding({
        publications:
          publications(),
      });

    assert.equal(
      landing.state,
      'ready',
    );

    assert.equal(
      landing.ordering,
      'chronological',
    );

    assert.deepEqual(
      landing.items.map(
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
  'Phase 13A1 Blog landing supports bounded tag and category filtering',
  () => {
    const byTag =
      projectBlogLanding({
        publications:
          publications(),

        selectedTag:
          'rust',
      });

    assert.deepEqual(
      byTag.items.map(
        (item) =>
          item.crabUrl,
      ),
      [
        ARTICLE_B,
        ARTICLE_A,
      ],
    );

    const byCategory =
      projectBlogLanding({
        publications:
          publications(),

        selectedCategory:
          'notes',
      });

    assert.deepEqual(
      byCategory.items.map(
        (item) =>
          item.crabUrl,
      ),
      [
        POST_C,
      ],
    );

    assert.deepEqual(
      byTag.tags,
      [
        'release',
        'rust',
        'update',
      ],
    );

    assert.deepEqual(
      byTag.categories,
      [
        'engineering',
        'notes',
      ],
    );
  },
);

test(
  'Phase 13A1 featured article is explicit when configured and deterministic otherwise',
  () => {
    const explicit =
      projectBlogLanding({
        publications:
          publications(),

        featuredArticleCrabUrl:
          ARTICLE_A,
      });

    assert.equal(
      explicit.featured.crabUrl,
      ARTICLE_A,
    );

    const fallback =
      projectBlogLanding({
        publications:
          publications(),
      });

    assert.equal(
      fallback.featured.crabUrl,
      ARTICLE_B,
    );
  },
);

test(
  'Phase 13A1 Blog landing has truthful loading error and empty states',
  () => {
    assert.equal(
      projectBlogLanding({
        status:
          'loading',
      }).state,
      'loading',
    );

    assert.equal(
      projectBlogLanding({
        status:
          'error',
      }).state,
      'error',
    );

    assert.equal(
      projectBlogLanding({
        publications: [],
      }).state,
      'empty',
    );
  },
);

test(
  'Phase 13A1 archive groups chronological content by UTC year and month',
  () => {
    const archive =
      buildBlogArchive(
        [
          ...publications(),

          {
            crabUrl:
              `crab://${HASH_D}.post`,

            title:
              'July',

            publishedAt:
              '2026-07-30T12:00:00Z',

            tags: [],

            categories: [],
          },
        ],
      );

    assert.deepEqual(
      archive.groups.map(
        (group) =>
          group.key,
      ),
      [
        '2026-08',
        '2026-07',
      ],
    );

    assert.equal(
      archive.groups[0].items.length,
      3,
    );
  },
);

test(
  'Phase 13A1 article detail integrates author profile and typed chronological comments',
  () => {
    const detail =
      projectBlogArticleDetail({
        article: {
          crabUrl:
            ARTICLE_A,

          title:
            'Article',

          publishedAt:
            '2026-08-01T12:00:00Z',

          tags: [
            'rust',
          ],

          categories: [
            'engineering',
          ],
        },

        authorProfileCrabUrl:
          'crab://@rustyonions',

        comments: [
          {
            crabUrl:
              COMMENT_D,

            parentCrabUrl:
              ARTICLE_A,

            body:
              'Second',

            author:
              '@bob',

            publishedAt:
              '2026-08-01T14:00:00Z',
          },

          {
            crabUrl:
              `crab://${HASH_C}.comment`,

            parentCrabUrl:
              ARTICLE_A,

            body:
              'First',

            author:
              '@alice',

            publishedAt:
              '2026-08-01T13:00:00Z',
          },
        ],
      });

    assert.equal(
      detail.state,
      'ready',
    );

    assert.equal(
      detail.authorProfileCrabUrl,
      'crab://@rustyonions',
    );

    assert.deepEqual(
      detail.comments.map(
        (comment) =>
          comment.body,
      ),
      [
        'First',
        'Second',
      ],
    );
  },
);

test(
  'Phase 13A1 article detail exposes truthful loading error and empty states',
  () => {
    assert.equal(
      projectBlogArticleDetail({
        status:
          'loading',
      }).state,
      'loading',
    );

    assert.equal(
      projectBlogArticleDetail({
        status:
          'error',
      }).state,
      'error',
    );

    assert.equal(
      projectBlogArticleDetail({
        article:
          null,
      }).state,
      'empty',
    );
  },
);

test(
  'Phase 13A1 invalid themes remote references and wrong typed content fail closed',
  () => {
    assert.throws(
      () =>
        normalizeBlogSettings({
          theme:
            'remote-css',
        }),
      (error) => {
        assert.equal(
          error instanceof
            BlogTemplateError,
          true,
        );

        assert.equal(
          error.reason,
          'unsupported_blog_theme',
        );

        return true;
      },
    );

    assert.throws(
      () =>
        createBlogTemplateDefinitionV1({
          featuredArticleCrabUrl:
            'https://example.com/article',
        }),
      (error) => {
        assert.equal(
          error.reason,
          'invalid_typed_content_reference',
        );

        return true;
      },
    );

    assert.throws(
      () =>
        projectBlogArticleDetail({
          article: {
            crabUrl:
              POST_C,

            title:
              'Not an article',

            publishedAt:
              '2026-08-01T12:00:00Z',
          },
        }),
      (error) => {
        assert.equal(
          error.reason,
          'article_detail_requires_article',
        );

        return true;
      },
    );
  },
);

test(
  'Phase 13A1 comment parent mismatch and untyped comments fail closed',
  () => {
    assert.throws(
      () =>
        projectBlogArticleDetail({
          article: {
            crabUrl:
              ARTICLE_A,

            title:
              'Article',

            publishedAt:
              '2026-08-01T12:00:00Z',
          },

          comments: [
            {
              crabUrl:
                COMMENT_D,

              parentCrabUrl:
                ARTICLE_B,

              body:
                'Wrong parent',

              publishedAt:
                '2026-08-01T13:00:00Z',
            },
          ],
        }),
      (error) => {
        assert.equal(
          error.reason,
          'comment_parent_mismatch',
        );

        return true;
      },
    );

    assert.throws(
      () =>
        projectBlogArticleDetail({
          article: {
            crabUrl:
              ARTICLE_A,

            title:
              'Article',

            publishedAt:
              '2026-08-01T12:00:00Z',
          },

          comments: [
            {
              crabUrl:
                'https://example.com/comment',

              parentCrabUrl:
                ARTICLE_A,

              body:
                'Remote',

              publishedAt:
                '2026-08-01T13:00:00Z',
            },
          ],
        }),
      (error) => {
        assert.equal(
          error.reason,
          'invalid_typed_content_reference',
        );

        return true;
      },
    );
  },
);
