/**
 * RO:WHAT — Wallet display API helper for the React CrabLink shell.
 * RO:WHY — Keeps balance and future hold flows gateway-routed and explicit.
 * RO:INTERACTS — gatewayClient.js, BalanceChip, PassportDrawer, future paid asset/site flows.
 * RO:INVARIANTS — no fake balances; no silent spend; wallet/ledger truth stays backend-owned.
 * RO:METRICS — inherits x-correlation-id behavior from GatewayClient.
 * RO:CONFIG — gateway client wallet account label.
 * RO:SECURITY — no spend authority, private keys, seed phrases, or local ledger truth.
 * RO:TEST — wallet display smoke once backend route is active.
 */

export function createWalletClient(gateway) {
  return new WalletClient(gateway);
}

export class WalletClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway);
  }

  async getBalance(account) {
    this.assertGateway();

    const walletAccount = String(account || this.gateway.walletAccount || '').trim();

    if (!walletAccount) {
      throw makeWalletError(
        'Wallet balance requires a configured wallet account label.',
        'missing_wallet_account',
      );
    }

    if (typeof this.gateway.getWalletBalance === 'function') {
      return this.gateway.getWalletBalance(walletAccount);
    }

    return this.gateway.request(`/wallet/${encodeURIComponent(walletAccount)}/balance`, {
      label: 'Wallet balance',
    });
  }

  async hold(payload = {}, options = {}) {
    this.assertGateway();

    if (options.confirmed !== true) {
      throw makeWalletError(
        'Wallet hold requires explicit caller confirmation.',
        'confirmation_required',
      );
    }

    return this.gateway.request('/wallet/hold', {
      method: 'POST',
      body: payload,
      label: 'Wallet hold',
      mutation: true,
    });
  }

  assertGateway() {
    if (!this.gateway) {
      throw makeWalletError(
        'Wallet refresh requires the configured gateway client.',
        'missing_gateway_client',
      );
    }

    if (typeof this.gateway.request !== 'function' && typeof this.gateway.getWalletBalance !== 'function') {
      throw makeWalletError(
        'Wallet refresh requires a gateway client with request/getWalletBalance support.',
        'missing_gateway_method',
      );
    }
  }
}

function makeWalletError(message, reason) {
  const error = new Error(message);
  error.name = 'WalletClientError';
  error.reason = reason;
  error.status = 0;
  error.retryable = false;
  return error;
}