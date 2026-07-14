/**
 * RO:WHAT — Top-level CrabLink React app with tab-preserving route-owned page mounting.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES/PERF; lets Tauri keep multiple CrabLink routes alive without giving UI backend authority.
 * RO:INTERACTS — ThemeProvider, AppContextProvider, Shell, appState, router, routeRegistry, pages/*.
 * RO:INVARIANTS — one active visible and interactive page; inactive tabs stay mounted but inert; no fake backend truth; no silent ROC spend.
 * RO:METRICS — gateway checks carry correlation IDs through GatewayClient.
 * RO:CONFIG — route seed from page URL query/hash plus extension settings bridge.
 * RO:SECURITY — untrusted crab content must render in route-owned sandboxed surfaces, not the shell.
 * RO:TEST — npm run build; manual tab smoke for route switching, stream preview preservation, and paid gate confirmation.
 */

import { Component, Suspense } from 'react';
import { AppContextProvider, useAppContext } from './appContext.js';
import { useRouteState } from './appState.js';
import { getRouteComponent } from './router.js';
import Shell from './shell/Shell.jsx';
import LoadingState from '../shared/components/LoadingState.jsx';
import ThemeProvider from '../shared/theme/ThemeProvider.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <AppContextProvider>
        <CrabLinkErrorBoundary>
          <AppFrame />
        </CrabLinkErrorBoundary>
      </AppContextProvider>
    </ThemeProvider>
  );
}

class CrabLinkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    try {
      console.error('CrabLink React render failure', error, info);
    } catch (_ignored) {
      // Console may be unavailable in constrained WebView contexts.
    }
  }

  render() {
    if (this.state.error) {
      const message = this.state.error?.message || String(this.state.error);

      return (
        <section className="cl-page" role="alert" style={{ padding: '1rem' }}>
          <div className="cl-card" style={{ padding: '1rem' }}>
            <p className="cl-eyebrow">CrabLink UI guard</p>
            <h1>React route crashed instead of rendering.</h1>
            <p>
              The backend may still be healthy. This guard prevents a silent blank screen while we debug the
              Tauri shell.
            </p>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message}</pre>
            <button type="button" onClick={() => this.setState({ error: null })}>
              Try rendering again
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

function AppFrame() {
  const routeState = useRouteState();
  const context = useAppContext();

  const navigation = {
    route: routeState.route,
    tabs: routeState.tabs,
    activeTabId: routeState.activeTabId,
    activeTab: routeState.activeTab,
    maxTabs: routeState.maxTabs,
    canOpenNewTab: routeState.canOpenNewTab,
    canCloseTab: routeState.canCloseTab,
    canGoBack: routeState.canGoBack,
    canGoForward: routeState.canGoForward,
    navigate: routeState.navigate,
    goBack: routeState.goBack,
    goForward: routeState.goForward,
    goHome: routeState.goHome,
    refreshRoute: routeState.refreshRoute,
    openNewTab: routeState.openNewTab,
    closeTab: routeState.closeTab,
    activateTab: routeState.activateTab,
    focusNextTab: routeState.focusNextTab,
    focusPreviousTab: routeState.focusPreviousTab,
    focusTabByIndex: routeState.focusTabByIndex,
    settings: context.settings,
    storage: context.storage,
    gatewayStatus: context.gatewayStatus,
    identityState: context.identityState,
    walletState: context.walletState,
    clients: context.clients,
    checkGateway: context.checkGateway,
    refreshIdentity: context.refreshIdentity,
    refreshWallet: context.refreshWallet,
    notify: context.notify,
    openModal: context.openModal,
    closeModal: context.closeModal,
  };

  return (
    <Shell
      route={routeState.route}
      navigation={navigation}
      tabs={routeState.tabs}
      activeTabId={routeState.activeTabId}
    >
      <div className="cl-tab-page-stack" aria-label="CrabLink tab pages">
        {routeState.tabs.map((tab) => (
          <RoutePane
            key={tab.id}
            tab={tab}
            active={tab.id === routeState.activeTabId}
            app={navigation}
          />
        ))}
      </div>
    </Shell>
  );
}

function RoutePane({ tab, active, app }) {
  const route = tab?.route || app?.route;
  const Page = getRouteComponent(route?.kind);
  const routeKey = [
    tab?.id || 'active',
    route?.kind || 'home',
    route?.normalizedInput || route?.rawInput || 'crab://home',
    route?.refreshTick || 0,
  ].join(':');

  const tabApp = {
    ...app,
    route,
    activeTabId: tab?.id || app?.activeTabId,
    activeTab: tab || app?.activeTab,
    isActiveTab: Boolean(active),
  };

  return (
    <section
      className="cl-tab-page"
      data-active={active ? 'true' : 'false'}
      data-route-kind={route?.kind || 'home'}
      aria-hidden={active ? 'false' : 'true'}
      inert={active ? undefined : ''}
    >
      <Suspense fallback={<RouteLoading route={route} />}>
        <Page key={routeKey} route={route} app={tabApp} />
      </Suspense>
    </section>
  );
}

function RouteLoading({ route }) {
  const routeLabel = route?.normalizedInput || route?.rawInput || 'crab://home';

  return (
    <section className="cl-page" aria-busy="true">
      <LoadingState
        title="Loading CrabLink route"
        copy={`Preparing ${routeLabel}`}
      />
    </section>
  );
}