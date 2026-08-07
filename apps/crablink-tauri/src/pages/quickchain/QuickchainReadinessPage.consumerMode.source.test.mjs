import assert from 'node:assert/strict';
import {
  readFileSync,
} from 'node:fs';
import test from 'node:test';

const source =
  readFileSync(
    new URL(
      './QuickchainReadinessPage.jsx',
      import.meta.url,
    ),
    'utf8',
  );

const sliceBetween = (
  startNeedle,
  endNeedle,
) => {
  const start =
    source.indexOf(
      startNeedle,
    );

  const end =
    source.indexOf(
      endNeedle,
      start,
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

test('Phase 5A4 marks QuickChain consumer and developer projections', () => {
  assert.match(
    source,
    /FINAL_BETA_PHASE5A4_QUICKCHAIN_ENGINEERING_QUARANTINE_V1/,
  );

  assert.match(
    source,
    /data-final-beta-quickchain-mode="consumer"/,
  );

  assert.match(
    source,
    /data-final-beta-quickchain-mode="developer"/,
  );
});

test('Phase 5A4 reuses the shared explicit developer-mode contract', () => {
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
});

test('Phase 5A4 returns simple status before mounting the engineering dashboard', () => {
  const wrapper =
    sliceBetween(
      'export default function QuickchainReadinessPage',
      'function QuickchainDeveloperDashboard',
    );

  assert.match(
    wrapper,
    /if\s*\(\s*!developerSurfaceEnabled\s*\)/,
  );

  assert.match(
    wrapper,
    /return\s*\(\s*<QuickchainConsumerStatus/,
  );

  assert.match(
    wrapper,
    /<QuickchainDeveloperDashboard/,
  );
});

test('Phase 5A4 normal QuickChain contains no engineering dashboard details', () => {
  const consumer =
    sliceBetween(
      'function QuickchainConsumerStatus',
      'function ProgressCard',
    );

  for (const forbidden of [
    'Current local proof anchors',
    'Developer readiness JSON',
    'cargo test -p',
    'MILESTONES',
    'PHASE2_REPLAY_BOUNDARY',
    'PHASE5_ANCHOR_BOUNDARY',
    'Copy proof',
  ]) {
    assert.ok(
      !consumer.includes(forbidden),
      forbidden,
    );
  }
});

test('Phase 5A4 normal QuickChain preserves simple status and useful routes', () => {
  const consumer =
    sliceBetween(
      'function QuickchainConsumerStatus',
      'function ProgressCard',
    );

  assert.match(
    consumer,
    /ENGINEERING DETAILS HIDDEN/,
  );

  assert.match(
    consumer,
    /BACKEND RECEIPTS/,
  );

  assert.match(
    consumer,
    /Developer Mode required/,
  );

  assert.match(
    consumer,
    /crab:\/\/receipts/,
  );

  assert.match(
    consumer,
    /crab:\/\/home/,
  );
});

test('Phase 5A4 preserves the complete engineering dashboard behind the gate', () => {
  const developer =
    sliceBetween(
      'function QuickchainDeveloperDashboard',
      'function QuickchainConsumerStatus',
    );

  for (const required of [
    'Current local proof anchors',
    'Developer readiness JSON',
    'MILESTONES',
    'PHASE2_REPLAY_BOUNDARY',
    'PHASE5_ANCHOR_BOUNDARY',
  ]) {
    assert.ok(
      developer.includes(required),
      required,
    );
  }

  // FINAL_BETA_PHASE5A4_MODULE_LEVEL_TEST_COMMAND_REPAIR_V1
  assert.match(
    developer,
    /text_route_contracts:\s*TEXT_ROUTE_CONTRACTS/,
    'gated developer JSON must retain the text route contract table',
  );

  for (const command of [
    'cargo test -p omnigate --test text_asset_publish',
    'cargo test -p omnigate --test comment_asset_publish',
    'cargo test -p omnigate --test article_asset_publish',
  ]) {
    assert.ok(
      source.includes(command),
      command,
    );
  }
});

test('Phase 5A4 adds no QuickChain or economic authority', () => {
  assert.doesNotMatch(
    source,
    /\bcallTauri\s*\(|\binvoke\s*\(|\bfetch\s*\(|XMLHttpRequest/,
  );

  assert.doesNotMatch(
    source,
    /walletMutation\s*:\s*true|ledgerMutation\s*:\s*true|unlock\s*:\s*true/,
  );

  assert.doesNotMatch(
    source,
    /\/quickchain\/(?:root|proof|checkpoint|validator|committee|quorum|finality|settlement|bridge|anchor)/,
  );
});
