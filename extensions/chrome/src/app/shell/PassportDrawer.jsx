/**
 * RO:WHAT — Passport drawer for the CrabLink React shell.
 * RO:WHY — Brings the old lane's passport-drawer UX shape into React without claiming backend truth prematurely.
 * RO:INTERACTS — appContext, identityClient, walletClient, PassportSummary, PassportActions, JsonPreview.
 * RO:INVARIANTS — no fake identity, balance, receipt, CID, or permission truth; gateway-only reads; no wallet mutation.
 * RO:METRICS — identity/wallet refresh calls inherit gateway x-correlation-id behavior.
 * RO:CONFIG — gatewayUrl, passportSubject, walletAccount, local storage backend.
 * RO:SECURITY — no private keys, seed phrases, private alt mappings, or spend authority are requested/rendered.
 * RO:TEST — manual drawer open/close, refresh identity, refresh balance, dev-label, HTTP fallback smoke.
 */

import { useMemo, useState } from 'react';
import { useAppContext } from '../appContext.js';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PassportActions from './PassportActions.jsx';
import PassportSummary, { buildPassportView } from './PassportSummary.jsx';

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

  const identityState = context.identityState || localIdentityState;
  const walletState = context.walletState || localWalletState;

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

  const canUseDevLabels = Boolean(
    context.settings?.devMode !== false &&
      (!context.settings?.passportSubject || !context.settings?.walletAccount),
  );

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
          data.
        </p>
      </section>

      {(identityState.data || identityState.error || walletState.data || walletState.error) && (
        <section className="cl-passport-dev">
          <JsonPreview
            label="Drawer refresh state"
            data={{
              identity: refreshStateForPreview(identityState),
              wallet: refreshStateForPreview(walletState),
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