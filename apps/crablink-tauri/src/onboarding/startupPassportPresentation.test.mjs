import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  projectStartupPassportPresentation,
} from './startupPassportPresentation.js';

const gateSource = readFileSync(
  new URL('./StartupPassportUnlockGate.jsx', import.meta.url),
  'utf8',
);

test('Phase 4A4 presents startup checking in consumer language', () => {
  const view = projectStartupPassportPresentation({
    gateState: 'checking',
    code: 'checking',
  });

  assert.equal(view.title, 'Checking Passport security');
  assert.equal(view.accessLabel, 'Checking');
  assert.equal(view.action, 'none');
});

test('Phase 4A4 presents cancelled and rejected unlocks honestly', () => {
  const cancelled = projectStartupPassportPresentation({
    gateState: 'blocked',
    code: 'cancelled',
  });

  const rejected = projectStartupPassportPresentation({
    gateState: 'blocked',
    code: 'unlock_rejected',
  });

  assert.equal(cancelled.title, 'Passport remains locked');
  assert.equal(cancelled.passportLabel, 'Unlock cancelled');
  assert.equal(cancelled.action, 'retry');

  assert.equal(rejected.title, 'Passport remains locked');
  assert.equal(rejected.passportLabel, 'Unlock not accepted');
  assert.equal(rejected.action, 'retry');
});

test('Phase 4A4 distinguishes missing Passport custody from unlock failure', () => {
  const view = projectStartupPassportPresentation({
    gateState: 'blocked',
    code: 'no_passport',
  });

  assert.equal(view.title, 'Local Passport not found');
  assert.equal(view.accessLabel, 'Setup required');
  assert.equal(view.passportLabel, 'Not found');
  assert.equal(view.action, 'reset');
  assert.equal(view.actionLabel, 'Return to Passport setup');
});

test('Phase 4A4 removes raw gate labels from normal presentation', () => {
  const advancedIndex = gateSource.indexOf(
    'title="Advanced startup details"',
  );

  assert.ok(advancedIndex > 0);

  const normalSurface = gateSource.slice(0, advancedIndex);

  assert.match(normalSurface, /CrabLink access/);
  assert.match(normalSurface, /Local Passport/);
  assert.match(normalSurface, /presentation\.accessLabel/);
  assert.match(normalSurface, /presentation\.passportLabel/);

  assert.doesNotMatch(normalSurface, /<dt>Gate state<\/dt>/);
  assert.doesNotMatch(normalSurface, /<dt>Redacted result<\/dt>/);
  assert.doesNotMatch(normalSurface, /\{gateReview\.gateState\}/);
  assert.doesNotMatch(normalSurface, /\{gateReview\.code\}/);
});

test('Phase 4A4 preserves redacted diagnostics behind collapsed Advanced', () => {
  const advancedIndex = gateSource.indexOf(
    'title="Advanced startup details"',
  );

  const advancedSurface = gateSource.slice(advancedIndex);

  assert.match(advancedSurface, /<dt>Gate state<\/dt>/);
  assert.match(advancedSurface, /\{gateReview\.gateState\}/);
  assert.match(advancedSurface, /<dt>Result code<\/dt>/);
  assert.match(advancedSurface, /\{gateReview\.code\}/);
});

test('Phase 4A4 preserves automatic native-only startup unlock behavior', () => {
  assert.match(
    gateSource,
    /useEffect\(\(\) => \{\s*void runAttempt\(\);\s*\}, \[runAttempt\]\);/s,
  );

  assert.match(
    gateSource,
    /beginSharedStartupUnlockAttempt/,
  );

  assert.match(
    gateSource,
    /readStatus:\s*readNativePassportStatus/,
  );

  assert.match(
    gateSource,
    /unlockOperational:\s*unlockNativePassportOperational/,
  );

  assert.match(
    gateSource,
    /forceNewAttempt:\s*true/,
  );

  assert.doesNotMatch(gateSource, /<input\b/i);
  assert.doesNotMatch(gateSource, /\binvoke\s*\(/);
  assert.doesNotMatch(gateSource, /type=["']password["']/i);
  assert.doesNotMatch(gateSource, /recoveryWords|seedPhrase/);
});
