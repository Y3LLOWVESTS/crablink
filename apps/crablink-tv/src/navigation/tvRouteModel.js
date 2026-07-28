/**
 * Pure route-state behavior for CrabLink TV.
 *
 * Shared CrabLink input parsing and normalized crab:// route truth come from
 * @crablink/core. Browser history, DOM focus, Back handling, and section-depth
 * behavior remain TV-specific and are handled by this model and its React hook.
 */

import {
  parseCrabInput,
} from '../../../../packages/crablink-core/src/index.js';

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

  if (
    !Number.isSafeInteger(depth) ||
    depth < 0
  ) {
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

function normalizeSectionIds(sectionIds) {
  if (!Array.isArray(sectionIds)) {
    return [];
  }

  return [
    ...new Set(
      sectionIds.filter(
        (sectionId) =>
          typeof sectionId === 'string' &&
          sectionId.length > 0,
      ),
    ),
  ];
}

export function normalizeTvSectionId(
  sectionIds,
  candidate,
  initialSectionId,
) {
  const normalizedSectionIds =
    normalizeSectionIds(sectionIds);

  if (
    typeof candidate === 'string' &&
    normalizedSectionIds.includes(candidate)
  ) {
    return candidate;
  }

  if (
    normalizedSectionIds.includes(
      initialSectionId,
    )
  ) {
    return initialSectionId;
  }

  return normalizedSectionIds[0] ?? 'home';
}

export function normalizeTvCrabRoute(
  candidate,
  sectionIds,
  initialSectionId = 'home',
) {
  const normalizedSectionIds =
    normalizeSectionIds(sectionIds);

  const fallbackSectionId =
    normalizeTvSectionId(
      normalizedSectionIds,
      initialSectionId,
      initialSectionId,
    );

  const builtIns = [
    ...new Set([
      ...normalizedSectionIds,
      fallbackSectionId,
    ]),
  ];

  const parsed = parseCrabInput(
    candidate,
    {
      builtIns,
    },
  );

  if (
    parsed.kind === 'builtin' &&
    builtIns.includes(parsed.routeKind)
  ) {
    return parseCrabInput(
      parsed.normalized,
      {
        builtIns,
      },
    );
  }

  return parseCrabInput(
    `crab://${fallbackSectionId}`,
    {
      builtIns,
    },
  );
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
    crabRoute: normalizeTvCrabRoute(
      sectionId,
      sectionIds,
      initialSectionId,
    ),
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
    crabRoute: normalizeTvCrabRoute(
      sectionId,
      sectionIds,
      initialSectionId,
    ),
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

  if (
    normalizedSectionId ===
    current.sectionId
  ) {
    return null;
  }

  return {
    kind: TV_ROUTE_KIND,
    sectionId: normalizedSectionId,
    crabRoute: normalizeTvCrabRoute(
      normalizedSectionId,
      sectionIds,
      initialSectionId,
    ),
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
