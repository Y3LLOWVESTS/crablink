/**
 * RO:WHAT — Formal source acceptance gate for FINAL_BETA Phase 3 shell behavior.
 * RO:WHY — Locks consumer navigation, browser semantics, Advanced quarantine, concise identity state, and raw-JSON exclusion.
 * RO:INTERACTS — Shell, TopBar, ShellPrimaryNavigation, ShellAdvancedMenu, BrowserTabs, PassportChip, BalanceChip, routeRegistry, appState.
 * RO:INVARIANTS — Home is crab://home; primary navigation is consumer-facing; advanced routes remain available but quarantined.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — normal shell renders no raw Passport subject, raw JSON, secret, wallet authority, or chain authority.
 * RO:TEST — node --test src/app/shell/finalBetaPhase3ShellAcceptance.source.test.mjs
 *
 * FINAL_BETA_PHASE3_FORMAL_SHELL_ACCEPTANCE_V1
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(relativePath) {
  return readFileSync(
    new URL(relativePath, import.meta.url),
    'utf8',
  );
}

const shell = read('./Shell.jsx');
const topBar = read('./TopBar.jsx');
const primaryNavigation = read('./ShellPrimaryNavigation.jsx');
const advancedMenu = read('./ShellAdvancedMenu.jsx');
const browserTabs = read('./BrowserTabs.jsx');
const passportChip = read('./PassportChip.jsx');
const balanceChip = read('./BalanceChip.jsx');
const navigationContract = read('./shellNavigation.js');
const routeRegistry = read('../routeRegistry.js');
const appState = read('../appState.js');

function orderedIndices(source, needles) {
  return needles.map((needle) => source.indexOf(needle));
}

function topBarPresentation() {
  const start = topBar.indexOf('  return (');
  const end = topBar.indexOf('\nfunction SettingsSummary');

  assert.equal(start >= 0, true);
  assert.equal(end > start, true);

  return topBar.slice(start, end);
}

test(
  'Phase 3 consumer navigation contract is exact and simple mode is default',
  () => {
    const expectedOrder = [
      "id: 'home'",
      "id: 'explore'",
      "id: 'create'",
      "id: 'library'",
      "id: 'profile'",
    ];

    const indices = orderedIndices(
      navigationContract,
      expectedOrder,
    );

    assert.equal(
      indices.every((index) => index >= 0),
      true,
    );

    assert.deepEqual(
      [...indices].sort((a, b) => a - b),
      indices,
    );

    for (const route of [
      'route: CRABLINK_HOME_ROUTE',
      "route: 'crab://explore'",
      "route: 'crab://make'",
      "route: 'crab://library'",
      "route: 'crab://profile'",
    ]) {
      assert.equal(
        navigationContract.includes(route),
        true,
        route,
      );
    }

    assert.equal(
      navigationContract.includes(
        'export const DEFAULT_SHELL_MODE =\n  SHELL_MODE_SIMPLE;',
      ),
      true,
    );
  },
);

test(
  'Phase 3 preserves browser navigation, address entry, and secondary tabs',
  () => {
    for (const expected of [
      "import TopBar from './TopBar.jsx';",
      "import ShellPrimaryNavigation from './ShellPrimaryNavigation.jsx';",
      "import BrowserTabs from './BrowserTabs.jsx';",
      '<TopBar route={route} navigation={navigation} />',
      '<ShellPrimaryNavigation route={route} navigation={navigation} />',
      '<BrowserTabs',
    ]) {
      assert.equal(
        shell.includes(expected),
        true,
        expected,
      );
    }

    const presentation = topBarPresentation();

    for (const expected of [
      '<BrowserNav',
      '<AddressBar',
      'onClick={navigation?.goHome}',
      '<PassportChip navigation={navigation} />',
      '<BalanceChip />',
      '<ShellAdvancedMenu navigation={navigation} />',
    ]) {
      assert.equal(
        presentation.includes(expected),
        true,
        expected,
      );
    }

    assert.equal(
      browserTabs.includes('role="tablist"'),
      true,
    );

    assert.equal(
      browserTabs.includes("openNewTab?.('crab://home')"),
      true,
    );
  },
);

test(
  'Phase 3 quarantines advanced surfaces while preserving their direct routes',
  () => {
    assert.equal(
      primaryNavigation.includes(
        'PRIMARY_NAVIGATION_ITEMS',
      ),
      true,
    );

    assert.equal(
      primaryNavigation.includes(
        'ADVANCED_NAVIGATION_ITEMS',
      ),
      false,
    );

    assert.equal(
      advancedMenu.includes(
        'ADVANCED_NAVIGATION_ITEMS.map',
      ),
      true,
    );

    for (const routeKind of [
      'receipts',
      'quickchain',
      'operator',
      'text',
    ]) {
      assert.equal(
        routeRegistry.includes(
          `${routeKind}: lazy(`,
        ),
        true,
        routeKind,
      );
    }

    const presentation = topBarPresentation();

    for (const forbidden of [
      'context.checkGateway',
      'context.checkLocalNode',
      'className="cl-zoom-controls"',
      'Node off',
    ]) {
      assert.equal(
        presentation.includes(forbidden),
        false,
        forbidden,
      );
    }
  },
);

test(
  'Phase 3 normal Passport status is concise and never renders a raw Passport subject',
  () => {
    assert.equal(
      passportChip.includes(
        'FINAL_BETA_PHASE3A4_CONCISE_PASSPORT_STATUS_V1',
      ),
      true,
    );

    assert.equal(
      passportChip.includes(
        'const hasPassport = Boolean(passportSubject);',
      ),
      true,
    );

    assert.equal(
      passportChip.includes("? 'Passport ready'"),
      true,
    );

    assert.equal(
      passportChip.includes("? 'Preview mode'"),
      true,
    );

    assert.equal(
      passportChip.includes('${passportSubject}'),
      false,
    );

    assert.equal(
      passportChip.includes('? passportSubject'),
      false,
    );

    assert.equal(
      passportChip.includes(
        'Configured passport label:',
      ),
      false,
    );
  },
);

test(
  'Phase 3 normal shell contains no raw JSON renderer and Home remains canonical',
  () => {
    for (const [name, source] of [
      ['Shell.jsx', shell],
      ['TopBar.jsx', topBarPresentation()],
      ['ShellPrimaryNavigation.jsx', primaryNavigation],
      ['PassportChip.jsx', passportChip],
      ['BalanceChip.jsx', balanceChip],
    ]) {
      for (const forbidden of [
        'JSON.stringify(',
        '<pre',
        'dangerouslySetInnerHTML',
      ]) {
        assert.equal(
          source.includes(forbidden),
          false,
          `${name}: ${forbidden}`,
        );
      }
    }

    assert.equal(
      appState.includes(
        "import { CRABLINK_HOME_ROUTE } from './shell/shellNavigation.js';",
      ),
      true,
    );

    assert.equal(
      appState.includes(
        'const DEFAULT_ROUTE_INPUT = CRABLINK_HOME_ROUTE;',
      ),
      true,
    );
  },
);
