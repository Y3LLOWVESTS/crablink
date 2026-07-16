import { useEffect } from 'react';

import {
  chooseNextFocus,
} from './focusGraph.js';

const FOCUS_SELECTOR = [
  '[data-tv-focusable="true"]',
  ':not([disabled])',
  ':not([aria-disabled="true"])',
].join('');

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

export function useTvRemoteNavigation() {
  useEffect(() => {
    function focusableElements() {
      return [
        ...document.querySelectorAll(FOCUS_SELECTOR),
      ].filter(isVisible);
    }

    const initialFocusFrame = window.requestAnimationFrame(
      () => {
        const elements = focusableElements();

        const initial =
          elements.find(
            (element) =>
              element.dataset.tvAutofocus === 'true',
          ) ??
          elements[0];

        if (initial && !elements.includes(document.activeElement)) {
          focusElement(initial);
        }
      },
    );

    function handleRemoteKey(event) {
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

      const elements = focusableElements();

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
  }, []);
}
