import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_CATALOG_THUMBNAIL_KIND,
  TV_CATALOG_THUMBNAIL_LIMITS,
  TV_CATALOG_THUMBNAIL_SCHEMA,
  projectTvCatalogThumbnail,
} from './tvCatalogThumbnailModel.js';

const IMAGE_HASH =
  'a'.repeat(64);

const VIDEO_HASH =
  'b'.repeat(64);

test('catalog thumbnail constants are explicit and immutable', () => {
  assert.equal(
    TV_CATALOG_THUMBNAIL_SCHEMA,
    'crablink.tv.catalog-thumbnail.v1',
  );

  assert.equal(
    Object.isFrozen(
      TV_CATALOG_THUMBNAIL_KIND,
    ),
    true,
  );

  assert.equal(
    Object.isFrozen(
      TV_CATALOG_THUMBNAIL_LIMITS,
    ),
    true,
  );

  assert.equal(
    TV_CATALOG_THUMBNAIL_LIMITS.MAX_ROUTE_BYTES,
    192,
  );
});

test('image asset thumbnail routes become bounded frozen descriptors', () => {
  const thumbnail =
    projectTvCatalogThumbnail({
      thumbnailCrabUrl:
        `CRAB://${IMAGE_HASH}.image`,
    });

  assert.equal(
    thumbnail.schema,
    TV_CATALOG_THUMBNAIL_SCHEMA,
  );

  assert.equal(
    thumbnail.kind,
    TV_CATALOG_THUMBNAIL_KIND.IMAGE_ROUTE,
  );

  assert.equal(
    thumbnail.route,
    `crab://${IMAGE_HASH}.image`,
  );

  assert.equal(
    thumbnail.preview,
    IMAGE_HASH.slice(0, 12),
  );

  assert.equal(
    Object.isFrozen(thumbnail),
    true,
  );
});

test('missing thumbnail remains truthful absent state', () => {
  for (const thumbnailCrabUrl of [
    null,
    undefined,
    '',
  ]) {
    const thumbnail =
      projectTvCatalogThumbnail({
        thumbnailCrabUrl,
      });

    assert.equal(
      thumbnail.kind,
      TV_CATALOG_THUMBNAIL_KIND.ABSENT,
    );

    assert.equal(
      thumbnail.route,
      null,
    );
  }
});

test('non-image, foreign, malformed, and oversized thumbnails fail closed', () => {
  for (const thumbnailCrabUrl of [
    `crab://${VIDEO_HASH}.video`,
    'crab://creator-site',
    'https://example.invalid/image.png',
    'not a route',
    `crab://${'c'.repeat(240)}.image`,
  ]) {
    const thumbnail =
      projectTvCatalogThumbnail({
        thumbnailCrabUrl,
      });

    assert.equal(
      thumbnail.kind,
      TV_CATALOG_THUMBNAIL_KIND.ABSENT,
      thumbnailCrabUrl,
    );
  }
});
