/**
 * RO:WHAT — Wallet display/action contract.
 * RO:WHY — Keeps paid flows explicit and backend-derived across platforms.
 * RO:INTERACTS — gateway wallet routes, future paid prepare/confirm adapters.
 * RO:INVARIANTS — no fake balances; no silent spend; no direct ledger mutation.
 */

export function createWalletPort(methods) {
  const required = ["getBalance"];

  for (const name of required) {
    if (typeof methods?.[name] !== "function") {
      throw new TypeError(`wallet port missing ${name}`);
    }
  }

  return Object.freeze({ ...methods });
}
