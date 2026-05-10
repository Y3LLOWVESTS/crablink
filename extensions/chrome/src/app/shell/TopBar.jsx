/**
 * RO:WHAT — Trusted top browser bar for CrabLink.
 * RO:WHY — App Integration; Concerns: DX/SEC; keeps navigation, address entry, theme, identity chips, and status controls consistent.
 * RO:INTERACTS — AddressBar, BrowserNav, PassportChip, BalanceChip, appContext, ThemeProvider.
 * RO:INVARIANTS — display only backend/local-label state honestly; no invented passport/balance truth; no mutation here.
 * RO:METRICS — gateway status button calls GatewayClient with x-correlation-id.
 * RO:CONFIG — settings from appContext; route/navigation props.
 * RO:SECURITY — dev token is never rendered; settings modal redacts secret-bearing fields.
 * RO:TEST — manual shell navigation, theme, settings, passport drawer, and gateway-status smoke.
 */

import { useAppContext } from '../appContext.js';
import { useTheme } from '../../shared/theme/ThemeProvider.jsx';
import AddressBar from './AddressBar.jsx';
import BalanceChip from './BalanceChip.jsx';
import BrowserNav from './BrowserNav.jsx';
import PassportChip from './PassportChip.jsx';

export default function TopBar({ route, navigation }) {
  const context = useAppContext();
  const theme = useTheme();
  const gatewayState = context.gatewayStatus?.state || 'unknown';
  const gatewayLabel = context.gatewayStatus?.label || 'Gateway unchecked';

  function openSettings() {
    context.openModal({
      eyebrow: 'Local settings',
      title: 'CrabLink settings summary',
      content: <SettingsSummary context={context} />,
      actions: (
        <button className="cl-modal-action" type="button" onClick={context.closeModal}>
          Done
        </button>
      ),
    });
  }

  return (
    <header className="cl-topbar">
      <button
        className="cl-brand"
        type="button"
        onClick={navigation?.goHome}
        aria-label="Go to CrabLink home"
      >
        <span className="cl-brand-mark" aria-hidden="true">🦀</span>
        <span className="cl-brand-copy">
          <strong>CrabLink</strong>
          <small>browser</small>
        </span>
      </button>

      <BrowserNav
        onBack={navigation?.goBack}
        onForward={navigation?.goForward}
        onHome={navigation?.goHome}
        onRefresh={navigation?.refreshRoute}
      />

      <AddressBar
        value={route?.normalizedInput || route?.rawInput || 'crab://home'}
        onNavigate={navigation?.navigate}
      />

      <div className="cl-topbar-status" aria-label="CrabLink status controls">
        <button
          className={`cl-status-pill cl-status-${gatewayState}`}
          type="button"
          onClick={context.checkGateway}
          title={gatewayLabel}
        >
          <span aria-hidden="true" />
          {gatewayState === 'checking'
            ? 'Checking…'
            : gatewayState === 'online'
              ? 'Online'
              : gatewayState === 'degraded'
                ? 'Degraded'
                : 'Gateway'}
        </button>

        <PassportChip navigation={navigation} />
        <BalanceChip />

        <button
          className="cl-icon-button"
          type="button"
          onClick={theme.toggleTheme}
          title={`Theme: ${theme.resolvedTheme}`}
          aria-label="Toggle light and dark mode"
        >
          {theme.resolvedTheme === 'dark' ? '☀' : '☾'}
        </button>

        <button
          className="cl-icon-button"
          type="button"
          onClick={openSettings}
          title="Open local settings summary"
          aria-label="Open settings"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}

function SettingsSummary({ context }) {
  const settings = context.settings || {};
  const storage = context.storage || {};
  const gatewayStatus = context.gatewayStatus || {};

  const rows = [
    ['Gateway URL', settings.gatewayUrl || 'http://127.0.0.1:8090'],
    ['Request timeout', `${settings.requestTimeoutMs || 5000} ms`],
    ['Passport subject', settings.passportSubject || 'Not configured'],
    ['Handle', settings.handle || 'Not backend-confirmed'],
    ['Requested handle', settings.requestedHandle || 'None'],
    ['Username status', settings.usernameStatus || 'unknown'],
    ['Wallet account', settings.walletAccount || 'Not configured'],
    ['ROC display', settings.rocBalanceDisplay || settings.rocBalanceMinorUnits || 'Unavailable'],
    ['Ledger backed', settings.rocLedgerBacked === true ? 'Yes' : 'No / unavailable'],
    ['Storage backend', storage.backend || 'unknown'],
    ['Chrome local storage', storage.chromeLocal ? 'Available' : 'Unavailable'],
    ['Extension context', storage.isExtensionContext ? 'Yes' : 'No'],
    ['HTTP/Vite fallback', storage.isDevFallback ? 'Yes' : 'No'],
    ['Gateway status', gatewayStatus.label || 'Unchecked'],
    ['Dev token', settings.authToken ? 'Configured / redacted' : 'Not configured'],
  ];

  return (
    <section className="cl-settings-summary">
      <p className="cl-muted-copy">
        These are local UI settings and last-known display values. They are not ledger,
        passport, ownership, or backend publication truth.
      </p>

      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{String(value || '—')}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}