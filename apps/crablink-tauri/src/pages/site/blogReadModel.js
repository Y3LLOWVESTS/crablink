/**
 * RO:WHAT — Network-backed read projection for FINAL_BETA Blog sites.
 * RO:WHY — Builds Blog landing/archive presentation from canonical public publication summaries.
 * RO:INTERACTS — PublicationSummaryV1, publicationAdapter, BlogReaderPresentation, resolved Site DTOs.
 * RO:INVARIANTS — exact Site-reference match; article/post only; public visibility only; chronological ordering.
 * RO:SECURITY — read projection only; no local session memory as publication truth and no wallet/ledger/publication mutation.
 * RO:TEST — node --test blogReadPresentation.test.mjs.
 */

export const BLOG_READ_MODEL_VERSION =
  'crablink.blog-read.v1';

export const BLOG_READ_CATEGORIES =
  Object.freeze([
    'all',
    'article',
    'post',
  ]);

const BLOG_KINDS =
  new Set([
    'article',
    'post',
  ]);

const MAX_BLOG_PUBLICATIONS =
  50;

const MAX_SITE_TAGS =
  24;

export function isResolvedBlogSite(
  result,
) {
  const raw =
    plainObject(
      result?.data,
    );

  const candidates =
    [
      raw,
      plainObject(
        raw.page,
      ),
      plainObject(
        raw.site,
      ),
      plainObject(
        raw.manifest,
      ),
      plainObject(
        raw.site_manifest,
      ),
      plainObject(
        raw.page?.manifest,
      ),
      plainObject(
        raw.site?.manifest,
      ),
    ];

  for (
    const candidate
    of candidates
  ) {
    const templateId =
      clean(
        candidate.template_id ??
        candidate.templateId ??
        candidate.template?.id,
      )
        .toLowerCase();

    if (
      templateId ===
      'blog'
    ) {
      return true;
    }
  }

  return false;
}

export function projectResolvedBlogPublications({
  result,
  publications = [],
  category = 'all',
} = {}) {
  const selectedCategory =
    normalizeCategory(
      category,
    );

  const siteCrabUrl =
    normalizeNamedSiteUrl(
      result?.summary?.crabUrl ??
      (
        result?.summary?.siteName
          ? `crab://${result.summary.siteName}`
          : ''
      ),
    );

  if (
    Array.isArray(
      publications,
    ) ===
    false
  ) {
    throw new TypeError(
      'Blog read publications must be an array.',
    );
  }

  const normalized =
    publications
      .slice(
        0,
        MAX_BLOG_PUBLICATIONS,
      )
      .map(
        normalizePublication,
      )
      .filter(
        (item) =>
          item !==
          null,
      )
      .filter(
        (item) =>
          item.siteUrl ===
          siteCrabUrl,
      )
      .filter(
        (item) =>
          item.visibility ===
          'public',
      )
      .sort(
        newestFirst,
      );

  const filtered =
    selectedCategory ===
      'all'
      ? normalized
      : normalized.filter(
          (item) =>
            item.kind ===
            selectedCategory,
        );

  const featured =
    normalized.find(
      (item) =>
        item.kind ===
        'article',
    ) ??
    null;

  const archive =
    buildArchive(
      normalized,
    );

  const siteTags =
    normalizeSiteTags(
      result?.summary?.tags,
    );

  return deepFreeze({
    modelVersion:
      BLOG_READ_MODEL_VERSION,

    siteCrabUrl,

    category:
      selectedCategory,

    ordering:
      'chronological',

    state:
      filtered.length >
        0
        ? 'ready'
        : 'empty',

    featured,

    items:
      filtered,

    allItems:
      normalized,

    archive,

    siteTags,

    counts: {
      all:
        normalized.length,

      article:
        normalized.filter(
          (item) =>
            item.kind ===
            'article',
        ).length,

      post:
        normalized.filter(
          (item) =>
            item.kind ===
            'post',
        ).length,
    },
  });
}

function normalizePublication(
  raw,
) {
  if (
    raw ===
      null ||
    typeof raw !==
      'object' ||
    Array.isArray(
      raw,
    )
  ) {
    return null;
  }

  const kind =
    clean(
      raw.kind,
    ).toLowerCase();

  if (
    BLOG_KINDS.has(
      kind,
    ) ===
    false
  ) {
    return null;
  }

  const crabUrl =
    clean(
      raw.crabUrl,
    ).toLowerCase();

  const typedPattern =
    new RegExp(
      `^crab://[a-f0-9]{64}\\.${kind}$`,
    );

  if (
    typedPattern.test(
      crabUrl,
    ) ===
    false
  ) {
    return null;
  }

  const siteUrl =
    normalizeOptionalNamedSiteUrl(
      raw.references
        ?.siteUrl,
    );

  if (
    siteUrl ===
    ''
  ) {
    return null;
  }

  const publishedAt =
    normalizeTimestamp(
      raw.publishedAt,
    );

  if (
    publishedAt ===
    ''
  ) {
    return null;
  }

  const visibility =
    clean(
      raw.visibility,
    )
      .toLowerCase();

  return {
    publicationId:
      clean(
        raw.publicationId,
      ),

    kind,

    crabUrl,

    title:
      clean(
        raw.title,
      ) ||
      (
        kind ===
          'article'
          ? 'Untitled article'
          : 'Untitled post'
      ),

    summary:
      clean(
        raw.summary,
      ),

    publishedAt,

    updatedAt:
      normalizeTimestamp(
        raw.updatedAt,
      ) ||
      publishedAt,

    visibility,

    access:
      clean(
        raw.access,
      ).toLowerCase(),

    creator:
      normalizeCreator(
        raw.creator,
      ),

    siteUrl,
  };
}

function normalizeCreator(
  raw,
) {
  const value =
    plainObject(
      raw,
    );

  return {
    username:
      clean(
        value.username,
      )
        .toLowerCase(),

    displayName:
      clean(
        value.displayName,
      ),

    profileUrl:
      clean(
        value.profileUrl,
      )
        .toLowerCase(),
  };
}

function buildArchive(
  items,
) {
  const groups =
    [];

  for (
    const item
    of items
  ) {
    const date =
      new Date(
        item.publishedAt,
      );

    const key =
      [
        date.getUTCFullYear(),
        String(
          date.getUTCMonth() +
          1,
        ).padStart(
          2,
          '0',
        ),
      ].join(
        '-',
      );

    let group =
      groups.find(
        (candidate) =>
          candidate.key ===
          key,
      );

    if (
      group ===
      undefined
    ) {
      group = {
        key,

        label:
          date.toLocaleDateString(
            'en-US',
            {
              month:
                'long',

              year:
                'numeric',

              timeZone:
                'UTC',
            },
          ),

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

  return groups;
}

function normalizeSiteTags(
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

  return input
    .map(
      (tag) =>
        clean(
          tag,
        )
          .toLowerCase(),
    )
    .filter(
      Boolean,
    )
    .filter(
      (
        tag,
        index,
        all,
      ) =>
        all.indexOf(
          tag,
        ) ===
        index,
    )
    .slice(
      0,
      MAX_SITE_TAGS,
    );
}

function normalizeCategory(
  input,
) {
  const value =
    clean(
      input,
    ).toLowerCase();

  if (
    BLOG_READ_CATEGORIES.includes(
      value,
    )
  ) {
    return value;
  }

  throw new TypeError(
    'Blog read category is invalid.',
  );
}

function normalizeNamedSiteUrl(
  input,
) {
  const value =
    normalizeOptionalNamedSiteUrl(
      input,
    );

  if (
    value
  ) {
    return value;
  }

  throw new TypeError(
    'Blog read projection requires a named Site URL.',
  );
}

function normalizeOptionalNamedSiteUrl(
  input,
) {
  const value =
    clean(
      input,
    ).toLowerCase();

  if (
    /^crab:\/\/[a-z0-9_.-]{1,80}$/.test(
      value,
    )
  ) {
    return value;
  }

  return '';
}

function normalizeTimestamp(
  input,
) {
  const value =
    clean(
      input,
    );

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
    return '';
  }

  return new Date(
    timestamp,
  ).toISOString();
}

function newestFirst(
  left,
  right,
) {
  const difference =
    Date.parse(
      right.publishedAt,
    ) -
    Date.parse(
      left.publishedAt,
    );

  if (
    difference !==
    0
  ) {
    return difference;
  }

  return left.crabUrl.localeCompare(
    right.crabUrl,
  );
}

function clean(
  input,
) {
  return String(
    input ??
    '',
  ).trim();
}

function plainObject(
  input,
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

  return {};
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
