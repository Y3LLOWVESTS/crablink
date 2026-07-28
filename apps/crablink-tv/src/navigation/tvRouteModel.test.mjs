import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_ROUTE_LABEL_OVERRIDES,
  tvRouteLabel,
} from './tvRouteMetadata.js';

import {
  TV_ROUTE_KIND,
  createInitialTvRoute,
  createNextTvRoute,
  focusKeysForTvRoute,
  isTvBackKey,
  normalizeTvCrabRoute,
  normalizeTvRouteState,
  updateTvRouteFocus,
} from './tvRouteModel.js';

const SECTION_IDS = [
  'home',
  'earn',
  'library',
  'settings',
];

function expectedBuiltinRoute(
  sectionId,
) {
  return {
    kind: 'builtin',
    raw: `crab://${sectionId}`,
    normalized:
      `crab://${sectionId}`,
    routeKind: sectionId,
  };
}

test('TV route labels use shared core', () => {
  assert.equal(
    tvRouteLabel('home'),
    'Home',
  );

  assert.equal(
    tvRouteLabel('library'),
    'Library',
  );

  assert.equal(
    tvRouteLabel('pair'),
    'Pair',
  );

  assert.equal(
    tvRouteLabel('settings'),
    'Settings',
  );
});

test('TV keeps the intentional Earn ROC override', () => {
  assert.deepEqual(
    TV_ROUTE_LABEL_OVERRIDES,
    {
      earn: 'Earn ROC',
    },
  );

  assert.equal(
    tvRouteLabel('earn'),
    'Earn ROC',
  );

  assert.equal(
    Object.isFrozen(
      TV_ROUTE_LABEL_OVERRIDES,
    ),
    true,
  );
});

test('creates a deterministic root route', () => {
  assert.deepEqual(
    createInitialTvRoute(
      SECTION_IDS,
      'home',
    ),
    {
      kind: TV_ROUTE_KIND,
      sectionId: 'home',
      crabRoute:
        expectedBuiltinRoute('home'),
      focusKey: 'nav-home',
      depth: 0,
    },
  );
});

test('TV sections use the shared normalized crab route model', () => {
  assert.deepEqual(
    normalizeTvCrabRoute(
      'CRAB://Library?tab=recent#rail',
      SECTION_IDS,
      'home',
    ),
    expectedBuiltinRoute(
      'library',
    ),
  );
});

test('unsupported TV crab routes fail closed to Home', () => {
  assert.deepEqual(
    normalizeTvCrabRoute(
      'crab://unsupported-section',
      SECTION_IDS,
      'home',
    ),
    expectedBuiltinRoute('home'),
  );

  assert.deepEqual(
    normalizeTvCrabRoute(
      'crab://🔥🔥',
      SECTION_IDS,
      'home',
    ),
    expectedBuiltinRoute('home'),
  );
});

test('invalid history state fails closed to the root route', () => {
  assert.deepEqual(
    normalizeTvRouteState(
      {
        kind: 'unknown-route',
        sectionId: 'earn',
        depth: 99,
      },
      SECTION_IDS,
      'home',
    ),
    createInitialTvRoute(
      SECTION_IDS,
      'home',
    ),
  );
});

test('stored crab route data is regenerated from the validated section', () => {
  assert.deepEqual(
    normalizeTvRouteState(
      {
        kind: TV_ROUTE_KIND,
        sectionId: 'library',
        crabRoute: {
          kind: 'builtin',
          normalized:
            'crab://settings',
          routeKind: 'settings',
        },
        focusKey: 'library-grid',
        depth: 2,
      },
      SECTION_IDS,
      'home',
    ),
    {
      kind: TV_ROUTE_KIND,
      sectionId: 'library',
      crabRoute:
        expectedBuiltinRoute(
          'library',
        ),
      focusKey: 'library-grid',
      depth: 2,
    },
  );
});

test('moving to another section increments route depth', () => {
  const current =
    createInitialTvRoute(
      SECTION_IDS,
      'home',
    );

  assert.deepEqual(
    createNextTvRoute(
      current,
      'earn',
      'nav-earn',
      SECTION_IDS,
      'home',
    ),
    {
      kind: TV_ROUTE_KIND,
      sectionId: 'earn',
      crabRoute:
        expectedBuiltinRoute('earn'),
      focusKey: 'nav-earn',
      depth: 1,
    },
  );
});

test('selecting the active section does not add history', () => {
  const current =
    createInitialTvRoute(
      SECTION_IDS,
      'home',
    );

  assert.equal(
    createNextTvRoute(
      current,
      'home',
      'nav-home',
      SECTION_IDS,
      'home',
    ),
    null,
  );
});

test('focus restoration prefers the recorded control', () => {
  const route = updateTvRouteFocus(
    createInitialTvRoute(
      SECTION_IDS,
      'home',
    ),
    'readiness-roc',
    SECTION_IDS,
    'home',
  );

  assert.deepEqual(
    focusKeysForTvRoute(route),
    [
      'readiness-roc',
      'nav-home',
    ],
  );

  assert.deepEqual(
    route.crabRoute,
    expectedBuiltinRoute('home'),
  );
});

test('recognizes common TV Back key names', () => {
  for (const key of [
    'Escape',
    'BrowserBack',
    'GoBack',
    'Backspace',
  ]) {
    assert.equal(
      isTvBackKey(key),
      true,
    );
  }

  assert.equal(
    isTvBackKey('ArrowLeft'),
    false,
  );

  assert.equal(
    isTvBackKey('Enter'),
    false,
  );
});
