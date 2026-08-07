import assert from 'node:assert/strict';
import {
  readFileSync,
} from 'node:fs';
import test from 'node:test';

import {
  getDeveloperSurfacePosture,
  isExplicitDeveloperSurface,
} from './developerSurfaceMode.js';

import {
  isExplicitPassportDrawerDevSurface,
} from './shell/passportDrawerDevGate.js';

export const FINAL_BETA_PHASE5_DEVELOPER_QUARANTINE_CLOSEOUT_ACCEPTANCE =
  'FINAL_BETA_PHASE5_DEVELOPER_QUARANTINE_CLOSEOUT_ACCEPTANCE_V1';

const read = (
  relativePath,
) =>
  readFileSync(
    new URL(
      relativePath,
      import.meta.url,
    ),
    'utf8',
  );

const developerMode =
  read(
    './developerSurfaceMode.js',
  );

const advancedMenu =
  read(
    './shell/ShellAdvancedMenu.jsx',
  );

const navigation =
  read(
    './shell/shellNavigation.js',
  );

const routeGate =
  read(
    '../onboarding/OnboardingRouteGate.jsx',
  );

const signedAcceptanceTest =
  read(
    '../onboarding/signedUsernameAcceptanceFlag.test.mjs',
  );

const homeActions =
  read(
    '../pages/home/HomeQuickActions.jsx',
  );

const homePage =
  read(
    '../pages/home/HomePage.jsx',
  );

const library =
  read(
    '../pages/library/LibraryPage.jsx',
  );

const quickchain =
  read(
    '../pages/quickchain/QuickchainReadinessPage.jsx',
  );

const operator =
  read(
    '../pages/operator/ServiceNodeOperatorPage.jsx',
  );

const operatorModel =
  read(
    '../shared/operator/serviceNodeOperatorModel.js',
  );

const receipts =
  read(
    '../pages/receipts/ReceiptsPage.jsx',
  );

test('Phase 5 closeout marker is locked', () => {
  assert.equal(
    FINAL_BETA_PHASE5_DEVELOPER_QUARANTINE_CLOSEOUT_ACCEPTANCE,
    'FINAL_BETA_PHASE5_DEVELOPER_QUARANTINE_CLOSEOUT_ACCEPTANCE_V1',
  );
});

test('Phase 5 Developer Mode is explicit and release-fail-closed', () => {
  assert.equal(
    isExplicitDeveloperSurface(),
    false,
  );

  assert.equal(
    isExplicitDeveloperSurface({
      buildDev: true,
      settings: {},
    }),
    false,
  );

  assert.equal(
    isExplicitDeveloperSurface({
      buildDev: false,
      settings: {
        devMode: true,
      },
    }),
    false,
  );

  assert.equal(
    isExplicitDeveloperSurface({
      buildDev: true,
      settings: {
        devMode: true,
      },
    }),
    true,
  );

  const releasePosture =
    getDeveloperSurfacePosture({
      buildDev: false,
      settings: {
        devMode: true,
      },
    });

  assert.equal(
    releasePosture.enabled,
    false,
  );

  assert.equal(
    releasePosture.releaseVisible,
    false,
  );

  assert.match(
    developerMode,
    /FINAL_BETA_PHASE5A1_EXPLICIT_DEVELOPER_SURFACE_V1/,
  );
});

test('Phase 5 Advanced menu explicitly owns diagnostics and direct engineering routes', () => {
  assert.match(
    advancedMenu,
    /FINAL_BETA_PHASE3A3_ADVANCED_SURFACE_QUARANTINE_V1/,
  );

  for (const required of [
    'Network inspection',
    'context.checkGateway',
    'context.checkLocalNode',
    'Local node',
  ]) {
    assert.ok(
      advancedMenu.includes(required),
      required,
    );
  }

  for (const required of [
    "label: 'Receipts'",
    "route: 'crab://receipts'",
    "label: 'Node operator'",
    "route: 'crab://operator'",
    "label: 'QuickChain'",
    "route: 'crab://quickchain'",
    "label: 'Interface diagnostics'",
    "route: 'crab://text'",
  ]) {
    assert.ok(
      navigation.includes(required),
      required,
    );
  }
});

test('Phase 5 normal Home does not own the route-smoke engineering dashboard', () => {
  assert.match(
    homeActions,
    /FINAL_BETA_PHASE5A1_ROUTE_SMOKE_QUARANTINE_V1/,
  );

  assert.match(
    homeActions,
    /isExplicitDeveloperSurface/,
  );

  assert.match(
    homePage,
    /isExplicitDeveloperSurface/,
  );

  assert.match(
    homePage,
    /Following/,
  );

  assert.match(
    homePage,
    /crab:\/\/explore/,
  );
});

test('Phase 5 Library and QuickChain engineering details remain gated', () => {
  assert.match(
    library,
    /FINAL_BETA_PHASE5A3_LIBRARY_ENGINEERING_QUARANTINE_V1/,
  );

  assert.match(
    library,
    /isExplicitDeveloperSurface/,
  );

  assert.match(
    quickchain,
    /FINAL_BETA_PHASE5A4_QUICKCHAIN_ENGINEERING_QUARANTINE_V1/,
  );

  assert.match(
    quickchain,
    /data-final-beta-quickchain-mode="consumer"/,
  );

  assert.match(
    quickchain,
    /data-final-beta-quickchain-mode="developer"/,
  );
});

test('Phase 5 Operator Mode is disabled by default and requires explicit activation', () => {
  assert.match(
    operator,
    /FINAL_BETA_PHASE5A5_EXPLICIT_OPERATOR_MODE_ENTRY_V1/,
  );

  assert.match(
    operatorModel,
    /enabled\s*:\s*false/,
  );

  assert.match(
    operator,
    /if\s*\(\s*!config\.enabled\s*\)/,
  );

  assert.match(
    operator,
    /data-final-beta-operator-mode="disabled"/,
  );

  assert.match(
    operator,
    /data-final-beta-operator-mode="enabled"/,
  );

  assert.match(
    operator,
    />\s*Enable Operator Mode\s*</,
  );
});

test('Phase 5 receipts preserve consumer detail while quarantining proof tooling', () => {
  assert.match(
    receipts,
    /FINAL_BETA_PHASE5A6_RECEIPT_ADVANCED_DETAIL_QUARANTINE_V1/,
  );

  assert.match(
    receipts,
    /data-final-beta-receipts-mode=/,
  );

  assert.match(
    receipts,
    /data-final-beta-receipt-detail="consumer"/,
  );

  assert.match(
    receipts,
    /data-final-beta-receipt-detail="developer"/,
  );

  assert.match(
    receipts,
    /developerSurfaceEnabled\s*&&\s*\(/,
  );

  for (const consumerDetail of [
    'label="Amount"',
    'label="Action"',
    'label="Crab URL"',
    'label="Txid"',
    'label="Receipt hash"',
  ]) {
    assert.ok(
      receipts.includes(
        consumerDetail,
      ),
      consumerDetail,
    );
  }
});

test('Phase 5 Passport fixtures use the shared explicit Developer Mode contract', () => {
  const cases = [
    {
      buildDev: false,
      settings: {},
    },
    {
      buildDev: true,
      settings: {},
    },
    {
      buildDev: false,
      settings: {
        devMode: true,
      },
    },
    {
      buildDev: true,
      settings: {
        devMode: true,
      },
    },
  ];

  for (const value of cases) {
    assert.equal(
      isExplicitPassportDrawerDevSurface(
        value,
      ),
      isExplicitDeveloperSurface(
        value,
      ),
    );
  }
});

test('Phase 5 development bypasses are not visible in an ordinary release build', () => {
  assert.match(
    routeGate,
    /DEV_OVERRIDE_AVAILABLE\s*=\s*Boolean\s*\(\s*import\.meta\.env\.DEV\s*\)/,
  );

  assert.match(
    routeGate,
    /VITE_CRABLINK_SIGNED_ONBOARDING_ACCEPTANCE/,
  );

  assert.match(
    signedAcceptanceTest,
    /official release builds remain unchanged/,
  );

  assert.match(
    signedAcceptanceTest,
    /shell bypass remains tied only to import\.meta\.env\.DEV/,
  );
});

test('Phase 5 closeout introduces no wallet, ledger, paid-unlock, Passport, or settlement authority', () => {
  const closeoutSources =
    [
      developerMode,
      advancedMenu,
      homeActions,
      homePage,
      library,
      quickchain,
      operator,
      receipts,
    ].join('\n');

  assert.doesNotMatch(
    closeoutSources,
    /callTauri\s*\(\s*['"][^'"]*(?:mint|burn|transfer|settle|settlement|finality|bridge)/i,
  );

  assert.doesNotMatch(
    closeoutSources,
    /paidEntitlement\s*=\s*true|unlockPaidContent\s*\(/,
  );

  assert.doesNotMatch(
    closeoutSources,
    /walletOrLedgerMutated\s*:\s*true/,
  );

  assert.doesNotMatch(
    closeoutSources,
    /secretMaterialReturned\s*:\s*true/,
  );
});
