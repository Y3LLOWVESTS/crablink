/**
 * RO:WHAT — React route state hook for the CrabLink full-tab browser shell.
 * RO:WHY — App Integration; Concerns: DX/RES; centralizes navigation without page-level DOM rescue scripts.
 * RO:INTERACTS — router.js, App.jsx, Shell, AddressBar, BrowserNav.
 * RO:INVARIANTS — route state is UI state only; backend remains canonical; no fake CIDs/receipts/balances.
 * RO:METRICS — none yet.
 * RO:CONFIG — reads initial route from ?url=, #url=, or empty home default.
 * RO:SECURITY — no secrets in URL state; no backend mutation.
 * RO:TEST — npm run build; manual Back/Forward/Home/Refresh route smoke.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseRouteInput } from './router.js';

const DEFAULT_ROUTE_INPUT = 'crab://home';

export function useRouteState() {
  const [route, setRoute] = useState(() => routeFromBrowserLocation());
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const onPopState = () => {
      setRoute(routeFromBrowserLocation());
      setRefreshTick((value) => value + 1);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((input, options = {}) => {
    const next = parseRouteInput(input || DEFAULT_ROUTE_INPUT);

    writeRouteToBrowserLocation(next, {
      replace: Boolean(options.replace),
    });

    setRoute(next);
    setRefreshTick((value) => value + 1);
    return next;
  }, []);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const goForward = useCallback(() => {
    window.history.forward();
  }, []);

  const goHome = useCallback(() => {
    navigate(DEFAULT_ROUTE_INPUT);
  }, [navigate]);

  const refreshRoute = useCallback(() => {
    setRoute((current) => parseRouteInput(current.normalizedInput || current.rawInput || DEFAULT_ROUTE_INPUT));
    setRefreshTick((value) => value + 1);
  }, []);

  return useMemo(
    () => ({
      route: {
        ...route,
        refreshTick,
      },
      navigate,
      goBack,
      goForward,
      goHome,
      refreshRoute,
    }),
    [route, refreshTick, navigate, goBack, goForward, goHome, refreshRoute],
  );
}

function routeFromBrowserLocation() {
  const seeded = readRouteSeedFromLocation();
  return parseRouteInput(seeded || DEFAULT_ROUTE_INPUT);
}

function readRouteSeedFromLocation() {
  const params = new URLSearchParams(window.location.search || '');
  const fromQuery = params.get('url');

  if (fromQuery) {
    return fromQuery;
  }

  const hash = String(window.location.hash || '').replace(/^#/, '');
  if (!hash) {
    return '';
  }

  const hashParams = new URLSearchParams(hash);
  return hashParams.get('url') || hash;
}

function writeRouteToBrowserLocation(route, { replace = false } = {}) {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('url', route.normalizedInput || DEFAULT_ROUTE_INPUT);
  nextUrl.hash = '';

  const state = {
    crablinkRoute: route.normalizedInput,
    crablinkRouteKind: route.kind,
  };

  if (replace) {
    window.history.replaceState(state, '', nextUrl);
    return;
  }

  window.history.pushState(state, '', nextUrl);
}