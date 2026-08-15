import assert from 'node:assert/strict';
import {
  readFileSync,
} from 'node:fs';

import test from 'node:test';

const source =
  readFileSync(
    new URL(
      './HomePage.jsx',
      import.meta.url,
    ),
    'utf8',
  );

test('Phase 5A2 marks Home consumer and developer projections', () => {
  assert.match(
    source,
    /FINAL_BETA_PHASE5A2_HOME_CONSUMER_MODE_V1/,
  );

  assert.match(
    source,
    /data-final-beta-home-mode="consumer"/,
  );

  assert.match(
    source,
    /data-final-beta-home-mode="developer"/,
  );
});

test('Phase 5A2 uses the shared explicit developer-mode contract', () => {
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

test('Phase 5A2 returns consumer Home before the engineering dashboard', () => {
  const gateIndex =
    source.indexOf(
      'if (!developerSurfaceEnabled)',
    );

  const consumerIndex =
    source.indexOf(
      '<ConsumerHome',
      gateIndex,
    );

  const developerIndex =
    source.indexOf(
      'data-final-beta-home-mode="developer"',
    );

  assert.ok(
    gateIndex >= 0,
  );

  assert.ok(
    consumerIndex >
      gateIndex,
  );

  assert.ok(
    developerIndex >
      consumerIndex,
  );

  assert.match(
    source.slice(
      gateIndex,
      developerIndex,
    ),
    /return\s*\(\s*<ConsumerHome/,
  );
});

test('Phase 5A2 normal Home contains no engineering dashboard copy', () => {
  const start =
    source.indexOf(
      'function ConsumerHome(',
    );

  const end =
    source.indexOf(
      'function onboardingIdentityLabel',
      start,
    );

  assert.ok(
    start >= 0 &&
      end > start,
  );

  const consumer =
    source.slice(
      start,
      end,
    );

  assert.doesNotMatch(
    consumer,
    /Route Smoke Dashboard/,
  );

  assert.doesNotMatch(
    consumer,
    /Manual smoke sequence/,
  );

  assert.doesNotMatch(
    consumer,
    /Current local proof anchors/,
  );

  assert.doesNotMatch(
    consumer,
    /gateway-only/,
  );
});

test('Phase 9A12 normal Home consumes reviewed local-first following feed truth', () => {
  assert.match(
    source,
    /FINAL_BETA_PHASE9A12_HOME_FEED_CONSUMER_WIRING_V1/,
  );

  assert.match(
    source,
    /refreshLocalFollowingFeed/,
  );

  assert.match(
    source,
    /loadOfflineLocalFollowingFeed/,
  );

  assert.match(
    source,
    /FeedCard/,
  );

  assert.match(
    source,
    /Chronological/,
  );

  assert.match(
    source,
    /Following only/,
  );

  assert.match(
    source,
    /Public timelines/,
  );

  assert.match(
    source,
    /complete following list/,
  );
});

test('Phase 5A2 preserves useful consumer routes and the gated engineering dashboard', () => {
  for (const route of [
    'profile',
    'explore',
    'receipts',
    'library',
    'post',
    'image',
  ]) {
    const routePattern =
      new RegExp(
        `open\\(\\s*['"]crab:\\/\\/${route}['"]\\s*,?\\s*\\)`,
      );

    assert.match(
      source,
      routePattern,
      `missing consumer route: crab://${route}`,
    );
  }

  for (const required of [
    'title="Engineering Dashboard"',
    '<HomeQuickActions',
    'Manual smoke sequence',
  ]) {
    assert.ok(
      source.includes(required),
      required,
    );
  }

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
    /followMutation|walletMutation|ledgerMutation/,
  );
});
