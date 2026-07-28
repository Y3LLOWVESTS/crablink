import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_CATALOG_RAIL,
  TV_CATALOG_SCHEMA,
  TV_CATALOG_VIEW_KIND,
  projectTvCatalogResponse,
} from './tvCatalogModel.js';

import {
  TV_CREATOR_BROWSE_KIND,
  TV_CREATOR_BROWSE_LIMITS,
  TV_CREATOR_BROWSE_SCHEMA,
  projectTvCreatorBrowseFromCatalog,
  searchTvCreatorBrowse,
} from './tvCreatorBrowseModel.js';

const HASH =
  'e'.repeat(64);

function creatorItem(
  overrides = {},
) {
  return {
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

    thumbnailCrabUrl:
      null,

    progressPercent:
      null,

    ...overrides,
  };
}

function contentItem(
  overrides = {},
) {
  return {
    id:
      'featured-video',

    kind:
      'content',

    crabUrl:
      `crab://${HASH}.video`,

    title:
      'Featured video',

    subtitle:
      'Not a creator',

    thumbnailCrabUrl:
      null,

    progressPercent:
      null,

    ...overrides,
  };
}

function catalogView() {
  const view =
    projectTvCatalogResponse({
      schema:
        TV_CATALOG_SCHEMA,

      generatedAt:
        '2026-07-20T05:00:00Z',

      rails: [
        {
          id:
            TV_CATALOG_RAIL.FEATURED,

          items: [
            contentItem(),
          ],
        },

        {
          id:
            TV_CATALOG_RAIL.CREATORS,

          items: [
            creatorItem({
              id:
                'creator-zed',

              crabUrl:
                'crab://Zed Films',

              title:
                'Zed Films',

              subtitle:
                'Public creator profile',
            }),

            creatorItem({
              id:
                'creator-amy',

              crabUrl:
                'crab://Amy Studio',

              title:
                'Amy Studio',

              subtitle:
                'Documentary creator',
            }),

            creatorItem({
              id:
                'creator-amy-duplicate',

              crabUrl:
                'crab://Amy Studio',

              title:
                'Amy Studio Duplicate',

              subtitle:
                'Duplicate route should not win',
            }),
          ],
        },
      ],
    });

  assert.equal(
    view.kind,
    TV_CATALOG_VIEW_KIND.READY,
  );

  return view;
}

function looseReadyView() {
  return Object.freeze({
    kind:
      TV_CATALOG_VIEW_KIND.READY,

    rails:
      Object.freeze([
        Object.freeze({
          id:
            TV_CATALOG_RAIL.CREATORS,

          items:
            Object.freeze([
              Object.freeze({
                id:
                  'creator-valid',

                kind:
                  'creator',

                crabUrl:
                  'crab://Valid Creator',

                title:
                  'Valid Creator',

                subtitle:
                  'Accepted',
              }),

              Object.freeze({
                id:
                  'creator-asset-route',

                kind:
                  'creator',

                crabUrl:
                  `crab://${HASH}.video`,

                title:
                  'Asset Pretending To Be Creator',

                subtitle:
                  'Rejected',
              }),

              Object.freeze({
                id:
                  'creator-foreign-route',

                kind:
                  'creator',

                crabUrl:
                  'https://example.invalid/creator',

                title:
                  'Foreign Creator',

                subtitle:
                  'Rejected',
              }),

              Object.freeze({
                id:
                  'content-site-route',

                kind:
                  'content',

                crabUrl:
                  'crab://Content Site',

                title:
                  'Wrong kind',

                subtitle:
                  'Rejected',
              }),
            ]),
        }),
      ]),
  });
}

test('creator browse policy constants are explicit and immutable', () => {
  assert.equal(
    TV_CREATOR_BROWSE_SCHEMA,
    'crablink.tv.creator-browse.v1',
  );

  assert.equal(
    Object.isFrozen(
      TV_CREATOR_BROWSE_KIND,
    ),
    true,
  );

  assert.equal(
    Object.isFrozen(
      TV_CREATOR_BROWSE_LIMITS,
    ),
    true,
  );

  assert.equal(
    TV_CREATOR_BROWSE_LIMITS.MAX_CREATORS,
    32,
  );
});

test('creator browse extracts sorted unique creators from the reviewed creator rail', () => {
  const browse =
    projectTvCreatorBrowseFromCatalog(
      catalogView(),
    );

  assert.equal(
    browse.schema,
    TV_CREATOR_BROWSE_SCHEMA,
  );

  assert.equal(
    browse.kind,
    TV_CREATOR_BROWSE_KIND.READY,
  );

  assert.deepEqual(
    browse.creators.map(
      (creator) =>
        creator.siteName,
    ),
    [
      'amy-studio',
      'zed-films',
    ],
  );

  assert.deepEqual(
    browse.creators.map(
      (creator) =>
        creator.profileCrabUrl,
    ),
    [
      'crab://amy-studio',
      'crab://zed-films',
    ],
  );

  assert.equal(
    Object.isFrozen(browse),
    true,
  );

  assert.equal(
    Object.isFrozen(browse.creators),
    true,
  );

  assert.equal(
    Object.isFrozen(browse.creators[0]),
    true,
  );
});

test('creator browse rejects non-ready catalog states and non-creator rails', () => {
  for (const catalog of [
    null,
    {
      kind:
        TV_CATALOG_VIEW_KIND.LOADING,

      rails:
        [],
    },
    {
      kind:
        TV_CATALOG_VIEW_KIND.EMPTY,

      rails:
        [],
    },
    {
      kind:
        TV_CATALOG_VIEW_KIND.MALFORMED,

      rails:
        [],
    },
    {
      kind:
        TV_CATALOG_VIEW_KIND.UNAVAILABLE,

      rails:
        [],
    },
  ]) {
    const browse =
      projectTvCreatorBrowseFromCatalog(
        catalog,
      );

    assert.equal(
      browse.kind,
      TV_CREATOR_BROWSE_KIND.EMPTY,
    );

    assert.deepEqual(
      browse.creators,
      [],
    );
  }
});

test('creator browse filters loose ready views to creator site routes only', () => {
  const browse =
    projectTvCreatorBrowseFromCatalog(
      looseReadyView(),
    );

  assert.equal(
    browse.kind,
    TV_CREATOR_BROWSE_KIND.READY,
  );

  assert.deepEqual(
    browse.creators.map(
      (creator) =>
        creator.siteName,
    ),
    [
      'valid-creator',
    ],
  );
});

test('creator browse search filters by title, subtitle, site name, or route', () => {
  assert.deepEqual(
    projectTvCreatorBrowseFromCatalog(
      catalogView(),
      {
        query:
          'documentary',
      },
    )
      .creators
      .map(
        (creator) =>
          creator.siteName,
      ),
    [
      'amy-studio',
    ],
  );

  const browse =
    projectTvCreatorBrowseFromCatalog(
      catalogView(),
    );

  assert.deepEqual(
    searchTvCreatorBrowse(
      browse,
      'zed-films',
    )
      .creators
      .map(
        (creator) =>
          creator.siteName,
      ),
    [
      'zed-films',
    ],
  );
});

test('creator browse applies safe limits without mutating the source view', () => {
  const source =
    catalogView();

  const browse =
    projectTvCreatorBrowseFromCatalog(
      source,
      {
        maxCreators:
          1,
      },
    );

  assert.equal(
    browse.creators.length,
    1,
  );

  assert.equal(
    source.rails[1].items.length,
    3,
  );
});

test('creator browse bounds text fields and query size', () => {
  const source =
    projectTvCatalogResponse({
      schema:
        TV_CATALOG_SCHEMA,

      generatedAt:
        '2026-07-20T05:11:00Z',

      rails: [
        {
          id:
            TV_CATALOG_RAIL.CREATORS,

          items: [
            creatorItem({
              id:
                'long-creator',

              crabUrl:
                'crab://Long Creator',

              title:
                'T'.repeat(120),

              subtitle:
                'S'.repeat(180),
            }),
          ],
        },
      ],
    });

  assert.equal(
    source.kind,
    TV_CATALOG_VIEW_KIND.READY,
  );

  const filtered =
    projectTvCreatorBrowseFromCatalog(
      source,
      {
        query:
          'x'.repeat(400),
      },
    );

  assert.equal(
    filtered.kind,
    TV_CREATOR_BROWSE_KIND.EMPTY,
  );

  const unfiltered =
    projectTvCreatorBrowseFromCatalog(
      source,
    );

  assert.equal(
    unfiltered.kind,
    TV_CREATOR_BROWSE_KIND.READY,
  );

  assert.ok(
    new TextEncoder()
      .encode(
        unfiltered.creators[0].title,
      )
      .length <=
      TV_CREATOR_BROWSE_LIMITS.MAX_TITLE_BYTES,
  );

  assert.ok(
    new TextEncoder()
      .encode(
        unfiltered.creators[0].subtitle,
      )
      .length <=
      TV_CREATOR_BROWSE_LIMITS.MAX_SUBTITLE_BYTES,
  );
});
