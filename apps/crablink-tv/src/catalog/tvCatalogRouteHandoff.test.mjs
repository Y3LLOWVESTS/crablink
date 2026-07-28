import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_ROUTE_PROBLEM_CODE,
} from '../navigation/tvRouteRegistry.js';

import {
  TV_CATALOG_CARD_HANDOFF_KIND,
  TV_CATALOG_CARD_DEFAULT_SECTIONS,
  projectTvCatalogCardRouteHandoff,
} from './tvCatalogRouteHandoff.js';

const HASH =
  'd'.repeat(64);

function catalogItem(
  overrides = {},
) {
  return Object.freeze({
    id:
      'featured-video-1',

    kind:
      'content',

    crabUrl:
      `crab://${HASH}.video`,

    title:
      'Featured catalog video',

    subtitle:
      'Backend-derived catalog card',

    ...overrides,
  });
}

test('catalog card route handoff exposes frozen policy constants', () => {
  assert.equal(
    Object.isFrozen(
      TV_CATALOG_CARD_HANDOFF_KIND,
    ),
    true,
  );

  assert.equal(
    Object.isFrozen(
      TV_CATALOG_CARD_DEFAULT_SECTIONS,
    ),
    true,
  );

  assert.deepEqual(
    TV_CATALOG_CARD_HANDOFF_KIND,
    {
      DETAIL:
        'detail',

      PROBLEM:
        'problem',
    },
  );
});

test('asset catalog cards target Library with a bounded detail overlay', () => {
  const handoff =
    projectTvCatalogCardRouteHandoff(
      catalogItem(),
      {
        initiatingFocusKey:
          'catalog-featured-featured-video-1',
      },
    );

  assert.equal(
    handoff.kind,
    TV_CATALOG_CARD_HANDOFF_KIND.DETAIL,
  );

  assert.equal(
    handoff.targetSectionId,
    'library',
  );

  assert.equal(
    handoff.route.owner,
    'asset',
  );

  assert.equal(
    handoff.route.assetKind,
    'video',
  );

  assert.equal(
    handoff.overlay.title,
    'Featured catalog video',
  );

  assert.equal(
    handoff.overlay.returnFocusKey,
    'catalog-featured-featured-video-1',
  );

  assert.match(
    handoff.overlay.body,
    /crab:\/\/d{64}\.video/u,
  );

  assert.equal(
    Object.isFrozen(handoff),
    true,
  );

  assert.equal(
    Object.isFrozen(handoff.overlay),
    true,
  );

  assert.equal(
    Object.isFrozen(handoff.route),
    true,
  );
});

test('creator catalog cards stay on Home as reviewed site routes', () => {
  const handoff =
    projectTvCatalogCardRouteHandoff(
      catalogItem({
        kind:
          'creator',

        crabUrl:
          'crab://Creator Space',

        title:
          'Creator Space',

        subtitle:
          'Public creator profile',
      }),
      {
        initiatingFocusKey:
          'catalog-creators-creator-space',
      },
    );

  assert.equal(
    handoff.kind,
    TV_CATALOG_CARD_HANDOFF_KIND.DETAIL,
  );

  assert.equal(
    handoff.targetSectionId,
    'home',
  );

  assert.equal(
    handoff.route.owner,
    'site',
  );

  assert.equal(
    handoff.route.siteName,
    'creator-space',
  );

  assert.equal(
    handoff.overlay.returnFocusKey,
    'catalog-creators-creator-space',
  );
});

test('section catalog cards only target approved available sections', () => {
  const handoff =
    projectTvCatalogCardRouteHandoff(
      catalogItem({
        crabUrl:
          'crab://settings',

        title:
          'Settings',
      }),
      {
        availableSectionIds: [
          'home',
          'settings',
        ],

        fallbackSectionId:
          'home',

        initiatingFocusKey:
          'catalog-featured-settings',
      },
    );

  assert.equal(
    handoff.kind,
    TV_CATALOG_CARD_HANDOFF_KIND.DETAIL,
  );

  assert.equal(
    handoff.targetSectionId,
    'settings',
  );

  const unavailable =
    projectTvCatalogCardRouteHandoff(
      catalogItem({
        crabUrl:
          'crab://settings',
      }),
      {
        availableSectionIds: [
          'home',
        ],

        fallbackSectionId:
          'home',
      },
    );

  assert.equal(
    unavailable.targetSectionId,
    'home',
  );
});

test('unapproved catalog card routes become typed problems', () => {
  const handoff =
    projectTvCatalogCardRouteHandoff(
      catalogItem({
        crabUrl:
          'https://example.invalid/video',

        title:
          'Foreign route',
      }),
      {
        initiatingFocusKey:
          'catalog-featured-foreign-route',
      },
    );

  assert.equal(
    handoff.kind,
    TV_CATALOG_CARD_HANDOFF_KIND.PROBLEM,
  );

  assert.equal(
    handoff.overlay.code,
    TV_ROUTE_PROBLEM_CODE
      .UNAPPROVED_ROUTE_SCHEME,
  );

  assert.equal(
    handoff.overlay.returnFocusKey,
    'catalog-featured-foreign-route',
  );

  assert.doesNotMatch(
    handoff.overlay.body,
    /example\.invalid/u,
  );
});

test('missing and unsupported catalog route inputs fail closed', () => {
  const missing =
    projectTvCatalogCardRouteHandoff(
      {
        title:
          'No route',
      },
    );

  assert.equal(
    missing.kind,
    TV_CATALOG_CARD_HANDOFF_KIND.PROBLEM,
  );

  assert.equal(
    typeof missing.overlay.code,
    'string',
  );

  const unsupported =
    projectTvCatalogCardRouteHandoff(
      catalogItem({
        crabUrl:
          'crab://operator',

        title:
          'Operator',
      }),
    );

  assert.equal(
    unsupported.kind,
    TV_CATALOG_CARD_HANDOFF_KIND.PROBLEM,
  );

  assert.equal(
    unsupported.overlay.code,
    TV_ROUTE_PROBLEM_CODE
      .UNSUPPORTED_TV_ROUTE,
  );
});
