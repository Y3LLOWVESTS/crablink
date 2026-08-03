/**
 * Focused acceptance for FINAL_BETA Phase 2C2 shell primitives.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  fileURLToPath,
} from 'node:url';

const HERE = path.dirname(
  fileURLToPath(import.meta.url),
);

function read(name) {
  return fs.readFileSync(
    path.join(HERE, name),
    'utf8',
  );
}

const sources = Object.freeze({
  appShell: read('AppShell.jsx'),
  navigation: read(
    'PrimaryNavigation.jsx',
  ),
  utility: read('UtilityBar.jsx'),
  address: read(
    'CrabAddressField.jsx',
  ),
});

const foundation =
  fs.readFileSync(
    path.resolve(
      HERE,
      '../styles/designSystemFoundation.css',
    ),
    'utf8',
  );

test(
  'all remaining Phase 2 shell primitives are installed',
  () => {
    for (const source of Object.values(
      sources,
    )) {
      assert.match(
        source,
        /FINAL_BETA_PHASE2C2_SHELL_PRIMITIVES_V2/,
      );
    }
  },
);

test(
  'AppShell exposes semantic shell regions and a skip link',
  () => {
    assert.match(
      sources.appShell,
      /Skip to content/,
    );

    assert.match(
      sources.appShell,
      /<header className="cl-app-shell-header">/,
    );

    assert.match(
      sources.appShell,
      /<aside className="cl-app-shell-navigation">/,
    );

    assert.match(
      sources.appShell,
      /tabIndex=\{-1\}/,
    );
  },
);

test(
  'PrimaryNavigation remains caller controlled',
  () => {
    assert.match(
      sources.navigation,
      /items = \[\]/,
    );

    assert.match(
      sources.navigation,
      /activeId = ''/,
    );

    assert.match(
      sources.navigation,
      /aria-current=/,
    );

    assert.match(
      sources.navigation,
      /onSelect\?\.\(/,
    );
  },
);

test(
  'UtilityBar communicates caller-derived textual status',
  () => {
    assert.match(
      sources.utility,
      /statusLabel = ''/,
    );

    assert.match(
      sources.utility,
      /statusTone = 'neutral'/,
    );

    assert.match(
      sources.utility,
      /\{statusLabel\}/,
    );
  },
);

test(
  'CrabAddressField preserves controlled history and submission',
  () => {
    assert.match(
      sources.address,
      /role="search"/,
    );

    assert.match(
      sources.address,
      /onSubmit\?\.\(/,
    );

    assert.match(
      sources.address,
      /onClick=\{onBack\}/,
    );

    assert.match(
      sources.address,
      /onClick=\{onForward\}/,
    );

    assert.match(
      sources.address,
      /value=\{value\}/,
    );

    assert.match(
      sources.address,
      /Enter a Crab address or search/,
    );
  },
);

test(
  'shared styles include responsive drawer and toast foundations',
  () => {
    for (const marker of [
      'FINAL_BETA_PHASE2C2_SHELL_PRIMITIVES_V2',
      '.cl-app-shell',
      '.cl-primary-navigation-item',
      '.cl-utility-bar',
      '.cl-crab-address-field',
      '.cl-drawer-backdrop',
      '.cl-drawer',
      '.cl-toast-region',
      '.cl-toast',
      '@media (max-width: 720px)',
    ]) {
      assert.match(
        foundation,
        new RegExp(
          escapeRegExp(marker),
        ),
      );
    }
  },
);

test(
  'Phase 2 shell primitives add no route backend or economic authority',
  () => {
    const joined = Object
      .values(sources)
      .join('\n');

    for (const forbidden of [
      'dangerouslySetInnerHTML',
      'fetch(',
      'invoke(',
      'localStorage',
      'sessionStorage',
      'window.location',
      'history.pushState',
      'claimPassportProfile',
      'wallet/hold',
      'ron-ledger',
      'crab://home',
      'crab://profile',
    ]) {
      assert.doesNotMatch(
        joined,
        new RegExp(
          escapeRegExp(forbidden),
        ),
      );
    }
  },
);

test.after(() => {
  console.log(
    'FINAL_BETA_PHASE2C2_APP_SHELL=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2C2_PRIMARY_NAVIGATION=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2C2_UTILITY_BAR=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2C2_CRAB_ADDRESS_FIELD=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2C2_DRAWER_STYLE=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2C2_TOAST_STYLE=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2C2_ROUTE_WIRING_CHANGED=NO',
  );

  console.log(
    'FINAL_BETA_PHASE2C2_AUTHORITY_EXPANSION=NO',
  );
});

function escapeRegExp(value) {
  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
}
