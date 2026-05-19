/**
 * RO:WHAT — Receipt display-cache contract.
 * RO:WHY — Shared React can show recent receipts without inventing truth.
 * RO:INTERACTS — backend receipt DTOs, local display cache.
 * RO:INVARIANTS — cache is display-only; paid unlock requires backend receipt path.
 */

export function createReceiptsPort(methods) {
  const required = ["listRecentReceipts"];

  for (const name of required) {
    if (typeof methods?.[name] !== "function") {
      throw new TypeError(`receipts port missing ${name}`);
    }
  }

  return Object.freeze({ ...methods });
}
