import {
  existsSync,
  readFileSync,
} from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

import {
  normalizeConfirmedRocProjection,
} from '../apps/crablink-tauri/src/shared/wallet/confirmedRocProjection.js';

const root =
  path.resolve(
    path.dirname(
      fileURLToPath(import.meta.url),
    ),
    '..',
  );

const failures = [];

function read(relative) {
  const file =
    path.join(root, relative);

  if (!existsSync(file)) {
    failures.push(
      `missing required file: ${relative}`,
    );

    return '';
  }

  return readFileSync(
    file,
    'utf8',
  );
}

const modelPath =
  'apps/crablink-tauri/src/shared/wallet/confirmedRocProjection.js';

const walletPath =
  'apps/crablink-tauri/src/shared/api/walletClient.js';

const balancePath =
  'apps/crablink-tauri/src/app/shell/BalanceChip.jsx';

const nativePath =
  'apps/crablink-tauri/src-tauri/src/confirmed_roc.rs';

const model = read(modelPath);
const wallet = read(walletPath);
const balance = read(balancePath);
const native = read(nativePath);

for (const token of [
  'wallet_ledger_receipt_only',
  "state: 'unconfirmed'",
  "state: 'confirmed'",
  'pendingEvidenceOnly !== false',
  'clientWalletMutation !== false',
  'clientLedgerMutation !== false',
  'clientFinalityAuthority !== false',
  "source: 'ledger'",
  'backendDerived: true',
  'displayOnly: true',
]) {
  if (!model.includes(token)) {
    failures.push(
      `${modelPath} is missing ${JSON.stringify(token)}`,
    );
  }
}

if (
  !wallet.includes(
    'normalizeConfirmedRocProjection',
  )
) {
  failures.push(
    `${walletPath} does not export the confirmed ROC normalization seam`,
  );
}

for (const token of [
  "walletBody.source === 'ledger'",
  'Display-only wallet balance',
]) {
  if (!balance.includes(token)) {
    failures.push(
      `${balancePath} is missing ${JSON.stringify(token)}`,
    );
  }
}

for (const token of [
  'CONFIRMED_ROC_PROJECTION_SCHEMA',
  'pending evidence cannot become confirmed ROC',
  'client_wallet_mutation',
  'client_ledger_mutation',
  'client_finality_authority',
]) {
  if (!native.includes(token)) {
    failures.push(
      `${nativePath} is missing ${JSON.stringify(token)}`,
    );
  }
}

const valid = {
  schema:
    'crablink.phase22.confirmed-roc-projection.v1',

  version: 1,

  epochId: 'epoch:22',
  accountId: 'acct_phase22_alpha',

  confirmedRocMinorUnits: '10000',

  source:
    'wallet_ledger_receipt_only',

  receiptCount: 1,
  lastLedgerSeq: 1,

  lastLedgerRoot:
    `b3:${'a'.repeat(64)}`,

  transitionHash:
    `b3:${'b'.repeat(64)}`,

  economicsConfigHash:
    `b3:${'c'.repeat(64)}`,

  walletReceiptConfirmed: true,
  ledgerReplayConfirmed: true,
  userNodeReplayAccepted: true,

  pendingEvidenceOnly: false,
  displayOnly: true,

  clientWalletMutation: false,
  clientLedgerMutation: false,
  clientFinalityAuthority: false,

  operationIds: [
    'operation:phase22:0001',
  ],
};

function requireConfirmed(
  value,
  label,
) {
  const result =
    normalizeConfirmedRocProjection(
      value,
    );

  if (
    result.state !== 'confirmed'
    || result.confirmed !== true
    || result.source !== 'ledger'
    || result.backendDerived !== true
    || result.displayOnly !== true
    || result.amountMinor !== '10000'
    || result.walletMutation !== false
    || result.ledgerMutation !== false
    || result.finalityAuthority !== false
  ) {
    failures.push(
      `${label} did not produce the required confirmed display model`,
    );
  }
}

function requireUnconfirmed(
  value,
  label,
) {
  const result =
    normalizeConfirmedRocProjection(
      value,
    );

  if (
    result.state !== 'unconfirmed'
    || result.confirmed !== false
    || result.amountMinor !== null
  ) {
    failures.push(
      `${label} incorrectly produced confirmed ROC`,
    );
  }
}

requireConfirmed(
  valid,
  'valid receipt projection',
);

requireUnconfirmed(
  {
    ...valid,
    pendingEvidenceOnly: true,
  },
  'pending evidence',
);

requireUnconfirmed(
  {
    ...valid,
    source:
      'micronode_pending_evidence',
  },
  'fake source',
);

requireUnconfirmed(
  {
    ...valid,
    receiptCount: 0,
    operationIds: [],
  },
  'missing receipt',
);

const projectionPath =
  process.env
    .PHASE22_CONFIRMED_ROC_PROJECTION_PATH;

if (projectionPath) {
  if (!existsSync(projectionPath)) {
    failures.push(
      `real projection is missing: ${projectionPath}`,
    );
  } else {
    const real =
      JSON.parse(
        readFileSync(
          projectionPath,
          'utf8',
        ),
      );

    const normalized =
      normalizeConfirmedRocProjection(
        real,
      );

    if (
      normalized.state !== 'confirmed'
      || normalized.confirmed !== true
      || normalized.source !== 'ledger'
      || normalized.backendDerived !== true
      || normalized.displayOnly !== true
      || normalized.amountMinor === null
    ) {
      failures.push(
        'real Phase 22G receipt projection was not accepted by the CrabLink display model',
      );
    }
  }
}

if (failures.length > 0) {
  console.error(
    'Phase 22 confirmed ROC boundary check failed:',
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  'Phase 22 confirmed ROC boundary check passed.',
);

console.log(
  'CrabLink displays confirmed ROC only from wallet/ledger receipt truth after accepted User Node replay; pending evidence remains unconfirmed.',
);
