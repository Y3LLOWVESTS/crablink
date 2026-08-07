import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const libraryPath = path.join(
  ROOT,
  'pages/library/LibraryPage.jsx',
);

const source = fs.readFileSync(
  libraryPath,
  'utf8',
);

const sliceBetween = (startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);

  assert.ok(
    start >= 0,
    `missing start boundary: ${startNeedle}`,
  );

  assert.ok(
    end > start,
    `missing end boundary: ${endNeedle}`,
  );

  return source.slice(start, end);
};

test('Phase 5A3 marks Library engineering quarantine and reuses the shared gate', () => {
  assert.match(
    source,
    /FINAL_BETA_PHASE5A3_LIBRARY_ENGINEERING_QUARANTINE_V1/,
  );

  assert.match(
    source,
    /isExplicitDeveloperSurface/,
  );
});

test('Phase 5A3 requires development build and explicit settings devMode', () => {
  assert.match(
    source,
    /buildDev:\s*import\.meta\.env\?\.DEV\s*===\s*true/,
  );

  assert.match(
    source,
    /settings:\s*app\?\.settings/,
  );
});

test('Phase 5A3 gives normal Library a consumer header and actions', () => {
  assert.match(
    source,
    /title=\{developerSurfaceEnabled\s*\?\s*'Local Proof Library'\s*:\s*'Your Library'\}/s,
  );

  assert.match(
    source,
    /saved on this device/,
  );

  assert.match(
    source,
    /display only/,
  );

  const actions = sliceBetween(
    '<div className="cl-library-header-actions">',
    '</div>\n        }',
  );

  assert.match(
    actions,
    />\s*Refresh\s*</,
  );

  assert.match(
    actions,
    />\s*Receipts\s*</,
  );

  assert.match(
    actions,
    /developerSurfaceEnabled[\s\S]*Text proof[\s\S]*Copy diagnostic summary/,
  );
});

test('Phase 5A3 hides manifests and resets a stale manifest tab in normal mode', () => {
  assert.match(
    source,
    /TABS\.filter\(\(tab\)\s*=>\s*tab\.id\s*!==\s*'manifests'\)/,
  );

  assert.match(
    source,
    /!developerSurfaceEnabled\s*&&\s*activeTab\s*===\s*'manifests'[\s\S]*setActiveTab\('all'\)/,
  );

  assert.match(
    source,
    /visibleTabs\.map/,
  );
});

test('Phase 5A3 keeps proof dashboards, cache reset, and raw JSON developer-only', () => {
  assert.match(
    source,
    /developerSurfaceEnabled\s*&&[\s\S]*data-final-beta-library-developer-surface/,
  );

  assert.match(
    source,
    /developerSurfaceEnabled\s*&&[\s\S]*Clear display caches/,
  );

  assert.match(
    source,
    /developerSurfaceEnabled\s*&&[\s\S]*Developer library JSON/,
  );
});

test('Phase 5A3 keeps text proof and QuickChain diagnostics developer-only', () => {
  assert.match(
    source,
    /developerSurfaceEnabled\s*&&[\s\S]*data-final-beta-library-text-proof="developer-only"/,
  );

  assert.match(
    source,
    /data-final-beta-library-text-proof="developer-only"[\s\S]*Open text proof[\s\S]*QuickChain gate/,
  );
});

test('Phase 5A3 hides raw card identifiers and proof copying in normal mode', () => {
  const card = sliceBetween(
    'function LibraryCard(',
    'function LibraryFact(',
  );

  assert.match(
    card,
    /const visibleProof = developerSurfaceEnabled \? proof : '';/,
  );

  assert.match(
    card,
    /const detailLabel = developerSurfaceEnabled/,
  );

  assert.match(
    card,
    /developerSurfaceEnabled\s*&&[\s\S]*label="CID"[\s\S]*label="Proof"[\s\S]*label="Source"/,
  );

  assert.match(
    card,
    /developerSurfaceEnabled\s*&&[\s\S]*label="Copy proof"/,
  );

  assert.match(
    card,
    /label="Copy route"/,
  );
});

test('Phase 5A3 preserves consumer Library navigation without adding authority', () => {
  for (const route of [
    'crab://receipts',
    'crab://post',
    'crab://comment',
    'crab://article',
    'crab://image',
  ]) {
    assert.match(
      source,
      new RegExp(
        route.replaceAll('/', '\\/'),
      ),
    );
  }

  assert.doesNotMatch(
    source,
    /\binvoke\s*\(|\bcallTauri\s*\(/,
  );

  assert.doesNotMatch(
    source,
    /followMutation|walletMutation|ledgerMutation|mint|burn|transfer/,
  );
});
