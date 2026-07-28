import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_CATALOG_RAIL,
  TV_CATALOG_SCHEMA,
  TV_CATALOG_VIEW_KIND,
  createTvCatalogLoadingView,
  createTvCatalogUnavailableView,
  normalizeTvCatalogResponse,
  projectTvCatalogResponse,
} from './tvCatalogModel.js';

const HASH =
  'a'.repeat(64);

function validCatalog() {
  return {
    schema:
      TV_CATALOG_SCHEMA,

    generatedAt:
      '2026-07-19T20:00:00Z',

    rails: [
      {
        id:
          TV_CATALOG_RAIL.FEATURED,

        label:
          'Untrusted backend label',

        items: [
          {
            id:
              'featured-video-1',

            kind:
              'content',

            crabUrl:
              `crab://${HASH}.video`,

            title:
              'Featured video',

            subtitle:
              'Backend-derived public catalog entry',

            thumbnailCrabUrl:
              `crab://${HASH}.image`,

            progressPercent:
              null,

            token:
              'discarded',
          },
        ],

        secret:
          'discarded',
      },

      {
        id:
          TV_CATALOG_RAIL.CREATORS,

        items: [
          {
            id:
              'creator-one',

            kind:
              'creator',

            crabUrl:
              'crab://Creator One',

            title:
              'Creator One',

            subtitle:
              'Public creator profile',
          },
        ],
      },
    ],

    wallet:
      'discarded',

    ledger:
      'discarded',
  };
}

test(
  'loading view is immutable and contains no fake rails',
  () => {
    const view =
      createTvCatalogLoadingView();

    assert.equal(
      view.kind,
      TV_CATALOG_VIEW_KIND.LOADING,
    );

    assert.deepEqual(
      view.rails,
      [],
    );

    assert.equal(
      Object.isFrozen(view),
      true,
    );

    assert.equal(
      Object.isFrozen(view.rails),
      true,
    );
  },
);

test(
  'valid backend catalog is normalized and deeply frozen',
  () => {
    const catalog =
      normalizeTvCatalogResponse(
        validCatalog(),
      );

    assert.ok(catalog);

    assert.equal(
      catalog.rails.length,
      2,
    );

    assert.equal(
      catalog.rails[0].label,
      'Featured',
    );

    assert.equal(
      catalog.rails[0]
        .items[0]
        .crabUrl,
      `crab://${HASH}.video`,
    );

    assert.equal(
      catalog.rails[1]
        .items[0]
        .crabUrl,
      'crab://creator-one',
    );

    assert.equal(
      'wallet' in catalog,
      false,
    );

    assert.equal(
      'token' in
        catalog.rails[0].items[0],
      false,
    );

    assert.equal(
      Object.isFrozen(
        catalog.rails[0].items,
      ),
      true,
    );
  },
);

test(
  'empty rails are omitted and produce truthful empty state',
  () => {
    const view =
      projectTvCatalogResponse({
        schema:
          TV_CATALOG_SCHEMA,

        generatedAt:
          '2026-07-19T20:00:00Z',

        rails: [
          {
            id:
              TV_CATALOG_RAIL.FEATURED,

            items: [],
          },
        ],
      });

    assert.equal(
      view.kind,
      TV_CATALOG_VIEW_KIND.EMPTY,
    );

    assert.deepEqual(
      view.rails,
      [],
    );
  },
);

test(
  'unknown schema and rail identifiers fail closed',
  () => {
    const wrongSchema =
      validCatalog();

    wrongSchema.schema =
      'crablink.tv.catalog.v2';

    assert.equal(
      projectTvCatalogResponse(
        wrongSchema,
      ).kind,
      TV_CATALOG_VIEW_KIND.MALFORMED,
    );

    const unknownRail =
      validCatalog();

    unknownRail.rails[0].id =
      'recommended-because-placeholder';

    assert.equal(
      projectTvCatalogResponse(
        unknownRail,
      ).kind,
      TV_CATALOG_VIEW_KIND.MALFORMED,
    );
  },
);

test(
  'foreign and unsupported card routes fail closed',
  () => {
    const foreign =
      validCatalog();

    foreign.rails[0]
      .items[0]
      .crabUrl =
        'https://example.com/video';

    assert.equal(
      projectTvCatalogResponse(
        foreign,
      ).kind,
      TV_CATALOG_VIEW_KIND.MALFORMED,
    );

    const desktopOnly =
      validCatalog();

    desktopOnly.rails[0]
      .items[0]
      .crabUrl =
        'crab://operator';

    assert.equal(
      projectTvCatalogResponse(
        desktopOnly,
      ).kind,
      TV_CATALOG_VIEW_KIND.MALFORMED,
    );
  },
);

test(
  'creator and content kinds must match canonical route ownership',
  () => {
    const mismatch =
      validCatalog();

    mismatch.rails[1]
      .items[0]
      .kind =
        'content';

    assert.equal(
      projectTvCatalogResponse(
        mismatch,
      ).kind,
      TV_CATALOG_VIEW_KIND.MALFORMED,
    );
  },
);

test(
  'thumbnail must be a canonical image route and progress is bounded',
  () => {
    const badThumbnail =
      validCatalog();

    badThumbnail.rails[0]
      .items[0]
      .thumbnailCrabUrl =
        `crab://${HASH}.video`;

    assert.equal(
      projectTvCatalogResponse(
        badThumbnail,
      ).kind,
      TV_CATALOG_VIEW_KIND.MALFORMED,
    );

    const badProgress =
      validCatalog();

    badProgress.rails[0]
      .items[0]
      .progressPercent =
        101;

    assert.equal(
      projectTvCatalogResponse(
        badProgress,
      ).kind,
      TV_CATALOG_VIEW_KIND.MALFORMED,
    );
  },
);

test(
  'unavailable state is typed sanitized and non-authoritative',
  () => {
    assert.deepEqual(
      createTvCatalogUnavailableView({
        code:
          'gateway_unreachable',

        retryable:
          true,

        rawError:
          'discarded',
      }),
      {
        kind:
          TV_CATALOG_VIEW_KIND.UNAVAILABLE,

        code:
          'gateway_unreachable',

        retryable:
          true,

        rails: [],
      },
    );

    assert.deepEqual(
      createTvCatalogUnavailableView({
        code:
          'raw_backend_exception',
      }),
      {
        kind:
          TV_CATALOG_VIEW_KIND.UNAVAILABLE,

        code:
          'catalog_unavailable',

        retryable:
          false,

        rails: [],
      },
    );
  },
);
