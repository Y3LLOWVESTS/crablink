/**
 * RO:WHAT — Clones and freezes deterministic memory-adapter values.
 * RO:WHY — Test fixtures must not leak mutable references between callers.
 * RO:INTERACTS — settings, gateway-profile, diagnostics, and receipt memory adapters.
 * RO:INVARIANTS — plain data only; cycles, functions, symbols, and exotic objects fail closed.
 * RO:SECURITY — no storage, network, native bridge, wallet, ledger, or session authority.
 * RO:TEST — memoryAdapters.test.mjs.
 */

function isPlainRecord(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

export function cloneMemoryValue(
  value,
  seen = new WeakSet(),
) {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(
        'memory values require finite numbers',
      );
    }

    return value;
  }

  if (
    typeof value !== 'object'
  ) {
    throw new TypeError(
      'memory values require plain data',
    );
  }

  if (seen.has(value)) {
    throw new TypeError(
      'memory values cannot contain cycles',
    );
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const output = value.map(
      (item) =>
        cloneMemoryValue(
          item,
          seen,
        ),
    );

    seen.delete(value);
    return output;
  }

  if (!isPlainRecord(value)) {
    throw new TypeError(
      'memory values require plain records',
    );
  }

  const output = {};

  for (
    const [
      key,
      nestedValue,
    ] of Object.entries(value)
  ) {
    output[key] = cloneMemoryValue(
      nestedValue,
      seen,
    );
  }

  seen.delete(value);
  return output;
}

function freezeRecursively(value) {
  if (
    value &&
    typeof value === 'object' &&
    !Object.isFrozen(value)
  ) {
    for (
      const nestedValue of
      Object.values(value)
    ) {
      freezeRecursively(
        nestedValue,
      );
    }

    Object.freeze(value);
  }

  return value;
}

export function freezeMemorySnapshot(
  value,
) {
  return freezeRecursively(
    cloneMemoryValue(value),
  );
}
