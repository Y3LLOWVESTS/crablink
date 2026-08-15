/**
 * RO:WHAT — FINAL_BETA Phase 13A4 Blog → Article → Comment product-flow tests.
 * RO:WHY — Proves navigation context joins existing typed publishers without becoming authority.
 * RO:TEST — node --test blogProductFlow.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  BLOG_ARTICLE_INTENT_SCHEMA,
  BLOG_COMMENT_INTENT_SCHEMA,
  BLOG_PRODUCT_CONTEXT_SCHEMA,
  BlogProductFlowError,
  beginBlogArticleIntent,
  beginBlogCommentIntent,
  consumeBlogArticleIntent,
  consumeBlogCommentIntent,
  readBlogProductContext,
  rememberPublishedBlogArticle,
} from './blogProductFlow.js';

import {
  COMMENT_PARENT_ASSET_KINDS,
  DEFAULT_COMMENT_DRAFT,
  buildCommentManifestDraft,
  getCommentCompleteness,
} from '../comment/commentDraftModel.js';

import {
  normalizeCommentPrepareRequest,
} from '../../shared/api/commentAssetClient.js';

const ARTICLE_A =
  `crab://${'a'.repeat(64)}.article`;

const ARTICLE_B =
  `crab://${'b'.repeat(64)}.article`;

const IMAGE_C =
  `crab://${'c'.repeat(64)}.image`;

const SITE =
  'crab://alice-blog';

function memoryStorage() {
  const values =
    new Map();

  return {
    getItem(key) {
      return values.has(
        key,
      )
        ? values.get(
            key,
          )
        : null;
    },

    setItem(
      key,
      value,
    ) {
      values.set(
        key,
        String(
          value,
        ),
      );
    },

    removeItem(
      key,
    ) {
      values.delete(
        key,
      );
    },
  };
}

test(
  'Phase 13A4 locks Blog product navigation schemas',
  () => {
    assert.equal(
      BLOG_PRODUCT_CONTEXT_SCHEMA,
      'crablink.blog-product-context.v1',
    );

    assert.equal(
      BLOG_ARTICLE_INTENT_SCHEMA,
      'crablink.blog-article-intent.v1',
    );

    assert.equal(
      BLOG_COMMENT_INTENT_SCHEMA,
      'crablink.blog-comment-intent.v1',
    );
  },
);

test(
  'Phase 13A4 beginning an article intent remembers named Blog context',
  () => {
    const storage =
      memoryStorage();

    const intent =
      beginBlogArticleIntent(
        {
          siteCrabUrl:
            SITE,

          creatorDisplay:
            '@alice',
        },
        storage,
      );

    assert.equal(
      intent.siteCrabUrl,
      SITE,
    );

    const context =
      readBlogProductContext(
        storage,
      );

    assert.equal(
      context.siteCrabUrl,
      SITE,
    );

    assert.equal(
      context.creatorDisplay,
      '@alice',
    );
  },
);

test(
  'Phase 13A4 article intent is one-shot while Blog context remains',
  () => {
    const storage =
      memoryStorage();

    beginBlogArticleIntent(
      {
        siteCrabUrl:
          SITE,
      },
      storage,
    );

    assert.equal(
      consumeBlogArticleIntent(
        storage,
      ).siteCrabUrl,
      SITE,
    );

    assert.equal(
      consumeBlogArticleIntent(
        storage,
      ),
      null,
    );

    assert.equal(
      readBlogProductContext(
        storage,
      ).siteCrabUrl,
      SITE,
    );
  },
);

test(
  'Phase 13A4 remote or path-like Blog site contexts fail closed',
  () => {
    for (
      const invalid
      of [
        'https://example.com',
        'crab://alice-blog/path',
      ]
    ) {
      assert.throws(
        () =>
          beginBlogArticleIntent(
            {
              siteCrabUrl:
                invalid,
            },
            memoryStorage(),
          ),
        (error) => {
          assert.equal(
            error instanceof
              BlogProductFlowError,
            true,
          );

          assert.equal(
            error.reason,
            'invalid_blog_site_url',
          );

          return true;
        },
      );
    }
  },
);

test(
  'Phase 13A4 published Blog articles are remembered canonically and deduplicated',
  () => {
    const storage =
      memoryStorage();

    beginBlogArticleIntent(
      {
        siteCrabUrl:
          SITE,
      },
      storage,
    );

    rememberPublishedBlogArticle(
      {
        siteCrabUrl:
          SITE,

        articleCrabUrl:
          ARTICLE_A,
      },
      storage,
    );

    rememberPublishedBlogArticle(
      {
        siteCrabUrl:
          SITE,

        articleCrabUrl:
          ARTICLE_B,
      },
      storage,
    );

    rememberPublishedBlogArticle(
      {
        siteCrabUrl:
          SITE,

        articleCrabUrl:
          ARTICLE_A,
      },
      storage,
    );

    const context =
      readBlogProductContext(
        storage,
      );

    assert.equal(
      context.latestArticleCrabUrl,
      ARTICLE_A,
    );

    assert.deepEqual(
      context.articleCrabUrls,
      [
        ARTICLE_A,
        ARTICLE_B,
      ],
    );
  },
);

test(
  'Phase 13A4 comment intent carries the Blog site and typed article parent',
  () => {
    const storage =
      memoryStorage();

    beginBlogArticleIntent(
      {
        siteCrabUrl:
          SITE,

        creatorDisplay:
          '@alice',
      },
      storage,
    );

    const intent =
      beginBlogCommentIntent(
        {
          siteCrabUrl:
            SITE,

          articleCrabUrl:
            ARTICLE_A,
        },
        storage,
      );

    assert.equal(
      intent.articleCrabUrl,
      ARTICLE_A,
    );

    assert.equal(
      intent.creatorDisplay,
      '@alice',
    );

    const consumed =
      consumeBlogCommentIntent(
        storage,
      );

    assert.equal(
      consumed.siteCrabUrl,
      SITE,
    );

    assert.equal(
      consumeBlogCommentIntent(
        storage,
      ),
      null,
    );
  },
);

test(
  'Phase 13A4 Blog comment intent rejects a non-article parent',
  () => {
    assert.throws(
      () =>
        beginBlogCommentIntent(
          {
            siteCrabUrl:
              SITE,

            articleCrabUrl:
              IMAGE_C,
          },
          memoryStorage(),
        ),
      (error) => {
        assert.equal(
          error.reason,
          'invalid_blog_article_url',
        );

        return true;
      },
    );
  },
);

test(
  'Phase 14A3 Comment draft policy explicitly accepts image article post and comment parents',
  () => {
    assert.deepEqual(
      COMMENT_PARENT_ASSET_KINDS,
      [
        'image',
        'article',
        'post',
        'comment',
      ],
    );

    const draft = {
      ...DEFAULT_COMMENT_DRAFT,

      body:
        'A typed Blog article comment.',

      creatorDisplay:
        '@alice',

      siteContextCrabUrl:
        SITE,

      parentCrabUrl:
        ARTICLE_A,
    };

    assert.equal(
      getCommentCompleteness(
        draft,
      ),
      100,
    );

    const manifest =
      buildCommentManifestDraft(
        draft,
      );

    assert.equal(
      manifest.linked_assets
        .parent_crab_url,
      ARTICLE_A,
    );

    assert.equal(
      Boolean(
        manifest.reference_graph,
      ),
      true,
    );
  },
);

test(
  'Phase 14A3 non-reviewed video parent does not satisfy Comment completeness',
  () => {
    const draft = {
      ...DEFAULT_COMMENT_DRAFT,

      body:
        'Wrong product parent type.',

      creatorDisplay:
        '@alice',

      siteContextCrabUrl:
        SITE,

      parentCrabUrl:
        `crab://${'e'.repeat(64)}.video`,
    };

    assert.equal(
      getCommentCompleteness(
        draft,
      ) <
        100,
      true,
    );
  },
);

test(
  'Phase 13A4 existing Comment API DTO accepts the typed article parent unchanged',
  () => {
    const request =
      normalizeCommentPrepareRequest({
        body:
          'Comment on Blog article',

        site_context_crab_url:
          SITE,

        parent_crab_url:
          ARTICLE_A,

        payer_account:
          'acct_alice',

        owner_passport_subject:
          'passport:main:alice',
      });

    assert.equal(
      request.site_context_crab_url,
      SITE,
    );

    assert.equal(
      request.parent_crab_url,
      ARTICLE_A,
    );
  },
);

test(
  'Phase 13A4 Site workspace exposes Blog article creation only through existing Article route',
  async () => {
    const source =
      await readFile(
        new URL(
          './SitePage.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    assert.equal(
      source.includes(
        'beginBlogArticleIntent',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'Write Blog Article',
      ),
      true,
    );

    assert.equal(
      source.includes(
        "app?.navigate?.(\n      'crab://article'",
      ),
      true,
    );

    assert.equal(
      source.includes(
        '/blog/publish',
      ),
      false,
    );
  },
);

test(
  'Phase 13A4 Article workspace consumes Blog Site context and publish flow exposes typed comment handoff',
  async () => {
    const pageSource =
      await readFile(
        new URL(
          '../article/ArticlePage.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    const publishSource =
      await readFile(
        new URL(
          '../article/ArticlePublishFlow.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    assert.equal(
      pageSource.includes(
        'consumeBlogArticleIntent',
      ),
      true,
    );

    assert.equal(
      pageSource.includes(
        'siteContextCrabUrl:',
      ),
      true,
    );

    assert.equal(
      publishSource.includes(
        'rememberPublishedBlogArticle',
      ),
      true,
    );

    assert.equal(
      publishSource.includes(
        'Comment on Article',
      ),
      true,
    );

    assert.equal(
      publishSource.includes(
        "blogArticleMode ===\n          false",
      ),
      true,
    );

    assert.equal(
      publishSource.includes(
        '/blog/article',
      ),
      false,
    );
  },
);

test(
  'Phase 13A4 Comment workspace consumes Blog article intent and labels article parents honestly',
  async () => {
    const pageSource =
      await readFile(
        new URL(
          '../comment/CommentPage.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    const draftSource =
      await readFile(
        new URL(
          '../comment/CommentDraft.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    assert.equal(
      pageSource.includes(
        'consumeBlogCommentIntent',
      ),
      true,
    );

    assert.equal(
      pageSource.includes(
        'parentCrabUrl:',
      ),
      true,
    );

    assert.equal(
      draftSource.includes(
        'Parent image/article/post/comment crab URL',
      ),
      true,
    );
  },
);
