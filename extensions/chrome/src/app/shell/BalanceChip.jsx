/**
 * RO:WHAT — ROC balance chip for the trusted CrabLink shell.
 * RO:WHY — Shows wallet display state while keeping ledger truth backend-owned.
 * RO:INTERACTS — appContext settings/walletState/refreshWallet, TopBar, future wallet display routes.
 * RO:INVARIANTS — no fake balances; no local ledger truth; no silent spend; click only refreshes read-only balance.
 * RO:METRICS — refreshWallet inherits gateway x-correlation-id behavior.
 * RO:CONFIG — walletAccount, rocBalanceDisplay, rocLedgerBacked, rocBalanceSource.
 * RO:SECURITY — no spend authority stored or displayed.
 * RO:TEST — manual wallet chip smoke in extension and Vite contexts.
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
        view.tone ? `cl-chip-${view.tone}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      type="button"
      title={view.title}
      onClick={onRefresh}
      aria-label={`Refresh ROC balance: ${view.display}`}
    >
      <span className="cl-chip-label">ROC</span>
      <strong>{view.display}</strong>
    </button>
  );
}

function buildBalanceView({ settings = {}, storage = {}, wallet = null, state = {} } = {}) {
  const walletBody = objectOrEmpty(wallet?.wallet || wallet?.balance || wallet);
  const status = String(state?.status || 'idle');
  const checking = status === 'checking';
  const error = state?.error || null;
  const walletAccount = String(
    firstPresent(
      walletBody.account,
      walletBody.wallet_account,
      walletBody.walletAccount,
      settings.walletAccount,
    ) || '',
  ).trim();

  const display = cleanRocDisplay(
    firstPresent(
      walletBody.display,
      walletBody.balance_display,
      walletBody.balanceDisplay,
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
      settings.rocBalanceDisplay,
      settings.rocBalanceMinorUnits,
    ),
  );

  const ledgerBacked =
    walletBody.ledger_backed === true ||
    walletBody.ledgerBacked === true ||
    walletBody.source === 'ledger' ||
    settings.rocLedgerBacked === true;

  if (!walletAccount && !display && !checking && !error) {
    return {
      display: 'No acct',
      ledgerBacked: false,
      tone: 'empty',
      title: storage?.isDevFallback
        ? 'No wallet account is configured in this HTTP preview. Use the passport drawer dev labels for preview-only headers.'
        : 'No wallet account is configured. Set one in CrabLink settings or refresh identity from the gateway.',
    };
  }

  if (checking) {
    return {
      display: '…',
      ledgerBacked: false,
      tone: 'checking',
      title: 'Refreshing wallet balance through the gateway.',
    };
  }

  if (error) {
    return {
      display: '!',
      ledgerBacked: false,
      tone: 'warning',
      title: walletErrorTitle(error, storage),
    };
  }

  if (display) {
    return {
      display,
      ledgerBacked,
      tone: ledgerBacked ? 'verified' : 'display',
      title:
        walletBody.source ||
        settings.rocBalanceSource ||
        (ledgerBacked
          ? 'Last known ledger-backed balance display. Click to refresh through the gateway.'
          : 'Display-only wallet balance. Click to refresh through the gateway.'),
    };
  }

  return {
    display: '—',
    ledgerBacked: false,
    tone: storage?.isDevFallback ? 'fallback' : 'empty',
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