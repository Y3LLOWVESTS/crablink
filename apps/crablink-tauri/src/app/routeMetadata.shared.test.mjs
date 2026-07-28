import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assetKindLabel,
  resolveAssetRouteOwner,
  routeKindLabel as sharedRouteKindLabel,
} from '../../../../packages/crablink-core/src/index.js';

import {
  BUILT_IN_ROUTE_KINDS,
  routeKindLabel,
} from './routeRegistry.js';

import {
  parseRouteInput,
} from './router.js';

const HASH =
  '0123456789abcdef'.repeat(4);

test('desktop route labels delegate to shared core', () => {
  assert.strictEqual(
    routeKindLabel,
    sharedRouteKindLabel,
  );

  assert.equal(
    routeKindLabel('make'),
    'Make Studio',
  );

  assert.equal(
    routeKindLabel('notFound'),
    'Not Found',
  );
});

test('desktop typed video uses the shared asset mapping', () => {
  const route =
    parseRouteInput(
      `crab://${HASH}.video`,
    );

  assert.equal(
    route.kind,
    'asset',
  );

  assert.equal(
    route.title,
    'Video Asset',
  );

  assert.equal(
    route.params.typedRouteOwner,
    'video',
  );
});

test('desktop unknown asset kinds fail to the generic asset owner', () => {
  const route =
    parseRouteInput(
      `crab://${HASH}.mesh`,
    );

  assert.equal(
    route.kind,
    'asset',
  );

  assert.equal(
    route.title,
    'Mesh Asset',
  );

  assert.equal(
    route.params.typedRouteOwner,
    'asset',
  );
});

test('desktop chat assets retain the Chat Room owner and label', () => {
  const route =
    parseRouteInput(
      `crab://${HASH}.chat`,
    );

  assert.equal(
    route.kind,
    'chat',
  );

  assert.equal(
    route.title,
    'Chat Room',
  );

  assert.equal(
    route.params.typedRouteOwner,
    'chat',
  );
});

test('desktop route registry and shared owner selection agree', () => {
  assert.equal(
    resolveAssetRouteOwner(
      'podcast',
      BUILT_IN_ROUTE_KINDS,
    ),
    'podcast',
  );

  assert.equal(
    resolveAssetRouteOwner(
      'unknown_kind',
      BUILT_IN_ROUTE_KINDS,
    ),
    'asset',
  );
});

test('desktop asset labels are the shared display values', () => {
  assert.equal(
    assetKindLabel('image'),
    'Image Asset',
  );

  assert.equal(
    assetKindLabel('chat'),
    'Chat Room',
  );

  assert.equal(
    assetKindLabel('unknown_kind'),
    'Unknown Kind Asset',
  );
});
