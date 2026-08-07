/**
 * RO:WHAT — Defines the strict platform-neutral PublicationSummaryV1 and bounded publication-page contracts.
 * RO:WHY — Profiles, Home, Explore, templates, gateway adapters, and test adapters need one canonical social-display projection.
 * RO:INTERACTS — svc-index creator projection, gateway/omnigate reads, CrabLink adapters, memory adapters, profile timelines, Home, Explore, and structured templates.
 * RO:INVARIANTS — read projection only; unknown fields reject; pagination is bounded; no follow mutation, wallet authority, ledger authority, receipt authority, entitlement authority, balance truth, or settlement truth.
 * RO:SECURITY — accepts public display metadata only; secrets, capabilities, private keys, PINs, recovery material, raw authorization, and economic mutation fields are not part of this DTO.
 * RO:TEST — publicationSummary.test.mjs.
 */

export const FINAL_BETA_PHASE6A1_PUBLICATION_SUMMARY_CONTRACT =
  'FINAL_BETA_PHASE6A1_PUBLICATION_SUMMARY_CONTRACT_V1';

export const PUBLICATION_SUMMARY_SCHEMA =
  'crablink.publication-summary.v1';

export const PUBLICATION_PAGE_SCHEMA =
  'crablink.publication-page.v1';

export const PUBLICATION_PAGE_DEFAULT_LIMIT =
  20;

export const PUBLICATION_PAGE_MAX_LIMIT =
  50;

export const PUBLICATION_CONTENT_KINDS =
  deepFreeze([
    'post',
    'article',
    'image',
    'video',
    'audio',
    'podcast',
    'music',
    'lyrics',
    'code',
    'game',
    'site',
    'stream',
  ]);

export const PUBLICATION_VISIBILITY_STATES =
  deepFreeze([
    'public',
    'unlisted',
    'private',
    'deleted',
    'blocked',
    'moderated',
  ]);

export const PUBLICATION_ACCESS_POSTURES =
  deepFreeze([
    'free',
    'paid',
  ]);

export const PUBLICATION_THUMBNAIL_KINDS =
  deepFreeze([
    'image',
    'video',
    'audio',
  ]);

export const PUBLICATION_PROJECTION_AUTHORITY =
  deepFreeze({
    readProjectionOnly: true,
    economicTruth: false,
    balanceAuthority: false,
    receiptAuthority: false,
    paidEntitlementAuthority: false,
    walletMutation: false,
    ledgerMutation: false,
    followMutation: false,
    settlementAuthority: false,
  });

const SUMMARY_FIELDS =
  new Set([
    'schema',
    'publicationId',
    'kind',
    'crabUrl',
    'title',
    'summary',
    'creator',
    'publishedAt',
    'updatedAt',
    'visibility',
    'access',
    'thumbnail',
    'references',
    'pinned',
  ]);

const CREATOR_FIELDS =
  new Set([
    'username',
    'displayName',
    'profileUrl',
    'avatarCid',
  ]);

const THUMBNAIL_FIELDS =
  new Set([
    'kind',
    'cid',
    'alt',
  ]);

const REFERENCE_FIELDS =
  new Set([
    'manifestCid',
    'contentCid',
    'siteUrl',
  ]);

const PAGE_FIELDS =
  new Set([
    'schema',
    'items',
    'nextCursor',
    'hasMore',
  ]);

const PAGE_REQUEST_FIELDS =
  new Set([
    'cursor',
    'limit',
  ]);

const USERNAME_PATTERN =
  /^[a-z0-9][a-z0-9_-]{2,31}$/;

const PUBLICATION_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const CURSOR_PATTERN =
  /^[A-Za-z0-9_-]{1,256}$/;

const CANONICAL_B3_CID_PATTERN =
  /^b3:[0-9a-f]{64}$/;

export function validatePublicationSummaryV1(
  raw,
) {
  const errors = [];

  projectPublicationSummaryV1(
    raw,
    errors,
  );

  return validationResult(
    errors,
  );
}

export function assertPublicationSummaryV1(
  raw,
) {
  const errors = [];
  const value =
    projectPublicationSummaryV1(
      raw,
      errors,
    );

  if (errors.length > 0) {
    throw new TypeError(
      `Invalid PublicationSummaryV1: ${errors.join('; ')}`,
    );
  }

  return value;
}

export const normalizePublicationSummaryV1 =
  assertPublicationSummaryV1;

export function normalizePublicationPageRequest(
  raw = {},
) {
  if (!isPlainObject(raw)) {
    throw new TypeError(
      'Publication page request must be a plain object.',
    );
  }

  const errors = [];

  rejectUnknownFields(
    raw,
    PAGE_REQUEST_FIELDS,
    'request',
    errors,
  );

  const cursor =
    normalizeOptionalCursor(
      raw.cursor,
      'request.cursor',
      errors,
    );

  const limit =
    raw.limit === undefined
      ? PUBLICATION_PAGE_DEFAULT_LIMIT
      : normalizePageLimit(
          raw.limit,
          'request.limit',
          errors,
        );

  if (errors.length > 0) {
    throw new TypeError(
      `Invalid publication page request: ${errors.join('; ')}`,
    );
  }

  return deepFreeze({
    cursor,
    limit,
  });
}

export function validatePublicationPageV1(
  raw,
) {
  const errors = [];

  projectPublicationPageV1(
    raw,
    errors,
  );

  return validationResult(
    errors,
  );
}

export function assertPublicationPageV1(
  raw,
) {
  const errors = [];
  const value =
    projectPublicationPageV1(
      raw,
      errors,
    );

  if (errors.length > 0) {
    throw new TypeError(
      `Invalid PublicationPageV1: ${errors.join('; ')}`,
    );
  }

  return value;
}

export const normalizePublicationPageV1 =
  assertPublicationPageV1;

function projectPublicationSummaryV1(
  raw,
  errors,
) {
  if (!isPlainObject(raw)) {
    errors.push(
      'summary must be a plain object',
    );

    return null;
  }

  rejectUnknownFields(
    raw,
    SUMMARY_FIELDS,
    'summary',
    errors,
  );

  const schema =
    normalizeExactString(
      raw.schema,
      PUBLICATION_SUMMARY_SCHEMA,
      'summary.schema',
      errors,
    );

  const publicationId =
    normalizePatternString(
      raw.publicationId,
      PUBLICATION_ID_PATTERN,
      128,
      'summary.publicationId',
      errors,
    );

  const kind =
    normalizeEnum(
      raw.kind,
      PUBLICATION_CONTENT_KINDS,
      'summary.kind',
      errors,
    );

  const crabUrl =
    normalizeCrabUrl(
      raw.crabUrl,
      'summary.crabUrl',
      errors,
    );

  const title =
    normalizeBoundedString(
      raw.title,
      160,
      'summary.title',
      errors,
      {
        required: false,
      },
    );

  const summary =
    normalizeBoundedString(
      raw.summary,
      500,
      'summary.summary',
      errors,
      {
        required: false,
      },
    );

  if (!title && !summary) {
    errors.push(
      'summary requires title or summary text',
    );
  }

  const creator =
    projectCreator(
      raw.creator,
      errors,
    );

  const publishedAt =
    normalizeIsoTimestamp(
      raw.publishedAt,
      'summary.publishedAt',
      errors,
    );

  const updatedAt =
    normalizeIsoTimestamp(
      raw.updatedAt,
      'summary.updatedAt',
      errors,
    );

  if (
    publishedAt &&
    updatedAt &&
    Date.parse(updatedAt) <
      Date.parse(publishedAt)
  ) {
    errors.push(
      'summary.updatedAt must not precede summary.publishedAt',
    );
  }

  const visibility =
    normalizeEnum(
      raw.visibility,
      PUBLICATION_VISIBILITY_STATES,
      'summary.visibility',
      errors,
    );

  const access =
    normalizeEnum(
      raw.access,
      PUBLICATION_ACCESS_POSTURES,
      'summary.access',
      errors,
    );

  const thumbnail =
    raw.thumbnail === undefined ||
    raw.thumbnail === null
      ? null
      : projectThumbnail(
          raw.thumbnail,
          errors,
        );

  const references =
    raw.references === undefined ||
    raw.references === null
      ? null
      : projectReferences(
          raw.references,
          errors,
        );

  const pinned =
    normalizeBoolean(
      raw.pinned,
      'summary.pinned',
      errors,
      false,
    );

  return deepFreeze({
    schema,
    publicationId,
    kind,
    crabUrl,
    title,
    summary,
    creator,
    publishedAt,
    updatedAt,
    visibility,
    access,
    thumbnail,
    references,
    pinned,
  });
}

function projectCreator(
  raw,
  errors,
) {
  if (!isPlainObject(raw)) {
    errors.push(
      'summary.creator must be a plain object',
    );

    return null;
  }

  rejectUnknownFields(
    raw,
    CREATOR_FIELDS,
    'summary.creator',
    errors,
  );

  const username =
    normalizePatternString(
      raw.username,
      USERNAME_PATTERN,
      32,
      'summary.creator.username',
      errors,
    );

  const displayName =
    normalizeBoundedString(
      raw.displayName,
      80,
      'summary.creator.displayName',
      errors,
    );

  const profileUrl =
    normalizeCrabUrl(
      raw.profileUrl,
      'summary.creator.profileUrl',
      errors,
    );

  if (
    username &&
    profileUrl &&
    profileUrl !==
      `crab://@${username}`
  ) {
    errors.push(
      'summary.creator.profileUrl must match summary.creator.username',
    );
  }

  const avatarCid =
    normalizeOptionalCid(
      raw.avatarCid,
      'summary.creator.avatarCid',
      errors,
    );

  return deepFreeze({
    username,
    displayName,
    profileUrl,
    avatarCid,
  });
}

function projectThumbnail(
  raw,
  errors,
) {
  if (!isPlainObject(raw)) {
    errors.push(
      'summary.thumbnail must be a plain object',
    );

    return null;
  }

  rejectUnknownFields(
    raw,
    THUMBNAIL_FIELDS,
    'summary.thumbnail',
    errors,
  );

  const kind =
    normalizeEnum(
      raw.kind,
      PUBLICATION_THUMBNAIL_KINDS,
      'summary.thumbnail.kind',
      errors,
    );

  const cid =
    normalizeCid(
      raw.cid,
      'summary.thumbnail.cid',
      errors,
    );

  const alt =
    normalizeBoundedString(
      raw.alt,
      180,
      'summary.thumbnail.alt',
      errors,
    );

  return deepFreeze({
    kind,
    cid,
    alt,
  });
}

function projectReferences(
  raw,
  errors,
) {
  if (!isPlainObject(raw)) {
    errors.push(
      'summary.references must be a plain object',
    );

    return null;
  }

  rejectUnknownFields(
    raw,
    REFERENCE_FIELDS,
    'summary.references',
    errors,
  );

  const manifestCid =
    normalizeOptionalCid(
      raw.manifestCid,
      'summary.references.manifestCid',
      errors,
    );

  const contentCid =
    normalizeOptionalCid(
      raw.contentCid,
      'summary.references.contentCid',
      errors,
    );

  const siteUrl =
    normalizeOptionalCrabUrl(
      raw.siteUrl,
      'summary.references.siteUrl',
      errors,
    );

  if (
    !manifestCid &&
    !contentCid &&
    !siteUrl
  ) {
    errors.push(
      'summary.references requires at least one reference',
    );
  }

  return deepFreeze({
    manifestCid,
    contentCid,
    siteUrl,
  });
}

function projectPublicationPageV1(
  raw,
  errors,
) {
  if (!isPlainObject(raw)) {
    errors.push(
      'page must be a plain object',
    );

    return null;
  }

  rejectUnknownFields(
    raw,
    PAGE_FIELDS,
    'page',
    errors,
  );

  const schema =
    normalizeExactString(
      raw.schema,
      PUBLICATION_PAGE_SCHEMA,
      'page.schema',
      errors,
    );

  let items = [];

  if (!Array.isArray(raw.items)) {
    errors.push(
      'page.items must be an array',
    );
  } else if (
    raw.items.length >
    PUBLICATION_PAGE_MAX_LIMIT
  ) {
    errors.push(
      `page.items must contain at most ${PUBLICATION_PAGE_MAX_LIMIT} publications`,
    );
  } else {
    items =
      raw.items.map(
        (item, index) => {
          const itemErrors = [];

          const projected =
            projectPublicationSummaryV1(
              item,
              itemErrors,
            );

          for (
            const error of itemErrors
          ) {
            errors.push(
              `page.items[${index}].${error}`,
            );
          }

          return projected;
        },
      );
  }

  const hasMore =
    normalizeBoolean(
      raw.hasMore,
      'page.hasMore',
      errors,
    );

  const nextCursor =
    normalizeOptionalCursor(
      raw.nextCursor,
      'page.nextCursor',
      errors,
    );

  if (
    hasMore === true &&
    !nextCursor
  ) {
    errors.push(
      'page.nextCursor is required when page.hasMore is true',
    );
  }

  if (
    hasMore === false &&
    nextCursor
  ) {
    errors.push(
      'page.nextCursor must be null when page.hasMore is false',
    );
  }

  return deepFreeze({
    schema,
    items,
    nextCursor,
    hasMore,
  });
}

function rejectUnknownFields(
  raw,
  allowlist,
  path,
  errors,
) {
  for (
    const key of Object.keys(raw)
  ) {
    if (!allowlist.has(key)) {
      errors.push(
        `${path}.${key} is unknown`,
      );
    }
  }
}

function normalizeExactString(
  value,
  expected,
  path,
  errors,
) {
  if (value !== expected) {
    errors.push(
      `${path} must equal ${expected}`,
    );

    return '';
  }

  return expected;
}

function normalizePatternString(
  value,
  pattern,
  maxLength,
  path,
  errors,
) {
  const clean =
    normalizeBoundedString(
      value,
      maxLength,
      path,
      errors,
    );

  if (
    clean &&
    !pattern.test(clean)
  ) {
    errors.push(
      `${path} has invalid syntax`,
    );
  }

  return clean;
}

function normalizeBoundedString(
  value,
  maxLength,
  path,
  errors,
  {
    required = true,
  } = {},
) {
  if (
    value === undefined ||
    value === null
  ) {
    if (required) {
      errors.push(
        `${path} is required`,
      );
    }

    return '';
  }

  if (typeof value !== 'string') {
    errors.push(
      `${path} must be a string`,
    );

    return '';
  }

  const clean =
    value.trim();

  if (
    required &&
    !clean
  ) {
    errors.push(
      `${path} must not be empty`,
    );
  }

  if (
    clean.length >
    maxLength
  ) {
    errors.push(
      `${path} exceeds ${maxLength} characters`,
    );
  }

  return clean;
}

function normalizeEnum(
  value,
  allowed,
  path,
  errors,
) {
  if (
    typeof value !== 'string' ||
    !allowed.includes(value)
  ) {
    errors.push(
      `${path} is not an allowed value`,
    );

    return '';
  }

  return value;
}

function normalizeBoolean(
  value,
  path,
  errors,
  fallback,
) {
  if (
    value === undefined &&
    fallback !== undefined
  ) {
    return fallback;
  }

  if (typeof value !== 'boolean') {
    errors.push(
      `${path} must be boolean`,
    );

    return false;
  }

  return value;
}

function normalizeIsoTimestamp(
  value,
  path,
  errors,
) {
  if (
    typeof value !== 'string' ||
    !value
  ) {
    errors.push(
      `${path} must be an ISO timestamp`,
    );

    return '';
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    ) ||
    parsed.toISOString() !==
      value
  ) {
    errors.push(
      `${path} must be a canonical ISO timestamp`,
    );

    return '';
  }

  return value;
}

function normalizeCrabUrl(
  value,
  path,
  errors,
) {
  const clean =
    normalizeBoundedString(
      value,
      1024,
      path,
      errors,
    );

  if (
    clean &&
    !clean.startsWith(
      'crab://',
    )
  ) {
    errors.push(
      `${path} must use crab://`,
    );
  }

  return clean;
}

function normalizeOptionalCrabUrl(
  value,
  path,
  errors,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  return normalizeCrabUrl(
    value,
    path,
    errors,
  );
}

function normalizeCid(
  value,
  path,
  errors,
) {
  const clean =
    normalizeBoundedString(
      value,
      67,
      path,
      errors,
    ).toLowerCase();

  if (
    clean &&
    !CANONICAL_B3_CID_PATTERN.test(
      clean,
    )
  ) {
    errors.push(
      `${path} must be a canonical b3 CID`,
    );
  }

  return clean;
}

function normalizeOptionalCid(
  value,
  path,
  errors,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  return normalizeCid(
    value,
    path,
    errors,
  );
}

function normalizeOptionalCursor(
  value,
  path,
  errors,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  if (
    typeof value !== 'string' ||
    !CURSOR_PATTERN.test(value)
  ) {
    errors.push(
      `${path} must be an opaque bounded cursor`,
    );

    return null;
  }

  return value;
}

function normalizePageLimit(
  value,
  path,
  errors,
) {
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value >
      PUBLICATION_PAGE_MAX_LIMIT
  ) {
    errors.push(
      `${path} must be an integer from 1 through ${PUBLICATION_PAGE_MAX_LIMIT}`,
    );

    return PUBLICATION_PAGE_DEFAULT_LIMIT;
  }

  return value;
}

function validationResult(
  errors,
) {
  return deepFreeze({
    ok:
      errors.length === 0,
    errors:
      [...errors],
  });
}

function isPlainObject(
  value,
) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) ===
      Object.prototype
  );
}

function deepFreeze(
  value,
) {
  if (
    !value ||
    typeof value !== 'object' ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  for (
    const child of Object.values(value)
  ) {
    deepFreeze(child);
  }

  return Object.freeze(value);
}
