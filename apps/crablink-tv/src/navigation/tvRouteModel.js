/**
 * Pure route-state behavior for CrabLink TV.
 *
 * Browser history and DOM focus are handled by the React hook. This module
 * owns validation, depth changes, Back-key recognition, and restoration order
 * so those rules can be tested without a WebView.
 */

export const TV_ROUTE_KIND =
  'crablink-tv-route-v1';

const TV_BACK_KEYS = new Set([
  'Escape',
  'BrowserBack',
  'GoBack',
  'Backspace',
]);

function normalizeDepth(value) {
  const depth = Number(value);

  if (!Number.isSafeInteger(depth) || depth < 0) {
    return 0;
  }

  return depth;
}

function normalizeFocusKey(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (
    trimmed.length === 0 ||
    trimmed.length > 128
  ) {
    return null;
  }

  return trimmed;
}

export function normalizeTvSectionId(
  sectionIds,
  candidate,
  initialSectionId,
) {
  if (
    typeof candidate === 'string' &&
    sectionIds.includes(candidate)
  ) {
    return candidate;
  }

  if (sectionIds.includes(initialSectionId)) {
    return initialSectionId;
  }

  return sectionIds[0] ?? 'home';
}

export function createInitialTvRoute(
  sectionIds,
  initialSectionId = 'home',
) {
  const sectionId = normalizeTvSectionId(
    sectionIds,
    initialSectionId,
    initialSectionId,
  );

  return {
    kind: TV_ROUTE_KIND,
    sectionId,
    focusKey: `nav-${sectionId}`,
    depth: 0,
  };
}

export function isTvRouteState(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    value.kind === TV_ROUTE_KIND
  );
}

export function normalizeTvRouteState(
  value,
  sectionIds,
  initialSectionId = 'home',
) {
  if (!isTvRouteState(value)) {
    return createInitialTvRoute(
      sectionIds,
      initialSectionId,
    );
  }

  const sectionId = normalizeTvSectionId(
    sectionIds,
    value.sectionId,
    initialSectionId,
  );

  return {
    kind: TV_ROUTE_KIND,
    sectionId,
    focusKey:
      normalizeFocusKey(value.focusKey) ??
      `nav-${sectionId}`,
    depth: normalizeDepth(value.depth),
  };
}

export function createNextTvRoute(
  currentValue,
  nextSectionId,
  initiatingFocusKey,
  sectionIds,
  initialSectionId = 'home',
) {
  const current = normalizeTvRouteState(
    currentValue,
    sectionIds,
    initialSectionId,
  );

  const normalizedSectionId =
    normalizeTvSectionId(
      sectionIds,
      nextSectionId,
      initialSectionId,
    );

  if (normalizedSectionId === current.sectionId) {
    return null;
  }

  return {
    kind: TV_ROUTE_KIND,
    sectionId: normalizedSectionId,
    focusKey:
      normalizeFocusKey(initiatingFocusKey) ??
      `nav-${normalizedSectionId}`,
    depth: current.depth + 1,
  };
}

export function updateTvRouteFocus(
  currentValue,
  focusKey,
  sectionIds,
  initialSectionId = 'home',
) {
  const current = normalizeTvRouteState(
    currentValue,
    sectionIds,
    initialSectionId,
  );

  return {
    ...current,
    focusKey:
      normalizeFocusKey(focusKey) ??
      current.focusKey,
  };
}

export function focusKeysForTvRoute(route) {
  const keys = [
    route?.focusKey,
    route?.sectionId
      ? `nav-${route.sectionId}`
      : null,
    'nav-home',
  ];

  return [
    ...new Set(
      keys.filter(
        (key) =>
          typeof key === 'string' &&
          key.length > 0,
      ),
    ),
  ];
}

export function isTvBackKey(key) {
  return TV_BACK_KEYS.has(key);
}
