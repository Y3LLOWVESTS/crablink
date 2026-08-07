import assert from 'node:assert/strict';
import {
  readFileSync,
} from 'node:fs';
import test from 'node:test';

const source =
  readFileSync(
    new URL(
      './ServiceNodeOperatorPage.jsx',
      import.meta.url,
    ),
    'utf8',
  );

const modelSource =
  readFileSync(
    new URL(
      '../../shared/operator/serviceNodeOperatorModel.js',
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

test('Phase 5A5 marks disabled and enabled Operator Mode projections', () => {
  assert.match(
    source,
    /FINAL_BETA_PHASE5A5_EXPLICIT_OPERATOR_MODE_ENTRY_V1/,
  );

  assert.match(
    source,
    /data-final-beta-operator-mode="disabled"/,
  );

  assert.match(
    source,
    /data-final-beta-operator-mode="enabled"/,
  );
});

test('Phase 5A5 keeps Operator Mode disabled by default', () => {
  // FINAL_BETA_PHASE5A5_DEFAULT_OPERATOR_MODEL_TEST_REPAIR_V1
  assert.match(
    modelSource,
    /export\s+const\s+DEFAULT_OPERATOR_CONFIG\s*=\s*Object\.freeze\s*\(\s*\{[\s\S]*?enabled\s*:\s*false/,
  );

  assert.match(
    source,
    /useState\(DEFAULT_OPERATOR_CONFIG\)/,
  );

  assert.match(
    source,
    /if\s*\(\s*!config\.enabled\s*\)/,
  );

  assert.match(
    source,
    /return\s*\(\s*<OperatorModeEntry/,
  );
});

test('Phase 5A5 returns the entry surface before operator controls mount', () => {
  const gateIndex =
    source.indexOf(
      'if (!config.enabled)',
    );

  const entryIndex =
    source.indexOf(
      '<OperatorModeEntry',
      gateIndex,
    );

  const enabledIndex =
    source.indexOf(
      'data-final-beta-operator-mode="enabled"',
    );

  assert.ok(
    gateIndex >= 0,
  );

  assert.ok(
    entryIndex > gateIndex,
  );

  assert.ok(
    enabledIndex > entryIndex,
  );
});

test('Phase 5A5 disabled entry exposes no credential, node, or review controls', () => {
  const entry =
    sliceBetween(
      'function OperatorModeEntry',
      'function value(summary, ...keys)',
    );

  for (const forbidden of [
    'callTauri(',
    'adminToken',
    'type="password"',
    'Service Node admin URL',
    'Administrator credential',
    'Check read-only status',
    'Bind the Service Node reward recipient',
    'Moderation-review queue',
    'PersistenceReviewCard',
  ]) {
    assert.ok(
      !entry.includes(forbidden),
      forbidden,
    );
  }
});

test('Phase 5A5 entry requires explicit activation and preserves Home exit', () => {
  const entry =
    sliceBetween(
      'function OperatorModeEntry',
      'function value(summary, ...keys)',
    );

  assert.match(
    entry,
    /Operator controls are off/,
  );

  assert.match(
    entry,
    />\s*Enable Operator Mode\s*</,
  );

  assert.match(
    entry,
    />\s*Return Home\s*</,
  );

  assert.match(
    entry,
    /crab:\/\/home/,
  );

  assert.match(
    entry,
    /route-memory only/,
  );
});

test('Phase 5A5 preserves the complete operator controller after activation', () => {
  const enabled =
    sliceBetween(
      'data-final-beta-operator-mode="enabled"',
      'function OperatorModeEntry',
    );

  for (const required of [
    'Enable Service Node Operator Mode',
    'Service Node admin URL',
    'Administrator credential',
    'Check read-only status',
    'Bind the Service Node reward recipient',
    'Moderation-review queue',
    '<PersistenceReviewCard',
  ]) {
    assert.ok(
      enabled.includes(required),
      required,
    );
  }

  // FINAL_BETA_PHASE5A5_OPERATOR_HANDLER_BOUNDARY_TEST_REPAIR_V2
  assert.match(
    source,
    /const\s+checkStatus\s*=\s*async\s*\(\s*\)\s*=>\s*\{[\s\S]*?callTauri\s*\(\s*['"]service_node_operator_status['"]\s*,\s*\{\s*request\s*:\s*config\s*\}\s*,[\s\S]*?\);/,
    'page component must retain the read-only Service Node status handler',
  );

  assert.match(
    enabled,
    /onClick=\{checkStatus\}[\s\S]*?Check read-only status/,
    'enabled controller must wire its status button to checkStatus',
  );
});

test('Phase 5A5 disabling clears the route-memory credential without adding authority', () => {
  assert.match(
    source,
    /patch\.enabled\s*===\s*false[\s\S]*\?\s*''/,
  );

  assert.match(
    source,
    /checked=\{config\.enabled\}[\s\S]*enabled:\s*event\.target\.checked/,
  );

  assert.doesNotMatch(
    source,
    /(?:localStorage|sessionStorage|indexedDB|\.setItem\s*\()/,
  );

  assert.doesNotMatch(
    source,
    /callTauri\(\s*['"][^'"]*(?:start|stop|restart|shutdown|mint|burn|transfer)['"]/i,
  );
});
