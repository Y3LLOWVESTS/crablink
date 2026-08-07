import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createProfileTimelineModel,
  normalizeProfileTimelineTab,
  PROFILE_TIMELINE_TABS,
} from './profileTimelineModel.js';

function publication(
  overrides = {},
) {
  return {
    schema:
      'crablink.publication-summary.v1',
    publicationId:
      'publication-001',
    kind:
      'post',
    title:
      'First public post',
    pinned:
      false,
    creator: {
      username:
        'rusty_crab',
    },
    ...overrides,
  };
}

function page(
  items = [],
  overrides = {},
) {
  return {
    schema:
      'crablink.publication-page.v1',
    items,
    nextCursor:
      null,
    hasMore:
      false,
    ...overrides,
  };
}

test(
  'phase7a1 locks posts about and sites tabs',
  () => {
    assert.deepEqual(
      PROFILE_TIMELINE_TABS.map(
        (tab) =>
          tab.id,
      ),
      [
        'posts',
        'about',
        'sites',
      ],
    );

    assert.equal(
      Object.isFrozen(
        PROFILE_TIMELINE_TABS,
      ),
      true,
    );

    assert.equal(
      normalizeProfileTimelineTab(
        'unknown',
      ),
      'posts',
    );
  },
);

test(
  'phase7a1 separates pinned publication from the regular timeline',
  () => {
    const pinned =
      publication({
        publicationId:
          'pinned-001',
        pinned:
          true,
      });

    const regular =
      publication({
        publicationId:
          'regular-001',
      });

    const model =
      createProfileTimelineModel({
        username:
          'rusty_crab',
        status:
          'ready',
        page:
          page([
            pinned,
            regular,
          ]),
      });

    assert.equal(
      model.pinnedPublication
        .publicationId,
      'pinned-001',
    );

    assert.deepEqual(
      model.postItems.map(
        (item) =>
          item.publicationId,
      ),
      [
        'regular-001',
      ],
    );
  },
);

test(
  'phase7a1 exposes sites tab only when backend publications contain sites',
  () => {
    const withoutSites =
      createProfileTimelineModel({
        username:
          'rusty_crab',
        status:
          'ready',
        page:
          page([
            publication(),
          ]),
      });

    const withSites =
      createProfileTimelineModel({
        username:
          'rusty_crab',
        status:
          'ready',
        activeTab:
          'sites',
        page:
          page([
            publication({
              publicationId:
                'site-001',
              kind:
                'site',
            }),
          ]),
      });

    assert.equal(
      withoutSites.tabs.find(
        (tab) =>
          tab.id === 'sites',
      ).visible,
      false,
    );

    assert.equal(
      withSites.tabs.find(
        (tab) =>
          tab.id === 'sites',
      ).visible,
      true,
    );

    assert.equal(
      withSites.siteItems.length,
      1,
    );
  },
);

test(
  'phase7a1 models bounded cursor pagination without inventing another cursor',
  () => {
    const model =
      createProfileTimelineModel({
        username:
          'rusty_crab',
        status:
          'ready',
        page:
          page(
            [
              publication(),
            ],
            {
              nextCursor:
                'p_00000001',
              hasMore:
                true,
            },
          ),
      });

    assert.deepEqual(
      model.pagination,
      {
        hasMore:
          true,
        nextCursor:
          'p_00000001',
        canLoadMore:
          true,
        pageSize:
          1,
        maximumPageSize:
          50,
      },
    );
  },
);

test(
  'phase7a1 provides an honest empty-profile state',
  () => {
    const model =
      createProfileTimelineModel({
        username:
          'empty_crab',
        status:
          'ready',
        page:
          page(),
      });

    assert.equal(
      model.empty,
      true,
    );

    assert.equal(
      model.emptyState.title,
      'No publications yet',
    );

    assert.match(
      model.emptyState.message,
      /@empty_crab/,
    );
  },
);

test(
  'phase7a1 labels stale and offline snapshots without claiming live truth',
  () => {
    const stale =
      createProfileTimelineModel({
        username:
          'rusty_crab',
        status:
          'stale',
        lastUpdatedAt:
          '2026-08-06T06:00:00Z',
        page:
          page([
            publication(),
          ]),
      });

    const offline =
      createProfileTimelineModel({
        username:
          'rusty_crab',
        status:
          'offline',
        page:
          page([
            publication(),
          ]),
      });

    assert.equal(
      stale.freshness.live,
      false,
    );

    assert.equal(
      stale.freshness.label,
      'May be out of date',
    );

    assert.equal(
      offline.freshness.live,
      false,
    );

    assert.equal(
      offline.freshness.label,
      'Offline copy',
    );

    assert.equal(
      offline.pagination.canLoadMore,
      false,
    );
  },
);

test(
  'phase7a1 keeps loading and error states free of invented publications',
  () => {
    const loading =
      createProfileTimelineModel({
        username:
          'rusty_crab',
        status:
          'loading',
      });

    const error =
      createProfileTimelineModel({
        username:
          'rusty_crab',
        status:
          'error',
        errorMessage:
          'Gateway unavailable',
      });

    assert.equal(
      loading.postItems.length,
      0,
    );

    assert.equal(
      loading.empty,
      false,
    );

    assert.equal(
      error.postItems.length,
      0,
    );

    assert.equal(
      error.error,
      'Gateway unavailable',
    );
  },
);

test(
  'phase7a1 exposes edit action only for the profile owner',
  () => {
    const owner =
      createProfileTimelineModel({
        username:
          'rusty_crab',
        isOwner:
          true,
        status:
          'ready',
        page:
          page(),
      });

    const visitor =
      createProfileTimelineModel({
        username:
          'rusty_crab',
        isOwner:
          false,
        status:
          'ready',
        page:
          page(),
      });

    assert.deepEqual(
      owner.owner.editAction,
      {
        id:
          'edit-profile',
        label:
          'Edit profile',
        route:
          'crab://profile',
      },
    );

    assert.equal(
      visitor.owner.editAction,
      null,
    );
  },
);

test(
  'phase7a1 exposes no follow action before the relationship contract',
  () => {
    const model =
      createProfileTimelineModel({
        username:
          'rusty_crab',
        status:
          'ready',
        page:
          page(),
      });

    assert.deepEqual(
      model.relationship,
      {
        followAction:
          null,
        relationshipContractReady:
          false,
      },
    );

    assert.equal(
      model.authority.relationshipAuthority,
      false,
    );
  },
);

test(
  'phase7a1 rejects local catalog injection and preserves caller input',
  () => {
    const callerPage =
      page([
        publication(),
      ]);

    assert.throws(
      () =>
        createProfileTimelineModel({
          username:
            'rusty_crab',
          status:
            'ready',
          page:
            callerPage,
          localCatalog: [],
        }),
      /unknown field: localCatalog/,
    );

    const model =
      createProfileTimelineModel({
        username:
          'rusty_crab',
        status:
          'ready',
        page:
          callerPage,
      });

    callerPage.items[0].title =
      'Caller mutation';

    assert.equal(
      model.postItems[0].title,
      'First public post',
    );

    assert.equal(
      model.authority.localCatalogAuthority,
      false,
    );

    assert.equal(
      Object.isFrozen(model),
      true,
    );

    assert.equal(
      Object.isFrozen(
        model.postItems,
      ),
      true,
    );
  },
);
