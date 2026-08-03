import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const drawerSource = readFileSync(
  new URL('./PassportDrawer.jsx', import.meta.url),
  'utf8',
);

const summarySource = readFileSync(
  new URL('./PassportSummary.jsx', import.meta.url),
  'utf8',
);

const disclosureSource = readFileSync(
  new URL('../../shared/components/DeveloperDisclosure.jsx', import.meta.url),
  'utf8',
);

test('Phase 4A3 marks the Passport drawer as consumer mode', () => {
  assert.match(
    drawerSource,
    /FINAL_BETA_PHASE4A3_PASSPORT_DRAWER_CONSUMER_MODE_V1/,
  );

  assert.match(
    summarySource,
    /FINAL_BETA_PHASE4A3_PASSPORT_DRAWER_CONSUMER_MODE_V1/,
  );

  assert.match(
    drawerSource,
    /data-final-beta-passport-mode=/,
  );
});

test('Phase 4A3 gives normal users concise identity and account status', () => {
  const advancedIndex = summarySource.indexOf(
    'title="Advanced Passport details"',
  );

  assert.ok(advancedIndex > 0);

  const normalSummary = summarySource.slice(0, advancedIndex);

  assert.match(normalSummary, /aria-label="Passport overview"/);
  assert.match(normalSummary, /aria-label="Passport account status"/);
  assert.match(normalSummary, /label="Account"/);
  assert.match(normalSummary, /label="ROC"/);
  assert.match(normalSummary, /label="Profile"/);
  assert.match(normalSummary, /label="Identity"/);
  assert.match(normalSummary, /label="Username"/);
  assert.match(normalSummary, /label="Balance status"/);

  assert.doesNotMatch(normalSummary, /label="Passport subject"/);
  assert.doesNotMatch(normalSummary, /label="Profile CID"/);
  assert.doesNotMatch(normalSummary, /label="Extension origin"/);
  assert.doesNotMatch(normalSummary, /label="Identity source"/);
  assert.doesNotMatch(normalSummary, /label="Wallet source"/);
});

test('Phase 4A3 quarantines identifiers and network diagnostics', () => {
  const advancedIndex = summarySource.indexOf(
    'title="Advanced Passport details"',
  );

  const advancedSummary = summarySource.slice(advancedIndex);

  assert.match(
    advancedSummary,
    /data-passport-developer-facts="quarantined"/,
  );

  for (const label of [
    'Passport subject',
    'Wallet account',
    'Profile CID',
    'Extension origin',
    'Identity refresh',
    'Wallet refresh',
    'Identity source',
    'Wallet source',
  ]) {
    assert.match(
      advancedSummary,
      new RegExp(`label="${label}"`),
    );
  }
});

test('Phase 4A3 makes device security understandable in normal mode', () => {
  const advancedIndex = drawerSource.indexOf(
    'title="Advanced Passport controls"',
  );

  assert.ok(advancedIndex > 0);

  const normalDeviceSurface = drawerSource.slice(0, advancedIndex);

  assert.match(normalDeviceSurface, /Device security/);
  assert.match(normalDeviceSurface, /Desktop protection/);
  assert.match(normalDeviceSurface, /Passport state/);
  assert.match(normalDeviceSurface, /Refresh device status/);
  assert.match(normalDeviceSurface, /Create local Passport/);
  assert.match(normalDeviceSurface, /Unlock Passport/);
  assert.match(normalDeviceSurface, /Recovery and export/);
  assert.match(normalDeviceSurface, /native-only/);

  assert.doesNotMatch(normalDeviceSurface, /Confirm root action/);
  assert.doesNotMatch(normalDeviceSurface, /Clear local Passport/);
  assert.doesNotMatch(normalDeviceSurface, /Native Passport status truth/);
  assert.doesNotMatch(normalDeviceSurface, /Native Passport manual acceptance/);
});

test('Phase 4A3 preserves advanced native evidence and destructive controls', () => {
  const advancedIndex = drawerSource.indexOf(
    'title="Advanced Passport controls"',
  );

  const advancedSurface = drawerSource.slice(advancedIndex);

  assert.match(advancedSurface, /Confirm root action/);
  assert.match(advancedSurface, /Clear local Passport/);
  assert.match(advancedSurface, /Native Passport status truth/);
  assert.match(advancedSurface, /Last native command truth/);
  assert.match(advancedSurface, /Native Passport manual acceptance/);

  assert.match(
    advancedSurface,
    /runNativePassportCommand\(confirmNativePassportRoot, 'root confirm'\)/,
  );

  assert.match(
    advancedSurface,
    /runNativePassportCommand\(clearNativePassport, 'clear'\)/,
  );
});

test('Phase 4A3 keeps proof and QuickChain pages behind Advanced', () => {
  const quickLinksStart = drawerSource.indexOf(
    'aria-label="Passport quick links"',
  );

  const advancedPagesStart = drawerSource.indexOf(
    'title="Advanced account pages"',
  );

  assert.ok(quickLinksStart > 0);
  assert.ok(advancedPagesStart > quickLinksStart);

  const consumerPages = drawerSource.slice(
    quickLinksStart,
    advancedPagesStart,
  );

  const advancedPages = drawerSource.slice(advancedPagesStart);

  assert.match(consumerPages, /Profile Studio/);
  assert.match(consumerPages, /crab:\/\/library/);
  assert.match(consumerPages, /crab:\/\/receipts/);

  assert.doesNotMatch(consumerPages, /Text proof/);
  assert.doesNotMatch(consumerPages, />QuickChain</);

  assert.match(advancedPages, /Text proof/);
  assert.match(advancedPages, />\s*QuickChain\s*</);
  assert.match(advancedPages, /crab:\/\/text/);
  assert.match(advancedPages, /crab:\/\/quickchain/);
});

test('Phase 4A3 disclosures remain collapsed and add no authority', () => {
  assert.match(disclosureSource, /<details/);
  assert.match(disclosureSource, /open = false/);

  assert.doesNotMatch(drawerSource, /callTauri|invoke\(/);
  assert.doesNotMatch(drawerSource, /type=["']password["']/i);
  assert.doesNotMatch(drawerSource, /type=["']pin["']/i);
  assert.doesNotMatch(drawerSource, /seedPhrase|recoveryWords/);
  assert.doesNotMatch(summarySource, /callTauri|invoke\(/);
});
