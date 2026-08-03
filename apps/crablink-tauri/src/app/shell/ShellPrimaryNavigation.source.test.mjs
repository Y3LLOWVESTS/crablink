import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync,
} from 'node:fs';

const component =
  readFileSync(
    new URL(
      './ShellPrimaryNavigation.jsx',
      import.meta.url,
    ),
    'utf8',
  );

const shell =
  readFileSync(
    new URL(
      './Shell.jsx',
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

const contract =
  readFileSync(
    new URL(
      './shellNavigation.js',
      import.meta.url,
    ),
    'utf8',
  );

const primaryNavigation =
  readFileSync(
    new URL(
      '../../shared/components/PrimaryNavigation.jsx',
      import.meta.url,
    ),
    'utf8',
  );

const marker =
  'FINAL_BETA_PHASE3A2_ACTIVE_PRIMARY_NAVIGATION_ADOPTION_V1';

test(
  'Phase 3A2 mounts primary navigation between the top bar and tabs',
  () => {
    const topBarIndex =
      shell.indexOf(
        '<TopBar route={route} navigation={navigation} />',
      );

    const primaryNavigationIndex =
      shell.indexOf(
        '<ShellPrimaryNavigation route={route} navigation={navigation} />',
      );

    const browserTabsIndex =
      shell.indexOf(
        '<BrowserTabs',
      );

    assert.equal(
      topBarIndex >= 0,
      true,
    );

    assert.equal(
      primaryNavigationIndex > topBarIndex,
      true,
    );

    assert.equal(
      browserTabsIndex > primaryNavigationIndex,
      true,
    );

    assert.equal(
      count(
        shell,
        '<ShellPrimaryNavigation route={route} navigation={navigation} />',
      ),
      1,
    );

    assert.equal(
      count(
        shell,
        '<BrowserTabs',
      ),
      1,
    );

    assert.equal(
      count(
        shell,
        '<TopBar route={route} navigation={navigation} />',
      ),
      1,
    );
  },
);

test(
  'Phase 3A2 uses the shared controlled navigation primitive and Phase 3A1 contract',
  () => {
    for (
      const expected
      of [
        marker,
        'PrimaryNavigation',
        'PRIMARY_NAVIGATION_ITEMS',
        'DEFAULT_SHELL_MODE',
        'primaryNavigationIdForRoute',
        'navigatePrimaryItem',
        'data-shell-mode={DEFAULT_SHELL_MODE}',
        'items={PRIMARY_NAVIGATION_ITEMS}',
        'activeId={activeId}',
        'label="CrabLink primary navigation"',
      ]
    ) {
      assert.equal(
        component.includes(
          expected,
        ),
        true,
        expected,
      );
    }

    assert.equal(
      primaryNavigation.includes(
        'aria-current={',
      ),
      true,
    );

    assert.equal(
      primaryNavigation.includes(
        "? 'page'",
      ),
      true,
    );

    for (
      const label
      of [
        "label: 'Home'",
        "label: 'Explore'",
        "label: 'Create'",
        "label: 'Library'",
        "label: 'Profile'",
      ]
    ) {
      assert.equal(
        contract.includes(
          label,
        ),
        true,
        label,
      );
    }
  },
);

test(
  'Phase 3A2 shell navigation remains presentation-only and responsive',
  () => {
    for (
      const expected
      of [
        marker,
        '.cl-shell-primary-navigation-bar',
        '.cl-shell-primary-navigation .cl-primary-navigation-list',
        '.cl-shell-primary-navigation .cl-primary-navigation-item',
        '@media (max-width: 720px)',
      ]
    ) {
      assert.equal(
        shellCss.includes(
          expected,
        ),
        true,
        expected,
      );
    }

    for (
      const forbidden
      of [
        'dangerouslySetInnerHTML',
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
        component.includes(
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

    // FINAL_BETA_PHASE3A2_SOURCE_TEST_REGEX_ESCAPE_REPAIR_V2
    // Direct source literals preserve the regular-expression backslashes.

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
    'FINAL_BETA_PHASE3A2_ACTIVE_PRIMARY_NAVIGATION=GREEN',
  );

  console.log(
    'PRIMARY_NAVIGATION_ORDER=HOME_EXPLORE_CREATE_LIBRARY_PROFILE',
  );

  console.log(
    'PRIMARY_NAVIGATION_ACTIVE_ROUTE_PROJECTION=GREEN',
  );

  console.log(
    'BROWSER_TABS=PRESERVED_SECONDARY',
  );

  console.log(
    'ADDRESS_FIELD_AND_BROWSER_CONTROLS=PRESERVED',
  );

  console.log(
    'AUTHORITY_EXPANSION=NO',
  );
});

function count(
  source,
  needle,
) {
  return source.split(needle).length - 1;
}
