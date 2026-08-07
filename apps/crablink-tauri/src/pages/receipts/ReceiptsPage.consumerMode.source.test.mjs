import assert from 'node:assert/strict';
import {
  readFileSync,
} from 'node:fs';
import test from 'node:test';

const source =
  readFileSync(
    new URL(
      './ReceiptsPage.jsx',
      import.meta.url,
    ),
    'utf8',
  );

const developerModeSource =
  readFileSync(
    new URL(
      '../../app/developerSurfaceMode.js',
      import.meta.url,
    ),
    'utf8',
  );

const sliceBetween = (
  startNeedle,
  endNeedle,
  fromIndex = 0,
) => {
  const start =
    source.indexOf(
      startNeedle,
      fromIndex,
    );

  const end =
    source.indexOf(
      endNeedle,
      start +
        startNeedle.length,
    );

  assert.ok(
    start >= 0,
    `missing start boundary: ${startNeedle}`,
  );

  assert.ok(
    end > start,
    `missing end boundary: ${endNeedle}`,
  );

  return source.slice(
    start,
    end,
  );
};

const assertDeveloperGated = (
  needle,
) => {
  const index =
    source.indexOf(
      needle,
    );

  assert.ok(
    index >= 0,
    `missing advanced receipt surface: ${needle}`,
  );

  const prefix =
    source.slice(
      Math.max(
        0,
        index - 800,
      ),
      index,
    );

  assert.match(
    prefix,
    /developerSurfaceEnabled\s*&&\s*\(/,
    `${needle} must remain behind Developer Mode`,
  );
};

test('Phase 5A6 marks consumer and developer receipt detail projections', () => {
  assert.match(
    source,
    /FINAL_BETA_PHASE5A6_RECEIPT_ADVANCED_DETAIL_QUARANTINE_V1/,
  );

  assert.match(
    source,
    /data-final-beta-receipts-mode=/,
  );

  assert.match(
    source,
    /data-final-beta-receipt-detail="consumer"/,
  );

  assert.match(
    source,
    /data-final-beta-receipt-detail="developer"/,
  );

  assert.match(
    source,
    /data-final-beta-receipt-detail="developer-json"/,
  );
});

test('Phase 5A6 reuses the shared explicit Developer Mode contract', () => {
  assert.match(
    source,
    /isExplicitDeveloperSurface/,
  );

  assert.match(
    source,
    /buildDev:\s*import\.meta\.env\?\.DEV\s*===\s*true/,
  );

  assert.match(
    source,
    /settings:\s*app\?\.settings/,
  );

  assert.match(
    developerModeSource,
    /FINAL_BETA_PHASE5A1_EXPLICIT_DEVELOPER_SURFACE_V1/,
  );
});

test('Phase 5A6 gates receipt cache administration and raw JSON', () => {
  for (const advanced of [
    'Copy summary',
    'Clear display cache',
    'Developer receipt JSON',
  ]) {
    assertDeveloperGated(
      advanced,
    );
  }
});

test('Phase 5A6 preserves useful receipt details in normal mode', () => {
  const consumer =
    sliceBetween(
      'data-final-beta-receipt-detail="consumer"',
      'data-final-beta-receipt-detail="developer"',
    );

  for (const required of [
    'label="Action"',
    'label="Crab URL"',
    'label="From"',
    'label="To"',
    'label="Txid"',
    'label="Receipt hash"',
    'label="Created"',
    'label="Source"',
    'label="Backend-derived"',
    'label="Display cache"',
  ]) {
    assert.ok(
      consumer.includes(required),
      required,
    );
  }

  for (const forbidden of [
    'label="Nonce"',
    'label="Ledger root"',
    'label="Manifest CID"',
    'label="Root CID"',
    'label="Idempotency"',
    'label="Copy proof"',
    'Developer receipt JSON',
  ]) {
    assert.equal(
      consumer.includes(forbidden),
      false,
      forbidden,
    );
  }
});

test('Phase 5A6 preserves proof anchors and raw detail behind Developer Mode', () => {
  const developer =
    sliceBetween(
      'data-final-beta-receipt-detail="developer"',
      '<footer className="receipts-card-actions">',
    );

  for (const required of [
    'label="Nonce"',
    'label="Asset"',
    'label="Ledger root"',
    'label="Manifest CID"',
    'label="Root CID"',
    'label="Idempotency"',
  ]) {
    assert.ok(
      developer.includes(required),
      required,
    );
  }

  assertDeveloperGated(
    'label="Copy proof"',
  );

  assertDeveloperGated(
    'Developer receipt JSON',
  );
});

test('Phase 5A6 preserves consumer receipt navigation and retry actions', () => {
  for (const required of [
    'Refresh',
    'Refresh display cache',
    'Open Library',
    'crab://library',
    'QuickChain',
    'crab://quickchain',
    'Open route',
    'Copy route',
    'Copy txid',
    'Copy receipt',
  ]) {
    assert.ok(
      source.includes(required),
      required,
    );
  }
});

test('Phase 5A6 adds no receipt, wallet, ledger, or paid-unlock authority', () => {
  assert.doesNotMatch(
    source,
    /\bcallTauri\s*\(|\binvoke\s*\(|XMLHttpRequest/,
  );

  assert.doesNotMatch(
    source,
    /callTauri\s*\(\s*['"][^'"]*(?:wallet|ledger|spend|transfer|mint|burn|unlock)/i,
  );

  assert.doesNotMatch(
    source,
    /paidEntitlement\s*=\s*true|unlockPaidContent\s*\(/,
  );

  assert.match(
    source,
    /Browser-local receipt display cache only/,
  );

  assert.match(
    source,
    /Backend wallet and ledger remain authoritative/,
  );
});
