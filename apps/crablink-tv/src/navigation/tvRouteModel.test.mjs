import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_ROUTE_KIND,
  createInitialTvRoute,
  createNextTvRoute,
  focusKeysForTvRoute,
  isTvBackKey,
  normalizeTvRouteState,
  updateTvRouteFocus,
} from './tvRouteModel.js';

const SECTION_IDS = [
  'home',
  'earn',
  'library',
  'settings',
];

test('creates a deterministic root route', () => {
  assert.deepEqual(
    createInitialTvRoute(SECTION_IDS, 'home'),
    {
      kind: TV_ROUTE_KIND,
      sectionId: 'home',
      focusKey: 'nav-home',
      depth: 0,
    },
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
    createInitialTvRoute(SECTION_IDS, 'home'),
  );
});

test('moving to another section increments route depth', () => {
  const current = createInitialTvRoute(
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
      focusKey: 'nav-earn',
      depth: 1,
    },
  );
});

test('selecting the active section does not add history', () => {
  const current = createInitialTvRoute(
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
});

test('recognizes common TV Back key names', () => {
  for (const key of [
    'Escape',
    'BrowserBack',
    'GoBack',
    'Backspace',
  ]) {
    assert.equal(isTvBackKey(key), true);
  }

  assert.equal(isTvBackKey('ArrowLeft'), false);
  assert.equal(isTvBackKey('Enter'), false);
});
