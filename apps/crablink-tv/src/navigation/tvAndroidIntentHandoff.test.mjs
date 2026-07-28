import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_ANDROID_INTENT_EVENT,
  TV_ANDROID_INTENT_QUEUE,
  TV_ANDROID_INTENT_QUEUE_LIMIT,
  TV_ANDROID_INTENT_READY,
  TV_ANDROID_INTENT_UI_ACTION,
  projectTvAndroidIntentUiAction,
  setTvAndroidIntentReady,
  takePendingTvAndroidIntents,
} from './tvAndroidIntentHandoff.js';

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

test(
  'handoff constants match the Android bridge contract',
  () => {
    assert.equal(
      TV_ANDROID_INTENT_EVENT,
      'crablink-tv-android-intent',
    );

    assert.equal(
      TV_ANDROID_INTENT_QUEUE,
      '__CRABLINK_TV_PENDING_INTENTS__',
    );

    assert.equal(
      TV_ANDROID_INTENT_READY,
      '__CRABLINK_TV_ANDROID_INTENT_READY__',
    );
  },
);

test(
  'readiness marker toggles without inventing authority',
  () => {
    const target = {};

    assert.equal(
      setTvAndroidIntentReady(
        target,
        true,
      ),
      true,
    );

    assert.equal(
      target[
        TV_ANDROID_INTENT_READY
      ],
      true,
    );

    assert.equal(
      setTvAndroidIntentReady(
        target,
        false,
      ),
      true,
    );

    assert.equal(
      target[
        TV_ANDROID_INTENT_READY
      ],
      false,
    );
  },
);

test(
  'pending queue is bounded drained and frozen',
  () => {
    const target = {
      [TV_ANDROID_INTENT_QUEUE]:
        Array.from(
          {
            length:
              TV_ANDROID_INTENT_QUEUE_LIMIT +
              5,
          },
          (
            _,
            index,
          ) => ({
            url:
              `crab://creator-${index}`,

            source:
              'android-intent',
          }),
        ),
    };

    const pending =
      takePendingTvAndroidIntents(
        target,
      );

    assert.equal(
      pending.length,
      TV_ANDROID_INTENT_QUEUE_LIMIT,
    );

    assert.equal(
      Object.isFrozen(
        pending,
      ),
      true,
    );

    assert.deepEqual(
      target[
        TV_ANDROID_INTENT_QUEUE
      ],
      [],
    );
  },
);

test(
  'approved section becomes a destination detail action',
  () => {
    assert.deepEqual(
      projectTvAndroidIntentUiAction(
        {
          url:
            'crab://settings',

          source:
            'android-intent',
        },
        {
          availableSectionIds:
            SECTION_IDS,

          fallbackSectionId:
            'home',
        },
      ),
      {
        kind:
          TV_ANDROID_INTENT_UI_ACTION.DETAIL,

        targetSectionId:
          'settings',

        overlay: {
          title:
            'Settings opened',

          body:
            'crab://settings was accepted by CrabLink TV.',

          returnFocusKey:
            'nav-settings',
        },
      },
    );
  },
);

test(
  'asset intake targets the library detail surface',
  () => {
    const hash =
      'c'.repeat(
        64,
      );

    const action =
      projectTvAndroidIntentUiAction(
        {
          url:
            `crab://${hash}.video`,

          source:
            'android-intent',
        },
        {
          availableSectionIds:
            SECTION_IDS,

          fallbackSectionId:
            'home',
        },
      );

    assert.equal(
      action.kind,
      TV_ANDROID_INTENT_UI_ACTION.DETAIL,
    );

    assert.equal(
      action.targetSectionId,
      'library',
    );

    assert.equal(
      action.overlay.returnFocusKey,
      'nav-library',
    );
  },
);

test(
  'unsupported intake becomes a typed problem action',
  () => {
    assert.deepEqual(
      projectTvAndroidIntentUiAction(
        {
          url:
            'crab://operator',

          source:
            'android-intent',
        },
        {
          availableSectionIds:
            SECTION_IDS,

          fallbackSectionId:
            'pair',
        },
      ),
      {
        kind:
          TV_ANDROID_INTENT_UI_ACTION.PROBLEM,

        overlay: {
          title:
            'CrabLink TV could not open this link',

          body:
            'This crab:// route is not owned by the TV client.',

          code:
            TV_ROUTE_PROBLEM_CODE
              .UNSUPPORTED_TV_ROUTE,

          returnFocusKey:
            'nav-pair',
        },
      },
    );
  },
);
