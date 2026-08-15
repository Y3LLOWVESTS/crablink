/**
 * RO:WHAT — Strict CrabLink desktop reader for durable Site-publication root pages.
 * RO:WHY — FINAL_BETA Phase 15 needs Forum roots from reviewed gateway truth rather than local navigation state.
 * RO:INTERACTS — GatewayClient.request, GET /site-publications, forumSitePublicationReadModel.
 * RO:INVARIANTS — exact named Site; opaque bounded cursor; max 100 items; strict Site-publication wire shape.
 * RO:SECURITY — creatorDisplay is display-only; gateway read only; no identity, publication, moderation, wallet, ledger, follow, QuickChain, ROX, or Solana authority.
 * RO:TEST — sitePublicationAdapter.test.mjs.
 */

// FINAL_BETA_PHASE15A4A2C3_DESKTOP_SITE_PUBLICATION_ADAPTER_V1

export const SITE_PUBLICATION_SCHEMA =
  'crablink.site-publication.v1';

export const SITE_PUBLICATION_PAGE_SCHEMA =
  'crablink.site-publication-page.v1';

export const SITE_PUBLICATION_DEFAULT_LIMIT =
  20;

export const SITE_PUBLICATION_MAX_LIMIT =
  100;

export const SITE_PUBLICATION_MAX_TAGS =
  32;

export const SITE_PUBLICATION_MAX_TAG_LENGTH =
  128;

const MAX_CURSOR_LENGTH =
  128;

const MAX_PUBLICATION_ID_LENGTH =
  256;

const MAX_TITLE_LENGTH =
  512;

const MAX_SUMMARY_LENGTH =
  8192;

const MAX_CREATOR_DISPLAY_LENGTH =
  512;

const MAX_SAFE_DATE_MS =
  8_640_000_000_000_000;

const NAMED_SITE_PATTERN =
  /^crab:\/\/[a-z0-9][a-z0-9_-]{0,62}$/u;

const TYPED_ROOT_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.(post|image|article)$/u;

const B3_CID_PATTERN =
  /^b3:[0-9a-f]{64}$/u;

const ROOT_KINDS =
  new Set([
    'post',
    'image',
    'article',
  ]);

const VISIBILITIES =
  new Set([
    'public',
    'public_preview',
    'unlisted',
    'private',
    'deleted',
    'blocked',
    'moderated',
  ]);

const PAGE_FIELDS =
  new Set([
    'schema',
    'items',
    'nextCursor',
    'hasMore',
  ]);

const PUBLICATION_FIELDS =
  new Set([
    'schema',
    'publicationId',
    'kind',
    'crabUrl',
    'title',
    'summary',
    'creatorDisplay',
    'createdAtMs',
    'visibility',
    'references',
    'tags',
    'siteCrabUrl',
  ]);

const REFERENCE_FIELDS =
  new Set([
    'manifestCid',
    'contentCid',
    'siteUrl',
  ]);

export class SitePublicationReadError extends TypeError {
  constructor(
    message,
    reason =
      'site_publication_read_error',
  ) {
    super(
      String(
        message ||
          'Site-publication read validation failed.',
      ),
    );

    this.name =
      'SitePublicationReadError';

    this.reason =
      reason;
  }
}

export function createSitePublicationAdapter(
  gatewayClient,
) {
  const gateway =
    requireGatewayClient(
      gatewayClient,
    );

  return Object.freeze({
    async listSitePublications(
      request =
        {},
    ) {
      const normalized =
        normalizeListRequest(
          request,
        );

      const query =
        new URLSearchParams();

      query.set(
        'siteCrabUrl',
        normalized.siteCrabUrl,
      );

      if (
        normalized.cursor
      ) {
        query.set(
          'cursor',
          normalized.cursor,
        );
      }

      query.set(
        'limit',
        String(
          normalized.limit,
        ),
      );

      const response =
        await gateway.request(
          `/site-publications?${query.toString()}`,
          {
            label:
              'Site publications',
          },
        );

      return assertSitePublicationPageV1(
        unwrapGatewayData(
          response,
        ),
      );
    },
  });
}

export function assertSitePublicationPageV1(
  raw,
) {
  const page =
    requirePlainObject(
      raw,
      'Site-publication page',
      'invalid_site_publication_page',
    );

  assertAllowedKeys(
    page,
    PAGE_FIELDS,
    'Site-publication page',
  );

  if (
    page.schema !==
      SITE_PUBLICATION_PAGE_SCHEMA
  ) {
    fail(
      'Site-publication page schema is unsupported.',
      'unsupported_site_publication_page_schema',
    );
  }

  if (
    Array.isArray(
      page.items,
    ) ===
      false
  ) {
    fail(
      'Site-publication page items must be an array.',
      'invalid_site_publication_items',
    );
  }

  if (
    page.items.length >
      SITE_PUBLICATION_MAX_LIMIT
  ) {
    fail(
      'Site-publication page exceeds the reviewed 100-item bound.',
      'site_publication_page_limit_exceeded',
    );
  }

  if (
    typeof page.hasMore !==
      'boolean'
  ) {
    fail(
      'Site-publication hasMore must be boolean.',
      'invalid_site_publication_has_more',
    );
  }

  const nextCursor =
    normalizeCursor(
      page.nextCursor,
      true,
    );

  if (
    page.hasMore ===
      true &&
    nextCursor.length ===
      0
  ) {
    fail(
      'Site-publication page with more results requires an opaque next cursor.',
      'missing_site_publication_next_cursor',
    );
  }

  const items =
    page.items.map(
      (
        item,
        index,
      ) =>
        assertSitePublicationV1(
          item,
          index,
        ),
    );

  return deepFreeze({
    schema:
      SITE_PUBLICATION_PAGE_SCHEMA,

    items,

    nextCursor:
      nextCursor ||
      null,

    hasMore:
      page.hasMore,
  });
}

export function assertSitePublicationV1(
  raw,
  index =
    0,
) {
  const value =
    requirePlainObject(
      raw,
      `Site-publication item ${index}`,
      'invalid_site_publication_item',
    );

  assertAllowedKeys(
    value,
    PUBLICATION_FIELDS,
    `Site-publication item ${index}`,
  );

  if (
    value.schema !==
      SITE_PUBLICATION_SCHEMA
  ) {
    fail(
      'Site-publication item schema is unsupported.',
      'unsupported_site_publication_schema',
    );
  }

  const publicationId =
    boundedRequiredText(
      value.publicationId,
      MAX_PUBLICATION_ID_LENGTH,
      'publicationId',
    );

  const kind =
    String(
      value.kind ??
        '',
    )
      .trim()
      .toLowerCase();

  if (
    ROOT_KINDS.has(
      kind,
    ) ===
      false
  ) {
    fail(
      'Site-publication kind must be Post, Image, or Article.',
      'invalid_site_publication_kind',
    );
  }

  const crabUrl =
    String(
      value.crabUrl ??
        '',
    )
      .trim()
      .toLowerCase();

  const typedMatch =
    crabUrl.match(
      TYPED_ROOT_PATTERN,
    );

  if (
    typedMatch ===
      null ||
    typedMatch[1] !==
      kind
  ) {
    fail(
      'Site-publication crab URL must be canonical and match its root kind.',
      'invalid_site_publication_crab_url',
    );
  }

  const siteCrabUrl =
    normalizeNamedSite(
      value.siteCrabUrl,
      'siteCrabUrl',
    );

  const references =
    normalizeReferences(
      value.references,
      siteCrabUrl,
    );

  const createdAtMs =
    Number(
      value.createdAtMs,
    );

  if (
    Number.isSafeInteger(
      createdAtMs,
    ) ===
      false ||
    createdAtMs <
      0 ||
    createdAtMs >
      MAX_SAFE_DATE_MS
  ) {
    fail(
      'Site-publication createdAtMs is outside the supported timestamp bound.',
      'invalid_site_publication_created_at',
    );
  }

  const visibility =
    String(
      value.visibility ??
        '',
    )
      .trim()
      .toLowerCase();

  if (
    VISIBILITIES.has(
      visibility,
    ) ===
      false
  ) {
    fail(
      'Site-publication visibility is unsupported.',
      'invalid_site_publication_visibility',
    );
  }

  const tags =
    normalizeTags(
      value.tags,
    );

  const creatorDisplay =
    value.creatorDisplay ===
        null ||
      value.creatorDisplay ===
        undefined
      ? null
      : boundedOptionalText(
          value.creatorDisplay,
          MAX_CREATOR_DISPLAY_LENGTH,
          'creatorDisplay',
        );

  return deepFreeze({
    schema:
      SITE_PUBLICATION_SCHEMA,

    publicationId,

    kind,

    crabUrl,

    title:
      boundedOptionalText(
        value.title,
        MAX_TITLE_LENGTH,
        'title',
      ),

    summary:
      boundedOptionalText(
        value.summary,
        MAX_SUMMARY_LENGTH,
        'summary',
      ),

    creatorDisplay:
      creatorDisplay ||
      null,

    createdAtMs,

    visibility,

    references,

    tags,

    siteCrabUrl,
  });
}

function normalizeListRequest(
  request,
) {
  const source =
    request &&
    typeof request ===
      'object' &&
    Array.isArray(
      request,
    ) ===
      false
      ? request
      : {};

  const siteCrabUrl =
    normalizeNamedSite(
      source.siteCrabUrl,
      'siteCrabUrl',
    );

  const cursor =
    normalizeCursor(
      source.cursor,
      true,
    );

  const limit =
    source.limit ===
        null ||
      source.limit ===
        undefined
      ? SITE_PUBLICATION_DEFAULT_LIMIT
      : Number(
          source.limit,
        );

  if (
    Number.isSafeInteger(
      limit,
    ) ===
      false ||
    limit <
      1 ||
    limit >
      SITE_PUBLICATION_MAX_LIMIT
  ) {
    fail(
      'Site-publication limit must be an integer from 1 through 100.',
      'invalid_site_publication_limit',
    );
  }

  return Object.freeze({
    siteCrabUrl,
    cursor,
    limit,
  });
}

function normalizeReferences(
  raw,
  siteCrabUrl,
) {
  const references =
    requirePlainObject(
      raw,
      'Site-publication references',
      'invalid_site_publication_references',
    );

  assertAllowedKeys(
    references,
    REFERENCE_FIELDS,
    'Site-publication references',
  );

  const manifestCid =
    normalizeOptionalCid(
      references.manifestCid,
      'manifestCid',
    );

  const contentCid =
    normalizeOptionalCid(
      references.contentCid,
      'contentCid',
    );

  const referenceSite =
    references.siteUrl ===
        null ||
      references.siteUrl ===
        undefined
      ? null
      : normalizeNamedSite(
          references.siteUrl,
          'references.siteUrl',
        );

  if (
    referenceSite !==
      null &&
    referenceSite !==
      siteCrabUrl
  ) {
    fail(
      'Site-publication Site does not match its publication Site reference.',
      'site_publication_site_mismatch',
    );
  }

  return deepFreeze({
    manifestCid,

    contentCid,

    siteUrl:
      referenceSite,
  });
}

function normalizeTags(
  raw,
) {
  const source =
    raw ===
      undefined ||
    raw ===
      null
      ? []
      : raw;

  if (
    Array.isArray(
      source,
    ) ===
      false
  ) {
    fail(
      'Site-publication tags must be an array.',
      'invalid_site_publication_tags',
    );
  }

  if (
    source.length >
      SITE_PUBLICATION_MAX_TAGS
  ) {
    fail(
      'Site-publication tags exceed the reviewed 32-tag bound.',
      'site_publication_tag_limit_exceeded',
    );
  }

  return deepFreeze(
    source.map(
      (
        tag,
        index,
      ) => {
        const normalized =
          String(
            tag ??
              '',
          ).trim();

        if (
          normalized.length <
            1 ||
          normalized.length >
            SITE_PUBLICATION_MAX_TAG_LENGTH
        ) {
          fail(
            `Site-publication tag ${index} is outside the reviewed bound.`,
            'invalid_site_publication_tag',
          );
        }

        return normalized;
      },
    ),
  );
}

function normalizeOptionalCid(
  raw,
  label,
) {
  if (
    raw ===
      null ||
    raw ===
      undefined
  ) {
    return null;
  }

  const value =
    String(
      raw,
    )
      .trim()
      .toLowerCase();

  if (
    B3_CID_PATTERN.test(
      value,
    ) ===
      false
  ) {
    fail(
      `${label} must be a canonical B3 CID.`,
      'invalid_site_publication_b3',
    );
  }

  return value;
}

function normalizeNamedSite(
  raw,
  label,
) {
  const value =
    String(
      raw ??
        '',
    )
      .trim()
      .toLowerCase();

  if (
    NAMED_SITE_PATTERN.test(
      value,
    ) ===
      false
  ) {
    fail(
      `${label} must be a canonical named crab Site URL.`,
      'invalid_site_publication_site',
    );
  }

  return value;
}

function normalizeCursor(
  raw,
  allowEmpty,
) {
  if (
    raw ===
      null ||
    raw ===
      undefined
  ) {
    return '';
  }

  const value =
    String(
      raw,
    ).trim();

  if (
    value.length >
      MAX_CURSOR_LENGTH
  ) {
    fail(
      'Site-publication cursor exceeds the supported bound.',
      'invalid_site_publication_cursor',
    );
  }

  if (
    allowEmpty ===
      false &&
    value.length ===
      0
  ) {
    fail(
      'Site-publication cursor is required.',
      'invalid_site_publication_cursor',
    );
  }

  return value;
}

function boundedRequiredText(
  raw,
  maximum,
  label,
) {
  const value =
    String(
      raw ??
        '',
    ).trim();

  if (
    value.length <
      1 ||
    value.length >
      maximum
  ) {
    fail(
      `${label} is outside the supported bound.`,
      'invalid_site_publication_text',
    );
  }

  return value;
}

function boundedOptionalText(
  raw,
  maximum,
  label,
) {
  const value =
    String(
      raw ??
        '',
    ).trim();

  if (
    value.length >
      maximum
  ) {
    fail(
      `${label} exceeds the supported bound.`,
      'invalid_site_publication_text',
    );
  }

  return value;
}

function assertAllowedKeys(
  value,
  allowed,
  label,
) {
  for (
    const key
    of Object.keys(
      value,
    )
  ) {
    if (
      allowed.has(
        key,
      ) ===
        false
    ) {
      fail(
        `${label} contains unknown field ${key}.`,
        'unknown_site_publication_field',
      );
    }
  }
}

function requirePlainObject(
  value,
  label,
  reason,
) {
  if (
    value &&
    typeof value ===
      'object' &&
    Array.isArray(
      value,
    ) ===
      false
  ) {
    return value;
  }

  fail(
    `${label} must be an object.`,
    reason,
  );
}

function requireGatewayClient(
  value,
) {
  if (
    value &&
    typeof value ===
      'object' &&
    typeof value.request ===
      'function'
  ) {
    return value;
  }

  fail(
    'Site-publication adapter requires GatewayClient.request.',
    'invalid_site_publication_gateway',
  );
}

function unwrapGatewayData(
  response,
) {
  if (
    response &&
    typeof response ===
      'object' &&
    Object.prototype
      .hasOwnProperty
      .call(
        response,
        'data',
      )
  ) {
    return response.data;
  }

  if (
    response &&
    typeof response ===
      'object' &&
    Object.prototype
      .hasOwnProperty
      .call(
        response,
        'body',
      )
  ) {
    return response.body;
  }

  return response;
}

function fail(
  message,
  reason,
) {
  throw new SitePublicationReadError(
    message,
    reason,
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

    Object.freeze(
      value,
    );
  }

  return value;
}
