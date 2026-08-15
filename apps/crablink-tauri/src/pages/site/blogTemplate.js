/**
 * RO:WHAT — FINAL_BETA Phase 13 Blog specialization over the shared Site template engine.
 * RO:WHY — Blog needs one deterministic model for landing, featured content, archive, article detail, profile links, comments, states, and reviewed theme choices.
 * RO:INTERACTS — siteTemplateEngine, siteThemePolicy, future Site template registry and Blog read/create surfaces.
 * RO:INVARIANTS — chronological ordering only; typed article/post/comment references; bounded tags/categories/themes; no separate renderer.
 * RO:SECURITY — no raw HTML/CSS/JS, no remote navigation, no opaque ranking, no untyped content references.
 * RO:TEST — node --test blogTemplate.test.mjs.
 */

import {
  SITE_TEMPLATE_ENGINE_VERSION,
  createSiteTemplateDefinitionV1,
  createSiteTemplateInstanceV1,
  renderSiteTemplateInstanceV1,
} from './siteTemplateEngine.js';

import {
  DEFAULT_SITE_THEME_TOKENS,
} from './siteThemePolicy.js';

export const BLOG_TEMPLATE_ID =
  'blog';

export const BLOG_TEMPLATE_VERSION =
  1;

export const BLOG_TEMPLATE_MODEL_VERSION =
  'crablink.blog-template.v1';

export const BLOG_ORDERING =
  'chronological';

export const BLOG_THEME_PRESETS =
  deepFreeze({
    classic: {
      ...DEFAULT_SITE_THEME_TOKENS,
    },

    paper: {
      surface:
        'cl-surface',

      text:
        'cl-text',

      accent:
        'cl-info',

      border:
        'cl-border',

      radius:
        'cl-radius-md',

      spacing:
        'cl-space-5',

      font:
        'cl-font-sans',
    },

    compact: {
      surface:
        'cl-card-muted',

      text:
        'cl-text-strong',

      accent:
        'cl-accent',

      border:
        'cl-border',

      radius:
        'cl-radius-md',

      spacing:
        'cl-space-3',

      font:
        'cl-font-sans',
    },
  });

const BLOG_PUBLICATION_KINDS =
  Object.freeze([
    'article',
    'post',
  ]);

const BLOG_STATES =
  Object.freeze([
    'ready',
    'loading',
    'error',
  ]);

const MAX_BLOG_ITEMS =
  100;

const MAX_BLOG_COMMENTS =
  200;

const MAX_TAGS =
  24;

const MAX_CATEGORIES =
  12;

export class BlogTemplateError extends Error {
  constructor(
    message,
    {
      reason =
        'blog_template_error',

      field =
        '',
    } = {},
  ) {
    super(
      message,
    );

    this.name =
      'BlogTemplateError';

    this.reason =
      reason;

    this.field =
      field;
  }
}

export function createBlogTemplateDefinitionV1(
  settings = {},
) {
  const normalized =
    normalizeBlogSettings(
      settings,
    );

  const sections =
    [
      {
        id:
          'hero',

        type:
          'hero',

        title:
          normalized.title,

        subtitle:
          normalized.description,
      },

      {
        id:
          'about',

        type:
          'text',

        title:
          normalized.aboutTitle,

        body:
          normalized.aboutBody,
      },
    ];

  if (
    normalized.featuredArticleCrabUrl
  ) {
    sections.push({
      id:
        'featured_article',

      type:
        'asset_reference',

      title:
        'Featured article',

      crabUrl:
        normalized.featuredArticleCrabUrl,

      caption:
        'Featured long-form writing.',
    });
  }

  sections.push(
    {
      id:
        'recent',

      type:
        'content_query',

      title:
        'Latest',

      kinds: [
        'article',
        'post',
      ],

      limit:
        normalized.listLimit,

      order:
        BLOG_ORDERING,
    },

    {
      id:
        'archive',

      type:
        'content_query',

      title:
        'Archive',

      kinds: [
        'article',
        'post',
      ],

      limit:
        normalized.archiveLimit,

      order:
        BLOG_ORDERING,
    },
  );

  return createSiteTemplateDefinitionV1({
    id:
      BLOG_TEMPLATE_ID,

    version:
      BLOG_TEMPLATE_VERSION,

    name:
      'Blog',

    description:
      'Creator and personal Blog powered by the shared structured Site engine.',

    themeTokens:
      BLOG_THEME_PRESETS[
        normalized.theme
      ],

    navigation: [
      {
        id:
          'home',

        label:
          'Home',

        href:
          '/',
      },

      {
        id:
          'archive',

        label:
          'Archive',

        href:
          '/archive',
      },

      {
        id:
          'author',

        label:
          'Author',

        href:
          normalized.authorProfileCrabUrl,
      },
    ],

    sections,
  });
}

export function createBlogTemplateInstanceV1(
  settings = {},
) {
  const normalized =
    normalizeBlogSettings(
      settings,
    );

  const definition =
    createBlogTemplateDefinitionV1(
      normalized,
    );

  return createSiteTemplateInstanceV1(
    definition,
    {
      title:
        normalized.title,

      description:
        normalized.description,

      themeTokens:
        BLOG_THEME_PRESETS[
          normalized.theme
        ],

      references:
        normalized.references,
    },
  );
}

export function renderBlogTemplateV1(
  settings = {},
) {
  const instance =
    createBlogTemplateInstanceV1(
      settings,
    );

  const rendered =
    renderSiteTemplateInstanceV1(
      instance,
    );

  return deepFreeze({
    modelVersion:
      BLOG_TEMPLATE_MODEL_VERSION,

    engineVersion:
      SITE_TEMPLATE_ENGINE_VERSION,

    templateId:
      BLOG_TEMPLATE_ID,

    templateVersion:
      BLOG_TEMPLATE_VERSION,

    instance,

    rendered,
  });
}

export function projectBlogLanding({
  status = 'ready',
  publications = [],
  featuredArticleCrabUrl = '',
  selectedTag = '',
  selectedCategory = '',
} = {}) {
  const normalizedStatus =
    normalizeStatus(
      status,
    );

  if (
    normalizedStatus ===
    'loading'
  ) {
    return deepFreeze({
      modelVersion:
        BLOG_TEMPLATE_MODEL_VERSION,

      state:
        'loading',

      ordering:
        BLOG_ORDERING,

      featured:
        null,

      items: [],

      tags: [],

      categories: [],
    });
  }

  if (
    normalizedStatus ===
    'error'
  ) {
    return deepFreeze({
      modelVersion:
        BLOG_TEMPLATE_MODEL_VERSION,

      state:
        'error',

      ordering:
        BLOG_ORDERING,

      featured:
        null,

      items: [],

      tags: [],

      categories: [],
    });
  }

  const normalized =
    normalizePublications(
      publications,
    );

  const tag =
    normalizeOptionalTaxonomy(
      selectedTag,
      'selectedTag',
    );

  const category =
    normalizeOptionalTaxonomy(
      selectedCategory,
      'selectedCategory',
    );

  const filtered =
    normalized.filter(
      (item) => {
        if (
          tag &&
          item.tags.includes(
            tag,
          ) ===
            false
        ) {
          return false;
        }

        if (
          category &&
          item.categories.includes(
            category,
          ) ===
            false
        ) {
          return false;
        }

        return true;
      },
    );

  const featuredUrl =
    featuredArticleCrabUrl
      ? normalizeTypedCrabUrl(
          featuredArticleCrabUrl,
          [
            'article',
          ],
          'featuredArticleCrabUrl',
        )
      : '';

  const featured =
    featuredUrl
      ? normalized.find(
          (item) =>
            item.crabUrl ===
            featuredUrl,
        ) ??
        null
      : normalized.find(
          (item) =>
            item.kind ===
            'article',
        ) ??
        null;

  const tags =
    collectTaxonomy(
      normalized,
      'tags',
      MAX_TAGS,
    );

  const categories =
    collectTaxonomy(
      normalized,
      'categories',
      MAX_CATEGORIES,
    );

  return deepFreeze({
    modelVersion:
      BLOG_TEMPLATE_MODEL_VERSION,

    state:
      filtered.length ===
        0
        ? 'empty'
        : 'ready',

    ordering:
      BLOG_ORDERING,

    featured,

    items:
      filtered,

    tags,

    categories,

    selectedTag:
      tag,

    selectedCategory:
      category,
  });
}

export function projectBlogArticleDetail({
  status = 'ready',
  article = null,
  comments = [],
  authorProfileCrabUrl = 'crab://profile',
} = {}) {
  const normalizedStatus =
    normalizeStatus(
      status,
    );

  const authorProfile =
    normalizeProfileRoute(
      authorProfileCrabUrl,
    );

  if (
    normalizedStatus ===
    'loading'
  ) {
    return deepFreeze({
      modelVersion:
        BLOG_TEMPLATE_MODEL_VERSION,

      state:
        'loading',

      article:
        null,

      authorProfileCrabUrl:
        authorProfile,

      comments: [],
    });
  }

  if (
    normalizedStatus ===
    'error'
  ) {
    return deepFreeze({
      modelVersion:
        BLOG_TEMPLATE_MODEL_VERSION,

      state:
        'error',

      article:
        null,

      authorProfileCrabUrl:
        authorProfile,

      comments: [],
    });
  }

  if (
    article == null
  ) {
    return deepFreeze({
      modelVersion:
        BLOG_TEMPLATE_MODEL_VERSION,

      state:
        'empty',

      article:
        null,

      authorProfileCrabUrl:
        authorProfile,

      comments: [],
    });
  }

  const normalizedArticle =
    normalizePublication(
      article,
      0,
    );

  if (
    normalizedArticle.kind !==
    'article'
  ) {
    fail(
      'Blog article detail requires a typed article object.',
      'article_detail_requires_article',
      'article',
    );
  }

  const normalizedComments =
    normalizeComments(
      comments,
      normalizedArticle.crabUrl,
    );

  return deepFreeze({
    modelVersion:
      BLOG_TEMPLATE_MODEL_VERSION,

    state:
      'ready',

    article:
      normalizedArticle,

    authorProfileCrabUrl:
      authorProfile,

    comments:
      normalizedComments,
  });
}

export function buildBlogArchive(
  publications = [],
) {
  const normalized =
    normalizePublications(
      publications,
    );

  const groups =
    [];

  for (
    const item
    of normalized
  ) {
    const date =
      new Date(
        item.publishedAt,
      );

    const year =
      String(
        date.getUTCFullYear(),
      );

    const month =
      String(
        date.getUTCMonth() +
        1,
      ).padStart(
        2,
        '0',
      );

    const key =
      `${year}-${month}`;

    let group =
      groups.find(
        (candidate) =>
          candidate.key ===
          key,
      );

    if (
      group == null
    ) {
      group = {
        key,

        year,

        month,

        items: [],
      };

      groups.push(
        group,
      );
    }

    group.items.push(
      item,
    );
  }

  return deepFreeze({
    modelVersion:
      BLOG_TEMPLATE_MODEL_VERSION,

    ordering:
      BLOG_ORDERING,

    groups,
  });
}

export function normalizeBlogSettings(
  input = {},
) {
  const value =
    plainObject(
      input,
      'settings',
    );

  const theme =
    String(
      value.theme ??
      'classic',
    )
      .trim()
      .toLowerCase();

  if (
    Object.hasOwn(
      BLOG_THEME_PRESETS,
      theme,
    ) ===
    false
  ) {
    fail(
      'Blog theme is not one of the reviewed presets.',
      'unsupported_blog_theme',
      'theme',
    );
  }

  const featuredArticleCrabUrl =
    value.featuredArticleCrabUrl
      ? normalizeTypedCrabUrl(
          value.featuredArticleCrabUrl,
          [
            'article',
          ],
          'featuredArticleCrabUrl',
        )
      : '';

  return deepFreeze({
    title:
      boundedText(
        value.title ??
        'My Blog',
        120,
        'title',
        true,
      ),

    description:
      boundedText(
        value.description ??
        'Articles, notes, and updates.',
        320,
        'description',
      ),

    aboutTitle:
      boundedText(
        value.aboutTitle ??
        'About',
        120,
        'aboutTitle',
      ),

    aboutBody:
      boundedText(
        value.aboutBody ??
        'A creator-owned Blog published through CrabLink.',
        1200,
        'aboutBody',
      ),

    authorProfileCrabUrl:
      normalizeProfileRoute(
        value.authorProfileCrabUrl ??
        'crab://profile',
      ),

    featuredArticleCrabUrl,

    theme,

    listLimit:
      boundedInteger(
        value.listLimit ??
        20,
        1,
        50,
        'listLimit',
      ),

    archiveLimit:
      boundedInteger(
        value.archiveLimit ??
        50,
        1,
        50,
        'archiveLimit',
      ),

    references:
      normalizeReferences(
        value.references,
      ),
  });
}

function normalizePublications(
  input,
) {
  if (
    Array.isArray(
      input,
    ) ===
    false
  ) {
    fail(
      'Blog publications must be an array.',
      'invalid_publication_list',
      'publications',
    );
  }

  if (
    input.length >
    MAX_BLOG_ITEMS
  ) {
    fail(
      'Blog publication projection exceeds its reviewed bound.',
      'publication_limit_exceeded',
      'publications',
    );
  }

  return input
    .map(
      (item, index) =>
        normalizePublication(
          item,
          index,
        ),
    )
    .sort(
      compareNewestFirst,
    );
}

function normalizePublication(
  input,
  index,
) {
  const value =
    plainObject(
      input,
      `publications[${index}]`,
    );

  const crabUrl =
    normalizeTypedCrabUrl(
      value.crabUrl,
      BLOG_PUBLICATION_KINDS,
      `publications[${index}].crabUrl`,
    );

  const kind =
    crabUrl
      .split(
        '.',
      )
      .at(
        -1,
      );

  const publishedAt =
    normalizeTimestamp(
      value.publishedAt,
      `publications[${index}].publishedAt`,
    );

  return {
    crabUrl,

    kind,

    title:
      boundedText(
        value.title ??
        crabUrl,
        180,
        `publications[${index}].title`,
        true,
      ),

    summary:
      boundedText(
        value.summary ??
        '',
        1000,
        `publications[${index}].summary`,
      ),

    publishedAt,

    tags:
      normalizeTaxonomyList(
        value.tags,
        MAX_TAGS,
        `publications[${index}].tags`,
      ),

    categories:
      normalizeTaxonomyList(
        value.categories,
        MAX_CATEGORIES,
        `publications[${index}].categories`,
      ),
  };
}

function normalizeComments(
  input,
  articleCrabUrl,
) {
  if (
    Array.isArray(
      input,
    ) ===
    false
  ) {
    fail(
      'Blog comments must be an array.',
      'invalid_comment_list',
      'comments',
    );
  }

  if (
    input.length >
    MAX_BLOG_COMMENTS
  ) {
    fail(
      'Blog comment projection exceeds its reviewed bound.',
      'comment_limit_exceeded',
      'comments',
    );
  }

  return input
    .map(
      (comment, index) => {
        const value =
          plainObject(
            comment,
            `comments[${index}]`,
          );

        const crabUrl =
          normalizeTypedCrabUrl(
            value.crabUrl,
            [
              'comment',
            ],
            `comments[${index}].crabUrl`,
          );

        const parentCrabUrl =
          normalizeTypedCrabUrl(
            value.parentCrabUrl,
            [
              'article',
            ],
            `comments[${index}].parentCrabUrl`,
          );

        if (
          parentCrabUrl !==
          articleCrabUrl
        ) {
          fail(
            'Blog comment parent must match the viewed article.',
            'comment_parent_mismatch',
            `comments[${index}].parentCrabUrl`,
          );
        }

        return {
          crabUrl,

          parentCrabUrl,

          body:
            boundedText(
              value.body ??
              '',
              4000,
              `comments[${index}].body`,
              true,
            ),

          author:
            boundedText(
              value.author ??
              '',
              80,
              `comments[${index}].author`,
            ),

          publishedAt:
            normalizeTimestamp(
              value.publishedAt,
              `comments[${index}].publishedAt`,
            ),
        };
      },
    )
    .sort(
      compareOldestFirst,
    );
}

function collectTaxonomy(
  items,
  field,
  limit,
) {
  const values =
    [];

  for (
    const item
    of items
  ) {
    for (
      const value
      of item[field]
    ) {
      if (
        values.includes(
          value,
        ) ===
        false
      ) {
        values.push(
          value,
        );
      }
    }
  }

  return values
    .sort()
    .slice(
      0,
      limit,
    );
}

function normalizeTaxonomyList(
  input,
  limit,
  field,
) {
  if (
    input == null
  ) {
    return [];
  }

  if (
    Array.isArray(
      input,
    ) ===
    false
  ) {
    fail(
      'Blog taxonomy must be an array.',
      'invalid_taxonomy_list',
      field,
    );
  }

  if (
    input.length >
    limit
  ) {
    fail(
      'Blog taxonomy exceeds its reviewed bound.',
      'taxonomy_limit_exceeded',
      field,
    );
  }

  const values =
    [];

  for (
    const raw
    of input
  ) {
    const value =
      normalizeOptionalTaxonomy(
        raw,
        field,
      );

    if (
      value &&
      values.includes(
        value,
      ) ===
        false
    ) {
      values.push(
        value,
      );
    }
  }

  return values;
}

function normalizeOptionalTaxonomy(
  input,
  field,
) {
  const value =
    String(
      input ??
      '',
    )
      .trim()
      .toLowerCase();

  if (
    value ===
    ''
  ) {
    return '';
  }

  if (
    /^[a-z0-9][a-z0-9_-]{0,31}$/.test(
      value,
    ) ===
    false
  ) {
    fail(
      'Blog tag or category is not canonical.',
      'invalid_taxonomy',
      field,
    );
  }

  return value;
}

function normalizeProfileRoute(
  input,
) {
  const value =
    String(
      input ??
      '',
    ).trim();

  if (
    value ===
    'crab://profile'
  ) {
    return value;
  }

  if (
    /^crab:\/\/@[a-zA-Z0-9._-]{1,64}$/.test(
      value,
    )
  ) {
    return value;
  }

  fail(
    'Blog author profile must use a reviewed CrabLink profile route.',
    'invalid_author_profile',
    'authorProfileCrabUrl',
  );
}

function normalizeTypedCrabUrl(
  input,
  allowedKinds,
  field,
) {
  const value =
    String(
      input ??
      '',
    )
      .trim()
      .toLowerCase();

  const match =
    /^crab:\/\/([a-f0-9]{64})\.(article|post|comment|image)$/.exec(
      value,
    );

  if (
    match == null ||
    allowedKinds.includes(
      match[2],
    ) ===
      false
  ) {
    fail(
      'Blog content reference must be a reviewed typed crab:// B3 reference.',
      'invalid_typed_content_reference',
      field,
    );
  }

  return value;
}

function normalizeStatus(
  input,
) {
  const value =
    String(
      input ??
      'ready',
    )
      .trim()
      .toLowerCase();

  if (
    BLOG_STATES.includes(
      value,
    ) ===
    false
  ) {
    fail(
      'Blog projection status is invalid.',
      'invalid_blog_status',
      'status',
    );
  }

  return value;
}

function normalizeTimestamp(
  input,
  field,
) {
  const value =
    String(
      input ??
      '',
    ).trim();

  const timestamp =
    Date.parse(
      value,
    );

  if (
    Number.isFinite(
      timestamp,
    ) ===
    false
  ) {
    fail(
      'Blog publication timestamp is invalid.',
      'invalid_timestamp',
      field,
    );
  }

  return new Date(
    timestamp,
  ).toISOString();
}

function normalizeReferences(
  input,
) {
  if (
    input == null
  ) {
    return {};
  }

  return plainObject(
    input,
    'references',
  );
}

function boundedInteger(
  input,
  minimum,
  maximum,
  field,
) {
  const value =
    Number(
      input,
    );

  if (
    Number.isInteger(
      value,
    ) ===
      false ||
    value <
      minimum ||
    value >
      maximum
  ) {
    fail(
      'Blog numeric setting is outside the reviewed bound.',
      'invalid_numeric_setting',
      field,
    );
  }

  return value;
}

function boundedText(
  input,
  maximum,
  field,
  required = false,
) {
  const value =
    String(
      input ??
      '',
    ).trim();

  if (
    required &&
    value.length ===
      0
  ) {
    fail(
      'Required Blog text is missing.',
      'missing_required_text',
      field,
    );
  }

  if (
    value.length >
    maximum
  ) {
    fail(
      'Blog text exceeds its reviewed bound.',
      'text_limit_exceeded',
      field,
    );
  }

  return value;
}

function plainObject(
  input,
  field,
) {
  if (
    input &&
    typeof input ===
      'object' &&
    Array.isArray(
      input,
    ) ===
      false
  ) {
    return input;
  }

  fail(
    'Blog value must be an object.',
    'invalid_object',
    field,
  );
}

function compareNewestFirst(
  left,
  right,
) {
  const timeDifference =
    Date.parse(
      right.publishedAt,
    ) -
    Date.parse(
      left.publishedAt,
    );

  if (
    timeDifference
  ) {
    return timeDifference;
  }

  return left.crabUrl.localeCompare(
    right.crabUrl,
  );
}

function compareOldestFirst(
  left,
  right,
) {
  const timeDifference =
    Date.parse(
      left.publishedAt,
    ) -
    Date.parse(
      right.publishedAt,
    );

  if (
    timeDifference
  ) {
    return timeDifference;
  }

  return left.crabUrl.localeCompare(
    right.crabUrl,
  );
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
    Object.freeze(
      value,
    );

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
  }

  return value;
}

function fail(
  message,
  reason,
  field,
) {
  throw new BlogTemplateError(
    message,
    {
      reason,
      field,
    },
  );
}
