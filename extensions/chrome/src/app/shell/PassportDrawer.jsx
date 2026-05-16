/**
 * RO:WHAT — Compact Passport drawer for the CrabLink React shell.
 * RO:WHY — Keeps identity/wallet controls accessible without turning the passport dropdown into a debug dashboard.
 * RO:INTERACTS — appContext, identityClient, walletClient, PassportSummary, PassportActions, devPassportSessions, publicProfileCache, recentReceipts, localCatalog.
 * RO:INVARIANTS — no fake identity, balance, receipt, CID, catalogue, or permission truth; gateway-only reads; no direct wallet/ledger calls.
 * RO:METRICS — identity/wallet/bootstrap/profile calls inherit gateway x-correlation-id behavior.
 * RO:CONFIG — gatewayUrl, passportSubject, walletAccount, local storage backend, optional dev session URL params.
 * RO:SECURITY — no private keys, seed phrases, private alt mappings, or spend authority are requested/rendered.
 * RO:TEST — manual drawer open/close, bootstrap starter ROC, refresh identity, refresh balance, profile/library/receipts navigation.
 */

import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../appContext.js';
import PassportActions from './PassportActions.jsx';
import PassportSummary, { buildPassportView } from './PassportSummary.jsx';
import {
  DEFAULT_DEV_STARTER_GRANT_MINOR,
  listDevPassportSessions,
  openDevPassportSessionWindow,
  sessionLabel,
  sessionTargetFromNavigation,
} from '../../shared/utils/devPassportSessions.js';
import {
  readPublicProfileCache,
  subscribePublicProfileCache,
} from '../../shared/profile/publicProfileCache.js';
import {
  readRecentReceipts,
  subscribeRecentReceipts,
} from '../../shared/receipts/recentReceipts.js';
import {
  readLocalCatalog,
  subscribeLocalCatalog,
} from '../../shared/catalog/localCatalog.js';

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
  const [publicProfileCache, setPublicProfileCache] = useState(() => readPublicProfileCache());
  const [recentReceipts, setRecentReceipts] = useState(() => readRecentReceipts());
  const [localCatalog, setLocalCatalog] = useState(() => readLocalCatalog());

  useEffect(() => subscribePublicProfileCache(setPublicProfileCache), []);
  useEffect(() => subscribeRecentReceipts(setRecentReceipts), []);
  useEffect(() => subscribeLocalCatalog(setLocalCatalog), []);

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
        publicProfile: publicProfileCache?.profile || publicProfileCache,
      }),
    [context.settings, context.storage, identityState.data, walletState.data, publicProfileCache],
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
  const profileConfirmed = Boolean(publicProfileCache?.profile?.backendConfirmed);
  const catalogCount = countCatalogEntries(localCatalog);
  const receiptCount = Array.isArray(recentReceipts) ? recentReceipts.length : 0;

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
        title: 'Identity refresh failed',
        message: fallbackAwareMessage(error, context.storage),
        tone: 'warning',
      });

      return next;
    }
  }

  async function refreshWallet(account = activeWalletAccount) {
    if (typeof context.refreshWallet === 'function') {
      return context.refreshWallet(account);
    }

    const checking = {
      status: 'checking',
      checkedAt: new Date().toISOString(),
      account,
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

      const response = await client.getBalance(account);
      const data = unwrapGatewayData(response);
      const next = {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        account,
        data,
        response,
        error: null,
      };

      setLocalWalletState(next);
      context.notify?.({
        title: 'Wallet refreshed',
        message: `Balance refreshed for ${account}.`,
        tone: 'success',
      });

      return next;
    } catch (error) {
      const next = {
        status: 'error',
        checkedAt: new Date().toISOString(),
        account,
        data: null,
        response: null,
        error,
      };

      setLocalWalletState(next);
      context.notify?.({
        title: 'Wallet refresh failed',
        message: fallbackAwareMessage(error, context.storage),
        tone: 'warning',
      });

      return next;
    }
  }

  async function bootstrapStarterGrant() {
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
      passport_subject: activePassportSubject,
      wallet_account: activeWalletAccount,
      desired_starting_balance_minor_units: activeStarterGrantMinor,
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

  function navigateAndClose(route) {
    if (context?.navigate) {
      context.navigate(route);
      onClose?.();
      return;
    }

    if (navigation?.navigate) {
      navigation.navigate(route);
      onClose?.();
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

      {profileConfirmed && (
        <section className="cl-passport-truth" aria-label="Backend-confirmed public profile">
          <strong>Backend-confirmed public profile</strong>
          <p>
            {publicProfileCache.profile.handle} is loaded from the gateway profile claim/read response.
            This is cached display truth for the drawer; backend ownership still belongs to the profile service.
          </p>
        </section>
      )}

      {activeDevSession && (
        <section className="cl-passport-truth" aria-label="Active dev passport window session">
          <strong>Active dev window session</strong>
          <p>
            {sessionLabel(activeDevSession)}. These are per-window URL labels for testing
            creator/visitor flows. They do not create a passport, mint ROC, or grant spend authority.
          </p>
        </section>
      )}

      {canUseDevLabels && (
        <section className="cl-passport-truth" aria-label="Local dev label setup">
          <strong>Local dev setup available</strong>
          <p>
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

      <section className="cl-passport-truth" aria-label="Passport quick links">
        <header className="cl-drawer-panel-head">
          <div>
            <strong>Account pages</strong>
            <p>
              Receipts, catalog entries, and proof/debug panels live on pages now, not inside this dropdown.
            </p>
          </div>
        </header>

        <div className="cl-passport-actions">
          <button type="button" onClick={() => navigateAndClose(profileRouteFromView(view))}>
            Profile
          </button>
          <button type="button" onClick={() => navigateAndClose('crab://library')}>
            Library <span aria-label={`${catalogCount} catalog entries`}>({catalogCount})</span>
          </button>
          <button type="button" onClick={() => navigateAndClose('crab://receipts')}>
            Receipts <span aria-label={`${receiptCount} receipts`}>({receiptCount})</span>
          </button>
          <button type="button" onClick={() => navigateAndClose('crab://text')}>
            Text proof
          </button>
          <button type="button" onClick={() => navigateAndClose('crab://quickchain')}>
            QuickChain
          </button>
        </div>
      </section>

      <section className="cl-passport-truth" aria-label="Starter ROC bootstrap">
        <header className="cl-drawer-panel-head">
          <div>
            <strong>Starter ROC bootstrap</strong>
            <p>
              Explicit dev-only backend-routed starter balance action for the active passport/window.
            </p>
          </div>
        </header>

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
              ? 'Bootstrapping…'
              : `Bootstrap ${activeStarterGrantMinor} ROC`}
          </button>

          <button
            type="button"
            onClick={() => refreshWallet(activeWalletAccount)}
            disabled={!activeWalletAccount || walletState.status === 'checking'}
          >
            {walletState.status === 'checking' ? 'Refreshing wallet…' : 'Refresh balance'}
          </button>
        </div>

        {bootstrapState.status === 'error' && (
          <p className="cl-passport-inline-warning">
            {fallbackAwareMessage(bootstrapState.error, context.storage)}
          </p>
        )}
      </section>

      {devSessions.length > 0 && (
        <details className="cl-passport-truth" aria-label="Multi-passport dev testing">
          <summary>Dev windows</summary>
          <p>
            Open separate CrabLink windows with different local labels so Passport A can create content
            while Passport B visits it. URL-scoped labels do not fake backend truth.
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
        </details>
      )}

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
            This React preview is running outside the Chrome extension origin. Use dev labels only for
            local HTTP-preview headers; real parity belongs to extension-origin React.
          </p>
        </section>
      )}

      <section className="cl-passport-truth" aria-label="Passport truth boundary">
        <strong>Truth boundary</strong>
        <p>
          This drawer is a compact identity and wallet control surface. It does not create a passport,
          mint ROC, sign wallet actions, expose private alt mappings, validate receipts locally, or claim
          a backend public catalogue. Library and Receipts pages show display-only local memory.
        </p>
      </section>
    </section>
  );
}

function unwrapGatewayData(response) {
  if (!response) {
    return null;
  }

  if (response.data && typeof response.data === 'object') {
    return response.data;
  }

  if (response.body && typeof response.body === 'object') {
    return response.body;
  }

  return response;
}

function fallbackAwareMessage(error, storage) {
  const message = error?.message || String(error || 'Unknown error');

  if (storage?.isDevFallback) {
    return `${message} HTTP preview mode may not have extension storage or gateway host permissions.`;
  }

  return message;
}

function starterGrantMessage(data, account) {
  const grant = data?.starter_grant || data?.starterGrant || {};
  const issued = grant.issued;
  const amount = grant.amount_minor || grant.amountMinor || data?.amount_minor || data?.amountMinor || '';
  const receipt = grant.receipt_id || grant.receiptId || grant.txid || data?.txid || '';

  if (issued === false) {
    return `${account} already had starter ROC or backend declined a duplicate grant.`;
  }

  return [`${account} bootstrap complete`, amount ? `${amount} ROC minor` : '', receipt ? `receipt ${receipt}` : '']
    .filter(Boolean)
    .join(' · ');
}

function countCatalogEntries(catalog) {
  if (!catalog || typeof catalog !== 'object') {
    return 0;
  }

  const profiles = Array.isArray(catalog.profiles) ? catalog.profiles.length : 0;
  const sites = Array.isArray(catalog.sites) ? catalog.sites.length : 0;
  const assets = Array.isArray(catalog.assets) ? catalog.assets.length : 0;

  return profiles + sites + assets;
}

function profileRouteFromView(view) {
  const handle = String(view?.handle || view?.username || '').trim();

  if (handle.startsWith('@')) {
    return `crab://${handle}`;
  }

  if (handle) {
    return `crab://@${handle.replace(/^@/, '')}`;
  }

  return 'crab://profile';
}