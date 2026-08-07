import assert from 'node:assert/strict';
import {
  readFileSync,
} from 'node:fs';

import test from 'node:test';

const source =
  readFileSync(
    new URL(
      './HomeQuickActions.jsx',
      import.meta.url,
    ),
    'utf8',
  );

test('Phase 5A1 marks the route-smoke dashboard as quarantined', () => {
  assert.match(
    source,
    /FINAL_BETA_PHASE5A1_ROUTE_SMOKE_QUARANTINE_V1/,
  );

  assert.match(
    source,
    /isExplicitDeveloperSurface/,
  );
});

test('Phase 5A1 requires build DEV and explicit settings devMode', () => {
  assert.match(
    source,
    /buildDev:\s*import\.meta\.env\?\.DEV\s*===\s*true/,
  );

  assert.match(
    source,
    /settings:\s*app\?\.settings/,
  );
});

test('Phase 5A1 returns no route-smoke presentation in normal mode', () => {
  const gateIndex =
    source.indexOf(
      'if (!developerSurfaceEnabled)',
    );

  // FINAL_BETA_PHASE5A1_MULTILINE_SECTION_TEST_REPAIR_V2
  const presentationIndex =
    source.indexOf(
      'data-final-beta-developer-surface=',
    );

  assert.ok(
    gateIndex >= 0,
  );

  assert.ok(
    presentationIndex >
      gateIndex,
  );

  const gateSource =
    source.slice(
      gateIndex,
      presentationIndex,
    );

  assert.match(
    gateSource,
    /return null;/,
  );
});

test('Phase 5A1 preserves engineering tools behind the explicit gate', () => {
  for (const required of [
    'Route quick actions',
    'Built-in crab:// routes',
    'Copy smoke list',
    'Copy HTTP fallback',
    'crab://quickchain',
    'crab://operator',
    'crab://text',
  ]) {
    assert.ok(
      source.includes(required),
      required,
    );
  }
});

test('Phase 5A1 route-smoke tooling remains navigation and copy only', () => {
  assert.match(
    source,
    /app\.navigate\(crabRoute\)/,
  );

  assert.match(
    source,
    /navigator\.clipboard\.writeText/,
  );

  assert.doesNotMatch(
    source,
    /\binvoke\s*\(/,
  );

  assert.doesNotMatch(
    source,
    /\bcallTauri\s*\(/,
  );

  assert.doesNotMatch(
    source,
    /walletMutation|ledgerMutation|mintRoc|issueReceipt/,
  );
});
