import {
  TV_ANDROID_INTENT_ACTION,
  reviewTvAndroidIntent,
} from './tvAndroidIntentIntake.js';

export const TV_ANDROID_INTENT_EVENT =
  'crablink-tv-android-intent';

export const TV_ANDROID_INTENT_QUEUE =
  '__CRABLINK_TV_PENDING_INTENTS__';

export const TV_ANDROID_INTENT_READY =
  '__CRABLINK_TV_ANDROID_INTENT_READY__';

export const TV_ANDROID_INTENT_QUEUE_LIMIT =
  16;

export const TV_ANDROID_INTENT_UI_ACTION =
  Object.freeze({
    DETAIL: 'detail',
    PROBLEM: 'problem',
  });

function frozenList(values = []) {
  return Object.freeze([
    ...values,
  ]);
}

export function setTvAndroidIntentReady(
  target,
  ready,
) {
  if (
    !target ||
    ![
      'object',
      'function',
    ].includes(
      typeof target,
    )
  ) {
    return false;
  }

  try {
    target[
      TV_ANDROID_INTENT_READY
    ] = ready === true;

    return (
      target[
        TV_ANDROID_INTENT_READY
      ] ===
      (ready === true)
    );
  } catch {
    return false;
  }
}

export function takePendingTvAndroidIntents(
  target,
) {
  if (
    !target ||
    ![
      'object',
      'function',
    ].includes(
      typeof target,
    )
  ) {
    return frozenList();
  }

  const queue =
    Array.isArray(
      target[
        TV_ANDROID_INTENT_QUEUE
      ],
    )
      ? target[
          TV_ANDROID_INTENT_QUEUE
        ]
      : [];

  const pending =
    queue.slice(
      0,
      TV_ANDROID_INTENT_QUEUE_LIMIT,
    );

  try {
    target[
      TV_ANDROID_INTENT_QUEUE
    ] = [];
  } catch {
    return frozenList();
  }

  return frozenList(
    pending,
  );
}

export function projectTvAndroidIntentUiAction(
  payload,
  {
    availableSectionIds = [],
    fallbackSectionId = 'home',
  } = {},
) {
  const reviewed =
    reviewTvAndroidIntent(
      payload,
      {
        availableSectionIds,
        fallbackSectionId,
      },
    );

  if (
    reviewed.kind ===
      TV_ANDROID_INTENT_ACTION.PROBLEM
  ) {
    return Object.freeze({
      kind:
        TV_ANDROID_INTENT_UI_ACTION.PROBLEM,

      overlay:
        Object.freeze({
          title:
            reviewed.title,

          body:
            reviewed.body,

          code:
            reviewed.code,

          returnFocusKey:
            reviewed.returnFocusKey,
        }),
    });
  }

  return Object.freeze({
    kind:
      TV_ANDROID_INTENT_UI_ACTION.DETAIL,

    targetSectionId:
      reviewed.targetSectionId,

    overlay:
      Object.freeze({
        title:
          reviewed.title,

        body:
          reviewed.body,

        returnFocusKey:
          reviewed.returnFocusKey,
      }),
  });
}
