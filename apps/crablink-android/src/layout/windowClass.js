import {
  useEffect,
  useState,
} from 'react';

export const ANDROID_WINDOW_CLASSES = Object.freeze({
  compact: 'compact',
  medium: 'medium',
  expanded: 'expanded',
  large: 'large',
  extraLarge: 'extra_large',
});

export function classifyAndroidWindow(
  width,
  height,
) {
  const safeWidth = Number.isFinite(width)
    ? Math.max(0, width)
    : 0;

  const safeHeight = Number.isFinite(height)
    ? Math.max(0, height)
    : 0;

  let sizeClass = ANDROID_WINDOW_CLASSES.compact;

  if (safeWidth >= 1600) {
    sizeClass = ANDROID_WINDOW_CLASSES.extraLarge;
  } else if (safeWidth >= 1200) {
    sizeClass = ANDROID_WINDOW_CLASSES.large;
  } else if (safeWidth >= 840) {
    sizeClass = ANDROID_WINDOW_CLASSES.expanded;
  } else if (safeWidth >= 600) {
    sizeClass = ANDROID_WINDOW_CLASSES.medium;
  }

  return Object.freeze({
    width: safeWidth,
    height: safeHeight,
    sizeClass,
    compactHeight: safeHeight > 0 && safeHeight < 480,
  });
}

function readCurrentWindow() {
  const viewport = globalThis.visualViewport;

  return classifyAndroidWindow(
    viewport?.width ?? globalThis.innerWidth ?? 0,
    viewport?.height ?? globalThis.innerHeight ?? 0,
  );
}

export function useAndroidWindowClass() {
  const [windowClass, setWindowClass] = useState(
    readCurrentWindow,
  );

  useEffect(() => {
    const update = () => {
      setWindowClass(readCurrentWindow());
    };

    const viewport = globalThis.visualViewport;
    const observer = typeof ResizeObserver === 'function'
      ? new ResizeObserver(update)
      : null;

    observer?.observe(document.documentElement);
    viewport?.addEventListener('resize', update);
    globalThis.addEventListener('resize', update);

    return () => {
      observer?.disconnect();
      viewport?.removeEventListener('resize', update);
      globalThis.removeEventListener('resize', update);
    };
  }, []);

  return windowClass;
}
