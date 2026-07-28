import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CRABLINK_CORE_PACKAGE,
  crabImageUrlToCid,
  initCrabUrl,
  isB3Cid,
  isRawHash,
  isTypedAssetUrl,
  makeCrabAssetUrl,
  makeCrabSiteUrl,
  normalizeAssetKind,
  normalizeB3Cid,
  normalizeHash,
  normalizeSiteName,
  normalizeTypedAssetUrl,
  parseCrabInput,
  parseTypedAssetBody,
  stripCrabPrefix,
  stripQueryAndHash,
} from './index.js';

const HASH =
  '0123456789abcdef'.repeat(4);

const UPPER_HASH =
  HASH.toUpperCase();

test('exports the real platform-neutral core package identity', () => {
  assert.equal(
    CRABLINK_CORE_PACKAGE,
    '@crablink/core',
  );

  assert.deepEqual(
    initCrabUrl(),
    {
      ok: true,
      module:
        '@crablink/core/crab-url',
      scaffold: false,
    },
  );
});

test('strips crab prefix, query, and fragment deterministically', () => {
  assert.equal(
    stripCrabPrefix(
      '  CRAB://Example.Site  ',
    ),
    'Example.Site',
  );

  assert.equal(
    stripQueryAndHash(
      'example.site/path?view=tv#top',
    ),
    'example.site/path',
  );
});

test('normalizes raw hashes and b3 CIDs', () => {
  assert.equal(
    isRawHash(UPPER_HASH),
    true,
  );

  assert.equal(
    isB3Cid(`B3:${UPPER_HASH}`),
    true,
  );

  assert.equal(
    normalizeHash(
      `b3:${UPPER_HASH}`,
    ),
    HASH,
  );

  assert.equal(
    normalizeB3Cid(UPPER_HASH),
    `b3:${HASH}`,
  );

  assert.equal(
    normalizeHash('not-a-hash'),
    '',
  );
});

test('maps a raw hash to the canonical image asset route', () => {
  const parsed =
    parseCrabInput(UPPER_HASH);

  assert.equal(
    parsed.kind,
    'asset',
  );

  assert.equal(
    parsed.normalized,
    `crab://${HASH}.image`,
  );

  assert.equal(
    parsed.hash,
    HASH,
  );

  assert.equal(
    parsed.assetKind,
    'image',
  );

  assert.equal(
    parsed.cid,
    `b3:${HASH}`,
  );
});

test('maps a b3 CID to the same canonical image asset route', () => {
  const parsed =
    parseCrabInput(
      `b3:${UPPER_HASH}`,
    );

  assert.equal(
    parsed.kind,
    'asset',
  );

  assert.equal(
    parsed.normalized,
    `crab://${HASH}.image`,
  );

  assert.equal(
    parsed.cid,
    `b3:${HASH}`,
  );
});

test('parses typed assets and removes query and fragment data', () => {
  const parsed =
    parseTypedAssetBody(
      `crab://${UPPER_HASH}.Video?autoplay=1#position`,
    );

  assert.deepEqual(
    parsed,
    {
      hash: HASH,
      kind: 'video',
      cid: `b3:${HASH}`,
      crabUrl:
        `crab://${HASH}.video`,
    },
  );

  assert.equal(
    isTypedAssetUrl(
      `crab://${HASH}.video`,
    ),
    true,
  );

  assert.equal(
    normalizeTypedAssetUrl({
      cid: `b3:${HASH}`,
      kind: 'Podcast',
    }),
    `crab://${HASH}.podcast`,
  );
});

test('recognizes caller-owned built-in routes without inventing others', () => {
  const parsed =
    parseCrabInput(
      'CRAB://Library?tab=recent',
      {
        builtIns: [
          'home',
          'library',
          'settings',
        ],
      },
    );

  assert.deepEqual(
    parsed,
    {
      kind: 'builtin',
      raw:
        'CRAB://Library?tab=recent',
      normalized:
        'crab://library',
      routeKind: 'library',
    },
  );

  assert.equal(
    parseCrabInput(
      'crab://unknown',
      {
        builtIns: ['home'],
      },
    ).kind,
    'site',
  );
});

test('normalizes safe site names and fails closed on unusable input', () => {
  assert.equal(
    normalizeSiteName(
      '  My Cool..Site  ',
    ),
    'my-cool.site',
  );

  assert.equal(
    makeCrabSiteUrl(
      'Creator Space',
    ),
    'crab://creator-space',
  );

  assert.deepEqual(
    parseCrabInput(
      'crab://Creator Space?view=tv',
    ),
    {
      kind: 'site',
      raw:
        'crab://Creator Space?view=tv',
      normalized:
        'crab://creator-space',
      siteName:
        'creator-space',
    },
  );

  const invalid =
    parseCrabInput('crab://🔥🔥');

  assert.equal(
    invalid.kind,
    'invalid',
  );

  assert.equal(
    invalid.siteName,
    '',
  );
});

test('creates canonical typed asset URLs from hash or CID input', () => {
  assert.equal(
    normalizeAssetKind(
      'Video',
    ),
    'video',
  );

  assert.equal(
    makeCrabAssetUrl(
      `b3:${UPPER_HASH}`,
      'Music',
    ),
    `crab://${HASH}.music`,
  );

  assert.equal(
    makeCrabAssetUrl(
      'invalid',
      'image',
    ),
    '',
  );
});

test('converts only image asset routes back to b3 CIDs', () => {
  assert.equal(
    crabImageUrlToCid(
      `crab://${HASH}.image`,
    ),
    `b3:${HASH}`,
  );

  assert.equal(
    crabImageUrlToCid(
      `crab://${HASH}.video`,
    ),
    '',
  );

  assert.equal(
    crabImageUrlToCid(
      'crab://creator-space',
    ),
    '',
  );
});
