import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_BLOCKED_DESKTOP_ROUTE_KINDS,
  TV_BUILTIN_ROUTE_KINDS,
  TV_ROUTE_PROBLEM_CODE,
  TV_ROUTE_RESULT_KIND,
  TV_ROUTE_STACK_LIMIT,
  TV_TYPED_ASSET_ROUTE_KINDS,
  createTvRouteStack,
  currentTvRouteEntry,
  isTvResolvedRoute,
  normalizeTvRouteStack,
  popTvRoute,
  pushTvRoute,
  resolveTvRouteInput,
  tvRouteStackDepth,
  updateCurrentTvRouteFocus,
} from './tvRouteRegistry.js';

const HASH = 'a'.repeat(64);

test(
  'approved route policy is explicit and immutable',
  () => {
    assert.equal(
      Object.isFrozen(
        TV_BUILTIN_ROUTE_KINDS,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        TV_TYPED_ASSET_ROUTE_KINDS,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        TV_BLOCKED_DESKTOP_ROUTE_KINDS,
      ),
      true,
    );

    assert.deepEqual(
      TV_TYPED_ASSET_ROUTE_KINDS,
      [
        'image',
        'video',
        'music',
        'podcast',
        'stream',
        'article',
        'text',
      ],
    );
  },
);

test(
  'approved built-ins normalize through shared core',
  () => {
    assert.deepEqual(
      resolveTvRouteInput(
        'CRAB://Receipts?tab=recent#rail',
      ),
      {
        kind:
          TV_ROUTE_RESULT_KIND.READY,
        owner: 'section',
        routeKind: 'receipts',
        sectionId: 'receipts',
        normalized:
          'crab://receipts',
      },
    );
  },
);

test(
  'creator names resolve as site routes',
  () => {
    assert.deepEqual(
      resolveTvRouteInput(
        'crab://Creator Space',
      ),
      {
        kind:
          TV_ROUTE_RESULT_KIND.READY,
        owner: 'site',
        routeKind: 'site',
        siteName:
          'creator-space',
        normalized:
          'crab://creator-space',
      },
    );
  },
);

test(
  'approved typed assets preserve canonical identifiers',
  () => {
    assert.deepEqual(
      resolveTvRouteInput(
        `crab://${HASH}.video?x=1`,
      ),
      {
        kind:
          TV_ROUTE_RESULT_KIND.READY,
        owner: 'asset',
        routeKind: 'video',
        assetKind: 'video',
        hash: HASH,
        cid: `b3:${HASH}`,
        normalized:
          `crab://${HASH}.video`,
      },
    );

    assert.equal(
      resolveTvRouteInput(HASH)
        .routeKind,
      'image',
    );
  },
);

test(
  'external intake requires crab scheme and rejects foreign schemes',
  () => {
    assert.equal(
      resolveTvRouteInput(
        'creator-space',
        {
          requireCrabScheme: true,
        },
      ).code,
      TV_ROUTE_PROBLEM_CODE
        .UNAPPROVED_ROUTE_SCHEME,
    );

    assert.equal(
      resolveTvRouteInput(
        'https://example.com',
      ).code,
      TV_ROUTE_PROBLEM_CODE
        .UNAPPROVED_ROUTE_SCHEME,
    );
  },
);

test(
  'desktop-only routes become typed not-found results',
  () => {
    assert.deepEqual(
      resolveTvRouteInput(
        'crab://operator',
      ),
      {
        kind:
          TV_ROUTE_RESULT_KIND
            .NOT_FOUND,
        owner: 'notFound',
        routeKind: 'notFound',
        code:
          TV_ROUTE_PROBLEM_CODE
            .UNSUPPORTED_TV_ROUTE,
        requestedKind: 'operator',
      },
    );
  },
);

test(
  'unsupported assets and malformed input fail closed',
  () => {
    assert.equal(
      resolveTvRouteInput(
        `crab://${HASH}.game`,
      ).code,
      TV_ROUTE_PROBLEM_CODE
        .UNSUPPORTED_ASSET_KIND,
    );

    for (
      const value of [
        '',
        'crab://🔥🔥',
      ]
    ) {
      const result =
        resolveTvRouteInput(value);

      assert.equal(
        result.kind,
        TV_ROUTE_RESULT_KIND.PROBLEM,
      );

      assert.equal(
        result.code,
        TV_ROUTE_PROBLEM_CODE
          .MALFORMED_CRAB_ROUTE,
      );
    }
  },
);

test(
  'resolved routes are frozen and recognizable',
  () => {
    const route =
      resolveTvRouteInput(
        'crab://library',
      );

    assert.equal(
      Object.isFrozen(route),
      true,
    );

    assert.equal(
      isTvResolvedRoute(route),
      true,
    );

    assert.equal(
      isTvResolvedRoute({
        kind: 'unknown',
      }),
      false,
    );
  },
);

test(
  'route stack starts at an immutable Home root',
  () => {
    const value =
      createTvRouteStack();

    assert.equal(
      Object.isFrozen(value),
      true,
    );

    assert.equal(
      Object.isFrozen(
        value.entries,
      ),
      true,
    );

    assert.equal(
      currentTvRouteEntry(value)
        .route.normalized,
      'crab://home',
    );

    assert.equal(
      tvRouteStackDepth(value),
      0,
    );
  },
);

test(
  'route stack pushes, suppresses duplicates, and restores focus',
  () => {
    const root =
      updateCurrentTvRouteFocus(
        createTvRouteStack(),
        'home-card-7',
      );

    const detail =
      pushTvRoute(
        root,
        resolveTvRouteInput(
          'crab://creator-space',
        ),
        'home-creator-3',
      );

    assert.equal(
      tvRouteStackDepth(detail),
      1,
    );

    assert.equal(
      pushTvRoute(
        detail,
        resolveTvRouteInput(
          'CRAB://CREATOR-SPACE',
        ),
      ),
      detail,
    );

    const popped =
      popTvRoute(detail);

    assert.equal(
      popped.popped,
      true,
    );

    assert.equal(
      popped.route.normalized,
      'crab://home',
    );

    assert.equal(
      popped.restoreFocusKey,
      'home-creator-3',
    );

    assert.equal(
      updateCurrentTvRouteFocus(
        root,
        'x'.repeat(129),
      ),
      root,
    );
  },
);

test(
  'route stack rejects invalid persisted state and caps snapshots',
  () => {
    assert.equal(
      currentTvRouteEntry(
        normalizeTvRouteStack({
          kind: 'bad',
          entries: [],
        }),
      ).route.normalized,
      'crab://home',
    );

    const original =
      createTvRouteStack();

    let value = original;

    for (
      let index = 0;
      index <
        TV_ROUTE_STACK_LIMIT + 5;
      index += 1
    ) {
      value =
        pushTvRoute(
          value,
          resolveTvRouteInput(
            `crab://creator-${index}`,
          ),
          `creator-${index}`,
        );
    }

    assert.equal(
      value.entries.length,
      TV_ROUTE_STACK_LIMIT,
    );

    assert.equal(
      original.entries.length,
      1,
    );
  },
);
