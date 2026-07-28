/**
 * TV-only route approval and immutable route-stack behavior.
 *
 * Shared core owns crab:// parsing and normalization.
 * This module owns only TV route acceptance, failure typing,
 * stack depth, and focus-return data.
 */

import {
  describeAssetKind,
  parseCrabInput,
  stripCrabPrefix,
  stripQueryAndHash,
} from '../../../../packages/crablink-core/src/index.js';

export const TV_ROUTE_RESULT_KIND = Object.freeze({
  READY: 'ready',
  NOT_FOUND: 'not-found',
  PROBLEM: 'problem',
});

export const TV_ROUTE_PROBLEM_CODE = Object.freeze({
  MALFORMED_CRAB_ROUTE:
    'MALFORMED_CRAB_ROUTE',
  UNAPPROVED_ROUTE_SCHEME:
    'UNAPPROVED_ROUTE_SCHEME',
  UNSUPPORTED_TV_ROUTE:
    'UNSUPPORTED_TV_ROUTE',
  UNSUPPORTED_ASSET_KIND:
    'UNSUPPORTED_ASSET_KIND',
});

export const TV_BUILTIN_ROUTE_KINDS =
  Object.freeze([
    'home',
    'earn',
    'library',
    'pair',
    'receipts',
    'settings',
    'profile',
  ]);

export const TV_TYPED_ASSET_ROUTE_KINDS =
  Object.freeze([
    'image',
    'video',
    'music',
    'podcast',
    'stream',
    'article',
    'text',
  ]);

export const TV_BLOCKED_DESKTOP_ROUTE_KINDS =
  Object.freeze([
    'operator',
    'quickchain',
    'make',
    'lyrics',
    'post',
    'comment',
    'podcasts',
    'chat',
    'ad',
    'algo',
    'code',
    'game',
    'asset',
    'notfound',
    'problem',
  ]);

export const TV_ROUTE_STACK_KIND =
  'crablink-tv-route-stack-v1';

export const TV_ROUTE_STACK_LIMIT = 32;

const builtIns =
  new Set(TV_BUILTIN_ROUTE_KINDS);

const blocked =
  new Set(
    TV_BLOCKED_DESKTOP_ROUTE_KINDS,
  );

const problemCodes =
  new Set(
    Object.values(
      TV_ROUTE_PROBLEM_CODE,
    ),
  );

const foreignScheme =
  /^[a-z][a-z0-9+.-]*:\/\//i;

const freeze =
  (value) => Object.freeze(value);

const problem =
  (code) =>
    freeze({
      kind:
        TV_ROUTE_RESULT_KIND.PROBLEM,
      owner: 'problem',
      routeKind: 'problem',
      code,
    });

const notFound =
  (code, requestedKind = '') =>
    freeze({
      kind:
        TV_ROUTE_RESULT_KIND.NOT_FOUND,
      owner: 'notFound',
      routeKind: 'notFound',
      code,
      requestedKind,
    });

const policyBody =
  (value) =>
    stripQueryAndHash(
      stripCrabPrefix(value),
    )
      .replace(/^\/+|\/+$/g, '')
      .trim()
      .toLowerCase();

export function isTvResolvedRoute(
  value,
) {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return false;
  }

  if (
    value.kind ===
    TV_ROUTE_RESULT_KIND.READY
  ) {
    return (
      [
        'section',
        'site',
        'asset',
      ].includes(value.owner) &&
      typeof value.routeKind ===
        'string' &&
      typeof value.normalized ===
        'string' &&
      value.normalized.startsWith(
        'crab://',
      )
    );
  }

  if (
    value.kind ===
    TV_ROUTE_RESULT_KIND.PROBLEM
  ) {
    return (
      value.owner === 'problem' &&
      value.routeKind === 'problem' &&
      problemCodes.has(value.code)
    );
  }

  return (
    value.kind ===
      TV_ROUTE_RESULT_KIND.NOT_FOUND &&
    value.owner === 'notFound' &&
    value.routeKind === 'notFound' &&
    problemCodes.has(value.code) &&
    typeof value.requestedKind ===
      'string'
  );
}

export function resolveTvRouteInput(
  value,
  {
    requireCrabScheme = false,
  } = {},
) {
  const raw =
    String(value || '').trim();

  if (!raw) {
    return problem(
      TV_ROUTE_PROBLEM_CODE
        .MALFORMED_CRAB_ROUTE,
    );
  }

  const hasCrabScheme =
    raw
      .toLowerCase()
      .startsWith('crab://');

  if (
    (
      requireCrabScheme &&
      !hasCrabScheme
    ) ||
    (
      foreignScheme.test(raw) &&
      !hasCrabScheme
    )
  ) {
    return problem(
      TV_ROUTE_PROBLEM_CODE
        .UNAPPROVED_ROUTE_SCHEME,
    );
  }

  const requestedKind =
    policyBody(raw);

  if (blocked.has(requestedKind)) {
    return notFound(
      TV_ROUTE_PROBLEM_CODE
        .UNSUPPORTED_TV_ROUTE,
      requestedKind,
    );
  }

  const parsed =
    parseCrabInput(
      raw,
      {
        builtIns:
          TV_BUILTIN_ROUTE_KINDS,
      },
    );

  if (
    parsed.kind === 'builtin' &&
    builtIns.has(parsed.routeKind)
  ) {
    return freeze({
      kind:
        TV_ROUTE_RESULT_KIND.READY,
      owner: 'section',
      routeKind: parsed.routeKind,
      sectionId: parsed.routeKind,
      normalized: parsed.normalized,
    });
  }

  if (parsed.kind === 'site') {
    return freeze({
      kind:
        TV_ROUTE_RESULT_KIND.READY,
      owner: 'site',
      routeKind: 'site',
      siteName: parsed.siteName,
      normalized: parsed.normalized,
    });
  }

  if (parsed.kind === 'asset') {
    const described =
      describeAssetKind(
        parsed.assetKind,
        TV_TYPED_ASSET_ROUTE_KINDS,
        'notFound',
      );

    if (
      described.routeOwner ===
      'notFound'
    ) {
      return notFound(
        TV_ROUTE_PROBLEM_CODE
          .UNSUPPORTED_ASSET_KIND,
        described.kind,
      );
    }

    return freeze({
      kind:
        TV_ROUTE_RESULT_KIND.READY,
      owner: 'asset',
      routeKind:
        described.routeOwner,
      assetKind:
        parsed.assetKind,
      hash: parsed.hash,
      cid: parsed.cid,
      normalized: parsed.normalized,
    });
  }

  return problem(
    TV_ROUTE_PROBLEM_CODE
      .MALFORMED_CRAB_ROUTE,
  );
}

function focusKey(value) {
  const normalized =
    typeof value === 'string'
      ? value.trim()
      : '';

  return (
    normalized &&
    normalized.length <= 128
  )
    ? normalized
    : null;
}

function homeRoute() {
  return resolveTvRouteInput(
    'crab://home',
  );
}

function normalizeRoute(value) {
  if (!isTvResolvedRoute(value)) {
    return homeRoute();
  }

  if (Object.isFrozen(value)) {
    return value;
  }

  if (
    value.kind ===
    TV_ROUTE_RESULT_KIND.READY
  ) {
    return resolveTvRouteInput(
      value.normalized,
    );
  }

  return (
    value.kind ===
    TV_ROUTE_RESULT_KIND.PROBLEM
  )
    ? problem(value.code)
    : notFound(
        value.code,
        value.requestedKind,
      );
}

function entry(
  route,
  returnFocusKey = null,
) {
  return freeze({
    route:
      normalizeRoute(route),
    returnFocusKey:
      focusKey(returnFocusKey),
  });
}

function stack(entries) {
  return freeze({
    kind:
      TV_ROUTE_STACK_KIND,
    entries:
      freeze(entries),
  });
}

function routeId(route) {
  return [
    route.kind,
    route.routeKind,
    route.normalized ?? '',
    route.code ?? '',
    route.requestedKind ?? '',
  ].join('|');
}

export function createTvRouteStack(
  initialRoute = homeRoute(),
  returnFocusKey = 'nav-home',
) {
  return stack([
    entry(
      initialRoute,
      returnFocusKey,
    ),
  ]);
}

export function normalizeTvRouteStack(
  value,
) {
  if (
    !value ||
    value.kind !==
      TV_ROUTE_STACK_KIND ||
    !Array.isArray(value.entries) ||
    value.entries.length === 0
  ) {
    return createTvRouteStack();
  }

  if (
    Object.isFrozen(value) &&
    Object.isFrozen(value.entries) &&
    value.entries.length <=
      TV_ROUTE_STACK_LIMIT &&
    value.entries.every(
      (item) =>
        Object.isFrozen(item) &&
        isTvResolvedRoute(
          item.route,
        ) &&
        focusKey(
          item.returnFocusKey,
        ) ===
          item.returnFocusKey,
    )
  ) {
    return value;
  }

  return stack(
    value.entries
      .slice(
        -TV_ROUTE_STACK_LIMIT,
      )
      .map(
        (item) =>
          entry(
            item?.route,
            item?.returnFocusKey,
          ),
      ),
  );
}

export function currentTvRouteEntry(
  value,
) {
  const normalized =
    normalizeTvRouteStack(value);

  return normalized.entries[
    normalized.entries.length - 1
  ];
}

export function tvRouteStackDepth(
  value,
) {
  return Math.max(
    0,
    normalizeTvRouteStack(
      value,
    ).entries.length - 1,
  );
}

export function pushTvRoute(
  value,
  route,
  returnFocusKey = null,
) {
  const current =
    normalizeTvRouteStack(value);

  const nextRoute =
    normalizeRoute(route);

  if (
    routeId(
      currentTvRouteEntry(
        current,
      ).route,
    ) ===
    routeId(nextRoute)
  ) {
    return current;
  }

  return stack(
    [
      ...current.entries,
      entry(
        nextRoute,
        returnFocusKey,
      ),
    ].slice(
      -TV_ROUTE_STACK_LIMIT,
    ),
  );
}

export function updateCurrentTvRouteFocus(
  value,
  returnFocusKey,
) {
  const current =
    normalizeTvRouteStack(value);

  const nextFocus =
    focusKey(returnFocusKey);

  if (!nextFocus) {
    return current;
  }

  const index =
    current.entries.length - 1;

  if (
    current.entries[index]
      .returnFocusKey ===
    nextFocus
  ) {
    return current;
  }

  const entries =
    [...current.entries];

  entries[index] =
    entry(
      entries[index].route,
      nextFocus,
    );

  return stack(entries);
}

export function popTvRoute(value) {
  const current =
    normalizeTvRouteStack(value);

  const removed =
    currentTvRouteEntry(current);

  if (
    current.entries.length === 1
  ) {
    return freeze({
      popped: false,
      stack: current,
      route: removed.route,
      restoreFocusKey:
        removed.returnFocusKey,
    });
  }

  const nextStack =
    stack(
      current.entries.slice(0, -1),
    );

  const restored =
    currentTvRouteEntry(
      nextStack,
    );

  return freeze({
    popped: true,
    stack: nextStack,
    route: restored.route,
    restoreFocusKey:
      removed.returnFocusKey ??
      restored.returnFocusKey,
  });
}
