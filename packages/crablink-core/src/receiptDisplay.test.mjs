import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RECEIPT_DISPLAY_FILTERS,
  buildReceiptProofText,
  countReceiptDisplayGroups,
  filterReceiptDisplayList,
  formatReceiptAmount,
  normalizeReceiptAction,
  normalizeReceiptDisplay,
  normalizeReceiptDisplayList,
  receiptActionLabel,
  receiptDisplayClassName,
  receiptDisplayKey,
  receiptTimestampMillis,
} from './receiptDisplay.js';

function backendReceipt(overrides = {}) {
  return {
    action: 'site_visit',
    title: 'Paid creator visit',
    backendDerived: true,
    displayOnly: true,
    sourceLabel:
      'backend-derived receipt via site_visit',
    paidEntitlementAuthority: false,
    crabUrl: 'crab://creator-page',
    amountMinor: '25',
    amountDisplay: '25 ROC',
    asset: 'roc',
    payer: '@viewer',
    recipient: '@creator',
    txid: 'tx-001',
    receiptHash: 'receipt-001',
    ledgerRoot:
      `b3:${'a'.repeat(64)}`,
    operationId: 'op-001',
    nonce: '7',
    createdAt:
      '2026-07-17T12:00:00.000Z',
    storedAt:
      '2026-07-17T12:00:01.000Z',
    source: 'site_visit',
    storageKey: 'receipt-cache-key',
    ...overrides,
  };
}

test(
  'projects explicit backend receipt metadata into an immutable display-only shape',
  () => {
    const input = backendReceipt({
      secret: 'discard-me',
      raw: {
        bearerToken:
          'discard-me-too',
      },
    });

    const projected =
      normalizeReceiptDisplay(input);

    assert.ok(projected);
    assert.equal(
      projected.schema,
      'crablink.receipt-display.v1',
    );
    assert.equal(
      projected.action,
      'site_visit',
    );
    assert.equal(
      projected.amountDisplay,
      '25 ROC',
    );
    assert.equal(
      projected.backendDerived,
      true,
    );
    assert.equal(
      projected.displayOnly,
      true,
    );
    assert.equal(
      projected.paidEntitlementAuthority,
      false,
    );
    assert.equal(
      projected.secret,
      undefined,
    );
    assert.equal(
      projected.raw,
      undefined,
    );
    assert.equal(
      projected.bearerToken,
      undefined,
    );
    assert.equal(
      Object.isFrozen(projected),
      true,
    );
    assert.equal(
      input.secret,
      'discard-me',
    );
  },
);

test(
  'rejects proof-shaped input unless backend origin is explicit',
  () => {
    assert.equal(
      normalizeReceiptDisplay({
        txid: 'tx-local-only',
        backendDerived: false,
      }),
      null,
    );

    assert.equal(
      normalizeReceiptDisplay({
        txid: 'tx-missing-origin',
      }),
      null,
    );
  },
);

test(
  'rejects explicit backend labels without a receipt proof field',
  () => {
    assert.equal(
      normalizeReceiptDisplay({
        action: 'site_visit',
        backendDerived: true,
        title: 'No proof',
      }),
      null,
    );
  },
);

test(
  'fails closed for oversized or control-character display fields',
  () => {
    const projected =
      normalizeReceiptDisplay(
        backendReceipt({
          title: 'x'.repeat(241),
          sourceLabel: 'unsafe\nlabel',
          txid: 't'.repeat(513),
          receiptHash: 'receipt-safe',
        }),
      );

    assert.ok(projected);
    assert.equal(projected.txid, '');
    assert.equal(
      projected.receiptHash,
      'receipt-safe',
    );
    assert.equal(
      projected.sourceLabel,
      'backend-derived receipt',
    );
    assert.equal(
      projected.title,
      'crab://creator-page',
    );
  },
);

test(
  'normalizes action labels and amount display using existing desktop rules',
  () => {
    assert.equal(
      normalizeReceiptAction(
        'paid site_visit request',
      ),
      'site_visit',
    );
    assert.equal(
      normalizeReceiptAction(
        'Image Publish',
      ),
      'image_publish',
    );
    assert.equal(
      normalizeReceiptAction(
        'wallet transfer',
      ),
      'wallet_transfer',
    );
    assert.equal(
      receiptActionLabel(
        'wallet_transfer',
      ),
      'Wallet Transfer',
    );
    assert.equal(
      formatReceiptAmount(
        '42',
        'roc',
      ),
      '42 ROC',
    );
    assert.equal(
      receiptDisplayClassName(
        'Wallet Transfer',
      ),
      'wallet-transfer',
    );
  },
);

test(
  'sorts receipt displays newest first without mutating the caller list',
  () => {
    const older = backendReceipt({
      txid: 'tx-old',
      receiptHash: 'receipt-old',
      operationId: 'op-old',
      createdAt:
        '2026-07-17T10:00:00.000Z',
    });

    const newer = backendReceipt({
      txid: 'tx-new',
      receiptHash: 'receipt-new',
      operationId: 'op-new',
      createdAt:
        '2026-07-17T11:00:00.000Z',
    });

    const input = [
      older,
      null,
      newer,
    ];

    const snapshot = [...input];

    const normalized =
      normalizeReceiptDisplayList(
        input,
      );

    assert.deepEqual(
      input,
      snapshot,
    );

    assert.deepEqual(
      normalized.map(
        (receipt) => receipt.txid,
      ),
      [
        'tx-new',
        'tx-old',
      ],
    );

    assert.equal(
      Object.isFrozen(normalized),
      true,
    );

    assert.equal(
      Object.isFrozen(normalized[0]),
      true,
    );
  },
);

test(
  'filters and counts receipt groups deterministically',
  () => {
    const receipts = [
      backendReceipt({
        action: 'site_visit',
        txid: 'tx-site',
      }),
      backendReceipt({
        action: 'image_publish',
        txid: 'tx-image',
      }),
      backendReceipt({
        action: 'wallet_hold',
        txid: 'tx-wallet',
      }),
    ];

    assert.deepEqual(
      RECEIPT_DISPLAY_FILTERS.map(
        (filter) => filter.id,
      ),
      [
        'all',
        'site_visit',
        'publishes',
        'wallet',
      ],
    );

    assert.deepEqual(
      countReceiptDisplayGroups(
        receipts,
      ),
      {
        all: 3,
        site_visit: 1,
        publishes: 1,
        wallet: 1,
      },
    );

    assert.equal(
      filterReceiptDisplayList(
        receipts,
        'site_visit',
      ).length,
      1,
    );

    assert.equal(
      filterReceiptDisplayList(
        receipts,
        'publishes',
      ).length,
      1,
    );

    assert.equal(
      filterReceiptDisplayList(
        receipts,
        'wallet',
      ).length,
      1,
    );
  },
);

test(
  'builds bounded proof text from allowlisted display fields only',
  () => {
    const proof =
      buildReceiptProofText(
        backendReceipt({
          bearerToken:
            'must-not-appear',
          sessionSecret:
            'must-not-appear',
        }),
      );

    assert.match(
      proof,
      /action=site_visit/,
    );
    assert.match(
      proof,
      /txid=tx-001/,
    );
    assert.match(
      proof,
      /receipt_hash=receipt-001/,
    );
    assert.doesNotMatch(
      proof,
      /bearerToken/,
    );
    assert.doesNotMatch(
      proof,
      /sessionSecret/,
    );
    assert.doesNotMatch(
      proof,
      /must-not-appear/,
    );
  },
);

test(
  'produces stable keys and timestamp ordering helpers',
  () => {
    const receipt =
      backendReceipt();

    assert.equal(
      receiptDisplayKey(
        receipt,
        3,
      ),
      [
        'receipt-001',
        'tx-001',
        `b3:${'a'.repeat(64)}`,
        'op-001',
        'receipt-cache-key',
        'crab://creator-page',
        '3',
      ].join(':'),
    );

    assert.equal(
      receiptTimestampMillis(
        '1710000000',
      ),
      1_710_000_000_000,
    );

    assert.equal(
      receiptTimestampMillis(
        'not-a-time',
      ),
      0,
    );
  },
);
