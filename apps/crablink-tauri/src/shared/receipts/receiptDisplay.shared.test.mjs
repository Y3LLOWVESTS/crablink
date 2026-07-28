import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReceiptProofText,
  countReceiptDisplayGroups,
  normalizeReceiptDisplay,
  normalizeReceiptDisplayList,
} from '../../../../../packages/crablink-core/src/index.js';

import {
  normalizeReceipt,
} from './recentReceipts.js';

const LEDGER_ROOT =
  `b3:${'c'.repeat(64)}`;

function desktopBackendReceipt(
  overrides = {},
) {
  return normalizeReceipt(
    {
      action: 'paid_site_visit',
      crab_url:
        'crab://creator-page',
      amount_minor: '15',
      asset: 'roc',
      wallet_receipt: {
        txid:
          'desktop-tx-001',
        receipt_hash:
          'desktop-receipt-001',
        ledger_root:
          LEDGER_ROOT,
        operation_id:
          'desktop-op-001',
        nonce: '9',
      },
      created_at:
        '2026-07-17T12:00:00.000Z',
      secret:
        'must-not-survive-display-projection',
      ...overrides,
    },
    {
      source:
        'desktop_site_visit',
    },
  );
}

test(
  'desktop receipt normalization feeds the shared display projection',
  () => {
    const normalized =
      desktopBackendReceipt();

    const projected =
      normalizeReceiptDisplay(
        normalized,
      );

    assert.ok(projected);
    assert.equal(
      projected.action,
      'site_visit',
    );
    assert.equal(
      projected.amountDisplay,
      '15 ROC',
    );
    assert.equal(
      projected.txid,
      'desktop-tx-001',
    );
    assert.equal(
      projected.receiptHash,
      'desktop-receipt-001',
    );
    assert.equal(
      projected.ledgerRoot,
      LEDGER_ROOT,
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
      projected.raw,
      undefined,
    );
    assert.equal(
      projected.secret,
      undefined,
    );
  },
);

test(
  'desktop receipt display list rejects non-backend display hints',
  () => {
    const projected =
      normalizeReceiptDisplayList([
        desktopBackendReceipt(),
        {
          action: 'site_visit',
          txid: 'local-hint',
          backendDerived: false,
        },
      ]);

    assert.equal(
      projected.length,
      1,
    );

    assert.equal(
      projected[0].txid,
      'desktop-tx-001',
    );
  },
);

test(
  'desktop receipt grouping and proof text use shared behavior',
  () => {
    const receipts = [
      desktopBackendReceipt(),
      desktopBackendReceipt({
        action: 'image_publish',
        wallet_receipt: {
          txid:
            'desktop-tx-002',
          receipt_hash:
            'desktop-receipt-002',
          ledger_root:
            LEDGER_ROOT,
          operation_id:
            'desktop-op-002',
        },
      }),
    ];

    assert.deepEqual(
      countReceiptDisplayGroups(
        receipts,
      ),
      {
        all: 2,
        site_visit: 1,
        publishes: 1,
        wallet: 0,
      },
    );

    const proof =
      buildReceiptProofText(
        receipts[0],
      );

    assert.match(
      proof,
      /txid=desktop-tx-001/,
    );

    assert.match(
      proof,
      /receipt_hash=desktop-receipt-001/,
    );

    assert.doesNotMatch(
      proof,
      /must-not-survive/,
    );
  },
);
