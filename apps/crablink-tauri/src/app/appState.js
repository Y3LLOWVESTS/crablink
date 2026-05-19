/**
 * RO:WHAT — React route state hook for the CrabLink full-tab browser shell.
 * RO:WHY — App Integration; centralizes navigation and avoids Vite's ?url asset-query trap in Tauri.
 * RO:INTERACTS — router.js, App.jsx, Shell, AddressBar, BrowserNav, devPassportSessions.
 * RO:INVARIANTS — route state is UI state only; backend remains canonical; no fake CIDs/receipts/balances.
 * RO:METRICS — none yet.
 * RO:CONFIG — reads legacy ?url= when already loaded, prefers hash #url= for Tauri-safe routing.
 * RO:SECURITY — no secrets in URL state; no backend mutation.
 * RO:TEST — npm run build; manual Back/Forward/Home/Refresh route smoke; Visitor B dev session smoke.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseRouteInput } from './router.js';

const DEFAULT_ROUTE_INPUT = 'crab://home';

export function useRouteState() {
  const [route, setRoute] = useState(() => routeFromBrowserLocation());
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const syncFromLocation = () => {
      setRoute(routeFromBrowserLocation());
      setRefreshTick((value) => value + 1);
    };

    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('hashchange', syncFromLocation);

    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('hashchange', syncFromLocation);
    };
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
  const hashSeed = readRouteSeedFromHash(window.location.hash || '');

  if (hashSeed) {
    return hashSeed;
  }

  const params = new URLSearchParams(window.location.search || '');
  const fromLegacyQuery = params.get('url') || params.get('crabUrl') || params.get('route');

  if (fromLegacyQuery) {
    return fromLegacyQuery;
  }

  return '';
}

function readRouteSeedFromHash(hashValue) {
  const hash = String(hashValue || '').replace(/^#/, '').trim();

  if (!hash) {
    return '';
  }

  const normalizedHash = hash.startsWith('?') ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(normalizedHash);
  const fromHashParam = hashParams.get('url') || hashParams.get('crabUrl') || hashParams.get('route');

  if (fromHashParam) {
    return fromHashParam;
  }

  if (hash.startsWith('crab://') || hash.startsWith('b3:')) {
    return hash;
  }

  return '';
}

function writeRouteToBrowserLocation(route, { replace = false } = {}) {
  const nextUrl = new URL(window.location.href);
  const hashParams = readHashParams(nextUrl.hash);

  hashParams.set('url', route.normalizedInput || DEFAULT_ROUTE_INPUT);

  nextUrl.search = '';
  nextUrl.hash = hashParams.toString();

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

function readHashParams(hashValue) {
  const hash = String(hashValue || '').replace(/^#/, '').trim();

  if (!hash) {
    return new URLSearchParams();
  }

  if (hash.startsWith('crab://') || hash.startsWith('b3:')) {
    return new URLSearchParams({ url: hash });
  }

  return new URLSearchParams(hash.startsWith('?') ? hash.slice(1) : hash);
}