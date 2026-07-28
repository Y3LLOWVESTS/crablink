import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assetKindLabel,
  describeAssetKind,
  normalizeRouteKind,
  resolveAssetRouteOwner,
  routeKindLabel,
} from './index.js';

const ROUTE_KINDS = [
  'home',
  'library',
  'image',
  'video',
  'chat',
  'make',
  'podcast',
  'podcasts',
  'asset',
  'notFound',
];

test('normalizes safe route kinds without platform state', () => {
  assert.equal(
    normalizeRouteKind('  Video  '),
    'video',
  );

  assert.equal(
    normalizeRouteKind('notFound'),
    'notFound',
  );

  assert.equal(
    normalizeRouteKind('🔥', 'asset'),
    'asset',
  );
});

test('provides canonical route labels', () => {
  assert.equal(
    routeKindLabel('home'),
    'Home',
  );

  assert.equal(
    routeKindLabel('notFound'),
    'Not Found',
  );

  assert.equal(
    routeKindLabel('make'),
    'Make Studio',
  );

  assert.equal(
    routeKindLabel('podcasts'),
    'Podcasts',
  );
});

test('formats generic snake and kebab route labels', () => {
  assert.equal(
    routeKindLabel('creator_profile'),
    'Creator Profile',
  );

  assert.equal(
    routeKindLabel('paid-video'),
    'Paid Video',
  );
});

test('accepts bounded caller-owned display overrides', () => {
  assert.equal(
    routeKindLabel(
      'earn',
      {
        earn: 'Earn ROC',
      },
    ),
    'Earn ROC',
  );

  assert.equal(
    routeKindLabel(
      'earn',
      {
        earn: 'bad\u0000label',
      },
    ),
    'Earn',
  );
});

test('provides canonical typed-asset labels', () => {
  assert.equal(
    assetKindLabel('image'),
    'Image Asset',
  );

  assert.equal(
    assetKindLabel('video'),
    'Video Asset',
  );

  assert.equal(
    assetKindLabel('chat'),
    'Chat Room',
  );

  assert.equal(
    assetKindLabel(''),
    'Unknown Asset',
  );
});

test('maps supported asset kinds to their route owners', () => {
  assert.equal(
    resolveAssetRouteOwner(
      'video',
      ROUTE_KINDS,
    ),
    'video',
  );

  assert.equal(
    resolveAssetRouteOwner(
      'chat',
      ROUTE_KINDS,
    ),
    'chat',
  );
});

test('maps unsupported asset kinds to the asset fallback', () => {
  assert.equal(
    resolveAssetRouteOwner(
      'mesh',
      ROUTE_KINDS,
    ),
    'asset',
  );

  assert.equal(
    resolveAssetRouteOwner(
      '🔥',
      ROUTE_KINDS,
    ),
    'asset',
  );
});

test('describes asset kinds with immutable display truth', () => {
  const description =
    describeAssetKind(
      'video',
      ROUTE_KINDS,
    );

  assert.deepEqual(
    description,
    {
      kind: 'video',
      label: 'Video Asset',
      routeOwner: 'video',
    },
  );

  assert.equal(
    Object.isFrozen(description),
    true,
  );
});
