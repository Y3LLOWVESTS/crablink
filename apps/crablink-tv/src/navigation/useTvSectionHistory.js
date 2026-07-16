import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  createInitialTvRoute,
  createNextTvRoute,
  focusKeysForTvRoute,
  isTvBackKey,
  isTvRouteState,
  normalizeTvRouteState,
  updateTvRouteFocus,
} from './tvRouteModel.js';

function targetAcceptsTextInput(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return [
    'INPUT',
    'SELECT',
    'TEXTAREA',
  ].includes(target.tagName);
}

function safeReplaceState(route) {
  try {
    window.history.replaceState(route, '');
    return true;
  } catch {
    return false;
  }
}

function findFocusableByKey(focusKey) {
  return [
    ...document.querySelectorAll(
      '[data-tv-focus-key]',
    ),
  ].find(
    (element) =>
      element.dataset.tvFocusKey === focusKey,
  );
}

function focusElement(element) {
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
}

function restoreTvRouteFocus(route) {
  window.requestAnimationFrame(() => {
    for (
      const focusKey of focusKeysForTvRoute(route)
    ) {
      const element =
        findFocusableByKey(focusKey);

      if (element) {
        focusElement(element);
        return;
      }
    }
  });
}

export function useTvSectionHistory({
  sectionIds,
  initialSectionId = 'home',
}) {
  const sectionIdsRef = useRef([
    ...sectionIds,
  ]);

  const initialSectionIdRef = useRef(
    initialSectionId,
  );

  const [route, setRoute] = useState(() =>
    createInitialTvRoute(
      sectionIdsRef.current,
      initialSectionIdRef.current,
    ),
  );

  const routeRef = useRef(route);

  useEffect(() => {
    const normalizedRoute =
      normalizeTvRouteState(
        window.history.state,
        sectionIdsRef.current,
        initialSectionIdRef.current,
      );

    routeRef.current = normalizedRoute;
    setRoute(normalizedRoute);
    safeReplaceState(normalizedRoute);

    function handleHistoryChange(event) {
      if (!isTvRouteState(event.state)) {
        return;
      }

      const restoredRoute =
        normalizeTvRouteState(
          event.state,
          sectionIdsRef.current,
          initialSectionIdRef.current,
        );

      routeRef.current = restoredRoute;
      setRoute(restoredRoute);
      restoreTvRouteFocus(restoredRoute);
    }

    function handleFocusChange(event) {
      const focusKey =
        event.target?.dataset?.tvFocusKey;

      if (!focusKey) {
        return;
      }

      const updatedRoute = updateTvRouteFocus(
        routeRef.current,
        focusKey,
        sectionIdsRef.current,
        initialSectionIdRef.current,
      );

      if (
        updatedRoute.focusKey ===
        routeRef.current.focusKey
      ) {
        return;
      }

      routeRef.current = updatedRoute;
      safeReplaceState(updatedRoute);
    }

    function handleBackKey(event) {
      if (
        !isTvBackKey(event.key) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        targetAcceptsTextInput(event.target)
      ) {
        return;
      }

      if (routeRef.current.depth <= 0) {
        // At the root, do not trap Back. Android remains free to leave
        // the application or apply its normal system behavior.
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      window.history.back();
    }

    window.addEventListener(
      'popstate',
      handleHistoryChange,
    );

    window.addEventListener(
      'focusin',
      handleFocusChange,
      true,
    );

    window.addEventListener(
      'keydown',
      handleBackKey,
      true,
    );

    return () => {
      window.removeEventListener(
        'popstate',
        handleHistoryChange,
      );

      window.removeEventListener(
        'focusin',
        handleFocusChange,
        true,
      );

      window.removeEventListener(
        'keydown',
        handleBackKey,
        true,
      );
    };
  }, []);

  const navigateToSection = useCallback(
    (
      nextSectionId,
      initiatingFocusKey,
    ) => {
      const nextRoute = createNextTvRoute(
        routeRef.current,
        nextSectionId,
        initiatingFocusKey,
        sectionIdsRef.current,
        initialSectionIdRef.current,
      );

      if (!nextRoute) {
        return false;
      }

      try {
        window.history.pushState(
          nextRoute,
          '',
        );
      } catch {
        // Keep navigation usable without pretending a Back entry exists.
        nextRoute.depth =
          routeRef.current.depth;
        safeReplaceState(nextRoute);
      }

      routeRef.current = nextRoute;
      setRoute(nextRoute);
      restoreTvRouteFocus(nextRoute);

      return true;
    },
    [],
  );

  return {
    activeSectionId: route.sectionId,
    routeDepth: route.depth,
    navigateToSection,
  };
}
