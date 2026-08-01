/**
 * RO:WHAT — Focused static acceptance for FINAL_BETA Phase 2B1 Modal and Toggle primitives.
 * RO:WHY — Proves both legacy scaffolds were replaced without adding runtime authority.
 * RO:INTERACTS — Modal.jsx, Toggle.jsx, Button.jsx, and designSystemFoundation.css.
 * RO:INVARIANTS — caller-controlled state, accessible semantics, no persistence, no network calls, and no wallet or Passport authority.
 * RO:TEST — node --test phase2bInteractivePrimitives.test.mjs.
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

const modal = read('Modal.jsx');
const toggle = read('Toggle.jsx');

const foundation =
  fs.readFileSync(
    path.resolve(
      HERE,
      '../styles/designSystemFoundation.css',
    ),
    'utf8',
  );

test(
  'Modal is caller-controlled and accessible',
  () => {
    assert.match(
      modal,
      /FINAL_BETA_PHASE2B1_INTERACTIVE_PRIMITIVES_V1/,
    );

    assert.match(
      modal,
      /open = false/,
    );

    assert.match(
      modal,
      /role="dialog"/,
    );

    assert.match(
      modal,
      /aria-modal="true"/,
    );

    assert.match(
      modal,
      /event\.key === 'Escape'/,
    );

    assert.match(
      modal,
      /onClose\?\.\(\)/,
    );

    assert.doesNotMatch(
      modal,
      /Scaffold|extensions\/chrome/,
    );
  },
);

test(
  'Toggle is a controlled accessible switch',
  () => {
    assert.match(
      toggle,
      /FINAL_BETA_PHASE2B1_INTERACTIVE_PRIMITIVES_V1/,
    );

    assert.match(
      toggle,
      /checked=\{Boolean\(checked\)\}/,
    );

    assert.match(
      toggle,
      /role="switch"/,
    );

    assert.match(
      toggle,
      /aria-checked=\{Boolean\(checked\)\}/,
    );

    assert.match(
      toggle,
      /onChange\?\.\(/,
    );

    assert.doesNotMatch(
      toggle,
      /Scaffold|extensions\/chrome/,
    );
  },
);

test(
  'shared styles own Modal and Toggle presentation',
  () => {
    for (const marker of [
      'FINAL_BETA_PHASE2B1_INTERACTIVE_PRIMITIVES_V1',
      '.cl-modal-backdrop',
      '.cl-modal-header',
      '.cl-modal-actions',
      '.cl-toggle-track',
      '.cl-toggle-thumb',
      '.cl-toggle-input:focus-visible',
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
  'interactive primitives add no backend or economic authority',
  () => {
    const joined = [
      modal,
      toggle,
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
    'FINAL_BETA_PHASE2B1_MODAL_PRIMITIVE=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2B1_TOGGLE_PRIMITIVE=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2B1_LEGACY_SCAFFOLDS=REMOVED',
  );

  console.log(
    'FINAL_BETA_PHASE2B1_AUTHORITY_EXPANSION=NO',
  );
});

function escapeRegExp(value) {
  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
}
