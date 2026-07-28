import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_CATALOG_RAIL,
  TV_CATALOG_SCHEMA,
  TV_CATALOG_VIEW_KIND,
} from './tvCatalogModel.js';

import {
  createTvCatalogAdapter,
} from './tvCatalogAdapter.js';

const HASH =
  'b'.repeat(64);

function readyResponse() {
  return {
    schema:
      TV_CATALOG_SCHEMA,

    generatedAt:
      '2026-07-20T01:00:00Z',

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
              'Verified feature',

            subtitle:
              'Backend-derived catalog item',

            thumbnailCrabUrl:
              `crab://${HASH}.image`,

            progressPercent:
              null,
          },
        ],
      },
    ],
  };
}

test('TV catalog adapter exposes one immutable method and performs no read during construction', () => {
  let calls = 0;

  const adapter =
    createTvCatalogAdapter({
      readCatalog: async () => {
        calls += 1;
        return readyResponse();
      },
    });

  assert.deepEqual(
    Object.keys(adapter),
    ['readCatalogView'],
  );

  assert.equal(
    Object.isFrozen(adapter),
    true,
  );

  assert.equal(calls, 0);
});

test('TV catalog adapter projects a valid backend response into a frozen ready view', async () => {
  const adapter =
    createTvCatalogAdapter({
      readCatalog: async () =>
        readyResponse(),
    });

  const view =
    await adapter.readCatalogView();

  assert.equal(
    view.kind,
    TV_CATALOG_VIEW_KIND.READY,
  );

  assert.equal(
    view.rails[0].label,
    'Featured',
  );

  assert.equal(
    Object.isFrozen(view),
    true,
  );

  assert.equal(
    Object.isFrozen(view.rails),
    true,
  );
});

test('TV catalog adapter preserves truthful empty and malformed projections', async () => {
  const responses = [
    {
      schema:
        TV_CATALOG_SCHEMA,

      generatedAt:
        '2026-07-20T01:00:00Z',

      rails: [],
    },

    {
      schema:
        'unknown.catalog.v9',

      generatedAt:
        '2026-07-20T01:00:00Z',

      rails: [],
    },
  ];

  const adapter =
    createTvCatalogAdapter({
      readCatalog: async () =>
        responses.shift(),
    });

  assert.equal(
    (
      await adapter.readCatalogView()
    ).kind,
    TV_CATALOG_VIEW_KIND.EMPTY,
  );

  assert.equal(
    (
      await adapter.readCatalogView()
    ).kind,
    TV_CATALOG_VIEW_KIND.MALFORMED,
  );
});

test('TV catalog adapter maps reviewed transport errors into sanitized unavailable views', async () => {
  const adapter =
    createTvCatalogAdapter({
      readCatalog: async () => {
        throw {
          code:
            'gateway_unreachable',

          retryable:
            true,

          message:
            'private origin and stack trace',
        };
      },
    });

  const view =
    await adapter.readCatalogView();

  assert.deepEqual(
    view,
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

  assert.equal(
    Object.hasOwn(view, 'message'),
    false,
  );
});

test('TV catalog adapter redacts unknown errors and does not invent retryability', async () => {
  const adapter =
    createTvCatalogAdapter({
      readCatalog: async () => {
        throw new Error(
          'secret transport details',
        );
      },
    });

  const view =
    await adapter.readCatalogView();

  assert.equal(
    view.kind,
    TV_CATALOG_VIEW_KIND.UNAVAILABLE,
  );

  assert.equal(
    view.code,
    'catalog_unavailable',
  );

  assert.equal(
    view.retryable,
    false,
  );

  assert.equal(
    JSON.stringify(view).includes(
      'secret transport details',
    ),
    false,
  );
});

test('TV catalog adapter fails closed when the shared read operation is absent', () => {
  assert.throws(
    () =>
      createTvCatalogAdapter({}),
    /catalog port requires readCatalog/,
  );
});
