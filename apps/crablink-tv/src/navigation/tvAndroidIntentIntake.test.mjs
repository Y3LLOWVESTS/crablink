import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_ANDROID_INTENT_ACTION,
  TV_ANDROID_INTENT_MAX_CHARS,
  normalizeTvAndroidIntentPayload,
  reviewTvAndroidIntent,
} from './tvAndroidIntentIntake.js';

import {
  TV_ROUTE_PROBLEM_CODE,
} from './tvRouteRegistry.js';

const SECTION_IDS = [
  'home',
  'earn',
  'library',
  'pair',
  'settings',
];

function review(
  payload,
  fallbackSectionId = 'home',
) {
  return reviewTvAndroidIntent(
    payload,
    {
      availableSectionIds:
        SECTION_IDS,
      fallbackSectionId,
    },
  );
}

test(
  'native-source payload is trimmed and frozen',
  () => {
    const value =
      normalizeTvAndroidIntentPayload({
        url:
          ' crab://library ',
        source:
          'android-intent',
      });

    assert.deepEqual(
      value,
      {
        url:
          'crab://library',
        source:
          'android-intent',
      },
    );

    assert.equal(
      Object.isFrozen(value),
      true,
    );
  },
);

test(
  'approved section selects destination focus',
  () => {
    assert.deepEqual(
      review({
        url:
          'CRAB://Settings?tab=network#panel',
        source:
          'android-intent',
      }),
      {
        kind:
          TV_ANDROID_INTENT_ACTION.OPEN,
        targetSectionId:
          'settings',
        title:
          'Settings opened',
        body:
          'crab://settings was accepted by CrabLink TV.',
        returnFocusKey:
          'nav-settings',
        normalized:
          'crab://settings',
        routeOwner:
          'section',
      },
    );
  },
);

test(
  'approved section without a TV surface stays truthful',
  () => {
    const value =
      review({
        url:
          'crab://receipts',
        source:
          'android-intent',
      });

    assert.equal(
      value.targetSectionId,
      'home',
    );

    assert.match(
      value.body,
      /dedicated TV surface is not available/,
    );
  },
);

test(
  'typed asset route targets library focus',
  () => {
    const hash =
      'b'.repeat(64);

    const value =
      review({
        url:
          `crab://${hash}.video?autoplay=1`,
        source:
          'android-intent',
      });

    assert.equal(
      value.routeOwner,
      'asset',
    );

    assert.equal(
      value.targetSectionId,
      'library',
    );

    assert.equal(
      value.returnFocusKey,
      'nav-library',
    );
  },
);

test(
  'creator route remains bounded to Home',
  () => {
    const value =
      review({
        url:
          'crab://Creator Space',
        source:
          'android-intent',
      });

    assert.equal(
      value.routeOwner,
      'site',
    );

    assert.equal(
      value.targetSectionId,
      'home',
    );

    assert.equal(
      value.normalized,
      'crab://creator-space',
    );
  },
);

test(
  'malformed oversize and control payloads fail closed',
  () => {
    const payloads = [
      null,
      {},
      {
        url: '',
        source:
          'android-intent',
      },
      {
        url:
          `crab://${'x'.repeat(
            TV_ANDROID_INTENT_MAX_CHARS,
          )}`,
        source:
          'android-intent',
      },
      {
        url:
          'crab://home\u0000hidden',
        source:
          'android-intent',
      },
    ];

    for (
      const payload
      of payloads
    ) {
      assert.equal(
        review(
          payload,
          'settings',
        ).code,
        TV_ROUTE_PROBLEM_CODE
          .MALFORMED_CRAB_ROUTE,
      );
    }
  },
);

test(
  'foreign scheme and desktop-only routes are typed rejections',
  () => {
    assert.equal(
      review({
        url:
          'https://example.com',
        source:
          'android-intent',
      }).code,
      TV_ROUTE_PROBLEM_CODE
        .UNAPPROVED_ROUTE_SCHEME,
    );

    assert.equal(
      review({
        url:
          'crab://operator',
        source:
          'android-intent',
      }).code,
      TV_ROUTE_PROBLEM_CODE
        .UNSUPPORTED_TV_ROUTE,
    );
  },
);
