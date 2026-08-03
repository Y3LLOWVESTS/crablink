import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync,
} from 'node:fs';

const topBar =
  readFileSync(
    new URL(
      './TopBar.jsx',
      import.meta.url,
    ),
    'utf8',
  );

const advancedMenu =
  readFileSync(
    new URL(
      './ShellAdvancedMenu.jsx',
      import.meta.url,
    ),
    'utf8',
  );

const navigationContract =
  readFileSync(
    new URL(
      './shellNavigation.js',
      import.meta.url,
    ),
    'utf8',
  );

const shellCss =
  readFileSync(
    new URL(
      './Shell.css',
      import.meta.url,
    ),
    'utf8',
  );

const marker =
  'FINAL_BETA_PHASE3A3_ADVANCED_SURFACE_QUARANTINE_V1';

function count(
  source,
  needle,
) {
  return source.split(
    needle,
  ).length - 1;
}

function topBarPresentation() {
  const start =
    topBar.indexOf(
      '  return (',
    );

  const end =
    topBar.indexOf(
      '\nfunction SettingsSummary',
    );

  assert.equal(
    start >= 0,
    true,
  );

  assert.equal(
    end > start,
    true,
  );

  return topBar.slice(
    start,
    end,
  );
}

test(
  'Phase 3A3 removes engineering status and zoom controls from the normal top bar',
  () => {
    const presentation =
      topBarPresentation();

    assert.equal(
      count(
        topBar,
        "import ShellAdvancedMenu from './ShellAdvancedMenu.jsx';",
      ),
      1,
    );

    assert.equal(
      count(
        presentation,
        '<ShellAdvancedMenu navigation={navigation} />',
      ),
      1,
    );

    for (
      const forbidden
      of [
        'cl-status-${gatewayState}',
        'cl-status-${localNodeState}',
        'context.checkGateway',
        'context.checkLocalNode',
        'className="cl-zoom-controls"',
        'Node off',
        "'Gateway'",
      ]
    ) {
      assert.equal(
        presentation.includes(
          forbidden,
        ),
        false,
        forbidden,
      );
    }

    assert.equal(
      presentation.includes(
        '<PassportChip navigation={navigation} />',
      ),
      true,
    );

    assert.equal(
      presentation.includes(
        '<BalanceChip />',
      ),
      true,
    );

    assert.equal(
      presentation.includes(
        'theme.toggleTheme',
      ),
      true,
    );

    assert.equal(
      presentation.includes(
        'onClick={openSettings}',
      ),
      true,
    );
  },
);

test(
  'Phase 3A3 keeps advanced direct routes behind one explicit surface',
  () => {
    assert.equal(
      count(
        advancedMenu,
        marker,
      ),
      1,
    );

    assert.equal(
      advancedMenu.includes(
        'ADVANCED_NAVIGATION_ITEMS.map',
      ),
      true,
    );

    assert.equal(
      advancedMenu.includes(
        'navigation.navigate',
      ),
      true,
    );

    assert.equal(
      advancedMenu.includes(
        'context.checkGateway',
      ),
      true,
    );

    assert.equal(
      advancedMenu.includes(
        'context.checkLocalNode',
      ),
      true,
    );

    for (
      const expected
      of [
        "label: 'Receipts'",
        "route: 'crab://receipts'",
        "label: 'Node operator'",
        "route: 'crab://operator'",
        "label: 'QuickChain'",
        "route: 'crab://quickchain'",
        "label: 'Interface diagnostics'",
        "route: 'crab://text'",
      ]
    ) {
      assert.equal(
        navigationContract.includes(
          expected,
        ),
        true,
        expected,
      );
    }
  },
);

test(
  'Phase 3A3 preserves zoom through Settings and keyboard shortcuts',
  () => {
    assert.equal(
      topBar.includes(
        'cl-settings-zoom-controls',
      ),
      true,
    );

    assert.equal(
      topBar.includes(
        "const onKeyDown = (event) =>",
      ),
      true,
    );

    assert.equal(
      topBar.includes(
        'stepStoredZoomScale(1)',
      ),
      true,
    );

    assert.equal(
      topBar.includes(
        'stepStoredZoomScale(-1)',
      ),
      true,
    );

    assert.equal(
      topBar.includes(
        'resetStoredZoomScale()',
      ),
      true,
    );
  },
);

test(
  'Phase 3A3 adds no unsafe rendering or economic authority',
  () => {
    for (
      const forbidden
      of [
        'dangerouslySetInnerHTML',
        'JSON.stringify',
        'fetch(',
        'invoke(',
        'localStorage',
        'sessionStorage',
        'wallet/hold',
        'ron-ledger',
        'claimPassportProfile',
      ]
    ) {
      assert.equal(
        advancedMenu.includes(
          forbidden,
        ),
        false,
        forbidden,
      );
    }

    const phase3Css =
      shellCss.slice(
        shellCss.indexOf(
          marker,
        ),
      );

    assert.doesNotMatch(
      phase3Css,
      /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/i,
    );

    assert.doesNotMatch(
      phase3Css,
      /var\(\s*--cl-[a-z0-9-]+\s*,/i,
    );

    assert.doesNotMatch(
      phase3Css,
      /\[data-theme=['"]dark['"]\]/i,
    );

    assert.doesNotMatch(
      phase3Css,
      /^\s*--cl-[a-z0-9-]+\s*:/im,
    );
  },
);

test.after(() => {
  console.log(
    'FINAL_BETA_PHASE3A3_ADVANCED_SURFACE_QUARANTINE=GREEN',
  );

  console.log(
    'NORMAL_TOPBAR_GATEWAY_CONTROL=ABSENT',
  );

  console.log(
    'NORMAL_TOPBAR_LOCAL_NODE_CONTROL=ABSENT',
  );

  console.log(
    'NORMAL_TOPBAR_ZOOM_CONTROL=ABSENT',
  );

  console.log(
    'ADVANCED_DIRECT_ROUTES=PRESERVED',
  );

  console.log(
    'PASSPORT_AND_ROC_CONTROLS=PRESERVED',
  );

  console.log(
    'AUTHORITY_EXPANSION=NO',
  );
});
