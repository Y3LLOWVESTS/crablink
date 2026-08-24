/**
 * RO:WHAT — Compact Passport drawer for the CrabLink React shell.
 * RO:WHY — Keeps identity/wallet controls accessible without turning the passport dropdown into a debug dashboard.
 * RO:INTERACTS — appContext, identityClient, walletClient, PassportSummary, PassportActions, devPassportSessions, publicProfileCache, recentReceipts, localCatalog.
 * RO:INVARIANTS — no fake identity, balance, receipt, CID, catalogue, or permission truth; gateway-only reads; no direct wallet/ledger calls.
 * RO:METRICS — identity/wallet/bootstrap/profile calls inherit gateway x-correlation-id behavior.
 * RO:CONFIG — gatewayUrl, passportSubject, walletAccount, local storage backend, optional dev session URL/hash params.
 * RO:SECURITY — no private keys, seed phrases, private alt mappings, or spend authority are requested/rendered.
 * RO:TEST — manual drawer open/close, bootstrap starter ROC, refresh identity, refresh balance, profile/library/receipts navigation, stream-safe dev session switch.
 */

import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../appContext.js';
import DeveloperDisclosure from '../../shared/components/DeveloperDisclosure.jsx';
import PassportActions from './PassportActions.jsx';
import PassportSummary, { buildPassportView } from './PassportSummary.jsx';
import {
  getDevPassportSession,
  sessionLabel,
} from '../../shared/utils/devPassportSessions.js';
import {
  explicitPassportDrawerStarterGrantMinor,
  isExplicitPassportDrawerDevSurface,
  listExplicitPassportDrawerDevSessions,
} from './passportDrawerDevGate.js';
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
import {
  authorizeNativePassportDevice,
  clearNativePassport,
  confirmNativePassportRoot,
  createNativePassport,
  lockNativePassport,
  readNativePassportStatus,
  unlockNativePassportOperational,
  verifyNativePassportDevicePossession,
} from '../../adapters/passportAdapter.js';
import {
  resetDisposableOnboardingDevelopmentState,
} from '../../onboarding/onboardingDevelopmentReset.js';

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
const NATIVE_PASSPORT_PHASE15AD_LABEL =
  'NATIVE_PASSPORT_PHASE15AD_DRAWER_NATIVE_STATUS_ACCEPTANCE';
const NATIVE_PASSPORT_PHASE15AF_LABEL =
  'NATIVE_PASSPORT_PHASE15AF_DESKTOP_PASSPORT_NATIVE_MANUAL_ACCEPTANCE';
const FINAL_BETA_PHASE4A3_PASSPORT_DRAWER_CONSUMER_MODE =
  'FINAL_BETA_PHASE4A3_PASSPORT_DRAWER_CONSUMER_MODE_V1';


export default function PassportDrawer({ id, navigation, onClose }) {
  const context = useAppContext();
  const [localIdentityState, setLocalIdentityState] = useState(EMPTY_REFRESH_STATE);
  const [localWalletState, setLocalWalletState] = useState(EMPTY_REFRESH_STATE);
  const [openingSessionId, setOpeningSessionId] = useState('');
  const [bootstrapState, setBootstrapState] = useState(EMPTY_REFRESH_STATE);
  const [publicProfileCache, setPublicProfileCache] = useState(() => readPublicProfileCache());
  const [recentReceipts, setRecentReceipts] = useState(() => readRecentReceipts());
  const [localCatalog, setLocalCatalog] = useState(() => readLocalCatalog());
  const [nativePassportState, setNativePassportState] = useState(EMPTY_REFRESH_STATE);
  const [nativePassportCommand, setNativePassportCommand] = useState('');
  const [onboardingResetArmed, setOnboardingResetArmed] = useState(false);
  const [onboardingResetBusy, setOnboardingResetBusy] = useState(false);

  const nativePassportAvailable = isTauriRuntime();
  const onboardingDevelopmentResetAvailable =
    Boolean(
      import.meta.env.DEV &&
        nativePassportAvailable,
    );

  useEffect(() => subscribePublicProfileCache(setPublicProfileCache), []);
  useEffect(() => subscribeRecentReceipts(setRecentReceipts), []);
  useEffect(() => subscribeLocalCatalog(setLocalCatalog), []);

  useEffect(() => {
    if (!nativePassportAvailable) {
      return;
    }

    refreshNativePassportStatus({ silent: true });
  }, [nativePassportAvailable]);

  const identityState = context.identityState || localIdentityState;
  const walletState = context.walletState || localWalletState;
  const drawerDevSurfaceEnabled =
    isExplicitPassportDrawerDevSurface({
      buildDev: import.meta.env.DEV,
      settings: context.settings,
    });
  const activeDevSession = drawerDevSurfaceEnabled
    ? context.storage?.devPassportSession || null
    : null;
  const devSessions = useMemo(
    () =>
      listExplicitPassportDrawerDevSessions({
        enabled: drawerDevSurfaceEnabled,
      }),
    [drawerDevSurfaceEnabled],
  );

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
    explicitPassportDrawerStarterGrantMinor({
      enabled: drawerDevSurfaceEnabled,
      activeSession: activeDevSession,
    });

  const canUseDevLabels = Boolean(
    drawerDevSurfaceEnabled &&
      (!context.settings?.passportSubject || !context.settings?.walletAccount),
  );
  const canBootstrapStarter = Boolean(
    drawerDevSurfaceEnabled &&
      activeDevSession &&
      activePassportSubject &&
      activeWalletAccount,
  );
  const profileConfirmed = Boolean(publicProfileCache?.profile?.backendConfirmed);
  const catalogCount = countCatalogEntries(localCatalog);
  const receiptCount = Array.isArray(recentReceipts) ? recentReceipts.length : 0;
  const nativePassportBusy =
    nativePassportState.status === 'checking' || Boolean(nativePassportCommand);
  const nativePassportStatusLabel = nativePassportAvailable
    ? nativePassportState.data?.state || nativePassportState.status || 'not_checked'
    : 'unavailable_outside_tauri';
  const nativePassportCommandLabel =
    nativePassportState.response?.state || nativePassportState.command || 'none';
  const nativePassportStatusRows = nativePassportStatusRowsFromDto(
    nativePassportState.data,
  );
  const nativePassportCommandRows = nativePassportCommandRowsFromDto(
    nativePassportState.response,
  );
  const nativePassportManualAcceptanceRows =
    nativePassportManualAcceptanceRowsFromState(
      nativePassportAvailable,
      nativePassportState.data,
      nativePassportState.response,
    );

  async function refreshNativePassportStatus({ silent = false } = {}) {
    if (!nativePassportAvailable) {
      const next = {
        ...EMPTY_REFRESH_STATE,
        status: 'error',
        checkedAt: new Date().toISOString(),
        error: new Error('Native Passport commands are available only inside Tauri.'),
      };

      setNativePassportState(next);
      return next;
    }

    const checking = {
      status: 'checking',
      checkedAt: new Date().toISOString(),
      account: '',
      data: nativePassportState.data,
      response: nativePassportState.response,
      error: null,
    };

    setNativePassportState(checking);

    try {
      const status = await readNativePassportStatus();
      const next = {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        account: '',
        data: status,
        response: null,
        error: null,
      };

      setNativePassportState(next);

      if (!silent) {
        context.notify?.({
          title: 'Native Passport status refreshed',
          message: `Native Passport is ${status.state}.`,
          tone: 'success',
        });
      }

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

      setNativePassportState(next);

      if (!silent) {
        context.notify?.({
          title: 'Native Passport status unavailable',
          message: error?.message || String(error),
          tone: 'warning',
        });
      }

      return next;
    }
  }

  async function runNativePassportCommand(command, label) {
    if (!nativePassportAvailable || nativePassportBusy) {
      return null;
    }

    setNativePassportCommand(label);
    setNativePassportState({
      status: 'checking',
      checkedAt: new Date().toISOString(),
      account: '',
      data: nativePassportState.data,
      response: nativePassportState.response,
      error: null,
    });

    try {
      const commandResult = await command();
      const status = await readNativePassportStatus();
      const next = {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        account: '',
        data: status,
        response: commandResult,
        command: label,
        error: null,
      };

      setNativePassportState(next);
      context.notify?.({
        title: `Native Passport ${label}`,
        message: `${commandResult.commandName || 'passport command'} returned ${commandResult.state}.`,
        tone: commandResult.state === 'unavailable' ? 'warning' : 'success',
      });

      return next;
    } catch (error) {
      const next = {
        status: 'error',
        checkedAt: new Date().toISOString(),
        account: '',
        data: nativePassportState.data,
        response: null,
        command: label,
        error,
      };

      setNativePassportState(next);
      context.notify?.({
        title: `Native Passport ${label} failed`,
        message: error?.message || String(error),
        tone: 'warning',
      });

      return next;
    } finally {
      setNativePassportCommand('');
    }
  }

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
    if (!drawerDevSurfaceEnabled) {
      context.notify?.({
        title: 'Development surface disabled',
        message:
          'Starter ROC controls require an explicit development build and dev mode.',
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
    if (!drawerDevSurfaceEnabled) {
      context.notify?.({
        title: 'Development surface disabled',
        message:
          'Dev labels require an explicit development build and dev mode.',
        tone: 'warning',
      });
      return null;
    }

    if (typeof context.updateSettings !== 'function') {
      context.notify?.({
        title: 'Settings unavailable',
        message: 'This React context cannot update local settings.',
        tone: 'warning',
      });
      return null;
    }

    const result = await context.updateSettings({
      devMode: true,
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
    if (!drawerDevSurfaceEnabled) {
      context.notify?.({
        title: 'Development surface disabled',
        message:
          'Creator and visitor fixtures require an explicit development build and dev mode.',
        tone: 'warning',
      });
      return null;
    }

    const session = getDevPassportSession(sessionId);

    if (!session) {
      context.notify?.({
        title: 'Unknown dev session',
        message: `${sessionId || 'session'} is not an allowlisted CrabLink dev passport label.`,
        tone: 'warning',
      });
      return;
    }

    setOpeningSessionId(session.id);

    try {
      if (typeof context.updateSettings !== 'function') {
        throw new Error('Dev session switch requires settings access.');
      }

      /*
       * Stream-safe Tauri rule:
       * a dev passport switch is a local label/settings switch only.
       * Do not open a new window, mutate location/hash, call history.replaceState,
       * reload the WebView, or refresh identity/wallet inside this click handler.
       * The creator stream tab must stay mounted and its MediaStream must survive.
       */
      await context.updateSettings({
        devMode: true,
        passportSubject: session.passportSubject,
        walletAccount: session.walletAccount,
        handle: session.handle,
        username: session.handle ? session.handle.replace(/^@/, '') : '',
        usernameStatus: session.usernameStatus || 'local_dev',
        profileCrabUrl: session.handle ? `crab://${session.handle}` : '',
      });

      context.notify?.({
        title: `${session.label} active`,
        message: `${session.passportSubject} / ${session.walletAccount}. Local labels switched only; no URL rewrite, reload, wallet mutation, or fake balance.`,
        tone: 'success',
      });

      onClose?.();
    } catch (error) {
      context.notify?.({
        title: 'Could not switch dev session',
        message: error?.message || String(error),
        tone: 'warning',
      });
    } finally {
      setOpeningSessionId('');
    }
  }

  async function runOnboardingDevelopmentReset() {
    if (
      !onboardingDevelopmentResetAvailable ||
      !onboardingResetArmed ||
      onboardingResetBusy
    ) {
      return null;
    }

    setOnboardingResetBusy(true);

    try {
      const result =
        await resetDisposableOnboardingDevelopmentState({
          enabled:
            onboardingDevelopmentResetAvailable,

          resetSettingsToDefaults:
            context.resetSettingsToDefaults,
        });

      context.notify?.({
        title:
          'Disposable onboarding state cleared',

        message:
          'Native status was verified as no_passport. Settings, cached profile identity, onboarding progress, and local display memory were reset.',

        tone: 'success',
      });

      onClose?.();

      globalThis.location?.reload?.();

      return result;
    } catch (error) {
      context.notify?.({
        title:
          'Onboarding reset did not complete',

        message:
          error?.message ||
          String(error),

        tone: 'warning',
      });

      setOnboardingResetArmed(false);

      return null;
    } finally {
      setOnboardingResetBusy(false);
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
      data-final-beta-passport-mode={
        FINAL_BETA_PHASE4A3_PASSPORT_DRAWER_CONSUMER_MODE
      }
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
            {sessionLabel(activeDevSession)}. These are local labels for testing creator/visitor flows.
            They do not create a passport, mint ROC, or grant spend authority.
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

      <section className="cl-passport-truth" aria-label="Native Passport runtime">
        <header className="cl-drawer-panel-head">
          <div>
            <strong>Device security</strong>
            <p>
              Your local Passport is protected by native desktop controls. PIN and recovery stay outside
              this drawer, and account secrets are never rendered in React.
            </p>
          </div>
        </header>

        <dl className="cl-passport-rows">
          <div>
            <dt>Desktop protection</dt>
            <dd>{nativePassportAvailable ? 'Available' : 'Unavailable outside desktop app'}</dd>
          </div>
          <div>
            <dt>Passport state</dt>
            <dd>{nativePassportStatusLabel}</dd>
          </div>
          <div>
            <dt>Last device action</dt>
            <dd>{nativePassportCommandLabel}</dd>
          </div>
          <div>
            <dt>Checked</dt>
            <dd>{nativePassportState.checkedAt || 'Not checked in this drawer'}</dd>
          </div>
        </dl>

        <div className="cl-passport-actions">
          <button
            type="button"
            onClick={() => refreshNativePassportStatus()}
            disabled={!nativePassportAvailable || nativePassportBusy}
          >
            {nativePassportState.status === 'checking' && !nativePassportCommand
              ? 'Checking native status…'
              : 'Refresh device status'}
          </button>
          <button
            type="button"
            onClick={() => runNativePassportCommand(createNativePassport, 'create')}
            disabled={!nativePassportAvailable || nativePassportBusy}
          >
            {nativePassportCommand === 'create' ? 'Creating…' : 'Create local Passport'}
          </button>
          <button
            type="button"
            onClick={() =>
              runNativePassportCommand(unlockNativePassportOperational, 'unlock operational')
            }
            disabled={!nativePassportAvailable || nativePassportBusy}
          >
            {nativePassportCommand === 'unlock operational'
              ? 'Unlocking…'
              : 'Unlock Passport'}
          </button>
          <button
            type="button"
            onClick={() => runNativePassportCommand(lockNativePassport, 'lock')}
            disabled={!nativePassportAvailable || nativePassportBusy}
          >
            {nativePassportCommand === 'lock' ? 'Locking…' : 'Lock'}
          </button>
        </div>

        <section
          className="cl-passport-guidance"
          aria-label="Recovery and export guidance"
        >
          <strong>Recovery and export</strong>
          <p>
            Recovery words, PIN entry, and export confirmation remain native-only. Use the reviewed
            desktop ceremony when those actions are available; never paste recovery material into CrabLink.
          </p>
        </section>

        <DeveloperDisclosure
          title="Advanced Passport controls"
          summary="Diagnostics, root confirmation, removal, and acceptance evidence"
        >
          <div className="cl-passport-actions">
            <button
              type="button"
              onClick={() =>
                runNativePassportCommand(
                  authorizeNativePassportDevice,
                  'authorize device',
                )
              }
              disabled={!nativePassportAvailable || nativePassportBusy}
              title="Creates one fresh root-confirmed authorization for this authenticated desktop device. No PIN, signature, or authorization object is returned to React."
            >
              {nativePassportCommand === 'authorize device'
                ? 'Authorizing…'
                : 'Authorize this device'}
            </button>
            <button
              type="button"
              onClick={() =>
                runNativePassportCommand(
                  verifyNativePassportDevicePossession,
                  'verify device possession',
                )
              }
              disabled={!nativePassportAvailable || nativePassportBusy}
              title="Uses the already-unlocked operational DeviceKey to prove possession through the public local CrabNode gateway. No key, signature, PIN, capability, or authority material is returned to React."
            >
              {nativePassportCommand === 'verify device possession'
                ? 'Verifying…'
                : 'Verify device possession'}
            </button>
            <button
              type="button"
              onClick={() => runNativePassportCommand(confirmNativePassportRoot, 'root confirm')}
              disabled={!nativePassportAvailable || nativePassportBusy}
              title="Redacted root-sensitive confirmation bridge only; no root material is returned."
            >
              {nativePassportCommand === 'root confirm'
                ? 'Confirming…'
                : 'Confirm root action'}
            </button>
            <button
              type="button"
              onClick={() => runNativePassportCommand(clearNativePassport, 'clear')}
              disabled={!nativePassportAvailable || nativePassportBusy}
              title="Drops native session material and removes the local encrypted vault."
            >
              {nativePassportCommand === 'clear' ? 'Clearing…' : 'Clear local Passport'}
            </button>
          </div>

          <section aria-label="Native Passport status truth">
            <h3>Native Passport status truth</h3>
            <p>
              Phase {NATIVE_PASSPORT_PHASE15AD_LABEL} renders normalized status and command DTO
              facts only. Identifiers remain absent or redacted; unsafe flags must stay NO.
            </p>
            <dl className="cl-passport-rows">
              {nativePassportStatusRows.map((row) => (
                <div key={`native-status-${row.label}`}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>

            <h3>Last native command truth</h3>
            <dl className="cl-passport-rows">
              {nativePassportCommandRows.map((row) => (
                <div key={`native-command-${row.label}`}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>

            <section aria-label="Native Passport manual acceptance">
              <h3>Native Passport manual acceptance</h3>
              <p>
                Phase {NATIVE_PASSPORT_PHASE15AF_LABEL} is the human verification checklist for the
                local Native Passport drawer. Run it only in the desktop Tauri shell.
              </p>
              <ol className="cl-passport-manual-acceptance">
                {nativePassportManualAcceptanceRows.map((row) => (
                  <li key={`native-manual-${row.label}`}>
                    <strong>{row.label}</strong>
                    <span>{row.value}</span>
                  </li>
                ))}
              </ol>
            </section>
          </section>
        </DeveloperDisclosure>

        {nativePassportState.status === 'error' && (
          <p className="cl-passport-inline-warning">
            {nativePassportState.error?.message || 'Native Passport command unavailable.'}
          </p>
        )}
      </section>

      {onboardingDevelopmentResetAvailable && (
        <section
          className="cl-passport-truth"
          aria-label="Disposable onboarding development reset"
          data-onboarding-development-reset="available"
        >
          <strong>
            Disposable onboarding test reset
          </strong>

          <p>
            Development build only. This permanently deletes the local encrypted
            Native Passport vault and clears local CrabLink onboarding, username,
            profile-cache, receipt, catalog, and settings display state. Use it
            only for disposable test material.
          </p>

          <div className="cl-passport-actions">
            <button
              type="button"
              disabled={onboardingResetBusy}
              onClick={() => {
                setOnboardingResetArmed(
                  (armed) => !armed,
                );
              }}
            >
              {onboardingResetArmed
                ? 'Disarm onboarding reset'
                : 'Arm disposable onboarding reset'}
            </button>

            {onboardingResetArmed ? (
              <button
                type="button"
                disabled={onboardingResetBusy}
                onClick={() => {
                  void runOnboardingDevelopmentReset();
                }}
              >
                {onboardingResetBusy
                  ? 'Clearing and verifying…'
                  : 'Confirm clear Passport and reset onboarding'}
              </button>
            ) : null}
          </div>
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
              Open Profile Studio, your saved library, or backend-derived receipt history.
            </p>
          </div>
        </header>

        <div className="cl-passport-actions">
          <button type="button" onClick={() => navigateAndClose(profileRouteFromView(view))}>
            Profile Studio
          </button>
          <button type="button" onClick={() => navigateAndClose('crab://library')}>
            Library <span aria-label={`${catalogCount} catalog entries`}>({catalogCount})</span>
          </button>
          <button type="button" onClick={() => navigateAndClose('crab://receipts')}>
            Receipts <span aria-label={`${receiptCount} receipts`}>({receiptCount})</span>
          </button>
        </div>
      </section>

      <DeveloperDisclosure
        title="Advanced account pages"
        summary="Proof and QuickChain engineering surfaces"
      >
        <div className="cl-passport-actions">
          <button type="button" onClick={() => navigateAndClose('crab://text')}>
            Text proof
          </button>
          <button type="button" onClick={() => navigateAndClose('crab://quickchain')}>
            QuickChain
          </button>
        </div>
      </DeveloperDisclosure>

      {drawerDevSurfaceEnabled && (
        <section className="cl-passport-truth" aria-label="Starter ROC bootstrap">
        <header className="cl-drawer-panel-head">
          <div>
            <strong>Starter ROC bootstrap</strong>
            <p>
              Explicit dev-only backend-routed starter balance action for the active passport/session.
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
                : 'Use Creator A or Visitor B first'
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
      )}

      {devSessions.length > 0 && (
        <details className="cl-passport-truth" aria-label="Multi-passport dev testing">
          <summary>Creator / visitor dev sessions</summary>
          <p>
            In Tauri this switches the current React session without reloading the WebView, so mounted
            tabs and local stream preview stay alive. In Chrome proof mode it may open a separate window.
            These labels do not fake backend truth.
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
                {openingSessionId === session.id ? `Switching ${session.label}…` : `Use ${session.label}`}
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

      {drawerDevSurfaceEnabled && context.storage?.isDevFallback && (
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


function isTauriRuntime() {
  return Boolean(
    globalThis.__TAURI__ ||
      globalThis.__TAURI_INTERNALS__ ||
      globalThis.window?.__TAURI__ ||
      globalThis.window?.__TAURI_INTERNALS__,
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


function nativePassportStatusRowsFromDto(status) {
  if (!status || typeof status !== 'object') {
    return [
      ['Status DTO schema', 'not_loaded'],
      ['Native state', 'not_checked'],
      ['Redacted', 'YES'],
      ['Read only', 'YES'],
      ['Native runtime ready', 'NO'],
      ['Passport identifier', 'ABSENT'],
      ['Device identifier', 'ABSENT'],
      ['Username handle', 'ABSENT'],
      ['Capability material', 'ABSENT'],
      ['Unsafe status flags', 'NO'],
    ].map(nativePassportRow);
  }

  return [
    ['Status DTO schema', safeNativePassportDisplayValue(status.schema)],
    ['Native state', safeNativePassportDisplayValue(status.state)],
    ['Capability state', safeNativePassportDisplayValue(status.capabilityState)],
    ['Redacted', safeBooleanLabel(status.redacted)],
    ['Read only', safeBooleanLabel(status.readOnly)],
    ['Native runtime ready', safeBooleanLabel(status.nativeRuntimeReady)],
    ['Passport identifier', safeNativePassportDisplayValue(status.passportIdentifier)],
    ['Device identifier', safeNativePassportDisplayValue(status.deviceIdentifier)],
    ['Username handle', safeNativePassportDisplayValue(status.usernameHandle)],
    ['Capability material', safeNativePassportDisplayValue(status.capabilityMaterial)],
    [
      'Unsafe status flags',
      status.unlockPerformed === true ||
      status.platformSealerAccessed === true ||
      status.runtimeIoPerformed === true ||
      status.storageMutated === true ||
      status.walletOrLedgerMutated === true
        ? 'YES'
        : 'NO',
    ],
  ].map(nativePassportRow);
}

function nativePassportCommandRowsFromDto(command) {
  if (!command || typeof command !== 'object') {
    return [
      ['Command DTO schema', 'not_loaded'],
      ['Command name', 'none'],
      ['Command state', 'none'],
      ['Native secure input requested', 'NO'],
      ['PIN from WebView', 'NO'],
      ['Secret material returned', 'NO'],
      ['Session changed', 'NO'],
      ['Encrypted vault mutated', 'NO'],
      ['Platform material mutated', 'NO'],
      ['Recovery root unsealed', 'NO'],
      ['Wallet or ledger mutated', 'NO'],
    ].map(nativePassportRow);
  }

  return [
    ['Command DTO schema', safeNativePassportDisplayValue(command.schema)],
    ['Command name', safeNativePassportDisplayValue(command.commandName)],
    ['Command state', safeNativePassportDisplayValue(command.state)],
    [
      'Native secure input requested',
      safeBooleanLabel(command.nativeSecureInputRequested),
    ],
    ['PIN from WebView', safeBooleanLabel(command.pinReceivedFromWebview)],
    ['Secret material returned', safeBooleanLabel(command.secretMaterialReturned)],
    ['Session changed', safeBooleanLabel(command.sessionChanged)],
    ['Encrypted vault mutated', safeBooleanLabel(command.encryptedVaultMutated)],
    ['Platform material mutated', safeBooleanLabel(command.platformMaterialMutated)],
    ['Recovery root unsealed', safeBooleanLabel(command.recoveryRootUnsealed)],
    ['Wallet or ledger mutated', safeBooleanLabel(command.walletOrLedgerMutated)],
  ].map(nativePassportRow);
}


function nativePassportManualAcceptanceRowsFromState(
  nativeRuntimeAvailable,
  status,
  command,
) {
  const statusState = status?.state || 'not_checked';
  const commandState = command?.state || 'none';

  return [
    [
      'Manual acceptance phase',
      NATIVE_PASSPORT_PHASE15AF_LABEL,
    ],
    [
      'Runtime boundary',
      nativeRuntimeAvailable
        ? 'Available in Tauri; unavailable in browser preview.'
        : 'Unavailable outside the Tauri desktop shell.',
    ],
    [
      'Create path',
      'Use Create local Passport and confirm the native secure prompt appears.',
    ],
    [
      'Operational unlock path',
      'Use Unlock operational and confirm status reaches operational_unlocked only after native input.',
    ],
    [
      'Lock path',
      'Use Lock and confirm in-memory operational material is dropped.',
    ],
    [
      'Root confirmation path',
      'Root-sensitive confirmation stays redacted and returns no root material.',
    ],
    [
      'Clear path',
      'Use Clear local Passport and confirm Clear returns the drawer to no_passport.',
    ],
    [
      'React secret boundary',
      'PIN, password, recovery words, and root material are never entered in React.',
    ],
    [
      'Outcome checkpoint',
      `Current status: ${safeNativePassportDisplayValue(statusState)}; last command: ${safeNativePassportDisplayValue(commandState)}.`,
    ],
  ].map(nativePassportRow);
}

function nativePassportRow([label, value]) {
  return {
    label,
    value,
  };
}

function safeNativePassportDisplayValue(value) {
  if (typeof value !== 'string') {
    return 'ABSENT';
  }

  const normalized = value.trim();

  if (!normalized) {
    return 'ABSENT';
  }

  if (normalized === 'ABSENT' || normalized === 'REDACTED') {
    return normalized;
  }

  if (
    normalized.startsWith('crablink.native-passport.') ||
    normalized.startsWith('passport_') ||
    normalized === 'available' ||
    normalized === 'unavailable' ||
    normalized === 'no_passport' ||
    normalized === 'stored_locked' ||
    normalized === 'operational_unlocked' ||
    normalized === 'absent' ||
    normalized === 'created_locked' ||
    normalized === 'already_exists' ||
    normalized === 'create_rejected' ||
    normalized === 'cancelled' ||
    normalized === 'cleared' ||
    normalized === 'locked'
  ) {
    return normalized;
  }

  return 'REDACTED';
}

function safeBooleanLabel(value) {
  return value === true ? 'YES' : 'NO';
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

  return [`${account} bootstrap complete`, amount ? `${amount} ROC` : '', receipt ? `receipt ${receipt}` : '']
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