/**
 * RO:WHAT — In-memory tabbed route state hook for the CrabLink Tauri browser shell.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; lets several route-owned pages stay mounted without turning tabs into backend truth.
 * RO:INTERACTS — router.js, App.jsx, Shell, BrowserTabs, AddressBar, BrowserNav, dev Passport sessions.
 * RO:INVARIANTS — tab state is UI/display state only; max 10 tabs; backend remains canonical; no fake CIDs/receipts/balances.
 * RO:METRICS — none yet.
 * RO:CONFIG — reads legacy ?url= when already loaded, prefers hash #url= for Tauri-safe active-tab routing.
 * RO:SECURITY — no secrets in URL or tab state; no backend mutation; tab restore does not grant paid access.
 * RO:TEST — npm run build; manual tab smoke, Back/Forward/Home/Refresh, stream tab preservation, Visitor B dev session smoke.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseRouteInput } from './router.js';

const DEFAULT_ROUTE_INPUT = 'crab://home';
const MAX_TABS = 10;

let nextTabSequence = Date.now();

export function useRouteState() {
  const locationWriteModeRef = useRef('replace');
  const [tabState, setTabState] = useState(() => {
    const route = routeFromBrowserLocation();
    const tab = makeTab(route);

    return {
      tabs: [tab],
      activeTabId: tab.id,
    };
  });

  const activeTab = useMemo(
    () => tabState.tabs.find((tab) => tab.id === tabState.activeTabId) || tabState.tabs[0],
    [tabState],
  );

  const activeRoute = activeTab?.route || parseRouteInput(DEFAULT_ROUTE_INPUT);

  useEffect(() => {
    const syncFromLocation = () => {
      const nextRoute = routeFromBrowserLocation();

      setTabState((current) => updateActiveTabFromLocation(current, nextRoute));
    };

    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('hashchange', syncFromLocation);

    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('hashchange', syncFromLocation);
    };
  }, []);

  useEffect(() => {
    const mode = locationWriteModeRef.current || 'replace';

    writeRouteToBrowserLocation(activeRoute, {
      replace: mode !== 'push',
    });

    locationWriteModeRef.current = 'replace';
  }, [activeRoute?.normalizedInput, activeRoute?.kind, activeRoute?.refreshTick]);

  const openRouteInNewTab = useCallback((route, options = {}) => {
    if (tabState.tabs.length >= MAX_TABS) {
      return {
        ok: false,
        reason: 'max_tabs',
        maxTabs: MAX_TABS,
      };
    }

    const nextTab = makeTab(route || parseRouteInput(DEFAULT_ROUTE_INPUT));
    const activate = options.activate !== false;

    locationWriteModeRef.current = activate ? 'push' : 'replace';

    setTabState((current) => {
      if (current.tabs.length >= MAX_TABS) {
        return current;
      }

      return {
        tabs: [...current.tabs, nextTab],
        activeTabId: activate ? nextTab.id : current.activeTabId,
      };
    });

    return {
      ok: true,
      tabId: nextTab.id,
      route: nextTab.route,
    };
  }, [tabState.tabs.length]);

  const navigate = useCallback((input, options = {}) => {
    const nextRoute = parseRouteInput(input || DEFAULT_ROUTE_INPUT);

    if (options.target === 'newTab') {
      return openRouteInNewTab(nextRoute, {
        activate: options.activate !== false,
      });
    }

    locationWriteModeRef.current = options.replace ? 'replace' : 'push';

    setTabState((current) => navigateActiveTab(current, nextRoute, {
      replace: Boolean(options.replace),
    }));

    return nextRoute;
  }, [openRouteInNewTab]);

  const goBack = useCallback(() => {
    locationWriteModeRef.current = 'replace';

    setTabState((current) => moveActiveTabHistory(current, -1));
  }, []);

  const goForward = useCallback(() => {
    locationWriteModeRef.current = 'replace';

    setTabState((current) => moveActiveTabHistory(current, 1));
  }, []);

  const goHome = useCallback(() => {
    navigate(DEFAULT_ROUTE_INPUT);
  }, [navigate]);

  const refreshRoute = useCallback(() => {
    locationWriteModeRef.current = 'replace';

    setTabState((current) => refreshActiveTab(current));
  }, []);

  const openNewTab = useCallback((input = DEFAULT_ROUTE_INPUT, options = {}) => {
    const route = parseRouteInput(input || DEFAULT_ROUTE_INPUT);

    return openRouteInNewTab(route, {
      activate: options.activate !== false,
    });
  }, [openRouteInNewTab]);

  const closeTab = useCallback((tabId) => {
    locationWriteModeRef.current = 'replace';

    let closed = false;

    setTabState((current) => {
      const next = closeTabInState(current, tabId);

      closed = next !== current;
      return next;
    });

    return closed;
  }, []);

  const activateTab = useCallback((tabId) => {
    locationWriteModeRef.current = 'replace';

    let activated = false;

    setTabState((current) => {
      const tab = current.tabs.find((candidate) => candidate.id === tabId);

      if (!tab || current.activeTabId === tabId) {
        return current;
      }

      activated = true;
      return {
        ...current,
        activeTabId: tab.id,
      };
    });

    return activated;
  }, []);

  const focusNextTab = useCallback(() => {
    locationWriteModeRef.current = 'replace';

    setTabState((current) => focusTabByOffset(current, 1));
  }, []);

  const focusPreviousTab = useCallback(() => {
    locationWriteModeRef.current = 'replace';

    setTabState((current) => focusTabByOffset(current, -1));
  }, []);

  const focusTabByIndex = useCallback((index) => {
    locationWriteModeRef.current = 'replace';

    setTabState((current) => {
      const tab = current.tabs[index];

      if (!tab || current.activeTabId === tab.id) {
        return current;
      }

      return {
        ...current,
        activeTabId: tab.id,
      };
    });
  }, []);

  const activeHistory = activeTab?.history || [];
  const activeHistoryIndex = Number.isInteger(activeTab?.historyIndex) ? activeTab.historyIndex : 0;

  return useMemo(
    () => ({
      route: activeRoute,
      tabs: tabState.tabs,
      activeTabId: tabState.activeTabId,
      activeTab,
      maxTabs: MAX_TABS,
      canOpenNewTab: tabState.tabs.length < MAX_TABS,
      canCloseTab: tabState.tabs.length > 1,
      canGoBack: activeHistoryIndex > 0,
      canGoForward: activeHistoryIndex < activeHistory.length - 1,
      navigate,
      goBack,
      goForward,
      goHome,
      refreshRoute,
      openNewTab,
      closeTab,
      activateTab,
      focusNextTab,
      focusPreviousTab,
      focusTabByIndex,
    }),
    [
      activeRoute,
      activeTab,
      activeHistory.length,
      activeHistoryIndex,
      tabState.tabs,
      tabState.activeTabId,
      navigate,
      goBack,
      goForward,
      goHome,
      refreshRoute,
      openNewTab,
      closeTab,
      activateTab,
      focusNextTab,
      focusPreviousTab,
      focusTabByIndex,
    ],
  );
}

function makeTab(route, overrides = {}) {
  const safeRoute = withRefreshTick(route || parseRouteInput(DEFAULT_ROUTE_INPUT), 0);

  return Object.freeze({
    id: overrides.id || createTabId(),
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    route: safeRoute,
    history: Object.freeze([safeRoute.normalizedInput || DEFAULT_ROUTE_INPUT]),
    historyIndex: 0,
    refreshTick: 0,
  });
}

function createTabId() {
  nextTabSequence += 1;
  return `cl-tab-${nextTabSequence.toString(36)}`;
}

function navigateActiveTab(current, route, { replace = false } = {}) {
  const activeTab = findActiveTab(current);

  if (!activeTab) {
    const nextTab = makeTab(route);
    return {
      tabs: [nextTab],
      activeTabId: nextTab.id,
    };
  }

  const nextTab = updateTabRoute(activeTab, route, { replace });
  return replaceTab(current, nextTab);
}

function closeTabInState(current, tabId) {
  if (!tabId || current.tabs.length <= 1) {
    return current;
  }

  const index = current.tabs.findIndex((tab) => tab.id === tabId);

  if (index < 0) {
    return current;
  }

  const tabs = current.tabs.filter((tab) => tab.id !== tabId);

  let activeTabId = current.activeTabId;

  if (current.activeTabId === tabId) {
    const fallbackIndex = Math.min(index, tabs.length - 1);
    activeTabId = tabs[fallbackIndex]?.id || tabs[0]?.id;
  }

  return {
    tabs,
    activeTabId,
  };
}

function moveActiveTabHistory(current, delta) {
  const activeTab = findActiveTab(current);

  if (!activeTab) {
    return current;
  }

  const historyIndex = Number.isInteger(activeTab.historyIndex) ? activeTab.historyIndex : 0;
  const nextIndex = Math.min(Math.max(historyIndex + delta, 0), activeTab.history.length - 1);

  if (nextIndex === historyIndex) {
    return current;
  }

  const nextInput = activeTab.history[nextIndex] || DEFAULT_ROUTE_INPUT;
  const nextRoute = parseRouteInput(nextInput);
  const nextTab = Object.freeze({
    ...activeTab,
    route: withRefreshTick(nextRoute, activeTab.refreshTick || 0),
    historyIndex: nextIndex,
    updatedAt: new Date().toISOString(),
  });

  return replaceTab(current, nextTab);
}

function refreshActiveTab(current) {
  const activeTab = findActiveTab(current);

  if (!activeTab) {
    return current;
  }

  const refreshTick = (activeTab.refreshTick || 0) + 1;
  const input = activeTab.route?.normalizedInput || activeTab.route?.rawInput || DEFAULT_ROUTE_INPUT;
  const nextRoute = withRefreshTick(parseRouteInput(input), refreshTick);
  const nextTab = Object.freeze({
    ...activeTab,
    route: nextRoute,
    refreshTick,
    updatedAt: new Date().toISOString(),
  });

  return replaceTab(current, nextTab);
}

function focusTabByOffset(current, offset) {
  if (!current.tabs.length) {
    return current;
  }

  const activeIndex = Math.max(0, current.tabs.findIndex((tab) => tab.id === current.activeTabId));
  const nextIndex = (activeIndex + offset + current.tabs.length) % current.tabs.length;
  const nextTab = current.tabs[nextIndex];

  if (!nextTab || nextTab.id === current.activeTabId) {
    return current;
  }

  return {
    ...current,
    activeTabId: nextTab.id,
  };
}

function updateActiveTabFromLocation(current, route) {
  const activeTab = findActiveTab(current);

  if (!activeTab) {
    const tab = makeTab(route);
    return {
      tabs: [tab],
      activeTabId: tab.id,
    };
  }

  const normalized = route.normalizedInput || DEFAULT_ROUTE_INPUT;

  if ((activeTab.route?.normalizedInput || DEFAULT_ROUTE_INPUT) === normalized) {
    return current;
  }

  const knownIndex = activeTab.history.findIndex((entry) => entry === normalized);
  const nextHistoryIndex = knownIndex >= 0 ? knownIndex : activeTab.historyIndex;
  const nextHistory = knownIndex >= 0
    ? activeTab.history
    : replaceHistoryEntry(activeTab.history, activeTab.historyIndex, normalized);

  const nextTab = Object.freeze({
    ...activeTab,
    route: withRefreshTick(route, activeTab.refreshTick || 0),
    history: Object.freeze(nextHistory),
    historyIndex: nextHistoryIndex,
    updatedAt: new Date().toISOString(),
  });

  return replaceTab(current, nextTab);
}

function updateTabRoute(tab, route, { replace = false } = {}) {
  const refreshTick = tab.refreshTick || 0;
  const nextRoute = withRefreshTick(route, refreshTick);
  const normalized = nextRoute.normalizedInput || DEFAULT_ROUTE_INPUT;
  const historyIndex = Number.isInteger(tab.historyIndex) ? tab.historyIndex : 0;
  let nextHistory = Array.isArray(tab.history) ? [...tab.history] : [DEFAULT_ROUTE_INPUT];
  let nextHistoryIndex = historyIndex;

  if (replace) {
    nextHistory = replaceHistoryEntry(nextHistory, historyIndex, normalized);
  } else {
    const currentEntry = nextHistory[historyIndex];

    if (currentEntry === normalized) {
      nextHistory = replaceHistoryEntry(nextHistory, historyIndex, normalized);
    } else {
      nextHistory = [...nextHistory.slice(0, historyIndex + 1), normalized];
      nextHistoryIndex = nextHistory.length - 1;
    }
  }

  return Object.freeze({
    ...tab,
    route: nextRoute,
    history: Object.freeze(nextHistory),
    historyIndex: nextHistoryIndex,
    updatedAt: new Date().toISOString(),
  });
}

function replaceHistoryEntry(history, index, value) {
  const nextHistory = Array.isArray(history) && history.length ? [...history] : [DEFAULT_ROUTE_INPUT];
  const safeIndex = Math.min(Math.max(Number.isInteger(index) ? index : 0, 0), nextHistory.length - 1);

  nextHistory[safeIndex] = value || DEFAULT_ROUTE_INPUT;
  return nextHistory;
}

function replaceTab(current, nextTab) {
  return {
    ...current,
    tabs: current.tabs.map((tab) => (tab.id === nextTab.id ? nextTab : tab)),
    activeTabId: current.activeTabId || nextTab.id,
  };
}

function findActiveTab(current) {
  return current.tabs.find((tab) => tab.id === current.activeTabId) || current.tabs[0] || null;
}

function withRefreshTick(route, refreshTick) {
  return Object.freeze({
    ...(route || parseRouteInput(DEFAULT_ROUTE_INPUT)),
    refreshTick: Number.isFinite(refreshTick) ? refreshTick : 0,
  });
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