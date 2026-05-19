/**
 * RO:WHAT — Main trusted CrabLink browser shell for route-owned pages.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; owns topbar, ad slot, modal/toast hosts, and page outlet.
 * RO:INTERACTS — TopBar, HeaderAdSlot, ModalHost, ToastHost, routed page components, appContext.
 * RO:INVARIANTS — pages own content; shell owns global browser frame; untrusted crab content stays sandboxed.
 * RO:METRICS — none directly; status actions route through GatewayClient correlation IDs.
 * RO:CONFIG — route/navigation props and appContext display state.
 * RO:SECURITY — no untrusted HTML rendering in shell; no wallet mutation.
 * RO:TEST — npm run build; visual full-tab route smoke.
 */

import HeaderAdSlot from './HeaderAdSlot.jsx';
import ModalHost from './ModalHost.jsx';
import ToastHost from './ToastHost.jsx';
import TopBar from './TopBar.jsx';
import './Shell.css';

export default function Shell({ children, route, navigation }) {
  const routeKind = route?.kind || 'home';

  return (
    <div className="cl-shell" data-route-kind={routeKind}>
      <TopBar route={route} navigation={navigation} />
      <HeaderAdSlot route={route} />
      <main className="cl-shell-main" data-route-kind={routeKind}>
        {children}
      </main>
      <ToastHost />
      <ModalHost />
    </div>
  );
}