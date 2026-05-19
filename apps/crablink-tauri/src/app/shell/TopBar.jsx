/**
 * RO:WHAT — Trusted top browser bar for CrabLink.
 * RO:WHY — App Integration; Concerns: DX/SEC; keeps navigation, address entry, zoom, theme, identity chips, and status controls consistent.
 * RO:INTERACTS — AddressBar, BrowserNav, PassportChip, BalanceChip, appContext, ThemeProvider, uiZoom.
 * RO:INVARIANTS — display only backend/local-label state honestly; no invented passport/balance truth; no mutation here.
 * RO:METRICS — gateway status button calls GatewayClient with x-correlation-id.
 * RO:CONFIG — settings from appContext; route/navigation props; local display zoom preference.
 * RO:SECURITY — dev token is never rendered; settings modal redacts secret-bearing fields; zoom stores no secrets.
 * RO:TEST — manual shell navigation, Command +/- zoom, settings zoom controls, theme, passport drawer, and gateway-status smoke.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../appContext.js';
import { useTheme } from '../../shared/theme/ThemeProvider.jsx';
import AddressBar from './AddressBar.jsx';
import BalanceChip from './BalanceChip.jsx';
import BrowserNav from './BrowserNav.jsx';
import PassportChip from './PassportChip.jsx';
import {
  clearDevNonceHints,
  clearLocalCatalogDisplayCache,
  clearLocalDevState,
  clearLocalProfileDisplayCache,
  clearLocalReceiptDisplayCache,
  clearRouteDisplayHints,
} from '../../shared/utils/localDataReset.js';
import {
  applyZoomScale,
  formatZoomPercent,
  readStoredZoomScale,
  resetStoredZoomScale,
  stepStoredZoomScale,
} from '../../shared/utils/uiZoom.js';

export default function TopBar({ route, navigation }) {
  const context = useAppContext();
  const theme = useTheme();
  const [zoomScale, setZoomScale] = useState(() => readStoredZoomScale());
  const gatewayState = context.gatewayStatus?.state || 'unknown';
  const gatewayLabel = context.gatewayStatus?.label || 'Gateway unchecked';

  useEffect(() => {
    const scale = readStoredZoomScale();
    applyZoomScale(scale);
    setZoomScale(scale);
  }, []);

  const announceZoom = useCallback(
    (scale) => {
      context.notify?.({
        title: 'Page zoom updated',
        message: `CrabLink display zoom is now ${formatZoomPercent(scale)}.`,
        tone: 'info',
        ttlMs: 1800,
      });
    },
    [context],
  );

  const zoomIn = useCallback(
    ({ announce = false } = {}) => {
      const scale = stepStoredZoomScale(1);
      setZoomScale(scale);

      if (announce) {
        announceZoom(scale);
      }

      return scale;
    },
    [announceZoom],
  );

  const zoomOut = useCallback(
    ({ announce = false } = {}) => {
      const scale = stepStoredZoomScale(-1);
      setZoomScale(scale);

      if (announce) {
        announceZoom(scale);
      }

      return scale;
    },
    [announceZoom],
  );

  const resetZoom = useCallback(
    ({ announce = false } = {}) => {
      const scale = resetStoredZoomScale();
      setZoomScale(scale);

      if (announce) {
        announceZoom(scale);
      }

      return scale;
    },
    [announceZoom],
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
      const code = String(event.code || '').toLowerCase();
      let handled = false;

      if (key === '+' || key === '=' || code === 'equal' || code === 'numpadadd') {
        zoomIn({ announce: true });
        handled = true;
      } else if (key === '-' || key === '_' || code === 'minus' || code === 'numpadsubtract') {
        zoomOut({ announce: true });
        handled = true;
      } else if (key === '0' || code === 'digit0' || code === 'numpad0') {
        resetZoom({ announce: true });
        handled = true;
      }

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [resetZoom, zoomIn, zoomOut]);

  function openSettings() {
    context.openModal({
      eyebrow: 'Local settings',
      title: 'CrabLink settings summary',
      content: (
        <SettingsSummary
          context={context}
          navigation={navigation}
          zoomScale={zoomScale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomReset={resetZoom}
        />
      ),
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

        <div className="cl-zoom-controls" aria-label="Page zoom controls">
          <button type="button" onClick={() => zoomOut({ announce: true })} title="Zoom out: Command -">
            −
          </button>
          <button type="button" onClick={() => resetZoom({ announce: true })} title="Reset zoom: Command 0">
            {formatZoomPercent(zoomScale)}
          </button>
          <button type="button" onClick={() => zoomIn({ announce: true })} title="Zoom in: Command +">
            +
          </button>
        </div>

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

function SettingsSummary({
  context,
  navigation,
  zoomScale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}) {
  const settings = context.settings || {};
  const storage = context.storage || {};
  const gatewayStatus = context.gatewayStatus || {};
  const [modalZoomScale, setModalZoomScale] = useState(() => zoomScale || readStoredZoomScale());
  const [localDataBusy, setLocalDataBusy] = useState('');
  const [localDataStatus, setLocalDataStatus] = useState('');

  function updateModalZoom(action) {
    const next = action?.({ announce: true }) || readStoredZoomScale();
    setModalZoomScale(next);
  }

  async function runLocalDataAction(id, title, action) {
    setLocalDataBusy(id);
    setLocalDataStatus('');

    try {
      const result = await action();
      const message = result?.message || `${title} complete.`;

      setLocalDataStatus(message);
      context.notify?.({
        title,
        message,
        tone: 'success',
        ttlMs: 3200,
      });

      return result;
    } catch (error) {
      const message = error?.message || `${title} failed.`;

      setLocalDataStatus(message);
      context.notify?.({
        title,
        message,
        tone: 'warning',
        ttlMs: 4200,
      });

      return null;
    } finally {
      setLocalDataBusy('');
    }
  }

  async function clearAllLocalDisplayData() {
    const result = await clearLocalDevState({
      updateSettings: context.updateSettings,
      navigation,
      resetZoom: () => {
        const next = onZoomReset?.({ announce: true }) || readStoredZoomScale();
        setModalZoomScale(next);
        return next;
      },
    });

    await context.reloadSettings?.();
    return result;
  }

  async function clearRouteHints() {
    const result = await clearRouteDisplayHints({
      updateSettings: context.updateSettings,
      navigation,
    });

    await context.reloadSettings?.();
    return result;
  }

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
    ['Page zoom', formatZoomPercent(modalZoomScale)],
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

      <div className="cl-settings-zoom-controls" aria-label="Settings page zoom controls">
        <strong>Page zoom</strong>
        <div>
          <button type="button" onClick={() => updateModalZoom(onZoomOut)}>
            Zoom out
          </button>
          <button type="button" onClick={() => updateModalZoom(onZoomReset)}>
            Reset {formatZoomPercent(modalZoomScale)}
          </button>
          <button type="button" onClick={() => updateModalZoom(onZoomIn)}>
            Zoom in
          </button>
        </div>
        <p>Keyboard shortcuts: Command +, Command -, and Command 0 on Mac. Control works on Windows/Linux.</p>
      </div>

      <div className="cl-settings-zoom-controls" aria-label="Local data controls">
        <strong>Local data</strong>
        <div>
          <button
            type="button"
            disabled={Boolean(localDataBusy)}
            onClick={() =>
              runLocalDataAction(
                'receipts',
                'Receipt display cache cleared',
                clearLocalReceiptDisplayCache,
              )
            }
          >
            {localDataBusy === 'receipts' ? 'Clearing…' : 'Clear receipts'}
          </button>
          <button
            type="button"
            disabled={Boolean(localDataBusy)}
            onClick={() =>
              runLocalDataAction(
                'catalog',
                'Local catalog display cache cleared',
                clearLocalCatalogDisplayCache,
              )
            }
          >
            {localDataBusy === 'catalog' ? 'Clearing…' : 'Clear catalog'}
          </button>
          <button
            type="button"
            disabled={Boolean(localDataBusy)}
            onClick={() =>
              runLocalDataAction(
                'profile',
                'Public profile display cache cleared',
                clearLocalProfileDisplayCache,
              )
            }
          >
            {localDataBusy === 'profile' ? 'Clearing…' : 'Clear profile cache'}
          </button>
          <button
            type="button"
            disabled={Boolean(localDataBusy)}
            onClick={() =>
              runLocalDataAction(
                'nonce',
                'Dev nonce hints cleared',
                clearDevNonceHints,
              )
            }
          >
            {localDataBusy === 'nonce' ? 'Clearing…' : 'Clear nonce hints'}
          </button>
          <button
            type="button"
            disabled={Boolean(localDataBusy)}
            onClick={() =>
              runLocalDataAction(
                'route',
                'Route display hints reset',
                clearRouteHints,
              )
            }
          >
            {localDataBusy === 'route' ? 'Resetting…' : 'Reset route hints'}
          </button>
          <button
            type="button"
            disabled={Boolean(localDataBusy)}
            onClick={() =>
              runLocalDataAction(
                'all',
                'Local display state cleared',
                clearAllLocalDisplayData,
              )
            }
          >
            {localDataBusy === 'all' ? 'Clearing…' : 'Clear local dev state'}
          </button>
        </div>
        <p>
          Clears display-only caches and hints used for testing. This cannot delete backend
          receipts, wallet truth, ledger truth, published b3 content, or gateway records.
        </p>
        {localDataStatus && <p role="status">{localDataStatus}</p>}
      </div>

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