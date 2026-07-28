import { useEffect } from 'react';

import {
  chooseNextFocus,
  wrappedFocusIndex,
} from './focusGraph.js';

const FOCUS_SELECTOR = [
  '[data-tv-focusable="true"]',
  ':not([disabled])',
  ':not([aria-disabled="true"])',
].join('');

const ACTIVE_FOCUS_SCOPE_SELECTOR =
  '[data-tv-focus-scope="active"]';

const KEY_DIRECTIONS = Object.freeze({
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
});

function isVisible(element) {
  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const style = window.getComputedStyle(element);

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden'
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

function preservesNativeArrowBehavior(target) {
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

function activeFocusRoot() {
  return (
    document.querySelector(
      ACTIVE_FOCUS_SCOPE_SELECTOR,
    ) ??
    document
  );
}

export function useTvRemoteNavigation({
  focusScopeKey = 'root',
} = {}) {
  useEffect(() => {
    function focusableElements(root = activeFocusRoot()) {
      return [
        ...root.querySelectorAll(FOCUS_SELECTOR),
      ].filter(isVisible);
    }

    const initialFocusFrame = window.requestAnimationFrame(
      () => {
        const root = activeFocusRoot();
        const elements = focusableElements(root);

        const initial =
          elements.find(
            (element) =>
              element.dataset.tvAutofocus === 'true',
          ) ??
          elements[0];

        if (
          initial &&
          !elements.includes(document.activeElement)
        ) {
          focusElement(initial);
        }
      },
    );

    function handleRemoteKey(event) {
      const root = activeFocusRoot();
      const elements = focusableElements(root);

      if (
        event.key === 'Tab' &&
        root !== document
      ) {
        if (elements.length === 0) {
          return;
        }

        const currentIndex =
          elements.indexOf(document.activeElement);

        const nextIndex = wrappedFocusIndex(
          currentIndex,
          elements.length,
          event.shiftKey,
        );

        if (nextIndex < 0) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        focusElement(elements[nextIndex]);
        return;
      }

      const direction = KEY_DIRECTIONS[event.key];

      if (
        !direction ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        preservesNativeArrowBehavior(event.target)
      ) {
        return;
      }

      if (elements.length === 0) {
        return;
      }

      document.documentElement.dataset.tvInputMode =
        'remote';

      const activeElement = document.activeElement;

      if (!elements.includes(activeElement)) {
        event.preventDefault();
        focusElement(elements[0]);
        return;
      }

      const currentRect =
        activeElement.getBoundingClientRect();

      const candidates = elements
        .filter((element) => element !== activeElement)
        .map((element, index) => ({
          id:
            element.dataset.tvFocusKey ??
            `tv-focus-${index}`,
          element,
          rect: element.getBoundingClientRect(),
        }));

      const next = chooseNextFocus(
        currentRect,
        candidates,
        direction,
      );

      if (!next) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      focusElement(next.element);
    }

    window.addEventListener(
      'keydown',
      handleRemoteKey,
      true,
    );

    return () => {
      window.cancelAnimationFrame(initialFocusFrame);
      window.removeEventListener(
        'keydown',
        handleRemoteKey,
        true,
      );
    };
  }, [focusScopeKey]);
}
