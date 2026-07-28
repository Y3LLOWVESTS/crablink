import {
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  TV_OVERLAY_KIND,
  closeTvOverlay,
  createTvOverlayState,
  openTvDetailOverlay,
  openTvProblemOverlay,
} from './tvOverlayBackModel.js';

function findFocusableByKey(focusKey) {
  return [
    ...document.querySelectorAll(
      '[data-tv-focus-key]',
    ),
  ].find(
    (element) =>
      element.dataset.tvFocusKey ===
      focusKey,
  );
}

function restoreFocusByKey(focusKey) {
  if (!focusKey) {
    return;
  }

  window.requestAnimationFrame(() => {
    const element =
      findFocusableByKey(focusKey);

    if (!element) {
      return;
    }

    try {
      element.focus({
        preventScroll: true,
      });
    } catch {
      element.focus();
    }

    element.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'auto',
    });
  });
}

export function useTvOverlayController() {
  const [overlayState, setOverlayState] =
    useState(createTvOverlayState);

  const overlayRef =
    useRef(overlayState);

  const commit = useCallback(
    (nextState) => {
      overlayRef.current = nextState;
      setOverlayState(nextState);
      return nextState;
    },
    [],
  );

  const openDetail = useCallback(
    (input) =>
      commit(
        openTvDetailOverlay(input),
      ),
    [commit],
  );

  const openProblem = useCallback(
    (input) =>
      commit(
        openTvProblemOverlay(input),
      ),
    [commit],
  );

  const closeOverlay = useCallback(
    () => {
      const result = closeTvOverlay(
        overlayRef.current,
      );

      if (!result.closed) {
        return false;
      }

      commit(result.state);
      restoreFocusByKey(
        result.restoreFocusKey,
      );

      return true;
    },
    [commit],
  );

  return {
    overlayState,
    overlayOpen:
      overlayState.overlayKind !==
      TV_OVERLAY_KIND.NONE,
    focusScopeKey:
      overlayState.overlayKind,
    openDetail,
    openProblem,
    closeOverlay,
    consumeBack: closeOverlay,
  };
}
