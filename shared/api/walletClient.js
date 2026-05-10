/**
 * RO:WHAT — Wallet display API helper for the React CrabLink shell.
 * RO:WHY — Keeps balance and future hold flows gateway-routed and explicit.
 * RO:INTERACTS — gatewayClient.js, BalanceChip, future paid asset/site flows.
 * RO:INVARIANTS — no fake balances; no silent spend; wallet/ledger truth stays backend-owned.
 * RO:METRICS — inherits x-correlation-id behavior from GatewayClient.
 * RO:CONFIG — gateway client wallet account label.
 * RO:SECURITY — no spend authority, private keys, or seed phrases stored locally.
 * RO:TEST — wallet display smoke once backend route is active.
 */

export function createWalletClient(gateway) {
  return {
    gateway,
    getBalance(account) {
      return gateway.getWalletBalance(account);
    },
    hold(_payload, options = {}) {
      if (options.confirmed !== true) {
        throw new Error('Wallet hold requires explicit caller confirmation.');
      }

      return gateway.request('/wallet/hold', {
        method: 'POST',
        body: _payload,
        label: 'Wallet hold',
      });
    },
  };
}