/**
 * RO:WHAT — React app context for settings, gateway client, shell status, identity state, wallet state, toasts, and modals.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; gives route-owned pages one explicit shared boundary.
 * RO:INTERACTS — settings.js, appEvents.js, gatewayClient.js, Shell, PassportDrawer, BalanceChip, ToastHost, ModalHost, pages/*.
 * RO:INVARIANTS — gateway-only backend access; local settings are not truth; no fake CIDs/receipts/balances; no silent ROC spend.
 * RO:METRICS — sends gateway/identity/wallet checks through x-correlation-id via GatewayClient.
 * RO:CONFIG — gatewayUrl, requestTimeoutMs, passportSubject, walletAccount, authToken.
 * RO:SECURITY — no private keys or seed phrases; dev tokens are never rendered by this context.
 * RO:TEST — npm run build; manual gateway/toast/modal/passport/wallet route smoke.
 */

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { APP_EVENTS, appEvents } from './appEvents.js';
import {
  DEFAULT_SETTINGS,
  loadAppSettings,
  resetAppSettings,
  saveAppSettings,
  storageStatus,
  watchAppSettings,
} from './settings.js';
import { createGatewayClient } from '../shared/api/gatewayClient.js';
import { createLocalNodeClient } from '../shared/api/localNodeClient.js';
import { createIdentityClient } from '../shared/api/identityClient.js';
import {
  createWalletClient,
  markWalletBalanceStale,
  normalizeWalletBalance,
  normalizeWalletBalanceError,
} from '../shared/api/walletClient.js';

const AppContext = createContext(null);

const INITIAL_GATEWAY_STATUS = Object.freeze({
  state: 'unknown',
  label: 'Gateway unchecked',
  checkedAt: '',
  health: null,
  ready: null,
  error: null,
});

const INITIAL_LOCAL_NODE_STATUS = Object.freeze({
  state: 'disabled',
  label: 'Local node disabled',
  checkedAt: '',
  data: null,
  error: null,
});

const INITIAL_IDENTITY_STATE = Object.freeze({
  status: 'idle',
  checkedAt: '',
  data: null,
  response: null,
  error: null,
});

const INITIAL_WALLET_STATE = Object.freeze({
  status: 'idle',
  checkedAt: '',
  account: '',
  data: null,
  response: null,
  error: null,
});

export function AppContextProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [storage, setStorage] = useState(() => storageStatus());
  const [settingsReady, setSettingsReady] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  const [gatewayStatus, setGatewayStatus] = useState(INITIAL_GATEWAY_STATUS);
  const [localNodeStatus, setLocalNodeStatus] = useState(INITIAL_LOCAL_NODE_STATUS);
  const [identityState, setIdentityState] = useState(INITIAL_IDENTITY_STATE);
  const [walletState, setWalletState] = useState(INITIAL_WALLET_STATE);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const toastTimers = useRef(new Map());
  const autoHydrateKeyRef = useRef('');

  const gateway = useMemo(() => createGatewayClient(settings), [settings]);
  const localNode = useMemo(() => createLocalNodeClient(settings), [settings]);

  const clients = useMemo(
    () => ({
      gateway,
      localNode,
      identity: createIdentityClient(gateway),
      wallet: createWalletClient(gateway),
    }),
    [gateway, localNode],
  );

  const reloadSettings = useCallback(async () => {
    try {
      const result = await loadAppSettings();
      setSettings(result.settings);
      setStorage(result.storage);
      setSettingsReady(true);
      setSettingsError(null);
      appEvents.emit(APP_EVENTS.SETTINGS_CHANGED, result);
      return result;
    } catch (error) {
      setSettingsReady(true);
      setSettingsError(error);

      return {
        settings,
        storage,
        error,
      };
    }
  }, [settings, storage]);

  useEffect(() => {
    let alive = true;

    void loadAppSettings()
      .then((result) => {
        if (!alive) {
          return;
        }

        setSettings(result.settings);
        setStorage(result.storage);
        setSettingsReady(true);
        setSettingsError(null);
        appEvents.emit(APP_EVENTS.SETTINGS_CHANGED, result);
      })
      .catch((error) => {
        if (!alive) {
          return;
        }

        setSettingsReady(true);
        setSettingsError(error);
      });

    const unwatch = watchAppSettings((result) => {
      if (!alive) {
        return;
      }

      setSettings(result.settings);
      setStorage(result.storage);
      setSettingsError(null);
      appEvents.emit(APP_EVENTS.SETTINGS_CHANGED, result);
    });

    return () => {
      alive = false;
      unwatch();
    };
  }, []);

  useEffect(() => {
    return () => {
      for (const timer of toastTimers.current.values()) {
        globalThis.clearTimeout(timer);
      }

      toastTimers.current.clear();
    };
  }, []);

  const updateSettings = useCallback(async (patch) => {
    const result = await saveAppSettings(patch || {});
    setSettings(result.settings);
    setStorage(result.storage);
    setSettingsError(null);
    appEvents.emit(APP_EVENTS.SETTINGS_CHANGED, result);
    return result;
  }, []);

  const resetSettingsToDefaults = useCallback(async () => {
    const result = await resetAppSettings();
    setSettings(result.settings);
    setStorage(result.storage);
    setSettingsError(null);
    setIdentityState(INITIAL_IDENTITY_STATE);
    setWalletState(INITIAL_WALLET_STATE);
    appEvents.emit(APP_EVENTS.SETTINGS_CHANGED, result);
    return result;
  }, []);

  const dismissToast = useCallback((id) => {
    const safeId = String(id || '').trim();

    if (!safeId) {
      return;
    }

    const timer = toastTimers.current.get(safeId);

    if (timer) {
      globalThis.clearTimeout(timer);
      toastTimers.current.delete(safeId);
    }

    setToasts((items) => items.filter((item) => item.id !== safeId));
  }, []);

  const notify = useCallback(
    ({ title = '', message = '', tone = 'info', ttlMs = 5200 } = {}) => {
      const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const toast = {
        id,
        title: String(title || '').trim(),
        message: String(message || '').trim(),
        tone: normalizeTone(tone),
        createdAt: new Date().toISOString(),
      };

      setToasts((items) => [toast, ...items].slice(0, 5));
      appEvents.emit(APP_EVENTS.TOAST, toast);

      if (Number(ttlMs) > 0) {
        const timer = globalThis.setTimeout(() => dismissToast(id), Number(ttlMs));
        toastTimers.current.set(id, timer);
      }

      return id;
    },
    [dismissToast],
  );

  const openModal = useCallback((nextModal) => {
    const safeModal = nextModal && typeof nextModal === 'object' ? nextModal : {};
    const withId = {
      id: safeModal.id || `modal-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: safeModal.title || '',
      eyebrow: safeModal.eyebrow || '',
      content: safeModal.content || null,
      actions: safeModal.actions || null,
      tone: normalizeTone(safeModal.tone || 'info'),
    };

    setModal(withId);
    appEvents.emit(APP_EVENTS.MODAL_OPEN, withId);
    return withId.id;
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    appEvents.emit(APP_EVENTS.MODAL_CLOSE, {});
  }, []);

  const checkGateway = useCallback(async () => {
    const checking = {
      state: 'checking',
      label: 'Checking gateway…',
      checkedAt: new Date().toISOString(),
      health: null,
      ready: null,
      error: null,
    };

    setGatewayStatus(checking);
    appEvents.emit(APP_EVENTS.GATEWAY_STATUS_CHANGED, checking);

    try {
      const health = await gateway.getHealth();
      let ready = null;
      let readyError = null;

      try {
        ready = await gateway.getReady();
      } catch (error) {
        readyError = error;
      }

      const next = {
        state: readyError ? 'degraded' : 'online',
        label: readyError ? 'Gateway health ok, readiness degraded' : 'Gateway online',
        checkedAt: new Date().toISOString(),
        health,
        ready,
        error: readyError,
      };

      setGatewayStatus(next);
      appEvents.emit(APP_EVENTS.GATEWAY_STATUS_CHANGED, next);
      notify({
        title: next.state === 'online' ? 'Gateway online' : 'Gateway degraded',
        message: readyError ? readyError.message : settings.gatewayUrl,
        tone: next.state === 'online' ? 'success' : 'warning',
      });

      return next;
    } catch (error) {
      const next = {
        state: 'offline',
        label: 'Gateway offline',
        checkedAt: new Date().toISOString(),
        health: null,
        ready: null,
        error,
      };

      setGatewayStatus(next);
      appEvents.emit(APP_EVENTS.GATEWAY_STATUS_CHANGED, next);
      notify({
        title: 'Gateway unavailable',
        message: gatewayUnavailableMessage(error, storage),
        tone: 'danger',
      });

      return next;
    }
  }, [gateway, notify, settings.gatewayUrl, storage]);

  const checkLocalNode = useCallback(async () => {
    const checking = {
      state: 'checking',
      label: 'Checking local node…',
      checkedAt: new Date().toISOString(),
      data: localNodeStatus.data,
      error: null,
    };

    setLocalNodeStatus(checking);

    try {
      const data = await localNode.getStatus();
      const next = normalizeLocalNodeStatus(data);

      setLocalNodeStatus(next);
      notify({
        title: next.state === 'online'
          ? 'Local node attached'
          : next.state === 'disabled'
            ? 'Local node disabled'
            : 'Local node degraded',
        message: next.label,
        tone: next.state === 'online' ? 'success' : next.state === 'disabled' ? 'info' : 'warning',
        ttlMs: 3600,
      });

      return next;
    } catch (error) {
      const next = {
        state: 'error',
        label: error?.message || 'Local node status failed.',
        checkedAt: new Date().toISOString(),
        data: null,
        error,
      };

      setLocalNodeStatus(next);
      notify({
        title: 'Local node unavailable',
        message: error?.message || 'Unable to check local node.',
        tone: 'warning',
      });

      return next;
    }
  }, [localNode, localNodeStatus.data, notify]);

  const runLocalNodeAction = useCallback(
    async (action) => {
      const verb = String(action || 'status').trim();
      const clientAction = localNode?.[verb];

      if (typeof clientAction !== 'function') {
        throw new Error(`Unsupported local node action: ${verb}`);
      }

      try {
        const data = await clientAction();
        const next = normalizeLocalNodeStatus(data);

        setLocalNodeStatus(next);
        notify({
          title: 'Local node control',
          message: next.label,
          tone: next.state === 'online' ? 'success' : next.state === 'disabled' ? 'info' : 'warning',
          ttlMs: 4200,
        });

        return next;
      } catch (error) {
        const next = {
          state: 'error',
          label: error?.message || `Local node ${verb} failed.`,
          checkedAt: new Date().toISOString(),
          data: null,
          error,
        };

        setLocalNodeStatus(next);
        notify({
          title: 'Local node control failed',
          message: next.label,
          tone: 'warning',
        });

        return next;
      }
    },
    [localNode, notify],
  );

  const startLocalNode = useCallback(() => runLocalNodeAction('start'), [runLocalNodeAction]);
  const stopLocalNode = useCallback(() => runLocalNodeAction('stop'), [runLocalNodeAction]);
  const restartLocalNode = useCallback(() => runLocalNodeAction('restart'), [runLocalNodeAction]);

  const refreshIdentity = useCallback(async () => {
    const checking = {
      status: 'checking',
      checkedAt: new Date().toISOString(),
      data: identityState.data,
      response: identityState.response,
      error: null,
    };

    setIdentityState(checking);

    try {
      const client = clients.identity;

      if (!client?.getMe) {
        throw new Error('Identity client is not ready.');
      }

      const response = await client.getMe();
      const data = unwrapGatewayData(response);
      const next = {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        data,
        response,
        error: null,
      };

      setIdentityState(next);
      notify({
        title: 'Identity refreshed',
        message: 'Gateway identity route responded.',
        tone: 'success',
      });

      return next;
    } catch (error) {
      const next = {
        status: 'error',
        checkedAt: new Date().toISOString(),
        data: null,
        response: null,
        error,
      };

      setIdentityState(next);
      notify({
        title: 'Identity unavailable',
        message: gatewayUnavailableMessage(error, storage),
        tone: 'warning',
      });

      return next;
    }
  }, [clients.identity, identityState.data, identityState.response, notify, storage]);

  const refreshWallet = useCallback(
    async (accountOverride = '') => {
      const walletAccount = String(accountOverride || settings.walletAccount || '').trim();

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

        setWalletState(next);
        notify({
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
        data: walletState.data,
        response: walletState.response,
        error: null,
      };

      setWalletState(checking);

      try {
        const client = clients.wallet;

        if (!client?.getBalance) {
          throw new Error('Wallet client is not ready.');
        }

        const response = await client.getBalance(walletAccount);
        const data = response?.walletBalance || normalizeWalletBalance(unwrapGatewayData(response), walletAccount);
        const next = {
          status: 'ok',
          checkedAt: new Date().toISOString(),
          account: walletAccount,
          data,
          response,
          error: null,
        };

        setWalletState(next);
        notify({
          title: 'Wallet balance refreshed',
          message: 'Gateway wallet route responded.',
          tone: 'success',
        });

        return next;
      } catch (error) {
        const safeError = normalizeWalletBalanceError(error);
        const next = {
          status: 'error',
          checkedAt: new Date().toISOString(),
          account: walletAccount,
          data: markWalletBalanceStale(walletState.data, safeError, walletAccount),
          response: walletState.response,
          stale: Boolean(walletState.data),
          error: safeError,
        };

        setWalletState(next);
        notify({
          title: 'Wallet unavailable',
          message: gatewayUnavailableMessage(safeError, storage),
          tone: 'warning',
        });

        return next;
      }
    },
    [
      clients.wallet,
      notify,
      settings.walletAccount,
      storage,
      walletState.data,
      walletState.response,
    ],
  );

  useEffect(() => {
    if (!settingsReady) {
      return undefined;
    }

    if (!storage?.isExtensionContext || storage?.isDevFallback) {
      return undefined;
    }

    const key = autoHydrateKey(settings, storage);

    if (!key || autoHydrateKeyRef.current === key) {
      return undefined;
    }

    autoHydrateKeyRef.current = key;

    let alive = true;

    void (async () => {
      const gatewayResult = await checkGateway();

      if (!alive || gatewayResult?.state === 'offline') {
        return;
      }

      const refreshes = [];

      if (shouldAutoRefreshIdentity(settings)) {
        refreshes.push(refreshIdentity());
      }

      if (shouldAutoRefreshWallet(settings)) {
        refreshes.push(refreshWallet(settings.walletAccount));
      }

      if (refreshes.length > 0) {
        await Promise.allSettled(refreshes);
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    settings,
    settingsReady,
    storage,
    checkGateway,
    refreshIdentity,
    refreshWallet,
  ]);

  const value = useMemo(
    () => ({
      settings,
      storage,
      settingsReady,
      settingsError,
      gateway,
      clients,
      gatewayStatus,
      localNodeStatus,
      identityState,
      walletState,
      reloadSettings,
      updateSettings,
      resetSettingsToDefaults,
      checkGateway,
      checkLocalNode,
      startLocalNode,
      stopLocalNode,
      restartLocalNode,
      refreshIdentity,
      refreshWallet,
      toasts,
      notify,
      dismissToast,
      modal,
      openModal,
      closeModal,
      events: appEvents,
    }),
    [
      settings,
      storage,
      settingsReady,
      settingsError,
      gateway,
      clients,
      gatewayStatus,
      localNodeStatus,
      identityState,
      walletState,
      reloadSettings,
      updateSettings,
      resetSettingsToDefaults,
      checkGateway,
      checkLocalNode,
      startLocalNode,
      stopLocalNode,
      restartLocalNode,
      refreshIdentity,
      refreshWallet,
      toasts,
      notify,
      dismissToast,
      modal,
      openModal,
      closeModal,
    ],
  );

  return createElement(AppContext.Provider, { value }, children);
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used inside AppContextProvider');
  }

  return context;
}

function normalizeLocalNodeStatus(data) {
  const lifecycle = String(data?.lifecycleState || data?.lifecycle_state || 'unknown');
  const enabled = Boolean(data?.enabled);
  const ok = lifecycle === 'active';
  const disabled = !enabled || lifecycle === 'disabled';
  const blocked = lifecycle === 'blocked';
  const checkedAt = data?.checkedAtMs
    ? new Date(Number(data.checkedAtMs)).toISOString()
    : new Date().toISOString();

  let state = 'degraded';
  if (ok) {
    state = 'online';
  } else if (disabled) {
    state = 'disabled';
  } else if (blocked) {
    state = 'degraded';
  }

  const reason = data?.reason || (disabled ? 'Local node disabled.' : 'Local node degraded.');
  const privacy = data?.peerIpDisplay === 'forbidden' && data?.publicInboundEnabled === false;
  const rewardTruth = data?.confirmedRocMinorUnits == null && data?.walletMutation === false && data?.ledgerMutation === false;

  return {
    state,
    label: [
      state === 'online' ? 'Local node attached' : state === 'disabled' ? 'Local node disabled' : 'Local node not active',
      privacy ? 'private' : 'privacy degraded',
      rewardTruth ? 'no ROC claim' : 'reward truth degraded',
      reason,
    ].filter(Boolean).join(' · '),
    checkedAt,
    data,
    error: null,
  };
}

function normalizeTone(tone) {
  const safeTone = String(tone || '').trim().toLowerCase();
  return ['info', 'success', 'warning', 'danger'].includes(safeTone) ? safeTone : 'info';
}

function unwrapGatewayData(response) {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }

  return response || null;
}

function gatewayUnavailableMessage(error, storage) {
  const base = error?.message || 'Unable to reach configured gateway.';
  const reason = String(error?.reason || '').trim();
  const status = Number(error?.status || 0);

  if (storage?.isDevFallback) {
    return `${base} HTTP preview mode may also be blocked by browser/CORS/origin limits. For live gateway proof, test React from the loaded extension origin.`;
  }

  if (reason === 'network_error') {
    return `${base} Confirm the RustyOnions dev stack is running and that the loaded extension has local gateway host permissions.`;
  }

  if (reason === 'timeout') {
    return `${base} The request timed out; check the gateway process and local stack logs.`;
  }

  if (status > 0) {
    return `${base} Gateway returned HTTP ${status}.`;
  }

  return base;
}

function autoHydrateKey(settings = {}, storage = {}) {
  if (!storage.isExtensionContext || storage.isDevFallback) {
    return '';
  }

  return [
    settings.gatewayUrl || 'http://127.0.0.1:8090',
    settings.passportSubject || '',
    settings.walletAccount || '',
    settings.handle || '',
    settings.requestedHandle || '',
  ].join('|');
}

function shouldAutoRefreshIdentity(settings = {}) {
  return Boolean(
    String(settings.passportSubject || '').trim() ||
      String(settings.handle || '').trim() ||
      String(settings.requestedHandle || '').trim(),
  );
}

function shouldAutoRefreshWallet(settings = {}) {
  return Boolean(String(settings.walletAccount || '').trim());
}
