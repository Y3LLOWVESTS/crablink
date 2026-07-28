import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_CATALOG_RAIL,
  TV_CATALOG_SCHEMA,
  TV_CATALOG_VIEW_KIND,
  createTvCatalogUnavailableView,
  projectTvCatalogResponse,
} from './tvCatalogModel.js';

import {
  INITIAL_TV_CATALOG_INTERACTION_STATE,
  createTvCatalogInteraction,
} from './tvCatalogInteraction.js';

const HASH =
  'c'.repeat(64);

function readyView({
  id = 'featured-video-1',
  title = 'Fresh catalog item',
} = {}) {
  return projectTvCatalogResponse({
    schema:
      TV_CATALOG_SCHEMA,

    generatedAt:
      '2026-07-20T04:10:00Z',

    rails: [
      {
        id:
          TV_CATALOG_RAIL.FEATURED,

        items: [
          {
            id,

            kind:
              'content',

            crabUrl:
              `crab://${HASH}.video`,

            title,

            subtitle:
              'Backend-derived TV catalog result',

            thumbnailCrabUrl:
              null,

            progressPercent:
              null,
          },
        ],
      },
    ],
  });
}

function deferred() {
  let resolve;

  const promise =
    new Promise((nextResolve) => {
      resolve = nextResolve;
    });

  return {
    promise,
    resolve,
  };
}

test('catalog interaction starts immutable and performs no read during construction', () => {
  let calls = 0;

  const interaction =
    createTvCatalogInteraction({
      readCatalogView: async () => {
        calls += 1;
        return readyView();
      },
    });

  assert.equal(
    Object.isFrozen(
      INITIAL_TV_CATALOG_INTERACTION_STATE,
    ),
    true,
  );

  assert.equal(
    Object.isFrozen(
      interaction,
    ),
    true,
  );

  assert.equal(
    Object.isFrozen(
      interaction.getState(),
    ),
    true,
  );

  assert.equal(
    calls,
    0,
  );

  assert.deepEqual(
    Object.keys(interaction),
    [
      'loadCatalog',
      'refreshCatalog',
      'getState',
    ],
  );

  assert.equal(
    interaction.getState().view.kind,
    TV_CATALOG_VIEW_KIND.LOADING,
  );

  assert.equal(
    interaction.getState().loading,
    false,
  );
});

test('catalog interaction publishes loading then ready view from the adapter', async () => {
  const published = [];

  const interaction =
    createTvCatalogInteraction({
      readCatalogView: async () =>
        readyView(),
      onState: (state) => {
        published.push(
          state,
        );
      },
    });

  const state =
    await interaction.loadCatalog();

  assert.equal(
    published[0].loading,
    true,
  );

  assert.equal(
    published[0].view.kind,
    TV_CATALOG_VIEW_KIND.LOADING,
  );

  assert.equal(
    state.view.kind,
    TV_CATALOG_VIEW_KIND.READY,
  );

  assert.equal(
    state.view.rails[0].items[0].title,
    'Fresh catalog item',
  );

  assert.equal(
    interaction.getState().loading,
    false,
  );

  assert.equal(
    interaction.getState().loadAttempted,
    true,
  );
});

test('duplicate catalog loads share one in-flight operation', async () => {
  const pending =
    deferred();

  let calls = 0;

  const interaction =
    createTvCatalogInteraction({
      readCatalogView: async () => {
        calls += 1;
        return pending.promise;
      },
    });

  const first =
    interaction.loadCatalog();

  const second =
    interaction.loadCatalog();

  assert.equal(
    first,
    second,
  );

  assert.equal(
    calls,
    1,
  );

  pending.resolve(
    readyView(),
  );

  const state =
    await first;

  assert.equal(
    state.view.kind,
    TV_CATALOG_VIEW_KIND.READY,
  );
});

test('catalog refresh supersedes a slower previous load', async () => {
  const slow =
    deferred();

  const fast =
    deferred();

  const responses = [
    slow.promise,
    fast.promise,
  ];

  const interaction =
    createTvCatalogInteraction({
      readCatalogView: async () =>
        responses.shift(),
    });

  const first =
    interaction.loadCatalog();

  const second =
    interaction.refreshCatalog();

  fast.resolve(
    readyView({
      id:
        'new-video',
      title:
        'Newer catalog',
    }),
  );

  const secondState =
    await second;

  assert.equal(
    secondState.view.rails[0].items[0].title,
    'Newer catalog',
  );

  slow.resolve(
    readyView({
      id:
        'old-video',
      title:
        'Older catalog',
    }),
  );

  const firstState =
    await first;

  assert.equal(
    firstState.view.rails[0].items[0].title,
    'Newer catalog',
  );

  assert.equal(
    interaction.getState().view.rails[0].items[0].title,
    'Newer catalog',
  );
});

test('catalog interaction preserves sanitized unavailable views', async () => {
  const interaction =
    createTvCatalogInteraction({
      readCatalogView: async () =>
        createTvCatalogUnavailableView({
          code:
            'gateway_unreachable',

          retryable: true,
        }),
    });

  const state =
    await interaction.loadCatalog();

  assert.equal(
    state.view.kind,
    TV_CATALOG_VIEW_KIND.UNAVAILABLE,
  );

  assert.equal(
    state.view.code,
    'gateway_unreachable',
  );

  assert.equal(
    state.view.retryable,
    true,
  );
});

test('catalog interaction fails closed for thrown or malformed adapter results', async () => {
  const thrown =
    createTvCatalogInteraction({
      readCatalogView: async () => {
        throw new Error(
          'raw backend detail',
        );
      },
    });

  const thrownState =
    await thrown.loadCatalog();

  assert.equal(
    thrownState.view.kind,
    TV_CATALOG_VIEW_KIND.UNAVAILABLE,
  );

  assert.equal(
    thrownState.view.code,
    'catalog_unavailable',
  );

  assert.equal(
    thrownState.view.retryable,
    false,
  );

  const malformed =
    createTvCatalogInteraction({
      readCatalogView: async () => ({
        kind:
          TV_CATALOG_VIEW_KIND.READY,
      }),
    });

  const malformedState =
    await malformed.loadCatalog();

  assert.equal(
    malformedState.view.kind,
    TV_CATALOG_VIEW_KIND.UNAVAILABLE,
  );

  assert.equal(
    malformedState.view.retryable,
    false,
  );
});
