/**
 * RO:WHAT — Builds exact immutable method-only CrabLink platform ports.
 * RO:WHY — Shared React must depend on narrow contracts instead of ambient platform APIs.
 * RO:INTERACTS — diagnosticsPort, gatewayPort, settingsPort, platform adapters.
 * RO:INVARIANTS — required functions only; extra methods discarded; construction performs no calls.
 * RO:SECURITY — ports grant no authority beyond the explicitly supplied functions.
 * RO:TEST — adapterContracts.test.mjs and check-crablink-platform-contracts-boundary.mjs.
 */

export function createMethodPort(
  portName,
  methods,
  requiredMethodNames,
) {
  if (
    !methods ||
    typeof methods !== 'object' ||
    Array.isArray(methods)
  ) {
    throw new TypeError(
      `${portName} requires a method object`,
    );
  }

  if (
    !Array.isArray(requiredMethodNames) ||
    requiredMethodNames.length === 0
  ) {
    throw new TypeError(
      `${portName} requires method names`,
    );
  }

  const port = {};

  for (
    const methodName of
    requiredMethodNames
  ) {
    if (
      typeof methodName !== 'string' ||
      !methodName
    ) {
      throw new TypeError(
        `${portName} contains an invalid method name`,
      );
    }

    const method = methods[methodName];

    if (typeof method !== 'function') {
      throw new TypeError(
        `${portName} requires ${methodName}`,
      );
    }

    port[methodName] = method;
  }

  return Object.freeze(port);
}
