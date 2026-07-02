/**
 * RO:WHAT — ROC balance chip for the trusted CrabLink shell.
 * RO:WHY — Shows backend-derived or visibly stale wallet display state while keeping ledger truth backend-owned.
 * RO:INTERACTS — appContext settings/walletState/refreshWallet, TopBar, walletClient.
 * RO:INVARIANTS — no fake balances; no local ledger truth; no silent spend; click only refreshes read-only balance.
 * RO:METRICS — refreshWallet inherits gateway x-correlation-id behavior.
 * RO:CONFIG — walletAccount, rocBalanceDisplay, rocBalanceSource.
 * RO:SECURITY — no spend authority stored or displayed; stale labels are visible and never balance truth.
 * RO:TEST — npm run check:internal-roc-stabilization-balance-refresh; npm run check:internal-roc-phase4-wallet-receipt-ux.
 */

import { useMemo } from 'react';
import { useAppContext } from '../appContext.js';

export default function BalanceChip() {
  const { settings, storage, walletState, refreshWallet } = useAppContext();

  const view = useMemo(
    () =>
      buildBalanceView({
        settings,
        storage,
        wallet: walletState?.data,
        state: walletState,
      }),
    [settings, storage, walletState],
  );

  async function onRefresh() {
    if (walletState?.status === 'checking') {
      return;
    }

    await refreshWallet?.();
  }

  return (
    <button
      className={[
        'cl-chip',
        'cl-balance-chip',
        view.ledgerBacked ? 'cl-chip-verified' : '',
        view.backendDerived ? 'cl-chip-backend-derived' : '',
        view.stale ? 'cl-chip-stale' : '',
        view.tone ? `cl-chip-${view.tone}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      type="button"
      title={view.title}
      onClick={onRefresh}
      aria-label={`Refresh ROC balance: ${view.display}; ${view.sourceLabel}`}
    >
      <span className="cl-chip-label">ROC</span>
      <strong>{view.display}</strong>
      <small>{view.sourceLabel}</small>
    </button>
  );
}

function buildBalanceView({ settings = {}, storage = {}, wallet = null, state = {} } = {}) {
  const walletBody = objectOrEmpty(wallet?.wallet || wallet?.balance || wallet);
  const status = String(state?.status || 'idle');
  const checking = status === 'checking';
  const error = state?.error || null;
  const checkedAt = state?.checkedAt || '';
  const stale = Boolean(state?.stale || walletBody.stale || walletBody.staleDisplay);
  const refreshedAt = firstPresent(walletBody.refreshedAt, walletBody.refreshed_at, checkedAt);
  const refreshAgeLabel = refreshedAt ? formatRefreshAge(refreshedAt) : '';
  const staleReason = normalizeSource(walletBody.staleReason || error?.reason || '');
  const walletAccount = String(
    firstPresent(
      walletBody.account,
      walletBody.wallet_account,
      walletBody.walletAccount,
      settings.walletAccount,
    ) || '',
  ).trim();

  const backendDisplayCandidate = firstPresent(
    walletBody.display,
    walletBody.balance_display,
    walletBody.balanceDisplay,
    walletBody.available_display,
    walletBody.availableDisplay,
    walletBody.roc_balance,
    walletBody.rocBalance,
    walletBody.available,
    walletBody.available_minor,
    walletBody.availableMinor,
    walletBody.available_minor_units,
    walletBody.availableMinorUnits,
    walletBody.amount_minor,
    walletBody.amountMinor,
    walletBody.amount_minor_units,
    walletBody.amountMinorUnits,
    walletBody.balance_minor,
    walletBody.balanceMinor,
    walletBody.balance_minor_units,
    walletBody.balanceMinorUnits,
  );
  const settingsDisplayCandidate = firstPresent(settings.rocBalanceDisplay, settings.rocBalanceMinorUnits);
  const displaySource = backendDisplayCandidate !== undefined && backendDisplayCandidate !== null ? 'backend' : settingsDisplayCandidate ? 'settings' : '';
  const display = cleanRocDisplay(displaySource === 'backend' ? backendDisplayCandidate : settingsDisplayCandidate);
  const source = normalizeSource(
    firstPresent(
      walletBody.sourceLabel,
      walletBody.source_label,
      walletBody.source,
      walletBody.balance_source,
      walletBody.balanceSource,
      settings.rocBalanceSource,
    ),
  );

  const ledgerBacked =
    isTruthy(walletBody.ledger_backed) ||
    isTruthy(walletBody.ledgerBacked) ||
    walletBody.source === 'ledger';
  const backendDerived =
    !stale &&
    displaySource === 'backend' &&
    (isTruthy(walletBody.backendDerived) ||
      isTruthy(walletBody.backend_derived) ||
      status === 'ok' ||
      Boolean(source) ||
      ledgerBacked);

  if (!walletAccount && !display && !checking && !error) {
    return {
      display: 'No acct',
      ledgerBacked: false,
      backendDerived: false,
      stale: false,
      refreshAgeLabel,
      tone: 'empty',
      sourceLabel: 'no wallet account',
      title: storage?.isDevFallback
        ? 'No wallet account is configured in this HTTP preview. Use the passport drawer dev labels for preview-only headers.'
        : 'No wallet account is configured. Set one in CrabLink settings or refresh identity from the gateway.',
    };
  }

  if (checking) {
    return {
      display: display || '…',
      ledgerBacked: false,
      backendDerived: false,
      stale,
      refreshAgeLabel,
      tone: 'checking',
      sourceLabel: stale ? 'refreshing stale backend display' : 'gateway refresh pending',
      title: 'Refreshing wallet balance through the gateway. Local display remains non-authoritative while refresh is pending.',
    };
  }

  if (error && display) {
    return {
      display,
      ledgerBacked,
      backendDerived: false,
      stale: true,
      refreshAgeLabel,
      tone: 'warning',
      sourceLabel: 'refresh failed — stale display',
      title: `${walletErrorTitle(error, storage)} Last visible value is stale display only${staleReason ? ` (${staleReason})` : ''}${refreshAgeLabel ? `; ${refreshAgeLabel}` : ''}.`,
    };
  }

  if (error) {
    return {
      display: '!',
      ledgerBacked: false,
      backendDerived: false,
      stale: false,
      refreshAgeLabel,
      tone: 'warning',
      sourceLabel: 'refresh failed — no backend balance',
      title: walletErrorTitle(error, storage),
    };
  }

  if (display) {
    const sourceLabel = backendDerived
      ? ledgerBacked
        ? 'ledger-backed backend balance'
        : 'backend-derived balance'
      : stale
        ? 'stale backend display'
        : displaySource === 'settings'
          ? 'stale display hint'
          : 'Display-only wallet balance';

    return {
      display,
      ledgerBacked,
      backendDerived,
      stale,
      refreshAgeLabel,
      tone: backendDerived ? 'verified' : stale ? 'warning' : 'display',
      sourceLabel,
      title:
        backendDerived
          ? `Backend-derived balance refresh truth${source ? ` from ${source}` : ''}${refreshedAt ? ` refreshed at ${formatRefreshTime(refreshedAt)}` : ''}. Click to refresh through the gateway.`
          : stale
            ? `Stale backend display only${refreshAgeLabel ? `; ${refreshAgeLabel}` : ''}. Click to retry backend balance refresh. Local cache/settings are never balance truth.`
            : 'Display-only wallet balance. Click to refresh through the gateway; local settings are never balance truth.',
    };
  }

  return {
    display: '—',
    ledgerBacked: false,
    backendDerived: false,
    stale: false,
    refreshAgeLabel,
    tone: storage?.isDevFallback ? 'fallback' : 'empty',
    sourceLabel: storage?.isDevFallback ? 'preview unavailable' : 'backend balance unavailable',
    title: storage?.isDevFallback
      ? 'Balance unavailable in HTTP preview unless gateway CORS permits this origin. Test extension-origin React for live balance.'
      : 'Balance unavailable. Click to refresh through the gateway.',
  };
}

function cleanRocDisplay(value) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return '';
  }

  if (/^\d+$/.test(raw)) {
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  return raw.replace(/\s*ROC$/i, '');
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function normalizeSource(value) {
  return String(value || '').trim().replace(/[^a-z0-9_.:-]+/gi, '-').slice(0, 64);
}

function formatRefreshAge(value) {
  const ms = Date.parse(value);

  if (!Number.isFinite(ms)) {
    return '';
  }

  const ageMs = Math.max(0, Date.now() - ms);
  const ageSeconds = Math.floor(ageMs / 1000);

  if (ageSeconds < 60) {
    return 'refreshed less than 1 minute ago';
  }

  const ageMinutes = Math.floor(ageSeconds / 60);

  if (ageMinutes < 60) {
    return `refreshed ${ageMinutes} minute${ageMinutes === 1 ? '' : 's'} ago`;
  }

  const ageHours = Math.floor(ageMinutes / 60);
  return `refreshed ${ageHours} hour${ageHours === 1 ? '' : 's'} ago`;
}

function formatRefreshTime(value) {
  return String(value || '').trim();
}

function isTruthy(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function walletErrorTitle(error, storage) {
  const message = error?.message || 'Unable to refresh wallet balance.';
  const reason = String(error?.reason || '').trim();

  if (storage?.isDevFallback) {
    return `${message} HTTP preview may be blocked by browser/CORS/origin limits.`;
  }

  if (reason === 'network_error') {
    return `${message} Confirm the gateway is running and reload the packaged extension/staging build.`;
  }

  return message;
}
