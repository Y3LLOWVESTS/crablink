/**
 * RO:WHAT — Passport drawer for the CrabLink React shell.
 * RO:WHY — Brings passport/session testing into React without claiming backend truth prematurely.
 * RO:INTERACTS — appContext, identityClient, walletClient, PassportSummary, PassportActions, devPassportSessions, JsonPreview.
 * RO:INVARIANTS — no fake identity, balance, receipt, CID, or permission truth; gateway-only reads; no direct wallet/ledger calls.
 * RO:METRICS — identity/wallet/bootstrap calls inherit gateway x-correlation-id behavior.
 * RO:CONFIG — gatewayUrl, passportSubject, walletAccount, local storage backend, optional dev session URL params.
 * RO:SECURITY — no private keys, seed phrases, private alt mappings, or spend authority are requested/rendered.
 * RO:TEST — manual drawer open/close, bootstrap starter ROC, refresh identity, refresh balance, multi-window Creator A/Visitor B smoke.
 */

import { useMemo, useState } from 'react';
import { useAppContext } from '../appContext.js';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PassportActions from './PassportActions.jsx';
import PassportSummary, { buildPassportView } from './PassportSummary.jsx';
import {
  DEFAULT_DEV_STARTER_GRANT_MINOR,
  listDevPassportSessions,
  openDevPassportSessionWindow,
  sessionLabel,
  sessionTargetFromNavigation,
} from '../../shared/utils/devPassportSessions.js';

const EMPTY_REFRESH_STATE = Object.freeze({
  status: 'idle',
  checkedAt: '',
  account: '',
  data: null,
  response: null,
  error: null,
});

const DEV_PASSPORT_SUBJECT = 'passport:main:dev';
const DEV_WALLET_ACCOUNT = 'acct_dev';

export default function PassportDrawer({ id, navigation, onClose }) {
  const context = useAppContext();
  const [localIdentityState, setLocalIdentityState] = useState(EMPTY_REFRESH_STATE);
  const [localWalletState, setLocalWalletState] = useState(EMPTY_REFRESH_STATE);
  const [openingSessionId, setOpeningSessionId] = useState('');
  const [bootstrapState, setBootstrapState] = useState(EMPTY_REFRESH_STATE);

  const identityState = context.identityState || localIdentityState;
  const walletState = context.walletState || localWalletState;
  const activeDevSession = context.storage?.devPassportSession || null;
  const devSessions = useMemo(() => listDevPassportSessions(), []);

  const view = useMemo(
    () =>
      buildPassportView({
        settings: context.settings,
        storage: context.storage,
        identity: identityState.data,
        wallet: walletState.data,
      }),
    [context.settings, context.storage, identityState.data, walletState.data],
  );

  const activePassportSubject = String(context.settings?.passportSubject || view?.passportSubject || '').trim();
  const activeWalletAccount = String(context.settings?.walletAccount || view?.walletAccount || '').trim();
  const activeStarterGrantMinor =
    String(activeDevSession?.starterGrantMinor || '').trim() || DEFAULT_DEV_STARTER_GRANT_MINOR;

  const canUseDevLabels = Boolean(
    context.settings?.devMode !== false &&
      (!context.settings?.passportSubject || !context.settings?.walletAccount),
  );
  const canBootstrapStarter = Boolean(activePassportSubject && activeWalletAccount);

  async function refreshIdentity() {
    if (typeof context.refreshIdentity === 'function') {
      return context.refreshIdentity();
    }

    const checking = {
      status: 'checking',
      checkedAt: new Date().toISOString(),
      account: '',
      data: localIdentityState.data,
      response: localIdentityState.response,
      error: null,
    };

    setLocalIdentityState(checking);

    try {
      const client = context.clients?.identity;

      if (!client?.getMe) {
        throw new Error('Identity client is not ready.');
      }

      const response = await client.getMe();
      const data = unwrapGatewayData(response);
      const next = {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        account: '',
        data,
        response,
        error: null,
      };

      setLocalIdentityState(next);
      context.notify?.({
        title: 'Identity refreshed',
        message: 'Gateway identity route responded.',
        tone: 'success',
      });

      return next;
    } catch (error) {
      const next = {
        status: 'error',
        checkedAt: new Date().toISOString(),
        account: '',
        data: null,
        response: null,
        error,
      };

      setLocalIdentityState(next);
      context.notify?.({
        title: 'Identity unavailable',
        message: fallbackAwareMessage(error, context.storage),
        tone: 'warning',
      });

      return next;
    }
  }

  async function refreshWallet(accountOverride = '') {
    const walletAccount = String(
      accountOverride ||
        context.settings?.walletAccount ||
        identityState.data?.wallet?.account ||
        identityState.data?.wallet?.wallet_account ||
        '',
    ).trim();

    if (typeof context.refreshWallet === 'function') {
      return context.refreshWallet(walletAccount);
    }

    if (!walletAccount) {
      const error = new Error('Wallet balance requires a configured wallet account label.');
      const next = {
        status: 'error',
        checkedAt: new Date().toISOString(),
        account: '',
        data: null,
        response: null,
        error,
      };

      setLocalWalletState(next);
      context.notify?.({
        title: 'Wallet account missing',
        message: 'Set a wallet account label before refreshing balance.',
        tone: 'warning',
      });

      return next;
    }

    const checking = {
      status: 'checking',
      checkedAt: new Date().toISOString(),
      account: walletAccount,
      data: localWalletState.data,
      response: localWalletState.response,
      error: null,
    };

    setLocalWalletState(checking);

    try {
      const client = context.clients?.wallet;

      if (!client?.getBalance) {
        throw new Error('Wallet client is not ready.');
      }

      const response = await client.getBalance(walletAccount);
      const data = unwrapGatewayData(response);
      const next = {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        account: walletAccount,
        data,
        response,
        error: null,
      };

      setLocalWalletState(next);
      context.notify?.({
        title: 'Wallet balance refreshed',
        message: 'Gateway wallet route responded.',
        tone: 'success',
      });

      return next;
    } catch (error) {
      const next = {
        status: 'error',
        checkedAt: new Date().toISOString(),
        account: walletAccount,
        data: null,
        response: null,
        error,
      };

      setLocalWalletState(next);
      context.notify?.({
        title: 'Wallet unavailable',
        message: fallbackAwareMessage(error, context.storage),
        tone: 'warning',
      });

      return next;
    }
  }

  async function bootstrapStarterGrant() {
    if (!canBootstrapStarter) {
      context.notify?.({
        title: 'Passport/wallet labels missing',
        message: 'Open Creator A or Visitor B first, or configure a passport and wallet account.',
        tone: 'warning',
      });
      return null;
    }

    const client = context.clients?.identity;

    if (!client?.bootstrapPassport) {
      context.notify?.({
        title: 'Bootstrap unavailable',
        message: 'Identity client is not ready.',
        tone: 'warning',
      });
      return null;
    }

    const payload = {
      kind: 'main',
      display_name: activeDevSession?.label
        ? `CrabLink ${activeDevSession.label}`
        : 'CrabLink dev passport',
      label: activeDevSession?.label || 'CrabLink dev passport',
      client: 'crablink-react',
      create_wallet: true,
      starter_grant: true,
      passport_subject: activePassportSubject,
      wallet_account: activeWalletAccount,
      desired_starting_balance_minor_units: activeStarterGrantMinor,
      requested_username: activeDevSession?.handle || context.settings?.handle || '',
    };

    const checking = {
      status: 'checking',
      checkedAt: new Date().toISOString(),
      account: activeWalletAccount,
      data: null,
      response: null,
      error: null,
    };

    setBootstrapState(checking);

    try {
      const response = await client.bootstrapPassport(payload, {
        confirmed: true,
      });
      const data = unwrapGatewayData(response);
      const next = {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        account: activeWalletAccount,
        data,
        response,
        error: null,
      };

      setBootstrapState(next);

      context.notify?.({
        title: 'Starter ROC bootstrap complete',
        message: starterGrantMessage(data, activeWalletAccount),
        tone: data?.starter_grant?.issued === false ? 'warning' : 'success',
      });

      await Promise.allSettled([
        refreshIdentity(),
        refreshWallet(activeWalletAccount),
      ]);

      return next;
    } catch (error) {
      const next = {
        status: 'error',
        checkedAt: new Date().toISOString(),
        account: activeWalletAccount,
        data: null,
        response: null,
        error,
      };

      setBootstrapState(next);
      context.notify?.({
        title: 'Starter ROC bootstrap failed',
        message: fallbackAwareMessage(error, context.storage),
        tone: 'warning',
      });

      return next;
    }
  }

  async function useDevLabels() {
    if (typeof context.updateSettings !== 'function') {
      context.notify?.({
        title: 'Settings unavailable',
        message: 'This React context cannot update local settings.',
        tone: 'warning',
      });
      return null;
    }

    const result = await context.updateSettings({
      passportSubject: DEV_PASSPORT_SUBJECT,
      walletAccount: DEV_WALLET_ACCOUNT,
    });

    context.notify?.({
      title: 'Dev labels set',
      message: 'Local labels set to passport:main:dev and acct_dev. Backend truth is still gateway-owned.',
      tone: 'success',
    });

    return result;
  }

  async function openSession(sessionId) {
    const target = sessionTargetFromNavigation(navigation);

    setOpeningSessionId(sessionId);

    try {
      await openDevPassportSessionWindow({
        sessionId,
        target,
        lane: 'react',
      });

      context.notify?.({
        title: 'Dev session window opened',
        message: `${sessionId} opened at ${target}. Labels are URL-scoped and do not fake backend truth.`,
        tone: 'success',
      });
    } catch (error) {
      context.notify?.({
        title: 'Could not open dev session',
        message: error?.message || String(error),
        tone: 'warning',
      });
    } finally {
      setOpeningSessionId('');
    }
  }

  return (
    <section
      id={id}
      className="cl-passport-drawer"
      role="dialog"
      aria-label="CrabLink passport drawer"
    >
      <header className="cl-passport-drawer-head">
        <div>
          <p className="cl-eyebrow">Passport</p>
          <h2>{view.displayName}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close passport drawer">
          ×
        </button>
      </header>

      {activeDevSession && (
        <section className="cl-passport-truth" aria-label="Active dev passport window session">
          <strong>Active dev window session</strong>
          <p>
            {sessionLabel(activeDevSession)}. These are per-window URL labels for testing
            creator/visitor flows. They do not create a passport, mint ROC, or grant spend authority.
          </p>
        </section>
      )}

      <section className="cl-passport-truth" aria-label="Starter ROC bootstrap">
        <strong>Starter ROC bootstrap</strong>
        <p>
          Use this explicit dev action to give the active passport/window a ledger-backed starter
          balance through <code>/identity/passport/bootstrap</code>. This calls the gateway/backend
          path and must return a backend receipt; it does not fake a local balance.
        </p>

        <div className="cl-passport-actions">
          <button
            type="button"
            onClick={bootstrapStarterGrant}
            disabled={!canBootstrapStarter || bootstrapState.status === 'checking'}
            title={
              canBootstrapStarter
                ? `${activePassportSubject} / ${activeWalletAccount}`
                : 'Open Creator A or Visitor B first'
            }
          >
            {bootstrapState.status === 'checking'
              ? 'Bootstrapping starter ROC…'
              : `Bootstrap ${activeStarterGrantMinor} ROC for this window`}
          </button>

          <button
            type="button"
            onClick={() => refreshWallet(activeWalletAccount)}
            disabled={!activeWalletAccount || walletState.status === 'checking'}
          >
            {walletState.status === 'checking' ? 'Refreshing wallet…' : 'Refresh active wallet'}
          </button>
        </div>

        <JsonPreview
          label="Starter bootstrap state"
          data={{
            active_session: activeDevSession,
            request_target: {
              passport_subject: activePassportSubject,
              wallet_account: activeWalletAccount,
              desired_starting_balance_minor_units: activeStarterGrantMinor,
            },
            state: refreshStateForPreview(bootstrapState),
            truth_boundary:
              'Starter ROC must be issued by backend/svc-wallet and then verified through wallet balance.',
          }}
        />
      </section>

      <section className="cl-passport-truth" aria-label="Multi-passport dev testing">
        <strong>Multi-passport dev windows</strong>
        <p>
          Open separate CrabLink windows with different local labels so Passport A can create content
          while Passport B visits it. This is a testing bridge until real local passport vaults and
          backend-confirmed alt/passport sessions are implemented.
        </p>

        <div className="cl-passport-actions">
          {devSessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => openSession(session.id)}
              disabled={openingSessionId === session.id}
              title={`${session.passportSubject} / ${session.walletAccount}`}
            >
              {openingSessionId === session.id ? `Opening ${session.label}…` : `Open ${session.label}`}
            </button>
          ))}
        </div>

        <JsonPreview
          label="Dev passport sessions"
          data={{
            active: activeDevSession,
            available: devSessions,
            target: sessionTargetFromNavigation(navigation),
            truth_boundary:
              'URL-scoped local labels only; backend wallet/identity responses remain source of truth.',
          }}
        />
      </section>

      {canUseDevLabels && (
        <section className="cl-passport-truth" aria-label="Local dev label setup">
          <strong>Local dev setup available</strong>
          <p>
            Gateway is reachable, but this React session has no local passport or wallet labels yet.
            Set safe local dev labels to enable wallet balance refresh testing. This does not create a
            passport, mint ROC, or fake backend truth.
          </p>
          <button type="button" onClick={useDevLabels}>
            Use dev labels
          </button>
        </section>
      )}

      <PassportSummary
        view={view}
        identityState={identityState}
        walletState={walletState}
      />

      <PassportActions
        view={view}
        navigation={navigation}
        onClose={onClose}
        onRefreshIdentity={refreshIdentity}
        onRefreshWallet={() => refreshWallet()}
        onUseDevLabels={useDevLabels}
        refreshingIdentity={identityState.status === 'checking'}
        refreshingWallet={walletState.status === 'checking'}
        canUseDevLabels={canUseDevLabels}
      />

      {context.storage?.isDevFallback && (
        <section className="cl-passport-truth" aria-label="HTTP preview boundary">
          <strong>HTTP test mode</strong>
          <p>
            This React preview is running outside the Chrome extension origin. It may not read the
            loaded extension&apos;s chrome.storage.local values, and gateway fetches can be blocked
            by browser/CORS/origin rules. Use dev labels only for local HTTP-preview headers; real
            live parity still belongs to extension-origin React.
          </p>
        </section>
      )}

      <section className="cl-passport-truth" aria-label="Passport truth boundary">
        <strong>Truth boundary</strong>
        <p>
          This drawer reads local settings and optional gateway responses. It does not create a
          passport, mint ROC, sign wallet actions, expose private alt mappings, or publish profile
          data. Starter bootstrap is explicit and backend-routed through the public gateway.
        </p>
      </section>

      {(identityState.data || identityState.error || walletState.data || walletState.error || bootstrapState.data || bootstrapState.error) && (
        <section className="cl-passport-dev">
          <JsonPreview
            label="Drawer refresh state"
            data={{
              identity: refreshStateForPreview(identityState),
              wallet: refreshStateForPreview(walletState),
              bootstrap: refreshStateForPreview(bootstrapState),
            }}
          />
        </section>
      )}
    </section>
  );
}

function unwrapGatewayData(response) {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }

  return response || null;
}

function starterGrantMessage(data, walletAccount) {
  const grant = data?.starter_grant || data?.starterGrant || {};
  const issued = grant.issued === true;
  const amount = String(grant.amount_minor_units || grant.amountMinorUnits || grant.amount_minor || '').trim();
  const receipt = String(grant.receipt_id || grant.receiptId || grant.txid || '').trim();

  if (issued) {
    return receipt
      ? `Issued ${amount || 'starter'} ROC to ${walletAccount}; receipt ${receipt}.`
      : `Issued ${amount || 'starter'} ROC to ${walletAccount}.`;
  }

  return grant.reason
    ? `Starter grant response returned without a new issue: ${grant.reason}. Refresh wallet to verify balance.`
    : 'Starter grant response returned. Refresh wallet to verify ledger-backed balance.';
}

function refreshStateForPreview(state) {
  return {
    status: state.status,
    checked_at: state.checkedAt || null,
    account: state.account || null,
    data: state.data || null,
    response: state.response
      ? {
          ok: state.response.ok === true,
          status: state.response.status || 0,
          route: state.response.route || '',
          correlation_id: state.response.correlationId || '',
        }
      : null,
    error: state.error
      ? {
          name: state.error.name || 'Error',
          message: state.error.message || String(state.error),
          status: state.error.status || 0,
          reason: state.error.reason || '',
          correlation_id: state.error.correlationId || '',
        }
      : null,
  };
}

function fallbackAwareMessage(error, storage) {
  const message = error?.message || 'Gateway request failed.';

  if (storage?.isDevFallback) {
    return `${message} HTTP preview mode may still be blocked by browser/CORS/origin limits.`;
  }

  return message;
}