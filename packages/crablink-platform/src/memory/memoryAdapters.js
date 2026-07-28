/**
 * RO:WHAT — Deterministic memory implementations for portable CrabLink ports.
 * RO:WHY — Shared behavior needs test adapters that run without Chrome, Tauri, storage, or network.
 * RO:INTERACTS — settings, gateway-profile, diagnostics, receipts ports and memory snapshots.
 * RO:INVARIANTS — defaults fail closed; reads return immutable isolated snapshots.
 * RO:SECURITY — no fake pairing, session, accepted receipt, paid unlock, balance, ROC, or finality.
 * RO:TEST — memoryAdapters.test.mjs and check-crablink-platform-memory-boundary.mjs.
 */

import {
  createDiagnosticsPort,
} from '../contracts/diagnosticsPort.js';

import {
  createGatewayProfilePort,
} from '../contracts/gatewayPort.js';

import {
  createReceiptsPort,
} from '../contracts/receiptsPort.js';

import {
  createSettingsPort,
} from '../contracts/settingsPort.js';

import {
  cloneMemoryValue,
  freezeMemorySnapshot,
} from './memorySnapshot.js';

const GATEWAY_STATES =
  new Set([
    'unconfigured',
    'blocked',
    'unavailable',
    'reviewed',
  ]);

const FORBIDDEN_RECEIPT_TRUTH = [
  'backendDerived',
  'accepted',
  'paidEntitlementAuthority',
  'confirmedRocAuthority',
  'walletAuthority',
  'ledgerAuthority',
  'finalityAuthority',
  'unlocksPaidContent',
  'sessionPresent',
];

function requireRecord(
  value,
  label,
) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new TypeError(
      `${label} requires a plain record`,
    );
  }

  return value;
}

function boundedText(
  value,
  label,
  maxBytes,
) {
  if (typeof value !== 'string') {
    throw new TypeError(
      `${label} requires text`,
    );
  }

  const normalized = value.trim();

  if (
    !normalized ||
    /[\u0000-\u001f\u007f]/u.test(
      normalized,
    ) ||
    Buffer.byteLength(
      normalized,
      'utf8',
    ) > maxBytes
  ) {
    throw new TypeError(
      `${label} is invalid`,
    );
  }

  return normalized;
}

function normalizeGatewayProfile(
  input = {},
) {
  const source = requireRecord(
    input,
    'gateway profile fixture',
  );

  const state =
    source.state ?? 'unconfigured';

  if (!GATEWAY_STATES.has(state)) {
    throw new TypeError(
      'gateway profile state is invalid',
    );
  }

  return freezeMemorySnapshot({
    state,
    configured:
      state === 'reviewed',
    paired: false,
    sessionPresent: false,
    ready: false,
    transportAuthority: false,
  });
}

function normalizeDiagnostics(
  input = {},
) {
  const source = requireRecord(
    input,
    'diagnostics fixture',
  );

  const app = source.app === undefined
    ? 'CrabLink Memory'
    : boundedText(
        source.app,
        'diagnostics app',
        64,
      );

  const profile =
    source.profile === undefined
      ? 'memory-test'
      : boundedText(
          source.profile,
          'diagnostics profile',
          64,
        );

  return freezeMemorySnapshot({
    app,
    profile,
    available: false,
    clientOnly: true,
    nativeBridge: false,
    authority: 'display-only',
  });
}

function normalizeReceiptFixture(
  input,
) {
  const source = requireRecord(
    input,
    'receipt fixture',
  );

  for (
    const field of
    FORBIDDEN_RECEIPT_TRUTH
  ) {
    if (source[field] === true) {
      throw new TypeError(
        'memory receipt cannot claim backend receipt truth',
      );
    }
  }

  const receipt = {
    id: boundedText(
      source.id,
      'receipt fixture id',
      128,
    ),
    label: boundedText(
      source.label,
      'receipt fixture label',
      160,
    ),
    displayOnly: true,
    backendDerived: false,
    accepted: false,
    paidEntitlementAuthority: false,
    confirmedRocAuthority: false,
    walletAuthority: false,
    ledgerAuthority: false,
    finalityAuthority: false,
    unlocksPaidContent: false,
    sessionPresent: false,
  };

  if (source.action !== undefined) {
    receipt.action = boundedText(
      source.action,
      'receipt fixture action',
      80,
    );
  }

  if (source.amount !== undefined) {
    receipt.amount = boundedText(
      source.amount,
      'receipt fixture amount',
      80,
    );
  }

  if (source.timestamp !== undefined) {
    receipt.timestamp = boundedText(
      source.timestamp,
      'receipt fixture timestamp',
      80,
    );
  }

  if (source.proofText !== undefined) {
    receipt.proofText = boundedText(
      source.proofText,
      'receipt fixture proof text',
      512,
    );
  }

  return freezeMemorySnapshot(
    receipt,
  );
}

export function createMemorySettingsAdapter(
  initialSettings = {},
) {
  let settings = cloneMemoryValue(
    requireRecord(
      initialSettings,
      'settings fixture',
    ),
  );

  return createSettingsPort({
    readSettings: async () =>
      freezeMemorySnapshot(settings),

    writeSettings: async (
      nextSettings,
    ) => {
      settings = cloneMemoryValue(
        requireRecord(
          nextSettings,
          'settings fixture',
        ),
      );

      return freezeMemorySnapshot(
        settings,
      );
    },
  });
}

export function createMemoryGatewayProfileAdapter(
  initialProfile = {},
) {
  const profile =
    normalizeGatewayProfile(
      initialProfile,
    );

  return createGatewayProfilePort({
    readGatewayProfile: async () =>
      freezeMemorySnapshot(profile),
  });
}

export function createMemoryDiagnosticsAdapter(
  initialDiagnostics = {},
) {
  const diagnostics =
    normalizeDiagnostics(
      initialDiagnostics,
    );

  return createDiagnosticsPort({
    getDiagnostics: async () =>
      freezeMemorySnapshot(
        diagnostics,
      ),
  });
}

export function createMemoryReceiptDisplayAdapter(
  initialReceipts = [],
) {
  if (!Array.isArray(initialReceipts)) {
    throw new TypeError(
      'receipt fixtures require an array',
    );
  }

  const receipts = initialReceipts.map(
    normalizeReceiptFixture,
  );

  return createReceiptsPort({
    listRecentReceipts: async () =>
      freezeMemorySnapshot(
        receipts,
      ),
  });
}
