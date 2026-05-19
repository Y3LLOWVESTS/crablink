/**
 * RO:WHAT — Gateway adapter contract.
 * RO:WHY — Shared React must stay gateway-first without owning transport details.
 * RO:INTERACTS — Chrome/Tauri gateway adapters and svc-gateway public routes.
 * RO:INVARIANTS — no direct wallet, ledger, storage, index, or omnigate calls.
 */

export function createGatewayPort(methods) {
  const required = ["health", "ready", "resolveCrabUrl"];

  for (const name of required) {
    if (typeof methods?.[name] !== "function") {
      throw new TypeError(`gateway port missing ${name}`);
    }
  }

  return Object.freeze({ ...methods });
}
