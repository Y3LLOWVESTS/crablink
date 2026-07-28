import assert from 'node:assert/strict';
import test from 'node:test';

import * as desktopCrabUrl from './crabUrl.js';

import * as sharedCrabUrl from '../../../../../packages/crablink-core/src/index.js';

const HASH =
  '0123456789abcdef'.repeat(4);

const EXPECTED_EXPORTS = Object.freeze([
  'crabImageUrlToCid',
  'initCrabUrl',
  'isB3Cid',
  'isRawHash',
  'isTypedAssetUrl',
  'makeCrabAssetUrl',
  'makeCrabSiteUrl',
  'normalizeAssetKind',
  'normalizeB3Cid',
  'normalizeHash',
  'normalizeSiteName',
  'normalizeTypedAssetUrl',
  'parseCrabInput',
  'parseTypedAssetBody',
  'stripCrabPrefix',
  'stripQueryAndHash',
]);

test('desktop compatibility surface delegates every parser export', () => {
  for (const exportName of EXPECTED_EXPORTS) {
    assert.equal(
      typeof desktopCrabUrl[exportName],
      'function',
      `${exportName} must remain callable`,
    );

    assert.strictEqual(
      desktopCrabUrl[exportName],
      sharedCrabUrl[exportName],
      `${exportName} must be the shared implementation`,
    );
  }
});

test('desktop parser identity now reports the shared core module', () => {
  assert.deepEqual(
    desktopCrabUrl.initCrabUrl(),
    {
      ok: true,
      module:
        '@crablink/core/crab-url',
      scaffold: false,
    },
  );
});

test('desktop raw-hash parsing uses the shared canonical asset model', () => {
  const parsed =
    desktopCrabUrl.parseCrabInput(
      HASH.toUpperCase(),
    );

  assert.deepEqual(
    parsed,
    {
      kind: 'asset',
      raw: HASH.toUpperCase(),
      normalized:
        `crab://${HASH}.image`,
      hash: HASH,
      assetKind: 'image',
      cid: `b3:${HASH}`,
    },
  );
});

test('desktop site and typed-asset helpers retain compatible output', () => {
  assert.equal(
    desktopCrabUrl.makeCrabSiteUrl(
      'Creator Space',
    ),
    'crab://creator-space',
  );

  assert.equal(
    desktopCrabUrl.makeCrabAssetUrl(
      `b3:${HASH}`,
      'Video',
    ),
    `crab://${HASH}.video`,
  );

  assert.equal(
    desktopCrabUrl.crabImageUrlToCid(
      `crab://${HASH}.image`,
    ),
    `b3:${HASH}`,
  );
});

test('desktop compatibility parser still fails closed on invalid input', () => {
  const parsed =
    desktopCrabUrl.parseCrabInput(
      'crab://🔥🔥',
    );

  assert.equal(
    parsed.kind,
    'invalid',
  );

  assert.equal(
    parsed.siteName,
    '',
  );

  assert.equal(
    desktopCrabUrl.makeCrabAssetUrl(
      'not-a-hash',
      'image',
    ),
    '',
  );
});
