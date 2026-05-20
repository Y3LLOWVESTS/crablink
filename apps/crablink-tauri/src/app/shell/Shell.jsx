/**
 * RO:WHAT — Main trusted CrabLink browser shell for route-owned pages and tab chrome.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; owns topbar, tab strip, ad slot, modal/toast hosts, and page outlet.
 * RO:INTERACTS — TopBar, BrowserTabs, HeaderAdSlot, ModalHost, ToastHost, routed page components, appContext.
 * RO:INVARIANTS — pages own content; shell owns global browser frame; tabs are UI state only; untrusted crab content stays sandboxed.
 * RO:METRICS — none directly; status actions route through GatewayClient correlation IDs.
 * RO:CONFIG — route/navigation/tab props and appContext display state.
 * RO:SECURITY — no untrusted HTML rendering in shell; no wallet mutation; tab switching cannot unlock paid content.
 * RO:TEST — npm run build; visual full-tab route and tab smoke.
 */

import BrowserTabs from './BrowserTabs.jsx';
import HeaderAdSlot from './HeaderAdSlot.jsx';
import ModalHost from './ModalHost.jsx';
import ToastHost from './ToastHost.jsx';
import TopBar from './TopBar.jsx';
import './Shell.css';

export default function Shell({ children, route, navigation, tabs = [], activeTabId = '' }) {
  const routeKind = route?.kind || 'home';

  return (
    <div className="cl-shell" data-route-kind={routeKind}>
      <TopBar route={route} navigation={navigation} />
      <BrowserTabs
        tabs={tabs}
        activeTabId={activeTabId}
        navigation={navigation}
      />
      <HeaderAdSlot route={route} />
      <main className="cl-shell-main" data-route-kind={routeKind}>
        {children}
      </main>
      <ToastHost />
      <ModalHost />
    </div>
  );
}