/**
 * RO:WHAT — Top-level CrabLink React app with route-owned lazy page mounting.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES/PERF; replaces patch-heavy DOM ownership with one mounted route owner and split route chunks.
 * RO:INTERACTS — ThemeProvider, AppContextProvider, Shell, appState, router, routeRegistry, pages/*.
 * RO:INVARIANTS — one active page owner; no fake backend truth; no silent ROC spend; gateway-only client boundary.
 * RO:METRICS — gateway checks carry correlation IDs through GatewayClient.
 * RO:CONFIG — route seed from page URL query/hash plus extension settings bridge.
 * RO:SECURITY — untrusted crab content must render in route-owned sandboxed surfaces, not the shell.
 * RO:TEST — npm run build; manual route smoke for every built-in crab:// route.
 */

import { Suspense } from 'react';
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
        <AppFrame />
      </AppContextProvider>
    </ThemeProvider>
  );
}

function AppFrame() {
  const routeState = useRouteState();
  const context = useAppContext();
  const Page = getRouteComponent(routeState.route.kind);

  const app = {
    route: routeState.route,
    navigate: routeState.navigate,
    goBack: routeState.goBack,
    goForward: routeState.goForward,
    goHome: routeState.goHome,
    refreshRoute: routeState.refreshRoute,
    settings: context.settings,
    storage: context.storage,
    gatewayStatus: context.gatewayStatus,
    clients: context.clients,
    notify: context.notify,
    openModal: context.openModal,
    closeModal: context.closeModal,
  };

  return (
    <Shell route={routeState.route} navigation={app}>
      <Suspense fallback={<RouteLoading route={routeState.route} />}>
        <Page route={routeState.route} app={app} />
      </Suspense>
    </Shell>
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