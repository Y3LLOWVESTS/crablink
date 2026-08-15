/**
 * RO:WHAT — Session-only navigation context joining Blog Site, Article, and Comment product workspaces.
 * RO:WHY — FINAL_BETA Phase 13 needs a clean Blog → article → typed-comment flow without inventing a Blog backend.
 * RO:INTERACTS — SitePage, ArticlePage, ArticlePublishFlow, CommentPage.
 * RO:INVARIANTS — named Site context only; canonical article refs only; intents are one-shot; context is never backend truth.
 * RO:SECURITY — no secrets, wallet authority, ledger authority, publication authority, storage authority, or network mutation.
 * RO:TEST — node --test blogProductFlow.test.mjs.
 */

export const BLOG_PRODUCT_CONTEXT_SCHEMA =
  'crablink.blog-product-context.v1';

export const BLOG_ARTICLE_INTENT_SCHEMA =
  'crablink.blog-article-intent.v1';

export const BLOG_COMMENT_INTENT_SCHEMA =
  'crablink.blog-comment-intent.v1';

const BLOG_PRODUCT_CONTEXT_KEY =
  'crablink.final-beta.blog-product-context.v1';

const BLOG_ARTICLE_INTENT_KEY =
  'crablink.final-beta.blog-article-intent.v1';

const BLOG_COMMENT_INTENT_KEY =
  'crablink.final-beta.blog-comment-intent.v1';

const MAX_REMEMBERED_ARTICLES =
  50;

export class BlogProductFlowError extends Error {
  constructor(
    message,
    reason =
      'blog_product_flow_error',
  ) {
    super(
      message,
    );

    this.name =
      'BlogProductFlowError';

    this.reason =
      reason;
  }
}

export function beginBlogArticleIntent(
  {
    siteCrabUrl,
    creatorDisplay = '',
  } = {},
  storage = resolveSessionStorage(),
) {
  const site =
    normalizeNamedSiteCrabUrl(
      siteCrabUrl,
    );

  const creator =
    normalizeCreatorDisplay(
      creatorDisplay,
    );

  const existing =
    readBlogProductContext(
      storage,
    );

  const articleCrabUrls =
    existing?.siteCrabUrl ===
      site
      ? existing.articleCrabUrls
      : [];

  const context =
    freeze({
      schema:
        BLOG_PRODUCT_CONTEXT_SCHEMA,

      siteCrabUrl:
        site,

      creatorDisplay:
        creator,

      latestArticleCrabUrl:
        existing?.siteCrabUrl ===
          site
          ? existing.latestArticleCrabUrl
          : '',

      articleCrabUrls,
    });

  const intent =
    freeze({
      schema:
        BLOG_ARTICLE_INTENT_SCHEMA,

      siteCrabUrl:
        site,

      creatorDisplay:
        creator,
    });

  writeJson(
    storage,
    BLOG_PRODUCT_CONTEXT_KEY,
    context,
  );

  writeJson(
    storage,
    BLOG_ARTICLE_INTENT_KEY,
    intent,
  );

  return intent;
}

export function consumeBlogArticleIntent(
  storage = resolveSessionStorage(),
) {
  const raw =
    readJson(
      storage,
      BLOG_ARTICLE_INTENT_KEY,
    );

  removeItem(
    storage,
    BLOG_ARTICLE_INTENT_KEY,
  );

  if (
    raw == null
  ) {
    return null;
  }

  if (
    raw.schema !==
    BLOG_ARTICLE_INTENT_SCHEMA
  ) {
    return null;
  }

  try {
    return freeze({
      schema:
        BLOG_ARTICLE_INTENT_SCHEMA,

      siteCrabUrl:
        normalizeNamedSiteCrabUrl(
          raw.siteCrabUrl,
        ),

      creatorDisplay:
        normalizeCreatorDisplay(
          raw.creatorDisplay,
        ),
    });
  } catch (_error) {
    return null;
  }
}

export function readBlogProductContext(
  storage = resolveSessionStorage(),
) {
  const raw =
    readJson(
      storage,
      BLOG_PRODUCT_CONTEXT_KEY,
    );

  if (
    raw == null ||
    raw.schema !==
      BLOG_PRODUCT_CONTEXT_SCHEMA
  ) {
    return null;
  }

  try {
    const site =
      normalizeNamedSiteCrabUrl(
        raw.siteCrabUrl,
      );

    const articles =
      normalizeArticleList(
        raw.articleCrabUrls,
      );

    const latest =
      raw.latestArticleCrabUrl
        ? normalizeArticleCrabUrl(
            raw.latestArticleCrabUrl,
          )
        : '';

    return freeze({
      schema:
        BLOG_PRODUCT_CONTEXT_SCHEMA,

      siteCrabUrl:
        site,

      creatorDisplay:
        normalizeCreatorDisplay(
          raw.creatorDisplay,
        ),

      latestArticleCrabUrl:
        latest,

      articleCrabUrls:
        articles,
    });
  } catch (_error) {
    removeItem(
      storage,
      BLOG_PRODUCT_CONTEXT_KEY,
    );

    return null;
  }
}

export function rememberPublishedBlogArticle(
  {
    siteCrabUrl,
    articleCrabUrl,
    creatorDisplay = '',
  } = {},
  storage = resolveSessionStorage(),
) {
  const site =
    normalizeNamedSiteCrabUrl(
      siteCrabUrl,
    );

  const article =
    normalizeArticleCrabUrl(
      articleCrabUrl,
    );

  const existing =
    readBlogProductContext(
      storage,
    );

  if (
    existing &&
    existing.siteCrabUrl !==
      site
  ) {
    throw new BlogProductFlowError(
      'Published Blog article does not match the active Blog site context.',
      'blog_site_context_mismatch',
    );
  }

  const articles =
    [
      article,
      ...(
        existing?.articleCrabUrls ??
        []
      ).filter(
        (candidate) =>
          candidate !==
          article,
      ),
    ].slice(
      0,
      MAX_REMEMBERED_ARTICLES,
    );

  const context =
    freeze({
      schema:
        BLOG_PRODUCT_CONTEXT_SCHEMA,

      siteCrabUrl:
        site,

      creatorDisplay:
        normalizeCreatorDisplay(
          creatorDisplay ||
          existing?.creatorDisplay ||
          '',
        ),

      latestArticleCrabUrl:
        article,

      articleCrabUrls:
        articles,
    });

  writeJson(
    storage,
    BLOG_PRODUCT_CONTEXT_KEY,
    context,
  );

  return context;
}

export function beginBlogCommentIntent(
  {
    siteCrabUrl,
    articleCrabUrl,
    creatorDisplay = '',
  } = {},
  storage = resolveSessionStorage(),
) {
  const site =
    normalizeNamedSiteCrabUrl(
      siteCrabUrl,
    );

  const article =
    normalizeArticleCrabUrl(
      articleCrabUrl,
    );

  const existing =
    readBlogProductContext(
      storage,
    );

  if (
    existing &&
    existing.siteCrabUrl !==
      site
  ) {
    throw new BlogProductFlowError(
      'Blog comment intent does not match the active Blog site context.',
      'blog_site_context_mismatch',
    );
  }

  const context =
    rememberPublishedBlogArticle(
      {
        siteCrabUrl:
          site,

        articleCrabUrl:
          article,

        creatorDisplay:
          creatorDisplay ||
          existing?.creatorDisplay ||
          '',
      },
      storage,
    );

  const intent =
    freeze({
      schema:
        BLOG_COMMENT_INTENT_SCHEMA,

      siteCrabUrl:
        site,

      articleCrabUrl:
        article,

      creatorDisplay:
        context.creatorDisplay,
    });

  writeJson(
    storage,
    BLOG_COMMENT_INTENT_KEY,
    intent,
  );

  return intent;
}

export function consumeBlogCommentIntent(
  storage = resolveSessionStorage(),
) {
  const raw =
    readJson(
      storage,
      BLOG_COMMENT_INTENT_KEY,
    );

  removeItem(
    storage,
    BLOG_COMMENT_INTENT_KEY,
  );

  if (
    raw == null ||
    raw.schema !==
      BLOG_COMMENT_INTENT_SCHEMA
  ) {
    return null;
  }

  try {
    return freeze({
      schema:
        BLOG_COMMENT_INTENT_SCHEMA,

      siteCrabUrl:
        normalizeNamedSiteCrabUrl(
          raw.siteCrabUrl,
        ),

      articleCrabUrl:
        normalizeArticleCrabUrl(
          raw.articleCrabUrl,
        ),

      creatorDisplay:
        normalizeCreatorDisplay(
          raw.creatorDisplay,
        ),
    });
  } catch (_error) {
    return null;
  }
}

export function normalizeNamedSiteCrabUrl(
  input,
) {
  const value =
    String(
      input ??
      '',
    )
      .trim()
      .toLowerCase();

  if (
    /^crab:\/\/[a-z0-9_.-]{1,80}$/.test(
      value,
    )
  ) {
    return value;
  }

  throw new BlogProductFlowError(
    'Blog product navigation requires a named crab:// Site URL.',
    'invalid_blog_site_url',
  );
}

export function normalizeArticleCrabUrl(
  input,
) {
  const value =
    String(
      input ??
      '',
    )
      .trim()
      .toLowerCase();

  if (
    /^crab:\/\/[a-f0-9]{64}\.article$/.test(
      value,
    )
  ) {
    return value;
  }

  throw new BlogProductFlowError(
    'Blog product navigation requires a canonical typed article URL.',
    'invalid_blog_article_url',
  );
}

function normalizeCreatorDisplay(
  input,
) {
  const value =
    String(
      input ??
      '',
    ).trim();

  if (
    value.length >
    120
  ) {
    throw new BlogProductFlowError(
      'Blog creator display exceeds its reviewed bound.',
      'creator_display_too_long',
    );
  }

  return value;
}

function normalizeArticleList(
  input,
) {
  if (
    Array.isArray(
      input,
    ) ===
    false
  ) {
    return [];
  }

  const output =
    [];

  for (
    const raw
    of input
  ) {
    const article =
      normalizeArticleCrabUrl(
        raw,
      );

    if (
      output.includes(
        article,
      ) ===
      false
    ) {
      output.push(
        article,
      );
    }

    if (
      output.length >=
      MAX_REMEMBERED_ARTICLES
    ) {
      break;
    }
  }

  return output;
}

function resolveSessionStorage() {
  try {
    return globalThis
      .sessionStorage ??
      null;
  } catch (_error) {
    return null;
  }
}

function readJson(
  storage,
  key,
) {
  if (
    storage == null ||
    typeof storage.getItem !==
      'function'
  ) {
    return null;
  }

  try {
    const value =
      storage.getItem(
        key,
      );

    return value
      ? JSON.parse(
          value,
        )
      : null;
  } catch (_error) {
    return null;
  }
}

function writeJson(
  storage,
  key,
  value,
) {
  if (
    storage == null ||
    typeof storage.setItem !==
      'function'
  ) {
    return;
  }

  try {
    storage.setItem(
      key,
      JSON.stringify(
        value,
      ),
    );
  } catch (_error) {
    // Session navigation context is optional and never authority.
  }
}

function removeItem(
  storage,
  key,
) {
  if (
    storage == null ||
    typeof storage.removeItem !==
      'function'
  ) {
    return;
  }

  try {
    storage.removeItem(
      key,
    );
  } catch (_error) {
    // Session navigation context is optional and never authority.
  }
}

function freeze(
  value,
) {
  if (
    value &&
    typeof value ===
      'object'
  ) {
    Object.freeze(
      value,
    );

    for (
      const child
      of Object.values(
        value,
      )
    ) {
      if (
        child &&
        typeof child ===
          'object'
      ) {
        freeze(
          child,
        );
      }
    }
  }

  return value;
}
