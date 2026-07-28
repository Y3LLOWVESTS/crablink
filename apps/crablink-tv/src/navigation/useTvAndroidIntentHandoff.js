import {
  useEffect,
  useRef,
} from 'react';

import {
  TV_ANDROID_INTENT_EVENT,
  TV_ANDROID_INTENT_QUEUE,
  TV_ANDROID_INTENT_UI_ACTION,
  projectTvAndroidIntentUiAction,
  setTvAndroidIntentReady,
  takePendingTvAndroidIntents,
} from './tvAndroidIntentHandoff.js';

function removeMatchingQueuedPayload(
  target,
  payload,
) {
  if (
    !target ||
    !payload ||
    !Array.isArray(
      target[TV_ANDROID_INTENT_QUEUE],
    )
  ) {
    return false;
  }

  const queue =
    target[TV_ANDROID_INTENT_QUEUE];

  for (
    let index = queue.length - 1;
    index >= 0;
    index -= 1
  ) {
    const candidate =
      queue[index];

    if (
      candidate?.url !== payload.url ||
      candidate?.source !== payload.source
    ) {
      continue;
    }

    try {
      queue.splice(
        index,
        1,
      );

      return true;
    } catch {
      try {
        target[TV_ANDROID_INTENT_QUEUE] = [
          ...queue.slice(
            0,
            index,
          ),

          ...queue.slice(
            index + 1,
          ),
        ];

        return true;
      } catch {
        return false;
      }
    }
  }

  return false;
}

export function useTvAndroidIntentHandoff({
  activeSectionId,
  availableSectionIds,
  navigateToSection,
  openDetail,
  openProblem,
  setActivityMessage,
}) {
  const currentRef =
    useRef(null);

  currentRef.current = {
    activeSectionId,
    availableSectionIds,
    navigateToSection,
    openDetail,
    openProblem,
    setActivityMessage,
  };

  useEffect(() => {
    if (
      typeof window ===
      'undefined'
    ) {
      return undefined;
    }

    function processPayload(
      payload,
    ) {
      const current =
        currentRef.current;

      if (!current) {
        return false;
      }

      const action =
        projectTvAndroidIntentUiAction(
          payload,
          {
            availableSectionIds:
              current.availableSectionIds,

            fallbackSectionId:
              current.activeSectionId,
          },
        );

      if (
        action.kind ===
          TV_ANDROID_INTENT_UI_ACTION.PROBLEM
      ) {
        current.openProblem(
          action.overlay,
        );

        current.setActivityMessage(
          `Android crab:// link rejected: ${action.overlay.code}.`,
        );

        return true;
      }

      current.navigateToSection(
        action.targetSectionId,
        `nav-${current.activeSectionId}`,
      );

      current.openDetail(
        action.overlay,
      );

      current.setActivityMessage(
        `Android crab:// link opened in ${action.targetSectionId}.`,
      );

      return true;
    }

    function handleAndroidIntent(
      event,
    ) {
      const payload =
        event?.detail;

      removeMatchingQueuedPayload(
        window,
        payload,
      );

      processPayload(
        payload,
      );
    }

    window.addEventListener(
      TV_ANDROID_INTENT_EVENT,
      handleAndroidIntent,
    );

    setTvAndroidIntentReady(
      window,
      true,
    );

    for (
      const payload
      of takePendingTvAndroidIntents(
        window,
      )
    ) {
      processPayload(
        payload,
      );
    }

    return () => {
      setTvAndroidIntentReady(
        window,
        false,
      );

      window.removeEventListener(
        TV_ANDROID_INTENT_EVENT,
        handleAndroidIntent,
      );
    };
  }, []);
}
