/**
 * RO:WHAT — Modern bounded tab strip for the CrabLink Tauri browser shell.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps creator/viewer routes mounted while limiting local UI state.
 * RO:INTERACTS — Shell.jsx, appState.js, router.js, appContext toasts, shared theme CSS variables.
 * RO:INVARIANTS — max 10 tabs; tabs are display/navigation state only; no backend truth, receipt, balance, or paid unlock.
 * RO:METRICS — none.
 * RO:CONFIG — maxTabs provided by appState; light/dark theme via CSS variables.
 * RO:SECURITY — no untrusted HTML; tab labels render as React text; shortcuts cannot spend or execute.
 * RO:TEST — npm run build; manual open/close/switch/shortcut tab smoke.
 */

import { useCallback, useEffect } from 'react';
import { useAppContext } from '../appContext.js';
import { routeKindLabel } from '../routeRegistry.js';

export default function BrowserTabs({ tabs = [], activeTabId = '', navigation }) {
  const context = useAppContext();
  const maxTabs = navigation?.maxTabs || 10;
  const canCloseTab = tabs.length > 1;
  const canOpenNewTab = navigation?.canOpenNewTab !== false && tabs.length < maxTabs;
  const densityClass = tabs.length >= 9
    ? 'cl-tabstrip-ultra'
    : tabs.length >= 6
      ? 'cl-tabstrip-dense'
      : 'cl-tabstrip-roomy';

  const notifyMaxTabs = useCallback(() => {
    context.notify?.({
      title: 'Tab limit reached',
      message: `Maximum ${maxTabs} tabs open. Close a tab before opening another.`,
      tone: 'warning',
      ttlMs: 3600,
    });
  }, [context, maxTabs]);

  const openNewTab = useCallback(() => {
    const result = navigation?.openNewTab?.('crab://home');

    if (result?.ok === false && result.reason === 'max_tabs') {
      notifyMaxTabs();
    }

    return result;
  }, [navigation, notifyMaxTabs]);

  const closeTab = useCallback(
    (event, tabId) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();

      if (!canCloseTab) {
        context.notify?.({
          title: 'Last tab stays open',
          message: 'CrabLink keeps one safe home tab mounted instead of closing the browser frame.',
          tone: 'info',
          ttlMs: 2200,
        });
        return false;
      }

      return navigation?.closeTab?.(tabId);
    },
    [canCloseTab, context, navigation],
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!event || event.defaultPrevented || event.altKey) {
        return;
      }

      if (!event.metaKey && !event.ctrlKey) {
        return;
      }

      const key = String(event.key || '').toLowerCase();

      if (key === 't') {
        event.preventDefault();
        event.stopPropagation();
        openNewTab();
        return;
      }

      if (key === 'w') {
        if (canCloseTab && activeTabId) {
          event.preventDefault();
          event.stopPropagation();
          navigation?.closeTab?.(activeTabId);
        }

        return;
      }

      if (key === 'tab') {
        event.preventDefault();
        event.stopPropagation();

        if (event.shiftKey) {
          navigation?.focusPreviousTab?.();
        } else {
          navigation?.focusNextTab?.();
        }

        return;
      }

      if (/^[1-9]$/.test(key)) {
        const index = Number(key) - 1;

        if (tabs[index]) {
          event.preventDefault();
          event.stopPropagation();
          navigation?.focusTabByIndex?.(index);
        }
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [
    activeTabId,
    canCloseTab,
    navigation,
    openNewTab,
    tabs,
  ]);

  return (
    <section className="cl-tabstrip-shell" aria-label="CrabLink browser tabs">
      <div
        className={`cl-tabstrip ${densityClass}`}
        role="tablist"
        aria-label="Open CrabLink routes"
        data-tab-count={tabs.length}
      >
        {tabs.map((tab, index) => {
          const active = tab.id === activeTabId;
          const title = titleForTab(tab);
          const subtitle = subtitleForTab(tab);
          const fullRoute = tab.route?.normalizedInput || tab.route?.rawInput || 'crab://home';

          return (
            <div
              key={tab.id}
              className={`cl-tab ${active ? 'cl-tab-active' : ''}`}
              role="tab"
              aria-selected={active ? 'true' : 'false'}
              aria-label={`Tab ${index + 1}: ${title}`}
              title={fullRoute}
            >
              <button
                className="cl-tab-main"
                type="button"
                onClick={() => navigation?.activateTab?.(tab.id)}
              >
                <span className="cl-tab-orb" aria-hidden="true" data-kind={tab.route?.kind || 'home'}>
                  {iconForRoute(tab.route)}
                </span>
                <span className="cl-tab-copy">
                  <strong>{title}</strong>
                  <small>{subtitle}</small>
                </span>
              </button>

              <button
                className="cl-tab-close"
                type="button"
                disabled={!canCloseTab}
                aria-label={`Close ${title}`}
                title={canCloseTab ? 'Close tab' : 'At least one tab must stay open'}
                onClick={(event) => closeTab(event, tab.id)}
              >
                ×
              </button>
            </div>
          );
        })}

        <button
          className="cl-tab-new"
          type="button"
          onClick={canOpenNewTab ? openNewTab : notifyMaxTabs}
          aria-label="Open new CrabLink tab"
          title={canOpenNewTab ? 'New tab: Command T' : `Maximum ${maxTabs} tabs open`}
        >
          +
        </button>
      </div>

      <div className="cl-tabstrip-meta" aria-label="Tab status">
        <span>{tabs.length}/{maxTabs}</span>
      </div>
    </section>
  );
}

function titleForTab(tab) {
  const route = tab?.route || {};
  const kind = route.kind || 'home';

  if (kind === 'home') {
    return 'Home';
  }

  if (kind === 'asset') {
    const assetKind = route.params?.assetKind || 'asset';
    const hash = route.params?.hash || '';
    const shortHash = hash ? hash.slice(0, 8) : '';

    return shortHash
      ? `${routeKindLabel(assetKind)} ${shortHash}`
      : `${routeKindLabel(assetKind)} Asset`;
  }

  if (kind === 'site' && route.params?.siteName) {
    return route.params.siteName;
  }

  if (kind === 'profile' && route.params?.handle) {
    return route.params.handle;
  }

  return route.title || routeKindLabel(kind);
}

function subtitleForTab(tab) {
  const route = tab?.route || {};
  const input = route.normalizedInput || route.rawInput || 'crab://home';

  if (input.length <= 34) {
    return input;
  }

  return `${input.slice(0, 19)}…${input.slice(-12)}`;
}

function iconForRoute(route) {
  const kind = route?.kind || 'home';
  const assetKind = route?.params?.assetKind;

  const icons = {
    home: '⌂',
    library: '▦',
    receipts: '◇',
    profile: '@',
    site: '⌁',
    image: '◈',
    music: '♪',
    lyrics: '♬',
    article: '¶',
    post: '✦',
    comment: '💬',
    video: '▶',
    stream: '●',
    podcast: '◌',
    ad: 'AD',
    algo: 'ƒ',
    code: '</>',
    game: '◆',
    asset: assetKind ? routeKindLabel(assetKind).slice(0, 1) : 'b3',
    notFound: '!',
    problem: '!',
  };

  return icons[kind] || routeKindLabel(kind).slice(0, 2);
}