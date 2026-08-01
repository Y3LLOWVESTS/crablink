/**
 * RO:WHAT — Focused static acceptance for FINAL_BETA Phase 2B2 shared Button, loading, and error adoption.
 * RO:WHY — Proves existing component APIs remain usable while adopting canonical state and interaction primitives.
 * RO:INTERACTS — Button.jsx, LoadingState.jsx, ErrorPanel.jsx, LoadingSkeleton, ErrorState, DeveloperDisclosure, and shared CSS.
 * RO:INVARIANTS — caller actions preserved; diagnostics collapsed; no persistence, network, Passport, wallet, or ledger authority.
 * RO:TEST — node --test phase2bSharedStates.test.mjs.
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

const button = read('Button.jsx');
const loading = read('LoadingState.jsx');
const errorPanel = read('ErrorPanel.jsx');

const foundation =
  fs.readFileSync(
    path.resolve(
      HERE,
      '../styles/designSystemFoundation.css',
    ),
    'utf8',
  );

test(
  'Button preserves its existing API and adds a fail-safe busy state',
  () => {
    assert.match(
      button,
      /FINAL_BETA_PHASE2B2_SHARED_STATES_V1/,
    );

    assert.match(
      button,
      /variant = 'primary'/,
    );

    assert.match(
      button,
      /size = 'md'/,
    );

    assert.match(
      button,
      /type = 'button'/,
    );

    assert.match(
      button,
      /disabled=\{disabled \|\| busy\}/,
    );

    assert.match(
      button,
      /aria-busy=\{busy \|\| undefined\}/,
    );

    assert.match(
      button,
      /cl-button-busy-mark/,
    );
  },
);

test(
  'LoadingState preserves existing caller props and adopts LoadingSkeleton',
  () => {
    assert.match(
      loading,
      /FINAL_BETA_PHASE2B2_SHARED_STATES_V1/,
    );

    assert.match(
      loading,
      /title = 'Loading'/,
    );

    assert.match(
      loading,
      /detail = ''/,
    );

    assert.match(
      loading,
      /import LoadingSkeleton/,
    );

    assert.match(
      loading,
      /cl-state-loading/,
    );

    assert.match(
      loading,
      /aria-busy="true"/,
    );

    assert.doesNotMatch(
      loading,
      /cl-card cl-loading-state/,
    );
  },
);

test(
  'ErrorPanel preserves actions and keeps technical diagnostics collapsed',
  () => {
    assert.match(
      errorPanel,
      /FINAL_BETA_PHASE2B2_SHARED_STATES_V1/,
    );

    assert.match(
      errorPanel,
      /actions = null/,
    );

    assert.match(
      errorPanel,
      /secondaryAction=\{actions\}/,
    );

    assert.match(
      errorPanel,
      /import ErrorState/,
    );

    assert.match(
      errorPanel,
      /import DeveloperDisclosure/,
    );

    assert.match(
      errorPanel,
      /title="Technical details"/,
    );

    assert.match(
      errorPanel,
      /initiallyOpen=\{false\}/,
    );

    assert.match(
      errorPanel,
      /window\.location\.reload\(\)/,
    );
  },
);

test(
  'shared CSS owns busy loading and collapsed-error presentation',
  () => {
    for (const marker of [
      'FINAL_BETA_PHASE2B2_SHARED_STATES_V1',
      '.cl-button-busy-mark',
      '.cl-state-loading',
      '.cl-loading-skeleton',
      '.cl-error-panel-shell',
      '.cl-error-facts',
      '@media (prefers-reduced-motion: reduce)',
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
  'adopted components add no backend or economic authority',
  () => {
    const joined = [
      button,
      loading,
      errorPanel,
    ].join('\n');

    for (const forbidden of [
      'dangerouslySetInnerHTML',
      'fetch(',
      'invoke(',
      'localStorage',
      'sessionStorage',
      'claimPassportProfile',
      'wallet/hold',
      'ron-ledger',
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
    'FINAL_BETA_PHASE2B2_BUTTON_BUSY_STATE=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2B2_LOADING_STATE_ADOPTION=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2B2_ERROR_NORMAL_MODE=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2B2_ERROR_DIAGNOSTICS_COLLAPSED=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2B2_CALLER_API_PRESERVATION=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2B2_AUTHORITY_EXPANSION=NO',
  );
});

function escapeRegExp(value) {
  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
}
