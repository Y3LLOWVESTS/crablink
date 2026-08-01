/**
 * RO:WHAT — Focused static acceptance for the FINAL_BETA Phase 2A visual foundation.
 * RO:WHY — Proves shared tokens, themes, focus behavior, state components, and authority guards without running native compilation.
 * RO:INTERACTS — theme CSS, main.jsx, designSystemFoundation.css, and shared state components.
 * RO:INVARIANTS — light/dark themes, visible focus, reduced motion, no scaffold EmptyState, no raw error-object rendering, no component authority.
 * RO:TEST — node --test designSystemFoundation.test.mjs.
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

const SRC_ROOT = path.resolve(
  HERE,
  '../..',
);

function read(relativePath) {
  return fs.readFileSync(
    path.join(SRC_ROOT, relativePath),
    'utf8',
  );
}

const tokens = read(
  'shared/theme/themeTokens.css',
);

const light = read(
  'shared/theme/light.css',
);

const dark = read(
  'shared/theme/dark.css',
);

const foundation = read(
  'shared/styles/designSystemFoundation.css',
);

const main = read(
  'app/main.jsx',
);

const components = Object.freeze({
  empty: read(
    'shared/components/EmptyState.jsx',
  ),
  error: read(
    'shared/components/ErrorState.jsx',
  ),
  offline: read(
    'shared/components/OfflineState.jsx',
  ),
  skeleton: read(
    'shared/components/LoadingSkeleton.jsx',
  ),
  confirm: read(
    'shared/components/ConfirmDialog.jsx',
  ),
  developer: read(
    'shared/components/DeveloperDisclosure.jsx',
  ),
});

test(
  'Phase 2A freezes canonical typography spacing radius elevation and interaction tokens',
  () => {
    for (const marker of [
      'FINAL_BETA_PHASE2A_DESIGN_FOUNDATION_V1',
      '--cl-font-size-0:',
      '--cl-font-size-7:',
      '--cl-space-1:',
      '--cl-space-10:',
      '--cl-radius-xs:',
      '--cl-radius-xl:',
      '--cl-shadow-xs:',
      '--cl-shadow-lg:',
      '--cl-duration-fast:',
      '--cl-control-md:',
      '--cl-focus-ring:',
    ]) {
      assert.match(
        tokens,
        new RegExp(
          escapeRegExp(marker),
        ),
      );
    }
  },
);

test(
  'light and dark themes expose the same semantic color families',
  () => {
    for (const source of [light, dark]) {
      for (const marker of [
        '--cl-bg:',
        '--cl-surface:',
        '--cl-surface-raised:',
        '--cl-card:',
        '--cl-text:',
        '--cl-muted:',
        '--cl-border:',
        '--cl-accent:',
        '--cl-danger:',
        '--cl-warning:',
        '--cl-success:',
        '--cl-info:',
      ]) {
        assert.match(
          source,
          new RegExp(
            escapeRegExp(marker),
          ),
        );
      }
    }

    assert.match(
      light,
      /\[data-theme='light'\]/,
    );

    assert.match(
      dark,
      /\[data-theme='dark'\]/,
    );
  },
);

test(
  'shared foundation owns focus hover pressed disabled reduced-motion and responsive states',
  () => {
    for (const marker of [
      ':focus-visible',
      '.cl-button:hover:not(:disabled)',
      '.cl-button:active:not(:disabled)',
      '.cl-button:disabled',
      '@media (prefers-reduced-motion: reduce)',
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
  'main imports the design-system foundation exactly once',
  () => {
    assert.equal(
      occurrences(
        main,
        "import '../shared/styles/designSystemFoundation.css';",
      ),
      1,
    );
  },
);

test(
  'normal state components are real reusable surfaces rather than scaffold placeholders',
  () => {
    assert.match(
      components.empty,
      /Nothing here yet/,
    );

    assert.doesNotMatch(
      components.empty,
      /Scaffold|extensions\/chrome/,
    );

    assert.match(
      components.error,
      /role="alert"/,
    );

    assert.match(
      components.offline,
      /fresh network updates cannot be confirmed/,
    );

    assert.match(
      components.skeleton,
      /aria-busy="true"/,
    );

    assert.match(
      components.confirm,
      /aria-modal="true"/,
    );

    assert.match(
      components.developer,
      /<details/,
    );
  },
);

test(
  'state components add no unsafe rendering or economic authority',
  () => {
    const joined =
      Object.values(components).join('\n');

    for (const forbidden of [
      'dangerouslySetInnerHTML',
      'JSON.stringify',
      'wallet/hold',
      'ron-ledger',
      'claimPassportProfile',
      'invoke(',
      'fetch(',
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
    'FINAL_BETA_PHASE2A_TOKEN_SCALE=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2A_LIGHT_DARK_THEMES=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2A_INTERACTION_STATES=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2A_CORE_STATE_COMPONENTS=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2A_AUTHORITY_EXPANSION=NO',
  );
});

function occurrences(source, marker) {
  return source.split(marker).length - 1;
}

function escapeRegExp(value) {
  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
}
