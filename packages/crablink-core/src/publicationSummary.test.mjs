import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FINAL_BETA_PHASE6A1_PUBLICATION_SUMMARY_CONTRACT,
  PUBLICATION_ACCESS_POSTURES,
  PUBLICATION_CONTENT_KINDS,
  PUBLICATION_PAGE_DEFAULT_LIMIT,
  PUBLICATION_PAGE_MAX_LIMIT,
  PUBLICATION_PAGE_SCHEMA,
  PUBLICATION_PROJECTION_AUTHORITY,
  PUBLICATION_SUMMARY_SCHEMA,
  PUBLICATION_VISIBILITY_STATES,
  assertPublicationPageV1,
  assertPublicationSummaryV1,
  normalizePublicationPageRequest,
  validatePublicationPageV1,
  validatePublicationSummaryV1,
} from './publicationSummary.js';

const HASH =
  'a'.repeat(64);

const OTHER_HASH =
  'b'.repeat(64);

function validSummary(
  overrides = {},
) {
  return {
    schema:
      PUBLICATION_SUMMARY_SCHEMA,
    publicationId:
      'publication-001',
    kind:
      'post',
    crabUrl:
      `crab://${HASH}.post`,
    title:
      'A canonical publication',
    summary:
      'A bounded summary suitable for profile, Home, Explore, and template cards.',
    creator: {
      username:
        'rusty_crab',
      displayName:
        'Rusty Crab',
      profileUrl:
        'crab://@rusty_crab',
      avatarCid:
        `b3:${OTHER_HASH}`,
    },
    publishedAt:
      '2026-08-04T18:00:00.000Z',
    updatedAt:
      '2026-08-04T18:05:00.000Z',
    visibility:
      'public',
    access:
      'free',
    thumbnail: {
      kind:
        'image',
      cid:
        `b3:${HASH}`,
      alt:
        'Publication thumbnail',
    },
    references: {
      manifestCid:
        `b3:${HASH}`,
      contentCid:
        `b3:${OTHER_HASH}`,
      siteUrl:
        'crab://site/rusty-crab',
    },
    pinned:
      false,
    ...overrides,
  };
}

test('Phase 6A1 accepts one strict PublicationSummaryV1 projection', () => {
  const value =
    assertPublicationSummaryV1(
      validSummary(),
    );

  assert.equal(
    FINAL_BETA_PHASE6A1_PUBLICATION_SUMMARY_CONTRACT,
    'FINAL_BETA_PHASE6A1_PUBLICATION_SUMMARY_CONTRACT_V1',
  );

  assert.equal(
    value.schema,
    PUBLICATION_SUMMARY_SCHEMA,
  );

  assert.equal(
    value.creator.username,
    'rusty_crab',
  );

  assert.equal(
    value.access,
    'free',
  );

  assert.equal(
    value.pinned,
    false,
  );

  assert.equal(
    Object.isFrozen(value),
    true,
  );

  assert.equal(
    Object.isFrozen(value.creator),
    true,
  );

  assert.equal(
    Object.isFrozen(value.thumbnail),
    true,
  );
});

test('Phase 6A1 locks typed publication kinds, visibility, and access posture', () => {
  assert.deepEqual(
    PUBLICATION_CONTENT_KINDS,
    [
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
    ],
  );

  assert.deepEqual(
    PUBLICATION_VISIBILITY_STATES,
    [
      'public',
      'unlisted',
      'private',
      'deleted',
      'blocked',
      'moderated',
    ],
  );

  assert.deepEqual(
    PUBLICATION_ACCESS_POSTURES,
    [
      'free',
      'paid',
    ],
  );

  for (
    const kind of PUBLICATION_CONTENT_KINDS
  ) {
    assert.equal(
      assertPublicationSummaryV1(
        validSummary({
          kind,
        }),
      ).kind,
      kind,
    );
  }
});

test('Phase 6A1 rejects unknown top-level and nested fields', () => {
  const topLevel =
    validatePublicationSummaryV1({
      ...validSummary(),
      secretCapability:
        'forbidden',
    });

  assert.equal(
    topLevel.ok,
    false,
  );

  assert.match(
    topLevel.errors.join('\n'),
    /summary\.secretCapability is unknown/,
  );

  const creator =
    validatePublicationSummaryV1(
      validSummary({
        creator: {
          ...validSummary().creator,
          privateKey:
            'forbidden',
        },
      }),
    );

  assert.equal(
    creator.ok,
    false,
  );

  assert.match(
    creator.errors.join('\n'),
    /summary\.creator\.privateKey is unknown/,
  );

  const thumbnail =
    validatePublicationSummaryV1(
      validSummary({
        thumbnail: {
          ...validSummary().thumbnail,
          rawBytes:
            'forbidden',
        },
      }),
    );

  assert.equal(
    thumbnail.ok,
    false,
  );

  assert.match(
    thumbnail.errors.join('\n'),
    /summary\.thumbnail\.rawBytes is unknown/,
  );
});

test('Phase 6A1 enforces bounded identifiers, text, routes, usernames, and cursors', () => {
  assert.throws(
    () =>
      assertPublicationSummaryV1(
        validSummary({
          publicationId:
            'x'.repeat(129),
        }),
      ),
    /publicationId/,
  );

  assert.throws(
    () =>
      assertPublicationSummaryV1(
        validSummary({
          title:
            'x'.repeat(161),
        }),
      ),
    /title exceeds 160/,
  );

  assert.throws(
    () =>
      assertPublicationSummaryV1(
        validSummary({
          summary:
            'x'.repeat(501),
        }),
      ),
    /summary exceeds 500/,
  );

  assert.throws(
    () =>
      assertPublicationSummaryV1(
        validSummary({
          crabUrl:
            'https://example.com',
        }),
      ),
    /must use crab:\/\//,
  );

  assert.throws(
    () =>
      assertPublicationSummaryV1(
        validSummary({
          creator: {
            ...validSummary().creator,
            username:
              'Invalid Username',
          },
        }),
      ),
    /username has invalid syntax/,
  );

  assert.throws(
    () =>
      normalizePublicationPageRequest({
        cursor:
          'x'.repeat(257),
      }),
    /bounded cursor/,
  );
});

test('Phase 6A1 requires coherent creator identity and canonical timestamps', () => {
  assert.throws(
    () =>
      assertPublicationSummaryV1(
        validSummary({
          creator: {
            ...validSummary().creator,
            profileUrl:
              'crab://@different_user',
          },
        }),
      ),
    /profileUrl must match/,
  );

  assert.throws(
    () =>
      assertPublicationSummaryV1(
        validSummary({
          publishedAt:
            'not-a-time',
        }),
      ),
    /canonical ISO timestamp/,
  );

  assert.throws(
    () =>
      assertPublicationSummaryV1(
        validSummary({
          updatedAt:
            '2026-08-04T17:00:00.000Z',
        }),
      ),
    /must not precede/,
  );
});

test('Phase 6A1 represents paid display posture without economic truth', () => {
  const value =
    assertPublicationSummaryV1(
      validSummary({
        access:
          'paid',
      }),
    );

  assert.equal(
    value.access,
    'paid',
  );

  assert.equal(
    'price' in value,
    false,
  );

  assert.equal(
    'balance' in value,
    false,
  );

  assert.equal(
    'receipt' in value,
    false,
  );

  assert.equal(
    'entitlement' in value,
    false,
  );

  assert.deepEqual(
    PUBLICATION_PROJECTION_AUTHORITY,
    {
      readProjectionOnly:
        true,
      economicTruth:
        false,
      balanceAuthority:
        false,
      receiptAuthority:
        false,
      paidEntitlementAuthority:
        false,
      walletMutation:
        false,
      ledgerMutation:
        false,
      followMutation:
        false,
      settlementAuthority:
        false,
    },
  );
});

test('Phase 6A1 rejects economic, entitlement, secret, and mutation-shaped fields', () => {
  for (const [
    field,
    value,
  ] of [
    [
      'priceMinor',
      '100',
    ],
    [
      'balance',
      '500',
    ],
    [
      'receipt',
      {
        txid:
          'fake',
      },
    ],
    [
      'entitlement',
      true,
    ],
    [
      'followed',
      true,
    ],
    [
      'privateKey',
      'forbidden',
    ],
  ]) {
    const result =
      validatePublicationSummaryV1({
        ...validSummary(),
        [field]:
          value,
      });

    assert.equal(
      result.ok,
      false,
      field,
    );

    assert.match(
      result.errors.join('\n'),
      new RegExp(
        `summary\\.${field} is unknown`,
      ),
    );
  }
});

test('Phase 6A1 validates canonical thumbnails and publication references', () => {
  const value =
    assertPublicationSummaryV1(
      validSummary(),
    );

  assert.equal(
    value.thumbnail.cid,
    `b3:${HASH}`,
  );

  assert.equal(
    value.references.manifestCid,
    `b3:${HASH}`,
  );

  assert.equal(
    value.references.contentCid,
    `b3:${OTHER_HASH}`,
  );

  assert.throws(
    () =>
      assertPublicationSummaryV1(
        validSummary({
          thumbnail: {
            ...validSummary().thumbnail,
            cid:
              'b3:not-a-hash',
          },
        }),
      ),
    /canonical b3 CID/,
  );

  assert.throws(
    () =>
      assertPublicationSummaryV1(
        validSummary({
          references: {},
        }),
      ),
    /requires at least one reference/,
  );
});

test('Phase 6A1 bounds publication page requests', () => {
  assert.deepEqual(
    normalizePublicationPageRequest(),
    {
      cursor:
        null,
      limit:
        PUBLICATION_PAGE_DEFAULT_LIMIT,
    },
  );

  assert.deepEqual(
    normalizePublicationPageRequest({
      cursor:
        'opaque_cursor_001',
      limit:
        PUBLICATION_PAGE_MAX_LIMIT,
    }),
    {
      cursor:
        'opaque_cursor_001',
      limit:
        PUBLICATION_PAGE_MAX_LIMIT,
    },
  );

  for (const limit of [
    0,
    -1,
    51,
    1.5,
    '20',
  ]) {
    assert.throws(
      () =>
        normalizePublicationPageRequest({
          limit,
        }),
      /integer from 1 through 50/,
    );
  }

  assert.throws(
    () =>
      normalizePublicationPageRequest({
        limit:
          20,
        unknown:
          true,
      }),
    /request\.unknown is unknown/,
  );
});

test('Phase 6A1 accepts a bounded PublicationPageV1 with an opaque cursor', () => {
  const page =
    assertPublicationPageV1({
      schema:
        PUBLICATION_PAGE_SCHEMA,
      items: [
        validSummary(),
      ],
      nextCursor:
        'next_page_001',
      hasMore:
        true,
    });

  assert.equal(
    page.items.length,
    1,
  );

  assert.equal(
    page.nextCursor,
    'next_page_001',
  );

  assert.equal(
    page.hasMore,
    true,
  );

  assert.equal(
    Object.isFrozen(page),
    true,
  );

  assert.equal(
    Object.isFrozen(page.items),
    true,
  );
});

test('Phase 6A1 rejects inconsistent or oversized publication pages', () => {
  assert.throws(
    () =>
      assertPublicationPageV1({
        schema:
          PUBLICATION_PAGE_SCHEMA,
        items: [],
        nextCursor:
          null,
        hasMore:
          true,
      }),
    /nextCursor is required/,
  );

  assert.throws(
    () =>
      assertPublicationPageV1({
        schema:
          PUBLICATION_PAGE_SCHEMA,
        items: [],
        nextCursor:
          'unexpected_cursor',
        hasMore:
          false,
      }),
    /must be null/,
  );

  const oversized =
    validatePublicationPageV1({
      schema:
        PUBLICATION_PAGE_SCHEMA,
      items:
        Array.from(
          {
            length:
              PUBLICATION_PAGE_MAX_LIMIT +
              1,
          },
          (_, index) =>
            validSummary({
              publicationId:
                `publication-${index}`,
            }),
        ),
      nextCursor:
        null,
      hasMore:
        false,
    });

  assert.equal(
    oversized.ok,
    false,
  );

  assert.match(
    oversized.errors.join('\n'),
    /at most 50 publications/,
  );
});

test('Phase 6A1 does not mutate caller-owned publication input', () => {
  const input =
    validSummary();

  const before =
    structuredClone(input);

  const value =
    assertPublicationSummaryV1(
      input,
    );

  assert.deepEqual(
    input,
    before,
  );

  assert.notEqual(
    value,
    input,
  );

  assert.notEqual(
    value.creator,
    input.creator,
  );

  assert.notEqual(
    value.thumbnail,
    input.thumbnail,
  );

  assert.notEqual(
    value.references,
    input.references,
  );
});
